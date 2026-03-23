/**
 * Settings Applier Module
 * Core logic for applying settings to the page (applySettings and updateSettingsInputs)
 */

import {
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"
import { geti18n } from "../../services/i18n.js"
import { getContrastYIQ, hexToRgb } from "../../utils/colors.js"
import {
  isIdbImage,
  isIdbVideo,
  isIdbMedia,
  getBlobUrlSync,
} from "../../services/imageStore.js"
import { getSvgWaveParams } from "./svgWaveUtils.js"
import {
  renderLocalBackgrounds,
  renderUserColors,
} from "./backgroundManager.js"
import { renderUserGradients } from "./gradientManager.js"
import { renderUserSvgWaves } from "./svgWaveManager.js"

let _prevBg = null // Track last applied background for fade-in trigger
let _prevEffect = null // Track last selected effect to avoid unnecessary restart

const EFFECT_KEY_MAP = {
  galaxy: "starFallEffect",
  fireflies: "firefliesEffect",
  network: "networkEffect",
  matrix: "matrixRainEffect",
  aura: "auraEffect",
  wind: "windEffect",
  hacker: "hackerEffect",
  sakura: "sakuraEffect",
  snowfall: "snowfallEffect",
  snowfallHD: "snowfallHDEffect",
  auroraWave: "auroraWaveEffect",
  bubbles: "bubblesEffect",
  rainOnGlass: "rainOnGlassEffect",
  rainHD: "rainHDEffect",
  stormRain: "stormRainEffect",
  rainbow: "rainbowEffect",
  wavyLines: "wavyLinesEffect",
  oceanWave: "oceanWaveEffect",
  cloudDrift: "cloudDriftEffect",
  firefliesHD: "firefliesHDEffect",
  autumnLeaves: "autumnLeavesEffect",
  greenLeaves: "greenLeavesEffect",
  fallingLeavesSettled: "fallingLeavesSettledEffect",
  sunbeam: "sunbeamEffect",
  shiny: "shinyEffect",
  lineShiny: "lineShinyEffect",
  tetFireworks: "tetFireworksEffect",
  skyLanterns: "skyLanternsEffect",
  pixelRun: "pixelRunEffect",
  nintendoPixel: "nintendoPixelEffect",
  retroGame: "retroGameEffect",
  meteor: "meteorEffect",
  wavyPattern: "wavyPatternEffect",
  angledPattern: "angledPatternEffect",
}

function setEffectActive(effectGrid, value) {
  effectGrid.querySelectorAll(".effect-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.value === value)
  })
}

