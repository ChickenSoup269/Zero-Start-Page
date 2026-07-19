/**
 * Event Handlers Module
 * Sets up all UI event listeners for settings
 */

import {
  DEFAULT_MEDIA_ORB_IMAGE_URL,
  getSettings,
  updateSetting,
  saveSettings,
  resetSettingsState,
  backupToCloud,
  clearCloudBackup,
  restoreFromCloud,
  defaultSettings,
} from "../../services/state.js"
import {
  geti18n,
  loadLanguage,
  applyTranslations,
  getEnglishLanguageTemplate,
  normalizeLanguageCode,
  validateCustomLanguagePayload,
} from "../../services/i18n.js"
import {
  getLanguageGuideOption,
  languageGuideOptions,
} from "../../data/languageGuides/languageGuideOptions.js"
import { getLanguageGuideModalText } from "../../data/languageGuides/languageGuideModalText.js"
import {
  showAlert,
  showConfirm,
  showChoiceConfirm,
  showChecklistConfirm,
  showBookmarkHideInstructions,
} from "../../utils/dialog.js"
import {
  getImageBlob,
  isIdbMedia,
  isIdbVideo,
  saveAudio,
  deleteImage,
  saveImage,
  saveVideo,
  clearAllMedia,
} from "../../services/imageStore.js"
import { getSvgWaveParams, updateWaveColorPreviews } from "./svgWaveUtils.js"
import {
  buildMaterial3Scheme,
  getContrastYIQ,
  getRandomHexColor,
  hexToRgb,
} from "../../utils/colors.js"
import {
  setUnsplashRandomBackground,
  populateUnsplashCollections,
  openUnsplashExplorer,
  loadExplorerResults,
  loadMoreExplorer,
  minimizeUnsplashExplorer,
} from "./unsplashFetcher.js"
import {
  getPicsumRandomBackground,
  preloadPicsumImage,
} from "./picsumFetcher.js"
import {
  renderUserColors,
  renderLocalBackgrounds,
  renderUserAccentColors,
  recompressSavedBackgroundImages,
  maybeShowLocalBackgroundPerformanceWarning,
} from "./backgroundManager.js"
import { renderUserGradients } from "./gradientManager.js"
import {
  getTabIconChars,
  applyTabIcon,
  renderTabIconPreview,
} from "./tabIcon.js"
import { initFaPicker } from "./faPicker.js"
import { applyAccentFromCurrentBackground } from "./dynamicAccent.js"
import { loadGoogleFont, renderFontGrid } from "./fontManager.js"
import { renderUserSvgWaves } from "./svgWaveManager.js"
import { renderBookmarks } from "../bookmarks.js"
import { copyText, decodePresetCode, encodePresetCode } from "./presetCode.js"
import { showToast } from "../../utils/toast.js"
import {
  BACKGROUND_ANIMATION_KEYS,
  pickSettings,
  VISUAL_EFFECT_KEYS,
  VISUAL_THEME_KEYS,
} from "./visualPresetConfig.js"
import {
  CUSTOM_ALARM_SOUND_KEY,
  DEFAULT_TIMER_ALARM_SOUND,
  renderTimerAlarmSelectOptions,
} from "../../data/timerAlarmSounds.js"
import { DriveSync } from "../../services/googleDriveSync.js"

const BUG_REPORT_FORM_URLS = {
  vi: "https://docs.google.com/forms/d/e/1FAIpQLSfsOq7QtdqgxcZYIGiDeV-CimbfrmhLzANa0q0VTCb2mPOsmw/viewform?usp=publish-editor",
  en: "https://docs.google.com/forms/d/e/1FAIpQLSeO4hVhXSx1yz3nr2WEKnmJUO3JJWaB0guFGNGzISjoB5hc1A/viewform?usp=publish-editor",
}

const DEFAULT_WEATHER_FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast"
const DEFAULT_WEATHER_GEOCODING_ENDPOINT =
  "https://geocoding-api.open-meteo.com/v1/search"
const WEATHER_API_REQUIRED_PARAMS = {
  forecast: ["latitude", "longitude", "current", "daily", "timezone", "forecast_days"],
  geocoding: ["name", "count", "language", "format"],
}

function syncUninstallSurveyLanguage(language) {
  try {
    window.chrome?.runtime?.sendMessage?.(
      {
        action: "updateUninstallLanguage",
        language: language === "vi" ? "vi" : "en",
      },
      () => {
        const error = window.chrome?.runtime?.lastError
        if (error) {
          console.warn("Could not sync uninstall survey language:", error.message)
        }
      },
    )
  } catch (error) {
    console.warn("Could not sync uninstall survey language:", error)
  }
}

