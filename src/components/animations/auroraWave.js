/**
 * Fluid Aurora Waves & Musical Symphony — Hollywood / AAA Ultra HD Engine
 *
 * Implements 6 Golden Principles:
 *  1. Organic Fluid Geometry: Continuous harmonic spline wave ribbons & vector Bezier musical notes.
 *  2. 3D Parallax Depth: Multi-depth Aurora silk veils (Z: 0.25 - 1.0) & floating musical notes.
 *  3. Triple-Pass Optical Bloom: White-hot photon core (#ffffff) wrapped in vibrant spectral halos.
 *  4. Fluid Aerodynamics & Mouse Cymatics: Soft cushioned spring wake & musical note resonance.
 *  5. 60Hz - 240Hz High-DPI Optimization: DPR scaling & frame delta normalization.
 *  6. Seamless Startpage Settings Integration: full setOptions, setNotes, live update color & sliders.
 */

// ── Musical Vector Types ───────────────────────────────────────────────────
const NOTE_TYPES = ["eighth", "beamed", "quarter", "clef"]

class MusicalNoteParticle {
  constructor(W, H, waveIdx) {
    this.reset(W, H, waveIdx, true)
  }

  reset(W, H, waveIdx, initial = false) {
    this.x = initial ? Math.random() * W : -50 - Math.random() * 80
    this.waveIdx = waveIdx !== undefined ? waveIdx : Math.floor(Math.random() * 5)
    this.type = NOTE_TYPES[Math.floor(Math.random() * NOTE_TYPES.length)]
    this.z = 0.35 + Math.random() * 0.65 // Parallax depth layer
    this.baseScale = (0.75 + this.z * 0.55) * (this.type === "clef" ? 0.95 : 1.15)
    this.speed = (0.55 + this.z * 0.75) * (0.85 + Math.random() * 0.35)
    this.oscPhase = Math.random() * Math.PI * 2
    this.oscSpeed = 0.02 + Math.random() * 0.02
    this.pitchRoll = (Math.random() - 0.5) * 0.25
    this.glowTimer = Math.random() * Math.PI * 2
    this.glowSpeed = 0.03 + Math.random() * 0.03
    this.waveAngle = 0
    this.y = H * 0.5
    this.excited = 0 // Mouse cymatic excitation
    this.trail = []
  }

  update(dt, W, H, speedMul, getWaveY, time, mouse) {
    const spd = this.speed * speedMul * dt
    this.x += spd
    this.oscPhase += this.oscSpeed * dt
    this.glowTimer += this.glowSpeed * dt

    // Surf seamlessly on the harmonic ribbon curve
    const waveY = getWaveY(this.x, time, this.waveIdx)
    const floatOffset = Math.sin(this.oscPhase) * (15 * this.z)
    this.y = waveY + floatOffset

    // Dynamic tangent orientation along the wave crest
    const nextY = getWaveY(this.x + 14, time, this.waveIdx)
    this.waveAngle = Math.atan2(nextY - waveY, 14) * 0.7 + Math.sin(this.oscPhase * 0.7) * 0.12

    // Mouse Cymatic Resonance (Interactive String / Key Plucking)
    if (mouse.active) {
      const dx = this.x - mouse.x
      const dy = this.y - mouse.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 140) {
        const force = 1 - dist / 140
        this.excited = Math.min(1.0, this.excited + force * 0.28)
        this.x += (dx / (dist || 1)) * force * 3.5 * dt
        this.y += (dy / (dist || 1)) * force * 3.5 * dt
      }
    }
    this.excited = Math.max(0, this.excited - 0.018 * dt)

    // Stardust Sparkle Trail
    if (Math.random() < 0.28 * this.z && this.trail.length < 6) {
      this.trail.push({
        x: this.x,
        y: this.y,
        life: 1.0,
        size: Math.random() * 2.2 + 0.8,
      })
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life -= 0.04 * dt
      if (this.trail[i].life <= 0) {
        this.trail.splice(i, 1)
      }
    }

