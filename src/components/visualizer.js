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
    // Real frequency data from Web Audio API
    this._realBands = null
    this._cssAnimId = null
    this._lastCssTs = 0
    this._currentHeights = [4, 4, 4, 4]
    this._targetHeights = [4, 4, 4, 4]
    this._simPhase = [0, 1.1, 2.2, 3.3]
    this._simSpeeds = [1.9, 2.4, 1.6, 2.8]

    // Listen for audio data from background
    chrome.runtime.onMessage.addListener((request) => {
      if (request.action === "audioSyncData" && request.samples) {
        this.feedFrequencyData(request.samples)
      }
    })
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

    this.setStyle(getSettings().musicBarStyle || "vinyl")
  }

  setStyle(style) {
    const prev = this.currentStyle
    this.currentStyle = style

    // Dynamic bar count based on style
    let newBarCount = 5
    if (style === "minimal" || style === "pill") newBarCount = 4
    if (style === "spotify" || style === "sidebar") newBarCount = 4
    if (style === "soundcloud") newBarCount = 6
    if (style === "heartbeat" || style === "moon8") newBarCount = 0

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

    if (style === "pixel") {
      this._stopCSSLoop()
      this._stopMoon8()
      this._stopHeartbeat()
      this._startPixel()
    } else if (style === "moon8") {
      this._stopCSSLoop()
      this._stopPixel()
      this._stopHeartbeat()
      this._startMoon8()
    } else if (style === "heartbeat") {
      this._stopCSSLoop()
      this._stopPixel()
      this._stopMoon8()
      this._startHeartbeat()
    } else {
      if (this.isPlaying) this._startCSSLoop()
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat()
    const canvas = document.createElement("canvas")
    canvas.className = "heartbeat-canvas"
    canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;"
    this.heartbeatCanvas = canvas
    
    if (this.container) {
      this.container.appendChild(canvas)
    }

    this.heartbeatPoints = []
    this._pulseTimer = 0
    this._lastTs = performance.now()
    this._baseYOffset = 0

    const loop = (ts) => {
      if (this.currentStyle !== "heartbeat") return
      const dt = Math.min((ts - this._lastTs) / 1000, 0.05)
      this._lastTs = ts
      this._heartbeatFrame(dt)
      this.heartbeatAnimId = requestAnimationFrame(loop)
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
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    
    if (canvas.width !== W * 2) {
      canvas.width = W * 2
      canvas.height = H * 2
    }

    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    ctx.save()
    ctx.scale(2, 2)

    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent-color").trim() || "#ff4d4d"

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
    const drift = Math.sin(Date.now() * 0.003) * 5 
    const currentBaseY = (H / 2) + this._baseYOffset + drift

    const scrollSpeed = (W / 1.5) * dt 
    
    if (!this.heartbeatPoints) this.heartbeatPoints = []
    
    const lastX = this.heartbeatPoints.length > 0 ? this.heartbeatPoints[this.heartbeatPoints.length - 1].x : W
    
    if (lastX < W + 20) {
        this._pulseTimer += dt
        const beatInterval = active ? (0.7 - norm * 0.3) : 1.2 
        
        if (this._pulseTimer >= beatInterval) {
            this._pulseTimer = 0
            const bx = W + 10
            const amp = active ? (1 + norm * 3.3) : 1.2
            
            this.heartbeatPoints.push({ x: bx, y: currentBaseY })
            this.heartbeatPoints.push({ x: bx + 3, y: currentBaseY - 2 * amp })
            this.heartbeatPoints.push({ x: bx + 5, y: currentBaseY + 2 * amp })
            this.heartbeatPoints.push({ x: bx + 9, y: currentBaseY - 18 * amp })
            this.heartbeatPoints.push({ x: bx + 14, y: currentBaseY + 28 * amp })
            this.heartbeatPoints.push({ x: bx + 18, y: currentBaseY - 8 * amp })
            this.heartbeatPoints.push({ x: bx + 22, y: currentBaseY })
        } else {
            const noise = (Math.random() - 0.5) * (active ? (1 + norm * 5) : 0.5)
            this.heartbeatPoints.push({ x: W + 10, y: currentBaseY + noise })
        }
    }

    if (this.heartbeatPoints.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = accent
        ctx.lineWidth = 2.5
        ctx.lineJoin = "round"
        ctx.shadowBlur = 10
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
    const loop = (ts) => {
      if (!this.pixelCanvas) return
      const dt = Math.min((ts - this._lastTs) / 1000, 0.05)
      this._lastTs = ts
      this._pixelFrame(dt)
      this.pixelAnimId = requestAnimationFrame(loop)
    }
    this.pixelAnimId = requestAnimationFrame((ts) => {
      this._lastTs = ts
      this.pixelAnimId = requestAnimationFrame(loop)
    })
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
    const W = this.container.offsetWidth || 120
    const H = this.container.offsetHeight || 40
    if (canvas.width !== W) canvas.width = W
    if (canvas.height !== H) canvas.height = H
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, W, H)
    const accent =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent-color")
        .trim() || "#a8c0ff"
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
        norm = Math.sqrt(Math.max(0, Math.min(1, this._realBands[bandIdx] * 1.5)))
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
          ctx.fillStyle = "rgba(255,255,255,0.95)"
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

    const loop = (ts) => {
      if (!this.moonCanvas) return
      const dt = Math.min((ts - this._lastTs) / 1000, 0.05)
      this._lastTs = ts
      this._moon8Frame(dt)
      this.moonAnimId = requestAnimationFrame(loop)
    }
    this.moonAnimId = requestAnimationFrame((ts) => {
      this._lastTs = ts
      this.moonAnimId = requestAnimationFrame(loop)
    })
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
    const CW = this.container.offsetWidth || 140
    const CH = this.container.offsetHeight || 45
    
    if (canvas.width !== CW * 3) {
      canvas.width = CW * 3
      canvas.height = CH * 3
    }

    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const accent =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent-color")
        .trim() || "#a8c0ff"

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
        const crossedLimit = this.moonDir > 0 
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
              this.nextCollisionPhase = this.moonDir > 0 
                ? Math.ceil((this.moonPhase + 0.01) / Math.PI) * Math.PI 
                : Math.floor((this.moonPhase - 0.01) / Math.PI) * Math.PI
            } else {
              this.nextCollisionPhase = this.moonDir > 0 
                ? this.nextCollisionPhase + Math.PI 
                : this.nextCollisionPhase - Math.PI
            }
          }
        }
      } else {
        this.moonPhase += dt * baseSpeed * speedBoost * 1.5
        const diff = Math.abs(this.moonPhase - this.startSpecialPhase)
        this.specialLaps = diff / (Math.PI * 2)

        // Sau 6 vòng line, bắt đầu xoay 3D (vũ trụ) trong 6 vòng tiếp theo
        if (this.specialLaps > 6) {
          const rotSpeed = dt * 1.5
          this.universeRotY += rotSpeed
          this.universeRotX += rotSpeed * 0.6
        }

        if (this.specialLaps >= 12) {
          this.isSpecialMode = false
          this.collisionCount = 0
          this.moonDir = 1
          this.nextCollisionPhase = Math.round(this.moonPhase / Math.PI) * Math.PI + Math.PI
          this.universeRotY = 0
          this.universeRotX = 0
        }
      }
    }

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const amplitudeX = CW * 0.38
    const amplitudeY = CH * 0.32

    // Hàm getPos nâng cấp với khả năng biến hình (shapeMorph: 0 = Figure-8, 1 = Circle)
    const getPos = (p, rotY = 0, rotX = 0, shapeMorph = 0) => {
      // Morphing giữa sin(2p) (số 8) và cos(p) (vòng tròn)
      const x = amplitudeX * Math.sin(p)
      const y = amplitudeY * ((1 - shapeMorph) * Math.sin(2 * p) + shapeMorph * Math.cos(p))
      const z = amplitudeX * Math.cos(p)

      // Rotate Y
      let x1 = x * Math.cos(rotY) - z * Math.sin(rotY)
      let z1 = x * Math.sin(rotY) + z * Math.cos(rotY)

      // Rotate X
      let y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX)
      let z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX)

      const perspective = 400
      const scale = perspective / (perspective + z2)
      
      return {
        x: centerX + x1 * scale,
        y: centerY + y2 * scale,
        z: z2
      }
    }

    // Hàm nội bộ để tính toán transition mượt mà (smoothstep)
    const smoothStep = (x) => x * x * (3 - 2 * x)

    let collisionFactor = 0
    let universeFactor = 0
    let shapeMorph = 0

    if (this.isSpecialMode) {
      collisionFactor = 1.0
      // Kiểm soát Universe (xoay 3D) và ShapeMorph (biến hình tròn)
      if (this.specialLaps > 6) {
        // Universe factor: Bay vào không gian
        const progress = Math.min(1, this.specialLaps - 6)
        universeFactor = smoothStep(progress) 
        
        // Shape Morph: Biến thành hình tròn từ vòng 6-7, giữ đến 11, biến lại thành số 8 từ 11-12
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
      const distToCenter = Math.abs(this.moonPhase - Math.round(this.moonPhase / Math.PI) * Math.PI)
      collisionFactor = Math.pow(Math.max(0, 1 - distToCenter / 0.5), 4)
    }

    const currentRotY = (this.universeRotY || 0) * universeFactor
    const currentRotX = ((this.universeRotX || 0) + Math.sin(this.moonPhase * 0.5) * 0.2) * universeFactor

    // Vẽ khung số 8/Circle với Depth Shading
    ctx.save()
    ctx.strokeStyle = accent
    ctx.shadowColor = accent
    
    for (let p = 0; p <= Math.PI * 2; p += 0.2) {
      const pNext = p + 0.22
      const pos1 = getPos(p, currentRotY, currentRotX, shapeMorph)
      const pos2 = getPos(pNext, currentRotY, currentRotX, shapeMorph)
      
      const zFactor = (pos1.z + amplitudeX) / (2 * amplitudeX)
      ctx.globalAlpha = (0.05 + collisionFactor * 0.4) * (0.3 + 0.7 * zFactor)
      ctx.lineWidth = (1 + collisionFactor * 2) * (0.5 + 0.5 * zFactor)
      
      if (collisionFactor > 0.3) {
        ctx.shadowBlur = collisionFactor * 15 * zFactor
      }

      ctx.beginPath()
      ctx.moveTo(pos1.x, pos1.y)
      ctx.lineTo(pos2.x, pos2.y)
      ctx.stroke()
    }
    ctx.restore()

    const drawLine = (isSecond) => {
      let pBase = isSecond ? -this.moonPhase : this.moonPhase
      let currentDir = this.isSpecialMode ? 1 : this.moonDir
      const segmentLen = this.isSpecialMode ? (0.8 + norm * 1.5) : (0.4 + collisionFactor * 0.6 + norm * 0.8)
      
      ctx.lineCap = "round"
      ctx.shadowColor = accent

      const step = 0.05
      for (let s = 0; s <= segmentLen; s += step) {
        const dir = isSecond ? -currentDir : currentDir
        const p1 = pBase - (s * dir)
        const p2 = pBase - ((s + step) * dir)
        
        const pos1 = getPos(p1, currentRotY, currentRotX, shapeMorph)
        const pos2 = getPos(p2, currentRotY, currentRotX, shapeMorph)
        
        const zFactor = (pos1.z + amplitudeX) / (2 * amplitudeX)
        const fadeFactor = 1 - (s / segmentLen)

        ctx.beginPath()
        ctx.lineWidth = (2.5 + collisionFactor * 4 + norm * 5) * (0.4 + 0.6 * zFactor)
        ctx.strokeStyle = accent
        ctx.globalAlpha = (0.4 + collisionFactor * 0.6) * (0.2 + 0.8 * zFactor) * fadeFactor
        ctx.shadowBlur = (12 + norm * 20) * (0.4 + 0.6 * collisionFactor) * zFactor
        
        ctx.moveTo(pos1.x, pos1.y)
        ctx.lineTo(pos2.x, pos2.y)
        ctx.stroke()
      }

      const headPos = getPos(pBase, currentRotY, currentRotX, shapeMorph)
      const headZFactor = (headPos.z + amplitudeX) / (2 * amplitudeX)
      ctx.beginPath()
      ctx.fillStyle = "#fff"
      ctx.globalAlpha = (0.8 + collisionFactor * 0.2) * (0.5 + 0.5 * headZFactor)
      ctx.shadowBlur = 15 * headZFactor
      ctx.arc(headPos.x, headPos.y, (1.5 + collisionFactor * 2 + norm * 2) * (0.6 + 0.4 * headZFactor), 0, Math.PI * 2)
      ctx.fill()
    }

    drawLine(false)
    drawLine(true)

    if (!this.isSpecialMode && collisionFactor > 0.8) {
      const burstSize = (collisionFactor - 0.8) * 70 + norm * 50
      const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, burstSize)
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
    ctx.shadowBlur = 0
  }

  feedFrequencyData(bands) {
    this._realBands = bands && Array.isArray(bands) ? bands : null
  }

  _startCSSLoop() {
    this._stopCSSLoop()
    this._lastCssTs = performance.now()
    this._currentHeights = new Array(this.barCount).fill(4)
    this._targetHeights = new Array(this.barCount).fill(4)
    
    // Cache các thanh bars ngay khi bắt đầu loop
    const bars = Array.from(this.container.querySelectorAll(".visualizer-bar"))

    const loop = (ts) => {
      if (!this.isPlaying || (this.currentStyle === "pixel" || this.currentStyle === "moon8" || this.currentStyle === "heartbeat")) {
          this._cssAnimId = null
          return
      }
      
      const dt = Math.min((ts - this._lastCssTs) / 1000, 0.05)
      this._lastCssTs = ts
      
      if (!bars.length) {
          this._cssAnimId = requestAnimationFrame(loop)
          return
      }

      const containerH = this.container.offsetHeight || 40
      const minH = 4
      const maxH = containerH - 4
      
      if (this._realBands && this._realBands.length > 0) {
        for (let i = 0; i < bars.length; i++) {
          // Trải đều 4 dải âm lên số lượng thanh bar bất kỳ
          const bandIdx = Math.floor((i / bars.length) * this._realBands.length)
          let val = this._realBands[bandIdx]
          
          // Tính toán norm với hệ số Gain mạnh
          let t = Math.sqrt(Math.max(0, Math.min(1, val * 1.6)))
          
          // Tối ưu riêng cho từng style
          if (this.currentStyle === "spotify" || this.currentStyle === "sidebar" || this.currentStyle === "neon") {
            t *= 1.3 // Modern snappy styles
          } else if (this.currentStyle === "soundcloud") {
            t *= 1.15 // Waveform style
          } else if (this.currentStyle === "cassette") {
            t *= 1.1 // Retro EQ style
          }

          this._targetHeights[i] = minH + Math.min(1, t) * (maxH - minH)
        }
      } else {
        for (let i = 0; i < bars.length; i++) {
          this._simPhase[i] += this._simSpeeds[i] * dt * Math.PI
          const t = (Math.sin(this._simPhase[i]) + 1) / 2
          this._targetHeights[i] = minH + t * (maxH - minH)
        }
      }
      
      for (let i = 0; i < bars.length; i++) {
        if (!this._currentHeights[i]) this._currentHeights[i] = minH
        // Hệ số Lerp 0.8 giúp phản hồi Snappy tuyệt vời cho tất cả style thanh bar
        this._currentHeights[i] += (this._targetHeights[i] - this._currentHeights[i]) * 0.8
        bars[i].style.height = this._currentHeights[i].toFixed(1) + "px"
        if (!bars[i].classList.contains("playing")) {
          bars[i].classList.add("playing")
        }
      }
      this._cssAnimId = requestAnimationFrame(loop)
    }
    this._cssAnimId = requestAnimationFrame(loop)
  }

  _stopCSSLoop() {
    if (this._cssAnimId) {
      cancelAnimationFrame(this._cssAnimId)
      this._cssAnimId = null
    }
    const bars = Array.from(this.container.querySelectorAll(".visualizer-bar"))
    bars.forEach((bar) => {
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
    else this._startCSSLoop()
  }

  stop() {
    this.isPlaying = false
    this._realBands = null
    this._stopCSSLoop()
    this._stopMoon8()
    this._stopHeartbeat()
    this._stopPixel()
  }

  destroy() {
    this._stopPixel()
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.bars = []
  }
}

export default MusicVisualizer
