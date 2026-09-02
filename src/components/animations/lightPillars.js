/**
 * LightPillarsEffect — Hollywood / AAA Ultra HD Atmospheric Ice Crystal Pillars
 *
 * Simulates the breathtaking sub-zero optical phenomenon where hexagonal ice crystal
 * platelets in calm freezing air reflect vertical beams of light high into the night sky.
 *
 * Implements the 6 Golden Principles:
 *  1. Natural Organic Geometry: Volumetric light shafts with 2D Gaussian lateral
 *     and longitudinal falloff (completely seamless fade in X and Y, NO box cuts),
 *     white-hot radiant core filaments, and tumbling diamond dust crystals.
 *  2. 3D Parallax & Depth: Multi-depth Z-layering (Z ∈ [0.2, 1.0]) with distance attenuation,
 *     deep background mist pillars, and prominent foreground columns with 4-point star glints.
 *  3. Luminescence & Gradients: White-hot radiant spines with sub-zero cyan/violet/amber
 *     auroral fringes, additive blending (globalCompositeOperation = 'lighter'), NO blur filters.
 *  4. Fluid Dynamics & Mouse Wake: Thermal updraft convection currents lofting crystals,
 *     vertical resonance ripples along pillar columns, and interactive diamond dust bursts.
 *  5. 60Hz - 240Hz Delta Normalization & High-DPI: Normalized frame dt physics and Retina subpixel scaling.
 *  6. Seamless Startpage Settings Integration: getter/setter color, updateColor(hex), setMode(mode).
 */

export class LightPillarsEffect {
  constructor(canvasId, color = "#88ccff", options = {}) {
    this.canvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId

    if (!this.canvas) {
      console.warn(`[LightPillarsEffect] Canvas element "${canvasId}" not found.`)
      return
    }

    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this._color = color || "#88ccff"
    this._mode = options.mode || "aurora" // "aurora" | "arctic" | "golden" | "custom"

    // Animation & Lifecycle
    this.active = false
    this.destroyed = false
    this.rafId = null
    this.lastTime = 0
    this.dpr = 1
    this.width = 0
    this.height = 0

    // Simulation Entities
    this.pillarCount = 22
    this.crystalCount = 95
    this.pillars = []
    this.crystals = []
    this.sparkles = []

    // Mouse & Thermal Updraft
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

    // Pre-rendered Volumetric Pillar Shaders
    this.pillarCanvases = {}

    // Color Palette
    this.palette = this._computePalette(this._color)

    // Event Handlers
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
  /*                              COLOR & PALETTE                               */
  /* -------------------------------------------------------------------------- */

  get color() {
    return this._color
  }

  set color(hex) {
    this.updateColor(hex)
  }

  get mode() {
    return this._mode
  }

  set mode(val) {
    this.setMode(val)
  }

  updateColor(hex) {
    if (!hex) return
    this._color = hex
    this._mode = "custom"
    this.palette = this._computePalette(hex)
    this._preRenderPillars()

    // Update active pillars
    for (let i = 0; i < this.pillars.length; i++) {
      this._applyPillarPalette(this.pillars[i], this.palette)
    }
  }

  setMode(mode) {
    const valid = ["aurora", "arctic", "golden", "custom"]
    if (!valid.includes(mode)) return
    this._mode = mode
    this.palette = this._computePalette(this._color)
    this._preRenderPillars()

    for (let i = 0; i < this.pillars.length; i++) {
      this._applyPillarPalette(this.pillars[i], this.palette)
    }
  }

  _hexToRgb(hex) {
    let clean = (hex || "").replace("#", "").trim()
    if (clean.length === 3) {
      clean = clean.split("").map((c) => c + c).join("")
    }
    const num = parseInt(clean, 16)
    if (isNaN(num) || clean.length !== 6) {
      return { r: 136, g: 204, b: 255 }
    }
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    }
  }

  _rgbToHsl(r, g, b) {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
  }

  _computePalette(hex) {
    const rgb = this._hexToRgb(hex)
    const hsl = this._rgbToHsl(rgb.r, rgb.g, rgb.b)

    return {
      baseHex: hex,
      rgb,
      hsl,
      mode: this._mode,
    }
  }