function createApplySettings(effectInstances) {
  return function applySettings() {
    const settings = getSettings()
    const bgChanged = settings.background !== _prevBg
    _prevBg = settings.background
    let shouldUseSvgWave = false

    // 1. Page Title
    document.title = settings.pageTitle || "Start Page"

    // 2. Reset Styles
    document.body.className = ""
    document.body.style.background = ""
    document.body.style.backgroundImage = ""
    const bgLayer = document.getElementById("bg-layer")
    if (bgLayer) {
      bgLayer.style.backgroundImage = ""
      bgLayer.style.backgroundSize = ""
      bgLayer.style.background = ""
      bgLayer.className = ""
      if (bgChanged) bgLayer.style.opacity = "0"
    }
    document.documentElement.style.setProperty("--text-color", "#ffffff")

    // 2a. Stop SVG wave first (before background logic re-applies it)
    if (effectInstances.svgWaveEffect) effectInstances.svgWaveEffect.stop()

    // 3. Background Logic
    let bg = settings.background
    // Resolve IndexedDB image/video ID to blob URL
    const isVideoId = isIdbVideo(bg)
    if (isIdbMedia(bg)) {
      bg = getBlobUrlSync(bg) || bg
    }
    const isPredefinedLocalBg = effectInstances.localBackgrounds.some(
      (b) => b.id === bg,
    )
    const isUserUploadedBg =
      bg &&
      (bg.startsWith("data:image") ||
        bg.startsWith("data:video") ||
        bg.startsWith("blob:"))
    const bgVideoElement = document.getElementById("bg-video")

    // Hide video by default
    if (bgVideoElement) bgVideoElement.style.display = "none"

    if (isPredefinedLocalBg) {
      if (bgLayer) bgLayer.classList.add(bg)
      document.body.classList.add("bg-layer-active")
      document.documentElement.style.setProperty("--text-color", "#ffffff")
    } else if (isUserUploadedBg) {
      document.body.classList.add("bg-image-active")
      if (bg.startsWith("data:video") || isVideoId) {
        if (bgVideoElement) {
          bgVideoElement.src = bg
          bgVideoElement.style.display = "block"
        }
      } else {
        if (bgLayer) {
          bgLayer.style.backgroundImage = `url('${bg}')`
          bgLayer.style.backgroundSize = settings.bgSize || "cover"
        }
      }
      document.body.style.backgroundSize = settings.bgSize || "cover"
      document.documentElement.style.setProperty("--text-color", "#ffffff")
    } else if (bg) {
      document.body.classList.add("bg-image-active")
      const isVideoUrl =
        bg.match(/\.(mp4|webm|mov|ogg)$/) || bg.includes("googlevideo")
      if (isVideoUrl) {
        if (bgVideoElement) {
          bgVideoElement.src = bg
          bgVideoElement.style.display = "block"
        }
        document.documentElement.style.setProperty("--text-color", "#ffffff")
      } else if (bg.match(/^https?:\/\//)) {
        if (bgLayer) {
          bgLayer.style.backgroundImage = `url('${bg}')`
          bgLayer.style.backgroundSize = settings.bgSize || "cover"
        }
        document.documentElement.style.setProperty("--text-color", "#ffffff")
      } else {
        if (bgLayer) bgLayer.style.background = bg
        document.body.classList.add("bg-layer-active")
        document.documentElement.style.setProperty(
          "--text-color",
          getContrastYIQ(bg),
        )
      }
    } else {
      // If no background image/color, apply SVG wave → fallback
      if (settings.svgWaveActive && effectInstances.svgWaveEffect) {
        shouldUseSvgWave = true
        effectInstances.svgWaveEffect.start(getSvgWaveParams(settings))
      } else {
        if (bgLayer)
          bgLayer.style.background = `linear-gradient(${settings.gradientAngle}deg, ${settings.gradientStart}, ${settings.gradientEnd})`
        document.body.classList.add("bg-layer-active")
      }
    }

    // 2.1 Background Position
    document.documentElement.style.setProperty(
      "--bg-pos-x",
      `${settings.bgPositionX !== undefined ? settings.bgPositionX : 50}%`,
    )
    document.documentElement.style.setProperty(
      "--bg-pos-y",
      `${settings.bgPositionY !== undefined ? settings.bgPositionY : 50}%`,
    )
    document.documentElement.style.setProperty(
      "--bg-blur",
      `${settings.bgBlur ?? 0}px`,
    )
    document.documentElement.style.setProperty(
      "--bg-brightness",
      `${settings.bgBrightness ?? 100}%`,
    )
    document.documentElement.style.setProperty(
      "--bg-fade-in",
      `${settings.bgFadeIn ?? 0.5}s`,
    )

    // Trigger fade-in only when background changed
    if (bgChanged) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const _bgLayer = document.getElementById("bg-layer")
          if (_bgLayer) _bgLayer.style.opacity = "1"
          const _bgVideo = document.getElementById("bg-video")
          if (_bgVideo && _bgVideo.style.display === "block")
            _bgVideo.style.opacity = "1"
        }),
      )
    }

    // 3. UI Props
    document.documentElement.style.setProperty("--font-primary", settings.font)
    document.documentElement.style.setProperty(
      "--clock-size",
      `${settings.clockSize}rem`,
    )

    // 3.1 Clock Color Contrast Logic
    let finalClockColor = settings.clockColor
    if (!finalClockColor) {
      if (
        isPredefinedLocalBg ||
        isUserUploadedBg ||
        (bg && bg.match(/^https?:\/\//))
      ) {
        finalClockColor = "#ffffff"
      } else if (bg) {
        finalClockColor = getContrastYIQ(bg)
      } else {
        finalClockColor = getContrastYIQ(settings.gradientStart)
      }
    }

    document.documentElement.style.setProperty("--clock-color", finalClockColor)
    if (settings.accentColor) {
      document.documentElement.style.setProperty(
        "--accent-color",
        settings.accentColor,
      )
      const rgb = hexToRgb(settings.accentColor)
      if (rgb) {
        document.documentElement.style.setProperty(
          "--accent-color-rgb",
          `${rgb.r}, ${rgb.g}, ${rgb.b}`,
        )
      }
    }

    // 4. Effects Management
    const effectToStart = settings.effect
    const mappedKey = EFFECT_KEY_MAP[effectToStart] || effectToStart
    const selectedEffect = effectInstances[mappedKey]
    const effectChanged = effectToStart !== _prevEffect
    const effectCanvas = document.getElementById("effect-canvas")
    if (effectChanged) {
      // Stop previous effects only when effect selection actually changes.
      Object.values(effectInstances).forEach((effect) => {
        if (shouldUseSvgWave && effect === effectInstances.svgWaveEffect) return
        if (effect && typeof effect.stop === "function") {
          effect.stop()
        }
      })

      if (effectCanvas) {
        const ctx = effectCanvas.getContext("2d")
        ctx.clearRect(0, 0, effectCanvas.width, effectCanvas.height)
        effectCanvas.style.display = "none"
      }

      // 5. Start selected effect immediately (no artificial delay/flicker).
      if (effectToStart && effectToStart !== "none" && selectedEffect) {
        // Apply saved leaf type for falling leaves settled effect
        if (
          effectToStart === "fallingLeavesSettled" &&
          selectedEffect.setLeafType
        ) {
          selectedEffect.setLeafType(settings.fallingLeavesSkin || "maple")
        }
        selectedEffect.start?.()
      }
    }
    _prevEffect = effectToStart

    // 6. Gradients
    document.documentElement.style.setProperty(
      "--bg-gradient-start",
      settings.gradientStart,
    )
    document.documentElement.style.setProperty(
      "--bg-gradient-end",
      settings.gradientEnd,
    )
    document.documentElement.style.setProperty(
      "--bg-gradient-angle",
      settings.gradientAngle + "deg",
    )

    // Call updateSettingsInputs to sync all UI
    if (typeof effectInstances.updateSettingsInputs === "function") {
      effectInstances.updateSettingsInputs()
    }
  }
}

