import {
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"
import { geti18n } from "../../services/i18n.js"
import * as DOM from "../../utils/dom.js"

export function setupMultiColorManager(applySettings) {
  function t(key, fallback) {
    const i18n = geti18n()
    return i18n?.[key] || fallback
  }

  // Generate color pickers based on selected count
  function generateColorPickers(count) {
    const container = DOM.multiColorPickersContainer
    container.innerHTML = ""

    for (let i = 0; i < count; i++) {
      const wrapper = document.createElement("div")
      wrapper.style.display = "flex"
      wrapper.style.alignItems = "center"
      wrapper.style.gap = "8px"

      const label = document.createElement("label")
      label.textContent = `${t("settings_multi_color_color_label", "Color")} ${i + 1}:`
      label.style.flex = "0 0 70px"
      label.style.fontSize = "0.9rem"

      const colorPicker = document.createElement("input")
      colorPicker.type = "color"
      colorPicker.className = "multi-color-picker"
      colorPicker.dataset.index = i
      colorPicker.style.flex = "1"

      const settings = getSettings()
      colorPicker.value = settings.multiColors[i] || "#FF6B6B"

      colorPicker.addEventListener("input", () => {
        updateMultiColorPreview()
      })

      wrapper.appendChild(label)
      wrapper.appendChild(colorPicker)
      container.appendChild(wrapper)
    }
  }

  // Get current mode (smooth or blocks)
  function getMode() {
    const checked = Array.from(DOM.multiColorModeRadios).find((r) => r.checked)
    return checked ? checked.value : "smooth"
  }

  // Update preview gradient or solid blocks
  function updateMultiColorPreview() {
    const pickers = Array.from(document.querySelectorAll(".multi-color-picker"))
    const colors = pickers.map((p) => p.value)
    const angle = DOM.multiGradientAngleInput.value
    const mode = getMode()
    const dividerConfig = getDividerConfig()

    let backgroundCSS

    if (mode === "blocks") {
      // Solid color blocks mode
      backgroundCSS = generateSolidBlocksCSS(
        colors,
        parseInt(angle),
        dividerConfig,
      )
    } else {
      // Smooth gradient mode
      const gradientStops = colors
        .map((color, index) => {
          const percent = (index / (colors.length - 1)) * 100
          return `${color} ${percent}%`
        })
        .join(", ")

      backgroundCSS = `linear-gradient(${angle}deg, ${gradientStops})`
    }

    DOM.multiGradientPreview.style.background = backgroundCSS
  }

  function updateDividerControlsVisibility() {
    const mode = getMode()
    DOM.multiColorDividerSettings.style.display =
      mode === "blocks" ? "block" : "none"
  }

  function setMultiControlsExpanded(isOpen) {
    DOM.multiColorSettingsBody.style.display = isOpen ? "block" : "none"
    DOM.multiColorToggleBtn.setAttribute("aria-expanded", String(isOpen))
    DOM.multiColorToggleLabel.textContent = t(
      isOpen ? "settings_multi_color_close" : "settings_multi_color_open",
      isOpen ? "Hide Controls" : "Show Controls",
    )
  }

  function hexToRgba(hex, alpha) {
    const normalized = hex.replace("#", "")
    const safeHex =
      normalized.length === 3
        ? normalized
            .split("")
            .map((ch) => ch + ch)
            .join("")
        : normalized
    const value = parseInt(safeHex, 16)
    const r = (value >> 16) & 255
    const g = (value >> 8) & 255
    const b = value & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  function getDividerConfig() {
    return {
      enabled: Boolean(DOM.multiColorDividersToggle.checked),
      color: DOM.multiColorLineColor.value,
      width: parseFloat(DOM.multiColorLineWidth.value),
    }
  }

  // Generate solid blocks CSS (equal color blocks with sharp transitions)
  function generateSolidBlocksCSS(colors, angle, dividerConfig) {
    const blockCount = colors.length
    const gradientItems = []
    const showDividers = dividerConfig?.enabled && blockCount > 1

    if (!showDividers) {
      // Create equal-width color blocks
      for (let i = 0; i < blockCount; i++) {
        const percent = (100 / blockCount) * i
        const nextPercent = (100 / blockCount) * (i + 1)

        gradientItems.push(`${colors[i]} ${percent}%`)
        gradientItems.push(`${colors[i]} ${nextPercent}%`)
      }

      return `linear-gradient(${angle}deg, ${gradientItems.join(", ")})`
    }

    const segmentSize = 100 / blockCount
    const rawLineWidth = dividerConfig.width
    const lineWidth = Math.min(Math.max(rawLineWidth, 0.1), segmentSize * 0.6)
    const halfLine = lineWidth / 2
    const dividerColor = hexToRgba(dividerConfig.color, 0.6)

    for (let i = 0; i < blockCount; i++) {
      const segmentStart = segmentSize * i
      const segmentEnd = segmentSize * (i + 1)
      const colorStart = i === 0 ? segmentStart : segmentStart + halfLine
      const colorEnd = i === blockCount - 1 ? segmentEnd : segmentEnd - halfLine

      gradientItems.push(`${colors[i]} ${colorStart}%`)
      gradientItems.push(`${colors[i]} ${colorEnd}%`)

      if (i < blockCount - 1) {
        const dividerStart = segmentEnd - halfLine
        const dividerEnd = segmentEnd + halfLine
        gradientItems.push(`${dividerColor} ${dividerStart}%`)
        gradientItems.push(`${dividerColor} ${dividerEnd}%`)
      }
    }

    return `linear-gradient(${angle}deg, ${gradientItems.join(", ")})`
  }

  // Generate random colors
  function generateRandomColors() {
    const count = parseInt(DOM.multiColorCountSelect.value)
    const colors = []
    const randomAngle = Math.floor(Math.random() * 361)

    for (let i = 0; i < count; i++) {
      const randomColor = `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")
        .toUpperCase()}`
      colors.push(randomColor)
    }

    DOM.multiGradientAngleInput.value = randomAngle
    DOM.multiGradientAngleValue.textContent = randomAngle
    updateSetting("multiGradientAngle", randomAngle)

    // Update the color pickers with random colors
    generateColorPickers(count)
    const pickers = Array.from(document.querySelectorAll(".multi-color-picker"))
    pickers.forEach((picker, index) => {
      picker.value = colors[index]
    })

    saveSettings()
    updateMultiColorPreview()
  }

  // Mode radio button change listener
  DOM.multiColorModeRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      updateSetting("multiColorMode", getMode())
      updateDividerControlsVisibility()
      saveSettings()
      updateMultiColorPreview()
    })
  })

  DOM.multiColorToggleBtn.addEventListener("click", () => {
    const nextIsOpen = DOM.multiColorSettingsBody.style.display === "none"
    setMultiControlsExpanded(nextIsOpen)
    updateSetting("multiColorControlsOpen", nextIsOpen)
    saveSettings()
  })

  DOM.multiColorDividersToggle.addEventListener("change", () => {
    updateSetting("multiColorDividers", DOM.multiColorDividersToggle.checked)
    saveSettings()
    updateMultiColorPreview()
  })

  DOM.multiColorLineColor.addEventListener("input", () => {
    updateSetting("multiColorDividerColor", DOM.multiColorLineColor.value)
    saveSettings()
    updateMultiColorPreview()
  })

  DOM.multiColorLineWidth.addEventListener("input", () => {
    const width = parseFloat(DOM.multiColorLineWidth.value)
    DOM.multiColorLineWidthValue.textContent = width.toFixed(1)
    updateSetting("multiColorDividerWidth", width)
    saveSettings()
    updateMultiColorPreview()
  })

  // Random colors button
  DOM.randomMultiColorBtn.addEventListener("click", () => {
    generateRandomColors()
  })

  // Render saved multi-color presets
  function renderSavedPresets() {
    DOM.savedMultiColorPresets.innerHTML = ""
    const settings = getSettings()
    if (Array.isArray(settings.userGradients)) {
      settings.userGradients.forEach((preset, index) => {
        // Only render multi-color presets
        if (preset.type !== "multi-color") return

        const item = document.createElement("div")
        item.className = "user-gradient-item"
        item.style.cursor = "pointer"
        item.title = `${preset.mode === "blocks" ? "Blocks" : "Gradient"} - ${preset.gradientStops.length} colors`

        // Generate preview CSS
        if (preset.mode === "blocks") {
          item.style.background = generateSolidBlocksCSS(
            preset.gradientStops,
            preset.angle,
            {
              enabled:
                preset.showDividers === undefined ? true : preset.showDividers,
              color: preset.dividerColor || "#FFFFFF",
              width: preset.dividerWidth || 1.2,
            },
          )
        } else {
          const gradientStops = preset.gradientStops
            .map((color, idx) => {
              const percent = (idx / (preset.gradientStops.length - 1)) * 100
              return `${color} ${percent}%`
            })
            .join(", ")
          item.style.background = `linear-gradient(${preset.angle}deg, ${gradientStops})`
        }

        // Click to apply
        item.addEventListener("click", () => {
          // Update color pickers
          generateColorPickers(preset.gradientStops.length)
          const pickers = Array.from(
            document.querySelectorAll(".multi-color-picker"),
          )
          pickers.forEach((picker, idx) => {
            picker.value = preset.gradientStops[idx]
          })

          // Update mode
          DOM.multiGradientAngleInput.value = preset.angle
          DOM.multiGradientAngleValue.textContent = preset.angle
          Array.from(DOM.multiColorModeRadios).forEach((radio) => {
            radio.checked = radio.value === preset.mode
          })
          DOM.multiColorCountSelect.value = preset.gradientStops.length
          DOM.multiColorDividersToggle.checked =
            preset.showDividers === undefined ? true : preset.showDividers
          DOM.multiColorLineColor.value = preset.dividerColor || "#FFFFFF"
          DOM.multiColorLineWidth.value = preset.dividerWidth || 1.2
          DOM.multiColorLineWidthValue.textContent = Number(
            DOM.multiColorLineWidth.value,
          ).toFixed(1)
          updateSetting("multiColorCount", preset.gradientStops.length)
          updateSetting(
            "multiColorDividers",
            DOM.multiColorDividersToggle.checked,
          )
          updateSetting("multiColorDividerColor", DOM.multiColorLineColor.value)
          updateSetting(
            "multiColorDividerWidth",
            parseFloat(DOM.multiColorLineWidth.value),
          )

          updateDividerControlsVisibility()
          updateMultiColorPreview()
          saveSettings()
        })

        // Delete button
        const removeBtn = document.createElement("button")
        removeBtn.className = "remove-bg-btn"
        removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation()
          settings.userGradients.splice(index, 1)
          updateSetting("userGradients", settings.userGradients)
          saveSettings()
          renderSavedPresets()
        })

        item.appendChild(removeBtn)
        DOM.savedMultiColorPresets.appendChild(item)
      })
    }
  }

  // Handle count selector change
  DOM.multiColorCountSelect.addEventListener("change", (e) => {
    const count = parseInt(e.target.value)
    updateSetting("multiColorCount", count)
    generateColorPickers(count)
    updateMultiColorPreview()
    saveSettings()
  })

  // Handle angle change
  DOM.multiGradientAngleInput.addEventListener("input", (e) => {
    const angle = e.target.value
    DOM.multiGradientAngleValue.textContent = angle
    updateSetting("multiGradientAngle", parseInt(angle))
    updateMultiColorPreview()
    saveSettings()
  })

  // Apply split background
  DOM.applyMultiColorBtn.addEventListener("click", () => {
    const pickers = Array.from(document.querySelectorAll(".multi-color-picker"))
    const colors = pickers.map((p) => p.value)
    const angle = DOM.multiGradientAngleInput.value
    const mode = getMode()
    const dividerConfig = getDividerConfig()

    updateSetting("multiColors", colors)
    updateSetting("multiGradientAngle", parseInt(angle))
    updateSetting("multiColorMode", mode)
    updateSetting("multiColorDividers", dividerConfig.enabled)
    updateSetting("multiColorDividerColor", dividerConfig.color)
    updateSetting("multiColorDividerWidth", dividerConfig.width)

    let backgroundCSS

    if (mode === "blocks") {
      backgroundCSS = generateSolidBlocksCSS(
        colors,
        parseInt(angle),
        dividerConfig,
      )
    } else {
      const gradientStops = colors
        .map((color, index) => {
          const percent = (index / (colors.length - 1)) * 100
          return `${color} ${percent}%`
        })
        .join(", ")

      backgroundCSS = `linear-gradient(${angle}deg, ${gradientStops})`
    }

    // Set as background
    updateSetting("background", backgroundCSS)
    saveSettings()

    // Apply changes to the page immediately
    if (applySettings && typeof applySettings === "function") {
      applySettings()
    }

    // Brief visual feedback on button
    const originalText = DOM.applyMultiColorBtn.textContent
    DOM.applyMultiColorBtn.textContent = "✓ Applied"
    setTimeout(() => {
      DOM.applyMultiColorBtn.textContent = originalText
    }, 1500)
  })

  // Save preset
  DOM.saveMultiColorBtn.addEventListener("click", () => {
    const pickers = Array.from(document.querySelectorAll(".multi-color-picker"))
    const colors = pickers.map((p) => p.value)
    const angle = DOM.multiGradientAngleInput.value
    const mode = getMode()
    const dividerConfig = getDividerConfig()

    const settings = getSettings()
    const newPreset = {
      id: `multi-color-${Date.now()}`,
      gradientStops: colors,
      angle: parseInt(angle),
      mode: mode,
      showDividers: dividerConfig.enabled,
      dividerColor: dividerConfig.color,
      dividerWidth: dividerConfig.width,
      type: "multi-color",
    }

    if (!settings.userGradients) {
      settings.userGradients = []
    }

    settings.userGradients.push(newPreset)
    updateSetting("userGradients", settings.userGradients)
    saveSettings()

    // Render the saved presets gallery
    renderSavedPresets()

    // Brief visual feedback on button
    const originalText = DOM.saveMultiColorBtn.textContent
    DOM.saveMultiColorBtn.textContent = "✓ Saved"
    setTimeout(() => {
      DOM.saveMultiColorBtn.textContent = originalText
    }, 1500)
  })

  // Initialize on load
  const settings = getSettings()
  generateColorPickers(settings.multiColorCount || 2)
  DOM.multiGradientAngleInput.value = settings.multiGradientAngle || 135
  DOM.multiGradientAngleValue.textContent = settings.multiGradientAngle || 135
  DOM.multiColorDividersToggle.checked =
    settings.multiColorDividers === undefined
      ? true
      : settings.multiColorDividers
  DOM.multiColorLineColor.value = settings.multiColorDividerColor || "#FFFFFF"
  DOM.multiColorLineWidth.value = settings.multiColorDividerWidth || 1.2
  DOM.multiColorLineWidthValue.textContent = Number(
    DOM.multiColorLineWidth.value,
  ).toFixed(1)

  // Set mode radio buttons
  const modeValue = settings.multiColorMode || "smooth"
  Array.from(DOM.multiColorModeRadios).forEach((radio) => {
    radio.checked = radio.value === modeValue
  })

  setMultiControlsExpanded(settings.multiColorControlsOpen !== false)
  updateDividerControlsVisibility()
  updateMultiColorPreview()
  renderSavedPresets()
}
