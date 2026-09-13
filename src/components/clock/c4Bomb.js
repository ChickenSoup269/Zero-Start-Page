import { clockElement } from "../../utils/dom.js"
import { getSettings } from "../../services/state.js"
import { getSafeWeekday, getCustomDateString } from "./clockLocale.js"

let c4BombArmed = false
let c4BombPulseUntil = 0
let c4BombInput = ""
let c4BombUnlocked = false
let c4BombLeverOn = false
let c4BombDetonateAt = 0
let c4BombExploded = false
let c4BombWrongUntil = 0
let c4BombLastBeepSecond = null
let c4BombBeepRunId = 0
let c4BombFastTickTimer = null

const C4_BOMB_PASSCODE = "7355608"
const C4_BOMB_FUSE_MS = 11500
const C4_BOMB_BEEP_URL =
  "https://raw.githubusercontent.com/ChickenSoup269/imagesForRepo/main/sounds/beep.mp3"
const C4_BOMB_WRONG_URL =
  "https://raw.githubusercontent.com/ChickenSoup269/imagesForRepo/main/sounds/alexis_gaming_cam-among-us-alarme-sabotage-393155.mp3"
const C4_BOMB_PLANT_URL =
  "https://raw.githubusercontent.com/ChickenSoup269/imagesForRepo/main/sounds/counter-strike-c4-sound.mp3"

function playC4BombSound(url, volume = 0.5) {
  try {
    const audio = new Audio(url)
    audio.volume = volume
    audio.play().catch(() => {})
  } catch (error) {
    // Sound is optional; keep the clock interaction working if playback is blocked.
  }
}

function playC4BombBeep() {
  playC4BombSound(C4_BOMB_BEEP_URL, 0.5)
}

function playC4BombWrongSound() {
  playC4BombSound(C4_BOMB_WRONG_URL, 0.65)
}

function playC4BombPlantSound() {
  playC4BombSound(C4_BOMB_PLANT_URL, 0.75)
}

function playC4BombCountdownBeep(remainingSeconds) {
  c4BombBeepRunId += 1
  const runId = c4BombBeepRunId
  const offsets =
    remainingSeconds > 8 ? [0] : remainingSeconds > 4 ? [0, 360] : [0, 220, 440]

  offsets.forEach((offset) => {
    setTimeout(() => {
      if (runId !== c4BombBeepRunId || !c4BombDetonateAt) return
      playC4BombBeep()
    }, offset)
  })
}

function clearC4BombFastTick() {
  if (!c4BombFastTickTimer) return
  cancelAnimationFrame(c4BombFastTickTimer)
  c4BombFastTickTimer = null
}

function scheduleC4BombFastTick() {
  if (c4BombFastTickTimer) return

  c4BombFastTickTimer = requestAnimationFrame(() => {
    c4BombFastTickTimer = null
    if (c4BombDetonateAt) updateTime()
  })
}

function getC4BombFastTicks(remainingMs) {
  if (remainingMs <= 0) return "00"

  const withinSecondMs = remainingMs % 1000 || 1000
  return String(Math.max(0, Math.floor((withinSecondMs - 1) / 10))).padStart(
    2,
    "0",
  )
}

function isEditableKeyboardTarget(target) {
  if (!target) return false
  const tagName = target.tagName?.toLowerCase?.()
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  )
}

function isC4BombKeyboardEnabled(event) {
  if (isEditableKeyboardTarget(event.target)) return false

  const settings = getSettings()
  if (settings.dateClockStyle !== "c4-bomb") return false
  if ((settings.clockDisplayMode || "all") !== "all") return false

  const clockFadeWrap = document.getElementById("clock-fade-wrap")
  if (clockFadeWrap?.classList.contains("is-hidden")) return false

  return Boolean(clockElement?.querySelector(".c4-bomb-clock"))
}

function inputC4BombDigit(digit) {
  if (
    !/^\d$/.test(digit) ||
    c4BombUnlocked ||
    c4BombExploded ||
    c4BombDetonateAt
  ) {
    return false
  }

  playC4BombBeep()
  c4BombInput = `${c4BombInput}${digit}`.slice(0, C4_BOMB_PASSCODE.length)
  c4BombWrongUntil = 0

  if (c4BombInput === C4_BOMB_PASSCODE) {
    c4BombUnlocked = true
    c4BombPulseUntil = Date.now() + 900
  } else if (c4BombInput.length >= C4_BOMB_PASSCODE.length) {
    c4BombInput = ""
    c4BombWrongUntil = Date.now() + 1100
    c4BombPulseUntil = Date.now() + 500
    playC4BombWrongSound()
  }

  updateTime()
  return true
}

