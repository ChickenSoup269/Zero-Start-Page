import { clockElement, dateElement, fadeToggle } from "../utils/dom.js"
import { getSettings } from "../services/state.js"
import { geti18n } from "../services/i18n.js"
import { makeDraggable } from "../utils/draggable.js"

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function applyHuePerCharacter(target, seed = 0) {
  if (!target) return

  const textNodes = []
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!node.nodeValue || node.nodeValue.length === 0 || !parent) {
        return NodeFilter.FILTER_REJECT
      }

      if (!node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT
      }

      if (parent.classList.contains("clock-hue-char")) {
        return NodeFilter.FILTER_REJECT
      }

      return NodeFilter.FILTER_ACCEPT
    },
  })

  let currentNode = walker.nextNode()
  while (currentNode) {
    textNodes.push(currentNode)
    currentNode = walker.nextNode()
  }

  textNodes.forEach((node) => {
    const text = node.nodeValue || ""
    const fragment = document.createDocumentFragment()
    let hueIndex = 0

    Array.from(text).forEach((char) => {
      if (!char.trim()) {
        fragment.appendChild(document.createTextNode(char))
        return
      }

      const span = document.createElement("span")
      const hue = (seed + hueIndex * 43) % 360
      span.className = "clock-hue-char"
      span.style.setProperty("--char-hue", String(hue))
      // Staggered delay for wave effect (e.g., 0.1s per character)
      span.style.setProperty("--char-delay", `${hueIndex * 0.1}s`)
      // Add time offset to sync the 8s CSS animation perfectly across 1-second DOM overwrites
      span.style.setProperty("--time-offset", `${(Date.now() % 8000) / 1000}s`)
      span.textContent = char
      fragment.appendChild(span)
      hueIndex += 1
    })

    node.parentNode?.replaceChild(fragment, node)
  })
}

function applyHueMode(settings) {
  const mode = settings.hueTextMode || "off"
  if (mode === "off") return

  const style = settings.dateClockStyle || "default"
  const displayMode = settings.clockDisplayMode || "all"

  // 1. Determine targets for Clock effect
  const clockTargets = []
  if (mode === "clock" || mode === "both") {
    if (
      style === "default" ||
      style === "glow" ||
      style === "minimal" ||
      style === "glass" ||
      style === "analog"
    ) {
      clockTargets.push(clockElement)
    } else if (style === "round" || style === "square") {
      clockTargets.push(clockElement.querySelector(".clock-time-main"))
      clockTargets.push(clockElement.querySelector(".clock-time-ampm"))
    } else if (style === "cool") {
      clockTargets.push(clockElement.querySelector(".cool-time"))
    } else if (style === "sidestyle") {
      clockTargets.push(clockElement.querySelector(".clock-sidestyle-time"))
    } else if (style === "jp-style") {
      clockTargets.push(clockElement.querySelector(".clock-jp-time"))
    } else if (style === "sidebar") {
      clockTargets.push(clockElement.querySelector(".clock-sidebar-time"))
    } else if (style === "fliqlo") {
      clockTargets.push(clockElement.querySelector(".fliqlo-time"))
    }
  }

  // 2. Determine targets for Date effect
  const dateTargets = []
  if (mode === "date" || mode === "both") {
    // In Weekday-only mode OR Weekday-style, the weekday is always in dateElement
    if (displayMode === "weekday" || style === "weekday-style") {
      dateTargets.push(dateElement)
    } else {
      if (
        style === "default" ||
        style === "glow" ||
        style === "minimal" ||
        style === "glass"
      ) {
        dateTargets.push(dateElement)
      } else if (style === "round" || style === "square") {
        dateTargets.push(clockElement.querySelector(".clock-date-secondary"))
      } else if (style === "cool") {
        dateTargets.push(clockElement.querySelector(".cool-dayname"))
        dateTargets.push(clockElement.querySelector(".cool-date"))
      } else if (style === "sidestyle") {
        dateTargets.push(clockElement.querySelector(".clock-sidestyle-day"))
        dateTargets.push(clockElement.querySelector(".clock-sidestyle-date"))
      } else if (style === "jp-style") {
        dateTargets.push(clockElement.querySelector(".clock-jp-day-left"))
        dateTargets.push(clockElement.querySelector(".clock-jp-date"))
      } else if (style === "sidebar") {
        dateTargets.push(clockElement.querySelector(".clock-sidebar-date"))
      } else if (style === "fliqlo") {
        dateTargets.push(clockElement.querySelector(".fliqlo-date"))
      }
    }
  }

  // Apply effect to filtered valid targets
  clockTargets
    .filter((el) => el !== null)
    .forEach((el) => applyHuePerCharacter(el, 18))
  dateTargets
    .filter((el) => el !== null)
    .forEach((el) => applyHuePerCharacter(el, 198))
}

