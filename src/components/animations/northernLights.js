/**
 * Northern Lights (Aurora Borealis) Effect - Hỗ trợ đa chế độ (Classic & HD)
 */

export class NorthernLightsEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.color = options.color || "#00ff88"
    this.style = options.style || "hd" // 'classic' or 'hd'
    this.brightness = options.brightness || 0.8
    
    this.animationId = null
    this.time = 0
    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    // Các biến dùng chung
    this.curtains = []
    this.particles = []
    this.planes = []
    this.rays = []

    this._resizeHandler = () => this._onResize()
    window.addEventListener("resize", this._resizeHandler)
    this._onResize()
  }

  _onResize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    if (this.style === "classic") {
        this.baseY = this.canvas.height * 0.5 // Trọng tâm ở giữa
        this.waveHeight = this.canvas.height * 0.35
    }
    this._initStyles()
  }

  _initStyles() {
    if (this.style === "hd") {
      this._initHD()
    } else {
      this._initClassic()
    }
  }

  // ================= CLASSIC MODE LOGIC (Original Source) =================
  _initClassic() {
    this.planes = [
      { speed: 0.32, amp: 0.28, alpha: 0.42, hueOff: 0, phase: Math.random() * Math.PI * 2 },
      { speed: 0.55, amp: 0.22, alpha: 0.32, hueOff: 22, phase: Math.random() * Math.PI * 2 },
      { speed: 0.78, amp: 0.16, alpha: 0.24, hueOff: 48, phase: Math.random() * Math.PI * 2 },
      { speed: 1.05, amp: 0.11, alpha: 0.18, hueOff: 72, phase: Math.random() * Math.PI * 2 }
    ]
    const W = this.canvas.width
    const H = this.canvas.height
    this.rays = Array.from({ length: 5 }, (_, i) => ({
      x: (i / 4) * W * 1.15 - W * 0.08,
      yStart: H * 0.15, // Tia sáng bắt đầu từ 15% chiều cao
      yEnd: H * 0.8,    // Kết thúc ở 80%
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.005 + 0.0025,
      width: Math.random() * 16 + 4,
      alpha: Math.random() * 0.055 + 0.015,
    }))
    this.particles = Array.from({ length: 45 }, () => this._newParticleClassic(true))
  }

  _newParticleClassic(randomY = false) {
    const H = this.canvas.height
    return {
      x: Math.random() * this.canvas.width,
      y: randomY ? Math.random() * H : H * 0.5 + (Math.random() - 0.5) * H * 0.5,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(Math.random() * 0.4 + 0.1),
      life: randomY ? Math.random() * 0.9 + 0.1 : 1.0,
      size: Math.random() * 1.8 + 0.5,
      hueOff: (Math.random() - 0.5) * 60,
    }
  }

  _buildWavePtsClassic(W, H, baseY, phase, ampFrac) {
    const pts = []
    const segments = 14
    const step = W / segments
    for (let i = 0; i <= segments; i++) {
      const x = i * step
      const y = baseY +
        Math.sin(x * 0.0038 + phase) * H * ampFrac * 0.48 +
        Math.sin(x * 0.0075 + phase * 1.35) * H * ampFrac * 0.26 +
        Math.sin(x * 0.0016 + this.time * 0.65) * H * ampFrac * 0.14
      pts.push({ x, y })
    }
    return pts
  }

  // ================= HD MODE LOGIC =================
  _initHD() {
    const baseHsl = this._hexToHsl(this.color)
    this.curtains = []
    for (let i = 0; i < 3; i++) {
      this.curtains.push({
        y: this.canvas.height * (0.2 + i * 0.15),
        height: this.canvas.height * (0.4 + i * 0.1),
        baseHue: (baseHsl.h + i * 30) % 360,
        speed: 0.001 + Math.random() * 0.002,
        segments: 40,
        opacity: 0.3 - i * 0.05,
        phase: Math.random() * Math.PI * 2
      })
    }
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 255, b: 136 }
  }

  _hexToHsl(hex) {
    let { r, g, b } = this._hexToRgb(hex)
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h, s, l = (max + min) / 2
    if (max === min) h = s = 0
    else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }
    return { h: h * 360, s: s * 100, l: l * 100 }
  }

  // Draw Functions
  _draw(currentTime) {
    if (!this.active) return
    this.animationId = requestAnimationFrame((t) => this._draw(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)
    this.time += 0.01

    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    if (this.style === "hd") {
      ctx.clearRect(0, 0, W, H)
      this._renderHD(ctx, W, H)
    } else {
      // Classic Mode: Fade effect instead of clearRect
      ctx.globalCompositeOperation = "source-over"
      ctx.fillStyle = "rgba(1, 2, 12, 0.35)"
      ctx.fillRect(0, 0, W, H)
      this._renderClassic(ctx, W, H)
    }
  }

  _renderHD(ctx, W, H) {
    ctx.globalCompositeOperation = "source-over"
    ctx.fillStyle = "rgb(2, 4, 15)"
    ctx.fillRect(0, 0, W, H)
    ctx.globalCompositeOperation = "screen"

    // Stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)"
    for (let i = 0; i < 60; i++) {
        const x = (Math.sin(i * 123) * 0.5 + 0.5) * W
        const y = (Math.cos(i * 456) * 0.5 + 0.5) * H
        ctx.fillRect(x, y, 1.5, 1.5)
    }

    this.curtains.forEach(curtain => {
      curtain.phase += curtain.speed
      const step = W / curtain.segments
      for (let i = 0; i < curtain.segments; i++) {
        const x = i * step
        const yOff = Math.sin(x * 0.002 + curtain.phase) * 40
        const opacity = (Math.sin(i * 0.5 + curtain.phase * 5) * 0.5 + 0.5) * curtain.opacity * this.brightness
        const hue = (curtain.baseHue + Math.sin(i * 0.1 + curtain.phase) * 15) % 360
        const grad = ctx.createLinearGradient(x, curtain.y + yOff, x, curtain.y + yOff + curtain.height)
        grad.addColorStop(0, `hsla(${hue}, 80%, 50%, 0)`)
        grad.addColorStop(0.3, `hsla(${hue}, 90%, 60%, ${opacity})`)
        grad.addColorStop(1, `hsla(${hue}, 80%, 40%, 0)`)
        ctx.fillStyle = grad
        ctx.fillRect(x, curtain.y + yOff, step + 1, curtain.height)
      }
    })
  }

  _renderClassic(ctx, W, H) {
    const { h: baseH, s: baseS, l: baseL } = this._hexToHsl(this.color)
    const ss = Math.max(baseS, 50)
    const ll = Math.max(32, Math.min(baseL, 68))
    
    ctx.globalCompositeOperation = "lighter"

    // Rays
    for (const ray of this.rays) {
      ray.phase += ray.speed * 0.45
      const xShift = Math.sin(ray.phase) * 25
      const hue = baseH + Math.sin(ray.phase * 0.55) * 20
      const a = ray.alpha * (0.4 + 0.6 * Math.sin(ray.phase * 1.1)) * this.brightness
      const rg = ctx.createLinearGradient(ray.x + xShift, ray.yStart, ray.x + xShift, ray.yEnd)
      rg.addColorStop(0, `hsla(${hue},${ss}%,${ll + 5}%,0)`)
      rg.addColorStop(0.1, `hsla(${hue},${ss}%,${ll + 8}%,${a * 0.75})`)
      rg.addColorStop(0.7, `hsla(${hue},${ss - 12}%,${ll - 15}%,${a * 0.25})`)
      rg.addColorStop(1, `hsla(${hue},${ss - 25}%,${ll - 30}%,0)`)
      ctx.fillStyle = rg
      ctx.fillRect(ray.x + xShift - ray.width * 0.5, ray.yStart, ray.width, ray.yEnd - ray.yStart)
    }

    // Aurora Planes
    this.planes.forEach((pl, pi) => {
      pl.phase += pl.speed * 0.018
      // Cân chỉnh bandY xung quanh mức giữa (H * 0.5)
      const bandY = H * 0.25 + (pi / (this.planes.length - 1)) * H * 0.45
      const pts = this._buildWavePtsClassic(W, H, bandY, pl.phase, pl.amp)
      const hue = baseH + pl.hueOff + Math.sin(pl.phase * 0.3) * 18
      const hue2 = hue + 35
      const alp = pl.alpha * this.brightness

      // Soft glow
      ctx.beginPath()
      ctx.moveTo(0, bandY - H * 0.2); ctx.lineTo(W, bandY - H * 0.2)
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      for (let i = pts.length - 2; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.closePath()
      const topGrad = ctx.createLinearGradient(0, bandY - H * 0.2, 0, bandY + H * pl.amp * 0.35)
      topGrad.addColorStop(0, `hsla(${hue},${ss}%,${ll - 8}%,0)`)
      topGrad.addColorStop(0.6, `hsla(${hue},${ss + 4}%,${ll + 3}%,${alp * 0.12})`)
      topGrad.addColorStop(1, `hsla(${hue2},${ss + 6}%,${ll + 8}%,0)`)
      ctx.fillStyle = topGrad; ctx.fill()

      // Ribbon
      const thickness = H * pl.amp * 0.28
      const rg = ctx.createLinearGradient(0, bandY - thickness * 0.8, 0, bandY + thickness * 1.1)
      rg.addColorStop(0, `hsla(${hue},${ss}%,${ll + 15}%,0)`)
      rg.addColorStop(0.3, `hsla(${hue},${ss + 8}%,${ll + 22}%,${alp * 0.55})`)
      rg.addColorStop(0.55, `hsla(${hue2},100%,${ll + 26}%,${alp * 0.85})`)
      rg.addColorStop(0.8, `hsla(${hue},${ss + 5}%,${ll + 12}%,${alp * 0.4})`)
      rg.addColorStop(1, `hsla(${hue},${ss - 10}%,${ll - 5}%,0)`)
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2
        const my = (pts[i].y + pts[i + 1].y) / 2
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      ctx.strokeStyle = rg; ctx.lineWidth = thickness; ctx.stroke()
    })

    // Particles
    this.particles.forEach((p, i) => {
      p.x += p.vx + Math.sin(this.time * 20 + p.x * 0.008) * 0.2
      p.y += p.vy; p.life -= 0.0028
      if (p.life <= 0 || p.y < -20) this.particles[i] = this._newParticleClassic(false)
      const opacity = p.life * 0.48 * this.brightness
      if (opacity > 0.02) {
          ctx.fillStyle = `hsla(${baseH + p.hueOff},${ss}%,${ll + 12}%,${opacity})`
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
      }
    })
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.canvas.style.display = "block"
    this.animationId = requestAnimationFrame((t) => this._draw(t))
  }

  stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId)
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  setOptions(opts = {}) {
    if (opts.color !== undefined) this.color = opts.color
    if (opts.style !== undefined && opts.style !== this.style) {
        this.style = opts.style
        this._onResize() // Gọi resize để tính toán lại baseY/trọng tâm
    }
    if (opts.brightness !== undefined) this.brightness = opts.brightness
  }
}
