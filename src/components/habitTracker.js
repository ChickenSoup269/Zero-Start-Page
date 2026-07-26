import { fadeToggle } from "../utils/dom.js"
import { getSettings } from "../services/state.js"
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
      <div class="habit-add-form" style="display: none; margin-bottom: 10px; gap: 5px;">
        <input type="text" class="habit-add-input" placeholder="New habit name..." data-i18n-placeholder="habit_prompt_name" style="flex: 1; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: var(--text-color); font-size: 0.85em; outline: none;">
        <button class="habit-save-btn" style="padding: 4px 8px; border-radius: 4px; border: none; background: var(--accent-color, #4CAF50); color: #fff; cursor: pointer; font-size: 0.85em;"><i class="fa-solid fa-check"></i></button>
        <button class="habit-cancel-btn" style="padding: 4px 8px; border-radius: 4px; border: none; background: rgba(255,255,255,0.2); color: var(--text-color); cursor: pointer; font-size: 0.85em;"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="habit-grid" style="display: flex; flex-direction: column; gap: 8px;"></div>
    `
    this.headerContainer = this.container.querySelector(".habit-header-container")
    this.gridContainer = this.container.querySelector(".habit-grid")

    const addForm = this.container.querySelector(".habit-add-form")
    const saveBtn = this.container.querySelector(".habit-save-btn")
    const cancelBtn = this.container.querySelector(".habit-cancel-btn")
    const input = this.container.querySelector(".habit-add-input")

    this.toggleForm = (show) => {
      addForm.style.display = show ? "flex" : "none"
      if (show) input.focus()
    }

    if (cancelBtn) cancelBtn.addEventListener("click", () => {
      this.toggleForm(false)
      input.value = ""
    })

    const saveHabit = () => {
      const name = input.value
      if (name && name.trim()) {
        this.habits.push({ id: Date.now().toString(), name: name.trim(), progress: 0 })
        this.saveData()
        this.render()
        this.toggleForm(false)
        input.value = ""
      }
    }

    if (saveBtn) saveBtn.addEventListener("click", saveHabit)
    if (input) input.addEventListener("keydown", (e) => {
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
        this.container.classList.toggle("habitTracker-mini", e.detail.value === true)
      }
    })

    fadeToggle(this.container, getSettings().showHabits === true, "flex")
    this.container.classList.toggle("habitTracker-mini", getSettings().habitTrackerMini === true)
  }

  loadData() {
    const saved = localStorage.getItem("habitTrackerData")
    if (saved) {
      try {
        const data = JSON.parse(saved)
        this.habits = data.habits || []
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
      <div class="habit-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-weight: 600;">
        <span><i class="fa-solid fa-bars-progress"></i> <span data-i18n="settings_show_habits">Habit Tracker</span></span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.15); padding: 2px 6px; border-radius: 4px;">
            <button class="habit-dec-max" style="background: transparent; border: none; color: var(--text-color); cursor: pointer; padding: 0 4px;"><i class="fa-solid fa-minus" style="font-size: 0.8em;"></i></button>
            <span style="font-size: 0.8em; opacity: 0.8; min-width: 14px; text-align: center;">${this.maxLevel}</span>
            <button class="habit-inc-max" style="background: transparent; border: none; color: var(--text-color); cursor: pointer; padding: 0 4px;"><i class="fa-solid fa-plus" style="font-size: 0.8em;"></i></button>
          </div>
          <button class="habit-add-btn" style="background: transparent; border: none; color: var(--text-color); cursor: pointer; margin-left: 4px;"><i class="fa-solid fa-plus"></i></button>
        </div>
      </div>
    `

    let gridHtml = ""

    if (this.habits.length === 0) {
      gridHtml += `<div style="text-align: center; opacity: 0.6; font-size: 0.9em; padding: 10px 0;" data-i18n="habit_no_habits">No habits yet. Click + to add.</div>`
    } else {
      for (const habit of this.habits) {
        gridHtml += `<div class="habit-row" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">`
        
        gridHtml += `<div class="habit-squares-container" style="position: relative; flex: 1; display: flex; height: 28px; border-radius: 4px; overflow: hidden;">`
        gridHtml += `<div class="habit-squares" style="display: flex; width: 100%; gap: 2px;">`

        const currentProgress = habit.progress || 0

        for (let i = 1; i <= this.maxLevel; i++) {
          const isFilled = i <= currentProgress
          // Hue from 0 (Red) to 120 (Green)
          const hue = ((i - 1) / (this.maxLevel - 1)) * 120
          const color = isFilled
            ? `hsl(${hue}, 80%, 45%)`
            : "rgba(255,255,255,0.12)"
            
          gridHtml += `<div class="habit-square" data-no-drag="true" data-level="${i}" data-id="${habit.id}" style="flex: 1; height: 100%; background: ${color}; border-radius: 2px; cursor: pointer; transition: background 0.2s; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);"></div>`
        }
        gridHtml += `</div>`
        
        // Text overlay
        gridHtml += `<div class="habit-name" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none; color: #fff; font-size: 0.85em; font-weight: 700; text-shadow: 0 1px 3px rgba(0,0,0,0.9), 0 0 5px rgba(0,0,0,0.5); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; padding: 0 10px;">${habit.name}</div>`
        
        gridHtml += `</div>` // end habit-squares-container
        
        gridHtml += `<button class="habit-delete-btn" data-id="${habit.id}" style="background: transparent; border: none; color: #ff5252; cursor: pointer; opacity: 0.5; padding: 4px; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-trash-can" style="font-size: 0.85em;"></i></button>`
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
          this.habits.forEach(h => {
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

        const habitIndex = this.habits.findIndex(h => h.id === id)
        if (habitIndex !== -1) {
          if (this.habits[habitIndex].progress === level) {
             this.habits[habitIndex].progress = level - 1;
          } else {
             this.habits[habitIndex].progress = level;
          }
          this.saveData()
          this.render()
        }
      })
    })

    const deleteBtns = this.container.querySelectorAll(".habit-delete-btn")
    deleteBtns.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        if (await showConfirm(geti18n("habit_confirm_delete", "Delete this habit?"))) {
          const id = e.currentTarget.dataset.id
          this.habits = this.habits.filter((h) => h.id !== id)
          this.saveData()
          this.render()
        }
      })
      
      btn.addEventListener("mouseenter", (e) => { e.currentTarget.style.opacity = "1" })
      btn.addEventListener("mouseleave", (e) => { e.currentTarget.style.opacity = "0.5" })
    })
  }
}
