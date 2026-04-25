import { hexToRgb } from "../../utils/colors.js"

export class PlantGrowthEffect {
  constructor(canvasId, color = "#4caf50") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.baseColor = color
    this.plants = []
    this.grass = []
    this.particles = []
    this.time = 0
    this._animId = null

    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    if (this.active) this.initPlants()
  }

  initPlants() {
    this.plants = []
    this.grass = []
    this.particles = []
    
    // 1. Grass - Medium density
    const grassCount = Math.floor(window.innerWidth / 8)
    for (let i = 0; i < grassCount; i++) {
      this.grass.push({
        x: Math.random() * window.innerWidth,
        y: window.innerHeight + 5,
        height: 0,
        targetHeight: Math.random() * 35 + 15,
        angle: (Math.random() - 0.5) * 0.2,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.04 + 0.02,
        w: Math.random() * 2 + 1
      })
    }

    // 2. Bottom Plants - Balanced density
    const bottomRootCount = Math.floor(window.innerWidth / 250) + 2
    for (let i = 0; i < bottomRootCount; i++) {
      const x = (window.innerWidth / (bottomRootCount - 1)) * i + (Math.random() * 100 - 50)
      const isVine = Math.random() < 0.3
      this.plants.push(this.createBranch(x, window.innerHeight + 10, -Math.PI / 2, isVine ? 4 : 12, 0, isVine, false))
    }

    // 3. Top Hanging Vines - Balanced
    const topRootCount = Math.floor(window.innerWidth / 350) + 1
    for (let i = 0; i < topRootCount; i++) {
      const x = (window.innerWidth / (topRootCount)) * (i + 0.5) + (Math.random() * 100 - 50)
      this.plants.push(this.createBranch(x, -10, Math.PI / 2, 4, 0, true, true))
    }
  }

  createBranch(x, y, angle, size, gen, isVine = false, isTopDown = false) {
    const baseLen = isTopDown ? 70 : (isVine ? 60 : 100)
    const maxLen = baseLen + Math.random() * 80 - gen * 15
    
    return {
      x, y,
      angle,
      size,
      gen,
      isVine,
      isTopDown,
      length: 0,
      targetLength: Math.max(30, maxLen),
      children: [],
      leaves: [],
      tendrils: [],
      flower: null,
      growing: true,
      phase: Math.random() * Math.PI * 2,
      wiggleSpeed: (isVine || isTopDown) ? 0.03 : 0.015,
      wiggleAmp: (isVine || isTopDown) ? 0.2 : 0.08,
      spiralDir: Math.random() > 0.5 ? 1 : -1
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this.initPlants()

    const animateLoop = (t) => {
      if (!this.active) return
      this._animId = requestAnimationFrame(animateLoop)
      if (document.visibilityState === "hidden") return
      this.time = t / 1000
      this.update()
      this.draw()
    }
    this._animId = requestAnimationFrame(animateLoop)
  }

  stop() {
    this.active = false
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
    this.plants = []
    this.grass = []
    this.particles = []
  }

  update() {
    this.grass.forEach(g => { if (g.height < g.targetHeight) g.height += 0.6 })

    const updateBranch = (b) => {
      if (b.growing) {
        b.length += (b.isVine || b.isTopDown) ? 1.4 : 1.0
        
        if (b.length >= b.targetLength) {
          b.growing = false
          
          const maxGen = b.isTopDown ? 4 : (b.isVine ? 4 : 3)
          if (b.gen < maxGen) {
            const chance = (b.isVine || b.isTopDown) ? 0.6 : 0.5
            if (Math.random() < chance) {
              const numChildren = 1 // Mostly single branch for clarity
              for (let i = 0; i < numChildren; i++) {
                let childAngle = b.angle + (Math.random() - 0.5) * ( (b.isVine || b.isTopDown) ? 1.2 : 0.6)
                const endX = b.x + Math.cos(b.angle) * b.length
                const endY = b.y + Math.sin(b.angle) * b.length
                
                b.children.push(this.createBranch(
                  endX, endY, 
                  childAngle, 
                  b.size * 0.75, 
                  b.gen + 1, 
                  b.isVine,
                  b.isTopDown
                ))
              }
            }
          }

          if (!b.isVine && !b.isTopDown && b.gen >= 2 && Math.random() < 0.3) {
            b.flower = { size: 0, targetSize: Math.random() * 10 + 6 }
          }
        }

        // Balanced leaf density
        if (Math.random() < ( (b.isVine || b.isTopDown) ? 0.12 : 0.08)) {
          const endX = b.x + Math.cos(b.angle) * b.length
          const endY = b.y + Math.sin(b.angle) * b.length
          
          if ((b.isVine || b.isTopDown) && Math.random() < 0.3) {
            b.tendrils.push({
              x: endX, y: endY,
              angle: b.angle + (Math.random() - 0.5) * 2,
              size: 0, targetSize: Math.random() * 20 + 10,
              dir: Math.random() > 0.5 ? 1 : -1
            })
          } else {
            b.leaves.push({
              p: b.length / b.targetLength,
              side: Math.random() > 0.5 ? 1 : -1,
              size: 0,
              targetSize: (b.isVine || b.isTopDown) ? Math.random() * 4 + 3 : Math.random() * 7 + 5,
              angle: (Math.random() - 0.5) * 0.5
            })
          }
        }
      }

      b.leaves.forEach(l => { if (l.size < l.targetSize) l.size += 0.25 })
      b.tendrils.forEach(t => { if (t.size < t.targetSize) t.size += 0.6 })
      if (b.flower && b.flower.size < b.flower.targetSize) b.flower.size += 0.15

      b.children.forEach(updateBranch)
    }

    this.plants.forEach(updateBranch)

    if (Math.random() < 0.03) this.spawnPetal()
    const sinTimeY = Math.sin(this.time) * 0.4
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx + Math.sin(this.time + p.y * 0.01) * 0.4
      p.y += p.vy
      p.r += p.vr
      if (p.y > this.canvas.height + 20) this.particles.splice(i, 1)
    }
  }

  spawnPetal() {
    if (this.particles.length > 30) return
    this.particles.push({
      x: Math.random() * this.canvas.width,
      y: -20,
      vx: Math.random() * 0.8 - 0.4,
      vy: Math.random() * 1 + 1,
      r: Math.random() * Math.PI * 2,
      vr: Math.random() * 0.06 - 0.03,
      size: Math.random() * 3 + 2,
      color: `hsl(${Math.random() * 40 + 330}, 80%, 85%)`
    })
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    if (!this.rgb) this.rgb = hexToRgb(this.baseColor)
    const rgb = this.rgb
    
    this.drawGrassLayer(rgb)

    const drawBranch = (b) => {
      const wind = Math.sin(this.time * b.wiggleSpeed + b.phase) * b.wiggleAmp
      const spiral = (b.isVine || b.isTopDown) ? Math.sin(this.time * 2 + b.phase) * 0.1 * b.spiralDir : 0
      const currentAngle = b.angle + wind + spiral
      
      const cosA = Math.cos(currentAngle)
      const sinA = Math.sin(currentAngle)
      const endX = b.x + cosA * b.length
      const endY = b.y + sinA * b.length

      this.ctx.beginPath()
      this.ctx.lineWidth = Math.max(0.5, b.size)
      this.ctx.lineCap = "round"
      
      if (b.isVine || b.isTopDown) {
        this.ctx.strokeStyle = `rgba(${rgb.r * 0.3}, ${rgb.g * 0.7}, ${rgb.b * 0.2}, 0.6)`
      } else {
        const grad = this.ctx.createLinearGradient(b.x, b.y, endX, endY)
        grad.addColorStop(0, `rgba(${rgb.r * 0.5}, ${rgb.g * 0.4}, ${rgb.b * 0.2}, 0.8)`)
        grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`)
        this.ctx.strokeStyle = grad
      }

      this.ctx.moveTo(b.x, b.y)
      this.ctx.lineTo(endX, endY)
      this.ctx.stroke()

      b.tendrils.forEach(t => {
        this.drawTendril(t.x, t.y, t.angle + wind, t.size, t.dir, rgb)
      })

      b.leaves.forEach(l => {
        const lx = b.x + cosA * (b.length * l.p)
        const ly = b.y + sinA * (b.length * l.p)
        this.drawLeaf(lx, ly, currentAngle + (Math.PI/2) * l.side + l.angle, l.size, (b.isVine || b.isTopDown), rgb)
      })

      if (b.flower) this.drawFlower(endX, endY, b.flower.size, rgb)

      b.children.forEach(c => {
        c.x = endX
        c.y = endY
        drawBranch(c)
      })
    }

    this.plants.forEach(drawBranch)

    this.particles.forEach(p => {
      this.ctx.save()
      this.ctx.translate(p.x, p.y)
      this.ctx.rotate(p.r)
      this.ctx.fillStyle = p.color
      this.ctx.beginPath()
      this.ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.restore()
    })
  }

  drawGrassLayer(rgb) {
    this.ctx.lineCap = "round"
    this.grass.forEach(g => {
      const wind = Math.sin(this.time * g.speed + g.phase) * 0.2
      const angle = g.angle + wind
      const endX = g.x + Math.cos(-Math.PI/2 + angle) * g.height
      const endY = g.y + Math.sin(-Math.PI/2 + angle) * g.height
      
      this.ctx.beginPath()
      this.ctx.lineWidth = g.w
      const r = Math.max(0, rgb.r - 20)
      const g_val = Math.min(255, rgb.g + (g.height / 2))
      const b = Math.max(0, rgb.b - 20)
      this.ctx.strokeStyle = `rgba(${r}, ${g_val}, ${b}, 0.6)`
      this.ctx.moveTo(g.x, g.y)
      this.ctx.quadraticCurveTo(g.x, g.y - g.height * 0.5, endX, endY)
      this.ctx.stroke()
    })
  }

  drawTendril(x, y, angle, size, dir, rgb) {
    this.ctx.beginPath()
    this.ctx.lineWidth = 0.5
    this.ctx.strokeStyle = `rgba(${rgb.r * 0.3}, ${rgb.g * 0.8}, ${rgb.b * 0.2}, 0.4)`
    this.ctx.moveTo(x, y)
    for (let i = 0; i < size; i++) {
      const a = angle + Math.sin(i * 0.4) * 0.6 * dir
      x += Math.cos(a) * 2
      y += Math.sin(a) * 2
      this.ctx.lineTo(x, y)
    }
    this.ctx.stroke()
  }

  drawLeaf(x, y, angle, size, isSmall, rgb) {
    if (size < 0.1) return
    this.ctx.save()
    this.ctx.translate(x, y)
    this.ctx.rotate(angle)
    
    const r = isSmall ? rgb.r * 0.5 : rgb.r
    const g_val = isSmall ? rgb.g * 0.7 : rgb.g
    const b = isSmall ? rgb.b * 0.3 : rgb.b
    
    this.ctx.fillStyle = `rgba(${r}, ${g_val}, ${b}, 0.7)`
    this.ctx.beginPath()
    this.ctx.moveTo(0, 0)
    this.ctx.quadraticCurveTo(size * 1.5, -size * 1.8, size * 3, 0)
    this.ctx.quadraticCurveTo(size * 1.5, size * 1.8, 0, 0)
    this.ctx.fill()
    this.ctx.restore()
  }

  drawFlower(x, y, size, rgb) {
    if (size < 0.1) return
    this.ctx.save()
    this.ctx.translate(x, y)
    const hue = 340 + Math.sin(this.time * 0.5) * 30
    this.ctx.fillStyle = `hsl(${hue}, 80%, 75%)`
    for (let i = 0; i < 5; i++) {
      this.ctx.rotate((Math.PI * 2) / 5)
      this.ctx.beginPath()
      this.ctx.moveTo(0, 0)
      this.ctx.quadraticCurveTo(size * 1.8, -size * 1.8, size * 3.5, 0)
      this.ctx.quadraticCurveTo(size * 1.8, size * 1.8, 0, 0)
      this.ctx.fill()
    }
    this.ctx.fillStyle = "#fff"
    this.ctx.beginPath()
    this.ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.restore()
  }
}
