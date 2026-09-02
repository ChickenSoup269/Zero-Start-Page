import {
  getSettings,
  updateSetting,
  saveSettings,
  getCalendarEvents,
  addCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../services/state.js"
import { fadeToggle } from "../utils/dom.js"
import { showPrompt, showConfirm, showAlert } from "../utils/dialog.js"
import { geti18n } from "../services/i18n.js"
import {
  getLunarDateString,
  getVietnameseHoliday,
  convertSolar2Lunar,
} from "../utils/lunarCalendar.js"

const GCAL_CACHE_KEY = "startpage_calendar_gcal_cache"

function getCalendarDisplayMode(settings = getSettings()) {
  const mode = settings.calendarDateMode
  if (mode === "solar" || mode === "lunar" || mode === "both") {
    return mode
  }
  return settings.showLunarCalendar ? "both" : "solar"
}

function getCalendarEventSource(settings = getSettings()) {
  return settings.calendarEventSource === "google" ? "google" : "local"
}

function getCalendarSize(settings = getSettings()) {
  return ["mini", "normal", "expanded"].includes(settings.calendarSize)
    ? settings.calendarSize
    : "normal"
}

function normalizeGoogleCalendarUrl(value) {
  let url = String(value || "").trim()
  if (!url) return ""
  if (url.startsWith("webcal://")) {
    url = `https://${url.slice(9)}`
  }
  if (/^https?:\/\//i.test(url)) {
    return url
  }
  return ""
}

function decodeIcsText(value = "") {
  return String(value || "")
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function cleanHtmlDescription(value = "") {
  if (!value) return ""
  let text = decodeIcsText(value)
  // Clean google calendar blob tags
  text = text.replace(/<\/?html-blob[^>]*>/gi, "")
  // Convert line breaks and paragraph tags
  text = text.replace(/<br\s*\/?>/gi, "\n")
  text = text.replace(/<\/p>/gi, "\n\n")
  text = text.replace(/<p[^>]*>/gi, "")
  text = text.replace(/<div[^>]*>/gi, "")
  text = text.replace(/<\/div>/gi, "\n")
  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, "")
  // Normalize consecutive empty lines
  text = text.replace(/\n{3,}/g, "\n\n")
  return text.trim()
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function linkifyText(text = "") {
  const escaped = escapeHtml(text)
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g
  return escaped.replace(
    urlRegex,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="calendar-link">$1</a>',
  )
}

function extractMeetingInfo(text = "", location = "", url = "") {
  const combined = `${url} ${location} ${text}`

  // Google Meet
  const meetMatch = combined.match(/https?:\/\/meet\.google\.com\/[a-z0-9-]+/i)
  if (meetMatch) {
    return {
      meetingUrl: meetMatch[0],
      meetingType: "meet",
      meetingLabel: "Google Meet",
      iconClass: "fa-solid fa-video",
    }
  }

  // Zoom
  const zoomMatch = combined.match(
    /https?:\/\/[a-zA-Z0-9.-]*zoom\.us\/(?:j|my|w)\/[0-9a-zA-Z?=_&#-]+/i,
  )
  if (zoomMatch) {
    return {
      meetingUrl: zoomMatch[0],
      meetingType: "zoom",
      meetingLabel: "Zoom",
      iconClass: "fa-solid fa-video",
    }
  }

  // Microsoft Teams
  const teamsMatch = combined.match(
    /https?:\/\/(?:teams\.microsoft\.com\/l\/meetup-join|teams\.live\.com\/meet)\/[^\s"'>]+/i,
  )
  if (teamsMatch) {
    return {
      meetingUrl: teamsMatch[0],
      meetingType: "teams",
      meetingLabel: "Microsoft Teams",
      iconClass: "fa-solid fa-users-rectangle",
    }
  }

  // Webex
  const webexMatch = combined.match(
    /https?:\/\/[a-zA-Z0-9.-]+\.webex\.com\/[^\s"'>]+/i,
  )
  if (webexMatch) {
    return {
      meetingUrl: webexMatch[0],
      meetingType: "webex",
      meetingLabel: "Webex",
      iconClass: "fa-solid fa-video",
    }
  }

  // Skype
  const skypeMatch = combined.match(/https?:\/\/join\.skype\.com\/[^\s"'>]+/i)
  if (skypeMatch) {
    return {
      meetingUrl: skypeMatch[0],
      meetingType: "skype",
      meetingLabel: "Skype",
      iconClass: "fa-brands fa-skype",
    }
  }

  return null
}

function extractLocationInfo(location = "") {
  const loc = decodeIcsText(location).trim()
  if (!loc) return { text: "", mapsUrl: "" }

  // If location is a web URL, don't generate a Google Maps link
  if (/^https?:\/\//i.test(loc)) {
    return { text: loc, mapsUrl: "" }
  }

  return {
    text: loc,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`,
  }
}

function parseIcsDate(value = "") {
  const clean = String(value || "").trim()
  if (!clean) return null

  // Date only: YYYYMMDD
  const dateOnly = clean.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (dateOnly) {
    const year = Number(dateOnly[1])
    const month = Number(dateOnly[2]) - 1
    const day = Number(dateOnly[3])
    return {
      date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`,
      time: "",
      allDay: true,
      obj: new Date(year, month, day, 0, 0, 0),
    }
  }

  // DateTime: YYYYMMDDTHHMMSS[Z]
  const dateTime = clean.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?/,
  )
  if (!dateTime) return null

  const isUtc = !!dateTime[7]
  const year = Number(dateTime[1])
  const month = Number(dateTime[2]) - 1
  const day = Number(dateTime[3])
  const hour = Number(dateTime[4])
  const min = Number(dateTime[5])
  const sec = Number(dateTime[6] || 0)

  const date = isUtc
    ? new Date(Date.UTC(year, month, day, hour, min, sec))
    : new Date(year, month, day, hour, min, sec)

  if (Number.isNaN(date.getTime())) return null

  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
    allDay: false,
    obj: date,
  }
}

function parseIcsDuration(value = "") {
  const clean = String(value || "").trim()
  if (!clean) return 0

  const match = clean.match(
    /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i,
  )
  if (!match) return 0

  const weeks = parseInt(match[1] || 0, 10)
  const days = parseInt(match[2] || 0, 10)
  const hours = parseInt(match[3] || 0, 10)
  const minutes = parseInt(match[4] || 0, 10)
  const seconds = parseInt(match[5] || 0, 10)

  return (
    ((((weeks * 7 + days) * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000
  )
}

function formatDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function formatTimeStr(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function pushEventOccurrences(
  eventsArray,
  baseEvent,
  uid,
  startObj,
  durationMs,
  allDay,
  exdates,
  index = 0,
) {
  const endObj = new Date(startObj.getTime() + durationMs)
  const startDateStr = formatDateStr(startObj)
  const endDateStr = formatDateStr(endObj)

  const startTimeStr = allDay ? "" : formatTimeStr(startObj)
  const endTimeStr = allDay ? "" : formatTimeStr(endObj)
  const timeRange = allDay
    ? ""
    : endTimeStr && endTimeStr !== startTimeStr
      ? `${startTimeStr} - ${endTimeStr}`
      : startTimeStr

  let currentObj = new Date(startObj)
  currentObj.setHours(0, 0, 0, 0)

  const endMidnight = new Date(endObj)
  if (allDay && durationMs > 0) {
    // For all-day events, DTEND is exclusive
    endMidnight.setDate(endMidnight.getDate() - 1)
  }
  endMidnight.setHours(0, 0, 0, 0)

  // Calculate total days
  const msPerDay = 24 * 60 * 60 * 1000
  const diffDays =
    Math.round((endMidnight.getTime() - currentObj.getTime()) / msPerDay) + 1
  const totalDays = Math.max(1, diffDays)
  const isMultiDay = totalDays > 1

  if (currentObj.getTime() >= endMidnight.getTime() || !isMultiDay) {
    const dateStr = formatDateStr(startObj)
    if (!exdates.has(dateStr)) {
      eventsArray.push({
        ...baseEvent,
        id: `google-${uid}-${index}-0`,
        uid,
        date: dateStr,
        time: startTimeStr,
        endTime: endTimeStr,
        timeRange,
        startDate: startDateStr,
        endDate: endDateStr,
        isMultiDay: false,
        dayIndex: 1,
        totalDays: 1,
        startObj: new Date(startObj),
        endObj: new Date(endObj),
      })
    }
    return
  }

  let dayOffset = 0
  let loopObj = new Date(currentObj)
  while (loopObj <= endMidnight && dayOffset < 90) {
    const dateStr = formatDateStr(loopObj)
    if (!exdates.has(dateStr)) {
      const isFirst = dayOffset === 0
      const isLast = loopObj.getTime() === endMidnight.getTime()

      let dayTime = ""
      let dayTimeRange = ""
      if (!allDay) {
        if (isFirst) {
          dayTime = startTimeStr
          dayTimeRange = `Từ ${startTimeStr}`
        } else if (isLast) {
          dayTime = endTimeStr
          dayTimeRange = `Đến ${endTimeStr}`
        } else {
          dayTime = ""
          dayTimeRange = "Cả ngày"
        }
      }

      eventsArray.push({
        ...baseEvent,
        id: `google-${uid}-${index}-${dayOffset}`,
        uid,
        date: dateStr,
        time: dayTime,
        endTime: isLast ? endTimeStr : "",
        timeRange: dayTimeRange || timeRange,
        startDate: startDateStr,
        endDate: endDateStr,
        isMultiDay: true,
        dayIndex: dayOffset + 1,
        totalDays,
        isStartDay: isFirst,
        isEndDay: isLast,
        startObj: new Date(startObj),
        endObj: new Date(endObj),
      })
    }
    loopObj.setDate(loopObj.getDate() + 1)
    dayOffset++
  }
}

function expandIcsEvents(rawEvents) {
  const events = []
  const maxOccurrences = 400
  const windowEnd = new Date()
  windowEnd.setFullYear(windowEnd.getFullYear() + 2) // Expand up to 2 years ahead
  const windowStart = new Date()
  windowStart.setFullYear(windowStart.getFullYear() - 1) // 1 year behind

  rawEvents.forEach((raw) => {
    // Skip cancelled events
    if (raw.STATUS && raw.STATUS.toUpperCase() === "CANCELLED") {
      return
    }

    const start = parseIcsDate(raw.DTSTART)
    if (!start) return

    let duration = 0
    if (raw.DTEND) {
      const end = parseIcsDate(raw.DTEND)
      if (end) {
        duration = Math.max(0, end.obj.getTime() - start.obj.getTime())
      }
    } else if (raw.DURATION) {
      duration = parseIcsDuration(raw.DURATION)
    } else if (!start.allDay) {
      duration = 60 * 60 * 1000 // default 1 hour for timed events
    }

    const rawSummary = raw.SUMMARY || "(Không có tiêu đề)"
    const rawDescription = raw.DESCRIPTION || ""
    const rawLocation = raw.LOCATION || ""
    const rawUrl = raw.URL || ""

    const title = decodeIcsText(rawSummary)
    const cleanDesc = cleanHtmlDescription(rawDescription)
    const locationInfo = extractLocationInfo(rawLocation)
    const meetingInfo = extractMeetingInfo(rawDescription, rawLocation, rawUrl)

    // Extract organizer if available
    let organizer = ""
    if (raw.ORGANIZER) {
      const cnMatch = raw.ORGANIZER.match(/CN="?([^";:]+)"?/i)
      const mailMatch = raw.ORGANIZER.match(/mailto:([^\s;]+)/i)
      organizer = cnMatch ? cnMatch[1] : mailMatch ? mailMatch[1] : ""
    }

    const baseEvent = {
      title,
      description: cleanDesc,
      rawDescription,
      location: locationInfo.text,
      mapsUrl: locationInfo.mapsUrl,
      meetingUrl: meetingInfo ? meetingInfo.meetingUrl : "",
      meetingType: meetingInfo ? meetingInfo.meetingType : "",
      meetingLabel: meetingInfo ? meetingInfo.meetingLabel : "",
      meetingIcon: meetingInfo ? meetingInfo.iconClass : "",
      url: rawUrl,
      organizer,
      status: raw.STATUS ? raw.STATUS.toUpperCase() : "CONFIRMED",
      source: "google",
      allDay: start.allDay,
    }

    const exdates = new Set()
    if (raw.EXDATE) {
      raw.EXDATE.forEach((ex) => {
        const parsedEx = parseIcsDate(ex)
        if (parsedEx) exdates.add(parsedEx.date)
      })
    }

    const eventUid = raw.UID || `${start.date}-${title}`

    if (!raw.RRULE) {
      pushEventOccurrences(
        events,
        baseEvent,
        eventUid,
        start.obj,
        duration,
        start.allDay,
        exdates,
      )
    } else {
      const rule = {}
      raw.RRULE.split(";").forEach((part) => {
        const [k, v] = part.split("=")
        if (k && v) rule[k.toUpperCase()] = v
      })

      const freq = rule.FREQ
      let untilDate = null
      if (rule.UNTIL) {
        const u = parseIcsDate(rule.UNTIL)
        if (u) untilDate = u.obj
      }
      const count = parseInt(rule.COUNT, 10) || null
      const interval = parseInt(rule.INTERVAL, 10) || 1

      let occurrences = 0
      const dayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }

      if (freq === "WEEKLY" && rule.BYDAY) {
        const days = rule.BYDAY.split(",")
          .map((d) => dayMap[d.replace(/[^A-Z]/g, "")])
          .filter((d) => d !== undefined)

        let weekStart = new Date(start.obj)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())

        while (occurrences < maxOccurrences) {
          if (untilDate && weekStart > untilDate) break
          if (weekStart > windowEnd) break

          for (const day of days.sort((a, b) => a - b)) {
            const dayObj = new Date(weekStart)
            dayObj.setDate(dayObj.getDate() + day)
            dayObj.setHours(
              start.obj.getHours(),
              start.obj.getMinutes(),
              start.obj.getSeconds(),
              0,
            )

            if (dayObj >= start.obj && dayObj <= windowEnd) {
              if (untilDate && dayObj > untilDate) break
              if (dayObj >= windowStart) {
                pushEventOccurrences(
                  events,
                  baseEvent,
                  eventUid,
                  dayObj,
                  duration,
                  start.allDay,
                  exdates,
                  occurrences,
                )
              }
              occurrences++
              if (count && occurrences >= count) break
            }
          }
          if (count && occurrences >= count) break
          weekStart.setDate(weekStart.getDate() + 7 * interval)
        }
      } else {
        let currentObj = new Date(start.obj)
        while (occurrences < maxOccurrences) {
          if (untilDate && currentObj > untilDate) break
          if (currentObj > windowEnd) break

          if (currentObj >= windowStart) {
            pushEventOccurrences(
              events,
              baseEvent,
              eventUid,
              currentObj,
              duration,
              start.allDay,
              exdates,
              occurrences,
            )
          }

          occurrences++
          if (count && occurrences >= count) break

          if (freq === "DAILY") {
            currentObj.setDate(currentObj.getDate() + interval)
          } else if (freq === "WEEKLY") {
            currentObj.setDate(currentObj.getDate() + 7 * interval)
          } else if (freq === "MONTHLY") {
            if (rule.BYMONTHDAY) {
              const bmd = parseInt(rule.BYMONTHDAY, 10)
              currentObj.setMonth(currentObj.getMonth() + interval)
              currentObj.setDate(bmd)
            } else {
              currentObj.setMonth(currentObj.getMonth() + interval)
            }
          } else if (freq === "YEARLY") {
            currentObj.setFullYear(currentObj.getFullYear() + interval)
          } else {
            break
          }
        }
      }
    }
  })

  return events
}

function parseGoogleCalendarIcs(text) {
  if (!text || typeof text !== "string") return []

  // RFC 5545 line unfolding: a CRLF/LF immediately followed by a space or tab is folded line
  const unfolded = text.replace(/\r\n[ \t]|\r[ \t]|\n[ \t]/g, "")
  const lines = unfolded.split(/\r?\n/).map((line) => line.trim())

  const rawEvents = []
  let current = null
  let nestedDepth = 0

  lines.forEach((line) => {
    if (line === "BEGIN:VEVENT") {
      current = {}
      nestedDepth = 0
      return
    }
    if (line === "END:VEVENT") {
      if (current && current.DTSTART) {
        rawEvents.push(current)
      }
      current = null
      return
    }
    if (!current) return

    if (line.startsWith("BEGIN:")) {
      nestedDepth++
      return
    }
    if (line.startsWith("END:")) {
      nestedDepth = Math.max(0, nestedDepth - 1)
      return
    }

    if (nestedDepth > 0) return

    const separatorIndex = line.indexOf(":")
    if (separatorIndex === -1) return

    const keyPart = line.slice(0, separatorIndex)
    const key = keyPart.split(";")[0].toUpperCase()
    const value = line.slice(separatorIndex + 1)

    if (
      key === "UID" ||
      key === "SUMMARY" ||
      key === "DESCRIPTION" ||
      key === "LOCATION" ||
      key === "DTSTART" ||
      key === "DTEND" ||
      key === "DURATION" ||
      key === "RRULE" ||
      key === "EXDATE" ||
      key === "STATUS" ||
      key === "URL" ||
      key === "ORGANIZER"
    ) {
      if (key === "EXDATE") {
        current.EXDATE = current.EXDATE || []
        current.EXDATE.push(...value.split(","))
      } else if (key === "ORGANIZER") {
        current.ORGANIZER = line // keep full line for CN/mailto
      } else {
        current[key] = value
      }
    }
  })

  return expandIcsEvents(rawEvents)
}

export class FullCalendar {
  constructor() {
    this.container = document.getElementById("full-calendar-container")

    this.isVisible = getSettings().showFullCalendar === true
    this.calendarDateMode = getCalendarDisplayMode()
    this.calendarEventSource = getCalendarEventSource()
    this.calendarSize = getCalendarSize()
    this.showLunar = this.calendarDateMode !== "solar"
    this.viewDate = new Date()
    this.selectedDate = null
    this.googleEvents = []
    this.googleCalendarStatus = ""
    this.googleCalendarLoading = false
    this.googleCalendarLoadedUrl = ""
    this.lastSyncTime = null

    this.loadCachedGoogleEvents()
    this.init()
  }

  loadCachedGoogleEvents() {
    try {
      const cachedRaw = localStorage.getItem(GCAL_CACHE_KEY)
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw)
        const currentUrl = normalizeGoogleCalendarUrl(
          getSettings().googleCalendarIcsUrl,
        )
        if (
          cached &&
          cached.url === currentUrl &&
          Array.isArray(cached.events)
        ) {
          this.googleEvents = cached.events
          this.googleCalendarLoadedUrl = cached.url
          this.lastSyncTime = cached.timestamp
            ? new Date(cached.timestamp)
            : null
          if (this.lastSyncTime) {
            const timeStr = formatTimeStr(this.lastSyncTime)
            const i18n = geti18n()
            const msg = i18n.calendar_last_synced || "Last synced: {time}"
            this.googleCalendarStatus = msg.replace("{time}", timeStr)
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load Google Calendar cache", e)
    }
  }

  saveCachedGoogleEvents(events, url) {
    try {
      const payload = {
        url,
        timestamp: Date.now(),
        events,
      }
      localStorage.setItem(GCAL_CACHE_KEY, JSON.stringify(payload))
      this.lastSyncTime = new Date()
    } catch (e) {
      console.warn("Failed to save Google Calendar cache", e)
    }
  }

  syncCalendarMode() {
    this.calendarDateMode = getCalendarDisplayMode()
    this.showLunar = this.calendarDateMode !== "solar"
  }

  init() {
    this.render()
    this.applySkin()
    this.setupEventListeners()
    this.updateVisibility()

    const url = normalizeGoogleCalendarUrl(getSettings().googleCalendarIcsUrl)
    if (this.calendarEventSource === "google" && url) {
      // If no cached events or cache is older than 20 minutes, refresh silently
      const shouldRefresh =
        !this.googleEvents.length ||
        !this.lastSyncTime ||
        Date.now() - this.lastSyncTime.getTime() > 20 * 60 * 1000
      if (shouldRefresh) {
        this.refreshGoogleCalendar({ silent: true })
      }
    }
  }

  setupEventListeners() {
    window.addEventListener("layoutUpdated", (e) => {
      if (e.detail.key === "showFullCalendar") {
        this.isVisible = e.detail.value
        this.updateVisibility()
      }
      if (
        e.detail.key === "showLunarCalendar" ||
        e.detail.key === "calendarDateMode" ||
        e.detail.key === "calendarShowSourceSwitcher" ||
        e.detail.key === "calendarSize"
      ) {
        this.syncCalendarMode()
        this.render()
      }
      if (e.detail.key === "language") {
        this.render()
      }
    })

    // Left click handlers
    this.container.addEventListener("click", (e) => {
      const sourceTab = e.target.closest(".calendar-source-tab")
      if (sourceTab) {
        this.setCalendarEventSource(sourceTab.dataset.source)
      } else if (e.target.closest("#calendar-google-save")) {
        this.saveGoogleCalendarUrl()
      } else if (e.target.closest("#calendar-google-refresh")) {
        this.refreshGoogleCalendar()
      } else if (e.target.closest("#calendar-today-btn")) {
        this.goToToday()
      } else if (e.target.closest("#prev-month")) {
        this.navigateMonth(-1)
      } else if (e.target.closest("#next-month")) {
        this.navigateMonth(1)
      } else if (e.target.closest("#calendar-close-btn")) {
        e.stopPropagation()
        this.hideContextMenu?.()
        this.hideEventPreview?.()
        updateSetting("showFullCalendar", false)
        saveSettings()
        this.isVisible = false
        this.updateVisibility()
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: "showFullCalendar", value: false },
          }),
        )
      } else if (e.target.closest("#calendar-add-event")) {
        if (this.calendarEventSource !== "local") return
        const rect = e.target
          .closest("#calendar-add-event")
          .getBoundingClientRect()
        const dateStr = this.selectedDate
          ? this.formatDate(this.selectedDate)
          : this.formatDate(new Date())
        this.showEventFormMenu(rect.left, rect.bottom + 8, { dateStr })
      } else if (e.target.closest(".calendar-event")) {
        const eventId = e.target.closest(".calendar-event").dataset.eventId
        if (this.calendarEventSource === "google") {
          this.showGoogleEventDetailMenu(e.clientX, e.clientY, eventId)
        } else {
          this.showEventContextMenu(e.clientX, e.clientY, eventId)
        }
        e.stopPropagation()
      } else if (e.target.closest(".day-item")) {
        const dayItem = e.target.closest(".day-item")
        if (dayItem.dataset.monthOffset) {
          const offset = parseInt(dayItem.dataset.monthOffset, 10)
          this.navigateMonth(offset)
          return
        }
        const dayNumber = dayItem.dataset.day
        if (dayNumber) {
          this.selectDay(dayItem)
          const day = parseInt(dayNumber, 10)
          const dateStr = `${this.viewDate.getFullYear()}-${String(this.viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const events = this.getVisibleEvents().filter(
            (evt) => evt.date === dateStr,
          )
          this.showDayContextMenu(e.clientX, e.clientY, day, events)
          e.stopPropagation()
        }
      }
    })

    // Right click (context menu) handlers
    this.container.addEventListener("contextmenu", (e) => {
      e.preventDefault()

      if (e.target.closest(".calendar-event")) {
        const eventId = e.target.closest(".calendar-event").dataset.eventId
        if (this.calendarEventSource === "google") {
          this.showGoogleEventDetailMenu(e.clientX, e.clientY, eventId)
        } else {
          this.showEventContextMenu(e.clientX, e.clientY, eventId)
        }
      } else if (e.target.closest(".day-item")) {
        const dayItem = e.target.closest(".day-item")
        if (dayItem.dataset.monthOffset) {
          const offset = parseInt(dayItem.dataset.monthOffset, 10)
          this.navigateMonth(offset)
          return
        }
        const dayNumber = dayItem.dataset.day
        if (dayNumber) {
          const day = parseInt(dayNumber, 10)
          const dateStr = `${this.viewDate.getFullYear()}-${String(this.viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const events = this.getVisibleEvents().filter(
            (evt) => evt.date === dateStr,
          )
          this.showDayContextMenu(e.clientX, e.clientY, day, events)
        }
      }
    })

    this.container.addEventListener("mouseover", (e) => {
      const eventEl = e.target.closest(".calendar-event")
      if (eventEl && this.container.contains(eventEl)) {
        this.showEventPreview(e.clientX, e.clientY, eventEl.dataset.eventId)
        return
      }

      const holidayEl = e.target.closest(".holiday-name")
      if (holidayEl && this.container.contains(holidayEl)) {
        this.showHolidayPreview(e.clientX, e.clientY, holidayEl)
      }
    })

    this.container.addEventListener("mousemove", (e) => {
      if (this.currentEventPreview) {
        this.positionContextMenu(
          this.currentEventPreview,
          e.clientX,
          e.clientY,
          "left",
        )
      } else if (this.currentHolidayPreview) {
        this.positionContextMenu(
          this.currentHolidayPreview,
          e.clientX,
          e.clientY,
          "left",
        )
      }
    })

    this.container.addEventListener("mouseout", (e) => {
      const eventEl = e.target.closest(".calendar-event")
      if (eventEl && !eventEl.contains(e.relatedTarget)) {
        this.hideEventPreview()
      }

      const holidayEl = e.target.closest(".holiday-name")
      if (holidayEl && !holidayEl.contains(e.relatedTarget)) {
        this.hideHolidayPreview()
      }
    })

    // Close context menu on click outside
    document.addEventListener("click", (e) => {
      if (
        this.currentContextMenu &&
        !this.currentContextMenu.contains(e.target)
      ) {
        this.hideContextMenu()
      }
    })
  }

  formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  getVisibleEvents() {
    return this.calendarEventSource === "google"
      ? this.googleEvents
      : getCalendarEvents()
  }

  async setCalendarEventSource(source) {
    const normalized = source === "google" ? "google" : "local"
    if (this.calendarEventSource === normalized) return

    this.calendarEventSource = normalized
    updateSetting("calendarEventSource", normalized)
    saveSettings()
    this.hideContextMenu()
    this.render()

    const url = normalizeGoogleCalendarUrl(getSettings().googleCalendarIcsUrl)
    if (
      normalized === "google" &&
      url &&
      this.googleCalendarLoadedUrl !== url
    ) {
      await this.refreshGoogleCalendar({ silent: true })
    }
  }

  async saveGoogleCalendarUrl() {
    const input = this.container.querySelector("#calendar-google-url")
    const url = normalizeGoogleCalendarUrl(input?.value)
    const i18n = geti18n()

    if (!url) {
      this.googleCalendarStatus =
        i18n.calendar_google_url_invalid ||
        "Use a valid iCal URL (https://... or webcal://...)."
      this.render()
      return
    }

    updateSetting("googleCalendarIcsUrl", url)
    saveSettings()
    await this.refreshGoogleCalendar()
  }

  async refreshGoogleCalendar({ silent = false } = {}) {
    const i18n = geti18n()
    const url = normalizeGoogleCalendarUrl(getSettings().googleCalendarIcsUrl)
    if (!url) {
      if (!silent) {
        this.googleCalendarStatus =
          i18n.calendar_google_url_empty ||
          "Paste your Google Calendar iCal URL."
        this.render()
      }
      return
    }

    this.googleCalendarLoading = true
    this.googleCalendarStatus = silent
      ? ""
      : i18n.calendar_google_loading || "Loading calendar events..."
    this.render()

    try {
      let text = ""
      let fetchSuccess = false

      // 1. Direct fetch with timeout
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 12000)
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (response.ok) {
          text = await response.text()
          if (text.includes("BEGIN:VCALENDAR")) {
            fetchSuccess = true
          }
        }
      } catch (directErr) {
        console.warn(
          "Direct iCal fetch failed, attempting proxy fallback...",
          directErr,
        )
      }

      // 2. Fallback via CORS proxy if direct fetch is blocked
      if (!fetchSuccess) {
        try {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
          const proxyResponse = await fetch(proxyUrl, { cache: "no-store" })
          if (proxyResponse.ok) {
            text = await proxyResponse.text()
            if (text.includes("BEGIN:VCALENDAR")) {
              fetchSuccess = true
            }
          }
        } catch (proxyErr) {
          console.warn("Proxy iCal fetch failed", proxyErr)
        }
      }

      if (!fetchSuccess || !text) {
        throw new Error("Could not retrieve valid iCal calendar data.")
      }

      this.googleEvents = parseGoogleCalendarIcs(text)
      this.googleCalendarLoadedUrl = url
      this.saveCachedGoogleEvents(this.googleEvents, url)

      const timeStr = formatTimeStr(new Date())
      const loadedMsg = i18n.calendar_google_loaded || "Loaded {count} events."
      this.googleCalendarStatus = `${loadedMsg.replace("{count}", this.googleEvents.length)} (${timeStr})`
    } catch (error) {
      console.warn("Failed to load calendar", error)
      this.googleCalendarStatus =
        i18n.calendar_google_error ||
        "Could not load that calendar URL. Please check the link."
    } finally {
      this.googleCalendarLoading = false
      this.render()
    }
  }

  selectDay(dayElement) {
    const dayNumber =
      dayElement.dataset.day ||
      dayElement.querySelector(".day-number")?.textContent
    if (!dayNumber) return

    const day = parseInt(dayNumber, 10)
    if (Number.isNaN(day)) return

    this.selectedDate = new Date(
      this.viewDate.getFullYear(),
      this.viewDate.getMonth(),
      day,
    )

    this.container
      .querySelectorAll(".day-item")
      .forEach((d) => d.classList.remove("selected"))
    dayElement.classList.add("selected")
  }

  showDayContextMenu(x, y, day, events) {
    const i18n = geti18n()
    this.hideContextMenu()

    const menu = document.createElement("div")
    menu.className = "calendar-context-menu calendar-day-menu"
    menu.addEventListener("click", (e) => e.stopPropagation())

    const dateObj = new Date(
      this.viewDate.getFullYear(),
      this.viewDate.getMonth(),
      day,
    )
    const formattedHeader = dateObj.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })

    const header = document.createElement("div")
    header.className = "calendar-day-menu-header"
    header.innerHTML = `
      <div class="calendar-day-menu-date"><i class="fa-regular fa-calendar"></i> ${formattedHeader}</div>
      <div class="calendar-day-menu-count">${events.length} ${events.length === 1 ? "sự kiện" : "sự kiện"}</div>
    `
    menu.appendChild(header)

    if (this.calendarEventSource === "local") {
      const addItem = document.createElement("div")
      addItem.className = "context-menu-item calendar-add-item-btn"
      addItem.innerHTML = `<i class="fa-solid fa-plus"></i> <span>${i18n.calendar_add_event || "Add Event"}</span>`
      addItem.addEventListener("click", () => {
        const dateStr = `${this.viewDate.getFullYear()}-${String(this.viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        const menuRect = menu.getBoundingClientRect()
        const targetX = menuRect.right
        const targetY = menuRect.top
        this.hideContextMenu()
        this.showEventFormMenu(targetX, targetY, { dateStr })
      })
      menu.appendChild(addItem)
    }

    if (events.length > 0) {
      const listContainer = document.createElement("div")
      listContainer.className = "calendar-day-events-list"

      events.forEach((event) => {
        const eventItem = document.createElement("div")
        eventItem.className =
          "context-menu-item event-item calendar-day-event-card"

        let meetingBadge = ""
        if (event.meetingUrl) {
          meetingBadge = `<span class="calendar-meeting-icon-pill" title="${escapeHtml(event.meetingLabel || "Meeting")}"><i class="${event.meetingIcon || "fa-solid fa-video"}"></i></span>`
        }

        const timeLabel =
          event.timeRange ||
          (event.allDay ? i18n.calendar_all_day || "Cả ngày" : event.time || "")

        eventItem.innerHTML = `
          <div class="calendar-day-event-left">
            <span class="calendar-event-time-pill">${escapeHtml(timeLabel)}</span>
            <span class="calendar-day-event-title">${escapeHtml(event.title)}</span>
          </div>
          ${meetingBadge}
        `
        eventItem.addEventListener("click", () => {
          this.hideContextMenu()
          if (this.calendarEventSource === "google") {
            this.showGoogleEventDetailMenu(x, y, event.id)
          } else {
            this.showEventContextMenu(x, y, event.id)
          }
        })

        listContainer.appendChild(eventItem)
      })

      menu.appendChild(listContainer)
    } else {
      const empty = document.createElement("div")
      empty.className = "calendar-day-events-empty"
      empty.textContent = i18n.calendar_no_events || "Không có sự kiện nào"
      menu.appendChild(empty)
    }

    document.body.appendChild(menu)
    this.currentContextMenu = menu
    this.positionContextMenu(menu, x, y, "left")
  }

  showGoogleEventDetailMenu(x, y, eventId) {
    const event = this.getVisibleEvents().find((e) => e.id === eventId)
    if (!event) return

    const i18n = geti18n()
    this.hideContextMenu()

    const menu = document.createElement("div")
    menu.className = "calendar-context-menu calendar-google-event-modal"
    menu.addEventListener("click", (e) => e.stopPropagation())

    const timeLabel =
      event.timeRange ||
      (event.allDay ? i18n.calendar_all_day || "Cả ngày" : event.time || "")

    let html = `
      <div class="calendar-modal-header">
        <div class="calendar-modal-title-row">
          <span class="calendar-modal-badge"><i class="fa-brands fa-google"></i> Google Calendar</span>
          <button class="calendar-modal-close" type="button"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <h4 class="calendar-modal-event-title">${escapeHtml(event.title)}</h4>
      </div>
      <div class="calendar-modal-body">
        <div class="calendar-modal-meta-row">
          <i class="fa-regular fa-clock"></i>
          <span>${escapeHtml(event.date)} • ${escapeHtml(timeLabel)}</span>
        </div>
    `

    if (event.location) {
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
      html += `
        <div class="calendar-modal-meta-row">
          <i class="fa-solid fa-location-dot"></i>
          <a href="${mapUrl}" target="_blank" rel="noopener noreferrer" class="calendar-link">${escapeHtml(event.location)}</a>
        </div>
      `
    }

    if (event.meetingUrl) {
      html += `
        <div class="calendar-modal-meeting-card">
          <div class="meeting-card-info">
            <i class="${event.meetingIcon || "fa-solid fa-video"}"></i>
            <div>
              <div class="meeting-label">${escapeHtml(event.meetingLabel || "Video Call")}</div>
              <div class="meeting-url-text">${escapeHtml(event.meetingUrl)}</div>
            </div>
          </div>
          <a href="${event.meetingUrl}" target="_blank" rel="noopener noreferrer" class="calendar-join-btn">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> ${i18n.calendar_join_meeting || "Join"}
          </a>
        </div>
      `
    }

    if (event.description) {
      html += `
        <div class="calendar-modal-desc-section">
          <div class="desc-label">${i18n.calendar_description || "Description:"}</div>
          <div class="desc-content">${linkifyText(event.description)}</div>
        </div>
      `
    }

    if (event.organizer) {
      html += `
        <div class="calendar-modal-organizer">
          <i class="fa-regular fa-user"></i>
          <span>${escapeHtml(event.organizer)}</span>
        </div>
      `
    }

    html += `
      </div>
      <div class="calendar-modal-footer">
        <button class="calendar-modal-btn calendar-modal-close-btn" type="button">Đóng</button>
      </div>
    `

    menu.innerHTML = html
    menu
      .querySelectorAll(".calendar-modal-close, .calendar-modal-close-btn")
      .forEach((btn) => {
        btn.addEventListener("click", () => this.hideContextMenu())
      })

    document.body.appendChild(menu)
    this.currentContextMenu = menu
    this.positionContextMenu(menu, x, y, "left")
  }

  showEventContextMenu(x, y, eventId) {
    const event = this.getVisibleEvents().find((e) => e.id === eventId)
    if (!event) return

    const i18n = geti18n()
    this.hideContextMenu()

    const menu = document.createElement("div")
    menu.className = "calendar-context-menu"

    const editItem = document.createElement("div")
    editItem.className = "context-menu-item"
    editItem.innerHTML = `<i class="fa-solid fa-pen"></i> <span>${i18n.settings_edit || "Edit"}</span>`
    editItem.addEventListener("click", () => {
      const menuRect = menu.getBoundingClientRect()
      this.hideContextMenu()
      this.showEventFormMenu(menuRect.left, menuRect.top, event)
    })

    const deleteItem = document.createElement("div")
    deleteItem.className = "context-menu-item danger"
    deleteItem.innerHTML = `<i class="fa-solid fa-trash"></i> <span>${i18n.settings_delete || "Delete"}</span>`
    deleteItem.addEventListener("click", async () => {
      this.hideContextMenu()
      const confirmed = await showConfirm(
        i18n.calendar_delete_confirm || "Delete this event?",
      )
      if (confirmed) {
        deleteCalendarEvent(eventId)
        this.render()
      }
    })

    menu.appendChild(editItem)
    menu.appendChild(deleteItem)

    document.body.appendChild(menu)
    this.currentContextMenu = menu
    this.positionContextMenu(menu, x, y, "left")
  }

  showEventFormMenu(x, y, event = null) {
    const i18n = geti18n()
    this.hideContextMenu()

    const isEdit = Boolean(event?.id)
    const initialDate =
      event?.date ||
      (this.selectedDate
        ? this.formatDate(this.selectedDate)
        : this.formatDate(new Date()))
    const initialTime = event?.time || ""
    const initialTitle = event?.title || ""
    const initialDesc = event?.description || ""

    const menu = document.createElement("div")
    menu.className = "calendar-context-menu calendar-event-form-menu"
    menu.addEventListener("click", (e) => e.stopPropagation())

    menu.innerHTML = `
      <div class="calendar-form-title">
        <i class="${isEdit ? "fa-solid fa-pen" : "fa-solid fa-calendar-plus"}"></i>
        <span>${isEdit ? i18n.calendar_edit_event || "Edit Event" : i18n.calendar_new_event || "New Event"}</span>
      </div>
      <div class="calendar-form-body">
        <label class="calendar-form-label">
          <span>${i18n.calendar_event_title || "Tiêu đề"}</span>
          <input type="text" class="calendar-form-input calendar-event-title-input" value="${escapeHtml(initialTitle)}" placeholder="Nhập tiêu đề sự kiện..." />
        </label>
        <div class="calendar-form-row">
          <label class="calendar-form-label">
            <span>${i18n.calendar_event_date || "Ngày"}</span>
            <input type="date" class="calendar-form-input calendar-event-date-input" value="${escapeHtml(initialDate)}" />
          </label>
          <label class="calendar-form-label">
            <span>${i18n.calendar_event_time || "Giờ"}</span>
            <input type="time" class="calendar-form-input calendar-event-time-input" value="${escapeHtml(initialTime)}" />
          </label>
        </div>
        <label class="calendar-form-label">
          <span>${i18n.calendar_event_desc || "Mô tả (tùy chọn)"}</span>
          <textarea class="calendar-form-input calendar-event-desc-input" rows="2" placeholder="Ghi chú thêm...">${escapeHtml(initialDesc)}</textarea>
        </label>
      </div>
      <div class="calendar-form-actions">
        <button type="button" class="calendar-form-btn calendar-event-cancel">${i18n.settings_cancel || "Cancel"}</button>
        <button type="button" class="calendar-form-btn primary calendar-event-save">${isEdit ? i18n.settings_save || "Save" : i18n.calendar_add_event || "Add"}</button>
      </div>
    `

    const titleInput = menu.querySelector(".calendar-event-title-input")
    const dateInput = menu.querySelector(".calendar-event-date-input")
    const timeInput = menu.querySelector(".calendar-event-time-input")
    const descInput = menu.querySelector(".calendar-event-desc-input")

    menu
      .querySelector(".calendar-event-save")
      ?.addEventListener("click", () => {
        const title = titleInput.value.trim()
        const date = dateInput.value
        const time = timeInput.value
        const description = descInput.value.trim()

        if (!title) {
          titleInput.focus()
          return
        }

        if (isEdit) {
          updateCalendarEvent(event.id, {
            title,
            date,
            time,
            description,
          })
        } else {
          addCalendarEvent({
            title,
            date,
            time,
            description,
          })
        }

        this.render()
        this.hideContextMenu()
      })

    menu
      .querySelector(".calendar-event-cancel")
      ?.addEventListener("click", () => {
        this.hideContextMenu()
      })

    document.body.appendChild(menu)
    this.currentContextMenu = menu
    this.positionContextMenu(menu, x, y, "left")
    titleInput.focus()
    titleInput.select()
  }

  showEventPreview(x, y, eventId) {
    const event = this.getVisibleEvents().find((e) => e.id === eventId)
    if (!event) return

    const i18n = geti18n()
    this.hideEventPreview()

    const preview = document.createElement("div")
    preview.className = "calendar-context-menu calendar-event-preview"

    const title = document.createElement("div")
    title.className = "calendar-event-preview-title"
    title.textContent = event.title
    preview.appendChild(title)

    const meta = document.createElement("div")
    meta.className = "calendar-event-preview-meta"

    const timeText =
      event.timeRange ||
      (event.allDay ? i18n.calendar_all_day || "Cả ngày" : event.time || "")
    const metaParts = [event.date, timeText, event.location].filter(Boolean)
    meta.textContent = metaParts.join(" • ")
    preview.appendChild(meta)

    if (event.meetingUrl) {
      const meetingTag = document.createElement("div")
      meetingTag.className = "calendar-preview-meeting-tag"
      meetingTag.innerHTML = `<i class="${event.meetingIcon || "fa-solid fa-video"}"></i> ${escapeHtml(event.meetingLabel || "Video Call")}`
      preview.appendChild(meetingTag)
    }

    if (event.description) {
      const desc = document.createElement("div")
      desc.className = "calendar-event-preview-desc"
      // Truncate preview description
      const truncated =
        event.description.length > 120
          ? `${event.description.slice(0, 117)}...`
          : event.description
      desc.textContent = truncated
      preview.appendChild(desc)
    }

    document.body.appendChild(preview)
    this.currentEventPreview = preview
    this.positionContextMenu(preview, x, y, "left")
  }

  showHolidayPreview(x, y, holidayEl) {
    const dayItem = holidayEl.closest(".day-item")
    if (!dayItem) return

    this.hideHolidayPreview()

    const preview = document.createElement("div")
    preview.className = "calendar-context-menu calendar-event-preview"

    const title = document.createElement("div")
    title.className = "calendar-event-preview-title"
    title.textContent = holidayEl.textContent
    preview.appendChild(title)

    const solarDate = dayItem.dataset.day
      ? `${dayItem.dataset.day}/${this.viewDate.getMonth() + 1}/${this.viewDate.getFullYear()}`
      : ""
    const lunarDate =
      dayItem.dataset.lunarDate ||
      dayItem.querySelector(".lunar-date")?.textContent ||
      ""
    const meta = document.createElement("div")
    meta.className = "calendar-event-preview-meta"
    meta.textContent = [solarDate, lunarDate].filter(Boolean).join(" | ")
    preview.appendChild(meta)

    document.body.appendChild(preview)
    this.currentHolidayPreview = preview
    this.positionContextMenu(preview, x, y, "left")
  }

  hideEventPreview() {
    if (this.currentEventPreview) {
      this.currentEventPreview.remove()
      this.currentEventPreview = null
    }
  }

  hideHolidayPreview() {
    if (this.currentHolidayPreview) {
      this.currentHolidayPreview.remove()
      this.currentHolidayPreview = null
    }
  }

  positionContextMenu(menu, x, y, preferredSide = "auto") {
    const doPosition = () => {
      const rect = menu.getBoundingClientRect()
      let safeX = x
      let safeY = y

      if (preferredSide === "left") {
        safeX = x - rect.width - 12
        // If overflowing left screen edge, flip to right
        if (safeX < 10) {
          if (x + 12 + rect.width <= window.innerWidth - 10) {
            safeX = x + 12
          } else {
            safeX = 10
          }
        }
      } else if (preferredSide === "right") {
        safeX = x + 12
        // If overflowing right screen edge, flip to left
        if (safeX + rect.width > window.innerWidth - 10) {
          if (x - rect.width - 12 >= 10) {
            safeX = x - rect.width - 12
          } else {
            safeX = Math.max(10, window.innerWidth - rect.width - 15)
          }
        }
      } else {
        if (x + rect.width > window.innerWidth - 10) {
          safeX = Math.max(10, window.innerWidth - rect.width - 15)
        } else {
          safeX = Math.max(10, x)
        }
      }

      if (safeY + rect.height > window.innerHeight - 10) {
        safeY = Math.max(10, window.innerHeight - rect.height - 15)
      } else {
        safeY = Math.max(10, y)
      }

      menu.style.left = `${safeX}px`
      menu.style.top = `${safeY}px`
    }

    // Use requestAnimationFrame so the browser has had a chance to layout
    // the menu and getBoundingClientRect() returns the actual dimensions.
    requestAnimationFrame(doPosition)
  }

  hideContextMenu() {
    if (this.currentContextMenu) {
      this.currentContextMenu.remove()
      this.currentContextMenu = null
    }
  }

  navigateMonth(offset) {
    this.viewDate.setMonth(this.viewDate.getMonth() + offset)
    this.render()
  }

  updateVisibility() {
    if (this.container) {
      fadeToggle(this.container, this.isVisible, "block")
    }
  }

  applySkin() {
    const settings = getSettings()
    const isWhiteMode = settings.showQuickAccessBg === true
    const skin =
      settings.widgetUseM3Accent === true
        ? "m3-accent"
        : isWhiteMode
          ? "white-blur"
          : settings.calendarSkin || "default"

    this.container.classList.toggle("skin-white-blur", skin === "white-blur")
    this.container.classList.toggle("skin-m3-accent", skin === "m3-accent")
    this.container.classList.toggle(
      "skin-light-transparent",
      skin === "light-transparent",
    )
  }

  render() {
    if (!this.container) return
    this.hideEventPreview()
    this.hideHolidayPreview()

    const currentStyle = this.container.style.cssText
    this.container.innerHTML = ""
    this.container.style.cssText = currentStyle

    const i18n = geti18n()
    const year = this.viewDate.getFullYear()
    const month = this.viewDate.getMonth()
    const now = new Date()
    const settings = getSettings()

    this.syncCalendarMode()
    this.calendarEventSource = getCalendarEventSource(settings)
    this.calendarSize = getCalendarSize(settings)

    this.container.classList.add("calendar-card", "glass-panel", "drag-handle")
    this.container.classList.toggle(
      "calendar-size-mini",
      this.calendarSize === "mini",
    )
    this.container.classList.toggle(
      "calendar-size-expanded",
      this.calendarSize === "expanded",
    )
    this.container.classList.toggle("with-lunar", this.showLunar)
    this.container.classList.toggle(
      "calendar-mode-solar",
      this.calendarDateMode === "solar",
    )
    this.container.classList.toggle(
      "calendar-mode-lunar",
      this.calendarDateMode === "lunar",
    )
    this.container.classList.toggle(
      "calendar-mode-both",
      this.calendarDateMode === "both",
    )

    const monthKeys = [
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
    const monthFallbacks = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]
    const monthName = i18n[monthKeys[month]] || monthFallbacks[month]

    let lunarMonthHeader = ""
    if (this.showLunar) {
      const midDayLunar = convertSolar2Lunar(15, month + 1, year)
      lunarMonthHeader = `Tháng ${midDayLunar.month}${midDayLunar.leap ? " nhuận" : ""} ÂL`
    }

    const isCurrentMonthView =
      year === now.getFullYear() && month === now.getMonth()

    const header = document.createElement("div")
    header.className = "calendar-header"
    header.innerHTML = `
      <div class="calendar-header-title-group">
        <h3 class="month-title">
          <span class="month-name">${monthName}</span>
          <span class="year-number">${year}</span>
        </h3>
        ${lunarMonthHeader ? `<span class="lunar-month-badge">${lunarMonthHeader}</span>` : ""}
      </div>
      <div class="calendar-header-nav">
        <button id="calendar-today-btn" class="calendar-today-pill ${isCurrentMonthView ? "is-current" : ""}" type="button" title="${i18n.calendar_today || "Today"}">
          <i class="fa-regular fa-calendar-check"></i>
          <span>${i18n.calendar_today || "Today"}</span>
        </button>
        <div class="calendar-nav-btn-group">
          <button id="prev-month" class="icon-btn calendar-nav-btn" type="button" title="${i18n.calendar_prev_month || "Previous Month"}"><i class="fa-solid fa-chevron-left"></i></button>
          <button id="next-month" class="icon-btn calendar-nav-btn" type="button" title="${i18n.calendar_next_month || "Next Month"}"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
        ${this.calendarEventSource === "local" ? `<button id="calendar-add-event" class="icon-btn calendar-add-btn" type="button" title="${i18n.calendar_add_event || "Add Event"}"><i class="fa-solid fa-plus"></i></button>` : ""}
        <button id="calendar-close-btn" class="icon-btn calendar-close-btn widget-close-btn" type="button" title="${i18n.close || "Close"}"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `
    this.container.appendChild(header)

    const showSourceSwitcher = settings.calendarShowSourceSwitcher !== false
    if (showSourceSwitcher) {
      const sourceSwitcher = document.createElement("div")
      sourceSwitcher.className = "calendar-source-switcher"
      sourceSwitcher.innerHTML = `
        <button class="calendar-source-tab ${this.calendarEventSource === "local" ? "active" : ""}" data-source="local" type="button">
          <i class="fa-regular fa-calendar"></i>
          <span>${i18n.calendar_source_local || "Local"}</span>
        </button>
        <button class="calendar-source-tab ${this.calendarEventSource === "google" ? "active" : ""}" data-source="google" type="button">
          <i class="fa-brands fa-google"></i>
          <span>${i18n.calendar_source_google || "Google Calendar"}</span>
        </button>
      `
      this.container.appendChild(sourceSwitcher)
    }

    if (showSourceSwitcher && this.calendarEventSource === "google") {
      const googlePanel = document.createElement("div")
      googlePanel.className = "calendar-google-panel"
      googlePanel.innerHTML = `
        <div class="calendar-google-input-row">
          <input id="calendar-google-url" type="url" autocomplete="off" spellcheck="false" placeholder="${i18n.calendar_google_url_placeholder || "Google Calendar iCal URL"}" value="${escapeHtml(normalizeGoogleCalendarUrl(getSettings().googleCalendarIcsUrl))}">
          <button id="calendar-google-save" class="icon-btn" type="button" title="${i18n.settings_save || "Save"}"><i class="fa-solid fa-check"></i></button>
          <button id="calendar-google-refresh" class="icon-btn ${this.googleCalendarLoading ? "is-loading" : ""}" type="button" title="${i18n.calendar_refresh || "Refresh"}" ${this.googleCalendarLoading ? "disabled" : ""}><i class="fa-solid fa-rotate ${this.googleCalendarLoading ? "fa-spin" : ""}"></i></button>
        </div>
        ${this.googleCalendarStatus ? `<div class="calendar-google-status">${escapeHtml(this.googleCalendarStatus)}</div>` : ""}
      `
      this.container.appendChild(googlePanel)
    }

    const daysGrid = document.createElement("div")
    daysGrid.className = "days-grid"

    // Weekday headers
    const weekdays = [
      i18n.calendar_weekday_sun || "Sun",
      i18n.calendar_weekday_mon || "Mon",
      i18n.calendar_weekday_tue || "Tue",
      i18n.calendar_weekday_wed || "Wed",
      i18n.calendar_weekday_thu || "Thu",
      i18n.calendar_weekday_fri || "Fri",
      i18n.calendar_weekday_sat || "Sat",
    ]
    weekdays.forEach((wd, idx) => {
      const wdDiv = document.createElement("div")
      wdDiv.className = `weekday-header ${idx === 0 || idx === 6 ? "is-weekend" : ""}`
      wdDiv.textContent = wd
      daysGrid.appendChild(wdDiv)
    })

    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()

    // 1. Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const prevDay = prevMonthDays - i
      const prevDate = new Date(year, month - 1, prevDay)
      const pYear = prevDate.getFullYear()
      const pMonth = prevDate.getMonth()
      const dateStr = `${pYear}-${String(pMonth + 1).padStart(2, "0")}-${String(prevDay).padStart(2, "0")}`
      const lunarDate = this.showLunar
        ? getLunarDateString(prevDay, pMonth + 1, pYear)
        : ""
      const dayOfWeek = prevDate.getDay()

      const dayDiv = document.createElement("div")
      dayDiv.className = `day-item other-month prev-month-day ${dayOfWeek === 0 || dayOfWeek === 6 ? "is-weekend" : ""}`
      dayDiv.dataset.day = String(prevDay)
      dayDiv.dataset.solarDate = dateStr
      dayDiv.dataset.monthOffset = "-1"
      if (lunarDate) dayDiv.dataset.lunarDate = lunarDate

      const dayHeader = document.createElement("div")
      dayHeader.className = "day-info-header"
      const dayNumber = document.createElement("div")
      dayNumber.className = "day-number"
      dayNumber.textContent =
        this.calendarDateMode === "lunar"
          ? lunarDate || String(prevDay)
          : prevDay
      dayHeader.appendChild(dayNumber)

      if (this.calendarDateMode === "both" && lunarDate) {
        const lunarDiv = document.createElement("div")
        lunarDiv.className = "lunar-date"
        lunarDiv.textContent = lunarDate
        dayHeader.appendChild(lunarDiv)
      }
      dayDiv.appendChild(dayHeader)
      daysGrid.appendChild(dayDiv)
    }

    const events = this.getVisibleEvents()

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDiv = document.createElement("div")
      const currentDate = new Date(year, month, day)
      const dayOfWeek = currentDate.getDay()
      dayDiv.className = `day-item ${dayOfWeek === 0 || dayOfWeek === 6 ? "is-weekend" : ""}`

      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      const lunarDate = this.showLunar
        ? getLunarDateString(day, month + 1, year)
        : ""
      const lunarInfo = this.showLunar
        ? convertSolar2Lunar(day, month + 1, year)
        : null
      dayDiv.dataset.day = String(day)
      dayDiv.dataset.solarDate = dateStr
      dayDiv.dataset.lunarDate = lunarDate

      // Check if today
      if (
        day === now.getDate() &&
        month === now.getMonth() &&
        year === now.getFullYear()
      ) {
        dayDiv.classList.add("today")
      }

      // Check if selected
      if (
        this.selectedDate &&
        day === this.selectedDate.getDate() &&
        month === this.selectedDate.getMonth() &&
        year === this.selectedDate.getFullYear()
      ) {
        dayDiv.classList.add("selected")
      }

      // Day header (Solar + Lunar)
      const dayHeader = document.createElement("div")
      dayHeader.className = "day-info-header"

      // Day number (Solar)
      const dayNumber = document.createElement("div")
      dayNumber.className = "day-number"
      if (this.calendarDateMode === "lunar") {
        dayNumber.textContent = lunarDate || String(day)
      } else {
        dayNumber.textContent = day
      }
      dayHeader.appendChild(dayNumber)

      // Lunar date (if enabled)
      if (this.calendarDateMode === "both" && lunarInfo) {
        const lunarDiv = document.createElement("div")
        lunarDiv.className = "lunar-date"
        lunarDiv.textContent = lunarDate
        dayHeader.appendChild(lunarDiv)
      }
      dayDiv.appendChild(dayHeader)

      if (this.showLunar) {
        // Check for Vietnamese holidays
        const holiday = getVietnameseHoliday(day, month + 1, year)
        if (holiday) {
          dayDiv.classList.add("holiday")
          const holidayDiv = document.createElement("div")
          holidayDiv.className = "holiday-name"
          holidayDiv.textContent = holiday
          holidayDiv.title = holiday
          dayDiv.appendChild(holidayDiv)
        }
      }

      // Events for this day
      const dayEvents = events.filter((e) => e.date === dateStr)
      if (dayEvents.length > 0) {
        dayDiv.classList.add("has-events")
        const eventsContainer = document.createElement("div")
        eventsContainer.className = "day-events"

        dayEvents.slice(0, 2).forEach((event) => {
          const eventEl = document.createElement("div")
          eventEl.className = "calendar-event"
          if (event.meetingUrl) {
            eventEl.classList.add("has-meeting")
          }
          eventEl.dataset.eventId = event.id

          const timePrefix = event.time
            ? `<span class="event-time-tag">${escapeHtml(event.time)}</span>`
            : ""
          const meetingDot = event.meetingUrl
            ? `<i class="fa-solid fa-video event-meeting-icon"></i>`
            : ""

          eventEl.innerHTML = `
            <span class="event-dot"></span>
            ${meetingDot}
            <span class="event-title">${timePrefix}${escapeHtml(event.title)}</span>
          `
          eventsContainer.appendChild(eventEl)
        })

        if (dayEvents.length > 2) {
          const moreEl = document.createElement("div")
          moreEl.className = "calendar-event-more"
          moreEl.textContent = `+${dayEvents.length - 2} more`
          eventsContainer.appendChild(moreEl)
        }

        dayDiv.appendChild(eventsContainer)
      }

      daysGrid.appendChild(dayDiv)
    }

    // 3. Next month leading days (fill 5 or 6 complete weeks: 35 or 42 cells total)
    const totalRendered = firstDay + daysInMonth
    const totalCellsNeeded = totalRendered <= 35 ? 35 : 42
    const nextDaysNeeded = totalCellsNeeded - totalRendered

    for (let nextDay = 1; nextDay <= nextDaysNeeded; nextDay++) {
      const nextDate = new Date(year, month + 1, nextDay)
      const nYear = nextDate.getFullYear()
      const nMonth = nextDate.getMonth()
      const dateStr = `${nYear}-${String(nMonth + 1).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`
      const lunarDate = this.showLunar
        ? getLunarDateString(nextDay, nMonth + 1, nYear)
        : ""
      const dayOfWeek = nextDate.getDay()

      const dayDiv = document.createElement("div")
      dayDiv.className = `day-item other-month next-month-day ${dayOfWeek === 0 || dayOfWeek === 6 ? "is-weekend" : ""}`
      dayDiv.dataset.day = String(nextDay)
      dayDiv.dataset.solarDate = dateStr
      dayDiv.dataset.monthOffset = "1"
      if (lunarDate) dayDiv.dataset.lunarDate = lunarDate

      const dayHeader = document.createElement("div")
      dayHeader.className = "day-info-header"
      const dayNumber = document.createElement("div")
      dayNumber.className = "day-number"
      dayNumber.textContent =
        this.calendarDateMode === "lunar"
          ? lunarDate || String(nextDay)
          : nextDay
      dayHeader.appendChild(dayNumber)

      if (this.calendarDateMode === "both" && lunarDate) {
        const lunarDiv = document.createElement("div")
        lunarDiv.className = "lunar-date"
        lunarDiv.textContent = lunarDate
        dayHeader.appendChild(lunarDiv)
      }
      dayDiv.appendChild(dayHeader)
      daysGrid.appendChild(dayDiv)
    }

    this.container.appendChild(daysGrid)
  }
}
