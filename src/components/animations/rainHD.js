/**
 * RainHD — Realistic multi-layer falling rain with bounce-splash effect.
 *
 * Features:
 *  - Three depth layers (background / mid / foreground) with different speed,
 *    length, width and opacity to create a strong sense of depth.
 *  - Motion-blur gradient streaks: transparent at the tail, opaque at the head.
 *  - Smooth wind drift that slowly shifts direction over time.
 *  - Impact splashes at the bottom: expanding elliptical ripple rings +
 *    ballistic bounce droplets that arc up and fall back down.
 *  - Ambient puddle ripples along the bottom edge.
 *  - Subtle rain-mist veil and a glistening ground-water strip.
 */
export class RainHDEffect {
  constructor(canvasId, color = "#99ccff", options = {}) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this._r = 153
    this._g = 204
    this._b = 255

    this.drops = []
    this.splashes = [] // rings + bounce particles from impacts
    this.puddles = [] // ambient ground-level ripples

    // Lightning state
    this.lightning = null // active bolt object, null when idle
    this.lightningTimer = this._nextLightningDelay()

    this.fps = options.targetFps ?? 42
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this.time = 0
    this.renderScale = options.renderScale ?? 0.78
    this.densityScale = options.densityScale ?? 0.68
    this.splashScale = options.splashScale ?? 0.58

    // Wind (horizontal velocity multiplier, leans drops to the right)
    this.windX = 1.6
    this._windTarget = 1.6

    this._parseColor(color)
    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  _parseColor(hex) {
    const c = hex.replace("#", "")
    this._r = parseInt(c.substring(0, 2), 16)
    this._g = parseInt(c.substring(2, 4), 16)
    this._b = parseInt(c.substring(4, 6), 16)
    this._layerStroke = RainHDEffect.LAYERS.map((layer) => {
      const alpha = ((layer[4] + layer[5]) / 2).toFixed(3)
      return `rgba(${this._r},${this._g},${this._b},${alpha})`
    })
    this._layerHeadStroke = RainHDEffect.LAYERS.map((layer) => {
      const alpha = Math.min(0.72, layer[5] * 0.95).toFixed(3)
      return `rgba(${Math.min(255, this._r + 48)},${Math.min(255, this._g + 34)},${Math.min(255, this._b + 24)},${alpha})`
    })
  }

  // ── Layer definitions ────────────────────────────────────────────────────
  // Each entry: [speedMin, speedMax, lenMin, lenMax, opMin, opMax, windFactor, lineWidth]
  static LAYERS = [
    [7, 12, 12, 22, 0.055, 0.13, 0.35, 0.55], // 0 bg  — small, slow, faint
    [15, 24, 24, 42, 0.16, 0.32, 0.72, 0.95], // 1 mid — medium
    [25, 39, 38, 62, 0.32, 0.58, 1.0, 1.28], // 2 fg  — fast, bright, cleaner
  ]

  static LAYER_COUNTS = [120, 92, 42]

  resize() {
    const scale = Math.max(0.55, Math.min(1, this.renderScale))
    this.canvas.width = Math.max(1, Math.round(window.innerWidth * scale))
    this.canvas.height = Math.max(1, Math.round(window.innerHeight * scale))
    this.canvas.style.width = "100vw"
    this.canvas.style.height = "100vh"
    this.drops = []
    this.splashes = []
    this.puddles = []
    this.lightning = null
    this._seed()
  }

  _seed() {
    for (let li = 0; li < 3; li++) {
      const count = Math.round(RainHDEffect.LAYER_COUNTS[li] * this.densityScale)
      for (let i = 0; i < count; i++) {
        this.drops.push(this._newDrop(li, true))
      }
    }
    const puddleCount = Math.max(6, Math.round(12 * this.splashScale))
    for (let i = 0; i < puddleCount; i++) {
      this.puddles.push(this._newPuddle(true))
    }
  }

  setOptions(options = {}) {
    let shouldResize = false
    let shouldReseed = false

    if (options.targetFps !== undefined) {
      this.fps = Math.max(24, Math.min(60, Number(options.targetFps) || 42))
      this.fpsInterval = 1000 / this.fps
    }
    if (options.renderScale !== undefined) {
      this.renderScale = Math.max(0.55, Math.min(1, Number(options.renderScale) || 0.82))
      shouldResize = true
    }
    if (options.densityScale !== undefined) {
      this.densityScale = Math.max(0.42, Math.min(1, Number(options.densityScale) || 0.68))
      shouldReseed = true
    }
    if (options.splashScale !== undefined) {
      this.splashScale = Math.max(0.35, Math.min(1, Number(options.splashScale) || 0.72))
    }

    if (shouldResize) {
      this.resize()
      return
    }
    if (this.active && shouldReseed) {
      this.drops = []
      this.splashes = []
      this.puddles = []
      this._seed()
    }
  }

