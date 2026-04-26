import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { fadeToggle } from "../utils/dom.js"

export class Timer {
  constructor() {
    this.container = null
    this.display = null
    const settings = getSettings()
    this.timeLeft = settings.timerCurrentTime || 0
    this.initialTime = settings.timerInitialTime || 0
    this.endTime = settings.timerEndTime || 0
    this.isRunning = settings.timerIsRunning || false
    this.timerId = null
    this.alarm = new Audio(
      "https://raw.githubusercontent.com/ChickenSoup269/imagesForRepo/main/sounds/bedside_clock_alarm.mp3",
    )
    this.alarm.loop = true
    this.isVisible = settings.showTimer === true

    this.init()
  }

  init() {
    this.createElements()
    this.setupEventListeners()
    this.updateVisibility()
    this.applySkin()

    // Resume logic
    if (this.isRunning && this.endTime > Date.now()) {
      this.timeLeft = Math.ceil((this.endTime - Date.now()) / 1000)
      this.startTimer(true)
    } else if (this.isRunning) {
      // Timer expired while user was away
      this.timeLeft = 0
      this.isRunning = false
      this.render()
      this.saveState()
      // Optional: Play alarm if it just finished? Usually better stay silent if away.
    } else {
      // Paused state
      this.render()
    }
  }

  createElements() {
    this.container = document.createElement("div")
    this.container.className = "timer-container glass-panel drag-handle"
    this.container.id = "timer-component"

    this.container.innerHTML = `
            <div class="timer-main-view">
                <div class="timer-display" id="timer-display">00:00:00</div>
                <div class="timer-controls">
                    <button id="timer-start-pause" class="icon-btn" title="Start/Pause"><i class="fa-solid fa-play"></i></button>
                    <button id="timer-reset" class="icon-btn" title="Reset"><i class="fa-solid fa-rotate-right"></i></button>
                    <button id="timer-edit" class="icon-btn" title="Set Time"><i class="fa-solid fa-keyboard"></i></button>
                    <button id="timer-minimize" class="icon-btn" title="Minimize to Clock"><i class="fa-solid fa-compress"></i></button>
                </div>
            </div>
            <div id="timer-input-view" class="timer-input-view" style="display: none;">
                <div class="timer-input-header">Set Timer</div>
                <div class="timer-input-wrapper">
                    <input type="text" id="timer-smart-input" name="timer-smart-input" placeholder="00h 00m 00s" maxlength="6" inputmode="numeric">
                    <div class="timer-input-hint">Enter digits (e.g. 500 for 5m)</div>
                </div>
                <div class="timer-input-actions">
                    <button id="timer-cancel-edit" class="secondary-btn">Cancel</button>
                    <button id="timer-set-confirm" class="primary-btn">Set</button>
                </div>
            </div>
            <div id="alarm-control-container" style="display: none; width: 100%;">
                <button id="stop-alarm-btn" class="primary-btn">Stop Alarm</button>
            </div>
        `

    document.body.appendChild(this.container)
    this.display = this.container.querySelector("#timer-display")
    
    // Create the mini clock indicator if it doesn't exist
    this._createMiniIndicator()
  }

  _createMiniIndicator() {
    const clockWrap = document.querySelector(".clock-date-wrap")
    if (clockWrap && !document.getElementById("mini-timer-indicator")) {
      const mini = document.createElement("div")
      mini.id = "mini-timer-indicator"
      mini.className = "mini-timer-indicator"
      mini.style.display = "none"
      mini.innerHTML = `
        <i class="fa-solid fa-stopwatch"></i>
        <span class="mini-timer-text">00:00</span>
      `
      mini.addEventListener("click", () => {
        updateSetting("showTimer", true)
        saveSettings()
        this.isVisible = true
        this.updateVisibility()
      })
      clockWrap.appendChild(mini)
    }
  }

