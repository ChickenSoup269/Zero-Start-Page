/**
 * SnowfallEffect — Hollywood AAA Ultra HD Cinematic 3D Snowfall Display
 *
 * Masterpiece Winter Pyrotechnics & Volumetric Physics:
 *  - 4 Authentic Snowflake Morphologies:
 *      * Stellar Dendrite (6-arm hexagonal crystal with secondary & tertiary micro-spurs)
 *      * Fernlike Stellar (Elaborate frosted ice crystal with delicate fan barbs)
 *      * Soft Volumetric Fluff / Graupel (Fluffy multi-layer snow orb with frosted halo)
 *      * Ice Needle Prisms (Glittering diamond-faceted crystal needles)
 *  - 3D Multi-Depth Parallax (Foreground, Midground, Deep Background Bokeh).
 *  - 3D Tumbling Rotations (Pitch, Roll, Yaw) with Crystalline Glinting / Micro-Sparkles.
 *  - Interactive Aerodynamic Mouse Wind Wake & Click Blizzard Vortex.
 *  - High-DPI Retina Subpixel Precision & Delta-time Normalization (60Hz - 240Hz).
 */

import { hexToRgb } from "../../utils/colors.js"

// ── 3D Volumetric Snowflake Particle ─────────────────────────────────────────
class SnowflakeParticle3D {
  constructor(width, height, rgb, initial = false) {
    this.reset(width, height, initial)
    this.rgb = rgb || { r: 255, g: 255, b: 255 }
  }

  reset(width, height, initial = false) {
    this.x = Math.random() * (width + 120) - 60
    this.y = initial ? Math.random() * height : -30 - Math.random() * 40
    
    // 3D Depth Layer Z in [0.15, 1.0]
    this.z = Math.pow(Math.random(), 1.4) * 0.85 + 0.15

    // Morphological crystal types based on size/depth
    const randType = Math.random()
    if (randType < 0.38) {
      this.type = "dendrite" // Classic 6-arm stellar dendrite
    } else if (randType < 0.65) {
      this.type = "fernlike" // Elaborate frosted crystal
    } else if (randType < 0.88) {
      this.type = "fluff" // Soft volumetric fluffy graupel
    } else {
      this.type = "needle" // Prismatic ice needle
    }

    // Size scaled by 3D depth
    const baseSize =
      this.type === "dendrite"
        ? Math.random() * 6.0 + 4.5
        : this.type === "fernlike"
          ? Math.random() * 7.5 + 5.5
          : this.type === "fluff"
            ? Math.random() * 4.5 + 2.5
            : Math.random() * 5.0 + 3.0

    this.size = baseSize * (0.4 + 0.6 * this.z)

    // Ballistic velocities (natural terminal gravity + ambient wind)
    this.baseSpeedY = (Math.random() * 0.9 + 0.65) * (0.5 + 0.8 * this.z)
    this.vy = this.baseSpeedY
    this.vx = (Math.random() - 0.5) * 0.35 * this.z

    // 3D Euler Rotations (Pitch, Roll, Yaw)
    this.pitch = Math.random() * Math.PI * 2
    this.roll = Math.random() * Math.PI * 2
    this.yaw = Math.random() * Math.PI * 2
    this.pitchSpeed = (Math.random() - 0.5) * 0.035
    this.rollSpeed = (Math.random() - 0.5) * 0.04
    this.yawSpeed = (Math.random() - 0.5) * 0.025

    // Harmonic horizontal flutter / sway
    this.swayAmp = (Math.random() * 1.6 + 0.6) * this.z
    this.swayFreq = Math.random() * 0.03 + 0.012
    this.swayPhase = Math.random() * Math.PI * 2

    // Shimmer / Crystalline glinting
    this.twinklePhase = Math.random() * Math.PI * 2
    this.twinkleSpeed = Math.random() * 0.06 + 0.02

    this.baseOpacity = (Math.random() * 0.35 + 0.65) * (0.35 + 0.65 * this.z)
  }

