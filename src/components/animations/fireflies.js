/**
 * FirefliesEffect — Hollywood AAA Ultra HD Bioluminescent Fireflies Engine
 *
 * Implements the 6 Golden Principles:
 *  1. Natural Organic Kinematics:
 *     - Harmonic Lissajous & Brownian 3D flight paths with organic wing flutter and hovering bobs.
 *     - Multi-tier Parallax Depth Layering (Z ∈ [0.15, 1.0]) with distance attenuation,
 *       soft background depth, and detailed foreground insect bodies (head, thorax, abdomen segments, and fluttering translucent wings).
 *  2. True Bioluminescent Photobiology:
 *     - Natural flash cycle (dormant -> warm-up -> radiant peak with micro-flicker -> smooth decay).
 *     - Selectable modes: "enchanted" (individual organic flashing) and "synchronous" (harmonized swarm waves).
 *  3. Luminescence without Lag:
 *     - Triple-pass optical bloom (atmospheric aura + bioluminescent halo + white-hot photon core #ffffff)
 *       using performant radial gradients without slow ctx.filter or ctx.shadowBlur.
 *  4. Gentle Non-Intrusive Atmosphere (Refined Mouse Dynamics):
 *     - Eliminates erratic startle-flash and magnetic cursor attraction so fireflies maintain their serene, natural flight.
 *     - Subtle cushioned air wake: cursor gently parts the air only when gliding very close, preserving organic beauty.
 *  5. 60Hz - 240Hz Delta Normalization & Native Retina High-DPI Scaling.
 *  6. Seamless Settings Integration:
 *     - Full support for updateColor(hex), color getter/setter, setMode(mode), and complete lifecycle management.
 */

import { hexToRgb } from "../../utils/colors.js"

// ── 3D Bioluminescent Firefly ───────────────────────────────────────────────
class BioluminescentFly {
  constructor(width, height, rgb, mode = "enchanted", initial = false) {
    this.rgb = rgb
    this.mode = mode
    this.reset(width, height, initial)
  }

  reset(width, height, initial = false) {
    this.x = initial ? Math.random() * width : (Math.random() < 0.5 ? -40 : width + 40)
    this.y = Math.random() * height

    // 3D Depth Layer Z ∈ [0.15, 1.0]
    this.z = Math.pow(Math.random(), 1.25) * 0.85 + 0.15

    // Physical speed and organic wandering
    this.baseSpeed = (0.45 + Math.random() * 0.55) * (0.35 + 0.65 * this.z)
    this.vx = (Math.random() - 0.5) * this.baseSpeed
    this.vy = (Math.random() - 0.5) * this.baseSpeed
    this.wanderAngle = Math.random() * Math.PI * 2
    this.wanderSpeed = 0.015 + Math.random() * 0.025

    // Harmonic hovering and wing flutter
    this.bobPhase = Math.random() * Math.PI * 2
    this.bobSpeed = 0.025 + Math.random() * 0.035
    this.wingPhase = 0
    this.wingSpeed = 0.22 + Math.random() * 0.14

    // Bioluminescent Light Cycle
    this.flashClock = Math.random() * 10000
    this.flashPeriod = 3800 + Math.random() * 4200
    this.flashDuration = 1800 + Math.random() * 1800
    this.flickerOffset = Math.random() * 100

    // Size scaled by depth
    this.size = 1.4 + this.z * 3.6
  }

  update(dt, width, height, time, mouse, globalWave) {
    // 1. Organic Harmonic Steering (Lissajous & Brownian drift)
    this.wanderAngle += (Math.random() - 0.5) * this.wanderSpeed * dt
    this.bobPhase += this.bobSpeed * dt
    this.wingPhase += this.wingSpeed * dt

    const bobY = Math.sin(this.bobPhase) * 0.3
    let targetVx = Math.cos(this.wanderAngle) * this.baseSpeed
    let targetVy = Math.sin(this.wanderAngle) * this.baseSpeed + bobY

    // 2. Gentle Non-Intrusive Mouse Wake
    // Fireflies are no longer magnetically trapped nor violently startled;
    // they simply glide smoothly around the cursor if it comes very close.
    if (mouse.active) {
      const dx = this.x - mouse.x
      const dy = this.y - mouse.y
      const distSq = dx * dx + dy * dy
      const softRadius = 65

      if (distSq < softRadius * softRadius && distSq > 1) {
        const dist = Math.sqrt(distSq)
        const gentleNudge = (1 - dist / softRadius) * 0.8 * this.z
        targetVx += (dx / dist) * gentleNudge
        targetVy += (dy / dist) * gentleNudge
      }
    }

    // Smooth cushioned velocity damping (Natural inertia)
    this.vx += (targetVx - this.vx) * 0.035 * dt
    this.vy += (targetVy - this.vy) * 0.035 * dt

    // Serene night breeze ambient drift
    const breezeX = Math.sin(time * 0.0005) * 0.22
    const breezeY = Math.cos(time * 0.0003) * 0.12

    this.x += (this.vx + breezeX) * dt
    this.y += (this.vy + breezeY) * dt

    // Screen wrap with soft padding
    const margin = 60
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
      baseOpacity = Math.pow(Math.max(0, Math.sin(phase)), 2.4)
    } else {
      // Enchanted organic individual flash cycle
      const cyclePos = this.flashClock % this.flashPeriod
      if (cyclePos <= this.flashDuration) {
        const progress = cyclePos / this.flashDuration
        baseOpacity = Math.pow(Math.sin(progress * Math.PI), 2.1)
      }
    }

