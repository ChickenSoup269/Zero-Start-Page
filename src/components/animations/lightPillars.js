/**
 * LightPillarsEffect — Vertical beams of light reaching up into the sky
 *
 * Simulates the atmospheric optical phenomenon where vertical beams of light
 * appear to extend above and/or below light sources.
 * - Tall vertical rectangles with gradients that fade out at the top/bottom.
 * - Slow shimmering with fixed pillar positions.
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
    const width = 30 + Math.random() * 80
    // Height varies
    const height = 400 + Math.random() * 800
    // Vertical position (some start lower, some higher)
    const yOffset = -100 + Math.random() * (this.canvas.height + 200)

    // Hue: Mostly cool colors (blues, purples, cyans) with occasional warm colors
    const hue =
      Math.random() > 0.8
        ? Math.random() > 0.5
          ? 10 + Math.random() * 40
          : 320 + Math.random() * 40
        : 180 + Math.random() * 60
    const sat = 60 + Math.random() * 40
    const light = 50 + Math.random() * 30

    return {
      x,
      baseX: x,
      width,
      height,
      yOffset,
      alpha: 0.2 + Math.random() * 0.5,
      shimmerPhase: Math.random() * Math.PI * 2,
      shimmerSpeed: 0.01 + Math.random() * 0.03,
      hue,
      sat,
      light,
    }
  }

  _buildCrystals() {
    this.crystals = []
    const W = this.canvas.width
    const H = this.canvas.height
    // 60-120 ice crystals
    const count = 60 + Math.floor(Math.random() * 60)
    for (let i = 0; i < count; i++) {
      this.crystals.push(this._makeCrystal(W, H))
    }
  }

  _makeCrystal(W, H) {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      size: 0.8 + Math.random() * 2.5,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.8 - 0.4, // slow upward trend or slow float
      alpha: 0.2 + Math.random() * 0.7,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.02 + Math.random() * 0.08,
    }
  }

  _drawPillar(pillar) {
    const ctx = this.ctx
    const H = this.canvas.height

    // Update logic
    pillar.shimmerPhase += pillar.shimmerSpeed
    // Shimmer effect (opacity pulsing)
    const shimmer = 0.7 + 0.3 * Math.sin(pillar.shimmerPhase)
    const currentAlpha = pillar.alpha * shimmer

    // We want the pillar to fade out at top and bottom
    const gradientTop = pillar.yOffset - pillar.height / 2
    const gradientBottom = pillar.yOffset + pillar.height / 2

    const grad = ctx.createLinearGradient(0, gradientTop, 0, gradientBottom)
    if (!pillar._colorBase) {
      pillar._colorBase = `hsla(${pillar.hue}, ${pillar.sat}%, ${pillar.light}%, `
    }
    const color = pillar._colorBase

    // Optimization: avoid complex string concatenation in every frame where possible
    const alpha0 = "0)"
    const alpha4 = (currentAlpha * 0.4).toFixed(2) + ")"
    const alpha10 = currentAlpha.toFixed(2) + ")"

    grad.addColorStop(0, color + alpha0)
    grad.addColorStop(0.2, color + alpha4)
    grad.addColorStop(0.5, color + alpha10)
    grad.addColorStop(0.8, color + alpha4)
    grad.addColorStop(1, color + alpha0)

    ctx.fillStyle = grad
    ctx.fillRect(
      pillar.x - pillar.width / 2,
      gradientTop,
      pillar.width,
      pillar.height,
    )
  }

  _drawCrystal(crystal, W, H) {
    const ctx = this.ctx

    crystal.x += crystal.vx
    crystal.y += crystal.vy
    crystal.twinklePhase += crystal.twinkleSpeed

    if (crystal.y < -20) crystal.y = H + 20
    if (crystal.x < -20) crystal.x = W + 20
    if (crystal.x > W + 20) crystal.x = -20

    const t = 0.5 + 0.5 * Math.sin(crystal.twinklePhase)
    const alpha = crystal.alpha * t

    ctx.globalAlpha = alpha
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(crystal.x, crystal.y, crystal.size, 0, Math.PI * 2)
    ctx.fill()
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.resize()
    this.animate(this.lastDrawTime)
    this.canvas.style.display = "block"
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

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    this.pillars = []
    this.crystals = []
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this.rafId = requestAnimationFrame((t) => this.animate(t))
    if (document.visibilityState === "hidden") return

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const W = this.canvas.width
    const H = this.canvas.height
    const ctx = this.ctx

    ctx.clearRect(0, 0, W, H)

    // Set composite operation once for all elements if possible
    ctx.globalCompositeOperation = "screen"

    // Draw pillars
    this.pillars.forEach((p) => this._drawPillar(p))

    // Draw crystals
    this.crystals.forEach((c) => this._drawCrystal(c, W, H))

    // Reset state
    ctx.globalAlpha = 1.0
    ctx.globalCompositeOperation = "source-over"
  }
}
