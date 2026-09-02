/**
 * settingsSpotlight.js
 * Visual target identification engine for Settings.
 * Highlights the corresponding UI element on the main screen when hovering or interacting with settings.
 */

const TARGET_MAP = {
  // Clock & Date
  "date-clock": "#clock",
  "free-move-clock-checkbox": "#clock",
  "short-weekday-checkbox": "#date",
  "hide-seconds-checkbox": "#time",
  "show-lunar-calendar-checkbox-clock": "#lunar-date",
  "clock-lunar-mode-select": "#lunar-date",
  "clock-display-select": "#clock",
  "date-format-grid": "#date",
  "clock-style-grid": "#clock",
  "clock-style-setting-group": "#clock",
  "clock-font-family": "#clock",
  "clock-font-size-slider": "#clock",
  "clock-font-weight-select": "#clock",
  "clock-color-picker": "#clock",
  "time-format": "#time",
  "clock-align": "#clock",
  "analog-clock-theme": "#clock",

  // Search Bar
  "search-settings": "#search-container",
  "show-search-bar-checkbox": "#search-container",
  "free-move-search-bar-checkbox": "#search-container",
  "search-bar-width-slider": "#search-container",
  "search-bar-blur-slider": "#search-container",
  "search-bar-radius-slider": "#search-container",
  "search-engine-select": "#search-engine-icon",
  "show-search-ai-icon-checkbox": "#search-ai-btn",

  // Bookmarks
  "bookmark-custom": "#bookmarks-container",
  "show-bookmarks-checkbox": "#bookmarks-container",
  "bookmark-layout": "#bookmarks-container",
  "bookmark-layout-bg-style": "#bookmarks-container",
  "bookmark-layout-bg-color": "#bookmarks-container",
  "bookmark-group-tabs": ".bookmark-groups-container",
  "show-bookmark-groups-checkbox": ".bookmark-groups-container",
  "bookmark-group-use-accent": ".bookmark-groups-container",
  "bookmark-group-auto-contrast": ".bookmark-groups-container",
  "bookmark-icon-size-slider": ".bookmark-grid",
  "bookmark-font-size-slider": ".bookmark-grid",
  "bookmark-item-style": ".bookmark-grid",
  "hide-bookmark-text-checkbox": ".bookmark-grid",
  "hide-bookmark-bg-checkbox": ".bookmark-grid",

  // Custom Title
  "custom-title": "#custom-title-text",
  "show-custom-title-checkbox": "#custom-title-text",
  "custom-title-input": "#custom-title-text",
  "custom-title-font-family": "#custom-title-text",
  "custom-title-font-size": "#custom-title-text",
  "custom-title-color": "#custom-title-text",
  "custom-title-align": "#custom-title-text",

  // Quick Access
  "quick-access": ".quick-access-bar",
  "show-quick-access-bg-checkbox": ".quick-access-bar",
  "quick-access-horizontal-checkbox": ".quick-access-bar",
  "quick-access-border-visible-checkbox": ".quick-access-bar",
  "quick-access-skin-select": ".quick-access-bar",
  "quick-access-button-radius-select": ".quick-access-bar",
  "quick-access-bar-radius-select": ".quick-access-bar",
  "quick-access-toggle-radius-select": "#settings-toggle",

  // Widgets
  "weather-settings": ".weather-widget",
  "music-settings": "#music-player",
  "todo-settings": "#todo-container",
  "notepad-settings": "#notepad-container",
  "quotes-settings": "#quote-container",
  "calendar-settings": "#gregorian-calendar",
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
  let target = null
  if (directSelector) {
    target = document.querySelector(directSelector)
  } else if (targetId && TARGET_MAP[targetId]) {
    target = document.querySelector(TARGET_MAP[targetId])
  } else if (sectionId && TARGET_MAP[sectionId]) {
    target = document.querySelector(TARGET_MAP[sectionId])
  } else if (tabName === "clock") {
    target = document.getElementById("clock") || document.getElementById("clock-container")
  } else if (tabName === "search") {
    target = document.getElementById("search-container")
  } else if (tabName === "bookmarks") {
    target = document.getElementById("bookmarks-container") || document.querySelector(".bookmark-container")
  } else if (tabName === "custom-title") {
    target = document.getElementById("custom-title-text")
  } else if (tabName === "quick-access") {
    target = document.querySelector(".quick-access-bar")
  }

  return ensureVisibleTarget(target)
}

function ensureVisibleTarget(el) {
  if (!el) return null
  let current = el
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current)
    if (style.display === "none" || style.visibility === "hidden" || (current.offsetWidth === 0 && current.offsetHeight === 0)) {
      current = current.parentElement
      continue
    }
    return current
  }
  return el
}

/**
 * Highlights a target DOM element with glowing spotlight
 */
export function highlightTarget(targetEl, { autoClearMs = 0 } = {}) {
  if (activeSpotlightElement && activeSpotlightElement !== targetEl) {
    activeSpotlightElement.classList.remove("setting-target-spotlight-active")
  }

  if (spotlightTimeout) {
    clearTimeout(spotlightTimeout)
    spotlightTimeout = null
  }

  if (!targetEl || !document.body.contains(targetEl)) {
    activeSpotlightElement = null
    return
  }

  activeSpotlightElement = targetEl
  targetEl.classList.add("setting-target-spotlight-active")

  if (autoClearMs > 0) {
    spotlightTimeout = setTimeout(() => {
      clearTargetHighlight()
    }, autoClearMs)
  }
}

/**
 * Clears any active target spotlight
 */
export function clearTargetHighlight() {
  if (spotlightTimeout) {
    clearTimeout(spotlightTimeout)
    spotlightTimeout = null
  }
  if (activeSpotlightElement) {
    activeSpotlightElement.classList.remove("setting-target-spotlight-active")
    activeSpotlightElement = null
  }
}

/**
 * Initializes hover listener and locate button triggers inside the settings container
 */
export function initSettingsSpotlight(sidebarEl) {
  const container = sidebarEl || document.getElementById("settings-sidebar")
  if (!container) return

  let hoverDebounce = null

  // Delegated mouseover / mouseout for instant, lightweight target highlighting
  container.addEventListener(
    "mouseenter",
    (e) => {
      const settingItem = e.target.closest(
        ".setting-item, .setting-item-row, .clock-style-card, .style-preset-btn, .setting-group-title, .section-toggle",
      )
      if (!settingItem) return

      if (hoverDebounce) clearTimeout(hoverDebounce)
      hoverDebounce = setTimeout(() => {
        const target = resolveTargetElement(settingItem)
        if (target) {
          highlightTarget(target)
        }
      }, 80)
    },
    { capture: true, passive: true },
  )

  container.addEventListener(
    "mouseleave",
    (e) => {
      const settingItem = e.target.closest(
        ".setting-item, .setting-item-row, .clock-style-card, .style-preset-btn, .setting-group-title, .section-toggle",
      )
      if (settingItem) {
        if (hoverDebounce) clearTimeout(hoverDebounce)
        clearTargetHighlight()
      }
    },
    { capture: true, passive: true },
  )

  // Clear highlight when mouse exits settings sidebar entirely
  container.addEventListener("mouseleave", () => {
    if (hoverDebounce) clearTimeout(hoverDebounce)
    clearTargetHighlight()
  })

  // Clear highlight when sidebar closes
  const observer = new MutationObserver(() => {
    if (!document.body.classList.contains("sidebar-open")) {
      clearTargetHighlight()
    }
  })
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] })
}
