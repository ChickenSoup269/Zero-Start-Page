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
    this.cloneCount = options.cloneCount || 1
    this.trail = options.trail || false
    this.glitch = options.glitch || false
    
    this.items = []
    
    this.animationFrameId = null
    this.lastTime = Date.now()

    this.handleResize = this.handleResize.bind(this)
    this.init()
    window.addEventListener("resize", this.handleResize)
  }

  getRandomColor(excludeColor) {
    const colors = [
      "#ff0000", "#00ff00", "#0000ff", "#ffff00", 
      "#ff00ff", "#00ffff", "#ffffff", "#ff8800"
    ]
    let newColor = colors[Math.floor(Math.random() * colors.length)]
    while (newColor === excludeColor && colors.length > 1) {
      newColor = colors[Math.floor(Math.random() * colors.length)]
    }
    return newColor
  }

  getResolvedColor(currentColor) {
    if (this.colorMode === "accent") {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || "#ffffff"
    }
    return currentColor
  }

  init() {
    this.handleResize()
    this.updateBoxSize()
    this.syncItems()
  }

  syncItems() {
    // Add or remove items to match cloneCount
    while (this.items.length < this.cloneCount) {
      const speed = this.speed
      this.items.push({
        x: Math.random() * (this.width - this.boxWidth),
        y: Math.random() * (this.height - this.boxHeight),
        dx: speed * (Math.random() > 0.5 ? 1 : -1),
        dy: speed * (Math.random() > 0.5 ? 1 : -1),
        currentColor: this.colorMode === "random" ? this.getRandomColor() : this.colorMode,
        history: [] // for trail
      })
    }
    while (this.items.length > this.cloneCount) {
      this.items.pop()
    }
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
    
    this.items.forEach(item => {
      if (item.x + this.boxWidth > this.width) item.x = this.width - this.boxWidth
      if (item.y + this.boxHeight > this.height) item.y = this.height - this.boxHeight
      if (item.x < 0) item.x = 0
      if (item.y < 0) item.y = 0
    })
  }

  updateTitle(newTitle) {
    this.title = newTitle || "DVD"
    this.updateBoxSize()
  }

  updateColorMode(mode) {
    this.colorMode = mode
    this.items.forEach(item => {
      if (this.colorMode !== "random") {
        item.currentColor = this.colorMode
      }
    })
  }
  
  updateSpeed(speed) {
    this.speed = speed
    this.items.forEach(item => {
      item.dx = item.dx > 0 ? this.speed : -this.speed
      item.dy = item.dy > 0 ? this.speed : -this.speed
    })
  }

  updateCloneCount(count) {
    this.cloneCount = count
    this.syncItems()
  }

  updateTrail(trail) {
    this.trail = trail
    if (!trail) {
      this.items.forEach(item => item.history = [])
    }
  }

  updateGlitch(glitch) {
    this.glitch = glitch
  }

  drawItem(item, x, y, alpha, isGlitch, isGhost = false) {
    const resolvedColor = this.getResolvedColor(item.currentColor)
    
    this.ctx.save()
    this.ctx.globalAlpha = alpha
    this.ctx.fillStyle = resolvedColor
    this.ctx.strokeStyle = resolvedColor
    
    if (isGhost) {
      this.ctx.shadowColor = "transparent"
      this.ctx.shadowBlur = 0
    } else {
      this.ctx.shadowColor = resolvedColor
      this.ctx.shadowBlur = 8
    }

    // Glitch effect: apply a random transform and color split
    if (isGlitch && Math.random() > 0.8) {
      const offsetX = (Math.random() - 0.5) * 10
      const offsetY = (Math.random() - 0.5) * 10
      this.ctx.translate(offsetX, offsetY)
      // Sometimes change color to red or cyan for chromatic aberration
      if (Math.random() > 0.5) {
        this.ctx.fillStyle = Math.random() > 0.5 ? "cyan" : "red"
        this.ctx.shadowColor = this.ctx.fillStyle
      }
    }

    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "middle"

    if (this.title.toUpperCase() === "DVD") {
      this.ctx.font = "italic bold 44px Impact, sans-serif"
      this.ctx.fillText(this.title, x + this.boxWidth / 2, y + this.boxHeight / 2 - 8)
      
      this.ctx.font = "bold 14px Arial, sans-serif"
      this.ctx.fillText("video", x + this.boxWidth / 2, y + this.boxHeight / 2 + 18)
    } else {
      this.ctx.font = "italic bold 44px Impact, sans-serif"
      this.ctx.fillText(this.title, x + this.boxWidth / 2, y + this.boxHeight / 2)
    }

    this.ctx.restore()
  }

  draw() {
    // Clear the canvas fully each frame
    this.ctx.clearRect(0, 0, this.width, this.height)

    this.items.forEach(item => {
      // Draw trail if enabled
      if (this.trail) {
        for (let i = 0; i < item.history.length; i += 2) {
          const hist = item.history[i]
          const ratio = (i + 1) / item.history.length
          const alpha = Math.pow(ratio, 2) * 0.15 // Subtle quadratic fade, max 0.15 opacity
          this.drawItem(item, hist.x, hist.y, alpha, false, true)
        }
      }
      
      // Draw main item
      this.drawItem(item, item.x, item.y, 1, this.glitch, false)
    })
  }

  animate() {
    if (!this.animationFrameId) return
    this.animationFrameId = this._animId = requestAnimationFrame(() => this.animate())
    
    if (document.visibilityState === 'hidden') return

    this.items.forEach(item => {
      // Record history for trail
      if (this.trail) {
        item.history.push({ x: item.x, y: item.y })
        if (item.history.length > 16) {
          item.history.shift()
        }
      }

      // Update position
      item.x += item.dx
      item.y += item.dy

      let bounced = false

      // Collision detection
      if (item.x + this.boxWidth >= this.width) {
        item.x = this.width - this.boxWidth
        item.dx = -item.dx
        bounced = true
      } else if (item.x <= 0) {
        item.x = 0
        item.dx = -item.dx
        bounced = true
      }

      if (item.y + this.boxHeight >= this.height) {
        item.y = this.height - this.boxHeight
        item.dy = -item.dy
        bounced = true
      } else if (item.y <= 0) {
        item.y = 0
        item.dy = -item.dy
        bounced = true
      }

      if (bounced && this.colorMode === "random") {
        item.currentColor = this.getRandomColor(item.currentColor)
      }
    })

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
