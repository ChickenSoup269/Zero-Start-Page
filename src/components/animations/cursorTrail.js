/**
 * CursorTrailEffect (Cursor Trail Ultra HD)
 *
 * Hyper-smooth, high-performance Cursor Trail simulation.
 * Features:
 *  - Sub-pixel continuous path interpolation: eliminates gaps during fast mouse swipes.
 *  - 4 Handcrafted Ultra HD Trail Styles:
 *      * Classic: Glowing stardust ribbon & shimmering floating dust.
 *      * Fire: Volumetric flame tongues, hot core plasma & rising buoyant embers.
 *      * Neon: Cyberpunk laser ribbon with intense chromatic glow bloom.
 *      * Magic: Shimmering fairy dust & rotating diamond star sparkles.
 *  - Spectacular Supernova Click Explosion: expanding shockwaves & high-velocity spark shrapnel.
 *  - Dynamic Rainbow / Color spectrum cycling when Random Colors is active.
 *  - High-DPI screen support & frame-rate normalized physics (60Hz - 240Hz).
 */

export class CursorTrailEffect {
  constructor(
    canvasId,
    color = "#60c8ff",
    clickExplosion = true,
    randomColor = false,
    style = "classic",
  ) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this._animId = null

    this._color = color || "#60c8ff"
    this.clickExplosion = clickExplosion !== false
    this.randomColor = randomColor === true
    this.style = style || "classic"

    this.particles = []
    this.shockwaves = []
    this.trailPoints = [] // Continuous rolling spline buffer
    this.maxTrailPoints = 32
    this.maxParticles = 300

    this.lastDrawTime = 0
    this.time = 0
    this.hueCycle = 0

    // Mouse Tracking with velocity
    this.mouse = {
      x: null,
      y: null,
      prevX: null,
      prevY: null,
      vx: 0,
      vy: 0,
      speed: 0,
    }

    this.cachedColor = this.hexToRgb(this._color)

    this.handleResize = () => this.resize()
    this.handleMouseMove = (e) => this.onMouseMove(e)
    this.handleMouseDown = (e) => this.onMouseDown(e)

