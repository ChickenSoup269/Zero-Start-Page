import { hexToRgb } from "../../utils/colors.js"

export class CloudDriftEffect {
  constructor(canvasId, color = "#ffffff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.baseColor = color
    this.clouds = []
    this.lastTime = 0
    this._animId = null

    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    if (this.active) this.initClouds()
  }

  initClouds() {
    const count = 6 + Math.floor(window.innerWidth / 400)
    this.clouds = []
    for (let i = 0; i < count; i++) {
      // Phân bổ đều mây ban đầu
      const cloud = this.createCloudData()
      cloud.x = Math.random() * (this.canvas.width + 600) - 300
      this.clouds.push(cloud)
    }
    this.clouds.sort((a, b) => a.layer - b.layer)
  }

  createCloudData() {
    const layer = Math.random()
    const scale = 0.6 + layer * 1.0
    const puffCount = 5 + Math.floor(Math.random() * 4)
    const puffs = []
    for (let i = 0; i < puffCount; i++) {
      puffs.push({
        ox: (i - puffCount / 2) * (35 * scale),
        oy: (Math.random() * 20 - 10) * scale,
        r: (50 + Math.random() * 40) * scale,
        phase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.2
      })
    }

    return {
      x: -400,
      y: Math.random() * (this.canvas.height * 0.5),
      speed: (15 + layer * 25), // Pixels per second
      alpha: 0.25 + layer * 0.3,
      layer: layer,
      puffs: puffs,
      scale: scale
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this.initClouds()
    this.lastTime = performance.now()

    const animateLoop = (now) => {
      if (!this.active) return
      this._animId = requestAnimationFrame(animateLoop)
      if (document.visibilityState === 'hidden') return
      
      const deltaTime = (now - this.lastTime) / 1000 // Chuyển sang giây
      this.lastTime = now

      // Giới hạn deltaTime để tránh nhảy vọt khi quay lại tab
      const limitedDelta = Math.min(deltaTime, 0.1) 
      
      this.update(limitedDelta, now / 1000)
      this.draw()
    }
    this._animId = requestAnimationFrame(animateLoop)
  }

  stop() {
    this.active = false
    if (this._animId) cancelAnimationFrame(this._animId)
    this.canvas.style.display = "none"
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  update(dt, time) {
    for (const c of this.clouds) {
      c.x += c.speed * dt
      
      // Update puff sizes
      for (const p of c.puffs) {
        p.currentR = p.r + Math.sin(time * p.speed + p.phase) * (p.r * 0.06)
      }

      // Wrap around mượt mờ
      if (c.x > this.canvas.width + 400) {
        c.x = -400
        c.y = Math.random() * (this.canvas.height * 0.5)
      }
    }
  }

  _updateColorCache() {
    this._rgb = hexToRgb(this.baseColor)
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    if (!this._rgb) this._updateColorCache()
    const rgb = this._rgb

    for (const c of this.clouds) {
      this.ctx.save()
      this.ctx.translate(c.x, c.y)
      
      // Vẽ một lớp duy nhất nhưng tối ưu hơn để tránh đứng hình
      for (const p of c.puffs) {
        const grad = this.ctx.createRadialGradient(
          p.ox, p.oy - p.currentR * 0.2, 0,
          p.ox, p.oy, p.currentR
        )
        
        const a = c.alpha
        grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`)
        grad.addColorStop(0.6, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a * 0.6})`)
        grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

        this.ctx.fillStyle = grad
        this.ctx.beginPath()
        this.ctx.arc(p.ox, p.oy, p.currentR, 0, Math.PI * 2)
        this.ctx.fill()
      }
      
      this.ctx.restore()
    }
  }
}
