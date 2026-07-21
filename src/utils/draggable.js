import { saveComponentPosition, getSettings } from "../services/state.js"
import { showContextMenu } from "../components/contextMenu.js"

const VIEWPORT_PADDING = 8

function parsePixelValue(value) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

let clampQueue = new Map()
let isClampQueued = false

function processClampQueue() {
  const queue = Array.from(clampQueue.entries())
  clampQueue.clear()
  isClampQueued = false

  const reads = []
  const vw = document.documentElement.clientWidth
  const vh = document.documentElement.clientHeight

  // --- READ PHASE ---
  for (const [element, data] of queue) {
    if (!element || element.classList.contains("dragging")) continue
    if (data.componentId === "todo" && element.classList.contains("todo-fullscreen")) continue

    const style = window.getComputedStyle(element)
    if (style.position !== "fixed" && style.position !== "absolute") continue

    const rect = element.getBoundingClientRect()
    if (!rect.width || !rect.height || !vw || !vh) continue

    let parentOffsetLeft = 0
    let parentOffsetTop = 0
    if (style.position !== "fixed") {
      const parentRect = element.offsetParent?.getBoundingClientRect()
      parentOffsetLeft = parentRect?.left || 0
      parentOffsetTop = parentRect?.top || 0
    }

    reads.push({ element, data, style, rect, parentOffsetLeft, parentOffsetTop })
  }

  // --- WRITE PHASE ---
  for (const read of reads) {
    const { element, data, style, rect, parentOffsetLeft, parentOffsetTop } = read

    const minLeft = Math.min(VIEWPORT_PADDING, vw - rect.width - VIEWPORT_PADDING)
    const maxLeft = Math.max(VIEWPORT_PADDING, vw - rect.width - VIEWPORT_PADDING)
    const minTop = Math.min(VIEWPORT_PADDING, vh - rect.height - VIEWPORT_PADDING)
    const maxTop = Math.max(VIEWPORT_PADDING, vh - rect.height - VIEWPORT_PADDING)

    const clampedLeft = Math.max(minLeft, Math.min(rect.left, maxLeft))
    const clampedTop = Math.max(minTop, Math.min(rect.top, maxTop))

    const zoom = Number.parseFloat(style.zoom) || 1
    const deltaX = (clampedLeft - rect.left) / zoom
    const deltaY = (clampedTop - rect.top) / zoom

    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue

    const inlineLeft = element.style.left
    const computedLeft = style.left
    const parsedLeft = parsePixelValue(inlineLeft || computedLeft)
    let finalLeft = parsedLeft !== null ? parsedLeft + deltaX : (style.position === "fixed" ? clampedLeft : clampedLeft - parentOffsetLeft)

    const inlineTop = element.style.top
    const computedTop = style.top
    const parsedTop = parsePixelValue(inlineTop || computedTop)
    let finalTop = parsedTop !== null ? parsedTop + deltaY : (style.position === "fixed" ? clampedTop : clampedTop - parentOffsetTop)

    element.style.left = `${finalLeft}px`
    element.style.top = `${finalTop}px`
    element.style.bottom = "auto"
    element.style.right = "auto"
    element.style.margin = "0"
    element.classList.add("has-position")

    if (data.persist) {
      saveComponentPosition(data.componentId, {
        top: element.style.top,
        left: element.style.left,
        transform: element.style.transform,
      })
    }
  }
}

function clampElementIntoViewport(element, componentId, persist = false) {
  clampQueue.set(element, { componentId, persist })
  
  if (!isClampQueued) {
    isClampQueued = true
    requestAnimationFrame(processClampQueue)
  }
}

export function makeDraggable(
  element,
  componentId,
  onDragEndCallback = null,
  handleSelector = ".drag-handle",
) {
  if (!element) return

  let offsetX = 0, offsetY = 0, magicOffsetX = 0, magicOffsetY = 0, initialWidth = 0, initialHeight = 0, cachedZoom = 1
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
      element.style.transform = savedPos.transform !== undefined ? savedPos.transform : "none"
      element.classList.add("has-position")
    }
  }

  document.fonts.ready.then(() => {
    requestAnimationFrame(() => clampElementIntoViewport(element, componentId))
  })
  window.addEventListener('load', () => {
    requestAnimationFrame(() => clampElementIntoViewport(element, componentId))
  })

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
               element.style.transform = saved.transform !== undefined ? saved.transform : "none"
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
    element.style.transform = "none"
    element.style.margin = "0"
    
    // 2. Measure current screen rect (where it is visually right now, without transforms)
    const currentRect = element.getBoundingClientRect()
    
    // 3. Prepare for absolute 0,0 measurement
    const style = window.getComputedStyle(element)
    const isFixed = style.position === "fixed"
    element.style.position = isFixed ? "fixed" : "absolute"
    element.style.left = "0px"
    element.style.top = "0px"
    element.style.bottom = "auto"
    element.style.right = "auto"
    
    // 4. Measure where absolute 0,0 lands on screen
    const zeroRect = element.getBoundingClientRect()
    magicOffsetX = zeroRect.left
    magicOffsetY = zeroRect.top

    // 5. Calculate mouse offsets relative to the element's top-left
    offsetX = e.clientX - currentRect.left
    offsetY = e.clientY - currentRect.top
    initialWidth = currentRect.width
    initialHeight = currentRect.height

    // 6. Put it exactly where it was visually
    element.style.left = (currentRect.left - magicOffsetX) + "px"
    element.style.top = (currentRect.top - magicOffsetY) + "px"
    element.classList.add("has-position")

    // Cache zoom once at drag start to avoid getComputedStyle in hot loop
    cachedZoom = Number.parseFloat(window.getComputedStyle(element).zoom) || 1

    document.onmouseup = closeDragElement
    document.onmousemove = elementDrag
    element.classList.add("dragging")
  }

  function elementDrag(e) {
    e.preventDefault()
    
    let targetScreenLeft = e.clientX - offsetX
    let targetScreenTop = e.clientY - offsetY

    const vw = document.documentElement.clientWidth
    const vh = document.documentElement.clientHeight

    // Smart clamping for both small and large widgets
    if (initialWidth <= vw) {
        targetScreenLeft = Math.max(VIEWPORT_PADDING, Math.min(targetScreenLeft, vw - initialWidth - VIEWPORT_PADDING))
    } else {
        targetScreenLeft = Math.max(vw - initialWidth - VIEWPORT_PADDING, Math.min(targetScreenLeft, VIEWPORT_PADDING))
    }

    if (initialHeight <= vh) {
        targetScreenTop = Math.max(VIEWPORT_PADDING, Math.min(targetScreenTop, vh - initialHeight - VIEWPORT_PADDING))
    } else {
        targetScreenTop = Math.max(vh - initialHeight - VIEWPORT_PADDING, Math.min(targetScreenTop, VIEWPORT_PADDING))
    }

    // Use cached zoom to avoid forced synchronous layout on every mousemove
    const zoom = cachedZoom
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