  _newDrop(layerIndex, randomY = false) {
    const L = RainHDEffect.LAYERS[layerIndex]
    const [sMin, sMax, lMin, lMax, oMin, oMax, wf] = L
    const vy = sMin + Math.random() * (sMax - sMin)
    const len = lMin + Math.random() * (lMax - lMin)
    const vx = this.windX * wf + (Math.random() - 0.5) * 0.4
    const op = oMin + Math.random() * (oMax - oMin)
    const x = Math.random() * (this.canvas.width + 200) - 60
    const y = randomY
      ? Math.random() * this.canvas.height
      : -(len + Math.random() * 240)
    return { x, y, vx, vy, len, op, li: layerIndex }
  }

  _newPuddle(randomDelay = false) {
    return {
      x: Math.random() * this.canvas.width,
      r: 0,
      maxR: 20 + Math.random() * 50,
      speed: 0.55 + Math.random() * 0.9,
      baseOp: 0.18 + Math.random() * 0.22,
      delay: randomDelay ? Math.floor(Math.random() * 200) : 0,
    }
  }

  _spawnSplash(x) {
    if (this.splashes.length > 52 * this.splashScale) return
    // Primary large ring
    this.splashes.push({
      type: "ring",
      x,
      r: 1.5,
      maxR: 22 + Math.random() * 18,
      speed: 1.1 + Math.random() * 0.7,
      baseOp: 0.32 + Math.random() * 0.16,
      delay: 0,
    })
    // Secondary smaller ring (slight delay)
    this.splashes.push({
      type: "ring",
      x: x + (Math.random() - 0.5) * 8,
      r: 0.5,
      maxR: 10 + Math.random() * 9,
      speed: 1.0 + Math.random() * 0.5,
      baseOp: 0.22 + Math.random() * 0.14,
      delay: 4,
    })
    // Bounce droplets — arc upward then fall due to gravity
    const count = Math.max(1, Math.round((2 + Math.floor(Math.random() * 4)) * this.splashScale))
    for (let i = 0; i < count; i++) {
      // Spread around straight-up: angle in [-π/2 ± 0.85 rad]
      const spread = (Math.random() - 0.5) * 1.7
      const angle = -Math.PI / 2 + spread
      const spd = 1.2 + Math.random() * 3.4
      this.splashes.push({
        type: "particle",
        x,
        y: this.canvas.height - 3,
        vx: Math.cos(angle) * spd + this.windX * 0.25,
        vy: Math.sin(angle) * spd,
        gravity: 0.17 + Math.random() * 0.12,
        r: 0.55 + Math.random() * 1.15,
        baseOp: 0.38 + Math.random() * 0.22,
        op: 0.38 + Math.random() * 0.22,
        delay: 0,
        age: 0,
        maxAge: 55,
      })
    }
  }

  // ── Lightning helpers ─────────────────────────────────────────────────────

  _nextLightningDelay() {
    // Fire every 5–18 seconds (in frames at 60fps)
    return Math.floor((5 + Math.random() * 13) * 60)
  }

  _triggerLightning() {
    const W = this.canvas.width
    const H = this.canvas.height
    const startX = W * (0.15 + Math.random() * 0.7)
    this.lightning = {
      bolt: this._buildBolt(
        startX,
        0,
        startX + (Math.random() - 0.5) * 220,
        H * (0.55 + Math.random() * 0.45),
        6,
      ),
      // Flash sequence: each entry = [opacity, frames_to_hold]
      // Simulates the initial bright strike + afterglow flickers
      flashes: [
        [0.22, 2], // bright initial flash
        [0.1, 1], // slight dim
        [0.18, 2], // second flicker
        [0.06, 2], // fading
        [0.02, 3], // afterglow
      ],
      flashIdx: 0,
      flashHold: 0,
      boltOp: 1.0,
      done: false,
    }
  }

