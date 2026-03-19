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

const PREDEFINED_FONTS = [
  { label: "Outfit", value: "'Outfit', sans-serif" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "Poppins", value: "'Poppins', sans-serif" },
  { label: "Roboto", value: "'Roboto', sans-serif" },
  { label: "Montserrat", value: "'Montserrat', sans-serif" },
  { label: "Nunito", value: "'Nunito', sans-serif" },
  { label: "Arial", value: "'Arial', sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Silkscreen", value: "'Silkscreen', cursive", tag: "Pixel" },
  {
    label: "Pixelify Sans",
    value: "'Pixelify Sans', sans-serif",
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

function renderFontGrid(fontGrid, updateSettingCallback) {
  const settings = getSettings()
  const currentFont = settings.font
  const savedFonts = settings.userSavedFonts || []

  fontGrid.innerHTML = ""

  const allFonts = [
    ...PREDEFINED_FONTS,
    ...savedFonts.map((name) => ({
      label: name,
      value: `'${name}', sans-serif`,
      custom: true,
    })),
  ]

  allFonts.forEach(({ label, value, tag, custom }) => {
    const card = document.createElement("div")
    card.className = "font-item" + (value === currentFont ? " active" : "")
    card.dataset.fontValue = value

    const preview = document.createElement("span")
    preview.className = "font-item-preview"
    preview.textContent = "Aa"
    preview.style.fontFamily = value

    const name = document.createElement("span")
    name.className = "font-item-name"
    name.textContent = label + (tag ? ` (${tag})` : "")

    card.appendChild(preview)
    card.appendChild(name)

    if (custom) {
      const delBtn = document.createElement("button")
      delBtn.className = "font-item-delete"
      delBtn.innerHTML = "&times;"
      delBtn.title = "Remove font"
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        const s = getSettings()
        updateSetting(
          "userSavedFonts",
          (s.userSavedFonts || []).filter((f) => f !== label),
        )
        saveSettings()
        renderFontGrid(fontGrid, updateSettingCallback)
      })
      card.appendChild(delBtn)
    }

    card.addEventListener("click", () => {
      if (custom) loadGoogleFont(label)
      updateSettingCallback("font", value)
      renderFontGrid(fontGrid, updateSettingCallback)
    })

    fontGrid.appendChild(card)
  })
}

function renderSavedFonts() {
  // Saved fonts are now shown directly in the font grid; this is a no-op.
}

export { PREDEFINED_FONTS, loadGoogleFont, renderFontGrid, renderSavedFonts }
