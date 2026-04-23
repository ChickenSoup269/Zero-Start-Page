/**
 * Floating Lines Effect - Smooth Cinematic Edition
 * Features tri-color neon, ultra-bright lines, and silky smooth drifting stars.
 * Optimized with Delta Time for high-refresh rate displays.
 */

export class FloatingLinesEffect {
  constructor(canvasId, color = "#ffffff", angle = 0) {
    this.canvas = typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d", { alpha: false })
    this.active = false
    this.time = 0
    this.lastDrawTime = 0
    this.color = color
    this.angle = Number(angle) || 0
    
    this.config = {
      animationSpeed: 1,
      step: 40, 
      starCount: 80,
      driftSpeed: 0.15
    }

    this.hsl = { h: 0, s: 0, l: 100 }
    this._updateHsl(color)

    this._resizeHandler = () => this.resize()
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
    this.hsl = { h: h * 360, s: 95, l: 75 }
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
    const W = this.canvas.width
    const H = this.canvas.height
    this.stars = []
    for (let i = 0; i < this.config.starCount; i++) {
      this.stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * this.config.driftSpeed,
        vy: (Math.random() - 0.5) * this.config.driftSpeed,
        size: Math.random() * 1.6 + 0.4,
        opacity: Math.random() * 0.6 + 0.4,
        twinkleSpeed: 0.02 + Math.random() * 0.03,
        twinklePhase: Math.random() * Math.PI * 2,
        color: `hsla(${this.hsl.h + (Math.random()-0.5)*30}, 80%, 95%, 1)`
      })
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.canvas.style.display = "block"
    this._animate(this.lastDrawTime)
  }

  stop() {
    this.active = false
    if (this._animId) cancelAnimationFrame(this._animId)
    this.canvas.style.display = "none"
  }

  _drawWaveGroup(count, yBase, ampBase, speed, offsetBase, opacity, hueOffset = 0, dt = 1) {
    const ctx = this.ctx
    const W = this.canvas.width, H = this.canvas.height
    const time = this.time
    
    const h = (this.hsl.h + hueOffset + 360) % 360
    const s = this.hsl.s
    const l = this.hsl.l
    
    const rad = (this.angle * Math.PI) / 180
    const cosR = Math.cos(rad), sinR = Math.sin(rad)
    const range = Math.sqrt(W*W + H*H) * 1.2
    const step = this.config.step
    
    const path = new Path2D()

    for (let i = 0; i < count; i++) {
      const offset = offsetBase + i * 0.4
      let first = true
      
      for (let x = -range/2; x <= range/2; x += step) {
        const normalizedX = (x / W) * 2
        let y = yBase * H + Math.sin(normalizedX * 1.2 + offset + time * speed) * ampBase * H * 0.1
        y += Math.sin(normalizedX * 2.8 - time * speed * 0.5) * ampBase * H * 0.03
        y += (i * 24)

        const rx = x * cosR - (y - H/2) * sinR + W/2
        const ry = x * sinR + (y - H/2) * cosR + H/2

        if (first) { path.moveTo(rx, ry); first = false; }
        else { path.lineTo(rx, ry); }
      }
    }

    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    // Ultra Bright Rendering
    ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${opacity * 0.15})`
    ctx.lineWidth = 22
    ctx.stroke(path)

    ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${opacity * 0.45})`
    ctx.lineWidth = 8
    ctx.stroke(path)

    ctx.strokeStyle = `hsla(${h}, ${s}%, 95%, ${opacity * 0.85})`
    ctx.lineWidth = 3
    ctx.stroke(path)

    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.98})`
    ctx.lineWidth = 1.2
    ctx.stroke(path)
  }

  _animate(currentTime = 0) {
    if (!this.active) return
    this._animId = requestAnimationFrame((t) => this._animate(t))
    
    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < 1) return 
    const dt = elapsed / 16.67 // Normalize to 60fps
    this.lastDrawTime = currentTime
    
    this.time += 0.008 * dt
    const ctx = this.ctx
    const W = this.canvas.width, H = this.canvas.height

    // Solid deep background
    ctx.fillStyle = "#010205"
    ctx.fillRect(0, 0, W, H)

    // Drifting & Twinkling Stars
    ctx.fillStyle = "white"
    this.stars.forEach(s => {
      // Smooth movement
      s.x += s.vx * dt
      s.y += s.vy * dt
      
      // Wrapping logic
      if (s.x < 0) s.x = W
      if (s.x > W) s.x = 0
      if (s.y < 0) s.y = H
      if (s.y > H) s.y = 0

      // Smooth twinkling
      s.twinklePhase += s.twinkleSpeed * dt
      const op = s.opacity * (0.3 + Math.sin(s.twinklePhase) * 0.7)
      
      ctx.globalAlpha = Math.max(0, Math.min(1, op))
      ctx.fillStyle = s.color
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1

    ctx.globalCompositeOperation = "lighter"
    
    // Group 1: Hue - 30
    this._drawWaveGroup(3, 0.8, 0.4, 0.05, 1.5, 0.5, -30, dt)
    
    // Group 2: Base Hue
    this._drawWaveGroup(3, 0.5, 0.6, 0.07, 2.0, 0.7, 0, dt)
    
    // Group 3: Hue + 30
    this._drawWaveGroup(3, 0.2, 0.4, 0.09, 1.0, 0.5, 30, dt)

    ctx.globalCompositeOperation = "source-over"
  }
}