  _getHuesForMode() {
    if (this._mode === "aurora") {
      // Breathtaking multi-hue atmospheric northern light spectrum
      return [195, 275, 325, 215, 155, 45, 185, 290]
    } else if (this._mode === "arctic") {
      // Sub-zero arctic polar: cyan, sapphire, and crystalline violet
      return [185, 195, 205, 220, 255, 210]
    } else if (this._mode === "golden") {
      // Warm city nightglow: gold, amber, rose, bronze
      return [38, 48, 25, 12, 345, 42]
    } else {
      // Custom: harmonic variations around the selected hue
      const base = this.palette.hsl.h
      return [
        base,
        (base + 25) % 360,
        (base - 25 + 360) % 360,
        (base + 50) % 360,
        (base - 50 + 360) % 360,
      ]
    }
  }

  _applyPillarPalette(pillar, palette) {
    const hues = this._getHuesForMode()
    pillar.hue = hues[pillar.id % hues.length]
    pillar.sat = 88
    pillar.lum = 65
  }

  /* -------------------------------------------------------------------------- */
  /*                  PRE-RENDER 2D GAUSSIAN VOLUMETRIC PILLARS                 */
  /* -------------------------------------------------------------------------- */

  /**
   * Pre-renders a 2D volumetric light pillar for each hue that fades
   * seamlessly in BOTH dimensions (X and Y), eliminating all hard edges.
   */
  _preRenderPillars() {
    this.pillarCanvases = {}
    const hues = this._getHuesForMode()
    const pWidth = 140
    const pHeight = 1600

    for (let i = 0; i < hues.length; i++) {
      const hue = hues[i]
      const offCanvas = document.createElement("canvas")
      offCanvas.width = pWidth
      offCanvas.height = pHeight
      const offCtx = offCanvas.getContext("2d")

      // Step 1: Longitudinal Atmospheric Falloff (Top/Bottom soft fade)
      const vertGrad = offCtx.createLinearGradient(0, 0, 0, pHeight)
      vertGrad.addColorStop(0, `hsla(${hue}, 90%, 65%, 0)`)
      vertGrad.addColorStop(0.12, `hsla(${hue}, 90%, 65%, 0.45)`)
      vertGrad.addColorStop(0.5, `hsla(${hue}, 90%, 70%, 0.85)`)
      vertGrad.addColorStop(0.88, `hsla(${hue}, 90%, 65%, 0.45)`)
      vertGrad.addColorStop(1, `hsla(${hue}, 90%, 65%, 0)`)

      offCtx.fillStyle = vertGrad
      offCtx.fillRect(0, 0, pWidth, pHeight)

      // Step 2: Gaussian Lateral Curve (Smooth exponential decay across width)
      offCtx.globalCompositeOperation = "destination-in"
      const horizGrad = offCtx.createLinearGradient(0, 0, pWidth, 0)
      horizGrad.addColorStop(0, "rgba(0,0,0,0)")
      horizGrad.addColorStop(0.2, "rgba(0,0,0,0.12)")
      horizGrad.addColorStop(0.4, "rgba(0,0,0,0.65)")
      horizGrad.addColorStop(0.5, "rgba(0,0,0,1.0)")
      horizGrad.addColorStop(0.6, "rgba(0,0,0,0.65)")
      horizGrad.addColorStop(0.8, "rgba(0,0,0,0.12)")
      horizGrad.addColorStop(1, "rgba(0,0,0,0)")

      offCtx.fillStyle = horizGrad
      offCtx.fillRect(0, 0, pWidth, pHeight)

      // Step 3: Intense White-Hot Radiant Core Spine down the center
      offCtx.globalCompositeOperation = "lighter"
      const coreGrad = offCtx.createLinearGradient(pWidth * 0.44, 0, pWidth * 0.56, 0)
      coreGrad.addColorStop(0, "rgba(255, 255, 255, 0)")
      coreGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.95)")
      coreGrad.addColorStop(1, "rgba(255, 255, 255, 0)")

      offCtx.fillStyle = coreGrad
      offCtx.fillRect(pWidth * 0.44, pHeight * 0.08, pWidth * 0.12, pHeight * 0.84)

      this.pillarCanvases[hue] = offCanvas
    }
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

