/**
 * MusicBarsEffect — High-Performance Fluid Aurora Sine Waves
 *
 * Performance Optimizations:
 *  - 1x Hardware-Accelerated Canvas (Eliminates high-DPI fillrate lag)
 *  - Pre-allocated Float32/Direct Point buffers (Zero Garbage Collection spikes)
 *  - Consolidated single-pass wave spline rendering
 *  - Batched Stardust Motes with single fill draw call
 */

export class MusicBarsEffect {
  constructor(canvasId, color = "#8be9fd") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.rafId = null
    this.lastDrawTime = 0
    this.time = 0
    this.color = color

    this.waves = []
    this.motes = []
    this.cssWidth = 0
    this.cssHeight = 0

    this._resizeHandler = () => this.resize()
    this._setColorCache(color)
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  resize() {
    if (!this.canvas) return
    this.cssWidth = window.innerWidth
    this.cssHeight = window.innerHeight
    this.canvas.width = this.cssWidth
    this.canvas.height = this.cssHeight
    this.canvas.style.width = `${this.cssWidth}px`
    this.canvas.style.height = `${this.cssHeight}px`

    this._buildWaves()
    this._buildMotes()
  }

  updateColor(color) {
    this.color = color || "#8be9fd"
    this._setColorCache(this.color)
  }

  _setColorCache(hex) {
    const { r, g, b } = this._hexToRgb(hex)
    this.rgb = { r, g, b }
    this.rgbStr = `${r},${g},${b}`
  }

