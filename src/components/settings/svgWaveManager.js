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

let svgWaveSelectMode = false
let svgWaveSelectedIndices = new Set()

function setupMultiSelect(DOM, svgWaveEffect, onActivate) {
  const i18n = geti18n()

  const updateSvgWaveSelectCount = () => {
    DOM.svgWaveSelectCount.textContent = `${svgWaveSelectedIndices.size} selected`
    DOM.svgWaveDeleteSelectedBtn.disabled = svgWaveSelectedIndices.size === 0
  }

  const enterSvgWaveSelectMode = () => {
    svgWaveSelectMode = true
    svgWaveSelectedIndices.clear()
    DOM.userSvgWavesGallery.classList.add("bg-select-mode")
    DOM.svgWaveSelectToolbar.style.display = "flex"
    DOM.svgWaveSelectModeBtn.style.display = "none"
    updateSvgWaveSelectCount()
  }

  const exitSvgWaveSelectMode = () => {
    svgWaveSelectMode = false
    svgWaveSelectedIndices.clear()
    DOM.userSvgWavesGallery.classList.remove("bg-select-mode")
    DOM.svgWaveSelectToolbar.style.display = "none"
    DOM.svgWaveSelectModeBtn.style.display = "block"
    DOM.userSvgWavesGallery
      .querySelectorAll(".user-svg-wave-item")
      .forEach((el) => el.classList.remove("bg-selected"))
  }

  DOM.svgWaveSelectModeBtn.addEventListener("click", () => {
    if (svgWaveSelectMode) exitSvgWaveSelectMode()
    else enterSvgWaveSelectMode()
  })

  DOM.svgWaveSelectCancelBtn.addEventListener("click", exitSvgWaveSelectMode)

  DOM.svgWaveSelectAllBtn.addEventListener("click", () => {
    const settings = getSettings()
    const allWaves = settings.userSvgWaves || []

    if (svgWaveSelectedIndices.size === allWaves.length) {
      svgWaveSelectedIndices.clear()
      DOM.userSvgWavesGallery
        .querySelectorAll(".user-svg-wave-item")
        .forEach((el) => el.classList.remove("bg-selected"))
    } else {
      allWaves.forEach((_, i) => svgWaveSelectedIndices.add(i))
      DOM.userSvgWavesGallery
        .querySelectorAll(".user-svg-wave-item")
        .forEach((el) => el.classList.add("bg-selected"))
    }
    updateSvgWaveSelectCount()
  })

  DOM.svgWaveDeleteSelectedBtn.addEventListener("click", async () => {
    if (svgWaveSelectedIndices.size === 0) return
    const confirmed = await showConfirm(
      `${i18n.alert_delete_bg_confirm || "Delete selected?"} (${svgWaveSelectedIndices.size})`,
    )
    if (!confirmed) return

    const settings = getSettings()
    const sortedIndices = Array.from(svgWaveSelectedIndices).sort(
      (a, b) => b - a,
    )
    sortedIndices.forEach((index) => {
      settings.userSvgWaves.splice(index, 1)
    })

    saveSettings()
    exitSvgWaveSelectMode()
    renderUserSvgWaves(DOM, svgWaveEffect, onActivate)
  })

  DOM.userSvgWavesGallery.addEventListener("click", (e) => {
    if (!svgWaveSelectMode) return
    const item = e.target.closest(".user-svg-wave-item")
    if (!item) return

    const index = parseInt(item.dataset.index)
    if (svgWaveSelectedIndices.has(index)) {
      svgWaveSelectedIndices.delete(index)
      item.classList.remove("bg-selected")
    } else {
      svgWaveSelectedIndices.add(index)
      item.classList.add("bg-selected")
    }
    updateSvgWaveSelectCount()
  })
}

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
    item.dataset.index = index
    item.dataset.lines = wave.lines
    item.dataset.ampx = wave.amplitudeX
    item.dataset.ampy = wave.amplitudeY
    item.dataset.startHue = wave.startHue
    item.dataset.endHue = wave.endHue
    item.title = `Wave ${index + 1}`
    item.style.backgroundImage = `url("${svgWaveEffect ? svgWaveEffect.generateThumbnailDataUri(wave) : ""}")`
    item.style.backgroundSize = "cover"

    if (wave.isFavorite) {
      const star = document.createElement("i")
      star.className = "fa-solid fa-star favorite-star-badge"
      item.appendChild(star)
    }

    item.addEventListener("contextmenu", (e) => {
      e.preventDefault()
      import("../contextMenu.js").then((m) => {
        m.showContextMenu(e.clientX, e.clientY, index, "userSvgWave")
      })
    })

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

    const checkBadge = document.createElement("span")
    checkBadge.className = "bg-select-check"
    checkBadge.innerHTML = '<i class="fa-solid fa-check"></i>'
    item.appendChild(checkBadge)

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
      item.addEventListener("dragleave", () => item.classList.remove("drag-over"))
      item.addEventListener("dragend", () => item.classList.remove("dragging"))
      item.addEventListener("drop", (e) => {
        e.preventDefault()
        item.classList.remove("drag-over")
        const fromIndex = parseInt(e.dataTransfer.getData("text/plain"))
        if (fromIndex !== index) {
          const items = settings.userSvgWaves
          const [movedItem] = items.splice(fromIndex, 1)
          items.splice(index, 0, movedItem)
          saveSettings()
          renderUserSvgWaves(DOM, svgWaveEffect, onActivate)
        }
      })
    }

    item.addEventListener("click", () => {
      if (svgWaveSelectMode) return
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

  const svgWaveSpan = document.getElementById("count-svg-wave")
  if (svgWaveSpan) {
    const total = DOM.userSvgWavesGallery.querySelectorAll(
      ".user-svg-wave-item",
    ).length
    svgWaveSpan.innerHTML = ` <span style="font-size:0.8rem;opacity:0.6;">(${total})</span>`
  }
}

export { renderUserSvgWaves, setupMultiSelect as setupSvgWaveMultiSelect }
