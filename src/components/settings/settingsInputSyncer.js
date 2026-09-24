/**
 * Settings Input Syncer Module
 * Synchronizes UI inputs, controls, and form values with current state
 * Extracted from settingsApplier.js
 */

import {
  DEFAULT_MEDIA_ORB_IMAGE_URL,
  getSettings,
  updateSetting,
} from "../../services/state.js"
import { geti18n } from "../../services/i18n.js"
import { PREDEFINED_FONTS } from "./fontManager.js"
import { getContrastYIQ } from "../../utils/colors.js"
import { resolveDynamicTokens } from "../../utils/dynamicTokens.js"
import { isIdbImage, isIdbVideo } from "../../services/imageStore.js"
import { updateActiveWallpaperBanner } from "./backgroundManager.js"
import { updateGradientLivePreview } from "./gradientManager.js"
import {
  DEFAULT_TIMER_ALARM_SOUND,
  renderTimerAlarmSelectOptions,
} from "../../data/timerAlarmSounds.js"
import { updateMediaSaveButtonsState } from "./mediaUiHelpers.js"
import {
  getClockStyleUsesM3Accent,
  getClockStyleCustomAccentColor,
  CLOCK_STYLE_ACCENT_STYLES,
} from "./clockAccent.js"
import { isVideoBackgroundValue } from "./backgroundApplier.js"
import {
  EFFECTS_WITH_CUSTOM_SETTINGS,
  markEffectsWithCustomBadges,
  setEffectActive,
} from "./effectBadges.js"

export const WEATHER_API_REQUIRED_PARAMS = {
  forecast: [
    "latitude",
    "longitude",
    "current",
    "daily",
    "timezone",
    "forecast_days",
  ],
  geocoding: ["name", "count", "language", "format"],
}

