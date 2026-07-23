import { clockElement, dateElement, fadeToggle } from "../utils/dom.js"
import { DEFAULT_MEDIA_ORB_IMAGE_URL, getSettings } from "../services/state.js"
import { geti18n } from "../services/i18n.js"
import { makeDraggable } from "../utils/draggable.js"
import { convertSolar2Lunar } from "../utils/lunarCalendar.js"

let lunarHideTimer = null
let c4BombArmed = false
let c4BombPulseUntil = 0
let c4BombInput = ""
let c4BombUnlocked = false
let c4BombLeverOn = false
let c4BombDetonateAt = 0
let c4BombExploded = false
let c4BombWrongUntil = 0
let c4BombLastBeepSecond = null
let c4BombBeepRunId = 0
let c4BombFastTickTimer = null

const C4_BOMB_PASSCODE = "7355608"
const C4_BOMB_FUSE_MS = 11500
const C4_BOMB_BEEP_URL =
  "https://raw.githubusercontent.com/ChickenSoup269/imagesForRepo/main/sounds/beep.mp3"
const C4_BOMB_WRONG_URL =
  "https://raw.githubusercontent.com/ChickenSoup269/imagesForRepo/main/sounds/alexis_gaming_cam-among-us-alarme-sabotage-393155.mp3"
const C4_BOMB_PLANT_URL =
  "https://raw.githubusercontent.com/ChickenSoup269/imagesForRepo/main/sounds/counter-strike-c4-sound.mp3"

function playC4BombSound(url, volume = 0.5) {
  try {
    const audio = new Audio(url)
    audio.volume = volume
    audio.play().catch(() => {})
  } catch (error) {
    // Sound is optional; keep the clock interaction working if playback is blocked.
  }
}

function playC4BombBeep() {
  playC4BombSound(C4_BOMB_BEEP_URL, 0.5)
}

function playC4BombWrongSound() {
  playC4BombSound(C4_BOMB_WRONG_URL, 0.65)
}

function playC4BombPlantSound() {
  playC4BombSound(C4_BOMB_PLANT_URL, 0.75)
}

function playC4BombCountdownBeep(remainingSeconds) {
  c4BombBeepRunId += 1
  const runId = c4BombBeepRunId
  const offsets =
    remainingSeconds > 8 ? [0] : remainingSeconds > 4 ? [0, 360] : [0, 220, 440]

  offsets.forEach((offset) => {
    setTimeout(() => {
      if (runId !== c4BombBeepRunId || !c4BombDetonateAt) return
      playC4BombBeep()
    }, offset)
  })
}

function clearC4BombFastTick() {
  if (!c4BombFastTickTimer) return
  cancelAnimationFrame(c4BombFastTickTimer)
  c4BombFastTickTimer = null
}

function scheduleC4BombFastTick() {
  if (c4BombFastTickTimer) return

  c4BombFastTickTimer = requestAnimationFrame(() => {
    c4BombFastTickTimer = null
    if (c4BombDetonateAt) updateTime()
  })
}

function getC4BombFastTicks(remainingMs) {
  if (remainingMs <= 0) return "00"

  const withinSecondMs = remainingMs % 1000 || 1000
  return String(Math.max(0, Math.floor((withinSecondMs - 1) / 10))).padStart(
    2,
    "0",
  )
}

function isEditableKeyboardTarget(target) {
  if (!target) return false
  const tagName = target.tagName?.toLowerCase?.()
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  )
}

function isC4BombKeyboardEnabled(event) {
  if (isEditableKeyboardTarget(event.target)) return false

  const settings = getSettings()
  if (settings.dateClockStyle !== "c4-bomb") return false
  if ((settings.clockDisplayMode || "all") !== "all") return false

  const clockFadeWrap = document.getElementById("clock-fade-wrap")
  if (clockFadeWrap?.classList.contains("is-hidden")) return false

  return Boolean(clockElement?.querySelector(".c4-bomb-clock"))
}

function inputC4BombDigit(digit) {
  if (
    !/^\d$/.test(digit) ||
    c4BombUnlocked ||
    c4BombExploded ||
    c4BombDetonateAt
  ) {
    return false
  }

  playC4BombBeep()
  c4BombInput = `${c4BombInput}${digit}`.slice(0, C4_BOMB_PASSCODE.length)
  c4BombWrongUntil = 0

  if (c4BombInput === C4_BOMB_PASSCODE) {
    c4BombUnlocked = true
    c4BombPulseUntil = Date.now() + 900
  } else if (c4BombInput.length >= C4_BOMB_PASSCODE.length) {
    c4BombInput = ""
    c4BombWrongUntil = Date.now() + 1100
    c4BombPulseUntil = Date.now() + 500
    playC4BombWrongSound()
  }

  updateTime()
  return true
}

function backspaceC4BombInput() {
  if (c4BombUnlocked || c4BombExploded || c4BombDetonateAt || !c4BombInput) {
    return false
  }

  c4BombInput = c4BombInput.slice(0, -1)
  c4BombWrongUntil = 0
  c4BombPulseUntil = Date.now() + 220
  playC4BombBeep()
  updateTime()
  return true
}

function resetC4BombInput() {
  if (!c4BombInput && !c4BombWrongUntil) return false

  c4BombInput = ""
  c4BombWrongUntil = 0
  c4BombPulseUntil = Date.now() + 300
  updateTime()
  return true
}

function toggleC4BombLever() {
  if (!c4BombUnlocked || c4BombExploded || c4BombDetonateAt) return false

  c4BombLeverOn = !c4BombLeverOn
  c4BombPulseUntil = Date.now() + 700
  updateTime()
  return true
}

function triggerC4BombAction() {
  if (c4BombExploded) {
    c4BombExploded = false
    c4BombWrongUntil = 0
    c4BombLastBeepSecond = null
    c4BombBeepRunId += 1
    clearC4BombFastTick()
    c4BombPulseUntil = Date.now() + 700
    updateTime()
    return true
  }

  if (!c4BombUnlocked) return false

  if (c4BombArmed || c4BombDetonateAt) {
    c4BombArmed = false
    c4BombLeverOn = false
    c4BombDetonateAt = 0
    c4BombLastBeepSecond = null
    c4BombBeepRunId += 1
    clearC4BombFastTick()
  } else if (c4BombLeverOn) {
    c4BombArmed = true
    c4BombDetonateAt = Date.now() + C4_BOMB_FUSE_MS
    c4BombLastBeepSecond = null
    c4BombBeepRunId += 1
    playC4BombPlantSound()
    scheduleC4BombFastTick()
  } else {
    return false
  }

  c4BombPulseUntil = Date.now() + 900
  updateTime()
  return true
}

function setClockLunarVisibility(element, visible) {
  if (!element) return

  if (visible) {
    if (lunarHideTimer) {
      clearTimeout(lunarHideTimer)
      lunarHideTimer = null
    }
    element.style.display = "inline-flex"
    requestAnimationFrame(() => {
      element.classList.add("is-visible")
    })
    return
  }

  element.classList.remove("is-visible")
  if (lunarHideTimer) clearTimeout(lunarHideTimer)
  lunarHideTimer = setTimeout(() => {
    if (!element.classList.contains("is-visible")) {
      element.style.display = "none"
    }
    lunarHideTimer = null
  }, 260)
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function applyHuePerCharacter(target, seed = 0) {
  if (!target) return

  const textNodes = []
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!node.nodeValue || node.nodeValue.length === 0 || !parent) {
        return NodeFilter.FILTER_REJECT
      }

      if (!node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT
      }

      if (parent.classList.contains("clock-hue-char")) {
        return NodeFilter.FILTER_REJECT
      }

      return NodeFilter.FILTER_ACCEPT
    },
  })

  let currentNode = walker.nextNode()
  while (currentNode) {
    textNodes.push(currentNode)
    currentNode = walker.nextNode()
  }

  let hueIndex = 0
  textNodes.forEach((node) => {
    const text = node.nodeValue || ""
    const fragment = document.createDocumentFragment()

    Array.from(text).forEach((char) => {
      if (!char.trim()) {
        fragment.appendChild(document.createTextNode(char))
        return
      }

      const hue = (seed + hueIndex * 43) % 360

      if (node.parentElement && node.parentElement.classList.contains("char-anim")) {
        node.parentElement.style.setProperty("--char-hue", String(hue))
        node.parentElement.style.setProperty("--char-delay", `${hueIndex * 0.1}s`)
        node.parentElement.style.setProperty("--time-offset", `${(Date.now() % 8000) / 1000}s`)
        node.parentElement.classList.add("multi-color-char")
        fragment.appendChild(document.createTextNode(char))
      } else {
        const span = document.createElement("span")
        span.className = "clock-hue-char"
        span.style.setProperty("--char-hue", String(hue))
        span.style.setProperty("--char-delay", `${hueIndex * 0.1}s`)
        span.style.setProperty("--time-offset", `${(Date.now() % 8000) / 1000}s`)
        span.textContent = char
        fragment.appendChild(span)
      }
      hueIndex += 1
    })

    node.parentNode?.replaceChild(fragment, node)
  })
}

function applyHueMode(settings) {
  const mode = settings.hueTextMode || "off"
  if (mode === "off") return

  const style = settings.dateClockStyle || "default"
  const displayMode = settings.clockDisplayMode || "all"

  // 1. Determine targets for Clock effect
  const clockTargets = []
  if (mode === "clock" || mode === "both") {
    if (
      style === "default" ||
      style === "glow" ||
      style === "minimal" ||
      style === "glass" ||
      style === "analog"
    ) {
      clockTargets.push(clockElement)
    } else if (style === "round" || style === "square") {
      clockTargets.push(clockElement.querySelector(".clock-time-main"))
      clockTargets.push(clockElement.querySelector(".clock-time-ampm"))
    } else if (style === "cool") {
      clockTargets.push(clockElement.querySelector(".cool-time"))
    } else if (style === "sidestyle") {
      clockTargets.push(clockElement.querySelector(".clock-sidestyle-time"))
    } else if (style === "jp-style") {
      clockTargets.push(clockElement.querySelector(".clock-jp-time"))
    } else if (style === "sidebar") {
      clockTargets.push(clockElement.querySelector(".clock-sidebar-time"))
    } else if (style === "fliqlo") {
      clockTargets.push(clockElement.querySelector(".fliqlo-time"))
    } else if (style === "neon-grid") {
      clockTargets.push(clockElement.querySelector(".neon-grid-time"))
    } else if (style === "terminal") {
      clockTargets.push(clockElement.querySelector(".terminal-clock-time"))
    } else if (style === "c4-bomb") {
      clockTargets.push(clockElement.querySelector(".c4-bomb-time"))
    } else if (style === "holo-ring") {
      clockTargets.push(clockElement.querySelector(".holo-ring-time"))
    } else if (style === "media-orb") {
      clockTargets.push(clockElement.querySelector(".media-orb-time"))
    } else if (style === "prism-stack") {
      clockTargets.push(clockElement.querySelector(".prism-stack-time"))
    } else if (style === "metro-panel") {
      clockTargets.push(clockElement.querySelector(".metro-panel-time"))
    } else if (style === "aurora-ribbon") {
      clockTargets.push(clockElement.querySelector(".aurora-ribbon-time"))
    } else if (style === "lunar-orbit") {
      clockTargets.push(clockElement.querySelector(".lunar-orbit-time"))
    } else if (style === "cartoon") {
      clockTargets.push(clockElement.querySelector(".cartoon-time"))
    }
  }

  // 2. Determine targets for Date effect
  const dateTargets = []
  if (mode === "date" || mode === "both") {
    // In Weekday-only mode OR Weekday-style, the weekday is always in dateElement
    if (displayMode === "weekday" || style === "weekday-style") {
      dateTargets.push(dateElement)
    } else {
      if (
        style === "default" ||
        style === "glow" ||
        style === "minimal" ||
        style === "glass"
      ) {
        dateTargets.push(dateElement)
      } else if (style === "round" || style === "square") {
        dateTargets.push(clockElement.querySelector(".clock-date-secondary"))
      } else if (style === "cool") {
        dateTargets.push(clockElement.querySelector(".cool-dayname"))
        dateTargets.push(clockElement.querySelector(".cool-date"))
      } else if (style === "sidestyle") {
        dateTargets.push(clockElement.querySelector(".clock-sidestyle-day"))
        dateTargets.push(clockElement.querySelector(".clock-sidestyle-date"))
      } else if (style === "jp-style") {
        dateTargets.push(clockElement.querySelector(".clock-jp-day-left"))
        dateTargets.push(clockElement.querySelector(".clock-jp-date"))
      } else if (style === "sidebar") {
        dateTargets.push(clockElement.querySelector(".clock-sidebar-date"))
      } else if (style === "fliqlo") {
        dateTargets.push(clockElement.querySelector(".fliqlo-date"))
      } else if (style === "neon-grid") {
        dateTargets.push(clockElement.querySelector(".neon-grid-date"))
        dateTargets.push(clockElement.querySelector(".neon-grid-label"))
      } else if (style === "terminal") {
        dateTargets.push(clockElement.querySelector(".terminal-clock-meta"))
        dateTargets.push(clockElement.querySelector(".terminal-clock-date"))
      } else if (style === "c4-bomb") {
        dateTargets.push(clockElement.querySelector(".c4-bomb-status"))
        dateTargets.push(clockElement.querySelector(".c4-bomb-date"))
      } else if (style === "holo-ring") {
        dateTargets.push(clockElement.querySelector(".holo-ring-weekday"))
        dateTargets.push(clockElement.querySelector(".holo-ring-date"))
      } else if (style === "media-orb") {
        dateTargets.push(clockElement.querySelector(".media-orb-weekday"))
        dateTargets.push(clockElement.querySelector(".media-orb-date"))
      } else if (style === "prism-stack") {
        dateTargets.push(clockElement.querySelector(".prism-stack-date"))
      } else if (style === "metro-panel") {
        dateTargets.push(clockElement.querySelector(".metro-panel-date"))
      } else if (style === "aurora-ribbon") {
        dateTargets.push(clockElement.querySelector(".aurora-ribbon-weekday"))
        dateTargets.push(clockElement.querySelector(".aurora-ribbon-date"))
      } else if (style === "lunar-orbit") {
        dateTargets.push(clockElement.querySelector(".lunar-orbit-weekday"))
        dateTargets.push(clockElement.querySelector(".lunar-orbit-date-line"))
      } else if (style === "cartoon") {
        dateTargets.push(clockElement.querySelector(".cartoon-weekday"))
        dateTargets.push(clockElement.querySelector(".cartoon-date"))
      }
    }
  }

  // Apply effect to filtered valid targets
  clockTargets
    .filter((el) => el !== null)
    .forEach((el) => applyHuePerCharacter(el, 18))
  dateTargets
    .filter((el) => el !== null)
    .forEach((el) => applyHuePerCharacter(el, 198))
}

