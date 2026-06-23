import { initI18n, geti18n } from "./services/i18n.js"
import { fadeToggle, refreshDOMReferences } from "./utils/dom.js"
import { showConfirm, showAlert, showChecklistConfirm } from "./utils/dialog.js"
import { initClock } from "./components/clock.js"
import { initBookmarks, renderBookmarks } from "./components/bookmarks.js"
import { initModal } from "./components/modal.js"
import {
  initContextMenu,
  showContextMenu,
  hideContextMenu,
} from "./components/contextMenu.js"
import { initSearch } from "./components/search.js"
import {
  preloadImages,
  migrateDataUrls,
  isIdbMedia,
  getImageUrl,
  trimMediaMemory,
} from "./services/imageStore.js"
import {
  prepareFirstRunDefaults,
  promptFirstRunBookmarkImport,
} from "./services/firstRun.js"

import { makeDraggable } from "./utils/draggable.js"
import {
  buildMaterial3Scheme,
  getContrastYIQ,
  hexToRgb,
} from "./utils/colors.js"
import {
  resetComponentPositions,
  resetSettingsModules,
  updateSetting,
  getSettings,
  saveSettings,
} from "./services/state.js"
import {
  showTodoCheckbox,
  showTimerCheckbox,
  showFullCalendarCheckbox,
  showMusicCheckbox,
  clockDisplaySelect,
  showGregorianCheckbox,
  showNotepadCheckbox,
  showQuotesCheckbox,
  showWeatherCheckbox,
} from "./utils/dom.js"

let bookmarksLoaded = false
window.addEventListener("bookmarksReady", () => {
  bookmarksLoaded = true
}, { once: true })

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

function setUpdateNoticePending(isPending) {
  window.startpageUpdateNoticePending = isPending
  if (!isPending) {
    window.dispatchEvent(new CustomEvent("startpage:updateNoticeSettled"))
  }
}

function isFirstRunOnboardingPending() {
  return (
    window.startpageFirstRunActive === true ||
    (localStorage.getItem("startpageFirstRunSvgBgV1") === "applied" &&
      localStorage.getItem("startpageFirstRunOnboardingDoneV1") !== "1")
  )
}

let settingsInitPromise = null
let settingsInitialized = false
let googleAppsInitPromise = null
let googleAppsInitialized = false
let commandPaletteInitPromise = null
let commandPaletteInitialized = false
let commandPaletteController = null
let commandPaletteOpenOnReady = false

function ensureGoogleAppsInitialized(reason = "click") {
  if (googleAppsInitialized) return Promise.resolve()
  if (!googleAppsInitPromise) {
    googleAppsInitPromise = import("./components/googleApps.js")
      .then(({ initGoogleApps }) => {
        initGoogleApps()
        googleAppsInitialized = true
        window.dispatchEvent(
          new CustomEvent("startpage:googleAppsReady", {
            detail: { reason },
          }),
        )
      })
      .catch((error) => {
        googleAppsInitPromise = null
        console.error("Could not initialize Google Apps:", error)
      })
  }
  return googleAppsInitPromise
}

function ensureCommandPaletteInitialized(reason = "idle", options = {}) {
  if (options.openOnInit) commandPaletteOpenOnReady = true
  if (commandPaletteInitialized) {
    if (options.openOnInit) commandPaletteController?.show?.()
    return Promise.resolve()
  }
  if (!commandPaletteInitPromise) {
    commandPaletteInitPromise = import("./components/commandPalette.js")
      .then(({ initCommandPalette }) => {
        commandPaletteController = initCommandPalette({
          openOnInit: commandPaletteOpenOnReady,
        })
        commandPaletteOpenOnReady = false
        commandPaletteInitialized = true
        window.dispatchEvent(
          new CustomEvent("startpage:commandPaletteReady", {
            detail: { reason },
          }),
        )
      })
      .catch((error) => {
        commandPaletteInitPromise = null
        console.error("Could not initialize command palette:", error)
      })
  }
  return commandPaletteInitPromise
}