  update(width, height, dt, time, mouse, vortex) {
    this.pitch += this.pitchSpeed * dt
    this.roll += this.rollSpeed * dt
    this.yaw += this.yawSpeed * dt
    this.twinklePhase += this.twinkleSpeed * dt
    this.swayPhase += this.swayFreq * dt

    // 1. Natural Sinusoidal Sway
    const harmonicSway = Math.sin(this.swayPhase) * this.swayAmp

    // 2. Interactive Aerodynamic Mouse Wind Wake
    let pushX = 0
    let pushY = 0
    if (mouse.active) {
      const dx = this.x - mouse.x
      const dy = this.y - mouse.y
      const distSq = dx * dx + dy * dy
      if (distSq < mouse.radiusSq && distSq > 1) {
        const dist = Math.sqrt(distSq)
        const force = (1 - dist / mouse.radius) * 2.8 * this.z
        pushX = (dx / dist) * force
        pushY = (dy / dist) * force * 0.6
      }
    }

    // 3. Interactive Click Blizzard Vortex
    if (vortex.active) {
      const dx = this.x - vortex.x
      const dy = this.y - vortex.y
      const distSq = dx * dx + dy * dy
      const vortexRadius = vortex.radius
      if (distSq < vortexRadius * vortexRadius && distSq > 1) {
        const dist = Math.sqrt(distSq)
        const force = (1 - dist / vortexRadius) * vortex.strength * this.z
        // Radial burst + tangential swirl
        const normX = dx / dist
        const normY = dy / dist
        const tangX = -normY
        const tangY = normX
        pushX += (normX * 1.5 + tangX * 2.2) * force
        pushY += (normY * 1.5 + tangY * 2.2) * force
      }
    }

    this.x += (this.vx + harmonicSway + pushX) * dt
    this.y += (this.vy + pushY) * dt

    // Reset when exiting viewport
    if (this.y > height + 35 || this.x < -70 || this.x > width + 70) {
      this.reset(width, height, false)
    }
  }

  draw(ctx, rgb) {
    const scaleX = Math.cos(this.yaw)
    const scaleY = Math.cos(this.pitch)

    // Glinting flash when surface normal aligns towards camera
    const glint = 0.8 + 0.35 * Math.sin(this.twinklePhase)
    const alpha = Math.min(1.0, Math.max(0.05, this.baseOpacity * glint))

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.roll)
    ctx.scale(scaleX, scaleY)

    switch (this.type) {
      case "fluff":
        this._drawFluff(ctx, rgb, alpha)
        break
      case "needle":
        this._drawNeedle(ctx, rgb, alpha)
        break
      case "fernlike":
        this._drawFernlike(ctx, rgb, alpha)
        break
      case "dendrite":
      default:
        this._drawDendrite(ctx, rgb, alpha)
        break
    }

    ctx.restore()
  }

  _drawDendrite(ctx, rgb, alpha) {
    const r = this.size
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(3)})`
    ctx.lineWidth = Math.max(0.7, r * 0.12)
    ctx.lineCap = "round"

    // 6 primary symmetrical arms
    for (let i = 0; i < 6; i++) {
      ctx.save()
      ctx.rotate((Math.PI / 3) * i)

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, r)
      ctx.stroke()

      // Secondary chevron spurs at 50% and 75%
      const spur1 = r * 0.52
      const spurLen1 = r * 0.36
      ctx.beginPath()
      ctx.moveTo(0, spur1)
      ctx.lineTo(spurLen1 * 0.866, spur1 - spurLen1 * 0.5)
      ctx.moveTo(0, spur1)
      ctx.lineTo(-spurLen1 * 0.866, spur1 - spurLen1 * 0.5)
      ctx.stroke()

      const spur2 = r * 0.78
      const spurLen2 = r * 0.24
      ctx.beginPath()
      ctx.moveTo(0, spur2)
      ctx.lineTo(spurLen2 * 0.866, spur2 - spurLen2 * 0.5)
      ctx.moveTo(0, spur2)
      ctx.lineTo(-spurLen2 * 0.866, spur2 - spurLen2 * 0.5)
      ctx.stroke()

      ctx.restore()
    }

    // White-hot glistening center crystal core
    ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(0, 0, Math.max(0.9, r * 0.18), 0, Math.PI * 2)
    ctx.fill()
  }

  _drawFernlike(ctx, rgb, alpha) {
    const r = this.size
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(3)})`
    ctx.lineWidth = Math.max(0.65, r * 0.1)
    ctx.lineCap = "round"

    for (let i = 0; i < 6; i++) {
      ctx.save()
      ctx.rotate((Math.PI / 3) * i)

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, r)
      ctx.stroke()

      // Multiple dense fern barbs along the shaft
      const barbs = 3
      for (let b = 1; b <= barbs; b++) {
        const p = r * (0.3 + 0.22 * b)
        const bLen = r * 0.32 * (1.1 - b * 0.2)
        ctx.beginPath()
        ctx.moveTo(0, p)
        ctx.lineTo(bLen * 0.866, p - bLen * 0.5)
        ctx.moveTo(0, p)
        ctx.lineTo(-bLen * 0.866, p - bLen * 0.5)
        ctx.stroke()
      }

      ctx.restore()
    }

    ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.9).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(0, 0, Math.max(0.8, r * 0.15), 0, Math.PI * 2)
    ctx.fill()
  }

  _drawFluff(ctx, rgb, alpha) {
    const r = this.size * 0.85
    // Frosted soft graupel orb with radial halo
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6)
    grad.addColorStop(0, `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`)
    grad.addColorStop(0.45, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(alpha * 0.75).toFixed(3)})`)
    grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2)
    ctx.fill()
  }

  _drawNeedle(ctx, rgb, alpha) {
    const r = this.size * 1.2
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(3)})`
    ctx.lineWidth = Math.max(0.8, r * 0.14)
    ctx.lineCap = "round"

    // Diamond cross prism
    ctx.beginPath()
    ctx.moveTo(0, -r)
    ctx.lineTo(0, r)
    ctx.moveTo(-r * 0.35, 0)
    ctx.lineTo(r * 0.35, 0)
    ctx.stroke()

    ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(0, 0, Math.max(0.8, r * 0.18), 0, Math.PI * 2)
    ctx.fill()
  }
}

