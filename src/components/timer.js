import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { fadeToggle } from "../utils/dom.js"
import { getImageUrl } from "../services/imageStore.js"

const TIMER_ALARM_BASE_URL =
  "https://raw.githubusercontent.com/ChickenSoup269/imagesForRepo/main/sounds/"

const TIMER_ALARM_SOUNDS = {
  bedside_clock_alarm: {
    file: "bedside_clock_alarm.mp3",
    label: "Bedside Clock Alarm",
  },
  among_us_sabotage: {
    file: "alexis_gaming_cam-among-us-alarme-sabotage-393155.mp3",
    label: "Among Us Sabotage",
  },
  // Ringtone source: https://pixabay.com/users/universfield-28281460/
  universfield_ringtone_014: {
    file: "universfield-ringtone-014-133357.mp3",
    label: "Ringtone 014",
  },
  universfield_ringtone_022: {
    file: "universfield-ringtone-022-376904.mp3",
    label: "Ringtone 022",
  },
  universfield_ringtone_025: {
    file: "universfield-ringtone-025-376905.mp3",
    label: "Ringtone 025",
  },
  universfield_ringtone_046: {
    file: "universfield-ringtone-046-494552.mp3",
    label: "Ringtone 046",
  },
  universfield_ringtone_064: {
    file: "universfield-ringtone-064-496264.mp3",
    label: "Ringtone 064",
  },
  universfield_ringtone_070: {
    file: "universfield-ringtone-070-496271.mp3",
    label: "Ringtone 070",
  },
  subnautica_alterra: {
    file: "subnautica_psa_beep.mp3",
    label: "Subnautica PSA Beep",
  },
  mambo: {
    file: "mambo.mp3",
    label: "Mambo",
  },
}

const CUSTOM_ALARM_SOUND_KEY = "custom_alarm_sound"

function getTimerAlarmUrl(soundKey) {
  const sound =
    TIMER_ALARM_SOUNDS[soundKey] || TIMER_ALARM_SOUNDS.bedside_clock_alarm
  return `${TIMER_ALARM_BASE_URL}${sound.file}`
}

function getCustomAlarmLabel(settings = getSettings()) {
  return settings.timerCustomAlarmSoundName || "Custom Sound"
}

function renderTimerAlarmOptions(selectedSound, settings = getSettings()) {
  const customLabel = getCustomAlarmLabel(settings)
  return [
    ...Object.entries(TIMER_ALARM_SOUNDS).map(([key, sound]) => ({
      key,
      label: sound.label,
      disabled: false,
    })),
    {
      key: CUSTOM_ALARM_SOUND_KEY,
      label: customLabel,
      disabled: !settings.timerCustomAlarmSoundId,
    },
  ]
    .map(
      ({ key, label, disabled }) =>
        `<option value="${key}" ${key === selectedSound ? "selected" : ""} ${disabled ? "disabled" : ""}>${label}</option>`,
    )
    .join("")
}

async function resolveTimerAlarmUrl(soundKey) {
  if (soundKey === CUSTOM_ALARM_SOUND_KEY) {
    const customId = getSettings().timerCustomAlarmSoundId
    if (customId) {
      const customUrl = await getImageUrl(customId).catch(() => null)
      if (customUrl) return customUrl
    }
  }
  return getTimerAlarmUrl(soundKey)
}

export class Timer {
  constructor() {
    this.container = null
    this.display = null
    const settings = getSettings()
    this.timeLeft = settings.timerCurrentTime || 0
    this.initialTime = settings.timerInitialTime || 0
    this.endTime = settings.timerEndTime || 0
    this.isRunning = settings.timerIsRunning || false
    this.isExpired = false
    this.timerId = null
    this.alarmSound = settings.timerAlarmSound || "bedside_clock_alarm"
    this.alarm = new Audio(getTimerAlarmUrl("bedside_clock_alarm"))
    this.alarm.loop = true
    this.isVisible = settings.showTimer === true

    this.init()
  }

