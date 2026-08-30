/**
 * boot/lazyInit.js
 * Lazy-init controllers for Settings, Google Apps, and Command Palette.
 * Each module is dynamically imported only when first needed.
 */
import { refreshDOMReferences } from "../utils/dom.js"

// ── Settings ─────────────────────────────────────────────────────────────────
let settingsInitPromise = null
let settingsInitialized = false

export function isSettingsInitialized() {
  return settingsInitialized
}

export function ensureSettingsInitialized(reason = "idle") {
  if (settingsInitialized) return Promise.resolve()
  if (!settingsInitPromise) {
    settingsInitPromise = Promise.resolve(window.startpageSettingsPartialsReady)
      .then(() => {
        refreshDOMReferences()
        return import("../components/settings.js")
      })
      .then(async ({ initSettings }) => {
        await initSettings()
        settingsInitialized = true
        window.settingsInitialized = true
        window.dispatchEvent(
          new CustomEvent("startpage:settingsReady", { detail: { reason } }),
        )
      })
      .catch((error) => {
        settingsInitPromise = null
        console.error("Could not initialize settings:", error)
      })
  }
  return settingsInitPromise
}

// ── Google Apps ──────────────────────────────────────────────────────────────
let googleAppsInitPromise = null
let googleAppsInitialized = false

export function ensureGoogleAppsInitialized(reason = "click") {
  if (googleAppsInitialized) return Promise.resolve()
  if (!googleAppsInitPromise) {
    googleAppsInitPromise = import("../components/googleApps.js")
      .then(({ initGoogleApps }) => {
        initGoogleApps()
        googleAppsInitialized = true
        window.dispatchEvent(
          new CustomEvent("startpage:googleAppsReady", { detail: { reason } }),
        )
      })
      .catch((error) => {
        googleAppsInitPromise = null
        console.error("Could not initialize Google Apps:", error)
      })
  }
  return googleAppsInitPromise
}

// ── Command Palette ──────────────────────────────────────────────────────────
let commandPaletteInitPromise = null
let commandPaletteInitialized = false
let commandPaletteController = null
let commandPaletteOpenOnReady = false

export function isCommandPaletteInitialized() {
  return commandPaletteInitialized
}

export function ensureCommandPaletteInitialized(reason = "idle", options = {}) {
  if (options.openOnInit) commandPaletteOpenOnReady = true
  if (commandPaletteInitialized) {
    if (options.openOnInit) commandPaletteController?.show?.()
    return Promise.resolve()
  }
  if (!commandPaletteInitPromise) {
    commandPaletteInitPromise = import("../components/commandPalette.js")
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

/**
 * Wire up all lazy-init event listeners (settings toggle, Google Apps btn,
 * keyboard shortcuts). Call once during bootstrap.
 */
export function setupLazyInitTriggers() {
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
      document.body.classList.add("sidebar-open")
      document.getElementById("g-apps-dropdown")?.classList.remove("show")
    },
    { capture: true },
  )

  googleAppsBtn?.addEventListener(
    "pointerenter",
    () => {
      void ensureGoogleAppsInitialized("hover")
    },
    { once: true, passive: true },
  )

  googleAppsBtn?.addEventListener(
    "touchstart",
    () => {
      void ensureGoogleAppsInitialized("touch")
    },
    { once: true, passive: true },
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

  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(
      () => {
        void ensureGoogleAppsInitialized("idle")
      },
      { timeout: 2500 },
    )
  } else {
    setTimeout(() => {
      void ensureGoogleAppsInitialized("idle")
    }, 1200)
  }

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
}
