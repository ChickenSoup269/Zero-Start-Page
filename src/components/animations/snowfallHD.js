export class SnowfallHDEffect {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.flakes = []
    this.flakeCount = 180

    // Snow pile: one height value per column of colRes pixels
    this.colRes = 4
    this.pileHeights = []
    this.maxPile = 0

    this.fps = 40
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.maxPile = this.canvas.height * 0.2 // max pile height = 20% of screen
    const cols = Math.ceil(this.canvas.width / this.colRes)
    this.pileHeights = new Array(cols).fill(0)
    this.initFlakes()
  }

  // ── Flake factory ──────────────────────────────────────────────────────────
  createFlake(fromTop = true) {
    const size = Math.random() * 6 + 1.5 // 1.5–7.5 px
    const depth = Math.random() // 0 = far, 1 = close
    return {
      x: Math.random() * this.canvas.width,
      y: fromTop
        ? Math.random() * -300 - size
        : Math.random() * this.canvas.height,
      size,
      depth,
      speedY: size * 0.1 + 0.25 + depth * 0.35,
      speedX: (Math.random() - 0.5) * 0.35,
      swing: Math.random() * 1.2 + 0.3,
      swingSpeed: Math.random() * 0.018 + 0.008,
      swingOffset: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: ((Math.random() - 0.5) * Math.PI) / 80,
      opacity: 0.45 + depth * 0.55,
      crystal: size > 4, // big flake → 6-arm crystal; small → soft round
    }
  }

  initFlakes() {
    this.flakes = []
    for (let i = 0; i < this.flakeCount; i++) {
      this.flakes.push(this.createFlake(false)) // scatter all over screen initially
    }
  }

  // ── Snow-pile helpers ──────────────────────────────────────────────────────
  getGroundY(x) {
    const col = Math.max(
      0,
      Math.min(this.pileHeights.length - 1, Math.floor(x / this.colRes)),
    )
    return this.canvas.height - this.pileHeights[col]
  }

  settleFlake(flake) {
    const col = Math.floor(flake.x / this.colRes)
    const lo = Math.max(0, col - 1)
    const hi = Math.min(this.pileHeights.length - 1, col + 1)

    // Pick the lowest neighbour column so pile spreads naturally
    let bestCol = col
    let bestH = this.pileHeights[col]
    for (let c = lo; c <= hi; c++) {
      if (this.pileHeights[c] < bestH) {
        bestH = this.pileHeights[c]
        bestCol = c
      }
    }

    if (this.pileHeights[bestCol] < this.maxPile) {
      this.pileHeights[bestCol] += flake.size * 0.16
      // Feather neighbours for a smooth mound
      if (bestCol > 0) this.pileHeights[bestCol - 1] += flake.size * 0.04
      if (bestCol < this.pileHeights.length - 1)
        this.pileHeights[bestCol + 1] += flake.size * 0.04
    }
  }

  // ── Drawing helpers ────────────────────────────────────────────────────────
  drawCrystalFlake(ctx, size, opacity) {
    ctx.globalAlpha = opacity
    ctx.strokeStyle = `rgba(255,255,255,${opacity})`
    ctx.lineWidth = Math.max(0.7, size * 0.1)

    const arms = 6
    for (let i = 0; i < arms; i++) {
      const a = (Math.PI * 2 * i) / arms
      const ex = Math.cos(a) * size
      const ey = Math.sin(a) * size

      // Main arm
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(ex, ey)
      ctx.stroke()

      // Two side branches at 55% along arm
      const bx = Math.cos(a) * size * 0.55
      const by = Math.sin(a) * size * 0.55
      const bl = size * 0.38
      for (const sign of [-1, 1]) {
        const ba = a + (sign * Math.PI) / 4
        ctx.beginPath()
        ctx.moveTo(bx, by)
        ctx.lineTo(bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl)
        ctx.stroke()
      }
    }

    // Center dot
    ctx.beginPath()
    ctx.arc(0, 0, Math.max(0.6, size * 0.14), 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${opacity})`
    ctx.fill()
  }

  drawRoundFlake(ctx, size, opacity) {
    ctx.beginPath()
    ctx.arc(0, 0, size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${opacity})`
    ctx.globalAlpha = opacity
    ctx.fill()

    // Soft glow halo
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.2)
    g.addColorStop(0, `rgba(210,235,255,${opacity * 0.35})`)
    g.addColorStop(1, "rgba(210,235,255,0)")
    ctx.beginPath()
    ctx.arc(0, 0, size * 2.2, 0, Math.PI * 2)
    ctx.fillStyle = g
    ctx.globalAlpha = 1
    ctx.fill()
  }

  drawSnowPile() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const ph = this.pileHeights
    const cols = ph.length
    if (cols === 0) return

    ctx.save()

    // ── Filled snow body ────────────────────────────────────────────────────
    ctx.beginPath()
    ctx.moveTo(0, H)

    for (let c = 0; c < cols; c++) {
      const x = c * this.colRes
      const y = H - ph[c]
      if (c === 0) {
        ctx.lineTo(x, y)
      } else {
        const px = (c - 0.5) * this.colRes
        ctx.quadraticCurveTo(px, H - ph[c - 1], x, y)
      }
    }

    ctx.lineTo(W, H)
    ctx.closePath()

    const grad = ctx.createLinearGradient(0, H - this.maxPile, 0, H)
    grad.addColorStop(0, "rgba(200,225,255,0.80)")
    grad.addColorStop(0.35, "rgba(230,245,255,0.90)")
    grad.addColorStop(1, "rgba(255,255,255,0.97)")
    ctx.fillStyle = grad
    ctx.globalAlpha = 1
    ctx.fill()

    // ── Shiny top crust ─────────────────────────────────────────────────────
    ctx.beginPath()
    for (let c = 0; c < cols; c++) {
      const x = c * this.colRes
      const y = H - ph[c]
      if (c === 0) {
        ctx.moveTo(x, y)
      } else {
        const px = (c - 0.5) * this.colRes
        ctx.quadraticCurveTo(px, H - ph[c - 1], x, y)
      }
    }
    ctx.strokeStyle = "rgba(255,255,255,0.92)"
    ctx.lineWidth = 2
    ctx.stroke()

    // ── Sparkle dots scattered along the surface ─────────────────────────
    ctx.globalAlpha = 0.55
    ctx.fillStyle = "rgba(255,255,255,1)"
    for (let c = 2; c < cols - 2; c += 7) {
      const x = c * this.colRes + this.colRes / 2
      const y = H - ph[c] - 1
      ctx.beginPath()
      ctx.arc(x, y, 1.4, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  // ── Main loop ──────────────────────────────────────────────────────────────
  animate(currentTime = 0) {
    if (!this.active) return
    this._animId = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const ctx = this.ctx
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    for (let i = 0; i < this.flakes.length; i++) {
      const f = this.flakes[i]

      // Update position
      f.swingOffset += f.swingSpeed
      f.x += Math.sin(f.swingOffset) * f.swing * 0.45 + f.speedX
      f.y += f.speedY
      f.rotation += f.rotationSpeed

      // Wrap horizontal
      if (f.x < -20) f.x = this.canvas.width + 20
      if (f.x > this.canvas.width + 20) f.x = -20

      // Check ground collision
      const groundY = this.getGroundY(f.x)
      if (f.y + f.size >= groundY) {
        this.settleFlake(f)
        Object.assign(f, this.createFlake(true))
        continue
      }

      // Draw
      ctx.save()
      ctx.translate(f.x, f.y)
      ctx.rotate(f.rotation)
      if (f.crystal) {
        this.drawCrystalFlake(ctx, f.size, f.opacity)
      } else {
        this.drawRoundFlake(ctx, f.size, f.opacity)
      }
      ctx.restore()
    }

    // Snow pile drawn on top of all flakes
    this.drawSnowPile()
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    // Reset pile on every start
    const cols = Math.ceil(this.canvas.width / this.colRes)
    this.pileHeights = new Array(cols).fill(0)
    this.initFlakes()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }
}
