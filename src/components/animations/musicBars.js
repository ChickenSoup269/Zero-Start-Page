/**
 * MusicBarsEffect — Ultra-Smooth Fluid Aurora Waves & Musical Symphony
 *
 * Performance Optimizations:
 *  - 1x Hardware Canvas: Eliminates 4x fillrate GPU lag on Retina/2K/4K screens
 *  - Pre-allocated Cached LinearGradients: Zero gradient allocation during 60/120/240Hz render loops
 *  - Optimized Spline Resolution (24-36 segments with quadratic Bézier interpolation)
 *  - Batched Stardust Motes & pre-compiled musical note paths
 *  - Lightweight particle pooling with zero Garbage Collection spikes
 */

// ── Musical Vector Path Templates (Pre-compiled for max performance) ───────
const NOTE_TYPES = ["eighth", "beamed", "quarter", "clef"]

class MusicalNoteParticle {
  constructor(W, H, waveIdx) {
    this.reset(W, H, waveIdx, true)
  }

  reset(W, H, waveIdx, initial = false) {
    this.x = initial ? Math.random() * W : -50 - Math.random() * 60
    this.waveIdx = waveIdx !== undefined ? waveIdx : Math.floor(Math.random() * 4)
    this.type = NOTE_TYPES[Math.floor(Math.random() * NOTE_TYPES.length)]
    this.z = 0.4 + Math.random() * 0.6 // Parallax depth layer
    this.baseScale = (0.75 + this.z * 0.5) * (this.type === "clef" ? 0.95 : 1.1)
    this.speed = (0.5 + this.z * 0.7) * (0.85 + Math.random() * 0.3)
    this.oscPhase = Math.random() * Math.PI * 2
    this.oscSpeed = 0.02 + Math.random() * 0.015
    this.pitchRoll = (Math.random() - 0.5) * 0.2
    this.glowTimer = Math.random() * Math.PI * 2
    this.glowSpeed = 0.025 + Math.random() * 0.025
    this.waveAngle = 0
    this.y = H * 0.6
    this.excited = 0
  }

  update(dt, W, H, speedMul, getWaveY, mouse) {
    const spd = this.speed * speedMul * dt * 60
    this.x += spd
    this.oscPhase += this.oscSpeed * dt * 60
    this.glowTimer += this.glowSpeed * dt * 60

    // Surf seamlessly along the fluid aurora sine wave
    const waveY = getWaveY(this.x, this.waveIdx)
    const floatOffset = Math.sin(this.oscPhase) * (12 * this.z)
    this.y = waveY + floatOffset

    // Tangent slope angle
    const nextY = getWaveY(this.x + 16, this.waveIdx)
    this.waveAngle = Math.atan2(nextY - waveY, 16) * 0.7 + Math.sin(this.oscPhase * 0.7) * 0.1

    // Interactive Mouse Cymatics (Key / String Plucking on Hover)
    if (mouse.active) {
      const dx = this.x - mouse.x
      const dy = this.y - mouse.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 130) {
        const force = 1 - dist / 130
        this.excited = Math.min(1.0, this.excited + force * 0.3)
        this.x += (dx / (dist || 1)) * force * 3.0 * dt * 60
        this.y += (dy / (dist || 1)) * force * 3.0 * dt * 60
      }
    }
    if (this.excited > 0.001) {
      this.excited = Math.max(0, this.excited - 0.025 * dt * 60)
    }

