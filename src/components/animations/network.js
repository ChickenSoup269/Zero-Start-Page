export class NetworkEffect {
  constructor(canvasId, color = "#00bcd4") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.particles = []
    this.active = false
    this.color = color

    // Cấu hình
    this.particleCount = 80
    this.connectionDistance = 150 // Khoảng cách để nối dây

    this.resize()
    window.addEventListener("resize", () => this.resize())

    // Tương tác chuột
    this.mouse = { x: null, y: null }
    window.addEventListener("mousemove", (e) => {
      this.mouse.x = e.x
      this.mouse.y = e.y
    })
    window.addEventListener("mouseout", () => {
      this.mouse.x = null
      this.mouse.y = null
    })
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  start() {
    if (this.active) return
    this.active = true
    this.createParticles()
    this.animate()
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.particles = []
    this.canvas.style.display = "none"
  }

  createParticles() {
    this.particles = []
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 1.5, // Tốc độ X
        vy: (Math.random() - 0.5) * 1.5, // Tốc độ Y
        size: Math.random() * 3 + 1,
      })
    }
  }

  animate() {
    if (!this.active) return
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Xử lý từng hạt
    this.particles.forEach((p, index) => {
      p.x += p.vx
      p.y += p.vy

      // Dội ngược khi chạm biên
      if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1
      if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1

      // Vẽ hạt
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      this.ctx.fillStyle = this.color
      this.ctx.fill()

      // Nối dây với các hạt khác
      for (let j = index + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j]
        const dx = p.x - p2.x
        const dy = p.y - p2.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < this.connectionDistance) {
          this.ctx.beginPath()
          this.ctx.strokeStyle = this.color
          // Độ mờ của dây dựa trên khoảng cách (càng xa càng mờ)
          this.ctx.globalAlpha = 1 - distance / this.connectionDistance
          this.ctx.lineWidth = 1
          this.ctx.moveTo(p.x, p.y)
          this.ctx.lineTo(p2.x, p2.y)
          this.ctx.stroke()
          this.ctx.globalAlpha = 1 // Reset alpha
        }
      }

      // Nối dây với chuột
      if (this.mouse.x != null) {
        const dx = p.x - this.mouse.x
        const dy = p.y - this.mouse.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 200) {
          this.ctx.beginPath()
          this.ctx.strokeStyle = this.color
          this.ctx.globalAlpha = 1 - distance / 200
          this.ctx.moveTo(p.x, p.y)
          this.ctx.lineTo(this.mouse.x, this.mouse.y)
          this.ctx.stroke()
          this.ctx.globalAlpha = 1
        }
      }
    })

    requestAnimationFrame(() => this.animate())
  }
}
