import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { fadeToggle } from "../utils/dom.js"
import { getImageUrl } from "../services/imageStore.js"
import { geti18n } from "../services/i18n.js"

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
  morning_flower: {
    file: "morning_flower.mp3",
    label: "Morning Flower",
  },
  iphone_alarm: {
    file: "iphone_alarm.mp3",
    label: "iPhone Alarm",
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
const SAVED_TIMER_PRESETS_KEY = "savedTimerPresets"
const MAX_SAVED_TIMER_PRESETS = 6

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
    this.isFocusMode = false
    this.focusClockId = null
    this.savedTimerPresets = this.loadSavedTimerPresets()

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
    const i18n = geti18n()
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
                    <span>${i18n.timer_status_ready || "Ready"}</span>
                </div>
                <div class="timer-controls">
                    <button id="timer-start-pause" class="icon-btn" title="Start/Pause"><i class="fa-solid fa-play"></i></button>
                    <button id="timer-reset" class="icon-btn" title="Reset"><i class="fa-solid fa-rotate-right"></i></button>
                    <button id="timer-edit" class="icon-btn" title="Set Time"><i class="fa-solid fa-keyboard"></i></button>
                    <button id="timer-clock-mode" class="icon-btn" title="Countdown to Main Clock"><i class="fa-solid fa-hourglass-start"></i></button>
                    <button id="timer-focus-mode" class="icon-btn" title="${i18n.timer_focus_mode || "Focus Mode"}"><i class="fa-solid fa-bullseye"></i></button>
                    <button id="timer-minimize" class="icon-btn" title="Minimize to Clock"><i class="fa-solid fa-compress"></i></button>
                </div>
                <label class="timer-alarm-row" for="timer-alarm-sound-widget">
                    <i class="fa-solid fa-bell"></i>
                    <select id="timer-alarm-sound-widget" title="Alarm Sound">
                        ${renderTimerAlarmOptions(this.alarmSound)}
                    </select>
                </label>
            </div>
            <div id="timer-input-view" class="timer-input-view" style="display: none;">
                <div class="timer-input-header">Set Timer</div>
                <div class="pomodoro-presets" aria-label="Pomodoro presets">
                    <button type="button" class="pomodoro-btn" data-time="1500" data-i18n-title="pomodoroFocus" title="Focus (25m)"><i class="fa-solid fa-brain"></i> <span>25m</span></button>
                    <button type="button" class="pomodoro-btn" data-time="300" data-i18n-title="pomodoroShortBreak" title="Short Break (5m)"><i class="fa-solid fa-mug-hot"></i> <span>5m</span></button>
                    <button type="button" class="pomodoro-btn" data-time="900" data-i18n-title="pomodoroLongBreak" title="Long Break (15m)"><i class="fa-solid fa-couch"></i> <span>15m</span></button>
                </div>
                <div class="timer-saved-presets" id="timer-saved-presets" hidden>
                    <div class="timer-saved-presets-label">${i18n.timer_saved_presets || "Saved"}</div>
                    <div class="timer-saved-presets-list" id="timer-saved-presets-list"></div>
                </div>
                <div class="timer-input-wrapper">
                    <input type="text" id="timer-smart-input" name="timer-smart-input" placeholder="25m" maxlength="18" inputmode="text">
                    <div class="timer-input-hint">Try 25m, 1h 30m, 90s, or 500 for 5m</div>
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
                    <button id="timer-save-preset" class="secondary-btn" title="${i18n.timer_save_preset || "Save preset"}"><i class="fa-solid fa-floppy-disk"></i> <span>${i18n.timer_save || "Save"}</span></button>
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
    this.renderSavedTimerPresets()

    // Create the mini clock indicator if it doesn't exist
    this._createMiniIndicator()
    this._createFocusOverlay()
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

  _createFocusOverlay() {
    if (document.getElementById("timer-focus-overlay")) return
    const i18n = geti18n()

    const overlay = document.createElement("div")
    overlay.id = "timer-focus-overlay"
    overlay.className = "timer-focus-overlay"
    overlay.setAttribute("aria-hidden", "true")
    overlay.innerHTML = `
      <div class="timer-focus-vignette"></div>
      <button type="button" class="timer-focus-exit" id="timer-focus-exit" title="${i18n.timer_focus_exit || "Exit Focus"}">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div class="timer-focus-stage" role="dialog" aria-modal="true" aria-label="${i18n.timer_focus_mode || "Timer Focus"}">
        <div class="timer-focus-clock" id="timer-focus-clock">00:00</div>
        <div class="timer-focus-label">
          <i class="fa-solid fa-bullseye"></i>
          <span>${i18n.timer_focus_label || "FOCUS"}</span>
        </div>
        <div class="timer-focus-countdown" id="timer-focus-countdown">00:00</div>
        <div class="timer-focus-actions">
          <button type="button" class="timer-focus-control timer-focus-pause" id="timer-focus-pause" title="${i18n.timer_focus_pause || "Pause"}">
            <i class="fa-solid fa-pause"></i>
          </button>
          <button type="button" class="timer-focus-control timer-focus-reset" id="timer-focus-reset" title="${i18n.timer_focus_reset || "Reset"}">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
        </div>
        <div class="timer-focus-progress" aria-hidden="true">
          <div class="timer-focus-arc">
            <div class="timer-focus-arc-fill"></div>
            <div class="timer-focus-arc-cutout"></div>
          </div>
        </div>
      </div>
    `
    document.body.appendChild(overlay)

    overlay
      .querySelector("#timer-focus-exit")
      ?.addEventListener("click", () => this.exitFocusMode())
    overlay
      .querySelector("#timer-focus-pause")
      ?.addEventListener("click", () => this.pauseFocusTimer())
    overlay
      .querySelector("#timer-focus-reset")
      ?.addEventListener("click", () => this.resetFocusTimer())
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
      .querySelector("#timer-save-preset")
      .addEventListener("click", () => this.saveCurrentTimerPreset())
    this.container
      .querySelector("#stop-alarm-btn")
      .addEventListener("click", () => this.stopAlarm())
    this.alarmSelect?.addEventListener("change", () => {
      this.setAlarmSound(this.alarmSelect.value, true)
    })

    this.container
      .querySelector("#timer-clock-mode")
      .addEventListener("click", () => this.toggleClockTimerMode())
    this.container
      .querySelector("#timer-focus-mode")
      .addEventListener("click", () => this.enterFocusMode())

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isFocusMode) this.exitFocusMode()
    })

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
      if (e.detail.key === "language") {
        this.updateTimerStatus()
        this.updateMiniIndicatorState()
        this.updateTimerInputLanguage()
        this.updateFocusLanguage()
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
      e.target.value = this.normalizeSmartTimerInput(e.target.value)
      this.updateSmartInputPreview(e.target.value)
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
          this.applyTimerDuration(parseInt(timeStr, 10))
        }
      })
    })

    this.container
      .querySelector("#timer-saved-presets-list")
      ?.addEventListener("click", (e) => {
        const removeBtn = e.target.closest(".timer-saved-preset-remove")
        if (removeBtn) {
          this.removeSavedTimerPreset(parseInt(removeBtn.dataset.time, 10))
          return
        }

        const presetBtn = e.target.closest(".timer-saved-preset-btn")
        if (presetBtn) {
          this.applyTimerDuration(parseInt(presetBtn.dataset.time, 10))
        }
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
    this.renderSavedTimerPresets()
    const smartInput = this.container.querySelector("#timer-smart-input")

    const h = Math.floor(this.timeLeft / 3600)
    const m = Math.floor((this.timeLeft % 3600) / 60)
    const s = this.timeLeft % 60
    smartInput.value = this.formatDurationLabel(this.timeLeft)

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

  enterFocusMode() {
    this._createFocusOverlay()
    if (this.timeLeft <= 0) {
      this.showInputView()
      return
    }

    this.isFocusMode = true
    document.body.classList.add("timer-focus-active")
    const overlay = document.getElementById("timer-focus-overlay")
    if (overlay) overlay.setAttribute("aria-hidden", "false")

    if (!this.timerId) this.startTimer()
    this.updateFocusOverlay()
    if (this.focusClockId) clearInterval(this.focusClockId)
    this.focusClockId = setInterval(() => this.updateFocusOverlay(), 1000)
  }

  exitFocusMode() {
    this.isFocusMode = false
    document.body.classList.remove("timer-focus-active")
    const overlay = document.getElementById("timer-focus-overlay")
    if (overlay) overlay.setAttribute("aria-hidden", "true")
    if (this.focusClockId) {
      clearInterval(this.focusClockId)
      this.focusClockId = null
    }
  }

  pauseFocusTimer() {
    if (this.timerId || this.isRunning) this.pauseTimer()
    this.stopAlarm()
    this.updateFocusOverlay()
  }

  resetFocusTimer() {
    this.resetTimer()
    this.updateFocusOverlay()
  }

  updateSmartInputPreview(value) {
    if (!value.trim()) {
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

  normalizeSmartTimerInput(value) {
    return value
      .toLowerCase()
      .replace(/[^0-9hms:\s]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 18)
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
    const normalized = this.normalizeSmartTimerInput(value)
    const unitMatches = [...normalized.matchAll(/(\d+)\s*([hms])/g)]
    if (unitMatches.length > 0) {
      const total = unitMatches.reduce((sum, match) => {
        const amount = parseInt(match[1], 10)
        if (!Number.isFinite(amount)) return sum
        if (match[2] === "h") return sum + amount * 3600
        if (match[2] === "m") return sum + amount * 60
        return sum + amount
      }, 0)
      return Math.min(total, 23 * 3600 + 59 * 60 + 59)
    }

    const colonParts = normalized
      .split(":")
      .map((part) => part.trim())
      .filter(Boolean)
    if (colonParts.length > 1 && colonParts.every((part) => /^\d+$/.test(part))) {
      const parts = colonParts.map((part) => parseInt(part, 10)).slice(-3)
      let hours = 0
      let minutes = 0
      let seconds = 0
      if (parts.length === 2) {
        ;[minutes, seconds] = parts
      } else {
        ;[hours, minutes, seconds] = parts
      }
      return (
        Math.min(hours, 23) * 3600 +
        Math.min(minutes, 59) * 60 +
        Math.min(seconds, 59)
      )
    }

    const digits = normalized.replace(/\D/g, "")
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
    this.applyTimerDuration(totalSeconds)
  }

  applyTimerDuration(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return

    if (this.isRunning) this.pauseTimer()
    this.stopAlarm()
    this.initialTime = totalSeconds
    this.timeLeft = this.initialTime
    this.endTime = 0
    this.saveState()
    this.render()
    this.updateTimerStatus("ready")
    if (
      this.container.querySelector("#timer-input-view").style.display !== "none"
    ) {
      this.hideInputView()
    }
  }

  loadSavedTimerPresets() {
    try {
      const presets = JSON.parse(
        localStorage.getItem(SAVED_TIMER_PRESETS_KEY) || "[]",
      )
      return Array.isArray(presets)
        ? presets
            .map((value) => parseInt(value, 10))
            .filter((value) => Number.isFinite(value) && value > 0)
            .slice(0, MAX_SAVED_TIMER_PRESETS)
        : []
    } catch {
      return []
    }
  }

  persistSavedTimerPresets() {
    localStorage.setItem(
      SAVED_TIMER_PRESETS_KEY,
      JSON.stringify(this.savedTimerPresets),
    )
  }

  saveCurrentTimerPreset() {
    const smartInput = this.container.querySelector("#timer-smart-input")
    const totalSeconds = this.parseSmartTimerInput(smartInput.value)
    if (totalSeconds <= 0) return

    this.savedTimerPresets = [
      totalSeconds,
      ...this.savedTimerPresets.filter((value) => value !== totalSeconds),
    ].slice(0, MAX_SAVED_TIMER_PRESETS)
    this.persistSavedTimerPresets()
    this.renderSavedTimerPresets()
    smartInput.focus()
  }

  removeSavedTimerPreset(totalSeconds) {
    this.savedTimerPresets = this.savedTimerPresets.filter(
      (value) => value !== totalSeconds,
    )
    this.persistSavedTimerPresets()
    this.renderSavedTimerPresets()
  }

  renderSavedTimerPresets() {
    const section = this.container?.querySelector("#timer-saved-presets")
    const list = this.container?.querySelector("#timer-saved-presets-list")
    if (!section || !list) return

    const i18n = geti18n()
    const label = section.querySelector(".timer-saved-presets-label")
    if (label) label.textContent = i18n.timer_saved_presets || "Saved"

    section.hidden = this.savedTimerPresets.length === 0
    list.innerHTML = this.savedTimerPresets
      .map((seconds) => {
        const labelText = this.formatDurationLabel(seconds)
        const removeTitle = i18n.timer_remove_saved_preset || "Remove preset"
        return `
          <div class="timer-saved-preset">
            <button type="button" class="timer-saved-preset-btn" data-time="${seconds}" title="${labelText}">
              <i class="fa-solid fa-clock"></i>
              <span>${labelText}</span>
            </button>
            <button type="button" class="timer-saved-preset-remove" data-time="${seconds}" title="${removeTitle}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        `
      })
      .join("")
  }

  updateTimerInputLanguage() {
    const i18n = geti18n()
    const saveBtn = this.container?.querySelector("#timer-save-preset")
    const saveBtnLabel = saveBtn?.querySelector("span")
    if (saveBtn) saveBtn.title = i18n.timer_save_preset || "Save preset"
    if (saveBtnLabel) saveBtnLabel.textContent = i18n.timer_save || "Save"
    this.renderSavedTimerPresets()
  }

  formatDurationLabel(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    const parts = []
    if (h) parts.push(`${h}h`)
    if (m) parts.push(`${m}m`)
    if (s || parts.length === 0) parts.push(`${s}s`)
    return parts.join(" ")
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
    this.updateFocusOverlay()
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
    this.updateFocusOverlay()
  }

  updateMiniIndicatorState() {
    const mini = document.getElementById("mini-timer-indicator")
    if (!mini) return

    mini.classList.toggle("is-running", this.isRunning && !this.isExpired)
    mini.classList.toggle(
      "is-ready",
      !this.isRunning && this.timeLeft > 0 && !this.isExpired,
    )
    const i18n = geti18n()
    mini.title = this.isExpired
      ? i18n.timer_status_finished || "Timer finished"
      : this.isRunning
        ? i18n.timer_status_running || "Timer running"
        : this.timeLeft > 0
          ? i18n.timer_status_ready || "Timer ready"
          : i18n.timer_title || "Timer"

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
    const state =
      forcedState ||
      (this.isExpired
        ? "finished"
        : this.isRunning
          ? "running"
          : this.timeLeft > 0
            ? "ready"
            : "empty")
    const labels = this.getTimerStatusLabels()
    let label = labels.ready

    if (state === "running") {
      icon = "fa-hourglass-half"
      label = labels.running
    } else if (state === "finished") {
      icon = "fa-bell"
      label = labels.finished
    } else if (state === "empty") {
      icon = "fa-keyboard"
      label = labels.empty
    }

    this.status.classList.toggle("is-running", state === "running")
    this.status.classList.toggle("is-finished", state === "finished")
    this.status.innerHTML = `<i class="fa-solid ${icon}"></i><span>${label}</span>`
  }

  getTimerStatusLabels() {
    const i18n = geti18n()
    return {
      ready: i18n.timer_status_ready || "Ready",
      running: i18n.timer_status_running || "Running",
      finished: i18n.timer_status_finished || "Time's up",
      empty: i18n.timer_status_set_time || "Set time",
    }
  }

  renderTime(seconds, element, short = false) {
    if (!element) return
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

  getFocusClockText() {
    const now = new Date()
    return now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  updateFocusOverlay() {
    const overlay = document.getElementById("timer-focus-overlay")
    if (!overlay || !this.isFocusMode) return

    const clock = overlay.querySelector("#timer-focus-clock")
    const countdown = overlay.querySelector("#timer-focus-countdown")
    const stage = overlay.querySelector(".timer-focus-stage")
    const clockText = this.getFocusClockText()
    this.renderTime(this.timeLeft, clock)
    if (countdown) countdown.textContent = clockText

    const base = this.initialTime > 0 ? this.initialTime : this.timeLeft
    const progress =
      base > 0 ? Math.max(0, Math.min(1, this.timeLeft / base)) : 0
    overlay.style.setProperty("--timer-focus-progress", progress.toFixed(4))
    const progressAngle = Math.max(0, progress * 360)
    overlay.style.setProperty(
      "--timer-focus-angle",
      `${progressAngle.toFixed(2)}deg`,
    )
    stage?.classList.toggle("is-finished", this.isExpired)
    this.updateFocusLanguage()
  }

  updateFocusLanguage() {
    const overlay = document.getElementById("timer-focus-overlay")
    if (!overlay) return
    const i18n = geti18n()
    const label = overlay.querySelector(".timer-focus-label span")
    const exitBtn = overlay.querySelector("#timer-focus-exit")
    const pauseBtn = overlay.querySelector("#timer-focus-pause")
    const resetBtn = overlay.querySelector("#timer-focus-reset")
    const stage = overlay.querySelector(".timer-focus-stage")
    if (label) label.textContent = i18n.timer_focus_label || "FOCUS"
    if (exitBtn) exitBtn.title = i18n.timer_focus_exit || "Exit Focus"
    if (pauseBtn) pauseBtn.title = i18n.timer_focus_pause || "Pause"
    if (resetBtn) resetBtn.title = i18n.timer_focus_reset || "Reset"
    if (stage)
      stage.setAttribute("aria-label", i18n.timer_focus_mode || "Timer Focus")
  }

  applySkin() {
    const settings = getSettings()
    const isWhiteMode = settings.showQuickAccessBg === true
    const skin =
      settings.widgetUseM3Accent === true
        ? "m3-accent"
        : isWhiteMode
          ? "white-blur"
          : settings.timerSkin || "default"

    this.container.classList.toggle("skin-white-blur", skin === "white-blur")
    this.container.classList.toggle("skin-m3-accent", skin === "m3-accent")
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
