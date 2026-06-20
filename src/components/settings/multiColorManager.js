import {
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"
import { geti18n } from "../../services/i18n.js"
import * as DOM from "../../utils/dom.js"
import { showAlert } from "../../utils/dialog.js"

let multiColorSelectMode = false
let multiColorSelectedIndices = new Set()

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

export function buildMultiColorCss(params) {
  const {
    colors,
    angle,
    mode,
    type = "linear",
    repeating = false,
    position = "center",
    radialShape = "circle",
    dividerConfig,
    lineAngleConfig,
  } = params

  if (mode === "blocks") {
    return generateSolidBlocksCSS(
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

    return `${prefix}(${typeParams}${gradientStops})`
  }
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
      item.className = "user-gradient-item local-bg-item"
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

        const prefix = repeating
          ? `repeating-${type}-gradient`
          : `${type}-gradient`
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
      item.dataset.uid = preset.uid || ""
      const currentBg = settings.background || ""
      const activeBgUid = settings.activeBgUid

      let isCurrentActive = false

      if (activeBgUid && preset.uid) {
          isCurrentActive = activeBgUid === preset.uid
      } else {
          isCurrentActive =
            !settings.svgWaveActive &&
            !settings.gradientV2Active &&
            !settings.silkActive &&
            !settings.lightPillarActive &&
            (currentBg === generatedBg ||
              currentBg.replace(/\s/g, "") === generatedBg.replace(/\s/g, ""))
      }

      // Fallback: Check if individual parameters match (when background is null and no UID match)
      if (
        !isCurrentActive &&
        !settings.background &&
        !activeBgUid &&
        !settings.svgWaveActive &&
        !settings.gradientV2Active &&
        !settings.silkActive &&
        !settings.lightPillarActive
      ) {
        isCurrentActive =
          (preset.mode || "gradient") ===
            (settings.multiColorMode || "smooth") &&
          JSON.stringify(preset.gradientStops) ===
            JSON.stringify(settings.multiColors || []) &&
          Number(preset.angle) === Number(settings.multiGradientAngle) &&
          (preset.multiColorType || "linear") ===
            (settings.multiColorType || "linear") &&
          (preset.multiColorRepeating === true) ===
            (settings.multiColorRepeating === true) &&
          (preset.multiColorPosition || "center") ===
            (settings.multiColorPosition || "center") &&
          (preset.multiColorRadialShape || "circle") ===
            (settings.multiColorRadialShape || "circle") &&
          (preset.showDividers === undefined ? true : preset.showDividers) ===
            (settings.multiColorDividers !== false) &&
          (preset.dividerColor || "#FFFFFF") ===
            (settings.multiColorDividerColor || "#FFFFFF") &&
          Number(preset.dividerWidth || 1.2) ===
            Number(settings.multiColorDividerWidth || 1.2) &&
          Boolean(preset.freeLineAngles) ===
            Boolean(settings.multiColorFreeLineAngles) &&
          JSON.stringify(preset.lineAngles || []) ===
            JSON.stringify(settings.multiColorLineAngles || [])
      }

      if (isCurrentActive) {
        item.classList.add("active")
      }

      if (preset.isFavorite) {
        const star = document.createElement("i")
        star.className = "fa-solid fa-star favorite-star-badge"
        item.appendChild(star)
      }

      const isSelected = multiColorSelectedIndices.has(index)
      if (isSelected) {
        item.classList.add("selected")
      }
      
      const checkBadge = document.createElement("div")
      checkBadge.className = `bg-item-checkbox ${isSelected ? "checked" : ""}`
      checkBadge.innerHTML = '<i class="fa-solid fa-check"></i>'
      item.appendChild(checkBadge)

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

      item.addEventListener("click", (e) => {
        if (typeof multiColorSelectMode !== "undefined" && multiColorSelectMode) {
          // Multi-select is handled by the gallery listener, but we must not stop propagation
          return
        }
        
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
        syncMultiColorToState()
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
      const prefix = repeating
        ? `repeating-${type}-gradient`
        : `${type}-gradient`
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
    DOM.multiColorSettingsBody.style.display = "block"
    DOM.multiColorSettingsBody.classList.toggle("is-collapsed", !isOpen)
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
          updateMultiColorPreview()
          syncMultiColorToState()
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

    updateMultiColorPreview()
    syncMultiColorToState()
  }

  // Event Listeners
  DOM.multiColorTypeSelect.addEventListener("change", () => {
    updateTypeControlsVisibility()
    updateMultiColorPreview()
    syncMultiColorToState()
  })

  DOM.multiColorRepeatingToggle.addEventListener("change", () => {
    updateMultiColorPreview()
    syncMultiColorToState()
  })

  DOM.multiColorPositionSelect.addEventListener("change", () => {
    updateMultiColorPreview()
    syncMultiColorToState()
  })

  DOM.multiColorRadialShapeSelect.addEventListener("change", () => {
    updateMultiColorPreview()
    syncMultiColorToState()
  })

  DOM.multiColorModeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      DOM.multiColorModeBtns.forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")
      updateDividerControlsVisibility()
      updateMultiColorPreview()
      syncMultiColorToState()
    })
  })

  DOM.multiColorToggleBtn.addEventListener("click", () => {
    const nextIsOpen =
      DOM.multiColorSettingsBody.classList.contains("is-collapsed")
    setMultiControlsExpanded(nextIsOpen)
    updateSetting("multiColorControlsOpen", nextIsOpen)
    saveSettings()
  })

  DOM.multiColorDividersToggle.addEventListener("change", () => {
    updateLineAngleControlsVisibility()
    updateMultiColorPreview()
    syncMultiColorToState()
  })

  DOM.multiColorFreeLineAngles?.addEventListener("change", () => {
    const isEnabled = DOM.multiColorFreeLineAngles.checked

    if (isEnabled) {
      generateLineAngleControls(
        DOM.multiColorCountSelect.value,
        getSettings().multiColorLineAngles,
      )
    }

    updateLineAngleControlsVisibility()
    updateMultiColorPreview()
    syncMultiColorToState()
  })

  DOM.multiColorLineColor.addEventListener("input", () => {
    updateMultiColorPreview()
    syncMultiColorToState()
  })

  DOM.multiColorLineWidth.addEventListener("input", () => {
    const width = parseFloat(DOM.multiColorLineWidth.value)
    DOM.multiColorLineWidthValue.textContent = width.toFixed(1)
    updateMultiColorPreview()
    syncMultiColorToState()
  })

  DOM.randomMultiColorHueBtn?.addEventListener("click", () => {
    updateSetting("activeBgUid", null)
    const count = clampCount(DOM.multiColorCountSelect.value)
    applyRandomizedColors(generateHueColors(count))
  })

  DOM.randomMultiColorCrazyBtn?.addEventListener("click", () => {
    updateSetting("activeBgUid", null)
    const count = clampCount(DOM.multiColorCountSelect.value)
    applyRandomizedColors(generateCrazyColors(count))
  })


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
        .forEach((el) => {
          el.classList.remove("selected")
          const cb = el.querySelector(".bg-item-checkbox")
          if (cb) cb.classList.remove("checked")
        })
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
          .forEach((el) => {
            el.classList.remove("selected")
            const cb = el.querySelector(".bg-item-checkbox")
            if (cb) cb.classList.remove("checked")
          })
      } else {
        multiColorSelectedIndices.clear()
        multiColorIndices.forEach((i) => multiColorSelectedIndices.add(i))
        DOM.savedMultiColorPresets
          .querySelectorAll(".user-gradient-item")
          .forEach((el) => {
            el.classList.add("selected")
            const cb = el.querySelector(".bg-item-checkbox")
            if (cb) cb.classList.add("checked")
          })
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
      const checkbox = item.querySelector(".bg-item-checkbox")
      if (multiColorSelectedIndices.has(index)) {
        multiColorSelectedIndices.delete(index)
        item.classList.remove("selected")
        if (checkbox) checkbox.classList.remove("checked")
      } else {
        multiColorSelectedIndices.add(index)
        item.classList.add("selected")
        if (checkbox) checkbox.classList.add("checked")
      }
      updateMultiColorSelectCount()
    })
  }

  setupMultiSelect()

  function syncMultiColorToState(forceApply = false) {
    const settings = getSettings()
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
    const activeUid = settings.activeBgUid
    const editableMultiUid =
      (settings.userGradients || []).some(
        (preset) => preset.uid === activeUid && preset.type === "multi-color",
      )
        ? activeUid
        : null

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
    const isAlreadyActive = settings.multiColorActive === true;

    if (forceApply || isAlreadyActive) {
      updateSetting("multiColorActive", true)
      
      // Crucial: Set background to null so settingsApplier uses multiColor logic
      updateSetting("background", null)
      updateSetting("activeBgUid", editableMultiUid)
      
      // Deactivate other effects
      updateSetting("svgWaveActive", false)
      updateSetting("gradientV2Active", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("liquidEtherActive", false)
      updateSetting("splashCursorActive", false)
    }

    if (editableMultiUid) {
      updateSetting(
        "userGradients",
        (settings.userGradients || []).map((preset) => {
          if (preset.uid !== editableMultiUid) return preset
          return {
            ...preset,
            gradientStops: colors,
            angle: parseInt(angle),
            mode,
            showDividers: dividerConfig.enabled,
            dividerColor: dividerConfig.color,
            dividerWidth: dividerConfig.width,
            freeLineAngles: lineAngleConfig.enabled,
            lineAngles: lineAngleConfig.lineAngles,
            multiColorType: type,
            multiColorRepeating: repeating,
            multiColorPosition: position,
            multiColorRadialShape: radialShape,
          }
        }),
      )
    }

    saveSettings()

    if ((forceApply || isAlreadyActive) && typeof applySettings !== "undefined" && applySettings) {
      applySettings()
    }

    if (getSettings().m3AutoAccentFromBg === true) {
      window.appScheduleAutoAccentUpdate?.()
    }
  }

  // Handle count selector change
  DOM.multiColorCountSelect.addEventListener("change", (e) => {
    const count = clampCount(e.target.value)
    DOM.multiColorCountSelect.value = String(count)
    updateSetting("multiColorCount", count)
    generateColorPickers(count)
    generateLineAngleControls(count, getSettings().multiColorLineAngles)
    updateMultiColorPreview()
    syncMultiColorToState()
  })

  // Handle angle change
  DOM.multiGradientAngleInput.addEventListener("input", (e) => {
    const angle = e.target.value
    DOM.multiGradientAngleValue.textContent = angle
    updateMultiColorPreview()
    syncMultiColorToState()
  })

  // Apply split background
  DOM.applyMultiColorBtn.addEventListener("click", () => {
    syncMultiColorToState(true)
    
    // Brief visual feedback on button
    const originalText = DOM.applyMultiColorBtn.textContent
    DOM.applyMultiColorBtn.textContent = "✓ Applied"
    setTimeout(() => {
      DOM.applyMultiColorBtn.textContent = originalText
    }, 1500)
    
    showAlert(t("alert_apply_success", "Applied successfully!"))
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
    
    // Check for duplicates
    const isDuplicate = (settings.userGradients || []).some(g => {
      if (g.type !== "multi-color") return false
      return JSON.stringify(g.gradientStops) === JSON.stringify(colors) &&
             g.angle === parseInt(angle) &&
             g.mode === mode &&
             g.multiColorType === type &&
             g.multiColorRepeating === repeating &&
             g.multiColorPosition === position &&
             g.multiColorRadialShape === radialShape &&
             g.showDividers === dividerConfig.enabled &&
             g.dividerColor === dividerConfig.color &&
             g.dividerWidth === dividerConfig.width
    })

    if (isDuplicate) {
      showAlert(t("alert_duplicate_preset", "This preset is already saved!"))
      return
    }

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
      uid: `multi-${Date.now()}`
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
    updateSetting("multiColorActive", true)
    updateSetting("activeBgUid", preset.uid || null)
    updateSetting("multiColors", [...preset.gradientStops])
    updateSetting("multiColorMode", preset.mode || "smooth")
    updateSetting("multiGradientAngle", Number(preset.angle))

    updateSetting("multiColorType", DOM.multiColorTypeSelect.value)
    updateSetting("multiColorRepeating", DOM.multiColorRepeatingToggle.checked)
    updateSetting("multiColorPosition", DOM.multiColorPositionSelect.value)
    updateSetting(
      "multiColorRadialShape",
      DOM.multiColorRadialShapeSelect.value,
    )

    updateDividerControlsVisibility()
    updateTypeControlsVisibility()
    updateMultiColorPreview()

    // Custom active state logic for multi-color
    updateSetting("background", null)
    updateSetting("svgWaveActive", false)
    updateSetting("gradientV2Active", false)
    updateSetting("silkActive", false)
    updateSetting("lightPillarActive", false)
    updateSetting("liquidEtherActive", false)
    updateSetting("splashCursorActive", false)
    
    saveSettings()
    if (applySettings) applySettings()
    if (getSettings().m3AutoAccentFromBg === true) {
      window.appScheduleAutoAccentUpdate?.()
    }

    renderSavedMultiColors(DOM)

  })

  window.addEventListener("multiColor:sync", syncFromSettings)

  // Initialize on load
  syncFromSettings()
}
