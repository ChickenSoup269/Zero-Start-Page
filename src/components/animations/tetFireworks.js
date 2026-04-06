export class TetFireworksEffect {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.fireworks = []
    this.particles = []
    this.petals = []

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

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initPetals()
  }

  // ─── Hoa Mai Petals ────────────────────────────────────────────────────────

  initPetals() {
    this.petals = []
    const count = Math.floor((this.canvas.width * this.canvas.height) / 50000)
    for (let i = 0; i < count; i++) {
      this.petals.push(this.createPetal(true))
    }
  }

  createPetal(scattered = false) {
    const size = 7 + Math.random() * 10
    return {
      x: Math.random() * this.canvas.width,
      y: scattered ? Math.random() * this.canvas.height : -size,
      size,
      color:
        this.petalColors[Math.floor(Math.random() * this.petalColors.length)],
      speedX: (Math.random() - 0.5) * 1.2,
      speedY: 0.6 + Math.random() * 1.0,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.05,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.02 + Math.random() * 0.02,
      swayAmp: 1 + Math.random() * 2,
      opacity: 0.7 + Math.random() * 0.3,
    }
  }

  drawPetal(p) {
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

  updatePetal(p) {
    p.sway += p.swaySpeed
    p.x += p.speedX + Math.sin(p.sway) * p.swayAmp
    p.y += p.speedY
    p.rotation += p.rotationSpeed
    if (p.y > this.canvas.height + p.size) {
      Object.assign(p, this.createPetal(false))
    }
  }

  // ─── Fireworks ─────────────────────────────────────────────────────────────

  launchFirework() {
    const x = this.canvas.width * (0.15 + Math.random() * 0.7)
    const targetY = this.canvas.height * (0.08 + Math.random() * 0.35)
    const color =
      this.fireworkColors[
        Math.floor(Math.random() * this.fireworkColors.length)
      ]
    this.fireworks.push({
      x,
      y: this.canvas.height,
      targetY,
      speed: 8 + Math.random() * 6,
      color,
      trail: [],
    })
  }

  updateFirework(fw) {
    fw.trail.push({ x: fw.x, y: fw.y })
    if (fw.trail.length > 12) fw.trail.shift()
    fw.y -= fw.speed
    if (fw.y <= fw.targetY) {
      this.burst(fw)
      return true // remove
    }
    return false
  }

  drawFirework(fw) {
    const ctx = this.ctx
    for (let i = 0; i < fw.trail.length; i++) {
      const alpha = (i / fw.trail.length) * 0.8
      const r = 2 * (i / fw.trail.length)
      ctx.beginPath()
      ctx.arc(fw.trail[i].x, fw.trail[i].y, r, 0, Math.PI * 2)
      ctx.fillStyle = fw.color
      ctx.globalAlpha = alpha
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  burst(fw) {
    const count = 65 + Math.floor(Math.random() * 35)
    const isRing = Math.random() < 0.25
    const isStar = Math.random() < 0.35
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const baseSpeed = isRing ? 3 + Math.random() * 0.5 : 1 + Math.random() * 5
      const speedX = Math.cos(angle) * baseSpeed
      const speedY = Math.sin(angle) * baseSpeed
      const color = isStar
        ? this.fireworkColors[
            Math.floor(Math.random() * this.fireworkColors.length)
          ]
        : fw.color
      this.particles.push({
        x: fw.x,
        y: fw.y,
        speedX,
        speedY,
        color,
        alpha: 1,
        decay: 0.012 + Math.random() * 0.018,
        gravity: 0.08 + Math.random() * 0.04,
        size: 1.5 + Math.random() * 2.5,
        tail: [],
      })
    }
    // Add a few gold sparkle rings (hào quang)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 12) * Math.PI * 2
      this.particles.push({
        x: fw.x,
        y: fw.y,
        speedX: Math.cos(angle) * (6 + Math.random() * 2),
        speedY: Math.sin(angle) * (6 + Math.random() * 2),
        color: "#FFD700",
        alpha: 1,
        decay: 0.025,
        gravity: 0.05,
        size: 3,
        tail: [],
      })
    }
  }

  updateParticle(p) {
    p.tail.push({ x: p.x, y: p.y })
    if (p.tail.length > 3) p.tail.shift()
    p.speedY += p.gravity
    p.x += p.speedX
    p.y += p.speedY
    p.speedX *= 0.97
    p.speedY *= 0.97
    p.alpha -= p.decay
    return p.alpha <= 0
  }

  drawParticle(p) {
    const ctx = this.ctx
    for (let i = 0; i < p.tail.length; i++) {
      const a = (i / p.tail.length) * p.alpha * 0.5
      ctx.beginPath()
      ctx.arc(
        p.tail[i].x,
        p.tail[i].y,
        p.size * (i / p.tail.length),
        0,
        Math.PI * 2,
      )
      ctx.fillStyle = p.color
      ctx.globalAlpha = a
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = p.color
    ctx.globalAlpha = p.alpha
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // ─── Loop ──────────────────────────────────────────────────────────────────

  animate(timestamp) {
    if (!this.active) return
    this._animId = requestAnimationFrame((ts) => this.animate(ts))

    const elapsed = timestamp - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = timestamp - (elapsed % this.fpsInterval)

    const ctx = this.ctx
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Launch fireworks — higher base chance + occasional double launch
    if (Math.random() < 0.07) this.launchFirework()
    if (Math.random() < 0.025) this.launchFirework()

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

    // Draw & update hoa mai petals
    for (const p of this.petals) {
      this.drawPetal(p)
      this.updatePetal(p)
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
  }
}
