/**
 * Special Effects Manager Module
 * Handles Silk, Light Pillar, and Liquid Ether backgrounds.
 */

import {
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"
import { showAlert, showConfirm } from "../../utils/dialog.js"
import { geti18n } from "../../services/i18n.js"

// Multi-select state
let silkSelectMode = false
let silkSelectedIndices = new Set()

let lightPillarSelectMode = false
let lightPillarSelectedIndices = new Set()

let liquidEtherSelectMode = false
let liquidEtherSelectedIndices = new Set()

/**
 * Initialize all special effects UI handlers
 */
export function initSpecialEffectsManager(ctx, handleSettingUpdate) {
  const { DOM, effects } = ctx

  // --- Silk UI Setup ---
  const silkActive = document.getElementById("silk-active")
  if (silkActive) {
    silkActive.addEventListener("change", (e) => {
      handleSettingUpdate("silkActive", e.target.checked)
    })
  }

  const silkToggleBtn = document.getElementById("silk-toggle-btn")
  const silkSettings = document.getElementById("silk-settings")
  const silkToggleLabel = document.getElementById("silk-toggle-label")
  if (silkToggleBtn && silkSettings) {
    silkToggleBtn.addEventListener("click", () => {
      const isHidden = silkSettings.style.display === "none"
      silkSettings.style.display = isHidden ? "block" : "none"
      if (silkToggleLabel) {
        silkToggleLabel.textContent = isHidden ? "Close Silk" : "Open Silk"
      }
    })
  }

  const silkProps = [
    { id: "silkSpeed", dom: document.getElementById("silk-speed"), val: document.getElementById("silk-speed-value"), type: "float" },
    { id: "silkScale", dom: document.getElementById("silk-scale"), val: document.getElementById("silk-scale-value"), type: "float" },
    { id: "silkNoise", dom: document.getElementById("silk-noise"), val: document.getElementById("silk-noise-value"), type: "float" },
    { id: "silkRotation", dom: document.getElementById("silk-rotation"), val: document.getElementById("silk-rotation-value"), type: "float" }
  ]
  silkProps.forEach((prop) => {
    if (prop.dom) {
      prop.dom.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value)
        if (prop.val) prop.val.textContent = val.toFixed(1)
        updateSetting(prop.id, val)
        if (getSettings().silkActive && effects.silkEffect) {
          const optKey = prop.id.replace("silk", "").toLowerCase()
          effects.silkEffect.setOptions({ [optKey]: val })
        }
      })
      prop.dom.addEventListener("change", () => saveSettings())
    }
  })

  const silkColorPicker = document.getElementById("silk-color")
  if (silkColorPicker) {
    silkColorPicker.addEventListener("change", (e) => {
      handleSettingUpdate("silkColor", e.target.value)
      if (getSettings().silkActive && effects.silkEffect) {
        effects.silkEffect.setOptions({ color: e.target.value })
      }
    })
  }

  const silkRandomBtn = document.getElementById("silk-random-btn")
  if (silkRandomBtn) {
    silkRandomBtn.addEventListener("click", () => {
      const randomHex = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
      const randomProps = {
        silkColor: randomHex,
        silkSpeed: parseFloat((Math.random() * 10 + 1).toFixed(1)),
        silkScale: parseFloat((Math.random() * 3 + 0.5).toFixed(1)),
        silkNoise: parseFloat((Math.random() * 3 + 0.5).toFixed(1)),
        silkRotation: parseFloat((Math.random() * 6.28).toFixed(1))
      }
      Object.entries(randomProps).forEach(([id, val]) => {
        updateSetting(id, val)
        const propConfig = silkProps.find(p => p.id === id)
        if (propConfig && propConfig.dom) {
          propConfig.dom.value = val
          if (propConfig.val) propConfig.val.textContent = val.toFixed(1)
        }
      })
      if (silkColorPicker) silkColorPicker.value = randomHex
      saveSettings()
      if (getSettings().silkActive && effects.silkEffect) {
        effects.silkEffect.setOptions({
          color: randomProps.silkColor,
          speed: randomProps.silkSpeed,
          scale: randomProps.silkScale,
          noise: randomProps.silkNoise,
          rotation: randomProps.silkRotation
        })
      }
    })
  }

  const silkSaveBtn = document.getElementById("silk-save-btn")
  if (silkSaveBtn) {
    silkSaveBtn.addEventListener("click", () => {
      const currentSettings = getSettings()
      const preset = {
        id: Date.now(),
        color: currentSettings.silkColor,
        speed: currentSettings.silkSpeed,
        scale: currentSettings.silkScale,
        noise: currentSettings.silkNoise,
        rotation: currentSettings.silkRotation
      }
      const saved = currentSettings.userSilks || []
      updateSetting("userSilks", [...saved, preset])
      saveSettings()
      renderUserSilks()
      showAlert("Silk background saved!")
    })
  }

  // --- Light Pillar UI Setup ---
  const lightPillarActive = document.getElementById("light-pillar-active")
  if (lightPillarActive) {
    lightPillarActive.addEventListener("change", (e) => {
      handleSettingUpdate("lightPillarActive", e.target.checked)
    })
  }

  const lightPillarToggleBtn = document.getElementById("light-pillar-toggle-btn")
  const lightPillarSettings = document.getElementById("light-pillar-settings")
  const lightPillarToggleLabel = document.getElementById("light-pillar-toggle-label")
  if (lightPillarToggleBtn && lightPillarSettings) {
    lightPillarToggleBtn.addEventListener("click", () => {
      const isHidden = lightPillarSettings.style.display === "none"
      lightPillarSettings.style.display = isHidden ? "block" : "none"
      if (lightPillarToggleLabel) {
        lightPillarToggleLabel.textContent = isHidden ? "Close Light Pillar" : "Open Light Pillar"
      }
    })
  }

  const lightPillarProps = [
    { id: "lightPillarIntensity", dom: document.getElementById("light-pillar-intensity"), val: document.getElementById("light-pillar-intensity-value"), type: "float", toFixed: 1 },
    { id: "lightPillarRotationSpeed", dom: document.getElementById("light-pillar-rotation-speed"), val: document.getElementById("light-pillar-rotation-speed-value"), type: "float", toFixed: 1 },
    { id: "lightPillarGlowAmount", dom: document.getElementById("light-pillar-glow"), val: document.getElementById("light-pillar-glow-value"), type: "float", toFixed: 3 },
    { id: "lightPillarWidth", dom: document.getElementById("light-pillar-width"), val: document.getElementById("light-pillar-width-value"), type: "float", toFixed: 1 },
    { id: "lightPillarHeight", dom: document.getElementById("light-pillar-height"), val: document.getElementById("light-pillar-height-value"), type: "float", toFixed: 1 },
    { id: "lightPillarNoiseIntensity", dom: document.getElementById("light-pillar-noise"), val: document.getElementById("light-pillar-noise-value"), type: "float", toFixed: 1 },
    { id: "lightPillarRotation", dom: document.getElementById("light-pillar-rotation"), val: document.getElementById("light-pillar-rotation-value"), type: "int", toFixed: 0 }
  ]
  lightPillarProps.forEach((prop) => {
    if (prop.dom) {
      prop.dom.addEventListener("input", (e) => {
        const val = prop.type === "float" ? parseFloat(e.target.value) : parseInt(e.target.value)
        if (prop.val) prop.val.textContent = val.toFixed(prop.toFixed)
        updateSetting(prop.id, val)
        if (getSettings().lightPillarActive && effects.lightPillarEffect) {
          const optKey = prop.id.replace("lightPillar", "")
          const lowerKey = optKey.charAt(0).toLowerCase() + optKey.slice(1)
          effects.lightPillarEffect.setOptions({ [lowerKey]: val })
        }
      })
      prop.dom.addEventListener("change", () => saveSettings())
    }
  })

  const lpTopColorPicker = document.getElementById("light-pillar-top-color")
  if (lpTopColorPicker) {
    lpTopColorPicker.addEventListener("change", (e) => {
      handleSettingUpdate("lightPillarTopColor", e.target.value)
      if (getSettings().lightPillarActive && effects.lightPillarEffect) {
        effects.lightPillarEffect.setOptions({ topColor: e.target.value })
      }
    })
  }
  const lpBottomColorPicker = document.getElementById("light-pillar-bottom-color")
  if (lpBottomColorPicker) {
    lpBottomColorPicker.addEventListener("change", (e) => {
      handleSettingUpdate("lightPillarBottomColor", e.target.value)
      if (getSettings().lightPillarActive && effects.lightPillarEffect) {
        effects.lightPillarEffect.setOptions({ bottomColor: e.target.value })
      }
    })
  }

  const lpRandomBtn = document.getElementById("light-pillar-random-btn")
  if (lpRandomBtn) {
    lpRandomBtn.addEventListener("click", () => {
      const randomHex = () => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
      const randomProps = {
        lightPillarTopColor: randomHex(),
        lightPillarBottomColor: randomHex(),
        lightPillarIntensity: parseFloat((Math.random() * 3 + 0.5).toFixed(1)),
        lightPillarRotationSpeed: parseFloat((Math.random() * 1.5 + 0.1).toFixed(1)),
        lightPillarGlowAmount: parseFloat((Math.random() * 0.02 + 0.001).toFixed(3)),
        lightPillarWidth: parseFloat((Math.random() * 5 + 1).toFixed(1)),
        lightPillarHeight: parseFloat((Math.random() * 0.8 + 0.1).toFixed(1)),
        lightPillarNoiseIntensity: parseFloat((Math.random() * 1.5 + 0.1).toFixed(1)),
        lightPillarRotation: Math.floor(Math.random() * 360)
      }
      Object.entries(randomProps).forEach(([id, val]) => {
        updateSetting(id, val)
        const propConfig = lightPillarProps.find(p => p.id === id)
        if (propConfig && propConfig.dom) {
          propConfig.dom.value = val
          if (propConfig.val) propConfig.val.textContent = val.toFixed(propConfig.toFixed)
        }
      })
      if (lpTopColorPicker) lpTopColorPicker.value = randomProps.lightPillarTopColor
      if (lpBottomColorPicker) lpBottomColorPicker.value = randomProps.lightPillarBottomColor
      saveSettings()
      if (getSettings().lightPillarActive && effects.lightPillarEffect) {
        effects.lightPillarEffect.setOptions({
          topColor: randomProps.lightPillarTopColor,
          bottomColor: randomProps.lightPillarBottomColor,
          intensity: randomProps.lightPillarIntensity,
          rotationSpeed: randomProps.lightPillarRotationSpeed,
          glowAmount: randomProps.lightPillarGlowAmount,
          pillarWidth: randomProps.lightPillarWidth,
          pillarHeight: randomProps.lightPillarHeight,
          noiseIntensity: randomProps.lightPillarNoiseIntensity,
          pillarRotation: randomProps.lightPillarRotation
        })
      }
    })
  }

  const lpSaveBtn = document.getElementById("light-pillar-save-btn")
  if (lpSaveBtn) {
    lpSaveBtn.addEventListener("click", () => {
      const currentSettings = getSettings()
      const preset = {
        id: Date.now(),
        topColor: currentSettings.lightPillarTopColor,
        bottomColor: currentSettings.lightPillarBottomColor,
        intensity: currentSettings.lightPillarIntensity,
        rotationSpeed: currentSettings.lightPillarRotationSpeed,
        glowAmount: currentSettings.lightPillarGlowAmount,
        pillarWidth: currentSettings.lightPillarWidth,
        pillarHeight: currentSettings.lightPillarHeight,
        noiseIntensity: currentSettings.lightPillarNoiseIntensity,
        pillarRotation: currentSettings.lightPillarRotation
      }
      const saved = currentSettings.userLightPillars || []
      updateSetting("userLightPillars", [...saved, preset])
      saveSettings()
      renderUserLightPillars()
      showAlert("Light Pillar background saved!")
    })
  }

  // --- Liquid Ether UI Setup ---
  const liquidEtherActive = document.getElementById("liquid-ether-active")
  if (liquidEtherActive) {
    liquidEtherActive.addEventListener("change", (e) => {
      handleSettingUpdate("liquidEtherActive", e.target.checked)
    })
  }

  const liquidEtherToggleBtn = document.getElementById("liquid-ether-toggle-btn")
  const liquidEtherSettings = document.getElementById("liquid-ether-settings")
  const liquidEtherToggleLabel = document.getElementById("liquid-ether-toggle-label")
  if (liquidEtherToggleBtn && liquidEtherSettings) {
    liquidEtherToggleBtn.addEventListener("click", () => {
      const isHidden = liquidEtherSettings.style.display === "none"
      liquidEtherSettings.style.display = isHidden ? "block" : "none"
      if (liquidEtherToggleLabel) {
        liquidEtherToggleLabel.textContent = isHidden ? "Close Liquid Ether" : "Open Liquid Ether"
      }
    })
  }

  const leColor1 = document.getElementById("liquid-ether-color1")
  const leColor2 = document.getElementById("liquid-ether-color2")
  const leColor3 = document.getElementById("liquid-ether-color3")

  const updateLEColors = () => {
    const colors = [
      leColor1 ? leColor1.value : "#5227FF",
      leColor2 ? leColor2.value : "#FF9FFC",
      leColor3 ? leColor3.value : "#B497CF"
    ]
    updateSetting("liquidEtherColors", colors)
    saveSettings()
    if (getSettings().liquidEtherActive && effects.liquidEtherEffect) {
      effects.liquidEtherEffect.updateSettings({ colors })
    }
  }

  if (leColor1) leColor1.addEventListener("change", updateLEColors)
  if (leColor2) leColor2.addEventListener("change", updateLEColors)
  if (leColor3) leColor3.addEventListener("change", updateLEColors)

  const leGlowWidth = document.getElementById("liquid-ether-glow-width")
  const leGlowWidthVal = document.getElementById("liquid-ether-glow-width-value")
  if (leGlowWidth) {
    leGlowWidth.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value)
      if (leGlowWidthVal) leGlowWidthVal.textContent = val.toFixed(1)
      updateSetting("liquidEtherGlowWidth", val)
      if (getSettings().liquidEtherActive && effects.liquidEtherEffect) {
        effects.liquidEtherEffect.updateSettings({ glowWidth: val })
      }
    })
    leGlowWidth.addEventListener("change", () => saveSettings())
  }

  const leRandomBtn = document.getElementById("liquid-ether-random-btn")
  if (leRandomBtn) {
    leRandomBtn.addEventListener("click", () => {
      const randomHex = () => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
      const colors = [randomHex(), randomHex(), randomHex()]
      const glowWidth = parseFloat((Math.random() * 8 + 1).toFixed(1))
      
      updateSetting("liquidEtherColors", colors)
      updateSetting("liquidEtherGlowWidth", glowWidth)
      
      if (leColor1) leColor1.value = colors[0]
      if (leColor2) leColor2.value = colors[1]
      if (leColor3) leColor3.value = colors[2]
      if (leGlowWidth) leGlowWidth.value = glowWidth
      if (leGlowWidthVal) leGlowWidthVal.textContent = glowWidth.toFixed(1)
      
      saveSettings()
      if (getSettings().liquidEtherActive && effects.liquidEtherEffect) {
        effects.liquidEtherEffect.updateSettings({ colors, glowWidth })
      }
    })
  }

  const leSaveBtn = document.getElementById("liquid-ether-save-btn")
  if (leSaveBtn) {
    leSaveBtn.addEventListener("click", () => {
      const currentSettings = getSettings()
      const preset = {
        id: Date.now(),
        colors: currentSettings.liquidEtherColors || ["#5227FF", "#FF9FFC", "#B497CF"],
        glowWidth: currentSettings.liquidEtherGlowWidth || 5.5
      }
      const saved = currentSettings.userLiquidEthers || []
      updateSetting("userLiquidEthers", [...saved, preset])
      saveSettings()
      renderUserLiquidEthers()
      showAlert("Liquid Ether background saved!")
    })
  }

  // Setup multi-select
  setupEffectMultiSelect('silk', handleSettingUpdate)
  setupEffectMultiSelect('light-pillar', handleSettingUpdate)
  setupEffectMultiSelect('liquid-ether', handleSettingUpdate)
}