  init() {
    this.createElements()
    this.setupEventListeners()
    this.updateVisibility()
    this.applySkin()
    this.updateClockModeBtn()
    this.setAlarmSound(this.alarmSound, false, true)

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
    this.updateTimerStatus()
  }

  createElements() {
    this.container = document.getElementById("timer-component")
    if (!this.container) {
      this.container = document.createElement("div")
      this.container.className = "timer-container glass-panel drag-handle"
      this.container.id = "timer-component"
      document.body.appendChild(this.container)
    }

    this.container.innerHTML = `
            <div class="timer-main-view">
                <div class="timer-display" id="timer-display">00:00:00</div>
                <div class="timer-status" id="timer-status">
                    <i class="fa-solid fa-circle-pause"></i>
                    <span>Ready</span>
                </div>
                <label class="timer-alarm-row" for="timer-alarm-sound-widget">
                    <i class="fa-solid fa-bell"></i>
                    <select id="timer-alarm-sound-widget" title="Alarm Sound">
                        ${renderTimerAlarmOptions(this.alarmSound)}
                    </select>
                </label>
                <div class="timer-controls">
                    <button id="timer-start-pause" class="icon-btn" title="Start/Pause"><i class="fa-solid fa-play"></i></button>
                    <button id="timer-reset" class="icon-btn" title="Reset"><i class="fa-solid fa-rotate-right"></i></button>
                    <button id="timer-edit" class="icon-btn" title="Set Time"><i class="fa-solid fa-keyboard"></i></button>
                    <button id="timer-clock-mode" class="icon-btn" title="Countdown to Main Clock"><i class="fa-solid fa-hourglass-start"></i></button>
                    <button id="timer-minimize" class="icon-btn" title="Minimize to Clock"><i class="fa-solid fa-compress"></i></button>
                </div>
            </div>
            <div id="timer-input-view" class="timer-input-view" style="display: none;">
                <div class="timer-input-header">Set Timer</div>
                <div class="pomodoro-presets" aria-label="Pomodoro presets">
                    <button type="button" class="pomodoro-btn" data-time="1500" data-i18n-title="pomodoroFocus" title="Focus (25m)"><i class="fa-solid fa-brain"></i> <span>25m</span></button>
                    <button type="button" class="pomodoro-btn" data-time="300" data-i18n-title="pomodoroShortBreak" title="Short Break (5m)"><i class="fa-solid fa-mug-hot"></i> <span>5m</span></button>
                    <button type="button" class="pomodoro-btn" data-time="900" data-i18n-title="pomodoroLongBreak" title="Long Break (15m)"><i class="fa-solid fa-couch"></i> <span>15m</span></button>
                </div>
                <div class="timer-input-wrapper">
                    <input type="text" id="timer-smart-input" name="timer-smart-input" placeholder="00h 00m 00s" maxlength="6" inputmode="numeric">
                    <div class="timer-input-hint">Enter digits (e.g. 500 for 5m)</div>
                </div>
                <div class="timer-keypad" aria-label="Timer keypad">
                    <button type="button" class="timer-keypad-btn" data-key="1">1</button>
                    <button type="button" class="timer-keypad-btn" data-key="2">2</button>
                    <button type="button" class="timer-keypad-btn" data-key="3">3</button>
                    <button type="button" class="timer-keypad-btn" data-key="4">4</button>
                    <button type="button" class="timer-keypad-btn" data-key="5">5</button>
                    <button type="button" class="timer-keypad-btn" data-key="6">6</button>
                    <button type="button" class="timer-keypad-btn" data-key="7">7</button>
                    <button type="button" class="timer-keypad-btn" data-key="8">8</button>
                    <button type="button" class="timer-keypad-btn" data-key="9">9</button>
                    <button type="button" class="timer-keypad-btn is-utility" data-action="clear">C</button>
                    <button type="button" class="timer-keypad-btn" data-key="0">0</button>
                    <button type="button" class="timer-keypad-btn is-utility" data-action="backspace"><i class="fa-solid fa-delete-left"></i></button>
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

    this.display = this.container.querySelector("#timer-display")
    this.status = this.container.querySelector("#timer-status")
    this.alarmSelect = this.container.querySelector("#timer-alarm-sound-widget")
    this.applyAlarmDropdownVisibility()

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
        updateSetting("timerMinimized", false)
        saveSettings()
        this.isVisible = true
        this.syncTimerVisibilityControls(true)
        this.updateVisibility()
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: "showTimer", value: true },
          }),
        )
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
        updateSetting("timerMinimized", true)
        updateSetting("clockTimerMode", false)
        saveSettings()
        this.isVisible = false
        this.syncTimerVisibilityControls(false)
        this.updateClockModeBtn()
        this.updateVisibility()
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: "clockTimerMode", value: false },
          }),
        )
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: "showTimer", value: false },
          }),
        )
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
    this.alarmSelect?.addEventListener("change", () => {
      this.setAlarmSound(this.alarmSelect.value, true)
    })

    this.container
      .querySelector("#timer-clock-mode")
      .addEventListener("click", () => this.toggleClockTimerMode())

    window.addEventListener("layoutUpdated", (e) => {
      if (e.detail.key === "showTimer") {
        this.isVisible = e.detail.value
        if (this.isVisible) {
          updateSetting("timerMinimized", false)
          saveSettings()
        }
        this.syncTimerVisibilityControls(this.isVisible)
        this.updateVisibility()
      }
      if (e.detail.key === "timerSkin") {
        this.applySkin()
      }
      if (e.detail.key === "clockTimerMode") {
        this.updateClockModeBtn()
      }
      if (e.detail.key === "hideTimerAlarmDropdown") {
        this.applyAlarmDropdownVisibility()
      }
    })

    window.addEventListener("settingsUpdated", (e) => {
      if (e.detail.key === "timerAlarmSound") {
        this.setAlarmSound(e.detail.value)
      }
    })

    // Smart input handler
    const smartInput = this.container.querySelector("#timer-smart-input")
    smartInput.addEventListener("input", (e) => {
      let val = e.target.value.replace(/\D/g, "")
      if (val.length > 6) val = val.slice(0, 6)
      e.target.value = this.formatTimerDigits(val)
      this.updateSmartInputPreview(val)
    })

    smartInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.setTimer()
      }
    })

    this.container.querySelectorAll(".timer-keypad-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.handleKeypadInput(btn))
    })

    this.container.querySelectorAll(".pomodoro-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const timeStr = btn.dataset.time
        if (timeStr) {
          const totalSeconds = parseInt(timeStr, 10)

          if (this.isRunning) this.pauseTimer()
          this.stopAlarm()
          this.initialTime = totalSeconds
          this.timeLeft = this.initialTime
          this.endTime = 0
          this.saveState()
          this.render()
          this.updateTimerStatus("ready")
          if (
            this.container.querySelector("#timer-input-view").style.display !==
            "none"
          ) {
            this.hideInputView()
          }
        }
      })
    })
  }

  async setAlarmSound(soundKey, persist = false, forceReload = false) {
    const settings = getSettings()
    const hasCustomSound =
      soundKey === CUSTOM_ALARM_SOUND_KEY && settings.timerCustomAlarmSoundId
    const nextSound =
      TIMER_ALARM_SOUNDS[soundKey] || hasCustomSound
        ? soundKey
        : "bedside_clock_alarm"
    if (nextSound === this.alarmSound && !forceReload) {
      this.refreshAlarmOptions(nextSound)
      if (this.alarmSelect) this.alarmSelect.value = nextSound
      return
    }
    const wasPlaying = !this.alarm.paused
    this.alarmSound = nextSound
    this.refreshAlarmOptions(nextSound)
    if (this.alarmSelect) this.alarmSelect.value = nextSound
    const settingsSelect = document.getElementById("timer-alarm-sound-select")
    if (settingsSelect) settingsSelect.value = nextSound
    if (persist) {
      updateSetting("timerAlarmSound", nextSound)
      saveSettings()
    }
    this.alarm.pause()
    this.alarm.src = await resolveTimerAlarmUrl(nextSound)
    this.alarm.currentTime = 0
    this.alarm.loop = true
    if (wasPlaying) {
      this.alarm.play().catch((e) => console.error("Alarm play failed:", e))
    }
  }

  refreshAlarmOptions(selectedSound = this.alarmSound) {
    const optionsHtml = renderTimerAlarmOptions(selectedSound)
    if (this.alarmSelect) {
      this.alarmSelect.innerHTML = optionsHtml
      this.alarmSelect.value = selectedSound
    }
    const settingsSelect = document.getElementById("timer-alarm-sound-select")
    if (settingsSelect) {
      const settings = getSettings()
      const customOption = settingsSelect.querySelector(
        `option[value="${CUSTOM_ALARM_SOUND_KEY}"]`,
      )
      if (customOption) {
        customOption.textContent = getCustomAlarmLabel(settings)
        customOption.disabled = !settings.timerCustomAlarmSoundId
      }
      settingsSelect.value = selectedSound
    }
  }

  applyAlarmDropdownVisibility() {
    const hideDropdown = getSettings().hideTimerAlarmDropdown === true
    this.container?.classList.toggle("timer-hide-alarm-dropdown", hideDropdown)
  }

  updateVisibility() {
    this.container.getAnimations().forEach((animation) => animation.cancel())
    fadeToggle(this.container, this.isVisible, "flex")
    this._updateMiniIndicatorVisibility()
  }

  syncTimerVisibilityControls(isVisible) {
    const showTimerCheckbox = document.getElementById("show-timer-checkbox")
    if (showTimerCheckbox) showTimerCheckbox.checked = isVisible
  }

  _updateMiniIndicatorVisibility() {
    this._createMiniIndicator()
    const mini = document.getElementById("mini-timer-indicator")
    if (mini) {
      const settings = getSettings()
      const isClockTimerMode = settings.clockTimerMode === true
      const isMinimized = settings.timerMinimized === true
      const shouldShowMini =
        !this.isVisible &&
        !isClockTimerMode &&
        (isMinimized || this.isRunning || this.isExpired)
      mini.style.display = shouldShowMini ? "flex" : "none"
      if (shouldShowMini) {
        this.render()
        this.updateMiniIndicatorState()
      }
    }
  }

  showInputView() {
    this.container.querySelector(".timer-main-view").style.display = "none"
    this.container.querySelector("#timer-input-view").style.display = "flex"
    const smartInput = this.container.querySelector("#timer-smart-input")

    const h = Math.floor(this.timeLeft / 3600)
    const m = Math.floor((this.timeLeft % 3600) / 60)
    const s = this.timeLeft % 60
    smartInput.value =
      h > 0
        ? h.toString().padStart(2, "0") +
          m.toString().padStart(2, "0") +
          s.toString().padStart(2, "0")
        : m > 0
          ? m.toString().padStart(2, "0") + s.toString().padStart(2, "0")
          : s.toString()

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
    if (this.timerId) clearInterval(this.timerId)
    this.stopAlarm()

    const btn = this.container.querySelector("#timer-start-pause i")
    if (btn) btn.className = "fa-solid fa-pause"

    this.isRunning = true
    if (!isResuming) {
      this.endTime = Date.now() + this.timeLeft * 1000
    }

    this.saveState()
    this.updateTimerStatus()
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
    this.updateTimerStatus()
    this._updateMiniIndicatorVisibility()
  }

  resetTimer() {
    this.pauseTimer()
    this.timeLeft = this.initialTime
    this.isRunning = false
    this.render()
    this.stopAlarm()
    this.saveState()
    this.updateTimerStatus()
  }

  updateSmartInputPreview(value) {
    if (!value) {
      this.display.textContent = "00:00:00"
      return
    }
    const parsed = this.parseSmartTimerInput(value)
    this.renderTime(parsed, this.display)
  }

  formatTimerDigits(value) {
    const digits = value.replace(/\D/g, "").slice(0, 6)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, -2)}:${digits.slice(-2)}`
    return `${digits.slice(0, -4)}:${digits.slice(-4, -2)}:${digits.slice(-2)}`
  }

