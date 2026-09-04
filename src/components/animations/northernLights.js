/**
 * Northern Lights (Aurora Borealis) Effect
 *
 * 3 Display Styles:
 *  - Classic (Old): 100% original ribbon planes with pulsing rays and halo particles
 *  - HD Cinematic: 100% original vertical curtain columns with twinkling night stars
 *  - Ultra HD: Hyper-realistic volumetric aurora curtains with optical fluting,
 *              white-hot photon core filaments, spectral color harmonics & stardust
 *
 * Configurable Options:
 *  - Color, Style, Brightness, Speed, Stars & Stardust, Shooting Stars, Transparent Background
 */

export class NorthernLightsEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false

    // Options
    this.color = options.color || "#00ff88"
    this.style = options.style || "hd" // 'classic', 'hd', or 'ultra'
    this.brightness = options.brightness !== undefined ? options.brightness : 0.8
    this.speed = options.speed !== undefined ? options.speed : 1.0
    this.enableStars = options.stars !== false
    this.enableMeteors = options.meteors !== false
    this.transparent = options.transparent !== false

    this.animationId = null
    this.time = 0
    this.lastTime = 0

    // Entities
    this.curtainsHD = []
    this.particlesHD = []
    this.planesClassic = []
    this.raysClassic = []
    this.particlesClassic = []
    this.curtainsUltra = []
    this.starsUltra = []
    this.stardustUltra = []
    this.meteors = []

    this._cachedHsl = this._hexToHsl(this.color)

    this._resizeHandler = () => this._onResize()
    this._visibilityHandler = () => this._onVisibilityChange()

    window.addEventListener("resize", this._resizeHandler)
    document.addEventListener("visibilitychange", this._visibilityHandler)

    this._onResize()
  }

  _onResize() {
    if (!this.canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = Math.floor(this.width * dpr)
    this.canvas.height = Math.floor(this.height * dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`

    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.scale(dpr, dpr)

    this._initStyles()
  }

  _onVisibilityChange() {
    if (document.hidden) {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
        this.animationId = null
      }
    } else if (this.active && !this.animationId) {
      this.lastTime = performance.now()
      this.animationId = requestAnimationFrame((t) => this._draw(t))
    }
  }

  _initStyles() {
    if (this.style === "ultra") {
      this._initUltra()
    } else if (this.style === "hd") {
      this._initHD()
    } else {
      this._initClassic()
    }
  }

  // =========================================================================
  //  COLOR UTILITIES
  // =========================================================================

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
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
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

  // =========================================================================
  //  CLASSIC MODE (100% ORIGINAL AESTHETIC)
  // =========================================================================

  _initClassic() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    this.planesClassic = [
      { speed: 0.25, amp: 0.32, alpha: 0.35, hueOff: -15, phase: Math.random() * Math.PI * 2 },
      { speed: 0.45, amp: 0.25, alpha: 0.45, hueOff: 0, phase: Math.random() * Math.PI * 2 },
      { speed: 0.65, amp: 0.18, alpha: 0.35, hueOff: 25, phase: Math.random() * Math.PI * 2 },
      { speed: 0.9, amp: 0.12, alpha: 0.2, hueOff: 50, phase: Math.random() * Math.PI * 2 },
    ]

    this.raysClassic = Array.from({ length: 6 }, (_, i) => ({
      x: (i / 5) * W * 1.1 - W * 0.05,
      yStart: H * 0.1,
      yEnd: H * 0.85,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.004 + 0.002,
      width: Math.random() * 20 + 5,
      alpha: Math.random() * 0.06 + 0.02,
    }))

    this.particlesClassic = Array.from({ length: 50 }, () =>
      this._newParticleClassic(W, H, true),
    )
  }

  _newParticleClassic(W, H, randomY = false) {
    return {
      x: Math.random() * W,
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
    const segments = 16
    const step = W / segments
    for (let i = 0; i <= segments; i++) {
      const x = i * step
      const y =
        baseY +
        Math.sin(x * 0.0035 + phase) * H * ampFrac * 0.45 +
        Math.sin(x * 0.007 + phase * 1.4) * H * ampFrac * 0.25 +
        Math.sin(x * 0.0015 + this.time * 0.5) * H * ampFrac * 0.15 +
        Math.cos(x * 0.005 + phase * 0.8) * H * ampFrac * 0.1
      pts.push({ x, y })
    }
    return pts
  }

  _renderClassic(ctx, W, H, dt) {
    if (!this._cachedHsl) this._cachedHsl = this._hexToHsl(this.color)
    const { h: baseH, s: baseS, l: baseL } = this._cachedHsl
    const ss = Math.max(baseS, 50)
    const ll = Math.max(32, Math.min(baseL, 68))
    const brightness = this.brightness

    if (!this.transparent) {
      ctx.globalCompositeOperation = "source-over"
      ctx.fillStyle = "rgba(1, 4, 18, 0.3)"
      ctx.fillRect(0, 0, W, H)
    }

    ctx.globalCompositeOperation = "lighter"

    // Rays
    for (let r = 0; r < this.raysClassic.length; r++) {
      const ray = this.raysClassic[r]
      ray.phase += ray.speed * 0.5 * dt * this.speed
      const sinPhase = Math.sin(ray.phase)
      const xShift = sinPhase * 30
      const pulse = Math.sin(ray.phase * 1.2) * 0.5 + 0.5
      const hue = (baseH + Math.sin(ray.phase * 0.5) * 25 + 360) % 360
      const a = ray.alpha * (0.3 + 0.7 * pulse) * brightness
      const rW = ray.width * (0.8 + 0.4 * pulse)

      const rg = ctx.createLinearGradient(
        ray.x + xShift,
        ray.yStart,
        ray.x + xShift,
        ray.yEnd,
      )
      rg.addColorStop(0, `hsla(${hue},${ss}%,${ll + 10}%,0)`)
      rg.addColorStop(0.2, `hsla(${hue},${ss}%,${ll + 15}%,${a})`)
      rg.addColorStop(0.8, `hsla(${hue},${ss - 10}%,${ll - 10}%,${a * 0.4})`)
      rg.addColorStop(1, `hsla(${hue},${ss - 20}%,${ll - 25}%,0)`)
      ctx.fillStyle = rg
      ctx.fillRect(
        ray.x + xShift - rW * 0.5,
        ray.yStart,
        rW,
        ray.yEnd - ray.yStart,
      )
    }

    // Ribbons
    for (let pi = 0; pi < this.planesClassic.length; pi++) {
      const pl = this.planesClassic[pi]
      pl.phase += pl.speed * 0.015 * dt * this.speed
      const bandY = H * 0.25 + (pi / (this.planesClassic.length - 1)) * H * 0.45
      const pts = this._buildWavePtsClassic(W, H, bandY, pl.phase, pl.amp)
      const sinPhasePl = Math.sin(pl.phase * 0.2)
      const hue = (baseH + pl.hueOff + sinPhasePl * 20 + 360) % 360
      const hue2 = (hue + 40) % 360
      const alp = pl.alpha * brightness

      // Top Glow
      ctx.beginPath()
      ctx.moveTo(0, bandY - H * 0.25)
      ctx.lineTo(W, bandY - H * 0.25)
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      for (let i = pts.length - 2; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.closePath()

      const topGrad = ctx.createLinearGradient(
        0,
        bandY - H * 0.25,
        0,
        bandY + H * pl.amp * 0.4,
      )
      topGrad.addColorStop(0, `hsla(${hue},${ss}%,${ll - 10}%,0)`)
      topGrad.addColorStop(0.6, `hsla(${hue},${ss + 5}%,${ll + 5}%,${alp * 0.15})`)
      topGrad.addColorStop(1, `hsla(${hue2},${ss + 10}%,${ll + 10}%,0)`)
      ctx.fillStyle = topGrad
      ctx.fill()

      // Main Ribbon
      const thickness = H * pl.amp * 0.32
      const rg = ctx.createLinearGradient(
        0,
        bandY - thickness * 0.8,
        0,
        bandY + thickness * 1.2,
      )
      rg.addColorStop(0, `hsla(${hue},${ss}%,${ll + 15}%,0)`)
      rg.addColorStop(0.25, `hsla(${hue},${ss + 10}%,${ll + 25}%,${alp * 0.6})`)
      rg.addColorStop(0.5, `hsla(${hue2},100%,${ll + 35}%,${alp})`)
      rg.addColorStop(0.75, `hsla(${hue},${ss + 5}%,${ll + 15}%,${alp * 0.5})`)
      rg.addColorStop(1, `hsla(${hue},${ss - 15}%,${ll - 10}%,0)`)

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
      ctx.stroke()
    }

    // Particles
    if (this.enableStars) {
      const timeVal = this.time
      for (let i = 0; i < this.particlesClassic.length; i++) {
        const p = this.particlesClassic[i]
        p.x += (p.vx + Math.sin(timeVal * 15 + p.x * 0.01) * 0.3) * dt * this.speed
        p.y += p.vy * dt * this.speed
        p.life -= 0.0025 * dt * this.speed
        if (p.life <= 0 || p.y < -20)
          this.particlesClassic[i] = this._newParticleClassic(W, H, false)

        const opacity = p.life * 0.6 * brightness
        if (opacity > 0.02) {
          const hue = (baseH + p.hueOff + 360) % 360
          const pSize = p.size * (0.8 + 0.4 * Math.sin(timeVal * 5 + i))
          ctx.fillStyle = `hsla(${hue},${ss}%,${ll + 20}%,${opacity})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, pSize, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = `hsla(${hue},${ss}%,${ll + 10}%,${opacity * 0.3})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, pSize * 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }

  // =========================================================================
  //  HD CINEMATIC MODE (100% ORIGINAL AESTHETIC & LOGIC)
  // =========================================================================

  _initHD() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight
    const baseHsl = this._hexToHsl(this.color)

    this.curtainsHD = []
    for (let i = 0; i < 3; i++) {
      this.curtainsHD.push({
        y: H * (0.2 + i * 0.15),
        height: H * (0.4 + i * 0.1),
        baseHue: (baseHsl.h + i * 30) % 360,
        speed: 0.001 + Math.random() * 0.002,
        segments: 40,
        opacity: 0.3 - i * 0.05,
        phase: Math.random() * Math.PI * 2,
      })
    }

    this.particlesHD = Array.from({ length: 50 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      twinkleSpeed: 0.02 + Math.random() * 0.05,
      twinklePhase: Math.random() * Math.PI * 2,
    }))
  }

  _renderHD(ctx, W, H, dt) {
    const brightness = this.brightness

    if (!this.transparent) {
      ctx.globalCompositeOperation = "source-over"
      ctx.fillStyle = "rgb(2, 4, 15)"
      ctx.fillRect(0, 0, W, H)
    }

    ctx.globalCompositeOperation = "screen"

    // 40 Static Stars
    if (this.enableStars) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)"
      for (let i = 0; i < 40; i++) {
        const x = (Math.sin(i * 123) * 0.5 + 0.5) * W
        const y = (Math.cos(i * 456) * 0.5 + 0.5) * H
        ctx.fillRect(x, y, 1.2, 1.2)
      }

      // 50 Twinkling Particles
      for (let i = 0; i < this.particlesHD.length; i++) {
        const p = this.particlesHD[i]
        p.twinklePhase += p.twinkleSpeed * dt * this.speed
        p.x += p.vx * dt * this.speed
        p.y += p.vy * dt * this.speed
        if (p.x < 0) p.x = W
        if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H
        if (p.y > H) p.y = 0

        const op = (Math.sin(p.twinklePhase) * 0.5 + 0.5) * brightness * 0.6
        ctx.fillStyle = `rgba(255, 255, 255, ${op})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 3 Curtains — Exact original slice gradient rendering
    for (let c = 0; c < this.curtainsHD.length; c++) {
      const curtain = this.curtainsHD[c]
      curtain.phase += curtain.speed * dt * this.speed
      const step = W / curtain.segments

      for (let i = 0; i < curtain.segments; i++) {
        const x = i * step
        const phaseVal = x * 0.002 + curtain.phase
        const yOff = Math.sin(phaseVal) * 40
        const opacity =
          (Math.sin(i * 0.5 + curtain.phase * 5) * 0.5 + 0.5) *
          curtain.opacity *
          brightness
        const hue =
          (curtain.baseHue + Math.sin(i * 0.1 + curtain.phase) * 15 + 360) % 360

        const grad = ctx.createLinearGradient(
          x,
          curtain.y + yOff,
          x,
          curtain.y + yOff + curtain.height,
        )
        grad.addColorStop(0, `hsla(${hue}, 80%, 50%, 0)`)
        grad.addColorStop(0.3, `hsla(${hue}, 90%, 60%, ${opacity})`)
        grad.addColorStop(1, `hsla(${hue}, 80%, 40%, 0)`)
        ctx.fillStyle = grad
        ctx.fillRect(x, curtain.y + yOff, step + 1, curtain.height)
      }
    }
  }

  // =========================================================================
  //  ULTRA HD MODE (HYPER-REALISTIC VOLUMETRIC BOREALIS WITH RADIANT OPTICALS)
  // =========================================================================

  _initUltra() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    this.curtainsUltra = [
      {
        z: 0.35,
        baseYFrac: 0.28,
        heightFrac: 0.48,
        speed: 0.0006,
        octaves: [
          { freq: 0.0012, amp: 45, speed: 0.0008, phase: Math.random() * 6.28 },
          { freq: 0.0028, amp: 22, speed: -0.0014, phase: Math.random() * 6.28 },
          { freq: 0.0065, amp: 10, speed: 0.0022, phase: Math.random() * 6.28 },
        ],
        hueOffset: -22,
        opacity: 0.45,
        segments: 48,
        flutes: 24,
      },
      {
        z: 0.6,
        baseYFrac: 0.36,
        heightFrac: 0.55,
        speed: 0.0009,
        octaves: [
          { freq: 0.0015, amp: 65, speed: 0.0011, phase: Math.random() * 6.28 },
          { freq: 0.0034, amp: 30, speed: -0.0018, phase: Math.random() * 6.28 },
          { freq: 0.0075, amp: 14, speed: 0.0028, phase: Math.random() * 6.28 },
        ],
        hueOffset: 0,
        opacity: 0.65,
        segments: 56,
        flutes: 28,
      },
      {
        z: 0.85,
        baseYFrac: 0.44,
        heightFrac: 0.62,
        speed: 0.0013,
        octaves: [
          { freq: 0.0018, amp: 85, speed: 0.0015, phase: Math.random() * 6.28 },
          { freq: 0.0042, amp: 40, speed: -0.0023, phase: Math.random() * 6.28 },
          { freq: 0.0085, amp: 16, speed: 0.0034, phase: Math.random() * 6.28 },
        ],
        hueOffset: 25,
        opacity: 0.78,
        segments: 64,
        flutes: 32,
      },
      {
        z: 1.0,
        baseYFrac: 0.5,
        heightFrac: 0.68,
        speed: 0.0017,
        octaves: [
          { freq: 0.0022, amp: 100, speed: 0.0019, phase: Math.random() * 6.28 },
          { freq: 0.005, amp: 48, speed: -0.003, phase: Math.random() * 6.28 },
          { freq: 0.01, amp: 18, speed: 0.0042, phase: Math.random() * 6.28 },
        ],
        hueOffset: 50,
        opacity: 0.88,
        segments: 72,
        flutes: 36,
      },
    ]

    this.starsUltra = Array.from({ length: 110 }, () => ({
      x: Math.random() * W,
      y: Math.random() * (H * 0.8),
      size: Math.random() * 1.6 + 0.4,
      baseAlpha: Math.random() * 0.55 + 0.3,
      twinkleSpeed: Math.random() * 0.035 + 0.012,
      twinklePhase: Math.random() * Math.PI * 2,
    }))

    this.stardustUltra = Array.from({ length: 48 }, () => this._createStardust(W, H, true))
    this.meteors = []
    this.nextMeteorTime = Math.random() * 320 + 160
  }

  _createStardust(W, H, initial = false) {
    return {
      x: Math.random() * W,
      y: initial ? Math.random() * H : H * 0.85 + Math.random() * (H * 0.15),
      vx: (Math.random() - 0.5) * 0.35,
      vy: -(Math.random() * 0.55 + 0.2),
      size: Math.random() * 2.0 + 0.6,
      life: initial ? Math.random() * 0.9 + 0.1 : 1.0,
      decay: Math.random() * 0.003 + 0.0016,
      hueOffset: (Math.random() - 0.5) * 55,
      floatSpeed: Math.random() * 0.02 + 0.01,
      floatPhase: Math.random() * Math.PI * 2,
    }
  }

  _spawnMeteor(W, H) {
    const startX = Math.random() * (W * 0.65)
    const startY = Math.random() * (H * 0.25)
    const length = Math.random() * 140 + 85
    const angle = (Math.PI / 180) * (Math.random() * 18 + 26)
    const speed = Math.random() * 9 + 8

    this.meteors.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length,
      angle,
      alpha: 1.0,
      decay: Math.random() * 0.018 + 0.014,
      size: Math.random() * 1.5 + 0.8,
    })
  }

  _renderUltra(ctx, W, H, dt) {
    const brightness = this.brightness
    if (!this._cachedHsl) this._cachedHsl = this._hexToHsl(this.color)
    const baseH = this._cachedHsl.h
    const baseS = Math.max(this._cachedHsl.s, 72)
    const baseL = Math.max(42, Math.min(this._cachedHsl.l, 68))

    // Background Void with soft atmospheric glow
    if (!this.transparent) {
      ctx.globalCompositeOperation = "source-over"
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H)
      skyGrad.addColorStop(0, "rgb(1, 2, 8)")
      skyGrad.addColorStop(0.55, "rgb(2, 5, 16)")
      skyGrad.addColorStop(1, "rgb(4, 9, 24)")
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, W, H)
    }

    // 1. Ambient Celestial Glow beneath the aurora
    ctx.save()
    ctx.globalCompositeOperation = "screen"
    const ambientGlow = ctx.createRadialGradient(
      W * 0.5,
      H * 0.45,
      W * 0.05,
      W * 0.5,
      H * 0.45,
      W * 0.65,
    )
    ambientGlow.addColorStop(0, `hsla(${baseH}, 90%, 55%, ${0.12 * brightness})`)
    ambientGlow.addColorStop(0.5, `hsla(${(baseH + 35) % 360}, 85%, 45%, ${0.06 * brightness})`)
    ambientGlow.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = ambientGlow
    ctx.fillRect(0, 0, W, H)
    ctx.restore()

    // 2. Stars
    if (this.enableStars) {
      ctx.save()
      ctx.globalCompositeOperation = "screen"
      for (let i = 0; i < this.starsUltra.length; i++) {
        const star = this.starsUltra[i]
        star.twinklePhase += star.twinkleSpeed * dt * this.speed
        const tw = Math.sin(star.twinklePhase) * 0.45 + 0.55
        const alpha = star.baseAlpha * tw * brightness
        if (alpha > 0.02) {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.fillRect(star.x, star.y, star.size, star.size)
        }
      }
      ctx.restore()
    }

    // 3. Meteors (Shooting Stars)
    if (this.enableMeteors) {
      this.nextMeteorTime -= 1 * dt * this.speed
      if (this.nextMeteorTime <= 0) {
        this._spawnMeteor(W, H)
        this.nextMeteorTime = Math.random() * 380 + 190
      }

      if (this.meteors.length > 0) {
        ctx.save()
        ctx.globalCompositeOperation = "lighter"
        for (let i = this.meteors.length - 1; i >= 0; i--) {
          const m = this.meteors[i]
          m.x += m.vx * dt
          m.y += m.vy * dt
          m.alpha -= m.decay * dt

          if (m.alpha <= 0 || m.x > W + 100 || m.y > H + 100) {
            this.meteors.splice(i, 1)
            continue
          }

          const tailX = m.x - Math.cos(m.angle) * m.length
          const tailY = m.y - Math.sin(m.angle) * m.length
          const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y)
          grad.addColorStop(0, `hsla(${baseH + 30}, 90%, 80%, 0)`)
          grad.addColorStop(0.7, `hsla(${baseH}, 90%, 75%, ${m.alpha * 0.6 * brightness})`)
          grad.addColorStop(1, `rgba(255, 255, 255, ${m.alpha * brightness})`)

          ctx.strokeStyle = grad
          ctx.lineWidth = m.size
          ctx.beginPath()
          ctx.moveTo(tailX, tailY)
          ctx.lineTo(m.x, m.y)
          ctx.stroke()
        }
        ctx.restore()
      }
    }

    // 4. Volumetric Silk Curtains with Local Slices & Caustic Folds
    for (let cIdx = 0; cIdx < this.curtainsUltra.length; cIdx++) {
      const curtain = this.curtainsUltra[cIdx]
      const z = curtain.z
      const baseY = H * curtain.baseYFrac
      const curtainHeight = H * curtain.heightFrac
      const hue = (baseH + curtain.hueOffset + 360) % 360
      const hueMid = (hue + 28) % 360
      const hueTop = (hue + 68) % 360
      const curtainAlpha = curtain.opacity * brightness

      const numSegs = curtain.segments
      const step = W / numSegs
      const botPts = []
      const topPts = []

      // Generate accurate harmonic wave vertices
      for (let i = 0; i <= numSegs; i++) {
        const x = i * step
        let yWave = 0
        for (let o = 0; o < curtain.octaves.length; o++) {
          const oct = curtain.octaves[o]
          yWave += Math.sin(x * oct.freq + this.time * oct.speed * 80 + oct.phase) * oct.amp
        }

        const bY = baseY + yWave
        const tY = bY - curtainHeight + Math.sin(x * 0.0028 + this.time * 0.45) * 35
        botPts.push({ x, y: bY })
        topPts.push({ x, y: tY })
      }

      // Render Vertical Volumetric Ribbon Strips with local spectral gradients
      ctx.save()
      ctx.globalCompositeOperation = "screen"

      for (let i = 0; i < numSegs; i++) {
        const p0b = botPts[i]
        const p1b = botPts[i + 1]
        const p0t = topPts[i]
        const p1t = topPts[i + 1]

        // Dynamic Fold Density / Caustics calculation
        const dy = p1b.y - p0b.y
        const foldFactor = 1.0 + Math.min(1.2, Math.abs(dy / step) * 1.5)
        const stripAlpha = Math.min(1.0, curtainAlpha * foldFactor)

        const midX = (p0b.x + p1b.x) * 0.5
        const localBotY = (p0b.y + p1b.y) * 0.5
        const localTopY = (p0t.y + p1t.y) * 0.5

        const stripGrad = ctx.createLinearGradient(midX, localBotY + 10, midX, localTopY)
        stripGrad.addColorStop(0, `hsla(${hue}, 100%, ${baseL + 10}%, 0)`)
        stripGrad.addColorStop(0.06, `hsla(${hue}, 100%, ${baseL + 18}%, ${stripAlpha * 0.95})`)
        stripGrad.addColorStop(0.32, `hsla(${hueMid}, 95%, ${baseL + 12}%, ${stripAlpha * 0.72})`)
        stripGrad.addColorStop(0.72, `hsla(${hueTop}, 90%, ${baseL + 6}%, ${stripAlpha * 0.38})`)
        stripGrad.addColorStop(1.0, `hsla(${hueTop}, 80%, ${baseL}%, 0)`)

        ctx.beginPath()
        ctx.moveTo(p0b.x, p0b.y)
        ctx.lineTo(p1b.x, p1b.y)
        ctx.lineTo(p1t.x, p1t.y)
        ctx.lineTo(p0t.x, p0t.y)
        ctx.closePath()
        ctx.fillStyle = stripGrad
        ctx.fill()
      }

      // 5. Optical Dancing Ray Fluting (Shimmering Vertical Field Columns)
      const numFlutes = curtain.flutes
      const fluteStep = Math.floor(numSegs / numFlutes)

      for (let f = 0; f < numFlutes; f++) {
        const idx = Math.min(numSegs - 1, f * fluteStep)
        const bx = botPts[idx].x
        const by = botPts[idx].y
        const tx = topPts[idx].x + Math.sin(f * 0.8 + this.time * 1.4) * 22
        const ty = topPts[idx].y

        const fPulse = Math.sin(f * 0.75 + this.time * 2.8) * 0.35 + 0.65
        const fAlpha = curtainAlpha * 0.55 * fPulse * z

        const rayGrad = ctx.createLinearGradient(bx, by, tx, ty)
        rayGrad.addColorStop(0, `hsla(${hue}, 100%, ${baseL + 25}%, ${fAlpha})`)
        rayGrad.addColorStop(0.4, `hsla(${hueMid}, 95%, ${baseL + 18}%, ${fAlpha * 0.7})`)
        rayGrad.addColorStop(1, `hsla(${hueTop}, 90%, ${baseL}%, 0)`)

        ctx.strokeStyle = rayGrad
        ctx.lineWidth = Math.max(1.2, step * 1.8 * z)
        ctx.beginPath()
        ctx.moveTo(bx, by)
        ctx.lineTo(tx, ty)
        ctx.stroke()
      }

      ctx.restore()

      // 6. Multi-tier Radiant Ionizing Filament Core (Active Lower Edge)
      ctx.save()
      ctx.globalCompositeOperation = "lighter"

      const curvePath = new Path2D()
      curvePath.moveTo(botPts[0].x, botPts[0].y)
      for (let i = 1; i <= numSegs; i++) {
        const xc = (botPts[i - 1].x + botPts[i].x) * 0.5
        const yc = (botPts[i - 1].y + botPts[i].y) * 0.5
        curvePath.quadraticCurveTo(botPts[i - 1].x, botPts[i - 1].y, xc, yc)
      }
      curvePath.lineTo(botPts[numSegs].x, botPts[numSegs].y)

      // Tier A: Atmospheric Soft Diffusion Halo
      ctx.strokeStyle = `hsla(${hue}, 100%, ${baseL + 15}%, ${curtainAlpha * 0.22 * z})`
      ctx.lineWidth = 22 * z
      ctx.stroke(curvePath)

      // Tier B: Inner Neon Luminous Body
      ctx.strokeStyle = `hsla(${hue}, 100%, ${baseL + 24}%, ${curtainAlpha * 0.6 * z})`
      ctx.lineWidth = 6.5 * z
      ctx.stroke(curvePath)

      // Tier C: White-Hot Diamond Core Filament
      ctx.strokeStyle = `rgba(255, 255, 255, ${curtainAlpha * 0.92 * z})`
      ctx.lineWidth = 1.4 * z
      ctx.stroke(curvePath)

      ctx.restore()
    }

    // 7. Stardust Luminescence Embers
    if (this.enableStars) {
      ctx.save()
      ctx.globalCompositeOperation = "lighter"
      for (let i = 0; i < this.stardustUltra.length; i++) {
        const p = this.stardustUltra[i]
        p.floatPhase += p.floatSpeed * dt * this.speed
        p.x += (p.vx + Math.sin(p.floatPhase) * 0.4) * dt * this.speed
        p.y += p.vy * dt * this.speed
        p.life -= p.decay * dt * this.speed

        if (p.life <= 0 || p.y < -30 || p.x < -30 || p.x > W + 30) {
          this.stardustUltra[i] = this._createStardust(W, H, false)
          continue
        }

        const pAlpha = p.life * (p.life < 0.3 ? p.life / 0.3 : 1.0) * brightness * 0.85
        if (pAlpha > 0.02) {
          const pHue = (baseH + p.hueOffset + 360) % 360
          ctx.fillStyle = `hsla(${pHue}, 95%, 75%, ${pAlpha})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = `hsla(${pHue}, 90%, 65%, ${pAlpha * 0.35})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 2.8, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()
    }
  }

  // =========================================================================
  //  ANIMATION PIPELINE
  // =========================================================================

  _draw(currentTime) {
    if (!this.active) return

    if (!this.lastTime) this.lastTime = currentTime
    const deltaMs = Math.min(currentTime - this.lastTime, 100)
    const dt = deltaMs / 16.667
    this.lastTime = currentTime
    this.time += 0.012 * dt * this.speed

    const ctx = this.ctx
    const W = this.width
    const H = this.height

    ctx.clearRect(0, 0, W, H)

    if (this.style === "ultra") {
      this._renderUltra(ctx, W, H, dt)
    } else if (this.style === "hd") {
      this._renderHD(ctx, W, H, dt)
    } else {
      this._renderClassic(ctx, W, H, dt)
    }

    this.animationId = requestAnimationFrame((t) => this._draw(t))
  }

  // =========================================================================
  //  PUBLIC LIFECYCLE & OPTIONS API
  // =========================================================================

  start() {
    if (this.active) return
    this.active = true
    this.lastTime = performance.now()
    this._cachedHsl = this._hexToHsl(this.color)
    if (this.canvas) this.canvas.style.display = "block"
    this.animationId = requestAnimationFrame((t) => this._draw(t))
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.active = false
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.canvas.style.display = "none"
    }
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)

    this.curtainsHD = []
    this.particlesHD = []
    this.planesClassic = []
    this.raysClassic = []
    this.particlesClassic = []
    this.curtainsUltra = []
    this.starsUltra = []
    this.stardustUltra = []
    this.meteors = []
  }

  setOptions(opts = {}) {
    if (opts.color !== undefined) {
      this.color = opts.color
      this._cachedHsl = this._hexToHsl(this.color)
      if (this.style === "hd") this._initHD()
      if (this.style === "ultra") this._initUltra()
    }
    if (opts.style !== undefined && opts.style !== this.style) {
      this.style = opts.style
      this._initStyles()
    }
    if (opts.brightness !== undefined) {
      this.brightness = opts.brightness
    }
    if (opts.speed !== undefined) {
      this.speed = opts.speed
    }
    if (opts.stars !== undefined) {
      this.enableStars = opts.stars !== false
    }
    if (opts.meteors !== undefined) {
      this.enableMeteors = opts.meteors !== false
    }
    if (opts.transparent !== undefined) {
      this.transparent = opts.transparent !== false
    }
  }
}
