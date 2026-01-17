// shootingStar.js

class Particle {
  constructor(x, y, size, color, vx, vy) {
    this.x = x
    this.y = y
    this.size = size
    this.color = color
    this.vx = vx
    this.vy = vy
    this.trail = []
    this.trailLength = 15 // Increase for a longer tail
  }

  update() {
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > this.trailLength) {
      this.trail.shift()
    }
    this.x += this.vx
    this.y += this.vy
  }

  draw(ctx) {
    // Draw trail
    for (let i = 0; i < this.trail.length; i++) {
      const trailPos = this.trail[i]
      const alpha = (i / this.trail.length) * 0.5 // Fading effect
      const trailSize = this.size * (i / this.trail.length)
      ctx.fillStyle = `rgba(${this.hexToRgb(this.color)}, ${alpha})`
      ctx.beginPath()
      ctx.arc(trailPos.x, trailPos.y, trailSize, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw head (the "dazzling" part)
    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.size
    )
    gradient.addColorStop(0, `rgba(${this.hexToRgb(this.color)}, 1)`)
    gradient.addColorStop(0.4, `rgba(${this.hexToRgb(this.color)}, 0.8)`)
    gradient.addColorStop(1, `rgba(${this.hexToRgb(this.color)}, 0)`)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
  }

  hexToRgb(hex) {
    let r = 0,
      g = 0,
      b = 0
    // 3 digits
    if (hex.length == 4) {
      r = "0x" + hex[1] + hex[1]
      g = "0x" + hex[2] + hex[2]
      b = "0x" + hex[3] + hex[3]
    }
    // 6 digits
    else if (hex.length == 7) {
      r = "0x" + hex[1] + hex[2]
      g = "0x" + hex[3] + hex[4]
      b = "0x" + hex[5] + hex[6]
    }
    return `${+r},${+g},${+b}`
  }
}

export class ShootingStarEffect {
  constructor(canvasId, color) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.width = (this.canvas.width = window.innerWidth)
    this.height = (this.canvas.height = window.innerHeight)
    this.particles = []
    this.color = color || "#ffcc66" // Fiery orange/yellow default
    this.animationFrameId = null
    this.maxParticles = 5 // Control the number of shooting stars

    window.addEventListener("resize", () => {
      this.width = this.canvas.width = window.innerWidth
      this.height = this.canvas.height = window.innerHeight
    })
  }

  createParticle() {
    const size = Math.random() * 3 + 2 // Size of the star head
    const speed = Math.random() * 4 + 2 // Faster speed
    const angle = Math.PI / 4 // Force a 45-degree angle for a classic shooting star look
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    // Start from a random position off-screen top/left
    const x = Math.random() * this.width - this.width / 2
    const y = Math.random() * this.height - this.height / 2
    this.particles.push(new Particle(x, y, size, this.color, vx, vy))
  }

  animate() {
    // This creates the "burning out" effect by slowly clearing the canvas
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.15)"
    this.ctx.fillRect(0, 0, this.width, this.height)

    if (this.particles.length < this.maxParticles && Math.random() < 0.05) {
      this.createParticle()
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.update()
      p.draw(this.ctx)

      // Remove particle if it's off screen
      if (p.x > this.width || p.y > this.height) {
        this.particles.splice(i, 1)
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate())
  }

  start() {
    if (!this.animationFrameId) {
      this.canvas.style.display = "block"
      this.animate()
    }
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
      this.ctx.clearRect(0, 0, this.width, this.height)
      this.canvas.style.display = "none"
      this.particles = [] // Clear particles when stopped
    }
  }

  updateColor(newColor) {
    this.color = newColor
    this.particles.forEach((p) => {
      p.color = newColor
    })
  }
}
