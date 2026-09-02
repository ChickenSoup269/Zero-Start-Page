import { getSettings, updateSetting } from "./state.js"
import { updateTime } from "../components/clock.js"

let i18n = {}
let englishI18n = null

async function loadEnglishTranslations() {
  if (englishI18n) return englishI18n
  try {
    const cached = sessionStorage.getItem("startpageCachedI18n_v4_en")
    if (cached) {
      englishI18n = JSON.parse(cached)
      return englishI18n
    }
  } catch {}

  const response = await fetch("./locales/en.json?v=4")
  englishI18n = await response.json()
  try {
    sessionStorage.setItem(
      "startpageCachedI18n_v4_en",
      JSON.stringify(englishI18n),
    )
  } catch {}
  return englishI18n
}

export function geti18n() {
  return i18n
}

export const GITHUB_LOCALES_BASE_URL =
  "https://raw.githubusercontent.com/ChickenSoup269/Zero-Start-Page/main/locales"
export const CDN_LOCALES_BASE_URL =
  "https://cdn.jsdelivr.net/gh/ChickenSoup269/Zero-Start-Page@main/locales"

export async function fetchRemoteLanguage(language) {
  const cleanLang = normalizeLanguageCode(language)
  if (!cleanLang) throw new Error("Invalid language code")

  const urls = [
    `${GITHUB_LOCALES_BASE_URL}/${cleanLang}.json`,
    `${CDN_LOCALES_BASE_URL}/${cleanLang}.json`,
  ]

  let lastError = null
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-cache" })
      if (response.ok) {
        const data = await response.json()
        if (data && typeof data === "object") {
          return data
        }
      }
    } catch (err) {
      lastError = err
    }
  }

  throw (
    lastError ||
    new Error(`Could not download ${cleanLang}.json from GitHub repository`)
  )
}

export async function loadLanguage(lang) {
  const settings = getSettings()
  const language = lang || settings.language || "en"
  const customLanguage = settings.customLanguages?.[language]

  try {
    const english = await loadEnglishTranslations()
    if (customLanguage?.translations) {
      i18n = {
        ...english,
        ...customLanguage.translations,
        language,
      }
      return
    }

    // 1. Try local bundle first (e.g. bundled en.json, vi.json)
    let translations = null
    try {
      const cached = sessionStorage.getItem(
        `startpageCachedI18n_v4_${language}`,
      )
      if (cached) {
        translations = JSON.parse(cached)
      }
    } catch {}

    if (!translations) {
      try {
        const response = await fetch(`./locales/${language}.json?v=4`)
        if (response.ok) {
          translations = await response.json()
          try {
            sessionStorage.setItem(
              `startpageCachedI18n_v4_${language}`,
              JSON.stringify(translations),
            )
          } catch {}
        }
      } catch {
        translations = null
      }
    }

    // 2. If not found in local package, fetch from GitHub raw and cache in customLanguages
    if (!translations && language !== "en") {
      try {
        const remoteData = await fetchRemoteLanguage(language)
        if (remoteData) {
          translations = remoteData?.translations || remoteData
          const langName =
            language === "de"
              ? "Deutsch"
              : language === "sv"
                ? "Svenska"
                : language.toUpperCase()
          const customLanguages = {
            ...(settings.customLanguages || {}),
            [language]: {
              name: langName,
              translations,
              updatedAt: new Date().toISOString(),
            },
          }
          updateSetting("customLanguages", customLanguages)
          saveSettings(true)
        }
      } catch (remoteErr) {
        console.warn(`Remote language fetch failed for ${language}:`, remoteErr)
      }
    }

    if (!translations) throw new Error("File not found")

    i18n = {
      ...english,
      ...translations,
      language,
    }
  } catch (e) {
    console.error(
      `Could not load ${language}.json, falling back to English.`,
      e,
    )
    if (language !== "en") {
      const response = await fetch(`./locales/en.json?v=3`)
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

  if (
    translatedKeys.length < Math.max(20, Math.floor(englishKeys.length * 0.25))
  ) {
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