function formatViShortWeekday(str) {
  if (!str) return str
  return str
    .replace(/Thứ Hai/gi, "HAI")
    .replace(/Thứ Ba/gi, "BA")
    .replace(/Thứ Tư/gi, "TƯ")
    .replace(/Thứ Năm/gi, "NĂM")
    .replace(/Thứ Sáu/gi, "SÁU")
    .replace(/Thứ Bảy/gi, "BẢY")
    .replace(/Chủ Nhật/gi, "CN")
}

const MONTH_I18N_KEYS = [
  "calendar_month_january",
  "calendar_month_february",
  "calendar_month_march",
  "calendar_month_april",
  "calendar_month_may",
  "calendar_month_june",
  "calendar_month_july",
  "calendar_month_august",
  "calendar_month_september",
  "calendar_month_october",
  "calendar_month_november",
  "calendar_month_december",
]

const WEEKDAY_I18N_KEYS = [
  "calendar_weekday_sun",
  "calendar_weekday_mon",
  "calendar_weekday_tue",
  "calendar_weekday_wed",
  "calendar_weekday_thu",
  "calendar_weekday_fri",
  "calendar_weekday_sat",
]

const WEEKDAY_FULL_I18N_KEYS = [
  "clock_weekday_full_sun",
  "clock_weekday_full_mon",
  "clock_weekday_full_tue",
  "clock_weekday_full_wed",
  "clock_weekday_full_thu",
  "clock_weekday_full_fri",
  "clock_weekday_full_sat",
]

function getIntlLanguageCode(settings) {
  const language = settings.language || "en"
  if (language === "vi") return "vi-VN"
  if (language === "en") return "en-US"

  try {
    const supported = Intl.DateTimeFormat.supportedLocalesOf([language])
    if (supported.length > 0) return supported[0]
  } catch (e) {
    // Fall back below for custom language codes that are not valid BCP 47.
  }

  return "en-US"
}

function getClockDateLanguageCode(settings) {
  const language = settings.clockDateLanguage || "auto"
  if (language === "auto") return getIntlLanguageCode(settings)

  try {
    const supported = Intl.DateTimeFormat.supportedLocalesOf([language])
    if (supported.length > 0) return supported[0]
  } catch (e) {
    // Fall back below for invalid stored values.
  }

  return getIntlLanguageCode(settings)
}

function isCustomLanguage(settings) {
  return Boolean(settings.customLanguages?.[settings.language])
}

function getCustomTranslation(settings, key) {
  const translations =
    settings.customLanguages?.[settings.language]?.translations
  return typeof translations?.[key] === "string" ? translations[key] : ""
}

function getZonedDateParts(date, tz) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: tz,
  }).formatToParts(date)

  return {
    day: parts.find((part) => part.type === "day")?.value || "01",
    month: parts.find((part) => part.type === "month")?.value || "01",
    year: parts.find((part) => part.type === "year")?.value || "",
  }
}

function getZonedDate(date, tz) {
  return tz ? new Date(date.toLocaleString("en-US", { timeZone: tz })) : date
}

function getVietnameseLunarParts(date, tz) {
  const zonedDate = getZonedDate(date, tz)
  const lunar = convertSolar2Lunar(
    zonedDate.getDate(),
    zonedDate.getMonth() + 1,
    zonedDate.getFullYear(),
  )
  const leapText = lunar.leap ? "Nhuận " : ""

  return {
    day: String(lunar.day).padStart(2, "0"),
    month: `${leapText}Tháng ${lunar.month}`,
    line: `${lunar.day}/${lunar.month}${lunar.leap ? " nhuận" : ""} Âm lịch`,
    label: "Âm lịch",
  }
}

function escapeAttribute(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function getZonedWeekdayIndex(date, tz) {
  if (!tz) return date.getDay()

  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: tz,
  }).format(date)
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday)
}

function getLocalizedMonthName(date, lang, tz, settings, style = "long") {
  const i18n = geti18n()
  const monthIndex = tz
    ? Number(getZonedDateParts(date, tz).month) - 1
    : date.getMonth()
  const translatedMonth = i18n[MONTH_I18N_KEYS[monthIndex]]

  if (translatedMonth && (isCustomLanguage(settings) || lang === "vi-VN")) {
    return translatedMonth
  }

  return date.toLocaleDateString(lang, { month: style, timeZone: tz })
}

function getSafeWeekday(date, lang, isShort, tz, settings = getSettings()) {
  const i18n = geti18n()
  const weekdayIndex = getZonedWeekdayIndex(date, tz)
  const weekdayKey = isShort
    ? WEEKDAY_I18N_KEYS[weekdayIndex]
    : WEEKDAY_FULL_I18N_KEYS[weekdayIndex]
  const translatedWeekday = isCustomLanguage(settings)
    ? getCustomTranslation(settings, weekdayKey)
    : i18n[weekdayKey]

  if (translatedWeekday && (isCustomLanguage(settings) || isShort)) {
    return `<span class="weekday-part">${translatedWeekday}</span>`
  }

  const format = isShort && lang !== "vi-VN" ? "short" : "long"
  let str = date.toLocaleDateString(lang, { weekday: format, timeZone: tz })
  if (isShort && lang === "vi-VN") {
    str = formatViShortWeekday(str)
  }
  return `<span class="weekday-part">${str}</span>`
}

function getCustomDateString(now, langCode, tz, settings, formatOverride) {
  const format = formatOverride || settings.dateFormat || "full"
  // If user wants to replace Gregorian date with Lunar date in clock
  if (
    settings.showClockLunarCalendar &&
    settings.showClockLunarMode === "replace"
  ) {
    const zonedNow = getZonedDate(now, tz)
    const lunar = convertSolar2Lunar(
      zonedNow.getDate(),
      zonedNow.getMonth() + 1,
      zonedNow.getFullYear(),
    )
    const leapStr = lunar.leap ? " (nhuận)" : ""
    const weekdayStr = getSafeWeekday(
      now,
      langCode,
      settings.shortWeekday,
      tz,
      settings,
    ).replace(/^<span class=\"weekday-part\">|<\/span>$/g, "")
    return `<span class="weekday-part"> ${weekdayStr} </span>, <span class="clock-lunar-replace">${lunar.day}/${lunar.month}${leapStr} Âm lịch</span>`
  }
  let dateString = ""

  if (format === "short") {
    dateString = now.toLocaleDateString("en-GB", { timeZone: tz })
  } else if (format === "us") {
    dateString = now.toLocaleDateString("en-US", { timeZone: tz })
  } else if (format === "iso") {
    let isoDate = now
    if (tz) isoDate = new Date(now.toLocaleString("en-US", { timeZone: tz }))
    dateString = isoDate.toISOString().split("T")[0]
  } else if (format === "year") {
    let yearDate = now
    if (tz) yearDate = new Date(now.toLocaleString("en-US", { timeZone: tz }))
    dateString = String(yearDate.getFullYear())
  } else if (format === "weekday") {
    dateString = getSafeWeekday(
      now,
      langCode,
      settings.shortWeekday,
      tz,
      settings,
    )
  } else {
    // "full"
    const weekdayStr = getSafeWeekday(
      now,
      langCode,
      settings.shortWeekday,
      tz,
      settings,
    ).replace(/^<span class="weekday-part">|<\/span>$/g, "")
    let dayMonthYear = ""

    if (isCustomLanguage(settings)) {
      const parts = getZonedDateParts(now, tz)
      const monthName = getLocalizedMonthName(now, langCode, tz, settings)
      dayMonthYear = `${parts.day} ${monthName} ${parts.year}`
    } else {
      dayMonthYear = now.toLocaleDateString(langCode, {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: tz,
      })
    }

    dateString = `<span class="weekday-part"> ${weekdayStr} </span>, ${dayMonthYear}`
  }
  return dateString
}

function _buildSidestyleDateStr(now, langCode, tz, settings) {
  const format = settings.dateFormat || "full"
  let dateStr = ""

  if (format === "full") {
    // Retain the specific layout used originally for "full" sidestyle date
    const enMonths = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]
    if (langCode === "vi-VN") {
      dateStr = now.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: tz,
      })
    } else {
      dateStr = `${now.getDate()} ${enMonths[now.getMonth()]} ${now.getFullYear()}`
    }
  } else {
    dateStr = getCustomDateString(now, langCode, tz, settings)
  }

  return `<div class="clock-sidestyle-date">${dateStr}</div>`
}

function getClockLabel(key, fallback) {
  return geti18n()[key] || fallback
}

// --- Space Concentric Chrono ---
const scMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const scWeekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const scGetOrdinal = (d) => {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
};
const scDays = Array.from({length: 31}, (_, i) => `${i + 1}${scGetOrdinal(i + 1)}`);
const scHours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
const scMinutes = Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'));
const scSeconds = Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'));
let spaceConcentricHtmlCache = null;
let spaceConcentricLangCache = null;


// Cache Intl.DateTimeFormat instances to avoid expensive re-construction every second
const _intlCache = new Map()
function getCachedFormatter(locale, options) {
  const key = locale + JSON.stringify(options)
  if (!_intlCache.has(key)) {
    _intlCache.set(key, new Intl.DateTimeFormat(locale, options))
  }
  return _intlCache.get(key)
}


