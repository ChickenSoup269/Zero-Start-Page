/**
 * settingsSpotlight.js
 * Visual target identification engine for Settings.
 * Highlights the corresponding UI element on the main screen when hovering or interacting with settings.
 */

const TARGET_MAP = {
  // Clock & Date
  "date-clock": "#clock-date-wrap",
  "clock-date-wrap": "#clock-date-wrap",
  "clock-container": "#clock-date-wrap",
  "free-move-clock-checkbox": "#clock-date-wrap",
  "short-weekday-checkbox": "#clock-date-wrap",
  "hide-seconds-checkbox": "#clock-date-wrap",
  "show-lunar-calendar-checkbox-clock": "#clock-date-wrap",
  "clock-lunar-mode-select": "#clock-date-wrap",
  "clock-display-select": "#clock-date-wrap",
  "date-format-grid": "#clock-date-wrap",
  "clock-style-grid": "#clock-date-wrap",
  "clock-style-setting-group": "#clock-date-wrap",
  "clock-font-family": "#clock-date-wrap",
  "clock-font-size-slider": "#clock-date-wrap",
  "clock-font-weight-select": "#clock-date-wrap",
  "clock-color-picker": "#clock-date-wrap",
  "time-format": "#clock-date-wrap",
  "clock-align": "#clock-date-wrap",
  "analog-clock-theme": "#clock-date-wrap",
  "clock-shadow-checkbox": "#clock-date-wrap",
  "clock-blur-slider": "#clock-date-wrap",

  // Search Bar
  "search-settings": "#search-container",
  "show-search-bar-checkbox": "#search-container",
  "free-move-search-bar-checkbox": "#search-container",
  "search-bar-width-slider": "#search-container",
  "search-bar-blur-slider": "#search-container",
  "search-bar-radius-slider": "#search-container",
  "search-engine-select": "#search-container",
  "show-search-ai-icon-checkbox": "#search-container",
  "search-bg-color-picker": "#search-container",
  "search-text-color-picker": "#search-container",
  "search-border-color-picker": "#search-container",

  // Bookmarks
  "bookmark-custom": "#bookmarks-container",
  "show-bookmarks-checkbox": "#bookmarks-container",
  "bookmark-layout": "#bookmarks-container",
  "bookmark-layout-bg-style": "#bookmarks-container",
  "bookmark-layout-bg-style-row": "#bookmarks-container",
  "bookmark-layout-bg-color": "#bookmarks-container",
  "bookmark-layout-bg-color-row": "#bookmarks-container",
  "bookmark-group-tabs": ".bookmark-groups-container",
  "show-bookmark-groups-checkbox": ".bookmark-groups-container",
  "bookmark-group-use-accent": ".bookmark-groups-container",
  "bookmark-group-auto-contrast": ".bookmark-groups-container",
  "bookmark-icon-size-slider": "#bookmarks-container",
  "bookmark-font-size-slider": "#bookmarks-container",
  "bookmark-item-style": "#bookmarks-container",
  "bookmark-item-style-row": "#bookmarks-container",
  "hide-bookmark-text-checkbox": "#bookmarks-container",
  "hide-bookmark-bg": "#bookmarks-container",
  "hide-bookmark-bg-checkbox": "#bookmarks-container",
  "bookmark-long-text": "#bookmarks-container",
  "bookmark-full-text": "#bookmarks-container",
  "bookmark-macos-hover": "#bookmarks-container",
  "bookmark-limit-20": "#bookmarks-container",
  "show-add-bookmark-button": "#bookmarks-container",
  "enable-bookmark-drag": "#bookmarks-container",
  "bookmark-keep-nested-folders": "#bookmarks-container",
  "bookmark-open-new-tab": "#bookmarks-container",
  "bookmark-sidebar-width-input": "#bookmarks-container",

  // Custom Title
  "custom-title": "#custom-title-display",
  "show-custom-title-checkbox": "#custom-title-display",
  "free-move-custom-title-checkbox": "#custom-title-display",
  "custom-title-input": "#custom-title-display",
  "custom-title-font-family": "#custom-title-display",
  "custom-title-font-size": "#custom-title-display",
  "custom-title-color": "#custom-title-display",
  "custom-title-align": "#custom-title-display",
  "custom-title-text": "#custom-title-display",
  "custom-title-direction": "#custom-title-display",
  "custom-title-order": "#custom-title-display",
  "custom-title-word-wrap": "#custom-title-display",
  "custom-title-animation": "#custom-title-display",
  "custom-title-animation-loop": "#custom-title-display",
  "custom-title-multicolor": "#custom-title-display",
  "custom-title-shadow-color": "#custom-title-display",
  "custom-title-shadow-blur": "#custom-title-display",
  "custom-title-shadow-y": "#custom-title-display",
  "custom-title-border-color": "#custom-title-display",
  "custom-title-border-size": "#custom-title-display",
  "custom-title-line-spacing": "#custom-title-display",

  // Quick Access
  "quick-access": "#quick-access-bar",
  "show-quick-access-bg-checkbox": "#quick-access-bar",
  "quick-access-horizontal-checkbox": "#quick-access-bar",
  "quick-access-border-visible-checkbox": "#quick-access-bar",
  "quick-access-skin-select": "#quick-access-bar",
  "quick-access-button-radius-select": "#quick-access-bar",
  "quick-access-bar-radius-select": "#quick-access-bar",
  "quick-access-toggle-radius-select": "#settings-toggle",

  // Widgets & Individual Options
  "weather-settings": "#weather-container",
  "show-weather-checkbox": "#weather-container",
  "weather-unit-select": "#weather-container",
  "weather-api-mode-select": "#weather-container",
  "weather-container": "#weather-container",

  "music-settings": "#music-player-container",
  "show-music-checkbox": "#music-player-container",
  "music-player-container": "#music-player-container",

  "todo-settings": "#todo-container",
  "show-todo-checkbox": "#todo-container",
  "todo-show-checkboxes": "#todo-container",
  "todo-container": "#todo-container",

  "notepad-settings": "#notepad-container",
  "show-notepad-checkbox": "#notepad-container",
  "notepad-container": "#notepad-container",

  "quotes-settings": "#daily-quotes",
  "show-quotes-checkbox": "#daily-quotes",
  "daily-quotes": "#daily-quotes",

  "calendar-settings": "#full-calendar-container",
  "show-calendar-checkbox": "#full-calendar-container",
  "full-calendar-container": "#full-calendar-container",

  "show-habits-checkbox": "#habit-tracker-container",
  "habit-color-mode-select": "#habit-tracker-container",
  "habit-tracker-container": "#habit-tracker-container",

  "show-timer-checkbox": "#timer-component",
  "hide-timer-alarm-dropdown-checkbox": "#timer-component",
  "timer-alarm-sound-select": "#timer-component",
  "timer-component": "#timer-component",

  "show-rss-checkbox": "#rss-container",
  "rss-container": "#rss-container",

  "show-ambient-checkbox": "#ambient-sounds-container",
  "ambient-sounds-container": "#ambient-sounds-container",

  "show-ai-assistant-checkbox": "#ai-assistant-container",
  "ai-assistant-container": "#ai-assistant-container",

  "calculator-settings": "#calculator-container",
  "calculator-container": "#calculator-container",
}

