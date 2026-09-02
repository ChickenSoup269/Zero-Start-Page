/**
 * BubblesEffect — Underwater Bubbles HD Simulation
 *
 * Upgraded Features:
 *  1. Native High-DPI Retina Subpixel Rendering for ultra-crisp bubble glass rims & glints.
 *  2. 60Hz - 240Hz Delta Normalization (removed old 30 FPS lock) for silky smooth buoyancy.
 *  3. Authentic Surface Tension Wobble & Iridescent Thin-Film Sheen.
 *  4. Interactive Mouse:
 *     - Moving mouse creates a wake of rising micro-bubbles.
 *     - Clicking bursts a playful cluster of rising water bubbles.
 *     - Passing cursor gently deflects and pushes nearby bubbles.
 *  5. 100% Backward-Compatible API with clean lifecycle management.
 */

export class BubblesEffect {
  constructor(canvasId, color = "#60c8ff") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.destroyed = false
    this._animId = null

    this.color = color || "#60c8ff"
    this._rgb = this.hexToRgb(this.color)
    this.bubbles = []
    this.interactiveBubbles = []
    this.bubbleCount = 55

    // High-DPI Retina
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    // Delta-time
    this.lastTime = performance.now()
    this.time = 0

    // Mouse Tracking & Giant Bubble Holding
    this.mouseEnabled = true
    this.mouse = {
      x: -9999,
      y: -9999,
      lastX: -9999,
      lastY: -9999,
      active: false,
    }
    this.holding = false
    this.holdStartTime = 0
    this.growingBubble = null

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseLeaveHandler = () => this._onMouseLeave()
    this._mouseDownHandler = (e) => this._onMouseDown(e)
    this._mouseUpHandler = (e) => this._onMouseUp(e)
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseleave", this._mouseLeaveHandler, { passive: true })
    window.addEventListener("mousedown", this._mouseDownHandler, { passive: true })
    window.addEventListener("mouseup", this._mouseUpHandler, { passive: true })
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

