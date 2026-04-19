/**
 * Floating Lines Effect (Enhanced Shader-like version)
 * Simulates the complex wavy lines from the provided GLSL shader using 2D Canvas.
 * Features: Multiple waves, mouse bending, parallax, and cosmic background.
 */
export class FloatingLinesEffect {
  constructor(canvasId, color = "#ffffff", angle = 0) {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.time = 0
    this.color = color
    this.angle = Number(angle) || 0 // In degrees
    this.mouse = { x: -1000, y: -1000 }
    this.targetMouse = { x: -1000, y: -1000 }
    this.mouseInfluence = 0
    this.targetInfluence = 0
    
    // Configuration matching the shader parameters
    this.config = {
      animationSpeed: 1,
      interactive: true,
      bendRadius: 0.00005,
      bendStrength: -0.5,
      mouseDamping: 0.05,
      parallax: true,
      parallaxStrength: 0.1,
      topLineCount: 3,      // Reduced further for performance
      middleLineCount: 4,   // Reduced further for performance
      bottomLineCount: 3    // Reduced further for performance
    }

    this.parallaxOffset = { x: 0, y: 0 }
    this.targetParallax = { x: 0, y: 0 }

    this.hsl = { h: 0, s: 0, l: 100 }
    this._updateHsl(color)

    this._resizeHandler = () => this.resize()
    this._mouseHandler = (e) => this._handleMouseMove(e)
    this._mouseLeaveHandler = () => { this.targetInfluence = 0 }
    
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  _updateHsl(hex) {
    if (!hex || !hex.startsWith('#')) {
        this.hsl = { h: 0, s: 0, l: 100 }
        return
    }
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h, s, l = (max + min) / 2
    if (max === min) {
        h = s = 0
    } else {
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

  _handleMouseMove(e) {
    this.targetMouse.x = e.clientX
    this.targetMouse.y = e.clientY
    this.targetInfluence = 1.0

    if (this.config.parallax) {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      this.targetParallax.x = (e.clientX - centerX) / window.innerWidth * this.config.parallaxStrength
      this.targetParallax.y = (e.clientY - centerY) / window.innerHeight * this.config.parallaxStrength
    }
  }

  updateColor(hex) {
    this.color = hex
    this._updateHsl(hex)
  }

  setAngle(deg) {
    this.angle = Number(deg) || 0
  }

  resize() {
    if (!this.canvas) return
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  start() {
    if (this.active) return
    this.active = true
    window.addEventListener("mousemove", this._mouseHandler)
    window.addEventListener("mouseleave", this._mouseLeaveHandler)
    this.canvas.style.display = "block"
    this._animate()
  }

  stop() {
    this.active = false
    window.removeEventListener("mousemove", this._mouseHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    this.canvas.style.display = "none"
  }

  _drawWave(count, distance, yBase, ampBase, speed, offsetBase, opacity, hueShift = 0) {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const time = this.time * this.config.animationSpeed
    
    const h = (this.hsl.h + hueShift + 360) % 360
    const s = this.hsl.s
    const l = Math.max(this.hsl.l, 50) // Ensure visibility
    
    const rad = (this.angle * Math.PI) / 180
    const cosR = Math.cos(rad)
    const sinR = Math.sin(rad)
    const range = Math.sqrt(W*W + H*H) * 1.5
    const step = 45 // Increased from 30 for performance
    
    const strokeColor1 = `hsla(${h}, ${s}%, ${l}%, ${opacity * 0.4})`
    const strokeColor2 = `hsla(${h}, ${s}%, ${l}%, ${opacity * 0.9})`
    const strokeColor3 = `rgba(255, 255, 255, ${opacity * 0.8})`

    const isMainWave = Math.abs(hueShift) < 5

    for (let i = 0; i < count; i++) {
      const offset = offsetBase + i * 0.2
      const xMovement = time * speed
      
      ctx.beginPath()
      let first = true
      
      for (let x = -range/2; x <= range/2; x += step) {
        const normalizedX = (x / W) * 2.0
        const amp = (Math.sin(offset + time * 0.2) * 0.3 + ampBase) * H * 0.1
        let y = yBase * H + Math.sin(normalizedX * 2 + offset + xMovement) * amp
        
        // Add distance between lines in the group
        y += (i * distance)

        // Rotation logic
        const rx = x * cosR - (y - H/2) * sinR + W/2
        const ry = x * sinR + (y - H/2) * cosR + H/2
        
        // Add parallax (different multipliers for depth)
        const px = rx + this.parallaxOffset.x * W * (1.0 + hueShift/200)
        const py = ry + this.parallaxOffset.y * H * (1.0 + hueShift/200)

        let finalX = px
        let finalY = py

        // Mouse bending logic
        if (this.config.interactive && this.mouseInfluence > 0.01) {
          const dx = (this.mouse.x - px) / W
          const dy = (this.mouse.y - py) / H
          const distSq = dx * dx + dy * dy
          
          if (distSq < 0.15) { // Optimization: Only calculate exponential if close enough
            const influence = Math.exp(-distSq * 25.0) * this.mouseInfluence 
            finalX += (this.mouse.x - px) * influence * this.config.bendStrength * 0.5
            finalY += (this.mouse.y - py) * influence * this.config.bendStrength * 0.5
          }
        }

        if (first) {
          ctx.moveTo(finalX, finalY)
          first = false
        } else {
          ctx.lineTo(finalX, finalY)
        }
      }

      ctx.lineCap = "round"

      // Layer 1: Outer Glow
      ctx.lineWidth = isMainWave ? 6 : 4
      ctx.strokeStyle = strokeColor1
      ctx.stroke()

      // Layer 2: Inner Core
      ctx.lineWidth = isMainWave ? 2.5 : 1.8
      ctx.strokeStyle = strokeColor2
      ctx.stroke()
      
      // Layer 3: Ultra Bright Center
      ctx.lineWidth = 0.8
      ctx.strokeStyle = strokeColor3
      ctx.stroke()
    }
  }

  _animate() {
    if (!this.active) return
    this.time += 0.01
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    this.mouse.x += (this.targetMouse.x - this.mouse.x) * this.config.mouseDamping
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * this.config.mouseDamping
    this.mouseInfluence += (this.targetInfluence - this.mouseInfluence) * this.config.mouseDamping
    
    this.parallaxOffset.x += (this.targetParallax.x - this.parallaxOffset.x) * this.config.mouseDamping
    this.parallaxOffset.y += (this.targetParallax.y - this.parallaxOffset.y) * this.config.mouseDamping

    ctx.fillStyle = "#010206"
    ctx.fillRect(0, 0, W, H)

    const centerX = W / 2 + this.parallaxOffset.x * W * 0.2
    const centerY = H / 2 + this.parallaxOffset.y * H * 0.2
    
    // Nebulas match the primary Hue
    const h = this.hsl.h
    const s = Math.min(this.hsl.s, 60)
    
    // Background Glows
    const grad1 = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, W * 0.8)
    grad1.addColorStop(0, `hsla(${(h - 30 + 360) % 360}, ${s}%, 20%, 0.25)`)
    grad1.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = grad1
    ctx.fillRect(0, 0, W, H)

    const grad2 = ctx.createRadialGradient(W - centerX, H - centerY, 0, W - centerX, H - centerY, W * 0.6)
    grad2.addColorStop(0, `hsla(${(h + 30) % 360}, ${s}%, 20%, 0.15)`)
    grad2.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = grad2
    ctx.fillRect(0, 0, W, H)

    // Optimized Stars - Using squares for better performance (hardly noticeable at small sizes)
    ctx.fillStyle = "#ffffff"
    const starCount = 40 // Further reduced for performance
    const starParallaxX = this.parallaxOffset.x * W * 0.1
    const starParallaxY = this.parallaxOffset.y * H * 0.1
    
    for (let i = 0; i < starCount; i++) {
        const x = (Math.sin(i * 123.4) * 0.5 + 0.5) * W
        const y = (Math.cos(i * 456.7) * 0.5 + 0.5) * H
        const size = (Math.sin(i + this.time) * 0.5 + 0.5) * 1.5
        ctx.globalAlpha = 0.2 + Math.abs(Math.sin(this.time * 0.5 + i)) * 0.6
        
        const sx = x + starParallaxX - size / 2
        const sy = y + starParallaxY - size / 2
        ctx.fillRect(sx, sy, size, size)
    }
    ctx.globalAlpha = 1

    ctx.globalCompositeOperation = "lighter"
    
    // Waves with dynamic Hues
    this._drawWave(6, 12, 0.85, 0.3, 0.04, 1.5, 0.4, -30) // Bottom (Shifted)
    this._drawWave(8, 18, 0.5, 0.5, 0.07, 2.0, 0.6, 0)    // Middle (Main Color)
    this._drawWave(6, 12, 0.15, 0.3, 0.1, 1.0, 0.4, 30)   // Top (Shifted)

    ctx.globalCompositeOperation = "source-over"
    requestAnimationFrame(() => this._animate())
  }
}
