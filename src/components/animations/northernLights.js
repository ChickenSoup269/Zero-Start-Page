/**
 * Northern Lights (Aurora Borealis) Effect - Hỗ trợ đa chế độ (Classic Enhanced & HD)
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
        this.baseY = this.canvas.height * 0.5 
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

  // ================= CLASSIC MODE LOGIC (Enhanced) =================
  _initClassic() {
    this.planes = [
      { speed: 0.25, amp: 0.32, alpha: 0.35, hueOff: -15, phase: Math.random() * Math.PI * 2 },
      { speed: 0.45, amp: 0.25, alpha: 0.45, hueOff: 0, phase: Math.random() * Math.PI * 2 },
      { speed: 0.65, amp: 0.18, alpha: 0.35, hueOff: 25, phase: Math.random() * Math.PI * 2 },
      { speed: 0.90, amp: 0.12, alpha: 0.20, hueOff: 50, phase: Math.random() * Math.PI * 2 }
    ]
    const W = this.canvas.width
    const H = this.canvas.height
    this.rays = Array.from({ length: 6 }, (_, i) => ({
      x: (i / 5) * W * 1.1 - W * 0.05,
      yStart: H * 0.1,
      yEnd: H * 0.85,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.004 + 0.002,
      width: Math.random() * 20 + 5,
      alpha: Math.random() * 0.06 + 0.02,
    }))
    this.particles = Array.from({ length: 50 }, () => this._newParticleClassic(true))
  }

  _newParticleClassic(randomY = false) {
    const H = this.canvas.height
    return {
      x: Math.random() * this.canvas.width,
      y: randomY ? Math.random() * H : H * 0.5 + (Math.random() - 0.5) * H * 0.6,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(Math.random() * 0.5 + 0.1),
      life: randomY ? Math.random() * 0.9 + 0.1 : 1.0,
      size: Math.random() * 2.2 + 0.4,
      hueOff: (Math.random() - 0.5) * 50,
    }
  }

  _buildWavePtsClassic(W, H, baseY, phase, ampFrac) {
    const pts = []
    const segments = 16 // Tăng segments cho mượt hơn
    const step = W / segments
    for (let i = 0; i <= segments; i++) {
      const x = i * step
      // Công thức sóng phức hợp hơn (4 tầng Sin)
      const y = baseY +
        Math.sin(x * 0.0035 + phase) * H * ampFrac * 0.45 +
        Math.sin(x * 0.0070 + phase * 1.4) * H * ampFrac * 0.25 +
        Math.sin(x * 0.0015 + this.time * 0.5) * H * ampFrac * 0.15 +
        Math.cos(x * 0.0050 + phase * 0.8) * H * ampFrac * 0.10
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
    this.particles = Array.from({ length: 50 }, () => ({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        twinkleSpeed: 0.02 + Math.random() * 0.05,
        twinklePhase: Math.random() * Math.PI * 2
    }))
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
    if (document.visibilityState === 'hidden') return

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
      ctx.globalCompositeOperation = "source-over"
      // Nền tối huyền ảo
      ctx.fillStyle = "rgba(1, 4, 18, 0.3)"
      ctx.fillRect(0, 0, W, H)
      this._renderClassic(ctx, W, H)
    }
  }

  _renderHD(ctx, W, H) {
    ctx.globalCompositeOperation = "source-over"
    ctx.fillStyle = "rgb(2, 4, 15)"
    ctx.fillRect(0, 0, W, H)
    ctx.globalCompositeOperation = "screen"

    ctx.fillStyle = "rgba(255, 255, 255, 0.15)"
    for (let i = 0; i < 40; i++) {
        const x = (Math.sin(i * 123) * 0.5 + 0.5) * W
        const y = (Math.cos(i * 456) * 0.5 + 0.5) * H
        ctx.fillRect(x, y, 1.2, 1.2)
    }

    const brightness = this.brightness
    this.particles.forEach(p => {
        p.twinklePhase += p.twinkleSpeed
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        const op = (Math.sin(p.twinklePhase) * 0.5 + 0.5) * brightness * 0.6
        ctx.fillStyle = `rgba(255, 255, 255, ${op})`
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
    })

    this.curtains.forEach(curtain => {
      curtain.phase += curtain.speed
      const step = W / curtain.segments
      for (let i = 0; i < curtain.segments; i++) {
        const x = i * step
        const phaseVal = x * 0.002 + curtain.phase
        const yOff = Math.sin(phaseVal) * 40
        const opacity = (Math.sin(i * 0.5 + curtain.phase * 5) * 0.5 + 0.5) * curtain.opacity * brightness
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
    if (!this._cachedHsl) this._cachedHsl = this._hexToHsl(this.color)
    const { h: baseH, s: baseS, l: baseL } = this._cachedHsl
    const ss = Math.max(baseS, 50)
    const ll = Math.max(32, Math.min(baseL, 68))
    const brightness = this.brightness
    
    ctx.globalCompositeOperation = "lighter"

    // Rays (Pulsing Rays)
    for (const ray of this.rays) {
      ray.phase += ray.speed * 0.5
      const sinPhase = Math.sin(ray.phase)
      const xShift = sinPhase * 30
      const pulse = Math.sin(ray.phase * 1.2) * 0.5 + 0.5
      const hue = baseH + Math.sin(ray.phase * 0.5) * 25
      const a = ray.alpha * (0.3 + 0.7 * pulse) * brightness
      const rW = ray.width * (0.8 + 0.4 * pulse)

      const rg = ctx.createLinearGradient(ray.x + xShift, ray.yStart, ray.x + xShift, ray.yEnd)
      rg.addColorStop(0, `hsla(${hue},${ss}%,${ll + 10}%,0)`)
      rg.addColorStop(0.2, `hsla(${hue},${ss}%,${ll + 15}%,${a})`)
      rg.addColorStop(0.8, `hsla(${hue},${ss - 10}%,${ll - 10}%,${a * 0.4})`)
      rg.addColorStop(1, `hsla(${hue},${ss - 20}%,${ll - 25}%,0)`)
      ctx.fillStyle = rg
      ctx.fillRect(ray.x + xShift - rW * 0.5, ray.yStart, rW, ray.yEnd - ray.yStart)
    }

    // Aurora Planes (Enhanced Ribbons)
    this.planes.forEach((pl, pi) => {
      pl.phase += pl.speed * 0.015
      const bandY = H * 0.25 + (pi / (this.planes.length - 1)) * H * 0.45
      const pts = this._buildWavePtsClassic(W, H, bandY, pl.phase, pl.amp)
      const sinPhasePl = Math.sin(pl.phase * 0.2)
      const hue = baseH + pl.hueOff + sinPhasePl * 20
      const hue2 = (hue + 40) % 360
      const alp = pl.alpha * brightness

      // Lớp phát sáng rộng (Wide Glow)
      ctx.beginPath()
      ctx.moveTo(0, bandY - H * 0.25); ctx.lineTo(W, bandY - H * 0.25)
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      for (let i = pts.length - 2; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.closePath()
      const topGrad = ctx.createLinearGradient(0, bandY - H * 0.25, 0, bandY + H * pl.amp * 0.4)
      topGrad.addColorStop(0, `hsla(${hue},${ss}%,${ll - 10}%,0)`)
      topGrad.addColorStop(0.6, `hsla(${hue},${ss + 5}%,${ll + 5}%,${alp * 0.15})`)
      topGrad.addColorStop(1, `hsla(${hue2},${ss + 10}%,${ll + 10}%,0)`)
      ctx.fillStyle = topGrad; ctx.fill()

      // Dải lụa chính với Lõi Sáng (Main Ribbon with Core)
      const thickness = H * pl.amp * 0.32
      const rg = ctx.createLinearGradient(0, bandY - thickness * 0.8, 0, bandY + thickness * 1.2)
      rg.addColorStop(0, `hsla(${hue},${ss}%,${ll + 15}%,0)`)
      rg.addColorStop(0.25, `hsla(${hue},${ss + 10}%,${ll + 25}%,${alp * 0.6})`)
      rg.addColorStop(0.5, `hsla(${hue2},100%,${ll + 35}%,${alp})`) // Core sáng nhất
      rg.addColorStop(0.75, `hsla(${hue},${ss + 5}%,${ll + 15}%,${alp * 0.5})`)
      rg.addColorStop(1, `hsla(${hue},${ss - 15}%,${ll - 10}%,0)`)

      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2
        const my = (pts[i].y + pts[i + 1].y) / 2
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      ctx.strokeStyle = rg; ctx.lineWidth = thickness; ctx.stroke()
    })

    // Cinematic Particles
    const timeVal = this.time
    this.particles.forEach((p, i) => {
      p.x += p.vx + Math.sin(timeVal * 15 + p.x * 0.01) * 0.3
      p.y += p.vy; p.life -= 0.0025
      if (p.life <= 0 || p.y < -20) this.particles[i] = this._newParticleClassic(false)
      const opacity = p.life * 0.6 * brightness
      if (opacity > 0.02) {
          const hue = baseH + p.hueOff
          const pSize = p.size * (0.8 + 0.4 * Math.sin(timeVal * 5 + i))
          ctx.fillStyle = `hsla(${hue},${ss}%,${ll + 20}%,${opacity})`
          ctx.beginPath(); ctx.arc(p.x, p.y, pSize, 0, Math.PI * 2); ctx.fill()
          // Thêm halo nhẹ cho hạt sáng
          ctx.fillStyle = `hsla(${hue},${ss}%,${ll + 10}%,${opacity * 0.3})`
          ctx.beginPath(); ctx.arc(p.x, p.y, pSize * 2.5, 0, Math.PI * 2); ctx.fill()
      }
    })
  }


  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this._cachedHsl = this._hexToHsl(this.color)
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
    if (opts.color !== undefined) {
        this.color = opts.color
        this._cachedHsl = this._hexToHsl(this.color)
        if (this.style === "hd") this._initHD()
    }
    if (opts.style !== undefined && opts.style !== this.style) {
        this.style = opts.style
        this._onResize()
    }
    if (opts.brightness !== undefined) this.brightness = opts.brightness
  }
}
