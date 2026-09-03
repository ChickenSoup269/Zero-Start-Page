/**
 * StarFall — Hollywood AAA Unified Rain Engine
 *
 * Supports two selectable atmospheric modes:
 *  1. "chill" (Chill Window & Bokeh):
 *     - Clinging windowpane droplets with 3D specular light refraction and meandering wet trickles.
 *     - Cozy out-of-focus Lofi city bokeh lights drifting gently in the background.
 *     - Mouse acts as a glass wiper, clearing window condensation and sliding droplets.
 *  2. "storm" (Cinematic Storm & Ultra HD Lightning):
 *     - Heavy 3D Parallax downpour with wind-shear aerodynamic deflection.
 *     - Natural Ultra HD Fractal Lightning with multi-tier branching (main trunk, forks, micro tendrils)
 *       and dual-pass ion glow channels (completely independent of mouse input).
 *     - Kinetic ballistic bounce droplets and expanding ground puddle ripples.
 *
 * Advanced Hollywood AAA Controls:
 *  - Fall Speed (Độ rơi mưa): Dynamic scaling from serene drizzle to torrential storm.
 *  - Rain Density (Độ dày mưa): Multi-tier particle count scaling.
 *  - Atmospheric Mist & Ground Vapor (Hơi nước bốc lên): Rising buoyant vapor wisps from ground impacts
 *    and soft atmospheric rain curtain gradients.
 *
 * Implements 60Hz - 240Hz Delta Normalization & Native Retina High-DPI Scaling.
 */

import { hexToRgb } from "../../utils/colors.js"

// ── Cozy Out-of-Focus Bokeh Sphere ──────────────────────────────────────────
class CozyBokehLight {
  constructor(width, height, baseRgb) {
    this.reset(width, height, baseRgb, true)
  }

  reset(width, height, baseRgb, initial = false) {
    this.x = Math.random() * width
    this.y = initial ? Math.random() * height : Math.random() * (height * 0.75)
    this.r = 18 + Math.random() * 38
    this.vx = (Math.random() - 0.5) * 0.25
    this.vy = (Math.random() - 0.5) * 0.2

    const roll = Math.random()
    if (roll < 0.45) {
      this.rgb = { r: 255, g: 195 + Math.floor(Math.random() * 40), b: 120 } // Warm Amber Lamp
    } else if (roll < 0.75) {
      this.rgb = { r: baseRgb.r, g: baseRgb.g, b: baseRgb.b } // Theme Rain Color
    } else {
      this.rgb = { r: 180 + Math.floor(Math.random() * 40), g: 170, b: 240 } // Twilight Violet
    }

    this.alpha = 0.08 + Math.random() * 0.16
    this.maxAlpha = this.alpha
    this.pulsePhase = Math.random() * Math.PI * 2
    this.pulseSpeed = 0.015 + Math.random() * 0.02
  }

  update(dt, width, height) {
    this.pulsePhase += this.pulseSpeed * dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.alpha = this.maxAlpha * (0.75 + Math.sin(this.pulsePhase) * 0.25)

    if (this.x < -60) this.x = width + 50
    if (this.x > width + 60) this.x = -50
    if (this.y < -60) this.y = height + 50
    if (this.y > height + 60) this.y = -50
  }

  draw(ctx) {
    if (this.alpha <= 0.005) return
    ctx.save()
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r)
    grad.addColorStop(0, `rgba(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b}, ${this.alpha.toFixed(3)})`)
    grad.addColorStop(0.6, `rgba(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b}, ${(this.alpha * 0.45).toFixed(3)})`)
    grad.addColorStop(1, `rgba(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b}, 0)`)

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

// ── Clinging Window Glass Droplet ───────────────────────────────────────────
class GlassWindowDroplet {
  constructor(width, height) {
    this.reset(width, height, true)
  }

  reset(width, height, initial = false) {
    this.x = Math.random() * width
    this.y = initial ? Math.random() * height : -10 - Math.random() * 40
    this.r = 2.2 + Math.random() * 3.5
    this.mass = Math.random() * 0.6 + 0.4
    this.isSliding = Math.random() < 0.25
    this.slideSpeed = (0.6 + Math.random() * 1.8) * this.mass
    this.meanderPhase = Math.random() * Math.PI * 2
    this.meanderSpeed = 0.03 + Math.random() * 0.04
    this.alpha = 0.5 + Math.random() * 0.35
    this.trail = []
  }

