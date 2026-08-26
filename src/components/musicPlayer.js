import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import MusicVisualizer from "./visualizer.js"
import { fadeToggle } from "../utils/dom.js"
import { geti18n } from "../services/i18n.js"

const SOURCE_META = [
  {
    key: "youtube",
    match: (url, source = "") =>
      url.includes("youtube.com") ||
      url.includes("youtu.be") ||
      source === "youtube",
    iconClass: "fa-brands fa-youtube",
    color: "#ff0033",
  },
  {
    key: "spotify",
    match: (url, source = "") =>
      url.includes("spotify.com") || source === "spotify",
    iconClass: "fa-brands fa-spotify",
    color: "#1DB954",
  },
  {
    key: "apple",
    match: (url, source = "") =>
      url.includes("music.apple.com") ||
      url.includes("itunes.apple.com") ||
      source === "apple" ||
      source === "applemusic",
    iconClass: "fa-brands fa-apple",
    color: "#fa243c",
  },
  {
    key: "zingmp3",
    match: (url, source = "") =>
      url.includes("zingmp3.vn") ||
      url.includes("mp3.zing.vn") ||
      source === "zingmp3" ||
      source === "zing",
    label: "Zing mp3",
    color: "#a855f7",
  },
  {
    key: "nhaccuatui",
    match: (url, source = "") =>
      url.includes("nhaccuatui.com") ||
      url.includes("nct.vn") ||
      source === "nhaccuatui" ||
      source === "nct",
    label: "NCT",
    color: "#2f80ed",
  },
  {
    key: "soundcloud",
    match: (url, source = "") =>
      url.includes("soundcloud.com") || source === "soundcloud",
    iconClass: "fa-brands fa-soundcloud",
    color: "#ff5500",
  },
]

function getSourceMeta(data = {}) {
  const url = (data.url || "").toLowerCase()
  const source = String(data.source || "").toLowerCase()
  return SOURCE_META.find((meta) => meta.match(url, source)) || null
}

export class MusicPlayer {
  constructor() {
    const settings = getSettings()
    this.container = null
    this.isVisible = settings.musicPlayerExpanded === true
    this.isPlaying = localStorage.getItem("musicPlayerLastIsPlaying") === "true"
    this.showPlayer = settings.musicPlayerEnabled || false
    this.currentStyle = settings.musicBarStyle || "vinyl"
    this.useDefaultColor = settings.musicPlayerUseDefaultColor !== undefined ? settings.musicPlayerUseDefaultColor : true
    this.sourceIconColorMode = settings.musicSourceIconColorMode || "brand"
    this.pollInterval = null
    this.pollTimeout = null
    this.inactivePollCount = 0
    this.currentThumbnail = ""
    this.visualizer = new MusicVisualizer()
    this._duration = 0
    this._isSeeking = false
    this._lastKnownTime = 0
    this._lastUpdateTimestamp = 0
    this._progressInterval = null
    this._destroyed = false
    this._controlRefreshTimeouts = new Set()
    this._settingsHandler = (e) => {
      if (this._destroyed) return
      const { key, value } = e.detail
      if (key === "musicPlayerEnabled") {
        this.setEnabled(value)
      }
      if (key === "music_bar_style" || key === "musicBarStyle") {
        this.applyMusicStyle(value)
      }
      if (key === "musicPlayerUseDefaultColor") {
        this.useDefaultColor = value
        this.applyMusicStyle(this.currentStyle)
        this.applySourceMeta(this.lastSourceMeta)
      }
      if (key === "musicSourceIconColorMode") {
        this.sourceIconColorMode = value || "brand"
        this.applySourceMeta(this.lastSourceMeta)
      }
      if (key === "accentColor" && !this.useDefaultColor) {
        this.applyMusicStyle(this.currentStyle)
      }
      if (key === "musicPlayerSkin") {
        this.applySkin(value)
      } else if (key === "showQuickAccessBg") {
        this.applySkin()
      }
      if (key === "musicPlayerThumbnailBg") {
        this.applyThumbnailBg(value)
      }
      if (key === "musicPlayerNoShaking") {
        this.applyNoShaking(value)
      }
      if (key === "musicVisualizerCpuSave") {
        this.applyCpuSave(value)
      }
      if (key === "musicRealAudioReactive") {
        this.visualizer.setAudioReactive(value)
        if (value && this.isPlaying) {
          chrome.runtime
            ?.sendMessage?.({ action: "startRealAudioCapture" })
            ?.catch?.(() => {})
        } else if (!value) {
          chrome.runtime
            ?.sendMessage?.({ action: "stopRealAudioCapture" })
            ?.catch?.(() => {})
          this.visualizer.feedFrequencyData(null)
        }
      }
    }
    this._visibilityHandler = () => {
      if (this._destroyed) return
      if (document.visibilityState === "hidden") {
        this.stopPolling()
      } else if (this.showPlayer && this.isVisible) {
        this.startPolling()
        if (this.isPlaying && this.canAnimateVisualizer()) {
          this.disc.classList.add("playing")
          const wrapper = this.container.querySelector(".music-player-wrapper")
          if (wrapper) wrapper.classList.add("playing")
          this.visualizer.start()
        }
      }
    }

    this._messageListener = (request, sender, sendResponse) => {
      if (this._destroyed) return
      if (request.action === "mediaStateUpdatedBroadcast") {
        if (request.state && (request.state.title || request.state.url)) {
          this.inactivePollCount = 0
          this.updateUI(request.state)
        } else {
          this.setInactive()
        }
      }
    }

    this.init()
  }