export function createUpdateSettingsInputs(effectInstances) {
  return function updateSettingsInputs() {
    const settings = getSettings()
    const DOM = effectInstances.DOM

    // Background Inputs
    const isPredefinedLocalBg = effectInstances.localBackgrounds.some(
      (b) => b.id === settings.background,
    )
    const isUserUploadedBg =
      settings.background &&
      (settings.background.startsWith("data:image") ||
        settings.background.startsWith("data:video") ||
        settings.background.startsWith("blob:") ||
        isIdbImage(settings.background) ||
        isIdbVideo(settings.background))

    // Calculate current applied colors for pickers
    let currentClockColor = settings.clockColor
    let currentDateColor = settings.dateColor

    if (!currentClockColor || !currentDateColor) {
      let fallbackColor = "#ffffff"
      const isFliqloLight =
        settings.dateClockStyle === "fliqlo" && settings.fliqloTheme === "light"
      const bg = settings.background

      if (isFliqloLight) {
        fallbackColor = "#000000"
      } else if (
        isPredefinedLocalBg ||
        isUserUploadedBg ||
        (bg && String(bg).match(/^https?:\/\//))
      ) {
        fallbackColor = "#ffffff"
      } else if (bg) {
        const contrast = getContrastYIQ(bg)
        fallbackColor = contrast === "black" ? "#000000" : "#ffffff"
      } else {
        const contrast = getContrastYIQ(settings.gradientStart)
        fallbackColor = contrast === "black" ? "#000000" : "#ffffff"
      }

      if (!currentClockColor) currentClockColor = fallbackColor
      if (!currentDateColor) currentDateColor = fallbackColor
    }

    // Ensure hex format for picker
    if (currentClockColor === "black") currentClockColor = "#000000"
    if (currentClockColor === "white") currentClockColor = "#ffffff"
    if (currentDateColor === "black") currentDateColor = "#000000"
    if (currentDateColor === "white") currentDateColor = "#ffffff"

    const rawDateSize = Number(settings.dateSize)
    const baseDateSize = Number.isFinite(rawDateSize)
      ? Math.min(10, Math.max(0.8, rawDateSize))
      : 1.5
    DOM.bgInput.value =
      isPredefinedLocalBg || isUserUploadedBg || !settings.background
        ? ""
        : settings.background

    // General Inputs
    effectInstances.renderFontGrid()
    if (DOM.clockDateLanguageSelect)
      DOM.clockDateLanguageSelect.value = settings.clockDateLanguage || "auto"
    if (DOM.shortWeekdayCheckbox)
      DOM.shortWeekdayCheckbox.checked = settings.shortWeekday === true
    if (DOM.timezoneSelect)
      DOM.timezoneSelect.value = settings.timezone || "local"
    const contextMenuInputValue = settings.contextMenuStyle || "dark"
    if (DOM.contextMenuStyleSelect)
      DOM.contextMenuStyleSelect.value = contextMenuInputValue
    if (DOM.contextMenuMiniCheckbox)
      DOM.contextMenuMiniCheckbox.checked = settings.contextMenuMini === true
    if (DOM.lcpContextMenuStyle)
      DOM.lcpContextMenuStyle.value = contextMenuInputValue
    if (DOM.lcpContextMenuMini)
      DOM.lcpContextMenuMini.checked = settings.contextMenuMini === true
    if (DOM.hideSecondsCheckbox)
      DOM.hideSecondsCheckbox.checked = settings.hideSeconds === true
    if (DOM.cursorTrailClickCheckbox)
      DOM.cursorTrailClickCheckbox.checked =
        settings.cursorTrailClickExplosion !== false
    if (DOM.cursorTrailRandomCheckbox)
      DOM.cursorTrailRandomCheckbox.checked =
        settings.cursorTrailRandomColor === true
    if (DOM.clockDatePrioritySelect) {
      DOM.clockDatePrioritySelect.value =
        settings.clockDatePriority === "date" ? "date" : "none"
    }
    if (DOM.clockDateStyleSelect)
      DOM.clockDateStyleSelect.value = settings.dateClockStyle || "default"

    // Sync Clock Style Cards
    const clockCards = document.querySelectorAll(
      ".clock-style-card:not(.date-format-card):not(.time-format-card):not(.font-target-card)",
    )
    const currentStyle = settings.dateClockStyle || "default"
    clockCards.forEach((card) => {
      card.classList.toggle("active", card.dataset.value === currentStyle)
    })

    // Sync Date Format Cards
    const dateFormatCards = document.querySelectorAll(".date-format-card")
    const currentDateFormat = settings.dateFormat || "full"
    dateFormatCards.forEach((card) => {
      card.classList.toggle("active", card.dataset.value === currentDateFormat)
    })

    // Sync Time Format Cards
    const timeFormatCards = document.querySelectorAll(".time-format-card")
    const currentTimeFormat = settings.timeFormat || "24h"
    timeFormatCards.forEach((card) => {
      card.classList.toggle("active", card.dataset.value === currentTimeFormat)
    })

    if (DOM.jpStyleLanguageSelect)
      DOM.jpStyleLanguageSelect.value = settings.jpStyleLanguage || "auto"
    if (DOM.hueTextModeSelect)
      DOM.hueTextModeSelect.value = settings.hueTextMode || "off"
    if (DOM.clockAutoContrastCheckbox) {
      DOM.clockAutoContrastCheckbox.checked =
        settings.clockAutoContrast !== false
    }
    if (DOM.clockUseAccentCheckbox) {
      DOM.clockUseAccentCheckbox.checked = settings.clockUseAccentColor === true
    }
    // Sync Accent Target Cards
    const accentTargetCards = document.querySelectorAll(".accent-target-card")
    const currentAccentTarget = settings.clockAccentTarget || "style"
    accentTargetCards.forEach((card) => {
      card.classList.toggle(
        "active",
        card.dataset.value === currentAccentTarget,
      )
    })

    // Sync Shadow Target Cards
    const shadowTargetCards = document.querySelectorAll(".shadow-target-card")
    const currentShadowTarget = settings.clockShadowTarget || "none"
    shadowTargetCards.forEach((card) => {
      card.classList.toggle(
        "active",
        card.dataset.value === currentShadowTarget,
      )
    })

    if (DOM.clockShadowStrengthInput) {
      DOM.clockShadowStrengthInput.value = settings.clockShadowStrength || 0
      if (DOM.clockShadowStrengthValue) {
        DOM.clockShadowStrengthValue.textContent = `${settings.clockShadowStrength || 0}%`
      }
    }
    if (DOM.clockShadowColorPicker) {
      DOM.clockShadowColorPicker.value = settings.clockShadowColor || "#000000"
    }
    if (DOM.analogMarkerModeSelect)
      DOM.analogMarkerModeSelect.value = settings.analogMarkerMode || "quarters"
    if (DOM.sidestyleAlignSelect)
      DOM.sidestyleAlignSelect.value = settings.sidestyleAlign || "left"
    if (DOM.sidestyleNoBorderCheckbox)
      DOM.sidestyleNoBorderCheckbox.checked =
        settings.sidestyleNoBorder === true

    const coolGreetingMorningInput = document.getElementById(
      "cool-greeting-morning-input",
    )
    if (coolGreetingMorningInput)
      coolGreetingMorningInput.value = settings.coolGreetingMorning || ""
    const coolGreetingAfternoonInput = document.getElementById(
      "cool-greeting-afternoon-input",
    )
    if (coolGreetingAfternoonInput)
      coolGreetingAfternoonInput.value = settings.coolGreetingAfternoon || ""
    const coolGreetingEveningInput = document.getElementById(
      "cool-greeting-evening-input",
    )
    if (coolGreetingEveningInput)
      coolGreetingEveningInput.value = settings.coolGreetingEvening || ""

    const audioWavePositionSelect = document.getElementById(
      "audio-wave-position-select",
    )
    if (audioWavePositionSelect)
      audioWavePositionSelect.value = settings.audioWavePosition || "bottom"

    const audioWaveScaleInput = document.getElementById(
      "audio-wave-scale-input",
    )
    const audioWaveScaleVal = document.getElementById("audio-wave-scale-val")
    if (audioWaveScaleInput) {
      audioWaveScaleInput.value = settings.audioWaveScale || 1
      if (audioWaveScaleVal)
        audioWaveScaleVal.textContent = settings.audioWaveScale || 1
    }

    const audioWaveStyleSelect = document.getElementById(
      "audio-wave-style-select",
    )
    if (audioWaveStyleSelect)
      audioWaveStyleSelect.value = settings.audioWaveStyle || "bars"

    const audioWaveSpeedSelect = document.getElementById(
      "audio-wave-speed-select",
    )
    if (audioWaveSpeedSelect)
      audioWaveSpeedSelect.value = settings.audioWaveSpeed || "1"

    const audioWaveFloatCheckbox = document.getElementById(
      "audio-wave-float-checkbox",
    )
    if (audioWaveFloatCheckbox) {
      audioWaveFloatCheckbox.checked = settings.audioWaveFloatEnabled !== false
    }

    const audioWaveAutoColorCheckbox = document.getElementById(
      "audio-wave-auto-color-checkbox",
    )
    const audioWaveColorPicker = document.getElementById(
      "audio-wave-color-picker",
    )
    const audioWaveCustomColorContainer = document.getElementById(
      "audio-wave-custom-color-container",
    )

    if (audioWaveAutoColorCheckbox) {
      audioWaveAutoColorCheckbox.checked = settings.audioWaveAutoColor !== false
      if (audioWaveCustomColorContainer) {
        audioWaveCustomColorContainer.style.display =
          audioWaveAutoColorCheckbox.checked ? "none" : "flex"
      }
    }
    if (audioWaveColorPicker) {
      audioWaveColorPicker.value = settings.audioWaveCustomColor || "#00ff66"
    }
    const coolBarTopInput = document.getElementById("cool-bar-top-input")
    if (coolBarTopInput)
      coolBarTopInput.value =
        settings.coolBarSymbolTop !== undefined
          ? settings.coolBarSymbolTop
          : "|"
    const coolBarBottomInput = document.getElementById("cool-bar-bottom-input")
    if (coolBarBottomInput)
      coolBarBottomInput.value =
        settings.coolBarSymbolBottom !== undefined
          ? settings.coolBarSymbolBottom
          : "|"
    const coolBarScaleInput = document.getElementById("cool-bar-scale-input")
    if (coolBarScaleInput)
      coolBarScaleInput.value =
        settings.coolBarScale !== undefined ? settings.coolBarScale : 2.5
    const codeStyleLanguageSelect = document.getElementById(
      "code-style-language-select",
    )
    if (codeStyleLanguageSelect)
      codeStyleLanguageSelect.value = settings.codeClockLanguage || "javascript"
    const codeStyleShowDateCheckbox = document.getElementById(
      "code-style-show-date-checkbox",
    )
    if (codeStyleShowDateCheckbox)
      codeStyleShowDateCheckbox.checked = settings.codeClockShowDate !== false

    const updateInputAndSpan = (key, defaultVal, isPx = false) => {
      const idBase = key.replace(/([A-Z])/g, "-$1").toLowerCase()
      const input = document.getElementById(`${idBase}-input`)
      if (input) {
        input.value = settings[key] !== undefined ? settings[key] : defaultVal
        const span = document.getElementById(`${idBase}-value`)
        if (span)
          span.innerHTML = isPx ? input.value + "px" : input.value + "&deg;"
      }
    }
    updateInputAndSpan("customAngleSkewX", 15)
    updateInputAndSpan("customAngleSkewY", 0)
    updateInputAndSpan("customAngleRotate", -5)
    updateInputAndSpan("customAngleRotateX", 0)
    updateInputAndSpan("customAngleRotateY", 0)
    updateInputAndSpan("customAnglePerspective", 1000, true)

    const customAngleShowDateCheckbox = document.getElementById(
      "custom-angle-show-date-checkbox",
    )
    if (customAngleShowDateCheckbox)
      customAngleShowDateCheckbox.checked =
        settings.customAngleShowDate !== false

    const globalClockCutBottomInput = document.getElementById(
      "global-clock-cut-bottom-input",
    )
    if (globalClockCutBottomInput)
      globalClockCutBottomInput.value =
        settings.clockCutBottom !== undefined ? settings.clockCutBottom : 0
    const globalClockFadeBottomInput = document.getElementById(
      "global-clock-fade-bottom-input",
    )
    if (globalClockFadeBottomInput)
      globalClockFadeBottomInput.value =
        settings.clockFadeBottom !== undefined ? settings.clockFadeBottom : 100
    if (DOM.sidebarClockFlipCheckbox)
      DOM.sidebarClockFlipCheckbox.checked = settings.sidebarClockFlip === true
    if (DOM.clockStyleBgSelect) {
      DOM.clockStyleBgSelect.value =
        settings.clockStyleTransparentBackground === true
          ? "transparent"
          : settings.clockStyleBackground || "default"
    }
    if (DOM.clockStyleCustomBgColor) {
      DOM.clockStyleCustomBgColor.value = /^#[0-9a-f]{6}$/i.test(
        settings.clockStyleCustomBgColor || "",
      )
        ? settings.clockStyleCustomBgColor
        : "#1f2937"
    }
    if (DOM.clockStyleAccentColor) {
      const currentStyleForAccent = settings.dateClockStyle || "default"
      DOM.clockStyleAccentColor.value = getClockStyleCustomAccentColor(
        settings,
        currentStyleForAccent,
      )
    }
    if (DOM.clockStyleUseM3AccentCheckbox) {
      const currentStyleForAccent = settings.dateClockStyle || "default"
      DOM.clockStyleUseM3AccentCheckbox.checked = getClockStyleUsesM3Accent(
        settings,
        currentStyleForAccent,
      )
    }
    if (DOM.cartoonClockAnimationCheckbox) {
      DOM.cartoonClockAnimationCheckbox.checked =
        settings.cartoonClockAnimation !== false
    }
    // Sync Font Target Cards
    const fontTargetCards = document.querySelectorAll(".font-target-card")
    const currentFontTarget = settings.clockFontTarget || "both"
    fontTargetCards.forEach((card) => {
      card.classList.toggle("active", card.dataset.value === currentFontTarget)
    })

    // Manage display of conditional settings
    const style = settings.dateClockStyle || "default"
    const backgroundClockStyles = [
      "minimal",
      "glass",
      "round",
      "square",
      "analog",
      "cartoon",
      "fliqlo",
      "cyber-pulse",
      "neon-grid",
      "terminal",
      "c4-bomb",
      "holo-ring",
      "code",
      "custom-angle",
      "media-orb",
      "prism-stack",
      "metro-panel",
      "minimalist-word",
      "aurora-ribbon",
      "lunar-orbit",
      "space-concentric",
      "audio-wave",
      "glass-float",
      "satellite",
      "pixel-hud",
      "split-pill",
      "clock-3d",
      "macos-vintage",
      "aquarium",
    ]

    // Show style-specific container if current style has special settings
    const styleHasExtras = true
    if (DOM.styleSpecificCustomization) {
      DOM.styleSpecificCustomization.style.display = styleHasExtras
        ? "block"
        : "none"
    }

    if (DOM.analogMarkerModeSetting)
      DOM.analogMarkerModeSetting.style.display =
        style === "analog" ? "block" : "none"
    if (DOM.analogBlurBgSetting)
      DOM.analogBlurBgSetting.style.display =
        style === "analog" ? "flex" : "none"

    if (DOM.clockFadeBottomSetting) {
      DOM.clockFadeBottomSetting.style.display = "block"
      if (DOM.clockFadeBottomSelect) {
        DOM.clockFadeBottomSelect.value = settings.clockFadeFromBottom || "off"
      }
      if (DOM.clockFadeDirectionSelect) {
        DOM.clockFadeDirectionSelect.value =
          settings.clockFadeDirection || "bottom"
      }
    }

    if (
      settings.clockFadeFromBottom &&
      settings.clockFadeFromBottom !== "off" &&
      settings.clockFadeFromBottom !== false
    ) {
      document.body.classList.add("clock-has-fade")

      let levelVal = parseInt(settings.clockFadeFromBottom)
      if (isNaN(levelVal)) levelVal = 50
      let p = levelVal / 100 // 0.05 to 1.0
      let dir = settings.clockFadeDirection || "bottom"

      let mask = ""
      switch (dir) {
        case "top":
          mask = `linear-gradient(to bottom, transparent 0%, black ${p * 100}%)`
          break
        case "horizontal":
          mask = `linear-gradient(to right, transparent 0%, black ${p * 50}%, black ${100 - p * 50}%, transparent 100%)`
          break
        case "center": // Center is transparent, fades to solid edges
          mask = `radial-gradient(circle at center, transparent 0%, black ${p * 100}%)`
          break
        case "radial": // Center is solid, fades to transparent edges
          mask = `radial-gradient(circle at center, black ${100 - p * 100}%, transparent 100%)`
          break
        case "bottom":
        default:
          mask = `linear-gradient(to top, transparent 0%, black ${p * 100}%)`
          break
      }

      document.body.style.setProperty("--clock-fade-mask", mask)
      document.body.removeAttribute("data-clock-fade-bottom") // Cleanup old attr
      document.body.classList.remove("clock-fade-from-bottom") // Cleanup old class
    } else {
      document.body.classList.remove("clock-has-fade")
      document.body.style.removeProperty("--clock-fade-mask")
      document.body.removeAttribute("data-clock-fade-bottom")
      document.body.classList.remove("clock-fade-from-bottom")
    }

    if (DOM.jpStyleLanguageSetting)
      DOM.jpStyleLanguageSetting.style.display =
        style === "jp-style" ? "block" : "none"
    if (DOM.sidestyleAlignSetting)
      DOM.sidestyleAlignSetting.style.display =
        style === "sidestyle" ? "block" : "none"
    const coolStyleSettings = document.getElementById("cool-style-settings")
    if (coolStyleSettings) {
      coolStyleSettings.style.display = style === "cool" ? "block" : "none"
    }
    const pixelHudSettings = document.getElementById("pixel-hud-settings")
    if (pixelHudSettings) {
      pixelHudSettings.style.display =
        settings.dateClockStyle === "pixel-hud" ? "block" : "none"
    }

    const hudColor1Input = document.getElementById("hud-color-1")
    if (hudColor1Input) {
      hudColor1Input.value = settings.hudColor1 || "#ffb703"
      document.documentElement.style.setProperty(
        "--hud-color-1",
        settings.hudColor1 || "#ffb703",
      )
    }
    const hudColor2Input = document.getElementById("hud-color-2")
    if (hudColor2Input) {
      hudColor2Input.value = settings.hudColor2 || "#00f0ff"
      document.documentElement.style.setProperty(
        "--hud-color-2",
        settings.hudColor2 || "#00f0ff",
      )
    }
    const hudColor3Input = document.getElementById("hud-color-3")
    if (hudColor3Input) {
      hudColor3Input.value = settings.hudColor3 || "#4ade80"
      document.documentElement.style.setProperty(
        "--hud-color-3",
        settings.hudColor3 || "#4ade80",
      )
    }
    const hudColor4Input = document.getElementById("hud-color-4")
    if (hudColor4Input) {
      hudColor4Input.value = settings.hudColor4 || "#818cf8"
      document.documentElement.style.setProperty(
        "--hud-color-4",
        settings.hudColor4 || "#818cf8",
      )
    }

    const audioWaveSettings = document.getElementById("audio-wave-settings")
    if (audioWaveSettings) {
      document.getElementById("audio-wave-settings").style.display =
        settings.dateClockStyle === "audio-wave" ? "block" : "none"
    }

    const glassFloatSettings = document.getElementById("glass-float-settings")
    if (glassFloatSettings) {
      glassFloatSettings.style.display =
        settings.dateClockStyle === "glass-float" ? "block" : "none"
    }

    const ompSettings = document.getElementById("omp-settings")
    if (ompSettings) {
      ompSettings.style.display =
        settings.dateClockStyle === "macos-vintage" ? "block" : "none"
    }
    const ompPromptThemeSelect = document.getElementById(
      "omp-prompt-theme-select",
    )
    if (ompPromptThemeSelect)
      ompPromptThemeSelect.value = settings.ompPromptTheme || "powerline"
    const ompWindowStyleSelect = document.getElementById(
      "omp-window-style-select",
    )
    if (ompWindowStyleSelect)
      ompWindowStyleSelect.value = settings.ompWindowStyle || "windows"
    const ompOsIconSelect = document.getElementById("omp-os-icon-select")
    if (ompOsIconSelect) ompOsIconSelect.value = settings.ompOsIcon || "auto"
    const ompUserHostInput = document.getElementById("omp-user-host-input")
    if (ompUserHostInput)
      ompUserHostInput.value =
        settings.ompUserHost !== undefined
          ? settings.ompUserHost
          : "dev@startpage"
    const ompPathInput = document.getElementById("omp-path-input")
    if (ompPathInput)
      ompPathInput.value =
        settings.ompPath !== undefined ? settings.ompPath : "~/startpage"
    const ompBranchInput = document.getElementById("omp-branch-input")
    if (ompBranchInput)
      ompBranchInput.value =
        settings.ompBranch !== undefined ? settings.ompBranch : "main"
    const ompCursorStyleSelect = document.getElementById(
      "omp-cursor-style-select",
    )
    if (ompCursorStyleSelect)
      ompCursorStyleSelect.value = settings.ompCursorStyle || "block"
    const ompShowGitCheckbox = document.getElementById("omp-show-git-checkbox")
    if (ompShowGitCheckbox)
      ompShowGitCheckbox.checked = settings.ompShowGit !== false
    const ompShowBatteryCheckbox = document.getElementById(
      "omp-show-battery-checkbox",
    )
    if (ompShowBatteryCheckbox)
      ompShowBatteryCheckbox.checked = settings.ompShowBattery !== false
    const ompShowOsCheckbox = document.getElementById("omp-show-os-checkbox")
    if (ompShowOsCheckbox)
      ompShowOsCheckbox.checked = settings.ompShowOs !== false
    const ompCrtScanlinesCheckbox = document.getElementById(
      "omp-crt-scanlines-checkbox",
    )
    if (ompCrtScanlinesCheckbox)
      ompCrtScanlinesCheckbox.checked = settings.ompCrtScanlines === true

    document.body.classList.toggle(
      "omp-crt-enabled",
      settings.dateClockStyle === "macos-vintage" &&
        settings.ompCrtScanlines === true,
    )

    const aquariumSettings = document.getElementById("aquarium-settings")
    if (aquariumSettings) {
      aquariumSettings.style.display =
        settings.dateClockStyle === "aquarium" ? "block" : "none"
    }
    const aquariumWaterThemeSelect = document.getElementById("aquarium-water-theme-select")
    if (aquariumWaterThemeSelect)
      aquariumWaterThemeSelect.value = settings.aquariumWaterTheme || "tropical"
    const aquariumGlassStyleSelect = document.getElementById("aquarium-glass-style-select")
    if (aquariumGlassStyleSelect)
      aquariumGlassStyleSelect.value = settings.aquariumGlassStyle || "tank"
    const aquariumFishCountSelect = document.getElementById("aquarium-fish-count-select")
    if (aquariumFishCountSelect)
      aquariumFishCountSelect.value = String(settings.aquariumFishCount || 3)
    const aquariumFishSpeedSelect = document.getElementById("aquarium-fish-speed-select")
    if (aquariumFishSpeedSelect)
      aquariumFishSpeedSelect.value = settings.aquariumFishSpeed || "normal"
    const aquariumShowSeaweedCheckbox = document.getElementById("aquarium-show-seaweed-checkbox")
    if (aquariumShowSeaweedCheckbox)
      aquariumShowSeaweedCheckbox.checked = settings.aquariumShowSeaweed !== false
    const aquariumShowBubblesCheckbox = document.getElementById("aquarium-show-bubbles-checkbox")
    if (aquariumShowBubblesCheckbox)
      aquariumShowBubblesCheckbox.checked = settings.aquariumShowBubbles !== false

    const satelliteSettings = document.getElementById("satellite-settings")
    if (satelliteSettings) {
      satelliteSettings.style.display =
        settings.dateClockStyle === "satellite" ? "block" : "none"
    }
    const satAnimColorInput = document.getElementById("satellite-anim-color")
    if (satAnimColorInput) {
      satAnimColorInput.value = settings.satelliteAnimColor || "#00e5ff"
      document.documentElement.style.setProperty(
        "--sat-color",
        settings.satelliteAnimColor || "#00e5ff",
      )
    }
    const satSecColorInput = document.getElementById("satellite-sec-color")
    if (satSecColorInput) {
      satSecColorInput.value = settings.satelliteSecColor || "#00ff88"
      document.documentElement.style.setProperty(
        "--sat-sec-color",
        settings.satelliteSecColor || "#00ff88",
      )
    }
    const satTerColorInput = document.getElementById("satellite-ter-color")
    if (satTerColorInput) {
      satTerColorInput.value = settings.satelliteTerColor || "#c084fc"
      document.documentElement.style.setProperty(
        "--sat-ter-color",
        settings.satelliteTerColor || "#c084fc",
      )
    }
    const satDateColorInput = document.getElementById("satellite-date-color")
    if (satDateColorInput) {
      satDateColorInput.value = settings.satelliteDateColor || "#94a3b8"
      document.documentElement.style.setProperty(
        "--sat-date-color",
        settings.satelliteDateColor || "#94a3b8",
      )
    }
    const satBorderColorInput = document.getElementById("satellite-border-color")
    if (satBorderColorInput) {
      satBorderColorInput.value = settings.satelliteBorderColor || "#00e5ff"
      document.documentElement.style.setProperty(
        "--sat-border-color",
        settings.satelliteBorderColor || "#00e5ff",
      )
    }
    const satAnimStyleInput = document.getElementById("satellite-anim-style")
    if (satAnimStyleInput) {
      satAnimStyleInput.value = settings.satelliteAnimStyle || "classic"
    }

    const gfAnimationSelect = document.getElementById("gf-animation-select")
    if (gfAnimationSelect)
      gfAnimationSelect.value = settings.gfAnimation || "float"

    const gfCustomTextInput = document.getElementById("gf-custom-text")
    if (gfCustomTextInput) gfCustomTextInput.value = settings.gfCustomText || ""
    const gfGlowColorInput = document.getElementById("gf-glow-color")
    if (gfGlowColorInput)
      gfGlowColorInput.value = settings.gfGlowColor || "#ffffff"

    const codeStyleSettings = document.getElementById("code-style-settings")
    if (codeStyleSettings) {
      codeStyleSettings.style.display = style === "code" ? "block" : "none"
    }
    const customAngleSettings = document.getElementById("custom-angle-settings")
    if (customAngleSettings) {
      customAngleSettings.style.display =
        style === "custom-angle" ? "block" : "none"
      if (style === "custom-angle") {
        document.body.style.setProperty(
          "--skewX",
          (settings.customAngleSkewX !== undefined
            ? settings.customAngleSkewX
            : 15) + "deg",
        )
        document.body.style.setProperty(
          "--skewY",
          (settings.customAngleSkewY !== undefined
            ? settings.customAngleSkewY
            : 0) + "deg",
        )
        document.body.style.setProperty(
          "--rotate",
          (settings.customAngleRotate !== undefined
            ? settings.customAngleRotate
            : -5) + "deg",
        )
        document.body.style.setProperty(
          "--rotateX",
          (settings.customAngleRotateX !== undefined
            ? settings.customAngleRotateX
            : 0) + "deg",
        )
        document.body.style.setProperty(
          "--rotateY",
          (settings.customAngleRotateY !== undefined
            ? settings.customAngleRotateY
            : 0) + "deg",
        )
        document.body.style.setProperty(
          "--perspective",
          (settings.customAnglePerspective !== undefined
            ? settings.customAnglePerspective
            : 1000) + "px",
        )
      } else {
        document.body.style.removeProperty("--skewX")
        document.body.style.removeProperty("--skewY")
        document.body.style.removeProperty("--rotate")
        document.body.style.removeProperty("--rotateX")
        document.body.style.removeProperty("--rotateY")
        document.body.style.removeProperty("--perspective")
      }
    }

    const clockCutBottom =
      settings.clockCutBottom !== undefined ? settings.clockCutBottom : 0
    const clockFadeBottom =
      settings.clockFadeBottom !== undefined ? settings.clockFadeBottom : 100
    document.documentElement.style.setProperty(
      "--clock-cut-bottom",
      clockCutBottom + "px",
    )
    document.documentElement.style.setProperty(
      "--clock-visible-percent",
      clockFadeBottom + "%",
    )
    if (clockCutBottom > 0 || clockFadeBottom < 100) {
      document.body.classList.add("clock-occlusion-enabled")
    } else {
      document.body.classList.remove("clock-occlusion-enabled")
    }
    if (DOM.sidebarClockFlipSetting)
      DOM.sidebarClockFlipSetting.style.display =
        style === "sidebar" ? "block" : "none"

    if (DOM.clockStyleBgSetting)
      DOM.clockStyleBgSetting.style.display = backgroundClockStyles.includes(
        style,
      )
        ? "block"
        : "none"

    if (DOM.clockStyleBgSelect) {
      const animatedOption = DOM.clockStyleBgSelect.querySelector(
        'option[value="animated"]',
      )
      if (animatedOption) animatedOption.hidden = style !== "prism-stack"
      if (
        style !== "prism-stack" &&
        DOM.clockStyleBgSelect.value === "animated"
      ) {
        DOM.clockStyleBgSelect.value = "default"
      }
    }

    if (DOM.clockStyleCustomBgSetting) {
      DOM.clockStyleCustomBgSetting.style.display =
        backgroundClockStyles.includes(style) &&
        DOM.clockStyleBgSelect?.value === "custom"
          ? "flex"
          : "none"
    }

    const hasStyleAccentOption = CLOCK_STYLE_ACCENT_STYLES.includes(style)
    const usesM3Accent = getClockStyleUsesM3Accent(settings, style)

    if (DOM.clockStyleUseM3AccentSetting) {
      DOM.clockStyleUseM3AccentSetting.style.display = hasStyleAccentOption
        ? "flex"
        : "none"
    }

    if (DOM.clockStyleAccentColorSetting) {
      DOM.clockStyleAccentColorSetting.style.display =
        hasStyleAccentOption && !usesM3Accent ? "flex" : "none"
    }

    if (DOM.cartoonClockAnimationSetting) {
      DOM.cartoonClockAnimationSetting.style.display =
        style === "cartoon" ? "flex" : "none"
    }

    if (DOM.terminalClockVariantSetting) {
      DOM.terminalClockVariantSetting.style.display =
        style === "terminal" ? "block" : "none"
    }
    if (DOM.terminalClockVariantSelect) {
      DOM.terminalClockVariantSelect.value = [
        "window",
        "linux",
        "macos",
      ].includes(settings.terminalClockVariant)
        ? settings.terminalClockVariant
        : "window"
    }

    if (DOM.mediaOrbImageSetting)
      DOM.mediaOrbImageSetting.style.display =
        style === "media-orb" ? "block" : "none"
    if (DOM.mediaOrbImageUrlInput)
      DOM.mediaOrbImageUrlInput.value =
        settings.mediaOrbImageUrl || DEFAULT_MEDIA_ORB_IMAGE_URL
    if (DOM.mediaOrbOverflowBorderCheckbox)
      DOM.mediaOrbOverflowBorderCheckbox.checked =
        settings.mediaOrbOverflowBorder === true
    if (DOM.mediaOrbLayoutSelect)
      DOM.mediaOrbLayoutSelect.value = ["left", "right", "center"].includes(
        settings.mediaOrbLayout,
      )
        ? settings.mediaOrbLayout
        : "left"

    if (DOM.framedClockThemeSetting) {
      DOM.framedClockThemeSetting.style.display =
        style === "round" || style === "square" ? "block" : "none"
      if (DOM.framedClockThemeSelect) {
        DOM.framedClockThemeSelect.value = settings.framedClockTheme || "light"
      }
    }

    if (DOM.fliqloThemeSetting) {
      DOM.fliqloThemeSetting.style.display =
        style === "fliqlo" ? "block" : "none"
      if (DOM.fliqloThemeSelect) {
        DOM.fliqloThemeSelect.value = settings.fliqloTheme || "dark"
      }
      const divergenceColorSetting = document.getElementById(
        "fliqlo-divergence-color-setting",
      )
      if (divergenceColorSetting) {
        divergenceColorSetting.style.display =
          settings.fliqloTheme === "divergence" ? "flex" : "none"
      }
      const divergenceColorInput = document.getElementById(
        "fliqlo-divergence-color",
      )
      if (divergenceColorInput) {
        divergenceColorInput.value = settings.fliqloDivergenceColor || "#ff5500"
        document.documentElement.style.setProperty(
          "--fliqlo-divergence-color",
          divergenceColorInput.value,
        )
      }
      if (DOM.fliqloZenCheckbox) {
        DOM.fliqloZenCheckbox.checked = settings.fliqloZenMode === true
      }
      if (DOM.fliqloTransparentCheckbox) {
        DOM.fliqloTransparentCheckbox.checked =
          settings.fliqloTransparent === true
      }
    }

    // Special Background Effects Toggles
    if (DOM.gradientV2Active) {
      DOM.gradientV2Active.checked = settings.gradientV2Active === true
    }
    if (DOM.svgWaveActive) {
      DOM.svgWaveActive.checked = settings.svgWaveActive === true
    }
    if (DOM.silkActive) {
      DOM.silkActive.checked = settings.silkActive === true
    }
    if (DOM.lightPillarActive) {
      DOM.lightPillarActive.checked = settings.lightPillarActive === true
    }
    if (DOM.liquidEtherActive) {
      DOM.liquidEtherActive.checked = settings.liquidEtherActive === true
    }
    if (DOM.splashCursorActive) {
      DOM.splashCursorActive.checked = settings.splashCursorActive === true
    }
    if (DOM.splashCursorDarkBg) {
      DOM.splashCursorDarkBg.checked = settings.splashCursorDarkBg === true
    }
    if (DOM.splashCursorDarkBgBtn) {
      const isDark = settings.splashCursorDarkBg === true
      DOM.splashCursorDarkBgBtn.classList.toggle("active", isDark)
    }

    // Splash Cursor inputs
    if (DOM.splashCursorRainbow) {
      DOM.splashCursorRainbow.checked =
        settings.splashCursorRainbowMode !== false
    }
    if (DOM.splashCursorColorWrap) {
      DOM.splashCursorColorWrap.style.display =
        settings.splashCursorRainbowMode === false ? "block" : "none"
    }
    if (DOM.splashCursorColor) {
      DOM.splashCursorColor.value = settings.splashCursorColor || "#ff0000"
    }
    if (DOM.splashCursorShading) {
      DOM.splashCursorShading.checked = settings.splashCursorShading !== false
    }
    const scRangeMap = [
      ["splashCursorSplatRadius", "splashCursorSplatRadiusValue", 1],
      ["splashCursorSplatForce", "splashCursorSplatForceValue", 0],
      ["splashCursorCurl", "splashCursorCurlValue", 1],
      ["splashCursorDensity", "splashCursorDensityValue", 1],
      ["splashCursorVelocity", "splashCursorVelocityValue", 1],
      ["splashCursorColorSpeed", "splashCursorColorSpeedValue", 0],
      ["splashCursorDyeRes", "splashCursorDyeResValue", 0],
    ]
    const scDefaults = {
      splashCursorSplatRadius: 0.2,
      splashCursorSplatForce: 6000,
      splashCursorCurl: 3,
      splashCursorDensityDissipation: 3.5,
      splashCursorVelocityDissipation: 2,
      splashCursorColorUpdateSpeed: 10,
      splashCursorDyeResolution: 512,
    }
    scRangeMap.forEach(([id, valId, decimals]) => {
      const el = DOM[id]
      const valEl = DOM[valId]
      if (!el) return
      const key =
        id === "splashCursorDensity"
          ? "splashCursorDensityDissipation"
          : id === "splashCursorVelocity"
            ? "splashCursorVelocityDissipation"
            : id === "splashCursorColorSpeed"
              ? "splashCursorColorUpdateSpeed"
              : id === "splashCursorDyeRes"
                ? "splashCursorDyeResolution"
                : id === "splashCursorSplatRadius"
                  ? "splashCursorSplatRadius"
                  : id === "splashCursorSplatForce"
                    ? "splashCursorSplatForce"
                    : "splashCursorCurl"
      const v = settings[key] ?? scDefaults[key]
      el.value = v
      if (valEl) {
        valEl.textContent = decimals > 0 ? v.toFixed(decimals) : String(v)
      }
    })

    // Liquid Ether Inputs
    if (DOM.liquidEtherColor1) {
      DOM.liquidEtherColor1.value = settings.liquidEtherColor1 || "#5227FF"
    }
    if (DOM.liquidEtherColor2) {
      DOM.liquidEtherColor2.value = settings.liquidEtherColor2 || "#FF9FFC"
    }
    if (DOM.liquidEtherColor3) {
      DOM.liquidEtherColor3.value = settings.liquidEtherColor3 || "#B497CF"
    }
    if (DOM.liquidEtherGlowWidth) {
      const gw = settings.liquidEtherGlowWidth ?? 5.5
      DOM.liquidEtherGlowWidth.value = gw
      if (DOM.liquidEtherGlowWidthValue) {
        DOM.liquidEtherGlowWidthValue.textContent = gw.toFixed(1)
      }
    }

    if (DOM.analogBlurBgCheckbox)
      DOM.analogBlurBgCheckbox.checked = settings.analogBlurBackground === true

    if (DOM.pageTitleInput) {
      const titleVal = settings.pageTitle || "Start Page"
      DOM.pageTitleInput.value = titleVal
      if (DOM.pageTitleClearBtn) {
        DOM.pageTitleClearBtn.classList.toggle("hidden", !titleVal || titleVal === "Start Page")
      }
      if (DOM.pageTitleCharCount) {
        DOM.pageTitleCharCount.textContent = String(titleVal.length)
      }
      if (DOM.pageTitleCounterBadge) {
        DOM.pageTitleCounterBadge.classList.toggle("warning", titleVal.length > 40)
      }
      if (DOM.pageTitleLengthWarning) {
        DOM.pageTitleLengthWarning.classList.toggle("hidden", titleVal.length <= 40)
      }
      if (DOM.ptTabTitlePreview) {
        DOM.ptTabTitlePreview.textContent = resolveDynamicTokens(titleVal, settings, { isPreview: true })
      }
      if (DOM.ptTabAudioIcon) {
        const isMusicPlaying = Boolean(window._currentPlayingTrackTitle)
        DOM.ptTabAudioIcon.classList.toggle("hidden", !isMusicPlaying)
      }
    }
    if (DOM.pageTitleColorInput)
      DOM.pageTitleColorInput.value = settings.pageTitleColor || "#ffffff"
    if (DOM.tabIconBgColorInput)
      DOM.tabIconBgColorInput.value = settings.tabIconBgColor || "#1e1e32"
    if (DOM.tabIconTextColorInput)
      DOM.tabIconTextColorInput.value = settings.tabIconTextColor || "#ffffff"
    if (DOM.tabIconInput) {
      DOM.tabIconInput.value = String(settings.tabIcon || "").startsWith(
        "data:image/",
      )
        ? ""
        : settings.tabIcon || ""
    }
    const tabIconVal = settings.tabIcon || settings.tabIconFaClass || ""
    if (typeof effectInstances.renderTabIconPreview === "function") {
      effectInstances.renderTabIconPreview(tabIconVal, DOM.tabIconPreview)
      if (DOM.ptTabFaviconPreview) {
        effectInstances.renderTabIconPreview(tabIconVal || "SP", DOM.ptTabFaviconPreview)
      }
    }
    if (DOM.tabIconClearBtn) {
      DOM.tabIconClearBtn.hidden = !Boolean(
        settings.tabIcon || settings.tabIconFaClass,
      )
    }
    if (DOM.tabIconTransparentBgCheckbox) {
      DOM.tabIconTransparentBgCheckbox.checked =
        settings.tabIconTransparentBg === true
    }

    if (DOM.clockSizeInput) DOM.clockSizeInput.value = settings.clockSize
    if (DOM.clockSizeValue)
      DOM.clockSizeValue.textContent = `${settings.clockSize}rem`
    if (DOM.dateSizeInput) DOM.dateSizeInput.value = String(baseDateSize)
    if (DOM.dateSizeValue)
      DOM.dateSizeValue.textContent = `${DOM.dateSizeInput.value}rem`

    if (DOM.languageSelect) {
      const curLang = settings.language || "en"
      DOM.languageSelect.value = curLang
      const btnGroup = document.getElementById("language-button-group")
      if (btnGroup) {
        Array.from(btnGroup.children).forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.value === curLang)
        })
      }
    }
    if (DOM.accentColorPicker)
      DOM.accentColorPicker.value = settings.accentColor || "#a8c0ff"
    if (DOM.accentColorHexInput) {
      DOM.accentColorHexInput.value = (
        settings.accentColor || "#a8c0ff"
      ).toUpperCase()
    }
    if (DOM.m3AutoBgToggle) {
      DOM.m3AutoBgToggle.checked = settings.m3AutoAccentFromBg === true
    }
    if (DOM.m3AutoMusicToggle) {
      DOM.m3AutoMusicToggle.checked = settings.m3AutoAccentFromMusic === true
    }
    if (DOM.m3WidgetsToggle) {
      DOM.m3WidgetsToggle.checked = settings.widgetUseM3Accent === true
    }
    if (DOM.m3SidebarToggle) {
      DOM.m3SidebarToggle.checked = settings.sidebarUseM3Accent === true
    }
    if (DOM.m3PaletteStyleSelect) {
      DOM.m3PaletteStyleSelect.value = settings.m3PaletteStyle || "tonalSpot"
    }
    if (DOM.accentColorModeM3) {
      DOM.accentColorModeM3.checked =
        (settings.accentColorMode || "m3") === "m3"
    }
    if (DOM.accentColorModeDefault) {
      DOM.accentColorModeDefault.checked =
        settings.accentColorMode === "default"
    }
    DOM.clockColorPicker.value = currentClockColor
    if (DOM.clockDateStrokeWidthInput) {
      DOM.clockDateStrokeWidthInput.value = settings.clockDateStrokeWidth || 0
      if (DOM.clockDateStrokeWidthValue) {
        DOM.clockDateStrokeWidthValue.textContent = `${settings.clockDateStrokeWidth || 0}px`
      }
    }
    if (DOM.clockDateStrokeColorPicker) {
      DOM.clockDateStrokeColorPicker.value =
        settings.clockDateStrokeColor || "#000000"
    }
    if (DOM.clockDateStrokeTargetSelect) {
      DOM.clockDateStrokeTargetSelect.value =
        settings.clockDateStrokeTarget || "both"
    }
    DOM.dateColorPicker.value = currentDateColor

    // Sidebar text font weight selects
    const sidebarWeightSync = [
      ["sidebarSectionWeightSelect", "sidebarSectionFontWeight", "sidebar-section-weight-select", 600],
      ["sidebarLabelWeightSelect", "sidebarLabelFontWeight", "sidebar-label-weight-select", 400],
      ["sidebarNavWeightSelect", "sidebarNavFontWeight", "sidebar-nav-weight-select", 500],
      ["sidebarValueWeightSelect", "sidebarValueFontWeight", "sidebar-value-weight-select", 500],
    ]
    sidebarWeightSync.forEach(([domKey, settingKey, selectId, fallback]) => {
      const select = DOM[domKey]
      if (!select) return
      const weightVal = String(settings[settingKey] ?? fallback)
      select.value = weightVal
      document
        .querySelectorAll(`.lcp-preset-btn[data-preset-target="${selectId}"]`)
        .forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.presetVal === weightVal)
        })
    })

    // Custom Bookmark Inputs
    if (DOM.bookmarkFontSizeInput) {
      if (DOM.bookmarkFontSizeInput)
        DOM.bookmarkFontSizeInput.value = settings.bookmarkFontSize ?? 16
      if (DOM.bookmarkFontSizeValue && DOM.bookmarkFontSizeInput)
        DOM.bookmarkFontSizeValue.textContent = `${DOM.bookmarkFontSizeInput.value}px`

      if (DOM.bookmarkFontWeightSelect) {
        const bwVal = String(settings.bookmarkFontWeight ?? 600)
        DOM.bookmarkFontWeightSelect.value = bwVal
        document
          .querySelectorAll(
            '.lcp-preset-btn[data-preset-target="bookmark-font-weight-select"]',
          )
          .forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.presetVal === bwVal)
          })
      }

      if (DOM.bookmarkIconSizeInput)
        DOM.bookmarkIconSizeInput.value = settings.bookmarkIconSize ?? 42
      if (DOM.bookmarkIconSizeValue && DOM.bookmarkIconSizeInput)
        DOM.bookmarkIconSizeValue.textContent = `${DOM.bookmarkIconSizeInput.value}px`

      if (DOM.bookmarkFaviconRes) {
        DOM.bookmarkFaviconRes.value = settings.bookmarkFaviconRes ?? 128
      }

      if (DOM.bookmarkGroupTextWidthInput)
        DOM.bookmarkGroupTextWidthInput.value =
          settings.bookmarkGroupTextWidth ?? 120
      if (DOM.bookmarkGroupTextWidthValue && DOM.bookmarkGroupTextWidthInput)
        DOM.bookmarkGroupTextWidthValue.textContent = `${DOM.bookmarkGroupTextWidthInput.value}px`

      if (DOM.bookmarkGroupFontWeightSelect) {
        const gbwVal = String(settings.bookmarkGroupFontWeight ?? 500)
        DOM.bookmarkGroupFontWeightSelect.value = gbwVal
        document
          .querySelectorAll(
            '.lcp-preset-btn[data-preset-target="bookmark-group-font-weight-select"]',
          )
          .forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.presetVal === gbwVal)
          })
      }

      if (DOM.bookmarkGapInput)
        DOM.bookmarkGapInput.value = settings.bookmarkGap ?? 8
      if (DOM.bookmarkGapValue && DOM.bookmarkGapInput)
        DOM.bookmarkGapValue.textContent = `${DOM.bookmarkGapInput.value}px`

      const normalizeQuickAccessRadius = (value, fallback = "8px") => {
        const allowed = new Set([
          "0px",
          "4px",
          "5px",
          "8px",
          "10px",
          "12px",
          "14px",
          "16px",
          "18px",
          "20px",
        ])
        const match = String(value || "").match(/^(\d+(?:\.\d+)?)px$/)
        if (!match) return fallback
        const px = Math.min(20, Math.max(0, Math.round(Number(match[1]))))
        const normalized = `${px}px`
        return allowed.has(normalized) ? normalized : fallback
      }
      if (DOM.lcpQuickAccessButtonRadius) {
        DOM.lcpQuickAccessButtonRadius.value = normalizeQuickAccessRadius(
          settings.quickAccessBorderRadius,
          "5px",
        )
      }
      if (DOM.lcpQuickAccessBarRadius) {
        DOM.lcpQuickAccessBarRadius.value = normalizeQuickAccessRadius(
          settings.quickAccessBarRadius,
          "14px",
        )
      }
      if (DOM.lcpQuickAccessToggleRadius) {
        DOM.lcpQuickAccessToggleRadius.value = normalizeQuickAccessRadius(
          settings.quickAccessToggleRadius,
          "20px",
        )
      }
      if (DOM.lcpQuickAccessSkin) {
        DOM.lcpQuickAccessSkin.value = [
          "default",
          "light",
          "m3-accent",
          "transparent",
          "light-transparent",
          "contrast",
        ].includes(settings.quickAccessSkin)
          ? settings.quickAccessSkin
          : "default"
      }
      if (DOM.lcpQuickAccessBorderVisible) {
        DOM.lcpQuickAccessBorderVisible.checked =
          settings.quickAccessBorderVisible !== false
      }

      if (DOM.bookmarkBgColorPicker)
        DOM.bookmarkBgColorPicker.value = settings.bookmarkBgColor || "#ffffff"
      if (DOM.bookmarkBgOpacityInput) {
        DOM.bookmarkBgOpacityInput.value = settings.bookmarkBgOpacity ?? 100
        if (DOM.bookmarkBgOpacityValue)
          DOM.bookmarkBgOpacityValue.textContent = `${DOM.bookmarkBgOpacityInput.value}%`
      }

      if (DOM.bookmarkGroupBgColorPicker) {
        DOM.bookmarkGroupBgColorPicker.value =
          settings.bookmarkGroupBgColor || "#ffffff"
      }
      if (DOM.bookmarkGroupBgOpacityInput) {
        DOM.bookmarkGroupBgOpacityInput.value =
          settings.bookmarkGroupBgOpacity ?? 0
        if (DOM.bookmarkGroupBgOpacityValue)
          DOM.bookmarkGroupBgOpacityValue.textContent = `${DOM.bookmarkGroupBgOpacityInput.value}%`
      }
      if (DOM.bookmarkGroupTextColorPicker) {
        DOM.bookmarkGroupTextColorPicker.value =
          settings.bookmarkGroupTextColor || "#ffffff"
      }
      if (DOM.bookmarkGroupAutoTextContrast) {
        DOM.bookmarkGroupAutoTextContrast.checked =
          settings.bookmarkGroupAutoTextContrast === true
      }
      if (DOM.bookmarkGroupFontSizeInput) {
        DOM.bookmarkGroupFontSizeInput.value =
          settings.bookmarkGroupFontSize ?? 14
        if (DOM.bookmarkGroupFontSizeValue)
          DOM.bookmarkGroupFontSizeValue.textContent = `${DOM.bookmarkGroupFontSizeInput.value}px`
      }
      if (DOM.bookmarkGroupBorderRadiusInput) {
        DOM.bookmarkGroupBorderRadiusInput.value =
          settings.bookmarkGroupBorderRadius ?? 8
        if (DOM.bookmarkGroupBorderRadiusValue)
          DOM.bookmarkGroupBorderRadiusValue.textContent = `${DOM.bookmarkGroupBorderRadiusInput.value}px`
      }

      if (DOM.bookmarkTextColorPicker) {
        DOM.bookmarkTextColorPicker.value =
          settings.bookmarkTextColor || "#ffffff"
      }
      if (DOM.hideBookmarkText) {
        DOM.hideBookmarkText.checked = settings.bookmarkHideText === true
      }
      if (DOM.bookmarkLongText) {
        DOM.bookmarkLongText.checked = settings.bookmarkLongText === true
      }
      if (DOM.bookmarkFullText) {
        DOM.bookmarkFullText.checked = settings.bookmarkFullText === true
      }
      if (DOM.hideBookmarkBg) {
        DOM.hideBookmarkBg.checked = settings.bookmarkHideBg === true
      }
      if (DOM.bookmarkHideScrollbarCheckbox) {
        DOM.bookmarkHideScrollbarCheckbox.checked =
          settings.bookmarkHideScrollbar === true
      }
      if (DOM.bookmarkMacosHover) {
        DOM.bookmarkMacosHover.checked = settings.bookmarkMacosHover === true
      }
      if (DOM.bookmarkLayout) {
        let val = settings.bookmarkLayout || "default"
        if (settings.bookmarkSidebarMode === true && val === "default")
          val = "sidebar"
        DOM.bookmarkLayout.value = val
        if (DOM.lcpBookmarkLayout) DOM.lcpBookmarkLayout.value = val

        if (DOM.bookmarkLayoutBgStyleRow) {
          DOM.bookmarkLayoutBgStyleRow.style.display =
            val === "default" ? "none" : "flex"
        }

        // Draggable Grid: show/hide lock row and set checkbox
        const lockRow = document.getElementById("lcp-draggable-grid-lock-row")
        if (lockRow) {
          lockRow.style.display = val === "draggable-grid" ? "flex" : "none"
        }
        const lockCheckbox = document.getElementById("lcp-draggable-grid-lock")
        if (lockCheckbox) {
          lockCheckbox.checked = settings.bookmarkDraggableGridLocked === true
        }
        const freeMoveLcp = document.getElementById("lcp-free-move-bookmarks")
        if (freeMoveLcp) {
          freeMoveLcp.checked = settings.freeMoveBookmarks === true
        }
      }
      if (DOM.lcpBrowserZoom && settings.browserZoomFactor !== undefined) {
        DOM.lcpBrowserZoom.value = String(settings.browserZoomFactor)
      }
      if (DOM.bookmarkLayoutBgStyle) {
        DOM.bookmarkLayoutBgStyle.value =
          settings.bookmarkLayoutBgStyle || "default"
        if (DOM.bookmarkLayoutBgColorRow) {
          DOM.bookmarkLayoutBgColorRow.style.display =
            DOM.bookmarkLayoutBgStyle.value === "colored" ? "flex" : "none"
        }
      }
      if (DOM.bookmarkLayoutBgColor) {
        DOM.bookmarkLayoutBgColor.value =
          settings.bookmarkLayoutBgColor || "#000000"
      }
      if (DOM.bookmarkItemStyle) {
        DOM.bookmarkItemStyle.value = settings.bookmarkItemStyle || "default"
      }

      if (DOM.bookmarkShadowColorPicker) {
        DOM.bookmarkShadowColorPicker.value =
          settings.bookmarkShadowColor || "#000000"
      }
      if (DOM.bookmarkShadowOpacityInput) {
        DOM.bookmarkShadowOpacityInput.value =
          settings.bookmarkShadowOpacity ?? 24
        if (DOM.bookmarkShadowOpacityValue)
          DOM.bookmarkShadowOpacityValue.textContent = `${DOM.bookmarkShadowOpacityInput.value}%`
      }
      if (DOM.bookmarkShadowBlurInput) {
        DOM.bookmarkShadowBlurInput.value = settings.bookmarkShadowBlur ?? 8
        if (DOM.bookmarkShadowBlurValue) {
          DOM.bookmarkShadowBlurValue.textContent = `${DOM.bookmarkShadowBlurInput.value}px`
        }
      }

      if (DOM.enableBookmarkDrag) {
        DOM.enableBookmarkDrag.checked = settings.bookmarkEnableDrag === true
      }
      if (DOM.bookmarkKeepNestedFolders) {
        DOM.bookmarkKeepNestedFolders.checked =
          settings.bookmarkKeepNestedFolders === true
      }
      if (DOM.bookmarkLimit20) {
        DOM.bookmarkLimit20.checked = settings.bookmarkLimit20 !== false
      }
      if (DOM.showAddBookmarkButton) {
        DOM.showAddBookmarkButton.checked =
          settings.showAddBookmarkButton !== false
      }
      if (DOM.bookmarkGroupShowCount) {
        DOM.bookmarkGroupShowCount.checked =
          settings.bookmarkGroupShowCount !== false
      }
      if (DOM.bookmarkGroupUseAccent) {
        DOM.bookmarkGroupUseAccent.checked =
          settings.bookmarkGroupUseAccent === true
      }
      if (DOM.bookmarkGroupKeepBgOnInteraction) {
        DOM.bookmarkGroupKeepBgOnInteraction.checked =
          settings.bookmarkGroupKeepBgOnInteraction !== false
      }
      if (DOM.bookmarkGroupContainerBgHidden) {
        DOM.bookmarkGroupContainerBgHidden.checked =
          settings.bookmarkGroupContainerBgHidden === true
      }
      if (DOM.bookmarkGroupBorderHidden) {
        DOM.bookmarkGroupBorderHidden.checked =
          settings.bookmarkGroupBorderHidden === true
      }
      if (DOM.bookmarkGroupLongText) {
        DOM.bookmarkGroupLongText.checked =
          settings.bookmarkGroupLongText === true
      }
      if (DOM.bookmarkGroupFullText) {
        DOM.bookmarkGroupFullText.checked =
          settings.bookmarkGroupFullText === true
      }
      if (DOM.bookmarkGroupMaxVisibleInput) {
        const mvVal = settings.bookmarkGroupMaxVisible ?? 8
        DOM.bookmarkGroupMaxVisibleInput.value = mvVal
        if (DOM.bookmarkGroupMaxVisibleValue) {
          DOM.bookmarkGroupMaxVisibleValue.textContent =
            mvVal >= 25 ? "All" : String(mvVal)
        }
        document
          .querySelectorAll(
            '.lcp-preset-btn[data-preset-target="bookmark-group-max-visible-input"]',
          )
          .forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.presetVal === String(mvVal))
          })
      }
      if (DOM.bookmarkGroupMaxRowsSelect) {
        DOM.bookmarkGroupMaxRowsSelect.value =
          settings.bookmarkGroupMaxRows || "auto"
      }
      const swEarly = settings.settingsSidebarWidth || 500
      document.documentElement.style.setProperty(
        "--sidebar-width",
        swEarly + "px",
      )
      if (DOM.settingsSidebarWidthInput)
        DOM.settingsSidebarWidthInput.value = swEarly
      if (DOM.settingsSidebarWidthValue)
        DOM.settingsSidebarWidthValue.textContent =
          swEarly + "px"
      document
        .querySelectorAll(
          '.lcp-preset-btn[data-preset-target="settings-sidebar-width-input"], .sidebar-width-preset-btn, [data-sidebar-width]',
        )
        .forEach((btn) => {
          const v = btn.dataset.presetVal || btn.dataset.sidebarWidth
          btn.classList.toggle("active", v === String(swEarly))
        })
      if (settings.bookmarkSidebarWidth) {
        document.documentElement.style.setProperty(
          "--bookmark-sidebar-width",
          settings.bookmarkSidebarWidth + "px",
        )
        if (DOM.bookmarkSidebarWidthInput)
          DOM.bookmarkSidebarWidthInput.value = settings.bookmarkSidebarWidth
        if (DOM.bookmarkSidebarWidthValue)
          DOM.bookmarkSidebarWidthValue.textContent =
            settings.bookmarkSidebarWidth + "px"
      }
      if (DOM.bookmarkLayout) {
        if (DOM.bookmarkSidebarWidthContainer) {
          DOM.bookmarkSidebarWidthContainer.style.display =
            settings.bookmarkLayout === "sidebar" ? "block" : "none"
        }
      }
      if (DOM.bookmarkLayoutShowGroups) {
        DOM.bookmarkLayoutShowGroups.checked =
          settings.showBookmarkGroups !== false
      }
    }

    DOM.bgSizeSelect.value = settings.bgSize || "cover"
    if (DOM.bgImageScaleInput) {
      DOM.bgImageScaleInput.value = settings.bgImageScale ?? 100
    }
    if (DOM.bgImageScaleValue) {
      DOM.bgImageScaleValue.textContent = `${settings.bgImageScale ?? 100}%`
    }
    if (DOM.bgImageScaleRow) {
      DOM.bgImageScaleRow.style.display =
        (settings.bgSize || "cover") === "custom" ? "block" : "none"
    }
    DOM.bgBlurInput.value = settings.bgBlur ?? 0
    DOM.bgBlurValue.textContent = `${settings.bgBlur ?? 0}px`
    if (DOM.bgBlurDirectionSelect) {
      DOM.bgBlurDirectionSelect.value = settings.bgBlurDirection || "none"
    }
    if (DOM.bgBlurColorInput) {
      DOM.bgBlurColorInput.value = settings.bgBlurColor || "#000000"
    }
    if (DOM.bgBlurColorOpacityInput) {
      DOM.bgBlurColorOpacityInput.value = settings.bgBlurColorOpacity || 0
      if (DOM.bgBlurColorOpacityValue)
        DOM.bgBlurColorOpacityValue.textContent = `${settings.bgBlurColorOpacity || 0}%`
    }
    DOM.bgBrightnessInput.value = settings.bgBrightness ?? 100
    DOM.bgBrightnessValue.textContent = `${settings.bgBrightness ?? 100}%`

    if (DOM.bgContrastInput) {
      DOM.bgContrastInput.value = settings.bgContrast ?? 100
      if (DOM.bgContrastValue)
        DOM.bgContrastValue.textContent = `${settings.bgContrast ?? 100}%`
    }
    if (DOM.bgSaturationInput) {
      DOM.bgSaturationInput.value = settings.bgSaturation ?? 100
      if (DOM.bgSaturationValue)
        DOM.bgSaturationValue.textContent = `${settings.bgSaturation ?? 100}%`
    }
    if (DOM.backgroundMediaQualitySelect) {
      DOM.backgroundMediaQualitySelect.value =
        settings.backgroundMediaQuality || "balanced"
    }
    if (DOM.freePhotosQualitySelect) {
      DOM.freePhotosQualitySelect.value =
        settings.backgroundMediaQuality || "balanced"
    }
    DOM.bgPosXInput.value = settings.bgPositionX || 50
    DOM.bgPosXValue.textContent = `${DOM.bgPosXInput.value}%`
    DOM.bgPosYInput.value = settings.bgPositionY || 50
    DOM.bgPosYValue.textContent = `${DOM.bgPosYInput.value}%`

    const curPosX = Math.round(Number(settings.bgPositionX ?? 50))
    const curPosY = Math.round(Number(settings.bgPositionY ?? 50))
    if (DOM.bgPositionPadHandle) {
      DOM.bgPositionPadHandle.style.left = `${curPosX}%`
      DOM.bgPositionPadHandle.style.top = `${curPosY}%`
    }
    if (DOM.bgPositionPadCoords) {
      DOM.bgPositionPadCoords.textContent = `${curPosX}%, ${curPosY}%`
    }
    if (DOM.bgPositionPadPreview) {
      const bgLayer = document.getElementById("bg-layer")
      if (bgLayer && bgLayer.style.backgroundImage) {
        DOM.bgPositionPadPreview.style.backgroundImage =
          bgLayer.style.backgroundImage
        DOM.bgPositionPadPreview.style.display = "block"
      } else {
        DOM.bgPositionPadPreview.style.display = "none"
      }
    }
    document.querySelectorAll(".bg-9grid-btn").forEach((btn) => {
      const bx = Number(btn.dataset.posX)
      const by = Number(btn.dataset.posY)
      btn.classList.toggle("active", bx === curPosX && by === curPosY)
    })

    DOM.unsplashCategorySelect.value =
      settings.unsplashCategory || "spring-wallpapers"
    if (DOM.unsplashAutoRandomSelect) {
      DOM.unsplashAutoRandomSelect.value =
        settings.unsplashAutoRandomMode || "off"
    }
    if (DOM.unsplashAccessKeyInput)
      DOM.unsplashAccessKeyInput.value = settings.unsplashAccessKey || ""

    const unsplashSaveBtn = document.getElementById("unsplash-save-bg-btn")
    if (unsplashSaveBtn) {
      const isUnsplashBackground =
        typeof settings.background === "string" &&
        (settings.background.startsWith("idb-img-unsplash-") ||
          settings.background.includes("images.unsplash.com"))
      if (settings.background && isUnsplashBackground) {
        const userBackgrounds = settings.userBackgrounds || []
        const isSaved = userBackgrounds.some(
          (bg) =>
            (typeof bg === "string" ? bg : bg.id) === settings.background ||
            (settings.unsplashLastCredit?.photoUrl &&
              typeof bg === "object" &&
              bg.photoUrl === settings.unsplashLastCredit.photoUrl),
        )
        unsplashSaveBtn.disabled = isSaved

        const i18n = typeof geti18n === "function" ? geti18n() : null
        if (isSaved) {
          unsplashSaveBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>${i18n?.settings_unsplash_saved || "Saved"}</span>`
        } else {
          unsplashSaveBtn.innerHTML = `<i class="fa-solid fa-download"></i> <span>${i18n?.settings_unsplash_save || "Save Background"}</span>`
        }
      } else {
        unsplashSaveBtn.disabled = true
      }
    }

    const isImageBg =
      settings.background &&
      !isIdbVideo(settings.background) &&
      (isIdbImage(settings.background) ||
        settings.background.startsWith("data:image/") ||
        settings.background.startsWith("blob:") ||
        settings.background.startsWith("http"))
    const isVideoBg =
      settings.background &&
      (isIdbVideo(settings.background) ||
        settings.background.startsWith("data:video/") ||
        isVideoBackgroundValue(settings.background))

    if (DOM.bgPositionSetting)
      DOM.bgPositionSetting.style.display =
        isImageBg || isVideoBg ? "block" : "none"

    updateActiveWallpaperBanner()

    DOM.clockColorPicker.style.opacity = settings.clockColor ? "1" : "0.5"
    DOM.dateColorPicker.style.opacity = settings.dateColor ? "1" : "0.5"
    setEffectActive(DOM.effectGrid, settings.effect)
    DOM.performanceModeBtns?.forEach((btn) => {
      btn.classList.toggle(
        "active",
        btn.dataset.mode === (settings.performanceMode || "auto"),
      )
    })
    if (DOM.effectReduceMotionSelect) {
      DOM.effectReduceMotionSelect.value = settings.reduceMotion || "system"
    }
    if (DOM.effectIntensitySlider) {
      const intensity = Number.isFinite(settings.effectIntensity)
        ? settings.effectIntensity
        : 100
      DOM.effectIntensitySlider.value = intensity
      if (DOM.effectIntensityVal) {
        DOM.effectIntensityVal.textContent = `${intensity}%`
      }
    }
    if (DOM.effectMouseInteractionToggle) {
      DOM.effectMouseInteractionToggle.checked =
        settings.effectMouseInteraction !== false
    }

    // Gradient Inputs
    DOM.gradientStartPicker.value = settings.gradientStart
    DOM.gradientEndPicker.value = settings.gradientEnd
    DOM.gradientAngleInput.value = settings.gradientAngle
    DOM.gradientAngleValue.textContent = settings.gradientAngle
    if (DOM.gradientTypeSelect) {
      DOM.gradientTypeSelect.value = settings.gradientType || "linear"
    }
    if (DOM.gradientPositionSelect) {
      DOM.gradientPositionSelect.value = settings.gradientPosition || "center"
    }
    if (DOM.gradientRadialShapeSelect) {
      DOM.gradientRadialShapeSelect.value =
        settings.gradientRadialShape || "circle"
    }
    if (DOM.gradientRepeatingToggle) {
      DOM.gradientRepeatingToggle.checked = settings.gradientRepeating === true
    }
    if (DOM.gradientSettingsBody) {
      const isOpen = settings.gradientControlsOpen !== false
      DOM.gradientSettingsBody.style.display = "block"
      DOM.gradientSettingsBody.classList.toggle("is-collapsed", !isOpen)
      DOM.gradientToggleBtn?.setAttribute("aria-expanded", String(isOpen))
      if (DOM.gradientToggleLabel) {
        const i18n = geti18n()
        DOM.gradientToggleLabel.textContent =
          i18n[isOpen ? "settings_gradient_close" : "settings_gradient_open"] ||
          (isOpen ? "Hide Controls" : "Show Controls")
      }
    }
    if (DOM.gradientExtraColorCount) {
      DOM.gradientExtraColorCount.value = String(
        Math.min(
          5,
          Math.max(
            0,
            settings.gradientExtraColorCount !== undefined
              ? Number(settings.gradientExtraColorCount)
              : 2,
          ),
        ),
      )
    }
    if (DOM.gradientCustomColors) {
      DOM.gradientCustomColors.value = settings.gradientCustomColors || ""
    }
    updateGradientLivePreview(DOM)

    // Effect Color Inputs
    if (DOM.googleDriveSyncCheckbox) {
      DOM.googleDriveSyncCheckbox.checked = settings.googleDriveSync === true
    }
    if (DOM.driveSyncOptionsWrapper) {
      DOM.driveSyncOptionsWrapper.style.display =
        settings.googleDriveSync === true ? "block" : "none"
    }
    if (DOM.driveAutoBackupInterval) {
      DOM.driveAutoBackupInterval.value =
        settings.driveAutoBackupInterval || "none"
    }

    // GitHub Gist Sync
    if (DOM.githubSyncCheckbox) {
      DOM.githubSyncCheckbox.checked = settings.githubSync === true
    }
    if (DOM.githubSyncOptionsWrapper) {
      DOM.githubSyncOptionsWrapper.style.display =
        settings.githubSync === true ? "block" : "none"
    }
    if (DOM.githubSyncTokenInput) {
      DOM.githubSyncTokenInput.value = settings.githubSyncToken || ""
    }
    if (DOM.githubSyncGistIdInput) {
      DOM.githubSyncGistIdInput.value = settings.githubSyncGistId || ""
    }
    if (DOM.githubAutoBackupInterval) {
      DOM.githubAutoBackupInterval.value =
        settings.githubAutoBackupInterval || "none"
    }

    // GitLab Snippet Sync
    if (DOM.gitlabSyncCheckbox) {
      DOM.gitlabSyncCheckbox.checked = settings.gitlabSync === true
    }
    if (DOM.gitlabSyncOptionsWrapper) {
      DOM.gitlabSyncOptionsWrapper.style.display =
        settings.gitlabSync === true ? "block" : "none"
    }
    if (DOM.gitlabSyncTokenInput) {
      DOM.gitlabSyncTokenInput.value = settings.gitlabSyncToken || ""
    }
    if (DOM.gitlabSyncSnippetIdInput) {
      DOM.gitlabSyncSnippetIdInput.value = settings.gitlabSyncSnippetId || ""
    }
    if (DOM.gitlabAutoBackupInterval) {
      DOM.gitlabAutoBackupInterval.value =
        settings.gitlabAutoBackupInterval || "none"
    }

    DOM.starColorPicker.value = settings.starColor || "#ffffff"
    DOM.meteorColorPicker.value =
      settings.meteorColor || settings.starColor || "#ffffff"
    if (DOM.meteorFullColorToggle) {
      DOM.meteorFullColorToggle.checked = settings.meteorFullColor === true
    }
    if (DOM.meteorAngleInput) {
      DOM.meteorAngleInput.value = settings.meteorAngle ?? 45
      if (DOM.meteorAngleValue)
        DOM.meteorAngleValue.textContent = `${settings.meteorAngle ?? 45}°`
    }
    DOM.networkColorPicker.value = settings.networkColor || "#00bcd4"
    DOM.matrixColorPicker.value = settings.matrixColor || "#00FF00"
    if (DOM.matrixStyleSelect) {
      DOM.matrixStyleSelect.value = settings.matrixStyle || "hd"
    }
    DOM.auraColorPicker.value = settings.auraColor || "#a8c0ff"
    DOM.northernLightsColorPicker.value =
      settings.northernLightsColor || "#00ff88"
    if (DOM.northernLightsStyleSelect) {
      DOM.northernLightsStyleSelect.value = settings.northernLightsStyle || "hd"
    }
    if (DOM.northernLightsBrightnessSlider) {
      const b = settings.northernLightsBrightness ?? 0.8
      DOM.northernLightsBrightnessSlider.value = b
      if (DOM.northernLightsBrightnessVal)
        DOM.northernLightsBrightnessVal.textContent = b.toFixed(1)
    }
    if (DOM.northernLightsSpeedSlider) {
      const spd = settings.northernLightsSpeed !== undefined ? settings.northernLightsSpeed : 1.0
      DOM.northernLightsSpeedSlider.value = spd
      if (DOM.northernLightsSpeedVal)
        DOM.northernLightsSpeedVal.textContent = `${spd.toFixed(1)}x`
    }
    if (DOM.northernLightsStarsToggle) {
      DOM.northernLightsStarsToggle.checked = settings.northernLightsStars !== false
    }
    if (DOM.northernLightsMeteorsToggle) {
      DOM.northernLightsMeteorsToggle.checked = settings.northernLightsMeteors !== false
    }
    if (DOM.northernLightsTransparentCheckbox) {
      DOM.northernLightsTransparentCheckbox.checked = settings.northernLightsTransparent !== false
    }
    if (DOM.hackerModeSelect) {
      DOM.hackerModeSelect.value = settings.hackerMode || "hollywood"
    }
    DOM.hackerColorPicker.value = settings.hackerColor || "#00FF00"
    DOM.pixelCubesColorPicker.value = settings.pixelCubesColor || "#00ff73"
    if (DOM.jellyfishColorPicker) {
      DOM.jellyfishColorPicker.value = settings.jellyfishColor || "#ffaa00"
    }
    DOM.sakuraColorPicker.value = settings.sakuraColor || "#ffb7c5"
    DOM.snowfallColorPicker.value = settings.snowfallColor || "#ffffff"
    DOM.bubblesColorPicker.value = settings.bubbleColor || "#60c8ff"
    DOM.gridScanColorPicker.value = settings.gridScanColor || "#00ffcc"
    DOM.cursorTrailColorPicker.value = settings.cursorTrailColor || "#60c8ff"
    if (DOM.flashlightColorPicker) {
      DOM.flashlightColorPicker.value = settings.flashlightColor || "#000000"
    }
    if (DOM.flashlightSizeSlider) {
      DOM.flashlightSizeSlider.value = settings.flashlightSize || 150
      if (DOM.flashlightSizeVal) {
        DOM.flashlightSizeVal.textContent = settings.flashlightSize || 150
      }
    }
    if (DOM.flashlightOpacitySlider) {
      DOM.flashlightOpacitySlider.value = settings.flashlightOpacity ?? 0.9
      if (DOM.flashlightOpacityVal) {
        DOM.flashlightOpacityVal.textContent = (
          settings.flashlightOpacity ?? 0.9
        ).toFixed(2)
      }
    }
    if (DOM.plantGrowthColorPicker) {
      DOM.plantGrowthColorPicker.value = settings.plantGrowthColor || "#4caf50"
    }
    if (DOM.plantGrowthModeSelect) {
      DOM.plantGrowthModeSelect.value = settings.plantGrowthMode || "enchanted"
    }
    if (DOM.plantGrowthCustomColorWrap) {
      DOM.plantGrowthCustomColorWrap.style.display =
        (settings.plantGrowthMode || "enchanted") === "custom" ? "block" : "none"
    }
    if (DOM.oceanFishStyleSelect) {
      DOM.oceanFishStyleSelect.value = settings.oceanFishStyle || "cartoon"
    }
    if (DOM.lightPillarsModeSelect) {
      DOM.lightPillarsModeSelect.value = settings.lightPillarsMode || "arctic"
    }
    if (DOM.lightPillarsCustomColorWrap) {
      DOM.lightPillarsCustomColorWrap.style.display =
        (settings.lightPillarsMode || "arctic") === "custom" ? "block" : "none"
    }
    if (DOM.lightPillarsColorPicker) {
      DOM.lightPillarsColorPicker.value = settings.lightPillarsColor || "#88ccff"
    }
    if (DOM.floatingLinesColorPicker) {
      DOM.floatingLinesColorPicker.value =
        settings.floatingLinesColor || "#ffffff"
    }
    if (DOM.floatingLinesAngleInput) {
      DOM.floatingLinesAngleInput.value = settings.floatingLinesAngle || 0
    }
    if (DOM.floatingLinesAngleValue) {
      DOM.floatingLinesAngleValue.textContent = `${settings.floatingLinesAngle || 0}°`
    }
    if (DOM.floatingLinesSpeedInput) {
      DOM.floatingLinesSpeedInput.value = settings.floatingLinesSpeed !== undefined ? settings.floatingLinesSpeed : 1.0
    }
    if (DOM.floatingLinesSpeedValue) {
      DOM.floatingLinesSpeedValue.textContent = `${(settings.floatingLinesSpeed !== undefined ? settings.floatingLinesSpeed : 1.0).toFixed(1)}x`
    }
    if (DOM.floatingLinesCountInput) {
      DOM.floatingLinesCountInput.value = settings.floatingLinesCount !== undefined ? settings.floatingLinesCount : 4
    }
    if (DOM.floatingLinesCountValue) {
      DOM.floatingLinesCountValue.textContent = `${settings.floatingLinesCount !== undefined ? settings.floatingLinesCount : 4}`
    }
    if (DOM.floatingLinesTransparentToggle) {
      DOM.floatingLinesTransparentToggle.checked = !!settings.floatingLinesTransparent
    }

    // Hyperspace 3D
    if (DOM.hyperspaceStyleSelect) {
      DOM.hyperspaceStyleSelect.value = settings.hyperspaceStyle || "warpDrive"
    }
    if (DOM.hyperspaceColorPicker) {
      DOM.hyperspaceColorPicker.value = settings.hyperspaceColor || settings.accentColor || "#00e5ff"
    }
    if (DOM.hyperspaceSpeedSlider) {
      DOM.hyperspaceSpeedSlider.value = settings.hyperspaceSpeed !== undefined ? settings.hyperspaceSpeed : 1.8
    }
    if (DOM.hyperspaceSpeedValue) {
      DOM.hyperspaceSpeedValue.textContent = `${(settings.hyperspaceSpeed !== undefined ? settings.hyperspaceSpeed : 1.8).toFixed(1)}x`
    }
    if (DOM.hyperspaceStarCountSlider) {
      DOM.hyperspaceStarCountSlider.value = settings.hyperspaceStarCount !== undefined ? settings.hyperspaceStarCount : 1100
    }
    if (DOM.hyperspaceStarCountValue) {
      DOM.hyperspaceStarCountValue.textContent = `${settings.hyperspaceStarCount !== undefined ? settings.hyperspaceStarCount : 1100}`
    }
    if (DOM.hyperspaceTransparentToggle) {
      DOM.hyperspaceTransparentToggle.checked = !!settings.hyperspaceTransparent
    }

    DOM.rainHDColorPicker.value = settings.rainHDColor || "#99ccff"

    if (DOM.dvdTitleInput) {
      DOM.dvdTitleInput.value = settings.dvdTitle || "DVD"
    }
    if (DOM.dvdColorModeSelect) {
      DOM.dvdColorModeSelect.value = settings.dvdColorMode || "random"
    }
    if (DOM.dvdSpeedSlider) {
      DOM.dvdSpeedSlider.value = settings.dvdSpeed || 3
      if (DOM.dvdSpeedVal) DOM.dvdSpeedVal.textContent = settings.dvdSpeed || 3
    }
    if (DOM.dvdCloneSlider) {
      DOM.dvdCloneSlider.value = settings.dvdCloneCount || 1
      if (DOM.dvdCloneVal)
        DOM.dvdCloneVal.textContent = settings.dvdCloneCount || 1
    }
    if (DOM.dvdTrailCheckbox) {
      DOM.dvdTrailCheckbox.checked = settings.dvdTrail === true
    }
    if (DOM.dvdGlitchCheckbox) {
      DOM.dvdGlitchCheckbox.checked = settings.dvdGlitch === true
    }

    if (DOM.musicBarsColorPicker) {
      DOM.musicBarsColorPicker.value = settings.musicBarsColor || "#8be9fd"
    }
    if (DOM.musicBarsNotesToggle) {
      DOM.musicBarsNotesToggle.checked = settings.musicBarsNotes !== false
    }
    if (DOM.wavyLinesColorPicker) {
      DOM.wavyLinesColorPicker.value = settings.wavyLinesColor || "#00bcd4"
    }
    if (DOM.wavyLinesModeSelect) {
      DOM.wavyLinesModeSelect.value = settings.wavyLinesMode || "single"
    }
    if (DOM.wavyLinesSingleColorWrap) {
      DOM.wavyLinesSingleColorWrap.style.display =
        (settings.wavyLinesMode || "single") === "single" ? "block" : "none"
    }
    if (DOM.tetFireworksCustomText1Input) {
      DOM.tetFireworksCustomText1Input.value =
        settings.tetFireworksText1 ?? "Chúc Mừng"
    }
    if (DOM.tetFireworksCustomText2Input) {
      DOM.tetFireworksCustomText2Input.value =
        settings.tetFireworksText2 ?? "Năm Mới"
    }
    if (DOM.tetFireworksCustomText3Input) {
      DOM.tetFireworksCustomText3Input.value =
        settings.tetFireworksText3 ?? "Vạn Sự"
    }
    if (DOM.tetFireworksCustomText4Input) {
      DOM.tetFireworksCustomText4Input.value =
        settings.tetFireworksText4 ?? "Như Ý"
    }
    if (DOM.tetFireworksCustomText5Input) {
      DOM.tetFireworksCustomText5Input.value =
        settings.tetFireworksText5 ?? "An Khang"
    }
    if (DOM.tetFireworksCustomText6Input) {
      DOM.tetFireworksCustomText6Input.value =
        settings.tetFireworksText6 ?? "Thịnh Vượng"
    }
    if (DOM.tetFireworksSoundToggle) {
      DOM.tetFireworksSoundToggle.checked =
        settings.tetFireworksSound === true
    }
    if (DOM.tetFireworksTypeSelect) {
      DOM.tetFireworksTypeSelect.value = settings.tetFireworksType || "all"
    }
    if (DOM.reunificationDayModeSelect) {
      DOM.reunificationDayModeSelect.value =
        settings.reunificationDayMode || "30_04"
    }
    if (DOM.reunificationDayPalaceToggle) {
      DOM.reunificationDayPalaceToggle.checked =
        settings.reunificationDayPalace !== false
    }
    if (DOM.reunificationDayTanksToggle) {
      DOM.reunificationDayTanksToggle.checked =
        settings.reunificationDayTanks !== false
    }
    if (DOM.reunificationDayDovesToggle) {
      DOM.reunificationDayDovesToggle.checked =
        settings.reunificationDayDoves !== false
    }
    if (DOM.reunificationDayTextsToggle) {
      DOM.reunificationDayTextsToggle.checked =
        settings.reunificationDayTexts !== false
    }
    if (DOM.reunificationDayClickToggle) {
      DOM.reunificationDayClickToggle.checked =
        settings.reunificationDayClick !== false
    }
    if (DOM.reunificationDaySpeedSlider) {
      const spd =
        settings.reunificationDaySpeed !== undefined
          ? settings.reunificationDaySpeed
          : 1.0
      DOM.reunificationDaySpeedSlider.value = spd
      if (DOM.reunificationDaySpeedVal) {
        DOM.reunificationDaySpeedVal.textContent = `${Number(spd).toFixed(1)}x`
      }
    }
    if (DOM.reunificationDayTransparentCheckbox) {
      DOM.reunificationDayTransparentCheckbox.checked =
        settings.reunificationDayTransparent !== false
    }
    if (DOM.oceanWaveColorPicker) {
      DOM.oceanWaveColorPicker.value = settings.oceanWaveColor || "#ffffff"
    }
    const oceanWavePos = settings.oceanWavePosition || "bottom"
    DOM.oceanWavePosBottomBtn?.classList.toggle(
      "active",
      oceanWavePos === "bottom",
    )
    DOM.oceanWavePosTopBtn?.classList.toggle("active", oceanWavePos === "top")
    DOM.oceanWavePosLeftBtn?.classList.toggle("active", oceanWavePos === "left")
    DOM.oceanWavePosRightBtn?.classList.toggle(
      "active",
      oceanWavePos === "right",
    )
    if (DOM.cloudDriftColorPicker)
      DOM.cloudDriftColorPicker.value = settings.cloudDriftColor || "#f0f4f8"
    if (DOM.cloudDriftMoodSelect)
      DOM.cloudDriftMoodSelect.value = settings.cloudDriftMood || "daylight"

    // Visibility of Effect Settings
    if (DOM.starColorSetting)
      DOM.starColorSetting.style.display =
        settings.effect === "galaxy" || settings.effect === "rainHD"
          ? "block"
          : "none"
    if (DOM.rainModeSetting)
      DOM.rainModeSetting.style.display =
        settings.effect === "galaxy" || settings.effect === "rainHD"
          ? "block"
          : "none"
    if (DOM.rainModeSelect)
      DOM.rainModeSelect.value =
        settings.effect === "rainHD"
          ? "storm"
          : settings.rainMode || "chill"

    const isRainEffect = settings.effect === "galaxy" || settings.effect === "rainHD"
    if (DOM.rainSpeedSetting)
      DOM.rainSpeedSetting.style.display = isRainEffect ? "block" : "none"
    if (DOM.rainSpeedSlider)
      DOM.rainSpeedSlider.value = settings.rainSpeed !== undefined ? settings.rainSpeed : 1.0
    if (DOM.rainSpeedVal)
      DOM.rainSpeedVal.textContent = `${(settings.rainSpeed !== undefined ? settings.rainSpeed : 1.0).toFixed(1)}x`

    if (DOM.rainDensitySetting)
      DOM.rainDensitySetting.style.display = isRainEffect ? "block" : "none"
    if (DOM.rainDensitySlider)
      DOM.rainDensitySlider.value = settings.rainDensity !== undefined ? settings.rainDensity : 1.0
    if (DOM.rainDensityVal)
      DOM.rainDensityVal.textContent = `${(settings.rainDensity !== undefined ? settings.rainDensity : 1.0).toFixed(1)}x`

    if (DOM.rainMistSetting)
      DOM.rainMistSetting.style.display = isRainEffect ? "block" : "none"
    if (DOM.rainMistToggle)
      DOM.rainMistToggle.checked = settings.rainMist !== undefined ? Boolean(settings.rainMist) : true
    if (DOM.firefliesColorSetting)
      DOM.firefliesColorSetting.style.display =
        settings.effect === "fireflies" || settings.effect === "firefliesHD"
          ? "block"
          : "none"
    if (DOM.firefliesColorPicker)
      DOM.firefliesColorPicker.value = settings.firefliesColor || "#ffe855"
    if (DOM.firefliesModeSetting)
      DOM.firefliesModeSetting.style.display =
        settings.effect === "fireflies" || settings.effect === "firefliesHD"
          ? "block"
          : "none"
    if (DOM.firefliesModeSelect)
      DOM.firefliesModeSelect.value = settings.firefliesMode || "enchanted"
    if (DOM.meteorColorSetting)
      DOM.meteorColorSetting.style.display =
        settings.effect === "meteor" ? "block" : "none"
    if (DOM.networkColorSetting)
      DOM.networkColorSetting.style.display =
        settings.effect === "network" ? "block" : "none"
    if (DOM.matrixColorSetting)
      DOM.matrixColorSetting.style.display =
        settings.effect === "matrix" ? "block" : "none"
    if (DOM.matrixStyleSetting)
      DOM.matrixStyleSetting.style.display =
        settings.effect === "matrix" ? "block" : "none"
    if (DOM.auraColorSetting)
      DOM.auraColorSetting.style.display =
        settings.effect === "aura" ? "block" : "none"
    if (DOM.northernLightsColorSetting)
      DOM.northernLightsColorSetting.style.display =
        settings.effect === "northernLights" ? "block" : "none"
    if (DOM.hackerColorSetting)
      DOM.hackerColorSetting.style.display =
        settings.effect === "hacker" ? "block" : "none"
    if (DOM.dvdSettingsWrapper)
      DOM.dvdSettingsWrapper.style.display =
        settings.effect === "dvd" ? "block" : "none"
    if (DOM.dvdTitleSetting)
      DOM.dvdTitleSetting.style.display =
        settings.effect === "dvd" ? "block" : "none"
    if (DOM.dvdColorModeSetting)
      DOM.dvdColorModeSetting.style.display =
        settings.effect === "dvd" ? "block" : "none"
    if (DOM.dvdSpeedSetting)
      DOM.dvdSpeedSetting.style.display =
        settings.effect === "dvd" ? "block" : "none"
    if (DOM.dvdCloneSetting)
      DOM.dvdCloneSetting.style.display =
        settings.effect === "dvd" ? "block" : "none"
    if (DOM.dvdTrailSetting)
      DOM.dvdTrailSetting.style.display =
        settings.effect === "dvd" ? "flex" : "none"
    if (DOM.dvdGlitchSetting)
      DOM.dvdGlitchSetting.style.display =
        settings.effect === "dvd" ? "flex" : "none"
    if (DOM.pixelBlastSettings)
      DOM.pixelBlastSettings.style.display =
        settings.effect === "pixelBlast" ? "block" : "none"
    if (DOM.neonGridSettings)
      DOM.neonGridSettings.style.display =
        settings.effect === "neonGrid" ? "block" : "none"
    if (DOM.frostedOrbsSettings)
      DOM.frostedOrbsSettings.style.display =
        settings.effect === "frostedGlassOrbs" ? "block" : "none"
    if (DOM.blackHoleSettings)
      DOM.blackHoleSettings.style.display =
        settings.effect === "blackHole" ? "block" : "none"
    if (DOM.halloweenSettings)
      DOM.halloweenSettings.style.display =
        settings.effect === "halloween" ? "block" : "none"
    if (DOM.interactiveFluidSettings)
      DOM.interactiveFluidSettings.style.display =
        settings.effect === "interactiveFluid" ? "block" : "none"
    if (DOM.cinematicBokehSettings)
      DOM.cinematicBokehSettings.style.display =
        settings.effect === "cinematicBokeh" ? "block" : "none"
    if (DOM.pixelCubesColorSetting)
      DOM.pixelCubesColorSetting.style.display =
        settings.effect === "pixelCubes" ? "block" : "none"
    if (DOM.pixelCubesShapeSetting)
      DOM.pixelCubesShapeSetting.style.display =
        settings.effect === "pixelCubes" ? "block" : "none"
    if (DOM.windModeSetting) {
      DOM.windModeSetting.style.display =
        settings.effect === "wind" ? "block" : "none"
    }
    if (DOM.windModeSelect) {
      DOM.windModeSelect.value = settings.windMode || "2d"
    }

    if (DOM.pixelCubesShapeSelect) {
      DOM.pixelCubesShapeSelect.value = settings.pixelCubesShape || "cube"
    }
    if (DOM.synthwaveFullScreenCheckbox) {
      DOM.synthwaveFullScreenCheckbox.checked =
        settings.synthwaveFullScreen === true
    }
    if (DOM.frostedOrbsDarkBgCheckbox) {
      DOM.frostedOrbsDarkBgCheckbox.checked =
        settings.frostedOrbsDarkBg !== false
    }
    if (DOM.frostedOrbsColor1Picker) {
      DOM.frostedOrbsColor1Picker.value =
        settings.frostedOrbsColor1 || "#00f2fe"
    }
    if (DOM.frostedOrbsColor2Picker) {
      DOM.frostedOrbsColor2Picker.value =
        settings.frostedOrbsColor2 || "#4facfe"
    }
    if (DOM.blackHoleCelestialSelect) {
      DOM.blackHoleCelestialSelect.value =
        settings.blackHoleCelestialType || "blackHole"
    }
    if (DOM.blackHoleAccretionColorPicker) {
      DOM.blackHoleAccretionColorPicker.value =
        settings.blackHoleAccretionColor || "#ff5500"
    }
    if (DOM.blackHoleCoreColorPicker) {
      DOM.blackHoleCoreColorPicker.value =
        settings.blackHoleCoreColor || "#ffcc00"
    }
    if (DOM.blackHoleWhiteColorPicker) {
      DOM.blackHoleWhiteColorPicker.value =
        settings.blackHoleWhiteColor || "#ffffff"
    }
    if (DOM.blackHoleGlowColorPicker) {
      DOM.blackHoleGlowColorPicker.value =
        settings.blackHoleGlowColor || "#ffa200"
    }
    if (DOM.blackHoleStarColorPicker) {
      DOM.blackHoleStarColorPicker.value =
        settings.blackHoleStarColor || "#ffffff"
    }
    if (DOM.blackHoleIntensityInput) {
      DOM.blackHoleIntensityInput.value = String(
        settings.blackHoleIntensity ?? 1.0,
      )
    }
    if (DOM.blackHoleIntensityValue) {
      const intens = Number(settings.blackHoleIntensity ?? 1.0)
      DOM.blackHoleIntensityValue.textContent = intens.toFixed(2)
    }
    if (DOM.blackHoleAngleInput) {
      DOM.blackHoleAngleInput.value = String(settings.blackHoleAngle ?? 0)
    }
    if (DOM.blackHoleAngleValue) {
      DOM.blackHoleAngleValue.textContent = String(settings.blackHoleAngle ?? 0)
    }
    if (DOM.halloweenModeSelect) {
      DOM.halloweenModeSelect.value = settings.halloweenMode || "all"
    }
    if (DOM.halloweenGlowColorPicker) {
      DOM.halloweenGlowColorPicker.value =
        settings.halloweenGlowColor || "#ff6a00"
    }
    if (DOM.halloweenDensityInput) {
      DOM.halloweenDensityInput.value = String(settings.halloweenDensity ?? 35)
    }
    if (DOM.halloweenDensityValue) {
      DOM.halloweenDensityValue.textContent = String(
        settings.halloweenDensity ?? 35,
      )
    }
    if (DOM.halloweenSpeedInput) {
      DOM.halloweenSpeedInput.value = String(settings.halloweenSpeed ?? 1.0)
    }
    if (DOM.halloweenSpeedValue) {
      DOM.halloweenSpeedValue.textContent = String(
        settings.halloweenSpeed ?? 1.0,
      )
    }
    if (DOM.halloweenMistCheckbox) {
      DOM.halloweenMistCheckbox.checked = settings.halloweenMist !== false
    }
    if (DOM.halloweenLightningCheckbox) {
      DOM.halloweenLightningCheckbox.checked =
        settings.halloweenLightning !== false
    }
    if (DOM.interactiveFluidColor1Picker) {
      DOM.interactiveFluidColor1Picker.value =
        settings.interactiveFluidColor1 || "#00f2fe"
    }
    if (DOM.interactiveFluidColor2Picker) {
      DOM.interactiveFluidColor2Picker.value =
        settings.interactiveFluidColor2 || "#ff007f"
    }
    if (DOM.cinematicBokehColor1Picker) {
      DOM.cinematicBokehColor1Picker.value =
        settings.cinematicBokehColor1 || "#ff9a9e"
    }
    if (DOM.cinematicBokehColor2Picker) {
      DOM.cinematicBokehColor2Picker.value =
        settings.cinematicBokehColor2 || "#fecfef"
    }
    if (DOM.cinematicBokehDarkBgCheckbox) {
      DOM.cinematicBokehDarkBgCheckbox.checked =
        settings.cinematicBokehDarkBg ?? false
    }
    if (DOM.pixelWeatherStyleSection) {
      DOM.pixelWeatherStyleSection.style.display =
        settings.effect === "pixelWeather" ? "block" : "none"
      if (DOM.pixelWeatherMistToggle) {
        DOM.pixelWeatherMistToggle.checked =
          settings.pixelWeatherMist !== undefined
            ? Boolean(settings.pixelWeatherMist)
            : true
      }
    }
    if (DOM.pixelSnowHQSettings) {
      DOM.pixelSnowHQSettings.style.display =
        settings.effect === "pixelSnowHQ" ? "block" : "none"

      if (DOM.pixelSnowHQColorPicker)
        DOM.pixelSnowHQColorPicker.value =
          settings.pixelSnowHQColor || "#ffffff"

      if (DOM.pixelSnowHQFlakeSizeSlider) {
        DOM.pixelSnowHQFlakeSizeSlider.value =
          settings.pixelSnowHQFlakeSize || 0.01
        if (DOM.pixelSnowHQFlakeSizeVal)
          DOM.pixelSnowHQFlakeSizeVal.textContent = (
            settings.pixelSnowHQFlakeSize || 0.01
          ).toFixed(3)
      }
      if (DOM.pixelSnowHQDensitySlider) {
        DOM.pixelSnowHQDensitySlider.value = settings.pixelSnowHQDensity || 0.3
        if (DOM.pixelSnowHQDensityVal)
          DOM.pixelSnowHQDensityVal.textContent = (
            settings.pixelSnowHQDensity || 0.3
          ).toFixed(2)
      }
      if (DOM.pixelSnowHQSpeedSlider) {
        DOM.pixelSnowHQSpeedSlider.value = settings.pixelSnowHQSpeed || 1.25
        if (DOM.pixelSnowHQSpeedVal)
          DOM.pixelSnowHQSpeedVal.textContent = (
            settings.pixelSnowHQSpeed || 1.25
          ).toFixed(2)
      }
      if (DOM.pixelSnowHQPixelResSlider) {
        DOM.pixelSnowHQPixelResSlider.value =
          settings.pixelSnowHQPixelResolution || 200
        if (DOM.pixelSnowHQPixelResVal)
          DOM.pixelSnowHQPixelResVal.textContent =
            settings.pixelSnowHQPixelResolution || 200
      }
      if (DOM.pixelSnowHQMinFlakeSizeSlider) {
        DOM.pixelSnowHQMinFlakeSizeSlider.value =
          settings.pixelSnowHQMinFlakeSize || 1.25
        if (DOM.pixelSnowHQMinFlakeSizeVal)
          DOM.pixelSnowHQMinFlakeSizeVal.textContent = (
            settings.pixelSnowHQMinFlakeSize || 1.25
          ).toFixed(2)
      }
      if (DOM.pixelSnowHQVariantSelect) {
        DOM.pixelSnowHQVariantSelect.value =
          settings.pixelSnowHQVariant || "square"
      }
      if (DOM.pixelSnowHQDepthFadeSlider) {
        DOM.pixelSnowHQDepthFadeSlider.value =
          settings.pixelSnowHQDepthFade || 8
        if (DOM.pixelSnowHQDepthFadeVal)
          DOM.pixelSnowHQDepthFadeVal.textContent =
            settings.pixelSnowHQDepthFade || 8
      }
      if (DOM.pixelSnowHQDirectionSlider) {
        DOM.pixelSnowHQDirectionSlider.value =
          settings.pixelSnowHQDirection || 125
        if (DOM.pixelSnowHQDirectionVal)
          DOM.pixelSnowHQDirectionVal.textContent = `${settings.pixelSnowHQDirection || 125}°`
      }
      if (DOM.pixelSnowHQBrightnessSlider) {
        DOM.pixelSnowHQBrightnessSlider.value =
          settings.pixelSnowHQBrightness || 1.0
        if (DOM.pixelSnowHQBrightnessVal)
          DOM.pixelSnowHQBrightnessVal.textContent = (
            settings.pixelSnowHQBrightness || 1.0
          ).toFixed(1)
      }
      if (DOM.pixelSnowHQGammaSlider) {
        DOM.pixelSnowHQGammaSlider.value = settings.pixelSnowHQGamma || 0.4545
        if (DOM.pixelSnowHQGammaVal)
          DOM.pixelSnowHQGammaVal.textContent = (
            settings.pixelSnowHQGamma || 0.4545
          ).toFixed(2)
      }
      if (DOM.pixelSnowHQFarPlaneSlider) {
        DOM.pixelSnowHQFarPlaneSlider.value = settings.pixelSnowHQFarPlane || 20
        if (DOM.pixelSnowHQFarPlaneVal)
          DOM.pixelSnowHQFarPlaneVal.textContent =
            settings.pixelSnowHQFarPlane || 20
      }
    }

    if (DOM.softAuroraSettings) {
      DOM.softAuroraSettings.style.display =
        settings.effect === "softAurora" ? "block" : "none"
      if (DOM.softAuroraColor1Picker)
        DOM.softAuroraColor1Picker.value =
          settings.softAuroraColor1 || "#74ebd5"
      if (DOM.softAuroraColor2Picker)
        DOM.softAuroraColor2Picker.value =
          settings.softAuroraColor2 || "#e100ff"
      if (DOM.softAuroraSpeedSlider) {
        DOM.softAuroraSpeedSlider.value = settings.softAuroraSpeed || 0.6
        if (DOM.softAuroraSpeedVal)
          DOM.softAuroraSpeedVal.textContent = (
            settings.softAuroraSpeed || 0.6
          ).toFixed(1)
      }
      if (DOM.softAuroraScaleSlider) {
        DOM.softAuroraScaleSlider.value = settings.softAuroraScale || 1.5
        if (DOM.softAuroraScaleVal)
          DOM.softAuroraScaleVal.textContent = (
            settings.softAuroraScale || 1.5
          ).toFixed(1)
      }
      if (DOM.softAuroraBrightnessSlider) {
        DOM.softAuroraBrightnessSlider.value =
          settings.softAuroraBrightness || 1.0
        if (DOM.softAuroraBrightnessVal)
          DOM.softAuroraBrightnessVal.textContent = (
            settings.softAuroraBrightness || 1.0
          ).toFixed(1)
      }
      if (DOM.softAuroraNoiseFreqSlider) {
        DOM.softAuroraNoiseFreqSlider.value =
          settings.softAuroraNoiseFreq || 2.5
        if (DOM.softAuroraNoiseFreqVal)
          DOM.softAuroraNoiseFreqVal.textContent = (
            settings.softAuroraNoiseFreq || 2.5
          ).toFixed(1)
      }
      if (DOM.softAuroraBandHeightSlider) {
        DOM.softAuroraBandHeightSlider.value =
          settings.softAuroraBandHeight || 0.5
        if (DOM.softAuroraBandHeightVal)
          DOM.softAuroraBandHeightVal.textContent = (
            settings.softAuroraBandHeight || 0.5
          ).toFixed(2)
      }
      if (DOM.softAuroraBandSpreadSlider) {
        DOM.softAuroraBandSpreadSlider.value =
          settings.softAuroraBandSpread || 2.5
        if (DOM.softAuroraBandSpreadVal)
          DOM.softAuroraBandSpreadVal.textContent = (
            settings.softAuroraBandSpread || 2.5
          ).toFixed(1)
      }
      if (DOM.softAuroraMouseCheckbox) {
        DOM.softAuroraMouseCheckbox.checked =
          settings.softAuroraEnableMouse !== false
      }
    }

    if (DOM.skyLanternsSetting) {
      DOM.skyLanternsSetting.style.display =
        settings.effect === "skyLanterns" ? "block" : "none"
    }
    if (DOM.skyLanternsTypeSelect) {
      DOM.skyLanternsTypeSelect.value = settings.skyLanternsType || "lantern"
    }
    if (DOM.pixelRunColorSetting) {
      DOM.pixelWeatherStyleSelect.value = settings.pixelWeatherStyle || "snow"
    }

    if (DOM.pixelWeatherResolutionSlider) {
      DOM.pixelWeatherResolutionSlider.value =
        settings.pixelWeatherResolution || 1
      if (DOM.pixelWeatherResolutionVal)
        DOM.pixelWeatherResolutionVal.textContent =
          settings.pixelWeatherResolution || 1
    }
    if (DOM.pixelWeatherSpeedSlider) {
      DOM.pixelWeatherSpeedSlider.value = settings.pixelWeatherSpeed || 1.0
      if (DOM.pixelWeatherSpeedVal)
        DOM.pixelWeatherSpeedVal.textContent = (
          settings.pixelWeatherSpeed || 1.0
        ).toFixed(1)
    }
    if (DOM.pixelWeatherSizeSlider) {
      DOM.pixelWeatherSizeSlider.value = settings.pixelWeatherSize || 1.0
      if (DOM.pixelWeatherSizeVal)
        DOM.pixelWeatherSizeVal.textContent = (
          settings.pixelWeatherSize || 1.0
        ).toFixed(1)
    }
    if (DOM.pixelWeatherDensitySlider) {
      DOM.pixelWeatherDensitySlider.value = settings.pixelWeatherDensity || 1.0
      if (DOM.pixelWeatherDensityVal)
        DOM.pixelWeatherDensityVal.textContent = (
          settings.pixelWeatherDensity || 1.0
        ).toFixed(1)
    }

    if (DOM.jellyfishColorSetting) {
      DOM.jellyfishColorSetting.style.display =
        settings.effect === "jellyfish" ? "block" : "none"
    }
    if (DOM.jellyfishTypeSelect) {
      DOM.jellyfishTypeSelect.value = settings.jellyfishType || "jellyfish"
    }
    if (DOM.sakuraColorSetting) {
      DOM.sakuraColorSetting.style.display =
        settings.effect === "sakura" ? "block" : "none"
    }

    // Aurora Wave
    if (DOM.auroraWaveTitleSetting) {
      DOM.auroraWaveTitleSetting.style.display =
        settings.effect === "auroraWave" ? "block" : "none"
    }
    if (DOM.auroraWaveColorSetting) {
      DOM.auroraWaveColorSetting.style.display =
        settings.effect === "auroraWave" ? "block" : "none"
    }
    if (DOM.auroraWaveBrightnessSetting) {
      DOM.auroraWaveBrightnessSetting.style.display =
        settings.effect === "auroraWave" ? "block" : "none"
    }
    if (DOM.auroraWaveSpeedSetting) {
      DOM.auroraWaveSpeedSetting.style.display =
        settings.effect === "auroraWave" ? "block" : "none"
    }
    if (DOM.auroraWaveAmplitudeSetting) {
      DOM.auroraWaveAmplitudeSetting.style.display =
        settings.effect === "auroraWave" ? "block" : "none"
    }
    if (DOM.auroraWaveBgSetting) {
      DOM.auroraWaveBgSetting.style.display =
        settings.effect === "auroraWave" ? "block" : "none"
    }
    if (DOM.auroraWaveNotesSetting) {
      DOM.auroraWaveNotesSetting.style.display = "none"
    }
    if (DOM.auroraWaveNotesToggle) {
      DOM.auroraWaveNotesToggle.checked = false
    }

    if (DOM.auroraWaveColorPicker) {
      DOM.auroraWaveColorPicker.value = settings.auroraWaveColor || "#00bcd4"
    }
    if (DOM.auroraWaveTransparentCheckbox) {
      const isTransparent = settings.auroraWaveTransparent !== false
      DOM.auroraWaveTransparentCheckbox.checked = isTransparent
      if (DOM.auroraWaveBgColorContainer) {
        DOM.auroraWaveBgColorContainer.style.display = isTransparent
          ? "none"
          : "block"
      }
    }
    if (DOM.auroraWaveBgColorPicker) {
      DOM.auroraWaveBgColorPicker.value =
        settings.auroraWaveBgColor || "#000000"
    }
    if (DOM.auroraWaveBgOpacitySlider) {
      const op = settings.auroraWaveBgOpacity ?? 0.15
      DOM.auroraWaveBgOpacitySlider.value = op
      if (DOM.auroraWaveBgOpacityVal)
        DOM.auroraWaveBgOpacityVal.textContent = op
    }
    if (DOM.auroraWaveBrightnessSlider) {
      const b = settings.auroraWaveBrightness || 0.65
      DOM.auroraWaveBrightnessSlider.value = b
      if (DOM.auroraWaveBrightnessVal)
        DOM.auroraWaveBrightnessVal.textContent = b.toFixed(2)
    }
    if (DOM.auroraWaveSpeedSlider) {
      const s = settings.auroraWaveSpeed || 1.0
      DOM.auroraWaveSpeedSlider.value = s
      if (DOM.auroraWaveSpeedVal)
        DOM.auroraWaveSpeedVal.textContent = s.toFixed(1)
    }
    if (DOM.auroraWaveAmplitudeSlider) {
      const a = settings.auroraWaveAmplitude || 70
      DOM.auroraWaveAmplitudeSlider.value = a
      if (DOM.auroraWaveAmplitudeVal) DOM.auroraWaveAmplitudeVal.textContent = a
    }

    if (DOM.snowfallColorSetting) {
      DOM.snowfallColorSetting.style.display =
        settings.effect === "snowfall" ? "block" : "none"
    }
    const isLeafEffect = [
      "autumnLeaves",
      "greenLeaves",
      "sakura",
      "fallingLeavesSettled",
    ].includes(settings.effect)
    if (DOM.fallingLeavesSettledSkinSetting) {
      DOM.fallingLeavesSettledSkinSetting.style.display = isLeafEffect
        ? "block"
        : "none"
    }
    if (DOM.fallingLeavesSettlingSetting) {
      DOM.fallingLeavesSettlingSetting.style.display = isLeafEffect
        ? "flex"
        : "none"
    }
    if (DOM.fallingLeavesSettlingToggle) {
      DOM.fallingLeavesSettlingToggle.checked = !!settings.fallingLeavesSettling
    }
    if (DOM.fallingLeavesSettledSkinSelect) {
      DOM.fallingLeavesSettledSkinSelect.value =
        settings.fallingLeavesSkin || "maple"
    }

    // Pixel Blast
    if (DOM.pixelBlastColorSetting) {
      DOM.pixelBlastColorSetting.style.display =
        settings.effect === "pixelBlast" ? "block" : "none"
    }
    if (DOM.pixelBlastVariantSetting) {
      DOM.pixelBlastVariantSetting.style.display =
        settings.effect === "pixelBlast" ? "block" : "none"
    }
    if (DOM.pixelBlastSizeSetting) {
      DOM.pixelBlastSizeSetting.style.display =
        settings.effect === "pixelBlast" ? "block" : "none"
    }
    if (DOM.pixelBlastBgSetting) {
      DOM.pixelBlastBgSetting.style.display =
        settings.effect === "pixelBlast" ? "block" : "none"
    }
    if (DOM.pixelBlastLiquidSetting) {
      DOM.pixelBlastLiquidSetting.style.display =
        settings.effect === "pixelBlast" ? "block" : "none"
    }
    if (DOM.pixelBlastInteractiveSetting) {
      DOM.pixelBlastInteractiveSetting.style.display =
        settings.effect === "pixelBlast" ? "block" : "none"
    }

    if (DOM.pixelBlastColorPicker) {
      DOM.pixelBlastColorPicker.value = settings.pixelBlastColor || "#B497CF"
    }
    if (DOM.pixelBlastVariantSelect) {
      DOM.pixelBlastVariantSelect.value = settings.pixelBlastVariant || "square"
    }
    if (DOM.pixelBlastSizeSlider) {
      DOM.pixelBlastSizeSlider.value = settings.pixelBlastSize || 15
      if (DOM.pixelBlastSizeVal) {
        DOM.pixelBlastSizeVal.textContent = settings.pixelBlastSize || 15
      }
    }
    if (DOM.pixelBlastLiquidCheckbox) {
      DOM.pixelBlastLiquidCheckbox.checked = settings.pixelBlastLiquid !== false
    }
    if (DOM.pixelBlastLiquidStrengthSlider) {
      const strength = settings.pixelBlastLiquidStrength ?? 1.0
      DOM.pixelBlastLiquidStrengthSlider.value = strength
      if (DOM.pixelBlastLiquidStrengthVal) {
        DOM.pixelBlastLiquidStrengthVal.textContent = strength.toFixed(1)
      }
    }
    if (DOM.pixelBlastCursorRadiusSlider) {
      DOM.pixelBlastCursorRadiusSlider.value =
        settings.pixelBlastCursorRadius || 150
      if (DOM.pixelBlastCursorRadiusVal) {
        DOM.pixelBlastCursorRadiusVal.textContent =
          settings.pixelBlastCursorRadius || 150
      }
    }
    if (DOM.pixelBlastRippleCheckbox) {
      DOM.pixelBlastRippleCheckbox.checked =
        settings.pixelBlastRipples !== false
    }
    if (DOM.pixelBlastTransparentCheckbox) {
      DOM.pixelBlastTransparentCheckbox.checked =
        settings.pixelBlastTransparent !== false
    }
    if (DOM.pixelBlastBgColorContainer) {
      DOM.pixelBlastBgColorContainer.style.display =
        settings.pixelBlastTransparent !== false ? "none" : "block"
    }
    if (DOM.pixelBlastBgColorPicker) {
      DOM.pixelBlastBgColorPicker.value =
        settings.pixelBlastBgColor || "#0a0a0a"
    }

    // Sunbeam
    if (DOM.sunbeamColorSetting)
      DOM.sunbeamColorSetting.style.display =
        settings.effect === "sunbeam" ? "flex" : "none"
    if (DOM.sunbeamModeSetting)
      DOM.sunbeamModeSetting.style.display =
        settings.effect === "sunbeam" ? "block" : "none"
    if (DOM.sunbeamAngleSetting)
      DOM.sunbeamAngleSetting.style.display =
        settings.effect === "sunbeam" ? "block" : "none"
    if (DOM.sunbeamColorPicker) {
      DOM.sunbeamColorPicker.value = settings.sunbeamColor || "#ffffff"
    }
    if (DOM.sunbeamModeSelect) {
      DOM.sunbeamModeSelect.value = settings.sunbeamMode || "default"
    }
    if (DOM.sunbeamAngleInput) {
      DOM.sunbeamAngleInput.value = String(settings.sunbeamAngle ?? 0)
      if (DOM.sunbeamAngleValue)
        DOM.sunbeamAngleValue.textContent = DOM.sunbeamAngleInput.value
    }
    if (DOM.bubblesColorSetting)
      DOM.bubblesColorSetting.style.display =
        settings.effect === "bubbles" ? "block" : "none"
    if (DOM.gridScanColorSetting)
      DOM.gridScanColorSetting.style.display =
        settings.effect === "gridScan" ? "block" : "none"
    if (DOM.cursorTrailColorSetting)
      DOM.cursorTrailColorSetting.style.display =
        settings.effect === "cursorTrail" ? "block" : "none"
    if (DOM.cursorTrailStyleSetting)
      DOM.cursorTrailStyleSetting.style.display =
        settings.effect === "cursorTrail" ? "block" : "none"
    if (DOM.cursorTrailClickSetting)
      DOM.cursorTrailClickSetting.style.display =
        settings.effect === "cursorTrail" ? "flex" : "none"
    if (DOM.cursorTrailRandomSetting)
      DOM.cursorTrailRandomSetting.style.display =
        settings.effect === "cursorTrail" ? "flex" : "none"
    if (DOM.flashlightColorSetting)
      DOM.flashlightColorSetting.style.display =
        settings.effect === "flashlight" ? "block" : "none"
    if (DOM.flashlightSizeSetting)
      DOM.flashlightSizeSetting.style.display =
        settings.effect === "flashlight" ? "block" : "none"
    if (DOM.flashlightOpacitySetting)
      DOM.flashlightOpacitySetting.style.display =
        settings.effect === "flashlight" ? "block" : "none"
    if (DOM.plantGrowthColorSetting)
      DOM.plantGrowthColorSetting.style.display =
        settings.effect === "plantGrowth" ? "block" : "none"
    if (DOM.oceanFishColorSetting)
      DOM.oceanFishColorSetting.style.display =
        settings.effect === "oceanFish" ? "block" : "none"
    if (DOM.floatingLinesColorSetting)
      DOM.floatingLinesColorSetting.style.display =
        settings.effect === "floatingLines" ? "block" : "none"
    if (DOM.floatingLinesAngleSetting)
      DOM.floatingLinesAngleSetting.style.display =
        settings.effect === "floatingLines" ? "block" : "none"
    if (DOM.floatingLinesSpeedSetting)
      DOM.floatingLinesSpeedSetting.style.display =
        settings.effect === "floatingLines" ? "block" : "none"
    if (DOM.floatingLinesCountSetting)
      DOM.floatingLinesCountSetting.style.display =
        settings.effect === "floatingLines" ? "block" : "none"
    if (DOM.floatingLinesTransparentSetting)
      DOM.floatingLinesTransparentSetting.style.display =
        settings.effect === "floatingLines" ? "block" : "none"
    if (DOM.hyperspaceStyleSetting)
      DOM.hyperspaceStyleSetting.style.display =
        settings.effect === "hyperspace" ? "block" : "none"
    if (DOM.hyperspaceColorSetting)
      DOM.hyperspaceColorSetting.style.display =
        settings.effect === "hyperspace" ? "block" : "none"
    if (DOM.hyperspaceSpeedSetting)
      DOM.hyperspaceSpeedSetting.style.display =
        settings.effect === "hyperspace" ? "block" : "none"
    if (DOM.hyperspaceStarCountSetting)
      DOM.hyperspaceStarCountSetting.style.display =
        settings.effect === "hyperspace" ? "block" : "none"
    if (DOM.hyperspaceTransparentSetting)
      DOM.hyperspaceTransparentSetting.style.display =
        settings.effect === "hyperspace" ? "block" : "none"
    if (DOM.rainHDColorSetting)
      DOM.rainHDColorSetting.style.display = "none"
    if (DOM.musicBarsColorSetting)
      DOM.musicBarsColorSetting.style.display =
        settings.effect === "musicBars" ? "block" : "none"
    if (DOM.musicBarsNotesSetting)
      DOM.musicBarsNotesSetting.style.display =
        settings.effect === "musicBars" ? "block" : "none"
    if (DOM.wavyLinesColorSetting)
      DOM.wavyLinesColorSetting.style.display =
        settings.effect === "wavyLines" ? "block" : "none"
    if (DOM.tetFireworksSetting)
      DOM.tetFireworksSetting.style.display =
        settings.effect === "tetFireworks" ? "block" : "none"
    if (DOM.reunificationDaySetting)
      DOM.reunificationDaySetting.style.display =
        settings.effect === "reunificationDay" ? "block" : "none"
    if (DOM.oceanWaveMoodSetting)
      DOM.oceanWaveMoodSetting.style.display =
        settings.effect === "oceanWave" ? "block" : "none"
    if (DOM.oceanWaveColorSetting)
      DOM.oceanWaveColorSetting.style.display =
        settings.effect === "oceanWave" && settings.oceanWaveMood === "custom"
          ? "flex"
          : "none"
    if (DOM.oceanWavePositionSetting)
      DOM.oceanWavePositionSetting.style.display =
        settings.effect === "oceanWave" ? "block" : "none"
    if (DOM.oceanWaveStyleSetting)
      DOM.oceanWaveStyleSetting.style.display =
        settings.effect === "oceanWave" ? "block" : "none"
    if (DOM.oceanWaveLayerSetting)
      DOM.oceanWaveLayerSetting.style.display =
        settings.effect === "oceanWave" ? "block" : "none"
    if (DOM.oceanWaveSpeedSetting)
      DOM.oceanWaveSpeedSetting.style.display =
        settings.effect === "oceanWave" ? "block" : "none"
    if (DOM.oceanWaveAmplitudeSetting)
      DOM.oceanWaveAmplitudeSetting.style.display =
        settings.effect === "oceanWave" ? "block" : "none"
    if (DOM.oceanWaveOpacitySetting)
      DOM.oceanWaveOpacitySetting.style.display =
        settings.effect === "oceanWave" ? "block" : "none"

    if (DOM.oceanWaveMoodSelect)
      DOM.oceanWaveMoodSelect.value = settings.oceanWaveMood || "white"
    if (DOM.oceanWaveColorPicker)
      DOM.oceanWaveColorPicker.value = settings.oceanWaveColor || "#ffffff"
    if (DOM.oceanWaveStyleSelect)
      DOM.oceanWaveStyleSelect.value = settings.oceanWaveStyle || "smooth"
    if (DOM.oceanWaveLayerSlider) {
      const layers = settings.oceanWaveLayerCount !== undefined ? settings.oceanWaveLayerCount : 3
      DOM.oceanWaveLayerSlider.value = layers
      if (DOM.oceanWaveLayerVal) DOM.oceanWaveLayerVal.textContent = layers
    }
    if (DOM.oceanWaveSpeedSlider) {
      const spd = settings.oceanWaveSpeed !== undefined ? settings.oceanWaveSpeed : 1.0
      DOM.oceanWaveSpeedSlider.value = spd
      if (DOM.oceanWaveSpeedVal) DOM.oceanWaveSpeedVal.textContent = `${spd.toFixed(1)}x`
    }
    if (DOM.oceanWaveAmplitudeSlider) {
      const amp = settings.oceanWaveAmplitude !== undefined ? settings.oceanWaveAmplitude : 35
      DOM.oceanWaveAmplitudeSlider.value = amp
      if (DOM.oceanWaveAmplitudeVal) DOM.oceanWaveAmplitudeVal.textContent = amp
    }
    if (DOM.oceanWaveOpacitySlider) {
      const op = settings.oceanWaveOpacity !== undefined ? settings.oceanWaveOpacity : 0.65
      DOM.oceanWaveOpacitySlider.value = op
      if (DOM.oceanWaveOpacityVal) DOM.oceanWaveOpacityVal.textContent = op.toFixed(2)
    }

    if (DOM.cloudDriftColorSetting)
      DOM.cloudDriftColorSetting.style.display =
        settings.effect === "cloudDrift" ? "block" : "none"
    if (DOM.cloudDriftMoodSetting)
      DOM.cloudDriftMoodSetting.style.display =
        settings.effect === "cloudDrift" ? "block" : "none"
    if (DOM.cloudDriftOpacitySetting)
      DOM.cloudDriftOpacitySetting.style.display =
        settings.effect === "cloudDrift" ? "block" : "none"
    if (DOM.cloudDriftSpeedSetting)
      DOM.cloudDriftSpeedSetting.style.display =
        settings.effect === "cloudDrift" ? "block" : "none"
    if (DOM.cloudDriftOpacitySlider) {
      const op = settings.cloudDriftOpacity !== undefined ? settings.cloudDriftOpacity : 0.65
      DOM.cloudDriftOpacitySlider.value = op
      if (DOM.cloudDriftOpacityVal)
        DOM.cloudDriftOpacityVal.textContent = `${Math.round(op * 100)}%`
    }
    if (DOM.cloudDriftSpeedSlider) {
      const spd = settings.cloudDriftSpeed !== undefined ? settings.cloudDriftSpeed : 1.0
      DOM.cloudDriftSpeedSlider.value = spd
      if (DOM.cloudDriftSpeedVal)
        DOM.cloudDriftSpeedVal.textContent = `${spd.toFixed(1)}x`
    }
    if (DOM.shinyColorSetting)
      DOM.shinyColorSetting.style.display =
        settings.effect === "shiny" ? "block" : "none"
    if (DOM.shinyColorPicker)
      DOM.shinyColorPicker.value = settings.shinyColor || "#ff0000"
    if (DOM.lineShinyColorSetting)
      DOM.lineShinyColorSetting.style.display =
        settings.effect === "lineShiny" ? "block" : "none"
    if (DOM.lineShinyModeSetting)
      DOM.lineShinyModeSetting.style.display =
        settings.effect === "lineShiny" ? "block" : "none"

    if (DOM.lightPillarsColorSetting) {
      DOM.lightPillarsColorSetting.style.display =
        settings.effect === "lightPillars" ? "block" : "none"
      if (DOM.lightPillarsModeSelect) {
        DOM.lightPillarsModeSelect.value = settings.lightPillarsMode || "arctic"
      }
      if (DOM.lightPillarsCustomColorWrap) {
        DOM.lightPillarsCustomColorWrap.style.display =
          settings.lightPillarsMode === "custom" ? "block" : "none"
      }
      if (DOM.lightPillarsColorPicker) {
        DOM.lightPillarsColorPicker.value = settings.lightPillarsColor || "#88ccff"
      }
      const pCount =
        settings.lightPillarsCount !== undefined
          ? settings.lightPillarsCount
          : 8
      if (DOM.lightPillarsCountSlider) {
        DOM.lightPillarsCountSlider.value = pCount
      }
      if (DOM.lightPillarsCountVal) {
        DOM.lightPillarsCountVal.textContent = pCount
      }
    }

    if (DOM.rainbowDirectionSetting)
      DOM.rainbowDirectionSetting.style.display =
        settings.effect === "rainbow" ? "block" : "none"
    if (settings.rainbowDirection === "right") {
      DOM.rainbowDirRightBtn?.classList.add("active")
      DOM.rainbowDirLeftBtn?.classList.remove("active")
    } else {
      DOM.rainbowDirLeftBtn?.classList.add("active")
      DOM.rainbowDirRightBtn?.classList.remove("active")
    }

    // Visibility of Active Effect Settings Container & Badges
    markEffectsWithCustomBadges()
    if (DOM.activeEffectSettingsContainer) {
      const hasSettings = EFFECTS_WITH_CUSTOM_SETTINGS.has(settings.effect)
      DOM.activeEffectSettingsContainer.style.display = hasSettings
        ? "block"
        : "none"
    }
    if (DOM.lineShinyColorPicker)
      DOM.lineShinyColorPicker.value = settings.lineShinyColor || "#ffffff"
    if (DOM.lineShinyModeSelect)
      DOM.lineShinyModeSelect.value = settings.lineShinyMode || "default"
    if (DOM.pixelRunColorSetting)
      DOM.pixelRunColorSetting.style.display =
        settings.effect === "pixelRun" ? "block" : "none"
    if (DOM.pixelRunColorPicker)
      DOM.pixelRunColorPicker.value = settings.pixelRunColor || "#00e5ff"

    if (DOM.nintendoPixelColorSetting)
      DOM.nintendoPixelColorSetting.style.display =
        settings.effect === "nintendoPixel" ? "block" : "none"
    if (DOM.nintendoPixelModeSelect)
      DOM.nintendoPixelModeSelect.value =
        settings.nintendoPixelMode || "mainframe"
    if (DOM.nintendoPixelColorPicker)
      DOM.nintendoPixelColorPicker.value =
        settings.nintendoPixelColor || "#63f5ff"
    if (DOM.crtScanColorSetting)
      DOM.crtScanColorSetting.style.display =
        settings.effect === "crtScanlines" ? "block" : "none"
    if (DOM.crtScanFrequencySetting)
      DOM.crtScanFrequencySetting.style.display =
        settings.effect === "crtScanlines" ? "block" : "none"
    if (DOM.crtScanAngleSetting)
      DOM.crtScanAngleSetting.style.display =
        settings.effect === "crtScanlines" ? "block" : "none"
    if (DOM.crtScanDensitySetting)
      DOM.crtScanDensitySetting.style.display =
        settings.effect === "crtScanlines" ? "block" : "none"
    if (DOM.crtGammaSetting)
      DOM.crtGammaSetting.style.display =
        settings.effect === "crtScanlines" ? "block" : "none"
    if (DOM.crtBackgroundColorSetting)
      DOM.crtBackgroundColorSetting.style.display =
        settings.effect === "crtScanlines" ? "block" : "none"
    DOM.crtScanColorPicker.value = settings.crtScanColor || "#7cffad"
    DOM.crtScanFrequencyInput.value = String(settings.crtScanFrequency ?? 0.11)
    if (DOM.crtScanFrequencyValue)
      DOM.crtScanFrequencyValue.textContent = Number(
        DOM.crtScanFrequencyInput.value,
      ).toFixed(2)

    DOM.crtScanAngleInput.value = String(settings.crtScanAngle ?? 0)
    if (DOM.crtScanAngleValue)
      DOM.crtScanAngleValue.textContent = DOM.crtScanAngleInput.value

    DOM.crtScanDensityInput.value = String(settings.crtScanDensity ?? 4)
    if (DOM.crtScanDensityValue)
      DOM.crtScanDensityValue.textContent = DOM.crtScanDensityInput.value

    DOM.crtGammaInput.value = String(settings.crtGamma ?? 0.3)
    if (DOM.crtGammaValue)
      DOM.crtGammaValue.textContent = Number(DOM.crtGammaInput.value).toFixed(2)

    DOM.crtBackgroundColorPicker.value =
      settings.crtBackgroundColor || "#0a140f"

    if (DOM.retroGameTypeSetting)
      DOM.retroGameTypeSetting.style.display =
        settings.effect === "retroGame" ? "block" : "none"
    if (DOM.retroGameTypeSelect) {
      DOM.retroGameTypeSelect.value = settings.retroGameType || "space_invaders"
    }

    if (DOM.retroGameColorSetting)
      DOM.retroGameColorSetting.style.display =
        settings.effect === "retroGame" ? "block" : "none"
    if (DOM.retroGameColorPicker)
      DOM.retroGameColorPicker.value = settings.retroGameColor || "#00ff00"
    if (DOM.wavyPatternColor1Setting)
      DOM.wavyPatternColor1Setting.style.display =
        settings.effect === "wavyPattern" ? "block" : "none"
    if (DOM.wavyPatternColor2Setting)
      DOM.wavyPatternColor2Setting.style.display =
        settings.effect === "wavyPattern" ? "block" : "none"
    if (DOM.wavyPatternColor1Picker)
      DOM.wavyPatternColor1Picker.value =
        settings.wavyPatternColor1 || "#AB3E5B"
    if (DOM.wavyPatternColor2Picker)
      DOM.wavyPatternColor2Picker.value =
        settings.wavyPatternColor2 || "#FFBE40"
    if (DOM.angledPatternColor1Setting)
      DOM.angledPatternColor1Setting.style.display =
        settings.effect === "angledPattern" ? "block" : "none"
    if (DOM.angledPatternColor2Setting)
      DOM.angledPatternColor2Setting.style.display =
        settings.effect === "angledPattern" ? "block" : "none"
    if (DOM.angledPatternColor1Picker)
      DOM.angledPatternColor1Picker.value =
        settings.angledPatternColor1 || "#ECD078"
    if (DOM.angledPatternColor2Picker)
      DOM.angledPatternColor2Picker.value =
        settings.angledPatternColor2 || "#0B486B"

    // SVG Wave Generator
    const waveActive = settings.svgWaveActive === true
    if (DOM.svgWaveSettings) {
      DOM.svgWaveSettings.style.display = "block"
      DOM.svgWaveSettings.classList.remove("is-collapsed")
    }
    if (DOM.svgWaveActive) {
      DOM.svgWaveActive.checked = waveActive
    }
    DOM.svgWaveToggleBtn?.setAttribute("aria-expanded", "true")
    if (DOM.svgWaveToggleLabel) {
      const i18n = geti18n()
      DOM.svgWaveToggleLabel.textContent =
        i18n.settings_svg_wave_close || "Close Wave Generator"
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

    DOM.showTodoCheckbox.checked = settings.showTodoList !== false
    if (DOM.todoShowCheckboxesToggle) {
      DOM.todoShowCheckboxesToggle.checked =
        settings.todoShowCheckboxes !== false
    }
    DOM.showNotepadCheckbox.checked = settings.showNotepad !== false
    DOM.showTimerCheckbox.checked = settings.showTimer === true
    if (DOM.showHabitsCheckbox)
      DOM.showHabitsCheckbox.checked = settings.showHabits === true
    if (DOM.showWeatherCheckbox) {
      DOM.showWeatherCheckbox.checked = settings.showWeather === true
    }
    const weatherApiModeSelect = document.getElementById(
      "weather-api-mode-select",
    )
    const weatherCustomApiSettings = document.getElementById(
      "weather-custom-api-settings",
    )
    const weatherForecastEndpointInput = document.getElementById(
      "weather-forecast-endpoint-input",
    )
    const weatherGeocodingEndpointInput = document.getElementById(
      "weather-geocoding-endpoint-input",
    )
    const setWeatherEndpointValidation = (input, type) => {
      if (!input) return
      const endpoint = String(input.value || "").trim()
      let ok = false
      let message = ""
      if (!endpoint) {
        message =
          geti18n().settings_weather_url_required ||
          "Required for custom weather API."
      } else {
        try {
          const url = new URL(endpoint)
          const duplicateParams = (
            WEATHER_API_REQUIRED_PARAMS[type] || []
          ).filter((param) => url.searchParams.has(param))
          ok =
            (url.protocol === "https:" || url.protocol === "http:") &&
            duplicateParams.length === 0
          message = ok
            ? geti18n().settings_weather_url_valid || "Looks good."
            : duplicateParams.length
              ? geti18n().settings_weather_url_no_query ||
                "Use the base endpoint only; the app adds weather query parameters."
              : geti18n().settings_weather_url_protocol ||
                "Use a full http:// or https:// URL."
        } catch {
          message =
            geti18n().settings_weather_url_invalid ||
            "Enter a valid URL, including https://."
        }
      }
      const status =
        input.id === "weather-forecast-endpoint-input"
          ? document.getElementById("weather-forecast-endpoint-status")
          : document.getElementById("weather-geocoding-endpoint-status")
      input.classList.toggle("is-valid", ok)
      input.classList.toggle("is-invalid", !ok)
      input.setAttribute("aria-invalid", ok ? "false" : "true")
      input.setCustomValidity(ok ? "" : message)
      if (status) {
        status.textContent = message
        status.classList.toggle("is-valid", ok)
        status.classList.toggle("is-invalid", !ok)
      }
    }
    const weatherUnitSelect = document.getElementById("weather-unit-select")
    if (weatherUnitSelect) {
      weatherUnitSelect.value = settings.weatherUnit || "celsius"
    }
    const habitColorModeSelect = document.getElementById(
      "habit-color-mode-select",
    )
    if (habitColorModeSelect) {
      habitColorModeSelect.value = settings.habitColorMode || "custom"
    }
    if (weatherApiModeSelect) {
      weatherApiModeSelect.value = settings.weatherApiMode || "extension"
    }
    if (weatherCustomApiSettings) {
      weatherCustomApiSettings.style.display =
        settings.weatherApiMode === "custom" ? "grid" : "none"
    }
    if (weatherForecastEndpointInput) {
      weatherForecastEndpointInput.value =
        settings.weatherForecastEndpoint || ""
      setWeatherEndpointValidation(weatherForecastEndpointInput, "forecast")
    }
    if (weatherGeocodingEndpointInput) {
      weatherGeocodingEndpointInput.value =
        settings.weatherGeocodingEndpoint || ""
      setWeatherEndpointValidation(weatherGeocodingEndpointInput, "geocoding")
    }
    if (DOM.hideTimerAlarmDropdownCheckbox) {
      DOM.hideTimerAlarmDropdownCheckbox.checked =
        settings.hideTimerAlarmDropdown === true
    }
    if (DOM.timerAlarmSoundSelect) {
      renderTimerAlarmSelectOptions(
        DOM.timerAlarmSoundSelect,
        settings.timerAlarmSound || DEFAULT_TIMER_ALARM_SOUND,
        settings,
        geti18n(),
      )
    }
    if (DOM.timerAlarmCustomName) {
      const hasCustomAlarm = Boolean(settings.timerCustomAlarmSoundId)
      DOM.timerAlarmCustomName.textContent = hasCustomAlarm
        ? settings.timerCustomAlarmSoundName || "Custom Sound"
        : DOM.timerAlarmCustomName.dataset.i18n
          ? DOM.timerAlarmCustomName.textContent
          : "No custom sound uploaded"
      DOM.timerAlarmCustomName.classList.toggle("has-file", hasCustomAlarm)
    }
    if (DOM.timerAlarmSoundRemoveBtn) {
      DOM.timerAlarmSoundRemoveBtn.disabled = !settings.timerCustomAlarmSoundId
    }
    DOM.showGregorianCheckbox.checked = settings.showGregorian !== false
    DOM.showMusicCheckbox.checked = settings.musicPlayerEnabled === true
    const isFirefox =
      /firefox|fxios/i.test(navigator.userAgent) ||
      typeof InstallTrigger !== "undefined"
    const isAudioReactiveActive = !isFirefox && settings.musicRealAudioReactive === true

    if (DOM.musicRealAudioReactiveCheckbox) {
      DOM.musicRealAudioReactiveCheckbox.checked = isAudioReactiveActive
    }
    if (DOM.lcpMusicRealAudioReactive) {
      DOM.lcpMusicRealAudioReactive.checked = isAudioReactiveActive
    }
    chrome.storage?.local?.set({
      musicRealAudioReactive: isAudioReactiveActive,
    })
    if (DOM.musicPlayerUseDefaultColorMode) {
      if (settings.musicPlayerUseDefaultColor === "thumbnail") {
        DOM.musicPlayerUseDefaultColorMode.value = "thumbnail"
      } else {
        DOM.musicPlayerUseDefaultColorMode.value =
          settings.musicPlayerUseDefaultColor === true ? "true" : "false"
      }
    }
    if (DOM.musicPlayerWaveBgColorCheckbox) {
      DOM.musicPlayerWaveBgColorCheckbox.checked =
        settings.musicPlayerWaveBgColor === true
    }
    if (DOM.musicSourceIconColorModeSelect) {
      DOM.musicSourceIconColorModeSelect.value =
        settings.musicSourceIconColorMode || "brand"
    }
    if (DOM.clockDisplaySelect) {
      DOM.clockDisplaySelect.value = settings.clockDisplayMode || "all"
    }
    DOM.showFullCalendarCheckbox.checked = settings.showFullCalendar === true
    if (DOM.freeMoveClockCheckbox)
      DOM.freeMoveClockCheckbox.checked = settings.freeMoveClock === true
    const calendarDateMode =
      settings.calendarDateMode ||
      (settings.showLunarCalendar ? "both" : "solar")
    if (DOM.calendarDisplayModeSelect) {
      DOM.calendarDisplayModeSelect.value =
        calendarDateMode === "lunar" || calendarDateMode === "both"
          ? calendarDateMode
          : "solar"
    }
    if (DOM.showLunarCalendarCheckbox) {
      DOM.showLunarCalendarCheckbox.checked = calendarDateMode !== "solar"
    }
    if (DOM.lcpLunarCalendar) {
      DOM.lcpLunarCalendar.checked = calendarDateMode !== "solar"
    }
    if (DOM.showLunarCalendarClockCheckbox) {
      DOM.showLunarCalendarClockCheckbox.checked =
        !!settings.showClockLunarCalendar
    }
    if (DOM.clockLunarModeSelect) {
      DOM.clockLunarModeSelect.value = settings.showClockLunarMode || "append"
    }

    if (DOM.flipLayoutCheckbox) {
      DOM.flipLayoutCheckbox.checked = settings.flipLayout === true
    }
    if (DOM.lcpFlipLayout) {
      DOM.lcpFlipLayout.checked = settings.flipLayout === true
    }
    if (DOM.lcpQuickAccessHorizontal) {
      DOM.lcpQuickAccessHorizontal.checked =
        settings.quickAccessHorizontal === true
    }

    if (DOM.showDonateButtonCheckbox) {
      DOM.showDonateButtonCheckbox.checked = settings.showDonateButton !== false
    }
    if (DOM.allowTextSelectionCheckbox) {
      DOM.allowTextSelectionCheckbox.checked =
        settings.allowTextSelection === true
    }
    DOM.showSearchBarCheckbox.checked = settings.showSearchBar !== false
    if (DOM.searchBarHoverScaleCheckbox) {
      DOM.searchBarHoverScaleCheckbox.checked =
        settings.searchBarHoverScale === true
    }
    if (DOM.freeMoveSearchBarCheckbox) {
      DOM.freeMoveSearchBarCheckbox.checked =
        settings.freeMoveSearchBar === true
    }
    if (DOM.freeMoveBookmarksCheckbox) {
      DOM.freeMoveBookmarksCheckbox.checked =
        settings.freeMoveBookmarks === true
    }
    if (DOM.lcpSearchBar) {
      DOM.lcpSearchBar.checked = settings.showSearchBar !== false
    }
    if (DOM.showSearchAiIconCheckbox) {
      DOM.showSearchAiIconCheckbox.checked = settings.showSearchAIIcon !== false
    }
    if (DOM.extensionActionBehaviorSelect) {
      DOM.extensionActionBehaviorSelect.value =
        settings.actionBehavior || "sidepanel"
    }

    if (DOM.searchEngineSelect) {
      DOM.searchEngineSelect.value = settings.searchEngine || "default"
    }
    if (DOM.searchBarStyleSelect) {
      DOM.searchBarStyleSelect.value = settings.searchBarStyle || "glass"
    }
    const searchCustomWrap = document.getElementById(
      "search-bar-custom-colors-wrap",
    )
    if (searchCustomWrap) {
      searchCustomWrap.style.display =
        settings.searchBarStyle === "custom" ? "block" : "none"
    }
    if (DOM.searchBgColorPicker) {
      DOM.searchBgColorPicker.value = settings.searchBarBgColor || "#1a1d24"
    }
    if (DOM.searchTextColorPicker) {
      DOM.searchTextColorPicker.value = settings.searchBarTextColor || "#ffffff"
    }
    if (DOM.searchBorderColorPicker) {
      DOM.searchBorderColorPicker.value =
        settings.searchBarBorderColor || "#6366f1"
    }
    if (DOM.searchBarCustomPlaceholder) {
      DOM.searchBarCustomPlaceholder.value =
        settings.searchBarCustomPlaceholder || ""
    }
    if (DOM.searchBarWidthSlider) {
      DOM.searchBarWidthSlider.value = settings.searchBarWidth || 750
      if (DOM.searchBarWidthVal) {
        DOM.searchBarWidthVal.textContent = `${settings.searchBarWidth || 750}px`
      }
    }

    if (DOM.lcpQaShowTodo)
      DOM.lcpQaShowTodo.checked = settings.qaShowTodo !== false
    if (DOM.lcpQaShowNotepad)
      DOM.lcpQaShowNotepad.checked = settings.qaShowNotepad !== false
    if (DOM.lcpQaShowTimer)
      DOM.lcpQaShowTimer.checked = settings.qaShowTimer !== false
    if (DOM.lcpQaShowCalendar)
      DOM.lcpQaShowCalendar.checked = settings.qaShowCalendar !== false
    if (DOM.lcpQaShowQuotes)
      DOM.lcpQaShowQuotes.checked = settings.qaShowQuotes !== false
    if (DOM.quotesUpdateFreqSelect)
      DOM.quotesUpdateFreqSelect.value = settings.quotesUpdateFreq || "tab"
    if (DOM.lcpQaShowWeather)
      DOM.lcpQaShowWeather.checked = settings.qaShowWeather !== false
    if (DOM.lcpQaShowMusic)
      DOM.lcpQaShowMusic.checked = settings.qaShowMusic !== false
    if (DOM.lcpQaShowClock)
      DOM.lcpQaShowClock.checked = settings.qaShowClock !== false
    if (DOM.lcpQaShowGregorian)
      DOM.lcpQaShowGregorian.checked = settings.qaShowGregorian !== false
    if (DOM.lcpQaShowRss) DOM.lcpQaShowRss.checked = settings.qaShowRss === true
    if (DOM.lcpQaShowHabits)
      DOM.lcpQaShowHabits.checked = settings.qaShowHabits === true
    if (DOM.lcpQaShowAmbient)
      DOM.lcpQaShowAmbient.checked = settings.qaShowAmbient === true
    if (DOM.lcpQaShowAiAssistant)
      DOM.lcpQaShowAiAssistant.checked = settings.qaShowAiAssistant === true
    if (DOM.lcpQaAllowReorder)
      DOM.lcpQaAllowReorder.checked = settings.qaAllowReorder === true
    if (DOM.searchBarBlurSlider) {
      DOM.searchBarBlurSlider.value = settings.searchBarBlur ?? 20
      if (DOM.searchBarBlurVal) {
        DOM.searchBarBlurVal.textContent = `${settings.searchBarBlur ?? 20}px`
      }
    }
    const currentBlurStr = String(settings.searchBarBlur ?? 20)
    document
      .querySelectorAll(".blur-preset-btn, [data-blur]")
      .forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.blur === currentBlurStr)
      })
    if (DOM.searchBarRadiusSlider) {
      DOM.searchBarRadiusSlider.value = settings.searchBarRadius ?? 20
      if (DOM.searchBarRadiusVal) {
        DOM.searchBarRadiusVal.textContent = `${settings.searchBarRadius ?? 20}px`
      }
    }
    const currentRadiusStr = String(settings.searchBarRadius ?? 20)
    document
      .querySelectorAll(".radius-preset-btn, [data-radius]")
      .forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.radius === currentRadiusStr)
      })
    if (DOM.lcpSearchBarWidth) {
      DOM.lcpSearchBarWidth.value = settings.searchBarWidth || 750
      if (DOM.lcpSearchBarWidthVal) {
        DOM.lcpSearchBarWidthVal.textContent = `${settings.searchBarWidth || 750}px`
      }
    }
    const currentWidthStr = String(settings.searchBarWidth || 750)
    document
      .querySelectorAll(".lcp-preset-btn[data-width], .width-preset-btn")
      .forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.width === currentWidthStr)
      })
    DOM.showBookmarksCheckbox.checked = settings.showBookmarks !== false
    if (DOM.showQuickAccessBgCheckbox) {
      DOM.showQuickAccessBgCheckbox.checked =
        settings.showQuickAccessBg === true
    }
    if (DOM.lcpQuickAccessBg) {
      DOM.lcpQuickAccessBg.checked = settings.showQuickAccessBg === true
    }
    if (DOM.showContextMenuBgCheckbox) {
      DOM.showContextMenuBgCheckbox.checked =
        settings.showContextMenuBg !== false
    }
    if (DOM.lcpBookmarks) {
      DOM.lcpBookmarks.checked = settings.showBookmarks !== false
    }
    if (DOM.lcpContextMenuBg) {
      DOM.lcpContextMenuBg.checked = settings.showContextMenuBg !== false
    }
    DOM.showBookmarkGroupsCheckbox.checked =
      settings.showBookmarkGroups !== false
    const sw = settings.settingsSidebarWidth || 500
    document.documentElement.style.setProperty(
      "--sidebar-width",
      sw + "px",
    )
    if (DOM.settingsSidebarWidthInput)
      DOM.settingsSidebarWidthInput.value = sw
    if (DOM.settingsSidebarWidthValue)
      DOM.settingsSidebarWidthValue.textContent =
        sw + "px"
    document
      .querySelectorAll(
        '.lcp-preset-btn[data-preset-target="settings-sidebar-width-input"], .sidebar-width-preset-btn, [data-sidebar-width]',
      )
      .forEach((btn) => {
        const v = btn.dataset.presetVal || btn.dataset.sidebarWidth
        btn.classList.toggle("active", v === String(sw))
      })
    if (settings.bookmarkSidebarWidth) {
      document.documentElement.style.setProperty(
        "--bookmark-sidebar-width",
        settings.bookmarkSidebarWidth + "px",
      )
      if (DOM.bookmarkSidebarWidthInput)
        DOM.bookmarkSidebarWidthInput.value = settings.bookmarkSidebarWidth
      if (DOM.bookmarkSidebarWidthValue)
        DOM.bookmarkSidebarWidthValue.textContent =
          settings.bookmarkSidebarWidth + "px"
    }
    if (DOM.bookmarkLayout) {
      if (DOM.bookmarkSidebarWidthContainer) {
        DOM.bookmarkSidebarWidthContainer.style.display =
          settings.bookmarkLayout === "sidebar" ? "block" : "none"
      }
    }
    if (DOM.bookmarkLayoutShowGroups) {
      DOM.bookmarkLayoutShowGroups.checked =
        settings.showBookmarkGroups !== false
    }
    if (DOM.lcpBookmarkGroups) {
      DOM.lcpBookmarkGroups.checked = settings.showBookmarkGroups !== false
    }
    if (DOM.bookmarkOpenInNewTab) {
      DOM.bookmarkOpenInNewTab.checked = settings.bookmarkOpenInNewTab === true
    }
    if (DOM.ghostControlsCheckbox) {
      DOM.ghostControlsCheckbox.checked =
        settings.sideControlsGhostMode === true
    }
    const perfHoverModeCheckbox = document.getElementById(
      "perf-hover-mode-checkbox",
    )
    if (perfHoverModeCheckbox) {
      perfHoverModeCheckbox.checked = settings.perfHoverMode === true
    }
    const picsumProviderSelect = document.getElementById(
      "picsum-provider-select",
    )
    if (picsumProviderSelect) {
      picsumProviderSelect.value = settings.freePhotosProvider || "loremflickr"
    }

    const snapToGridCheckbox = document.getElementById("snap-to-grid-checkbox")
    const snapGridSizeRow = document.getElementById("snap-grid-size-row")
    const snapGridSizeInput = document.getElementById("snap-grid-size-input")
    if (snapToGridCheckbox) {
      snapToGridCheckbox.checked = settings.snapToGrid === true
      if (snapGridSizeRow) {
        snapGridSizeRow.style.display = settings.snapToGrid ? "block" : "none"
      }
    }
    if (snapGridSizeInput) {
      snapGridSizeInput.value = settings.snapGridSize || 20
    }
    if (DOM.lcpGhostControls) {
      DOM.lcpGhostControls.checked = settings.sideControlsGhostMode === true
    }
    document.body.classList.toggle(
      "has-top-right-controls",
      settings.showTopRightControls !== false,
    )
    DOM.showTopRightControlsCheckbox.checked =
      settings.showTopRightControls !== false
    if (DOM.lcpTopRightControls) {
      DOM.lcpTopRightControls.checked = settings.showTopRightControls !== false
    }
    document.body.classList.toggle("flip-layout", settings.flipLayout === true)
    document.body.classList.toggle(
      "ghost-controls",
      settings.sideControlsGhostMode === true,
    )
    document.body.classList.toggle(
      "zen-mode-global",
      settings.globalZenMode === true,
    )
    document.body.classList.toggle("flip-layout", settings.flipLayout === true)
    document.body.classList.toggle(
      "quick-access-horizontal",
      settings.quickAccessHorizontal === true,
    )
    document.body.classList.toggle(
      "free-move-clock",
      settings.freeMoveClock === true,
    )
    document.body.classList.toggle("flip-layout", settings.flipLayout === true)
    document.body.classList.toggle(
      "free-move-custom-title",
      settings.freeMoveCustomTitle === true,
    )
    document.body.classList.toggle(
      "free-move-search-bar",
      settings.freeMoveSearchBar === true,
    )
    document.body.classList.toggle(
      "bookmark-free-move-active",
      settings.freeMoveBookmarks === true,
    )
    if (settings.freeMoveClock !== true) {
      const clockWrap = document.getElementById("clock-date-wrap")
      if (clockWrap) {
        clockWrap.style.position = ""
        clockWrap.style.top = ""
        clockWrap.style.left = ""
        clockWrap.style.bottom = ""
        clockWrap.style.right = ""
        clockWrap.style.transform = ""
        clockWrap.style.margin = ""
      }
    }
    if (settings.freeMoveCustomTitle !== true) {
      const titleWrap = document.getElementById("custom-title-display")
      if (titleWrap) {
        titleWrap.style.position = ""
        titleWrap.style.top = ""
        titleWrap.style.left = ""
        titleWrap.style.bottom = ""
        titleWrap.style.right = ""
        titleWrap.style.transform = ""
        titleWrap.style.margin = ""
      }
    }
    if (settings.freeMoveSearchBar !== true) {
      const searchWrap = document.getElementById("search-container")
      if (searchWrap) {
        searchWrap.style.position = ""
        searchWrap.style.top = ""
        searchWrap.style.left = ""
        searchWrap.style.bottom = ""
        searchWrap.style.right = ""
        searchWrap.style.transform = ""
        searchWrap.style.margin = ""
      }
    }
    if (settings.freeMoveBookmarks !== true || settings.bookmarkLayout !== "draggable-grid") {
      const bw = document.getElementById("bookmark-widget")
      if (bw) {
        bw.style.position = ""
        bw.style.top = ""
        bw.style.left = ""
        bw.style.bottom = ""
        bw.style.right = ""
        bw.style.transform = ""
        bw.style.margin = ""
        bw.classList.remove("has-position")
      }
    }
    if (DOM.showCustomTitleCheckbox) {
      DOM.showCustomTitleCheckbox.checked = settings.showCustomTitle !== false
    }
    document.body.classList.toggle(
      "hide-custom-title",
      settings.showCustomTitle === false,
    )
    if (DOM.freeMoveCustomTitleCheckbox) {
      DOM.freeMoveCustomTitleCheckbox.checked =
        settings.freeMoveCustomTitle === true
    }
    if (DOM.customTitleText) {
      DOM.customTitleText.value = settings.customTitleText || ""
      const text2El = document.getElementById("custom-title-text-2")
      if (text2El) text2El.value = settings.customTitleText2 || ""
      const populateFontDropdown = (selectEl, selectedVal) => {
        if (!selectEl) return
        selectEl.innerHTML = '<option value="inherit">Font mặc định</option>'
        PREDEFINED_FONTS.forEach((f) => {
          const opt = document.createElement("option")
          opt.value = f.value
          opt.textContent = f.label
          selectEl.appendChild(opt)
        })
        const customFonts =
          JSON.parse(localStorage.getItem("customFonts")) || []
        customFonts.forEach((f) => {
          const opt = document.createElement("option")
          opt.value = `'${f.name}'`
          opt.textContent = `${f.name} (Tùy chỉnh)`
          selectEl.appendChild(opt)
        })
        selectEl.value = selectedVal || "inherit"
      }

      populateFontDropdown(
        document.getElementById("custom-title-font"),
        settings.customTitleFont,
      )
      populateFontDropdown(
        document.getElementById("custom-title-font-2"),
        settings.customTitleFont2,
      )
      populateFontDropdown(
        document.getElementById("custom-title-font-3"),
        settings.customTitleFont3,
      )
      populateFontDropdown(
        document.getElementById("custom-title-font-4"),
        settings.customTitleFont4,
      )

      const oriEl = document.getElementById("custom-title-orientation")
      if (oriEl) oriEl.value = settings.customTitleOrientation || "upright"
      const ori2El = document.getElementById("custom-title-orientation-2")
      if (ori2El) ori2El.value = settings.customTitleOrientation2 || "mixed"
      const ori3El = document.getElementById("custom-title-orientation-3")
      if (ori3El) ori3El.value = settings.customTitleOrientation3 || "mixed"
      const ori4El = document.getElementById("custom-title-orientation-4")
      if (ori4El) ori4El.value = settings.customTitleOrientation4 || "mixed"

      const dirEl = document.getElementById("custom-title-direction")
      if (dirEl) dirEl.value = settings.customTitleDirection || "horizontal"
      const orderEl = document.getElementById("custom-title-order")
      if (orderEl) orderEl.value = settings.customTitleOrder || "normal"
      const wwEl = document.getElementById("custom-title-word-wrap")
      if (wwEl) wwEl.checked = settings.customTitleWordWrap === true

      const animEl = document.getElementById("custom-title-animation")
      if (animEl) animEl.value = settings.customTitleAnimation || "none"
      const animLoopEl = document.getElementById("custom-title-animation-loop")
      if (animLoopEl)
        animLoopEl.value = settings.customTitleAnimationLoop || "infinite"

      if (DOM.customTitleMulticolor)
        DOM.customTitleMulticolor.checked =
          settings.customTitleMulticolor === true
      if (DOM.customTitleColor)
        DOM.customTitleColor.value = settings.customTitleColor || "#ffffff"

      const fs = settings.customTitleFontSize || 24
      if (DOM.customTitleFontSize) DOM.customTitleFontSize.value = fs
      const fsd = document.getElementById("custom-title-fontsize-val")
      if (fsd) fsd.textContent = fs

      const fs2 = settings.customTitleFontSize2 || 24
      const fs2Input = document.getElementById("custom-title-font-size-2")
      if (fs2Input) fs2Input.value = fs2
      const fs2d = document.getElementById("custom-title-fontsize-2-val")
      if (fs2d) fs2d.textContent = fs2

      const ls = settings.customTitleLetterSpacing || 0
      if (DOM.customTitleLetterSpacing) DOM.customTitleLetterSpacing.value = ls
      const lsd = document.getElementById("custom-title-letter-spacing-val")
      if (lsd) lsd.textContent = ls

      const ls2 = settings.customTitleLetterSpacing2 || 0
      const ls2Input = document.getElementById("custom-title-letter-spacing-2")
      if (ls2Input) ls2Input.value = ls2
      const ls2d = document.getElementById("custom-title-letter-spacing-2-val")
      if (ls2d) ls2d.textContent = ls2

      const lineSpc = settings.customTitleLineSpacing || 15
      const lineSpcInput = document.getElementById("custom-title-line-spacing")
      if (lineSpcInput) lineSpcInput.value = lineSpc
      const lineSpcd = document.getElementById("custom-title-line-spacing-val")
      if (lineSpcd) lineSpcd.textContent = lineSpc

      const sb = settings.customTitleShadowBlur || 0
      if (DOM.customTitleShadowBlur) DOM.customTitleShadowBlur.value = sb
      const sbd = document.getElementById("custom-title-shadow-blur-val")
      if (sbd) sbd.textContent = sb

      const sy = settings.customTitleShadowY || 0
      if (DOM.customTitleShadowY) DOM.customTitleShadowY.value = sy
      const syd = document.getElementById("custom-title-shadow-y-val")
      if (syd) syd.textContent = sy

      if (DOM.customTitleShadowColor)
        DOM.customTitleShadowColor.value =
          settings.customTitleShadowColor || "#000000"

      const bs = settings.customTitleBorderSize || 0
      if (DOM.customTitleBorderSize) DOM.customTitleBorderSize.value = bs
      const bsd = document.getElementById("custom-title-border-size-val")
      if (bsd) bsd.textContent = bs

      if (DOM.customTitleBorderColor)
        DOM.customTitleBorderColor.value =
          settings.customTitleBorderColor || "#000000"
    }

    if (DOM.cursorTrailStyleSelect) {
      DOM.cursorTrailStyleSelect.value = settings.cursorTrailStyle || "classic"
    }

    DOM.musicStyleSelect.value = settings.musicBarStyle || "vinyl"
    if (DOM.lcpMusicStyleSelect) {
      DOM.lcpMusicStyleSelect.value = settings.musicBarStyle || "vinyl"
    }
    document
      .querySelectorAll(".style-preset-btn[data-style-preset]")
      .forEach((btn) => {
        btn.classList.toggle(
          "active",
          btn.dataset.stylePreset ===
            (settings.interfaceStylePreset || "custom"),
        )
      })

    // Sync Theme-specific UI
    if (DOM.fliqloThemeSelect) {
      DOM.fliqloThemeSelect.value = settings.fliqloTheme || "dark"
    }
    if (DOM.contextMenuStyleSelect) {
      DOM.contextMenuStyleSelect.value = settings.contextMenuStyle || "dark"
    }
    if (DOM.contextMenuMiniCheckbox) {
      DOM.contextMenuMiniCheckbox.checked = settings.contextMenuMini === true
    }
    if (DOM.lcpContextMenuMini) {
      DOM.lcpContextMenuMini.checked = settings.contextMenuMini === true
    }
    if (DOM.clockDateStyleSelect) {
      DOM.clockDateStyleSelect.value = settings.dateClockStyle || "default"
    }

    // Sync the save background buttons (Unsplash & Picsum) based on the current background
    if (typeof updateMediaSaveButtonsState === "function") {
      updateMediaSaveButtonsState()
    }

    // Sync all preset buttons across the settings UI
    document
      .querySelectorAll(".lcp-preset-btn[data-preset-target]")
      .forEach((btn) => {
        const targetId = btn.dataset.presetTarget
        const targetInput = document.getElementById(targetId)
        if (targetInput) {
          btn.classList.toggle(
            "active",
            String(btn.dataset.presetVal) === String(targetInput.value),
          )
        }
      })
  }
}