function formatViShortWeekday(str) {
  if (!str) return str
  return str
    .replace(/Thứ Hai/gi, "HAI")
    .replace(/Thứ Ba/gi, "BA")
    .replace(/Thứ Tư/gi, "TƯ")
    .replace(/Thứ Năm/gi, "NĂM")
    .replace(/Thứ Sáu/gi, "SÁU")
    .replace(/Thứ Bảy/gi, "BẢY")
    .replace(/Chủ Nhật/gi, "CN")
}

function getSafeWeekday(date, lang, isShort, tz) {
  const format = isShort && lang !== "vi-VN" ? "short" : "long"
  let str = date.toLocaleDateString(lang, { weekday: format, timeZone: tz })
  if (isShort && lang === "vi-VN") {
    str = formatViShortWeekday(str)
  }
  return `<span class="weekday-part">${str}</span>`
}

function getCustomDateString(now, langCode, tz, settings, formatOverride) {
  const format = formatOverride || settings.dateFormat || "full"
  let dateString = ""

  if (format === "short") {
    dateString = now.toLocaleDateString("en-GB", { timeZone: tz })
  } else if (format === "us") {
    dateString = now.toLocaleDateString("en-US", { timeZone: tz })
  } else if (format === "iso") {
    let isoDate = now
    if (tz) isoDate = new Date(now.toLocaleString("en-US", { timeZone: tz }))
    dateString = isoDate.toISOString().split("T")[0]
  } else if (format === "year") {
    let yearDate = now
    if (tz) yearDate = new Date(now.toLocaleString("en-US", { timeZone: tz }))
    dateString = String(yearDate.getFullYear())
  } else if (format === "weekday") {
    dateString = getSafeWeekday(now, langCode, settings.shortWeekday, tz)
  } else {
    // "full"
    const formatWeekday =
      settings.shortWeekday && langCode !== "vi-VN" ? "short" : "long"
    const weekdayStr = now.toLocaleDateString(langCode, {
      weekday: formatWeekday,
      timeZone: tz,
    })
    const dayMonthYear = now.toLocaleDateString(langCode, {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: tz,
    })

    let finalWeekday = weekdayStr
    if (settings.shortWeekday && langCode === "vi-VN") {
      finalWeekday = formatViShortWeekday(finalWeekday)
    }

    dateString = `<span class="weekday-part"> ${finalWeekday} </span>, ${dayMonthYear}`
  }
  return dateString
}

function _buildSidestyleDateStr(now, langCode, tz, settings) {
  const format = settings.dateFormat || "full"
  let dateStr = ""

  if (format === "full") {
    // Retain the specific layout used originally for "full" sidestyle date
    const enMonths = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]
    if (langCode === "vi-VN") {
      dateStr = now.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: tz,
      })
    } else {
      dateStr = `${now.getDate()} ${enMonths[now.getMonth()]} ${now.getFullYear()}`
    }
  } else {
    dateStr = getCustomDateString(now, langCode, tz, settings)
  }

  return `<div class="clock-sidestyle-date">${dateStr}</div>`
}

