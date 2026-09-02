/**
 * FirefliesEffect — Hollywood AAA Bioluminescent Fireflies Engine
 *
 * Implements the 6 Golden Principles:
 *  1. Natural Organic Kinematics & Flocking:
 *     - Harmonic Lissajous & Brownian 3D flight paths with organic wing flutter and hovering bobs.
 *     - 3D Parallax layering (Z ∈ [0.15, 1.0]) with distance attenuation and detailed foreground bodies.
 *  2. True Bioluminescent Photobiology:
 *     - Natural flash cycle (dormant -> warm-up -> radiant peak with micro-flicker -> smooth decay).
 *     - Two selectable modes: "enchanted" (individual organic flashing) and "synchronous" (harmonized swarm waves).
 *  3. Luminescence without Lag:
 *     - Triple-pass optical bloom (atmospheric aura + bioluminescent halo + white-hot photon core #ffffff)
 *       without slow ctx.shadowBlur loops.
 *  4. Intelligent Mouse Interaction:
 *     - Curiosity Attraction: Idle/gentle mouse cursor draws curious fireflies nearby.
 *     - Startle Dispersion: Rapid mouse motion startles fireflies into scattering with defensive bright flash.
 *     - Bioluminescent Spore Burst: Clicking releases radiant glowing spores that draw a gentle swarm.
 *  5. 60Hz - 240Hz Delta Normalization & Native Retina High-DPI Scaling.
 *  6. Seamless Settings Integration: updateColor(hex), setMode(mode), full lifecycle.
 */

import { hexToRgb } from "../../utils/colors.js"

