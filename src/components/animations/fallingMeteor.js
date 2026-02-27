export class FallingMeteor {
  constructor(canvasId, color = "#ffcc00") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.meteors = []
    this.active = false
    this.animationFrame = null
    this.meteorColor = color
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
    this.createMeteors()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
    this.meteors = []
  }

  createMeteors() {
    const count = 30
    for (let i = 0; i < count; i++) {
      this.meteors.push({
        // THAY ĐỔI Ở ĐÂY:
        // Math.random() * this.canvas.width: Rải đều theo chiều ngang màn hình
        // - (this.canvas.height * 0.5): Lùi về bên trái một chút để khi bay chéo xuống nó vẫn phủ được góc trái dưới
        x:
          Math.random() * (this.canvas.width + this.canvas.height * 0.5) -
          this.canvas.height * 0.5,

        y: Math.random() * this.canvas.height * 0.1 - 300, // Vẫn bắt đầu từ phía trên
        length: Math.random() * 60 + 20,
        speed: Math.random() * 2 + 1,
        angle: Math.PI / 4 + Math.random() * (Math.PI / 12),
        particles: [],
      })
    }
  }

  parseColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return { r, g, b }
  }

  brightenColor(rgb, factor = 0.5) {
    return {
      r: Math.min(255, rgb.r + (255 - rgb.r) * factor),
      g: Math.min(255, rgb.g + (255 - rgb.g) * factor),
      b: Math.min(255, rgb.b + (255 - rgb.b) * factor),
    }
  }

  darkenColor(rgb, factor = 0.5) {
    return {
      r: Math.max(0, rgb.r * factor),
      g: Math.max(0, rgb.g * factor),
      b: Math.max(0, rgb.b * factor),
    }
  }

  animate(currentTime = 0) {
    if (!this.active) return

    this.animationFrame = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const colorRgb = this.parseColor(this.meteorColor)
    const brightColor = this.brightenColor(colorRgb, 0.8)
    const midColor = colorRgb
    const darkColor = this.darkenColor(colorRgb, 0.6)

    this.meteors.forEach((meteor) => {
      const headX = meteor.x + Math.cos(meteor.angle) * meteor.length
      const headY = meteor.y + Math.sin(meteor.angle) * meteor.length
      const tailX = meteor.x
      const tailY = meteor.y

      const gradient = this.ctx.createLinearGradient(headX, headY, tailX, tailY)
      gradient.addColorStop(
        0,
        `rgba(${brightColor.r}, ${brightColor.g}, ${brightColor.b}, 1)`,
      )
      gradient.addColorStop(
        0.3,
        `rgba(${midColor.r}, ${midColor.g}, ${midColor.b}, 1)`,
      )
      gradient.addColorStop(
        0.6,
        `rgba(${darkColor.r}, ${darkColor.g}, ${darkColor.b}, 0.7)`,
      )
      gradient.addColorStop(
        1,
        `rgba(${darkColor.r}, ${darkColor.g}, ${darkColor.b}, 0)`,
      )

      this.ctx.beginPath()
      this.ctx.moveTo(tailX, tailY)
      this.ctx.lineTo(headX, headY)
      this.ctx.strokeStyle = gradient
      this.ctx.lineWidth = Math.random() * 2 + 3
      this.ctx.stroke()

      this.ctx.beginPath()
      this.ctx.arc(headX, headY, 2, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgb(${brightColor.r}, ${brightColor.g}, ${brightColor.b})`
      this.ctx.fill()

      meteor.particles.forEach((part, index) => {
        part.life -= 1
        if (part.life <= 0) {
          meteor.particles.splice(index, 1)
          return
        }
        const partColor = this.darkenColor(colorRgb, part.life / part.maxLife)
        this.ctx.beginPath()
        this.ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2)
        this.ctx.fillStyle = `rgba(${partColor.r}, ${partColor.g}, ${partColor.b}, ${part.life / part.maxLife})`
        this.ctx.fill()

        part.x += (Math.random() - 0.5) * 2 - Math.cos(meteor.angle) * 0.5
        part.y += (Math.random() - 0.5) * 2 - Math.sin(meteor.angle) * 0.5
      })

      for (let i = 0; i < 2; i++) {
        if (Math.random() < 0.6) {
          meteor.particles.push({
            x: headX + (Math.random() - 0.5) * 4,
            y: headY + (Math.random() - 0.5) * 4,
            size: Math.random() * 2 + 1,
            life: Math.random() * 25 + 15,
            maxLife: 40,
          })
        }
      }

      if (meteor.particles.length > 50) {
        meteor.particles.splice(0, meteor.particles.length - 50)
      }

      meteor.x += meteor.speed * Math.cos(meteor.angle)
      meteor.y += meteor.speed * Math.sin(meteor.angle)

      // Reset logic (Khi bay ra khỏi màn hình)
      if (
        meteor.y > this.canvas.height + meteor.length ||
        meteor.x > this.canvas.width + meteor.length
      ) {
        // THAY ĐỔI Ở ĐÂY:
        // Reset ngẫu nhiên trên toàn bộ chiều rộng + một phần bù trừ bên trái
        meteor.x =
          Math.random() * (this.canvas.width + this.canvas.height * 0.5) -
          this.canvas.height * 0.5

        meteor.y = -meteor.length - Math.random() * 300
        meteor.particles = []
      }
    })
  }

  updateColor(newColor) {
    this.meteorColor = newColor
  }
}
