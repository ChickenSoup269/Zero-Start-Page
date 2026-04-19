export class FirefliesEffect {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.flies = []
    this.active = false
    this.mouse = { x: -1000, y: -1000, radius: 120 }
    
    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.resize()
    window.addEventListener("resize", () => this.resize())
    window.addEventListener("mousemove", e => {
      this.mouse.x = e.clientX
      this.mouse.y = e.clientY
    })
    window.addEventListener("mouseout", () => {
      this.mouse.x = -1000
      this.mouse.y = -1000
    })
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.createFlies()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    if (this._animId) cancelAnimationFrame(this._animId)
    this.active = false
    this.canvas.style.display = "none"
  }

  createFlies() {
    this.flies = []
    const quantity = 60 // Reduced for performance
    for (let i = 0; i < quantity; i++) {
      this.flies.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 1,
        speedX: Math.random() * 0.4 - 0.2,
        speedY: Math.random() * 0.4 - 0.2,
        angle: Math.random() * Math.PI * 2,
        targetAngle: Math.random() * Math.PI * 2,
        trail: []
      })
    }
  }

  animate(currentTime = 0) {
    if (!this.active) return

    this._animId = requestAnimationFrame((t) => this.animate(t))
    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.globalCompositeOperation = "lighter"

    this.flies.forEach((fly) => {
      // Steer towards target angle, very slowly
      fly.angle += (fly.targetAngle - fly.angle) * 0.005
      
      // Apply minimal engine force, with very high inertia for drifting
      fly.speedX = (fly.speedX * 0.995) + (Math.cos(fly.angle) * 0.02)
      fly.speedY = (fly.speedY * 0.995) + (Math.sin(fly.angle) * 0.02)
      
      // Pick a new direction very infrequently
      if (Math.random() < 0.004) {
        fly.targetAngle = Math.random() * Math.PI * 2
      }

      // Very gentle mouse repulsion
      const dx = fly.x - this.mouse.x
      const dy = fly.y - this.mouse.y
      const distSq = dx*dx + dy*dy
      if (distSq < this.mouse.radius * this.mouse.radius) {
        const dist = Math.sqrt(distSq) || 1
        const force = (1 - dist / this.mouse.radius) * 0.5 // Minimal force
        fly.speedX += dx / dist * force
        fly.speedY += dy / dist * force
      }

      fly.x += fly.speedX
      fly.y += fly.speedY
      
      // Trail
      fly.trail.push({ x: fly.x, y: fly.y })
      if (fly.trail.length > 6) fly.trail.shift()
      
      // Loop
      if (fly.x < -10) fly.x = this.canvas.width + 10
      if (fly.x > this.canvas.width + 10) fly.x = -10
      if (fly.y < -10) fly.y = this.canvas.height + 10
      if (fly.y > this.canvas.height + 10) fly.y = -10

      // Draw Trail
      if (fly.trail.length > 1) {
        this.ctx.beginPath()
        this.ctx.moveTo(fly.trail[0].x, fly.trail[0].y)
        for(let i=1; i < fly.trail.length; i++) {
            this.ctx.lineTo(fly.trail[i].x, fly.trail[i].y)
        }
        this.ctx.strokeStyle = `rgba(255, 230, 150, 0.05)` // Fainter trail
        this.ctx.lineWidth = 0.5
        this.ctx.stroke()
      }

      // Draw Glow with layered circles (No shadowBlur)
      // Outer glow
      this.ctx.fillStyle = "rgba(255, 210, 80, 0.07)"
      this.ctx.beginPath()
      this.ctx.arc(fly.x, fly.y, fly.size * 3.5, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Mid glow
      this.ctx.fillStyle = "rgba(255, 220, 120, 0.15)"
      this.ctx.beginPath()
      this.ctx.arc(fly.x, fly.y, fly.size * 2, 0, Math.PI * 2)
      this.ctx.fill()

      // Core
      this.ctx.fillStyle = "rgba(255, 240, 180, 0.9)"
      this.ctx.beginPath()
      this.ctx.arc(fly.x, fly.y, fly.size, 0, Math.PI * 2)
      this.ctx.fill()
    })

    this.ctx.globalCompositeOperation = "source-over"
  }
}
