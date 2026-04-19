export class GreenLeavesEffect {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.leaves = []
    this.leafCount = 40

    this.lastDrawTime = 0

    // Wind state
    this.windStrength = 0 // current horizontal push per frame
    this.windTarget = 0 // target wind strength
    this.windTimer = 0 // frames until next wind event
    this.windDuration = 0 // how many frames the gust lasts
    this.windAge = 0 // frames elapsed in current gust

    // Green color palette
    this.colors = [
      "#4caf50",
      "#388e3c",
      "#2e7d32",
      "#66bb6a",
      "#43a047",
      "#1b5e20",
      "#81c784",
      "#558b2f",
      "#33691e",
      "#7cb342",
      "#aed581",
      "#689f38",
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
        : Math.random() * -300 - 20,
      size: Math.random() * 12 + 7,
      speedY: Math.random() * 0.5 + 0.25, // slow fall
      speedX: Math.random() * 0.3 - 0.15,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 1.2 - 0.6,
      opacity: Math.random() * 0.4 + 0.55,
      swing: Math.random() * 1.2 - 0.6,
      swingSpeed: Math.random() * 0.015 + 0.005,
      swingOffset: Math.random() * Math.PI * 2,
      windSensitivity: Math.random() * 0.5 + 0.75, // how much wind affects this leaf
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
    }
  }

  // Draws a simple oval leaf with a midrib, centered at origin, pointing up
  drawLeaf(ctx, size, color, opacity) {
    const s = size
    ctx.save()

    // Leaf body (slightly asymmetric ellipse)
    ctx.beginPath()
    ctx.ellipse(0, 0, s * 0.42, s * 0.75, 0, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.globalAlpha = opacity
    ctx.fill()

    // Slightly lighter highlight on top half
    const grd = ctx.createRadialGradient(
      -s * 0.1,
      -s * 0.25,
      s * 0.05,
      0,
      -s * 0.1,
      s * 0.55,
    )
    grd.addColorStop(0, `rgba(255,255,255,${opacity * 0.28})`)
    grd.addColorStop(1, `rgba(255,255,255,0)`)
    ctx.beginPath()
    ctx.ellipse(0, 0, s * 0.42, s * 0.75, 0, 0, Math.PI * 2)
    ctx.fillStyle = grd
    ctx.fill()

    // Midrib (center vein)
    ctx.beginPath()
    ctx.moveTo(0, s * 0.72)
    ctx.bezierCurveTo(s * 0.04, s * 0.2, -s * 0.04, -s * 0.2, 0, -s * 0.72)
    ctx.strokeStyle = `rgba(0,80,0,${opacity * 0.5})`
    ctx.lineWidth = s * 0.06
    ctx.stroke()

    // A couple of side veins
    ctx.lineWidth = s * 0.03
    ctx.strokeStyle = `rgba(0,80,0,${opacity * 0.3})`

    ctx.beginPath()
    ctx.moveTo(0, s * 0.2)
    ctx.bezierCurveTo(
      s * 0.15,
      s * 0.05,
      s * 0.38,
      -s * 0.05,
      s * 0.38,
      -s * 0.18,
    )
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, s * 0.2)
    ctx.bezierCurveTo(
      -s * 0.15,
      -s * 0.05,
      -s * 0.38,
      -s * 0.05,
      -s * 0.38,
      -s * 0.18,
    )
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, -s * 0.1)
    ctx.bezierCurveTo(
      s * 0.12,
      -s * 0.25,
      s * 0.3,
      -s * 0.38,
      s * 0.28,
      -s * 0.48,
    )
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, -s * 0.1)
    ctx.bezierCurveTo(
      -s * 0.12,
      -s * 0.25,
      -s * 0.3,
      -s * 0.38,
      -s * 0.28,
      -s * 0.48,
    )
    ctx.stroke()

    // Short stem below
    ctx.beginPath()
    ctx.moveTo(0, s * 0.72)
    ctx.lineTo(0, s * 1.05)
    ctx.lineWidth = s * 0.07
    ctx.strokeStyle = `rgba(0,80,0,${opacity * 0.55})`
    ctx.stroke()

    ctx.restore()
  }

  updateWind(deltaTime) {
    if (this.windAge >= this.windDuration) {
      // End gust — fade back to calm
      this.windTarget = 0
      this.windTimer -= deltaTime
      if (this.windTimer <= 0) {
        // Schedule a new gust
        this.windTimer = Math.floor(Math.random() * 200 + 80) // 80-280 frames of calm
        this.windDuration = Math.floor(Math.random() * 90 + 40) // gust lasts 40-130 frames
        this.windAge = 0
        // Direction: left or right, strength 1.5-4.5
        const dir = Math.random() < 0.5 ? -1 : 1
        this.windTarget = dir * (Math.random() * 3 + 1.5)
      }
    } else {
      this.windAge += deltaTime
    }

    // Smooth interpolation toward target (ease in/out)
    this.windStrength += (this.windTarget - this.windStrength) * 0.04 * deltaTime
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.windStrength = 0
    this.windTarget = 0
    this.windTimer = Math.floor(Math.random() * 150 + 60)
    this.windDuration = 0
    this.windAge = 0
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

  animate(currentTime = 0) {
    if (!this.active) return

    this._animId = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    const deltaTime = elapsed / (1000 / 60) // Normalize to 60fps
    this.lastDrawTime = currentTime

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.updateWind(deltaTime)

    this.leaves.forEach((leaf) => {
      // Gravity
      leaf.y += leaf.speedY * deltaTime

      // Wind + natural horizontal drift
      const windPush = this.windStrength * leaf.windSensitivity
      leaf.x += (leaf.speedX + windPush) * deltaTime

      // Swing (pendulum-like)
      leaf.swingOffset += leaf.swingSpeed * deltaTime
      leaf.x += Math.sin(leaf.swingOffset) * leaf.swing * deltaTime

      // Rotation — spin faster in wind
      const windSpin = Math.abs(this.windStrength) * 0.4
      leaf.rotation +=
        (leaf.rotationSpeed + windSpin * Math.sign(this.windStrength || 1)) * deltaTime

      // Draw
      this.ctx.save()
      this.ctx.translate(leaf.x, leaf.y)
      this.ctx.rotate((leaf.rotation * Math.PI) / 180)
      this.drawLeaf(this.ctx, leaf.size, leaf.color, leaf.opacity)
      this.ctx.restore()

      // Reset when off screen (bottom)
      if (leaf.y > this.canvas.height + 60) {
        leaf.y = Math.random() * -100 - 20
        leaf.x = Math.random() * this.canvas.width
        leaf.opacity = Math.random() * 0.4 + 0.55
      }

      // Wrap horizontally
      if (leaf.x > this.canvas.width + 60) {
        leaf.x = -60
      } else if (leaf.x < -60) {
        leaf.x = this.canvas.width + 60
      }
    })
  }
}
