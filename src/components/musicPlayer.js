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
    this.useDefaultColor = settings.musicPlayerUseDefaultColor === true
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
      if (key === "musicPlayerSkin" || key === "showQuickAccessBg") {
        this.applySkin(value)
      }
      if (key === "musicPlayerNoShaking") {
        this.applyNoShaking(value)
      }
      if (key === "musicVisualizerCpuSave") {
        this.applyCpuSave(value)
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
        if (this.showPlayer && this.isVisible) {
          if (request.state && request.state.url) {
            this.inactivePollCount = 0
            this.updateUI(request.state)
          } else {
            this.setInactive()
          }
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
    if (
      ["gameboy", "white-blur", "m3-accent", "transparent"].includes(
        settings.musicPlayerSkin,
      )
    ) {
      this.applySkin(settings.musicPlayerSkin)
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
      "skin-vertical-card"
    )
    if (this.container)
      this.container.classList.remove(
        "skin-white-blur",
        "skin-m3-accent",
        "skin-transparent",
        "skin-light-transparent",
        "skin-vertical-card"
      )

    if (skin === "gameboy") {
      wrapper.classList.add("skin-gameboy")
    } else if (skin === "white-blur") {
      wrapper.classList.add("skin-white-blur")
      if (this.container) this.container.classList.add("skin-white-blur")
    } else if (skin === "m3-accent") {
      wrapper.classList.add("skin-m3-accent")
      if (this.container) this.container.classList.add("skin-m3-accent")
    } else if (skin === "transparent") {
      wrapper.classList.add("skin-transparent")
      if (this.container) this.container.classList.add("skin-transparent")
    } else if (skin === "light-transparent") {
      wrapper.classList.add("skin-light-transparent")
      if (this.container) this.container.classList.add("skin-light-transparent")
    } else if (skin === "vertical-card") {
      wrapper.classList.add("skin-vertical-card")
      if (this.container) this.container.classList.add("skin-vertical-card")
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

    document.getElementById("play-pause-btn").addEventListener("click", () => {
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
    if (this.useDefaultColor) {
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

    // Update visualizer style
    if (this.visualizer) {
      this.visualizer.setStyle(this.currentStyle)
    }
  }

  startPolling() {
    this.syncMediaState()
  }

  scheduleNextPoll(delay = null) {
    // No-op to eliminate background polling
  }

  fetchMediaState() {
    this.syncMediaState()
  }

  syncMediaState() {
    if (this._destroyed) return
    if (!this.showPlayer || !this.isVisible) return
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
        if (response && response.audible) {
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
      this.visualizer.start()
    } else {
      this.disc.classList.remove("playing")
      if (wrapper) wrapper.classList.remove("playing")
      this.visualizer.stop()
    }

    // Update thumbnail
    if (data.thumbnail && data.thumbnail !== this.currentThumbnail) {
      this.currentThumbnail = data.thumbnail
      this.disc.style.backgroundImage = `url(${data.thumbnail})`
      this.disc.style.backgroundSize = "cover"
      this.disc.style.backgroundPosition = "center"
      this.disc.classList.add("has-thumb")
    } else if (!data.thumbnail) {
      this.currentThumbnail = ""
      this.disc.style.backgroundImage = "none"
      this.disc.classList.remove("has-thumb")
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
    }, 1000)
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
    localStorage.setItem("musicPlayerLastIsPlaying", "false")
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
