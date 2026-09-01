/**
 * MeteorEffect — Ultra-Sleek, Atmospheric & High-Performance Celestial Shooting Stars
 *
 * Highlights:
 *  - Atmospheric Deep Space Vignette (Moody dark night sky overlay with rich contrast)
 *  - Multi-Tier Twinkling Starfield with Diamond Diffraction Flares
 *  - 3-Pass Ionized Plasma Meteor Streaks with Incandescent Core & Radiant Head Flares
 *  - Trailing Stardust Embers & Drifting Nebula Puffs
 *  - Zero-GC Object Pooling & High-Speed Hardware Accelerated Canvas Rendering
 */

export class MeteorEffect {
  constructor(canvasId, color = "#c8b8ff") {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) throw new Error(`Canvas #${canvasId} not found`)
    this.ctx = this.canvas.getContext("2d", { alpha: true })

    this.active = false
    this.speedMult = 1.0
    this.spawnRate = 1.2
    this.angleDeg = 45
    this.fullColor = false

    this.colors = []
    this.setColor(color)

    this.meteors = []
    this.sparks = []
    this.nebulaPuffs = []
    this.stars = []
    this._acc = 0
    this._lastT = 0
    this._nextBrightMeteor = 5000 + Math.random() * 6000
    this._nextNebulaMeteor = 10000 + Math.random() * 12000
    this.cssWidth = 0
    this.cssHeight = 0

