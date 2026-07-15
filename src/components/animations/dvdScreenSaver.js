export class DVDEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d")
    this.title = options.title || "DVD"
    this.colorMode = options.colorMode || "random" // "random" or a specific color
    this.currentColor = this.colorMode === "random" ? this.getRandomColor() : this.colorMode
    this.speed = options.speed || 3
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.boxWidth = 150
    this.boxHeight = 75
    this.x = Math.random() * (this.width - this.boxWidth)
    this.y = Math.random() * (this.height - this.boxHeight)
    this.dx = this.speed * (Math.random() > 0.5 ? 1 : -1)
    this.dy = this.speed * (Math.random() > 0.5 ? 1 : -1)
    this.animationFrameId = null
    this.lastTime = Date.now()

    this.handleResize = this.handleResize.bind(this)
    this.init()
    window.addEventListener("resize", this.handleResize)
  }

  getRandomColor() {
    const colors = [
      "#ff0000", "#00ff00", "#0000ff", "#ffff00", 
      "#ff00ff", "#00ffff", "#ffffff", "#ff8800"
    ]
    let newColor = colors[Math.floor(Math.random() * colors.length)]
    while (newColor === this.currentColor && colors.length > 1) {
      newColor = colors[Math.floor(Math.random() * colors.length)]
    }
    return newColor
  }

  getResolvedColor() {
    if (this.colorMode === "accent") {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || "#ffffff"
    }
    return this.currentColor
  }

  init() {
    this.handleResize()
    this.updateBoxSize()
  }

  updateBoxSize() {
    this.ctx.font = "italic bold 44px Impact, sans-serif"
    const metrics = this.ctx.measureText(this.title)
    this.boxWidth = metrics.width + 20
    this.boxHeight = (this.title.toUpperCase() === "DVD") ? 75 : 60
  }

  handleResize() {
    const dpr = window.devicePixelRatio || 1
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = this.width * dpr
    this.canvas.height = this.height * dpr
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.ctx.scale(dpr, dpr)
    
    if (this.x + this.boxWidth > this.width) this.x = this.width - this.boxWidth
    if (this.y + this.boxHeight > this.height) this.y = this.height - this.boxHeight
    if (this.x < 0) this.x = 0
    if (this.y < 0) this.y = 0
  }

  updateTitle(newTitle) {
    this.title = newTitle || "DVD"
    this.updateBoxSize()
  }

  updateColorMode(mode) {
    this.colorMode = mode
    if (this.colorMode !== "random") {
      this.currentColor = this.colorMode
    }
  }
  
  updateSpeed(speed) {
    this.speed = speed
    this.dx = this.dx > 0 ? this.speed : -this.speed
    this.dy = this.dy > 0 ? this.speed : -this.speed
  }

  draw() {
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.width, this.height)

    const resolvedColor = this.getResolvedColor()

    this.ctx.save()
    
    this.ctx.fillStyle = resolvedColor
    this.ctx.strokeStyle = resolvedColor
    this.ctx.shadowColor = resolvedColor
    this.ctx.shadowBlur = 8

    // Draw text (DVD)
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "middle"

    // If title is DVD, we also draw "video" below it
    if (this.title.toUpperCase() === "DVD") {
      this.ctx.font = "italic bold 44px Impact, sans-serif"
      this.ctx.fillText(
        this.title, 
        this.x + this.boxWidth / 2, 
        this.y + this.boxHeight / 2 - 8
      )
      
      this.ctx.font = "bold 14px Arial, sans-serif"
      this.ctx.fillText(
        "video",
        this.x + this.boxWidth / 2,
        this.y + this.boxHeight / 2 + 18
      )
    } else {
      this.ctx.font = "italic bold 44px Impact, sans-serif"
      this.ctx.fillText(
        this.title, 
        this.x + this.boxWidth / 2, 
        this.y + this.boxHeight / 2
      )
    }

    this.ctx.restore()
  }

  animate() {
    if (!this.animationFrameId) return
    this.animationFrameId = this._animId = requestAnimationFrame(() => this.animate())
    
    if (document.visibilityState === 'hidden') return

    // Update position
    this.x += this.dx
    this.y += this.dy

    let bounced = false

    // Collision detection
    if (this.x + this.boxWidth >= this.width) {
      this.x = this.width - this.boxWidth
      this.dx = -this.dx
      bounced = true
    } else if (this.x <= 0) {
      this.x = 0
      this.dx = -this.dx
      bounced = true
    }

    if (this.y + this.boxHeight >= this.height) {
      this.y = this.height - this.boxHeight
      this.dy = -this.dy
      bounced = true
    } else if (this.y <= 0) {
      this.y = 0
      this.dy = -this.dy
      bounced = true
    }

    if (bounced && this.colorMode === "random") {
      this.currentColor = this.getRandomColor()
    }

    this.draw()
  }

  start() {
    if (!this.animationFrameId) {
      this.canvas.style.display = "block"
      this.lastTime = Date.now()
      this.animationFrameId = this._animId = requestAnimationFrame(() => this.animate())
    }
  }

  stop() {
    if (this._animId) { 
      cancelAnimationFrame(this._animId)
      this._animId = null 
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
      this.ctx.clearRect(0, 0, this.width, this.height)
      this.canvas.style.display = "none"
    }
  }
}
