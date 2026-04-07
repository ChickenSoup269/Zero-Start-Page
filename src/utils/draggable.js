import { saveComponentPosition, getSettings } from "../services/state.js"
import { showContextMenu } from "../components/contextMenu.js"

export function makeDraggable(
  element,
  componentId,
  onDragEndCallback = null,
  handleSelector = ".drag-handle",
) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0
  const settings = getSettings()
  const savedPos = settings.componentPositions?.[componentId]

  if (
    (componentId === "clock" && !settings.freeMoveClock) ||
    (componentId === "customTitle" && !settings.freeMoveCustomTitle)
  ) {
    element.style.position = ""
    element.style.top = ""
    element.style.left = ""
    element.style.bottom = ""
    element.style.right = ""
    element.style.transform = ""
    element.style.margin = ""
  } else if (savedPos) {
    element.style.top = savedPos.top
    element.style.left = savedPos.left
    element.style.bottom = "auto"
    element.style.right = "auto"
    element.style.margin = savedPos.margin || "0"
    if (savedPos.transform) element.style.transform = savedPos.transform
  } else if (componentId === "clock" && settings.freeMoveClock) {
    element.style.top = "35%"
    element.style.left = "50%"
    element.style.transform = "translate(-50%, -50%)"
  } else if (componentId === "customTitle" && settings.freeMoveCustomTitle) {
    element.style.top = "45%"
    element.style.left = "50%"
    element.style.transform = "translate(-50%, 0)"
  }

  // Also check if locked and add class
  element.classList.remove("is-locked")
  if (settings.lockedWidgets && settings.lockedWidgets[componentId]) {
    element.classList.add("is-locked")
  }

  // Use the provided handleSelector or default to the entire element
  const handle = element.querySelector(handleSelector) || element
  handle.style.cursor = "default" // Set default cursor for handle

  // Attach mousedown listener to the handle
  handle.onmousedown = dragMouseDown

  // Attach contextmenu listener to the element and handle
  handle.addEventListener("contextmenu", (e) => {
    const currentSettings = getSettings()
    if (componentId === "clock" && !currentSettings.freeMoveClock) {
      return // Don't show context menu for clock if free move is disabled
    }
    if (componentId === "customTitle" && !currentSettings.freeMoveCustomTitle) {
      return // Don't show context menu for custom title if free move is disabled
    }
    e.preventDefault()
    e.stopPropagation()
    showContextMenu(e.clientX, e.clientY, -1, "widget", componentId)
  })

  function dragMouseDown(e) {
    e = e || window.event

    // Check if locked
    const currentSettings = getSettings()
    if (
      currentSettings.lockedWidgets &&
      currentSettings.lockedWidgets[componentId]
    ) {
      return // Cannot drag if locked
    }

    // Check if free move is enabled for clock
    if (componentId === "clock" && !currentSettings.freeMoveClock) {
      return // Cannot drag clock unless free move is explicitly enabled
    }
    if (componentId === "customTitle" && !currentSettings.freeMoveCustomTitle) {
      return // Cannot drag custom title unless free move is explicitly enabled
    }
    // If the click target is an interactive element (button, input, etc.)
    // and it's not explicitly the 'drag-handle' icon itself, prevent dragging.
    // This is to allow interaction with buttons/inputs within the header/handle.
    const targetTagName = e.target.tagName
    const isInteractiveElement = [
      "INPUT",
      "BUTTON",
      "A",
      "SELECT",
      "OPTION",
      "TEXTAREA",
    ].includes(targetTagName)
    const isCloseButton =
      e.target.classList.contains("close") || e.target.closest(".close")

    // Allow dragging on the specific .drag-handle icon always
    // If the element clicked is interactive and not the specific drag-handle or close button, prevent drag
    if (
      isInteractiveElement &&
      !e.target.classList.contains("drag-handle") &&
      !isCloseButton
    ) {
      return
    }

    e.preventDefault() // Prevent default text selection, etc.
    pos3 = e.clientX
    pos4 = e.clientY

    // Avoid visual jumping when element is dragged by converting its transformed/margined rect into explicit inline top/left.
    const rect = element.getBoundingClientRect()
    element.style.margin = "0"
    element.style.transform = "none"
    element.style.top = rect.top + window.scrollY + "px"
    element.style.left = rect.left + window.scrollX + "px"
    element.style.bottom = "auto"
    element.style.right = "auto"

    document.onmouseup = closeDragElement
    document.onmousemove = elementDrag
    element.classList.add("dragging")
  }

  function elementDrag(e) {
    e = e || window.event
    e.preventDefault()
    pos1 = pos3 - e.clientX
    pos2 = pos4 - e.clientY
    pos3 = e.clientX
    pos4 = e.clientY

    let newTop = element.offsetTop - pos2
    let newLeft = element.offsetLeft - pos1

    // Keep within bounds
    const bounds = {
      maxTop: window.innerHeight - element.offsetHeight,
      maxLeft: window.innerWidth - element.offsetWidth,
    }

    newTop = Math.max(0, Math.min(newTop, bounds.maxTop))
    newLeft = Math.max(0, Math.min(newLeft, bounds.maxLeft))

    element.style.top = newTop + "px"
    element.style.left = newLeft + "px"
  }

  function closeDragElement() {
    document.onmouseup = null
    document.onmousemove = null
    element.classList.remove("dragging")

    // Save position
    saveComponentPosition(componentId, {
      top: element.style.top,
      left: element.style.left,
      transform: element.style.transform,
    })

    if (onDragEndCallback) {
      onDragEndCallback(element)
    }
  }
}
