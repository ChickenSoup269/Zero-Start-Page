/**
 * AuroraWaveEffect — High-Definition (HD) Arctic Aurora Borealis Engine
 *
 * Simulates genuine atmospheric Northern Lights (Aurora Borealis) physics:
 *  - Pure, peaceful celestial silk drapery ribbons with High-DPI (Retina/4K) crisp rendering.
 *  - Volumetric atmospheric corona wash (deep polar sky radiance).
 *  - Double-pass spectral bloom: vibrant silk veil, soft neon halo, and white-hot photon spine.
 *  - Subtle distant twinkling polar night stars (clean, distraction-free).
 *  - Undisturbed natural flow (mouse effect removed).
 *  - 100% pure Aurora Borealis (zero clutter).
 */

export class AuroraWaveEffect {
  constructor(canvasId, color = "#00bcd4", options = {}) {
    this.canvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId

    if (!this.canvas) {
      console.warn(`[AuroraWaveEffect] Canvas "${canvasId}" not found.`)
      return
    }

    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.destroyed = false
    this.rafId = null

    // Configuration
    this.color = color
    this.waveCount = 6
    this.wavePoints = 80
    this.waveAmplitude = options.waveAmplitude || 75
    this.waveFrequency = 0.0030
    this.brightness = options.brightness !== undefined ? options.brightness : 0.75
    this.speed = options.speed !== undefined ? options.speed : 1.0
    this.transparent = options.transparent !== false
    this.backgroundColor = options.backgroundColor || "#02040f"
    this.bgOpacity = options.bgOpacity !== undefined ? options.bgOpacity : 0.15
    this.notesEnabled = false // Pure celestial aurora: musical notes removed

    // Timing & DPR
    this.time = 0
    this.lastTime = 0
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = 0
    this.height = 0

    // Simulation Entities
    this._gradients = []
    this._waveConfigs = []
    this._particles = []

    // Event Handlers
    this._resizeHandler = () => this.resize()
    this._visibilityHandler = () => this._handleVisibilityChange()

    window.addEventListener("resize", this._resizeHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)
    this.resize()
  }

  resize() {
    if (!this.canvas) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = Math.round(this.width * this.dpr)
    this.canvas.height = Math.round(this.height * this.dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.ctx.scale(this.dpr, this.dpr)
    }

    this._buildCache()
  }

  _onResize() {
    this.resize()
  }

  _buildCache() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight
    const baseHsl = this._hexToHsl(this.color)

    this._gradients = []
    this._waveConfigs = []

    for (let w = 0; w < this.waveCount; w++) {
      const z = 0.25 + (w / (this.waveCount - 1)) * 0.75
      // Natural aurora spectral shift (emerald green -> cyan -> violet crests)
      const hueShift = (w - this.waveCount * 0.5) * 20
      const hue = (baseHsl.h + hueShift + 360) % 360
      const op = Math.max(0.12, Math.min(1.0, this.brightness * (0.32 + z * 0.38)))

      // Triple-pass fluid HD aurora gradient with radiant luminous core
      const grad = this.ctx.createLinearGradient(0, 0, 0, H * 0.9)
      grad.addColorStop(0.0, `hsla(${(hue + 340) % 360}, 85%, 30%, 0)`)
      grad.addColorStop(0.2, `hsla(${hue}, 92%, 58%, ${(op * 0.4).toFixed(3)})`)
      grad.addColorStop(0.48, `hsla(${(hue + 24) % 360}, 100%, 76%, ${(op * 0.88).toFixed(3)})`)
      grad.addColorStop(0.72, `hsla(${hue}, 90%, 52%, ${(op * 0.35).toFixed(3)})`)
      grad.addColorStop(1.0, `hsla(${(hue + 40) % 360}, 80%, 25%, 0)`)

      this._gradients.push(grad)

      this._waveConfigs.push({
        phase: Math.random() * Math.PI * 2,
        speed: 0.004 + w * 0.0016,
        amplitude: 0.7 + w * 0.16,
        yOffset: (w - this.waveCount * 0.5) * (H * 0.065),
        z,
        hue,
      })
    }