    // Recycle on exiting right screen margin
    if (this.x > W + 60) {
      this.reset(W, H, Math.floor(Math.random() * 4), false)
    }
  }

  draw(ctx, rgbStr, baseHue) {
    const scale = this.baseScale * (1 + this.excited * 0.3)
    const alpha = Math.min(
      1.0,
      0.45 + this.z * 0.45 + Math.sin(this.glowTimer) * 0.14 + this.excited * 0.35,
    )
    if (alpha <= 0.03) return

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.waveAngle + this.pitchRoll + this.excited * 0.35)
    ctx.scale(scale, scale)

    const noteHue = (baseHue + 20 * (this.z - 0.5) + this.excited * 35 + 360) % 360
    const neonColor = `hsla(${noteHue}, 92%, 70%, ${(alpha * 0.85).toFixed(2)})`
    const whiteColor = `rgba(255, 255, 255, ${alpha.toFixed(2)})`

    // Single-pass draw per layer
    this._renderVector(ctx, neonColor, whiteColor)

    ctx.restore()
  }

  _renderVector(ctx, neonColor, whiteColor) {
    const type = this.type

    if (type === "eighth") {
      // 1. Eighth Note (♪)
      // Glow Layer
      ctx.lineWidth = 2.4
      ctx.strokeStyle = neonColor
      ctx.fillStyle = neonColor
      ctx.beginPath()
      ctx.ellipse(0, 0, 4.5, 3.2, -0.52, 0, 6.28)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(3.2, -1)
      ctx.lineTo(3.2, -18)
      ctx.bezierCurveTo(6.5, -14, 11, -12, 10, -5)
      ctx.stroke()

      // Photon Core Layer
      ctx.lineWidth = 1.2
      ctx.strokeStyle = whiteColor
      ctx.fillStyle = whiteColor
      ctx.beginPath()
      ctx.ellipse(0, 0, 4.0, 2.7, -0.52, 0, 6.28)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(3.2, -1)
      ctx.lineTo(3.2, -18)
      ctx.bezierCurveTo(6.5, -14, 11, -12, 10, -5)
      ctx.stroke()
    } else if (type === "beamed") {
      // 2. Beamed Eighth Pair (♫)
      ctx.lineWidth = 2.4
      ctx.strokeStyle = neonColor
      ctx.fillStyle = neonColor
      ctx.beginPath()
      ctx.ellipse(-7, 0, 4.0, 2.8, -0.52, 0, 6.28)
      ctx.ellipse(7, -2, 4.0, 2.8, -0.52, 0, 6.28)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(-4, -1)
      ctx.lineTo(-4, -18)
      ctx.lineTo(10, -20)
      ctx.lineTo(10, -3)
      ctx.moveTo(-4, -14)
      ctx.lineTo(10, -16)
      ctx.stroke()

      ctx.lineWidth = 1.2
      ctx.strokeStyle = whiteColor
      ctx.fillStyle = whiteColor
      ctx.beginPath()
      ctx.ellipse(-7, 0, 3.4, 2.3, -0.52, 0, 6.28)
      ctx.ellipse(7, -2, 3.4, 2.3, -0.52, 0, 6.28)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(-4, -1)
      ctx.lineTo(-4, -18)
      ctx.lineTo(10, -20)
      ctx.lineTo(10, -3)
      ctx.stroke()
    } else if (type === "quarter") {
      // 3. Quarter Note (♩)
      ctx.lineWidth = 2.2
      ctx.strokeStyle = neonColor
      ctx.fillStyle = neonColor
      ctx.beginPath()
      ctx.ellipse(0, 0, 4.5, 3.2, -0.52, 0, 6.28)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(3.2, -1)
      ctx.lineTo(3.2, -18)
      ctx.stroke()

      ctx.lineWidth = 1.1
      ctx.strokeStyle = whiteColor
      ctx.fillStyle = whiteColor
      ctx.beginPath()
      ctx.ellipse(0, 0, 4.0, 2.7, -0.52, 0, 6.28)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(3.2, -1)
      ctx.lineTo(3.2, -18)
      ctx.stroke()
    } else if (type === "clef") {
      // 4. Treble Clef (𝄞)
      ctx.lineWidth = 2.2
      ctx.strokeStyle = neonColor
      ctx.fillStyle = neonColor
      ctx.beginPath()
      ctx.moveTo(0, 10)
      ctx.bezierCurveTo(-4, 10, -6, 6, -3, 3)
      ctx.bezierCurveTo(4, -3, 6, -12, 0, -18)
      ctx.bezierCurveTo(-4, -22, -1, -26, 2, -26)
      ctx.bezierCurveTo(4, -24, 3, -18, 0, 14)
      ctx.bezierCurveTo(-2, 18, -6, 16, -6, 13)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(-5.5, 13.5, 1.5, 0, 6.28)
      ctx.fill()

      ctx.lineWidth = 1.1
      ctx.strokeStyle = whiteColor
      ctx.stroke()
    }
  }
}

