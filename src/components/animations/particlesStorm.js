export class ParticlesStormEffect {
  constructor(canvasId, color = "#00bcd4") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.particles = []
    this.active = false
    this.color = color
    this.time = 0

    // Config
    this.particleCount = 150
    this.centerX = 0
    this.centerY = 0
    this.vortexStrength = 0.3
    this.turbulence = 0.05

    // FPS throttling
    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.resize()
    window.addEventListener("resize", () => this.resize())

    // Mouse interaction
    this.mouse = { x: null, y: null, isDown: false }
    window.addEventListener("mousemove", (e) => {
      this.mouse.x = e.x
      this.mouse.y = e.y
    })
    window.addEventListener("mousedown", () => {
      this.mouse.isDown = true
    })
    window.addEventListener("mouseup", () => {
      this.mouse.isDown = false
    })
    window.addEventListener("mouseout", () => {
      this.mouse.x = null
      this.mouse.y = null
      this.mouse.isDown = false
    })
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.centerX = this.canvas.width / 2
    this.centerY = this.canvas.height / 2
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.createParticles()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.particles = []
    this.canvas.style.display = "none"
  }

  createParticles() {
    this.particles = []
    for (let i = 0; i < this.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance =
        Math.random() * Math.max(this.canvas.width, this.canvas.height) * 0.6
      this.particles.push({
        x: this.centerX + Math.cos(angle) * distance,
        y: this.centerY + Math.sin(angle) * distance,
        vx: 0,
        vy: 0,
        size: Math.random() * 3 + 1,
        baseSize: Math.random() * 3 + 1,
        life: Math.random(),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        hue: Math.random() * 60 - 30, // Variation in color
      })
    }
  }

  animate(currentTime = 0) {
    if (!this.active) return

    requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    // Fade effect instead of clear
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.05)"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.time += 0.01

    // Dynamic center based on mouse or auto-move
    const targetCenterX =
      this.mouse.x || this.centerX + Math.sin(this.time * 0.5) * 100
    const targetCenterY =
      this.mouse.y || this.centerY + Math.cos(this.time * 0.7) * 100

    const rgb = this.hexToRgb(this.color)

    this.particles.forEach((p, index) => {
      // Vortex force towards center
      const dx = targetCenterX - p.x
      const dy = targetCenterY - p.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx)

      // Spiral force
      const spiralAngle = angle + Math.PI / 2
      const vortexForce = this.mouse.isDown ? 0.8 : this.vortexStrength

      p.vx += Math.cos(spiralAngle) * vortexForce + Math.cos(angle) * 0.1
      p.vy += Math.sin(spiralAngle) * vortexForce + Math.sin(angle) * 0.1

      // Turbulence
      p.vx += (Math.random() - 0.5) * this.turbulence
      p.vy += (Math.random() - 0.5) * this.turbulence

      // Apply velocity
      p.x += p.vx
      p.y += p.vy

      // Friction
      p.vx *= 0.95
      p.vy *= 0.95

      // Rotation
      p.rotation += p.rotationSpeed

      // Life cycle
      p.life += 0.005
      if (p.life > 1) p.life = 0

      // Size pulsing
      const pulse = Math.sin(p.life * Math.PI * 2) * 0.5 + 0.5
      p.size = p.baseSize * (0.5 + pulse * 0.5)

      // Reset if too far
      if (distance > Math.max(this.canvas.width, this.canvas.height)) {
        const angle = Math.random() * Math.PI * 2
        const spawnDist = Math.random() * 200 + 100
        p.x = targetCenterX + Math.cos(angle) * spawnDist
        p.y = targetCenterY + Math.sin(angle) * spawnDist
        p.vx = 0
        p.vy = 0
        p.life = 0
      }

      // Draw particle - simplified (no radialGradient per particle)
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.life * 0.3})`
      this.ctx.fill()

      // Core
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${Math.min(255, rgb.r + 50)}, ${Math.min(255, rgb.g + 50)}, ${Math.min(255, rgb.b + 50)}, ${p.life})`
      this.ctx.fill()

      // Draw connections to nearby particles
      for (let j = index + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j]
        const dx = p.x - p2.x
        const dy = p.y - p2.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 100) {
          this.ctx.beginPath()
          this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(1 - dist / 100) * 0.3})`
          this.ctx.lineWidth = 1
          this.ctx.moveTo(p.x, p.y)
          this.ctx.lineTo(p2.x, p2.y)
          this.ctx.stroke()
        }
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
      : { r: 0, g: 188, b: 212 }
  }
}
