export class PixelRunEffect {
  constructor(canvasId, color = "#00e5ff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.particles = []

    // Number of active pixel streams
    this.streamCount = 120

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initParticles()
  }

  // Parse this.color hex → {r,g,b}
  _rgb() {
    const c = this.color.replace("#", "")
    if (c.length === 3) {
      return {
        r: parseInt(c[0] + c[0], 16),
        g: parseInt(c[1] + c[1], 16),
        b: parseInt(c[2] + c[2], 16),
      }
    }
    return {
      r: parseInt(c.slice(0, 2), 16),
      g: parseInt(c.slice(2, 4), 16),
      b: parseInt(c.slice(4, 6), 16),
    }
  }

  createParticle(fromLeft = false) {
    const size =
      Math.random() < 0.3
        ? Math.floor(Math.random() * 3 + 3) * 2 // big: 6, 8, 10 px (even)
        : Math.floor(Math.random() * 2 + 1) * 2 // small: 2, 4 px (even)

    const speed = Math.random() * 2.5 + 0.8
    const dir = Math.random() < 0.72 ? 1 : -1 // ~72% go right, ~28% go left

    // Quantize Y to a grid so pixels look aligned
    const gridY = size * 2
    const row = Math.floor(
      Math.random() * Math.floor(this.canvas.height / gridY),
    )
    const y = row * gridY + (gridY - size) / 2

    const startX = fromLeft
      ? dir === 1
        ? -size - 20
        : this.canvas.width + size + 20
      : dir === 1
        ? Math.random() * this.canvas.width * 1.2 - size
        : Math.random() * this.canvas.width * 1.2

    // Trail: array of past positions (newest first)
    const trailLen = Math.floor(Math.random() * 6 + 3) // 3–8 ghost squares

    return {
      x: startX,
      y,
      size,
      speed: speed * dir,
      opacity: Math.random() * 0.45 + 0.55,
      trailLen,
      // Slight vertical wobble
      wobble: Math.random() < 0.25 ? Math.random() * 0.6 + 0.2 : 0,
      wobbleOff: Math.random() * Math.PI * 2,
      wobbleSpd: Math.random() * 0.05 + 0.02,
    }
  }

  initParticles() {
    this.particles = []
    for (let i = 0; i < this.streamCount; i++) {
      this.particles.push(this.createParticle(false))
    }
  }

  animate(currentTime = 0) {
    if (!this.active) return
    requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const ctx = this.ctx
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const { r, g, b } = this._rgb()

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]

      // Update
      p.x += p.speed
      if (p.wobble > 0) {
        p.wobbleOff += p.wobbleSpd
        p.y += Math.sin(p.wobbleOff) * p.wobble
      }

      // Recycle when off-screen
      const gone =
        p.speed > 0
          ? p.x - p.size * (p.trailLen + 1) > this.canvas.width + 30
          : p.x + p.size * (p.trailLen + 2) < -30

      if (gone) {
        Object.assign(p, this.createParticle(true))
        continue
      }

      // Draw trail (ghost pixels behind the head)
      const trailDir = p.speed > 0 ? -1 : 1
      for (let t = p.trailLen; t >= 1; t--) {
        const tx = p.x + trailDir * t * (p.size + 1)
        const fade = (1 - t / (p.trailLen + 1)) * p.opacity * 0.6
        ctx.fillStyle = `rgba(${r},${g},${b},${fade})`
        ctx.fillRect(tx, p.y, p.size, p.size)
      }

      // Draw head pixel (brightest)
      ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity})`
      ctx.fillRect(p.x, p.y, p.size, p.size)

      // Inner bright core
      ctx.fillStyle = `rgba(255,255,255,${p.opacity * 0.55})`
      const coreInset = Math.max(1, Math.floor(p.size * 0.25))
      ctx.fillRect(
        p.x + coreInset,
        p.y + coreInset,
        p.size - coreInset * 2,
        p.size - coreInset * 2,
      )

      // Soft outer glow (composite screen)
      ctx.save()
      ctx.globalCompositeOperation = "screen"
      ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity * 0.25})`
      ctx.fillRect(p.x - 2, p.y - 2, p.size + 4, p.size + 4)
      ctx.restore()
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.initParticles()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }
}