  handleKeypadInput(btn) {
    const smartInput = this.container.querySelector("#timer-smart-input")
    if (!smartInput) return

    let digits = smartInput.value.replace(/\D/g, "")
    const key = btn.dataset.key
    const action = btn.dataset.action

    if (key && digits.length < 6) {
      digits += key
    } else if (action === "backspace") {
      digits = digits.slice(0, -1)
    } else if (action === "clear") {
      digits = ""
    }

    smartInput.value = this.formatTimerDigits(digits)
    this.updateSmartInputPreview(digits)
    smartInput.focus()
  }

  parseSmartTimerInput(value) {
    const digits = value.replace(/\D/g, "")
    const len = digits.length
    if (len === 0) return 0
    let hours = 0,
      minutes = 0,
      seconds = 0
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
    return (
      Math.min(hours, 23) * 3600 +
      Math.min(minutes, 59) * 60 +
      Math.min(seconds, 59)
    )
  }

  setTimer() {
    const smartInput = this.container.querySelector("#timer-smart-input")
    const totalSeconds = this.parseSmartTimerInput(smartInput.value)
    if (totalSeconds === 0) {
      this.hideInputView()
      return
    }
    if (this.isRunning) this.pauseTimer()
    this.stopAlarm()
    this.initialTime = totalSeconds
    this.timeLeft = this.initialTime
    this.endTime = 0
    this.saveState()
    this.render()
    this.updateTimerStatus("ready")
    this.hideInputView()
  }