  init() {
    this.createElements()
    this.setupEventListeners()
    this.applyMusicStyle(this.currentStyle)
    if (!this.showPlayer) {
      this.container.style.display = "none"
    } else {
      this.updateVisibility()
    }

    // Áp dụng Skin và Shaking ban đầu từ cài đặt
    const settings = getSettings()
    if (settings.musicPlayerNoShaking) this.applyNoShaking(true)
    this.container.classList.toggle("music-mini", settings.musicMini === true)
    if (settings.musicPlayerSkin && settings.musicPlayerSkin !== "default") {
      this.applySkin(settings.musicPlayerSkin)
    }
    if (settings.musicPlayerThumbnailBg) {
      this.applyThumbnailBg(true)
    }

    // Strictly apply the saved expansion state
    this.container.classList.toggle("minimized", !this.isVisible)

    this.applyCpuSave(settings.musicVisualizerCpuSave)

    // Only start polling if music player is enabled AND currently visible (expanded)
    if (this.showPlayer && this.isVisible) {
      this.startPolling()
    }
  }

  applySkin(skin) {
    const wrapper = this.container
      ? this.container.querySelector(".music-player-wrapper")
      : document.querySelector("#music-player-container .music-player-wrapper")
    if (!wrapper) return

    const settings = getSettings()

    // If no skin provided, get from settings
    if (!skin) skin = settings.musicPlayerSkin || "default"

    // Xóa tất cả skin classes cũ
    wrapper.classList.remove(
      "skin-gameboy",
      "skin-white-blur",
      "skin-m3-accent",
      "skin-transparent",
      "skin-light-transparent",
      "skin-vertical-card",
      "skin-horizontal-card"
    )
    if (this.container)
      this.container.classList.remove(
        "skin-white-blur",
        "skin-m3-accent",
        "skin-transparent",
        "skin-light-transparent",
        "skin-vertical-card",
        "skin-horizontal-card"
      )

    if (skin !== "default") {
      wrapper.classList.add(`skin-${skin}`)
      if (this.container) this.container.classList.add(`skin-${skin}`)
    }

    if (this.container) {
      this.container.classList.toggle("music-mini", settings.musicMini === true)
    }
  }
  applyNoShaking(disabled) {
    const wrapper = this.container.querySelector(".music-player-wrapper")
    if (!wrapper) return
    if (disabled) {
      wrapper.classList.add("no-shaking")
    } else {
      wrapper.classList.remove("no-shaking")
    }
  }

  applyThumbnailBg(enabled) {
    if (!this.container) return
    const wrapper = this.container.querySelector(".music-player-wrapper")
    if (enabled) {
      if (wrapper) wrapper.classList.add("skin-thumbnail-bg")
      this.container.classList.add("skin-thumbnail-bg")
      if (this.bgBlur && this.currentThumbnail) {
        this.bgBlur.style.backgroundImage = `url("${this.currentThumbnail}")`
      }
    } else {
      if (wrapper) wrapper.classList.remove("skin-thumbnail-bg")
      this.container.classList.remove("skin-thumbnail-bg")
    }
  }

  applyCpuSave(enabled) {
    if (!this.container) return
    this.container.classList.toggle("visualizer-cpu-save", enabled !== false)
  }

