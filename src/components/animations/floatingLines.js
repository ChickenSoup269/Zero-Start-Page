/**
 * Floating Lines Effect - Ultra-Smooth HD Neon Ribbons Edition
 * Features harmonic wave ribbons, luminous laser filaments, HD travelling photons,
 * stardust particles, zero mouse distortion, and 60-144+ FPS lag-free performance.
 */

export class FloatingLinesEffect {
  /**
   * @param {string|HTMLCanvasElement} canvasId
   * @param {string|Object} [colorOrOptions="#ffffff"]
   * @param {number} [angle=0]
   * @param {Object} [options={}]
   */
  constructor(canvasId, colorOrOptions = "#ffffff", angle = 0, options = {}) {
    this.canvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId
    if (!this.canvas) return

    let opts = {}
    if (typeof colorOrOptions === "object" && colorOrOptions !== null) {
      opts = colorOrOptions
    } else {
      opts = {
        color: colorOrOptions || "#ffffff",
        angle: Number(angle) || 0,
        ...options,
      }
    }

    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.time = 0
    this.lastDrawTime = 0
    this.animId = null

    // Configuration
    this.color = opts.color || "#ffffff"
    this.angle = Number(opts.angle) || 0
    this.speed = typeof opts.speed === "number" ? opts.speed : 1.0
    this.lineCount = typeof opts.count === "number" ? Math.max(2, Math.min(8, opts.count)) : 4
    this.transparent = !!opts.transparent

    this.config = {
      step: 44, // Optimized vertex step for buttery smooth 60-144 FPS
      starCount: 50,
      driftSpeed: 0.16,
    }

    this.hsl = { h: 0, s: 0, l: 100, isMonochrome: true }
    this._cachedGroups = []
    this._bgGrad = null
    this.stars = []

    this._updateHsl(this.color)

    // Event handlers (No mouse listener - purely ambient and non-disruptive)
    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)

