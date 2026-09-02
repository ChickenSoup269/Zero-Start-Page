/**
 * StarFall (Rain Effect) — Hollywood AAA Ultra HD Cinematic Rain Display
 *
 * Masterpiece Aerodynamic Rain & Volumetric Stream Simulation:
 *  - 3D Multi-Depth Parallax Layers (Foreground Heavy Streaks, Midground Rain, Deep Mist Curtains).
 *  - Tapered Refractive Streaks with Glistening White-Hot Droplet Heads & Motion Blur Gradients.
 *  - Dynamic Organic Wind Drift with Sinusoidal Angle Shear.
 *  - Interactive Aerodynamic Mouse Wake & Air Cushion Deflection (Rẽ mưa theo chuyển động chuột).
 *  - Kinetic Impact Splashes with Ballistic Bounce Droplets & Micro-Ripples.
 *  - High-DPI Retina Subpixel Precision & Delta-time Normalization (60Hz - 240Hz).
 */

import { hexToRgb } from "../../utils/colors.js"

// ── Ballistic Splash Particle ────────────────────────────────────────────────
class RainSplash {
  constructor(x, y, vx, vy, rgb) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.rgb = rgb
    this.gravity = Math.random() * 0.15 + 0.16
    this.r = Math.random() * 1.4 + 0.7
    this.alpha = Math.random() * 0.35 + 0.65
    this.decay = Math.random() * 0.035 + 0.025
  }

  update(dt) {
    this.vy += this.gravity * dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.alpha -= this.decay * dt
    return this.alpha <= 0
  }

  draw(ctx) {
    if (this.alpha <= 0.01) return
    const rgb = this.rgb
    ctx.save()
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.alpha.toFixed(3)})`
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
    ctx.fill()

    if (this.alpha > 0.45) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(this.alpha * 0.9).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.r * 0.45, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

// ── Micro Impact Ripple ──────────────────────────────────────────────────────
class RainRipple {
  constructor(x, y, rgb) {
    this.x = x
    this.y = y
    this.r = 1.0
    this.maxR = Math.random() * 18 + 10
    this.speed = Math.random() * 0.6 + 0.6
    this.rgb = rgb
    this.alpha = 0.55
  }

  update(dt) {
    this.r += this.speed * dt
    this.alpha = Math.max(0, 0.55 * (1 - this.r / this.maxR))
    return this.r >= this.maxR || this.alpha <= 0
  }

  draw(ctx) {
    if (this.alpha <= 0.01) return
    const rgb = this.rgb
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(this.x, this.y, this.r, this.r * 0.28, 0, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.alpha.toFixed(3)})`
    ctx.lineWidth = Math.max(0.6, (1 - this.r / this.maxR) * 1.2)
    ctx.stroke()
    ctx.restore()
  }
}

// ── 3D Raindrop Streak ───────────────────────────────────────────────────────
class Raindrop3D {
  constructor(width, height, rgb, initial = false) {
    this.rgb = rgb
    this.reset(width, height, initial)
  }

  reset(width, height, initial = false) {
    this.x = Math.random() * (width + 200) - 100
    this.y = initial ? Math.random() * height : -40 - Math.random() * 120
    
    // 3D Depth Layer Z in [0.15, 1.0]
    this.z = Math.pow(Math.random(), 1.3) * 0.85 + 0.15

    // Layer parameters:
    // Foreground (z > 0.75): fast, thick, long, bright
    // Midground (0.45 < z <= 0.75): medium
    // Background (z <= 0.45): mist-like, faint
    this.length = (Math.random() * 32 + 24) * (0.4 + 0.6 * this.z)
    this.speed = (Math.random() * 16 + 22) * (0.4 + 0.6 * this.z)
    this.lineWidth = Math.max(0.7, (0.6 + 1.6 * this.z))
    this.opacity = (Math.random() * 0.35 + 0.55) * (0.35 + 0.65 * this.z)
  }

  update(width, height, dt, windAngle, mouse, effect) {
    const vx = Math.sin(windAngle) * this.speed
    const vy = Math.cos(windAngle) * this.speed

    let pushX = 0
    let pushY = 0

    // Interactive Aerodynamic Mouse Cushion
    if (mouse.active && this.z > 0.4) {
      const dx = this.x - mouse.x
      const dy = this.y - mouse.y
      const distSq = dx * dx + dy * dy
      if (distSq < mouse.radiusSq && distSq > 1) {
        const dist = Math.sqrt(distSq)
        const force = (1 - dist / mouse.radius) * 2.6 * this.z
        pushX = (dx / dist) * force * 1.4
        pushY = (dy / dist) * force * 0.5

        if (this.z > 0.7 && Math.random() < 0.12) {
          effect.spawnSplash(this.x, this.y, true)
        }
      }
    }

    this.x += (vx + pushX) * dt
    this.y += (vy + pushY) * dt

    // Bottom impact splash
    if (this.y >= height - 4) {
      if (this.z > 0.6 && Math.random() < 0.65) {
        effect.spawnSplash(this.x, height - 3, false)
      }
      this.reset(width, height, false)
    }

    if (this.x < -120 || this.x > width + 120) {
      this.reset(width, height, false)
    }
  }