  createElements() {
    const i18n = geti18n()
    this.container = document.getElementById("music-player-container")

    if (!this.container) {
      this.container = document.createElement("div")
      this.container.id = "music-player-container"
      this.container.className = `music-player-container minimized drag-handle music-style-${this.currentStyle}`
      document.body.appendChild(this.container)
    } else {
      this.container.className = `music-player-container minimized drag-handle music-style-${this.currentStyle}`
    }

    this.container.innerHTML = `
            <div class="music-player-wrapper">
                <button class="music-close-btn widget-close-btn" id="music-close-btn" title="Close"><i class="fa-solid fa-xmark"></i></button>
                <div class="music-bg-blur" id="music-bg-blur"></div>
                <div class="disc-container">
                    <div id="vinyl-disc" class="vinyl-disc"></div>
                </div>
                <div class="player-main">
                    <div class="player-info">
                        <h3 id="music-title" data-i18n="music_no_media">${i18n.music_no_media || "No Media Playing"}</h3>
                        <p id="music-artist">
                            <i id="platform-icon" class="platform-icon" style="display: none;"></i>
                            <span id="artist-text"></span>
                        </p>
                    </div>
                    <div class="progress-row">
                        <span id="music-current-time" class="progress-time">0:00</span>
                        <div class="progress-bar-track" id="progress-bar-track">
                            <div class="progress-bar-fill" id="progress-bar-fill"></div>
                            <div class="progress-bar-thumb" id="progress-bar-thumb"></div>
                        </div>
                        <span id="music-duration" class="progress-time">0:00</span>
                    </div>
                    <div class="controls-row">
                        <button id="prev-track" class="player-btn"><i class="fa-solid fa-backward-step"></i></button>
                        <button id="play-pause-btn" class="player-btn play-pause-btn"><i class="fa-solid fa-play"></i></button>
                        <button id="next-track" class="player-btn"><i class="fa-solid fa-forward-step"></i></button>
                    </div>
                </div>
            </div>
        `

    this.disc = this.container.querySelector("#vinyl-disc")
    this.titleElement = this.container.querySelector("#music-title")
    this.artistElement = this.container.querySelector("#music-artist")
    this.platformIcon = this.container.querySelector("#platform-icon")
    this.artistText = this.container.querySelector("#artist-text")
    this.bgBlur = this.container.querySelector("#music-bg-blur")
    this.currentTimeEl = this.container.querySelector("#music-current-time")
    this.durationEl = this.container.querySelector("#music-duration")
    this.progressTrack = this.container.querySelector("#progress-bar-track")
    this.progressFill = this.container.querySelector("#progress-bar-fill")
    this.progressThumb = this.container.querySelector("#progress-bar-thumb")

    // Progress bar click to seek
    this.progressTrack.addEventListener("click", (e) => {
      if (!this._duration) return
      const rect = this.progressTrack.getBoundingClientRect()
      const ratio = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      )
      const seekTime = ratio * this._duration
      this._lastKnownTime = seekTime
      this._lastUpdateTimestamp = Date.now()
      this._updateProgressUI(seekTime, this._duration)
      chrome.runtime.sendMessage({
        action: "mediaControl",
        command: { name: "seekTo", time: seekTime },
      })
    })

    // Initialize visualizer
    this.visualizer.init(this.container)

