export class DNAHelixEffect {
  constructor(canvasId, color = "#00bcd4") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.time = 0

    // Config
    this.helixCount = 3
    this.segmentCount = 50
    this.radius = 80
    this.spacing = 30

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

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.time += 0.02

    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2
    const rgb = this.hexToRgb(this.color)

    // Draw multiple helixes
    for (let h = 0; h < this.helixCount; h++) {
      const helixOffset = (h / this.helixCount) * Math.PI * 2
      const yOffset = (h - (this.helixCount - 1) / 2) * 150

      // Draw connections first (behind strands)
      for (let i = 0; i < this.segmentCount; i++) {
        const progress = i / this.segmentCount
        const y =
          centerY +
          yOffset -
          this.canvas.height / 2 +
          progress * this.canvas.height

        // Calculate positions for both strands
        const angle1 = this.time + progress * Math.PI * 4 + helixOffset
        const angle2 = angle1 + Math.PI

        const x1 = centerX + Math.cos(angle1) * this.radius
        const x2 = centerX + Math.cos(angle2) * this.radius

        const z1 = Math.sin(angle1) * this.radius
        const z2 = Math.sin(angle2) * this.radius

        // Draw connection every few segments
        if (i % 3 === 0) {
          const connectionOpacity =
            0.3 * (((z1 + z2) / 2 / this.radius) * 0.5 + 0.5)

          const gradient = this.ctx.createLinearGradient(x1, y, x2, y)
          gradient.addColorStop(
            0,
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${connectionOpacity})`,
          )
          gradient.addColorStop(
            0.5,
            `rgba(${rgb.r + 50}, ${rgb.g + 50}, ${rgb.b + 50}, ${connectionOpacity * 1.5})`,
          )
          gradient.addColorStop(
            1,
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${connectionOpacity})`,
          )

          this.ctx.beginPath()
          this.ctx.strokeStyle = gradient
          this.ctx.lineWidth = 2
          this.ctx.moveTo(x1, y)
          this.ctx.lineTo(x2, y)
          this.ctx.stroke()
        }
      }

      // Draw strands
      for (let strand = 0; strand < 2; strand++) {
        const strandAngleOffset = strand * Math.PI

        for (let i = 0; i < this.segmentCount; i++) {
          const progress = i / this.segmentCount
          const y =
            centerY +
            yOffset -
            this.canvas.height / 2 +
            progress * this.canvas.height

          const angle =
            this.time + progress * Math.PI * 4 + helixOffset + strandAngleOffset
          const x = centerX + Math.cos(angle) * this.radius
          const z = Math.sin(angle) * this.radius

          // Depth-based size and opacity
          const depthFactor = (z / this.radius) * 0.5 + 0.5 // 0 to 1
          const size = 4 + depthFactor * 4
          const opacity = 0.4 + depthFactor * 0.6

          // Draw glow
          const glowGradient = this.ctx.createRadialGradient(
            x,
            y,
            0,
            x,
            y,
            size * 2,
          )
          glowGradient.addColorStop(
            0,
            `rgba(${rgb.r + 50}, ${rgb.g + 50}, ${rgb.b + 50}, ${opacity * 0.8})`,
          )
          glowGradient.addColorStop(
            0.5,
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.4})`,
          )
          glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)")

          this.ctx.beginPath()
          this.ctx.fillStyle = glowGradient
          this.ctx.arc(x, y, size * 2, 0, Math.PI * 2)
          this.ctx.fill()

          // Draw core
          this.ctx.beginPath()
          this.ctx.fillStyle = `rgba(${rgb.r + 80}, ${rgb.g + 80}, ${rgb.b + 80}, ${opacity})`
          this.ctx.arc(x, y, size * 0.6, 0, Math.PI * 2)
          this.ctx.fill()

          // Draw connecting line to next segment
          if (i < this.segmentCount - 1) {
            const nextProgress = (i + 1) / this.segmentCount
            const nextY =
              centerY +
              yOffset -
              this.canvas.height / 2 +
              nextProgress * this.canvas.height
            const nextAngle =
              this.time +
              nextProgress * Math.PI * 4 +
              helixOffset +
              strandAngleOffset
            const nextX = centerX + Math.cos(nextAngle) * this.radius
            const nextZ = Math.sin(nextAngle) * this.radius
            const nextDepthFactor = (nextZ / this.radius) * 0.5 + 0.5
            const nextOpacity = 0.3 + nextDepthFactor * 0.5

            const lineGradient = this.ctx.createLinearGradient(
              x,
              y,
              nextX,
              nextY,
            )
            lineGradient.addColorStop(
              0,
              `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.6})`,
            )
            lineGradient.addColorStop(
              1,
              `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${nextOpacity * 0.6})`,
            )

            this.ctx.beginPath()
            this.ctx.strokeStyle = lineGradient
            this.ctx.lineWidth = 2
            this.ctx.moveTo(x, y)
            this.ctx.lineTo(nextX, nextY)
            this.ctx.stroke()
          }
        }
      }
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