let activeSpotlightElement = null
let spotlightTimeout = null

/**
 * Normalizes widget elements to their main root container (e.g. clock and search)
 * so that hovering over different granular sub-settings maintains a stable, continuous spotlight
 * without constantly jumping between child/parent nodes or restarting animations.
 */
function canonicalizeWidget(el) {
  if (!el) return null
  // Clock widget hierarchy -> always focus on the main wrapper
  if (
    el.id === "clock" ||
    el.id === "date" ||
    el.id === "lunar-date" ||
    el.id === "clock-fade-wrap" ||
    el.id === "date-fade-wrap" ||
    el.closest?.("#clock-date-wrap")
  ) {
    return document.getElementById("clock-date-wrap") || el
  }
  // Search widget hierarchy -> always focus on the search container
  if (
    el.id === "search-engine-selector" ||
    el.id === "selected-engine" ||
    el.id === "engine-dropdown" ||
    el.id === "search-ai-btn" ||
    el.id === "search-input" ||
    el.id === "search-camera-btn" ||
    el.id === "search-lens-btn" ||
    el.closest?.("#search-container")
  ) {
    return document.getElementById("search-container") || el
  }
  // Bookmarks hierarchy -> always focus on bookmarks container
  if (el.closest?.("#bookmarks-container")) {
    return document.getElementById("bookmarks-container") || el
  }
  return el
}

