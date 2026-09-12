import { fadeToggle } from "../utils/dom.js"
import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { applyTranslations, geti18n } from "../services/i18n.js"
import { showConfirm } from "../utils/dialog.js"

const WEEKDAY_NAMES = {
  vi: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  sv: ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"],
}

const DEFAULT_TEMPLATES = [
  { name: "Drink Water", nameKey: "habit_preset_water", icon: "fa-solid fa-droplet", color: "#2196F3" },
  { name: "Workout / Gym", nameKey: "habit_preset_workout", icon: "fa-solid fa-dumbbell", color: "#4CAF50" },
  { name: "Read Book", nameKey: "habit_preset_reading", icon: "fa-solid fa-book-open", color: "#9C27B0" },
  { name: "Meditation", nameKey: "habit_preset_meditate", icon: "fa-solid fa-spa", color: "#00BCD4" },
  { name: "Coding / Study", nameKey: "habit_preset_coding", icon: "fa-solid fa-laptop-code", color: "#FF9800" },
  { name: "Sleep 8 Hours", nameKey: "habit_preset_sleep", icon: "fa-solid fa-moon", color: "#673AB7" },
  { name: "10k Steps", nameKey: "habit_preset_walk", icon: "fa-solid fa-person-walking", color: "#009688" },
]

const POPULAR_HABIT_ICONS = [
  "fa-solid fa-circle-check",
  "fa-solid fa-droplet",
  "fa-solid fa-dumbbell",
  "fa-solid fa-book-open",
  "fa-solid fa-spa",
  "fa-solid fa-laptop-code",
  "fa-solid fa-moon",
  "fa-solid fa-person-walking",
  "fa-solid fa-heart-pulse",
  "fa-solid fa-apple-whole",
  "fa-solid fa-bicycle",
  "fa-solid fa-music",
  "fa-solid fa-pen-nib",
  "fa-solid fa-briefcase",
  "fa-solid fa-sun",
  "fa-solid fa-bed",
  "fa-solid fa-brain",
  "fa-solid fa-mug-hot",
  "fa-solid fa-fire",
  "fa-solid fa-award",
  "fa-solid fa-coins",
  "fa-solid fa-seedling",
  "fa-solid fa-bullseye",
  "fa-solid fa-lightbulb",
]

function getTodayKey() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getPrevDateKey(dateKey, daysAgo = 1) {
  const parts = dateKey.split("-").map(Number)
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  d.setDate(d.getDate() - daysAgo)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getLast7Days() {
  const result = []
  const today = new Date()
  const todayKey = getTodayKey()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const key = `${year}-${month}-${day}`

    result.push({
      key,
      dateNum: d.getDate(),
      weekdayIdx: d.getDay(),
      isToday: key === todayKey,
    })
  }
  return result
}

function computeStreak(habit, maxLevel) {
  const history = habit.history || {}
  const target = habit.target || maxLevel
  const todayKey = getTodayKey()
  const yesterdayKey = getPrevDateKey(todayKey, 1)

  let streak = 0
  const isTodayCompleted = (history[todayKey] || 0) >= target

  let checkKey = yesterdayKey
  while ((history[checkKey] || 0) >= target) {
    streak++
    checkKey = getPrevDateKey(checkKey, 1)
  }

  if (isTodayCompleted) {
    streak += 1
  }

  return streak
}

export class HabitTracker {
  constructor(container) {
    this.container = container
    this.habits = []
    this.maxLevel = 10
    this.viewMode = "stepper" // "stepper" or "week"
    this.editingHabitId = null
    this.selectedFormIcon = "fa-solid fa-circle-check"

    this.container.innerHTML = `
      <div class="habit-header-container"></div>
      <div class="habit-form-container"></div>
      <div class="habit-grid"></div>
    `
    this.headerContainer = this.container.querySelector(".habit-header-container")
    this.formContainer = this.container.querySelector(".habit-form-container")
    this.gridContainer = this.container.querySelector(".habit-grid")

    this.loadData()
    this.render()
    this.applySkin()

    window.addEventListener("layoutUpdated", (e) => {
      if (e.detail && e.detail.key === "showHabits") {
        fadeToggle(this.container, e.detail.value, "flex")
      }
      if (
        e.detail &&
        (e.detail.key === "habitTrackerSkin" ||
          e.detail.key === "habitTrackerHideBorder" ||
          e.detail.key === "habitTrackerMini" ||
          e.detail.key === "widgetUseM3Accent")
      ) {
        this.applySkin()
      }
      if (e.detail && e.detail.key === "habitColorMode") {
        this.render()
      }
    })

    fadeToggle(this.container, getSettings().showHabits === true, "flex")
  }

