/**
 * Gradient V2 Manager Module
 * Handles UI interactions and management for the Gradient V2 background effect.
 */

import {
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"
import { showAlert, showConfirm } from "../../utils/dialog.js"
import { geti18n, applyTranslations } from "../../services/i18n.js"

let gradientV2Instance = null
let handleUpdateCallback = null
let isInitialized = false

// Multi-select state
let gradientV2SelectMode = false
let gradientV2SelectedIndices = new Set()

/**
 * Initialize the Gradient V2 Manager
 */
function initGradientV2Manager(dom, effectInstance, onUpdate) {
  if (isInitialized) return
  
  gradientV2Instance = effectInstance
  handleUpdateCallback = onUpdate
  
  const settings = getSettings()
  
  // Toggle UI visibility
  dom.gradientV2ToggleBtn.addEventListener("click", () => {
    const isHidden = dom.gradientV2Settings.style.display === "none"
    dom.gradientV2Settings.style.display = isHidden ? "block" : "none"
    dom.gradientV2ToggleLabel.setAttribute(
      "data-i18n",
      isHidden ? "settings_gradientV2_close" : "settings_gradientV2_open"
    )
    // Update labels via i18n helper
    applyTranslations()
  })

  // Hook up the Active checkbox
  if (dom.gradientV2Active) {
    dom.gradientV2Active.checked = settings.gradientV2Active
    dom.gradientV2Active.addEventListener("change", (e) => {
      const active = e.target.checked
      updateSetting("gradientV2Active", active)
      if (handleUpdateCallback) handleUpdateCallback("gradientV2Active", active)
      
      if (active && gradientV2Instance) {
        gradientV2Instance.start()
      } else if (!active && gradientV2Instance) {
        gradientV2Instance.stop()
      }
    })
  }

  // Hook up all property sliders and inputs
  const propsMap = [
    { id: "gradientV2Color1", dom: dom.gradientV2Color1, type: "color" },
    { id: "gradientV2Color2", dom: dom.gradientV2Color2, type: "color" },
    { id: "gradientV2Color3", dom: dom.gradientV2Color3, type: "color" },
    { id: "gradientV2TimeSpeed", dom: dom.gradientV2TimeSpeed, val: dom.gradientV2TimeSpeedValue, type: "range" },
    { id: "gradientV2ColorBalance", dom: dom.gradientV2ColorBalance, val: dom.gradientV2ColorBalanceValue, type: "range" },
    { id: "gradientV2WarpStrength", dom: dom.gradientV2WarpStrength, val: dom.gradientV2WarpStrengthValue, type: "range" },
    { id: "gradientV2WarpFrequency", dom: dom.gradientV2WarpFrequency, val: dom.gradientV2WarpFrequencyValue, type: "range" },
    { id: "gradientV2WarpSpeed", dom: dom.gradientV2WarpSpeed, val: dom.gradientV2WarpSpeedValue, type: "range" },
    { id: "gradientV2WarpAmplitude", dom: dom.gradientV2WarpAmplitude, val: dom.gradientV2WarpAmplitudeValue, type: "range" },
    { id: "gradientV2BlendAngle", dom: dom.gradientV2BlendAngle, val: dom.gradientV2BlendAngleValue, type: "range", suffix: "°" },
    { id: "gradientV2BlendSoftness", dom: dom.gradientV2BlendSoftness, val: dom.gradientV2BlendSoftnessValue, type: "range" },
    { id: "gradientV2RotationAmount", dom: dom.gradientV2RotationAmount, val: dom.gradientV2RotationAmountValue, type: "range" },
    { id: "gradientV2NoiseScale", dom: dom.gradientV2NoiseScale, val: dom.gradientV2NoiseScaleValue, type: "range" },
    { id: "gradientV2GrainAmount", dom: dom.gradientV2GrainAmount, val: dom.gradientV2GrainAmountValue, type: "range" },
    { id: "gradientV2GrainScale", dom: dom.gradientV2GrainScale, val: dom.gradientV2GrainScaleValue, type: "range" },
    { id: "gradientV2GrainAnimated", dom: dom.gradientV2GrainAnimated, type: "checkbox" },
    { id: "gradientV2Contrast", dom: dom.gradientV2Contrast, val: dom.gradientV2ContrastValue, type: "range" },
    { id: "gradientV2Gamma", dom: dom.gradientV2Gamma, val: dom.gradientV2GammaValue, type: "range" },
    { id: "gradientV2Saturation", dom: dom.gradientV2Saturation, val: dom.gradientV2SaturationValue, type: "range" },
    { id: "gradientV2CenterX", dom: dom.gradientV2CenterX, val: dom.gradientV2CenterXValue, type: "range" },
    { id: "gradientV2CenterY", dom: dom.gradientV2CenterY, val: dom.gradientV2CenterYValue, type: "range" },
    { id: "gradientV2Zoom", dom: dom.gradientV2Zoom, val: dom.gradientV2ZoomValue, type: "range" },
  ]

  propsMap.forEach(prop => {
    if (!prop.dom) return
    
    // Set initial values from state
    const currentVal = settings[prop.id]
    if (prop.type === "checkbox") {
      prop.dom.checked = currentVal
    } else {
      prop.dom.value = currentVal
      if (prop.val) prop.val.textContent = currentVal + (prop.suffix || "")
    }

    // Event listener
    const eventType = prop.type === "checkbox" ? "change" : (prop.type === "color" ? "change" : "input")
    prop.dom.addEventListener(eventType, (e) => {
      const value = prop.type === "checkbox" ? e.target.checked : (prop.type === "range" ? parseFloat(e.target.value) : e.target.value)
      
      if (prop.val) prop.val.textContent = value + (prop.suffix || "")
      
      updateSetting(prop.id, value)
      if (handleUpdateCallback) handleUpdateCallback(prop.id, value)
      
      // Live update effect
      if (gradientV2Instance) {
        const optionKey = prop.id.replace("gradientV2", "").charAt(0).toLowerCase() + prop.id.replace("gradientV2", "").slice(1)
        gradientV2Instance.setOptions({ [optionKey]: value })
      }
    })
  })

  // Randomize button
  dom.gradientV2RandomizeBtn.addEventListener("click", () => {
    const randomHex = () => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
    
    const randomProps = {
      gradientV2Color1: randomHex(),
      gradientV2Color2: randomHex(),
      gradientV2Color3: randomHex(),
      gradientV2TimeSpeed: parseFloat((Math.random() * 0.5 + 0.1).toFixed(2)),
      gradientV2WarpStrength: parseFloat((Math.random() * 2 + 0.5).toFixed(1)),
      gradientV2WarpFrequency: parseFloat((Math.random() * 10 + 2).toFixed(1)),
      gradientV2BlendAngle: Math.floor(Math.random() * 360),
    }

    Object.entries(randomProps).forEach(([id, val]) => {
      updateSetting(id, val)
      const propConfig = propsMap.find(p => p.id === id)
      if (propConfig && propConfig.dom) {
        propConfig.dom.value = val
        if (propConfig.val) propConfig.val.textContent = val + (propConfig.suffix || "")
      }
      if (handleUpdateCallback) handleUpdateCallback(id, val)
    })

    // Update effect
    if (gradientV2Instance) {
        const options = {}
        Object.entries(randomProps).forEach(([id, val]) => {
            const optionKey = id.replace("gradientV2", "").charAt(0).toLowerCase() + id.replace("gradientV2", "").slice(1)
            options[optionKey] = val
        })
        gradientV2Instance.setOptions(options)
    }
  })

  // Save button
  dom.gradientV2SaveBtn.addEventListener("click", () => {
    const currentSettings = getSettings()
    const newPreset = {
      id: Date.now(),
      color1: currentSettings.gradientV2Color1,
      color2: currentSettings.gradientV2Color2,
      color3: currentSettings.gradientV2Color3,
      timeSpeed: currentSettings.gradientV2TimeSpeed,
      colorBalance: currentSettings.gradientV2ColorBalance,
      warpStrength: currentSettings.gradientV2WarpStrength,
      warpFrequency: currentSettings.gradientV2WarpFrequency,
      warpSpeed: currentSettings.gradientV2WarpSpeed,
      warpAmplitude: currentSettings.gradientV2WarpAmplitude,
      blendAngle: currentSettings.gradientV2BlendAngle,
      blendSoftness: currentSettings.gradientV2BlendSoftness,
      rotationAmount: currentSettings.gradientV2RotationAmount,
      noiseScale: currentSettings.gradientV2NoiseScale,
      grainAmount: currentSettings.gradientV2GrainAmount,
      grainScale: currentSettings.gradientV2GrainScale,
      grainAnimated: currentSettings.gradientV2GrainAnimated,
      contrast: currentSettings.gradientV2Contrast,
      gamma: currentSettings.gradientV2Gamma,
      saturation: currentSettings.gradientV2Saturation,
      centerX: currentSettings.gradientV2CenterX,
      centerY: currentSettings.gradientV2CenterY,
      zoom: currentSettings.gradientV2Zoom,
    }

    const saved = currentSettings.userGradientV2s || []
    updateSetting("userGradientV2s", [...saved, newPreset])
    saveSettings()
    renderUserGradientV2s(dom)
    showAlert("Gradient V2 saved successfully!")
  })

  // Multi-select events
  setupMultiSelect(dom)
  
  isInitialized = true
}

/**
 * Render saved presets
 */
function renderUserGradientV2s(dom) {
  const { userGradientV2s } = getSettings()
  const gallery = dom.userGradientV2sGallery
  const galleryWrap = dom.gradientV2GalleryWrap
  
  if (!gallery) return

  gallery.innerHTML = ""

  if (!userGradientV2s || userGradientV2s.length === 0) {
    if (galleryWrap) galleryWrap.style.display = "none"
    updateCount(dom)
    return
  }

  if (galleryWrap) galleryWrap.style.display = "block"

  userGradientV2s.forEach((preset, index) => {
    const item = document.createElement("div")
    item.className = "local-bg-item user-gradientV2-item"
    if (gradientV2SelectedIndices.has(index)) item.classList.add("selected")
    item.dataset.index = index
    
    // Preview uses a CSS linear gradient as a simple representation
    const previewCss = `linear-gradient(${preset.blendAngle}deg, ${preset.color1}, ${preset.color2}, ${preset.color3})`
    item.style.background = previewCss
    
    item.innerHTML = `
      <div class="bg-item-overlay">
        <i class="fa-solid fa-play"></i>
      </div>
      ${gradientV2SelectMode ? `<div class="bg-item-checkbox ${gradientV2SelectedIndices.has(index) ? "checked" : ""}"><i class="fa-solid fa-check"></i></div>` : ""}
    `

    item.addEventListener("click", (e) => {
      if (gradientV2SelectMode) {
        toggleItemSelection(index, item, dom)
        return
      }
      applyPreset(preset, dom)
    })

    // Context menu or delete button could be here
    gallery.appendChild(item)
  })

  updateCount(dom)
}

function applyPreset(preset, dom) {
  Object.entries(preset).forEach(([key, val]) => {
    if (key === "id") return
    const stateKey = "gradientV2" + key.charAt(0).toUpperCase() + key.slice(1)
    updateSetting(stateKey, val)
    if (handleUpdateCallback) handleUpdateCallback(stateKey, val)
    
    // Update UI elements
    const input = document.getElementById(stateKey.replace(/([A-Z])/g, "-$1").toLowerCase())
    if (input) {
      if (input.type === "checkbox") input.checked = val
      else input.value = val
      const valLabel = document.getElementById(input.id + "-value")
      if (valLabel) valLabel.textContent = val + (input.id.includes("angle") ? "°" : "")
    }
  })

  // Activate and update instance
  updateSetting("gradientV2Active", true)
  if (handleUpdateCallback) handleUpdateCallback("gradientV2Active", true)
  if (dom.gradientV2Active) dom.gradientV2Active.checked = true
  
  if (gradientV2Instance) {
    gradientV2Instance.setOptions(preset)
    gradientV2Instance.start()
  }
}

function setupMultiSelect(dom) {
  dom.gradientV2SelectModeBtn.addEventListener("click", () => {
    const i18n = geti18n()
    gradientV2SelectMode = !gradientV2SelectMode
    gradientV2SelectedIndices.clear()
    dom.gradientV2SelectToolbar.style.display = gradientV2SelectMode ? "flex" : "none"
    dom.gradientV2SelectModeBtn.textContent = gradientV2SelectMode 
      ? (i18n.cancel || "Cancel") 
      : (i18n.bg_select_mode || "Select")
    renderUserGradientV2s(dom)
  })

  dom.gradientV2SelectCancelBtn.addEventListener("click", () => {
    const i18n = geti18n()
    gradientV2SelectMode = false
    gradientV2SelectedIndices.clear()
    dom.gradientV2SelectToolbar.style.display = "none"
    dom.gradientV2SelectModeBtn.textContent = i18n.bg_select_mode || "Select"
    renderUserGradientV2s(dom)
  })

  dom.gradientV2SelectAllBtn.addEventListener("click", () => {
    const { userGradientV2s } = getSettings()
    if (gradientV2SelectedIndices.size === userGradientV2s.length) {
      gradientV2SelectedIndices.clear()
    } else {
      userGradientV2s.forEach((_, i) => gradientV2SelectedIndices.add(i))
    }
    updateSelectionUI(dom)
    renderUserGradientV2s(dom)
  })

  dom.gradientV2DeleteSelectedBtn.addEventListener("click", async () => {
    if (gradientV2SelectedIndices.size === 0) return
    
    const i18n = geti18n()
    const confirmMsg = i18n.alert_delete_bg_confirm || `Delete ${gradientV2SelectedIndices.size} saved gradients?`
    const confirmed = await showConfirm(confirmMsg)
    if (confirmed) {
      const { userGradientV2s } = getSettings()
      const newList = userGradientV2s.filter((_, i) => !gradientV2SelectedIndices.has(i))
      updateSetting("userGradientV2s", newList)
      saveSettings()
      gradientV2SelectedIndices.clear()
      updateSelectionUI(dom)
      renderUserGradientV2s(dom)
    }
  })
}

function toggleItemSelection(index, el, dom) {
  if (gradientV2SelectedIndices.has(index)) {
    gradientV2SelectedIndices.delete(index)
    el.classList.remove("selected")
  } else {
    gradientV2SelectedIndices.add(index)
    el.classList.add("selected")
  }
  updateSelectionUI(dom)
  // Just update the checkbox without full re-render for performance
  const checkbox = el.querySelector(".bg-item-checkbox")
  if (checkbox) {
    checkbox.classList.toggle("checked", gradientV2SelectedIndices.has(index))
  }
}

function updateSelectionUI(dom) {
  dom.gradientV2SelectCount.textContent = `${gradientV2SelectedIndices.size} selected`
}

function updateCount(dom) {
  const countSpan = document.getElementById("count-gradientV2")
  if (countSpan) {
    const total = (getSettings().userGradientV2s || []).length
    countSpan.innerHTML = ` <span style="font-size:0.8rem;opacity:0.6;">(${total})</span>`
  }
}

export { initGradientV2Manager, renderUserGradientV2s }
