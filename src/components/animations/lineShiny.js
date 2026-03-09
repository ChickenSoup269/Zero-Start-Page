/**
 * LineShiny — Light beams shining through shiny glass
 *
 * Simulates multiple semi-transparent light rays (god rays / crepuscular rays)
 * passing through a frosted/shiny glass surface:
 *   - Several wide, soft, angled light beams sweep slowly across the screen
 *   - Each beam has a subtle color tint and blur-like edge fall-off
 *   - Secondary thin bright streaks cut across the beams (glass scratch glints)
 *   - A soft overall caustic shimmer overlays the scene
 *   - Color tint is fully customizable via updateColor(hex)
 */
export class LineShinyEffect {
  constructor(canvasId, color = "#ffffff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.rafId = null
    this.phase = 0
    this.tintH = 0
    this.tintS = 0
    this.tintL = 100

    this.beams = []
    this.streaks = []

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this._setTintFromColor(color)
    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  // ── Color ────────────────────────────────────────────────────────────────
  _setTintFromColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    let h = 0,
      s = 0
    if (max !== min) {
      const d = max - min
      s = d / (1 - Math.abs(2 * l - 1))
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
    this.tintH = h * 360
    this.tintS = s * 100
    this.tintL = Math.max(l * 100, 55) // keep it bright
  }

  updateColor(hex) {
    this._setTintFromColor(hex)
  }

  // ── Build ────────────────────────────────────────────────────────────────
  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._buildBeams()
    this._buildStreaks()
  }

