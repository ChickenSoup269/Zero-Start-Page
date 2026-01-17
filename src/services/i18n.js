import { getSettings, updateSetting } from "./state.js"
import { updateTime } from "../components/clock.js"

let i18n = {}

export function geti18n() {
  return i18n
}

export async function loadLanguage(lang) {
  const settings = getSettings()
  const language = lang || settings.language || "en"
  try {
    const response = await fetch(`./locales/${language}.json`)
    if (!response.ok) throw new Error("File not found")
    i18n = await response.json()
  } catch (e) {
    console.error(
      `Could not load ${language}.json, falling back to English.`,
      e
    )
    if (language !== "en") {
      const response = await fetch(`./locales/en.json`)
      i18n = await response.json()
      updateSetting("language", "en") // This will also save settings
    }
  }
}

export function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n")
    if (i18n[key]) el.textContent = i18n[key]
  })
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder")
    if (i18n[key]) el.placeholder = i18n[key]
  })
  updateTime() // Update time to reflect language change in date format
}

export async function initI18n() {
  const settings = getSettings()
  await loadLanguage(settings.language)
  applyTranslations()
}
