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
    font: "'Outfit', sans-serif",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "default",
    clockColor: "#ffffff",
    dateColor: "#ffffff"
  },
  christmas: {
    accentColor: "#ff4d4d",
    sidebarBg: "rgba(30, 10, 10, 0.9)",
    panelBg: "rgba(45, 15, 15, 0.75)",
    glassBg: "rgba(255, 200, 200, 0.08)",
    glassBorder: "rgba(255, 100, 100, 0.15)",
    glassEdge: "rgba(255, 150, 150, 0.25)",
    effect: "snowfallHD",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "minimal",
    clockColor: "#ffffff",
    dateColor: "#ffcccc"
  },
  tet: {
    accentColor: "#ffd700",
    sidebarBg: "rgba(40, 5, 5, 0.95)",
    panelBg: "rgba(60, 10, 10, 0.8)",
    glassBg: "rgba(255, 215, 0, 0.05)",
    glassBorder: "rgba(255, 215, 0, 0.2)",
    glassEdge: "rgba(255, 215, 0, 0.3)",
    effect: "tetFireworks",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "default",
    clockColor: "#ffd700",
    dateColor: "#ffffff"
  },
  reunification: {
    accentColor: "#ff0000",
    sidebarBg: "rgba(35, 5, 5, 0.92)",
    panelBg: "rgba(50, 10, 10, 0.75)",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 215, 0, 0.2)",
    effect: "reunificationDay",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "minimal",
    clockColor: "#ffffff",
    dateColor: "#ffd700"
  },
  cyberpunk: {
    accentColor: "#00ff73",
    sidebarBg: "rgba(5, 10, 15, 0.95)",
    panelBg: "rgba(10, 20, 30, 0.8)",
    glassBg: "rgba(0, 255, 115, 0.03)",
    glassBorder: "rgba(0, 255, 115, 0.15)",
    glassEdge: "rgba(0, 255, 115, 0.25)",
    effect: "matrix",
    font: "'GohuFont', monospace",
    clockFont: "'Electroharmonix', sans-serif",
    dateClockStyle: "minimal",
    clockColor: "#00ff73",
    dateColor: "#00ff73"
  },
  ocean: {
    accentColor: "#00d4ff",
    sidebarBg: "rgba(5, 15, 25, 0.9)",
    panelBg: "rgba(10, 25, 45, 0.75)",
    glassBg: "rgba(0, 212, 255, 0.05)",
    glassBorder: "rgba(0, 212, 255, 0.15)",
    glassEdge: "rgba(0, 212, 255, 0.2)",
    effect: "oceanWave",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "minimal",
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
    clockFont: "'Electroharmonix', sans-serif",
    dateClockStyle: "jp-style",
    clockColor: "#ffffff",
    dateColor: "#ffebf0"
  },
  space: {
    accentColor: "#a8c0ff",
    sidebarBg: "rgba(10, 10, 20, 0.95)",
    panelBg: "rgba(20, 20, 40, 0.8)",
    glassBg: "rgba(168, 192, 255, 0.05)",
    glassBorder: "rgba(168, 192, 255, 0.15)",
    glassEdge: "rgba(168, 192, 255, 0.25)",
    effect: "meteor",
    clockFont: "'Anurati', sans-serif",
    dateClockStyle: "sidestyle",
    sidestyleAlign: "center",
    clockColor: "#ffffff",
    dateColor: "#a8c0ff"
  },
  halloween: {
    accentColor: "#ff6600",
    sidebarBg: "rgba(20, 10, 30, 0.95)",
    panelBg: "rgba(35, 15, 50, 0.8)",
    glassBg: "rgba(255, 102, 0, 0.05)",
    glassBorder: "rgba(255, 102, 0, 0.2)",
    glassEdge: "rgba(255, 102, 0, 0.3)",
    effect: "halloween",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "minimal",
    clockColor: "#ff6600",
    dateColor: "#ffffff"
  },
  twilight: {
    accentColor: "#ff8c00",
    sidebarBg: "rgba(30, 10, 30, 0.9)",
    panelBg: "rgba(50, 20, 50, 0.8)",
    glassBg: "rgba(255, 140, 0, 0.05)",
    glassBorder: "rgba(255, 140, 0, 0.15)",
    glassEdge: "rgba(255, 140, 0, 0.25)",
    effect: "sunbeam",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "minimal",
    clockColor: "#ff8c00",
    dateColor: "#ffffff"
  },
  neon: {
    accentColor: "#00f2ff",
    sidebarBg: "rgba(5, 5, 15, 0.95)",
    panelBg: "rgba(10, 10, 30, 0.85)",
    glassBg: "rgba(0, 242, 255, 0.03)",
    glassBorder: "rgba(0, 242, 255, 0.15)",
    glassEdge: "rgba(0, 242, 255, 0.25)",
    effect: "floatingLines",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "cool",
    clockColor: "#ffffff",
    dateColor: "#ffffff"
  },
  nordic: {
    accentColor: "#81a1c1",
    sidebarBg: "rgba(46, 52, 64, 0.92)",
    panelBg: "rgba(59, 66, 82, 0.8)",
    glassBg: "rgba(236, 239, 244, 0.05)",
    glassBorder: "rgba(236, 239, 244, 0.1)",
    glassEdge: "rgba(236, 239, 244, 0.2)",
    effect: "northernLights",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "minimal",
    clockColor: "#eceff4",
    dateColor: "#81a1c1"
  },
  nature: {
    accentColor: "#a3be8c",
    sidebarBg: "rgba(20, 30, 20, 0.92)",
    panelBg: "rgba(30, 45, 30, 0.8)",
    glassBg: "rgba(163, 190, 140, 0.05)",
    glassBorder: "rgba(163, 190, 140, 0.1)",
    glassEdge: "rgba(163, 190, 140, 0.2)",
    effect: "fireflies",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "minimal",
    clockColor: "#a3be8c",
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
