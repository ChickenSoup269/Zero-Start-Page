/**
 * Flashlight (Đèn pin) Effect
 * Creates a dark overlay that is revealed by the mouse cursor
 */

export class FlashlightEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.color = options.color || "#000000"
    this.size = options.size || 150
    this.opacity = options.opacity !== undefined ? options.opacity : 0.9

    this.mouseX = -2000
    this.mouseY = -2000
    this.animationId = null

    this._resizeHandler = () => this._onResize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._touchMoveHandler = (e) => this._onTouchMove(e)
  }

  _onResize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  _onMouseMove(e) {
    this.mouseX = e.clientX
    this.mouseY = e.clientY
  }

  _onTouchMove(e) {
    if (e.touches.length > 0) {
      this.mouseX = e.touches[0].clientX
      this.mouseY = e.touches[0].clientY
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this._rgb = this._hexToRgb(this.color)
    this._onResize()
    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("mousemove", this._mouseMoveHandler)
    window.addEventListener("touchmove", this._touchMoveHandler, { passive: true })
    this.canvas.style.display = "block"
    this._draw()
  }

  stop() {
    this.active = false
    if (this.animationId) cancelAnimationFrame(this.animationId)
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("touchmove", this._touchMoveHandler)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }

  _draw() {
    if (!this.active) return
    this.animationId = requestAnimationFrame(() => this._draw())
    if (document.visibilityState === 'hidden') return

    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    // 1. Clear canvas and fill with dark overlay
    ctx.globalCompositeOperation = "source-over"
    ctx.clearRect(0, 0, W, H)
    
    if (!this._rgb) this._rgb = this._hexToRgb(this.color)
    const rgb = this._rgb
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.opacity})`
    ctx.fillRect(0, 0, W, H)

    // 2. Punch a hole using radial gradient and destination-out
    if (this.mouseX !== -2000) {
      ctx.globalCompositeOperation = "destination-out"
      
      // Tạo dải sáng chính (Main Beam) với lõi sáng hơn (Hot spot)
      const gradient = ctx.createRadialGradient(
        this.mouseX, this.mouseY, 0,
        this.mouseX, this.mouseY, this.size
      )
      
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)")
      gradient.addColorStop(0.1, "rgba(255, 255, 255, 0.95)")
      gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.5)")
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)")
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(this.mouseX, this.mouseY, this.size, 0, Math.PI * 2)
      ctx.fill()

      // 3. Thêm các "vân đèn" (Reflector Rings)
      ctx.globalCompositeOperation = "destination-out"
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)"
      ctx.lineWidth = 1.5

      // Vẽ 3-4 vòng tròn đồng tâm mờ ảo để giả lập vân gương phản xạ
      for (let i = 1; i <= 4; i++) {
        const ringRadius = this.size * (i * 0.22)
        ctx.beginPath()
        ctx.arc(this.mouseX, this.mouseY, ringRadius, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Thêm một vòng mờ rộng hơn ở rìa
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(this.mouseX, this.mouseY, this.size * 0.85, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  setOptions(opts = {}) {
    if (opts.color !== undefined) this.color = opts.color
    if (opts.size !== undefined) this.size = Number(opts.size)
    if (opts.opacity !== undefined) this.opacity = Number(opts.opacity)
  }
}
