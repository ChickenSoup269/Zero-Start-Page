/**
 * Font Management Module
 * Handles font selection, Google Fonts loading, and custom font persistence
 */

import {
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"
import { geti18n } from "../../services/i18n.js"
import { showAlert, showConfirm } from "../../utils/dialog.js"
import { showContextMenu } from "../contextMenu.js"
import { showToast } from "../../utils/toast.js"

const PREDEFINED_FONTS = [
  { label: "Outfit", value: "'Outfit', sans-serif", google: true },
  { label: "Inter", value: "'Inter', sans-serif", google: true },
  { label: "Poppins", value: "'Poppins', sans-serif", google: true },
  { label: "Roboto", value: "'Roboto', sans-serif", google: true },
  { label: "Montserrat", value: "'Montserrat', sans-serif", google: true },
  { label: "Nunito", value: "'Nunito', sans-serif", google: true },
  { label: "Orbitron", value: "'Orbitron', sans-serif", google: true },
  { label: "Chakra Petch", value: "'Chakra Petch', sans-serif", google: true },
  { label: "Arial", value: "'Arial', sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Silkscreen", value: "'Silkscreen', cursive", tag: "Pixel", google: true },
  { label: "Pixelify Sans", value: "'Pixelify Sans', sans-serif", tag: "Pixel", google: true },
  { label: "Electroharmonix", value: "'Electroharmonix', sans-serif", tag: "Clock/Date" },
  { label: "Anurati", value: "'Anurati', sans-serif", tag: "Clock/Date" },
  { label: "E1234", value: "'E1234', sans-serif", tag: "Clock/Date" },
  { label: "SAIBA-45", value: "'SAIBA-45', sans-serif", tag: "Clock/Date" },
  { label: "GohuFont", value: "'GohuFont', sans-serif", tag: "Pixel" },
]

let fontSelectMode = false
let fontSelectedLabels = new Set()

export function isFontSelectMode() {
  return fontSelectMode
}

function loadGoogleFont(fontName) {
  const formattedFontName = fontName.replace(/\s+/g, "+")
  const googleFontUrl = `https://fonts.googleapis.com/css2?family=${formattedFontName}:wght@300;400;500;600;700&display=swap`
  const customFontLink = document.getElementById("custom-google-font")
  if (customFontLink) {
    customFontLink.href = googleFontUrl
  }
}

function initFont() {
  const settings = getSettings()
  const fontsToLoad = [
    settings.font || "'Outfit', sans-serif",
    settings.clockFont || "'Outfit', sans-serif",
  ]
  fontsToLoad.forEach((currentFontValue) => {
    const fontName = currentFontValue.replace(/['"]/g, "").split(",")[0].trim()
    const fontDef = PREDEFINED_FONTS.find((f) => f.label === fontName)
    const savedFonts = settings.userSavedFonts || []
    const savedFontObj = savedFonts.find((f) => (typeof f === "string" ? f : f.label) === fontName)
    const isLocal = savedFontObj && typeof savedFontObj === "object" && (savedFontObj.isLocal || savedFontObj.isLocalFile)
    const isGoogleFont = (fontDef && fontDef.google) || (savedFontObj && !isLocal)
    const isPreloaded = ["Outfit"].includes(fontName)

    if (isGoogleFont && !isPreloaded) {
      if (!(fontDef && !fontDef.google)) {
        loadGoogleFont(fontName)
      }
    }
  })
}

function renderFontGrid(fontGrid, updateSettingCallback) {
  if (!fontGrid) return

  const settings = getSettings()
  const savedFonts = settings.userSavedFonts || []

  fontGrid.innerHTML = ""

  const favoritesMap = new Map()
  const savedConfigMap = new Map()
  savedFonts.forEach((f) => {
    if (typeof f === "object") {
      savedConfigMap.set(f.label, f)
      if (f.isFavorite) {
        favoritesMap.set(f.label, f)
      }
    }
  })

  const allFonts = [
    ...PREDEFINED_FONTS.map((f) => {
      const fav = favoritesMap.get(f.label)
      const config = savedConfigMap.get(f.label) || {}
      let type = f.tag === "Clock/Date" ? "clock" : "general"
      if (config.type) type = config.type
      return { ...f, type: type, isFavorite: !!fav }
    }),
    ...savedFonts
      .filter((f) => {
        const label = typeof f === "string" ? f : f.label
        return !PREDEFINED_FONTS.some((pf) => pf.label === label)
      })
      .map((f, index) => {
        const label = typeof f === "string" ? f : f.label
        const isFavorite = typeof f === "string" ? false : !!f.isFavorite
        const isLocal = typeof f === "object" && (f.isLocal || f.isLocalFile)
        const type = typeof f === "object" && f.type ? f.type : "general"
        const originalIndex = savedFonts.findIndex((sf) => (typeof sf === "string" ? sf : sf.label) === label)
        return {
          label: label,
          value: typeof f === "object" && f.value ? f.value : `'${label}', sans-serif`,
          custom: !isLocal,
          isLocal: isLocal,
          isFavorite: isFavorite,
          originalIndex: originalIndex,
          type: type,
        }
      }),
  ]

  const favoriteFonts = allFonts.filter((f) => f.isFavorite)
  const generalFonts = allFonts.filter((f) => !f.isFavorite && f.type === "general")
  const clockFonts = allFonts.filter((f) => !f.isFavorite && f.type === "clock")

  const sections = [
    { label: "--- Favorite ---", fonts: favoriteFonts },
    { label: "--- General Fonts ---", fonts: generalFonts },
    { label: "--- Clock Fonts ---", fonts: clockFonts },
  ]

  sections.forEach((section) => {
    if (section.fonts.length === 0) return

    const sep = document.createElement("div")
    sep.className = "font-grid-separator"
    sep.textContent = section.label
    fontGrid.appendChild(sep)

    section.fonts.forEach((fontObj) => {
      const { label, value, tag, custom, google, isFavorite, originalIndex, type, isLocal } = fontObj
      const card = document.createElement("div")

      const targetSelect = document.getElementById("font-target-select")
      const isTargetClock = targetSelect ? targetSelect.value === "clock" : false
      let isActive = false
      if (isTargetClock) {
        isActive = value === settings.clockFont
      } else {
        isActive = type === "clock" ? value === settings.clockFont : value === settings.font
      }
      card.className = "font-item" + (isActive ? " active" : "")
      if (isFavorite) card.classList.add("is-favorite")
      card.dataset.fontValue = value
      card.dataset.fontType = type

      const preview = document.createElement("span")
      preview.className = "font-item-preview"
      preview.textContent = "Aa"
      preview.style.fontFamily = value

      const name = document.createElement("span")
      name.className = "font-item-name"

      let displayTag = tag
      if (custom && !google) displayTag = isLocal ? "Local Font" : "Saved Font"

      name.textContent = label + (displayTag ? ` (${displayTag})` : "")

      const badgesContainer = document.createElement("div")
      badgesContainer.className = "font-badges-container"
      badgesContainer.style.cssText = "display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; margin-top: 2px;"

      if (isFavorite) {
        const favIcon = document.createElement("i")
        favIcon.className = "fa-solid fa-star favorite-star"
        card.appendChild(favIcon)

        const badge = document.createElement("span")
        badge.className = "font-category-badge"
        badge.textContent = type === "clock" ? (geti18n().clock || "Clock") : (geti18n().general || "Gen")
        badge.style.cssText = "font-size: 0.55rem; background: var(--accent-color, #ff4b4b); color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; pointer-events: none; white-space: nowrap;"
        badgesContainer.appendChild(badge)
      }

      // Checkbox for multi-select
      const checkBadge = document.createElement("div")
      const isSelected = fontSelectedLabels.has(label)
      checkBadge.className = `bg-item-checkbox ${isSelected ? "checked" : ""}`
      checkBadge.innerHTML = '<i class="fa-solid fa-check"></i>'
      card.appendChild(checkBadge)
      
      if (fontSelectMode) {
        if (isSelected) card.classList.add("selected")
      }

      const appliedBadge = document.createElement("div")
      appliedBadge.className = "font-applied-badge"
      appliedBadge.style.cssText = "font-size: 0.55rem; background: var(--accent-color, #a8c0ff); color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; pointer-events: none; display: none; white-space: nowrap;"
      badgesContainer.appendChild(appliedBadge)

      card._updateAppliedBadge = () => {
        const curSettings = getSettings()
        const i18n = geti18n()
        const isGen = value === curSettings.font
        const isClk = value === curSettings.clockFont
        
        let text = ""
        if (isGen && isClk) text = `${i18n.settings_font || "Gen"} & ${i18n.clock || "Clock"}`
        else if (isGen) text = i18n.settings_font || "Gen"
        else if (isClk) text = i18n.clock || "Clock"
        
        if (text) {
          appliedBadge.textContent = `${i18n.preset_code_applied || "Applied"}: ${text}`
          appliedBadge.style.display = "block"
        } else {
          appliedBadge.style.display = "none"
        }
      }
      card._updateAppliedBadge()

      card.appendChild(preview)
      card.appendChild(badgesContainer)
      card.appendChild(name)

      card.addEventListener("click", () => {
        if (fontSelectMode) {
          if (fontSelectedLabels.has(label)) {
            fontSelectedLabels.delete(label)
            card.classList.remove("selected")
            checkBadge.classList.remove("checked")
          } else {
            fontSelectedLabels.add(label)
            card.classList.add("selected")
            checkBadge.classList.add("checked")
          }
          const countEl = document.getElementById("font-select-count")
          if (countEl) countEl.textContent = `${fontSelectedLabels.size} selected`
          const delBtn = document.getElementById("font-delete-selected-btn")
          if (delBtn) delBtn.disabled = fontSelectedLabels.size === 0
          return
        }

        if (custom || google) loadGoogleFont(label)

        const targetSelect = document.getElementById("font-target-select")
        const target = targetSelect ? targetSelect.value : "general"

        if (target === "clock" || type === "clock") {
          updateSettingCallback("clockFont", value)
        } else {
          updateSettingCallback("font", value)
        }
        
        // Fast UI update: toggle active classes without full re-render
        const currentSettings = getSettings()
        const isTargetClock = target === "clock"
        const allCards = fontGrid.querySelectorAll(".font-item")
        allCards.forEach(c => {
          const cVal = c.dataset.fontValue
          const cType = c.dataset.fontType
          let isActiveCard = false
          if (isTargetClock) {
            isActiveCard = cVal === currentSettings.clockFont
          } else {
            isActiveCard = cType === "clock" ? cVal === currentSettings.clockFont : cVal === currentSettings.font
          }
          if (isActiveCard) c.classList.add("active")
          else c.classList.remove("active")
          
          if (c._updateAppliedBadge) c._updateAppliedBadge()
        })
      })

      card.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        if (fontSelectMode) return // Disable context menu in select mode

        const callbacks = {
          fontCategoryType: type,
          onMoveFont: () => {
            const currentSettings = getSettings()
            let userFonts = currentSettings.userSavedFonts || []
            let existingObjIndex = userFonts.findIndex((sf) => (typeof sf === "string" ? sf : sf.label) === label)
            
            let newType = type === "clock" ? "general" : "clock"
            
            if (existingObjIndex !== -1) {
              if (typeof userFonts[existingObjIndex] === "string") {
                 userFonts[existingObjIndex] = { label: userFonts[existingObjIndex], value: value, type: newType }
              } else {
                 userFonts[existingObjIndex] = { ...userFonts[existingObjIndex], type: newType }
              }
            } else {
              userFonts.push({
                 label: label,
                 value: value,
                 type: newType
              })
            }
            updateSettingCallback("userSavedFonts", userFonts)
            renderFontGrid(fontGrid, updateSettingCallback)

            const i18n = geti18n()
            const targetType = newType === "clock" ? (i18n.clock || "Clock") : (i18n.general || "General")
            const msg = (i18n.toast_font_moved || "Moved {name} to {type}").replace("{name}", label).replace("{type}", targetType)
            showToast(msg, { type: "success" })
          },
          onApplyToGen: () => {
            if (custom || google) loadGoogleFont(label)
            updateSettingCallback("font", value)
            
            // Fast UI update
            const countEl = document.getElementById("font-target-select")
            if (countEl) countEl.value = "general"
            if (countEl) countEl.dispatchEvent(new Event("change"))
            
            const i18n = geti18n()
            showToast(`${i18n.preset_code_applied || "Applied"} ${label} ${i18n.menu_move_font ? "->" : "to"} General`, { type: "success" })
          },
          onApplyToClock: () => {
            if (custom || google) loadGoogleFont(label)
            updateSettingCallback("clockFont", value)
            
            // Fast UI update
            const countEl = document.getElementById("font-target-select")
            if (countEl) countEl.value = "clock"
            if (countEl) countEl.dispatchEvent(new Event("change"))
            
            const i18n = geti18n()
            showToast(`${i18n.preset_code_applied || "Applied"} ${label} ${i18n.menu_move_font ? "->" : "to"} Clock`, { type: "success" })
          },
          onSelect: () => {
            enterSelectMode()
            if (!fontSelectedLabels.has(label)) {
              fontSelectedLabels.add(label)
              card.classList.add("selected")
              checkBadge.classList.add("checked")
            }
            const countEl = document.getElementById("font-select-count")
            if (countEl) countEl.textContent = `${fontSelectedLabels.size} selected`
            const delBtn = document.getElementById("font-delete-selected-btn")
            if (delBtn) delBtn.disabled = fontSelectedLabels.size === 0
          }
        }

        if (custom || isLocal) {
          showContextMenu(e.clientX, e.clientY, originalIndex, "userFont", null, callbacks)
        } else {
          showContextMenu(e.clientX, e.clientY, -1, "predefinedFont", label, callbacks)
        }
      })

      fontGrid.appendChild(card)
    })
  })
}

function renderSavedFonts() {}

async function setupLocalFonts(updateSettingCallback) {
  const browseBtn = document.getElementById("browse-local-fonts-btn")
  if (!browseBtn) return

  let fileInput = document.getElementById("hidden-font-file-input")
  if (!fileInput) {
    fileInput = document.createElement("input")
    fileInput.id = "hidden-font-file-input"
    fileInput.type = "file"
    fileInput.accept = ".ttf,.otf,.woff,.woff2"
    fileInput.style.display = "none"
    document.body.appendChild(fileInput)
  }

  browseBtn.addEventListener("click", () => {
    fileInput.click()
  })

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const family = file.name.split('.').slice(0, -1).join('.') || file.name;
      const { saveImage, getImageUrl, deleteImage } = await import("../../services/imageStore.js")
      const fileId = await saveImage(file, `idb-font-${Date.now()}`)
      const settings = getSettings()
      const savedFonts = settings.userSavedFonts || []
      const existsIndex = savedFonts.findIndex((f) => (typeof f === "string" ? f : f.label) === family)
      const newFontObj = { label: family, value: `"${family}", sans-serif`, isLocalFile: true, fileId: fileId }

      if (existsIndex > -1) {
        const oldFileId = savedFonts[existsIndex].fileId
        if (oldFileId) await deleteImage(oldFileId)
        savedFonts[existsIndex] = newFontObj
      } else {
        savedFonts.push(newFontObj)
      }

      updateSetting("userSavedFonts", savedFonts)
      saveSettings()

      const url = await getImageUrl(fileId)
      if (url) {
        const styleId = `custom-font-${fileId}`
        if (!document.getElementById(styleId)) {
          const style = document.createElement("style")
          style.id = styleId
          style.textContent = `@font-face { font-family: '${family}'; src: url('${url}'); }`
          document.head.appendChild(style)
        }
      }

      const mainGrid = document.getElementById("font-grid")
      if (mainGrid) renderFontGrid(mainGrid, updateSettingCallback)
    } catch (err) {
      console.error(err)
      showAlert("Failed to load font.")
    }
    fileInput.value = ""
  })
}