function updateGalleryCount(key, countId) {
  const countSpan = document.getElementById(countId)
  if (countSpan) {
    const total = (getSettings()[key] || []).length
    countSpan.innerHTML = ` <span style="font-size:0.8rem;opacity:0.6;">(${total})</span>`
  }
}

export function renderUserSilks() {
  const settings = getSettings()
  const { userSilks } = settings
  const gallery = document.getElementById("user-silks-gallery")
  const galleryWrap = document.getElementById("user-silks-gallery-wrap")
  
  if (!gallery) return
  gallery.innerHTML = ""

  if (!userSilks || userSilks.length === 0) {
    if (galleryWrap) galleryWrap.style.display = "none"
    updateGalleryCount("userSilks", "count-silk")
    return
  }
  if (galleryWrap) galleryWrap.style.display = "block"

  userSilks.forEach((preset, index) => {
    const item = document.createElement("div")
    item.className = "local-bg-item user-silk-item"

    const isActive =
      settings.silkActive &&
      !settings.background &&
      settings.silkColor === preset.color &&
      settings.silkSpeed === preset.speed

    if (isActive) item.classList.add("active")
    if (silkSelectedIndices.has(index)) item.classList.add("selected")
    item.style.background = preset.color || "#7B7481"
    item.innerHTML = `
      <div class="bg-item-overlay"><i class="fa-solid fa-play"></i></div>
      <div class="bg-item-checkbox ${silkSelectedIndices.has(index) ? "checked" : ""}"><i class="fa-solid fa-check"></i></div>
      <div class="active-indicator"><i class="fa-solid fa-check"></i></div>
    `
    item.addEventListener("click", () => {
      if (silkSelectMode) {
        const checkbox = item.querySelector(".bg-item-checkbox")
        if (silkSelectedIndices.has(index)) {
          silkSelectedIndices.delete(index)
          item.classList.remove("selected")
          if (checkbox) checkbox.classList.remove("checked")
        } else {
          silkSelectedIndices.add(index)
          item.classList.add("selected")
          if (checkbox) checkbox.classList.add("checked")
        }
        const countEl = document.getElementById("silk-select-count")
        const i18n = geti18n()
        if (countEl) countEl.textContent = `${silkSelectedIndices.size} ${i18n.bookmark_selected || 'selected'}`
        return
      }
      applySilkPreset(preset)
    })
    gallery.appendChild(item)
  })
  updateGalleryCount("userSilks", "count-silk")
}

