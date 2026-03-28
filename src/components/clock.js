import { clockElement, dateElement } from "../utils/dom.js"
import { getSettings } from "../services/state.js"

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

export function updateTime() {
  const settings = getSettings()
  const now = new Date()
  const langCode = settings.language === "vi" ? "vi-VN" : "en-US"
  const dateClockStyle = settings.dateClockStyle || "default"
  const isFramedClockStyle =
    dateClockStyle === "round" || dateClockStyle === "square"
  const shouldShowDate =
    settings.showDate !== false && settings.showGregorian !== false
  const timeOptions = settings.hideSeconds
    ? { hour12: false, hour: "2-digit", minute: "2-digit" }
    : { hour12: false }
  const timeString = now.toLocaleTimeString(langCode, timeOptions)

  // Keep layout stable by toggling visibility class instead of display.
  clockElement.classList.toggle("is-hidden", settings.showClock === false)
  if (dateClockStyle === "analog") {
    const hours = now.getHours() % 12
    const minutes = now.getMinutes()
    const seconds = now.getSeconds()
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
  } else if (isFramedClockStyle) {
    const roundTimeOptions = settings.hideSeconds
      ? { hour: "2-digit", minute: "2-digit", hour12: true }
      : { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }
    const timeParts = new Intl.DateTimeFormat(langCode, roundTimeOptions)
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
    const dayPeriodPart = timeParts.find((part) => part.type === "dayPeriod")

    const [hh = "00", mm = "00", ss = "00"] = timeString.split(":")
    const timeMain = settings.hideSeconds
      ? `${hh}:${mm}`
      : `${hh}:${mm}<span class="clock-time-seconds">:${ss}</span>`

    const weekday = now.toLocaleDateString(langCode, { weekday: "long" })
    const secondaryInfo = shouldShowDate
      ? `<span class="clock-date-secondary">${now.getFullYear()} ${weekday}</span>`
      : ""
    clockElement.innerHTML = `<span class="clock-time-main">${timeMain}</span><span class="clock-time-ampm">${dayPeriodPart?.value || ""}</span>${secondaryInfo}`
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

  if (isFramedClockStyle) {
    const dayMonth = now.toLocaleDateString(langCode, {
      day: "2-digit",
      month: "long",
    })
    dateString = dayMonth
  } else if (format === "full") {
    dateString = now.toLocaleDateString(langCode, {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  } else if (format === "short") {
    dateString = now.toLocaleDateString("en-GB")
  } else if (format === "us") {
    dateString = now.toLocaleDateString("en-US")
  } else if (format === "iso") {
    dateString = now.toISOString().split("T")[0]
  } else if (format === "year") {
    dateString = String(now.getFullYear())
  } else if (format === "weekday") {
    dateString = now.toLocaleDateString(langCode, { weekday: "long" })
  }

  // Handle date visibility - check both showDate AND showGregorian
  dateElement.classList.toggle("is-hidden", !shouldShowDate)
  if (isFramedClockStyle) {
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
