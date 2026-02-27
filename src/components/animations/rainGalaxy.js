export class StarFall {
  constructor(canvasId, color = "#ffffff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.stars = []
    this.active = false
    this.animationFrame = null
    this.starColor = color
    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
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
    const count = 100
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        length: Math.random() * 20 + 10,
        speed: Math.random() * 5 + 2,
        opacity: Math.random(),
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

    // Convert hex color to rgba for stroke style
    const r = parseInt(this.starColor.slice(1, 3), 16)
    const g = parseInt(this.starColor.slice(3, 5), 16)
    const b = parseInt(this.starColor.slice(5, 7), 16)

    this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`
    this.ctx.lineWidth = 1
    this.stars.forEach((star) => {
      this.ctx.beginPath()
      this.ctx.moveTo(star.x, star.y)
      this.ctx.lineTo(star.x, star.y + star.length)
      this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${star.opacity})` // Use custom color
      this.ctx.stroke()
      star.y += star.speed
      if (star.y > this.canvas.height) {
        star.y = -star.length
        star.x = Math.random() * this.canvas.width
      }
    })
  } // Added missing closing brace for animate method

  updateColor(newColor) {
    this.starColor = newColor
  }
}
