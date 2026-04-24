export class HalloweenEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.items = []
    this.lastTime = 0
    
    // Custom Draw Functions for each type
    this.itemTypes = [
      { id: 'pumpkin', weight: 1.0, sizeBase: 40, draw: (ctx, s) => this.drawPumpkin(ctx, s) },
      { id: 'bat', weight: 0.7, sizeBase: 35, draw: (ctx, s) => this.drawBat(ctx, s) },
      { id: 'cat', weight: 1.1, sizeBase: 35, draw: (ctx, s) => this.drawCat(ctx, s) },
      { id: 'ghost', weight: 0.5, sizeBase: 45, draw: (ctx, s) => this.drawGhost(ctx, s) }
    ]
    
    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    if (!this.canvas) return
    this.width = window.innerWidth
    this.height = window.innerHeight
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = this.width * dpr
    this.canvas.height = this.height * dpr
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.ctx.scale(dpr, dpr)
  }

  // --- CUSTOM ICON DRAWING METHODS ---

  drawPumpkin(ctx, s) {
    const r = s / 2
    // Body
    ctx.fillStyle = "#ff7518" // Pumpkin orange
    ctx.beginPath()
    ctx.ellipse(0, 0, r, r * 0.85, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Ridges
    ctx.strokeStyle = "rgba(0,0,0,0.1)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.85); ctx.lineTo(0, r * 0.85)
    ctx.stroke()

    // Stem
    ctx.fillStyle = "#2d5a27"
    ctx.fillRect(-r*0.15, -r*1.1, r*0.3, r*0.3)

    // Eyes (Triangles)
    ctx.fillStyle = "#222"
    ctx.beginPath()
    ctx.moveTo(-r*0.4, -r*0.2); ctx.lineTo(-r*0.1, -r*0.2); ctx.lineTo(-r*0.25, -r*0.5); ctx.closePath()
    ctx.moveTo(r*0.4, -r*0.2); ctx.lineTo(r*0.1, -r*0.2); ctx.lineTo(r*0.25, -r*0.5); ctx.closePath()
    ctx.fill()

    // Mouth (Jagged)
    ctx.beginPath()
    ctx.moveTo(-r*0.5, r*0.1)
    ctx.lineTo(-r*0.3, r*0.3); ctx.lineTo(-r*0.1, r*0.1); ctx.lineTo(0, r*0.3)
    ctx.lineTo(r*0.1, r*0.1); ctx.lineTo(r*0.3, r*0.3); ctx.lineTo(r*0.5, r*0.1)
    ctx.stroke()
  }

  drawBat(ctx, s) {
    const w = s; const h = s * 0.5
    ctx.fillStyle = "#2a1b3d" // Dark purple/black
    ctx.beginPath()
    // Head & Ears
    ctx.moveTo(-2, -5); ctx.lineTo(0, -8); ctx.lineTo(2, -5)
    // Wings
    ctx.bezierCurveTo(15, -15, 25, 5, 10, 5)
    ctx.bezierCurveTo(5, 10, 0, 5, 0, 5)
    ctx.bezierCurveTo(0, 5, -5, 10, -10, 5)
    ctx.bezierCurveTo(-25, 5, -15, -15, -2, -5)
    ctx.fill()
  }

  drawCat(ctx, s) {
    const r = s / 2
    ctx.fillStyle = "#111" // Black cat
    // Head
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2)
    ctx.fill()
    // Ears
    ctx.beginPath()
    ctx.moveTo(-r*0.7, -r*0.3); ctx.lineTo(-r*0.8, -r*0.9); ctx.lineTo(-r*0.2, -r*0.6); ctx.closePath()
    ctx.moveTo(r*0.7, -r*0.3); ctx.lineTo(r*0.8, -r*0.9); ctx.lineTo(r*0.2, -r*0.6); ctx.closePath()
    ctx.fill()
    // Eyes (Glowing Yellow)
    ctx.fillStyle = "#ffff00"
    ctx.beginPath()
    ctx.ellipse(-r*0.3, -r*0.1, r*0.15, r*0.08, 0, 0, Math.PI * 2)
    ctx.ellipse(r*0.3, -r*0.1, r*0.15, r*0.08, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  drawGhost(ctx, s) {
    const r = s / 2
    ctx.fillStyle = "rgba(255,255,255,0.8)"
    ctx.beginPath()
    ctx.moveTo(-r, r)
    ctx.quadraticCurveTo(-r, -r, 0, -r)
    ctx.quadraticCurveTo(r, -r, r, r)
    // Wavy bottom
    for(let i=0; i<3; i++) {
        ctx.quadraticCurveTo(r - (i*0.6+0.3)*r, r*1.3, r - (i*0.6+0.6)*r, r)
    }
    ctx.fill()
    // Eyes
    ctx.fillStyle = "#333"
    ctx.beginPath()
    ctx.arc(-r*0.3, -r*0.1, r*0.12, 0, Math.PI * 2)
    ctx.arc(r*0.3, -r*0.1, r*0.12, 0, Math.PI * 2)
    ctx.fill()
  }

  // --- LOGIC ---

  createItem() {
    const type = this.itemTypes[Math.floor(Math.random() * this.itemTypes.length)]
    const z = 0.5 + Math.random() * 1.0 
    return {
      x: Math.random() * this.width,
      y: -100,
      z: z,
      type: type,
      speed: (0.8 + Math.random() * 1.2) * z,
      swing: (15 + Math.random() * 35) * z,
      swingSpeed: 0.0008 + Math.random() * 0.0015,
      phase: Math.random() * Math.PI * 2,
      rotation: (Math.random() - 0.5) * 0.04,
      currentRotation: Math.random() * Math.PI * 2,
      opacity: (0.6 + Math.random() * 0.4) * (z / 1.5)
    }
  }

  animate(currentTime) {
    if (!this.active) return
    this._animId = requestAnimationFrame((t) => this.animate(t))

    if (!this.lastTime) this.lastTime = currentTime
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    this.ctx.clearRect(0, 0, this.width, this.height)

    if (this.items.length < 45 && Math.random() < 0.08) {
      this.items.push(this.createItem())
    }

    this.items = this.items.filter(item => {
      const timeFactor = deltaTime / 16.67
      
      item.y += item.speed * item.type.weight * timeFactor
      item.phase += item.swingSpeed * deltaTime
      item.currentRotation += item.rotation * timeFactor
      
      const currentX = item.x + Math.sin(item.phase) * item.swing
      const currentSize = item.type.sizeBase * item.z

      this.ctx.save()
      this.ctx.globalAlpha = item.opacity
      this.ctx.translate(currentX, item.y)
      
      const wobble = Math.sin(item.phase * 0.6) * 0.2
      this.ctx.rotate(item.currentRotation + wobble)
      
      // Call the custom draw method
      item.type.draw(this.ctx, currentSize)
      
      this.ctx.restore()

      return item.y < this.height + 100
    })
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this.lastTime = 0
    this._animId = requestAnimationFrame((t) => this.animate(t))
  }

  stop() {
    this.active = false
    this.canvas.style.display = "none"
    this.items = []
    this.lastTime = 0
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this._animId) cancelAnimationFrame(this._animId)
  }
}
