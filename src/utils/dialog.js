// Custom Dialog System
import { geti18n } from "../services/i18n.js"

let dialogContainer = null

function createDialogContainer() {
  if (dialogContainer) return dialogContainer

  dialogContainer = document.createElement("div")
  dialogContainer.id = "custom-dialog-overlay"
  dialogContainer.className = "custom-dialog-overlay"
  document.body.appendChild(dialogContainer)

  return dialogContainer
}

function closeDialog() {
  if (dialogContainer) {
    dialogContainer.classList.remove("active")
    setTimeout(() => {
      dialogContainer.innerHTML = ""
    }, 300)
  }
}

// Custom Alert
export function showAlert(message, title = null) {
  return new Promise((resolve) => {
    const container = createDialogContainer()
    const i18n = geti18n()

    container.innerHTML = `
      <div class="custom-dialog custom-alert">
        ${title ? `<div class="dialog-header">${title}</div>` : ""}
        <div class="dialog-body">
          <i class="fa-solid fa-circle-info dialog-icon"></i>
          <p class="dialog-message">${message}</p>
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn dialog-btn-primary" id="alert-ok">
            ${i18n.ok || "OK"}
          </button>
        </div>
      </div>
    `

    container.classList.add("active")

    const okBtn = container.querySelector("#alert-ok")
    okBtn.addEventListener("click", () => {
      closeDialog()
      resolve()
    })

    // Close on overlay click
    container.addEventListener("click", (e) => {
      if (e.target === container) {
        closeDialog()
        resolve()
      }
    })

    // Close on ESC
    const escHandler = (e) => {
      if (e.key === "Escape") {
        closeDialog()
        resolve()
        document.removeEventListener("keydown", escHandler)
      }
    }
    document.addEventListener("keydown", escHandler)
  })
}

// Custom Confirm
export function showConfirm(message, title = null) {
  return new Promise((resolve) => {
    const container = createDialogContainer()
    const i18n = geti18n()

    container.innerHTML = `
      <div class="custom-dialog custom-confirm">
        ${title ? `<div class="dialog-header">${title}</div>` : ""}
        <div class="dialog-body">
          <i class="fa-solid fa-circle-question dialog-icon"></i>
          <p class="dialog-message">${message}</p>
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn dialog-btn-secondary" id="confirm-cancel">
            ${i18n.cancel || "Cancel"}
          </button>
          <button class="dialog-btn dialog-btn-primary" id="confirm-ok">
            ${i18n.confirm || "Confirm"}
          </button>
        </div>
      </div>
    `

    container.classList.add("active")

    const okBtn = container.querySelector("#confirm-ok")
    const cancelBtn = container.querySelector("#confirm-cancel")

    okBtn.addEventListener("click", () => {
      closeDialog()
      resolve(true)
    })

    cancelBtn.addEventListener("click", () => {
      closeDialog()
      resolve(false)
    })

    // Close on overlay click
    container.addEventListener("click", (e) => {
      if (e.target === container) {
        closeDialog()
        resolve(false)
      }
    })

    // Close on ESC
    const escHandler = (e) => {
      if (e.key === "Escape") {
        closeDialog()
        resolve(false)
        document.removeEventListener("keydown", escHandler)
      }
    }
    document.addEventListener("keydown", escHandler)
  })
}

// Custom Prompt
export function showPrompt(message, defaultValue = "", title = null) {
  return new Promise((resolve) => {
    const container = createDialogContainer()
    const i18n = geti18n()

    container.innerHTML = `
      <div class="custom-dialog custom-prompt">
        ${title ? `<div class="dialog-header">${title}</div>` : ""}
        <div class="dialog-body">
          <i class="fa-solid fa-pen-to-square dialog-icon"></i>
          <p class="dialog-message">${message}</p>
          <input type="text" class="dialog-input" id="prompt-input" value="${defaultValue}" />
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn dialog-btn-secondary" id="prompt-cancel">
            ${i18n.cancel || "Cancel"}
          </button>
          <button class="dialog-btn dialog-btn-primary" id="prompt-ok">
            ${i18n.ok || "OK"}
          </button>
        </div>
      </div>
    `

    container.classList.add("active")

    const input = container.querySelector("#prompt-input")
    const okBtn = container.querySelector("#prompt-ok")
    const cancelBtn = container.querySelector("#prompt-cancel")

    // Focus input
    setTimeout(() => {
      input.focus()
      input.select()
    }, 100)

    okBtn.addEventListener("click", () => {
      closeDialog()
      resolve(input.value)
    })

    cancelBtn.addEventListener("click", () => {
      closeDialog()
      resolve(null)
    })

    // Submit on Enter
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        closeDialog()
        resolve(input.value)
      }
    })

    // Close on overlay click
    container.addEventListener("click", (e) => {
      if (e.target === container) {
        closeDialog()
        resolve(null)
      }
    })

    // Close on ESC
    const escHandler = (e) => {
      if (e.key === "Escape") {
        closeDialog()
        resolve(null)
        document.removeEventListener("keydown", escHandler)
      }
    }
    document.addEventListener("keydown", escHandler)
  })
}
