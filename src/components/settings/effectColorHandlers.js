/**
 * Effect Color Handlers Module
 * Manages all effect color picker event listeners
 */

import { updateSetting, saveSettings } from "../../services/state.js"

function setupEffectColorHandlers(DOM, effectInstances) {
  DOM.starColorPicker.addEventListener("input", () => {
    updateSetting("starColor", DOM.starColorPicker.value)
    saveSettings()
    if (effectInstances.starFallEffect)
      effectInstances.starFallEffect.updateColor(DOM.starColorPicker.value)
  })

  DOM.meteorColorPicker.addEventListener("input", () => {
    updateSetting("meteorColor", DOM.meteorColorPicker.value)
    saveSettings()
    if (effectInstances.meteorEffect)
      effectInstances.meteorEffect.updateAccentColor(
        DOM.meteorColorPicker.value,
      )
  })

  DOM.networkColorPicker.addEventListener("input", () => {
    updateSetting("networkColor", DOM.networkColorPicker.value)
    saveSettings()
    if (effectInstances.networkEffect)
      effectInstances.networkEffect.updateColor(DOM.networkColorPicker.value)
  })

  DOM.matrixColorPicker.addEventListener("input", () => {
    updateSetting("matrixColor", DOM.matrixColorPicker.value)
    saveSettings()
    if (effectInstances.matrixRainEffect)
      effectInstances.matrixRainEffect.updateColor(DOM.matrixColorPicker.value)
  })

  DOM.auraColorPicker.addEventListener("input", () => {
    updateSetting("auraColor", DOM.auraColorPicker.value)
    saveSettings()
    if (effectInstances.auraEffect)
      effectInstances.auraEffect.updateColor(DOM.auraColorPicker.value)
  })

  DOM.northernLightsColorPicker.addEventListener("input", () => {
    updateSetting("northernLightsColor", DOM.northernLightsColorPicker.value)
    saveSettings()
    if (effectInstances.northernLightsEffect)
      effectInstances.northernLightsEffect.setColor(
        DOM.northernLightsColorPicker.value,
      )
  })

  DOM.hackerColorPicker.addEventListener("input", () => {
    updateSetting("hackerColor", DOM.hackerColorPicker.value)
    saveSettings()
    if (effectInstances.hackerEffect)
      effectInstances.hackerEffect.updateColor(DOM.hackerColorPicker.value)
  })

  DOM.sakuraColorPicker.addEventListener("input", () => {
    updateSetting("sakuraColor", DOM.sakuraColorPicker.value)
    saveSettings()
    if (effectInstances.sakuraEffect)
      effectInstances.sakuraEffect.color = DOM.sakuraColorPicker.value
  })

  DOM.snowfallColorPicker.addEventListener("input", () => {
    updateSetting("snowfallColor", DOM.snowfallColorPicker.value)
    saveSettings()
    if (effectInstances.snowfallEffect)
      effectInstances.snowfallEffect.color = DOM.snowfallColorPicker.value
  })

  DOM.bubblesColorPicker.addEventListener("input", () => {
    updateSetting("bubbleColor", DOM.bubblesColorPicker.value)
    saveSettings()
    if (effectInstances.bubblesEffect)
      effectInstances.bubblesEffect.color = DOM.bubblesColorPicker.value
  })

  DOM.rainOnGlassColorPicker.addEventListener("input", () => {
    updateSetting("rainOnGlassColor", DOM.rainOnGlassColorPicker.value)
    saveSettings()
    if (effectInstances.rainOnGlassEffect) {
      effectInstances.rainOnGlassEffect.color = DOM.rainOnGlassColorPicker.value
      effectInstances.rainOnGlassEffect._parseColor(
        DOM.rainOnGlassColorPicker.value,
      )
    }
  })

  DOM.rainHDColorPicker.addEventListener("input", () => {
    updateSetting("rainHDColor", DOM.rainHDColorPicker.value)
    saveSettings()
    if (effectInstances.rainHDEffect) {
      effectInstances.rainHDEffect.color = DOM.rainHDColorPicker.value
      effectInstances.rainHDEffect._parseColor(DOM.rainHDColorPicker.value)
    }
  })

  DOM.stormRainColorPicker.addEventListener("input", () => {
    updateSetting("stormRainColor", DOM.stormRainColorPicker.value)
    saveSettings()
    if (effectInstances.stormRainEffect) {
      effectInstances.stormRainEffect.rainColor = DOM.stormRainColorPicker.value
      effectInstances.stormRainEffect._parseRainColor(
        DOM.stormRainColorPicker.value,
      )
    }
  })

  DOM.wavyLinesColorPicker.addEventListener("input", () => {
    updateSetting("wavyLinesColor", DOM.wavyLinesColorPicker.value)
    saveSettings()
    if (effectInstances.wavyLinesEffect)
      effectInstances.wavyLinesEffect.color = DOM.wavyLinesColorPicker.value
  })

  DOM.oceanWaveColorPicker.addEventListener("input", () => {
    updateSetting("oceanWaveColor", DOM.oceanWaveColorPicker.value)
    saveSettings()
    if (effectInstances.oceanWaveEffect)
      effectInstances.oceanWaveEffect.color = DOM.oceanWaveColorPicker.value
  })

  DOM.oceanWavePosBottomBtn.addEventListener("click", () => {
    updateSetting("oceanWavePosition", "bottom")
    saveSettings()
    if (effectInstances.oceanWaveEffect)
      effectInstances.oceanWaveEffect.position = "bottom"
    DOM.oceanWavePosBottomBtn.classList.add("active")
    DOM.oceanWavePosTopBtn.classList.remove("active")
  })

  DOM.oceanWavePosTopBtn.addEventListener("click", () => {
    updateSetting("oceanWavePosition", "top")
    saveSettings()
    if (effectInstances.oceanWaveEffect)
      effectInstances.oceanWaveEffect.position = "top"
    DOM.oceanWavePosTopBtn.classList.add("active")
    DOM.oceanWavePosBottomBtn.classList.remove("active")
  })

  DOM.cloudDriftColorPicker.addEventListener("input", () => {
    updateSetting("cloudDriftColor", DOM.cloudDriftColorPicker.value)
    saveSettings()
    if (effectInstances.cloudDriftEffect)
      effectInstances.cloudDriftEffect.color = DOM.cloudDriftColorPicker.value
  })

  DOM.shinyColorPicker.addEventListener("input", () => {
    updateSetting("shinyColor", DOM.shinyColorPicker.value)
    saveSettings()
    if (effectInstances.shinyEffect)
      effectInstances.shinyEffect.updateColor(DOM.shinyColorPicker.value)
  })

  DOM.lineShinyColorPicker.addEventListener("input", () => {
    updateSetting("lineShinyColor", DOM.lineShinyColorPicker.value)
    saveSettings()
    if (effectInstances.lineShinyEffect)
      effectInstances.lineShinyEffect.updateColor(
        DOM.lineShinyColorPicker.value,
      )
  })

  DOM.pixelRunColorPicker.addEventListener("input", () => {
    updateSetting("pixelRunColor", DOM.pixelRunColorPicker.value)
    saveSettings()
    if (effectInstances.pixelRunEffect)
      effectInstances.pixelRunEffect.color = DOM.pixelRunColorPicker.value
  })

  DOM.nintendoPixelColorPicker.addEventListener("input", () => {
    updateSetting("nintendoPixelColor", DOM.nintendoPixelColorPicker.value)
    saveSettings()
    if (effectInstances.nintendoPixelEffect)
      effectInstances.nintendoPixelEffect.updateAccentColor(
        DOM.nintendoPixelColorPicker.value,
      )
  })

  DOM.retroGameColorPicker.addEventListener("input", () => {
    updateSetting("retroGameColor", DOM.retroGameColorPicker.value)
    saveSettings()
    if (effectInstances.retroGameEffect)
      effectInstances.retroGameEffect.updateAccentColor(
        DOM.retroGameColorPicker.value,
      )
  })

  DOM.wavyPatternColor1Picker.addEventListener("input", () => {
    updateSetting("wavyPatternColor1", DOM.wavyPatternColor1Picker.value)
    saveSettings()
    if (effectInstances.wavyPatternEffect)
      effectInstances.wavyPatternEffect.setColors(
        DOM.wavyPatternColor1Picker.value,
        null,
      )
  })

  DOM.wavyPatternColor2Picker.addEventListener("input", () => {
    updateSetting("wavyPatternColor2", DOM.wavyPatternColor2Picker.value)
    saveSettings()
    if (effectInstances.wavyPatternEffect)
      effectInstances.wavyPatternEffect.setColors(
        null,
        DOM.wavyPatternColor2Picker.value,
      )
  })

  DOM.angledPatternColor1Picker.addEventListener("input", () => {
    updateSetting("angledPatternColor1", DOM.angledPatternColor1Picker.value)
    saveSettings()
    if (effectInstances.angledPatternEffect)
      effectInstances.angledPatternEffect.setColors(
        DOM.angledPatternColor1Picker.value,
        null,
      )
  })

  DOM.angledPatternColor2Picker.addEventListener("input", () => {
    updateSetting("angledPatternColor2", DOM.angledPatternColor2Picker.value)
    saveSettings()
    if (effectInstances.angledPatternEffect)
      effectInstances.angledPatternEffect.setColors(
        null,
        DOM.angledPatternColor2Picker.value,
      )
  })

  // Falling Leaves Settled Skin selector
  const fallingLeavesSelect = document.getElementById(
    "falling-leaves-settled-skin",
  )
  if (fallingLeavesSelect) {
    fallingLeavesSelect.addEventListener("change", () => {
      const skinType = fallingLeavesSelect.value
      updateSetting("fallingLeavesSkin", skinType)
      saveSettings()
      if (effectInstances.fallingLeavesSettledEffect) {
        effectInstances.fallingLeavesSettledEffect.setLeafType(skinType)
      }
    })
  }
}

export { setupEffectColorHandlers }
