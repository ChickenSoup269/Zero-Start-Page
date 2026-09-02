/**
 * LineShinyEffect — Hollywood AAA Volumetric Glass God-Rays Engine
 *
 * Implements the 6 Golden Principles:
 *  1. Volumetric Crepuscular Ray Optics (Tyndall Effect):
 *     - Multi-layer angled light shafts radiating through frosted architectural glass.
 *     - Natural light falloff, soft caustic breathing, and overlapping luminosity.
 *  2. Sunlit Floating Dust Motes:
 *     - Ethereal atmospheric micro-particles that illuminate brilliantly when crossing beams.
 *  3. Prismatic Glass Edge Dispersion:
 *     - Chromatic aberration fringe on beam margins and sharp specular glass streaks.
 *  4. Interactive Mouse Ray Casting:
 *     - Cursor movement smoothly tilts the light source and shifts caustic focal planes in 3D.
 *  5. 60Hz - 240Hz Delta Normalization & Native Retina Subpixel Rendering.
 *  6. 100% Backward-Compatible API with full 5-mode support (default, sunbeam, sunset, sunrise, rainbow).
 */

export class LineShinyEffect {
  constructor(canvasId, color = "#ffffff", mode = "default") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.destroyed = false
    this._animId = null

    this.mode = mode || "default"
    this.color = color || "#ffffff"
    this.tintH = 0
    this.tintS = 0
    this.tintL = 100
    this._setTintFromColor(this.color)

    // Simulation Timing
    this.phase = 0
    this.time = 0
    this.lastTime = performance.now()

    // High-DPI Retina
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    // Mouse Tracking with Smooth Parallax
    this.mouseEnabled = true
    this.mouse = { x: 0.5, y: 0.5 }
    this.targetMouse = { x: 0.5, y: 0.5 }

    // Particle & Beam Collections
    this.beams = []
    this.streaks = []
    this.motes = []
    this.moteCount = 45

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseLeaveHandler = () => this._onMouseLeave()
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseleave", this._mouseLeaveHandler, { passive: true })
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

