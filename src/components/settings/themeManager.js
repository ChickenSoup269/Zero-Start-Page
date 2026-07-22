import {
  updateAllSettings,
  saveSettings,
  getSettings,
  defaultSettings,
  updateSetting,
} from "../../services/state.js"
import { showAlert, showConfirm } from "../../utils/dialog.js"
import { showToast } from "../../utils/toast.js"
import { renderBookmarks } from "../bookmarks.js"
import { geti18n } from "../../services/i18n.js"

export const INTERFACE_STYLE_KEYS = [
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
  "bookmarkGroupTextWidth",
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
]

const THEMES = {
  default: {
    accentColor: "#00ff73",
    sidebarBg: "rgba(20, 20, 25, 0.85)",
    panelBg: "rgba(26, 46, 31, 0.7)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.08)",
    glassEdge: "rgba(255, 255, 255, 0.2)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#ffffff",
    dateColor: "#ffffff",
  },
  christmas: {
    accentColor: "#00d4ff",
    sidebarBg: "rgba(5, 15, 25, 0.9)",
    panelBg: "rgba(10, 25, 45, 0.75)",
    glassBg: "rgba(0, 212, 255, 0.05)",
    glassBorder: "rgba(0, 212, 255, 0.15)",
    glassEdge: "rgba(0, 212, 255, 0.2)",
    effect: "snowfallHD",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "glow",
    clockColor: "#ffffff",
    dateColor: "#e0f7fa",
  },
  cyberpunk: {
    accentColor: "#ffff00",
    sidebarBg: "rgba(10, 10, 0, 0.95)",
    panelBg: "rgba(20, 20, 0, 0.8)",
    glassBg: "rgba(255, 255, 0, 0.03)",
    glassBorder: "rgba(255, 255, 0, 0.15)",
    glassEdge: "rgba(255, 255, 0, 0.25)",
    effect: "hacker",
    hackerColor: "#ffff00",
    hueTextMode: "off",
    font: "'GohuFont', monospace",
    clockFont: "'SAIBA-45', sans-serif",
    clockFontTarget: "weekday",
    dateClockStyle: "cool",
    clockColor: "#ffffff",
    dateColor: "#ffffff",
  },
  ocean: {
    accentColor: "#00d4ff",
    sidebarBg: "rgba(5, 15, 25, 0.9)",
    panelBg: "rgba(10, 25, 45, 0.75)",
    glassBg: "rgba(0, 212, 255, 0.05)",
    glassBorder: "rgba(0, 212, 255, 0.15)",
    glassEdge: "rgba(0, 212, 255, 0.2)",
    effect: "oceanWave",
    oceanWaveColor: "#ffffff",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "sidestyle",
    sidestyleAlign: "center",
    clockColor: "#ffffff",
    dateColor: "#e0f7fa",
  },
  sakura: {
    accentColor: "#ffb7c5",
    sidebarBg: "rgba(30, 20, 25, 0.85)",
    panelBg: "rgba(45, 30, 35, 0.7)",
    glassBg: "rgba(255, 183, 197, 0.08)",
    glassBorder: "rgba(255, 183, 197, 0.2)",
    glassEdge: "rgba(255, 183, 197, 0.3)",
    effect: "sakura",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Electroharmonix', sans-serif",
    clockFontTarget: "weekday",
    dateClockStyle: "jp-style",
    clockColor: "#ffffff",
    dateColor: "#ffebf0",
  },
  space: {
    accentColor: "#ffffff",
    sidebarBg: "rgba(10, 10, 20, 0.95)",
    panelBg: "rgba(20, 20, 40, 0.8)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.15)",
    glassEdge: "rgba(255, 255, 255, 0.25)",
    effect: "meteor",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Anurati', sans-serif",
    clockFontTarget: "weekday",
    dateClockStyle: "sidestyle",
    sidestyleAlign: "center",
    clockColor: "#ffffff",
    dateColor: "#ffffff",
  },
  bubbles: {
    accentColor: "#ffffff",
    sidebarBg: "rgba(20, 25, 30, 0.85)",
    panelBg: "rgba(30, 35, 45, 0.7)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.15)",
    glassEdge: "rgba(255, 255, 255, 0.25)",
    effect: "bubbles",
    bubbleColor: "#ffffff",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "glow",
    clockColor: "#ffffff",
    dateColor: "#ffffff",
  },
  rainbow: {
    accentColor: "#ff00ff",
    sidebarBg: "rgba(15, 10, 20, 0.9)",
    panelBg: "rgba(25, 15, 30, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.15)",
    glassEdge: "rgba(255, 255, 255, 0.25)",
    effect: "rainbow",
    hueTextMode: "both",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "glow",
    clockColor: "#ffffff",
    dateColor: "#ffffff",
  },
  monochrome: {
    accentColor: "#ffffff",
    sidebarBg: "rgba(0, 0, 0, 0.95)",
    panelBg: "rgba(10, 10, 10, 0.85)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "lightPillars",
    lightPillarsColor: "#ffffff",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "analog",
    analogMarkerMode: "full",
    clockColor: "#ffffff",
    dateColor: "#ffffff",
  },
  nature: {
    accentColor: "#ccff00",
    sidebarBg: "rgba(20, 30, 20, 0.85)",
    panelBg: "rgba(25, 40, 25, 0.7)",
    glassBg: "rgba(204, 255, 0, 0.05)",
    glassBorder: "rgba(204, 255, 0, 0.15)",
    glassEdge: "rgba(204, 255, 0, 0.25)",
    effect: "plantGrowth",
    plantGrowthColor: "#ccff00",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Anurati', sans-serif",
    dateClockStyle: "sidebar",
    clockColor: "#ffffff",
    dateColor: "#ccff00",
  },
  aurora: {
    accentColor: "#ccff00",
    sidebarBg: "rgba(10, 20, 15, 0.9)",
    panelBg: "rgba(15, 30, 25, 0.75)",
    glassBg: "rgba(204, 255, 0, 0.03)",
    glassBorder: "rgba(204, 255, 0, 0.12)",
    glassEdge: "rgba(204, 255, 0, 0.2)",
    effect: "northernLights",
    northernLightsColor: "#ccff00",
    northernLightsStyle: "hd",
    northernLightsBrightness: 0.9,
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "round",
    clockColor: "#ffffff",
    dateColor: "#ffffff",
  },
  arctic: {
    accentColor: "#ffffff",
    sidebarBg: "rgba(10, 10, 15, 0.9)",
    panelBg: "rgba(255, 255, 255, 0.85)",
    glassBg: "rgba(255, 255, 255, 0.15)",
    glassBorder: "rgba(255, 255, 255, 0.3)",
    glassEdge: "rgba(255, 255, 255, 0.4)",
    effect: "galaxy",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "fliqlo",
    fliqloTheme: "dark",
    clockColor: "#ffffff",
    dateColor: "#ffffff",
    contextMenuStyle: "light",
  },
  catppuccin: {
    accentColor: "#cba6f7",
    sidebarBg: "rgba(24, 24, 37, 0.85)",
    panelBg: "rgba(30, 30, 46, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#cdd6f4",
    dateColor: "#bac2de",
  },
  nord: {
    accentColor: "#88c0d0",
    sidebarBg: "rgba(46, 52, 64, 0.85)",
    panelBg: "rgba(59, 66, 82, 0.75)",
    glassBg: "rgba(216, 222, 233, 0.05)",
    glassBorder: "rgba(216, 222, 233, 0.1)",
    glassEdge: "rgba(216, 222, 233, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#eceff4",
    dateColor: "#e5e9f0",
  },
  night_owl: {
    accentColor: "#82aaff",
    sidebarBg: "rgba(1, 22, 39, 0.85)",
    panelBg: "rgba(1, 22, 39, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#d6deeb",
    dateColor: "#d6deeb",
  },
  monokai: {
    accentColor: "#a6e22e",
    sidebarBg: "rgba(39, 40, 34, 0.85)",
    panelBg: "rgba(45, 46, 39, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#f8f8f2",
    dateColor: "#f8f8f2",
  },
  tokyo_night: {
    accentColor: "#7aa2f7",
    sidebarBg: "rgba(22, 22, 30, 0.85)",
    panelBg: "rgba(26, 27, 38, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#c0caf5",
    dateColor: "#a9b1d6",
  },
  one_dark: {
    accentColor: "#61afef",
    sidebarBg: "rgba(33, 37, 43, 0.85)",
    panelBg: "rgba(40, 44, 52, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#abb2bf",
    dateColor: "#abb2bf",
  },
  darcula: {
    accentColor: "#cc7832",
    sidebarBg: "rgba(43, 43, 43, 0.85)",
    panelBg: "rgba(60, 63, 65, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#a9b7c6",
    dateColor: "#a9b7c6",
  },
  winter_is_coming: {
    accentColor: "#569cd6",
    sidebarBg: "rgba(1, 22, 39, 0.85)",
    panelBg: "rgba(1, 22, 39, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#d6deeb",
    dateColor: "#d6deeb",
  },
  github_dark: {
    accentColor: "#58a6ff",
    sidebarBg: "rgba(13, 17, 23, 0.85)",
    panelBg: "rgba(22, 27, 34, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#c9d1d9",
    dateColor: "#c9d1d9",
  },
  dracula: {
    accentColor: "#bd93f9",
    sidebarBg: "rgba(40, 42, 54, 0.85)",
    panelBg: "rgba(68, 71, 90, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#f8f8f2",
    dateColor: "#6272a4",
  },
  ayu_dark: {
    accentColor: "#ffb454",
    sidebarBg: "rgba(10, 14, 20, 0.85)",
    panelBg: "rgba(15, 20, 25, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#bfbdb6",
    dateColor: "#5c6773",
  },
  synthwave84: {
    accentColor: "#f92aad",
    sidebarBg: "rgba(38, 35, 53, 0.85)",
    panelBg: "rgba(43, 33, 58, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#ffffff",
    dateColor: "#848bbd",
  },
  gruvbox_dark: {
    accentColor: "#fe8019",
    sidebarBg: "rgba(40, 40, 40, 0.85)",
    panelBg: "rgba(60, 56, 54, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#ebdbb2",
    dateColor: "#928374",
  },
  palenight: {
    accentColor: "#c792ea",
    sidebarBg: "rgba(41, 45, 62, 0.85)",
    panelBg: "rgba(50, 55, 77, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#bfc7d5",
    dateColor: "#676e95",
  },
  cobalt2: {
    accentColor: "#ffc600",
    sidebarBg: "rgba(25, 53, 73, 0.85)",
    panelBg: "rgba(30, 60, 82, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#ffffff",
    dateColor: "#0088ff",
  },
  solarized_dark: {
    accentColor: "#268bd2",
    sidebarBg: "rgba(0, 43, 54, 0.85)",
    panelBg: "rgba(7, 54, 66, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    glassEdge: "rgba(255, 255, 255, 0.15)",
    effect: "none",
    hueTextMode: "off",
    font: "'Space Grotesk', sans-serif",
    clockFont: "'Space Grotesk', sans-serif",
    dateClockStyle: "default",
    clockColor: "#839496",
    dateColor: "#586e75",
  },
}

