import { updateAllSettings, saveSettings, getSettings, defaultSettings } from "../../services/state.js"

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
    font: "'Outfit', sans-serif",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "analog",
    analogMarkerMode: "full",
    clockColor: "#ffffff",
    dateColor: "#ffffff"
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
    font: "'Outfit', sans-serif",
    clockFont: "'Anurati', sans-serif",
    dateClockStyle: "sidebar",
    clockColor: "#ffffff",
    dateColor: "#ccff00"
  },
}

// List of settings that themes are allowed to modify.
const THEMEABLE_KEYS = [
  "accentColor", "sidebarBg", "panelBg", "glassBg", "glassBorder", "glassEdge",
  "effect", "hueTextMode", "font", "clockFont", "dateClockStyle", 
  "clockColor", "dateColor", "analogMarkerMode", "sidestyleAlign",
  "hackerColor", "oceanWaveColor", "sakuraColor", "bubblesColor", "lightPillarsColor", "plantGrowthColor",
  "starColor", "meteorColor", "auraColor", "northernLightsColor", "pixelCubesColor",
  "snowfallColor", "sunbeamColor", "bubbleColor", "rainHDColor", "stormRainColor",
  "wavyLinesColor", "shinyColor", "lineShinyColor", "nintendoPixelColor"
];

// Variable to store user's manual settings before a theme was applied
let preThemeSnapshot = null;

export function initThemeManager(DOM, handleSettingUpdate, updateSettingsInputs) {
  if (!DOM.themesGrid) return

  const themeItems = DOM.themesGrid.querySelectorAll(".theme-item")

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
      
      // If clicking the ALREADY active theme, treat it as "deselect" and restore original
      if (item.classList.contains("active")) {
        updateActiveUI(null)
        restoreUserOriginalSettings(updateSettingsInputs)
        return
      }

      const themeData = THEMES[themeKey]
      if (themeData) {
        // Before applying the very first theme in a sequence, take a snapshot of current settings
        captureUserSnapshot();
        
        updateActiveUI(themeKey)
        applyTheme(themeData, updateSettingsInputs)
      }
    })
  })
}

function captureUserSnapshot() {
  if (preThemeSnapshot !== null) return;
  
  const currentSettings = getSettings();
  preThemeSnapshot = {};
  
  THEMEABLE_KEYS.forEach(key => {
    if (currentSettings[key] !== undefined) {
      preThemeSnapshot[key] = currentSettings[key];
    }
  });
}

function restoreUserOriginalSettings(updateSettingsInputs) {
  if (!preThemeSnapshot) return;

  updateAllSettings(preThemeSnapshot);
  preThemeSnapshot = null; // Clear so next theme click takes a fresh snapshot

  if (updateSettingsInputs) updateSettingsInputs();
  saveSettings(true);
  if (window.appApplySettings) window.appApplySettings();
}

function applyTheme(themeData, updateSettingsInputs) {
  const resetData = {};

  // Reset to default first
  THEMEABLE_KEYS.forEach(key => {
    if (defaultSettings[key] !== undefined) {
      resetData[key] = defaultSettings[key];
    }
  });

  const finalData = { ...resetData, ...themeData };
  updateAllSettings(finalData);

  if (updateSettingsInputs) updateSettingsInputs();
  saveSettings(true);
  if (window.appApplySettings) window.appApplySettings();
}
