export class CinematicBokehBackground {
  constructor(canvasId, color1 = "#ff9a9e", color2 = "#fecfef") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color1 = color1
    this.color2 = color2
    this.particles = []
    this.numParticles = 50
    this.bokehCache = null
    
    this.resize = this.resize.bind(this)
    window.addEventListener("resize", this.resize)
    
    this.resize()
  }

  updateColor(type, color) {
    if (type === 'color1') this.color1 = color
    if (type === 'color2') this.color2 = color
    this.buildBokehCache()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    if (this.active) {
      this.initParticles()
    }
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

  buildBokehCache() {
    // Cache 5 different bokeh variations (mixes of color1 and color2)
    this.bokehCache = []
    const rgb1 = this.hexToRgb(this.color1)
    const rgb2 = this.hexToRgb(this.color2)
    
    const size = 300 // Large texture for smooth scaling
    const r = size / 2

    for (let i = 0; i <= 4; i++) {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      
      const mix = i / 4 // 0 to 1
      const cr = Math.round(rgb1.r * (1 - mix) + rgb2.r * mix)
      const cg = Math.round(rgb1.g * (1 - mix) + rgb2.g * mix)
      const cb = Math.round(rgb1.b * (1 - mix) + rgb2.b * mix)

      const grad = ctx.createRadialGradient(r, r, 0, r, r, r)
      // A typical bokeh has a slightly brighter edge and a soft center
      grad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, 0.2)`)
      grad.addColorStop(0.7, `rgba(${cr}, ${cg}, ${cb}, 0.4)`)
      grad.addColorStop(0.85, `rgba(${cr}, ${cg}, ${cb}, 0.6)`)
      grad.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`)

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(r, r, r, 0, Math.PI * 2)
      ctx.fill()

      this.bokehCache.push(canvas)
    }
  }

  initParticles() {
    this.particles = []
    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push(this.createParticle(true))
    }
  }

  createParticle(randomY = false) {
    const W = this.canvas.width
    const H = this.canvas.height
    // Depth (z) from 0.1 to 1. Higher z = closer, larger, faster
    const z = Math.random() * 0.9 + 0.1 
    return {
      x: Math.random() * W,
      y: randomY ? Math.random() * H : H + 200,
      radius: (Math.random() * 60 + 40) * z,
      vx: (Math.random() - 0.5) * 0.5 * z,
      vy: -(Math.random() * 1 + 0.5) * z, // float upwards
      opacity: Math.random() * 0.5 + 0.2 * z,
      oscillationSpeed: Math.random() * 0.02,
      oscillationAngle: Math.random() * Math.PI * 2,
      oscillationAmplitude: Math.random() * 1.5,
      cacheIndex: Math.floor(Math.random() * 5)
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this.buildBokehCache()
    this.initParticles()
    this.animate()
  }

  stop() {
    this.active = false
    this.canvas.style.display = "none"
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this.resize)
  }

  animate() {
    if (!this.active) return

    const W = this.canvas.width
    const H = this.canvas.height
    
    // Clear the canvas completely for cinematic transparency
    this.ctx.clearRect(0, 0, W, H)
    
    // Use screen blend mode for glowing overlapping bokeh
    this.ctx.globalCompositeOperation = 'screen'

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      
      // Gentle horizontal floating
      p.oscillationAngle += p.oscillationSpeed
      const dx = Math.sin(p.oscillationAngle) * p.oscillationAmplitude
      
      p.x += p.vx + dx
      p.y += p.vy
      
      // Wrap around or respawn
      if (p.y + p.radius < 0) {
        this.particles[i] = this.createParticle(false)
      }
      
      this.ctx.globalAlpha = p.opacity
      const cache = this.bokehCache[p.cacheIndex]
      this.ctx.drawImage(cache, p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2)
    }
    
    this.ctx.globalAlpha = 1.0

    requestAnimationFrame(() => this.animate())
  }
}