// List of settings that themes are allowed to modify.
export const THEMEABLE_KEYS = [
  "background",
  "activeBgUid",
  "unsplashLastCredit",
  "accentColor",
  "sidebarBg",
  "panelBg",
  "glassBg",
  "glassBorder",
  "glassEdge",
  "effect",
  "hueTextMode",
  "font",
  "clockFont",
  "clockFontTarget",
  "dateClockStyle",
  "clockColor",
  "dateColor",
  "analogMarkerMode",
  "sidestyleAlign",
  "hackerColor",
  "oceanWaveColor",
  "sakuraColor",
  "bubbleColor",
  "lightPillarsColor",
  "plantGrowthColor",
  "starColor",
  "meteorColor",
  "auraColor",
  "northernLightsColor",
  "pixelCubesColor",
  "snowfallColor",
  "sunbeamColor",
  "sunbeamMode",
  "rainHDColor",
  "musicBarsColor",
  "wavyLinesColor",
  "cloudDriftMood",
  "shinyColor",
  "lineShinyColor",
  "lineShinyMode",
  "nintendoPixelColor",
  "northernLightsStyle",
  "northernLightsBrightness",
  "fliqloTheme",
  "contextMenuStyle",
  "sidebarClockFlip",
  "analogBlurBackground",
]

