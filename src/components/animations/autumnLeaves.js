export class AutumnLeavesEffect {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.leaves = []
    this.leafCount = 45

    this.lastDrawTime = 0

    // Autumn color palette (red, orange, amber tones)
    this.colors = [
      "#e06020",
      "#cc4400",
      "#e83a00",
      "#f07810",
      "#c83000",
      "#e85010",
      "#d45000",
      "#b83200",
      "#f09020",
      "#dc6015",
      "#a02800",
      "#f05c00",
    ]

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initLeaves()
  }

  initLeaves() {
    this.leaves = []
    for (let i = 0; i < this.leafCount; i++) {
      this.leaves.push(this.createLeaf(true))
    }
  }

  createLeaf(scattered = false) {
    return {
      x: Math.random() * this.canvas.width,
      y: scattered
        ? Math.random() * this.canvas.height
        : Math.random() * -200 - 30,
      size: Math.random() * 14 + 9,
      speedY: Math.random() * 0.65 + 0.35,
      speedX: Math.random() * 0.4 - 0.2,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 1.8 - 0.9,
      opacity: Math.random() * 0.45 + 0.55,
      swing: Math.random() * 1.8 - 0.9,
      swingSpeed: Math.random() * 0.018 + 0.006,
      swingOffset: Math.random() * Math.PI * 2,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.initLeaves()
    this.animate(performance.now())
    this.canvas.style.display = "block"
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  // Draws a 5-lobe maple leaf centered at origin, pointing upward.
  // `size` controls the overall scale.
  drawMapleLeaf(ctx, size) {
    const s = size
    ctx.beginPath()

    // Stem bottom
    ctx.moveTo(0, s * 0.9)
    ctx.lineTo(s * 0.08, s * 0.55)

    // Base-right small wing
    ctx.bezierCurveTo(s * 0.2, s * 0.5, s * 0.48, s * 0.62, s * 0.44, s * 0.38)
    // Notch after wing
    ctx.bezierCurveTo(s * 0.4, s * 0.22, s * 0.22, s * 0.18, s * 0.24, s * 0.02)

    // Right lobe tip
    ctx.bezierCurveTo(
      s * 0.38,
      -s * 0.08,
      s * 0.92,
      s * 0.02,
      s * 0.9,
      -s * 0.18,
    )
    // Notch after right lobe
    ctx.bezierCurveTo(
      s * 0.88,
      -s * 0.3,
      s * 0.58,
      -s * 0.26,
      s * 0.52,
      -s * 0.38,
    )

    // Upper-right lobe tip
    ctx.bezierCurveTo(
      s * 0.58,
      -s * 0.56,
      s * 0.48,
      -s * 0.76,
      s * 0.3,
      -s * 0.7,
    )
    // Notch after upper-right lobe
    ctx.bezierCurveTo(
      s * 0.2,
      -s * 0.66,
      s * 0.14,
      -s * 0.72,
      s * 0.12,
      -s * 0.86,
    )

    // Top center lobe
    ctx.bezierCurveTo(s * 0.08, -s * 1.0, s * 0.02, -s * 1.05, 0, -s * 1.0)

    // Mirror: notch before upper-left lobe
    ctx.bezierCurveTo(
      -s * 0.02,
      -s * 1.05,
      -s * 0.08,
      -s * 1.0,
      -s * 0.12,
      -s * 0.86,
    )
    // Upper-left lobe tip
    ctx.bezierCurveTo(
      -s * 0.14,
      -s * 0.72,
      -s * 0.2,
      -s * 0.66,
      -s * 0.3,
      -s * 0.7,
    )

    // Notch
    ctx.bezierCurveTo(
      -s * 0.48,
      -s * 0.76,
      -s * 0.58,
      -s * 0.56,
      -s * 0.52,
      -s * 0.38,
    )

    // Left lobe tip
    ctx.bezierCurveTo(
      -s * 0.58,
      -s * 0.26,
      -s * 0.88,
      -s * 0.3,
      -s * 0.9,
      -s * 0.18,
    )
    // Notch after left lobe
    ctx.bezierCurveTo(
      -s * 0.92,
      s * 0.02,
      -s * 0.38,
      -s * 0.08,
      -s * 0.24,
      s * 0.02,
    )

    // Notch before base-left wing
    ctx.bezierCurveTo(
      -s * 0.22,
      s * 0.18,
      -s * 0.4,
      s * 0.22,
      -s * 0.44,
      s * 0.38,
    )
    // Base-left small wing
    ctx.bezierCurveTo(
      -s * 0.48,
      s * 0.62,
      -s * 0.2,
      s * 0.5,
      -s * 0.08, s * 0.55,
    )

    ctx.lineTo(0, s * 0.9)
    ctx.closePath()
  }

  // Draws simple vein lines clipped to the leaf shape
  drawVeins(ctx, size, opacity) {
    const s = size
    ctx.strokeStyle = `rgba(0, 0, 0, \${opacity * 0.22})`
    ctx.lineWidth = 0.7

    // Center vein
    ctx.beginPath()
    ctx.moveTo(0, s * 0.55)
    ctx.bezierCurveTo(0, s * 0.1, 0, -s * 0.5, 0, -s * 0.9)
    ctx.stroke()

    // Right mid vein
    ctx.beginPath()
    ctx.moveTo(0, s * 0.05)
    ctx.bezierCurveTo(
      s * 0.3,
      -s * 0.02,
      s * 0.7,
      -s * 0.08,
      s * 0.82,
      -s * 0.15,
    )
    ctx.stroke()

    // Left mid vein
    ctx.beginPath()
    ctx.moveTo(0, s * 0.05)
    ctx.bezierCurveTo(
      -s * 0.3,
      -s * 0.02,
      -s * 0.7,
      -s * 0.08,
      -s * 0.82,
      -s * 0.15,
    )
    ctx.stroke()

    // Upper-right vein
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.32)
    ctx.bezierCurveTo(
      s * 0.18,
      -s * 0.42,
      s * 0.38,
      -s * 0.6,
      s * 0.42,
      -s * 0.65,
    )
    ctx.stroke()

    // Upper-left vein
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.32)
    ctx.bezierCurveTo(
      -s * 0.18,
      -s * 0.42,
      -s * 0.38,
      -s * 0.6,
      -s * 0.42,
      -s * 0.65,
    )
    ctx.stroke()
  }

  animate(currentTime = 0) {
    if (!this.active) return

    this._animId = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    const deltaTime = elapsed / (1000 / 60) // Normalize to 60fps
    this.lastDrawTime = currentTime

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.leaves.forEach((leaf) => {
      leaf.y += leaf.speedY * deltaTime
      leaf.rotation += leaf.rotationSpeed * deltaTime
      leaf.swingOffset += leaf.swingSpeed * deltaTime
      leaf.x += (Math.sin(leaf.swingOffset) * leaf.swing + leaf.speedX) * deltaTime

      this.ctx.save()
      this.ctx.translate(leaf.x, leaf.y)
      this.ctx.rotate((leaf.rotation * Math.PI) / 180)
      this.ctx.globalAlpha = leaf.opacity

      // Fill the maple leaf
      this.drawMapleLeaf(this.ctx, leaf.size)
      this.ctx.fillStyle = leaf.color
      this.ctx.fill()

      // Thin dark outline
      this.ctx.strokeStyle = "rgba(0, 0, 0, 0.18)"
      this.ctx.lineWidth = 0.5
      this.ctx.stroke()

      // Vein detail (clip to leaf shape first)
      this.ctx.save()
      this.drawMapleLeaf(this.ctx, leaf.size)
      this.ctx.clip()
      this.drawVeins(this.ctx, leaf.size, leaf.opacity)
      this.ctx.restore()

      this.ctx.restore()

      // Reset leaf when it falls off the bottom
      if (leaf.y > this.canvas.height + 80) {
        const refreshed = this.createLeaf(false)
        Object.assign(leaf, refreshed)
      }

      // Wrap horizontally
      if (leaf.x > this.canvas.width + 80) leaf.x = -80
      else if (leaf.x < -80) leaf.x = this.canvas.width + 80
    })
  }
}
