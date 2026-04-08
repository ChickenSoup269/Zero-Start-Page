export class AuroraWaveEffect {
  constructor(canvasId, color = "#00bcd4") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d", { alpha: true })

    this.active = false
    this.color = color
    this.time = 0

    // ================== CẤU HÌNH ==================
    this.waveCount = 7
    this.wavePoints = 48
    this.waveAmplitude = 65 // sóng nhỏ như bạn yêu cầu trước
    this.waveFrequency = 0.0055

    this.brightness = 0.68 // ← GIẢM ĐỘ SÁNG (0.5 ~ 0.8 là đẹp nhất)

    this.quality = 1.0

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

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
    const depth = H * 0.52

    this._gradients = []
    this._waveConfigs = []

    for (let w = 0; w < this.waveCount; w++) {
      const waveOffset = (w / this.waveCount) * Math.PI * 2.5
      const hueShift = (w - this.waveCount / 2) * 18

      const rr = Math.max(40, Math.min(255, r + hueShift * 0.8))
      const gg = Math.max(90, Math.min(255, g + hueShift * 1.4))
      const bb = Math.max(110, Math.min(255, b + hueShift * 0.5))

      const grad = this.ctx.createLinearGradient(
        0,
        centerY - depth * 0.55,
        0,
        centerY + depth * 0.85,
      )

      // Gradient tối hơn, ít sáng hơn
      grad.addColorStop(0.0, `rgba(${rr},${gg},${bb},0)`)
      grad.addColorStop(0.3, `rgba(${rr + 25},${gg + 35},${bb + 15},0.18)`)
      grad.addColorStop(0.6, `rgba(${rr},${gg},${bb},0.38)`) // giảm opacity
      grad.addColorStop(
        0.82,
        `rgba(${rr * 0.55},${gg * 0.52},${bb * 0.58},0.12)`,
      )
      grad.addColorStop(1.0, `rgba(6,10,28,0)`)

      this._gradients.push(grad)

      this._waveConfigs.push({
        waveOffset,
        speedMultiplier: 0.82 + w * 0.16,
        ampMultiplier: 0.95 + w * 0.07,
        yOffset: (w - this.waveCount / 2) * 18,
        alpha: (0.78 - w * 0.09) * this.brightness, // nhân với brightness
      })
    }

    // Particles tối hơn
    this._particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.68,
      size: Math.random() * 1.6 + 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.014 + 0.007,
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
    y += Math.sin(x * f * 1.7 - time * 0.8 + waveOffset * 2) * (a * 0.38)
    y += Math.cos(x * f * 0.55 + time * 1.25 + waveOffset) * (a * 0.55)
    y += Math.sin(x * f * 4.1 + time * 3.2) * (a * 0.06)

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
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const centerY = H * 0.45

    // Background tối hơn để hút sáng
    ctx.globalCompositeOperation = "source-over"
    ctx.fillStyle = "rgba(2, 4, 18, 0.32)"
    ctx.fillRect(0, 0, W, H)

    // Particles dịu hơn
    ctx.globalCompositeOperation = "screen"
    for (let p of this._particles) {
      p.phase += p.speed
      const alpha = (Math.sin(p.phase) * 0.35 + 0.65) * 0.55 // giảm sáng

      ctx.fillStyle = `rgba(235, 245, 255, ${alpha.toFixed(3)})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    this.time += 0.0055

    const t = this.time
    const pts = Math.floor(this.wavePoints * this.quality)
    const xStep = W / pts

    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.shadowBlur = 12 // giảm glow để bớt chói
    ctx.shadowColor = this.color

    for (let w = 0; w < this.waveCount; w++) {
      const cfg = this._waveConfigs[w]
      const { waveOffset, speedMultiplier, ampMultiplier, yOffset, alpha } = cfg
      const baseY = centerY + yOffset

      const ribbonThickness = 78 + Math.sin(t * 2.2 + waveOffset) * 22

      ctx.globalCompositeOperation = "lighter"
      ctx.globalAlpha = alpha

      const path = new Path2D()

      let px = 0
      let py =
        baseY + this._waveY(0, t, waveOffset, ampMultiplier, speedMultiplier)
      path.moveTo(px, py)

      for (let i = 1; i <= pts; i++) {
        const x = i * xStep
        const y =
          baseY + this._waveY(x, t, waveOffset, ampMultiplier, speedMultiplier)
        const cx = (px + x) * 0.5
        const cy = (py + y) * 0.5
        path.quadraticCurveTo(px, py, cx, cy)
        px = x
        py = y
      }

      for (let i = pts; i >= 0; i--) {
        const x = i * xStep
        const bottomY =
          baseY +
          this._waveY(
            x,
            t,
            waveOffset + 0.18,
            ampMultiplier * 0.9,
            speedMultiplier,
          ) +
          ribbonThickness
        path.lineTo(x, bottomY)
      }

      path.closePath()
      ctx.fillStyle = this._gradients[w]
      ctx.fill(path)
    }

    ctx.globalAlpha = 1.0
    ctx.shadowBlur = 0
  }

  // Thêm hàm này để bạn dễ chỉnh độ sáng realtime
  setBrightness(value) {
    this.brightness = Math.max(0.3, Math.min(1.2, value))
    this._buildCache() // rebuild gradient + alpha
  }

  setColor(hex) {
    this.color = hex
    this._buildCache()
  }

  setQuality(q = 1.0) {
    this.quality = Math.max(0.5, Math.min(1.3, q))
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