// Variable to store user's manual settings before a theme was applied
let preThemeSnapshot = null

export function initThemeManager(
  DOM,
  handleSettingUpdate,
  updateSettingsInputs,
) {
  if (!DOM.themesGrid) return

  // Load and render user themes
  renderUserThemes(DOM, handleSettingUpdate, updateSettingsInputs)

  // Load and render user styles
  renderUserStyles(DOM, handleSettingUpdate, updateSettingsInputs)

  const themeItems = DOM.themesGrid.querySelectorAll(".theme-item")
  const currentTheme = getSettings().theme

  const updateActiveUI = (selectedTheme) => {
    // Refresh items as they might have changed after rendering user themes
    const allItems = DOM.themesGrid.querySelectorAll(".theme-item")
    allItems.forEach((item) => {
      if (item.dataset.theme === selectedTheme) {
        item.classList.add("active")
      } else {
        item.classList.remove("active")
      }
    })
  }

  // Set initial active UI based on saved theme setting
  if (currentTheme) {
    updateActiveUI(currentTheme)
  }

  // Use event delegation for themes grid to handle dynamic user themes
  DOM.themesGrid.addEventListener("click", (e) => {
    e.stopPropagation()
    const themeItem = e.target.closest(".theme-item")
    if (!themeItem) return

    // Handle delete button
    if (e.target.closest(".delete-theme-btn")) {
      const themeKey = themeItem.dataset.theme
      if (themeKey.startsWith("user-")) {
        deleteUserTheme(
          themeKey,
          DOM,
          handleSettingUpdate,
          updateSettingsInputs,
        )
      }
      return
    }

    const themeKey = themeItem.dataset.theme

    // If clicking the ALREADY active theme, treat it as "deselect" and restore original
    if (themeItem.classList.contains("active")) {
      updateActiveUI(null)
      updateSetting("theme", null)
      restoreUserOriginalSettings(updateSettingsInputs)
      return
    }

    let themeData = THEMES[themeKey]
    if (!themeData && themeKey.startsWith("user-")) {
      const userThemes = getSettings().userThemes || []
      const userTheme = userThemes.find((t) => t.id === themeKey)
      if (userTheme) themeData = userTheme.snapshot
    }

    if (themeData) {
      // Before applying the very first theme in a sequence, take a snapshot of current settings
      captureUserSnapshot()
      const prevThemeKey = getSettings().theme
      const prevSnapshot = preThemeSnapshot ? { ...preThemeSnapshot } : null

      updateActiveUI(themeKey)
      updateSetting("theme", themeKey)
      applyTheme(themeData, updateSettingsInputs)

      const themeName = themeItem.querySelector(".theme-name")?.textContent || themeKey
      showToast(`Đã áp dụng theme: ${themeName}`, {
        undoFn: () => {
          updateActiveUI(prevThemeKey || null)
          updateSetting("theme", prevThemeKey || null)
          if (prevSnapshot) {
            updateAllSettings(prevSnapshot)
            preThemeSnapshot = null
          } else {
            restoreUserOriginalSettings(updateSettingsInputs)
          }
          if (updateSettingsInputs) updateSettingsInputs()
          saveSettings(true)
          if (window.appApplySettings) window.appApplySettings()
        }
      })
    }
  })

  // Save current theme button
  if (DOM.saveCurrentThemeBtn) {
    DOM.saveCurrentThemeBtn.addEventListener("click", () => {
      if (DOM.saveThemeModal) DOM.saveThemeModal.classList.add("open")
    })
  }

  // Save current style button
  if (DOM.saveCurrentStyleBtn) {
    DOM.saveCurrentStyleBtn.addEventListener("click", () => {
      if (DOM.saveStyleModal) DOM.saveStyleModal.classList.add("open")
    })
  }

  // Icon selection in theme modal
  if (DOM.themeIconGrid) {
    const icons = DOM.themeIconGrid.querySelectorAll(".icon-option")
    icons.forEach((icon) => {
      icon.addEventListener("click", () => {
        icons.forEach((i) => i.classList.remove("active"))
        icon.classList.add("active")
      })
    })
  }

  // Icon selection in style modal
  if (DOM.styleIconGrid) {
    const icons = DOM.styleIconGrid.querySelectorAll(".icon-option")
    icons.forEach((icon) => {
      icon.addEventListener("click", () => {
        icons.forEach((i) => i.classList.remove("active"))
        icon.classList.add("active")
      })
    })
  }

  // Close theme modal
  if (DOM.closeSaveThemeModalBtn) {
    DOM.closeSaveThemeModalBtn.addEventListener("click", () => {
      if (DOM.saveThemeModal) DOM.saveThemeModal.classList.remove("open")
    })
  }

  // Close style modal
  if (DOM.closeSaveStyleModalBtn) {
    DOM.closeSaveStyleModalBtn.addEventListener("click", () => {
      if (DOM.saveStyleModal) DOM.saveStyleModal.classList.remove("open")
    })
  }

  // Confirm save theme logic
  const handleConfirmSave = () => {
    const name = DOM.customThemeNameInput.value.trim() || "My Theme"
    const activeIcon = DOM.themeIconGrid.querySelector(".icon-option.active")
    const icon = activeIcon ? activeIcon.dataset.icon : "fa-palette"

    const success = saveUserTheme(
      name,
      icon,
      DOM,
      handleSettingUpdate,
      updateSettingsInputs,
    )

    if (success) {
      if (DOM.saveThemeModal) DOM.saveThemeModal.classList.remove("open")
      DOM.customThemeNameInput.value = ""
    }
  }

  if (DOM.confirmSaveThemeBtn) {
    DOM.confirmSaveThemeBtn.addEventListener("click", handleConfirmSave)
  }

  // Confirm save style logic
  const handleConfirmSaveStyle = () => {
    try {
      if (!DOM.customStyleNameInput) {
        throw new Error("customStyleNameInput is not defined in DOM");
      }
      const name = DOM.customStyleNameInput.value.trim() || "My Style"

      let icon = "fa-bookmark";
      if (DOM.styleIconGrid) {
        const activeIcon = DOM.styleIconGrid.querySelector(".icon-option.active")
        if (activeIcon && activeIcon.dataset.icon) {
          icon = activeIcon.dataset.icon;
        }
      }

      const success = saveUserStyle(
        name,
        icon,
        DOM,
        handleSettingUpdate,
        updateSettingsInputs,
      )

      if (success) {
        if (DOM.saveStyleModal) DOM.saveStyleModal.classList.remove("open")
        DOM.customStyleNameInput.value = ""
      }
    } catch (err) {
      console.error("Error in handleConfirmSaveStyle:", err);
      showAlert("Lỗi khi lưu Style: " + err.message);
    }
  }

  if (DOM.confirmSaveStyleBtn) {
    DOM.confirmSaveStyleBtn.addEventListener("click", handleConfirmSaveStyle)
  }

  // Enter key support for theme name
  if (DOM.customThemeNameInput) {
    DOM.customThemeNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleConfirmSave()
      }
    })
  }

  // Enter key support for style name
  if (DOM.customStyleNameInput) {
    DOM.customStyleNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleConfirmSaveStyle()
      }
    })
  }

  // Click outside theme modal to close
  if (DOM.saveThemeModal) {
    DOM.saveThemeModal.addEventListener("click", (e) => {
      if (e.target === DOM.saveThemeModal) {
        DOM.saveThemeModal.classList.remove("open")
      }
    })
  }

  // Click outside style modal to close
  if (DOM.saveStyleModal) {
    DOM.saveStyleModal.addEventListener("click", (e) => {
      if (e.target === DOM.saveStyleModal) {
        DOM.saveStyleModal.classList.remove("open")
      }
    })
  }

  // Handle delete style button clicks (event delegation)
  if (DOM.stylePresetGrid) {
    DOM.stylePresetGrid.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest(".delete-style-btn")
      if (deleteBtn) {
        e.stopPropagation()
        e.preventDefault()
        const styleBtn = deleteBtn.closest(".style-preset-btn")
        if (styleBtn) {
          const styleId = styleBtn.dataset.stylePreset
          if (styleId && styleId.startsWith("user-style-")) {
            deleteUserStyle(
              styleId,
              DOM,
              handleSettingUpdate,
              updateSettingsInputs,
            )
          }
        }
      }
    })
  }
}

