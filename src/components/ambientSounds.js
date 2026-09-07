/**
 * ambientSounds.js
 * Lightweight & High-performance Ambient Sounds Generator
 * Procedural Web Audio synthesis with instant zero-lag playback
 */

import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { geti18n } from "../services/i18n.js"
import { fadeToggle } from "../utils/dom.js"
import { showContextMenu } from "./contextMenu.js"

export class AmbientSounds {
  constructor() {
    this.container = null
    this.audioCtx = null
    this.masterGain = null
    this.noiseBuffer = null
    this.activeNodes = new Map() // trackId -> { sources, gainNode }
    this.isMuted = false
    this.masterVolume = 0.7
    this.syncWithTimer = false
    this.currentCategory = "all"
    this.activePreset = null

    this.tracks = [
      {
        id: "rain",
        name: "Rain",
        i18nKey: "ambient_rain",
        icon: "fa-cloud-rain",
        category: "nature",
      },
      {
        id: "thunder",
        name: "Thunder",
        i18nKey: "ambient_thunder",
        icon: "fa-cloud-bolt",
        category: "nature",
      },
      {
        id: "waves",
        name: "Waves",
        i18nKey: "ambient_waves",
        icon: "fa-water",
        category: "nature",
      },
      {
        id: "wind",
        name: "Wind",
        i18nKey: "ambient_wind",
        icon: "fa-wind",
        category: "nature",
      },
      {
        id: "fire",
        name: "Campfire",
        i18nKey: "ambient_fire",
        icon: "fa-fire",
        category: "nature",
      },
      {
        id: "stream",
        name: "Stream",
        i18nKey: "ambient_stream",
        icon: "fa-water-ladder",
        category: "nature",
      },
      {
        id: "cafe",
        name: "Cozy Cafe",
        i18nKey: "ambient_cafe",
        icon: "fa-mug-hot",
        category: "cozy",
      },
      {
        id: "space",
        name: "Cosmic Drone (432Hz)",
        i18nKey: "ambient_space",
        icon: "fa-meteor",
        category: "focus",
      },
      {
        id: "traffic",
        name: "City Traffic",
        i18nKey: "ambient_traffic",
        icon: "fa-car-side",
        category: "cozy",
      },
      {
        id: "brownnoise",
        name: "Brown Noise",
        i18nKey: "ambient_brown_noise",
        icon: "fa-brain",
        category: "focus",
      },
      {
        id: "pinknoise",
        name: "Pink Noise",
        i18nKey: "ambient_pink_noise",
        icon: "fa-wave-square",
        category: "focus",
      },
      {
        id: "whitenoise",
        name: "White Noise",
        i18nKey: "ambient_white_noise",
        icon: "fa-bars-staggered",
        category: "focus",
      },
    ]

    this.presets = [
      {
        id: "rainy_cafe",
        name: "Rainy Cafe",
        i18nKey: "ambient_preset_rainy_cafe",
        icon: "fa-mug-saucer",
        tracks: { rain: 0.65, cafe: 0.55, fire: 0.4 },
      },
      {
        id: "ocean_breeze",
        name: "Ocean Breeze",
        i18nKey: "ambient_preset_ocean_breeze",
        icon: "fa-water",
        tracks: { waves: 0.7, wind: 0.45 },
      },
      {
        id: "deep_focus",
        name: "Deep Focus",
        i18nKey: "ambient_preset_deep_focus",
        icon: "fa-brain",
        tracks: { brownnoise: 0.65, space: 0.45 },
      },
      {
        id: "thunderstorm",
        name: "Thunderstorm",
        i18nKey: "ambient_preset_thunderstorm",
        icon: "fa-bolt-lightning",
        tracks: { rain: 0.75, thunder: 0.6, wind: 0.5 },
      },
    ]

    this.trackVolumes = {}
    this.playingTracks = new Set()

    this.init()
  }

  async init() {
    this.loadState()
    this.createElements()
    this.setupEventListeners()
    this.setupTimerSync()
    this.applySkin()
    this.updateActiveBadge()
  }

