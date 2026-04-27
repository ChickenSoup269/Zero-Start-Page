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
      Math.max(0, gradient?.extraColorCount !== undefined ? Number(gradient.extraColorCount) : 2),
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

let gradientSelectMode = false
let gradientSelectedIndices = new Set()

export function isGradientSelectMode() {
  return gradientSelectMode
}

function setupMultiSelect(DOM) {
  const i18n = geti18n()

  const updateGradientSelectCount = () => {
    DOM.gradientSelectCount.textContent = `${gradientSelectedIndices.size} selected`
    DOM.gradientDeleteSelectedBtn.disabled = gradientSelectedIndices.size === 0
  }

  const enterGradientSelectMode = () => {
    gradientSelectMode = true
    DOM.userGradientsGallery.dataset.selectMode = "true"
    gradientSelectedIndices.clear()
    DOM.userGradientsGallery.classList.add("bg-select-mode")
    DOM.gradientSelectToolbar.style.display = "flex"
    DOM.gradientSelectModeBtn.style.display = "none"
    updateGradientSelectCount()
  }

  const exitGradientSelectMode = () => {
    gradientSelectMode = false
    DOM.userGradientsGallery.dataset.selectMode = "false"
    gradientSelectedIndices.clear()
    DOM.userGradientsGallery.classList.remove("bg-select-mode")
    DOM.gradientSelectToolbar.style.display = "none"
    DOM.gradientSelectModeBtn.style.display = "block"
    DOM.userGradientsGallery
      .querySelectorAll(".user-gradient-item")
      .forEach((el) => el.classList.remove("bg-selected"))
  }

  DOM.gradientSelectModeBtn.addEventListener("click", () => {
    if (gradientSelectMode) exitGradientSelectMode()
    else enterGradientSelectMode()
  })

  DOM.gradientSelectCancelBtn.addEventListener("click", exitGradientSelectMode)

  DOM.gradientSelectAllBtn.addEventListener("click", () => {
    const settings = getSettings()
    const allGradients = settings.userGradients || []
    const standardGradientsIndices = allGradients
      .map((g, i) => ({ g, i }))
      .filter((item) => item.g.type !== "multi-color")
      .map((item) => item.i)

    if (gradientSelectedIndices.size === standardGradientsIndices.length) {
      gradientSelectedIndices.clear()
      DOM.userGradientsGallery
        .querySelectorAll(".user-gradient-item")
        .forEach((el) => el.classList.remove("bg-selected"))
    } else {
      standardGradientsIndices.forEach((i) => gradientSelectedIndices.add(i))
      DOM.userGradientsGallery
        .querySelectorAll(".user-gradient-item")
        .forEach((el) => el.classList.add("bg-selected"))
    }
    updateGradientSelectCount()
  })

  DOM.gradientDeleteSelectedBtn.addEventListener("click", async () => {
    if (gradientSelectedIndices.size === 0) return
    const confirmed = await showConfirm(
      `${i18n.alert_delete_bg_confirm || "Delete selected?"} (${gradientSelectedIndices.size})`,
    )
    if (!confirmed) return

    const settings = getSettings()
    const sortedIndices = Array.from(gradientSelectedIndices).sort(
      (a, b) => b - a,
    )
    sortedIndices.forEach((index) => {
      settings.userGradients.splice(index, 1)
    })

    saveSettings()
    exitGradientSelectMode()
    renderUserGradients(DOM)
  })

  DOM.userGradientsGallery.addEventListener("click", (e) => {
    if (!gradientSelectMode) return
    const item = e.target.closest(".user-gradient-item")
    if (!item) return

    const index = parseInt(item.dataset.index)
    if (gradientSelectedIndices.has(index)) {
      gradientSelectedIndices.delete(index)
      item.classList.remove("bg-selected")
    } else {
      gradientSelectedIndices.add(index)
      item.classList.add("bg-selected")
    }
    updateGradientSelectCount()
  })
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
      item.dataset.index = index
      item.dataset.start = gradient.start
      item.dataset.end = gradient.end
      item.dataset.angle = gradient.angle
      item.dataset.type = gradient.type || "linear"
      item.dataset.repeating = String(gradient.repeating === true)
      item.dataset.extraColorCount = String(gradient.extraColorCount || 2)
      item.dataset.customColors = gradient.customColors || ""
      item.dataset.position = gradient.position || "center"
      item.dataset.radialShape = gradient.radialShape || "circle"
      
      const gradientCss = buildGradientCss(gradient)
      item.style.background = gradientCss
      item.title = `Gradient ${index + 1}`

      // Improved active detection
      const currentBg = settings.background || ""
      let isCurrentActive = !settings.svgWaveActive && (currentBg === gradientCss || 
                             (currentBg.replace(/\s/g, "") === gradientCss.replace(/\s/g, "")))
      
      // Fallback: Check if individual settings match (when background is null but this gradient is current)
      if (!isCurrentActive && !settings.background && !settings.svgWaveActive) {
          isCurrentActive = 
            settings.gradientStart === gradient.start &&
            settings.gradientEnd === gradient.end &&
            Number(settings.gradientAngle) === Number(gradient.angle) &&
            (settings.gradientType || "linear") === (gradient.type || "linear") &&
            (settings.gradientRepeating === true) === (gradient.repeating === true) &&
            Number(settings.gradientExtraColorCount || 2) === Number(gradient.extraColorCount || 2) &&
            (settings.gradientCustomColors || "") === (gradient.customColors || "") &&
            (settings.gradientPosition || "center") === (gradient.position || "center") &&
            (settings.gradientRadialShape || "circle") === (gradient.radialShape || "circle");
      }
      
      if (isCurrentActive) {
        item.classList.add("active")
      }

      if (gradient.isFavorite) {
        const star = document.createElement("i")
        star.className = "fa-solid fa-star favorite-star-badge"
        item.appendChild(star)
      }

      item.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        import("../contextMenu.js").then((m) => {
          m.showContextMenu(e.clientX, e.clientY, index, "userGradient")
        })
      })

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

      const checkBadge = document.createElement("span")
      checkBadge.className = "bg-select-check"
      checkBadge.innerHTML = '<i class="fa-solid fa-check"></i>'
      item.appendChild(checkBadge)

      const activeIndicator = document.createElement("div")
      activeIndicator.className = "active-indicator"
      activeIndicator.innerHTML = '<i class="fa-solid fa-check"></i>'
      item.appendChild(activeIndicator)

      item.addEventListener("click", () => {
        if (gradientSelectMode) return
        
        if (window.appHandleSettingUpdate) {
            window.appHandleSettingUpdate("background", gradientCss);
        }
      })

      // Drag and drop for reordering
      const enableDrag = settings.bookmarkEnableDrag === true
      if (enableDrag) {
        item.draggable = true
        item.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", index)
          e.dataTransfer.effectAllowed = "move"
          item.classList.add("dragging")
        })
        item.addEventListener("dragover", (e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = "move"
          item.classList.add("drag-over")
        })
        item.addEventListener("dragleave", () =>
          item.classList.remove("drag-over"),
        )
        item.addEventListener("dragend", () => item.classList.remove("dragging"))
        item.addEventListener("drop", (e) => {
          e.preventDefault()
          item.classList.remove("drag-over")
          const fromIndex = parseInt(e.dataTransfer.getData("text/plain"))
          if (fromIndex !== index) {
            const items = settings.userGradients
            const [movedItem] = items.splice(fromIndex, 1)
            items.splice(index, 0, movedItem)
            saveSettings()
            renderUserGradients(DOM)
          }
        })
      }

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

export { renderUserGradients, setupMultiSelect as setupGradientMultiSelect }
export { buildGradientCss }