  setupEventListeners() {
    this.container
      .querySelector("#timer-start-pause")
      .addEventListener("click", () => this.toggleTimer())
    this.container
      .querySelector("#timer-reset")
      .addEventListener("click", () => this.resetTimer())
    this.container
      .querySelector("#timer-edit")
      .addEventListener("click", () => this.showInputView())
    this.container
      .querySelector("#timer-minimize")
      .addEventListener("click", () => {
        updateSetting("showTimer", false)
        saveSettings()
        this.isVisible = false
        this.updateVisibility()
      })
    this.container
      .querySelector("#timer-cancel-edit")
      .addEventListener("click", () => this.hideInputView())
    this.container
      .querySelector("#timer-set-confirm")
      .addEventListener("click", () => this.setTimer())
    this.container
      .querySelector("#stop-alarm-btn")
      .addEventListener("click", () => this.stopAlarm())

    window.addEventListener("layoutUpdated", (e) => {
      if (e.detail.key === "showTimer") {
        this.isVisible = e.detail.value
        this.updateVisibility()
      }
      if (e.detail.key === "timerSkin") {
        this.applySkin()
      }
    })

    // Smart input handler
    const smartInput = this.container.querySelector("#timer-smart-input")
    smartInput.addEventListener("input", (e) => {
      let val = e.target.value.replace(/\D/g, "")
      if (val.length > 6) val = val.slice(0, 6)

      // Format with colons
      let formatted = ""
      if (val.length > 0) {
        if (val.length <= 2) {
          formatted = val
        } else if (val.length <= 4) {
          formatted = val.slice(0, -2) + ":" + val.slice(-2)
        } else {
          formatted =
            val.slice(0, -4) + ":" + val.slice(-4, -2) + ":" + val.slice(-2)
        }
      }

      e.target.value = formatted
      this.updateSmartInputPreview(val)
    })

    smartInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.setTimer()
      }
    })
  }

  updateVisibility() {
    fadeToggle(this.container, this.isVisible, "flex")
    this._updateMiniIndicatorVisibility()
  }

  _updateMiniIndicatorVisibility() {
    const mini = document.getElementById("mini-timer-indicator")
    if (mini) {
      const shouldShowMini = !this.isVisible && this.isRunning
      mini.style.display = shouldShowMini ? "flex" : "none"
      if (shouldShowMini) this.render()
    }
  }

  showInputView() {
    this.container.querySelector(".timer-main-view").style.display = "none"
    this.container.querySelector("#timer-input-view").style.display = "flex"
    const smartInput = this.container.querySelector("#timer-smart-input")
    
    const h = Math.floor(this.timeLeft / 3600)
    const m = Math.floor((this.timeLeft % 3600) / 60)
    const s = this.timeLeft % 60
    smartInput.value = h > 0 ? 
      h.toString().padStart(2, '0') + m.toString().padStart(2, '0') + s.toString().padStart(2, '0') :
      (m > 0 ? m.toString().padStart(2, '0') + s.toString().padStart(2, '0') : s.toString())
    
    smartInput.focus()
    smartInput.select()
  }

  hideInputView() {
    this.container.querySelector(".timer-main-view").style.display = "flex"
    this.container.querySelector("#timer-input-view").style.display = "none"
    this.render()
  }

  toggleTimer() {
    if (this.timerId) {
      this.pauseTimer()
    } else if (this.timeLeft > 0) {
      this.startTimer()
    }
  }

  startTimer(isResuming = false) {
    const btn = this.container.querySelector("#timer-start-pause i")
    if (btn) btn.className = "fa-solid fa-pause"

    this.isRunning = true
    if (!isResuming) {
      this.endTime = Date.now() + this.timeLeft * 1000
    }

    this.saveState()
    this._updateMiniIndicatorVisibility()

    this.timerId = setInterval(() => {
      const remaining = Math.ceil((this.endTime - Date.now()) / 1000)
      if (this.timeLeft !== remaining) {
        this.timeLeft = Math.max(0, remaining)
        this.render()
      }

      if (this.timeLeft <= 0) {
        this.pauseTimer()
        this.playAlarm()
        this.timeLeft = this.initialTime
        this.render()
        this.saveState()
      }
    }, 500)
  }

  pauseTimer() {
    clearInterval(this.timerId)
    this.timerId = null
    this.isRunning = false
    const btn = this.container.querySelector("#timer-start-pause i")
    if (btn) btn.className = "fa-solid fa-play"
    this.saveState()
    this._updateMiniIndicatorVisibility()
  }

  resetTimer() {
    this.pauseTimer()
    this.timeLeft = this.initialTime
    this.isRunning = false
    this.render()
    this.stopAlarm()
    this.saveState()
  }

  updateSmartInputPreview(value) {
    if (!value) {
      this.display.textContent = "00:00:00"
      return
    }
    const parsed = this.parseSmartTimerInput(value)
    this.renderTime(parsed, this.display)
  }

  parseSmartTimerInput(value) {
    const digits = value.replace(/\D/g, "")
    const len = digits.length
    if (len === 0) return 0
    let hours = 0, minutes = 0, seconds = 0
    if (len <= 2) {
      seconds = parseInt(digits)
    } else if (len <= 4) {
      minutes = parseInt(digits.slice(0, -2))
      seconds = parseInt(digits.slice(-2))
    } else {
      hours = parseInt(digits.slice(0, -4))
      minutes = parseInt(digits.slice(-4, -2))
      seconds = parseInt(digits.slice(-2))
    }
    return Math.min(hours, 23) * 3600 + Math.min(minutes, 59) * 60 + Math.min(seconds, 59)
  }

  setTimer() {
    const smartInput = this.container.querySelector("#timer-smart-input")
    const totalSeconds = this.parseSmartTimerInput(smartInput.value)
    if (totalSeconds === 0) {
      this.hideInputView()
      return
    }
    const wasRunning = this.isRunning
    if (this.isRunning) this.pauseTimer()
    this.initialTime = totalSeconds
    this.timeLeft = this.initialTime
    this.isRunning = false
    this.saveState()
    this.render()
    this.hideInputView()
    if (wasRunning) setTimeout(() => this.startTimer(), 100)
  }

  saveState() {
    updateSetting("timerInitialTime", this.initialTime)
    updateSetting("timerCurrentTime", this.timeLeft)
    updateSetting("timerEndTime", this.endTime)
    updateSetting("timerIsRunning", this.isRunning)
    saveSettings()
    window.dispatchEvent(new CustomEvent("layoutUpdated", {
      detail: { key: "timerIsRunning", value: this.isRunning },
    }))
  }

  playAlarm() {
    this.alarm.play().catch((e) => console.error("Alarm play failed:", e))
    this.container.querySelector("#alarm-control-container").style.display =
      "block"
    const timerToggleBtn = document.querySelector('button[data-toggle="timer"]')
    if (timerToggleBtn) timerToggleBtn.classList.add("timer-expired-blink")

    // Also blink mini indicator if hidden
    const mini = document.getElementById("mini-timer-indicator")
    if (mini) mini.classList.add("timer-expired-blink")
  }

  stopAlarm() {
    this.alarm.pause()
    this.alarm.currentTime = 0
    this.container.querySelector("#alarm-control-container").style.display =
      "none"
    const timerToggleBtn = document.querySelector('button[data-toggle="timer"]')
    if (timerToggleBtn) timerToggleBtn.classList.remove("timer-expired-blink")
    const mini = document.getElementById("mini-timer-indicator")
    if (mini) mini.classList.remove("timer-expired-blink")
  }

  render() {
    this.renderTime(this.timeLeft, this.display)
    
    const miniText = document.querySelector("#mini-timer-indicator .mini-timer-text")
    if (miniText) {
      this.renderTime(this.timeLeft, miniText, true)
    }
  }

  renderTime(seconds, element, short = false) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60

    if (h > 0) {
      // Always show HH:MM:SS if there are hours
      element.textContent = `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    } else if (m > 0) {
      // Show MM:SS if there are minutes but no hours
      element.textContent = `${m}:${s.toString().padStart(2, "0")}`
    } else {
      // Show just SS if there are only seconds
      element.textContent = short ? s.toString() : s.toString().padStart(2, "0")
    }
  }

  applySkin() {
    const settings = getSettings()
    const isWhiteMode = settings.showQuickAccessBg === true
    const skin = isWhiteMode ? "white-blur" : (settings.timerSkin || "default")
    
    this.container.classList.toggle("skin-white-blur", skin === "white-blur")
  }
}
