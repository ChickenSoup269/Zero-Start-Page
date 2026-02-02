export class NetworkEffect {
  constructor(canvasId, color = "#00bcd4") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.particles = []
    this.active = false
    this.color = color

    // Cấu hình nâng cao
    this.particleCount = 100
    this.connectionDistance = 150
    this.mouseDistance = 250
    this.mouseRepelForce = 0.5
    this.hoverNodes = []
    this.pulseTime = 0

    this.resize()
    window.addEventListener("resize", () => this.resize())

    // Tương tác chuột nâng cao
    this.mouse = { x: null, y: null, radius: 100 }
    this.mouseVelocity = { x: 0, y: 0 }
    this.lastMousePos = { x: 0, y: 0 }

    window.addEventListener("mousemove", (e) => {
      this.mouseVelocity.x = e.x - this.lastMousePos.x
      this.mouseVelocity.y = e.y - this.lastMousePos.y
      this.lastMousePos.x = e.x
      this.lastMousePos.y = e.y
      this.mouse.x = e.x
      this.mouse.y = e.y
    })
    window.addEventListener("mouseout", () => {
      this.mouse.x = null
      this.mouse.y = null
      this.mouseVelocity = { x: 0, y: 0 }
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
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 2.5 + 1.5,
        baseSize: Math.random() * 2.5 + 1.5,
        originalVx: (Math.random() - 0.5) * 2,
        originalVy: (Math.random() - 0.5) * 2,
        connections: 0,
        brightness: Math.random() * 0.3 + 0.7, // Độ sáng khác nhau
      })
    }
  }

  animate() {
    if (!this.active) return
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.pulseTime += 0.02

    // Reset connection count
    this.particles.forEach((p) => (p.connections = 0))

    // Xử lý từng hạt
    this.particles.forEach((p, index) => {
      // Tương tác với chuột - hút hoặc đẩy
      if (this.mouse.x != null) {
        const dx = this.mouse.x - p.x
        const dy = this.mouse.y - p.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < this.mouseDistance) {
          // Đẩy particle ra xa chuột
          const force =
            ((this.mouseDistance - distance) / this.mouseDistance) *
            this.mouseRepelForce
          const angle = Math.atan2(dy, dx)
          p.vx -= Math.cos(angle) * force
          p.vy -= Math.sin(angle) * force

          // Tăng size khi gần chuột
          p.size = p.baseSize * (1 + (1 - distance / this.mouseDistance) * 0.8)
        } else {
          // Trở về size ban đầu
          p.size += (p.baseSize - p.size) * 0.1
        }
      } else {
        p.size += (p.baseSize - p.size) * 0.1
      }

      // Cập nhật vị trí
      p.x += p.vx
      p.y += p.vy

      // Áp dụng ma sát để giảm tốc độ
      p.vx *= 0.98
      p.vy *= 0.98

      // Giới hạn tốc độ
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
      if (speed > 3) {
        p.vx = (p.vx / speed) * 3
        p.vy = (p.vy / speed) * 3
      }

      // Bounce khi chạm biên với hiệu ứng mềm
      if (p.x < 0 || p.x > this.canvas.width) {
        p.vx *= -0.8
        p.x = Math.max(0, Math.min(this.canvas.width, p.x))
      }
      if (p.y < 0 || p.y > this.canvas.height) {
        p.vy *= -0.8
        p.y = Math.max(0, Math.min(this.canvas.height, p.y))
      }

      // Thêm lực hấp dẫn nhẹ về tốc độ ban đầu
      p.vx += (p.originalVx - p.vx) * 0.005
      p.vy += (p.originalVy - p.vy) * 0.005

      // Vẽ hạt với glow effect
      const gradient = this.ctx.createRadialGradient(
        p.x,
        p.y,
        0,
        p.x,
        p.y,
        p.size * 2,
      )
      const rgb = this.hexToRgb(this.color)
      gradient.addColorStop(
        0,
        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.brightness})`,
      )
      gradient.addColorStop(
        0.5,
        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.brightness * 0.5})`,
      )
      gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      this.ctx.fillStyle = gradient
      this.ctx.fill()

      // Vẽ core sáng hơn
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.brightness * 1.2})`
      this.ctx.fill()

      // Nối dây với các hạt khác - với hiệu ứng data flow
      for (let j = index + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j]
        const dx = p.x - p2.x
        const dy = p.y - p2.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < this.connectionDistance) {
          p.connections++
          p2.connections++

          const opacity = (1 - distance / this.connectionDistance) * 0.6

          // Gradient line với data flow effect
          const gradient = this.ctx.createLinearGradient(p.x, p.y, p2.x, p2.y)
          const flowOffset = (this.pulseTime * 2) % 1

          gradient.addColorStop(
            0,
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.2})`,
          )
          gradient.addColorStop(
            flowOffset,
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`,
          )
          gradient.addColorStop(
            1,
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.2})`,
          )

          this.ctx.beginPath()
          this.ctx.strokeStyle = gradient
          this.ctx.lineWidth = Math.max(
            0.5,
            2 - distance / this.connectionDistance,
          )
          this.ctx.moveTo(p.x, p.y)
          this.ctx.lineTo(p2.x, p2.y)
          this.ctx.stroke()
        }
      }

      // Nối dây với chuột - với hiệu ứng đặc biệt
      if (this.mouse.x != null) {
        const dx = p.x - this.mouse.x
        const dy = p.y - this.mouse.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < this.mouseDistance) {
          const opacity = (1 - distance / this.mouseDistance) * 0.8
          const gradient = this.ctx.createLinearGradient(
            p.x,
            p.y,
            this.mouse.x,
            this.mouse.y,
          )

          gradient.addColorStop(
            0,
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.3})`,
          )
          gradient.addColorStop(
            0.5,
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`,
          )
          gradient.addColorStop(1, `rgba(255, 255, 255, ${opacity * 0.6})`)

          this.ctx.beginPath()
          this.ctx.strokeStyle = gradient
          this.ctx.lineWidth = 2
          this.ctx.moveTo(p.x, p.y)
          this.ctx.lineTo(this.mouse.x, this.mouse.y)
          this.ctx.stroke()
        }
      }
    })

    // Vẽ mouse cursor effect
    if (this.mouse.x != null) {
      const rgb = this.hexToRgb(this.color)
      const pulse = Math.sin(this.pulseTime * 3) * 0.3 + 0.7

      this.ctx.beginPath()
      this.ctx.arc(this.mouse.x, this.mouse.y, 8, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.2 * pulse})`
      this.ctx.fill()

      this.ctx.beginPath()
      this.ctx.arc(this.mouse.x, this.mouse.y, 15, 0, Math.PI * 2)
      this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.4 * pulse})`
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }

    requestAnimationFrame(() => this.animate())
  }

  hexToRgb(hex) {
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
