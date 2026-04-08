/**
 * SunbeamEffect — Warm sunrays sweeping slowly across the screen
 *
 * Simulates volumetric god-rays / crepuscular rays from an off-screen sun:
 *   - Several wide, soft, angled light beams radiate from a sun point near
 *     the top of the screen and slowly sweep left/right.
 *   - Each beam fades from bright golden near the source to transparent.
 *   - Periodic "sweep" events make a cluster of beams glide across together.
 *   - Tiny dust motes float lazily inside the brightest beams.
 *   - Fully built on Canvas 2D, no external deps.
 */
export class SunbeamEffect {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.rafId = null

    // Higher FPS for smoother cinematic feel
    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    // Sun origin (set in resize)
    this.sunX = 0
    this.sunY = 0

    // Beams
    this.beams = []
    // Dust motes
    this.dust = []

    // Global wind for dust drift
    this.globalWind = 0
    this.globalWindPhase = 0

    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  // ── Resize ───────────────────────────────────────────────────────────────
  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._placeSun()
    this._buildBeams()
    this._buildDust()
  }

  _placeSun() {
    const W = this.canvas.width
    const H = this.canvas.height
    // Sun sits just above the viewport, a bit left/right of center
    this.sunX = W * (0.35 + Math.random() * 0.3)
    this.sunY = -H * 0.08
  }

  // ── Beams ────────────────────────────────────────────────────────────────
  _buildBeams() {
    this.beams = []
    // 15-25 individual rays for a sharper, denser light ray look
    const count = 15 + Math.floor(Math.random() * 10)
    for (let i = 0; i < count; i++) {
      this.beams.push(this._makeBeam(i, count))
    }
  }

  _makeBeam(i, total) {
    // Spread rays over ~140° fan below the sun
    const spreadRad = (140 * Math.PI) / 180
    const baseAngle = Math.PI / 2 // pointing straight down
    const offset = (Math.random() - 0.5) * 0.3 // Add slight unevenness
    const angle =
      baseAngle - spreadRad / 2 + (spreadRad / (total - 1)) * i + offset
    return {
      angle, // base angle (rad) from sun point
      sweepPhase: Math.random() * Math.PI * 2, // individual drift phase
      sweepSpeed: 0.0003 + Math.random() * 0.0008, // slow individual sweep speed
      sweepAmplitude: 0.1 + Math.random() * 0.15, // sweeping range (radians)
      halfWidth: (0.01 + Math.random() * 0.04) * Math.PI, // narrower for distinct sharp light rays
      reach: 1.2 + Math.random() * 0.8, // fraction of diagonal length
      alpha: 0.1 + Math.random() * 0.2, // peak opacity, brighter
      alphaPhase: Math.random() * Math.PI * 2, // shimmer phase
      alphaSpeed: 0.005 + Math.random() * 0.01, // shimmer speed
      // paler, cooler color for sharp light rays
      hue: 45 + Math.random() * 15,
      sat: 30 + Math.random() * 30, // lower sat for whiter light
      light: 85 + Math.random() * 15,
    }
  }

  // ── Dust motes ───────────────────────────────────────────────────────────
  _buildDust() {
    this.dust = []
    const W = this.canvas.width
    const H = this.canvas.height
    for (let i = 0; i < 75; i++) {
      // Increased dust count for more depth
      this.dust.push(this._makeDust(W, H, true))
    }
  }

  _makeDust(W, H, scattered = false) {
    return {
      x: Math.random() * W,
      y: scattered ? Math.random() * H : H + 10,
      r: 0.6 + Math.random() * 1.8,
      vy: -(0.05 + Math.random() * 0.2), // drift upward very slowly
      vx: (Math.random() - 0.5) * 0.15,
      wobbleSpeed: 0.01 + Math.random() * 0.02,
      wobblePhase: Math.random() * Math.PI * 2,
      alpha: 0.1 + Math.random() * 0.5,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.02 + Math.random() * 0.03,
    }
  }

  // ── Wind scheduling for dust ─────────────────────────────────────────────
  _updateWind() {
    this.globalWindPhase += 0.002
    this.globalWindPhase %= Math.PI * 2
    this.globalWind = Math.sin(this.globalWindPhase) * 0.4
  }

  // ── Drawing ──────────────────────────────────────────────────────────────
  _drawBeam(beam, phase) {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const diag = Math.sqrt(W * W + H * H)

    // Generate individual sweeping angle
    beam.sweepPhase += beam.sweepSpeed
    const sweepOffset = Math.sin(beam.sweepPhase) * beam.sweepAmplitude

    const centerAngle = beam.angle + sweepOffset
    const leftAngle = centerAngle - beam.halfWidth
    const rightAngle = centerAngle + beam.halfWidth
    const reach = diag * beam.reach

    // Three points of a triangular light ray beam
    const sx = this.sunX
    const sy = this.sunY
    const lx = sx + Math.cos(leftAngle) * reach
    const ly = sy + Math.sin(leftAngle) * reach
    const rx = sx + Math.cos(rightAngle) * reach
    const ry = sy + Math.sin(rightAngle) * reach
    const cx = sx + Math.cos(centerAngle) * reach
    const cy = sy + Math.sin(centerAngle) * reach

    // Shimmer: oscillate alpha slightly
    const shimmer = 0.5 + 0.5 * Math.sin(phase + beam.alphaPhase)
    const alpha = beam.alpha * (0.6 + 0.4 * shimmer)

    // Linear gradient along the beam's center for distinct light ray look
    const grad = ctx.createLinearGradient(sx, sy, cx, cy)
    const baseColor = `hsla(${beam.hue},${beam.sat}%,${beam.light}%,`
    grad.addColorStop(0, `${baseColor}${alpha})`)
    grad.addColorStop(0.3, `${baseColor}${alpha * 0.8})`)
    grad.addColorStop(0.7, `${baseColor}${alpha * 0.3})`)
    grad.addColorStop(1, `${baseColor}0)`)

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(lx, ly)
    ctx.lineTo(rx, ry)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.globalCompositeOperation = "screen"
    ctx.fill()
    ctx.restore()
  }

  _drawDust(mote, W) {
    const ctx = this.ctx
    // Twinkle
    const t = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(mote.twinklePhase))
    ctx.save()
    ctx.globalAlpha = mote.alpha * t
    ctx.globalCompositeOperation = "lighter" // Let dust glow brightly

    // Add small fuzzy aura to dust
    const radGrad = ctx.createRadialGradient(
      mote.x,
      mote.y,
      0,
      mote.x,
      mote.y,
      mote.r * 2,
    )
    radGrad.addColorStop(0, `hsla(45,90%,90%,1)`)
    radGrad.addColorStop(0.4, `hsla(40,80%,80%,0.6)`)
    radGrad.addColorStop(1, `hsla(35,70%,60%,0)`)

    ctx.fillStyle = radGrad
    ctx.beginPath()
    ctx.arc(mote.x, mote.y, mote.r * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.resize()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    this.active = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this.rafId = this._animId = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const W = this.canvas.width
    const H = this.canvas.height
    const ctx = this.ctx

    ctx.clearRect(0, 0, W, H)
    ctx.globalCompositeOperation = "source-over"

    // Update wind for dust
    this._updateWind()

    // Phase for shimmer (advances each frame)
    this._phase = (this._phase || 0) + 0.022

    // Draw beams (back to front sorted by alpha so brighter ones on top)
    this.beams.forEach((b) => {
      b.alphaPhase += b.alphaSpeed
      this._drawBeam(b, this._phase)
    })

    // Soft warm ambient glow near sun origin
    const glowR = Math.min(W, H) * 0.7
    const glow = ctx.createRadialGradient(
      this.sunX,
      this.sunY,
      0,
      this.sunX,
      this.sunY,
      glowR,
    )
    glow.addColorStop(0, `rgba(255,240,160,0.12)`)
    glow.addColorStop(0.3, `rgba(255,210,100,0.06)`)
    glow.addColorStop(0.6, `rgba(255,180,60,0.02)`)
    glow.addColorStop(1, `rgba(255,150,40,0)`)
    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)
    ctx.restore()

    // Update & draw dust motes
    ctx.globalCompositeOperation = "source-over"
    this.dust.forEach((d) => {
      d.x += d.vx
      d.y += d.vy
      d.twinklePhase += d.twinkleSpeed
      d.wobblePhase += d.wobbleSpeed

      // Gently drift horizontally independent of light rays
      const wobble = Math.sin(d.wobblePhase) * 0.3
      d.x += this.globalWind + wobble

      if (d.y < -10) {
        // Respawn at bottom
        Object.assign(d, this._makeDust(W, H, false))
        d.y = H + 10
      }
      if (d.x < -5) d.x = W + 5
      if (d.x > W + 5) d.x = -5

      this._drawDust(d, W)
    })
  }
}
