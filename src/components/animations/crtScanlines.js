import { hexToRgb } from "../../utils/colors.js"

/**
 * CrtScanlinesEffect (Pro Terminal Edition)
 * Inspired by high-end retro terminal emulators.
 * Features: Chromatic aberration, phosphor glow, and high-frequency scanlines.
 */
export class CrtScanlinesEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.time = 0
    
    this.color = options.scanColor || "#00ff41"
    
    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  updateScanColor(hex) {
    this.color = hex
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this.animate()
  }

  stop() {
    this.active = false
    if (this._animId) cancelAnimationFrame(this._animId)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  animate() {
    if (!this.active) return
    this._animId = requestAnimationFrame(() => this.animate())
    this.time += 0.01
    this._draw()
  }

  _draw() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const rgb = hexToRgb(this.color)

    // Clear canvas for transparency
    ctx.clearRect(0, 0, W, H)

    // 1. Chromatic Aberration & Basic Phosphor Layer
    ctx.save()
    ctx.globalCompositeOperation = "screen"
    
    // Main glow
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.03)`
    ctx.fillRect(0, 0, W, H)

    // Blue offset (Subtle aberration)
    ctx.fillStyle = `rgba(0, 0, 50, 0.02)`
    ctx.fillRect(2, 0, W, H)
    ctx.restore()

    // 2. High-Frequency Scanlines
    ctx.save()
    const scanlineSpacing = 3
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)" // Subtle darkening for scanlines
    for (let y = 0; y < H; y += scanlineSpacing) {
      ctx.fillRect(0, y, W, 1)
    }
    ctx.restore()

    // 3. Rolling Scan Beam
    const beamY = (this.time * 200) % (H + 600) - 300
    const beamGrad = ctx.createLinearGradient(0, beamY, 0, beamY + 250)
    beamGrad.addColorStop(0, "rgba(255, 255, 255, 0)")
    beamGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`)
    beamGrad.addColorStop(1, "rgba(255, 255, 255, 0)")
    
    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.fillStyle = beamGrad
    ctx.fillRect(0, beamY, W, 250)
    ctx.restore()

    // 4. Subtle Vignette (Transparent edges)
    const vignette = ctx.createRadialGradient(W/2, H/2, W * 0.4, W/2, H/2, W * 0.9)
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)")
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.4)")
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, W, H)
  }
}
