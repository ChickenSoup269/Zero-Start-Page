export class FallingLeavesSettledEffect {
  constructor(canvasId, leafType = "maple") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.leaves = [] // Falling leaves
    this.settledLeaves = [] // Leaves that have settled on the ground
    this.leafCount = 50
    this.leafType = leafType

    this.fps = 60 // Smooth 60 FPS
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    // Wind state
    this.windStrength = 0 // current horizontal push per frame
    this.windTarget = 0 // target wind strength
    this.windTimer = 0 // frames until next wind event
    this.windDuration = 0 // how many frames the gust lasts
    this.windAge = 0 // frames elapsed in current gust

    // Color palettes for different leaf types
    this.colorPalettes = {
      maple: [
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
        "#8B5A2B",
        "#A0522D",
        "#D2691E",
        "#CD853F",
      ],
      oak: [
        "#B8860B",
        "#CD853F",
        "#DAA520",
        "#D2B48C",
        "#8B4513",
        "#A0522D",
        "#8B5A2B",
        "#A0826D",
        "#D2A679",
        "#BC8F8F",
      ],
      simple: [
        "#90EE90",
        "#3CB371",
        "#228B22",
        "#6BBF59",
        "#7CB342",
        "#8BC34A",
        "#9CCC65",
        "#CDDC39",
      ],
      ginkgo: [
        "#FFD700",
        "#FFA500",
        "#FF8C00",
        "#F0E68C",
        "#EEE8AA",
        "#FFE4B5",
        "#DEB887",
        "#D2B48C",
      ],
      cherry: [
        "#FFB7D9",
        "#FF9DC5",
        "#FFC0CB",
        "#FFB6D9",
        "#FFA8D3",
        "#FFB0D0",
        "#FFC1E0",
        "#FFADDC",
        "#FF99CC",
        "#FFD1E8",
      ],
      cherryPetal: [
        "#FFD4E8",
        "#FFC6E0",
        "#FFB9DA",
        "#FFABD3",
        "#FF9ECD",
        "#FF91C7",
        "#F987BF",
        "#F27FB8",
      ],
      plum: [
        "#E075A0",
        "#D1569E",
        "#E18DB9",
        "#D96BA8",
        "#E088B3",
        "#DA5BA3",
        "#E2A0C2",
        "#D87DB2",
        "#F0A8C8",
        "#E59BC9",
      ],
    }

    this.colors = this.colorPalettes[this.leafType] || this.colorPalettes.maple

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  setLeafType(leafType) {
    this.leafType = leafType
    this.colors = this.colorPalettes[leafType] || this.colorPalettes.maple
    // Restart with new leaf type
    this.initLeaves()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initLeaves()
  }

  initLeaves() {
    this.leaves = []
    this.settledLeaves = []
    for (let i = 0; i < this.leafCount; i++) {
      this.leaves.push(this.createLeaf(true))
    }
  }

  createLeaf(scattered = false) {
    const baseSize = Math.random() * 14 + 9
    const sizeMultiplier =
      this.leafType === "cherryPetal"
        ? 1.45
        : this.leafType === "cherry"
          ? 1.2
          : 1

    return {
      x: Math.random() * this.canvas.width,
      y: scattered
        ? Math.random() * this.canvas.height
        : Math.random() * -200 - 30,
      size: baseSize * sizeMultiplier,
      speedY: Math.random() * 0.35 + 0.15, // Slower fall speed for smoothness
      speedX: Math.random() * 0.3 - 0.15,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 1.2 - 0.6,
      opacity: Math.random() * 0.45 + 0.55,
      swing: Math.random() * 1.5 - 0.75,
      swingSpeed: Math.random() * 0.015 + 0.005,
      swingOffset: Math.random() * Math.PI * 2,
      windSensitivity: Math.random() * 0.5 + 0.75, // how much wind affects this leaf
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      settlingState: "falling", // "falling" or "settling"
      settlingProgress: 0, // 0 to 1 for smooth settling animation
      startSettleX: 0,
      startSettleY: 0,
      targetSettleX: 0,
      targetSettleY: 0,
    }
  }

  updateWind() {
    if (this.windAge >= this.windDuration) {
      // End gust — fade back to calm
      this.windTarget = 0
      this.windTimer--
      if (this.windTimer <= 0) {
        // Schedule a new gust
        this.windTimer = Math.floor(Math.random() * 200 + 80) // 80-280 frames of calm
        this.windDuration = Math.floor(Math.random() * 90 + 40) // gust lasts 40-130 frames
        this.windAge = 0
        // Direction: left or right, strength 1.0-3.0
        const dir = Math.random() < 0.5 ? -1 : 1
        this.windTarget = dir * (Math.random() * 2 + 1.0)
      }
    } else {
      this.windAge++
    }

    // Smooth interpolation toward target (ease in/out)
    this.windStrength += (this.windTarget - this.windStrength) * 0.04
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.windStrength = 0
    this.windTarget = 0
    this.windTimer = Math.floor(Math.random() * 150 + 60)
    this.windDuration = 0
    this.windAge = 0
    this.initLeaves()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  // Draws a 5-lobe maple leaf centered at origin
  drawMapleLeaf(ctx, size) {
    const s = size
    ctx.beginPath()

    ctx.moveTo(0, s * 0.9)
    ctx.lineTo(s * 0.08, s * 0.55)

    ctx.bezierCurveTo(s * 0.2, s * 0.5, s * 0.48, s * 0.62, s * 0.44, s * 0.38)
    ctx.bezierCurveTo(s * 0.4, s * 0.22, s * 0.22, s * 0.18, s * 0.24, s * 0.02)

    ctx.bezierCurveTo(
      s * 0.38,
      -s * 0.08,
      s * 0.92,
      s * 0.02,
      s * 0.9,
      -s * 0.18,
    )
    ctx.bezierCurveTo(
      s * 0.88,
      -s * 0.3,
      s * 0.58,
      -s * 0.26,
      s * 0.52,
      -s * 0.38,
    )

    ctx.bezierCurveTo(
      s * 0.58,
      -s * 0.56,
      s * 0.48,
      -s * 0.76,
      s * 0.3,
      -s * 0.7,
    )
    ctx.bezierCurveTo(
      s * 0.2,
      -s * 0.66,
      s * 0.14,
      -s * 0.72,
      s * 0.12,
      -s * 0.86,
    )

    ctx.bezierCurveTo(s * 0.08, -s * 1.0, s * 0.02, -s * 1.05, 0, -s * 1.0)

    ctx.bezierCurveTo(
      -s * 0.02,
      -s * 1.05,
      -s * 0.08,
      -s * 1.0,
      -s * 0.12,
      -s * 0.86,
    )
    ctx.bezierCurveTo(
      -s * 0.14,
      -s * 0.72,
      -s * 0.2,
      -s * 0.66,
      -s * 0.3,
      -s * 0.7,
    )

    ctx.bezierCurveTo(
      -s * 0.48,
      -s * 0.76,
      -s * 0.58,
      -s * 0.56,
      -s * 0.52,
      -s * 0.38,
    )

    ctx.bezierCurveTo(
      -s * 0.58,
      -s * 0.26,
      -s * 0.88,
      -s * 0.3,
      -s * 0.9,
      -s * 0.18,
    )
    ctx.bezierCurveTo(
      -s * 0.92,
      s * 0.02,
      -s * 0.38,
      -s * 0.08,
      -s * 0.24,
      s * 0.02,
    )

    ctx.bezierCurveTo(
      -s * 0.22,
      s * 0.18,
      -s * 0.4,
      s * 0.22,
      -s * 0.44,
      s * 0.38,
    )
    ctx.bezierCurveTo(
      -s * 0.48,
      s * 0.62,
      -s * 0.2,
      s * 0.5,
      -s * 0.08,
      s * 0.55,
    )

    ctx.lineTo(0, s * 0.9)
    ctx.closePath()
  }

  // Oak leaf with rounded lobes
  drawOakLeaf(ctx, size) {
    const s = size
    ctx.beginPath()
    ctx.moveTo(0, s * 0.85)

    // Right side lobes
    ctx.bezierCurveTo(s * 0.25, s * 0.7, s * 0.35, s * 0.45, s * 0.3, s * 0.2)
    ctx.bezierCurveTo(s * 0.4, s * 0.15, s * 0.5, s * 0.0, s * 0.4, -s * 0.3)
    ctx.bezierCurveTo(s * 0.35, -s * 0.5, s * 0.15, -s * 0.65, 0, -s * 0.7)

    // Left side lobes (mirror)
    ctx.bezierCurveTo(
      -s * 0.15,
      -s * 0.65,
      -s * 0.35,
      -s * 0.5,
      -s * 0.4,
      -s * 0.3,
    )
    ctx.bezierCurveTo(-s * 0.5, s * 0.0, -s * 0.4, s * 0.15, -s * 0.3, s * 0.2)
    ctx.bezierCurveTo(-s * 0.35, s * 0.45, -s * 0.25, s * 0.7, 0, s * 0.85)

    ctx.closePath()
  }

  // Simple rounded leaf (oval)
  drawSimpleLeaf(ctx, size) {
    const s = size
    ctx.beginPath()
    ctx.ellipse(0, 0, s * 0.35, s * 0.7, 0, 0, Math.PI * 2)
    ctx.closePath()
  }

  // Ginkgo fan-shaped leaf
  drawGinkgoLeaf(ctx, size) {
    const s = size
    ctx.beginPath()
    ctx.moveTo(0, s * 0.85)

    // Create fan shape
    ctx.bezierCurveTo(-s * 0.5, s * 0.3, -s * 0.6, -s * 0.1, -s * 0.3, -s * 0.7)
    ctx.bezierCurveTo(
      -s * 0.1,
      -s * 0.85,
      s * 0.1,
      -s * 0.85,
      s * 0.3,
      -s * 0.7,
    )
    ctx.bezierCurveTo(s * 0.6, -s * 0.1, s * 0.5, s * 0.3, 0, s * 0.85)

    ctx.closePath()
  }

  // Cherry blossom - 5-petal flower
  drawCherryBlossom(ctx, size) {
    const s = size
    const petalCount = 5
    const petalSize = s * 0.6

    ctx.save()
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2
      ctx.save()
      ctx.translate(
        Math.cos(angle) * petalSize * 0.5,
        Math.sin(angle) * petalSize * 0.5,
      )
      ctx.rotate(angle)

      // Draw petal (rounded shape)
      ctx.beginPath()
      ctx.ellipse(0, 0, petalSize * 0.35, petalSize * 0.5, 0, 0, Math.PI * 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.restore()
    }

    // Center circle
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2)
    ctx.fillStyle = "#FFD700"
    ctx.fill()
    ctx.restore()
  }

  // Sakura petal style (matching sakura effect silhouette)
  drawCherryPetal(ctx, size) {
    const s = size
    ctx.beginPath()
    ctx.ellipse(0, 0, s * 0.52, s * 0.78, 0, 0, Math.PI * 2)
    ctx.closePath()
  }

  // Plum blossom - 5-petal flower (slightly different from cherry)
  drawPlumBlossom(ctx, size) {
    const s = size
    const petalCount = 5
    const petalSize = s * 0.55

    ctx.save()
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2 + Math.PI / 10
      ctx.save()
      ctx.translate(
        Math.cos(angle) * petalSize * 0.55,
        Math.sin(angle) * petalSize * 0.55,
      )
      ctx.rotate(angle)

      // Draw petal (more rounded than cherry)
      ctx.beginPath()
      ctx.ellipse(0, 0, petalSize * 0.32, petalSize * 0.48, 0, 0, Math.PI * 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.restore()
    }

    // Center circle (darker for plum)
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2)
    ctx.fillStyle = "#C94C7C"
    ctx.fill()
    ctx.restore()
  }

  drawVeins(ctx, size, opacity, leafType) {
    const s = size
    const type = leafType || this.leafType

    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.22})`
    ctx.lineWidth = 0.7

    if (type === "maple") {
      // Maple veins
      ctx.beginPath()
      ctx.moveTo(0, s * 0.55)
      ctx.bezierCurveTo(0, s * 0.1, 0, -s * 0.5, 0, -s * 0.9)
      ctx.stroke()

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
    } else if (type === "oak") {
      // Oak veins - central vein with side branches
      ctx.beginPath()
      ctx.moveTo(0, s * 0.85)
      ctx.lineTo(0, -s * 0.7)
      ctx.stroke()

      for (let i = 0; i < 3; i++) {
        const y = s * 0.6 - i * s * 0.4
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(s * 0.25, y - s * 0.15)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(-s * 0.25, y - s * 0.15)
        ctx.stroke()
      }
    } else if (type === "ginkgo") {
      // Ginkgo fan veins
      for (let i = 0; i < 5; i++) {
        const angle = (-45 + i * 22.5) * (Math.PI / 180)
        ctx.beginPath()
        ctx.moveTo(0, s * 0.85)
        ctx.lineTo(
          Math.cos(angle) * s * 0.6,
          s * 0.85 + Math.sin(angle) * -s * 0.6,
        )
        ctx.stroke()
      }
    } else if (type === "cherryPetal") {
      // Sakura petal detail lines
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.5})`
      ctx.lineWidth = Math.max(0.45, s * 0.08)
      ctx.beginPath()
      ctx.moveTo(0, -s * 0.72)
      ctx.lineTo(0, s * 0.72)
      ctx.stroke()

      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.2})`
      ctx.lineWidth = Math.max(0.35, s * 0.05)
      ctx.beginPath()
      ctx.ellipse(0, 0, s * 0.34, s * 0.58, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    // cherry and plum blossoms don't need veins
  }

  drawLeaf(ctx, size) {
    const type = this.leafType
    if (type === "maple") {
      this.drawMapleLeaf(ctx, size)
    } else if (type === "oak") {
      this.drawOakLeaf(ctx, size)
    } else if (type === "simple") {
      this.drawSimpleLeaf(ctx, size)
    } else if (type === "ginkgo") {
      this.drawGinkgoLeaf(ctx, size)
    } else if (type === "cherry") {
      this.drawCherryBlossom(ctx, size)
    } else if (type === "cherryPetal") {
      this.drawCherryPetal(ctx, size)
    } else if (type === "plum") {
      this.drawPlumBlossom(ctx, size)
    }
  }

  animate(currentTime = 0) {
    if (!this.active) return

    requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Update wind
    this.updateWind()

    // Draw settled leaves first (so they appear behind falling leaves)
    this.settledLeaves.forEach((leaf) => {
      this.ctx.save()
      this.ctx.translate(leaf.x, leaf.y)
      this.ctx.rotate((leaf.rotation * Math.PI) / 180)
      this.ctx.globalAlpha = leaf.opacity * 0.7 // Settled leaves are slightly less opaque

      this.drawLeaf(this.ctx, leaf.size)
      this.ctx.fillStyle = leaf.color
      this.ctx.fill()

      this.ctx.strokeStyle = "rgba(0, 0, 0, 0.18)"
      this.ctx.lineWidth = 0.5
      this.ctx.stroke()

      this.ctx.save()
      this.drawLeaf(this.ctx, leaf.size)
      this.ctx.clip()
      this.drawVeins(this.ctx, leaf.size, leaf.opacity * 0.7)
      this.ctx.restore()

      this.ctx.restore()
    })

    // Update and draw falling leaves
    this.leaves.forEach((leaf) => {
      if (leaf.settlingState === "settling") {
        leaf.settlingProgress += 0.02

        if (leaf.settlingProgress >= 1) {
          // Settling complete - move to settled leaves
          this.settledLeaves.push({
            ...leaf,
            x: leaf.targetSettleX,
            y: leaf.targetSettleY,
            speedY: 0,
            settlingState: "settled",
          })

          // Replace with new falling leaf
          const refreshed = this.createLeaf(false)
          Object.assign(leaf, refreshed)
        } else {
          // Smoothstep easing keeps entry/exit velocity soft
          const t = leaf.settlingProgress
          const easeProgress = t * t * (3 - 2 * t)

          leaf.y =
            leaf.startSettleY +
            (leaf.targetSettleY - leaf.startSettleY) * easeProgress
          leaf.x =
            leaf.startSettleX +
            (leaf.targetSettleX - leaf.startSettleX) * easeProgress +
            Math.sin(leaf.swingOffset) * leaf.swing * 0.2

          leaf.swingOffset += leaf.swingSpeed * 0.35
          leaf.rotation += leaf.rotationSpeed * 0.35

          this.ctx.save()
          this.ctx.translate(leaf.x, leaf.y)
          this.ctx.rotate((leaf.rotation * Math.PI) / 180)
          this.ctx.globalAlpha = leaf.opacity

          this.drawLeaf(this.ctx, leaf.size)
          this.ctx.fillStyle = leaf.color
          this.ctx.fill()

          this.ctx.strokeStyle = "rgba(0, 0, 0, 0.18)"
          this.ctx.lineWidth = 0.5
          this.ctx.stroke()

          this.ctx.save()
          this.drawLeaf(this.ctx, leaf.size)
          this.ctx.clip()
          this.drawVeins(this.ctx, leaf.size, leaf.opacity)
          this.ctx.restore()

          this.ctx.restore()
        }
      } else {
        // Gravity
        leaf.y += leaf.speedY

        // Wind + natural horizontal drift
        const windPush = this.windStrength * leaf.windSensitivity
        leaf.x += leaf.speedX + windPush

        // Swing (pendulum-like)
        leaf.swingOffset += leaf.swingSpeed
        leaf.x += Math.sin(leaf.swingOffset) * leaf.swing

        // Rotation — spin faster in wind
        const windSpin = Math.abs(this.windStrength) * 0.4
        leaf.rotation +=
          leaf.rotationSpeed + windSpin * Math.sign(this.windStrength || 1)

        // Check if leaf has entered settlement zone
        const settlementZone = this.canvas.height - 120
        if (leaf.y > settlementZone) {
          leaf.settlingState = "settling"
          leaf.settlingProgress = 0
          leaf.startSettleX = leaf.x
          leaf.startSettleY = leaf.y
          leaf.targetSettleX = leaf.x + (Math.random() * 24 - 12)
          leaf.targetSettleY = this.canvas.height - 20 - Math.random() * 40
        }

        // Draw falling leaf
        this.ctx.save()
        this.ctx.translate(leaf.x, leaf.y)
        this.ctx.rotate((leaf.rotation * Math.PI) / 180)
        this.ctx.globalAlpha = leaf.opacity

        this.drawLeaf(this.ctx, leaf.size)
        this.ctx.fillStyle = leaf.color
        this.ctx.fill()

        this.ctx.strokeStyle = "rgba(0, 0, 0, 0.18)"
        this.ctx.lineWidth = 0.5
        this.ctx.stroke()

        this.ctx.save()
        this.drawLeaf(this.ctx, leaf.size)
        this.ctx.clip()
        this.drawVeins(this.ctx, leaf.size, leaf.opacity)
        this.ctx.restore()

        this.ctx.restore()
      }

      // Wrap horizontally
      if (leaf.x > this.canvas.width + 80) leaf.x = -80
      else if (leaf.x < -80) leaf.x = this.canvas.width + 80
    })

    // Limit settled leaves to prevent memory issues (keep last 1000)
    if (this.settledLeaves.length > 1000) {
      this.settledLeaves.shift()
    }
  }
}
