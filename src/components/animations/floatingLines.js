/**
 * Floating Lines Effect - Ultra-Smooth Silk Ribbon & Neon Glow Edition
 * Features harmonic wave ribbons, luminous neon filaments, interactive curvature,
 * drifting stardust particles, and 60-144+ FPS performance.
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
      step: 32,
      starCount: 65,
      driftSpeed: 0.18,
      glintCount: 16,
    }

    // Mouse interaction with smooth interpolation
    this.mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      active: false,
      influenceRadius: 220,
      strength: 35,
    }

    this.hsl = { h: 0, s: 0, l: 100, isMonochrome: true }
    this._updateHsl(this.color)

    // Event handlers
    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._handleMouseMove(e)
    this._mouseLeaveHandler = () => this._handleMouseLeave()

    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    document.addEventListener("mouseleave", this._mouseLeaveHandler)

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
      s: isMonochrome ? 0 : Math.max(70, Math.round(s * 100)),
      l: isMonochrome ? 90 : Math.max(55, Math.min(80, Math.round(l * 100))),
      isMonochrome,
    }

    this._updateColorCache()
  }

  _updateColorCache() {
    if (this.hsl.isMonochrome) {
      // Elegant futuristic silver/cyan-tinted glowing monochrome
      this._colorCache = [
        "hsla(210, 20%, 85%,",
        "hsla(0, 0%, 95%,",
        "hsla(190, 30%, 88%,",
      ]
    } else {
      // Harmonious tri-color chromatic palette
      this._colorCache = [-25, 0, 25].map((hueOffset) => {
        const h = (this.hsl.h + hueOffset + 360) % 360
        return `hsla(${h}, ${this.hsl.s}%, ${this.hsl.l}%,`
      })
    }
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

  _handleMouseMove(e) {
    this.mouse.targetX = e.clientX
    this.mouse.targetY = e.clientY
    this.mouse.active = true
  }

  _handleMouseLeave() {
    this.mouse.active = false
    this.mouse.targetX = -9999
    this.mouse.targetY = -9999
  }

  resize() {
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

    this._initStars()
    this._initGlints()
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
        size: Math.random() * 1.5 + 0.5,
        baseAlpha: Math.random() * 0.5 + 0.3,
        twinkleSpeed: 0.02 + Math.random() * 0.035,
        twinklePhase: Math.random() * Math.PI * 2,
        color: this.hsl.isMonochrome
          ? "rgba(230, 240, 255,"
          : `hsla(${(baseH + (Math.random() - 0.5) * 40 + 360) % 360}, 85%, 90%,`,
      })
    }
  }

  _initGlints() {
    this.glints = []
    for (let i = 0; i < this.config.glintCount; i++) {
      this.glints.push({
        progress: Math.random(),
        speed: 0.0015 + Math.random() * 0.0025,
        groupIndex: i % 3,
        lineIndex: Math.floor(Math.random() * this.lineCount),
        size: Math.random() * 2.2 + 1.2,
        alpha: Math.random() * 0.7 + 0.3,
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
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    document.removeEventListener("mouseleave", this._mouseLeaveHandler)
    this.stars = []
    this.glints = []
  }

  _drawWaveGroup(
    count,
    yBase,
    ampBase,
    speedFactor,
    offsetBase,
    opacity,
    colorBase,
    cosR,
    sinR,
    dt,
  ) {
    const ctx = this.ctx
    const W = this.width
    const H = this.height
    const time = this.time * this.speed * speedFactor
    const range = Math.sqrt(W * W + H * H) * 1.25
    const step = this.config.step

    // Interactive cursor smooth spring
    const mx = this.mouse.x
    const my = this.mouse.y
    const mActive = this.mouse.active && mx > -500
    const mRadiusSq = this.mouse.influenceRadius * this.mouse.influenceRadius

    for (let i = 0; i < count; i++) {
      const linePhase = offsetBase + i * 0.38
      const lineOffset = (i - count / 2) * 20
      const points = []

      for (let x = -range / 2; x <= range / 2 + step; x += step) {
        const normX = (x / W) * 2.2

        // Multi-frequency harmonic wave superposition
        let y =
          yBase * H +
          Math.sin(normX * 1.15 + linePhase + time) * ampBase * H * 0.095 +
          Math.sin(normX * 2.6 - time * 0.65 + i * 0.12) * ampBase * H * 0.038 +
          Math.cos(normX * 0.55 + time * 0.35) * ampBase * H * 0.02 +
          lineOffset

        // Rotate wave relative to screen center
        let rx = x * cosR - (y - H / 2) * sinR + W / 2
        let ry = x * sinR + (y - H / 2) * cosR + H / 2

        // Mouse organic distortion
        if (mActive) {
          const dx = rx - mx
          const dy = ry - my
          const d2 = dx * dx + dy * dy
          if (d2 < mRadiusSq && d2 > 0.1) {
            const dist = Math.sqrt(d2)
            const factor = (1 - dist / this.mouse.influenceRadius)
            const force = Math.sin(factor * Math.PI) * this.mouse.strength
            rx += (dx / dist) * force * 0.5
            ry += (dy / dist) * force
          }
        }

        points.push({ x: rx, y: ry })
      }

      if (points.length < 2) continue

      // Build smooth Bézier curve path
      const path = new Path2D()
      path.moveTo(points[0].x, points[0].y)

      for (let p = 0; p < points.length - 1; p++) {
        const p0 = points[p]
        const p1 = points[p + 1]
        const midX = (p0.x + p1.x) * 0.5
        const midY = (p0.y + p1.y) * 0.5
        path.quadraticCurveTo(p0.x, p0.y, midX, midY)
      }
      path.lineTo(points[points.length - 1].x, points[points.length - 1].y)

      // Multi-layer glowing neon filament rendering
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      // 1. Soft ambient aura
      ctx.strokeStyle = `${colorBase} ${opacity * 0.18})`
      ctx.lineWidth = 15
      ctx.stroke(path)

      // 2. Vibrant radiant body
      ctx.strokeStyle = `${colorBase} ${opacity * 0.55})`
      ctx.lineWidth = 5
      ctx.stroke(path)

      // 3. Ultra-bright high-light filament
      const brightColor = this.hsl.isMonochrome
        ? `rgba(255, 255, 255, ${opacity * 0.92})`
        : `${colorBase.replace(`${this.hsl.l}%`, "94%")} ${opacity * 0.88})`
      ctx.strokeStyle = brightColor
      ctx.lineWidth = 1.8
      ctx.stroke(path)

      // 4. White-hot diamond core
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.95})`
      ctx.lineWidth = 0.9
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

    // Smooth mouse position interpolation
    if (this.mouse.active) {
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.12 * dt
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.12 * dt
    } else {
      this.mouse.x = -9999
      this.mouse.y = -9999
    }

    // Canvas clearing / Background rendering
    if (this.transparent) {
      ctx.clearRect(0, 0, W, H)
    } else {
      // Cosmic Deep Radial Gradient Background
      const bgGrad = ctx.createRadialGradient(
        W / 2,
        H / 2,
        W * 0.1,
        W / 2,
        H / 2,
        Math.max(W, H) * 0.8,
      )
      bgGrad.addColorStop(0, "#060914")
      bgGrad.addColorStop(0.6, "#020409")
      bgGrad.addColorStop(1, "#010103")
      ctx.fillStyle = bgGrad
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
        const alpha =
          s.baseAlpha * (0.4 + Math.sin(s.twinklePhase) * 0.6)

        ctx.fillStyle = `${s.color} ${Math.max(0, Math.min(1, alpha))})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Additive blending for gorgeous neon ribbons
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
      0.55,
      this._colorCache[0],
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
      0.8,
      this._colorCache[1],
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
      0.55,
      this._colorCache[2],
      cosR,
      sinR,
      dt,
    )

    // Reset composite operation
    ctx.globalCompositeOperation = "source-over"
  }
}