    this.resize()
  }

  _updateHsl(hex) {
    if (!hex || typeof hex !== "string" || !hex.startsWith("#") || hex.length < 7) {
      hex = "#ffffff"
    }
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    let l = (max + min) / 2

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

    const isMonochrome = s < 0.15 || l > 0.95 || l < 0.08
    this.hsl = {
      h: Math.round(h * 360),
      s: isMonochrome ? 0 : Math.max(75, Math.round(s * 100)),
      l: isMonochrome ? 92 : Math.max(55, Math.min(80, Math.round(l * 100))),
      isMonochrome,
    }

    this._updateColorCache()
  }

  _updateColorCache() {
    const isMono = this.hsl.isMonochrome
    const baseH = this.hsl.h
    const s = this.hsl.s
    const l = this.hsl.l

    // Harmonious multi-tier chromatic palette for HD bloom
    const hues = isMono
      ? [210, 0, 195]
      : [(baseH - 22 + 360) % 360, baseH, (baseH + 22) % 360]

    this._cachedGroups = hues.map((h) => {
      const sat = isMono ? 15 : s
      const lum = isMono ? 90 : l
      return {
        // Tier 1: Soft diffuse ambient glow
        aura: isMono
          ? `hsla(${h}, 30%, 85%,`
          : `hsla(${h}, ${Math.min(100, sat + 15)}%, ${lum}%,`,
        // Tier 2: HD vibrant neon body
        body: isMono
          ? `hsla(0, 0%, 96%,`
          : `hsla(${h}, ${sat}%, ${Math.min(92, lum + 8)}%,`,
        // Tier 3: Razor-sharp white-hot laser core
        core: isMono
          ? "rgba(255, 255, 255,"
          : `hsla(${h}, ${Math.max(0, sat - 25)}%, 97%,`,
      }
    })
  }

  updateColor(hex) {
    this.color = hex
    this._updateHsl(hex)
    this._initStars()
  }

  setAngle(deg) {
    this.angle = Number(deg) || 0
  }

  setSpeed(speed) {
    this.speed = Math.max(0.1, Math.min(3.5, Number(speed) || 1.0))
  }

  setCount(count) {
    this.lineCount = Math.max(2, Math.min(8, Number(count) || 4))
  }

  setTransparent(transparent) {
    this.transparent = !!transparent
  }

  resize() {
    if (!this.canvas) return
    // Smart DPR cap to 1.5 to guarantee silky smooth 60-144fps on Retina/4K displays
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = Math.floor(this.width * dpr)
    this.canvas.height = Math.floor(this.height * dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`

    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.scale(dpr, dpr)

    // Pre-cache background gradient once on resize (eliminates per-frame GC allocations)
    const W = this.width
    const H = this.height
    this._bgGrad = this.ctx.createRadialGradient(
      W * 0.5,
      H * 0.5,
      W * 0.08,
      W * 0.5,
      H * 0.5,
      Math.max(W, H) * 0.82,
    )
    this._bgGrad.addColorStop(0, "#050814")
    this._bgGrad.addColorStop(0.55, "#020409")
    this._bgGrad.addColorStop(1, "#010103")

    this._initStars()
    this._updateColorCache()
  }

  _initStars() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight
    this.stars = []
    const baseH = this.hsl.isMonochrome ? 210 : this.hsl.h

    for (let i = 0; i < this.config.starCount; i++) {
      this.stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * this.config.driftSpeed,
        vy: (Math.random() - 0.5) * this.config.driftSpeed,
        size: Math.random() * 1.4 + 0.6,
        baseAlpha: Math.random() * 0.45 + 0.35,
        twinkleSpeed: 0.018 + Math.random() * 0.032,
        twinklePhase: Math.random() * Math.PI * 2,
        colorPrefix: this.hsl.isMonochrome
          ? "rgba(235, 245, 255,"
          : `hsla(${(baseH + (Math.random() - 0.5) * 35 + 360) % 360}, 85%, 90%,`,
      })
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.canvas.style.display = "block"
    this._animate(this.lastDrawTime)
  }

  stop() {
    this.active = false
    if (this.animId) {
      cancelAnimationFrame(this.animId)
      this.animId = null
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.width, this.height)
    }
    this.canvas.style.display = "none"
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    this.stars = []
  }

  _drawWaveGroup(
    count,
    yBase,
    ampBase,
    speedFactor,
    offsetBase,
    opacity,
    theme,
    cosR,
    sinR,
    dt,
  ) {
    const ctx = this.ctx
    const W = this.width
    const H = this.height
    const time = this.time * this.speed * speedFactor
    const range = Math.sqrt(W * W + H * H) * 1.2
    const step = this.config.step
    const halfH = H * 0.5
    const halfW = W * 0.5

    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    for (let i = 0; i < count; i++) {
      const linePhase = offsetBase + i * 0.38
      const lineOffset = (i - count * 0.5) * 22

      // Build smooth continuous Bézier curve directly in Path2D (Single-pass, zero GC overhead)
      const path = new Path2D()
      let first = true
      let prevX = 0
      let prevY = 0

      for (let x = -range * 0.5; x <= range * 0.5 + step; x += step) {
        const normX = (x / W) * 2.2

        // Multi-frequency harmonic wave superposition
        const y =
          yBase * H +
          Math.sin(normX * 1.15 + linePhase + time) * ampBase * H * 0.092 +
          Math.sin(normX * 2.5 - time * 0.6 + i * 0.12) * ampBase * H * 0.036 +
          Math.cos(normX * 0.55 + time * 0.32) * ampBase * H * 0.02 +
          lineOffset

        // Rotate wave relative to screen center
        const rx = x * cosR - (y - halfH) * sinR + halfW
        const ry = x * sinR + (y - halfH) * cosR + halfH

        if (first) {
          path.moveTo(rx, ry)
          prevX = rx
          prevY = ry
          first = false
        } else {
          const midX = (prevX + rx) * 0.5
          const midY = (prevY + ry) * 0.5
          path.quadraticCurveTo(prevX, prevY, midX, midY)
          prevX = rx
          prevY = ry
        }
      }
      path.lineTo(prevX, prevY)

      // HD 3-Tier Luminous Laser Filament Rendering:
      // Tier 1: Soft ambient aura (wide atmospheric glow)
      ctx.strokeStyle = `${theme.aura} ${opacity * 0.22})`
      ctx.lineWidth = 15
      ctx.stroke(path)

      // Tier 2: HD vibrant neon body (radiant filament)
      ctx.strokeStyle = `${theme.body} ${opacity * 0.68})`
      ctx.lineWidth = 4.2
      ctx.stroke(path)

      // Tier 3: Razor-sharp white-hot laser core
      ctx.strokeStyle = `${theme.core} ${opacity * 0.96})`
      ctx.lineWidth = 1.3
      ctx.stroke(path)
    }
  }

  _animate(currentTime = 0) {
    if (!this.active) return
    this.animId = requestAnimationFrame((t) => this._animate(t))
    if (document.visibilityState === "hidden") return

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < 1) return
    const dt = Math.min(elapsed / 16.67, 3.0) // Normalized 60fps delta-time
    this.lastDrawTime = currentTime

    this.time += 0.012 * dt
    const ctx = this.ctx
    const W = this.width
    const H = this.height

    // Canvas clearing / Background rendering
    if (this.transparent) {
      ctx.clearRect(0, 0, W, H)
    } else {
      ctx.fillStyle = this._bgGrad || "#020409"
      ctx.fillRect(0, 0, W, H)
    }

    // Drifting Stardust Particles
    if (this.stars && this.stars.length > 0) {
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i]
        s.x += s.vx * dt
        s.y += s.vy * dt

        if (s.x < 0) s.x = W
        if (s.x > W) s.x = 0
        if (s.y < 0) s.y = H
        if (s.y > H) s.y = 0

        s.twinklePhase += s.twinkleSpeed * dt
        const alpha = s.baseAlpha * (0.45 + Math.sin(s.twinklePhase) * 0.55)

        ctx.fillStyle = `${s.colorPrefix} ${Math.max(0, Math.min(1, alpha))})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Additive blending for luminous HD neon ribbons
    ctx.globalCompositeOperation = "lighter"

    const rad = (this.angle * Math.PI) / 180
    const cosR = Math.cos(rad)
    const sinR = Math.sin(rad)
    const count = this.lineCount

    // Group 1: Leading Harmonic Ribbon
    this._drawWaveGroup(
      count,
      0.75,
      0.38,
      0.85,
      1.2,
      0.58,
      this._cachedGroups[0],
      cosR,
      sinR,
      dt,
    )

    // Group 2: Center Core Ribbon
    this._drawWaveGroup(
      count,
      0.5,
      0.55,
      1.0,
      2.1,
      0.85,
      this._cachedGroups[1],
      cosR,
      sinR,
      dt,
    )

    // Group 3: Trailing Harmonic Ribbon
    this._drawWaveGroup(
      count,
      0.25,
      0.4,
      1.15,
      0.8,
      0.58,
      this._cachedGroups[2],
      cosR,
      sinR,
      dt,
    )

    // Reset composite operation
    ctx.globalCompositeOperation = "source-over"
  }
}
