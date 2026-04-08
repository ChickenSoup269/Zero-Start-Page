export class GridScanEffect {
  constructor(canvasId, color = "#00ffcc") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.scanY = 0

    this.gridSpacing = 60
    this.speed = 3

    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  updateColor(color) {
    this.color = color
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
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

    let r = 0,
      g = 255,
      b = 255
    if (this.color.startsWith("#") && this.color.length === 7) {
      r = parseInt(this.color.substr(1, 2), 16)
      g = parseInt(this.color.substr(3, 2), 16)
      b = parseInt(this.color.substr(5, 2), 16)
    }

    const rgbColor = r + "," + g + "," + b

    const offset = (performance.now() * 0.02) % this.gridSpacing

    ctx.lineWidth = 1

    ctx.beginPath()
    for (let x = offset; x < W; x += this.gridSpacing) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
    }
    for (let y = offset; y < H; y += this.gridSpacing) {
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
    }
    ctx.strokeStyle = "rgba(" + rgbColor + ", 0.15)"
    ctx.stroke()

    this.scanY += this.speed
    if (this.scanY > H + 200) {
      this.scanY = -200
    }

    const gradient = ctx.createLinearGradient(
      0,
      this.scanY - 120,
      0,
      this.scanY,
    )
    gradient.addColorStop(0, "rgba(" + rgbColor + ", 0)")
    gradient.addColorStop(0.5, "rgba(" + rgbColor + ", 0.1)")
    gradient.addColorStop(0.9, "rgba(" + rgbColor + ", 0.4)")
    gradient.addColorStop(1, "rgba(" + rgbColor + ", 0.8)")

    ctx.fillStyle = gradient
    ctx.fillRect(0, this.scanY - 120, W, 120)

    ctx.shadowColor = this.color
    ctx.shadowBlur = 10
    ctx.fillStyle = "rgba(" + rgbColor + ", 1)"
    ctx.fillRect(0, this.scanY, W, 2)
    ctx.shadowBlur = 0
  }
}