// ── Bioluminescent Spore Particle ───────────────────────────────────────────
class GlowSpore {
  constructor(x, y, vx, vy, rgb) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.rgb = rgb
    this.r = 1.0 + Math.random() * 2.0
    this.life = 1.0
    this.decay = 0.015 + Math.random() * 0.015
  }

  update(dt) {
    this.vx *= Math.pow(0.96, dt)
    this.vy *= Math.pow(0.96, dt)
    this.vy -= 0.15 * dt // Gentle upward buoyant lift
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.life -= this.decay * dt
    return this.life <= 0
  }

  draw(ctx) {
    if (this.life <= 0.01) return
    const rgb = this.rgb
    const alpha = this.life
    ctx.save()

    // Soft spore aura
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 4)
    grad.addColorStop(0, `rgba(255, 255, 240, ${alpha.toFixed(3)})`)
    grad.addColorStop(0.4, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(alpha * 0.8).toFixed(3)})`)
    grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.r * 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

// ── 3D Bioluminescent Firefly ───────────────────────────────────────────────
class BioluminescentFly {
  constructor(width, height, rgb, mode = "enchanted", initial = false) {
    this.rgb = rgb
    this.mode = mode
    this.reset(width, height, initial)
  }

  reset(width, height, initial = false) {
    this.x = initial ? Math.random() * width : (Math.random() < 0.5 ? -30 : width + 30)
    this.y = Math.random() * height

    // 3D Depth Layer Z in [0.15, 1.0]
    this.z = Math.pow(Math.random(), 1.2) * 0.85 + 0.15

    // Physical speed and wandering
    this.baseSpeed = (0.5 + Math.random() * 0.6) * (0.4 + 0.6 * this.z)
    this.vx = (Math.random() - 0.5) * this.baseSpeed
    this.vy = (Math.random() - 0.5) * this.baseSpeed
    this.wanderAngle = Math.random() * Math.PI * 2
    this.wanderSpeed = 0.02 + Math.random() * 0.03

    // Harmonic hovering and wing flutter
    this.bobPhase = Math.random() * Math.PI * 2
    this.bobSpeed = 0.03 + Math.random() * 0.04
    this.wingPhase = 0
    this.wingSpeed = 0.25 + Math.random() * 0.15

    // Bioluminescent Light Cycle
    this.flashClock = Math.random() * 10000
    this.flashPeriod = 4000 + Math.random() * 4500
    this.flashDuration = 2000 + Math.random() * 2000
    this.flickerOffset = Math.random() * 100
    this.startleFlash = 0 // Extra bright flash when startled

    // Scale
    this.size = (1.5 + this.z * 3.5)
  }

  update(dt, width, height, time, mouse, spores, globalWave) {
    // 1. Organic Harmonic Steering
    this.wanderAngle += (Math.random() - 0.5) * this.wanderSpeed * dt
    this.bobPhase += this.bobSpeed * dt
    this.wingPhase += this.wingSpeed * dt

    const bobY = Math.sin(this.bobPhase) * 0.35
    let targetVx = Math.cos(this.wanderAngle) * this.baseSpeed
    let targetVy = Math.sin(this.wanderAngle) * this.baseSpeed + bobY

    // 2. Attraction to Glowing Spores
    if (spores.length > 0) {
      let closestDist = 220
      let closestSpore = null
      for (let s of spores) {
        const dx = s.x - this.x
        const dy = s.y - this.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < closestDist) {
          closestDist = dist
          closestSpore = s
        }
      }
      if (closestSpore) {
        const angle = Math.atan2(closestSpore.y - this.y, closestSpore.x - this.x)
        targetVx += Math.cos(angle) * 1.6
        targetVy += Math.sin(angle) * 1.6
      }
    }

    // 3. Mouse Interaction: Curiosity vs Startle
    if (mouse.active) {
      const dx = this.x - mouse.x
      const dy = this.y - mouse.y
      const distSq = dx * dx + dy * dy
      const radius = 160

      if (distSq < radius * radius && distSq > 4) {
        const dist = Math.sqrt(distSq)
        // If mouse moves rapidly -> Startle & Scatter
        if (mouse.speed > 5.5) {
          const push = (1 - dist / radius) * 6.5
          this.vx += (dx / dist) * push
          this.vy += (dy / dist) * push
          this.startleFlash = 1.0 // Trigger defensive flash
        }
        // If mouse moves gently / idle -> Curiosity Attraction
        else if (mouse.speed < 2.5 && dist > 35) {
          const pull = (1 - dist / radius) * 0.9 * this.z
          targetVx -= (dx / dist) * pull
          targetVy -= (dy / dist) * pull
        }
      }
    }

    // Decay startle flash
    if (this.startleFlash > 0) {
      this.startleFlash -= 0.03 * dt
      if (this.startleFlash < 0) this.startleFlash = 0
    }

    // Smooth velocity interpolation (Easing inertia)
    this.vx += (targetVx - this.vx) * 0.04 * dt
    this.vy += (targetVy - this.vy) * 0.04 * dt

    // Subtle gentle night breeze
    const breezeX = Math.sin(time * 0.0006) * 0.25
    const breezeY = Math.cos(time * 0.0004) * 0.15

    this.x += (this.vx + breezeX) * dt
    this.y += (this.vy + breezeY) * dt

    // Screen Wrap
    const margin = 50
    if (this.x < -margin) this.x = width + margin
    if (this.x > width + margin) this.x = -margin
    if (this.y < -margin) this.y = height + margin
    if (this.y > height + margin) this.y = -margin

    this.flashClock += 16.67 * dt
  }

  getOpacity(globalWave = 0) {
    let baseOpacity = 0

    if (this.mode === "synchronous") {
      // Synchronized swarm breathing wave with subtle individual phase shift
      const phase = (globalWave + this.flickerOffset * 0.02) % (Math.PI * 2)
      baseOpacity = Math.pow(Math.max(0, Math.sin(phase)), 2.5)
    } else {
      // Enchanted organic individual flash cycle
      const cyclePos = this.flashClock % this.flashPeriod
      if (cyclePos <= this.flashDuration) {
        const progress = cyclePos / this.flashDuration
        baseOpacity = Math.pow(Math.sin(progress * Math.PI), 2.2)
      }
    }

    // High-frequency biological flicker
    const microFlicker = 0.88 + Math.sin(this.flashClock * 0.018 + this.flickerOffset) * 0.12
    let opacity = baseOpacity * microFlicker

    // Combine with startle flash
    if (this.startleFlash > 0) {
      opacity = Math.min(1.0, opacity + this.startleFlash * 0.8)
    }

    return Math.max(0, Math.min(1.0, opacity))
  }

  draw(ctx, rgb, globalWave = 0) {
    const opacity = this.getOpacity(globalWave)
    const isVisible = opacity > 0.008
    const size = this.size
    const z = this.z

    ctx.save()
    ctx.translate(this.x, this.y)

    // Calculate heading angle for physical body orientation
    const heading = Math.atan2(this.vy, this.vx)
    ctx.rotate(heading)

    // 1. Foreground Insect Body (Only for closer fireflies Z > 0.65)
    if (z > 0.65) {
      ctx.save()
      // Thorax & Head
      ctx.fillStyle = `rgba(30, 25, 20, ${0.45 + z * 0.35})`
      ctx.beginPath()
      ctx.ellipse(-size * 0.3, 0, size * 0.35, size * 0.2, 0, 0, Math.PI * 2)
      ctx.fill()

      // Fluttering Translucent Wings
      const wingFlutter = Math.sin(this.wingPhase) * 0.45
      ctx.fillStyle = `rgba(220, 240, 255, ${0.25 + opacity * 0.2})`
      // Top Wing
      ctx.beginPath()
      ctx.ellipse(-size * 0.2, -size * (0.45 + wingFlutter * 0.3), size * 0.5, size * 0.22, -0.4 + wingFlutter * 0.3, 0, Math.PI * 2)
      ctx.fill()
      // Bottom Wing
      ctx.beginPath()
      ctx.ellipse(-size * 0.2, size * (0.45 + wingFlutter * 0.3), size * 0.5, size * 0.22, 0.4 - wingFlutter * 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // 2. Bioluminescent Lantern (Belly glow)
    if (isVisible) {
      // 2A. Wide Atmospheric Bloom
      const bloomR = size * (20 + z * 22)
      const bloomGrad = ctx.createRadialGradient(size * 0.2, 0, 0, size * 0.2, 0, bloomR)
      bloomGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(opacity * 0.18).toFixed(3)})`)
      bloomGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(opacity * 0.05).toFixed(3)})`)
      bloomGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

      ctx.fillStyle = bloomGrad
      ctx.beginPath()
      ctx.arc(size * 0.2, 0, bloomR, 0, Math.PI * 2)
      ctx.fill()

      // 2B. Bioluminescent Halo
      const haloR = size * (6.5 + z * 6.5)
      const haloGrad = ctx.createRadialGradient(size * 0.2, 0, 0, size * 0.2, 0, haloR)
      haloGrad.addColorStop(0, `rgba(255, 255, 245, ${(opacity * 0.95).toFixed(3)})`)
      haloGrad.addColorStop(0.4, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(opacity * 0.85).toFixed(3)})`)
      haloGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

      ctx.fillStyle = haloGrad
      ctx.beginPath()
      ctx.arc(size * 0.2, 0, haloR, 0, Math.PI * 2)
      ctx.fill()

      // 2C. White-Hot Photon Core (Light-emitting organelle)
      const coreR = Math.max(1.2, size * (0.9 + z * 0.5) * (0.85 + opacity * 0.25))
      ctx.fillStyle = `rgba(255, 255, 255, ${(opacity * 0.98).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(size * 0.2, 0, coreR, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
}

// ── Main Hollywood AAA Fireflies Class ───────────────────────────────────────
export class FirefliesEffect {
  constructor(canvasId, color = "#ffe855", mode = "enchanted") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.destroyed = false
    this.rafId = null

    // Options
    this.color = color || "#ffe855"
    this.rgb = hexToRgb(this.color) || { r: 255, g: 232, b: 85 }
    this.mode = mode === "synchronous" ? "synchronous" : "enchanted"

    // Simulation Entities
    this.flies = []
    this.spores = []
    this.quantity = 42

    // Timing & DPR
    this.time = 0
    this.lastTime = performance.now()
    this.globalWave = 0
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)

    // Mouse Interaction
    this.mouse = {
      x: -9999,
      y: -9999,
      lastX: -9999,
      lastY: -9999,
      vx: 0,
      vy: 0,
      speed: 0,
      active: false,
    }

    // Handlers
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

  setMode(mode) {
    const valid = mode === "synchronous" ? "synchronous" : "enchanted"
    if (this.mode !== valid) {
      this.mode = valid
      this.flies.forEach((f) => (f.mode = valid))
    }
  }

  updateColor(newColor) {
    if (!newColor) return
    this.color = newColor
    this.rgb = hexToRgb(newColor) || { r: 255, g: 232, b: 85 }
    this.flies.forEach((f) => (f.rgb = this.rgb))
    this.spores.forEach((s) => (s.rgb = this.rgb))
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

    this.quantity = Math.max(30, Math.min(75, Math.floor(this.width / 36)))
    this._buildFlies()
  }

  _buildFlies() {
    this.flies = []
    for (let i = 0; i < this.quantity; i++) {
      this.flies.push(new BioluminescentFly(this.width, this.height, this.rgb, this.mode, true))
    }
  }

  _onMouseMove(e) {
    const curX = e.clientX
    const curY = e.clientY

    if (this.mouse.lastX > -1000) {
      this.mouse.vx = curX - this.mouse.lastX
      this.mouse.vy = curY - this.mouse.lastY
      this.mouse.speed = Math.sqrt(this.mouse.vx * this.mouse.vx + this.mouse.vy * this.mouse.vy)
    }

    this.mouse.lastX = curX
    this.mouse.lastY = curY
    this.mouse.x = curX
    this.mouse.y = curY
    this.mouse.active = true
  }

  _onMouseLeave() {
    this.mouse.active = false
    this.mouse.x = -9999
    this.mouse.y = -9999
    this.mouse.lastX = -9999
    this.mouse.lastY = -9999
    this.mouse.vx = 0
    this.mouse.vy = 0
    this.mouse.speed = 0
  }

  _onClick(e) {
    // Click to release a warm cluster of bioluminescent spores
    const cx = e.clientX
    const cy = e.clientY
    const sporeCount = 14 + Math.floor(Math.random() * 8)

    for (let i = 0; i < sporeCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const spd = 1.0 + Math.random() * 4.5
      this.spores.push(new GlowSpore(cx, cy, Math.cos(angle) * spd, Math.sin(angle) * spd, this.rgb))
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
    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"

    this.resize()

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
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.canvas) {
      this.canvas.style.display = "none"
    }
    this.flies = []
    this.spores = []
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

    this.time += dt
    this.globalWave += 0.02 * dt // Harmonized wave pulse

    // Decay mouse velocity
    this.mouse.vx *= Math.pow(0.85, dt)
    this.mouse.vy *= Math.pow(0.85, dt)
    this.mouse.speed *= Math.pow(0.85, dt)

    // Update Spores
    for (let i = this.spores.length - 1; i >= 0; i--) {
      if (this.spores[i].update(dt)) {
        this.spores.splice(i, 1)
      }
    }

    // Update Fireflies
    for (let i = 0; i < this.flies.length; i++) {
      this.flies[i].update(dt, W, H, this.time, this.mouse, this.spores, this.globalWave)
    }
  }

  animate(timestamp = 0) {
    if (!this.active || this.destroyed) return

    const rawElapsed = this.lastTime ? timestamp - this.lastTime : 16.67
    this.lastTime = timestamp
    const dt = Math.min(Math.max(rawElapsed / 16.67, 0.1), 3.0)

    this.update(dt)

    const ctx = this.ctx
    const W = this.width
    const H = this.height
    const rgb = this.rgb

    ctx.clearRect(0, 0, W, H)

    // 1. Draw Bioluminescent Spores
    for (let i = 0; i < this.spores.length; i++) {
      this.spores[i].draw(ctx)
    }

    // 2. Draw Fireflies (Sorted by Depth Z)
    this.flies.sort((a, b) => a.z - b.z)
    for (let i = 0; i < this.flies.length; i++) {
      this.flies[i].draw(ctx, rgb, this.globalWave)
    }
  }
}