function renderUserThemes(DOM, handleSettingUpdate, updateSettingsInputs) {
  if (!DOM.themesGrid) return

  // Clear existing user themes (keep default themes)
  const existingUserThemes = DOM.themesGrid.querySelectorAll(
    ".theme-item[data-theme^='user-']",
  )
  existingUserThemes.forEach((el) => el.remove())

  const userThemes = getSettings().userThemes || []
  userThemes.forEach((theme) => {
    const item = document.createElement("div")
    item.className = "theme-item"
    item.dataset.theme = theme.id

    // Use a preview color from the snapshot if available
    const previewColor = theme.snapshot.accentColor || "#ffffff"

    item.innerHTML = `
            <div class="theme-preview">
                <div class="preview-sidebar"></div>
                <div class="preview-content"></div>
                <div class="preview-accent" style="color: ${previewColor};"></div>
                <i class="fa-solid ${theme.icon} preview-icon"></i>
            </div>
            <span class="theme-name">${theme.name}</span>
            <div class="active-indicator"><i class="fa-solid fa-check"></i></div>
            <button class="delete-theme-btn" title="Delete Theme"><i class="fa-solid fa-trash-can"></i></button>
        `

    DOM.themesGrid.appendChild(item)
  })
}

function saveUserTheme(
  name,
  icon,
  DOM,
  handleSettingUpdate,
  updateSettingsInputs,
) {
  const currentSettings = getSettings()
  const userThemes = currentSettings.userThemes || []

  // Check for duplicates
  const isDuplicate = userThemes.some(
    (t) => t.name.toLowerCase() === name.toLowerCase(),
  )
  if (isDuplicate) {
    showAlert(
      "A theme with this name already exists. Please choose a different name.",
    )
    return false
  }

  const snapshot = {}

  THEMEABLE_KEYS.forEach((key) => {
    if (currentSettings[key] !== undefined) {
      snapshot[key] = currentSettings[key]
    }
  })

  const newTheme = {
    id: "user-" + Date.now(),
    name: name,
    icon: icon,
    snapshot: snapshot,
  }

  userThemes.push(newTheme)
  updateSetting("userThemes", userThemes)
  saveSettings(true)

  renderUserThemes(DOM, handleSettingUpdate, updateSettingsInputs)

  // Show success toast
  const i18n = geti18n()
  const toastMsg = i18n.toast_saved_theme
    ? i18n.toast_saved_theme.replace("{name}", name)
    : `Đã lưu chủ đề: ${name}`
  showToast(toastMsg, { type: "success" })

  return true
}

