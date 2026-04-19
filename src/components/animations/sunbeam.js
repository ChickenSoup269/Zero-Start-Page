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
    const count = 12 // More rays for better layering
    for (let i = 0; i < count; i++) {
      // Structure: 0 is center, then 1L, 2R, 3L, 4R...
      const level = Math.floor(i / 2)
      const side = i % 2 === 0 ? 1 : -1
      const offsetFactor = i === 0 ? 0 : side * level

      this.rays.push({
        id: i,
        // Large base width for a powerful look
        width: 400 + Math.random() * 300,
        // Balanced spread for a massive pillar
        spreadOffset: offsetFactor * 0.08, 
        phase: Math.random() * Math.PI * 2,
        speed: 0.001 + Math.random() * 0.003,
        // Intensity drops for outer layers
        maxOpacity: i === 0 ? 0.35 : 0.25 / (1 + level * 0.6),
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
    this.time += 0.006
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    ctx.clearRect(0, 0, W, H)

    ctx.save()
    ctx.globalCompositeOperation = "screen"

    const rgb = this._hexToRgb(this.color)
    const baseColor = (a) => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`

    const sourceX = W / 2
    const sourceY = -H * 0.5 // Higher source for massive pillar feel

    const pillarSwing = Math.sin(this.time * 0.3) * 0.02

    this.rays.forEach((ray, i) => {
        const breathing = Math.sin(this.time + ray.phase)
        const currentAngle = (this.angle * Math.PI / 180) + 
                           ray.spreadOffset + 
                           pillarSwing + (breathing * 0.005)
        
        const rayLen = H * 2.8
        const endX = sourceX + Math.sin(currentAngle) * rayLen
        const endY = sourceY + Math.cos(currentAngle) * rayLen

        const alpha = ray.maxOpacity * (0.85 + 0.15 * breathing)
        
        // Vertical Gradient: Brightest top-center, fading out naturally
        const gradOuter = ctx.createLinearGradient(sourceX, 0, sourceX, H)
        gradOuter.addColorStop(0, baseColor(alpha * 0.5))
        gradOuter.addColorStop(0.5, baseColor(alpha * 0.2))
        gradOuter.addColorStop(1, baseColor(0))

        ctx.fillStyle = gradOuter
        const rayWidth = (ray.width || 500) * (1 + Math.abs(ray.spreadOffset) * 2.5)
        this._drawRayPath(ctx, sourceX, sourceY, endX, endY, rayWidth)
        ctx.fill()

        // Inner core for the central rays (increased core count for width)
        if (i < 4) {
            const gradCore = ctx.createLinearGradient(sourceX, 0, sourceX, H)
            gradCore.addColorStop(0, baseColor(alpha))
            gradCore.addColorStop(0.4, baseColor(alpha * 0.4))
            gradCore.addColorStop(0.8, baseColor(0))

            ctx.fillStyle = gradCore
            this._drawRayPath(ctx, sourceX, sourceY, endX, endY, rayWidth * 0.35)
            ctx.fill()
        }
    })

    // Atmospheric Motes (Widely distributed around the large pillar)
    for (let i = 0; i < 40; i++) {
        const x = (W / 2) + (Math.sin(i * 123 + this.time * 0.1) * W * 0.35)
        const y = ((i * 456 + this.time * 15) % H)
        const size = 0.5 + Math.random() * 2.0
        const pAlpha = (0.12 * (1 - y/H)) * (0.5 + 0.5 * Math.sin(this.time + i))
        
        ctx.fillStyle = baseColor(pAlpha)
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
    }

    // Top Source Glow (Large horizontal soft bloom)
    const bloom = ctx.createLinearGradient(0, 0, 0, H * 0.7)
    bloom.addColorStop(0, baseColor(0.25))
    bloom.addColorStop(1, baseColor(0))
    ctx.fillStyle = bloom
    ctx.fillRect(0, 0, W, H * 0.7)

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