export function updateTime() {
  if (!clockElement) return
  // Skip heavy rendering when tab is hidden to save CPU/battery
  if (document.hidden) return
  const settings = getSettings()
  const displayMode = settings.clockDisplayMode || "all"
  // Skip full render when clock is set to hide and no custom title needs updating
  if (displayMode === "hide" && !settings.showCustomTitle) {
    const clockFadeWrap = document.getElementById("clock-fade-wrap")
    if (clockFadeWrap) clockFadeWrap.classList.add("is-hidden")
    return
  }
  const now = new Date()

  const langCode = getClockDateLanguageCode(settings)
  const dateLangCode = getClockDateLanguageCode(settings)
  const dateClockStyle = settings.dateClockStyle || "default"
  const timerLabel = getClockLabel("clock_label_timer", "TIMER")
  const countdownLabel = getClockLabel("clock_label_countdown", "COUNTDOWN")
  const timerRunningLabel = getClockLabel(
    "clock_label_timer_running",
    "TIMER RUNNING",
  )
  const timerShortLabel = getClockLabel("clock_label_timer_short", "TMR")

  // TIMER MODE LOGIC
  let isTimer = false
  let timerH = 0,
    timerM = 0,
    timerS = 0
  let timerString = ""

  if (settings.clockTimerMode && window.activeTimer) {
    isTimer = true
    const timeLeft = window.activeTimer.timeLeft
    timerH = Math.floor(timeLeft / 3600)
    timerM = Math.floor((timeLeft % 3600) / 60)
    timerS = timeLeft % 60

    const hhT = timerH.toString().padStart(2, "0")
    const mmT = timerM.toString().padStart(2, "0")
    const ssT = timerS.toString().padStart(2, "0")

    if (timerH > 0) {
      timerString = `${hhT}:${mmT}:${ssT}`
    } else {
      timerString = `${mmT}:${ssT}`
    }
  }

  const isFramedClockStyle =
    dateClockStyle === "round" || dateClockStyle === "square"
  const shouldShowDate =
    settings.showDate !== false && settings.showGregorian !== false && !isTimer
  const use12Hour = settings.timeFormat === "12h"
  const tz =
    settings.timezone && settings.timezone !== "local"
      ? settings.timezone
      : undefined

  const timeOptions = settings.hideSeconds
    ? { hour12: use12Hour, hour: "2-digit", minute: "2-digit", timeZone: tz }
    : {
        hour12: use12Hour,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: tz,
      }

  const timeString = isTimer
    ? timerString
    : now.toLocaleTimeString(langCode, timeOptions)

  // Extract time parts for styles that need them
  let hh,
    mm,
    ss,
    ampm = ""
  if (isTimer) {
    hh = timerH.toString().padStart(2, "0")
    mm = timerM.toString().padStart(2, "0")
    ss = timerS.toString().padStart(2, "0")
    ampm = ""
  } else {
    const parts = getCachedFormatter(langCode, timeOptions).formatToParts(now)
    hh = parts.find((p) => p.type === "hour")?.value || "00"
    mm = parts.find((p) => p.type === "minute")?.value || "00"
    ss = parts.find((p) => p.type === "second")?.value || ""
    ampm = parts.find((p) => p.type === "dayPeriod")?.value || ""
  }

  // Keep layout stable by toggling visibility class instead of display.
  const shouldHideClock = displayMode === "hide" || displayMode === "weekday"
  const keepOnlyWeekday = displayMode === "weekday"

  const clockFadeWrap = document.getElementById("clock-fade-wrap")
  if (clockFadeWrap) {
    clockFadeWrap.classList.toggle("is-hidden", shouldHideClock)
  }

  if (!isFramedClockStyle) {
    document.body.classList.remove("framed-theme-light", "framed-theme-dark")
  }

  if (dateClockStyle === "analog") {
    const hours = isTimer ? timerH % 12 : parseInt(hh) % 12
    const minutes = isTimer ? timerM : parseInt(mm)
    const seconds = isTimer ? timerS : parseInt(ss) || 0
    const markerMode = settings.analogMarkerMode || "quarters"
    const hourRotation = hours * 30 + minutes * 0.5
    const minuteRotation = minutes * 6 + seconds * 0.1
    const secondRotation = seconds * 6
    const secondClass = settings.hideSeconds ? " no-seconds" : ""
    let markerHtml = ""

    if (markerMode === "full") {
      markerHtml = Array.from({ length: 12 }, (_, index) => {
        const value = index + 1
        const angle = (value % 12) * 30
        const rad = (angle * Math.PI) / 180
        const radius = 42
        const x = 50 + radius * Math.sin(rad)
        const y = 50 - radius * Math.cos(rad)
        return `<span class="analog-marker analog-marker-full" style="--x:${x}%; --y:${y}%">${value}</span>`
      }).join("")
    } else if (markerMode === "quarterTicks") {
      markerHtml = `
        <span class="analog-quarter-tick tick-12"></span>
        <span class="analog-quarter-tick tick-3"></span>
        <span class="analog-quarter-tick tick-6"></span>
        <span class="analog-quarter-tick tick-9"></span>
      `
    } else if (markerMode === "ticks12") {
      markerHtml = Array.from({ length: 12 }, (_, index) => {
        const radius = 45 // percentage distance from center
        const angle = index * 30 // 0, 30, 60...
        const rad = (angle * Math.PI) / 180
        const x = 50 + radius * Math.sin(rad)
        const y = 50 - radius * Math.cos(rad)
        const isQuarter = index % 3 === 0
        const w = isQuarter ? 2 : 1
        const h = isQuarter ? 14 : 8
        return `<span class="analog-quarter-tick" style="position: absolute; left: ${x}%; top: ${y}%; transform: translate(-50%, -50%) rotate(${angle}deg); width: ${w}px; height: ${h}px; z-index: 1;"></span>`
      }).join("")
    } else if (markerMode === "quarters") {
      markerHtml = `
        <span class="analog-marker marker-12">12</span>
        <span class="analog-marker marker-3">3</span>
        <span class="analog-marker marker-6">6</span>
        <span class="analog-marker marker-9">9</span>
      `
    }

    clockElement.innerHTML = `
      <div class="analog-clock marker-mode-${markerMode}${secondClass}">
        ${markerHtml}
        <div class="analog-hand hour" style="--rotation:${hourRotation}deg"></div>
        <div class="analog-hand minute" style="--rotation:${minuteRotation}deg"></div>
        <div class="analog-hand second" style="--rotation:${secondRotation}deg"></div>
        <div class="analog-center-dot"></div>
      </div>
    `
  } else if (dateClockStyle === "cool") {
    const hour24 = isTimer ? timerH : now.getHours()

    let greetingKey = "greeting_evening"
    let customGreeting = ""
    if (hour24 < 12) {
      greetingKey = "greeting_morning"
      customGreeting = settings.coolGreetingMorning
    } else if (hour24 < 18) {
      greetingKey = "greeting_afternoon"
      customGreeting = settings.coolGreetingAfternoon
    } else {
      greetingKey = "greeting_evening"
      customGreeting = settings.coolGreetingEvening
    }

    const i18n = geti18n()
    const greeting = isTimer
      ? i18n["quick_access_timer"] || "Timer"
      : (customGreeting && customGreeting.trim() !== "" ? customGreeting.trim() : (i18n[greetingKey] || "Hello"))

    const dayName = getSafeWeekday(
      now,
      dateLangCode,
      settings.shortWeekday,
      tz,
      settings,
    )
    const format = settings.dateFormat || "full"
    let dateHtml = ""
    if (format === "full") {
      const day = getZonedDateParts(now, tz).day
      const monthName = getLocalizedMonthName(now, dateLangCode, tz, settings)
      dateHtml = `${day} - ${monthName}`
    } else {
      dateHtml = getCustomDateString(now, dateLangCode, tz, settings)
    }

    const coolBarTop = settings.coolBarSymbolTop !== undefined ? settings.coolBarSymbolTop : "|"
    const coolBarBottom = settings.coolBarSymbolBottom !== undefined ? settings.coolBarSymbolBottom : "|"
    const coolBarScale = settings.coolBarScale !== undefined ? settings.coolBarScale : 2.5

    clockElement.innerHTML = `
      <div class="cool-style-wrapper">
        <div class="cool-bar top" style="transform: scaleY(${coolBarScale})">${coolBarTop}</div>
        <div class="cool-greeting">${greeting}</div>
        ${
          shouldShowDate
            ? `
          <div class="cool-dayname">${dayName}</div>
          <div class="cool-date">${dateHtml}</div>
        `
            : ""
        }
        <div class="cool-time">${timeString}</div>
        <div class="cool-bar bottom" style="transform: scaleY(${coolBarScale})">${coolBarBottom}</div>
      </div>
    `
  } else if (dateClockStyle === "custom-angle") {
    let datePart = ""
    if (shouldShowDate && settings.customAngleShowDate !== false) {
      datePart = `<div class="custom-angle-date">${getCustomDateString(now, dateLangCode, settings.clockTimezone, settings)}</div>`
    }
    clockElement.innerHTML = `
      <div class="custom-angle-wrapper">
        <div class="custom-angle-time">${timeString}</div>
        ${datePart}
      </div>
    `
  } else if (dateClockStyle === "code") {
    const lang = settings.codeClockLanguage || "javascript"
    const displayS = ss ? ss : "00"
    const showDate = settings.codeClockShowDate !== false && !isTimer
    let dateFields = ""
    let codeHtml = ""

    if (showDate) {
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, "0")
      const day = String(now.getDate()).padStart(2, "0")
      
      if (lang === "python") {
        dateFields = `,
        <span class="code-string">"year"</span>: <span class="code-number">${year}</span>,
        <span class="code-string">"month"</span>: <span class="code-number">${month}</span>,
        <span class="code-string">"day"</span>: <span class="code-number">${day}</span>`
      } else if (lang === "java") {
        dateFields = `
    <span class="code-keyword">int</span> year = <span class="code-number">${year}</span>;
    <span class="code-keyword">int</span> month = <span class="code-number">${month}</span>;
    <span class="code-keyword">int</span> day = <span class="code-number">${day}</span>;`
      } else if (lang === "cpp") {
        dateFields = `
    <span class="code-keyword">int</span> year = <span class="code-number">${year}</span>;
    <span class="code-keyword">int</span> month = <span class="code-number">${month}</span>;
    <span class="code-keyword">int</span> day = <span class="code-number">${day}</span>;`
      } else {
        dateFields = `,
  <span class="code-property">year</span>: <span class="code-number">${year}</span>,
  <span class="code-property">month</span>: <span class="code-number">${month}</span>,
  <span class="code-property">day</span>: <span class="code-number">${day}</span>`
      }
    }

    if (lang === "python") {
      codeHtml = `
<span class="code-keyword">def</span> <span class="code-function">get_time</span>():
    <span class="code-keyword">return</span> {
        <span class="code-string">"hours"</span>: <span class="code-number">${hh}</span>,
        <span class="code-string">"minutes"</span>: <span class="code-number">${mm}</span>,
        <span class="code-string">"seconds"</span>: <span class="code-number">${displayS}</span>${dateFields}
    }`
    } else if (lang === "java") {
      codeHtml = `
<span class="code-keyword">class</span> <span class="code-class">Clock</span> {
    <span class="code-keyword">int</span> hours = <span class="code-number">${hh}</span>;
    <span class="code-keyword">int</span> minutes = <span class="code-number">${mm}</span>;
    <span class="code-keyword">int</span> seconds = <span class="code-number">${displayS}</span>;${dateFields}
}`
    } else if (lang === "cpp") {
      codeHtml = `
<span class="code-keyword">struct</span> <span class="code-class">Time</span> {
    <span class="code-keyword">int</span> h = <span class="code-number">${hh}</span>;
    <span class="code-keyword">int</span> m = <span class="code-number">${mm}</span>;
    <span class="code-keyword">int</span> s = <span class="code-number">${displayS}</span>;${dateFields}
};`
    } else {
      codeHtml = `
<span class="code-keyword">const</span> time = {
  <span class="code-property">hours</span>: <span class="code-number">${hh}</span>,
  <span class="code-property">minutes</span>: <span class="code-number">${mm}</span>,
  <span class="code-property">seconds</span>: <span class="code-number">${displayS}</span>${dateFields}
};`
    }

    clockElement.innerHTML = `
      <div class="code-style-wrapper">
        <pre><code class="code-clock-block">${codeHtml}</code></pre>
      </div>
    `
  } else if (dateClockStyle === "sidestyle") {
    let finalTimeStr = timeString
    if (settings.sidestyleAlign === "center" && settings.sidestyleNoBorder) {
      finalTimeStr = `- ${timeString} -`
    }

    const dayName = getSafeWeekday(
      now,
      dateLangCode,
      settings.shortWeekday,
      tz,
      settings,
    ).toUpperCase()

    clockElement.innerHTML = `
      <div class="clock-sidestyle">
        <div class="clock-sidestyle-day">${isTimer ? countdownLabel : dayName}</div>
        ${shouldShowDate ? _buildSidestyleDateStr(now, dateLangCode, tz, settings) : ""}
        <div class="clock-sidestyle-time">${finalTimeStr}</div>
      </div>
    `
  } else if (dateClockStyle === "jp-style") {
    const jpLangOption = settings.jpStyleLanguage || "auto"
    const displayLang = jpLangOption === "ja" ? "ja-JP" : dateLangCode

    let dayName = ""
    if (isTimer) {
      dayName = timerLabel
    } else if (jpLangOption === "ja") {
      const jpDays = [
        "日曜日",
        "月曜日",
        "火曜日",
        "水曜日",
        "木曜日",
        "金曜日",
        "土曜日",
      ]
      dayName = settings.shortWeekday
        ? jpDays[now.getDay()].replace("曜日", "")
        : jpDays[now.getDay()]
    } else {
      dayName = getSafeWeekday(
        now,
        displayLang,
        settings.shortWeekday,
        tz,
        settings,
      ).toUpperCase()
    }

    const zonedParts = getZonedDateParts(now, tz)
    const month = zonedParts.month
    const dayNum = zonedParts.day

    const format = settings.dateFormat || "full"
    let dateHtml = ""

    if (format === "full") {
      if (displayLang === "ja-JP") {
        dateHtml = `<span class="clock-jp-month">${month}</span><span class="jp-symbol">月</span><span class="clock-jp-daynum">${dayNum}</span><span class="jp-symbol">日</span>`
      } else if (displayLang === "vi-VN") {
        dateHtml = `<span class="clock-jp-daynum" style="margin-right: 0.5em;">Ngày ${dayNum}</span><span class="clock-jp-month">Thg ${month}</span>`
      } else {
        const monthName = getLocalizedMonthName(now, displayLang, tz, settings)
        dateHtml = `<span class="clock-jp-month">${monthName}</span><span class="jp-symbol"> - </span><span class="clock-jp-daynum">${dayNum}</span>`
      }
    } else {
      dateHtml = `<span class="clock-jp-month" style="font-size: 0.85em; font-weight: normal;">${getCustomDateString(now, displayLang, tz, settings)}</span>`
    }

    clockElement.innerHTML = `
      <div class="clock-jp-style">
        <div class="clock-jp-row">
            <span class="clock-jp-day-left">${dayName}</span>
            <div class="clock-jp-col">
                <span class="clock-jp-time">${timeString}</span>
                ${shouldShowDate ? `<span class="clock-jp-date">${dateHtml}</span>` : ""}
            </div>
        </div>
      </div>
    `
  } else if (dateClockStyle === "round") {
    const parts = getZonedDateParts(now, tz)
    const day = parts.day
    const month = parts.month
    const year = parts.year
    const weekday = getSafeWeekday(
      now,
      dateLangCode,
      settings.shortWeekday,
      tz,
      settings,
    )

    const theme = settings.framedClockTheme || "light"
    document.body.classList.remove("framed-theme-light", "framed-theme-dark")
    document.body.classList.add(`framed-theme-${theme}`)

    clockElement.innerHTML = `
      <div class="round-clock-new-layout">
        <div class="round-clock-notch">
          <span class="round-clock-date-top">${isTimer ? timerLabel : `${day}/${month}`}</span>
        </div>
        <div class="round-clock-center">
          <div class="round-clock-time-row">
            <span class="round-clock-hhmm">${hh}:${mm}</span>
            <div class="round-clock-side-meta">
              <span class="round-clock-ampm-top">${ampm}</span>
              ${ss ? `<span class="round-clock-ss-bottom">${ss}</span>` : ""}
            </div>
          </div>
          <div class="round-clock-bottom-info">
            <span class="round-clock-footer-text">${isTimer ? countdownLabel : `${year} - ${weekday}`}</span>
          </div>
        </div>
      </div>
    `
  } else if (dateClockStyle === "square") {
    const parts = getZonedDateParts(now, tz)
    const day = parts.day
    const month = parts.month
    const year = parts.year
    const weekday = getSafeWeekday(
      now,
      dateLangCode,
      settings.shortWeekday,
      tz,
      settings,
    )

    const theme = settings.framedClockTheme || "light"
    document.body.classList.remove("framed-theme-light", "framed-theme-dark")
    document.body.classList.add(`framed-theme-${theme}`)

    clockElement.innerHTML = `
      <div class="square-clock-bold-layout">
        <div class="sq-top-row">
          <span class="sq-date-val">${isTimer ? timerLabel : `${day} / ${month}`}</span>
        </div>
        <div class="sq-main-row">
          <span class="sq-time-hhmm">${hh}:${mm}</span>
          <div class="sq-side-info">
            <span class="sq-ampm">${ampm}</span>
            ${ss ? `<span class="sq-ss">${ss}</span>` : ""}
          </div>
        </div>
        <div class="sq-bottom-row">
          <span class="sq-full-date">${isTimer ? countdownLabel : `${weekday.toUpperCase()} - ${year}`}</span>
        </div>
      </div>
    `
  } else if (dateClockStyle === "sidebar") {
    if (settings.sidebarClockFlip) {
      const dateParts = new Intl.DateTimeFormat(dateLangCode, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: tz,
      })
        .formatToParts(now)
        .filter((p) => p.type !== "literal")
      const zonedParts = getZonedDateParts(now, tz)
      const dVal =
        dateParts.find((p) => p.type === "day")?.value || zonedParts.day
      const mVal = isCustomLanguage(settings)
        ? getLocalizedMonthName(now, dateLangCode, tz, settings, "short")
        : dateParts.find((p) => p.type === "month")?.value || ""
      const yVal =
        dateParts.find((p) => p.type === "year")?.value || zonedParts.year

      clockElement.innerHTML = `
        <div class="clock-sidebar-style is-flipped">
          <div class="clock-sidebar-time">
            ${
              isTimer
                ? `<div class="clock-sidebar-unit">${timerShortLabel}</div>`
                : `
              ${dVal ? `<div class="clock-sidebar-unit">${dVal}</div>` : ""}
              ${mVal ? `<div class="clock-sidebar-unit" style="font-size: 0.6em; text-transform: uppercase;">${mVal}</div>` : ""}
              ${yVal ? `<div class="clock-sidebar-unit" style="font-size: 0.5em; opacity: 0.6;">${yVal}</div>` : ""}
            `
            }
          </div>
          <div class="clock-sidebar-date">${timeString}</div>
        </div>
      `
    } else {
      const dateHtml = shouldShowDate
        ? `<div class="clock-sidebar-date">${getCustomDateString(now, dateLangCode, tz, settings)}</div>`
        : ""
      clockElement.innerHTML = `
        <div class="clock-sidebar-style">
          <div class="clock-sidebar-time">
            <div class="clock-sidebar-unit clock-sidebar-hour">${hh}</div>
            <div class="clock-sidebar-unit clock-sidebar-minute">${mm}</div>
            ${ss ? `<div class="clock-sidebar-unit clock-sidebar-second">${ss}</div>` : ""}
            ${ampm ? `<div class="clock-sidebar-unit clock-sidebar-ampm">${ampm}</div>` : ""}
          </div>
          ${isTimer ? `<div class="clock-sidebar-date">${countdownLabel}</div>` : dateHtml}
        </div>
      `
    }
  } else if (dateClockStyle === "fliqlo") {
    const fliqloTheme = settings.fliqloTheme || "dark"
    document.body.classList.remove("fliqlo-theme-light", "fliqlo-theme-dark")
    document.body.classList.add(`fliqlo-theme-${fliqloTheme}`)

    if (settings.fliqloZenMode) {
      document.body.classList.add("fliqlo-zen-mode")
    } else {
      document.body.classList.remove("fliqlo-zen-mode")
    }

    document.body.classList.toggle(
      "fliqlo-transparent",
      settings.fliqloTransparent === true,
    )

    // Build flip cards for each digit
    const buildFlipCard = (digit, label) => {
      const prevKey = `_fliqlo_prev_${label}`
      const prev = clockElement[prevKey]
      clockElement[prevKey] = digit
      const changed = prev !== undefined && prev !== digit
      const animClass = changed ? " fliqlo-flip" : ""
      const oldDigit = prev !== undefined ? prev : digit
      return `
        <div class="fliqlo-card${animClass}" data-digit="${label}">
          <div class="fliqlo-card-top"><span>${digit}</span></div>
          <div class="fliqlo-card-bottom"><span>${oldDigit}</span></div>
          <div class="fliqlo-card-flip-top"><span>${oldDigit}</span></div>
          <div class="fliqlo-card-flip-bottom"><span>${digit}</span></div>
        </div>
      `
    }

    const hhCards = hh
      .split("")
      .map((d, i) => buildFlipCard(d, `h${i}`))
      .join("")
    const mmCards = mm
      .split("")
      .map((d, i) => buildFlipCard(d, `m${i}`))
      .join("")
    let ssHtml = ""
    if (ss) {
      ssHtml = `
        <span class="fliqlo-colon">:</span>
        <div class="fliqlo-group fliqlo-group-ss">
          ${ss
            .split("")
            .map((d, i) => buildFlipCard(d, `s${i}`))
            .join("")}
        </div>
      `
    }
    let ampmHtml = ampm ? `<span class="fliqlo-ampm">${ampm}</span>` : ""

    const dateStr = shouldShowDate
      ? `<div class="fliqlo-date">${getCustomDateString(now, langCode, tz, settings)}</div>`
      : ""

    clockElement.innerHTML = `
      <div class="fliqlo-wrapper">
        <div class="fliqlo-time">
          <div class="fliqlo-group">${hhCards}</div>
          <span class="fliqlo-colon">:</span>
          <div class="fliqlo-group">${mmCards}</div>
          ${ssHtml}
          ${ampmHtml}
        </div>
        ${isTimer ? `<div class="fliqlo-date">${countdownLabel}</div>` : dateStr}
      </div>
    `
  } else if (dateClockStyle === "cyber-pulse") {
    const dateStr = shouldShowDate
      ? getCustomDateString(now, langCode, tz, settings)
      : ""
    let cyberRoot = clockElement.querySelector(".cyber-pulse-clock")
    if (!cyberRoot) {
      clockElement.innerHTML = `
        <div class="cyber-pulse-clock">
          <div class="cyber-time-wrap">
            <span class="cyber-hh">${hh}</span>
            <div class="cyber-divider"><div class="cyber-pulse-line"></div></div>
            <span class="cyber-mm">${mm}</span>
            <span class="cyber-ss">${ss}</span>
            <span class="cyber-ampm">${ampm}</span>
          </div>
          <div class="cyber-date">${isTimer ? countdownLabel : dateStr}</div>
        </div>
      `
      cyberRoot = clockElement.querySelector(".cyber-pulse-clock")
    }

    const hhEl = cyberRoot.querySelector(".cyber-hh")
    if (hhEl && hhEl.textContent !== hh) hhEl.textContent = hh
    const mmEl = cyberRoot.querySelector(".cyber-mm")
    if (mmEl && mmEl.textContent !== mm) mmEl.textContent = mm
    const ssEl = cyberRoot.querySelector(".cyber-ss")
    if (ssEl) {
      if (ssEl.textContent !== ss) ssEl.textContent = ss
      ssEl.style.display = ss ? "inline-block" : "none"
    }
    const ampmEl = cyberRoot.querySelector(".cyber-ampm")
    if (ampmEl) {
      if (ampmEl.textContent !== ampm) ampmEl.textContent = ampm
      ampmEl.style.display = ampm ? "inline-block" : "none"
    }
    const dateEl = cyberRoot.querySelector(".cyber-date")
    if (dateEl) {
      const dTxt = isTimer ? countdownLabel : dateStr
      if (dateEl.getAttribute("data-raw-html") !== dTxt) { dateEl.innerHTML = dTxt; dateEl.setAttribute("data-raw-html", dTxt); }
      dateEl.style.display = dTxt ? "block" : "none"
    }
  } else if (dateClockStyle === "neon-grid") {
    const weekday = isTimer
      ? timerLabel
      : getSafeWeekday(
          now,
          langCode,
          settings.shortWeekday,
          tz,
          settings,
        ).toUpperCase()
    const dateStr = shouldShowDate
      ? getCustomDateString(now, langCode, tz, settings)
      : ""
    clockElement.innerHTML = `
      <div class="neon-grid-clock">
        <div class="neon-grid-label">${weekday}</div>
        <div class="neon-grid-time">
          <span class="neon-grid-hour">${hh}</span>
          <span class="neon-grid-separator">:</span>
          <span class="neon-grid-minute">${mm}</span>
          ${ss ? `<span class="neon-grid-second">${ss}</span>` : ""}
          ${ampm ? `<span class="neon-grid-ampm">${ampm}</span>` : ""}
        </div>
        ${isTimer ? `<div class="neon-grid-date">${countdownLabel}</div>` : dateStr ? `<div class="neon-grid-date">${dateStr}</div>` : ""}
      </div>
    `
  } else if (dateClockStyle === "terminal") {
    const weekday = isTimer
      ? timerLabel
      : getSafeWeekday(
          now,
          langCode,
          settings.shortWeekday,
          tz,
          settings,
        ).toUpperCase()
    const dateStr = shouldShowDate
      ? getCustomDateString(now, langCode, tz, settings)
      : ""
    const promptLabel = isTimer ? "timer" : "startpage"
    const terminalVariant = ["window", "linux", "macos"].includes(
      settings.terminalClockVariant,
    )
      ? settings.terminalClockVariant
      : "window"
    const terminalPrompt =
      terminalVariant === "linux" ? "user@startpage:~$" : "~/now"
    const terminalControls =
      terminalVariant === "macos"
        ? `
          <span class="terminal-dot terminal-dot-red"></span>
          <span class="terminal-dot terminal-dot-yellow"></span>
          <span class="terminal-dot terminal-dot-green"></span>`
        : `
          <span class="terminal-window-btn" aria-hidden="true">-</span>
          <span class="terminal-window-btn" aria-hidden="true">□</span>
          <span class="terminal-window-btn terminal-window-close" aria-hidden="true">×</span>`
    clockElement.innerHTML = `
      <div class="terminal-clock terminal-clock-${terminalVariant}">
        <div class="terminal-clock-bar">
          <span class="terminal-window-controls">${terminalControls}</span>
          <span class="terminal-clock-title">${promptLabel}.time</span>
        </div>
        <div class="terminal-clock-body">
          <div class="terminal-clock-meta">
            <span class="terminal-prompt">${terminalPrompt}</span>
            <span>${weekday}</span>
          </div>
          <div class="terminal-clock-time">
            <span class="terminal-clock-hour">${hh}</span>
            <span class="terminal-clock-cursor">:</span>
            <span class="terminal-clock-minute">${mm}</span>
            ${ss ? `<span class="terminal-clock-second">${ss}</span>` : ""}
            ${ampm ? `<span class="terminal-clock-ampm">${ampm}</span>` : ""}
          </div>
          ${isTimer ? `<div class="terminal-clock-date">${countdownLabel}</div>` : dateStr ? `<div class="terminal-clock-date">${dateStr}</div>` : ""}
        </div>
      </div>
    `
  } else if (dateClockStyle === "c4-bomb") {
    if (c4BombDetonateAt && Date.now() >= c4BombDetonateAt) {
      c4BombDetonateAt = 0
      c4BombArmed = false
      c4BombLeverOn = false
      c4BombUnlocked = false
      c4BombInput = ""
      c4BombWrongUntil = 0
      c4BombLastBeepSecond = null
      c4BombBeepRunId += 1
      clearC4BombFastTick()
      c4BombExploded = true
      c4BombPulseUntil = Date.now() + 1400
    }

    const weekday = isTimer
      ? timerLabel
      : getSafeWeekday(
          now,
          langCode,
          settings.shortWeekday,
          tz,
          settings,
        ).toUpperCase()
    const dateStr = shouldShowDate
      ? getCustomDateString(now, langCode, tz, settings)
      : ""
    const isPulse = Date.now() < c4BombPulseUntil
    const isCounting = c4BombDetonateAt > Date.now()
    const remainingMs = Math.max(0, c4BombDetonateAt - Date.now())
    const remainingSeconds = Math.ceil(remainingMs / 1000)
    const fastCountdownTicks = getC4BombFastTicks(remainingMs)
    const isCodeWrong = Date.now() < c4BombWrongUntil

    if (isCounting && remainingSeconds !== c4BombLastBeepSecond) {
      c4BombLastBeepSecond = remainingSeconds
      playC4BombCountdownBeep(remainingSeconds)
    } else if (!isCounting) {
      c4BombLastBeepSecond = null
      c4BombBeepRunId += 1
      clearC4BombFastTick()
    }

    if (isCounting) scheduleC4BombFastTick()

    const countdownMinute = String(Math.floor(remainingSeconds / 60)).padStart(
      2,
      "0",
    )
    const countdownSecond = String(remainingSeconds % 60).padStart(2, "0")
    const rapidCountdownHtml =
      isCounting && remainingSeconds <= 8
        ? `<span class="c4-bomb-rapid-second">${fastCountdownTicks}</span>`
        : ""
    const inputDisplay = isCodeWrong
      ? "X X X X"
      : c4BombInput.padEnd(C4_BOMB_PASSCODE.length, "_")
    const keypadNumbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "LOCK", "0", "SET"]
    const statusText = c4BombExploded
      ? "BOOM"
      : isCounting
        ? "LIVE"
        : c4BombArmed
          ? getClockLabel("clock_c4_status_armed", "ARMED")
          : c4BombUnlocked
            ? "CODE OK"
            : getClockLabel("clock_c4_status_standby", "STANDBY")
    const buttonText = c4BombExploded
      ? "RESET"
      : isCounting || c4BombArmed
        ? getClockLabel("clock_c4_button_defuse", "DEFUSE")
        : getClockLabel("clock_c4_button_arm", "ARM")
    const buttonDisabled =
      !c4BombExploded &&
      (!c4BombUnlocked || (!c4BombLeverOn && !c4BombArmed && !isCounting))
    const leverDisabled = !c4BombUnlocked || isCounting || c4BombExploded
    let root = clockElement.querySelector(".c4-bomb-clock")
    if (!root) {
      clockElement.innerHTML = `
        <div class="c4-bomb-clock">
          <div class="c4-bomb-device">
            <div class="c4-bomb-screen">
              <div class="c4-bomb-status"></div>
              <div class="c4-bomb-time"></div>
              <div class="c4-bomb-code-line"></div>
              <div class="c4-bomb-date-wrapper"></div>
            </div>
            <div class="c4-bomb-controls">
              <div class="c4-bomb-code-hint" aria-hidden="true"><span>7355608</span></div>
              <div class="c4-bomb-led-row" aria-hidden="true">
                <span class="c4-bomb-led"></span>
                <span class="c4-bomb-led"></span>
                <span class="c4-bomb-led"></span>
              </div>
              <div class="c4-bomb-actions">
                <button type="button" class="c4-bomb-lever">
                  <span class="c4-bomb-lever-slot" aria-hidden="true"><span></span></span>
                  <span class="c4-bomb-lever-text"></span>
                </button>
                <button type="button" class="c4-bomb-button">
                  <span class="c4-bomb-button-light" aria-hidden="true"></span>
                  <span class="c4-bomb-button-text"></span>
                </button>
              </div>
              <div class="c4-bomb-keypad" aria-label="C4 passcode keypad">
                ${["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"]
                  .map(
                    (number) =>
                      `<button type="button" class="c4-bomb-key" data-c4-key="${number}">${number}</button>`,
                  )
                  .join("")}
              </div>
            </div>
          </div>
        </div>
      `
      root = clockElement.querySelector(".c4-bomb-clock")
    }

    const rootClass = `c4-bomb-clock ${c4BombArmed || isCounting ? "is-armed" : "is-standby"} ${c4BombUnlocked ? "is-unlocked" : "is-locked"} ${c4BombLeverOn ? "is-lever-on" : ""} ${c4BombExploded ? "is-exploded" : ""} ${isCodeWrong ? "is-code-wrong" : ""} ${isPulse ? "is-pulsing" : ""}`
    if (root.className !== rootClass) root.className = rootClass

    const statusEl = root.querySelector(".c4-bomb-status")
    const statusHtml = `${statusText} / ${weekday}`
    if (statusEl.getAttribute("data-raw-html") !== statusHtml) { statusEl.innerHTML = statusHtml; statusEl.setAttribute("data-raw-html", statusHtml); }

    const timeEl = root.querySelector(".c4-bomb-time")
    const timeHtml = c4BombExploded
      ? `<span class="c4-bomb-boom">BOOM</span>`
      : isCounting
        ? `
          <span class="c4-bomb-hour">${countdownMinute}</span>
          <span class="c4-bomb-separator">:</span>
          <span class="c4-bomb-minute">${countdownSecond}</span>
          ${rapidCountdownHtml}
        `
        : `
          <span class="c4-bomb-hour">${hh}</span>
          <span class="c4-bomb-separator">:</span>
          <span class="c4-bomb-minute">${mm}</span>
          ${ss ? `<span class="c4-bomb-second">${ss}</span>` : ""}
          ${ampm ? `<span class="c4-bomb-ampm">${ampm}</span>` : ""}
        `
    if (timeEl.getAttribute("data-raw-html") !== timeHtml) { timeEl.innerHTML = timeHtml; timeEl.setAttribute("data-raw-html", timeHtml); }

    const codeLineEl = root.querySelector(".c4-bomb-code-line")
    const codeHtml = c4BombUnlocked ? "PASS 7355608 ACCEPTED" : `PASS ${inputDisplay}`
    if (codeLineEl.getAttribute("data-raw-html") !== codeHtml) { codeLineEl.innerHTML = codeHtml; codeLineEl.setAttribute("data-raw-html", codeHtml); }

    const dateWrapEl = root.querySelector(".c4-bomb-date-wrapper")
    const dateHtml = isCounting
      ? `<div class="c4-bomb-date">${countdownMinute}:${countdownSecond}${remainingSeconds <= 8 ? `.${fastCountdownTicks}` : ""}</div>`
      : c4BombExploded
        ? `<div class="c4-bomb-date">SYSTEM TRIPPED - PRESS RESET</div>`
        : isTimer
          ? `<div class="c4-bomb-date">${countdownLabel}</div>`
          : dateStr
            ? `<div class="c4-bomb-date">${dateStr}</div>`
            : ""
    if (dateWrapEl.getAttribute("data-raw-html") !== dateHtml) { dateWrapEl.innerHTML = dateHtml; dateWrapEl.setAttribute("data-raw-html", dateHtml); }

    const leverBtn = root.querySelector(".c4-bomb-lever")
    leverBtn.setAttribute("aria-pressed", c4BombLeverOn ? "true" : "false")
    if (leverBtn.disabled !== leverDisabled) leverBtn.disabled = leverDisabled
    const leverText = root.querySelector(".c4-bomb-lever-text")
    const lTxt = c4BombLeverOn ? "OPEN" : "LOCK"
    if (leverText.textContent !== lTxt) leverText.textContent = lTxt

    const actionBtn = root.querySelector(".c4-bomb-button")
    actionBtn.setAttribute("aria-pressed", c4BombArmed || isCounting ? "true" : "false")
    if (actionBtn.disabled !== buttonDisabled) actionBtn.disabled = buttonDisabled
    const actionText = root.querySelector(".c4-bomb-button-text")
    if (actionText.textContent !== buttonText) actionText.textContent = buttonText

    const keysDisabled = c4BombUnlocked || isCounting || c4BombExploded
    const keypadBtns = root.querySelectorAll(".c4-bomb-key")
    keypadBtns.forEach(btn => {
      if (btn.disabled !== keysDisabled) btn.disabled = keysDisabled
    })
  } else if (dateClockStyle === "holo-ring") {
    const weekday = isTimer
      ? timerLabel
      : getSafeWeekday(now, langCode, settings.shortWeekday, tz, settings)
    const dateStr = shouldShowDate
      ? getCustomDateString(now, langCode, tz, settings)
      : ""
    let holoRoot = clockElement.querySelector(".holo-ring-clock")
    if (!holoRoot) {
      clockElement.innerHTML = `
        <div class="holo-ring-clock">
          <div class="holo-ring-orbit">
            <span class="holo-ring-dot"></span>
            <span class="holo-ring-weekday">${weekday}</span>
          </div>
          <div class="holo-ring-main">
            <div class="holo-ring-time">
              <span class="holo-ring-hour">${hh}</span>
              <span class="holo-ring-separator">:</span>
              <span class="holo-ring-minute">${mm}</span>
              <span class="holo-ring-second">${ss}</span>
              <span class="holo-ring-ampm">${ampm}</span>
            </div>
            <div class="holo-ring-date">${isTimer ? countdownLabel : dateStr}</div>
          </div>
        </div>
      `
      holoRoot = clockElement.querySelector(".holo-ring-clock")
    }

    const weekdayEl = holoRoot.querySelector(".holo-ring-weekday")
    if (weekdayEl && weekdayEl.innerHTML !== weekday)
      weekdayEl.innerHTML = weekday
    const hourEl = holoRoot.querySelector(".holo-ring-hour")
    if (hourEl && hourEl.textContent !== hh) hourEl.textContent = hh
    const minuteEl = holoRoot.querySelector(".holo-ring-minute")
    if (minuteEl && minuteEl.textContent !== mm) minuteEl.textContent = mm
    const secondEl = holoRoot.querySelector(".holo-ring-second")
    if (secondEl) {
      if (secondEl.textContent !== ss) secondEl.textContent = ss
      secondEl.style.display = ss ? "inline-block" : "none"
    }
    const ampmEl = holoRoot.querySelector(".holo-ring-ampm")
    if (ampmEl) {
      if (ampmEl.textContent !== ampm) ampmEl.textContent = ampm
      ampmEl.style.display = ampm ? "inline-block" : "none"
    }
    const dateEl = holoRoot.querySelector(".holo-ring-date")
    if (dateEl) {
      const dTxt = isTimer ? countdownLabel : dateStr
      if (dateEl.getAttribute("data-raw-html") !== dTxt) { dateEl.innerHTML = dTxt; dateEl.setAttribute("data-raw-html", dTxt); }
      dateEl.style.display = dTxt ? "block" : "none"
    }
  } else if (dateClockStyle === "media-orb") {
    const weekday = isTimer
      ? timerLabel
      : getSafeWeekday(now, langCode, settings.shortWeekday, tz, settings)
    const dateStr = shouldShowDate
      ? getCustomDateString(now, langCode, tz, settings)
      : ""
    const mediaSrc =
      settings.mediaOrbImageData ||
      settings.mediaOrbImageUrl ||
      DEFAULT_MEDIA_ORB_IMAGE_URL
    const mediaHtml = mediaSrc
      ? `<img class="media-orb-image" src="${escapeAttribute(mediaSrc)}" alt="">`
      : `<div class="media-orb-placeholder"><i class="fa-solid fa-image"></i></div>`
    const mediaLayout = ["left", "right", "center"].includes(
      settings.mediaOrbLayout,
    )
      ? settings.mediaOrbLayout
      : "left"
    const mediaVisualHtml = `
        <div class="media-orb-visual">
          ${mediaHtml}
          <span class="media-orb-ring"></span>
        </div>`
    const mediaTimeHtml =
      mediaLayout === "center"
        ? `
          <div class="media-orb-time">
            <span class="media-orb-hour">${hh}</span>
            ${mediaVisualHtml}
            <span class="media-orb-minute">${mm}</span>
            ${ss ? `<span class="media-orb-second">${ss}</span>` : ""}
            ${ampm ? `<span class="media-orb-ampm">${ampm}</span>` : ""}
          </div>`
        : `
          <div class="media-orb-time">
            <span class="media-orb-hour">${hh}</span>
            <span class="media-orb-separator">:</span>
            <span class="media-orb-minute">${mm}</span>
            ${ss ? `<span class="media-orb-second">${ss}</span>` : ""}
            ${ampm ? `<span class="media-orb-ampm">${ampm}</span>` : ""}
          </div>`

    clockElement.innerHTML = `
      <div class="media-orb-clock media-orb-layout-${mediaLayout}">
        ${mediaLayout === "center" ? "" : mediaVisualHtml}
        <div class="media-orb-main">
          <div class="media-orb-weekday">${weekday}</div>
          ${mediaTimeHtml}
          ${isTimer ? `<div class="media-orb-date">${countdownLabel}</div>` : dateStr ? `<div class="media-orb-date">${dateStr}</div>` : ""}
        </div>
      </div>
    `
  } else if (dateClockStyle === "prism-stack") {
    const weekday = isTimer
      ? timerLabel
      : getSafeWeekday(now, langCode, settings.shortWeekday, tz, settings)
    const dateStr = shouldShowDate
      ? getCustomDateString(now, langCode, tz, settings)
      : ""
    const analogHours = Number.parseInt(hh, 10) || 0
    const analogMinutes = Number.parseInt(mm, 10) || 0
    const analogHourDeg = ((analogHours % 12) + analogMinutes / 60) * 30
    const analogMinuteDeg = analogMinutes * 6
    clockElement.innerHTML = `
      <div class="prism-stack-clock">
        <div class="prism-stack-mini-clock" aria-hidden="true">
          <span class="prism-stack-mini-hand prism-stack-mini-hour" style="--mini-hand-rotation: ${analogHourDeg}deg"></span>
          <span class="prism-stack-mini-hand prism-stack-mini-minute" style="--mini-hand-rotation: ${analogMinuteDeg}deg"></span>
          <span class="prism-stack-mini-pin"></span>
        </div>
        <div class="prism-stack-meta">${weekday}</div>
        <div class="prism-stack-time">
          <span>${hh}</span>
          <span class="prism-stack-separator">:</span>
          <span>${mm}</span>
          ${ss ? `<span class="prism-stack-ss">${ss}</span>` : ""}
          ${ampm ? `<span class="prism-stack-ampm">${ampm}</span>` : ""}
        </div>
        ${isTimer ? `<div class="prism-stack-date">${countdownLabel}</div>` : dateStr ? `<div class="prism-stack-date">${dateStr}</div>` : ""}
      </div>
    `
  } else if (dateClockStyle === "metro-panel") {
    const weekday = isTimer
      ? countdownLabel
      : getSafeWeekday(now, langCode, settings.shortWeekday, tz, settings)
    const dateStr = shouldShowDate
      ? getCustomDateString(now, langCode, tz, settings)
      : ""
    clockElement.innerHTML = `
      <div class="metro-panel-clock">
        <div class="metro-panel-label">${weekday}</div>
        <div class="metro-panel-time">
          <span class="metro-panel-hour">${hh}</span>
          <span class="metro-panel-colon">:</span>
          <span class="metro-panel-minute">${mm}</span>
          ${ss ? `<span class="metro-panel-second">${ss}</span>` : ""}
          ${ampm ? `<span class="metro-panel-ampm">${ampm}</span>` : ""}
        </div>
        ${isTimer ? `<div class="metro-panel-date">${timerRunningLabel}</div>` : dateStr ? `<div class="metro-panel-date">${dateStr}</div>` : ""}
      </div>
    `
  } else if (dateClockStyle === "aurora-ribbon") {
    const weekday = isTimer
      ? countdownLabel
      : getSafeWeekday(
          now,
          langCode,
          settings.shortWeekday,
          tz,
          settings,
        ).toUpperCase()
    const dateStr = shouldShowDate
      ? getCustomDateString(now, langCode, tz, settings)
      : ""
    clockElement.innerHTML = `
      <div class="aurora-ribbon-clock">
        <div class="aurora-ribbon-top">
          <span class="aurora-ribbon-weekday">${weekday}</span>
          ${ampm ? `<span class="aurora-ribbon-ampm">${ampm}</span>` : ""}
        </div>
        <div class="aurora-ribbon-time">
          <span class="aurora-ribbon-hour">${hh}</span>
          <span class="aurora-ribbon-colon">:</span>
          <span class="aurora-ribbon-minute">${mm}</span>
          ${ss ? `<span class="aurora-ribbon-second">${ss}</span>` : ""}
        </div>
        ${isTimer ? `<div class="aurora-ribbon-date">${timerRunningLabel}</div>` : dateStr ? `<div class="aurora-ribbon-date">${dateStr}</div>` : ""}
      </div>
    `
  } else if (dateClockStyle === "lunar-orbit") {
    const weekday = isTimer
      ? timerLabel
      : getSafeWeekday(now, langCode, true, tz, settings)
    const dateStr = shouldShowDate
      ? getCustomDateString(now, langCode, tz, settings)
      : ""
    const lunarParts = getVietnameseLunarParts(now, tz)
    const orbDay = isTimer ? (timerH > 0 ? hh : mm) : lunarParts.day
    const orbMonth = isTimer ? (timerH > 0 ? "HR" : "MIN") : lunarParts.month
    const orbLabel = isTimer ? weekday : lunarParts.label
    const dateLine = isTimer
      ? countdownLabel
      : dateStr
        ? `${lunarParts.line} - ${dateStr}`
        : lunarParts.line
    clockElement.innerHTML = `
      <div class="lunar-orbit-clock">
        <div class="lunar-orbit-date-dial">
          <span class="lunar-orbit-weekday">${orbLabel}</span>
          <span class="lunar-orbit-day">${orbDay}</span>
          <span class="lunar-orbit-month">${orbMonth}</span>
        </div>
        <div class="lunar-orbit-main">
          <div class="lunar-orbit-time">
            <span class="lunar-orbit-hour">${hh}</span>
            <span class="lunar-orbit-colon">:</span>
            <span class="lunar-orbit-minute">${mm}</span>
            ${ss ? `<span class="lunar-orbit-second">${ss}</span>` : ""}
            ${ampm ? `<span class="lunar-orbit-ampm">${ampm}</span>` : ""}
          </div>
          <div class="lunar-orbit-date-line">${dateLine}</div>
        </div>
      </div>
    `
  } else if (dateClockStyle === "cartoon") {
    const weekday = isTimer
      ? timerLabel
      : getSafeWeekday(now, dateLangCode, settings.shortWeekday, tz, settings)
    const dateStr = shouldShowDate
      ? getCustomDateString(now, dateLangCode, tz, settings)
      : ""
    const secondDisplay = ss || "00"
    let cartoonRoot = clockElement.querySelector(".cartoon-clock")
    if (!cartoonRoot) {
      clockElement.innerHTML = `
        <div class="cartoon-clock">
          <span class="cartoon-blob cartoon-blob-one"></span>
          <span class="cartoon-blob cartoon-blob-two"></span>
          <span class="cartoon-star cartoon-star-one">+</span>
          <span class="cartoon-star cartoon-star-two">+</span>
          <div class="cartoon-top">
            <span class="cartoon-weekday"></span>
            <span class="cartoon-ampm"></span>
          </div>
          <div class="cartoon-time">
            <span class="cartoon-digit cartoon-hour"></span>
            <span class="cartoon-colon">:</span>
            <span class="cartoon-digit cartoon-minute"></span>
            <span class="cartoon-second"></span>
          </div>
          <div class="cartoon-date"></div>
        </div>
      `
      cartoonRoot = clockElement.querySelector(".cartoon-clock")
    }

    const weekdayEl = cartoonRoot.querySelector(".cartoon-weekday")
    const weekdayText = isTimer ? countdownLabel : weekday
    if (weekdayEl && weekdayEl.innerHTML !== weekdayText) {
      weekdayEl.innerHTML = weekdayText
    }

    const ampmEl = cartoonRoot.querySelector(".cartoon-ampm")
    if (ampmEl) {
      if (ampmEl.textContent !== ampm) ampmEl.textContent = ampm
      ampmEl.style.display = ampm ? "inline-flex" : "none"
    }

    const timeEl = cartoonRoot.querySelector(".cartoon-time")
    if (timeEl) timeEl.setAttribute("aria-label", timeString)

    const hourEl = cartoonRoot.querySelector(".cartoon-hour")
    if (hourEl && hourEl.textContent !== hh) hourEl.textContent = hh

    const minuteEl = cartoonRoot.querySelector(".cartoon-minute")
    if (minuteEl && minuteEl.textContent !== mm) minuteEl.textContent = mm

    const secondEl = cartoonRoot.querySelector(".cartoon-second")
    if (secondEl) {
      if (secondEl.textContent !== secondDisplay) {
        secondEl.textContent = secondDisplay
      }
      secondEl.style.display = settings.hideSeconds ? "none" : "inline-flex"
    }

    const dateEl = cartoonRoot.querySelector(".cartoon-date")
    if (dateEl) {
      const dateText = isTimer ? timerRunningLabel : dateStr
      if (dateEl.getAttribute("data-raw-html") !== dateText) { dateEl.innerHTML = dateText; dateEl.setAttribute("data-raw-html", dateText); }
      dateEl.style.display = dateText ? "block" : "none"
    }
  } else if (dateClockStyle === "minimalist-word") {
    // 10x11 Matrix
    const isVi = langCode.startsWith("vi")
    
    const matrixEn = "ITLISASAMPMACQUARTERDCTWENTYFIVEXHALFSTENFTOPASTERUNINEONESIXTHREEFOURFIVETWOEIGHTELEVENSEVENTWELVETENSEOCLOCK"
    const matrixVi = "BÂYXGIỜVLÀOMỘTHAIBABẢYBỐNNĂMSÁUQPTÁMCHÍNMƯỜIKGIỜRƯỠIKÉMMƯỜILĂMHAIXBABỐNMƯƠIYENĂMPHÚTSÁNGTỐICHIỀUĐÊMĐÚNGKTRƯAZV"
    
    const getActiveIndicesEn = (h, m) => {
      const active = new Set([0, 1, 3, 4]) // IT IS
      let hour = h, isPast = true, minStr = ""
      
      if (m >= 5 && m < 10) minStr = "FIVE"
      else if (m >= 10 && m < 15) minStr = "TEN"
      else if (m >= 15 && m < 20) minStr = "A QUARTER"
      else if (m >= 20 && m < 25) minStr = "TWENTY"
      else if (m >= 25 && m < 30) minStr = "TWENTY FIVE"
      else if (m >= 30 && m < 35) minStr = "HALF"
      else if (m >= 35 && m < 40) { minStr = "TWENTY FIVE"; isPast = false; hour++; }
      else if (m >= 40 && m < 45) { minStr = "TWENTY"; isPast = false; hour++; }
      else if (m >= 45 && m < 50) { minStr = "A QUARTER"; isPast = false; hour++; }
      else if (m >= 50 && m < 55) { minStr = "TEN"; isPast = false; hour++; }
      else if (m >= 55) { minStr = "FIVE"; isPast = false; hour++; }

      if (minStr.includes("A")) active.add(11)
      if (minStr.includes("QUARTER")) [13,14,15,16,17,18,19].forEach(i=>active.add(i))
      if (minStr.includes("TWENTY")) [22,23,24,25,26,27].forEach(i=>active.add(i))
      if (minStr.includes("FIVE")) [28,29,30,31].forEach(i=>active.add(i))
      if (minStr.includes("HALF")) [33,34,35,36].forEach(i=>active.add(i))
      if (minStr.includes("TEN")) [38,39,40].forEach(i=>active.add(i))

      if (m >= 5) {
        if (isPast) [44,45,46,47].forEach(i=>active.add(i))
        else [42,43].forEach(i=>active.add(i))
      } else {
        [104,105,106,107,108,109].forEach(i=>active.add(i))
      }

      if (hour > 12) hour -= 12
      if (hour === 0) hour = 12
      
      const hourMap = {
        1: [55,56,57], 2: [74,75,76], 3: [61,62,63,64,65],
        4: [66,67,68,69], 5: [70,71,72,73], 6: [58,59,60],
        7: [88,89,90,91,92], 8: [77,78,79,80,81], 9: [51,52,53,54],
        10: [99,100,101], 11: [82,83,84,85,86,87], 12: [93,94,95,96,97,98]
      }
      if (hourMap[hour]) hourMap[hour].forEach(i=>active.add(i))
      
      if (h < 12) [7,8].forEach(i=>active.add(i))
      else [9,10].forEach(i=>active.add(i))

      return active
    }

    const getActiveIndicesVi = (h, m) => {
      const active = new Set([0, 1, 2, 8, 9]) // BÂY LÀ
      active.add(4).add(5).add(6) // GIỜ

      let hour = h
      if (m >= 35) hour++ 
      
      if (hour > 12) hour -= 12
      if (hour === 0) hour = 12

      const hourMap = {
        1: [11,12,13], 2: [14,15,16], 3: [17,18], 4: [22,23,24],
        5: [25,26,27], 6: [28,29,30], 7: [19,20,21], 8: [33,34,35],
        9: [36,37,38,39], 10: [40,41,42,43], 11: [40,41,42,43, 11,12,13], 12: [40,41,42,43, 14,15,16]
      }
      if (hourMap[hour]) hourMap[hour].forEach(i=>active.add(i))

      active.add(45).add(46).add(47)

      if (m === 0) [99,100,101,102].forEach(i=>active.add(i)) 
      else if (m < 5) {} 
      else if (m >= 5 && m < 10) [77,78,79, 80,81,82,83].forEach(i=>active.add(i)) 
      else if (m >= 10 && m < 15) [55,56,57,58, 80,81,82,83].forEach(i=>active.add(i)) 
      else if (m >= 15 && m < 20) [55,56,57,58, 59,60,61].forEach(i=>active.add(i)) 
      else if (m >= 20 && m < 25) [62,63,64, 71,72,73,74].forEach(i=>active.add(i)) 
      else if (m >= 25 && m < 30) [62,63,64, 71,72,73,74, 59,60,61].forEach(i=>active.add(i)) 
      else if (m >= 30 && m < 35) [48,49,50,51].forEach(i=>active.add(i)) 
      else if (m >= 35 && m < 40) [52,53,54, 62,63,64, 71,72,73,74, 59,60,61].forEach(i=>active.add(i)) 
      else if (m >= 40 && m < 45) [52,53,54, 62,63,64, 71,72,73,74].forEach(i=>active.add(i)) 
      else if (m >= 45 && m < 50) [52,53,54, 55,56,57,58, 59,60,61].forEach(i=>active.add(i)) 
      else if (m >= 50 && m < 55) [52,53,54, 55,56,57,58].forEach(i=>active.add(i)) 
      else if (m >= 55) [52,53,54, 77,78,79].forEach(i=>active.add(i)) 

      let periodHour = h
      if (m >= 35) periodHour++
      if (periodHour >= 24) periodHour = 0

      if (periodHour >= 0 && periodHour < 4) [96,97,98].forEach(i=>active.add(i)) 
      else if (periodHour >= 4 && periodHour < 11) [84,85,86,87].forEach(i=>active.add(i)) 
      else if (periodHour >= 11 && periodHour < 14) [104,105,106,107].forEach(i=>active.add(i)) 
      else if (periodHour >= 14 && periodHour < 18) [91,92,93,94,95].forEach(i=>active.add(i)) 
      else if (periodHour >= 18) [88,89,90].forEach(i=>active.add(i)) 

      return active
    }

    const minVal = parseInt(mm, 10)
    
    // Always calculate both
    const activeIndicesEn = getActiveIndicesEn(now.getHours(), minVal)
    const activeIndicesVi = getActiveIndicesVi(now.getHours(), minVal)
    
    let gridHtml = ''
    
    // Board 1: English (Hidden if isVi)
    gridHtml += `<div class="minimalist-matrix-grid matrix-en" style="display: ${isVi ? 'none' : 'grid'};">`
    for (let i = 0; i < matrixEn.length; i++) {
      const char = matrixEn[i]
      const isActive = activeIndicesEn.has(i) ? "is-active" : ""
      gridHtml += `<span class="matrix-char ${isActive}">${char}</span>`
    }
    gridHtml += '</div>'

    // Board 2: Vietnamese (Hidden if !isVi)
    gridHtml += `<div class="minimalist-matrix-grid matrix-vi" style="display: ${isVi ? 'grid' : 'none'};">`
    for (let i = 0; i < matrixVi.length; i++) {
      const char = matrixVi[i]
      const isActive = activeIndicesVi.has(i) ? "is-active" : ""
      gridHtml += `<span class="matrix-char ${isActive}">${char}</span>`
    }
    gridHtml += '</div>'

    if (clockElement.innerHTML !== gridHtml) {
      clockElement.innerHTML = gridHtml
    }
  } else if (dateClockStyle === "audio-wave") {
    if (!clockElement.querySelector('.audio-wave-container')) {
      const barsCount = 30;
      let barsHtml = "";
      for (let i = 0; i < barsCount; i++) {
        const delay = (Math.random() * 1.5).toFixed(2);
        const duration = (0.6 + Math.random() * 0.6).toFixed(2);
        barsHtml += `<div class="aw-bar" style="--anim-del: ${delay}; --anim-dur: ${duration};"></div>`;
      }
      clockElement.innerHTML = `
        <div class="audio-wave-container">
          <div class="aw-content">
            <div class="aw-time">
              <span class="aw-hour"></span><span class="aw-colon blink">:</span><span class="aw-minute"></span><span class="aw-seconds" style="display:none"></span><span class="aw-ampm" style="display:none"></span>
            </div>
            <div class="aw-date"></div>
          </div>
          <div class="aw-visualizer">${barsHtml}</div>
        </div>
      `;
    }
    clockElement.querySelector('.aw-hour').textContent = hh;
    clockElement.querySelector('.aw-minute').textContent = mm;
    
    const secEl = clockElement.querySelector('.aw-seconds');
    if (ss) {
      secEl.style.display = 'inline';
      secEl.textContent = `:${ss}`;
    } else {
      secEl.style.display = 'none';
    }
    
    const ampmEl = clockElement.querySelector('.aw-ampm');
    if (ampm) {
      ampmEl.style.display = 'inline';
      ampmEl.textContent = ` ${ampm}`;
    } else {
      ampmEl.style.display = 'none';
    }
    
    clockElement.querySelector('.aw-date').innerHTML = getCustomDateString(now, langCode, tz, settings);
  } else if (dateClockStyle === "glass-float") {
    if (!clockElement.querySelector('.glass-float-container')) {
      clockElement.innerHTML = `
        <div class="clock-container glass-float-container">
          <div class="gf-content">
            <div class="gf-text"></div>
            <div class="gf-time"><span class="gf-hour"></span><span class="gf-colon blink">:</span><span class="gf-minute"></span><span class="gf-seconds"></span><span class="gf-ampm"></span></div>
            <div class="gf-date"></div>
          </div>
        </div>
      `;
    }
    const customText = settings.gfCustomText === "" ? "" : (settings.gfCustomText || "Floating Clock");
    const gfTextEl = clockElement.querySelector('.gf-text');
    let animIdx = 0;

    if (!customText) {
       gfTextEl.style.display = 'none';
       gfTextEl.innerHTML = "";
    } else {
       gfTextEl.style.display = 'block';
       const textHtml = customText.split('').map(c => `<span class="gf-char" data-char="${c === ' ' ? '&nbsp;' : c}" style="--anim-index: ${animIdx++}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
       if (gfTextEl.getAttribute("data-raw-html") !== textHtml) { gfTextEl.innerHTML = textHtml; gfTextEl.setAttribute("data-raw-html", textHtml); };
    }
    
    const hourHtml = hh.split('').map(c => `<span class="gf-char" data-char="${c}" style="--anim-index: ${animIdx++}">${c}</span>`).join('');
    const colonHtml = `<span class="gf-char" data-char=":" style="--anim-index: ${animIdx++}">:</span>`;
    const minuteHtml = mm.split('').map(c => `<span class="gf-char" data-char="${c}" style="--anim-index: ${animIdx++}">${c}</span>`).join('');
    
    let secondsHtml = '';
    if (ss) {
      secondsHtml = `<span class="gf-char" data-char=":" style="--anim-index: ${animIdx++}">:</span>` + ss.split('').map(c => `<span class="gf-char" data-char="${c}" style="--anim-index: ${animIdx++}">${c}</span>`).join('');
    }
    
    let ampmHtml = '';
    if (ampm) {
      ampmHtml = `<span class="gf-char" data-char="&nbsp;" style="--anim-index: ${animIdx++}">&nbsp;</span>` + ampm.split('').map(c => `<span class="gf-char" data-char="${c}" style="--anim-index: ${animIdx++}">${c}</span>`).join('');
    }
    
    const hEl = clockElement.querySelector('.gf-hour');
    if (hEl.getAttribute("data-raw-html") !== hourHtml) { hEl.innerHTML = hourHtml; hEl.setAttribute("data-raw-html", hourHtml); };
    
    const cEl = clockElement.querySelector('.gf-colon');
    if (cEl.getAttribute("data-raw-html") !== colonHtml) { cEl.innerHTML = colonHtml; cEl.setAttribute("data-raw-html", colonHtml); };
    
    const mEl = clockElement.querySelector('.gf-minute');
    if (mEl.getAttribute("data-raw-html") !== minuteHtml) { mEl.innerHTML = minuteHtml; mEl.setAttribute("data-raw-html", minuteHtml); };
    
    const sEl = clockElement.querySelector('.gf-seconds');
    if (sEl.getAttribute("data-raw-html") !== secondsHtml) { sEl.innerHTML = secondsHtml; sEl.setAttribute("data-raw-html", secondsHtml); };
    
    const aEl = clockElement.querySelector('.gf-ampm');
    if (aEl.getAttribute("data-raw-html") !== ampmHtml) { aEl.innerHTML = ampmHtml; aEl.setAttribute("data-raw-html", ampmHtml); };
    
    const dateStr = getCustomDateString(now, langCode, tz, settings);
    const dateText = dateStr.replace(/<[^>]*>?/gm, '') || "";
    const dateHtml = dateText.split('').map(c => `<span class="gf-char" data-char="${c === ' ' ? '&nbsp;' : c}" style="--anim-index: ${animIdx++}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    const dEl = clockElement.querySelector('.gf-date');
    if (dEl.getAttribute("data-raw-html") !== dateHtml) { dEl.innerHTML = dateHtml; dEl.setAttribute("data-raw-html", dateHtml); };
  } else if (dateClockStyle === "space-concentric") {
    const currentMonth = now.getMonth();
    const currentDay = now.getDate() - 1;
    const currentWeek = now.getDay();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentSec = now.getSeconds();

    const isVi = langCode.startsWith("vi");
    const is12Hour = settings.clockTimeFormat === "12";
    const hourIdx = is12Hour ? (currentHour % 12) : currentHour;

    const monthAngle = -(currentMonth * (360 / 12));
    const dayAngle = -(currentDay * (360 / 31));
    const weekAngle = -(currentWeek * (360 / 7));
    const hourAngle = -(hourIdx * (360 / (is12Hour ? 12 : 24)));
    const minAngle = -(currentMin * (360 / 60));
    const secAngle = -(currentSec * (360 / 60));
    const showSec = settings.clockDisplaySeconds !== false;
    const cacheKey = `${langCode}-${is12Hour}-${showSec}`;

    if (!spaceConcentricHtmlCache || spaceConcentricLangCache !== cacheKey) {
      const scMonthsVi = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
      const scWeekdaysVi = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
      const scDaysVi = Array.from({length: 31}, (_, i) => `Ngày ${i + 1}`);
      const scHours12 = Array.from({length: 12}, (_, i) => (i === 0 ? 12 : i).toString().padStart(2, '0'));

      const m = isVi ? scMonthsVi : scMonths;
      const w = isVi ? scWeekdaysVi : scWeekdays;
      const d = isVi ? scDaysVi : scDays;
      const hArray = is12Hour ? scHours12 : scHours;

      const genRing = (items, id) => {
        const step = 360 / items.length;
        const itemsHtml = items.map((t, i) => `<div class="sc-text-item" style="transform: rotate(${i * step}deg)">${t}</div>`).join("");
        return `<div id="${id}" class="sc-ring">${itemsHtml}</div>`;
      }
      spaceConcentricHtmlCache = `
        <div class="space-concentric-container">
            <div class="sc-indicator-line"></div>
            ${genRing(m, 'sc-ring-month')}
            ${genRing(d, 'sc-ring-day')}
            ${genRing(w, 'sc-ring-week')}
            ${genRing(hArray, 'sc-ring-hour')}
            ${genRing(scMinutes, 'sc-ring-min')}
            ${showSec ? genRing(scSeconds, 'sc-ring-sec') : ''}
        </div>
      `;
      spaceConcentricLangCache = cacheKey;
      clockElement.innerHTML = spaceConcentricHtmlCache;
    } else if (clockElement.children.length === 0 || !clockElement.querySelector('.space-concentric-container')) {
      clockElement.innerHTML = spaceConcentricHtmlCache;
    }

    const setRingRot = (id, angle, activeIndex) => {
      const el = clockElement.querySelector(`#${id}`);
      if (el) {
        el.style.transform = `rotate(${angle}deg)`;
        const currentActive = el.querySelector('.sc-text-item.is-active');
        const items = el.querySelectorAll('.sc-text-item');
        const nextActive = items[activeIndex];
        
        if (currentActive !== nextActive) {
          if (currentActive) currentActive.classList.remove('is-active');
          if (nextActive) nextActive.classList.add('is-active');
        }
      }
    }
    setRingRot('sc-ring-month', monthAngle, currentMonth);
    setRingRot('sc-ring-day', dayAngle, currentDay);
    setRingRot('sc-ring-week', weekAngle, currentWeek);
    setRingRot('sc-ring-hour', hourAngle, hourIdx);
    setRingRot('sc-ring-min', minAngle, currentMin);
    if (showSec) setRingRot('sc-ring-sec', secAngle, currentSec);

  } else {
    clockElement.textContent = timeString
  }

  let dateString = ""
  const priority = settings.clockDatePriority === "date" ? "date" : "none"
  const selectedFormat = settings.dateFormat || "full"
  const format =
    priority === "date" && selectedFormat === "full"
      ? "weekday"
      : selectedFormat

  // Handle Date logic considering Timezone
  if (isFramedClockStyle) {
    const parts = getZonedDateParts(now, tz)
    const dayMonth = `${parts.day} ${getLocalizedMonthName(now, langCode, tz, settings)}`
    dateString = dayMonth
  } else {
    dateString = getCustomDateString(now, langCode, tz, settings, format)
  }

  // Handle date visibility - check both showDate (removed, default true) AND showGregorian
  const finalShouldShowDate = settings.showGregorian !== false

  // Determine if we should show the standard date element
  const isSpecialStyle = [
    "cool",
    "sidestyle",
    "jp-style",
    "sidebar",
    "weekday-style",
    "fliqlo",
    "cyber-pulse",
    "neon-grid",
    "terminal",
    "c4-bomb",
    "holo-ring",
    "media-orb",
    "prism-stack",
    "metro-panel",
    "aurora-ribbon",
    "lunar-orbit",
    "cartoon",
    "minimalist-word",
    "space-concentric",
    "audio-wave",
    "glass-float",
  ].includes(dateClockStyle)

  const dateFadeWrap = document.getElementById("date-fade-wrap")
  if (dateFadeWrap) {
    dateFadeWrap.classList.toggle(
      "is-hidden",
      !finalShouldShowDate || (isSpecialStyle && !keepOnlyWeekday),
    )
  }

  if (keepOnlyWeekday || dateClockStyle === "weekday-style") {
    // FORCE ONLY WEEKDAY for ALL styles including special ones
    let weekdayStr = getSafeWeekday(
      now,
      langCode,
      settings.shortWeekday,
      tz,
      settings,
    )
    // For weekday-style, force uppercase
    if (dateClockStyle === "weekday-style") {
      weekdayStr = weekdayStr.toUpperCase()
    }
    dateElement.innerHTML = `<span class="clock-date-primary">${weekdayStr}</span>`
    // Clear clock element just in case to be sure no time is leaking
    if (isSpecialStyle) {
      clockElement.innerHTML = ""
      clockElement.textContent = ""
    }
  } else if (isSpecialStyle) {
    // Normal special style logic: standard date element is empty, clock element has everything
    dateElement.innerHTML = ""
    dateElement.textContent = ""
  } else if (isFramedClockStyle) {
    dateElement.innerHTML = `<span class="clock-date-primary">${dateString || ""}</span>`
  } else {
    dateElement.innerHTML = dateString
  }

  const outerContainer = document.getElementById("clock-date-wrap")

  // Lunar calendar display
  const lunarWrap = document.getElementById("clock-lunar-date")
  if (
    settings.showClockLunarCalendar &&
    settings.showClockLunarMode !== "replace" &&
    !isTimer
  ) {
    const zonedNow = tz
      ? new Date(now.toLocaleString("en-US", { timeZone: tz }))
      : now
    const lunar = convertSolar2Lunar(
      zonedNow.getDate(),
      zonedNow.getMonth() + 1,
      zonedNow.getFullYear(),
    )
    const leapStr = lunar.leap ? " (nhuận)" : ""
    const lunarStr = `${lunar.day}/${lunar.month}${leapStr} Âm lịch`
    if (lunarWrap) {
      lunarWrap.textContent = lunarStr
      if (outerContainer && lunarWrap.parentElement !== outerContainer) {
        outerContainer.appendChild(lunarWrap)
      }
      setClockLunarVisibility(lunarWrap, true)
    } else {
      const el = outerContainer || document.getElementById("date-fade-wrap")
      if (el && !document.getElementById("clock-lunar-date")) {
        const span = document.createElement("div")
        span.id = "clock-lunar-date"
        span.className = "clock-lunar-date"
        span.textContent = lunarStr
        el.appendChild(span)
        setClockLunarVisibility(span, true)
      }
    }
  } else if (lunarWrap) {
    setClockLunarVisibility(lunarWrap, false)
  }

  applyHueMode(settings)

  document.body.classList.remove("time-priority-none", "time-priority-date")
  document.body.classList.add(`time-priority-${priority}`)

  if (outerContainer && clockFadeWrap && dateFadeWrap) {
    const isHiddenTimerRunning =
      settings.timerIsRunning === true &&
      settings.showTimer !== true &&
      settings.clockTimerMode !== true
    outerContainer.classList.toggle(
      "timer-running-hidden",
      isHiddenTimerRunning,
    )

    if (isFramedClockStyle || priority === "date") {
      if (outerContainer.firstElementChild !== dateFadeWrap) {
        outerContainer.insertBefore(dateFadeWrap, clockFadeWrap)
      }
    } else {
      if (outerContainer.firstElementChild !== clockFadeWrap) {
        outerContainer.insertBefore(clockFadeWrap, dateFadeWrap)
      }
    }
  }

}

export function initClock() {
  window._isMusicPlaying = localStorage.getItem("musicPlayerLastIsPlaying") === "true"
  window.addEventListener("musicPlayingStateChange", (e) => {
    window._isMusicPlaying = e.detail
    const visualizer = document.querySelector('.round-clock-visualizer')
    if (visualizer) {
      visualizer.classList.toggle('is-playing', e.detail)
    }
  })

  updateTime()
  updateCustomTitle()

  // Pause clock interval when tab is hidden to save CPU/battery
  let _clockIntervalId = setInterval(updateTime, 1000)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearInterval(_clockIntervalId)
      _clockIntervalId = null
      clearC4BombFastTick()
    } else {
      // Resume: call immediately so there's no 1s lag on tab focus
      updateTime()
      if (!_clockIntervalId) {
        _clockIntervalId = setInterval(updateTime, 1000)
      }
    }
  })

  clockElement?.addEventListener("click", (event) => {
    const key = event.target?.closest?.(".c4-bomb-key")
    if (key) {
      inputC4BombDigit(key.dataset.c4Key || "")
      return
    }

    const lever = event.target?.closest?.(".c4-bomb-lever")
    if (lever) {
      toggleC4BombLever()
      return
    }

    const button = event.target?.closest?.(".c4-bomb-button")
    if (!button) return

    triggerC4BombAction()
  })

  window.addEventListener("keydown", (event) => {
    if (!isC4BombKeyboardEnabled(event)) return

    let handled = false
    if (/^\d$/.test(event.key)) {
      handled = inputC4BombDigit(event.key)
    } else if (event.key === "Backspace") {
      handled = backspaceC4BombInput()
    } else if (event.key === "Enter") {
      handled = triggerC4BombAction()
    } else if (event.key === "Escape") {
      handled = resetC4BombInput()
    }

    if (handled) event.preventDefault()
  })

  window.addEventListener("layoutUpdated", (e) => {
    if (
      e.detail.key === "showGregorian" ||
      e.detail.key === "clockDisplayMode" ||
      e.detail.key === "clockTimerMode" ||
      e.detail.key === "hideSeconds" ||
      e.detail.key === "showTimer" ||
      e.detail.key === "timerIsRunning" ||
      e.detail.key === "clockDatePriority" ||
      e.detail.key === "dateFormat" ||
      e.detail.key === "dateClockStyle" ||
      e.detail.key === "jpStyleLanguage" ||
      e.detail.key === "analogMarkerMode" ||
      e.detail.key === "hueTextMode" ||
      e.detail.key === "sidestyleAlign" ||
      e.detail.key === "sidestyleNoBorder" ||
      e.detail.key === "fliqloZenMode" ||
      e.detail.key === "fliqloTransparent" ||
      e.detail.key === "fliqloTheme" ||
      e.detail.key === "terminalClockVariant" ||
      e.detail.key === "mediaOrbImageUrl" ||
      e.detail.key === "mediaOrbImageData" ||
      e.detail.key === "mediaOrbLayout" ||
      e.detail.key === "showClockLunarCalendar" ||
      e.detail.key === "showClockLunarMode"
    ) {
      updateTime()
    }
  })
  window.addEventListener("layoutUpdated", (e) => {
    if (
      e.detail.key.startsWith("customTitle") ||
      e.detail.key === "showCustomTitle" ||
      e.detail.key === "freeMoveCustomTitle"
    ) {
      updateCustomTitle()
    }
  })
}