// ── Main SnowfallEffect Class (AAA Hollywood Architecture) ───────────────────
export class SnowfallEffect {
  constructor(canvasId, color = "#ffffff") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color || "#ffffff"
    this.rgb = hexToRgb(this.color) || { r: 255, g: 255, b: 255 }

    this.snowflakes = []
    this.snowflakeCount = 140

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
      radius: 140,
      radiusSq: 140 * 140,
      active: false,
    }

    // Interactive Click Blizzard Vortex
    this.vortex = {
      x: -9999,
      y: -9999,
      radius: 200,
      strength: 0,
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
    window.addEventListener("pointerdown", this._clickHandler)
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

    // Adapt flake count dynamically based on viewport resolution
    this.snowflakeCount = Math.max(90, Math.min(220, Math.floor(this.width / 11)))
    this.initSnowflakes()
  }

  initSnowflakes() {
    this.snowflakes = []
    for (let i = 0; i < this.snowflakeCount; i++) {
      this.snowflakes.push(
        new SnowflakeParticle3D(this.width, this.height, this.rgb, true)
      )
    }
  }

  updateColor(color) {
    if (!color) return
    this.color = color
    this.rgb = hexToRgb(color) || { r: 255, g: 255, b: 255 }
  }

  setOptions(options = {}) {
    if (options.color !== undefined) {
      this.updateColor(options.color)
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
    if (!this.active) return
    this.vortex.x = e.clientX
    this.vortex.y = e.clientY
    this.vortex.strength = 5.5
    this.vortex.radius = 220
    this.vortex.active = true
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
    this.initSnowflakes()

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
    this.snowflakes = []
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
    window.removeEventListener("pointerdown", this._clickHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  update(dt) {
    const W = this.width
    const H = this.height

    // Decay interactive click blizzard vortex
    if (this.vortex.active) {
      this.vortex.strength *= Math.pow(0.92, dt)
      if (this.vortex.strength < 0.1) {
        this.vortex.active = false
      }
    }

    for (let i = 0; i < this.snowflakes.length; i++) {
      this.snowflakes[i].update(W, H, dt, this.time, this.mouse, this.vortex)
    }
  }

  draw() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height

    ctx.clearRect(0, 0, W, H)

    const rgb = this.rgb

    // Sort by 3D depth Z for correct occlusion rendering
    this.snowflakes.sort((a, b) => a.z - b.z)

    for (let i = 0; i < this.snowflakes.length; i++) {
      this.snowflakes[i].draw(ctx, rgb)
    }
  }
}