function createUpdateSettingsInputs(effectInstances) {
  return function updateSettingsInputs() {
    const settings = getSettings()
    const DOM = effectInstances.DOM

    // Background Inputs
    const isPredefinedLocalBg = effectInstances.localBackgrounds.some(
      (b) => b.id === settings.background,
    )
    const isUserUploadedBg =
      settings.background && settings.background.startsWith("data:image")
    DOM.bgInput.value =
      isPredefinedLocalBg || isUserUploadedBg || !settings.background
        ? ""
        : settings.background

    // General Inputs
    effectInstances.renderFontGrid()
    DOM.dateFormatSelect.value = settings.dateFormat
    DOM.hideSecondsCheckbox.checked = settings.hideSeconds === true
    DOM.pageTitleInput.value = settings.pageTitle || "Start Page"
    DOM.tabIconInput.value = settings.tabIcon || ""
    effectInstances.renderTabIconPreview(settings.tabIcon || "")
    DOM.clockSizeInput.value = settings.clockSize
    DOM.clockSizeValue.textContent = `${settings.clockSize}rem`
    DOM.languageSelect.value = settings.language || "en"
    DOM.accentColorPicker.value = settings.accentColor || "#a8c0ff"
    DOM.clockColorPicker.value = settings.clockColor || "#ffffff"

    DOM.bgSizeSelect.value = settings.bgSize || "cover"
    DOM.bgBlurInput.value = settings.bgBlur ?? 0
    DOM.bgBlurValue.textContent = `${settings.bgBlur ?? 0}px`
    DOM.bgBrightnessInput.value = settings.bgBrightness ?? 100
    DOM.bgBrightnessValue.textContent = `${settings.bgBrightness ?? 100}%`
    DOM.bgFadeInInput.value = settings.bgFadeIn ?? 0.5
    DOM.bgFadeInValue.textContent = `${settings.bgFadeIn ?? 0.5}s`
    DOM.bgPosXInput.value = settings.bgPositionX || 50
    DOM.bgPosXValue.textContent = `${DOM.bgPosXInput.value}%`
    DOM.bgPosYInput.value = settings.bgPositionY || 50
    DOM.bgPosYValue.textContent = `${DOM.bgPosYInput.value}%`

    DOM.unsplashCategorySelect.value =
      settings.unsplashCategory || "spring-wallpapers"
    if (DOM.unsplashAccessKeyInput)
      DOM.unsplashAccessKeyInput.value = settings.unsplashAccessKey || ""

    const isImageBg =
      settings.background &&
      !isIdbVideo(settings.background) &&
      (isIdbImage(settings.background) ||
        settings.background.startsWith("data:image/") ||
        settings.background.startsWith("blob:") ||
        settings.background.startsWith("http"))

    DOM.bgPositionSetting.style.display = isImageBg ? "block" : "none"

    DOM.clockColorPicker.style.opacity = settings.clockColor ? "1" : "0.5"
    setEffectActive(DOM.effectGrid, settings.effect)
    const effectGroup = document.getElementById("effect-setting-group")
    if (effectGroup) {
      if (settings.effect && settings.effect !== "none") {
        effectGroup.classList.add("expanded")
      }
    }

    // Gradient Inputs
    DOM.gradientStartPicker.value = settings.gradientStart
    DOM.gradientEndPicker.value = settings.gradientEnd
    DOM.gradientAngleInput.value = settings.gradientAngle
    DOM.gradientAngleValue.textContent = settings.gradientAngle

    // Effect Color Inputs
    DOM.starColorPicker.value = settings.starColor || "#ffffff"
    DOM.networkColorPicker.value = settings.networkColor || "#00bcd4"
    DOM.matrixColorPicker.value = settings.matrixColor || "#00FF00"
    DOM.auraColorPicker.value = settings.auraColor || "#a8c0ff"
    DOM.hackerColorPicker.value = settings.hackerColor || "#00FF00"
    DOM.sakuraColorPicker.value = settings.sakuraColor || "#ffb7c5"
    DOM.snowfallColorPicker.value = settings.snowfallColor || "#ffffff"
    DOM.bubblesColorPicker.value = settings.bubbleColor || "#60c8ff"
    DOM.rainOnGlassColorPicker.value = settings.rainOnGlassColor || "#a8d8ff"
    DOM.rainHDColorPicker.value = settings.rainHDColor || "#99ccff"
    DOM.stormRainColorPicker.value = settings.stormRainColor || "#7dd3fc"
    DOM.wavyLinesColorPicker.value = settings.wavyLinesColor || "#00bcd4"
    DOM.oceanWaveColorPicker.value = settings.oceanWaveColor || "#0077b6"
    const oceanWavePos = settings.oceanWavePosition || "bottom"
    DOM.oceanWavePosBottomBtn.classList.toggle(
      "active",
      oceanWavePos === "bottom",
    )
    DOM.oceanWavePosTopBtn.classList.toggle("active", oceanWavePos === "top")
    DOM.cloudDriftColorPicker.value = settings.cloudDriftColor || "#0a0a0a"

    // Visibility of Effect Settings
    DOM.starColorSetting.style.display =
      settings.effect === "galaxy" ? "block" : "none"
    DOM.networkColorSetting.style.display =
      settings.effect === "network" ? "block" : "none"
    DOM.matrixColorSetting.style.display =
      settings.effect === "matrix" ? "block" : "none"
    DOM.auraColorSetting.style.display =
      settings.effect === "aura" ? "block" : "none"
    DOM.hackerColorSetting.style.display =
      settings.effect === "hacker" ? "block" : "none"
    DOM.sakuraColorSetting.style.display =
      settings.effect === "sakura" ? "block" : "none"
    DOM.snowfallColorSetting.style.display =
      settings.effect === "snowfall" ? "block" : "none"
    DOM.fallingLeavesSettledSkinSetting.style.display =
      settings.effect === "fallingLeavesSettled" ? "block" : "none"
    if (DOM.fallingLeavesSettledSkinSelect) {
      DOM.fallingLeavesSettledSkinSelect.value =
        settings.fallingLeavesSkin || "maple"
    }
    DOM.bubblesColorSetting.style.display =
      settings.effect === "bubbles" ? "block" : "none"
    DOM.rainOnGlassColorSetting.style.display =
      settings.effect === "rainOnGlass" ? "block" : "none"
    DOM.rainHDColorSetting.style.display =
      settings.effect === "rainHD" ? "block" : "none"
    DOM.stormRainColorSetting.style.display =
      settings.effect === "stormRain" ? "block" : "none"
    DOM.wavyLinesColorSetting.style.display =
      settings.effect === "wavyLines" ? "block" : "none"
    DOM.oceanWaveColorSetting.style.display =
      settings.effect === "oceanWave" ? "block" : "none"
    DOM.oceanWavePositionSetting.style.display =
      settings.effect === "oceanWave" ? "block" : "none"
    DOM.cloudDriftColorSetting.style.display =
      settings.effect === "cloudDrift" ? "block" : "none"
    DOM.shinyColorSetting.style.display =
      settings.effect === "shiny" ? "block" : "none"
    DOM.shinyColorPicker.value = settings.shinyColor || "#ff0000"
    DOM.lineShinyColorSetting.style.display =
      settings.effect === "lineShiny" ? "block" : "none"
    DOM.lineShinyColorPicker.value = settings.lineShinyColor || "#ffffff"
    DOM.pixelRunColorSetting.style.display =
      settings.effect === "pixelRun" ? "block" : "none"
    DOM.pixelRunColorPicker.value = settings.pixelRunColor || "#00e5ff"
    DOM.nintendoPixelColorSetting.style.display =
      settings.effect === "nintendoPixel" ? "block" : "none"
    DOM.nintendoPixelColorPicker.value =
      settings.nintendoPixelColor || "#63f5ff"
    DOM.retroGameColorSetting.style.display =
      settings.effect === "retroGame" ? "block" : "none"
    DOM.retroGameColorPicker.value = settings.retroGameColor || "#00ff00"
    DOM.wavyPatternColor1Setting.style.display =
      settings.effect === "wavyPattern" ? "block" : "none"
    DOM.wavyPatternColor2Setting.style.display =
      settings.effect === "wavyPattern" ? "block" : "none"
    DOM.wavyPatternColor1Picker.value = settings.wavyPatternColor1 || "#AB3E5B"
    DOM.wavyPatternColor2Picker.value = settings.wavyPatternColor2 || "#FFBE40"
    DOM.angledPatternColor1Setting.style.display =
      settings.effect === "angledPattern" ? "block" : "none"
    DOM.angledPatternColor2Setting.style.display =
      settings.effect === "angledPattern" ? "block" : "none"
    DOM.angledPatternColor1Picker.value =
      settings.angledPatternColor1 || "#ECD078"
    DOM.angledPatternColor2Picker.value =
      settings.angledPatternColor2 || "#0B486B"

    // SVG Wave Generator
    const waveActive = settings.svgWaveActive === true
    DOM.svgWaveSettings.style.display = waveActive ? "block" : "none"
    if (DOM.svgWaveToggleLabel) {
      const i18n = geti18n()
      DOM.svgWaveToggleLabel.textContent = waveActive
        ? i18n.settings_svg_wave_close || "Close Controls"
        : i18n.settings_svg_wave_open || "Open Wave Generator"
    }

    DOM.svgWaveAmpX.value = settings.svgWaveAmplitudeX ?? 200
    DOM.svgWaveAmpXValue.textContent = DOM.svgWaveAmpX.value
    DOM.svgWaveLines.value = settings.svgWaveLines ?? 5
    DOM.svgWaveLinesValue.textContent = DOM.svgWaveLines.value
    DOM.svgWaveAmpY.value = settings.svgWaveAmplitudeY ?? 80
    DOM.svgWaveAmpYValue.textContent = DOM.svgWaveAmpY.value
    DOM.svgWaveOffsetX.value = settings.svgWaveOffsetX ?? 0
    DOM.svgWaveOffsetXValue.textContent = DOM.svgWaveOffsetX.value
    DOM.svgWaveAngle.value = settings.svgWaveAngle ?? 0
    DOM.svgWaveAngleValue.textContent = DOM.svgWaveAngle.value
    DOM.svgWaveSmoothness.value = settings.svgWaveSmoothness ?? 0.5
    DOM.svgWaveSmoothnessValue.textContent = DOM.svgWaveSmoothness.value
    DOM.svgWaveCraziness.value = settings.svgWaveCraziness ?? 30
    DOM.svgWaveCrazinessValue.textContent = DOM.svgWaveCraziness.value
    DOM.svgWaveFill.checked = settings.svgWaveFill !== false
    DOM.svgWaveStartHue.value = settings.svgWaveStartHue ?? 200
    DOM.svgWaveStartHueValue.textContent = DOM.svgWaveStartHue.value
    DOM.svgWaveStartSat.value = settings.svgWaveStartSaturation ?? 70
    DOM.svgWaveStartSatValue.textContent = DOM.svgWaveStartSat.value
    DOM.svgWaveStartLight.value = settings.svgWaveStartLightness ?? 40
    DOM.svgWaveStartLightValue.textContent = DOM.svgWaveStartLight.value
    DOM.svgWaveEndHue.value = settings.svgWaveEndHue ?? 280
    DOM.svgWaveEndHueValue.textContent = DOM.svgWaveEndHue.value
    DOM.svgWaveEndSat.value = settings.svgWaveEndSaturation ?? 70
    DOM.svgWaveEndSatValue.textContent = DOM.svgWaveEndSat.value
    DOM.svgWaveEndLight.value = settings.svgWaveEndLightness ?? 30
    DOM.svgWaveEndLightValue.textContent = DOM.svgWaveEndLight.value
    effectInstances.updateWaveColorPreviews(settings)
    renderUserSvgWaves(effectInstances.DOM, effectInstances.svgWaveEffect)
    renderLocalBackgrounds(
      effectInstances.DOM,
      effectInstances.handleSettingUpdate,
    )
    renderUserGradients(effectInstances.DOM)
    DOM.showTodoCheckbox.checked = settings.showTodoList !== false
    DOM.showNotepadCheckbox.checked = settings.showNotepad !== false
    DOM.showTimerCheckbox.checked = settings.showTimer === true
    DOM.showGregorianCheckbox.checked = settings.showGregorian !== false
    DOM.showMusicCheckbox.checked = settings.musicPlayerEnabled === true
    DOM.showClockCheckbox.checked = settings.showClock !== false
    DOM.showFullCalendarCheckbox.checked = settings.showFullCalendar === true
    DOM.showLunarCalendarCheckbox.checked = settings.showLunarCalendar !== false
    DOM.showQuickAccessCheckbox.checked = settings.showQuickAccess !== false
    DOM.showSearchBarCheckbox.checked = settings.showSearchBar !== false
    DOM.showBookmarksCheckbox.checked = settings.showBookmarks !== false
    DOM.showBookmarkGroupsCheckbox.checked =
      settings.showBookmarkGroups !== false
    DOM.ghostControlsCheckbox.checked = settings.sideControlsGhostMode === true
    document.body.classList.toggle(
      "ghost-controls",
      settings.sideControlsGhostMode === true,
    )
    DOM.lcpSearchBar.checked = settings.showSearchBar !== false
    DOM.lcpBookmarks.checked = settings.showBookmarks !== false
    DOM.lcpBookmarkGroups.checked = settings.showBookmarkGroups !== false
    DOM.lcpLunarCalendar.checked = settings.showLunarCalendar !== false
    DOM.lcpQuickAccess.checked = settings.showQuickAccess !== false
    DOM.lcpGhostControls.checked = settings.sideControlsGhostMode === true
    DOM.musicStyleSelect.value = settings.musicBarStyle || "vinyl"

    // Highlight active background
    document.querySelectorAll(".local-bg-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.bgId === settings.background)
    })
    document.querySelectorAll(".user-color-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.bgId === settings.background)
    })
    document.querySelectorAll(".user-gradient-item").forEach((item) => {
      const isActive =
        !settings.background &&
        item.dataset.start === settings.gradientStart &&
        item.dataset.end === settings.gradientEnd &&
        item.dataset.angle === settings.gradientAngle
      item.classList.toggle("active", isActive)
    })
  }
}

export { createApplySettings, createUpdateSettingsInputs }