  _buildBeams() {
    const W = this.canvas.width
    const H = this.canvas.height
    this.beams = []
    // 5–8 wide soft light beams
    const count = 7 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      this.beams.push({
        // Normalized start position along top edge (0–1)
        originX: Math.random(),
        // Half-width of beam at the wide end (% of diagonal)
        halfWidth: 0.06 + Math.random() * 0.1,
        // Sweep speed (full screen per N seconds)
        speed:
          (0.00225 + Math.random() * 0.00275) * (Math.random() < 0.5 ? 1 : -1),
        // Phase offset so beams are staggered
        phaseOffset: Math.random() * Math.PI * 2,
        // Tilt angle offset relative to main angle
        angleDelta: (Math.random() - 0.5) * 0.35,
        // Peak opacity of this beam's center
        alpha: 0.04 + Math.random() * 0.07,
        // Hue shift relative to tint
        hueShift: (Math.random() - 0.5) * 40,
      })
    }
  }

  _buildStreaks() {
    const W = this.canvas.width
    const H = this.canvas.height
    this.streaks = []
    // 8–14 thin bright streaks
    const count = 8 + Math.floor(Math.random() * 7)
    for (let i = 0; i < count; i++) {
      this.streaks.push(this._makeStreak(W, H))
    }
  }

  _makeStreak(W, H) {
    return {
      // position along perpendicular axis (0–1)
      pos: Math.random(),
      // sweep speed
      speed: (0.00625 + Math.random() * 0.01) * (Math.random() < 0.5 ? 1 : -1),
      // half-width in % of screen width — wider for a soft band look
      halfWidth: 0.025 + Math.random() * 0.04,
      // max alpha
      alpha: 0.18 + Math.random() * 0.28,
      // flash state: idle → hinting → rising → hold → falling → idle
      state: "idle",
      idleCountdown: 200 + Math.floor(Math.random() * 400),
      // hinting: faint ghost preview before full flash
      hintDuration: 40 + Math.floor(Math.random() * 60),
      hintTime: 0,
      hintAlpha: 0,
      // hold & fall
      holdMax: 25 + Math.floor(Math.random() * 55),
      holdTime: 0,
      flashAlpha: 0,
      flashSpeed: 0.007 + Math.random() * 0.008,
      hueShift: (Math.random() - 0.5) * 60,
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  start() {
    if (this.active) return
    this.active = true
    this.phase = 0
    this.lastDrawTime = 0
    this._buildBeams()
    this._buildStreaks()
    this.canvas.style.display = "block"
    this.rafId = requestAnimationFrame((t) => this.animate(t))
  }

  stop() {
    this.active = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  _easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }

  // ── Draw wide beam ───────────────────────────────────────────────────────
  _drawBeam(beam) {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const diag = Math.sqrt(W * W + H * H)

    // Main angle: roughly top-left → bottom-right (like sunlight through glass)
    const baseAngle = (Math.PI / 180) * 125
    const angle = baseAngle + beam.angleDelta

    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)

    // Sweep center point oscillating across screen
    const t = Math.sin(this.phase * beam.speed * 30 + beam.phaseOffset)
    const centerOff = t * diag * 0.55

    // Beam center line passes through this point along perpendicular direction
    const perpA = angle - Math.PI / 2
    const cx = W * 0.5 + Math.cos(perpA) * centerOff
    const cy = H * 0.5 + Math.sin(perpA) * centerOff

    // Two ends of the gradient (across the beam width)
    const hw = diag * beam.halfWidth
    const x0 = cx - Math.cos(perpA) * hw
    const y0 = cy - Math.sin(perpA) * hw
    const x1 = cx + Math.cos(perpA) * hw
    const y1 = cy + Math.sin(perpA) * hw

    const hue = (this.tintH + beam.hueShift + 360) % 360
    const sat = this.tintS
    const lit = this.tintL

    const grad = ctx.createLinearGradient(x0, y0, x1, y1)
    grad.addColorStop(0, `hsla(${hue}, ${sat}%, ${lit}%, 0)`)
    grad.addColorStop(
      0.3,
      `hsla(${hue}, ${sat}%, ${lit}%, ${beam.alpha * 0.4})`,
    )
    grad.addColorStop(0.5, `hsla(${hue}, ${sat}%, ${lit}%, ${beam.alpha})`)
    grad.addColorStop(
      0.7,
      `hsla(${hue}, ${sat}%, ${lit}%, ${beam.alpha * 0.4})`,
    )
    grad.addColorStop(1, `hsla(${hue}, ${sat}%, ${lit}%, 0)`)

    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  // ── Draw thin streak ─────────────────────────────────────────────────────
  _drawStreak(streak) {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const diag = Math.sqrt(W * W + H * H)

    // Update streak flash state
    if (streak.state === "idle") {
      streak.idleCountdown--
      if (streak.idleCountdown <= 0) {
        streak.state = "hinting"
        streak.hintTime = 0
        streak.hintAlpha = 0
        streak.flashAlpha = 0
      }
    } else if (streak.state === "hinting") {
      // Slowly breathe in a faint ghost — signals incoming flash
      streak.hintTime++
      const hintPeak = streak.alpha * 0.12 // very faint, ~12% of max
      const halfDur = streak.hintDuration / 2
      if (streak.hintTime <= halfDur) {
        streak.hintAlpha = hintPeak * (streak.hintTime / halfDur)
      } else {
        streak.hintAlpha =
          hintPeak * (1 - (streak.hintTime - halfDur) / halfDur)
      }
      if (streak.hintTime >= streak.hintDuration) {
        streak.hintAlpha = 0
        streak.state = "rising"
        streak.flashAlpha = 0
      }
    } else if (streak.state === "rising") {
      streak.flashAlpha += streak.flashSpeed
      if (streak.flashAlpha >= streak.alpha) {
        streak.flashAlpha = streak.alpha
        streak.state = "hold"
        streak.holdTime = 0
      }
    } else if (streak.state === "hold") {
      streak.holdTime++
      if (streak.holdTime >= streak.holdMax) streak.state = "falling"
    } else if (streak.state === "falling") {
      streak.flashAlpha -= streak.flashSpeed * 0.5
      if (streak.flashAlpha <= 0) {
        streak.flashAlpha = 0
        streak.state = "idle"
        streak.idleCountdown = 250 + Math.floor(Math.random() * 500)
        streak.pos = Math.random()
        streak.hueShift = (Math.random() - 0.5) * 60
      }
    }

    // Use hintAlpha when hinting, flashAlpha otherwise
    const drawAlpha =
      streak.state === "hinting" ? streak.hintAlpha : streak.flashAlpha
    if (drawAlpha <= 0) return

    // Slow continuous drift
    streak.pos += streak.speed * 0.0015
    if (streak.pos > 1.1) streak.pos = -0.1
    if (streak.pos < -0.1) streak.pos = 1.1

    // Draw streak at this perpendicular position, full diagonal length
    const angle = (Math.PI / 180) * 125
    const perpA = angle - Math.PI / 2

    const cx = W * streak.pos
    const cy = H * 0.5 + (streak.pos - 0.5) * H * 0.3

    // Use a wide soft gradient band (fillRect) instead of a hard stroke line
    const hw = W * streak.halfWidth
    const x0 = cx - Math.cos(perpA) * hw
    const y0 = cy - Math.sin(perpA) * hw
    const x1 = cx + Math.cos(perpA) * hw
    const y1 = cy + Math.sin(perpA) * hw

    const hue = (this.tintH + streak.hueShift + 360) % 360
    const sat = Math.min(this.tintS + 20, 100)
    const lit = Math.min(this.tintL + 10, 100)

    // Draw along the full beam length
    const bx0 = cx - cosAngle(angle) * diag
    const by0 = cy - sinAngle(angle) * diag
    const bx1 = cx + cosAngle(angle) * diag
    const by1 = cy + sinAngle(angle) * diag

    // Soft gaussian-like gradient across the band width
    const streakGrad = ctx.createLinearGradient(x0, y0, x1, y1)
    streakGrad.addColorStop(0, `hsla(${hue}, ${sat}%, ${lit}%, 0)`)
    streakGrad.addColorStop(
      0.25,
      `hsla(${hue}, ${sat}%, ${lit}%, ${drawAlpha * 0.35})`,
    )
    streakGrad.addColorStop(0.5, `hsla(${hue}, ${sat}%, ${lit}%, ${drawAlpha})`)
    streakGrad.addColorStop(
      0.75,
      `hsla(${hue}, ${sat}%, ${lit}%, ${drawAlpha * 0.35})`,
    )
    streakGrad.addColorStop(1, `hsla(${hue}, ${sat}%, ${lit}%, 0)`)

    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.fillStyle = streakGrad
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  // ── Caustic shimmer overlay ───────────────────────────────────────────────
  _drawCaustic() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    // Slow-moving diagonal caustic gradient
    const offset = Math.sin(this.phase * 0.12) * W * 0.4
    const grad = ctx.createLinearGradient(offset, 0, W + offset, H)

    const hue = this.tintH
    const sat = this.tintS
    const lit = this.tintL

    const shimmerAlpha = 0.018 + Math.abs(Math.sin(this.phase * 0.28)) * 0.025

    grad.addColorStop(0, `hsla(${hue}, ${sat}%, ${lit}%, 0)`)
    grad.addColorStop(
      0.25,
      `hsla(${(hue + 20) % 360}, ${sat}%, ${lit}%, ${shimmerAlpha})`,
    )
    grad.addColorStop(
      0.5,
      `hsla(${(hue + 50) % 360}, ${sat}%, ${lit}%, ${shimmerAlpha * 0.5})`,
    )
    grad.addColorStop(
      0.75,
      `hsla(${(hue + 30) % 360}, ${sat}%, ${lit}%, ${shimmerAlpha})`,
    )
    grad.addColorStop(1, `hsla(${hue}, ${sat}%, ${lit}%, 0)`)

    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  // ── Animation loop ────────────────────────────────────────────────────────
  animate(currentTime = 0) {
    if (!this.active) return
    this.rafId = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const W = this.canvas.width
    const H = this.canvas.height
    this.ctx.clearRect(0, 0, W, H)

    this.phase += 0.00625

    // Caustic shimmer base layer
    this._drawCaustic()

    // Wide soft beams
    for (const beam of this.beams) {
      this._drawBeam(beam)
    }

    // Thin sharp streaks
    for (const streak of this.streaks) {
      this._drawStreak(streak)
    }
  }
}

// Module-level cached trig helpers (avoid repeated closures)
function cosAngle(a) {
  return Math.cos(a)
}
function sinAngle(a) {
  return Math.sin(a)
}
