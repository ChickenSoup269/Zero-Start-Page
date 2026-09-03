/**
 * settingsSpotlight.js
 * Visual target identification engine for Settings.
 * Highlights the corresponding UI element on the main screen when hovering or interacting with settings.
 */

const TARGET_MAP = {
  // Clock & Date
  "date-clock": "#clock-date-wrap",
  "clock-date-wrap": "#clock-date-wrap",
  "clock-container": "#clock",
  "free-move-clock-checkbox": "#clock-date-wrap",
  "short-weekday-checkbox": "#date",
  "hide-seconds-checkbox": "#clock",
  "show-lunar-calendar-checkbox-clock": "#lunar-date",
  "clock-lunar-mode-select": "#lunar-date",
  "clock-display-select": "#clock-date-wrap",
  "date-format-grid": "#date",
  "clock-style-grid": "#clock",
  "clock-style-setting-group": "#clock-date-wrap",
  "clock-font-family": "#clock",
  "clock-font-size-slider": "#clock",
  "clock-font-weight-select": "#clock",
  "clock-color-picker": "#clock",
  "time-format": "#clock",
  "clock-align": "#clock-date-wrap",
  "analog-clock-theme": "#clock",
  "clock-shadow-checkbox": "#clock",
  "clock-blur-slider": "#clock",

  // Search Bar
  "search-settings": "#search-container",
  "show-search-bar-checkbox": "#search-container",
  "free-move-search-bar-checkbox": "#search-container",
  "search-bar-width-slider": "#search-container",
  "search-bar-blur-slider": "#search-container",
  "search-bar-radius-slider": "#search-container",
  "search-engine-select": "#search-engine-selector",
  "show-search-ai-icon-checkbox": "#search-ai-btn",
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
 * Resolves the target DOM element on the main screen for a given setting container
 */
function resolveTargetElement(settingEl) {
  if (!settingEl) return null

  // 1. Direct data-target-selector attribute
  const directSelector =
    settingEl.getAttribute("data-target-selector") ||
    settingEl.querySelector("[data-target-selector]")?.getAttribute("data-target-selector")
  if (directSelector) {
    const el = document.querySelector(directSelector)
    if (el) return ensureVisibleTarget(el)
  }

  // 2. ID / Name mapping
  const inputEl = settingEl.querySelector("input, select, textarea, button[id]")
  const targetId = settingEl.id || inputEl?.id || settingEl.dataset?.groupId
  if (targetId && TARGET_MAP[targetId]) {
    const el = document.querySelector(TARGET_MAP[targetId])
    if (el) return ensureVisibleTarget(el)
  }

  // 3. Parent section mapping
  const parentSection = settingEl.closest(".settings-section")
  const sectionId = parentSection?.dataset?.sectionId
  if (sectionId && TARGET_MAP[sectionId]) {
    const el = document.querySelector(TARGET_MAP[sectionId])
    if (el) return ensureVisibleTarget(el)
  }

  // 4. Tab name mapping
  const tabName = parentSection?.dataset?.settingsTab
  let target = null
  if (tabName === "clock") {
    target = document.getElementById("clock-date-wrap") || document.getElementById("clock")
  } else if (tabName === "search") {
    target = document.getElementById("search-container")
  } else if (tabName === "bookmarks") {
    target = document.getElementById("bookmarks-container") || document.querySelector(".bookmark-container") || document.getElementById("bookmarks")
  } else if (tabName === "custom-title") {
    target = document.getElementById("custom-title-display") || document.getElementById("custom-title-text")
  } else if (tabName === "quick-access") {
    target = document.getElementById("quick-access-bar") || document.querySelector(".side-controls")
  }

  return ensureVisibleTarget(target)
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
  if (spotlightTimeout) {
    clearTimeout(spotlightTimeout)
    spotlightTimeout = null
  }

  if (!targetEl || !document.body.contains(targetEl)) {
    clearTargetHighlight()
    return
  }

  // Already highlighting this exact element - keep it active without re-triggering
  if (activeSpotlightElement === targetEl) {
    targetEl.classList.remove("setting-target-spotlight-fadeout")
    return
  }

  // Switching from another target element - fade out the previous one smoothly
  if (activeSpotlightElement && activeSpotlightElement !== targetEl) {
    const prev = activeSpotlightElement
    prev.classList.remove("setting-target-spotlight-active")
    prev.classList.add("setting-target-spotlight-fadeout")
    setTimeout(() => {
      prev.classList.remove("setting-target-spotlight-fadeout")
    }, 280)
  }

  activeSpotlightElement = targetEl
  targetEl.classList.remove("setting-target-spotlight-fadeout")
  targetEl.classList.add("setting-target-spotlight-active")

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
      }, 100)
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
