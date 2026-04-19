export class TetFireworksEffect {
  constructor(
    canvasId,
    options = {}
  ) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.fireworks = []
    this.particles = []
    
    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    // Firework burst colors: festive reds, golds, greens
    this.fireworkColors = [
      "#FF2020",
      "#FF6030",
      "#FFD700",
      "#FF4500",
      "#FF69B4",
      "#00FF80",
      "#40E0D0",
      "#FF1493",
      "#FFA500",
      "#FFFACD",
      "#FF8C00",
      "#ADFF2F",
    ]

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  setOptions(options) {
    // No options to set anymore
  }

  resize() {
    if (!this.canvas) return
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  // ─── HD Fireworks ──────────────────────────────────────────────────────────

  launchFirework() {
    const x = this.canvas.width * (0.1 + Math.random() * 0.8)
    const targetY = this.canvas.height * (0.1 + Math.random() * 0.4)
    const color = this.fireworkColors[Math.floor(Math.random() * this.fireworkColors.length)]
    
    this.fireworks.push({
      x,
      y: this.canvas.height,
      targetY,
      speed: 7 + Math.random() * 5,
      color,
      trail: [],
      particlesCreated: false
    })
  }

  updateFirework(fw) {
    fw.trail.push({ x: fw.x, y: fw.y })
    if (fw.trail.length > 10) fw.trail.shift()
    
    fw.y -= fw.speed
    fw.speed *= 0.99
    
    if (fw.y <= fw.targetY || fw.speed < 1.5) {
      this.burst(fw)
      return true
    }
    return false
  }

  drawFirework(fw) {
    const ctx = this.ctx
    ctx.save()
    for (let i = 0; i < fw.trail.length; i++) {
      const alpha = (i / fw.trail.length) * 0.4
      const r = 1.5 * (i / fw.trail.length)
      ctx.beginPath()
      ctx.arc(fw.trail[i].x, fw.trail[i].y, r, 0, Math.PI * 2)
      ctx.fillStyle = fw.color
      ctx.globalAlpha = alpha
      ctx.fill()
    }
    
    ctx.beginPath()
    ctx.arc(fw.x, fw.y, 2, 0, Math.PI * 2)
    ctx.fillStyle = "#fff"
    ctx.fill()
    ctx.restore()
  }

  burst(fw) {
    // HD: Flash effect
    this.particles.push({
      x: fw.x,
      y: fw.y,
      isFlash: true,
      alpha: 1,
      decay: 0.1,
      size: 40
    })

    const count = 100 + Math.floor(Math.random() * 50) // More particles for HD
    const isSpecial = Math.random() < 0.3
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const speed = 2 + Math.random() * 7
      
      this.particles.push({
        x: fw.x,
        y: fw.y,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        color: isSpecial && Math.random() > 0.5 ? "#fff" : fw.color,
        alpha: 1,
        decay: 0.01 + Math.random() * 0.02,
        gravity: 0.08,
        friction: 0.97,
        size: 1.5 + Math.random() * 2,
        sparkle: Math.random() < 0.3,
        trail: []
      })
    }

    // Add glitter particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 3
      this.particles.push({
        x: fw.x,
        y: fw.y,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        color: "#fff",
        alpha: 1,
        decay: 0.005 + Math.random() * 0.01,
        gravity: 0.03,
        friction: 0.99,
        size: 1,
        sparkle: true,
        isGlitter: true
      })
    }
  }

  updateParticle(p) {
    if (p.isFlash) {
      p.alpha -= p.decay
      return p.alpha <= 0
    }

    p.speedX *= p.friction
    p.speedY *= p.friction
    p.speedY += p.gravity
    p.x += p.speedX
    p.y += p.speedY
    p.alpha -= p.decay
    
    if (p.sparkle) {
      p.visible = Math.random() > 0.2
    } else {
      p.visible = true
    }
    
    return p.alpha <= 0
  }

  drawParticle(p) {
    if (p.isFlash) {
      this.ctx.save()
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2)
      this.ctx.fillStyle = "rgba(255, 255, 255, " + (p.alpha * 0.5) + ")"
      this.ctx.fill()
      this.ctx.restore()
      return
    }

    if (!p.visible) return
    const ctx = this.ctx
    ctx.save()
    
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = p.color
    ctx.globalAlpha = p.alpha
    ctx.fill()
    
    if (p.alpha > 0.6 && !p.isGlitter) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2)
      ctx.fillStyle = "#fff"
      ctx.fill()
    }
    
    ctx.restore()
  }

  // ─── Loop ──────────────────────────────────────────────────────────────────

  animate(timestamp) {
    if (!this.active) return
    this._animId = requestAnimationFrame((ts) => this.animate(ts))

    const elapsed = timestamp - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = timestamp - (elapsed % this.fpsInterval)

    const ctx = this.ctx
    
    // Smooth trail effect
    ctx.globalCompositeOperation = "destination-out"
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)" // Increased trail persistence
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.globalCompositeOperation = "lighter" 

    // Launch fireworks
    if (Math.random() < 0.05) this.launchFirework()
    if (Math.random() < 0.01) this.launchFirework()

    // Draw & update fireworks
    this.fireworks = this.fireworks.filter((fw) => {
      this.drawFirework(fw)
      return !this.updateFirework(fw)
    })

    // Draw & update burst particles
    this.particles = this.particles.filter((p) => {
      this.drawParticle(p)
      return !this.updateParticle(p)
    })

    // Petal/lantern code removed
    ctx.globalCompositeOperation = "source-over"
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this.resize()
    this.lastDrawTime = 0
    this._animId = requestAnimationFrame((ts) => this.animate(ts))
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    this.canvas.style.display = "none"
    this.fireworks = []
    this.particles = []
  }
}