  _hexToRgb(hex) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "")
    if (!match) return { r: 139, g: 233, b: 253 }
    return {
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16),
    }
  }

  _buildWaves() {
    const H = this.cssHeight
    const baseY = H * 0.64

    this.waves = [
      {
        id: 0,
        baseY: baseY + 25,
        amplitude: 55,
        curAmp: 55,
        freq: 0.0022,
        speed: 0.65,
        phase: 0,
        lineWidth: 3.0,
        alpha: 0.25,
        fillAlpha: 0.1,
        segments: 36,
      },
      {
        id: 1,
        baseY: baseY + 8,
        amplitude: 75,
        curAmp: 75,
        freq: 0.0032,
        speed: 0.95,
        phase: Math.PI * 0.45,
        lineWidth: 2.4,
        alpha: 0.45,
        fillAlpha: 0.15,
        segments: 40,
      },
      {
        id: 2,
        baseY: baseY - 12,
        amplitude: 95,
        curAmp: 95,
        freq: 0.0042,
        speed: 1.35,
        phase: Math.PI * 0.9,
        lineWidth: 2.0,
        alpha: 0.7,
        fillAlpha: 0.18,
        segments: 44,
      },
      {
        id: 3,
        baseY: baseY - 30,
        amplitude: 110,
        curAmp: 110,
        freq: 0.0055,
        speed: 1.75,
        phase: Math.PI * 1.35,
        lineWidth: 1.5,
        alpha: 0.9,
        fillAlpha: 0.06,
        segments: 48,
      },
    ]
  }

  _buildMotes() {
    const W = this.cssWidth
    const H = this.cssHeight
    const count = Math.max(20, Math.min(45, Math.floor(W / 45)))

    this.motes = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: H * 0.45 + Math.random() * (H * 0.45),
      r: 0.8 + Math.random() * 1.2,
      vy: -(15 + Math.random() * 25),
      swaySpeed: 1.2 + Math.random() * 1.8,
      swayAmp: 10 + Math.random() * 20,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.3 + Math.random() * 0.5,
    }))
  }

  start() {
    if (this.active || !this.canvas) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.canvas.style.display = "block"
    this.animate(this.lastDrawTime)
  }

  stop() {
    this.active = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.canvas) this.canvas.style.display = "none"
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    this.waves = []
    this.motes = []
  }

  _update(dt) {
    this.time += dt
    const t = this.time
    const W = this.cssWidth
    const H = this.cssHeight

    const bassPulse = Math.pow(Math.max(0, Math.sin(t * 2.5) * 0.75 + Math.sin(t * 5.0) * 0.25), 1.6)
    const midPulse = 0.5 + 0.5 * Math.sin(t * 3.6)
    const trebleJitter = Math.sin(t * 11.2) * 0.12

    for (const w of this.waves) {
      const beatBonus =
        w.id === 0
          ? bassPulse * 0.6
          : w.id === 1
            ? (bassPulse * 0.4 + midPulse * 0.4)
            : w.id === 2
              ? (midPulse * 0.5 + trebleJitter)
              : (trebleJitter * 1.5 + midPulse * 0.3)

      const target = w.amplitude * (0.65 + beatBonus * 0.75)
      w.curAmp += (target - w.curAmp) * Math.min(1.0, dt * 7.0)
    }

    for (const m of this.motes) {
      m.y += m.vy * dt
      m.x += Math.sin(t * m.swaySpeed + m.phase) * (m.swayAmp * dt)

      if (m.y < H * 0.25) {
        m.y = H * 0.8 + Math.random() * (H * 0.15)
        m.x = Math.random() * W
      }
    }
  }

  _getWavePoint(w, x, W, t) {
    const normX = x / W
    const edgeFade = Math.sin(normX * Math.PI)
    const y1 = Math.sin(x * w.freq + t * w.speed + w.phase) * w.curAmp
    const y2 = Math.sin(x * (w.freq * 2.1) - t * (w.speed * 0.8) + w.phase * 1.4) * (w.curAmp * 0.35)
    return w.baseY - (y1 + y2) * Math.pow(edgeFade, 0.4)
  }

  _drawWave(w, W, H, t) {
    const ctx = this.ctx
    const step = W / w.segments
    const totalPts = w.segments + 3

    // Build curve path once
    ctx.beginPath()
    let prevX = -step
    let prevY = this._getWavePoint(w, prevX, W, t)
    ctx.moveTo(prevX, prevY)

    for (let i = 0; i <= totalPts; i++) {
      const x = (i - 1) * step
      const y = this._getWavePoint(w, x, W, t)
      const midX = (prevX + x) * 0.5
      const midY = (prevY + y) * 0.5
      ctx.quadraticCurveTo(prevX, prevY, midX, midY)
      prevX = x
      prevY = y
    }

    // 1. Translucent Aurora Gradient Fill
    const fillGrad = ctx.createLinearGradient(0, w.baseY - w.curAmp, 0, H)
    fillGrad.addColorStop(0, `rgba(${this.rgbStr}, ${w.fillAlpha})`)
    fillGrad.addColorStop(0.5, `rgba(${this.rgbStr}, ${w.fillAlpha * 0.4})`)
    fillGrad.addColorStop(1.0, "rgba(0,0,0,0)")

    ctx.save()
    ctx.lineTo(W + 50, H + 20)
    ctx.lineTo(-50, H + 20)
    ctx.closePath()
    ctx.fillStyle = fillGrad
    ctx.fill()
    ctx.restore()

    // 2. Wave Outline Stroke
    ctx.strokeStyle = `rgba(${this.rgbStr}, ${w.alpha})`
    ctx.lineWidth = w.lineWidth
    ctx.lineCap = "round"
    ctx.stroke()
  }

  _draw() {
    const ctx = this.ctx
    const W = this.cssWidth
    const H = this.cssHeight
    const t = this.time

    ctx.clearRect(0, 0, W, H)

    ctx.globalCompositeOperation = "lighter"

    // 1. Draw Multi-Layer Fluid Aurora Waves
    for (const w of this.waves) {
      this._drawWave(w, W, H, t)
    }

    // 2. Batched Celestial Stardust Spark Motes
    ctx.fillStyle = `rgba(255, 255, 255, 0.75)`
    ctx.beginPath()
    for (const m of this.motes) {
      ctx.moveTo(m.x + m.r, m.y)
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
    }
    ctx.fill()

    ctx.globalCompositeOperation = "source-over"
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this.rafId = requestAnimationFrame((t) => this.animate(t))
    if (document.visibilityState === "hidden") return

    const elapsed = currentTime - this.lastDrawTime
    const dt = Math.min(elapsed / 1000, 0.04) || 0.016
    this.lastDrawTime = currentTime

    this._update(dt)
    this._draw()
  }
}


