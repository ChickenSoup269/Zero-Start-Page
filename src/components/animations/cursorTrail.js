export class CursorTrailEffect {
  constructor(
    canvasId,
    color = "#60c8ff",
    clickExplosion = true,
    randomColor = false,
  ) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.clickExplosion = clickExplosion
    this.randomColor = randomColor
    this.particles = []

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.mouseX = null
    this.mouseY = null

    this.resize()

    this.handleResize = () => this.resize()
    this.handleMouseMove = (e) => this.onMouseMove(e)
    this.handleMouseDown = (e) => this.onMouseDown(e)

    window.addEventListener("resize", this.handleResize)
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  onMouseMove(e) {
    if (!this.active) return
    this.mouseX = e.clientX
    this.mouseY = e.clientY
    this.addParticle()
  }

  onMouseDown(e) {
    if (!this.active || !this.clickExplosion) return
    this.mouseX = e.clientX
    this.mouseY = e.clientY
    this.explode()
  }

  explode() {
    if (this.mouseX === null || this.mouseY === null) return
    const staticColor = this.randomColor ? null : this.hexToRgb(this.color)

    for (let i = 0; i < 30; i++) {
      const size = Math.random() * 8 + 3
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 5 + 2
      const pColor = this.randomColor ? this.getRandomColor() : staticColor

      this.particles.push({
        x: this.mouseX,
        y: this.mouseY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        life: 1,
        decay: Math.random() * 0.015 + 0.01, // Slight slower decay for explosion
        color: pColor,
      })
    }
  }

  hslToRgb(h, s, l) {
    s /= 100
    l /= 100
    const k = (n) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4)),
    }
  }

  getRandomColor() {
    const timeHue = (Date.now() / 10) % 360
    const hue = (timeHue + Math.random() * 30 - 15) % 360
    return this.hslToRgb(hue, 100, 60)
  }

  addParticle() {
    if (this.mouseX === null || this.mouseY === null) return
    const staticColor = this.randomColor ? null : this.hexToRgb(this.color)

    for (let i = 0; i < 3; i++) {
      const size = Math.random() * 5 + 2
      const pColor = this.randomColor ? this.getRandomColor() : staticColor

      this.particles.push({
        x: this.mouseX,
        y: this.mouseY,
        vx: (Math.random() - 0.5) * 2.5,
        vy: (Math.random() - 0.5) * 2.5,
        size: size,
        life: 1,
        decay: Math.random() * 0.02 + 0.015,
        color: pColor,
      })
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
      : { r: 96, g: 200, b: 255 }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.particles = []
    window.addEventListener("mousemove", this.handleMouseMove)
    window.addEventListener("mousedown", this.handleMouseDown)
    this.canvas.style.display = "block"

    const animateLoop = (t) => {
      this.animate(t)
      if (this.active) {
        requestAnimationFrame(animateLoop)
      }
    }
    requestAnimationFrame(animateLoop)
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    if (!this.active) return
    this.active = false
    window.removeEventListener("mousemove", this.handleMouseMove)
    window.removeEventListener("mousedown", this.handleMouseDown)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  animate(currentTime = 0) {
    if (!this.active) return

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    // Fade effect instead of clearRect for trailing, but clearRect is better for this logic since we draw decreasing size
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.life -= p.decay

      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }

      const rgb = p.color
      const pSize = p.size * p.life

      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, pSize, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.life})`
      this.ctx.fill()

      // Glow calculation
      if (p.life > 0.1) {
        this.ctx.save()
        const glowRad = pSize * 3
        if (glowRad > 0) {
          const glowGrad = this.ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            glowRad,
          )
          glowGrad.addColorStop(
            0,
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.life * 0.5})`,
          )
          glowGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
          this.ctx.beginPath()
          this.ctx.arc(p.x, p.y, glowRad, 0, Math.PI * 2)
          this.ctx.fillStyle = glowGrad
          this.ctx.fill()
        }
        this.ctx.restore()
      }
    }
  }
}
