/**
 * ShinyEffect — Hollywood AAA Prismatic Holographic Foil & Crystal Light Engine
 *
 * Implements the 6 Golden Principles:
 *  1. Physical Prismatic Diffraction & Iridescence:
 *     - Multi-spectral diffraction grating with smooth trigonometric hue shifts.
 *     - Sweeping specular foil beam with chromatic violet/cyan/gold dispersion wings.
 *  2. Anamorphic Diamond & Compass Star Glints:
 *     - Needle-sharp 4-point and 8-point flares with central photon cores & chromatic auras.
 *  3. 3D Hologram Tilt Parallax:
 *     - Smooth 3D tilt tracking cursor motion, mimicking a collector holographic card tilted in sunlight.
 *  4. Interactive Sparkle Bursts:
 *     - Clicking anywhere erupts a cascade of shimmering prismatic diamond micro-sparks.
 *  5. 60Hz - 240Hz Delta Normalization & Native High-DPI Retina Subpixel Rendering.
 *  6. 100% Backward-Compatible API with full lifecycle management.
 */

export class ShinyEffect {
  constructor(canvasId, color = "#ff0000") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.destroyed = false
    this._animId = null

    // Hue configuration
    this.color = color || "#ff0000"
    this.hueOffset = 0
    this._setHueFromColor(this.color)

    // High-DPI Retina
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    // Simulation Timing
    this.phase = 0
    this.time = 0
    this.lastTime = performance.now()

    // 3D Tilt Parallax Tracking
    this.mouseEnabled = true
    this.mouse = { x: 0.5, y: 0.5 }
    this.targetMouse = { x: 0.5, y: 0.5 }
    this.tilt = { x: 0, y: 0 }