  draw(ctx, rgb, windAngle) {
    const cosA = Math.cos(windAngle)
    const sinA = Math.sin(windAngle)
    const tx = this.x - sinA * this.length
    const ty = this.y - cosA * this.length

    ctx.save()
    const grad = ctx.createLinearGradient(tx, ty, this.x, this.y)
    grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
    grad.addColorStop(0.55, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(this.opacity * 0.45).toFixed(3)})`)
    grad.addColorStop(1, `rgba(255, 255, 255, ${this.opacity.toFixed(3)})`)

    ctx.strokeStyle = grad
    ctx.lineWidth = this.lineWidth
    ctx.lineCap = "round"

    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(this.x, this.y)
    ctx.stroke()

    // Glistening white-hot head on foreground drops
    if (this.z > 0.75) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(this.opacity * 0.95).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.lineWidth * 0.55, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
}

// ── Main StarFall (Rain Effect) Class ────────────────────────────────────────
export class StarFall {
  constructor(canvasId, color = "#99ccff") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.starColor = color || "#99ccff"
    this.rgb = hexToRgb(this.starColor) || { r: 153, g: 204, b: 255 }

    this.stars = []
    this.splashes = []
    this.ripples = []
    this.starCount = 160

    // Wind Dynamics
    this.windAngle = 0.18
    this.targetWindAngle = 0.18
    this.windTimer = 0

    this.time = 0
    this.lastTime = performance.now()
    this._animId = null

    // Screen & High-DPI state
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)

    // Interactive Aerodynamic Mouse Wake
    this.mouse = {
      x: -9999,
      y: -9999,
      radius: 110,
      radiusSq: 110 * 110,
      active: false,
    }

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

    this.starCount = Math.max(100, Math.min(260, Math.floor(this.width / 9)))
    this.createStars()
  }

  createStars() {
    this.stars = []
    for (let i = 0; i < this.starCount; i++) {
      this.stars.push(new Raindrop3D(this.width, this.height, this.rgb, true))
    }
  }

  spawnSplash(x, y, isAirDeflect = false) {
    const rgb = this.rgb
    if (!isAirDeflect) {
      this.ripples.push(new RainRipple(x, y, rgb))
    }

    const count = isAirDeflect ? 2 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      const angle = isAirDeflect
        ? -Math.PI / 2 + (Math.random() - 0.5) * 2.0
        : -Math.PI / 2 + (Math.random() - 0.5) * 1.5
      const spd = isAirDeflect ? Math.random() * 3.0 + 1.2 : Math.random() * 4.0 + 1.5
      const vx = Math.cos(angle) * spd + Math.sin(this.windAngle) * 0.5
      const vy = Math.sin(angle) * spd
      this.splashes.push(new RainSplash(x, y, vx, vy, rgb))
    }
  }

  updateColor(newColor) {
    if (!newColor) return
    this.starColor = newColor
    this.rgb = hexToRgb(newColor) || { r: 153, g: 204, b: 255 }
  }

  _onMouseMove(e) {
    this.mouse.x = e.clientX
    this.mouse.y = e.clientY
    this.mouse.active = true
  }

  _onMouseLeave() {
    this.mouse.active = false
    this.mouse.x = -9999
    this.mouse.y = -9999
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.lastTime = performance.now()
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastTime = performance.now()
    this.time = 0
    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"

    this.resize()
    this.createStars()

    const animateLoop = (now) => {
      if (!this.active) return
      this._animId = requestAnimationFrame(animateLoop)

      if (document.visibilityState === "hidden") {
        this.lastTime = now
        return
      }

      const elapsed = Math.min(now - this.lastTime, 100)
      this.lastTime = now
      const dt = Math.min(elapsed / 16.67, 3.0)
      this.time += 0.016 * dt

      this.update(dt)
      this.draw()
    }

    this._animId = requestAnimationFrame(animateLoop)
  }

  stop() {
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
    this.stars = []
    this.splashes = []
    this.ripples = []
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  update(dt) {
    const W = this.width
    const H = this.height

    // 1. Organic Wind Shift
    this.windTimer += 0.016 * dt
    if (this.windTimer >= 3.5) {
      this.windTimer = 0
      this.targetWindAngle = (Math.random() - 0.4) * 0.45
    }
    this.windAngle += (this.targetWindAngle - this.windAngle) * 0.008 * dt

    // 2. Update Rain Drops
    for (let i = 0; i < this.stars.length; i++) {
      this.stars[i].update(W, H, dt, this.windAngle, this.mouse, this)
    }

    // 3. Update Splashes & Ripples
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      if (this.splashes[i].update(dt)) {
        this.splashes.splice(i, 1)
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      if (this.ripples[i].update(dt)) {
        this.ripples.splice(i, 1)
      }
    }
  }

  draw() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height
    const rgb = this.rgb

    ctx.clearRect(0, 0, W, H)

    // 1. Atmospheric Mist Curtain
    const mist = ctx.createLinearGradient(0, 0, 0, H * 0.4)
    mist.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`)
    mist.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
    ctx.fillStyle = mist
    ctx.fillRect(0, 0, W, H)

    // 2. Puddle Impact Ripples
    for (let i = 0; i < this.ripples.length; i++) {
      this.ripples[i].draw(ctx)
    }

    // 3. 3D Raindrop Streaks (Sorted by Depth Z)
    this.stars.sort((a, b) => a.z - b.z)
    for (let i = 0; i < this.stars.length; i++) {
      this.stars[i].draw(ctx, rgb, this.windAngle)
    }

    // 4. Ballistic Bounce Splash Droplets
    for (let i = 0; i < this.splashes.length; i++) {
      this.splashes[i].draw(ctx)
    }

    // 5. Glistening Wet Ground Strip
    const ground = ctx.createLinearGradient(0, H - 20, 0, H)
    ground.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
    ground.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06)`)
    ground.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`)
    ctx.fillStyle = ground
    ctx.fillRect(0, H - 20, W, 20)
  }
}