  saveState() {
    updateSetting("timerInitialTime", this.initialTime)
    updateSetting("timerCurrentTime", this.timeLeft)
    updateSetting("timerEndTime", this.endTime)
    updateSetting("timerIsRunning", this.isRunning)
    saveSettings()
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "timerIsRunning", value: this.isRunning },
      }),
    )
  }

  playAlarm() {
    this.isExpired = true
    this._updateMiniIndicatorVisibility()
    this.alarm.play().catch((e) => console.error("Alarm play failed:", e))
    this.container.querySelector("#alarm-control-container").style.display =
      "block"
    this.updateExpiredIndicator(true)
    this.updateTimerStatus("finished")
  }

  stopAlarm() {
    this.isExpired = false
    this.alarm.pause()
    this.alarm.currentTime = 0
    this.container.querySelector("#alarm-control-container").style.display =
      "none"
    this.updateExpiredIndicator(false)
    this.updateTimerStatus()
    this._updateMiniIndicatorVisibility()
  }

  updateExpiredIndicator(isExpired) {
    const timerToggleBtn = document.querySelector('button[data-toggle="timer"]')
    const timerToggleIcon = timerToggleBtn?.querySelector("i")
    if (timerToggleBtn) {
      if (isExpired && !timerToggleBtn.dataset.timerDefaultTitle) {
        timerToggleBtn.dataset.timerDefaultTitle = timerToggleBtn.title || ""
      }
      timerToggleBtn.classList.toggle("timer-expired-blink", isExpired)
      timerToggleBtn.classList.toggle("timer-expired-attention", isExpired)
      timerToggleBtn.title = isExpired
        ? "Timer finished - stop alarm"
        : timerToggleBtn.dataset.timerDefaultTitle || "Toggle Timer"
    }
    if (timerToggleIcon) {
      if (isExpired && !timerToggleIcon.dataset.timerDefaultClass) {
        timerToggleIcon.dataset.timerDefaultClass = timerToggleIcon.className
      }
      timerToggleIcon.className = isExpired
        ? "fa-solid fa-bell"
        : timerToggleIcon.dataset.timerDefaultClass || "fa-solid fa-stopwatch"
    }

    this.container.classList.toggle("timer-expired-attention", isExpired)
    this.display?.classList.toggle("timer-expired-blink", isExpired)

    const startPauseIcon = this.container.querySelector("#timer-start-pause i")
    if (startPauseIcon && isExpired) {
      startPauseIcon.className = "fa-solid fa-bell"
    } else if (startPauseIcon) {
      startPauseIcon.className = this.isRunning
        ? "fa-solid fa-pause"
        : "fa-solid fa-play"
    }

    const mini = document.getElementById("mini-timer-indicator")
    if (mini) {
      mini.classList.toggle("timer-expired-blink", isExpired)
      mini.classList.toggle("timer-expired-attention", isExpired)
      const miniIcon = mini.querySelector("i")
      if (miniIcon) {
        miniIcon.className = isExpired
          ? "fa-solid fa-bell"
          : "fa-solid fa-stopwatch"
      }
    }
  }

  render() {
    this.renderTime(this.timeLeft, this.display)

    const miniText = document.querySelector(
      "#mini-timer-indicator .mini-timer-text",
    )
    if (miniText) {
      this.renderTime(this.timeLeft, miniText, true)
    }
    this.updateMiniIndicatorState()
  }

  updateMiniIndicatorState() {
    const mini = document.getElementById("mini-timer-indicator")
    if (!mini) return

    mini.classList.toggle("is-running", this.isRunning && !this.isExpired)
    mini.classList.toggle(
      "is-ready",
      !this.isRunning && this.timeLeft > 0 && !this.isExpired,
    )
    mini.title = this.isExpired
      ? "Timer finished"
      : this.isRunning
        ? "Timer running"
        : this.timeLeft > 0
          ? "Timer ready"
          : "Timer"

    const miniIcon = mini.querySelector("i")
    if (miniIcon && !this.isExpired) {
      miniIcon.className = this.isRunning
        ? "fa-solid fa-hourglass-half"
        : this.timeLeft > 0
          ? "fa-solid fa-play"
          : "fa-solid fa-stopwatch"
    }
  }

  updateTimerStatus(forcedState = null) {
    if (!this.status) return

    let icon = "fa-circle-pause"
    let label = "Ready"
    const state =
      forcedState ||
      (this.isExpired
        ? "finished"
        : this.isRunning
          ? "running"
          : this.timeLeft > 0
            ? "ready"
            : "empty")

    if (state === "running") {
      icon = "fa-hourglass-half"
      label = "Running"
    } else if (state === "finished") {
      icon = "fa-bell"
      label = "Time's up"
    } else if (state === "empty") {
      icon = "fa-keyboard"
      label = "Set time"
    }

    this.status.classList.toggle("is-running", state === "running")
    this.status.classList.toggle("is-finished", state === "finished")
    this.status.innerHTML = `<i class="fa-solid ${icon}"></i><span>${label}</span>`
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
    const skin = isWhiteMode ? "white-blur" : settings.timerSkin || "default"

    this.container.classList.toggle("skin-white-blur", skin === "white-blur")
  }

  toggleClockTimerMode() {
    const current = getSettings().clockTimerMode === true
    const next = !current
    updateSetting("clockTimerMode", next)
    updateSetting("timerMinimized", false)
    saveSettings()
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "clockTimerMode", value: next },
      }),
    )

    // Automatically hide timer if countdown mode is enabled
    if (next) {
      if (!this.timerId && this.timeLeft > 0) {
        this.startTimer()
      }
      updateSetting("showTimer", false)
      saveSettings()
      this.isVisible = false
      this.syncTimerVisibilityControls(false)
      this.updateVisibility()

      // Sync the quick access button state
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "showTimer", value: false },
        }),
      )
    }
  }

  updateClockModeBtn() {
    const btn = this.container.querySelector("#timer-clock-mode")
    if (btn) {
      const active = getSettings().clockTimerMode === true
      btn.classList.toggle("active", active)
    }
  }
}
