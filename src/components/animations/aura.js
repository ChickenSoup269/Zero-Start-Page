/**
 * Aura Effect - Cinematic Fluid Version
 * Creates soft, floating blobs of light that blend smoothly.
 */

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) h = s = 0
  else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

class Blob {
  constructor(width, height, baseHue) {
    this.init(width, height, baseHue)
  }

  init(width, height, baseHue) {
    this.x = Math.random() * width
    this.y = Math.random() * height
    this.baseRadius = Math.random() * 300 + 250 // Tăng kích thước để phủ rộng hơn
    this.radius = this.baseRadius
    
    // Tạo biến thể màu nhẹ nhàng từ màu gốc
    this.hue = (baseHue + (Math.random() - 0.5) * 40 + 360) % 360
    
    // Chuyển động chậm và mượt
    this.vx = (Math.random() - 0.5) * 0.8
    this.vy = (Math.random() - 0.5) * 0.8
    
    this.sinPhase = Math.random() * Math.PI * 2
    this.sinSpeed = 0.005 + Math.random() * 0.01
  }

  update(width, height) {
    this.sinPhase += this.sinSpeed
    
    // Chuyển động lững lờ kết hợp Sin để bớt cứng nhắc
    this.x += this.vx + Math.sin(this.sinPhase) * 0.2
    this.y += this.vy + Math.cos(this.sinPhase) * 0.2
    
    // Thay đổi kích thước nhẹ theo nhịp thở
    this.radius = this.baseRadius + Math.sin(this.sinPhase * 0.5) * 50

    // Xử lý tràn biên mượt mà
    if (this.x < -this.radius) this.x = width + this.radius
    if (this.x > width + this.radius) this.x = -this.radius
    if (this.y < -this.radius) this.y = height + this.radius
    if (this.y > height + this.radius) this.y = -this.radius
  }

  draw(ctx) {
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius
    )
    
    const baseAlpha = 0.4
    gradient.addColorStop(0, `hsla(${this.hue}, 80%, 60%, ${baseAlpha})`)
    gradient.addColorStop(0.5, `hsla(${this.hue}, 70%, 50%, ${baseAlpha * 0.4})`)
    gradient.addColorStop(1, `hsla(${this.hue}, 60%, 40%, 0)`)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

export class AuraEffect {
  constructor(canvasId, color) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.color = color || "#a8c0ff"
    this.blobs = []
    this.active = false
    this.animationFrameId = null

    this.fps = 60 // Tăng lên 60fps cho mượt
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this._resizeHandler = () => this.handleResize()
    window.addEventListener("resize", this._resizeHandler)
    this.init()
  }

  init() {
    this.handleResize()
    this.createBlobs()
  }

  handleResize() {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = this.width
    this.canvas.height = this.height
    // Khởi tạo lại blobs khi resize để chúng phủ đều
    this.createBlobs()
  }

  createBlobs() {
    this.blobs = []
    const hsl = hexToHsl(this.color)
    const count = 8 // Tăng số lượng blob cho dày đặc hơn
    for (let i = 0; i < count; i++) {
      this.blobs.push(new Blob(this.width, this.height, hsl.h))
    }
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this.animationFrameId = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)
    
    // Nền tối mờ để tăng chiều sâu
    ctx.globalCompositeOperation = "source-over"
    ctx.fillStyle = "rgba(1, 2, 10, 0.15)"
    ctx.fillRect(0, 0, this.width, this.height)

    // Chế độ hòa trộn screen giúp Aura lung linh hơn
    ctx.globalCompositeOperation = "screen"

    this.blobs.forEach((blob) => {
      blob.update(this.width, this.height)
      blob.draw(ctx)
    })

    ctx.globalCompositeOperation = "source-over"
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.canvas.style.display = "block"
    this.animate(0)
  }

  stop() {
    this.active = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.ctx.clearRect(0, 0, this.width, this.height)
    this.canvas.style.display = "none"
  }

  updateColor(color) {
    this.color = color
    const hsl = hexToHsl(this.color)
    this.blobs.forEach((blob) => {
      blob.hue = (hsl.h + (Math.random() - 0.5) * 40 + 360) % 360
    })
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
  }
}