  update(dt, width, height, mouse, speedMultiplier = 1.0) {
    if (mouse.active) {
      const dx = this.x - mouse.x
      const dy = this.y - mouse.y
      const distSq = dx * dx + dy * dy
      const radius = 100

      if (distSq < radius * radius && distSq > 4) {
        const dist = Math.sqrt(distSq)
        const push = (1 - dist / radius) * 5 * dt
        this.x += (dx / dist) * push
        this.y += (dy / dist) * push * 0.5
        this.isSliding = true
        this.slideSpeed = Math.max(this.slideSpeed, 3.0 * speedMultiplier)
      }
    }

    if (this.isSliding) {
      this.meanderPhase += this.meanderSpeed * dt
      const swayX = Math.sin(this.meanderPhase) * 0.6
      this.x += swayX * dt
      this.y += this.slideSpeed * speedMultiplier * dt

      if (Math.random() < 0.25 && this.trail.length < 12) {
        this.trail.push({ x: this.x, y: this.y, r: this.r * 0.4, alpha: 0.35 })
      }

      for (let t = this.trail.length - 1; t >= 0; t--) {
        this.trail[t].alpha -= 0.005 * dt
        if (this.trail[t].alpha <= 0) this.trail.splice(t, 1)
      }

      if (this.y > height + 20) {
        this.reset(width, height, false)
      }
    } else {
      this.mass += 0.0003 * dt * speedMultiplier
      if (this.mass > 1.25) {
        this.isSliding = true
        this.slideSpeed = (1.2 + Math.random() * 2.0) * speedMultiplier
      }
    }
  }

  draw(ctx, rgb) {
    ctx.save()

    // 1. Wet Trail on Glass
    for (let t = 0; t < this.trail.length; t++) {
      const tr = this.trail[t]
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${tr.alpha.toFixed(3)})`
      ctx.beginPath()
      ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2)
      ctx.fill()
    }

    // 2. Main Droplet Lens Shadow
    ctx.fillStyle = `rgba(15, 25, 35, ${(this.alpha * 0.4).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(this.x + 0.6, this.y + 0.8, this.r, 0, Math.PI * 2)
    ctx.fill()

    // 3. Water Body
    const grad = ctx.createRadialGradient(
      this.x - this.r * 0.25,
      this.y - this.r * 0.25,
      0,
      this.x,
      this.y,
      this.r
    )
    grad.addColorStop(0, `rgba(255, 255, 255, ${(this.alpha * 0.9).toFixed(3)})`)
    grad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(this.alpha * 0.65).toFixed(3)})`)
    grad.addColorStop(1, `rgba(${Math.floor(rgb.r * 0.7)}, ${Math.floor(rgb.g * 0.7)}, ${Math.floor(rgb.b * 0.7)}, ${(this.alpha * 0.45).toFixed(3)})`)

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
    ctx.fill()

    // 4. White-Hot Specular Highlight Glint
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(this.x - this.r * 0.35, this.y - this.r * 0.35, this.r * 0.32, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}

// ── Ballistic Splash Particle ────────────────────────────────────────────────
class RainSplash {
  constructor(x, y, vx, vy, rgb) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.rgb = rgb
    this.gravity = 0.16 + Math.random() * 0.1
    this.r = 0.8 + Math.random() * 1.4
    this.alpha = 0.65 + Math.random() * 0.35
    this.decay = 0.03 + Math.random() * 0.02
  }

  update(dt, speedMultiplier = 1.0) {
    this.vy += this.gravity * dt * speedMultiplier
    this.x += this.vx * dt * speedMultiplier
    this.y += this.vy * dt * speedMultiplier
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

    if (this.alpha > 0.4) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(this.alpha * 0.85).toFixed(3)})`
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
    this.maxR = 12 + Math.random() * 18
    this.speed = 0.6 + Math.random() * 0.6
    this.rgb = rgb
    this.alpha = 0.55
  }