async function deleteUserTheme(id, DOM, handleSettingUpdate, updateSettingsInputs) {
  const i18n = geti18n()
  const confirmed = await showConfirm(
    i18n.confirm_delete_theme || "Are you sure you want to delete this custom theme?",
  )
  if (!confirmed) return

  const currentSettings = getSettings()
  const userThemes = currentSettings.userThemes || []
  const deletedTheme = userThemes.find((t) => t.id === id)
  if (!deletedTheme) return

  const updatedThemes = userThemes.filter((t) => t.id !== id)
  updateSetting("userThemes", updatedThemes)

  // If the deleted theme was active, reset to default
  const prevActiveTheme = currentSettings.theme
  if (prevActiveTheme === id) {
    updateSetting("theme", null)
    restoreUserOriginalSettings(updateSettingsInputs)
  }

  saveSettings(true)
  renderUserThemes(DOM, handleSettingUpdate, updateSettingsInputs)

  // Show Toast with Undo
  const toastMsg = i18n.toast_deleted_theme
    ? i18n.toast_deleted_theme.replace("{name}", deletedTheme.name)
    : `Đã xóa chủ đề: ${deletedTheme.name}`

  showToast(toastMsg, {
    undoFn: () => {
      const currentThemes = getSettings().userThemes || []
      currentThemes.push(deletedTheme)
      updateSetting("userThemes", currentThemes)
      if (prevActiveTheme === id) {
        updateSetting("theme", id)
        applyTheme(deletedTheme.snapshot, updateSettingsInputs)
      }
      saveSettings(true)
      renderUserThemes(DOM, handleSettingUpdate, updateSettingsInputs)
    }
  })
}

