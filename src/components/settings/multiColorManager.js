import {
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"
import { geti18n } from "../../services/i18n.js"
import * as DOM from "../../utils/dom.js"

function t(key, fallback) {
  const i18n = geti18n()
  return i18n?.[key] || fallback
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

function clampCount(value) {
  return Math.min(6, Math.max(2, Number(value) || 2))
}

function ensureDividerAngles(count, currentAngles, fallbackAngle) {
  const dividerCount = Math.max(0, clampCount(count) - 1)
  const fallback = Number.isFinite(Number(fallbackAngle))
    ? Number(fallbackAngle)
    : 135
  const source = Array.isArray(currentAngles) ? currentAngles : []

  return Array.from({ length: dividerCount }, (_, index) => {
    const raw = Number(source[index])
    const safe = Number.isFinite(raw) ? raw : fallback
    return Math.round(((safe % 360) + 360) % 360)
  })
}

function generateDividerLayersCSS(
  dividerCount,
  segmentSize,
  dividerConfig,
  lineAngleConfig,
  fallbackAngle,
  type = "linear",
  position = "center",
  radialShape = "circle",
) {
  const rawLineWidth = dividerConfig.width
  const lineWidth = Math.min(Math.max(rawLineWidth, 0.1), segmentSize * 0.6)
  const halfLine = lineWidth / 2
  const dividerColor = hexToRgba(dividerConfig.color, 1)
  const safeAngles = ensureDividerAngles(
    dividerCount + 1,
    lineAngleConfig?.lineAngles,
    fallbackAngle,
  )

  return Array.from({ length: dividerCount }, (_, index) => {
    const pivot = segmentSize * (index + 1)
    const start = Math.max(0, pivot - halfLine)
    const end = Math.min(100, pivot + halfLine)

    if (type === "linear") {
      const dividerAngle = lineAngleConfig?.enabled
        ? safeAngles[index]
        : Number(fallbackAngle)
      return `linear-gradient(${dividerAngle}deg, transparent ${start}%, ${dividerColor} ${start}%, ${dividerColor} ${end}%, transparent ${end}%)`
    } else if (type === "radial") {
      return `radial-gradient(${radialShape} at ${position}, transparent ${start}%, ${dividerColor} ${start}%, ${dividerColor} ${end}%, transparent ${end}%)`
    } else if (type === "conic") {
      const angleInDeg = (pivot / 100) * 360
      const startDeg = angleInDeg - (halfLine / 100) * 360
      const endDeg = angleInDeg + (halfLine / 100) * 360
      return `conic-gradient(from ${fallbackAngle}deg at ${position}, transparent ${startDeg}deg, ${dividerColor} ${startDeg}deg, ${dividerColor} ${endDeg}deg, transparent ${endDeg}deg)`
    }
    return ""
  }).filter(Boolean)
}

function generateSolidBlocksCSS(
  colors,
  angle,
  dividerConfig,
  lineAngleConfig,
  type = "linear",
  position = "center",
  radialShape = "circle",
  repeating = false,
) {
  const blockCount = colors.length
  const gradientItems = []
  const showDividers = dividerConfig?.enabled && blockCount > 1
  const segmentSize = 100 / blockCount

  for (let i = 0; i < blockCount; i++) {
    const segmentStart = segmentSize * i
    const segmentEnd = segmentSize * (i + 1)
    gradientItems.push(`${colors[i]} ${segmentStart}%`)
    gradientItems.push(`${colors[i]} ${segmentEnd}%`)
  }

  const prefix = repeating ? `repeating-${type}-gradient` : `${type}-gradient`
  let typeParams = ""
  if (type === "linear") {
    typeParams = `${angle}deg, `
  } else if (type === "radial") {
    typeParams = `${radialShape} at ${position}, `
  } else if (type === "conic") {
    typeParams = `from ${angle}deg at ${position}, `
  }

  const baseLayer = `${prefix}(${typeParams}${gradientItems.join(", ")})`

  if (!showDividers) {
    return baseLayer
  }

  const dividerLayers = generateDividerLayersCSS(
    blockCount - 1,
    segmentSize,
    dividerConfig,
    lineAngleConfig,
    angle,
    type,
    position,
    radialShape,
  )

  return [...dividerLayers, baseLayer].join(", ")
}

export function renderSavedMultiColors(DOM_REFS) {
  const container =
    DOM_REFS.savedMultiColorPresets ||
    document.getElementById("saved-multi-color-presets")
  if (!container) return
  container.innerHTML = ""
  const settings = getSettings()
  if (Array.isArray(settings.userGradients)) {
    settings.userGradients.forEach((preset, index) => {
      // Only render multi-color presets
      if (preset.type !== "multi-color") return

      const item = document.createElement("div")
      item.className = "user-gradient-item"
      item.dataset.index = index
      item.style.cursor = "pointer"
      item.title = `${preset.mode === "blocks" ? "Blocks" : "Gradient"} - ${preset.gradientStops.length} colors (${preset.multiColorType || "linear"})`

      // Generate preview CSS
      const dividerConfig = {
        enabled: preset.showDividers === undefined ? true : preset.showDividers,
        color: preset.dividerColor || "#FFFFFF",
        width: preset.dividerWidth || 1.2,
      }
      const lineAngleConfig = {
        enabled: Boolean(preset.freeLineAngles),
        lineAngles: Array.isArray(preset.lineAngles) ? preset.lineAngles : [],
      }

      let generatedBg = ""
      if (preset.mode === "blocks") {
        generatedBg = generateSolidBlocksCSS(
          preset.gradientStops,
          preset.angle,
          dividerConfig,
          lineAngleConfig,
          preset.multiColorType || "linear",
          preset.multiColorPosition || "center",
          preset.multiColorRadialShape || "circle",
          preset.multiColorRepeating || false,
        )
      } else {
        const type = preset.multiColorType || "linear"
        const repeating = preset.multiColorRepeating || false
        const position = preset.multiColorPosition || "center"
        const radialShape = preset.multiColorRadialShape || "circle"
        const angle = preset.angle

        const prefix = repeating ? `repeating-${type}-gradient` : `${type}-gradient`
        let typeParams = ""
        if (type === "linear") {
          typeParams = `${angle}deg, `
        } else if (type === "radial") {
          typeParams = `${radialShape} at ${position}, `
        } else if (type === "conic") {
          typeParams = `from ${angle}deg at ${position}, `
        }

        const stops = preset.gradientStops
          .map((color, idx) => {
            const percent = (idx / (preset.gradientStops.length - 1)) * 100
            return `${color} ${percent}%`
          })
          .join(", ")
        generatedBg = `${prefix}(${typeParams}${stops})`
      }
      
      item.style.background = generatedBg
      const currentBg = settings.background || ""
      let isCurrentActive = !settings.svgWaveActive && 
                             (currentBg === generatedBg || 
                              currentBg.replace(/\s/g, "") === generatedBg.replace(/\s/g, ""))
      
      // Fallback: Check if individual parameters match (when background is null but this preset is current)
      if (!isCurrentActive && !settings.background && !settings.svgWaveActive) {
          isCurrentActive = 
            (preset.mode || "gradient") === (settings.multiColorMode || "smooth") &&
            JSON.stringify(preset.gradientStops) === JSON.stringify(settings.multiColors || []) &&
            Number(preset.angle) === Number(settings.multiGradientAngle) &&
            (preset.multiColorType || "linear") === (settings.multiColorType || "linear") &&
            (preset.multiColorRepeating === true) === (settings.multiColorRepeating === true) &&
            (preset.multiColorPosition || "center") === (settings.multiColorPosition || "center") &&
            (preset.multiColorRadialShape || "circle") === (settings.multiColorRadialShape || "circle") &&
            (preset.showDividers === undefined ? true : preset.showDividers) === (settings.multiColorDividers !== false) &&
            (preset.dividerColor || "#FFFFFF") === (settings.multiColorDividerColor || "#FFFFFF") &&
            Number(preset.dividerWidth || 1.2) === Number(settings.multiColorDividerWidth || 1.2) &&
            Boolean(preset.freeLineAngles) === Boolean(settings.multiColorFreeLineAngles) &&
            JSON.stringify(preset.lineAngles || []) === JSON.stringify(settings.multiColorLineAngles || []);
      }
      
      if (isCurrentActive) {
        item.classList.add("active")
      }

      if (preset.isFavorite) {
        const star = document.createElement("i")
        star.className = "fa-solid fa-star favorite-star-badge"
        item.appendChild(star)
      }

      const activeIndicator = document.createElement("div")
      activeIndicator.className = "active-indicator"
      activeIndicator.innerHTML = '<i class="fa-solid fa-check"></i>'
      item.appendChild(activeIndicator)

      item.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        import("../contextMenu.js").then((m) => {
          m.showContextMenu(e.clientX, e.clientY, index, "userMultiColor")
        })
      })

      // Click to apply
      item.addEventListener("click", () => {
        if (typeof multiSelectMode !== "undefined" && multiSelectMode) return
        window.dispatchEvent(
          new CustomEvent("multiColor:applyPreset", { detail: preset }),
        )
      })

      // Delete button
      const removeBtn = document.createElement("button")
      removeBtn.className = "remove-bg-btn"
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
      removeBtn.addEventListener("click", async (e) => {
        e.stopPropagation()
        const { showConfirm } = await import("../../utils/dialog.js")
        if (await showConfirm(t("alert_delete_bg_confirm", "Delete?"))) {
          settings.userGradients.splice(index, 1)
          updateSetting("userGradients", settings.userGradients)
          saveSettings()
          renderSavedMultiColors(DOM_REFS)
        }
      })

      item.appendChild(removeBtn)
      container.appendChild(item)
    })
  }

  const multiSpan = document.getElementById("count-multi-color")
  if (multiSpan) {
    const total = container.querySelectorAll(".user-gradient-item").length
    multiSpan.innerHTML = ` <span style="font-size:0.8rem;opacity:0.6;">(${total})</span>`
  }
}

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
    const activeBtn = Array.from(DOM.multiColorModeBtns).find((btn) =>
      btn.classList.contains("active"),
    )
    return activeBtn ? activeBtn.dataset.mode : "smooth"
  }

  // Update preview gradient or solid blocks
  function updateMultiColorPreview() {
    const pickers = Array.from(document.querySelectorAll(".multi-color-picker"))
    const colors = pickers.map((p) => p.value)
    const angle = DOM.multiGradientAngleInput.value
    const mode = getMode()
    const dividerConfig = getDividerConfig()
    const lineAngleConfig = getLineAngleConfig()

    const type = DOM.multiColorTypeSelect.value
    const repeating = DOM.multiColorRepeatingToggle.checked
    const position = DOM.multiColorPositionSelect.value
    const radialShape = DOM.multiColorRadialShapeSelect.value

    let backgroundCSS

    if (mode === "blocks") {
      // Solid color blocks mode
      backgroundCSS = generateSolidBlocksCSS(
        colors,
        parseInt(angle),
        dividerConfig,
        lineAngleConfig,
        type,
        position,
        radialShape,
        repeating,
      )
    } else {
      // Smooth gradient mode
      const prefix = repeating ? `repeating-${type}-gradient` : `${type}-gradient`
      let typeParams = ""
      if (type === "linear") {
        typeParams = `${angle}deg, `
      } else if (type === "radial") {
        typeParams = `${radialShape} at ${position}, `
      } else if (type === "conic") {
        typeParams = `from ${angle}deg at ${position}, `
      }

      const gradientStops = colors
        .map((color, index) => {
          const percent = (index / (colors.length - 1)) * 100
          return `${color} ${percent}%`
        })
        .join(", ")

      backgroundCSS = `${prefix}(${typeParams}${gradientStops})`
    }

    DOM.multiGradientPreview.style.background = backgroundCSS
  }

  function updateTypeControlsVisibility() {
    const type = DOM.multiColorTypeSelect.value
    DOM.multiColorRadialConicControls.style.display =
      type === "radial" || type === "conic" ? "grid" : "none"
    DOM.multiColorRadialShapeGroup.style.display =
      type === "radial" ? "block" : "none"

    // Hide angle for radial
    const angleGroup = DOM.multiGradientAngleInput.closest("div")
    if (angleGroup) {
      angleGroup.style.display = type === "radial" ? "none" : "block"
    }

    // Line angles only make sense for linear blocks
    updateLineAngleControlsVisibility()
  }

  function updateDividerControlsVisibility() {
    const mode = getMode()
    DOM.multiColorDividerSettings.style.display =
      mode === "blocks" ? "block" : "none"
    updateLineAngleControlsVisibility()
  }

  function updateLineAngleControlsVisibility() {
    if (!DOM.multiColorLineAnglesContainer) return

    const type = DOM.multiColorTypeSelect.value
    const showLineAngles =
      getMode() === "blocks" &&
      type === "linear" &&
      DOM.multiColorDividersToggle.checked &&
      DOM.multiColorFreeLineAngles?.checked

    DOM.multiColorLineAnglesContainer.style.display = showLineAngles
      ? "flex"
      : "none"
  }

  function setMultiControlsExpanded(isOpen) {
    DOM.multiColorSettingsBody.style.display = isOpen ? "block" : "none"
    DOM.multiColorToggleBtn.setAttribute("aria-expanded", String(isOpen))
    DOM.multiColorToggleLabel.textContent = t(
      isOpen ? "settings_multi_color_close" : "settings_multi_color_open",
      isOpen ? "Hide Controls" : "Show Controls",
    )
  }

  function getDividerConfig() {
    return {
      enabled: Boolean(DOM.multiColorDividersToggle.checked),
      color: DOM.multiColorLineColor.value,
      width: parseFloat(DOM.multiColorLineWidth.value),
    }
  }

  function getLineAngleConfig() {
    const freeAnglesEnabled = Boolean(DOM.multiColorFreeLineAngles?.checked)
    if (!freeAnglesEnabled) {
      return {
        enabled: false,
        lineAngles: [],
      }
    }

    const angleInputs = Array.from(
      DOM.multiColorLineAnglesContainer?.querySelectorAll(
        ".multi-color-line-angle-input",
      ) || [],
    )

    return {
      enabled: true,
      lineAngles: ensureDividerAngles(
        DOM.multiColorCountSelect.value,
        angleInputs.map((input) => Number(input.value)),
        DOM.multiGradientAngleInput.value,
      ),
    }
  }

  function generateLineAngleControls(count, sourceAngles) {
    const container = DOM.multiColorLineAnglesContainer
    if (!container) return

    const dividerCount = Math.max(0, clampCount(count) - 1)
    const fallbackAngle = Number(DOM.multiGradientAngleInput.value || 135)
    const safeAngles = ensureDividerAngles(
      dividerCount + 1,
      sourceAngles,
      fallbackAngle,
    )

    container.innerHTML = ""

    if (dividerCount === 0) {
      updateSetting("multiColorLineAngles", [])
      saveSettings()
      return
    }

    safeAngles.forEach((angleValue, index) => {
      const wrapper = document.createElement("div")
      wrapper.style.display = "flex"
      wrapper.style.flexDirection = "column"
      wrapper.style.gap = "4px"

      const label = document.createElement("label")
      label.style.fontSize = "0.85rem"
      label.textContent = `${t("settings_multi_color_line_angle", "Line Angle")} ${index + 1}: ${angleValue}deg`

      const slider = document.createElement("input")
      slider.type = "range"
      slider.className = "multi-color-line-angle-input"
      slider.dataset.index = String(index)
      slider.min = "0"
      slider.max = "360"
      slider.step = "1"
      slider.value = String(angleValue)
      slider.style.width = "100%"

      slider.addEventListener("input", () => {
        const value = Number(slider.value)
        label.textContent = `${t("settings_multi_color_line_angle", "Line Angle")} ${index + 1}: ${value}deg`
        updateSetting("multiColorLineAngles", getLineAngleConfig().lineAngles)
        saveSettings()
        updateMultiColorPreview()
      })

      wrapper.appendChild(label)
      wrapper.appendChild(slider)
      container.appendChild(wrapper)
    })

    updateSetting("multiColorLineAngles", safeAngles)
    saveSettings()
  }

  function hslToHex(h, s, l) {
    const hue = ((h % 360) + 360) % 360
    const sat = Math.min(100, Math.max(0, s)) / 100
    const light = Math.min(100, Math.max(0, l)) / 100

    const c = (1 - Math.abs(2 * light - 1)) * sat
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
    const m = light - c / 2

    let r = 0
    let g = 0
    let b = 0

    if (hue < 60) {
      r = c
      g = x
    } else if (hue < 120) {
      r = x
      g = c
    } else if (hue < 180) {
      g = c
      b = x
    } else if (hue < 240) {
      g = x
      b = c
    } else if (hue < 300) {
      r = x
      b = c
    } else {
      r = c
      b = x
    }

    const toHex = (channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, "0")
        .toUpperCase()

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  function getRandomHexColor() {
    return `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
      .toUpperCase()}`
  }

  function generateHueColors(count) {
    const safeCount = clampCount(count)
    const baseHue = Math.floor(Math.random() * 360)
    const saturation = 68 + Math.floor(Math.random() * 22)
    const lightnessBase = 45 + Math.floor(Math.random() * 16)
    const hueStep = 360 / safeCount

    return Array.from({ length: safeCount }, (_, index) => {
      const jitter = Math.floor(Math.random() * 12) - 6
      const hue = baseHue + hueStep * index + jitter
      const lightness = Math.min(
        72,
        Math.max(34, lightnessBase + (Math.floor(Math.random() * 10) - 5)),
      )
      return hslToHex(hue, saturation, lightness)
    })
  }

  function generateCrazyColors(count) {
    const safeCount = clampCount(count)
    return Array.from({ length: safeCount }, () => getRandomHexColor())
  }

  function applyRandomizedColors(colors) {
    const count = clampCount(colors.length)
    const randomAngle = Math.floor(Math.random() * 361)

    updateSetting("multiColorCount", count)
    DOM.multiColorCountSelect.value = String(count)

    generateColorPickers(count)
    generateLineAngleControls(count, getSettings().multiColorLineAngles)
    const pickers = Array.from(document.querySelectorAll(".multi-color-picker"))
    pickers.forEach((picker, index) => {
      picker.value = colors[index]
    })

    DOM.multiGradientAngleInput.value = randomAngle
    DOM.multiGradientAngleValue.textContent = randomAngle
    updateSetting("multiGradientAngle", randomAngle)

    saveSettings()
    updateMultiColorPreview()
  }

  // Event Listeners
  DOM.multiColorTypeSelect.addEventListener("change", () => {
    updateSetting("multiColorType", DOM.multiColorTypeSelect.value)
    updateTypeControlsVisibility()
    saveSettings()
    updateMultiColorPreview()
  })

  DOM.multiColorRepeatingToggle.addEventListener("change", () => {
    updateSetting("multiColorRepeating", DOM.multiColorRepeatingToggle.checked)
    saveSettings()
    updateMultiColorPreview()
  })

  DOM.multiColorPositionSelect.addEventListener("change", () => {
    updateSetting("multiColorPosition", DOM.multiColorPositionSelect.value)
    saveSettings()
    updateMultiColorPreview()
  })

  DOM.multiColorRadialShapeSelect.addEventListener("change", () => {
    updateSetting("multiColorRadialShape", DOM.multiColorRadialShapeSelect.value)
    saveSettings()
    updateMultiColorPreview()
  })

  DOM.multiColorModeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      DOM.multiColorModeBtns.forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")
      updateSetting("multiColorMode", btn.dataset.mode)
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
    updateLineAngleControlsVisibility()
    updateMultiColorPreview()
  })

  DOM.multiColorFreeLineAngles?.addEventListener("change", () => {
    const isEnabled = DOM.multiColorFreeLineAngles.checked
    updateSetting("multiColorFreeLineAngles", isEnabled)

    if (isEnabled) {
      generateLineAngleControls(
        DOM.multiColorCountSelect.value,
        getSettings().multiColorLineAngles,
      )
    }

    updateLineAngleControlsVisibility()
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

  DOM.randomMultiColorHueBtn?.addEventListener("click", () => {
    const count = clampCount(DOM.multiColorCountSelect.value)
    applyRandomizedColors(generateHueColors(count))
  })

  DOM.randomMultiColorCrazyBtn?.addEventListener("click", () => {
    const count = clampCount(DOM.multiColorCountSelect.value)
    applyRandomizedColors(generateCrazyColors(count))
  })

  let multiColorSelectMode = false
  let multiColorSelectedIndices = new Set()

  function setupMultiSelect() {
    const updateMultiColorSelectCount = () => {
      DOM.multiColorSelectCount.textContent = `${multiColorSelectedIndices.size} selected`
      DOM.multiColorDeleteSelectedBtn.disabled =
        multiColorSelectedIndices.size === 0
    }

    const enterMultiColorSelectMode = () => {
      multiColorSelectMode = true
      multiColorSelectedIndices.clear()
      DOM.savedMultiColorPresets.classList.add("bg-select-mode")
      DOM.multiColorSelectToolbar.style.display = "flex"
      DOM.multiColorSelectModeBtn.style.display = "none"
      updateMultiColorSelectCount()
    }

    const exitMultiColorSelectMode = () => {
      multiColorSelectMode = false
      multiColorSelectedIndices.clear()
      DOM.savedMultiColorPresets.classList.remove("bg-select-mode")
      DOM.multiColorSelectToolbar.style.display = "none"
      DOM.multiColorSelectModeBtn.style.display = "block"
      DOM.savedMultiColorPresets
        .querySelectorAll(".user-gradient-item")
        .forEach((el) => el.classList.remove("bg-selected"))
    }

    DOM.multiColorSelectModeBtn.addEventListener("click", () => {
      if (multiColorSelectMode) exitMultiColorSelectMode()
      else enterMultiColorSelectMode()
    })

    DOM.multiColorSelectCancelBtn.addEventListener(
      "click",
      exitMultiColorSelectMode,
    )

    DOM.multiColorSelectAllBtn.addEventListener("click", () => {
      const settings = getSettings()
      const allGradients = settings.userGradients || []
      const multiColorIndices = allGradients
        .map((g, i) => ({ g, i }))
        .filter((item) => item.g.type === "multi-color")
        .map((item) => item.i)

      if (multiColorSelectedIndices.size === multiColorIndices.length) {
        multiColorSelectedIndices.clear()
        DOM.savedMultiColorPresets
          .querySelectorAll(".user-gradient-item")
          .forEach((el) => el.classList.remove("bg-selected"))
      } else {
        multiColorIndices.forEach((i) => multiColorSelectedIndices.add(i))
        DOM.savedMultiColorPresets
          .querySelectorAll(".user-gradient-item")
          .forEach((el) => el.classList.add("bg-selected"))
      }
      updateMultiColorSelectCount()
    })

    DOM.multiColorDeleteSelectedBtn.addEventListener("click", async () => {
      if (multiColorSelectedIndices.size === 0) return
      const { showConfirm } = await import("../../utils/dialog.js")
      const confirmed = await showConfirm(
        `${t("alert_delete_bg_confirm", "Delete selected?")} (${multiColorSelectedIndices.size})`,
      )
      if (!confirmed) return

      const settings = getSettings()
      const sortedIndices = Array.from(multiColorSelectedIndices).sort(
        (a, b) => b - a,
      )
      sortedIndices.forEach((index) => {
        settings.userGradients.splice(index, 1)
      })

      saveSettings()
      exitMultiColorSelectMode()
      renderSavedMultiColors(DOM)
    })

    DOM.savedMultiColorPresets.addEventListener("click", (e) => {
      if (!multiColorSelectMode) return
      const item = e.target.closest(".user-gradient-item")
      if (!item) return

      const index = parseInt(item.dataset.index)
      if (multiColorSelectedIndices.has(index)) {
        multiColorSelectedIndices.delete(index)
        item.classList.remove("bg-selected")
      } else {
        multiColorSelectedIndices.add(index)
        item.classList.add("bg-selected")
      }
      updateMultiColorSelectCount()
    })
  }

  setupMultiSelect()

  // Handle count selector change
  DOM.multiColorCountSelect.addEventListener("change", (e) => {
    const count = clampCount(e.target.value)
    DOM.multiColorCountSelect.value = String(count)
    updateSetting("multiColorCount", count)
    generateColorPickers(count)
    generateLineAngleControls(count, getSettings().multiColorLineAngles)
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
    const lineAngleConfig = getLineAngleConfig()

    const type = DOM.multiColorTypeSelect.value
    const repeating = DOM.multiColorRepeatingToggle.checked
    const position = DOM.multiColorPositionSelect.value
    const radialShape = DOM.multiColorRadialShapeSelect.value

    updateSetting("multiColors", colors)
    updateSetting("multiGradientAngle", parseInt(angle))
    updateSetting("multiColorMode", mode)
    updateSetting("multiColorDividers", dividerConfig.enabled)
    updateSetting("multiColorDividerColor", dividerConfig.color)
    updateSetting("multiColorDividerWidth", dividerConfig.width)
    updateSetting("multiColorFreeLineAngles", lineAngleConfig.enabled)
    updateSetting("multiColorLineAngles", lineAngleConfig.lineAngles)
    updateSetting("multiColorType", type)
    updateSetting("multiColorRepeating", repeating)
    updateSetting("multiColorPosition", position)
    updateSetting("multiColorRadialShape", radialShape)

    let backgroundCSS

    if (mode === "blocks") {
      backgroundCSS = generateSolidBlocksCSS(
        colors,
        parseInt(angle),
        dividerConfig,
        lineAngleConfig,
        type,
        position,
        radialShape,
        repeating,
      )
    } else {
      const prefix = repeating ? `repeating-${type}-gradient` : `${type}-gradient`
      let typeParams = ""
      if (type === "linear") {
        typeParams = `${angle}deg, `
      } else if (type === "radial") {
        typeParams = `${radialShape} at ${position}, `
      } else if (type === "conic") {
        typeParams = `from ${angle}deg at ${position}, `
      }

      const gradientStops = colors
        .map((color, index) => {
          const percent = (index / (colors.length - 1)) * 100
          return `${color} ${percent}%`
        })
        .join(", ")

      backgroundCSS = `${prefix}(${typeParams}${gradientStops})`
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
    const lineAngleConfig = getLineAngleConfig()

    const type = DOM.multiColorTypeSelect.value
    const repeating = DOM.multiColorRepeatingToggle.checked
    const position = DOM.multiColorPositionSelect.value
    const radialShape = DOM.multiColorRadialShapeSelect.value

    const settings = getSettings()
    const newPreset = {
      id: `multi-color-${Date.now()}`,
      gradientStops: colors,
      angle: parseInt(angle),
      mode: mode,
      showDividers: dividerConfig.enabled,
      dividerColor: dividerConfig.color,
      dividerWidth: dividerConfig.width,
      freeLineAngles: lineAngleConfig.enabled,
      lineAngles: lineAngleConfig.lineAngles,
      type: "multi-color",
      multiColorType: type,
      multiColorRepeating: repeating,
      multiColorPosition: position,
      multiColorRadialShape: radialShape,
    }

    if (!settings.userGradients) {
      settings.userGradients = []
    }

    settings.userGradients.push(newPreset)
    updateSetting("userGradients", settings.userGradients)
    saveSettings()

    // Render the saved presets gallery
    renderSavedMultiColors(DOM)

    // Brief visual feedback on button
    const originalText = DOM.saveMultiColorBtn.textContent
    DOM.saveMultiColorBtn.textContent = "✓ Saved"
    setTimeout(() => {
      DOM.saveMultiColorBtn.textContent = originalText
    }, 1500)
  })

  function syncFromSettings() {
    const settings = getSettings()
    const initialCount = clampCount(settings.multiColorCount)
    DOM.multiColorCountSelect.value = String(initialCount)
    generateColorPickers(initialCount)

    const persistedColors = Array.isArray(settings.multiColors)
      ? settings.multiColors
      : []
    const pickers = Array.from(document.querySelectorAll(".multi-color-picker"))
    pickers.forEach((picker, index) => {
      picker.value = persistedColors[index] || picker.value
    })

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
    DOM.multiColorFreeLineAngles.checked = Boolean(
      settings.multiColorFreeLineAngles,
    )
    generateLineAngleControls(initialCount, settings.multiColorLineAngles)

    DOM.multiColorTypeSelect.value = settings.multiColorType || "linear"
    DOM.multiColorRepeatingToggle.checked = Boolean(
      settings.multiColorRepeating,
    )
    DOM.multiColorPositionSelect.value = settings.multiColorPosition || "center"
    DOM.multiColorRadialShapeSelect.value =
      settings.multiColorRadialShape || "circle"

    const modeValue = settings.multiColorMode || "smooth"
    DOM.multiColorModeBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === modeValue)
    })

    setMultiControlsExpanded(settings.multiColorControlsOpen !== false)
    updateDividerControlsVisibility()
    updateTypeControlsVisibility()
    updateMultiColorPreview()
    renderSavedMultiColors(DOM)
  }

  window.addEventListener("multiColor:applyPreset", (e) => {
    const preset = e.detail
    // Update color pickers
    generateColorPickers(preset.gradientStops.length)
    const pickers = Array.from(document.querySelectorAll(".multi-color-picker"))
    pickers.forEach((picker, idx) => {
      picker.value = preset.gradientStops[idx]
    })

    // Update mode
    DOM.multiGradientAngleInput.value = preset.angle
    DOM.multiGradientAngleValue.textContent = preset.angle
    DOM.multiColorModeBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === preset.mode)
    })
    DOM.multiColorCountSelect.value = String(
      clampCount(preset.gradientStops.length),
    )
    DOM.multiColorDividersToggle.checked =
      preset.showDividers === undefined ? true : preset.showDividers
    DOM.multiColorLineColor.value = preset.dividerColor || "#FFFFFF"
    DOM.multiColorLineWidth.value = preset.dividerWidth || 1.2
    DOM.multiColorLineWidthValue.textContent = Number(
      DOM.multiColorLineWidth.value,
    ).toFixed(1)
    DOM.multiColorFreeLineAngles.checked = Boolean(preset.freeLineAngles)
    generateLineAngleControls(
      preset.gradientStops.length,
      Array.isArray(preset.lineAngles) ? preset.lineAngles : [],
    )

    DOM.multiColorTypeSelect.value = preset.multiColorType || "linear"
    DOM.multiColorRepeatingToggle.checked = Boolean(preset.multiColorRepeating)
    DOM.multiColorPositionSelect.value = preset.multiColorPosition || "center"
    DOM.multiColorRadialShapeSelect.value =
      preset.multiColorRadialShape || "circle"

    updateSetting("multiColorCount", preset.gradientStops.length)
    updateSetting("multiColorDividers", DOM.multiColorDividersToggle.checked)
    updateSetting("multiColorDividerColor", DOM.multiColorLineColor.value)
    updateSetting(
      "multiColorDividerWidth",
      parseFloat(DOM.multiColorLineWidth.value),
    )
    updateSetting(
      "multiColorFreeLineAngles",
      DOM.multiColorFreeLineAngles.checked,
    )
    updateSetting(
      "multiColorLineAngles",
      ensureDividerAngles(
        preset.gradientStops.length,
        preset.lineAngles,
        preset.angle,
      ),
    )
    updateSetting("multiColorType", DOM.multiColorTypeSelect.value)
    updateSetting("multiColorRepeating", DOM.multiColorRepeatingToggle.checked)
    updateSetting("multiColorPosition", DOM.multiColorPositionSelect.value)
    updateSetting("multiColorRadialShape", DOM.multiColorRadialShapeSelect.value)

    updateDividerControlsVisibility()
    updateTypeControlsVisibility()
    updateMultiColorPreview()
    
    // Custom active state logic for multi-color
    updateSetting("svgWaveActive", false)
    saveSettings()
    if (window.appApplySettings) window.appApplySettings()
    
    renderSavedMultiColors(DOM)
  })

  window.addEventListener("multiColor:sync", syncFromSettings)

  // Initialize on load
  syncFromSettings()
}

