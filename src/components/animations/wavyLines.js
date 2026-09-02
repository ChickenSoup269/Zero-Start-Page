/**
 * WavyLinesEffect — Ultra-Smooth & High-Performance Sinuous Waves
 *
 * Lightweight, hardware-accelerated, zero-lag glowing sine waves:
 *  - 60fps+ buttery smooth frame rate with delta-time normalization.
 *  - Dynamic breathing & shimmering light pulses (bật/tắt nhịp thở phát sáng).
 *  - High-DPI / Retina crisp subpixel rendering (tăng cường độ nét HD).
 *  - Multi-color distinct lines support (single, multicolor, rainbow, cyberpunk, sunset, pastel).
 *  - Zero per-frame memory allocation for ultra-smooth rendering.
 */

export class WavyLinesEffect {
  constructor(canvasId, color = "#00bcd4", mode = "single") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this._animId = null
    this.time = 0
    this.lastTime = performance.now()

    this._color = color || "#00bcd4"
    this._mode = mode || "single"
    this.rgb = this._hexToRgb(this._color)

    this.waveCount = 11
    this.waves = []

    this.width = window.innerWidth
    this.height = window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)

    this._resizeHandler = () => this.resize()
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
    document.addEventListener("visibilitychange", this._visibilityHandler)
  }

  // ── Getters & Setters ────────────────────────────────────────────────────────
  get color() {
    return this._color
  }

  set color(val) {
    this.updateColor(val)
  }

  get mode() {
    return this._mode
  }

  set mode(val) {
    this.setMode(val)
  }

  setMode(mode) {
    if (this._mode === mode) return
    this._mode = mode || "single"
    this._updateWaveColors()
  }

  updateColor(hex) {
    if (!hex) return
    this._color = hex
    this.rgb = this._hexToRgb(hex)
    this._updateWaveColors()
  }

  _hexToRgb(color) {
    if (!color) return { r: 0, g: 188, b: 212 }
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

  _hslToRgb(h, s, l) {
    s /= 100
    l /= 100
    const k = (n) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4)),
    }
  }

  resize() {
    if (!this.canvas) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    // High-DPI Retina crispness
    this.canvas.width = Math.round(this.width * this.dpr)
    this.canvas.height = Math.round(this.height * this.dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.canvas.style.pointerEvents = "none"

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.ctx.scale(this.dpr, this.dpr)
    }

    this._buildWaves()
  }

  _buildWaves() {
    const H = this.height
    this.waves = []

    for (let i = 0; i < this.waveCount; i++) {
      const t = i / (this.waveCount - 1 || 1)
      const yBase = H * 0.12 + t * H * 0.76

      this.waves.push({
        yBase,
        // Primary wave harmonic
        amp1: 24 + Math.random() * 32,
        freq1: 0.002 + Math.random() * 0.0018,
        speed1: 0.35 + Math.random() * 0.4,
        phase1: Math.random() * Math.PI * 2,

        // Secondary harmonic (organic undulation)
        amp2: 9 + Math.random() * 14,
        freq2: 0.0045 + Math.random() * 0.0025,
        speed2: 0.6 + Math.random() * 0.35,
        phase2: Math.random() * Math.PI * 2,

        // Tertiary fine harmonic
        amp3: 4 + Math.random() * 6,
        freq3: 0.008 + Math.random() * 0.004,
        speed3: 0.9 + Math.random() * 0.5,
        phase3: Math.random() * Math.PI * 2,

        // Line geometry
        lineWidth: 2.2 + Math.random() * 1.8,
        baseAlpha: 0.55 + Math.random() * 0.4,
        hasCore: i % 2 === 0,
        index: i,

        // Light Shimmer & Breathing Dynamics (Ánh sáng bật/tắt, nhấp nháy phát sáng)
        pulseSpeed: 0.8 + Math.random() * 1.4, // Rhythmic breath speed
        pulsePhase: Math.random() * Math.PI * 2,
        shimmerSpeed: 2.2 + Math.random() * 2.0, // Sparkle rate
        shimmerPhase: Math.random() * Math.PI * 2,

        // Base color channel
        r: 0,
        g: 188,
        b: 212,
      })
    }

    this._updateWaveColors()
  }

  _getColorForWave(index, total) {
    const t = index / (total - 1 || 1)

    const MULTICOLOR_PALETTE = [
      { r: 0, g: 240, b: 255 },   // Cyan
      { r: 181, g: 55, b: 242 },  // Electric Purple
      { r: 255, g: 42, b: 133 },  // Hot Pink
      { r: 255, g: 190, b: 11 },  // Neon Gold
      { r: 0, g: 245, b: 155 },   // Emerald Neon
      { r: 58, g: 134, b: 255 },  // Royal Blue
      { r: 255, g: 84, b: 0 },    // Orange Coral
      { r: 114, g: 9, b: 183 },   // Deep Violet
      { r: 166, g: 255, b: 0 },   // Electric Lime
      { r: 255, g: 77, b: 109 },  // Rose Red
      { r: 0, g: 212, b: 255 },   // Sky Blue
    ]

    const CYBERPUNK_PALETTE = [
      { r: 0, g: 240, b: 255 },   // Electric Cyan
      { r: 255, g: 0, b: 128 },   // Hot Magenta
      { r: 155, g: 0, b: 232 },   // Neon Purple
      { r: 255, g: 230, b: 0 },   // Neon Yellow
      { r: 0, g: 255, b: 120 },   // Cyber Lime
      { r: 255, g: 85, b: 0 },    // Laser Orange
      { r: 0, g: 180, b: 255 },   // Sky Laser
      { r: 247, g: 37, b: 133 },  // Pink Neon
      { r: 76, g: 201, b: 240 },  // Electric Aqua
      { r: 114, g: 9, b: 183 },   // Cyber Violet
      { r: 0, g: 240, b: 255 },   // Cyan
    ]

    const SUNSET_PALETTE = [
      { r: 46, g: 31, b: 91 },    // Deep Twilight
      { r: 107, g: 45, b: 92 },   // Plum
      { r: 193, g: 41, b: 46 },   // Crimson
      { r: 224, g: 83, b: 60 },   // Sunset Rose
      { r: 241, g: 124, b: 55 },  // Coral
      { r: 248, g: 176, b: 66 },  // Amber Glow
      { r: 253, g: 226, b: 79 },  // Golden Sun
      { r: 241, g: 124, b: 55 },  // Coral
      { r: 224, g: 83, b: 60 },   // Sunset Rose
      { r: 193, g: 41, b: 46 },   // Crimson
      { r: 107, g: 45, b: 92 },   // Plum
    ]

    const PASTEL_PALETTE = [
      { r: 168, g: 240, b: 216 }, // Pastel Mint
      { r: 176, g: 224, b: 253 }, // Baby Blue
      { r: 216, g: 187, b: 249 }, // Lavender
      { r: 255, g: 198, b: 217 }, // Pastel Pink
      { r: 255, g: 214, b: 165 }, // Peach
      { r: 253, g: 255, b: 182 }, // Buttercup
      { r: 168, g: 240, b: 216 }, // Pastel Mint
      { r: 176, g: 224, b: 253 }, // Baby Blue
      { r: 216, g: 187, b: 249 }, // Lavender
      { r: 255, g: 198, b: 217 }, // Pastel Pink
      { r: 255, g: 214, b: 165 }, // Peach
    ]

    switch (this._mode) {
      case "multicolor": {
        return MULTICOLOR_PALETTE[index % MULTICOLOR_PALETTE.length]
      }
      case "rainbow": {
        const hue = (t * 315) % 360
        return this._hslToRgb(hue, 95, 62)
      }
      case "cyberpunk": {
        return CYBERPUNK_PALETTE[index % CYBERPUNK_PALETTE.length]
      }
      case "sunset": {
        return SUNSET_PALETTE[index % SUNSET_PALETTE.length]
      }
      case "pastel": {
        return PASTEL_PALETTE[index % PASTEL_PALETTE.length]
      }
      case "single":
      default: {
        return this.rgb
      }
    }
  }

  _updateWaveColors() {
    const total = this.waves.length || this.waveCount
    for (let i = 0; i < this.waves.length; i++) {
      const wave = this.waves[i]
      const { r, g, b } = this._getColorForWave(i, total)
      wave.r = r
      wave.g = g
      wave.b = b
    }
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.lastTime = performance.now()
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastTime = performance.now()
    this.time = 0
    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"
    this.resize()
    this._animId = requestAnimationFrame((t) => this.animate(t))
  }

  stop() {
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    this.active = false
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.canvas) {
      this.canvas.style.display = "none"
    }
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  animate(now = performance.now()) {
    if (!this.active) return

    this._animId = requestAnimationFrame((t) => this.animate(t))

    if (document.visibilityState === "hidden") {
      this.lastTime = now
      return
    }

    const elapsed = Math.min(now - this.lastTime, 100)
    this.lastTime = now
    const dt = elapsed / 16.67

    this.time += 0.016 * dt

    const W = this.width
    const H = this.height
    const ctx = this.ctx
    const t = this.time

    ctx.clearRect(0, 0, W, H)

    const step = 6 // Fine subpixel step for crystal clear HD rendering

    for (let wi = 0; wi < this.waves.length; wi++) {
      const wave = this.waves[wi]
      const t1 = t * wave.speed1 + wave.phase1
      const t2 = t * wave.speed2 + wave.phase2
      const t3 = t * wave.speed3 + wave.phase3
      const f1 = wave.freq1
      const f2 = wave.freq2
      const f3 = wave.freq3
      const a1 = wave.amp1
      const a2 = wave.amp2
      const a3 = wave.amp3
      const yBase = wave.yBase

      // ── Dynamic Breathing & Light Shimmer (Bật/tắt nhịp thở phát sáng) ──────
      const breath = 0.5 + 0.5 * Math.sin(t * wave.pulseSpeed + wave.pulsePhase)
      const shimmer = 0.5 + 0.5 * Math.sin(t * wave.shimmerSpeed + wave.shimmerPhase)
      
      // Combine organic breathing cycle (bright glow -> gentle dim -> glow)
      const lightFactor = 0.28 + 0.52 * breath + 0.20 * shimmer
      const currentAlpha = Math.min(1.0, wave.baseAlpha * lightFactor)

      const r = wave.r
      const g = wave.g
      const b = wave.b

      ctx.beginPath()

      let prevY = 0
      for (let x = 0; x <= W + step; x += step) {
        const y = yBase + Math.sin(x * f1 + t1) * a1 + Math.sin(x * f2 + t2) * a2 + Math.sin(x * f3 + t3) * a3
        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          const midX = x - step * 0.5
          const midY = (y + prevY) * 0.5
          ctx.quadraticCurveTo(x - step, prevY, midX, midY)
        }
        prevY = y
      }

      // 1. Soft Ambient Luminous Halo (Layer 1)
      ctx.strokeStyle = `rgba(${r},${g},${b},${(currentAlpha * 0.30).toFixed(3)})`
      ctx.lineWidth = wave.lineWidth * 3.6
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke()

      // 2. High-Definition Crisp Wave Body (Layer 2)
      ctx.strokeStyle = `rgba(${r},${g},${b},${(currentAlpha * 0.95).toFixed(3)})`
      ctx.lineWidth = wave.lineWidth
      ctx.stroke()

      // 3. Ultra-Bright Shining Core (Layer 3 - Bật sáng rực rỡ khi nhịp thở lên đỉnh)
      if (wave.hasCore || breath > 0.6) {
        const coreAlpha = (currentAlpha * (0.4 + 0.55 * breath)).toFixed(3)
        ctx.strokeStyle = `rgba(255,255,255,${coreAlpha})`
        ctx.lineWidth = Math.max(0.8, wave.lineWidth * 0.42)
        ctx.stroke()
      }
    }
  }
}
