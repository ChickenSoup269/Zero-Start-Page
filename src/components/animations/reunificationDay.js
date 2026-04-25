export class ReunificationDayEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.fireworks = []
    this.particles = []
    this.texts = []
    this.tanks = []
    
    this.gate = {
      x: 0,
      y: 0,
      state: "closed", // closed, opening, open
      angle: 0,
      width: 120,
      height: 80
    }

    this.palace = {
      x: 0,
      y: 0,
      width: 240,
      height: 110
    }

    this.messages = [
      "30/04",
      "30/04/1975",
      "Giải phóng miền Nam",
      "Thống nhất đất nước",
      "Chào mừng 30/04",
      "Việt Nam muôn năm",
      "Độc lập - Tự do",
      "Hòa bình",
      "51 năm thống nhất đất nước",
      "Đại thắng mùa Xuân 1975",
      "Thống nhất non sông",
      "Bắc Nam sum họp",
      "Ngày toàn thắng"
    ]
    
    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    // Colors: National Flag Colors (Red and Yellow)
    this.fireworkColors = [
      "#FF0000", // Red
      "#FFFF00", // Yellow
      "#FF4500", // Orange Red
      "#FFD700", // Gold
      "#FF0000",
      "#FFFF00"
    ]

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  setOptions(options) {
    // Reserved for future options
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
    
    // Update gate position - positioned at the bottom, centered
    this.palace.x = this.width / 2
    this.palace.y = this.height - 25 // Palace sits on the bottom line
    
    this.gate.x = this.palace.x
    this.gate.y = this.height - 20
  }

  drawPalace() {
    const ctx = this.ctx
    const p = this.palace
    
    ctx.save()
    ctx.translate(p.x, p.y)
    
    // 3. Palace Building
    // Basement/Base
    ctx.fillStyle = "#a0a0a0"
    ctx.fillRect(-p.width/2 - 20, 0, p.width + 40, 5)
    
    // Main Block Shadows
    ctx.fillStyle = "rgba(0,0,0,0.2)"
    ctx.fillRect(-p.width/2, -p.height, p.width, p.height)

    // Central Section
    const centralW = p.width * 0.3
    ctx.fillStyle = "#f0f0f0"
    ctx.fillRect(-centralW/2, -p.height - 10, centralW, p.height + 10)
    
    // Wings
    ctx.fillStyle = "#e0e0e0"
    ctx.fillRect(-p.width/2, -p.height, (p.width - centralW)/2 - 5, p.height)
    ctx.fillRect(centralW/2 + 5, -p.height, (p.width - centralW)/2 - 5, p.height)

    // Louvers (The "Bamboo segment" look)
    ctx.fillStyle = "#ccc"
    const louverW = 2
    const louverGap = 6
    // Left Wing Louvers
    for(let x = -p.width/2 + 5; x < -centralW/2 - 5; x += louverGap) {
        ctx.fillRect(x, -p.height + 15, louverW, p.height - 30)
    }
    // Right Wing Louvers
    for(let x = centralW/2 + 10; x < p.width/2 - 5; x += louverGap) {
        ctx.fillRect(x, -p.height + 15, louverW, p.height - 30)
    }

    // Top Section / Penthouse
    ctx.fillStyle = "#dcdcdc"
    ctx.fillRect(-centralW/2 - 15, -p.height - 15, centralW + 30, 15)
    ctx.fillRect(-centralW/4, -p.height - 35, centralW/2, 20)

    // Flagpole
    ctx.strokeStyle = "#999"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, -p.height - 35)
    ctx.lineTo(0, -p.height - 80)
    ctx.stroke()

    // National Flag (Waving effect)
    const time = Date.now() * 0.003
    ctx.save()
    ctx.translate(0, -p.height - 80)
    ctx.fillStyle = "#FF0000"
    // Draw flag with slight wave
    ctx.beginPath()
    ctx.moveTo(0, 0)
    for(let x=0; x<=30; x+=5) {
        ctx.lineTo(x, Math.sin(time + x*0.1) * 2)
    }
    for(let x=30; x>=0; x-=5) {
        ctx.lineTo(x, 18 + Math.sin(time + x*0.1) * 2)
    }
    ctx.closePath()
    ctx.fill()
    
    // Star on waving flag
    ctx.fillStyle = "#FFFF00"
    this.drawStar(15, 9 + Math.sin(time + 1.5) * 1, 5, 5, 2.5, ctx)
    ctx.fill()
    ctx.restore()

    // Windows (Detailed grid)
    ctx.fillStyle = "#1a2a3a" // Dark blue windows
    const winW = 12
    const winH = 15
    const winGapX = 20
    const winGapY = 25
    for(let row = 0; row < 3; row++) {
        for(let x = -p.width/2 + 15; x < p.width/2 - 15; x += winGapX) {
            // Avoid drawing windows in the central section area if they overlap too much
            if (Math.abs(x) < centralW/2 - 5) continue;
            ctx.fillRect(x, -p.height + 20 + row * winGapY, winW, winH)
        }
    }
    // Windows in central section
    for(let row = 0; row < 3; row++) {
        ctx.fillRect(-winW/2, -p.height + 20 + row * winGapY, winW, winH)
    }

    // Entrance Steps
    ctx.fillStyle = "#bbb"
    for(let i=0; i<3; i++) {
        const stepW = centralW + 20 - i*5
        ctx.fillRect(-stepW/2, -i*3, stepW, 3)
    }

    ctx.restore()
  }

  launchFirework() {
    const x = this.width * (0.15 + Math.random() * 0.7)
    const targetY = this.height * (0.1 + Math.random() * 0.35)
    const color = this.fireworkColors[Math.floor(Math.random() * this.fireworkColors.length)]
    
    this.fireworks.push({
      x,
      y: this.height,
      targetX: x + (Math.random() - 0.5) * 100,
      targetY,
      speed: 8 + Math.random() * 6,
      color,
      trail: [],
      size: 2
    })
  }

  updateFirework(fw) {
    fw.trail.push({ x: fw.x, y: fw.y })
    if (fw.trail.length > 8) fw.trail.shift()
    
    const dx = fw.targetX - fw.x
    const dy = fw.targetY - fw.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < 10 || fw.speed < 1.0) {
      this.burst(fw)
      return true
    }

    const angle = Math.atan2(dy, dx)
    fw.x += Math.cos(angle) * fw.speed
    fw.y += Math.sin(angle) * fw.speed
    fw.speed *= 0.985
    
    return false
  }

  drawFirework(fw) {
    const ctx = this.ctx
    ctx.save()
    
    // Draw trail
    ctx.beginPath()
    for (let i = 0; i < fw.trail.length; i++) {
      const p = fw.trail[i]
      const alpha = (i / fw.trail.length) * 0.5
      ctx.globalAlpha = alpha
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.strokeStyle = fw.color
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
    
    // Head
    ctx.globalAlpha = 1
    ctx.fillStyle = "#fff"
    ctx.beginPath()
    ctx.arc(fw.x, fw.y, fw.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  burst(fw) {
    // Initial Flash
    this.particles.push({
      x: fw.x,
      y: fw.y,
      isFlash: true,
      alpha: 1,
      decay: 0.15,
      size: 50
    })

    const isStarBurst = Math.random() < 0.3
    let count = 80 + Math.floor(Math.random() * 40)

    if (isStarBurst) {
      // Create a star shape burst
      const points = 5
      const innerRadius = 2
      const outerRadius = 5
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 6 + 2
        // Slightly bias particles towards star points
        const starBias = Math.sin(angle * 2.5) * 0.5 + 0.5
        this.addParticle(fw.x, fw.y, angle, speed * (0.5 + starBias * 0.5), fw.color === "#FF0000" ? "#FFFF00" : "#FF0000")
      }
    } else {
      // Normal sphere burst
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.pow(Math.random(), 2) * 8 + 2
        this.addParticle(fw.x, fw.y, angle, speed, fw.color)
      }
    }

    // Extra glitter (yellow stars)
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 4
      this.particles.push({
        x: fw.x,
        y: fw.y,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        color: "#FFFF00",
        alpha: 1,
        decay: 0.01 + Math.random() * 0.02,
        gravity: 0.05,
        friction: 0.98,
        size: 1 + Math.random(),
        sparkle: true,
        isGlitter: true,
        trail: []
      })
    }

    // Chance to spawn celebratory text
    if (Math.random() < 0.25) {
      const msg = this.messages[Math.floor(Math.random() * this.messages.length)]
      this.texts.push({
        x: fw.x,
        y: fw.y,
        text: msg,
        alpha: 1,
        decay: 0.006 + Math.random() * 0.004,
        speedY: -0.4 - Math.random() * 0.8,
        fontSize: msg.length > 10 ? 16 + Math.floor(Math.random() * 10) : 22 + Math.floor(Math.random() * 12),
        color: fw.color
      })
    }

    // Occasional tank spawn
    if (Math.random() < 0.15) {
      this.spawnTank()
    }
  }

  spawnTank() {
    const direction = Math.random() < 0.5 ? 1 : -1
    const x = direction === 1 ? -100 : this.width + 100
    this.tanks.push({
      x: x,
      y: this.height - 40 - Math.random() * 20,
      direction: direction,
      speed: 1.5 + Math.random() * 1.5,
      scale: 0.6 + Math.random() * 0.4,
      alpha: 1,
      color: "#2d4a22" // Army Green
    })
  }

  updateTank(tank) {
    tank.x += tank.direction * tank.speed

    // Collision with gate
    if (this.gate.state === "closed" && tank.direction === 1 && tank.x > this.gate.x - 20) {
      this.gate.state = "opening"
      // Big celebration when gate breaks
      for(let i=0; i<5; i++) setTimeout(() => this.launchFirework(), i * 300)
    }

    // Remove when out of screen
    if (tank.direction === 1 && tank.x > this.width + 150) return true
    if (tank.direction === -1 && tank.x < -150) return true
    return false
  }

  drawGate() {
    const ctx = this.ctx
    const gate = this.gate
    
    if (gate.state === "opening") {
      gate.angle += 0.05
      if (gate.angle >= Math.PI / 2) {
        gate.angle = Math.PI / 2
        gate.state = "open"
      }
    }

    ctx.save()
    ctx.translate(gate.x, gate.y)
    
    // Pillars
    ctx.fillStyle = "#222" // Darker pillars
    ctx.fillRect(-gate.width/2 - 10, -gate.height, 10, gate.height)
    ctx.fillRect(gate.width/2, -gate.height, 10, gate.height)

    // Left Gate
    ctx.save()
    ctx.translate(-gate.width/2, 0)
    ctx.rotate(-gate.angle)
    ctx.strokeStyle = "#000" // Black gate
    ctx.lineWidth = 3
    ctx.strokeRect(0, -gate.height + 10, gate.width/2, gate.height - 10)
    // Bars
    for(let i=10; i<gate.width/2; i+=15) {
      ctx.beginPath()
      ctx.moveTo(i, -gate.height + 10)
      ctx.lineTo(i, 0)
      ctx.stroke()
    }
    ctx.restore()

    // Right Gate
    ctx.save()
    ctx.translate(gate.width/2, 0)
    ctx.rotate(gate.angle)
    ctx.strokeStyle = "#000" // Black gate
    ctx.lineWidth = 3
    ctx.strokeRect(-gate.width/2, -gate.height + 10, gate.width/2, gate.height - 10)
    // Bars
    for(let i=10; i<gate.width/2; i+=15) {
      ctx.beginPath()
      ctx.moveTo(-i, -gate.height + 10)
      ctx.lineTo(-i, 0)
      ctx.stroke()
    }
    ctx.restore()

    ctx.restore()
  }

  drawTank(tank) {
    const ctx = this.ctx
    ctx.save()
    ctx.translate(tank.x, tank.y)
    ctx.scale(tank.scale * tank.direction, tank.scale)
    ctx.globalAlpha = 0.9

    // Body
    ctx.fillStyle = tank.color
    ctx.beginPath()
    ctx.roundRect(-40, 0, 80, 25, 5)
    ctx.fill()
    
    // Turret base
    ctx.beginPath()
    ctx.roundRect(-25, -15, 50, 20, 10)
    ctx.fill()
    
    // Barrel
    ctx.beginPath()
    ctx.rect(10, -8, 45, 6)
    ctx.fill()

    // Wheels
    ctx.fillStyle = "#1a1a1a"
    for(let i = -30; i <= 30; i += 15) {
      ctx.beginPath()
      ctx.arc(i, 22, 6, 0, Math.PI * 2)
      ctx.fill()
    }

    // National flag on tank
    ctx.translate(-5, -25)
    ctx.fillStyle = "#FF0000"
    ctx.fillRect(0, 0, 20, 14)
    ctx.fillStyle = "#FFFF00"
    this.drawStar(10, 7, 5, 4, 2, ctx)
    ctx.fill()

    ctx.restore()
  }

  addParticle(x, y, angle, speed, color) {
    this.particles.push({
      x,
      y,
      speedX: Math.cos(angle) * speed,
      speedY: Math.sin(angle) * speed,
      color: color,
      alpha: 1,
      decay: 0.015 + Math.random() * 0.02,
      gravity: 0.07,
      friction: 0.96,
      size: 1.2 + Math.random() * 1.2,
      sparkle: Math.random() < 0.2,
      trail: []
    })
  }

  updateParticle(p) {
    if (p.isFlash) {
      p.alpha -= p.decay
      return p.alpha <= 0
    }

    p.trail.push({ x: p.x, y: p.y })
    if (p.trail.length > 3) p.trail.shift()

    p.speedX *= p.friction
    p.speedY *= p.friction
    p.speedY += p.gravity
    p.x += p.speedX
    p.y += p.speedY
    p.alpha -= p.decay
    
    return p.alpha <= 0
  }

  drawParticle(p) {
    const ctx = this.ctx
    if (p.isFlash) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.3})`
      ctx.fill()
      ctx.restore()
      return
    }

    ctx.save()
    if (p.trail.length > 1) {
      ctx.beginPath()
      ctx.globalAlpha = p.alpha * 0.4
      ctx.strokeStyle = p.color
      ctx.lineWidth = p.size
      ctx.moveTo(p.trail[0].x, p.trail[0].y)
      for (let i = 1; i < p.trail.length; i++) {
        ctx.lineTo(p.trail[i].x, p.trail[i].y)
      }
      ctx.stroke()
    }

    let alpha = p.alpha
    if (p.sparkle && Math.random() < 0.2) alpha = 0

    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.beginPath()
    // For reunification day, some particles can be small stars
    if (p.isGlitter) {
        this.drawStar(p.x, p.y, 5, p.size * 2, p.size, ctx)
    } else {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    }
    ctx.fill()

    if (p.alpha > 0.7 && !p.isGlitter) {
        ctx.fillStyle = "#fff"
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2)
        ctx.fill()
    }
    ctx.restore()
  }

  drawStar(cx, cy, spikes, outerRadius, innerRadius, ctx) {
    let rot = Math.PI / 2 * 3
    let x = cx
    let y = cy
    let step = Math.PI / spikes

    ctx.beginPath()
    ctx.moveTo(cx, cy - outerRadius)
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius
        y = cy + Math.sin(rot) * outerRadius
        ctx.lineTo(x, y)
        rot += step

        x = cx + Math.cos(rot) * innerRadius
        y = cy + Math.sin(rot) * innerRadius
        ctx.lineTo(x, y)
        rot += step
    }
    ctx.lineTo(cx, cy - outerRadius)
    ctx.closePath()
  }

  animate(timestamp) {
    if (!this.active) return
    this._animId = requestAnimationFrame((ts) => this.animate(ts))
    if (document.visibilityState === "hidden") return

    const elapsed = timestamp - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = timestamp - (elapsed % this.fpsInterval)

    const ctx = this.ctx
    
    ctx.globalCompositeOperation = "destination-out"
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
    ctx.fillRect(0, 0, this.width, this.height)
    ctx.globalCompositeOperation = "source-over" 
    this.drawPalace()
    this.drawGate()

    ctx.globalCompositeOperation = "lighter" 

    if (Math.random() < 0.025) this.launchFirework()
    if (Math.random() < 0.003) {
        for(let i=0; i<3; i++) setTimeout(() => {
          if (this.active) this.launchFirework()
        }, i * 400)
    }

    this.fireworks = this.fireworks.filter((fw) => {
      this.drawFirework(fw)
      return !this.updateFirework(fw)
    })

    this.particles = this.particles.filter((p) => {
      this.drawParticle(p)
      return !this.updateParticle(p)
    })

    this.texts = this.texts.filter((t) => {
      this.drawText(t)
      return !this.updateText(t)
    })

    ctx.globalCompositeOperation = "source-over"
    this.tanks = this.tanks.filter((tank) => {
      this.drawTank(tank)
      return !this.updateTank(tank)
    })
  }

  updateText(t) {
    t.y += t.speedY
    t.alpha -= t.decay
    return t.alpha <= 0
  }

  drawText(t) {
    const ctx = this.ctx
    ctx.save()
    ctx.globalAlpha = t.alpha
    ctx.fillStyle = t.color
    ctx.font = `bold ${t.fontSize}px Arial, sans-serif`
    ctx.textAlign = "center"
    ctx.shadowBlur = 10
    ctx.shadowColor = t.color
    ctx.fillText(t.text, t.x, t.y)
    ctx.restore()
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this.resize()
    this.lastDrawTime = 0
    this._animId = requestAnimationFrame((ts) => this.animate(ts))
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    this.canvas.style.display = "none"
    this.fireworks = []
    this.particles = []
    this.texts = []
    this.tanks = []
    if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }
}
