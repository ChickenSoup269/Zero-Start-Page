export class SakuraEffect {
  constructor(canvasId, color = "#ffb7c5") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.petals = []
    this.petalCount = 50

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initPetals()
  }

  initPetals() {
    this.petals = []
    for (let i = 0; i < this.petalCount; i++) {
      this.petals.push(this.createPetal())
    }
  }

  createPetal() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * -this.canvas.height,
      size: Math.random() * 8 + 4,
      speedY: Math.random() * 1.5 + 0.5,
      speedX: Math.random() * 0.5 - 0.25,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 4 - 2,
      opacity: Math.random() * 0.6 + 0.4,
      swing: Math.random() * 2 - 1,
      swingSpeed: Math.random() * 0.02 + 0.01,
      swingOffset: Math.random() * Math.PI * 2,
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.initPetals()
    this.animate()
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  drawPetal(petal) {
    this.ctx.save()
    this.ctx.translate(petal.x, petal.y)
    this.ctx.rotate((petal.rotation * Math.PI) / 180)

    const rgb = this.hexToRgb(this.color)

    // Draw petal shape (ellipse)
    this.ctx.globalAlpha = petal.opacity

    // Outer glow
    this.ctx.shadowBlur = 10
    this.ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`

    // Main petal body
    this.ctx.beginPath()
    this.ctx.ellipse(0, 0, petal.size, petal.size * 1.5, 0, 0, Math.PI * 2)
    this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${petal.opacity})`
    this.ctx.fill()

    // Add lighter center line for detail
    this.ctx.shadowBlur = 0
    this.ctx.beginPath()
    this.ctx.moveTo(0, -petal.size * 1.5)
    this.ctx.lineTo(0, petal.size * 1.5)
    this.ctx.strokeStyle = `rgba(${Math.min(rgb.r + 40, 255)}, ${Math.min(
      rgb.g + 40,
      255,
    )}, ${Math.min(rgb.b + 40, 255)}, ${petal.opacity * 0.6})`
    this.ctx.lineWidth = petal.size * 0.15
    this.ctx.stroke()

    // Add subtle edge highlight
    this.ctx.beginPath()
    this.ctx.ellipse(
      0,
      0,
      petal.size * 0.7,
      petal.size * 1.2,
      0,
      0,
      Math.PI * 2,
    )
    this.ctx.fillStyle = `rgba(255, 255, 255, ${petal.opacity * 0.3})`
    this.ctx.fill()

    this.ctx.restore()
  }

  animate() {
    if (!this.active) return

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.petals.forEach((petal) => {
      // Update position
      petal.y += petal.speedY
      petal.rotation += petal.rotationSpeed

      // Swinging motion (sine wave)
      petal.swingOffset += petal.swingSpeed
      petal.x += Math.sin(petal.swingOffset) * petal.swing

      // Gentle horizontal drift
      petal.x += petal.speedX

      // Draw petal
      this.drawPetal(petal)

      // Reset petal when it goes off screen
      if (petal.y > this.canvas.height + 50) {
        petal.y = -50
        petal.x = Math.random() * this.canvas.width
        petal.opacity = Math.random() * 0.6 + 0.4
      }

      // Wrap horizontally
      if (petal.x > this.canvas.width + 50) {
        petal.x = -50
      } else if (petal.x < -50) {
        petal.x = this.canvas.width + 50
      }
    })

    requestAnimationFrame(() => this.animate())
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 183, b: 197 }
  }
}
