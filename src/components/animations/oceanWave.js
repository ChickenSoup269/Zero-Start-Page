export class OceanWaveEffect {
  constructor(canvasId, color = "#0077b6", position = "bottom") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.position = position // "bottom" | "top"
    this.time = 0

    // Wave layers — each stacked slightly higher with less opacity
    this.layerCount = 5

    // FPS throttling
    this.fps = 40
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  /** Parse hex color to { r, g, b } */
  _hexToRgb(color) {
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

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.time = 0
    this.rgb = this._hexToRgb(this.color)
    this.canvas.style.display = "block"
    this.animate(0)
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this._animId = requestAnimationFrame((t) => this.animate(t))
    if (document.visibilityState === 'hidden') return

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const W = this.canvas.width
    const H = this.canvas.height
    const ctx = this.ctx

    ctx.clearRect(0, 0, W, H)
    this.time += 0.012

    const rgb = this.rgb || this._hexToRgb(this.color)
    const isTop = this.position === "top"

    // Draw from back layer to front layer
    for (let i = 0; i < this.layerCount; i++) {
      const t = i / (this.layerCount - 1) // 0 = back, 1 = front

      // Back layers start higher on screen, front layers sit closer to edge
      const baseY = isTop
        ? H * (0.05 + t * 0.2) // top: waves near top, filling downward
        : H * (0.45 + t * 0.35) // bottom: original behavior

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

      // Build the wave path
      for (let xi = 0; xi <= W; xi += 3) {
        const y =
          baseY +
          Math.sin(xi * freq + timeSpeedPhase) * amplitude +
          Math.sin(xi * freq * 2.3 + timeSpeedPhase2) *
            (amplitude * 0.3)

        if (xi === 0) {
          ctx.moveTo(xi, y)
        } else {
          ctx.lineTo(xi, y)
        }
      }

      // Close path to the edge (bottom or top)
      if (isTop) {
        ctx.lineTo(W, 0)
        ctx.lineTo(0, 0)
      } else {
        ctx.lineTo(W, H)
        ctx.lineTo(0, H)
      }
      ctx.closePath()

      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
      ctx.fill()

      // Draw a subtle bright crest line on top of each wave
      ctx.beginPath()
      for (let xi = 0; xi <= W; xi += 3) {
        const y =
          baseY +
          Math.sin(xi * freq + timeSpeedPhase) * amplitude +
          Math.sin(xi * freq * 2.3 + timeSpeedPhase2) *
            (amplitude * 0.3)

        if (xi === 0) {
          ctx.moveTo(xi, y)
        } else {
          ctx.lineTo(xi, y)
        }
      }
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha + 0.15})`
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }

}
