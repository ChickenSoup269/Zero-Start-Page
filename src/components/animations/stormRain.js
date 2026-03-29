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

    this._parseRainRgb(this.rainColor)

    // Wind state
    this.windX = options.windX ?? 0.9
    this._windTarget = this.windX
    this._manualWind = null // null = auto drift

    // Runtime
    this.active = false
    this.drops = []
    this.ripples = []
    this.fogParts = []
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
    this._lastTime = performance.now()
    this._animate(this._lastTime)
  }

  stop() {
    this.active = false
    if (this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.canvas.style.display = "none"
    }
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

  _parseRainRgb(hex) {
    const c = hex.replace("#", "")
    this._r = parseInt(c.slice(0, 2), 16)
    this._g = parseInt(c.slice(2, 4), 16)
    this._b = parseInt(c.slice(4, 6), 16)
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

    const dt = Math.min(now - this._lastTime, 50)
    this._lastTime = now
    this._time += dt

    // Wind logic
    if (this._manualWind !== null) {
      this._windTarget = this._manualWind
    } else if (this.autoWind) {
      this._windTarget = Math.sin(this._time * 0.00022) * 1.2 + 0.5
    }
    this.windX += (this._windTarget - this.windX) * 0.015

    const ctx = this.ctx
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this._drawFog()
    this._drawRain(dt)
    this._drawGround()
    this._drawRipples(dt)

    requestAnimationFrame((t) => this._animate(t))
  }
}