function backspaceC4BombInput() {
  if (c4BombUnlocked || c4BombExploded || c4BombDetonateAt || !c4BombInput) {
    return false
  }

  c4BombInput = c4BombInput.slice(0, -1)
  c4BombWrongUntil = 0
  c4BombPulseUntil = Date.now() + 220
  playC4BombBeep()
  updateTime()
  return true
}

function resetC4BombInput() {
  if (!c4BombInput && !c4BombWrongUntil) return false

  c4BombInput = ""
  c4BombWrongUntil = 0
  c4BombPulseUntil = Date.now() + 300
  updateTime()
  return true
}

function toggleC4BombLever() {
  if (!c4BombUnlocked || c4BombExploded || c4BombDetonateAt) return false

  c4BombLeverOn = !c4BombLeverOn
  c4BombPulseUntil = Date.now() + 700
  updateTime()
  return true
}

function triggerC4BombAction() {
  if (c4BombExploded) {
    c4BombExploded = false
    c4BombWrongUntil = 0
    c4BombLastBeepSecond = null
    c4BombBeepRunId += 1
    clearC4BombFastTick()
    c4BombPulseUntil = Date.now() + 700
    updateTime()
    return true
  }

  if (!c4BombUnlocked) return false

  if (c4BombArmed || c4BombDetonateAt) {
    c4BombArmed = false
    c4BombLeverOn = false
    c4BombDetonateAt = 0
    c4BombLastBeepSecond = null
    c4BombBeepRunId += 1
    clearC4BombFastTick()
  } else if (c4BombLeverOn) {
    c4BombArmed = true
    c4BombDetonateAt = Date.now() + C4_BOMB_FUSE_MS
    c4BombLastBeepSecond = null
    c4BombBeepRunId += 1
    playC4BombPlantSound()
    scheduleC4BombFastTick()
  } else {
    return false
  }

  c4BombPulseUntil = Date.now() + 900
  updateTime()
  return true
}


export function isC4BombActive() {
  return Boolean(c4BombArmed || c4BombDetonateAt)
}

export { clearC4BombFastTick }

