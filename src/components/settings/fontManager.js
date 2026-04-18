/**
 * Font Management Module
 * Handles font selection, Google Fonts loading, and custom font persistence
 */

import {
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"
import { geti18n } from "../../services/i18n.js"
import { showAlert } from "../../utils/dialog.js"

import { showContextMenu } from "../contextMenu.js"

const PREDEFINED_FONTS = [
  { label: "Outfit", value: "'Outfit', sans-serif", google: true },
  { label: "Inter", value: "'Inter', sans-serif", google: true },
  { label: "Poppins", value: "'Poppins', sans-serif", google: true },
  { label: "Roboto", value: "'Roboto', sans-serif", google: true },
  { label: "Montserrat", value: "'Montserrat', sans-serif", google: true },
  { label: "Nunito", value: "'Nunito', sans-serif", google: true },
  { label: "Orbitron", value: "'Orbitron', sans-serif", google: true },
  {
    label: "Chakra Petch",
    value: "'Chakra Petch', sans-serif",
    google: true,
  },
  { label: "Arial", value: "'Arial', sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  {
    label: "Silkscreen",
    value: "'Silkscreen', cursive",
    tag: "Pixel",
    google: true,
  },
  {
    label: "Pixelify Sans",
    value: "'Pixelify Sans', sans-serif",
    tag: "Pixel",
    google: true,
  },
  {
    label: "Electroharmonix",
    value: "'Electroharmonix', sans-serif",
    tag: "Clock/Date",
  },
  {
    label: "Anurati",
    value: "'Anurati', sans-serif",
    tag: "Clock/Date",
  },
  {
    label: "E1234",
    value: "'E1234', sans-serif",
    tag: "Clock/Date",
  },
  {
    label: "GohuFont",
    value: "'GohuFont', sans-serif",
    tag: "Pixel",
  },
]

function loadGoogleFont(fontName) {
  const formattedFontName = fontName.replace(/\s+/g, "+")
  const googleFontUrl = `https://fonts.googleapis.com/css2?family=${formattedFontName}:wght@300;400;500;600;700&display=swap`
  const customFontLink = document.getElementById("custom-google-font")
  if (customFontLink) {
    customFontLink.href = googleFontUrl
  }
}

/**
 * Initializes the font on page load.
 */
function initFont() {
  const settings = getSettings()
  
  const fontsToLoad = [
      settings.font || "'Outfit', sans-serif",
      settings.clockFont || "'Outfit', sans-serif"
  ]

  fontsToLoad.forEach(currentFontValue => {
      // Extract font name from value like "'Outfit', sans-serif" -> "Outfit"
      const fontName = currentFontValue.replace(/['"]/g, "").split(",")[0].trim()

      // Check if it's a predefined Google font or a user-saved font
      const isPredefinedGoogle = PREDEFINED_FONTS.some(
        (f) => f.google && f.label === fontName,
      )
      
      const savedFonts = settings.userSavedFonts || []
      const fontDef = PREDEFINED_FONTS.find(f => f.label === fontName)
      
      const isGoogleFont = (fontDef && fontDef.google) || 
                          savedFonts.some(f => (typeof f === 'string' ? f : f.label) === fontName);

      // Pre-loaded fonts in index.html don't need to be reloaded
      const isPreloaded = ["Pixelify Sans", "Silkscreen"].includes(fontName)

      if (isGoogleFont && !isPreloaded) {
        // Double check if it's a known non-google predefined font
        if (fontDef && !fontDef.google) {
           // Skip
        } else {
           loadGoogleFont(fontName)
        }
      }
  })
}

function renderFontGrid(fontGrid, updateSettingCallback) {
  if (!fontGrid) return

  const settings = getSettings()
  const savedFonts = settings.userSavedFonts || []

  fontGrid.innerHTML = ""

  // Build a map of favorites from userSavedFonts
  const favoritesMap = new Map();
  savedFonts.forEach(f => {
      if (typeof f === 'object' && f.isFavorite) {
          favoritesMap.set(f.label, f);
      }
  });

  const allFonts = [
    ...PREDEFINED_FONTS.map(f => {
        const fav = favoritesMap.get(f.label);
        return { 
            ...f, 
            type: f.tag === "Clock/Date" ? "clock" : "general",
            isFavorite: !!fav
        };
    }),
    ...savedFonts.filter(f => {
        const label = typeof f === 'string' ? f : f.label;
        return !PREDEFINED_FONTS.some(pf => pf.label === label);
    }).map((f, index) => {
        const label = typeof f === 'string' ? f : f.label;
        const isFavorite = typeof f === 'string' ? false : !!f.isFavorite;
        // Find original index in userSavedFonts for context menu
        const originalIndex = savedFonts.findIndex(sf => (typeof sf === 'string' ? sf : sf.label) === label);
        return {
            label: label,
            value: `'${label}', sans-serif`,
            custom: true,
            isFavorite: isFavorite,
            originalIndex: originalIndex,
            type: "saved"
        }
    }),
  ]

  const favoriteFonts = allFonts.filter(f => f.isFavorite)
  const generalFonts = allFonts.filter(f => !f.isFavorite && f.type === "general")
  const clockFonts = allFonts.filter(f => !f.isFavorite && f.type === "clock")
  const savedFontsList = allFonts.filter(f => !f.isFavorite && f.type === "saved")

  const sections = [
      { label: "--- Favorite ---", fonts: favoriteFonts },
      { label: "--- General Fonts ---", fonts: generalFonts },
      { label: "--- Clock Fonts ---", fonts: clockFonts },
      { label: "--- Saved Fonts ---", fonts: savedFontsList }
  ]

  sections.forEach(section => {
      if (section.fonts.length === 0) return;

      const sep = document.createElement("div")
      sep.className = "font-grid-separator"
      sep.textContent = section.label
      fontGrid.appendChild(sep)

      section.fonts.forEach((fontObj) => {
        const { label, value, tag, custom, google, isFavorite, originalIndex, type } = fontObj
        const card = document.createElement("div")
        
        const isActive = (type === "clock") ? (value === settings.clockFont) : (value === settings.font)
        card.className = "font-item" + (isActive ? " active" : "")
        if (isFavorite) card.classList.add("is-favorite")
        card.dataset.fontValue = value

        const preview = document.createElement("span")
        preview.className = "font-item-preview"
        preview.textContent = "Aa"
        preview.style.fontFamily = value

        const name = document.createElement("span")
        name.className = "font-item-name"
        
        let displayTag = tag;
        if (type === "saved") displayTag = "Saved Font";
        
        name.textContent = label + (displayTag ? ` (${displayTag})` : "")

        if (isFavorite) {
            const favIcon = document.createElement("i")
            favIcon.className = "fa-solid fa-star favorite-star"
            card.appendChild(favIcon)
        }

        card.appendChild(preview)
        card.appendChild(name)

        card.addEventListener("click", () => {
          if (custom || google) loadGoogleFont(label)
          
          if (type === "clock") {
              updateSettingCallback("clockFont", value)
          } else {
              updateSettingCallback("font", value)
              updateSettingCallback("clockFont", value)
          }
          renderFontGrid(fontGrid, updateSettingCallback)
        })

        card.addEventListener("contextmenu", (e) => {
            e.preventDefault()
            if (custom) {
                showContextMenu(e.clientX, e.clientY, originalIndex, "userFont")
            } else {
                // For predefined fonts, pass type and label as ID
                showContextMenu(e.clientX, e.clientY, -1, "predefinedFont", label)
            }
        })

        fontGrid.appendChild(card)
      })
  })
}

function renderSavedFonts() {
  // Saved fonts are now shown directly in the font grid; this is a no-op.
}

export {
  PREDEFINED_FONTS,
  loadGoogleFont,
  initFont,
  renderFontGrid,
  renderSavedFonts,
}
