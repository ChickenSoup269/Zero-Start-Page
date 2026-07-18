export class FrostedGlassOrbsBackground {
  constructor(canvasId, color1 = "#00f2fe", color2 = "#4facfe") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color1 = color1
    this.color2 = color2
    this.orbs = []
    this.numOrbs = 6

    // Pre-create canvas to draw gradient blur
    this.initOrbs()
    this.resize = this.resize.bind(this)
    window.addEventListener("resize", this.resize)
    this.resize()
  }

  initOrbs() {
    this.orbs = []
    for (let i = 0; i < this.numOrbs; i++) {
      this.orbs.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 200 + 150,
        colorIndex: i % 2 === 0 ? 1 : 2
      })
    }
  }

  updateColor(type, color) {
    if (type === 'color1') this.color1 = color
    if (type === 'color2') this.color2 = color
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  start() {
    if (this.active) return
    this.active = true
    this.animate()
  }

  stop() {
    this.active = false
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this.resize)
    const ctx = this.canvas.getContext("2d")
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  hexToRgb(hex) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16)
      g = parseInt(hex[2] + hex[2], 16)
      b = parseInt(hex[3] + hex[3], 16)
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16)
      g = parseInt(hex.substring(3, 5), 16)
      b = parseInt(hex.substring(5, 7), 16)
    }
    return { r, g, b }
  }

  buildOrbCache() {
    const size = 500
    const radius = size / 2

    const createOrb = (color) => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const rgb = this.hexToRgb(color)

      const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius)
      grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`)
      grad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`)
      grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

      ctx.beginPath()
      ctx.arc(radius, radius, radius, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      return canvas
    }

    this.orbCache = {
      canvas1: createOrb(this.color1),
      canvas2: createOrb(this.color2),
      color1: this.color1,
      color2: this.color2
    }
  }

  animate() {
    if (!this.active) return

    const W = this.canvas.width
    const H = this.canvas.height
    
    if (!this.orbCache || this.orbCache.color1 !== this.color1 || this.orbCache.color2 !== this.color2) {
      this.buildOrbCache()
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, W, H)

    // Update and draw orbs
    this.orbs.forEach(orb => {
      orb.x += orb.vx
      orb.y += orb.vy

      // Bounce off edges
      if (orb.x - orb.radius > W) orb.x = -orb.radius
      if (orb.x + orb.radius < 0) orb.x = W + orb.radius
      if (orb.y - orb.radius > H) orb.y = -orb.radius
      if (orb.y + orb.radius < 0) orb.y = H + orb.radius

      // Draw orb
      const cacheCanvas = orb.colorIndex === 1 ? this.orbCache.canvas1 : this.orbCache.canvas2
      this.ctx.drawImage(cacheCanvas, orb.x - orb.radius, orb.y - orb.radius, orb.radius * 2, orb.radius * 2)
    })

    requestAnimationFrame(() => this.animate())
  }
}
