/**
 * MeteorEffect — Hollywood AAA Cosmic Meteor & Starfield Engine
 *
 * Implements the 6 Golden Principles:
 *  1. Physical Atmospheric Aerodynamics & Plasma Re-entry:
 *     - Incandescent white-hot nucleus (#ffffff) with aerodynamic teardrop compression.
 *     - Long, tapering ionization plasma tail with smooth exponential falloff.
 *     - Shedding stardust & incandescent spark fragmentation wake.
 *  2. Multi-Tier Deep Cosmic Starfield:
 *     - Distant micro-stars, pulsating variable stars, and bright stars with 4-point diffraction spikes.
 *  3. Interactive Wishing Star on Click:
 *     - Clicking summons a brilliant celestial wishing star streaking across the sky.
 *  4. 60Hz - 240Hz Delta Normalization & Native Retina Subpixel Rendering.
 *  5. Full Settings Integration: setColor, setAngle, setFullColor, setSpeed, setSpawnRate.
 *  6. 100% Backward-Compatible API with zero memory leaks.
 */

export class MeteorEffect {
  constructor(canvasId, color = "#ffffff") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) throw new Error(`Canvas #${canvasId} not found`)

    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.destroyed = false
    this._animId = null

    this.speedMult = 1.0
    this.spawnRate = 1.0
    this.angleDeg = 45
    this.fullColor = false
    this.mouseEnabled = true

    this.colors = []
    this.setColor(color)

    this.meteors = []
    this.sparks = []
    this.stars = []
    this._acc = 0
    this._lastT = performance.now()

    // High-DPI Retina
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this._resizeHandler = () => this.resize()
    this._clickHandler = (e) => this._onClick(e)
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("click", this._clickHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)
  }

  // ─── PUBLIC API ───────────────────────────────────────────────

  start() {
    if (this.active || this.destroyed) return
    this.active = true
    this._lastT = performance.now()
    this._acc = 0
    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"

    this.resize()

    const loop = (now) => {
      if (!this.active || this.destroyed) return
      this._animId = requestAnimationFrame(loop)

      if (document.visibilityState === "hidden") {
        this._lastT = now
        return
      }

      const elapsed = Math.min(now - this._lastT, 100)
      this._lastT = now
      const dt = Math.min(elapsed / 16.67, 3.0)

      this._update(dt)
      this._draw(now)
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
    this.meteors = []
    this.sparks = []
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("click", this._clickHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  setColor(color) {
    if (Array.isArray(color)) {
      this.colors = color.map((c) => this._parseHex(c))
    } else {
      this.colors = [this._parseHex(color)]
    }
  }

  setAngle(deg) {
    this.angleDeg = deg !== undefined && !isNaN(deg) ? Number(deg) : 45
  }

  setFullColor(enabled) {
    this.fullColor = Boolean(enabled)
  }

  setSpeed(s) {
    this.speedMult = Math.max(0.2, Math.min(4, s))
  }

  setSpawnRate(r) {
    this.spawnRate = Math.max(0.3, Math.min(10, r))
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

    this._buildStars()
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this._lastT = performance.now()
    }
  }

  setMouseEnabled(enabled) {
    this.mouseEnabled = Boolean(enabled)
  }

  _onClick(e) {
    if (!this.active || this.mouseEnabled === false) return
    // Spawn a radiant wishing meteor passing through the clicked sector
    this._spawnMeteor(true, e.clientX, e.clientY)
  }

  // ─── COLOR LOGIC ──────────────────────────────────────────────

  _parseHex(hex) {
    const c = (hex || "#ffffff").replace("#", "")
    const full = c.length === 3 ? c[0] + c[0] + c[1] + c[1] + c[2] + c[2] : c
    const r = parseInt(full.slice(0, 2), 16) || 255
    const g = parseInt(full.slice(2, 4), 16) || 255
    const b = parseInt(full.slice(4, 6), 16) || 255
    return {
      r,
      g,
      b,
      rgbStr: `${r},${g},${b}`,
    }
  }

  _getRandomColor() {
    if (this.fullColor) {
      const palette = [
        { r: 255, g: 190, b: 120, rgbStr: "255,190,120" },
        { r: 130, g: 230, b: 255, rgbStr: "130,230,255" },
        { r: 255, g: 140, b: 220, rgbStr: "255,140,220" },
        { r: 180, g: 170, b: 255, rgbStr: "180,170,255" },
        { r: 140, g: 255, b: 210, rgbStr: "140,255,210" },
        { r: 255, g: 225, b: 130, rgbStr: "255,225,130" },
      ]
      return palette[Math.floor(Math.random() * palette.length)]
    }
    if (this.colors.length === 0) return { r: 255, g: 255, b: 255, rgbStr: "255,255,255" }
    return this.colors[Math.floor(Math.random() * this.colors.length)]
  }

  // ─── MULTI-TIER DEEP STARFIELD ────────────────────────────────

  _buildStars() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight
    const count = Math.max(65, Math.min(130, Math.floor((W * H) / 14000)))

    this.stars = Array.from({ length: count }, () => {
      const rand = Math.random()
      let tier = 1 // 1 = micro, 2 = medium, 3 = bright with spikes
      let size = 1.0
      if (rand > 0.88) {
        tier = 3
        size = 2.2 + Math.random() * 0.8
      } else if (rand > 0.65) {
        tier = 2
        size = 1.4 + Math.random() * 0.4
      } else {
        tier = 1
        size = 0.8 + Math.random() * 0.4
      }

      return {
        x: Math.random() * W,
        y: Math.random() * H,
        size,
        tier,
        baseAlpha: 0.35 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0012 + Math.random() * 0.0022,
      }
    })
  }

  // ─── METEOR & SPARK LOGIC ─────────────────────────────────────

  _spawnMeteor(isWishing = false, clickX = 0, clickY = 0) {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    const angle = (this.angleDeg * Math.PI) / 180
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)

    const baseSpeed = isWishing ? 28 : (22 + Math.random() * 14)
    const speed = baseSpeed * this.speedMult
    const len = (isWishing ? 220 : 130) + Math.random() * 160
    const thickness = (isWishing ? 2.4 : 1.4) + Math.random() * 0.9
    const color = this._getRandomColor()

    let x, y
    if (isWishing) {
      // Trace back from clicked location along angle
      const backDist = 300 + Math.random() * 150
      x = clickX - cosA * backDist
      y = clickY - sinA * backDist
    } else {
      if (Math.abs(cosA) > Math.abs(sinA)) {
        x = cosA > 0 ? -len : W + len
        y = Math.random() * (H + len) - len * 0.5
      } else {
        x = Math.random() * (W + len) - len * 0.5
        y = sinA > 0 ? -len : H + len
      }
    }

    this.meteors.push({
      x,
      y,
      vx: cosA * speed,
      vy: sinA * speed,
      cosA,
      sinA,
      len,
      thickness,
      progress: 0,
      decayRate: isWishing ? 0.012 : (0.014 + Math.random() * 0.011),
      color,
      isWishing,
    })
  }

  _update(dt) {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    // Spawning
    this._acc += this.spawnRate * (dt * 0.016)
    while (this._acc >= 1) {
      if (this.meteors.length < 8) {
        this._spawnMeteor()
      }
      this._acc -= 1
    }

    // Update Meteors & Emit Sparks
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i]
      m.x += m.vx * dt
      m.y += m.vy * dt
      m.progress += m.decayRate * dt

      // Emit fragmentation stardust sparks along tail
      if (Math.random() < 0.65 && this.sparks.length < 80) {
        const trailOffset = Math.random() * m.len * 0.4
        const sx = m.x - m.cosA * trailOffset + (Math.random() - 0.5) * 4
        const sy = m.y - m.sinA * trailOffset + (Math.random() - 0.5) * 4
        const sparkSpeed = (Math.random() * 1.5 + 0.5)
        const perpA = Math.atan2(m.vy, m.vx) + Math.PI / 2 + (Math.random() < 0.5 ? 0 : Math.PI)

        this.sparks.push({
          x: sx,
          y: sy,
          vx: (m.vx * 0.15) + Math.cos(perpA) * sparkSpeed,
          vy: (m.vy * 0.15) + Math.sin(perpA) * sparkSpeed,
          size: Math.random() * 1.6 + 0.8,
          alpha: 1.0,
          decay: 0.03 + Math.random() * 0.03,
          color: m.color,
        })
      }

      const margin = m.len + 80
      if (
        m.progress >= 1.0 ||
        m.x < -margin ||
        m.x > W + margin ||
        m.y < -margin ||
        m.y > H + margin
      ) {
        this.meteors.splice(i, 1)
      }
    }

    // Update Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i]
      sp.x += sp.vx * dt
      sp.y += sp.vy * dt
      sp.vx *= Math.pow(0.92, dt)
      sp.vy *= Math.pow(0.92, dt)
      sp.alpha -= sp.decay * dt

      if (sp.alpha <= 0) {
        this.sparks.splice(i, 1)
      }
    }
  }

  // ─── RENDER ───────────────────────────────────────────────────

  _draw(t) {
    const ctx = this.ctx
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    ctx.clearRect(0, 0, W, H)

    // 1. Deep Celestial Space Backdrop
    const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.85)
    bgGrad.addColorStop(0, "rgba(8, 12, 24, 0.42)")
    bgGrad.addColorStop(1, "rgba(2, 4, 10, 0.65)")
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    // 2. Multi-Tier Twinkling Starfield
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i]
      const twinkle = Math.sin(t * s.speed + s.phase) * 0.35 + 0.65
      const alpha = s.baseAlpha * twinkle

      if (s.tier === 3) {
        // Bright star with 4-point subtle diffraction spikes
        ctx.save()
        ctx.translate(s.x, s.y)

        // Center halo
        const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, s.size * 2.5)
        halo.addColorStop(0, `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`)
        halo.addColorStop(0.5, `rgba(200, 230, 255, ${(alpha * 0.4).toFixed(3)})`)
        halo.addColorStop(1, "rgba(255, 255, 255, 0)")
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(0, 0, s.size * 2.5, 0, Math.PI * 2)
        ctx.fill()

        // Spikes
        ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.65).toFixed(3)})`
        ctx.lineWidth = 0.75
        ctx.beginPath()
        ctx.moveTo(-s.size * 3.5, 0)
        ctx.lineTo(s.size * 3.5, 0)
        ctx.moveTo(0, -s.size * 3.5)
        ctx.lineTo(0, s.size * 3.5)
        ctx.stroke()

        ctx.restore()
      } else {
        // Micro and medium stars
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * 0.8, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 3. Stardust Fragmentation Sparks (Lighter composite)
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    for (let i = 0; i < this.sparks.length; i++) {
      const sp = this.sparks[i]
      ctx.fillStyle = `rgba(${sp.color.rgbStr}, ${(sp.alpha * 0.85).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2)
      ctx.fill()
    }

    // 4. Volumetric Plasma Shooting Stars
    for (let i = 0; i < this.meteors.length; i++) {
      const m = this.meteors[i]
      const intensity = Math.sin(m.progress * Math.PI)
      if (intensity <= 0.01) continue

      const alpha = Math.min(1.0, intensity * 1.45)
      const hx = m.x
      const hy = m.y
      const tx = hx - m.cosA * m.len
      const ty = hy - m.sinA * m.len

      // 4a. Outer Aerodynamic Plasma Ionization Trail
      const trailGrad = ctx.createLinearGradient(tx, ty, hx, hy)
      trailGrad.addColorStop(0, `rgba(${m.color.rgbStr}, 0)`)
      trailGrad.addColorStop(0.35, `rgba(${m.color.rgbStr}, ${(alpha * 0.25).toFixed(3)})`)
      trailGrad.addColorStop(0.75, `rgba(${m.color.rgbStr}, ${(alpha * 0.75).toFixed(3)})`)
      trailGrad.addColorStop(0.95, `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`)
      trailGrad.addColorStop(1.0, `rgba(255, 255, 255, ${alpha.toFixed(3)})`)

      ctx.strokeStyle = trailGrad
      ctx.lineWidth = m.thickness * 1.8
      ctx.lineCap = "round"
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(hx, hy)
      ctx.stroke()

      // 4b. Intense White-Hot Core Beam
      const coreGrad = ctx.createLinearGradient(tx + m.cosA * (m.len * 0.3), ty + m.sinA * (m.len * 0.3), hx, hy)
      coreGrad.addColorStop(0, `rgba(${m.color.rgbStr}, 0)`)
      coreGrad.addColorStop(0.6, `rgba(${m.color.rgbStr}, ${(alpha * 0.6).toFixed(3)})`)
      coreGrad.addColorStop(1.0, `rgba(255, 255, 255, ${alpha.toFixed(3)})`)

      ctx.strokeStyle = coreGrad
      ctx.lineWidth = m.thickness * 0.85
      ctx.beginPath()
      ctx.moveTo(tx + m.cosA * (m.len * 0.3), ty + m.sinA * (m.len * 0.3))
      ctx.lineTo(hx, hy)
      ctx.stroke()

      // 4c. Incandescent Nucleus Glow (Plasma head teardrop)
      const headRadius = m.thickness * (m.isWishing ? 5.5 : 4.0)
      const headGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, headRadius)
      headGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha.toFixed(3)})`)
      headGrad.addColorStop(0.35, `rgba(${m.color.rgbStr}, ${(alpha * 0.75).toFixed(3)})`)
      headGrad.addColorStop(1, `rgba(${m.color.rgbStr}, 0)`)

      ctx.fillStyle = headGrad
      ctx.beginPath()
      ctx.arc(hx, hy, headRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
}
