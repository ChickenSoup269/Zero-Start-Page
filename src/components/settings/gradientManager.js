/**
 * Gradient Manager Module
 * Handles gradient rendering and management
 */

import {
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"
import { geti18n } from "../../services/i18n.js"
import { showAlert, showConfirm } from "../../utils/dialog.js"

function renderUserGradients(DOM) {
  const settings = getSettings()
  DOM.userGradientsGallery.innerHTML = ""
  if (Array.isArray(settings.userGradients)) {
    settings.userGradients.forEach((gradient, index) => {
      // Skip multi-color presets (they have their own section)
      if (gradient.type === "multi-color") return

      const item = document.createElement("div")
      item.className = "user-gradient-item"
      item.dataset.start = gradient.start
      item.dataset.end = gradient.end
      item.dataset.angle = gradient.angle
      item.style.background = `linear-gradient(${gradient.angle}deg, ${gradient.start}, ${gradient.end})`
      item.title = `Gradient ${index + 1}`
      const removeBtn = document.createElement("button")
      removeBtn.className = "remove-bg-btn"
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
      removeBtn.addEventListener("click", async (e) => {
        e.stopPropagation()
        const i18n = geti18n()
        if (await showConfirm(i18n.alert_delete_bg_confirm)) {
          settings.userGradients.splice(index, 1)
          saveSettings()
          renderUserGradients(DOM)
        }
      })
      item.appendChild(removeBtn)
      DOM.userGradientsGallery.appendChild(item)
    })
  }
}

export { renderUserGradients }
