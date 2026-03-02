export class StarFall {
  constructor(canvasId, color = "#ffffff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.stars = []
    this.active = false
    this.animationFrame = null
    this.starColor = color
    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this._parseColor(color)
    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.createStars()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
    this.stars = []
  }

  createStars() {
    const count = 120
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        length: Math.random() * 20 + 10,
        speed: Math.random() * 8 + 4,
        opacity: Math.random() * 0.5 + 0.3,
      })
    }
  }

  animate(currentTime = 0) {
    if (!this.active) return

    this.animationFrame = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const r = this._r
    const g = this._g
    const b = this._b

    // Batch all stars into two passes by opacity bucket (bright / dim)
    // to minimize state changes and stroke() calls
    this.ctx.lineWidth = 1

    // Pass 1: dim stars (opacity 0.3-0.5)
    this.ctx.beginPath()
    this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.35)`
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i]
      if (star.opacity < 0.55) {
        this.ctx.moveTo(star.x, star.y)
        this.ctx.lineTo(star.x, star.y + star.length)
      }
    }
    this.ctx.stroke()

    // Pass 2: bright stars (opacity 0.55-0.8)
    this.ctx.beginPath()
    this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.75)`
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i]
      if (star.opacity >= 0.55) {
        this.ctx.moveTo(star.x, star.y)
        this.ctx.lineTo(star.x, star.y + star.length)
      }
    }
    this.ctx.stroke()

    // Update positions
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i]
      star.y += star.speed
      if (star.y > this.canvas.height) {
        star.y = -star.length
        star.x = Math.random() * this.canvas.width
      }
    }
  }

  _parseColor(hex) {
    this._r = parseInt(hex.slice(1, 3), 16) || 255
    this._g = parseInt(hex.slice(3, 5), 16) || 255
    this._b = parseInt(hex.slice(5, 7), 16) || 255
  }

  updateColor(newColor) {
    this.starColor = newColor
    this._parseColor(newColor)
  }
}
