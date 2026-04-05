/**
 * SVG Wave Manager Module

import { getSettings } from "../../services/state.js"
 * Handles SVG wave rendering and management
 */

import {
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"
import { geti18n } from "../../services/i18n.js"
import { showConfirm } from "../../utils/dialog.js"
import { getSvgWaveParams } from "./svgWaveUtils.js"

function renderUserSvgWaves(DOM, svgWaveEffect, onActivate) {
  const settings = getSettings()
  if (!DOM.userSvgWavesGallery) return
  DOM.userSvgWavesGallery.innerHTML = ""
  if (
    !Array.isArray(settings.userSvgWaves) ||
    settings.userSvgWaves.length === 0
  ) {
    DOM.userSvgWavesGallery.parentElement.style.display = "none"
    return
  }
  DOM.userSvgWavesGallery.parentElement.style.display = ""
  settings.userSvgWaves.forEach((wave, index) => {
    const item = document.createElement("div")
    item.className = "user-gradient-item user-svg-wave-item local-bg-item"
    item.dataset.lines = wave.lines
    item.dataset.ampx = wave.amplitudeX
    item.dataset.ampy = wave.amplitudeY
    item.dataset.startHue = wave.startHue
    item.dataset.endHue = wave.endHue
    item.title = `Wave ${index + 1}`
    item.style.backgroundImage = `url("${svgWaveEffect ? svgWaveEffect.generateThumbnailDataUri(wave) : ""}")`
    item.style.backgroundSize = "cover"

    const removeBtn = document.createElement("button")
    removeBtn.className = "remove-bg-btn"
    removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
    removeBtn.addEventListener("click", async (e) => {
      e.stopPropagation()
      const i18n = geti18n()
      if (await showConfirm(i18n.alert_delete_bg_confirm)) {
        settings.userSvgWaves.splice(index, 1)
        saveSettings()
        renderUserSvgWaves(DOM, svgWaveEffect, onActivate)
      }
    })

    item.appendChild(removeBtn)
    item.addEventListener("click", () => {
      updateSetting("svgWaveLines", wave.lines)
      updateSetting("svgWaveAmplitudeX", wave.amplitudeX)
      updateSetting("svgWaveAmplitudeY", wave.amplitudeY)
      updateSetting("svgWaveOffsetX", wave.offsetX)
      updateSetting("svgWaveAngle", wave.angle ?? 0)
      updateSetting("svgWaveSmoothness", wave.smoothness)
      updateSetting("svgWaveFill", wave.fill)
      updateSetting("svgWaveCraziness", wave.craziness)
      updateSetting("svgWaveStartHue", wave.startHue)
      updateSetting("svgWaveStartSaturation", wave.startSaturation)
      updateSetting("svgWaveStartLightness", wave.startLightness)
      updateSetting("svgWaveEndHue", wave.endHue)
      updateSetting("svgWaveEndSaturation", wave.endSaturation)
      updateSetting("svgWaveEndLightness", wave.endLightness)
      updateSetting("svgWaveActive", true)
      updateSetting("background", null)
      saveSettings()

      if (onActivate) onActivate()
    })

    DOM.userSvgWavesGallery.appendChild(item)
  })
}

export { renderUserSvgWaves }