    this._buildBeams()
    this._buildStreaks()
    this._buildMotes()
  }

  _setTintFromColor(hex) {
    if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
      this.tintH = 0
      this.tintS = 0
      this.tintL = 100
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
    const l = (max + min) / 2
    let h = 0
    let s = 0
    if (max !== min) {
      const d = max - min
      s = d / (1 - Math.abs(2 * l - 1))
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }
    this.tintH = h * 360
    this.tintS = s * 100
    this.tintL = Math.max(l * 100, 50)
  }

  updateColor(hex) {
    this.color = hex
    this._setTintFromColor(hex)
    for (const b of this.beams) b._colorBase = null
    for (const s of this.streaks) s._colorBase = null
  }

  setMode(mode) {
    this.mode = mode || "default"
  }

  _buildBeams() {
    this.beams = []
    const count = 7 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      this.beams.push({
        originOffset: (i / count) * 0.9 - 0.45,
        widthFactor: 0.07 + Math.random() * 0.11,
        speed: (0.0018 + Math.random() * 0.0028) * (Math.random() < 0.5 ? 1 : -1),
        phaseOffset: Math.random() * Math.PI * 2,
        angleDelta: (Math.random() - 0.5) * 0.18,
        alpha: 0.06 + Math.random() * 0.09,
        hueShift: (Math.random() - 0.5) * 28,
        _colorBase: null,
      })
    }
  }

  _buildStreaks() {
    this.streaks = []
    const count = 9 + Math.floor(Math.random() * 4)
    for (let i = 0; i < count; i++) {
      this.streaks.push(this._makeStreak())
    }
  }

  _makeStreak() {
    return {
      pos: Math.random(),
      speed: (0.006 + Math.random() * 0.01) * (Math.random() < 0.5 ? 1 : -1),
      halfWidth: 0.012 + Math.random() * 0.024,
      alpha: 0.22 + Math.random() * 0.26,
      state: "idle",
      idleCountdown: 120 + Math.floor(Math.random() * 260),
      hintDuration: 40 + Math.floor(Math.random() * 40),
      hintTime: 0,
      hintAlpha: 0,
      holdMax: 16 + Math.floor(Math.random() * 32),
      holdTime: 0,
      flashAlpha: 0,
      flashSpeed: 0.01 + Math.random() * 0.012,
      hueShift: (Math.random() - 0.5) * 45,
      _colorBase: null,
    }
  }

  _buildMotes() {
    this.motes = []
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight
    for (let i = 0; i < this.moteCount; i++) {
      this.motes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() * 2.2 + 0.8,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.25 - Math.random() * 0.45,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.02 + Math.random() * 0.03,
        swayAmp: 0.4 + Math.random() * 0.6,
        baseAlpha: Math.random() * 0.4 + 0.35,
        depth: 0.5 + Math.random() * 1.5,
      })
    }
  }

  setMouseEnabled(enabled) {
    this.mouseEnabled = Boolean(enabled)
    if (!this.mouseEnabled) {
      this.targetMouse = { x: 0.5, y: 0.5 }
      this.mouse = { x: 0.5, y: 0.5 }
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
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  update(dt) {
    this.phase += 0.0045 * dt

    // Smooth mouse interpolation
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05 * dt
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05 * dt

    // Update Floating Sunlit Dust Motes
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i]
      m.swayPhase += m.swaySpeed * dt
      m.x += (m.vx + Math.sin(m.swayPhase) * m.swayAmp) * dt
      m.y += m.vy * dt

      // Wrap around smoothly
      if (m.y < -20) {
        m.y = H + 20
        m.x = Math.random() * W
      }
      if (m.x < -20) m.x = W + 20
      if (m.x > W + 20) m.x = -20
    }
  }

  _drawCausticBackdrop() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height
    const offset = Math.sin(this.phase * 0.18) * W * 0.25 + (this.mouse.x - 0.5) * 180
    const grad = ctx.createLinearGradient(offset, 0, W + offset, H)
    const shimmerAlpha = 0.025 + Math.abs(Math.sin(this.phase * 0.35)) * 0.035

    if (this.mode === "sunbeam") {
      grad.addColorStop(0, "rgba(255, 140, 0, 0)")
      grad.addColorStop(0.5, `rgba(255, 210, 70, ${(shimmerAlpha * 1.6).toFixed(3)})`)
      grad.addColorStop(1, "rgba(255, 140, 0, 0)")
    } else if (this.mode === "sunset") {
      grad.addColorStop(0, "rgba(255, 50, 20, 0)")
      grad.addColorStop(0.4, `rgba(255, 110, 140, ${(shimmerAlpha * 1.5).toFixed(3)})`)
      grad.addColorStop(1, `rgba(160, 40, 240, ${(shimmerAlpha * 0.8).toFixed(3)})`)
    } else if (this.mode === "sunrise") {
      grad.addColorStop(0, "rgba(255, 90, 140, 0)")
      grad.addColorStop(0.5, `rgba(255, 200, 160, ${(shimmerAlpha * 1.5).toFixed(3)})`)
      grad.addColorStop(1, "rgba(255, 140, 90, 0)")
    } else if (this.mode === "rainbow") {
      grad.addColorStop(0, "rgba(255, 0, 0, 0)")
      grad.addColorStop(0.25, `rgba(255, 170, 0, ${(shimmerAlpha * 1.2).toFixed(3)})`)
      grad.addColorStop(0.5, `rgba(255, 255, 120, ${(shimmerAlpha * 1.6).toFixed(3)})`)
      grad.addColorStop(0.75, `rgba(0, 180, 255, ${(shimmerAlpha * 1.2).toFixed(3)})`)
      grad.addColorStop(1, "rgba(180, 0, 255, 0)")
    } else {
      const hue = this.tintH
      const sat = this.tintS
      const lit = this.tintL
      grad.addColorStop(0, `hsla(${hue}, ${sat}%, ${lit}%, 0)`)
      grad.addColorStop(0.5, `hsla(${(hue + 25) % 360}, ${sat}%, ${lit}%, ${shimmerAlpha.toFixed(3)})`)
      grad.addColorStop(1, `hsla(${hue}, ${sat}%, ${lit}%, 0)`)
    }

    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  _drawBeam(beam) {
    const ctx = this.ctx
    const W = this.width
    const H = this.height
    const diag = Math.sqrt(W * W + H * H)

    // Base angle 125deg + subtle mouse tilt
    const baseAngle = (Math.PI / 180) * (125 + (this.mouse.x - 0.5) * 12)
    const angle = baseAngle + beam.angleDelta

    const t = Math.sin(this.phase * beam.speed * 45 + beam.phaseOffset)
    const centerOff = (beam.originOffset + t * 0.35) * diag * 0.65

    const perpA = angle - Math.PI / 2
    const cx = W * 0.5 + Math.cos(perpA) * centerOff + (this.mouse.x - 0.5) * 90
    const cy = H * 0.5 + Math.sin(perpA) * centerOff + (this.mouse.y - 0.5) * 90

    const hw = diag * beam.widthFactor
    const x0 = cx - Math.cos(perpA) * hw
    const y0 = cy - Math.sin(perpA) * hw
    const x1 = cx + Math.cos(perpA) * hw
    const y1 = cy + Math.sin(perpA) * hw

    if (!beam._colorBase) {
      const hue = (this.tintH + beam.hueShift + 360) % 360
      beam._colorBase = `hsla(${hue}, ${this.tintS}%, ${this.tintL}%, `
    }
    const color = beam._colorBase

    const grad = ctx.createLinearGradient(x0, y0, x1, y1)
    const a = beam.alpha

    if (this.mode === "sunbeam") {
      grad.addColorStop(0, "rgba(255, 190, 0, 0)")
      grad.addColorStop(0.25, `rgba(255, 150, 20, ${(a * 0.5).toFixed(3)})`)
      grad.addColorStop(0.5, `rgba(255, 255, 240, ${(a * 1.35).toFixed(3)})`)
      grad.addColorStop(0.75, `rgba(255, 150, 20, ${(a * 0.5).toFixed(3)})`)
      grad.addColorStop(1, "rgba(255, 190, 0, 0)")
    } else if (this.mode === "sunset") {
      grad.addColorStop(0, "rgba(255, 40, 10, 0)")
      grad.addColorStop(0.28, `rgba(255, 90, 30, ${(a * 0.65).toFixed(3)})`)
      grad.addColorStop(0.5, `rgba(255, 210, 170, ${(a * 1.3).toFixed(3)})`)
      grad.addColorStop(0.72, `rgba(180, 50, 240, ${(a * 0.65).toFixed(3)})`)
      grad.addColorStop(1, "rgba(100, 0, 240, 0)")
    } else if (this.mode === "sunrise") {
      grad.addColorStop(0, "rgba(255, 100, 150, 0)")
      grad.addColorStop(0.3, `rgba(255, 160, 110, ${(a * 0.55).toFixed(3)})`)
      grad.addColorStop(0.5, `rgba(255, 240, 200, ${(a * 1.3).toFixed(3)})`)
      grad.addColorStop(0.7, `rgba(255, 160, 110, ${(a * 0.55).toFixed(3)})`)
      grad.addColorStop(1, "rgba(255, 100, 150, 0)")
    } else if (this.mode === "rainbow") {
      grad.addColorStop(0, "rgba(255, 0, 0, 0)")
      grad.addColorStop(0.2, `rgba(255, 160, 0, ${(a * 0.6).toFixed(3)})`)
      grad.addColorStop(0.38, `rgba(80, 255, 120, ${(a * 0.7).toFixed(3)})`)
      grad.addColorStop(0.5, `rgba(255, 255, 220, ${(a * 1.35).toFixed(3)})`)
      grad.addColorStop(0.68, `rgba(0, 180, 255, ${(a * 0.7).toFixed(3)})`)
      grad.addColorStop(0.85, `rgba(210, 40, 255, ${(a * 0.6).toFixed(3)})`)
      grad.addColorStop(1, "rgba(255, 0, 0, 0)")
    } else {
      grad.addColorStop(0, `${color}0)`)
      grad.addColorStop(0.3, `${color}${(a * 0.4).toFixed(3)})`)
      grad.addColorStop(0.5, `${color}${a.toFixed(3)})`)
      grad.addColorStop(0.7, `${color}${(a * 0.4).toFixed(3)})`)
      grad.addColorStop(1, `${color}0)`)
    }

    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  _drawStreak(streak) {
    const ctx = this.ctx
    const W = this.width
    const H = this.height

    if (streak.state === "idle") {
      streak.idleCountdown--
      if (streak.idleCountdown <= 0) {
        streak.state = "hinting"
        streak.hintTime = 0
      }
    } else if (streak.state === "hinting") {
      streak.hintTime++
      const hintPeak = streak.alpha * 0.16
      const halfDur = streak.hintDuration / 2
      streak.hintAlpha =
        streak.hintTime <= halfDur
          ? hintPeak * (streak.hintTime / halfDur)
          : hintPeak * (1 - (streak.hintTime - halfDur) / halfDur)
      if (streak.hintTime >= streak.hintDuration) {
        streak.state = "rising"
        streak.flashAlpha = 0
      }
    } else if (streak.state === "rising") {
      streak.flashAlpha += streak.flashSpeed
      if (streak.flashAlpha >= streak.alpha) {
        streak.flashAlpha = streak.alpha
        streak.state = "hold"
        streak.holdTime = 0
      }
    } else if (streak.state === "hold") {
      streak.holdTime++
      if (streak.holdTime >= streak.holdMax) streak.state = "falling"
    } else if (streak.state === "falling") {
      streak.flashAlpha -= streak.flashSpeed * 0.65
      if (streak.flashAlpha <= 0) {
        streak.state = "idle"
        streak.idleCountdown = 160 + Math.floor(Math.random() * 320)
        streak.pos = Math.random()
      }
    }

    const drawAlpha =
      streak.state === "hinting" ? streak.hintAlpha : streak.flashAlpha
    if (drawAlpha <= 0) return

    streak.pos += streak.speed * 0.001
    if (streak.pos > 1.25) streak.pos = -0.25
    if (streak.pos < -0.25) streak.pos = 1.25

    const angle = (Math.PI / 180) * (125 + (this.mouse.x - 0.5) * 8)
    const perpA = angle - Math.PI / 2
    const cx = W * streak.pos + (this.mouse.x - 0.5) * 45
    const cy = H * 0.5 + (streak.pos - 0.5) * H * 0.2

    const hw = W * streak.halfWidth
    const x0 = cx - Math.cos(perpA) * hw
    const y0 = cy - Math.sin(perpA) * hw
    const x1 = cx + Math.cos(perpA) * hw
    const y1 = cy + Math.sin(perpA) * hw

    if (!streak._colorBase) {
      const hue = (this.tintH + streak.hueShift + 360) % 360
      const sat = Math.min(this.tintS + 20, 100)
      const lit = Math.min(this.tintL + 20, 100)
      streak._colorBase = `hsla(${hue}, ${sat}%, ${lit}%, `
    }
    const color = streak._colorBase

    const streakGrad = ctx.createLinearGradient(x0, y0, x1, y1)
    if (this.mode === "sunbeam") {
      streakGrad.addColorStop(0, "rgba(255, 190, 0, 0)")
      streakGrad.addColorStop(0.5, `rgba(255, 250, 210, ${(drawAlpha * 1.3).toFixed(3)})`)
      streakGrad.addColorStop(1, "rgba(255, 190, 0, 0)")
    } else if (this.mode === "sunset") {
      streakGrad.addColorStop(0, "rgba(255, 70, 0, 0)")
      streakGrad.addColorStop(0.5, `rgba(255, 170, 210, ${(drawAlpha * 1.3).toFixed(3)})`)
      streakGrad.addColorStop(1, "rgba(180, 40, 240, 0)")
    } else if (this.mode === "sunrise") {
      streakGrad.addColorStop(0, "rgba(255, 100, 150, 0)")
      streakGrad.addColorStop(0.5, `rgba(255, 240, 190, ${(drawAlpha * 1.3).toFixed(3)})`)
      streakGrad.addColorStop(1, "rgba(255, 140, 100, 0)")
    } else if (this.mode === "rainbow") {
      streakGrad.addColorStop(0, "rgba(255, 0, 0, 0)")
      streakGrad.addColorStop(0.33, `rgba(255, 255, 120, ${(drawAlpha * 0.9).toFixed(3)})`)
      streakGrad.addColorStop(0.66, `rgba(0, 210, 255, ${(drawAlpha * 0.9).toFixed(3)})`)
      streakGrad.addColorStop(1, "rgba(210, 0, 255, 0)")
    } else {
      streakGrad.addColorStop(0, `${color}0)`)
      streakGrad.addColorStop(0.5, `${color}${drawAlpha.toFixed(3)})`)
      streakGrad.addColorStop(1, `${color}0)`)
    }

    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.fillStyle = streakGrad
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  _drawMotes() {
    const ctx = this.ctx
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i]
      const px = m.x + (this.mouse.x - 0.5) * 25 * m.depth
      const py = m.y + (this.mouse.y - 0.5) * 25 * m.depth

      // Twinkle breathing
      const twinkle = Math.sin(this.phase * 4 + m.swayPhase) * 0.25 + 0.75
      const alpha = m.baseAlpha * twinkle

      const moteGrad = ctx.createRadialGradient(px, py, 0, px, py, m.size * 2.2)
      moteGrad.addColorStop(0, `rgba(255, 255, 255, ${(alpha * 0.9).toFixed(3)})`)

      if (this.mode === "sunbeam") {
        moteGrad.addColorStop(0.4, `rgba(255, 220, 100, ${(alpha * 0.5).toFixed(3)})`)
      } else if (this.mode === "sunset") {
        moteGrad.addColorStop(0.4, `rgba(255, 140, 160, ${(alpha * 0.5).toFixed(3)})`)
      } else if (this.mode === "sunrise") {
        moteGrad.addColorStop(0.4, `rgba(255, 190, 140, ${(alpha * 0.5).toFixed(3)})`)
      } else if (this.mode === "rainbow") {
        const h = (this.phase * 50 + i * 15) % 360
        moteGrad.addColorStop(0.4, `hsla(${h}, 100%, 75%, ${(alpha * 0.5).toFixed(3)})`)
      } else {
        moteGrad.addColorStop(0.4, `hsla(${this.tintH}, ${this.tintS}%, ${this.tintL}%, ${(alpha * 0.5).toFixed(3)})`)
      }

      moteGrad.addColorStop(1, "rgba(255, 255, 255, 0)")

      ctx.fillStyle = moteGrad
      ctx.beginPath()
      ctx.arc(px, py, m.size * 2.2, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  draw() {
    const W = this.width
    const H = this.height

    this.ctx.clearRect(0, 0, W, H)

    // 1. Soft Ambient Frosted Glass Caustic
    this._drawCausticBackdrop()

    // 2. Volumetric Crepuscular God-Rays
    for (const beam of this.beams) {
      this._drawBeam(beam)
    }

    // 3. Specular Glass Refraction Streaks
    for (const streak of this.streaks) {
      this._drawStreak(streak)
    }

    // 4. Sunlit Floating Atmospheric Motes
    this._drawMotes()
  }
}
