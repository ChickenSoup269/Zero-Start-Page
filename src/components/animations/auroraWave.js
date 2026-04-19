export class AuroraWaveEffect {
  constructor(canvasId, color = "#00bcd4") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d", { alpha: true })

    this.active = false
    this.color = color
    this.time = 0
    this.lastDrawTime = 0

    // ================== CONFIGURATION ==================
    this.waveCount = 6
    this.wavePoints = 40
    this.waveAmplitude = 70
    this.waveFrequency = 0.005
    this.brightness = 0.65
    this.speed = 1.0
    this.transparent = true
    this.backgroundColor = "#000000"
    this.bgOpacity = 0.15

    // Cache
    this._gradients = []
    this._waveConfigs = []
    this._particles = []
    this._rgb = { r: 0, g: 188, b: 212 }

    this._resizeHandler = () => this._onResize()
    window.addEventListener("resize", this._resizeHandler)
    this._onResize()
  }

  _buildCache() {
    const W = this.canvas.width
    const H = this.canvas.height
    this._rgb = this._hexToRgb(this.color)
    const { r, g, b } = this._rgb
    const centerY = H * 0.45
    const depth = H * 0.55

    this._gradients = []
    this._waveConfigs = []

    for (let w = 0; w < this.waveCount; w++) {
      const waveOffset = (w / this.waveCount) * Math.PI * 2.0
      const hueShift = (w - this.waveCount / 2) * 15

      const rr = Math.max(0, Math.min(255, r + hueShift * 0.5))
      const gg = Math.max(0, Math.min(255, g + hueShift * 1.2))
      const bb = Math.max(0, Math.min(255, b + hueShift * 0.4))

      const grad = this.ctx.createLinearGradient(
        0,
        centerY - depth * 0.6,
        0,
        centerY + depth * 0.9,
      )

      const alphaMult = this.brightness * (1.0 - w * 0.1)
      
      grad.addColorStop(0.0, `rgba(${rr},${gg},${bb},0)`)
      grad.addColorStop(0.25, `rgba(${rr + 20},${gg + 30},${bb + 10},${0.2 * alphaMult})`)
      grad.addColorStop(0.5, `rgba(${rr},${gg},${bb},${0.4 * alphaMult})`)
      grad.addColorStop(0.75, `rgba(${rr * 0.6},${gg * 0.6},${bb * 0.6},${0.15 * alphaMult})`)
      grad.addColorStop(1.0, `rgba(0,0,0,0)`)

      this._gradients.push(grad)

      this._waveConfigs.push({
        waveOffset,
        speedMultiplier: 0.7 + w * 0.15,
        ampMultiplier: 0.9 + w * 0.08,
        yOffset: (w - this.waveCount / 2) * 20,
        alpha: 1.0, // Now handled in gradient
      })
    }

    this._particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.7,
      size: Math.random() * 1.8 + 0.4,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.015 + 0.005,
    }))
  }

  _onResize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._buildCache()
  }

  _waveY(x, t, waveOffset, ampMult, speedMult) {
    const f = this.waveFrequency
    const a = this.waveAmplitude * ampMult
    const time = t * speedMult

    let y = Math.sin(x * f + time + waveOffset) * a
    y += Math.sin(x * f * 1.5 - time * 0.7 + waveOffset * 2) * (a * 0.4)
    y += Math.cos(x * f * 0.6 + time * 1.1 + waveOffset) * (a * 0.5)
    
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
    if (this._animId) cancelAnimationFrame(this._animId)
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this._animId = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    const deltaTime = elapsed / (1000 / 60) // Normalize to 60fps
    this.lastDrawTime = currentTime

    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const centerY = H * 0.45

    // Reset trạng thái hòa trộn về mặc định
    ctx.globalCompositeOperation = "source-over"

    if (this.transparent) {
      ctx.clearRect(0, 0, W, H)
      // Lớp phủ tối nhẹ để tăng tương phản, sử dụng bgOpacity từ cài đặt
      ctx.fillStyle = `rgba(0, 0, 0, ${this.bgOpacity})`
      ctx.fillRect(0, 0, W, H)
    } else {
      ctx.fillStyle = this.backgroundColor
      ctx.fillRect(0, 0, W, H)
    }

    // Update time with delta
    this.time += 0.008 * deltaTime * this.speed

    // Particles - Dùng screen để lung linh hơn
    ctx.globalCompositeOperation = "screen"
    for (let p of this._particles) {
      p.phase += p.speed * deltaTime
      const alpha = (Math.sin(p.phase) * 0.4 + 0.6) * 0.5
      ctx.fillStyle = `rgba(230, 245, 255, ${alpha.toFixed(3)})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    const t = this.time
    const pts = this.wavePoints
    const xStep = W / pts

    // Chế độ hòa trộn thông minh: 
    // Nếu có nền đặc (không trong suốt), dùng 'lighter' để rực rỡ nhất.
    // Nếu trong suốt, dùng 'source-over' để giữ màu sắc không bị cháy sáng trên hình nền trắng.
    ctx.globalCompositeOperation = this.transparent ? "source-over" : "lighter"
    
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    for (let w = 0; w < this.waveCount; w++) {
      const cfg = this._waveConfigs[w]
      const { waveOffset, speedMultiplier, ampMultiplier, yOffset } = cfg
      const baseY = centerY + yOffset

      const ribbonThickness = 85 + Math.sin(t * 1.8 + waveOffset) * 25

      ctx.globalCompositeOperation = "lighter"
      
      const path = new Path2D()
      let px = 0
      let py = baseY + this._waveY(0, t, waveOffset, ampMultiplier, speedMultiplier)
      path.moveTo(px, py)

      for (let i = 1; i <= pts; i++) {
        const x = i * xStep
        const y = baseY + this._waveY(x, t, waveOffset, ampMultiplier, speedMultiplier)
        const cx = (px + x) * 0.5
        const cy = (py + y) * 0.5
        path.quadraticCurveTo(px, py, cx, cy)
        px = x
        py = y
      }

      // Draw bottom line back
      for (let i = pts; i >= 0; i--) {
        const x = i * xStep
        const bottomY = baseY + this._waveY(x, t, waveOffset + 0.2, ampMultiplier * 0.95, speedMultiplier) + ribbonThickness
        path.lineTo(x, bottomY)
      }

      path.closePath()
      ctx.fillStyle = this._gradients[w]
      ctx.fill(path)
    }
  }

  setOptions(options) {
    if (options.color !== undefined) this.color = options.color
    if (options.brightness !== undefined) this.brightness = options.brightness
    if (options.speed !== undefined) this.speed = options.speed
    if (options.waveAmplitude !== undefined)
      this.waveAmplitude = options.waveAmplitude
    if (options.transparent !== undefined) this.transparent = options.transparent
    if (options.backgroundColor !== undefined)
      this.backgroundColor = options.backgroundColor
    if (options.bgOpacity !== undefined) this.bgOpacity = options.bgOpacity
    this._buildCache()
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 188, b: 212 }
  }
}
