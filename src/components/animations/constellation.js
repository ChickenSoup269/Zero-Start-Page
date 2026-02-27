export class ConstellationEffect {
  constructor(canvasId, color = "#00bcd4") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.time = 0

    // Config
    this.starCount = 120
    this.stars = []
    this.constellations = []
    this.shootingStars = []

    // FPS throttling
    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.resize()
    window.addEventListener("resize", () => {
      this.resize()
      if (this.active) this.createStars()
    })

    // Mouse interaction
    this.mouse = { x: null, y: null }
    window.addEventListener("mousemove", (e) => {
      this.mouse.x = e.x
      this.mouse.y = e.y
    })
    window.addEventListener("mouseout", () => {
      this.mouse.x = null
      this.mouse.y = null
    })
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.shootingStars = []
    this.createStars()
    this.createConstellations()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.stars = []
    this.constellations = []
    this.shootingStars = []
    this.canvas.style.display = "none"
  }

  createStars() {
    this.stars = []
    for (let i = 0; i < this.starCount; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random(),
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
      })
    }
  }

  createConstellations() {
    this.constellations = []
    const constellationCount = 8

    for (let i = 0; i < constellationCount; i++) {
      const centerX = Math.random() * this.canvas.width
      const centerY = Math.random() * this.canvas.height
      const starCount = Math.floor(Math.random() * 4) + 3 // 3-6 stars per constellation
      const constellation = []

      for (let j = 0; j < starCount; j++) {
        const angle = (j / starCount) * Math.PI * 2 + Math.random() * 0.5
        const distance = Math.random() * 100 + 50
        constellation.push({
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          size: Math.random() * 3 + 1.5,
          brightness: 0.8 + Math.random() * 0.2,
        })
      }

      this.constellations.push(constellation)
    }
  }

  animate(currentTime = 0) {
    if (!this.active) return

    requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    // Dark background with slight fade
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.02)"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.time += 0.01
    const rgb = this.hexToRgb(this.color)
    const rgbStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`
    const rgbBright = `${Math.min(255, rgb.r + 80)}, ${Math.min(255, rgb.g + 80)}, ${Math.min(255, rgb.b + 80)}`

    // Draw constellations
    this.constellations.forEach((constellation, cIndex) => {
      const opacity = 0.3 + Math.sin(this.time * 2 + cIndex) * 0.2

      // Draw lines between stars - simple rgba (no linearGradient)
      for (let i = 0; i < constellation.length; i++) {
        const star1 = constellation[i]
        const nextIndex = (i + 1) % constellation.length
        const star2 = constellation[nextIndex]

        this.ctx.beginPath()
        this.ctx.strokeStyle = `rgba(${rgbStr}, ${opacity})`
        this.ctx.lineWidth = 1
        this.ctx.moveTo(star1.x, star1.y)
        this.ctx.lineTo(star2.x, star2.y)
        this.ctx.stroke()
      }

      // Draw constellation stars - simple circles (no radialGradient)
      constellation.forEach((star, sIndex) => {
        const pulse = Math.sin(this.time * 3 + cIndex + sIndex) * 0.3 + 0.7
        const size = star.size * pulse

        // Outer glow (simple semi-transparent circle)
        this.ctx.beginPath()
        this.ctx.arc(star.x, star.y, size * 3, 0, Math.PI * 2)
        this.ctx.fillStyle = `rgba(${rgbBright}, ${star.brightness * 0.25})`
        this.ctx.fill()

        // Star core
        this.ctx.beginPath()
        this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`
        this.ctx.arc(star.x, star.y, size, 0, Math.PI * 2)
        this.ctx.fill()

        // Draw star rays
        for (let r = 0; r < 4; r++) {
          const angle = (r / 4) * Math.PI * 2 + this.time
          const rayLength = size * 3 * pulse

          this.ctx.beginPath()
          this.ctx.strokeStyle = `rgba(${rgbBright}, ${star.brightness * 0.4})`
          this.ctx.lineWidth = 1
          this.ctx.moveTo(star.x, star.y)
          this.ctx.lineTo(
            star.x + Math.cos(angle) * rayLength,
            star.y + Math.sin(angle) * rayLength,
          )
          this.ctx.stroke()
        }
      })
    })

    // Draw background stars - simple solid fill (no radialGradient)
    this.stars.forEach((star) => {
      star.x += star.vx
      star.y += star.vy

      if (star.x < 0) star.x = this.canvas.width
      if (star.x > this.canvas.width) star.x = 0
      if (star.y < 0) star.y = this.canvas.height
      if (star.y > this.canvas.height) star.y = 0

      star.twinklePhase += star.twinkleSpeed
      const twinkle = Math.sin(star.twinklePhase) * 0.5 + 0.5
      const brightness = star.brightness * twinkle

      let size = star.size
      if (this.mouse.x) {
        const dx = star.x - this.mouse.x
        const dy = star.y - this.mouse.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 150) {
          size *= 1 + (1 - distance / 150) * 1.5
        }
      }

      // Simple circle fill
      this.ctx.beginPath()
      this.ctx.arc(star.x, star.y, size, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${rgbStr}, ${brightness})`
      this.ctx.fill()
    })

    // Spawn shooting stars occasionally
    if (Math.random() > 0.98) {
      this.shootingStars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height * 0.3,
        vx: (Math.random() * 2 + 2) * (Math.random() > 0.5 ? 1 : -1),
        vy: Math.random() * 2 + 1,
        life: 1,
      })
    }

    // Draw & update shooting stars inline (no nested rAF)
    this.shootingStars = this.shootingStars.filter((s) => s.life > 0)
    this.shootingStars.forEach((s) => {
      s.x += s.vx
      s.y += s.vy
      s.life -= 0.02

      this.ctx.beginPath()
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${s.life * 0.8})`
      this.ctx.lineWidth = 2
      this.ctx.moveTo(s.x, s.y)
      this.ctx.lineTo(s.x - s.vx * 15, s.y - s.vy * 15)
      this.ctx.stroke()
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
      : { r: 0, g: 188, b: 212 }
  }
}