export function updateTime() {
  const settings = getSettings()
  const now = new Date()
  const langCode = settings.language === "vi" ? "vi-VN" : "en-US"
  const dateClockStyle = settings.dateClockStyle || "default"

  // TIMER MODE LOGIC
  let isTimer = false
  let timerH = 0, timerM = 0, timerS = 0
  let timerString = ""
  
  if (settings.clockTimerMode && window.activeTimer) {
    isTimer = true
    const timeLeft = window.activeTimer.timeLeft
    timerH = Math.floor(timeLeft / 3600)
    timerM = Math.floor((timeLeft % 3600) / 60)
    timerS = timeLeft % 60
    
    const hhT = timerH.toString().padStart(2, '0')
    const mmT = timerM.toString().padStart(2, '0')
    const ssT = timerS.toString().padStart(2, '0')
    
    if (timerH > 0) {
      timerString = `${hhT}:${mmT}:${ssT}`
    } else {
      timerString = `${mmT}:${ssT}`
    }
  }

  const isFramedClockStyle =
    dateClockStyle === "round" || dateClockStyle === "square"
  const shouldShowDate =
    settings.showDate !== false && settings.showGregorian !== false && !isTimer
  const use12Hour = settings.timeFormat === "12h"
  const tz =
    settings.timezone && settings.timezone !== "local"
      ? settings.timezone
      : undefined
  
  const timeOptions = settings.hideSeconds
    ? { hour12: use12Hour, hour: "2-digit", minute: "2-digit", timeZone: tz }
    : {
        hour12: use12Hour,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: tz,
      }
  
  const timeString = isTimer ? timerString : now.toLocaleTimeString(langCode, timeOptions)

  // Extract time parts for styles that need them
  let hh, mm, ss, ampm = ""
  if (isTimer) {
    hh = timerH.toString().padStart(2, '0')
    mm = timerM.toString().padStart(2, '0')
    ss = timerS.toString().padStart(2, '0')
    ampm = ""
  } else {
    const parts = new Intl.DateTimeFormat(langCode, timeOptions).formatToParts(now)
    hh = parts.find(p => p.type === 'hour')?.value || "00"
    mm = parts.find(p => p.type === 'minute')?.value || "00"
    ss = parts.find(p => p.type === 'second')?.value || ""
    ampm = parts.find(p => p.type === 'dayPeriod')?.value || ""
  }

  // Keep layout stable by toggling visibility class instead of display.
  const displayMode = settings.clockDisplayMode || "all"
  const shouldHideClock = displayMode === "hide" || displayMode === "weekday"
  const keepOnlyWeekday = displayMode === "weekday"

  const clockFadeWrap = document.getElementById("clock-fade-wrap")
  if (clockFadeWrap) {
    clockFadeWrap.classList.toggle("is-hidden", shouldHideClock)
  }

  if (!isFramedClockStyle) {
    document.body.classList.remove("framed-theme-light", "framed-theme-dark")
  }

  if (dateClockStyle === "analog") {
    const hours = isTimer ? (timerH % 12) : (parseInt(hh) % 12)
    const minutes = isTimer ? timerM : parseInt(mm)
    const seconds = isTimer ? timerS : (parseInt(ss) || 0)
    const markerMode = settings.analogMarkerMode || "quarters"
    const hourRotation = hours * 30 + minutes * 0.5
    const minuteRotation = minutes * 6 + seconds * 0.1
    const secondRotation = seconds * 6
    const secondClass = settings.hideSeconds ? " no-seconds" : ""
    let markerHtml = ""

    if (markerMode === "full") {
      markerHtml = Array.from({ length: 12 }, (_, index) => {
        const value = index + 1
        const angle = (value % 12) * 30
        const rad = (angle * Math.PI) / 180
        const radius = 42
        const x = 50 + radius * Math.sin(rad)
        const y = 50 - radius * Math.cos(rad)
        return `<span class="analog-marker analog-marker-full" style="--x:${x}%; --y:${y}%">${value}</span>`
      }).join("")
    } else if (markerMode === "quarterTicks") {
      markerHtml = `
        <span class="analog-quarter-tick tick-12"></span>
        <span class="analog-quarter-tick tick-3"></span>
        <span class="analog-quarter-tick tick-6"></span>
        <span class="analog-quarter-tick tick-9"></span>
      `
    } else if (markerMode === "ticks12") {
      markerHtml = Array.from({ length: 12 }, (_, index) => {
        const radius = 45 // percentage distance from center
        const angle = index * 30 // 0, 30, 60...
        const rad = (angle * Math.PI) / 180
        const x = 50 + radius * Math.sin(rad)
        const y = 50 - radius * Math.cos(rad)
        const isQuarter = index % 3 === 0
        const w = isQuarter ? 2 : 1
        const h = isQuarter ? 14 : 8
        return `<span class="analog-quarter-tick" style="position: absolute; left: ${x}%; top: ${y}%; transform: translate(-50%, -50%) rotate(${angle}deg); width: ${w}px; height: ${h}px; z-index: 1;"></span>`
      }).join("")
    } else if (markerMode === "quarters") {
      markerHtml = `
        <span class="analog-marker marker-12">12</span>
        <span class="analog-marker marker-3">3</span>
        <span class="analog-marker marker-6">6</span>
        <span class="analog-marker marker-9">9</span>
      `
    }

    clockElement.innerHTML = `
      <div class="analog-clock marker-mode-${markerMode}${secondClass}">
        ${markerHtml}
        <div class="analog-hand hour" style="--rotation:${hourRotation}deg"></div>
        <div class="analog-hand minute" style="--rotation:${minuteRotation}deg"></div>
        <div class="analog-hand second" style="--rotation:${secondRotation}deg"></div>
        <div class="analog-center-dot"></div>
      </div>
    `
  } else if (dateClockStyle === "cool") {
    const hour24 = isTimer ? timerH : now.getHours()

    let greetingKey = "greeting_evening"
    if (hour24 < 12) greetingKey = "greeting_morning"
    else if (hour24 < 18) greetingKey = "greeting_afternoon"

    const i18n = geti18n()
    const greeting = isTimer ? (geti18n()["quick_access_timer"] || "Timer") : (i18n[greetingKey] || "Hello")

    const dayName = getSafeWeekday(now, langCode, settings.shortWeekday, tz)
    const format = settings.dateFormat || "full"
    let dateHtml = ""
    if (format === "full") {
      const day = now.toLocaleDateString(langCode, {
        day: "2-digit",
        timeZone: tz,
      })
      const monthName = now.toLocaleDateString(langCode, {
        month: "long",
        timeZone: tz,
      })
      dateHtml = `${day} - ${monthName}`
    } else {
      dateHtml = getCustomDateString(now, langCode, tz, settings)
    }

    clockElement.innerHTML = `
      <div class="cool-style-wrapper">
        <div class="cool-bar">|</div>
        <div class="cool-greeting">${greeting}</div>
        ${
          shouldShowDate
            ? `
          <div class="cool-dayname">${dayName}</div>
          <div class="cool-date">${dateHtml}</div>
        `
            : ""
        }
        <div class="cool-time">${timeString}</div>
        <div class="cool-bar">|</div>
      </div>
    `
  } else if (dateClockStyle === "sidestyle") {
    let finalTimeStr = timeString
    if (settings.sidestyleAlign === "center" && settings.sidestyleNoBorder) {
      finalTimeStr = `- ${timeString} -`
    }

    const dayName = getSafeWeekday(
      now,
      langCode,
      settings.shortWeekday,
      tz,
    ).toUpperCase()

    clockElement.innerHTML = `
      <div class="clock-sidestyle">
        <div class="clock-sidestyle-day">${isTimer ? "COUNTDOWN" : dayName}</div>
        ${shouldShowDate ? _buildSidestyleDateStr(now, langCode, tz, settings) : ""}
        <div class="clock-sidestyle-time">${finalTimeStr}</div>
      </div>
    `
  } else if (dateClockStyle === "jp-style") {
    const jpLangOption = settings.jpStyleLanguage || "auto"
    const displayLang = jpLangOption === "ja" ? "ja-JP" : langCode
    
    let dayName = ""
    if (isTimer) {
      dayName = "TIMER"
    } else if (jpLangOption === "ja") {
      const jpDays = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"]
      dayName = settings.shortWeekday ? jpDays[now.getDay()].replace("曜日", "") : jpDays[now.getDay()]
    } else {
      dayName = getSafeWeekday(now, displayLang, settings.shortWeekday, tz).toUpperCase()
    }

    const month = (now.getMonth() + 1).toString().padStart(2, "0")
    const dayNum = now.getDate().toString().padStart(2, "0")

    const format = settings.dateFormat || "full"
    let dateHtml = ""

    if (format === "full") {
      if (displayLang === "ja-JP") {
        dateHtml = `<span class="clock-jp-month">${month}</span><span class="jp-symbol">月</span><span class="clock-jp-daynum">${dayNum}</span><span class="jp-symbol">日</span>`
      } else if (displayLang === "vi-VN") {
        dateHtml = `<span class="clock-jp-daynum" style="margin-right: 0.5em;">Ngày ${dayNum}</span><span class="clock-jp-month">Thg ${month}</span>`
      } else {
        const enMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        dateHtml = `<span class="clock-jp-month">${enMonths[now.getMonth()]}</span><span class="jp-symbol"> - </span><span class="clock-jp-daynum">${dayNum}</span>`
      }
    } else {
      dateHtml = `<span class="clock-jp-month" style="font-size: 0.85em; font-weight: normal;">${getCustomDateString(now, displayLang, tz, settings)}</span>`
    }

    clockElement.innerHTML = `
      <div class="clock-jp-style">
        <div class="clock-jp-row">
            <span class="clock-jp-day-left">${dayName}</span>
            <div class="clock-jp-col">
                <span class="clock-jp-time">${timeString}</span>
                ${shouldShowDate ? `<span class="clock-jp-date">${dateHtml}</span>` : ""}
            </div>
        </div>
      </div>
    `
  } else if (dateClockStyle === "round") {
    const day = now.getDate().toString().padStart(2, "0")
    const month = (now.getMonth() + 1).toString().padStart(2, "0")
    const year = new Date(now.toLocaleString("en-US", { timeZone: tz })).getFullYear()
    const weekday = getSafeWeekday(now, langCode, settings.shortWeekday, tz)

    const theme = settings.framedClockTheme || "light"
    document.body.classList.remove("framed-theme-light", "framed-theme-dark")
    document.body.classList.add(`framed-theme-${theme}`)

    clockElement.innerHTML = `
      <div class="round-clock-new-layout">
        <div class="round-clock-notch">
          <span class="round-clock-date-top">${isTimer ? "TIMER" : `${day}/${month}`}</span>
        </div>
        <div class="round-clock-center">
          <div class="round-clock-time-row">
            <span class="round-clock-hhmm">${hh}:${mm}</span>
            <div class="round-clock-side-meta">
              <span class="round-clock-ampm-top">${ampm}</span>
              ${ss ? `<span class="round-clock-ss-bottom">${ss}</span>` : ""}
            </div>
          </div>
          <div class="round-clock-bottom-info">
            <span class="round-clock-footer-text">${isTimer ? "COUNTDOWN" : `${year} - ${weekday}`}</span>
          </div>
        </div>
      </div>
    `
  } else if (dateClockStyle === "square") {
    const day = now.getDate().toString().padStart(2, "0")
    const month = (now.getMonth() + 1).toString().padStart(2, "0")
    const year = new Date(now.toLocaleString("en-US", { timeZone: tz })).getFullYear()
    const weekday = getSafeWeekday(now, langCode, settings.shortWeekday, tz)

    const theme = settings.framedClockTheme || "light"
    document.body.classList.remove("framed-theme-light", "framed-theme-dark")
    document.body.classList.add(`framed-theme-${theme}`)

    clockElement.innerHTML = `
      <div class="square-clock-bold-layout">
        <div class="sq-top-row">
          <span class="sq-date-val">${isTimer ? "TIMER" : `${day} / ${month}`}</span>
        </div>
        <div class="sq-main-row">
          <span class="sq-time-hhmm">${hh}:${mm}</span>
          <div class="sq-side-info">
            <span class="sq-ampm">${ampm}</span>
            ${ss ? `<span class="sq-ss">${ss}</span>` : ""}
          </div>
        </div>
        <div class="sq-bottom-row">
          <span class="sq-full-date">${isTimer ? "COUNTDOWN" : `${weekday.toUpperCase()} - ${year}`}</span>
        </div>
      </div>
    `
  } else if (dateClockStyle === "sidebar") {
    if (settings.sidebarClockFlip) {
      const dateParts = new Intl.DateTimeFormat(langCode, { day: "numeric", month: "short", year: "numeric", timeZone: tz }).formatToParts(now).filter(p => p.type !== 'literal')
      const dVal = dateParts.find(p => p.type === 'day')?.value || ""
      const mVal = dateParts.find(p => p.type === 'month')?.value || ""
      const yVal = dateParts.find(p => p.type === 'year')?.value || ""

      clockElement.innerHTML = `
        <div class="clock-sidebar-style is-flipped">
          <div class="clock-sidebar-time">
            ${isTimer ? `<div class="clock-sidebar-unit">TMR</div>` : `
              ${dVal ? `<div class="clock-sidebar-unit">${dVal}</div>` : ""}
              ${mVal ? `<div class="clock-sidebar-unit" style="font-size: 0.6em; text-transform: uppercase;">${mVal}</div>` : ""}
              ${yVal ? `<div class="clock-sidebar-unit" style="font-size: 0.5em; opacity: 0.6;">${yVal}</div>` : ""}
            `}
          </div>
          <div class="clock-sidebar-date">${timeString}</div>
        </div>
      `
    } else {
      const dateHtml = shouldShowDate ? `<div class="clock-sidebar-date">${getCustomDateString(now, langCode, tz, settings)}</div>` : ""
      clockElement.innerHTML = `
        <div class="clock-sidebar-style">
          <div class="clock-sidebar-time">
            <div class="clock-sidebar-unit clock-sidebar-hour">${hh}</div>
            <div class="clock-sidebar-unit clock-sidebar-minute">${mm}</div>
            ${ss ? `<div class="clock-sidebar-unit clock-sidebar-second">${ss}</div>` : ""}
            ${ampm ? `<div class="clock-sidebar-unit clock-sidebar-ampm">${ampm}</div>` : ""}
          </div>
          ${isTimer ? `<div class="clock-sidebar-date">COUNTDOWN</div>` : dateHtml}
        </div>
      `
    }
  } else if (dateClockStyle === "fliqlo") {
    const fliqloTheme = settings.fliqloTheme || "dark"
    document.body.classList.remove("fliqlo-theme-light", "fliqlo-theme-dark")
    document.body.classList.add(`fliqlo-theme-${fliqloTheme}`)

    if (settings.fliqloZenMode) {
      document.body.classList.add("fliqlo-zen-mode")
    } else {
      document.body.classList.remove("fliqlo-zen-mode")
    }

    document.body.classList.toggle(
      "fliqlo-transparent",
      settings.fliqloTransparent === true,
    )

    // Build flip cards for each digit
    const buildFlipCard = (digit, label) => {
      const prevKey = `_fliqlo_prev_${label}`
      const prev = clockElement[prevKey]
      clockElement[prevKey] = digit
      const changed = prev !== undefined && prev !== digit
      const animClass = changed ? " fliqlo-flip" : ""
      const oldDigit = prev !== undefined ? prev : digit
      return `
        <div class="fliqlo-card${animClass}" data-digit="${label}">
          <div class="fliqlo-card-top"><span>${digit}</span></div>
          <div class="fliqlo-card-bottom"><span>${oldDigit}</span></div>
          <div class="fliqlo-card-flip-top"><span>${oldDigit}</span></div>
          <div class="fliqlo-card-flip-bottom"><span>${digit}</span></div>
        </div>
      `
    }

    const hhCards = hh.split("").map((d, i) => buildFlipCard(d, `h${i}`)).join("")
    const mmCards = mm.split("").map((d, i) => buildFlipCard(d, `m${i}`)).join("")
    let ssHtml = ""
    if (ss) {
      ssHtml = `
        <span class="fliqlo-colon">:</span>
        <div class="fliqlo-group fliqlo-group-ss">
          ${ss.split("").map((d, i) => buildFlipCard(d, `s${i}`)).join("")}
        </div>
      `
    }
    let ampmHtml = ampm ? `<span class="fliqlo-ampm">${ampm}</span>` : ""

    const dateStr = shouldShowDate ? `<div class="fliqlo-date">${getCustomDateString(now, langCode, tz, settings)}</div>` : ""

    clockElement.innerHTML = `
      <div class="fliqlo-wrapper">
        <div class="fliqlo-time">
          <div class="fliqlo-group">${hhCards}</div>
          <span class="fliqlo-colon">:</span>
          <div class="fliqlo-group">${mmCards}</div>
          ${ssHtml}
          ${ampmHtml}
        </div>
        ${isTimer ? `<div class="fliqlo-date">COUNTDOWN</div>` : dateStr}
      </div>
    `
  } else if (dateClockStyle === "cyber-pulse") {
    const dateStr = shouldShowDate ? getCustomDateString(now, langCode, tz, settings) : ""
    let cyberRoot = clockElement.querySelector(".cyber-pulse-clock")
    if (!cyberRoot) {
      clockElement.innerHTML = `
        <div class="cyber-pulse-clock">
          <div class="cyber-time-wrap">
            <span class="cyber-hh">${hh}</span>
            <div class="cyber-divider"><div class="cyber-pulse-line"></div></div>
            <span class="cyber-mm">${mm}</span>
            <span class="cyber-ss">${ss}</span>
            <span class="cyber-ampm">${ampm}</span>
          </div>
          <div class="cyber-date">${isTimer ? "COUNTDOWN" : dateStr}</div>
        </div>
      `
      cyberRoot = clockElement.querySelector(".cyber-pulse-clock")
    }

    const hhEl = cyberRoot.querySelector(".cyber-hh")
    if (hhEl && hhEl.textContent !== hh) hhEl.textContent = hh
    const mmEl = cyberRoot.querySelector(".cyber-mm")
    if (mmEl && mmEl.textContent !== mm) mmEl.textContent = mm
    const ssEl = cyberRoot.querySelector(".cyber-ss")
    if (ssEl) {
      if (ssEl.textContent !== ss) ssEl.textContent = ss
      ssEl.style.display = ss ? "inline-block" : "none"
    }
    const ampmEl = cyberRoot.querySelector(".cyber-ampm")
    if (ampmEl) {
      if (ampmEl.textContent !== ampm) ampmEl.textContent = ampm
      ampmEl.style.display = ampm ? "inline-block" : "none"
    }
    const dateEl = cyberRoot.querySelector(".cyber-date")
    if (dateEl) {
      const dTxt = isTimer ? "COUNTDOWN" : dateStr
      if (dateEl.innerHTML !== dTxt) dateEl.innerHTML = dTxt
      dateEl.style.display = dTxt ? "block" : "none"
    }
  } else {
    clockElement.textContent = timeString
  }

  let dateString = ""
  const priority = settings.clockDatePriority === "date" ? "date" : "none"
  const selectedFormat = settings.dateFormat || "full"
  const format =
    priority === "date" && selectedFormat === "full"
      ? "weekday"
      : selectedFormat

  // Handle Date logic considering Timezone
  if (isFramedClockStyle) {
    const dayMonth = now.toLocaleDateString(langCode, {
      day: "2-digit",
      month: "long",
      timeZone: tz,
    })
    dateString = dayMonth
  } else {
    dateString = getCustomDateString(now, langCode, tz, settings, format)
  }

  // Handle date visibility - check both showDate (removed, default true) AND showGregorian
  const finalShouldShowDate = settings.showGregorian !== false

  // Determine if we should show the standard date element
  const isSpecialStyle = [
    "cool",
    "sidestyle",
    "jp-style",
    "sidebar",
    "weekday-style",
    "fliqlo",
    "cyber-pulse",
  ].includes(dateClockStyle)

  const dateFadeWrap = document.getElementById("date-fade-wrap")
  if (dateFadeWrap) {
    dateFadeWrap.classList.toggle(
      "is-hidden",
      !finalShouldShowDate || (isSpecialStyle && !keepOnlyWeekday),
    )
  }

  if (keepOnlyWeekday || dateClockStyle === "weekday-style") {
    // FORCE ONLY WEEKDAY for ALL styles including special ones
    let weekdayStr = getSafeWeekday(now, langCode, settings.shortWeekday, tz)
    // For weekday-style, force uppercase
    if (dateClockStyle === "weekday-style") {
      weekdayStr = weekdayStr.toUpperCase()
    }
    dateElement.innerHTML = `<span class="clock-date-primary">${weekdayStr}</span>`
    // Clear clock element just in case to be sure no time is leaking
    if (isSpecialStyle) {
      clockElement.innerHTML = ""
      clockElement.textContent = ""
    }
  } else if (isSpecialStyle) {
    // Normal special style logic: standard date element is empty, clock element has everything
    dateElement.innerHTML = ""
    dateElement.textContent = ""
  } else if (isFramedClockStyle) {
    dateElement.innerHTML = `<span class="clock-date-primary">${dateString || ""}</span>`
  } else {
    dateElement.innerHTML = dateString
  }

  applyHueMode(settings)

  document.body.classList.remove("time-priority-none", "time-priority-date")
  document.body.classList.add(`time-priority-${priority}`)

  const outerContainer = document.getElementById("clock-date-wrap")
  if (outerContainer && clockFadeWrap && dateFadeWrap) {
    const isHiddenTimerRunning =
      settings.timerIsRunning === true && 
      settings.showTimer !== true && 
      settings.clockTimerMode !== true
    outerContainer.classList.toggle("timer-running-hidden", isHiddenTimerRunning)

    if (isFramedClockStyle || priority === "date") {
      if (outerContainer.firstElementChild !== dateFadeWrap) {
        outerContainer.insertBefore(dateFadeWrap, clockFadeWrap)
      }
    } else {
      if (outerContainer.firstElementChild !== clockFadeWrap) {
        outerContainer.insertBefore(clockFadeWrap, dateFadeWrap)
      }
    }
  }
}