function captureUserSnapshot() {
  if (preThemeSnapshot !== null) return

  const currentSettings = getSettings()
  preThemeSnapshot = {}

  THEMEABLE_KEYS.forEach((key) => {
    if (currentSettings[key] !== undefined) {
      preThemeSnapshot[key] = currentSettings[key]
    }
  })
}

function restoreUserOriginalSettings(updateSettingsInputs) {
  if (!preThemeSnapshot) return

  updateAllSettings(preThemeSnapshot)
  preThemeSnapshot = null // Clear so next theme click takes a fresh snapshot

  if (updateSettingsInputs) updateSettingsInputs()
  saveSettings(true)
  if (window.appApplySettings) window.appApplySettings()
}

function applyTheme(themeData, updateSettingsInputs) {
  const resetData = {}

  // Reset to user's original state (or default if not set) first
  // This ensures we don't overwrite custom effect colors not specified by the theme
  THEMEABLE_KEYS.forEach((key) => {
    if (preThemeSnapshot && preThemeSnapshot[key] !== undefined) {
      resetData[key] = preThemeSnapshot[key]
    } else if (defaultSettings[key] !== undefined) {
      resetData[key] = defaultSettings[key]
    }
  })

  const finalData = { ...resetData, ...themeData }
  updateAllSettings(finalData)

  if (updateSettingsInputs) updateSettingsInputs()
  saveSettings(true)
  if (window.appApplySettings) window.appApplySettings()
}