  update(dt, speedMultiplier = 1.0) {
    this.r += this.speed * dt * (0.8 + 0.2 * speedMultiplier)
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

// ── Rising Ground Vapor / Mist Wisp (Hơi nước bốc lên) ────────────────────────
class GroundVaporParticle {
  constructor(x, y, rgb, windAngle, speedMultiplier = 1.0) {
    this.x = x + (Math.random() - 0.5) * 36
    this.y = y
    this.rgb = rgb
    this.vx = Math.sin(windAngle) * (0.6 + Math.random() * 1.0) * speedMultiplier + (Math.random() - 0.5) * 0.3
    this.vy = -(0.3 + Math.random() * 0.6) * speedMultiplier
    this.r = 14 + Math.random() * 12
    this.maxR = this.r * (2.2 + Math.random() * 1.5)
    this.alpha = 0.11 + Math.random() * 0.09
    this.maxAlpha = this.alpha
    this.life = 1.0
    this.decay = 0.007 + Math.random() * 0.007
  }

  update(dt, windAngle, speedMultiplier = 1.0) {
    this.vx += Math.sin(windAngle) * 0.04 * dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.r += (this.maxR - this.r) * 0.02 * dt
    this.life -= this.decay * dt
    this.alpha = this.maxAlpha * Math.max(0, this.life)
    return this.life <= 0
  }

  draw(ctx) {
    if (this.alpha <= 0.003) return
    const rgb = this.rgb
    ctx.save()
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r)
    grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.alpha.toFixed(3)})`)
    grad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(this.alpha * 0.45).toFixed(3)})`)
    grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

// ── 3D Raindrop Streak (Hollywood AAA Teardrop Blade) ────────────────────────
class Raindrop3D {
  constructor(width, height, rgb, isStorm = false, initial = false) {
    this.rgb = rgb
    this.reset(width, height, isStorm, initial)
  }

  reset(width, height, isStorm = false, initial = false) {
    this.x = Math.random() * (width + 260) - 130
    this.y = initial ? Math.random() * height : -40 - Math.random() * 100

    // 3D Depth Layer Z in [0.18, 1.0]
    this.z = Math.pow(Math.random(), 1.2) * 0.82 + 0.18

    const lenBase = isStorm ? 32 : 24
    const spdBase = isStorm ? 26 : 20

    this.baseLength = (lenBase + Math.random() * 32) * (0.4 + 0.6 * this.z)
    this.baseSpeed = (spdBase + Math.random() * 20) * (0.45 + 0.55 * this.z)
    this.lineWidth = Math.max(0.7, 0.5 + (isStorm ? 1.8 : 1.5) * this.z)
    this.opacity = (0.45 + Math.random() * 0.4) * (0.35 + 0.65 * this.z)
  }

  update(width, height, dt, windAngle, mouse, effect, isStorm = false, speedMultiplier = 1.0) {
    const effSpeed = this.baseSpeed * speedMultiplier
    const vx = Math.sin(windAngle) * effSpeed
    const vy = Math.cos(windAngle) * effSpeed

    let pushX = 0
    let pushY = 0

    if (mouse.active && this.z > 0.35) {
      const dx = this.x - mouse.x
      const dy = this.y - mouse.y
      const distSq = dx * dx + dy * dy
      if (distSq < mouse.radiusSq && distSq > 4) {
        const dist = Math.sqrt(distSq)
        const force = (1 - dist / mouse.radius) * 2.8 * this.z
        pushX = (dx / dist) * force * 1.3
        pushY = (dy / dist) * force * 0.4

        if (this.z > 0.7 && Math.random() < 0.08) {
          effect.spawnSplash(this.x, this.y, true)
        }
      }
    }

    this.x += (vx + pushX) * dt
    this.y += (vy + pushY) * dt

    if (this.y >= height - 4) {
      if (this.z > 0.55 && Math.random() < (isStorm ? 0.75 : 0.55)) {
        effect.spawnSplash(this.x, height - 3, false)
      }
      this.reset(width, height, isStorm, false)
    }

    if (this.x < -140 || this.x > width + 140) {
      this.reset(width, height, isStorm, false)
    }
  }