export function renderC4BombClock(clockElement, ctx, updateTime) {
  const {
    now,
    isTimer,
    timerLabel,
    shouldShowDate,
    hh,
    mm,
    ss,
    ampm,
    settings,
    langCode,
    tz,
    dateClockStyle,
  } = ctx

    if (c4BombDetonateAt && Date.now() >= c4BombDetonateAt) {
      c4BombDetonateAt = 0
      c4BombArmed = false
      c4BombLeverOn = false
      c4BombUnlocked = false
      c4BombInput = ""
      c4BombWrongUntil = 0
      c4BombLastBeepSecond = null
      c4BombBeepRunId += 1
      clearC4BombFastTick()
      c4BombExploded = true
      c4BombPulseUntil = Date.now() + 1400
    }

    const weekday = isTimer
      ? timerLabel
      : getSafeWeekday(
          now,
          langCode,
          settings.shortWeekday,
          tz,
          settings,
        ).toUpperCase()
    const dateStr = shouldShowDate
      ? getCustomDateString(now, langCode, tz, settings)
      : ""
    const isPulse = Date.now() < c4BombPulseUntil
    const isCounting = c4BombDetonateAt > Date.now()
    const remainingMs = Math.max(0, c4BombDetonateAt - Date.now())
    const remainingSeconds = Math.ceil(remainingMs / 1000)
    const fastCountdownTicks = getC4BombFastTicks(remainingMs)
    const isCodeWrong = Date.now() < c4BombWrongUntil

    if (isCounting && remainingSeconds !== c4BombLastBeepSecond) {
      c4BombLastBeepSecond = remainingSeconds
      playC4BombCountdownBeep(remainingSeconds)
    } else if (!isCounting) {
      c4BombLastBeepSecond = null
      c4BombBeepRunId += 1
      clearC4BombFastTick()
    }

    if (isCounting) scheduleC4BombFastTick()

    const countdownMinute = String(Math.floor(remainingSeconds / 60)).padStart(
      2,
      "0",
    )
    const countdownSecond = String(remainingSeconds % 60).padStart(2, "0")
    const rapidCountdownHtml =
      isCounting && remainingSeconds <= 8
        ? `<span class="c4-bomb-rapid-second">${fastCountdownTicks}</span>`
        : ""
    const inputDisplay = isCodeWrong
      ? "X X X X"
      : c4BombInput.padEnd(C4_BOMB_PASSCODE.length, "_")
    const keypadNumbers = [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "LOCK",
      "0",
      "SET",
    ]
    const statusText = c4BombExploded
      ? "BOOM"
      : isCounting
        ? "LIVE"
        : c4BombArmed
          ? getClockLabel("clock_c4_status_armed", "ARMED")
          : c4BombUnlocked
            ? "CODE OK"
            : getClockLabel("clock_c4_status_standby", "STANDBY")
    const buttonText = c4BombExploded
      ? "RESET"
      : isCounting || c4BombArmed
        ? getClockLabel("clock_c4_button_defuse", "DEFUSE")
        : getClockLabel("clock_c4_button_arm", "ARM")
    const buttonDisabled =
      !c4BombExploded &&
      (!c4BombUnlocked || (!c4BombLeverOn && !c4BombArmed && !isCounting))
    const leverDisabled = !c4BombUnlocked || isCounting || c4BombExploded
    let root = clockElement.querySelector(".c4-bomb-clock")
    if (!root) {
      clockElement.innerHTML = `
        <div class="c4-bomb-clock">
          <div class="c4-bomb-device">
            <div class="c4-bomb-screen">
              <div class="c4-bomb-status"></div>
              <div class="c4-bomb-time"></div>
              <div class="c4-bomb-code-line"></div>
              <div class="c4-bomb-date-wrapper"></div>
            </div>
            <div class="c4-bomb-controls">
              <div class="c4-bomb-code-hint" aria-hidden="true"><span>7355608</span></div>
              <div class="c4-bomb-led-row" aria-hidden="true">
                <span class="c4-bomb-led"></span>
                <span class="c4-bomb-led"></span>
                <span class="c4-bomb-led"></span>
              </div>
              <div class="c4-bomb-actions">
                <button type="button" class="c4-bomb-lever">
                  <span class="c4-bomb-lever-slot" aria-hidden="true"><span></span></span>
                  <span class="c4-bomb-lever-text"></span>
                </button>
                <button type="button" class="c4-bomb-button">
                  <span class="c4-bomb-button-light" aria-hidden="true"></span>
                  <span class="c4-bomb-button-text"></span>
                </button>
              </div>
              <div class="c4-bomb-keypad" aria-label="C4 passcode keypad">
                ${["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"]
                  .map(
                    (number) =>
                      `<button type="button" class="c4-bomb-key" data-c4-key="${number}">${number}</button>`,
                  )
                  .join("")}
              </div>
            </div>
          </div>
        </div>
      `
      root = clockElement.querySelector(".c4-bomb-clock")
    }

    const rootClass = `c4-bomb-clock ${c4BombArmed || isCounting ? "is-armed" : "is-standby"} ${c4BombUnlocked ? "is-unlocked" : "is-locked"} ${c4BombLeverOn ? "is-lever-on" : ""} ${c4BombExploded ? "is-exploded" : ""} ${isCodeWrong ? "is-code-wrong" : ""} ${isPulse ? "is-pulsing" : ""}`
    if (root.className !== rootClass) root.className = rootClass

    const statusEl = root.querySelector(".c4-bomb-status")
    const statusHtml = `${statusText} / ${weekday}`
    if (statusEl.getAttribute("data-raw-html") !== statusHtml) {
      statusEl.innerHTML = statusHtml
      statusEl.setAttribute("data-raw-html", statusHtml)
    }

    const timeEl = root.querySelector(".c4-bomb-time")
    const timeHtml = c4BombExploded
      ? `<span class="c4-bomb-boom">BOOM</span>`
      : isCounting
        ? `
          <span class="c4-bomb-hour">${countdownMinute}</span>
          <span class="c4-bomb-separator">:</span>
          <span class="c4-bomb-minute">${countdownSecond}</span>
          ${rapidCountdownHtml}
        `
        : `
          <span class="c4-bomb-hour">${hh}</span>
          <span class="c4-bomb-separator">:</span>
          <span class="c4-bomb-minute">${mm}</span>
          ${ss ? `<span class="c4-bomb-second">${ss}</span>` : ""}
          ${ampm ? `<span class="c4-bomb-ampm">${ampm}</span>` : ""}
        `
    if (timeEl.getAttribute("data-raw-html") !== timeHtml) {
      timeEl.innerHTML = timeHtml
      timeEl.setAttribute("data-raw-html", timeHtml)
    }

    const codeLineEl = root.querySelector(".c4-bomb-code-line")
    const codeHtml = c4BombUnlocked
      ? "PASS 7355608 ACCEPTED"
      : `PASS ${inputDisplay}`
    if (codeLineEl.getAttribute("data-raw-html") !== codeHtml) {
      codeLineEl.innerHTML = codeHtml
      codeLineEl.setAttribute("data-raw-html", codeHtml)
    }

    const dateWrapEl = root.querySelector(".c4-bomb-date-wrapper")
    const dateHtml = isCounting
      ? `<div class="c4-bomb-date">${countdownMinute}:${countdownSecond}${remainingSeconds <= 8 ? `.${fastCountdownTicks}` : ""}</div>`
      : c4BombExploded
        ? `<div class="c4-bomb-date">SYSTEM TRIPPED - PRESS RESET</div>`
        : isTimer
          ? `<div class="c4-bomb-date">${countdownLabel}</div>`
          : dateStr
            ? `<div class="c4-bomb-date">${dateStr}</div>`
            : ""
    if (dateWrapEl.getAttribute("data-raw-html") !== dateHtml) {
      dateWrapEl.innerHTML = dateHtml
      dateWrapEl.setAttribute("data-raw-html", dateHtml)
    }

    const leverBtn = root.querySelector(".c4-bomb-lever")
    leverBtn.setAttribute("aria-pressed", c4BombLeverOn ? "true" : "false")
    if (leverBtn.disabled !== leverDisabled) leverBtn.disabled = leverDisabled
    const leverText = root.querySelector(".c4-bomb-lever-text")
    const lTxt = c4BombLeverOn ? "OPEN" : "LOCK"
    if (leverText.textContent !== lTxt) leverText.textContent = lTxt

    const actionBtn = root.querySelector(".c4-bomb-button")
    actionBtn.setAttribute(
      "aria-pressed",
      c4BombArmed || isCounting ? "true" : "false",
    )
    if (actionBtn.disabled !== buttonDisabled)
      actionBtn.disabled = buttonDisabled
    const actionText = root.querySelector(".c4-bomb-button-text")
    if (actionText.textContent !== buttonText)
      actionText.textContent = buttonText

    const keysDisabled = c4BombUnlocked || isCounting || c4BombExploded
    const keypadBtns = root.querySelectorAll(".c4-bomb-key")
    keypadBtns.forEach((btn) => {
      if (btn.disabled !== keysDisabled) btn.disabled = keysDisabled
    })
}

export function initC4BombListeners(clockElement, updateTime) {
  clockElement?.addEventListener("click", (event) => {
    const key = event.target?.closest?.(".c4-bomb-key")
    if (key) {
      inputC4BombDigit(key.dataset.c4Key || "")
      return
    }

    const lever = event.target?.closest?.(".c4-bomb-lever")
    if (lever) {
      toggleC4BombLever()
      return
    }

    const button = event.target?.closest?.(".c4-bomb-button")
    if (!button) return

    triggerC4BombAction()
  })

  window.addEventListener("keydown", (event) => {
    if (!isC4BombKeyboardEnabled(event)) return

    let handled = false
    if (/^\d$/.test(event.key)) {
      handled = inputC4BombDigit(event.key)
    } else if (event.key === "Backspace") {
      handled = backspaceC4BombInput()
    } else if (event.key === "Enter") {
      handled = triggerC4BombAction()
    } else if (event.key === "Escape") {
      handled = resetC4BombInput()
    }

    if (handled) event.preventDefault()
  })
}
