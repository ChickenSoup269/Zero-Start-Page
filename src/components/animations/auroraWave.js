export class AuroraWaveEffect {
  constructor(canvasId, color = "#00bcd4") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.time = 0

    // Config for a more majestic, flowing aurora appearance
    this.waveCount = 5
    this.wavePoints = 40
    this.waveAmplitude = 120
    this.waveFrequency = 0.005

    // FPS
    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    // Cached data
    this._gradients = []
    this._waveConfigs = []
    this._particles = []
    this._rgb = { r: 0, g: 188, b: 212 }

    this._resizeHandler = () => this._onResize()
    window.addEventListener("resize", this._resizeHandler)
    this._onResize()
  }

  // ─── Cache helpers ────────────────────────────────────────────────────────

  _buildCache() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    this._rgb = this._hexToRgb(this.color)
    const { r, g, b } = this._rgb
    const centerY = H * 0.45
    const depth = H * 0.5

    this._gradients = []
    this._waveConfigs = []

    for (let w = 0; w < this.waveCount; w++) {
      const waveOffset = (w / this.waveCount) * Math.PI * 2
      const hueShift = (w / this.waveCount) * 80 - 40

      const rr = Math.max(0, Math.min(255, r + hueShift * 0.8))
      const gg = Math.max(0, Math.min(255, g + hueShift * 1.5))
      const bb = Math.max(0, Math.min(255, b + hueShift * 0.5))

      // Vertical gradient for the aurora curtain
      const grad = ctx.createLinearGradient(
        0,
        centerY - depth * 0.5,
        0,
        centerY + depth * 0.8,
      )
      grad.addColorStop(0, `rgba(${rr},${gg},${bb},0)`)
      grad.addColorStop(
        0.3,
        `rgba(${Math.min(255, rr + 40)},${Math.min(255, gg + 40)},${Math.min(255, bb + 40)},0.15)`,
      )
      grad.addColorStop(0.6, `rgba(${rr},${gg},${bb},0.4)`)
      grad.addColorStop(0.8, `rgba(${rr * 0.5},${gg * 0.5},${bb * 0.5},0.1)`)
      grad.addColorStop(1, `rgba(0,0,0,0)`)

      this._gradients.push(grad)

      this._waveConfigs.push({
        waveOffset,
        speedMultiplier: 0.8 + w * 0.15,
        ampMultiplier: 1 + w * 0.1,
        yOffset: (w - this.waveCount / 2) * 30,
      })
    }

    // Stars/Particles (sparkling in the background)
    this._particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.7, // mostly in the upper canvas
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random(),
      speed: Math.random() * 0.02 + 0.01,
    }))
  }

  _onResize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._buildCache()
  }

  // ─── Wave math ────────────────────────────────────────────────────────────

  _waveY(x, t, waveOffset, ampMult, speedMult) {
    const f = this.waveFrequency
    const a = this.waveAmplitude * ampMult
    const time = t * speedMult

    // Complex flowing wave combination
    return (
      Math.sin(x * f + time + waveOffset) * a +
      Math.sin(x * f * 1.5 - time * 0.8 + waveOffset * 2) * (a * 0.4) +
      Math.cos(x * f * 0.5 + time * 1.2 + waveOffset) * (a * 0.6)
    )
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.animate(this.lastDrawTime)
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  // ─── Render loop ──────────────────────────────────────────────────────────

  animate(currentTime = 0) {
    if (!this.active) return
    requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const centerY = H * 0.45

    // Smooth fading background for trail
    ctx.globalCompositeOperation = "source-over"
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)"
    ctx.fillRect(0, 0, W, H)

    // Render stars/particles
    ctx.globalCompositeOperation = "screen"
    for (let p of this._particles) {
      p.alpha += p.speed
      const currentAlpha = (Math.sin(p.alpha) * 0.5 + 0.5) * 0.6 // 0 to 0.6
      ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha.toFixed(2)})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    this.time += 0.006 // majestic, slow time step

    const t = this.time
    const pts = this.wavePoints
    const xStep = W / pts

    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    for (let w = 0; w < this.waveCount; w++) {
      const cfg = this._waveConfigs[w]
      const { waveOffset, speedMultiplier, ampMultiplier, yOffset } = cfg
      const baseY = centerY + yOffset

      const ribbonThickness = 120 + Math.sin(t * 2 + waveOffset) * 40

      // Reset blend mode for waves to make them vibrant
      ctx.globalCompositeOperation = "lighter"
      ctx.beginPath()

      // Top curve (going right)
      let px = 0
      let py =
        baseY + this._waveY(0, t, waveOffset, ampMultiplier, speedMultiplier)
      ctx.moveTo(px, py)

      for (let i = 1; i <= pts; i++) {
        const x = i * xStep
        const y =
          baseY + this._waveY(x, t, waveOffset, ampMultiplier, speedMultiplier)
        const cx = (px + x) * 0.5
        const cy = (py + y) * 0.5
        ctx.quadraticCurveTo(px, py, cx, cy)
        px = x
        py = y
      }

      // Bottom curve (going left to create a ribbon shape)
      for (let i = pts; i >= 0; i--) {
        const x = i * xStep
        const bottomY =
          baseY +
          this._waveY(
            x,
            t,
            waveOffset + 0.2,
            ampMultiplier * 0.9,
            speedMultiplier,
          ) +
          ribbonThickness
        ctx.lineTo(x, bottomY)
      }

      ctx.closePath()
      ctx.fillStyle = this._gradients[w]
      ctx.fill()
    }
  }

  // ─── Color update (called from settings) ─────────────────────────────────

  setColor(hex) {
    this.color = hex
    this._buildCache()
  }

  // ─── Utils ────────────────────────────────────────────────────────────────

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 188, b: 212 }
  }

  /** @deprecated kept for backward compat */
  hexToRgb(hex) {
    return this._hexToRgb(hex)
  }
}
