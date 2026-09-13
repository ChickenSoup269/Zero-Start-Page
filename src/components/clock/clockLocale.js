import { convertSolar2Lunar } from "../../utils/lunarCalendar.js"
import { getSettings } from "../../services/state.js"
import { geti18n } from "../../services/i18n.js"

export function formatViShortWeekday(str) {
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

export function getIntlLanguageCode(settings) {
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

export function getClockDateLanguageCode(settings) {
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

export function isCustomLanguage(settings) {
  return Boolean(settings.customLanguages?.[settings.language])
}

export function getCustomTranslation(settings, key) {
  const translations =
    settings.customLanguages?.[settings.language]?.translations
  return typeof translations?.[key] === "string" ? translations[key] : ""
}

export function getZonedDateParts(date, tz) {
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

export function getZonedDate(date, tz) {
  return tz ? new Date(date.toLocaleString("en-US", { timeZone: tz })) : date
}

export function getVietnameseLunarParts(date, tz) {
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


export function getZonedWeekdayIndex(date, tz) {
  if (!tz) return date.getDay()

  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: tz,
  }).format(date)
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday)
}

export function getLocalizedMonthName(date, lang, tz, settings, style = "long") {
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

export function getSafeWeekday(date, lang, isShort, tz, settings = getSettings()) {
  const i18n = geti18n()
  const weekdayIndex = getZonedWeekdayIndex(date, tz)
  const weekdayKey = isShort
    ? WEEKDAY_I18N_KEYS[weekdayIndex]
    : WEEKDAY_FULL_I18N_KEYS[weekdayIndex]
  const translatedWeekday = isCustomLanguage(settings)
    ? getCustomTranslation(settings, weekdayKey)
    : i18n[weekdayKey]

  if (translatedWeekday) {
    return `<span class="weekday-part">${translatedWeekday}</span>`
  }

  const format = isShort && lang !== "vi-VN" ? "short" : "long"
  let str = date.toLocaleDateString(lang, { weekday: format, timeZone: tz })
  if (isShort && lang === "vi-VN") {
    str = formatViShortWeekday(str)
  }
  if (str) {
    str = str.charAt(0).toUpperCase() + str.slice(1)
  }
  return `<span class="weekday-part">${str}</span>`
}

export function getCustomDateString(now, langCode, tz, settings, formatOverride) {
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

export function _buildSidestyleDateStr(now, langCode, tz, settings) {
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

export function getClockLabel(key, fallback) {
  return geti18n()[key] || fallback
}

