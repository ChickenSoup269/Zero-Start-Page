/**
 * SunbeamEffect (Pro Light Ray - Spreading Edition)
 * A stunning god-ray effect with sharp cores and soft volumetric falloff.
 * Originate from the center and slowly spread out.
 */
export class SunbeamEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    
    // Handle both cases: options as string (old) or object (new)
    if (typeof options === 'string') {
      this.color = options
      this.angle = 0
    } else {
      this.color = options.color || "#ffffff"
      this.angle = options.angle || 0
    }

    this.time = 0
    this.rays = []
    
    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
    this._initRays()
  }

  _initRays() {
    this.rays = []
    const count = 8 
    for (let i = 0; i < count; i++) {
      this.rays.push({
        id: i,
        width: 150 + Math.random() * 250,
        spreadOffset: (i / (count - 1) - 0.5) * 1.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.002 + Math.random() * 0.004,
        maxOpacity: 0.12 + Math.random() * 0.18,
      })
    }
  }

  resize() {
    if (!this.canvas) return
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  updateColor(color) {
    this.color = color
  }

  setAngle(deg) {
    this.angle = deg
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this._animate()
  }

  stop() {
    this.active = false
    if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  _hexToRgb(hex) {
    if (typeof hex !== 'string') return { r: 255, g: 255, b: 255 }
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 }
  }

  _animate() {
    if (!this.active) return
    this.time += 0.008
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    ctx.clearRect(0, 0, W, H)

    ctx.save()
    ctx.globalCompositeOperation = "screen"

    const rgb = this._hexToRgb(this.color)
    const baseColor = (a) => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`

    const sourceX = W / 2
    const sourceY = -H * 0.15

    const spreadFactor = 0.8 + Math.sin(this.time * 0.5) * 0.4 
    const globalSweep = Math.sin(this.time * 0.3) * 0.05

    this.rays.forEach(ray => {
        const breathing = Math.sin(this.time + ray.phase)
        const currentAngle = (this.angle * Math.PI / 180) + 
                           (ray.spreadOffset * spreadFactor) + 
                           globalSweep + (breathing * 0.01)
        
        const rayLen = H * 1.6
        const endX = sourceX + Math.sin(currentAngle) * rayLen
        const endY = sourceY + Math.cos(currentAngle) * rayLen

        const alpha = ray.maxOpacity * (0.7 + 0.3 * breathing)
        
        // 1. Volumetric Outer Glow
        const gradOuter = ctx.createLinearGradient(sourceX, sourceY, endX, endY)
        gradOuter.addColorStop(0, baseColor(0))
        gradOuter.addColorStop(0.2, baseColor(alpha * 0.5))
        gradOuter.addColorStop(1, baseColor(0))

        ctx.fillStyle = gradOuter
        this._drawRayPath(ctx, sourceX, sourceY, endX, endY, ray.width || 300)
        ctx.fill()

        // 2. Sharp Inner Core
        const gradCore = ctx.createLinearGradient(sourceX, sourceY, endX, endY)
        gradCore.addColorStop(0, baseColor(0))
        gradCore.addColorStop(0.15, baseColor(alpha))
        gradCore.addColorStop(0.5, baseColor(alpha * 0.2))
        gradCore.addColorStop(1, baseColor(0))

        ctx.fillStyle = gradCore
        this._drawRayPath(ctx, sourceX, sourceY, endX, endY, (ray.width || 300) * 0.2)
        ctx.fill()
    })

    // Atmospheric Light Dust
    for (let i = 0; i < 15; i++) {
        const x = (Math.sin(i * 123 + this.time * 0.05) * 0.5 + 0.5) * W
        const y = ((i * 456 + this.time * 15) % H)
        const size = 1 + Math.random() * 1.2
        const pAlpha = 0.04 * (1 - y/H)
        ctx.fillStyle = baseColor(pAlpha)
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
    }

    // Concentrated Source Glow
    const bloom = ctx.createRadialGradient(sourceX, 0, 0, sourceX, 0, W * 0.3)
    bloom.addColorStop(0, baseColor(0.15))
    bloom.addColorStop(1, baseColor(0))
    ctx.fillStyle = bloom
    ctx.fillRect(0, 0, W, H * 0.6)

    ctx.restore()
    requestAnimationFrame(() => this._animate())
  }

  _drawRayPath(ctx, x1, y1, x2, y2, width) {
    ctx.beginPath()
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const perp = angle + Math.PI / 2
    
    const wTop = 4
    const wBottom = width

    ctx.moveTo(x1 - Math.cos(perp) * wTop, y1 - Math.sin(perp) * wTop)
    ctx.lineTo(x1 + Math.cos(perp) * wTop, y1 + Math.sin(perp) * wTop)
    ctx.lineTo(x2 + Math.cos(perp) * wBottom, y2 + Math.sin(perp) * wBottom)
    ctx.lineTo(x2 - Math.cos(perp) * wBottom, y2 - Math.sin(perp) * wBottom)
    ctx.closePath()
  }
}
