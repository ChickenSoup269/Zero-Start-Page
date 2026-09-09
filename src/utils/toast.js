/**
 * Toast Notification + Undo System
 */

import { geti18n } from "../services/i18n.js"

let toastContainer = null
let currentToast = null
let currentTimer = null

function getContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div")
    toastContainer.id = "toast-container"
    document.body.appendChild(toastContainer)
  }
  return toastContainer
}

/**
 * Show a toast notification
 * @param {string} message - Message text
 * @param {object} options
 * @param {function} [options.undoFn] - Undo callback (shows undo button if provided)
 * @param {number} [options.duration=4000] - Display duration in ms
 * @param {'info'|'success'|'warning'} [options.type='info'] - Toast type
 */
export function showToast(
  message,
  { undoFn = null, duration = 4000, type = "info" } = {},
) {
  const container = getContainer()
  const i18n = geti18n()

  // Dismiss current toast if visible
  if (currentToast) {
    clearTimeout(currentTimer)
    currentToast.classList.remove("toast-show")
    currentToast.remove()
    currentToast = null
  }

  const toast = document.createElement("div")
  toast.className = `toast-item toast-${type}`

  const iconMap = {
    info: "fa-circle-info",
    success: "fa-circle-check",
    warning: "fa-triangle-exclamation",
  }
  const icon = iconMap[type] || iconMap.info

  const undoLabel = i18n.bookmark_undo || "Undo"

  toast.innerHTML = `
    <i class="fa-solid ${icon} toast-icon"></i>
    <span class="toast-message">${message}</span>
    ${undoFn ? `<button class="toast-undo-btn"><i class="fa-solid fa-rotate-left"></i> ${undoLabel}</button>` : ""}
    <button class="toast-close-btn"><i class="fa-solid fa-xmark"></i></button>
  `

  container.appendChild(toast)
  currentToast = toast

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("toast-show"))
  })

  // Undo button
  if (undoFn) {
    toast.querySelector(".toast-undo-btn").addEventListener("click", () => {
      undoFn()
      dismissToast(toast)
    })
  }

  // Close button
  toast.querySelector(".toast-close-btn").addEventListener("click", () => {
    dismissToast(toast)
  })

  // Auto dismiss
  currentTimer = setTimeout(() => dismissToast(toast), duration)
}

function dismissToast(toast) {
  if (!toast) return
  clearTimeout(currentTimer)
  toast.classList.remove("toast-show")
  toast.addEventListener("transitionend", () => toast.remove(), { once: true })
  if (currentToast === toast) currentToast = null
}