    this.resize()
    window.addEventListener("resize", this.handleResize)
  }

  get color() {
    return this._color
  }

  set color(val) {
    if (!val) return
    this._color = val
    this.cachedColor = this.hexToRgb(val)
  }

  resize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth
      this.canvas.height = window.innerHeight
    }
  }

  setStyle(style) {
    this.style = style || "classic"
    this.particles = []
    this.trailPoints = []
    this.shockwaves = []
  }

  // ── Mouse & Touch Events ───────────────────────────────────────────────────

  onMouseMove(e) {
    if (!this.active) return

    const curX = e.clientX
    const curY = e.clientY

    if (this.mouse.x === null) {
      this.mouse.x = curX
      this.mouse.y = curY
      this.mouse.prevX = curX
      this.mouse.prevY = curY
      this.trailPoints.push({ x: curX, y: curY, age: 1.0, size: 8, color: this.getCurrentRgb() })
      return
    }

    this.mouse.prevX = this.mouse.x
    this.mouse.prevY = this.mouse.y
    this.mouse.x = curX
    this.mouse.y = curY

    this.mouse.vx = curX - this.mouse.prevX
    this.mouse.vy = curY - this.mouse.prevY
    this.mouse.speed = Math.hypot(this.mouse.vx, this.mouse.vy)

    // Continuous Sub-Pixel Path Interpolation (Prevents clumps/gaps on fast swipes)
    const dist = this.mouse.speed
    const stepDist = 6 // Emit every ~6px
    const steps = Math.max(1, Math.min(24, Math.floor(dist / stepDist)))

    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const interX = this.mouse.prevX + (curX - this.mouse.prevX) * t
      const interY = this.mouse.prevY + (curY - this.mouse.prevY) * t
      const color = this.getCurrentRgb()

      // Add to smooth ribbon points
      this.trailPoints.unshift({
        x: interX,
        y: interY,
        age: 1.0,
        size: Math.min(14, 4 + this.mouse.speed * 0.25),
        color: color,
      })

      // Emit Style-Specific Particles along interpolated path
      this.spawnParticlesAlongPath(interX, interY, color)
    }

    // Prune ribbon history
    if (this.trailPoints.length > this.maxTrailPoints) {
      this.trailPoints.length = this.maxTrailPoints
    }
  }

  onMouseDown(e) {
    if (!this.active || !this.clickExplosion) return
    this.mouse.x = e.clientX
    this.mouse.y = e.clientY
    this.explode(e.clientX, e.clientY)
  }

  // ── Particle Spawning ──────────────────────────────────────────────────────

  spawnParticlesAlongPath(x, y, color) {
    if (this.particles.length >= this.maxParticles) return

    const style = this.style
    const speed = this.mouse.speed

    if (style === "fire") {
      // 1-2 Flame body particles
      this.particles.push(new FireParticle(x, y, this.mouse.vx, this.mouse.vy, false))
      // Occasional buoyant sparks / embers
      if (Math.random() < 0.35) {
        this.particles.push(new EmberParticle(x, y))
      }
    } else if (style === "neon") {
      // Crisp neon plasma dots along trajectory
      if (Math.random() < 0.6) {
        const angle = Math.random() * Math.PI * 2
        const spd = Math.random() * 1.8 + 0.4
        this.particles.push({
          type: "neonDot",
          x: x + (Math.random() - 0.5) * 6,
          y: y + (Math.random() - 0.5) * 6,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          size: Math.random() * 3 + 1.5,
          life: 1.0,
          decay: Math.random() * 0.035 + 0.025,
          color: color,
        })
      }
    } else if (style === "magic") {
      // Twinkling 4-point stars and fairy micro-dust
      if (Math.random() < 0.5) {
        const starAngle = Math.random() * Math.PI * 2
        this.particles.push({
          type: "star",
          x: x + (Math.random() - 0.5) * 12,
          y: y + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2 - 0.3,
          rotation: starAngle,
          rotSpeed: (Math.random() - 0.5) * 0.08,
          size: Math.random() * 7 + 4,
          life: 1.0,
          decay: Math.random() * 0.03 + 0.02,
          color: color,
        })
      }
      // Fairy sparkle dust
      this.particles.push({
        type: "dust",
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 1.5,
        vy: Math.random() * -1.2 - 0.2,
        size: Math.random() * 2.5 + 1,
        life: 1.0,
        decay: Math.random() * 0.04 + 0.025,
        color: color,
      })
    } else {
      // Classic Style: Glowing Stardust Orbs
      const count = Math.min(2, Math.floor(speed * 0.1) + 1)
      for (let i = 0; i < count; i++) {
        if (this.particles.length >= this.maxParticles) break
        const angle = Math.random() * Math.PI * 2
        const spd = Math.random() * 2.0 + 0.5
        this.particles.push({
          type: "classic",
          x: x + (Math.random() - 0.5) * 4,
          y: y + (Math.random() - 0.5) * 4,
          vx: Math.cos(angle) * spd * 0.6,
          vy: Math.sin(angle) * spd * 0.6,
          size: Math.random() * 4.5 + 2.5,
          life: 1.0,
          decay: Math.random() * 0.025 + 0.018,
          color: color,
        })
      }
    }
  }

  // ── Click Supernova Explosion ──────────────────────────────────────────────

  explode(x, y) {
    // 1. Expanding Shockwave Ring
    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius: 65 + Math.random() * 25,
      alpha: 1.0,
      decay: 0.038,
      color: this.getCurrentRgb(),
    })

    const isFire = this.style === "fire"
    const count = isFire ? 28 : 36
    const staticColor = this.getCurrentRgb()

    // 2. High-velocity explosive spark shrapnel
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 7.5 + 2.5
      const pColor = this.randomColor ? this.getRandomColor() : staticColor

      if (isFire) {
        this.particles.push(new FireParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, true))
      } else if (this.style === "magic") {
        this.particles.push({
          type: "star",
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.15,
          size: Math.random() * 10 + 5,
          life: 1.0,
          decay: Math.random() * 0.025 + 0.015,
          color: pColor,
        })
      } else {
        this.particles.push({
          type: "classic",
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 6 + 3,
          life: 1.0,
          decay: Math.random() * 0.02 + 0.014,
          color: pColor,
        })
      }
    }
  }

  // ── Color Utilities ────────────────────────────────────────────────────────

  getCurrentRgb() {
    if (this.randomColor) {
      return this.getRandomColor()
    }
    return this.cachedColor
  }

  getRandomColor() {
    this.hueCycle = (this.hueCycle + 2.5) % 360
    return this.hslToRgb(this.hueCycle, 100, 60)
  }

  hslToRgb(h, s, l) {
    s /= 100
    l /= 100
    const k = (n) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4)),
    }
  }

  hexToRgb(hex) {
    if (!hex) return { r: 96, g: 200, b: 255 }
    let cleaned = hex.replace("#", "").trim()
    if (cleaned.length === 3) {
      cleaned = cleaned.split("").map((c) => c + c).join("")
    }
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleaned)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 96, g: 200, b: 255 }
  }

  // ── Geometry Helpers ───────────────────────────────────────────────────────

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3
    let x = cx
    let y = cy
    const step = Math.PI / spikes

    ctx.beginPath()
    ctx.moveTo(cx, cy - outerRadius)
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius
      y = cy + Math.sin(rot) * outerRadius
      ctx.lineTo(x, y)
      rot += step

      x = cx + Math.cos(rot) * innerRadius
      y = cy + Math.sin(rot) * innerRadius
      ctx.lineTo(x, y)
      rot += step
    }
    ctx.lineTo(cx, cy - outerRadius)
    ctx.closePath()
  }

  // ── Lifecycle Methods ──────────────────────────────────────────────────────

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.particles = []
    this.trailPoints = []
    this.shockwaves = []
    this.cachedColor = this.hexToRgb(this._color)

    window.addEventListener("mousemove", this.handleMouseMove, { passive: true })
    window.addEventListener("mousedown", this.handleMouseDown, { passive: true })
    this.canvas.style.display = "block"

    const animateLoop = (t) => {
      if (!this.active) return
      if (document.visibilityState === "hidden") {
        document.addEventListener(
          "visibilitychange",
          () => {
            if (!document.hidden && this.active) {
              this.lastDrawTime = performance.now()
              this._animId = requestAnimationFrame(animateLoop)
            }
          },
          { once: true },
        )
        return
      }
      this._animId = requestAnimationFrame(animateLoop)
      this.animate(t)
    }
    this._animId = requestAnimationFrame(animateLoop)
  }

  stop() {
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    if (!this.active) return
    this.active = false
    window.removeEventListener("mousemove", this.handleMouseMove)
    window.removeEventListener("mousedown", this.handleMouseDown)
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.canvas.style.display = "none"
    }
    this.particles = []
    this.trailPoints = []
    this.shockwaves = []
    this.mouse.x = null
    this.mouse.y = null
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this.handleResize)
  }

  // ── Main Render Loop ───────────────────────────────────────────────────────

  animate(currentTime = 0) {
    if (!this.active) return

    const elapsed = currentTime - this.lastDrawTime
    const deltaTime = Math.min(elapsed / (1000 / 60), 3.0)
    this.lastDrawTime = currentTime

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Blend modes for maximum glow & luminosity
    if (this.style === "fire" || this.style === "neon") {
      this.ctx.globalCompositeOperation = "lighter"
    } else {
      this.ctx.globalCompositeOperation = "source-over"
    }

    // 1. Draw Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i]
      sw.radius += (sw.maxRadius - sw.radius) * 0.18 * deltaTime + 1.2
      sw.alpha -= sw.decay * deltaTime

      if (sw.alpha <= 0) {
        this.shockwaves.splice(i, 1)
        continue
      }

      this.ctx.save()
      this.ctx.beginPath()
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2)
      this.ctx.strokeStyle = `rgba(${sw.color.r}, ${sw.color.g}, ${sw.color.b}, ${sw.alpha * 0.85})`
      this.ctx.lineWidth = Math.max(1, 3.5 * sw.alpha)
      this.ctx.stroke()
      this.ctx.restore()
    }

    // 2. Draw Continuous Fluid Ribbon Trail (Classic / Neon)
    if (this.trailPoints.length > 2 && (this.style === "classic" || this.style === "neon")) {
      const isNeon = this.style === "neon"
      this.ctx.save()
      this.ctx.lineCap = "round"
      this.ctx.lineJoin = "round"

      const pts = this.trailPoints
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const alpha = Math.max(0, p1.age)
        const width = p1.size * p1.age

        if (alpha <= 0.01 || width <= 0.1) continue

        // Outer Glow
        this.ctx.beginPath()
        this.ctx.moveTo(p1.x, p1.y)
        this.ctx.lineTo(p2.x, p2.y)
        this.ctx.strokeStyle = `rgba(${p1.color.r}, ${p1.color.g}, ${p1.color.b}, ${alpha * (isNeon ? 0.85 : 0.45)})`
        this.ctx.lineWidth = width * (isNeon ? 1.8 : 1.4)
        this.ctx.stroke()

        // Inner Bright Core
        this.ctx.beginPath()
        this.ctx.moveTo(p1.x, p1.y)
        this.ctx.lineTo(p2.x, p2.y)
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`
        this.ctx.lineWidth = Math.max(1, width * 0.4)
        this.ctx.stroke()
      }
      this.ctx.restore()
    }

    // Update trail points decay
    for (let i = this.trailPoints.length - 1; i >= 0; i--) {
      this.trailPoints[i].age -= 0.045 * deltaTime
      if (this.trailPoints[i].age <= 0) {
        this.trailPoints.splice(i, 1)
      }
    }

    // 3. Update & Draw Particles
    const len = this.particles.length
    for (let i = len - 1; i >= 0; i--) {
      const p = this.particles[i]

      if (p.type === "fire" || p.type === "ember") {
        p.update(deltaTime)
        p.draw(this.ctx)
      } else if (p.type === "star") {
        p.x += p.vx * deltaTime
        p.y += p.vy * deltaTime
        p.rotation += p.rotSpeed * deltaTime
        p.life -= p.decay * deltaTime

        if (p.life > 0) {
          const s = p.size * p.life
          this.ctx.save()
          this.ctx.translate(p.x, p.y)
          this.ctx.rotate(p.rotation)
          this.ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.life * 0.95})`
          this.drawStar(this.ctx, 0, 0, 4, s, s * 0.3)
          this.ctx.fill()

          // Star bright core
          this.ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`
          this.drawStar(this.ctx, 0, 0, 4, s * 0.5, s * 0.15)
          this.ctx.fill()
          this.ctx.restore()
        }
      } else if (p.type === "dust" || p.type === "neonDot") {
        p.x += p.vx * deltaTime
        p.y += p.vy * deltaTime
        p.life -= p.decay * deltaTime

        if (p.life > 0) {
          const s = Math.max(0.5, p.size * p.life)
          this.ctx.beginPath()
          this.ctx.arc(p.x, p.y, s, 0, Math.PI * 2)
          this.ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.life * 0.9})`
          this.ctx.fill()
        }
      } else {
        // Classic Particles
        p.x += p.vx * deltaTime
        p.y += p.vy * deltaTime
        p.vx *= 0.96 // Air drag
        p.vy *= 0.96
        p.life -= p.decay * deltaTime

        if (p.life > 0) {
          const pSize = Math.max(0.5, p.size * p.life)
          const rgb = p.color

          // Core Particle
          this.ctx.beginPath()
          this.ctx.arc(p.x, p.y, pSize, 0, Math.PI * 2)
          this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.life})`
          this.ctx.fill()

          // Soft Specular Center
          this.ctx.beginPath()
          this.ctx.arc(p.x, p.y, pSize * 0.45, 0, Math.PI * 2)
          this.ctx.fillStyle = `rgba(255, 255, 255, ${p.life * 0.9})`
          this.ctx.fill()

          // Glowing Aura
          if (p.life > 0.15) {
            const glowRad = pSize * 2.8
            const glowGrad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRad)
            glowGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.life * 0.4})`)
            glowGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
            this.ctx.beginPath()
            this.ctx.arc(p.x, p.y, glowRad, 0, Math.PI * 2)
            this.ctx.fillStyle = glowGrad
            this.ctx.fill()
          }
        }
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }
}