    if (this.active) {
      this.initBubbles()
    }
  }

  initBubbles() {
    const W = this.width || window.innerWidth
    this.bubbleCount = Math.max(35, Math.floor(W / 36))
    this.bubbles = []
    for (let i = 0; i < this.bubbleCount; i++) {
      this.bubbles.push(this.createBubble(true))
    }
    this.interactiveBubbles = []
  }

  /**
   * @param {boolean} randomY - If true, spawn bubble at random height (init); else spawn at bottom
   */
  createBubble(randomY = false) {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight
    const size = Math.random() * 18 + 4 // 4px – 22px radius
    const x = Math.random() * W
    const y = randomY
      ? Math.random() * H
      : H + size + Math.random() * 120

    return {
      x,
      y,
      size,
      baseSize: size,
      speedY: (0.45 + (1 - size / 22) * 0.55 + Math.random() * 0.4),
      swayAmplitude: Math.random() * 24 + 8,
      swaySpeed: Math.random() * 0.02 + 0.01,
      swayOffset: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.35 + 0.22,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.06 + Math.random() * 0.06,
      vx: 0,
      vy: 0,
    }
  }

  createInteractiveBubble(x, y, isClick = false) {
    const size = isClick ? Math.random() * 12 + 5 : Math.random() * 6 + 2.5
    const angle = Math.random() * Math.PI * 2
    const burstSpeed = isClick ? Math.random() * 2.5 + 0.8 : Math.random() * 0.8 + 0.2

    return {
      x: x + (Math.random() - 0.5) * 12,
      y: y + (Math.random() - 0.5) * 12,
      size,
      baseSize: size,
      speedY: (0.6 + Math.random() * 0.8),
      swayAmplitude: Math.random() * 16 + 6,
      swaySpeed: Math.random() * 0.025 + 0.015,
      swayOffset: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.38 + 0.35,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.08 + Math.random() * 0.08,
      vx: Math.cos(angle) * burstSpeed,
      vy: -Math.abs(Math.sin(angle) * burstSpeed * 0.8),
    }
  }

  setMouseEnabled(enabled) {
    this.mouseEnabled = Boolean(enabled)
    if (!this.mouseEnabled) {
      this.mouse = { x: -9999, y: -9999, lastX: -9999, lastY: -9999, active: false }
      this.holding = false
      this.growingBubble = null
    }
  }

  _onMouseMove(e) {
    if (this.mouseEnabled === false) return
    const x = e.clientX
    const y = e.clientY

    if (this.holding && this.growingBubble) {
      this.growingBubble.x = x
      this.growingBubble.y = y
    }

    if (this.mouse.active && this.mouse.lastX > -100 && !this.holding) {
      const dx = x - this.mouse.lastX
      const dy = y - this.mouse.lastY
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Spawn micro-bubbles along the wake
      if (dist > 18 && this.interactiveBubbles.length < 50) {
        this.interactiveBubbles.push(this.createInteractiveBubble(x, y, false))
        this.mouse.lastX = x
        this.mouse.lastY = y
      }
    } else {
      this.mouse.lastX = x
      this.mouse.lastY = y
    }

    this.mouse.x = x
    this.mouse.y = y
    this.mouse.active = true
  }

  _onMouseDown(e) {
    if (!this.active || this.mouseEnabled === false) return
    this.holding = true
    this.holdStartTime = performance.now()
    this.mouse.x = e.clientX
    this.mouse.y = e.clientY
    this.mouse.active = true

    this.growingBubble = {
      x: e.clientX,
      y: e.clientY,
      size: 10,
      baseSize: 10,
      maxSize: 85, // Huge giant bubble
      wobblePhase: 0,
      wobbleSpeed: 0.12,
      opacity: 0.4,
    }
  }

  _onMouseUp(e) {
    if (!this.active || !this.holding || this.mouseEnabled === false) return
    const holdDuration = performance.now() - this.holdStartTime
    const x = e.clientX
    const y = e.clientY

    if (holdDuration >= 240 && this.growingBubble && this.growingBubble.size >= 16) {
      // Release the GIANT BUBBLE!
      const finalSize = this.growingBubble.size
      const giantBubble = {
        x,
        y,
        size: finalSize,
        baseSize: finalSize,
        speedY: 0.75 + (finalSize / 85) * 1.5, // Strong upward buoyancy
        swayAmplitude: 16 + (finalSize / 85) * 14,
        swaySpeed: 0.01 + (1 - finalSize / 85) * 0.015,
        swayOffset: Math.random() * Math.PI * 2,
        opacity: 0.42 + (finalSize / 85) * 0.16,
        wobblePhase: 0,
        wobbleSpeed: 0.05 + (1 - finalSize / 85) * 0.04, // Deeper, slower wobble for large liquid mass
        vx: 0,
        vy: -0.5,
        isGiant: true,
      }

      this.interactiveBubbles.push(giantBubble)

      // Detachment micro-bubbles beneath
      for (let k = 0; k < 3; k++) {
        this.interactiveBubbles.push(
          this.createInteractiveBubble(x, y + finalSize * 0.7, false),
        )
      }
    } else {
      // Quick click / tap: burst playful cluster of bubbles
      const count = 7 + Math.floor(Math.random() * 6)
      for (let i = 0; i < count; i++) {
        if (this.interactiveBubbles.length < 60) {
          this.interactiveBubbles.push(this.createInteractiveBubble(x, y, true))
        }
      }
    }

    this.holding = false
    this.growingBubble = null
  }

  _onMouseLeave() {
    if (this.holding && this.growingBubble && this.growingBubble.size >= 18) {
      const finalSize = this.growingBubble.size
      this.interactiveBubbles.push({
        x: this.growingBubble.x,
        y: this.growingBubble.y,
        size: finalSize,
        baseSize: finalSize,
        speedY: 0.75 + (finalSize / 85) * 1.5,
        swayAmplitude: 18,
        swaySpeed: 0.012,
        swayOffset: Math.random() * Math.PI * 2,
        opacity: 0.45,
        wobblePhase: 0,
        wobbleSpeed: 0.06,
        vx: 0,
        vy: -0.5,
        isGiant: true,
      })
    }
    this.holding = false
    this.growingBubble = null
    this.mouse.active = false
    this.mouse.x = -9999
    this.mouse.y = -9999
    this.mouse.lastX = -9999
    this.mouse.lastY = -9999
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.lastTime = performance.now()
    }
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 96, g: 200, b: 255 }
  }

  updateColor(newColor) {
    if (!newColor) return
    this.color = newColor
    this._rgb = this.hexToRgb(this.color)
  }

  start() {
    if (this.active || this.destroyed) return
    this.active = true
    this.lastTime = performance.now()
    this.time = 0
    this._rgb = this.hexToRgb(this.color)

    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"

    this.resize()
    this.initBubbles()

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
      this.time += 0.016 * dt

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
    this.bubbles = []
    this.interactiveBubbles = []
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
    window.removeEventListener("mousedown", this._mouseDownHandler)
    window.removeEventListener("mouseup", this._mouseUpHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
    this._rgb = null
  }

  update(dt) {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    // 1. Ambient Background Bubbles
    for (let i = 0; i < this.bubbles.length; i++) {
      const b = this.bubbles[i]

      // Rise upward
      b.y -= (b.speedY + b.vy) * dt
      b.swayOffset += b.swaySpeed * dt
      b.x += (Math.sin(b.swayOffset) * 0.45 + b.vx) * dt
      b.wobblePhase += b.wobbleSpeed * dt

      // Hydrodynamic mouse deflection (gently nudge aside)
      if (this.mouse.active) {
        const dx = b.x - this.mouse.x
        const dy = b.y - this.mouse.y
        const distSq = dx * dx + dy * dy
        const radius = b.size + (this.holding ? 90 : 45)

        if (distSq < radius * radius && distSq > 4) {
          const dist = Math.sqrt(distSq)
          const pushForce = (1 - dist / radius) * (this.holding ? 3.5 : 2.2)
          b.vx += (dx / dist) * pushForce * 0.18
          b.vy += (dy / dist) * pushForce * 0.18
        }
      }

      // Drag damping
      b.vx *= Math.pow(0.92, dt)
      b.vy *= Math.pow(0.92, dt)

      // Respawn when reaching top
      if (b.y + b.size < -20) {
        this.bubbles[i] = this.createBubble(false)
      }

      // Screen horizontal wrap
      if (b.x < -b.size * 2) b.x = W + b.size
      if (b.x > W + b.size * 2) b.x = -b.size
    }

    // 2. Interactive Mouse Bubbles
    for (let i = this.interactiveBubbles.length - 1; i >= 0; i--) {
      const ib = this.interactiveBubbles[i]

      ib.y -= (ib.speedY + ib.vy) * dt
      ib.x += (Math.sin(ib.swayOffset) * 0.35 + ib.vx) * dt
      ib.swayOffset += ib.swaySpeed * dt
      ib.wobblePhase += ib.wobbleSpeed * dt

      ib.vx *= Math.pow(0.94, dt)
      ib.vy *= Math.pow(0.94, dt)

      // Remove when off top
      if (ib.y + ib.size < -40) {
        this.interactiveBubbles.splice(i, 1)
      }
    }

    // 3. Inflating Giant Bubble under Cursor
    if (this.holding && this.growingBubble) {
      const holdTime = performance.now() - this.holdStartTime
      if (holdTime > 100) {
        const growth = (1.4 + Math.min(3.8, holdTime / 350)) * 0.55 * dt
        this.growingBubble.size = Math.min(
          this.growingBubble.maxSize,
          this.growingBubble.size + growth,
        )
      }
      this.growingBubble.wobblePhase += this.growingBubble.wobbleSpeed * dt
      this.growingBubble.x = this.mouse.x
      this.growingBubble.y = this.mouse.y
    }
  }

  drawBubble(bubble, rgb) {
    const ctx = this.ctx
    const { x, y, size, opacity, wobblePhase } = bubble

    ctx.save()
    ctx.translate(x, y)

    // Subtle Surface Tension Wobble (realistic aquatic deformation)
    const stretch = Math.sin(wobblePhase) * 0.07
    ctx.scale(1 + stretch, 1 - stretch)

    // 1. Soft Outer Caustic Water Glow
    const glowGrad = ctx.createRadialGradient(0, 0, size * 0.4, 0, 0, size * 2.0)
    glowGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(opacity * 0.22).toFixed(3)})`)
    glowGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.arc(0, 0, size * 2.0, 0, Math.PI * 2)
    ctx.fill()

    // 2. Translucent Glass Sphere Body
    const bodyGrad = ctx.createRadialGradient(
      -size * 0.22,
      -size * 0.22,
      size * 0.05,
      0,
      0,
      size,
    )
    bodyGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(opacity * 0.26).toFixed(3)})`)
    bodyGrad.addColorStop(0.65, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(opacity * 0.12).toFixed(3)})`)
    bodyGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(opacity * 0.65).toFixed(3)})`)

    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.arc(0, 0, size, 0, Math.PI * 2)
    ctx.fill()

    // 3. Crisp Glass Rim with Iridescent Sheen
    ctx.strokeStyle = `rgba(${Math.min(255, rgb.r + 40)}, ${Math.min(255, rgb.g + 40)}, ${Math.min(255, rgb.b + 40)}, ${(opacity * 0.88).toFixed(3)})`
    ctx.lineWidth = Math.max(0.6, size * 0.065)
    ctx.stroke()

    // 4. Primary Specular Highlight (Top-left crescent/oval reflection)
    const hlX = -size * 0.32
    const hlY = -size * 0.32
    const hlSize = size * 0.34

    const hlGrad = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, hlSize)
    hlGrad.addColorStop(0, `rgba(255, 255, 255, ${(Math.min(1.0, opacity * 1.8 + 0.3)).toFixed(3)})`)
    hlGrad.addColorStop(0.45, `rgba(255, 255, 255, ${(opacity * 0.75).toFixed(3)})`)
    hlGrad.addColorStop(1, "rgba(255, 255, 255, 0)")

    ctx.fillStyle = hlGrad
    ctx.beginPath()
    ctx.arc(hlX, hlY, hlSize, 0, Math.PI * 2)
    ctx.fill()

    // 5. Secondary Counter-Reflection (Bottom-right soft glint)
    const hl2X = size * 0.32
    const hl2Y = size * 0.3
    const hl2Size = size * 0.16

    const hlGrad2 = ctx.createRadialGradient(hl2X, hl2Y, 0, hl2X, hl2Y, hl2Size)
    hlGrad2.addColorStop(0, `rgba(255, 255, 255, ${(opacity * 0.85).toFixed(3)})`)
    hlGrad2.addColorStop(1, "rgba(255, 255, 255, 0)")

    ctx.fillStyle = hlGrad2
    ctx.beginPath()
    ctx.arc(hl2X, hl2Y, hl2Size, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  draw() {
    const ctx = this.ctx
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    ctx.clearRect(0, 0, W, H)

    if (!this._rgb) this._rgb = this.hexToRgb(this.color)
    const rgb = this._rgb

    // Render Ambient Bubbles
    for (let i = 0; i < this.bubbles.length; i++) {
      this.drawBubble(this.bubbles[i], rgb)
    }

    // Render Interactive Mouse Bubbles (including giant bubbles)
    for (let i = 0; i < this.interactiveBubbles.length; i++) {
      this.drawBubble(this.interactiveBubbles[i], rgb)
    }

    // Render Inflating Giant Bubble under Cursor
    if (this.holding && this.growingBubble) {
      this.drawBubble(this.growingBubble, rgb)
    }
  }
}

