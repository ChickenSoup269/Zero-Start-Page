// Custom Dialog System
import { geti18n } from "../services/i18n.js"

let dialogContainer = null
let clearDialogTimer = null

function createDialogContainer() {
  if (dialogContainer) {
    if (clearDialogTimer) {
      clearTimeout(clearDialogTimer)
      clearDialogTimer = null
    }
    return dialogContainer
  }

  dialogContainer = document.createElement("div")
  dialogContainer.id = "custom-dialog-overlay"
  dialogContainer.className = "custom-dialog-overlay"
  document.body.appendChild(dialogContainer)

  return dialogContainer
}

function closeDialog() {
  if (dialogContainer) {
    dialogContainer.classList.remove("active")
    if (clearDialogTimer) {
      clearTimeout(clearDialogTimer)
    }
    clearDialogTimer = setTimeout(() => {
      dialogContainer.innerHTML = ""
      clearDialogTimer = null
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
          <div class="dialog-message">${message}</div>
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
          <div class="dialog-message">${message}</div>
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
          <div class="dialog-message">${message}</div>
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

// Checklist Confirm Dialog
export function showChecklistConfirm(options, title = null, message = null) {
  return new Promise((resolve) => {
    const container = createDialogContainer()
    const i18n = geti18n()

    const checklistHtml = (options || [])
      .map(
        (opt, idx) => `
          <label class="dialog-check-item" for="dialog-check-${idx}">
            <input
              type="checkbox"
              id="dialog-check-${idx}"
              data-key="${opt.key}"
              ${opt.checked ? "checked" : ""}
              ${opt.disabled ? "disabled" : ""}
            />
            <span>${opt.label}</span>
          </label>
        `,
      )
      .join("")

    container.innerHTML = `
      <div class="custom-dialog custom-checklist">
        ${title ? `<div class="dialog-header">${title}</div>` : ""}
        <div class="dialog-body">
          <i class="fa-solid fa-list-check dialog-icon"></i>
          ${message ? `<div class="dialog-message">${message}</div>` : ""}
          <div class="dialog-checklist">${checklistHtml}</div>
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn dialog-btn-secondary" id="checklist-cancel">
            ${i18n.cancel || "Cancel"}
          </button>
          <button class="dialog-btn dialog-btn-primary" id="checklist-ok">
            ${i18n.confirm || "Confirm"}
          </button>
        </div>
      </div>
    `

    container.classList.add("active")

    const okBtn = container.querySelector("#checklist-ok")
    const cancelBtn = container.querySelector("#checklist-cancel")

    okBtn.addEventListener("click", () => {
      const result = {}
      container
        .querySelectorAll(".dialog-checklist input[type='checkbox'][data-key]")
        .forEach((input) => {
          result[input.dataset.key] = input.checked
        })

      closeDialog()
      resolve(result)
    })

    cancelBtn.addEventListener("click", () => {
      closeDialog()
      resolve(null)
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

/**
 * Shows a specialized modal with instructions on how to hide the Chrome Bookmark Bar
 */
export function showBookmarkHideInstructions() {
  const i18n = geti18n()

  // Simple OS detection
  const platform = (navigator.userAgentData?.platform || navigator.platform).toLowerCase()
  let os = "win"
  if (platform.includes("mac")) os = "mac"
  else if (platform.includes("linux")) os = "linux"

  const title = i18n.hide_bookmark_modal_title || "Hide Chrome Bookmark Bar"
  const step1 = i18n[`hide_bookmark_step1_${os}`] || i18n.hide_bookmark_step1
  const step2 = i18n.hide_bookmark_step2 || "2. Copy and run the command below:"
  const copyText = i18n.hide_bookmark_copy || "Copy Command"
  const copiedText = i18n.hide_bookmark_copied || "Command Copied!"
  const policyLink = i18n.hide_bookmark_policy_link || "View status at chrome://policy/"
  const linkHint = i18n.hide_bookmark_link_hint || "(Copy and paste the link if it doesn't open)"
  const tip = i18n[`hide_bookmark_tip_${os}`] || i18n.hide_bookmark_tip
  const note = i18n.hide_bookmark_note || ""

  let command = ""
  if (os === "win") {
    command =
      'reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Google\\Chrome" /v BookmarkBarEnabled /t REG_DWORD /d 0 /f'
  } else if (os === "mac") {
    command = "defaults write com.google.Chrome BookmarkBarEnabled -bool false"
  } else if (os === "linux") {
    command =
      "sudo mkdir -p /etc/opt/chrome/policies/managed/ && echo '{\"BookmarkBarEnabled\": false}' | sudo tee /etc/opt/chrome/policies/managed/bookmarks.json"
  }

  const content = `
    <div class="bookmark-hide-instructions" style="text-align: left; font-family: inherit;">
      <p style="margin-bottom: 12px; font-size: 0.95rem;">${step1}</p>
      <p style="margin-bottom: 8px; font-size: 0.95rem;">${step2}</p>
      
      <div class="command-box" style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; position: relative; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.1);">
        <code id="reg-command" style="display: block; word-break: break-all; font-family: 'Consolas', monospace; font-size: 0.85rem; color: var(--accent-color); margin-bottom: 12px; padding: 4px; background: rgba(0,0,0,0.3); border-radius: 4px;">${command}</code>
        <button id="copy-reg-command" style="background: var(--accent-color); color: var(--accent-contrast-color, #1a1a2e); border: none; padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; font-family: inherit; margin: 0 auto;">
          <i class="fa-solid fa-copy"></i> <span>${copyText}</span>
        </button>
      </div>

      <div style="margin-bottom: 16px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <a href="chrome://policy/" target="_blank" style="color: var(--accent-color); text-decoration: none; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
            <i class="fa-solid fa-external-link" style="font-size: 0.85rem;"></i> ${policyLink}
          </a>
          <button id="copy-policy-link" title="Copy Link" style="background: rgba(255,255,255,0.1); border: none; color: #fff; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
            <i class="fa-solid fa-copy" style="font-size: 0.8rem;"></i>
          </button>
        </div>
        
        <a href="https://chromeenterprise.google/intl/en_ca/policies/bookmark-bar-enabled/" target="_blank" style="color: var(--accent-color); text-decoration: none; font-size: 0.85rem; opacity: 0.8; display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-circle-info"></i> Detailed Policy Documentation
        </a>
        <p style="font-size: 0.75rem; opacity: 0.6; margin-top: -4px;">${linkHint}</p>
      </div>

      <div style="background: rgba(var(--accent-color-rgb), 0.1); padding: 12px; border-radius: 6px; border-left: 3px solid var(--accent-color); margin-bottom: 12px;">
        <p style="font-size: 0.85rem; line-height: 1.5; opacity: 0.9;">
          <i class="fa-solid fa-lightbulb" style="color: var(--accent-color); margin-right: 4px;"></i> ${tip}
        </p>
      </div>

      ${
        note
          ? `
      <div style="background: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 6px; border-left: 3px solid #ffc107;">
        <p style="font-size: 0.85rem; line-height: 1.5; opacity: 0.9;">
          <i class="fa-solid fa-circle-exclamation" style="color: #ffc107; margin-right: 4px;"></i> ${note}
        </p>
      </div>
      `
          : ""
      }
    </div>
  `

  showAlert(content, title)

  // Wait for the dialog to be rendered
  setTimeout(() => {
    const copyBtn = document.getElementById("copy-reg-command")
    const copyPolicyBtn = document.getElementById("copy-policy-link")

    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(command).then(() => {
          const originalContent = copyBtn.innerHTML
          copyBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>${copiedText}</span>`
          const originalBg = copyBtn.style.background
          copyBtn.style.background = "#28a745"
          setTimeout(() => {
            copyBtn.innerHTML = originalContent
            copyBtn.style.background = originalBg
          }, 2000)
        })
      }
    }

    if (copyPolicyBtn) {
      copyPolicyBtn.onclick = () => {
        navigator.clipboard.writeText("chrome://policy/").then(() => {
          const icon = copyPolicyBtn.querySelector("i")
          icon.className = "fa-solid fa-check"
          copyPolicyBtn.style.background = "#28a745"
          setTimeout(() => {
            icon.className = "fa-solid fa-copy"
            copyPolicyBtn.style.background = "rgba(255,255,255,0.1)"
          }, 2000)
        })
      }
    }
  }, 100)
}

