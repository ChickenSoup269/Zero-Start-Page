/**
 * utils/dynamicTokens.js
 * Comprehensive Dynamic Token Engine for Page Title and Text Widgets
 * Supports live tokens: {time}, {time12}, {time_sec}, {date}, {date_full}, {day}, {month}, {year}, {weekday}, {greeting}, {name}, {music}, {weather}
 */

import { getSettings } from "../services/state.js"

const VI_DAYS = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
]

const EN_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

/**
 * Get localized greeting based on hour of day
 * @param {Date} now
 * @param {string} lang
 * @returns {string}
 */
export function getLocalizedGreeting(now = new Date(), lang = "vi") {
  const hr = now.getHours()
  const isVi = lang === "vi"

  if (hr >= 4 && hr < 11) {
    return isVi ? "Chào buổi sáng" : "Good morning"
  }
  if (hr >= 11 && hr < 14) {
    return isVi ? "Chào buổi trưa" : "Good afternoon"
  }
  if (hr >= 14 && hr < 18) {
    return isVi ? "Chào buổi chiều" : "Good afternoon"
  }
  if (hr >= 18 && hr < 22) {
    return isVi ? "Chào buổi tối" : "Good evening"
  }
  return isVi ? "Chào đêm khuya" : "Good night"
}

/**
 * Get current cached weather string
 * @returns {string}
 */
export function getCachedWeatherString() {
  try {
    if (typeof localStorage === "undefined") return "28°C ☀️"
    const cache = JSON.parse(localStorage.getItem("weatherWidgetCache") || "null")
    if (cache?.data?.current?.temperature_2m !== undefined) {
      const temp = Math.round(cache.data.current.temperature_2m)
      const code = cache.data.current.weather_code
      let icon = "☀️"
      if ([1, 2, 3].includes(code)) icon = "⛅"
      else if ([45, 48].includes(code)) icon = "🌫️"
      else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) icon = "🌧️"
      else if ([71, 73, 75, 77, 85, 86].includes(code)) icon = "❄️"
      else if ([95, 96, 99].includes(code)) icon = "⛈️"
      return `${temp}°C ${icon}`
    }
  } catch {
    // Fallback if parsing fails
  }
  return "28°C ☀️"
}

/**
 * Get currently playing music track title
 * @param {boolean} isPreview
 * @returns {string}
 */
export function getCurrentMusicTitle(isPreview = false) {
  if (typeof window !== "undefined" && window._currentPlayingTrackTitle) {
    return `🎵 ${window._currentPlayingTrackTitle}`
  }
  if (typeof document !== "undefined") {
    const el = document.querySelector("#music-title")
    if (
      el &&
      el.textContent &&
      !el.textContent.includes("No Media") &&
      !el.textContent.includes("Không phát nhạc")
    ) {
      return `🎵 ${el.textContent.trim()}`
    }
  }
  return isPreview ? "🎵 Lofi Chill" : ""
}

/**
 * Check whether template contains time-sensitive tokens
 * @param {string} template
 * @returns {boolean}
 */
export function hasTimeDependentTokens(template) {
  if (!template || typeof template !== "string") return false
  return /{(time|time12|time_12|time_sec|time_seconds|greeting|date|date_full|day|month|year|weekday)}/i.test(template)
}

/**
 * Check whether template needs second-by-second updates
 * @param {string} template
 * @returns {boolean}
 */
export function needsSecondPrecision(template) {
  if (!template || typeof template !== "string") return false
  return /{(time_sec|time_seconds)}/i.test(template)
}

/**
 * Resolves all dynamic tokens in a given template string.
 * @param {string} rawTemplate
 * @param {Object} [settings=null]
 * @param {Object} [options={}]
 * @returns {string}
 */
