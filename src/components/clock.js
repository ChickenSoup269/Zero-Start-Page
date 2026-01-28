import { clockElement, dateElement } from "../utils/dom.js"
import { getSettings } from "../services/state.js"

export function updateTime() {
  const settings = getSettings()
  const now = new Date()
  const timeString = now.toLocaleTimeString(
    settings.language === "vi" ? "vi-VN" : "en-US",
    { hour12: false }
  )
  
  // Handle clock visibility
  clockElement.style.display = settings.showClock !== false ? "block" : "none"
  clockElement.textContent = timeString

  let dateString = ""
  const format = settings.dateFormat || "full"
  const langCode = settings.language === "vi" ? "vi-VN" : "en-US"

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
  }

  // Handle date visibility - check both showDate AND showGregorian
  const shouldShowDate = (settings.showDate !== false) && (settings.showGregorian !== false)
  dateElement.style.display = shouldShowDate ? "block" : "none"
  dateElement.textContent = dateString
}

export function initClock() {
  updateTime()
  setInterval(updateTime, 1000)

  window.addEventListener("layoutUpdated", (e) => {
    if (e.detail.key === "showGregorian" || e.detail.key === "showClock" || e.detail.key === "showDate") {
      updateTime()
    }
  })
}
