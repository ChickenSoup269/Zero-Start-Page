export class RainbowBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false

    // Bảng màu cầu vồng mở rộng: Đỏ, Cam, Vàng, Lục, Lam, Chàm, Tím, Hồng
    this.hues = [350, 20, 50, 150, 190, 230, 280, 320]

    this.beamCount = 25 // Làm các tia chiếu to, rộng hơn nên giảm bớt số lượng
    this.particleCount = 70 // Hạt bụi bay lơ lửng tĩnh trong dải sáng
    this.beams = []
    this.particles = []
    this.animationFrame = null
    this.time = 0

    // Góc nghiêng chiếu rọi (khoảng 20 độ để ánh sáng đẹp hơn)
    this.angle = (20 * Math.PI) / 180
    this.sinA = Math.sin(this.angle)
    this.cosA = Math.cos(this.angle)

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initBeams()
  }

  initBeams() {
    this.beams = []
    this.particles = []
    const W = this.canvas.width
    const H = this.canvas.height

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
      yBase: -Math.random() * H * 0.3 - 50, // Phát xuất từ tít mù trên đỉnh
      width: Math.random() * 40 + 15, // Dải beam to, rộng sải thành dải lụa sáng
      length: diagonal * 1.2, // Dài bao trùm xuyên suốt màn hình (KHÔNG ĐỨT)
      driftSpeed: Math.random() * 0.2 + 0.05, // Trôi ngang qua lại RẤT MƯỢT (Pan slowly)
      hue: this.hues[Math.floor(Math.random() * this.hues.length)],
      opacity: Math.random() * 0.15 + 0.02, // Soft light

      pulse: Math.random() * Math.PI * 2,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.015 + 0.005, // Chu kỳ tắt/sáng rất êm ái
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
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  animate() {
    if (!this.active) return
    this.animationFrame = requestAnimationFrame(() => this.animate())

    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    ctx.clearRect(0, 0, W, H)
    ctx.globalCompositeOperation = "lighter"
    this.time += 1

    // 1. Vẽ hạt bụi sao trôi lơ lửng rất tự nhiên
    for (const p of this.particles) {
      p.x +=
        this.sinA * p.speed + Math.sin(this.time * 0.01 + p.wobblePhase) * 0.4
      p.y += this.cosA * p.speed

      if (p.y > H + 50 || p.x > W + 50) {
        p.y = -50
        p.x = Math.random() * W * 1.5 - W * 0.25
        p.hue = this.hues[Math.floor(Math.random() * this.hues.length)]
      }

      const currentOpacity =
        p.baseOpacity + Math.sin(this.time * 0.03 + p.wobblePhase) * 0.3

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${p.hue}, 90%, 75%, ${Math.max(0.01, currentOpacity)})`
      ctx.fill()
    }

    // 2. Vẽ dải ánh sáng XUYÊN MÀN HÌNH cố định (God Rays), không rớt liên tục
    for (const b of this.beams) {
      // Di chuyển NGANG siêu thong dong thay vì rớt dọc
      b.x += b.driftSpeed
      if (b.x > W * 1.5) {
        b.x = -W * 0.5
        b.hue = this.hues[Math.floor(Math.random() * this.hues.length)]
      }

      b.pulse += b.pulseSpeed
      const pulseFactor = (Math.sin(b.pulse) + 1) / 2

      const currentOpacity = b.opacity + pulseFactor * 0.15
      const currentWidth = b.width + pulseFactor * 5
      const currentLightness = 55 + pulseFactor * 20

      // Tia rung rinh nhè nhẹ tại chỗ
      const xWobble = Math.sin(this.time * 0.005 + b.pulsePhase) * 15
      const startX = b.x + xWobble
      const startY = b.yBase

      const endX = startX + this.sinA * b.length
      const endY = startY + this.cosA * b.length

      const grad = ctx.createLinearGradient(startX, startY, endX, endY)
      const color = `hsla(${b.hue}, 90%, ${currentLightness}%,`

      grad.addColorStop(0, `${color} 0)`) // Gốc sáng yếu dần vào bóng tối
      grad.addColorStop(0.1, `${color} ${currentOpacity})`) // Dày nhất đoạn gần gốc
      grad.addColorStop(0.6, `${color} ${currentOpacity * 0.6})`) // Điểm thân chính
      grad.addColorStop(1, `${color} 0)`) // Tan biến vào bóng tối ở đuôi

      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)
      ctx.lineCap = "round"
      ctx.lineWidth = currentWidth
      ctx.strokeStyle = grad
      ctx.stroke()

      // Core glow phát ra từ tâm ánh sáng để tạo khối 3D chói loá
      if (pulseFactor > 0.7) {
        ctx.beginPath()
        const midStartX = startX + this.sinA * (b.length * 0.1)
        const midStartY = startY + this.cosA * (b.length * 0.1)
        const midEndX = startX + this.sinA * (b.length * 0.6)
        const midEndY = startY + this.cosA * (b.length * 0.6)

        ctx.moveTo(midStartX, midStartY)
        ctx.lineTo(midEndX, midEndY)
        ctx.lineWidth = currentWidth * 0.2
        ctx.strokeStyle = `hsla(${b.hue}, 100%, 90%, ${(pulseFactor - 0.7).toFixed(2)})`
        ctx.stroke()
      }
    }
  }
}
