export class MatrixRain {
  constructor(canvasId, color = "#0F0") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.columns = []
    this.fontSize = 16
    this.color = color
    this.active = false

    // THAY ĐỔI 1: Cấu hình tốc độ
    this.fps = 20 // Số khung hình trên giây (Càng nhỏ càng chậm. Mặc định 60, giờ để 20)
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.chars =
      "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initColumns()
  }

  initColumns() {
    const columnsCount = this.canvas.width / this.fontSize
    this.columns = []
    for (let i = 0; i < columnsCount; i++) {
      this.columns[i] = Math.random() * -100
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.initColumns()
    // Reset thời gian khi bắt đầu
    this.lastDrawTime = 0
    this.animate(0) // Truyền tham số 0 ban đầu
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  // THAY ĐỔI 2: Nhận tham số timestamp từ requestAnimationFrame
  animate(currentTime) {
    if (!this.active) return

    // Yêu cầu khung hình tiếp theo luôn được gọi
    requestAnimationFrame((t) => this.animate(t))

    // Tính toán thời gian trôi qua
    const elapsed = currentTime - this.lastDrawTime

    // THAY ĐỔI 3: Chỉ vẽ lại nếu đã đủ thời gian (giới hạn tốc độ)
    if (elapsed > this.fpsInterval) {
      // Lưu lại thời gian vẽ hiện tại (trừ đi phần dư để giữ nhịp đều)
      this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

      // --- BẮT ĐẦU VẼ ---

      // 1. Làm mờ (Trail)
      this.ctx.globalCompositeOperation = "destination-out"
      // Tăng độ trong suốt lên một chút vì vẽ chậm hơn thì cần xóa ít hơn để giữ trail
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.05)"
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

      // 2. Vẽ chữ mới
      this.ctx.globalCompositeOperation = "source-over"
      this.ctx.fillStyle = this.color
      this.ctx.font = this.fontSize + "px monospace"

      for (let i = 0; i < this.columns.length; i++) {
        const text = this.chars.charAt(
          Math.floor(Math.random() * this.chars.length),
        )

        const x = i * this.fontSize
        const y = this.columns[i] * this.fontSize

        this.ctx.fillText(text, x, y)

        if (y > this.canvas.height && Math.random() > 0.975) {
          this.columns[i] = 0
        }

        this.columns[i]++
      }
      // --- KẾT THÚC VẼ ---
    }
  }
}