export function initClock() {
  updateTime()
  updateCustomTitle()
  setInterval(updateTime, 1000)

  window.addEventListener("layoutUpdated", (e) => {
    if (
      e.detail.key === "showGregorian" ||
      e.detail.key === "clockDisplayMode" ||
      e.detail.key === "clockTimerMode" ||
      e.detail.key === "hideSeconds" ||
      e.detail.key === "showTimer" ||
      e.detail.key === "timerIsRunning" ||
      e.detail.key === "clockDatePriority" ||
      e.detail.key === "dateFormat" ||
      e.detail.key === "dateClockStyle" ||
      e.detail.key === "jpStyleLanguage" ||
      e.detail.key === "analogMarkerMode" ||
      e.detail.key === "hueTextMode" ||
      e.detail.key === "sidestyleAlign" ||
      e.detail.key === "sidestyleNoBorder" ||
      e.detail.key === "fliqloZenMode" ||
      e.detail.key === "fliqloTransparent" ||
      e.detail.key === "fliqloTheme"
    ) {
      updateTime()
    }
  })
  window.addEventListener("layoutUpdated", (e) => {
    if (
      e.detail.key.startsWith("customTitle") ||
      e.detail.key === "showCustomTitle" ||
      e.detail.key === "freeMoveCustomTitle"
    ) {
      updateCustomTitle()
    }
  })
}

