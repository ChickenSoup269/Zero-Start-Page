// shootingStar.js

function hexToRgb(hex) {
  if (!hex || typeof hex !== "string" || hex.charAt(0) !== "#") {
    return "0,0,0" // Return black for invalid input
  }
  hex = hex.slice(1)

  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }

  if (hex.length !== 6) {
    return "0,0,0" // Return black for invalid input
  }

  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return "0,0,0"
  }

  return `${r},${g},${b}`
}

class Particle {
  constructor(x, y, size, color, vx, vy) {
    this.x = x
    this.y = y
    this.size = size
    this.vx = vx
    this.vy = vy
    this.trail = []
    this.trailLength = 60 // Increased for longer comet-like trails
    this.sparks = [] // Array for burning sparks
    this.setColor(color)
  }

  setColor(hex) {
    this.color = hex
    this.rgbColor = hexToRgb(hex)
  }

  update() {
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > this.trailLength) {
      this.trail.shift()
    }
    this.x += this.vx
    this.y += this.vy

    // Update sparks
    this.sparks.forEach((spark, index) => {
      spark.life -= 1
      if (spark.life <= 0) {
        this.sparks.splice(index, 1)
        return
      }
      spark.x += spark.vx
      spark.y += spark.vy
    })

    // Add new sparks randomly
    if (Math.random() < 0.3) {
      for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
        this.sparks.push({
          x: this.x + (Math.random() - 0.5) * this.size,
          y: this.y + (Math.random() - 0.5) * this.size,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: Math.random() * 1 + 0.5,
          life: Math.random() * 20 + 10,
          maxLife: 30,
        })
      }
    }

    // Limit sparks to prevent performance issues
    if (this.sparks.length > 50) {
      this.sparks.splice(0, this.sparks.length - 50)
    }
  }

  draw(ctx) {
    // Add glow effect for dazzling light
    ctx.shadowColor = `rgba(${this.rgbColor}, 0.8)`
    ctx.shadowBlur = 15 // Glow blur

    // Draw trail with enhanced fading and longer comet effect
    for (let i = 0; i < this.trail.length; i++) {
      const trailPos = this.trail[i]
      const alpha = (i / this.trail.length) * 0.6 // Stronger fading effect
      const trailSize = this.size * (i / this.trail.length) * 1.2 // Slightly larger trail
      ctx.fillStyle = `rgba(${this.rgbColor}, ${alpha})`
      ctx.beginPath()
      ctx.arc(trailPos.x, trailPos.y, trailSize, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw head with fiery gradient for burning effect
    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.size * 1.5, // Larger radius for more dazzle
    )
    gradient.addColorStop(0, `rgba(255, 255, 255, 1)`) // White-hot center
    gradient.addColorStop(0.3, `rgba(${this.rgbColor}, 1)`) // Main color
    gradient.addColorStop(0.7, `rgba(${this.rgbColor}, 0.7)`) // Fading
    gradient.addColorStop(1, `rgba(255, 0, 0, 0)`) // Reddish burn-out

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2) // Larger head for chói lọi
    ctx.fill()

    // Reset shadow
    ctx.shadowBlur = 0
    ctx.shadowColor = "transparent"

    // Draw sparks for burning embers
    this.sparks.forEach((spark) => {
      const sparkAlpha = spark.life / spark.maxLife
      ctx.fillStyle = `rgba(255, ${200 - spark.life * 5}, 0, ${sparkAlpha})` // Fiery orange-red fade
      ctx.beginPath()
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2)
      ctx.fill()
    })
  }
}

export class ShootingStarEffect {
  constructor(canvasId, particleColor, bgColor, starColor) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.width = this.canvas.width = window.innerWidth
    this.height = this.canvas.height = window.innerHeight
    this.particles = []
    this.stars = [] // Array for tiny twinkling stars
    this.particleColor = particleColor || "#ffcc66" // Fiery orange/yellow default
    this.backgroundColor = bgColor || "rgba(0, 0, 0, 0.1)"
    this.starColor = starColor || "#ffffff"
    this.starRgbColor = hexToRgb(this.starColor)
    this.animationFrameId = null
    this.maxParticles = 20 // Increased for meteor shower effect
    this.maxStars = 200 // Number of tiny stars across the screen

    window.addEventListener("resize", () => {
      this.width = this.canvas.width = window.innerWidth
      this.height = this.canvas.height = window.innerHeight
      this.createStars() // Recreate stars on resize
    })

    this.createStars() // Initial creation of stars
  }

  createStars() {
    this.stars = []
    for (let i = 0; i < this.maxStars; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 1 + 0.5, // Tiny size
        alpha: Math.random() * 0.5 + 0.5, // Base alpha
        twinkleSpeed: Math.random() * 0.02 + 0.01, // Speed of twinkling
        twinklePhase: Math.random() * Math.PI * 2, // Random phase for variety
      })
    }
  }

  drawStars() {
    this.stars.forEach((star) => {
      // Twinkling effect by varying alpha
      const twinkle = Math.sin(star.twinklePhase) * 0.3 + star.alpha
      star.twinklePhase += star.twinkleSpeed
      if (star.twinklePhase > Math.PI * 2) star.twinklePhase -= Math.PI * 2

      this.ctx.fillStyle = `rgba(${this.starRgbColor}, ${twinkle})`
      this.ctx.beginPath()
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
      this.ctx.fill()
    })
  }

  createParticle() {
    const size = Math.random() * 3 + 2 // Larger size variance for dazzle
    const isFast = Math.random() < 0.5 // 50% chance for fast or slow
    const speed = isFast ? Math.random() * 6 + 4 : Math.random() * 2 + 1 // Fast: 4-10, Slow: 1-3
    // Angle for top-right to bottom-left: around 135° (3π/4) with variance (120°-150° or 2π/3 to 5π/6)
    const angle = (2 * Math.PI) / 3 + Math.random() * (Math.PI / 6)
    const vx = Math.cos(angle) * speed // Will be negative for leftward motion
    const vy = Math.sin(angle) * speed // Positive downward

    let x, y
    // Start from top-right area
    x = this.width - Math.random() * this.width * 0.3 - 50 // Concentrate right (high x)
    y = Math.random() * this.height * 0.1 - 100 // Start from top (low y)
    this.particles.push(new Particle(x, y, size, this.particleColor, vx, vy))
  }

  animate() {
    // Enhanced clearing for subtle trail persistence (hơi tàn)
    this.ctx.fillStyle = this.backgroundColor
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Draw tiny stars first as background
    this.drawStars()

    if (this.particles.length < this.maxParticles && Math.random() < 0.1) {
      // Higher chance for shower
      this.createParticle()
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.update()
      p.draw(this.ctx)

      // Remove particle if it's off screen (now checking left and top as well since direction is left-down)
      if (p.x < -p.size * 2 || p.y > this.height + p.size * 2) {
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
    if (!newColor) return
    this.particleColor = newColor
    this.particles.forEach((p) => {
      p.setColor(newColor)
    })
  }
  updateParticleColor(newColor) {
    this.updateColor(newColor)
  }

  updateBackgroundColor(newColor) {
    if (newColor) {
      this.backgroundColor = newColor
    }
  }

  updateStarColor(newColor) {
    if (newColor) {
      this.starColor = newColor
      this.starRgbColor = hexToRgb(this.starColor)
    }
  }
}
