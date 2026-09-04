/**
 * OceanWaveEffect — Ultra HD Minimalist Ocean Waves
 *
 * Optimized for buttery smooth 60-144 FPS with full customization:
 *  - Atmospheric Ocean Moods: "natural" (Natural Sea), "sunset" (Sunset Glow), "sunrise" (Sunrise Dawn), "white" (Minimalist White - default), "custom" (Custom Color)
 *  - Configurable Wave Layers (1-6 layers, default 3)
 *  - Wave Speed (0.2x - 3.0x, default 1.0x)
 *  - Wave Height / Amplitude (10px - 100px, default 35px)
 *  - Wave Opacity (0.1 - 1.0, default 0.65)
 *  - Wave Style: "smooth" (Silky Smooth - default), "ocean" (Ocean Swell), "calm" (Calm Tide)
 *  - Single-pass wave geometry with dynamic step sampling
 *  - High-DPI Retina support with subpixel antialiasing
 */

export class OceanWaveEffect {
  constructor(canvasId, color = "#ffffff", position = "bottom", options = {}) {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.destroyed = false
    this._animId = null

    this.color = color || "#ffffff"
    this.position = ["top", "bottom", "left", "right"].includes(position)
      ? position
      : "bottom"
    this.rgb = this._hexToRgb(this.color)

    // Customizable Options with Silky Smooth Defaults
    this.mood = options.mood || "white" // "white" | "natural" | "sunset" | "sunrise" | "custom"
    this.layerCount = options.layerCount !== undefined ? Math.max(1, Math.min(6, parseInt(options.layerCount))) : 3
    this.speed = options.speed !== undefined ? parseFloat(options.speed) : 1.0
    this.amplitude = options.amplitude !== undefined ? parseFloat(options.amplitude) : 35
    this.opacity = options.opacity !== undefined ? parseFloat(options.opacity) : 0.65
    this.style = options.style || "smooth" // "smooth" | "ocean" | "calm"

    this.time = 0
    this.lastTime = performance.now()

    // High-DPI Retina
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

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
  }

