import { getSettings, updateSetting } from "./state.js"
import { updateTime } from "../components/clock.js"

let i18n = {}
let englishI18n = null

async function loadEnglishTranslations() {
  if (englishI18n) return englishI18n
  const response = await fetch("./locales/en.json?v=2")
  englishI18n = await response.json()
  return englishI18n
}

export function geti18n() {
  return i18n
}

export async function loadLanguage(lang) {
  const settings = getSettings()
  const language = lang || settings.language || "en"
  const customLanguage = settings.customLanguages?.[language]

  try {
    if (customLanguage?.translations) {
      const english = await loadEnglishTranslations()
      i18n = {
        ...english,
        ...customLanguage.translations,
        language,
      }
      return
    }

    const response = await fetch(`./locales/${language}.json?v=2`)
    if (!response.ok) throw new Error("File not found")
    i18n = await response.json()
  } catch (e) {
    console.error(
      `Could not load ${language}.json, falling back to English.`,
      e,
    )
    if (language !== "en") {
      const response = await fetch(`./locales/en.json?v=2`)
      i18n = await response.json()
      updateSetting("language", "en") // This will also save settings
    }
  }
}

export async function getEnglishLanguageTemplate() {
  const english = await loadEnglishTranslations()
  return {
    code: "your-language-code",
    name: "Your Language Name",
    translations: english,
  }
}

export async function validateCustomLanguagePayload(payload) {
  const english = await loadEnglishTranslations()
  const rawTranslations = payload?.translations || payload

  if (
    !rawTranslations ||
    typeof rawTranslations !== "object" ||
    Array.isArray(rawTranslations)
  ) {
    throw new Error("Language JSON must be an object or contain translations.")
  }

  const translations = {}
  Object.entries(rawTranslations).forEach(([key, value]) => {
    if (typeof value === "string") translations[key] = value
  })

  const englishKeys = Object.keys(english)
  const translatedKeys = Object.keys(translations)
  const missingKeys = englishKeys.filter((key) => !(key in translations))
  const extraKeys = translatedKeys.filter((key) => !(key in english))

  if (translatedKeys.length < Math.max(20, Math.floor(englishKeys.length * 0.25))) {
    throw new Error("Language JSON has too few valid translation keys.")
  }

  return {
    code: normalizeLanguageCode(payload?.code || payload?.language || ""),
    name: typeof payload?.name === "string" ? payload.name.trim() : "",
    translations: {
      ...english,
      ...translations,
    },
    missingKeys,
    extraKeys,
    translatedCount: translatedKeys.length,
    totalCount: englishKeys.length,
  }
}

export function normalizeLanguageCode(code) {
  return String(code || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24)
}

export function applyTranslations() {
  const currentLanguage = i18n.language || getSettings().language || "en"
  document.documentElement.lang = currentLanguage

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n")
    if (i18n[key]) {
      // If the element has children (like an icon <i>), only replace the text nodes
      if (el.children.length > 0) {
        let textNodeFound = false
        // Specifically look for text nodes after icons
        for (let i = 0; i < el.childNodes.length; i++) {
          if (
            el.childNodes[i].nodeType === 3 &&
            el.childNodes[i].nodeValue.trim().length > 0
          ) {
            el.childNodes[i].nodeValue = " " + i18n[key]
            textNodeFound = true
            break
          }
        }
        if (!textNodeFound) {
          el.appendChild(document.createTextNode(" " + i18n[key]))
        }
      } else {
        el.textContent = i18n[key]
      }
    }
  })
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html")
    if (i18n[key]) {
      el.innerHTML = i18n[key]
    }
  })

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder")
    if (i18n[key]) el.placeholder = i18n[key]
  })
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title")
    if (i18n[key]) el.title = i18n[key]
  })
  document.querySelectorAll("[data-i18n-label]").forEach((el) => {
    const key = el.getAttribute("data-i18n-label")
    if (i18n[key]) el.label = i18n[key]
  })
  updateTime() // Update time to reflect language change in date format
}

export async function initI18n() {
  const settings = getSettings()
  await loadLanguage(settings.language)
  applyTranslations()
}
