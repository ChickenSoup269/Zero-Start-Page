/**
 * MusicBarsEffect - lightweight floating equalizer bars.
 */
export class MusicBarsEffect {
  constructor(canvasId, color = "#8be9fd") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.rafId = null
    this.lastDrawTime = 0
    this.time = 0
    this.targetFrameMs = 1000 / 30
    this.pixelRatio = 0.75
    this.color = color
    this.bars = []
    this.sparks = []
    this._resizeHandler = () => this.resize()

    this._setColorCache(color)
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  resize() {
    if (!this.canvas) return
    const ratio = Math.min(window.devicePixelRatio || 1, this.pixelRatio)
    this.pixelRatio = ratio
    this.canvas.width = Math.max(1, Math.floor(window.innerWidth * ratio))
    this.canvas.height = Math.max(1, Math.floor(window.innerHeight * ratio))
    this.canvas.style.width = "100vw"
    this.canvas.style.height = "100vh"
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    this._buildBars()
    this._buildSparks()
  }

  updateColor(color) {
    this.color = color || "#8be9fd"
    this._setColorCache(this.color)
  }

  _setColorCache(hex) {
    const { r, g, b } = this._hexToRgb(hex)
    this.rgb = { r, g, b }
    this.coreColor = `rgba(255, 255, 255, 0.82)`
    this.barColor = `rgba(${r}, ${g}, ${b}, 0.48)`
    this.glowColor = `rgba(${r}, ${g}, ${b}, 0.16)`
    this.sparkColor = `rgba(${r}, ${g}, ${b}, 0.38)`
  }

  _hexToRgb(hex) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "")
    if (!match) return { r: 139, g: 233, b: 253 }
    return {
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16),
    }
  }

  _buildBars() {
    const W = window.innerWidth
    const H = window.innerHeight
    const count = Math.max(22, Math.min(42, Math.floor(W / 44)))
    this.bars = Array.from({ length: count }, (_, i) => {
      const laneX = ((i + 0.5) / count) * W
      return {
        x: laneX + (Math.random() - 0.5) * 18,
        y: Math.random() * H,
        width: 3 + Math.random() * 4,
        minHeight: 18 + Math.random() * 20,
        maxHeight: 64 + Math.random() * 78,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.7 + Math.random() * 1.1,
        floatSpeed: 8 + Math.random() * 18,
        sway: 8 + Math.random() * 16,
        alpha: 0.45 + Math.random() * 0.35,
      }
    })
  }

  _buildSparks() {
    const W = window.innerWidth
    const H = window.innerHeight
    const count = Math.max(18, Math.min(36, Math.floor(W / 52)))
    this.sparks = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: 1 + Math.random() * 1.6,
      speed: 6 + Math.random() * 14,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.16 + Math.random() * 0.28,
    }))
  }

  start() {
    if (this.active || !this.canvas) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.canvas.style.display = "block"
    this.animate(this.lastDrawTime)
  }

  stop() {
    this.active = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    }
    if (this.canvas) this.canvas.style.display = "none"
  }

  _drawBars(dt) {
    const ctx = this.ctx
    const H = window.innerHeight

    ctx.globalCompositeOperation = "lighter"

    for (const bar of this.bars) {
      bar.phase += bar.pulseSpeed * dt
      bar.y -= bar.floatSpeed * dt
      if (bar.y < -bar.maxHeight) bar.y = H + bar.maxHeight

      const beat = 0.58 + 0.42 * Math.sin(bar.phase)
      const height = bar.minHeight + (bar.maxHeight - bar.minHeight) * beat
      const x = bar.x + Math.sin(this.time * 0.6 + bar.phase) * bar.sway
      const y = bar.y - height * 0.5
      const glowWidth = bar.width + 10

      ctx.globalAlpha = bar.alpha
      ctx.fillStyle = this.glowColor
      ctx.fillRect(x - glowWidth * 0.5, y, glowWidth, height)

      ctx.fillStyle = this.barColor
      ctx.fillRect(x - bar.width * 0.5, y, bar.width, height)

      ctx.globalAlpha = bar.alpha * 0.65
      ctx.fillStyle = this.coreColor
      ctx.fillRect(x - 0.5, y + height * 0.12, 1, height * 0.76)
    }
  }

  _drawSparks(dt) {
    const ctx = this.ctx
    const W = window.innerWidth
    const H = window.innerHeight

    ctx.fillStyle = this.sparkColor
    for (const spark of this.sparks) {
      spark.phase += dt
      spark.y -= spark.speed * dt
      spark.x += Math.sin(spark.phase * 1.4) * 0.16
      if (spark.y < -8) {
        spark.y = H + 8
        spark.x = Math.random() * W
      }

      ctx.globalAlpha = spark.alpha * (0.7 + 0.3 * Math.sin(spark.phase * 2))
      ctx.fillRect(spark.x, spark.y, spark.size, spark.size)
    }
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this.rafId = requestAnimationFrame((t) => this.animate(t))
    if (document.visibilityState === "hidden") return

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.targetFrameMs) return
    const dt = Math.min(elapsed / 1000, 0.05)
    this.lastDrawTime = currentTime - (elapsed % this.targetFrameMs)
    this.time += dt

    const ctx = this.ctx
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    this._drawBars(dt)
    this._drawSparks(dt)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = "source-over"
  }
}
