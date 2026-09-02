/**
 * PixelWeatherEffect — Authentic 8-Bit Retro Pixel Weather Engine
 *
 * Implements:
 *  1. Pure 8-Bit Chunky Pixel Grid Snap: Crisp, pixel-aligned rendering without
 *     blurry fractional subpixels or smoothing.
 *  2. Classic 8-Bit NES / Arcade Visuals:
 *     - Snow: 8-bit cross stars, hex flakes, and twinkling pixel dust (NO ground accumulation).
 *     - Rain: Stepped 8-bit rain streaks with retro splash-pop impact frames.
 *     - Storm: Stepped 8-bit storm clouds, jagged orthogonal pixel lightning, and multi-frame strobe flashes.
 *     - Wind: 8-bit wind dashes and 4-frame rotating 8-bit autumn leaves.
 *  3. 3-Color Quantized 8-Bit Palettes (NES / Famicom inspired).
 *  4. 60Hz - 240Hz Delta Normalization & Retina High-DPI Scaling.
 *  5. Mouse Interaction: 8-bit wind gusts and click-triggered 8-bit thunderbolt strikes.
 *  6. Full Startpage Settings Compatibility: setMode(mode), setOptions(opts).
 */

// 8-Bit Handcrafted Pixel Sprites (1 = highlight/white, 2 = main/cyan/leaf, 3 = shadow/outline)
const SNOW_SPRITES = [
  // 0: Classic 8-Bit Snowflake (5x5)
  {
    w: 5,
    h: 5,
    grid: [
      0, 1, 0, 1, 0,
      1, 2, 1, 2, 1,
      0, 1, 1, 1, 0,
      1, 2, 1, 2, 1,
      0, 1, 0, 1, 0,
    ],
  },
  // 1: 8-Bit Cross Star (3x3)
  {
    w: 3,
    h: 3,
    grid: [
      0, 1, 0,
      1, 1, 1,
      0, 1, 0,
    ],
  },
  // 2: 8-Bit Chunky Flake (2x2)
  {
    w: 2,
    h: 2,
    grid: [
      1, 1,
      1, 1,
    ],
  },
  // 3: 8-Bit Diamond Star (3x3)
  {
    w: 3,
    h: 3,
    grid: [
      0, 1, 0,
      1, 2, 1,
      0, 1, 0,
    ],
  },
]

// 8-Bit Autumn Leaf Sprites (5x5) with 4 Discrete Rotation Frames
const LEAF_SPRITES = [
  // Frame 0: Upright Leaf
  {
    w: 5,
    h: 5,
    grid: [
      0, 0, 1, 0, 0,
      0, 1, 2, 1, 0,
      1, 2, 2, 2, 1,
      0, 1, 3, 1, 0,
      0, 0, 3, 0, 0,
    ],
  },
  // Frame 1: Tilted 45°
  {
    w: 5,
    h: 5,
    grid: [
      0, 0, 0, 1, 0,
      0, 0, 2, 2, 1,
      0, 2, 2, 2, 0,
      1, 2, 3, 0, 0,
      0, 3, 0, 0, 0,
    ],
  },
  // Frame 2: Horizontal 90°
  {
    w: 5,
    h: 5,
    grid: [
      0, 0, 1, 0, 0,
      0, 1, 2, 1, 0,
      3, 3, 2, 2, 1,
      0, 1, 2, 1, 0,
      0, 0, 1, 0, 0,
    ],
  },
  // Frame 3: Inverted 180°
  {
    w: 5,
    h: 5,
    grid: [
      0, 0, 3, 0, 0,
      0, 1, 3, 1, 0,
      1, 2, 2, 2, 1,
      0, 1, 2, 1, 0,
      0, 0, 1, 0, 0,
    ],
  },
]

