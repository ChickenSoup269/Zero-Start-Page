import {
  getSettings,
  getCalendarEvents,
  addCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../services/state.js"
import { showPrompt, showConfirm } from "../utils/dialog.js"
import { geti18n } from "../services/i18n.js"
import {
  getLunarDateString,
  getVietnameseHoliday,
} from "../utils/lunarCalendar.js"

export class FullCalendar {
  constructor() {
    this.container = document.getElementById("full-calendar-container")
    this.isVisible = getSettings().showFullCalendar === true
    this.showLunar = getSettings().showLunarCalendar !== false // Default true
    this.viewDate = new Date()
    this.selectedDate = null
    this.init()
  }

  init() {
    this.render()
    this.setupEventListeners()
    this.updateVisibility()
  }

  setupEventListeners() {
    window.addEventListener("layoutUpdated", (e) => {
      if (e.detail.key === "showFullCalendar") {
        this.isVisible = e.detail.value
        this.updateVisibility()
      }
      if (e.detail.key === "showLunarCalendar") {
        this.showLunar = e.detail.value
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
        this.openEventModal()
      } else if (e.target.closest(".day-item")) {
        // Just select the day with left click
        const dayItem = e.target.closest(".day-item")
        if (dayItem.querySelector(".day-number")) {
          this.selectDay(dayItem)
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
        const dayNumber = dayItem.querySelector(".day-number")
        if (dayNumber) {
          const day = parseInt(dayNumber.textContent)
          const dateStr = `${this.viewDate.getFullYear()}-${String(this.viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const events = getCalendarEvents().filter((e) => e.date === dateStr)
          this.showDayContextMenu(e.clientX, e.clientY, day, events)
        }
      }
    })

    // Close context menu on click outside
    document.addEventListener("click", () => {
      this.hideContextMenu()
    })
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

  showDayContextMenu(x, y, day, events) {
    const i18n = geti18n()
    this.hideContextMenu()

    const menu = document.createElement("div")
    menu.className = "calendar-context-menu"
    menu.style.left = `${x}px`
    menu.style.top = `${y}px`

    // Add Event option
    const addItem = document.createElement("div")
    addItem.className = "context-menu-item"
    addItem.innerHTML = `<i class="fa-solid fa-plus"></i> ${i18n.calendar_add_event || "Add Event"}`
    addItem.addEventListener("click", () => {
      this.selectedDate = new Date(
        this.viewDate.getFullYear(),
        this.viewDate.getMonth(),
        day,
      )
      this.openEventModal()
      this.hideContextMenu()
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
          this.openEventModal(event.id)
          this.hideContextMenu()
        })
        menu.appendChild(eventItem)
      })
    }

    document.body.appendChild(menu)
    this.currentContextMenu = menu

    // Adjust position if menu goes off-screen
    const rect = menu.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      menu.style.left = `${x - rect.width}px`
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${y - rect.height}px`
    }
  }

  showEventContextMenu(x, y, eventId) {
    const i18n = geti18n()
    this.hideContextMenu()

    const menu = document.createElement("div")
    menu.className = "calendar-context-menu"
    menu.style.left = `${x}px`
    menu.style.top = `${y}px`

    const editItem = document.createElement("div")
    editItem.className = "context-menu-item"
    editItem.innerHTML = `<i class="fa-solid fa-edit"></i> ${i18n.menu_edit || "Edit"}`
    editItem.addEventListener("click", () => {
      this.openEventModal(eventId)
      this.hideContextMenu()
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

    // Adjust position if menu goes off-screen
    const rect = menu.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      menu.style.left = `${x - rect.width}px`
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${y - rect.height}px`
    }
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
      this.container.style.display = this.isVisible ? "block" : "none"
    }
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
    }

    this.render()
  }

  render() {
    if (!this.container) return

    const i18n = geti18n()
    const year = this.viewDate.getFullYear()
    const month = this.viewDate.getMonth()
    const now = new Date()

    this.container.innerHTML = ""
    this.container.className = "calendar-card glass-panel drag-handle"

    const monthName = this.viewDate.toLocaleString("default", {
      month: "long",
    })

    const header = document.createElement("div")
    header.className = "calendar-header"
    header.innerHTML = `
            <button id="prev-month" class="icon-btn" title="${i18n.calendar_prev_month || "Previous Month"}"><i class="fa-solid fa-chevron-left"></i></button>
            <h3 class="month-title">${monthName} ${year}</h3>
            <button id="next-month" class="icon-btn" title="${i18n.calendar_next_month || "Next Month"}"><i class="fa-solid fa-chevron-right"></i></button>
            <button id="calendar-add-event" class="icon-btn" title="${i18n.calendar_add_event || "Add Event"}" style="margin-left: auto;"><i class="fa-solid fa-plus"></i></button>
        `
    this.container.appendChild(header)

    const daysGrid = document.createElement("div")
    daysGrid.className = "days-grid"

    // Weekday headers
    const weekdays = ["S", "M", "T", "W", "T", "F", "S"]
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

      // Check if today
      if (
        day === now.getDate() &&
        month === now.getMonth() &&
        year === now.getFullYear()
      ) {
        dayDiv.classList.add("today")
      }

      // Day number
      const dayNumber = document.createElement("div")
      dayNumber.className = "day-number"
      dayNumber.textContent = day
      dayDiv.appendChild(dayNumber)

      // Lunar date (if enabled)
      if (this.showLunar) {
        const lunarDate = getLunarDateString(day, month + 1, year)
        const lunarDiv = document.createElement("div")
        lunarDiv.className = "lunar-date"
        lunarDiv.textContent = lunarDate
        dayDiv.appendChild(lunarDiv)

        // Check for Vietnamese holidays
        const holiday = getVietnameseHoliday(day, month + 1, year)
        if (holiday) {
          dayDiv.classList.add("holiday")
          dayDiv.title = holiday
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
          eventEl.title = `${event.title}${event.time ? " - " + event.time : ""}${event.description ? "\n" + event.description : ""}`
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
