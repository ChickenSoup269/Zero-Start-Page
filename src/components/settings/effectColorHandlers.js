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

  DOM.meteorColorPicker?.addEventListener("input", () => {
    updateSetting("meteorColor", DOM.meteorColorPicker.value)
    saveSettings()
    if (effectInstances.meteorEffect)
      effectInstances.meteorEffect.updateAccentColor(
        DOM.meteorColorPicker.value,
      )
  })

  DOM.networkColorPicker?.addEventListener("input", () => {
    updateSetting("networkColor", DOM.networkColorPicker.value)
    saveSettings()
    if (effectInstances.networkEffect)
      effectInstances.networkEffect.updateColor(DOM.networkColorPicker.value)
  })

  DOM.matrixColorPicker?.addEventListener("input", () => {
    updateSetting("matrixColor", DOM.matrixColorPicker.value)
    saveSettings()
    if (effectInstances.matrixRainEffect)
      effectInstances.matrixRainEffect.updateColor(DOM.matrixColorPicker.value)
  })

  DOM.auraColorPicker?.addEventListener("input", () => {
    updateSetting("auraColor", DOM.auraColorPicker.value)
    saveSettings()
    if (effectInstances.auraEffect)
      effectInstances.auraEffect.updateColor(DOM.auraColorPicker.value)
  })

  DOM.northernLightsColorPicker?.addEventListener("input", () => {
    updateSetting("northernLightsColor", DOM.northernLightsColorPicker.value)
    saveSettings()
    if (effectInstances.northernLightsEffect)
      effectInstances.northernLightsEffect.setColor(
        DOM.northernLightsColorPicker.value,
      )
  })

  DOM.hackerColorPicker?.addEventListener("input", () => {
    updateSetting("hackerColor", DOM.hackerColorPicker.value)
    saveSettings()
    if (effectInstances.hackerEffect)
      effectInstances.hackerEffect.updateColor(DOM.hackerColorPicker.value)
  })

  DOM.pixelCubesColorPicker.addEventListener("input", () => {
    updateSetting("pixelCubesColor", DOM.pixelCubesColorPicker.value)
    saveSettings()
    if (effectInstances.pixelCubesEffect)
      effectInstances.pixelCubesEffect.updateColor(
        DOM.pixelCubesColorPicker.value,
      )
  })

  if (DOM.pixelCubesShapeSelect) {
    DOM.pixelCubesShapeSelect.addEventListener("change", () => {
      updateSetting("pixelCubesShape", DOM.pixelCubesShapeSelect.value)
      saveSettings()
      if (effectInstances.pixelCubesEffect) {
        effectInstances.pixelCubesEffect.updateShape(DOM.pixelCubesShapeSelect.value)
      }
    })
  }

  if (DOM.jellyfishColorPicker) {
    DOM.jellyfishColorPicker.addEventListener("input", () => {
      updateSetting("jellyfishColor", DOM.jellyfishColorPicker.value)
      saveSettings()
      if (effectInstances.jellyfishEffect)
        effectInstances.jellyfishEffect.updateColor(
          DOM.jellyfishColorPicker.value,
        )
    })
  }

  if (DOM.jellyfishTypeSelect) {
    DOM.jellyfishTypeSelect.addEventListener("change", () => {
      updateSetting("jellyfishType", DOM.jellyfishTypeSelect.value)
      saveSettings()
      if (effectInstances.jellyfishEffect) {
        effectInstances.jellyfishEffect.updateType(DOM.jellyfishTypeSelect.value)
      }
    })
  }

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

  DOM.gridScanColorPicker.addEventListener("input", () => {
    updateSetting("gridScanColor", DOM.gridScanColorPicker.value)
    saveSettings()
    if (effectInstances.gridScanEffect)
      effectInstances.gridScanEffect.updateColor(DOM.gridScanColorPicker.value)
  })

  DOM.cursorTrailColorPicker.addEventListener("input", () => {
    updateSetting("cursorTrailColor", DOM.cursorTrailColorPicker.value)
    saveSettings()
    if (effectInstances.cursorTrailEffect)
      effectInstances.cursorTrailEffect.color = DOM.cursorTrailColorPicker.value
  })

  DOM.cursorTrailClickCheckbox.addEventListener("change", () => {
    updateSetting(
      "cursorTrailClickExplosion",
      DOM.cursorTrailClickCheckbox.checked,
    )
    saveSettings()
    if (effectInstances.cursorTrailEffect)
      effectInstances.cursorTrailEffect.clickExplosion =
        DOM.cursorTrailClickCheckbox.checked
  })

  DOM.cursorTrailRandomCheckbox.addEventListener("change", () => {
    updateSetting(
      "cursorTrailRandomColor",
      DOM.cursorTrailRandomCheckbox.checked,
    )
    saveSettings()
    if (effectInstances.cursorTrailEffect)
      effectInstances.cursorTrailEffect.randomColor =
        DOM.cursorTrailRandomCheckbox.checked
  })

  DOM.plantGrowthColorPicker.addEventListener("input", () => {
    updateSetting("plantGrowthColor", DOM.plantGrowthColorPicker.value)
    saveSettings()
    if (effectInstances.plantGrowthEffect) {
      effectInstances.plantGrowthEffect.color = DOM.plantGrowthColorPicker.value
    }
  })

  DOM.oceanFishColorPicker.addEventListener("input", () => {
    updateSetting("oceanFishColor", DOM.oceanFishColorPicker.value)
    saveSettings()
    if (effectInstances.oceanFishEffect) {
      effectInstances.oceanFishEffect.color = DOM.oceanFishColorPicker.value
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

  DOM.crtScanColorPicker?.addEventListener("input", () => {
    updateSetting("crtScanColor", DOM.crtScanColorPicker.value)
    saveSettings()
    if (effectInstances.crtScanlinesEffect)
      effectInstances.crtScanlinesEffect.updateScanColor(
        DOM.crtScanColorPicker.value,
      )
  })

  DOM.crtScanFrequencyInput?.addEventListener("input", () => {
    const frequency = Number(DOM.crtScanFrequencyInput.value)
    DOM.crtScanFrequencyValue.textContent = frequency.toFixed(2)
    updateSetting("crtScanFrequency", frequency)
    saveSettings()
    if (effectInstances.crtScanlinesEffect)
      effectInstances.crtScanlinesEffect.updateScanFrequency(frequency)
  })

  DOM.crtBackgroundColorPicker?.addEventListener("input", () => {
    updateSetting("crtBackgroundColor", DOM.crtBackgroundColorPicker.value)
    saveSettings()
    if (effectInstances.crtScanlinesEffect)
      effectInstances.crtScanlinesEffect.updateBackgroundColor(
        DOM.crtBackgroundColorPicker.value,
      )
  })

  if (DOM.retroGameTypeSelect) {
    DOM.retroGameTypeSelect.addEventListener("change", () => {
      updateSetting("retroGameType", DOM.retroGameTypeSelect.value)
      saveSettings()
      if (effectInstances.retroGameEffect) {
        effectInstances.retroGameEffect.updateGameType(
          DOM.retroGameTypeSelect.value,
        )
      }
    })
  }

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
