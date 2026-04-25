export class RainbowBackground {
  constructor(canvasId, direction = "left") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false

    // Bảng màu cầu vồng mở rộng: Đỏ, Cam, Vàng, Lục, Lam, Chàm, Tím, Hồng
    this.hues = [350, 20, 50, 150, 190, 230, 280, 320]

    this.beamCount = 15 // Giảm từ 25 để tối ưu hiệu năng mà vẫn đủ đẹp
    this.particleCount = 40 // Giảm từ 70
    this.beams = []
    this.particles = []
    this.animationFrame = null
    this.time = 0
    this.beamCanvases = {} // Cache các dải sáng đã render sẵn

    // Góc nghiêng chiếu rọi (khoảng 20 độ để ánh sáng đẹp hơn)
    this.direction = direction // Sử dụng giá trị truyền vào hoặc mặc định
    this.updateAngle()

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  updateAngle() {
    // left: từ trái trên xuống phải dưới, right: từ phải trên xuống trái dưới
    const deg = this.direction === "left" ? 20 : -20
    this.angle = (deg * Math.PI) / 180
    this.sinA = Math.sin(this.angle)
    this.cosA = Math.cos(this.angle)
  }

  setDirection(direction) {
    if (this.direction === direction) return
    this.direction = direction
    this.updateAngle()
    // Reset vị trí các hạt để không bị lệch đột ngột quá nhiều
    this.initBeams()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initBeams()
  }

  // Pre-render các dải sáng để không phải tính toán gradient mỗi frame
  _preRenderBeams() {
    this.beamCanvases = {}
    const beamHeight = 1200 // Chiều dài dải sáng cố định để render
    const beamWidth = 100 // Chiều rộng dải sáng cố định

    this.hues.forEach((hue) => {
      const offCanvas = document.createElement("canvas")
      offCanvas.width = beamWidth
      offCanvas.height = beamHeight
      const offCtx = offCanvas.getContext("2d")

      const grad = offCtx.createLinearGradient(0, 0, 0, beamHeight)
      const color = `hsla(${hue}, 90%, 65%,`
      grad.addColorStop(0, `${color} 0)`)
      grad.addColorStop(0.1, `${color} 1)`)
      grad.addColorStop(0.6, `${color} 0.6)`)
      grad.addColorStop(1, `${color} 0)`)

      offCtx.fillStyle = grad
      offCtx.fillRect(0, 0, beamWidth, beamHeight)
      this.beamCanvases[hue] = offCanvas
    })
  }

  initBeams() {
    this.beams = []
    this.particles = []
    const W = this.canvas.width
    const H = this.canvas.height

    if (Object.keys(this.beamCanvases).length === 0) {
      this._preRenderBeams()
    }

    for (let i = 0; i < this.beamCount; i++) {
      this.beams.push(this._createBeam(W, H))
    }

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this._createParticle(W, H))
    }
  }

  _createParticle(W, H) {
    return {
      x: Math.random() * W * 1.5 - W * 0.25,
      y: Math.random() * H,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.4 + 0.1, // Hạt bụi trôi siêu chậm
      hue: this.hues[Math.floor(Math.random() * this.hues.length)],
      wobblePhase: Math.random() * Math.PI * 2,
      baseOpacity: Math.random() * 0.4 + 0.1,
    }
  }

  _createBeam(W, H) {
    const diagonal = Math.sqrt(W * W + H * H)
    return {
      x: Math.random() * W * 1.5 - W * 0.25,
      yBase: -Math.random() * H * 0.3 - 50,
      width: Math.random() * 40 + 15,
      length: diagonal * 1.3,
      driftSpeed: Math.random() * 0.2 + 0.05,
      hue: this.hues[Math.floor(Math.random() * this.hues.length)],
      opacity: Math.random() * 0.15 + 0.02,

      pulse: Math.random() * Math.PI * 2,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.015 + 0.005,
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.time = 0
    this.animate()
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    if (this.animationFrame) { cancelAnimationFrame(this.animationFrame); this.animationFrame = null; }
    if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
    this.beams = []
    this.particles = []
  }

  animate() {
    if (!this.active) return
    this.animationFrame = this._animId = requestAnimationFrame(() =>
      this.animate(),
    )
    if (document.visibilityState === "hidden") return

    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    ctx.clearRect(0, 0, W, H)
    ctx.globalCompositeOperation = "lighter"
    this.time += 1

    const time = this.time
    const sinTime1 = Math.sin(time * 0.01)
    const sinTime3 = Math.sin(time * 0.03)

    // 1. Vẽ hạt bụi sao (Optimization: dùng fillStyle một lần nếu cùng màu, nhưng ở đây nhiều màu nên giữ nguyên)
    for (const p of this.particles) {
      p.x +=
        this.sinA * p.speed + Math.sin(time * 0.01 + p.wobblePhase) * 0.4
      p.y += this.cosA * p.speed

      if (p.y > H + 50 || p.x > W + 50) {
        p.y = -50
        p.x = Math.random() * W * 1.5 - W * 0.25
      }

      const currentOpacity =
        p.baseOpacity + Math.sin(time * 0.03 + p.wobblePhase) * 0.3
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${p.hue}, 90%, 75%, ${Math.max(0.01, currentOpacity)})`
      ctx.fill()
    }

    // 2. Vẽ dải ánh sáng XUYÊN MÀN HÌNH (Optimization: dùng drawImage từ offscreen canvas)
    for (const b of this.beams) {
      b.x += b.driftSpeed
      if (b.x > W * 1.5) {
        b.x = -W * 0.5
      }

      b.pulse += b.pulseSpeed
      const pulseFactor = (Math.sin(b.pulse) + 1) / 2

      const currentOpacity = b.opacity + pulseFactor * 0.12
      const currentWidth = b.width + pulseFactor * 5
      const xWobble = Math.sin(time * 0.005 + b.pulsePhase) * 15

      const startX = b.x + xWobble
      const startY = b.yBase

      const offCanvas = this.beamCanvases[b.hue]
      if (offCanvas) {
        ctx.save()
        // Di chuyển tới điểm bắt đầu và xoay theo góc nghiêng
        ctx.translate(startX, startY)
        ctx.rotate(this.angle)

        ctx.globalAlpha = currentOpacity
        // Scale hình ảnh: x là chiều rộng (currentWidth), y là chiều dài (b.length)
        // Lưu ý: Canvas gốc rộng 100 nên ta vẽ từ -currentWidth/2 để căn giữa
        ctx.drawImage(offCanvas, -currentWidth / 2, 0, currentWidth, b.length)

        // Core glow chói lọi hơn một chút khi pulse cao (vẽ thêm dải trắng hẹp)
        if (pulseFactor > 0.8) {
          ctx.globalAlpha = (pulseFactor - 0.8) * 2
          // Dùng chính canvas đó nhưng scale rất hẹp để tạo lõi trắng sáng
          ctx.drawImage(offCanvas, -currentWidth * 0.1, 0, currentWidth * 0.2, b.length)
        }
        ctx.restore()
      }
    }
  }
}
