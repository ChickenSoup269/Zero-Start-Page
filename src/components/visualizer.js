// Music Visualizer Component
import { getSettings } from "../services/state.js"

class MusicVisualizer {
  constructor() {
    this.container = null
    this.bars = []
    this.isPlaying = false
    this.animationId = null
    this.barCount = 4
    this.currentStyle = "vinyl"
    // Pixel canvas state
    this.pixelCanvas = null
    this.pixelAnimId = null
    this.pixelPhase = []
    this.pixelSpeeds = []
    this.peakIdx = [] // segment index (integer) for each bar's peak
    this.peakTimer = 0 // accumulator for step-based drop
    this._lastTs = 0
    // Simulate phase and speeds for purely animative visualizer
    this._simPhase = Array.from({ length: 10 }, (_, i) => i * 1.1)
    this._simSpeeds = Array.from(
      { length: 10 },
      () => 1.5 + Math.random() * 2.0,
    )
    this._realBands = null
    this._audioChannel = null
    this._currentScales = []
    this._initAudioChannel()

    // Caching layout/config to avoid layout thrashing
    this.cachedW = 276
    this.cachedH = 60
    this.cachedParentWidth = 276
    this.cachedParentHeight = 60
    this.cachedAccent = "#64f4d2"
    this.isWhiteBlurCached = false
    this._cpuSave = getSettings().musicVisualizerCpuSave !== false
    this.isWhiteModeCached = false
    this._lastConfigCheck = 0
    this._resizeListener = () => {
      clearTimeout(this._resizeTimeout)
      this._resizeTimeout = setTimeout(() => this.updateDimensions(), 150)
    }

    this._visibilityListener = () => {
      if (document.visibilityState === "visible") {
        this._lastTs = 0
        this._lastFrameTime = 0
        this.updateDimensions()
        if (this.isPlaying) {
          this.start()
        }
      } else {
        this._lastTs = 0
        this._lastFrameTime = 0
        this._stopAll()
      }
    }
  }

  init(musicPlayerContainer) {
    this.container = document.createElement("div")
    this.container.className = "music-visualizer"

    for (let i = 0; i < this.barCount; i++) {
      const bar = document.createElement("div")
      bar.className = "visualizer-bar"
      this.bars.push(bar)
      this.container.appendChild(bar)
    }

    const playerWrapper = musicPlayerContainer.querySelector(
      ".music-player-wrapper",
    )
    if (playerWrapper) {
      playerWrapper.appendChild(this.container)
    }

    window.addEventListener("resize", this._resizeListener)
    document.addEventListener("visibilitychange", this._visibilityListener)
    this.updateDimensions()
    this.setStyle(getSettings().musicBarStyle || "vinyl")
  }

  _scheduleDimensionUpdates() {
    if (this._dimTimeouts) {
      this._dimTimeouts.forEach((t) => clearTimeout(t))
    }
    this._dimTimeouts = []
    ;[0, 30, 80, 150, 250, 400].forEach((delay) => {
      const t = setTimeout(() => {
        this.updateDimensions()
      }, delay)
      this._dimTimeouts.push(t)
    })
  }

  _stopAll() {
    this._stopCSSLoop()
    this._stopPixel()
    this._stopMoon8()
    this._stopHeartbeat()
    this._stopForest()
    this._stopBeach()
    this._stopOrbit()
    if (this.container) {
      this.container.querySelectorAll("canvas").forEach((c) => c.remove())
      this.container.style.position = ""
      this.container.style.top = ""
      this.container.style.left = ""
      this.container.style.width = ""
      this.container.style.height = ""
      this.container.style.margin = ""
      this.container.style.overflow = ""
    }
    this.bars.forEach((b) => (b.style.display = ""))
  }

  setStyle(style) {
    this.currentStyle = style

    let newBarCount = 5
    if (style === "vinyl" || style === "apple") newBarCount = 6
    if (style === "neon") newBarCount = 8
    if (style === "minimal") newBarCount = 6
    if (style === "pill") newBarCount = 4
    if (style === "overlap") newBarCount = 9
    if (style === "spotify" || style === "sidebar") newBarCount = 5
    if (style === "soundcloud") newBarCount = 10
    if (style === "terminal") newBarCount = 12
    if (
      style === "heartbeat" ||
      style === "moon8" ||
      style === "forest" ||
      style === "beach" ||
      style === "orbit"
    )
      newBarCount = 0
    if (style === "square-thumb") newBarCount = 5

    // Stop all active visualizers completely and clean up DOM/state
    this._stopAll()

    this.barCount = newBarCount
    this._recreateBars()

    this.updateDimensions()
    this._scheduleDimensionUpdates()

    if (this.isPlaying) {
      if (style === "pixel") this._startPixel()
      else if (style === "moon8") this._startMoon8()
      else if (style === "heartbeat") this._startHeartbeat()
      else if (style === "orbit") this._startOrbit()
      else if (style === "forest") this._startForest()
      else if (style === "beach") this._startBeach()
      else this._startCSSLoop()
    }
  }

  updateDimensions() {
    if (!this.container) return
    const parent = this.container.parentNode
    if (!parent) return

    const rect = this.container.getBoundingClientRect()
    const parentRect = parent.getBoundingClientRect?.()

    this.cachedW = Math.round(
      rect.width || this.container.offsetWidth || parent.offsetWidth || 276,
    )
    this.cachedH = Math.round(
      rect.height || this.container.offsetHeight || parent.offsetHeight || 60,
    )
    this.cachedParentWidth = Math.round(
      parentRect?.width || parent.offsetWidth || this.cachedW,
    )
    this.cachedParentHeight = Math.round(
      parentRect?.height || parent.offsetHeight || this.cachedH,
    )

    this.cachedAccent =
      getComputedStyle(parent).getPropertyValue("--accent-color").trim() ||
      "#64f4d2"

    this.isWhiteBlurCached =
      parent.classList.contains("skin-white-blur") ||
      document.body.classList.contains("quick-access-white")

    this._cpuSave = getSettings().musicVisualizerCpuSave !== false
    this.isWhiteModeCached =
      document.body.classList.contains("quick-access-white") ||
      this.container.closest(".skin-white-blur") !== null ||
      this.container.classList.contains("skin-white-blur") ||
      document.querySelector(".side-controls")?.classList.contains("light-mode")
  }

  // ── Orbit Visualizer ──────────────────────────────────────────────────────

  _startOrbit() {
    this._stopOrbit()
    this.bars.forEach((b) => (b.style.display = "none"))
    const canvas = document.createElement("canvas")
    canvas.className = "orbit-wave-canvas"
    canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"
    this.orbitCanvas = canvas
    if (this.container) {
      this.container.style.position = "absolute"
      this.container.appendChild(canvas)
    }

    this.updateDimensions()
    this._lastTs = 0
    this._lastFrameTime = 0
    this._lastConfigCheck = performance.now()

    const loop = (ts) => {
      if (this.currentStyle !== "orbit") return
      this.orbitAnimId = requestAnimationFrame(loop)

      if (!this._lastTs) {
        this._lastTs = ts
        this._lastFrameTime = ts
        return
      }

      const isCpuSave = this._cpuSave !== false
      const elapsed = ts - this._lastFrameTime
      if (isCpuSave && elapsed < 33) return // Lock to ~30 FPS only in CPU-save mode
      this._lastFrameTime = ts - (elapsed % (isCpuSave ? 33 : 1))

      if (ts - this._lastConfigCheck > 200) {
        this._lastConfigCheck = ts
        this.updateDimensions()
      }

      const dt = Math.min((ts - this._lastTs) / 1000, 0.05)
      this._lastTs = ts
      this._orbitFrame(dt)
    }
    this.orbitAnimId = requestAnimationFrame(loop)
  }

  _stopOrbit() {
    if (this.orbitAnimId) {
      cancelAnimationFrame(this.orbitAnimId)
      this.orbitAnimId = null
    }
    if (this.orbitCanvas) {
      this.orbitCanvas.remove()
      this.orbitCanvas = null
    }
    if (this.container) {
      this.container.style.position = ""
    }
    this.bars.forEach((b) => (b.style.display = ""))
  }

  _orbitFrame(dt) {
    const canvas = this.orbitCanvas
    if (!canvas) return
    const W = this.cachedW
    const H = this.cachedH
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const targetW = Math.floor(W * dpr)
    const targetH = Math.floor(H * dpr)
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW
      canvas.height = targetH
    }
    const ctx = canvas.getContext("2d")
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    // Audio Reactive Beat Calculation
    this._orbitSimTime = (this._orbitSimTime || 0) + dt
    const simTime = this._orbitSimTime

    const isReactive = getSettings().musicRealAudioReactive === true
    const bandsCount = this._realBands?.length || 0
    const hasRealAudio = Boolean(this._realBands && bandsCount > 0)

    let targetBass = 0.15
    let targetMid = 0.1
    if (this.isPlaying) {
      if (isReactive) {
        if (hasRealAudio) {
          const b0 = this._realBands[0] || 0
          const b1 = this._realBands[1] || 0
          const b2 = this._realBands[2] || 0
          targetBass = Math.min(1.0, Math.pow((b0 + b1) / 2, 0.42) * 1.85)
          targetMid = Math.min(1.0, Math.pow(b2, 0.45) * 1.5)
        } else {
          const bpm = 128
          const beatPhase = (simTime * (bpm / 60)) % 1
          const kick = Math.pow(Math.max(0, 1 - beatPhase * 3.0), 2.2)
          const sub = Math.sin(simTime * 9.5) * 0.5 + 0.5
          targetBass = Math.max(0.1, kick * 1.15 + sub * 0.25)
          targetMid = (Math.sin(simTime * 14.0) * 0.5 + 0.5) * 0.4
        }
      } else {
        targetBass = 0.28 + Math.sin(simTime * 5.0) * 0.14
        targetMid = 0.2
      }
    } else {
      targetBass = 0
      targetMid = 0
    }

    const smoothing = targetBass > (this._orbitBass || 0) ? 0.8 : 0.35
    this._orbitBass =
      (this._orbitBass || 0) + (targetBass - (this._orbitBass || 0)) * smoothing
    const bass = this._orbitBass

    this.orbitPhase =
      (this.orbitPhase || 0) + dt * (this.isPlaying ? 0.75 + bass * 0.6 : 0.15)
    const cx = W / 2
    const cy = H / 2
    const playerSize = Math.min(this.cachedParentWidth, this.cachedParentHeight)
    const baseRadius = Math.min(playerSize / 2 + 8, Math.min(W, H) / 2 - 58)
    const isWhiteBlur = this.isWhiteBlurCached
    const accent = isWhiteBlur ? "#000000" : this.cachedAccent || "#64f4d2"
    const isCpuSave = this._cpuSave !== false

