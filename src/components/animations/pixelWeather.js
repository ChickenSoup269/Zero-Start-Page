export class PixelWeatherEffect {
  constructor(canvasId, mode = "snow") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.rafId = null

    this.mode = mode // 'snow', 'rain', or 'wind'
    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this.particles = []

    this.resFactor = 1
    this.speedMul = 1.0
    this.sizeMul = 1.0
    this.densityMul = 1.0

    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._buildParticles()
  }

  setMode(mode) {
    if (this.mode !== mode) {
      this.mode = mode
      this._buildParticles()
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

    if (opts.speed !== undefined) {
      this.speedMul = opts.speed
    }

    if (opts.size !== undefined && opts.size !== this.sizeMul) {
      this.sizeMul = opts.size
    }

    if (rebuild) {
      this._buildParticles()
    }
  }

  _buildParticles() {
    this.particles = []
    const W = this.canvas.width
    const H = this.canvas.height

    let count = 100
    if (this.mode === "rain") count = 350
    if (this.mode === "wind") count = 120
    if (this.mode === "snow") count = 400

    count = Math.floor(count * this.densityMul)

    for (let i = 0; i < count; i++) {
      this.particles.push(this._makeParticle(W, H, true))
    }
  }

  _makeParticle(W, H, initial = false) {
    let size, vx, vy, alpha, colorLight

    if (this.mode === "rain") {
      size = Math.random() < 0.8 ? 2 : 4 + Math.random() * 2
      vx = (Math.random() - 0.5) * 1
      vy = 10 + Math.random() * 15
      alpha = 0.3 + Math.random() * 0.5
      colorLight = 60 + Math.random() * 20
    } else if (this.mode === "wind") {
      size = Math.floor(2 + Math.random() * 6)
      vx = 8 + Math.random() * 12
      vy = 1 + Math.random() * 3
      alpha = 0.4 + Math.random() * 0.6
      colorLight = 80 + Math.random() * 20
    } else {
      // Snow — giống ảnh: hạt nhỏ 1-2px, mostly static với drift nhẹ
      const r = Math.random()
      size =
        r < 0.7
          ? 5 // 70% hạt 1px
          : r < 0.92
            ? 2 // 22% hạt 2px
            : 3 // 8% hạt 3px (điểm sáng)

      vx = (Math.random() - 0.5) * 0.4 // drift ngang rất nhẹ
      vy = 0.2 + Math.random() * 0.8 // rơi cực chậm

      // Alpha: phần lớn mờ, một số sáng hơn — tạo chiều sâu
      const ar = Math.random()
      alpha =
        ar < 0.5
          ? 0.15 + Math.random() * 0.2 // mờ (xa)
          : ar < 0.85
            ? 0.4 + Math.random() * 0.3 // vừa
            : 0.8 + Math.random() * 0.2 // sáng (gần)

      colorLight = 85 + Math.random() * 15 // trắng gần thuần
    }

    return {
      x: initial
        ? Math.random() * W
        : this.mode === "wind"
          ? -20
          : Math.random() * W,
      y: initial
        ? Math.random() * H
        : this.mode === "wind"
          ? Math.random() * H
          : -20,
      size,
      vx,
      vy,
      alpha,
      light: colorLight,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: this.mode === "snow" ? 0.005 + Math.random() * 0.01 : 0,
      // Thêm: lấp lánh ngẫu nhiên
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.02 + Math.random() * 0.06,
      twinkleAmp: Math.random() * 0.3,
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.resize()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    this.active = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this.rafId = this._animId = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const W = this.canvas.width
    const H = this.canvas.height
    const ctx = this.ctx

    ctx.clearRect(0, 0, W, H)
    ctx.globalCompositeOperation = "screen"

    this.particles.forEach((p) => {
      if (this.mode === "snow") {
        p.wobblePhase += p.wobbleSpeed * this.speedMul
        p.twinklePhase += p.twinkleSpeed
        p.x += (p.vx + Math.sin(p.wobblePhase) * 0.3) * this.speedMul
      } else {
        p.x += p.vx * this.speedMul
      }
      p.y += p.vy * this.speedMul

      if (
        p.y > H + 20 * this.sizeMul ||
        p.x > W + 20 * this.sizeMul ||
        p.x < -20 * this.sizeMul
      ) {
        Object.assign(p, this._makeParticle(W, H, false))
      }

      // Lấp lánh: alpha dao động theo sin
      const twinkledAlpha =
        this.mode === "snow"
          ? Math.max(0.05, p.alpha + Math.sin(p.twinklePhase) * p.twinkleAmp)
          : p.alpha

      ctx.fillStyle = `hsla(210, 20%, ${p.light}%, ${twinkledAlpha})`

      const drawSize = Math.max(
        1,
        Math.floor(p.size * this.resFactor * this.sizeMul),
      )
      const drawX = Math.floor(p.x / this.resFactor) * this.resFactor
      const drawY = Math.floor(p.y / this.resFactor) * this.resFactor

      ctx.fillRect(drawX, drawY, drawSize, drawSize)
    })
  }
}
