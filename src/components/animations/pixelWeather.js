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
    if (this.mode === "rain") count = 150
    if (this.mode === "wind") count = 120

    count = Math.floor(count * this.densityMul)

    for (let i = 0; i < count; i++) {
      this.particles.push(this._makeParticle(W, H, true))
    }
  }

  _makeParticle(W, H, initial = false) {
    let size, vx, vy, alpha, colorLight

    // Base features: everything is a block (pixel)
    // Mode-specific velocities and sizes
    if (this.mode === "rain") {
      // Fast, elongated visually by speed, but drawn as squares or thin rects usually.
      // The user wants "khối vuông là chính" (squares primarily)
      size = Math.random() < 0.8 ? 2 : 4 + Math.random() * 2 // mostly small fast squares
      vx = (Math.random() - 0.5) * 1 // slight wind
      vy = 10 + Math.random() * 15 // fast falling
      alpha = 0.3 + Math.random() * 0.5
      colorLight = 60 + Math.random() * 20
    } else if (this.mode === "wind") {
      // Fast horizontal blowing
      size = Math.floor(2 + Math.random() * 6)
      vx = 8 + Math.random() * 12 // strong wind to the right
      vy = 1 + Math.random() * 3
      alpha = 0.4 + Math.random() * 0.6
      colorLight = 80 + Math.random() * 20
    } else {
      // Default: Snow
      // Light, floating squares
      size = Math.floor(4 + Math.random() * 8)
      vx = (Math.random() - 0.5) * 2
      vy = 1 + Math.random() * 3
      alpha = 0.5 + Math.random() * 0.5
      colorLight = 90 + Math.random() * 10
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
      size: size,
      vx: vx,
      vy: vy,
      alpha: alpha,
      light: colorLight,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: this.mode === "snow" ? 0.02 + Math.random() * 0.05 : 0,
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
      // Update position
      if (this.mode === "snow") {
        p.wobblePhase += p.wobbleSpeed * this.speedMul
        p.x += (p.vx + Math.sin(p.wobblePhase) * 1.5) * this.speedMul
      } else {
        p.x += p.vx * this.speedMul
      }
      p.y += p.vy * this.speedMul

      // Reset particle if off-screen
      if (
        p.y > H + 20 * this.sizeMul ||
        p.x > W + 20 * this.sizeMul ||
        p.x < -20 * this.sizeMul
      ) {
        Object.assign(p, this._makeParticle(W, H, false))
      }

      // Draw purely square pixel based on resolution
      ctx.fillStyle = `hsla(210, 100%, ${p.light}%, ${p.alpha})`

      const drawSize = p.size * this.resFactor * this.sizeMul
      // Snap to resolution grid for strict pixel effect if needed, but normally just multiplier
      const drawX = Math.floor(p.x / this.resFactor) * this.resFactor
      const drawY = Math.floor(p.y / this.resFactor) * this.resFactor

      ctx.fillRect(drawX, drawY, drawSize, drawSize)
    })
  }
}
