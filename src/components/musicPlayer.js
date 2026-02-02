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
    this.pollInterval = null
    this.currentThumbnail = ""
    this.visualizer = new MusicVisualizer()

    this.init()
  }

  init() {
    this.createElements()
    this.setupEventListeners()
    this.updateVisibility()
    // Strictly apply the saved expansion state
    this.container.classList.toggle("minimized", !this.isVisible)
    this.startPolling()
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
            this.startPolling()
            this.isVisible = true
            this.container.classList.remove("minimized")
          } else {
            this.stopPolling()
          }
        }
      }
      if (e.detail.key === "music_bar_style") {
        // Remove old style class
        this.container.classList.remove(`music-style-${this.currentStyle}`)
        this.currentStyle = e.detail.value
        // Add new style class
        this.container.classList.add(`music-style-${this.currentStyle}`)
        this.visualizer.setStyle(this.currentStyle)
      }
    })
  }

  startPolling() {
    if (this.pollInterval) return
    this.pollInterval = setInterval(() => {
      if (this.showPlayer) {
        chrome.runtime.sendMessage({ action: "getMediaState" }, (response) => {
          if (chrome.runtime.lastError) return
          if (response && response.audible) {
            this.updateUI(response)
          } else {
            this.setInactive()
          }
        })
      }
    }, 1000)
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  updateUI(data) {
    this.titleElement.textContent = data.title || "Unknown Title"

    // Update artist text and platform icon
    const artist = data.artist || "Unknown Artist"
    this.artistText.textContent = artist

    // Show platform icon based on source
    if (data.source === "youtube") {
      this.platformIcon.className = "platform-icon fa-brands fa-youtube"
      this.platformIcon.style.display = "inline"
      this.platformIcon.style.color = "#FF0000"
    } else if (data.source === "spotify") {
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
    this.artistElement.textContent = ""
    this.isPlaying = false
    this.disc.classList.remove("playing")
    this.sourceIcon.style.display = "none"
    this.disc.style.backgroundImage = "none"
    this.currentThumbnail = ""
    document.getElementById("play-pause-btn").innerHTML =
      '<i class="fa-solid fa-play"></i>'
  }

  sendControl(command) {
    chrome.runtime.sendMessage({ action: "mediaControl", command: command })
  }

  togglePlayer() {
    this.isVisible = !this.isVisible
    this.container.classList.toggle("minimized", !this.isVisible)
    updateSetting("musicPlayerExpanded", this.isVisible)
    saveSettings()
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
