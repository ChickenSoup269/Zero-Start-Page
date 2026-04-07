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
    extraColorCount: Math.min(
      5,
      Math.max(1, Number(gradient?.extraColorCount) || 2),
    ),
    customColors:
      typeof gradient?.customColors === "string" ? gradient.customColors : "",
    position: gradient?.position || "center",
    radialShape: gradient?.radialShape || "circle",
  }
}

function parseCustomColors(text) {
  const matches = text.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g) || []
  return matches.map((c) => {
    if (c.length === 4) {
      const r = c[1]
      const g = c[2]
      const b = c[3]
      return `#${r}${r}${g}${g}${b}${b}`
    }
    return c.toLowerCase()
  })
}

function hexToRgb(hex) {
  const normalized = String(hex || "").replace("#", "")
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized

  const value = Number.parseInt(full, 16)
  if (!Number.isFinite(value) || full.length !== 6) {
    return { r: 15, g: 23, b: 42 }
  }

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function mixHex(a, b, t) {
  const c1 = hexToRgb(a)
  const c2 = hexToRgb(b)
  const ratio = Math.min(1, Math.max(0, Number(t) || 0))
  const toHex = (n) => Math.round(n).toString(16).padStart(2, "0")

  const r = c1.r + (c2.r - c1.r) * ratio
  const g = c1.g + (c2.g - c1.g) * ratio
  const bCh = c1.b + (c2.b - c1.b) * ratio

  return `#${toHex(r)}${toHex(g)}${toHex(bCh)}`
}

function buildGradientCss(gradient) {
  const normalized = normalizeGradient(gradient)
  const {
    start,
    end,
    angle,
    type,
    repeating,
    extraColorCount,
    customColors,
    position,
    radialShape,
  } = normalized
  const customPalette = parseCustomColors(customColors).slice(0, 5)
  const generatedPalette = Array.from(
    { length: extraColorCount },
    (_, index) => {
      const ratio = (index + 1) / (extraColorCount + 1)
      return mixHex(start, end, ratio)
    },
  )
  const middleColors =
    customPalette.length > 0 ? customPalette : generatedPalette
  const palette = [start, ...middleColors, end]

  if (repeating) {
    const linearStops = palette
      .map((color, index) => {
        const band = 100 / palette.length
        const from = (band * index).toFixed(2)
        const to = (band * (index + 1)).toFixed(2)
        return `${color} ${from}% ${to}%`
      })
      .join(", ")

    if (type === "radial") {
      const radialStops = palette
        .map((color, index) => {
          const band = 100 / palette.length
          const from = (band * index).toFixed(2)
          const to = (band * (index + 1)).toFixed(2)
          return `${color} ${from}% ${to}%`
        })
        .join(", ")
      return `repeating-radial-gradient(${radialShape} at ${position}, ${radialStops})`
    }
    if (type === "conic") {
      const conicStops = palette
        .map((color, index) => {
          const band = 360 / palette.length
          const from = (band * index).toFixed(0)
          const to = (band * (index + 1)).toFixed(0)
          return `${color} ${from}deg ${to}deg`
        })
        .join(", ")
      return `repeating-conic-gradient(from ${angle}deg at ${position}, ${conicStops}, ${palette[0]} 360deg)`
    }
    // Repeating linear uses multiple color columns for textured backgrounds.
    return `repeating-linear-gradient(${angle}deg, ${linearStops})`
  }

  const gradientStops = palette
    .map((color, index) => {
      const percent = ((index / (palette.length - 1)) * 100).toFixed(2)
      return `${color} ${percent}%`
    })
    .join(", ")

  if (type === "radial") {
    return `radial-gradient(${radialShape} at ${position}, ${gradientStops})`
  }
  if (type === "conic") {
    const conicStops = palette
      .map((color, index) => {
        const deg = ((index / (palette.length - 1)) * 360).toFixed(2)
        return `${color} ${deg}deg`
      })
      .join(", ")
    return `conic-gradient(from ${angle}deg at ${position}, ${conicStops}, ${palette[0]} 360deg)`
  }

  return `linear-gradient(${angle}deg, ${gradientStops})`
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
      item.dataset.extraColorCount = String(gradient.extraColorCount || 2)
      item.dataset.customColors = gradient.customColors || ""
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
  const gradSpan = document.getElementById("count-gradient")
  if (gradSpan) {
    const total = DOM.userGradientsGallery.querySelectorAll(
      ".user-gradient-item",
    ).length
    gradSpan.innerHTML = ` <span style="font-size:0.8rem;opacity:0.6;">(${total})</span>`
  }
}

export { renderUserGradients }
export { buildGradientCss }
