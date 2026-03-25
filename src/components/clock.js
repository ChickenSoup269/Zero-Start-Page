import { clockElement, dateElement } from "../utils/dom.js"
import { getSettings } from "../services/state.js"

export function updateTime() {
  const settings = getSettings()
  const now = new Date()
  const langCode = settings.language === "vi" ? "vi-VN" : "en-US"
  const timeOptions = settings.hideSeconds
    ? { hour12: false, hour: "2-digit", minute: "2-digit" }
    : { hour12: false }
  const timeString = now.toLocaleTimeString(langCode, timeOptions)

  // Keep layout stable by toggling visibility class instead of display.
  clockElement.classList.toggle("is-hidden", settings.showClock === false)
  clockElement.textContent = timeString

  let dateString = ""
  const priority = settings.clockDatePriority === "date" ? "date" : "none"
  const selectedFormat = settings.dateFormat || "full"
  const format =
    priority === "date" && selectedFormat === "full"
      ? "weekday"
      : selectedFormat

  if (format === "full") {
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
  const shouldShowDate =
    settings.showDate !== false && settings.showGregorian !== false
  dateElement.classList.toggle("is-hidden", !shouldShowDate)
  dateElement.textContent = dateString

  const mainContainer = clockElement.parentElement
  document.body.classList.remove("time-priority-none", "time-priority-date")
  document.body.classList.add(`time-priority-${priority}`)

  if (mainContainer) {
    if (priority === "date") {
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
      e.detail.key === "clockDatePriority" ||
      e.detail.key === "dateFormat"
    ) {
      updateTime()
    }
  })
}
