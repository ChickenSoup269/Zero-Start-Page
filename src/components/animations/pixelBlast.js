/**
 * PixelBlastEffect — Hollywood AAA Quantum Pixel Shockwave & Cyber Vortex Engine
 *
 * Implements the 6 Golden Principles:
 *  1. Volumetric Quantum Particle Dynamics & Supernova Bursts:
 *     - Ambient cosmic stardust drift & periodic autonomous energy pulses.
 *     - Explosive click/tap supernova shockwave blasts with high-velocity particle dispersion.
 *     - Aerodynamic drag physics, white-hot photon cores, and radiant light trails.
 *  2. Multi-Geometry Cybernetic Variants:
 *     - Square (Cyber Pixel), Circle (Photon Orb), Diamond (Prism Shard),
 *       Triangle (Crystal Shard), Cross (Cyber Star), and Mixed Quantum Universe.
 *  3. Interactive Fluid Forcefield & Cymatic Ripples:
 *     - Magnetic elastic cursor forcefield with smooth liquid wake displacement.
 *     - Expanding high-energy shockwave rings interacting with floating particles.
 *  4. 60Hz - 240Hz Delta Normalization & Zero-Lag Native Canvas.
 *  5. 100% Backward-Compatible API (setOptions, start, stop, destroy, resize).
 */

export class PixelBlastEffect {
  constructor(canvasId = "effect-canvas", options = {}) {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.destroyed = false
    this._animId = null

    // Options with AAA defaults
    this.pixelSize = options.pixelSize || 15
    this.variant = options.variant || "square"
    this.color = options.color || "#B497CF"
    this.speed = options.speed || 1.0
    this.cursorRadius = options.cursorRadius || 150
    this.enableRipples = options.enableRipples !== undefined ? options.enableRipples : true
    this.rippleSpeed = options.rippleSpeed || 1.0
    this.rippleThickness = options.rippleThickness || 0.1
    this.rippleIntensityScale = options.rippleIntensityScale || 1.0
    this.transparent = options.transparent !== undefined ? options.transparent : true
    this.backgroundColor = options.backgroundColor || "#0a0a0a"

    this.liquid = options.liquid !== undefined ? options.liquid : true
    this.liquidStrength = options.liquidStrength || 1.0

    this._cacheColor()

    this.time = 0
    this.lastTime = performance.now()
    this.ambientParticles = []
    this.blastParticles = []
    this.shockwaves = []
    this.mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, active: false }
    this.autoBlastTimer = 0