function applySilkPreset(preset) {
  updateSetting("silkColor", preset.color)
  updateSetting("silkSpeed", preset.speed)
  updateSetting("silkScale", preset.scale)
  updateSetting("silkNoise", preset.noise)
  updateSetting("silkRotation", preset.rotation)
  updateSetting("background", null)
  
  window.dispatchEvent(new CustomEvent('specialEffectPresetApplied', { 
    detail: { type: 'silk', preset } 
  }));
}

export function renderUserLightPillars() {
  const settings = getSettings()
  const { userLightPillars } = settings
  const gallery = document.getElementById("user-light-pillars-gallery")
  const galleryWrap = document.getElementById("user-light-pillars-gallery-wrap")
  
  if (!gallery) return
  gallery.innerHTML = ""

  if (!userLightPillars || userLightPillars.length === 0) {
    if (galleryWrap) galleryWrap.style.display = "none"
    updateGalleryCount("userLightPillars", "count-light-pillar")
    return
  }
  if (galleryWrap) galleryWrap.style.display = "block"

  userLightPillars.forEach((preset, index) => {
    const item = document.createElement("div")
    item.className = "local-bg-item user-light-pillar-item"
    
    const isActive =
      settings.lightPillarActive &&
      !settings.background &&
      settings.lightPillarTopColor === preset.topColor &&
      settings.lightPillarBottomColor === preset.bottomColor

    if (isActive) item.classList.add("active")
    if (lightPillarSelectedIndices.has(index)) item.classList.add("selected")
    item.style.background = `linear-gradient(to bottom, ${preset.topColor || '#5227FF'}, ${preset.bottomColor || '#FF9FFC'})`
    item.innerHTML = `
      <div class="bg-item-overlay"><i class="fa-solid fa-play"></i></div>
      <div class="bg-item-checkbox ${lightPillarSelectedIndices.has(index) ? "checked" : ""}"><i class="fa-solid fa-check"></i></div>
      <div class="active-indicator"><i class="fa-solid fa-check"></i></div>
    `
    item.addEventListener("click", () => {
      if (lightPillarSelectMode) {
        const checkbox = item.querySelector(".bg-item-checkbox")
        if (lightPillarSelectedIndices.has(index)) {
          lightPillarSelectedIndices.delete(index)
          item.classList.remove("selected")
          if (checkbox) checkbox.classList.remove("checked")
        } else {
          lightPillarSelectedIndices.add(index)
          item.classList.add("selected")
          if (checkbox) checkbox.classList.add("checked")
        }
        const countEl = document.getElementById("light-pillar-select-count")
        const i18n = geti18n()
        if (countEl) countEl.textContent = `${lightPillarSelectedIndices.size} ${i18n.bookmark_selected || 'selected'}`
        return
      }
      applyLightPillarPreset(preset)
    })
    gallery.appendChild(item)
  })
  updateGalleryCount("userLightPillars", "count-light-pillar")
}

