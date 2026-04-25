import { saveComponentPosition, getSettings } from "../services/state.js"
import { showContextMenu } from "../components/contextMenu.js"

export function makeDraggable(
  element,
  componentId,
  onDragEndCallback = null,
  handleSelector = ".drag-handle",
) {
  if (!element) return

  let offsetX = 0, offsetY = 0, magicOffsetX = 0, magicOffsetY = 0, initialWidth = 0, initialHeight = 0
  const settings = getSettings()
  const savedPos = settings.componentPositions?.[componentId]

  // Apply initial position
  if (savedPos && savedPos.top && savedPos.left) {
    const isClockOrTitle = componentId === "clock" || componentId === "customTitle"
    const isFreeMoveEnabled = (componentId === "clock" && settings.freeMoveClock) || 
                             (componentId === "customTitle" && settings.freeMoveCustomTitle)
    
    if (!isClockOrTitle || isFreeMoveEnabled) {
      element.style.position = (window.getComputedStyle(element).position === 'fixed') ? 'fixed' : 'absolute'
      element.style.top = savedPos.top
      element.style.left = savedPos.left
      element.style.bottom = "auto"
      element.style.right = "auto"
      element.style.margin = "0"
      if (savedPos.transform) element.style.transform = savedPos.transform
    }
  }

  element.classList.remove("is-locked")
  if (settings.lockedWidgets?.[componentId]) {
    element.classList.add("is-locked")
  }

  const handle = element.querySelector(handleSelector) || element
  handle.onmousedown = dragMouseDown

  const onContextMenu = (e) => {
    const currentSettings = getSettings()
    if (componentId === "clock" && !currentSettings.freeMoveClock) return
    if (componentId === "customTitle" && !currentSettings.freeMoveCustomTitle) return
    e.preventDefault()
    e.stopPropagation()
    showContextMenu(e.clientX, e.clientY, -1, "widget", componentId)
  }
  handle.removeEventListener("contextmenu", handle._draggableContextMenu)
  handle._draggableContextMenu = onContextMenu
  handle.addEventListener("contextmenu", onContextMenu)

  function dragMouseDown(e) {
    const currentSettings = getSettings()
    if (currentSettings.lockedWidgets?.[componentId]) return
    if (componentId === "clock" && !currentSettings.freeMoveClock) return
    if (componentId === "customTitle" && !currentSettings.freeMoveCustomTitle) return

    const isInteractive = ["INPUT", "BUTTON", "A", "SELECT", "OPTION", "TEXTAREA"].includes(e.target.tagName)
    const isDragHandleIcon = e.target.classList.contains("drag-handle") || e.target.closest(".drag-handle") === handle
    if (isInteractive && !isDragHandleIcon) return

    e.preventDefault()
    
    const rect = element.getBoundingClientRect()
    initialWidth = rect.width
    initialHeight = rect.height
    offsetX = e.clientX - rect.left
    offsetY = e.clientY - rect.top

    // MAGIC OFFSET: Determine where (0,0) style lands on the screen
    const originalLeft = element.style.left
    const originalTop = element.style.top
    const originalTransform = element.style.transform
    const originalMargin = element.style.margin
    const originalTransition = element.style.transition
    const style = window.getComputedStyle(element)
    const isFixed = style.position === "fixed"

    element.style.transition = "none"
    element.style.transform = "none"
    element.style.margin = "0"
    element.style.left = "0px"
    element.style.top = "0px"

    const zeroRect = element.getBoundingClientRect()
    magicOffsetX = zeroRect.left
    magicOffsetY = zeroRect.top

    // Set to actual current position in style pixels
    element.style.left = (rect.left - magicOffsetX) + "px"
    element.style.top = (rect.top - magicOffsetY) + "px"
    element.style.position = isFixed ? "fixed" : "absolute"
    element.style.bottom = "auto"
    element.style.right = "auto"

    document.onmouseup = closeDragElement
    document.onmousemove = elementDrag
    element.classList.add("dragging")
  }

  function elementDrag(e) {
    e.preventDefault()
    
    let targetScreenLeft = e.clientX - offsetX
    let targetScreenTop = e.clientY - offsetY

    const vw = window.innerWidth
    const vh = window.innerHeight

    // Smart clamping for both small and large widgets
    if (initialWidth <= vw) {
        targetScreenLeft = Math.max(0, Math.min(targetScreenLeft, vw - initialWidth))
    } else {
        targetScreenLeft = Math.max(vw - initialWidth, Math.min(targetScreenLeft, 0))
    }

    if (initialHeight <= vh) {
        targetScreenTop = Math.max(0, Math.min(targetScreenTop, vh - initialHeight))
    } else {
        targetScreenTop = Math.max(vh - initialHeight, Math.min(targetScreenTop, 0))
    }

    element.style.left = (targetScreenLeft - magicOffsetX) + "px"
    element.style.top = (targetScreenTop - magicOffsetY) + "px"
  }

  function closeDragElement() {
    document.onmouseup = null
    document.onmousemove = null
    element.classList.remove("dragging")
    element.style.transition = ""

    saveComponentPosition(componentId, {
      top: element.style.top,
      left: element.style.left,
      transform: element.style.transform,
    })

    if (onDragEndCallback) onDragEndCallback(element)
  }
}
