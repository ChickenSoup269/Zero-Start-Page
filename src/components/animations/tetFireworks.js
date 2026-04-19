export class TetFireworksEffect {
  constructor(
    canvasId,
    options = { showPetals: true, petalType: "mai" }
  ) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.fireworks = []
    this.particles = []
    this.petals = []
    
    this.showPetals = options.showPetals !== undefined ? options.showPetals : true
    this.petalType = options.petalType || "mai" // 'mai' or 'lantern'

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    // Hoa mai colors: bright yellow + warm gold tones
    this.petalColors = [
      "#FFD700",
      "#FFC200",
      "#FFB800",
      "#FFE066",
      "#FFA500",
      "#FFCC00",
      "#FFF176",
      "#FFD54F",
    ]

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
    if (options.showPetals !== undefined) {
      const oldShow = this.showPetals
      this.showPetals = options.showPetals
      if (this.showPetals && !oldShow) {
        this.initPetals()
      }
    }
    if (options.petalType !== undefined) {
      const oldType = this.petalType
      this.petalType = options.petalType
      if (oldType !== this.petalType && this.showPetals) {
        this.initPetals()
      }
    }
  }

  resize() {
    if (!this.canvas) return
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    if (this.showPetals) this.initPetals()
  }

  // ─── Hoa Mai Petals / Lanterns ──────────────────────────────────────────────

  initPetals() {
    this.petals = []
    if (!this.showPetals) return
    
    const density = this.petalType === "lantern" ? 120000 : 50000
    const count = Math.floor((this.canvas.width * this.canvas.height) / density)
    for (let i = 0; i < count; i++) {
      this.petals.push(this.createPetal(true))
    }
  }

  createPetal(scattered = false) {
    const size = this.petalType === "lantern" 
      ? 15 + Math.random() * 10 
      : 7 + Math.random() * 10
      
    return {
      x: Math.random() * this.canvas.width,
      y: scattered ? Math.random() * this.canvas.height : -size * 2,
      size,
      color: this.petalType === "lantern" 
        ? "#e62e2e" 
        : this.petalColors[Math.floor(Math.random() * this.petalColors.length)],
      speedX: (Math.random() - 0.5) * (this.petalType === "lantern" ? 0.8 : 1.2),
      speedY: this.petalType === "lantern" ? 0.4 + Math.random() * 0.6 : 0.6 + Math.random() * 1.0,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * (this.petalType === "lantern" ? 0.02 : 0.05),
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.01 + Math.random() * 0.02,
      swayAmp: 1 + Math.random() * 2,
      opacity: 0.8 + Math.random() * 0.2,
      blink: Math.random() * Math.PI,
    }
  }

  drawPetal(p) {
    if (this.petalType === "lantern") {
      this.drawLantern(p)
    } else {
      this.drawMai(p)
    }
  }

  drawMai(p) {
    const ctx = this.ctx
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rotation)
    ctx.globalAlpha = p.opacity

    // 5-petal apricot blossom (hoa mai)
    const petals = 5
    const r1 = p.size
    const r2 = p.size * 0.38
    ctx.beginPath()
    for (let i = 0; i < petals; i++) {
      const angle = (i * Math.PI * 2) / petals - Math.PI / 2
      const nextAngle = angle + Math.PI / petals
      const cx1 = Math.cos(angle) * r1
      const cy1 = Math.sin(angle) * r1
      const cx2 = Math.cos(nextAngle) * r2
      const cy2 = Math.sin(nextAngle) * r2
      if (i === 0) ctx.moveTo(cx1, cy1)
      else ctx.lineTo(cx1, cy1)
      ctx.bezierCurveTo(
        cx1 + Math.cos(angle + 0.6) * r1 * 0.7,
        cy1 + Math.sin(angle + 0.6) * r1 * 0.7,
        cx2 + Math.cos(nextAngle - 0.6) * r2 * 2,
        cy2 + Math.sin(nextAngle - 0.6) * r2 * 2,
        cx2,
        cy2,
      )
    }
    ctx.closePath()
    ctx.fillStyle = p.color
    ctx.fill()

    // center stamen dot
    ctx.beginPath()
    ctx.arc(0, 0, p.size * 0.18, 0, Math.PI * 2)
    ctx.fillStyle = "#fff8dc"
    ctx.fill()

    ctx.restore()
  }

  drawLantern(p) {
    const ctx = this.ctx
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(Math.sin(p.sway) * 0.2) // Lồng đèn lắc nhẹ
    ctx.globalAlpha = p.opacity

    const w = p.size * 0.8
    const h = p.size
    
    // Lantern body
    ctx.beginPath()
    ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2)
    ctx.fillStyle = "#ff2a2a"
    ctx.fill()
    
    // Golden lines on lantern
    ctx.strokeStyle = "#ffd700"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-w * 0.5, -h)
    ctx.bezierCurveTo(-w * 0.2, -h, -w * 0.2, h, -w * 0.5, h)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(w * 0.5, -h)
    ctx.bezierCurveTo(w * 0.2, -h, w * 0.2, h, w * 0.5, h)
    ctx.stroke()
    
    // Top and bottom caps
    ctx.fillStyle = "#ffd700"
    ctx.fillRect(-w * 0.4, -h - 2, w * 0.8, 4)
    ctx.fillRect(-w * 0.4, h - 2, w * 0.8, 4)
    
    // Tassels (tua rua)
    ctx.beginPath()
    ctx.moveTo(0, h)
    ctx.lineTo(0, h + p.size * 0.6)
    ctx.strokeStyle = "#ffd700"
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.restore()
  }

  updatePetal(p) {
    p.sway += p.swaySpeed
    p.x += p.speedX + Math.sin(p.sway) * p.swayAmp
    p.y += p.speedY
    if (this.petalType === "mai") p.rotation += p.rotationSpeed
    
    if (p.y > this.canvas.height + p.size * 2) {
      Object.assign(p, this.createPetal(false))
    }
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

    // Draw & update petals/lanterns
    ctx.globalCompositeOperation = "source-over"
    if (this.showPetals) {
      for (const p of this.petals) {
        this.drawPetal(p)
        this.updatePetal(p)
      }
    }
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
    this.petals = []
  }
}