  draw(ctx, rgb, windAngle, speedMultiplier = 1.0) {
    const currentLength = this.baseLength * (0.8 + 0.25 * speedMultiplier)
    const cosA = Math.cos(windAngle)
    const sinA = Math.sin(windAngle)
    const tx = this.x - sinA * currentLength
    const ty = this.y - cosA * currentLength

    ctx.save()

    // Aerodynamic Teardrop Linear Gradient
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

    // White-Hot Photon Tip at head
    if (this.z > 0.72) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(this.opacity * 0.95).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.lineWidth * 0.55, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
}

// ── Main Unified StarFall (Rain) Engine ──────────────────────────────────────
export class StarFall {
  constructor(canvasId, color = "#99ccff", mode = "chill", options = {}) {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.destroyed = false
    this.starColor = color || "#99ccff"
    this.rgb = hexToRgb(this.starColor) || { r: 153, g: 204, b: 255 }

    // Mode: "chill" or "storm"
    this.mode = mode === "storm" ? "storm" : "chill"

    // Advanced Options (Speed, Density, Mist)
    this.speed = typeof options.speed === "number" ? options.speed : 1.0
    this.density = typeof options.density === "number" ? options.density : 1.0
    this.mist = options.mist !== undefined ? Boolean(options.mist) : true

    // Collections
    this.stars = []
    this.glassDrops = []
    this.bokehLights = []
    this.splashes = []
    this.ripples = []
    this.vapors = []
    this.starCount = 160

    // Wind Dynamics
    this.windAngle = 0.12
    this.targetWindAngle = 0.12
    this.windTimer = 0

    // Natural Ultra HD Lightning (Storm Mode only)
    this.lightning = {
      active: false,
      timer: 0,
      maxTimer: 12,
      opacity: 0,
      segments: [],
    }
    this.nextLightningTime = performance.now() + 4500 + Math.random() * 4500

    this.time = 0
    this.lastTime = performance.now()
    this._animId = null

    // Screen & High-DPI
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)

    // Interactive Mouse (No lightning on click!)
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
    this._clickHandler = (e) => this._onClick(e)
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseleave", this._mouseLeaveHandler, { passive: true })
    window.addEventListener("click", this._clickHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)
  }

  // ── Color API ─────────────────────────────────────────────────────────────
  get color() {
    return this.starColor
  }

  set color(val) {
    this.updateColor(val)
  }

  updateColor(newColor) {
    if (!newColor) return
    this.starColor = newColor
    this.rgb = hexToRgb(newColor) || { r: 153, g: 204, b: 255 }
    this.stars.forEach((s) => (s.rgb = this.rgb))
    this.bokehLights.forEach((b) => {
      if (Math.random() < 0.5) b.rgb = { ...this.rgb }
    })
    this.vapors.forEach((v) => (v.rgb = this.rgb))
  }

  // ── Mode API ──────────────────────────────────────────────────────────────
  setMode(mode) {
    const valid = mode === "storm" ? "storm" : "chill"
    if (this.mode !== valid) {
      this.mode = valid
      this.lightning.active = false
      this.createEntities()
    }
  }

  // ── Advanced Rain Options (Speed, Density, Mist) ───────────────────────────
  setSpeed(val) {
    const num = parseFloat(val)
    if (!isNaN(num) && num > 0) {
      this.speed = Math.max(0.2, Math.min(3.0, num))
    }
  }

  setDensity(val) {
    const num = parseFloat(val)
    if (!isNaN(num) && num > 0) {
      this.density = Math.max(0.2, Math.min(3.0, num))
      this._updateEntityDensity()
    }
  }

  setMist(enable) {
    this.mist = Boolean(enable)
    if (!this.mist) {
      this.vapors = []
    }
  }

  setOptions(options = {}) {
    if (options.speed !== undefined) this.setSpeed(options.speed)
    if (options.density !== undefined) this.setDensity(options.density)
    if (options.mist !== undefined) this.setMist(options.mist)
    if (options.color) this.updateColor(options.color)
    if (options.mode) this.setMode(options.mode)
  }

