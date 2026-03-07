export class CloudDriftEffect {
  constructor(canvasId, color = "#ffffff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color

    // FPS throttling
    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.clouds = []

    this.resize()
    window.addEventListener("resize", () => this._onResize())
  }

  _onResize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    // Re-scatter clouds on resize without regenerating them fully
    this.clouds.forEach((c) => {
      if (c.y > this.canvas.height) c.y = Math.random() * this.canvas.height
    })
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  /** Parse hex color → { r, g, b } */
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

  /** Spawn a single cloud object */
  _makeCloud(spawnOffscreen = false) {
    const W = this.canvas.width
    const H = this.canvas.height
    const scale = 0.5 + Math.random() * 1.5 // size multiplier
    const speed = 0.15 + Math.random() * 0.35 // px per frame
    const layer = Math.random() // 0 = far, 1 = near
    const alpha = 0.08 + layer * 0.28 // far = transparent
    const x = spawnOffscreen
      ? -(200 + Math.random() * 400) * scale // start just off left edge
      : Math.random() * (W + 400) - 200 // random across screen

    return {
      x,
      y: H * 0.05 + Math.random() * H * 0.55, // upper ~60% of screen
      scale,
      speed: speed * (0.5 + layer * 0.8), // near clouds faster
      alpha,
      layer,
      // Each cloud is a set of overlapping circles
      puffs: this._makePuffs(scale),
    }
  }

  /** Generate puff circles for a cloud */
  _makePuffs(scale) {
    const baseR = 38 * scale
    const puffs = []
    const count = 4 + Math.floor(Math.random() * 4) // 4–7 puffs
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1)
      puffs.push({
        ox: (t - 0.5) * 180 * scale, // spread along x
        oy: -Math.sin(t * Math.PI) * 28 * scale, // arch upward in middle
        r: baseR * (0.55 + Math.sin(t * Math.PI) * 0.5),
      })
    }
    return puffs
  }

  /** Draw one cloud at (cx, cy) with given alpha and color */
  _drawCloud(cloud, rgb) {
    const ctx = this.ctx
    const { x, y, puffs, alpha } = cloud

    for (const p of puffs) {
      const gx = x + p.ox
      const gy = y + p.oy

      // Soft radial gradient per puff for fluffy look
      const grad = ctx.createRadialGradient(gx, gy - p.r * 0.2, 0, gx, gy, p.r)
      grad.addColorStop(
        0,
        `rgba(${rgb.r},${rgb.g},${rgb.b},${(alpha + 0.12).toFixed(3)})`,
      )
      grad.addColorStop(
        0.6,
        `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha.toFixed(3)})`,
      )
      grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)

      ctx.beginPath()
      ctx.arc(gx, gy, p.r, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
    }
  }

  _spawnClouds() {
    const count = 10 + Math.floor((this.canvas.width / 1920) * 8)
    this.clouds = []
    for (let i = 0; i < count; i++) {
      this.clouds.push(this._makeCloud(false))
    }
    // Sort by layer so far clouds render first
    this.clouds.sort((a, b) => a.layer - b.layer)
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.canvas.style.display = "block"
    this._spawnClouds()
    this.animate(0)
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  animate(currentTime = 0) {
    if (!this.active) return
    requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const W = this.canvas.width
    const H = this.canvas.height
    const rgb = this._hexToRgb(this.color)

    this.ctx.clearRect(0, 0, W, H)

    for (const cloud of this.clouds) {
      cloud.x += cloud.speed

      // Wrap around: when cloud fully exits right edge, respawn off left
      const maxX = cloud.puffs.reduce((m, p) => Math.max(m, p.ox + p.r), 0)
      if (cloud.x - maxX > W + 40) {
        // Recycle by moving back off left edge
        cloud.x = -(maxX * 2 + 80)
        cloud.y = H * 0.05 + Math.random() * H * 0.55
      }

      this._drawCloud(cloud, rgb)
    }
  }
}
