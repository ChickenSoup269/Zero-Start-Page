/**
 * ambientSounds.js
 * Lightweight & High-performance Ambient Sounds Generator
 * Procedural Web Audio synthesis with instant zero-lag playback
 */

import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { geti18n } from "../services/i18n.js"

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

    this.tracks = [
      { id: "rain", name: "Rain", i18nKey: "ambient_rain", icon: "fa-cloud-rain" },
      { id: "waves", name: "Waves", i18nKey: "ambient_waves", icon: "fa-water" },
      { id: "wind", name: "Wind", i18nKey: "ambient_wind", icon: "fa-wind" },
      { id: "fire", name: "Campfire", i18nKey: "ambient_fire", icon: "fa-fire" },
      { id: "stream", name: "Stream", i18nKey: "ambient_stream", icon: "fa-water-ladder" },
      { id: "brownnoise", name: "Brown Noise", i18nKey: "ambient_brown_noise", icon: "fa-brain" },
      { id: "pinknoise", name: "Pink Noise", i18nKey: "ambient_pink_noise", icon: "fa-wave-square" },
      { id: "whitenoise", name: "White Noise", i18nKey: "ambient_white_noise", icon: "fa-bars-staggered" },
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
  }

  loadState() {
    try {
      const settings = getSettings()
      this.masterVolume = settings.ambientMasterVolume !== undefined ? settings.ambientMasterVolume : 0.7
      this.syncWithTimer = settings.ambientSyncTimer === true
      this.trackVolumes = settings.ambientTrackVolumes || {
        rain: 0.7,
        waves: 0.6,
        wind: 0.5,
        fire: 0.6,
        stream: 0.6,
        brownnoise: 0.6,
        pinknoise: 0.5,
        whitenoise: 0.4,
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
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.audioCtx.currentTime)
      this.masterGain.connect(this.audioCtx.destination)

      // Pre-create 2-second white noise buffer ONCE
      const sampleRate = this.audioCtx.sampleRate
      this.noiseBuffer = this.audioCtx.createBuffer(1, sampleRate * 2, sampleRate)
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
      this.container.className = "ambient-sounds-container glass-panel drag-handle"
      this.container.style.display = "none"
      document.body.appendChild(this.container)
    }

    const i18n = geti18n()

    this.container.innerHTML = `
      <div class="ambient-header drag-handle">
        <div class="ambient-title-wrap">
          <i class="fa-solid fa-headphones-simple ambient-header-icon"></i>
          <span class="ambient-header-title">${i18n.ambient_title || "Ambient Sounds"}</span>
        </div>
        <div class="ambient-header-actions no-drag">
          <button class="ambient-tool-btn" id="ambient-mute-all" title="${i18n.ambient_mute_all || "Mute"}">
            <i class="fa-solid fa-volume-high"></i>
          </button>
          <button class="ambient-tool-btn" id="ambient-close-btn" title="${i18n.close || "Close"}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="ambient-body no-drag">
        <!-- Master Control -->
        <div class="ambient-master-row">
          <span class="ambient-label"><i class="fa-solid fa-sliders"></i> ${i18n.ambient_master_volume || "Volume"}</span>
          <input type="range" class="ambient-range-slider" id="ambient-master-slider" min="0" max="1" step="0.02" value="${this.masterVolume}">
          <span class="ambient-vol-text" id="ambient-master-val">${Math.round(this.masterVolume * 100)}%</span>
        </div>

        <!-- Tracks List -->
        <div class="ambient-tracks-list">
          ${this.tracks
            .map((track) => {
              const vol = this.trackVolumes[track.id] !== undefined ? this.trackVolumes[track.id] : 0.6
              const name = i18n[track.i18nKey] || track.name
              const isPlaying = this.playingTracks.has(track.id)
              return `
                <div class="ambient-track-item ${isPlaying ? "active" : ""}" data-track-id="${track.id}">
                  <button class="ambient-track-btn" data-track-id="${track.id}">
                    <i class="fa-solid ${track.icon}"></i>
                    <span>${name}</span>
                  </button>
                  <input type="range" class="ambient-range-slider ambient-item-slider" data-track-id="${track.id}" min="0" max="1" step="0.02" value="${vol}">
                </div>
              `
            })
            .join("")}
        </div>

        <div class="ambient-footer-row">
          <label class="ambient-toggle-label">
            <input type="checkbox" id="ambient-sync-timer-cb" ${this.syncWithTimer ? "checked" : ""}>
            <span>${i18n.ambient_sync_pomodoro || "Sync with Timer"}</span>
          </label>
          <button class="ambient-btn-danger" id="ambient-stop-all-btn">
            <i class="fa-solid fa-stop"></i> ${i18n.ambient_stop_all || "Stop All"}
          </button>
        </div>
      </div>
    `
  }

  setupEventListeners() {
    this.container.querySelector("#ambient-close-btn")?.addEventListener("click", () => {
      this.toggleVisibility(false)
    })

    const muteBtn = this.container.querySelector("#ambient-mute-all")
    muteBtn?.addEventListener("click", () => {
      this.ensureAudioContext()
      this.isMuted = !this.isMuted
      if (this.masterGain && this.audioCtx) {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.audioCtx.currentTime)
      }
      muteBtn.innerHTML = this.isMuted ? `<i class="fa-solid fa-volume-xmark"></i>` : `<i class="fa-solid fa-volume-high"></i>`
      muteBtn.classList.toggle("muted", this.isMuted)
    })

    const masterSlider = this.container.querySelector("#ambient-master-slider")
    const masterVal = this.container.querySelector("#ambient-master-val")
    masterSlider?.addEventListener("input", (e) => {
      this.ensureAudioContext()
      this.masterVolume = parseFloat(e.target.value)
      if (masterVal) masterVal.textContent = `${Math.round(this.masterVolume * 100)}%`
      if (this.masterGain && this.audioCtx && !this.isMuted) {
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioCtx.currentTime)
      }
      this.saveState()
    })

    this.container.querySelectorAll(".ambient-track-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.ensureAudioContext()
        const trackId = btn.dataset.trackId
        this.toggleTrack(trackId)
      })
    })

    this.container.querySelectorAll(".ambient-item-slider").forEach((slider) => {
      slider.addEventListener("input", (e) => {
        this.ensureAudioContext()
        const trackId = slider.dataset.trackId
        const vol = parseFloat(e.target.value)
        this.setTrackVolume(trackId, vol)
      })
    })

    this.container.querySelector("#ambient-sync-timer-cb")?.addEventListener("change", (e) => {
      this.syncWithTimer = e.target.checked
      this.saveState()
    })

    this.container.querySelector("#ambient-stop-all-btn")?.addEventListener("click", () => {
      this.stopAllTracks()
    })
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
      const vol = this.trackVolumes[trackId] !== undefined ? this.trackVolumes[trackId] : 0.6
      trackGain.gain.setValueAtTime(vol, ctx.currentTime)
      trackGain.connect(this.masterGain)

      const sources = this.createSoundNodes(trackId, ctx, trackGain)

      this.activeNodes.set(trackId, { sources, gainNode: trackGain })
      this.playingTracks.add(trackId)

      this.updateTrackUI(trackId, true)
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
            try { if (s.stop) s.stop(); } catch {}
            try { if (s.disconnect) s.disconnect(); } catch {}
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
  }

  stopAllTracks() {
    const tracks = Array.from(this.playingTracks)
    tracks.forEach((id) => this.stopTrack(id))
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
    const item = this.container.querySelector(`.ambient-track-item[data-track-id="${trackId}"]`)
    if (item) {
      item.classList.toggle("active", isPlaying)
    }
  }

  toggleVisibility(show) {
    const isVisible = this.container.style.display !== "none" && this.container.style.display !== ""
    const target = show !== undefined ? show : !isVisible

    if (target) {
      this.container.style.display = "flex"
      this.container.style.opacity = "1"
    } else {
      this.container.style.display = "none"
    }

    updateSetting("showAmbientSounds", target)
    saveSettings()

    const quickBtn = document.querySelector('.quick-btn[data-toggle="ambientSounds"]')
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
        filter.frequency.value = 1000

        const hp = ctx.createBiquadFilter()
        hp.type = "highpass"
        hp.frequency.value = 200

        source.connect(filter)
        filter.connect(hp)
        hp.connect(destinationGain)
        source.start()
        return [source, filter, hp]
      }

      case "waves": {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 380

        const lfo = ctx.createOscillator()
        lfo.frequency.value = 0.12 // 8-second wave cycle
        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 0.5

        const waveGain = ctx.createGain()
        waveGain.gain.value = 0.6

        lfo.connect(lfoGain)
        lfoGain.connect(waveGain.gain)

        source.connect(filter)
        filter.connect(waveGain)
        waveGain.connect(destinationGain)

        source.start()
        lfo.start()
        return [source, filter, waveGain, lfo, lfoGain]
      }

      case "wind": {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "bandpass"
        filter.frequency.value = 400
        filter.Q.value = 2.5

        source.connect(filter)
        filter.connect(destinationGain)
        source.start()
        return [source, filter]
      }

      case "fire": {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "bandpass"
        filter.frequency.value = 250
        filter.Q.value = 1.2

        source.connect(filter)
        filter.connect(destinationGain)
        source.start()
        return [source, filter]
      }

      case "stream": {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "bandpass"
        filter.frequency.value = 750
        filter.Q.value = 2.0

        source.connect(filter)
        filter.connect(destinationGain)
        source.start()
        return [source, filter]
      }

      case "brownnoise": {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 220

        source.connect(filter)
        filter.connect(destinationGain)
        source.start()
        return [source, filter]
      }

      case "pinknoise": {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 600

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
