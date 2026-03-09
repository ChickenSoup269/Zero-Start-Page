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
  constructor(canvasId, color = "#99ccff") {
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

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this.time = 0

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
  }

  // ── Layer definitions ────────────────────────────────────────────────────
  // Each entry: [speedMin, speedMax, lenMin, lenMax, opMin, opMax, windFactor, lineWidth]
  static LAYERS = [
    [7, 12, 10, 20, 0.06, 0.14, 0.35, 0.7], // 0 bg  — small, slow, faint
    [15, 24, 22, 38, 0.2, 0.38, 0.72, 1.3], // 1 mid — medium
    [26, 44, 40, 72, 0.45, 0.8, 1.0, 1.9], // 2 fg  — large, fast, bright
  ]

  static LAYER_COUNTS = [160, 120, 65]

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.drops = []
    this.splashes = []
    this.puddles = []
    this.lightning = null
    this._seed()
  }

  _seed() {
    for (let li = 0; li < 3; li++) {
      for (let i = 0; i < RainHDEffect.LAYER_COUNTS[li]; i++) {
        this.drops.push(this._newDrop(li, true))
      }
    }
    for (let i = 0; i < 14; i++) {
      this.puddles.push(this._newPuddle(true))
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
    // Primary large ring
    this.splashes.push({
      type: "ring",
      x,
      r: 1.5,
      maxR: 30 + Math.random() * 20,
      speed: 1.3 + Math.random() * 0.9,
      baseOp: 0.42 + Math.random() * 0.22,
      delay: 0,
    })
    // Secondary smaller ring (slight delay)
    this.splashes.push({
      type: "ring",
      x: x + (Math.random() - 0.5) * 8,
      r: 0.5,
      maxR: 14 + Math.random() * 10,
      speed: 1.0 + Math.random() * 0.5,
      baseOp: 0.22 + Math.random() * 0.14,
      delay: 4,
    })
    // Bounce droplets — arc upward then fall due to gravity
    const count = 4 + Math.floor(Math.random() * 6)
    for (let i = 0; i < count; i++) {
      // Spread around straight-up: angle in [-π/2 ± 0.85 rad]
      const spread = (Math.random() - 0.5) * 1.7
      const angle = -Math.PI / 2 + spread
      const spd = 1.6 + Math.random() * 5.0
      this.splashes.push({
        type: "particle",
        x,
        y: this.canvas.height - 3,
        vx: Math.cos(angle) * spd + this.windX * 0.25,
        vy: Math.sin(angle) * spd,
        gravity: 0.17 + Math.random() * 0.12,
        r: 0.8 + Math.random() * 1.8,
        baseOp: 0.5 + Math.random() * 0.3,
        op: 0.5 + Math.random() * 0.3,
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
    this.animationFrame = requestAnimationFrame((t2) => this.animate(t2))
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

    // Spawn fresh drops across all layers (spawn 2-3 per frame for denser rain)
    const spawnCount = Math.random() < 0.5 ? 3 : 2
    for (let s = 0; s < spawnCount; s++) {
      const li = Math.random() < 0.45 ? 0 : Math.random() < 0.65 ? 1 : 2
      this.drops.push(this._newDrop(li, false))
    }

    // Move drops; splash on bottom hit
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]
      d.x += d.vx
      d.y += d.vy
      if (d.y > this.canvas.height + 10) {
        // Only mid + fg drops create visible splashes
        if (d.li >= 1 && Math.random() < 0.72) this._spawnSplash(d.x)
        this.drops.splice(i, 1)
      }
    }

    // Cap drop count to prevent sluggishness
    const MAX_DROPS = 520
    if (this.drops.length > MAX_DROPS) {
      this.drops.splice(0, this.drops.length - MAX_DROPS)
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
    if (Math.random() < 0.1) this.puddles.push(this._newPuddle(false))
    if (this.puddles.length > 55)
      this.puddles.splice(0, this.puddles.length - 55)

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

    ctx.clearRect(0, 0, W, H)

    // ── 1. Rain mist veil — subtle atmospheric haze ──────────────────────
    const mist = ctx.createLinearGradient(0, 0, 0, H * 0.35)
    mist.addColorStop(0, `rgba(${r},${g},${b},0.055)`)
    mist.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = mist
    ctx.fillRect(0, 0, W, H)

    // ── 2. Puddle ripples at the bottom edge ─────────────────────────────
    const groundY = H - 6
    for (const p of this.puddles) {
      if (p.r <= 0 || p.delay > 0) continue
      const fade = 1 - p.r / p.maxR
      ctx.beginPath()
      ctx.ellipse(p.x, groundY, p.r, p.r * 0.26, 0, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${r},${g},${b},${fade * p.baseOp})`
      ctx.lineWidth = 0.9
      ctx.stroke()
    }

    // ── 3. Rain streaks — bg layer first (painter's algorithm) ───────────
    ctx.lineCap = "round"
    for (const d of this.drops) {
      const angle = Math.atan2(d.vy, d.vx)
      const tx = d.x - Math.cos(angle) * d.len
      const ty = d.y - Math.sin(angle) * d.len
      const lg = ctx.createLinearGradient(tx, ty, d.x, d.y)
      lg.addColorStop(0, `rgba(${r},${g},${b},0)`)
      lg.addColorStop(0.45, `rgba(${r},${g},${b},${d.op * 0.38})`)
      lg.addColorStop(1, `rgba(${r},${g},${b},${d.op})`)
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(d.x, d.y)
      ctx.strokeStyle = lg
      ctx.lineWidth = RainHDEffect.LAYERS[d.li][7]
      ctx.stroke()
    }

    // ── 4. Splash rings ───────────────────────────────────────────────────
    for (const s of this.splashes) {
      if (s.delay > 0) continue
      if (s.type === "ring") {
        const fade = 1 - s.r / s.maxR
        ctx.beginPath()
        ctx.ellipse(s.x, H - 5, s.r, s.r * 0.28, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${r},${g},${b},${fade * s.baseOp})`
        ctx.lineWidth = 1.2
        ctx.stroke()
      } else {
        // Bounce droplet
        ctx.beginPath()
        ctx.arc(s.x, s.y, Math.max(0.3, s.r), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${s.op})`
        ctx.fill()
      }
    }

    // ── 5. Ground glistening strip ────────────────────────────────────────
    const ground = ctx.createLinearGradient(0, H - 20, 0, H)
    ground.addColorStop(0, `rgba(${r},${g},${b},0)`)
    ground.addColorStop(0.5, `rgba(${r},${g},${b},0.06)`)
    ground.addColorStop(1, `rgba(${r},${g},${b},0.13)`)
    ctx.fillStyle = ground
    ctx.fillRect(0, H - 20, W, 20)

    // ── 6. Lightning ─────────────────────────────────────────────────────
    if (this.lightning) {
      const lt = this.lightning
      const flashOp = lt.flashes[lt.flashIdx][0]

      // Full-screen white flash overlay
      ctx.fillStyle = `rgba(255,255,255,${flashOp})`
      ctx.fillRect(0, 0, W, H)

      // Bolt glow: wide soft blur layer
      ctx.save()
      ctx.globalAlpha = lt.boltOp * 0.55
      ctx.strokeStyle = `rgba(200,220,255,1)`
      ctx.lineWidth = 6
      ctx.shadowColor = "rgba(180,210,255,1)"
      ctx.shadowBlur = 28
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
      ctx.lineWidth = 1.5
      ctx.shadowColor = "rgba(255,255,255,1)"
      ctx.shadowBlur = 8
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
