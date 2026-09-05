/**
 * CrtScanlinesEffect — High-Definition Authentic 80s/90s Terminal CRT Monitor Engine
 *
 * Simulates genuine 1990s cathode ray tube (CRT) terminal display physics:
 *  - High-Definition (HD) raster scanlines with Trinitron aperture grille / triad sub-pixel mask.
 *  - Ultra-smooth, slow-sweeping electron beam (phosphor refresh wave) with sub-pixel interpolation.
 *  - Long exponential phosphor decay afterglow (persistent green/amber/cyan phosphor memory).
 *  - Razor-sharp white-hot electron focus crest line with forward halation glow.
 *  - Thick curved glass barrel vignette and ambient specular glass glare.
 *  - Butter-smooth 60-144 FPS with cached offscreen pattern rendering (zero frame drops).
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
    this.gamma = options.gamma !== undefined ? options.gamma : 0.35
    this.backgroundColor = options.backgroundColor || "#0a140f"

    this._rgb = hexToRgb(this.color) || { r: 124, g: 255, b: 173 }
    this._bgRgb = hexToRgb(this.backgroundColor) || { r: 10, g: 20, b: 15 }

    // Simulation Timing & Geometry
    this.beamPos = 0
    this.lastTime = performance.now()
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)

    // Cached HD scanline & aperture grille pattern
    this._scanlinePattern = null
    this._patternDirty = true

    this._resizeHandler = () => this.resize()
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler, { passive: true })
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

    this._patternDirty = true
  }

  updateScanColor(hex) {
    if (!hex) return
    this.color = hex
    this._rgb = hexToRgb(this.color) || { r: 124, g: 255, b: 173 }
    this._patternDirty = true
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
      this._patternDirty = true
    }
  }

  updateGamma(gamma) {
    if (gamma !== undefined && !isNaN(gamma)) {
      this.gamma = Number(gamma)
      this._patternDirty = true
    }
  }

  updateBackgroundColor(color) {
    if (!color) return
    this.backgroundColor = color
    this._bgRgb = hexToRgb(this.backgroundColor) || { r: 10, g: 20, b: 15 }
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
      const dt = Math.min(elapsed / 16.67, 2.5)

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
    this._scanlinePattern = null
  }

  /**
   * Generates a cached repeating high-definition CRT shadow mask pattern.
   * Simulates horizontal raster grooves + vertical Trinitron aperture grille wires.
   */
  _buildScanlinePattern() {
    if (!this.ctx || typeof document === "undefined") return null

    const pitch = Math.max(2, Math.round(this.scanDensity))
    const patternWidth = 4 // Vertical aperture triad pitch
    const patternHeight = pitch

    const patternCanvas = document.createElement("canvas")
    patternCanvas.width = patternWidth
    patternCanvas.height = patternHeight
    const pCtx = patternCanvas.getContext("2d")
    if (!pCtx) return null

    const gamma = Math.max(0.05, Math.min(1.0, this.gamma))
    const rgb = this._rgb

    pCtx.clearRect(0, 0, patternWidth, patternHeight)

    // 1. Horizontal raster line division
    const grooveHeight = Math.max(1, Math.round(pitch * 0.38))
    const phosphorHeight = pitch - grooveHeight

    // Active phosphor strip
    const phosphorAlpha = Math.min(0.22, 0.03 + gamma * 0.10)
    pCtx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${phosphorAlpha.toFixed(3)})`
    pCtx.fillRect(0, 0, patternWidth, phosphorHeight)

    // Inter-scanline shadow groove
    const grooveAlpha = Math.min(0.50, 0.16 + (1 - gamma * 0.4) * 0.22)
    pCtx.fillStyle = `rgba(0, 0, 0, ${grooveAlpha.toFixed(3)})`
    pCtx.fillRect(0, phosphorHeight, patternWidth, grooveHeight)

    // 2. Vertical Aperture Grille / Shadow Mask wire
    const wireAlpha = Math.min(0.18, 0.04 + (1 - gamma * 0.3) * 0.08)
    pCtx.fillStyle = `rgba(0, 0, 0, ${wireAlpha.toFixed(3)})`
    pCtx.fillRect(patternWidth - 1, 0, 1, patternHeight)

    try {
      return this.ctx.createPattern(patternCanvas, "repeat")
    } catch {
      return null
    }
  }

  update(dt) {
    const radAngle = (this.scanAngle * Math.PI) / 180
    const extent =
      Math.abs(this.width * Math.sin(radAngle)) +
      Math.abs(this.height * Math.cos(radAngle))
    const trailLength = Math.max(220, Math.min(520, extent * 0.45))
    const totalTravel = extent + trailLength + 100

    // Authentic, slow, smooth 90s terminal electron beam sweep
    // Calibrated for slow hypnotic 8-12s cycles at default frequency
    const sweepSpeed = (0.9 + this.scanFrequency * 14.0) * dt
    this.beamPos = (this.beamPos + sweepSpeed) % totalTravel
  }

  draw() {
    const ctx = this.ctx
    if (!ctx) return

    const W = this.width
    const H = this.height
    const rgb = this._rgb
    const bgRgb = this._bgRgb
    const gamma = Math.max(0.05, Math.min(1.0, this.gamma))

    // Rebuild HD pattern if invalidated
    if (!this._scanlinePattern || this._patternDirty) {
      this._scanlinePattern = this._buildScanlinePattern()
      this._patternDirty = false
    }

    ctx.clearRect(0, 0, W, H)

    // Subtle living analog cathode phosphor breathing (no jarring flicker)
    const now = performance.now()
    const breath = 1.0 + Math.sin(now * 0.0018) * 0.035

    // 1. Dark CRT Cathode Matrix Tint
    if (bgRgb.r > 0 || bgRgb.g > 0 || bgRgb.b > 0) {
      ctx.fillStyle = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${(gamma * 0.18).toFixed(3)})`
      ctx.fillRect(0, 0, W, H)
    }

    // Ambient Phosphor Baseline Glow
    const baselineAlpha = (gamma * 0.038 * breath).toFixed(3)
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baselineAlpha})`
    ctx.fillRect(0, 0, W, H)

    // 2. Geometry calculations for rotated sweep
    ctx.save()
    const radAngle = (this.scanAngle * Math.PI) / 180
    const centerX = W / 2
    const centerY = H / 2

    ctx.translate(centerX, centerY)
    if (this.scanAngle !== 0) {
      ctx.rotate(radAngle)
    }

    // Exact bounding projection to eliminate off-screen dead time
    const extent =
      Math.abs(W * Math.sin(radAngle)) + Math.abs(H * Math.cos(radAngle))
    const diag = Math.sqrt(W * W + H * H) + 120
    const halfDiag = diag / 2

    // Wide, gentle 90s terminal phosphor decay afterglow
    const trailLength = Math.max(220, Math.min(520, extent * 0.45))
    const totalTravel = extent + trailLength + 100

    // Pure continuous floating-point coordinate for butter-smooth 60-144Hz movement
    const beamY = (this.beamPos % totalTravel) - extent / 2 - 50

    // 2A. Rolling Electron Sweep Beam with Exponential Phosphor Decay Trail
    const beamGrad = ctx.createLinearGradient(0, beamY - trailLength, 0, beamY + 18)
    beamGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
    beamGrad.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(gamma * 0.035 * breath).toFixed(3)})`)
    beamGrad.addColorStop(0.65, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(gamma * 0.12 * breath).toFixed(3)})`)
    beamGrad.addColorStop(0.88, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(gamma * 0.26 * breath).toFixed(3)})`)
    beamGrad.addColorStop(0.96, `rgba(${Math.min(255, rgb.r + 70)}, ${Math.min(255, rgb.g + 70)}, ${Math.min(255, rgb.b + 70)}, ${(gamma * 0.48 * breath).toFixed(3)})`)
    beamGrad.addColorStop(0.985, `rgba(255, 255, 255, ${(gamma * 0.75 * breath).toFixed(3)})`)
    beamGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

    ctx.fillStyle = beamGrad
    ctx.fillRect(-halfDiag, beamY - trailLength, diag, trailLength + 18)

    // 2B. Intense Leading Electron Focus Crest Line (Razor-sharp 90s CRT electron beam)
    const crestGrad = ctx.createLinearGradient(0, beamY - 1, 0, beamY + 3)
    crestGrad.addColorStop(0, `rgba(255, 255, 255, ${(gamma * 0.70).toFixed(3)})`)
    crestGrad.addColorStop(0.4, `rgba(${Math.min(255, rgb.r + 100)}, ${Math.min(255, rgb.g + 100)}, ${Math.min(255, rgb.b + 100)}, ${(gamma * 0.85).toFixed(3)})`)
    crestGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

    ctx.fillStyle = crestGrad
    ctx.fillRect(-halfDiag, beamY - 1, diag, 4)

    // 2C. High-Definition Scanlines & Aperture Grille Overlay
    if (this._scanlinePattern) {
      ctx.fillStyle = this._scanlinePattern
      ctx.fillRect(-halfDiag, -halfDiag, diag, diag)
    } else {
      // Fallback if pattern fails
      const pixelSize = Math.max(2, Math.round(this.scanDensity))
      const gapHeight = Math.max(1, Math.floor(pixelSize * 0.4))
      ctx.fillStyle = `rgba(0, 0, 0, ${(gamma * 0.25).toFixed(3)})`
      for (let y = -halfDiag; y < halfDiag; y += pixelSize) {
        ctx.fillRect(-halfDiag, y, diag, gapHeight)
      }
    }

    ctx.restore()

    // 3. Authentic Curved 90s CRT Monitor Barrel Glass Vignette
    ctx.save()
    const minDim = Math.min(W, H)
    const maxDim = Math.max(W, H)
    const vignette = ctx.createRadialGradient(
      W / 2,
      H / 2,
      minDim * 0.36,
      W / 2,
      H / 2,
      maxDim * 0.76
    )
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)")
    vignette.addColorStop(0.65, "rgba(0, 0, 0, 0.08)")
    vignette.addColorStop(0.86, "rgba(0, 0, 0, 0.26)")
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.62)")

    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, W, H)

    // 4. Subtle Optical CRT Glass Sheen / Ambient Glare
    const glareGrad = ctx.createLinearGradient(0, 0, W * 0.75, H * 0.75)
    glareGrad.addColorStop(0, `rgba(255, 255, 255, ${(gamma * 0.035).toFixed(3)})`)
    glareGrad.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(gamma * 0.012).toFixed(3)})`)
    glareGrad.addColorStop(0.65, "rgba(0, 0, 0, 0)")

    ctx.fillStyle = glareGrad
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
}



