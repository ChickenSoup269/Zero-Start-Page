export class RainbowBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false

    // Palette màu: Tím, Xanh dương, Xanh ngọc, Hồng
    this.hues = [280, 210, 170, 320]

    // Giảm số lượng tia vì tia giờ đã to hơn (để tránh rối mắt)
    this.beamCount = 35
    this.beams = []
    this.animationFrame = null

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
    const W = this.canvas.width
    const H = this.canvas.height
    // Tính đường chéo để phủ kín màn hình khi xoay
    const diagonal = Math.sqrt(W * W + H * H)

    for (let i = 0; i < this.beamCount; i++) {
      this.beams.push(this._createBeam(diagonal, i))
    }
  }

  _createBeam(maxDist, index) {
    // Phân bố đều theo chiều dọc để không bị chồng đống
    const rowHeight = maxDist / this.beamCount
    // Thêm chút random để không quá thẳng hàng
    const yPos = index * rowHeight - maxDist * 0.2

    return {
      x: Math.random() * maxDist - maxDist * 0.5,
      yBase: yPos,
      yOffset: Math.random() * 40 - 20, // Độ lệch Y lớn hơn chút

      // --- CẤU HÌNH KÍCH THƯỚC & TỐC ĐỘ (Mượt & To) ---
      width: Math.random() * 4 + 3, // To hơn: 3px - 7px
      length: Math.random() * 400 + 200, // Dài hơn: 200px - 600px
      speed: Math.random() * 1.2 + 0.3, // Chậm lại: Trôi nhẹ nhàng

      hue: this.hues[Math.floor(Math.random() * this.hues.length)],
      opacity: Math.random() * 0.25 + 0.05, // Độ trong suốt khởi điểm

      // Cấu hình Pulse (Lóe sáng)
      pulse: 0,
      pulseSpeed: Math.random() * 0.03 + 0.015, // Nhịp thở chậm (Slow breath)
      maxPulseAmp: Math.random() * 0.4 + 0.4,
    }
  }

  start() {
    if (this.active) return
    this.active = true
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
    const diagonal = Math.sqrt(W * W + H * H)

    ctx.clearRect(0, 0, W, H)

    // Chế độ hòa trộn giúp màu sắc rực rỡ và mềm mại khi chồng lên nhau
    ctx.globalCompositeOperation = "lighter"

    // Xoay canvas 45 độ
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.rotate((-45 * Math.PI) / 180)
    ctx.translate(-diagonal / 2, -diagonal / 2)

    for (const b of this.beams) {
      // 1. Di chuyển
      b.x -= b.speed

      // Reset khi tia chạy hết màn hình
      if (b.x + b.length < -200) {
        b.x = diagonal + 200
        b.hue = this.hues[Math.floor(Math.random() * this.hues.length)]
        b.pulse = 0
      }

      // 2. Logic "Nhịp thở" (Pulse)
      // Tỉ lệ kích hoạt ngẫu nhiên (khoảng 0.3% mỗi frame)
      if (b.pulse <= 0 && Math.random() < 0.003) {
        b.pulse = 0.01 // Bắt đầu chu kỳ
      }

      let currentOpacity = b.opacity
      let currentWidth = b.width
      let currentLightness = 55 // Độ sáng màu (gốc hơi tối chút cho đậm đà)

      if (b.pulse > 0) {
        b.pulse += b.pulseSpeed

        // Hàm Sin tạo độ mượt: Tăng dần -> Đỉnh -> Giảm dần
        const sinVal = Math.sin(b.pulse)

        if (sinVal > 0) {
          currentOpacity += sinVal * 0.6 // Tăng độ rõ
          currentWidth += sinVal * 8 // Phình to thêm tới 8px (Tổng ~15px)
          currentLightness += sinVal * 35 // Sáng lên gần trắng (90%)
        }

        if (b.pulse >= Math.PI) {
          b.pulse = 0 // Kết thúc chu kỳ
        }
      }

      // 3. Vẽ tia sáng (Gradient mềm)
      const grad = ctx.createLinearGradient(b.x, 0, b.x + b.length, 0)
      const color = `hsla(${b.hue}, 80%, ${currentLightness}%,`

      // Gradient 4 điểm dừng để tia sáng trông "tròn" và mềm hơn ở giữa
      grad.addColorStop(0, `${color} 0)`)
      grad.addColorStop(0.2, `${color} ${currentOpacity * 0.5})`)
      grad.addColorStop(0.5, `${color} ${currentOpacity})`) // Đậm nhất ở giữa
      grad.addColorStop(0.8, `${color} ${currentOpacity * 0.5})`)
      grad.addColorStop(1, `${color} 0)`)

      ctx.fillStyle = grad

      // Tính toán vị trí Y
      const centerOffset = (diagonal - H) / 2
      const drawY = b.yBase + b.yOffset + centerOffset

      // Vẽ tia sáng
      ctx.fillRect(b.x, drawY, b.length, currentWidth)
    }

    ctx.restore()
  }
}
