export class AuroraWaveEffect {
  constructor(canvasId, color = "#00bcd4") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.time = 0

    // Config
    this.waveCount = 4 // reduced from 5
    this.wavePoints = 26 // reduced from 50; smooth via quadraticCurveTo
    this.waveAmplitude = 100
    this.waveFrequency = 0.01

    // FPS
    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    // Cached per-wave data (rebuilt on resize / color change)
    this._gradients = []
    this._waveConfigs = []
    this._floatParticles = []
    this._rgb = { r: 0, g: 188, b: 212 }
    this._floatBaseColor = "0,188,212"

    this._resizeHandler = () => this._onResize()
    window.addEventListener("resize", this._resizeHandler)
    this._onResize()
  }

  // ─── Cache helpers ────────────────────────────────────────────────────────

  /** Re-builds gradients and configs. Call on resize or color change. */
  _buildCache() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    this._rgb = this._hexToRgb(this.color)
    const { r, g, b } = this._rgb
    const centerY = H * 0.6
    const amp = this.waveAmplitude

    this._gradients = []
    this._waveConfigs = []

    for (let w = 0; w < this.waveCount; w++) {
      const waveOffset = (w / this.waveCount) * Math.PI * 2
      const yOffset = (w - this.waveCount / 2) * 40
      const hueShift = (w / this.waveCount) * 60 - 30
      const rr = Math.min(255, Math.max(0, r + hueShift))
      const gg = Math.min(255, Math.max(0, g + hueShift))
      const bb = Math.min(255, Math.max(0, b + Math.abs(hueShift)))
      const alpha = 0.15 + w * 0.05

      // Build gradient once — reused every frame until next resize/color change
      const grad = ctx.createLinearGradient(
        0,
        centerY + yOffset - amp * 3,
        0,
        centerY + yOffset + amp * 3,
      )
      grad.addColorStop(0, `rgba(${rr},${gg},${bb},0)`)
      grad.addColorStop(0.3, `rgba(${rr},${gg},${bb},${alpha})`)
      grad.addColorStop(
        0.5,
        `rgba(${Math.min(255, rr + 30)},${Math.min(255, gg + 30)},${Math.min(255, bb + 30)},${alpha + 0.1})`,
      )
      grad.addColorStop(0.7, `rgba(${rr},${gg},${bb},${alpha})`)
      grad.addColorStop(1, `rgba(${rr},${gg},${bb},0)`)
      this._gradients.push(grad)

      // Pre-built shimmer halo color string (no Math.min per frame)
      const sr = Math.min(255, r + 80)
      const sg = Math.min(255, g + 80)
      const sbv = Math.min(255, b + 80)

      this._waveConfigs.push({
        waveOffset,
        yOffset,
        lineWidth: 28 + w * 8, // slightly thinner than before
        shimmerHalo: `${sr},${sg},${sbv}`,
      })
    }

    // Pre-allocate floating particles (fixed sizes — no Math.random in render loop)
    this._floatBaseColor = `${Math.min(255, r + 50)},${Math.min(255, g + 50)},${Math.min(255, b + 50)}`
    this._floatParticles = Array.from({ length: 20 }, (_, i) => ({
      xStep: 37 + i * 0.9,
      sinPhase: i * 0.31,
      sinAmp: 140 + (i % 5) * 22,
      size: 1 + (i % 3), // 1, 2, or 3 — fixed every frame
      opPhase: i * 0.41,
    }))
  }

  _onResize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._buildCache()
  }

  // ─── Wave math (inlined helper to avoid closure overhead) ─────────────────

  _waveY(x, t, waveOffset) {
    const f = this.waveFrequency
    const a = this.waveAmplitude
    return (
      Math.sin(x * f + t + waveOffset) * a +
      Math.sin(x * f * 2 + t * 1.5 + waveOffset) * (a * 0.5) +
      Math.sin(x * f * 0.5 + t * 0.7 + waveOffset) * (a * 1.5)
    )
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.animate(0)
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
    const centerY = H * 0.6

    // Fade trail — slightly higher opacity = fewer residual layers = faster composite
    ctx.fillStyle = "rgba(0,0,0,0.05)"
    ctx.fillRect(0, 0, W, H)

    this.time += 0.012

    const t = this.time
    const pts = this.wavePoints
    const xStep = W / pts

    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    for (let w = 0; w < this.waveCount; w++) {
      const cfg = this._waveConfigs[w]
      const { waveOffset, yOffset, lineWidth, shimmerHalo } = cfg
      const baseY = centerY + yOffset

      // ── Wave path (quadraticCurveTo = smooth curve with fewer points) ──
      ctx.beginPath()
      let px = 0
      let py = baseY + this._waveY(0, t, waveOffset)
      ctx.moveTo(px, py)

      for (let i = 1; i <= pts; i++) {
        const x = i * xStep
        const y = baseY + this._waveY(x, t, waveOffset)
        const cx = (px + x) * 0.5
        const cy = (py + y) * 0.5
        ctx.quadraticCurveTo(px, py, cx, cy)
        px = x
        py = y
      }

      ctx.strokeStyle = this._gradients[w]
      ctx.lineWidth = lineWidth
      ctx.stroke()

      // ── Shimmer particles — batched into ONE fill() call per wave ──
      // Halo pass (larger, tinted)
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const progress = (i / 8 + t * 0.15 + w * 0.1) % 1
        const x = progress * W
        const y = baseY + this._waveY(x, t, waveOffset)
        const intensity = Math.abs(Math.sin(progress * Math.PI)) * 0.7 + 0.3
        const sz = 6 * intensity
        ctx.moveTo(x + sz, y)
        ctx.arc(x, y, sz, 0, Math.PI * 2)
      }
      ctx.fillStyle = `rgba(${shimmerHalo},0.18)`
      ctx.fill()

      // Core pass (white, smaller)
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const progress = (i / 8 + t * 0.15 + w * 0.1) % 1
        const x = progress * W
        const y = baseY + this._waveY(x, t, waveOffset)
        const intensity = Math.abs(Math.sin(progress * Math.PI)) * 0.7 + 0.3
        const sz = 3 * intensity
        ctx.moveTo(x + sz, y)
        ctx.arc(x, y, sz, 0, Math.PI * 2)
      }
      ctx.fillStyle = "rgba(255,255,255,0.55)"
      ctx.fill()
    }

    // ── Floating particles (pre-allocated, no Math.random per frame) ──
    for (let i = 0; i < this._floatParticles.length; i++) {
      const p = this._floatParticles[i]
      const x = (p.xStep * i + t * 18) % W
      const y = centerY + Math.sin(x * 0.02 + t + p.sinPhase) * p.sinAmp
      const op = Math.sin(t * 2 + p.opPhase) * 0.25 + 0.35
      ctx.beginPath()
      ctx.arc(x, y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${this._floatBaseColor},${op.toFixed(2)})`
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
