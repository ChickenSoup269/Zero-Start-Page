/**
 * Toast Notification + Undo System
 * Hiển thị thông báo dưới màn hình với nút "Hoàn tác" tuỳ chọn
 */

let toastContainer = null
let currentToast = null
let currentTimer = null

function getContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.id = 'toast-container'
    document.body.appendChild(toastContainer)
  }
  return toastContainer
}

/**
 * Hiển thị toast notification
 * @param {string} message - Nội dung thông báo
 * @param {object} options
 * @param {function} [options.undoFn] - Hàm hoàn tác (nếu có sẽ hiện nút Hoàn tác)
 * @param {number} [options.duration=4000] - Thời gian hiển thị (ms)
 * @param {'info'|'success'|'warning'} [options.type='info'] - Loại toast
 */
export function showToast(message, { undoFn = null, duration = 4000, type = 'info' } = {}) {
  const container = getContainer()

  // Xoá toast cũ nếu đang hiển thị
  if (currentToast) {
    clearTimeout(currentTimer)
    currentToast.classList.remove('toast-show')
    currentToast.remove()
    currentToast = null
  }

  const toast = document.createElement('div')
  toast.className = `toast-item toast-${type}`

  const iconMap = { info: 'fa-circle-info', success: 'fa-circle-check', warning: 'fa-triangle-exclamation' }
  const icon = iconMap[type] || iconMap.info

  toast.innerHTML = `
    <i class="fa-solid ${icon} toast-icon"></i>
    <span class="toast-message">${message}</span>
    ${undoFn ? `<button class="toast-undo-btn"><i class="fa-solid fa-rotate-left"></i> Hoàn tác</button>` : ''}
    <button class="toast-close-btn"><i class="fa-solid fa-xmark"></i></button>
  `

  container.appendChild(toast)
  currentToast = toast

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast-show'))
  })

  // Undo button
  if (undoFn) {
    toast.querySelector('.toast-undo-btn').addEventListener('click', () => {
      undoFn()
      dismissToast(toast)
    })
  }

  // Close button
  toast.querySelector('.toast-close-btn').addEventListener('click', () => {
    dismissToast(toast)
  })

  // Auto dismiss
  currentTimer = setTimeout(() => dismissToast(toast), duration)
}

function dismissToast(toast) {
  if (!toast) return
  clearTimeout(currentTimer)
  toast.classList.remove('toast-show')
  toast.addEventListener('transitionend', () => toast.remove(), { once: true })
  if (currentToast === toast) currentToast = null
}
