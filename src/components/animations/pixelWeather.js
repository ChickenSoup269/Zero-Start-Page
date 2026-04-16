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
    this.splashes = [] // Special for rain mode

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
      this.splashes = []
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
    if (this.mode === "rain") count = 250
    if (this.mode === "wind") count = 120
    if (this.mode === "snow") count = 400

    count = Math.floor(count * this.densityMul)

    for (let i = 0; i < count; i++) {
      this.particles.push(this._makeParticle(W, H, true))
    }
  }

  _makeParticle(W, H, initial = false) {
    let size, vx, vy, alpha, colorLight, type = "particle"

    if (this.mode === "rain") {
      const r = Math.random()
      if (r < 0.15) {
        // Bubble (rarer)
        type = "bubble"
        size = 4 + Math.random() * 4
        vx = (Math.random() - 0.5) * 0.5
        vy = -0.2 - Math.random() * 0.5 // Bubbles drift up slightly
        alpha = 0.2 + Math.random() * 0.3
        colorLight = 90 + Math.random() * 10
      } else {
        // Rain drop
        size = Math.random() < 0.8 ? 2 : 3 + Math.random() * 2
        vx = (Math.random() - 0.5) * 0.5
        vy = 12 + Math.random() * 10
        alpha = 0.4 + Math.random() * 0.4
        colorLight = 95 + Math.random() * 5 // White rain
      }
    } else if (this.mode === "wind") {
      size = Math.floor(2 + Math.random() * 6)
      vx = 8 + Math.random() * 12
      vy = 1 + Math.random() * 3
      alpha = 0.4 + Math.random() * 0.6
      colorLight = 80 + Math.random() * 20
    } else {
      // Snow
      const r = Math.random()
      size =
        r < 0.7
          ? 2 // Small
          : r < 0.92
            ? 4 // Medium
            : 6 // Large/Front

      vx = (Math.random() - 0.5) * 0.8
      vy = 0.5 + Math.random() * 1.5

      const ar = Math.random()
      alpha =
        ar < 0.5
          ? 0.2 + Math.random() * 0.2
          : ar < 0.85
            ? 0.5 + Math.random() * 0.3
            : 0.8 + Math.random() * 0.2

      colorLight = 90 + Math.random() * 10
    }

    return {
      type,
      x: initial
        ? Math.random() * W
        : this.mode === "wind"
          ? -20
          : Math.random() * W,
      y: initial
        ? Math.random() * H
        : type === "bubble"
          ? H + 20
          : -20,
      size,
      vx,
      vy,
      alpha,
      light: colorLight,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: this.mode === "snow" ? 0.01 + Math.random() * 0.02 : 0,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.03 + Math.random() * 0.07,
      twinkleAmp: this.mode === "snow" ? Math.random() * 0.4 : 0,
    }
  }

  _createSplash(x, y) {
    const splashCount = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < splashCount; i++) {
      this.splashes.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: -2 - Math.random() * 4,
        size: 2,
        life: 1.0,
        decay: 0.05 + Math.random() * 0.1,
      })
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

    // Update and draw splashes
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i]
      s.x += s.vx
      s.y += s.vy
      s.vy += 0.5 // Gravity
      s.life -= s.decay

      if (s.life <= 0) {
        this.splashes.splice(i, 1)
        continue
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${s.life * 0.6})`
      const ds = Math.max(1, Math.floor(s.size * this.resFactor))
      const dx = Math.floor(s.x / this.resFactor) * this.resFactor
      const dy = Math.floor(s.y / this.resFactor) * this.resFactor
      ctx.fillRect(dx, dy, ds, ds)
    }

    this.particles.forEach((p) => {
      if (this.mode === "snow") {
        p.wobblePhase += p.wobbleSpeed * this.speedMul
        p.twinklePhase += p.twinkleSpeed
        p.x += (p.vx + Math.sin(p.wobblePhase) * 0.5) * this.speedMul
      } else if (p.type === "bubble") {
        p.wobblePhase += 0.05
        p.x += Math.sin(p.wobblePhase) * 0.5
      } else {
        p.x += p.vx * this.speedMul
      }
      p.y += p.vy * this.speedMul

      // Check ground collision for rain
      if (this.mode === "rain" && p.type === "particle" && p.y > H - 10) {
        if (Math.random() < 0.3) this._createSplash(p.x, H - 5)
        Object.assign(p, this._makeParticle(W, H, false))
      }

      if (
        p.y > H + 20 * this.sizeMul ||
        p.y < -40 * this.sizeMul ||
        p.x > W + 20 * this.sizeMul ||
        p.x < -20 * this.sizeMul
      ) {
        Object.assign(p, this._makeParticle(W, H, false))
      }

      const twinkledAlpha =
        this.mode === "snow"
          ? Math.max(0.1, p.alpha + Math.sin(p.twinklePhase) * p.twinkleAmp)
          : p.alpha

      const drawSize = Math.max(
        1,
        Math.floor(p.size * this.resFactor * this.sizeMul),
      )
      const drawX = Math.floor(p.x / this.resFactor) * this.resFactor
      const drawY = Math.floor(p.y / this.resFactor) * this.resFactor

      if (p.type === "bubble") {
        // Draw pixel hollow square/circle for bubble
        ctx.strokeStyle = `rgba(255, 255, 255, ${twinkledAlpha})`
        ctx.lineWidth = Math.max(1, this.resFactor)
        ctx.strokeRect(drawX, drawY, drawSize, drawSize)
      } else {
        ctx.fillStyle = `hsla(210, 10%, ${p.light}%, ${twinkledAlpha})`
        ctx.fillRect(drawX, drawY, drawSize, drawSize)
      }
    })
  }
}
