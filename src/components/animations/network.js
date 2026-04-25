export class NetworkEffect {
  constructor(canvasId, color = "#00bcd4") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.particles = []
    this.active = false
    this.color = color

    // Configuration
    this.particleCount = 100
    this.connectionDistance = 150
    this.mouseDistance = 180
    this.mouseForce = 0.15 // Attraction/Repulsion force factor
    
    this.pulseTime = 0
    this.fps = 60 // Higher FPS for smoother motion
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.resize()
    window.addEventListener("resize", () => this.resize())

    // Mouse tracking
    this.mouse = { x: null, y: null }
    this.handleMouseMove = (e) => {
      this.mouse.x = e.clientX
      this.mouse.y = e.clientY
    }
    this.handleMouseOut = () => {
      this.mouse.x = null
      this.mouse.y = null
    }
  }

  resize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth
      this.canvas.height = window.innerHeight
      if (this.active) this.createParticles()
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.rgb = this.hexToRgb(this.color)
    this.rgbStr = `${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b}`
    this.createParticles()
    window.addEventListener("mousemove", this.handleMouseMove)
    window.addEventListener("mouseout", this.handleMouseOut)
    this.canvas.style.display = "block"
    this.animate(0)
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    window.removeEventListener("mousemove", this.handleMouseMove)
    window.removeEventListener("mouseout", this.handleMouseOut)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.particles = []
    this.canvas.style.display = "none"
  }

  createParticles() {
    this.particles = []
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 2 + 1,
        baseSize: Math.random() * 2 + 1,
        brightness: Math.random() * 0.5 + 0.5,
        pulseOffset: Math.random() * Math.PI * 2
      })
    }
  }

  animate(currentTime = 0) {
    if (!this.active) return

    this._animId = requestAnimationFrame((t) => this.animate(t))
    if (document.visibilityState === 'hidden') return

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.pulseTime += 0.05

    const rgbStr = this.rgbStr
    const mouseRingPulse = 12 + Math.sin(this.pulseTime * 2) * 4

    // Update and draw connections first (background layer)
    this.ctx.lineWidth = 1
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i]
      
      // Connect to other particles
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j]
        const dx = p1.x - p2.x
        const dy = p1.y - p2.y
        const distSq = dx * dx + dy * dy
        const limitSq = this.connectionDistance * this.connectionDistance

        if (distSq < limitSq) {
          const dist = Math.sqrt(distSq)
          let opacity = (1 - dist / this.connectionDistance) * 0.4
          
          // Boost opacity if mouse is near the connection
          if (this.mouse.x !== null) {
            const midX = (p1.x + p2.x) / 2
            const midY = (p1.y + p2.y) / 2
            const mdx = this.mouse.x - midX
            const mdy = this.mouse.y - midY
            const mDistSq = mdx * mdx + mdy * mdy
            if (mDistSq < 10000) {
              const mDist = Math.sqrt(mDistSq)
              opacity *= (1 + (1 - mDist / 100) * 1.5)
            }
          }

          this.ctx.beginPath()
          this.ctx.strokeStyle = `rgba(${rgbStr}, ${opacity})`
          this.ctx.moveTo(p1.x, p1.y)
          this.ctx.lineTo(p2.x, p2.y)
          this.ctx.stroke()
        }
      }

      // Connect to mouse
      if (this.mouse.x !== null) {
        const dx = p1.x - this.mouse.x
        const dy = p1.y - this.mouse.y
        const distSq = dx * dx + dy * dy
        if (distSq < this.mouseDistance * this.mouseDistance) {
          const dist = Math.sqrt(distSq)
          const opacity = (1 - dist / this.mouseDistance) * 0.6
          this.ctx.beginPath()
          this.ctx.strokeStyle = `rgba(${rgbStr}, ${opacity})`
          this.ctx.lineWidth = 1.5
          this.ctx.moveTo(p1.x, p1.y)
          this.ctx.lineTo(this.mouse.x, this.mouse.y)
          this.ctx.stroke()
          this.ctx.lineWidth = 1
        }
      }
    }

    // Update and draw particles
    this.particles.forEach((p) => {
      // Mouse interaction: soft attraction
      if (this.mouse.x !== null) {
        const dx = this.mouse.x - p.x
        const dy = this.mouse.y - p.y
        const distSq = dx * dx + dy * dy
        
        if (distSq < this.mouseDistance * this.mouseDistance) {
          const dist = Math.sqrt(distSq)
          const proximity = 1 - dist / this.mouseDistance
          p.x += dx * proximity * this.mouseForce * 0.1
          p.y += dy * proximity * this.mouseForce * 0.1
          p.size = p.baseSize * (1 + proximity * 1.5)
        } else {
          p.size += (p.baseSize - p.size) * 0.1
        }
      } else {
        p.size += (p.baseSize - p.size) * 0.1
      }

      // Movement
      p.x += p.vx
      p.y += p.vy

      // Bounce
      if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1
      if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1

      // Draw particle with glow
      const finalPulse = Math.sin(this.pulseTime + p.pulseOffset) * 0.2 + 0.8
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size * finalPulse, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${rgbStr}, ${p.brightness})`
      this.ctx.fill()
      
      // Outer glow for nodes
      if (p.size > 2.5) {
        this.ctx.beginPath()
        this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
        this.ctx.fillStyle = `rgba(${rgbStr}, 0.1)`
        this.ctx.fill()
      }
    })

    // Draw mouse interactive ring
    if (this.mouse.x !== null) {
      this.ctx.beginPath()
      this.ctx.arc(this.mouse.x, this.mouse.y, 4, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${rgbStr}, 0.8)`
      this.ctx.fill()
      
      this.ctx.beginPath()
      this.ctx.arc(this.mouse.x, this.mouse.y, mouseRingPulse, 0, Math.PI * 2)
      this.ctx.strokeStyle = `rgba(${rgbStr}, 0.3)`
      this.ctx.lineWidth = 1
      this.ctx.stroke()
    }
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
