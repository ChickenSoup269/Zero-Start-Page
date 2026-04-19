/**
 * Floating Lines Effect (Enhanced Beauty + High Performance)
 * Uses Path2D batching and shadow caching for neon glow without lag.
 */
export class FloatingLinesEffect {
  constructor(canvasId, color = "#ffffff", angle = 0) {
    this.canvas = typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d", { alpha: false })
    this.active = false
    this.time = 0
    this.color = color
    this.angle = Number(angle) || 0
    this.mouse = { x: -1000, y: -1000 }
    this.targetMouse = { x: -1000, y: -1000 }
    this.mouseInfluence = 0
    this.targetInfluence = 0
    
    this.config = {
      animationSpeed: 1,
      interactive: true,
      bendStrength: -0.4,
      mouseDamping: 0.1,
      step: 80, // Balanced for beauty and speed
      parallaxStrength: 0.04
    }

    this.parallaxOffset = { x: 0, y: 0 }
    this.targetParallax = { x: 0, y: 0 }
    this.hsl = { h: 0, s: 0, l: 100 }
    this._updateHsl(color)

    this._resizeHandler = () => this.resize()
    this._mouseHandler = (e) => {
        this.targetMouse.x = e.clientX
        this.targetMouse.y = e.clientY
        this.targetInfluence = 1.0
        
        const centerX = window.innerWidth / 2
        const centerY = window.innerHeight / 2
        this.targetParallax.x = (e.clientX - centerX) / window.innerWidth * this.config.parallaxStrength
        this.targetParallax.y = (e.clientY - centerY) / window.innerHeight * this.config.parallaxStrength
    }
    
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  _updateHsl(hex) {
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
    this.hsl = { h: h * 360, s: s * 100, l: l * 100 }
  }

  updateColor(hex) { this.color = hex; this._updateHsl(hex); }
  setAngle(deg) { this.angle = Number(deg) || 0 }
  
  resize() {
    if (!this.canvas) return
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._initStars()
  }

  _initStars() {
    this.stars = []
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 1.5,
        opacity: Math.random()
      })
    }
  }

  start() {
    if (this.active) return
    this.active = true
    window.addEventListener("mousemove", this._mouseHandler)
    window.addEventListener("mouseleave", () => { this.targetInfluence = 0 })
    this.canvas.style.display = "block"
    this._animate()
  }

  stop() {
    this.active = false
    window.removeEventListener("mousemove", this._mouseHandler)
    this.canvas.style.display = "none"
  }

  _drawWaveGroup(count, yBase, ampBase, speed, offsetBase, opacity, hueShift = 0) {
    const ctx = this.ctx
    const W = this.canvas.width, H = this.canvas.height
    const time = this.time
    
    const h = (this.hsl.h + hueShift + 360) % 360
    const s = this.hsl.s
    const l = Math.max(this.hsl.l, 60)
    
    const rad = (this.angle * Math.PI) / 180
    const cosR = Math.cos(rad), sinR = Math.sin(rad)
    const range = Math.sqrt(W*W + H*H) * 1.1
    const step = this.config.step
    
    const path = new Path2D()

    for (let i = 0; i < count; i++) {
      const offset = offsetBase + i * 0.2
      let first = true
      for (let x = -range/2; x <= range/2; x += step) {
        const normalizedX = (x / W) * 2
        let y = yBase * H + Math.sin(normalizedX + offset + time * speed) * ampBase * H * 0.1
        y += (i * 15)

        const rx = x * cosR - (y - H/2) * sinR + W/2
        const ry = x * sinR + (y - H/2) * cosR + H/2

        let finalX = rx + this.parallaxOffset.x * W * (1 + hueShift/200)
        let finalY = ry + this.parallaxOffset.y * H * (1 + hueShift/200)

        if (this.mouseInfluence > 0.01) {
          const dx = (this.mouse.x - finalX), dy = (this.mouse.y - finalY)
          const distSq = dx*dx + dy*dy
          if (distSq < 50000) {
            const f = (1 - Math.sqrt(distSq)/223) * this.mouseInfluence * this.config.bendStrength
            finalX += dx * f
            finalY += dy * f
          }
        }
        if (first) { path.moveTo(finalX, finalY); first = false; }
        else { path.lineTo(finalX, finalY); }
      }
    }

    // --- Multi-tier Neon Glow Rendering ---
    ctx.globalAlpha = opacity
    
    // Tier 1: Wide Ambient Bloom
    ctx.shadowBlur = 20
    ctx.shadowColor = `hsla(${h}, ${s}%, ${l}%, 0.9)`
    ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, 0.2)`
    ctx.lineWidth = 8
    ctx.stroke(path)

    // Tier 2: Intense Neon Glow
    ctx.shadowBlur = 8
    ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, 0.8)`
    ctx.lineWidth = 3
    ctx.stroke(path)
    
    // Tier 3: Sharp High-Intensity Core
    ctx.shadowBlur = 0
    ctx.strokeStyle = `white`
    ctx.lineWidth = 1
    ctx.stroke(path)
    
    ctx.globalAlpha = 1
  }

  _animate() {
    if (!this.active) return
    this.time += 0.008
    const ctx = this.ctx
    const W = this.canvas.width, H = this.canvas.height

    this.mouse.x += (this.targetMouse.x - this.mouse.x) * this.config.mouseDamping
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * this.config.mouseDamping
    this.mouseInfluence += (this.targetInfluence - this.mouseInfluence) * this.config.mouseDamping
    this.parallaxOffset.x += (this.targetParallax.x - this.parallaxOffset.x) * this.config.mouseDamping
    this.parallaxOffset.y += (this.targetParallax.y - this.parallaxOffset.y) * this.config.mouseDamping

    // Background: Deep Cosmic Space
    ctx.fillStyle = "#010206"
    ctx.fillRect(0, 0, W, H)

    // Static Nebula Glow (Low cost)
    const h = this.hsl.h
    const grad = ctx.createRadialGradient(W/2 + this.parallaxOffset.x * 100, H/2 + this.parallaxOffset.y * 100, 0, W/2, H/2, W)
    grad.addColorStop(0, `hsla(${h}, 50%, 15%, 0.2)`)
    grad.addColorStop(1, "transparent")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // Stars
    ctx.fillStyle = "white"
    this.stars.forEach(s => {
      ctx.globalAlpha = s.opacity * (0.5 + Math.abs(Math.sin(this.time + s.x)) * 0.5)
      ctx.fillRect(s.x + this.parallaxOffset.x * 50, s.y + this.parallaxOffset.y * 50, s.size, s.size)
    })
    ctx.globalAlpha = 1

    ctx.globalCompositeOperation = "lighter"
    this._drawWaveGroup(3, 0.82, 0.35, 0.04, 1.5, 0.4, -25)
    this._drawWaveGroup(4, 0.5, 0.5, 0.07, 2.0, 0.6, 0)
    this._drawWaveGroup(3, 0.18, 0.35, 0.09, 1.0, 0.4, 25)

    ctx.globalCompositeOperation = "source-over"
    requestAnimationFrame(() => this._animate())
  }
}
