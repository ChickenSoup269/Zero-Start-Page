export class FirefliesEffect {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.flies = []
    this.active = false
    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  start() {
    if (this.active) return
    this.active = true
    this.createFlies()
    this.animate()
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.flies = []
    this.canvas.style.display = "none"
  }

  createFlies() {
    for (let i = 0; i < 50; i++) {
      this.flies.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 4 + 2, // Kích thước
        speedX: Math.random() * 0.5 - 0.25, // Tốc độ rất chậm
        speedY: Math.random() * 0.5 - 0.25,
        angle: Math.random() * 360, // Góc để tạo chuyển động lượn sóng
        swing: Math.random() * 0.02 + 0.01, // Độ lắc lư
      })
    }
  }

  animate() {
    if (!this.active) return
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Chế độ hòa trộn để tạo hiệu ứng phát sáng đẹp hơn khi chồng lên nhau
    this.ctx.globalCompositeOperation = "screen"

    this.flies.forEach((fly) => {
      // Cập nhật vị trí
      fly.angle += fly.swing
      fly.x += Math.cos(fly.angle) + fly.speedX // Di chuyển lượn sóng
      fly.y += Math.sin(fly.angle) + fly.speedY

      // Nếu bay ra ngoài thì vòng lại
      if (fly.x < -50) fly.x = this.canvas.width + 50
      if (fly.x > this.canvas.width + 50) fly.x = -50
      if (fly.y < -50) fly.y = this.canvas.height + 50
      if (fly.y > this.canvas.height + 50) fly.y = -50

      // Vẽ đom đóm với gradient (tâm sáng, viền mờ)
      const gradient = this.ctx.createRadialGradient(
        fly.x,
        fly.y,
        0,
        fly.x,
        fly.y,
        fly.size * 2,
      )
      // Màu vàng cam đom đóm
      gradient.addColorStop(0, "rgba(255, 220, 100, 1)")
      gradient.addColorStop(0.4, "rgba(255, 200, 50, 0.3)")
      gradient.addColorStop(1, "rgba(255, 200, 50, 0)")

      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(fly.x, fly.y, fly.size * 2, 0, Math.PI * 2)
      this.ctx.fill()
    })

    this.ctx.globalCompositeOperation = "source-over" // Reset lại
    requestAnimationFrame(() => this.animate())
  }
}