  loadState() {
    try {
      const settings = getSettings()
      this.masterVolume =
        settings.ambientMasterVolume !== undefined
          ? settings.ambientMasterVolume
          : 0.7
      this.syncWithTimer = settings.ambientSyncTimer === true
      this.trackVolumes = settings.ambientTrackVolumes || {
        rain: 0.7,
        waves: 0.6,
        wind: 0.5,
        fire: 0.6,
        stream: 0.6,
        brownnoise: 0.65,
        pinknoise: 0.5,
        whitenoise: 0.4,
        cafe: 0.55,
        space: 0.45,
        traffic: 0.5,
        thunder: 0.6,
      }
    } catch {
      this.masterVolume = 0.7
      this.trackVolumes = {}
    }
  }

  saveState() {
    try {
      updateSetting("ambientMasterVolume", this.masterVolume)
      updateSetting("ambientSyncTimer", this.syncWithTimer)
      updateSetting("ambientTrackVolumes", this.trackVolumes)
      saveSettings()
    } catch (e) {
      console.warn("Failed to save ambient sound state:", e)
    }
  }

  ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      this.audioCtx = new AudioCtx()
      this.masterGain = this.audioCtx.createGain()
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.audioCtx.currentTime,
      )
      this.masterGain.connect(this.audioCtx.destination)

      // Pre-create 2-second white noise buffer ONCE
      const sampleRate = this.audioCtx.sampleRate
      this.noiseBuffer = this.audioCtx.createBuffer(
        1,
        sampleRate * 2,
        sampleRate,
      )
      const data = this.noiseBuffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1
      }
    }

    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume()
    }
    return this.audioCtx
  }

  createElements() {
    this.container = document.getElementById("ambient-sounds-container")
    if (!this.container) {
      this.container = document.createElement("div")
      this.container.id = "ambient-sounds-container"
      this.container.className =
        "ambient-sounds-container glass-panel drag-handle"
      this.container.style.display = "none"
      document.body.appendChild(this.container)
    }

    const i18n = geti18n()

    this.container.innerHTML = `
      <div class="ambient-header drag-handle">
        <div class="ambient-title-wrap">
          <div class="ambient-icon-badge">
            <i class="fa-solid fa-headphones-simple"></i>
          </div>
          <span class="ambient-header-title">${i18n.ambient_title || "Ambient Sounds"}</span>
          <span class="ambient-active-badge" id="ambient-active-badge" style="display: none;">
            <span class="ambient-pulse-dot"></span>
            <span class="ambient-active-count">0</span>
          </span>
        </div>
        <div class="ambient-header-actions no-drag">
          <button type="button" class="ambient-tool-btn ${this.isMuted ? "muted" : ""}" id="ambient-mute-all" title="${i18n.ambient_mute_all || "Mute All"}">
            <i class="fa-solid ${this.isMuted ? "fa-volume-xmark" : "fa-volume-high"}"></i>
          </button>
          <button type="button" class="ambient-tool-btn" id="ambient-close-btn" title="${i18n.close || "Close"}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="ambient-body no-drag">
        <!-- Quick Presets Carousel -->
        <div class="ambient-presets-row">
          <div class="ambient-presets-label">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>Mix</span>
          </div>
          <div class="ambient-presets-list">
            ${this.presets
              .map((preset) => {
                const name = i18n[preset.i18nKey] || preset.name
                return `
                  <button type="button" class="ambient-preset-chip" data-preset-id="${preset.id}">
                    <i class="fa-solid ${preset.icon}"></i>
                    <span>${name}</span>
                  </button>
                `
              })
              .join("")}
          </div>
        </div>

        <!-- Master Volume Control -->
        <div class="ambient-master-row">
          <span class="ambient-label">
            <i class="fa-solid ${this.isMuted ? "fa-volume-xmark" : this.masterVolume === 0 ? "fa-volume-off" : this.masterVolume < 0.5 ? "fa-volume-low" : "fa-volume-high"}" id="ambient-master-icon"></i>
            <span>${i18n.ambient_master_volume || "Master"}</span>
          </span>
          <div class="ambient-slider-wrap">
            <input type="range" class="ambient-range-slider ambient-master-slider" id="ambient-master-slider" min="0" max="1" step="0.02" value="${this.masterVolume}">
          </div>
          <span class="ambient-vol-text" id="ambient-master-val">${Math.round(this.masterVolume * 100)}%</span>
        </div>

        <!-- Category Tabs -->
        <div class="ambient-categories-nav">
          <button type="button" class="ambient-cat-btn ${this.currentCategory === "all" ? "active" : ""}" data-category="all">
            <i class="fa-solid fa-layer-group"></i> <span>${i18n.ambient_cat_all || "All"}</span>
          </button>
          <button type="button" class="ambient-cat-btn ${this.currentCategory === "nature" ? "active" : ""}" data-category="nature">
            <i class="fa-solid fa-tree"></i> <span>${i18n.ambient_cat_nature || "Nature"}</span>
          </button>
          <button type="button" class="ambient-cat-btn ${this.currentCategory === "cozy" ? "active" : ""}" data-category="cozy">
            <i class="fa-solid fa-mug-hot"></i> <span>${i18n.ambient_cat_cozy || "Cozy"}</span>
          </button>
          <button type="button" class="ambient-cat-btn ${this.currentCategory === "focus" ? "active" : ""}" data-category="focus">
            <i class="fa-solid fa-bolt"></i> <span>${i18n.ambient_cat_focus || "Focus Noise"}</span>
          </button>
        </div>

        <!-- Tracks List -->
        <div class="ambient-tracks-list" id="ambient-tracks-list">
          ${this.renderTracksListHTML(i18n)}
        </div>

        <!-- Footer -->
        <div class="ambient-footer-row">
          <label class="ambient-toggle-label" for="ambient-sync-timer-cb">
            <span class="ambient-switch-control">
              <input type="checkbox" id="ambient-sync-timer-cb" ${this.syncWithTimer ? "checked" : ""}>
              <span class="ambient-switch-slider"></span>
            </span>
            <span class="ambient-sync-text">${i18n.ambient_sync_pomodoro || "Sync with Timer"}</span>
          </label>
          <button type="button" class="ambient-btn-stop-all" id="ambient-stop-all-btn">
            <i class="fa-solid fa-stop"></i>
            <span>${i18n.ambient_stop_all || "Stop All"}</span>
          </button>
        </div>
      </div>
    `

    this.updateSliderGradients()
  }

  renderTracksListHTML(i18n) {
    return this.tracks
      .map((track) => {
        const isVisible =
          this.currentCategory === "all" ||
          track.category === this.currentCategory
        const vol =
          this.trackVolumes[track.id] !== undefined
            ? this.trackVolumes[track.id]
            : 0.6
        const name = i18n[track.i18nKey] || track.name
        const isPlaying = this.playingTracks.has(track.id)
        return `
          <div class="ambient-track-item ${isPlaying ? "active" : ""}" data-track-id="${track.id}" data-category="${track.category}" style="${isVisible ? "" : "display: none;"}">
            <button type="button" class="ambient-track-btn" data-track-id="${track.id}">
              <div class="ambient-track-icon-wrap">
                <i class="fa-solid ${track.icon}"></i>
              </div>
              <div class="ambient-track-info">
                <span class="ambient-track-name">${name}</span>
                <div class="ambient-eq-bars" aria-hidden="true">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </button>
            <div class="ambient-track-slider-wrap">
              <input type="range" class="ambient-range-slider ambient-item-slider" data-track-id="${track.id}" min="0" max="1" step="0.02" value="${vol}" title="${Math.round(vol * 100)}%">
              <span class="ambient-item-vol-text">${Math.round(vol * 100)}%</span>
            </div>
          </div>
        `
      })
      .join("")
  }

  setupEventListeners() {
    this.container
      .querySelector("#ambient-close-btn")
      ?.addEventListener("click", () => {
        this.toggleVisibility(false)
      })

    const muteBtn = this.container.querySelector("#ambient-mute-all")
    muteBtn?.addEventListener("click", () => {
      this.ensureAudioContext()
      this.isMuted = !this.isMuted
      if (this.masterGain && this.audioCtx) {
        this.masterGain.gain.setValueAtTime(
          this.isMuted ? 0 : this.masterVolume,
          this.audioCtx.currentTime,
        )
      }
      this.updateMuteUI()
    })

    const masterSlider = this.container.querySelector("#ambient-master-slider")
    const masterVal = this.container.querySelector("#ambient-master-val")
    masterSlider?.addEventListener("input", (e) => {
      this.ensureAudioContext()
      this.masterVolume = parseFloat(e.target.value)
      if (masterVal)
        masterVal.textContent = `${Math.round(this.masterVolume * 100)}%`
      if (this.masterGain && this.audioCtx && !this.isMuted) {
        this.masterGain.gain.setValueAtTime(
          this.masterVolume,
          this.audioCtx.currentTime,
        )
      }
      this.updateSliderGradient(masterSlider)
      this.updateMasterIcon()
      this.saveState()
    })

    // Presets
    this.container.querySelectorAll(".ambient-preset-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const presetId = chip.dataset.presetId
        this.applyPreset(presetId)
      })
    })

    // Categories
    this.container.querySelectorAll(".ambient-cat-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cat = btn.dataset.category
        this.setCategory(cat)
      })
    })

    // Track toggles
    this.container.addEventListener("click", (e) => {
      const trackBtn = e.target.closest(".ambient-track-btn")
      if (trackBtn) {
        this.ensureAudioContext()
        const trackId = trackBtn.dataset.trackId
        this.toggleTrack(trackId)
      }
    })

    // Track volume sliders
    this.container.addEventListener("input", (e) => {
      const slider = e.target.closest(".ambient-item-slider")
      if (slider) {
        this.ensureAudioContext()
        const trackId = slider.dataset.trackId
        const vol = parseFloat(slider.value)
        this.setTrackVolume(trackId, vol)
        const volText = slider.parentElement?.querySelector(
          ".ambient-item-vol-text",
        )
        if (volText) volText.textContent = `${Math.round(vol * 100)}%`
        slider.title = `${Math.round(vol * 100)}%`
        this.updateSliderGradient(slider)
      }
    })

    this.container
      .querySelector("#ambient-sync-timer-cb")
      ?.addEventListener("change", (e) => {
        this.syncWithTimer = e.target.checked
        this.saveState()
      })

    this.container
      .querySelector("#ambient-stop-all-btn")
      ?.addEventListener("click", () => {
        this.stopAllTracks()
      })

    this.container.addEventListener("contextmenu", (e) => {
      e.preventDefault()
      e.stopPropagation()
      showContextMenu(e.clientX, e.clientY, -1, "widget", "ambientSounds")
    })

    window.addEventListener("startpage:languageChanged", () =>
      this.updateLanguage(),
    )
    window.addEventListener("languageChanged", () => this.updateLanguage())

    window.addEventListener("layoutUpdated", (e) => {
      if (
        e.detail &&
        (e.detail.key === "ambientSoundsSkin" ||
          e.detail.key === "ambientSoundsHideBorder" ||
          e.detail.key === "widgetUseM3Accent")
      ) {
        this.applySkin()
      }
    })
  }

  updateSliderGradients() {
    if (!this.container) return
    this.container.querySelectorAll(".ambient-range-slider").forEach((slider) => {
      this.updateSliderGradient(slider)
    })
  }

  updateSliderGradient(slider) {
    if (!slider) return
    const min = parseFloat(slider.min) || 0
    const max = parseFloat(slider.max) || 1
    const val = parseFloat(slider.value) || 0
    const percent = ((val - min) / (max - min)) * 100
    slider.style.setProperty("--slider-percent", `${percent}%`)
  }

  updateMasterIcon() {
    const icon = this.container?.querySelector("#ambient-master-icon")
    if (!icon) return
    if (this.isMuted) {
      icon.className = "fa-solid fa-volume-xmark"
    } else if (this.masterVolume === 0) {
      icon.className = "fa-solid fa-volume-off"
    } else if (this.masterVolume < 0.5) {
      icon.className = "fa-solid fa-volume-low"
    } else {
      icon.className = "fa-solid fa-volume-high"
    }
  }

  updateMuteUI() {
    const muteBtn = this.container?.querySelector("#ambient-mute-all")
    if (muteBtn) {
      muteBtn.innerHTML = this.isMuted
        ? `<i class="fa-solid fa-volume-xmark"></i>`
        : `<i class="fa-solid fa-volume-high"></i>`
      muteBtn.classList.toggle("muted", this.isMuted)
    }
    this.updateMasterIcon()
  }

  setCategory(category) {
    this.currentCategory = category
    this.container?.querySelectorAll(".ambient-cat-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.category === category)
    })
    this.container?.querySelectorAll(".ambient-track-item").forEach((item) => {
      const isVisible =
        category === "all" || item.dataset.category === category
      item.style.display = isVisible ? "flex" : "none"
    })
  }

  applyPreset(presetId) {
    const preset = this.presets.find((p) => p.id === presetId)
    if (!preset) return

    // If preset is already fully active, clicking it stops its sounds
    const isAlreadyActive =
      this.activePreset === presetId &&
      Object.keys(preset.tracks).every((id) => this.playingTracks.has(id))

    if (isAlreadyActive) {
      this.stopAllTracks()
      return
    }

    this.ensureAudioContext()
    this.stopAllTracks()

    Object.entries(preset.tracks).forEach(([trackId, vol]) => {
      this.setTrackVolume(trackId, vol)
      const slider = this.container?.querySelector(
        `.ambient-item-slider[data-track-id="${trackId}"]`,
      )
      if (slider) {
        slider.value = vol
        this.updateSliderGradient(slider)
        const volText = slider.parentElement?.querySelector(
          ".ambient-item-vol-text",
        )
        if (volText) volText.textContent = `${Math.round(vol * 100)}%`
      }
      this.startTrack(trackId)
    })

    this.activePreset = presetId
    this.updatePresetActiveStates()
  }

  updatePresetActiveStates() {
    if (!this.container) return
    this.presets.forEach((preset) => {
      const chip = this.container.querySelector(
        `.ambient-preset-chip[data-preset-id="${preset.id}"]`,
      )
      if (!chip) return
      const keys = Object.keys(preset.tracks)
      const isMatch =
        keys.length > 0 &&
        keys.every((id) => this.playingTracks.has(id)) &&
        this.playingTracks.size === keys.length
      chip.classList.toggle("active", isMatch)
      if (isMatch) this.activePreset = preset.id
    })
    if (this.playingTracks.size === 0) {
      this.activePreset = null
      this.container
        .querySelectorAll(".ambient-preset-chip")
        .forEach((c) => c.classList.remove("active"))
    }
  }

  updateActiveBadge() {
    const badge = this.container?.querySelector("#ambient-active-badge")
    const countEl = this.container?.querySelector(".ambient-active-count")
    const count = this.playingTracks.size
    if (badge && countEl) {
      countEl.textContent = String(count)
      badge.style.display = count > 0 ? "inline-flex" : "none"
    }

    const quickBtn = document.querySelector(
      '.quick-btn[data-toggle="ambientSounds"]',
    )
    if (quickBtn) {
      quickBtn.classList.toggle("is-playing", count > 0)
    }
  }

  applySkin() {
    if (!this.container) return
    const settings = getSettings()
    const isWhiteMode = settings.showQuickAccessBg === true
    const skin =
      settings.widgetUseM3Accent === true
        ? "m3-accent"
        : isWhiteMode
          ? "white-blur"
          : settings.ambientSoundsSkin || "default"

    this.container.classList.toggle("skin-white-blur", skin === "white-blur")
    this.container.classList.toggle("skin-m3-accent", skin === "m3-accent")
    this.container.classList.toggle("skin-transparent", skin === "transparent")
    this.container.classList.toggle(
      "skin-light-transparent",
      skin === "light-transparent",
    )
    this.container.classList.toggle(
      "widget-border-hidden",
      settings.ambientSoundsHideBorder === true,
    )
  }

  updateLanguage() {
    const i18n = geti18n()
    if (!this.container) return

    const titleEl = this.container.querySelector(".ambient-header-title")
    if (titleEl) titleEl.textContent = i18n.ambient_title || "Ambient Sounds"

    const muteBtn = this.container.querySelector("#ambient-mute-all")
    if (muteBtn) muteBtn.title = i18n.ambient_mute_all || "Mute"

    const closeBtn = this.container.querySelector("#ambient-close-btn")
    if (closeBtn) closeBtn.title = i18n.close || "Close"

    const masterLabel = this.container.querySelector(
      ".ambient-master-row .ambient-label span",
    )
    if (masterLabel)
      masterLabel.textContent = i18n.ambient_master_volume || "Master"

    const syncLabel = this.container.querySelector(".ambient-sync-text")
    if (syncLabel)
      syncLabel.textContent = i18n.ambient_sync_pomodoro || "Sync with Timer"

    const stopAllBtn = this.container.querySelector(
      "#ambient-stop-all-btn span",
    )
    if (stopAllBtn)
      stopAllBtn.textContent = i18n.ambient_stop_all || "Stop All"

    this.presets.forEach((preset) => {
      const chipSpan = this.container.querySelector(
        `.ambient-preset-chip[data-preset-id="${preset.id}"] span`,
      )
      if (chipSpan) {
        chipSpan.textContent = i18n[preset.i18nKey] || preset.name
      }
    })

    const catMap = {
      all: i18n.ambient_cat_all || "All",
      nature: i18n.ambient_cat_nature || "Nature",
      cozy: i18n.ambient_cat_cozy || "Cozy",
      focus: i18n.ambient_cat_focus || "Focus Noise",
    }
    Object.entries(catMap).forEach(([cat, label]) => {
      const btnSpan = this.container.querySelector(
        `.ambient-cat-btn[data-category="${cat}"] span`,
      )
      if (btnSpan) btnSpan.textContent = label
    })

    this.tracks.forEach((track) => {
      const trackSpan = this.container.querySelector(
        `.ambient-track-item[data-track-id="${track.id}"] .ambient-track-name`,
      )
      if (trackSpan) {
        trackSpan.textContent = i18n[track.i18nKey] || track.name
      }
    })

    const quickBtn = document.querySelector(
      '.quick-btn[data-toggle="ambientSounds"]',
    )
    if (quickBtn)
      quickBtn.title = i18n.quick_access_ambient_sounds || "Ambient Sounds"
  }

  setupTimerSync() {
    window.addEventListener("timerStarted", () => {
      if (this.syncWithTimer && this.playingTracks.size === 0) {
        this.startTrack("rain")
      }
    })

    window.addEventListener("timerPaused", () => {
      if (this.syncWithTimer) {
        this.stopAllTracks()
      }
    })

    window.addEventListener("timerStopped", () => {
      if (this.syncWithTimer) {
        this.stopAllTracks()
      }
    })
  }

  toggleTrack(trackId) {
    if (this.playingTracks.has(trackId)) {
      this.stopTrack(trackId)
    } else {
      this.startTrack(trackId)
    }
  }

  startTrack(trackId) {
    try {
      const ctx = this.ensureAudioContext()
      if (this.activeNodes.has(trackId)) {
        this.stopTrack(trackId)
      }

      const trackGain = ctx.createGain()
      const vol =
        this.trackVolumes[trackId] !== undefined
          ? this.trackVolumes[trackId]
          : 0.6
      trackGain.gain.setValueAtTime(vol, ctx.currentTime)
      trackGain.connect(this.masterGain)

      const sources = this.createSoundNodes(trackId, ctx, trackGain)

      this.activeNodes.set(trackId, { sources, gainNode: trackGain })
      this.playingTracks.add(trackId)

      this.updateTrackUI(trackId, true)
      this.updateActiveBadge()
      this.updatePresetActiveStates()
    } catch (err) {
      console.warn("Ambient sound error:", err)
    }
  }

  stopTrack(trackId) {
    const entry = this.activeNodes.get(trackId)
    if (entry) {
      try {
        if (entry.sources) {
          entry.sources.forEach((s) => {
            try {
              if (s.stop) s.stop()
            } catch {}
            try {
              if (s.disconnect) s.disconnect()
            } catch {}
          })
        }
        if (entry.gainNode) {
          entry.gainNode.disconnect()
        }
      } catch {}
      this.activeNodes.delete(trackId)
    }
    this.playingTracks.delete(trackId)
    this.updateTrackUI(trackId, false)
    this.updateActiveBadge()
    this.updatePresetActiveStates()
  }

  stopAllTracks() {
    const tracks = Array.from(this.playingTracks)
    tracks.forEach((id) => this.stopTrack(id))
    this.updateActiveBadge()
    this.updatePresetActiveStates()
  }

  setTrackVolume(trackId, volume) {
    this.trackVolumes[trackId] = volume
    const entry = this.activeNodes.get(trackId)
    if (entry && entry.gainNode && this.audioCtx) {
      entry.gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime)
    }
    this.saveState()
  }

  updateTrackUI(trackId, isPlaying) {
    const item = this.container?.querySelector(
      `.ambient-track-item[data-track-id="${trackId}"]`,
    )
    if (item) {
      item.classList.toggle("active", isPlaying)
    }
  }

  toggleVisibility(show) {
    const isVisible =
      this.container.style.display !== "none" &&
      this.container.style.display !== ""
    const target = show !== undefined ? show : !isVisible

    fadeToggle(this.container, target, "flex")

    updateSetting("showAmbientSounds", target)
    saveSettings()

    const quickBtn = document.querySelector(
      '.quick-btn[data-toggle="ambientSounds"]',
    )
    if (quickBtn) quickBtn.classList.toggle("active", target)
  }

  // ── Procedural Sound Synthesis ──────────────────────────────────────────────

  createSoundNodes(type, ctx, destinationGain) {
    const buffer = this.noiseBuffer

    switch (type) {
      case "rain": {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 900

        const hp = ctx.createBiquadFilter()
        hp.type = "highpass"
        hp.frequency.value = 160

        // Resonant droplet texture
        const dropletFilter = ctx.createBiquadFilter()
        dropletFilter.type = "peaking"
        dropletFilter.frequency.value = 2400
        dropletFilter.gain.value = 4
        dropletFilter.Q.value = 1.5

        source.connect(filter)
        filter.connect(hp)
        hp.connect(dropletFilter)
        dropletFilter.connect(destinationGain)
        source.start()
        return [source, filter, hp, dropletFilter]
      }

      case "waves": {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 420

        const lfo = ctx.createOscillator()
        lfo.frequency.value = 0.1 // 10-second ocean wave cycle
        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 0.55

        const waveGain = ctx.createGain()
        waveGain.gain.value = 0.65

        // Sweeping filter for authentic wave surf
        const sweepFilter = ctx.createBiquadFilter()
        sweepFilter.type = "peaking"
        sweepFilter.frequency.value = 650
        sweepFilter.Q.value = 1.8
        sweepFilter.gain.value = 6

        lfo.connect(lfoGain)
        lfoGain.connect(waveGain.gain)

        source.connect(filter)
        filter.connect(sweepFilter)
        sweepFilter.connect(waveGain)
        waveGain.connect(destinationGain)

        source.start()
        lfo.start()
        return [source, filter, sweepFilter, waveGain, lfo, lfoGain]
      }

      case "wind": {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "bandpass"
        filter.frequency.value = 420
        filter.Q.value = 2.8

        const lfo = ctx.createOscillator()
        lfo.frequency.value = 0.14
        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 180 // Sweeps filter center between 240Hz and 600Hz

        lfo.connect(lfoGain)
        lfoGain.connect(filter.frequency)

        source.connect(filter)
        filter.connect(destinationGain)

        source.start()
        lfo.start()
        return [source, filter, lfo, lfoGain]
      }

      case "fire": {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "bandpass"
        filter.frequency.value = 280
        filter.Q.value = 1.4

        const crackleFilter = ctx.createBiquadFilter()
        crackleFilter.type = "peaking"
        crackleFilter.frequency.value = 1600
        crackleFilter.gain.value = 5
        crackleFilter.Q.value = 3.0

        source.connect(filter)
        filter.connect(crackleFilter)
        crackleFilter.connect(destinationGain)
        source.start()
        return [source, filter, crackleFilter]
      }

      case "stream": {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "bandpass"
        filter.frequency.value = 850
        filter.Q.value = 1.8

        const sparkle = ctx.createBiquadFilter()
        sparkle.type = "highpass"
        sparkle.frequency.value = 500

        source.connect(filter)
        filter.connect(sparkle)
        sparkle.connect(destinationGain)
        source.start()
        return [source, filter, sparkle]
      }

      case "brownnoise": {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 200

        source.connect(filter)
        filter.connect(destinationGain)
        source.start()
        return [source, filter]
      }

      case "thunder": {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 110

        const lfo1 = ctx.createOscillator()
        lfo1.frequency.value = 0.06
        const lfo2 = ctx.createOscillator()
        lfo2.frequency.value = 0.095

        const lfoGain1 = ctx.createGain()
        lfoGain1.gain.value = 0.45
        const lfoGain2 = ctx.createGain()
        lfoGain2.gain.value = 0.35

        const rumbleGain = ctx.createGain()
        rumbleGain.gain.value = 0.85

        lfo1.connect(lfoGain1)
        lfo2.connect(lfoGain2)
        lfoGain1.connect(rumbleGain.gain)
        lfoGain2.connect(rumbleGain.gain)

        source.connect(filter)
        filter.connect(rumbleGain)
        rumbleGain.connect(destinationGain)

        source.start()
        lfo1.start()
        lfo2.start()
        return [source, filter, rumbleGain, lfo1, lfo2, lfoGain1, lfoGain2]
      }

      case "cafe": {
        // Warm cafe ambience murmur
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter1 = ctx.createBiquadFilter()
        filter1.type = "bandpass"
        filter1.frequency.value = 450
        filter1.Q.value = 2.0

        const filter2 = ctx.createBiquadFilter()
        filter2.type = "lowpass"
        filter2.frequency.value = 1100

        source.connect(filter1)
        filter1.connect(filter2)
        filter2.connect(destinationGain)
        source.start()
        return [source, filter1, filter2]
      }

      case "space": {
        // 432Hz Pythagorean pure meditative harmonics
        const osc1 = ctx.createOscillator()
        osc1.type = "sine"
        osc1.frequency.value = 108 // Root (C)

        const osc2 = ctx.createOscillator()
        osc2.type = "sine"
        osc2.frequency.value = 216 // Octave (C)

        const osc3 = ctx.createOscillator()
        osc3.type = "sine"
        osc3.frequency.value = 324 // Fifth (G)

        const osc4 = ctx.createOscillator()
        osc4.type = "sine"
        osc4.frequency.value = 432 // Concert A Harmonic

        // Gentle chorusing detune for deep rich soundscape
        const lfo = ctx.createOscillator()
        lfo.frequency.value = 0.08
        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 1.2
        lfo.connect(lfoGain)
        lfoGain.connect(osc2.frequency)

        const filter = ctx.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 500

        const droneGain = ctx.createGain()
        droneGain.gain.value = 0.35

        osc1.connect(filter)
        osc2.connect(filter)
        osc3.connect(filter)
        osc4.connect(filter)
        filter.connect(droneGain)
        droneGain.connect(destinationGain)

        osc1.start()
        osc2.start()
        osc3.start()
        osc4.start()
        lfo.start()
        return [osc1, osc2, osc3, osc4, lfo, lfoGain, filter, droneGain]
      }

      case "traffic": {
        // Distant city traffic & passing cars
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const lowRumble = ctx.createBiquadFilter()
        lowRumble.type = "lowpass"
        lowRumble.frequency.value = 240

        // Modulated bandpass for Doppler passing vehicle swoosh
        const tireFilter = ctx.createBiquadFilter()
        tireFilter.type = "bandpass"
        tireFilter.frequency.value = 420
        tireFilter.Q.value = 2.0

        const lfo = ctx.createOscillator()
        lfo.frequency.value = 0.07 // 14s smooth passing cycle
        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 180 // Sweeps between 240Hz and 600Hz

        lfo.connect(lfoGain)
        lfoGain.connect(tireFilter.frequency)

        const trafficGain = ctx.createGain()
        trafficGain.gain.value = 0.7

        source.connect(lowRumble)
        source.connect(tireFilter)
        lowRumble.connect(trafficGain)
        tireFilter.connect(trafficGain)
        trafficGain.connect(destinationGain)

        source.start()
        lfo.start()
        return [source, lowRumble, tireFilter, lfo, lfoGain, trafficGain]
      }

      case "pinknoise": {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 550

        source.connect(filter)
        filter.connect(destinationGain)
        source.start()
        return [source, filter]
      }

      default: {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true
        source.connect(destinationGain)
        source.start()
        return [source]
      }
    }
  }
}
