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
          if (this.currentStyle === "heartbeat") this._startHeartbeat()
          else if (this.currentStyle === "pixel") this._startPixel()
          else if (this.currentStyle === "moon8") this._startMoon8()
          else if (this.currentStyle === "forest") this._startForest()
          else if (this.currentStyle === "orbit") this._startOrbit()
          else if (this.currentStyle === "beach") this._startBeach()
          else this._startCSSLoop()
        }
      } else {
        this._lastTs = 0
        this._lastFrameTime = 0
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

  setStyle(style) {
    const prev = this.currentStyle
    this.currentStyle = style

    // Dynamic bar count based on style
    let newBarCount = 5
    if (style === "vinyl" || style === "apple") newBarCount = 6
    if (style === "neon") newBarCount = 8
    if (style === "minimal") newBarCount = 6
    if (style === "pill") newBarCount = 4
    if (style === "overlap") newBarCount = 9
    if (style === "orbit") newBarCount = 0
    if (style === "spotify" || style === "sidebar") newBarCount = 5
    if (style === "soundcloud") newBarCount = 10
    if (style === "terminal") newBarCount = 12
    if (style === "heartbeat" || style === "moon8" || style === "forest" || style === "beach") newBarCount = 0
    if (style === "square-thumb") newBarCount = 5

    if (newBarCount !== this.barCount) {
      this.barCount = newBarCount
      this._recreateBars()
    }

    if (prev === "pixel" && style !== "pixel") {
      this._stopPixel()
    }
    if (prev === "moon8" && style !== "moon8") {
      this._stopMoon8()
    }
    if (prev === "heartbeat" && style !== "heartbeat") {
      this._stopHeartbeat()
    }
    if (prev === "forest" && style !== "forest") {
      this._stopForest()
    }
    if (prev === "beach" && style !== "beach") {
      this._stopBeach()
    }
    if (prev === "orbit" && style !== "orbit") {
      this._stopOrbit()
    }

    if (style === "pixel") {
      this._stopCSSLoop()
      this._stopMoon8()
      this._stopHeartbeat()
      this._stopForest()
      this._stopBeach()
      this._stopOrbit()
      if (this.isPlaying) this._startPixel()
      else this._stopPixel()
    } else if (style === "moon8") {
      this._stopCSSLoop()
      this._stopPixel()
      this._stopHeartbeat()
      this._stopForest()
      this._stopBeach()
      this._stopOrbit()
      if (this.isPlaying) this._startMoon8()
      else this._stopMoon8()
    } else if (style === "heartbeat") {
      this._stopCSSLoop()
      this._stopPixel()
      this._stopMoon8()
      this._stopForest()
      this._stopBeach()
      this._stopOrbit()
      if (this.isPlaying) this._startHeartbeat()
      else this._stopHeartbeat()
    } else if (style === "forest") {
      this._stopCSSLoop()
      this._stopPixel()
      this._stopMoon8()
      this._stopHeartbeat()
      this._stopBeach()
      this._stopOrbit()
      if (this.isPlaying) this._startForest()
      else this._stopForest()
    } else if (style === "beach") {
      this._stopCSSLoop()
      this._stopPixel()
      this._stopMoon8()
      this._stopHeartbeat()
      this._stopForest()
      this._stopOrbit()
      if (this.isPlaying) this._startBeach()
      else this._stopBeach()
    } else if (style === "orbit") {
      this._stopCSSLoop()
      this._stopPixel()
      this._stopMoon8()
      this._stopHeartbeat()
      this._stopForest()
      this._stopBeach()
      if (this.isPlaying) this._startOrbit()
      else this._stopOrbit()
    } else {
      if (this.isPlaying) this._startCSSLoop()
    }
  }

  updateDimensions() {
    if (!this.container) return
    const parent = this.container.parentNode
    if (!parent) return

    const rect = this.container.getBoundingClientRect()
    const parentRect = parent.getBoundingClientRect?.()

    this.cachedW = Math.round(rect.width || this.container.offsetWidth || parent.offsetWidth || 276)
    this.cachedH = Math.round(rect.height || this.container.offsetHeight || parent.offsetHeight || 60)
    this.cachedParentWidth = Math.round(parentRect?.width || parent.offsetWidth || this.cachedW)
    this.cachedParentHeight = Math.round(parentRect?.height || parent.offsetHeight || this.cachedH)

    this.cachedAccent = getComputedStyle(parent).getPropertyValue("--accent-color").trim() || "#64f4d2"

    this.isWhiteBlurCached = parent.classList.contains("skin-white-blur") || 
                             document.body.classList.contains("quick-access-white")

    this._cpuSave = getSettings().musicVisualizerCpuSave !== false
    this.isWhiteModeCached = document.body.classList.contains("quick-access-white") || 
                             this.container.closest(".skin-white-blur") !== null ||
                             this.container.classList.contains("skin-white-blur") ||
                             document.querySelector(".side-controls")?.classList.contains("light-mode")
  }

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

      if (ts - this._lastConfigCheck > 1000) {
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
    const accent = isWhiteBlur ? "#000000" : (this.cachedAccent || "#64f4d2")
    const isCpuSave = this._cpuSave !== false

    // 1. Concentric NCS Shockwave Pulse Rings
    const drawNcsRing = (
      phaseOffset,
      alphaBase,
      width,
      expansion,
      holdEnd,
    ) => {
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

      if (ts - this._lastConfigCheck > 1000) {
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
    const W = this.cachedParentWidth
    const H = this.cachedParentHeight
    const now = Date.now()

    if (canvas.width !== W * 2) {
      canvas.width = W * 2
      canvas.height = H * 2
    }
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(2, 2)

    let norm = 0
    if (this._realBands && this._realBands.length > 0 && this.isPlaying) {
      norm = (this._realBands[0] + this._realBands[1]) / 2
    } else if (this.isPlaying) {
      norm = 0.15
    }

    const time = now * 0.002
    const isWhiteBlur = this.isWhiteBlurCached
    
    // Vẽ 3 lớp sóng biển
    const drawWave = (offsetY, amplitude, freq, speed, color, alpha) => {
        ctx.save()
        ctx.fillStyle = isWhiteBlur ? "#000000" : color
        ctx.globalAlpha = isWhiteBlur ? alpha * 0.4 : alpha
        ctx.beginPath()
        ctx.moveTo(0, H)
        
        for (let x = 0; x <= W; x += 5) {
            const y = offsetY + Math.sin(x * freq + time * speed) * (amplitude + norm * 15)
            ctx.lineTo(x, y)
        }
        
        ctx.lineTo(W, H)
        ctx.lineTo(0, H)
        ctx.fill()
        
        // Vẽ bọt biển ở đỉnh sóng
        if (norm > 0.2) {
            ctx.fillStyle = isWhiteBlur ? "rgba(0,0,0,0.3)" : "#fff"
            ctx.globalAlpha = norm * 0.5
            for (let x = 0; x <= W; x += 20) {
                const y = offsetY + Math.sin(x * freq + time * speed) * (amplitude + norm * 15)
                ctx.beginPath()
                ctx.arc(x, y, 2 * norm, 0, Math.PI * 2)
                ctx.fill()
            }
        }
        ctx.restore()
    }

    // Lớp sóng xa (Xanh nhạt)
    drawWave(H * 0.6, 5, 0.01, 0.5, "#b3e5fc", 0.4)
    // Lớp sóng giữa (Xanh ngọc lơ)
    drawWave(H * 0.7, 8, 0.015, 0.8, "#e1f5fe", 0.5)
    // Lớp sóng gần (Trắng xanh - gần như trắng)
    drawWave(H * 0.8, 10, 0.02, 1.2, "#f0faff", 0.8)

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
      // Đảm bảo container phủ toàn bộ wrapper để làm background
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
        color: ["#1b5e20", "#2e7d32", "#388e3c", "#43a047"][Math.floor(Math.random() * 4)],
        thickness: 0.8 + Math.random() * 1.5,
        speed: 0.3 + Math.random() * 0.7,
        leafNodes: Array.from({ length: 3 }, () => Math.random())
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

      if (ts - this._lastConfigCheck > 1000) {
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
      this.container.style.position = ""
      this.container.style.top = ""
      this.container.style.left = ""
      this.container.style.width = ""
      this.container.style.height = ""
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
    const W = this.cachedParentWidth
    const H = this.cachedParentHeight
    const now = Date.now()

    if (canvas.width !== W * 2) {
      canvas.width = W * 2
      canvas.height = H * 2
    }
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(2, 2)

    let norm = 0
    if (this._realBands && this._realBands.length > 0 && this.isPlaying) {
      norm = (this._realBands[0] + this._realBands[1]) / 2
    } else if (this.isPlaying) {
      norm = 0.15
    }

    const isWhiteBlur = this.isWhiteBlurCached

    // 1. Vẽ mạng lưới Dây leo nền (Background Vines)
    ctx.save()
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    this.forestVines.forEach((v, idx) => {
      ctx.beginPath()
      ctx.strokeStyle = isWhiteBlur ? "#000000" : v.color
      ctx.lineWidth = v.thickness * (1 + norm * 0.5)
      ctx.globalAlpha = isWhiteBlur ? (0.15 + norm * 0.2) : (0.25 + norm * 0.3)

      const time = now * 0.001 * v.speed
      // Chuyển động đung đưa (Swaying)
      const sway = Math.sin(time + idx) * (v.curve + norm * 15)
      
      const startX = v.startX * (W / 300)
      const startY = v.isTop ? -5 : H + 5
      const endY = v.isTop ? v.length * (H / 60) : H - v.length * (H / 60)
      const endX = startX + sway

      ctx.moveTo(startX, startY)
      // Vẽ đường cong Bezier để tạo cảm giác hữu cơ
      ctx.bezierCurveTo(
        startX, (startY + endY) / 2,
        endX, (startY + endY) / 2,
        endX, endY
      )
      ctx.stroke()

      // Vẽ lá mọc trực tiếp trên dây leo
      v.leafNodes.forEach((nodePos, lIdx) => {
          const ly = startY + (endY - startY) * nodePos
          // Tính toán vị trí x trên đường cong (đơn giản hóa bằng lerp)
          const lx = startX + (endX - startX) * nodePos
          
          ctx.save()
          ctx.translate(lx, ly)
          ctx.rotate(Math.sin(time + lIdx) * 0.5)
          ctx.fillStyle = isWhiteBlur ? "#000000" : v.color
          const lSize = (2 + v.thickness) * (1 + norm)
          
          ctx.beginPath()
          ctx.ellipse(0, 0, lSize, lSize / 2, Math.PI / 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
      })

      // Vẽ các tua cuốn (Tendrils) nhỏ
      if (norm > 0.4 && idx % 3 === 0) {
          ctx.beginPath()
          ctx.lineWidth = 0.5
          ctx.arc(endX, endY, 5 * norm, 0, Math.PI * 1.5)
          ctx.stroke()
      }
    })
    ctx.restore()

    // 2. Vẽ Bụi cỏ dày ở cạnh dưới
    ctx.save()
    const grassCount = 15
    for (let i = 0; i < grassCount; i++) {
      const x = (i / (grassCount - 1)) * W
      const h = (15 + Math.sin(i + now * 0.003) * 5) * (1 + norm)
      ctx.fillStyle = isWhiteBlur ? "#000000" : (i % 2 === 0 ? "#1b5e20" : "#2e7d32")
      ctx.globalAlpha = isWhiteBlur ? (0.2 + norm * 0.2) : (0.5 + norm * 0.3)
      ctx.beginPath()
      ctx.moveTo(x - 5, H)
      ctx.quadraticCurveTo(x, H - h, x + 5, H)
      ctx.fill()
    }
    ctx.restore()

    // 3. Cập nhật và vẽ hạt (Lá và Hoa bay)
    for (let i = this.forestParticles.length - 1; i >= 0; i--) {
      const p = this.forestParticles[i]
      if (this.isPlaying) {
        p.y += p.speed * dt * (1 + norm * 2)
        p.rotation += p.rotSpeed * dt * (1 + norm * 5)
        p.x += Math.sin(p.phase + now * 0.002) * 5 * dt
      }

      ctx.save()
      ctx.translate(p.x * (W / 300), p.y * (H / 60))
      ctx.rotate(p.rotation)
      ctx.fillStyle = isWhiteBlur ? "#000000" : p.color
      ctx.globalAlpha = isWhiteBlur ? (0.4 + norm * 0.3) : (0.7 + norm * 0.3)

      const pulse = 1 + norm * (p.type === "flower" ? 1.5 : 0.5)

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
    this._stopHeartbeat(false)
    this.bars.forEach((b) => (b.style.display = "none"))

    if (!this.heartbeatCanvas) {
      const canvas = document.createElement("canvas")
      canvas.className = "heartbeat-canvas"
      canvas.style.cssText =
        "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;"
      this.heartbeatCanvas = canvas

      if (this.container) {
        this.container.appendChild(canvas)
      }
    }

    this.updateDimensions()
    const W = this.cachedW || 276
    const H = this.cachedH || 40
    const currentBaseY = H / 2

    // Pre-populate baseline if points array is empty or too short
    if (!this.heartbeatPoints || this.heartbeatPoints.length < 5) {
      this.heartbeatPoints = []
      const step = 8
      for (let x = -10; x <= W + 20; x += step) {
        this.heartbeatPoints.push({ x, y: currentBaseY + (Math.random() - 0.5) * 1.5 })
      }
    }

    this._pulseTimer = 0
    this._lastTs = 0
    this._lastFrameTime = 0
    this._lastConfigCheck = performance.now()
    this._baseYOffset = 0

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

      if (ts - this._lastConfigCheck > 1000) {
        this._lastConfigCheck = ts
        this.updateDimensions()
      }

      const dt = Math.min((ts - this._lastTs) / 1000, 0.05)
      this._lastTs = ts
      this._heartbeatFrame(dt)
    }
    this.heartbeatAnimId = requestAnimationFrame(loop)
  }

  _stopHeartbeat(fullDestroy = false) {
    if (this.heartbeatAnimId) {
      cancelAnimationFrame(this.heartbeatAnimId)
      this.heartbeatAnimId = null
    }
    if (fullDestroy) {
      if (this.heartbeatCanvas) {
        this.heartbeatCanvas.remove()
        this.heartbeatCanvas = null
      }
      this.heartbeatPoints = []
    }
  }

  _heartbeatFrame(dt) {
    const canvas = this.heartbeatCanvas
    if (!canvas) return
    const W = this.cachedW || 276
    const H = this.cachedH || 40

    if (canvas.width !== W * 2 || canvas.height !== H * 2) {
      canvas.width = W * 2
      canvas.height = H * 2
    }

    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.scale(2, 2)

    const isWhiteMode = this.isWhiteModeCached
    let accent = isWhiteMode ? "#000000" : (this.cachedAccent || "#ff4d4d")

    // Audio Reactive Beat Calculation
    this._heartbeatSimTime = (this._heartbeatSimTime || 0) + dt
    const simTime = this._heartbeatSimTime

    const isReactive = getSettings().musicRealAudioReactive === true
    const bandsCount = this._realBands?.length || 0
    const hasRealAudio = Boolean(this._realBands && bandsCount > 0)

    let targetNorm = 0.15
    const bpm = 128
    const beatPhase = (simTime * (bpm / 60)) % 1
    const kick = Math.pow(Math.max(0, 1 - beatPhase * 3.0), 2.2)

    if (this.isPlaying) {
      if (isReactive) {
        if (hasRealAudio) {
          const b0 = this._realBands[0] || 0
          const b1 = this._realBands[1] || 0
          targetNorm = Math.min(1.0, Math.pow((b0 + b1) / 2, 0.42) * 1.85)
        } else {
          targetNorm = Math.max(0.1, kick * 1.15 + (Math.sin(simTime * 9.5) * 0.5 + 0.5) * 0.25)
        }
      } else {
        targetNorm = 0.28 + Math.sin(simTime * 4.0) * 0.12
      }
    } else {
      targetNorm = 0
    }

    const smoothing = targetNorm > (this._heartbeatNorm || 0) ? 0.8 : 0.35
    this._heartbeatNorm =
      (this._heartbeatNorm || 0) + (targetNorm - (this._heartbeatNorm || 0)) * smoothing
    const norm = this._heartbeatNorm

    this._baseYOffset += (Math.random() - 0.5) * 1.5
    this._baseYOffset *= 0.96
    const currentBaseY = H / 2 + this._baseYOffset

    const scrollSpeed = (W / 1.35) * dt

    if (!this.heartbeatPoints) this.heartbeatPoints = []

    const lastX =
      this.heartbeatPoints.length > 0
        ? this.heartbeatPoints[this.heartbeatPoints.length - 1].x
        : W

    if (lastX < W + 20) {
      this._pulseTimer = (this._pulseTimer || 0) + dt
      const minInterval = 0.38
      const beatTriggered =
        this.isPlaying &&
        this._pulseTimer >= minInterval &&
        ((isReactive && !hasRealAudio && kick > 0.82) ||
          (isReactive && hasRealAudio && norm > 0.52) ||
          (!isReactive && this._pulseTimer >= 0.72) ||
          this._pulseTimer >= 0.95)

      if (beatTriggered) {
        this._pulseTimer = 0
        const bx = W + 10
        const amp = 0.9 + norm * 2.2

        // Standard medical P-QRS-T complex synced to music beat
        this.heartbeatPoints.push({ x: bx, y: currentBaseY })
        this.heartbeatPoints.push({ x: bx + 3, y: currentBaseY - 2.5 * amp }) // P wave
        this.heartbeatPoints.push({ x: bx + 6, y: currentBaseY })
        this.heartbeatPoints.push({ x: bx + 8, y: currentBaseY + 2.2 * amp }) // Q wave
        this.heartbeatPoints.push({ x: bx + 12, y: currentBaseY - 22 * amp }) // R peak (sharp beat spike)
        this.heartbeatPoints.push({ x: bx + 16, y: currentBaseY + 11 * amp }) // S wave
        this.heartbeatPoints.push({ x: bx + 20, y: currentBaseY })
        this.heartbeatPoints.push({ x: bx + 25, y: currentBaseY - 5.5 * amp }) // T wave
        this.heartbeatPoints.push({ x: bx + 30, y: currentBaseY })
      } else {
        const noise = (Math.random() - 0.5) * (this.isPlaying ? 0.8 + norm * 2.5 : 0.3)
        this.heartbeatPoints.push({ x: W + 10, y: currentBaseY + noise })
      }
    }

    const isCpuSave = this._cpuSave !== false

    // 1. Draw subtle ambient ECG baseline
    ctx.save()
    ctx.strokeStyle = isWhiteMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(0, currentBaseY)
    ctx.lineTo(W, currentBaseY)
    ctx.stroke()
    ctx.restore()

    // 2. Draw ECG Signal Line with Glow & Fade-out at left edge
    if (this.heartbeatPoints.length > 1) {
      // Pass 1: Neon Glow Outline
      ctx.save()
      ctx.strokeStyle = accent
      ctx.lineWidth = 2.2
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
      ctx.shadowBlur = isWhiteMode ? 0 : (isCpuSave ? 4 : 8 + norm * 6)
      ctx.shadowColor = accent

      for (let i = 0; i < this.heartbeatPoints.length - 1; i++) {
        const p1 = this.heartbeatPoints[i]
        const p2 = this.heartbeatPoints[i + 1]
        p1.x -= scrollSpeed

        // Fade out smoothly at left border
        const fadeAlpha = p1.x < 30 ? Math.max(0, p1.x / 30) : 1.0
        ctx.globalAlpha = fadeAlpha * 0.9

        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }
      ctx.restore()

      // Pass 2: Sharp Crisp White Core Line
      if (!isWhiteMode) {
        ctx.save()
        ctx.strokeStyle = "rgba(255,255,255,0.75)"
        ctx.lineWidth = 0.9
        ctx.lineJoin = "round"
        for (let i = 0; i < this.heartbeatPoints.length - 1; i++) {
          const p1 = this.heartbeatPoints[i]
          const p2 = this.heartbeatPoints[i + 1]
          const fadeAlpha = p1.x < 30 ? Math.max(0, p1.x / 30) : 1.0
          ctx.globalAlpha = fadeAlpha * 0.85

          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
        }
        ctx.restore()
      }

      // Update position of last point
      if (this.heartbeatPoints.length > 0) {
        this.heartbeatPoints[this.heartbeatPoints.length - 1].x -= scrollSpeed
      }

      // 3. Glowing Tracer Spark Head (Điểm sáng dẫn đường phát quang)
      const lastP = this.heartbeatPoints[this.heartbeatPoints.length - 1]
      if (lastP && lastP.x <= W + 5) {
        const sparkRadius = 1.8 + norm * 1.5
        // Outer halo
        ctx.save()
        ctx.shadowColor = accent
        ctx.shadowBlur = isWhiteMode ? 0 : 8 + norm * 8
        const haloGrad = ctx.createRadialGradient(
          lastP.x,
          lastP.y,
          0,
          lastP.x,
          lastP.y,
          sparkRadius * 2.8,
        )
        haloGrad.addColorStop(
          0,
          isWhiteMode ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.85)",
        )
        haloGrad.addColorStop(0.4, accent)
        haloGrad.addColorStop(1, "transparent")
        ctx.fillStyle = haloGrad
        ctx.globalAlpha = 0.85
        ctx.beginPath()
        ctx.arc(lastP.x, lastP.y, sparkRadius * 2.8, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // White core dot
        ctx.beginPath()
        ctx.fillStyle = isWhiteMode ? "#000000" : "#ffffff"
        ctx.arc(lastP.x, lastP.y, sparkRadius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    if (this.heartbeatPoints.length > 0 && this.heartbeatPoints[0].x < -50) {
      this.heartbeatPoints.shift()
    }

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

      if (ts - this._lastConfigCheck > 1000) {
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
    const accent = isWhiteBlur ? "#000000" : (this.cachedAccent || "#a8c0ff")

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

      if (ts - this._lastConfigCheck > 1000) {
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
    this.bars.forEach((b) => {
      b.style.display = ""
    })
  }

  _moon8Frame(dt) {
    const canvas = this.moonCanvas
    const CW = this.cachedW
    const CH = this.cachedH

    if (canvas.width !== CW * 3) {
      canvas.width = CW * 3
      canvas.height = CH * 3
    }

    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const isWhiteBlur = this.isWhiteBlurCached
    const accent = isWhiteBlur ? "#000000" : (this.cachedAccent || "#a8c0ff")

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
          qAppearFactor *
          (0.24 + norm * 0.18) *
          (isFront ? 0.95 : 0.45)
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
    if (this.isPlaying) {
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

        const smoothing =
          targetNorm > this._currentScales[index] ? 0.8 : 0.35
        this._currentScales[index] +=
          (targetNorm - this._currentScales[index]) * smoothing

        const curVal = this._currentScales[index]
        const heightPx = Math.max(5, Math.round(5 + curVal * 38))

        bar.style.setProperty("height", `${heightPx}px`, "important")
        bar.style.setProperty("animation", "none", "important")
        bar.style.setProperty("transition", "none", "important")
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
      bar.style.removeProperty("animation")
      bar.style.removeProperty("transition")
      bar.classList.remove("playing")
    })
  }

  start() {
    this.isPlaying = true
    this._lastTs = 0
    this._lastFrameTime = 0
    if (this.currentStyle === "pixel") this._startPixel()
    else if (this.currentStyle === "moon8") this._startMoon8()
    else if (this.currentStyle === "heartbeat") this._startHeartbeat()
    else if (this.currentStyle === "forest") this._startForest()
    else if (this.currentStyle === "orbit") this._startOrbit()
    else if (this.currentStyle === "beach") this._startBeach()
    else this._startCSSLoop()
  }

  stop() {
    this.isPlaying = false
    this._realBands = null
    this._stopCSSLoop()
    this._stopMoon8(false)
    this._stopHeartbeat(false)
    this._stopForest(false)
    this._stopOrbit(false)
    this._stopBeach(false)
    this._stopPixel(false)
  }

  destroy() {
    window.removeEventListener("resize", this._resizeListener)
    document.removeEventListener("visibilitychange", this._visibilityListener)
    if (this._audioChannel) {
      try {
        this._audioChannel.close()
      } catch (e) {}
      this._audioChannel = null
    }
    this._stopPixel(true)
    this._stopMoon8(true)
    this._stopHeartbeat(true)
    this._stopForest(true)
    this._stopOrbit(true)
    this._stopBeach(true)
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.bars = []
  }
}

export default MusicVisualizer
