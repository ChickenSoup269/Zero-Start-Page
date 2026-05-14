import { updateAllSettings, saveSettings, getSettings, defaultSettings, updateSetting } from "../../services/state.js"
import { showAlert } from "../../utils/dialog.js"

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
    clockFontTarget: "weekday",
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
    clockFontTarget: "weekday",
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
    clockFontTarget: "weekday",
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
    font: "'Outfit', sans-serif",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "round",
    clockColor: "#ffffff",
    dateColor: "#ffffff"
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
    font: "'Outfit', sans-serif",
    clockFont: "'Outfit', sans-serif",
    dateClockStyle: "fliqlo",
    fliqloTheme: "dark",
    clockColor: "#ffffff",
    dateColor: "#ffffff",
    contextMenuStyle: "light"
  },
}

// List of settings that themes are allowed to modify.
export const THEMEABLE_KEYS = [
  "background", "activeBgUid", "unsplashLastCredit",
  "accentColor", "sidebarBg", "panelBg", "glassBg", "glassBorder", "glassEdge",
  "effect", "hueTextMode", "font", "clockFont", "clockFontTarget", "dateClockStyle", 
  "clockColor", "dateColor", "analogMarkerMode", "sidestyleAlign",
  "hackerColor", "oceanWaveColor", "sakuraColor", "bubblesColor", "lightPillarsColor", "plantGrowthColor",
  "starColor", "meteorColor", "auraColor", "northernLightsColor", "pixelCubesColor",
  "snowfallColor", "sunbeamColor", "bubbleColor", "rainHDColor", "stormRainColor",
  "wavyLinesColor", "shinyColor", "lineShinyColor", "nintendoPixelColor",
  "northernLightsStyle", "northernLightsBrightness", "fliqloTheme", "contextMenuStyle",
  "sidebarClockFlip", "analogBlurBackground"
];

// Variable to store user's manual settings before a theme was applied
let preThemeSnapshot = null;

export function initThemeManager(DOM, handleSettingUpdate, updateSettingsInputs) {
  if (!DOM.themesGrid) return

  // Load and render user themes
  renderUserThemes(DOM, handleSettingUpdate, updateSettingsInputs);

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
    const themeItem = e.target.closest(".theme-item");
    if (!themeItem) return;

    // Handle delete button
    if (e.target.closest(".delete-theme-btn")) {
        const themeKey = themeItem.dataset.theme;
        if (themeKey.startsWith("user-")) {
            deleteUserTheme(themeKey, DOM, handleSettingUpdate, updateSettingsInputs);
        }
        return;
    }

    const themeKey = themeItem.dataset.theme;
    
    // If clicking the ALREADY active theme, treat it as "deselect" and restore original
    if (themeItem.classList.contains("active")) {
      updateActiveUI(null)
      updateSetting("theme", null)
      restoreUserOriginalSettings(updateSettingsInputs)
      return
    }

    let themeData = THEMES[themeKey];
    if (!themeData && themeKey.startsWith("user-")) {
        const userThemes = getSettings().userThemes || [];
        const userTheme = userThemes.find(t => t.id === themeKey);
        if (userTheme) themeData = userTheme.snapshot;
    }

    if (themeData) {
      // Before applying the very first theme in a sequence, take a snapshot of current settings
      captureUserSnapshot();
      
      updateActiveUI(themeKey)
      updateSetting("theme", themeKey)
      applyTheme(themeData, updateSettingsInputs)
    }
  });

  // Save current theme button
  if (DOM.saveCurrentThemeBtn) {
      DOM.saveCurrentThemeBtn.addEventListener("click", () => {
          if (DOM.saveThemeModal) DOM.saveThemeModal.classList.add("open");
      });
  }

  // Icon selection in modal
  if (DOM.themeIconGrid) {
      const icons = DOM.themeIconGrid.querySelectorAll(".icon-option");
      icons.forEach(icon => {
          icon.addEventListener("click", () => {
              icons.forEach(i => i.classList.remove("active"));
              icon.classList.add("active");
          });
      });
  }

  // Close modal
  if (DOM.closeSaveThemeModalBtn) {
      DOM.closeSaveThemeModalBtn.addEventListener("click", () => {
          if (DOM.saveThemeModal) DOM.saveThemeModal.classList.remove("open");
      });
  }

  // Confirm save logic
  const handleConfirmSave = () => {
      const name = DOM.customThemeNameInput.value.trim() || "My Theme";
      const activeIcon = DOM.themeIconGrid.querySelector(".icon-option.active");
      const icon = activeIcon ? activeIcon.dataset.icon : "fa-palette";
      
      const success = saveUserTheme(name, icon, DOM, handleSettingUpdate, updateSettingsInputs);
      
      if (success) {
          if (DOM.saveThemeModal) DOM.saveThemeModal.classList.remove("open");
          DOM.customThemeNameInput.value = "";
      }
  };

  if (DOM.confirmSaveThemeBtn) {
      DOM.confirmSaveThemeBtn.addEventListener("click", handleConfirmSave);
  }

  // Enter key support
  if (DOM.customThemeNameInput) {
      DOM.customThemeNameInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
              handleConfirmSave();
          }
      });
  }

  // Click outside to close
  if (DOM.saveThemeModal) {
      DOM.saveThemeModal.addEventListener("click", (e) => {
          if (e.target === DOM.saveThemeModal) {
              DOM.saveThemeModal.classList.remove("open");
          }
      });
  }
}