export function renderUserStyles(DOM, handleSettingUpdate, updateSettingsInputs) {
  if (!DOM.stylePresetGrid) return

  // Clear existing user styles (keep default styles)
  const existingUserStyles = DOM.stylePresetGrid.querySelectorAll(
    ".style-preset-btn[data-style-preset^='user-style-']",
  )
  existingUserStyles.forEach((el) => el.remove())

  const userStyles = getSettings().userStyles || []
  userStyles.forEach((style) => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "style-preset-btn"
    btn.dataset.stylePreset = style.id
    btn.style.position = "relative"

    btn.innerHTML = `
      <span class="style-preset-icon"><i class="fa-solid ${style.icon || 'fa-bookmark'}"></i></span>
      <span class="style-preset-name">${style.name}</span>
      <small data-i18n="style_preset_custom">Custom Preset</small>
      <span class="delete-style-btn" title="Delete Style" style="position: absolute; top: 6px; right: 8px; font-size: 0.8rem; opacity: 0.4; cursor: pointer; transition: opacity 0.2s; z-index: 2;">
        <i class="fa-solid fa-trash-can"></i>
      </span>
    `

    DOM.stylePresetGrid.appendChild(btn)
  })

  // Apply visual active status
  const currentPreset = getSettings().interfaceStylePreset
  DOM.stylePresetGrid.querySelectorAll(".style-preset-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.stylePreset === currentPreset)
  })
}

