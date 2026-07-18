export class NeonGridBackground {
  constructor(canvasId, gridColor = "#ff007f", sunColor = "#ffbe0b") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false

    this.gridColor = gridColor
    this.sunColor = sunColor
    
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

    ctx.clearRect(0, 0, W, H)

    this.drawSun(ctx, W / 2, this.horizonY)

    ctx.save()
    ctx.shadowBlur = 15
    ctx.shadowColor = this.gridColor
    ctx.lineWidth = 2

    const gridY = 150 // height of camera above grid

    // Draw horizontal lines moving forward
    for (let i = 0; i < this.lines.length; i++) {
      this.lines[i] -= this.speed
      if (this.lines[i] < 10) {
        this.lines[i] = this.gridDepth
      }
      
      const z = this.lines[i]
      const alpha = Math.max(0, 1 - (z / this.gridDepth))
      
      const p1 = this.project(-this.gridWidth / 2, gridY, z)
      const p2 = this.project(this.gridWidth / 2, gridY, z)
      
      ctx.globalAlpha = alpha
      ctx.strokeStyle = this.gridColor
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    }

    // Draw vertical lines
    for (let x = -this.gridWidth / 2; x <= this.gridWidth / 2; x += this.spacing * 2) {
      const p1 = this.project(x, gridY, 10)
      const p2 = this.project(x, gridY, this.gridDepth)
      
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

    ctx.restore()
  }

  drawSun(ctx, cx, cy) {
    const radius = Math.min(this.canvas.width, this.canvas.height) * 0.25
    
    ctx.save()
    ctx.shadowBlur = 50
    ctx.shadowColor = this.sunColor
    
    const grad = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius)
    grad.addColorStop(0, this.sunColor)
    grad.addColorStop(1, "#ff007f")
    
    ctx.fillStyle = grad
    
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
    
    // Retro cutouts (destination-out clears the drawn pixels)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.shadowBlur = 0 // remove shadow for cutout
    const numStripes = 8
    for (let i = 0; i < numStripes; i++) {
      const yPos = cy + radius * (i / numStripes)
      const gapHeight = 2 + (i * 2.5) // gap increases towards bottom
      ctx.fillRect(cx - radius, yPos, radius * 2, gapHeight)
    }
    
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