/**
 * Resolves the target DOM element on the main screen for a given setting container
 */
function resolveTargetElement(settingEl) {
  if (!settingEl) return null

  let resolved = null

  // 1. Direct data-target-selector attribute
  const directSelector =
    settingEl.getAttribute("data-target-selector") ||
    settingEl.querySelector("[data-target-selector]")?.getAttribute("data-target-selector")
  if (directSelector) {
    resolved = document.querySelector(directSelector)
  }

  // 2. ID / Name mapping
  if (!resolved) {
    const inputEl = settingEl.querySelector("input, select, textarea, button[id]")
    const targetId = settingEl.id || inputEl?.id || settingEl.dataset?.groupId
    if (targetId && TARGET_MAP[targetId]) {
      resolved = document.querySelector(TARGET_MAP[targetId])
    }
  }

  // 3. Parent section mapping
  if (!resolved) {
    const parentSection = settingEl.closest(".settings-section")
    const sectionId = parentSection?.dataset?.sectionId
    if (sectionId && TARGET_MAP[sectionId]) {
      resolved = document.querySelector(TARGET_MAP[sectionId])
    }
  }

  // 4. Tab name mapping
  if (!resolved) {
    const parentSection = settingEl.closest(".settings-section")
    const tabName = parentSection?.dataset?.settingsTab
    if (tabName === "clock") {
      resolved = document.getElementById("clock-date-wrap") || document.getElementById("clock")
    } else if (tabName === "search") {
      resolved = document.getElementById("search-container")
    } else if (tabName === "bookmarks") {
      resolved = document.getElementById("bookmarks-container") || document.querySelector(".bookmark-container") || document.getElementById("bookmarks")
    } else if (tabName === "custom-title") {
      resolved = document.getElementById("custom-title-display") || document.getElementById("custom-title-text")
    } else if (tabName === "quick-access") {
      resolved = document.getElementById("quick-access-bar") || document.querySelector(".side-controls")
    }
  }

  const canonical = canonicalizeWidget(resolved)
  return ensureVisibleTarget(canonical)
}

function ensureVisibleTarget(el) {
  if (!el || !document.body.contains(el)) return null
  let current = el
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current)
    if (style.display === "none" || style.visibility === "hidden" || (current.offsetWidth === 0 && current.offsetHeight === 0)) {
      return null
    }
    current = current.parentElement
  }
  return el
}

/**
 * Highlights a target DOM element with glowing spotlight
 */
export function highlightTarget(targetEl, { autoClearMs = 0 } = {}) {
  const canonicalTarget = canonicalizeWidget(targetEl)

  if (spotlightTimeout) {
    clearTimeout(spotlightTimeout)
    spotlightTimeout = null
  }

  if (!canonicalTarget || !document.body.contains(canonicalTarget)) {
    clearTargetHighlight()
    return
  }

  // Already highlighting this exact element - keep it active without re-triggering or resetting
  if (activeSpotlightElement === canonicalTarget) {
    canonicalTarget.classList.remove("setting-target-spotlight-fadeout")
    return
  }

  // Switching from another target element - fade out the previous one smoothly
  if (activeSpotlightElement && activeSpotlightElement !== canonicalTarget) {
    const prev = activeSpotlightElement
    prev.classList.remove("setting-target-spotlight-active")
    prev.classList.add("setting-target-spotlight-fadeout")
    setTimeout(() => {
      prev.classList.remove("setting-target-spotlight-fadeout")
    }, 280)
  }

  activeSpotlightElement = canonicalTarget
  canonicalTarget.classList.remove("setting-target-spotlight-fadeout")
  canonicalTarget.classList.add("setting-target-spotlight-active")

  if (autoClearMs > 0) {
    spotlightTimeout = setTimeout(() => {
      clearTargetHighlight()
    }, autoClearMs)
  }
}

