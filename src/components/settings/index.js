/**
 * Settings Module Index - Main Initialization
 * Coordinates all sub-modules and provides initSettings() export
 */

import { showAlert, showConfirm } from "../../utils/dialog.js"
import {
  saveImage,
  saveVideo,
  getImageBlob,
  getThumbnailUrl,
  getImageUrl,
} from "../../services/imageStore.js"
import * as DOM_EXPORTS from "../../utils/dom.js"
import { refreshDOMReferences } from "../../utils/dom.js"
import {
  getSettings,
  updateSetting,
  saveSettings,
  localBackgrounds,
  resetSettingsState,
} from "../../services/state.js"
import {
  geti18n,
  loadLanguage,
  applyTranslations,
} from "../../services/i18n.js"

// Import modular components
import { createEffectFactories } from "./effectFactories.js"
import {
  getTabIconChars,
  applyTabIcon,
  renderTabIconPreview,
} from "./tabIcon.js"
import {
  loadGoogleFont,
  renderFontGrid,
  initFont,
  setupFontMultiSelect,
  setupLocalFonts,
} from "./fontManager.js"
import { initThemeManager, THEMEABLE_KEYS } from "./themeManager.js"
import {
  initGradientV2Manager,
  renderUserGradientV2s,
} from "./gradientV2Manager.js"
import { getSvgWaveParams, updateWaveColorPreviews } from "./svgWaveUtils.js"
import {
  populateUnsplashCollections,
  setUnsplashRandomBackground,
} from "./unsplashFetcher.js"
import {
  createApplySettings,
  createUpdateSettingsInputs,
} from "./settingsApplier.js?v=2"
import { applyAccentFromCurrentBackground } from "./dynamicAccent.js"
import {
  renderLocalBackgrounds,
  renderUserColors,
  renderUserAccentColors,
  setupMultiSelectMode,
  setupFileUploads,
} from "./backgroundManager.js"
import {
  renderUserGradients,
  setupGradientMultiSelect,
} from "./gradientManager.js"
import {
  renderUserSvgWaves,
  setupSvgWaveMultiSelect,
} from "./svgWaveManager.js"
import {
  initSpecialEffectsManager,
  renderUserSilks,
  renderUserLightPillars,
  renderUserLiquidEthers,
} from "./specialEffectsManager.js"
import { setupEffectColorHandlers } from "./effectColorHandlers.js"
import {
  setupMultiColorManager,
  renderSavedMultiColors,
} from "./multiColorManager.js"
import { setupGeneralEventHandlers } from "./eventHandlers.js"
import { BACKGROUND_ANIMATION_KEYS } from "./visualPresetConfig.js"

function hslToHex(h, s, l) {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function getRandomSoftAuroraPalette() {
  const hue = Math.floor(Math.random() * 360)
  const accentHue = (hue + 120 + Math.floor(Math.random() * 70)) % 360
  return {
    color1: hslToHex(hue, 58 + Math.floor(Math.random() * 18), 72),
    color2: hslToHex(accentHue, 72 + Math.floor(Math.random() * 16), 56),
  }
}

function randomRange(min, max, step = 0.1) {
  const steps = Math.round((max - min) / step)
  return Number(
    (min + Math.floor(Math.random() * (steps + 1)) * step).toFixed(2),
  )
}

function getRandomSoftAuroraConfig() {
  const palette = getRandomSoftAuroraPalette()
  return {
    ...palette,
    speed: randomRange(0.2, 1.6, 0.1),
    scale: randomRange(0.8, 3.2, 0.1),
    brightness: randomRange(0.7, 2.2, 0.1),
    noiseFrequency: randomRange(1.0, 7.0, 0.1),
    noiseAmplitude: randomRange(0.5, 3.5, 0.1),
    bandHeight: randomRange(0.15, 0.85, 0.05),
    bandSpread: randomRange(0.8, 6.0, 0.1),
    octaveDecay: randomRange(0.05, 0.55, 0.01),
    layerOffset: randomRange(0.0, 8.0, 0.1),
    colorSpeed: randomRange(0.4, 3.0, 0.1),
    enableMouseInteraction: Math.random() > 0.2,
    mouseInfluence: randomRange(0.1, 1.0, 0.05),
  }
}

function getExtensionVersion() {
  try {
    if (typeof chrome !== "undefined" && chrome.runtime?.getManifest) {
      return chrome.runtime.getManifest().version || ""
    }
  } catch {
    // Keep version empty outside extension context.
  }
  return ""
}



function createEffects(settings) {
  const instances = {}
  const extraProps = {}
  const factories = createEffectFactories(settings)

  const getEffect = (key) => {
    if (!factories[key]) return undefined
    if (!Object.prototype.hasOwnProperty.call(instances, key)) {
      instances[key] = factories[key]()
    }
    return instances[key]
  }

  const releaseEffect = (key) => {
    if (!Object.prototype.hasOwnProperty.call(instances, key)) return
    const effect = instances[key]
    if (effect?.active && typeof effect.stop === "function") effect.stop()
    if (typeof effect?.destroy === "function") {
      effect.destroy()
    } else if (typeof effect?.dispose === "function") {
      effect.dispose()
    } else if (typeof effect?.stop === "function") {
      effect.stop()
    }
    delete instances[key]
  }

  return new Proxy(extraProps, {
    get(target, prop) {
      if (prop === "getEffect") return getEffect
      if (prop === "hasEffect") return (key) => Boolean(instances[key])
      if (prop === "releaseEffect") return releaseEffect
      if (prop in target) return target[prop]
      if (prop in factories) return getEffect(prop)
      return undefined
    },
    set(target, prop, value) {
      target[prop] = value
      return true
    },
    ownKeys(target) {
      return Reflect.ownKeys(instances).concat(Reflect.ownKeys(target))
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop in instances) {
        return { configurable: true, enumerable: true, value: instances[prop] }
      }
      if (prop in target) {
        return { configurable: true, enumerable: false, value: target[prop] }
      }
      return undefined
    },
  })
}

