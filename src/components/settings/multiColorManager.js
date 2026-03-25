import {
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"
import * as DOM from "../../utils/dom.js"

export function setupMultiColorManager(applySettings) {
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
      label.textContent = `Color ${i + 1}:`
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

    let backgroundCSS

    if (mode === "blocks") {
      // Solid color blocks mode
      backgroundCSS = generateSolidBlocksCSS(
        colors,
        parseInt(angle),
        DOM.enableDividerLines.checked,
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

  // Generate solid blocks CSS with optional divider lines
  function generateSolidBlocksCSS(colors, angle, showDividers) {
    const blockCount = colors.length
    let gradientItems = []

    // Calculate angle for direction (convert degree to x,y offset)
    const angleRad = (angle * Math.PI) / 180
    const dirX = Math.cos(angleRad)
    const dirY = Math.sin(angleRad)

    // Use repeating-linear-gradient with equal color blocks
    for (let i = 0; i < blockCount; i++) {
      const percent = (100 / blockCount) * i
      const nextPercent = (100 / blockCount) * (i + 1)

      // Add solid color block
      gradientItems.push(`${colors[i]} ${percent}%`)
      gradientItems.push(`${colors[i]} ${nextPercent}%`)

      // Add divider line between colors (if not the last one and dividers enabled)
      if (i < blockCount - 1 && showDividers) {
        const dividerColor = DOM.dividerLineColor.value || "#FFFFFF"
        const dividerWidth = parseFloat(DOM.dividerLineWidthInput.value) || 2
        // Calculate divider position (tiny gap between blocks)
        const dividerPercent = nextPercent
        gradientItems[gradientItems.length - 1] =
          `${colors[i]} ${dividerPercent - dividerWidth * 0.1}%`
        gradientItems.push(
          `${dividerColor} ${dividerPercent - dividerWidth * 0.1}%`,
        )
        gradientItems.push(
          `${dividerColor} ${dividerPercent + dividerWidth * 0.1}%`,
        )
      }
    }

    return `linear-gradient(${angle}deg, ${gradientItems.join(", ")})`
  }

  // Mode radio button change listener
  DOM.multiColorModeRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      updateSetting("multiColorMode", getMode())
      saveSettings()
      updateMultiColorPreview()
      // Show/hide divider controls based on mode
      const mode = getMode()
      if (DOM.dividerControls) {
        DOM.dividerControls.style.display = mode === "blocks" ? "block" : "none"
      }
    })
  })

  // Divider controls change listeners
  if (DOM.enableDividerLines) {
    DOM.enableDividerLines.addEventListener("change", () => {
      updateSetting("enableDividerLines", DOM.enableDividerLines.checked)
      saveSettings()
      updateMultiColorPreview()
    })
  }

  if (DOM.dividerLineColor) {
    DOM.dividerLineColor.addEventListener("input", () => {
      updateSetting("dividerLineColor", DOM.dividerLineColor.value)
      saveSettings()
      updateMultiColorPreview()
    })
  }

  if (DOM.dividerLineWidthInput) {
    DOM.dividerLineWidthInput.addEventListener("input", (e) => {
      DOM.dividerLineWidthValue.textContent = e.target.value
      updateSetting("dividerLineWidth", parseFloat(e.target.value))
      saveSettings()
      updateMultiColorPreview()
    })
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

    updateSetting("multiColors", colors)
    updateSetting("multiGradientAngle", parseInt(angle))
    updateSetting("multiColorMode", mode)

    let backgroundCSS

    if (mode === "blocks") {
      backgroundCSS = generateSolidBlocksCSS(
        colors,
        parseInt(angle),
        DOM.enableDividerLines.checked,
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

    const settings = getSettings()
    const newPreset = {
      id: `multi-color-${Date.now()}`,
      gradientStops: colors,
      angle: parseInt(angle),
      mode: mode,
      dividersEnabled: DOM.enableDividerLines.checked,
      dividerColor: DOM.dividerLineColor.value,
      dividerWidth: parseFloat(DOM.dividerLineWidthInput.value),
      type: "multi-color",
    }

    if (!settings.userGradients) {
      settings.userGradients = []
    }

    settings.userGradients.push(newPreset)
    updateSetting("userGradients", settings.userGradients)
    saveSettings()

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

  // Set mode radio buttons
  const modeValue = settings.multiColorMode || "smooth"
  Array.from(DOM.multiColorModeRadios).forEach((radio) => {
    radio.checked = radio.value === modeValue
  })

  // Initialize divider controls
  if (DOM.enableDividerLines) {
    DOM.enableDividerLines.checked = settings.enableDividerLines || false
  }
  if (DOM.dividerLineColor) {
    DOM.dividerLineColor.value = settings.dividerLineColor || "#FFFFFF"
  }
  if (DOM.dividerLineWidthInput) {
    DOM.dividerLineWidthInput.value = settings.dividerLineWidth || 2
    if (DOM.dividerLineWidthValue) {
      DOM.dividerLineWidthValue.textContent = settings.dividerLineWidth || 2
    }
  }

  // Show/hide divider controls based on saved mode
  if (DOM.dividerControls) {
    DOM.dividerControls.style.display =
      modeValue === "blocks" ? "block" : "none"
  }

  updateMultiColorPreview()
}
