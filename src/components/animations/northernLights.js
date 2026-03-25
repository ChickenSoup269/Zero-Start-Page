/**
 * Northern Lights (Aurora Borealis) Effect
 * Creates realistic aurora waves with flowing light and particle effects
 */

export class NorthernLightsEffect {
  constructor(canvasId, color = "#00ff88") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.animationId = null

    // Animation config
    this.waveCount = 3
    this.particleCount = 150
    this.baseY = 0.3 // Start 30% from top
    this.waveHeight = this.canvas.height * 0.4
    this.time = 0
    this.speed = 0.02

    // FPS control
    this.fps = 45
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    // Particles
    this.particles = []
    this._initParticles()

    // Resize handler
    this._resizeHandler = () => this._onResize()
    window.addEventListener("resize", this._resizeHandler)
    this._onResize()
  }

  _onResize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.baseY = this.canvas.height * 0.3
    this.waveHeight = this.canvas.height * 0.4
    this._initParticles()
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 255, b: 136 }
  }

  _initParticles() {
    this.particles = []
    const rgb = this._hexToRgb(this.color)

    for (let i = 0; i < this.particleCount; i++) {
      // Vary hue within aurora range (greenish-blue to purplish)
      const hueVariation = Math.random() * 120 - 60 // ±60 degrees
      const saturation = 60 + Math.random() * 40
      const lightness = 40 + Math.random() * 30

      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: this.baseY + (Math.random() - 0.5) * this.waveHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3,
        life: Math.random() * 0.5 + 0.5,
        maxLife: Math.random() * 0.5 + 0.5,
        size: Math.random() * 2 + 1,
        hue: hueVariation,
        sat: saturation,
        light: lightness,
      })
    }
  }

  _updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      // Update position
      p.x += p.vx
      p.y += p.vy

      // Apply wave motion
      const waveInfluence =
        Math.sin(this.time * 0.05 + p.x * 0.01) * 2 +
        Math.cos(this.time * 0.03 + p.y * 0.002) * 2

      p.vy -= waveInfluence * 0.01

      // Life cycle
      p.life -= 0.01
      if (p.life <= 0) {
        // Regenerate particle
        this.particles[i] = {
          x: Math.random() * this.canvas.width,
          y: this.baseY + (Math.random() - 0.5) * this.waveHeight,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.3,
          life: Math.random() * 0.5 + 0.5,
          maxLife: Math.random() * 0.5 + 0.5,
          size: Math.random() * 2 + 1,
          hue: Math.random() * 120 - 60,
          sat: 60 + Math.random() * 40,
          light: 40 + Math.random() * 30,
        }
      }

      // Wrap around screen
      if (p.x < -10) p.x = this.canvas.width + 10
      if (p.x > this.canvas.width + 10) p.x = -10
      if (p.y < -10) p.y = this.canvas.height + 10
      if (p.y > this.canvas.height + 10) p.y = -10
    }
  }

  _drawAurora() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    // Draw aurora glow gradient
    const gradient = ctx.createLinearGradient(
      0,
      this.baseY - this.waveHeight / 2,
      0,
      this.baseY + this.waveHeight / 2,
    )

    // Aurora wave effect with time-based animation
    const waveOffset = Math.sin(this.time * 0.03) * 30
    const centerY = this.baseY + waveOffset

    gradient.addColorStop(0, `rgba(0, 50, 100, 0)`)
    gradient.addColorStop(
      0.3,
      `hsla(${180 + Math.sin(this.time * 0.02) * 30}, 80%, 50%, 0.15)`,
    )
    gradient.addColorStop(
      0.5,
      `hsla(${160 + Math.sin(this.time * 0.015) * 40}, 90%, 60%, 0.25)`,
    )
    gradient.addColorStop(
      0.7,
      `hsla(${140 + Math.sin(this.time * 0.01) * 50}, 80%, 50%, 0.15)`,
    )
    gradient.addColorStop(1, `rgba(0, 50, 100, 0)`)

    ctx.fillStyle = gradient
    ctx.fillRect(0, centerY - this.waveHeight / 2, W, this.waveHeight)

    // Draw flowing aurora waves
    for (let wave = 0; wave < this.waveCount; wave++) {
      const phaseShift = (wave / this.waveCount) * Math.PI * 2
      const waveYOffset =
        Math.sin(phaseShift + this.time * 0.02) * (this.waveHeight * 0.3)
      const waveY = centerY + waveYOffset

      // Aurora wave ribbon
      ctx.beginPath()
      ctx.moveTo(0, waveY)

      for (let x = 0; x <= W; x += 20) {
        const y =
          waveY + Math.sin((x + this.time * 30) * 0.01 + phaseShift) * 40
        ctx.lineTo(x, y)
      }

      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.closePath()

      const hueShift = (wave / this.waveCount) * 60
      const glow = ctx.createLinearGradient(0, waveY - 40, 0, waveY + 40)
      glow.addColorStop(0, `hsla(${160 + hueShift}, 85%, 55%, 0)`)
      glow.addColorStop(0.5, `hsla(${160 + hueShift}, 90%, 65%, 0.2)`)
      glow.addColorStop(1, `hsla(${160 + hueShift}, 85%, 55%, 0)`)

      ctx.fillStyle = glow
      ctx.fill()
    }
  }

  _drawParticles() {
    const ctx = this.ctx

    this.particles.forEach((p) => {
      const opacity = (p.life / p.maxLife) * 0.6
      ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${opacity})`

      // Draw with glow
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()

      // Add outer glow
      ctx.strokeStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${opacity * 0.5})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size + 2, 0, Math.PI * 2)
      ctx.stroke()
    })
  }

  _draw(currentTime) {
    if (!this.active) return

    const elapsed = currentTime - this.lastDrawTime

    if (elapsed < this.fpsInterval) {
      this.animationId = requestAnimationFrame((t) => this._draw(t))
      return
    }

    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)
    this.time += this.speed

    // Clear canvas
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw effects
    this._drawAurora()
    this._updateParticles()
    this._drawParticles()

    this.animationId = requestAnimationFrame((t) => this._draw(t))
  }

  start() {
    if (this.active) return
    this.active = true
    this.time = 0
    this.lastDrawTime = 0
    this.canvas.style.display = "block"
    this.animationId = requestAnimationFrame((t) => this._draw(t))
  }

  stop() {
    this.active = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  setColor(newColor) {
    this.color = newColor
  }

  resize() {
    this._onResize()
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
  }
}
