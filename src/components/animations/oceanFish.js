export class OceanFishEffect {
  constructor(canvasId, color = "#ff7f50") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color

    // Arrays for different creatures
    this.fishes = []
    
    
    
    
    this.bubbles = []

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.mouseX = -1000
    this.mouseY = -1000

    this.resize()

    this.handleResize = () => this.resize()
    this.handleMouseMove = (e) => {
      this.mouseX = e.clientX
      this.mouseY = e.clientY
    }
    this.handleMouseLeave = () => {
      this.mouseX = -1000
      this.mouseY = -1000
    }

    window.addEventListener("resize", this.handleResize)
  }

  hexToHsl(hex) {
    let r = 0,
      g = 0,
      b = 0
    if (hex.length == 4) {
      r = parseInt(hex[1] + hex[1], 16)
      g = parseInt(hex[2] + hex[2], 16)
      b = parseInt(hex[3] + hex[3], 16)
    } else if (hex.length == 7) {
      r = parseInt(hex[1] + hex[2], 16)
      g = parseInt(hex[3] + hex[4], 16)
      b = parseInt(hex[5] + hex[6], 16)
    }
    r /= 255
    g /= 255
    b /= 255
    let max = Math.max(r, g, b),
      min = Math.min(r, g, b)
    let h,
      s,
      l = (max + min) / 2

    if (max == min) {
      h = s = 0
    } else {
      let d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }
    return { h: h * 360, s: s * 100, l: l * 100 }
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    if (this.active && this.fishes.length === 0) {
      this.initMarineLife()
    }
  }

  initMarineLife() {
    this.fishes = []
    
    
    
    
    this.bubbles = []

    // Scale count based on screen width
    const baseCount = Math.max(5, Math.floor(window.innerWidth / 120))
    const baseHsl = this.hexToHsl(this.color)

    // Initialize Fishes
    for (let i = 0; i < Math.floor(baseCount * 1.2); i++) {
      const h = (baseHsl.h + (Math.random() * 40 - 20) + 360) % 360
      const s = Math.min(
        100,
        Math.max(50, baseHsl.s + (Math.random() * 20 - 10)),
      )
      const l = Math.min(
        80,
        Math.max(30, baseHsl.l + (Math.random() * 20 - 10)),
      )

      this.fishes.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * (this.canvas.height - 100),
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 1,
        size: Math.random() * 12 + 10,
        color: `hsl(${h}, ${s}%, ${l}%)`,
        finOffset: Math.random() * Math.PI * 2,
        finSpeed: Math.random() * 0.1 + 0.1,
        targetAngle: 0,
      })
    }

    
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.initMarineLife()
    window.addEventListener("mousemove", this.handleMouseMove)
    window.addEventListener("mouseout", this.handleMouseLeave)
    this.canvas.style.display = "block"

    const animateLoop = (t) => {
      if (!this.active) return
      this._animId = requestAnimationFrame(animateLoop)
      if (document.visibilityState === 'hidden') return
      this.animate(t)
    }
    this._animId = requestAnimationFrame(animateLoop)
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    if (!this.active) return
    this.active = false
    window.removeEventListener("mousemove", this.handleMouseMove)
    window.removeEventListener("mouseout", this.handleMouseLeave)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  drawFishesAndBubbles() {
    // Draw ambient underwater bubbles
    if (Math.random() < 0.15) {
      this.bubbles.push({
        x: Math.random() * this.canvas.width,
        y: this.canvas.height + 20,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 1 + 0.5,
        wobble: Math.random() * Math.PI,
        wobbleSpeed: Math.random() * 0.05 + 0.02,
      })
    }

    const ctx = this.ctx
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      let b = this.bubbles[i]
      b.y -= b.speed
      b.wobble += b.wobbleSpeed
      const hoverX = b.x + Math.sin(b.wobble) * 20

      ctx.beginPath()
      ctx.arc(hoverX, b.y, b.size, 0, Math.PI * 2)
      ctx.fill()

      if (b.y < -20) {
        this.bubbles.splice(i, 1)
      }
    }

    const interactRadius = 180

    this.fishes.forEach((fish) => {
      fish.targetAngle += (Math.random() - 0.5) * 0.4
      fish.vx += Math.cos(fish.targetAngle) * 0.1
      fish.vy += Math.sin(fish.targetAngle) * 0.1

      let dx = fish.x - this.mouseX
      let dy = fish.y - this.mouseY
      let dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < interactRadius) {
        let force = (interactRadius - dist) / interactRadius
        fish.vx += (dx / dist) * force * 1.5
        fish.vy += (dy / dist) * force * 1.5
        fish.finSpeed = Math.min(fish.finSpeed + 0.05, 0.4)
      } else {
        fish.finSpeed = Math.max(fish.finSpeed - 0.01, 0.1)
      }

      fish.vx += fish.vx > 0 ? 0.01 : -0.01
      fish.vy *= 0.99

      const currentSpeed = Math.sqrt(fish.vx * fish.vx + fish.vy * fish.vy)
      const maxSpeed = dist < interactRadius ? 6 : 2.5
      if (currentSpeed > maxSpeed) {
        fish.vx = (fish.vx / currentSpeed) * maxSpeed
        fish.vy = (fish.vy / currentSpeed) * maxSpeed
      }

      fish.x += fish.vx
      fish.y += fish.vy

      if (fish.x < -100) fish.x = this.canvas.width + 50
      if (fish.x > this.canvas.width + 100) fish.x = -50
      if (fish.y < -50) fish.y = this.canvas.height + 50
      if (fish.y > this.canvas.height + 50) fish.y = -50

      const angle = Math.atan2(fish.vy, fish.vx)
      fish.finOffset += fish.finSpeed

      ctx.save()
      ctx.translate(fish.x, fish.y)
      ctx.rotate(angle)

      ctx.shadowColor = "rgba(0,0,0,0.2)"
      ctx.shadowBlur = 10
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 8

      ctx.fillStyle = fish.color

      // Tail
      const tailWobble = Math.sin(fish.finOffset) * (fish.size / 2.5)
      ctx.beginPath()
      ctx.moveTo(-fish.size / 1.5, 0)
      ctx.lineTo(-fish.size * 1.8, -fish.size / 1.5 + tailWobble)
      ctx.lineTo(-fish.size * 1.8, fish.size / 1.5 + tailWobble)
      ctx.fill()

      // Top Fin
      ctx.beginPath()
      ctx.moveTo(-fish.size / 3, -fish.size / 2)
      ctx.bezierCurveTo(
        0,
        -fish.size * 1.2,
        fish.size / 2,
        -fish.size * 0.8,
        fish.size / 3,
        -fish.size / 2,
      )
      ctx.fill()

      // Body
      ctx.beginPath()
      ctx.ellipse(0, 0, fish.size, fish.size / 2, 0, 0, Math.PI * 2)
      ctx.fill()

      // Pectoral Fin
      ctx.fillStyle = "rgba(255,255,255,0.4)"
      ctx.beginPath()
      const pctWobble = Math.sin(fish.finOffset - Math.PI / 4) * (fish.size / 4)
      ctx.ellipse(
        -fish.size / 8,
        fish.size / 4,
        fish.size / 2.5,
        fish.size / 5,
        Math.PI / 8 + pctWobble / fish.size,
        0,
        Math.PI * 2,
      )
      ctx.fill()

      // Eye
      ctx.shadowBlur = 0
      ctx.fillStyle = "rgba(255,255,255,0.9)"
      ctx.beginPath()
      ctx.arc(fish.size / 2, -fish.size / 5, fish.size / 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#111"
      ctx.beginPath()
      ctx.arc(
        fish.size / 2 + 1,
        -fish.size / 5,
        fish.size / 8,
        0,
        Math.PI * 2,
      )
      ctx.fill()

      ctx.restore()
    })
  }

  animate(currentTime = 0) {
    if (!this.active) return

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Call modular drawing functions
    this.drawFishesAndBubbles()
  }

}
