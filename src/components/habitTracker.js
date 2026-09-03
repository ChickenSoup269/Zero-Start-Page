import { fadeToggle } from "../utils/dom.js"
import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { applyTranslations, geti18n } from "../services/i18n.js"
import { showConfirm } from "../utils/dialog.js"

export class HabitTracker {
  constructor(container) {
    this.container = container
    this.habits = []
    this.maxLevel = 10 // default 10 levels

    // We will render the header dynamically to update the maxLevel label
    this.container.innerHTML = `
      <div class="habit-header-container"></div>
      <div class="habit-add-form" style="display: none; margin-bottom: 10px; gap: 6px; background: rgba(0,0,0,0.15); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); align-items: center;">
        <input type="text" class="habit-add-input" placeholder="New habit name..." data-i18n-placeholder="habit_prompt_name" style="flex: 1; height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.25); color: var(--text-color); font-size: 0.82rem; outline: none; box-sizing: border-box;">
        <input type="color" class="habit-add-color" value="#4CAF50" style="width: 32px; height: 32px; padding: 2px; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; cursor: pointer; background: rgba(0,0,0,0.2); box-sizing: border-box;" title="Choose color">
        <button class="habit-save-btn" style="height: 32px; padding: 0 10px; border-radius: 6px; border: none; background: var(--accent-color, #4CAF50); color: var(--accent-contrast-color, #fff); cursor: pointer; font-size: 0.82rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center;"><i class="fa-solid fa-check"></i></button>
        <button class="habit-cancel-btn" style="height: 32px; padding: 0 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: var(--text-color); cursor: pointer; font-size: 0.82rem; display: inline-flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="habit-grid" style="display: flex; flex-direction: column; gap: 8px;"></div>
    `
    this.headerContainer = this.container.querySelector(
      ".habit-header-container",
    )
    this.gridContainer = this.container.querySelector(".habit-grid")

    const addForm = this.container.querySelector(".habit-add-form")
    const saveBtn = this.container.querySelector(".habit-save-btn")
    const cancelBtn = this.container.querySelector(".habit-cancel-btn")
    const input = this.container.querySelector(".habit-add-input")

    this.toggleForm = (show) => {
      addForm.style.display = show ? "flex" : "none"
      if (show) input.focus()
    }

    if (cancelBtn)
      cancelBtn.addEventListener("click", () => {
        this.toggleForm(false)
        input.value = ""
      })

    const saveHabit = () => {
      const name = input.value
      const colorInput = this.container.querySelector(".habit-add-color")
      const color = colorInput ? colorInput.value : "#4CAF50"
      if (name && name.trim()) {
        this.habits.push({
          id: Date.now().toString(),
          name: name.trim(),
          progress: 0,
          color: color,
        })
        this.saveData()
        this.render()
        this.toggleForm(false)
        input.value = ""
      }
    }

    if (saveBtn) saveBtn.addEventListener("click", saveHabit)
    if (input)
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") saveHabit()
        if (e.key === "Escape") this.toggleForm(false)
      })

    this.loadData()
    this.render()

    window.addEventListener("layoutUpdated", (e) => {
      if (e.detail && e.detail.key === "showHabits") {
        fadeToggle(this.container, e.detail.value, "flex")
      }
      if (e.detail && e.detail.key === "habitTrackerMini") {
        this.container.classList.toggle(
          "habitTracker-mini",
          e.detail.value === true,
        )
      }
      if (e.detail && e.detail.key === "habitColorMode") {
        this.render()
        const addColorInput = this.container.querySelector(".habit-add-color")
        if (addColorInput) {
          addColorInput.style.display =
            e.detail.value === "custom" ? "inline-block" : "none"
        }
      }
    })

    fadeToggle(this.container, getSettings().showHabits === true, "flex")
    this.container.classList.toggle(
      "habitTracker-mini",
      getSettings().habitTrackerMini === true,
    )

    // Initial sync of add color input
    const initialColorMode = getSettings().habitColorMode || "custom"
    const addColorInput = this.container.querySelector(".habit-add-color")
    if (addColorInput) {
      addColorInput.style.display =
        initialColorMode === "custom" ? "inline-block" : "none"
    }
  }

  loadData() {
    const saved = localStorage.getItem("habitTrackerData")
    if (saved) {
      try {
        const data = JSON.parse(saved)
        this.habits = (data.habits || []).map((h) => ({
          ...h,
          name:
            typeof h.name === "string"
              ? h.name
              : h.name?.name || String(h.name || ""),
        }))
        if (data.maxLevel) this.maxLevel = data.maxLevel
      } catch (e) {}
    }
  }

  saveData() {
    localStorage.setItem(
      "habitTrackerData",
      JSON.stringify({
        habits: this.habits,
        maxLevel: this.maxLevel,
      }),
    )
  }

  render() {
    this.headerContainer.innerHTML = `
      <div class="habit-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-weight: 600; font-size: 0.95rem;">
        <span class="habit-title"><i class="fa-solid fa-bars-progress" style="color: var(--accent-color); margin-right: 6px;"></i> <span data-i18n="settings_show_habits">Habit Tracker</span></span>
        <div style="display: flex; align-items: center; gap: 5px;">
          <div class="habit-level-stepper" style="display: inline-flex; align-items: center; gap: 3px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 6px; height: 26px; box-sizing: border-box;">
            <button class="habit-dec-max" style="background: transparent; border: none; color: var(--text-color); cursor: pointer; padding: 0 4px; display: inline-flex; align-items: center; justify-content: center; opacity: 0.75;" title="-1"><i class="fa-solid fa-minus" style="font-size: 0.72rem;"></i></button>
            <span style="font-size: 0.78rem; opacity: 0.85; min-width: 16px; text-align: center; font-weight: 600;">${this.maxLevel}</span>
            <button class="habit-inc-max" style="background: transparent; border: none; color: var(--text-color); cursor: pointer; padding: 0 4px; display: inline-flex; align-items: center; justify-content: center; opacity: 0.75;" title="+1"><i class="fa-solid fa-plus" style="font-size: 0.72rem;"></i></button>
          </div>
          <button class="habit-add-btn" style="width: 26px; height: 26px; border-radius: 6px; background: transparent; border: 1px solid transparent; color: var(--text-color); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; opacity: 0.75; transition: background-color 0.18s ease, border-color 0.18s ease, opacity 0.18s ease;" title="Add"><i class="fa-solid fa-plus" style="font-size: 0.82rem;"></i></button>
          <button class="habit-close-btn widget-close-btn" style="width: 26px; height: 26px; border-radius: 6px; background: transparent; border: 1px solid transparent; color: var(--text-color); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; opacity: 0.75; transition: background-color 0.18s ease, border-color 0.18s ease, opacity 0.18s ease;" title="Close"><i class="fa-solid fa-xmark" style="font-size: 0.82rem;"></i></button>
        </div>
      </div>
    `

    this.headerContainer
      .querySelector(".habit-close-btn")
      ?.addEventListener("click", () => {
        updateSetting("showHabits", false)
        saveSettings()
        fadeToggle(this.container, false, "flex")
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: "showHabits", value: false },
          }),
        )
      })

    let gridHtml = ""

    if (this.habits.length === 0) {
      gridHtml += `<div style="text-align: center; opacity: 0.6; font-size: 0.85rem; padding: 14px 0;" data-i18n="habit_no_habits">No habits yet. Click + to add.</div>`
    } else {
      for (const habit of this.habits) {
        gridHtml += `<div class="habit-row" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">`

        gridHtml += `<div class="habit-squares-container" style="position: relative; flex: 1; display: flex; height: 30px; border-radius: 6px; overflow: hidden; background: rgba(0,0,0,0.18); border: 1px solid rgba(255,255,255,0.07); padding: 2px; box-sizing: border-box;">`
        gridHtml += `<div class="habit-squares" style="display: flex; width: 100%; gap: 2px;">`

        const currentProgress = habit.progress || 0
        const habitColor = habit.color || "#4CAF50"
        const colorMode = getSettings().habitColorMode || "custom"

        for (let i = 1; i <= this.maxLevel; i++) {
          const isFilled = i <= currentProgress
          let color = "rgba(255,255,255,0.08)"
          if (isFilled) {
            if (colorMode === "gradient") {
              const hue = ((i - 1) / (this.maxLevel - 1)) * 120
              color = `hsl(${hue}, 80%, 45%)`
            } else if (colorMode === "m3") {
              color = "var(--accent-color, #4CAF50)"
            } else {
              color = habitColor
            }
          }

          gridHtml += `<div class="habit-square" data-no-drag="true" data-level="${i}" data-id="${habit.id}" style="flex: 1; height: 100%; background: ${color}; border-radius: 3px; cursor: pointer; transition: background-color 0.18s ease;"></div>`
        }
        gridHtml += `</div>`

        // Text overlay
        gridHtml += `<div class="habit-name" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none; color: #fff; font-size: 0.82rem; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.8); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; padding: 0 8px;">${habit.name}</div>`

        gridHtml += `</div>` // end habit-squares-container

        if (colorMode === "custom") {
          gridHtml += `<input type="color" class="habit-change-color" data-id="${habit.id}" value="${habitColor}" style="width: 22px; height: 22px; padding: 1px; border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; cursor: pointer; background: transparent; opacity: 0.75; transition: opacity 0.18s ease; box-sizing: border-box;" title="Change color">`
        }
        gridHtml += `<button class="habit-delete-btn" data-id="${habit.id}" style="width: 24px; height: 24px; border-radius: 6px; background: transparent; border: none; color: #ff5252; cursor: pointer; opacity: 0.75; display: inline-flex; align-items: center; justify-content: center; transition: opacity 0.18s ease, background-color 0.18s ease;" title="Delete"><i class="fa-solid fa-trash-can" style="font-size: 0.8rem;"></i></button>`
        gridHtml += `</div>`
      }
    }

    this.gridContainer.innerHTML = gridHtml
    applyTranslations(this.container)
    this.bindEvents()
  }

  bindEvents() {
    const addBtn = this.container.querySelector(".habit-add-btn")
    if (addBtn) {
      addBtn.addEventListener("click", () => this.toggleForm(true))
    }

    const incBtn = this.container.querySelector(".habit-inc-max")
    const decBtn = this.container.querySelector(".habit-dec-max")

    if (incBtn) {
      incBtn.addEventListener("click", () => {
        if (this.maxLevel < 31) {
          this.maxLevel++
          this.saveData()
          this.render()
        }
      })
    }
    if (decBtn) {
      decBtn.addEventListener("click", () => {
        if (this.maxLevel > 1) {
          this.maxLevel--
          // ensure no habit has progress > new maxLevel
          this.habits.forEach((h) => {
            if (h.progress > this.maxLevel) h.progress = this.maxLevel
          })
          this.saveData()
          this.render()
        }
      })
    }

    const squares = this.container.querySelectorAll(".habit-square")
    squares.forEach((sq) => {
      sq.addEventListener("click", (e) => {
        const level = parseInt(e.target.dataset.level, 10)
        const id = e.target.dataset.id

        const habitIndex = this.habits.findIndex((h) => h.id === id)
        if (habitIndex !== -1) {
          if (this.habits[habitIndex].progress === level) {
            this.habits[habitIndex].progress = level - 1
          } else {
            this.habits[habitIndex].progress = level
          }
          this.saveData()
          this.render()
        }
      })
    })

    const colorPickers = this.container.querySelectorAll(".habit-change-color")
    colorPickers.forEach((picker) => {
      picker.addEventListener("input", (e) => {
        const id = e.target.dataset.id
        const newColor = e.target.value
        const habitIndex = this.habits.findIndex((h) => h.id === id)
        if (habitIndex !== -1) {
          this.habits[habitIndex].color = newColor
          const row = e.target.closest(".habit-row")
          if (row) {
            const squares = row.querySelectorAll(".habit-square")
            squares.forEach((sq) => {
              const level = parseInt(sq.dataset.level, 10)
              const currentProgress = this.habits[habitIndex].progress || 0
              if (level <= currentProgress) {
                sq.style.background = newColor
              }
            })
          }
        }
      })
      picker.addEventListener("change", (e) => {
        const id = e.target.dataset.id
        const newColor = e.target.value
        const habitIndex = this.habits.findIndex((h) => h.id === id)
        if (habitIndex !== -1) {
          this.habits[habitIndex].color = newColor
          this.saveData()
        }
      })
      picker.addEventListener("mouseenter", (e) => {
        e.currentTarget.style.opacity = "1"
      })
      picker.addEventListener("mouseleave", (e) => {
        e.currentTarget.style.opacity = "0.7"
      })
    })

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
          this.saveData()
          this.render()
        }
      })

      btn.addEventListener("mouseenter", (e) => {
        e.currentTarget.style.opacity = "1"
      })
      btn.addEventListener("mouseleave", (e) => {
        e.currentTarget.style.opacity = "0.7"
      })
    })
  }
}
