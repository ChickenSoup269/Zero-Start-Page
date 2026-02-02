export class AuroraWaveEffect {
  constructor(canvasId, color = "#00bcd4") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.time = 0

    // Config
    this.waveCount = 5
    this.wavePoints = 100
    this.waveAmplitude = 100
    this.waveFrequency = 0.01

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
    this.animate()
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  animate() {
    if (!this.active) return

    // Fade effect for aurora trails
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.03)"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.time += 0.01

    const rgb = this.hexToRgb(this.color)
    const centerY = this.canvas.height * 0.6

    // Draw multiple aurora waves
    for (let w = 0; w < this.waveCount; w++) {
      const waveOffset = (w / this.waveCount) * Math.PI * 2
      const yOffset = (w - this.waveCount / 2) * 40
      const hueShift = (w / this.waveCount) * 60 - 30

      // Create wave path
      this.ctx.beginPath()

      for (let i = 0; i <= this.wavePoints; i++) {
        const x = (i / this.wavePoints) * this.canvas.width

        // Multiple wave layers with different frequencies
        const wave1 =
          Math.sin(x * this.waveFrequency + this.time + waveOffset) *
          this.waveAmplitude
        const wave2 =
          Math.sin(x * this.waveFrequency * 2 + this.time * 1.5 + waveOffset) *
          (this.waveAmplitude * 0.5)
        const wave3 =
          Math.sin(
            x * this.waveFrequency * 0.5 + this.time * 0.7 + waveOffset,
          ) *
          (this.waveAmplitude * 1.5)

        const y = centerY + yOffset + wave1 + wave2 + wave3

        if (i === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }

      // Create gradient fill
      const gradient = this.ctx.createLinearGradient(
        0,
        centerY + yOffset - this.waveAmplitude * 3,
        0,
        centerY + yOffset + this.waveAmplitude * 3,
      )

      gradient.addColorStop(
        0,
        `rgba(${rgb.r + hueShift}, ${rgb.g + hueShift}, ${rgb.b + Math.abs(hueShift)}, 0)`,
      )
      gradient.addColorStop(
        0.3,
        `rgba(${rgb.r + hueShift}, ${rgb.g + hueShift}, ${rgb.b + Math.abs(hueShift)}, ${0.15 + w * 0.05})`,
      )
      gradient.addColorStop(
        0.5,
        `rgba(${rgb.r + hueShift + 30}, ${rgb.g + hueShift + 30}, ${rgb.b + Math.abs(hueShift) + 30}, ${0.25 + w * 0.05})`,
      )
      gradient.addColorStop(
        0.7,
        `rgba(${rgb.r + hueShift}, ${rgb.g + hueShift}, ${rgb.b + Math.abs(hueShift)}, ${0.15 + w * 0.05})`,
      )
      gradient.addColorStop(
        1,
        `rgba(${rgb.r + hueShift}, ${rgb.g + hueShift}, ${rgb.b + Math.abs(hueShift)}, 0)`,
      )

      // Draw wave with blur effect
      this.ctx.strokeStyle = gradient
      this.ctx.lineWidth = 30 + w * 10
      this.ctx.lineCap = "round"
      this.ctx.lineJoin = "round"
      this.ctx.shadowBlur = 20
      this.ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`
      this.ctx.stroke()

      // Add shimmer particles along the wave
      for (let i = 0; i < 15; i++) {
        const progress = (i / 15 + this.time * 0.2 + w * 0.1) % 1
        const x = progress * this.canvas.width

        const wave1 =
          Math.sin(x * this.waveFrequency + this.time + waveOffset) *
          this.waveAmplitude
        const wave2 =
          Math.sin(x * this.waveFrequency * 2 + this.time * 1.5 + waveOffset) *
          (this.waveAmplitude * 0.5)
        const wave3 =
          Math.sin(
            x * this.waveFrequency * 0.5 + this.time * 0.7 + waveOffset,
          ) *
          (this.waveAmplitude * 1.5)

        const y = centerY + yOffset + wave1 + wave2 + wave3

        // Particle size based on wave intensity
        const intensity = Math.abs(Math.sin(progress * Math.PI)) * 0.7 + 0.3
        const size = 3 * intensity

        // Draw particle glow
        const particleGradient = this.ctx.createRadialGradient(
          x,
          y,
          0,
          x,
          y,
          size * 4,
        )
        particleGradient.addColorStop(
          0,
          `rgba(${rgb.r + 80}, ${rgb.g + 80}, ${rgb.b + 80}, ${intensity * 0.8})`,
        )
        particleGradient.addColorStop(
          0.5,
          `rgba(${rgb.r + 40}, ${rgb.g + 40}, ${rgb.b + 40}, ${intensity * 0.4})`,
        )
        particleGradient.addColorStop(1, "rgba(255, 255, 255, 0)")

        this.ctx.beginPath()
        this.ctx.fillStyle = particleGradient
        this.ctx.arc(x, y, size * 4, 0, Math.PI * 2)
        this.ctx.fill()

        // Core
        this.ctx.beginPath()
        this.ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.9})`
        this.ctx.arc(x, y, size, 0, Math.PI * 2)
        this.ctx.fill()
      }

      // Reset shadow
      this.ctx.shadowBlur = 0
    }

    // Add floating particles
    for (let i = 0; i < 30; i++) {
      const x = (i * 37 + this.time * 20) % this.canvas.width
      const y = centerY + Math.sin(x * 0.02 + this.time + i) * 200
      const size = Math.random() * 2 + 1
      const opacity = Math.sin(this.time * 2 + i) * 0.3 + 0.4

      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size * 3)
      gradient.addColorStop(
        0,
        `rgba(${rgb.r + 50}, ${rgb.g + 50}, ${rgb.b + 50}, ${opacity})`,
      )
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)")

      this.ctx.beginPath()
      this.ctx.fillStyle = gradient
      this.ctx.arc(x, y, size * 3, 0, Math.PI * 2)
      this.ctx.fill()
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
