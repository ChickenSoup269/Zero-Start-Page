// src/components/clock/clockStyleScheduler.js
//
// Switches dateClockStyle automatically between a day and a night style at
// user-configured times. Runs its own 30s check so style changes happen
// without a reload, and re-checks immediately when a schedule setting is
// touched (layoutUpdated).
import {
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"

let schedulerTimer = null

function parseTimeToMinutes(value, fallback) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ""))
  if (!match) return fallback
  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  if (isNaN(hours) || isNaN(minutes)) return fallback
  return Math.min(24 * 60 - 1, Math.max(0, hours * 60 + minutes))
}

export function getScheduledStyle(settings = getSettings()) {
  if (settings.clockStyleScheduleEnabled !== true) return null
  const day = settings.clockStyleScheduleDay || "default"
  const night = settings.clockStyleScheduleNight || "default"
  if (day === night) return null
  const dayStart = parseTimeToMinutes(
    settings.clockStyleScheduleDayStart,
    7 * 60,
  )
  const nightStart = parseTimeToMinutes(
    settings.clockStyleScheduleNightStart,
    19 * 60,
  )
  const now = new Date()
  const minutesOfDay = now.getHours() * 60 + now.getMinutes()
  // Normal window (e.g. 07:00 → 19:00) and window wrapping midnight
  // (e.g. day starts 22:00, night starts 06:00)
  const isDay =
    dayStart <= nightStart
      ? minutesOfDay >= dayStart && minutesOfDay < nightStart
      : minutesOfDay >= dayStart || minutesOfDay < nightStart
  return isDay ? day : night
}

function applyScheduledStyle() {
  const settings = getSettings()
  if (settings.clockStyleScheduleEnabled !== true) return
  const target = getScheduledStyle(settings)
  if (!target || settings.dateClockStyle === target) return
  if (window.appHandleSettingUpdate) {
    window.appHandleSettingUpdate("dateClockStyle", target)
  } else {
    updateSetting("dateClockStyle", target)
    saveSettings()
  }
  window.dispatchEvent(
    new CustomEvent("layoutUpdated", {
      detail: { key: "dateClockStyle", value: target },
    }),
  )
}

export function startClockStyleScheduler() {
  applyScheduledStyle()
  if (schedulerTimer) clearInterval(schedulerTimer)
  schedulerTimer = setInterval(applyScheduledStyle, 30 * 1000)
  window.addEventListener("layoutUpdated", (e) => {
    if (String(e?.detail?.key || "").startsWith("clockStyleSchedule")) {
      applyScheduledStyle()
    }
  })
}