export function updateCustomTitle() {
  const settings = getSettings()
  let el = document.getElementById("custom-title-display")
  if (!el) return

  if (settings.showCustomTitle === false) {
    fadeToggle(el, false, "block")
    return
  } else {
    fadeToggle(el, true, "block")
  }

  const text = settings.customTitleText || ""
  const text2 = settings.customTitleText2 || ""
  const text3 = settings.customTitleText3 || ""
  const text4 = settings.customTitleText4 || ""

  if (!text && !text2 && !text3 && !text4) {
    el.style.display = "none"
    return
  }
  el.style.display = "block"

  const isMulti = settings.customTitleMulticolor === true
  const direction = settings.customTitleDirection || "horizontal"
  const order = settings.customTitleOrder || "normal"
  const wordWrap = settings.customTitleWordWrap === true
  const animation = settings.customTitleAnimation || "none"
  const animationLoop = settings.customTitleAnimationLoop || "infinite"
  const font1 = settings.customTitleFont || "inherit"
  const font2 = settings.customTitleFont2 || "inherit"
  const font3 = settings.customTitleFont3 || "inherit"
  const font4 = settings.customTitleFont4 || "inherit"
  const ori1 = settings.customTitleOrientation || "upright"
  const ori2 = settings.customTitleOrientation2 || "mixed"
  const ori3 = settings.customTitleOrientation3 || "mixed"
  const ori4 = settings.customTitleOrientation4 || "mixed"
  const lineSpacing = settings.customTitleLineSpacing !== undefined ? settings.customTitleLineSpacing : 15
  const combinedText = text + "||" + text2 + "||" + text3 + "||" + text4 + "||" + direction + "||" + order + "||" + wordWrap + "||" + animation + "||" + animationLoop + "||" + font1 + "||" + font2 + "||" + font3 + "||" + font4 + "||" + ori1 + "||" + ori2 + "||" + ori3 + "||" + ori4 + "||" + lineSpacing

  if (
    el.dataset.prevText !== combinedText ||
    el.dataset.prevMulti !== String(isMulti)
  ) {
    el.innerHTML = ""
    
    // Create inner wrapper for animations so it doesn't conflict with draggable transform
    const innerWrap = document.createElement("div")
    innerWrap.className = "custom-title-inner"

    // Set animation classes on inner wrapper
    if (animation !== "none") {
      innerWrap.classList.add(`title-anim-${animation}`)
      if (animationLoop === "once") {
        innerWrap.classList.add(`title-anim-once`)
      }
    }

    // Set direction
    el.className = "custom-title-display"
    if (direction === "vertical") {
      el.style.writingMode = order === "reverse" ? "vertical-rl" : "vertical-lr"
      el.style.display = "block"
      innerWrap.style.writingMode = order === "reverse" ? "vertical-rl" : "vertical-lr"
      innerWrap.style.display = "block"
    } else {
      el.style.writingMode = "horizontal-tb"
      el.style.textOrientation = "mixed"
      el.style.display = order === "reverse" ? "flex" : "block"
      if (order === "reverse") {
         el.style.flexDirection = "column-reverse"
         el.style.alignItems = "center"
         innerWrap.style.display = "flex"
         innerWrap.style.flexDirection = "column-reverse"
         innerWrap.style.alignItems = "center"
      } else {
         innerWrap.style.display = "block"
      }
      innerWrap.style.writingMode = "horizontal-tb"
      innerWrap.style.textOrientation = "mixed"
    }
    // Calculate total chars across all lines to sync animations
    const totalChars = (text || "").length + (text2 || "").length + (text3 || "").length + (text4 || "").length
    const globalTotalDuration = Math.max(3, totalChars * 0.1 + 2)
    let globalCharIndex = 0

    // Create lines
    const createLine = (content, fontFamily, lineNumber, orientation) => {
      if (!content) return null
      const div = document.createElement("div")
      div.dataset.line = lineNumber
      if (fontFamily && fontFamily !== "inherit") {
        div.style.fontFamily = fontFamily
      }
      if (direction === "vertical") {
        div.style.margin = `0 ${lineSpacing}px`
      } else {
        div.style.margin = `${lineSpacing}px 0`
      }
      if (direction === "vertical") {
        const charAnimations = ["typing", "wave", "glow", "glitch", "flip", "shake", "float", "neon", "focus"]
        const hasCharAnim = charAnimations.includes(animation)

        if (wordWrap) {
          // In vertical mode, wordWrap means we stack horizontal words vertically
          div.style.writingMode = "horizontal-tb"
          div.style.display = "flex"
          div.style.flexDirection = "column"
          div.style.alignItems = "center"
          div.style.justifyContent = "center"
          div.style.gap = "4px"
          div.style.minWidth = "max-content" // Prevent orthogonal clipping
          const words = content.split(" ")
          words.forEach(w => {
            if (w.trim() !== "") {
              const wordSpan = document.createElement("span")
              wordSpan.style.whiteSpace = "nowrap"
              if (hasCharAnim) {
                const chars = w.split("")
                chars.forEach(char => {
                  const span = document.createElement("span")
                  span.textContent = char
                  span.dataset.char = char
                  span.style.animationDelay = `${globalCharIndex * 0.1}s`
                  if (animation === "typing") span.style.animationDuration = `${globalTotalDuration}s`
                  span.className = "char-anim"
                  wordSpan.appendChild(span)
                  globalCharIndex++
                })
              } else {
                wordSpan.textContent = w
              }
              div.appendChild(wordSpan)
            } else if (hasCharAnim) {
              // Count the space for delay even if it's trimmed out in vertical stacking
              globalCharIndex++
            }
          })
        } else {
          div.style.textOrientation = orientation
          
          if (hasCharAnim) {
            const words = content.split(" ")
            words.forEach((word, wordIndex) => {
              const wordSpan = document.createElement("span")
              wordSpan.style.whiteSpace = "nowrap"
              
              const chars = word.split("")
              chars.forEach((char) => {
                const span = document.createElement("span")
                span.textContent = char
                span.dataset.char = char
                span.style.animationDelay = `${globalCharIndex * 0.1}s`
                if (animation === "typing") span.style.animationDuration = `${globalTotalDuration}s`
                span.className = "char-anim"
                wordSpan.appendChild(span)
                globalCharIndex++
              })
              
              div.appendChild(wordSpan)
              
              if (wordIndex < words.length - 1) {
                div.appendChild(document.createTextNode(" "))
                globalCharIndex++
              }
            })
          } else {
            div.textContent = content
          }
        }
      } else {
        // Horizontal mode
        div.style.textOrientation = "mixed"
        
        const charAnimations = ["typing", "wave", "glow", "glitch", "flip", "shake", "float", "neon", "focus"]
        if (charAnimations.includes(animation)) {
          const words = content.split(" ")
          words.forEach((word, wordIndex) => {
            const wordSpan = document.createElement("span")
            wordSpan.style.whiteSpace = "nowrap"
            
            const chars = word.split("")
            chars.forEach((char) => {
              const span = document.createElement("span")
              span.textContent = char
              span.dataset.char = char
              span.style.animationDelay = `${globalCharIndex * 0.1}s`
              if (animation === "typing") {
                span.style.animationDuration = `${globalTotalDuration}s`
              }
              span.className = "char-anim"
              wordSpan.appendChild(span)
              globalCharIndex++
            })
            
            div.appendChild(wordSpan)
            
            if (wordIndex < words.length - 1) {
              div.appendChild(document.createTextNode(" "))
              globalCharIndex++
            }
          })
        } else {
          div.textContent = content
        }
        
        if (wordWrap) {
          div.style.whiteSpace = "pre-wrap"
          div.style.wordBreak = "break-word"
          div.style.width = "min-content"
          div.style.margin = "0 auto"
        }
      }
      
      if (isMulti) applyHuePerCharacter(div, 42)
      return div
    }

    const line1 = createLine(text, font1, "1", ori1)
    const line2 = createLine(text2, font2, "2", ori2)
    const line3 = createLine(text3, font3, "3", ori3)
    const line4 = createLine(text4, font4, "4", ori4)

    if (line1) innerWrap.appendChild(line1)
    if (line2) innerWrap.appendChild(line2)
    if (line3) innerWrap.appendChild(line3)
    if (line4) innerWrap.appendChild(line4)
    el.appendChild(innerWrap)

    el.dataset.prevText = combinedText
    el.dataset.prevMulti = String(isMulti)
  }

  el.style.color = settings.customTitleColor || "#ffffff"
  
  const l1 = el.querySelector('[data-line="1"]')
  const l2 = el.querySelector('[data-line="2"]')
  const l3 = el.querySelector('[data-line="3"]')
  const l4 = el.querySelector('[data-line="4"]')
  
  if (l1) {
    l1.style.fontSize = (settings.customTitleFontSize || 24) + "px"
    l1.style.letterSpacing = (settings.customTitleLetterSpacing || 0) + "px"
  }
  if (l2) {
    l2.style.fontSize = (settings.customTitleFontSize2 || 24) + "px"
    l2.style.letterSpacing = (settings.customTitleLetterSpacing2 || 0) + "px"
  }
  if (l3) {
    l3.style.fontSize = (settings.customTitleFontSize3 || 24) + "px"
    l3.style.letterSpacing = (settings.customTitleLetterSpacing3 || 0) + "px"
  }
  if (l4) {
    l4.style.fontSize = (settings.customTitleFontSize4 || 24) + "px"
    l4.style.letterSpacing = (settings.customTitleLetterSpacing4 || 0) + "px"
  }

  const titleTextTargets = [el, ...el.querySelectorAll(".clock-hue-char")]
  if (settings.customTitleBorderSize > 0) {
    const stroke = `${settings.customTitleBorderSize}px ${settings.customTitleBorderColor}`
    titleTextTargets.forEach((target) => {
      target.style.webkitTextStroke = stroke
    })
  } else {
    titleTextTargets.forEach((target) => {
      target.style.webkitTextStroke = ""
    })
  }

  if (settings.customTitleShadowBlur > 0 || settings.customTitleShadowY != 0) {
    const shadow = `0px ${settings.customTitleShadowY || 0}px ${settings.customTitleShadowBlur || 0}px ${settings.customTitleShadowColor || "#000000"}`
    titleTextTargets.forEach((target) => {
      target.style.textShadow = shadow
    })
  } else {
    titleTextTargets.forEach((target) => {
      target.style.textShadow = "none"
    })
  }

  makeDraggable(el, "customTitle")
}
