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
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.width = window.innerWidth
    this.height = window.innerHeight
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
    const W = this.canvas.width
    const H = this.canvas.height

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
    const W = this.canvas.width
    const H = this.canvas.height
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
  //  ULTRA HD MODE (NEW HYPER-REALISTIC VOLUMETRIC BOREALIS)
  // =========================================================================

  _initUltra() {
    const W = this.canvas.width
    const H = this.canvas.height

    this.curtainsUltra = [
      {
        z: 0.35,
        baseYFrac: 0.25,
        heightFrac: 0.5,
        speed: 0.0005,
        octaves: [
          { freq: 0.0011, amp: 50, speed: 0.0007, phase: Math.random() * 6.28 },
          { freq: 0.0026, amp: 26, speed: -0.0012, phase: Math.random() * 6.28 },
        ],
        hueOffset: -18,
        opacity: 0.38,
        segments: 44,
        flutes: 18,
      },
      {
        z: 0.6,
        baseYFrac: 0.33,
        heightFrac: 0.56,
        speed: 0.0008,
        octaves: [
          { freq: 0.0014, amp: 70, speed: 0.0009, phase: Math.random() * 6.28 },
          { freq: 0.0031, amp: 35, speed: -0.0016, phase: Math.random() * 6.28 },
        ],
        hueOffset: 0,
        opacity: 0.52,
        segments: 52,
        flutes: 22,
      },
      {
        z: 0.85,
        baseYFrac: 0.4,
        heightFrac: 0.62,
        speed: 0.0012,
        octaves: [
          { freq: 0.0017, amp: 90, speed: 0.0013, phase: Math.random() * 6.28 },
          { freq: 0.0038, amp: 44, speed: -0.0021, phase: Math.random() * 6.28 },
        ],
        hueOffset: 24,
        opacity: 0.68,
        segments: 60,
        flutes: 26,
      },
      {
        z: 1.0,
        baseYFrac: 0.46,
        heightFrac: 0.68,
        speed: 0.0016,
        octaves: [
          { freq: 0.0021, amp: 105, speed: 0.0017, phase: Math.random() * 6.28 },
          { freq: 0.0048, amp: 50, speed: -0.0027, phase: Math.random() * 6.28 },
        ],
        hueOffset: 48,
        opacity: 0.78,
        segments: 68,
        flutes: 30,
      },
    ]

    this.starsUltra = Array.from({ length: 90 }, () => ({
      x: Math.random() * W,
      y: Math.random() * (H * 0.75),
      size: Math.random() * 1.5 + 0.4,
      baseAlpha: Math.random() * 0.5 + 0.25,
      twinkleSpeed: Math.random() * 0.03 + 0.01,
      twinklePhase: Math.random() * Math.PI * 2,
    }))

    this.stardustUltra = Array.from({ length: 40 }, () => this._createStardust(W, H, true))
    this.meteors = []
    this.nextMeteorTime = Math.random() * 350 + 180
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
    const length = Math.random() * 130 + 80
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
    const baseS = Math.max(this._cachedHsl.s, 68)
    const baseL = Math.max(38, Math.min(this._cachedHsl.l, 65))

    if (!this.transparent) {
      ctx.globalCompositeOperation = "source-over"
      ctx.fillStyle = "rgb(2, 4, 15)"
      ctx.fillRect(0, 0, W, H)
    }

    // 1. Stars
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

    // 2. Meteors
    if (this.enableMeteors) {
      this.nextMeteorTime -= 1 * dt * this.speed
      if (this.nextMeteorTime <= 0) {
        this._spawnMeteor(W, H)
        this.nextMeteorTime = Math.random() * 400 + 200
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

    // 3. Volumetric Silk Curtains
    ctx.save()
    ctx.globalCompositeOperation = "screen"

    for (let cIdx = 0; cIdx < this.curtainsUltra.length; cIdx++) {
      const curtain = this.curtainsUltra[cIdx]
      const z = curtain.z
      const baseY = H * curtain.baseYFrac
      const curtainHeight = H * curtain.heightFrac
      const hue = (baseH + curtain.hueOffset + 360) % 360
      const hueMid = (hue + 25) % 360
      const hueTop = (hue + 68) % 360
      const curtainAlpha = curtain.opacity * brightness

      const numSegs = curtain.segments
      const step = W / numSegs
      const botPts = []
      const topPts = []
      let minTopY = H
      let maxBotY = 0

      for (let i = 0; i <= numSegs; i++) {
        const x = i * step
        let yWave = 0
        for (let o = 0; o < curtain.octaves.length; o++) {
          const oct = curtain.octaves[o]
          yWave += Math.sin(x * oct.freq + this.time * oct.speed * 80 + oct.phase) * oct.amp
        }

        const bY = baseY + yWave
        const tY = bY - curtainHeight + Math.sin(x * 0.0028 + this.time * 0.45) * 30
        if (tY < minTopY) minTopY = tY
        if (bY > maxBotY) maxBotY = bY
        botPts.push({ x, y: bY })
        topPts.push({ x, y: tY })
      }

      // Single gradient fill for whole curtain mesh
      const grad = ctx.createLinearGradient(0, maxBotY, 0, minTopY)
      grad.addColorStop(0, `hsla(${hue}, ${baseS}%, ${baseL + 12}%, 0)`)
      grad.addColorStop(0.08, `hsla(${hue}, 100%, ${baseL + 16}%, ${curtainAlpha * 0.88})`)
      grad.addColorStop(0.35, `hsla(${hueMid}, 95%, ${baseL + 10}%, ${curtainAlpha * 0.68})`)
      grad.addColorStop(0.75, `hsla(${hueTop}, 85%, ${baseL + 5}%, ${curtainAlpha * 0.38})`)
      grad.addColorStop(1.0, `hsla(${hueTop}, 80%, ${baseL}%, 0)`)

      ctx.beginPath()
      ctx.moveTo(botPts[0].x, botPts[0].y)
      for (let i = 1; i <= numSegs; i++) {
        const xc = (botPts[i - 1].x + botPts[i].x) / 2
        const yc = (botPts[i - 1].y + botPts[i].y) / 2
        ctx.quadraticCurveTo(botPts[i - 1].x, botPts[i - 1].y, xc, yc)
      }
      ctx.lineTo(botPts[numSegs].x, botPts[numSegs].y)
      ctx.lineTo(topPts[numSegs].x, topPts[numSegs].y)
      for (let i = numSegs - 1; i >= 0; i--) {
        const xc = (topPts[i + 1].x + topPts[i].x) / 2
        const yc = (topPts[i + 1].y + topPts[i].y) / 2
        ctx.quadraticCurveTo(topPts[i + 1].x, topPts[i + 1].y, xc, yc)
      }
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()

      // Optical Ray Fluting Pillars
      const numFlutes = curtain.flutes
      const fluteStep = Math.floor(numSegs / numFlutes)
      ctx.lineWidth = step * 1.6 * z

      for (let f = 1; f < numFlutes; f++) {
        const idx = f * fluteStep
        if (idx >= numSegs) break
        const bx = botPts[idx].x
        const by = botPts[idx].y
        const tx = topPts[idx].x + Math.sin(f * 0.9 + this.time * 1.5) * 18
        const ty = topPts[idx].y
        const fAlpha = curtainAlpha * 0.48 * (Math.sin(f * 0.8 + this.time * 2.6) * 0.25 + 0.75)
        const fGrad = ctx.createLinearGradient(bx, by, tx, ty)
        fGrad.addColorStop(0, `hsla(${hue}, 100%, ${baseL + 22}%, ${fAlpha})`)
        fGrad.addColorStop(0.45, `hsla(${hueMid}, 95%, ${baseL + 15}%, ${fAlpha * 0.65})`)
        fGrad.addColorStop(1, `hsla(${hueTop}, 90%, ${baseL}%, 0)`)
        ctx.strokeStyle = fGrad
        ctx.beginPath()
        ctx.moveTo(bx, by)
        ctx.lineTo(tx, ty)
        ctx.stroke()
      }

      // Filament Ribbon Halo
      ctx.beginPath()
      ctx.moveTo(botPts[0].x, botPts[0].y)
      for (let i = 1; i <= numSegs; i++) {
        const xc = (botPts[i - 1].x + botPts[i].x) / 2
        const yc = (botPts[i - 1].y + botPts[i].y) / 2
        ctx.quadraticCurveTo(botPts[i - 1].x, botPts[i - 1].y, xc, yc)
      }
      ctx.strokeStyle = `hsla(${hue}, 100%, ${baseL + 25}%, ${curtainAlpha * 0.55})`
      ctx.lineWidth = 3.8 * z
      ctx.stroke()

      // White-Hot Photon Core
      ctx.strokeStyle = `rgba(255, 255, 255, ${curtainAlpha * 0.75 * z})`
      ctx.lineWidth = 1.3 * z
      ctx.stroke()
    }
    ctx.restore()

    // 4. Stardust Embers
    if (this.enableStars) {
      ctx.save()
      ctx.globalCompositeOperation = "lighter"
      for (let i = 0; i < this.stardustUltra.length; i++) {
        const p = this.stardustUltra[i]
        p.floatPhase += p.floatSpeed * dt * this.speed
        p.x += (p.vx + Math.sin(p.floatPhase) * 0.35) * dt * this.speed
        p.y += p.vy * dt * this.speed
        p.life -= p.decay * dt * this.speed

        if (p.life <= 0 || p.y < -30 || p.x < -30 || p.x > W + 30) {
          this.stardustUltra[i] = this._createStardust(W, H, false)
          continue
        }

        const pAlpha = p.life * (p.life < 0.3 ? p.life / 0.3 : 1.0) * brightness * 0.8
        if (pAlpha > 0.02) {
          const pHue = (baseH + p.hueOffset + 360) % 360
          ctx.fillStyle = `hsla(${pHue}, 95%, 75%, ${pAlpha})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = `hsla(${pHue}, 90%, 65%, ${pAlpha * 0.3})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2)
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
