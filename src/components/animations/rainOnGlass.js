export class RainOnGlassEffect {
  constructor(canvasId, color = "#a8d8ff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.drops = []
    this.streaks = [] // dried/faint background water marks
    this.animationFrame = null
    this._r = 168
    this._g = 216
    this._b = 255

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this.glareOffset = 0 // animated glass reflection sweep

    this._parseColor(color)
    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  _parseColor(hex) {
    const clean = hex.replace("#", "")
    this._r = parseInt(clean.substring(0, 2), 16)
    this._g = parseInt(clean.substring(2, 4), 16)
    this._b = parseInt(clean.substring(4, 6), 16)
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.drops = []
    this.streaks = []
    this._seedDrops()
    this._seedStreaks()
  }

  _seedDrops() {
    const density = Math.floor((this.canvas.width * this.canvas.height) / 12000)
    const count = Math.min(Math.max(density, 40), 120)
    for (let i = 0; i < count; i++) {
      this.drops.push(this._createDrop(true))
    }
  }

  // Pre-populate faint dried water marks on the glass surface
  _seedStreaks() {
    const count = Math.floor(this.canvas.width / 70)
    for (let i = 0; i < count; i++) {
      this.streaks.push(this._createStreak())
    }
  }

  _createStreak() {
    const x = Math.random() * this.canvas.width
    const y = Math.random() * this.canvas.height * 0.5
    const length = Math.random() * 220 + 60
    const points = [{ x, y }]
    let cx = x
    let cy = y
    for (let i = 1; i < 22; i++) {
      cx += (Math.random() - 0.5) * 10
      cy += length / 22
      points.push({ x: cx, y: cy })
    }
    return {
      points,
      opacity: Math.random() * 0.055 + 0.015,
      width: Math.random() * 1.4 + 0.4,
    }
  }

  _createDrop(randomY = false) {
    const maxR = Math.random() * 22 + 5
    const x = Math.random() * this.canvas.width
    const y = randomY ? Math.random() * this.canvas.height : -maxR - 10

    return {
      x,
      y,
      maxR,
      currentR: randomY ? maxR * (Math.random() * 0.7 + 0.3) : 1.5,
      growRate: Math.random() * 0.1 + 0.03,
      sliding: randomY ? Math.random() < 0.4 : false,
      slideSpeed: 0,
      maxSlideSpeed: Math.random() * 2.2 + 0.5,
      slideDelay: Math.floor(Math.random() * 200 + 50),
      slideTimer: 0,
      trail: [],
      opacity: Math.random() * 0.3 + 0.5,
      tilt: (Math.random() - 0.5) * 0.45,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.035 + 0.006,
      ripple: 0, // expanding ring on formation
      rippleOpacity: 0.35,
      absorbed: false,
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.glareOffset = 0
    if (this.drops.length === 0) {
      this._seedDrops()
      this._seedStreaks()
    }
    this._parseColor(this.color)
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame)
    this.animationFrame = null
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
    this.drops = []
    this.streaks = []
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this.animationFrame = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    this._update()
    this._draw()
  }

  _update() {
    // Spawn new drops at a natural rate
    if (Math.random() < 0.1) {
      this.drops.push(this._createDrop(false))
    }

    // Animate the glass glare sweep
    this.glareOffset = (this.glareOffset + 0.2) % (this.canvas.width + 500)

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]

      if (d.absorbed) {
        this.drops.splice(i, 1)
        continue
      }

      // Expand ripple ring on formation
      if (d.ripple < d.maxR * 2.8) {
        d.ripple += 0.9
        d.rippleOpacity = Math.max(0, 0.35 * (1 - d.ripple / (d.maxR * 2.8)))
      }

      if (!d.sliding) {
        // Growing / condensation phase
        if (d.currentR < d.maxR) {
          d.currentR = Math.min(d.currentR + d.growRate, d.maxR)
        }
        d.slideTimer++
        if (d.slideTimer >= d.slideDelay && d.currentR >= d.maxR * 0.85) {
          d.sliding = true
          d.slideSpeed = 0.1
        }

        // Absorb nearby smaller drops (realistic coalescence)
        for (let j = this.drops.length - 1; j >= 0; j--) {
          if (j === i) continue
          const other = this.drops[j]
          if (other.absorbed || other.currentR >= d.currentR) continue
          const dx = d.x - other.x
          const dy = d.y - other.y
          if (dx * dx + dy * dy < (d.currentR + other.currentR * 0.65) ** 2) {
            // Grow the absorbing drop slightly
            d.currentR = Math.min(d.currentR * 1.07, d.maxR * 1.25)
            d.maxR = Math.max(d.maxR, d.currentR)
            d.opacity = Math.min(d.opacity * 1.04, 0.88)
            other.absorbed = true
          }
        }
      } else {
        // Sliding phase — gravity + natural wobble path
        d.slideSpeed = Math.min(d.slideSpeed * 1.022 + 0.01, d.maxSlideSpeed)
        d.wobble += d.wobbleSpeed
        d.x += Math.sin(d.wobble) * d.tilt * d.slideSpeed * 1.3
        d.y += d.slideSpeed

        // Record trail waypoints
        const lastPt = d.trail[d.trail.length - 1]
        if (!lastPt || d.y - lastPt.y > 3) {
          d.trail.push({ x: d.x, y: d.y - d.currentR * 0.55 })
          if (d.trail.length > 50) d.trail.shift()
        }
      }

      if (d.y - d.currentR > this.canvas.height) {
        // Leave a semi-permanent dried streak where the drop slid
        if (d.trail.length > 6) {
          this.streaks.push({
            points: [...d.trail],
            opacity: Math.random() * 0.045 + 0.02,
            width: d.currentR * 0.38 + 0.5,
          })
          if (this.streaks.length > 70) this.streaks.shift()
        }
        this.drops.splice(i, 1)
      }
    }
  }

  _draw() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const r = this._r
    const g = this._g
    const b = this._b

    // ── 1. Subtle glass condensation/fog layer ──────────────────────────────
    const fogGrad = ctx.createRadialGradient(
      this.canvas.width * 0.5,
      this.canvas.height * 0.45,
      0,
      this.canvas.width * 0.5,
      this.canvas.height * 0.45,
      this.canvas.width * 0.72,
    )
    fogGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.045)`)
    fogGrad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, 0.02)`)
    fogGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.0)`)
    ctx.fillStyle = fogGrad
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // ── 2. Dried water streak marks on the glass surface ───────────────────
    for (const streak of this.streaks) {
      if (streak.points.length < 2) continue
      ctx.beginPath()
      ctx.moveTo(streak.points[0].x, streak.points[0].y)
      for (let i = 1; i < streak.points.length; i++) {
        const prev = streak.points[i - 1]
        const curr = streak.points[i]
        ctx.quadraticCurveTo(
          prev.x,
          prev.y,
          (prev.x + curr.x) / 2,
          (prev.y + curr.y) / 2,
        )
      }
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${streak.opacity})`
      ctx.lineWidth = streak.width
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke()
    }

    // ── 3. Drops ────────────────────────────────────────────────────────────
    for (const d of this.drops) {
      if (d.absorbed) continue
      const op = d.opacity
      const cr = d.currentR

      // Ripple ring emitted when a drop first condenses
      if (d.ripple > 0 && d.rippleOpacity > 0.005) {
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.ripple, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${d.rippleOpacity})`
        ctx.lineWidth = 1.0
        ctx.stroke()
      }

      // Trail — gradient fades from transparent at top to opaque near the drop
      if (d.sliding && d.trail.length > 2) {
        const first = d.trail[0]
        const last = d.trail[d.trail.length - 1]
        const trailGrad = ctx.createLinearGradient(
          first.x,
          first.y,
          last.x,
          last.y,
        )
        trailGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.0)`)
        trailGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${op * 0.18})`)
        trailGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${op * 0.32})`)

        ctx.beginPath()
        ctx.moveTo(first.x, first.y)
        for (let i = 1; i < d.trail.length; i++) {
          const prev = d.trail[i - 1]
          const curr = d.trail[i]
          ctx.quadraticCurveTo(
            prev.x,
            prev.y,
            (prev.x + curr.x) / 2,
            (prev.y + curr.y) / 2,
          )
        }
        ctx.strokeStyle = trailGrad
        ctx.lineWidth = cr * 0.52
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.stroke()
      }

      // Teardrop distortion — taller and narrower when sliding
      const scaleY = d.sliding ? 1.2 : 1.0
      const scaleX = d.sliding ? 0.86 : 1.0

      // Drop body — multi-stop radial gradient simulating glass-lens refraction
      const hx = d.x - cr * 0.3
      const hy = d.y - cr * 0.36
      const grad = ctx.createRadialGradient(
        hx,
        hy,
        cr * 0.04,
        d.x,
        d.y,
        cr * 1.1,
      )
      grad.addColorStop(0.0, `rgba(255, 255, 255, ${op * 0.92})`)
      grad.addColorStop(0.18, `rgba(255, 255, 255, ${op * 0.55})`)
      grad.addColorStop(0.38, `rgba(${r}, ${g}, ${b}, ${op * 0.72})`)
      grad.addColorStop(0.65, `rgba(${r}, ${g}, ${b}, ${op * 0.5})`)
      grad.addColorStop(
        0.85,
        `rgba(${(r * 0.75) | 0}, ${(g * 0.75) | 0}, ${(b * 0.75) | 0}, ${op * 0.3})`,
      )
      grad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0.0)`)

      ctx.save()
      ctx.translate(d.x, d.y)
      ctx.scale(scaleX, scaleY)
      ctx.beginPath()
      ctx.arc(0, 0, cr, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // Bright rim on the drop edge
      ctx.beginPath()
      ctx.arc(0, 0, cr, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 255, 255, ${op * 0.38})`
      ctx.lineWidth = 0.7
      ctx.stroke()
      ctx.restore()

      // Primary specular — top-left crescent (dominant light source)
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(
        d.x - cr * 0.3,
        d.y - cr * 0.36,
        cr * 0.28,
        cr * 0.16,
        -Math.PI / 5,
        0,
        Math.PI * 2,
      )
      ctx.fillStyle = `rgba(255, 255, 255, ${op * 0.82})`
      ctx.fill()
      ctx.restore()

      // Secondary specular — bottom-right micro-highlight (lens refraction)
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(
        d.x + cr * 0.33,
        d.y + cr * 0.3,
        cr * 0.11,
        cr * 0.07,
        Math.PI / 4,
        0,
        Math.PI * 2,
      )
      ctx.fillStyle = `rgba(255, 255, 255, ${op * 0.32})`
      ctx.fill()
      ctx.restore()
    }

    // ── 4. Diagonal glass glare sweep (slowly drifts across screen) ─────────
    const gx = this.glareOffset - 250
    const glareGrad = ctx.createLinearGradient(
      gx,
      0,
      gx + 250,
      this.canvas.height * 0.55,
    )
    glareGrad.addColorStop(0, `rgba(255, 255, 255, 0.0)`)
    glareGrad.addColorStop(0.35, `rgba(255, 255, 255, 0.018)`)
    glareGrad.addColorStop(0.5, `rgba(255, 255, 255, 0.038)`)
    glareGrad.addColorStop(0.65, `rgba(255, 255, 255, 0.018)`)
    glareGrad.addColorStop(1, `rgba(255, 255, 255, 0.0)`)
    ctx.save()
    ctx.transform(1, 0, -0.45, 1, 0, 0) // diagonal shear
    ctx.fillStyle = glareGrad
    ctx.fillRect(gx, 0, 250, this.canvas.height)
    ctx.restore()
  }
}