function applyLightPillarPreset(preset) {
  updateSetting("lightPillarTopColor", preset.topColor)
  updateSetting("lightPillarBottomColor", preset.bottomColor)
  updateSetting("lightPillarIntensity", preset.intensity)
  updateSetting("lightPillarRotationSpeed", preset.rotationSpeed)
  updateSetting("lightPillarGlowAmount", preset.glowAmount)
  updateSetting("lightPillarWidth", preset.pillarWidth)
  updateSetting("lightPillarHeight", preset.pillarHeight)
  updateSetting("lightPillarNoiseIntensity", preset.noiseIntensity)
  updateSetting("lightPillarRotation", preset.pillarRotation)
  updateSetting("background", null)
  
  window.dispatchEvent(new CustomEvent('specialEffectPresetApplied', { 
    detail: { type: 'light-pillar', preset } 
  }));
}

export function renderUserLiquidEthers() {
  const settings = getSettings()
  const { userLiquidEthers } = settings
  const gallery = document.getElementById("user-liquid-ethers-gallery")
  const galleryWrap = document.getElementById("user-liquid-ethers-gallery-wrap")
  
  if (!gallery) return
  gallery.innerHTML = ""

  if (!userLiquidEthers || userLiquidEthers.length === 0) {
    if (galleryWrap) galleryWrap.style.display = "none"
    updateGalleryCount("userLiquidEthers", "count-liquid-ether")
    return
  }
  if (galleryWrap) galleryWrap.style.display = "block"

  userLiquidEthers.forEach((preset, index) => {
    const item = document.createElement("div")
    item.className = "local-bg-item user-liquid-ether-item"

    const colors = preset.colors || ["#5227FF", "#FF9FFC", "#B497CF"]
    const sColors = settings.liquidEtherColors || []
    const isActive =
      settings.liquidEtherActive &&
      !settings.background &&
      sColors[0] === colors[0] &&
      sColors[1] === colors[1]

    if (isActive) item.classList.add("active")
    if (liquidEtherSelectedIndices.has(index)) item.classList.add("selected")
    item.style.background = `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`
    item.innerHTML = `
      <div class="bg-item-overlay"><i class="fa-solid fa-play"></i></div>
      <div class="bg-item-checkbox ${liquidEtherSelectedIndices.has(index) ? "checked" : ""}"><i class="fa-solid fa-check"></i></div>
      <div class="active-indicator"><i class="fa-solid fa-check"></i></div>
    `
    item.addEventListener("click", () => {
      if (liquidEtherSelectMode) {
        const checkbox = item.querySelector(".bg-item-checkbox")
        if (liquidEtherSelectedIndices.has(index)) {
          liquidEtherSelectedIndices.delete(index)
          item.classList.remove("selected")
          if (checkbox) checkbox.classList.remove("checked")
        } else {
          liquidEtherSelectedIndices.add(index)
          item.classList.add("selected")
          if (checkbox) checkbox.classList.add("checked")
        }
        const countEl = document.getElementById("liquid-ether-select-count")
        const i18n = geti18n()
        if (countEl) countEl.textContent = `${liquidEtherSelectedIndices.size} ${i18n.bookmark_selected || 'selected'}`
        return
      }
      applyLiquidEtherPreset(preset)
    })
    gallery.appendChild(item)
  })
  updateGalleryCount("userLiquidEthers", "count-liquid-ether")
}