  // Recursive jagged bolt: returns array of {x1,y1,x2,y2} segments
  _buildBolt(x1, y1, x2, y2, depth) {
    if (depth === 0) return [{ x1, y1, x2, y2 }]
    const mx =
      (x1 + x2) / 2 + (Math.random() - 0.5) * (Math.abs(y2 - y1) * 0.45)
    const my = (y1 + y2) / 2
    const segs = [
      ...this._buildBolt(x1, y1, mx, my, depth - 1),
      ...this._buildBolt(mx, my, x2, y2, depth - 1),
    ]
    // Randomly sprout a branch from the midpoint
    if (depth >= 3 && Math.random() < 0.52) {
      const bx = mx + (Math.random() - 0.5) * 180
      const by = my + Math.abs(y2 - y1) * (0.4 + Math.random() * 0.45)
      segs.push(...this._buildBolt(mx, my, bx, by, depth - 2))
    }
    return segs
  }

  // ── Public API ────────────────────────────────────────────────────────────

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.time = 0
    if (!this.drops.length) this._seed()
    this._parseColor(this.color)
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame)
    this.animationFrame = null
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
    this.drops = []
    this.splashes = []
    this.puddles = []
    this.lightning = null
  }

  animate(t = 0) {
    if (!this.active) return
    this.animationFrame = this._animId = requestAnimationFrame((t2) => this.animate(t2))
    if (document.visibilityState === "hidden") return
    const elapsed = t - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = t - (elapsed % this.fpsInterval)
    this.time++
    this._update()
    this._draw()
  }

  // ── Update ────────────────────────────────────────────────────────────────

  _update() {
    // Slowly vary wind direction
    if (this.time % 90 === 0) {
      this._windTarget = 0.6 + Math.random() * 2.8
    }
    this.windX += (this._windTarget - this.windX) * 0.004

    // Move drops; splash on bottom hit
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]
      d.x += d.vx
      d.y += d.vy
      if (d.y > this.canvas.height + 10) {
        // Only mid + fg drops create visible splashes
        if (d.li >= 1 && Math.random() < 0.5 * this.splashScale) this._spawnSplash(d.x)
        Object.assign(d, this._newDrop(d.li, false))
      } else if (d.x < -160) {
        d.x = this.canvas.width + 100
      } else if (d.x > this.canvas.width + 160) {
        d.x = -100
      }
    }

    // Advance splash rings and particles
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i]
      if (s.delay > 0) {
        s.delay--
        continue
      }
      if (s.type === "ring") {
        s.r += s.speed
        if (s.r >= s.maxR) {
          this.splashes.splice(i, 1)
        }
      } else {
        s.age++
        s.vy += s.gravity
        s.x += s.vx
        s.y += s.vy
        s.op = Math.max(0, s.baseOp * (1 - s.age / s.maxAge))
        if (s.age >= s.maxAge || s.y > this.canvas.height + 5) {
          this.splashes.splice(i, 1)
        }
      }
    }

    // Advance ambient puddle rings
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i]
      if (p.delay > 0) {
        p.delay--
        continue
      }
      p.r += p.speed
      if (p.r >= p.maxR) this.puddles.splice(i, 1)
    }
    // Periodically add new ambient rings
    if (Math.random() < 0.055 * this.splashScale) this.puddles.push(this._newPuddle(false))
    const maxPuddles = Math.round(26 * this.splashScale)
    if (this.puddles.length > maxPuddles)
      this.puddles.splice(0, this.puddles.length - maxPuddles)

    // ── Lightning tick ──────────────────────────────────────────────────────
    if (!this.lightning) {
      this.lightningTimer--
      if (this.lightningTimer <= 0) {
        this._triggerLightning()
        this.lightningTimer = this._nextLightningDelay()
      }
    } else {
      const lt = this.lightning
      lt.flashHold++
      const [, holdFrames] = lt.flashes[lt.flashIdx]
      if (lt.flashHold >= holdFrames) {
        lt.flashHold = 0
        lt.flashIdx++
        if (lt.flashIdx >= lt.flashes.length) {
          this.lightning = null // sequence complete
        }
      }
      // Fade bolt glow in sync with flash sequence
      if (this.lightning) lt.boltOp = lt.flashes[lt.flashIdx][0] / 0.22
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────────

  _draw() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const r = this._r,
      g = this._g,
      b = this._b
    const rgb = `${r},${g},${b}`

    ctx.clearRect(0, 0, W, H)

    // ── 1. Rain mist veil — subtle atmospheric haze ──────────────────────
    const mist = ctx.createLinearGradient(0, 0, 0, H * 0.35)
    mist.addColorStop(0, `rgba(${rgb},0.055)`)
    mist.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = mist
    ctx.fillRect(0, 0, W, H)

    // ── 2. Puddle ripples at the bottom edge ─────────────────────────────
    const groundY = H - 6
    for (const p of this.puddles) {
      if (p.r <= 0 || p.delay > 0) continue
      const fade = 1 - p.r / p.maxR
      ctx.beginPath()
      ctx.ellipse(p.x, groundY, p.r, p.r * 0.26, 0, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${rgb},${fade * p.baseOp})`
      ctx.lineWidth = 0.9
      ctx.stroke()
    }

    // ── 3. Rain streaks — bg layer first (painter's algorithm) ───────────
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    for (const d of this.drops) {
      const lean = 0.52 + Math.abs(d.vx / Math.max(1, d.vy)) * 0.65
      const tx = d.x - d.vx * lean
      const ty = d.y - d.len * 0.58
      const hx = d.x + d.vx * 0.14
      const hy = d.y + d.len * 0.42
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(hx, hy)
      ctx.strokeStyle = this._layerStroke[d.li]
      ctx.lineWidth = RainHDEffect.LAYERS[d.li][7]
      ctx.stroke()

      if (d.li > 0) {
        ctx.beginPath()
        ctx.moveTo(hx - d.vx * 0.04, hy - d.len * 0.1)
        ctx.lineTo(hx, hy)
        ctx.strokeStyle = this._layerHeadStroke[d.li]
        ctx.lineWidth = Math.max(0.45, RainHDEffect.LAYERS[d.li][7] * 0.58)
        ctx.stroke()
      }
    }

    // ── 4. Splash rings ───────────────────────────────────────────────────
    for (const s of this.splashes) {
      if (s.delay > 0) continue
      if (s.type === "ring") {
        const fade = 1 - s.r / s.maxR
        ctx.beginPath()
        ctx.ellipse(s.x, H - 5, s.r, s.r * 0.28, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${rgb},${fade * s.baseOp})`
        ctx.lineWidth = 1.2
        ctx.stroke()
      } else {
        // Bounce droplet
        ctx.beginPath()
        ctx.arc(s.x, s.y, Math.max(0.3, s.r), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb},${s.op})`
        ctx.fill()
      }
    }

    // ── 5. Ground glistening strip ────────────────────────────────────────
    const ground = ctx.createLinearGradient(0, H - 20, 0, H)
    ground.addColorStop(0, `rgba(${rgb},0)`)
    ground.addColorStop(0.5, `rgba(${rgb},0.06)`)
    ground.addColorStop(1, `rgba(${rgb},0.13)`)
    ctx.fillStyle = ground
    ctx.fillRect(0, H - 20, W, 20)

    // ── 6. Lightning ─────────────────────────────────────────────────────
    if (this.lightning) {
      const lt = this.lightning
      const flashOp = lt.flashes[lt.flashIdx][0]

      // Full-screen white flash overlay
      ctx.fillStyle = `rgba(235,245,255,${flashOp * 0.72})`
      ctx.fillRect(0, 0, W, H)

      // Bolt glow: wide soft blur layer
      ctx.save()
      ctx.globalAlpha = lt.boltOp * 0.42
      ctx.strokeStyle = `rgba(200,220,255,1)`
      ctx.lineWidth = 4.2
      ctx.shadowColor = "rgba(180,210,255,1)"
      ctx.shadowBlur = 18
      ctx.lineCap = "round"
      for (const seg of lt.bolt) {
        ctx.beginPath()
        ctx.moveTo(seg.x1, seg.y1)
        ctx.lineTo(seg.x2, seg.y2)
        ctx.stroke()
      }
      ctx.restore()

      // Bolt core: thin bright white channel
      ctx.save()
      ctx.globalAlpha = lt.boltOp * 0.9
      ctx.strokeStyle = "rgba(255,255,255,1)"
      ctx.lineWidth = 1.15
      ctx.shadowColor = "rgba(255,255,255,1)"
      ctx.shadowBlur = 5
      ctx.lineCap = "round"
      for (const seg of lt.bolt) {
        ctx.beginPath()
        ctx.moveTo(seg.x1, seg.y1)
        ctx.lineTo(seg.x2, seg.y2)
        ctx.stroke()
      }
      ctx.restore()
    }
  }
}
