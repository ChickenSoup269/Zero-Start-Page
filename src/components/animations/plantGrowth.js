export class PlantGrowthEffect {
  constructor(canvasId, color = "#4caf50") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this.plants = []
    this.resetTimer = 0

    this.resize()
    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    if (this.active) this.initPlants()
  }

  initPlants() {
    this.plants = []
    this.resetTimer = 0
    const rootCount = Math.floor(window.innerWidth / 200) || 1

    for (let i = 0; i < rootCount + 1; i++) {
      const startX =
        (window.innerWidth / rootCount) * i + (Math.random() * 100 - 50)
      // Start with thickness between 8 and 14
      const initialSize = Math.random() * 6 + 8
      this.plants.push(
        this.createBranch(
          startX,
          window.innerHeight + 10,
          -Math.PI / 2,
          initialSize,
          0,
        ),
      )
    }
  }

  createBranch(x, y, angle, size, generation) {
    return {
      points: [{ x, y }],
      angle,
      size,
      initialSize: size,
      generation,
      active: true,
      leaves: [],
      children: [],
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.canvas.style.display = "block"
    this.initPlants()

    const animateLoop = (t) => {
      if (!this.active) return
      this.animate(t)
      requestAnimationFrame(animateLoop)
    }
    requestAnimationFrame(animateLoop)
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    this.canvas.style.display = "none"
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 76, g: 175, b: 80 }
  }

  animate(currentTime = 0) {
    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    let activeBranches = 0
    const rgb = this.hexToRgb(this.color)

    const growBranch = (branch) => {
      if (branch.active) {
        activeBranches++
        const last = branch.points[branch.points.length - 1]

        // Organic horizontal sway
        branch.angle += (Math.random() - 0.5) * 0.2
        // Bias upwards to prevent them from growing straight down
        if (branch.angle < -Math.PI) branch.angle += 0.1
        if (branch.angle > 0) branch.angle -= 0.1

        const nx = last.x + Math.cos(branch.angle) * 5
        const ny = last.y + Math.sin(branch.angle) * 5
        branch.points.push({ x: nx, y: ny })

        // Taper branch size
        branch.size -= 0.04

        // Spawn leaves randomly
        if (Math.random() < 0.1 && branch.size > 2) {
          branch.leaves.push({
            x: nx,
            y: ny,
            angle:
              branch.angle +
              (Math.random() > 0.5 ? 1 : -1) *
                (Math.PI / 2 + Math.random() * 0.5),
            scale: 0,
            maxScale: Math.random() * 6 + 4,
          })
        }

        // Spawn child branches
        if (Math.random() < 0.02 && branch.size > 4 && branch.generation < 5) {
          branch.children.push(
            this.createBranch(
              nx,
              ny,
              branch.angle +
                (Math.random() > 0.5 ? 1 : -1) *
                  (Math.PI / 4 + Math.random() * 0.3),
              branch.size * 0.65,
              branch.generation + 1,
            ),
          )
        }

        if (
          branch.size <= 0.5 ||
          ny < -50 ||
          nx < -50 ||
          nx > this.canvas.width + 50
        ) {
          branch.active = false
        }
      }

      // Animate leaves opening
      branch.leaves.forEach((leaf) => {
        if (leaf.scale < leaf.maxScale) leaf.scale += 0.3
      })

      branch.children.forEach(growBranch)
    }

    this.plants.forEach(growBranch)

    // Apply fading when resetting
    if (activeBranches === 0) {
      if (this.resetTimer > 150) {
        this.ctx.globalAlpha = Math.max(0, 1 - (this.resetTimer - 150) / 50)
      }
    } else {
      this.ctx.globalAlpha = 1
    }

    // Render configuration
    this.ctx.lineCap = "round"
    this.ctx.lineJoin = "round"

    // Draw branch structure
    const drawBranch = (branch) => {
      // Draw branch stem
      if (branch.points.length > 0) {
        this.ctx.beginPath()
        // Use initial branch size for the whole path
        this.ctx.lineWidth = Math.max(1, branch.initialSize * 0.8)
        this.ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
        this.ctx.moveTo(branch.points[0].x, branch.points[0].y)
        for (let i = 1; i < branch.points.length; i++) {
          this.ctx.lineTo(branch.points[i].x, branch.points[i].y)
        }
        this.ctx.stroke()
      }

      // Draw branch leaves
      // Slightly lighter color for leaves
      this.ctx.fillStyle = `rgba(${Math.min(rgb.r + 30, 255)}, ${Math.min(rgb.g + 30, 255)}, ${Math.min(rgb.b + 30, 255)}, 0.85)`
      branch.leaves.forEach((leaf) => {
        this.ctx.save()
        this.ctx.translate(leaf.x, leaf.y)
        this.ctx.rotate(leaf.angle)
        this.ctx.beginPath()
        this.ctx.moveTo(0, 0)
        // Draw simple organic leaf shape
        this.ctx.quadraticCurveTo(leaf.scale, -leaf.scale, leaf.scale * 2, 0)
        this.ctx.quadraticCurveTo(leaf.scale, leaf.scale, 0, 0)
        this.ctx.fill()
        this.ctx.restore()
      })

      branch.children.forEach(drawBranch)
    }

    this.plants.forEach(drawBranch)

    this.ctx.globalAlpha = 1.0

    // Reset game logic
    if (activeBranches === 0) {
      this.resetTimer++
      if (this.resetTimer > 200) {
        // wait ~6 seconds then fade out and reset
        this.initPlants()
      }
    }
  }
}
