/**
 * Northern Lights (Aurora Borealis) Effect - Phiên bản dịu sáng
 */

export class NorthernLightsEffect {
  constructor(canvasId, color = "#00ff88") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.color = color
    this.animationId = null
    this.time = 0

    // ================== CẤU HÌNH ĐÃ GIẢM SÁNG & SÓNG NHỎ ==================
    this.waveCount = 4 // tăng nhẹ để vẫn có chiều sâu
    this.particleCount = 45

    this.baseY = 0
    this.waveHeight = 0 // sẽ tính lại trong resize

    this.speed = 0.018 // chậm lại một chút cho cảm giác majestic

    this.brightness = 0.65 // ← GIẢM ĐỘ SÁNG CHÍNH (0.5 - 0.75 là đẹp)

    this.fps = 45 // giảm fps nhẹ để tiết kiệm pin
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    // Planes (far → near)
    this.planes = [
      {
        speed: 0.32,
        amp: 0.28,
        alpha: 0.42,
        hueOff: 0,
        phase: Math.random() * Math.PI * 2,
      },
      {
        speed: 0.55,
        amp: 0.22,
        alpha: 0.32,
        hueOff: 22,
        phase: Math.random() * Math.PI * 2,
      },
      {
        speed: 0.78,
        amp: 0.16,
        alpha: 0.24,
        hueOff: 48,
        phase: Math.random() * Math.PI * 2,
      },
      {
        speed: 1.05,
        amp: 0.11,
        alpha: 0.18,
        hueOff: 72,
        phase: Math.random() * Math.PI * 2,
      },
    ]

    this.rays = []
    this.particles = []

