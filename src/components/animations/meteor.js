/**
 * MeteorEffect — Improved Version
 *
 * Cải tiến so với bản gốc:
 *  - Góc đuôi thiên thạch tính theo vector thực (atan2) → luôn thẳng hướng bay
 *  - Glow halo radial gradient tại đầu thiên thạch
 *  - Micro-sparks bắn ra khi thiên thạch tắt (life < 0.15)
 *  - Shooting star hiếm: xuất hiện mỗi 8–22 giây, to và nhanh hơn
 *  - 3 lớp sao với tốc độ nhấp nháy khác nhau (parallax depth)
 *  - Nebula vignette tối ở viền tạo cảm giác không gian sâu
 *  - Delta-time thực → mượt đều mọi thiết bị
 *
 * Sử dụng:
 *   const fx = new MeteorEffect('myCanvasId', '#c8b8ff')
 *   fx.start()
 *   fx.stop()
 *   fx.destroy()
 *
 *   fx.setColor('#ffe8a0')   // đổi màu accent
 *   fx.setSpeed(1.5)         // hệ số tốc độ (0.3 → 3.0)
 *   fx.setSpawnRate(6)       // thiên thạch / giây (1 → 15)
 */
export class MeteorEffect {
  constructor(canvasId, color = "#c8b8ff") {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) throw new Error(`Canvas #${canvasId} not found`)
    this.ctx = this.canvas.getContext("2d")

    this.active = false
    this.speedMult = 1.0
    this.spawnRate = 4.0

    this._setColor(color)

    this.meteors = []
    this.sparks = []
    this.stars = []
    this._acc = 0
    this._lastT = 0
    this._nextSS = 8000 + Math.random() * 12000
    this._ss = null // shooting star

