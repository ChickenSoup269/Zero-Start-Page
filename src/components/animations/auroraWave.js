/**
 * Aurora Wave Effect - Cinematic Fluid Version
 */

export class AuroraWaveEffect {
  constructor(canvasId, color = "#00bcd4") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d", { alpha: true })

    this.active = false
    this.color = color
    this.time = 0
    this.lastDrawTime = 0

    // ================== CONFIGURATION ==================
    this.waveCount = 5
    this.wavePoints = 50 // Tăng độ phân giải cho sóng mượt hơn
    this.waveAmplitude = 80
    this.waveFrequency = 0.004
    this.brightness = 0.8
    this.speed = 1.0
    this.transparent = true
    this.backgroundColor = "#02040f"
    this.bgOpacity = 0.2

    // State
    this._gradients = []
    this._waveConfigs = []
    this._particles = []
    
    this._resizeHandler = () => this._onResize()
    window.addEventListener("resize", this._resizeHandler)
    this._onResize()
  }

  _onResize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._buildCache()
  }

  _buildCache() {
    const W = this.canvas.width
    const H = this.canvas.height
    const baseHsl = this._hexToHsl(this.color)
    
    this._gradients = []
    this._waveConfigs = []

    for (let w = 0; w < this.waveCount; w++) {
      const hue = (baseHsl.h + (w - this.waveCount / 2) * 20 + 360) % 360
      const opacity = this.brightness * (0.4 - w * 0.05)
      
      // Tạo dải màu có chiều sâu
      const grad = this.ctx.createLinearGradient(0, 0, 0, H * 0.8)
      grad.addColorStop(0.0, `hsla(${hue}, 80%, 40%, 0)`)
      grad.addColorStop(0.3, `hsla(${hue}, 90%, 60%, ${opacity * 0.5})`)
      grad.addColorStop(0.5, `hsla(${(hue + 30) % 360}, 100%, 75%, ${opacity})`) // Lõi sáng
      grad.addColorStop(0.7, `hsla(${hue}, 90%, 50%, ${opacity * 0.3})`)
      grad.addColorStop(1.0, `hsla(${hue}, 80%, 30%, 0)`)

      this._gradients.push(grad)

      this._waveConfigs.push({
        phase: Math.random() * Math.PI * 2,
        speed: 0.005 + w * 0.002,
        amplitude: 0.8 + w * 0.15,
        yOffset: (w - this.waveCount / 2) * (H * 0.08)
      })
    }

    // Nâng cấp hệ thống hạt sáng
    this._particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 2.5 + 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.005,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.2
    }))
  }

  _hexToHsl(hex) {
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
    return { h: h * 360, s: s * 100, l: l * 100 }
  }

  _getWaveY(x, t, cfg) {
    const { phase, speed, amplitude } = cfg
    const time = t * speed * this.speed
    const f = this.waveFrequency
    const a = this.waveAmplitude * amplitude

    let y = Math.sin(x * f + time + phase) * a
    y += Math.sin(x * f * 2.1 + time * 1.5 + phase) * (a * 0.3)
    y += Math.cos(x * f * 0.8 - time * 0.7 + phase * 0.5) * (a * 0.4)
    return y
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.animate(this.lastDrawTime)
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    if (this._animId) cancelAnimationFrame(this._animId)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this._animId = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < 16) return // Giới hạn ~60fps
    this.lastDrawTime = currentTime
    this.time += 0.01

    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const centerY = H * 0.5

    ctx.globalCompositeOperation = "source-over"
    if (this.transparent) {
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = `rgba(1, 2, 10, ${this.bgOpacity})`
      ctx.fillRect(0, 0, W, H)
    } else {
      ctx.fillStyle = this.backgroundColor
      ctx.fillRect(0, 0, W, H)
    }

    // Vẽ hạt sáng Cinematic
    ctx.globalCompositeOperation = "screen"
    this._particles.forEach((p, i) => {
      p.phase += p.speed
      p.x += p.vx * this.speed
      p.y += p.vy * this.speed
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0

      const opacity = (Math.sin(p.phase) * 0.5 + 0.5) * 0.6 * this.brightness
      const pSize = p.size * (0.8 + 0.4 * Math.sin(p.phase * 0.7))
      
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
      ctx.beginPath(); ctx.arc(p.x, p.y, pSize, 0, Math.PI * 2); ctx.fill()
      
      // Quầng sáng mờ cho hạt
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.2})`
      ctx.beginPath(); ctx.arc(p.x, p.y, pSize * 3, 0, Math.PI * 2); ctx.fill()
    })

    // Vẽ các dải sóng Aurora
    ctx.globalCompositeOperation = "lighter"
    const step = W / this.wavePoints

    for (let w = 0; w < this.waveCount; w++) {
      const cfg = this._waveConfigs[w]
      const baseY = centerY + cfg.yOffset
      const thickness = 120 + Math.sin(this.time * 0.5 + w) * 40

      ctx.fillStyle = this._gradients[w]
      
      ctx.beginPath()
      let firstY = baseY + this._getWaveY(0, this.time, cfg)
      ctx.moveTo(0, firstY)

      // Top curve
      for (let i = 1; i <= this.wavePoints; i++) {
        const x = i * step
        const y = baseY + this._getWaveY(x, this.time, cfg)
        ctx.lineTo(x, y)
      }

      // Bottom curve back
      for (let i = this.wavePoints; i >= 0; i--) {
        const x = i * step
        const y = baseY + this._getWaveY(x, this.time, cfg) + thickness
        ctx.lineTo(x, y)
      }

      ctx.closePath()
      ctx.fill()
    }
  }

  setOptions(options) {
    if (options.color !== undefined) this.color = options.color
    if (options.brightness !== undefined) this.brightness = options.brightness
    if (options.speed !== undefined) this.speed = options.speed
    if (options.waveAmplitude !== undefined) this.waveAmplitude = options.waveAmplitude
    if (options.transparent !== undefined) this.transparent = options.transparent
    if (options.backgroundColor !== undefined) this.backgroundColor = options.backgroundColor
    if (options.bgOpacity !== undefined) this.bgOpacity = options.bgOpacity
    this._buildCache()
  }
}