function renderUserThemes(DOM, handleSettingUpdate, updateSettingsInputs) {
    if (!DOM.themesGrid) return;
    
    // Clear existing user themes (keep default themes)
    const existingUserThemes = DOM.themesGrid.querySelectorAll(".theme-item[data-theme^='user-']");
    existingUserThemes.forEach(el => el.remove());
    
    const userThemes = getSettings().userThemes || [];
    userThemes.forEach(theme => {
        const item = document.createElement("div");
        item.className = "theme-item";
        item.dataset.theme = theme.id;
        
        // Use a preview color from the snapshot if available
        const previewColor = theme.snapshot.accentColor || "#ffffff";
        
        item.innerHTML = `
            <div class="theme-preview" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
                <i class="fa-solid ${theme.icon}" style="color: ${previewColor};"></i>
            </div>
            <span class="theme-name">${theme.name}</span>
            <div class="active-indicator"><i class="fa-solid fa-check"></i></div>
            <button class="delete-theme-btn" title="Delete Theme"><i class="fa-solid fa-trash-can"></i></button>
        `;
        
        DOM.themesGrid.appendChild(item);
    });
}

function saveUserTheme(name, icon, DOM, handleSettingUpdate, updateSettingsInputs) {
    const currentSettings = getSettings();
    const userThemes = currentSettings.userThemes || [];
    
    // Check for duplicates
    const isDuplicate = userThemes.some(t => t.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
        showAlert("A theme with this name already exists. Please choose a different name.");
        return false;
    }

    const snapshot = {};
    
    THEMEABLE_KEYS.forEach(key => {
        if (currentSettings[key] !== undefined) {
            snapshot[key] = currentSettings[key];
        }
    });
    
    const newTheme = {
        id: "user-" + Date.now(),
        name: name,
        icon: icon,
        snapshot: snapshot
    };
    
    userThemes.push(newTheme);
    updateSetting("userThemes", userThemes);
    saveSettings(true);
    
    renderUserThemes(DOM, handleSettingUpdate, updateSettingsInputs);
    return true;
}

function deleteUserTheme(id, DOM, handleSettingUpdate, updateSettingsInputs) {
    const currentSettings = getSettings();
    let userThemes = currentSettings.userThemes || [];
    userThemes = userThemes.filter(t => t.id !== id);
    
    updateSetting("userThemes", userThemes);
    
    // If the deleted theme was active, reset to default
    if (currentSettings.theme === id) {
        updateSetting("theme", null);
        restoreUserOriginalSettings(updateSettingsInputs);
    }
    
    saveSettings(true);
    renderUserThemes(DOM, handleSettingUpdate, updateSettingsInputs);
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

  // Reset to user's original state (or default if not set) first
  // This ensures we don't overwrite custom effect colors not specified by the theme
  THEMEABLE_KEYS.forEach(key => {
    if (preThemeSnapshot && preThemeSnapshot[key] !== undefined) {
      resetData[key] = preThemeSnapshot[key];
    } else if (defaultSettings[key] !== undefined) {
      resetData[key] = defaultSettings[key];
    }
  });

  const finalData = { ...resetData, ...themeData };
  updateAllSettings(finalData);

  if (updateSettingsInputs) updateSettingsInputs();
  saveSettings(true);
  if (window.appApplySettings) window.appApplySettings();
}
