import { hexToRgb } from "../../utils/colors.js"

export class CloudDriftEffect {
  constructor(canvasId, color = "#ffffff", mood = "default") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.baseColor = color
    this.mood = mood || "default"
    this.clouds = []
    this.lastTime = 0
    this.time = 0
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
    const scale = 0.55 + layer * 1.15
    const puffCount = 6 + Math.floor(Math.random() * 5)
    const puffs = []
    for (let i = 0; i < puffCount; i++) {
      puffs.push({
        ox: (i - puffCount / 2) * (35 * scale),
        oy: (Math.random() * 20 - 10) * scale,
        r: (50 + Math.random() * 40) * scale,
        phase: Math.random() * Math.PI * 2,
        speed: 0.16 + Math.random() * 0.24,
      })
    }

    return {
      x: -400,
      y: Math.random() * (this.canvas.height * 0.58),
      speed: 10 + layer * 22,
      alpha: 0.2 + layer * 0.34,
      layer,
      puffs,
      scale,
      wobble: Math.random() * Math.PI * 2,
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

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    this.clouds = []
    this._rgb = null
  }

  update(dt, time) {
    this.time = time
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

  updateColor(color) {
    this.baseColor = color
    this._updateColorCache()
  }

  setMood(mood) {
    this.mood = mood || "default"
  }

  setOptions(options = {}) {
    if (options.color !== undefined) this.updateColor(options.color)
    if (options.mood !== undefined) this.setMood(options.mood)
  }

  _getMoodPalette() {
    const palettes = {
      sunrise: {
        sky: ["rgba(255, 190, 126, 0.2)", "rgba(255, 224, 181, 0.14)", "rgba(133, 191, 226, 0.08)"],
        sun: "rgba(255, 183, 98, 0.45)",
        tint: { r: 255, g: 218, b: 185 },
        tintStrength: 0.5,
        horizon: "rgba(255, 143, 99, 0.18)",
      },
      sunset: {
        sky: ["rgba(255, 117, 92, 0.18)", "rgba(246, 167, 104, 0.12)", "rgba(76, 80, 158, 0.12)"],
        sun: "rgba(255, 130, 82, 0.42)",
        tint: { r: 255, g: 177, b: 133 },
        tintStrength: 0.58,
        horizon: "rgba(255, 94, 112, 0.2)",
      },
      default: null,
    }
    return palettes[this.mood] || palettes.default
  }

  _mixRgb(a, b, amount) {
    return {
      r: Math.round(a.r + (b.r - a.r) * amount),
      g: Math.round(a.g + (b.g - a.g) * amount),
      b: Math.round(a.b + (b.b - a.b) * amount),
    }
  }

  _drawMoodBackdrop(palette) {
    if (!palette) return
    const W = this.canvas.width
    const H = this.canvas.height
    const ctx = this.ctx
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, palette.sky[0])
    sky.addColorStop(0.5, palette.sky[1])
    sky.addColorStop(1, palette.sky[2])
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)

    const sunX = this.mood === "sunset" ? W * 0.78 : W * 0.22
    const sunY = H * (this.mood === "sunset" ? 0.36 : 0.32)
    const pulse = 1 + Math.sin(this.time * 0.32) * 0.03
    const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.min(W, H) * 0.36 * pulse)
    sun.addColorStop(0, palette.sun)
    sun.addColorStop(0.42, "rgba(255, 214, 168, 0.16)")
    sun.addColorStop(1, "rgba(255, 214, 168, 0)")
    ctx.fillStyle = sun
    ctx.fillRect(0, 0, W, H)

    const horizon = ctx.createLinearGradient(0, H * 0.48, 0, H)
    horizon.addColorStop(0, "rgba(255, 255, 255, 0)")
    horizon.addColorStop(1, palette.horizon)
    ctx.fillStyle = horizon
    ctx.fillRect(0, 0, W, H)
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    if (!this._rgb) this._updateColorCache()
    const palette = this._getMoodPalette()
    this._drawMoodBackdrop(palette)

    for (const c of this.clouds) {
      this.ctx.save()
      this.ctx.translate(c.x, c.y + Math.sin(this.time * 0.18 + c.wobble) * 8)
      const rgb = palette
        ? this._mixRgb(this._rgb, palette.tint, palette.tintStrength * (0.75 + c.layer * 0.25))
        : this._rgb
      
      this.ctx.globalCompositeOperation = palette ? "source-over" : "lighter"
      for (const p of c.puffs) {
        const grad = this.ctx.createRadialGradient(
          p.ox, p.oy - p.currentR * 0.2, 0,
          p.ox, p.oy, p.currentR
        )
        
        const a = palette ? c.alpha * 0.82 : c.alpha
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
    this.ctx.globalCompositeOperation = "source-over"
  }
}