  _updateEntityDensity() {
    const divisor = this.mode === "storm" ? 6.5 : 8.5
    const baseCount = Math.floor(this.width / divisor)
    this.starCount = Math.max(40, Math.min(600, Math.floor(baseCount * this.density)))

    const isStorm = this.mode === "storm"
    // Expand or shrink stars array dynamically
    if (this.stars.length < this.starCount) {
      const toAdd = this.starCount - this.stars.length
      for (let i = 0; i < toAdd; i++) {
        this.stars.push(new Raindrop3D(this.width, this.height, this.rgb, isStorm, true))
      }
    } else if (this.stars.length > this.starCount) {
      this.stars.length = this.starCount
    }
  }

  // ── Lifecycle & Resize ────────────────────────────────────────────────────
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

    const divisor = this.mode === "storm" ? 6.5 : 8.5
    const baseCount = Math.floor(this.width / divisor)
    this.starCount = Math.max(40, Math.min(600, Math.floor(baseCount * this.density)))
    this.createEntities()
  }

  createEntities() {
    const isStorm = this.mode === "storm"

    // 1. Atmospheric 3D Raindrops
    this.stars = []
    for (let i = 0; i < this.starCount; i++) {
      this.stars.push(new Raindrop3D(this.width, this.height, this.rgb, isStorm, true))
    }

    // 2. Window Glass Droplets (Chill mode only)
    this.glassDrops = []
    if (!isStorm) {
      const baseGlassCount = Math.floor(this.width / 45)
      const glassCount = Math.min(80, Math.max(15, Math.floor(baseGlassCount * this.density)))
      for (let i = 0; i < glassCount; i++) {
        this.glassDrops.push(new GlassWindowDroplet(this.width, this.height))
      }
    }

    // 3. Cozy Lofi Bokeh Lights (Chill mode only)
    this.bokehLights = []
    if (!isStorm) {
      const bokehCount = Math.min(20, Math.max(8, Math.floor(this.width / 110)))
      for (let i = 0; i < bokehCount; i++) {
        this.bokehLights.push(new CozyBokehLight(this.width, this.height, this.rgb))
      }
    }

    // 4. Reset vapor wisps
    this.vapors = []
  }

