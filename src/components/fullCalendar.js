import {
  getSettings,
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

function getCalendarDisplayMode(settings = getSettings()) {
  const mode = settings.calendarDateMode
  if (mode === "solar" || mode === "lunar" || mode === "both") {
    return mode
  }
  return settings.showLunarCalendar ? "both" : "solar"
}

export class FullCalendar {
  constructor() {
    this.container = document.getElementById("full-calendar-container")

    this.isVisible = getSettings().showFullCalendar === true
    this.calendarDateMode = getCalendarDisplayMode()
    this.showLunar = this.calendarDateMode !== "solar"
    this.viewDate = new Date()
    this.selectedDate = null
    this.init()
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
  }

  setupEventListeners() {
    window.addEventListener("layoutUpdated", (e) => {
      if (e.detail.key === "showFullCalendar") {
        this.isVisible = e.detail.value
        this.updateVisibility()
      }
      if (
        e.detail.key === "showLunarCalendar" ||
        e.detail.key === "calendarDateMode"
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
      if (e.target.closest("#prev-month")) {
        this.navigateMonth(-1)
      } else if (e.target.closest("#next-month")) {
        this.navigateMonth(1)
      } else if (e.target.closest("#calendar-add-event")) {
        const rect = e.target
          .closest("#calendar-add-event")
          .getBoundingClientRect()
        const dateStr = this.selectedDate
          ? this.formatDate(this.selectedDate)
          : this.formatDate(new Date())
        this.showEventFormMenu(rect.left, rect.bottom + 8, { dateStr })
      } else if (e.target.closest(".calendar-event")) {
        const eventId = e.target.closest(".calendar-event").dataset.eventId
        this.showEventContextMenu(e.clientX, e.clientY, eventId)
        e.stopPropagation()
      } else if (e.target.closest(".day-item")) {
        // Just select the day with left click
        const dayItem = e.target.closest(".day-item")
        const dayNumber = dayItem.dataset.day
        if (dayNumber) {
          this.selectDay(dayItem)

          // Show day menu on left click as a floating menu outside the card.
          const day = parseInt(dayNumber, 10)
          const dateStr = `${this.viewDate.getFullYear()}-${String(this.viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const events = getCalendarEvents().filter(
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

      // Right click on calendar event
      if (e.target.closest(".calendar-event")) {
        const eventId = e.target.closest(".calendar-event").dataset.eventId
        this.showEventContextMenu(e.clientX, e.clientY, eventId)
      }
      // Right click on day item
      else if (e.target.closest(".day-item")) {
        const dayItem = e.target.closest(".day-item")
        const dayNumber = dayItem.dataset.day
        if (dayNumber) {
          const day = parseInt(dayNumber, 10)
          const dateStr = `${this.viewDate.getFullYear()}-${String(this.viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const events = getCalendarEvents().filter((e) => e.date === dateStr)
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
      const preview = this.currentEventPreview || this.currentHolidayPreview
      if (!preview) return
      this.positionContextMenu(preview, e.clientX + 12, e.clientY + 12)
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

  selectDay(dayElement) {
    const day = parseInt(dayElement.dataset.day || "", 10)
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
    menu.className = "calendar-context-menu"
    menu.style.left = `${x}px`
    menu.style.top = `${y}px`
    menu.addEventListener("click", (e) => e.stopPropagation())

    // Add Event option
    const addItem = document.createElement("div")
    addItem.className = "context-menu-item"
    addItem.innerHTML = `<i class="fa-solid fa-plus"></i> ${i18n.calendar_add_event || "Add Event"}`
    addItem.addEventListener("click", () => {
      const dateStr = `${this.viewDate.getFullYear()}-${String(this.viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      this.hideContextMenu()
      this.showEventFormMenu(x, y, { dateStr })
    })
    menu.appendChild(addItem)

    // Show existing events if any
    if (events.length > 0) {
      const divider = document.createElement("div")
      divider.className = "context-menu-divider"
      menu.appendChild(divider)

      events.forEach((event) => {
        const eventItem = document.createElement("div")
        eventItem.className = "context-menu-item event-item"
        eventItem.innerHTML = `<i class="fa-solid fa-calendar-check"></i> ${event.title}${event.time ? " - " + event.time : ""}`
        eventItem.addEventListener("click", () => {
          this.hideContextMenu()
          this.showEventFormMenu(x, y, { eventId: event.id })
        })
        menu.appendChild(eventItem)
      })
    }

    document.body.appendChild(menu)
    this.currentContextMenu = menu

    this.positionContextMenu(menu, x, y)
  }

  showEventContextMenu(x, y, eventId) {
    const i18n = geti18n()
    this.hideContextMenu()

    const menu = document.createElement("div")
    menu.className = "calendar-context-menu"
    menu.style.left = `${x}px`
    menu.style.top = `${y}px`
    menu.addEventListener("click", (e) => e.stopPropagation())

    const editItem = document.createElement("div")
    editItem.className = "context-menu-item"
    editItem.innerHTML = `<i class="fa-solid fa-edit"></i> ${i18n.menu_edit || "Edit"}`
    editItem.addEventListener("click", () => {
      this.hideContextMenu()
      this.showEventFormMenu(x, y, { eventId })
    })
    menu.appendChild(editItem)

    const deleteItem = document.createElement("div")
    deleteItem.className = "context-menu-item danger"
    deleteItem.innerHTML = `<i class="fa-solid fa-trash"></i> ${i18n.menu_delete || "Delete"}`
    deleteItem.addEventListener("click", async () => {
      const confirm = await showConfirm(
        i18n.calendar_delete_confirm || "Delete this event?",
      )
      if (confirm) {
        deleteCalendarEvent(eventId)
        this.render()
      }
      this.hideContextMenu()
    })
    menu.appendChild(deleteItem)

    document.body.appendChild(menu)
    this.currentContextMenu = menu

    this.positionContextMenu(menu, x, y)
  }

  showEventFormMenu(x, y, { dateStr = null, eventId = null } = {}) {
    const i18n = geti18n()
    this.hideContextMenu()

    const event = eventId
      ? getCalendarEvents().find((e) => e.id === eventId)
      : null
    const targetDate = event?.date || dateStr || this.formatDate(new Date())

    const menu = document.createElement("div")
    menu.className = "calendar-context-menu calendar-event-form-menu"
    menu.addEventListener("click", (e) => e.stopPropagation())
    menu.innerHTML = `
      <form class="calendar-event-form">
        <div class="calendar-event-form-title">
          <i class="fa-solid ${event ? "fa-pen" : "fa-plus"}"></i>
          <span>${event ? i18n.calendar_edit_event || "Edit Event" : i18n.calendar_add_event || "Add Event"}</span>
        </div>
        <label>
          <span>${i18n.calendar_new_event || "Event Title"}</span>
          <input type="text" name="title" autocomplete="off" required>
        </label>
        <label>
          <span>${i18n.calendar_event_time || "Time"}</span>
          <input type="time" name="time">
        </label>
        <label>
          <span>${i18n.calendar_event_desc || "Description"}</span>
          <textarea name="description" rows="3"></textarea>
        </label>
        <div class="calendar-event-form-actions">
          <button type="button" class="calendar-event-cancel">${i18n.menu_cancel || "Cancel"}</button>
          <button type="submit">${i18n.settings_save || "Save"}</button>
        </div>
      </form>
    `

    const form = menu.querySelector(".calendar-event-form")
    const titleInput = form.elements.title
    const timeInput = form.elements.time
    const descInput = form.elements.description

    titleInput.value = event?.title || ""
    timeInput.value = event?.time || ""
    descInput.value = event?.description || ""

    form.addEventListener("submit", (e) => {
      e.preventDefault()
      const title = titleInput.value.trim()
      if (!title) {
        titleInput.focus()
        return
      }

      const payload = {
        title,
        date: targetDate,
        time: timeInput.value.trim(),
        description: descInput.value.trim(),
      }

      if (event) {
        updateCalendarEvent(event.id, payload)
      } else {
        addCalendarEvent(payload)
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
    this.positionContextMenu(menu, x, y)
    titleInput.focus()
    titleInput.select()
  }

  showEventPreview(x, y, eventId) {
    const event = getCalendarEvents().find((e) => e.id === eventId)
    if (!event) return

    this.hideEventPreview()

    const preview = document.createElement("div")
    preview.className = "calendar-context-menu calendar-event-preview"

    const title = document.createElement("div")
    title.className = "calendar-event-preview-title"
    title.textContent = event.title
    preview.appendChild(title)

    const meta = document.createElement("div")
    meta.className = "calendar-event-preview-meta"
    meta.textContent = [event.date, event.time].filter(Boolean).join(" | ")
    preview.appendChild(meta)

    if (event.description) {
      const desc = document.createElement("div")
      desc.className = "calendar-event-preview-desc"
      desc.textContent = event.description
      preview.appendChild(desc)
    }

    document.body.appendChild(preview)
    this.currentEventPreview = preview
    this.positionContextMenu(preview, x + 12, y + 12)
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
    this.positionContextMenu(preview, x + 12, y + 12)
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

  positionContextMenu(menu, x, y) {
    const rect = menu.getBoundingClientRect()
    const safeX = rect.right > window.innerWidth ? x - rect.width : x
    const safeY = rect.bottom > window.innerHeight ? y - rect.height : y
    menu.style.left = `${Math.max(8, safeX)}px`
    menu.style.top = `${Math.max(8, safeY)}px`
  }

  hideContextMenu() {
    if (this.currentContextMenu) {
      this.currentContextMenu.remove()
      this.currentContextMenu = null
    }
  }

  selectDay(dayElement) {
    const dayNumber = dayElement.querySelector(".day-number")
    if (!dayNumber) return

    const day = parseInt(dayNumber.textContent)
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
    const skin = settings.widgetUseM3Accent === true
      ? "m3-accent"
      : isWhiteMode ? "white-blur" : settings.calendarSkin || "default"

    this.container.classList.toggle("skin-white-blur", skin === "white-blur")
    this.container.classList.toggle("skin-m3-accent", skin === "m3-accent")
    this.container.classList.toggle("skin-light-transparent", skin === "light-transparent")
  }

  async openEventModal(eventId = null) {
    const i18n = geti18n()
    const event = eventId
      ? getCalendarEvents().find((e) => e.id === eventId)
      : null

    const title = event
      ? await showPrompt(
          i18n.calendar_edit_event || "Edit Event Title:",
          event.title,
        )
      : await showPrompt(i18n.calendar_new_event || "New Event Title:", "")

    if (!title || title.trim() === "") return

    const dateStr = event
      ? event.date
      : this.selectedDate
        ? this.selectedDate.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]

    const time = event
      ? await showPrompt(
          i18n.calendar_event_time || "Time (HH:MM, optional):",
          event.time || "",
        )
      : await showPrompt(
          i18n.calendar_event_time || "Time (HH:MM, optional):",
          "",
        )

    const description = event
      ? await showPrompt(
          i18n.calendar_event_desc || "Description (optional):",
          event.description || "",
        )
      : await showPrompt(
          i18n.calendar_event_desc || "Description (optional):",
          "",
        )

    if (event) {
      // Show options: Update or Delete
      const action = await showConfirm(
        i18n.calendar_event_action ||
          "Update event or Delete?\n(OK = Update, Cancel = Delete)",
      )
      if (action) {
        updateCalendarEvent(eventId, {
          title: title.trim(),
          date: dateStr,
          time: time?.trim() || "",
          description: description?.trim() || "",
        })
        await showAlert(
          i18n.calendar_update_success || "Event updated successfully.",
        )
      } else {
        deleteCalendarEvent(eventId)
      }
    } else {
      addCalendarEvent({
        title: title.trim(),
        date: dateStr,
        time: time?.trim() || "",
        description: description?.trim() || "",
      })
      await showAlert(i18n.calendar_add_success || "Event added successfully.")
    }

    this.render()
  }

  render() {
    if (!this.container) return
    this.hideEventPreview()
    this.hideHolidayPreview()

    // Preserve current position/display if container already exists
    const currentStyle = this.container.style.cssText
    this.container.innerHTML = ""
    this.container.style.cssText = currentStyle

    const i18n = geti18n()
    const year = this.viewDate.getFullYear()
    const month = this.viewDate.getMonth()
    const now = new Date()

    this.syncCalendarMode()

    this.container.classList.add("calendar-card", "glass-panel", "drag-handle")
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
      // Get lunar info for the first day of the viewed month
      const firstDayLunar = convertSolar2Lunar(1, month + 1, year)
      // Or better, get it for the middle of the month to be more representative
      const midDayLunar = convertSolar2Lunar(15, month + 1, year)
      lunarMonthHeader = `<span class="lunar-month-title"> (Tháng ${midDayLunar.month}${midDayLunar.leap ? " nhuận" : ""})</span>`
    }

    const header = document.createElement("div")
    header.className = "calendar-header"
    header.innerHTML = `
            <button id="prev-month" class="icon-btn" title="${i18n.calendar_prev_month || "Previous Month"}"><i class="fa-solid fa-chevron-left"></i></button>
            <h3 class="month-title">${monthName} ${year}${lunarMonthHeader}</h3>
            <div class="calendar-header-actions" style="margin-left: auto; display: flex; gap: 5px;">
              <button id="calendar-add-event" class="icon-btn" title="${i18n.calendar_add_event || "Add Event"}"><i class="fa-solid fa-plus"></i></button>
              <button id="next-month" class="icon-btn" title="${i18n.calendar_next_month || "Next Month"}"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
        `
    this.container.appendChild(header)

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
    weekdays.forEach((wd) => {
      const wdDiv = document.createElement("div")
      wdDiv.className = "weekday-header"
      wdDiv.textContent = wd
      daysGrid.appendChild(wdDiv)
    })

    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // Empty slots for padding
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div")
      daysGrid.appendChild(empty)
    }

    const events = getCalendarEvents()

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDiv = document.createElement("div")
      dayDiv.className = "day-item"

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
          eventEl.dataset.eventId = event.id
          eventEl.innerHTML = `<span class="event-dot"></span><span class="event-title">${event.time ? event.time + " " : ""}${event.title}</span>`
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

    this.container.appendChild(daysGrid)
  }
}