/**
 * Clears any active target spotlight with a smooth fade-out
 */
export function clearTargetHighlight() {
  if (spotlightTimeout) {
    clearTimeout(spotlightTimeout)
    spotlightTimeout = null
  }
  if (activeSpotlightElement) {
    const el = activeSpotlightElement
    activeSpotlightElement = null
    el.classList.remove("setting-target-spotlight-active")
    el.classList.add("setting-target-spotlight-fadeout")
    setTimeout(() => {
      el.classList.remove("setting-target-spotlight-fadeout")
    }, 280)
  }
}

/**
 * Initializes hover & focus listener inside the settings sidebar
 */
export function initSettingsSpotlight(sidebarEl) {
  const container = sidebarEl || document.getElementById("settings-sidebar")
  if (!container) return

  let hoverDebounce = null
  let clearDebounce = null

  // 1. Mouseover (bubbles from child setting items)
  container.addEventListener(
    "mouseover",
    (e) => {
      const settingItem = e.target.closest(
        ".setting-item, .setting-item-row, .clock-style-card, .style-preset-btn, .setting-group, .settings-section",
      )
      if (!settingItem) return

      // Cancel any pending unhover clear when entering a setting item
      if (clearDebounce) {
        clearTimeout(clearDebounce)
        clearDebounce = null
      }

      if (hoverDebounce) clearTimeout(hoverDebounce)
      hoverDebounce = setTimeout(() => {
        const target = resolveTargetElement(settingItem)
        if (target) {
          highlightTarget(target)
        }
      }, 50)
    },
    { passive: true },
  )

  // 2. Mouseout (debounced clear when leaving setting items to avoid jitter between rows)
  container.addEventListener(
    "mouseout",
    (e) => {
      const settingItem = e.target.closest(
        ".setting-item, .setting-item-row, .clock-style-card, .style-preset-btn, .setting-group, .settings-section",
      )
      if (!settingItem) return

      // If moving within the same setting item, don't clear
      if (e.relatedTarget && settingItem.contains(e.relatedTarget)) return

      if (hoverDebounce) {
        clearTimeout(hoverDebounce)
        hoverDebounce = null
      }

      // Debounce clearing to prevent flicker when cursor transitions between adjacent rows
      if (clearDebounce) clearTimeout(clearDebounce)
      clearDebounce = setTimeout(() => {
        clearTargetHighlight()
        clearDebounce = null
      }, 300)
    },
    { passive: true },
  )

  // 3. Focusin / Focusout (keyboard accessibility)
  container.addEventListener(
    "focusin",
    (e) => {
      const settingItem = e.target.closest(".setting-item, .setting-item-row, .setting-group, .settings-section")
      if (settingItem) {
        if (clearDebounce) {
          clearTimeout(clearDebounce)
          clearDebounce = null
        }
        const target = resolveTargetElement(settingItem)
        if (target) highlightTarget(target)
      }
    },
    { passive: true },
  )

  container.addEventListener(
    "focusout",
    () => {
      if (clearDebounce) clearTimeout(clearDebounce)
      clearDebounce = setTimeout(() => {
        clearTargetHighlight()
        clearDebounce = null
      }, 100)
    },
    { passive: true },
  )

  // 4. Clear highlight when mouse leaves settings sidebar entirely
  container.addEventListener("mouseleave", () => {
    if (hoverDebounce) {
      clearTimeout(hoverDebounce)
      hoverDebounce = null
    }
    if (clearDebounce) {
      clearTimeout(clearDebounce)
      clearDebounce = null
    }
    clearTargetHighlight()
  })

  // 5. Clear highlight when sidebar closes
  const observer = new MutationObserver(() => {
    if (!document.body.classList.contains("sidebar-open")) {
      clearTargetHighlight()
    }
  })
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] })
}
