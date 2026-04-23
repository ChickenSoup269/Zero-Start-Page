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
    if (effectInstances.meteorEffect) {
      const settings = effectInstances.getSettings()
      if (settings.meteorFullColor) {
        // Nếu bật full color, lấy thêm màu từ userColors
        const userColors = (settings.userColors || []).map(c => typeof c === 'string' ? c : c.val)
        const palette = [DOM.meteorColorPicker.value, ...userColors]
        effectInstances.meteorEffect.setColor(palette)
      } else {
        effectInstances.meteorEffect.setColor(DOM.meteorColorPicker.value)
      }
    }
  })

  DOM.meteorFullColorToggle?.addEventListener("change", () => {
    const enabled = DOM.meteorFullColorToggle.checked
    updateSetting("meteorFullColor", enabled)
    saveSettings()
    if (effectInstances.meteorEffect) {
      effectInstances.meteorEffect.setFullColor(enabled)
      // Refresh colors
      const settings = effectInstances.getSettings()
      const userColors = (settings.userColors || []).map(c => typeof c === 'string' ? c : c.val)
      const palette = enabled ? [settings.meteorColor, ...userColors] : settings.meteorColor
      effectInstances.meteorEffect.setColor(palette)
    }
  })

  DOM.meteorAngleInput?.addEventListener("input", () => {
    const deg = parseInt(DOM.meteorAngleInput.value)
    if (DOM.meteorAngleValue) DOM.meteorAngleValue.textContent = `${deg}°`
    updateSetting("meteorAngle", deg)
    saveSettings()
    if (effectInstances.meteorEffect) {
      effectInstances.meteorEffect.setAngle(deg)
    }
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
      effectInstances.northernLightsEffect.setOptions({
        color: DOM.northernLightsColorPicker.value,
      })
  })

  DOM.northernLightsStyleSelect?.addEventListener("change", () => {
    updateSetting("northernLightsStyle", DOM.northernLightsStyleSelect.value)
    saveSettings()
    if (effectInstances.northernLightsEffect)
      effectInstances.northernLightsEffect.setOptions({
        style: DOM.northernLightsStyleSelect.value,
      })
  })

  DOM.northernLightsBrightnessSlider?.addEventListener("input", () => {
    const val = parseFloat(DOM.northernLightsBrightnessSlider.value)
    if (DOM.northernLightsBrightnessVal)
      DOM.northernLightsBrightnessVal.textContent = val.toFixed(1)
    updateSetting("northernLightsBrightness", val)
    saveSettings()
    if (effectInstances.northernLightsEffect)
      effectInstances.northernLightsEffect.setOptions({
        brightness: val,
      })
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

  if (DOM.windModeSelect) {
    DOM.windModeSelect.addEventListener("change", () => {
      updateSetting("windMode", DOM.windModeSelect.value)
      saveSettings()
      if (effectInstances.windEffect) {
        effectInstances.windEffect.setMode(DOM.windModeSelect.value)
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
      effectInstances.snowfallEffect.updateColor(DOM.snowfallColorPicker.value)
  })

  DOM.sunbeamColorPicker?.addEventListener("input", () => {
    updateSetting("sunbeamColor", DOM.sunbeamColorPicker.value)
    saveSettings()
    if (effectInstances.sunbeamEffect)
      effectInstances.sunbeamEffect.updateColor(DOM.sunbeamColorPicker.value)
  })

  DOM.sunbeamAngleInput?.addEventListener("input", () => {
    const angle = Number(DOM.sunbeamAngleInput.value)
    if (DOM.sunbeamAngleValue) DOM.sunbeamAngleValue.textContent = angle
    updateSetting("sunbeamAngle", angle)
    saveSettings()
    if (effectInstances.sunbeamEffect)
      effectInstances.sunbeamEffect.setAngle(angle)
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

  DOM.cursorTrailStyleSelect?.addEventListener("change", () => {
    updateSetting("cursorTrailStyle", DOM.cursorTrailStyleSelect.value)
    saveSettings()
    if (effectInstances.cursorTrailEffect)
      effectInstances.cursorTrailEffect.setStyle(DOM.cursorTrailStyleSelect.value)
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

  // Flashlight
  DOM.flashlightColorPicker?.addEventListener("input", () => {
    updateSetting("flashlightColor", DOM.flashlightColorPicker.value)
    saveSettings()
    if (effectInstances.flashlightEffect) {
      effectInstances.flashlightEffect.setOptions({
        color: DOM.flashlightColorPicker.value,
      })
    }
  })

  DOM.flashlightSizeSlider?.addEventListener("input", () => {
    const val = parseInt(DOM.flashlightSizeSlider.value)
    if (DOM.flashlightSizeVal) DOM.flashlightSizeVal.textContent = val
    updateSetting("flashlightSize", val)
    if (effectInstances.flashlightEffect) {
      effectInstances.flashlightEffect.setOptions({ size: val })
    }
  })
  DOM.flashlightSizeSlider?.addEventListener("change", () => saveSettings())

  DOM.flashlightOpacitySlider?.addEventListener("input", () => {
    const val = parseFloat(DOM.flashlightOpacitySlider.value)
    if (DOM.flashlightOpacityVal)
      DOM.flashlightOpacityVal.textContent = val.toFixed(2)
    updateSetting("flashlightOpacity", val)
    if (effectInstances.flashlightEffect) {
      effectInstances.flashlightEffect.setOptions({ opacity: val })
    }
  })
  DOM.flashlightOpacitySlider?.addEventListener("change", () => saveSettings())

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

  let floatingLinesTimer = null
  DOM.floatingLinesColorPicker.addEventListener("input", () => {
    // Update live color in effect if it's not too heavy, 
    // but debounce the saving and state update to prevent lag
    if (effectInstances.floatingLinesEffect) {
      effectInstances.floatingLinesEffect.updateColor(
        DOM.floatingLinesColorPicker.value,
      )
    }

    clearTimeout(floatingLinesTimer)
    floatingLinesTimer = setTimeout(() => {
      updateSetting("floatingLinesColor", DOM.floatingLinesColorPicker.value)
      saveSettings()
    }, 250)
  })

  DOM.floatingLinesAngleInput.addEventListener("input", () => {
    const angle = parseInt(DOM.floatingLinesAngleInput.value)
    DOM.floatingLinesAngleValue.textContent = `${angle}°`

    if (effectInstances.floatingLinesEffect) {
      effectInstances.floatingLinesEffect.setAngle(angle)
    }

    clearTimeout(floatingLinesTimer)
    floatingLinesTimer = setTimeout(() => {
      updateSetting("floatingLinesAngle", angle)
      saveSettings()
    }, 250)
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
  if (DOM.crtScanFrequencyValue)
    DOM.crtScanFrequencyValue.textContent = frequency.toFixed(2)
  updateSetting("crtScanFrequency", frequency)
  saveSettings()
  if (effectInstances.crtScanlinesEffect)
    effectInstances.crtScanlinesEffect.updateScanFrequency(frequency)
})

DOM.crtScanAngleInput?.addEventListener("input", () => {
  const angle = Number(DOM.crtScanAngleInput.value)
  if (DOM.crtScanAngleValue) DOM.crtScanAngleValue.textContent = angle
  updateSetting("crtScanAngle", angle)
  saveSettings()
  if (effectInstances.crtScanlinesEffect)
    effectInstances.crtScanlinesEffect.updateScanAngle(angle)
})

DOM.crtScanDensityInput?.addEventListener("input", () => {
  const density = Number(DOM.crtScanDensityInput.value)
  if (DOM.crtScanDensityValue) DOM.crtScanDensityValue.textContent = density
  updateSetting("crtScanDensity", density)
  saveSettings()
  if (effectInstances.crtScanlinesEffect)
    effectInstances.crtScanlinesEffect.updateScanDensity(density)
})

DOM.crtGammaInput?.addEventListener("input", () => {
  const gamma = Number(DOM.crtGammaInput.value)
  if (DOM.crtGammaValue) DOM.crtGammaValue.textContent = gamma.toFixed(2)
  updateSetting("crtGamma", gamma)
  saveSettings()
  if (effectInstances.crtScanlinesEffect)
    effectInstances.crtScanlinesEffect.updateGamma(gamma)
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

  DOM.rainbowDirLeftBtn?.addEventListener("click", () => {
    updateSetting("rainbowDirection", "left")
    saveSettings()
    if (effectInstances.rainbowEffect)
      effectInstances.rainbowEffect.setDirection("left")
    DOM.rainbowDirLeftBtn.classList.add("active")
    DOM.rainbowDirRightBtn.classList.remove("active")
  })

  DOM.rainbowDirRightBtn?.addEventListener("click", () => {
    updateSetting("rainbowDirection", "right")
    saveSettings()
    if (effectInstances.rainbowEffect)
      effectInstances.rainbowEffect.setDirection("right")
    DOM.rainbowDirRightBtn.classList.add("active")
    DOM.rainbowDirLeftBtn.classList.remove("active")
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

  // Pixel Blast
  if (DOM.pixelBlastColorPicker) {
    DOM.pixelBlastColorPicker.addEventListener("input", (e) => {
      const color = e.target.value
      updateSetting("pixelBlastColor", color)
      if (effectInstances.pixelBlastEffect) {
        effectInstances.pixelBlastEffect.setOptions({ color })
      }
    })
    DOM.pixelBlastColorPicker.addEventListener("change", () => saveSettings())
  }

  if (DOM.pixelBlastVariantSelect) {
    DOM.pixelBlastVariantSelect.addEventListener("change", (e) => {
      const variant = e.target.value
      updateSetting("pixelBlastVariant", variant)
      saveSettings()
      if (effectInstances.pixelBlastEffect) {
        effectInstances.pixelBlastEffect.setOptions({ variant })
      }
    })
  }

  if (DOM.pixelBlastSizeSlider) {
    DOM.pixelBlastSizeSlider.addEventListener("input", (e) => {
      const pixelSize = parseInt(e.target.value)
      if (DOM.pixelBlastSizeVal) DOM.pixelBlastSizeVal.textContent = pixelSize
      updateSetting("pixelBlastSize", pixelSize)
      if (effectInstances.pixelBlastEffect) {
        effectInstances.pixelBlastEffect.setOptions({ pixelSize })
      }
    })
    DOM.pixelBlastSizeSlider.addEventListener("change", () => saveSettings())
  }

  if (DOM.pixelBlastTransparentCheckbox) {
    DOM.pixelBlastTransparentCheckbox.addEventListener("change", (e) => {
      const transparent = e.target.checked
      updateSetting("pixelBlastTransparent", transparent)
      saveSettings()
      if (DOM.pixelBlastBgColorContainer) {
        DOM.pixelBlastBgColorContainer.style.display = transparent
          ? "none"
          : "block"
      }
      if (effectInstances.pixelBlastEffect) {
        effectInstances.pixelBlastEffect.setOptions({ transparent })
      }
    })
  }

  if (DOM.pixelBlastBgColorPicker) {
    DOM.pixelBlastBgColorPicker.addEventListener("input", (e) => {
      const color = e.target.value
      updateSetting("pixelBlastBgColor", color)
      if (effectInstances.pixelBlastEffect) {
        effectInstances.pixelBlastEffect.setOptions({ backgroundColor: color })
      }
    })
    DOM.pixelBlastBgColorPicker.addEventListener("change", () => saveSettings())
  }

  if (DOM.pixelBlastLiquidCheckbox) {
    DOM.pixelBlastLiquidCheckbox.addEventListener("change", (e) => {
      const liquid = e.target.checked
      updateSetting("pixelBlastLiquid", liquid)
      saveSettings()
      if (effectInstances.pixelBlastEffect) {
        effectInstances.pixelBlastEffect.setOptions({ liquid })
      }
    })
  }

  if (DOM.pixelBlastLiquidStrengthSlider) {
    DOM.pixelBlastLiquidStrengthSlider.addEventListener("input", (e) => {
      const liquidStrength = parseFloat(e.target.value)
      if (DOM.pixelBlastLiquidStrengthVal) {
        DOM.pixelBlastLiquidStrengthVal.textContent = liquidStrength.toFixed(1)
      }
      updateSetting("pixelBlastLiquidStrength", liquidStrength)
      if (effectInstances.pixelBlastEffect) {
        effectInstances.pixelBlastEffect.setOptions({ liquidStrength })
      }
    })
    DOM.pixelBlastLiquidStrengthSlider.addEventListener("change", () => saveSettings())
  }

  if (DOM.pixelBlastCursorRadiusSlider) {
    DOM.pixelBlastCursorRadiusSlider.addEventListener("input", (e) => {
      const cursorRadius = parseInt(e.target.value)
      if (DOM.pixelBlastCursorRadiusVal) {
        DOM.pixelBlastCursorRadiusVal.textContent = cursorRadius
      }
      updateSetting("pixelBlastCursorRadius", cursorRadius)
      if (effectInstances.pixelBlastEffect) {
        effectInstances.pixelBlastEffect.setOptions({ cursorRadius })
      }
    })
    DOM.pixelBlastCursorRadiusSlider.addEventListener("change", () => saveSettings())
  }

  if (DOM.pixelBlastRippleCheckbox) {
    DOM.pixelBlastRippleCheckbox.addEventListener("change", (e) => {
      const enableRipples = e.target.checked
      updateSetting("pixelBlastRipples", enableRipples)
      saveSettings()
      if (effectInstances.pixelBlastEffect) {
        effectInstances.pixelBlastEffect.setOptions({ enableRipples })
      }
    })
  }

  DOM.auroraWaveColorPicker?.addEventListener("input", () => {
    updateSetting("auroraWaveColor", DOM.auroraWaveColorPicker.value)
    saveSettings()
    if (effectInstances.auroraWaveEffect) {
      effectInstances.auroraWaveEffect.setOptions({
        color: DOM.auroraWaveColorPicker.value,
      })
    }
  })

  DOM.auroraWaveBrightnessSlider?.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value)
    if (DOM.auroraWaveBrightnessVal)
      DOM.auroraWaveBrightnessVal.textContent = val.toFixed(2)
    updateSetting("auroraWaveBrightness", val)
    if (effectInstances.auroraWaveEffect) {
      effectInstances.auroraWaveEffect.setOptions({ brightness: val })
    }
  })
  DOM.auroraWaveBrightnessSlider?.addEventListener("change", () =>
    saveSettings(),
  )

  DOM.auroraWaveSpeedSlider?.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value)
    if (DOM.auroraWaveSpeedVal) DOM.auroraWaveSpeedVal.textContent = val.toFixed(1)
    updateSetting("auroraWaveSpeed", val)
    if (effectInstances.auroraWaveEffect) {
      effectInstances.auroraWaveEffect.setOptions({ speed: val })
    }
  })
  DOM.auroraWaveSpeedSlider?.addEventListener("change", () => saveSettings())

  DOM.auroraWaveAmplitudeSlider?.addEventListener("input", (e) => {
    const val = parseInt(e.target.value)
    if (DOM.auroraWaveAmplitudeVal) DOM.auroraWaveAmplitudeVal.textContent = val
    updateSetting("auroraWaveAmplitude", val)
    if (effectInstances.auroraWaveEffect) {
      effectInstances.auroraWaveEffect.setOptions({ waveAmplitude: val })
    }
  })
  DOM.auroraWaveAmplitudeSlider?.addEventListener("change", () =>
    saveSettings(),
  )

  DOM.auroraWaveTransparentCheckbox?.addEventListener("change", (e) => {
    const isTransparent = e.target.checked
    updateSetting("auroraWaveTransparent", isTransparent)
    saveSettings()
    if (DOM.auroraWaveBgColorContainer) {
      DOM.auroraWaveBgColorContainer.style.display = isTransparent
        ? "none"
        : "block"
    }
    if (effectInstances.auroraWaveEffect) {
      effectInstances.auroraWaveEffect.setOptions({ transparent: isTransparent })
    }
  })

  DOM.auroraWaveBgColorPicker?.addEventListener("input", (e) => {
    const color = e.target.value
    updateSetting("auroraWaveBgColor", color)
    if (effectInstances.auroraWaveEffect) {
      effectInstances.auroraWaveEffect.setOptions({ backgroundColor: color })
    }
  })
  DOM.auroraWaveBgColorPicker?.addEventListener("change", () => saveSettings())

  DOM.auroraWaveBgOpacitySlider?.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value)
    if (DOM.auroraWaveBgOpacityVal) DOM.auroraWaveBgOpacityVal.textContent = val
    updateSetting("auroraWaveBgOpacity", val)
    if (effectInstances.auroraWaveEffect) {
      effectInstances.auroraWaveEffect.setOptions({ bgOpacity: val })
    }
  })
  DOM.auroraWaveBgOpacitySlider?.addEventListener("change", () =>
    saveSettings(),
  )
}

export { setupEffectColorHandlers }
