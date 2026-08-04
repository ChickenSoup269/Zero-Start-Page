/**
 * main.js  —  Boot Orchestrator
 *
 * Responsibilities:
 *  1. Apply visual settings before first paint (no FOUC / CLS)
 *  2. Initialize critical components synchronously
 *  3. Wire up lazy-loading for heavy features
 *  4. Reveal app as fast as possible
 *
 * Heavy logic has been extracted to src/boot/* modules for easier maintenance.
 */

// ── Imports: Services & Utils ─────────────────────────────────────────────────
import { initI18n, geti18n }   from "./services/i18n.js"
import { initClock }           from "./components/clock.js"
import { initBookmarks, renderBookmarks } from "./components/bookmarks.js"
import { initModal }           from "./components/modal.js"
import {
  initContextMenu,
  showContextMenu,
  hideContextMenu,
} from "./components/contextMenu.js"
import { initSearch }          from "./components/search.js"
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
import { initPerfHud }         from "./utils/perfHud.js"
import { DriveSync }           from "./services/googleDriveSync.js"
import { makeDraggable }       from "./utils/draggable.js"
import {
  resetComponentPositions,
  resetSettingsModules,
  updateSetting,
  getSettings,
  saveSettings,
} from "./services/state.js"
import { showConfirm, showAlert, showChecklistConfirm } from "./utils/dialog.js"

// ── Imports: Boot Modules ─────────────────────────────────────────────────────
import { applyBasicStyles, applyBootVisualPreview, loadFontOnBoot } from "./boot/styles.js"
import { applyBootBodyClasses }  from "./boot/bootClasses.js"
import {
  ensureSettingsInitialized,
  ensureGoogleAppsInitialized,
  ensureCommandPaletteInitialized,
  setupLazyInitTriggers,
} from "./boot/lazyInit.js"
import {
  initWidget,
  initVisibleWidgets,
  setupWidgetLayoutListeners,
} from "./boot/widgetManager.js"
import {
  revealApp,
  fastRevealSkipStartup,
  needsSettingsAtBoot,
} from "./boot/revealApp.js"
import {
  syncQuickButtons,
  setupQuickAccessClickHandlers,
  setupQuickAccessCollapse,
  setupQuickAccessDragAndDrop,
  setupQuickAccessContextMenu,
  setupLayoutUpdatedHandlers,
} from "./boot/quickAccess.js"
import { runUpdateCheck } from "./boot/updateCheck.js"

// ── Helpers ───────────────────────────────────────────────────────────────────
function syncUninstallSurveyLanguage(language) {
  try {
    window.chrome?.runtime?.sendMessage?.(
      { action: "updateUninstallLanguage", language: language === "vi" ? "vi" : "en" },
      () => {
        const error = window.chrome?.runtime?.lastError
        if (error) console.warn("Could not sync uninstall survey language:", error.message)
      },
    )
  } catch (error) {
    console.warn("Could not sync uninstall survey language:", error)
  }
}

function isFirstRunOnboardingPending() {
  return (
    window.startpageFirstRunActive === true ||
    (localStorage.getItem("startpageFirstRunSvgBgV1") === "applied" &&
      localStorage.getItem("startpageFirstRunOnboardingDoneV1") !== "1")
  )
}

// ── Bookmark / Search lazy guards ─────────────────────────────────────────────
let bookmarksInitialized = false
function ensureBookmarksInitialized() {
  if (bookmarksInitialized) return
  initBookmarks()
  bookmarksInitialized = true
}

let searchInitialized = false
function ensureSearchInitialized() {
  if (searchInitialized) return
  initSearch()
  searchInitialized = true
}

// Track when bookmarks have rendered so revealApp can gate on them
let bookmarksLoaded = false
window.addEventListener("bookmarksReady", () => { bookmarksLoaded = true }, { once: true })

