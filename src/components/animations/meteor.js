/**
 * MeteorEffect — Celestial Cosmic Meteor & Starfield Engine
 *
 * Enhanced with:
 *  1. Full-Screen Diagonal Trajectories:
 *     - Uniform mathematical ray-projection covering 100% of the screen from top-left to bottom-right.
 *     - Zero corner bunching or edge blind spots across all viewports and aspect ratios.
 *  2. Minimalist, Refined Starlight Aesthetics:
 *     - Incandescent pure white core with subtle luminous silver starlight aura.
 *     - Smooth aerodynamic tail tapering gracefully to zero opacity without garish neon colors.
 *     - Delicate, fine stardust micro-sparks shedding gently in the wake.
 *  3. Transparent Wallpaper-Friendly Canvas:
 *     - No opaque dark rectangular fills; works seamlessly over any wallpaper or live background.
 *     - Multi-tier twinkling cosmic starfield with subtle micro-stars and rare diffraction spikes.
 *  4. Interactive Wishing Star on Click:
 *     - Clicking anywhere summons a brilliant shooting star streaking across the sky near the click.
 *  5. 100% Backward-Compatible API (setColor, setAngle, setFullColor, setSpeed, setSpawnRate).
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
    this.angleDeg = 45 // Default 45 degrees: from top-left to bottom-right
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

    // Seed 2 initial meteors at staggered progress for immediate visual delight
    this.meteors = []
    this.sparks = []
    this._spawnMeteor(false, 0, 0, 0.25)
    this._spawnMeteor(false, 0, 0, 0.6)

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

  setMouseEnabled(enabled) {
    this.mouseEnabled = Boolean(enabled)
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

  _onClick(e) {
    if (!this.active || this.mouseEnabled === false) return
    // Spawn an elegant wishing star passing through clicked position
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
      // Harmonic celestial starlight palette: calm, refined, authentic
      const palette = [
        { r: 255, g: 255, b: 255, rgbStr: "255,255,255" }, // Pure Starlight White
        { r: 232, g: 244, b: 255, rgbStr: "232,244,255" }, // Sirius Ice Blue
        { r: 255, g: 252, b: 242, rgbStr: "255,252,242" }, // Soft Warm Starlight
        { r: 240, g: 248, b: 255, rgbStr: "240,248,255" }, // Silver Diamond
        { r: 255, g: 247, b: 235, rgbStr: "255,247,235" }, // Pale Champagne
      ]
      return palette[Math.floor(Math.random() * palette.length)]
    }
    if (this.colors.length === 0) return { r: 255, g: 255, b: 255, rgbStr: "255,255,255" }
    return this.colors[Math.floor(Math.random() * this.colors.length)]
  }

  // ─── MULTI-TIER SUBTLE STARFIELD ──────────────────────────────

  _buildStars() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight
    const count = Math.max(50, Math.min(100, Math.floor((W * H) / 18000)))

    this.stars = Array.from({ length: count }, () => {
      const rand = Math.random()
      let tier = 1 // 1 = micro star, 2 = medium star, 3 = bright star with soft spikes
      let size = 0.8
      if (rand > 0.92) {
        tier = 3
        size = 1.8 + Math.random() * 0.5
      } else if (rand > 0.7) {
        tier = 2
        size = 1.1 + Math.random() * 0.4
      } else {
        tier = 1
        size = 0.6 + Math.random() * 0.4
      }

      return {
        x: Math.random() * W,
        y: Math.random() * H,
        size,
        tier,
        baseAlpha: 0.25 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0012 + Math.random() * 0.002,
      }
    })
  }

  // ─── FULL-SCREEN METEOR TRAJECTORY LOGIC ───────────────────────

  _spawnMeteor(isWishing = false, clickX = 0, clickY = 0, initialProgress = 0) {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    // Slight organic angle variation (±2.5°) around configured angle for natural realism
    const baseAngleDeg = this.angleDeg !== undefined && !isNaN(this.angleDeg) ? Number(this.angleDeg) : 45
    const jitter = isWishing ? 0 : (Math.random() - 0.5) * 5
    const angleRad = ((baseAngleDeg + jitter) * Math.PI) / 180

    const dx = Math.cos(angleRad)
    const dy = Math.sin(angleRad)
    const nx = -dy
    const ny = dx

    const baseSpeed = isWishing ? 28 : (20 + Math.random() * 11)
    const speed = baseSpeed * this.speedMult
    const len = (isWishing ? 260 : 140) + Math.random() * 130
    const thickness = (isWishing ? 2.4 : 1.3) + Math.random() * 0.7
    const color = this._getRandomColor()

    let startX, startY, totalDist

    if (isWishing) {
      // Trace backwards from click location along negative trajectory vector
      const backDist = 260 + Math.random() * 120
      startX = clickX - dx * backDist
      startY = clickY - dy * backDist
      totalDist = backDist + Math.sqrt(W * W + H * H) * 0.55
    } else {
      // Uniform mathematical projection across the entire screen
      const halfW = W * 0.5
      const halfH = H * 0.5

      // 4 corners of the viewport relative to center
      const c1x = -halfW, c1y = -halfH
      const c2x =  halfW, c2y = -halfH
      const c3x =  halfW, c3y =  halfH
      const c4x = -halfW, c4y =  halfH

      // Projection on normal axis perpendicular to flight
      const u1 = c1x * nx + c1y * ny
      const u2 = c2x * nx + c2y * ny
      const u3 = c3x * nx + c3y * ny
      const u4 = c4x * nx + c4y * ny
      const uMin = Math.min(u1, u2, u3, u4) - 30
      const uMax = Math.max(u1, u2, u3, u4) + 30

      // Projection on flight direction axis
      const v1 = c1x * dx + c1y * dy
      const v2 = c2x * dx + c2y * dy
      const v3 = c3x * dx + c3y * dy
      const v4 = c4x * dx + c4y * dy
      const vMin = Math.min(v1, v2, v3, v4)
      const vMax = Math.max(v1, v2, v3, v4)

      // Random position along normal axis guarantees uniform coverage across 100% of the screen
      const u = uMin + Math.random() * (uMax - uMin)
      const vStart = vMin - len - 30 - Math.random() * 40
      totalDist = (vMax - vMin) + len + 80

      startX = halfW + u * nx + vStart * dx
      startY = halfH + u * ny + vStart * dy
    }

    const traveled = initialProgress > 0 ? totalDist * initialProgress : 0
    const x = startX + dx * traveled
    const y = startY + dy * traveled

    this.meteors.push({
      x,
      y,
      vx: dx * speed,
      vy: dy * speed,
      dx,
      dy,
      len,
      thickness,
      traveled,
      totalDist,
      baseAlpha: 0.88 + Math.random() * 0.12,
      color,
      isWishing,
    })
  }

  _update(dt) {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    // Organic Spawning rhythm (average 2-4 meteors simultaneously)
    this._acc += this.spawnRate * (dt * 0.022)
    while (this._acc >= 1) {
      if (this.meteors.length < 5) {
        this._spawnMeteor()
      }
      this._acc -= 1
    }

    // Update Meteors & Emit Micro-stardust Sparks
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i]
      const stepDist = Math.hypot(m.vx, m.vy) * dt
      m.x += m.vx * dt
      m.y += m.vy * dt
      m.traveled += stepDist

      const progress = m.traveled / m.totalDist

      // Emit minimal, delicate stardust sparks along tail (clean, not cluttered)
      if (Math.random() < 0.35 && this.sparks.length < 24) {
        const trailOffset = Math.random() * m.len * 0.35
        const sx = m.x - m.dx * trailOffset + (Math.random() - 0.5) * 3
        const sy = m.y - m.dy * trailOffset + (Math.random() - 0.5) * 3
        const sparkSpeed = Math.random() * 1.2 + 0.3
        const perpA = Math.atan2(m.vy, m.vx) + Math.PI / 2 + (Math.random() < 0.5 ? 0 : Math.PI)

        this.sparks.push({
          x: sx,
          y: sy,
          vx: m.vx * 0.12 + Math.cos(perpA) * sparkSpeed,
          vy: m.vy * 0.12 + Math.sin(perpA) * sparkSpeed,
          size: Math.random() * 0.8 + 0.5,
          alpha: 0.9,
          decay: 0.035 + Math.random() * 0.03,
          color: m.color,
        })
      }

      const margin = m.len + 100
      if (
        progress >= 1.0 ||
        m.x < -margin ||
        m.x > W + margin ||
        m.y < -margin ||
        m.y > H + margin
      ) {
        this.meteors.splice(i, 1)
      }
    }

    // Update Micro Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i]
      sp.x += sp.vx * dt
      sp.y += sp.vy * dt
      sp.vx *= Math.pow(0.94, dt)
      sp.vy *= Math.pow(0.94, dt)
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

    // 1. Soft atmospheric night sky backdrop tint (gentle celestial depth)
    ctx.clearRect(0, 0, W, H)
    const bgGrad = ctx.createRadialGradient(
      W * 0.5,
      H * 0.45,
      0,
      W * 0.5,
      H * 0.5,
      Math.max(W, H) * 0.85,
    )
    bgGrad.addColorStop(0, "rgba(6, 10, 22, 0.14)")
    bgGrad.addColorStop(1, "rgba(2, 4, 12, 0.28)")
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    // 2. Subtle Multi-Tier Twinkling Cosmic Stars
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i]
      const twinkle = Math.sin(t * s.speed + s.phase) * 0.3 + 0.7
      const alpha = s.baseAlpha * twinkle

      if (s.tier === 3) {
        // Bright star with delicate 4-point diffraction cross
        ctx.save()
        ctx.translate(s.x, s.y)

        // Soft center glow
        const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, s.size * 2)
        halo.addColorStop(0, `rgba(255, 255, 255, ${(alpha * 0.9).toFixed(3)})`)
        halo.addColorStop(0.5, `rgba(220, 235, 255, ${(alpha * 0.35).toFixed(3)})`)
        halo.addColorStop(1, "rgba(255, 255, 255, 0)")
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(0, 0, s.size * 2, 0, Math.PI * 2)
        ctx.fill()

        // Delicate diffraction cross
        ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.55).toFixed(3)})`
        ctx.lineWidth = 0.65
        ctx.beginPath()
        ctx.moveTo(-s.size * 2.8, 0)
        ctx.lineTo(s.size * 2.8, 0)
        ctx.moveTo(0, -s.size * 2.8)
        ctx.lineTo(0, s.size * 2.8)
        ctx.stroke()

        ctx.restore()
      } else {
        // Micro & medium stars
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * 0.75, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 2. Micro-stardust Sparks (Light blending)
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    for (let i = 0; i < this.sparks.length; i++) {
      const sp = this.sparks[i]
      ctx.fillStyle = `rgba(255, 255, 255, ${(sp.alpha * 0.8).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2)
      ctx.fill()
    }

    // 3. Elegant, Luminous Shooting Stars
    for (let i = 0; i < this.meteors.length; i++) {
      const m = this.meteors[i]
      const progress = Math.min(1.0, Math.max(0, m.traveled / m.totalDist))

      // Smooth envelope: quick fade-in, sustained bright flight across the sky, gentle exit fade
      let intensity
      if (progress < 0.12) {
        intensity = progress / 0.12
      } else if (progress < 0.82) {
        intensity = 1.0
      } else {
        intensity = Math.max(0, (1.0 - progress) / 0.18)
      }

      if (intensity <= 0.01) continue

      const alpha = intensity * m.baseAlpha
      const hx = m.x
      const hy = m.y
      const tx = hx - m.dx * m.len
      const ty = hy - m.dy * m.len

      // 3a. Sleek Tapered Starlight Tail (Outer subtle luminous aura)
      const auraGrad = ctx.createLinearGradient(tx, ty, hx, hy)
      auraGrad.addColorStop(0, `rgba(${m.color.rgbStr}, 0)`)
      auraGrad.addColorStop(0.35, `rgba(${m.color.rgbStr}, ${(alpha * 0.18).toFixed(3)})`)
      auraGrad.addColorStop(0.75, `rgba(${m.color.rgbStr}, ${(alpha * 0.45).toFixed(3)})`)
      auraGrad.addColorStop(0.92, `rgba(255, 255, 255, ${(alpha * 0.8).toFixed(3)})`)
      auraGrad.addColorStop(1.0, `rgba(255, 255, 255, ${alpha.toFixed(3)})`)

      ctx.strokeStyle = auraGrad
      ctx.lineWidth = m.thickness * 1.5
      ctx.lineCap = "round"
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(hx, hy)
      ctx.stroke()

      // 3b. Sharp Incandescent White-Hot Core Line
      const coreLen = m.len * 0.65
      const cx2 = hx - m.dx * coreLen
      const cy2 = hy - m.dy * coreLen
      const coreGrad = ctx.createLinearGradient(cx2, cy2, hx, hy)
      coreGrad.addColorStop(0, "rgba(255, 255, 255, 0)")
      coreGrad.addColorStop(0.45, `rgba(255, 255, 255, ${(alpha * 0.45).toFixed(3)})`)
      coreGrad.addColorStop(1.0, `rgba(255, 255, 255, ${alpha.toFixed(3)})`)

      ctx.strokeStyle = coreGrad
      ctx.lineWidth = Math.max(0.75, m.thickness * 0.7)
      ctx.beginPath()
      ctx.moveTo(cx2, cy2)
      ctx.lineTo(hx, hy)
      ctx.stroke()

      // 3c. Brilliant Incandescent Nucleus Head
      const headRadius = m.thickness * (m.isWishing ? 3.6 : 2.6)
      const headGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, headRadius)
      headGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha.toFixed(3)})`)
      headGrad.addColorStop(0.35, `rgba(255, 255, 255, ${(alpha * 0.75).toFixed(3)})`)
      headGrad.addColorStop(0.7, `rgba(${m.color.rgbStr}, ${(alpha * 0.25).toFixed(3)})`)
      headGrad.addColorStop(1, `rgba(${m.color.rgbStr}, 0)`)

      ctx.fillStyle = headGrad
      ctx.beginPath()
      ctx.arc(hx, hy, headRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
}