// ── Fluid Aurora Sine Wave & Music Bars Engine ─────────────────────────────
export class MusicBarsEffect {
  constructor(canvasId, color = "#8be9fd") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.destroyed = false
    this.rafId = null
    this.lastDrawTime = 0
    this.time = 0
    this.color = color
    this.speed = 1.0
    this.notesEnabled = true

    this.waves = []
    this.motes = []
    this._notes = []
    this._cachedGradients = []
    this.width = 0
    this.height = 0

    // Mouse Interaction
    this.mouse = {
      x: -2000,
      y: -2000,
      lastX: -2000,
      lastY: -2000,
      active: false,
    }

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._handleMouseMove(e)
    this._mouseLeaveHandler = () => this._handleMouseLeave()
    this._visibilityHandler = () => this._handleVisibilityChange()

    this._setColorCache(color)
    window.addEventListener("resize", this._resizeHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)
    this.resize()
  }

  resize() {
    if (!this.canvas) return
    // 1x native resolution ensures silky 60-144fps on all screens
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`

    this._buildWaves()
    this._buildGradients()
    this._buildMotes()
    this._buildNotes()
  }

  updateColor(color) {
    this.color = color || "#8be9fd"
    this._setColorCache(this.color)
    this._buildGradients()
  }

  setNotes(enable) {
    this.notesEnabled = Boolean(enable)
  }

  setOptions(opts = {}) {
    if (opts.color !== undefined && opts.color !== this.color) {
      this.updateColor(opts.color)
    }
    if (opts.speed !== undefined) {
      this.speed = parseFloat(opts.speed) || 1.0
    }
    if (opts.notes !== undefined) {
      this.notesEnabled = Boolean(opts.notes)
    }
  }

  _setColorCache(hex) {
    const { r, g, b } = this._hexToRgb(hex)
    this.rgb = { r, g, b }
    this.rgbStr = `${r},${g},${b}`
    this.baseHsl = this._rgbToHsl(r, g, b)
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

  _rgbToHsl(r, g, b) {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }
    return { h: h * 360, s: s * 100, l: l * 100 }
  }

  _buildWaves() {
    const H = this.height || window.innerHeight
    const baseY = H * 0.64

    this.waves = [
      {
        id: 0,
        baseY: baseY + 28,
        amplitude: 52,
        curAmp: 52,
        freq: 0.0022,
        speed: 0.65,
        phase: 0,
        lineWidth: 2.8,
        alpha: 0.35,
        fillAlpha: 0.12,
        segments: 26,
        z: 0.35,
      },
      {
        id: 1,
        baseY: baseY + 8,
        amplitude: 72,
        curAmp: 72,
        freq: 0.0032,
        speed: 0.95,
        phase: Math.PI * 0.45,
        lineWidth: 2.4,
        alpha: 0.55,
        fillAlpha: 0.15,
        segments: 28,
        z: 0.55,
      },
      {
        id: 2,
        baseY: baseY - 14,
        amplitude: 92,
        curAmp: 92,
        freq: 0.0042,
        speed: 1.35,
        phase: Math.PI * 0.9,
        lineWidth: 2.0,
        alpha: 0.78,
        fillAlpha: 0.18,
        segments: 30,
        z: 0.75,
      },
      {
        id: 3,
        baseY: baseY - 34,
        amplitude: 108,
        curAmp: 108,
        freq: 0.0055,
        speed: 1.75,
        phase: Math.PI * 1.35,
        lineWidth: 1.6,
        alpha: 0.9,
        fillAlpha: 0.07,
        segments: 32,
        z: 1.0,
      },
    ]
  }

  _buildGradients() {
    if (!this.ctx || !this.waves.length) return
    const H = this.height || window.innerHeight

    // Pre-create and cache linear gradients to avoid allocating inside render loop
    this._cachedGradients = this.waves.map((w) => {
      const topY = Math.max(0, w.baseY - w.amplitude * 1.4)
      const grad = this.ctx.createLinearGradient(0, topY, 0, H)
      grad.addColorStop(0.0, `rgba(${this.rgbStr}, ${w.fillAlpha * 1.3})`)
      grad.addColorStop(0.4, `rgba(${this.rgbStr}, ${w.fillAlpha * 0.6})`)
      grad.addColorStop(0.8, `rgba(${this.rgbStr}, ${w.fillAlpha * 0.15})`)
      grad.addColorStop(1.0, "rgba(0, 0, 0, 0)")
      return grad
    })
  }

  _buildMotes() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight
    const count = Math.max(16, Math.min(30, Math.floor(W / 65)))

    this.motes = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: H * 0.45 + Math.random() * (H * 0.45),
      r: 0.8 + Math.random() * 1.4,
      vy: -(14 + Math.random() * 24),
      swaySpeed: 1.2 + Math.random() * 1.8,
      swayAmp: 8 + Math.random() * 16,
      phase: Math.random() * Math.PI * 2,
    }))
  }

  _buildNotes() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight
    const count = Math.max(7, Math.min(11, Math.floor(W / 180)))

    this._notes = Array.from(
      { length: count },
      (_, i) => new MusicalNoteParticle(W, H, i % 4),
    )
  }

  _handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    this.mouse.x = e.clientX - rect.left
    this.mouse.y = e.clientY - rect.top
    this.mouse.active = true
  }

  _handleMouseLeave() {
    this.mouse.x = -2000
    this.mouse.y = -2000
    this.mouse.active = false
  }

  _handleVisibilityChange() {
    if (document.visibilityState === "visible" && this.active) {
      this.lastDrawTime = performance.now()
    }
  }

  start() {
    if (this.active || !this.canvas) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.canvas.style.display = "block"
    this.resize()

    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseleave", this._mouseLeaveHandler, { passive: true })

    const loop = (timestamp) => {
      if (!this.active || this.destroyed) return
      this.rafId = requestAnimationFrame(loop)
      if (document.visibilityState === "hidden") return
      this.animate(timestamp)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stop() {
    this.active = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)

    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height)
    }
    if (this.canvas) this.canvas.style.display = "none"
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
    this.waves = []
    this.motes = []
    this._notes = []
  }

  _update(dt) {
    this.time += dt * this.speed
    const t = this.time
    const W = this.width
    const H = this.height

    // Simulating musical dynamics
    const bassPulse = Math.pow(Math.max(0, Math.sin(t * 2.4) * 0.75 + Math.sin(t * 4.8) * 0.25), 1.5)
    const midPulse = 0.5 + 0.5 * Math.sin(t * 3.5)

    for (let i = 0; i < this.waves.length; i++) {
      const w = this.waves[i]
      const beatBonus =
        i === 0
          ? bassPulse * 0.6
          : i === 1
            ? (bassPulse * 0.4 + midPulse * 0.4)
            : i === 2
              ? (midPulse * 0.5)
              : (midPulse * 0.35)

      const target = w.amplitude * (0.7 + beatBonus * 0.7)
      w.curAmp += (target - w.curAmp) * Math.min(1.0, dt * 6.0)
    }

    // Floating Stardust Motes
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i]
      m.y += m.vy * dt
      m.x += Math.sin(t * m.swaySpeed + m.phase) * (m.swayAmp * dt)

      if (m.y < H * 0.25) {
        m.y = H * 0.82 + Math.random() * (H * 0.15)
        m.x = Math.random() * W
      }
    }

    // Update Musical Notes Simulation
    if (this.notesEnabled && this._notes.length > 0) {
      const getWaveYBound = (x, waveIdx) => this._getWavePoint(this.waves[waveIdx] || this.waves[0], x, W, t)
      for (let i = 0; i < this._notes.length; i++) {
        this._notes[i].update(dt, W, H, this.speed, getWaveYBound, this.mouse)
      }
    }
  }

  _getWavePoint(w, x, W, t) {
    const normX = x / (W || 1)
    const edgeFade = Math.sin(normX * Math.PI)
    const y1 = Math.sin(x * w.freq + t * w.speed + w.phase) * w.curAmp
    const y2 = Math.sin(x * (w.freq * 2.1) - t * (w.speed * 0.8) + w.phase * 1.4) * (w.curAmp * 0.32)
    let y = w.baseY - (y1 + y2) * Math.pow(Math.max(0, edgeFade), 0.4)

    // Soft Mouse Fluid Displacement
    if (this.mouse.active) {
      const dx = x - this.mouse.x
      const mDist = Math.abs(dx)
      if (mDist < 180) {
        y += (1 - mDist / 180) * 24 * Math.cos((mDist / 180) * 1.57)
      }
    }

    return y
  }

  _drawWave(w, W, H, t) {
    const ctx = this.ctx
    const step = W / w.segments
    const totalPts = w.segments + 2

    // 1. Build points
    const pts = []
    for (let i = 0; i <= totalPts; i++) {
      const x = i * step
      const y = this._getWavePoint(w, x, W, t)
      pts.push({ x, y })
    }

    // 2. Pre-cached Translucent Fluid Gradient Fill
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) * 0.5
      const yc = (pts[i].y + pts[i + 1].y) * 0.5
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc)
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
    ctx.lineTo(W + 20, H + 20)
    ctx.lineTo(-20, H + 20)
    ctx.closePath()

    ctx.fillStyle = this._cachedGradients[w.id] || `rgba(${this.rgbStr}, 0.1)`
    ctx.fill()

    // 3. Vibrant Neon Outline
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) * 0.5
      const yc = (pts[i].y + pts[i + 1].y) * 0.5
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc)
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
    ctx.strokeStyle = `rgba(${this.rgbStr}, ${w.alpha})`
    ctx.lineWidth = w.lineWidth
    ctx.stroke()

    // 4. White-Hot Photon Spine (Layer 2 & 3)
    if (w.id >= 2) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${(w.alpha * 0.45).toFixed(2)})`
      ctx.lineWidth = 1.0
      ctx.stroke()
    }
  }

  _draw() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height
    const t = this.time

    ctx.clearRect(0, 0, W, H)

    ctx.globalCompositeOperation = "lighter"

    // 1. Draw Multi-Layer Fluid Aurora Waves
    for (let i = 0; i < this.waves.length; i++) {
      this._drawWave(this.waves[i], W, H, t)
    }

    // 2. Draw Celestial Stardust Spark Motes (Batched single draw call)
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)"
    ctx.beginPath()
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i]
      ctx.moveTo(m.x + m.r, m.y)
      ctx.arc(m.x, m.y, m.r, 0, 6.28)
    }
    ctx.fill()

    // 3. Draw Floating Musical Notes Simulation
    if (this.notesEnabled && this._notes.length > 0) {
      const baseHue = this.baseHsl?.h || 187
      for (let i = 0; i < this._notes.length; i++) {
        this._notes[i].draw(ctx, this.rgbStr, baseHue)
      }
    }

    ctx.globalCompositeOperation = "source-over"
  }

  animate(currentTime = 0) {
    if (!this.active || this.destroyed) return
    const elapsed = currentTime - this.lastDrawTime
    const dt = Math.min(elapsed / 1000, 0.04) || 0.016
    this.lastDrawTime = currentTime

    this._update(dt)
    this._draw()
  }
}