    // 1. Concentric NCS Shockwave Pulse Rings
    const drawNcsRing = (phaseOffset, alphaBase, width, expansion, holdEnd) => {
      const phase = this.isPlaying ? (this.orbitPhase + phaseOffset) % 1 : 0.08
      const attack = phase < 0.16 ? phase / 0.16 : 1
      const hold =
        phase < holdEnd ? 1 : Math.max(0, 1 - (phase - holdEnd) / (1 - holdEnd))
      const punch = Math.sin(Math.min(phase / 0.22, 1) * Math.PI * 0.5)
      const easeOut = 1 - Math.pow(1 - phase, 2.4)
      const beatLift = bass * Math.pow(hold, 1.6)
      const radius =
        baseRadius -
        6 +
        punch * (3 + beatLift * 10) +
        easeOut * (expansion + bass * 14)
      const alpha =
        alphaBase *
        Math.pow(hold, 1.15) *
        (this.isPlaying ? 0.25 + attack * 0.75 : 0.38)

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.lineWidth = width + beatLift * 2.8
      ctx.shadowBlur = isWhiteBlur
        ? 0
        : isCpuSave
          ? 6 + beatLift * 8
          : 10 + punch * 12 + beatLift * 18
      ctx.shadowColor = accent
      ctx.strokeStyle = accent
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    ctx.lineJoin = "round"
    ctx.lineCap = "round"

    drawNcsRing(0, 0.95, 4.0, 26, 0.4)
    drawNcsRing(0.25, 0.65, 3.2, 20, 0.3)
    drawNcsRing(0.5, 0.45, 2.4, 16, 0.24)
    drawNcsRing(0.75, 0.3, 1.8, 12, 0.18)

    // 2. Harmonic Audio Wave Perimeter Ring (Beat Spectrum Ripples)
    if (this.isPlaying) {
      ctx.save()
      ctx.strokeStyle = accent
      ctx.lineWidth = 1.6 + bass * 1.8
      ctx.globalAlpha = (0.55 + bass * 0.4) * (isWhiteBlur ? 0.4 : 0.85)
      ctx.shadowBlur = isWhiteBlur ? 0 : 6 + bass * 10
      ctx.shadowColor = accent
      ctx.beginPath()
      const segs = 90
      for (let j = 0; j <= segs; j++) {
        const ang = (j / segs) * Math.PI * 2
        const harmonic =
          Math.sin(ang * 12 + simTime * 7.5) * (1.2 + bass * 4.2) +
          Math.cos(ang * 24 - simTime * 9.0) * (0.6 + bass * 2.5)
        const r = baseRadius - 4 + harmonic
        const px = cx + Math.cos(ang) * r
        const py = cy + Math.sin(ang) * r
        if (j === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
      ctx.restore()
    }

    // 3. Central Disc Aura Ring
    ctx.save()
    ctx.shadowBlur = 0
    ctx.globalAlpha = isWhiteBlur ? 0.18 : 0.35 + bass * 0.35
    ctx.lineWidth = 1.2 + bass * 0.8
    ctx.strokeStyle = isWhiteBlur ? "rgba(0,0,0,0.3)" : accent
    ctx.beginPath()
    ctx.arc(cx, cy, baseRadius - 8, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  _startBeach() {
    this._stopBeach()
    this.bars.forEach((b) => (b.style.display = "none"))
    const canvas = document.createElement("canvas")
    canvas.className = "beach-canvas"
    canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;"
    this.beachCanvas = canvas
    if (this.container) {
      this.container.classList.add("is-canvas-mode")
      this.container.style.position = "absolute"
      this.container.style.top = "0"
      this.container.style.left = "0"
      this.container.style.width = "100%"
      this.container.style.height = "100%"
      this.container.appendChild(canvas)
    }

    this.updateDimensions()
    this._lastTs = 0
    this._lastFrameTime = 0
    this._lastConfigCheck = performance.now()

    const loop = (ts) => {
      if (this.currentStyle !== "beach") return
      this.beachAnimId = requestAnimationFrame(loop)

      if (!this._lastTs) {
        this._lastTs = ts
        this._lastFrameTime = ts
        return
      }

      const isCpuSave = this._cpuSave !== false
      const elapsed = ts - this._lastFrameTime
      if (isCpuSave && elapsed < 33) return // Lock to ~30 FPS only in CPU-save
      this._lastFrameTime = ts - (elapsed % (isCpuSave ? 33 : 1))

      if (ts - this._lastConfigCheck > 200) {
        this._lastConfigCheck = ts
        this.updateDimensions()
      }

      const dt = Math.min((ts - this._lastTs) / 1000, 0.05)
      this._lastTs = ts
      this._beachFrame(dt)
    }
    this.beachAnimId = requestAnimationFrame(loop)
  }

  _stopBeach() {
    if (this.beachAnimId) {
      cancelAnimationFrame(this.beachAnimId)
      this.beachAnimId = null
    }
    if (this.beachCanvas) {
      this.beachCanvas.remove()
      this.beachCanvas = null
    }
    if (this.container) {
      this.container.classList.remove("is-canvas-mode")
      this.container.style.position = ""
      this.container.style.top = ""
      this.container.style.left = ""
      this.container.style.width = ""
      this.container.style.height = ""
    }
    this.bars.forEach((b) => (b.style.display = ""))
  }

  _beachFrame(dt) {
    const canvas = this.beachCanvas
    if (!canvas) return
    const W =
      this.cachedParentWidth ||
      this.container?.parentElement?.offsetWidth ||
      340
    const H =
      this.cachedParentHeight ||
      this.container?.parentElement?.offsetHeight ||
      90

    if (canvas.width !== W * 2 || canvas.height !== H * 2) {
      canvas.width = W * 2
      canvas.height = H * 2
    }
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(2, 2)

    if (!this._beachSimTime) this._beachSimTime = 0
    this._beachSimTime += dt
    const simTime = this._beachSimTime

    const isReactive = getSettings().musicRealAudioReactive === true
    const bandsCount = this._realBands?.length || 0
    const hasRealAudio = Boolean(this._realBands && bandsCount > 0)

    let bassNorm = 0
    let midNorm = 0
    let highNorm = 0

    if (this.isPlaying && isReactive) {
      if (hasRealAudio) {
        bassNorm = Math.min(1.0, Math.pow(this._realBands[0] || 0, 0.4) * 1.95)
        midNorm = Math.min(
          1.0,
          Math.pow(this._realBands[Math.min(2, bandsCount - 1)] || 0, 0.45) *
            1.75,
        )
        highNorm = Math.min(
          1.0,
          Math.pow(this._realBands[Math.min(5, bandsCount - 1)] || 0, 0.45) *
            1.6,
        )
      } else {
        const bpm = 128
        const beatPhase = (simTime * (bpm / 60)) % 1
        const kick = Math.pow(Math.max(0, 1 - beatPhase * 3.0), 2.2)
        const sub = Math.sin(simTime * 8.5) * 0.5 + 0.5
        const midBounce = (Math.sin(simTime * 14.0) * 0.5 + 0.5) * 0.5
        const hat = (Math.sin(simTime * 24.0) * 0.5 + 0.5) * 0.35
        bassNorm = Math.min(1.0, kick * 1.15 + sub * 0.25)
        midNorm = Math.min(1.0, midBounce * 0.75 + hat * 0.35)
        highNorm = Math.min(1.0, hat * 0.9)
      }
    }

    if (!this._beachSmoothedNorm) this._beachSmoothedNorm = 0
    const attack = bassNorm > this._beachSmoothedNorm ? 0.65 : 0.25
    this._beachSmoothedNorm += (bassNorm - this._beachSmoothedNorm) * attack
    const norm = this._beachSmoothedNorm

    const isWhiteBlur = this.isWhiteBlurCached
    const accent = this.cachedAccent || "#00b4d8"

    // 0. Soft ambient oceanic glow aura
    if (isReactive && this.isPlaying && norm > 0.05 && !isWhiteBlur) {
      const auraGrad = ctx.createRadialGradient(
        W / 2,
        H * 0.65,
        0,
        W / 2,
        H * 0.65,
        W * (0.35 + norm * 0.35),
      )
      auraGrad.addColorStop(0, accent)
      auraGrad.addColorStop(1, "transparent")
      ctx.save()
      ctx.fillStyle = auraGrad
      ctx.globalAlpha = 0.1 + norm * 0.18
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
    }

    // Function to get audio frequency value interpolated at position x (0..1)
    const getAudioFreqAt = (normX) => {
      if (!isReactive || !this.isPlaying) return 0
      if (hasRealAudio) {
        const idx = Math.min(bandsCount - 1, Math.floor(normX * bandsCount))
        const val = this._realBands[idx] || 0
        return Math.min(1.0, Math.pow(val, 0.42) * 1.8)
      }
      return (
        Math.sin(simTime * 6.0 + normX * Math.PI * 4) * 0.35 * norm +
        norm * 0.65
      )
    }

    // 1. Layer 1: Deep Ocean Background Swell
    ctx.save()
    const deepGrad = ctx.createLinearGradient(0, H * 0.45, 0, H)
    deepGrad.addColorStop(
      0,
      isWhiteBlur ? "rgba(0,0,0,0.18)" : "rgba(0, 119, 182, 0.55)",
    )
    deepGrad.addColorStop(
      1,
      isWhiteBlur ? "rgba(0,0,0,0.30)" : "rgba(3, 4, 94, 0.75)",
    )
    ctx.fillStyle = deepGrad
    ctx.beginPath()
    ctx.moveTo(0, H)
    for (let x = 0; x <= W; x += 4) {
      const u = x / W
      const freq = getAudioFreqAt(u * 0.6)
      const waveY =
        H * (0.54 - norm * 0.1) +
        Math.sin(x * 0.012 + simTime * 1.5) * (7 + norm * 12) +
        Math.cos(x * 0.022 - simTime * 1.2) * 3 -
        freq * (H * 0.18)
      ctx.lineTo(x, waveY)
    }
    ctx.lineTo(W, H)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // 2. Layer 2: Tropical Cyan Mid-Wave (Surges with mids & vocals)
    ctx.save()
    const midGrad = ctx.createLinearGradient(0, H * 0.58, 0, H)
    midGrad.addColorStop(
      0,
      isWhiteBlur ? "rgba(0,0,0,0.14)" : accent || "rgba(72, 202, 228, 0.65)",
    )
    midGrad.addColorStop(
      1,
      isWhiteBlur ? "rgba(0,0,0,0.22)" : "rgba(0, 150, 199, 0.65)",
    )
    ctx.fillStyle = midGrad
    ctx.beginPath()
    ctx.moveTo(0, H)
    for (let x = 0; x <= W; x += 3) {
      const u = x / W
      const freq = getAudioFreqAt(0.2 + u * 0.6)
      const waveY =
        H * (0.66 - norm * 0.08) +
        Math.sin(x * 0.018 + simTime * 2.2) * (8 + norm * 14) +
        Math.cos(x * 0.035 - simTime * 1.8) * (4 + midNorm * 6) -
        freq * (H * 0.22)
      ctx.lineTo(x, waveY)
    }
    ctx.lineTo(W, H)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // 3. Layer 3: Foreground Luminous Foam Wave (Shimmers with treble and beats)
    ctx.save()
    const foreGrad = ctx.createLinearGradient(0, H * 0.7, 0, H)
    foreGrad.addColorStop(
      0,
      isWhiteBlur ? "rgba(0,0,0,0.25)" : "rgba(224, 251, 252, 0.92)",
    )
    foreGrad.addColorStop(
      1,
      isWhiteBlur ? "rgba(0,0,0,0.40)" : "rgba(72, 202, 228, 0.85)",
    )
    ctx.fillStyle = foreGrad

    // Collect points to draw both fill and glowing crest stroke
    const crestPoints = []
    for (let x = 0; x <= W; x += 3) {
      const u = x / W
      const freq = getAudioFreqAt(u)
      const waveY =
        H * (0.76 - norm * 0.07) +
        Math.sin(x * 0.024 + simTime * 3.0) * (9 + norm * 16) +
        Math.cos(x * 0.048 - simTime * 2.4) * (3 + highNorm * 5) -
        freq * (H * 0.26)
      crestPoints.push({ x, y: waveY })
    }

    ctx.beginPath()
    ctx.moveTo(0, H)
    crestPoints.forEach((pt, i) => {
      if (i === 0) ctx.lineTo(pt.x, pt.y)
      else ctx.lineTo(pt.x, pt.y)
    })
    ctx.lineTo(W, H)
    ctx.closePath()
    ctx.fill()

    // Glowing Crest Line
    ctx.beginPath()
    crestPoints.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y)
      else ctx.lineTo(pt.x, pt.y)
    })
    ctx.strokeStyle = isWhiteBlur
      ? "rgba(0,0,0,0.6)"
      : "rgba(255, 255, 255, 0.95)"
    ctx.lineWidth = 1.8 + highNorm * 1.2
    ctx.shadowColor = isWhiteBlur ? "transparent" : accent || "#48cae4"
    ctx.shadowBlur = isWhiteBlur ? 0 : 8 + norm * 8
    ctx.stroke()
    ctx.restore()

    // 4. Ambient floating foam sparkles
    if (!this._beachParticles || this._beachParticles.length < 18) {
      this._beachParticles = []
      for (let i = 0; i < 18; i++) {
        this._beachParticles.push({
          x: Math.random() * W,
          y: H * 0.5 + Math.random() * (H * 0.5),
          radius: 1 + Math.random() * 2.2,
          vy: -(0.4 + Math.random() * 1.2),
          vx: (Math.random() - 0.5) * 1.2,
          alpha: 0.35 + Math.random() * 0.55,
        })
      }
    }

    ctx.save()
    this._beachParticles.forEach((p) => {
      if (this.isPlaying) {
        p.y += p.vy * (1 + norm * 2.5) * dt * 30
        p.x += p.vx * (1 + midNorm * 1.2) * dt * 30
        if (p.y < H * 0.38 || p.alpha <= 0.05) {
          p.x = Math.random() * W
          p.y = H * 0.75 + Math.random() * (H * 0.25)
          p.alpha = 0.35 + Math.random() * 0.55
        }
      }
      ctx.fillStyle = isWhiteBlur ? "rgba(0,0,0,0.3)" : "#ffffff"
      ctx.globalAlpha = p.alpha * (0.6 + norm * 0.4)
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius * (1 + norm * 0.6), 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.restore()

    ctx.restore()
  }

  _startForest() {
    this._stopForest()
    this.bars.forEach((b) => (b.style.display = "none"))
    const canvas = document.createElement("canvas")
    canvas.className = "forest-canvas"
    canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;"
    this.forestCanvas = canvas
    if (this.container) {
      this.container.classList.add("is-canvas-mode")
      this.container.style.position = "absolute"
      this.container.style.top = "0"
      this.container.style.left = "0"
      this.container.style.width = "100%"
      this.container.style.height = "100%"
      this.container.style.margin = "0"
      this.container.appendChild(canvas)
    }

    // Tạo mạng lưới dây leo ngẫu nhiên cố định
    this.forestVines = []
    for (let i = 0; i < 15; i++) {
      const isTop = Math.random() > 0.4 // 60% dây leo từ trên xuống
      this.forestVines.push({
        isTop,
        startX: Math.random() * 300,
        startY: isTop ? -5 : 65,
        length: 20 + Math.random() * 40,
        curve: (Math.random() - 0.5) * 40,
        color: ["#1b5e20", "#2e7d32", "#388e3c", "#43a047"][
          Math.floor(Math.random() * 4)
        ],
        thickness: 0.8 + Math.random() * 1.5,
        speed: 0.3 + Math.random() * 0.7,
        leafNodes: Array.from({ length: 3 }, () => Math.random()),
      })
    }

    this.forestParticles = []
    for (let i = 0; i < 20; i++) {
      this.forestParticles.push(this._createForestParticle(true))
    }

    this.updateDimensions()
    this._lastTs = 0
    this._lastFrameTime = 0
    this._lastConfigCheck = performance.now()

    const loop = (ts) => {
      if (this.currentStyle !== "forest") return
      this.forestAnimId = requestAnimationFrame(loop)

      if (!this._lastTs) {
        this._lastTs = ts
        this._lastFrameTime = ts
        return
      }

      const isCpuSave = this._cpuSave !== false
      const elapsed = ts - this._lastFrameTime
      if (isCpuSave && elapsed < 33) return // Lock to ~30 FPS only in CPU-save
      this._lastFrameTime = ts - (elapsed % (isCpuSave ? 33 : 1))

      if (ts - this._lastConfigCheck > 200) {
        this._lastConfigCheck = ts
        this.updateDimensions()
      }

      const dt = Math.min((ts - this._lastTs) / 1000, 0.05)
      this._lastTs = ts
      this._forestFrame(dt)
    }
    this.forestAnimId = requestAnimationFrame(loop)
  }

  _stopForest() {
    if (this.forestAnimId) {
      cancelAnimationFrame(this.forestAnimId)
      this.forestAnimId = null
    }
    if (this.forestCanvas) {
      this.forestCanvas.remove()
      this.forestCanvas = null
    }
    this.forestParticles = []
    this.forestVines = []
    if (this.container) {
      this.container.classList.remove("is-canvas-mode")
      this.container.style.position = ""
      this.container.style.top = ""
      this.container.style.left = ""
      this.container.style.width = ""
      this.container.style.height = ""
      this.container.style.margin = ""
    }
    this.bars.forEach((b) => (b.style.display = ""))
  }

  _createForestParticle(randomY = false) {
    const isFlower = Math.random() > 0.7
    return {
      x: Math.random() * 300,
      y: randomY ? Math.random() * 60 : -10,
      size: 2 + Math.random() * 4,
      speed: 10 + Math.random() * 20,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 2,
      type: isFlower ? "flower" : "leaf",
      color: isFlower
        ? ["#ff8a80", "#ffd180", "#ea80fc"][Math.floor(Math.random() * 3)]
        : ["#81c784", "#a5d6a7", "#66bb6a"][Math.floor(Math.random() * 3)],
      phase: Math.random() * Math.PI * 2,
    }
  }

  _forestFrame(dt) {
    const canvas = this.forestCanvas
    if (!canvas) return
    const W =
      this.cachedParentWidth ||
      this.container?.parentElement?.offsetWidth ||
      340
    const H =
      this.cachedParentHeight ||
      this.container?.parentElement?.offsetHeight ||
      90

    if (canvas.width !== W * 2 || canvas.height !== H * 2) {
      canvas.width = W * 2
      canvas.height = H * 2
    }
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(2, 2)

    this._forestSimTime = (this._forestSimTime || 0) + dt
    const simTime = this._forestSimTime

    const isReactive = getSettings().musicRealAudioReactive === true
    const bandsCount = this._realBands?.length || 0
    const hasRealAudio = Boolean(this._realBands && bandsCount > 0)

    let bassNorm = 0
    let midNorm = 0
    let highNorm = 0

    if (this.isPlaying && isReactive) {
      if (hasRealAudio) {
        bassNorm = Math.min(1.0, Math.pow(this._realBands[0] || 0, 0.4) * 1.95)
        midNorm = Math.min(
          1.0,
          Math.pow(this._realBands[Math.min(2, bandsCount - 1)] || 0, 0.45) *
            1.75,
        )
        highNorm = Math.min(
          1.0,
          Math.pow(this._realBands[Math.min(5, bandsCount - 1)] || 0, 0.45) *
            1.6,
        )
      } else {
        const bpm = 128
        const beatPhase = (simTime * (bpm / 60)) % 1
        const kick = Math.pow(Math.max(0, 1 - beatPhase * 3.0), 2.2)
        const sub = Math.sin(simTime * 8.5) * 0.5 + 0.5
        const midBounce = (Math.sin(simTime * 14.0) * 0.5 + 0.5) * 0.5
        const hat = (Math.sin(simTime * 24.0) * 0.5 + 0.5) * 0.35
        bassNorm = Math.min(1.0, kick * 1.15 + sub * 0.25)
        midNorm = Math.min(1.0, midBounce * 0.75 + hat * 0.35)
        highNorm = Math.min(1.0, hat * 0.9)
      }
    }

    if (!this._forestSmoothedNorm) this._forestSmoothedNorm = 0
    const attack = bassNorm > this._forestSmoothedNorm ? 0.65 : 0.25
    this._forestSmoothedNorm += (bassNorm - this._forestSmoothedNorm) * attack
    const norm = this._forestSmoothedNorm

    const isWhiteBlur = this.isWhiteBlurCached
    const accent = this.cachedAccent || "#4caf50"

    // 0. Ethereal Bioluminescent Canopy Mist Aura in background
    if (isReactive && this.isPlaying && norm > 0.05 && !isWhiteBlur) {
      const auraGrad = ctx.createRadialGradient(
        W / 2,
        H * 0.55,
        0,
        W / 2,
        H * 0.55,
        W * (0.35 + norm * 0.35),
      )
      auraGrad.addColorStop(0, accent)
      auraGrad.addColorStop(1, "transparent")
      ctx.save()
      ctx.fillStyle = auraGrad
      ctx.globalAlpha = 0.12 + norm * 0.2
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
    }

    // 1. Swaying Hanging Forest Vines
    ctx.save()
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    this.forestVines.forEach((v, idx) => {
      ctx.beginPath()
      ctx.strokeStyle = isWhiteBlur ? "#000000" : v.color
      ctx.lineWidth = v.thickness * (1 + norm * 0.7)
      ctx.globalAlpha = isWhiteBlur ? 0.15 + norm * 0.2 : 0.25 + norm * 0.3

      const time = simTime * (v.speed + norm * 0.4)
      const sway = Math.sin(time + idx) * (v.curve + norm * 28)

      const startX = v.startX * (W / 300)
      const startY = v.isTop ? -5 : H + 5
      const endY = v.isTop ? v.length * (H / 60) : H - v.length * (H / 60)
      const endX = startX + sway

      ctx.moveTo(startX, startY)
      ctx.bezierCurveTo(
        startX,
        (startY + endY) / 2,
        endX,
        (startY + endY) / 2,
        endX,
        endY,
      )
      ctx.stroke()

      // Leaf & dew nodes
      v.leafNodes.forEach((nodePos, lIdx) => {
        const ly = startY + (endY - startY) * nodePos
        const lx = startX + (endX - startX) * nodePos

        ctx.save()
        ctx.translate(lx, ly)
        ctx.rotate(Math.sin(time + lIdx) * 0.5)
        ctx.fillStyle = isWhiteBlur ? "#000000" : v.color
        const lSize = (2 + v.thickness) * (1 + norm * 0.9)

        ctx.beginPath()
        ctx.ellipse(0, 0, lSize, lSize / 2, Math.PI / 4, 0, Math.PI * 2)
        ctx.fill()

        // Glowing dew drop on leaves
        if (isReactive && this.isPlaying && norm > 0.15) {
          ctx.fillStyle = isWhiteBlur ? "rgba(0,0,0,0.5)" : "#ffffff"
          ctx.beginPath()
          ctx.arc(lSize * 0.8, 0, 1 + norm * 1.2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })
    })
    ctx.restore()

    // 2. Soft Bioluminescent Meadow Wave (Blended seamless frequency carpet)
    if (isReactive && this.isPlaying) {
      ctx.save()
      const pts = []
      const step = 4
      for (let x = 0; x <= W; x += step) {
        const u = x / W
        let freq = 0
        if (hasRealAudio) {
          const bIdx = Math.min(bandsCount - 1, Math.floor(u * bandsCount))
          freq = Math.min(
            1.0,
            Math.pow(this._realBands[bIdx] || 0, 0.42) * 1.85,
          )
        } else {
          freq =
            Math.sin(simTime * 5.0 + u * Math.PI * 3) * 0.35 * norm +
            norm * 0.65
        }
        const ry =
          H * 0.82 -
          freq * (H * 0.32) +
          Math.sin(x * 0.02 + simTime * 2.5) * (3 + norm * 6)
        pts.push({ x, y: ry })
      }

      const meadowGrad = ctx.createLinearGradient(0, H * 0.55, 0, H)
      meadowGrad.addColorStop(
        0,
        isWhiteBlur ? "rgba(0,0,0,0.12)" : "rgba(129, 199, 132, 0.35)",
      )
      meadowGrad.addColorStop(
        1,
        isWhiteBlur ? "rgba(0,0,0,0.25)" : "rgba(46, 125, 50, 0.55)",
      )
      ctx.fillStyle = meadowGrad
      ctx.beginPath()
      ctx.moveTo(0, H)
      pts.forEach((pt, i) => {
        if (i === 0) ctx.lineTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      })
      ctx.lineTo(W, H)
      ctx.closePath()
      ctx.fill()

      // Luminous organic edge
      ctx.beginPath()
      pts.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      })
      ctx.strokeStyle = isWhiteBlur ? "rgba(0,0,0,0.4)" : accent || "#81c784"
      ctx.lineWidth = 1.6 + norm * 1.0
      ctx.shadowColor = isWhiteBlur ? "transparent" : accent || "#81c784"
      ctx.shadowBlur = isWhiteBlur ? 0 : 8 + norm * 8
      ctx.stroke()
      ctx.restore()
    }

    // 3. Grass on the bottom
    ctx.save()
    const grassCount = 18
    for (let i = 0; i < grassCount; i++) {
      const x = (i / (grassCount - 1)) * W
      const h = (12 + Math.sin(i + simTime * 3.5) * 4) * (1 + norm * 1.4)
      ctx.fillStyle = isWhiteBlur
        ? "#000000"
        : i % 2 === 0
          ? "#1b5e20"
          : "#2e7d32"
      ctx.globalAlpha = isWhiteBlur ? 0.2 + norm * 0.3 : 0.5 + norm * 0.4
      ctx.beginPath()
      ctx.moveTo(x - 5, H)
      ctx.quadraticCurveTo(x, H - h, x + 5, H)
      ctx.fill()
    }
    ctx.restore()

    // 4. Floating Fireflies & Petals
    for (let i = this.forestParticles.length - 1; i >= 0; i--) {
      const p = this.forestParticles[i]
      if (this.isPlaying) {
        p.y += p.speed * dt * (1 + norm * 3.5)
        p.rotation += p.rotSpeed * dt * (1 + norm * 6)
        p.x += Math.sin(p.phase + simTime * 2.5) * (5 + norm * 8) * dt
      }

      ctx.save()
      ctx.translate(p.x * (W / 300), p.y * (H / 60))
      ctx.rotate(p.rotation)
      ctx.fillStyle = isWhiteBlur ? "#000000" : p.color
      ctx.globalAlpha = isWhiteBlur ? 0.4 + norm * 0.4 : 0.7 + norm * 0.3

      const pulse = 1 + norm * (p.type === "flower" ? 1.8 : 0.8)

      if (p.type === "leaf") {
        ctx.beginPath()
        ctx.moveTo(0, -p.size * pulse)
        ctx.quadraticCurveTo(p.size * pulse, 0, 0, p.size * pulse)
        ctx.quadraticCurveTo(-p.size * pulse, 0, 0, -p.size * pulse)
        ctx.fill()
      } else {
        for (let j = 0; j < 5; j++) {
          ctx.rotate((Math.PI * 2) / 5)
          ctx.beginPath()
          ctx.arc(p.size * 0.8 * pulse, 0, p.size * 0.5 * pulse, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = isWhiteBlur ? "rgba(0,0,0,0.5)" : "#fff"
        ctx.beginPath()
        ctx.arc(0, 0, p.size * 0.3 * pulse, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()

      if (p.y > 70) {
        this.forestParticles[i] = this._createForestParticle()
      }
    }
    ctx.restore()
  }

  _startHeartbeat() {
    this._stopHeartbeat()
    this.bars.forEach((b) => (b.style.display = "none"))

    const canvas = document.createElement("canvas")
    canvas.className = "heartbeat-canvas"
    canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;"
    this.heartbeatCanvas = canvas

    if (this.container) {
      this.container.appendChild(canvas)
    }

    this.updateDimensions()
    const W = this.cachedW || 276

    // Pre-allocate history buffer for tracking camera
    this._hbHistory = new Float32Array(800).fill(0)
    this._hbDistance = 0
    this._hbStepRemainder = 0
    this._hbCardiacProgress = -1
    this._hbCardiacAmp = 1.0
    this._hbPulseTimer = 0
    this._hbCamY = 0
    this._hbEmbers = []
    this._lastBassEnergy = 0
    this._heartbeatNorm = 0.15
    this._heartbeatSimTime = 0

    // Seed resting baseline
    for (let i = 0; i < Math.min(W, 300); i++) {
      this._hbHistory[i] = (Math.random() - 0.5) * 0.8
    }

    this._lastTs = 0
    this._lastFrameTime = 0
    this._lastConfigCheck = performance.now()

    const loop = (ts) => {
      if (this.currentStyle !== "heartbeat" || !this.isPlaying) return
      this.heartbeatAnimId = requestAnimationFrame(loop)

      if (!this._lastTs) {
        this._lastTs = ts
        this._lastFrameTime = ts
        return
      }

      const isCpuSave = this._cpuSave !== false
      const elapsed = ts - this._lastFrameTime
      if (isCpuSave && elapsed < 33) return // Lock to ~30 FPS only in CPU-save
      this._lastFrameTime = ts - (elapsed % (isCpuSave ? 33 : 1))

      if (ts - this._lastConfigCheck > 200) {
        this._lastConfigCheck = ts
        this.updateDimensions()
      }

      const dt = Math.min((ts - this._lastTs) / 1000, 0.05)
      this._lastTs = ts
      this._heartbeatFrame(dt)
    }
    this.heartbeatAnimId = requestAnimationFrame(loop)
  }

  _stopHeartbeat() {
    if (this.heartbeatAnimId) {
      cancelAnimationFrame(this.heartbeatAnimId)
      this.heartbeatAnimId = null
    }
    if (this.heartbeatCanvas) {
      this.heartbeatCanvas.remove()
      this.heartbeatCanvas = null
    }
    this._hbHistory = null
    this._hbCardiacProgress = -1
    this._hbEmbers = []
    if (this.container) {
      this.container.style.position = ""
    }
    this.bars.forEach((b) => (b.style.display = ""))
  }

  _heartbeatFrame(dt) {
    const canvas = this.heartbeatCanvas
    if (!canvas) return
    const W = Math.max(120, Math.floor(this.cachedW || 276))
    const H = Math.max(30, Math.floor(this.cachedH || 40))

    if (canvas.width !== W * 2 || canvas.height !== H * 2) {
      canvas.width = W * 2
      canvas.height = H * 2
    }

    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.scale(2, 2)

    const isWhiteMode = this.isWhiteModeCached
    let accent = isWhiteMode ? "#000000" : this.cachedAccent || "#ff4d4d"

    // Audio Reactive Beat Calculation
    this._heartbeatSimTime = (this._heartbeatSimTime || 0) + dt
    const simTime = this._heartbeatSimTime

    const isReactive = getSettings().musicRealAudioReactive === true
    const bandsCount = this._realBands?.length || 0
    const hasRealAudio = Boolean(this._realBands && bandsCount > 0)

    if (this.container) {
      this.container.classList.toggle(
        "real-audio-active",
        isReactive && hasRealAudio,
      )
    }

    let targetNorm = 0.15
    const bpm = 128
    const beatPhase = (simTime * (bpm / 60)) % 1
    const kick = Math.pow(Math.max(0, 1 - beatPhase * 3.0), 2.2)

    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      treble = 0,
      bassEnergy = 0,
      instantKick = 0

    if (this.isPlaying) {
      if (isReactive && hasRealAudio) {
        b0 = this._realBands[0] || 0
        b1 = this._realBands[1] || 0
        b2 = this._realBands[2] || 0
        b3 = this._realBands[3] || 0
        treble =
          this._realBands.slice(4).reduce((a, b) => a + b, 0) /
          Math.max(1, bandsCount - 4)

        bassEnergy = Math.max(b0 * 1.25, b1 * 1.1, (b0 + b1 * 1.3) / 2.2)
        instantKick = Math.max(0, bassEnergy - (this._lastBassEnergy || 0.08))
        this._lastBassEnergy =
          (this._lastBassEnergy || 0.08) * 0.72 + bassEnergy * 0.28
        targetNorm = Math.min(1.0, Math.pow(bassEnergy, 0.4) * 1.85)
      } else {
        const bpm = 128
        const beatPhase = (simTime * (bpm / 60)) % 1
        const kick = Math.pow(Math.max(0, 1 - beatPhase * 3.0), 2.2)
        targetNorm = this.isPlaying
          ? Math.max(
              0.12,
              kick * 1.15 + (Math.sin(simTime * 9.5) * 0.5 + 0.5) * 0.25,
            )
          : 0
        bassEnergy = targetNorm
        instantKick = Math.max(0, kick - 0.2)
      }
    } else {
      targetNorm = 0
    }

    const smoothing = targetNorm > (this._heartbeatNorm || 0) ? 0.7 : 0.25
    this._heartbeatNorm =
      (this._heartbeatNorm || 0) +
      (targetNorm - (this._heartbeatNorm || 0)) * smoothing
    const norm = this._heartbeatNorm

    const currentBaseY = H / 2
    const headX = Math.floor(W * 0.72) // Camera tracking focal point at 72% width

    // Smooth forward speed of ECG trace (pixels/second)
    const speed = 75
    const advance = speed * dt
    this._hbDistance += advance
    this._hbStepRemainder = (this._hbStepRemainder || 0) + advance
    const numSteps = Math.floor(this._hbStepRemainder)
    this._hbStepRemainder -= numSteps

    if (!this._hbHistory || this._hbHistory.length < W + 100) {
      this._hbHistory = new Float32Array(Math.max(W + 100, 800)).fill(0)
    }

    // Step physics & record newly formed continuous ECG wave at the head
    for (let s = 0; s < numSteps; s++) {
      // 1. Instantaneous Kick & Beat Impulse Triggering
      if (this.isPlaying) {
        const kickThreshold = hasRealAudio ? 0.032 : 0.45
        if (instantKick > kickThreshold || bassEnergy > 0.36) {
          const hitForce = Math.min(
            1.25,
            Math.max(instantKick * 2.8, bassEnergy * 0.95),
          )
          this._hbImpulse = Math.max(this._hbImpulse || 0, hitForce)
          if (
            (this._hbImpulsePhase || 0) <= 0 ||
            (this._hbImpulsePhase || 0) > Math.PI * 1.85
          ) {
            this._hbImpulsePhase = 0.01 // Start cardiac spike immediately without waiting
          }
        }
      }

      // 2. Cardiac Impulse Evolution (QRS peak synthesis)
      let cardiacY = 0
      if ((this._hbImpulsePhase || 0) > 0) {
        this._hbImpulsePhase += 0.24 // Clean fluid progression
        const ph = this._hbImpulsePhase
        const amp = this._hbImpulse || 0.85

        if (ph < Math.PI * 0.25) {
          // Q notch (pre-spike dip)
          cardiacY = Math.sin((ph / (Math.PI * 0.25)) * Math.PI) * 1.8 * amp
        } else if (ph < Math.PI * 0.85) {
          // R spike (instant sharp upward peak reacting to beat)
          const rP = (ph - Math.PI * 0.25) / (Math.PI * 0.6)
          cardiacY = -Math.sin(rP * Math.PI) * 11.6 * amp
        } else if (ph < Math.PI * 1.25) {
          // S dip (rapid rebound below baseline)
          const sP = (ph - Math.PI * 0.85) / (Math.PI * 0.4)
          cardiacY = Math.sin(sP * Math.PI) * 4.0 * amp
        } else if (ph < Math.PI * 1.85) {
          // T wave (smooth repolarization curve)
          const tP = (ph - Math.PI * 1.25) / (Math.PI * 0.6)
          cardiacY = -Math.sin(tP * Math.PI) * 2.2 * amp
        } else {
          this._hbImpulsePhase = 0
          this._hbImpulse = 0
        }
      } else {
        // Continuous gentle heartbeat when music has mild tempo
        this._hbAutoBeatTimer = (this._hbAutoBeatTimer || 0) + 1 / speed
        const autoInterval = hasRealAudio ? 0.72 : 0.85
        if (this.isPlaying && this._hbAutoBeatTimer >= autoInterval) {
          this._hbAutoBeatTimer = 0
          this._hbImpulse = 0.72 + norm * 0.35
          this._hbImpulsePhase = 0.01
        }
      }

      // 3. Continuous Acoustic Waveform Modulation (Vocals, Mids, Treble live shaping)
      let acousticY = 0
      if (this.isPlaying) {
        if (hasRealAudio) {
          acousticY =
            Math.sin(simTime * 16.0 + this._hbDistance * 0.06) *
              (b2 * 2.2 + b3 * 1.5) +
            Math.sin(simTime * 28.0 + this._hbDistance * 0.12) *
              (b1 * 1.1 + treble * 0.85)
        } else {
          acousticY =
            Math.sin(simTime * 6.0 + this._hbDistance * 0.05) *
            (0.35 + norm * 0.4)
        }
      }

      // Combine total instantaneous Y displacement
      const currentSampleY = Math.max(
        -12.8,
        Math.min(8.0, cardiacY + acousticY),
      )

      // Shift history backward (flow into past) and write new sample at head
      this._hbHistory.copyWithin(1, 0, headX + 30)
      this._hbHistory[0] = currentSampleY

      // Spawn trailing cinematic ember particles from the moving spark head
      if (this.isPlaying && Math.random() < 0.15 + norm * 0.2) {
        if (!this._hbEmbers) this._hbEmbers = []
        if (this._hbEmbers.length < 18) {
          this._hbEmbers.push({
            x: headX,
            y: currentBaseY + currentSampleY,
            vx: -(45 + Math.random() * 35),
            vy: (Math.random() - 0.5) * 8,
            life: 1.0,
            size: 0.9 + Math.random() * 1.2,
          })
        }
      }
    }

    const isCpuSave = this._cpuSave !== false

    // 1. Draw Infinite Scrolling Background Medical Grid (Hiệu ứng lưới y tế êm dịu)
    ctx.save()
    ctx.strokeStyle = isWhiteMode
      ? "rgba(0,0,0,0.06)"
      : "rgba(255,255,255,0.06)"
    ctx.lineWidth = 0.8
    const gridSpacing = 16
    const gridOffset = (this._hbDistance || 0) % gridSpacing
    for (let gx = -gridOffset; gx <= W; gx += gridSpacing) {
      if (gx >= 0) {
        ctx.beginPath()
        ctx.moveTo(gx, 0)
        ctx.lineTo(gx, H)
        ctx.stroke()
      }
    }
    // Horizontal center line
    ctx.beginPath()
    ctx.moveTo(0, currentBaseY)
    ctx.lineTo(W, currentBaseY)
    ctx.stroke()
    ctx.restore()

    // 2. Draw Forward Holographic Guide Beam (Đường dẫn phía trước kim)
    ctx.save()
    const guideGrad = ctx.createLinearGradient(headX, 0, W, 0)
    guideGrad.addColorStop(0, accent)
    guideGrad.addColorStop(0.35, "rgba(255,255,255,0.2)")
    guideGrad.addColorStop(1, "transparent")
    ctx.strokeStyle = guideGrad
    ctx.lineWidth = 1.0
    ctx.setLineDash([3, 4])
    ctx.lineDashOffset = -(this._hbDistance * 0.6) % 7
    ctx.beginPath()
    ctx.moveTo(headX, currentBaseY)
    ctx.lineTo(W, currentBaseY)
    ctx.stroke()
    ctx.restore()

    // 3. Draw Formed ECG Waveform (Đường sóng nhịp tim mềm mại)
    const subPixelOffset = this._hbStepRemainder || 0
    const drawECGWave = () => {
      ctx.beginPath()
      for (let x = 0; x <= headX; x++) {
        const histIdx = headX - x
        const sampleY = this._hbHistory[histIdx] || 0
        const px = x - subPixelOffset
        const py = currentBaseY + sampleY
        if (x === 0) {
          ctx.moveTo(px, py)
        } else {
          ctx.lineTo(px, py)
        }
      }
      ctx.stroke()
    }

    // Pass 1: Soft Neon Glow Outline
    ctx.save()
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.8 + norm * 0.4
    ctx.lineJoin = "round"
    ctx.lineCap = "round"
    ctx.shadowBlur = isWhiteMode ? 0 : isCpuSave ? 3 : 5 + norm * 6
    ctx.shadowColor = accent
    drawECGWave()
    ctx.restore()

    // Pass 2: Crisp Smooth Core Line
    if (!isWhiteMode) {
      ctx.save()
      ctx.strokeStyle = "rgba(255,255,255,0.9)"
      ctx.lineWidth = 1.0
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
      drawECGWave()
      ctx.restore()
    }

    // 4. Update & Draw Trailing Cinematic Embers
    if (this._hbEmbers && this._hbEmbers.length > 0) {
      ctx.save()
      ctx.fillStyle = isWhiteMode ? accent : "#ffffff"
      for (let i = this._hbEmbers.length - 1; i >= 0; i--) {
        const p = this._hbEmbers[i]
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.life -= dt * 1.4
        if (p.life <= 0 || p.x < 0) {
          this._hbEmbers.splice(i, 1)
          continue
        }
        ctx.globalAlpha = p.life * 0.7
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    // 5. Glowing Tracer Spark Head (Đầu kim quét nhịp tim)
    const headY = currentBaseY + (this._hbHistory[0] || 0)
    const sparkRadius = 1.8 + norm * 1.6

    ctx.save()
    ctx.shadowColor = accent
    ctx.shadowBlur = isWhiteMode ? 0 : 6 + norm * 8
    const haloGrad = ctx.createRadialGradient(
      headX,
      headY,
      0,
      headX,
      headY,
      sparkRadius * 2.5,
    )
    haloGrad.addColorStop(
      0,
      isWhiteMode ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.95)",
    )
    haloGrad.addColorStop(0.4, accent)
    haloGrad.addColorStop(1, "transparent")
    ctx.fillStyle = haloGrad
    ctx.globalAlpha = 0.95
    ctx.beginPath()
    ctx.arc(headX, headY, sparkRadius * 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // White core spark dot
    ctx.save()
    ctx.beginPath()
    ctx.fillStyle = isWhiteMode ? "#000000" : "#ffffff"
    ctx.arc(headX, headY, sparkRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.restore()
  }

  _recreateBars() {
    this.bars.forEach((bar) => bar.remove())
    this.bars = []
    for (let i = 0; i < this.barCount; i++) {
      const bar = document.createElement("div")
      bar.className = "visualizer-bar"
      this.bars.push(bar)
      this.container.appendChild(bar)
    }
    this._currentHeights = new Array(this.barCount).fill(4)
    this._targetHeights = new Array(this.barCount).fill(4)
    this._simPhase = Array.from({ length: this.barCount }, (_, i) => i * 1.1)
    this._simSpeeds = Array.from(
      { length: this.barCount },
      () => 1.5 + Math.random() * 1.5,
    )
  }

  // ── Pixel canvas ─────────────────────────────────────────────────────────

  _startPixel() {
    this._stopPixel()
    this.bars.forEach((b) => {
      b.style.display = "none"
    })
    const canvas = document.createElement("canvas")
    canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none;"
    this.container.style.position = "relative"
    this.container.appendChild(canvas)
    this.pixelCanvas = canvas
    this.pixelSpeeds = [1.2, 2.2, 1.6, 2.8, 1.8]
    this.pixelPhase = this.pixelSpeeds.map((_, i) => i * 1.1)
    this.peakIdx = new Array(this.barCount).fill(0)
    this.peakTimer = 0

    this.updateDimensions()
    this._lastTs = 0
    this._lastFrameTime = 0
    this._lastConfigCheck = performance.now()

    const loop = (ts) => {
      if (!this.pixelCanvas || this.currentStyle !== "pixel") return
      this.pixelAnimId = requestAnimationFrame(loop)

      if (!this._lastTs) {
        this._lastTs = ts
        this._lastFrameTime = ts
        return
      }

      const isCpuSave = this._cpuSave !== false
      const elapsed = ts - this._lastFrameTime
      if (isCpuSave && elapsed < 33) return // Lock to ~30 FPS only in CPU-save
      this._lastFrameTime = ts - (elapsed % (isCpuSave ? 33 : 1))

      if (ts - this._lastConfigCheck > 200) {
        this._lastConfigCheck = ts
        this.updateDimensions()
      }

      const dt = Math.min((ts - this._lastTs) / 1000, 0.05)
      this._lastTs = ts
      this._pixelFrame(dt)
    }
    this.pixelAnimId = requestAnimationFrame(loop)
  }

  _stopPixel() {
    if (this.pixelAnimId) {
      cancelAnimationFrame(this.pixelAnimId)
      this.pixelAnimId = null
    }
    if (this.pixelCanvas) {
      this.pixelCanvas.remove()
      this.pixelCanvas = null
    }
    if (this.container) {
      this.container.style.position = ""
    }
    this.bars.forEach((b) => {
      b.style.display = ""
    })
  }

  _pixelFrame(dt) {
    const canvas = this.pixelCanvas
    if (!canvas) return
    const W = this.cachedW
    const H = this.cachedH
    if (canvas.width !== W) canvas.width = W
    if (canvas.height !== H) canvas.height = H
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, W, H)

    const isWhiteBlur = this.isWhiteBlurCached
    const accent = isWhiteBlur ? "#000000" : this.cachedAccent || "#a8c0ff"

    const gap = 3
    const barW = Math.max(
      5,
      Math.floor((W - (this.barCount - 1) * gap) / this.barCount),
    )
    const totalW = this.barCount * barW + (this.barCount - 1) * gap
    const startX = Math.floor((W - totalW) / 2)
    const segH = 3
    const segGap = 1
    const segStep = segH + segGap
    const maxSegs = Math.floor(H / segStep)
    if (this.isPlaying) {
      this.peakTimer += dt
      while (this.peakTimer >= 0.08) {
        this.peakTimer -= 0.08
        for (let i = 0; i < this.barCount; i++) {
          if (this.peakIdx[i] > 0) this.peakIdx[i]--
        }
      }
    }

    if (!this._pixelScales || this._pixelScales.length !== this.barCount) {
      this._pixelScales = new Array(this.barCount).fill(0.1)
      this._pixelSimTime = 0
    }
    this._pixelSimTime = (this._pixelSimTime || 0) + dt
    const simTime = this._pixelSimTime

    const isReactive = getSettings().musicRealAudioReactive === true
    const bandsCount = this._realBands?.length || 0
    const hasRealAudio = Boolean(this._realBands && bandsCount > 0)

    const bpm = 128
    const beatPhase = (simTime * (bpm / 60)) % 1
    const kick = Math.pow(Math.max(0, 1 - beatPhase * 3.0), 2.2)
    const sub = Math.sin(simTime * 9.5) * 0.5 + 0.5
    const hat = (Math.sin(simTime * 24.0) * 0.5 + 0.5) * 0.35

    for (let i = 0; i < this.barCount; i++) {
      let norm = 0

      if (isReactive) {
        let targetNorm = 0
        if (hasRealAudio) {
          const bandIdx = Math.min(
            bandsCount - 1,
            Math.floor((i / this.barCount) * bandsCount),
          )
          const rawVal = this._realBands[bandIdx] || 0
          targetNorm = Math.min(1.0, Math.pow(rawVal, 0.45) * 1.65)
        } else {
          const barPhase = i * 0.65
          const bounce = Math.sin(simTime * 8.0 + barPhase) * 0.5 + 0.5
          const barKick =
            i === 0 || i === 1
              ? kick * 1.15
              : i === 2 || i === 3
                ? kick * 0.75 + bounce * 0.35
                : hat + bounce * 0.45
          targetNorm = Math.max(
            0.1,
            Math.min(1.0, barKick * 0.85 + bounce * 0.25 + sub * 0.15),
          )
        }

        const smoothing = targetNorm > this._pixelScales[i] ? 0.8 : 0.35
        this._pixelScales[i] += (targetNorm - this._pixelScales[i]) * smoothing
        norm = this._pixelScales[i]
      } else {
        if (this.isPlaying) {
          this.pixelPhase[i] += this.pixelSpeeds[i] * dt * Math.PI
        }
        norm = (Math.sin(this.pixelPhase[i]) + 1) / 2
      }

      const numSegs = Math.max(1, Math.round(norm * maxSegs))
      if (numSegs > this.peakIdx[i]) {
        this.peakIdx[i] = numSegs
      }
      const x = startX + i * (barW + gap)
      ctx.fillStyle = accent
      for (let s = 0; s < numSegs; s++) {
        ctx.fillRect(x, H - (s + 1) * segStep, barW, segH)
      }
      if (this.peakIdx[i] > 0) {
        const py = H - this.peakIdx[i] * segStep
        if (py >= 0) {
          ctx.fillStyle = isWhiteBlur
            ? "rgba(0,0,0,0.4)"
            : "rgba(255,255,255,0.95)"
          ctx.fillRect(x, py, barW, segH)
        }
      }
    }
  }

  // ── Moon 8 canvas ────────────────────────────────────────────────────────

  _startMoon8() {
    this._stopMoon8()
    this.bars.forEach((b) => {
      b.style.display = "none"
    })

    const canvas = document.createElement("canvas")
    canvas.style.cssText =
      "position:absolute; top:50%; left:50%; width:300%; height:300%; transform:translate(-50%, -50%); pointer-events:none; z-index: 1;"

    this.container.style.position = "relative"
    this.container.style.overflow = "visible"
    this.container.appendChild(canvas)
    this.moonCanvas = canvas

    this.moonPhase = 0
    this.moonDir = 1
    this.collisionCount = 0
    this.nextCollisionPhase = Math.PI
    this.isSpecialMode = false
    this.specialLaps = 0
    this.startSpecialPhase = 0
    this._moonNorm = 0.1
    this._moonSimTime = 0

    this.updateDimensions()
    this._lastTs = 0
    this._lastFrameTime = 0
    this._lastConfigCheck = performance.now()

    const loop = (ts) => {
      if (!this.moonCanvas || this.currentStyle !== "moon8") return
      this.moonAnimId = requestAnimationFrame(loop)

      if (!this._lastTs) {
        this._lastTs = ts
        this._lastFrameTime = ts
        return
      }

      const isCpuSave = this._cpuSave !== false
      const elapsed = ts - this._lastFrameTime
      if (isCpuSave && elapsed < 33) return
      this._lastFrameTime = ts - (elapsed % (isCpuSave ? 33 : 1))

      if (ts - this._lastConfigCheck > 200) {
        this._lastConfigCheck = ts
        this.updateDimensions()
      }

      const dt = Math.min((ts - this._lastTs) / 1000, 0.05)
      this._lastTs = ts
      this._moon8Frame(dt)
    }
    this.moonAnimId = requestAnimationFrame(loop)
  }

  _stopMoon8() {
    if (this.moonAnimId) {
      cancelAnimationFrame(this.moonAnimId)
      this.moonAnimId = null
    }
    if (this.moonCanvas) {
      this.moonCanvas.remove()
      this.moonCanvas = null
    }
    if (this.container) {
      this.container.style.position = ""
      this.container.style.overflow = ""
    }
    this.bars.forEach((b) => {
      b.style.display = ""
    })
  }

  _moon8Frame(dt) {
    const canvas = this.moonCanvas
    if (!canvas) return
    const CW = this.cachedW || this.container?.offsetWidth || 276
    const CH = this.cachedH || this.container?.offsetHeight || 60

    if (canvas.width !== CW * 3 || canvas.height !== CH * 3) {
      canvas.width = CW * 3
      canvas.height = CH * 3
    }

    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const isWhiteBlur = this.isWhiteBlurCached
    const accent = isWhiteBlur ? "#000000" : this.cachedAccent || "#a8c0ff"

    // Smooth Audio Reactive Beat Calculation (Punchy & Organic)
    this._moonSimTime = (this._moonSimTime || 0) + dt
    const simTime = this._moonSimTime

    const isReactive = getSettings().musicRealAudioReactive === true
    const bandsCount = this._realBands?.length || 0
    const hasRealAudio = Boolean(this._realBands && bandsCount > 0)

    let targetNorm = 0.15
    if (this.isPlaying) {
      if (isReactive) {
        if (hasRealAudio) {
          const bassVal =
            ((this._realBands[0] || 0) + (this._realBands[1] || 0)) / 2
          targetNorm = Math.min(1.0, Math.pow(bassVal, 0.42) * 1.7)
        } else {
          const bpm = 128
          const beatPhase = (simTime * (bpm / 60)) % 1
          const kick = Math.pow(Math.max(0, 1 - beatPhase * 3.0), 2.2)
          const sub = Math.sin(simTime * 9.5) * 0.5 + 0.5
          targetNorm = Math.max(0.1, kick * 1.1 + sub * 0.35)
        }
      } else {
        targetNorm = 0.26 + Math.sin(simTime * 3.5) * 0.12
      }
    } else {
      targetNorm = 0
    }

    // Snappy attack, smooth organic decay
    const smoothing = targetNorm > (this._moonNorm || 0) ? 0.65 : 0.28
    this._moonNorm =
      (this._moonNorm || 0) + (targetNorm - (this._moonNorm || 0)) * smoothing
    const norm = this._moonNorm

    if (this.isPlaying) {
      const baseSpeed = Math.PI / 2.1
      const speedBoost = 1 + norm * 0.85 // Punchy yet smooth speed acceleration

      if (!this.isSpecialMode) {
        this.moonPhase += dt * baseSpeed * speedBoost * this.moonDir
        const crossedLimit =
          this.moonDir > 0
            ? this.moonPhase >= this.nextCollisionPhase
            : this.moonPhase <= this.nextCollisionPhase

        if (crossedLimit) {
          this.collisionCount++
          if (this.collisionCount >= 6) {
            this.isSpecialMode = true
            this.specialLaps = 0
            this.startSpecialPhase = this.moonPhase
            this.universeRotY = 0
            this.universeRotX = 0
          } else {
            const mode = Math.floor((this.collisionCount - 1) / 2) % 2
            if (mode === 0) {
              this.moonDir *= -1
              this.nextCollisionPhase =
                this.moonDir > 0
                  ? Math.ceil((this.moonPhase + 0.01) / Math.PI) * Math.PI
                  : Math.floor((this.moonPhase - 0.01) / Math.PI) * Math.PI
            } else {
              this.nextCollisionPhase =
                this.moonDir > 0
                  ? this.nextCollisionPhase + Math.PI
                  : this.nextCollisionPhase - Math.PI
            }
          }
        }
      } else {
        this.moonPhase += dt * baseSpeed * speedBoost * 1.2
        const diff = Math.abs(this.moonPhase - this.startSpecialPhase)
        this.specialLaps = diff / (Math.PI * 2)

        if (this.specialLaps > 6) {
          // Slow down universe rotation gracefully during the return phase
          const returnPhase =
            this.specialLaps > 20
              ? Math.max(0, 1 - (this.specialLaps - 20) / 5)
              : 1.0
          const rotSpeed = dt * 0.95 * returnPhase
          this.universeRotY += rotSpeed
          this.universeRotX += rotSpeed * 0.4
        }

        // Extended Special Mode duration with ultra-smooth 5-lap return transition
        if (this.specialLaps >= 25.5) {
          this.isSpecialMode = false
          this.collisionCount = 0
          this.moonDir = 1
          this.nextCollisionPhase =
            Math.ceil(this.moonPhase / Math.PI) * Math.PI + Math.PI
          this.universeRotY = 0
          this.universeRotX = 0
        }
      }
    }

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const amplitudeX = CW * (0.38 + norm * 0.04)
    const amplitudeY = CH * (0.32 + norm * 0.03)

    const getPos = (p, rotY = 0, rotX = 0, shapeMorph = 0) => {
      const x = amplitudeX * Math.sin(p)
      const y =
        amplitudeY *
        ((1 - shapeMorph) * Math.sin(2 * p) + shapeMorph * Math.cos(p))
      const z = amplitudeX * Math.cos(p)

      let x1 = x * Math.cos(rotY) - z * Math.sin(rotY)
      let z1 = x * Math.sin(rotY) + z * Math.cos(rotY)

      let y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX)
      let z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX)

      const perspective = 380
      const scale = perspective / (perspective + z2)

      return {
        x: centerX + x1 * scale,
        y: centerY + y2 * scale,
        z: z2,
        scale,
      }
    }

    let universeFactor = 0
    let shapeMorph = 0

    if (this.isSpecialMode) {
      if (this.specialLaps <= 6) {
        shapeMorph = 0
        universeFactor = 0
      } else if (this.specialLaps <= 9) {
        // Slow, gentle morph into 3D circle (3 laps)
        const t = (this.specialLaps - 6) / 3
        const ease = 0.5 - 0.5 * Math.cos(Math.PI * t)
        shapeMorph = ease
        universeFactor = ease
      } else if (this.specialLaps <= 20) {
        // Extended holding duration in quantum circle orbit
        shapeMorph = 1.0
        universeFactor = 1.0
      } else {
        // Slow, graceful, silky smooth 5-lap return back to infinity (no jerkiness)
        const t = Math.min(1.0, (this.specialLaps - 20) / 5.0)
        const ease = 0.5 + 0.5 * Math.cos(Math.PI * t)
        shapeMorph = ease
        universeFactor = ease
      }
    }

    const currentRotY = (this.universeRotY || 0) * universeFactor
    const currentRotX =
      ((this.universeRotX || 0) + Math.sin(this.moonPhase * 0.5) * 0.18) *
      universeFactor

    // 1. Primary Luminous 3D orbit wireframe
    ctx.save()
    ctx.strokeStyle = accent
    ctx.shadowColor = accent
    ctx.shadowBlur = isWhiteBlur ? 0 : 8
    for (let p = 0; p <= Math.PI * 2; p += 0.16) {
      const pNext = p + 0.18
      const pos1 = getPos(p, currentRotY, currentRotX, shapeMorph)
      const pos2 = getPos(pNext, currentRotY, currentRotX, shapeMorph)

      const zFactor = (pos1.z + amplitudeX) / (2 * amplitudeX)
      const isFront = zFactor > 0.5
      ctx.globalAlpha = (0.16 + norm * 0.12) * (isFront ? 0.95 : 0.42)
      ctx.lineWidth = (1.4 + norm * 0.4) * (0.65 + 0.65 * zFactor)

      ctx.beginPath()
      ctx.moveTo(pos1.x, pos1.y)
      ctx.lineTo(pos2.x, pos2.y)
      ctx.stroke()
    }
    ctx.restore()

    // 2. Secondary Cloned Quantum Orbital Ring (Brighter & Luminous after 3s of circle mode)
    const qAppearFactor =
      this.specialLaps > 11.5
        ? Math.min(1.0, (this.specialLaps - 11.5) / 2.5) * universeFactor
        : 0

    if (qAppearFactor > 0.02) {
      const qRotY = -currentRotY * 1.15 + Math.PI / 3.5
      const qRotX = -currentRotX * 0.95 + Math.PI / 4.0

      ctx.save()
      ctx.strokeStyle = isWhiteBlur ? "rgba(0,0,0,0.45)" : accent
      ctx.shadowColor = accent
      ctx.shadowBlur = isWhiteBlur ? 0 : 10 + norm * 8

      for (let p = 0; p <= Math.PI * 2; p += 0.16) {
        const pNext = p + 0.18
        const pos1 = getPos(p, qRotY, qRotX, shapeMorph)
        const pos2 = getPos(pNext, qRotY, qRotX, shapeMorph)

        const zFactor = (pos1.z + amplitudeX) / (2 * amplitudeX)
        const isFront = zFactor > 0.5
        ctx.globalAlpha =
          qAppearFactor * (0.24 + norm * 0.18) * (isFront ? 0.95 : 0.45)
        ctx.lineWidth = (1.5 + norm * 0.6) * (0.65 + 0.65 * zFactor)

        ctx.beginPath()
        ctx.moveTo(pos1.x, pos1.y)
        ctx.lineTo(pos2.x, pos2.y)
        ctx.stroke()
      }

      // 2 Quantum Orbital Valence Electron Beads on the Secondary Ring
      const qHeadP1 = this.moonPhase * 1.25 + Math.PI / 2
      const qHeadP2 = this.moonPhase * 1.25 + (Math.PI * 3) / 2

      const drawQuantumBead = (p) => {
        const pos = getPos(p, qRotY, qRotX, shapeMorph)
        const z = (pos.z + amplitudeX) / (2 * amplitudeX)
        const r = (2.0 + norm * 1.2) * (0.7 + 0.4 * z)

        // Outer halo
        ctx.beginPath()
        ctx.fillStyle = accent
        ctx.globalAlpha = qAppearFactor * (0.6 + norm * 0.3) * (0.5 + 0.5 * z)
        ctx.arc(pos.x, pos.y, r * 2.4, 0, Math.PI * 2)
        ctx.fill()

        // White Core
        ctx.beginPath()
        ctx.fillStyle = isWhiteBlur ? "#000" : "#ffffff"
        ctx.globalAlpha = qAppearFactor * 0.95 * (0.5 + 0.5 * z)
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      drawQuantumBead(qHeadP1)
      drawQuantumBead(qHeadP2)

      ctx.restore()
    }

    // 3. Miniature Glowing Celestial Star & Orbiting Planets in the Center
    if (universeFactor > 0.04) {
      const planetRadius = (4.2 + norm * 2.0) * universeFactor
      ctx.save()

      // Atmospheric Glow Halo
      ctx.shadowColor = accent
      ctx.shadowBlur = isWhiteBlur ? 0 : 12 + norm * 8
      const planetGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        planetRadius * 3.2,
      )
      planetGlow.addColorStop(
        0,
        isWhiteBlur ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
      )
      planetGlow.addColorStop(0.35, accent)
      planetGlow.addColorStop(1, "transparent")
      ctx.fillStyle = planetGlow
      ctx.globalAlpha = universeFactor * (0.75 + norm * 0.25)
      ctx.beginPath()
      ctx.arc(centerX, centerY, planetRadius * 3.2, 0, Math.PI * 2)
      ctx.fill()

      // Miniature Planetary Orbit Ring
      ctx.strokeStyle = isWhiteBlur ? "rgba(0,0,0,0.4)" : accent
      ctx.lineWidth = 1.0 + norm * 0.5
      ctx.globalAlpha = universeFactor * (0.6 + norm * 0.3)
      ctx.beginPath()
      ctx.ellipse(
        centerX,
        centerY,
        planetRadius * 2.2,
        planetRadius * 0.68,
        Math.PI / 6 + (this.universeRotX || 0) * 0.5,
        0,
        Math.PI * 2,
      )
      ctx.stroke()

      // Glowing Center Planet Core
      ctx.beginPath()
      ctx.fillStyle = isWhiteBlur ? "#000000" : "#ffffff"
      ctx.globalAlpha = universeFactor * 0.95
      ctx.arc(centerX, centerY, planetRadius, 0, Math.PI * 2)
      ctx.fill()

      // Orbiting Mini Planets / Tiny Star Satellites (4 Tiểu hành tinh & vì sao nhỏ xung quanh)
      const miniOrbits = [
        { dist: planetRadius * 1.6, speed: 2.7, phase: 0, size: 1.1 },
        { dist: planetRadius * 2.5, speed: -2.0, phase: 2.1, size: 0.95 },
        { dist: planetRadius * 3.6, speed: 1.4, phase: 4.3, size: 1.3 },
        { dist: planetRadius * 4.8, speed: -0.9, phase: 1.2, size: 1.45 },
      ]

      miniOrbits.forEach((orb) => {
        const ang = simTime * orb.speed + orb.phase
        const ox = centerX + Math.cos(ang) * orb.dist
        const oy = centerY + Math.sin(ang) * (orb.dist * 0.55)

        // Tiny Star Glow Halo
        ctx.beginPath()
        ctx.fillStyle = accent
        ctx.globalAlpha = universeFactor * (0.55 + norm * 0.35)
        ctx.arc(ox, oy, orb.size * 2.2, 0, Math.PI * 2)
        ctx.fill()

        // Tiny Star White Core
        ctx.beginPath()
        ctx.fillStyle = isWhiteBlur ? "#000" : "#ffffff"
        ctx.globalAlpha = universeFactor * 0.95
        ctx.arc(ox, oy, orb.size, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.restore()
    }

    // 4. Punchy yet smooth glowing neon ribbons with feathered tail fade
    const drawLine = (isSecond) => {
      let pBase = isSecond ? -this.moonPhase : this.moonPhase
      let currentDir = this.isSpecialMode ? 1 : this.moonDir
      const segmentLen = this.isSpecialMode
        ? 0.82 + norm * 0.75
        : 0.55 + norm * 0.7

      ctx.lineCap = "round"
      const step = 0.04

      // Pass 1: Luminous colored neon glow ribbon with feathered fade
      ctx.save()
      ctx.strokeStyle = accent
      ctx.shadowColor = accent
      ctx.shadowBlur = isWhiteBlur ? 0 : 12 + norm * 12

      for (let s = 0; s <= segmentLen; s += step) {
        const dir = isSecond ? -currentDir : currentDir
        const p1 = pBase - s * dir
        const p2 = pBase - (s + step) * dir

        const pos1 = getPos(p1, currentRotY, currentRotX, shapeMorph)
        const pos2 = getPos(p2, currentRotY, currentRotX, shapeMorph)

        const zFactor = (pos1.z + amplitudeX) / (2 * amplitudeX)
        const fadeFactor = Math.pow(1 - s / segmentLen, 1.45) // Silky smooth tail fade

        ctx.beginPath()
        ctx.lineWidth = (3.0 + norm * 2.5) * (0.5 + 0.65 * zFactor)
        ctx.globalAlpha =
          (0.65 + norm * 0.3) * (0.35 + 0.65 * zFactor) * fadeFactor

        ctx.moveTo(pos1.x, pos1.y)
        ctx.lineTo(pos2.x, pos2.y)
        ctx.stroke()
      }
      ctx.restore()

      // Pass 2: High-energy white core stripe
      if (!isWhiteBlur) {
        ctx.save()
        ctx.strokeStyle = "rgba(255,255,255,0.9)"
        ctx.shadowBlur = 2
        for (let s = 0; s <= segmentLen * 0.58; s += step) {
          const dir = isSecond ? -currentDir : currentDir
          const p1 = pBase - s * dir
          const p2 = pBase - (s + step) * dir

          const pos1 = getPos(p1, currentRotY, currentRotX, shapeMorph)
          const pos2 = getPos(p2, currentRotY, currentRotX, shapeMorph)

          const zFactor = (pos1.z + amplitudeX) / (2 * amplitudeX)
          const fadeFactor = Math.pow(1 - s / (segmentLen * 0.58), 1.5)

          ctx.beginPath()
          ctx.lineWidth = (1.3 + norm * 0.9) * (0.6 + 0.5 * zFactor)
          ctx.globalAlpha =
            (0.75 + norm * 0.22) * (0.4 + 0.6 * zFactor) * fadeFactor

          ctx.moveTo(pos1.x, pos1.y)
          ctx.lineTo(pos2.x, pos2.y)
          ctx.stroke()
        }
        ctx.restore()
      }

      // 5. Luminous 3D Light Head Bead
      const headPos = getPos(pBase, currentRotY, currentRotX, shapeMorph)
      const headZFactor = (headPos.z + amplitudeX) / (2 * amplitudeX)
      const headRadius = (2.2 + norm * 1.3) * (0.7 + 0.4 * headZFactor)

      // Soft ambient neon halo flare
      ctx.save()
      ctx.shadowColor = accent
      ctx.shadowBlur = isWhiteBlur ? 0 : 12 + norm * 8
      const haloGrad = ctx.createRadialGradient(
        headPos.x,
        headPos.y,
        0,
        headPos.x,
        headPos.y,
        headRadius * 2.6,
      )
      haloGrad.addColorStop(
        0,
        isWhiteBlur ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.8)",
      )
      haloGrad.addColorStop(0.4, accent)
      haloGrad.addColorStop(1, "transparent")
      ctx.fillStyle = haloGrad
      ctx.globalAlpha = (0.6 + norm * 0.3) * (0.5 + 0.5 * headZFactor)
      ctx.beginPath()
      ctx.arc(headPos.x, headPos.y, headRadius * 2.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Core White Light Dot
      ctx.beginPath()
      ctx.fillStyle = isWhiteBlur ? "#000" : "#ffffff"
      ctx.globalAlpha = 0.95 * (0.5 + 0.5 * headZFactor)
      ctx.arc(headPos.x, headPos.y, headRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    drawLine(false)
    drawLine(true)

    ctx.globalAlpha = 1.0
  }

  _initAudioChannel() {
    try {
      this._audioChannel = new BroadcastChannel("startpage_real_audio_channel")
      this._audioChannel.onmessage = (e) => {
        if (e.data?.type === "AUDIO_BANDS" && Array.isArray(e.data.bands)) {
          this.feedFrequencyData(e.data.bands)
        } else if (e.data?.type === "AUDIO_BANDS_STOP") {
          this.feedFrequencyData(null)
        }
      }
    } catch (e) {}

    this._runtimeMessageListener = (message) => {
      if (message?.type === "AUDIO_BANDS" && Array.isArray(message.bands)) {
        this.feedFrequencyData(message.bands)
      } else if (message?.type === "AUDIO_BANDS_STOP") {
        this.feedFrequencyData(null)
      }
    }
    try {
      chrome.runtime?.onMessage?.addListener(this._runtimeMessageListener)
    } catch (e) {}
  }

  feedFrequencyData(bands) {
    this._realBands = bands && Array.isArray(bands) ? bands : null
  }

  setAudioReactive(enabled) {
    if (
      this.isPlaying &&
      this.currentStyle !== "pixel" &&
      this.currentStyle !== "moon8" &&
      this.currentStyle !== "heartbeat" &&
      this.currentStyle !== "forest" &&
      this.currentStyle !== "beach" &&
      this.currentStyle !== "orbit"
    ) {
      this._startCSSLoop()
    }
  }

  _startClassicCSS() {
    this._stopCSSLoop()
    if (this.container) this.container.classList.remove("real-audio-active")
    this.bars.forEach((bar) => {
      bar.style.removeProperty("height")
      bar.style.removeProperty("animation")
      bar.style.removeProperty("transition")
      bar.classList.add("playing")
    })
  }

  _startBeatLoop() {
    this._stopCSSLoop()
    this.bars.forEach((bar) => {
      bar.classList.remove("playing")
      bar.style.setProperty("animation", "none", "important")
      bar.style.setProperty("transition", "none", "important")
    })

    let simTime = 0
    let lastTs = 0

    const loop = (ts) => {
      if (!this.isPlaying) return
      this._cssAnimId = requestAnimationFrame(loop)

      if (!lastTs) lastTs = ts
      const dt = Math.min((ts - lastTs) / 1000, 0.05)
      lastTs = ts
      simTime += dt

      const bandsCount = this._realBands?.length || 0
      const hasRealAudio = Boolean(this._realBands && bandsCount > 0)

      if (this.container) {
        this.container.classList.toggle("real-audio-active", hasRealAudio)
      }

      if (
        !this._currentScales ||
        this._currentScales.length !== this.bars.length
      ) {
        this._currentScales = new Array(this.bars.length).fill(0.1)
      }

      // Procedural beat simulation (Kick drum at ~128 BPM with sub-bass punch)
      const bpm = 128
      const beatPhase = (simTime * (bpm / 60)) % 1
      const kick = Math.pow(Math.max(0, 1 - beatPhase * 3.0), 2.2)
      const sub = Math.sin(simTime * 9.5) * 0.5 + 0.5
      const hat = (Math.sin(simTime * 24.0) * 0.5 + 0.5) * 0.35

      this.bars.forEach((bar, index) => {
        let targetNorm = 0

        if (hasRealAudio) {
          // 100% REAL AUDIO FREQUENCY
          const bandIdx = Math.min(
            bandsCount - 1,
            Math.floor((index / this.bars.length) * bandsCount),
          )
          const rawVal = this._realBands[bandIdx] || 0
          targetNorm = Math.min(1.0, Math.pow(rawVal, 0.45) * 1.65)
        } else {
          // PROCEDURAL BEAT SIMULATION (Dynamic spring bounce)
          const barPhase = index * 0.65
          const bounce = Math.sin(simTime * 8.0 + barPhase) * 0.5 + 0.5
          const barKick =
            index === 0 || index === 1
              ? kick * 1.15
              : index === 2 || index === 3
                ? kick * 0.75 + bounce * 0.35
                : hat + bounce * 0.45
          targetNorm = Math.max(
            0.1,
            Math.min(1.0, barKick * 0.85 + bounce * 0.25 + sub * 0.15),
          )
        }

        const smoothing = targetNorm > this._currentScales[index] ? 0.8 : 0.35
        this._currentScales[index] +=
          (targetNorm - this._currentScales[index]) * smoothing

        const curVal = this._currentScales[index]
        if (this.currentStyle === "overlap") {
          const translateY = Math.round(5 - curVal * 9)
          const scaleY = (0.55 + curVal * 0.85).toFixed(2)
          const brightness = (0.86 + curVal * 0.38).toFixed(2)
          bar.style.setProperty(
            "transform",
            `translateY(${translateY}px) scaleY(${scaleY})`,
            "important",
          )
          bar.style.setProperty(
            "filter",
            `brightness(${brightness})`,
            "important",
          )
          bar.style.setProperty("animation", "none", "important")
          bar.style.setProperty("transition", "none", "important")
        } else {
          const heightPx = Math.max(5, Math.round(5 + curVal * 38))
          bar.style.setProperty("height", `${heightPx}px`, "important")
          bar.style.setProperty("animation", "none", "important")
          bar.style.setProperty("transition", "none", "important")
        }
      })
    }

    this._cssAnimId = requestAnimationFrame(loop)
  }

  _startCSSLoop() {
    const isReactive = getSettings().musicRealAudioReactive === true
    if (isReactive) {
      this._startBeatLoop()
    } else {
      this._startClassicCSS()
    }
  }

  _stopCSSLoop() {
    if (this._cssAnimId) {
      cancelAnimationFrame(this._cssAnimId)
      this._cssAnimId = null
    }
    if (this.container) this.container.classList.remove("real-audio-active")
    this._currentScales = []
    this.bars.forEach((bar) => {
      bar.style.removeProperty("height")
      bar.style.removeProperty("transform")
      bar.style.removeProperty("filter")
      bar.style.removeProperty("animation")
      bar.style.removeProperty("transition")
      bar.classList.remove("playing")
    })
  }

  start() {
    if (
      this.isPlaying &&
      (this.heartbeatAnimId ||
        this.orbitAnimId ||
        this.forestAnimId ||
        this.beachAnimId ||
        this.moonAnimId ||
        this.pixelAnimId ||
        this._cssAnimId)
    ) {
      return
    }
    this.isPlaying = true
    this._lastTs = 0
    this._lastFrameTime = 0
    const isReactive = getSettings().musicRealAudioReactive === true
    if (this.currentStyle === "pixel") this._startPixel()
    else if (this.currentStyle === "moon8") this._startMoon8()
    else if (this.currentStyle === "heartbeat") this._startHeartbeat()
    else if (this.currentStyle === "orbit") this._startOrbit()
    else if (this.currentStyle === "forest") this._startForest()
    else if (this.currentStyle === "beach") this._startBeach()
    else this._startCSSLoop()
  }

  stop() {
    this.isPlaying = false
    this._realBands = null
    this._stopAll()
  }

  destroy() {
    window.removeEventListener("resize", this._resizeListener)
    document.removeEventListener("visibilitychange", this._visibilityListener)
    if (this._dimTimeouts) {
      this._dimTimeouts.forEach((t) => clearTimeout(t))
      this._dimTimeouts = []
    }
    if (this._resizeTimeout) {
      clearTimeout(this._resizeTimeout)
    }
    if (this._audioChannel) {
      try {
        this._audioChannel.close()
      } catch (e) {}
      this._audioChannel = null
    }
    this._stopAll()
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.bars = []
  }
}

export default MusicVisualizer