  spawnSplash(x, y, isAirDeflect = false) {
    const rgb = this.rgb
    if (!isAirDeflect) {
      this.ripples.push(new RainRipple(x, y, rgb))

      // Rising ground vapor wisp spawned from raindrop impact
      if (this.mist && Math.random() < 0.32 && this.vapors.length < 50) {
        this.vapors.push(new GroundVaporParticle(x, y - 2, this.rgb, this.windAngle, this.speed))
      }
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

  /**
   * Triggers natural Ultra HD multi-tier fractal lightning.
   * Completely independent of mouse!
   */
  _triggerNaturalLightning() {
    this.lightning.active = true
    this.lightning.timer = 12
    this.lightning.maxTimer = 12
    this.lightning.opacity = 1.0
    this.lightning.segments = []

    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    const startX = W * (0.15 + Math.random() * 0.7)
    const endX = startX + (Math.random() - 0.5) * 260
    const endY = H - 15

    // Multi-tier fractal step-ladder lightning (natural branching)
    let curX = startX
    let curY = 0
    const stepH = 22 + Math.random() * 16

    while (curY < endY) {
      const nextY = Math.min(endY, curY + stepH + (Math.random() - 0.5) * 8)
      const nextX = curX + (Math.random() - 0.5) * 36 + (endX - curX) * 0.14
      this.lightning.segments.push({ x1: curX, y1: curY, x2: nextX, y2: nextY, level: 1 })

      // Primary Fork Branch (Level 2)
      if (Math.random() < 0.38 && this.lightning.segments.length < 45) {
        let forkX = curX
        let forkY = curY
        const forkSteps = 2 + Math.floor(Math.random() * 3)
        const forkDir = Math.random() > 0.5 ? 1 : -1

        for (let s = 0; s < forkSteps; s++) {
          const nextForkY = forkY + 16 + Math.random() * 12
          const nextForkX = forkX + forkDir * (14 + Math.random() * 22)
          this.lightning.segments.push({ x1: forkX, y1: forkY, x2: nextForkX, y2: nextForkY, level: 2 })

          // Micro tendril (Level 3)
          if (s === 1 && Math.random() < 0.4) {
            const tendrilX = nextForkX + forkDir * 12
            const tendrilY = nextForkY + 10
            this.lightning.segments.push({ x1: nextForkX, y1: nextForkY, x2: tendrilX, y2: tendrilY, level: 3 })
          }

          forkX = nextForkX
          forkY = nextForkY
        }
      }

      curX = nextX
      curY = nextY
    }

    // Impact sparks on ground
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2
      const spd = 3 + Math.random() * 5
      this.splashes.push(new RainSplash(endX, endY, Math.cos(angle) * spd, Math.sin(angle) * spd - 2, { r: 255, g: 255, b: 255 }))
    }
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

  _onClick(e) {
    // In chill mode: soft water drop impact on glass
    if (this.mode === "chill") {
      const cx = e.clientX
      const cy = e.clientY
      this.ripples.push(new RainRipple(cx, cy, this.rgb))

      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2
        const spd = 2 + Math.random() * 3
        this.splashes.push(new RainSplash(cx, cy, Math.cos(angle) * spd, Math.sin(angle) * spd, this.rgb))
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
    this.lastTime = performance.now()
    this.time = 0
    this.nextLightningTime = performance.now() + 4500 + Math.random() * 4500
    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"

    this.resize()
    this.createEntities()

    const animateLoop = (now) => {
      if (!this.active || this.destroyed) return
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
    this.stars = []
    this.glassDrops = []
    this.bokehLights = []
    this.splashes = []
    this.ripples = []
    this.vapors = []
    this.lightning.active = false
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
    const W = this.width
    const H = this.height
    const now = performance.now()
    const isStorm = this.mode === "storm"
    const spd = this.speed

    // 1. Wind Dynamics (Oscillating breeze with harmonic gust)
    this.windTimer += 0.016 * dt
    if (this.windTimer >= (isStorm ? 3.0 : 4.0)) {
      this.windTimer = 0
      this.targetWindAngle = (Math.random() - 0.45) * (isStorm ? 0.45 : 0.3)
    }
    this.windAngle += (this.targetWindAngle - this.windAngle) * 0.008 * dt

    // 2. Natural Lightning Trigger (Storm mode only — purely atmospheric, no mouse)
    if (isStorm) {
      if (!this.lightning.active && now > this.nextLightningTime) {
        this._triggerNaturalLightning()
        this.nextLightningTime = now + 4500 + Math.random() * 5500
      }

      if (this.lightning.active) {
        this.lightning.timer -= dt
        if (this.lightning.timer <= 0) {
          this.lightning.active = false
        } else {
          const progress = 1 - this.lightning.timer / this.lightning.maxTimer
          if (progress < 0.25) this.lightning.opacity = 1.0
          else if (progress < 0.45) this.lightning.opacity = 0.35
          else if (progress < 0.65) this.lightning.opacity = 0.85
          else this.lightning.opacity = Math.max(0, 1 - (progress - 0.65) / 0.35)
        }
      }
    }

    // 3. Update Bokeh Lights (Chill mode)
    for (let i = 0; i < this.bokehLights.length; i++) {
      this.bokehLights[i].update(dt, W, H)
    }

    // 4. Update 3D Rain Drops (Scaled by Fall Speed)
    for (let i = 0; i < this.stars.length; i++) {
      this.stars[i].update(W, H, dt, this.windAngle, this.mouse, this, isStorm, spd)
    }

    // 5. Update Glass Droplets (Chill mode)
    for (let i = 0; i < this.glassDrops.length; i++) {
      this.glassDrops[i].update(dt, W, H, this.mouse, spd)
    }

    // 6. Update Splashes & Ripples
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      if (this.splashes[i].update(dt, spd)) {
        this.splashes.splice(i, 1)
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      if (this.ripples[i].update(dt, spd)) {
        this.ripples.splice(i, 1)
      }
    }

    // 7. Update Ground Vapor Wisps (Atmospheric mist)
    if (this.mist) {
      const maxVapors = isStorm ? 48 : 36
      if (this.vapors.length < maxVapors && Math.random() < (isStorm ? 0.28 : 0.16) * this.density) {
        this.vapors.push(
          new GroundVaporParticle(Math.random() * W, H - 4 - Math.random() * 12, this.rgb, this.windAngle, spd)
        )
      }

      for (let i = this.vapors.length - 1; i >= 0; i--) {
        if (this.vapors[i].update(dt, this.windAngle, spd)) {
          this.vapors.splice(i, 1)
        }
      }
    }
  }

  draw() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height
    const rgb = this.rgb
    const isStorm = this.mode === "storm"
    const spd = this.speed

    ctx.clearRect(0, 0, W, H)

    // 1. Cozy Bokeh Lights (Chill mode deep background)
    if (!isStorm) {
      for (let i = 0; i < this.bokehLights.length; i++) {
        this.bokehLights[i].draw(ctx)
      }
    }

    // 2. Atmospheric Rain Mist Curtain & Ground Haze (If mist enabled)
    if (this.mist) {
      const mistOpacity = (isStorm ? 0.07 : 0.048) * Math.min(1.4, this.density)

      // Top-down falling rain atmospheric haze
      const mist = ctx.createLinearGradient(0, 0, 0, H * (isStorm ? 0.55 : 0.45))
      mist.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${mistOpacity.toFixed(3)})`)
      mist.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(mistOpacity * 0.4).toFixed(3)})`)
      mist.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
      ctx.fillStyle = mist
      ctx.fillRect(0, 0, W, H)

      // Ground rising mist curtain
      const groundMist = ctx.createLinearGradient(0, H - 85, 0, H)
      groundMist.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
      groundMist.addColorStop(0.65, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(mistOpacity * 0.85).toFixed(3)})`)
      groundMist.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(mistOpacity * 0.5).toFixed(3)})`)
      ctx.fillStyle = groundMist
      ctx.fillRect(0, H - 85, W, 85)

      // Render rising ground vapor particles
      for (let i = 0; i < this.vapors.length; i++) {
        this.vapors[i].draw(ctx)
      }
    }

