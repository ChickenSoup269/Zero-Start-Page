/**
 * StormRainEffect — Improved Version
 *
 * Cải tiến so với bản gốc:
 *  - 3 lớp parallax (xa / giữa / gần) thay vì 2
 *  - Gradient streak trên mỗi giọt (đầu sáng, đuôi mờ)
 *  - Ripple / sóng gợn khi giọt chạm đáy canvas
 *  - Hiệu ứng sương mù (fog particles)
 *  - Mặt đất ướt (ground wetness gradient)
 *  - Physics dùng delta-time thực → mượt đều mọi thiết bị
 *  - windX tự dao động + hỗ trợ setWind() thủ công
 *
 * Sử dụng:
 *   const rain = new StormRainEffect('myCanvasId')
 *   rain.start()
 *   rain.stop()
 *   rain.setWind(1.5)      // -3 → 3, âm = gió trái
 *   rain.setDensity(150)   // số giọt tổng
 *   rain.setSpeed(1.2)     // hệ số tốc độ
 */
export class StormRainEffect {
  // [speedMin, speedMax, lenMin, lenMax, opMin, opMax, windFactor, baseWidth]
  static LAYERS = [
    [3, 6, 5, 10, 0.04, 0.1, 0.15, 0.55], // lớp xa (bg)
    [8, 15, 12, 22, 0.12, 0.24, 0.4, 0.9], // lớp giữa
    [16, 26, 22, 38, 0.22, 0.45, 0.8, 1.3], // lớp gần (fg)
  ]
  static LAYER_SHARE = [0.35, 0.4, 0.25]

  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) throw new Error(`Canvas #${canvasId} not found`)
    this.ctx = this.canvas.getContext("2d")

    // Options
    this.rainColor = options.rainColor ?? "#9ecfee"
    this.cloudColor = options.cloudColor ?? "#080b14"
    this.density = options.density ?? 130
    this.speedMult = options.speed ?? 1.0
    this.autoWind = options.autoWind ?? true // false = gió cố định

    this._parseRainColor(this.rainColor)

    // Wind state
    this.windX = options.windX ?? 0.9
    this._windTarget = this.windX
    this._manualWind = null // null = auto drift

    // Runtime
    this.active = false
    this.drops = []
    this.ripples = []
    this.fogParts = []
    this.clouds = []
    this.lightningFlash = 0
    this.lightningTimer = 2000
    this.currentLightningBolts = null

    this._time = 0
    this._lastTime = 0

    // Off-screen canvas cho motion-blur trail
    this._rc = document.createElement("canvas")
    this._rctx = this._rc.getContext("2d")

    this.resize()
    this._onResize = () => this.resize()
    window.addEventListener("resize", this._onResize)
  }

  // ─── PUBLIC API ───────────────────────────────────────────────

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this._buildDrops()
    this._buildFog()
    this._buildClouds()
    this._lastTime = performance.now()
    this._animate(this._lastTime)
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    if (this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.canvas.style.display = "none"
    }
    this.drops = []
    this.ripples = []
    this.fogParts = []
    this.clouds = []
    this.currentLightningBolts = null
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._onResize)
  }

  /** Đặt gió thủ công. Gọi setWind(null) để trở về auto drift. */
  setWind(value) {
    this._manualWind = value
    if (value !== null) this._windTarget = value
  }

  /** Tổng số giọt (30 → 300). */
  setDensity(n) {
    this.density = Math.max(10, Math.min(400, n))
    this._buildDrops()
  }

  /** Hệ số tốc độ (0.3 → 3.0). */
  setSpeed(s) {
    this.speedMult = Math.max(0.1, Math.min(5, s))
  }

  resize() {
    if (!this.canvas) return
    const W = window.innerWidth,
      H = window.innerHeight
    this.canvas.width = W
    this.canvas.height = H
    this._rc.width = W
    this._rc.height = H
  }

  // ─── COLOUR HELPERS ──────────────────────────────────────────

  _parseRainColor(hex) {
    const c = hex.replace("#", "")
    if (c.length === 6) {
      this._r = parseInt(c.slice(0, 2), 16)
      this._g = parseInt(c.slice(2, 4), 16)
      this._b = parseInt(c.slice(4, 6), 16)
    } else if (c.length === 3) {
      this._r = parseInt(c[0] + c[0], 16)
      this._g = parseInt(c[1] + c[1], 16)
      this._b = parseInt(c[2] + c[2], 16)
    }
  }

  _hexToRgb(color) {
    const hex = color.replace("#", "")
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      }
    }
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      }
    }
    return { r: 255, g: 255, b: 255 }
  }

  // ─── INIT ────────────────────────────────────────────────────

  _buildDrops() {
    this.drops = []
    for (let li = 0; li < StormRainEffect.LAYERS.length; li++) {
      const count = Math.round(this.density * StormRainEffect.LAYER_SHARE[li])
      for (let i = 0; i < count; i++) this.drops.push(this._newDrop(li, true))
    }
  }

  _buildFog() {
    const H = this.canvas.height
    this.fogParts = Array.from({ length: 6 }, () => ({
      x: Math.random() * this.canvas.width,
      y: H * 0.3 + Math.random() * H * 0.4,
      r: 120 + Math.random() * 180,
      vx: 0.08 + Math.random() * 0.12,
      op: 0.04 + Math.random() * 0.06,
    }))
  }

  _buildClouds() {
    const count = 16 + Math.floor((this.canvas.width / 1920) * 12)
    this.clouds = []
    for (let i = 0; i < count; i++) {
      this.clouds.push(this._makeCloud(false))
    }
    this.clouds.sort((a, b) => a.layer - b.layer)
  }

  _makeCloud(spawnOffscreen = false) {
    const W = this.canvas.width
    const H = this.canvas.height
    const scale = 0.5 + Math.random() * 1.5
    const speed = 0.15 + Math.random() * 0.35
    const layer = Math.random()
    const alpha = 0.1 + layer * 0.3 // darker storm clouds
    const x = spawnOffscreen
      ? -(200 + Math.random() * 400) * scale
      : Math.random() * (W + 400) - 200

    return {
      x,
      y: -H * 0.05 + Math.random() * H * 0.35, // higher up in the storm
      scale,
      speed: speed * (0.5 + layer * 0.8),
      alpha,
      layer,
      puffs: this._makePuffs(scale),
    }
  }

  _makePuffs(scale) {
    const baseR = 48 * scale // bigger puffs for storm
    const puffs = []
    const count = 4 + Math.floor(Math.random() * 5)
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1)
      puffs.push({
        ox: (t - 0.5) * 220 * scale,
        oy: -Math.sin(t * Math.PI) * 36 * scale,
        r: baseR * (0.6 + Math.sin(t * Math.PI) * 0.5),
      })
    }
    return puffs
  }

  _newDrop(li, randomY = false) {
    const W = this.canvas.width,
      H = this.canvas.height
    const [sMin, sMax, lMin, lMax, oMin, oMax, wf, bw] =
      StormRainEffect.LAYERS[li]
    const vy = sMin + Math.random() * (sMax - sMin)
    const len = lMin + Math.random() * (lMax - lMin)
    return {
      x: Math.random() * (W + 200) - 80,
      y: randomY ? Math.random() * H : -(len + Math.random() * 200),
      vx: this.windX * wf + (Math.random() - 0.5) * 0.3,
      vy,
      len,
      op: oMin + Math.random() * (oMax - oMin),
      li,
      width: bw * (0.8 + Math.random() * 0.5),
      drift: (Math.random() - 0.5) * 0.15,
    }
  }

  // ─── DRAW ────────────────────────────────────────────────────

  _drawClouds(dt) {
    const W = this.canvas.width
    const H = this.canvas.height
    const ctx = this.ctx
    const rgb = this._hexToRgb(this.cloudColor)

    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * (dt / 16.67) + this.windX * 0.1 * (dt / 16.67)

      const maxX = cloud.puffs.reduce((m, p) => Math.max(m, p.ox + p.r), 0)
      if (cloud.x - maxX > W + 40) {
        cloud.x = -(maxX * 2 + 80)
        cloud.y = -H * 0.05 + Math.random() * H * 0.35
      }

      const { x, y, puffs, alpha } = cloud

      for (const p of puffs) {
        const gx = x + p.ox
        const gy = y + p.oy

        const grad = ctx.createRadialGradient(
          gx,
          gy - p.r * 0.2,
          0,
          gx,
          gy,
          p.r,
        )
        // Add lightning flash effect to clouds
        const flashInt = this.lightningFlash > 0 ? this.lightningFlash * 0.4 : 0
        const rr = Math.min(255, rgb.r + flashInt * 255)
        const gg = Math.min(255, rgb.g + flashInt * 255)
        const bb = Math.min(255, rgb.b + flashInt * 255)

        grad.addColorStop(
          0,
          `rgba(${rr},${gg},${bb},${(alpha + 0.12).toFixed(3)})`,
        )
        grad.addColorStop(0.6, `rgba(${rr},${gg},${bb},${alpha.toFixed(3)})`)
        grad.addColorStop(1, `rgba(${rr},${gg},${bb},0)`)

        ctx.beginPath()
        ctx.arc(gx, gy, p.r, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }
    }
  }

  _generateLightningBolts() {
    const startX = Math.random() * this.canvas.width
    const startY = -20 // starts slightly above screen
    const bolts = []

    // Recursive function to branch out the lightning
    const createBranch = (x, y, angle, depth) => {
      // Stop branching if it gets too deep or reaches bottom
      if (depth > 8 || y > this.canvas.height) return

      const length = 40 + Math.random() * 80
      const targetX = x + Math.cos(angle) * length
      const targetY = y + Math.sin(angle) * length

      bolts.push({ x1: x, y1: y, x2: targetX, y2: targetY, depth })

      // Continue main branch
      createBranch(
        targetX,
        targetY,
        angle + (Math.random() - 0.5) * 0.4,
        depth + 1,
      )

      // Split sub branch
      if (Math.random() < 0.4) {
        const splitAngle =
          angle +
          (Math.random() > 0.5 ? 0.6 : -0.6) +
          (Math.random() - 0.5) * 0.4
        createBranch(targetX, targetY, splitAngle, depth + 1)
      }
    }

    // Start roughly pointing down
    createBranch(startX, startY, Math.PI / 2 + (Math.random() - 0.5) * 0.8, 0)
    this.currentLightningBolts = bolts
  }

  _drawLightning(dt) {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    if (this.lightningFlash > 0) {
      // 1. Background flash (lower intensity so bolt pops out more)
      ctx.fillStyle = `rgba(240, 248, 255, ${this.lightningFlash * 0.45})`
      ctx.fillRect(0, 0, W, H)

      // 2. Draw actual lightning bolt lines
      if (this.currentLightningBolts && this.currentLightningBolts.length > 0) {
        ctx.save()
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        // Outer glow
        ctx.shadowBlur = 15
        ctx.shadowColor = "rgba(255, 255, 255, 0.8)"

        ctx.beginPath()
        for (const bolt of this.currentLightningBolts) {
          ctx.lineWidth = Math.max(1, 5 - bolt.depth * 0.5)
          // Brighter at the top segments
          const alphaFade = Math.max(0.1, 1 - bolt.depth * 0.08)
          ctx.strokeStyle = `rgba(255, 255, 255, ${this.lightningFlash * alphaFade * 1.5})`
          ctx.moveTo(bolt.x1, bolt.y1)
          ctx.lineTo(bolt.x2, bolt.y2)
          ctx.stroke()
          ctx.beginPath() // Reset path for differently styled segments if needed, though stroke inside loop is fine
        }
        ctx.restore()
      }

      this.lightningFlash -= dt * 0.0018 // fade out speed
    } else {
      this.currentLightningBolts = null
    }

    this.lightningTimer -= dt
    if (this.lightningTimer <= 0) {
      if (Math.random() < 0.08) {
        this.lightningFlash = 0.6 + Math.random() * 0.4 // Initial flash intensity
        this._generateLightningBolts() // Generate branches

        // Next lightning in 3s to 12s
        this.lightningTimer = 3000 + Math.random() * 9000
      } else {
        // Check again soon
        this.lightningTimer = 500
      }
    }
  }

  _drawFog() {
    const ctx = this.ctx
    const W = this.canvas.width
    const { _r: r, _g: g, _b: b } = this
    for (const p of this.fogParts) {
      p.x += p.vx
      if (p.x - p.r > W) p.x = -p.r
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
      gr.addColorStop(0, `rgba(${r},${g},${b},${p.op})`)
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  _drawRain(dt) {
    const W = this.canvas.width,
      H = this.canvas.height
    const rctx = this._rctx
    const mult = this.speedMult * (dt / 16.67)
    const { _r: r, _g: g, _b: b } = this

    // Fade trail
    const fade = Math.min(0.48, 0.3 + Math.abs(this.windX) * 0.05)
    rctx.globalCompositeOperation = "destination-out"
    rctx.fillStyle = `rgba(0,0,0,${fade})`
    rctx.fillRect(0, 0, W, H)
    rctx.globalCompositeOperation = "source-over"

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]
      const wf = StormRainEffect.LAYERS[d.li][6]
      const targetVx = this.windX * wf + d.drift
      d.vx += (targetVx - d.vx) * 0.08
      d.x += d.vx * mult
      d.y += d.vy * mult

      // Chạm đáy → ripple + tái sinh
      if (d.y > H + d.len) {
        if (Math.random() < 0.7)
          this._spawnRipple(d.x, H - 2 - Math.random() * 8, d.li)
        Object.assign(d, this._newDrop(d.li, false))
        continue
      }
      if (d.x < -120) d.x = W + 120
      if (d.x > W + 120) d.x = -120

      // Gradient streak
      const trailMult = 0.3 + Math.abs(d.vx / d.vy) * 0.5
      const tailX = d.x - d.vx * trailMult
      const tailY = d.y - d.vy * trailMult
      const headX = d.x + d.vx * 0.04
      const headY = d.y + d.len

      const grad = rctx.createLinearGradient(tailX, tailY, headX, headY)
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`)
      grad.addColorStop(0.6, `rgba(${r + 42},${g + 23},${b + 17},${d.op})`)
      grad.addColorStop(1, `rgba(255,255,255,${Math.min(1, d.op * 1.4)})`)

      rctx.globalAlpha = d.op
      rctx.strokeStyle = grad
      rctx.lineWidth = Math.max(0.4, d.width)
      rctx.lineCap = "round"
      rctx.beginPath()
      rctx.moveTo(tailX, tailY)
      rctx.lineTo(headX, headY)
      rctx.stroke()
    }
    rctx.globalAlpha = 1
    this.ctx.drawImage(this._rc, 0, 0)
  }

  _spawnRipple(x, y, li) {
    const scale = li === 0 ? 0.4 : li === 1 ? 0.75 : 1.1
    this.ripples.push({
      x,
      y,
      r: 0,
      maxR: (4 + Math.random() * 6) * scale,
      op: 0.55 * scale,
      li,
    })
  }

  _drawRipples(dt) {
    const ctx = this.ctx
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i]
      rp.r += (1.8 + rp.li * 0.6) * dt * 0.06
      rp.op -= 0.016 * dt * 0.06
      if (rp.op <= 0) {
        this.ripples.splice(i, 1)
        continue
      }

      ctx.save()
      ctx.globalAlpha = rp.op
      ctx.strokeStyle = `rgba(${this._r},${this._g},${this._b},1)`
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.ellipse(rp.x, rp.y, rp.r * 2, rp.r * 0.55, 0, 0, Math.PI * 2)
      ctx.stroke()
      if (rp.r > 1.5) {
        ctx.globalAlpha = rp.op * 0.4
        ctx.beginPath()
        ctx.ellipse(rp.x, rp.y, rp.r * 1.1, rp.r * 0.3, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  _drawGround() {
    const ctx = this.ctx
    const W = this.canvas.width,
      H = this.canvas.height
    const g = ctx.createLinearGradient(0, H - 28, 0, H)
    g.addColorStop(0, "rgba(10,20,40,0)")
    g.addColorStop(1, "rgba(20,40,70,0.45)")
    ctx.fillStyle = g
    ctx.fillRect(0, H - 28, W, 28)
  }

  // ─── LOOP ────────────────────────────────────────────────────

  _animate(now) {
    if (!this.active) return
    this._animId = requestAnimationFrame((t) => this._animate(t))
    if (document.visibilityState === "hidden") return

    const dt = Math.min(now - this._lastTime, 50)
    this._lastTime = now
    this._time += dt

    if (this.autoWind) {
      this._windTarget += (Math.random() - 0.5) * 0.05
      this._windTarget = Math.max(-2.5, Math.min(2.5, this._windTarget))
      this.windX += (this._windTarget - this.windX) * 0.01
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this._drawClouds(dt)
    this._drawLightning(dt)
    this._drawFog()
    this._drawGround()
    this._drawRain(dt)
    this._drawRipples(dt)
  }

  updateColor(color) {
    this.rainColor = color
    this._parseRainColor(color)
  }
}
