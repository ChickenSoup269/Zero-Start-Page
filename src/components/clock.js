import { clockElement, dateElement } from "../utils/dom.js"
import { getSettings } from "../services/state.js"
import { geti18n } from "../services/i18n.js"

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

  textNodes.forEach((node) => {
    const text = node.nodeValue || ""
    const fragment = document.createDocumentFragment()
    let hueIndex = 0

    Array.from(text).forEach((char) => {
      if (!char.trim()) {
        fragment.appendChild(document.createTextNode(char))
        return
      }

      const span = document.createElement("span")
      const hue = (seed + hueIndex * 43) % 360
      span.className = "clock-hue-char"
      span.style.setProperty("--char-hue", String(hue))
      // Staggered delay for wave effect (e.g., 0.1s per character)
      span.style.setProperty("--char-delay", `${hueIndex * 0.1}s`)
      // Add time offset to sync the 8s CSS animation perfectly across 1-second DOM overwrites
      span.style.setProperty("--time-offset", `${(Date.now() % 8000) / 1000}s`)
      span.textContent = char
      fragment.appendChild(span)
      hueIndex += 1
    })

    node.parentNode?.replaceChild(fragment, node)
  })
}

function applyHueMode(settings) {
  const mode = settings.hueTextMode || "off"
  if (mode === "clock" || mode === "both") {
    applyHuePerCharacter(clockElement, 18)
  }

  if (mode === "date" || mode === "both") {
    applyHuePerCharacter(dateElement, 198)
  }
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

function getSafeWeekday(date, lang, isShort, tz) {
  const format = isShort && lang !== "vi-VN" ? "short" : "long"
  let str = date.toLocaleDateString(lang, { weekday: format, timeZone: tz })
  if (isShort && lang === "vi-VN") {
    return formatViShortWeekday(str)
  }
  return str
}

export function updateTime() {
  const settings = getSettings()
  const now = new Date()
  const langCode = settings.language === "vi" ? "vi-VN" : "en-US"
  const dateClockStyle = settings.dateClockStyle || "default"
  const isFramedClockStyle =
    dateClockStyle === "round" || dateClockStyle === "square"
  const shouldShowDate =
    settings.showDate !== false && settings.showGregorian !== false
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
  const timeString = now.toLocaleTimeString(langCode, timeOptions)

  // Keep layout stable by toggling visibility class instead of display.
  clockElement.classList.toggle("is-hidden", settings.showClock === false)
  if (dateClockStyle === "analog") {
    let tDate = now
    if (tz) {
      tDate = new Date(now.toLocaleString("en-US", { timeZone: tz }))
    }
    const hours = tDate.getHours() % 12
    const minutes = tDate.getMinutes()
    const seconds = tDate.getSeconds()
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
    let tDate = now
    if (tz) {
      tDate = new Date(now.toLocaleString("en-US", { timeZone: tz }))
    }
    const hour24 = tDate.getHours()

    let greetingKey = "greeting_evening"
    if (hour24 < 12) greetingKey = "greeting_morning"
    else if (hour24 < 18) greetingKey = "greeting_afternoon"

    const i18n = geti18n()
    const greeting = i18n[greetingKey] || "Hello"

    const timeOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    }
    const timeStr = now.toLocaleTimeString(langCode, timeOptions)

    const dayName = getSafeWeekday(now, langCode, settings.shortWeekday, tz)
    const day = now.toLocaleDateString(langCode, {
      day: "2-digit",
      timeZone: tz,
    })
    const monthName = now.toLocaleDateString(langCode, {
      month: "long",
      timeZone: tz,
    })

    clockElement.innerHTML = `
      <div class="cool-style-wrapper">
        <div class="cool-bar">|</div>
        <div class="cool-greeting">${greeting}</div>
        ${
          shouldShowDate
            ? `
          <div class="cool-dayname">${dayName}</div>
          <div class="cool-date">${day} - ${monthName}</div>
        `
            : ""
        }
        <div class="cool-time">${timeStr}</div>
        <div class="cool-bar">|</div>
      </div>
    `
  } else if (isFramedClockStyle) {
    const roundTimeOptions = settings.hideSeconds
      ? { hour: "2-digit", minute: "2-digit", hour12: use12Hour, timeZone: tz }
      : {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: use12Hour,
          timeZone: tz,
        }
    const timeParts = new Intl.DateTimeFormat(langCode, roundTimeOptions)
      .formatToParts(now)
      .filter((part) => part.type !== "literal")

    const hhPart = timeParts.find((part) => part.type === "hour")
    const mmPart = timeParts.find((part) => part.type === "minute")
    const ssPart = timeParts.find((part) => part.type === "second")
    const dayPeriodPart = timeParts.find((part) => part.type === "dayPeriod")

    const hh = hhPart ? hhPart.value : "00"
    const mm = mmPart ? mmPart.value : "00"
    const ss = ssPart ? ssPart.value : "00"

    const timeMain = settings.hideSeconds
      ? `${hh}:${mm}`
      : `${hh}:${mm}<span class="clock-time-seconds">:${ss}</span>`

    const weekday = getSafeWeekday(now, langCode, settings.shortWeekday, tz)
    const year = new Date(
      now.toLocaleString("en-US", { timeZone: tz }),
    ).getFullYear()
    const secondaryInfo = shouldShowDate
      ? `<span class="clock-date-secondary">${year} ${weekday}</span>`
      : ""
    clockElement.innerHTML = `<span class="clock-time-main">${timeMain}</span><span class="clock-time-ampm">${dayPeriodPart ? dayPeriodPart.value : ""}</span>${secondaryInfo}`
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
    const dayMonth = now.toLocaleDateString(langCode, {
      day: "2-digit",
      month: "long",
      timeZone: tz,
    })
    dateString = dayMonth
  } else if (format === "full") {
    const formatWeekday =
      settings.shortWeekday && langCode !== "vi-VN" ? "short" : "long"
    dateString = now.toLocaleDateString(langCode, {
      weekday: formatWeekday,
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: tz,
    })
    if (settings.shortWeekday && langCode === "vi-VN") {
      dateString = formatViShortWeekday(dateString)
    }
  } else if (format === "short") {
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
    dateString = getSafeWeekday(now, langCode, settings.shortWeekday, tz)
  }

  // Handle date visibility - check both showDate AND showGregorian
  dateElement.classList.toggle(
    "is-hidden",
    !shouldShowDate || dateClockStyle === "cool",
  )
  if (dateClockStyle === "cool") {
    dateElement.innerHTML = ""
    dateElement.textContent = ""
  } else if (isFramedClockStyle) {
    dateElement.innerHTML = `<span class="clock-date-primary">${dateString || ""}</span>`
  } else {
    dateElement.textContent = dateString
  }

  applyHueMode(settings)

  const mainContainer = clockElement.parentElement
  document.body.classList.remove("time-priority-none", "time-priority-date")
  document.body.classList.add(`time-priority-${priority}`)

  if (mainContainer) {
    const isHiddenTimerRunning =
      settings.timerIsRunning === true && settings.showTimer !== true
    mainContainer.classList.toggle("timer-running-hidden", isHiddenTimerRunning)

    if (isFramedClockStyle) {
      mainContainer.insertBefore(dateElement, clockElement)
    } else if (priority === "date") {
      mainContainer.insertBefore(dateElement, clockElement)
    } else {
      mainContainer.insertBefore(clockElement, dateElement)
    }
  }
}

export function initClock() {
  updateTime()
  setInterval(updateTime, 1000)

  window.addEventListener("layoutUpdated", (e) => {
    if (
      e.detail.key === "showGregorian" ||
      e.detail.key === "showClock" ||
      e.detail.key === "showDate" ||
      e.detail.key === "hideSeconds" ||
      e.detail.key === "showTimer" ||
      e.detail.key === "timerIsRunning" ||
      e.detail.key === "clockDatePriority" ||
      e.detail.key === "dateFormat" ||
      e.detail.key === "dateClockStyle" ||
      e.detail.key === "analogMarkerMode" ||
      e.detail.key === "hueTextMode"
    ) {
      updateTime()
    }
  })
}
