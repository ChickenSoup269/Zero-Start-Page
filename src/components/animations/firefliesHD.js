/**
 * FirefliesHD — Canvas recreation of the classic CSS firefly animation.
 *
 * Each firefly mirrors the original SCSS structure:
 *   - Core element   : slow random movement between waypoints + scale change
 *   - ::before       : small dark satellite dot orbiting the core (drift rotation)
 *   - ::after        : white dot at center that periodically flashes with yellow glow
 *
 * All values are kept as close as possible to the original CSS:
 *   - Firefly size    : 0.4vw
 *   - Orbit radius    : 10vw  (transform-origin: -10vw in CSS)
 *   - Total move time : 350 s  (slowed down for realism)
 *   - Drift speed     : 15–30 s per revolution
 *   - Flash period    : 5 000–11 000 ms, delay 500–8 500 ms
 */
export class FirefliesHD {
  constructor(canvasId, quantity = 15) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.quantity = quantity
    this.flies = []

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    // Rebuild flies on resize so vw-based sizes stay correct
    if (this.active) this._build()
  }

  // ── Firefly factory ──────────────────────────────────────────────────────
  _build() {
    const W = this.canvas.width
    const H = this.canvas.height

    this.flies = []
    for (let i = 0; i < this.quantity; i++) {
      // Number of movement waypoints: 16–28 (matches $steps: random(12)+16)
      const steps = Math.floor(Math.random() * 13) + 16
      const waypoints = []
      for (let s = 0; s <= steps; s++) {
        waypoints.push({
          x: (Math.random() - 0.5) * W * 0.8 + W * 0.5,
          y: (Math.random() - 0.5) * H * 0.75 + H * 0.55, // favor lower half like real fireflies
          scale: Math.random() * 0.75 + 0.25, // 0.25–1.0
        })
      }

      // drift rotation speed: 15–30 s (slower orbit)
      const driftPeriod = (Math.random() * 15 + 15) * 1000

      // flash: period 5 000–11 000 ms, delay 500–8 500 ms
      const flashPeriod = Math.random() * 6000 + 5000
      const flashDelay = Math.random() * 8000 + 500

      this.flies.push({
        waypoints,
        wpIdx: 0,
        // Current world position (starts at first waypoint)
        x: waypoints[0].x,
        y: waypoints[0].y,
        scale: waypoints[0].scale,
        // Per-segment travel time: total 350 s / steps (slower, more realistic)
        segDuration: (350000 / steps) * (0.8 + Math.random() * 0.4),
        segElapsed: Math.random() * 5000, // stagger start
        // Drift (orbit)
        driftAngle: Math.random() * Math.PI * 2,
        driftPeriod,
        // Flash state
        flashPeriod,
        flashDelay,
        flashClock: -(Math.random() * flashDelay), // negative = pre-delay
        flashOpacity: 0,
        glowRadius: 0,
        // Idle ambient glow color (warm green-yellow, bioluminescent)
        idleGlow: Math.random() * 0.08 + 0.04, // 0.04–0.12 base ambient opacity
        // Micro-wander: tiny random drift each frame
        wanderVx: (Math.random() - 0.5) * 0.3,
        wanderVy: (Math.random() - 0.5) * 0.3,
        wanderX: 0,
        wanderY: 0,
        // Trail history
        trail: [],
      })
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this._build()
    this.canvas.style.display = "block"
    this.animate(0)
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.flies = []
    this.canvas.style.display = "none"
  }

  // ── Update ───────────────────────────────────────────────────────────────
  _updateFly(fly, dt) {
    // ── Position / scale (waypoint lerp) ────────────────────────────────
    fly.segElapsed += dt
    const pct = Math.min(fly.segElapsed / fly.segDuration, 1)
    const eased = this._easeInOut(pct)

    const a = fly.waypoints[fly.wpIdx]
    const b = fly.waypoints[(fly.wpIdx + 1) % fly.waypoints.length]

    fly.x = a.x + (b.x - a.x) * eased
    fly.y = a.y + (b.y - a.y) * eased
    fly.scale = a.scale + (b.scale - a.scale) * eased

    if (pct >= 1) {
      fly.wpIdx = (fly.wpIdx + 1) % fly.waypoints.length
      fly.segElapsed = 0
    }

    // ── Drift angle (continuous rotation) ───────────────────────────────
    fly.driftAngle += (Math.PI * 2 * dt) / fly.driftPeriod

    // ── Micro-wander: subtle jitter so they don't glide perfectly ────────
    fly.wanderVx += (Math.random() - 0.5) * 0.04
    fly.wanderVy += (Math.random() - 0.5) * 0.04
    // Dampen wander velocity so it stays subtle
    fly.wanderVx *= 0.97
    fly.wanderVy *= 0.97
    fly.wanderX = Math.max(-4, Math.min(4, fly.wanderX + fly.wanderVx))
    fly.wanderY = Math.max(-4, Math.min(4, fly.wanderY + fly.wanderVy))

    // ── Trail history ────────────────────────────────────────────────────
    fly.trail.push({ x: fly.x + fly.wanderX, y: fly.y + fly.wanderY })
    if (fly.trail.length > 8) fly.trail.shift()

    // ── Flash (mirrors @keyframes flash) ────────────────────────────────
    fly.flashClock += dt
    // Start flashing only after delay has passed
    if (fly.flashClock < 0) {
      fly.flashOpacity = 0
      fly.glowRadius = 0
      return
    }

    const t = (fly.flashClock % fly.flashPeriod) / fly.flashPeriod // 0–1

    // Original: opacity peaks at ~5 %, back to 0 at 30 %, stays 0 until 100 %
    // box-shadow: 0 0 0vw 0vw → 0 0 2vw 0.4vw at 5 %
    if (t < 0.05) {
      // Rising edge (0 → 5%)
      const p = t / 0.05
      fly.flashOpacity = this._easeInOut(p)
      fly.glowRadius = this._easeInOut(p)
    } else if (t < 0.3) {
      // Falling edge (5 → 30%)
      const p = (t - 0.05) / 0.25
      fly.flashOpacity = 1 - this._easeInOut(p)
      fly.glowRadius = 1 - this._easeInOut(p)
    } else {
      fly.flashOpacity = 0
      fly.glowRadius = 0
    }
  }

  _easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }

  // ── Draw ─────────────────────────────────────────────────────────────────
  _drawFly(fly) {
    const ctx = this.ctx
    const W = this.canvas.width
    const vw = W / 100 // 1vw in px

    const coreSize = 0.4 * vw * fly.scale // 0.4vw * scale
    const orbitR = 10 * vw * fly.scale // 10vw * scale
    const glowMax = 2 * vw * fly.scale // 2vw box-shadow blur
    const spreadMax = 0.4 * vw * fly.scale // 0.4vw spread

    const drawX = fly.x + fly.wanderX
    const drawY = fly.y + fly.wanderY

    // ── Trail — faint dotted light trail behind the firefly ──────────────
    if (fly.trail.length > 1) {
      for (let i = 0; i < fly.trail.length - 1; i++) {
        const alpha = (i / fly.trail.length) * 0.18
        const radius = Math.max(coreSize * 0.35 * (i / fly.trail.length), 0.5)
        ctx.beginPath()
        ctx.arc(fly.trail[i].x, fly.trail[i].y, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(180, 255, 120, ${alpha})`
        ctx.fill()
      }
    }

    ctx.save()
    ctx.translate(drawX, drawY)

    // ── ::before — orbiting dark satellite (body segment) ────────────────
    const satX = Math.cos(fly.driftAngle) * orbitR
    const satY = Math.sin(fly.driftAngle) * orbitR

    ctx.beginPath()
    ctx.arc(satX, satY, Math.max(coreSize * 0.6, 1), 0, Math.PI * 2)
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)"
    ctx.fill()

    // ── Idle ambient bioluminescent glow (always on, green-yellow) ───────
    const ambientR = (glowMax * 0.6 + coreSize) * (1 + fly.idleGlow * 2)
    const ambGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, ambientR)
    ambGrad.addColorStop(0, `rgba(180, 255, 80, ${fly.idleGlow * 1.5})`)
    ambGrad.addColorStop(0.5, `rgba(140, 220, 60, ${fly.idleGlow * 0.6})`)
    ambGrad.addColorStop(1, "rgba(100, 180, 40, 0)")
    ctx.beginPath()
    ctx.arc(0, 0, ambientR, 0, Math.PI * 2)
    ctx.fillStyle = ambGrad
    ctx.fill()

    // ── ::after — white core + warm yellow flash ──────────────────────
    if (fly.flashOpacity > 0) {
      // Layered glow: outer warm yellow → inner bright white-yellow
      const glowCurrent = glowMax * fly.glowRadius + spreadMax * fly.glowRadius
      const glowRadius = glowCurrent + coreSize * 3

      // Outer halo
      const outerGrad = ctx.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        glowRadius * 2.5,
      )
      outerGrad.addColorStop(
        0,
        `rgba(255, 255, 180, ${fly.flashOpacity * 0.6})`,
      )
      outerGrad.addColorStop(
        0.4,
        `rgba(255, 230, 50, ${fly.flashOpacity * 0.3})`,
      )
      outerGrad.addColorStop(
        0.8,
        `rgba(200, 180, 0, ${fly.flashOpacity * 0.1})`,
      )
      outerGrad.addColorStop(1, "rgba(150, 140, 0, 0)")
      ctx.beginPath()
      ctx.arc(0, 0, glowRadius * 2.5, 0, Math.PI * 2)
      ctx.fillStyle = outerGrad
      ctx.fill()

      // Inner bright core glow
      const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius)
      innerGrad.addColorStop(0, `rgba(255, 255, 220, ${fly.flashOpacity})`)
      innerGrad.addColorStop(
        0.3,
        `rgba(255, 245, 80, ${fly.flashOpacity * 0.85})`,
      )
      innerGrad.addColorStop(
        0.7,
        `rgba(255, 220, 0, ${fly.flashOpacity * 0.4})`,
      )
      innerGrad.addColorStop(1, "rgba(255, 180, 0, 0)")
      ctx.beginPath()
      ctx.arc(0, 0, glowRadius, 0, Math.PI * 2)
      ctx.fillStyle = innerGrad
      ctx.fill()
    }

    // Core dot: dim green-white idle, bright warm-white on flash
    const coreAlpha = 0.25 + fly.flashOpacity * 0.75
    const coreR = Math.floor(200 + fly.flashOpacity * 55)
    const coreG = Math.floor(255)
    const coreB = Math.floor(160 - fly.flashOpacity * 110)
    ctx.beginPath()
    ctx.arc(0, 0, Math.max(coreSize, 1), 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${coreR}, ${coreG}, ${coreB}, ${coreAlpha})`
    ctx.fill()

    ctx.restore()
  }

  // ── Animation loop ────────────────────────────────────────────────────────
  animate(currentTime = 0) {
    if (!this.active) return
    this._animId = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    const dt = elapsed // delta time in milliseconds
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const W = this.canvas.width
    const H = this.canvas.height

    this.ctx.clearRect(0, 0, W, H)

    // Use "screen" blending so overlapping glows add together naturally
    this.ctx.globalCompositeOperation = "screen"

    for (const fly of this.flies) {
      this._updateFly(fly, dt)
      this._drawFly(fly)
    }

    this.ctx.globalCompositeOperation = "source-over"
  }
}