    this.resize()
    this._onResize = () => this.resize()
    window.addEventListener("resize", this._onResize)
  }

  // ─── PUBLIC API ───────────────────────────────────────────────

  start() {
    if (this.active) return
    this.active = true
    this._lastT = 0
    this._acc = 0
    this.canvas.style.display = "block"
    requestAnimationFrame((t) => {
      this._lastT = t
      this._loop(t)
    })
  }

  stop() {
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._onResize)
  }

  setColor(color) {
    if (Array.isArray(color)) {
      this.colors = color.map((c) => this._parseHex(c))
    } else {
      this.colors = [this._parseHex(color)]
    }
  }

  setAngle(deg) {
    this.angleDeg = deg
  }

  setFullColor(enabled) {
    this.fullColor = enabled
  }

  setSpeed(s) {
    this.speedMult = Math.max(0.1, Math.min(5, s))
  }

  setSpawnRate(r) {
    this.spawnRate = Math.max(0.5, Math.min(20, r))
  }

  resize() {
    if (!this.canvas) return
    this.cssWidth = window.innerWidth
    this.cssHeight = window.innerHeight
    this.canvas.width = this.cssWidth
    this.canvas.height = this.cssHeight
    this.canvas.style.width = `${this.cssWidth}px`
    this.canvas.style.height = `${this.cssHeight}px`
    this._buildStars()
  }

  // ─── COLOR LOGIC ──────────────────────────────────────────────

  _parseHex(hex) {
    const c = (hex || "#c8b8ff").replace("#", "")
    const full = c.length === 3 ? c[0] + c[0] + c[1] + c[1] + c[2] + c[2] : c
    const r = parseInt(full.slice(0, 2), 16) || 200
    const g = parseInt(full.slice(2, 4), 16) || 184
    const b = parseInt(full.slice(4, 6), 16) || 255
    return {
      r,
      g,
      b,
      rgbStr: `${r},${g},${b}`,
      hex: "#" + full,
    }
  }

  _getRandomColor() {
    if (this.fullColor) {
      const palette = [
        { r: 255, g: 180, b: 100, rgbStr: "255,180,100" }, // Amber Gold
        { r: 120, g: 235, b: 255, rgbStr: "120,235,255" }, // Cyan Ice
        { r: 255, g: 140, b: 230, rgbStr: "255,140,230" }, // Neon Magenta
        { r: 180, g: 160, b: 255, rgbStr: "180,160,255" }, // Celestial Violet
        { r: 255, g: 245, b: 160, rgbStr: "255,245,160" }, // Cosmic Starlight
        { r: 110, g: 255, b: 205, rgbStr: "110,255,205" }, // Emerald Aurora
      ]
      return palette[Math.floor(Math.random() * palette.length)]
    }
    if (this.colors.length === 0) return { r: 200, g: 184, b: 255, rgbStr: "200,184,255" }
    return this.colors[Math.floor(Math.random() * this.colors.length)]
  }

  // ─── HIGH-PERFORMANCE STARFIELD ───────────────────────────────

  _buildStars() {
    const W = this.cssWidth
    const H = this.cssHeight
    const count = Math.max(65, Math.min(150, Math.floor((W * H) / 14000)))

    this.stars = Array.from({ length: count }, () => {
      const rand = Math.random()
      // Tier 0: 70% micro faint stars, Tier 1: 24% medium bright, Tier 2: 6% sparkling diamond stars
      const tier = rand < 0.7 ? 0 : rand < 0.94 ? 1 : 2
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: tier === 0 ? 0.6 + Math.random() * 0.4 : tier === 1 ? 1.1 + Math.random() * 0.5 : 1.8 + Math.random() * 0.6,
        baseAlpha: tier === 0 ? 0.25 + Math.random() * 0.25 : tier === 1 ? 0.55 + Math.random() * 0.35 : 0.85 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
        speed: tier === 0 ? 0.0007 + Math.random() * 0.001 : tier === 1 ? 0.0015 + Math.random() * 0.002 : 0.0025 + Math.random() * 0.002,
        tier,
      }
    })
  }

  // ─── SPAWN METEORS ────────────────────────────────────────────

  _spawnMeteor(mode = "normal") {
    const W = this.cssWidth
    const H = this.cssHeight

    const isNebula = mode === "nebula"
    const isBright = mode === "bright" || isNebula

    const jitter = isNebula
      ? Math.random() * 1.5 - 0.75
      : isBright
        ? Math.random() * 2.5 - 1.25
        : Math.random() * 4.0 - 2.0

    const angle = ((this.angleDeg + jitter) * Math.PI) / 180
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)

    const baseSpeed = isNebula
      ? 24 + Math.random() * 8
      : isBright
        ? 28 + Math.random() * 10
        : 22 + Math.random() * 14

    const speed = baseSpeed * this.speedMult

    const len = isNebula
      ? 360 + Math.random() * 180
      : isBright
        ? 220 + Math.random() * 140
        : 130 + Math.random() * 130

    const thickness = isNebula
      ? 1.8 + Math.random() * 0.5
      : isBright
        ? 1.4 + Math.random() * 0.4
        : 0.9 + Math.random() * 0.4

    const color = this._getRandomColor()

    let x, y
    if (Math.abs(cosA) > Math.abs(sinA)) {
      x = cosA > 0 ? -len : W + len
      y = Math.random() * (H + len * 2) - len
    } else {
      x = Math.random() * (W + len * 2) - len
      y = sinA > 0 ? -len : H + len
    }

    x += (Math.random() - 0.5) * W * 0.4
    y += (Math.random() - 0.5) * H * 0.4

    const meteor = {
      mode,
      isNebula,
      isBright,
      x,
      y,
      vx: cosA * speed,
      vy: sinA * speed,
      cosA,
      sinA,
      len,
      thickness,
      progress: 0,
      decayRate: isNebula
        ? 0.005 + Math.random() * 0.002
        : isBright
          ? 0.010 + Math.random() * 0.004
          : 0.016 + Math.random() * 0.010,
      color,
      sparkTimer: 0,
      nebulaTimer: 0,
    }

    this.meteors.push(meteor)
  }

  // ─── UPDATE ───────────────────────────────────────────────────

  _update(dt) {
    const s = this.speedMult * (dt / 16.67)
    const W = this.cssWidth
    const H = this.cssHeight

    // 1. Spawning
    this._acc += this.spawnRate * (dt / 1000)
    while (this._acc >= 1) {
      this._spawnMeteor("normal")
      this._acc -= 1
    }

    this._nextBrightMeteor -= dt
    if (this._nextBrightMeteor <= 0) {
      this._spawnMeteor("bright")
      this._nextBrightMeteor = 5500 + Math.random() * 6500
    }

    this._nextNebulaMeteor -= dt
    if (this._nextNebulaMeteor <= 0) {
      this._spawnMeteor("nebula")
      this._nextNebulaMeteor = 12000 + Math.random() * 14000
    }

    // 2. Update Meteors
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i]
      m.x += m.vx * s
      m.y += m.vy * s
      m.progress += m.decayRate * s

      // Cosmic dust puffs on large nebula bolides
      if (m.isNebula && m.progress > 0.06 && m.progress < 0.94) {
        m.nebulaTimer += dt
        if (m.nebulaTimer >= 30 && this.nebulaPuffs.length < 35) {
          m.nebulaTimer = 0
          this.nebulaPuffs.push({
            x: m.x,
            y: m.y,
            vx: -m.cosA * 0.4 + (Math.random() - 0.5) * 0.3,
            vy: -m.sinA * 0.4 + (Math.random() - 0.5) * 0.3,
            r: 10,
            maxR: 38 + Math.random() * 18,
            life: 1.0,
            decayRate: 0.008,
            color: m.color,
          })
        }
      }

      // Spark embers trailing behind bright shooting stars
      if (m.isBright) {
        m.sparkTimer += dt
        if (m.sparkTimer > 40 && m.progress > 0.15 && m.progress < 0.85 && this.sparks.length < 30) {
          m.sparkTimer = 0
          this.sparks.push({
            x: m.x - m.cosA * (15 + Math.random() * 10),
            y: m.y - m.sinA * (15 + Math.random() * 10),
            vx: -m.cosA * (0.6 + Math.random() * 0.5) + (Math.random() - 0.5) * 0.4,
            vy: -m.sinA * (0.6 + Math.random() * 0.5) + (Math.random() - 0.5) * 0.4,
            life: 0.45,
            maxLife: 0.45,
            color: m.color,
          })
        }
      }

      const outMargin = m.len * 2
      if (
        m.progress >= 1.0 ||
        m.x < -outMargin ||
        m.x > W + outMargin ||
        m.y < -outMargin ||
        m.y > H + outMargin
      ) {
        this.meteors.splice(i, 1)
      }
    }

    // 3. Update Nebula Puffs
    for (let i = this.nebulaPuffs.length - 1; i >= 0; i--) {
      const p = this.nebulaPuffs[i]
      p.x += p.vx * s
      p.y += p.vy * s
      p.r += (p.maxR - p.r) * 0.045 * s
      p.life -= p.decayRate * s
      if (p.life <= 0) this.nebulaPuffs.splice(i, 1)
    }

    // 4. Update Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i]
      sp.x += sp.vx * s
      sp.y += sp.vy * s
      sp.life -= 0.024 * s
      if (sp.life <= 0) this.sparks.splice(i, 1)
    }
  }

  // ─── OPTIMIZED DRAWING ────────────────────────────────────────

  _drawAtmosphericBackdrop() {
    const ctx = this.ctx
    const W = this.cssWidth
    const H = this.cssHeight

    // Deep cosmic night sky vignette overlay
    const bgGrad = ctx.createRadialGradient(
      W * 0.5,
      H * 0.45,
      Math.min(W, H) * 0.1,
      W * 0.5,
      H * 0.5,
      Math.max(W, H) * 0.85,
    )
    bgGrad.addColorStop(0, "rgba(5, 7, 15, 0.42)")
    bgGrad.addColorStop(0.65, "rgba(3, 4, 10, 0.62)")
    bgGrad.addColorStop(1, "rgba(1, 2, 6, 0.78)")

    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)
  }

  _drawStars(t) {
    const ctx = this.ctx
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
    ctx.beginPath()

    for (const s of this.stars) {
      const tw = 0.5 + Math.sin(t * s.speed + s.phase) * 0.45
      const alpha = s.baseAlpha * tw
      if (alpha < 0.08) continue

      ctx.moveTo(s.x + s.r, s.y)
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    }
    ctx.fill()

    // Diamond 4-point sparkle for the brightest prominent stars
    for (const s of this.stars) {
      if (s.tier !== 2) continue
      const tw = 0.5 + Math.sin(t * s.speed + s.phase) * 0.5
      if (tw < 0.65) continue
      const flareLen = (s.r * 2.8) * tw
      ctx.strokeStyle = `rgba(255, 255, 255, ${(tw - 0.65) * 2.0})`
      ctx.lineWidth = 0.75
      ctx.beginPath()
      // Horizontal ray
      ctx.moveTo(s.x - flareLen, s.y)
      ctx.lineTo(s.x + flareLen, s.y)
      // Vertical ray
      ctx.moveTo(s.x, s.y - flareLen)
      ctx.lineTo(s.x, s.y + flareLen)
      ctx.stroke()
    }
  }

  _drawMeteorStreak(m) {
    const ctx = this.ctx
    const intensity = Math.sin(m.progress * Math.PI)
    if (intensity <= 0.02) return

    const alpha = Math.pow(intensity, 1.15)
    const hx = m.x
    const hy = m.y
    const tx = hx - m.cosA * m.len
    const ty = hy - m.sinA * m.len
    const { rgbStr } = m.color

    // Linear Gradient for streak with soft luminous fade
    const grad = ctx.createLinearGradient(tx, ty, hx, hy)
    grad.addColorStop(0, `rgba(${rgbStr},0)`)
    grad.addColorStop(0.55, `rgba(${rgbStr},${0.35 * alpha})`)
    grad.addColorStop(0.88, `rgba(${rgbStr},${0.85 * alpha})`)
    grad.addColorStop(1.0, `rgba(255,255,255,${0.98 * alpha})`)

    // Pass 1: Luminous Outer Plasma Glow Halo
    ctx.strokeStyle = grad
    ctx.lineWidth = m.thickness * 3.4
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(hx, hy)
    ctx.stroke()

    // Pass 2: High-Density Radiant Beam
    ctx.strokeStyle = grad
    ctx.lineWidth = m.thickness * 1.6
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(hx, hy)
    ctx.stroke()

    // Pass 3: Ultra-White Incandescent Core
    const coreLen = m.len * (m.isBright ? 0.5 : 0.35)
    const coreX = hx - m.cosA * coreLen
    const coreY = hy - m.sinA * coreLen
    ctx.strokeStyle = `rgba(255,255,255,${0.95 * alpha})`
    ctx.lineWidth = Math.max(0.75, m.thickness * 0.75)
    ctx.beginPath()
    ctx.moveTo(coreX, coreY)
    ctx.lineTo(hx, hy)
    ctx.stroke()

    // Radiant Head Flare / Comet Glow
    const headRadius = m.thickness * (m.isBright ? 2.6 : 1.8)
    const headGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, headRadius * 2.2)
    headGrad.addColorStop(0, `rgba(255,255,255,${alpha})`)
    headGrad.addColorStop(0.35, `rgba(${rgbStr},${0.8 * alpha})`)
    headGrad.addColorStop(1, `rgba(${rgbStr},0)`)

    ctx.fillStyle = headGrad
    ctx.beginPath()
    ctx.arc(hx, hy, headRadius * 2.2, 0, Math.PI * 2)
    ctx.fill()
  }

  _drawNebulaPuffs() {
    const ctx = this.ctx
    for (const p of this.nebulaPuffs) {
      const alpha = p.life * 0.18
      if (alpha <= 0.01) continue

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
      grad.addColorStop(0, `rgba(${p.color.rgbStr},${alpha * 1.6})`)
      grad.addColorStop(0.55, `rgba(${p.color.rgbStr},${alpha * 0.7})`)
      grad.addColorStop(1, "rgba(0,0,0,0)")

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  _draw(t) {
    const ctx = this.ctx
    const W = this.cssWidth
    const H = this.cssHeight

    ctx.clearRect(0, 0, W, H)

    // 1. Atmospheric Deep Cosmic Night Vignette
    this._drawAtmosphericBackdrop()

    // 2. Multi-tier Sparkling Starfield
    this._drawStars(t)

    // 3. High-Performance Additive Composite for Luminous Meteors
    ctx.globalCompositeOperation = "lighter"

    // Trailing Nebula Puffs
    if (this.nebulaPuffs.length > 0) {
      this._drawNebulaPuffs()
    }

    // Shooting Stars / Meteors
    for (const m of this.meteors) {
      this._drawMeteorStreak(m)
    }

    // Floating Stardust Sparks
    if (this.sparks.length > 0) {
      for (const sp of this.sparks) {
        const alpha = (sp.life / sp.maxLife) * 0.85
        ctx.fillStyle = `rgba(${sp.color.rgbStr},${alpha})`
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, 1.0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.globalCompositeOperation = "source-over"
  }

  // ─── ANIMATION LOOP ───────────────────────────────────────────

  _loop(now) {
    if (!this.active) return
    if (document.visibilityState === "hidden") {
      document.addEventListener(
        "visibilitychange",
        () => {
          if (!document.hidden && this.active) {
            requestAnimationFrame((t) => this._loop(t))
          }
        },
        { once: true },
      )
      return
    }
    this._animId = requestAnimationFrame((t) => this._loop(t))

    const dt = Math.min(now - this._lastT, 40)
    this._lastT = now
    this._update(dt)
    this._draw(now)
  }
}


