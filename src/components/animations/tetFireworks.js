export class TetFireworksEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.fireworks = []
    this.particles = []
    
    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    // Firework burst colors: festive reds, golds, greens, and vibrant HD colors
    this.fireworkColors = [
      "#FF2020", "#FF6030", "#FFD700", "#FF4500", "#FF69B4", 
      "#00FF80", "#40E0D0", "#FF1493", "#FFA500", "#FFFACD", 
      "#FF8C00", "#ADFF2F", "#00FFFF", "#FFFFFF"
    ]

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  setOptions(options) {
    // Reserved for future options
  }

  resize() {
    if (!this.canvas) return
    this.width = window.innerWidth
    this.height = window.innerHeight
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = this.width * dpr
    this.canvas.height = this.height * dpr
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.ctx.scale(dpr, dpr)
  }

  // ─── HD Fireworks Logic ─────────────────────────────────────────────────────

  launchFirework() {
    const x = this.width * (0.15 + Math.random() * 0.7)
    const targetY = this.height * (0.1 + Math.random() * 0.35)
    const color = this.fireworkColors[Math.floor(Math.random() * this.fireworkColors.length)]
    
    this.fireworks.push({
      x,
      y: this.height,
      targetX: x + (Math.random() - 0.5) * 100,
      targetY,
      speed: 8 + Math.random() * 6,
      color,
      trail: [],
      size: 2
    })
  }

  updateFirework(fw) {
    fw.trail.push({ x: fw.x, y: fw.y })
    if (fw.trail.length > 8) fw.trail.shift()
    
    const dx = fw.targetX - fw.x
    const dy = fw.targetY - fw.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < 10 || fw.speed < 1.0) {
      this.burst(fw)
      return true
    }

    const angle = Math.atan2(dy, dx)
    fw.x += Math.cos(angle) * fw.speed
    fw.y += Math.sin(angle) * fw.speed
    fw.speed *= 0.985
    
    return false
  }

  drawFirework(fw) {
    const ctx = this.ctx
    ctx.save()
    
    // Draw trail
    ctx.beginPath()
    for (let i = 0; i < fw.trail.length; i++) {
      const p = fw.trail[i]
      const alpha = (i / fw.trail.length) * 0.5
      ctx.globalAlpha = alpha
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.strokeStyle = fw.color
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
    
    // Head
    ctx.globalAlpha = 1
    ctx.fillStyle = "#fff"
    ctx.beginPath()
    ctx.arc(fw.x, fw.y, fw.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  burst(fw) {
    // Initial HD Flash
    this.particles.push({
      x: fw.x,
      y: fw.y,
      isFlash: true,
      alpha: 1,
      decay: 0.15,
      size: 50
    })

    const type = Math.random()
    let count = 80 + Math.floor(Math.random() * 40)
    const isSpecial = Math.random() < 0.2

    if (type < 0.15) {
      // Ring burst
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2
        const speed = 4 + Math.random() * 2
        this.addParticle(fw.x, fw.y, angle, speed, fw.color)
      }
    } else if (type < 0.3) {
      // Double burst
      const subCount = Math.floor(count * 0.7)
      for (let i = 0; i < subCount; i++) {
        const angle = (i / subCount) * Math.PI * 2
        this.addParticle(fw.x, fw.y, angle, 3 + Math.random() * 1.5, fw.color)
        this.addParticle(fw.x, fw.y, angle, 5 + Math.random() * 1.5, "#ffffff")
      }
    } else {
      // Sphere burst
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.pow(Math.random(), 2) * 8 + 2
        this.addParticle(fw.x, fw.y, angle, speed, fw.color)
      }
    }

    // Extra glitter
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 4
      this.particles.push({
        x: fw.x,
        y: fw.y,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        color: "#ffffff",
        alpha: 1,
        decay: 0.01 + Math.random() * 0.02,
        gravity: 0.05,
        friction: 0.98,
        size: 0.8 + Math.random(),
        sparkle: true,
        isGlitter: true,
        trail: []
      })
    }
  }

  addParticle(x, y, angle, speed, color) {
    this.particles.push({
      x,
      y,
      speedX: Math.cos(angle) * speed,
      speedY: Math.sin(angle) * speed,
      color: color,
      alpha: 1,
      decay: 0.015 + Math.random() * 0.02,
      gravity: 0.07,
      friction: 0.96,
      size: 1.2 + Math.random() * 1.2,
      sparkle: Math.random() < 0.2,
      trail: []
    })
  }

  updateParticle(p) {
    if (p.isFlash) {
      p.alpha -= p.decay
      return p.alpha <= 0
    }

    p.trail.push({ x: p.x, y: p.y })
    if (p.trail.length > 3) p.trail.shift()

    p.speedX *= p.friction
    p.speedY *= p.friction
    p.speedY += p.gravity
    p.x += p.speedX
    p.y += p.speedY
    p.alpha -= p.decay
    
    return p.alpha <= 0
  }

  drawParticle(p) {
    const ctx = this.ctx
    if (p.isFlash) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.3})`
      ctx.fill()
      ctx.restore()
      return
    }

    ctx.save()
    if (p.trail.length > 1) {
      ctx.beginPath()
      ctx.globalAlpha = p.alpha * 0.4
      ctx.strokeStyle = p.color
      ctx.lineWidth = p.size
      ctx.moveTo(p.trail[0].x, p.trail[0].y)
      for (let i = 1; i < p.trail.length; i++) {
        ctx.lineTo(p.trail[i].x, p.trail[i].y)
      }
      ctx.stroke()
    }

    let alpha = p.alpha
    if (p.sparkle && Math.random() < 0.2) alpha = 0

    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()

    if (p.alpha > 0.7) {
        ctx.fillStyle = "#fff"
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2)
        ctx.fill()
    }
    ctx.restore()
  }

  animate(timestamp) {
    if (!this.active) return
    this._animId = requestAnimationFrame((ts) => this.animate(ts))
    if (document.visibilityState === "hidden") return

    const elapsed = timestamp - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = timestamp - (elapsed % this.fpsInterval)

    const ctx = this.ctx
    
    ctx.globalCompositeOperation = "destination-out"
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
    ctx.fillRect(0, 0, this.width, this.height)
    ctx.globalCompositeOperation = "lighter" 

    if (Math.random() < 0.02) this.launchFirework()
    if (Math.random() < 0.002) {
        for(let i=0; i<2; i++) setTimeout(() => {
          if (this.active) this.launchFirework()
        }, i * 300)
    }

    this.fireworks = this.fireworks.filter((fw) => {
      this.drawFirework(fw)
      return !this.updateFirework(fw)
    })

    this.particles = this.particles.filter((p) => {
      this.drawParticle(p)
      return !this.updateParticle(p)
    })

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
    if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }
}
