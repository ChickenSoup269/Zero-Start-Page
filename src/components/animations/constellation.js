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
    this.createStars()
    this.createConstellations()
    this.animate()
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.stars = []
    this.constellations = []
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

  animate() {
    if (!this.active) return

    // Dark background with slight fade
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.02)"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.time += 0.01
    const rgb = this.hexToRgb(this.color)

    // Draw constellations
    this.constellations.forEach((constellation, cIndex) => {
      // Draw lines between stars in constellation
      for (let i = 0; i < constellation.length; i++) {
        const star1 = constellation[i]
        const nextIndex = (i + 1) % constellation.length
        const star2 = constellation[nextIndex]

        const gradient = this.ctx.createLinearGradient(
          star1.x,
          star1.y,
          star2.x,
          star2.y,
        )
        const opacity = 0.3 + Math.sin(this.time * 2 + cIndex) * 0.2
        gradient.addColorStop(
          0,
          `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * star1.brightness})`,
        )
        gradient.addColorStop(
          0.5,
          `rgba(${rgb.r + 50}, ${rgb.g + 50}, ${rgb.b + 50}, ${opacity})`,
        )
        gradient.addColorStop(
          1,
          `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * star2.brightness})`,
        )

        this.ctx.beginPath()
        this.ctx.strokeStyle = gradient
        this.ctx.lineWidth = 1.5
        this.ctx.moveTo(star1.x, star1.y)
        this.ctx.lineTo(star2.x, star2.y)
        this.ctx.stroke()
      }

      // Draw constellation stars
      constellation.forEach((star, sIndex) => {
        const pulse = Math.sin(this.time * 3 + cIndex + sIndex) * 0.3 + 0.7
        const size = star.size * pulse

        // Outer glow
        const glowGradient = this.ctx.createRadialGradient(
          star.x,
          star.y,
          0,
          star.x,
          star.y,
          size * 4,
        )
        glowGradient.addColorStop(
          0,
          `rgba(${rgb.r + 80}, ${rgb.g + 80}, ${rgb.b + 80}, ${star.brightness * 0.8})`,
        )
        glowGradient.addColorStop(
          0.3,
          `rgba(${rgb.r + 40}, ${rgb.g + 40}, ${rgb.b + 40}, ${star.brightness * 0.4})`,
        )
        glowGradient.addColorStop(1, "rgba(255, 255, 255, 0)")

        this.ctx.beginPath()
        this.ctx.fillStyle = glowGradient
        this.ctx.arc(star.x, star.y, size * 4, 0, Math.PI * 2)
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
          this.ctx.strokeStyle = `rgba(${rgb.r + 100}, ${rgb.g + 100}, ${rgb.b + 100}, ${star.brightness * 0.5})`
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

    // Draw background stars with twinkling
    this.stars.forEach((star) => {
      // Update position
      star.x += star.vx
      star.y += star.vy

      // Wrap around screen
      if (star.x < 0) star.x = this.canvas.width
      if (star.x > this.canvas.width) star.x = 0
      if (star.y < 0) star.y = this.canvas.height
      if (star.y > this.canvas.height) star.y = 0

      // Twinkle effect
      star.twinklePhase += star.twinkleSpeed
      const twinkle = Math.sin(star.twinklePhase) * 0.5 + 0.5
      const brightness = star.brightness * twinkle

      // Check if mouse is near
      let mouseInfluence = 1
      if (this.mouse.x) {
        const dx = star.x - this.mouse.x
        const dy = star.y - this.mouse.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 150) {
          mouseInfluence = 1 + (1 - distance / 150) * 2
        }
      }

      const size = star.size * mouseInfluence

      // Draw star with glow
      const gradient = this.ctx.createRadialGradient(
        star.x,
        star.y,
        0,
        star.x,
        star.y,
        size * 2,
      )
      gradient.addColorStop(
        0,
        `rgba(${rgb.r + 100}, ${rgb.g + 100}, ${rgb.b + 100}, ${brightness})`,
      )
      gradient.addColorStop(
        0.5,
        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${brightness * 0.5})`,
      )
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)")

      this.ctx.beginPath()
      this.ctx.fillStyle = gradient
      this.ctx.arc(star.x, star.y, size * 2, 0, Math.PI * 2)
      this.ctx.fill()
    })

    // Draw shooting stars occasionally
    if (Math.random() > 0.98) {
      const shootingStar = {
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height * 0.3,
        vx: (Math.random() * 2 + 2) * (Math.random() > 0.5 ? 1 : -1),
        vy: Math.random() * 2 + 1,
        life: 1,
      }

      const animateShootingStar = () => {
        if (shootingStar.life <= 0) return

        shootingStar.x += shootingStar.vx
        shootingStar.y += shootingStar.vy
        shootingStar.life -= 0.02

        // Trail
        const gradient = this.ctx.createLinearGradient(
          shootingStar.x,
          shootingStar.y,
          shootingStar.x - shootingStar.vx * 20,
          shootingStar.y - shootingStar.vy * 20,
        )
        gradient.addColorStop(
          0,
          `rgba(255, 255, 255, ${shootingStar.life * 0.8})`,
        )
        gradient.addColorStop(
          0.5,
          `rgba(${rgb.r + 50}, ${rgb.g + 50}, ${rgb.b + 50}, ${shootingStar.life * 0.4})`,
        )
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)")

        this.ctx.beginPath()
        this.ctx.strokeStyle = gradient
        this.ctx.lineWidth = 3
        this.ctx.moveTo(shootingStar.x, shootingStar.y)
        this.ctx.lineTo(
          shootingStar.x - shootingStar.vx * 20,
          shootingStar.y - shootingStar.vy * 20,
        )
        this.ctx.stroke()

        requestAnimationFrame(animateShootingStar)
      }
      animateShootingStar()
    }

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
      : { r: 0, g: 188, b: 212 }
  }
}
