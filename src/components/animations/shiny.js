/**
 * Shiny / Holographic Card Effect
 * Like a Pokemon holographic card — full-screen diagonal rainbow shimmer
 * with a sweeping iridescent band and sparkle glints.
 * Supports custom tint color via updateColor(hex).
 */
export class ShinyEffect {
  constructor(canvasId, color = "#ff0000") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.rafId = null
    this.phase = 0 // animation phase for gradient sweep
    this.hueOffset = 0 // base hue from color picker
    this.glints = []

    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this._setHueFromColor(color)
    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  /** Convert hex color → hue offset (0–360) */
  _setHueFromColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    if (max !== min) {
      const d = max - min
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
          break
        case g:
          h = ((b - r) / d + 2) / 6
          break
        case b:
          h = ((r - g) / d + 4) / 6
          break
      }
    }
    this.hueOffset = h * 360
  }

  updateColor(hex) {
    this._setHueFromColor(hex)
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._initGlints()
  }

  _initGlints() {
    this.glints = []
    const W = this.canvas.width
    const H = this.canvas.height
    for (let i = 0; i < 40; i++) {
      this.glints.push(this._makeGlint(W, H))
    }
  }

  _makeGlint(W, H) {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1.5 + Math.random() * 5,
      pts: Math.random() > 0.5 ? 4 : 6,
      alpha: 0,
      maxAlpha: 0.5 + Math.random() * 0.5,
      state: "in",
      holdTime: 0,
      holdMax: 8 + Math.floor(Math.random() * 20),
      speed: 0.04 + Math.random() * 0.05,
    }
  }

  _drawStar(ctx, r, pts) {
    const step = Math.PI / pts
    const innerR = r * 0.2
    ctx.beginPath()
    ctx.moveTo(0, -r)
    for (let i = 0; i < pts * 2; i++) {
      const rad = i % 2 === 0 ? r : innerR
      const a = i * step - Math.PI / 2
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad)
    }
    ctx.closePath()
    ctx.fill()
  }

  start() {
    if (this.active) return
    this.active = true
    this.phase = 0
    this.lastDrawTime = 0
    this.rafId = this._animId = requestAnimationFrame((t) => this.animate(t))
    this.canvas.style.display = "block"
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this.rafId = this._animId = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const W = this.canvas.width
    const H = this.canvas.height
    const ctx = this.ctx

    this.phase += 0.004

    ctx.clearRect(0, 0, W, H)

    const ho = this.hueOffset
    const diag = Math.sqrt(W * W + H * H)
    const angle = (135 * Math.PI) / 180
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)

    // --- Layer 1: full-screen slow-panning holographic rainbow ---
    ctx.save()
    ctx.globalCompositeOperation = "source-over"

    const panOffset = Math.sin(this.phase * 0.4) * diag * 0.6
    const cx = W / 2 + cosA * panOffset
    const cy = H / 2 + sinA * panOffset
    const gx0 = cx - cosA * diag
    const gy0 = cy - sinA * diag
    const gx1 = cx + cosA * diag
    const gy1 = cy + sinA * diag

    const rainbow = ctx.createLinearGradient(gx0, gy0, gx1, gy1)
    const steps = 14
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const hue = (ho + t * 360) % 360
      rainbow.addColorStop(t, `hsla(${hue},100%,65%,0.2)`)
    }
    ctx.fillStyle = rainbow
    ctx.fillRect(0, 0, W, H)
    ctx.restore()

    // --- Layer 2: bright sweeping iridescent band ---
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    const sweep = ((this.phase * 0.25) % 1) * (diag * 2 + 600) - (diag + 300)
    const bcx = W / 2 + cosA * sweep
    const bcy = H / 2 + sinA * sweep
    const bHalf = diag * 0.18
    const bx0 = bcx - cosA * bHalf
    const by0 = bcy - sinA * bHalf
    const bx1 = bcx + cosA * bHalf
    const by1 = bcy + sinA * bHalf

    const hNow = (ho + this.phase * 25) % 360
    const band = ctx.createLinearGradient(bx0, by0, bx1, by1)
    band.addColorStop(0, `hsla(${hNow},100%,75%,0)`)
    band.addColorStop(0.3, `hsla(${(hNow + 40) % 360},100%,88%,0.08)`)
    band.addColorStop(0.5, `hsla(${(hNow + 80) % 360},100%,97%,0.18)`)
    band.addColorStop(0.7, `hsla(${(hNow + 120) % 360},100%,88%,0.08)`)
    band.addColorStop(1, `hsla(${(hNow + 160) % 360},100%,75%,0)`)

    ctx.fillStyle = band
    ctx.fillRect(0, 0, W, H)
    ctx.restore()

    // --- Layer 3: sparkle glints ---
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    for (let i = 0; i < this.glints.length; i++) {
      const g = this.glints[i]

      if (g.state === "in") {
        g.alpha += g.speed
        if (g.alpha >= g.maxAlpha) {
          g.alpha = g.maxAlpha
          g.state = "hold"
          g.holdTime = 0
        }
      } else if (g.state === "hold") {
        if (++g.holdTime >= g.holdMax) g.state = "out"
      } else {
        g.alpha -= g.speed
        if (g.alpha <= 0) {
          this.glints[i] = this._makeGlint(W, H)
          continue
        }
      }

      if (g.alpha <= 0) continue

      const hue = (ho + (g.x / W) * 200 + this.phase * 50) % 360

      ctx.save()
      ctx.globalAlpha = g.alpha
      ctx.translate(g.x, g.y)

      // halo glow
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, g.r * 3)
      grd.addColorStop(0, `hsla(${hue},100%,100%,1)`)
      grd.addColorStop(0.5, `hsla(${hue},100%,80%,0.4)`)
      grd.addColorStop(1, `rgba(255,255,255,0)`)
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(0, 0, g.r * 3, 0, Math.PI * 2)
      ctx.fill()

      // star spike
      ctx.fillStyle = "rgba(255,255,255,0.92)"
      this._drawStar(ctx, g.r, g.pts)

      ctx.restore()
    }

    ctx.globalAlpha = 1
    ctx.restore()
  }
}