export async function initSettings() {
  refreshDOMReferences()
  applyTranslations()
  const settings = getSettings()
  if (settings.effect === "stormRain") {
    updateSetting("effect", "musicBars")
    saveSettings()
    settings.effect = "musicBars"
  }
  if (DOM_EXPORTS.settingsVersion) {
    const version = getExtensionVersion()
    DOM_EXPORTS.settingsVersion.textContent = version ? `v${version}` : ""
  }

  const effectCountSpan = document.getElementById("count-effect")
  if (effectCountSpan) {
    const effectItemCount = document.querySelectorAll(".effect-item").length
    // Subtract 1 to exclude 'None' from the count
    effectCountSpan.textContent = `(${effectItemCount - 1})`
  }

  // Effect instances are created on first use to keep the new-tab baseline light.
  const effects = createEffects(settings)
  const getActiveOrCreatedEffect = (key, isActive = false) => {
    if (!isActive && !effects.hasEffect?.(key)) return null
    return effects[key] || null
  }

  // Build utilities context
  const ctx = {
    effects,
    DOM: DOM_EXPORTS,
    localBackgrounds,
    i18n: geti18n(),
  }

  let settingsGalleriesRendered = false
  const runWhenIdle = (callback, timeout = 1200) => {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(callback, { timeout })
    } else {
      setTimeout(callback, 200)
    }
  }

  function refreshBackgroundGalleries() {
    renderLocalBackgrounds(DOM_EXPORTS, handleSettingUpdate)
    renderUserColors(DOM_EXPORTS)
    renderUserGradients(DOM_EXPORTS)
    renderUserSvgWaves(DOM_EXPORTS, () => effects.svgWaveEffect, () => {
      handleSettingUpdate("svgWaveActive", true)
    })
    renderUserGradientV2s(DOM_EXPORTS)
    renderUserSilks()
    renderUserLightPillars()
    renderUserLiquidEthers()
    renderSavedMultiColors(DOM_EXPORTS)
  }

  function renderSettingsGalleries() {
    if (settingsGalleriesRendered) return
    settingsGalleriesRendered = true
    effects.ensureFactoriesLoaded?.()
    refreshBackgroundGalleries()
    populateUnsplashCollections(
      DOM_EXPORTS.unsplashCategorySelect,
      getSettings(),
    )
  }

  function scheduleSettingsGalleriesRender() {
    runWhenIdle(renderSettingsGalleries, 600)
  }

  const scheduleAutoAccentUpdate = () => {
    ;[120, 650, 1400].forEach((delay) => {
      setTimeout(() => {
        if (getSettings().m3AutoAccentFromBg !== true) return
        applyAccentFromCurrentBackground({
          DOM: DOM_EXPORTS,
          handleSettingUpdate,
          fallbackRandom: false,
          silent: true,
        }).catch((err) => {
          console.warn("Auto M3 accent update failed:", err)
        })
      }, delay)
    })
  }

  const autoAccentBackgroundKeys = new Set([
    "background",
    "activeBgUid",
    "gradientStart",
    "gradientEnd",
    "gradientAngle",
    "gradientType",
    "gradientRepeating",
    "gradientExtraColorCount",
    "gradientCustomColors",
    "gradientPosition",
    "gradientRadialShape",
    "multiColorActive",
    "multiColorCount",
    "multiColors",
    "multiGradientAngle",
    "multiColorMode",
    "multiColorType",
    "multiColorRepeating",
    "multiColorPosition",
    "multiColorRadialShape",
    "multiColorDividers",
    "multiColorDividerColor",
    "multiColorDividerWidth",
    "multiColorFreeLineAngles",
    "multiColorLineAngles",
    "liquidEtherColors",
    ...BACKGROUND_ANIMATION_KEYS,
  ])

  async function handleSettingUpdate(
    key,
    value,
    isGradient = false,
    skipSave = false,
  ) {
    const animatedBackgroundKeys = [
      "gradientV2Active",
      "svgWaveActive",
      "silkActive",
      "lightPillarActive",
      "liquidEtherActive",
      "splashCursorActive",
    ]

    const isAnimatedBackgroundActive = (settings) =>
      animatedBackgroundKeys.some((activeKey) => settings[activeKey] === true)

    const getBackgroundStateSnapshot = (settings) => ({
      background: settings.background ?? null,
      activeBgUid: settings.activeBgUid || null,
      svgWaveActive: settings.svgWaveActive === true,
      gradientV2Active: settings.gradientV2Active === true,
      silkActive: settings.silkActive === true,
      lightPillarActive: settings.lightPillarActive === true,
      liquidEtherActive: settings.liquidEtherActive === true,
      splashCursorActive: settings.splashCursorActive === true,
      splashCursorDarkBg: settings.splashCursorDarkBg === true,
      gradientStart: settings.gradientStart,
      gradientEnd: settings.gradientEnd,
      gradientAngle: settings.gradientAngle,
      gradientType: settings.gradientType,
      gradientRepeating: settings.gradientRepeating,
      gradientExtraColorCount: settings.gradientExtraColorCount,
      gradientCustomColors: settings.gradientCustomColors,
      gradientPosition: settings.gradientPosition,
      gradientRadialShape: settings.gradientRadialShape,
      multiColorActive: settings.multiColorActive === true,
      multiColorCount: settings.multiColorCount,
      multiColors: Array.isArray(settings.multiColors)
        ? [...settings.multiColors]
        : settings.multiColors,
      multiGradientAngle: settings.multiGradientAngle,
      multiColorType: settings.multiColorType,
      multiColorRepeating: settings.multiColorRepeating,
      multiColorPosition: settings.multiColorPosition,
      multiColorRadialShape: settings.multiColorRadialShape,
      multiColorMode: settings.multiColorMode,
      multiColorDividers: settings.multiColorDividers,
      multiColorDividerColor: settings.multiColorDividerColor,
      multiColorDividerWidth: settings.multiColorDividerWidth,
      multiColorFreeLineAngles: settings.multiColorFreeLineAngles,
      multiColorLineAngles: Array.isArray(settings.multiColorLineAngles)
        ? [...settings.multiColorLineAngles]
        : settings.multiColorLineAngles,
      unsplashLastCredit: settings.unsplashLastCredit || null,
    })

    const rememberCurrentBackground = () => {
      const settings = getSettings()
      if (isAnimatedBackgroundActive(settings)) return
      const snapshot = getBackgroundStateSnapshot(settings)
      updateSetting("lastUserBackgroundState", snapshot)
      updateSetting("lastUserBackground", snapshot.background)
      updateSetting("lastUserActiveBgUid", snapshot.activeBgUid)
    }

    const restoreRememberedBackground = () => {
      const settings = getSettings()
      const snapshot = settings.lastUserBackgroundState
      if (snapshot && typeof snapshot === "object") {
        Object.entries(snapshot).forEach(([snapshotKey, snapshotValue]) => {
          updateSetting(snapshotKey, snapshotValue)
        })
      } else if (
        settings.background == null &&
        settings.lastUserBackground != null
      ) {
        updateSetting("background", settings.lastUserBackground)
        updateSetting("activeBgUid", settings.lastUserActiveBgUid || null)
      }
    }

    const isMediaLikeBackgroundValue = (candidate) =>
      typeof candidate === "string" &&
      (candidate.startsWith("#") ||
        candidate.includes("gradient(") ||
        candidate.startsWith("data:image") ||
        candidate.startsWith("data:video") ||
        candidate.startsWith("blob:") ||
        candidate.startsWith("idb-img-") ||
        candidate.startsWith("idb-gif-") ||
        candidate.startsWith("idb-video-") ||
        /^https?:\/\//i.test(candidate) ||
        /\.(mp4|webm|mov|ogg)(?:[?#].*)?$/i.test(candidate) ||
        candidate.includes("googlevideo"))

    const currentBackgroundSnapshot =
      key === "background" && value != null
        ? getBackgroundStateSnapshot(getSettings())
        : null
    const shouldRestoreRememberedBackground =
      key === "background" &&
      value == null &&
      isMediaLikeBackgroundValue(getSettings().background) &&
      getSettings().lastUserBackgroundState &&
      typeof getSettings().lastUserBackgroundState === "object"

    if (shouldRestoreRememberedBackground) {
      const snapshot = getSettings().lastUserBackgroundState
      const current = getSettings()
      const snapshotIsCurrentMedia =
        snapshot.background === current.background &&
        !snapshot.svgWaveActive &&
        !snapshot.gradientV2Active &&
        !snapshot.silkActive &&
        !snapshot.lightPillarActive &&
        !snapshot.liquidEtherActive &&
        !snapshot.splashCursorActive

      if (!snapshotIsCurrentMedia) {
        Object.entries(snapshot).forEach(([snapshotKey, snapshotValue]) => {
          updateSetting(snapshotKey, snapshotValue)
        })
        updateSetting("unsplashLastCredit", null)
        updateSetting(
          "lastUserBackgroundPreview",
          typeof snapshot.background === "string" &&
            (snapshot.background.startsWith("#") ||
              snapshot.background.includes("gradient("))
            ? snapshot.background
            : null,
        )
        if (!skipSave) saveSettings(true)
        applySettings()
        updateSettingsInputs()
        return
      }
    }

    if (key !== "background") {
      rememberCurrentBackground()
    }

    if (isGradient) {
      const settingsBeforeGradientUpdate = getSettings()
      const previousGradientUid = settingsBeforeGradientUpdate.activeBgUid
      const editableGradientUid =
        value.uid ||
        ((settingsBeforeGradientUpdate.userGradients || []).some(
          (gradient) =>
            gradient.uid === previousGradientUid &&
            gradient.type !== "multi-color",
        )
          ? previousGradientUid
          : null)

      updateSetting("gradientStart", value.start)
      updateSetting("gradientEnd", value.end)
      updateSetting("gradientAngle", value.angle)
      updateSetting("gradientType", value.type || "linear")
      updateSetting("gradientRepeating", value.repeating === true)
      updateSetting(
        "gradientExtraColorCount",
        Math.min(
          5,
          Math.max(
            0,
            value.extraColorCount !== undefined
              ? Number(value.extraColorCount)
              : 2,
          ),
        ),
      )
      updateSetting(
        "gradientCustomColors",
        typeof value.customColors === "string" ? value.customColors : "",
      )
      updateSetting("gradientPosition", value.position || "center")
      updateSetting("gradientRadialShape", value.radialShape || "circle")
      updateSetting("activeBgUid", editableGradientUid)
      updateSetting("background", null)
      updateSetting("multiColorActive", false)
      updateSetting("svgWaveActive", false)
      updateSetting("gradientV2Active", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("liquidEtherActive", false)
      updateSetting("splashCursorActive", false)
      updateSetting(
        "lastUserBackgroundState",
        getBackgroundStateSnapshot(getSettings()),
      )

      if (editableGradientUid) {
        updateSetting(
          "userGradients",
          (settingsBeforeGradientUpdate.userGradients || []).map((gradient) => {
            if (gradient.uid !== editableGradientUid) return gradient
            return {
              ...gradient,
              start: value.start,
              end: value.end,
              angle: value.angle,
              type: value.type || "linear",
              repeating: value.repeating === true,
              extraColorCount: Math.min(
                5,
                Math.max(
                  0,
                  value.extraColorCount !== undefined
                    ? Number(value.extraColorCount)
                    : 2,
                ),
              ),
              customColors:
                typeof value.customColors === "string"
                  ? value.customColors
                  : "",
              position: value.position || "center",
              radialShape: value.radialShape || "circle",
            }
          }),
        )
      }
      applySettings()
    } else {
      updateSetting(key, value)
      if (key === "background") {
        if (value == null) {
          updateSetting("lastUserBackgroundPreview", null)
          updateSetting("activeBgUid", null)
        } else if (
          typeof value === "string" &&
          (value.startsWith("#") ||
            value.includes("gradient(") ||
            value.startsWith("linear-gradient") ||
            value.startsWith("radial-gradient") ||
            value.startsWith("conic-gradient"))
        ) {
          updateSetting("lastUserBackgroundPreview", value)
        } else if (
          typeof value === "string" &&
          (value.startsWith("data:video") ||
            value.startsWith("idb-video-") ||
            /\.(mp4|webm|mov|ogg)(?:[?#].*)?$/i.test(value) ||
            value.includes("googlevideo"))
        ) {
          updateSetting("lastUserBackgroundPreview", null)
        } else if (
          typeof value === "string" &&
          (value.startsWith("data:image") ||
            value.startsWith("blob:") ||
            /^https?:\/\//i.test(value))
        ) {
          updateSetting("lastUserBackgroundPreview", value)
        } else if (typeof value === "string" && value.startsWith("idb-")) {
          updateSetting("lastUserBackgroundPreview", null)
        }

        if (value != null) {
          const settings = getSettings()
          const activeBgUid = settings.activeBgUid || null
          const activePreset = activeBgUid
            ? (settings.userBackgrounds || []).find((bg) => {
                const bgId = typeof bg === "object" ? bg.id : bg
                const bgUid = typeof bg === "object" ? bg.uid || bg.id : bg
                return bgUid === activeBgUid && bgId === value
              })
            : null

          updateSetting("lastUserBackground", value)
          updateSetting(
            "lastUserActiveBgUid",
            activePreset ? activeBgUid : null,
          )
          if (!activePreset) updateSetting("activeBgUid", null)
          updateSetting(
            "lastUserBackgroundState",
            currentBackgroundSnapshot || getBackgroundStateSnapshot(getSettings()),
          )
          // Generate a small persistent preview for faster reloads (data URL or CSS)
          ;(async () => {
            try {
              const previewKey = "lastUserBackgroundPreview"
              const settingsNow = getSettings()
              if (
                settingsNow.gradientV2Active ||
                settingsNow.silkActive ||
                settingsNow.lightPillarActive ||
                settingsNow.liquidEtherActive
              ) {
                const preview = (() => {
                  if (settingsNow.gradientV2Active)
                    return `linear-gradient(135deg, ${settingsNow.gradientV2Color1 || "#0f172a"}, ${settingsNow.gradientV2Color2 || "#1d4ed8"}, ${settingsNow.gradientV2Color3 || "#7c3aed"})`
                  if (settingsNow.silkActive)
                    return `radial-gradient(circle at center, ${settingsNow.silkColor || "#7B7481"}, #050505)`
                  if (settingsNow.lightPillarActive)
                    return `linear-gradient(180deg, ${settingsNow.lightPillarTopColor || "#ffffff"}, ${settingsNow.lightPillarBottomColor || "#000000"})`
                  if (settingsNow.liquidEtherActive)
                    return `linear-gradient(135deg, ${settingsNow.liquidEtherColor1 || "#5227FF"}, ${settingsNow.liquidEtherColor2 || "#FF9FFC"}, ${settingsNow.liquidEtherColor3 || "#B497CF"})`
                  return null
                })()
                if (preview) {
                  updateSetting(previewKey, preview)
                  saveSettings()
                }
                return
              }

              const bg = value
              if (!bg) {
                updateSetting("lastUserBackgroundPreview", null)
                saveSettings()
                return
              }

              if (
                typeof bg === "string" &&
                (bg.startsWith("#") ||
                  bg.includes("gradient(") ||
                  bg.startsWith("linear-gradient") ||
                  bg.startsWith("radial-gradient") ||
                  bg.startsWith("conic-gradient"))
              ) {
                updateSetting("lastUserBackgroundPreview", bg)
                saveSettings()
                return
              }

              let candidateUrl = null
              if (typeof bg === "string") {
                if (bg.startsWith("idb-")) {
                  candidateUrl =
                    (await getThumbnailUrl(bg).catch(() => null)) ||
                    (await getImageUrl(bg).catch(() => null))
                } else if (
                  bg.startsWith("data:") ||
                  bg.startsWith("blob:") ||
                  /^https?:\/\//i.test(bg)
                ) {
                  candidateUrl = bg
                }
              }

              if (!candidateUrl) return

              try {
                const img = new Image()
                img.crossOrigin = "Anonymous"
                const dataUrl = await new Promise((resolve) => {
                  img.onload = () => {
                    try {
                      const canvas = document.createElement("canvas")
                      // Kích thước nhỏ 32x32 hoặc 16x16 để tải data URL nhanh nhất có thể (chỉ làm nền mờ mờ)
                      const size = 32
                      canvas.width = size
                      canvas.height = size
                      const ctx = canvas.getContext("2d")
                      ctx.drawImage(img, 0, 0, size, size)
                      const quality = 0.5 // WebP quality giúp string base64 ngắn hơn và HỖ TRỢ TRONG SUỐT
                      resolve(canvas.toDataURL("image/webp", quality))
                    } catch (e) {
                      resolve(candidateUrl)
                    }
                  }
                  img.onerror = () => resolve(candidateUrl)
                  img.src = candidateUrl
                })
                if (dataUrl && !dataUrl.startsWith("blob:")) {
                  updateSetting("lastUserBackgroundPreview", dataUrl)
                  saveSettings()
                } else {
                  updateSetting("lastUserBackgroundPreview", null)
                  saveSettings()
                }
              } catch (e) {
                // ignore
              }
            } catch (err) {
              console.warn("Background preview generation failed:", err)
            }
          })()
          updateSetting("svgWaveActive", false)
          updateSetting("gradientV2Active", false)
          updateSetting("silkActive", false)
          updateSetting("lightPillarActive", false)
          updateSetting("liquidEtherActive", false)
          updateSetting("splashCursorActive", false)
        }
        // Clear Unsplash credit if we switch to a different background
        // that isn't an Unsplash image (managed in unsplashFetcher.js)
        if (!String(value).includes("unsplash")) {
          updateSetting("unsplashLastCredit", null)
          if (DOM_EXPORTS.unsplashCredit) {
            DOM_EXPORTS.unsplashCredit.style.display = "none"
            DOM_EXPORTS.unsplashCredit.innerHTML = ""
          }
        }
      }
    }

    const backgroundVisualKeys = new Set([
      "bgBlur",
      "bgBrightness",
      "bgContrast",
      "bgSaturation",
      "bgFadeIn",
      "bgPositionX",
      "bgPositionY",
      "bgSize",
      "bgImageScale",
    ])

    if (!isGradient && backgroundVisualKeys.has(key)) {
      const settings = getSettings()
      const userBackgrounds = settings.userBackgrounds || []
      const activeUid = settings.activeBgUid
      const activeBg = settings.background

      const nextBackgrounds = userBackgrounds.map((bg) => {
        const bgId = typeof bg === "object" ? bg.id : bg
        const bgUid = typeof bg === "object" ? bg.uid || bg.id : bg
        const isActive =
          (activeUid && bgUid === activeUid) ||
          (!activeUid && activeBg && bgId === activeBg)

        if (!isActive) return bg

        const normalized = typeof bg === "object" ? { ...bg } : { id: bg }
        normalized.settings = {
          ...(normalized.settings || {}),
          [key]: value,
        }
        return normalized
      })

      if (nextBackgrounds.some((bg, index) => bg !== userBackgrounds[index])) {
        updateSetting("userBackgrounds", nextBackgrounds)
      }
    }

    // Trigger re-renders for galleries to show active state after the settings
    // sidebar has actually needed those galleries.
    const isSavedGradientSelection = isGradient && Boolean(value?.uid)

    if (
      settingsGalleriesRendered &&
      !backgroundVisualKeys.has(key) &&
      (!isGradient || isSavedGradientSelection)
    ) {
      setTimeout(() => {
        renderUserGradients(DOM_EXPORTS)
        renderSavedMultiColors(DOM_EXPORTS)
        renderLocalBackgrounds(DOM_EXPORTS)
      }, 0)
    }

    // Clear active theme if a themeable setting is changed manually
    const currentSettings = getSettings()
    if (
      currentSettings.theme &&
      key !== "theme" &&
      (isGradient || THEMEABLE_KEYS.includes(key))
    ) {
      updateSetting("theme", null)
      // We need to update UI as well
      const themeItems = document.querySelectorAll("#themes-grid .theme-item")
      themeItems.forEach((item) => item.classList.remove("active"))
    }

    if (!skipSave) {
      saveSettings()
    }

    // Avoid expensive gallery rerenders for unrelated toggles (e.g. clock/date).
    const shouldRefreshBackgroundGalleries =
      isSavedGradientSelection ||
      key === "background" ||
      key === "svgWaveActive" ||
      key === "gradientV2Active" ||
      key === "silkActive" ||
      key === "lightPillarActive" ||
      key === "liquidEtherActive" ||
      key === "splashCursorActive"
    if (shouldRefreshBackgroundGalleries) {
      if (settingsGalleriesRendered) refreshBackgroundGalleries()
    }

    // Mutual exclusivity
    if (key === "gradientV2Active" && value === true) {
      updateSetting("background", null)
      updateSetting("svgWaveActive", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("liquidEtherActive", false)
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.svgWaveActive) DOM_EXPORTS.svgWaveActive.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      if (DOM_EXPORTS.lightPillarActive)
        DOM_EXPORTS.lightPillarActive.checked = false
      if (DOM_EXPORTS.liquidEtherActive)
        DOM_EXPORTS.liquidEtherActive.checked = false
      if (DOM_EXPORTS.splashCursorActive)
        DOM_EXPORTS.splashCursorActive.checked = false
    }
    if (key === "svgWaveActive" && value === true) {
      updateSetting("background", null)
      updateSetting("gradientV2Active", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("liquidEtherActive", false)
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.gradientV2Active)
        DOM_EXPORTS.gradientV2Active.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      if (DOM_EXPORTS.lightPillarActive)
        DOM_EXPORTS.lightPillarActive.checked = false
      if (DOM_EXPORTS.liquidEtherActive)
        DOM_EXPORTS.liquidEtherActive.checked = false
      if (DOM_EXPORTS.splashCursorActive)
        DOM_EXPORTS.splashCursorActive.checked = false
    }
    if (key === "silkActive" && value === true) {
      updateSetting("background", null)
      updateSetting("gradientV2Active", false)
      updateSetting("svgWaveActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("liquidEtherActive", false)
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.gradientV2Active)
        DOM_EXPORTS.gradientV2Active.checked = false
      if (DOM_EXPORTS.svgWaveActive) DOM_EXPORTS.svgWaveActive.checked = false
      if (DOM_EXPORTS.lightPillarActive)
        DOM_EXPORTS.lightPillarActive.checked = false
      if (DOM_EXPORTS.liquidEtherActive)
        DOM_EXPORTS.liquidEtherActive.checked = false
      if (DOM_EXPORTS.splashCursorActive)
        DOM_EXPORTS.splashCursorActive.checked = false
    }
    if (key === "lightPillarActive" && value === true) {
      updateSetting("background", null)
      updateSetting("gradientV2Active", false)
      updateSetting("svgWaveActive", false)
      updateSetting("silkActive", false)
      updateSetting("liquidEtherActive", false)
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.gradientV2Active)
        DOM_EXPORTS.gradientV2Active.checked = false
      if (DOM_EXPORTS.svgWaveActive) DOM_EXPORTS.svgWaveActive.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      if (DOM_EXPORTS.liquidEtherActive)
        DOM_EXPORTS.liquidEtherActive.checked = false
      if (DOM_EXPORTS.splashCursorActive)
        DOM_EXPORTS.splashCursorActive.checked = false
    }
    if (key === "liquidEtherActive" && value === true) {
      updateSetting("background", null)
      updateSetting("gradientV2Active", false)
      updateSetting("svgWaveActive", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.gradientV2Active)
        DOM_EXPORTS.gradientV2Active.checked = false
      if (DOM_EXPORTS.svgWaveActive) DOM_EXPORTS.svgWaveActive.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      if (DOM_EXPORTS.lightPillarActive)
        DOM_EXPORTS.lightPillarActive.checked = false
      if (DOM_EXPORTS.splashCursorActive)
        DOM_EXPORTS.splashCursorActive.checked = false
    }
    if (key === "splashCursorActive" && value === true) {
      updateSetting("splashCursorDarkBg", false)
      restoreRememberedBackground()
      updateSetting("splashCursorActive", true)
      updateSetting("gradientV2Active", false)
      updateSetting("svgWaveActive", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("liquidEtherActive", false)
      if (DOM_EXPORTS.gradientV2Active)
        DOM_EXPORTS.gradientV2Active.checked = false
      if (DOM_EXPORTS.svgWaveActive) DOM_EXPORTS.svgWaveActive.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      if (DOM_EXPORTS.lightPillarActive)
        DOM_EXPORTS.lightPillarActive.checked = false
      if (DOM_EXPORTS.liquidEtherActive)
        DOM_EXPORTS.liquidEtherActive.checked = false
      if (DOM_EXPORTS.splashCursorDarkBg)
        DOM_EXPORTS.splashCursorDarkBg.checked = false
      if (DOM_EXPORTS.splashCursorDarkBgBtn)
        DOM_EXPORTS.splashCursorDarkBgBtn.classList.remove("active")
    }
    if (
      (animatedBackgroundKeys.includes(key) && value === false) ||
      (key === "splashCursorDarkBg" && value === false)
    ) {
      const keepSplashCursorActive =
        key === "splashCursorDarkBg" &&
        getSettings().splashCursorActive === true
      restoreRememberedBackground()
      if (keepSplashCursorActive) {
        updateSetting("splashCursorActive", true)
        updateSetting("splashCursorDarkBg", false)
        if (DOM_EXPORTS.splashCursorDarkBg)
          DOM_EXPORTS.splashCursorDarkBg.checked = false
        if (DOM_EXPORTS.splashCursorDarkBgBtn)
          DOM_EXPORTS.splashCursorDarkBgBtn.classList.remove("active")
      }
      if (!skipSave) saveSettings(true)
    }
    if (key === "background" && value != null) {
      updateSetting("gradientV2Active", false)
      updateSetting("svgWaveActive", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("liquidEtherActive", false)
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.gradientV2Active)
        DOM_EXPORTS.gradientV2Active.checked = false
      if (DOM_EXPORTS.svgWaveActive) DOM_EXPORTS.svgWaveActive.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      if (DOM_EXPORTS.lightPillarActive)
        DOM_EXPORTS.lightPillarActive.checked = false
      if (DOM_EXPORTS.liquidEtherActive)
        DOM_EXPORTS.liquidEtherActive.checked = false
      if (DOM_EXPORTS.splashCursorActive)
        DOM_EXPORTS.splashCursorActive.checked = false
    }
    if (isGradient) {
      updateSetting("gradientV2Active", false)
      updateSetting("svgWaveActive", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("liquidEtherActive", false)
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.gradientV2Active)
        DOM_EXPORTS.gradientV2Active.checked = false
      if (DOM_EXPORTS.svgWaveActive) DOM_EXPORTS.svgWaveActive.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      if (DOM_EXPORTS.lightPillarActive)
        DOM_EXPORTS.lightPillarActive.checked = false
      if (DOM_EXPORTS.liquidEtherActive)
        DOM_EXPORTS.liquidEtherActive.checked = false
      if (DOM_EXPORTS.splashCursorActive)
        DOM_EXPORTS.splashCursorActive.checked = false
    }
    if (key === "effect" && value !== "none") {
      updateSetting("gradientV2Active", false)
      if (DOM_EXPORTS.gradientV2Active)
        DOM_EXPORTS.gradientV2Active.checked = false
      updateSetting("silkActive", false)
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      updateSetting("lightPillarActive", false)
      if (DOM_EXPORTS.lightPillarActive)
        DOM_EXPORTS.lightPillarActive.checked = false
      updateSetting("liquidEtherActive", false)
      if (DOM_EXPORTS.liquidEtherActive)
        DOM_EXPORTS.liquidEtherActive.checked = false
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.splashCursorActive)
        DOM_EXPORTS.splashCursorActive.checked = false
    }

    if (
      !skipSave &&
      (animatedBackgroundKeys.includes(key) ||
        key === "background" ||
        key === "effect" ||
        key === "splashCursorDarkBg" ||
        isGradient)
    ) {
      saveSettings(true)
    }

    applySettings()

    const shouldUpdateAutoAccent =
      getSettings().m3AutoAccentFromBg === true &&
      (isGradient || autoAccentBackgroundKeys.has(key))

    if (shouldUpdateAutoAccent) {
      scheduleAutoAccentUpdate()
    }
  }

  ctx.handleSettingUpdate = handleSettingUpdate

  // Expose for global access (e.g. from context menu)
  window.appHandleSettingUpdate = handleSettingUpdate
  window.appScheduleAutoAccentUpdate = scheduleAutoAccentUpdate

  // Bridge shared helpers expected by settingsApplier/updateSettingsInputs.
  effects.DOM = DOM_EXPORTS
  effects.localBackgrounds = localBackgrounds
  effects.handleSettingUpdate = handleSettingUpdate
  effects.renderFontGrid = () => {
    renderFontGrid(DOM_EXPORTS.fontGrid, handleSettingUpdate)
  }
  
  initFont(handleSettingUpdate)
  setupFontMultiSelect(DOM_EXPORTS, handleSettingUpdate)
  setupLocalFonts(handleSettingUpdate)

  effects.renderTabIconPreview = renderTabIconPreview
  effects.applyTabIcon = applyTabIcon
  effects.updateWaveColorPreviews = (settingsState) =>
    updateWaveColorPreviews(
      settingsState,
      DOM_EXPORTS.svgWaveStartPreview,
      DOM_EXPORTS.svgWaveEndPreview,
    )

  // Create core functions
  const applySettings = createApplySettings(effects)
  const updateSettingsInputs = createUpdateSettingsInputs(effects)
  effects.updateSettingsInputs = updateSettingsInputs
  applySettings()

  ctx.applySettings = applySettings
  ctx.updateSettingsInputs = updateSettingsInputs

  // Expose early so performance auto-tuning and local smoke tests have a stable hook
  // even if a later optional manager is unavailable in the current runtime.
  window.appApplySettings = () => {
    applySettings()
    if (settingsGalleriesRendered) refreshBackgroundGalleries()
  }

  // Initialize Gradient V2 Manager
  initGradientV2Manager(DOM_EXPORTS, () => effects.gradientV2Effect, (k, v) => {
    handleSettingUpdate(k, v)
  })

  // Initialize Special Effects Manager (Silk, Light Pillar, Liquid Ether)
  initSpecialEffectsManager(ctx, handleSettingUpdate)

  // Initialize Multi-Color Manager
  setupMultiColorManager(applySettings)

  // Handle special effect preset application
  window.addEventListener("specialEffectPresetApplied", (e) => {
    const { type } = e.detail
    if (type === "silk") handleSettingUpdate("silkActive", true)
    else if (type === "light-pillar")
      handleSettingUpdate("lightPillarActive", true)
    else if (type === "liquid-ether")
      handleSettingUpdate("liquidEtherActive", true)
  })

  // Settings galleries are expensive and only useful once the sidebar is opened.
  DOM_EXPORTS.settingsToggle?.addEventListener(
    "click",
    scheduleSettingsGalleriesRender,
  )
  document
    .querySelector('[data-section-id="background"] > .section-toggle')
    ?.addEventListener("click", () => {
      if (!settingsGalleriesRendered) {
        renderSettingsGalleries()
      } else {
        renderLocalBackgrounds(DOM_EXPORTS, handleSettingUpdate)
      }
    })
  if (DOM_EXPORTS.settingsSidebar?.classList.contains("open")) {
    scheduleSettingsGalleriesRender()
  }

  // Initialize multi-select modes and file uploads
  setupMultiSelectMode(DOM_EXPORTS, handleSettingUpdate)
  setupGradientMultiSelect(DOM_EXPORTS)
  setupSvgWaveMultiSelect(DOM_EXPORTS, () => effects.svgWaveEffect)
  setupFileUploads(DOM_EXPORTS, handleSettingUpdate)

  // Initialize Effect Color Handlers
  effects.getSettings = getSettings
  setupEffectColorHandlers(DOM_EXPORTS, effects)

  // Initialize Theme Manager
  initThemeManager(DOM_EXPORTS, handleSettingUpdate, updateSettingsInputs)

  // Initialize all general event handlers
  setupGeneralEventHandlers(
    ctx,
    handleSettingUpdate,
    applySettings,
    updateSettingsInputs,
  )

  const GROUP_EXPANDED_KEY_PREFIX = "settingsGroupExpanded:"
  document
    .querySelectorAll(".setting-group.collapsible-group")
    .forEach((group) => {
      const header = group.querySelector(".group-header")
      const groupId = group.id || group.dataset.groupId

      if (groupId) {
        const saved = localStorage.getItem(
          `${GROUP_EXPANDED_KEY_PREFIX}${groupId}`,
        )
        if (saved === "1") {
          group.classList.add("expanded")
        } else if (saved === "0") {
          group.classList.remove("expanded")
        }
      }

      if (header) {
        header.addEventListener("click", () => {
          const isExpanded = group.classList.toggle("expanded")
          if (groupId) {
            localStorage.setItem(
              `${GROUP_EXPANDED_KEY_PREFIX}${groupId}`,
              isExpanded ? "1" : "0",
            )
          }
        })
      }
    })

  // Pixel Snow HQ
  if (DOM_EXPORTS.pixelSnowHQColorPicker) {
    DOM_EXPORTS.pixelSnowHQColorPicker.addEventListener("change", (e) => {
      handleSettingUpdate("pixelSnowHQColor", e.target.value)
    })
  }

  const hqSnowProps = [
    {
      id: "pixelSnowHQFlakeSize",
      dom: DOM_EXPORTS.pixelSnowHQFlakeSizeSlider,
      val: DOM_EXPORTS.pixelSnowHQFlakeSizeVal,
      type: "float",
    },
    {
      id: "pixelSnowHQMinFlakeSize",
      dom: DOM_EXPORTS.pixelSnowHQMinFlakeSizeSlider,
      val: DOM_EXPORTS.pixelSnowHQMinFlakeSizeVal,
      type: "float",
    },
    {
      id: "pixelSnowHQDensity",
      dom: DOM_EXPORTS.pixelSnowHQDensitySlider,
      val: DOM_EXPORTS.pixelSnowHQDensityVal,
      type: "float",
    },
    {
      id: "pixelSnowHQSpeed",
      dom: DOM_EXPORTS.pixelSnowHQSpeedSlider,
      val: DOM_EXPORTS.pixelSnowHQSpeedVal,
      type: "float",
    },
    {
      id: "pixelSnowHQPixelResolution",
      dom: DOM_EXPORTS.pixelSnowHQPixelResSlider,
      val: DOM_EXPORTS.pixelSnowHQPixelResVal,
      type: "int",
    },
    {
      id: "pixelSnowHQDepthFade",
      dom: DOM_EXPORTS.pixelSnowHQDepthFadeSlider,
      val: DOM_EXPORTS.pixelSnowHQDepthFadeVal,
      type: "float",
    },
    {
      id: "pixelSnowHQFarPlane",
      dom: DOM_EXPORTS.pixelSnowHQFarPlaneSlider,
      val: DOM_EXPORTS.pixelSnowHQFarPlaneVal,
      type: "int",
    },
    {
      id: "pixelSnowHQBrightness",
      dom: DOM_EXPORTS.pixelSnowHQBrightnessSlider,
      val: DOM_EXPORTS.pixelSnowHQBrightnessVal,
      type: "float",
    },
    {
      id: "pixelSnowHQGamma",
      dom: DOM_EXPORTS.pixelSnowHQGammaSlider,
      val: DOM_EXPORTS.pixelSnowHQGammaVal,
      type: "float",
    },
    {
      id: "pixelSnowHQDirection",
      dom: DOM_EXPORTS.pixelSnowHQDirectionSlider,
      val: DOM_EXPORTS.pixelSnowHQDirectionVal,
      type: "int",
      suffix: "°",
    },
  ]

  hqSnowProps.forEach((prop) => {
    if (prop.dom) {
      prop.dom.addEventListener("input", (e) => {
        const val =
          prop.type === "float"
            ? parseFloat(e.target.value)
            : parseInt(e.target.value)
        if (prop.val)
          prop.val.textContent =
            prop.type === "float"
              ? val.toFixed(prop.id.includes("Size") ? 3 : 2)
              : val + (prop.suffix || "")
        updateSetting(prop.id, val)

        // Live update for performance (avoid full applySettings)
        const pixelSnowEffect = getActiveOrCreatedEffect(
          "pixelSnowHQEffect",
          getSettings().effect === "pixelSnowHQ",
        )
        if (pixelSnowEffect) {
          const optKey =
            prop.id.replace("pixelSnowHQ", "").charAt(0).toLowerCase() +
            prop.id.replace("pixelSnowHQ", "").slice(1)
          pixelSnowEffect.setOptions({ [optKey]: val })
        }
      })
      // Save only on mouse up/change to reduce disk/storage IO
      prop.dom.addEventListener("change", () => saveSettings())
    }
  })

  if (DOM_EXPORTS.pixelSnowHQVariantSelect) {
    DOM_EXPORTS.pixelSnowHQVariantSelect.addEventListener("change", (e) => {
      const val = e.target.value
      handleSettingUpdate("pixelSnowHQVariant", val)
      const pixelSnowEffect = getActiveOrCreatedEffect(
        "pixelSnowHQEffect",
        getSettings().effect === "pixelSnowHQ",
      )
      if (pixelSnowEffect) {
        pixelSnowEffect.setOptions({ variant: val })
      }
    })
  }

  // Soft Aurora
  if (DOM_EXPORTS.softAuroraColor1Picker) {
    DOM_EXPORTS.softAuroraColor1Picker.addEventListener("change", (e) => {
      handleSettingUpdate("softAuroraColor1", e.target.value)
      const softAuroraEffect = getActiveOrCreatedEffect(
        "softAuroraEffect",
        getSettings().effect === "softAurora",
      )
      if (softAuroraEffect)
        softAuroraEffect.setOptions({ color1: e.target.value })
    })
  }
  if (DOM_EXPORTS.softAuroraColor2Picker) {
    DOM_EXPORTS.softAuroraColor2Picker.addEventListener("change", (e) => {
      handleSettingUpdate("softAuroraColor2", e.target.value)
      const softAuroraEffect = getActiveOrCreatedEffect(
        "softAuroraEffect",
        getSettings().effect === "softAurora",
      )
      if (softAuroraEffect)
        softAuroraEffect.setOptions({ color2: e.target.value })
    })
  }
  if (DOM_EXPORTS.softAuroraRandomColorsBtn) {
    DOM_EXPORTS.softAuroraRandomColorsBtn.addEventListener("click", () => {
      const config = getRandomSoftAuroraConfig()
      if (DOM_EXPORTS.softAuroraColor1Picker)
        DOM_EXPORTS.softAuroraColor1Picker.value = config.color1
      if (DOM_EXPORTS.softAuroraColor2Picker)
        DOM_EXPORTS.softAuroraColor2Picker.value = config.color2

      const sliderUpdates = [
        [
          "softAuroraSpeed",
          "speed",
          DOM_EXPORTS.softAuroraSpeedSlider,
          DOM_EXPORTS.softAuroraSpeedVal,
          1,
        ],
        [
          "softAuroraScale",
          "scale",
          DOM_EXPORTS.softAuroraScaleSlider,
          DOM_EXPORTS.softAuroraScaleVal,
          1,
        ],
        [
          "softAuroraBrightness",
          "brightness",
          DOM_EXPORTS.softAuroraBrightnessSlider,
          DOM_EXPORTS.softAuroraBrightnessVal,
          1,
        ],
        [
          "softAuroraNoiseFreq",
          "noiseFrequency",
          DOM_EXPORTS.softAuroraNoiseFreqSlider,
          DOM_EXPORTS.softAuroraNoiseFreqVal,
          1,
        ],
        [
          "softAuroraNoiseAmp",
          "noiseAmplitude",
          DOM_EXPORTS.softAuroraNoiseAmpSlider,
          DOM_EXPORTS.softAuroraNoiseAmpVal,
          1,
        ],
        [
          "softAuroraBandHeight",
          "bandHeight",
          DOM_EXPORTS.softAuroraBandHeightSlider,
          DOM_EXPORTS.softAuroraBandHeightVal,
          2,
        ],
        [
          "softAuroraBandSpread",
          "bandSpread",
          DOM_EXPORTS.softAuroraBandSpreadSlider,
          DOM_EXPORTS.softAuroraBandSpreadVal,
          1,
        ],
        [
          "softAuroraOctaveDecay",
          "octaveDecay",
          DOM_EXPORTS.softAuroraOctaveDecaySlider,
          DOM_EXPORTS.softAuroraOctaveDecayVal,
          2,
        ],
        [
          "softAuroraLayerOffset",
          "layerOffset",
          DOM_EXPORTS.softAuroraLayerOffsetSlider,
          DOM_EXPORTS.softAuroraLayerOffsetVal,
          1,
        ],
        [
          "softAuroraColorSpeed",
          "colorSpeed",
          DOM_EXPORTS.softAuroraColorSpeedSlider,
          DOM_EXPORTS.softAuroraColorSpeedVal,
          1,
        ],
        [
          "softAuroraMouseInfluence",
          "mouseInfluence",
          DOM_EXPORTS.softAuroraMouseInfluenceSlider,
          DOM_EXPORTS.softAuroraMouseInfluenceVal,
          2,
        ],
      ]

      updateSetting("softAuroraColor1", config.color1)
      updateSetting("softAuroraColor2", config.color2)
      sliderUpdates.forEach(
        ([settingKey, optionKey, input, valueLabel, digits]) => {
          const value = config[optionKey]
          if (input) input.value = value
          if (valueLabel) valueLabel.textContent = value.toFixed(digits)
          updateSetting(settingKey, value)
        },
      )
      updateSetting("softAuroraEnableMouse", config.enableMouseInteraction)

      if (DOM_EXPORTS.softAuroraMouseCheckbox)
        DOM_EXPORTS.softAuroraMouseCheckbox.checked =
          config.enableMouseInteraction

      saveSettings()

      const softAuroraEffect = getActiveOrCreatedEffect(
        "softAuroraEffect",
        getSettings().effect === "softAurora",
      )
      if (softAuroraEffect)
        softAuroraEffect.setOptions({
          color1: config.color1,
          color2: config.color2,
          speed: config.speed,
          scale: config.scale,
          brightness: config.brightness,
          noiseFrequency: config.noiseFrequency,
          noiseAmplitude: config.noiseAmplitude,
          bandHeight: config.bandHeight,
          bandSpread: config.bandSpread,
          octaveDecay: config.octaveDecay,
          layerOffset: config.layerOffset,
          colorSpeed: config.colorSpeed,
          enableMouseInteraction: config.enableMouseInteraction,
          mouseInfluence: config.mouseInfluence,
        })
    })
  }

  const softAuroraProps = [
    {
      id: "softAuroraSpeed",
      dom: DOM_EXPORTS.softAuroraSpeedSlider,
      val: DOM_EXPORTS.softAuroraSpeedVal,
      type: "float",
    },
    {
      id: "softAuroraScale",
      dom: DOM_EXPORTS.softAuroraScaleSlider,
      val: DOM_EXPORTS.softAuroraScaleVal,
      type: "float",
    },
    {
      id: "softAuroraBrightness",
      dom: DOM_EXPORTS.softAuroraBrightnessSlider,
      val: DOM_EXPORTS.softAuroraBrightnessVal,
      type: "float",
    },
    {
      id: "softAuroraNoiseFreq",
      dom: DOM_EXPORTS.softAuroraNoiseFreqSlider,
      val: DOM_EXPORTS.softAuroraNoiseFreqVal,
      type: "float",
    },
    {
      id: "softAuroraBandHeight",
      dom: DOM_EXPORTS.softAuroraBandHeightSlider,
      val: DOM_EXPORTS.softAuroraBandHeightVal,
      type: "float",
    },
    {
      id: "softAuroraBandSpread",
      dom: DOM_EXPORTS.softAuroraBandSpreadSlider,
      val: DOM_EXPORTS.softAuroraBandSpreadVal,
      type: "float",
    },
  ]

  softAuroraProps.forEach((prop) => {
    if (prop.dom) {
      prop.dom.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value)
        if (prop.val)
          prop.val.textContent = val.toFixed(
            prop.id.includes("Height") || prop.id.includes("Decay") ? 2 : 1,
          )
        updateSetting(prop.id, val)

        const softAuroraEffect = getActiveOrCreatedEffect(
          "softAuroraEffect",
          getSettings().effect === "softAurora",
        )
        if (softAuroraEffect) {
          const optKey =
            prop.id.replace("softAurora", "").charAt(0).toLowerCase() +
            prop.id.replace("softAurora", "").slice(1)
          let mappedKey = optKey
          if (optKey === "noiseFreq") mappedKey = "noiseFrequency"
          if (optKey === "noiseAmp") mappedKey = "noiseAmplitude"
          softAuroraEffect.setOptions({ [mappedKey]: val })
        }
      })
      prop.dom.addEventListener("change", () => saveSettings())
    }
  })

  // Add the remaining new props (Octave, Layer, ColorSpeed, MouseInfluence)
  const softAuroraExtraProps = [
    {
      id: "softAuroraNoiseAmp",
      dom: DOM_EXPORTS.softAuroraNoiseAmpSlider,
      val: DOM_EXPORTS.softAuroraNoiseAmpVal,
      type: "float",
    },
    {
      id: "softAuroraOctaveDecay",
      dom: DOM_EXPORTS.softAuroraOctaveDecaySlider,
      val: DOM_EXPORTS.softAuroraOctaveDecayVal,
      type: "float",
    },
    {
      id: "softAuroraLayerOffset",
      dom: DOM_EXPORTS.softAuroraLayerOffsetSlider,
      val: DOM_EXPORTS.softAuroraLayerOffsetVal,
      type: "float",
    },
    {
      id: "softAuroraColorSpeed",
      dom: DOM_EXPORTS.softAuroraColorSpeedSlider,
      val: DOM_EXPORTS.softAuroraColorSpeedVal,
      type: "float",
    },
    {
      id: "softAuroraMouseInfluence",
      dom: DOM_EXPORTS.softAuroraMouseInfluenceSlider,
      val: DOM_EXPORTS.softAuroraMouseInfluenceVal,
      type: "float",
    },
  ]

  softAuroraExtraProps.forEach((prop) => {
    if (prop.dom) {
      prop.dom.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value)
        if (prop.val)
          prop.val.textContent = val.toFixed(prop.id.includes("Decay") ? 2 : 1)
        updateSetting(prop.id, val)

        const softAuroraEffect = getActiveOrCreatedEffect(
          "softAuroraEffect",
          getSettings().effect === "softAurora",
        )
        if (softAuroraEffect) {
          const optKey =
            prop.id.replace("softAurora", "").charAt(0).toLowerCase() +
            prop.id.replace("softAurora", "").slice(1)
          let mappedKey = optKey
          if (optKey === "noiseAmp") mappedKey = "noiseAmplitude"
          softAuroraEffect.setOptions({ [mappedKey]: val })
        }
      })
      prop.dom.addEventListener("change", () => saveSettings())
    }
  })

  if (DOM_EXPORTS.softAuroraMouseCheckbox) {
    DOM_EXPORTS.softAuroraMouseCheckbox.addEventListener("change", (e) => {
      handleSettingUpdate("softAuroraEnableMouse", e.target.checked)
      const softAuroraEffect = getActiveOrCreatedEffect(
        "softAuroraEffect",
        getSettings().effect === "softAurora",
      )
      if (softAuroraEffect)
        softAuroraEffect.setOptions({
          enableMouseInteraction: e.target.checked,
        })
    })
  }

  if (DOM_EXPORTS.softAuroraTransparentCheckbox) {
    DOM_EXPORTS.softAuroraTransparentCheckbox.addEventListener(
      "change",
      (e) => {
        const isTransparent = e.target.checked
        handleSettingUpdate("softAuroraTransparent", isTransparent)
        if (DOM_EXPORTS.softAuroraBgColorContainer) {
          DOM_EXPORTS.softAuroraBgColorContainer.style.display = isTransparent
            ? "none"
            : "block"
        }
        const softAuroraEffect = getActiveOrCreatedEffect(
          "softAuroraEffect",
          getSettings().effect === "softAurora",
        )
        if (softAuroraEffect)
          softAuroraEffect.setOptions({ transparent: isTransparent })
      },
    )
  }

  if (DOM_EXPORTS.softAuroraBgColorPicker) {
    DOM_EXPORTS.softAuroraBgColorPicker.addEventListener("change", (e) => {
      handleSettingUpdate("softAuroraBackgroundColor", e.target.value)
      const softAuroraEffect = getActiveOrCreatedEffect(
        "softAuroraEffect",
        getSettings().effect === "softAurora",
      )
      if (softAuroraEffect)
        softAuroraEffect.setOptions({ backgroundColor: e.target.value })
    })
  }

  // Effect resolution sync fix
  if (settings.effect === "pixelSnowHQ") {
    handleSettingUpdate(
      "pixelSnowHQPixelResolution",
      settings.pixelSnowHQPixelResolution || 200,
      false,
      true,
    )
  }

  // Animated Backgrounds Collapsible Group
  const animatedBgHeader = document.getElementById(
    "animated-backgrounds-header",
  )
  if (animatedBgHeader) {
    animatedBgHeader.addEventListener("click", () => {
      scheduleSettingsGalleriesRender()
      const section = animatedBgHeader.parentElement
      setTimeout(() => {
        const isExpanded = !section.classList.contains("collapsed")
        if (isExpanded && settingsGalleriesRendered) {
          renderUserGradientV2s(DOM_EXPORTS)
          renderUserSilks()
          renderUserLightPillars()
          renderUserLiquidEthers()
        }
      }, 50)
    })

    // Auto-expand if any effect within this group is active
    const isAnyActive =
      settings.silkActive ||
      settings.lightPillarActive ||
      settings.liquidEtherActive ||
      settings.splashCursorActive ||
      settings.gradientV2Active
    if (isAnyActive) {
      const section = animatedBgHeader.parentElement
      section.classList.remove("collapsed")
    }
  }

  applySettings()
}
