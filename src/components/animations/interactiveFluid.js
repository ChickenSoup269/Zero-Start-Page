export class InteractiveFluidBackground {
  constructor(canvasId, color1 = "#00f2fe", color2 = "#4facfe") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d", { alpha: false })
    this.active = false
    this.color1 = color1
    this.color2 = color2
    
    this.particles = []
    this.mouse = { x: -1000, y: -1000, dx: 0, dy: 0 }
    this.lastMouse = { x: -1000, y: -1000 }
    
    this.resize = this.resize.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleTouchMove = this.handleTouchMove.bind(this)
    
    window.addEventListener("resize", this.resize)
    window.addEventListener("mousemove", this.handleMouseMove)
    window.addEventListener("touchmove", this.handleTouchMove, { passive: true })
    
    this.hue = 0
    this.resize()
  }

  updateColor(type, color) {
    if (type === 'color1') this.color1 = color
    if (type === 'color2') this.color2 = color
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  handleMouseMove(e) {
    if (!this.active) return
    this.lastMouse.x = this.mouse.x
    this.lastMouse.y = this.mouse.y
    this.mouse.x = e.clientX
    this.mouse.y = e.clientY
    
    if (this.lastMouse.x === -1000) {
      this.lastMouse.x = this.mouse.x
      this.lastMouse.y = this.mouse.y
    }
    
    this.mouse.dx = this.mouse.x - this.lastMouse.x
    this.mouse.dy = this.mouse.y - this.lastMouse.y
    
    this.spawnParticles()
  }

  handleTouchMove(e) {
    if (!this.active || !e.touches[0]) return
    this.lastMouse.x = this.mouse.x
    this.lastMouse.y = this.mouse.y
    this.mouse.x = e.touches[0].clientX
    this.mouse.y = e.touches[0].clientY
    
    if (this.lastMouse.x === -1000) {
      this.lastMouse.x = this.mouse.x
      this.lastMouse.y = this.mouse.y
    }
    
    this.mouse.dx = this.mouse.x - this.lastMouse.x
    this.mouse.dy = this.mouse.y - this.lastMouse.y
    
    this.spawnParticles()
  }

  hexToRgb(hex) {
    let r = 255, g = 255, b = 255
    if (hex.startsWith('#')) {
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16)
        g = parseInt(hex[2] + hex[2], 16)
        b = parseInt(hex[3] + hex[3], 16)
      } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16)
        g = parseInt(hex.substring(3, 5), 16)
        b = parseInt(hex.substring(5, 7), 16)
      }
    }
    return { r, g, b }
  }

  spawnParticles() {
    const dist = Math.hypot(this.mouse.dx, this.mouse.dy)
    const count = Math.min(dist * 0.2, 20) // lower count for better performance & less glaring
    
    const rgb1 = this.hexToRgb(this.color1)
    const rgb2 = this.hexToRgb(this.color2)
    
    for (let i = 0; i < count; i++) {
      const t = i / count
      const px = this.lastMouse.x + this.mouse.dx * t
      const py = this.lastMouse.y + this.mouse.dy * t
      
      const mix = Math.random()
      const r = Math.round(rgb1.r * mix + rgb2.r * (1 - mix))
      const g = Math.round(rgb1.g * mix + rgb2.g * (1 - mix))
      const b = Math.round(rgb1.b * mix + rgb2.b * (1 - mix))
      
      this.particles.push({
        x: px + (Math.random() - 0.5) * 15,
        y: py + (Math.random() - 0.5) * 15,
        vx: this.mouse.dx * 0.03 + (Math.random() - 0.5) * 1.5,
        vy: this.mouse.dy * 0.03 + (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 30 + 15, // slightly larger, softer
        life: 1,
        decay: Math.random() * 0.01 + 0.01,
        color: `rgb(${r}, ${g}, ${b})`,
        angle: Math.random() * Math.PI * 2
      })
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this.mouse = { x: -1000, y: -1000, dx: 0, dy: 0 }
    this.lastMouse = { x: -1000, y: -1000 }
    this.particles = []
    this.animate()
  }

  stop() {
    this.active = false
    this.canvas.style.display = "none"
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this.resize)
    window.removeEventListener("mousemove", this.handleMouseMove)
    window.removeEventListener("touchmove", this.handleTouchMove)
  }

  animate() {
    if (!this.active) return

    const W = this.canvas.width
    const H = this.canvas.height
    
    this.ctx.globalCompositeOperation = 'source-over'
    // A slightly darker, less opaque trail clear for a smoother motion blur without whiteouts
    this.ctx.fillStyle = "rgba(10, 10, 15, 0.2)"
    this.ctx.fillRect(0, 0, W, H)

    // Using 'screen' instead of 'lighter' avoids glaring whiteouts while still blending beautifully
    this.ctx.globalCompositeOperation = 'screen'
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      
      p.angle += 0.05
      p.vx += Math.cos(p.angle) * 0.15
      p.vy += Math.sin(p.angle) * 0.15
      
      p.vx *= 0.96
      p.vy *= 0.96
      
      p.x += p.vx
      p.y += p.vy
      
      p.radius += 0.3
      p.life -= p.decay
      
      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }
      
      const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius)
      
      const colorStr = p.color.replace('rgb(', '').replace(')', '')
      // Lower max opacity to 0.3 for a softer, smoke-like appearance
      grad.addColorStop(0, `rgba(${colorStr}, ${p.life * 0.3})`)
      grad.addColorStop(1, `rgba(${colorStr}, 0)`)
      
      this.ctx.fillStyle = grad
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    if (this.particles.length < 30 && Math.random() < 0.05) {
      const px = W / 2 + Math.cos(Date.now() * 0.001) * 300
      const py = H / 2 + Math.sin(Date.now() * 0.0013) * 200
      
      const rgb1 = this.hexToRgb(this.color1)
      this.particles.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: Math.random() * 40 + 30,
        life: 0.8,
        decay: 0.015,
        color: `rgb(${rgb1.r}, ${rgb1.g}, ${rgb1.b})`,
        angle: Math.random() * Math.PI * 2
      })
    }

    requestAnimationFrame(() => this.animate())
  }
}
