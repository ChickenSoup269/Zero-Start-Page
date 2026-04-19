export class CursorTrailEffect {
  constructor(
    canvasId,
    color = "#60c8ff",
    clickExplosion = true,
    randomColor = false,
    style = "classic",
  ) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.color = color
    this.clickExplosion = clickExplosion
    this.randomColor = randomColor
    this.style = style
    this.particles = []

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.mouseX = null
    this.mouseY = null
    this.time = 0
    this.lastParticleTime = 0
    this.maxParticles = 200 // Giới hạn số lượng hạt tối đa

    this.resize()

    this.handleResize = () => this.resize()
    this.handleMouseMove = (e) => this.onMouseMove(e)
    this.handleMouseDown = (e) => this.onMouseDown(e)

    this.cachedColor = this.hexToRgb(this.color)

    window.addEventListener("resize", this.handleResize)
  }

  resize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth
      this.canvas.height = window.innerHeight
    }
  }

  setStyle(style) {
    this.style = style
    this.particles = [] // Clear existing particles when style changes
  }

  onMouseMove(e) {
    if (!this.active) return

    // Throttle: Chỉ tạo hạt tối đa mỗi 10ms để giảm tải khi vẩy chuột nhanh
    const now = performance.now()
    if (now - this.lastParticleTime < 10) {
      this.mouseX = e.clientX
      this.mouseY = e.clientY
      return
    }
    this.lastParticleTime = now

    this.mouseX = e.clientX
    this.mouseY = e.clientY

    if (this.style === "fire") {
      this.addFireParticles()
    } else {
      this.addParticle()
    }
  }

  onMouseDown(e) {
    if (!this.active || !this.clickExplosion) return
    this.mouseX = e.clientX
    this.mouseY = e.clientY
    this.explode()
  }

  explode() {
    if (this.mouseX === null || this.mouseY === null) return

    if (this.style === "fire") {
      // Fire explosion
      const count = Math.min(20, this.maxParticles - this.particles.length)
      for (let i = 0; i < count; i++) {
        this.particles.push(new FireParticle(this.mouseX, this.mouseY, true))
      }
      return
    }

    const staticColor = this.randomColor ? null : this.cachedColor
    const count = Math.min(30, this.maxParticles - this.particles.length)
    for (let i = 0; i < count; i++) {
      const size = Math.random() * 8 + 3
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 5 + 2
      const pColor = this.randomColor ? this.getRandomColor() : staticColor

      this.particles.push({
        type: "classic",
        x: this.mouseX,
        y: this.mouseY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        life: 1,
        decay: Math.random() * 0.015 + 0.01,
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
    if (this.particles.length >= this.maxParticles) return

    const staticColor = this.randomColor ? null : this.cachedColor

    for (let i = 0; i < 2; i++) {
      const size = Math.random() * 5 + 2
      const pColor = this.randomColor ? this.getRandomColor() : staticColor

      this.particles.push({
        type: "classic",
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

  addFireParticles() {
    if (this.mouseX === null || this.mouseY === null) return
    // Limit particles for performance
    if (this.particles.length < this.maxParticles) {
      for (let i = 0; i < 3; i++) {
        this.particles.push(new FireParticle(this.mouseX, this.mouseY, false))
      }
      if (Math.random() > 0.8) {
        this.particles.push(new EmberParticle(this.mouseX, this.mouseY))
      }
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
    this.cachedColor = this.hexToRgb(this.color) // Cập nhật màu cache khi bắt đầu
    window.addEventListener("mousemove", this.handleMouseMove)
    window.addEventListener("mousedown", this.handleMouseDown)
    this.canvas.style.display = "block"

    const animateLoop = (t) => {
      this.animate(t)
      if (this.active) {
        this._animId = requestAnimationFrame(animateLoop)
      }
    }
    requestAnimationFrame(animateLoop)
  }

  stop() {
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    if (!this.active) return
    this.active = false
    window.removeEventListener("mousemove", this.handleMouseMove)
    window.removeEventListener("mousedown", this.handleMouseDown)
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    this.particles = []
    this.canvas.style.display = "none"
  }

  animate(currentTime = 0) {
    if (!this.active) return

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    this.time += 0.05
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    if (this.style === "fire") {
      this.ctx.globalCompositeOperation = "lighter"
    } else {
      this.ctx.globalCompositeOperation = "source-over"
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      if (p.type === "fire") {
        p.update()
        p.draw(this.ctx)
      } else if (p.type === "ember") {
        p.update()
        p.draw(this.ctx)
      } else {
        // Classic style
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

        if (p.life > 0.1) {
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
              `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.life * 0.4})`,
            )
            glowGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
            this.ctx.beginPath()
            this.ctx.arc(p.x, p.y, glowRad, 0, Math.PI * 2)
            this.ctx.fillStyle = glowGrad
            this.ctx.fill()
          }
        }
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }
}

class FireParticle {
  constructor(x, y, isExplosion = false) {
    this.type = "fire"
    this.x = x + (Math.random() * 10 - 5)
    this.y = y + (Math.random() * 10 - 5)
    this.vx = isExplosion ? (Math.random() - 0.5) * 6 : (Math.random() - 0.5) * 1.2
    this.vy = isExplosion ? (Math.random() - 0.5) * 6 : (Math.random() * -2) - 1
    this.life = 1.0
    this.decay = isExplosion ? Math.random() * 0.03 + 0.02 : Math.random() * 0.04 + 0.02
    this.size = isExplosion ? Math.random() * 35 + 20 : Math.random() * 25 + 15
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.vy -= 0.05
    this.life -= this.decay
    this.currentSize = Math.max(0, this.size * this.life)
  }

  draw(ctx) {
    const r = this.currentSize
    if (r <= 0 || !Number.isFinite(r)) return

    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r)
    if (this.life > 0.6) {
      g.addColorStop(0, `rgba(255, 255, 200, ${this.life})`)
      g.addColorStop(1, `rgba(255, 150, 0, 0)`)
    } else {
      g.addColorStop(0, `rgba(200, 50, 0, ${this.life * 0.8})`)
      g.addColorStop(1, `rgba(100, 0, 0, 0)`)
    }
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

class EmberParticle {
  constructor(x, y) {
    this.type = "ember"
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 3
    this.vy = (Math.random() * -4) - 2
    this.life = 1.0
    this.decay = 0.02
    this.size = Math.random() * 2 + 1
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.life -= this.decay
  }

  draw(ctx) {
    if (this.life <= 0) return
    ctx.fillStyle = `rgba(255, 220, 100, ${this.life})`
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
  }
}
