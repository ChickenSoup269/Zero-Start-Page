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

function normalizeGradient(gradient) {
  const type = ["linear", "radial", "conic"].includes(gradient?.type)
    ? gradient.type
    : "linear"
  const repeating = gradient?.repeating === true

  return {
    start: gradient?.start || "#0f0c29",
    end: gradient?.end || "#302b63",
    angle: Number(gradient?.angle ?? 135),
    type,
    repeating,
  }
}

function buildGradientCss(gradient) {
  const normalized = normalizeGradient(gradient)
  const { start, end, angle, type, repeating } = normalized

  if (repeating) {
    if (type === "radial") {
      return `repeating-radial-gradient(circle at center, ${start} 0%, ${end} 12%, ${start} 24%)`
    }
    if (type === "conic") {
      return `repeating-conic-gradient(from ${angle}deg, ${start} 0deg, ${end} 18deg, ${start} 36deg)`
    }
    return `repeating-linear-gradient(${angle}deg, ${start} 0%, ${end} 25%, ${start} 50%)`
  }

  if (type === "radial") {
    return `radial-gradient(circle at center, ${start}, ${end})`
  }
  if (type === "conic") {
    return `conic-gradient(from ${angle}deg, ${start}, ${end})`
  }

  return `linear-gradient(${angle}deg, ${start}, ${end})`
}

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
      item.dataset.type = gradient.type || "linear"
      item.dataset.repeating = String(gradient.repeating === true)
      item.style.background = buildGradientCss(gradient)
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
export { buildGradientCss }
