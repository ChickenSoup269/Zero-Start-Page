import { hexToRgb } from "../../utils/colors.js"

/**
 * GridScanEffect - Reborn as "3D Volume Scanner"
 * A pure 3D scanning effect with floating corner particles and a depth-scanning wave.
 * No grids, no axes, just pure digital scanning aesthetics.
 */
export class GridScanEffect {
  constructor(canvasId, color = "#00ffcc") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.time = 0
    this.particles = []
    this.scanZ = 2000
    
    // Initialize random 3D corner particles
    this.initParticles()

    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  initParticles() {
    this.particles = []
    for (let i = 0; i < 80; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 3000,
        y: (Math.random() - 0.5) * 2000,
        z: Math.random() * 2000,
        size: 15 + Math.random() * 25,
        rot: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5
      })
    }
  }

  updateColor(color) {
    this.color = color
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  start() {
    if (this.active) return
    this.active = true
    this.animate()
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    if (this._animId) cancelAnimationFrame(this._animId)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  drawCorner(ctx, x, y, size, angle, opacity, rgbStr) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.strokeStyle = `rgba(${rgbStr}, ${opacity})`
    ctx.lineWidth = 1.5
    
    ctx.beginPath()
    ctx.moveTo(size, 0)
    ctx.lineTo(0, 0)
    ctx.lineTo(0, size)
    ctx.stroke()
    ctx.restore()
  }

  animate() {
    if (!this.active) return
    this._animId = requestAnimationFrame(() => this.animate())
    this.time += 0.01

    const W = this.canvas.width
    const H = this.canvas.height
    const ctx = this.ctx
    ctx.clearRect(0, 0, W, H)

    const rgb = hexToRgb(this.color)
    const rgbStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`
    
    const focalLength = 800
    const centerX = W / 2
    const centerY = H / 2

    // Move the scanning wave train
    this.scanZ -= 4
    if (this.scanZ < -1500) this.scanZ = 2500 // Adjusted for longer train

    const waveOffsets = [0, 400, 800, 1200, 1600, 2000] // Total 6 frames

    // Sort particles
    this.particles.sort((a, b) => b.z - a.z)

    this.particles.forEach(p => {
      p.z -= p.speed
      if (p.z < -1000) {
          p.z = 2500
          p.x = (Math.random() - 0.5) * 4500
          p.y = (Math.random() - 0.5) * 3500
      }

      const scale = focalLength / (focalLength + p.z)
      const x2d = centerX + p.x * scale
      const y2d = centerY + p.y * scale
      const size2d = p.size * scale

      // Highlight logic: Is a wave passing through this particle?
      let highlight = 0
      waveOffsets.forEach(offset => {
          let wZ = this.scanZ + offset
          if (wZ > 2500) wZ -= 4000 // Wrap logic for 6 frames
          const dist = Math.abs(p.z - wZ)
          if (dist < 150) {
              highlight = Math.max(highlight, 1 - dist / 150)
          }
      })

      // Base opacity + highlight boost
      let opacity = (0.15 + highlight * 0.6) * (1 - p.z / 2500)
      if (p.z < 0) opacity *= (1 + p.z / 1000)
      
      if (opacity > 0.01 && p.z > -focalLength + 50) {
        this.drawCorner(ctx, x2d, y2d, size2d * (1 + highlight * 0.3), p.rot, opacity, rgbStr)
      }
    })

    // Render Wave Frames (6 frames)
    waveOffsets.forEach((offset, index) => {
        let wZ = this.scanZ + offset
        if (wZ > 2500) wZ -= 4000
        if (wZ < -1000) return

        const waveScale = focalLength / (focalLength + wZ)
        const isMain = index === 0
        const sw = W * 1.3 * waveScale
        const sh = H * 1.3 * waveScale
        const sx = centerX - sw / 2
        const sy = centerY - sh / 2
        
        let waveAlpha = isMain ? 0.4 : 0.2 / (1 + index * 0.2)
        if (wZ > 2000) waveAlpha *= (1 - (wZ - 2000) / 500)
        if (wZ < 0) waveAlpha *= (1 + wZ / 1000)

        if (waveAlpha > 0.01 && wZ > -focalLength + 100) {
            ctx.strokeStyle = `rgba(${rgbStr}, ${waveAlpha})`
            ctx.lineWidth = isMain ? 2 : 1
            ctx.strokeRect(sx, sy, sw, sh)
            
            // Corner Brackets for the frame
            const bSize = (isMain ? 50 : 30) * waveScale
            this.drawCorner(ctx, sx, sy, bSize, 0, waveAlpha, rgbStr)
            this.drawCorner(ctx, sx + sw, sy, bSize, Math.PI/2, waveAlpha, rgbStr)
            this.drawCorner(ctx, sx + sw, sy + sh, bSize, Math.PI, waveAlpha, rgbStr)
            this.drawCorner(ctx, sx, sy + sh, bSize, -Math.PI/2, waveAlpha, rgbStr)
        }
    })
  }
}
