import { saveComponentPosition, getSettings } from "../services/state.js"
import { showContextMenu } from "../components/contextMenu.js"

const VIEWPORT_PADDING = 8

function parsePixelValue(value) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getClampedStyleValue(element, style, axis, clampedScreenValue, delta) {
  const inlineValue = axis === "x" ? element.style.left : element.style.top
  const computedValue = axis === "x" ? style.left : style.top
  const parsedValue = parsePixelValue(inlineValue || computedValue)
  if (parsedValue !== null) return parsedValue + delta

  if (style.position === "fixed") return clampedScreenValue

  const parentRect = element.offsetParent?.getBoundingClientRect()
  const parentOffset = axis === "x" ? parentRect?.left || 0 : parentRect?.top || 0
  return clampedScreenValue - parentOffset
}

function clampElementIntoViewport(element, componentId, persist = false) {
  if (!element || element.classList.contains("dragging")) return
  if (componentId === "todo" && element.classList.contains("todo-fullscreen")) return

  const style = window.getComputedStyle(element)
  if (style.position !== "fixed" && style.position !== "absolute") return

  const rect = element.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (!rect.width || !rect.height || !vw || !vh) return

  const minLeft = Math.min(VIEWPORT_PADDING, vw - rect.width - VIEWPORT_PADDING)
  const maxLeft = Math.max(VIEWPORT_PADDING, vw - rect.width - VIEWPORT_PADDING)
  const minTop = Math.min(VIEWPORT_PADDING, vh - rect.height - VIEWPORT_PADDING)
  const maxTop = Math.max(VIEWPORT_PADDING, vh - rect.height - VIEWPORT_PADDING)

  const clampedLeft = Math.max(minLeft, Math.min(rect.left, maxLeft))
  const clampedTop = Math.max(minTop, Math.min(rect.top, maxTop))
  
  const zoom = Number.parseFloat(style.zoom) || 1
  const deltaX = (clampedLeft - rect.left) / zoom
  const deltaY = (clampedTop - rect.top) / zoom

  if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return

  element.style.left = `${getClampedStyleValue(element, style, "x", clampedLeft, deltaX)}px`
  element.style.top = `${getClampedStyleValue(element, style, "y", clampedTop, deltaY)}px`
  element.style.bottom = "auto"
  element.style.right = "auto"
  element.style.margin = "0"
  element.classList.add("has-position")

  if (persist) {
    saveComponentPosition(componentId, {
      top: element.style.top,
      left: element.style.left,
      transform: element.style.transform,
    })
  }
}

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
    const isClockOrTitleOrSearch =
      componentId === "clock" ||
      componentId === "customTitle" ||
      componentId === "searchBar"
    const isFreeMoveEnabled = (componentId === "clock" && settings.freeMoveClock) || 
                             (componentId === "customTitle" && settings.freeMoveCustomTitle) ||
                             (componentId === "searchBar" && settings.freeMoveSearchBar)
    
    if (!isClockOrTitleOrSearch || isFreeMoveEnabled) {
      element.style.position = (window.getComputedStyle(element).position === 'fixed') ? 'fixed' : 'absolute'
      element.style.top = savedPos.top
      element.style.left = savedPos.left
      element.style.bottom = "auto"
      element.style.right = "auto"
      element.style.margin = "0"
      if (savedPos.transform) element.style.transform = savedPos.transform
      element.classList.add("has-position")
    }
  }

  requestAnimationFrame(() => clampElementIntoViewport(element, componentId))

  if (!element._draggableViewportClamp) {
    let resizeTimer = null
    element._draggableViewportClamp = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(
        () => {
          const currentSettings = getSettings()
          const isClockOrTitleOrSearch =
            componentId === "clock" ||
            componentId === "customTitle" ||
            componentId === "searchBar"
          const isFreeMoveEnabled = (componentId === "clock" && currentSettings.freeMoveClock) || 
                                   (componentId === "customTitle" && currentSettings.freeMoveCustomTitle) ||
                                   (componentId === "searchBar" && currentSettings.freeMoveSearchBar)
          
          if (!isClockOrTitleOrSearch || isFreeMoveEnabled) {
            const saved = currentSettings.componentPositions?.[componentId]
            if (saved && saved.top && saved.left) {
               element.style.top = saved.top
               element.style.left = saved.left
               if (saved.transform) element.style.transform = saved.transform
               element.classList.add("has-position")
            }
            clampElementIntoViewport(element, componentId, false)
          }
        },
        80,
      )
    }
    window.addEventListener("resize", element._draggableViewportClamp, {
      passive: true,
    })
    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        "resize",
        element._draggableViewportClamp,
        { passive: true },
      )
    }
    if (!element._draggableLayoutUpdated) {
      element._draggableLayoutUpdated = (e) => {
        if (!element.isConnected) {
          window.removeEventListener("layoutUpdated", element._draggableLayoutUpdated)
          return
        }
        if (e.detail && (e.detail.key === `${componentId}Mini` || e.detail.key === "musicMini")) {
          requestAnimationFrame(() => {
            clampElementIntoViewport(element, componentId, true)
          })
        }
      }
      window.addEventListener("layoutUpdated", element._draggableLayoutUpdated)
    }
  }

  element.classList.remove("is-locked")
  if (settings.lockedWidgets?.[componentId]) {
    element.classList.add("is-locked")
  }

  const handle = element.querySelector(handleSelector) || element
  handle.onmousedown = dragMouseDown

  const isInteractiveTarget = (target) =>
    target.closest(
      "input, button, a, select, option, textarea, label, [contenteditable='true'], [data-no-drag], .search-engine-selector, .camera-btn, .lens-btn, .ai-btn, .clear-btn, .search-submit-btn, .preview-remove-btn",
    )

  const onContextMenu = (e) => {
    const currentSettings = getSettings()
    if (componentId === "clock" && !currentSettings.freeMoveClock) return
    if (componentId === "customTitle" && !currentSettings.freeMoveCustomTitle) return
    if (componentId === "searchBar" && !currentSettings.freeMoveSearchBar) return
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
    if (componentId === "todo" && element.classList.contains("todo-fullscreen")) return
    if (
      componentId === "todo" &&
      e.target.closest(".todo-item, .todo-section-header, .todo-detail-panel")
    ) {
      return
    }
    if (componentId === "clock" && !currentSettings.freeMoveClock) return
    if (componentId === "customTitle" && !currentSettings.freeMoveCustomTitle) return
    if (componentId === "searchBar" && !currentSettings.freeMoveSearchBar) return

    if (isInteractiveTarget(e.target)) return

    e.preventDefault()
    
    // 1. Prepare element: Disable laggy transitions and centering transforms
    const originalTransition = element.style.transition
    element.style.transition = "none"
    
    // 2. Measure parent offset by temporarily placing at 0,0 style
    const originalLeft = element.style.left
    const originalTop = element.style.top
    const originalTransform = element.style.transform
    const originalMargin = element.style.margin
    const style = window.getComputedStyle(element)
    const isFixed = style.position === "fixed"

    // To measure exactly where style (0,0) lands on screen
    element.style.transform = "none"
    element.style.margin = "0"
    
    // Capture current screen rect WITHOUT transforms
    const currentRect = element.getBoundingClientRect()
    
    element.style.left = "0px"
    element.style.top = "0px"
    const zeroRect = element.getBoundingClientRect()
    
    magicOffsetX = zeroRect.left
    magicOffsetY = zeroRect.top

    // 3. Set mouse offsets relative to the element's actual top-left corner
    offsetX = e.clientX - currentRect.left
    offsetY = e.clientY - currentRect.top
    initialWidth = currentRect.width
    initialHeight = currentRect.height

    // 4. Re-position element to its screen location using pixels
    element.style.position = isFixed ? "fixed" : "absolute"
    element.style.left = (currentRect.left - magicOffsetX) + "px"
    element.style.top = (currentRect.top - magicOffsetY) + "px"
    element.style.bottom = "auto"
    element.style.right = "auto"
    element.classList.add("has-position")

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

    const zoom = Number.parseFloat(window.getComputedStyle(element).zoom) || 1
    element.style.left = ((targetScreenLeft - magicOffsetX) / zoom) + "px"
    element.style.top = ((targetScreenTop - magicOffsetY) / zoom) + "px"
  }

  function closeDragElement() {
    document.onmouseup = null
    document.onmousemove = null
    element.classList.remove("dragging")
    element.style.transition = ""
    element.classList.add("has-position")

    saveComponentPosition(componentId, {
      top: element.style.top,
      left: element.style.left,
      transform: element.style.transform,
    })

    if (onDragEndCallback) onDragEndCallback(element)
  }
}
