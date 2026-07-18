export class BlackHoleBackground {
  constructor(canvasId, accretionColor = "#ff5500", starColor = "#ffffff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d", { alpha: false })
    this.active = false
    this.accretionColor = accretionColor
    this.starColor = starColor
    
    this.stars = []
    this.numStars = 800
    this.holeRadius = 60
    
    this.resize = this.resize.bind(this)
    window.addEventListener("resize", this.resize)
    this.resize()
  }

  initStars() {
    this.stars = []
    const maxRadius = Math.max(window.innerWidth, window.innerHeight)
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push(this.createStar(Math.random() * maxRadius + this.holeRadius))
    }
  }

  createStar(radius) {
    return {
      angle: Math.random() * Math.PI * 2,
      radius: radius,
      speed: Math.random() * 2 + 1,
      size: Math.random() * 1.5 + 0.5,
      history: [] // stores previous positions for trails
    }
  }

  updateColor(type, color) {
    if (type === 'accretion') this.accretionColor = color
    if (type === 'star') this.starColor = color
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initStars()
  }

  start() {
    if (this.active) return
    this.active = true
    this.animate()
  }

  stop() {
    this.active = false
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this.resize)
    const ctx = this.canvas.getContext("2d")
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
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

  hexToHsl(hex) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16)
      g = parseInt(hex[2] + hex[2], 16)
      b = parseInt(hex[3] + hex[3], 16)
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16)
      g = parseInt(hex.substring(3, 5), 16)
      b = parseInt(hex.substring(5, 7), 16)
    }
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch(max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  buildDiskCache() {
    const size = this.holeRadius * 12
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const cx = size / 2
    const cy = size / 2

    const hsl = this.hexToHsl(this.accretionColor)
    
    // Draw accretion disk (glowing ring) with M3-like analogous gradient
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, 0.3) // Flatten to look like a disk

    // We can use a conic gradient to make it look like a swirling disk of multi-colors
    // Fallback to radial if createConicGradient is not available, but modern browsers have it
    let diskGrad
    if (ctx.createConicGradient) {
      diskGrad = ctx.createConicGradient(0, 0, 0)
      diskGrad.addColorStop(0, `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.9)`)
      diskGrad.addColorStop(0.33, `hsla(${hsl.h + 30}, ${hsl.s}%, ${hsl.l}%, 0.7)`)
      diskGrad.addColorStop(0.66, `hsla(${hsl.h - 30}, ${hsl.s}%, ${hsl.l}%, 0.7)`)
      diskGrad.addColorStop(1, `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.9)`)
    } else {
      diskGrad = `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.9)`
    }

    // Mask the inner and outer parts with a radial gradient
    ctx.fillStyle = diskGrad
    ctx.beginPath()
    ctx.arc(0, 0, this.holeRadius * 4, 0, Math.PI * 2)
    ctx.fill()
    
    // Use destination-in to make the disk fade out at edges and hollow at center
    ctx.globalCompositeOperation = 'destination-in'
    const maskGrad = ctx.createRadialGradient(0, 0, this.holeRadius, 0, 0, this.holeRadius * 4)
    maskGrad.addColorStop(0, 'rgba(0,0,0,0)')
    maskGrad.addColorStop(0.2, 'rgba(0,0,0,1)')
    maskGrad.addColorStop(0.5, 'rgba(0,0,0,0.5)')
    maskGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = maskGrad
    ctx.beginPath()
    ctx.arc(0, 0, this.holeRadius * 4, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()

    // Draw black hole center
    ctx.save()
    ctx.translate(cx, cy)
    ctx.fillStyle = "#000000"
    ctx.shadowBlur = 30
    ctx.shadowColor = this.accretionColor
    ctx.beginPath()
    ctx.arc(0, 0, this.holeRadius, 0, Math.PI * 2)
    ctx.fill()
    
    // Add event horizon glow inner edge
    ctx.strokeStyle = `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.8)`
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()

    this.diskCache = {
      canvas,
      color: this.accretionColor
    }
  }

  animate() {
    if (!this.active) return

    const W = this.canvas.width
    const H = this.canvas.height
    const cx = W / 2
    const cy = H / 2

    // Dark space background with slight fade for motion blur effect
    this.ctx.fillStyle = "rgba(5, 5, 10, 0.3)"
    this.ctx.fillRect(0, 0, W, H)

    const starRgb = this.hexToRgb(this.starColor)
    const maxRadius = Math.max(W, H)
    
    // Draw stars
    this.ctx.lineWidth = 0.8 // Thinner trails
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i]
      
      const x = cx + Math.cos(star.angle) * star.radius
      const y = cy + Math.sin(star.angle) * star.radius
      
      star.history.push({x, y})
      if (star.history.length > 20) { // Longer trails
        star.history.shift()
      }

      const distanceFactor = Math.max(0.1, star.radius / this.holeRadius)
      star.angle += (0.02 * star.speed) / (distanceFactor * 0.5)
      star.radius -= (1.5 * star.speed) / distanceFactor

      if (star.history.length > 1) {
        this.ctx.beginPath()
        this.ctx.moveTo(star.history[0].x, star.history[0].y)
        for (let j = 1; j < star.history.length; j++) {
          this.ctx.lineTo(star.history[j].x, star.history[j].y)
        }
        
        const intensity = Math.min(1, this.holeRadius * 3 / Math.max(1, star.radius))
        this.ctx.strokeStyle = `rgba(${starRgb.r}, ${starRgb.g}, ${starRgb.b}, ${0.1 + intensity * 0.9})`
        this.ctx.stroke()
      }

      if (star.radius <= this.holeRadius * 0.5) {
        this.stars[i] = this.createStar(maxRadius + Math.random() * 200)
      }
    }

    if (!this.diskCache || this.diskCache.color !== this.accretionColor) {
      this.buildDiskCache()
    }

    // Draw cached accretion disk + hole
    const cacheSize = this.diskCache.canvas.width
    this.ctx.drawImage(this.diskCache.canvas, cx - cacheSize / 2, cy - cacheSize / 2)

    requestAnimationFrame(() => this.animate())
  }
}