    this.resize()
    this._onResize = () => this.resize()
    window.addEventListener("resize", this._onResize)
  }

  // ─── PUBLIC API ───────────────────────────────────────────────

  start() {
    if (this.active) return
    this.active = true
    this._lastT = 0
    this._acc = 0
    this.canvas.style.display = "block"
    requestAnimationFrame((t) => {
      this._lastT = t
      this._loop(t)
    })
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._onResize)
  }

  /** Đổi màu accent (hex string). */
  setColor(hex) {
    this._setColor(hex)
  }

  /** Hệ số tốc độ (0.3 → 3.0). */
  setSpeed(s) {
    this.speedMult = Math.max(0.1, Math.min(5, s))
  }

  /** Thiên thạch sinh ra mỗi giây (1 → 15). */
  setSpawnRate(r) {
    this.spawnRate = Math.max(0.5, Math.min(20, r))
  }

  resize() {
    if (!this.canvas) return
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._buildStars()
  }

  // ─── COLOUR ──────────────────────────────────────────────────

  _setColor(hex) {
    this._hex = hex || "#c8b8ff"
    const c = this._hex.replace("#", "")
    const full = c.length === 3 ? c[0] + c[0] + c[1] + c[1] + c[2] + c[2] : c
    this._r = parseInt(full.slice(0, 2), 16)
    this._g = parseInt(full.slice(2, 4), 16)
    this._b = parseInt(full.slice(4, 6), 16)
  }

  _rgba(r, g, b, a) {
    return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`
  }

  // ─── STARS ───────────────────────────────────────────────────

  _buildStars() {
    const W = this.canvas.width,
      H = this.canvas.height
    const n = Math.max(60, Math.floor((W * H) / 18000))
    this.stars = Array.from({ length: n }, () => {
      const li = Math.floor(Math.random() * 3)
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r:
          li === 0
            ? 0.3 + Math.random() * 0.5
            : li === 1
              ? 0.5 + Math.random() * 0.9
              : 0.8 + Math.random() * 1.3,
        baseAlpha:
          li === 0
            ? 0.1 + Math.random() * 0.2
            : li === 1
              ? 0.2 + Math.random() * 0.35
              : 0.35 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        speed:
          li === 0
            ? 0.0004 + Math.random() * 0.0006
            : li === 1
              ? 0.0008 + Math.random() * 0.001
              : 0.0015 + Math.random() * 0.002,
      }
    })
  }

  // ─── SPAWN ───────────────────────────────────────────────────

  _spawnMeteor() {
    const W = this.canvas.width,
      H = this.canvas.height
    // Góc chéo chuẩn từ Top-Left (khoảng 45 độ, dao động nhỏ)
    const angle = ((45 + Math.random() * 4 - 2) * Math.PI) / 180
    const speed = (16 + Math.random() * 14) * this.speedMult
    const len = 80 + Math.random() * 160

    // Phân bổ dọc theo toàn bộ viền trên (Top) và viền trái (Left) để phủ kín màn hình
    let x, y
    // Chia tỉ lệ xác suất dựa trên chiều rộng tự tương đối với chiều cao
    if (Math.random() < W / (W + H)) {
      // Bắt đầu dọc theo mép trên (Top), trải dài ra toàn bộ chiều rộng
      x = -len + Math.random() * (W + len * 2)
      y = -len - Math.random() * 100
    } else {
      // Bắt đầu dọc theo mép trái (Left), trải dài ra toàn bộ chiều cao
      x = -len - Math.random() * 100
      y = -len + Math.random() * (H + len * 2)
    }

    this.meteors.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ax: 0.008 + Math.random() * 0.012,
      ay: 0.008 + Math.random() * 0.012,
      len: 80 + Math.random() * 160,
      size: 0.8 + Math.random() * 1.8,
      life: 1,
      fadeSpeed: 0.004 + Math.random() * 0.007,
      burst: false,
    })
  }

  _spawnShootingStar() {
    const W = this.canvas.width
    const H = this.canvas.height
    const speed = (28 + Math.random() * 12) * this.speedMult
    // Góc chéo 45 độ chuẩn
    const angle = ((45 + Math.random() * 2 - 1) * Math.PI) / 180

    // Xuất hiện ngẫu nhiên dọc theo mép trái hoặc trên (nhưng thiên x/y sâu hơn để bao phủ trọn)
    let x, y
    if (Math.random() < 0.5) {
      x = -200 - Math.random() * 100
      y = Math.random() * (H * 0.7) - 100
    } else {
      x = Math.random() * (W * 0.7) - 100
      y = -200 - Math.random() * 100
    }

    this._ss = {
      // Sao băng văng ngang qua màn hình
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: 280 + Math.random() * 120,
      size: 2.2 + Math.random() * 0.8,
      life: 1,
      fadeSpeed: 0.008,
    }
  }

  _spawnBurst(x, y) {
    const n = 4 + Math.floor(Math.random() * 5)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 0.5 + Math.random() * 2
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.6 + Math.random() * 0.4,
        size: 0.4 + Math.random() * 0.9,
      })
    }
  }

  // ─── UPDATE ──────────────────────────────────────────────────

  _update(dt) {
    const s = this.speedMult * (dt / 16.67)
    const W = this.canvas.width,
      H = this.canvas.height

    // Spawn regular meteors
    this._acc += this.spawnRate * (dt / 1000)
    while (this._acc >= 1) {
      this._spawnMeteor()
      this._acc -= 1
    }

    // Shooting star timer
    this._nextSS -= dt
    if (this._nextSS <= 0) {
      this._spawnShootingStar()
      this._nextSS = 8000 + Math.random() * 14000
    }

    // Update meteors
    this.meteors = this.meteors.filter((m) => {
      m.vx += m.ax * s
      m.vy += m.ay * s
      m.x += m.vx * s
      m.y += m.vy * s
      m.life -= m.fadeSpeed * s
      if (m.life <= 0.12 && !m.burst) {
        m.burst = true
        this._spawnBurst(m.x, m.y)
      }
      return m.life > 0 && m.x < W + m.len && m.y < H + m.len
    })

    // Update shooting star
    if (this._ss) {
      this._ss.x += this._ss.vx * s
      this._ss.y += this._ss.vy * s
      this._ss.life -= this._ss.fadeSpeed * s
      if (this._ss.life <= 0 || this._ss.x > W + 400) this._ss = null
    }

    // Update sparks
    this.sparks = this.sparks.filter((sp) => {
      sp.x += sp.vx
      sp.y += sp.vy
      sp.vy += 0.04 // gravity
      sp.life -= 0.025
      return sp.life > 0
    })
  }

  // ─── DRAW ────────────────────────────────────────────────────

  _drawStars(t) {
    const ctx = this.ctx
    const { _r: r, _g: g, _b: b } = this
    for (const s of this.stars) {
      const tw = 0.5 + Math.sin(t * s.speed + s.phase) * 0.35
      ctx.globalAlpha = Math.max(0.03, s.baseAlpha * tw)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  _drawStreak(m, alpha) {
    const ctx = this.ctx
    const { _r: r, _g: g, _b: b } = this
    const angle = Math.atan2(m.vy, m.vx)
    const tailX = m.x - Math.cos(angle) * m.len
    const tailY = m.y - Math.sin(angle) * m.len

    ctx.save()

    // Gradient streak
    const gr = ctx.createLinearGradient(tailX, tailY, m.x, m.y)
    gr.addColorStop(0, this._rgba(r, g, b, 0))
    gr.addColorStop(0.55, this._rgba(r, g, b, 0.38 * alpha))
    gr.addColorStop(0.85, this._rgba(255, 255, 255, 0.65 * alpha))
    gr.addColorStop(1, this._rgba(255, 255, 255, 0.95 * alpha))
    ctx.strokeStyle = gr
    ctx.lineWidth = m.size
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(tailX, tailY)
    ctx.lineTo(m.x, m.y)
    ctx.stroke()

    // Glow halo at head
    const haloR = m.size * 5
    const halo = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, haloR * alpha)
    halo.addColorStop(0, this._rgba(255, 255, 255, 0.5 * alpha))
    halo.addColorStop(0.4, this._rgba(r, g, b, 0.2 * alpha))
    halo.addColorStop(1, this._rgba(r, g, b, 0))
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(m.x, m.y, haloR, 0, Math.PI * 2)
    ctx.fill()

    // Solid head dot
    ctx.fillStyle = this._rgba(255, 255, 255, 0.95 * alpha)
    ctx.beginPath()
    ctx.arc(m.x, m.y, m.size * 1.15, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  _draw(t) {
    const ctx = this.ctx
    const W = this.canvas.width,
      H = this.canvas.height
    ctx.clearRect(0, 0, W, H)

    // Nebula vignette
    const vg = ctx.createRadialGradient(
      W / 2,
      H / 2,
      H * 0.1,
      W / 2,
      H / 2,
      H * 0.85,
    )
    vg.addColorStop(0, "rgba(15,10,35,0)")
    vg.addColorStop(1, "rgba(2,3,12,0.6)")
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, W, H)

    this._drawStars(t)

    for (const m of this.meteors) this._drawStreak(m, m.life)
    if (this._ss) this._drawStreak(this._ss, this._ss.life)

    // Sparks
    const { _r: r, _g: g, _b: b } = this
    for (const sp of this.sparks) {
      ctx.globalAlpha = sp.life * 0.85
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.beginPath()
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // ─── LOOP ────────────────────────────────────────────────────

  _loop(now) {
    if (!this.active) return
    const dt = Math.min(now - this._lastT, 50)
    this._lastT = now
    this._update(dt)
    this._draw(now)
    requestAnimationFrame((t) => this._loop(t))
  }
}