function applyLiquidEtherPreset(preset) {
  const colors = preset.colors || ["#5227FF", "#FF9FFC", "#B497CF"]
  updateSetting("liquidEtherColors", colors)
  updateSetting("liquidEtherGlowWidth", preset.glowWidth)
  updateSetting("background", null)
  
  window.dispatchEvent(new CustomEvent('specialEffectPresetApplied', { 
    detail: { type: 'liquid-ether', preset } 
  }));
}

function setupEffectMultiSelect(type, handleSettingUpdate) {
  const selectModeBtn = document.getElementById(`${type}-select-mode-btn`)
  const toolbar = document.getElementById(`${type}-select-toolbar`)
  const cancelBtn = document.getElementById(`${type}-select-cancel-btn`)
  const selectAllBtn = document.getElementById(`${type}-select-all-btn`)
  const deleteBtn = document.getElementById(`${type}-delete-selected-btn`)
  const countEl = document.getElementById(`${type}-select-count`)

  if (selectModeBtn) {
    selectModeBtn.addEventListener("click", () => {
      if (type === 'silk') { silkSelectMode = !silkSelectMode; silkSelectedIndices.clear() }
      else if (type === 'light-pillar') { lightPillarSelectMode = !lightPillarSelectMode; lightPillarSelectedIndices.clear() }
      else if (type === 'liquid-ether') { liquidEtherSelectMode = !liquidEtherSelectMode; liquidEtherSelectedIndices.clear() }
      
      const i18n = geti18n()
      const isMode = type === 'silk' ? silkSelectMode : (type === 'light-pillar' ? lightPillarSelectMode : liquidEtherSelectMode)
      if (toolbar) toolbar.style.display = isMode ? "flex" : "none"
      selectModeBtn.textContent = isMode 
        ? (i18n.cancel || "Cancel") 
        : (i18n.bg_select_mode || "Select")
      
      if (countEl) countEl.textContent = `0 ${i18n.bookmark_selected || 'selected'}`
      
      if (type === 'silk') renderUserSilks()
      else if (type === 'light-pillar') renderUserLightPillars()
      else if (type === 'liquid-ether') renderUserLiquidEthers()
    })
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      const i18n = geti18n()
      if (type === 'silk') silkSelectMode = false
      else if (type === 'light-pillar') lightPillarSelectMode = false
      else if (type === 'liquid-ether') liquidEtherSelectMode = false
      
      if (toolbar) toolbar.style.display = "none"
      if (selectModeBtn) selectModeBtn.textContent = i18n.bg_select_mode || "Select"
      
      if (type === 'silk') renderUserSilks()
      else if (type === 'light-pillar') renderUserLightPillars()
      else if (type === 'liquid-ether') renderUserLiquidEthers()
    })
  }

  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", () => {
      const key = type === 'silk' ? 'userSilks' : (type === 'light-pillar' ? 'userLightPillars' : 'userLiquidEthers')
      const items = getSettings()[key] || []
      let indicesSet = type === 'silk' ? silkSelectedIndices : (type === 'light-pillar' ? lightPillarSelectedIndices : liquidEtherSelectedIndices)
      
      const itemElements = document.querySelectorAll(`.user-${type}-item`)
      if (indicesSet.size === items.length) {
        indicesSet.clear()
        itemElements.forEach(el => {
          el.classList.remove("selected")
          const cb = el.querySelector(".bg-item-checkbox")
          if (cb) cb.classList.remove("checked")
        })
      } else {
        items.forEach((_, i) => indicesSet.add(i))
        itemElements.forEach(el => {
          el.classList.add("selected")
          const cb = el.querySelector(".bg-item-checkbox")
          if (cb) cb.classList.add("checked")
        })
      }
      
      const i18n = geti18n()
      if (countEl) countEl.textContent = `${indicesSet.size} ${i18n.bookmark_selected || 'selected'}`
    })
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const i18n = geti18n()
      let indicesSet = type === 'silk' ? silkSelectedIndices : (type === 'light-pillar' ? lightPillarSelectedIndices : liquidEtherSelectedIndices)
      if (indicesSet.size === 0) return
      
      const confirmMsg = i18n.alert_delete_bg_confirm || `Delete ${indicesSet.size} saved items?`
      const confirmed = await showConfirm(confirmMsg)
      if (confirmed) {
        const key = type === 'silk' ? 'userSilks' : (type === 'light-pillar' ? 'userLightPillars' : 'userLiquidEthers')
        const items = getSettings()[key] || []
        const newList = items.filter((_, i) => !indicesSet.has(i))
        updateSetting(key, newList)
        saveSettings()
        indicesSet.clear()
        if (countEl) countEl.textContent = `0 ${i18n.bookmark_selected || 'selected'}`
        if (type === 'silk') renderUserSilks()
        else if (type === 'light-pillar') renderUserLightPillars()
        else if (type === 'liquid-ether') renderUserLiquidEthers()
      }
    })
  }
}