// NES 3-Color Leaf Palettes (Highlight, Main, Shadow)
const NES_LEAF_PALETTES = [
  { hi: "#ffb847", main: "#e04f26", sh: "#851c0e" }, // Maple Red
  { hi: "#ffe066", main: "#f7931e", sh: "#9c4d08" }, // Amber Gold
  { hi: "#ffaa5e", main: "#d94819", sh: "#781804" }, // Russet Orange
  { hi: "#b8e986", main: "#6fa832", sh: "#3b6912" }, // Autumn Olive
]

export class PixelWeatherEffect {
  constructor(canvasId, mode = "snow") {
    this.canvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId

    if (!this.canvas) {
      console.warn(`[PixelWeatherEffect] Canvas "${canvasId}" not found.`)
      return
    }

    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.destroyed = false
    this.rafId = null

    // Configuration
    this.mode = mode // 'snow', 'rain', 'wind', 'storm'
    this.resFactor = 1
    this.speedMul = 1.0
    this.sizeMul = 1.0
    this.densityMul = 1.0

    // Timing & DPR
    this.lastTime = 0
    this.dpr = 1
    this.width = 0
    this.height = 0

    // Simulation Entities
    this.particles = []
    this.splashes = []
    this.clouds = []
    this.windDashes = []

    // 8-Bit Lightning
    this.lightning = {
      active: false,
      timer: 0,
      maxTimer: 12,
      strobe: 0,
      segments: [],
    }
    this.stormWind = 0
    this.gustTimer = 0
    this.nextLightningTime = performance.now() + 3500 + Math.random() * 4000

    // Mouse Interaction
    this.mouse = {
      x: -2000,
      y: -2000,
      lastX: -2000,
      lastY: -2000,
      vx: 0,
      vy: 0,
      active: false,
    }

    // Event Handlers
    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this.handleMouseMove(e)
    this._mouseLeaveHandler = () => this.handleMouseLeave()
    this._clickHandler = (e) => this.handleClick(e)
    this._visibilityHandler = () => this.handleVisibilityChange()

    window.addEventListener("resize", this._resizeHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)
    this.resize()
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

    this._buildParticles()
    this._buildClouds()
    this._buildWindDashes()
  }

  setMode(mode) {
    const valid = ["snow", "rain", "wind", "storm"]
    if (!valid.includes(mode)) mode = "snow"

    if (this.mode !== mode) {
      this.mode = mode
      this.splashes = []
      this.stormWind = 0
      this.lightning.active = false
      this._buildParticles()
      this._buildClouds()
      this._buildWindDashes()
    }
  }

  setOptions(opts = {}) {
    let rebuild = false
    if (opts.density !== undefined && opts.density !== this.densityMul) {
      this.densityMul = opts.density
      rebuild = true
    }
    if (opts.resolution !== undefined && opts.resolution !== this.resFactor) {
      this.resFactor = opts.resolution
    }
    if (opts.speed !== undefined) this.speedMul = opts.speed
    if (opts.size !== undefined && opts.size !== this.sizeMul) {
      this.sizeMul = opts.size
    }

    if (rebuild) {
      this._buildParticles()
      this._buildClouds()
      this._buildWindDashes()
    }
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    const curX = e.clientX - rect.left
    const curY = e.clientY - rect.top

    if (this.mouse.lastX > -1000) {
      this.mouse.vx = (curX - this.mouse.lastX) * 0.4
      this.mouse.vy = (curY - this.mouse.lastY) * 0.4
    }
    this.mouse.lastX = curX
    this.mouse.lastY = curY
    this.mouse.x = curX
    this.mouse.y = curY
    this.mouse.active = true
  }