let enterSelectMode = () => {}
let exitSelectMode = () => {}

function setupMultiSelect(DOM, updateSettingCallback) {
  const i18n = geti18n()

  const updateSelectCount = () => {
    if (DOM.fontSelectCount) DOM.fontSelectCount.textContent = `${fontSelectedLabels.size} selected`
    if (DOM.fontDeleteSelectedBtn) DOM.fontDeleteSelectedBtn.disabled = fontSelectedLabels.size === 0
  }

  enterSelectMode = () => {
    fontSelectMode = true
    fontSelectedLabels.clear()
    if (DOM.fontGrid) DOM.fontGrid.classList.add("bg-select-mode")
    if (DOM.fontSelectToolbar) DOM.fontSelectToolbar.style.display = "flex"
    if (DOM.fontSelectModeBtn) DOM.fontSelectModeBtn.style.display = "none"
    updateSelectCount()
  }

  exitSelectMode = () => {
    fontSelectMode = false
    fontSelectedLabels.clear()
    if (DOM.fontGrid) DOM.fontGrid.classList.remove("bg-select-mode")
    if (DOM.fontSelectToolbar) DOM.fontSelectToolbar.style.display = "none"
    if (DOM.fontSelectModeBtn) DOM.fontSelectModeBtn.style.display = "none"
    
    if (DOM.fontGrid) {
      const cards = DOM.fontGrid.querySelectorAll(".font-item")
      cards.forEach(c => {
        c.classList.remove("selected")
        const cb = c.querySelector(".bg-item-checkbox")
        if (cb) cb.classList.remove("checked")
      })
    }
  }

  if (DOM.fontSelectModeBtn) {
    DOM.fontSelectModeBtn.style.display = "none"
  }

  if (DOM.fontSelectCancelBtn) DOM.fontSelectCancelBtn.addEventListener("click", exitSelectMode)

  const targetSelect = document.getElementById("font-target-select")
  if (targetSelect && DOM.fontGrid) {
    targetSelect.addEventListener("change", () => {
      // Fast active class update when target changes
      const currentSettings = getSettings()
      const isTargetClock = targetSelect.value === "clock"
      const allCards = DOM.fontGrid.querySelectorAll(".font-item")
      allCards.forEach(c => {
        const cVal = c.dataset.fontValue
        const cType = c.dataset.fontType
        let isActiveCard = false
        if (isTargetClock) {
          // If viewing clock target, highlight the font that is currently the clockFont
          isActiveCard = cVal === currentSettings.clockFont
        } else {
          // If viewing general target, highlight based on typical sections
          isActiveCard = cType === "clock" ? cVal === currentSettings.clockFont : cVal === currentSettings.font
        }
        if (isActiveCard) c.classList.add("active")
        else c.classList.remove("active")
        
        if (c._updateAppliedBadge) c._updateAppliedBadge()
      })
    })
  }

  if (DOM.fontSelectAllBtn) DOM.fontSelectAllBtn.addEventListener("click", () => {
    const allLabels = []
    if (DOM.fontGrid) {
      const cards = DOM.fontGrid.querySelectorAll(".font-item")
      cards.forEach(c => {
        const nameEl = c.querySelector(".font-item-name")
        if (nameEl) {
          const fullText = nameEl.textContent
          const baseName = fullText.includes(" (") ? fullText.split(" (")[0] : fullText
          allLabels.push({ label: baseName, card: c })
        }
      })
    }

    if (fontSelectedLabels.size === allLabels.length) {
      fontSelectedLabels.clear()
      allLabels.forEach(item => {
        item.card.classList.remove("selected")
        const cb = item.card.querySelector(".bg-item-checkbox")
        if (cb) cb.classList.remove("checked")
      })
    } else {
      fontSelectedLabels.clear()
      allLabels.forEach(item => {
        fontSelectedLabels.add(item.label)
        item.card.classList.add("selected")
        const cb = item.card.querySelector(".bg-item-checkbox")
        if (cb) cb.classList.add("checked")
      })
    }
    updateSelectCount()
  })

  if (DOM.fontFavoriteSelectedBtn) DOM.fontFavoriteSelectedBtn.addEventListener("click", () => {
    const settings = getSettings()
    let savedFonts = settings.userSavedFonts || []
    
    fontSelectedLabels.forEach(label => {
      const idx = savedFonts.findIndex(f => (typeof f === "string" ? f : f.label) === label)
      if (idx > -1) {
        if (typeof savedFonts[idx] === "string") {
          savedFonts[idx] = { label: savedFonts[idx], value: `"${savedFonts[idx]}", sans-serif`, isFavorite: true }
        } else {
          savedFonts[idx].isFavorite = !savedFonts[idx].isFavorite
        }
      } else {
        savedFonts.push({ label: label, isFavorite: true })
      }
    })

    updateSetting("userSavedFonts", savedFonts)
    saveSettings()
    exitSelectMode()
    renderFontGrid(DOM.fontGrid, updateSettingCallback)
  })

  if (DOM.fontDeleteSelectedBtn) DOM.fontDeleteSelectedBtn.addEventListener("click", async () => {
    if (fontSelectedLabels.size === 0) return
    if (await showConfirm(i18n.alert_delete_bg_confirm || "Delete selected items?")) {
      const settings = getSettings()
      let savedFonts = settings.userSavedFonts || []
      let changed = false

      for (const label of Array.from(fontSelectedLabels)) {
        const idx = savedFonts.findIndex(f => (typeof f === "string" ? f : f.label) === label)
        if (idx > -1) {
          const item = savedFonts[idx]
          if (item && (item.isLocal || item.isLocalFile) && item.fileId) {
            import("../../services/imageStore.js").then(m => {
              m.deleteImage(item.fileId).catch(console.error)
            })
          }
          savedFonts.splice(idx, 1)
          changed = true
        }
      }

      if (changed) {
        updateSetting("userSavedFonts", savedFonts)
        saveSettings()
      }
      exitSelectMode()
      renderFontGrid(DOM.fontGrid, updateSettingCallback)
    }
  })
}

export {
  PREDEFINED_FONTS,
  loadGoogleFont,
  initFont,
  renderFontGrid,
  renderSavedFonts,
  setupLocalFonts,
  setupMultiSelect as setupFontMultiSelect
}
