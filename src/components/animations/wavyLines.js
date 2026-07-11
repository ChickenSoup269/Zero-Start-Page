export class WavyLinesEffect {
  constructor(canvasId, color = "#00bcd4") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.time = 0

    // Wave config
    this.waveCount = 12
    this.waves = []

    // FPS throttling
    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._buildWaves()
  }

  _buildWaves() {
    const H = this.canvas.height
    this.waves = []
    for (let i = 0; i < this.waveCount; i++) {
      const t = i / (this.waveCount - 1)
      this.waves.push({
        yBase: H * 0.1 + t * H * 0.8, // spread across full height
        amplitude: 18 + Math.random() * 42, // 18–60 px
        frequency: 0.003 + Math.random() * 0.006, // spatial frequency
        speed: 0.4 + Math.random() * 0.9, // time speed multiplier
        phase: Math.random() * Math.PI * 2, // initial phase offset
        lineWidth: 1 + Math.random() * 2.5, // 1–3.5 px
        alpha: 0.25 + Math.random() * 0.55, // 0.25–0.8
      })
    }
  }

  /** Parse hex/rgb color into { r, g, b } */
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
    return { r: 0, g: 188, b: 212 }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.time = 0
    this.canvas.style.display = "block"
    this._buildWaves()
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
    if (document.visibilityState === "hidden") return

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const W = this.canvas.width
    const H = this.canvas.height

    // Clear canvas each frame so page background shows through
    this.ctx.clearRect(0, 0, W, H)

    this.time += 0.016

    if (!this.rgb) this.rgb = this._hexToRgb(this.color)
    const rgb = this.rgb

    for (const wave of this.waves) {
      this.ctx.beginPath()

      // Horizontal scan — one point per 4 px for smoothness
      const step = 4
      for (let xi = 0; xi <= W; xi += step) {
        const y =
          wave.yBase +
          Math.sin(xi * wave.frequency + this.time * wave.speed + wave.phase) *
            wave.amplitude

        if (xi === 0) {
          this.ctx.moveTo(xi, y)
        } else {
          this.ctx.lineTo(xi, y)
        }
      }

      // Glow effect: draw wide translucent first, then crisp line on top
      this.ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${wave.alpha * 0.4})`
      this.ctx.lineWidth = wave.lineWidth * 4
      this.ctx.lineCap = "round"
      this.ctx.lineJoin = "round"
      this.ctx.stroke()

      this.ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${wave.alpha})`
      this.ctx.lineWidth = wave.lineWidth
      this.ctx.stroke()
    }
  }
}
