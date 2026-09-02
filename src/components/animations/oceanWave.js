/**
 * OceanWaveEffect — Pure Original Ocean Wave (HD Edition)
 *
 * Preserves the exact original clean, minimalist wave design:
 *  - Native High-DPI Retina subpixel scaling (ultra-sharp anti-aliased curves).
 *  - Smooth display-rate Delta-Time animation (no 40 FPS lock/stutter).
 *  - No extra particles or unnecessary effects, purely original aesthetic in HD.
 */

export class OceanWaveEffect {
  constructor(canvasId, color = "#0077b6", position = "bottom") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.destroyed = false
    this._animId = null

    this.color = color || "#0077b6"
    this.position = ["top", "bottom", "left", "right"].includes(position)
      ? position
      : "bottom"
    this.rgb = this._hexToRgb(this.color)

    // Original wave layers
    this.layerCount = 5
    this.time = 0
    this.lastTime = performance.now()

    // High-DPI Retina
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

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

  _hexToRgb(color) {
    if (!color) return { r: 0, g: 119, b: 182 }
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
    return { r: 0, g: 119, b: 182 }
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
      const dt = Math.min(elapsed / 16.67, 3.0)
      this.time += 0.012 * dt

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

    const rgb = this.rgb || this._hexToRgb(this.color)
    const isTop = this.position === "top"
    const isLeft = this.position === "left"
    const isRight = this.position === "right"
    const isVertical = isLeft || isRight
    const maxLen = isVertical ? H : W

    // Draw from back layer to front layer (original design)
    for (let i = 0; i < this.layerCount; i++) {
      const t = i / (this.layerCount - 1) // 0 = back, 1 = front

      let basePos = 0
      if (isTop) basePos = H * (0.05 + t * 0.2)
      else if (isLeft) basePos = W * (0.05 + t * 0.2)
      else if (isRight) basePos = W * (0.45 + t * 0.35)
      else basePos = H * (0.45 + t * 0.35) // bottom

      // Amplitude decreases for back layers (perspective)
      const amplitude = 30 + t * 45

      // Frequency slightly varies per layer
      const freq = 0.006 + i * 0.0008

      // Speed — front waves move faster
      const speed = 0.4 + t * 0.7

      // Phase offset so layers don't perfectly overlap
      const phaseOffset = (i / this.layerCount) * Math.PI * 2

      // Opacity: back layers transparent, front more opaque
      const alpha = 0.08 + t * 0.25

      // Slight color shift: back layers a bit darker
      const lumFactor = 0.5 + t * 0.5
      const r = Math.round(rgb.r * lumFactor)
      const g = Math.round(rgb.g * lumFactor)
      const b = Math.round(rgb.b * lumFactor)

      const timeSpeedPhase = this.time * speed + phaseOffset
      const timeSpeedPhase2 = this.time * speed * 0.7 + phaseOffset

      ctx.beginPath()

      // Build the wave path with smooth step
      const step = 3
      for (let p = 0; p <= maxLen; p += step) {
        const offset =
          basePos +
          Math.sin(p * freq + timeSpeedPhase) * amplitude +
          Math.sin(p * freq * 2.3 + timeSpeedPhase2) * (amplitude * 0.3)

        const px = isVertical ? offset : p
        const py = isVertical ? p : offset

        if (p === 0) {
          ctx.moveTo(px, py)
        } else {
          ctx.lineTo(px, py)
        }
      }

      // Close path to the edge
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

      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
      ctx.fill()

      // Draw original crisp crest line on top of each wave (HD anti-aliased)
      ctx.beginPath()
      for (let p = 0; p <= maxLen; p += step) {
        const offset =
          basePos +
          Math.sin(p * freq + timeSpeedPhase) * amplitude +
          Math.sin(p * freq * 2.3 + timeSpeedPhase2) * (amplitude * 0.3)

        const px = isVertical ? offset : p
        const py = isVertical ? p : offset

        if (p === 0) {
          ctx.moveTo(px, py)
        } else {
          ctx.lineTo(px, py)
        }
      }
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha + 0.15})`
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }
}


