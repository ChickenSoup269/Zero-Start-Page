/**
 * CrtScanlinesEffect — Pro Retro Terminal HD Engine
 *
 * Designed like professional terminal emulators (Cool-Retro-Term / iTerm2 CRT shader):
 *  - 100% Flicker-Free, Strobe-Free, and Flash-Free: pleasant and comfortable for daily use.
 *  - Crystal-clear, steady subpixel scanlines that don't jitter or strain the eyes.
 *  - Subtle, calm rolling raster phosphor bar with gentle analog warmth.
 *  - Soft CRT terminal glass vignette.
 *  - Full Settings Integration: scanColor, scanFrequency, scanAngle, scanDensity, gamma.
 */

import { hexToRgb } from "../../utils/colors.js"

export class CrtScanlinesEffect {
  constructor(canvasId, options = {}) {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.destroyed = false
    this._animId = null

    // Configuration
    this.color = options.scanColor || "#7cffad"
    this.scanFrequency = options.scanFrequency !== undefined ? options.scanFrequency : 0.11
    this.scanAngle = options.scanAngle !== undefined ? options.scanAngle : 0
    this.scanDensity = options.scanDensity !== undefined ? Math.max(2, options.scanDensity) : 4
    this.gamma = options.gamma !== undefined ? options.gamma : 0.45
    this.backgroundColor = options.backgroundColor || "#000000"

    this._rgb = hexToRgb(this.color) || { r: 124, g: 255, b: 173 }
    this._bgRgb = hexToRgb(this.backgroundColor) || { r: 0, g: 0, b: 0 }

    // Simulation Timing & Screen
    this.beamPos = 0
    this.lastTime = performance.now()
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)

