import { hexToRgb } from "../../utils/colors.js"

export class GridScanEffect {
  constructor(canvasId, color = "#00ffcc") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.scanY = 0
    this.scanSpeed = 1 // Slower default speed
    this.gridSpacing = 50
    this.perspective = true
    this.glowPoints = []
    this.maxGlowPoints = 15

    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  updateColor(color) {
    this.color = color
    this.glowPoints = [] // Reset glow points on color change
  }

  setOptions(opts = {}) {
    // Reduced multiplier from 2.0 to 1.2 to make it significantly slower
    if (opts.speed !== undefined) this.scanSpeed = opts.speed * 1.2
    if (opts.spacing !== undefined) this.gridSpacing = opts.spacing
    if (opts.perspective !== undefined) this.perspective = opts.perspective
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._initGlowPoints()
  }

  _initGlowPoints() {
    this.glowPoints = []
    const cols = Math.ceil(this.canvas.width / this.gridSpacing)
    const rows = Math.ceil(this.canvas.height / this.gridSpacing)
    
    for (let i = 0; i < this.maxGlowPoints; i++) {
      this.glowPoints.push({
        col: Math.floor(Math.random() * cols),
        row: Math.floor(Math.random() * rows),
        alpha: 0,
        targetAlpha: Math.random() * 0.5 + 0.2,
        speed: 0.01 + Math.random() * 0.02,
        life: Math.random() * 100
      })
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.resize()
    this.animate()
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  animate() {
    if (!this.active) return
    this._animId = requestAnimationFrame(() => this.animate())

    const W = this.canvas.width
    const H = this.canvas.height
    const ctx = this.ctx

    ctx.clearRect(0, 0, W, H)

    const rgb = hexToRgb(this.color)
    const rgbStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`

    // 1. Draw Background Grid (Subtle)
    ctx.lineWidth = 1
    ctx.strokeStyle = `rgba(${rgbStr}, 0.08)`
    
    ctx.beginPath()
    for (let x = 0; x <= W; x += this.gridSpacing) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
    }
    for (let y = 0; y <= H; y += this.gridSpacing) {
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
    }
    ctx.stroke()

    // 2. Draw 3D Perspective Grid (More Depth)
    if (this.perspective) {
      ctx.save()
      const horizon = H * 0.45
      const gridH = H - horizon
      
      // Depth/Fog Gradient
      const depthGradient = ctx.createLinearGradient(0, horizon, 0, H)
      depthGradient.addColorStop(0, `rgba(${rgbStr}, 0)`)
      depthGradient.addColorStop(0.3, `rgba(${rgbStr}, 0.05)`)
      depthGradient.addColorStop(1, `rgba(${rgbStr}, 0.25)`)
      ctx.strokeStyle = depthGradient
      ctx.lineWidth = 1

      ctx.beginPath()
      // Converging lines (Perspective)
      const lineCount = 24
      for (let i = 0; i <= lineCount; i++) {
        const xTop = (W / lineCount) * i
        const xBottom = (W * 3 / lineCount) * i - W // Wider spread at bottom
        ctx.moveTo(xTop, horizon)
        ctx.lineTo(xBottom, H)
      }
      
      // Horizontal lines with exponential spacing (Real perspective)
      for (let i = 0; i < 12; i++) {
        const ratio = i / 12
        const y = horizon + Math.pow(ratio, 2.5) * gridH
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
      }
      ctx.stroke()
      ctx.restore()
    }

    // 3. Update and Draw Glow Points
    this.glowPoints.forEach(p => {
      p.life -= 0.5
      if (p.life <= 0) {
        const cols = Math.ceil(W / this.gridSpacing)
        const rows = Math.ceil(H / this.gridSpacing)
        p.col = Math.floor(Math.random() * cols)
        p.row = Math.floor(Math.random() * rows)
        p.life = 50 + Math.random() * 100
        p.alpha = 0
      }

      if (p.alpha < p.targetAlpha) p.alpha += p.speed
      
      const x = p.col * this.gridSpacing
      const y = p.row * this.gridSpacing
      
      const g = ctx.createRadialGradient(x, y, 0, x, y, 15)
      g.addColorStop(0, `rgba(${rgbStr}, ${p.alpha})`)
      g.addColorStop(1, `rgba(${rgbStr}, 0)`)
      
      ctx.fillStyle = g
      ctx.fillRect(x - 15, y - 15, 30, 30)
      
      ctx.fillStyle = `rgba(${rgbStr}, ${p.alpha * 1.5})`
      ctx.fillRect(x - 1, y - 1, 3, 3)
    })

    // 4. Moving Scan Line (Slower & More Glow)
    this.scanY += this.scanSpeed
    if (this.scanY > H + 150) this.scanY = -150

    // Scan line gradient trail
    const scanGrad = ctx.createLinearGradient(0, this.scanY - 150, 0, this.scanY)
    scanGrad.addColorStop(0, `rgba(${rgbStr}, 0)`)
    scanGrad.addColorStop(0.7, `rgba(${rgbStr}, 0.1)`)
    scanGrad.addColorStop(0.95, `rgba(${rgbStr}, 0.4)`)
    scanGrad.addColorStop(1, `rgba(${rgbStr}, 0.6)`)

    ctx.fillStyle = scanGrad
    ctx.fillRect(0, this.scanY - 150, W, 150)

    // Layered main scan line for depth
    ctx.shadowColor = this.color
    ctx.shadowBlur = 20
    ctx.fillStyle = `rgba(${rgbStr}, 1)`
    ctx.fillRect(0, this.scanY, W, 2)
    
    // Core white line for intense glow effect
    ctx.shadowBlur = 5
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
    ctx.fillRect(0, this.scanY, W, 1)
    
    // Pixel glitches
    if (Math.random() > 0.9) {
      const glitchW = Math.random() * 120 + 60
      const glitchX = Math.random() * (W - glitchW)
      ctx.fillStyle = `rgba(${rgbStr}, 0.5)`
      ctx.fillRect(glitchX, this.scanY - 5, glitchW, 1)
      ctx.fillRect(W - glitchX - glitchW, this.scanY + 5, glitchW, 1)
    }
    
    ctx.shadowBlur = 0
  }
}