    // Event Handlers
    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseLeaveHandler = () => this._onMouseLeave()
    this._mouseDownHandler = (e) => this._onMouseDown(e)
    this._visibilityHandler = () => this._onVisibilityChange()
  }

  _cacheColor() {
    this.rgb = this.hexToRgb(this.color) || { r: 180, g: 151, b: 207 }
  }

  hexToRgb(hex) {
    if (!hex || typeof hex !== "string") return { r: 180, g: 151, b: 207 }
    let clean = hex.replace("#", "")
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
    }
    if (clean.length !== 6) return { r: 180, g: 151, b: 207 }
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    }
  }

  setOptions(options = {}) {
    for (const key in options) {
      if (options[key] !== undefined) {
        this[key] = options[key]
      }
    }
    if (options.color) {
      this._cacheColor()
    }
    if (options.pixelSize || options.variant) {
      this.initAmbientParticles()
    }
  }

  resize() {
    if (!this.canvas) return
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.pointerEvents = "none"

    this.initAmbientParticles()
  }

  initAmbientParticles() {
    this._cacheColor()
    this.ambientParticles = []
    const count = Math.min(Math.floor((this.width * this.height) / 16000), 70)
    const baseVariants = ["square", "circle", "triangle", "diamond", "cross"]

    for (let i = 0; i < count; i++) {
      const v =
        this.variant === "mixed"
          ? baseVariants[Math.floor(Math.random() * baseVariants.length)]
          : this.variant

      this.ambientParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        originX: Math.random() * this.width,
        originY: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: Math.max(4, this.pixelSize * (0.35 + Math.random() * 0.7)),
        variant: v,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        alpha: 0.25 + Math.random() * 0.5,
      })
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

  _onMouseDown(e) {
    this.triggerBlast(e.clientX, e.clientY, 1.2)
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.lastTime = performance.now()
    }
  }

  triggerBlast(x, y, intensity = 1.0) {
    const pCount = Math.floor((30 + Math.random() * 25) * intensity)
    const { r, g, b } = this.rgb
    const baseVariants = ["square", "circle", "triangle", "diamond", "cross"]

    // 1. Shockwave Ring
    if (this.enableRipples) {
      this.shockwaves.push({
        x,
        y,
        radius: 4,
        maxRadius: Math.min(this.width, this.height) * (0.38 + intensity * 0.2),
        speed: (4.5 + intensity * 2.5) * this.rippleSpeed,
        thickness: Math.max(2, 6 * this.rippleThickness * intensity),
        alpha: 1.0,
        decay: 0.022 / Math.max(0.5, this.speed),
      })
    }

    // 2. High-Velocity Quantum Pixel Shards
    for (let i = 0; i < pCount; i++) {
      const angle = (i / pCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
      const spd = (2.5 + Math.random() * 6.5) * intensity * this.speed
      const v =
        this.variant === "mixed"
          ? baseVariants[Math.floor(Math.random() * baseVariants.length)]
          : this.variant

      this.blastParticles.push({
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: Math.max(3, this.pixelSize * (0.3 + Math.random() * 0.6) * intensity),
        variant: v,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        alpha: 1.0,
        decay: 0.014 + Math.random() * 0.016,
        color: { r, g, b },
        spark: Math.random() < 0.35, // White-hot photon core spark
      })
    }
  }

  start() {
    if (this.active || this.destroyed || !this.canvas) return
    this.active = true
    this.lastTime = performance.now()
    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"

    this.resize()
    window.addEventListener("resize", this._resizeHandler, { passive: true })
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseleave", this._mouseLeaveHandler, { passive: true })
    window.addEventListener("mousedown", this._mouseDownHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)

    const animate = (time) => {
      if (!this.active || this.destroyed) return
      this._animId = requestAnimationFrame(animate)

      if (document.visibilityState === "hidden") {
        this.lastTime = time
        return
      }

      const elapsed = Math.min(time - this.lastTime, 100)
      this.lastTime = time
      const dt = Math.min(elapsed / 16.67, 3.0)

      this.update(dt)
      this.draw()
    }

    this._animId = requestAnimationFrame(animate)
  }

  stop() {
    this.active = false
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
    window.removeEventListener("mousedown", this._mouseDownHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.canvas) {
      this.canvas.style.display = "none"
    }
    this.ambientParticles = []
    this.blastParticles = []
    this.shockwaves = []
  }

  destroy() {
    this.stop()
    this.destroyed = true
  }

  update(dt) {
    this.time += 0.016 * dt * this.speed

    // Periodic Ambient Supernova Blast if idle
    this.autoBlastTimer += dt
    if (this.autoBlastTimer > 180 / Math.max(0.4, this.speed)) {
      this.autoBlastTimer = 0
      const bx = this.width * (0.15 + Math.random() * 0.7)
      const by = this.height * (0.15 + Math.random() * 0.7)
      this.triggerBlast(bx, by, 0.75)
    }

    // 1. Update Ambient Particles
    const forceRadius = this.cursorRadius
    const forceRadiusSq = forceRadius * forceRadius

    for (const p of this.ambientParticles) {
      p.phase += p.pulseSpeed * dt
      p.rotation += p.rotSpeed * dt

      // Natural floating drift
      p.x += (p.vx + Math.cos(p.phase) * 0.3) * dt
      p.y += (p.vy + Math.sin(p.phase) * 0.3) * dt

      // Fluid Magnetic Wake Interaction
      if (this.mouse.active) {
        const dx = p.x - this.mouse.x
        const dy = p.y - this.mouse.y
        const dSq = dx * dx + dy * dy

        if (dSq < forceRadiusSq && dSq > 1) {
          const d = Math.sqrt(dSq)
          const force = (1 - d / forceRadius) * (this.liquid ? this.liquidStrength * 2.5 : 1.5)
          p.x += (dx / d) * force * 3.5 * dt
          p.y += (dy / d) * force * 3.5 * dt
        }
      }

      // Shockwave push
      for (const sw of this.shockwaves) {
        const dx = p.x - sw.x
        const dy = p.y - sw.y
        const dist = Math.hypot(dx, dy)
        const diff = Math.abs(dist - sw.radius)
        if (diff < 40) {
          const force = (1 - diff / 40) * sw.alpha * 3.0
          p.x += (dx / (dist || 1)) * force * dt
          p.y += (dy / (dist || 1)) * force * dt
        }
      }

      // Wrap screen
      if (p.x < -30) p.x = this.width + 30
      else if (p.x > this.width + 30) p.x = -30
      if (p.y < -30) p.y = this.height + 30
      else if (p.y > this.height + 30) p.y = -30
    }

    // 2. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i]
      sw.radius += sw.speed * dt
      sw.alpha -= sw.decay * dt
      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1)
      }
    }

    // 3. Update High-Energy Blast Particles
    for (let i = this.blastParticles.length - 1; i >= 0; i--) {
      const bp = this.blastParticles[i]
      bp.prevX = bp.x
      bp.prevY = bp.y

      bp.x += bp.vx * dt
      bp.y += bp.vy * dt

      // Air drag & deceleration
      bp.vx *= Math.pow(0.96, dt)
      bp.vy *= Math.pow(0.96, dt)

      bp.rotation += bp.rotSpeed * dt
      bp.alpha -= bp.decay * dt

      if (bp.alpha <= 0) {
        this.blastParticles.splice(i, 1)
      }
    }
  }

  drawShape(ctx, variant, size) {
    const s = size
    switch (variant) {
      case "circle":
        ctx.beginPath()
        ctx.arc(0, 0, s / 2, 0, Math.PI * 2)
        ctx.fill()
        break
      case "triangle":
        ctx.beginPath()
        const h = s * 0.866
        ctx.moveTo(0, -h / 2)
        ctx.lineTo(s / 2, h / 2)
        ctx.lineTo(-s / 2, h / 2)
        ctx.closePath()
        ctx.fill()
        break
      case "diamond":
        ctx.beginPath()
        ctx.moveTo(0, -s * 0.65)
        ctx.lineTo(s * 0.65, 0)
        ctx.lineTo(0, s * 0.65)
        ctx.lineTo(-s * 0.65, 0)
        ctx.closePath()
        ctx.fill()
        break
      case "cross":
        const w = s * 0.3
        ctx.fillRect(-s / 2, -w / 2, s, w)
        ctx.fillRect(-w / 2, -s / 2, w, s)
        break
      case "square":
      default:
        ctx.fillRect(-s / 2, -s / 2, s, s)
        break
    }
  }

  draw() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height

    if (this.transparent) {
      ctx.clearRect(0, 0, W, H)
    } else {
      ctx.fillStyle = this.backgroundColor || "#0a0a0a"
      ctx.fillRect(0, 0, W, H)
    }

    const { r, g, b } = this.rgb

    // 1. Draw Expanding Shockwave Rings
    for (const sw of this.shockwaves) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(sw.alpha * 0.85).toFixed(3)})`
      ctx.lineWidth = sw.thickness
      ctx.stroke()

      // High-energy inner white glow edge
      if (sw.alpha > 0.4) {
        ctx.beginPath()
        ctx.arc(sw.x, sw.y, Math.max(1, sw.radius - 2), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 255, 255, ${(sw.alpha * 0.6).toFixed(3)})`
        ctx.lineWidth = 1.2
        ctx.stroke()
      }
      ctx.restore()
    }

    // 2. Draw Ambient Quantum Nebula Stardust
    for (const p of this.ambientParticles) {
      const pulseAlpha = p.alpha * (0.7 + Math.sin(p.phase) * 0.3)
      if (pulseAlpha <= 0.02) continue

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)

      // Outer glow
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(pulseAlpha * 0.85).toFixed(3)})`
      this.drawShape(ctx, p.variant, p.size)

      // Inner white-hot photon node
      ctx.fillStyle = `rgba(255, 255, 255, ${(pulseAlpha * 0.9).toFixed(3)})`
      this.drawShape(ctx, p.variant, p.size * 0.4)

      ctx.restore()
    }

    // 3. Draw Blast Quantum Shards & Light Trails
    for (const bp of this.blastParticles) {
      if (bp.alpha <= 0.01) continue

      ctx.save()

      // Motion Trail
      ctx.beginPath()
      ctx.moveTo(bp.prevX, bp.prevY)
      ctx.lineTo(bp.x, bp.y)
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(bp.alpha * 0.45).toFixed(3)})`
      ctx.lineWidth = Math.max(0.8, bp.size * 0.4)
      ctx.stroke()

      // Particle body
      ctx.translate(bp.x, bp.y)
      ctx.rotate(bp.rotation)

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(bp.alpha * 0.9).toFixed(3)})`
      this.drawShape(ctx, bp.variant, bp.size)

      if (bp.spark) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(bp.alpha * 0.95).toFixed(3)})`
        this.drawShape(ctx, bp.variant, bp.size * 0.5)
      }

      ctx.restore()
    }
  }
}
