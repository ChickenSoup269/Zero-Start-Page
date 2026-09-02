/**
 * RainbowBackground — Hollywood / AAA Ultra HD Prismatic God Rays Engine
 *
 * Implements the 6 Golden Principles:
 *  1. Natural Organic Geometry: Volumetric crepuscular light shafts (God rays)
 *     with tapered frustum geometry, sinusoidal edge wavering, chromatic
 *     dispersion, and diffraction star glints.
 *  2. 3D Parallax & Depth: Multi-depth Z-layering (Far ambient spectral wash,
 *     Mid crepuscular shafts, Near sharp white-hot rays and shimmering motes).
 *  3. Luminescence & Gradients: White-hot radiant cores with neon spectral fringes,
 *     additive blending (globalCompositeOperation = 'lighter'), NO blur filters.
 *  4. Fluid Dynamics & Mouse Wake: Refractive atmospheric disturbance bending
 *     light beams around cursor, turbulent stardust swirl, and spark trails.
 *  5. 60Hz - 240Hz Delta Normalization & High-DPI: Smooth frame pacing across all
 *     monitor refresh rates and Retina display crispness.
 *  6. Seamless Startpage Settings Integration: setDirection('left'|'right') with
 *     smooth kinematic tilting, complete lifecycle methods.
 */

export class RainbowBackground {
  constructor(canvasId, direction = "left") {
    this.canvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId

    if (!this.canvas) {
      console.warn(`[RainbowBackground] Canvas element "${canvasId}" not found.`)
      return
    }

    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.destroyed = false
    this._animId = null
    this.lastTime = 0
    this.dpr = 1
    this.width = 0
    this.height = 0

    // Spectral dispersion hues: Red, Orange, Gold, Green, Cyan, Blue, Violet, Magenta
    this.spectralHues = [355, 24, 48, 140, 185, 220, 275, 318]

    // Direction & Smooth Angle Transition
    this.direction = direction || "left"
    this.targetAngle = this.direction === "left" ? 0.38 : -0.38 // ~22 degrees in radians
    this.currentAngle = this.targetAngle
    this.angularVelocity = 0

    // Simulation Entities across 3 Z-layers
    this.beamCount = 24
    this.particleCount = 75
    this.beams = []
    this.particles = []
    this.sparkles = []

    // Mouse & Wake Interaction
    this.mouse = {
      x: -2000,
      y: -2000,
      lastX: -2000,
      lastY: -2000,
      vx: 0,
      vy: 0,
      speed: 0,
      active: false,
    }

    // Cached Offscreen God Ray Shaders
    this.cachedBeams = {}

    // Event Bindings
    this.handleResize = this.handleResize.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleMouseLeave = this.handleMouseLeave.bind(this)
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
    this.animate = this.animate.bind(this)

    this.resize()
    window.addEventListener("resize", this.handleResize, { passive: true })
    document.addEventListener("visibilitychange", this.handleVisibilityChange)
  }

  /* -------------------------------------------------------------------------- */
  /*                              DIRECTION & CONFIG                            */
  /* -------------------------------------------------------------------------- */

  setDirection(direction) {
    if (!direction || this.direction === direction) return
    this.direction = direction
    this.targetAngle = this.direction === "left" ? 0.38 : -0.38
  }

  /* -------------------------------------------------------------------------- */
  /*                            RESIZE & LIFECYCLE                              */
  /* -------------------------------------------------------------------------- */

