export class RainOnGlassEffect {
  constructor(canvasId, color = "#a8d8ff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.drops = []
    this.animationFrame = null
    this._r = 168
    this._g = 216
    this._b = 255

    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

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
    this._seedDrops()
  }

  _seedDrops() {
    const density = Math.floor((this.canvas.width * this.canvas.height) / 18000)
    const count = Math.min(Math.max(density, 25), 80)
    for (let i = 0; i < count; i++) {
      this.drops.push(this._createDrop(true))
    }
  }

  _createDrop(randomY = false) {
    const maxR = Math.random() * 22 + 6
    const x = Math.random() * this.canvas.width
    const y = randomY ? Math.random() * this.canvas.height : -maxR - 10

    return {
      x,
      y,
      maxR,
      currentR: randomY ? maxR * (Math.random() * 0.7 + 0.3) : 1.5,
      growRate: Math.random() * 0.12 + 0.04,
      sliding: randomY ? Math.random() < 0.4 : false,
      slideSpeed: 0,
      maxSlideSpeed: Math.random() * 2.0 + 0.6,
      slideDelay: Math.floor(Math.random() * 180 + 40),
      slideTimer: 0,
      trail: [],
      opacity: Math.random() * 0.35 + 0.45,
      tilt: (Math.random() - 0.5) * 0.4,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.04 + 0.008,
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    if (this.drops.length === 0) this._seedDrops()
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
    // Randomly spawn new drops
    if (Math.random() < 0.08) {
      this.drops.push(this._createDrop(false))
    }

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]

      if (!d.sliding) {
        // Growing phase — drop condenses on the glass
        if (d.currentR < d.maxR) {
          d.currentR = Math.min(d.currentR + d.growRate, d.maxR)
        }
        d.slideTimer++
        if (d.slideTimer >= d.slideDelay && d.currentR >= d.maxR * 0.85) {
          d.sliding = true
          d.slideSpeed = 0.15
        }
      } else {
        // Sliding phase — gravity + slight wobble
        d.slideSpeed = Math.min(d.slideSpeed * 1.025 + 0.012, d.maxSlideSpeed)
        d.wobble += d.wobbleSpeed
        d.x += Math.sin(d.wobble) * d.tilt * d.slideSpeed
        d.y += d.slideSpeed

        // Record trail points
        const lastPt = d.trail[d.trail.length - 1]
        if (!lastPt || d.y - lastPt.y > 4) {
          d.trail.push({ x: d.x, y: d.y - d.currentR * 0.6 })
          if (d.trail.length > 35) d.trail.shift()
        }
      }

      // Remove drop once it leaves the screen
      if (d.y - d.currentR > this.canvas.height) {
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

    for (const d of this.drops) {
      const op = d.opacity
      const cr = d.currentR

      // --- Trail (thin water smear) ---
      if (d.sliding && d.trail.length > 2) {
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(d.trail[0].x, d.trail[0].y)
        for (let i = 1; i < d.trail.length; i++) {
          // Smooth curve through trail points
          const prev = d.trail[i - 1]
          const curr = d.trail[i]
          const mx = (prev.x + curr.x) / 2
          const my = (prev.y + curr.y) / 2
          ctx.quadraticCurveTo(prev.x, prev.y, mx, my)
        }
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${op * 0.28})`
        ctx.lineWidth = cr * 0.55
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.stroke()
        ctx.restore()
      }

      // --- Drop body (radial gradient for glass-lens look) ---
      const hx = d.x - cr * 0.28
      const hy = d.y - cr * 0.32

      const grad = ctx.createRadialGradient(hx, hy, cr * 0.05, d.x, d.y, cr)
      grad.addColorStop(0.0, `rgba(255, 255, 255, ${op * 0.85})`)
      grad.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, ${op * 0.65})`)
      grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${op * 0.45})`)
      grad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, ${op * 0.08})`)

      ctx.beginPath()
      // Slightly oval drop — wider than tall when small (condensing), taller when sliding
      const scaleY = d.sliding ? 1.15 : 1.0
      ctx.save()
      ctx.translate(d.x, d.y)
      ctx.scale(1, scaleY)
      ctx.arc(0, 0, cr, 0, Math.PI * 2)
      ctx.restore()
      ctx.fillStyle = grad
      ctx.fill()

      // --- Soft glow rim ---
      ctx.beginPath()
      ctx.save()
      ctx.translate(d.x, d.y)
      ctx.scale(1, scaleY)
      ctx.arc(0, 0, cr, 0, Math.PI * 2)
      ctx.restore()
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${op * 0.3})`
      ctx.lineWidth = 0.8
      ctx.stroke()

      // --- Specular highlight (top-left crescent) ---
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(
        d.x - cr * 0.28,
        d.y - cr * 0.32,
        cr * 0.32,
        cr * 0.18,
        -Math.PI / 5,
        0,
        Math.PI * 2,
      )
      ctx.fillStyle = `rgba(255, 255, 255, ${op * 0.7})`
      ctx.fill()
      ctx.restore()
    }
  }
}
