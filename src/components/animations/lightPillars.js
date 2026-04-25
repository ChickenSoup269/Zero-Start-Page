/**
 * LightPillarsEffect — Vertical beams of light reaching up into the sky
 *
 * Simulates the atmospheric optical phenomenon where vertical beams of light
 * appear to extend above and/or below light sources.
 * - Tall vertical rectangles with gradients that fade out at the top/bottom.
 * - Slow shimmering and subtle shifting.
 * - Tiny glowing particles floating around like ice crystals.
 */
export class LightPillarsEffect {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.rafId = null

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.pillars = []
    this.crystals = []

    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._buildPillars()
    this._buildCrystals()
  }

  _buildPillars() {
    this.pillars = []
    const W = this.canvas.width

    // Create 15-25 pillars
    const count = 15 + Math.floor(Math.random() * 10)
    for (let i = 0; i < count; i++) {
      this.pillars.push(this._makePillar(W))
    }
  }

  _makePillar(W) {
    // Pillars are scattered horizontally
    const x = Math.random() * W
    // Some are wide, some are narrow
    const width = 20 + Math.random() * 60
    // Height varies
    const height = 300 + Math.random() * 600
    // Vertical position (some start lower, some higher)
    const yOffset = -200 + Math.random() * (this.canvas.height + 200)

    // Hue: Mostly cool colors (blues, purples, cyans) with occasional warm colors
    const hue =
      Math.random() > 0.8
        ? Math.random() > 0.5
          ? 10 + Math.random() * 40
          : 320 + Math.random() * 40
        : 180 + Math.random() * 60
    const sat = 50 + Math.random() * 50
    const light = 50 + Math.random() * 30

    return {
      x,
      baseX: x, // For subtle horizontal sway
      targetX: x,
      width,
      height,
      yOffset,
      alpha: 0.1 + Math.random() * 0.4,
      shimmerPhase: Math.random() * Math.PI * 2,
      shimmerSpeed: 0.005 + Math.random() * 0.02,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.0005 + Math.random() * 0.001,
      hue,
      sat,
      light,
    }
  }

  _buildCrystals() {
    this.crystals = []
    const W = this.canvas.width
    const H = this.canvas.height
    // 50-100 ice crystals
    const count = 50 + Math.floor(Math.random() * 50)
    for (let i = 0; i < count; i++) {
      this.crystals.push(this._makeCrystal(W, H))
    }
  }

  _makeCrystal(W, H) {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      size: 0.5 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.5 - 0.2, // slow upward trend or slow float
      alpha: 0.1 + Math.random() * 0.8,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.01 + Math.random() * 0.05,
    }
  }

  _drawPillar(pillar) {
    const ctx = this.ctx
    const H = this.canvas.height

    // Update logic
    pillar.shimmerPhase += pillar.shimmerSpeed
    pillar.driftPhase += pillar.driftSpeed

    // Very subtle horizontal drift
    pillar.x = pillar.baseX + Math.sin(pillar.driftPhase) * 20

    // Shimmer effect (opacity pulsing)
    const shimmer = 0.6 + 0.4 * Math.sin(pillar.shimmerPhase)
    const currentAlpha = pillar.alpha * shimmer

    // We want the pillar to fade out at top and bottom
    const gradientTop = pillar.yOffset - pillar.height / 2
    const gradientBottom = pillar.yOffset + pillar.height / 2

    const grad = ctx.createLinearGradient(0, gradientTop, 0, gradientBottom)
    if (!pillar._colorBase) {
      pillar._colorBase = `hsla(${pillar.hue}, ${pillar.sat}%, ${pillar.light}%, `
    }
    const color = pillar._colorBase

    grad.addColorStop(0, `${color}0)`)
    grad.addColorStop(0.3, `${color}${currentAlpha * 0.5})`)
    grad.addColorStop(0.5, `${color}${currentAlpha})`)
    grad.addColorStop(0.7, `${color}${currentAlpha * 0.5})`)
    grad.addColorStop(1, `${color}0)`)

    ctx.save()
    ctx.globalCompositeOperation = "screen"
    ctx.fillStyle = grad
    ctx.fillRect(
      pillar.x - pillar.width / 2,
      gradientTop,
      pillar.width,
      pillar.height,
    )
    ctx.restore()
  }

  _drawCrystal(crystal, W, H) {
    const ctx = this.ctx

    crystal.x += crystal.vx
    crystal.y += crystal.vy
    crystal.twinklePhase += crystal.twinkleSpeed

    if (crystal.y < -10) crystal.y = H + 10
    if (crystal.x < -10) crystal.x = W + 10
    if (crystal.x > W + 10) crystal.x = -10

    const t = 0.5 + 0.5 * Math.sin(crystal.twinklePhase)
    const alpha = crystal.alpha * t

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.globalCompositeOperation = "screen"
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(crystal.x, crystal.y, crystal.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

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
    if (document.visibilityState === 'hidden') return

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const W = this.canvas.width
    const H = this.canvas.height
    const ctx = this.ctx

    ctx.clearRect(0, 0, W, H)
    ctx.globalCompositeOperation = "source-over"

    // Draw pillars (sort by alpha if we wanted to, but screen composite makes order less important)
    this.pillars.forEach((p) => this._drawPillar(p))

    // Draw crystals
    this.crystals.forEach((c) => this._drawCrystal(c, W, H))
  }
}