export function setupGeneralEventHandlers(
  ctx,
  handleSettingUpdate,
  applySettings,
  updateSettingsInputs,
) {
  const DOM = ctx.DOM
  const i18n = new Proxy(
    {},
    {
      get: (target, prop) => geti18n()[prop],
    },
  )
  const effects = ctx.effects
  const LANGUAGE_TOOLS_OPEN_KEY = "startpage_languageToolsOpen"
  const MAX_TIMER_ALARM_SIZE = 12 * 1024 * 1024
  const STYLE_PRESETS = {
    clean: {
      bookmarkLayout: "default",
      bookmarkItemStyle: "default",
      bookmarkHideText: false,
      bookmarkHideBg: true,
      bookmarkMacosHover: false,
      bookmarkFontSize: 10,
      bookmarkIconSize: 42,
      bookmarkGap: 10,
      bookmarkTextColor: null,
      bookmarkBgColor: "#ffffff",
      bookmarkBgOpacity: 0,
      bookmarkGroupBgColor: "#ffffff",
      bookmarkGroupBgOpacity: 0,
      bookmarkGroupTextColor: null,
      bookmarkGroupAutoTextContrast: false,
      bookmarkGroupFontSize: 14,
      bookmarkShadowColor: "#000000",
      bookmarkShadowOpacity: 14,
      bookmarkShadowBlur: 6,
      musicBarStyle: "minimal",
      musicPlayerSkin: "white-blur",
    },
    dock: {
      bookmarkLayout: "taskbar",
      bookmarkLayoutBgStyle: "default",
      bookmarkItemStyle: "default",
      bookmarkHideText: true,
      bookmarkHideBg: false,
      bookmarkMacosHover: true,
      bookmarkFontSize: 10,
      bookmarkIconSize: 46,
      bookmarkGap: 8,
      bookmarkTextColor: null,
      bookmarkBgColor: "#ffffff",
      bookmarkBgOpacity: 92,
      bookmarkGroupBgColor: "#ffffff",
      bookmarkGroupBgOpacity: 0,
      bookmarkGroupTextColor: null,
      bookmarkGroupAutoTextContrast: false,
      bookmarkGroupFontSize: 13,
      bookmarkShadowColor: "#000000",
      bookmarkShadowOpacity: 22,
      bookmarkShadowBlur: 10,
      musicBarStyle: "pill",
      musicPlayerSkin: "white-blur",
    },
    macos: {
      bookmarkLayout: "taskbar",
      bookmarkLayoutBgStyle: "default",
      bookmarkItemStyle: "default",
      bookmarkHideText: true,
      bookmarkHideBg: false,
      bookmarkMacosHover: true,
      bookmarkFontSize: 10,
      bookmarkIconSize: 52,
      bookmarkGap: 10,
      bookmarkTextColor: null,
      bookmarkBgColor: "#ffffff",
      bookmarkBgOpacity: 88,
      bookmarkGroupBgColor: "#ffffff",
      bookmarkGroupBgOpacity: 0,
      bookmarkGroupTextColor: null,
      bookmarkGroupAutoTextContrast: false,
      bookmarkGroupFontSize: 13,
      bookmarkShadowColor: "#000000",
      bookmarkShadowOpacity: 24,
      bookmarkShadowBlur: 14,
      musicBarStyle: "apple",
      musicPlayerSkin: "white-blur",
    },
    glass: {
      bookmarkLayout: "default",
      bookmarkItemStyle: "default",
      bookmarkHideText: false,
      bookmarkHideBg: false,
      bookmarkMacosHover: false,
      bookmarkFontSize: 10,
      bookmarkIconSize: 42,
      bookmarkGap: 10,
      bookmarkTextColor: null,
      bookmarkBgColor: "#ffffff",
      bookmarkBgOpacity: 28,
      bookmarkGroupBgColor: "#ffffff",
      bookmarkGroupBgOpacity: 22,
      bookmarkGroupTextColor: null,
      bookmarkGroupAutoTextContrast: false,
      bookmarkGroupFontSize: 14,
      bookmarkShadowColor: "#000000",
      bookmarkShadowOpacity: 18,
      bookmarkShadowBlur: 12,
      musicBarStyle: "vinyl",
      musicPlayerSkin: "white-blur",
    },
    compact: {
      bookmarkLayout: "taskbar-left",
      bookmarkLayoutBgStyle: "hidden",
      bookmarkItemStyle: "default",
      bookmarkHideText: true,
      bookmarkHideBg: true,
      bookmarkMacosHover: false,
      bookmarkFontSize: 9,
      bookmarkIconSize: 34,
      bookmarkGap: 4,
      bookmarkTextColor: null,
      bookmarkBgColor: "#ffffff",
      bookmarkBgOpacity: 0,
      bookmarkGroupBgColor: "#ffffff",
      bookmarkGroupBgOpacity: 0,
      bookmarkGroupTextColor: null,
      bookmarkGroupAutoTextContrast: false,
      bookmarkGroupFontSize: 12,
      bookmarkShadowColor: "#000000",
      bookmarkShadowOpacity: 16,
      bookmarkShadowBlur: 6,
      musicBarStyle: "minimal",
      musicPlayerSkin: "default",
    },
    sidebar: {
      bookmarkLayout: "sidebar",
      bookmarkLayoutBgStyle: "default",
      bookmarkItemStyle: "default",
      bookmarkHideText: false,
      bookmarkHideBg: false,
      bookmarkMacosHover: false,
      bookmarkFontSize: 10,
      bookmarkIconSize: 38,
      bookmarkGap: 7,
      bookmarkTextColor: null,
      bookmarkBgColor: "#ffffff",
      bookmarkBgOpacity: 56,
      bookmarkGroupBgColor: "#ffffff",
      bookmarkGroupBgOpacity: 0,
      bookmarkGroupTextColor: null,
      bookmarkGroupAutoTextContrast: false,
      bookmarkGroupFontSize: 14,
      bookmarkShadowColor: "#000000",
      bookmarkShadowOpacity: 18,
      bookmarkShadowBlur: 8,
      musicBarStyle: "sidebar",
      musicPlayerSkin: "white-blur",
    },
    neon: {
      bookmarkLayout: "default",
      bookmarkItemStyle: "default",
      bookmarkHideText: false,
      bookmarkHideBg: false,
      bookmarkMacosHover: false,
      bookmarkFontSize: 11,
      bookmarkIconSize: 44,
      bookmarkGap: 12,
      bookmarkTextColor: null,
      bookmarkBgColor: "#ffffff",
      bookmarkBgOpacity: 34,
      bookmarkGroupBgColor: "#ffffff",
      bookmarkGroupBgOpacity: 18,
      bookmarkGroupTextColor: null,
      bookmarkGroupAutoTextContrast: false,
      bookmarkGroupFontSize: 14,
      bookmarkShadowColor: "#000000",
      bookmarkShadowOpacity: 24,
      bookmarkShadowBlur: 10,
      musicBarStyle: "neon",
      musicPlayerSkin: "white-blur",
    },
    terminal: {
      bookmarkLayout: "sidebar",
      bookmarkLayoutBgStyle: "default",
      bookmarkItemStyle: "default",
      bookmarkHideText: false,
      bookmarkHideBg: false,
      bookmarkMacosHover: false,
      bookmarkFontSize: 10,
      bookmarkIconSize: 36,
      bookmarkGap: 7,
      bookmarkTextColor: null,
      bookmarkBgColor: "#ffffff",
      bookmarkBgOpacity: 18,
      bookmarkGroupBgColor: "#ffffff",
      bookmarkGroupBgOpacity: 10,
      bookmarkGroupTextColor: null,
      bookmarkGroupAutoTextContrast: false,
      bookmarkGroupFontSize: 13,
      bookmarkShadowColor: "#000000",
      bookmarkShadowOpacity: 18,
      bookmarkShadowBlur: 8,
      musicBarStyle: "terminal",
      musicPlayerSkin: "default",
    },
    cassette: {
      bookmarkLayout: "default",
      bookmarkItemStyle: "default",
      bookmarkHideText: false,
      bookmarkHideBg: false,
      bookmarkMacosHover: false,
      bookmarkFontSize: 10,
      bookmarkIconSize: 44,
      bookmarkGap: 11,
      bookmarkTextColor: null,
      bookmarkBgColor: "#ffffff",
      bookmarkBgOpacity: 52,
      bookmarkGroupBgColor: "#ffffff",
      bookmarkGroupBgOpacity: 18,
      bookmarkGroupTextColor: null,
      bookmarkGroupAutoTextContrast: false,
      bookmarkGroupFontSize: 14,
      bookmarkShadowColor: "#000000",
      bookmarkShadowOpacity: 18,
      bookmarkShadowBlur: 10,
      musicBarStyle: "cassette",
      musicPlayerSkin: "white-blur",
    },
    cozy: {
      bookmarkLayout: "default",
      bookmarkItemStyle: "default",
      bookmarkHideText: false,
      bookmarkHideBg: false,
      bookmarkMacosHover: true,
      bookmarkFontSize: 11,
      bookmarkIconSize: 46,
      bookmarkGap: 12,
      bookmarkTextColor: null,
      bookmarkBgColor: "#ffffff",
      bookmarkBgOpacity: 64,
      bookmarkGroupBgColor: "#ffffff",
      bookmarkGroupBgOpacity: 24,
      bookmarkGroupTextColor: null,
      bookmarkGroupAutoTextContrast: false,
      bookmarkGroupFontSize: 14,
      bookmarkShadowColor: "#000000",
      bookmarkShadowOpacity: 20,
      bookmarkShadowBlur: 12,
      musicBarStyle: "minimal",
      musicPlayerSkin: "white-blur",
    },
  }
  const INTERFACE_STYLE_KEYS = new Set([
    "bookmarkLayout",
    "bookmarkLayoutBgStyle",
    "bookmarkLayoutBgColor",
    "bookmarkItemStyle",
    "bookmarkHideText",
    "bookmarkHideBg",
    "bookmarkHideScrollbar",
    "bookmarkMacosHover",
    "bookmarkFontSize",
    "bookmarkIconSize",
    "bookmarkGap",
    "bookmarkTextColor",
    "bookmarkBgColor",
    "bookmarkBgOpacity",
    "bookmarkGroupBgColor",
    "bookmarkGroupBgOpacity",
    "bookmarkGroupTextColor",
    "bookmarkGroupAutoTextContrast",
    "bookmarkGroupFontSize",
    "bookmarkGroupBorderRadius",
    "bookmarkShadowColor",
    "bookmarkShadowOpacity",
    "bookmarkShadowBlur",
    "musicBarStyle",
    "musicPlayerSkin",
    "musicPlayerUseDefaultColor",
  ])

  const setStylePresetActive = (presetId) => {
    document
      .querySelectorAll(".style-preset-btn[data-style-preset]")
      .forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.stylePreset === presetId)
      })
  }

  const markInterfaceStyleCustom = (key) => {
    if (key && !INTERFACE_STYLE_KEYS.has(key)) return
    if (getSettings().interfaceStylePreset !== "custom") {
      updateSetting("interfaceStylePreset", "custom")
    }
    setStylePresetActive("custom")
  }

  const dispatchSettingsUpdated = (key, value) => {
    window.dispatchEvent(
      new CustomEvent("settingsUpdated", {
        detail: { key, value },
      }),
    )
  }

  const applyInterfaceStylePreset = (presetId) => {
    let preset = STYLE_PRESETS[presetId]
    if (!preset && presetId && presetId.startsWith("user-style-")) {
      const userStyles = getSettings().userStyles || []
      const found = userStyles.find((s) => s.id === presetId)
      if (found) {
        preset = found.snapshot
      }
    }
    if (!preset) return

    Object.entries(preset).forEach(([key, value]) => updateSetting(key, value))
    updateSetting("interfaceStylePreset", presetId)
    saveSettings(true)
    updateSettingsInputs()
    applySettings()
    renderBookmarks()
    setStylePresetActive(presetId)
    if (preset.musicBarStyle !== undefined) {
      dispatchSettingsUpdated("musicBarStyle", preset.musicBarStyle)
    }
    if (preset.musicPlayerSkin !== undefined) {
      dispatchSettingsUpdated("musicPlayerSkin", preset.musicPlayerSkin)
    }
  }

  const updateTimerAlarmCustomUi = () => {
    const settings = getSettings()
    const customName = settings.timerCustomAlarmSoundName || ""
    const hasCustomSound = Boolean(settings.timerCustomAlarmSoundId)
    const selectedSound = settings.timerAlarmSound || DEFAULT_TIMER_ALARM_SOUND

    ;[
      DOM.timerAlarmSoundSelect,
      document.getElementById("timer-alarm-sound-widget"),
    ]
      .filter(Boolean)
      .forEach((select) => {
        renderTimerAlarmSelectOptions(
          select,
          selectedSound,
          settings,
          geti18n(),
        )
      })

    if (DOM.timerAlarmCustomName) {
      DOM.timerAlarmCustomName.textContent = hasCustomSound
        ? customName
        : i18n.timer_alarm_no_custom || "No custom sound uploaded"
      DOM.timerAlarmCustomName.classList.toggle("has-file", hasCustomSound)
    }
    if (DOM.timerAlarmSoundRemoveBtn) {
      DOM.timerAlarmSoundRemoveBtn.disabled = !hasCustomSound
    }
  }

  const setLanguageToolsOpen = (isOpen) => {
    DOM.languageToolsPanel?.classList.toggle("is-collapsed", !isOpen)
    DOM.languageToolsToggleBtn?.setAttribute("aria-expanded", String(isOpen))
    localStorage.setItem(LANGUAGE_TOOLS_OPEN_KEY, isOpen ? "1" : "0")
  }

  const renderCustomLanguageOptions = () => {
    if (!DOM.languageSelect) return
    DOM.languageSelect
      .querySelectorAll("option[data-custom-language='true']")
      .forEach((option) => option.remove())

    const customLanguages = getSettings().customLanguages || {}
    Object.entries(customLanguages).forEach(([code, item]) => {
      const option = document.createElement("option")
      option.value = code
      option.dataset.customLanguage = "true"
      option.textContent = item?.name ? `${item.name} (${code})` : code
      DOM.languageSelect.appendChild(option)
    })
    DOM.languageSelect.value = getSettings().language || "en"
    if (DOM.deleteCustomLanguageBtn) {
      DOM.deleteCustomLanguageBtn.hidden = !Boolean(
        customLanguages[DOM.languageSelect.value],
      )
    }
  }

  const getSelectedLanguageGuide = () => {
    const guide = getLanguageGuideOption(
      DOM.languageGuideTargetSelect?.value || "ja",
    )
    return {
      ...guide,
      code: DOM.languageCodeInput?.value.trim() || guide.code,
      name: DOM.languageNameInput?.value.trim() || guide.name,
    }
  }

  const syncLanguageGuideFields = () => {
    const guide = getLanguageGuideOption(
      DOM.languageGuideTargetSelect?.value || "ja",
    )
    if (DOM.languageCodeInput && !DOM.languageCodeInput.value.trim()) {
      DOM.languageCodeInput.value = guide.code
    }
    if (DOM.languageNameInput && !DOM.languageNameInput.value.trim()) {
      DOM.languageNameInput.value = guide.name
    }
  }

  const renderLanguageGuideOptions = () => {
    if (!DOM.languageGuideTargetSelect) return
    DOM.languageGuideTargetSelect.innerHTML = ""
    languageGuideOptions.forEach((option) => {
      const el = document.createElement("option")
      el.value = option.code
      el.textContent = `${option.name} - ${option.englishName}`
      DOM.languageGuideTargetSelect.appendChild(el)
    })
  }

  const applyLanguageGuideModalText = () => {
    const text = getLanguageGuideModalText(
      DOM.languageGuideTargetSelect?.value || "ja",
    )
    const modal = DOM.languageModal
    if (!modal) return

    const setByI18n = (key, value) => {
      const el = modal.querySelector(`[data-i18n="${key}"]`)
      if (el) el.textContent = value
    }
    const setPlaceholder = (key, value) => {
      const el = modal.querySelector(`[data-i18n-placeholder="${key}"]`)
      if (el) el.placeholder = value
    }

    setByI18n("language_modal_title", text.title)
    setByI18n("language_modal_intro", text.intro)
    setByI18n("language_modal_steps_title", text.stepsTitle)
    setByI18n("language_modal_ai_hint", text.aiHint)
    setByI18n("language_modal_step_1", text.step1)
    setByI18n("language_modal_step_2", text.step2)
    setByI18n("language_modal_step_3", text.step3)
    setByI18n("language_target_label", text.targetLabel)
    setByI18n("language_code_label", text.codeLabel)
    setByI18n("language_name_label", text.nameLabel)
    setByI18n("language_copy_ai_prompt", text.copyPrompt)
    setByI18n("language_install", text.install)
    setPlaceholder("language_code_placeholder", text.codePlaceholder)
    setPlaceholder("language_name_placeholder", text.namePlaceholder)
    setPlaceholder("language_json_placeholder", text.jsonPlaceholder)
  }

  const getLanguageTemplateText = async (guide) => {
    const template = await getEnglishLanguageTemplate()
    template.code = guide.code
    template.name = guide.name
    return JSON.stringify(template, null, 2)
  }

  const copyTextToClipboard = async (text) => {
    await copyText(text)
  }

  const openLanguageModal = () => {
    renderLanguageGuideOptions()
    syncLanguageGuideFields()
    DOM.languageModal?.classList.add("show")
    applyTranslations()
    applyLanguageGuideModalText()
  }

  const closeLanguageModal = () => {
    DOM.languageModal?.classList.remove("show")
  }

  const clearLanguageModalInputs = () => {
    const guide = getSelectedLanguageGuide()
    if (DOM.languageCodeInput) DOM.languageCodeInput.value = guide.code
    if (DOM.languageNameInput) DOM.languageNameInput.value = guide.name
    if (DOM.languageJsonInput) DOM.languageJsonInput.value = ""
  }

  const installCustomLanguage = async (payload) => {
    const validation = await validateCustomLanguagePayload(payload)
    const code = normalizeLanguageCode(
      DOM.languageCodeInput?.value || validation.code,
    )
    const name =
      DOM.languageNameInput?.value.trim() ||
      validation.name ||
      code.toUpperCase()

    if (!code) {
      showAlert(
        geti18n().language_invalid_code ||
          "Please enter a language code, such as es, ja, fr, or id.",
      )
      return
    }

    const customLanguages = {
      ...(getSettings().customLanguages || {}),
      [code]: {
        name,
        translations: validation.translations,
        updatedAt: new Date().toISOString(),
      },
    }

    updateSetting("customLanguages", customLanguages)
    handleSettingUpdate("language", code)
    renderCustomLanguageOptions()
    await loadLanguage(code)
    applyTranslations()
    clearLanguageModalInputs()
    closeLanguageModal()

    const missingNotice = validation.missingKeys.length
      ? ` ${validation.missingKeys.length} missing keys were filled from English.`
      : ""
    showAlert(
      `${geti18n().language_import_success || "Language installed successfully!"}${missingNotice}`,
    )
  }

  const deleteSelectedCustomLanguage = async () => {
    const code = DOM.languageSelect?.value
    const customLanguages = { ...(getSettings().customLanguages || {}) }
    const language = customLanguages[code]

    if (!code || !language) return

    const confirmed = await showConfirm(
      (
        geti18n().language_delete_confirm || 'Delete custom language "{name}"?'
      ).replace("{name}", language.name || code),
      geti18n().language_delete_custom || "Delete Custom Language",
    )
    if (!confirmed) return

    delete customLanguages[code]
    handleSettingUpdate("customLanguages", customLanguages)
    handleSettingUpdate("language", "en")
    renderCustomLanguageOptions()
    await loadLanguage("en")
    applyTranslations()
    populateUnsplashCollections(DOM.unsplashCategorySelect, getSettings())
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "language", value: "en" },
      }),
    )
    showAlert(geti18n().language_delete_success || "Custom language deleted.")
  }

  renderCustomLanguageOptions()
  setLanguageToolsOpen(localStorage.getItem(LANGUAGE_TOOLS_OPEN_KEY) === "1")

  const throttledUpdates = {}
  const throttledUndoBaselines = {}
  const lastUpdateTimes = {}
  let reqAnimFrame = null

  const throttleSettingUpdate = (key, value) => {
    markInterfaceStyleCustom(key)
    if (!Object.prototype.hasOwnProperty.call(throttledUndoBaselines, key)) {
      throttledUndoBaselines[key] = getSettings()[key]
    }
    const fastFeedbackKeys = [
      "bgBlur",
      "bgBrightness",
      "bgContrast",
      "bgSaturation",
      "bgFadeIn",
      "bgPositionX",
      "bgPositionY",
      "bgImageScale",
      "bookmarkFontSize",
      "bookmarkIconSize",
      "bookmarkGap",
      "bookmarkBgColor",
      "bookmarkBgOpacity",
      "bookmarkTextColor",
      "bookmarkGroupBgColor",
      "bookmarkGroupBgOpacity",
      "bookmarkGroupTextColor",
      "bookmarkGroupAutoTextContrast",
      "bookmarkGroupFontSize",
      "bookmarkGroupBorderRadius",
      "bookmarkGroupUseAccent",
      "bookmarkGroupKeepBgOnInteraction",
      "bookmarkGroupContainerBgHidden",
      "bookmarkGroupBorderHidden",
      "bookmarkShadowColor",
      "bookmarkShadowOpacity",
      "bookmarkShadowBlur",
      "bookmarkLayoutBgColor",
    ]
    const isFast = fastFeedbackKeys.includes(key)
    const delay = isFast ? 40 : 200

    const performFastCssUpdate = (k, v) => {
      // 1. Force state memory sync
      updateSetting(k, v)
      let settings = getSettings()

      // 2. Direct CSS override matching settingsApplier
      const hexToRgbFast = (hex) => {
        let res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return res
          ? {
              r: parseInt(res[1], 16),
              g: parseInt(res[2], 16),
              b: parseInt(res[3], 16),
            }
          : null
      }

      const rootStyle = document.documentElement.style
      const applyBookmarkGroupTextColor = () => {
        if (settings.bookmarkGroupAutoTextContrast === true) {
          const bgHex = settings.bookmarkGroupBgColor || "#ffffff"
          rootStyle.setProperty(
            "--bookmark-group-text-color",
            getContrastYIQ(bgHex) === "black" ? "#111827" : "#ffffff",
          )
          return
        }

        if (settings.bookmarkGroupTextColor) {
          rootStyle.setProperty(
            "--bookmark-group-text-color",
            settings.bookmarkGroupTextColor,
          )
        } else {
          rootStyle.removeProperty("--bookmark-group-text-color")
        }
      }
      if (k === "bookmarkFontSize")
        rootStyle.setProperty("--bookmark-font-size", `${v}px`)
      else if (k === "bookmarkIconSize")
        rootStyle.setProperty("--bookmark-icon-size", `${v}px`)
      else if (k === "bookmarkGap")
        rootStyle.setProperty("--bookmark-gap", `${v}px`)
      else if (k === "bookmarkBgColor" || k === "bookmarkBgOpacity") {
        let hex = settings.bookmarkBgColor || "#ffffff"
        let op = settings.bookmarkBgOpacity ?? 100
        let rgb = hexToRgbFast(hex)
        if (rgb && op < 100)
          rootStyle.setProperty(
            "--bookmark-bg-color",
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${op / 100})`,
          )
        else rootStyle.setProperty("--bookmark-bg-color", hex)
      } else if (k === "bookmarkTextColor") {
        if (v) rootStyle.setProperty("--bookmark-text-color", v)
        else rootStyle.removeProperty("--bookmark-text-color")
      } else if (
        k === "bookmarkGroupBgColor" ||
        k === "bookmarkGroupBgOpacity"
      ) {
        let hex = settings.bookmarkGroupBgColor || "transparent"
        let op = settings.bookmarkGroupBgOpacity ?? 0
        let rgb = hexToRgbFast(hex)
        document.body.classList.toggle(
          "bookmark-group-tab-bg-transparent",
          op <= 0,
        )
        if (hex !== "transparent" && rgb && op < 100)
          rootStyle.setProperty(
            "--bookmark-group-tab-bg",
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${op / 100})`,
          )
        else rootStyle.setProperty("--bookmark-group-tab-bg", hex)
        applyBookmarkGroupTextColor()
      } else if (k === "bookmarkGroupTextColor") {
        applyBookmarkGroupTextColor()
      } else if (k === "bookmarkGroupAutoTextContrast") {
        document.body.classList.toggle(
          "bookmark-group-auto-text-contrast",
          v === true,
        )
        applyBookmarkGroupTextColor()
      } else if (k === "bookmarkGroupFontSize") {
        rootStyle.setProperty("--bookmark-group-font-size", `${v}px`)
      } else if (k === "bookmarkGroupBorderRadius") {
        rootStyle.setProperty("--bookmark-group-border-radius", `${v}px`)
      } else if (
        k === "bookmarkShadowColor" ||
        k === "bookmarkShadowOpacity" ||
        k === "bookmarkShadowBlur"
      ) {
        let hex = settings.bookmarkShadowColor || "#000000"
        let op = settings.bookmarkShadowOpacity ?? 24
        let blur = settings.bookmarkShadowBlur ?? 8
        let rgb = hexToRgbFast(hex) || { r: 0, g: 0, b: 0 }
        let rgbaStr = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${op / 100})`
        rootStyle.setProperty(
          "--bookmark-box-shadow",
          `${rgbaStr} 0px 3px ${blur}px`,
        )
        rootStyle.setProperty(
          "--bookmark-icon-drop-shadow",
          `0px 2px ${Math.max(2, Math.round(blur / 2))}px ${rgbaStr}`,
        )
      } else if (k === "bookmarkLayoutBgColor") {
        rootStyle.setProperty("--bookmark-layout-bg", v)
      }
    }

    if (isFast) {
      if (reqAnimFrame) cancelAnimationFrame(reqAnimFrame)
      reqAnimFrame = requestAnimationFrame(() => {
        performFastCssUpdate(key, value)
      })

      if (throttledUpdates[key]) clearTimeout(throttledUpdates[key])
      throttledUpdates[key] = setTimeout(() => {
        handleSettingUpdate(key, value, false, true)
        saveSettings()
        delete throttledUndoBaselines[key]
        delete throttledUpdates[key]
      }, 500) // Heavy debounce (500ms) to ensure saving/re-rendering ONLY happens after dragging finishes completely
    } else {
      if (throttledUpdates[key]) clearTimeout(throttledUpdates[key])
      throttledUpdates[key] = setTimeout(() => {
        handleSettingUpdate(key, value)
        delete throttledUndoBaselines[key]
        delete throttledUpdates[key]
      }, delay)
    }
  }

  // Event delegation for style presets grid to support user custom style presets
  const stylePresetGrid = document.querySelector(".style-preset-grid")
  if (stylePresetGrid) {
    stylePresetGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".style-preset-btn")
      if (!btn) return

      // Ignore if clicking the delete button (handled separately)
      if (e.target.closest(".delete-style-btn")) return

      const presetId = btn.dataset.stylePreset
      if (!presetId) return

      const currentSettings = getSettings()
      const prevPreset = currentSettings.interfaceStylePreset || "custom"

      if (prevPreset === "custom") {
        STYLE_PRESETS.custom = {}
        const keysToTrack = Object.keys(STYLE_PRESETS.clean || {})
        keysToTrack.forEach(k => {
          STYLE_PRESETS.custom[k] = currentSettings[k]
        })
      }

      applyInterfaceStylePreset(presetId)

      const presetNames = {
        clean: "Clean",
        dock: "Dock",
        macos: "macOS",
        glass: "Glass",
        compact: "Compact",
        custom: "Custom",
      }
      const presetName = btn.querySelector(".style-preset-name")?.textContent || presetNames[presetId] || presetId
      showToast(`Style preset: ${presetName}`, {
        type: "success",
        undoFn: () => applyInterfaceStylePreset(prevPreset),
      })
    })
  }
  setStylePresetActive(getSettings().interfaceStylePreset || "custom")

  const blobToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })

  const dataUrlToBlob = (dataUrl) => {
    const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl)
    if (!match) {
      throw new Error("Invalid data URL")
    }

    const mimeType = match[1] || "application/octet-stream"
    const isBase64 = Boolean(match[2])
    const data = match[3] || ""
    const binary = isBase64 ? atob(data) : decodeURIComponent(data)
    const bytes = new Uint8Array(binary.length)

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }

    return new Blob([bytes], { type: mimeType })
  }

  const collectLocalMediaIds = (settingsSnapshot) => {
    const ids = new Set()

    const visit = (value) => {
      if (isIdbMedia(value)) {
        ids.add(value)
        return
      }

      if (Array.isArray(value)) {
        value.forEach(visit)
        return
      }

      if (value && typeof value === "object") {
        Object.values(value).forEach(visit)
      }
    }

    visit(settingsSnapshot)
    return [...ids]
  }

  const replaceLocalMediaIds = (value, mediaIdMap) => {
    if (typeof value === "string") {
      return mediaIdMap[value] || value
    }

    if (Array.isArray(value)) {
      return value.map((item) => replaceLocalMediaIds(item, mediaIdMap))
    }

    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, child]) => {
        value[key] = replaceLocalMediaIds(child, mediaIdMap)
      })
    }

    return value
  }

  const getBackgroundIdentity = (entry) => {
    if (typeof entry === "string") return entry
    if (!entry || typeof entry !== "object") return null
    return entry.id || entry.url || entry.thumb || entry.preview || null
  }

  const mergeUserBackgrounds = (currentBackgrounds, importedBackgrounds) => {
    const merged = Array.isArray(currentBackgrounds)
      ? [...currentBackgrounds]
      : []
    if (!Array.isArray(importedBackgrounds)) return merged

    const seen = new Set(merged.map(getBackgroundIdentity).filter(Boolean))
    importedBackgrounds.forEach((entry) => {
      const dedupeKey = getBackgroundIdentity(entry)
      if (dedupeKey && seen.has(dedupeKey)) return
      merged.push(entry)
      if (dedupeKey) seen.add(dedupeKey)
    })

    return merged
  }

  const SAVED_GALLERY_KEYS = [
    "userColors",
    "userAccentColors",
    "userGradients",
    "userMultiColors",
    "userSvgWaves",
    "userGradientV2s",
    "userSilks",
    "userLightPillars",
    "userLiquidEthers",
    "userSavedFonts",
    "userThemes",
  ]

  const stablePresetIdentity = (value) => {
    if (typeof value === "string") return value.trim().toLowerCase()
    if (!value || typeof value !== "object") return JSON.stringify(value)

    const normalize = (item) => {
      if (Array.isArray(item)) return item.map(normalize)
      if (!item || typeof item !== "object") return item

      return Object.keys(item)
        .filter((key) => !["id", "uid", "createdAt", "updatedAt"].includes(key))
        .sort()
        .reduce((output, key) => {
          output[key] = normalize(item[key])
          return output
        }, {})
    }

    return JSON.stringify(normalize(value))
  }

  const mergePresetArray = (currentItems, importedItems) => {
    const merged = Array.isArray(currentItems) ? [...currentItems] : []
    if (!Array.isArray(importedItems)) return merged

    const seen = new Set(merged.map(stablePresetIdentity))
    importedItems.forEach((item) => {
      const dedupeKey = stablePresetIdentity(item)
      if (seen.has(dedupeKey)) return
      merged.push(item)
      seen.add(dedupeKey)
    })

    return merged
  }

  const mergeSavedGallerySettings = (currentSettings, importedSettings) => {
    if (Array.isArray(importedSettings.userBackgrounds)) {
      importedSettings.userBackgrounds = mergeUserBackgrounds(
        currentSettings.userBackgrounds,
        importedSettings.userBackgrounds,
      )
    }

    SAVED_GALLERY_KEYS.forEach((key) => {
      if (!Array.isArray(importedSettings[key])) return
      importedSettings[key] = mergePresetArray(
        currentSettings[key],
        importedSettings[key],
      )
    })
  }



  // Sidebar toggle and close
  DOM.settingsToggle.addEventListener("click", () =>
    DOM.settingsSidebar.classList.add("open"),
  )
  DOM.closeSettings.addEventListener("click", () =>
    DOM.settingsSidebar.classList.remove("open"),
  )

  const btnDonate = document.getElementById("donate-trigger-btn")
  const modDonate = document.getElementById("donate-modal")
  const closeDonate = document.getElementById("close-donate-modal")
  const closeDonateBtn = document.getElementById("close-donate-modal-btn")
  const showMomo = document.getElementById("show-momo-qr-btn")
  const momoQr = document.getElementById("momo-qr-container")

  if (btnDonate) {
    btnDonate.addEventListener("click", () => {
      if (modDonate) modDonate.classList.add("open")
      if (momoQr) momoQr.style.display = "none"
    })
  }
  const handleCloseDonate = () => {
    if (modDonate) modDonate.classList.remove("open")
  }
  if (closeDonate) closeDonate.addEventListener("click", handleCloseDonate)
  if (closeDonateBtn)
    closeDonateBtn.addEventListener("click", handleCloseDonate)
  if (showMomo) {
    showMomo.addEventListener("click", (e) => {
      e.stopPropagation()
      if (momoQr)
        momoQr.style.display =
          momoQr.style.display === "none" ? "block" : "none"
    })
  }

  // Handle closing of various popups/modals
  window.addEventListener("click", (e) => {
    // Close Donate Modal
    if (modDonate && e.target === modDonate) {
      modDonate.classList.remove("open")
    }

    // Close MoMo QR if clicking outside or on the QR itself
    if (momoQr && momoQr.style.display === "block") {
      momoQr.style.display = "none"
    }

    // Close Bug Report Modal
    const bugModal = document.getElementById("bug-report-modal")
    if (bugModal && e.target === bugModal) {
      bugModal.classList.remove("open")
    }
  })
  document.addEventListener("click", (e) => {
    if (document.body.classList.contains("first-run-tour-active")) return
    if (
      !DOM.settingsSidebar.contains(e.target) &&
      !DOM.settingsToggle.contains(e.target)
    ) {
      DOM.settingsSidebar.classList.remove("open")
    }
  })

  // Sidebar scroll management
  const sidebarContent = DOM.settingsSidebar.querySelector(".sidebar-content")
  const sidebarScrollTopBtn = document.getElementById("sidebar-scroll-top")
  const SIDEBAR_SCROLL_KEY = "settingsSidebarScroll"

  const navEntry = performance.getEntriesByType("navigation")[0]
  if (navEntry && navEntry.type === "reload") {
    sessionStorage.removeItem(SIDEBAR_SCROLL_KEY)
  } else {
    const savedScroll = sessionStorage.getItem(SIDEBAR_SCROLL_KEY)
    if (savedScroll) sidebarContent.scrollTop = parseInt(savedScroll, 10)
  }

  sidebarContent.addEventListener("scroll", () => {
    const top = sidebarContent.scrollTop
    sessionStorage.setItem(SIDEBAR_SCROLL_KEY, top)
    sidebarScrollTopBtn.classList.toggle("visible", top > 200)
  })

  sidebarScrollTopBtn.addEventListener("click", () => {
    sidebarContent.scrollTo({ top: 0, behavior: "smooth" })
  })

  // Bug Report / Config Logic
  const bugReportBtn = document.getElementById("bug-report-btn")
  const bugModal = document.getElementById("bug-report-modal")
  const closeBugBtn = document.getElementById("close-bug-modal-btn")
  const bugTextarea = document.getElementById("bug-config-data")
  const copyBugBtn = document.getElementById("copy-bug-config-btn")
  const bugLink = document.getElementById("bug-report-link")

  if (bugReportBtn && bugModal) {
    bugReportBtn.addEventListener("click", () => {
      const extensionVersion =
        document.querySelector(".settings-version")?.textContent || "Unknown"

      const info = {
        version: extensionVersion,
        browser: navigator.userAgent,
      }

      bugTextarea.value = [
        `Version: ${info.version}`,
        `Browser: ${info.browser}`,
      ].join("\n")

      if (bugLink) {
        bugLink.href = "#"
      }

      bugModal.classList.add("open")
    })

    closeBugBtn?.addEventListener("click", () =>
      bugModal.classList.remove("open"),
    )

    // Close on click outside
    window.addEventListener("click", (e) => {
      if (bugModal && e.target === bugModal) bugModal.classList.remove("open")
    })

    copyBugBtn?.addEventListener("click", async () => {
      bugTextarea.select()
      try {
        await copyText(bugTextarea.value)
        const originalText = copyBugBtn.innerHTML
        copyBugBtn.innerHTML =
          '<i class="fa-solid fa-check"></i> <span>Copied!</span>'
        setTimeout(() => {
          copyBugBtn.innerHTML = originalText
        }, 2000)
      } catch (e) {
        console.warn("Failed to copy bug report", e)
      }
    })

    bugLink?.addEventListener("click", async (event) => {
      event.preventDefault()
      const i18n = geti18n()
      const selectedLanguage = await showChoiceConfirm(
        [
          {
            key: "vi",
            label: "Tiếng Việt",
            description:
              i18n.bug_report_language_vi_desc ||
              "Mở form báo lỗi bằng tiếng Việt.",
            icon: "fa-solid fa-language",
          },
          {
            key: "en",
            label: "English",
            description:
              i18n.bug_report_language_en_desc ||
              "Open the English bug report form.",
            icon: "fa-solid fa-globe",
          },
        ],
        i18n.bug_report_language_title || "Choose report language",
        i18n.bug_report_language_prompt ||
          "Which language do you want to use for the bug report form?",
      )

      if (!selectedLanguage) return
      const formUrl = BUG_REPORT_FORM_URLS[selectedLanguage] || BUG_REPORT_FORM_URLS.en
      window.open(formUrl, "_blank", "noopener,noreferrer")
    })
  }

  // Table of Contents (ToC) Logic
  const initSidebarToC = () => {
    const tocToggle = DOM.sidebarTocToggle
    const tocMenu = DOM.sidebarTocMenu
    if (!tocToggle || !tocMenu) return

    const populateToC = () => {
      tocMenu.innerHTML = ""

      const queryStr = [
        ".settings-section",
        "#page-title-input",
        "#language-select",
        "#accent-color-group",
        "#svg-wave-group",
      ].join(", ")

      const elList = Array.from(sidebarContent.querySelectorAll(queryStr)).map(
        (el) => {
          if (el.tagName === "INPUT" || el.tagName === "SELECT") {
            return el.closest(".setting-group")
          }
          return el
        },
      )

      // Remove duplicates
      const sections = [...new Set(elList)].filter(Boolean)
      const addedTitles = new Set()

      sections.forEach((section) => {
        let title = ""
        let iconClass = ""
        let isSubItem = false

        if (section.classList.contains("settings-section")) {
          // Main Section Title
          const toggle = section.querySelector(".section-toggle")
          if (toggle) {
            title = toggle.textContent.trim()
            const icon = toggle.querySelector("i")
            if (icon) iconClass = icon.className
          }
        } else {
          // Sub Items (Effect, Page Title, etc)
          isSubItem = true
          const header = section.querySelector(".group-header")
          const label = section.querySelector(":scope > label")
          const settingLabel = section.querySelector(":scope > .setting-label")

          if (header) {
            const span = header.querySelector("span[data-i18n]")
            title = span ? span.textContent.trim() : header.textContent.trim()
            const icon = header.querySelector("i.group-icon")
            if (icon) iconClass = icon.className
          } else if (label) {
            const span = label.querySelector("span[data-i18n]")
            title = span ? span.textContent.trim() : label.textContent.trim()
            const icon = label.querySelector("i")
            if (icon) iconClass = icon.className
          } else if (settingLabel) {
            const span = settingLabel.querySelector("span[data-i18n]")
            title = span
              ? span.textContent.trim()
              : settingLabel.textContent.trim()
            const icon = settingLabel.querySelector("i")
            if (icon) iconClass = icon.className
          }
        }

        if (title && !addedTitles.has(title)) {
          addedTitles.add(title)
          const item = document.createElement("div")
          item.className = "toc-item"
          if (isSubItem) {
            item.style.fontSize = "0.85rem"
            item.style.opacity = "0.8"
          }
          item.innerHTML = `<i class="${iconClass || "fa-solid fa-chevron-right"}"></i> <span>${title}</span>`
          item.addEventListener("click", () => {
            // 1) Expand parent section if collapsed
            const parentSection = section.closest(".settings-section")
            if (
              parentSection &&
              parentSection.classList.contains("collapsed")
            ) {
              parentSection.classList.remove("collapsed")
              const sectionId = parentSection.dataset.sectionId
              if (sectionId) {
                const sectionStates = JSON.parse(
                  localStorage.getItem("settingsSectionStates") || "{}",
                )
                sectionStates[sectionId] = false
                localStorage.setItem(
                  "settingsSectionStates",
                  JSON.stringify(sectionStates),
                )
              }
            }

            // 2) Expand the item itself if it's a collapsible group (e.g. Effect)
            if (
              section.classList.contains("collapsible-group") &&
              !section.classList.contains("expanded")
            ) {
              section.classList.add("expanded")
              const groupId = section.id || section.dataset.groupId
              if (groupId) {
                localStorage.setItem(`settingsGroupExpanded:${groupId}`, "1")
              }
            }

            // 3) Calculate precise scroll pixel after DOM has re-laid out
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                const sidebarRect = sidebarContent.getBoundingClientRect()
                const sectionRect = section.getBoundingClientRect()
                const targetPixel =
                  sectionRect.top -
                  sidebarRect.top +
                  sidebarContent.scrollTop -
                  10

                sidebarContent.scrollTo({
                  top: targetPixel,
                  behavior: "smooth",
                })
              })
            })

            tocMenu.classList.remove("open")
            tocToggle.classList.remove("active")
          })
          tocMenu.appendChild(item)
        }
      })
    }

    tocToggle.addEventListener("click", (e) => {
      e.stopPropagation()
      const isOpen = tocMenu.classList.toggle("open")
      tocToggle.classList.toggle("active", isOpen)
      if (isOpen) populateToC()
    })

    document.addEventListener("click", (e) => {
      if (!tocMenu.contains(e.target) && !tocToggle.contains(e.target)) {
        tocMenu.classList.remove("open")
        tocToggle.classList.remove("active")
      }
    })
  }

  initSidebarToC()

  // Section collapse/expand state
  const SECTION_STATE_KEY = "settingsSectionStates"
  const sectionStates = JSON.parse(
    localStorage.getItem(SECTION_STATE_KEY) || "{}",
  )
  document.querySelectorAll(".section-toggle").forEach((toggle) => {
    const section = toggle.parentElement
    const sectionId = section.dataset.sectionId
    if (sectionId && sectionStates[sectionId] !== undefined) {
      section.classList.toggle("collapsed", sectionStates[sectionId])
    } else {
      section.classList.add("collapsed")
    }
    toggle.addEventListener("click", () => {
      const isCollapsed = section.classList.toggle("collapsed")
      if (sectionId) {
        sectionStates[sectionId] = isCollapsed
        localStorage.setItem(SECTION_STATE_KEY, JSON.stringify(sectionStates))
      }
    })
  })

  // Card collapse/expand logic
  document.querySelectorAll(".bg-control-title, .gradient-v2-section-title").forEach((title) => {
    title.addEventListener("click", () => {
      const card = title.closest(".bg-control-card, .gradient-v2-panel")
      if (card) {
        card.classList.toggle("is-collapsed")
      }
    })
  })
  // Language change
  DOM.languageSelect.addEventListener("change", async () => {
    handleSettingUpdate("language", DOM.languageSelect.value)
    syncUninstallSurveyLanguage(DOM.languageSelect.value)
    renderCustomLanguageOptions()
    await loadLanguage(getSettings().language)
    applyTranslations()
    updateTimerAlarmCustomUi()
    window.dispatchEvent(
      new CustomEvent("startpage:languageChanged", {
        detail: { language: DOM.languageSelect.value },
      }),
    )
    populateUnsplashCollections(DOM.unsplashCategorySelect, getSettings())
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "language", value: DOM.languageSelect.value },
      }),
    )
  })

  DOM.languageToolsToggleBtn?.addEventListener("click", () => {
    const nextIsOpen =
      DOM.languageToolsPanel?.classList.contains("is-collapsed")
    setLanguageToolsOpen(Boolean(nextIsOpen))
  })

  DOM.deleteCustomLanguageBtn?.addEventListener(
    "click",
    deleteSelectedCustomLanguage,
  )

  DOM.languageHelpBtn?.addEventListener("click", openLanguageModal)
  DOM.closeLanguageModalBtn?.addEventListener("click", closeLanguageModal)
  DOM.languageModal?.addEventListener("click", (event) => {
    if (event.target === DOM.languageModal) closeLanguageModal()
  })
  DOM.languageGuideTargetSelect?.addEventListener("change", () => {
    const guide = getLanguageGuideOption(DOM.languageGuideTargetSelect.value)
    if (DOM.languageCodeInput) DOM.languageCodeInput.value = guide.code
    if (DOM.languageNameInput) DOM.languageNameInput.value = guide.name
    applyLanguageGuideModalText()
  })

  DOM.copyLanguagePromptBtn?.addEventListener("click", async () => {
    const guide = getSelectedLanguageGuide()
    const prompt = [
      `Translate this Startpage language JSON into ${guide.nativePromptName}.`,
      "Rules:",
      "1. Keep every JSON key exactly the same.",
      "2. Translate string values only.",
      "3. Keep placeholders such as {count}, {name}, URLs, HTML tags, emoji, and keyboard shortcuts unchanged.",
      "4. Return valid JSON only, no Markdown.",
      `5. Use this wrapper format: {"code":"${guide.code}","name":"${guide.name}","translations":{...}}.`,
      "6. Translate UI text naturally for a browser extension settings page.",
      "",
      await getLanguageTemplateText(guide),
    ].join("\n")

    try {
      await copyTextToClipboard(prompt)
      showAlert(
        geti18n().language_prompt_copied ||
          "AI translation prompt copied. Send it to AI, then paste the translated JSON here.",
      )
    } catch (e) {
      showAlert(geti18n().language_copy_failed || "Could not copy prompt.")
    }
  })

  DOM.installLanguageJsonBtn?.addEventListener("click", async () => {
    try {
      const text = DOM.languageJsonInput?.value.trim()
      if (!text) {
        showAlert(
          geti18n().language_empty_json || "Paste translated JSON first.",
        )
        return
      }
      await installCustomLanguage(JSON.parse(text))
    } catch (e) {
      showAlert(
        `${geti18n().language_invalid_json || "Invalid language JSON."}\n${e.message || ""}`,
      )
    }
  })

  // Background inputs
  const normalizeBackgroundInput = (value) => {
    const trimmed = String(value || "").trim()
    const cssUrlMatch = trimmed.match(/^url\(\s*(['"]?)(.*?)\1\s*\)$/i)
    return cssUrlMatch ? cssUrlMatch[2].trim() : trimmed
  }

  const isRemoteVideoBackground = (value) =>
    /\.(mp4|webm|mov|ogg)(?:[?#].*)?$/i.test(value) ||
    value.includes("googlevideo")

  const preloadRemoteImageBackground = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(url)
      img.onerror = () => reject(new Error("Failed to load background URL"))
      img.src = url
    })

  DOM.bgInput.addEventListener("change", async () => {
    const background = normalizeBackgroundInput(DOM.bgInput.value)
    DOM.bgInput.value = background
    if (
      /^https?:\/\//i.test(background) &&
      !isRemoteVideoBackground(background)
    ) {
      try {
        await preloadRemoteImageBackground(background)
      } catch {
        showAlert("Could not load that image URL.")
        return
      }
    }
    handleSettingUpdate("background", background)
  })
  DOM.bgColorPicker.addEventListener("input", () => {
    DOM.bgInput.value = DOM.bgColorPicker.value
    handleSettingUpdate("background", DOM.bgColorPicker.value)
  })

  // Unsplash
  let lastUnsplashPhoto = null
  const unsplashSaveBtn = document.getElementById("unsplash-save-bg-btn")

  DOM.unsplashRandomBtn.addEventListener("click", async () => {
    lastUnsplashPhoto = await setUnsplashRandomBackground(
      DOM.unsplashRandomBtn,
      DOM.unsplashCategorySelect,
      handleSettingUpdate,
    )
    if (lastUnsplashPhoto && unsplashSaveBtn) {
      unsplashSaveBtn.disabled = false
    }
  })

  DOM.unsplashRandomBtn.addEventListener("keydown", async (e) => {
    if (e.code === "Space") {
      e.preventDefault()
      lastUnsplashPhoto = await setUnsplashRandomBackground(
        DOM.unsplashRandomBtn,
        DOM.unsplashCategorySelect,
        handleSettingUpdate,
      )
      if (lastUnsplashPhoto && unsplashSaveBtn) {
        unsplashSaveBtn.disabled = false
      }
    }
  })

  if (unsplashSaveBtn) {
    const getBackgroundSnapshot = (settings) => ({
      bgBlur: settings.bgBlur ?? 0,
      bgBrightness: settings.bgBrightness ?? 100,
      bgContrast: settings.bgContrast ?? 100,
      bgSaturation: settings.bgSaturation ?? 100,
      bgFadeIn: settings.bgFadeIn ?? 0.5,
      bgPositionX: settings.bgPositionX ?? 50,
      bgPositionY: settings.bgPositionY ?? 50,
      bgSize: settings.bgSize || "cover",
      bgImageScale: settings.bgImageScale ?? 100,
    })

    const isUnsplashBackground = (value) =>
      typeof value === "string" &&
      (value.startsWith("idb-img-unsplash") ||
        value.includes("images.unsplash.com"))

    unsplashSaveBtn.addEventListener("click", async () => {
      const settings = getSettings()
      const currentBg = settings.background

      if (!currentBg || !isUnsplashBackground(currentBg)) {
        showAlert("No Unsplash background to save!")
        return
      }

      const i18n = geti18n()
      const originalHtml = unsplashSaveBtn.innerHTML
      unsplashSaveBtn.disabled = true
      unsplashSaveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>${i18n.settings_saving || "Saving..."}</span>`

      let savedBgId = currentBg
      if (!currentBg.startsWith("idb-img-unsplash")) {
        try {
          const res = await fetch(currentBg)
          if (!res.ok) throw new Error(`Image download failed: ${res.status}`)
          const blob = await res.blob()
          savedBgId = await saveImage(blob, `idb-img-unsplash-${Date.now()}`)
        } catch (err) {
          console.error("Failed to save Unsplash background:", err)
          unsplashSaveBtn.disabled = false
          unsplashSaveBtn.innerHTML = originalHtml
          showAlert("Failed to save Unsplash background.")
          return
        }
      }

      const authorName =
        lastUnsplashPhoto?.user?.name ||
        settings.unsplashLastCredit?.authorName ||
        "Unsplash"
      const newBg = {
        uid: "bg-" + Date.now(), // Unique entry ID
        id: savedBgId, // Source image ID
        authorName: authorName,
        type: "image",
        date: new Date().toISOString(),
        photoUrl:
          lastUnsplashPhoto?.links?.html ||
          settings.unsplashLastCredit?.photoUrl ||
          "",
        authorUrl:
          lastUnsplashPhoto?.user?.links?.html ||
          settings.unsplashLastCredit?.authorUrl ||
          "",
        settings: getBackgroundSnapshot(settings),
      }

      settings.userBackgrounds = settings.userBackgrounds || []

      // Check if image already exists in gallery (match by source image ID)
      const exists = settings.userBackgrounds.some((bg) => {
        if (typeof bg === "object") {
          return (
            bg.id === savedBgId ||
            (newBg.photoUrl && bg.photoUrl === newBg.photoUrl)
          )
        }
        return bg === savedBgId
      })
      if (exists) {
        showAlert(
          geti18n().alert_bg_exists ||
            "This background is already in your gallery!",
        )
        unsplashSaveBtn.disabled = true
        unsplashSaveBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>${i18n.settings_unsplash_saved || "Saved"}</span>`
        return
      }

      settings.userBackgrounds.push(newBg)
      const showedPerformanceWarning =
        maybeShowLocalBackgroundPerformanceWarning(settings.userBackgrounds.length)
      saveSettings()
      if (savedBgId !== currentBg) {
        updateSetting("unsplashLastCredit", {
          photoUrl: newBg.photoUrl,
          authorName: newBg.authorName,
          authorUrl: newBg.authorUrl,
        })
        await handleSettingUpdate("background", savedBgId)
      }
      renderLocalBackgrounds(DOM, handleSettingUpdate)
      if (!showedPerformanceWarning) {
        showAlert(geti18n().alert_bg_saved || "Background saved to Local Themes!")
      }

      // Allow saving again (e.g. if they change blur/brightness)
      unsplashSaveBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>${i18n.settings_unsplash_saved || "Saved"}</span>`
      setTimeout(() => {
        unsplashSaveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>${i18n.settings_unsplash_save || "Save Background"}</span>`
        unsplashSaveBtn.disabled = false
      }, 2000)
    })
  }

  DOM.unsplashCategorySelect.addEventListener("change", () => {
    handleSettingUpdate("unsplashCategory", DOM.unsplashCategorySelect.value)
  })

  if (DOM.unsplashAutoRandomSelect) {
    DOM.unsplashAutoRandomSelect.addEventListener("change", () => {
      handleSettingUpdate("unsplashAutoRandomMode", DOM.unsplashAutoRandomSelect.value)
    })
  }

  // ─── Picsum Photos (No API Key) ─────────────────────────────────────────
  const picsumRandomBtn = document.getElementById("picsum-random-btn")
  const picsumSaveBtn = document.getElementById("picsum-save-btn")
  const picsumCreditEl = document.getElementById("picsum-credit")
  const picsumCategorySelect = document.getElementById("picsum-category-select")
  let _lastPicsumResult = null

  if (picsumRandomBtn) {
    picsumRandomBtn.addEventListener("click", async () => {
      const themeKey = picsumCategorySelect?.value || "random"
      const originalHtml = picsumRandomBtn.innerHTML
      picsumRandomBtn.disabled = true
      picsumRandomBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Loading...</span>`
      if (picsumCreditEl) picsumCreditEl.textContent = ""
      try {
        const result = await getPicsumRandomBackground(themeKey)
        await preloadPicsumImage(result.imageUrl)
        _lastPicsumResult = result

        // Apply as background
        await handleSettingUpdate("background", result.imageUrl)

        // Show credit info
        if (picsumCreditEl) {
          const info = result.info
          if (info) {
            const authorLink = info.url ? `<a href="${info.url}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">${info.author || "Unknown"}</a>` : (info.author || "Unknown")
            picsumCreditEl.innerHTML = `📷 ${authorLink} · <a href="https://picsum.photos" target="_blank" rel="noopener" style="color:inherit;opacity:0.7;">picsum.photos</a>`
          } else {
            picsumCreditEl.innerHTML = `Photo via <a href="https://picsum.photos" target="_blank" rel="noopener" style="color:inherit;opacity:0.7;">picsum.photos</a>`
          }
        }

        if (picsumSaveBtn) picsumSaveBtn.disabled = false
      } catch (err) {
        console.error("Picsum fetch failed:", err)
        showAlert("Failed to load free photo. Check your internet connection.")
      } finally {
        picsumRandomBtn.disabled = false
        picsumRandomBtn.innerHTML = originalHtml
      }
    })
  }

  if (picsumSaveBtn) {
    picsumSaveBtn.addEventListener("click", async () => {
      const settings = getSettings()
      const currentBg = settings.background
      if (!currentBg || !currentBg.includes("picsum.photos")) {
        showAlert("No Picsum photo to save!")
        return
      }
      const originalHtml = picsumSaveBtn.innerHTML
      picsumSaveBtn.disabled = true
      picsumSaveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Saving...</span>`
      try {
        const res = await fetch(currentBg)
        if (!res.ok) throw new Error(`Image download failed: ${res.status}`)
        const blob = await res.blob()
        const savedId = await saveImage(blob, `idb-img-picsum-${Date.now()}`)
        const info = _lastPicsumResult?.info
        const newBg = {
          uid: "bg-" + Date.now(),
          id: savedId,
          authorName: info?.author || "Picsum",
          type: "image",
          date: new Date().toISOString(),
          photoUrl: info?.url || "https://picsum.photos",
          authorUrl: info?.url || "",
          settings: {},
        }
        settings.userBackgrounds = settings.userBackgrounds || []
        const exists = settings.userBackgrounds.some((bg) => {
          if (typeof bg === "object") return bg.id === savedId
          return bg === savedId
        })
        if (exists) {
          showAlert("This background is already in your gallery!")
          picsumSaveBtn.disabled = true
          picsumSaveBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Already saved</span>`
          return
        }
        settings.userBackgrounds.push(newBg)
        saveSettings()
        await handleSettingUpdate("background", savedId)
        renderLocalBackgrounds(DOM, handleSettingUpdate)
        showAlert("Photo saved to your Local Gallery!")
        picsumSaveBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Saved!</span>`
        setTimeout(() => {
          picsumSaveBtn.innerHTML = `<i class="fa-solid fa-download"></i> <span>Save to Gallery</span>`
          picsumSaveBtn.disabled = false
        }, 2000)
      } catch (err) {
        console.error("Picsum save failed:", err)
        showAlert("Failed to save photo.")
        picsumSaveBtn.disabled = false
        picsumSaveBtn.innerHTML = originalHtml
      }
    })
  }

  // ─── Local Gallery Random ───────────────────────────────────────────────
  const localRandomBtn = document.getElementById("local-random-btn")
  const localRandomFavBtn = document.getElementById("local-random-fav-btn")
  const localAutoRandomSelect = document.getElementById("local-auto-random-select")

  function pickRandomLocalBg(favoritesOnly = false) {
    const settings = getSettings()
    const userBackgrounds = settings.userBackgrounds || []
    const pool = favoritesOnly
      ? userBackgrounds.filter((bg) => (typeof bg === "object" ? bg.isFavorite : false))
      : userBackgrounds
    if (!pool.length) {
      showAlert(favoritesOnly ? "No favorites found! Star some images first." : "No local images saved yet!")
      return
    }
    const current = settings.background
    const fresh = pool.filter((bg) => {
      const id = typeof bg === "object" ? bg.id : bg
      return id !== current
    })
    const pickFrom = fresh.length ? fresh : pool
    const picked = pickFrom[Math.floor(Math.random() * pickFrom.length)]
    const bgId = typeof picked === "object" ? picked.id : picked
    handleSettingUpdate("background", bgId)
  }

  if (localRandomBtn) {
    localRandomBtn.addEventListener("click", () => pickRandomLocalBg(false))
  }
  if (localRandomFavBtn) {
    localRandomFavBtn.addEventListener("click", () => pickRandomLocalBg(true))
  }
  if (localAutoRandomSelect) {
    const savedLocalAutoMode = getSettings().localAutoRandomMode || "off"
    localAutoRandomSelect.value = savedLocalAutoMode
    localAutoRandomSelect.addEventListener("change", () => {
      handleSettingUpdate("localAutoRandomMode", localAutoRandomSelect.value)
    })
  }

  if (DOM.unsplashAccessKeyInput) {
    DOM.unsplashAccessKeyInput.addEventListener("input", () => {
      handleSettingUpdate(
        "unsplashAccessKey",
        DOM.unsplashAccessKeyInput.value.trim(),
      )
    })

    // Eye icon toggle for Unsplash key
    const toggleBtn = document.getElementById("toggle-unsplash-key")
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const type =
          DOM.unsplashAccessKeyInput.getAttribute("type") === "password"
            ? "text"
            : "password"
        DOM.unsplashAccessKeyInput.setAttribute("type", type)
        const icon = toggleBtn.querySelector("i")
        if (icon) {
          icon.className =
            type === "password" ? "fa-solid fa-eye" : "fa-solid fa-eye-slash"
        }
      })
    }
  }

  // Unsplash Search & Shortcuts
  const unsplashSearchBtn = document.getElementById("unsplash-search-btn")
  const unsplashSearchInput = document.getElementById("unsplash-search-input")
  const unsplashLatestBtn = document.getElementById("unsplash-latest-btn")
  const unsplashPopularBtn = document.getElementById("unsplash-popular-btn")

  if (unsplashSearchBtn && unsplashSearchInput) {
    const handleSearch = () => {
      const query = unsplashSearchInput.value.trim()
      if (query) {
        openUnsplashExplorer("search", query)
      } else {
        showAlert(i18n.alert_missing_fields || "Please enter a search query.")
      }
    }

    unsplashSearchBtn.addEventListener("click", handleSearch)
    unsplashSearchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleSearch()
    })
  }

  if (unsplashLatestBtn) {
    unsplashLatestBtn.addEventListener("click", () =>
      openUnsplashExplorer("latest"),
    )
  }

  if (unsplashPopularBtn) {
    unsplashPopularBtn.addEventListener("click", () =>
      openUnsplashExplorer("popular"),
    )
  }

  // Unsplash Explorer Modal
  const explorerModal = document.getElementById("unsplash-explorer-modal")
  const closeExplorerBtn = document.getElementById(
    "close-unsplash-explorer-btn",
  )
  const loadMoreExplorerBtn = document.getElementById(
    "unsplash-explorer-load-more",
  )

  if (closeExplorerBtn) {
    closeExplorerBtn.addEventListener("click", () => minimizeUnsplashExplorer())
  }

  if (loadMoreExplorerBtn) {
    loadMoreExplorerBtn.addEventListener("click", () => {
      loadMoreExplorer()
    })
  }

  if (explorerModal) {
    window.addEventListener("click", (e) => {
      if (e.target === explorerModal) minimizeUnsplashExplorer()
    })
  }

  // Save custom color
  DOM.saveColorBtn.addEventListener("click", () => {
    const settings = getSettings()
    const color = DOM.bgInput.value.trim()

    if (!color) {
      showAlert("Please select or enter a color first!")
      return
    }

    if (color.match(/^#([0-9a-f]{3}){1,2}$/i)) {
      if (!settings.userColors.includes(color)) {
        if (settings.userColors.length >= 10) {
          showAlert("You can only save up to 10 custom colors.")
          return
        }
        settings.userColors.push(color)
        saveSettings()
        renderUserColors(DOM)
        updateSettingsInputs()
      }
    } else {
      showAlert("Please enter a valid hex color code (e.g., #ff0000).")
    }
  })

  // Remove background / reset Unsplash credit
  DOM.removeBgBtn.addEventListener("click", () => {
    handleSettingUpdate("background", null)
    updateSetting("unsplashLastCredit", null)
    saveSettings()
    if (DOM.unsplashCredit) DOM.unsplashCredit.style.display = "none"
  })

  // Accent color
  const updateAccentHexInput = (color) => {
    if (DOM.accentColorHexInput) {
      DOM.accentColorHexInput.value = color.toUpperCase()
    }
  }

  const previewDefaultAccent = (color) => {
    const root = document.documentElement
    const rgb = hexToRgb(color)

    root.style.setProperty("--accent-color", color)
    root.style.setProperty("--accent-color-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`)
    root.style.setProperty("--accent-contrast-color", getContrastYIQ(color))
    root.style.setProperty("--safe-accent", color)
  }

  const previewMaterialAccent = (color) => {
    const scheme = buildMaterial3Scheme(
      color,
      getSettings().m3PaletteStyle || "tonalSpot",
    )
    const root = document.documentElement
    const tokens = {
      "--m3-seed": scheme.seed,
      "--m3-primary": scheme.primary,
      "--m3-on-primary": scheme.onPrimary,
      "--m3-primary-container": scheme.primaryContainer,
      "--m3-on-primary-container": scheme.onPrimaryContainer,
      "--m3-secondary": scheme.secondary,
      "--m3-on-secondary": scheme.onSecondary,
      "--m3-secondary-container": scheme.secondaryContainer,
      "--m3-on-secondary-container": scheme.onSecondaryContainer,
      "--m3-tertiary": scheme.tertiary,
      "--m3-on-tertiary": scheme.onTertiary,
      "--m3-tertiary-container": scheme.tertiaryContainer,
      "--m3-on-tertiary-container": scheme.onTertiaryContainer,
      "--m3-surface": scheme.surface,
      "--m3-on-surface": scheme.onSurface,
      "--m3-surface-container-low": scheme.surfaceContainerLow,
      "--m3-surface-container": scheme.surfaceContainer,
      "--m3-surface-container-high": scheme.surfaceContainerHigh,
      "--m3-surface-variant": scheme.surfaceVariant,
      "--m3-on-surface-variant": scheme.onSurfaceVariant,
      "--m3-outline": scheme.outline,
      "--m3-outline-variant": scheme.outlineVariant,
      "--m3-inverse-surface": scheme.inverseSurface,
      "--m3-inverse-on-surface": scheme.inverseOnSurface,
      "--m3-inverse-primary": scheme.inversePrimary,
      "--m3-surface-tint": scheme.surfaceTint,
      "--m3-primary-rgb": scheme.primaryRgb,
    }

    Object.entries(tokens).forEach(([token, value]) => {
      root.style.setProperty(token, value)
    })
    root.style.setProperty("--accent-color", scheme.primary)
    root.style.setProperty("--accent-color-rgb", scheme.primaryRgb)
    root.style.setProperty("--accent-contrast-color", scheme.onPrimary)
    root.style.setProperty("--safe-accent", scheme.inversePrimary)
  }

  const previewAccent = (color) => {
    const mode = getSettings().accentColorMode || "m3"
    if (mode === "default") {
      previewDefaultAccent(color)
    } else {
      previewMaterialAccent(color)
    }

    const settings = getSettings()
    const style = settings.dateClockStyle || "default"
    if (settings.clockStyleUseM3Accent?.[style] === true) {
      const effectiveColor =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--accent-color")
          .trim() || color
      const effectiveRgb =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--accent-color-rgb")
          .trim() || "255, 255, 255"
      document.documentElement.style.setProperty(
        "--clock-style-accent-color",
        effectiveColor,
      )
      document.documentElement.style.setProperty(
        "--clock-style-accent-rgb",
        effectiveRgb,
      )
      document
        .querySelector(".clock-date-wrap")
        ?.style.setProperty("--accent-color", effectiveColor)
      document
        .querySelector(".clock-date-wrap")
        ?.style.setProperty("--accent-color-rgb", effectiveRgb)
    }
  }

  const syncAccentModeControls = () => {
    const mode = getSettings().accentColorMode || "m3"
    if (DOM.accentColorModeM3) DOM.accentColorModeM3.checked = mode === "m3"
    if (DOM.accentColorModeDefault)
      DOM.accentColorModeDefault.checked = mode === "default"
    DOM.accentColorSettingsBody?.classList.toggle(
      "accent-mode-default",
      mode === "default",
    )
  }

  const handleAccentModeChange = (mode) => {
    handleSettingUpdate("accentColorMode", mode)
    syncAccentModeControls()
    previewAccent(DOM.accentColorPicker.value)
  }

  syncAccentModeControls()

  DOM.accentColorModeM3?.addEventListener("change", () => {
    if (DOM.accentColorModeM3.checked) handleAccentModeChange("m3")
  })

  DOM.accentColorModeDefault?.addEventListener("change", () => {
    if (DOM.accentColorModeDefault.checked) handleAccentModeChange("default")
  })

  DOM.m3PaletteStyleSelect?.addEventListener("change", () => {
    const style = DOM.m3PaletteStyleSelect.value || "tonalSpot"
    handleSettingUpdate("m3PaletteStyle", style)
    previewAccent(DOM.accentColorPicker.value)
  })

  DOM.accentColorPicker.addEventListener("input", () => {
    const val = DOM.accentColorPicker.value
    previewAccent(val)
    updateAccentHexInput(val)
  })
  DOM.accentColorPicker.addEventListener("change", () => {
    handleSettingUpdate("accentColor", DOM.accentColorPicker.value)
  })

  if (DOM.accentColorHexInput) {
    DOM.accentColorHexInput.addEventListener("input", (e) => {
      let val = e.target.value.trim()
      if (!val.startsWith("#")) val = "#" + val
      e.target.value = val

      if (/^#[0-9A-F]{6}$/i.test(val)) {
        DOM.accentColorPicker.value = val
        DOM.accentColorPicker.dispatchEvent(new Event("input"))
        handleSettingUpdate("accentColor", val)
      }
    })
  }

  document.querySelectorAll(".accent-color-preset").forEach((btn) => {
    if (btn.dataset.color) {
      btn.style.setProperty("--accent-swatch", btn.dataset.color)
    }

    btn.addEventListener("click", () => {
      const color = btn.dataset.color
      DOM.accentColorPicker.value = color
      updateAccentHexInput(color)
      handleSettingUpdate("accentColor", color)
      document
        .querySelectorAll(".accent-color-preset")
        .forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")
    })
  })

  DOM.randomAccentColorBtn.addEventListener("click", () => {
    const color = getRandomHexColor()
    DOM.accentColorPicker.value = color
    updateAccentHexInput(color)
    handleSettingUpdate("accentColor", color)
    document
      .querySelectorAll(".accent-color-preset")
      .forEach((b) => b.classList.remove("active"))
  })

  // Dynamic M3 Color (Extract from background)
  if (DOM.m3DynamicColorBtn) {
    DOM.m3DynamicColorBtn.addEventListener("click", async () => {
      const origHtml = DOM.m3DynamicColorBtn.innerHTML
      DOM.m3DynamicColorBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`
      try {
        await applyAccentFromCurrentBackground({
          DOM,
          handleSettingUpdate,
          fallbackRandom: true,
        })
      } catch (e) {
        console.error("M3 color extraction failed:", e)
      } finally {
        DOM.m3DynamicColorBtn.innerHTML = origHtml
      }
    })
  }

  DOM.m3AutoBgToggle?.addEventListener("change", async () => {
    const enabled = DOM.m3AutoBgToggle.checked === true
    updateSetting("m3AutoAccentFromBg", enabled)
    saveSettings()
    if (enabled) {
      ;[0, 650, 1400].forEach((delay) => {
        setTimeout(() => {
          if (getSettings().m3AutoAccentFromBg !== true) return
          applyAccentFromCurrentBackground({
            DOM,
            handleSettingUpdate,
            fallbackRandom: false,
            silent: true,
          }).catch((err) => {
            console.warn("Initial auto M3 accent update failed:", err)
          })
        }, delay)
      })
    }
  })

  DOM.m3WidgetsToggle?.addEventListener("change", () => {
    const enabled = DOM.m3WidgetsToggle.checked === true
    handleSettingUpdate("widgetUseM3Accent", enabled)
    document.body.classList.toggle("widgets-m3-accent", enabled)
  })

  DOM.m3SidebarToggle?.addEventListener("change", () => {
    const enabled = DOM.m3SidebarToggle.checked === true
    handleSettingUpdate("sidebarUseM3Accent", enabled)
    document.body.classList.toggle("sidebar-m3-accent", enabled)
  })

  DOM.saveAccentColorBtn.addEventListener("click", () => {
    const settings = getSettings()
    const color = DOM.accentColorPicker.value
    if (!settings.userAccentColors) settings.userAccentColors = []

    if (!settings.userAccentColors.includes(color)) {
      if (settings.userAccentColors.length >= 10) {
        showAlert("You can only save up to 10 custom accent colors.")
        return
      }
      settings.userAccentColors.push(color)
      saveSettings()
      renderUserAccentColors(DOM)
      showAlert("Accent color saved!")
    } else {
      showAlert("This color is already saved.")
    }
  })

  DOM.userAccentColorsGallery.addEventListener("click", (e) => {
    const item = e.target.closest(".user-color-item")
    if (item && !e.target.closest(".remove-bg-btn")) {
      const color = item.dataset.bgId
      DOM.accentColorPicker.value = color
      updateAccentHexInput(color)
      handleSettingUpdate("accentColor", color)

      // Clear active from presets
      document
        .querySelectorAll(".accent-color-preset")
        .forEach((b) => b.classList.remove("active"))

      // Update active in user gallery
      document
        .querySelectorAll("#user-accent-colors-gallery .user-color-item")
        .forEach((el) => {
          el.classList.toggle("active", el.dataset.bgId === color)
        })
    }
  })

  const setAccentControlsExpanded = (isOpen) => {
    if (!DOM.accentColorSettingsBody || !DOM.accentColorToggleLabel) return
    DOM.accentColorSettingsBody.style.display = "block"
    DOM.accentColorSettingsBody.classList.toggle("is-collapsed", !isOpen)
    DOM.accentColorToggleBtn?.setAttribute("aria-expanded", String(isOpen))
    DOM.accentColorToggleLabel.textContent =
      geti18n()?.[isOpen ? "settings_accent_close" : "settings_accent_open"] ||
      (isOpen ? "Hide Controls" : "Show Controls")
  }

  DOM.accentColorToggleBtn?.addEventListener("click", () => {
    const nextIsOpen =
      DOM.accentColorSettingsBody?.classList.contains("is-collapsed") ?? true
    setAccentControlsExpanded(nextIsOpen)
    updateSetting("accentControlsOpen", nextIsOpen)
    saveSettings()
  })

  renderUserAccentColors(DOM)

  // Background effects
  const applyBackgroundVisualPreview = (next = {}) => {
    const root = document.documentElement
    const bgLayer = document.getElementById("bg-layer")
    const bgVideo = document.getElementById("bg-video")
    const current = getSettings()
    const x = next.bgPositionX ?? current.bgPositionX ?? 50
    const y = next.bgPositionY ?? current.bgPositionY ?? 50
    const fit = next.bgSize ?? current.bgSize ?? "cover"
    const scale = Number(next.bgImageScale ?? current.bgImageScale ?? 100)
    const clampedScale = Math.min(250, Math.max(25, scale || 100))
    const layout =
      fit === "custom"
        ? { size: `${clampedScale}%`, repeat: "no-repeat" }
        : fit === "stretch"
          ? { size: "100% 100%", repeat: "no-repeat" }
          : fit === "tile"
            ? { size: "auto", repeat: "repeat" }
            : fit === "center"
              ? { size: "auto", repeat: "no-repeat" }
              : fit === "span"
                ? { size: "cover", repeat: "no-repeat" }
                : { size: fit, repeat: "no-repeat" }
    const blurVal = next.bgBlur ?? current.bgBlur ?? 0
    const blurDir = next.bgBlurDirection ?? current.bgBlurDirection ?? "none"
    const blurColor = next.bgBlurColor ?? current.bgBlurColor ?? "#000000"
    const blurOpacity = next.bgBlurColorOpacity ?? current.bgBlurColorOpacity ?? 0

    const mainBlurStr = blurDir === "none" ? `blur(${blurVal}px)` : `blur(0px)`

    const filters = [
      mainBlurStr,
      `brightness(${next.bgBrightness ?? current.bgBrightness ?? 100}%)`,
      `contrast(${next.bgContrast ?? current.bgContrast ?? 100}%)`,
      `saturate(${next.bgSaturation ?? current.bgSaturation ?? 100}%)`,
    ].join(" ")

    root.style.setProperty("--bg-pos-x", `${x}%`)
    root.style.setProperty("--bg-pos-y", `${y}%`)
    root.style.setProperty("--bg-filter", filters)
    root.style.setProperty(
      "--bg-blur",
      `${blurVal}px`,
    )
    root.style.setProperty(
      "--bg-brightness",
      `${next.bgBrightness ?? current.bgBrightness ?? 100}%`,
    )

    const overlay = document.getElementById("bg-directional-blur-overlay")
    if (overlay) {
      if (blurDir !== "none" || blurOpacity > 0) {
        overlay.style.display = "block"
        overlay.style.backdropFilter = blurDir !== "none" ? `blur(${blurVal}px)` : "none"
        overlay.style.webkitBackdropFilter = blurDir !== "none" ? `blur(${blurVal}px)` : "none"
        
        let maskStr = "none"
        if (blurDir === "left-to-right") {
          maskStr = "linear-gradient(to right, black 0%, transparent 100%)"
        } else if (blurDir === "right-to-left") {
          maskStr = "linear-gradient(to left, black 0%, transparent 100%)"
        } else if (blurDir === "top-to-bottom") {
          maskStr = "linear-gradient(to bottom, black 0%, transparent 100%)"
        } else if (blurDir === "bottom-to-top") {
          maskStr = "linear-gradient(to top, black 0%, transparent 100%)"
        }

        overlay.style.maskImage = maskStr
        overlay.style.webkitMaskImage = maskStr

        if (blurOpacity > 0) {
           overlay.style.backgroundColor = `color-mix(in srgb, ${blurColor} ${blurOpacity}%, transparent)`
        } else {
           overlay.style.backgroundColor = "transparent"
        }
      } else {
        overlay.style.display = "none"
        overlay.style.backdropFilter = "none"
        overlay.style.webkitBackdropFilter = "none"
        overlay.style.backgroundColor = "transparent"
      }
    }
    if (bgLayer) {
      bgLayer.style.backgroundPosition = `${x}% ${y}%`
      bgLayer.style.backgroundSize = layout.size
      bgLayer.style.backgroundRepeat = layout.repeat
      bgLayer.style.filter = filters
    }
    document.body.style.backgroundPosition = `${x}% ${y}%`
    document.body.style.backgroundSize = layout.size
    document.body.style.backgroundRepeat = layout.repeat
    document.body.style.filter = document.body.style.filter || ""
    if (bgVideo) {
      bgVideo.style.objectPosition = `${x}% ${y}%`
      bgVideo.style.objectFit =
        fit === "contain" || fit === "tile"
          ? "contain"
          : fit === "stretch"
            ? "fill"
            : fit === "center"
              ? "none"
              : "cover"
      bgVideo.style.transform =
        fit === "custom" ? `translateZ(0) scale(${clampedScale / 100})` : ""
      bgVideo.style.filter = filters
    }
  }

  const syncBgImageScaleVisibility = () => {
    if (!DOM.bgImageScaleRow) return
    DOM.bgImageScaleRow.style.display =
      DOM.bgSizeSelect.value === "custom" ? "block" : "none"
  }

  DOM.bgSizeSelect.addEventListener("change", () => {
    syncBgImageScaleVisibility()
    applyBackgroundVisualPreview({ bgSize: DOM.bgSizeSelect.value })
    handleSettingUpdate("bgSize", DOM.bgSizeSelect.value)
  })

  DOM.bgImageScaleInput?.addEventListener("input", () => {
    const value = Number(DOM.bgImageScaleInput.value)
    if (DOM.bgImageScaleValue) DOM.bgImageScaleValue.textContent = `${value}%`
    applyBackgroundVisualPreview({ bgImageScale: value })
    throttleSettingUpdate("bgImageScale", value)
  })

  DOM.bgPosXInput.addEventListener("input", () => {
    DOM.bgPosXValue.textContent = `${DOM.bgPosXInput.value}%`
    applyBackgroundVisualPreview({ bgPositionX: DOM.bgPosXInput.value })
    throttleSettingUpdate("bgPositionX", Number(DOM.bgPosXInput.value))
  })

  DOM.bgPosYInput.addEventListener("input", () => {
    DOM.bgPosYValue.textContent = `${DOM.bgPosYInput.value}%`
    applyBackgroundVisualPreview({ bgPositionY: DOM.bgPosYInput.value })
    throttleSettingUpdate("bgPositionY", Number(DOM.bgPosYInput.value))
  })

  DOM.bgBlurInput.addEventListener("input", () => {
    DOM.bgBlurValue.textContent = `${DOM.bgBlurInput.value}px`
    applyBackgroundVisualPreview({ bgBlur: Number(DOM.bgBlurInput.value) })
    throttleSettingUpdate("bgBlur", Number(DOM.bgBlurInput.value))
  })

  if (DOM.bgBlurDirectionSelect) {
    DOM.bgBlurDirectionSelect.addEventListener("change", () => {
      applyBackgroundVisualPreview({ bgBlurDirection: DOM.bgBlurDirectionSelect.value })
      updateSetting("bgBlurDirection", DOM.bgBlurDirectionSelect.value)
      saveSettings()
    })
  }

  if (DOM.bgBlurColorInput) {
    DOM.bgBlurColorInput.addEventListener("input", () => {
      applyBackgroundVisualPreview({ bgBlurColor: DOM.bgBlurColorInput.value })
      throttleSettingUpdate("bgBlurColor", DOM.bgBlurColorInput.value)
    })
  }

  if (DOM.bgBlurColorOpacityInput) {
    DOM.bgBlurColorOpacityInput.addEventListener("input", () => {
      if (DOM.bgBlurColorOpacityValue) {
        DOM.bgBlurColorOpacityValue.textContent = `${DOM.bgBlurColorOpacityInput.value}%`
      }
      applyBackgroundVisualPreview({ bgBlurColorOpacity: Number(DOM.bgBlurColorOpacityInput.value) })
      throttleSettingUpdate("bgBlurColorOpacity", Number(DOM.bgBlurColorOpacityInput.value))
    })
  }

  if (DOM.bgContrastInput) {
    DOM.bgContrastInput.addEventListener("input", () => {
      DOM.bgContrastValue.textContent = `${DOM.bgContrastInput.value}%`
      applyBackgroundVisualPreview({
        bgContrast: Number(DOM.bgContrastInput.value),
      })
      throttleSettingUpdate("bgContrast", Number(DOM.bgContrastInput.value))
    })
  }

  if (DOM.bgSaturationInput) {
    DOM.bgSaturationInput.addEventListener("input", () => {
      DOM.bgSaturationValue.textContent = `${DOM.bgSaturationInput.value}%`
      applyBackgroundVisualPreview({
        bgSaturation: Number(DOM.bgSaturationInput.value),
      })
      throttleSettingUpdate("bgSaturation", Number(DOM.bgSaturationInput.value))
    })
  }

  DOM.bgBrightnessInput.addEventListener("input", () => {
    DOM.bgBrightnessValue.textContent = `${DOM.bgBrightnessInput.value}%`
    applyBackgroundVisualPreview({
      bgBrightness: Number(DOM.bgBrightnessInput.value),
    })
    throttleSettingUpdate("bgBrightness", Number(DOM.bgBrightnessInput.value))
  })

  DOM.bgFadeInInput.addEventListener("input", () => {
    DOM.bgFadeInValue.textContent = `${DOM.bgFadeInInput.value}s`
    throttleSettingUpdate("bgFadeIn", Number(DOM.bgFadeInInput.value))
  })

  DOM.backgroundMediaQualitySelect?.addEventListener("change", () => {
    handleSettingUpdate(
      "backgroundMediaQuality",
      DOM.backgroundMediaQualitySelect.value,
    )
  })

  document
    .getElementById("compress-saved-bg-btn")
    ?.addEventListener("click", async (event) => {
      const btn = event.currentTarget
      const originalHtml = btn.innerHTML
      const i18nNow = geti18n()
      btn.disabled = true
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>${i18nNow.settings_compressing || "Compressing..."}</span>`

      try {
        const result = await recompressSavedBackgroundImages(
          DOM,
          handleSettingUpdate,
        )
        showAlert(
          (
            i18nNow.settings_compress_saved_done ||
            "Compressed {count} saved image(s)."
          ).replace("{count}", result.reduced),
        )
      } catch (error) {
        console.error("Failed to compress saved backgrounds:", error)
        showAlert(
          i18nNow.settings_compress_saved_error ||
            "Could not compress saved images right now.",
        )
      } finally {
        btn.disabled = false
        btn.innerHTML = originalHtml
      }
    })

  // Custom Bookmark listeners
  if (DOM.bookmarkFontSizeInput) {
    DOM.bookmarkFontSizeInput.addEventListener("input", () => {
      DOM.bookmarkFontSizeValue.textContent = `${DOM.bookmarkFontSizeInput.value}px`
      throttleSettingUpdate(
        "bookmarkFontSize",
        Number(DOM.bookmarkFontSizeInput.value),
      )
    })

    DOM.bookmarkIconSizeInput.addEventListener("input", () => {
      DOM.bookmarkIconSizeValue.textContent = `${DOM.bookmarkIconSizeInput.value}px`
      throttleSettingUpdate(
        "bookmarkIconSize",
        Number(DOM.bookmarkIconSizeInput.value),
      )
    })

    DOM.bookmarkGroupTextWidthInput.addEventListener("input", () => {
      DOM.bookmarkGroupTextWidthValue.textContent = `${DOM.bookmarkGroupTextWidthInput.value}px`
      throttleSettingUpdate(
        "bookmarkGroupTextWidth",
        Number(DOM.bookmarkGroupTextWidthInput.value),
      )
    })

    DOM.bookmarkGapInput.addEventListener("input", () => {
      DOM.bookmarkGapValue.textContent = `${DOM.bookmarkGapInput.value}px`
      throttleSettingUpdate("bookmarkGap", Number(DOM.bookmarkGapInput.value))
    })

    DOM.bookmarkBgColorPicker.addEventListener("input", () => {
      throttleSettingUpdate("bookmarkBgColor", DOM.bookmarkBgColorPicker.value)
    })

    DOM.bookmarkBgOpacityInput.addEventListener("input", () => {
      throttleSettingUpdate(
        "bookmarkBgOpacity",
        Number(DOM.bookmarkBgOpacityInput.value),
      )
    })

    DOM.resetBookmarkBgBtn.addEventListener("click", () => {
      DOM.bookmarkBgColorPicker.value = "#ffffff"
      DOM.bookmarkBgOpacityInput.value = 100
      throttleSettingUpdate("bookmarkBgColor", "#ffffff")
      throttleSettingUpdate("bookmarkBgOpacity", 100)
    })

    if (DOM.bookmarkGroupBgColorPicker) {
      DOM.bookmarkGroupBgColorPicker.addEventListener("input", () => {
        throttleSettingUpdate(
          "bookmarkGroupBgColor",
          DOM.bookmarkGroupBgColorPicker.value,
        )
      })
    }
    if (DOM.bookmarkGroupBgOpacityInput) {
      DOM.bookmarkGroupBgOpacityInput.addEventListener("input", () => {
        throttleSettingUpdate(
          "bookmarkGroupBgOpacity",
          Number(DOM.bookmarkGroupBgOpacityInput.value),
        )
      })
    }
    if (DOM.resetBookmarkGroupBgBtn) {
      DOM.resetBookmarkGroupBgBtn.addEventListener("click", () => {
        DOM.bookmarkGroupBgColorPicker.value = "#ffffff"
        DOM.bookmarkGroupBgOpacityInput.value = 0
        throttleSettingUpdate("bookmarkGroupBgColor", "#ffffff")
        throttleSettingUpdate("bookmarkGroupBgOpacity", 0)
      })
    }
    if (DOM.bookmarkGroupTextColorPicker) {
      DOM.bookmarkGroupTextColorPicker.addEventListener("input", () => {
        throttleSettingUpdate(
          "bookmarkGroupTextColor",
          DOM.bookmarkGroupTextColorPicker.value,
        )
      })
    }
    if (DOM.resetBookmarkGroupTextColorBtn) {
      DOM.resetBookmarkGroupTextColorBtn.addEventListener("click", () => {
        DOM.bookmarkGroupTextColorPicker.value = "#ffffff"
        throttleSettingUpdate("bookmarkGroupTextColor", null)
      })
    }
    if (DOM.bookmarkGroupAutoTextContrast) {
      DOM.bookmarkGroupAutoTextContrast.addEventListener("change", () => {
        const enabled = DOM.bookmarkGroupAutoTextContrast.checked
        document.body.classList.toggle(
          "bookmark-group-auto-text-contrast",
          enabled,
        )
        throttleSettingUpdate("bookmarkGroupAutoTextContrast", enabled)
      })
    }
    if (DOM.bookmarkGroupFontSizeInput) {
      DOM.bookmarkGroupFontSizeInput.addEventListener("input", () => {
        if (DOM.bookmarkGroupFontSizeValue)
          DOM.bookmarkGroupFontSizeValue.textContent = `${DOM.bookmarkGroupFontSizeInput.value}px`
        throttleSettingUpdate(
          "bookmarkGroupFontSize",
          Number(DOM.bookmarkGroupFontSizeInput.value),
        )
      })
    }
    if (DOM.bookmarkGroupBorderRadiusInput) {
      DOM.bookmarkGroupBorderRadiusInput.addEventListener("input", () => {
        if (DOM.bookmarkGroupBorderRadiusValue)
          DOM.bookmarkGroupBorderRadiusValue.textContent = `${DOM.bookmarkGroupBorderRadiusInput.value}px`
        throttleSettingUpdate(
          "bookmarkGroupBorderRadius",
          Number(DOM.bookmarkGroupBorderRadiusInput.value),
        )
      })
    }

    DOM.enableBookmarkDrag.addEventListener("change", () => {
      throttleSettingUpdate(
        "bookmarkEnableDrag",
        DOM.enableBookmarkDrag.checked,
      )
      renderBookmarks()
    })

    if (DOM.bookmarkKeepNestedFolders) {
      DOM.bookmarkKeepNestedFolders.addEventListener("change", () => {
        handleSettingUpdate(
          "bookmarkKeepNestedFolders",
          DOM.bookmarkKeepNestedFolders.checked,
        )
      })
    }

    if (DOM.bookmarkOpenInNewTab) {
      DOM.bookmarkOpenInNewTab.addEventListener("change", () => {
        handleSettingUpdate(
          "bookmarkOpenInNewTab",
          DOM.bookmarkOpenInNewTab.checked,
        )
        renderBookmarks()
      })
    }

    if (DOM.bookmarkLimit20) {
      DOM.bookmarkLimit20.addEventListener("change", () => {
        throttleSettingUpdate("bookmarkLimit20", DOM.bookmarkLimit20.checked)
      })
    }
    if (DOM.showAddBookmarkButton) {
      DOM.showAddBookmarkButton.addEventListener("change", () => {
        handleSettingUpdate(
          "showAddBookmarkButton",
          DOM.showAddBookmarkButton.checked,
        )
        renderBookmarks()
      })
    }
    if (DOM.bookmarkGroupShowCount) {
      DOM.bookmarkGroupShowCount.addEventListener("change", () => {
        const showCount = DOM.bookmarkGroupShowCount.checked
        document.body.classList.toggle(
          "bookmark-group-count-hidden",
          !showCount,
        )
        throttleSettingUpdate("bookmarkGroupShowCount", showCount)
      })
    }
    if (DOM.bookmarkGroupUseAccent) {
      DOM.bookmarkGroupUseAccent.addEventListener("change", () => {
        const enabled = DOM.bookmarkGroupUseAccent.checked
        document.body.classList.toggle("bookmark-group-accent-enabled", enabled)
        throttleSettingUpdate("bookmarkGroupUseAccent", enabled)
      })
    }
    if (DOM.bookmarkGroupKeepBgOnInteraction) {
      DOM.bookmarkGroupKeepBgOnInteraction.addEventListener("change", () => {
        const enabled = DOM.bookmarkGroupKeepBgOnInteraction.checked
        document.body.classList.toggle(
          "bookmark-group-keep-bg-on-interaction",
          enabled,
        )
        throttleSettingUpdate("bookmarkGroupKeepBgOnInteraction", enabled)
      })
    }
    if (DOM.bookmarkGroupContainerBgHidden) {
      DOM.bookmarkGroupContainerBgHidden.addEventListener("change", () => {
        const hidden = DOM.bookmarkGroupContainerBgHidden.checked
        document.body.classList.toggle(
          "bookmark-group-container-bg-hidden",
          hidden,
        )
        throttleSettingUpdate("bookmarkGroupContainerBgHidden", hidden)
      })
    }
    if (DOM.bookmarkGroupBorderHidden) {
      DOM.bookmarkGroupBorderHidden.addEventListener("change", () => {
        const hidden = DOM.bookmarkGroupBorderHidden.checked
        document.body.classList.toggle("bookmark-group-border-hidden", hidden)
        throttleSettingUpdate("bookmarkGroupBorderHidden", hidden)
      })
    }

    if (DOM.bookmarkTextColorPicker) {
      DOM.bookmarkTextColorPicker.addEventListener("input", () => {
        throttleSettingUpdate(
          "bookmarkTextColor",
          DOM.bookmarkTextColorPicker.value,
        )
      })
    }

    if (DOM.resetBookmarkTextColorBtn) {
      DOM.resetBookmarkTextColorBtn.addEventListener("click", () => {
        DOM.bookmarkTextColorPicker.value = "#ffffff"
        throttleSettingUpdate("bookmarkTextColor", null)
      })
    }

    if (DOM.hideBookmarkText) {
      DOM.hideBookmarkText.addEventListener("change", () => {
        markInterfaceStyleCustom("bookmarkHideText")
        throttleSettingUpdate("bookmarkHideText", DOM.hideBookmarkText.checked)
      })
    }

    if (DOM.bookmarkLongText) {
      DOM.bookmarkLongText.addEventListener("change", () => {
        markInterfaceStyleCustom("bookmarkLongText")
        throttleSettingUpdate("bookmarkLongText", DOM.bookmarkLongText.checked)
      })
    }

    if (DOM.hideBookmarkBg) {
      DOM.hideBookmarkBg.addEventListener("change", () => {
        markInterfaceStyleCustom("bookmarkHideBg")
        throttleSettingUpdate("bookmarkHideBg", DOM.hideBookmarkBg.checked)
      })
    }

    if (DOM.bookmarkHideScrollbarCheckbox) {
      DOM.bookmarkHideScrollbarCheckbox.addEventListener("change", () => {
        markInterfaceStyleCustom("bookmarkHideScrollbar")
        throttleSettingUpdate(
          "bookmarkHideScrollbar",
          DOM.bookmarkHideScrollbarCheckbox.checked,
        )
      })
    }

    if (DOM.bookmarkMacosHover) {
      DOM.bookmarkMacosHover.addEventListener("change", () => {
        markInterfaceStyleCustom("bookmarkMacosHover")
        throttleSettingUpdate(
          "bookmarkMacosHover",
          DOM.bookmarkMacosHover.checked,
        )
      })
    }

    if (DOM.bookmarkLayout) {
      DOM.bookmarkLayout.addEventListener("change", () => {
        markInterfaceStyleCustom("bookmarkLayout")
        throttleSettingUpdate("bookmarkLayout", DOM.bookmarkLayout.value)
        if (DOM.lcpBookmarkLayout)
          DOM.lcpBookmarkLayout.value = DOM.bookmarkLayout.value

        // Show/hide bg style row and sidebar width row based on layout
        if (DOM.bookmarkLayoutBgStyleRow) {
          DOM.bookmarkLayoutBgStyleRow.style.display =
            DOM.bookmarkLayout.value === "default" ? "none" : "flex"
        }
        if (DOM.bookmarkSidebarWidthContainer) {
          DOM.bookmarkSidebarWidthContainer.style.display = 
            DOM.bookmarkLayout.value === "sidebar" ? "block" : "none"
        }
      })
    }
    
    if (DOM.bookmarkSidebarWidthInput) {
      DOM.bookmarkSidebarWidthInput.addEventListener("input", () => {
        if (DOM.bookmarkSidebarWidthValue) {
          DOM.bookmarkSidebarWidthValue.textContent = `${DOM.bookmarkSidebarWidthInput.value}px`
        }
        document.documentElement.style.setProperty("--bookmark-group-text-width", `${DOM.bookmarkSidebarWidthInput.value}px`)
        throttleSettingUpdate("bookmarkSidebarWidth", DOM.bookmarkSidebarWidthInput.value)
      })
    }
    
    if (DOM.settingsSidebarWidthInput) {
      DOM.settingsSidebarWidthInput.addEventListener("change", () => {
        if (DOM.settingsSidebarWidthValue) {
          DOM.settingsSidebarWidthValue.textContent = `${DOM.settingsSidebarWidthInput.value}px`
        }
        document.documentElement.style.setProperty("--sidebar-width", `${DOM.settingsSidebarWidthInput.value}px`)
        throttleSettingUpdate("settingsSidebarWidth", DOM.settingsSidebarWidthInput.value)
      })
    }
    if (DOM.lcpBookmarkLayout) {
      DOM.lcpBookmarkLayout.addEventListener("change", () => {
        markInterfaceStyleCustom("bookmarkLayout")
        throttleSettingUpdate("bookmarkLayout", DOM.lcpBookmarkLayout.value)
        if (DOM.bookmarkLayout)
          DOM.bookmarkLayout.value = DOM.lcpBookmarkLayout.value

        // Show/hide bg style row based on layout
        if (DOM.bookmarkLayoutBgStyleRow) {
          DOM.bookmarkLayoutBgStyleRow.style.display =
            DOM.lcpBookmarkLayout.value === "default" ? "none" : "flex"
        }
      })
    }
    if (DOM.bookmarkLayoutShowGroups) {
      DOM.bookmarkLayoutShowGroups.addEventListener("change", () => {
        const showGroups = DOM.bookmarkLayoutShowGroups.checked
        if (DOM.showBookmarkGroupsCheckbox)
          DOM.showBookmarkGroupsCheckbox.checked = showGroups
        if (DOM.lcpBookmarkGroups) DOM.lcpBookmarkGroups.checked = showGroups
        handleSettingUpdate("showBookmarkGroups", showGroups)
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: "showBookmarkGroups", value: showGroups },
          }),
        )
      })
    }
    if (DOM.bookmarkLayoutBgStyle) {
      DOM.bookmarkLayoutBgStyle.addEventListener("change", () => {
        markInterfaceStyleCustom("bookmarkLayoutBgStyle")
        handleSettingUpdate(
          "bookmarkLayoutBgStyle",
          DOM.bookmarkLayoutBgStyle.value,
        )
        if (DOM.bookmarkLayoutBgColorRow) {
          DOM.bookmarkLayoutBgColorRow.style.display =
            DOM.bookmarkLayoutBgStyle.value === "colored" ? "flex" : "none"
        }
      })
    }

    if (DOM.bookmarkLayoutBgColor) {
      DOM.bookmarkLayoutBgColor.addEventListener("input", () => {
        throttleSettingUpdate(
          "bookmarkLayoutBgColor",
          DOM.bookmarkLayoutBgColor.value,
        )
      })
    }

    if (DOM.bookmarkItemStyle) {
      DOM.bookmarkItemStyle.addEventListener("change", () => {
        markInterfaceStyleCustom("bookmarkItemStyle")
        throttleSettingUpdate("bookmarkItemStyle", DOM.bookmarkItemStyle.value)
      })
    }

    if (DOM.bookmarkShadowColorPicker) {
      DOM.bookmarkShadowColorPicker.addEventListener("input", () => {
        throttleSettingUpdate(
          "bookmarkShadowColor",
          DOM.bookmarkShadowColorPicker.value,
        )
      })
      DOM.bookmarkShadowOpacityInput.addEventListener("input", () => {
        throttleSettingUpdate(
          "bookmarkShadowOpacity",
          Number(DOM.bookmarkShadowOpacityInput.value),
        )
      })
      DOM.bookmarkShadowBlurInput.addEventListener("input", () => {
        if (DOM.bookmarkShadowBlurValue) {
          DOM.bookmarkShadowBlurValue.textContent = `${DOM.bookmarkShadowBlurInput.value}${DOM.bookmarkGroupFontSizeInput.value}px`
        }
        throttleSettingUpdate(
          "bookmarkShadowBlur",
          Number(DOM.bookmarkShadowBlurInput.value),
        )
      })
    }
  }

  const promptBookmarkOpenBehavior = async () => {
    const settings = getSettings()
    if (settings.bookmarkOpenBehaviorPromptSeen === true) return

    updateSetting("bookmarkOpenBehaviorPromptSeen", true)
    saveSettings(true)

    const choice = await showChoiceConfirm(
      [
        {
          key: "current",
          icon: "fa-solid fa-arrow-up-right-from-square",
          label:
            i18n.bookmark_open_behavior_current_choice ||
            "Open in this tab",
          description:
            i18n.bookmark_open_behavior_current_desc ||
            "Clicking a bookmark replaces the Start Page in the current tab.",
        },
        {
          key: "new",
          icon: "fa-solid fa-up-right-from-square",
          label: i18n.bookmark_open_behavior_new_choice || "Open a new tab",
          description:
            i18n.bookmark_open_behavior_new_desc ||
            "Keep the Start Page open and launch bookmarks beside it.",
        },
      ],
      i18n.bookmark_open_behavior_title || "Bookmark opening behavior",
      i18n.bookmark_open_behavior_message ||
        "By default, bookmarks now open in the current tab. You can switch this anytime in Settings > Custom Bookmark > Layout & Behavior.",
    )

    if (choice === "new") {
      updateSetting("bookmarkOpenInNewTab", true)
      updateSetting("bookmarkOpenBehaviorClickPromptSeen", true)
      saveSettings(true)
      if (DOM.bookmarkOpenInNewTab) DOM.bookmarkOpenInNewTab.checked = true
      renderBookmarks()
    } else if (choice === "current") {
      updateSetting("bookmarkOpenBehaviorClickPromptSeen", true)
      saveSettings(true)
    }
  }
  setTimeout(promptBookmarkOpenBehavior, 800)

  // Gradient listeners
  const MODERN_GRADIENT_PRESETS = [
    {
      start: "#4F46E5",
      end: "#06B6D4",
      angle: "132",
      type: "radial",
      repeating: false,
      extraColorCount: 3,
      customColors: "",
      position: "center",
      radialShape: "circle",
    },
    {
      start: "#0EA5E9",
      end: "#8B5CF6",
      angle: "210",
      type: "conic",
      repeating: false,
      extraColorCount: 3,
      customColors: "",
      position: "center",
      radialShape: "circle",
    },
    {
      start: "#14B8A6",
      end: "#0F172A",
      angle: "145",
      type: "linear",
      repeating: true,
      extraColorCount: 4,
      customColors: "#22d3ee, #60a5fa, #a78bfa",
      position: "center",
      radialShape: "circle",
    },
    {
      start: "#F43F5E",
      end: "#7C3AED",
      angle: "300",
      type: "conic",
      repeating: true,
      extraColorCount: 5,
      customColors: "#f43f5e, #f59e0b, #22d3ee, #8b5cf6",
      position: "center",
      radialShape: "circle",
    },
    {
      start: "#22D3EE",
      end: "#1E293B",
      angle: "120",
      type: "radial",
      repeating: true,
      extraColorCount: 4,
      customColors: "#22d3ee, #38bdf8, #818cf8",
      position: "center",
      radialShape: "circle",
    },
    {
      start: "#ee9ca7",
      end: "#ffdde1",
      angle: "90",
      type: "linear",
      repeating: false,
      extraColorCount: 0,
      customColors: "",
      position: "center",
      radialShape: "circle",
    },
    {
      start: "#6a11cb",
      end: "#2575fc",
      angle: "45",
      type: "linear",
      repeating: false,
      extraColorCount: 0,
      customColors: "",
      position: "center",
      radialShape: "circle",
    },
    {
      start: "#ff7e5f",
      end: "#feb47b",
      angle: "135",
      type: "linear",
      repeating: false,
      extraColorCount: 0,
      customColors: "",
      position: "center",
      radialShape: "circle",
    },
    {
      start: "#232526",
      end: "#414345",
      angle: "180",
      type: "linear",
      repeating: false,
      extraColorCount: 0,
      customColors: "",
      position: "center",
      radialShape: "circle",
    },
    {
      start: "#f83600",
      end: "#f9d423",
      angle: "0",
      type: "linear",
      repeating: false,
      extraColorCount: 2,
      customColors: "#f83600, #f9d423",
      position: "center",
      radialShape: "circle",
    },
  ]

  const parseCustomColors = (text) => {
    if (!text) return []
    const matches = text.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g) || []
    return matches.map((c) =>
      c.length === 4
        ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`
        : c.toLowerCase(),
    )
  }

  const hexToRgb = (hex) => {
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
      return { r: 128, g: 128, b: 128 }
    }
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
    }
  }

  const mixHex = (a, b, t) => {
    const c1 = hexToRgb(a)
    const c2 = hexToRgb(b)
    const ratio = Math.min(1, Math.max(0, Number(t) || 0))
    const toHex = (n) => Math.round(n).toString(16).padStart(2, "0")
    return `#${toHex(c1.r + (c2.r - c1.r) * ratio)}${toHex(c1.g + (c2.g - c1.g) * ratio)}${toHex(c1.b + (c2.b - c1.b) * ratio)}`
  }

  const setGradientControlsExpanded = (isOpen) => {
    if (!DOM.gradientSettingsBody || !DOM.gradientToggleLabel) return
    DOM.gradientSettingsBody.style.display = "block"
    DOM.gradientSettingsBody.classList.toggle("is-collapsed", !isOpen)
    DOM.gradientToggleBtn?.setAttribute("aria-expanded", String(isOpen))
    DOM.gradientToggleLabel.textContent =
      geti18n()?.[
        isOpen ? "settings_gradient_close" : "settings_gradient_open"
      ] || (isOpen ? "Hide Controls" : "Show Controls")
  }

  const renderGradientExtraColorPickers = () => {
    if (!DOM.gradientExtraColorPickers) return

    const rawValue = DOM.gradientExtraColorCount?.value
    const count = Math.min(
      5,
      Math.max(0, rawValue !== undefined ? Number(rawValue) : 0),
    )
    const fromInput = parseCustomColors(DOM.gradientCustomColors?.value || "")
    const existing = fromInput.slice(0, count)

    while (existing.length < count) {
      const ratio = (existing.length + 1) / (count + 1)
      const fallback = mixHex(
        DOM.gradientStartPicker.value,
        DOM.gradientEndPicker.value,
        ratio,
      )
      existing.push(fallback)
    }

    DOM.gradientExtraColorPickers.innerHTML = ""
    if (count > 0) {
      existing.forEach((color, index) => {
        const picker = document.createElement("input")
        picker.type = "color"
        picker.value = color
        picker.title = `Extra ${index + 1}`
        picker.style.width = "42px"
        picker.style.height = "34px"
        picker.style.padding = "0"
        picker.style.border = "1px solid var(--input-border)"
        picker.style.borderRadius = "8px"
        picker.addEventListener("input", () => {
          const pickers = Array.from(
            DOM.gradientExtraColorPickers.querySelectorAll(
              'input[type="color"]',
            ),
          )
          if (DOM.gradientCustomColors) {
            DOM.gradientCustomColors.value = pickers
              .map((p) => p.value)
              .join(", ")
          }
          updateCurrentGradient()
        })
        DOM.gradientExtraColorPickers.appendChild(picker)
      })
    }

    if (DOM.gradientCustomColors) {
      DOM.gradientCustomColors.value = existing.join(", ")
    }
  }

  const hslToHex = (h, s, l) => {
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

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  const generateHarmonizedPalette = (size) => {
    const total = Math.max(3, Number(size) || 3)
    const baseHue = Math.floor(Math.random() * 360)
    const step = 360 / total
    const saturation = 72 + Math.floor(Math.random() * 16)
    const baseLight = 46 + Math.floor(Math.random() * 14)

    return Array.from({ length: total }, (_, index) => {
      const jitter = Math.floor(Math.random() * 14) - 7
      const hue = baseHue + step * index + jitter
      const lightness = Math.min(
        72,
        Math.max(30, baseLight + (Math.floor(Math.random() * 12) - 6)),
      )
      return hslToHex(hue, saturation, lightness)
    })
  }

  const updateCurrentGradient = () => {
    const type = DOM.gradientTypeSelect?.value || "linear"
    if (DOM.gradientAngleGroup) {
      DOM.gradientAngleGroup.style.display =
        type === "radial" ? "none" : "block"
    }
    if (DOM.gradientPositionGroup) {
      DOM.gradientPositionGroup.style.display =
        type === "linear" ? "none" : "flex"
    }
    if (DOM.gradientRadialShapeGroup) {
      DOM.gradientRadialShapeGroup.style.display =
        type === "radial" ? "flex" : "none"
    }

    const gradientConfig = {
      start: DOM.gradientStartPicker.value,
      end: DOM.gradientEndPicker.value,
      angle: DOM.gradientAngleInput.value,
      type: type,
      repeating: DOM.gradientRepeatingToggle?.checked === true,
      extraColorCount:
        DOM.gradientExtraColorCount?.value !== undefined
          ? Number(DOM.gradientExtraColorCount.value)
          : 2,
      customColors: DOM.gradientCustomColors?.value || "",
      position: DOM.gradientPositionSelect?.value || "center",
      radialShape: DOM.gradientRadialShapeSelect?.value || "circle",
    }

    handleSettingUpdate(null, gradientConfig, true)
  }

  const showPresetCodeError = () => {
    showAlert(
      geti18n().preset_code_invalid ||
        "This preset code is invalid or belongs to another preset type.",
    )
  }

  const flashButtonLabel = (button, key, fallback) => {
    if (!button) return
    const original = button.innerHTML
    button.innerHTML = `<i class="fa-solid fa-check"></i> <span>${geti18n()[key] || fallback}</span>`
    setTimeout(() => {
      button.innerHTML = original
    }, 1400)
  }

  const getGradientPresetPayload = () => ({
    start: DOM.gradientStartPicker.value,
    end: DOM.gradientEndPicker.value,
    angle: Number(DOM.gradientAngleInput.value),
    type: DOM.gradientTypeSelect?.value || "linear",
    repeating: DOM.gradientRepeatingToggle?.checked === true,
    extraColorCount:
      DOM.gradientExtraColorCount?.value !== undefined
        ? Number(DOM.gradientExtraColorCount.value)
        : 2,
    customColors: DOM.gradientCustomColors?.value || "",
    position: DOM.gradientPositionSelect?.value || "center",
    radialShape: DOM.gradientRadialShapeSelect?.value || "circle",
  })

  const getGradientPresetPayloadFromSettings = (settings) => ({
    start: settings.gradientStart,
    end: settings.gradientEnd,
    angle: Number(settings.gradientAngle ?? 135),
    type: settings.gradientType || "linear",
    repeating: settings.gradientRepeating === true,
    extraColorCount:
      settings.gradientExtraColorCount !== undefined
        ? Number(settings.gradientExtraColorCount)
        : 2,
    customColors: settings.gradientCustomColors || "",
    position: settings.gradientPosition || "center",
    radialShape: settings.gradientRadialShape || "circle",
  })

  const applyGradientPresetPayload = (payload) => {
    DOM.gradientStartPicker.value = payload.start || "#0f0c29"
    DOM.gradientEndPicker.value = payload.end || "#302b63"
    DOM.gradientAngleInput.value = Number(payload.angle ?? 135)
    DOM.gradientAngleValue.textContent = `${DOM.gradientAngleInput.value}°`
    if (DOM.gradientTypeSelect)
      DOM.gradientTypeSelect.value = payload.type || "linear"
    if (DOM.gradientRepeatingToggle)
      DOM.gradientRepeatingToggle.checked = payload.repeating === true
    if (DOM.gradientExtraColorCount)
      DOM.gradientExtraColorCount.value = String(
        Math.min(5, Math.max(0, Number(payload.extraColorCount ?? 2))),
      )
    if (DOM.gradientCustomColors)
      DOM.gradientCustomColors.value = payload.customColors || ""
    if (DOM.gradientPositionSelect)
      DOM.gradientPositionSelect.value = payload.position || "center"
    if (DOM.gradientRadialShapeSelect)
      DOM.gradientRadialShapeSelect.value = payload.radialShape || "circle"
    renderGradientExtraColorPickers()
    updateCurrentGradient()
    updateSettingsInputs()
  }

  const getMultiColorPresetPayload = () => {
    const colors = Array.from(document.querySelectorAll(".multi-color-picker"))
      .map((picker) => picker.value)
      .filter(Boolean)
    const mode =
      Array.from(DOM.multiColorModeBtns || []).find((btn) =>
        btn.classList.contains("active"),
      )?.dataset.mode || "smooth"
    const lineAngles = Array.from(
      document.querySelectorAll(".multi-color-line-angle-input"),
    ).map((input) => Number(input.value))

    return {
      type: "multi-color",
      gradientStops: colors,
      angle: Number(DOM.multiGradientAngleInput?.value || 135),
      mode,
      showDividers: DOM.multiColorDividersToggle?.checked !== false,
      dividerColor: DOM.multiColorLineColor?.value || "#FFFFFF",
      dividerWidth: Number(DOM.multiColorLineWidth?.value || 1.2),
      freeLineAngles: DOM.multiColorFreeLineAngles?.checked === true,
      lineAngles,
      multiColorType: DOM.multiColorTypeSelect?.value || "linear",
      multiColorRepeating: DOM.multiColorRepeatingToggle?.checked === true,
      multiColorPosition: DOM.multiColorPositionSelect?.value || "center",
      multiColorRadialShape: DOM.multiColorRadialShapeSelect?.value || "circle",
    }
  }

  const getMultiColorPresetPayloadFromSettings = (settings) => ({
    type: "multi-color",
    gradientStops: Array.isArray(settings.multiColors)
      ? [...settings.multiColors]
      : ["#FF6B6B", "#4ECDC4"],
    angle: Number(settings.multiGradientAngle ?? 135),
    mode: settings.multiColorMode || "smooth",
    showDividers: settings.multiColorDividers !== false,
    dividerColor: settings.multiColorDividerColor || "#FFFFFF",
    dividerWidth: Number(settings.multiColorDividerWidth ?? 1.2),
    freeLineAngles: settings.multiColorFreeLineAngles === true,
    lineAngles: Array.isArray(settings.multiColorLineAngles)
      ? [...settings.multiColorLineAngles]
      : [],
    multiColorType: settings.multiColorType || "linear",
    multiColorRepeating: settings.multiColorRepeating === true,
    multiColorPosition: settings.multiColorPosition || "center",
    multiColorRadialShape: settings.multiColorRadialShape || "circle",
  })

  const applyMultiColorPresetPayload = (payload) => {
    if (
      !Array.isArray(payload.gradientStops) ||
      payload.gradientStops.length < 2
    ) {
      throw new Error("Invalid multi-color preset")
    }
    window.dispatchEvent(
      new CustomEvent("multiColor:applyPreset", {
        detail: {
          ...payload,
          type: "multi-color",
          uid: payload.uid || `multi-code-${Date.now()}`,
        },
      }),
    )
  }

  const getSvgWavePresetPayload = () => ({
    ...getSvgWaveParams(getSettings()),
  })

  const getEffectPresetPayload = () => ({
    effects: pickSettings(getSettings(), VISUAL_EFFECT_KEYS),
  })

  const getBackgroundAnimationPresetPayload = () => ({
    backgroundAnimations: pickSettings(
      getSettings(),
      BACKGROUND_ANIMATION_KEYS,
    ),
  })

  const getBackgroundAnimationCodeRows = () => {
    const settings = getSettings()
    return [
      {
        labelKey: "background_animation_row_gradient_v2",
        fallbackLabel: "Gradient V2",
        payload: {
          backgroundAnimations: {
            ...pickSettings(settings, [
              "gradientV2Active",
              "gradientV2Color1",
              "gradientV2Color2",
              "gradientV2Color3",
              "gradientV2TimeSpeed",
              "gradientV2ColorBalance",
              "gradientV2WarpStrength",
              "gradientV2WarpFrequency",
              "gradientV2WarpSpeed",
              "gradientV2WarpAmplitude",
              "gradientV2BlendAngle",
              "gradientV2BlendSoftness",
              "gradientV2RotationAmount",
              "gradientV2NoiseScale",
              "gradientV2GrainAmount",
              "gradientV2GrainScale",
              "gradientV2GrainAnimated",
              "gradientV2Contrast",
              "gradientV2Gamma",
              "gradientV2Saturation",
              "gradientV2CenterX",
              "gradientV2CenterY",
              "gradientV2Zoom",
            ]),
            gradientV2Active: true,
          },
        },
      },
      {
        labelKey: "background_animation_row_silk",
        fallbackLabel: "Silk",
        payload: {
          backgroundAnimations: {
            ...pickSettings(settings, [
              "silkActive",
              "silkColor",
              "silkSpeed",
              "silkScale",
              "silkNoise",
              "silkRotation",
            ]),
            silkActive: true,
          },
        },
      },
      {
        labelKey: "background_animation_row_light_pillar",
        fallbackLabel: "Light Pillar",
        payload: {
          backgroundAnimations: {
            ...pickSettings(settings, [
              "lightPillarActive",
              "lightPillarTopColor",
              "lightPillarBottomColor",
              "lightPillarIntensity",
              "lightPillarRotationSpeed",
              "lightPillarGlowAmount",
              "lightPillarWidth",
              "lightPillarHeight",
              "lightPillarNoiseIntensity",
              "lightPillarRotation",
            ]),
            lightPillarActive: true,
          },
        },
      },
      {
        labelKey: "background_animation_row_mist_light",
        fallbackLabel: "Mist Light",
        payload: {
          backgroundAnimations: {
            ...pickSettings(settings, [
              "liquidEtherActive",
              "liquidEtherColor1",
              "liquidEtherColor2",
              "liquidEtherColor3",
              "liquidEtherGlowWidth",
            ]),
            liquidEtherActive: true,
          },
        },
      },
      {
        labelKey: "background_animation_row_splash_cursor",
        fallbackLabel: "Splash Cursor",
        payload: {
          backgroundAnimations: {
            ...pickSettings(settings, [
              "splashCursorActive",
              "splashCursorSimResolution",
              "splashCursorDyeResolution",
              "splashCursorDensityDissipation",
              "splashCursorVelocityDissipation",
              "splashCursorPressure",
              "splashCursorPressureIterations",
              "splashCursorCurl",
              "splashCursorSplatRadius",
              "splashCursorSplatForce",
              "splashCursorShading",
              "splashCursorColorUpdateSpeed",
              "splashCursorRainbowMode",
              "splashCursorColor",
              "splashCursorDarkBg",
            ]),
            splashCursorActive: true,
          },
        },
      },
    ]
  }

  const applyBackgroundAnimationPresetPayload = (payload) => {
    const animationPayload = payload?.backgroundAnimations || payload
    if (!animationPayload || typeof animationPayload !== "object") {
      throw new Error("Invalid background animation preset")
    }

    Object.entries(animationPayload).forEach(([key, value]) =>
      updateSetting(key, value),
    )
    saveSettings()
    applySettings()
    updateSettingsInputs()
    window.appScheduleAutoAccentUpdate?.()
  }

  const applyEffectPresetPayload = (payload) => {
    const effectPayload = payload?.effects || payload
    if (!effectPayload || typeof effectPayload !== "object") {
      throw new Error("Invalid effect preset")
    }

    Object.entries(effectPayload).forEach(([key, value]) =>
      updateSetting(key, value),
    )
    saveSettings()
    applySettings()
    updateSettingsInputs()
  }

  const getVisualPresetPayload = () => {
    const settings = getSettings()
    const activeMode =
      settings.svgWaveActive === true
        ? "svgWave"
        : settings.multiColorActive === true ||
            settings.activeBgUid?.startsWith("multi-")
          ? "multiColor"
          : "gradient"

    return {
      mode: "bundle",
      activeMode,
      gradient: getGradientPresetPayloadFromSettings(settings),
      multiColor: getMultiColorPresetPayloadFromSettings(settings),
      svgWave: getSvgWaveParams(settings),
      effects: pickSettings(settings, VISUAL_EFFECT_KEYS),
      theme: pickSettings(settings, VISUAL_THEME_KEYS),
    }
  }

  const getVisualPresetCodeRows = () => {
    const settings = getSettings()
    return [
      {
        labelKey: "visual_preset_row_gradient",
        fallbackLabel: "Gradient",
        payload: {
          mode: "gradient",
          data: getGradientPresetPayloadFromSettings(settings),
        },
      },
      {
        labelKey: "visual_preset_row_multi_color",
        fallbackLabel: "Multi-Color",
        payload: {
          mode: "multiColor",
          data: getMultiColorPresetPayloadFromSettings(settings),
        },
      },
      {
        labelKey: "visual_preset_row_svg_wave",
        fallbackLabel: "SVG Wave",
        payload: {
          mode: "svgWave",
          data: getSvgWaveParams(settings),
        },
      },
      {
        labelKey: "visual_preset_row_effect",
        fallbackLabel: "Effect",
        payload: {
          mode: "effect",
          data: { effects: pickSettings(settings, VISUAL_EFFECT_KEYS) },
        },
      },
    ]
  }

  const applyVisualPresetPayload = (payload) => {
    if (payload?.mode === "bundle") {
      if (payload.theme && typeof payload.theme === "object") {
        Object.entries(payload.theme).forEach(([key, value]) =>
          updateSetting(key, value),
        )
      }
      if (payload.effects && typeof payload.effects === "object") {
        Object.entries(payload.effects).forEach(([key, value]) =>
          updateSetting(key, value),
        )
      }

      const activeMode = payload.activeMode || "gradient"
      if (activeMode === "svgWave") {
        applySvgWavePresetPayload(payload.svgWave)
      } else if (activeMode === "multiColor") {
        applyMultiColorPresetPayload(payload.multiColor)
      } else {
        applyGradientPresetPayload(payload.gradient)
      }

      saveSettings()
      applySettings()
      updateSettingsInputs()
      return
    }

    // Backward compatibility for the first Visual Hub codes.
    if (payload?.mode === "svgWave") {
      applySvgWavePresetPayload(payload.data)
      return
    }
    if (payload?.mode === "multiColor") {
      applyMultiColorPresetPayload(payload.data)
      return
    }
    if (payload?.mode === "gradient") {
      applyGradientPresetPayload(payload.data)
      return
    }
    if (payload?.mode === "effect") {
      applyEffectPresetPayload(payload.data)
      return
    }
    throw new Error("Invalid visual preset")
  }

  const applySvgWavePresetPayload = (payload) => {
    updateSetting("svgWaveLines", Number(payload.lines ?? 5))
    updateSetting("svgWaveAmplitudeX", Number(payload.amplitudeX ?? 200))
    updateSetting("svgWaveAmplitudeY", Number(payload.amplitudeY ?? 80))
    updateSetting("svgWaveOffsetX", Number(payload.offsetX ?? 0))
    updateSetting("svgWaveAngle", Number(payload.angle ?? 0))
    updateSetting("svgWaveSmoothness", Number(payload.smoothness ?? 0.5))
    updateSetting("svgWaveFill", payload.fill !== false)
    updateSetting("svgWaveCraziness", Number(payload.craziness ?? 30))
    updateSetting("svgWaveStartHue", Number(payload.startHue ?? 200))
    updateSetting(
      "svgWaveStartSaturation",
      Number(payload.startSaturation ?? 70),
    )
    updateSetting("svgWaveStartLightness", Number(payload.startLightness ?? 40))
    updateSetting("svgWaveEndHue", Number(payload.endHue ?? 280))
    updateSetting("svgWaveEndSaturation", Number(payload.endSaturation ?? 70))
    updateSetting("svgWaveEndLightness", Number(payload.endLightness ?? 30))
    updateSetting("svgWaveActive", true)
    updateSetting("background", null)
    saveSettings()
    updateSettingsInputs()
    const params = getSvgWaveParams(getSettings())
    if (effects.svgWaveEffect.active) {
      effects.svgWaveEffect.update(params)
    } else {
      effects.svgWaveEffect.start(params)
    }
    window.appScheduleAutoAccentUpdate?.()
  }

  const encodeCodeForType = (type, payload) => {
    const code = encodePresetCode(type, payload)
    return type === "backgroundAnimation"
      ? code.replace(/^SPC1\./, "BAC1.")
      : code
  }

  const decodeCodeForType = (code, type) => {
    const normalizedCode =
      type === "backgroundAnimation"
        ? String(code || "").trim().replace(/^BAC1\./, "SPC1.")
        : code
    return decodePresetCode(normalizedCode, type)
  }

  const setupPresetCodeControls = ({
    copyBtn,
    applyBtn,
    input,
    type,
    getPayload,
    applyPayload,
    lineContainer,
    getCodeRows,
  }) => {
    const renderCodeRows = () => {
      if (!lineContainer || !getCodeRows) return
      lineContainer.textContent = ""
      getCodeRows().forEach((row) => {
        const rowType = row.type || type
        const code = encodeCodeForType(rowType, row.payload)
        const item = document.createElement("div")
        item.className = "preset-code-line"

        const label = document.createElement("span")
        label.className = "preset-code-line-label"
        label.textContent =
          (row.labelKey && geti18n()[row.labelKey]) ||
          row.label ||
          row.fallbackLabel ||
          ""

        const value = document.createElement("input")
        value.className = "preset-code-line-value"
        value.type = "text"
        value.readOnly = true
        value.value = code
        value.addEventListener("focus", () => value.select())

        const rowCopyBtn = document.createElement("button")
        rowCopyBtn.className = "secondary-btn preset-code-line-copy"
        rowCopyBtn.type = "button"
        rowCopyBtn.title = geti18n().preset_code_copy || "Copy Code"
        rowCopyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>'
        rowCopyBtn.addEventListener("click", async () => {
          if (input) input.value = code
          try {
            await copyText(code)
            const original = rowCopyBtn.innerHTML
            rowCopyBtn.innerHTML = '<i class="fa-solid fa-check"></i>'
            setTimeout(() => {
              rowCopyBtn.innerHTML = original
            }, 1200)
          } catch {
            showAlert(
              geti18n().alert_gradient_css_copy_failed ||
                "Unable to copy. Please copy manually.",
            )
          }
        })

        item.append(label, value, rowCopyBtn)
        lineContainer.appendChild(item)
      })
    }

    renderCodeRows()

    if (lineContainer) {
      const toggleBtn = lineContainer
        .closest(".preset-code-card")
        ?.querySelector("[data-preset-code-lines-toggle]")
      const toggleLabel = toggleBtn?.querySelector("span")
      const setLinesVisible = (isVisible) => {
        lineContainer.hidden = !isVisible
        if (toggleBtn) {
          toggleBtn.setAttribute("aria-expanded", String(isVisible))
          toggleBtn.classList.toggle("is-open", isVisible)
        }
        if (toggleLabel) {
          toggleLabel.textContent = isVisible
            ? geti18n().preset_code_hide_lines || "Hide codes"
            : geti18n().preset_code_show_lines || "Show codes"
        }
      }
      setLinesVisible(false)
      toggleBtn?.addEventListener("click", () => {
        setLinesVisible(lineContainer.hidden)
      })
    }

    copyBtn?.addEventListener("click", async () => {
      const code = encodeCodeForType(type, getPayload())
      if (input) input.value = code
      renderCodeRows()
      try {
        await copyText(code)
        flashButtonLabel(copyBtn, "preset_code_copied", "Copied")
      } catch {
        showAlert(
          geti18n().alert_gradient_css_copy_failed ||
            "Unable to copy. Please copy manually.",
        )
      }
    })

    applyBtn?.addEventListener("click", () => {
      try {
        applyPayload(decodeCodeForType(input?.value || "", type))
        flashButtonLabel(applyBtn, "preset_code_applied", "Applied")
      } catch (error) {
        console.error("Invalid preset code:", error)
        showPresetCodeError()
      }
    })
  }

  DOM.gradientStartPicker.addEventListener("input", updateCurrentGradient)
  DOM.gradientEndPicker.addEventListener("input", updateCurrentGradient)
  DOM.gradientTypeSelect?.addEventListener("change", updateCurrentGradient)
  DOM.gradientPositionSelect?.addEventListener("change", updateCurrentGradient)
  DOM.gradientRadialShapeSelect?.addEventListener(
    "change",
    updateCurrentGradient,
  )
  DOM.gradientRepeatingToggle?.addEventListener("change", updateCurrentGradient)
  DOM.gradientExtraColorCount?.addEventListener("change", () => {
    renderGradientExtraColorPickers()
    updateCurrentGradient()
  })
  DOM.gradientCustomColors?.addEventListener("input", () => {
    renderGradientExtraColorPickers()
    updateCurrentGradient()
  })
  DOM.gradientAngleInput.addEventListener("input", () => {
    DOM.gradientAngleValue.textContent = `${DOM.gradientAngleInput.value}°`
    updateCurrentGradient()
  })

  setupPresetCodeControls({
    copyBtn: DOM.visualPresetCopyCodeBtn,
    applyBtn: DOM.visualPresetApplyCodeBtn,
    input: DOM.visualPresetCodeInput,
    type: "visual",
    getPayload: getVisualPresetPayload,
    applyPayload: applyVisualPresetPayload,
    lineContainer: document.getElementById("visual-preset-code-lines"),
    getCodeRows: getVisualPresetCodeRows,
  })

  setupPresetCodeControls({
    copyBtn: document.getElementById("effect-preset-copy-code-btn"),
    applyBtn: document.getElementById("effect-preset-apply-code-btn"),
    input: document.getElementById("effect-preset-code-input"),
    type: "effect",
    getPayload: getEffectPresetPayload,
    applyPayload: applyEffectPresetPayload,
  })

  setupPresetCodeControls({
    copyBtn: document.getElementById("background-animation-copy-code-btn"),
    applyBtn: document.getElementById("background-animation-apply-code-btn"),
    input: document.getElementById("background-animation-code-input"),
    type: "backgroundAnimation",
    getPayload: getBackgroundAnimationPresetPayload,
    applyPayload: applyBackgroundAnimationPresetPayload,
    lineContainer: document.getElementById("background-animation-code-lines"),
    getCodeRows: getBackgroundAnimationCodeRows,
  })

  setupPresetCodeControls({
    copyBtn: DOM.gradientCopyCodeBtn,
    applyBtn: DOM.gradientApplyCodeBtn,
    input: DOM.gradientPresetCodeInput,
    type: "gradient",
    getPayload: getGradientPresetPayload,
    applyPayload: applyGradientPresetPayload,
  })

  setupPresetCodeControls({
    copyBtn: DOM.multiColorCopyCodeBtn,
    applyBtn: DOM.multiColorApplyCodeBtn,
    input: DOM.multiColorPresetCodeInput,
    type: "multiColor",
    getPayload: getMultiColorPresetPayload,
    applyPayload: applyMultiColorPresetPayload,
  })

  setupPresetCodeControls({
    copyBtn: DOM.svgWaveCopyCodeBtn,
    applyBtn: DOM.svgWaveApplyCodeBtn,
    input: DOM.svgWavePresetCodeInput,
    type: "svgWave",
    getPayload: getSvgWavePresetPayload,
    applyPayload: applySvgWavePresetPayload,
  })

  DOM.gradientToggleBtn?.addEventListener("click", () => {
    const nextIsOpen =
      DOM.gradientSettingsBody?.classList.contains("is-collapsed") ?? true
    setGradientControlsExpanded(nextIsOpen)
    updateSetting("gradientControlsOpen", nextIsOpen)
    saveSettings()
  })

  DOM.randomGradientColorsBtn?.addEventListener("click", () => {
    updateSetting("activeBgUid", null)
    const extraCount = Math.min(
      5,
      Math.max(
        0,
        DOM.gradientExtraColorCount?.value !== undefined
          ? Number(DOM.gradientExtraColorCount.value)
          : 2,
      ),
    )
    const palette = generateHarmonizedPalette(extraCount + 2)
    const [start, ...rest] = palette
    const end = rest[rest.length - 1]
    const middle = rest.slice(0, -1)
    const randomAngle = Math.floor(Math.random() * 361)

    DOM.gradientStartPicker.value = start
    DOM.gradientEndPicker.value = end
    DOM.gradientAngleInput.value = randomAngle
    DOM.gradientAngleValue.textContent = randomAngle
    if (DOM.gradientCustomColors) {
      DOM.gradientCustomColors.value = middle.join(", ")
    }

    renderGradientExtraColorPickers()
    updateCurrentGradient()
  })

  DOM.generateModernGradientBtn?.addEventListener("click", () => {
    updateSetting("activeBgUid", null)
    const selected =
      MODERN_GRADIENT_PRESETS[
        Math.floor(Math.random() * MODERN_GRADIENT_PRESETS.length)
      ]

    DOM.gradientStartPicker.value = selected.start
    DOM.gradientEndPicker.value = selected.end
    DOM.gradientAngleInput.value = selected.angle
    DOM.gradientAngleValue.textContent = selected.angle
    if (DOM.gradientTypeSelect) DOM.gradientTypeSelect.value = selected.type
    if (DOM.gradientRepeatingToggle)
      DOM.gradientRepeatingToggle.checked = selected.repeating
    if (DOM.gradientExtraColorCount)
      DOM.gradientExtraColorCount.value = String(
        selected.extraColorCount !== undefined ? selected.extraColorCount : 2,
      )
    if (DOM.gradientCustomColors)
      DOM.gradientCustomColors.value = selected.customColors || ""
    if (DOM.gradientPositionSelect)
      DOM.gradientPositionSelect.value = selected.position || "center"
    if (DOM.gradientRadialShapeSelect)
      DOM.gradientRadialShapeSelect.value = selected.radialShape || "circle"

    renderGradientExtraColorPickers()
    updateCurrentGradient()
  })

  DOM.saveGradientBtn.addEventListener("click", () => {
    const settings = getSettings()
    const newGradient = {
      start: DOM.gradientStartPicker.value,
      end: DOM.gradientEndPicker.value,
      angle: DOM.gradientAngleInput.value,
      type: DOM.gradientTypeSelect?.value || "linear",
      repeating: DOM.gradientRepeatingToggle?.checked === true,
      extraColorCount:
        DOM.gradientExtraColorCount?.value !== undefined
          ? Number(DOM.gradientExtraColorCount.value)
          : 2,
      customColors: DOM.gradientCustomColors?.value || "",
      position: DOM.gradientPositionSelect?.value || "center",
      radialShape: DOM.gradientRadialShapeSelect?.value || "circle",
      uid: `grad-${Date.now()}`,
    }
    const alreadyExists = settings.userGradients.some(
      (g) =>
        g.start === newGradient.start &&
        g.end === newGradient.end &&
        g.angle === newGradient.angle &&
        (g.type || "linear") === newGradient.type &&
        (g.repeating === true) === newGradient.repeating &&
        Number(g.extraColorCount !== undefined ? g.extraColorCount : 2) ===
          newGradient.extraColorCount &&
        (g.customColors || "") === newGradient.customColors &&
        (g.position || "center") === newGradient.position &&
        (g.radialShape || "circle") === newGradient.radialShape,
    )
    if (!alreadyExists) {
      if (settings.userGradients.length >= 10) {
        showAlert("You can only save up to 10 custom gradients.")
        return
      }
      settings.userGradients.push(newGradient)
      saveSettings()
      renderUserGradients(DOM)
      updateSettingsInputs()
    }
  })

  // User gradient gallery
  DOM.userGradientsGallery.addEventListener("click", (e) => {
    e.stopPropagation()
    // Check selection mode from DOM attribute
    if (DOM.userGradientsGallery.dataset.selectMode === "true") return

    const item = e.target.closest(".user-gradient-item")
    if (item && !e.target.closest(".remove-bg-btn")) {
      const gradient = {
        start: item.dataset.start,
        end: item.dataset.end,
        angle: item.dataset.angle,
        type: item.dataset.type || "linear",
        repeating: item.dataset.repeating === "true",
        extraColorCount: Number(item.dataset.extraColorCount ?? 2),
        customColors: item.dataset.customColors || "",
        position: item.dataset.position || "center",
        radialShape: item.dataset.radialShape || "circle",
        uid: item.dataset.uid || null,
      }
      if (DOM.gradientExtraColorCount) {
        DOM.gradientExtraColorCount.value = String(gradient.extraColorCount)
      }
      if (DOM.gradientCustomColors) {
        DOM.gradientCustomColors.value = gradient.customColors
      }
      if (DOM.gradientPositionSelect) {
        DOM.gradientPositionSelect.value = gradient.position
      }
      if (DOM.gradientRadialShapeSelect) {
        DOM.gradientRadialShapeSelect.value = gradient.radialShape
      }
      renderGradientExtraColorPickers()
      updateSetting("activeBgUid", item.dataset.uid || null)
      handleSettingUpdate(null, gradient, true)
      updateSettingsInputs()
    }
  })

  setGradientControlsExpanded(getSettings().gradientControlsOpen !== false)
  renderGradientExtraColorPickers()

  // SVG Wave listeners
  function _applyWaveFromInputs(fade = false) {
    if (!getSettings().svgWaveActive) {
      updateSetting("svgWaveActive", true)
      updateSetting("background", null)
    }
    updateSetting("svgWaveLines", +DOM.svgWaveLines.value)
    updateSetting("svgWaveAmplitudeX", +DOM.svgWaveAmpX.value)
    updateSetting("svgWaveAmplitudeY", +DOM.svgWaveAmpY.value)
    updateSetting("svgWaveOffsetX", +DOM.svgWaveOffsetX.value)
    updateSetting("svgWaveAngle", +DOM.svgWaveAngle.value)
    updateSetting("svgWaveSmoothness", +DOM.svgWaveSmoothness.value)
    updateSetting("svgWaveFill", DOM.svgWaveFill.checked)
    updateSetting("svgWaveCraziness", +DOM.svgWaveCraziness.value)
    updateSetting("svgWaveStartHue", +DOM.svgWaveStartHue.value)
    updateSetting("svgWaveStartSaturation", +DOM.svgWaveStartSat.value)
    updateSetting("svgWaveStartLightness", +DOM.svgWaveStartLight.value)
    updateSetting("svgWaveEndHue", +DOM.svgWaveEndHue.value)
    updateSetting("svgWaveEndSaturation", +DOM.svgWaveEndSat.value)
    updateSetting("svgWaveEndLightness", +DOM.svgWaveEndLight.value)
    saveSettings()
    updateWaveColorPreviews(
      getSettings(),
      DOM.svgWaveStartPreview,
      DOM.svgWaveEndPreview,
    )
    effects.svgWaveEffect.update(getSvgWaveParams(getSettings()), fade)
    if (!effects.svgWaveEffect.active)
      effects.svgWaveEffect.start(getSvgWaveParams(getSettings()))
    window.appScheduleAutoAccentUpdate?.()
  }

  DOM.svgWaveToggleBtn.addEventListener("click", () => {
    const isCurrentlyOpen =
      localStorage.getItem("startpage_svgWaveGeneratorOpen") === "1"
    const nowOpen = !isCurrentlyOpen
    localStorage.setItem("startpage_svgWaveGeneratorOpen", nowOpen ? "1" : "0")

    DOM.svgWaveToggleBtn.classList.toggle("active", nowOpen)
    DOM.svgWaveToggleBtn.setAttribute("aria-expanded", String(nowOpen))

    const settings = getSettings()
    // Mở ra thì tự động bật sóng nếu chưa bật
    if (nowOpen && !settings.svgWaveActive) {
      updateSetting("svgWaveActive", true)
      updateSetting("background", null)
      saveSettings()
      window.appScheduleAutoAccentUpdate?.()
    }
    applySettings()
    updateSettingsInputs()
  })

  DOM.svgWaveCrazyBtn.addEventListener("click", () => {
    const crazyParams = effects.svgWaveEffect.randomize()
    crazyParams.craziness = 150 + Math.floor(Math.random() * 100)
    crazyParams.amplitudeY = 40 + Math.floor(Math.random() * 160)
    crazyParams.lines = 6 + Math.floor(Math.random() * 10)
    updateSetting("svgWaveLines", crazyParams.lines)
    updateSetting("svgWaveAmplitudeX", crazyParams.amplitudeX)
    updateSetting("svgWaveAmplitudeY", crazyParams.amplitudeY)
    updateSetting("svgWaveOffsetX", crazyParams.offsetX)
    updateSetting("svgWaveSmoothness", crazyParams.smoothness)
    updateSetting("svgWaveFill", crazyParams.fill)
    updateSetting("svgWaveCraziness", crazyParams.craziness)
    updateSetting("svgWaveAngle", crazyParams.angle)
    updateSetting("svgWaveStartHue", crazyParams.startHue)
    updateSetting("svgWaveStartSaturation", crazyParams.startSaturation)
    updateSetting("svgWaveStartLightness", crazyParams.startLightness)
    updateSetting("svgWaveEndHue", crazyParams.endHue)
    updateSetting("svgWaveEndSaturation", crazyParams.endSaturation)
    updateSetting("svgWaveEndLightness", crazyParams.endLightness)
    updateSetting("svgWaveActive", true)
    updateSetting("background", null)
    saveSettings()
    updateSettingsInputs()
    effects.svgWaveEffect.start(getSvgWaveParams(getSettings()))
    window.appScheduleAutoAccentUpdate?.()
  })

  DOM.svgWaveAnglePresetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const angle = +btn.dataset.angle
      DOM.svgWaveAngle.value = angle
      DOM.svgWaveAngleValue.textContent = angle
      _applyWaveFromInputs()
    })
  })

  DOM.svgWaveCloseBtn.addEventListener("click", () => {
    localStorage.setItem("startpage_svgWaveGeneratorOpen", "0")
    applySettings()
  })

  DOM.svgWaveRandomizeBtn.addEventListener("click", () => {
    const randomParams = effects.svgWaveEffect.randomize()
    updateSetting("svgWaveLines", randomParams.lines)
    updateSetting("svgWaveAmplitudeX", randomParams.amplitudeX)
    updateSetting("svgWaveAmplitudeY", randomParams.amplitudeY)
    updateSetting("svgWaveOffsetX", randomParams.offsetX)
    updateSetting("svgWaveSmoothness", randomParams.smoothness)
    updateSetting("svgWaveFill", randomParams.fill)
    updateSetting("svgWaveCraziness", randomParams.craziness)
    updateSetting("svgWaveAngle", randomParams.angle)
    updateSetting("svgWaveStartHue", randomParams.startHue)
    updateSetting("svgWaveStartSaturation", randomParams.startSaturation)
    updateSetting("svgWaveStartLightness", randomParams.startLightness)
    updateSetting("svgWaveEndHue", randomParams.endHue)
    updateSetting("svgWaveEndSaturation", randomParams.endSaturation)
    updateSetting("svgWaveEndLightness", randomParams.endLightness)
    updateSetting("svgWaveActive", true)
    updateSetting("background", null)
    saveSettings()
    updateSettingsInputs()
    const rParams = getSvgWaveParams(getSettings())
    if (effects.svgWaveEffect.active) {
      effects.svgWaveEffect.update(rParams)
    } else {
      effects.svgWaveEffect.start(rParams)
    }
    window.appScheduleAutoAccentUpdate?.()
  })

  DOM.svgWaveSaveBtn.addEventListener("click", () => {
    const settings = getSettings()
    const wave = {
      ...getSvgWaveParams(settings),
      uid: `svg-wave-${Date.now()}`,
    }
    if (!Array.isArray(settings.userSvgWaves)) settings.userSvgWaves = []
    if (settings.userSvgWaves.length >= 50) {
      showAlert("You can only save up to 50 wave presets.")
      return
    }
    settings.userSvgWaves.push(wave)
    saveSettings()
    renderUserSvgWaves(DOM, effects.svgWaveEffect, () => {
      applySettings()
      updateSettingsInputs()
    })
  })

  // Wave sliders
  const waveSliders = [
    [DOM.svgWaveLines, DOM.svgWaveLinesValue],
    [DOM.svgWaveAmpX, DOM.svgWaveAmpXValue],
    [DOM.svgWaveAmpY, DOM.svgWaveAmpYValue],
    [DOM.svgWaveOffsetX, DOM.svgWaveOffsetXValue],
    [DOM.svgWaveAngle, DOM.svgWaveAngleValue],
    [DOM.svgWaveSmoothness, DOM.svgWaveSmoothnessValue],
    [DOM.svgWaveCraziness, DOM.svgWaveCrazinessValue],
    [DOM.svgWaveStartHue, DOM.svgWaveStartHueValue],
    [DOM.svgWaveStartSat, DOM.svgWaveStartSatValue],
    [DOM.svgWaveStartLight, DOM.svgWaveStartLightValue],
    [DOM.svgWaveEndHue, DOM.svgWaveEndHueValue],
    [DOM.svgWaveEndSat, DOM.svgWaveEndSatValue],
    [DOM.svgWaveEndLight, DOM.svgWaveEndLightValue],
  ]
  let _waveApplyTimer = null
  waveSliders.forEach(([input, label]) => {
    input.addEventListener("input", () => {
      label.textContent = input.value
      clearTimeout(_waveApplyTimer)
      _waveApplyTimer = setTimeout(() => _applyWaveFromInputs(true), 350)
    })
  })
  DOM.svgWaveFill.addEventListener("change", () => {
    clearTimeout(_waveApplyTimer)
    _waveApplyTimer = setTimeout(() => _applyWaveFromInputs(true), 350)
  })

  // Effect grid
  DOM.effectGrid.addEventListener("click", (e) => {
    const item = e.target.closest(".effect-item")
    if (item) handleSettingUpdate("effect", item.dataset.value)
  })

  DOM.performanceModeBtns?.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode || "auto"
      DOM.performanceModeBtns.forEach((item) =>
        item.classList.toggle("active", item.dataset.mode === mode),
      )
      handleSettingUpdate("performanceMode", mode)
    })
  })

  if (DOM.pixelWeatherStyleSelect) {
    DOM.pixelWeatherStyleSelect.addEventListener("change", (e) => {
      handleSettingUpdate("pixelWeatherStyle", e.target.value)
    })
  }
  if (DOM.pixelWeatherResolutionSlider) {
    DOM.pixelWeatherResolutionSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value)
      if (DOM.pixelWeatherResolutionVal)
        DOM.pixelWeatherResolutionVal.textContent = val
      handleSettingUpdate("pixelWeatherResolution", val)
    })
  }

  if (DOM.pixelWeatherSpeedSlider) {
    DOM.pixelWeatherSpeedSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value)
      if (DOM.pixelWeatherSpeedVal)
        DOM.pixelWeatherSpeedVal.textContent = val.toFixed(1)
      handleSettingUpdate("pixelWeatherSpeed", val)
    })
  }

  if (DOM.pixelWeatherSizeSlider) {
    DOM.pixelWeatherSizeSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value)
      if (DOM.pixelWeatherSizeVal)
        DOM.pixelWeatherSizeVal.textContent = val.toFixed(1)
      handleSettingUpdate("pixelWeatherSize", val)
    })
  }

  if (DOM.pixelWeatherDensitySlider) {
    DOM.pixelWeatherDensitySlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value)
      if (DOM.pixelWeatherDensityVal)
        DOM.pixelWeatherDensityVal.textContent = val.toFixed(1)
      handleSettingUpdate("pixelWeatherDensity", val)
    })
  }

  if (DOM.skyLanternsTypeSelect) {
    DOM.skyLanternsTypeSelect.addEventListener("change", (e) => {
      handleSettingUpdate("skyLanternsType", e.target.value)
    })
  }

  DOM.effectSearch.addEventListener("input", () => {
    const q = DOM.effectSearch.value.toLowerCase()

    // Hide/show effects
    DOM.effectGrid.querySelectorAll(".effect-item").forEach((el) => {
      const searchTerms = el.dataset.search || ""
      const name = el.querySelector(".effect-name").textContent.toLowerCase()
      el.style.display =
        searchTerms.toLowerCase().includes(q) || name.includes(q) ? "" : "none"
    })

    // Hide/show category headers if all items under them are hidden
    DOM.effectGrid
      .querySelectorAll(".effect-category-header")
      .forEach((header) => {
        let next = header.nextElementSibling
        let hasVisible = false
        while (next && !next.classList.contains("effect-category-header")) {
          if (
            next.classList.contains("effect-item") &&
            next.style.display !== "none"
          ) {
            hasVisible = true
            break
          }
          next = next.nextElementSibling
        }
        header.style.display = hasVisible ? "flex" : "none"
      })
  })

  // Add context menu for effects
  DOM.effectGrid.addEventListener("contextmenu", async (e) => {
    const item = e.target.closest(".effect-item")
    if (item) {
      e.preventDefault()
      const { showContextMenu } = await import("../contextMenu.js")
      showContextMenu(e.clientX, e.clientY, -1, "effect", item.dataset.value)
    }
  })

  // Handle favorite changed event to update UI
  window.addEventListener("effectFavoriteChanged", (e) => {
    updateEffectFavoriteUI()
  })

  function updateEffectFavoriteUI() {
    const settings = getSettings()
    const favoriteEffects = settings.favoriteEffects || []
    DOM.effectGrid.querySelectorAll(".effect-item").forEach((el) => {
      const effectId = el.dataset.value
      const isFav = favoriteEffects.includes(effectId)

      let favIcon = el.querySelector(".effect-favorite-icon")
      if (isFav) {
        if (!favIcon) {
          favIcon = document.createElement("span")
          favIcon.className = "effect-favorite-icon"
          favIcon.innerHTML = '<i class="fa-solid fa-star"></i>'
          favIcon.style.position = "absolute"
          favIcon.style.top = "5px"
          favIcon.style.right = "5px"
          favIcon.style.color = "#ffcc00"
          favIcon.style.fontSize = "0.7rem"
          el.style.position = "relative"
          el.appendChild(favIcon)
        }
      } else if (favIcon) {
        favIcon.remove()
      }
    })
  }

  // Initial UI update for favorites
  updateEffectFavoriteUI()

  // Font management
  DOM.loadCustomFontBtn?.addEventListener("click", () => {
    const fontName = DOM.customFontInput?.value?.trim()
    if (!fontName) {
      showAlert(i18n.alert_font_error || "Please enter a font name.")
      return
    }
    loadGoogleFont(fontName)
    setTimeout(() => {
      const fontValue = `'${fontName}', sans-serif`
      handleSettingUpdate("font", fontValue)
      saveSettings()
      renderFontGrid(DOM.fontGrid, handleSettingUpdate)
      if (DOM.customFontInput) DOM.customFontInput.value = ""
    }, 500)
  })

  DOM.saveFontBtn?.addEventListener("click", () => {
    const fontName = DOM.customFontInput?.value?.trim()
    if (!fontName) {
      showAlert(i18n.alert_font_error || "Please enter a font name.")
      return
    }
    const settings = getSettings()
    const savedFonts = settings.userSavedFonts || []
    const isAlreadySaved = savedFonts.some((f) => {
      const name = typeof f === "string" ? f : f.label
      return name === fontName
    })

    if (isAlreadySaved) {
      showAlert(i18n.alert_font_already_saved || "Font already saved.")
      return
    }
    loadGoogleFont(fontName)
    setTimeout(() => {
      const fontValue = `'${fontName}', sans-serif`
      handleSettingUpdate("font", fontValue)
      updateSetting("userSavedFonts", [...savedFonts, fontName])
      saveSettings()
      renderFontGrid(DOM.fontGrid, handleSettingUpdate)
      if (DOM.customFontInput) DOM.customFontInput.value = ""
    }, 500)
  })

  // Date/time settings
  // Date Format Cards
  const dateFormatCards = document.querySelectorAll(".date-format-card")
  dateFormatCards.forEach((card) => {
    card.addEventListener("click", () => {
      const val = card.dataset.value
      handleSettingUpdate("dateFormat", val)

      dateFormatCards.forEach((c) => c.classList.remove("active"))
      card.classList.add("active")

      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "dateFormat", value: val },
        }),
      )
    })
  })
  DOM.clockDateLanguageSelect?.addEventListener("change", () => {
    handleSettingUpdate(
      "clockDateLanguage",
      DOM.clockDateLanguageSelect.value || "auto",
    )
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "clockDateLanguage",
          value: DOM.clockDateLanguageSelect.value || "auto",
        },
      }),
    )
  })

  DOM.shortWeekdayCheckbox?.addEventListener("change", () => {
    handleSettingUpdate("shortWeekday", DOM.shortWeekdayCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "shortWeekday",
          value: DOM.shortWeekdayCheckbox.checked,
        },
      }),
    )
  })

  // Time Format Cards
  const timeFormatCards = document.querySelectorAll(".time-format-card")
  timeFormatCards.forEach((card) => {
    card.addEventListener("click", () => {
      const val = card.dataset.value
      handleSettingUpdate("timeFormat", val)

      timeFormatCards.forEach((c) => c.classList.remove("active"))
      card.classList.add("active")

      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "timeFormat", value: val },
        }),
      )
    })
  })

  DOM.timezoneSelect?.addEventListener("change", () => {
    handleSettingUpdate("timezone", DOM.timezoneSelect.value)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "timezone", value: DOM.timezoneSelect.value },
      }),
    )
  })

  DOM.hideSecondsCheckbox?.addEventListener("change", () => {
    handleSettingUpdate("hideSeconds", DOM.hideSecondsCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "hideSeconds", value: DOM.hideSecondsCheckbox.checked },
      }),
    )
  })

  DOM.clockDatePrioritySelect?.addEventListener("change", () => {
    handleSettingUpdate("clockDatePriority", DOM.clockDatePrioritySelect.value)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "clockDatePriority",
          value: DOM.clockDatePrioritySelect.value,
        },
      }),
    )
  })

  // Clock Style Card Grid
  const clockCards = document.querySelectorAll(".clock-style-card:not(.date-format-card):not(.time-format-card):not(.font-target-card)")
  clockCards.forEach((card) => {
    card.addEventListener("click", () => {
      const val = card.dataset.value
      handleSettingUpdate("dateClockStyle", val)

      // SPECIAL: Logic for Weekday Style and Clock Display Mode synchronization
      if (val === "weekday-style") {
        handleSettingUpdate("clockDisplayMode", "weekday")
        if (DOM.clockDisplaySelect) DOM.clockDisplaySelect.value = "weekday"
      } else {
        // If switching AWAY from weekday-style, and we were in weekday display mode,
        // switch back to 'all' so the clock is visible in the new style.
        const settings = getSettings()
        if (settings.clockDisplayMode === "weekday") {
          handleSettingUpdate("clockDisplayMode", "all")
          if (DOM.clockDisplaySelect) DOM.clockDisplaySelect.value = "all"
        }
      }

      // Update UI
      clockCards.forEach((c) => c.classList.remove("active"))
      card.classList.add("active")

      // Sync hidden select if it exists
      if (DOM.clockDateStyleSelect) DOM.clockDateStyleSelect.value = val

      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "dateClockStyle", value: val },
        }),
      )

      updateSettingsInputs()
    })
  })

  // Initialization logic for other components...

  DOM.clockDateStyleSelect?.addEventListener("change", () => {
    handleSettingUpdate("dateClockStyle", DOM.clockDateStyleSelect.value)

    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "dateClockStyle",
          value: DOM.clockDateStyleSelect.value,
        },
      }),
    )

    updateSettingsInputs()
  })

  DOM.framedClockThemeSelect?.addEventListener("change", () => {
    handleSettingUpdate("framedClockTheme", DOM.framedClockThemeSelect.value)

    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "framedClockTheme",
          value: DOM.framedClockThemeSelect.value,
        },
      }),
    )
  })

  DOM.clockStyleBgSelect?.addEventListener("change", () => {
    const settings = getSettings()
    const value =
      DOM.clockStyleBgSelect.value === "animated" &&
      settings.dateClockStyle !== "prism-stack"
        ? "default"
        : DOM.clockStyleBgSelect.value
    DOM.clockStyleBgSelect.value = value
    handleSettingUpdate("clockStyleBackground", value)
    handleSettingUpdate(
      "clockStyleTransparentBackground",
      value === "transparent",
    )
    if (DOM.clockStyleCustomBgSetting) {
      DOM.clockStyleCustomBgSetting.style.display =
        value === "custom" ? "flex" : "none"
    }

    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "clockStyleBackground",
          value,
        },
      }),
    )
  })

  DOM.clockStyleCustomBgColor?.addEventListener("input", () => {
    const color = /^#[0-9a-f]{6}$/i.test(DOM.clockStyleCustomBgColor.value)
      ? DOM.clockStyleCustomBgColor.value
      : "#1f2937"
    handleSettingUpdate("clockStyleCustomBgColor", color)
    document.documentElement.style.setProperty(
      "--clock-style-custom-bg-color",
      color,
    )

    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "clockStyleCustomBgColor",
          value: color,
        },
      }),
    )
  })

  DOM.clockStyleCustomBgColor?.addEventListener("change", () => {
    const color = /^#[0-9a-f]{6}$/i.test(DOM.clockStyleCustomBgColor.value)
      ? DOM.clockStyleCustomBgColor.value
      : "#1f2937"
    handleSettingUpdate("clockStyleCustomBgColor", color)
  })

  DOM.clockStyleUseM3AccentCheckbox?.addEventListener("change", () => {
    const settings = getSettings()
    const style = settings.dateClockStyle || "default"
    const nextValue = DOM.clockStyleUseM3AccentCheckbox.checked
    handleSettingUpdate("clockStyleUseM3Accent", {
      ...(settings.clockStyleUseM3Accent || {}),
      [style]: nextValue,
    })
    if (DOM.clockStyleAccentColorSetting) {
      DOM.clockStyleAccentColorSetting.style.display = nextValue ? "none" : "flex"
    }

    const color = nextValue
      ? getComputedStyle(document.documentElement)
          .getPropertyValue("--accent-color")
          .trim() ||
        settings.accentColor ||
        "#00ff73"
      : DOM.clockStyleAccentColor?.value || "#ffffff"
    const rgb = nextValue
      ? getComputedStyle(document.documentElement)
          .getPropertyValue("--accent-color-rgb")
          .trim()
      : ""
    const customRgb = hexToRgb(color)
    const colorRgb =
      rgb ||
      (customRgb ? `${customRgb.r}, ${customRgb.g}, ${customRgb.b}` : "255, 255, 255")
    document.documentElement.style.setProperty(
      "--clock-style-accent-color",
      color,
    )
    document.documentElement.style.setProperty("--clock-style-accent-rgb", colorRgb)
    document
      .querySelector(".clock-date-wrap")
      ?.style.setProperty("--accent-color", color)
    document
      .querySelector(".clock-date-wrap")
      ?.style.setProperty("--accent-color-rgb", colorRgb)

    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "clockStyleUseM3Accent",
          value: style,
        },
      }),
    )
  })

  DOM.clockStyleAccentColor?.addEventListener("input", () => {
    const settings = getSettings()
    const style = settings.dateClockStyle || "default"
    const color = /^#[0-9a-f]{6}$/i.test(DOM.clockStyleAccentColor.value)
      ? DOM.clockStyleAccentColor.value
      : "#ffffff"
    const rgb = hexToRgb(color)
    handleSettingUpdate("clockStyleAccentColors", {
      ...(settings.clockStyleAccentColors || {}),
      [style]: color,
    })
    document.documentElement.style.setProperty(
      "--clock-style-accent-color",
      color,
    )
    document.documentElement.style.setProperty(
      "--clock-style-accent-rgb",
      rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : "255, 255, 255",
    )
    document
      .querySelector(".clock-date-wrap")
      ?.style.setProperty("--accent-color", color)
    document
      .querySelector(".clock-date-wrap")
      ?.style.setProperty(
        "--accent-color-rgb",
        rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : "255, 255, 255",
      )

    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "clockStyleAccentColors",
          value: style,
        },
      }),
    )
  })

  DOM.clockStyleAccentColor?.addEventListener("change", () => {
    const settings = getSettings()
    const style = settings.dateClockStyle || "default"
    const color = /^#[0-9a-f]{6}$/i.test(DOM.clockStyleAccentColor.value)
      ? DOM.clockStyleAccentColor.value
      : "#ffffff"
    handleSettingUpdate("clockStyleAccentColors", {
      ...(settings.clockStyleAccentColors || {}),
      [style]: color,
    })
  })

  DOM.clockStyleAccentResetBtn?.addEventListener("click", () => {
    const settings = getSettings()
    const style = settings.dateClockStyle || "default"
    const nextColors = { ...(settings.clockStyleAccentColors || {}) }
    delete nextColors[style]
    handleSettingUpdate("clockStyleAccentColors", nextColors)
    if (DOM.clockStyleAccentColor) DOM.clockStyleAccentColor.value = "#ffffff"
    document.documentElement.style.setProperty(
      "--clock-style-accent-color",
      "#ffffff",
    )
    document.documentElement.style.setProperty(
      "--clock-style-accent-rgb",
      "255, 255, 255",
    )
    document
      .querySelector(".clock-date-wrap")
      ?.style.setProperty("--accent-color", "#ffffff")
    document
      .querySelector(".clock-date-wrap")
      ?.style.setProperty("--accent-color-rgb", "255, 255, 255")

    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "clockStyleAccentColors",
          value: style,
        },
      }),
    )
  })

  DOM.cartoonClockAnimationCheckbox?.addEventListener("change", () => {
    handleSettingUpdate(
      "cartoonClockAnimation",
      DOM.cartoonClockAnimationCheckbox.checked,
    )

    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "cartoonClockAnimation",
          value: DOM.cartoonClockAnimationCheckbox.checked,
        },
      }),
    )
  })

  DOM.terminalClockVariantSelect?.addEventListener("change", () => {
    const value = ["window", "linux", "macos"].includes(
      DOM.terminalClockVariantSelect.value,
    )
      ? DOM.terminalClockVariantSelect.value
      : "window"
    handleSettingUpdate("terminalClockVariant", value)

    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "terminalClockVariant",
          value,
        },
      }),
    )
  })

  DOM.fliqloThemeSelect?.addEventListener("change", () => {
    handleSettingUpdate("fliqloTheme", DOM.fliqloThemeSelect.value)
    
    const divergenceColorSetting = document.getElementById("fliqlo-divergence-color-setting")
    if (divergenceColorSetting) {
      divergenceColorSetting.style.display = DOM.fliqloThemeSelect.value === "divergence" ? "flex" : "none"
    }

    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "fliqloTheme",
          value: DOM.fliqloThemeSelect.value,
        },
      }),
    )
  })

  const divergenceColorInput = document.getElementById("fliqlo-divergence-color")
  if (divergenceColorInput) {
    divergenceColorInput.addEventListener("input", (e) => {
      document.documentElement.style.setProperty("--fliqlo-divergence-color", e.target.value)
      handleSettingUpdate("fliqloDivergenceColor", e.target.value)
    })
  }

  DOM.fliqloZenCheckbox?.addEventListener("change", () => {
    handleSettingUpdate("fliqloZenMode", DOM.fliqloZenCheckbox.checked)

    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "fliqloZenMode",
          value: DOM.fliqloZenCheckbox.checked,
        },
      }),
    )
  })

  DOM.fliqloTransparentCheckbox?.addEventListener("change", () => {
    handleSettingUpdate(
      "fliqloTransparent",
      DOM.fliqloTransparentCheckbox.checked,
    )

    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "fliqloTransparent",
          value: DOM.fliqloTransparentCheckbox.checked,
        },
      }),
    )
  })

  DOM.sidestyleAlignSelect?.addEventListener("change", () => {
    handleSettingUpdate("sidestyleAlign", DOM.sidestyleAlignSelect.value)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "sidestyleAlign",
          value: DOM.sidestyleAlignSelect.value,
        },
      }),
    )
  })

  document.getElementById("audio-wave-position-select")?.addEventListener("change", (e) => {
    handleSettingUpdate("audioWavePosition", e.target.value)
    applySettings()
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "audioWavePosition",
          value: e.target.value,
        },
      }),
    )
  })

  const audioWaveScaleInput = document.getElementById("audio-wave-scale-input")
  const audioWaveScaleVal = document.getElementById("audio-wave-scale-val")
  if (audioWaveScaleInput && audioWaveScaleVal) {
    audioWaveScaleInput.addEventListener("input", (e) => {
      audioWaveScaleVal.textContent = e.target.value
    })
    audioWaveScaleInput.addEventListener("change", (e) => {
      handleSettingUpdate("audioWaveScale", parseFloat(e.target.value))
      applySettings()
      window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "audioWaveScale", value: parseFloat(e.target.value) } }))
    })
  }

  document.getElementById("audio-wave-style-select")?.addEventListener("change", (e) => {
    handleSettingUpdate("audioWaveStyle", e.target.value)
    applySettings()
    window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "audioWaveStyle", value: e.target.value } }))
  })

  document.getElementById("audio-wave-speed-select")?.addEventListener("change", (e) => {
    handleSettingUpdate("audioWaveSpeed", parseFloat(e.target.value))
    applySettings()
    window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "audioWaveSpeed", value: parseFloat(e.target.value) } }))
  })

  document.getElementById("audio-wave-auto-color-checkbox")?.addEventListener("change", (e) => {
    handleSettingUpdate("audioWaveAutoColor", e.target.checked)
    applySettings()
    window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "audioWaveAutoColor", value: e.target.checked } }))
  })

  document.getElementById("audio-wave-color-picker")?.addEventListener("change", (e) => {
    handleSettingUpdate("audioWaveCustomColor", e.target.value)
    applySettings()
    window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "audioWaveCustomColor", value: e.target.value } }))
  })

  document.getElementById("gf-animation-select")?.addEventListener("change", (e) => {
    handleSettingUpdate("gfAnimation", e.target.value)
    applySettings()
    window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "gfAnimation", value: e.target.value } }))
  })

  document.getElementById("gf-custom-text")?.addEventListener("input", (e) => {
    handleSettingUpdate("gfCustomText", e.target.value)
    applySettings()
    window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "gfCustomText", value: e.target.value } }))
  })
  
  document.getElementById("gf-glow-color")?.addEventListener("input", (e) => {
    handleSettingUpdate("gfGlowColor", e.target.value)
    applySettings()
    window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "gfGlowColor", value: e.target.value } }))
  })



  DOM.sidestyleNoBorderCheckbox?.addEventListener("change", () => {
    handleSettingUpdate(
      "sidestyleNoBorder",
      DOM.sidestyleNoBorderCheckbox.checked,
    )
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "sidestyleNoBorder",
          value: DOM.sidestyleNoBorderCheckbox.checked,
        },
      }),
    )
  })

  const attachCoolStyleListeners = () => {
    const inputs = [
      { id: "cool-greeting-morning-input", key: "coolGreetingMorning", isStr: true },
      { id: "cool-greeting-afternoon-input", key: "coolGreetingAfternoon", isStr: true },
      { id: "cool-greeting-evening-input", key: "coolGreetingEvening", isStr: true },
      { id: "cool-bar-top-input", key: "coolBarSymbolTop", isStr: true },
      { id: "cool-bar-bottom-input", key: "coolBarSymbolBottom", isStr: true },
      { id: "cool-bar-scale-input", key: "coolBarScale", isFloat: true }
    ]
    inputs.forEach(item => {
      const el = document.getElementById(item.id)
      if (el) {
        el.addEventListener("input", (e) => {
          let val = e.target.value
          if (item.isFloat) val = parseFloat(val) || 2.5
          handleSettingUpdate(item.key, val)
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: item.key, value: val },
            }),
          )
        })
      }
    })
  }
  attachCoolStyleListeners()

  const codeStyleLanguageSelect = document.getElementById("code-style-language-select")
  if (codeStyleLanguageSelect) {
    codeStyleLanguageSelect.addEventListener("change", (e) => {
      handleSettingUpdate("codeClockLanguage", e.target.value)
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "codeClockLanguage", value: e.target.value },
        }),
      )
    })
  }

  const codeStyleShowDateCheckbox = document.getElementById("code-style-show-date-checkbox")
  if (codeStyleShowDateCheckbox) {
    codeStyleShowDateCheckbox.addEventListener("change", (e) => {
      handleSettingUpdate("codeClockShowDate", e.target.checked)
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "codeClockShowDate", value: e.target.checked },
        }),
      )
    })
  }

  const customAngleInputs = [
    { id: "custom-angle-skewx-input", key: "customAngleSkewX", isFloat: true },
    { id: "custom-angle-skewy-input", key: "customAngleSkewY", isFloat: true },
    { id: "custom-angle-rotate-input", key: "customAngleRotate", isFloat: true },
    { id: "custom-angle-rotatex-input", key: "customAngleRotateX", isFloat: true },
    { id: "custom-angle-rotatey-input", key: "customAngleRotateY", isFloat: true },
    { id: "custom-angle-perspective-input", key: "customAnglePerspective", isFloat: true }
  ]
  customAngleInputs.forEach(item => {
    const el = document.getElementById(item.id)
    if (el) {
      el.addEventListener("input", (e) => {
        let val = parseFloat(e.target.value) || 0
        const valSpan = document.getElementById(item.id.replace("-input", "-value"))
        if (valSpan) {
            valSpan.innerHTML = item.key === "customAnglePerspective" ? val + "px" : val + "&deg;"
        }

        if (item.key === "customAngleSkewX") document.body.style.setProperty("--skewX", val + "deg");
        if (item.key === "customAngleSkewY") document.body.style.setProperty("--skewY", val + "deg");
        if (item.key === "customAngleRotate") document.body.style.setProperty("--rotate", val + "deg");
        if (item.key === "customAngleRotateX") document.body.style.setProperty("--rotateX", val + "deg");
        if (item.key === "customAngleRotateY") document.body.style.setProperty("--rotateY", val + "deg");
        if (item.key === "customAnglePerspective") document.body.style.setProperty("--perspective", val + "px");
        handleSettingUpdate(item.key, val)
        window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: item.key, value: val } }))
      })
    }
  })

  const customAngleResetBtn = document.getElementById("custom-angle-reset-btn")
  if (customAngleResetBtn) {
    customAngleResetBtn.addEventListener("click", () => {
      const defaults = { customAngleSkewX: 15, customAngleSkewY: 0, customAngleRotate: -5, customAngleRotateX: 0, customAngleRotateY: 0, customAnglePerspective: 1000 };
      Object.keys(defaults).forEach(key => {
        handleSettingUpdate(key, defaults[key]);
        const idBase = key.replace(/([A-Z])/g, "-$1").toLowerCase();
        const el = document.getElementById(`${idBase}-input`);
        if (el) el.value = defaults[key];
        const span = document.getElementById(`${idBase}-value`);
        if (span) span.innerHTML = key === "customAnglePerspective" ? defaults[key] + "px" : defaults[key] + "&deg;";
      });
      document.body.style.setProperty("--skewX", "15deg");
      document.body.style.setProperty("--skewY", "0deg");
      document.body.style.setProperty("--rotate", "-5deg");
      document.body.style.setProperty("--rotateX", "0deg");
      document.body.style.setProperty("--rotateY", "0deg");
      document.body.style.setProperty("--perspective", "1000px");
      window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "customAngleReset" } }));
    });
  }

  const presetAngleBtns = document.querySelectorAll(".preset-angle-btn");
  presetAngleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const presetName = btn.getAttribute("data-preset");
      let presetValues = {};
      switch (presetName) {
        case "iso-left":
          presetValues = { customAngleSkewX: 0, customAngleSkewY: 15, customAngleRotate: 5, customAngleRotateX: 20, customAngleRotateY: -25, customAnglePerspective: 1000 };
          break;
        case "iso-right":
          presetValues = { customAngleSkewX: 0, customAngleSkewY: -15, customAngleRotate: -5, customAngleRotateX: 20, customAngleRotateY: 25, customAnglePerspective: 1000 };
          break;
        case "flat-top":
          presetValues = { customAngleSkewX: 0, customAngleSkewY: 0, customAngleRotate: 0, customAngleRotateX: 50, customAngleRotateY: 0, customAnglePerspective: 800 };
          break;
        case "cinematic":
          presetValues = { customAngleSkewX: -10, customAngleSkewY: -5, customAngleRotate: 5, customAngleRotateX: -10, customAngleRotateY: 20, customAnglePerspective: 1200 };
          break;
      }
      
      Object.keys(presetValues).forEach(key => {
        handleSettingUpdate(key, presetValues[key]);
        const idBase = key.replace(/([A-Z])/g, "-$1").toLowerCase();
        const el = document.getElementById(`${idBase}-input`);
        if (el) el.value = presetValues[key];
        const span = document.getElementById(`${idBase}-value`);
        if (span) span.innerHTML = key === "customAnglePerspective" ? presetValues[key] + "px" : presetValues[key] + "&deg;";
      });
      document.body.style.setProperty("--skewX", presetValues.customAngleSkewX + "deg");
      document.body.style.setProperty("--skewY", presetValues.customAngleSkewY + "deg");
      document.body.style.setProperty("--rotate", presetValues.customAngleRotate + "deg");
      document.body.style.setProperty("--rotateX", presetValues.customAngleRotateX + "deg");
      document.body.style.setProperty("--rotateY", presetValues.customAngleRotateY + "deg");
      document.body.style.setProperty("--perspective", presetValues.customAnglePerspective + "px");
      window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "customAnglePreset" } }));
    });
  });

  const globalMaskingInputs = [
    { id: "global-clock-cut-bottom-input", key: "clockCutBottom", isFloat: true },
    { id: "global-clock-fade-bottom-input", key: "clockFadeBottom", isFloat: true }
  ]
  globalMaskingInputs.forEach(item => {
    const el = document.getElementById(item.id)
    if (el) {
      el.addEventListener("input", (e) => {
        let val = parseFloat(e.target.value) || 0
        if (item.key === "clockCutBottom") document.documentElement.style.setProperty("--clock-cut-bottom", val + "px");
        if (item.key === "clockFadeBottom") document.documentElement.style.setProperty("--clock-visible-percent", val + "%");
        handleSettingUpdate(item.key, val)
        window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: item.key, value: val } }))
      })
    }
  })

  const customAngleShowDateCheckbox = document.getElementById("custom-angle-show-date-checkbox")
  if (customAngleShowDateCheckbox) {
    customAngleShowDateCheckbox.addEventListener("change", (e) => {
      handleSettingUpdate("customAngleShowDate", e.target.checked)
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "customAngleShowDate", value: e.target.checked },
        }),
      )
    })
  }

  DOM.sidebarClockFlipCheckbox?.addEventListener("change", () => {
    handleSettingUpdate(
      "sidebarClockFlip",
      DOM.sidebarClockFlipCheckbox.checked,
    )
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "sidebarClockFlip",
          value: DOM.sidebarClockFlipCheckbox.checked,
        },
      }),
    )
  })

  // Font Target Cards
  const fontTargetCards = document.querySelectorAll(".font-target-card")
  fontTargetCards.forEach((card) => {
    card.addEventListener("click", () => {
      const val = card.dataset.value
      handleSettingUpdate("clockFontTarget", val)

      fontTargetCards.forEach((c) => c.classList.remove("active"))
      card.classList.add("active")
    })
  })

  DOM.jpStyleLanguageSelect?.addEventListener("change", () => {
    handleSettingUpdate("jpStyleLanguage", DOM.jpStyleLanguageSelect.value)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "jpStyleLanguage",
          value: DOM.jpStyleLanguageSelect.value,
        },
      }),
    )
  })

  DOM.hueTextModeSelect?.addEventListener("change", () => {
    handleSettingUpdate("hueTextMode", DOM.hueTextModeSelect.value)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "hueTextMode",
          value: DOM.hueTextModeSelect.value,
        },
      }),
    )
  })

  DOM.clockAutoContrastCheckbox?.addEventListener("change", () => {
    handleSettingUpdate(
      "clockAutoContrast",
      DOM.clockAutoContrastCheckbox.checked,
    )
  })

  DOM.clockUseAccentCheckbox?.addEventListener("change", () => {
    handleSettingUpdate(
      "clockUseAccentColor",
      DOM.clockUseAccentCheckbox.checked,
    )
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "clockUseAccentColor",
          value: DOM.clockUseAccentCheckbox.checked,
        },
      }),
    )
  })

  // Accent Target Cards
  const accentTargetCards = document.querySelectorAll(".accent-target-card")
  accentTargetCards.forEach((card) => {
    card.addEventListener("click", () => {
      const val = card.dataset.value
      handleSettingUpdate("clockAccentTarget", val)

      accentTargetCards.forEach((c) => c.classList.remove("active"))
      card.classList.add("active")

      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: {
            key: "clockAccentTarget",
            value: val,
          },
        }),
      )
    })
  })

  // Shadow Target Cards
  const shadowTargetCards = document.querySelectorAll(".shadow-target-card")
  shadowTargetCards.forEach((card) => {
    card.addEventListener("click", () => {
      const val = card.dataset.value
      handleSettingUpdate("clockShadowTarget", val)

      shadowTargetCards.forEach((c) => c.classList.remove("active"))
      card.classList.add("active")
    })
  })

  DOM.clockShadowStrengthInput?.addEventListener("input", () => {
    if (DOM.clockShadowStrengthValue) {
      DOM.clockShadowStrengthValue.textContent = `${DOM.clockShadowStrengthInput.value}%`
    }
    handleSettingUpdate(
      "clockShadowStrength",
      Number(DOM.clockShadowStrengthInput.value) || 0,
    )
  })

  DOM.clockShadowColorPicker?.addEventListener("input", () => {
    handleSettingUpdate("clockShadowColor", DOM.clockShadowColorPicker.value)
  })

  DOM.analogMarkerModeSelect?.addEventListener("change", () => {
    handleSettingUpdate("analogMarkerMode", DOM.analogMarkerModeSelect.value)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "analogMarkerMode",
          value: DOM.analogMarkerModeSelect.value,
        },
      }),
    )
  })

  DOM.analogBlurBgCheckbox?.addEventListener("change", () => {
    handleSettingUpdate(
      "analogBlurBackground",
      DOM.analogBlurBgCheckbox.checked,
    )
  })

  DOM.clockFadeBottomSelect?.addEventListener("change", () => {
    handleSettingUpdate(
      "clockFadeFromBottom",
      DOM.clockFadeBottomSelect.value,
    )
  })

  DOM.clockFadeDirectionSelect?.addEventListener("change", () => {
    handleSettingUpdate(
      "clockFadeDirection",
      DOM.clockFadeDirectionSelect.value,
    )
  })

  DOM.pageTitleInput?.addEventListener("input", () => {
    const newTitle = DOM.pageTitleInput.value.trim() || "Start Page"
    updateSetting("pageTitle", newTitle)
    saveSettings()
    document.title = newTitle
  })

  DOM.pageTitleColorInput?.addEventListener("input", () => {
    updateSetting("pageTitleColor", DOM.pageTitleColorInput.value)
    saveSettings()
    document.documentElement.style.setProperty(
      "--page-title-color",
      DOM.pageTitleColorInput.value,
    )
  })

  DOM.tabIconBgColorInput?.addEventListener("input", () => {
    updateSetting("tabIconBgColor", DOM.tabIconBgColorInput.value)
    saveSettings()
    applyTabIcon(getSettings().tabIcon)
    renderTabIconPreview(getSettings().tabIcon, DOM.tabIconPreview)
  })

  DOM.tabIconTextColorInput?.addEventListener("input", () => {
    updateSetting("tabIconTextColor", DOM.tabIconTextColorInput.value)
    saveSettings()
    applyTabIcon(getSettings().tabIcon)
    renderTabIconPreview(getSettings().tabIcon, DOM.tabIconPreview)
  })

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

  const rasterFileToTabIcon = async (file) => {
    const source = await fileToDataUrl(file)
    if (file.type === "image/svg+xml" || file.type === "image/x-icon") {
      return source
    }

    const img = await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error("Invalid icon image"))
      image.src = source
    })

    const size = 128
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, size, size)

    const scale = Math.min(size / img.width, size / img.height)
    const width = Math.round(img.width * scale)
    const height = Math.round(img.height * scale)
    const x = Math.round((size - width) / 2)
    const y = Math.round((size - height) / 2)
    ctx.drawImage(img, x, y, width, height)
    return canvas.toDataURL("image/png")
  }

  DOM.tabIconInput?.addEventListener("input", () => {
    const raw = DOM.tabIconInput.value
    const chars = getTabIconChars(raw)
    updateSetting("tabIcon", chars)
    updateSetting("tabIconFaClass", "") // clear FA icon when typing text
    saveSettings()
    applyTabIcon(chars)
    renderTabIconPreview(chars, DOM.tabIconPreview)
    if (DOM.tabIconClearBtn) DOM.tabIconClearBtn.hidden = !chars
  })

  DOM.tabIconUploadBtn?.addEventListener("click", () => {
    DOM.tabIconFileInput?.click()
  })

  DOM.tabIconClearBtn?.addEventListener("click", () => {
    updateSetting("tabIcon", "")
    updateSetting("tabIconFaClass", "")
    saveSettings()
    if (DOM.tabIconInput) DOM.tabIconInput.value = ""
    if (DOM.tabIconFileInput) DOM.tabIconFileInput.value = ""
    if (DOM.tabIconClearBtn) DOM.tabIconClearBtn.hidden = true
    applyTabIcon("")
    renderTabIconPreview("", DOM.tabIconPreview)
  })

  DOM.tabIconFileInput?.addEventListener("change", async () => {
    const file = DOM.tabIconFileInput.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      showAlert("Please choose an image file for the tab icon.")
      DOM.tabIconFileInput.value = ""
      return
    }

    try {
      const iconDataUrl = await rasterFileToTabIcon(file)
      updateSetting("tabIcon", iconDataUrl)
      saveSettings()
      if (DOM.tabIconInput) DOM.tabIconInput.value = ""
      if (DOM.tabIconClearBtn) DOM.tabIconClearBtn.hidden = false
      applyTabIcon(iconDataUrl)
      renderTabIconPreview(iconDataUrl, DOM.tabIconPreview)
    } catch (err) {
      console.error("Failed to load tab icon:", err)
      showAlert("Could not use this image as a tab icon.")
    } finally {
      DOM.tabIconFileInput.value = ""
    }
  })

  // Transparent BG toggle
  DOM.tabIconTransparentBgCheckbox?.addEventListener("change", () => {
    const isTransparent = DOM.tabIconTransparentBgCheckbox.checked
    updateSetting("tabIconTransparentBg", isTransparent)
    saveSettings()
    applyTabIcon(getSettings().tabIcon || getSettings().tabIconFaClass)
    renderTabIconPreview(
      getSettings().tabIcon || getSettings().tabIconFaClass,
      DOM.tabIconPreview,
    )
  })

  // FA Icon Picker
  initFaPicker(
    DOM,
    // onSelect: user picked a FA icon class
    (faClass) => {
      updateSetting("tabIconFaClass", faClass)
      updateSetting("tabIcon", faClass)
      saveSettings()
      if (DOM.tabIconInput) DOM.tabIconInput.value = ""
      if (DOM.tabIconClearBtn) DOM.tabIconClearBtn.hidden = false
      applyTabIcon(faClass)
      renderTabIconPreview(faClass, DOM.tabIconPreview)
    },
    // onClear: user cleared the FA icon
    () => {
      updateSetting("tabIconFaClass", "")
      updateSetting("tabIcon", "")
      saveSettings()
      if (DOM.tabIconInput) DOM.tabIconInput.value = ""
      if (DOM.tabIconFileInput) DOM.tabIconFileInput.value = ""
      if (DOM.tabIconClearBtn) DOM.tabIconClearBtn.hidden = true
      applyTabIcon("")
      renderTabIconPreview("", DOM.tabIconPreview)
    },
  )

  DOM.clockSizeInput?.addEventListener("input", () => {
    if (DOM.clockSizeValue)
      DOM.clockSizeValue.textContent = `${DOM.clockSizeInput.value}rem`
    document.documentElement.style.setProperty(
      "--clock-size",
      `${DOM.clockSizeInput.value}rem`,
    )
  })
  DOM.clockSizeInput?.addEventListener("change", () => {
    handleSettingUpdate("clockSize", DOM.clockSizeInput.value)
  })
  
  document.getElementById("clock-size-dec")?.addEventListener("click", () => {
    if (!DOM.clockSizeInput) return;
    DOM.clockSizeInput.value = Math.max(Number(DOM.clockSizeInput.min), Number(DOM.clockSizeInput.value) - Number(DOM.clockSizeInput.step));
    DOM.clockSizeInput.dispatchEvent(new Event("input"));
    DOM.clockSizeInput.dispatchEvent(new Event("change"));
  });
  
  document.getElementById("clock-size-inc")?.addEventListener("click", () => {
    if (!DOM.clockSizeInput) return;
    DOM.clockSizeInput.value = Math.min(Number(DOM.clockSizeInput.max), Number(DOM.clockSizeInput.value) + Number(DOM.clockSizeInput.step));
    DOM.clockSizeInput.dispatchEvent(new Event("input"));
    DOM.clockSizeInput.dispatchEvent(new Event("change"));
  });

  DOM.dateSizeInput?.addEventListener("input", () => {
    if (DOM.dateSizeValue)
      DOM.dateSizeValue.textContent = `${DOM.dateSizeInput.value}rem`
    document.documentElement.style.setProperty(
      "--date-size",
      `${DOM.dateSizeInput.value}rem`,
    )
  })
  DOM.dateSizeInput?.addEventListener("change", () => {
    handleSettingUpdate("dateSize", DOM.dateSizeInput.value)
  })
  
  document.getElementById("date-size-dec")?.addEventListener("click", () => {
    if (!DOM.dateSizeInput) return;
    DOM.dateSizeInput.value = Math.max(Number(DOM.dateSizeInput.min), Number(DOM.dateSizeInput.value) - Number(DOM.dateSizeInput.step));
    DOM.dateSizeInput.dispatchEvent(new Event("input"));
    DOM.dateSizeInput.dispatchEvent(new Event("change"));
  });
  
  document.getElementById("date-size-inc")?.addEventListener("click", () => {
    if (!DOM.dateSizeInput) return;
    DOM.dateSizeInput.value = Math.min(Number(DOM.dateSizeInput.max), Number(DOM.dateSizeInput.value) + Number(DOM.dateSizeInput.step));
    DOM.dateSizeInput.dispatchEvent(new Event("input"));
    DOM.dateSizeInput.dispatchEvent(new Event("change"));
  });

  DOM.clockDateStrokeWidthInput?.addEventListener("input", (e) => {
    if (DOM.clockDateStrokeWidthValue)
      DOM.clockDateStrokeWidthValue.textContent = `${e.target.value}${DOM.bookmarkGroupFontSizeInput?.value || 16}px`
    handleSettingUpdate("clockDateStrokeWidth", parseFloat(e.target.value))
  })

  DOM.clockDateStrokeColorPicker?.addEventListener("input", (e) => {
    document.documentElement.style.setProperty(
      "--clock-date-stroke-color",
      e.target.value,
    )
  })
  DOM.clockDateStrokeColorPicker?.addEventListener("change", (e) => {
    handleSettingUpdate("clockDateStrokeColor", e.target.value)
  })

  DOM.clockDateStrokeTargetSelect?.addEventListener("change", (e) => {
    handleSettingUpdate("clockDateStrokeTarget", e.target.value)
  })

  DOM.clockColorPicker?.addEventListener("input", () => {
    document.documentElement.style.setProperty(
      "--clock-color",
      DOM.clockColorPicker.value,
    )
  })
  DOM.clockColorPicker?.addEventListener("change", () =>
    handleSettingUpdate("clockColor", DOM.clockColorPicker.value),
  )
  DOM.resetClockColorBtn?.addEventListener("click", () =>
    handleSettingUpdate("clockColor", null),
  )

  DOM.dateColorPicker?.addEventListener("input", () => {
    document.documentElement.style.setProperty(
      "--date-color",
      DOM.dateColorPicker.value,
    )
  })
  DOM.dateColorPicker?.addEventListener("change", () =>
    handleSettingUpdate("dateColor", DOM.dateColorPicker.value),
  )
  DOM.resetDateColorBtn?.addEventListener("click", () =>
    handleSettingUpdate("dateColor", null),
  )

  // Reset all settings
  DOM.resetSettingsBtn?.addEventListener("click", async () => {
    const selected = await showChecklistConfirm(
      [
        {
          key: "all",
          label: i18n.reset_opt_all || "Entire Settings",
          checked: true,
        },
        {
          key: "positions",
          label: i18n.reset_opt_positions || "Widget Positions",
          checked: false,
        },
        {
          key: "effects",
          label: i18n.reset_opt_effects || "Effect Customization",
          checked: false,
        },
        {
          key: "styles",
          label: i18n.reset_opt_styles || "Colors & Fonts",
          checked: false,
        },
        {
          key: "media",
          label:
            i18n.reset_opt_media ||
            "Delete all uploaded Images & Videos (IndexedDB)",
          checked: false,
        },
        {
          key: "cloud",
          label:
            i18n.reset_opt_cloud ||
            "Delete Cloud Sync backup from Google Account",
          checked: false,
        },
      ],
      geti18n().settings_reset || "Reset Settings",
      i18n.alert_reset_layout_confirm || "Select items to reset:",
    )

    if (!selected) return

    showAlert(i18n.alert_resetting || "Resetting...")

    if (selected.media) {
      await clearAllMedia()
    }

    if (selected.cloud) {
      await clearCloudBackup()
    }

    try {
      localStorage.setItem("startpageShowStartupLoader", "1")
    } catch (e) {
      console.warn("Could not mark startup loader for reset", e)
    }
    document.body.classList.remove("skip-startup-loader")
    document.body.classList.add("loading-state")
    const startupOverlay = document.getElementById("startup-overlay")
    if (startupOverlay) {
      startupOverlay.style.visibility = "visible"
      startupOverlay.style.opacity = "1"
    }

    // Wait 400ms for overlay fade-in animation to complete before resetting/reloading
    setTimeout(async () => {
      // Logic for standard settings reset
      if (
        selected.all ||
        selected.positions ||
        selected.effects ||
        selected.styles
      ) {
        const { resetComponentPositions } =
          await import("../../services/state.js")
        resetComponentPositions({
          all: selected.all,
          positions: selected.positions,
          effectColors: selected.effects,
          styles: selected.styles,
        })
        // resetComponentPositions calls reload()
      } else if (selected.media || selected.cloud) {
        // If only media or cloud was cleared, we still reload to ensure clean state
        window.location.reload()
      }
    }, 400)
  })

  // Search input
  DOM.searchInput.addEventListener("input", () => {
    DOM.clearBtn.style.display =
      DOM.searchInput.value.length > 0 ? "block" : "none"
  })
  DOM.clearBtn.addEventListener("click", () => {
    DOM.searchInput.value = ""
    DOM.searchInput.focus()
    DOM.clearBtn.style.display = "none"
  })

  // Layout visibility checkboxes
  const setupLayoutCheckbox = (checkbox, key, eventDetail) => {
    checkbox.addEventListener("change", () => {
      handleSettingUpdate(key, checkbox.checked)
      if (key === "showSearchBar") {
        document.body.classList.toggle("hide-search-bar", !checkbox.checked)
      }
      if (key === "allowTextSelection") {
        document.body.classList.toggle("allow-text-selection", checkbox.checked)
      }
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { ...eventDetail, key, value: checkbox.checked },
        }),
      )
    })
  }

  setupLayoutCheckbox(DOM.showTodoCheckbox, "showTodoList", {})
  if (DOM.todoShowCheckboxesToggle) {
    setupLayoutCheckbox(DOM.todoShowCheckboxesToggle, "todoShowCheckboxes", {})
  }
  setupLayoutCheckbox(DOM.showNotepadCheckbox, "showNotepad", {})
  setupLayoutCheckbox(DOM.showTimerCheckbox, "showTimer", {})
  setupLayoutCheckbox(DOM.showWeatherCheckbox, "showWeather", {})

  const weatherApiModeSelect = document.getElementById("weather-api-mode-select")
  const weatherForecastEndpointInput = document.getElementById(
    "weather-forecast-endpoint-input",
  )
  const weatherGeocodingEndpointInput = document.getElementById(
    "weather-geocoding-endpoint-input",
  )
  const weatherApiTestBtn = document.getElementById("weather-api-test-btn")
  const weatherApiConnectionState = document.getElementById(
    "weather-api-connection-state",
  )
  const dispatchWeatherApiUpdate = (key, value) => {
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key, value },
      }),
    )
  }
  const getWeatherEndpointStatus = (input) =>
    input?.id === "weather-forecast-endpoint-input"
      ? document.getElementById("weather-forecast-endpoint-status")
      : document.getElementById("weather-geocoding-endpoint-status")
  const getWeatherEndpointType = (input) =>
    input?.id === "weather-forecast-endpoint-input" ? "forecast" : "geocoding"
  const validateWeatherEndpoint = (value, type) => {
    const endpoint = String(value || "").trim()
    if (!endpoint) {
      return {
        ok: false,
        message:
          i18n.settings_weather_url_required ||
          "Required for custom weather API.",
      }
    }
    try {
      const url = new URL(endpoint)
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return {
          ok: false,
          message:
            i18n.settings_weather_url_protocol ||
            "Use a full http:// or https:// URL.",
        }
      }
      const duplicateParams = (WEATHER_API_REQUIRED_PARAMS[type] || []).filter(
        (param) => url.searchParams.has(param),
      )
      if (duplicateParams.length) {
        return {
          ok: false,
          message:
            i18n.settings_weather_url_no_query ||
            "Use the base endpoint only; the app adds weather query parameters.",
        }
      }
      return {
        ok: true,
        value: endpoint,
        message: i18n.settings_weather_url_valid || "Looks good.",
      }
    } catch {
      return {
        ok: false,
        message:
          i18n.settings_weather_url_invalid ||
          "Enter a valid URL, including https://.",
      }
    }
  }
  const renderWeatherEndpointValidation = (input) => {
    if (!input) return { ok: true, value: "" }
    const validation = validateWeatherEndpoint(
      input.value,
      getWeatherEndpointType(input),
    )
    const status = getWeatherEndpointStatus(input)
    input.classList.toggle("is-valid", validation.ok)
    input.classList.toggle("is-invalid", !validation.ok)
    input.setAttribute("aria-invalid", validation.ok ? "false" : "true")
    input.setCustomValidity(validation.ok ? "" : validation.message)
    if (status) {
      status.textContent = validation.message
      status.classList.toggle("is-valid", validation.ok)
      status.classList.toggle("is-invalid", !validation.ok)
    }
    return validation
  }
  const validateWeatherApiSettings = () => {
    const mode = weatherApiModeSelect?.value || getSettings().weatherApiMode
    if (mode !== "custom") return { ok: true }
    const forecast = renderWeatherEndpointValidation(weatherForecastEndpointInput)
    const geocoding = renderWeatherEndpointValidation(weatherGeocodingEndpointInput)
    return {
      ok: forecast.ok && geocoding.ok,
      forecast: forecast.value,
      geocoding: geocoding.value,
    }
  }
  const setWeatherApiConnectionState = (state, message) => {
    if (!weatherApiConnectionState) return
    const iconMap = {
      idle: "fa-circle-info",
      testing: "fa-spinner fa-spin",
      success: "fa-circle-check",
      error: "fa-triangle-exclamation",
    }
    weatherApiConnectionState.classList.toggle("is-testing", state === "testing")
    weatherApiConnectionState.classList.toggle("is-success", state === "success")
    weatherApiConnectionState.classList.toggle("is-error", state === "error")
    weatherApiConnectionState.innerHTML = `
      <i class="fa-solid ${iconMap[state] || iconMap.idle}"></i>
      <span>${String(message || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</span>
    `
  }
  const withWeatherParams = (endpoint, params) => {
    const url = new URL(endpoint)
    params.forEach((value, key) => url.searchParams.set(key, value))
    return url.toString()
  }
  const fetchWeatherApiJson = async (url) => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch(url, {
        cache: "no-store",
        mode: "cors",
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } finally {
      window.clearTimeout(timeoutId)
    }
  }
  const commitWeatherEndpointInput = (input, key) => {
    const validation = renderWeatherEndpointValidation(input)
    if (!validation.ok) {
      setWeatherApiConnectionState(
        "error",
        i18n.settings_weather_fix_urls || "Fix the highlighted URLs first.",
      )
      return false
    }
    handleSettingUpdate(key, validation.value)
    dispatchWeatherApiUpdate(key, validation.value)
    setWeatherApiConnectionState(
      "idle",
      i18n.settings_weather_test_idle || "Not tested yet.",
    )
    return true
  }
  const applyWeatherOpenMeteoPreset = () => {
    if (weatherApiModeSelect) weatherApiModeSelect.value = "custom"
    if (weatherForecastEndpointInput) {
      weatherForecastEndpointInput.value = DEFAULT_WEATHER_FORECAST_ENDPOINT
    }
    if (weatherGeocodingEndpointInput) {
      weatherGeocodingEndpointInput.value = DEFAULT_WEATHER_GEOCODING_ENDPOINT
    }
    renderWeatherEndpointValidation(weatherForecastEndpointInput)
    renderWeatherEndpointValidation(weatherGeocodingEndpointInput)
    handleSettingUpdate("weatherApiMode", "custom")
    handleSettingUpdate("weatherForecastEndpoint", DEFAULT_WEATHER_FORECAST_ENDPOINT)
    handleSettingUpdate("weatherGeocodingEndpoint", DEFAULT_WEATHER_GEOCODING_ENDPOINT)
    dispatchWeatherApiUpdate("weatherApiMode", "custom")
    setWeatherApiConnectionState(
      "idle",
      i18n.settings_weather_preset_applied || "Open-Meteo endpoints applied.",
    )
  }
  const testWeatherApiConnection = async () => {
    const validation = validateWeatherApiSettings()
    if (!validation.ok) {
      setWeatherApiConnectionState(
        "error",
        i18n.settings_weather_fix_urls || "Fix the highlighted URLs first.",
      )
      return
    }

    const settings = getSettings()
    const latitude = Number(settings.weatherLatitude) || 10.8231
    const longitude = Number(settings.weatherLongitude) || 106.6297
    const forecastEndpoint =
      weatherApiModeSelect?.value === "custom"
        ? validation.forecast
        : DEFAULT_WEATHER_FORECAST_ENDPOINT
    const geocodingEndpoint =
      weatherApiModeSelect?.value === "custom"
        ? validation.geocoding
        : DEFAULT_WEATHER_GEOCODING_ENDPOINT

    setWeatherApiConnectionState(
      "testing",
      i18n.settings_weather_testing || "Testing weather API...",
    )
    if (weatherApiTestBtn) weatherApiTestBtn.disabled = true
    try {
      const forecastParams = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        timezone: "auto",
        forecast_days: "4",
      })
      const geocodingParams = new URLSearchParams({
        name: settings.weatherLocationName || "Ho Chi Minh City",
        count: "1",
        language: settings.language === "vi" ? "vi" : "en",
        format: "json",
      })
      const [forecastData, geocodingData] = await Promise.all([
        fetchWeatherApiJson(withWeatherParams(forecastEndpoint, forecastParams)),
        fetchWeatherApiJson(withWeatherParams(geocodingEndpoint, geocodingParams)),
      ])
      if (!forecastData?.current || !forecastData?.daily) {
        throw new Error("Forecast response missing current/daily data")
      }
      if (!Array.isArray(geocodingData?.results)) {
        throw new Error("Geocoding response missing results array")
      }
      setWeatherApiConnectionState(
        "success",
        i18n.settings_weather_test_success || "Connection works.",
      )
      dispatchWeatherApiUpdate("weatherForecastEndpoint", forecastEndpoint)
    } catch (error) {
      setWeatherApiConnectionState(
        "error",
        `${i18n.settings_weather_test_failed || "Connection failed."} ${error?.message || ""}`.trim(),
      )
    } finally {
      if (weatherApiTestBtn) weatherApiTestBtn.disabled = false
    }
  }

  weatherApiModeSelect?.addEventListener("change", () => {
    handleSettingUpdate("weatherApiMode", weatherApiModeSelect.value)
    validateWeatherApiSettings()
    setWeatherApiConnectionState(
      "idle",
      i18n.settings_weather_test_idle || "Not tested yet.",
    )
    dispatchWeatherApiUpdate("weatherApiMode", weatherApiModeSelect.value)
  })
  const weatherUnitSelect = document.getElementById("weather-unit-select")
  weatherUnitSelect?.addEventListener("change", () => {
    handleSettingUpdate("weatherUnit", weatherUnitSelect.value)
    dispatchWeatherApiUpdate("weatherUnit", weatherUnitSelect.value)
  })

  ;[weatherForecastEndpointInput, weatherGeocodingEndpointInput].forEach((input) => {
    input?.addEventListener("input", () => {
      renderWeatherEndpointValidation(input)
      setWeatherApiConnectionState(
        "idle",
        i18n.settings_weather_test_idle || "Not tested yet.",
      )
    })
  })
  weatherForecastEndpointInput?.addEventListener("change", () => {
    commitWeatherEndpointInput(
      weatherForecastEndpointInput,
      "weatherForecastEndpoint",
    )
  })
  weatherGeocodingEndpointInput?.addEventListener("change", () => {
    commitWeatherEndpointInput(
      weatherGeocodingEndpointInput,
      "weatherGeocodingEndpoint",
    )
  })
  document
    .querySelector("[data-weather-api-preset='open-meteo']")
    ?.addEventListener("click", applyWeatherOpenMeteoPreset)
  weatherApiTestBtn?.addEventListener("click", testWeatherApiConnection)
  validateWeatherApiSettings()

  setupLayoutCheckbox(
    DOM.hideTimerAlarmDropdownCheckbox,
    "hideTimerAlarmDropdown",
    {},
  )
  updateTimerAlarmCustomUi()
  if (DOM.timerAlarmSoundSelect) {
    DOM.timerAlarmSoundSelect.addEventListener("change", () => {
      if (
        DOM.timerAlarmSoundSelect.value === CUSTOM_ALARM_SOUND_KEY &&
        !getSettings().timerCustomAlarmSoundId
      ) {
        DOM.timerAlarmSoundSelect.value = DEFAULT_TIMER_ALARM_SOUND
        showAlert(
          i18n.timer_alarm_upload_first ||
            "Upload a custom sound before selecting this option.",
        )
        return
      }
      handleSettingUpdate("timerAlarmSound", DOM.timerAlarmSoundSelect.value)
      window.dispatchEvent(
        new CustomEvent("settingsUpdated", {
          detail: {
            key: "timerAlarmSound",
            value: DOM.timerAlarmSoundSelect.value,
          },
        }),
      )
    })
  }
  DOM.timerAlarmSoundUploadBtn?.addEventListener("click", () => {
    DOM.timerAlarmSoundUpload?.click()
  })
  DOM.timerAlarmSoundUpload?.addEventListener("change", async () => {
    const file = DOM.timerAlarmSoundUpload.files?.[0]
    DOM.timerAlarmSoundUpload.value = ""
    if (!file) return
    if (!file.type.startsWith("audio/")) {
      showAlert(i18n.timer_alarm_invalid_file || "Please choose an audio file.")
      return
    }
    if (file.size > MAX_TIMER_ALARM_SIZE) {
      showAlert(
        i18n.timer_alarm_file_too_large ||
          "Please choose an audio file under 12 MB.",
      )
      return
    }

    const previousId = getSettings().timerCustomAlarmSoundId
    try {
      const soundId = await saveAudio(file)
      updateSetting("timerCustomAlarmSoundId", soundId)
      updateSetting("timerCustomAlarmSoundName", file.name)
      updateSetting("timerAlarmSound", CUSTOM_ALARM_SOUND_KEY)
      saveSettings(true)
      if (previousId) deleteImage(previousId).catch(() => {})
      updateTimerAlarmCustomUi()
      if (DOM.timerAlarmSoundSelect) {
        DOM.timerAlarmSoundSelect.value = CUSTOM_ALARM_SOUND_KEY
      }
      window.dispatchEvent(
        new CustomEvent("settingsUpdated", {
          detail: { key: "timerAlarmSound", value: CUSTOM_ALARM_SOUND_KEY },
        }),
      )
    } catch (error) {
      console.error("Failed to save custom timer alarm sound:", error)
      showAlert(
        i18n.timer_alarm_upload_failed ||
          "Could not save that sound. Please try another file.",
      )
    }
  })
  DOM.timerAlarmSoundRemoveBtn?.addEventListener("click", () => {
    const settings = getSettings()
    const soundId = settings.timerCustomAlarmSoundId
    if (soundId) deleteImage(soundId).catch(() => {})
    updateSetting("timerCustomAlarmSoundId", null)
    updateSetting("timerCustomAlarmSoundName", "")
    if (settings.timerAlarmSound === CUSTOM_ALARM_SOUND_KEY) {
      updateSetting("timerAlarmSound", DEFAULT_TIMER_ALARM_SOUND)
    }
    saveSettings(true)
    updateTimerAlarmCustomUi()
    if (DOM.timerAlarmSoundSelect) {
      DOM.timerAlarmSoundSelect.value = getSettings().timerAlarmSound
    }
    window.dispatchEvent(
      new CustomEvent("settingsUpdated", {
        detail: {
          key: "timerAlarmSound",
          value: getSettings().timerAlarmSound,
        },
      }),
    )
  })
  setupLayoutCheckbox(DOM.showGregorianCheckbox, "showGregorian", {})
  if (DOM.clockDisplaySelect) {
    DOM.clockDisplaySelect.addEventListener("change", () => {
      handleSettingUpdate("clockDisplayMode", DOM.clockDisplaySelect.value)
    })
  }
  setupLayoutCheckbox(DOM.freeMoveClockCheckbox, "freeMoveClock", {})
  setupLayoutCheckbox(DOM.freeMoveSearchBarCheckbox, "freeMoveSearchBar", {})
  setupLayoutCheckbox(DOM.showFullCalendarCheckbox, "showFullCalendar", {})
  if (DOM.calendarDisplayModeSelect) {
    const syncCalendarDisplayMode = (mode) => {
      const normalizedMode =
        mode === "lunar" || mode === "both" ? mode : "solar"
      DOM.calendarDisplayModeSelect.value = normalizedMode
      if (DOM.lcpLunarCalendar) {
        DOM.lcpLunarCalendar.checked = normalizedMode !== "solar"
      }
      handleSettingUpdate("calendarDateMode", normalizedMode)
      handleSettingUpdate("showLunarCalendar", normalizedMode !== "solar")
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "calendarDateMode", value: normalizedMode },
        }),
      )
    }

    DOM.calendarDisplayModeSelect.value =
      getSettings().calendarDateMode ||
      (getSettings().showLunarCalendar ? "both" : "solar")
    DOM.calendarDisplayModeSelect.addEventListener("change", () => {
      syncCalendarDisplayMode(DOM.calendarDisplayModeSelect.value)
    })
  }
  if (DOM.showLunarCalendarClockCheckbox) {
    DOM.showLunarCalendarClockCheckbox.checked =
      !!getSettings().showClockLunarCalendar
    DOM.showLunarCalendarClockCheckbox.addEventListener("change", () => {
      const val = DOM.showLunarCalendarClockCheckbox.checked
      handleSettingUpdate("showClockLunarCalendar", val)
    })
  }
  if (DOM.clockLunarModeSelect) {
    DOM.clockLunarModeSelect.value =
      getSettings().showClockLunarMode || "append"
    DOM.clockLunarModeSelect.addEventListener("change", () => {
      handleSettingUpdate("showClockLunarMode", DOM.clockLunarModeSelect.value)
      window.dispatchEvent(
        new CustomEvent("settingsUpdated", {
          detail: {
            key: "showClockLunarMode",
            value: DOM.clockLunarModeSelect.value,
          },
        }),
      )
    })
  }
  setupLayoutCheckbox(DOM.flipLayoutCheckbox, "flipLayout", {})
  setupLayoutCheckbox(DOM.lcpQuickAccessHorizontal, "quickAccessHorizontal", {})
  if (DOM.allowTextSelectionCheckbox) {
    setupLayoutCheckbox(
      DOM.allowTextSelectionCheckbox,
      "allowTextSelection",
      {},
    )
  }
  if (DOM.showDonateButtonCheckbox) {
    setupLayoutCheckbox(DOM.showDonateButtonCheckbox, "showDonateButton", {})
  }
  setupLayoutCheckbox(DOM.showSearchBarCheckbox, "showSearchBar", {})
  if (DOM.showSearchAiIconCheckbox) {
    setupLayoutCheckbox(DOM.showSearchAiIconCheckbox, "showSearchAIIcon", {})
  }
  if (DOM.extensionActionBehaviorSelect) {
    DOM.extensionActionBehaviorSelect.addEventListener("change", (e) => {
      const value = e.target.value
      updateSetting("actionBehavior", value)
      try {
        chrome.runtime.sendMessage({ action: "updateActionBehavior", behavior: value })
      } catch (err) {
        console.error("Failed to sync action behavior to background", err)
      }
    })
  }
  if (DOM.searchEngineSelect) {
    DOM.searchEngineSelect.addEventListener("change", (e) => {
      updateSetting("searchEngine", e.target.value)
      window.dispatchEvent(
        new CustomEvent("settingsUpdated", {
          detail: { key: "searchEngine", value: e.target.value },
        }),
      )
    })
  }
  if (DOM.searchBarWidthSlider) {
    DOM.searchBarWidthSlider.addEventListener("input", (e) => {
      const width = e.target.value
      if (DOM.searchBarWidthVal)
        DOM.searchBarWidthVal.textContent = `${width}px`
      if (DOM.lcpSearchBarWidthVal)
        DOM.lcpSearchBarWidthVal.textContent = `${width}px`
      if (DOM.lcpSearchBarWidth) DOM.lcpSearchBarWidth.value = width
      handleSettingUpdate("searchBarWidth", parseInt(width))
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "searchBarWidth", value: width },
        }),
      )
    })
  }
  if (DOM.searchBarBlurSlider) {
    DOM.searchBarBlurSlider.addEventListener("input", (e) => {
      const blur = e.target.value
      if (DOM.searchBarBlurVal)
        DOM.searchBarBlurVal.textContent = `${blur}px`
      document.documentElement.style.setProperty("--search-bar-blur", `${blur}px`)
    })
    DOM.searchBarBlurSlider.addEventListener("change", (e) => {
      const blur = e.target.value
      handleSettingUpdate("searchBarBlur", parseInt(blur, 10))
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "searchBarBlur", value: blur },
        }),
      )
    })
  }
  setupLayoutCheckbox(DOM.showBookmarksCheckbox, "showBookmarks", {})
  // Quick Access White Mode logic
  const handleWhiteModeChange = (checked) => {
    handleSettingUpdate("showQuickAccessBg", checked)

    const widgets = [
      "todo",
      "timer",
      "calendar",
      "weather",
      "notepad",
      "quotes",
      "musicPlayer",
    ]
    const settings = getSettings()

    if (checked) {
      // ON: Switch to white-blur if it's currently default
      widgets.forEach((w) => {
        const currentSkin = settings[`${w}Skin`] || "default"
        if (currentSkin === "default") {
          handleSettingUpdate(`${w}Skin`, "white-blur")
        }
      })
    } else {
      // OFF: Revert to default if it's currently white-blur
      widgets.forEach((w) => {
        const currentSkin = settings[`${w}Skin`]
        if (currentSkin === "white-blur") {
          handleSettingUpdate(`${w}Skin`, "default")
        }
      })
    }

    // Sync checkboxes
    if (DOM.showQuickAccessBgCheckbox)
      DOM.showQuickAccessBgCheckbox.checked = checked
    if (DOM.lcpQuickAccessBg) DOM.lcpQuickAccessBg.checked = checked

    // Refresh UI
    applySettings()
    updateSettingsInputs() // Ensure dropdowns in settings sidebar also update
  }

  if (DOM.showQuickAccessBgCheckbox) {
    DOM.showQuickAccessBgCheckbox.addEventListener("change", (e) =>
      handleWhiteModeChange(e.target.checked),
    )
  }
  if (DOM.lcpQuickAccessBg) {
    DOM.lcpQuickAccessBg.addEventListener("change", (e) =>
      handleWhiteModeChange(e.target.checked),
    )
  }

  DOM.contextMenuStyleSelect.addEventListener("change", () => {
    const val = DOM.contextMenuStyleSelect.value
    handleSettingUpdate("contextMenuStyle", val)
  })
  setupLayoutCheckbox(DOM.showBookmarkGroupsCheckbox, "showBookmarkGroups", {})

  DOM.showMusicCheckbox.addEventListener("change", () => {
    handleSettingUpdate("musicPlayerEnabled", DOM.showMusicCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("settingsUpdated", {
        detail: {
          key: "musicPlayerEnabled",
          value: DOM.showMusicCheckbox.checked,
        },
      }),
    )
  })

  DOM.showQuotesCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showQuotes", DOM.showQuotesCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "showQuotes",
          value: DOM.showQuotesCheckbox.checked,
        },
      }),
    )
  })

  DOM.musicPlayerUseDefaultColorMode.addEventListener("change", () => {
    let val = DOM.musicPlayerUseDefaultColorMode.value
    if (val === "true") val = true
    else if (val === "false") val = false
    markInterfaceStyleCustom("musicPlayerUseDefaultColor")
    handleSettingUpdate("musicPlayerUseDefaultColor", val)
    window.dispatchEvent(
      new CustomEvent("settingsUpdated", {
        detail: {
          key: "musicPlayerUseDefaultColor",
          value: val,
        },
      }),
    )
  })

  DOM.mediaOrbImageUrlInput?.addEventListener("change", () => {
    handleSettingUpdate("mediaOrbImageUrl", DOM.mediaOrbImageUrlInput.value.trim())
    if (DOM.mediaOrbImageUrlInput.value.trim()) {
      handleSettingUpdate("mediaOrbImageData", "")
    }
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "mediaOrbImageUrl",
          value: DOM.mediaOrbImageUrlInput.value.trim(),
        },
      }),
    )
  })

  DOM.mediaOrbUploadBtn?.addEventListener("click", () => {
    DOM.mediaOrbImageUpload?.click()
  })

  DOM.mediaOrbImageUpload?.addEventListener("change", () => {
    const file = DOM.mediaOrbImageUpload.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      if (!result) return
      handleSettingUpdate("mediaOrbImageData", result)
      handleSettingUpdate("mediaOrbImageUrl", "")
      if (DOM.mediaOrbImageUrlInput) DOM.mediaOrbImageUrlInput.value = ""
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "mediaOrbImageData", value: result },
        }),
      )
      DOM.mediaOrbImageUpload.value = ""
    }
    reader.readAsDataURL(file)
  })

  DOM.mediaOrbClearBtn?.addEventListener("click", () => {
    handleSettingUpdate("mediaOrbImageData", "")
    handleSettingUpdate("mediaOrbImageUrl", DEFAULT_MEDIA_ORB_IMAGE_URL)
    if (DOM.mediaOrbImageUrlInput)
      DOM.mediaOrbImageUrlInput.value = DEFAULT_MEDIA_ORB_IMAGE_URL
    if (DOM.mediaOrbImageUpload) DOM.mediaOrbImageUpload.value = ""
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "mediaOrbImageData", value: "" },
      }),
    )
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "mediaOrbImageUrl", value: DEFAULT_MEDIA_ORB_IMAGE_URL },
      }),
    )
  })

  DOM.mediaOrbOverflowBorderCheckbox?.addEventListener("change", () => {
    handleSettingUpdate(
      "mediaOrbOverflowBorder",
      DOM.mediaOrbOverflowBorderCheckbox.checked,
    )
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "mediaOrbOverflowBorder",
          value: DOM.mediaOrbOverflowBorderCheckbox.checked,
        },
      }),
    )
  })

  DOM.mediaOrbLayoutSelect?.addEventListener("change", () => {
    const value = ["left", "right", "center"].includes(
      DOM.mediaOrbLayoutSelect.value,
    )
      ? DOM.mediaOrbLayoutSelect.value
      : "left"
    handleSettingUpdate("mediaOrbLayout", value)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "mediaOrbLayout", value },
      }),
    )
  })

  DOM.musicSourceIconColorModeSelect?.addEventListener("change", () => {
    const mode = DOM.musicSourceIconColorModeSelect.value || "brand"
    markInterfaceStyleCustom("musicSourceIconColorMode")
    handleSettingUpdate("musicSourceIconColorMode", mode)
    window.dispatchEvent(
      new CustomEvent("settingsUpdated", {
        detail: {
          key: "musicSourceIconColorMode",
          value: mode,
        },
      }),
    )
  })

  DOM.ghostControlsCheckbox.addEventListener("change", () => {
    const isGhost = DOM.ghostControlsCheckbox.checked
    handleSettingUpdate("sideControlsGhostMode", isGhost)
    document.body.classList.toggle("ghost-controls", isGhost)
    DOM.lcpGhostControls.checked = isGhost
  })

  const qaToggles = [
    { el: DOM.lcpQaShowTodo, key: "qaShowTodo" },
    { el: DOM.lcpQaShowNotepad, key: "qaShowNotepad" },
    { el: DOM.lcpQaShowTimer, key: "qaShowTimer" },
    { el: DOM.lcpQaShowCalendar, key: "qaShowCalendar" },
    { el: DOM.lcpQaShowQuotes, key: "qaShowQuotes" },
    { el: DOM.lcpQaShowWeather, key: "qaShowWeather" },
    { el: DOM.lcpQaShowMusic, key: "qaShowMusic" },
    { el: DOM.lcpQaShowClock, key: "qaShowClock" },
    { el: DOM.lcpQaShowGregorian, key: "qaShowGregorian" },
    { el: DOM.lcpQaShowRss, key: "qaShowRss" },
    { el: DOM.lcpQaAllowReorder, key: "qaAllowReorder" }
  ];

  qaToggles.forEach(toggle => {
    if (toggle.el) {
      toggle.el.addEventListener("change", () => {
        handleSettingUpdate(toggle.key, toggle.el.checked);
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: toggle.key, value: toggle.el.checked },
          }),
        );
      });
    }
  });

  // Layout controls popup
  const closeLcp = () => {
    DOM.fadeToggle(DOM.layoutControlsPopup, false, "block")
    DOM.layoutControlsBtn.classList.remove("active")
  }

  const setLcpTab = (tabName = "layout") => {
    DOM.lcpTabs?.forEach((tab) => {
      const active = tab.dataset.lcpTab === tabName
      tab.classList.toggle("active", active)
      tab.setAttribute("aria-selected", active ? "true" : "false")
    })
    DOM.lcpTabPanels?.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.lcpPanel === tabName)
    })
  }

  const showLcp = (tabName = "layout") => {
    setLcpTab(tabName)
    DOM.fadeToggle(DOM.layoutControlsPopup, true, "block")
    DOM.layoutControlsBtn.classList.add("active")
  }

  DOM.lcpTabs?.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.stopPropagation()
      setLcpTab(tab.dataset.lcpTab || "layout")
    })
  })

  DOM.layoutControlsBtn.addEventListener("click", (e) => {
    e.stopPropagation()
    const isVisible =
      DOM.layoutControlsPopup.style.display !== "none" &&
      DOM.layoutControlsPopup.style.opacity !== "0"
    if (isVisible) {
      closeLcp()
    } else {
      showLcp("layout")
    }
  })

  window.addEventListener("openLayoutControls", (e) => {
    showLcp(e.detail?.tab || "layout")
  })

  document.addEventListener("click", (e) => {
    if (
      !DOM.layoutControlsPopup.contains(e.target) &&
      !DOM.layoutControlsBtn.contains(e.target)
    ) {
      closeLcp()
    }
  })

  function lcpToggle(key, value, sidebarCheckbox) {
    if (sidebarCheckbox) sidebarCheckbox.checked = value
    handleSettingUpdate(key, value)
    if (key === "showSearchBar") {
      document.body.classList.toggle("hide-search-bar", !value)
    }
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", { detail: { key, value } }),
    )
  }

  DOM.lcpSearchBar.addEventListener("change", () =>
    lcpToggle(
      "showSearchBar",
      DOM.lcpSearchBar.checked,
      DOM.showSearchBarCheckbox,
    ),
  )

  if (DOM.lcpSearchBarWidth) {
    DOM.lcpSearchBarWidth.addEventListener("input", (e) => {
      const width = e.target.value
      if (DOM.lcpSearchBarWidthVal)
        DOM.lcpSearchBarWidthVal.textContent = `${width}px`
      if (DOM.searchBarWidthVal)
        DOM.searchBarWidthVal.textContent = `${width}px`
      if (DOM.searchBarWidthSlider) DOM.searchBarWidthSlider.value = width
      handleSettingUpdate("searchBarWidth", parseInt(width))
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "searchBarWidth", value: width },
        }),
      )
    })
  }

  if (DOM.lcpBookmarks) {
    DOM.lcpBookmarks.addEventListener("change", () =>
      lcpToggle(
        "showBookmarks",
        DOM.lcpBookmarks.checked,
        DOM.showBookmarksCheckbox,
      ),
    )
  }
  if (DOM.lcpContextMenuStyle) {
    DOM.lcpContextMenuStyle.addEventListener("change", () => {
      const val = DOM.lcpContextMenuStyle.value
      if (DOM.contextMenuStyleSelect) DOM.contextMenuStyleSelect.value = val
      handleSettingUpdate("contextMenuStyle", val)
    })
  }
  DOM.lcpBookmarkGroups.addEventListener("change", () =>
    lcpToggle(
      "showBookmarkGroups",
      DOM.lcpBookmarkGroups.checked,
      DOM.showBookmarkGroupsCheckbox,
    ),
  )
  DOM.lcpLunarCalendar.addEventListener("change", () => {
    const showLunar = DOM.lcpLunarCalendar.checked
    const calendarMode = showLunar ? "both" : "solar"
    if (DOM.calendarDisplayModeSelect) {
      DOM.calendarDisplayModeSelect.value = calendarMode
    }
    handleSettingUpdate("calendarDateMode", calendarMode)
    handleSettingUpdate("showLunarCalendar", showLunar)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "calendarDateMode", value: calendarMode },
      }),
    )
  })
  if (DOM.lcpFlipLayout) {
    DOM.lcpFlipLayout.addEventListener("change", () =>
      lcpToggle(
        "flipLayout",
        DOM.lcpFlipLayout.checked,
        DOM.flipLayoutCheckbox,
      ),
    )
  }

  DOM.showTopRightControlsCheckbox.addEventListener("change", () => {
    const isVisible = DOM.showTopRightControlsCheckbox.checked
    handleSettingUpdate("showTopRightControls", isVisible)
    document.body.classList.toggle("hide-top-right-controls", !isVisible)
    document.body.classList.toggle("has-top-right-controls", isVisible)
    const topRightControls = document.getElementById("top-right-controls")
    if (topRightControls) {
      topRightControls.classList.toggle("hidden", !isVisible)
    }
    if (DOM.lcpTopRightControls) {
      DOM.lcpTopRightControls.checked = isVisible
    }
  })

  if (DOM.lcpTopRightControls) {
    DOM.lcpTopRightControls.addEventListener("change", () => {
      const isVisible = DOM.lcpTopRightControls.checked
      DOM.showTopRightControlsCheckbox.checked = isVisible
      handleSettingUpdate("showTopRightControls", isVisible)
      document.body.classList.toggle("hide-top-right-controls", !isVisible)
      document.body.classList.toggle("has-top-right-controls", isVisible)
      const topRightControls = document.getElementById("top-right-controls")
      if (topRightControls) {
        topRightControls.classList.toggle("hidden", !isVisible)
      }
    })
  }

  if (DOM.lcpHideChromeBookmarksRow) {
    DOM.lcpHideChromeBookmarksRow.addEventListener("click", () => {
      showBookmarkHideInstructions()
    })
  }

  DOM.lcpGhostControls.addEventListener("change", () => {
    const isGhost = DOM.lcpGhostControls.checked
    DOM.ghostControlsCheckbox.checked = isGhost
    handleSettingUpdate("sideControlsGhostMode", isGhost)
    document.body.classList.toggle("ghost-controls", isGhost)
  })

  // Music style
  const applyMusicStyle = (style) => {
    markInterfaceStyleCustom("musicBarStyle")
    DOM.musicStyleSelect.value = style
    if (DOM.lcpMusicStyleSelect) {
      DOM.lcpMusicStyleSelect.value = style
    }
    handleSettingUpdate("musicBarStyle", style)
    window.dispatchEvent(
      new CustomEvent("settingsUpdated", {
        detail: { key: "music_bar_style", value: style },
      }),
    )
  }

  DOM.musicStyleSelect.addEventListener("change", () => {
    applyMusicStyle(DOM.musicStyleSelect.value)
  })

  if (DOM.lcpMusicStyleSelect) {
    DOM.lcpMusicStyleSelect.addEventListener("change", () => {
      applyMusicStyle(DOM.lcpMusicStyleSelect.value)
    })
  }

  // Sidebar footer collapse
  const sidebarFooter = document.querySelector(".sidebar-footer")
  const footerToggleBtn = document.getElementById("sidebar-footer-toggle")
  if (sidebarFooter && footerToggleBtn) {
    const FOOTER_KEY = "sidebarFooterCollapsed"
    if (localStorage.getItem(FOOTER_KEY) === "1") {
      sidebarFooter.classList.add("collapsed")
    }
    footerToggleBtn.addEventListener("click", () => {
      const isNowCollapsed = sidebarFooter.classList.toggle("collapsed")
      localStorage.setItem(FOOTER_KEY, isNowCollapsed ? "1" : "0")
    })
  }

  const radiusOptions = new Set([
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
  const normalizeQuickAccessRadius = (value, fallback = "8px") => {
    const match = String(value || "").match(/^(\d+(?:\.\d+)?)px$/)
    if (!match) return fallback
    const px = Math.min(20, Math.max(0, Math.round(Number(match[1]))))
    const normalized = `${px}px`
    return radiusOptions.has(normalized) ? normalized : fallback
  }
  const updateQuickAccessRadius = (key, value) => {
    const normalized = normalizeQuickAccessRadius(value)
    handleSettingUpdate(key, normalized)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", { detail: { key, value: normalized } }),
    )
  }

  const settings = getSettings()
  if (DOM.lcpQuickAccessButtonRadius) {
    DOM.lcpQuickAccessButtonRadius.value = normalizeQuickAccessRadius(
      settings.quickAccessBorderRadius,
      "5px",
    )
    DOM.lcpQuickAccessButtonRadius.addEventListener("change", (e) =>
      updateQuickAccessRadius("quickAccessBorderRadius", e.target.value),
    )
  }
  if (DOM.lcpQuickAccessBarRadius) {
    DOM.lcpQuickAccessBarRadius.value = normalizeQuickAccessRadius(
      settings.quickAccessBarRadius,
      "14px",
    )
    DOM.lcpQuickAccessBarRadius.addEventListener("change", (e) =>
      updateQuickAccessRadius("quickAccessBarRadius", e.target.value),
    )
  }
  if (DOM.lcpQuickAccessToggleRadius) {
    DOM.lcpQuickAccessToggleRadius.value = normalizeQuickAccessRadius(
      settings.quickAccessToggleRadius,
      "20px",
    )
    DOM.lcpQuickAccessToggleRadius.addEventListener("change", (e) =>
      updateQuickAccessRadius("quickAccessToggleRadius", e.target.value),
    )
  }
  if (DOM.lcpQuickAccessSkin) {
    const validQuickAccessSkins = ["default", "light", "m3-accent", "light-transparent"]
    DOM.lcpQuickAccessSkin.value = validQuickAccessSkins.includes(
      settings.quickAccessSkin,
    )
      ? settings.quickAccessSkin
      : "default"
    DOM.lcpQuickAccessSkin.addEventListener("change", (e) => {
      const skin = validQuickAccessSkins.includes(e.target.value)
        ? e.target.value
        : "default"
      handleSettingUpdate("quickAccessSkin", skin)
      document.body.classList.toggle("quick-access-m3-accent", skin === "m3-accent")
      document.body.classList.toggle(
        "quick-access-light-transparent",
        skin === "light-transparent",
      )
      document.body.classList.toggle("quick-access-light", skin === "light")
      document.body.classList.toggle("quick-access-transparent", false)
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "quickAccessSkin", value: skin },
        }),
      )
    })
  }
  if (DOM.lcpQuickAccessBorderVisible) {
    DOM.lcpQuickAccessBorderVisible.checked =
      settings.quickAccessBorderVisible !== false
    DOM.lcpQuickAccessBorderVisible.addEventListener("change", () => {
      const visible = DOM.lcpQuickAccessBorderVisible.checked
      handleSettingUpdate("quickAccessBorderVisible", visible)
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "quickAccessBorderVisible", value: visible },
        }),
      )
    })
  }

  document
    .getElementById("replay-settings-guide-btn")
    ?.addEventListener("click", () => {
      window.startpageReplaySettingsGuide?.()
    })

  const buildExportPayload = async (isClipboard = false) => {
    const settingsSnapshot = JSON.parse(JSON.stringify(getSettings()))
    const hasUnsplashKey = Boolean(
      settingsSnapshot.unsplashAccessKey &&
        settingsSnapshot.unsplashAccessKey.trim(),
    )
    const localMediaIds = collectLocalMediaIds(settingsSnapshot)
    const hasLocalMedia = localMediaIds.length > 0

    const checklist = [
      {
        key: "settings",
        label: i18n.export_option_settings || "Settings",
        checked: true,
      },
      {
        key: "bookmarks",
        label: i18n.export_option_bookmarks || "Bookmarks",
        checked: true,
      },
      {
        key: "todos",
        label: i18n.export_option_todos || "Todo Items",
        checked: true,
      },
      {
        key: "notepad",
        label: i18n.export_option_notepad || "Notepad Notes",
        checked: true,
      },
      {
        key: "calendarEvents",
        label: i18n.export_option_calendar || "Calendar Events",
        checked: true,
      },
      {
        key: "unsplashAccessKey",
        label:
          i18n.export_option_unsplash_key ||
          "Unsplash Access Key (in Settings)",
        checked: false,
        disabled: !hasUnsplashKey,
      },
    ]

    if (!isClipboard) {
      checklist.push({
        key: "localMedia",
        label:
          i18n.export_option_local_media ||
          "Local Images/Videos (for transfer to another machine)",
        checked: hasLocalMedia,
        disabled: !hasLocalMedia,
      })
    }

    const selected = await showChecklistConfirm(
      checklist,
      i18n.confirm_export_include_unsplash_key_title || "Export Settings",
      i18n.export_select_sections || "Select data to include in JSON export.",
    )

    if (!selected) return null

    const hasMainSection =
      selected.settings ||
      selected.bookmarks ||
      selected.todos ||
      selected.notepad ||
      selected.calendarEvents ||
      selected.localMedia

    if (!hasMainSection) {
      showAlert(
        i18n.export_select_at_least_one ||
          "Please select at least one section to export.",
      )
      return null
    }

    const exportData = {
      source: "zero-startpage",
      version: 2,
      exportedAt: new Date().toISOString(),
    }

    const stripLocalMediaReferences = (value) => {
      if (typeof value === "string" && isIdbMedia(value)) return null
      if (Array.isArray(value)) {
        return value
          .map((item) => stripLocalMediaReferences(item))
          .filter((item) => item !== null)
      }
      if (value && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value).map(([key, child]) => [
            key,
            stripLocalMediaReferences(child),
          ]),
        )
      }
      return value
    }

    if (selected.settings) {
      if (!selected.unsplashAccessKey) {
        delete settingsSnapshot.unsplashAccessKey
      }
      exportData.settings = selected.localMedia
        ? settingsSnapshot
        : stripLocalMediaReferences(settingsSnapshot)
    }

    if (selected.bookmarks) {
      try {
        exportData.bookmarks = JSON.parse(
          localStorage.getItem("bookmarks") || "null",
        )
      } catch {
        exportData.bookmarks = null
      }
    }

    if (selected.todos) {
      try {
        exportData.todos = JSON.parse(localStorage.getItem("todoItems") || "[]")
      } catch {
        exportData.todos = []
      }
    }

    if (selected.notepad) {
      try {
        exportData.notepad = {
          notes: JSON.parse(localStorage.getItem("notepadNotes") || "[]"),
          detached: JSON.parse(localStorage.getItem("detachedNotes") || "{}"),
          hidden: JSON.parse(localStorage.getItem("hiddenNotes") || "{}"),
        }
      } catch {
        exportData.notepad = { notes: [], detached: {}, hidden: {} }
      }
    }

    if (selected.calendarEvents) {
      try {
        exportData.calendarEvents = JSON.parse(
          localStorage.getItem("calendarEvents") || "[]",
        )
      } catch {
        exportData.calendarEvents = []
      }
    }

    if (selected.localMedia) {
      const media = {}
      for (const id of localMediaIds) {
        try {
          const blob = await getImageBlob(id)
          if (!blob) continue
          media[id] = {
            kind:
              isIdbVideo(id) || blob.type.startsWith("video/")
                ? "video"
                : "image",
            mimeType: blob.type || "",
            dataUrl: await blobToDataUrl(blob),
          }
        } catch (err) {
          console.warn("Skip media export for", id, err)
        }
      }

      if (Object.keys(media).length === 0) {
        showAlert(
          i18n.export_local_media_error ||
            "Could not package local images/videos into JSON. Open the image/video background once, then try again.",
        )
        return null
      }

      exportData.media = media
    }

    return JSON.stringify(exportData, null, 2)
  }

  const downloadExportPayload = (payload) => {
    const blob = new Blob([payload], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `startpage-${new Date().toISOString().slice(0, 10)}.json`
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 10000)
  }

  const escapeDialogHtml = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;")

  const showJsonCodeDialog = () =>
    new Promise((resolve) => {
      const overlay = document.createElement("div")
      overlay.className = "custom-dialog-overlay active"
      const title = escapeDialogHtml(
        i18n.import_json_code_title || "Paste JSON Code",
      )
      const prompt = escapeDialogHtml(
        i18n.import_json_code_prompt ||
          "Paste a copied Zero Start Page JSON backup code below.",
      )
      const placeholder = escapeDialogHtml(
        i18n.import_json_code_placeholder || "Paste JSON code here",
      )
      const cancelLabel = escapeDialogHtml(i18n.cancel || "Close")
      const importLabel = escapeDialogHtml(i18n.settings_import || "Import JSON")
      overlay.innerHTML = `
        <div class="custom-dialog json-code-dialog">
          <div class="dialog-header">${title}</div>
          <div class="dialog-body">
            <i class="fa-solid fa-code dialog-icon"></i>
            <div class="dialog-message">${prompt}</div>
            <textarea id="json-code-input" class="dialog-input json-code-input" spellcheck="false" placeholder="${placeholder}"></textarea>
          </div>
          <div class="dialog-footer">
            <button class="dialog-btn dialog-btn-secondary" id="json-code-cancel">${cancelLabel}</button>
            <button class="dialog-btn dialog-btn-primary" id="json-code-import">${importLabel}</button>
          </div>
        </div>
      `
      document.body.appendChild(overlay)

      const textarea = overlay.querySelector("#json-code-input")
      const close = (value) => {
        document.removeEventListener("keydown", onKeyDown)
        overlay.classList.remove("active")
        setTimeout(() => overlay.remove(), 250)
        resolve(value)
      }

      overlay
        .querySelector("#json-code-cancel")
        ?.addEventListener("click", () => close(null))
      overlay
        .querySelector("#json-code-import")
        ?.addEventListener("click", () => close(textarea.value))
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close(null)
      })

      const onKeyDown = (event) => {
        if (event.key !== "Escape") return
        close(null)
      }
      document.addEventListener("keydown", onKeyDown)
      setTimeout(() => textarea.focus(), 80)
    })

  window.importSettingsData = async (rawData) => {
    if (!rawData) {
      showAlert(i18n.alert_import_error || "Invalid settings file.")
      return
    }

    let data = rawData
    if (Array.isArray(data)) {
      data = {
        source: "zero-startpage",
        version: 2,
        bookmarks: data
      }
    } else if (typeof data === "object") {
      const hasMainSection = data.settings || data.bookmarks || data.todos || data.notepad || data.calendarEvents || data.media
      if (!hasMainSection) {
        const hasSettingKeys = Object.keys(data).some(key => Object.prototype.hasOwnProperty.call(defaultSettings, key))
        if (hasSettingKeys) {
          data = {
            source: "zero-startpage",
            version: 2,
            settings: data
          }
        }
      }
    }

    const isStartpageFile =
      data &&
      (data.source === "zero-startpage" ||
        data.version !== undefined ||
        data.settings ||
        data.bookmarks ||
        data.todos ||
        data.notepad ||
        data.calendarEvents)

    if (!isStartpageFile) {
      showAlert(i18n.alert_import_error || "Invalid settings file.")
      return
    }

    // Convert stringified sections if they exist as strings
    const sections = ["bookmarks", "todos", "notepad", "calendarEvents"]
    sections.forEach(sec => {
      if (data[sec] && typeof data[sec] === "string") {
        try {
          data[sec] = JSON.parse(data[sec])
        } catch (e) {
          console.warn(`Failed to parse stringified section ${sec}:`, e)
        }
      }
    })

    const hasSettings = data.settings && typeof data.settings === "object"
    const hasBookmarks = data.bookmarks && typeof data.bookmarks === "object"
    const hasTodos = Array.isArray(data.todos)
    const hasNotepad = data.notepad && typeof data.notepad === "object"
    const hasCalendarEvents = Array.isArray(data.calendarEvents)
    const hasMedia =
      data.media &&
      typeof data.media === "object" &&
      Object.keys(data.media).length > 0

    if (
      !hasSettings &&
      !hasBookmarks &&
      !hasTodos &&
      !hasNotepad &&
      !hasCalendarEvents &&
      !hasMedia
    ) {
      showAlert(i18n.alert_import_error || "Invalid settings file.")
      return
    }

    const selected = await showChecklistConfirm(
      [
        {
          key: "clear",
          label:
            i18n.import_clear_existing ||
            "Clear existing data before importing (WARNING: This will delete current settings, bookmarks, and todos)",
          checked: false,
        },
        {
          key: "settings",
          label: i18n.export_option_settings || "Settings",
          checked: hasSettings,
          disabled: !hasSettings,
        },
        {
          key: "bookmarks",
          label: i18n.export_option_bookmarks || "Bookmarks",
          checked: hasBookmarks,
          disabled: !hasBookmarks,
        },
        {
          key: "todos",
          label: i18n.export_option_todos || "Todo Items",
          checked: hasTodos,
          disabled: !hasTodos,
        },
        {
          key: "notepad",
          label: i18n.export_option_notepad || "Notepad Notes",
          checked: hasNotepad,
          disabled: !hasNotepad,
        },
        {
          key: "calendarEvents",
          label: i18n.export_option_calendar || "Calendar Events",
          checked: hasCalendarEvents,
          disabled: !hasCalendarEvents,
        },
        {
          key: "localMedia",
          label: hasMedia
            ? i18n.export_option_local_media || "Local Images/Videos"
            : `${i18n.export_option_local_media || "Local Images/Videos"} (not found in JSON)`,
          checked: hasMedia,
          disabled: !hasMedia,
        },
      ],
      i18n.settings_import || "Import Settings",
      i18n.import_select_sections ||
        "Select data to import from this JSON backup.",
    )

    if (!selected) return

    showAlert(i18n.alert_importing || "Importing...")

    if (selected.clear) {
      resetSettingsState()
      localStorage.removeItem("bookmarks")
      localStorage.removeItem("todoItems")
      localStorage.removeItem("notepadNotes")
      localStorage.removeItem("detachedNotes")
      localStorage.removeItem("hiddenNotes")
      localStorage.removeItem("calendarEvents")
      // IndexedDB is not fully cleared here to avoid breaking concurrent operations.
    }

    const compareBlobs = async (blob1, blob2) => {
      if (blob1.size !== blob2.size || blob1.type !== blob2.type) return false
      const chunkSize = 8192

      for (let offset = 0; offset < blob1.size; offset += chunkSize) {
        const end = Math.min(offset + chunkSize, blob1.size)
        const [buf1, buf2] = await Promise.all([
          blob1.slice(offset, end).arrayBuffer(),
          blob2.slice(offset, end).arrayBuffer(),
        ])
        const arr1 = new Uint8Array(buf1)
        const arr2 = new Uint8Array(buf2)
        for (let i = 0; i < arr1.length; i += 1) {
          if (arr1[i] !== arr2[i]) return false
        }
      }
      return true
    }

    const findExistingMediaId = async (incomingBlob) => {
      const ids = collectLocalMediaIds(getSettings())
      for (const id of ids) {
        try {
          const blob = await getImageBlob(id)
          if (!blob) continue
          if (await compareBlobs(blob, incomingBlob)) {
            return id
          }
        } catch (err) {
          console.warn("Error checking duplicate media for", id, err)
        }
      }
      return null
    }

    const generateBase64Preview = (dataUrl) => {
      return new Promise((resolve) => {
        if (!dataUrl || typeof dataUrl !== "string") return resolve(null)
        if (dataUrl.startsWith("data:video")) return resolve(null)

        const img = new Image()
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas")
            const size = 32
            canvas.width = size
            canvas.height = size
            const ctx = canvas.getContext("2d")
            ctx.drawImage(img, 0, 0, size, size)
            resolve(canvas.toDataURL("image/jpeg", 0.5))
          } catch {
            resolve(null)
          }
        }
        img.onerror = () => resolve(null)
        img.src = dataUrl
      })
    }

    const mediaIdMap = {}
    if (hasMedia && selected.localMedia) {
      for (const [oldId, payload] of Object.entries(data.media)) {
        try {
          if (!payload || typeof payload.dataUrl !== "string") continue
          
          const blob = await dataUrlToBlob(payload.dataUrl)
          
          let existingId = null
          if (!selected.clear) {
            existingId = await findExistingMediaId(blob)
          }

          if (existingId) {
            mediaIdMap[oldId] = existingId
            continue
          }

          const isVideo =
            payload.kind === "video" ||
            oldId.startsWith("idb-video-") ||
            blob.type.startsWith("video/")
          const newId = isVideo ? await saveVideo(blob) : await saveImage(blob)
          mediaIdMap[oldId] = newId
        } catch (err) {
          console.warn("Skip media import for", oldId, err)
        }
      }
    }

    let requiresReload = Boolean(selected.clear)

    if (hasSettings && selected.settings) {
      const importedSettings = JSON.parse(JSON.stringify(data.settings))
      const currentSettings = getSettings()

      if (Object.keys(mediaIdMap).length > 0) {
        replaceLocalMediaIds(importedSettings, mediaIdMap)
      }

      if (!selected.clear) {
        mergeSavedGallerySettings(currentSettings, importedSettings)
      }

      // Generate a small base64 preview of the imported background image
      const oldBgId = data.settings?.background
      if (oldBgId && data.media?.[oldBgId]) {
        try {
          const preview = await generateBase64Preview(data.media[oldBgId].dataUrl)
          if (preview) {
            importedSettings.lastUserBackgroundPreview = preview
            importedSettings.lastUserBackground = importedSettings.background
          }
        } catch (e) {
          console.warn("Failed to generate preview for imported background", e)
        }
      }

      Object.assign(getSettings(), importedSettings)
      saveSettings()
      try {
        applySettings()
      } catch (e) {
        console.warn("Non-fatal: applySettings failed during import", e)
      }
      try {
        updateSettingsInputs()
      } catch (e) {
        console.warn("Non-fatal: updateSettingsInputs failed during import", e)
      }
      requiresReload = true
    } else if (
      hasSettings &&
      selected.localMedia &&
      Array.isArray(data.settings.userBackgrounds)
    ) {
      const importedSettings = JSON.parse(JSON.stringify(data.settings))

      if (Object.keys(mediaIdMap).length > 0) {
        replaceLocalMediaIds(importedSettings, mediaIdMap)
      }

      const settings = getSettings()
      settings.userBackgrounds = selected.clear
        ? importedSettings.userBackgrounds
        : mergeUserBackgrounds(
            settings.userBackgrounds,
            importedSettings.userBackgrounds,
          )
      saveSettings()
      try {
        applySettings()
      } catch (e) {
        console.warn("Non-fatal: applySettings failed during import background", e)
      }
      try {
        updateSettingsInputs()
      } catch (e) {
        console.warn("Non-fatal: updateSettingsInputs failed during import background", e)
      }
      requiresReload = true
    }

    if (hasBookmarks && selected.bookmarks) {
      localStorage.setItem("bookmarks", JSON.stringify(data.bookmarks))
      requiresReload = true
    }

    if (hasTodos && selected.todos) {
      localStorage.setItem("todoItems", JSON.stringify(data.todos))
      requiresReload = true
    }

    if (hasNotepad && selected.notepad) {
      localStorage.setItem(
        "notepadNotes",
        JSON.stringify(data.notepad.notes || []),
      )
      localStorage.setItem(
        "detachedNotes",
        JSON.stringify(data.notepad.detached || {}),
      )
      localStorage.setItem(
        "hiddenNotes",
        JSON.stringify(data.notepad.hidden || {}),
      )
      requiresReload = true
    }

    if (hasCalendarEvents && selected.calendarEvents) {
      localStorage.setItem(
        "calendarEvents",
        JSON.stringify(data.calendarEvents),
      )
      requiresReload = true
    }

    await showAlert(
      i18n.alert_import_success || "Settings imported successfully!",
    )
    if (requiresReload) {
      window.location.reload()
    }
  }

  const importSettingsText = async (text) => {
    try {
      await window.importSettingsData(JSON.parse(text))
    } catch (err) {
      console.error("Import error:", err)
      showAlert(
        `${i18n.alert_import_error || "Invalid settings file."}\n\nError details: ${err.message || err}`,
      )
    }
  }

  // Export/Import settings
  DOM.exportSettingsBtn?.addEventListener("click", async () => {
    try {
      const payload = await buildExportPayload(false)
      if (!payload) return
      downloadExportPayload(payload)
      showAlert(i18n.alert_export_success || "Settings exported!")
    } catch (err) {
      console.error("Export error:", err)
      showAlert(i18n.alert_export_error || "Export failed.")
    }
  })

  DOM.copySettingsJsonBtn?.addEventListener("click", async () => {
    try {
      const payload = await buildExportPayload(true)
      if (!payload) return
      await copyText(payload)
      showAlert(i18n.alert_export_copied || "JSON copied to clipboard!")
    } catch (err) {
      console.error("Copy JSON export error:", err)
      showAlert(i18n.alert_export_error || "Export failed.")
    }
  })

  DOM.importSettingsBtn?.addEventListener("click", () =>
    DOM.importSettingsInput?.click(),
  )

  DOM.pasteSettingsJsonBtn?.addEventListener("click", async () => {
    const text = await showJsonCodeDialog()
    if (!text?.trim()) return
    await importSettingsText(text)
  })

  DOM.importSettingsInput?.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = null

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          await importSettingsText(event.target.result)
        } catch (err) {
          console.error("Error applying imported settings:", err)
          showAlert(i18n.alert_import_error || "Invalid settings file.")
        }
      }
      reader.onerror = (err) => {
        console.error("FileReader read error:", err)
        showAlert(i18n.alert_import_error || "Invalid settings file.")
      }
      reader.readAsText(file)
    } catch (err) {
      console.error("FileReader setup error:", err)
      showAlert(i18n.alert_import_error || "Invalid settings file.")
    }
  })

  // Cloud Sync Logic
  const syncToCloudBtn = document.getElementById("sync-to-cloud-btn")
  const syncFromCloudBtn = document.getElementById("sync-from-cloud-btn")

  syncToCloudBtn?.addEventListener("click", async () => {
    try {
      const selected = await showChecklistConfirm(
        [
          {
            key: "includeWidgets",
            label: i18n.sync_opt_widgets || "Widget Visibility & Data",
            checked: true,
          },
          {
            key: "includePositions",
            label: i18n.sync_opt_positions || "Widget Positions & Layout",
            checked: true,
          },
          {
            key: "includeStyles",
            label: i18n.sync_opt_styles || "Colors & Fonts",
            checked: false,
          },
          {
            key: "includeEffects",
            label: i18n.sync_opt_effects || "Visual Effects Settings",
            checked: false,
          },
        ],
        i18n.settings_sync_to_cloud || "Sync to Cloud",
        i18n.sync_select_data || "Select what to sync to your Google account:",
      )

      if (!selected) return

      showAlert(i18n.sync_backing_up || "Backing up to cloud...")
      await backupToCloud(selected)
      await showAlert(
        `${i18n.sync_backup_success}\n\n${i18n.sync_no_images_warning || "Images/Videos are not included in cloud sync."}`,
      )
    } catch (e) {
      if (
        e.message?.includes("quota") ||
        e.message?.includes("kQuotaBytesPerItem")
      ) {
        showAlert(
          i18n.sync_error_quota ||
            `Backup failed: Limit exceeded (100KB). Try selecting fewer items.`,
        )
      } else {
        showAlert(`Backup failed: ${e.message}`)
      }
    }
  })
  syncFromCloudBtn?.addEventListener("click", async () => {
    try {
      const confirm = await showConfirm(i18n.sync_restore_confirm)
      if (confirm) {
        const success = await restoreFromCloud()
        if (success) {
          await showAlert(i18n.sync_restore_success)
          window.location.reload()
        } else {
          showAlert(i18n.sync_restore_no_data)
        }
      }
    } catch (e) {
      showAlert(`Restore failed: ${e.message}`)
    }
  })

  // Custom Title Settings
  if (DOM.showCustomTitleCheckbox) {
    DOM.showCustomTitleCheckbox.addEventListener("change", (e) => {
      handleSettingUpdate("showCustomTitle", e.target.checked)
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "showCustomTitle", value: e.target.checked },
        }),
      )
    })
  }

  if (DOM.freeMoveCustomTitleCheckbox) {
    DOM.freeMoveCustomTitleCheckbox.addEventListener("change", (e) => {
      handleSettingUpdate("freeMoveCustomTitle", e.target.checked)
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "freeMoveCustomTitle", value: e.target.checked },
        }),
      )
    })
  }

  const customTitleSliders = [
    { dom: document.getElementById("custom-title-font-size"), valDom: document.getElementById("custom-title-fontsize-val"), key: "customTitleFontSize" },
    { dom: document.getElementById("custom-title-letter-spacing"), valDom: document.getElementById("custom-title-letter-spacing-val"), key: "customTitleLetterSpacing" },
    { dom: document.getElementById("custom-title-font-size-2"), valDom: document.getElementById("custom-title-fontsize-2-val"), key: "customTitleFontSize2" },
    { dom: document.getElementById("custom-title-letter-spacing-2"), valDom: document.getElementById("custom-title-letter-spacing-2-val"), key: "customTitleLetterSpacing2" },
    { dom: document.getElementById("custom-title-font-size-3"), valDom: document.getElementById("custom-title-fontsize-3-val"), key: "customTitleFontSize3" },
    { dom: document.getElementById("custom-title-letter-spacing-3"), valDom: document.getElementById("custom-title-letter-spacing-3-val"), key: "customTitleLetterSpacing3" },
    { dom: document.getElementById("custom-title-font-size-4"), valDom: document.getElementById("custom-title-fontsize-4-val"), key: "customTitleFontSize4" },
    { dom: document.getElementById("custom-title-letter-spacing-4"), valDom: document.getElementById("custom-title-letter-spacing-4-val"), key: "customTitleLetterSpacing4" },
    { dom: document.getElementById("custom-title-line-spacing"), valDom: document.getElementById("custom-title-line-spacing-val"), key: "customTitleLineSpacing" },
  ]

  customTitleSliders.forEach((s) => {
    s.dom?.addEventListener("input", (e) => {
      const val = parseInt(e.target.value)
      if (s.valDom) s.valDom.textContent = val
      updateSetting(s.key, val)
      window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: s.key, value: val } }))
    })
    s.dom?.addEventListener("change", (e) => handleSettingUpdate(s.key, parseInt(e.target.value)))
  })

  const customTitleFields = [
    { dom: document.getElementById("custom-title-text"), key: "customTitleText", isCheckbox: false },
    { dom: document.getElementById("custom-title-text-2"), key: "customTitleText2", isCheckbox: false },
    { dom: document.getElementById("custom-title-text-3"), key: "customTitleText3", isCheckbox: false },
    { dom: document.getElementById("custom-title-text-4"), key: "customTitleText4", isCheckbox: false },
    { dom: document.getElementById("custom-title-font"), key: "customTitleFont", isCheckbox: false },
    { dom: document.getElementById("custom-title-font-2"), key: "customTitleFont2", isCheckbox: false },
    { dom: document.getElementById("custom-title-font-3"), key: "customTitleFont3", isCheckbox: false },
    { dom: document.getElementById("custom-title-font-4"), key: "customTitleFont4", isCheckbox: false },
    { dom: document.getElementById("custom-title-orientation"), key: "customTitleOrientation", isCheckbox: false },
    { dom: document.getElementById("custom-title-orientation-2"), key: "customTitleOrientation2", isCheckbox: false },
    { dom: document.getElementById("custom-title-orientation-3"), key: "customTitleOrientation3", isCheckbox: false },
    { dom: document.getElementById("custom-title-orientation-4"), key: "customTitleOrientation4", isCheckbox: false },
    { dom: document.getElementById("custom-title-direction"), key: "customTitleDirection", isCheckbox: false },
    { dom: document.getElementById("custom-title-order"), key: "customTitleOrder", isCheckbox: false },
    { dom: document.getElementById("custom-title-word-wrap"), key: "customTitleWordWrap", isCheckbox: true },
    { dom: document.getElementById("custom-title-animation"), key: "customTitleAnimation", isCheckbox: false },
    { dom: document.getElementById("custom-title-animation-loop"), key: "customTitleAnimationLoop", isCheckbox: false },
    {
      dom: DOM.customTitleMulticolor,
      key: "customTitleMulticolor",
      isCheckbox: true,
    },
    { dom: DOM.customTitleColor, key: "customTitleColor", isCheckbox: false },
    {
      dom: DOM.customTitleFontSize,
      key: "customTitleFontSize",
      isCheckbox: false,
      valDisp: "custom-title-fontsize-val",
    },
    {
      dom: document.getElementById("custom-title-font-size-2"),
      key: "customTitleFontSize2",
      isCheckbox: false,
      valDisp: "custom-title-fontsize-2-val",
    },
    {
      dom: DOM.customTitleLetterSpacing,
      key: "customTitleLetterSpacing",
      isCheckbox: false,
      valDisp: "custom-title-letter-spacing-val",
    },
    {
      dom: document.getElementById("custom-title-letter-spacing-2"),
      key: "customTitleLetterSpacing2",
      isCheckbox: false,
      valDisp: "custom-title-letter-spacing-2-val",
    },
    {
      dom: DOM.customTitleShadowBlur,
      key: "customTitleShadowBlur",
      isCheckbox: false,
      valDisp: "custom-title-shadow-blur-val",
    },
    {
      dom: DOM.customTitleShadowY,
      key: "customTitleShadowY",
      isCheckbox: false,
      valDisp: "custom-title-shadow-y-val",
    },
    {
      dom: DOM.customTitleShadowColor,
      key: "customTitleShadowColor",
      isCheckbox: false,
    },
    {
      dom: DOM.customTitleBorderSize,
      key: "customTitleBorderSize",
      isCheckbox: false,
      valDisp: "custom-title-border-size-val",
    },
    {
      dom: DOM.customTitleBorderColor,
      key: "customTitleBorderColor",
      isCheckbox: false,
    },
  ]

  const line3Container = document.getElementById("custom-title-line-3-container")
  const line4Container = document.getElementById("custom-title-line-4-container")
  const addLineBtn = document.getElementById("custom-title-add-line-btn")
  const removeLineBtns = document.querySelectorAll(".remove-line-btn")

  const updateLineVisibility = () => {
    if (!line3Container || !line4Container || !addLineBtn) return
    const isLine3Visible = line3Container.style.display !== "none"
    const isLine4Visible = line4Container.style.display !== "none"
    
    if (isLine3Visible && isLine4Visible) {
      addLineBtn.style.display = "none"
    } else {
      addLineBtn.style.display = "block"
    }
  }

  const currentSettings = getSettings()
  if (line3Container && currentSettings.customTitleText3) line3Container.style.display = "block"
  if (line4Container && currentSettings.customTitleText4) line4Container.style.display = "block"
  updateLineVisibility()

  if (addLineBtn) {
    addLineBtn.addEventListener("click", () => {
      if (line3Container.style.display === "none") {
        line3Container.style.display = "block"
      } else if (line4Container.style.display === "none") {
        line4Container.style.display = "block"
      }
      updateLineVisibility()
    })
  }

  if (removeLineBtns.length) {
    removeLineBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget.dataset.target
        if (target === "3") {
          line3Container.style.display = "none"
          const input = document.getElementById("custom-title-text-3")
          if (input) {
             input.value = ""
             handleSettingUpdate("customTitleText3", "")
             window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "customTitleText3", value: "" } }))
          }
        } else if (target === "4") {
          line4Container.style.display = "none"
          const input = document.getElementById("custom-title-text-4")
          if (input) {
             input.value = ""
             handleSettingUpdate("customTitleText4", "")
             window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "customTitleText4", value: "" } }))
          }
        }
        updateLineVisibility()
      })
    })
  }

  customTitleFields.forEach((field) => {
    if (field.dom) {
      field.dom.addEventListener("input", (e) => {
        const val = field.isCheckbox
          ? e.target.checked
          : field.dom.type === "range"
            ? parseInt(e.target.value)
            : e.target.value
        if (field.valDisp) {
          const disp = document.getElementById(field.valDisp)
          if (disp) disp.textContent = val
        }
        updateSetting(field.key, val)
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: field.key, value: val },
          }),
        )
      })
      field.dom.addEventListener("change", (e) => {
        const val = field.isCheckbox
          ? e.target.checked
          : field.dom.type === "range"
            ? parseInt(e.target.value)
            : e.target.value
        handleSettingUpdate(field.key, val)
      })
    }
  })

  // Google Drive Sync
  // Google Drive Sync
  if (DOM.googleDriveSyncCheckbox) {
    DOM.googleDriveSyncCheckbox.addEventListener("change", async (e) => {
      const enabled = e.target.checked
      try {
        await DriveSync.toggleSync(enabled, async () => {
          return await buildExportPayload(false)
        })
        if (DOM.driveSyncOptionsWrapper) {
          DOM.driveSyncOptionsWrapper.style.display = enabled ? "block" : "none"
        }
      } catch (err) {
        DOM.googleDriveSyncCheckbox.checked = !enabled
      }
    })
  }

  if (DOM.driveAutoBackupInterval) {
    DOM.driveAutoBackupInterval.addEventListener("change", (e) => {
      handleSettingUpdate("driveAutoBackupInterval", e.target.value)
    })
  }

  if (DOM.forceDriveSyncBtn) {
    DOM.forceDriveSyncBtn.addEventListener("click", async () => {
      const payload = await buildExportPayload(false)
      if (!payload) return

      DOM.forceDriveSyncBtn.disabled = true
      DOM.forceDriveSyncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...'
      await DriveSync.syncToDrive(payload)
      DOM.forceDriveSyncBtn.disabled = false
      DOM.forceDriveSyncBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload'
    })
  }

  if (DOM.forceDriveDownloadBtn) {
    DOM.forceDriveDownloadBtn.addEventListener("click", async () => {
      DOM.forceDriveDownloadBtn.disabled = true
      DOM.forceDriveDownloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Downloading...'
      try {
        await DriveSync.syncFromDrive(true)
      } catch (err) {
        showAlert("Failed to download or invalid JSON.")
      }
      DOM.forceDriveDownloadBtn.disabled = false
      DOM.forceDriveDownloadBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Download'
    })
  }

  // Ensure LCP side controls stay in sync with layout visibility toggles
  window.addEventListener("layoutUpdated", (e) => {
    if (!e.detail) return
    const { key, value } = e.detail
    if (key === "showSearchBar" && DOM.lcpSearchBar)
      DOM.lcpSearchBar.checked = value
    if (key === "showBookmarks" && DOM.lcpBookmarks)
      DOM.lcpBookmarks.checked = value
    if (key === "showQuickAccessBg" && DOM.lcpQuickAccessBg)
      DOM.lcpQuickAccessBg.checked = value
    if (key === "showContextMenuBg" && DOM.lcpContextMenuBg)
      DOM.lcpContextMenuBg.checked = value
    if (key === "showBookmarkGroups" && DOM.lcpBookmarkGroups)
      DOM.lcpBookmarkGroups.checked = value
    if (key === "showBookmarkGroups" && DOM.bookmarkLayoutShowGroups)
      DOM.bookmarkLayoutShowGroups.checked = value
    if (key === "showLunarCalendar" && DOM.lcpLunarCalendar)
      DOM.lcpLunarCalendar.checked = value
    if (key === "showLunarCalendar" && DOM.calendarDisplayModeSelect) {
      DOM.calendarDisplayModeSelect.value = value ? "both" : "solar"
    }
    if (key === "calendarDateMode" && DOM.calendarDisplayModeSelect) {
      DOM.calendarDisplayModeSelect.value = value
    }
    if (key === "calendarDateMode" && DOM.lcpLunarCalendar) {
      DOM.lcpLunarCalendar.checked = value !== "solar"
    }
    if (key === "showClockLunarMode" && DOM.clockLunarModeSelect) {
      DOM.clockLunarModeSelect.value = value
    }
    if (key === "widgetUseM3Accent" && DOM.m3WidgetsToggle) {
      DOM.m3WidgetsToggle.checked = value === true
    }

    if (key === "sidebarUseM3Accent" && DOM.m3SidebarToggle) {
      DOM.m3SidebarToggle.checked = value === true
    }
    if (key === "m3PaletteStyle" && DOM.m3PaletteStyleSelect) {
      DOM.m3PaletteStyleSelect.value = value || "tonalSpot"
    }
    if (key === "accentColorMode") {
      if (DOM.accentColorModeM3) DOM.accentColorModeM3.checked = value !== "default"
      if (DOM.accentColorModeDefault)
        DOM.accentColorModeDefault.checked = value === "default"
      DOM.accentColorSettingsBody?.classList.toggle(
        "accent-mode-default",
        value === "default",
      )
    }
    if (key === "musicPlayerUseDefaultColor" && DOM.musicPlayerUseDefaultColorMode) {
      if (value === "thumbnail") {
        DOM.musicPlayerUseDefaultColorMode.value = "thumbnail"
      } else {
        DOM.musicPlayerUseDefaultColorMode.value = value === true ? "true" : "false"
      }
    }
    if (key === "musicSourceIconColorMode" && DOM.musicSourceIconColorModeSelect) {
      DOM.musicSourceIconColorModeSelect.value = value || "brand"
    }
    if (key === "sideControlsGhostMode" && DOM.lcpGhostControls)
      DOM.lcpGhostControls.checked = value
    if (key === "showTopRightControls" && DOM.lcpTopRightControls)
      DOM.lcpTopRightControls.checked = value
    if (key === "flipLayout" && DOM.lcpFlipLayout)
      DOM.lcpFlipLayout.checked = value
    if (key === "searchBarWidth" && DOM.lcpSearchBarWidth)
      DOM.lcpSearchBarWidth.value = value
    if (key === "bookmarkLayout" && DOM.lcpBookmarkLayout)
      DOM.lcpBookmarkLayout.value = value
  })
}