// ── Expose ensureSettingsInitialized globally (used by other modules) ─────────
window.ensureSettingsInitialized = ensureSettingsInitialized

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  const skipStartupLoader = document.body.classList.contains("skip-startup-loader")
  const bootStartedAt = performance.now()
  if (!skipStartupLoader) document.body.classList.add("is-booting")

  prepareFirstRunDefaults()

  const currentSettings = getSettings()
  applyBootVisualPreview(currentSettings)

  const minimumStartupLoaderMs = isFirstRunOnboardingPending() ? 1600 : 400

  // ── 1. Language (blocks everything else) ──────────────────────────────────
  await initI18n()
  syncUninstallSurveyLanguage(currentSettings.language)

  // ── 2. Version label in startup overlay ───────────────────────────────────
  try {
    const manifest = window.chrome?.runtime?.getManifest?.()
    if (manifest?.version) {
      const startupVersion = document.getElementById("startup-version")
      if (startupVersion) startupVersion.textContent = `v${manifest.version}`
      const settingsVersion = document.getElementById("settings-version")
      if (settingsVersion) settingsVersion.textContent = `v${manifest.version}`
    }
  } catch {}

  // ── 3. Fast reveal for skip-startup-loader mode ───────────────────────────
  fastRevealSkipStartup(skipStartupLoader)

  // ── 4. Wire lazy-init triggers (settings panel, google apps, cmd palette) ─
  setupLazyInitTriggers()

  // ── 5. Tab hidden → trim media from memory ────────────────────────────────
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") return
    const latestSettings = getSettings()
    trimMediaMemory({
      keepIds: [latestSettings.background],
      includeThumbnails: true,
      maxUrls: 1,
      maxThumbnails: 24,
    })
  })

  // ── 6. Start IDB background load early so it's ready when needed ──────────
  const activeBackgroundLoad = isIdbMedia(currentSettings.background)
    ? getImageUrl(currentSettings.background).catch(() => null)
    : Promise.resolve(null)

  // ── 7. Apply body classes & CSS variables synchronously ───────────────────
  applyBootBodyClasses(currentSettings)
  applyBasicStyles(currentSettings)
  loadFontOnBoot(currentSettings.font)
  loadFontOnBoot(currentSettings.clockFont)

  // ── 8. Pre-init settings if heavy visuals are active ─────────────────────
  if (needsSettingsAtBoot(currentSettings)) {
    ensureSettingsInitialized("active-visuals")
  }

  // ── 9. Defer command palette init — not needed until user interaction ─────
  setTimeout(() => {
    if (document.visibilityState === "hidden") return
    ensureCommandPaletteInitialized("deferred")
  }, 3200)

  // ── 10. Critical UI components ────────────────────────────────────────────
  initPerfHud()
  initClock()

  if (currentSettings.showBookmarks !== false || currentSettings.showBookmarkGroups !== false) {
    ensureBookmarksInitialized()
  }
  if (currentSettings.showSearchBar !== false) {
    ensureSearchInitialized()
  }

  initContextMenu()
  initModal()
  DriveSync.init()

  // ── 11. Draggable UI elements ─────────────────────────────────────────────
  makeDraggable(document.getElementById("clock-date-wrap"), "clock")
  makeDraggable(document.getElementById("search-container"), "searchBar")
  makeDraggable(document.getElementById("bookmark-widget"), "bookmarkWidget")

  // ── 12. Context menus ─────────────────────────────────────────────────────
  const backgroundContextExclusions = [
    "#context-menu", "#settings-sidebar", "#settings-toggle",
    "#top-right-controls", "#quick-access-bar", "#layout-controls-popup",
    "#search-container", "#clock-date-wrap", "#custom-title-display",
    "#todo-container", "#timer-component", "#music-player-container",
    "#full-calendar-container", "#notepad-container", "#daily-quotes",
    "#weather-container", "#rss-container", ".modal", ".custom-dialog-overlay",
    ".first-run-tour-overlay", "#startup-overlay", ".startup-overlay",
  ].join(", ")

  document.addEventListener("contextmenu", (event) => {
    if (event.defaultPrevented) return
    if (event.target.closest?.(backgroundContextExclusions)) return
    if (document.body.classList.contains("bookmark-manager-open")) return
    event.preventDefault()
    showContextMenu(event.clientX, event.clientY, -1, "background")
  })

  document.addEventListener("contextmenu", (event) => {
    if (event.defaultPrevented) return
    if (!event.target.closest?.("#search-container")) return
    if (document.body.classList.contains("bookmark-manager-open")) return
    event.preventDefault()
    event.stopPropagation()
    showContextMenu(event.clientX, event.clientY, -1, "search")
  })

  const widgetContextTargets = [
    ["#custom-title-display", "custom-title"],
    ["#clock-date-wrap", "clock"],
    ["#todo-container", "todo"],
    ["#timer-component", "timer"],
    ["#music-player-container", "music"],
    ["#full-calendar-container", "calendar"],
    ["#notepad-container", "notepad"],
    ["#daily-quotes", "daily-quotes"],
    ["#weather-container", "weather"],
    ["#rss-container", "rss"],
    ["#habit-tracker-container", "habitTracker"],
  ]
  document.addEventListener("contextmenu", (event) => {
    if (event.defaultPrevented) return
    const match = widgetContextTargets.find(([sel]) => event.target.closest?.(sel))
    if (!match) return
    if (document.body.classList.contains("bookmark-manager-open")) return
    event.preventDefault()
    event.stopPropagation()
    showContextMenu(event.clientX, event.clientY, -1, "widget", match[1])
  })

  // ── 13. Quick Access bar setup ────────────────────────────────────────────
  syncQuickButtons()
  setupQuickAccessClickHandlers()
  setupQuickAccessCollapse()
  setupQuickAccessContextMenu()
  setupQuickAccessDragAndDrop()
  setupWidgetLayoutListeners()
  setupLayoutUpdatedHandlers({ ensureSearchInitialized, ensureBookmarksInitialized })

  // ── 14. First-run bookmark import prompt ──────────────────────────────────
  if (skipStartupLoader) {
    setTimeout(() => promptFirstRunBookmarkImport(renderBookmarks), 500)
  }

  // ── 15. IDB / HTTP background application ────────────────────────────────
  if (isIdbMedia(currentSettings.background)) {
    Promise.all([
      activeBackgroundLoad.catch(() => null),
      new Promise((resolve) => {
        if (typeof window.appApplySettings === "function") {
          resolve()
        } else {
          window.addEventListener("startpage:settingsReady", resolve, { once: true })
          setTimeout(resolve, 2000)
        }
      }),
    ]).then(() => {
      if (getSettings().background !== currentSettings.background) return
      if (typeof window.appApplySettings === "function") window.appApplySettings()
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
        document.body.classList.remove("preload-bg-preview", "preload-bg-ready")
      }
      if (typeof img.decode === "function") {
        img.decode().then(apply).catch(apply)
      } else {
        img.onload = apply
        img.onerror = apply
      }
    }
  }

  // ── 16. Reveal the app ────────────────────────────────────────────────────
  revealApp({
    skipStartupLoader,
    bootStartedAt,
    minimumStartupLoaderMs,
    currentSettings,
    bookmarksLoaded,
    activeBackgroundLoad,
  })

  if (!skipStartupLoader) {
    let firstRunOnboardingStarted = false
    const startFirstRunOnboarding = () => {
      if (firstRunOnboardingStarted) return
      firstRunOnboardingStarted = true
      promptFirstRunBookmarkImport(renderBookmarks)
    }
    if (document.body.classList.contains("loading-state")) {
      window.addEventListener("startpage:appRevealed", startFirstRunOnboarding, { once: true })
      setTimeout(startFirstRunOnboarding, 3200)
    } else {
      setTimeout(startFirstRunOnboarding, 300)
    }
  }

  // ── 17. Deferred heavy tasks (post-reveal) ────────────────────────────────
  setTimeout(async () => {
    // Migrate & preload background images from old data-URL format to IDB
    const { migrated, changed } = await migrateDataUrls(getSettings().userBackgrounds)
    if (changed) {
      updateSetting("userBackgrounds", migrated)
      saveSettings()
    }
    const { activeBgUid, background } = getSettings()
    await preloadImages(getSettings().userBackgrounds, activeBgUid || background || null)

    // Unsplash auto-randomize
    const settings = getSettings()
    const isUnsplashBg =
      typeof settings.background === "string" &&
      (settings.background.startsWith("idb-img-unsplash-") ||
        settings.background.includes("images.unsplash.com"))
    if (settings.unsplashAutoRandomMode && settings.unsplashAutoRandomMode !== "off" && isUnsplashBg) {
      const now = Date.now()
      const lastFetch = settings.unsplashLastFetchTime || 0
      let shouldFetch =
        settings.unsplashAutoRandomMode === "every_tab" ||
        (settings.unsplashAutoRandomMode === "hourly" && now - lastFetch >= 3600000) ||
        (settings.unsplashAutoRandomMode === "daily" &&
          (now - lastFetch >= 86400000 || new Date(lastFetch).toDateString() !== new Date(now).toDateString()))
      if (shouldFetch) {
        try {
          await ensureSettingsInitialized("auto-randomize")
          const { setUnsplashRandomBackground } = await import("./components/settings/unsplashFetcher.js")
          await setUnsplashRandomBackground(null, null, window.appHandleSettingUpdate, true)
        } catch (err) {
          console.error("Auto Unsplash background randomization failed:", err)
        }
      }
    }

    // Local gallery auto-random
    if (
      settings.localAutoRandomMode &&
      settings.localAutoRandomMode !== "off" &&
      Array.isArray(settings.userBackgrounds) &&
      settings.userBackgrounds.length > 0
    ) {
      const now = Date.now()
      const lastLocalFetch = settings.localAutoRandomLastTime || 0
      let shouldPickLocal =
        settings.localAutoRandomMode === "every_tab" ||
        (settings.localAutoRandomMode === "hourly" && now - lastLocalFetch >= 3600000) ||
        (settings.localAutoRandomMode === "daily" &&
          (now - lastLocalFetch >= 86400000 ||
            new Date(lastLocalFetch).toDateString() !== new Date(now).toDateString()))
      if (shouldPickLocal) {
        try {
          const fresh = settings.userBackgrounds.filter((bg) => {
            const id = typeof bg === "object" ? bg.id : bg
            return id !== settings.background
          })
          const pool = fresh.length ? fresh : settings.userBackgrounds
          const picked = pool[Math.floor(Math.random() * pool.length)]
          const bgId = typeof picked === "object" ? picked.id : picked
          if (bgId && window.appHandleSettingUpdate) {
            updateSetting("localAutoRandomLastTime", now)
            saveSettings()
            window.appHandleSettingUpdate("background", bgId)
          }
        } catch (err) {
          console.error("Local gallery auto-random failed:", err)
        }
      }
    }

    if (typeof window.appApplySettings === "function") window.appApplySettings()

    // ── Reset layout button ───────────────────────────────────────────────
    const handleReset = async () => {
      const i18n = geti18n ? geti18n() : {}
      const options = [
        { type: "section", icon: "fa-solid fa-sliders", label: i18n.reset_section_general || "General" },
        { key: "all",              label: i18n.reset_opt_all || "Entire Settings",    checked: false },
        { key: "positions",        label: i18n.reset_opt_positions || "Layout Positions", checked: false },
        { key: "effectColors",     label: i18n.reset_opt_effects || "Effect Colors",  checked: false },
        { key: "styles",           label: i18n.reset_opt_styles || "Custom Styles",   checked: false },
        { type: "section", icon: "fa-solid fa-layer-group", label: i18n.reset_section_modules || "Modules" },
        { key: "module_background",label: i18n.reset_module_background || "Background", checked: false },
        { key: "module_effects",   label: i18n.reset_module_effects || "Effects",     checked: false },
        { key: "module_widgets",   label: i18n.reset_module_widgets || "Widgets",     checked: false },
        { key: "module_bookmarks", label: i18n.reset_module_bookmarks || "Bookmarks", checked: false },
        { key: "module_timer",     label: i18n.reset_module_timer || "Timer",         checked: false },
        { key: "module_layout",    label: i18n.reset_module_layout || "Layout",       checked: false },
      ]

      const selection = await showChecklistConfirm(
        options,
        i18n.settings_reset_layout || "Reset Settings",
        i18n.alert_reset_layout_confirm || "Select items to reset:",
      )

      if (!selection) return
      if (!Object.values(selection).some((v) => v === true)) return

      document.body.classList.remove("skip-startup-loader")
      document.body.classList.add("loading-state", "is-booting")
      const overlay = document.getElementById("startup-overlay")
      const mainContainer = document.querySelector(".main-container")
      if (mainContainer) {
        mainContainer.classList.remove("ready")
        mainContainer.style.opacity = "0"
        mainContainer.style.visibility = "hidden"
      }
      if (overlay) {
        overlay.classList.remove("overlay-hidden")
        overlay.style.removeProperty("opacity")
        overlay.style.removeProperty("visibility")
        overlay.style.removeProperty("transition")
        overlay.style.opacity = "0"
        void overlay.offsetHeight
        requestAnimationFrame(() => { overlay.style.opacity = "1" })
      }
      localStorage.setItem("startpageShowStartupLoader", "1")

      setTimeout(() => {
        const selectedModules = [
          ["module_background", "background"],
          ["module_effects",    "effects"],
          ["module_widgets",    "widgets"],
          ["module_bookmarks",  "bookmarks"],
          ["module_timer",      "timer"],
          ["module_layout",     "layout"],
        ]
          .filter(([key]) => selection[key] === true)
          .map(([, name]) => name)

        if (selectedModules.length) resetSettingsModules(selectedModules)

        if (selection.all || selection.positions || selection.effectColors || selection.styles) {
          resetComponentPositions(selection)
        } else {
          window.location.reload()
        }
      }, 1000)
    }

    document.getElementById("reset-layout")?.addEventListener("click", handleReset)
    document.getElementById("reset-layout-quick")?.addEventListener("click", handleReset)

    // ── Update notification check (deferred) ─────────────────────────────
    runUpdateCheck()
  }, 10)

  // ── 18. Widgets: idle-load visible ones ──────────────────────────────────
  const runWhenIdle = (cb, timeout = 1000) => {
    if (window.requestIdleCallback) window.requestIdleCallback(cb, { timeout })
    else setTimeout(cb, 200)
  }
  runWhenIdle(initVisibleWidgets, 2200)

  // ── 19. Preload Google Apps icons (not critical, 2s delay) ───────────────
  setTimeout(() => {
    import("./components/googleApps.js")
      .then(({ preloadIcons }) => { if (typeof preloadIcons === "function") preloadIcons() })
      .catch(() => {})
  }, 2000)
}

// ── Entry point ───────────────────────────────────────────────────────────────
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true })
} else {
  bootstrap()
}

// ── Non-critical deferred inits ───────────────────────────────────────────────
// Terminal — completely optional, load after boot settles
setTimeout(() => {
  import("./components/terminal.js")
    .then(({ initTerminal }) => initTerminal())
    .catch(() => {})
}, 1500)

// Low-memory performance warning
setTimeout(() => {
  if (navigator.deviceMemory && navigator.deviceMemory <= 8) {
    if (!localStorage.getItem("perfWarningShown")) {
      showAlert(
        geti18n().perf_warning ||
          "System Check: Your device has 8GB RAM or less.\n\nStartpage has heavy glassmorphism effects. If you experience lag, consider turning off some heavy features.\n\n" +
          "Tip: Press the backtick (`) key to open the Terminal and type 'perf' or press 'Ctrl+Alt+P' to toggle the Performance HUD.",
      )
      localStorage.setItem("perfWarningShown", "true")
    }
  }
}, 3000)
