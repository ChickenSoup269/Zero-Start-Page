/**
 * MusicBarsEffect - ambient equalizer-style bars.
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
    this.targetFrameMs = 1000 / 36
    this.pixelRatio = 0.85
    this.color = color
    this.bars = []
    this.rings = []
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
    this.barColor = `rgba(${r}, ${g}, ${b}, 0.58)`
    this.glowColor = `rgba(${r}, ${g}, ${b}, 0.18)`
    this.peakColor = `rgba(${Math.min(r + 76, 255)}, ${Math.min(g + 76, 255)}, ${Math.min(b + 76, 255)}, 0.72)`
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
    const count = Math.max(28, Math.min(64, Math.floor(W / 30)))
    const centerY = H * 0.56
    this.bars = Array.from({ length: count }, (_, i) => {
      const laneX = ((i + 0.5) / count) * W
      const distanceFromCenter = Math.abs(i / Math.max(count - 1, 1) - 0.5) * 2
      const heightBias = 1 - distanceFromCenter * 0.34
      return {
        x: laneX + (Math.random() - 0.5) * 10,
        y: centerY + (Math.random() - 0.5) * H * 0.2,
        width: 3 + Math.random() * 5,
        minHeight: 14 + Math.random() * 18,
        maxHeight: (82 + Math.random() * 150) * heightBias,
        lastHeight: 20,
        peak: 24,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 1.1 + Math.random() * 2.2,
        floatSpeed: 5 + Math.random() * 9,
        sway: 4 + Math.random() * 12,
        alpha: 0.5 + Math.random() * 0.32,
        delay: i / Math.max(count - 1, 1),
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

  _spawnRing() {
    if (this.rings.length > 5) this.rings.shift()
    this.rings.push({
      x: window.innerWidth * (0.2 + Math.random() * 0.6),
      y: window.innerHeight * (0.44 + Math.random() * 0.26),
      radius: 20 + Math.random() * 40,
      life: 1,
      speed: 58 + Math.random() * 52,
    })
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

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    this.bars = []
    this.rings = []
    this.sparks = []
  }

  _drawBars(dt) {
    const ctx = this.ctx
    const H = window.innerHeight
    const masterBeat =
      0.52 +
      0.26 * Math.sin(this.time * 2.4) +
      0.18 * Math.sin(this.time * 5.7) +
      0.08 * Math.sin(this.time * 11.3)

    ctx.globalCompositeOperation = "lighter"

    for (const bar of this.bars) {
      bar.phase += bar.pulseSpeed * dt
      bar.y += Math.sin(this.time * 0.22 + bar.delay * Math.PI * 2) * bar.floatSpeed * dt

      const laneWave = 0.5 + 0.5 * Math.sin(this.time * 3.1 - bar.delay * Math.PI * 5)
      const shimmer = 0.5 + 0.5 * Math.sin(bar.phase)
      const beat = Math.max(0, Math.min(1, masterBeat * 0.58 + laneWave * 0.28 + shimmer * 0.14))
      const targetHeight = bar.minHeight + (bar.maxHeight - bar.minHeight) * beat
      const height = bar.lastHeight + (targetHeight - bar.lastHeight) * Math.min(1, dt * 11)
      bar.lastHeight = height
      bar.peak = Math.max(height, bar.peak - dt * (70 + bar.maxHeight * 0.25))
      const x = bar.x + Math.sin(this.time * 0.6 + bar.phase) * bar.sway
      const y = bar.y - height * 0.5
      const glowWidth = bar.width + 14 + beat * 8
      const capY = bar.y - bar.peak * 0.5 - 5

      ctx.globalAlpha = bar.alpha
      ctx.fillStyle = this.glowColor
      ctx.beginPath()
      ctx.roundRect(x - glowWidth * 0.5, y, glowWidth, height, glowWidth * 0.5)
      ctx.fill()

      const grad = ctx.createLinearGradient(x, y, x, y + height)
      grad.addColorStop(0, this.peakColor)
      grad.addColorStop(0.45, this.barColor)
      grad.addColorStop(1, `rgba(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b}, 0.16)`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.roundRect(x - bar.width * 0.5, y, bar.width, height, bar.width * 0.5)
      ctx.fill()

      ctx.globalAlpha = bar.alpha * 0.8
      ctx.fillStyle = this.coreColor
      ctx.beginPath()
      ctx.roundRect(x - 0.5, y + height * 0.12, 1, height * 0.76, 0.5)
      ctx.fill()

      ctx.globalAlpha = bar.alpha * 0.6
      ctx.fillStyle = this.peakColor
      ctx.beginPath()
      ctx.roundRect(x - bar.width * 0.72, capY, bar.width * 1.44, 4, 2)
      ctx.fill()
      
      // Additional bright center for the peak cap
      ctx.fillStyle = "#ffffff"
      ctx.globalAlpha = bar.alpha * 0.9
      ctx.beginPath()
      ctx.roundRect(x - bar.width * 0.36, capY + 1, bar.width * 0.72, 2, 1)
      ctx.fill()

      ctx.globalAlpha = bar.alpha * 0.13
      ctx.fillStyle = this.barColor
      ctx.beginPath()
      ctx.roundRect(x - bar.width * 0.5, bar.y + height * 0.14, bar.width, height * 0.44, bar.width * 0.5)
      ctx.fill()
    }

    if (Math.sin(this.time * 2.35) > 0.985) this._spawnRing()
    this._drawRings(dt)
  }

  _drawRings(dt) {
    const ctx = this.ctx
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i]
      ring.life -= dt * 0.85
      ring.radius += ring.speed * dt
      if (ring.life <= 0) {
        this.rings.splice(i, 1)
        continue
      }
      ctx.globalAlpha = ring.life * 0.35
      ctx.strokeStyle = this.peakColor
      ctx.lineWidth = 1.5 + ring.life * 1.5
      ctx.beginPath()
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  _drawSparks(dt) {
    const ctx = this.ctx
    const W = window.innerWidth
    const H = window.innerHeight

    for (const spark of this.sparks) {
      spark.phase += dt
      spark.y -= spark.speed * dt
      spark.x += Math.sin(spark.phase * 1.4) * 0.16
      if (spark.y < -8) {
        spark.y = H + 8
        spark.x = Math.random() * W
      }

      ctx.globalAlpha = spark.alpha * (0.7 + 0.3 * Math.sin(spark.phase * 2))
      ctx.fillStyle = this.peakColor
      ctx.beginPath()
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2)
      ctx.fill()
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