function needsSettingsAtBoot(settings) {
  const bg = settings.background
  const isVideo =
    typeof bg === "string" &&
    (bg.startsWith("data:video") ||
      bg.startsWith("idb-video-") ||
      bg.startsWith("idb-gif-") ||
      /\.(mp4|webm|mov|ogg)(?:[?#].*)?$/i.test(bg) ||
      bg.includes("googlevideo"))

  const isCustomBg =
    isIdbMedia(bg) ||
    (typeof bg === "string" &&
      (bg.startsWith("data:") ||
        bg.startsWith("blob:") ||
        bg.startsWith("http")))

  return Boolean(
    (settings.effect && settings.effect !== "none") ||
      settings.gradientV2Active ||
      settings.svgWaveActive ||
      settings.silkActive ||
      settings.lightPillarActive ||
      settings.liquidEtherActive ||
      settings.splashCursorActive ||
      settings.m3AutoAccentFromBg ||
      isVideo ||
      isCustomBg
  )
}

function ensureSettingsInitialized(reason = "idle") {
  if (settingsInitialized) return Promise.resolve()
  if (!settingsInitPromise) {
    settingsInitPromise = Promise.resolve(
      window.startpageSettingsPartialsReady,
    )
      .then(() => {
        refreshDOMReferences()
        return import("./components/settings.js")
      })
      .then(async ({ initSettings }) => {
        await initSettings()
        settingsInitialized = true
        window.settingsInitialized = true
        window.dispatchEvent(
          new CustomEvent("startpage:settingsReady", {
            detail: { reason },
          }),
        )
      })
      .catch((error) => {
        settingsInitPromise = null
        console.error("Could not initialize settings:", error)
      })
  }
  return settingsInitPromise
}
window.ensureSettingsInitialized = ensureSettingsInitialized;

function loadFontOnBoot(fontValue) {
  if (!fontValue) return
  const fontName = fontValue.replace(/['"]/g, "").split(",")[0].trim()
  const systemFonts = ["sans-serif", "serif", "monospace", "cursive", "fantasy", "system-ui", "arial", "helvetica", "segoe ui", "times new roman", "courier new", "georgia", "verdana", "trebuchet ms", "impact"]
  if (systemFonts.includes(fontName.toLowerCase())) return
  
  const settings = getSettings()
  const savedFonts = settings.userSavedFonts || []
  const savedFontObj = savedFonts.find(
    (f) => (typeof f === "string" ? f : f.label) === fontName,
  )
  if (savedFontObj && typeof savedFontObj === "object" && savedFontObj.isLocal) {
    return
  }

  const formattedFontName = fontName.replace(/\s+/g, "+")
  const googleFontUrl = `https://fonts.googleapis.com/css2?family=${formattedFontName}:wght@300;400;500;600;700&display=swap`
  
  const existingLink = document.querySelector(`link[href^="https://fonts.googleapis.com/css2?family=${formattedFontName}"]`)
  if (!existingLink) {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = googleFontUrl
    document.head.appendChild(link)
  }
}

function applyAccentTokens(settings) {
  const color = settings.accentColor || "#00ff73"
  if ((settings.accentColorMode || "m3") === "default") {
    return applyDefaultAccentTokens(color)
  }
  return applyMaterialAccentTokens(color, settings.m3PaletteStyle || "tonalSpot")
}

function applyDefaultAccentTokens(seedColor) {
  const root = document.documentElement
  const color = seedColor || "#00ff73"
  const rgb = hexToRgb(color)

  root.style.setProperty("--accent-color", color)
  root.style.setProperty("--accent-color-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`)
  root.style.setProperty("--accent-contrast-color", getContrastYIQ(color))
  root.style.setProperty("--safe-accent", color)

  return {
    accent: color,
    onAccent: getContrastYIQ(color),
    onPrimary: getContrastYIQ(color),
  }
}

function applyMaterialAccentTokens(seedColor, paletteStyle = "tonalSpot") {
  const root = document.documentElement
  const scheme = buildMaterial3Scheme(seedColor, paletteStyle)
  const tokenMap = {
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

  Object.entries(tokenMap).forEach(([token, value]) => {
    root.style.setProperty(token, value)
  })

  root.style.setProperty("--accent-color", scheme.primary)
  root.style.setProperty("--accent-color-rgb", scheme.primaryRgb)
  root.style.setProperty("--accent-contrast-color", scheme.onPrimary)
  root.style.setProperty("--safe-accent", scheme.inversePrimary)

  return scheme
}

function buildSvgWavePreviewGradient(settings) {
  const start = `hsl(${settings.svgWaveStartHue ?? 200}, ${settings.svgWaveStartSaturation ?? 70}%, ${settings.svgWaveStartLightness ?? 40}%)`
  const end = `hsl(${settings.svgWaveEndHue ?? 280}, ${settings.svgWaveEndSaturation ?? 70}%, ${settings.svgWaveEndLightness ?? 30}%)`
  const angle = Number(settings.svgWaveAngle ?? 0)
  return `linear-gradient(${angle}deg, ${start}, ${end})`
}

function applyBootVisualPreview(settings) {
  if (!settings) return

  if (settings.accentColor) {
    applyAccentTokens(settings)
  }

  if (settings.svgWaveActive !== true) return

  const bgLayer = document.getElementById("bg-layer")
  if (!bgLayer) return

  document.body.classList.add("preload-bg-ready", "bg-layer-active")
  bgLayer.style.background = buildSvgWavePreviewGradient(settings)
  bgLayer.style.backgroundSize = "cover"
  bgLayer.style.backgroundRepeat = "no-repeat"
  bgLayer.style.backgroundPosition = "var(--bg-pos-x, 50%) var(--bg-pos-y, 50%)"
  bgLayer.style.opacity = "1"
}

function applyBasicStyles(settings) {
  const root = document.documentElement
  
  root.style.setProperty(
    "--bg-pos-x",
    `${settings.bgPositionX !== undefined ? settings.bgPositionX : 50}%`,
  )
  root.style.setProperty(
    "--bg-pos-y",
    `${settings.bgPositionY !== undefined ? settings.bgPositionY : 50}%`,
  )
  
  const filters = [
    `blur(${settings.bgBlur ?? 0}px)`,
    `brightness(${settings.bgBrightness ?? 100}%)`,
    `contrast(${settings.bgContrast ?? 100}%)`,
    `saturate(${settings.bgSaturation ?? 100}%)`,
  ].join(" ")

  root.style.setProperty("--bg-filter", filters)

  if (settings.dateClockStyle) {
    document.body.setAttribute("data-clock-style", settings.dateClockStyle)
  }
  root.style.setProperty("--bg-blur", `${settings.bgBlur ?? 0}px`)
  root.style.setProperty("--bg-brightness", `${settings.bgBrightness ?? 100}%`)
  root.style.setProperty("--bg-contrast", `${settings.bgContrast ?? 100}%`)
  root.style.setProperty("--bg-saturation", `${settings.bgSaturation ?? 100}%`)
  
  root.style.setProperty("--clock-font-size", `${settings.clockFontSize ?? 11}rem`)
  root.style.setProperty("--date-font-size", `${settings.dateFontSize ?? 2}rem`)

  if (settings.panelBg) root.style.setProperty("--panel-bg", settings.panelBg)
  if (settings.glassBg) root.style.setProperty("--glass-bg", settings.glassBg)
  if (settings.glassBorder) root.style.setProperty("--glass-border", settings.glassBorder)
  if (settings.glassEdge) root.style.setProperty("--glass-edge", settings.glassEdge)
  
  if (settings.accentColor) {
    const accentScheme = applyAccentTokens(settings)
    const forceLightSidebar = settings.showQuickAccessBg === true
    if (forceLightSidebar) {
      root.style.setProperty("--sidebar-bg", "rgba(240, 240, 245, 0.98)")
      document.body.classList.add("sidebar-light")
    } else {
      if (settings.sidebarBg) {
        root.style.setProperty("--sidebar-bg", settings.sidebarBg)
      }
      document.body.classList.remove("sidebar-light")
    }
  }
  
  const primaryFont = settings.font || "'Outfit', sans-serif"
  const clockFont = settings.clockFont || settings.font || "'Outfit', sans-serif"
  root.style.setProperty("--font-primary", primaryFont)
  
  const dateClockStyle = settings.dateClockStyle || "default"
  const clockFontTarget = settings.clockFontTarget || "both"
  const clockUsesDisplayFont = clockFontTarget === "both" || clockFontTarget === "clock"
  const dateUsesDisplayFont = clockFontTarget === "both" || clockFontTarget === "date" || clockFontTarget === "weekday"
  
  const applyFontToTargets = (targets, font) => {
    targets.forEach((t) => {
      root.style.setProperty(`--font-${t}`, font)
    })
  }
  
  applyFontToTargets(["clock", "date", "weekday", "gregorian-date", "lunar-date"], primaryFont)
  
  if (clockFontTarget === "both") {
    applyFontToTargets(
      [
        "clock", "date", "weekday", "gregorian-date", "lunar-date",
        "clock-date", "jp-time", "jp-date"
      ],
      clockFont,
    )
  } else if (clockFontTarget === "clock") {
    applyFontToTargets(["clock", "clock-date", "jp-time"], clockFont)
  } else if (clockFontTarget === "date") {
    applyFontToTargets(["date", "jp-date"], clockFont)
  }
  
  const baseClockSize = Number(settings.clockSize) || 6
  const rawDateSize = Number(settings.dateSize)
  const baseDateSize = Number.isFinite(rawDateSize)
    ? Math.min(10, Math.max(0.8, rawDateSize))
    : 1.5
  const priority = settings.clockDatePriority === "date" ? "date" : "none"
  const displayMode = settings.clockDisplayMode || "all"
  let computedClockSize = baseClockSize
  let computedDateSize = baseDateSize
  
  const getFontName = (f) => String(f || "")
  const getClockFontProfile = (font) => {
    const name = getFontName(font).toLowerCase()
    if (name === "e1234") {
      return { clockScale: 0.68, dateScale: 0.86, letterSpacing: "0px", maxWidthFactor: 5.8 }
    }
    if (name === "electroharmonix" || name === "anurati") {
      return { clockScale: 0.78, dateScale: 0.9, letterSpacing: "0.02em", maxWidthFactor: 6.1 }
    }
    if (name === "saiba-45") {
      return { clockScale: 0.86, dateScale: 0.94, letterSpacing: "0.01em", maxWidthFactor: 6.4 }
    }
    return { clockScale: 1, dateScale: 1, letterSpacing: "2px", maxWidthFactor: 7 }
  }
  const getStyleClockScale = (style) => {
    const styleScales = {
      "cyber-pulse": 0.94, "neon-grid": 0.9, "holo-ring": 0.9,
      "lunar-orbit": 0.9, fliqlo: 0.92, sidebar: 0.94
    }
    return styleScales[style] || 1
  }
  
  const fontProfile = getClockFontProfile(clockFont)
  if (priority === "date" || displayMode === "weekday") {
    computedClockSize = baseDateSize
    computedDateSize = baseClockSize
  }
  
  if (clockUsesDisplayFont) {
    computedClockSize *= fontProfile.clockScale * getStyleClockScale(dateClockStyle)
  }
  if (dateUsesDisplayFont) {
    computedDateSize *= fontProfile.dateScale
  }
  
  computedClockSize = Math.min(10, Math.max(0.8, computedClockSize))
  computedDateSize = Math.min(10, Math.max(0.8, computedDateSize))
  
  root.style.setProperty("--clock-size", `${computedClockSize}rem`)
  root.style.setProperty("--date-size", `${computedDateSize}rem`)
  root.style.setProperty("--clock-letter-spacing", clockUsesDisplayFont ? fontProfile.letterSpacing : "2px")
  root.style.setProperty("--clock-max-width-factor", String(fontProfile.maxWidthFactor))
  
  root.style.setProperty("--bookmark-font-size", `${settings.bookmarkFontSize ?? 10}px`)
  root.style.setProperty("--bookmark-group-font-size", `${settings.bookmarkGroupFontSize ?? 10}px`)
}

let bookmarksInitialized = false;
function ensureBookmarksInitialized() {
  if (bookmarksInitialized) return;
  initBookmarks();
  bookmarksInitialized = true;
}

let searchInitialized = false;
function ensureSearchInitialized() {
  if (searchInitialized) return;
  initSearch();
  searchInitialized = true;
}

// --- Initialization ---
async function bootstrap() {
  setUpdateNoticePending(true)
  const skipStartupLoader = document.body.classList.contains(
    "skip-startup-loader",
  )
  const bootStartedAt = performance.now()
  if (!skipStartupLoader) {
    document.body.classList.add("is-booting")
  }

  prepareFirstRunDefaults()
  applyBootVisualPreview(getSettings())
  const minimumStartupLoaderMs = isFirstRunOnboardingPending() ? 1600 : 650

  // Load language first so all other components have translations
  await initI18n()

  // Update version in startup overlay and settings sidebar immediately
  try {
    const manifest = window.chrome?.runtime?.getManifest?.()
    if (manifest && manifest.version) {
      const startupVersion = document.getElementById("startup-version")
      if (startupVersion) startupVersion.textContent = `v${manifest.version}`

      const settingsVersion = document.getElementById("settings-version")
      if (settingsVersion) settingsVersion.textContent = `v${manifest.version}`
    }
  } catch (e) {
    console.warn("Could not get manifest version")
  }

  const currentSettings = getSettings()
  syncUninstallSurveyLanguage(currentSettings.language)
  const fastRevealSkipStartup = () => {
    if (!skipStartupLoader) return
    document.querySelector(".main-container")?.classList.add("ready")
    const overlay = document.getElementById("startup-overlay")
    if (overlay) {
      overlay.style.opacity = "0"
      overlay.style.visibility = "hidden"
    }
    try {
      localStorage.setItem("startpageHasOpened", "1")
      localStorage.removeItem("startpageShowStartupLoader")
    } catch {}
    document.body.classList.remove("loading-state")
    requestAnimationFrame(() => {
      document.body.classList.remove("is-booting")
    })
  }
  fastRevealSkipStartup()


  const settingsToggle = document.getElementById("settings-toggle")
  const settingsSidebar = document.getElementById("settings-sidebar")
  const googleAppsBtn = document.querySelector(".google-apps-btn")
  const googleAppsDropdown = document.getElementById("g-apps-dropdown")
  const sidebarHotkeysBtn = document.getElementById("sidebar-hotkeys-btn")
  settingsToggle?.addEventListener(
    "click",
    async (event) => {
      if (settingsInitialized) return
      event.preventDefault()
      event.stopImmediatePropagation()
      settingsToggle.classList.add("is-loading")
      await ensureSettingsInitialized("open-settings")
      settingsToggle.classList.remove("is-loading")
      settingsSidebar?.classList.add("open")
    },
    { capture: true },
  )
  googleAppsBtn?.addEventListener(
    "click",
    async (event) => {
      if (googleAppsInitialized) return
      event.preventDefault()
      event.stopImmediatePropagation()
      await ensureGoogleAppsInitialized("open-google-apps")
      googleAppsDropdown?.classList.add("show")
    },
    { capture: true },
  )
  window.addEventListener(
    "keydown",
    (event) => {
      if (commandPaletteInitialized) return
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key.toLowerCase() === "k" || event.code === "KeyK")
      ) {
        event.preventDefault()
        event.stopImmediatePropagation()
        void ensureCommandPaletteInitialized("hotkey", { openOnInit: true })
      }
    },
    { capture: true },
  )
  sidebarHotkeysBtn?.addEventListener(
    "click",
    (event) => {
      if (commandPaletteInitialized) return
      event.preventDefault()
      event.stopImmediatePropagation()
      void ensureCommandPaletteInitialized("sidebar-button", {
        openOnInit: true,
      })
    },
    { capture: true },
  )
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") return
    const latestSettings = getSettings()
    trimMediaMemory({
      keepIds: [latestSettings.background],
      includeThumbnails: false,
      maxUrls: 1,
    })
  })
  const activeBackgroundLoad = isIdbMedia(currentSettings.background)
    ? getImageUrl(currentSettings.background).catch(() => null)
    : Promise.resolve(null)

  // 1. Setup UI fast to prevent layout shifts

  // FAST BOOT LAYOUT CLASSES
  let layout = currentSettings.bookmarkLayout || "default"
  if (currentSettings.bookmarkSidebarMode === true && layout === "default") {
    layout = "sidebar"
  }
  if (layout === "sidebar-left") layout = "sidebar"

  if (layout === "sidebar") document.body.classList.add("bookmark-sidebar-mode")
  else if (layout === "taskbar")
    document.body.classList.add("bookmark-taskbar-mode")
  else if (layout === "taskbar-top")
    document.body.classList.add("bookmark-taskbar-top-mode")
  else if (layout === "taskbar-left")
    document.body.classList.add("bookmark-taskbar-left-mode")

  if (currentSettings.flipLayout) document.body.classList.add("flip-layout")
  if (currentSettings.hideBookmarkText)
    document.body.classList.add("hide-bookmark-text")
  if (currentSettings.hideBookmarkBg)
    document.body.classList.add("hide-bookmark-bg")
  if (currentSettings.freeMoveSearchBar === true)
    document.body.classList.add("free-move-search-bar")
  if (currentSettings.bookmarkGroupUseAccent === true)
    document.body.classList.add("bookmark-group-accent-enabled")
  if (currentSettings.bookmarkGroupKeepBgOnInteraction !== false)
    document.body.classList.add("bookmark-group-keep-bg-on-interaction")
  if (currentSettings.bookmarkGroupShowCount === false)
    document.body.classList.add("bookmark-group-count-hidden")
  if (currentSettings.bookmarkGroupAutoTextContrast === true)
    document.body.classList.add("bookmark-group-auto-text-contrast")
  if ((currentSettings.bookmarkGroupBgOpacity ?? 0) <= 0)
    document.body.classList.add("bookmark-group-tab-bg-transparent")
  if (currentSettings.bookmarkGroupContainerBgHidden === true)
    document.body.classList.add("bookmark-group-container-bg-hidden")
  if (currentSettings.bookmarkGroupBorderHidden === true)
    document.body.classList.add("bookmark-group-border-hidden")

  let bgStyle = currentSettings.bookmarkLayoutBgStyle || "default"
  if (bgStyle === "hidden")
    document.body.classList.add("bookmark-layout-bg-hidden")
  else if (bgStyle === "white") {
    document.body.classList.add("bookmark-layout-bg-white")
    document.documentElement.style.setProperty(
      "--bookmark-layout-bg-color",
      "rgba(255, 255, 255, 0.85)",
    )
    document.documentElement.style.setProperty(
      "--bookmark-layout-text-color",
      "#1e293b",
    )
  }
  else if (bgStyle === "m3-accent")
    document.body.classList.add("bookmark-layout-bg-m3-accent")
  else if (bgStyle === "colored") {
    document.body.classList.add("bookmark-layout-bg-colored")
    const bgColor = currentSettings.bookmarkLayoutBgColor || "rgba(0,0,0,0.5)"
    document.documentElement.style.setProperty(
      "--bookmark-layout-bg-color",
      bgColor,
    )
    const textCol = getContrastYIQ(bgColor) === "black" ? "#1e293b" : "#ffffff"
    document.documentElement.style.setProperty(
      "--bookmark-layout-text-color",
      textCol,
    )
  }
  if (currentSettings.bookmarkItemStyle === "card")
    document.body.classList.add("bookmark-item-card-style")

  const dateClockStyle = currentSettings.dateClockStyle || "default"
  document.body.classList.add(`date-clock-style-${dateClockStyle}`)
  const clockStyleBackground = currentSettings.clockStyleTransparentBackground
    ? "transparent"
    : currentSettings.clockStyleBackground || "default"
  if (clockStyleBackground === "transparent") {
    document.body.classList.add("clock-style-transparent-bg")
  } else if (clockStyleBackground === "accent") {
    document.body.classList.add("clock-style-bg-accent")
  } else if (clockStyleBackground === "custom") {
    document.body.classList.add("clock-style-bg-custom")
    document.documentElement.style.setProperty(
      "--clock-style-custom-bg-color",
      /^#[0-9a-f]{6}$/i.test(currentSettings.clockStyleCustomBgColor || "")
        ? currentSettings.clockStyleCustomBgColor
        : "#1f2937",
    )
  } else if (clockStyleBackground === "light") {
    document.body.classList.add("clock-style-bg-light")
  } else if (clockStyleBackground === "dark") {
    document.body.classList.add("clock-style-bg-dark")
  } else if (
    clockStyleBackground === "animated" &&
    dateClockStyle === "prism-stack"
  ) {
    document.body.classList.add("clock-style-bg-animated")
  }
  if (
    dateClockStyle === "cartoon" &&
    currentSettings.cartoonClockAnimation === false
  ) {
    document.body.classList.add("cartoon-clock-animation-off")
  }

  const fliqloTheme = currentSettings.fliqloTheme || "dark"
  document.body.classList.add(`fliqlo-theme-${fliqloTheme}`)

  if (currentSettings.fliqloZenMode) {
    document.body.classList.add("fliqlo-zen-mode")
  }
  if (currentSettings.fliqloTransparent) {
    document.body.classList.add("fliqlo-transparent")
  }

  const searchContainer = document.getElementById("search-container")
  if (searchContainer)
    searchContainer.style.display =
      currentSettings.showSearchBar !== false ? "" : "none"
  const bookmarksContainer = document.getElementById("bookmarks-container")
  if (bookmarksContainer)
    bookmarksContainer.style.display =
      currentSettings.showBookmarks !== false ? "" : "none"
  const bookmarkGroupsContainer = document.getElementById(
    "bookmark-groups-container",
  )
  if (bookmarkGroupsContainer)
    bookmarkGroupsContainer.style.display =
      currentSettings.showBookmarkGroups !== false ? "" : "none"
  const searchAiBtn = document.getElementById("search-ai-btn")
  if (searchAiBtn)
    searchAiBtn.style.display =
      currentSettings.showSearchAIIcon !== false ? "" : "none"
  document.documentElement.style.setProperty(
    "--search-bar-width",
    `${currentSettings.searchBarWidth || 600}px`,
  )
  document.documentElement.style.setProperty(
    "--search-bar-blur",
    `${currentSettings.searchBarBlur ?? 20}px`,
  )

  applyBasicStyles(currentSettings)
  loadFontOnBoot(currentSettings.font)
  loadFontOnBoot(currentSettings.clockFont)

  if (needsSettingsAtBoot(currentSettings)) {
    ensureSettingsInitialized("active-visuals")
  }
  setTimeout(() => {
    if (document.visibilityState === "hidden") return
    ensureCommandPaletteInitialized("deferred")
  }, 3200)

  initClock()
  
  if (currentSettings.showBookmarks !== false || currentSettings.showBookmarkGroups !== false) {
    ensureBookmarksInitialized()
  }
  if (currentSettings.showSearchBar !== false) {
    ensureSearchInitialized()
  }

  initContextMenu()
  initModal()

  const backgroundContextExclusions = [
    "#context-menu",
    "#settings-sidebar",
    "#settings-toggle",
    "#top-right-controls",
    "#quick-access-bar",
    "#layout-controls-popup",
    "#search-container",
    "#clock-date-wrap",
    "#custom-title-display",
    "#todo-container",
    "#timer-component",
    "#music-player-container",
    "#full-calendar-container",
    "#notepad-container",
    "#daily-quotes",
    "#weather-container",
    ".modal",
    ".custom-dialog-overlay",
    ".first-run-tour-overlay",
    "#startup-overlay",
    ".startup-overlay",
  ].join(", ")

  document.addEventListener("contextmenu", (event) => {
    if (event.defaultPrevented) return
    if (event.target.closest?.(backgroundContextExclusions)) return

    event.preventDefault()
    showContextMenu(event.clientX, event.clientY, -1, "background")
  })

  document.addEventListener("contextmenu", (event) => {
    if (event.defaultPrevented) return
    if (!event.target.closest?.("#search-container")) return

    event.preventDefault()
    event.stopPropagation()
    showContextMenu(event.clientX, event.clientY, -1, "search")
  })

  const widgetContextTargets = [
    ["#clock-date-wrap", "clock"],
    ["#todo-container", "todo"],
    ["#timer-component", "timer"],
    ["#music-player-container", "music"],
    ["#full-calendar-container", "calendar"],
    ["#notepad-container", "notepad"],
    ["#daily-quotes", "daily-quotes"],
    ["#weather-container", "weather"],
    ["#rss-container", "rss"],
  ]

  document.addEventListener("contextmenu", (event) => {
    if (event.defaultPrevented) return
    const match = widgetContextTargets.find(([selector]) =>
      event.target.closest?.(selector),
    )
    if (!match) return

    event.preventDefault()
    event.stopPropagation()
    
    showContextMenu(event.clientX, event.clientY, -1, "widget", match[1])
  })

  if (skipStartupLoader) {
    setTimeout(
      () => promptFirstRunBookmarkImport(renderBookmarks),
      500,
    )
  }

  const widgets = {
    todo: null,
    timer: null,
    music: null,
    calendar: null,
    quotes: null,
    weather: null,
    notepad: null,
    rss: null,
  }
  const widgetModuleLoaders = {
    todo: () => import("./components/todo.js").then((m) => m.TodoList),
    timer: () => import("./components/timer.js").then((m) => m.Timer),
    music: () =>
      import("./components/musicPlayer.js").then((m) => m.MusicPlayer),
    calendar: () =>
      import("./components/fullCalendar.js").then((m) => m.FullCalendar),
    quotes: () => import("./components/quotes.js").then((m) => m.DailyQuotes),
    weather: () => import("./components/weather.js").then((m) => m.Weather),
    notepad: () => import("./components/notepad.js").then((m) => m.Notepad),
    rss: () => import("./components/rss.js").then((m) => m.RssReader),
  }
  const widgetClassPromises = {}

  const loadWidgetClass = (type) => {
    if (!widgetClassPromises[type]) {
      widgetClassPromises[type] = widgetModuleLoaders[type]()
    }
    return widgetClassPromises[type]
  }

  const runWhenIdle = (callback, timeout = 1000) => {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(callback, { timeout })
    } else {
      setTimeout(callback, 200)
    }
  }

  const initWidget = async (type) => {
    if (widgets[type]) return widgets[type]

    switch (type) {
      case "todo":
        const TodoList = await loadWidgetClass("todo")
        widgets.todo = new TodoList()
        makeDraggable(widgets.todo.container, "todo")
        return widgets.todo
      case "timer":
        const Timer = await loadWidgetClass("timer")
        widgets.timer = new Timer()
        window.activeTimer = widgets.timer
        makeDraggable(widgets.timer.container, "timer")
        return widgets.timer
      case "music":
        const MusicPlayer = await loadWidgetClass("music")
        widgets.music = new MusicPlayer()
        makeDraggable(widgets.music.container, "music")
        return widgets.music
      case "calendar":
        const FullCalendar = await loadWidgetClass("calendar")
        widgets.calendar = new FullCalendar()
        makeDraggable(widgets.calendar.container, "calendar")
        return widgets.calendar
      case "quotes":
        const DailyQuotes = await loadWidgetClass("quotes")
        widgets.quotes = new DailyQuotes()
        makeDraggable(widgets.quotes.container, "daily-quotes")
        return widgets.quotes
      case "weather":
        const Weather = await loadWidgetClass("weather")
        widgets.weather = new Weather()
        makeDraggable(widgets.weather.container, "weather")
        return widgets.weather
      case "notepad":
        const Notepad = await loadWidgetClass("notepad")
        widgets.notepad = new Notepad()
        makeDraggable(
          widgets.notepad.container,
          "notepad",
          null,
          ".notepad-header",
        )
        return widgets.notepad
      case "rss":
        const RssReader = await loadWidgetClass("rss")
        widgets.rss = new RssReader(document.getElementById("rss-container"))
        makeDraggable(widgets.rss.container, "rss", null, ".rss-header")
        return widgets.rss
    }
  }

  const hasDetachedNotepadNotes = () => {
    try {
      const detached = JSON.parse(localStorage.getItem("detachedNotes") || "{}")
      return Object.values(detached).some(Boolean)
    } catch {
      return false
    }
  }

  const initVisibleWidgets = () => {
    const settings = getSettings()
    if (settings.showTodoList !== false) void initWidget("todo")
    if (settings.showNotepad !== false || hasDetachedNotepadNotes()) {
      void initWidget("notepad")
    }
    if (settings.showQuotes !== false) void initWidget("quotes")
    if (settings.showWeather === true) void initWidget("weather")
    if (settings.showTimer === true) void initWidget("timer")
    if (settings.showFullCalendar === true) void initWidget("calendar")
    if (settings.musicPlayerEnabled === true) void initWidget("music")
    if (settings.showRss === true) void initWidget("rss").then(w => { if (w) w.container.style.display = 'flex'; })
  }

  runWhenIdle(initVisibleWidgets, 1200)

  window.addEventListener("layoutUpdated", (e) => {
    if (!e.detail?.value) return
    switch (e.detail.key) {
      case "showTodoList":
        void initWidget("todo")
        break
      case "showNotepad":
        void initWidget("notepad")
        break
      case "showTimer":
        void initWidget("timer")
        break
      case "showFullCalendar":
        void initWidget("calendar")
        break
      case "showQuotes":
        void initWidget("quotes")
        break
      case "showWeather":
        void initWidget("weather")
        break
      case "showRss":
        if (e.detail.value) {
          void initWidget("rss").then(w => { if (w) w.container.style.display = 'flex'; })
        } else {
          if (widgets.rss) widgets.rss.container.style.display = 'none';
        }
        break
    }
  })

  window.addEventListener("settingsUpdated", async (e) => {
    if (e.detail?.key === "musicPlayerEnabled" && e.detail.value === true) {
      const music = await initWidget("music")
      music.setEnabled(true)
    } else if (
      e.detail?.key === "musicPlayerEnabled" &&
      e.detail.value !== true &&
      widgets.music
    ) {
      widgets.music.destroy?.()
      widgets.music = null
    }
  })

  makeDraggable(document.getElementById("clock-date-wrap"), "clock")
  makeDraggable(document.getElementById("search-container"), "searchBar")

  // Helper to sync quick buttons
  const quickBtns = document.querySelectorAll(".quick-btn")
  function syncQuickButtons() {
    const settings = getSettings()
    quickBtns.forEach((btn) => {
      const type = btn.dataset.toggle
      if (!type) return
      let isActive = false
      switch (type) {
        case "todo":
          isActive = settings.showTodoList !== false
          break
        case "notepad":
          isActive = settings.showNotepad !== false
          break
        case "timer":
          isActive = settings.showTimer === true
          break
        case "calendar":
          isActive = settings.showFullCalendar === true
          break
        case "music":
          isActive = settings.musicPlayerEnabled === true
          break
        case "clock":
          isActive = settings.clockDisplayMode !== "hide"
          break
        case "gregorian":
          isActive = settings.showGregorian !== false
          break
        case "quotes":
          isActive = settings.showQuotes !== false
          break
        case "weather":
          isActive = settings.showWeather === true
          break
        case "rss":
          isActive = settings.showRss === true
          break
      }
      btn.classList.toggle("active", isActive)
    })
  }

  // Initial sync
  syncQuickButtons()

  // Quick Access Bar Logic
  quickBtns.forEach((btn) => {
    const type = btn.dataset.toggle
    if (!type) return

    btn.addEventListener("click", async () => {
      let key, checkbox
      switch (type) {
        case "todo":
          key = "showTodoList"
          checkbox = showTodoCheckbox
          break
        case "notepad":
          key = "showNotepad"
          checkbox = showNotepadCheckbox
          break
        case "timer":
          key = "showTimer"
          checkbox = showTimerCheckbox
          break
        case "calendar":
          key = "showFullCalendar"
          checkbox = showFullCalendarCheckbox
          break
        case "music":
          key = "musicPlayerEnabled"
          checkbox = showMusicCheckbox
          break
        case "clock":
          const currentMode = getSettings().clockDisplayMode || "all"
          const nextMode = currentMode === "hide" ? "all" : "hide"
          updateSetting("clockDisplayMode", nextMode)
          if (clockDisplaySelect) clockDisplaySelect.value = nextMode
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: "clockDisplayMode", value: nextMode },
            }),
          )
          break
        case "gregorian":
          key = "showGregorian"
          checkbox = showGregorianCheckbox
          break
        case "quotes":
          const currentQuotes = getSettings().showQuotes !== false
          const nextQuotes = !currentQuotes
          updateSetting("showQuotes", nextQuotes)
          saveSettings()
          if (showQuotesCheckbox) showQuotesCheckbox.checked = nextQuotes
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: "showQuotes", value: nextQuotes },
            }),
          )
          break
        case "weather":
          key = "showWeather"
          checkbox = showWeatherCheckbox
          break
        case "rss":
          const currentRss = getSettings().showRss === true
          const nextRss = !currentRss
          updateSetting("showRss", nextRss)
          saveSettings()
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: "showRss", value: nextRss },
            }),
          )
          btn.classList.toggle("active", nextRss)
          break
      }
      if (key && checkbox) {
        if (!settingsInitialized) {
          await ensureSettingsInitialized("quick-access")
        }
        if (
          (type === "todo" ||
            type === "notepad" ||
            type === "timer" ||
            type === "calendar" ||
            type === "weather") &&
          !getSettings()[key]
        ) {
          await initWidget(type)
        }
        checkbox.click()
      }
    })
  })

  // Smooth reveal: wait for critical components and then fade out overlay
  function revealApp() {
    const mainContainer = document.querySelector(".main-container")
    let bookmarksReady =
      bookmarksLoaded ||
      (currentSettings.showBookmarks === false &&
        currentSettings.showBookmarkGroups === false)
    let bgReady = false
    let isRevealed = false

    const hideOverlay = () => {
      if (isRevealed) return
      isRevealed = true
      const revealNow = () => {
        const overlay = document.getElementById("startup-overlay")
        if (overlay) {
          overlay.style.opacity = "0"
        }
        localStorage.setItem("startpageHasOpened", "1")
        localStorage.removeItem("startpageShowStartupLoader")
        document.body.classList.remove("loading-state")
        window.setTimeout(() => {
          if (overlay) overlay.style.visibility = "hidden"
          document.body.classList.remove("is-booting")
          window.dispatchEvent(new CustomEvent("startpage:appRevealed"))
        }, 430)
      }
      const elapsed = performance.now() - bootStartedAt
      const remaining = skipStartupLoader
        ? 0
        : Math.max(0, minimumStartupLoaderMs - elapsed)
      window.setTimeout(revealNow, remaining)
    }

    const checkAllReady = () => {
      if (bookmarksReady && bgReady) {
        if (mainContainer) mainContainer.classList.add("ready")
        hideOverlay()
      }
    }

    if (skipStartupLoader) {
      requestAnimationFrame(() => {
        if (mainContainer) mainContainer.classList.add("ready")
        hideOverlay()
      })
      return
    }

    // 1. Wait for bookmarks
    let onBookmarksReady = null
    if (!bookmarksReady) {
      onBookmarksReady = () => {
        bookmarksReady = true
        checkAllReady()
        window.removeEventListener("bookmarksReady", onBookmarksReady)
      }
      window.addEventListener("bookmarksReady", onBookmarksReady)
    }

    // 2. Wait for background
    const background = currentSettings.background
    const isVideo =
      typeof background === "string" &&
      (background.startsWith("data:video") ||
        background.startsWith("idb-video-") ||
        background.startsWith("idb-gif-") ||
        /\.(mp4|webm|mov|ogg)(?:[?#].*)?$/i.test(background) ||
        background.includes("googlevideo"))

    const isImg =
      typeof background === "string" &&
      (background.startsWith("data:image") ||
        background.startsWith("blob:") ||
        background.match(/^https?:\/\//) ||
        background.startsWith("idb-img-") ||
        background.startsWith("idb-image-"))

    if (isImg) {
      const decodeBgImage = (url) => {
        const img = new Image()
        img.src = url
        if (typeof img.decode === "function") {
          img.decode()
            .then(() => {
              bgReady = true
              checkAllReady()
            })
            .catch(() => {
              bgReady = true
              checkAllReady()
            })
        } else {
          img.onload = () => {
            bgReady = true
            checkAllReady()
          }
          img.onerror = () => {
            bgReady = true
            checkAllReady()
          }
        }
      }

      if (background.startsWith("idb-")) {
        activeBackgroundLoad.then((url) => {
          if (url) {
            decodeBgImage(url)
          } else {
            bgReady = true
            checkAllReady()
          }
        })
      } else {
        decodeBgImage(background)
      }
    } else if (isVideo) {
      // For video background, wait for video element to start playing or ready
      const checkVideoStatus = () => {
        if (isRevealed) return
        const vid = document.getElementById("bg-video")
        if (
          vid &&
          vid.style.display === "block" &&
          (vid.readyState >= 3 || vid.currentTime > 0)
        ) {
          bgReady = true
          checkAllReady()
        } else {
          requestAnimationFrame(checkVideoStatus)
        }
      }
      setTimeout(checkVideoStatus, 50)
    } else if (needsSettingsAtBoot(currentSettings)) {
      const markBgReady = () => {
        bgReady = true
        checkAllReady()
      }
      const waitForVisualPaint = () => {
        if (currentSettings.svgWaveActive) {
          requestAnimationFrame(() => requestAnimationFrame(markBgReady))
        } else {
          markBgReady()
        }
      }
      if (window.settingsInitialized) {
        waitForVisualPaint()
      } else {
        const onSettingsReady = () => {
          waitForVisualPaint()
          window.removeEventListener("startpage:settingsReady", onSettingsReady)
        }
        window.addEventListener("startpage:settingsReady", onSettingsReady)
      }
    } else {
      bgReady = true
      checkAllReady()
    }

    // Safety timeout: if anything hangs, show app anyway after 1500ms
    setTimeout(() => {
      if (!isRevealed) {
        if (onBookmarksReady) {
          window.removeEventListener("bookmarksReady", onBookmarksReady)
        }
        if (mainContainer) mainContainer.classList.add("ready")
        hideOverlay()
      }
    }, 1500)
  }

  if (isIdbMedia(currentSettings.background)) {
    activeBackgroundLoad.then((url) => {
      if (getSettings().background !== currentSettings.background) return
      if (typeof window.appApplySettings === "function") {
        window.appApplySettings()
      } else if (url) {
        const bgLayer = document.getElementById("bg-layer")
        if (bgLayer) {
          const img = new Image()
          img.src = url
          const apply = () => {
            if (getSettings().background !== currentSettings.background) return
            bgLayer.style.backgroundImage = `url("${url}")`
            bgLayer.style.backgroundSize = currentSettings.bgSize || "cover"
            bgLayer.style.backgroundRepeat = currentSettings.bgRepeat || "no-repeat"
            document.body.classList.remove("preload-bg-preview")
          }
          if (typeof img.decode === "function") {
            img.decode().then(apply).catch(apply)
          } else {
            img.onload = apply
            img.onerror = apply
          }
        }
      }
    })
  } else if (currentSettings.background?.match(/^https?:\/\//)) {
    const bgLayer = document.getElementById("bg-layer")
    if (bgLayer) {
      const url = currentSettings.background
      const img = new Image()
      img.src = url
      const apply = () => {
        if (getSettings().background !== url) return
        bgLayer.style.backgroundImage = `url("${url}")`
        bgLayer.style.backgroundSize = currentSettings.bgSize || "cover"
        bgLayer.style.backgroundRepeat = currentSettings.bgRepeat || "no-repeat"
        document.body.classList.remove("preload-bg-preview")
      }
      if (typeof img.decode === "function") {
        img.decode().then(apply).catch(apply)
      } else {
        img.onload = apply
        img.onerror = apply
      }
    }
  }

  // initSettings() moved up to prevent CLS

  if (skipStartupLoader) {
    revealApp()
  } else {
    revealApp()
    let firstRunOnboardingStarted = false
    const startFirstRunOnboarding = () => {
      if (firstRunOnboardingStarted) return
      firstRunOnboardingStarted = true
      promptFirstRunBookmarkImport(renderBookmarks)
    }
    if (document.body.classList.contains("loading-state")) {
      window.addEventListener("startpage:appRevealed", startFirstRunOnboarding, {
        once: true,
      })
      setTimeout(startFirstRunOnboarding, 3200)
    } else {
      setTimeout(startFirstRunOnboarding, 300)
    }
  }

  // Sync Quick Access active state when settings change
  window.addEventListener("layoutUpdated", (e) => {
    syncQuickButtons()
    if (e.detail.key === "showSearchBar") {
      if (e.detail.value) ensureSearchInitialized()
      document.body.classList.toggle("hide-search-bar", !e.detail.value)
      const el = document.getElementById("search-container")
      if (el) fadeToggle(el, e.detail.value, "")
    }
    if (e.detail.key === "showSearchAIIcon") {
      const el = document.getElementById("search-ai-btn")
      if (el) fadeToggle(el, e.detail.value, "")
    }
    if (e.detail.key === "searchBarWidth") {
      document.documentElement.style.setProperty(
        "--search-bar-width",
        `${e.detail.value}px`,
      )
    }
    if (e.detail.key === "searchBarBlur") {
      document.documentElement.style.setProperty(
        "--search-bar-blur",
        `${e.detail.value}px`,
      )
    }
    if (e.detail.key === "showBookmarks") {
      if (e.detail.value) ensureBookmarksInitialized()
      const el = document.getElementById("bookmarks-container")
      if (el) fadeToggle(el, e.detail.value, "")
    }
    if (e.detail.key === "showBookmarkGroups") {
      if (e.detail.value) ensureBookmarksInitialized()
      const el = document.getElementById("bookmark-groups-container")
      if (el) fadeToggle(el, e.detail.value, "")
    }
    if (e.detail.key === "freeMoveCustomTitle") {
      document.body.classList.toggle(
        "free-move-custom-title",
        e.detail.value === true,
      )
      const titleWrap = document.getElementById("custom-title-display")
      if (titleWrap) {
        if (e.detail.value === true) {
          if (!titleWrap.style.top) {
            titleWrap.style.top = "45%"
            titleWrap.style.left = "50%"
            titleWrap.style.transform = "translate(-50%, 0)"
          }
        } else {
          titleWrap.style.position = ""
          titleWrap.style.top = ""
          titleWrap.style.left = ""
          titleWrap.style.bottom = ""
          titleWrap.style.right = ""
          titleWrap.style.transform = ""
          titleWrap.style.margin = ""
        }
      }
    }

    if (e.detail.key === "freeMoveClock") {
      document.body.classList.toggle("free-move-clock", e.detail.value === true)
      const clockWrap = document.getElementById("clock-date-wrap")
      if (clockWrap) {
        if (e.detail.value === true) {
          if (!clockWrap.style.top) {
            clockWrap.style.top = "35%"
            clockWrap.style.left = "50%"
            clockWrap.style.transform = "translate(-50%, -50%)"
          }
        } else {
          clockWrap.style.position = ""
          clockWrap.style.top = ""
          clockWrap.style.left = ""
          clockWrap.style.bottom = ""
          clockWrap.style.right = ""
          clockWrap.style.transform = ""
          clockWrap.style.margin = ""
        }
      }
    }

    if (e.detail.key === "freeMoveSearchBar") {
      document.body.classList.toggle(
        "free-move-search-bar",
        e.detail.value === true,
      )
      const searchWrap = document.getElementById("search-container")
      if (searchWrap && e.detail.value !== true) {
        searchWrap.style.position = ""
        searchWrap.style.top = ""
        searchWrap.style.left = ""
        searchWrap.style.bottom = ""
        searchWrap.style.right = ""
        searchWrap.style.transform = ""
        searchWrap.style.margin = ""
      }
    }
  })

  // DEFER NON-CRITICAL HEAVY TASKS
  setTimeout(async () => {
    const { migrated, changed } = await migrateDataUrls(
      getSettings().userBackgrounds,
    )
    if (changed) {
      updateSetting("userBackgrounds", migrated)
      saveSettings()
    }
    const { activeBgUid, background } = getSettings()
    // Chỉ preload ảnh đang active ngay lập tức; các ảnh còn lại lazy-load
    await preloadImages(getSettings().userBackgrounds, activeBgUid || background || null)

    // Check and trigger Unsplash background auto-randomization if scheduled
    const settings = getSettings()
    const isUnsplashBg =
      typeof settings.background === "string" &&
      (settings.background.startsWith("idb-img-unsplash-") ||
        settings.background.includes("images.unsplash.com"))

    if (
      settings.unsplashAutoRandomMode &&
      settings.unsplashAutoRandomMode !== "off" &&
      isUnsplashBg
    ) {
      const now = Date.now()
      const lastFetch = settings.unsplashLastFetchTime || 0
      let shouldFetch = false

      if (settings.unsplashAutoRandomMode === "every_tab") {
        shouldFetch = true
      } else if (settings.unsplashAutoRandomMode === "hourly") {
        if (now - lastFetch >= 3600000) {
          shouldFetch = true
        }
      } else if (settings.unsplashAutoRandomMode === "daily") {
        const lastDate = new Date(lastFetch).toDateString()
        const nowDate = new Date(now).toDateString()
        if (now - lastFetch >= 86400000 || lastDate !== nowDate) {
          shouldFetch = true
        }
      }

      if (shouldFetch) {
        try {
          await ensureSettingsInitialized("auto-randomize")
          const { setUnsplashRandomBackground } = await import(
            "./components/settings/unsplashFetcher.js"
          )
          await setUnsplashRandomBackground(
            null,
            null,
            window.appHandleSettingUpdate,
            true,
          )
        } catch (err) {
          console.error("Auto Unsplash background randomization failed:", err)
        }
      }
    }

    if (typeof window.appApplySettings === "function") {
      window.appApplySettings()
    }

    const resetLayoutBtn = document.getElementById("reset-layout")
    const resetLayoutQuick = document.getElementById("reset-layout-quick")
    const handleReset = async () => {
      const i18n = geti18n ? geti18n() : {}
      const options = [
        {
          type: "section",
          icon: "fa-solid fa-sliders",
          label: i18n.reset_section_general || "General",
        },
        {
          key: "all",
          label: i18n.reset_opt_all || "Entire Settings",
          checked: false,
        },
        {
          key: "positions",
          label: i18n.reset_opt_positions || "Layout Positions",
          checked: false,
        },
        {
          key: "effectColors",
          label: i18n.reset_opt_effects || "Effect Colors",
          checked: false,
        },
        {
          key: "styles",
          label: i18n.reset_opt_styles || "Custom Styles",
          checked: false,
        },
        {
          type: "section",
          icon: "fa-solid fa-layer-group",
          label: i18n.reset_section_modules || "Modules",
        },
        {
          key: "module_background",
          label: i18n.reset_module_background || "Background",
          checked: false,
        },
        {
          key: "module_effects",
          label: i18n.reset_module_effects || "Effects",
          checked: false,
        },
        {
          key: "module_widgets",
          label: i18n.reset_module_widgets || "Widgets",
          checked: false,
        },
        {
          key: "module_bookmarks",
          label: i18n.reset_module_bookmarks || "Bookmarks",
          checked: false,
        },
        {
          key: "module_timer",
          label: i18n.reset_module_timer || "Timer",
          checked: false,
        },
        {
          key: "module_layout",
          label: i18n.reset_module_layout || "Layout",
          checked: false,
        },
      ]

      const selection = await showChecklistConfirm(
        options,
        i18n.settings_reset_layout || "Reset Settings",
        i18n.alert_reset_layout_confirm || "Select items to reset:",
      )

      if (selection) {
        const hasSelection = Object.values(selection).some((v) => v === true)
        if (!hasSelection) return

        document.body.classList.remove("skip-startup-loader")
        document.body.classList.add("loading-state")
        const overlay = document.getElementById("startup-overlay")
        if (overlay) {
          overlay.style.visibility = "visible"
          overlay.style.opacity = "1"
        }
        localStorage.setItem("startpageShowStartupLoader", "1")

        setTimeout(() => {
          const selectedModules = [
            ["module_background", "background"],
            ["module_effects", "effects"],
            ["module_widgets", "widgets"],
            ["module_bookmarks", "bookmarks"],
            ["module_timer", "timer"],
            ["module_layout", "layout"],
          ]
            .filter(([key]) => selection[key] === true)
            .map(([, moduleName]) => moduleName)

          if (selectedModules.length) {
            resetSettingsModules(selectedModules)
          }

          if (
            selection.all ||
            selection.positions ||
            selection.effectColors ||
            selection.styles
          ) {
            resetComponentPositions(selection)
          } else {
            window.location.reload()
          }
        }, 1000)
      }
    }

    if (resetLayoutBtn) resetLayoutBtn.addEventListener("click", handleReset)
    if (resetLayoutQuick)
      resetLayoutQuick.addEventListener("click", handleReset)

    window.addEventListener("settingsUpdated", (e) => {
      if (
        e.detail.key === "music_player_enabled" ||
        e.detail.key === "musicPlayerEnabled"
      ) {
        syncQuickButtons()
      }
    })

    // Collapse functionality
    const quickAccessBar = document.querySelector(".quick-access-bar")
    const settingsToggle = document.getElementById("settings-toggle")
    if (quickAccessBar) {
      quickAccessBar.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        showContextMenu(e.clientX, e.clientY, -1, "quick-access-bar")
      })
    }
    if (settingsToggle) {
      settingsToggle.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        showContextMenu(e.clientX, e.clientY, -1, "quick-access-toggle")
      })
    }
    const collapseBtn = document.getElementById("quick-access-collapse")
    if (collapseBtn && quickAccessBar) {
      const settings = getSettings()
      const toggleBorderVisibility = (isVisible) => {
        quickAccessBar.classList.toggle("no-border", !isVisible)
        if (settingsToggle) {
          settingsToggle.classList.toggle("no-border", !isVisible)
        }
      }
      const normalizeQuickAccessRadius = (value, fallback) => {
        const match = String(value || "").match(/^(\d+(?:\.\d+)?)px$/)
        if (!match) return fallback
        const px = Math.min(20, Math.max(0, Math.round(Number(match[1]))))
        return `${px}px`
      }

      // Apply border-radius
      document.documentElement.style.setProperty(
        "--quick-access-btn-radius",
        normalizeQuickAccessRadius(settings.quickAccessBorderRadius, "5px"),
      )
      document.documentElement.style.setProperty(
        "--quick-access-bar-radius",
        normalizeQuickAccessRadius(settings.quickAccessBarRadius, "14px"),
      )
      document.documentElement.style.setProperty(
        "--quick-access-toggle-radius",
        normalizeQuickAccessRadius(settings.quickAccessToggleRadius, "20px"),
      )
      toggleBorderVisibility(settings.quickAccessBorderVisible !== false)
      window.addEventListener("layoutUpdated", (e) => {
        if (e.detail.key === "quickAccessBorderRadius") {
          document.documentElement.style.setProperty(
            "--quick-access-btn-radius",
            normalizeQuickAccessRadius(e.detail.value, "5px"),
          )
        }
        if (e.detail.key === "quickAccessBarRadius") {
          document.documentElement.style.setProperty(
            "--quick-access-bar-radius",
            normalizeQuickAccessRadius(e.detail.value, "14px"),
          )
        }
        if (e.detail.key === "quickAccessToggleRadius") {
          document.documentElement.style.setProperty(
            "--quick-access-toggle-radius",
            normalizeQuickAccessRadius(e.detail.value, "20px"),
          )
        }
        if (e.detail.key === "quickAccessBorderVisible") {
          toggleBorderVisibility(!!e.detail.value)
        }
      })

      if (settings.quickAccessCollapsed) {
        quickAccessBar.classList.add("collapsed")
      }

      collapseBtn.addEventListener("click", () => {
        const isCollapsed = quickAccessBar.classList.toggle("collapsed")
        collapseBtn.title = isCollapsed
          ? settings.language === "vi"
            ? "Mở rộng"
            : "Expand"
          : settings.language === "vi"
            ? "Thu gọn"
            : "Collapse"
        updateSetting("quickAccessCollapsed", isCollapsed)
        saveSettings()
      })

      collapseBtn.title = settings.quickAccessCollapsed
        ? settings.language === "vi"
          ? "Mở rộng"
          : "Expand"
        : settings.language === "vi"
          ? "Thu gọn"
          : "Collapse"
    }

    // Drag and Drop for Quick Access Icons
    const setupQaDragAndDrop = () => {
      if (!quickAccessBar) return;
      const toggleBtns = Array.from(quickAccessBar.querySelectorAll('.quick-btn[data-toggle]'));
      const allowReorder = getSettings().qaAllowReorder === true;

      toggleBtns.forEach(btn => {
        btn.draggable = allowReorder;
        btn.style.cursor = allowReorder ? 'grab' : 'pointer';

        if (!btn._dragInitialized) {
          btn._dragInitialized = true;
          btn.addEventListener('dragstart', (e) => {
            if (!getSettings().qaAllowReorder) {
              e.preventDefault();
              return;
            }
            window._draggedQaIcon = btn;
            btn.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', ''); // Required for Firefox
          });

          btn.addEventListener('dragend', () => {
            window._draggedQaIcon = null;
            btn.style.opacity = '1';
            saveQaOrder();
          });

          btn.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const draggedIcon = window._draggedQaIcon;
            if (!draggedIcon || !getSettings().qaAllowReorder) return;
            
            const layoutControlsBtn = document.getElementById("layout-controls-btn");
            const anchor = layoutControlsBtn || quickAccessBar.querySelector('.quick-access-divider');
            
            const draggableElements = [...quickAccessBar.querySelectorAll('.quick-btn[data-toggle]')]
              .filter(el => el !== draggedIcon);

            const nextElement = draggableElements.reduce((closest, child) => {
              const box = child.getBoundingClientRect();
              const offset = e.clientY - box.top - box.height / 2;
              if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
              } else {
                return closest;
              }
            }, { offset: Number.NEGATIVE_INFINITY }).element;

            if (nextElement) {
              quickAccessBar.insertBefore(draggedIcon, nextElement);
            } else if (anchor) {
              quickAccessBar.insertBefore(draggedIcon, anchor);
            }
          });
        }
      });
    };

    const saveQaOrder = () => {
      if (!quickAccessBar) return;
      const order = [];
      quickAccessBar.querySelectorAll('.quick-btn[data-toggle]').forEach(btn => {
        order.push(btn.getAttribute('data-toggle'));
      });
      updateSetting('qaOrder', order);
      saveSettings();
    };

    const applyQaOrder = () => {
      if (!quickAccessBar) return;
      const order = getSettings().qaOrder;
      if (order && Array.isArray(order)) {
        const layoutControlsBtn = document.getElementById("layout-controls-btn");
        const anchor = layoutControlsBtn || quickAccessBar.querySelector('.quick-access-divider');
        if (anchor) {
          order.forEach(toggle => {
            const btn = quickAccessBar.querySelector(`.quick-btn[data-toggle="${toggle}"]`);
            if (btn) {
              quickAccessBar.insertBefore(btn, anchor);
            }
          });
        }
      }
    };

    if (quickAccessBar) {
      applyQaOrder();
      setupQaDragAndDrop();

      window.addEventListener("layoutUpdated", (e) => {
        if (e.detail.key === "qaAllowReorder") {
          setupQaDragAndDrop();
        }
      });
    }

    // Update Notification Check
    setTimeout(() => {
      try {
        const manifest = window.chrome?.runtime?.getManifest?.()
        if (manifest && manifest.version) {
          const currentVersion = manifest.version
          const storage = window.chrome?.storage?.local || {
            get: (keys, cb) => {
              const res = {}
              keys.forEach((k) => {
                const val = localStorage.getItem(k)
                res[k] = val === "true" ? true : val === "false" ? false : val
              })
              cb(res)
            },
            set: (obj) => {
              Object.keys(obj).forEach((k) => localStorage.setItem(k, obj[k]))
            },
          }

          storage.get(
            ["lastVersion", "updateModalAcknowledged", "updateArrowTimestamp"],
            (result) => {
              let {
                lastVersion,
                updateModalAcknowledged,
                updateArrowTimestamp,
              } = result

              if (typeof updateArrowTimestamp === "string")
                updateArrowTimestamp = parseInt(updateArrowTimestamp)

              const isFreshInstall =
                !lastVersion &&
                !localStorage.getItem("pageSettings") &&
                !localStorage.getItem("bookmarks")

              if (isFreshInstall) {
                storage.set({
                  lastVersion: currentVersion,
                  updateModalAcknowledged: true,
                  updateArrowTimestamp: 0,
                })
                setUpdateNoticePending(false)
                return
              }

              // Version changed or first time tracking
              if (!lastVersion || lastVersion !== currentVersion) {
                updateModalAcknowledged = false
                updateArrowTimestamp = Date.now()
                storage.set({
                  lastVersion: currentVersion,
                  updateModalAcknowledged,
                  updateArrowTimestamp,
                })
              }

              const showModal = updateModalAcknowledged !== true
              const now = Date.now()
              const hour = 3600000
              const showArrow =
                updateArrowTimestamp && now - updateArrowTimestamp < hour

              if (showModal || showArrow) {
                showUpdateUI(currentVersion, showModal, showArrow)
              }

              if (!showModal) {
                setUpdateNoticePending(false)
              }

              if (showArrow) {
                const timeLeft = hour - (now - updateArrowTimestamp)
                setTimeout(() => {
                  const sidebarLink = document.getElementById(
                    "sidebar-update-link",
                  )
                  if (sidebarLink) fadeToggle(sidebarLink, false, "flex")
                }, timeLeft)
              }
            },
          )
        } else {
          setUpdateNoticePending(false)
        }

        function escapeUpdateHtml(value) {
          return String(value || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;")
        }

        async function renderUpdateNotes() {
          const { getUpdateNotes } = await import("./data/updateNotes.js")
          const updateNotes = getUpdateNotes(getSettings().language)
          const changesTitle = document.getElementById("update-changes-title")
          const contributorsTitle = document.getElementById(
            "update-contributors-title",
          )
          const changesList = document.getElementById("update-change-list")
          const contributorList = document.getElementById(
            "update-contributor-list",
          )

          if (changesTitle) {
            changesTitle.innerHTML = `<i class="fa-solid fa-star"></i> ${escapeUpdateHtml(updateNotes.changesTitle)}`
          }
          if (contributorsTitle) {
            contributorsTitle.innerHTML = `<i class="fa-solid fa-handshake"></i> ${escapeUpdateHtml(updateNotes.contributorsTitle)}`
          }
          if (changesList) {
            changesList.innerHTML = updateNotes.changes
              .map((item) => `<li>${escapeUpdateHtml(item)}</li>`)
              .join("")
          }
          if (contributorList) {
            contributorList.innerHTML = updateNotes.contributors
              .map((item) => {
                const stats =
                  item.badge || item.badgeLabel
                    ? `<div class="update-contributor-stats">
                        <span>${escapeUpdateHtml(item.badge)}</span>
                        <small>${escapeUpdateHtml(item.badgeLabel)}</small>
                      </div>`
                    : ""
                return `<article class="update-contributor ${stats ? "" : "compact"}">
                  <div class="update-contributor-main">
                    <strong>${escapeUpdateHtml(item.name)}</strong>
                    <span>${escapeUpdateHtml(item.project)}</span>
                    <em>${escapeUpdateHtml(item.role)}</em>
                  </div>
                  ${stats}
                  <p>${escapeUpdateHtml(item.note)}</p>
                </article>`
              })
              .join("")
          }
        }

        function showUpdateUI(currentVersion, showModal, showArrow) {
          const popup = document.getElementById("update-notification-popup")
          const verLabel = document.getElementById("update-version-label")
          const sidebarLink = document.getElementById("sidebar-update-link")

          const acknowledgeUpdate = () => {
            if (popup) fadeToggle(popup, false, "block")
            const storage = window.chrome?.storage?.local || {
              set: (obj) =>
                Object.keys(obj).forEach((k) =>
                  localStorage.setItem(k, obj[k]),
                ),
            }
            storage.set({ updateModalAcknowledged: true })
            setUpdateNoticePending(false)
          }

          const showUpdateModal = async () => {
            if (!popup || !verLabel) return
            verLabel.textContent = `v${currentVersion}`
            await renderUpdateNotes()
            fadeToggle(popup, true, "block")

            document
              .getElementById("close-update-popup")
              ?.addEventListener("click", acknowledgeUpdate)
            document
              .getElementById("github-update-link")
              ?.addEventListener("click", acknowledgeUpdate)
          }

          if (showModal && popup && verLabel) {
            const waitForCurrentDialog = setInterval(() => {
              if (
                isFirstRunOnboardingPending() ||
                document.body.classList.contains("first-run-tour-active") ||
                document.querySelector("#custom-dialog-overlay.active")
              ) {
                return
              }
              clearInterval(waitForCurrentDialog)
              showUpdateModal()
            }, 150)
          }

          if (showArrow && sidebarLink) {
            fadeToggle(sidebarLink, true, "flex")
          }
        }

        window.addEventListener("startpage:languageChanged", () => {
          const popup = document.getElementById("update-notification-popup")
          if (!popup || window.getComputedStyle(popup).display === "none") {
            return
          }
          void renderUpdateNotes()
        })
      } catch (e) {
        console.warn("Update check failed:", e)
        setUpdateNoticePending(false)
      }
    }, 100)
  }, 10)

  setTimeout(() => {
    import("./components/googleApps.js")
      .then(({ preloadIcons }) => {
        if (typeof preloadIcons === "function") preloadIcons()
      })
      .catch(() => {})
  }, 2000)
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true })
} else {
  bootstrap()
}
