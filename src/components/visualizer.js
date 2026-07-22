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
    this._realBands = null // We will not use real audio data anymore

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
    this._resizeTimeout = null
    this._resizeListener = () => {
      clearTimeout(this._resizeTimeout)
      this._resizeTimeout = setTimeout(() => this.updateDimensions(), 150)
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
    if (style === "square-thumb") newBarCount = 24

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
    if (
      canvas.width !== targetW ||
      canvas.height !== targetH
    ) {
      canvas.width = targetW
      canvas.height = targetH
    }
    const ctx = this.ctx || (this.ctx = canvas.getContext("2d"))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    this.orbitPhase =
      (this.orbitPhase || 0) + dt * (this.isPlaying ? 0.78 : 0.16)
    const cx = W / 2
    const cy = H / 2
    const playerSize = Math.min(this.cachedParentWidth, this.cachedParentHeight)
    const baseRadius = Math.min(playerSize / 2 + 8, Math.min(W, H) / 2 - 58)
    const accent = this.cachedAccent || "#64f4d2"
    const bass =
      this.isPlaying && this._realBands?.length
        ? Math.min(1, (this._realBands[0] + this._realBands[1]) * 0.72)
        : this.isPlaying
          ? 0.42
          : 0

    const isCpuSave = this._cpuSave !== false

    const drawNcsRing = (phaseOffset, alphaBase, width, expansion, holdEnd) => {
      const phase = this.isPlaying ? (this.orbitPhase + phaseOffset) % 1 : 0.08
      const attack = phase < 0.16 ? phase / 0.16 : 1
      const hold =
        phase < holdEnd ? 1 : Math.max(0, 1 - (phase - holdEnd) / (1 - holdEnd))
      const punch = Math.sin(Math.min(phase / 0.2, 1) * Math.PI * 0.5)
      const easeOut = 1 - Math.pow(1 - phase, 2.6)
      const beatLift = bass * Math.pow(hold, 1.7)
      const radius =
        baseRadius - 8 + punch * (4 + beatLift * 9) + easeOut * expansion
      const alpha =
        alphaBase *
        Math.pow(hold, 1.15) *
        (this.isPlaying ? 0.22 + attack * 0.78 : 0.42)

      ctx.globalAlpha = alpha
      ctx.lineWidth = width + beatLift * 2.8
      // Toggle shadowBlur radius based on mode
      ctx.shadowBlur = isCpuSave ? (6 + punch * 10 + beatLift * 12) : (12 + punch * 20 + beatLift * 24)
      ctx.shadowColor = accent
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.stroke()

      // Outer glow - toggle off second shadowBlur pass in CPU save
      ctx.globalAlpha = alpha * (0.18 + beatLift * 0.16)
      ctx.lineWidth = width + 8 + beatLift * 5
      ctx.shadowBlur = isCpuSave ? 0 : (22 + punch * 24 + beatLift * 28)
      ctx.beginPath()
      ctx.arc(cx, cy, radius + 1.5, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.lineJoin = "round"
    ctx.lineCap = "round"
    ctx.strokeStyle = accent

    drawNcsRing(0, 0.9, 4.25, 23, 0.38)
    drawNcsRing(0.34, 0.58, 3, 18, 0.26)
    drawNcsRing(0.68, 0.42, 2.35, 15, 0.22)

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
    ctx.lineWidth = 1
    ctx.strokeStyle = "rgba(255,255,255,0.18)"
    ctx.beginPath()
    ctx.arc(cx, cy, baseRadius - 9, 0, Math.PI * 2)
    ctx.stroke()
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
    const ctx = this.ctx || (this.ctx = canvas.getContext("2d"))
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
    const ctx = this.ctx || (this.ctx = canvas.getContext("2d"))
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
    this._stopHeartbeat()
    const canvas = document.createElement("canvas")
    canvas.className = "heartbeat-canvas"
    canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;"
    this.heartbeatCanvas = canvas

    if (this.container) {
      this.container.appendChild(canvas)
    }

    this.updateDimensions()
    this.heartbeatPoints = []
    this._pulseTimer = 0
    this._lastTs = 0
    this._lastFrameTime = 0
    this._lastConfigCheck = performance.now()
    this._baseYOffset = 0

    const loop = (ts) => {
      if (this.currentStyle !== "heartbeat") return
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

  _stopHeartbeat() {
    if (this.heartbeatAnimId) {
      cancelAnimationFrame(this.heartbeatAnimId)
      this.heartbeatAnimId = null
    }
    if (this.heartbeatCanvas) {
      this.heartbeatCanvas.remove()
      this.heartbeatCanvas = null
    }
    this.heartbeatPoints = []
  }

  _heartbeatFrame(dt) {
    const canvas = this.heartbeatCanvas
    if (!canvas) return
    const W = this.cachedW
    const H = this.cachedH

    if (canvas.width !== W * 2) {
      canvas.width = W * 2
      canvas.height = H * 2
    }

    const ctx = this.ctx || (this.ctx = canvas.getContext("2d"))
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.scale(2, 2)

    const isWhiteMode = this.isWhiteModeCached
    let accent = isWhiteMode ? "#000000" : (this.cachedAccent || "#ff4d4d")

    let norm = 0
    let active = false
    if (this._realBands && this._realBands.length > 0 && this.isPlaying) {
      norm = (this._realBands[0] + this._realBands[1]) / 2
      active = true
    } else if (this.isPlaying) {
      norm = 0.1
      active = true
    }

    this._baseYOffset += (Math.random() - 0.5) * 2
    this._baseYOffset *= 0.98
    const drift = Math.sin(now * 0.003) * 5
    const currentBaseY = H / 2 + this._baseYOffset + drift

    const scrollSpeed = (W / 1.5) * dt

    if (!this.heartbeatPoints) this.heartbeatPoints = []

    const lastX =
      this.heartbeatPoints.length > 0
        ? this.heartbeatPoints[this.heartbeatPoints.length - 1].x
        : W

    if (lastX < W + 20) {
      this._pulseTimer += dt
      const beatInterval = active ? 0.7 - norm * 0.3 : 1.2

      if (this._pulseTimer >= beatInterval) {
        this._pulseTimer = 0
        const bx = W + 10
        const amp = active ? 1 + norm * 3.5 : 1.2

        // Mô phỏng chu trình P-QRS-T chuẩn hơn
        this.heartbeatPoints.push({ x: bx, y: currentBaseY })
        this.heartbeatPoints.push({ x: bx + 4, y: currentBaseY - 3 * amp }) // Sóng P (nhô nhẹ)
        this.heartbeatPoints.push({ x: bx + 8, y: currentBaseY }) // Về nền
        this.heartbeatPoints.push({ x: bx + 10, y: currentBaseY + 2 * amp }) // Sóng Q (hụp nhẹ)
        this.heartbeatPoints.push({ x: bx + 14, y: currentBaseY - 24 * amp }) // Sóng R (đỉnh nhọn cực cao)
        this.heartbeatPoints.push({ x: bx + 18, y: currentBaseY + 12 * amp }) // Sóng S (hụp sâu)
        this.heartbeatPoints.push({ x: bx + 22, y: currentBaseY }) // Về nền
        this.heartbeatPoints.push({ x: bx + 28, y: currentBaseY - 6 * amp }) // Sóng T (nhô vừa)
        this.heartbeatPoints.push({ x: bx + 34, y: currentBaseY }) // Kết thúc chu trình
      } else {
        const noise = (Math.random() - 0.5) * (active ? 1 + norm * 5 : 0.5)
        this.heartbeatPoints.push({ x: W + 10, y: currentBaseY + noise })
      }
    }

    const isCpuSave = this._cpuSave !== false

    if (this.heartbeatPoints.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = accent
      ctx.lineWidth = 2.5
      ctx.lineJoin = "round"
      ctx.shadowBlur = isCpuSave ? 4 : 10 // Toggle shadowBlur radius based on mode
      ctx.shadowColor = accent

      for (let i = 0; i < this.heartbeatPoints.length; i++) {
        const p = this.heartbeatPoints[i]
        p.x -= scrollSpeed
        if (i === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      }
      ctx.stroke()

      const lastP = this.heartbeatPoints[this.heartbeatPoints.length - 1]
      if (lastP.x <= W) {
        ctx.beginPath()
        ctx.fillStyle = "#fff"
        ctx.arc(lastP.x, lastP.y, 2, 0, Math.PI * 2)
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
    const ctx = this.ctx || (this.ctx = canvas.getContext("2d"))
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

    for (let i = 0; i < this.barCount; i++) {
      let norm
      if (this._realBands && this._realBands.length > 0 && this.isPlaying) {
        // Trải đều 4 dải âm lên các cột Pixel
        const bandIdx = Math.floor((i / this.barCount) * this._realBands.length)
        norm = Math.sqrt(
          Math.max(0, Math.min(1, this._realBands[bandIdx] * 1.5)),
        )
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
          ctx.fillStyle = isWhiteBlur ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.95)"
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
    // Vùng vẽ mở rộng để chứa glow nhưng đặt tuyệt đối giữa
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
      if (isCpuSave && elapsed < 33) return // Lock to ~30 FPS only in CPU-save
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

    const ctx = this.ctx || (this.ctx = canvas.getContext("2d"))
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const isWhiteBlur = this.isWhiteBlurCached
    const accent = isWhiteBlur ? "#000000" : (this.cachedAccent || "#a8c0ff")

    let norm = 0
    if (this._realBands && this._realBands.length > 0 && this.isPlaying) {
      norm = (this._realBands[0] + this._realBands[1]) / 2
    } else if (this.isPlaying) {
      norm = 0.1
    }

    if (this.isPlaying) {
      const baseSpeed = Math.PI / 2
      const speedBoost = 1 + norm * 2.5

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
        this.moonPhase += dt * baseSpeed * speedBoost * 1.5
        const diff = Math.abs(this.moonPhase - this.startSpecialPhase)
        this.specialLaps = diff / (Math.PI * 2)

        if (this.specialLaps > 6) {
          const rotSpeed = dt * 1.5
          this.universeRotY += rotSpeed
          this.universeRotX += rotSpeed * 0.6
        }

        if (this.specialLaps >= 12) {
          this.isSpecialMode = false
          this.collisionCount = 0
          this.moonDir = 1
          this.nextCollisionPhase =
            Math.round(this.moonPhase / Math.PI) * Math.PI + Math.PI
          this.universeRotY = 0
          this.universeRotX = 0
        }
      }
    }

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const amplitudeX = CW * 0.38
    const amplitudeY = CH * 0.32

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

      const perspective = 400
      const scale = perspective / (perspective + z2)

      return {
        x: centerX + x1 * scale,
        y: centerY + y2 * scale,
        z: z2,
      }
    }

    const smoothStep = (x) => x * x * (3 - 2 * x)

    let collisionFactor = 0
    let universeFactor = 0
    let shapeMorph = 0

    if (this.isSpecialMode) {
      collisionFactor = 1.0
      if (this.specialLaps > 6) {
        const progress = Math.min(1, this.specialLaps - 6)
        universeFactor = smoothStep(progress)

        if (this.specialLaps <= 7) {
          shapeMorph = smoothStep(this.specialLaps - 6)
        } else if (this.specialLaps <= 11) {
          shapeMorph = 1.0
        } else {
          shapeMorph = smoothStep(1 - (this.specialLaps - 11))
          universeFactor = smoothStep(1 - (this.specialLaps - 11))
        }
      }
    } else {
      const distToCenter = Math.abs(
        this.moonPhase - Math.round(this.moonPhase / Math.PI) * Math.PI,
      )
      collisionFactor = Math.pow(Math.max(0, 1 - distToCenter / 0.5), 4)
    }

    const currentRotY = (this.universeRotY || 0) * universeFactor
    const currentRotX =
      ((this.universeRotX || 0) + Math.sin(this.moonPhase * 0.5) * 0.2) *
      universeFactor

    ctx.save()
    ctx.strokeStyle = accent

    for (let p = 0; p <= Math.PI * 2; p += 0.2) {
      const pNext = p + 0.22
      const pos1 = getPos(p, currentRotY, currentRotX, shapeMorph)
      const pos2 = getPos(pNext, currentRotY, currentRotX, shapeMorph)

      const zFactor = (pos1.z + amplitudeX) / (2 * amplitudeX)
      ctx.globalAlpha = (0.05 + collisionFactor * 0.4) * (0.3 + 0.7 * zFactor)
      ctx.lineWidth = (1 + collisionFactor * 2) * (0.5 + 0.5 * zFactor)

      ctx.beginPath()
      ctx.moveTo(pos1.x, pos1.y)
      ctx.lineTo(pos2.x, pos2.y)
      ctx.stroke()
    }
    ctx.restore()

    const drawLine = (isSecond) => {
      let pBase = isSecond ? -this.moonPhase : this.moonPhase
      let currentDir = this.isSpecialMode ? 1 : this.moonDir
      const segmentLen = this.isSpecialMode
        ? 0.8 + norm * 1.5
        : 0.4 + collisionFactor * 0.6 + norm * 0.8

      ctx.lineCap = "round"

      const step = 0.05
      for (let s = 0; s <= segmentLen; s += step) {
        const dir = isSecond ? -currentDir : currentDir
        const p1 = pBase - s * dir
        const p2 = pBase - (s + step) * dir

        const pos1 = getPos(p1, currentRotY, currentRotX, shapeMorph)
        const pos2 = getPos(p2, currentRotY, currentRotX, shapeMorph)

        const zFactor = (pos1.z + amplitudeX) / (2 * amplitudeX)
        const fadeFactor = 1 - s / segmentLen

        ctx.beginPath()
        ctx.lineWidth =
          (2.5 + collisionFactor * 4 + norm * 5) * (0.4 + 0.6 * zFactor)
        ctx.strokeStyle = accent
        ctx.globalAlpha =
          (0.4 + collisionFactor * 0.6) * (0.2 + 0.8 * zFactor) * fadeFactor

        ctx.moveTo(pos1.x, pos1.y)
        ctx.lineTo(pos2.x, pos2.y)
        ctx.stroke()
      }

      const headPos = getPos(pBase, currentRotY, currentRotX, shapeMorph)
      const headZFactor = (headPos.z + amplitudeX) / (2 * amplitudeX)
      ctx.beginPath()
      ctx.fillStyle = "#fff"
      ctx.globalAlpha =
        (0.8 + collisionFactor * 0.2) * (0.5 + 0.5 * headZFactor)
      ctx.arc(
        headPos.x,
        headPos.y,
        (1.5 + collisionFactor * 2 + norm * 2) * (0.6 + 0.4 * headZFactor),
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }

    drawLine(false)
    drawLine(true)

    if (!this.isSpecialMode && collisionFactor > 0.8) {
      const burstSize = (collisionFactor - 0.8) * 70 + norm * 50
      const grad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        burstSize,
      )
      grad.addColorStop(0, "#fff")
      grad.addColorStop(0.4, accent)
      grad.addColorStop(1, "transparent")
      ctx.fillStyle = grad
      ctx.globalAlpha = (collisionFactor - 0.8) * 5
      ctx.beginPath()
      ctx.arc(centerX, centerY, burstSize, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 1.0
  }

  feedFrequencyData(bands) {
    this._realBands = bands && Array.isArray(bands) ? bands : null
  }

  _startCSSLoop() {
    this._stopCSSLoop()
    this.bars.forEach((bar) => {
      bar.classList.add("playing")
    })
  }


  _stopCSSLoop() {
    if (this._cssAnimId) {
      cancelAnimationFrame(this._cssAnimId)
      this._cssAnimId = null
    }
    this.bars.forEach((bar) => {
      bar.style.height = ""
      bar.classList.remove("playing")
    })
  }

  start() {
    if (this.isPlaying) return
    this.isPlaying = true
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
    this._stopMoon8()
    this._stopHeartbeat()
    this._stopForest()
    this._stopOrbit()
    this._stopBeach()
    this._stopPixel()
  }

  destroy() {
    window.removeEventListener("resize", this._resizeListener)
    this._stopPixel()
    this._stopMoon8()
    this._stopHeartbeat()
    this._stopForest()
    this._stopOrbit()
    this._stopBeach()
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.bars = []
  }
}

export default MusicVisualizer