    // Gentle distant cosmic star motes (clean, subtle, non-intrusive)
    const starCount = Math.floor(32 + 18 * this.brightness)
    this._particles = Array.from({ length: starCount }, () => ({
      x: Math.random() * W,
      y: Math.random() * (H * 0.85),
      size: Math.random() * 1.8 + 0.5,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.02 + 0.008,
      driftX: (Math.random() - 0.5) * 0.22,
      driftY: (Math.random() - 0.5) * 0.08,
      z: Math.random() * 0.8 + 0.2,
    }))
  }

  _hexToHsl(hex) {
    if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
      return { h: 187, s: 100, l: 42 } // Default cyan #00bcd4
    }
    const clean = hex.replace("#", "")
    const full =
      clean.length === 3
        ? clean.split("").map((c) => c + c).join("")
        : clean
    const r = parseInt(full.slice(0, 2), 16) / 255
    const g = parseInt(full.slice(2, 4), 16) / 255
    const b = parseInt(full.slice(4, 6), 16) / 255

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

  _getWaveY(x, t, waveIdx) {
    const cfg = this._waveConfigs[waveIdx] || this._waveConfigs[0]
    const { phase, speed, amplitude } = cfg
    const time = t * speed * this.speed
    const f = this.waveFrequency
    const a = this.waveAmplitude * amplitude

    // Multi-octave harmonic fluid equation for pure, silky, peaceful flow
    let y = Math.sin(x * f + time + phase) * a
    y += Math.sin(x * f * 2.15 + time * 1.35 + phase * 0.65) * (a * 0.34)
    y += Math.cos(x * f * 0.82 - time * 0.62 + phase * 0.42) * (a * 0.38)
    y += Math.sin(x * f * 3.4 + time * 2.1 + phase * 1.2) * (a * 0.12)

    const centerY = (this.height || window.innerHeight) * 0.48
    return centerY + cfg.yOffset + y
  }

  _handleVisibilityChange() {
    if (document.visibilityState === "visible" && this.active) {
      this.lastTime = performance.now()
    }
  }

  start() {
    if (this.active || this.destroyed) return
    this.active = true
    this.lastTime = performance.now()
    this.canvas.style.display = "block"
    this.resize()

    const loop = (timestamp) => {
      if (!this.active || this.destroyed) return
      this.rafId = requestAnimationFrame(loop)
      if (document.visibilityState === "hidden") return
      this.animate(timestamp)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stop() {
    if (!this.active) return
    this.active = false

    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height)
    }
    this.canvas.style.display = "none"
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  // Harmless compatibility stub: musical notes have been removed in favor of pure HD aurora
  setNotes() {
    this.notesEnabled = false
  }

  updateColor(hex) {
    if (hex && typeof hex === "string") {
      this.color = hex
      this._buildCache()
    }
  }

  setOptions(options = {}) {
    let rebuild = false
    if (options.color !== undefined && options.color !== this.color) {
      this.color = options.color
      rebuild = true
    }
    if (options.brightness !== undefined && options.brightness !== this.brightness) {
      this.brightness = options.brightness
      rebuild = true
    }
    if (options.speed !== undefined) this.speed = options.speed
    if (options.waveAmplitude !== undefined) this.waveAmplitude = options.waveAmplitude
    if (options.transparent !== undefined) this.transparent = options.transparent
    if (options.backgroundColor !== undefined) this.backgroundColor = options.backgroundColor
    if (options.bgOpacity !== undefined) this.bgOpacity = options.bgOpacity

    if (rebuild) {
      this._buildCache()
    }
  }

  animate(currentTime = 0) {
    if (!this.active || this.destroyed) return

    const rawElapsed = this.lastTime ? currentTime - this.lastTime : 16.67
    this.lastTime = currentTime
    const dt = Math.min(Math.max(rawElapsed / (1000 / 60), 0.1), 3.0)
    this.time += 0.011 * dt

    const ctx = this.ctx
    const W = this.width
    const H = this.height

    // 1. Background Fill / Clear
    ctx.globalCompositeOperation = "source-over"
    if (this.transparent) {
      ctx.clearRect(0, 0, W, H)
      if (this.bgOpacity > 0.01) {
        ctx.fillStyle = `rgba(1, 2, 12, ${this.bgOpacity})`
        ctx.fillRect(0, 0, W, H)
      }
    } else {
      ctx.fillStyle = this.backgroundColor
      ctx.fillRect(0, 0, W, H)
    }

    const baseHsl = this._hexToHsl(this.color)

    // 2. High-Definition Volumetric Atmospheric Aurora Glow Wash (Deep sky radiance)
    ctx.globalCompositeOperation = "lighter"
    const auraGrad = ctx.createRadialGradient(
      W * 0.5, H * 0.46, 80,
      W * 0.5, H * 0.46, Math.max(W, H) * 0.72
    )
    const auraOp = (this.brightness * 0.16).toFixed(3)
    auraGrad.addColorStop(0, `hsla(${baseHsl.h}, 95%, 70%, ${auraOp})`)
    auraGrad.addColorStop(0.38, `hsla(${(baseHsl.h + 24) % 360}, 92%, 58%, ${(auraOp * 0.6).toFixed(3)})`)
    auraGrad.addColorStop(0.75, `hsla(${(baseHsl.h + 325) % 360}, 85%, 42%, ${(auraOp * 0.22).toFixed(3)})`)
    auraGrad.addColorStop(1.0, `hsla(${baseHsl.h}, 80%, 20%, 0)`)
    ctx.fillStyle = auraGrad
    ctx.fillRect(0, 0, W, H)

    // 3. Render Subtle Cosmic Night Stars (Peaceful, soft twinkling motes)
    ctx.globalCompositeOperation = "screen"
    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i]
      p.phase += p.twinkleSpeed * dt
      p.x += p.driftX * this.speed * dt
      p.y += p.driftY * this.speed * dt

      if (p.x < 0) p.x = W
      if (p.x > W) p.x = 0
      if (p.y < 0) p.y = H
      if (p.y > H) p.y = 0

      const pOpacity =
        (Math.sin(p.phase) * 0.5 + 0.5) * 0.72 * this.brightness * p.z
      const pSize = p.size * (0.8 + 0.3 * Math.sin(p.phase * 0.8))

      ctx.globalAlpha = Math.max(0, Math.min(1, pOpacity))
      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.arc(p.x, p.y, pSize, 0, Math.PI * 2)
      ctx.fill()

      // Soft halo on brighter stars
      if (p.size > 1.3) {
        ctx.fillStyle = `hsla(${baseHsl.h}, 100%, 82%, ${(pOpacity * 0.32).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, pSize * 2.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1.0

    // 4. Render Fluid HD Aurora Waves (Pure Organic Silk Curtains)
    // Extended coordinate range [-extra, W + extra] guarantees zero edge cuts
    ctx.globalCompositeOperation = "lighter"
    const extra = 180
    const startX = -extra
    const endX = W + extra
    const span = endX - startX
    const pointsCount = this.wavePoints
    const step = span / pointsCount

    for (let w = 0; w < this.waveCount; w++) {
      const cfg = this._waveConfigs[w]
      const thickness =
        (130 + Math.sin(this.time * 0.52 + w * 1.12) * 44) * cfg.z

      const topPts = []
      const botPts = []

      for (let i = 0; i <= pointsCount; i++) {
        const x = startX + i * step
        const yTop = this._getWaveY(x, this.time, w)
        const yBot = yTop + thickness
        topPts.push({ x, y: yTop })
        botPts.push({ x, y: yBot })
      }

      // Draw Main Silk Veil
      ctx.fillStyle = this._gradients[w]
      ctx.beginPath()
      ctx.moveTo(topPts[0].x, topPts[0].y)

      // Smooth Quadratic Spline Curvature (Top Edge)
      for (let i = 1; i < topPts.length - 1; i++) {
        const xc = (topPts[i].x + topPts[i + 1].x) * 0.5
        const yc = (topPts[i].y + topPts[i + 1].y) * 0.5
        ctx.quadraticCurveTo(topPts[i].x, topPts[i].y, xc, yc)
      }
      ctx.lineTo(topPts[topPts.length - 1].x, topPts[topPts.length - 1].y)

      // Smooth Bottom Edge Return
      ctx.lineTo(botPts[botPts.length - 1].x, botPts[botPts.length - 1].y)
      for (let i = botPts.length - 2; i >= 0; i--) {
        const xc = (botPts[i].x + botPts[i + 1].x) * 0.5
        const yc = (botPts[i].y + botPts[i + 1].y) * 0.5
        ctx.quadraticCurveTo(botPts[i + 1].x, botPts[i + 1].y, xc, yc)
      }
      ctx.lineTo(botPts[0].x, botPts[0].y)
      ctx.closePath()
      ctx.fill()

      // High-Definition Radiant Photon Spines (White-Hot Celestial Centerline with Soft Bloom)
      if (w >= 1 && w <= 4) {
        // Pass A: Soft Spectral Neon Halo
        ctx.strokeStyle = `hsla(${cfg.hue}, 100%, 75%, ${(0.28 * this.brightness * cfg.z).toFixed(3)})`
        ctx.lineWidth = 4.2
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.beginPath()
        ctx.moveTo(topPts[0].x, topPts[0].y + thickness * 0.40)
        for (let i = 1; i < topPts.length - 1; i++) {
          const xc = (topPts[i].x + topPts[i + 1].x) * 0.5
          const yc = (topPts[i].y + topPts[i + 1].y) * 0.5 + thickness * 0.40
          ctx.quadraticCurveTo(topPts[i].x, topPts[i].y + thickness * 0.40, xc, yc)
        }
        ctx.stroke()

        // Pass B: Intense White-Hot Photon Core
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.55 * this.brightness * cfg.z).toFixed(3)})`
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(topPts[0].x, topPts[0].y + thickness * 0.40)
        for (let i = 1; i < topPts.length - 1; i++) {
          const xc = (topPts[i].x + topPts[i + 1].x) * 0.5
          const yc = (topPts[i].y + topPts[i + 1].y) * 0.5 + thickness * 0.40
          ctx.quadraticCurveTo(topPts[i].x, topPts[i].y + thickness * 0.40, xc, yc)
        }
        ctx.stroke()
      }
    }

    ctx.globalCompositeOperation = "source-over"
  }
}