    this._preRenderPillars()
    this._initPillars()
    this._initCrystals()
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

      // Fast mouse movement scatters sparkling diamond dust
      if (this.mouse.speed > 7 && this.sparkles.length < 45) {
        const hues = this._getHuesForMode()
        const hue = hues[Math.floor(Math.random() * hues.length)]
        this.sparkles.push({
          x: mx + (Math.random() - 0.5) * 25,
          y: my + (Math.random() - 0.5) * 25,
          vx: this.mouse.vx * 0.12 + (Math.random() - 0.5) * 1.2,
          vy: this.mouse.vy * 0.12 - 0.8 - Math.random() * 1.0,
          size: 1.2 + Math.random() * 2.2,
          life: 1.0,
          decay: 0.02 + Math.random() * 0.02,
          hue,
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
      this.rafId = requestAnimationFrame(loop)
      if (document.visibilityState === "hidden") return
      this.animate(time)
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

    window.removeEventListener("mousemove", this.handleMouseMove)
    window.removeEventListener("mouseout", this.handleMouseLeave)

    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height)
    }
    this.canvas.style.display = "none"
    this.pillars = []
    this.crystals = []
    this.sparkles = []
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this.handleResize)
    document.removeEventListener("visibilitychange", this.handleVisibilityChange)
    this.pillarCanvases = {}
  }

  /* -------------------------------------------------------------------------- */
  /*                      INIT MULTI-DEPTH PILLARS & CRYSTALS                   */
  /* -------------------------------------------------------------------------- */

  _initPillars() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    this.pillars = []
    const count = Math.max(16, Math.min(28, Math.floor(W / 80)))

    for (let i = 0; i < count; i++) {
      // 3 Depth Strata Z ∈ [0.2, 1.0]
      let z
      const roll = Math.random()
      if (roll < 0.35) z = 0.2 + Math.random() * 0.25 // Far: soft background mist columns
      else if (roll < 0.75) z = 0.45 + Math.random() * 0.3 // Mid: classic shimmering pillars
      else z = 0.75 + Math.random() * 0.25 // Near: brilliant, towering, white-hot

      // Horizontal spacing with organic jitter
      const x = (i / count) * W + (Math.random() - 0.5) * (W / count * 0.9)
      const width = (45 + Math.random() * 75) * (0.6 + z * 0.7)
      // Generous towering height extending gracefully beyond screen boundaries
      const height = H * (1.3 + Math.random() * 0.6) * (0.8 + z * 0.3)
      // Anchor position centered vertically to allow full top & bottom soft fade
      const y = -height * 0.25 + (Math.random() - 0.5) * (H * 0.2)

      const pillar = {
        id: i,
        z,
        x,
        baseX: x,
        y,
        width,
        height,
        driftSpeed: (Math.random() - 0.5) * 0.08 * (0.5 + z * 0.6),
        baseAlpha: (0.2 + Math.random() * 0.4) * (0.55 + z * 0.6),
        currentAlpha: 0,
        // Atmospheric shimmer & wave
        shimmerPhase: Math.random() * Math.PI * 2,
        shimmerSpeed: 0.012 + Math.random() * 0.02,
        wavePhase: Math.random() * Math.PI * 2,
        waveSpeed: 0.006 + Math.random() * 0.01,
        // Thermal / Mouse pulse resonance
        pulseIntensity: 0,
        displaceX: 0,
      }

      this._applyPillarPalette(pillar, this.palette)
      this.pillars.push(pillar)
    }

    // Sort pillars depth-wise so distant ones render behind
    this.pillars.sort((a, b) => a.z - b.z)
  }

  _initCrystals() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    this.crystals = []
    const count = Math.max(75, Math.min(160, Math.floor(W / 16)))

    for (let i = 0; i < count; i++) {
      const z = 0.2 + Math.random() * 0.8
      this.crystals.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z,
        size: (1.0 + Math.random() * 2.6) * (0.5 + z * 0.7),
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.15 - Math.random() * 0.35 * (0.5 + z * 0.6), // Gentle upward thermal float
        pitch: Math.random() * Math.PI * 2,
        pitchSpeed: 0.015 + Math.random() * 0.03,
        roll: Math.random() * Math.PI * 2,
        rollSpeed: 0.02 + Math.random() * 0.035,
        baseAlpha: 0.25 + Math.random() * 0.55,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.03 + Math.random() * 0.05,
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

    // 1. Update Light Pillars
    for (let i = 0; i < this.pillars.length; i++) {
      const p = this.pillars[i]

      // Slow atmospheric drift
      p.x += p.driftSpeed * dt
      if (p.x < -p.width) p.x = W + p.width
      else if (p.x > W + p.width) p.x = -p.width

      // Shimmer & thermal breathing
      p.shimmerPhase += p.shimmerSpeed * dt
      p.wavePhase += p.waveSpeed * dt
      const shimmerFactor = 0.75 + 0.25 * Math.sin(p.shimmerPhase)
      p.currentAlpha = p.baseAlpha * shimmerFactor * (1 + p.pulseIntensity * 0.55)

      // Mouse Proximity: Triggers vertical light resonance in nearby pillar column
      if (mouseActive) {
        const distToCol = Math.abs(this.mouse.x - p.x)
        const reactRadius = p.width * 1.6
        if (distToCol < reactRadius) {
          const proximity = 1 - distToCol / reactRadius
          p.pulseIntensity = Math.min(1.0, p.pulseIntensity + proximity * 0.14 * dt)
          // Gentle lateral cushion deflection away from cursor
          const pushSign = this.mouse.x > p.x ? -1 : 1
          p.displaceX += (pushSign * proximity * 15 * p.z - p.displaceX) * 0.1 * dt
        } else {
          p.pulseIntensity = Math.max(0, p.pulseIntensity - 0.03 * dt)
          p.displaceX *= Math.pow(0.92, dt)
        }
      } else {
        p.pulseIntensity = Math.max(0, p.pulseIntensity - 0.03 * dt)
        p.displaceX *= Math.pow(0.92, dt)
      }
    }

    // 2. Update Hexagonal Ice Crystals
    const thermalRadius = 150

    for (let i = 0; i < this.crystals.length; i++) {
      const c = this.crystals[i]

      // 3D Tumbling
      c.pitch += c.pitchSpeed * dt
      c.roll += c.rollSpeed * dt
      c.twinklePhase += c.twinkleSpeed * dt

      // Thermal convection from mouse cursor (warm updraft)
      let updraftVx = 0
      let updraftVy = 0

      if (mouseActive) {
        const dx = c.x - this.mouse.x
        const dy = c.y - this.mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < thermalRadius && dist > 1) {
          const power = Math.pow((thermalRadius - dist) / thermalRadius, 1.2) * 2.5 * c.z
          updraftVx = (dx / dist) * power * 0.8
          updraftVy = -power * 1.2
        }
      }

      c.x += (c.vx + updraftVx) * dt
      c.y += (c.vy + updraftVy) * dt

      // Seamless boundaries
      if (c.y < -30) {
        c.y = H + 30
        c.x = Math.random() * W
      } else if (c.y > H + 40) {
        c.y = -20
      }
      if (c.x < -30) c.x = W + 20
      else if (c.x > W + 30) c.x = -20
    }

    // 3. Update Sparkling Diamond Dust Particles
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const sp = this.sparkles[i]
      sp.x += sp.vx * dt
      sp.y += sp.vy * dt
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

  /**
   * Renders volumetric light pillars with seamless 2D Gaussian falloff.
   * Completely eliminates harsh box cuts and achieves cinematic depth.
   */
  _renderPillars(ctx) {
    const time = performance.now()

    for (let i = 0; i < this.pillars.length; i++) {
      const p = this.pillars[i]
      const offCanvas = this.pillarCanvases[p.hue]
      if (!offCanvas) continue

      // Subtle atmospheric harmonic waver along X
      const waveX = Math.sin(p.wavePhase + time * 0.0006) * 6
      const posX = p.x + waveX + p.displaceX

      ctx.save()
      ctx.globalAlpha = Math.min(0.95, p.currentAlpha)

      // Draw volumetric 2D Gaussian light pillar
      ctx.drawImage(offCanvas, posX - p.width * 0.5, p.y, p.width, p.height)

      // Intense resonant filament for high-energy foreground pillars
      if (p.z > 0.5 && p.pulseIntensity > 0.3) {
        ctx.globalAlpha = Math.min(0.85, p.currentAlpha * p.pulseIntensity * p.z)
        ctx.drawImage(offCanvas, posX - p.width * 0.25, p.y, p.width * 0.5, p.height)
      }

      ctx.restore()
    }
  }

  /**
   * Renders a tumbling hexagonal diamond dust crystal with specular facet reflection.
   */
  _renderCrystal(c, ctx) {
    const s = c.size
    const z = c.z

    const scaleX = Math.cos(c.roll)
    const scaleY = Math.cos(c.pitch)

    const facetNormalAlignment = Math.abs(Math.sin(c.pitch) * Math.sin(c.roll))
    const specularFlash = Math.pow(facetNormalAlignment, 3.5)

    const twinkle = (Math.sin(c.twinklePhase) + 1) * 0.5
    const alpha = Math.max(0.08, Math.min(1, (c.baseAlpha * 0.6 + specularFlash * 0.85 + twinkle * 0.35) * z))

    ctx.save()
    ctx.translate(c.x, c.y)
    ctx.scale(Math.max(0.18, Math.abs(scaleX)), Math.max(0.18, Math.abs(scaleY)))
    ctx.globalAlpha = alpha

    // Hexagonal geometry
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3
      const hx = Math.cos(angle) * s
      const hy = Math.sin(angle) * s
      if (i === 0) ctx.moveTo(hx, hy)
      else ctx.lineTo(hx, hy)
    }
    ctx.closePath()

    ctx.fillStyle = specularFlash > 0.35 ? "#ffffff" : `hsl(${this.palette.hsl.h}, 85%, 92%)`
    ctx.fill()

    // 4-Point Star Glint for brilliant crystal facets
    if (z > 0.65 && s > 1.8 && specularFlash > 0.4) {
      const spike = s * 3.0 * specularFlash
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)"
      ctx.lineWidth = Math.max(0.6, 0.85 * z)
      ctx.beginPath()
      ctx.moveTo(-spike, 0)
      ctx.lineTo(spike, 0)
      ctx.moveTo(0, -spike)
      ctx.lineTo(0, spike)
      ctx.stroke()
    }

    ctx.restore()
  }

  _renderSparkles(ctx) {
    for (let i = 0; i < this.sparkles.length; i++) {
      const sp = this.sparkles[i]
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, sp.life))
      ctx.fillStyle = `hsl(${sp.hue}, 95%, 85%)`

      const r = sp.size
      ctx.beginPath()
      ctx.moveTo(sp.x, sp.y - r * 2.0)
      ctx.lineTo(sp.x + r * 0.4, sp.y - r * 0.4)
      ctx.lineTo(sp.x + r * 2.0, sp.y)
      ctx.lineTo(sp.x + r * 0.4, sp.y + r * 0.4)
      ctx.lineTo(sp.x, sp.y + r * 2.0)
      ctx.lineTo(sp.x - r * 0.4, sp.y + r * 0.4)
      ctx.lineTo(sp.x - r * 2.0, sp.y)
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

    // Delta-time normalization (smooth on 60Hz, 120Hz, 144Hz, 240Hz)
    const rawElapsed = this.lastTime ? timestamp - this.lastTime : 16.67
    this.lastTime = timestamp
    const dt = Math.min(Math.max(rawElapsed / (1000 / 60), 0.1), 3.0)

    // Physics update step
    this._update(dt)

    // Clear Canvas
    this.ctx.clearRect(0, 0, this.width, this.height)

    // Optical Additive Blending (Screen / Lighter for ethereal aurora brilliance)
    this.ctx.globalCompositeOperation = "lighter"

    // 1. Render Light Pillars (Seamless 2D Gaussian Volumetric Light Beams)
    this._renderPillars(this.ctx)

    // 2. Render Hexagonal Ice Crystals
    for (let i = 0; i < this.crystals.length; i++) {
      this._renderCrystal(this.crystals[i], this.ctx)
    }

    // 3. Render Interactive Diamond Dust Sparkles
    if (this.sparkles.length > 0) {
      this._renderSparkles(this.ctx)
    }
  }
}