    // 3. Ground Puddle Ripples
    for (let i = 0; i < this.ripples.length; i++) {
      this.ripples[i].draw(ctx)
    }

    // 4. 3D Raindrop Streaks
    this.stars.sort((a, b) => a.z - b.z)
    for (let i = 0; i < this.stars.length; i++) {
      this.stars[i].draw(ctx, rgb, this.windAngle, spd)
    }

    // 5. Clinging Windowpane Droplets (Chill mode foreground glass)
    if (!isStorm) {
      for (let i = 0; i < this.glassDrops.length; i++) {
        this.glassDrops[i].draw(ctx, rgb)
      }
    }

    // 6. Ballistic Bounce Splash Droplets
    for (let i = 0; i < this.splashes.length; i++) {
      this.splashes[i].draw(ctx)
    }

    // 7. Crystal-Clear Ground Sheen (No murky blur bar)
    const ground = ctx.createLinearGradient(0, H - 40, 0, H)
    ground.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
    ground.addColorStop(0.8, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.02)`)
    ground.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.04)`)
    ctx.fillStyle = ground
    ctx.fillRect(0, H - 40, W, 40)

    // 8. Natural Ultra HD Lightning (Storm mode)
    if (isStorm && this.lightning.active) {
      const op = this.lightning.opacity

      // Strobe sky flash
      ctx.fillStyle = `rgba(255, 255, 255, ${(op * 0.24).toFixed(3)})`
      ctx.fillRect(0, 0, W, H)

      ctx.save()
      ctx.lineCap = "round"

      // Pass 1: Violet/Cyan Atmospheric Ion Glow
      ctx.strokeStyle = `rgba(160, 200, 255, ${(op * 0.75).toFixed(3)})`
      ctx.lineWidth = 4.5
      ctx.beginPath()
      for (let i = 0; i < this.lightning.segments.length; i++) {
        const seg = this.lightning.segments[i]
        ctx.moveTo(seg.x1, seg.y1)
        ctx.lineTo(seg.x2, seg.y2)
      }
      ctx.stroke()

      // Pass 2: White-Hot Core Channel
      ctx.strokeStyle = `rgba(255, 255, 255, ${op.toFixed(3)})`
      ctx.lineWidth = 2.0
      ctx.beginPath()
      for (let i = 0; i < this.lightning.segments.length; i++) {
        const seg = this.lightning.segments[i]
        if (seg.level <= 2) {
          ctx.moveTo(seg.x1, seg.y1)
          ctx.lineTo(seg.x2, seg.y2)
        }
      }
      ctx.restore()
    }
  }
}

