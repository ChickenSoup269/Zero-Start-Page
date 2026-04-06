export class BubblesEffect {
  constructor(canvasId, color = "#60c8ff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.bubbles = []
    this.bubbleCount = 60

    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initBubbles()
  }

  initBubbles() {
    this.bubbles = []
    for (let i = 0; i < this.bubbleCount; i++) {
      this.bubbles.push(this.createBubble(true))
    }
  }

  /**
   * @param {boolean} randomY - If true, spawn bubble at random height (init); else spawn at bottom
   */
  createBubble(randomY = false) {
    const size = Math.random() * 18 + 4 // 4px – 22px radius
    const x = Math.random() * this.canvas.width
    const y = randomY
      ? Math.random() * this.canvas.height
      : this.canvas.height + size + Math.random() * 100

    return {
      x,
      y,
      size,
      speedY: Math.random() * 0.8 + 0.3, // Upward speed
      swayAmplitude: Math.random() * 30 + 10, // How wide the sway is
      swaySpeed: Math.random() * 0.015 + 0.005,
      swayOffset: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.35 + 0.15, // Semi-transparent
      // Slightly varying tint per bubble (warm/cold)
      tint: Math.random() * 40 - 20,
    }
  }

  /**
   * Parse hex color into {r, g, b}
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 96, g: 200, b: 255 }
  }

  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v))
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.initBubbles()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  drawBubble(bubble, rgb) {
    const ctx = this.ctx
    const { x, y, size, opacity } = bubble

    ctx.save()

    // --- Outer glow (soft halo) ---
    const glowGrad = ctx.createRadialGradient(
      x,
      y,
      size * 0.5,
      x,
      y,
      size * 2.2,
    )
    glowGrad.addColorStop(
      0,
      `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.18})`,
    )
    glowGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
    ctx.beginPath()
    ctx.arc(x, y, size * 2.2, 0, Math.PI * 2)
    ctx.fillStyle = glowGrad
    ctx.fill()

    // --- Bubble body (glass sphere, dark edge + transparent interior) ---
    const bodyGrad = ctx.createRadialGradient(
      x - size * 0.25,
      y - size * 0.25,
      size * 0.05,
      x,
      y,
      size,
    )
    bodyGrad.addColorStop(
      0,
      `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.25})`,
    )
    bodyGrad.addColorStop(
      0.6,
      `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.1})`,
    )
    bodyGrad.addColorStop(
      1,
      `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.55})`,
    )

    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fillStyle = bodyGrad
    ctx.fill()

    // --- Thin rim ---
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.8})`
    ctx.lineWidth = Math.max(0.5, size * 0.06)
    ctx.stroke()

    // --- Primary specular highlight (top-left) ---
    const hlSize = size * 0.32
    const hlX = x - size * 0.3
    const hlY = y - size * 0.3

    const hlGrad = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, hlSize)
    hlGrad.addColorStop(0, `rgba(255, 255, 255, ${opacity * 1.8 + 0.25})`)
    hlGrad.addColorStop(0.5, `rgba(255, 255, 255, ${opacity * 0.6})`)
    hlGrad.addColorStop(1, `rgba(255, 255, 255, 0)`)

    ctx.beginPath()
    ctx.arc(hlX, hlY, hlSize, 0, Math.PI * 2)
    ctx.fillStyle = hlGrad
    ctx.fill()

    // --- Secondary small specular ---
    const hl2X = x + size * 0.3
    const hl2Y = y + size * 0.28
    const hl2Size = size * 0.12

    const hlGrad2 = ctx.createRadialGradient(hl2X, hl2Y, 0, hl2X, hl2Y, hl2Size)
    hlGrad2.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.9})`)
    hlGrad2.addColorStop(1, `rgba(255, 255, 255, 0)`)

    ctx.beginPath()
    ctx.arc(hl2X, hl2Y, hl2Size, 0, Math.PI * 2)
    ctx.fillStyle = hlGrad2
    ctx.fill()

    ctx.restore()
  }

  animate(currentTime = 0) {
    if (!this.active) return

    this._animId = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const rgb = this.hexToRgb(this.color)

    this.bubbles.forEach((bubble, i) => {
      // Update position: rise upward
      bubble.y -= bubble.speedY

      // Gentle horizontal sway (sinusoidal)
      bubble.swayOffset += bubble.swaySpeed
      bubble.x += Math.sin(bubble.swayOffset) * 0.4

      // Respawn bubble when it exits the top
      if (bubble.y + bubble.size < 0) {
        this.bubbles[i] = this.createBubble(false)
        return
      }

      // Keep bubble within horizontal bounds (wrap around)
      if (bubble.x < -bubble.size * 2)
        bubble.x = this.canvas.width + bubble.size
      if (bubble.x > this.canvas.width + bubble.size * 2)
        bubble.x = -bubble.size

      this.drawBubble(bubble, rgb)
    })
  }
}
