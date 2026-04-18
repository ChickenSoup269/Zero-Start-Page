/**
 * Shiny / Holographic Card Effect (Enhanced)
 * Like a Pokemon holographic card — full-screen diagonal rainbow shimmer
 * with a sweeping iridescent band and sparkle glints.
 * Improved with mouse parallax, smoother animation (60fps), and better visual depth.
 */
export class ShinyEffect {
  constructor(canvasId, color = "#ff0000") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.rafId = null
    this.phase = 0
    this.hueOffset = 0
    this.glints = []
    this.mouse = { x: 0, y: 0 }
    this.targetMouse = { x: 0.5, y: 0.5 } // Normalized 0-1

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this._setHueFromColor(color)
    this._resizeHandler = () => this.resize()
    this._mouseHandler = (e) => this._handleMouseMove(e)
    
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  _handleMouseMove(e) {
    this.targetMouse.x = e.clientX / window.innerWidth
    this.targetMouse.y = e.clientY / window.innerHeight
  }

  _setHueFromColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    if (max !== min) {
      const d = max - min
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }
    this.hueOffset = h * 360
  }

  updateColor(hex) {
    this._setHueFromColor(hex)
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._initGlints()
  }

  _initGlints() {
    this.glints = []
    const W = this.canvas.width
    const H = this.canvas.height
    // Fewer but better glints
    for (let i = 0; i < 35; i++) {
      this.glints.push(this._makeGlint(W, H))
    }
  }

  _makeGlint(W, H) {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1.2 + Math.random() * 4,
      pts: Math.random() > 0.6 ? 4 : 8,
      alpha: 0,
      maxAlpha: 0.4 + Math.random() * 0.5,
      state: "in",
      holdTime: 0,
      holdMax: 10 + Math.floor(Math.random() * 30),
      speed: 0.02 + Math.random() * 0.03,
      rotation: Math.random() * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      depth: 0.5 + Math.random() * 1.5 // for parallax
    }
  }

  _drawStar(ctx, r, pts) {
    const step = Math.PI / pts
    const innerR = r * 0.15 // thinner spikes for "finer" look
    ctx.beginPath()
    ctx.moveTo(0, -r)
    for (let i = 0; i < pts * 2; i++) {
      const rad = i % 2 === 0 ? r : innerR
      const a = i * step - Math.PI / 2
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad)
    }
    ctx.closePath()
    ctx.fill()
  }

  start() {
    if (this.active) return
    this.active = true
    this.phase = 0
    this.lastDrawTime = 0
    this.mouse.x = 0.5
    this.mouse.y = 0.5
    window.addEventListener("mousemove", this._mouseHandler)
    this.rafId = this._animId = requestAnimationFrame((t) => this.animate(t))
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    window.removeEventListener("mousemove", this._mouseHandler)
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
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

    // Smooth mouse interpolation
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05

    this.phase += 0.003

    ctx.clearRect(0, 0, W, H)

    const ho = this.hueOffset
    const diag = Math.sqrt(W * W + H * H)
    const angle = (135 * Math.PI) / 180
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)

    // --- Layer 1: Holographic Rainbow Overlay ---
    ctx.save()
    ctx.globalCompositeOperation = "source-over"

    // Parallax shift for rainbow based on mouse
    const mouseShiftX = (this.mouse.x - 0.5) * 150
    const mouseShiftY = (this.mouse.y - 0.5) * 150
    
    const panOffset = Math.sin(this.phase * 0.4) * diag * 0.3 + mouseShiftX
    const cx = W / 2 + cosA * panOffset
    const cy = H / 2 + sinA * panOffset
    const gx0 = cx - cosA * diag * 0.8
    const gy0 = cy - sinA * diag * 0.8
    const gx1 = cx + cosA * diag * 0.8
    const gy1 = cy + sinA * diag * 0.8

    const rainbow = ctx.createLinearGradient(gx0, gy0, gx1, gy1)
    const steps = 12
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const hue = (ho + t * 360 + this.mouse.x * 40) % 360
      rainbow.addColorStop(t, `hsla(${hue}, 85%, 65%, 0.15)`)
    }
    ctx.fillStyle = rainbow
    ctx.fillRect(0, 0, W, H)
    ctx.restore()

    // --- Layer 2: Sweeping Iridescent Band ---
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    // Band sweep position + mouse interaction
    const mouseSweep = (this.mouse.x - 0.5) * 400
    const sweepBase = ((this.phase * 0.3) % 1.5) - 0.25 // Longer wait between sweeps
    const sweepPos = sweepBase * (diag * 2) - diag + mouseSweep
    
    const bcx = W / 2 + cosA * sweepPos
    const bcy = H / 2 + sinA * sweepPos
    const bWidth = diag * 0.25
    const bx0 = bcx - cosA * bWidth
    const by0 = bcy - sinA * bWidth
    const bx1 = bcx + cosA * bWidth
    const by1 = bcy + sinA * bWidth

    const hNow = (ho + this.phase * 30 + this.mouse.y * 50) % 360
    const band = ctx.createLinearGradient(bx0, by0, bx1, by1)
    band.addColorStop(0, `hsla(${hNow}, 100%, 75%, 0)`)
    band.addColorStop(0.4, `hsla(${(hNow + 30) % 360}, 100%, 90%, 0.12)`)
    band.addColorStop(0.5, `hsla(${(hNow + 60) % 360}, 100%, 98%, 0.25)`)
    band.addColorStop(0.6, `hsla(${(hNow + 90) % 360}, 100%, 90%, 0.12)`)
    band.addColorStop(1, `hsla(${hNow}, 100%, 75%, 0)`)

    ctx.fillStyle = band
    ctx.fillRect(0, 0, W, H)
    ctx.restore()

    // --- Layer 3: Sparkle Glints ---
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    for (let i = 0; i < this.glints.length; i++) {
      const g = this.glints[i]

      // Update state
      if (g.state === "in") {
        g.alpha += g.speed
        if (g.alpha >= g.maxAlpha) { g.alpha = g.maxAlpha; g.state = "hold"; g.holdTime = 0; }
      } else if (g.state === "hold") {
        if (++g.holdTime >= g.holdMax) g.state = "out"
      } else {
        g.alpha -= g.speed
        if (g.alpha <= 0) { this.glints[i] = this._makeGlint(W, H); continue; }
      }

      if (g.alpha <= 0) continue

      g.rotation += g.rotSpeed
      
      // Parallax glints
      const gx = g.x + (this.mouse.x - 0.5) * 40 * g.depth
      const gy = g.y + (this.mouse.y - 0.5) * 40 * g.depth

      const hue = (ho + (g.x / W) * 200 + this.phase * 60) % 360

      ctx.save()
      ctx.globalAlpha = g.alpha
      ctx.translate(gx, gy)
      ctx.rotate(g.rotation)

      // core glow
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, g.r * 4)
      grd.addColorStop(0, `hsla(${hue}, 100%, 100%, 1)`)
      grd.addColorStop(0.3, `hsla(${hue}, 100%, 85%, 0.5)`)
      grd.addColorStop(1, `rgba(255,255,255,0)`)
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(0, 0, g.r * 4, 0, Math.PI * 2)
      ctx.fill()

      // star spike
      ctx.fillStyle = "rgba(255,255,255,0.95)"
      this._drawStar(ctx, g.r, g.pts)

      ctx.restore()
    }

    ctx.restore()
  }
}
