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
let gradientV2InstanceGetter = null
let handleUpdateCallback = null
let isInitialized = false

function getGradientV2Instance() {
  if (typeof gradientV2InstanceGetter === "function") {
    gradientV2Instance = gradientV2InstanceGetter()
  }
  return gradientV2Instance
}

// Multi-select state
let gradientV2SelectMode = false
let gradientV2SelectedIndices = new Set()

/**
 * Initialize the Gradient V2 Manager
 */
function initGradientV2Manager(dom, effectInstance, onUpdate) {
  if (isInitialized) return
  
  if (typeof effectInstance === "function") {
    gradientV2InstanceGetter = effectInstance
  } else {
    gradientV2Instance = effectInstance
  }
  handleUpdateCallback = onUpdate
  
  const settings = getSettings()
  
  // Toggle UI visibility with safety checks
  const toggleBtn = dom.gradientV2ToggleBtn || document.getElementById("gradient-v2-toggle-btn")
  const settingsPanel = dom.gradientV2Settings || document.getElementById("gradient-v2-settings")
  const toggleLabel = dom.gradientV2ToggleLabel || document.getElementById("gradient-v2-toggle-label")

  if (toggleBtn && settingsPanel) {
    const isInitiallyHidden = settingsPanel.style.display === "none"
    settingsPanel.style.display = "block"
    settingsPanel.classList.toggle("is-collapsed", isInitiallyHidden)
    toggleBtn.setAttribute("aria-expanded", String(!isInitiallyHidden))
    toggleBtn.addEventListener("click", () => {
      const isHidden = settingsPanel.classList.contains("is-collapsed")
      settingsPanel.style.display = "block"
      settingsPanel.classList.toggle("is-collapsed", !isHidden)
      toggleBtn.setAttribute("aria-expanded", String(isHidden))
      if (toggleLabel) {
        toggleLabel.setAttribute(
          "data-i18n",
          isHidden ? "settings_gradientV2_close" : "settings_gradientV2_open"
        )
      }
      // Update labels via i18n helper
      applyTranslations()
    })
  }

  // Hook up the Active checkbox
  const activeCheckbox = dom.gradientV2Active || document.getElementById("gradient-v2-active")
  if (activeCheckbox) {
    activeCheckbox.checked = settings.gradientV2Active
    activeCheckbox.addEventListener("change", (e) => {
      const active = e.target.checked
      if (handleUpdateCallback) handleUpdateCallback("gradientV2Active", active)
      
      const instance = getGradientV2Instance()
      if (active && instance) {
        instance.start()
      } else if (!active && instance) {
        instance.stop()
      }
    })
  }

  // Hook up all property sliders and inputs
  const propsMap = [
    { id: "gradientV2Color1", dom: dom.gradientV2Color1 || document.getElementById("gradient-v2-color1"), type: "color" },
    { id: "gradientV2Color2", dom: dom.gradientV2Color2 || document.getElementById("gradient-v2-color2"), type: "color" },
    { id: "gradientV2Color3", dom: dom.gradientV2Color3 || document.getElementById("gradient-v2-color3"), type: "color" },
    { id: "gradientV2TimeSpeed", dom: dom.gradientV2TimeSpeed || document.getElementById("gradient-v2-time-speed"), val: dom.gradientV2TimeSpeedValue || document.getElementById("gradient-v2-time-speed-value"), type: "range" },
    { id: "gradientV2ColorBalance", dom: dom.gradientV2ColorBalance || document.getElementById("gradient-v2-color-balance"), val: dom.gradientV2ColorBalanceValue || document.getElementById("gradient-v2-color-balance-value"), type: "range" },
    { id: "gradientV2WarpStrength", dom: dom.gradientV2WarpStrength || document.getElementById("gradient-v2-warp-strength"), val: dom.gradientV2WarpStrengthValue || document.getElementById("gradient-v2-warp-strength-value"), type: "range" },
    { id: "gradientV2WarpFrequency", dom: dom.gradientV2WarpFrequency || document.getElementById("gradient-v2-warp-frequency"), val: dom.gradientV2WarpFrequencyValue || document.getElementById("gradient-v2-warp-frequency-value"), type: "range" },
    { id: "gradientV2WarpSpeed", dom: dom.gradientV2WarpSpeed || document.getElementById("gradient-v2-warp-speed"), val: dom.gradientV2WarpSpeedValue || document.getElementById("gradient-v2-warp-speed-value"), type: "range" },
    { id: "gradientV2WarpAmplitude", dom: dom.gradientV2WarpAmplitude || document.getElementById("gradient-v2-warp-amplitude"), val: dom.gradientV2WarpAmplitudeValue || document.getElementById("gradient-v2-warp-amplitude-value"), type: "range" },
    { id: "gradientV2BlendAngle", dom: dom.gradientV2BlendAngle || document.getElementById("gradient-v2-blend-angle"), val: dom.gradientV2BlendAngleValue || document.getElementById("gradient-v2-blend-angle-value"), type: "range", suffix: "°" },
    { id: "gradientV2BlendSoftness", dom: dom.gradientV2BlendSoftness || document.getElementById("gradient-v2-blend-softness"), val: dom.gradientV2BlendSoftnessValue || document.getElementById("gradient-v2-blend-softness-value"), type: "range" },
    { id: "gradientV2RotationAmount", dom: dom.gradientV2RotationAmount || document.getElementById("gradient-v2-rotation-amount"), val: dom.gradientV2RotationAmountValue || document.getElementById("gradient-v2-rotation-amount-value"), type: "range" },
    { id: "gradientV2NoiseScale", dom: dom.gradientV2NoiseScale || document.getElementById("gradient-v2-noise-scale"), val: dom.gradientV2NoiseScaleValue || document.getElementById("gradient-v2-noise-scale-value"), type: "range" },
    { id: "gradientV2GrainAmount", dom: dom.gradientV2GrainAmount || document.getElementById("gradient-v2-grain-amount"), val: dom.gradientV2GrainAmountValue || document.getElementById("gradient-v2-grain-amount-value"), type: "range" },
    { id: "gradientV2GrainScale", dom: dom.gradientV2GrainScale || document.getElementById("gradient-v2-grain-scale"), val: dom.gradientV2GrainScaleValue || document.getElementById("gradient-v2-grain-scale-value"), type: "range" },
    { id: "gradientV2GrainAnimated", dom: dom.gradientV2GrainAnimated || document.getElementById("gradient-v2-grain-animated"), type: "checkbox" },
    { id: "gradientV2Contrast", dom: dom.gradientV2Contrast || document.getElementById("gradient-v2-contrast"), val: dom.gradientV2ContrastValue || document.getElementById("gradient-v2-contrast-value"), type: "range" },
    { id: "gradientV2Gamma", dom: dom.gradientV2Gamma || document.getElementById("gradient-v2-gamma"), val: dom.gradientV2GammaValue || document.getElementById("gradient-v2-gamma-value"), type: "range" },
    { id: "gradientV2Saturation", dom: dom.gradientV2Saturation || document.getElementById("gradient-v2-saturation"), val: dom.gradientV2SaturationValue || document.getElementById("gradient-v2-saturation-value"), type: "range" },
    { id: "gradientV2CenterX", dom: dom.gradientV2CenterX || document.getElementById("gradient-v2-center"), val: dom.gradientV2CenterXValue || document.getElementById("gradient-v2-center-x-value"), type: "range" },
    { id: "gradientV2CenterY", dom: dom.gradientV2CenterY || document.getElementById("gradient-v2-center-y"), val: dom.gradientV2CenterYValue || document.getElementById("gradient-v2-center-y-value"), type: "range" },
    { id: "gradientV2Zoom", dom: dom.gradientV2Zoom || document.getElementById("gradient-v2-zoom"), val: dom.gradientV2ZoomValue || document.getElementById("gradient-v2-zoom-value"), type: "range" },
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
      const instance = getGradientV2Instance()
      if (instance) {
        const optionKey = prop.id.replace("gradientV2", "").charAt(0).toLowerCase() + prop.id.replace("gradientV2", "").slice(1)
        instance.setOptions({ [optionKey]: value })
      }
    })
  })

  // Randomize button
  const randomizeBtn = dom.gradientV2RandomizeBtn || document.getElementById("gradient-v2-randomize-btn")
  if (randomizeBtn) {
    randomizeBtn.addEventListener("click", () => {
      const themes = [
        {
          name: "Deep Aurora",
          palettes: [["#00c6ff", "#0072ff", "#12c2e9"], ["#0f0c29", "#302b63", "#24243e"]],
          warp: [0.8, 1.5], freq: [4, 9], zoom: [0.8, 1.2], speed: [0.2, 0.4]
        },
        {
          name: "Cosmic Nebula",
          palettes: [["#fc00ff", "#00dbde", "#191919"], ["#7028e4", "#e5b2ca", "#121212"]],
          warp: [1.2, 2.5], freq: [8, 15], zoom: [0.5, 0.9], speed: [0.1, 0.3]
        },
        {
          name: "Golden Sunset",
          palettes: [["#ff5f6d", "#ffc371", "#ffffff"], ["#f7971e", "#ffd200", "#ff4e50"]],
          warp: [0.3, 0.8], freq: [2, 5], zoom: [1.2, 2.0], speed: [0.05, 0.2]
        },
        {
          name: "Oceanic Wave",
          palettes: [["#2af598", "#009efd", "#000000"], ["#4facfe", "#00f2fe", "#ffffff"]],
          warp: [0.5, 1.2], freq: [3, 7], zoom: [1.0, 1.5], speed: [0.15, 0.4]
        },
        {
          name: "Cyber Grid",
          palettes: [["#00ff00", "#000000", "#333333"], ["#ff00ff", "#000000", "#111111"]],
          warp: [2.0, 4.0], freq: [12, 25], zoom: [0.3, 0.7], speed: [0.5, 1.0]
        },
        {
          name: "Pastel Dream",
          palettes: [["#ff9a9e", "#fecfef", "#a1c4fd"], ["#fdfcfb", "#e2d1c3", "#cfd9df"]],
          warp: [0.2, 0.5], freq: [1, 4], zoom: [1.5, 3.0], speed: [0.05, 0.15]
        }
      ]
      
      const theme = themes[Math.floor(Math.random() * themes.length)]
      const palette = theme.palettes[Math.floor(Math.random() * theme.palettes.length)]
      
      const rand = (range) => parseFloat((Math.random() * (range[1] - range[0]) + range[0]).toFixed(2))

      const randomProps = {
        gradientV2Color1: palette[0],
        gradientV2Color2: palette[1],
        gradientV2Color3: palette[2],
        gradientV2TimeSpeed: rand(theme.speed),
        gradientV2WarpStrength: rand(theme.warp),
        gradientV2WarpFrequency: rand(theme.freq),
        gradientV2WarpSpeed: rand([1.0, 3.0]),
        gradientV2BlendAngle: Math.floor(Math.random() * 360),
        gradientV2Zoom: rand(theme.zoom),
        gradientV2Contrast: rand([1.2, 1.8]),
        gradientV2Saturation: rand([0.8, 1.5]),
        gradientV2NoiseScale: rand([1.0, 5.0]),
        gradientV2ColorBalance: rand([0.1, 0.6]),
        gradientV2BlendSoftness: rand([0.01, 0.1])
      }

      Object.entries(randomProps).forEach(([id, val]) => {
        updateSetting(id, val)
        const propConfig = propsMap.find(p => p.id === id)
        if (propConfig && propConfig.dom) {
          if (propConfig.type === "checkbox") propConfig.dom.checked = val
          else propConfig.dom.value = val
          if (propConfig.val) propConfig.val.textContent = val + (propConfig.suffix || "")
        }
        if (handleUpdateCallback) handleUpdateCallback(id, val)
      })

      // Update effect
      const instance = getGradientV2Instance()
      if (instance) {
          const options = {}
          Object.entries(randomProps).forEach(([id, val]) => {
              const optionKey = id.replace("gradientV2", "").charAt(0).toLowerCase() + id.replace("gradientV2", "").slice(1)
              options[optionKey] = val
          })
          instance.setOptions(options)
      }
    })
  }

  // Save button
  const saveBtn = dom.gradientV2SaveBtn || document.getElementById("gradient-v2-save-btn")
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
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
  }

  // Multi-select events
  setupMultiSelect(dom)
  
  isInitialized = true
}

