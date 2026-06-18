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
      .map((opt, idx) => {
        if (opt.type === "section") {
          return `
            <div class="dialog-check-section">
              ${opt.icon ? `<i class="${opt.icon}"></i>` : ""}
              <span>${opt.label}</span>
            </div>
          `
        }

        return `
          <label class="dialog-check-item">
            <input
              type="checkbox"
              id="dialog-check-${idx}"
              data-key="${opt.key}"
              ${opt.checked ? "checked" : ""}
              ${opt.disabled ? "disabled" : ""}
            />
            <span>${opt.label}</span>
          </label>
        `
      })
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

    // Automatically check settings option if localMedia is checked
    container.querySelectorAll(".dialog-checklist input[type='checkbox']").forEach((input) => {
      const handleDependency = (target) => {
        const key = target.dataset.key
        if (key === "localMedia") {
          const settingsInput = container.querySelector("input[data-key='settings']")
          if (settingsInput) {
            if (target.checked) {
              if (settingsInput.dataset.origDisabled === undefined) {
                settingsInput.dataset.origDisabled = settingsInput.disabled ? "true" : "false"
              }
              settingsInput.checked = true
              settingsInput.disabled = true
            } else {
              const origDisabled = settingsInput.dataset.origDisabled === "true"
              settingsInput.disabled = origDisabled
            }
          }
        }
      }

      input.addEventListener("change", (e) => handleDependency(e.target))
      if (input.checked) {
        handleDependency(input)
      }
    })

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

// Choice Dialog
export function showChoiceConfirm(options, title = null, message = null) {
  return new Promise((resolve) => {
    const container = createDialogContainer()
    const i18n = geti18n()

    const choicesHtml = (options || [])
      .map(
        (opt) => `
          <button type="button" class="dialog-choice-item" data-key="${opt.key}">
            ${opt.icon ? `<i class="${opt.icon}"></i>` : ""}
            <span>
              <strong>${opt.label}</strong>
              ${opt.description ? `<small>${opt.description}</small>` : ""}
            </span>
          </button>
        `,
      )
      .join("")

    container.innerHTML = `
      <div class="custom-dialog custom-choice">
        ${title ? `<div class="dialog-header">${title}</div>` : ""}
        <div class="dialog-body">
          <i class="fa-solid fa-language dialog-icon"></i>
          ${message ? `<div class="dialog-message">${message}</div>` : ""}
          <div class="dialog-choice-list">${choicesHtml}</div>
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn dialog-btn-secondary" id="choice-cancel">
            ${i18n.cancel || "Cancel"}
          </button>
        </div>
      </div>
    `

    container.classList.add("active")

    container.querySelectorAll(".dialog-choice-item[data-key]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.dataset.key
        closeDialog()
        resolve(value)
      })
    })

    const cancelBtn = container.querySelector("#choice-cancel")
    cancelBtn.addEventListener("click", () => {
      closeDialog()
      resolve(null)
    })

    container.addEventListener("click", (e) => {
      if (e.target === container) {
        closeDialog()
        resolve(null)
      }
    })

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
    <div class="bookmark-hide-instructions">
      <p class="bookmark-hide-step">${step1}</p>
      <p class="bookmark-hide-step bookmark-hide-step-tight">${step2}</p>
      
      <div class="command-box">
        <code id="reg-command">${command}</code>
        <button id="copy-reg-command" class="bookmark-hide-copy-btn">
          <i class="fa-solid fa-copy"></i> <span>${copyText}</span>
        </button>
      </div>

      <div class="bookmark-hide-links">
        <div class="bookmark-hide-policy-row">
          <a href="chrome://policy/" target="_blank" class="bookmark-hide-policy-link">
            <i class="fa-solid fa-external-link"></i> <span>${policyLink}</span>
          </a>
          <button id="copy-policy-link" class="bookmark-hide-copy-link" title="Copy Link">
            <i class="fa-solid fa-copy"></i>
          </button>
        </div>
        
        <a href="https://chromeenterprise.google/intl/en_ca/policies/bookmark-bar-enabled/" target="_blank" class="bookmark-hide-doc-link">
          <i class="fa-solid fa-circle-info"></i> <span>Detailed Policy Documentation</span>
        </a>
        <p class="bookmark-hide-small-note">${linkHint}</p>
        <p class="bookmark-hide-small-note">${note}</p>
      </div>

      <div class="bookmark-hide-tip">
        <p>
          <i class="fa-solid fa-lightbulb"></i> ${tip}
        </p>
      </div>
    </div>
  `

  showAlert(content, title)

  // Wait for the dialog to be rendered
  setTimeout(() => {
    const copyBtn = document.getElementById("copy-reg-command")
    const copyPolicyBtn = document.getElementById("copy-policy-link")

    if (copyBtn) {
      copyBtn.onclick = async () => {
        const success = await copyTextToClipboard(command)
        if (success) {
          const originalContent = copyBtn.innerHTML
          copyBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>${copiedText}</span>`
          const originalBg = copyBtn.style.background
          copyBtn.style.background = "#28a745"
          setTimeout(() => {
            copyBtn.innerHTML = originalContent
            copyBtn.style.background = originalBg
          }, 2000)
        }
      }
    }

    if (copyPolicyBtn) {
      copyPolicyBtn.onclick = async () => {
        const success = await copyTextToClipboard("chrome://policy/")
        if (success) {
          const icon = copyPolicyBtn.querySelector("i")
          icon.className = "fa-solid fa-check"
          copyPolicyBtn.style.background = "#28a745"
          setTimeout(() => {
            icon.className = "fa-solid fa-copy"
            copyPolicyBtn.style.background = "rgba(255,255,255,0.1)"
          }, 2000)
        }
      }
    }
  }, 100)
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.warn("navigator.clipboard.writeText failed, falling back:", err)
    }
  }
  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand("copy")
    textarea.remove()
    return success
  } catch (err) {
    console.error("execCommand fallback failed:", err)
    return false
  }
}
