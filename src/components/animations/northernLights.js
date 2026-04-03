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
    this.particleCount = 50
    this.baseY = 0.3
    this.waveHeight = this.canvas.height * 0.4
    this.time = 0
    this.speed = 0.02

    // FPS control
    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    // Aurora curtain planes — far/mid/near at different speeds for depth
    // amp values normalized to reduce wave height and prevent lagging
    this.planes = [
      {
        speed: 0.38,
        amp: 0.35,
        alpha: 0.5,
        hueOff: 0,
        phase: Math.random() * Math.PI * 2,
      },
      {
        speed: 0.62,
        amp: 0.25,
        alpha: 0.36,
        hueOff: 28,
        phase: Math.random() * Math.PI * 2,
      },
      {
        speed: 0.9,
        amp: 0.16,
        alpha: 0.26,
        hueOff: 55,
        phase: Math.random() * Math.PI * 2,
      },
    ]

    // Vertical ray shafts
    this.rays = []

    // Particles
    this.particles = []

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
    let h, s
    const l = (max + min) / 2
    if (max === min) {
      h = s = 0
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
          break
        case g:
          h = ((b - r) / d + 2) / 6
          break
        case b:
          h = ((r - g) / d + 4) / 6
          break
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 }
  }

  _initRays() {
    const W = this.canvas.width
    this.rays = Array.from({ length: 6 }, (_, i) => ({
      x: (i / 5) * W * 1.1 - W * 0.05,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.006 + 0.003,
      width: Math.random() * 20 + 5,
      alpha: Math.random() * 0.07 + 0.02,
    }))
  }

  _initParticles() {
    this.particles = []
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this._newParticle(true))
    }
  }

  _newParticle(randomY = false) {
    const W = this.canvas.width
    const H = this.canvas.height
    return {
      x: Math.random() * W,
      y: randomY ? Math.random() * H : Math.random() * H * 0.7 + H * 0.3, // Spawn randomly across the lower 70% of screen height
      vx: (Math.random() - 0.5) * 0.6,
      vy: -(Math.random() * 0.8 + 0.3), // Drifting upward slightly faster
      life: randomY ? Math.random() : 1.0,
      maxLife: 1.0,
      size: Math.random() * 2.2 + 0.6, // slightly bigger particles for full screen
      hueOff: (Math.random() - 0.5) * 70,
    }
  }

  _updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      // Gentle horizontal sway driven by the wave time
      p.x += p.vx + Math.sin(this.time * 25 + p.x * 0.01) * 0.25
      p.y += p.vy

      // Particles live longer so they travel further up
      p.life -= 0.003
      if (p.life <= 0 || p.y < -10) {
        this.particles[i] = this._newParticle(false)
      }

      // Wrap horizontally
      if (p.x < -10) p.x = this.canvas.width + 10
      if (p.x > this.canvas.width + 10) p.x = -10
    }
  }

  // Build a smooth point array for an aurora wavefront using
  // multiple overlapping sine waves at different frequencies.
  _buildWavePts(W, H, baseY, phase, ampFrac, segments = 12) {
    const pts = []
    const step = W / segments
    for (let i = 0; i <= segments; i++) {
      const x = i * step
      const t = this.time
      const y =
        baseY +
        Math.sin(x * 0.004 + phase) * H * ampFrac * 0.5 +
        Math.sin(x * 0.008 + phase * 1.4 + 1.2) * H * ampFrac * 0.28 +
        Math.sin(x * 0.0018 + t * 30 * 0.022) * H * ampFrac * 0.15 +
        Math.cos(x * 0.006 + phase * 0.9 + 2.5) * H * ampFrac * 0.1
      pts.push({ x, y })
    }
    return pts
  }

  _drawAurora() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const { h: baseH, s: baseS, l: baseL } = this._hexToHsl(this.color)

    // Clamp saturation/lightness so the aurora still glows even with dark/grey picked colors
    const ss = Math.max(baseS, 45)
    const ll = Math.max(35, Math.min(baseL, 75))

    // Advance each plane's phase independently
    for (const pl of this.planes) {
      pl.phase += pl.speed * this.speed
    }

    // Draw back → front so nearer planes paint over far ones
    for (let pi = 0; pi < this.planes.length; pi++) {
      const pl = this.planes[pi]
      // Spread planes across the entire screen instead of a thin band
      const bandY = H * 0.15 + (pi / (this.planes.length - 1)) * H * 0.6
      const pts = this._buildWavePts(W, H, bandY, pl.phase, pl.amp)
      const hue = baseH + pl.hueOff + Math.sin(pl.phase * 0.35) * 22
      const hue2 = hue + 38 + Math.sin(pl.phase * 0.22) * 18
      const alp = pl.alpha
      // ── upper glow above the wavefront ──────────────────────────────────
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
        bandY + H * pl.amp * 0.4,
      )
      topGrad.addColorStop(0, `hsla(${hue},${ss}%,${ll - 5}%,0)`)
      topGrad.addColorStop(0.55, `hsla(${hue},${ss + 3}%,${ll}%,${alp * 0.15})`)
      topGrad.addColorStop(
        0.85,
        `hsla(${hue2},${ss + 5}%,${ll + 5}%,${alp * 0.28})`,
      )
      topGrad.addColorStop(1, `hsla(${hue2},${ss + 3}%,${ll}%,0)`)
      ctx.fillStyle = topGrad
      ctx.fill()

      // ── lower diffuse fade down to horizon ───────────────────────────────
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
      const botGrad = ctx.createLinearGradient(0, bandY, 0, H)
      botGrad.addColorStop(
        0,
        `hsla(${hue2},${ss - 3}%,${ll - 8}%,${alp * 0.26})`,
      )
      botGrad.addColorStop(
        0.35,
        `hsla(${hue2},${ss - 10}%,${ll - 18}%,${alp * 0.09})`,
      )
      botGrad.addColorStop(1, `hsla(${hue},${ss - 30}%,${ll - 32}%,0)`)
      ctx.fillStyle = botGrad
      ctx.fill()

      // ── glowing ribbon along the wavefront edge ──────────────────────────
      const midY = pts.reduce((s, p) => s + p.y, 0) / pts.length
      const thickness = H * pl.amp * 0.36

      const rg = ctx.createLinearGradient(
        0,
        midY - thickness,
        0,
        midY + thickness,
      )
      rg.addColorStop(0, `hsla(${hue},${ss}%,${ll + 12}%,0)`)
      rg.addColorStop(0.22, `hsla(${hue},${ss + 6}%,${ll + 18}%,${alp * 0.6})`)
      rg.addColorStop(0.44, `hsla(${hue2},100%,${ll + 24}%,${alp})`)
      rg.addColorStop(0.56, `hsla(${hue2},100%,${ll + 24}%,${alp})`)
      rg.addColorStop(0.78, `hsla(${hue},${ss + 5}%,${ll + 12}%,${alp * 0.5})`)
      rg.addColorStop(1, `hsla(${hue},${ss - 4}%,${ll}%,0)`)

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
    const ss = Math.max(baseS, 45)
    const ll = Math.max(35, Math.min(baseL, 75))

    for (const ray of this.rays) {
      ray.phase += ray.speed * this.speed * 30
      const xShift = Math.sin(ray.phase) * 38
      const hue = baseH + Math.sin(ray.phase * 0.6) * 28
      const a = ray.alpha * (0.5 + 0.5 * Math.sin(ray.phase * 1.2))
      const rg = ctx.createLinearGradient(
        ray.x + xShift,
        0,
        ray.x + xShift,
        H * 0.72,
      )
      rg.addColorStop(0, `hsla(${hue},${ss}%,${ll + 2}%,0)`)
      rg.addColorStop(0.08, `hsla(${hue},${ss}%,${ll + 2}%,${a})`)
      rg.addColorStop(0.6, `hsla(${hue},${ss - 6}%,${ll - 8}%,${a * 0.35})`)
      rg.addColorStop(1, `hsla(${hue},${ss - 10}%,${ll - 18}%,0)`)
      ctx.fillStyle = rg
      ctx.fillRect(ray.x + xShift - ray.width * 0.5, 0, ray.width, H * 0.72)
    }
  }

  _drawParticles() {
    const ctx = this.ctx
    const { h: baseH, s: baseS, l: baseL } = this._hexToHsl(this.color)
    const ss = Math.max(baseS, 45)
    const ll = Math.max(35, Math.min(baseL, 75))

    this.particles.forEach((p) => {
      const opacity = p.life * 0.55
      if (opacity < 0.01) return
      const hue = baseH + p.hueOff

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${hue},${ss}%,${ll + 8}%,${opacity})`
      ctx.fill()

      // soft outer glow ring
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size + 2, 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(${hue},${ss - 3}%,${ll + 2}%,${opacity * 0.4})`
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

    // Frame blend — soft trail without muddying colors
    ctx.globalCompositeOperation = "source-over"
    ctx.fillStyle = "rgba(0,0,0,0.30)"
    ctx.fillRect(0, 0, W, H)

    // Ray shafts sit behind the main curtain
    ctx.globalCompositeOperation = "lighter"
    this._drawRays()

    // Main aurora curtain
    this._drawAurora()

    // Particles float through the aurora
    this._updateParticles()
    this._drawParticles()

    // Reset blend mode
    ctx.globalCompositeOperation = "source-over"

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