    // Glints & Interactive Particles
    this.glints = []
    this.glintCount = 42
    this.bursts = []

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseLeaveHandler = () => this._onMouseLeave()
    this._clickHandler = (e) => this._onClick(e)
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseleave", this._mouseLeaveHandler, { passive: true })
    window.addEventListener("click", this._clickHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)
  }

  resize() {
    if (!this.canvas) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = Math.round(this.width * this.dpr)
    this.canvas.height = Math.round(this.height * this.dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.canvas.style.pointerEvents = "none"

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.ctx.scale(this.dpr, this.dpr)
    }

    this._initGlints()
  }

  _setHueFromColor(hex) {
    if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
      this.hueOffset = 0
      return
    }
    const raw = hex.replace("#", "")
    const fullHex = raw.length === 3
      ? raw.split("").map((c) => c + c).join("")
      : raw
    const r = parseInt(fullHex.slice(0, 2), 16) / 255
    const g = parseInt(fullHex.slice(2, 4), 16) / 255
    const b = parseInt(fullHex.slice(4, 6), 16) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    if (max !== min) {
      const d = max - min
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }
    this.hueOffset = h * 360
  }

  updateColor(hex) {
    this.color = hex
    this._setHueFromColor(hex)
  }

  _initGlints() {
    this.glints = []
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight
    for (let i = 0; i < this.glintCount; i++) {
      this.glints.push(this._makeGlint(W, H))
    }
  }

  _makeGlint(W, H) {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1.5 + Math.random() * 4.5,
      pts: Math.random() > 0.55 ? 8 : 4,
      alpha: 0,
      maxAlpha: 0.45 + Math.random() * 0.45,
      state: "in",
      holdTime: 0,
      holdMax: 8 + Math.floor(Math.random() * 24),
      speed: 0.02 + Math.random() * 0.035,
      rotation: Math.random() * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 0.025,
      depth: 0.4 + Math.random() * 1.6,
      hueShift: (Math.random() - 0.5) * 60,
    }
  }

  _drawStar(ctx, r, pts) {
    const step = Math.PI / pts
    const innerR = r * 0.14 // needle-sharp diamond flares
    ctx.beginPath()
    ctx.moveTo(0, -r)
    for (let i = 0; i < pts * 2; i++) {
      const rad = i % 2 === 0 ? r : innerR
      const a = i * step - Math.PI / 2
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad)
    }
    ctx.closePath()
    ctx.fill()
  }

  setMouseEnabled(enabled) {
    this.mouseEnabled = Boolean(enabled)
    if (!this.mouseEnabled) {
      this.targetMouse = { x: 0.5, y: 0.5 }
      this.mouse = { x: 0.5, y: 0.5 }
      this.tilt = { x: 0, y: 0 }
    }
  }

  _onMouseMove(e) {
    if (this.mouseEnabled === false) return
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight
    this.targetMouse.x = e.clientX / W
    this.targetMouse.y = e.clientY / H
  }

  _onMouseLeave() {
    this.targetMouse.x = 0.5
    this.targetMouse.y = 0.5
  }

  _onClick(e) {
    if (!this.active || this.mouseEnabled === false) return
    const x = e.clientX
    const y = e.clientY
    const burstCount = 14 + Math.floor(Math.random() * 8)

    for (let i = 0; i < burstCount; i++) {
      if (this.bursts.length < 75) {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 4.5 + 1.2
        this.bursts.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.8,
          r: Math.random() * 3.5 + 1.2,
          pts: Math.random() > 0.4 ? 4 : 8,
          rotation: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.15,
          alpha: 1.0,
          decay: Math.random() * 0.025 + 0.015,
          hue: (this.hueOffset + Math.random() * 120 - 60) % 360,
        })
      }
    }
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.lastTime = performance.now()
    }
  }

  start() {
    if (this.active || this.destroyed) return
    this.active = true
    this.phase = 0
    this.lastTime = performance.now()
    this.mouse.x = 0.5
    this.mouse.y = 0.5
    this.targetMouse.x = 0.5
    this.targetMouse.y = 0.5

    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"

    this.resize()

    const loop = (now) => {
      if (!this.active || this.destroyed) return
      this._animId = requestAnimationFrame(loop)

      if (document.visibilityState === "hidden") {
        this.lastTime = now
        return
      }

      const elapsed = Math.min(now - this.lastTime, 100)
      this.lastTime = now
      const dt = Math.min(elapsed / 16.67, 3.0)

      this.update(dt)
      this.draw()
    }

    this._animId = requestAnimationFrame(loop)
  }

  stop() {
    if (!this.active) return
    this.active = false
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.canvas) {
      this.canvas.style.display = "none"
    }
    this.bursts = []
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
    window.removeEventListener("click", this._clickHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  update(dt) {
    this.phase += 0.0035 * dt

    // Smooth 3D tilt interpolation
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.06 * dt
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.06 * dt
    this.tilt.x = (this.mouse.x - 0.5) * 2
    this.tilt.y = (this.mouse.y - 0.5) * 2

    // Update burst particles
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.vx *= Math.pow(0.93, dt)
      b.vy = (b.vy + 0.06 * dt) * Math.pow(0.94, dt)
      b.rotation += b.rotSpeed * dt
      b.alpha -= b.decay * dt

      if (b.alpha <= 0) {
        this.bursts.splice(i, 1)
      }
    }
  }

  draw() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height

    ctx.clearRect(0, 0, W, H)

    const ho = this.hueOffset
    const diag = Math.sqrt(W * W + H * H)

    // Holographic Foil Tilt Angle (modulated dynamically by mouse)
    const baseAngle = 135 * (Math.PI / 180)
    const dynamicAngle = baseAngle + this.tilt.x * 0.25 - this.tilt.y * 0.15
    const cosA = Math.cos(dynamicAngle)
    const sinA = Math.sin(dynamicAngle)

    // --- 1. Holographic Prismatic Foil Overlay ---
    ctx.save()
    ctx.globalCompositeOperation = "source-over"

    const panOffset = Math.sin(this.phase * 0.45) * diag * 0.28 + this.tilt.x * 120
    const cx = W / 2 + cosA * panOffset
    const cy = H / 2 + sinA * panOffset

    const gx0 = cx - cosA * diag * 0.85
    const gy0 = cy - sinA * diag * 0.85
    const gx1 = cx + cosA * diag * 0.85
    const gy1 = cy + sinA * diag * 0.85

    const rainbow = ctx.createLinearGradient(gx0, gy0, gx1, gy1)
    const steps = 14
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const hue = (ho + t * 360 + this.tilt.x * 45) % 360
      rainbow.addColorStop(t, `hsla(${hue}, 90%, 65%, 0.13)`)
    }
    ctx.fillStyle = rainbow
    ctx.fillRect(0, 0, W, H)
    ctx.restore()

    // --- 2. Sweeping Iridescent Specular Band ---
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    const sweepPos = (((this.phase * 0.35) % 1.5) - 0.25) * (diag * 1.8) - diag * 0.9 + this.tilt.x * 320
    const bcx = W / 2 + cosA * sweepPos
    const bcy = H / 2 + sinA * sweepPos
    const bWidth = diag * 0.22

    const bx0 = bcx - cosA * bWidth
    const by0 = bcy - sinA * bWidth
    const bx1 = bcx + cosA * bWidth
    const by1 = bcy + sinA * bWidth

    const hNow = (ho + this.phase * 35 + this.tilt.y * 50) % 360
    const band = ctx.createLinearGradient(bx0, by0, bx1, by1)
    band.addColorStop(0, `hsla(${hNow}, 100%, 75%, 0)`)
    band.addColorStop(0.35, `hsla(${(hNow + 30) % 360}, 100%, 88%, 0.12)`)
    band.addColorStop(0.5, `rgba(255, 255, 255, 0.32)`) // White-hot photon core
    band.addColorStop(0.65, `hsla(${(hNow + 80) % 360}, 100%, 88%, 0.12)`)
    band.addColorStop(1, `hsla(${hNow}, 100%, 75%, 0)`)

    ctx.fillStyle = band
    ctx.fillRect(0, 0, W, H)
    ctx.restore()

    // --- 3. Anamorphic Diamond & Star Glints ---
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    for (let i = 0; i < this.glints.length; i++) {
      const g = this.glints[i]

      // State machine (fade in -> hold -> fade out)
      if (g.state === "in") {
        g.alpha += g.speed
        if (g.alpha >= g.maxAlpha) {
          g.alpha = g.maxAlpha
          g.state = "hold"
          g.holdTime = 0
        }
      } else if (g.state === "hold") {
        if (++g.holdTime >= g.holdMax) g.state = "out"
      } else {
        g.alpha -= g.speed
        if (g.alpha <= 0) {
          this.glints[i] = this._makeGlint(W, H)
          continue
        }
      }

      if (g.alpha <= 0) continue

      g.rotation += g.rotSpeed

      // 3D Parallax shift
      const gx = g.x + this.tilt.x * 40 * g.depth
      const gy = g.y + this.tilt.y * 40 * g.depth
      const hue = (ho + (g.x / W) * 220 + this.phase * 60 + g.hueShift) % 360

      ctx.save()
      ctx.globalAlpha = g.alpha
      ctx.translate(gx, gy)
      ctx.rotate(g.rotation)

      // Dual-pass star flare
      // 1. Prismatic chromatic aura
      const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, g.r * 4.5)
      aura.addColorStop(0, `hsla(${hue}, 100%, 98%, 0.95)`)
      aura.addColorStop(0.35, `hsla(${hue}, 100%, 75%, 0.45)`)
      aura.addColorStop(1, "rgba(255, 255, 255, 0)")
      ctx.fillStyle = aura
      ctx.beginPath()
      ctx.arc(0, 0, g.r * 4.5, 0, Math.PI * 2)
      ctx.fill()

      // 2. Needle-sharp specular star spikes
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)"
      this._drawStar(ctx, g.r * 1.25, g.pts)

      ctx.restore()
    }

    // --- 4. Interactive Click Glitter Bursts ---
    for (let i = 0; i < this.bursts.length; i++) {
      const b = this.bursts[i]
      ctx.save()
      ctx.globalAlpha = b.alpha
      ctx.translate(b.x, b.y)
      ctx.rotate(b.rotation)

      const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, b.r * 3.5)
      aura.addColorStop(0, `hsla(${b.hue}, 100%, 100%, 1)`)
      aura.addColorStop(0.4, `hsla(${b.hue}, 100%, 75%, 0.6)`)
      aura.addColorStop(1, "rgba(255, 255, 255, 0)")
      ctx.fillStyle = aura
      ctx.beginPath()
      ctx.arc(0, 0, b.r * 3.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "rgba(255, 255, 255, 0.95)"
      this._drawStar(ctx, b.r, b.pts)
      ctx.restore()
    }

    ctx.restore()
  }
}