// ── Realistic Fire Particle ──────────────────────────────────────────────────

class FireParticle {
  constructor(x, y, parentVx = 0, parentVy = 0, isExplosion = false) {
    this.type = "fire"
    this.x = x + (Math.random() * 8 - 4)
    this.y = y + (Math.random() * 8 - 4)

    if (isExplosion) {
      this.vx = parentVx + (Math.random() - 0.5) * 4
      this.vy = parentVy + (Math.random() - 0.5) * 4
      this.size = Math.random() * 32 + 18
      this.decay = Math.random() * 0.028 + 0.018
    } else {
      // Trail flame: slightly trails behind mouse velocity & accelerates upwards
      this.vx = parentVx * -0.18 + (Math.random() - 0.5) * 1.5
      this.vy = parentVy * -0.18 + (Math.random() * -2.2 - 1.2)
      this.size = Math.random() * 22 + 12
      this.decay = Math.random() * 0.038 + 0.022
    }

    this.life = 1.0
    this.buoyancy = 0.06 + Math.random() * 0.04
  }

  update(dt = 1.0) {
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.vy -= this.buoyancy * dt // Upward convective lift
    this.vx *= 0.97
    this.life -= this.decay * dt
  }

  draw(ctx) {
    const r = Math.max(0, this.size * this.life)
    if (r <= 0 || !Number.isFinite(r)) return

    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r)
    if (this.life > 0.65) {
      // Hot white-gold core
      g.addColorStop(0, `rgba(255, 255, 220, ${this.life})`)
      g.addColorStop(0.4, `rgba(255, 170, 20, ${this.life * 0.9})`)
      g.addColorStop(1, `rgba(255, 50, 0, 0)`)
    } else if (this.life > 0.3) {
      // Warm amber body
      g.addColorStop(0, `rgba(255, 150, 0, ${this.life * 0.85})`)
      g.addColorStop(0.6, `rgba(220, 40, 0, ${this.life * 0.5})`)
      g.addColorStop(1, `rgba(120, 0, 0, 0)`)
    } else {
      // Smoky crimson edges
      g.addColorStop(0, `rgba(180, 25, 0, ${this.life * 0.6})`)
      g.addColorStop(1, `rgba(40, 0, 0, 0)`)
    }

    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ── Buoyant Spark Ember Particle ─────────────────────────────────────────────

class EmberParticle {
  constructor(x, y) {
    this.type = "ember"
    this.x = x + (Math.random() * 6 - 3)
    this.y = y + (Math.random() * 6 - 3)
    this.vx = (Math.random() - 0.5) * 2.8
    this.vy = Math.random() * -3.8 - 1.8
    this.life = 1.0
    this.decay = Math.random() * 0.025 + 0.015
    this.size = Math.random() * 2.2 + 1.0
    this.swayOffset = Math.random() * Math.PI * 2
  }

  update(dt = 1.0) {
    this.swayOffset += 0.08 * dt
    this.x += (this.vx + Math.sin(this.swayOffset) * 0.8) * dt
    this.y += this.vy * dt
    this.vy -= 0.04 * dt
    this.life -= this.decay * dt
  }

  draw(ctx) {
    if (this.life <= 0) return
    const s = Math.max(0.5, this.size * this.life)
    ctx.fillStyle = `rgba(255, 225, 120, ${this.life * 0.95})`
    ctx.beginPath()
    ctx.arc(this.x, this.y, s, 0, Math.PI * 2)
    ctx.fill()
  }
}