/**
 * Render saved presets
 */
function renderUserGradientV2s(dom) {
  const { userGradientV2s } = getSettings()
  const gallery = dom.userGradientV2sGallery || document.getElementById("user-gradient-v2s-gallery")
  const galleryWrap = dom.gradientV2GalleryWrap || document.getElementById("user-gradient-v2s-gallery-wrap")
  
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
      item.className = "local-bg-item user-gradient-v2-item"
      
      const settings = getSettings()
      const isActive =
        settings.gradientV2Active &&
        !settings.background &&
        settings.gradientV2Color1 === preset.color1 &&
        settings.gradientV2Color2 === preset.color2 &&
        settings.gradientV2Color3 === preset.color3

      if (isActive) item.classList.add("active")
      if (gradientV2SelectedIndices.has(index)) item.classList.add("selected")
      item.dataset.index = index
    
    // Preview uses a CSS linear gradient as a simple representation
    const previewCss = `linear-gradient(${preset.blendAngle}deg, ${preset.color1}, ${preset.color2}, ${preset.color3})`
    item.style.background = previewCss
    
    item.innerHTML = `
      <div class="bg-item-overlay">
        <i class="fa-solid fa-play"></i>
      </div>
      <button class="remove-bg-btn" title="Delete" aria-label="Delete">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div class="bg-item-checkbox ${gradientV2SelectedIndices.has(index) ? "checked" : ""}"><i class="fa-solid fa-check"></i></div>
    `

    const removeBtn = item.querySelector(".remove-bg-btn")
    removeBtn?.addEventListener("click", async (e) => {
      e.stopPropagation()
      const i18n = geti18n()
      const confirmed = await showConfirm(
        i18n.alert_delete_bg_confirm || "Delete this saved background?",
      )
      if (!confirmed) return

      const { userGradientV2s: current = [] } = getSettings()
      updateSetting(
        "userGradientV2s",
        current.filter((_, i) => i !== index),
      )
      saveSettings()
      gradientV2SelectedIndices.delete(index)
      renderUserGradientV2s(dom)
    })

    item.addEventListener("click", (e) => {
      e.stopPropagation()
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
  if (handleUpdateCallback) handleUpdateCallback("gradientV2Active", true)
  const activeCheckbox = dom.gradientV2Active || document.getElementById("gradient-v2-active")
  if (activeCheckbox) activeCheckbox.checked = true
  
  const instance = getGradientV2Instance()
  if (instance) {
    instance.setOptions(preset)
    instance.start()
  }
}

function toggleItemSelection(index, item, dom) {
  const isSelected = gradientV2SelectedIndices.has(index)
  const checkbox = item.querySelector(".bg-item-checkbox")
  if (isSelected) {
    gradientV2SelectedIndices.delete(index)
    item.classList.remove("selected")
    if (checkbox) checkbox.classList.remove("checked")
  } else {
    gradientV2SelectedIndices.add(index)
    item.classList.add("selected")
    if (checkbox) checkbox.classList.add("checked")
  }
  updateSelectionUI(dom)
}

function setupMultiSelect(dom) {
  const selectModeBtn = dom.gradientV2SelectModeBtn || document.getElementById("gradient-v2-select-mode-btn")
  const toolbar = dom.gradientV2SelectToolbar || document.getElementById("gradient-v2-select-toolbar")
  const cancelBtn = dom.gradientV2SelectCancelBtn || document.getElementById("gradient-v2-select-cancel-btn")
  const selectAllBtn = dom.gradientV2SelectAllBtn || document.getElementById("gradient-v2-select-all-btn")
  const deleteBtn = dom.gradientV2DeleteSelectedBtn || document.getElementById("gradient-v2-delete-selected-btn")

  if (selectModeBtn) {
    selectModeBtn.addEventListener("click", () => {
      const i18n = geti18n()
      gradientV2SelectMode = !gradientV2SelectMode
      gradientV2SelectedIndices.clear()
      if (toolbar) toolbar.style.display = gradientV2SelectMode ? "flex" : "none"
      selectModeBtn.textContent = gradientV2SelectMode 
        ? (i18n.cancel || "Cancel") 
        : (i18n.bg_select_mode || "Select")
      renderUserGradientV2s(dom)
    })
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      const i18n = geti18n()
      gradientV2SelectMode = false
      gradientV2SelectedIndices.clear()
      if (toolbar) toolbar.style.display = "none"
      if (selectModeBtn) selectModeBtn.textContent = i18n.bg_select_mode || "Select"
      renderUserGradientV2s(dom)
    })
  }

  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", () => {
      const { userGradientV2s } = getSettings()
      const items = document.querySelectorAll(".user-gradient-v2-item")
      const allIndices = userGradientV2s.map((_, i) => i)
      
      if (gradientV2SelectedIndices.size === allIndices.length) {
        gradientV2SelectedIndices.clear()
        items.forEach((item) => {
          item.classList.remove("selected")
          const cb = item.querySelector(".bg-item-checkbox")
          if (cb) cb.classList.remove("checked")
        })
      } else {
        allIndices.forEach((i) => gradientV2SelectedIndices.add(i))
        items.forEach((item) => {
          item.classList.add("selected")
          const cb = item.querySelector(".bg-item-checkbox")
          if (cb) cb.classList.add("checked")
        })
      }
      updateSelectionUI(dom)
    })
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
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
}

function updateSelectionUI(dom) {
  const countEl = dom.gradientV2SelectCount || document.getElementById("gradient-v2-select-count")
  if (countEl) {
    const i18n = geti18n()
    countEl.textContent = `${gradientV2SelectedIndices.size} ${i18n.bookmark_selected || 'selected'}`
  }
}

function updateCount(dom) {
  const countSpan = document.getElementById("count-gradient-v2")
  if (countSpan) {
    const total = (getSettings().userGradientV2s || []).length
    countSpan.innerHTML = ` <span style="font-size:0.8rem;opacity:0.6;">(${total})</span>`
  }
}

export { initGradientV2Manager, renderUserGradientV2s }