  _hexToRgb(color) {
    if (!color) return { r: 255, g: 255, b: 255 }
    const hex = color.replace("#", "")
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      }
    }
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      }
    }
    return { r: 255, g: 255, b: 255 }
  }

  updateColor(color) {
    if (!color) return
    this.color = color
    this.rgb = this._hexToRgb(color)
  }

  setPosition(position) {
    this.position = ["top", "bottom", "left", "right"].includes(position)
      ? position
      : "bottom"
  }

  updateMood(mood) {
    if (["white", "natural", "sunset", "sunrise", "custom"].includes(mood)) {
      this.mood = mood
    }
  }

  updateLayerCount(count) {
    if (count !== undefined && !isNaN(count)) {
      this.layerCount = Math.max(1, Math.min(6, parseInt(count)))
    }
  }

  updateSpeed(speed) {
    if (speed !== undefined && !isNaN(speed)) {
      this.speed = Math.max(0.1, Math.min(4.0, parseFloat(speed)))
    }
  }

  updateAmplitude(amplitude) {
    if (amplitude !== undefined && !isNaN(amplitude)) {
      this.amplitude = Math.max(5, Math.min(120, parseFloat(amplitude)))
    }
  }

  updateOpacity(opacity) {
    if (opacity !== undefined && !isNaN(opacity)) {
      this.opacity = Math.max(0.05, Math.min(1.0, parseFloat(opacity)))
    }
  }

  updateStyle(style) {
    if (["smooth", "ocean", "calm"].includes(style)) {
      this.style = style
    }
  }

  setOptions(opts = {}) {
    if (opts.color !== undefined) this.updateColor(opts.color)
    if (opts.position !== undefined) this.setPosition(opts.position)
    if (opts.mood !== undefined) this.updateMood(opts.mood)
    if (opts.layerCount !== undefined) this.updateLayerCount(opts.layerCount)
    if (opts.speed !== undefined) this.updateSpeed(opts.speed)
    if (opts.amplitude !== undefined) this.updateAmplitude(opts.amplitude)
    if (opts.opacity !== undefined) this.updateOpacity(opts.opacity)
    if (opts.style !== undefined) this.updateStyle(opts.style)
  }

  _getLayerColor(layerIdx, totalLayers) {
    const t = totalLayers > 1 ? layerIdx / (totalLayers - 1) : 0.5
    const mood = this.mood || "white"

    if (mood === "custom") {
      const rgb = this.rgb || this._hexToRgb(this.color)
      const lum = 0.65 + t * 0.35
      return {
        r: Math.round(rgb.r * lum),
        g: Math.round(rgb.g * lum),
        b: Math.round(rgb.b * lum),
        crestR: rgb.r,
        crestG: rgb.g,
        crestB: rgb.b,
      }
    }

    if (mood === "natural") {
      const palette = [
        { r: 2, g: 62, b: 138 },    // Deep ocean blue
        { r: 0, g: 119, b: 182 },   // Cerulean
        { r: 0, g: 150, b: 199 },   // Ocean aqua
        { r: 0, g: 180, b: 216 },   // Cyan
        { r: 72, g: 202, b: 228 },  // Light turquoise
      ]
      return this._interpolatePalette(palette, t, { r: 224, g: 247, b: 250 })
    }

    if (mood === "sunset") {
      const palette = [
        { r: 58, g: 12, b: 163 },   // Twilight purple
        { r: 114, g: 9, b: 183 },   // Dusk violet
        { r: 247, g: 37, b: 133 },  // Coral rose
        { r: 247, g: 127, b: 0 },   // Sunset amber
        { r: 252, g: 191, b: 73 },  // Golden apricot
      ]
      return this._interpolatePalette(palette, t, { r: 255, g: 234, b: 167 })
    }

    if (mood === "sunrise") {
      const palette = [
        { r: 44, g: 62, b: 80 },    // Dawn indigo
        { r: 52, g: 152, b: 219 },  // Morning azure
        { r: 231, g: 111, b: 81 },  // Apricot dawn
        { r: 244, g: 162, b: 97 },  // Peach blossom
        { r: 233, g: 196, b: 106 }, // Morning sunshine
      ]
      return this._interpolatePalette(palette, t, { r: 255, g: 249, b: 219 })
    }

    // Default: white
    const lum = Math.round(200 + t * 55)
    return {
      r: lum,
      g: lum,
      b: lum,
      crestR: 255,
      crestG: 255,
      crestB: 255,
    }
  }

  _interpolatePalette(palette, t, crestRgb) {
    const pLen = palette.length - 1
    const idx = t * pLen
    const i0 = Math.floor(idx)
    const i1 = Math.min(palette.length - 1, i0 + 1)
    const f = idx - i0
    const c0 = palette[i0]
    const c1 = palette[i1]
    return {
      r: Math.round(c0.r + (c1.r - c0.r) * f),
      g: Math.round(c0.g + (c1.g - c0.g) * f),
      b: Math.round(c0.b + (c1.b - c0.b) * f),
      crestR: crestRgb.r,
      crestG: crestRgb.g,
      crestB: crestRgb.b,
    }
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
    this.time = 0
    this.rgb = this._hexToRgb(this.color)

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
      this.time += 0.012 * this.speed * dt

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
    this.rgb = null
  }

  draw() {
    const W = this.width
    const H = this.height
    const ctx = this.ctx

    ctx.clearRect(0, 0, W, H)

    const isTop = this.position === "top"
    const isLeft = this.position === "left"
    const isRight = this.position === "right"
    const isVertical = isLeft || isRight
    const maxLen = isVertical ? H : W

    // Dynamic step: 50-60 sampling points is mathematically optimal & buttery smooth
    const step = Math.max(16, Math.floor(maxLen / 60))

    const count = this.layerCount
    const style = this.style

    // Draw from back layer to front layer
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0.5

      let basePos = 0
      const span = 0.22
      if (isTop) basePos = H * (0.05 + t * span)
      else if (isLeft) basePos = W * (0.05 + t * span)
      else if (isRight) basePos = W * (0.58 + t * span)
      else basePos = H * (0.58 + t * span) // bottom

      // Amplitude & Harmonic calculations based on selected style
      const baseAmp = this.amplitude * (0.75 + t * 0.45)
      let freq1 = 0.0045 + i * 0.001
      let freq2 = freq1 * 2.2
      let harmFactor = 0.25
      let layerSpeed = 0.55 + t * 0.55

      if (style === "calm") {
        harmFactor = 0.12
        freq1 *= 0.8
        freq2 = freq1 * 1.8
      } else if (style === "ocean") {
        harmFactor = 0.35
        freq1 *= 1.2
        freq2 = freq1 * 2.4
      }

      const phaseOffset = i * (6.28 / count)
      const alpha = (0.08 + t * 0.22) * this.opacity

      const col = this._getLayerColor(i, count)
      const { r, g, b, crestR, crestG, crestB } = col

      const phase1 = this.time * layerSpeed + phaseOffset
      const phase2 = this.time * layerSpeed * 0.7 + phaseOffset

      // 1. Build smooth wave path
      ctx.beginPath()
      for (let p = 0; p <= maxLen; p += step) {
        const offset =
          basePos +
          Math.sin(p * freq1 + phase1) * baseAmp +
          Math.sin(p * freq2 + phase2) * (baseAmp * harmFactor)

        const px = isVertical ? offset : p
        const py = isVertical ? p : offset

        if (p === 0) {
          ctx.moveTo(px, py)
        } else {
          ctx.lineTo(px, py)
        }
      }

      // Edge close
      if (maxLen % step !== 0) {
        const offset =
          basePos +
          Math.sin(maxLen * freq1 + phase1) * baseAmp +
          Math.sin(maxLen * freq2 + phase2) * (baseAmp * harmFactor)
        const px = isVertical ? offset : maxLen
        const py = isVertical ? maxLen : offset
        ctx.lineTo(px, py)
      }

      // 2. Stroke Crest Line
      ctx.strokeStyle = `rgba(${crestR},${crestG},${crestB},${Math.min(1.0, alpha + 0.22 * this.opacity).toFixed(2)})`
      ctx.lineWidth = 1.5
      ctx.stroke()

      // 3. Close polygon for boundary fill
      if (isTop) {
        ctx.lineTo(W, 0)
        ctx.lineTo(0, 0)
      } else if (isLeft) {
        ctx.lineTo(0, H)
        ctx.lineTo(0, 0)
      } else if (isRight) {
        ctx.lineTo(W, H)
        ctx.lineTo(W, 0)
      } else {
        // bottom
        ctx.lineTo(W, H)
        ctx.lineTo(0, H)
      }
      ctx.closePath()

      ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`
      ctx.fill()
    }
  }
}
