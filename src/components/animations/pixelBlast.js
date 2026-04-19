export class PixelBlastEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d", { alpha: true, desynchronized: true })
    this.active = false

    // Props - High performance defaults
    this.pixelSize = 15 // Hardcoded pixel size
    this.variant = options.variant || 'square'
    this.color = options.color || '#B497CF'
    this.patternScale = options.patternScale || 2
    this.patternDensity = options.patternDensity || 1
    this.pixelSizeJitter = options.pixelSizeJitter || 0
    this.enableRipples = options.enableRipples !== undefined ? options.enableRipples : true
    this.rippleSpeed = options.rippleSpeed || 0.3
    this.rippleThickness = options.rippleThickness || 0.1
    this.rippleIntensityScale = options.rippleIntensityScale || 1
    this.liquid = options.liquid !== undefined ? options.liquid : false
    this.liquidStrength = options.liquidStrength || 0.1
    this.liquidRadius = options.liquidRadius || 1
    this.liquidWobbleSpeed = options.liquidWobbleSpeed || 4.5
    this.speed = options.speed || 0.5
    this.edgeFade = options.edgeFade || 0.25
    this.noiseAmount = options.noiseAmount || 0
    this.transparent = options.transparent !== undefined ? options.transparent : true
    this.backgroundColor = options.backgroundColor || '#0a0a0a'

    this.time = 0
    this.ripples = []
    this.mouse = { x: -1000, y: -1000 }
    
    this.handleResize = () => this.resize()
    this.handleMouseMove = (e) => {
      this.mouse.x = e.clientX
      this.mouse.y = e.clientY
    }
    
    this.handleMouseDown = (e) => {
      if (this.enableRipples && this.ripples.length < 3) {
        this.ripples.push({ x: e.clientX, y: e.clientY, radius: 0, opacity: 1 })
      }
    }

    // Pre-render shape to offscreen canvas
    this.shapeCanvas = document.createElement('canvas')
    this.shapeCtx = this.shapeCanvas.getContext('2d')
  }

  setOptions(options) {
    Object.keys(options).forEach(key => {
      if (this[key] !== undefined && key !== 'pixelSize') {
        this[key] = options[key]
      }
    })
    if (this.active && (options.variant || options.color)) {
      this.updateShapeCache()
    }
  }

  resize() {
    if (!this.canvas) return
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.cols = Math.ceil(this.canvas.width / this.pixelSize)
    this.rows = Math.ceil(this.canvas.height / this.pixelSize)
    this.updateShapeCache()
  }

  updateShapeCache() {
    const size = this.pixelSize * 2
    this.shapeCanvas.width = size
    this.shapeCanvas.height = size
    const ctx = this.shapeCtx
    const rgb = this.hexToRgb(this.color)
    ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
    ctx.clearRect(0, 0, size, size)
    
    if (this.variant === 'circle') {
      ctx.beginPath()
      ctx.arc(size/2, size/2, this.pixelSize/2, 0, Math.PI * 2)
      ctx.fill()
    } else if (this.variant === 'triangle') {
      ctx.beginPath()
      ctx.moveTo(size/2, size/2 - this.pixelSize/2)
      ctx.lineTo(size/2 + this.pixelSize/2, size/2 + this.pixelSize/2)
      ctx.lineTo(size/2 - this.pixelSize/2, size/2 + this.pixelSize/2)
      ctx.fill()
    } else {
      ctx.fillRect(size/2 - this.pixelSize/2, size/2 - this.pixelSize/2, this.pixelSize, this.pixelSize)
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this.resize()
    window.addEventListener("resize", this.handleResize)
    window.addEventListener("mousemove", this.handleMouseMove)
    window.addEventListener("mousedown", this.handleMouseDown)
    this.animate()
  }

  stop() {
    this.active = false
    window.removeEventListener("resize", this.handleResize)
    window.removeEventListener("mousemove", this.handleMouseMove)
    window.removeEventListener("mousedown", this.handleMouseDown)
    this.canvas.style.display = "none"
    if (this._animId) cancelAnimationFrame(this._animId)
  }

  animate() {
    if (!this.active) return
    this._animId = requestAnimationFrame(() => this.animate())

    this.time += 0.01 * this.speed
    const ctx = this.ctx
    
    if (this.transparent) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    } else {
      ctx.fillStyle = this.backgroundColor
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }

    this.ripples = this.ripples.filter(r => {
      r.radius += 12 * this.rippleSpeed
      r.opacity -= 0.02
      return r.opacity > 0
    })

    const patternThreshold = 1 - this.patternDensity
    const liquidMaxDist = 150 * this.liquidRadius
    const liquidMaxDistSq = liquidMaxDist * liquidMaxDist

    for (let i = 0; i < this.cols; i++) {
      const xBase = i * this.pixelSize
      for (let j = 0; j < this.rows; j++) {
        const yBase = j * this.pixelSize
        
        let x = xBase, y = yBase, scale = 1

        // Interaction (Only if mouse near or ripple active)
        if (this.liquid || this.ripples.length > 0) {
          const dx = x - this.mouse.x
          const dy = y - this.mouse.y
          const dSq = dx*dx + dy*dy
          
          if (this.liquid && dSq < liquidMaxDistSq) {
            const d = Math.sqrt(dSq) || 1
            const f = (1 - d/liquidMaxDist) * this.liquidStrength
            x += (dx/d) * f * 20
            y += (dy/d) * f * 20
          }

          for(const r of this.ripples) {
            const rdx = x - r.x, rdy = y - r.y
            const rdSq = rdx*rdx + rdy*rdy
            const rd = Math.sqrt(rdSq) || 1
            const rDiff = Math.abs(rd - r.radius)
            if (rDiff < 30) {
              const rf = (1 - rDiff/30) * r.opacity * this.rippleIntensityScale
              scale += rf
              x += (rdx/rd) * rf * 15
              y += (rdy/rd) * rf * 15
            }
          }
        }

        ctx.globalAlpha = 0.9 // Consistent alpha
        ctx.drawImage(this.shapeCanvas, x, y, this.pixelSize * scale, this.pixelSize * scale)
      }
    }
    ctx.globalAlpha = 1
  }

  hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
    return { r, g, b }
  }
}