function saveUserStyle(
  name,
  icon,
  DOM,
  handleSettingUpdate,
  updateSettingsInputs,
) {
  try {
    const currentSettings = getSettings()
    
    if (!currentSettings.userStyles) {
      currentSettings.userStyles = [];
    }
    const userStyles = currentSettings.userStyles;

    // Check for duplicates
    const isDuplicate = userStyles.some(
      (s) => s.name.toLowerCase() === name.toLowerCase(),
    )
    if (isDuplicate) {
      showAlert(
        "A style preset with this name already exists. Please choose a different name.",
      )
      return false
    }

    const snapshot = {}
    INTERFACE_STYLE_KEYS.forEach((key) => {
      if (currentSettings[key] !== undefined) {
        snapshot[key] = currentSettings[key]
      }
    })

    const newStyle = {
      id: "user-style-" + Date.now(),
      name: name,
      icon: icon,
      snapshot: snapshot,
    }

    userStyles.push(newStyle)
    updateSetting("userStyles", userStyles)
    saveSettings(true)

    renderUserStyles(DOM, handleSettingUpdate, updateSettingsInputs)

    // Show success toast
    const i18n = geti18n()
    const toastMsg = i18n.toast_saved_style
      ? i18n.toast_saved_style.replace("{name}", name)
      : `Đã lưu style: ${name}`
    showToast(toastMsg, { type: "success" })

    return true
  } catch (err) {
    console.error("Exception inside saveUserStyle:", err);
    throw err;
  }
}

async function deleteUserStyle(id, DOM, handleSettingUpdate, updateSettingsInputs) {
  const i18n = geti18n()
  const confirmed = await showConfirm(
    i18n.confirm_delete_style || "Are you sure you want to delete this custom style?",
  )
  if (!confirmed) return

  const currentSettings = getSettings()
  const userStyles = currentSettings.userStyles || []
  const deletedStyle = userStyles.find((s) => s.id === id)
  if (!deletedStyle) return

  const updatedStyles = userStyles.filter((s) => s.id !== id)
  updateSetting("userStyles", updatedStyles)

  // If the deleted preset was active, reset to default (or "custom")
  const prevActivePreset = currentSettings.interfaceStylePreset
  if (prevActivePreset === id) {
    updateSetting("interfaceStylePreset", "custom")
  }

  saveSettings(true)
  renderUserStyles(DOM, handleSettingUpdate, updateSettingsInputs)

  // Show Toast with Undo
  const toastMsg = i18n.toast_deleted_style
    ? i18n.toast_deleted_style.replace("{name}", deletedStyle.name)
    : `Đã xóa style: ${deletedStyle.name}`

  showToast(toastMsg, {
    undoFn: () => {
      const currentStyles = getSettings().userStyles || []
      currentStyles.push(deletedStyle)
      updateSetting("userStyles", currentStyles)
      if (prevActivePreset === id) {
        updateSetting("interfaceStylePreset", id)
        const preset = deletedStyle.snapshot
        Object.entries(preset).forEach(([key, value]) => updateSetting(key, value))
        updateSettingsInputs()
        if (window.appApplySettings) window.appApplySettings()
        renderBookmarks()
      }
      saveSettings(true)
      renderUserStyles(DOM, handleSettingUpdate, updateSettingsInputs)
    }
  })
}
