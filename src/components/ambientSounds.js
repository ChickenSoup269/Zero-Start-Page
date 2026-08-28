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
      { id: "thunder", name: "Thunder", i18nKey: "ambient_thunder", icon: "fa-cloud-bolt" },
      { id: "waves", name: "Waves", i18nKey: "ambient_waves", icon: "fa-water" },
      { id: "wind", name: "Wind", i18nKey: "ambient_wind", icon: "fa-wind" },
      { id: "fire", name: "Campfire", i18nKey: "ambient_fire", icon: "fa-fire" },
      { id: "birds", name: "Forest Birds", i18nKey: "ambient_birds", icon: "fa-dove" },
      { id: "crickets", name: "Night Crickets", i18nKey: "ambient_crickets", icon: "fa-moon" },
      { id: "stream", name: "Stream", i18nKey: "ambient_stream", icon: "fa-water-ladder" },
      { id: "cafe", name: "Cozy Cafe", i18nKey: "ambient_cafe", icon: "fa-mug-hot" },
      { id: "space", name: "Cosmic Drone", i18nKey: "ambient_space", icon: "fa-meteor" },
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

      case "thunder": {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 130

        const lfo = ctx.createOscillator()
        lfo.frequency.value = 0.08 // slow deep rolling thunder
        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 0.6

        const rumbleGain = ctx.createGain()
        rumbleGain.gain.value = 0.8

        lfo.connect(lfoGain)
        lfoGain.connect(rumbleGain.gain)

        source.connect(filter)
        filter.connect(rumbleGain)
        rumbleGain.connect(destinationGain)

        source.start()
        lfo.start()
        return [source, filter, rumbleGain, lfo, lfoGain]
      }

      case "birds": {
        // Nature forest birds chirping
        const osc = ctx.createOscillator()
        osc.type = "sine"
        osc.frequency.setValueAtTime(2800, ctx.currentTime)

        // Frequency modulation for bird chirps
        const lfo = ctx.createOscillator()
        lfo.type = "sine"
        lfo.frequency.value = 3.5

        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 600

        lfo.connect(lfoGain)
        lfoGain.connect(osc.frequency)

        // Periodic volume envelope
        const tremolo = ctx.createOscillator()
        tremolo.frequency.value = 0.8
        const tremoloGain = ctx.createGain()
        tremoloGain.gain.value = 0.35

        const mainGain = ctx.createGain()
        mainGain.gain.value = 0.3

        tremolo.connect(tremoloGain)
        tremoloGain.connect(mainGain.gain)

        osc.connect(mainGain)
        mainGain.connect(destinationGain)

        osc.start()
        lfo.start()
        tremolo.start()
        return [osc, lfo, lfoGain, tremolo, tremoloGain, mainGain]
      }

      case "crickets": {
        // Night crickets
        const osc1 = ctx.createOscillator()
        osc1.type = "triangle"
        osc1.frequency.value = 4600

        const osc2 = ctx.createOscillator()
        osc2.type = "sine"
        osc2.frequency.value = 4850

        const lfo = ctx.createOscillator()
        lfo.type = "square"
        lfo.frequency.value = 14

        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 0.25

        const cricketGain = ctx.createGain()
        cricketGain.gain.value = 0.2

        lfo.connect(lfoGain)
        lfoGain.connect(cricketGain.gain)

        osc1.connect(cricketGain)
        osc2.connect(cricketGain)
        cricketGain.connect(destinationGain)

        osc1.start()
        osc2.start()
        lfo.start()
        return [osc1, osc2, lfo, lfoGain, cricketGain]
      }

      case "cafe": {
        // Warm cafe ambience murmur
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter1 = ctx.createBiquadFilter()
        filter1.type = "bandpass"
        filter1.frequency.value = 500
        filter1.Q.value = 1.8

        const filter2 = ctx.createBiquadFilter()
        filter2.type = "lowpass"
        filter2.frequency.value = 1200

        source.connect(filter1)
        filter1.connect(filter2)
        filter2.connect(destinationGain)
        source.start()
        return [source, filter1, filter2]
      }

      case "space": {
        // Deep cosmic meditative drone (432Hz harmonic root & fifths)
        const osc1 = ctx.createOscillator()
        osc1.type = "sine"
        osc1.frequency.value = 108 // Root bass

        const osc2 = ctx.createOscillator()
        osc2.type = "sine"
        osc2.frequency.value = 162 // Fifth

        const osc3 = ctx.createOscillator()
        osc3.type = "triangle"
        osc3.frequency.value = 216 // Octave

        const filter = ctx.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 350

        const droneGain = ctx.createGain()
        droneGain.gain.value = 0.35

        osc1.connect(filter)
        osc2.connect(filter)
        osc3.connect(filter)
        filter.connect(droneGain)
        droneGain.connect(destinationGain)

        osc1.start()
        osc2.start()
        osc3.start()
        return [osc1, osc2, osc3, filter, droneGain]
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