  applySkin() {
    if (!this.container) return
    const settings = getSettings()
    const isWhiteMode = settings.showQuickAccessBg === true
    const skin =
      settings.widgetUseM3Accent === true
        ? "m3-accent"
        : isWhiteMode
          ? "white-blur"
          : settings.habitTrackerSkin || "default"

    this.container.classList.toggle("skin-white-blur", skin === "white-blur")
    this.container.classList.toggle("skin-m3-accent", skin === "m3-accent")
    this.container.classList.toggle("skin-transparent", skin === "transparent")
    this.container.classList.toggle("skin-light-transparent", skin === "light-transparent")
    this.container.classList.toggle("widget-border-hidden", settings.habitTrackerHideBorder === true)
    this.container.classList.toggle("habitTracker-mini", settings.habitTrackerMini === true)
  }

  loadData() {
    const saved = localStorage.getItem("habitTrackerData")
    const todayKey = getTodayKey()

    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.maxLevel) this.maxLevel = data.maxLevel
        if (data.viewMode) this.viewMode = data.viewMode

        this.habits = (data.habits || []).map((h) => {
          const name = typeof h.name === "string" ? h.name : h.name?.name || String(h.name || "")
          const history = h.history || {}

          // Backward compatibility: migrate legacy progress to today's date
          if (h.progress !== undefined && history[todayKey] === undefined) {
            history[todayKey] = h.progress
          }

          const target = h.target || this.maxLevel
          const habitObj = {
            id: h.id || Date.now().toString() + Math.random().toString(36).substr(2, 4),
            name: name,
            icon: h.icon || "fa-solid fa-circle-check",
            color: h.color || "#4CAF50",
            target: target,
            history: history,
            progress: history[todayKey] || 0,
            streak: 0,
            bestStreak: h.bestStreak || 0,
            lastUpdated: todayKey,
          }

          habitObj.streak = computeStreak(habitObj, this.maxLevel)
          habitObj.bestStreak = Math.max(habitObj.bestStreak, habitObj.streak)
          return habitObj
        })
      } catch (e) {
        console.error("Failed to parse habit tracker data:", e)
      }
    }
  }

  saveData() {
    localStorage.setItem(
      "habitTrackerData",
      JSON.stringify({
        habits: this.habits,
        maxLevel: this.maxLevel,
        viewMode: this.viewMode,
      }),
    )
  }

  render() {
    const i18n = geti18n() || {}
    const totalHabits = this.habits.length
    const completedHabits = this.habits.filter(
      (h) => (h.progress || 0) >= (h.target || this.maxLevel),
    ).length
    const allDone = totalHabits > 0 && completedHabits === totalHabits

    // Summary badge text
    let summaryText = `${completedHabits}/${totalHabits}`
    let summaryTooltip = `${completedHabits}/${totalHabits} ${i18n.habit_summary_done || "done"}`
    if (allDone) {
      summaryText = `<i class="fa-solid fa-check-double"></i> ${completedHabits}/${totalHabits}`
      summaryTooltip = i18n.habit_all_done || "All done!"
    } else if (totalHabits > 0) {
      summaryText = `<i class="fa-solid fa-circle-check"></i> ${completedHabits}/${totalHabits}`
    }

    // 1. Header
    this.headerContainer.innerHTML = `
      <div class="habit-header">
        <div class="habit-title-wrap">
          <span class="habit-title">
            <i class="fa-solid fa-bars-progress" style="color: var(--accent-color);"></i>
            <span data-i18n="habit_title">Habit Tracker</span>
          </span>
          ${
            totalHabits > 0
              ? `<span class="habit-summary-badge ${allDone ? "all-done" : ""}" title="${summaryTooltip}">${summaryText}</span>`
              : ""
          }
        </div>
        <div class="habit-header-actions">
          <button class="habit-action-btn habit-view-toggle ${this.viewMode === "week" ? "active" : ""}" 
            title="${this.viewMode === "stepper" ? i18n.habit_view_week || "Weekly 7-Day View" : i18n.habit_view_stepper || "Stepper View"}">
            <i class="fa-solid ${this.viewMode === "stepper" ? "fa-calendar-week" : "fa-bars-progress"}"></i>
          </button>
          ${
            this.viewMode === "stepper"
              ? `
            <div class="habit-level-stepper" title="${i18n.habit_stepper_hint || "Daily Steps Target"}">
              <button class="habit-dec-max" title="-1"><i class="fa-solid fa-minus" style="font-size: 0.68rem;"></i></button>
              <span style="font-size: 0.74rem; opacity: 0.9; min-width: 15px; text-align: center; font-weight: 700;">${this.maxLevel}</span>
              <button class="habit-inc-max" title="+1"><i class="fa-solid fa-plus" style="font-size: 0.68rem;"></i></button>
            </div>
          `
              : ""
          }
          <button class="habit-action-btn habit-add-btn" title="${i18n.habit_add_title || "Add Habit"}">
            <i class="fa-solid fa-plus"></i>
          </button>
          <button class="habit-action-btn habit-close-btn widget-close-btn" title="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    `

    // 2. Add / Edit Form Drawer
    this.renderForm()

    // 3. Habit Grid
    let gridHtml = ""
    if (this.habits.length === 0) {
      gridHtml = `
        <div style="text-align: center; opacity: 0.6; font-size: 0.85rem; padding: 18px 0;" data-i18n="habit_no_habits">
          No habits yet. Click + to add.
        </div>
      `
    } else {
      const colorMode = getSettings().habitColorMode || "custom"
      const last7Days = getLast7Days()
      const lang = getSettings().language || "en"
      const weekdays = WEEKDAY_NAMES[lang] || WEEKDAY_NAMES.en

      this.habits.forEach((habit, idx) => {
        const target = habit.target || this.maxLevel
        const currentProgress = habit.progress || 0
        const isDone = currentProgress >= target
        const habitColor = habit.color || "#4CAF50"
        const streak = habit.streak || 0
        const habitIcon = habit.icon || "fa-solid fa-circle-check"

        gridHtml += `
          <div class="habit-card ${isDone ? "habit-completed" : ""}" data-id="${habit.id}">
            <div class="habit-card-header">
              <div class="habit-card-info">
                <span class="habit-card-icon" style="color: ${habitColor};"><i class="${habitIcon}"></i></span>
                <span class="habit-card-name" title="${habit.name}">${habit.name}</span>
                <span class="habit-streak-badge ${streak > 0 ? "active-streak" : ""}" title="${i18n.habit_streak || "Streak"}: ${streak} ${i18n.habit_days || "days"} (Best: ${habit.bestStreak || streak})">
                  <i class="fa-solid fa-fire"></i> ${streak}d
                </span>
              </div>
              <div class="habit-card-actions">
                ${
                  idx > 0
                    ? `<button class="habit-mini-btn habit-move-up-btn" data-id="${habit.id}" title="Move Up"><i class="fa-solid fa-chevron-up"></i></button>`
                    : ""
                }
                ${
                  idx < this.habits.length - 1
                    ? `<button class="habit-mini-btn habit-move-down-btn" data-id="${habit.id}" title="Move Down"><i class="fa-solid fa-chevron-down"></i></button>`
                    : ""
                }
                <button class="habit-mini-btn habit-edit-btn" data-id="${habit.id}" title="${i18n.habit_edit_title || "Edit"}"><i class="fa-solid fa-pen"></i></button>
                <button class="habit-mini-btn delete habit-delete-btn" data-id="${habit.id}" title="${i18n.habit_delete_title || "Delete"}"><i class="fa-solid fa-trash-can"></i></button>
              </div>
            </div>
        `

        // Card Body: Stepper Track vs Weekly Track
        if (this.viewMode === "stepper") {
          gridHtml += `<div class="habit-stepper-track" data-id="${habit.id}">`
          for (let i = 1; i <= target; i++) {
            const isFilled = i <= currentProgress
            let bg = "rgba(255, 255, 255, 0.08)"
            if (isFilled) {
              if (colorMode === "gradient") {
                const hue = ((i - 1) / Math.max(target - 1, 1)) * 120
                bg = `hsl(${hue}, 80%, 45%)`
              } else if (colorMode === "m3") {
                bg = "var(--accent-color, #4CAF50)"
              } else {
                bg = habitColor
              }
            }
            gridHtml += `
              <div class="habit-step-pill ${isFilled ? "filled" : ""}" 
                data-level="${i}" 
                data-id="${habit.id}" 
                style="${isFilled ? `background: ${bg};` : ""}" 
                title="${i}/${target}"></div>
            `
          }
          gridHtml += `</div>`
        } else {
          // Weekly 7-Day Track
          gridHtml += `<div class="habit-week-track" data-id="${habit.id}">`
          last7Days.forEach((d) => {
            const dayProgress = habit.history?.[d.key] || 0
            const dayCompleted = dayProgress >= target
            const dayLabel = weekdays[d.weekdayIdx] || ""

            let btnBg = "rgba(255, 255, 255, 0.06)"
            if (dayCompleted) {
              if (colorMode === "gradient") {
                btnBg = "hsl(120, 80%, 45%)"
              } else if (colorMode === "m3") {
                btnBg = "var(--accent-color, #4CAF50)"
              } else {
                btnBg = habitColor
              }
            }

            gridHtml += `
              <div class="habit-day-col ${d.isToday ? "is-today" : ""}">
                <span class="habit-day-label">${dayLabel}</span>
                <button class="habit-day-btn ${dayCompleted ? "completed" : ""}" 
                  data-id="${habit.id}" 
                  data-date="${d.key}" 
                  style="${dayCompleted ? `background: ${btnBg};` : ""}" 
                  title="${d.key} (${dayCompleted ? "Completed" : "Not yet"})">
                  ${dayCompleted ? '<i class="fa-solid fa-check"></i>' : d.dateNum}
                </button>
              </div>
            `
          })
          gridHtml += `</div>`
        }

        gridHtml += `</div>` // end habit-card
      })
    }

    this.gridContainer.innerHTML = gridHtml
    applyTranslations(this.container)
    this.bindEvents()
  }

  renderForm() {
    if (!this.formContainer) return
    const i18n = geti18n() || {}

    if (this.isFormOpen) {
      const isEditing = Boolean(this.editingHabitId)
      const editingHabit = isEditing
        ? this.habits.find((h) => h.id === this.editingHabitId)
        : null

      const initialName = editingHabit ? editingHabit.name : ""
      const initialColor = editingHabit ? editingHabit.color : "#4CAF50"
      this.selectedFormIcon = editingHabit
        ? editingHabit.icon || "fa-solid fa-circle-check"
        : this.selectedFormIcon || "fa-solid fa-circle-check"

      let templatesHtml = ""
      if (!isEditing) {
        templatesHtml = `
          <div class="habit-templates-bar">
            <span class="habit-templates-label" title="${i18n.habit_templates || "Templates"}">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </span>
            <div class="habit-templates-scroll">
              ${DEFAULT_TEMPLATES.map(
                (t) => `
                <button type="button" class="habit-template-chip" data-name="${i18n[t.nameKey] || t.name}" data-color="${t.color}" data-icon="${t.icon}">
                  <i class="${t.icon}"></i>
                  <span>${i18n[t.nameKey] || t.name}</span>
                </button>
              `,
              ).join("")}
            </div>
          </div>
        `
      }

      this.formContainer.innerHTML = `
        <div class="habit-form-card">
          ${templatesHtml}
          <div class="habit-form-inputs-row">
            <div class="habit-icon-picker-wrap">
              <button type="button" class="habit-form-icon-btn" title="${i18n.habit_choose_icon || "Choose icon"}" style="color: ${initialColor};">
                <i class="${this.selectedFormIcon}"></i>
              </button>
              <div class="habit-icon-picker-popover" style="display: none;">
                <div class="habit-icon-grid">
                  ${POPULAR_HABIT_ICONS.map(
                    (ic) => `
                    <button type="button" class="habit-icon-choice-btn ${this.selectedFormIcon === ic ? "active" : ""}" data-icon="${ic}" title="${ic.replace("fa-solid fa-", "")}">
                      <i class="${ic}"></i>
                    </button>
                  `,
                  ).join("")}
                </div>
              </div>
            </div>
            <input type="text" class="habit-form-input" 
              placeholder="${isEditing ? i18n.habit_edit_name || "Habit name..." : i18n.habit_prompt_name || "New habit name..."}" 
              value="${initialName}">
            <input type="color" class="habit-form-color" value="${initialColor}" title="Habit Color">
            <button class="habit-form-submit-btn" title="Save">
              <i class="fa-solid fa-check"></i>
            </button>
            <button class="habit-form-cancel-btn" title="Cancel">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      `

      const input = this.formContainer.querySelector(".habit-form-input")
      const colorPicker = this.formContainer.querySelector(".habit-form-color")
      const submitBtn = this.formContainer.querySelector(".habit-form-submit-btn")
      const cancelBtn = this.formContainer.querySelector(".habit-form-cancel-btn")
      const iconTriggerBtn = this.formContainer.querySelector(".habit-form-icon-btn")
      const iconPopover = this.formContainer.querySelector(".habit-icon-picker-popover")
      const iconBtns = this.formContainer.querySelectorAll(".habit-icon-choice-btn")
      const templatesScroll = this.formContainer.querySelector(".habit-templates-scroll")

      // Horizontal smooth wheel scroll for template chips without showing scrollbar
      if (templatesScroll) {
        templatesScroll.addEventListener("wheel", (e) => {
          if (e.deltaY) {
            e.preventDefault()
            templatesScroll.scrollLeft += e.deltaY
          }
        }, { passive: false })
      }

      // Color picker input -> update icon trigger color
      if (colorPicker && iconTriggerBtn) {
        colorPicker.addEventListener("input", () => {
          iconTriggerBtn.style.color = colorPicker.value
        })
      }

      // Toggle Icon Popover
      if (iconTriggerBtn && iconPopover) {
        iconTriggerBtn.addEventListener("click", (e) => {
          e.stopPropagation()
          const isShown = iconPopover.style.display !== "none"
          iconPopover.style.display = isShown ? "none" : "block"
          iconTriggerBtn.classList.toggle("active", !isShown)
        })

        // Close on click outside
        const onDocClick = (e) => {
          if (!iconPopover.contains(e.target) && !iconTriggerBtn.contains(e.target)) {
            iconPopover.style.display = "none"
            iconTriggerBtn.classList.remove("active")
            document.removeEventListener("click", onDocClick)
          }
        }
        document.addEventListener("click", onDocClick)
      }

      if (input) {
        input.focus()
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") this.submitForm(input.value, colorPicker.value)
          if (e.key === "Escape") this.closeForm()
        })
      }

      if (submitBtn) {
        submitBtn.addEventListener("click", () => {
          this.submitForm(input.value, colorPicker.value)
        })
      }

      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => this.closeForm())
      }

      // Icon choice selection
      iconBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation()
          const icon = btn.dataset.icon
          this.selectedFormIcon = icon
          if (iconTriggerBtn) {
            iconTriggerBtn.innerHTML = `<i class="${icon}"></i>`
            iconTriggerBtn.classList.remove("active")
          }
          iconBtns.forEach((b) => b.classList.toggle("active", b === btn))
          if (iconPopover) iconPopover.style.display = "none"
        })
      })

      // Template chip click handlers
      const chips = this.formContainer.querySelectorAll(".habit-template-chip")
      chips.forEach((chip) => {
        chip.addEventListener("click", () => {
          const name = chip.dataset.name
          const color = chip.dataset.color
          const icon = chip.dataset.icon
          if (input) input.value = name
          if (colorPicker) {
            colorPicker.value = color
            if (iconTriggerBtn) iconTriggerBtn.style.color = color
          }
          if (icon) {
            this.selectedFormIcon = icon
            if (iconTriggerBtn) iconTriggerBtn.innerHTML = `<i class="${icon}"></i>`
            iconBtns.forEach((b) => b.classList.toggle("active", b.dataset.icon === icon))
          }
          if (input) input.focus()
        })
      })
    } else {
      this.formContainer.innerHTML = ""
    }
  }

  openAddForm() {
    this.isFormOpen = true
    this.editingHabitId = null
    this.selectedFormIcon = "fa-solid fa-circle-check"
    this.renderForm()
  }

  openEditForm(habitId) {
    this.isFormOpen = true
    this.editingHabitId = habitId
    const habit = this.habits.find((h) => h.id === habitId)
    this.selectedFormIcon = habit?.icon || "fa-solid fa-circle-check"
    this.renderForm()
  }

  closeForm() {
    this.isFormOpen = false
    this.editingHabitId = null
    this.renderForm()
  }

  submitForm(name, color) {
    if (!name || !name.trim()) return
    const cleanName = name.trim()
    const todayKey = getTodayKey()
    const icon = this.selectedFormIcon || "fa-solid fa-circle-check"

    if (this.editingHabitId) {
      const habit = this.habits.find((h) => h.id === this.editingHabitId)
      if (habit) {
        habit.name = cleanName
        habit.color = color
        habit.icon = icon
      }
    } else {
      const newHabit = {
        id: Date.now().toString(),
        name: cleanName,
        icon: icon,
        color: color || "#4CAF50",
        target: this.maxLevel,
        history: { [todayKey]: 0 },
        progress: 0,
        streak: 0,
        bestStreak: 0,
        lastUpdated: todayKey,
      }
      this.habits.push(newHabit)
    }

    this.saveData()
    this.closeForm()
    this.render()
  }

  bindEvents() {
    // 1. Close widget
    this.headerContainer.querySelector(".habit-close-btn")?.addEventListener("click", () => {
      updateSetting("showHabits", false)
      saveSettings()
      fadeToggle(this.container, false, "flex")
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "showHabits", value: false },
        }),
      )
    })

    // 2. View Mode Toggle (Stepper vs Weekly)
    this.headerContainer.querySelector(".habit-view-toggle")?.addEventListener("click", () => {
      this.viewMode = this.viewMode === "stepper" ? "week" : "stepper"
      this.saveData()
      this.render()
    })

    // 3. Add button
    this.headerContainer.querySelector(".habit-add-btn")?.addEventListener("click", () => {
      if (this.isFormOpen && !this.editingHabitId) {
        this.closeForm()
      } else {
        this.openAddForm()
      }
    })

    // 4. Stepper max level
    const incBtn = this.headerContainer.querySelector(".habit-inc-max")
    const decBtn = this.headerContainer.querySelector(".habit-dec-max")

    if (incBtn) {
      incBtn.addEventListener("click", () => {
        if (this.maxLevel < 31) {
          this.maxLevel++
          this.habits.forEach((h) => {
            h.target = this.maxLevel
            h.streak = computeStreak(h, this.maxLevel)
          })
          this.saveData()
          this.render()
        }
      })
    }

    if (decBtn) {
      decBtn.addEventListener("click", () => {
        if (this.maxLevel > 1) {
          this.maxLevel--
          this.habits.forEach((h) => {
            h.target = this.maxLevel
            if (h.progress > this.maxLevel) h.progress = this.maxLevel
            const todayKey = getTodayKey()
            if (h.history && h.history[todayKey] > this.maxLevel) {
              h.history[todayKey] = this.maxLevel
            }
            h.streak = computeStreak(h, this.maxLevel)
          })
          this.saveData()
          this.render()
        }
      })
    }

    // 5. Stepper pill clicks
    const stepPills = this.container.querySelectorAll(".habit-step-pill")
    stepPills.forEach((pill) => {
      pill.addEventListener("click", (e) => {
        const level = parseInt(e.currentTarget.dataset.level, 10)
        const id = e.currentTarget.dataset.id
        const habit = this.habits.find((h) => h.id === id)
        if (habit) {
          const todayKey = getTodayKey()
          if (!habit.history) habit.history = {}

          if (habit.progress === level) {
            habit.progress = level - 1
          } else {
            habit.progress = level
          }

          habit.history[todayKey] = habit.progress
          habit.streak = computeStreak(habit, this.maxLevel)
          habit.bestStreak = Math.max(habit.bestStreak || 0, habit.streak)

          this.saveData()
          this.render()
        }
      })
    })

    // 6. Weekly day clicks
    const dayBtns = this.container.querySelectorAll(".habit-day-btn")
    dayBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id
        const dateKey = e.currentTarget.dataset.date
        const habit = this.habits.find((h) => h.id === id)
        if (habit) {
          if (!habit.history) habit.history = {}
          const target = habit.target || this.maxLevel
          const currentVal = habit.history[dateKey] || 0

          if (currentVal >= target) {
            habit.history[dateKey] = 0
          } else {
            habit.history[dateKey] = target
          }

          const todayKey = getTodayKey()
          if (dateKey === todayKey) {
            habit.progress = habit.history[todayKey]
          }

          habit.streak = computeStreak(habit, this.maxLevel)
          habit.bestStreak = Math.max(habit.bestStreak || 0, habit.streak)

          this.saveData()
          this.render()
        }
      })
    })

    // 7. Move Up & Down
    const moveUpBtns = this.container.querySelectorAll(".habit-move-up-btn")
    moveUpBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation()
        const id = e.currentTarget.dataset.id
        const idx = this.habits.findIndex((h) => h.id === id)
        if (idx > 0) {
          const temp = this.habits[idx]
          this.habits[idx] = this.habits[idx - 1]
          this.habits[idx - 1] = temp
          this.saveData()
          this.render()
        }
      })
    })

    const moveDownBtns = this.container.querySelectorAll(".habit-move-down-btn")
    moveDownBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation()
        const id = e.currentTarget.dataset.id
        const idx = this.habits.findIndex((h) => h.id === id)
        if (idx >= 0 && idx < this.habits.length - 1) {
          const temp = this.habits[idx]
          this.habits[idx] = this.habits[idx + 1]
          this.habits[idx + 1] = temp
          this.saveData()
          this.render()
        }
      })
    })

    // 8. Edit Habit
    const editBtns = this.container.querySelectorAll(".habit-edit-btn")
    editBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation()
        const id = e.currentTarget.dataset.id
        this.openEditForm(id)
      })
    })

    // 9. Delete Habit
    const deleteBtns = this.container.querySelectorAll(".habit-delete-btn")
    deleteBtns.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation()
        const id = e.currentTarget.dataset.id
        const habit = this.habits.find((h) => h.id === id)
        const i18n = geti18n() || {}
        const title =
          typeof i18n.habit_delete_title === "string"
            ? i18n.habit_delete_title
            : "Delete Habit"
        const confirmText =
          typeof i18n.habit_confirm_delete === "string"
            ? i18n.habit_confirm_delete
            : "Delete this habit?"
        const habitName = habit
          ? typeof habit.name === "string"
            ? habit.name
            : habit.name?.name || String(habit.name || "")
          : ""
        const message = `${confirmText}<br><br><strong style="color: var(--accent-color, #4CAF50);">${habitName}</strong>`

        if (await showConfirm(message, title)) {
          this.habits = this.habits.filter((h) => h.id !== id)
          if (this.editingHabitId === id) this.closeForm()
          this.saveData()
          this.render()
        }
      })
    })
  }
}
