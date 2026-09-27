// Bridges touch devices to the desktop right-click menus: a long-press
// dispatches a synthetic contextmenu event, which every existing
// document-level and per-element menu handler already listens for.

const LONG_PRESS_MS = 550
const MOVE_TOLERANCE_PX = 12

let pressTimer = null
let lastLongPressAt = 0

function clearPress() {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

export function initTouchContextMenu() {
  if (
    !("ontouchstart" in window) &&
    !(navigator.maxTouchPoints > 0)
  ) {
    return
  }

  let startX = 0
  let startY = 0

  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) {
        clearPress()
        return
      }
      // A widget long-press drag is in progress — menus must stay out of it
      if (document.body.classList.contains("is-dragging-widget")) {
        clearPress()
        return
      }
      const touch = e.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      // Skip long-press inside editable fields — the native
      // selection/copy UI must keep working there.
      const target = e.target
      if (
        target.closest?.(
          "input, textarea, [contenteditable], [contenteditable] *",
        )
      ) {
        clearPress()
        return
      }
      clearPress()
      pressTimer = setTimeout(() => {
        pressTimer = null
        // Hold turned into a widget drag — cancel the menu
        if (document.body.classList.contains("is-dragging-widget")) return
        const el = document.elementFromPoint(startX, startY)
        if (!el) return
        lastLongPressAt = performance.now()
        const synthetic = new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: startX,
          clientY: startY,
        })
        synthetic._fromLongPress = true
        el.dispatchEvent(synthetic)
        navigator.vibrate?.(15)
      }, LONG_PRESS_MS)
    },
    { passive: true },
  )

  document.addEventListener(
    "touchmove",
    (e) => {
      if (!pressTimer) return
      const touch = e.touches[0]
      if (
        touch &&
        (Math.abs(touch.clientX - startX) > MOVE_TOLERANCE_PX ||
          Math.abs(touch.clientY - startY) > MOVE_TOLERANCE_PX)
      ) {
        clearPress()
      }
    },
    { passive: true },
  )

  document.addEventListener("touchend", clearPress, { passive: true })
  document.addEventListener("touchcancel", clearPress, { passive: true })

  // Android fires its own native contextmenu on long-press; swallow it right
  // after ours fired so the menu doesn't open twice. Synthetic events carry
  // _fromLongPress and pass through untouched.
  document.addEventListener(
    "contextmenu",
    (e) => {
      if (e._fromLongPress) return
      if (performance.now() - lastLongPressAt < 800) {
        e.preventDefault()
        e.stopPropagation()
      }
    },
    true,
  )
}