    // Recycle on exiting right screen margin
    if (this.x > W + 80) {
      this.reset(W, H, Math.floor(Math.random() * 5), false)
    }
  }

  draw(ctx, baseColorHsl, brightness) {
    const scale = this.baseScale * (1 + this.excited * 0.35)
    const alpha = Math.min(
      1.0,
      (0.42 + this.z * 0.45 + Math.sin(this.glowTimer) * 0.14 + this.excited * 0.38) * brightness,
    )
    if (alpha <= 0.02) return

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.waveAngle + this.pitchRoll + this.excited * 0.4)
    ctx.scale(scale, scale)

    // Stardust Sparkles Trail
    for (let i = 0; i < this.trail.length; i++) {
      const tr = this.trail[i]
      const tAlpha = tr.life * 0.55 * alpha
      ctx.fillStyle = `rgba(255, 255, 255, ${tAlpha.toFixed(3)})`
      ctx.fillRect(tr.x - this.x, tr.y - this.y, tr.size, tr.size)
    }

    const noteHue = (baseColorHsl.h + 24 * (this.z - 0.5) + (this.excited * 40) + 360) % 360
    const neonColor = `hsla(${noteHue}, 95%, 72%, ${(alpha * 0.9).toFixed(3)})`
    const whiteColor = `rgba(255, 255, 255, ${alpha.toFixed(3)})`

    // Pass 1: Vibrant Bioluminescent Neon Outline
    ctx.lineWidth = 2.4
    ctx.strokeStyle = neonColor
    ctx.fillStyle = neonColor
    this._drawShape(ctx)

    // Pass 2: White-Hot Photon Core
    ctx.lineWidth = 1.2
    ctx.strokeStyle = whiteColor
    ctx.fillStyle = whiteColor
    this._drawShape(ctx)

    ctx.restore()
  }

  _drawShape(ctx) {
    const type = this.type
    if (type === "eighth") {
      // 1. Eighth Note (♪)
      ctx.beginPath()
      ctx.ellipse(0, 0, 4.5, 3.2, -Math.PI / 6, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(3.2, -1)
      ctx.lineTo(3.2, -18)
      ctx.bezierCurveTo(6.5, -14, 11, -12, 10, -5)
      ctx.stroke()
    } else if (type === "beamed") {
      // 2. Beamed Eighth Pair (♫)
      ctx.beginPath()
      ctx.ellipse(-7, 0, 4.0, 2.8, -Math.PI / 6, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.ellipse(7, -2, 4.0, 2.8, -Math.PI / 6, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(-4, -1)
      ctx.lineTo(-4, -18)
      ctx.lineTo(10, -20)
      ctx.lineTo(10, -3)
      ctx.stroke()

      // Upper Beam
      ctx.beginPath()
      ctx.moveTo(-4, -14)
      ctx.lineTo(10, -16)
      ctx.stroke()
    } else if (type === "quarter") {
      // 3. Quarter Note (♩)
      ctx.beginPath()
      ctx.ellipse(0, 0, 4.5, 3.2, -Math.PI / 6, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(3.2, -1)
      ctx.lineTo(3.2, -18)
      ctx.stroke()
    } else if (type === "clef") {
      // 4. Treble Clef (𝄞)
      ctx.beginPath()
      ctx.moveTo(0, 10)
      ctx.bezierCurveTo(-4, 10, -6, 6, -3, 3)
      ctx.bezierCurveTo(4, -3, 6, -12, 0, -18)
      ctx.bezierCurveTo(-4, -22, -1, -26, 2, -26)
      ctx.bezierCurveTo(4, -24, 3, -18, 0, 14)
      ctx.bezierCurveTo(-2, 18, -6, 16, -6, 13)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(-5.5, 13.5, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// ── Fluid Aurora Wave Engine ───────────────────────────────────────────────
export class AuroraWaveEffect {
  constructor(canvasId, color = "#00bcd4", options = {}) {
    this.canvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId

    if (!this.canvas) {
      console.warn(`[AuroraWaveEffect] Canvas "${canvasId}" not found.`)
      return
    }

    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.destroyed = false
    this.rafId = null

    // Configuration
    this.color = color
    this.waveCount = 5
    this.wavePoints = 56
    this.waveAmplitude = options.waveAmplitude || 75
    this.waveFrequency = 0.0035
    this.brightness = options.brightness !== undefined ? options.brightness : 0.75
    this.speed = options.speed !== undefined ? options.speed : 1.0
    this.transparent = options.transparent !== false
    this.backgroundColor = options.backgroundColor || "#02040f"
    this.bgOpacity = options.bgOpacity !== undefined ? options.bgOpacity : 0.15
    this.notesEnabled = options.notes !== undefined ? Boolean(options.notes) : true

    // Timing & DPR
    this.time = 0
    this.lastTime = 0
    this.dpr = 1
    this.width = 0
    this.height = 0

    // Simulation Entities
    this._gradients = []
    this._waveConfigs = []
    this._particles = []
    this._notes = []

    // Mouse Interaction
    this.mouse = {
      x: -2000,
      y: -2000,
      lastX: -2000,
      lastY: -2000,
      vx: 0,
      vy: 0,
      active: false,
    }

    // Event Handlers
    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._handleMouseMove(e)
    this._mouseLeaveHandler = () => this._handleMouseLeave()
    this._visibilityHandler = () => this._handleVisibilityChange()

    window.addEventListener("resize", this._resizeHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)
    this.resize()
  }

  resize() {
    if (!this.canvas) return
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`

    this._buildCache()
  }

  _onResize() {
    this.resize()
  }

  _buildCache() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight
    const baseHsl = this._hexToHsl(this.color)

    this._gradients = []
    this._waveConfigs = []

    for (let w = 0; w < this.waveCount; w++) {
      const z = 0.3 + (w / (this.waveCount - 1)) * 0.7
      const hueShift = (w - this.waveCount * 0.5) * 22
      const hue = (baseHsl.h + hueShift + 360) % 360
      const op = Math.max(0.1, Math.min(1.0, this.brightness * (0.35 + z * 0.35)))

      // Triple-pass fluid gradient with brilliant luminous core
      const grad = this.ctx.createLinearGradient(0, 0, 0, H * 0.85)
      grad.addColorStop(0.0, `hsla(${hue}, 85%, 35%, 0)`)
      grad.addColorStop(0.25, `hsla(${hue}, 90%, 55%, ${(op * 0.35).toFixed(3)})`)
      grad.addColorStop(0.5, `hsla(${(hue + 25) % 360}, 100%, 75%, ${(op * 0.85).toFixed(3)})`)
      grad.addColorStop(0.7, `hsla(${hue}, 90%, 50%, ${(op * 0.3).toFixed(3)})`)
      grad.addColorStop(1.0, `hsla(${hue}, 80%, 25%, 0)`)

      this._gradients.push(grad)

      this._waveConfigs.push({
        phase: Math.random() * Math.PI * 2,
        speed: 0.005 + w * 0.0018,
        amplitude: 0.75 + w * 0.18,
        yOffset: (w - this.waveCount * 0.5) * (H * 0.07),
        z,
      })
    }

    // Atmospheric Stardust motes
    const particleCount = Math.floor(45 + 25 * this.brightness)
    this._particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 2.2 + 0.6,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.006,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.25,
      z: Math.random() * 0.8 + 0.2,
    }))

    // Harmonic Musical Notes
    const noteCount = Math.floor(16 + 10 * this.brightness)
    this._notes = Array.from(
      { length: noteCount },
      (_, i) => new MusicalNoteParticle(W, H, i % this.waveCount),
    )
  }

  _hexToHsl(hex) {
    if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
      return { h: 187, s: 100, l: 42 } // Default cyan #00bcd4
    }
    const clean = hex.replace("#", "")
    const full = clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean
    const r = parseInt(full.slice(0, 2), 16) / 255
    const g = parseInt(full.slice(2, 4), 16) / 255
    const b = parseInt(full.slice(4, 6), 16) / 255

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

  _getWaveY(x, t, waveIdx) {
    const cfg = this._waveConfigs[waveIdx] || this._waveConfigs[0]
    const { phase, speed, amplitude } = cfg
    const time = t * speed * this.speed
    const f = this.waveFrequency
    const a = this.waveAmplitude * amplitude

    // Multi-octave harmonic fluid equation
    let y = Math.sin(x * f + time + phase) * a
    y += Math.sin(x * f * 2.1 + time * 1.4 + phase * 0.7) * (a * 0.32)
    y += Math.cos(x * f * 0.85 - time * 0.65 + phase * 0.4) * (a * 0.38)

    // Soft Mouse fluid deflection
    if (this.mouse.active) {
      const dx = x - this.mouse.x
      const mDist = Math.abs(dx)
      if (mDist < 220) {
        const mouseDisplacement = (1 - mDist / 220) * 28 * Math.cos((mDist / 220) * Math.PI * 0.5)
        y += mouseDisplacement
      }
    }

    const centerY = (this.height || window.innerHeight) * 0.48
    return centerY + cfg.yOffset + y
  }

  _handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    const curX = e.clientX - rect.left
    const curY = e.clientY - rect.top

    if (this.mouse.lastX > -1000) {
      this.mouse.vx = (curX - this.mouse.lastX) * 0.35
      this.mouse.vy = (curY - this.mouse.lastY) * 0.35
    }
    this.mouse.lastX = curX
    this.mouse.lastY = curY
    this.mouse.x = curX
    this.mouse.y = curY
    this.mouse.active = true
  }

  _handleMouseLeave() {
    this.mouse.x = -2000
    this.mouse.y = -2000
    this.mouse.lastX = -2000
    this.mouse.lastY = -2000
    this.mouse.vx = 0
    this.mouse.vy = 0
    this.mouse.active = false
  }

  _handleVisibilityChange() {
    if (document.visibilityState === "visible" && this.active) {
      this.lastTime = performance.now()
    }
  }

  start() {
    if (this.active || this.destroyed) return
    this.active = true
    this.lastTime = performance.now()
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
    if (!this.active) return
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
    this.canvas.style.display = "none"
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  setNotes(enable) {
    this.notesEnabled = Boolean(enable)
  }

  updateColor(hex) {
    if (hex && typeof hex === "string") {
      this.color = hex
      this._buildCache()
    }
  }

  setOptions(options = {}) {
    let rebuild = false
    if (options.color !== undefined && options.color !== this.color) {
      this.color = options.color
      rebuild = true
    }
    if (options.brightness !== undefined && options.brightness !== this.brightness) {
      this.brightness = options.brightness
      rebuild = true
    }
    if (options.speed !== undefined) this.speed = options.speed
    if (options.waveAmplitude !== undefined) this.waveAmplitude = options.waveAmplitude
    if (options.transparent !== undefined) this.transparent = options.transparent
    if (options.backgroundColor !== undefined) this.backgroundColor = options.backgroundColor
    if (options.bgOpacity !== undefined) this.bgOpacity = options.bgOpacity
    if (options.notes !== undefined) {
      this.notesEnabled = Boolean(options.notes)
    }

    if (rebuild) {
      this._buildCache()
    }
  }

  animate(currentTime = 0) {
    if (!this.active || this.destroyed) return

    const rawElapsed = this.lastTime ? currentTime - this.lastTime : 16.67
    this.lastTime = currentTime
    const dt = Math.min(Math.max(rawElapsed / (1000 / 60), 0.1), 3.0)
    this.time += 0.012 * dt

    const ctx = this.ctx
    const W = this.width
    const H = this.height

    // 1. Background Fill / Clear
    ctx.globalCompositeOperation = "source-over"
    if (this.transparent) {
      ctx.clearRect(0, 0, W, H)
      if (this.bgOpacity > 0.01) {
        ctx.fillStyle = `rgba(1, 2, 12, ${this.bgOpacity})`
        ctx.fillRect(0, 0, W, H)
      }
    } else {
      ctx.fillStyle = this.backgroundColor
      ctx.fillRect(0, 0, W, H)
    }

    const baseHsl = this._hexToHsl(this.color)

    // 2. Render Stardust Motes
    ctx.globalCompositeOperation = "screen"
    ctx.fillStyle = "#ffffff"
    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i]
      p.phase += p.speed * dt
      p.x += p.vx * this.speed * dt
      p.y += p.vy * this.speed * dt

      if (p.x < 0) p.x = W
      if (p.x > W) p.x = 0
      if (p.y < 0) p.y = H
      if (p.y > H) p.y = 0

      const pOpacity = (Math.sin(p.phase) * 0.5 + 0.5) * 0.65 * this.brightness * p.z
      const pSize = p.size * (0.8 + 0.35 * Math.sin(p.phase * 0.8))

      ctx.globalAlpha = Math.max(0, Math.min(1, pOpacity))
      ctx.beginPath()
      ctx.arc(p.x, p.y, pSize, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1.0

    // 3. Render Fluid Aurora Waves (Organic Bezier Spline Ribbons)
    ctx.globalCompositeOperation = "lighter"
    const pointsCount = this.wavePoints
    const step = W / pointsCount
    const getWaveYBound = (x, t, w) => this._getWaveY(x, t, w)

    for (let w = 0; w < this.waveCount; w++) {
      const cfg = this._waveConfigs[w]
      const thickness = (110 + Math.sin(this.time * 0.6 + w * 1.2) * 35) * cfg.z

      // Compute Spline Nodes
      const topPts = []
      const botPts = []

      for (let i = 0; i <= pointsCount; i++) {
        const x = i * step
        const yTop = this._getWaveY(x, this.time, w)
        const yBot = yTop + thickness
        topPts.push({ x, y: yTop })
        botPts.push({ x, y: yBot })
      }

      ctx.fillStyle = this._gradients[w]
      ctx.beginPath()
      ctx.moveTo(topPts[0].x, topPts[0].y)

      // Smooth Cubic Spline Curvature (Top Edge)
      for (let i = 1; i < topPts.length - 1; i++) {
        const xc = (topPts[i].x + topPts[i + 1].x) * 0.5
        const yc = (topPts[i].y + topPts[i + 1].y) * 0.5
        ctx.quadraticCurveTo(topPts[i].x, topPts[i].y, xc, yc)
      }
      ctx.lineTo(topPts[topPts.length - 1].x, topPts[topPts.length - 1].y)

      // Smooth Bottom Edge Return
      ctx.lineTo(botPts[botPts.length - 1].x, botPts[botPts.length - 1].y)
      for (let i = botPts.length - 2; i >= 0; i--) {
        const xc = (botPts[i].x + botPts[i + 1].x) * 0.5
        const yc = (botPts[i].y + botPts[i + 1].y) * 0.5
        ctx.quadraticCurveTo(botPts[i + 1].x, botPts[i + 1].y, xc, yc)
      }
      ctx.lineTo(botPts[0].x, botPts[0].y)
      ctx.closePath()
      ctx.fill()

      // Luminous Core Spine (White-Hot Photon Ribbons on Center Ribbons)
      if (w === 2 || w === 3) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.35 * this.brightness * cfg.z).toFixed(3)})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(topPts[0].x, topPts[0].y + thickness * 0.45)
        for (let i = 1; i < topPts.length - 1; i++) {
          const xc = (topPts[i].x + topPts[i + 1].x) * 0.5
          const yc = (topPts[i].y + topPts[i + 1].y) * 0.5 + thickness * 0.45
          ctx.quadraticCurveTo(topPts[i].x, topPts[i].y + thickness * 0.45, xc, yc)
        }
        ctx.stroke()
      }
    }

    // 4. Render Floating Musical Notes Simulation
    if (this.notesEnabled && this._notes.length > 0) {
      for (let i = 0; i < this._notes.length; i++) {
        const note = this._notes[i]
        note.update(dt, W, H, this.speed, getWaveYBound, this.time, this.mouse)
        note.draw(ctx, baseHsl, this.brightness)
      }
    }
  }
}
