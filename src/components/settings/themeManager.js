/**
 * Theme Manager
 * Handles predefined themes that set accent color, effects, and surface colors
 */

import { updateAllSettings, saveSettings } from "../../services/state.js"

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
    font: "'Outfit', sans-serif",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "default",
    clockColor: "#ffffff",
    dateColor: "#ffffff"
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
    font: "'Outfit', sans-serif",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "glow",
    clockColor: "#ffffff",
    dateColor: "#e0f7fa"
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
    dateClockStyle: "cool",
    clockColor: "#ffffff",
    dateColor: "#ffffff"
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
    font: "'Outfit', sans-serif",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "sidestyle",
    sidestyleAlign: "center",
    clockColor: "#ffffff",
    dateColor: "#e0f7fa"
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
    font: "'Outfit', sans-serif",
    clockFont: "'Electroharmonix', sans-serif",
    dateClockStyle: "jp-style",
    clockColor: "#ffffff",
    dateColor: "#ffebf0"
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
    font: "'Outfit', sans-serif",
    clockFont: "'Anurati', sans-serif",
    dateClockStyle: "sidestyle",
    sidestyleAlign: "center",
    clockColor: "#ffffff",
    dateColor: "#ffffff"
  },
  bubbles: {
    accentColor: "#ffffff",
    sidebarBg: "rgba(20, 25, 30, 0.85)",
    panelBg: "rgba(30, 35, 45, 0.7)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.15)",
    glassEdge: "rgba(255, 255, 255, 0.25)",
    effect: "bubbles",
    bubblesColor: "#ffffff",
    hueTextMode: "off",
    font: "'Outfit', sans-serif",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "glow",
    clockColor: "#ffffff",
    dateColor: "#ffffff"
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
    font: "'Outfit', sans-serif",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "glow",
    clockColor: "#ffffff",
    dateColor: "#ffffff"
  },
}

export function initThemeManager(DOM, handleSettingUpdate, updateSettingsInputs) {
  if (!DOM.themesGrid) return

  const themeItems = DOM.themesGrid.querySelectorAll(".theme-item")

  // Function to update active class in UI
  const updateActiveUI = (selectedTheme) => {
    themeItems.forEach((item) => {
      if (item.dataset.theme === selectedTheme) {
        item.classList.add("active")
      } else {
        item.classList.remove("active")
      }
    })
  }

  themeItems.forEach((item) => {
    item.addEventListener("click", () => {
      const themeKey = item.dataset.theme
      const themeData = THEMES[themeKey]

      if (themeData) {
        updateActiveUI(themeKey)
        applyTheme(themeData, handleSettingUpdate, updateSettingsInputs)
      }
    })
  })

  // Set initial active state based on current settings if possible
  // Note: This is tricky since themes are presets, not a single state.
  // We could try to match current accent color/effect to a theme key.
}

function applyTheme(themeData, handleSettingUpdate, updateSettingsInputs) {
  // Use updateAllSettings to batch update the state
  updateAllSettings(themeData)

  // Update UI inputs to reflect programmatic changes
  if (updateSettingsInputs) {
    updateSettingsInputs()
  }

  // Save settings
  saveSettings(true) // immediate save

  // Re-apply all settings to the page
  if (window.appApplySettings) {
    window.appApplySettings()
  }
}
