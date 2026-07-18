export class NeonGridBackground {
  constructor(canvasId, gridColor = "#ff007f", sunColor = "#ffbe0b", fullScreen = false) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false

    this.gridColor = gridColor
    this.sunColor = sunColor
    this.fullScreen = fullScreen
    
    this.speed = 3
    this.fov = 300
    this.lines = []
    
    this.spacing = 60
    this.gridWidth = 4000
    this.gridDepth = 2000
    
    this.horizonY = 0 
    
    this.resize()
    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    
    this.initLines()
  }

  updateColor(type, color) {
    if (type === 'grid') this.gridColor = color
    if (type === 'sun') this.sunColor = color
  }

  setOptions(options) {
    if (options.fullScreen !== undefined) {
      this.fullScreen = options.fullScreen
    }
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.horizonY = this.canvas.height * 0.45
  }

  initLines() {
    this.lines = []
    for (let z = 10; z < this.gridDepth; z += this.spacing) {
      this.lines.push(z)
    }
  }

  project(x, y, z) {
    const scale = this.fov / (this.fov + z)
    const x2d = (x * scale) + (this.canvas.width / 2)
    const y2d = (y * scale) + this.horizonY
    return { x: x2d, y: y2d, scale }
  }

  animate() {
    if (!this.active) return
    this.animationFrame = requestAnimationFrame(() => this.animate())
    if (document.visibilityState === "hidden") return

    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    if (this.fullScreen) {
      // Draw a dark synthwave sky gradient to hide the transparent body
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H)
      skyGrad.addColorStop(0, "#050014") // deep space blue
      skyGrad.addColorStop(0.5, "#1c0030") // purple horizon
      skyGrad.addColorStop(1, "#050014")
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, W, H)
    } else {
      ctx.clearRect(0, 0, W, H)
    }

    this.drawSun(ctx, W / 2, this.horizonY)

    ctx.save()
    ctx.shadowBlur = 15
    ctx.shadowColor = this.gridColor
    ctx.lineWidth = 2

    // Draw Grids (Bottom and optionally Top)
    const gridYs = this.fullScreen ? [150, -150] : [150]

    gridYs.forEach(gy => {
      // Draw horizontal lines moving forward
      for (let i = 0; i < this.lines.length; i++) {
        // we only update line position once per frame, not per grid
        // so we don't decrement this.lines[i] here if there are multiple grids, 
        // wait, we need to update it BEFORE drawing grids
        
        const z = this.lines[i]
        const alpha = Math.max(0, 1 - (z / this.gridDepth))
        
        const p1 = this.project(-this.gridWidth / 2, gy, z)
        const p2 = this.project(this.gridWidth / 2, gy, z)
        
        ctx.globalAlpha = alpha
        ctx.strokeStyle = this.gridColor
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }

      // Draw vertical lines
      for (let x = -this.gridWidth / 2; x <= this.gridWidth / 2; x += this.spacing * 2) {
        const p1 = this.project(x, gy, 10)
        const p2 = this.project(x, gy, this.gridDepth)
        
        const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y)
        grad.addColorStop(0, this.gridColor)
        grad.addColorStop(1, "rgba(0,0,0,0)")
        
        ctx.globalAlpha = 1
        ctx.strokeStyle = grad
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }
    })

    // Advance lines for next frame
    for (let i = 0; i < this.lines.length; i++) {
      this.lines[i] -= this.speed
      if (this.lines[i] < 10) {
        this.lines[i] = this.gridDepth
      }
    }

    ctx.restore()
  }

  drawSun(ctx, cx, cy) {
    const radius = Math.min(this.canvas.width, this.canvas.height) * 0.25
    
    // Instead of drawing the whole sun and erasing (which erases the sky behind it),
    // we draw the sun in horizontal slices.
    
    ctx.save()
    ctx.shadowBlur = 50
    ctx.shadowColor = this.sunColor
    
    const grad = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius)
    grad.addColorStop(0, this.sunColor)
    grad.addColorStop(1, this.gridColor) // Use gridColor instead of hardcoded pink
    
    ctx.fillStyle = grad
    ctx.beginPath()

    // Top half of the sun (solid)
    ctx.arc(cx, cy, radius, Math.PI, 0)
    
    // Bottom half of the sun (with cutouts)
    // We draw discrete horizontal slices
    const numStripes = 8
    for (let i = 0; i < numStripes; i++) {
      const yStart = cy + radius * (i / numStripes)
      
      // Calculate stripe height. We need to leave a gap between stripes.
      const gapHeight = 2 + (i * 2.5) 
      const nextY = cy + radius * ((i + 1) / numStripes)
      const stripeHeight = (nextY - yStart) - gapHeight
      
      if (stripeHeight <= 0) continue

      // For a circle: x^2 + y^2 = r^2
      // We calculate the width of the circle at yStart
      const dy = yStart - cy
      if (dy >= radius) continue
      const xOffset = Math.sqrt(radius * radius - dy * dy)
      
      ctx.rect(cx - xOffset, yStart, xOffset * 2, stripeHeight)
    }
    
    ctx.fill()
    ctx.restore()
  }

  start() {
    if (this.active) return
    this.active = true
    if (this.lines.length === 0) this.initLines()
    this.animate()
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
    this.lines = []
  }
}
