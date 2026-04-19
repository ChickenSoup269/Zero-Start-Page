import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import MusicVisualizer from "./visualizer.js"

export class MusicPlayer {
  constructor() {
    const settings = getSettings()
    this.container = null
    this.isVisible = settings.musicPlayerExpanded === true
    this.isPlaying = false
    this.showPlayer = settings.musicPlayerEnabled || false
    this.currentStyle = settings.musicBarStyle || "vinyl"
    this.useDefaultColor = settings.musicPlayerUseDefaultColor !== false
    this.pollInterval = null
    this.currentThumbnail = ""
    this.visualizer = new MusicVisualizer()
    this._duration = 0
    this._isSeeking = false
    this._lastKnownTime = 0
    this._lastUpdateTimestamp = 0
    this._progressInterval = null

    this.init()
  }

  init() {
    this.createElements()
    this.setupEventListeners()
    this.applyMusicStyle(this.currentStyle) // Ensure initial style and accent color are applied
    this.updateVisibility()
    // Strictly apply the saved expansion state
    this.container.classList.toggle("minimized", !this.isVisible)

    // Only start polling if music player is enabled AND currently visible (expanded)
    if (this.showPlayer && this.isVisible) {
      this.startPolling()
    }
  }

  createElements() {
    this.container = document.createElement("div")
    this.container.id = "music-player-container"
    this.container.className = `music-player-container minimized drag-handle music-style-${this.currentStyle}`

    this.container.innerHTML = `
            <div class="music-player-wrapper">
                <div class="disc-container">
                    <div id="vinyl-disc" class="vinyl-disc"></div>
                    <div id="source-icon-overlay" class="source-icon-overlay"></div>
                </div>
                <div class="player-main">
                    <div class="player-info">
                        <h3 id="music-title">No Media Playing</h3>
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

    document.body.appendChild(this.container)
    this.disc = this.container.querySelector("#vinyl-disc")
    this.sourceIcon = this.container.querySelector("#source-icon-overlay")
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

    window.addEventListener("settingsUpdated", (e) => {
      if (e.detail.key === "musicPlayerEnabled") {
        if (this.showPlayer && e.detail.value === true) {
          // If already enabled, toggle between minimized and expanded
          this.togglePlayer()
        } else {
          this.showPlayer = e.detail.value
          this.updateVisibility()
          if (this.showPlayer) {
            this.isVisible = true
            this.container.classList.remove("minimized")
            this.startPolling()
            updateSetting("musicPlayerExpanded", true)
            saveSettings()
          } else {
            this.stopPolling()
          }
        }
      }
      if (e.detail.key === "music_bar_style") {
        this.applyMusicStyle(e.detail.value)
      }
      if (e.detail.key === "musicPlayerUseDefaultColor") {
        this.useDefaultColor = e.detail.value
        this.applyMusicStyle(this.currentStyle)
      }
      if (e.detail.key === "accentColor" && !this.useDefaultColor) {
        this.applyMusicStyle(this.currentStyle)
      }
    })
  }

  applyMusicStyle(styleName) {
    // Remove old style class
    this.container.classList.remove(`music-style-${this.currentStyle}`)

    this.currentStyle = styleName

    // Add new style class
    this.container.classList.add(`music-style-${this.currentStyle}`)

    // Determine accent color
    let accentColor = ""
    if (this.useDefaultColor) {
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
        default:
          accentColor = "rgba(30, 215, 96, 0.8)" // Default vinyl/greenish
      }
    } else {
      accentColor = getSettings().accentColor || "#00ff73"
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
      this.container.style.setProperty("--accent-color-rgb", `${r}, ${g}, ${b}`)
    }

    // Update visualizer style
    if (this.visualizer) {
      this.visualizer.setStyle(this.currentStyle)
    }
  }

  startPolling() {
    if (this.pollInterval) return
    this.pollInterval = setInterval(() => this.fetchMediaState(), 1000)
    // Run an initial fetch
    this.fetchMediaState()
  }

  fetchMediaState() {
    if (!this.showPlayer || !this.isVisible) return
    try {
      chrome.runtime.sendMessage({ action: "getMediaState" }, (response) => {
        if (chrome.runtime.lastError) {
          this.setInactive()
          return
        }
        if (response && response.audible) {
          this.updateUI(response)
        } else {
          this.setInactive()
        }
      })
    } catch (e) {
      this.setInactive()
    }
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    // Stop visualizer and animations when not polling to save resources
    if (this.visualizer) this.visualizer.stop()
    this._stopProgressAnimation()
  }

  updateUI(data) {
    this.titleElement.textContent = data.title || "Unknown Title"

    // Update artist text and platform icon
    const artist = data.artist || "Unknown Artist"
    this.artistText.textContent = artist

    // Show platform icon based on URL
    const url = data.url || ""
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      this.platformIcon.className = "platform-icon fa-brands fa-youtube"
      this.platformIcon.style.display = "inline"
      this.platformIcon.style.color = "#ffffff"
    } else if (url.includes("spotify.com")) {
      this.platformIcon.className = "platform-icon fa-brands fa-spotify"
      this.platformIcon.style.display = "inline"
      this.platformIcon.style.color = "#1DB954"
    } else {
      this.platformIcon.style.display = "none"
    }

    this.isPlaying = !data.paused

    const btn = document.getElementById("play-pause-btn")
    btn.innerHTML = this.isPlaying
      ? '<i class="fa-solid fa-pause"></i>'
      : '<i class="fa-solid fa-play"></i>'

    if (this.isPlaying) {
      this.disc.classList.add("playing")
      this.visualizer.start()
    } else {
      this.disc.classList.remove("playing")
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

    this.updateSourceIcon(data.url)
    this._duration =
      typeof data.duration === "number" && data.duration > 0 ? data.duration : 0
    this._lastKnownTime = data.currentTime || 0
    this._lastUpdateTimestamp = Date.now()
    this._updateProgressUI(this._lastKnownTime, this._duration)
    if (this.isPlaying && this._duration > 0) {
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

  updateSourceIcon(url) {
    if (!url) return
    let iconClass = "fa-solid fa-music"
    if (url.includes("youtube.com") || url.includes("youtu.be"))
      iconClass = "fa-brands fa-youtube"
    else if (url.includes("spotify.com")) iconClass = "fa-brands fa-spotify"
    else if (url.includes("soundcloud.com"))
      iconClass = "fa-brands fa-soundcloud"

    this.sourceIcon.innerHTML = `<i class="${iconClass}"></i>`
    this.sourceIcon.style.display = "flex"
  }

  setInactive() {
    this.titleElement.textContent = "No Media Playing"
    this.artistText.textContent = ""
    this.platformIcon.style.display = "none"
    this.isPlaying = false
    this.disc.classList.remove("playing")
    this.sourceIcon.style.display = "none"
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
    chrome.runtime.sendMessage({ action: "mediaControl", command: command })
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

  updateVisibility() {
    // This handles whether the feature is enabled at all
    if (!this.showPlayer) {
      this.container.style.display = "none"
    } else {
      this.container.style.display = "block"
    }
  }
}
