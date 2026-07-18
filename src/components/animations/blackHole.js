export class BlackHoleBackground {
  constructor(canvasId, accretionColor = "#ff5500", starColor = "#ffffff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d", { alpha: false })
    this.active = false
    this.accretionColor = accretionColor
    this.starColor = starColor
    
    this.stars = []
    this.numStars = 800
    this.holeRadius = 60
    
    this.resize = this.resize.bind(this)
    window.addEventListener("resize", this.resize)
    this.resize()
  }

  initStars() {
    this.stars = []
    const maxRadius = Math.max(window.innerWidth, window.innerHeight)
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push(this.createStar(Math.random() * maxRadius + this.holeRadius))
    }
  }

  createStar(radius) {
    return {
      angle: Math.random() * Math.PI * 2,
      radius: radius,
      speed: Math.random() * 2 + 1,
      size: Math.random() * 1.5 + 0.5,
      history: [] // stores previous positions for trails
    }
  }

  updateColor(type, color) {
    if (type === 'accretion') this.accretionColor = color
    if (type === 'star') this.starColor = color
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initStars()
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
    let r = 255, g = 255, b = 255
    if (hex.startsWith('#')) {
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16)
        g = parseInt(hex[2] + hex[2], 16)
        b = parseInt(hex[3] + hex[3], 16)
      } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16)
        g = parseInt(hex.substring(3, 5), 16)
        b = parseInt(hex.substring(5, 7), 16)
      }
    }
    return { r, g, b }
  }

  animate() {
    if (!this.active) return

    const W = this.canvas.width
    const H = this.canvas.height
    const cx = W / 2
    const cy = H / 2

    // Dark space background with slight fade for motion blur effect
    this.ctx.fillStyle = "rgba(5, 5, 10, 0.3)"
    this.ctx.fillRect(0, 0, W, H)

    const starRgb = this.hexToRgb(this.starColor)
    const maxRadius = Math.max(W, H)
    
    // Draw stars
    this.ctx.lineWidth = 1.5
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i]
      
      // Calculate current position
      const x = cx + Math.cos(star.angle) * star.radius
      const y = cy + Math.sin(star.angle) * star.radius
      
      // Store history for trails
      star.history.push({x, y})
      if (star.history.length > 5) {
        star.history.shift()
      }

      // Update position
      // Closer to the hole = faster rotation and faster suction
      const distanceFactor = Math.max(0.1, star.radius / this.holeRadius)
      star.angle += (0.02 * star.speed) / (distanceFactor * 0.5)
      star.radius -= (1.5 * star.speed) / distanceFactor

      // Draw trail
      if (star.history.length > 1) {
        this.ctx.beginPath()
        this.ctx.moveTo(star.history[0].x, star.history[0].y)
        for (let j = 1; j < star.history.length; j++) {
          this.ctx.lineTo(star.history[j].x, star.history[j].y)
        }
        
        // Stars get brighter and longer as they approach the hole
        const intensity = Math.min(1, this.holeRadius * 3 / Math.max(1, star.radius))
        this.ctx.strokeStyle = `rgba(${starRgb.r}, ${starRgb.g}, ${starRgb.b}, ${0.2 + intensity * 0.8})`
        this.ctx.stroke()
      }

      // Respawn star if it falls into the hole
      if (star.radius <= this.holeRadius * 0.5) {
        this.stars[i] = this.createStar(maxRadius + Math.random() * 200)
      }
    }

    // Draw accretion disk (glowing ring)
    const diskRgb = this.hexToRgb(this.accretionColor)
    this.ctx.save()
    // Ellipse to make it look 3D (tilted)
    this.ctx.translate(cx, cy)
    this.ctx.rotate(Math.PI / 8)
    this.ctx.scale(1, 0.3) // Flatten to look like a disk

    const diskGrad = this.ctx.createRadialGradient(0, 0, this.holeRadius, 0, 0, this.holeRadius * 4)
    diskGrad.addColorStop(0, `rgba(${diskRgb.r}, ${diskRgb.g}, ${diskRgb.b}, 1)`)
    diskGrad.addColorStop(0.2, `rgba(${diskRgb.r}, ${diskRgb.g}, ${diskRgb.b}, 0.5)`)
    diskGrad.addColorStop(1, `rgba(${diskRgb.r}, ${diskRgb.g}, ${diskRgb.b}, 0)`)
    
    this.ctx.fillStyle = diskGrad
    this.ctx.beginPath()
    this.ctx.arc(0, 0, this.holeRadius * 4, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.restore()

    // Draw black hole center
    this.ctx.save()
    this.ctx.translate(cx, cy)
    this.ctx.fillStyle = "#000000"
    this.ctx.shadowBlur = 20
    this.ctx.shadowColor = this.accretionColor
    this.ctx.beginPath()
    this.ctx.arc(0, 0, this.holeRadius, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Add event horizon glow inner edge
    this.ctx.strokeStyle = `rgba(${diskRgb.r}, ${diskRgb.g}, ${diskRgb.b}, 0.8)`
    this.ctx.lineWidth = 2
    this.ctx.stroke()
    this.ctx.restore()

    requestAnimationFrame(() => this.animate())
  }
}
