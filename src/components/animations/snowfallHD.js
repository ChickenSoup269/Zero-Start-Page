/**
 * SnowfallHDEffect — Hollywood AAA Ultra HD Accumulating Snowfall Display
 *
 * Masterpiece Accumulating Snow Simulation:
 *  - Organic Accumulating Snowdrifts with Glistering Top Crust & Natural Dispersion.
 *  - 3D Hexagonal Crystals & Soft Volumetric Graupel with Depth-of-Field.
 *  - Interactive Aerodynamic Mouse Wind Wake parting falling flakes.
 *  - 60Hz - 240Hz High Refresh Rate Pipeline with Delta-time Normalization.
 *  - High-DPI Retina Subpixel Precision.
 */

export class SnowfallHDEffect {
  constructor(canvasId) {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.flakes = []
    this.flakeCount = 200

    // Snow pile: column resolution
    this.colRes = 4
    this.pileHeights = []
    this.maxPile = 0

    this.time = 0
    this.lastDrawTime = performance.now()
    this._animId = null

    // Screen & DPI state
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)

    // Interactive mouse wind wake
    this.mouse = {
      x: -9999,
      y: -9999,
      radius: 135,
      radiusSq: 135 * 135,
      active: false,
    }

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseLeaveHandler = () => this._onMouseLeave()
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseleave", this._mouseLeaveHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)
  }

  resize() {
    if (!this.canvas) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = Math.round(this.width * this.dpr)
    this.canvas.height = Math.round(this.height * this.dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.canvas.style.pointerEvents = "none"

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.ctx.scale(this.dpr, this.dpr)
    }

    this.maxPile = this.height * 0.22
    const cols = Math.ceil(this.width / this.colRes)
    if (this.pileHeights.length !== cols) {
      this.pileHeights = new Array(cols).fill(0)
    }
    this.initFlakes()
  }

  createFlake(fromTop = true) {
    const depth = Math.pow(Math.random(), 1.2) * 0.8 + 0.2 // 0.2 to 1.0
    const size = (Math.random() * 5.5 + 2.0) * depth

    return {
      x: Math.random() * (this.width + 40) - 20,
      y: fromTop
        ? Math.random() * -200 - size
        : Math.random() * this.height,
      size,
      depth,
      speedY: (size * 0.12 + 0.45 + depth * 0.4),
      speedX: (Math.random() - 0.5) * 0.35,
      swing: (Math.random() * 1.2 + 0.4) * depth,
      swingSpeed: Math.random() * 0.025 + 0.01,
      swingOffset: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: ((Math.random() - 0.5) * Math.PI) / 60,
      opacity: (Math.random() * 0.35 + 0.65) * depth,
      crystal: size > 3.8,
    }
  }

  initFlakes() {
    this.flakes = []
    for (let i = 0; i < this.flakeCount; i++) {
      this.flakes.push(this.createFlake(false))
    }
  }

  _onMouseMove(e) {
    this.mouse.x = e.clientX
    this.mouse.y = e.clientY
    this.mouse.active = true
  }

  _onMouseLeave() {
    this.mouse.active = false
    this.mouse.x = -9999
    this.mouse.y = -9999
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.lastDrawTime = performance.now()
    }
  }

  getGroundY(x) {
    const col = Math.max(
      0,
      Math.min(this.pileHeights.length - 1, Math.floor(x / this.colRes)),
    )
    return this.height - this.pileHeights[col]
  }

  settleFlake(flake) {
    const col = Math.floor(flake.x / this.colRes)
    if (col < 0 || col >= this.pileHeights.length) return

    const lo = Math.max(0, col - 1)
    const hi = Math.min(this.pileHeights.length - 1, col + 1)

    let bestCol = col
    let bestH = this.pileHeights[col]
    for (let c = lo; c <= hi; c++) {
      if (this.pileHeights[c] < bestH) {
        bestH = this.pileHeights[c]
        bestCol = c
      }
    }

    if (this.pileHeights[bestCol] < this.maxPile) {
      this.pileHeights[bestCol] += flake.size * 0.18
      if (bestCol > 0) this.pileHeights[bestCol - 1] += flake.size * 0.05
      if (bestCol < this.pileHeights.length - 1) {
        this.pileHeights[bestCol + 1] += flake.size * 0.05
      }
    }
  }

  drawCrystalFlake(ctx, size, opacity) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity.toFixed(3)})`
    ctx.lineWidth = Math.max(0.7, size * 0.12)
    ctx.lineCap = "round"

    const arms = 6
    for (let i = 0; i < arms; i++) {
      const a = (Math.PI * 2 * i) / arms
      const ex = Math.cos(a) * size
      const ey = Math.sin(a) * size

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(ex, ey)
      ctx.stroke()

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

    ctx.beginPath()
    ctx.arc(0, 0, Math.max(0.8, size * 0.16), 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${(opacity * 0.95).toFixed(3)})`
    ctx.fill()
  }

  drawRoundFlake(ctx, size, opacity) {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5)
    grad.addColorStop(0, `rgba(255, 255, 255, ${opacity.toFixed(3)})`)
    grad.addColorStop(0.5, `rgba(220, 240, 255, ${(opacity * 0.75).toFixed(3)})`)
    grad.addColorStop(1, "rgba(220, 240, 255, 0)")

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2)
    ctx.fill()
  }

  drawSnowPile() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height
    const ph = this.pileHeights
    const cols = ph.length
    if (cols === 0) return

    ctx.save()

    // 1. Filled Organic Snowdrift Body
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
    grad.addColorStop(0, "rgba(205, 230, 255, 0.82)")
    grad.addColorStop(0.35, "rgba(235, 248, 255, 0.92)")
    grad.addColorStop(1, "rgba(255, 255, 255, 0.98)")
    ctx.fillStyle = grad
    ctx.fill()

    // 2. Glistening Top Ice Crust
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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)"
    ctx.lineWidth = 1.8
    ctx.stroke()

    // 3. Sparkling Surface Glints
    for (let c = 2; c < cols - 2; c += 6) {
      if (ph[c] > 1) {
        const x = c * this.colRes + this.colRes / 2
        const y = H - ph[c] - 1
        const twinkle = 0.5 + 0.5 * Math.sin(this.time * 4 + c)
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(x, y, 1.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.restore()
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.time = 0

    const cols = Math.ceil(this.width / this.colRes)
    this.pileHeights = new Array(cols).fill(0)
    this.initFlakes()

    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"
    this.resize()

    const animateLoop = (now) => {
      if (!this.active) return
      this._animId = requestAnimationFrame(animateLoop)

      if (document.visibilityState === "hidden") {
        this.lastDrawTime = now
        return
      }

      const elapsed = Math.min(now - this.lastDrawTime, 100)
      this.lastDrawTime = now
      const dt = Math.min(elapsed / 16.67, 3.0)
      this.time += 0.016 * dt

      this.update(dt)
      this.draw()
    }

    this._animId = requestAnimationFrame(animateLoop)
  }

  stop() {
    this.active = false
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.canvas) {
      this.canvas.style.display = "none"
    }
    this.flakes = []
    this.pileHeights = []
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  update(dt) {
    for (let i = 0; i < this.flakes.length; i++) {
      const f = this.flakes[i]

      f.swingOffset += f.swingSpeed * dt
      f.rotation += f.rotationSpeed * dt

      let pushX = 0
      let pushY = 0
      if (this.mouse.active) {
        const dx = f.x - this.mouse.x
        const dy = f.y - this.mouse.y
        const distSq = dx * dx + dy * dy
        if (distSq < this.mouse.radiusSq && distSq > 1) {
          const dist = Math.sqrt(distSq)
          const force = (1 - dist / this.mouse.radius) * 2.5 * f.depth
          pushX = (dx / dist) * force
          pushY = (dy / dist) * force * 0.5
        }
      }

      f.x += (Math.sin(f.swingOffset) * f.swing * 0.45 + f.speedX + pushX) * dt
      f.y += (f.speedY + pushY) * dt

      if (f.x < -30) f.x = this.width + 30
      if (f.x > this.width + 30) f.x = -30

      const groundY = this.getGroundY(f.x)
      if (f.y + f.size >= groundY) {
        this.settleFlake(f)
        Object.assign(f, this.createFlake(true))
      }
    }
  }

  draw() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height

    ctx.clearRect(0, 0, W, H)

    for (let i = 0; i < this.flakes.length; i++) {
      const f = this.flakes[i]
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

    this.drawSnowPile()
  }
}
