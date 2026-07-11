export class HyperspaceEffect {
  constructor(canvasId, color = "#00bcd4") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.stars = []
    this.numStars = 800
    this.speed = 2
    this.color = color
    this.active = false
    this.fov = 250
    this.centerX = 0
    this.centerY = 0

    this.resize = this.resize.bind(this)
    window.addEventListener("resize", this.resize)
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.centerX = this.canvas.width / 2
    this.centerY = this.canvas.height / 2
    this.initStars()
  }

  initStars() {
    this.stars = []
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push({
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 2000,
        z: Math.random() * 2000,
        prevZ: 0,
      })
    }
  }

  updateColor(color) {
    this.color = color
    this._rgb = {
      r: parseInt(this.color.slice(1, 3), 16),
      g: parseInt(this.color.slice(3, 5), 16),
      b: parseInt(this.color.slice(5, 7), 16)
    }
  }

  start() {
    if (this.active) return
    this.active = true
    if (!this._rgb) this.updateColor(this.color)
    this.resize()
    this.canvas.style.display = "block"
    this.animate()
  }

  stop() {
    this.active = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  animate() {
    if (!this.active) return
    this.animationId = requestAnimationFrame(() => this.animate())
    if (document.visibilityState === 'hidden') return

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw "road" or "tunnel" lines
    this.drawRoad()

    const { r, g, b } = this._rgb

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i]
      star.prevZ = star.z
      star.z -= this.speed

      if (star.z <= 0) {
        star.z = 2000
        star.prevZ = 2000
      }

      const scale = this.fov / star.z
      const x = this.centerX + star.x * scale
      const y = this.centerY + star.y * scale

      const prevScale = this.fov / star.prevZ
      const prevX = this.centerX + star.x * prevScale
      const prevY = this.centerY + star.y * prevScale

      const alpha = 1 - star.z / 2000
      this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
      this.ctx.lineWidth = scale * 2
      this.ctx.beginPath()
      this.ctx.moveTo(x, y)
      this.ctx.lineTo(prevX, prevY)
      this.ctx.stroke()
    }
  }

  drawRoad() {
    const time = Date.now() * 0.001
    const { r, g, b } = this._rgb

    this.ctx.lineWidth = 2
    
    // Draw 4 main perspective lines forming a square tunnel
    const tunnelSize = 400
    const points = [
      { x: -tunnelSize, y: -tunnelSize },
      { x: tunnelSize, y: -tunnelSize },
      { x: tunnelSize, y: tunnelSize },
      { x: -tunnelSize, y: tunnelSize }
    ]

    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      this.ctx.beginPath()
      this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.1)`
      this.ctx.moveTo(this.centerX, this.centerY)
      // Extend to the edges of the screen
      const angle = Math.atan2(p.y, p.x)
      const dist = Math.sqrt(this.canvas.width * this.canvas.width + this.canvas.height * this.canvas.height)
      this.ctx.lineTo(this.centerX + Math.cos(angle) * dist, this.centerY + Math.sin(angle) * dist)
      this.ctx.stroke()
    }

    // Draw rectangular segments moving towards viewer
    for (let z = 2000; z > 0; z -= 200) {
      const currentZ = (z - (time * 150) % 200)
      if (currentZ <= 0) continue
      
      const scale = this.fov / currentZ
      const size = tunnelSize * scale
      const alpha = (1 - currentZ / 2000) * 0.3
      
      this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
      this.ctx.strokeRect(this.centerX - size, this.centerY - size, size * 2, size * 2)
    }
  }
}