export function updateCustomTitle() {
  const settings = getSettings()
  let el = document.getElementById("custom-title-display")
  if (!el) return

  if (settings.showCustomTitle === false) {
    fadeToggle(el, false, "block")
    return
  } else {
    fadeToggle(el, true, "block")
  }

  const text = settings.customTitleText || ""
  if (!text.trim()) {
    el.innerHTML = ""
    el.dataset.prevText = ""
    return
  }

  const isMulti = settings.customTitleMulticolor === true
  if (
    el.dataset.prevText !== text ||
    el.dataset.prevMulti !== String(isMulti)
  ) {
    el.textContent = text
    if (isMulti) {
      applyHuePerCharacter(el, 42)
    }
    el.dataset.prevText = text
    el.dataset.prevMulti = String(isMulti)
  }

  el.style.color = settings.customTitleColor || "#ffffff"
  el.style.fontSize = (settings.customTitleFontSize || 24) + "px"
  el.style.letterSpacing = (settings.customTitleLetterSpacing || 0) + "px"

  if (settings.customTitleBorderSize > 0) {
    el.style.webkitTextStroke = `${settings.customTitleBorderSize}px ${settings.customTitleBorderColor}`
  } else {
    el.style.webkitTextStroke = ""
  }

  if (settings.customTitleShadowBlur > 0 || settings.customTitleShadowY != 0) {
    el.style.textShadow = `0px ${settings.customTitleShadowY || 0}px ${settings.customTitleShadowBlur || 0}px ${settings.customTitleShadowColor || "#000000"}`
  } else {
    el.style.textShadow = "none"
  }

  makeDraggable(el, "customTitle")
}