  handleMouseLeave() {
    this.mouse.x = -2000
    this.mouse.y = -2000
    this.mouse.lastX = -2000
    this.mouse.lastY = -2000
    this.mouse.vx = 0
    this.mouse.vy = 0
    this.mouse.active = false
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top

    // 1. Storm / Rain: Strike 8-bit pixel lightning at click position
    if (this.mode === "storm" || this.mode === "rain") {
      this._triggerLightning(cx, cy)
    }

    // 2. Snow: 8-bit radial gust pushing snowflakes away
    if (this.mode === "snow") {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i]
        const dx = p.x - cx
        const dy = p.y - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 160) {
          const force = (1 - dist / 160) * 10
          p.vx += (dx / (dist || 1)) * force
          p.vy += (dy / (dist || 1)) * force - 3
        }
      }
    }

    // 3. Wind: Spawn burst of 8-bit leaves
    if (this.mode === "wind") {
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2
        const spd = 3 + Math.random() * 6
        this.particles.push({
          type: "leaf",
          palette: NES_LEAF_PALETTES[Math.floor(Math.random() * NES_LEAF_PALETTES.length)],
          x: cx,
          y: cy,
          size: 1.2,
          vx: Math.cos(angle) * spd + 4,
          vy: Math.sin(angle) * spd - 1.5,
          frame: Math.floor(Math.random() * 4),
          frameTimer: 0,
          frameSpeed: 0.15 + Math.random() * 0.1,
          wobblePhase: Math.random() * Math.PI * 2,
        })
      }
    }
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
    this.nextLightningTime = performance.now() + 2500 + Math.random() * 3500

    this.canvas.style.display = "block"
    this.resize()

    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseout", this._mouseLeaveHandler, { passive: true })
    window.addEventListener("click", this._clickHandler, { passive: true })

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

    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseout", this._mouseLeaveHandler)
    window.removeEventListener("click", this._clickHandler)

    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height)
    }
    this.canvas.style.display = "none"
    this.particles = []
    this.splashes = []
    this.clouds = []
    this.windDashes = []
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  /* -------------------------------------------------------------------------- */
  /*                      8-BIT ENTITY BUILDERS & SPAWNERS                      */
  /* -------------------------------------------------------------------------- */

  _buildClouds() {
    this.clouds = []
    if (this.mode !== "storm" && this.mode !== "rain") return

    const W = this.width || window.innerWidth
    const count = this.mode === "storm" ? 5 : 3

    for (let i = 0; i < count; i++) {
      const w = 160 + Math.random() * 200
      const h = 40 + Math.random() * 45
      this.clouds.push({
        x: (i * (W / count)) + (Math.random() - 0.5) * 80,
        y: 10 + Math.random() * 50,
        w,
        h,
        speed: (0.5 + Math.random() * 0.5) * (this.mode === "storm" ? 1.4 : 0.8),
      })
    }
  }

  _buildWindDashes() {
    this.windDashes = []
    if (this.mode !== "wind" && this.mode !== "storm") return

    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight
    const count = Math.floor(16 * this.densityMul)

    for (let i = 0; i < count; i++) {
      this.windDashes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        len: 24 + Math.random() * 40,
        speed: 10 + Math.random() * 14,
        yStep: (Math.random() - 0.5) * 1.5,
      })
    }
  }

  _buildParticles() {
    this.particles = []
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    let baseCount = 140
    if (this.mode === "rain") baseCount = 200
    if (this.mode === "storm") baseCount = 320
    if (this.mode === "wind") baseCount = 130
    if (this.mode === "snow") baseCount = 220

    const count = Math.floor(baseCount * this.densityMul)
    for (let i = 0; i < count; i++) {
      this.particles.push(this._makeParticle(W, H, true))
    }
  }

  _makeParticle(W, H, initial = false) {
    const margin = 100

    // 1. SNOW PARTICLES (8-Bit NES Sprites)
    if (this.mode === "snow") {
      const spriteIdx = Math.floor(Math.random() * SNOW_SPRITES.length)
      const sprite = SNOW_SPRITES[spriteIdx]
      // 3 Layers: 0 (Far), 1 (Mid), 2 (Near)
      const layer = Math.random() < 0.3 ? 0 : Math.random() < 0.75 ? 1 : 2

      return {
        type: "snow",
        sprite,
        spriteIdx,
        x: Math.random() * (W + margin * 2) - margin,
        y: initial ? Math.random() * H : -20 - Math.random() * 50,
        layer,
        size: layer === 0 ? 1 : layer === 1 ? 1.4 : 1.8,
        vx: (Math.random() - 0.5) * 0.6,
        vy: layer === 0 ? 0.9 : layer === 1 ? 1.5 : 2.2,
        twinkleTimer: Math.random() * 10,
        twinkleSpeed: 0.05 + Math.random() * 0.08,
        frame: 0,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.03 + Math.random() * 0.03,
      }
    }

    // 2. RAIN PARTICLES (8-Bit Stepped Streaks)
    if (this.mode === "rain" || this.mode === "storm") {
      const isStorm = this.mode === "storm"
      const layer = Math.random() < 0.35 ? 0 : 1 // Far / Near

      return {
        type: "rain",
        x: Math.random() * (W + margin * 2) - margin,
        y: initial ? Math.random() * H : -30 - Math.random() * 80,
        layer,
        // Stepped length (number of pixel steps)
        steps: (isStorm ? 5 : 3) + Math.floor(Math.random() * (isStorm ? 4 : 3)),
        vx: isStorm ? -6 + (Math.random() - 0.5) * 2 : -2,
        vy: (isStorm ? 22 : 15) + Math.random() * 6,
      }
    }

    // 3. WIND & AUTUMN LEAF PARTICLES (8-Bit 4-Frame Sprites)
    if (this.mode === "wind") {
      const isLeaf = Math.random() < 0.7
      if (isLeaf) {
        return {
          type: "leaf",
          palette: NES_LEAF_PALETTES[Math.floor(Math.random() * NES_LEAF_PALETTES.length)],
          x: initial ? Math.random() * (W + 100) - 50 : -40,
          y: Math.random() * H,
          size: 1.2 + Math.random() * 0.4,
          vx: 5 + Math.random() * 8,
          vy: 0.6 + Math.random() * 1.6,
          frame: Math.floor(Math.random() * 4),
          frameTimer: 0,
          frameSpeed: 0.08 + Math.random() * 0.08,
          wobblePhase: Math.random() * Math.PI * 2,
        }
      } else {
        // Wind pixel dot streak
        return {
          type: "wind_dot",
          x: initial ? Math.random() * W : -30,
          y: Math.random() * H,
          len: 8 + Math.random() * 16,
          vx: 12 + Math.random() * 14,
          vy: (Math.random() - 0.5) * 1.5,
        }
      }
    }

    return {}
  }

  /* -------------------------------------------------------------------------- */
  /*                       8-BIT PROCEDURAL LIGHTNING                           */
  /* -------------------------------------------------------------------------- */

  _triggerLightning(targetX, targetY) {
    this.lightning.active = true
    this.lightning.timer = 10
    this.lightning.maxTimer = 10
    this.lightning.strobe = 3 // 3 flash pulses
    this.lightning.segments = []

    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    const startX = targetX !== undefined ? targetX + (Math.random() - 0.5) * 60 : Math.random() * W
    const endX = targetX !== undefined ? targetX : startX + (Math.random() - 0.5) * 180
    const endY = targetY !== undefined ? targetY : H - 15

    // Orthogonal 8-bit stepped pixel bolt (Classic NES / Pokemon Thunder)
    let curX = Math.floor(startX / 4) * 4
    let curY = 0
    const stepSize = 12

    while (curY < endY) {
      const nextY = Math.min(endY, curY + stepSize + Math.floor(Math.random() * 8))
      const shiftX = Math.floor((Math.random() - 0.5) * 24 / 4) * 4 + Math.floor((endX - curX) * 0.15 / 4) * 4
      const nextX = curX + shiftX

      // Horizontal step then vertical step (Manhattan 8-bit segments)
      this.lightning.segments.push({ x1: curX, y1: curY, x2: nextX, y2: curY })
      this.lightning.segments.push({ x1: nextX, y1: curY, x2: nextX, y2: nextY })

      // Occasional 8-bit fork branch
      if (Math.random() < 0.35 && this.lightning.segments.length < 32) {
        const forkDir = Math.random() > 0.5 ? 1 : -1
        const forkX = nextX + forkDir * 16
        const forkY = nextY + 14
        this.lightning.segments.push({ x1: nextX, y1: nextY, x2: forkX, y2: nextY })
        this.lightning.segments.push({ x1: forkX, y1: nextY, x2: forkX, y2: forkY })
      }

      curX = nextX
      curY = nextY
    }

    // 8-Bit Ground Splash Spark Burst
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const spd = 3 + Math.random() * 4
      this.splashes.push({
        x: endX,
        y: endY,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 2,
        life: 1.0,
        decay: 0.1,
        color: "#ffffff",
      })
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                PHYSICS STEP                                 */
  /* -------------------------------------------------------------------------- */

  _update(dt) {
    const W = this.width
    const H = this.height
    const now = performance.now()
    const speedMul = this.speedMul

    // 1. Storm Wind & Auto Lightning
    if (this.mode === "storm") {
      this.gustTimer += 0.02 * dt
      this.stormWind = Math.sin(this.gustTimer * 0.8) * 12

      if (!this.lightning.active && now > this.nextLightningTime) {
        this._triggerLightning()
        this.nextLightningTime = now + 3500 + Math.random() * 4500
      }
    }

    // 2. Mouse Deflection
    const mouseActive = this.mouse.active && this.mouse.x > -1000
    const mX = this.mouse.x
    const mY = this.mouse.y
    const mVx = this.mouse.vx
    const mVy = this.mouse.vy

    // 3. Update Particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]

      // Mouse Wind Push
      if (mouseActive) {
        const dx = p.x - mX
        const dy = p.y - mY
        const distSq = dx * dx + dy * dy
        const radius = 100
        if (distSq < radius * radius && distSq > 4) {
          const dist = Math.sqrt(distSq)
          const push = (1 - dist / radius) * 3.5 * dt
          p.x += (dx / dist) * push + mVx * 0.25
          p.y += (dy / dist) * push + mVy * 0.25
        }
      }

      // SNOW PHYSICS (NO ground accumulation!)
      if (p.type === "snow") {
        p.wobblePhase += p.wobbleSpeed * dt
        p.twinkleTimer += p.twinkleSpeed * dt
        p.frame = Math.floor(p.twinkleTimer) % 2 // Alternate between 2 twinkle frames

        const sway = Math.sin(p.wobblePhase) * 0.8
        p.x += (p.vx + sway) * speedMul * dt
        p.y += p.vy * speedMul * dt

        // Recycle cleanly when leaving bottom (NO accumulation)
        if (p.y > H + 20) {
          Object.assign(p, this._makeParticle(W, H, false))
        }
        if (p.x < -40 || p.x > W + 40) {
          Object.assign(p, this._makeParticle(W, H, false))
        }
      }

      // RAIN PHYSICS
      else if (p.type === "rain") {
        const windX = (this.mode === "storm" ? this.stormWind : 0)
        p.x += (p.vx + windX) * speedMul * dt
        p.y += p.vy * speedMul * dt

        // Ground Impact -> Spawn 8-bit splash pop
        if (p.y > H - 15) {
          this.splashes.push({
            type: "rain_impact",
            x: p.x,
            y: H - 8,
            frame: 0,
            frameTimer: 0,
            life: 1.0,
            decay: 0.15,
          })
          Object.assign(p, this._makeParticle(W, H, false))
        }
        if (p.x < -60 || p.x > W + 100) {
          Object.assign(p, this._makeParticle(W, H, false))
        }
      }

      // LEAF PHYSICS (4-Frame 8-bit rotation)
      else if (p.type === "leaf") {
        p.wobblePhase += 0.04 * dt
        p.frameTimer += p.frameSpeed * dt
        if (p.frameTimer >= 1.0) {
          p.frameTimer = 0
          p.frame = (p.frame + 1) % 4
        }

        const lift = Math.sin(p.wobblePhase) * 1.2
        p.x += p.vx * speedMul * dt
        p.y += (p.vy + lift) * speedMul * dt

        if (p.x > W + 40 || p.y > H + 40) {
          Object.assign(p, this._makeParticle(W, H, false))
        }
      }

      // WIND DOTS
      else if (p.type === "wind_dot") {
        p.x += p.vx * speedMul * dt
        p.y += p.vy * speedMul * dt

        if (p.x > W + 40) {
          Object.assign(p, this._makeParticle(W, H, false))
        }
      }
    }

    // 4. Update 8-Bit Splashes
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i]
      if (s.type === "rain_impact") {
        s.frameTimer += dt
        s.frame = Math.min(2, Math.floor(s.frameTimer * 0.3))
        s.life -= s.decay * dt
      } else {
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.vy += 0.4 * dt
        s.life -= s.decay * dt
      }
      if (s.life <= 0) {
        this.splashes.splice(i, 1)
      }
    }

    // 5. Update 8-Bit Clouds
    const cloudWind = this.mode === "storm" ? this.stormWind * 0.12 : 0
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i]
      c.x -= (c.speed + cloudWind) * speedMul * dt
      if (c.x + c.w < -60) {
        c.x = W + 40
      }
    }

    // 6. Update 8-Bit Wind Dashes
    for (let i = 0; i < this.windDashes.length; i++) {
      const w = this.windDashes[i]
      w.x += w.speed * speedMul * dt
      w.y += w.yStep * dt
      if (w.x > W + 60) {
        w.x = -w.len - Math.random() * 60
        w.y = Math.random() * H
      }
    }

    // 7. Update 8-Bit Lightning
    if (this.lightning.active) {
      this.lightning.timer -= dt
      if (this.lightning.timer <= 0) {
        this.lightning.active = false
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                 RENDERING                                  */
  /* -------------------------------------------------------------------------- */

  /**
   * Renders chunky 8-bit stepped storm clouds.
   */
  _renderClouds(ctx, pixelSize) {
    const isLightning = this.lightning.active
    const blockSize = Math.max(4, pixelSize * 2)

    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i]

      // 3-Tone 8-Bit Cloud Colors
      const cBody = isLightning ? "#686b96" : "#222538"
      const cEdge = isLightning ? "#c0d0f5" : "#3b3f5c"
      const cShade = isLightning ? "#454868" : "#161724"

      const stepsX = Math.floor(c.w / blockSize)
      const stepsY = Math.floor(c.h / blockSize)

      for (let ox = 0; ox < stepsX; ox++) {
        for (let oy = 0; oy < stepsY; oy++) {
          const nx = (ox / stepsX) * 2 - 1
          const ny = (oy / stepsY) * 2 - 1
          if (nx * nx + ny * ny <= 1.0) {
            const px = Math.floor((c.x + ox * blockSize) / blockSize) * blockSize
            const py = Math.floor((c.y + oy * blockSize) / blockSize) * blockSize

            if (oy === stepsY - 1) {
              ctx.fillStyle = cShade
            } else if (oy === 0 || ox === 0 || ox === stepsX - 1) {
              ctx.fillStyle = cEdge
            } else {
              ctx.fillStyle = cBody
            }
            ctx.fillRect(px, py, blockSize, blockSize)
          }
        }
      }
    }
  }

  /**
   * Renders 8-bit stepped orthogonal lightning bolts with full-screen flash.
   */
  _renderLightning(ctx, pixelSize) {
    if (!this.lightning.active) return
    const boltSize = Math.max(3, pixelSize)

    ctx.save()
    // Strobe screen flash (Alternates white / dark-purple across frames)
    const flashFrame = Math.floor(this.lightning.timer) % 2
    ctx.fillStyle = flashFrame === 0 ? "rgba(255, 255, 255, 0.25)" : "rgba(85, 75, 135, 0.3)"
    ctx.fillRect(0, 0, this.width, this.height)

    // Cyan 8-Bit Outer Border
    ctx.fillStyle = "#70e0ff"
    for (let i = 0; i < this.lightning.segments.length; i++) {
      const s = this.lightning.segments[i]
      const minX = Math.min(s.x1, s.x2) - boltSize
      const maxX = Math.max(s.x1, s.x2) + boltSize
      const minY = Math.min(s.y1, s.y2) - boltSize
      const maxY = Math.max(s.y1, s.y2) + boltSize
      ctx.fillRect(minX, minY, Math.max(boltSize * 2, maxX - minX), Math.max(boltSize * 2, maxY - minY))
    }

    // Pure White 8-Bit Core Channel
    ctx.fillStyle = "#ffffff"
    for (let i = 0; i < this.lightning.segments.length; i++) {
      const s = this.lightning.segments[i]
      const minX = Math.min(s.x1, s.x2)
      const maxX = Math.max(s.x1, s.x2)
      const minY = Math.min(s.y1, s.y2)
      const maxY = Math.max(s.y1, s.y2)
      ctx.fillRect(minX, minY, Math.max(boltSize, maxX - minX), Math.max(boltSize, maxY - minY))
    }

    ctx.restore()
  }

  /**
   * Renders 8-bit wind dashes gliding across screen.
   */
  _renderWindDashes(ctx, pixelSize) {
    ctx.save()
    const pSize = Math.max(2, pixelSize)
    ctx.fillStyle = "#bfe3ff"

    for (let i = 0; i < this.windDashes.length; i++) {
      const w = this.windDashes[i]
      const dashSteps = Math.floor(w.len / (pSize * 2))

      for (let s = 0; s < dashSteps; s++) {
        // Dash pattern: 2 pixels on, 1 pixel off
        if (s % 3 !== 2) {
          const px = Math.floor((w.x + s * pSize * 2) / pSize) * pSize
          const py = Math.floor(w.y / pSize) * pSize
          ctx.fillRect(px, py, pSize * 2, pSize)
        }
      }
    }
    ctx.restore()
  }

  /**
   * Main animation loop executing 8-bit pixel rendering.
   */
  animate(timestamp = 0) {
    if (!this.active || this.destroyed) return

    const rawElapsed = this.lastTime ? timestamp - this.lastTime : 16.67
    this.lastTime = timestamp
    const dt = Math.min(Math.max(rawElapsed / (1000 / 60), 0.1), 3.0)

    this._update(dt)

    const ctx = this.ctx
    const W = this.width
    const H = this.height

    // Grid snap size based on user resolution & size sliders
    const pixelSize = Math.max(2, Math.floor(2.2 * this.resFactor * this.sizeMul))

    // Clear Transparent Canvas over Wallpaper
    ctx.clearRect(0, 0, W, H)

    // 1. Render 8-Bit Clouds & Lightning
    if (this.mode === "storm" || this.mode === "rain") {
      this._renderClouds(ctx, pixelSize)
      this._renderLightning(ctx, pixelSize)
    }

    // 2. Render 8-Bit Wind Dashes
    if (this.mode === "wind" || this.mode === "storm") {
      this._renderWindDashes(ctx, pixelSize)
    }

    // 3. Render 8-Bit Particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]

      // --- 3A. 8-BIT SNOW PARTICLES ---
      if (p.type === "snow") {
        const sprite = p.sprite
        const pScale = Math.max(1, Math.floor(p.size * pixelSize))
        const gx = Math.floor(p.x / pScale) * pScale
        const gy = Math.floor(p.y / pScale) * pScale

        const startX = gx - Math.floor((sprite.w * pScale) / 2)
        const startY = gy - Math.floor((sprite.h * pScale) / 2)

        // 8-Bit Palette (White, Ice-Cyan, Shadow)
        const c1 = "#ffffff"
        const c2 = p.layer === 0 ? "#85c5eb" : "#bce6ff"

        for (let py = 0; py < sprite.h; py++) {
          for (let px = 0; px < sprite.w; px++) {
            const cell = sprite.grid[py * sprite.w + px]
            if (cell === 1) {
              ctx.fillStyle = c1
              ctx.fillRect(startX + px * pScale, startY + py * pScale, pScale, pScale)
            } else if (cell === 2 && p.frame === 0) {
              ctx.fillStyle = c2
              ctx.fillRect(startX + px * pScale, startY + py * pScale, pScale, pScale)
            }
          }
        }
      }

      // --- 3B. 8-BIT RAIN DROP STREAKS ---
      else if (p.type === "rain") {
        const pScale = Math.max(2, Math.floor(pixelSize * 0.9))
        const gx = Math.floor(p.x / pScale) * pScale
        const gy = Math.floor(p.y / pScale) * pScale
        const isStorm = this.mode === "storm"
        const slant = isStorm ? 2 : 1

        for (let s = 0; s < p.steps; s++) {
          const stepX = gx + s * pScale * slant
          const stepY = gy - s * pScale * 2

          // Head pixel is white, tail pixels are cyan
          ctx.fillStyle = s === 0 ? "#ffffff" : "#7ec8f8"
          ctx.fillRect(stepX, stepY, pScale, pScale * 2)
        }
      }

      // --- 3C. 8-BIT AUTUMN LEAF (4-Frame Rotation) ---
      else if (p.type === "leaf") {
        const sprite = LEAF_SPRITES[p.frame]
        const pScale = Math.max(2, Math.floor(p.size * pixelSize))
        const gx = Math.floor(p.x / pScale) * pScale
        const gy = Math.floor(p.y / pScale) * pScale

        const startX = gx - Math.floor((sprite.w * pScale) / 2)
        const startY = gy - Math.floor((sprite.h * pScale) / 2)

        const pal = p.palette

        for (let py = 0; py < sprite.h; py++) {
          for (let px = 0; px < sprite.w; px++) {
            const cell = sprite.grid[py * sprite.w + px]
            if (cell === 1) {
              ctx.fillStyle = pal.hi
              ctx.fillRect(startX + px * pScale, startY + py * pScale, pScale, pScale)
            } else if (cell === 2) {
              ctx.fillStyle = pal.main
              ctx.fillRect(startX + px * pScale, startY + py * pScale, pScale, pScale)
            } else if (cell === 3) {
              ctx.fillStyle = pal.sh
              ctx.fillRect(startX + px * pScale, startY + py * pScale, pScale, pScale)
            }
          }
        }
      }

      // --- 3D. 8-BIT WIND DOT ---
      else if (p.type === "wind_dot") {
        const pScale = Math.max(2, pixelSize)
        const gx = Math.floor(p.x / pScale) * pScale
        const gy = Math.floor(p.y / pScale) * pScale
        ctx.fillStyle = "#e0f2fe"
        ctx.fillRect(gx, gy, pScale * 4, pScale)
      }
    }

    // 4. Render 8-Bit Splashes
    for (let i = 0; i < this.splashes.length; i++) {
      const s = this.splashes[i]
      const pScale = Math.max(2, pixelSize)
      const gx = Math.floor(s.x / pScale) * pScale
      const gy = Math.floor(s.y / pScale) * pScale

      if (s.type === "rain_impact") {
        ctx.fillStyle = "#ffffff"
        if (s.frame === 0) {
          // 8-bit Pop `*`
          ctx.fillRect(gx, gy, pScale, pScale)
          ctx.fillRect(gx - pScale, gy - pScale, pScale, pScale)
          ctx.fillRect(gx + pScale, gy - pScale, pScale, pScale)
        } else if (s.frame === 1) {
          // 8-bit Dual Bounce
          ctx.fillRect(gx - pScale * 2, gy - pScale * 2, pScale, pScale)
          ctx.fillRect(gx + pScale * 2, gy - pScale * 2, pScale, pScale)
        } else {
          // 8-bit Ripple Line
          ctx.fillRect(gx - pScale * 2, gy, pScale * 5, pScale)
        }
      } else {
        // Spark pixel
        ctx.fillStyle = s.color || "#ffffff"
        ctx.fillRect(gx, gy, pScale, pScale)
      }
    }
  }
}