    this._resizeHandler = () => this._onResize()
    window.addEventListener("resize", this._resizeHandler)
    this._onResize()
  }

  _onResize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.baseY = this.canvas.height * 0.28
    this.waveHeight = this.canvas.height * 0.38
    this._initParticles()
    this._initRays()
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

  _hexToHsl(hex) {
    let { r, g, b } = this._hexToRgb(hex)
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b)
    let h,
      s,
      l = (max + min) / 2

    if (max === min) {
      h = s = 0
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }
    return { h: h * 360, s: s * 100, l: l * 100 }
  }

  _initRays() {
    const W = this.canvas.width
    this.rays = Array.from({ length: 5 }, (_, i) => ({
      x: (i / 4) * W * 1.15 - W * 0.08,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.005 + 0.0025,
      width: Math.random() * 16 + 4,
      alpha: Math.random() * 0.055 + 0.015,
    }))
  }

  _initParticles() {
    this.particles = Array.from({ length: this.particleCount }, () =>
      this._newParticle(true),
    )
  }

  _newParticle(randomY = false) {
    const H = this.canvas.height
    return {
      x: Math.random() * this.canvas.width,
      y: randomY
        ? Math.random() * H * 0.75
        : H * 0.65 + Math.random() * H * 0.3,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(Math.random() * 0.6 + 0.25),
      life: randomY ? Math.random() * 0.9 + 0.1 : 1.0,
      size: Math.random() * 1.8 + 0.5,
      hueOff: (Math.random() - 0.5) * 60,
    }
  }

  _updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx + Math.sin(this.time * 20 + p.x * 0.008) * 0.2
      p.y += p.vy
      p.life -= 0.0028

      if (p.life <= 0 || p.y < -20) {
        this.particles[i] = this._newParticle(false)
      }

      if (p.x < -20) p.x = this.canvas.width + 20
      if (p.x > this.canvas.width + 20) p.x = -20
    }
  }

  _buildWavePts(W, H, baseY, phase, ampFrac, segments = 14) {
    const pts = []
    const step = W / segments
    for (let i = 0; i <= segments; i++) {
      const x = i * step
      const y =
        baseY +
        Math.sin(x * 0.0038 + phase) * H * ampFrac * 0.48 +
        Math.sin(x * 0.0075 + phase * 1.35) * H * ampFrac * 0.26 +
        Math.sin(x * 0.0016 + this.time * 0.65) * H * ampFrac * 0.14

      pts.push({ x, y })
    }
    return pts
  }

  _drawAurora() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const { h: baseH, s: baseS, l: baseL } = this._hexToHsl(this.color)

    const ss = Math.max(baseS, 50)
    const ll = Math.max(32, Math.min(baseL, 68))

    // Update phase
    this.planes.forEach((pl) => (pl.phase += pl.speed * this.speed))

    for (let pi = 0; pi < this.planes.length; pi++) {
      const pl = this.planes[pi]
      const bandY = H * 0.12 + (pi / (this.planes.length - 1)) * H * 0.58
      const pts = this._buildWavePts(W, H, bandY, pl.phase, pl.amp)
      const hue = baseH + pl.hueOff + Math.sin(pl.phase * 0.3) * 18
      const hue2 = hue + 35

      const alp = pl.alpha * this.brightness

      // Upper soft glow
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(W, 0)
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      for (let i = pts.length - 2; i >= 0; i--) {
        ctx.lineTo(pts[i].x, pts[i].y)
      }
      ctx.closePath()

      const topGrad = ctx.createLinearGradient(
        0,
        0,
        0,
        bandY + H * pl.amp * 0.35,
      )
      topGrad.addColorStop(0, `hsla(${hue},${ss}%,${ll - 8}%,0)`)
      topGrad.addColorStop(
        0.6,
        `hsla(${hue},${ss + 4}%,${ll + 3}%,${alp * 0.12})`,
      )
      topGrad.addColorStop(1, `hsla(${hue2},${ss + 6}%,${ll + 8}%,0)`)
      ctx.fillStyle = topGrad
      ctx.fill()

      // Lower diffuse area
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2
        const my = (pts[i].y + pts[i + 1].y) / 2
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.closePath()

      const botGrad = ctx.createLinearGradient(0, bandY, 0, H * 0.95)
      botGrad.addColorStop(
        0,
        `hsla(${hue2},${ss - 5}%,${ll - 10}%,${alp * 0.22})`,
      )
      botGrad.addColorStop(
        0.45,
        `hsla(${hue},${ss - 15}%,${ll - 22}%,${alp * 0.07})`,
      )
      botGrad.addColorStop(1, `hsla(${hue},${ss - 40}%,${ll - 45}%,0)`)
      ctx.fillStyle = botGrad
      ctx.fill()

      // Main glowing ribbon (mỏng và dịu)
      const thickness = H * pl.amp * 0.28
      const rg = ctx.createLinearGradient(
        0,
        bandY - thickness * 0.8,
        0,
        bandY + thickness * 1.1,
      )
      rg.addColorStop(0, `hsla(${hue},${ss}%,${ll + 15}%,0)`)
      rg.addColorStop(0.3, `hsla(${hue},${ss + 8}%,${ll + 22}%,${alp * 0.55})`)
      rg.addColorStop(0.55, `hsla(${hue2},100%,${ll + 26}%,${alp * 0.85})`)
      rg.addColorStop(0.8, `hsla(${hue},${ss + 5}%,${ll + 12}%,${alp * 0.4})`)
      rg.addColorStop(1, `hsla(${hue},${ss - 10}%,${ll - 5}%,0)`)

      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2
        const my = (pts[i].y + pts[i + 1].y) / 2
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      ctx.strokeStyle = rg
      ctx.lineWidth = thickness
      ctx.lineCap = "round"
      ctx.stroke()
    }
  }

  _drawRays() {
    const ctx = this.ctx
    const H = this.canvas.height
    const { h: baseH, s: baseS, l: baseL } = this._hexToHsl(this.color)
    const ss = Math.max(baseS, 50)
    const ll = Math.max(32, Math.min(baseL, 68))

    for (const ray of this.rays) {
      ray.phase += ray.speed * this.speed * 25
      const xShift = Math.sin(ray.phase) * 25
      const hue = baseH + Math.sin(ray.phase * 0.55) * 20
      const a =
        ray.alpha * (0.4 + 0.6 * Math.sin(ray.phase * 1.1)) * this.brightness

      const rg = ctx.createLinearGradient(
        ray.x + xShift,
        0,
        ray.x + xShift,
        H * 0.68,
      )
      rg.addColorStop(0, `hsla(${hue},${ss}%,${ll + 5}%,0)`)
      rg.addColorStop(0.1, `hsla(${hue},${ss}%,${ll + 8}%,${a * 0.75})`)
      rg.addColorStop(0.7, `hsla(${hue},${ss - 12}%,${ll - 15}%,${a * 0.25})`)
      rg.addColorStop(1, `hsla(${hue},${ss - 25}%,${ll - 30}%,0)`)

      ctx.fillStyle = rg
      ctx.fillRect(ray.x + xShift - ray.width * 0.5, 0, ray.width, H * 0.68)
    }
  }

  _drawParticles() {
    const ctx = this.ctx
    const { h: baseH, s: baseS, l: baseL } = this._hexToHsl(this.color)
    const ss = Math.max(baseS, 50)
    const ll = Math.max(32, Math.min(baseL, 68))

    ctx.globalCompositeOperation = "screen"

    this.particles.forEach((p) => {
      const opacity = p.life * 0.48 * this.brightness
      if (opacity < 0.02) return

      const hue = baseH + p.hueOff

      ctx.save()
      ctx.globalAlpha = opacity
      ctx.fillStyle = `hsla(${hue},${ss}%,${ll + 12}%,1)`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
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

    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    // Background fade - tối hơn
    ctx.globalCompositeOperation = "source-over"
    ctx.fillStyle = "rgba(1, 2, 12, 0.35)"
    ctx.fillRect(0, 0, W, H)

    ctx.globalCompositeOperation = "lighter"

    this._drawRays()
    this._drawAurora()

    this._updateParticles()
    this._drawParticles()

    ctx.globalCompositeOperation = "source-over"

    this.animationId = requestAnimationFrame((t) => this._draw(t))
  }

  start() {
    if (this.active) return
    this.active = true
    this.time = 0
    this.lastDrawTime = performance.now()
    this.canvas.style.display = "block"
    this.animationId = requestAnimationFrame((t) => this._draw(t))
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  setColor(newColor) {
    this.color = newColor
  }

  setBrightness(value = 0.65) {
    this.brightness = Math.max(0.35, Math.min(1.1, value))
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
  }
}