  resize() {
    if (!this.canvas) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = Math.floor(this.width * this.dpr)
    this.canvas.height = Math.floor(this.height * this.dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    this._preRenderLightShafts()
    this._initEntities()
  }

  handleResize() {
    this.resize()
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    if (this.mouse.lastX > -1000) {
      this.mouse.vx = mx - this.mouse.lastX
      this.mouse.vy = my - this.mouse.lastY
      this.mouse.speed = Math.sqrt(this.mouse.vx * this.mouse.vx + this.mouse.vy * this.mouse.vy)

      // Emit prismatic stardust when mouse moves fast
      if (this.mouse.speed > 8 && this.sparkles.length < 50) {
        const hue = this.spectralHues[Math.floor(Math.random() * this.spectralHues.length)]
        this.sparkles.push({
          x: mx + (Math.random() - 0.5) * 20,
          y: my + (Math.random() - 0.5) * 20,
          vx: this.mouse.vx * 0.15 + (Math.random() - 0.5) * 1.5,
          vy: this.mouse.vy * 0.15 + (Math.random() - 0.5) * 1.5,
          size: 1.5 + Math.random() * 2.5,
          hue,
          life: 1.0,
          decay: 0.02 + Math.random() * 0.025,
        })
      }
    }

    this.mouse.x = mx
    this.mouse.y = my
    this.mouse.lastX = mx
    this.mouse.lastY = my
    this.mouse.active = true
  }

  handleMouseLeave() {
    this.mouse.x = -2000
    this.mouse.y = -2000
    this.mouse.lastX = -2000
    this.mouse.lastY = -2000
    this.mouse.vx = 0
    this.mouse.vy = 0
    this.mouse.speed = 0
    this.mouse.active = false
  }

  handleVisibilityChange() {
    if (document.visibilityState === "visible" && this.active) {
      this.lastTime = performance.now()
    }
  }

  start() {
    if (this.active || this.destroyed) return
    this.active = true
    this.lastTime = performance.now()

    this.canvas.style.display = "block"
    this.resize()

    window.addEventListener("mousemove", this.handleMouseMove, { passive: true })
    window.addEventListener("mouseout", this.handleMouseLeave, { passive: true })

    const loop = (time) => {
      if (!this.active || this.destroyed) return
      this._animId = requestAnimationFrame(loop)
      if (document.visibilityState === "hidden") return
      this.animate(time)
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

    window.removeEventListener("mousemove", this.handleMouseMove)
    window.removeEventListener("mouseout", this.handleMouseLeave)

    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height)
    }
    this.canvas.style.display = "none"
    this.beams = []
    this.particles = []
    this.sparkles = []
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this.handleResize)
    document.removeEventListener("visibilitychange", this.handleVisibilityChange)
    this.cachedBeams = {}
  }

  /* -------------------------------------------------------------------------- */
  /*                  PRE-RENDER VOLUMETRIC PRISMATIC SHAFTS                    */
  /* -------------------------------------------------------------------------- */

  _preRenderLightShafts() {
    this.cachedBeams = {}
    const shaftLength = 1400
    const shaftWidth = 120

    for (let i = 0; i < this.spectralHues.length; i++) {
      const hue = this.spectralHues[i]
      const offCanvas = document.createElement("canvas")
      offCanvas.width = shaftWidth
      offCanvas.height = shaftLength
      const offCtx = offCanvas.getContext("2d")

      // 1. Longitudinal Volumetric Falloff Gradient (Apex to Base)
      const vertGrad = offCtx.createLinearGradient(0, 0, 0, shaftLength)
      vertGrad.addColorStop(0, `hsla(${hue}, 95%, 70%, 0)`)
      vertGrad.addColorStop(0.06, `hsla(${hue}, 95%, 75%, 0.85)`)
      vertGrad.addColorStop(0.45, `hsla(${hue}, 90%, 65%, 0.6)`)
      vertGrad.addColorStop(0.8, `hsla(${hue}, 85%, 60%, 0.25)`)
      vertGrad.addColorStop(1, `hsla(${hue}, 80%, 55%, 0)`)

      offCtx.fillStyle = vertGrad
      offCtx.fillRect(0, 0, shaftWidth, shaftLength)

      // 2. Transverse Radiant Core Profile (Center white-hot, fading to sides)
      offCtx.globalCompositeOperation = "destination-in"
      const horizGrad = offCtx.createLinearGradient(0, 0, shaftWidth, 0)
      horizGrad.addColorStop(0, "rgba(0,0,0,0)")
      horizGrad.addColorStop(0.25, "rgba(0,0,0,0.4)")
      horizGrad.addColorStop(0.5, "rgba(0,0,0,1)")
      horizGrad.addColorStop(0.75, "rgba(0,0,0,0.4)")
      horizGrad.addColorStop(1, "rgba(0,0,0,0)")

      offCtx.fillStyle = horizGrad
      offCtx.fillRect(0, 0, shaftWidth, shaftLength)

      // 3. White-Hot Energy Filament down the center
      offCtx.globalCompositeOperation = "lighter"
      const coreGrad = offCtx.createLinearGradient(shaftWidth * 0.42, 0, shaftWidth * 0.58, 0)
      coreGrad.addColorStop(0, "rgba(255,255,255,0)")
      coreGrad.addColorStop(0.5, "rgba(255,255,255,0.75)")
      coreGrad.addColorStop(1, "rgba(255,255,255,0)")

      offCtx.fillStyle = coreGrad
      offCtx.fillRect(shaftWidth * 0.4, 0, shaftWidth * 0.2, shaftLength)

      this.cachedBeams[hue] = offCanvas
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                      INIT MULTI-DEPTH PRISMATIC ENTITIES                   */
  /* -------------------------------------------------------------------------- */

  _initEntities() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight
    const diagonal = Math.sqrt(W * W + H * H)

    this.beams = []
    this.particles = []
    this.sparkles = []

    // 1. Crepuscular Rainbow Beams across 3 Depth Strata
    for (let i = 0; i < this.beamCount; i++) {
      let z
      if (i < 8) z = 0.25 + Math.random() * 0.2 // Far stratum: soft wide ambient wash
      else if (i < 18) z = 0.5 + Math.random() * 0.25 // Mid stratum: defined shafts
      else z = 0.8 + Math.random() * 0.2 // Near stratum: high energy, crisp

      const hueIndex = i % this.spectralHues.length
      const hue = this.spectralHues[hueIndex]

      this.beams.push({
        id: i,
        z,
        hue,
        // Position relative to screen width with comfortable margins
        x: Math.random() * (W * 1.6) - W * 0.3,
        yBase: -Math.random() * (H * 0.25) - 80,
        width: (25 + Math.random() * 55) * (0.6 + z * 0.8),
        length: diagonal * (1.2 + z * 0.4),
        driftSpeed: (0.15 + Math.random() * 0.25) * (0.5 + z * 0.6),
        baseOpacity: (0.12 + Math.random() * 0.25) * (0.5 + z * 0.6),
        currentOpacity: 0,
        // Pulsing & harmonic waving
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.008 + Math.random() * 0.014,
        wavePhase: Math.random() * Math.PI * 2,
        waveSpeed: 0.012 + Math.random() * 0.01,
        waveAmp: 8 + Math.random() * 14,
        // Mouse disturbance displacement
        displaceX: 0,
        displaceY: 0,
      })
    }

    // 2. Luminous Stardust & Prismatic Motes across 3 Depth Strata
    for (let i = 0; i < this.particleCount; i++) {
      const z = 0.2 + Math.random() * 0.8
      const hue = this.spectralHues[Math.floor(Math.random() * this.spectralHues.length)]

      this.particles.push({
        x: Math.random() * (W * 1.5) - W * 0.25,
        y: Math.random() * (H + 100) - 50,
        z,
        size: (1.2 + Math.random() * 2.8) * (0.5 + z * 0.7),
        speed: (0.35 + Math.random() * 0.65) * (0.4 + z * 0.7),
        hue,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.03 + Math.random() * 0.04,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.015 + Math.random() * 0.02,
        baseAlpha: 0.2 + Math.random() * 0.5,
        // Fluid momentum
        vx: 0,
        vy: 0,
      })
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                PHYSICS STEP                                 */
  /* -------------------------------------------------------------------------- */

  _update(dt) {
    const W = this.width
    const H = this.height
    const mouseActive = this.mouse.active && this.mouse.x > -1000

    // Smooth kinematic tilt towards target direction angle
    const angleDiff = this.targetAngle - this.currentAngle
    this.angularVelocity += (angleDiff * 0.1 - this.angularVelocity) * 0.15 * dt
    this.currentAngle += this.angularVelocity * dt

    const sinA = Math.sin(this.currentAngle)
    const cosA = Math.cos(this.currentAngle)

    // 1. Update Beams
    const beamRadius = 180

    for (let i = 0; i < this.beams.length; i++) {
      const b = this.beams[i]

      // Natural gentle lateral drift across the sky
      b.x += b.driftSpeed * dt
      if (b.x > W * 1.6) {
        b.x = -W * 0.4
      } else if (b.x < -W * 0.6) {
        b.x = W * 1.4
      }

      // Harmonic breathing pulse
      b.pulse += b.pulseSpeed * dt
      b.wavePhase += b.waveSpeed * dt
      const pulseFactor = (Math.sin(b.pulse) + 1) * 0.5
      b.currentOpacity = b.baseOpacity * (0.7 + pulseFactor * 0.6)

      // Mouse Refractive Wake: beams gently deflect when mouse cursor passes through
      if (mouseActive) {
        // Approximate beam midline distance to mouse
        const beamXAtMouseY = b.x + (this.mouse.y - b.yBase) * (sinA / Math.max(0.1, cosA))
        const distToBeam = Math.abs(this.mouse.x - beamXAtMouseY)

        if (distToBeam < beamRadius) {
          const force = (1 - distToBeam / beamRadius) * 22 * b.z
          const sign = this.mouse.x > beamXAtMouseY ? -1 : 1
          b.displaceX += (sign * force - b.displaceX) * 0.12 * dt
        } else {
          b.displaceX *= Math.pow(0.92, dt)
        }
      } else {
        b.displaceX *= Math.pow(0.92, dt)
      }
    }

    // 2. Update Dust Particles / Prismatic Motes
    const motesRadius = 140

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]

      // Drift parallel to the crepuscular angle with subtle Brownian oscillation
      p.wobblePhase += p.wobbleSpeed * dt
      p.twinklePhase += p.twinkleSpeed * dt

      const driftX = sinA * p.speed + Math.sin(p.wobblePhase) * 0.4
      const driftY = cosA * p.speed + Math.cos(p.wobblePhase) * 0.2

      // Mouse wake interaction
      if (mouseActive) {
        const dx = p.x - this.mouse.x
        const dy = p.y - this.mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < motesRadius && dist > 1) {
          const push = Math.pow((motesRadius - dist) / motesRadius, 1.3) * 3.0 * p.z
          p.vx += (dx / dist) * push * dt
          p.vy += (dy / dist) * push * dt
        }
      }

      // Spring damping
      p.vx *= Math.pow(0.94, dt)
      p.vy *= Math.pow(0.94, dt)

      p.x += (driftX + p.vx) * dt
      p.y += (driftY + p.vy) * dt

      // Seamless screen loop
      if (p.y > H + 60) {
        p.y = -60
        p.x = Math.random() * (W * 1.5) - W * 0.25
      } else if (p.y < -70) {
        p.y = H + 50
      }
      if (p.x > W + 80) p.x = -70
      else if (p.x < -80) p.x = W + 70
    }

    // 3. Update Sparkling Particles (Mouse Burst)
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const sp = this.sparkles[i]
      sp.x += sp.vx * dt
      sp.y += (sp.vy + 0.4) * dt
      sp.vx *= Math.pow(0.96, dt)
      sp.vy *= Math.pow(0.96, dt)
      sp.life -= sp.decay * dt

      if (sp.life <= 0) {
        this.sparkles.splice(i, 1)
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                 RENDERING                                  */
  /* -------------------------------------------------------------------------- */

  _renderGodRays(ctx) {
    const time = performance.now()

    for (let i = 0; i < this.beams.length; i++) {
      const b = this.beams[i]
      const offCanvas = this.cachedBeams[b.hue]
      if (!offCanvas) continue

      const waveOffset = Math.sin(b.wavePhase + time * 0.0006) * b.waveAmp
      const startX = b.x + waveOffset + b.displaceX
      const startY = b.yBase

      const pulseFactor = (Math.sin(b.pulse) + 1) * 0.5
      const currentWidth = b.width * (1 + pulseFactor * 0.2)

      ctx.save()
      ctx.translate(startX, startY)
      ctx.rotate(this.currentAngle)

      // Volumetric beam alpha modulated by depth & pulse
      ctx.globalAlpha = Math.min(0.95, b.currentOpacity)

      // Draw volumetric beam
      ctx.drawImage(offCanvas, -currentWidth / 2, 0, currentWidth, b.length)

      // Extra radiant white filament for near/high-energy beams
      if (b.z > 0.55 && pulseFactor > 0.45) {
        ctx.globalAlpha = Math.min(0.85, (pulseFactor - 0.45) * 1.5 * b.z)
        ctx.drawImage(offCanvas, -currentWidth * 0.12, 0, currentWidth * 0.24, b.length)
      }

      ctx.restore()
    }
  }

  _renderMotes(ctx) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      const twinkle = (Math.sin(p.twinklePhase) + 1) * 0.5
      const alpha = Math.max(0.05, Math.min(1, p.baseAlpha * (0.5 + twinkle * 0.6) * p.z))

      ctx.save()
      ctx.globalAlpha = alpha

      // Soft luminous core
      ctx.fillStyle = `hsl(${p.hue}, 95%, 85%)`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()

      // Diffraction star glint for large foreground motes
      if (p.z > 0.7 && p.size > 2.2 && twinkle > 0.7) {
        const spikeLen = p.size * 2.8 * twinkle
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)"
        ctx.lineWidth = Math.max(0.6, 0.9 * p.z)
        ctx.beginPath()
        ctx.moveTo(p.x - spikeLen, p.y)
        ctx.lineTo(p.x + spikeLen, p.y)
        ctx.moveTo(p.x, p.y - spikeLen)
        ctx.lineTo(p.x, p.y + spikeLen)
        ctx.stroke()
      }

      ctx.restore()
    }
  }

  _renderSparkles(ctx) {
    for (let i = 0; i < this.sparkles.length; i++) {
      const sp = this.sparkles[i]
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, sp.life))
      ctx.fillStyle = `hsl(${sp.hue}, 100%, 75%)`

      // 4-point star spark
      const r = sp.size
      ctx.beginPath()
      ctx.moveTo(sp.x, sp.y - r * 1.8)
      ctx.lineTo(sp.x + r * 0.4, sp.y - r * 0.4)
      ctx.lineTo(sp.x + r * 1.8, sp.y)
      ctx.lineTo(sp.x + r * 0.4, sp.y + r * 0.4)
      ctx.lineTo(sp.x, sp.y + r * 1.8)
      ctx.lineTo(sp.x - r * 0.4, sp.y + r * 0.4)
      ctx.lineTo(sp.x - r * 1.8, sp.y)
      ctx.lineTo(sp.x - r * 0.4, sp.y - r * 0.4)
      ctx.closePath()
      ctx.fill()

      ctx.restore()
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                MAIN LOOP                                   */
  /* -------------------------------------------------------------------------- */

  animate(timestamp = 0) {
    if (!this.active || this.destroyed) return

    // Delta-time normalization
    const rawElapsed = this.lastTime ? timestamp - this.lastTime : 16.67
    this.lastTime = timestamp
    const dt = Math.min(Math.max(rawElapsed / (1000 / 60), 0.1), 3.0)

    // Physics step
    this._update(dt)

    // Clear Canvas
    this.ctx.clearRect(0, 0, this.width, this.height)

    // Additive Lighter Blend Mode for realistic crepuscular optical illumination
    this.ctx.globalCompositeOperation = "lighter"

    // 1. Render God Rays
    this._renderGodRays(this.ctx)

    // 2. Render Prismatic Stardust Motes
    this._renderMotes(this.ctx)

    // 3. Render Interactive Sparkles
    if (this.sparkles.length > 0) {
      this._renderSparkles(this.ctx)
    }
  }
}

