/**
 * SunbeamEffect (Dynamic White Light Wall Edition)
 * A unified wall of pure white light with autonomous shimmering motion. 
 * Features vertical fading, depth-based blurring, and continuous light dancing.
 */
export class SunbeamEffect {
  constructor(canvasId, color = "#ffffff") {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.color = color
    this.time = 0
    this.sunPos = { x: 0, y: 0 }
    this.angle = 0 

    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  updateColor(hex) {
    this.color = hex
  }

  setAngle(deg) {
    this.angle = deg
  }

  resize() {
    if (!this.canvas) return
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.sunPos.x = this.canvas.width * 0.5
    this.sunPos.y = -this.canvas.height * 0.2
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

  _drawLightWall(baseAngle) {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const diag = Math.sqrt(W * W + H * H)
    const reach = diag * 1.5

    let r=255, g=255, b=255 
    if (this.color && this.color !== "#ffffff" && this.color.startsWith('#')) {
        r = parseInt(this.color.slice(1, 3), 16)
        g = parseInt(this.color.slice(3, 5), 16)
        b = parseInt(this.color.slice(5, 7), 16)
    }

    ctx.save()
    ctx.globalCompositeOperation = "screen"

    // Draw multiple layers of light with autonomous motion
    const layers = 8 // More layers for smoother motion
    for (let i = 0; i < layers; i++) {
        // Each layer moves at a slightly different speed and phase
        const moveOffset = Math.sin(this.time * 0.8 + i * 1.5) * 0.05
        const spread = 0.3 + (i * 0.1) + moveOffset
        
        // Intensity pulses independently
        const pulse = 0.8 + Math.sin(this.time * 1.2 + i) * 0.2
        const opacity = (0.25 / layers) * (1 - i/layers * 0.7) * pulse
        
        const grad = ctx.createRadialGradient(
            this.sunPos.x, this.sunPos.y, 0, 
            this.sunPos.x, this.sunPos.y, reach
        )

        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity})`)
        grad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${opacity * 0.6})`)
        grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${opacity * 0.2})`)
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

        ctx.beginPath()
        ctx.moveTo(this.sunPos.x, this.sunPos.y)
        // Apply individual rotation to each layer for "dancing" light effect
        const layerAngle = baseAngle + Math.sin(this.time * 0.5 + i) * 0.02
        ctx.arc(this.sunPos.x, this.sunPos.y, reach, layerAngle - spread, layerAngle + spread)
        ctx.closePath()
        ctx.fillStyle = grad
        ctx.fill()
    }

    ctx.restore()
  }

  _animate() {
    if (!this.active) return
    this.time += 0.015
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    ctx.clearRect(0, 0, W, H)

    // 1. Deep Ocean Background
    const oceanBg = ctx.createLinearGradient(0, 0, 0, H)
    oceanBg.addColorStop(0, "#010408")
    oceanBg.addColorStop(1, "#000000")
    ctx.fillStyle = oceanBg
    ctx.fillRect(0, 0, W, H)

    // Base angle with very slow autonomous drift
    const drift = Math.sin(this.time * 0.3) * 0.01
    const baseAngle = (Math.PI / 2) + (this.angle * Math.PI / 180) + drift

    // 2. Animated Surface Shimmer (Caustics)
    const surfaceGlow = ctx.createRadialGradient(this.sunPos.x, this.sunPos.y, 0, this.sunPos.x, this.sunPos.y, W)
    const shimmerAlpha = 0.04 + Math.sin(this.time * 2) * 0.02
    surfaceGlow.addColorStop(0, `rgba(255, 255, 255, ${shimmerAlpha})`)
    surfaceGlow.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.fillStyle = surfaceGlow
    ctx.fillRect(0, 0, W, H)
    ctx.restore()

    // 3. Dynamic Light Wall
    this._drawLightWall(baseAngle)

    // 4. Floating Particles (Marine Snow)
    ctx.globalCompositeOperation = "lighter"
    for (let i = 0; i < 60; i++) {
        const x = (Math.sin(i * 123.4 + this.time * 0.08) * 0.5 + 0.5) * W
        const y = (Math.cos(i * 456.7 + this.time * 0.04) * 0.5 + 0.5) * H
        const size = 0.6 + Math.random() * 0.8
        
        const dxS = x - this.sunPos.x
        const dyS = y - this.sunPos.y
        const angleToPoint = Math.atan2(dyS, dxS)
        const distToLight = Math.abs(angleToPoint - baseAngle)
        
        const lightExposure = distToLight < 0.4 ? (1.0 - distToLight / 0.4) : 0.1
        const opacity = 0.05 + lightExposure * 0.4
        
        ctx.globalAlpha = opacity * (0.4 + 0.6 * Math.sin(this.time + i))
        ctx.fillStyle = "#ffffff"
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
    }

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = "source-over"
    requestAnimationFrame(() => this._animate())
  }
}
