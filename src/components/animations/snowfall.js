export class SnowfallEffect {
  constructor(canvasId, color = "#ffffff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.snowflakes = []
    this.snowflakeCount = 100

    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initSnowflakes()
  }

  initSnowflakes() {
    this.snowflakes = []
    for (let i = 0; i < this.snowflakeCount; i++) {
      this.snowflakes.push(this.createSnowflake())
    }
  }

  createSnowflake() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * -this.canvas.height,
      size: Math.random() * 5 + 2,
      speedY: Math.random() * 1 + 0.5,
      speedX: Math.random() * 0.5 - 0.25,
      opacity: Math.random() * 0.6 + 0.4,
      swing: Math.random() * 1.5,
      swingSpeed: Math.random() * 0.03 + 0.01,
      swingOffset: Math.random() * Math.PI * 2,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 2 - 1,
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.initSnowflakes()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  drawSnowflake(snowflake) {
    this.ctx.save()
    this.ctx.translate(snowflake.x, snowflake.y)
    this.ctx.rotate((snowflake.rotation * Math.PI) / 180)

    const rgb = this.hexToRgb(this.color)
    this.ctx.globalAlpha = snowflake.opacity

    // Draw snowflake shape - 6 pointed star
    const armCount = 6
    const armLength = snowflake.size

    this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${snowflake.opacity})`
    this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${snowflake.opacity * 0.8})`
    this.ctx.lineWidth = snowflake.size * 0.15

    // Main arms
    for (let i = 0; i < armCount; i++) {
      const angle = (Math.PI * 2 * i) / armCount
      const x = Math.cos(angle) * armLength
      const y = Math.sin(angle) * armLength

      this.ctx.beginPath()
      this.ctx.moveTo(0, 0)
      this.ctx.lineTo(x, y)
      this.ctx.stroke()

      // Side branches
      const branchLength = armLength * 0.4
      const branchAngle1 = angle - Math.PI / 6
      const branchAngle2 = angle + Math.PI / 6

      this.ctx.beginPath()
      this.ctx.moveTo(x * 0.6, y * 0.6)
      this.ctx.lineTo(
        x * 0.6 + Math.cos(branchAngle1) * branchLength,
        y * 0.6 + Math.sin(branchAngle1) * branchLength,
      )
      this.ctx.stroke()

      this.ctx.beginPath()
      this.ctx.moveTo(x * 0.6, y * 0.6)
      this.ctx.lineTo(
        x * 0.6 + Math.cos(branchAngle2) * branchLength,
        y * 0.6 + Math.sin(branchAngle2) * branchLength,
      )
      this.ctx.stroke()
    }

    // Center circle
    this.ctx.beginPath()
    this.ctx.arc(0, 0, snowflake.size * 0.2, 0, Math.PI * 2)
    this.ctx.fill()

    this.ctx.restore()
  }

  animate(currentTime = 0) {
    if (!this.active) return

    requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.snowflakes.forEach((snowflake) => {
      // Update position
      snowflake.y += snowflake.speedY
      snowflake.rotation += snowflake.rotationSpeed

      // Swinging motion (sine wave)
      snowflake.swingOffset += snowflake.swingSpeed
      snowflake.x += Math.sin(snowflake.swingOffset) * snowflake.swing

      // Gentle horizontal drift
      snowflake.x += snowflake.speedX

      // Draw snowflake
      this.drawSnowflake(snowflake)

      // Reset snowflake when it goes off screen
      if (snowflake.y > this.canvas.height + 50) {
        snowflake.y = -50
        snowflake.x = Math.random() * this.canvas.width
        snowflake.opacity = Math.random() * 0.6 + 0.4
      }

      // Wrap horizontally
      if (snowflake.x > this.canvas.width + 50) {
        snowflake.x = -50
      } else if (snowflake.x < -50) {
        snowflake.x = this.canvas.width + 50
      }
    })
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 255, b: 255 }
  }
}