    // High-frequency natural biological flicker (luciferin enzymatic glow)
    const microFlicker = 0.88 + Math.sin(this.flashClock * 0.016 + this.flickerOffset) * 0.12
    const opacity = baseOpacity * microFlicker

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

    // 1. Foreground Insect Anatomy (Rendered for closer fireflies Z > 0.58)
    if (z > 0.58) {
      ctx.save()
      // Head & Thorax (Dark chitin shell)
      ctx.fillStyle = `rgba(28, 22, 18, ${(0.4 + z * 0.35).toFixed(3)})`
      ctx.beginPath()
      ctx.ellipse(-size * 0.32, 0, size * 0.36, size * 0.2, 0, 0, Math.PI * 2)
      ctx.fill()

      // Fluttering Translucent Wings
      const wingFlutter = Math.sin(this.wingPhase) * 0.42
      ctx.fillStyle = `rgba(230, 245, 255, ${(0.22 + opacity * 0.18).toFixed(3)})`
      // Upper Wing
      ctx.beginPath()
      ctx.ellipse(
        -size * 0.2,
        -size * (0.42 + wingFlutter * 0.3),
        size * 0.52,
        size * 0.2,
        -0.38 + wingFlutter * 0.28,
        0,
        Math.PI * 2
      )
      ctx.fill()
      // Lower Wing
      ctx.beginPath()
      ctx.ellipse(
        -size * 0.2,
        size * (0.42 + wingFlutter * 0.3),
        size * 0.52,
        size * 0.2,
        0.38 - wingFlutter * 0.28,
        0,
        Math.PI * 2
      )
      ctx.fill()
      ctx.restore()
    }

    // 2. Bioluminescent Lantern (Triple-pass optical bloom adapted to custom color)
    if (isVisible) {
      // 2A. Wide Atmospheric Bloom (Ambient night mist illumination)
      const bloomR = size * (18 + z * 20)
      const bloomGrad = ctx.createRadialGradient(size * 0.2, 0, 0, size * 0.2, 0, bloomR)
      bloomGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(opacity * 0.16).toFixed(3)})`)
      bloomGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(opacity * 0.045).toFixed(3)})`)
      bloomGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

      ctx.fillStyle = bloomGrad
      ctx.beginPath()
      ctx.arc(size * 0.2, 0, bloomR, 0, Math.PI * 2)
      ctx.fill()

      // 2B. Bioluminescent Halo (Vibrant colored aura)
      const haloR = size * (5.8 + z * 6.2)
      const haloGrad = ctx.createRadialGradient(size * 0.2, 0, 0, size * 0.2, 0, haloR)
      haloGrad.addColorStop(0, `rgba(255, 255, 250, ${(opacity * 0.95).toFixed(3)})`)
      haloGrad.addColorStop(0.35, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(opacity * 0.85).toFixed(3)})`)
      haloGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

      ctx.fillStyle = haloGrad
      ctx.beginPath()
      ctx.arc(size * 0.2, 0, haloR, 0, Math.PI * 2)
      ctx.fill()

      // 2C. White-Hot Photon Core (Central luminescent organelle)
      const coreR = Math.max(1.1, size * (0.85 + z * 0.45) * (0.85 + opacity * 0.25))
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

    // Color Management with Custom Support
    this._color = color || "#ffe855"
    this.rgb = hexToRgb(this._color) || { r: 255, g: 232, b: 85 }
    this.mode = mode === "synchronous" ? "synchronous" : "enchanted"

    // Simulation Entities
    this.flies = []
    this.quantity = 42

    // Timing & DPR Normalization
    this.time = 0
    this.lastTime = performance.now()
    this.globalWave = 0
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)

    // Gentle Non-Intrusive Mouse State
    this.mouse = {
      x: -9999,
      y: -9999,
      active: false,
    }

    // Bound Event Handlers
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

  // ── Color API ─────────────────────────────────────────────────────────────
  get color() {
    return this._color
  }

  set color(val) {
    this.updateColor(val)
  }

  updateColor(newColor) {
    if (!newColor) return
    this._color = newColor
    const parsed = hexToRgb(newColor)
    if (parsed) {
      this.rgb = parsed
      this.flies.forEach((f) => (f.rgb = this.rgb))
    }
  }

  // ── Mode API ──────────────────────────────────────────────────────────────
  setMode(mode) {
    const valid = mode === "synchronous" ? "synchronous" : "enchanted"
    if (this.mode !== valid) {
      this.mode = valid
      this.flies.forEach((f) => (f.mode = valid))
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

    this.quantity = Math.max(32, Math.min(75, Math.floor(this.width / 36)))
    this._buildFlies()
  }

  _buildFlies() {
    this.flies = []
    for (let i = 0; i < this.quantity; i++) {
      this.flies.push(new BioluminescentFly(this.width, this.height, this.rgb, this.mode, true))
    }
  }

  // ── Mouse Listeners ───────────────────────────────────────────────────────
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
    if (document.visibilityState === "visible") {
      this.lastTime = performance.now()
    }
  }

  // ── Animation Loop ────────────────────────────────────────────────────────
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
    const W = this.width
    const H = this.height

    this.time += dt
    this.globalWave += 0.02 * dt // Harmonized wave pulse for synchronous mode

    // Update Fireflies
    for (let i = 0; i < this.flies.length; i++) {
      this.flies[i].update(dt, W, H, this.time, this.mouse, this.globalWave)
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

    // Render Fireflies (Sorted by Depth Z for correct optical occlusion)
    this.flies.sort((a, b) => a.z - b.z)
    for (let i = 0; i < this.flies.length; i++) {
      this.flies[i].draw(ctx, rgb, this.globalWave)
    }
  }
}