    if (this.isPlaying && this.canAnimateVisualizer()) {
      this.disc.classList.add("playing")
      const wrapper = this.container.querySelector(".music-player-wrapper")
      if (wrapper) wrapper.classList.add("playing")
      this.visualizer.start()
    }
  }

  setupEventListeners() {
    // Toggle is now external via Quick Access/Settings
    this.container.querySelector("#music-close-btn")?.addEventListener("click", (e) => {
      e.stopPropagation()
      updateSetting("musicPlayerEnabled", false)
      saveSettings()
      this.setEnabled(false)
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "musicPlayerEnabled", value: false },
        }),
      )
    })

    document.getElementById("play-pause-btn")?.addEventListener("click", () => {
      this.sendControl("playPause")
    })

    document.getElementById("next-track").addEventListener("click", () => {
      this.sendControl("next")
    })

    document.getElementById("prev-track").addEventListener("click", () => {
      this.sendControl("prev")
    })

    window.addEventListener("settingsUpdated", this._settingsHandler)

    document.addEventListener("visibilitychange", this._visibilityHandler)

    chrome.runtime.onMessage.addListener(this._messageListener)
  }

  applyMusicStyle(styleName) {
    // Remove old style class
    this.container.classList.remove(`music-style-${this.currentStyle}`)

    this.currentStyle = styleName

    // Add new style class
    this.container.classList.add(`music-style-${this.currentStyle}`)

    // Determine accent color
    this.container.style.removeProperty("--music-player-bg")
    this.container.classList.remove("thumbnail-color-mode")
    if (
      this.useDefaultColor === "thumbnail" ||
      this.useDefaultColor === "thumbnail-dynamic"
    ) {
      if (this.currentThumbnail) {
        this.applyThumbnailColor(this.currentThumbnail)
      } else {
        this._stopDynamicColorLoop()
        this.container.style.removeProperty("--accent-color")
        this.container.style.removeProperty("--accent-color-rgb")
      }
    } else if (this.useDefaultColor === "rgb-flow") {
      this._startRgbFlowLoop()
    } else if (this.useDefaultColor === true) {
      this._stopDynamicColorLoop()
      let accentColor = ""
      switch (styleName) {
        case "spotify":
          accentColor = "#1DB954"
          break
        case "apple":
          accentColor = "#fa243c"
          break
        case "soundcloud":
          accentColor = "#ff5500"
          break
        case "neon":
          accentColor = "#00f0ff"
          break
        case "orbit":
          accentColor = "#64f4d2"
          break
        case "cassette":
          accentColor = "#7ecf6a"
          break
        case "pixel":
          accentColor = "#ffffff"
          break
        case "moon8":
          accentColor = "#fff9c4"
          break
        case "heartbeat":
          accentColor = "#ff4d4d"
          break
        case "terminal":
          accentColor = "#00ff41" // Classic terminal green
          break
        case "forest":
          accentColor = "#4caf50"
          break
        case "beach":
          accentColor = "#b3e5fc"
          break
        default:
          accentColor = "rgba(30, 215, 96, 0.8)" // Default vinyl/greenish
      }

      if (accentColor) {
        this.container.style.setProperty("--accent-color", accentColor)
        // Also set RGB version for semi-transparent uses if needed
        // Handle hex, rgb, or rgba
        let r = 30,
          g = 215,
          b = 96
        if (accentColor.startsWith("#")) {
          r = parseInt(accentColor.slice(1, 3), 16) || 0
          g = parseInt(accentColor.slice(3, 5), 16) || 0
          b = parseInt(accentColor.slice(5, 7), 16) || 0
        } else if (accentColor.startsWith("rgb")) {
          const matches = accentColor.match(/\d+/g)
          if (matches) {
            r = matches[0]
            g = matches[1]
            b = matches[2]
          }
        }
        this.container.style.setProperty(
          "--accent-color-rgb",
          `${r}, ${g}, ${b}`,
        )
      }
    } else {
      // Remove local overrides so it inherits the dynamically updating global accent color
      this.container.style.removeProperty("--accent-color")
      this.container.style.removeProperty("--accent-color-rgb")
    }

    this.applySkin()

    // Update visualizer style after classes and styling are applied
    if (this.visualizer) {
      this.visualizer.setStyle(this.currentStyle)
    }
  }

  _rgbToHsl(r, g, b) {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b)
    let h = 0,
      s = 0,
      l = (max + min) / 2
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
          break
        case g:
          h = ((b - r) / d + 2) / 6
          break
        case b:
          h = ((r - g) / d + 4) / 6
          break
      }
    }
    return [h, s, l]
  }

  _hslToRgb(h, s, l) {
    let r, g, b
    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }
    return [
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255),
    ]
  }

  _stopDynamicColorLoop() {
    if (this._dynamicColorAnimId) {
      cancelAnimationFrame(this._dynamicColorAnimId)
      this._dynamicColorAnimId = null
    }
  }

  _startRgbFlowLoop() {
    this._stopDynamicColorLoop()
    let lastTs = performance.now()
    let currentHue = 0

    const loop = (ts) => {
      if (
        this._destroyed ||
        this.useDefaultColor !== "rgb-flow" ||
        !this.container
      ) {
        this._dynamicColorAnimId = null
        return
      }

      const dt = Math.min((ts - lastTs) / 1000, 0.1)
      lastTs = ts

      // Smooth full 360° rainbow hue cycle every 7 seconds
      currentHue = (currentHue + dt * 52) % 360

      const [r, g, b] = this._hslToRgb(currentHue / 360, 0.96, 0.54)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      const contrastColor = luminance > 0.55 ? "#0a0e17" : "#ffffff"

      this.container.style.setProperty(
        "--accent-color",
        `rgb(${r}, ${g}, ${b})`,
      )
      this.container.style.setProperty(
        "--accent-color-rgb",
        `${r}, ${g}, ${b}`,
      )
      this.container.style.setProperty(
        "--accent-contrast-color",
        contrastColor,
      )
      this.container.style.setProperty(
        "--music-player-bg",
        `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.45) 0%, rgba(${r}, ${g}, ${b}, 0.15) 100%)`,
      )
      this.container.classList.add("thumbnail-color-mode")

      if (this.visualizer) {
        this.visualizer.cachedAccent = `rgb(${r}, ${g}, ${b})`
      }

      this._dynamicColorAnimId = requestAnimationFrame(loop)
    }

    this._dynamicColorAnimId = requestAnimationFrame(loop)
  }

  _startDynamicColorLoop() {
    this._stopDynamicColorLoop()
    if (!this._thumbnailPalette || this._thumbnailPalette.length < 2) return

    let lastTs = performance.now()
    let morphProgress = 0
    let fromIdx = 0

    const morphDuration = 3.2 // Seconds per color transition

    const loop = (ts) => {
      if (
        this._destroyed ||
        this.useDefaultColor !== "thumbnail-dynamic" ||
        !this.container
      ) {
        this._dynamicColorAnimId = null
        return
      }

      const dt = Math.min((ts - lastTs) / 1000, 0.1)
      lastTs = ts

      morphProgress += dt / morphDuration
      if (morphProgress >= 1.0) {
        morphProgress = 0
        fromIdx = (fromIdx + 1) % this._thumbnailPalette.length
      }

      const toIdx = (fromIdx + 1) % this._thumbnailPalette.length
      const c1 = this._thumbnailPalette[fromIdx]
      const c2 = this._thumbnailPalette[toIdx]

      // Smooth cosine easing
      const ease = 0.5 - 0.5 * Math.cos(morphProgress * Math.PI)

      const curR = Math.round(c1.r + (c2.r - c1.r) * ease)
      const curG = Math.round(c1.g + (c2.g - c1.g) * ease)
      const curB = Math.round(c1.b + (c2.b - c1.b) * ease)

      const luminance = (0.299 * curR + 0.587 * curG + 0.114 * curB) / 255
      const contrastColor = luminance > 0.55 ? "#0a0e17" : "#ffffff"

      this.container.style.setProperty(
        "--accent-color",
        `rgb(${curR}, ${curG}, ${curB})`,
      )
      this.container.style.setProperty(
        "--accent-color-rgb",
        `${curR}, ${curG}, ${curB}`,
      )
      this.container.style.setProperty(
        "--accent-contrast-color",
        contrastColor,
      )
      this.container.style.setProperty(
        "--music-player-bg",
        `linear-gradient(135deg, rgba(${curR}, ${curG}, ${curB}, 0.45) 0%, rgba(${curR}, ${curG}, ${curB}, 0.15) 100%)`,
      )
      this.container.classList.add("thumbnail-color-mode")

      if (this.visualizer) {
        this.visualizer.cachedAccent = `rgb(${curR}, ${curG}, ${curB})`
      }

      this._dynamicColorAnimId = requestAnimationFrame(loop)
    }

    this._dynamicColorAnimId = requestAnimationFrame(loop)
  }

  async applyThumbnailColor(url) {
    if (!url || !this.container) return

    const parsePixels = (data) => {
      if (!data || data.length === 0) return

      // 16 Hue sectors (22.5° each) for distinct color detection
      const sectors = new Array(16).fill(0).map(() => ({
        count: 0,
        totalWeight: 0,
        r: 0,
        g: 0,
        b: 0,
      }))
      let fallbackR = 0,
        fallbackG = 0,
        fallbackB = 0,
        fallbackCount = 0

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3]
        if (a < 128) continue
        const pr = data[i],
          pg = data[i + 1],
          pb = data[i + 2]
        fallbackR += pr
        fallbackG += pg
        fallbackB += pb
        fallbackCount++

        const [h, s, l] = this._rgbToHsl(pr, pg, pb)
        if (l < 0.08 || l > 0.94) continue
        if (s < 0.14) continue

        const sectorIdx = Math.min(15, Math.floor(h * 16))
        const weight = Math.pow(s, 1.5) * (1 - Math.abs(l - 0.55) * 1.3)
        const sec = sectors[sectorIdx]
        sec.count++
        sec.totalWeight += weight
        sec.r += pr * weight
        sec.g += pg * weight
        sec.b += pb * weight
      }

      // Sort sectors by total vibrancy weight
      const validSectors = sectors
        .map((sec, idx) => {
          if (sec.totalWeight <= 0) return null
          return {
            sectorIdx: idx,
            hCenter: (idx + 0.5) / 16,
            score: sec.totalWeight,
            r: sec.r / sec.totalWeight,
            g: sec.g / sec.totalWeight,
            b: sec.b / sec.totalWeight,
          }
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)

      const palette = []
      for (const vs of validSectors) {
        let [h, s, l] = this._rgbToHsl(vs.r, vs.g, vs.b)
        // Ensure hue distance of at least 40° between palette entries
        const isFar = palette.every((p) => {
          const diff = Math.abs(p.h - h)
          return Math.min(diff, 1 - diff) >= 0.075
        })
        if (isFar || palette.length === 0) {
          // Boost saturation & lightness for high-voltage vivid aesthetic
          s = Math.min(1.0, Math.max(0.78, s * 1.4))
          l = Math.min(0.68, Math.max(0.5, l * 1.1))
          const [finalR, finalG, finalB] = this._hslToRgb(h, s, l)
          palette.push({ r: finalR, g: finalG, b: finalB, h, s, l })
          if (palette.length >= 6) break
        }
      }

      // Generate harmonious palette if artwork is monochromatic
      if (palette.length === 1) {
        const base = palette[0]
        const h2 = (base.h + 0.14) % 1
        const [r2, g2, b2] = this._hslToRgb(h2, base.s, base.l)
        palette.push({ r: r2, g: g2, b: b2, h: h2, s: base.s, l: base.l })

        const h3 = (base.h + 0.3) % 1
        const [r3, g3, b3] = this._hslToRgb(h3, base.s, base.l)
        palette.push({ r: r3, g: g3, b: b3, h: h3, s: base.s, l: base.l })
      } else if (palette.length === 0 && fallbackCount > 0) {
        let [h, s, l] = this._rgbToHsl(
          fallbackR / fallbackCount,
          fallbackG / fallbackCount,
          fallbackB / fallbackCount,
        )
        s = Math.min(1.0, Math.max(0.7, s * 1.5))
        l = Math.min(0.68, Math.max(0.5, l))
        const [finalR, finalG, finalB] = this._hslToRgb(h, s, l)
        palette.push({ r: finalR, g: finalG, b: finalB, h, s, l })
        const h2 = (h + 0.18) % 1
        const [r2, g2, b2] = this._hslToRgb(h2, s, l)
        palette.push({ r: r2, g: g2, b: b2, h: h2, s, l })
      }

      this._thumbnailPalette = palette

      if (this.useDefaultColor === "thumbnail-dynamic") {
        this._startDynamicColorLoop()
      } else if (this.useDefaultColor === "thumbnail") {
        this._stopDynamicColorLoop()
        if (palette.length > 0) {
          const dominant = palette[0]
          const finalR = dominant.r,
            finalG = dominant.g,
            finalB = dominant.b
          const luminance =
            (0.299 * finalR + 0.587 * finalG + 0.114 * finalB) / 255
          const contrastColor = luminance > 0.55 ? "#0a0e17" : "#ffffff"

          this.container.style.setProperty(
            "--accent-color",
            `rgb(${finalR}, ${finalG}, ${finalB})`,
          )
          this.container.style.setProperty(
            "--accent-color-rgb",
            `${finalR}, ${finalG}, ${finalB}`,
          )
          this.container.style.setProperty(
            "--accent-contrast-color",
            contrastColor,
          )
          this.container.style.setProperty(
            "--music-player-bg",
            `linear-gradient(135deg, rgba(${finalR}, ${finalG}, ${finalB}, 0.45) 0%, rgba(${finalR}, ${finalG}, ${finalB}, 0.15) 100%)`,
          )
          this.container.classList.add("thumbnail-color-mode")

          if (this.visualizer) {
            this.visualizer.cachedAccent = `rgb(${finalR}, ${finalG}, ${finalB})`
            this.visualizer.updateDimensions()
          }
        }
      }
    }

    // Try fetch with blob first to completely bypass CORS SecurityError in extension
    try {
      const res = await fetch(url)
      if (res.ok) {
        const blob = await res.blob()
        const bitmap = await createImageBitmap(blob)
        const canvas = document.createElement("canvas")
        const size = 64
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        ctx.drawImage(bitmap, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        parsePixels(data)
        return
      }
    } catch (e) {
      // Fall back to Image element
    }

    const img = new Image()
    img.crossOrigin = "Anonymous"
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        const size = 64
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        parsePixels(data)
      } catch (err) {
        // Ignored
      }
    }
    img.onerror = () => {}
    img.src = url
  }

  startPolling() {
    this.syncMediaState()
    if (!this.pollInterval) {
      this.pollInterval = setInterval(() => {
        if (
          !this._destroyed &&
          this.showPlayer &&
          document.visibilityState === "visible"
        ) {
          this.syncMediaState()
        }
      }, 2000)
    }
  }

  scheduleNextPoll(delay = null) {
    this.syncMediaState()
  }

  fetchMediaState() {
    this.syncMediaState()
  }

  syncMediaState() {
    if (this._destroyed) return
    if (document.visibilityState === "hidden") return
    if (this._mediaStatePending) return
    this._mediaStatePending = true

    try {
      chrome.runtime.sendMessage({ action: "getMediaState" }, (response) => {
        if (this._destroyed) return
        this._mediaStatePending = false
        if (chrome.runtime.lastError) {
          this.setInactive()
          return
        }
        if (response && (response.audible || response.title || (response.url && !response.paused))) {
          this.inactivePollCount = 0
          this.updateUI(response)
        } else {
          this.setInactive()
        }
      })
    } catch (e) {
      this._mediaStatePending = false
      this.setInactive()
    }
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout)
      this.pollTimeout = null
    }
    this.inactivePollCount = 0
    // Stop visualizer and animations when not polling to save resources
    this.disc?.classList.remove("playing")
    this.container
      ?.querySelector(".music-player-wrapper")
      ?.classList.remove("playing")
    if (this.visualizer) this.visualizer.stop()
    this._stopProgressAnimation()
  }

  canAnimateVisualizer() {
    if (!this.showPlayer || !this.isVisible || !this.container) return false
    return !this.container.classList.contains("minimized")
  }

  updateUI(data) {
    const i18n = geti18n()
    this.titleElement.textContent =
      data.title || i18n.music_unknown_title || "Unknown Title"

    window._currentPlayingTrackTitle = data.title || ""

    // Update artist text and platform icon
    const artist = data.artist || i18n.music_unknown_artist || "Unknown Artist"
    this.artistText.textContent = artist

    // Show platform icon based on URL
    const sourceMeta = getSourceMeta(data)
    this.lastSourceMeta = sourceMeta
    this.applySourceMeta(sourceMeta)

    this.isPlaying = !data.paused
    localStorage.setItem("musicPlayerLastIsPlaying", this.isPlaying ? "true" : "false")
    window.dispatchEvent(new CustomEvent("musicPlayingStateChange", { detail: this.isPlaying }))
    window.dispatchEvent(new CustomEvent("musicTrackChange", { detail: { title: data.title || "", artist: artist, isPlaying: this.isPlaying } }))

    const btn = document.getElementById("play-pause-btn")
    if (btn) {
      btn.innerHTML = this.isPlaying
        ? '<i class="fa-solid fa-pause"></i>'
        : '<i class="fa-solid fa-play"></i>'
    }

    const wrapper = this.container.querySelector(".music-player-wrapper")
    const shouldAnimate = this.isPlaying && this.canAnimateVisualizer()
    if (shouldAnimate) {
      this.disc.classList.add("playing")
      if (wrapper) wrapper.classList.add("playing")
      if (!this.visualizer.isPlaying) {
        this.visualizer.start()
      }
      if (getSettings().musicRealAudioReactive === true) {
        chrome.runtime?.sendMessage?.({ action: "startRealAudioCapture" })?.catch?.(() => {})
      }
    } else {
      this.disc.classList.remove("playing")
      if (wrapper) wrapper.classList.remove("playing")
      if (this.visualizer.isPlaying) {
        this.visualizer.stop()
      }
    }

    // Update thumbnail
    if (data.thumbnail && data.thumbnail !== this.currentThumbnail) {
      this.currentThumbnail = data.thumbnail
      const applyThumb = (url) => {
        this.disc.style.backgroundImage = `url("${url}")`
        this.disc.style.backgroundSize = "cover"
        this.disc.style.backgroundPosition = "center"
        this.disc.classList.add("has-thumb")
        if (this.bgBlur) this.bgBlur.style.backgroundImage = `url("${url}")`
        if (
          this.useDefaultColor === "thumbnail" ||
          this.useDefaultColor === "thumbnail-dynamic"
        ) {
          this.applyThumbnailColor(url)
        }
      }
      applyThumb(data.thumbnail)

      // Fallback for rare YouTube videos without maxresdefault
      if (data.thumbnail.includes("maxresdefault.jpg")) {
        const testImg = new Image()
        testImg.onload = () => {
          if (testImg.naturalWidth === 120 && testImg.naturalHeight === 90) {
            const fallback = data.thumbnail.replace(
              "maxresdefault.jpg",
              "hqdefault.jpg",
            )
            applyThumb(fallback)
          }
        }
        testImg.onerror = () => {
          const fallback = data.thumbnail.replace(
            "maxresdefault.jpg",
            "hqdefault.jpg",
          )
          applyThumb(fallback)
        }
        testImg.src = data.thumbnail
      }
    } else if (!data.thumbnail) {
      this.currentThumbnail = ""
      this.disc.style.backgroundImage = "none"
      this.disc.classList.remove("has-thumb")
      if (this.bgBlur) this.bgBlur.style.backgroundImage = "none"
      if (
        this.useDefaultColor === "thumbnail" ||
        this.useDefaultColor === "thumbnail-dynamic"
      ) {
        this._stopDynamicColorLoop()
        this.container.style.removeProperty("--accent-color")
        this.container.style.removeProperty("--accent-color-rgb")
      }
    }

    this._duration =
      typeof data.duration === "number" && data.duration > 0 ? data.duration : 0
    this._lastKnownTime = data.currentTime || 0
    this._lastUpdateTimestamp = Date.now()
    this._updateProgressUI(this._lastKnownTime, this._duration)
    if (shouldAnimate && this._duration > 0) {
      this._startProgressAnimation()
    } else {
      this._stopProgressAnimation()
    }
  }

  _updateProgressUI(currentTime, duration) {
    const fmt = (s) => {
      const m = Math.floor(s / 60)
      const sec = Math.floor(s % 60)
      return `${m}:${sec.toString().padStart(2, "0")}`
    }
    const hasData = duration > 0
    const pct = hasData ? Math.min(100, (currentTime / duration) * 100) : 0
    if (this.currentTimeEl)
      this.currentTimeEl.textContent = hasData ? fmt(currentTime) : "--:--"
    if (this.durationEl)
      this.durationEl.textContent = hasData ? fmt(duration) : "--:--"
    if (this.progressFill) this.progressFill.style.width = `${pct}%`
    if (this.progressThumb) this.progressThumb.style.left = `${pct}%`
    // Show/hide row based on whether live stream (no duration)
    if (this.progressTrack) {
      this.progressTrack.parentElement.style.opacity = hasData ? "1" : "0.35"
    }
  }

  _startProgressAnimation() {
    if (this._progressInterval) return
    this._progressInterval = setInterval(() => {
      if (!this._duration || !this.isPlaying) return
      const elapsed = (Date.now() - this._lastUpdateTimestamp) / 1000
      const estimated = Math.min(this._lastKnownTime + elapsed, this._duration)
      this._updateProgressUI(estimated, this._duration)
    }, 250)
  }

  _stopProgressAnimation() {
    if (this._progressInterval) {
      clearInterval(this._progressInterval)
      this._progressInterval = null
    }
  }

  updateSourceIcon(data) {
    this.applySourceMeta(getSourceMeta(data))
  }

  getSourceIconColor(meta) {
    if (!meta) return ""
    if (this.sourceIconColorMode === "none") return "currentColor"
    if (this.sourceIconColorMode === "accent") return "var(--accent-color)"
    return meta.color || "var(--accent-color)"
  }

  setIconContent(element, meta) {
    element.className = "platform-icon"
    element.textContent = ""
    if (meta.iconClass) {
      element.className = `platform-icon ${meta.iconClass}`
      return
    }
    element.classList.add("music-source-badge")
    element.textContent = meta.label || ""
  }

  applySourceMeta(meta) {
    if (!meta) {
      this.platformIcon.style.display = "none"
      return
    }

    const color = this.getSourceIconColor(meta)
    this.setIconContent(this.platformIcon, meta)
    this.platformIcon.style.display = "inline-flex"
    this.platformIcon.style.color = color
  }

  setInactive() {
    const i18n = geti18n()
    this.titleElement.textContent = i18n.music_no_media || "No Media Playing"
    this.artistText.textContent = ""
    this.platformIcon.style.display = "none"
    this.lastSourceMeta = null
    this.isPlaying = false
    window._currentPlayingTrackTitle = ""
    localStorage.setItem("musicPlayerLastIsPlaying", "false")
    window.dispatchEvent(new CustomEvent("musicPlayingStateChange", { detail: false }))
    window.dispatchEvent(new CustomEvent("musicTrackChange", { detail: { title: "", artist: "", isPlaying: false } }))
    this.disc.classList.remove("playing")
    this.disc.style.backgroundImage = "none"
    this.currentThumbnail = ""
    document.getElementById("play-pause-btn").innerHTML =
      '<i class="fa-solid fa-play"></i>'
    this.visualizer.stop()
    this._stopProgressAnimation()
    this._duration = 0
    this._lastKnownTime = 0
    this._updateProgressUI(0, 0)
  }

  sendControl(command) {
    if (this._destroyed) return
    const commandPayload =
      typeof command === "string"
        ? {
            name: command,
            preferredSource:
              this.lastSourceMeta?.key === "spotify" ||
              this.currentStyle === "spotify"
                ? "spotify"
                : this.lastSourceMeta?.key || "",
          }
        : command
    chrome.runtime.sendMessage({
      action: "mediaControl",
      command: commandPayload,
    })
    ;[120, 450].forEach((delay) => {
      const timeoutId = setTimeout(() => {
        this._controlRefreshTimeouts.delete(timeoutId)
        this.fetchMediaState()
      }, delay)
      this._controlRefreshTimeouts.add(timeoutId)
    })
  }

  togglePlayer() {
    this.isVisible = !this.isVisible
    this.container.classList.toggle("minimized", !this.isVisible)
    updateSetting("musicPlayerExpanded", this.isVisible)
    saveSettings()

    // Control polling based on visibility
    if (this.isVisible) {
      this.startPolling()
      this.fetchMediaState()
    } else {
      this.stopPolling()
    }
  }

  setEnabled(enabled) {
    this.showPlayer = enabled === true
    this.updateVisibility()

    if (this.showPlayer) {
      this.isVisible = true
      this.container.style.display = "block"
      this.container.style.opacity = ""
      this.container.classList.remove("minimized")
      this.startPolling()
      this.fetchMediaState()
      updateSetting("musicPlayerExpanded", true)
      saveSettings()
    } else {
      this.isVisible = false
      this.container.classList.add("minimized")
      this.stopPolling()
      updateSetting("musicPlayerExpanded", false)
      saveSettings()
    }
  }

  updateVisibility() {
    // This handles whether the feature is enabled at all
    this.container.getAnimations().forEach((animation) => animation.cancel())
    fadeToggle(this.container, this.showPlayer, "block")
  }

  destroy() {
    this._destroyed = true
    this.stopPolling()
    this._stopDynamicColorLoop()
    this._controlRefreshTimeouts.forEach((timeoutId) => clearTimeout(timeoutId))
    this._controlRefreshTimeouts.clear()
    window.removeEventListener("settingsUpdated", this._settingsHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
    chrome.runtime.onMessage.removeListener(this._messageListener)
    this.visualizer?.destroy?.()
    this.container?.getAnimations?.().forEach((animation) => animation.cancel())
    this.container?.remove()
    this.container = null
  }
}