export function resolveDynamicTokens(rawTemplate, settings = null, options = {}) {
  const currentSettings = settings || (typeof getSettings === "function" ? getSettings() : {}) || {}
  const now = options.date || new Date()
  const lang = currentSettings.language || (typeof document !== "undefined" ? document.documentElement?.lang : "vi") || "vi"
  const isPreview = Boolean(options.isPreview)

  let res = rawTemplate !== undefined && rawTemplate !== null ? String(rawTemplate) : "Start Page"

  // 1. Time Tokens
  const h24 = String(now.getHours()).padStart(2, "0")
  const m = String(now.getMinutes()).padStart(2, "0")
  const s = String(now.getSeconds()).padStart(2, "0")
  const h12Num = now.getHours() % 12 || 12
  const ampm = now.getHours() >= 12 ? "PM" : "AM"
  const time12Str = `${h12Num}:${m} ${ampm}`

  res = res.replace(/{time}/gi, `${h24}:${m}`)
  res = res.replace(/{(time12|time_12)}/gi, time12Str)
  res = res.replace(/{(time_sec|time_seconds)}/gi, `${h24}:${m}:${s}`)

  // 2. Date Tokens
  const d = String(now.getDate()).padStart(2, "0")
  const mo = String(now.getMonth() + 1).padStart(2, "0")
  const y = String(now.getFullYear())

  res = res.replace(/{date}/gi, `${d}/${mo}`)
  res = res.replace(/{date_full}/gi, `${d}/${mo}/${y}`)
  res = res.replace(/{day}/gi, d)
  res = res.replace(/{month}/gi, mo)
  res = res.replace(/{year}/gi, y)

  // 3. Weekday
  const dayIndex = now.getDay()
  const weekdayStr = lang === "vi" ? VI_DAYS[dayIndex] : EN_DAYS[dayIndex]
  res = res.replace(/{(weekday|day_name)}/gi, weekdayStr)

  // 4. Greeting
  if (/{greeting}/i.test(res)) {
    const greeting = getLocalizedGreeting(now, lang)
    res = res.replace(/{greeting}/gi, greeting)
  }

  // 5. User Name
  if (/{(name|user)}/i.test(res)) {
    const userName = currentSettings.userName?.trim() || (lang === "vi" ? "Bạn" : "Friend")
    res = res.replace(/{(name|user)}/gi, userName)
  }

  // 6. Music
  if (/{music}/i.test(res)) {
    const musicStr = getCurrentMusicTitle(isPreview)
    res = res.replace(/{music}/gi, musicStr)
  }

  // 7. Weather
  if (/{weather}/i.test(res)) {
    const weatherStr = getCachedWeatherString()
    res = res.replace(/{weather}/gi, weatherStr)
  }

  // Trim extraneous double spaces created if optional tokens are empty
  return res.replace(/\s{2,}/g, " ").trim()
}

// ── Title Auto-Updater Controller ────────────────────────────────────────────
let titleUpdateTimer = null
let currentUpdaterCallback = null
let musicListenerAttached = false
let activeMusicHandler = null

/**
 * Starts or updates real-time background refreshing for page title
 * @param {Function} getTemplate - returns the raw title template
 * @param {Function} [onUpdate] - optional callback called when title updates
 */
export function startTitleAutoUpdater(getTemplate, onUpdate = null) {
  stopTitleAutoUpdater()

  if (typeof getTemplate !== "function") return
  currentUpdaterCallback = onUpdate

  const tick = () => {
    const template = getTemplate()
    if (!template) return
    const resolved = resolveDynamicTokens(template)
    if (typeof document !== "undefined") {
      document.title = resolved || "Start Page"
    }
    if (typeof currentUpdaterCallback === "function") {
      currentUpdaterCallback(resolved, template)
    }
  }

  // First immediate tick
  tick()

  // Listen to music change events to refresh title immediately
  activeMusicHandler = () => {
    const template = getTemplate()
    if (template && /{music}/i.test(template)) {
      tick()
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("musicTrackChange", activeMusicHandler)
    musicListenerAttached = true
  }

  const template = getTemplate()
  if (!hasTimeDependentTokens(template)) {
    return
  }

  const intervalMs = needsSecondPrecision(template) ? 1000 : 15000
  titleUpdateTimer = setInterval(tick, intervalMs)
}

/**
 * Stops any active title auto-updater timer and listeners
 */
export function stopTitleAutoUpdater() {
  if (titleUpdateTimer) {
    clearInterval(titleUpdateTimer)
    titleUpdateTimer = null
  }
  if (musicListenerAttached && activeMusicHandler && typeof window !== "undefined") {
    window.removeEventListener("musicTrackChange", activeMusicHandler)
    musicListenerAttached = false
    activeMusicHandler = null
  }
}