    this._resizeHandler = () => this.resize()
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
    document.addEventListener("visibilitychange", this._visibilityHandler)
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
    this.canvas.style.pointerEvents = "none"

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.ctx.scale(this.dpr, this.dpr)
    }
  }

  updateScanColor(hex) {
    if (!hex) return
    this.color = hex
    this._rgb = hexToRgb(this.color) || { r: 124, g: 255, b: 173 }
  }

  updateScanFrequency(freq) {
    if (freq !== undefined && !isNaN(freq)) {
      this.scanFrequency = Number(freq)
    }
  }

  updateScanAngle(angle) {
    if (angle !== undefined && !isNaN(angle)) {
      this.scanAngle = Number(angle)
    }
  }

  updateScanDensity(density) {
    if (density !== undefined && !isNaN(density)) {
      this.scanDensity = Math.max(2, Number(density))
    }
  }

  updateGamma(gamma) {
    if (gamma !== undefined && !isNaN(gamma)) {
      this.gamma = Number(gamma)
    }
  }

  updateBackgroundColor(color) {
    if (!color) return
    this.backgroundColor = color
    this._bgRgb = hexToRgb(this.backgroundColor) || { r: 0, g: 0, b: 0 }
  }

  setOptions(opts = {}) {
    if (opts.scanColor !== undefined) this.updateScanColor(opts.scanColor)
    if (opts.scanFrequency !== undefined) this.updateScanFrequency(opts.scanFrequency)
    if (opts.scanAngle !== undefined) this.updateScanAngle(opts.scanAngle)
    if (opts.scanDensity !== undefined) this.updateScanDensity(opts.scanDensity)
    if (opts.gamma !== undefined) this.updateGamma(opts.gamma)
    if (opts.backgroundColor !== undefined) this.updateBackgroundColor(opts.backgroundColor)
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.lastTime = performance.now()
    }
  }

  start() {
    if (this.active || this.destroyed) return
    this.active = true
    this.lastTime = performance.now()
    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"

    this.resize()

    const loop = (now) => {
      if (!this.active || this.destroyed) return
      this._animId = requestAnimationFrame(loop)

      if (document.visibilityState === "hidden") {
        this.lastTime = now
        return
      }

      const elapsed = Math.min(now - this.lastTime, 100)
      this.lastTime = now
      const dt = Math.min(elapsed / 16.67, 3.0)

      this.update(dt)
      this.draw()
    }

    this._animId = requestAnimationFrame(loop)
  }

  stop() {
    if (!this.active) return
    this.active = false
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.canvas) {
      this.canvas.style.display = "none"
    }
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  update(dt) {
    // Slow, calm 8-bit retro scan sweep
    const diag = Math.sqrt(this.width * this.width + this.height * this.height) + 400
    const sweepSpeed = (16 + this.scanFrequency * 65) * dt
    this.beamPos = (this.beamPos + sweepSpeed) % diag
  }

  draw() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height
    const rgb = this._rgb
    const bgRgb = this._bgRgb
    const gamma = this.gamma

    ctx.clearRect(0, 0, W, H)

    // 1. CRT Cathode Emission (8-bit Dark Matrix Background)
    ctx.save()
    if (bgRgb.r > 0 || bgRgb.g > 0 || bgRgb.b > 0) {
      ctx.fillStyle = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${(gamma * 0.12).toFixed(3)})`
      ctx.fillRect(0, 0, W, H)
    }

    // Steady 8-bit phosphor background glow
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(gamma * 0.025).toFixed(3)})`
    ctx.fillRect(0, 0, W, H)
    ctx.restore()

    // 2. 8-Bit Pixel Scanlines & Shadow Mask Grid
    ctx.save()
    const radAngle = (this.scanAngle * Math.PI) / 180
    const centerX = W / 2
    const centerY = H / 2

    ctx.translate(centerX, centerY)
    ctx.rotate(radAngle)

    const diag = Math.sqrt(W * W + H * H)
    const halfDiag = diag / 2
    const pixelSize = Math.max(3, Math.round(this.scanDensity))

    // Crisp 8-bit horizontal raster scanlines
    const grooveAlpha = Math.min(0.32, 0.12 + (1 - gamma * 0.5) * 0.18)
    ctx.fillStyle = `rgba(0, 0, 0, ${grooveAlpha.toFixed(3)})`

    for (let y = -halfDiag; y < halfDiag; y += pixelSize) {
      ctx.fillRect(-halfDiag, y, diag, Math.max(1, pixelSize * 0.38))
    }

    // 3. 8-Bit Stepped Pixel Phosphor Glow (Quantized Beam)
    // Quantize beam coordinate to discrete 8-bit pixel increments
    const rawBeamCoord = this.beamPos - halfDiag - 180
    const quantizedBeam = Math.floor(rawBeamCoord / pixelSize) * pixelSize

    // 8-bit stepped brightness levels (chunky retro phosphor illumination)
    const steps = [
      { offset: -pixelSize * 6, height: pixelSize * 2, alpha: gamma * 0.02 },
      { offset: -pixelSize * 4, height: pixelSize * 2, alpha: gamma * 0.04 },
      { offset: -pixelSize * 2, height: pixelSize * 2, alpha: gamma * 0.07 },
      { offset: 0,             height: pixelSize * 3, alpha: gamma * 0.11 }, // Core line
      { offset: pixelSize * 3,  height: pixelSize * 2, alpha: gamma * 0.06 },
      { offset: pixelSize * 5,  height: pixelSize * 2, alpha: gamma * 0.03 },
    ]

    for (const step of steps) {
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${step.alpha.toFixed(3)})`
      ctx.fillRect(-halfDiag, quantizedBeam + step.offset, diag, step.height)
    }

    // Micro 8-bit Pixel Dither across the beam for authentic arcade texture
    ctx.fillStyle = `rgba(${Math.min(255, rgb.r + 50)}, ${Math.min(255, rgb.g + 50)}, ${Math.min(255, rgb.b + 50)}, ${(gamma * 0.06).toFixed(3)})`
    const ditherStart = quantizedBeam - pixelSize * 2
    const ditherSpan = pixelSize * 6
    const ditherStep = pixelSize * 2

    for (let py = ditherStart; py < ditherStart + ditherSpan; py += pixelSize) {
      for (let px = -halfDiag; px < halfDiag; px += ditherStep) {
        if ((Math.abs(Math.floor(px / pixelSize) + Math.floor(py / pixelSize)) % 2) === 0) {
          ctx.fillRect(px, py, pixelSize, pixelSize)
        }
      }
    }

    ctx.restore()

    // 4. Subtle Retro Monitor Glass Vignette (Clean border)
    ctx.save()
    const vignette = ctx.createRadialGradient(
      W / 2,
      H / 2,
      Math.min(W, H) * 0.48,
      W / 2,
      H / 2,
      Math.max(W, H) * 0.84,
    )
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)")
    vignette.addColorStop(0.75, "rgba(0, 0, 0, 0.12)")
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.48)")

    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
}



