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

    // Sweep state: the whole group of beams shifts angle slowly
    this.sweepAngle = 0 // current group offset angle (radians)
    this.sweepTarget = 0 // target angle
    this.sweepSpeed = 0.0006 // radians per frame (base drift)
    this.sweepTimer = 0 // frames until next sweep event
    this._scheduleSweep()

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
    // 10-15 individual rays for a richer cluster
    const count = 10 + Math.floor(Math.random() * 6)
    for (let i = 0; i < count; i++) {
      this.beams.push(this._makeBeam(i, count))
    }
  }

  _makeBeam(i, total) {
    // Spread rays over ~130° fan below the sun
    const spreadRad = (130 * Math.PI) / 180
    const baseAngle = Math.PI / 2 // pointing straight down
    const offset = (Math.random() - 0.5) * 0.2 // Add slight unevenness
    const angle =
      baseAngle - spreadRad / 2 + (spreadRad / (total - 1)) * i + offset
    return {
      angle, // base angle (rad) from sun point
      swayPhase: Math.random() * Math.PI * 2, // individual drift
      swaySpeed: 0.001 + Math.random() * 0.002, // individual drift speed
      halfWidth: (0.03 + Math.random() * 0.08) * Math.PI, // angular half-width (rad)
      reach: 1.1 + Math.random() * 0.8, // fraction of diagonal length
      alpha: 0.05 + Math.random() * 0.15, // peak opacity, slightly brighter
      alphaPhase: Math.random() * Math.PI * 2, // shimmer phase
      alphaSpeed: 0.008 + Math.random() * 0.015, // shimmer speed
      // warm hue: 35-55° (golden yellow to bright amber)
      hue: 35 + Math.random() * 20,
      sat: 80 + Math.random() * 20,
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

  // ── Sweep scheduling ─────────────────────────────────────────────────────
  _scheduleSweep() {
    // Wait 120-350 frames, then start a sweep
    this.sweepTimer = Math.floor(Math.random() * 230 + 120)
  }

  _updateSweep() {
    if (this.sweepTimer > 0) {
      this.sweepTimer--
    } else {
      // Trigger: shift target by ±15-40°
      const dir = Math.random() < 0.5 ? -1 : 1
      const shift = ((15 + Math.random() * 25) * Math.PI) / 180
      this.sweepTarget += dir * shift
      // Clamp to ±55° so rays never go sideways
      const maxShift = (55 * Math.PI) / 180
      this.sweepTarget = Math.max(
        -maxShift,
        Math.min(maxShift, this.sweepTarget),
      )
      this._scheduleSweep()
    }
    // Smooth lerp toward target
    this.sweepAngle += (this.sweepTarget - this.sweepAngle) * 0.008
  }

  // ── Drawing ──────────────────────────────────────────────────────────────
  _drawBeam(beam, phase) {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const diag = Math.sqrt(W * W + H * H)

    // Add individual slight sway to each beam
    const sway = Math.sin(beam.swayPhase) * 0.05
    beam.swayPhase += beam.swaySpeed

    const centerAngle = beam.angle + this.sweepAngle + sway
    const leftAngle = centerAngle - beam.halfWidth
    const rightAngle = centerAngle + beam.halfWidth
    const reach = diag * beam.reach

    // Four points of a triangular/trapezoidal beam
    const sx = this.sunX
    const sy = this.sunY
    const lx = sx + Math.cos(leftAngle) * reach
    const ly = sy + Math.sin(leftAngle) * reach
    const rx = sx + Math.cos(rightAngle) * reach
    const ry = sy + Math.sin(rightAngle) * reach

    // Shimmer: oscillate alpha
    const shimmer = 0.5 + 0.5 * Math.sin(phase + beam.alphaPhase)
    const alpha = beam.alpha * (0.55 + 0.45 * shimmer)

    // Radial gradient from sun point outward
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, reach)
    grad.addColorStop(0, `hsla(${beam.hue},${beam.sat}%,82%,${alpha})`)
    grad.addColorStop(
      0.25,
      `hsla(${beam.hue},${beam.sat}%,78%,${alpha * 0.75})`,
    )
    grad.addColorStop(
      0.65,
      `hsla(${beam.hue},${beam.sat}%,72%,${alpha * 0.35})`,
    )
    grad.addColorStop(1, `hsla(${beam.hue},${beam.sat}%,70%,0)`)

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(lx, ly)
    // Slightly curved wide end for softer look
    ctx.arcTo(
      sx + Math.cos(centerAngle) * reach * 1.02,
      sy + Math.sin(centerAngle) * reach * 1.02,
      rx,
      ry,
      reach * 0.3,
    )
    ctx.lineTo(rx, ry)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.globalCompositeOperation = "lighter"
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
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
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

    // Update sweep
    this._updateSweep()

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

      // Gently drift horizontally with sweep (wind-like)
      const wobble = Math.sin(d.wobblePhase) * 0.3
      d.x += this.sweepAngle * 0.05 + wobble

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
