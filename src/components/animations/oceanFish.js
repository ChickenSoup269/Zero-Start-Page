export class OceanFishEffect {
  constructor(canvasId, color = "#ff7f50") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color

    // Arrays for different creatures
    this.fishes = []
    this.crabs = []
    this.squids = []
    this.turtles = []
    this.seaweeds = []
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
    this.crabs = []
    this.squids = []
    this.turtles = []
    this.seaweeds = []
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

    // Initialize Crabs
    for (let i = 0; i < Math.max(1, baseCount / 4); i++) {
      // Red-orange hue for crabs usually, or based on color
      const h = (baseHsl.h + 20) % 360
      this.crabs.push({
        x: Math.random() * this.canvas.width,
        y: this.canvas.height, // They walk at the bottom
        vx: (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random()),
        size: Math.random() * 8 + 12,
        color: `hsl(${h}, 80%, 50%)`,
        legOffset: 0,
      })
    }

    // Initialize Squids
    for (let i = 0; i < Math.max(1, baseCount / 6); i++) {
      // Pinkish hue for squids
      const h = (baseHsl.h - 40 + 360) % 360
      this.squids.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vy: -Math.random() * 2 - 1,
        size: Math.random() * 15 + 15,
        color: `hsl(${h}, 70%, 65%)`,
        pulseOffset: Math.random() * Math.PI * 2,
        pulseSpeed: 0.05,
      })
    }

    // Initialize Seaweeds (Reduced count)
    for (let i = 0; i < Math.max(3, baseCount / 1.5); i++) {
      this.seaweeds.push({
        x: Math.random() * this.canvas.width,
        height: Math.random() * 150 + 50,
        size: Math.random() * 8 + 6,
        segments: Math.floor(Math.random() * 3) + 4,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 0.02 + 0.01,
        color: `rgba(46, 139, 87, ${Math.random() * 0.4 + 0.5})`, // Sea green
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
      this.animate(t)
      if (this.active) {
        requestAnimationFrame(animateLoop)
      }
    }
    requestAnimationFrame(animateLoop)
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

  drawSeaweeds() {
    this.ctx.lineCap = "round"
    this.seaweeds.forEach((weed) => {
      weed.swayOffset += weed.swaySpeed
      let curX = weed.x
      let curY = this.canvas.height
      let segHeight = weed.height / weed.segments

      this.ctx.beginPath()
      this.ctx.moveTo(curX, curY)
      this.ctx.lineWidth = weed.size
      this.ctx.strokeStyle = weed.color

      for (let i = 1; i <= weed.segments; i++) {
        // Dynamic sway based on height and mouse interact
        let interact = 0
        if (
          this.mouseY > this.canvas.height - weed.height &&
          Math.abs(this.mouseX - weed.x) < 100
        ) {
          interact = (this.mouseX > weed.x ? -10 : 10) * (i / weed.segments)
        }
        let sway = Math.sin(weed.swayOffset + i * 0.5) * (5 * i) + interact
        curX = weed.x + sway
        curY -= segHeight
        this.ctx.lineTo(curX, curY)
      }
      this.ctx.stroke()
    })
  }

  drawCrabs() {
    this.crabs.forEach((crab) => {
      // Behavior: flee mouse if near bottom
      let dx = crab.x - this.mouseX
      let dy = crab.y - this.mouseY
      let dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 150) {
        crab.vx = dx > 0 ? 3 : -3
      } else {
        // Slow down and standard wander
        crab.vx *= 0.95
        if (Math.abs(crab.vx) < 1) crab.vx = Math.sign(crab.vx) * 1
        if (Math.random() < 0.005) crab.vx *= -1 // Randomly switch direction
      }

      crab.x += crab.vx
      if (crab.x < -50) crab.x = this.canvas.width + 50
      if (crab.x > this.canvas.width + 50) crab.x = -50

      crab.legOffset += Math.abs(crab.vx) * 0.3

      this.ctx.save()
      this.ctx.translate(crab.x, crab.y - crab.size / 2)

      this.ctx.shadowColor = "rgba(0,0,0,0.3)"
      this.ctx.shadowBlur = 5
      this.ctx.shadowOffsetY = 4

      // Draw Legs
      this.ctx.strokeStyle = crab.color
      this.ctx.lineWidth = crab.size / 4
      this.ctx.lineCap = "round"
      this.ctx.lineJoin = "round"
      for (let side = -1; side <= 1; side += 2) {
        for (let leg = 1; leg <= 3; leg++) {
          this.ctx.beginPath()
          this.ctx.moveTo(side * crab.size * 0.5, 0)
          let legLift = Math.sin(crab.legOffset + leg + side) * (crab.size / 3)
          this.ctx.lineTo(side * crab.size * 1.2, -leg * 2)
          this.ctx.lineTo(side * crab.size * 1.5, crab.size / 2 + legLift)
          this.ctx.stroke()
        }
        // Claws
        this.ctx.beginPath()
        this.ctx.moveTo(side * crab.size * 0.5, 0)
        let clawLift = Math.sin(crab.legOffset * 0.5 + side) * 3
        this.ctx.lineTo(side * crab.size * 1.8, -crab.size * 0.8 + clawLift)
        this.ctx.stroke()
        this.ctx.beginPath()
        this.ctx.arc(
          side * crab.size * 1.8,
          -crab.size * 0.8 + clawLift,
          crab.size / 3,
          0,
          Math.PI,
          side > 0,
        )
        this.ctx.fill()
      }

      // Draw Body
      this.ctx.fillStyle = crab.color
      this.ctx.beginPath()
      this.ctx.ellipse(0, 0, crab.size, crab.size * 0.6, 0, 0, Math.PI * 2)
      this.ctx.fill()

      // Draw Eyes
      this.ctx.shadowBlur = 0
      this.ctx.fillStyle = "#fff"
      this.ctx.beginPath()
      this.ctx.arc(
        -crab.size * 0.3,
        -crab.size * 0.6,
        crab.size * 0.15,
        0,
        Math.PI * 2,
      )
      this.ctx.fill()
      this.ctx.beginPath()
      this.ctx.arc(
        crab.size * 0.3,
        -crab.size * 0.6,
        crab.size * 0.15,
        0,
        Math.PI * 2,
      )
      this.ctx.fill()
      this.ctx.fillStyle = "#000"
      this.ctx.beginPath()
      this.ctx.arc(
        -crab.size * 0.3,
        -crab.size * 0.65,
        crab.size * 0.08,
        0,
        Math.PI * 2,
      )
      this.ctx.fill()
      this.ctx.beginPath()
      this.ctx.arc(
        crab.size * 0.3,
        -crab.size * 0.65,
        crab.size * 0.08,
        0,
        Math.PI * 2,
      )
      this.ctx.fill()

      this.ctx.restore()
    })
  }

  drawSquids() {
    this.squids.forEach((sq) => {
      // Flee mouse
      let dx = sq.x - this.mouseX
      let dy = sq.y - this.mouseY
      let dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 150) {
        sq.vy = -3
        sq.pulseSpeed = 0.2
        sq.x += dx * 0.05 // dart sideways too
      }

      // Gravity / Sink naturally
      sq.vy += 0.02
      if (sq.vy > 1.5) sq.vy = 1.5
      if (Math.abs(sq.vy) < 0.2 && Math.random() < 0.02) {
        // Random swim burst
        sq.vy = -2.5
        sq.pulseSpeed = 0.2
      }

      sq.y += sq.vy
      // Gentle horizontal sway
      sq.x += Math.sin(sq.pulseOffset / 2) * 0.5

      // Wrap around limits
      if (sq.y < -100) sq.y = this.canvas.height + 100
      if (sq.y > this.canvas.height + 100) sq.y = -100
      if (sq.x < -50) sq.x = this.canvas.width + 50
      if (sq.x > this.canvas.width + 50) sq.x = -50

      sq.pulseOffset += sq.pulseSpeed
      sq.pulseSpeed = Math.max(0.04, sq.pulseSpeed - 0.005) // Dampen pulse

      this.ctx.save()
      this.ctx.translate(sq.x, sq.y)

      // Tilt slightly based on sway
      let tilt = Math.sin(sq.pulseOffset / 2) * 0.2
      this.ctx.rotate(tilt)

      this.ctx.shadowColor = "rgba(0,0,0,0.2)"
      this.ctx.shadowBlur = 8
      this.ctx.shadowOffsetY = 5

      // Draw Tentacles
      this.ctx.strokeStyle = sq.color
      this.ctx.lineWidth = sq.size * 0.2
      this.ctx.lineCap = "round"
      for (let i = -1.5; i <= 1.5; i += 1) {
        this.ctx.beginPath()
        this.ctx.moveTo(i * sq.size * 0.3, sq.size * 0.3)
        let tPulse1 = Math.sin(sq.pulseOffset - i) * sq.size * 0.5
        let tPulse2 = Math.cos(sq.pulseOffset - i) * sq.size * 0.5
        // Lengthen tentacles when falling, squish when pushing
        let tentacleLen = sq.size * (sq.vy > 0 ? 2 : 1.2)
        this.ctx.quadraticCurveTo(
          i * sq.size + tPulse1,
          sq.size + tentacleLen / 2,
          i * sq.size * 0.2 + tPulse2,
          sq.size + tentacleLen,
        )
        this.ctx.stroke()
      }

      // Draw Head (Mantle)
      this.ctx.fillStyle = sq.color
      this.ctx.beginPath()
      this.ctx.moveTo(0, -sq.size * 1.5) // Top tip
      this.ctx.quadraticCurveTo(sq.size, -sq.size, sq.size * 0.6, sq.size * 0.5) // Right side
      this.ctx.lineTo(-sq.size * 0.6, sq.size * 0.5) // Bottom base
      this.ctx.quadraticCurveTo(-sq.size, -sq.size, 0, -sq.size * 1.5) // Left side
      this.ctx.fill()

      // Draw Eyes
      this.ctx.shadowBlur = 0
      this.ctx.fillStyle = "rgba(255,255,255,0.9)"
      this.ctx.beginPath()
      this.ctx.arc(-sq.size * 0.4, 0, sq.size * 0.2, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.beginPath()
      this.ctx.arc(sq.size * 0.4, 0, sq.size * 0.2, 0, Math.PI * 2)
      this.ctx.fill()

      this.ctx.fillStyle = "#111" // pupil looking forward slightly offset by sway
      this.ctx.beginPath()
      this.ctx.arc(
        -sq.size * 0.4 + tilt * 3,
        sq.size * 0.05,
        sq.size * 0.1,
        0,
        Math.PI * 2,
      )
      this.ctx.fill()
      this.ctx.beginPath()
      this.ctx.arc(
        sq.size * 0.4 + tilt * 3,
        sq.size * 0.05,
        sq.size * 0.1,
        0,
        Math.PI * 2,
      )
      this.ctx.fill()

      this.ctx.restore()
    })
  }

  drawTurtles() {
    this.turtles.forEach((t) => {
      // Very slow turn behavior
      let dx = t.x - this.mouseX
      let dy = t.y - this.mouseY
      let dist = Math.sqrt(dx * dx + dy * dy)

      let targetAngle = 0
      if (dist < 250) {
        // Swim away slowly
        targetAngle = Math.atan2(dy, dx)
        t.flipperSpeed = 0.08
        t.vx += Math.cos(targetAngle) * 0.05
        t.vy += Math.sin(targetAngle) * 0.05
      } else {
        t.flipperSpeed = 0.03 // relaxed swim
        targetAngle = Math.atan2(t.vy, t.vx) + (Math.random() - 0.5) * 0.2
        t.vx = Math.cos(targetAngle) * 1.2
        t.vy = Math.sin(targetAngle) * 1.2
      }

      // Limit speed
      const currentSpeed = Math.sqrt(t.vx * t.vx + t.vy * t.vy)
      const maxSpeed = dist < 250 ? 2 : 1.2
      if (currentSpeed > maxSpeed) {
        t.vx = (t.vx / currentSpeed) * maxSpeed
        t.vy = (t.vy / currentSpeed) * maxSpeed
      }

      t.x += t.vx
      t.y += t.vy
      t.flipperOffset += t.flipperSpeed

      // Wrap around limits
      if (t.y < -100) t.y = this.canvas.height + 100
      if (t.y > this.canvas.height + 100) t.y = -100
      if (t.x < -100) t.x = this.canvas.width + 100
      if (t.x > this.canvas.width + 100) t.x = -100

      let angle = Math.atan2(t.vy, t.vx)

      this.ctx.save()
      this.ctx.translate(t.x, t.y)
      this.ctx.rotate(angle)

      this.ctx.shadowColor = "rgba(0,0,0,0.3)"
      this.ctx.shadowBlur = 10
      this.ctx.shadowOffsetY = 8

      // Draw Flippers
      this.ctx.fillStyle = "rgba(85, 107, 47, 1)" // dark olive green skin
      let swimWobble = Math.sin(t.flipperOffset)

      // Front flippers (rotate wildly up and down simulating swimming strokes)
      this.ctx.save()
      this.ctx.translate(t.size * 0.4, t.size * 0.6)
      this.ctx.rotate(swimWobble * 0.6)
      this.ctx.beginPath()
      this.ctx.ellipse(
        0,
        t.size * 0.8,
        t.size * 0.2,
        t.size * 0.8,
        -Math.PI / 6,
        0,
        Math.PI * 2,
      )
      this.ctx.fill()
      this.ctx.restore()

      this.ctx.save()
      this.ctx.translate(t.size * 0.4, -t.size * 0.6)
      this.ctx.rotate(-swimWobble * 0.6)
      this.ctx.beginPath()
      this.ctx.ellipse(
        0,
        -t.size * 0.8,
        t.size * 0.2,
        t.size * 0.8,
        Math.PI / 6,
        0,
        Math.PI * 2,
      )
      this.ctx.fill()
      this.ctx.restore()

      // Back flippers (less movement)
      this.ctx.save()
      this.ctx.translate(-t.size * 0.6, t.size * 0.5)
      this.ctx.rotate(swimWobble * 0.2)
      this.ctx.beginPath()
      this.ctx.ellipse(
        -t.size * 0.3,
        t.size * 0.4,
        t.size * 0.15,
        t.size * 0.4,
        -Math.PI / 4,
        0,
        Math.PI * 2,
      )
      this.ctx.fill()
      this.ctx.restore()

      this.ctx.save()
      this.ctx.translate(-t.size * 0.6, -t.size * 0.5)
      this.ctx.rotate(-swimWobble * 0.2)
      this.ctx.beginPath()
      this.ctx.ellipse(
        -t.size * 0.3,
        -t.size * 0.4,
        t.size * 0.15,
        t.size * 0.4,
        Math.PI / 4,
        0,
        Math.PI * 2,
      )
      this.ctx.fill()
      this.ctx.restore()

      // Draw Head
      this.ctx.beginPath()
      this.ctx.ellipse(
        t.size * 1.1,
        0,
        t.size * 0.4,
        t.size * 0.3,
        0,
        0,
        Math.PI * 2,
      )
      this.ctx.fill()

      // Draw Shell
      this.ctx.fillStyle = t.color
      this.ctx.beginPath()
      this.ctx.ellipse(0, 0, t.size, t.size * 0.8, 0, 0, Math.PI * 2)
      this.ctx.fill()

      // Shell Patterns (hexagons/scutes logic simplified)
      this.ctx.strokeStyle = "rgba(0,0,0,0.3)"
      this.ctx.lineWidth = 1.5
      this.ctx.beginPath()
      this.ctx.ellipse(0, 0, t.size * 0.7, t.size * 0.5, 0, 0, Math.PI * 2)
      this.ctx.stroke()
      this.ctx.beginPath()
      this.ctx.moveTo(0, -t.size * 0.5)
      this.ctx.lineTo(0, t.size * 0.5)
      this.ctx.moveTo(-t.size * 0.4, 0)
      this.ctx.lineTo(t.size * 0.4, 0)
      this.ctx.stroke()

      this.ctx.restore()
    })
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

    this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      let b = this.bubbles[i]
      b.y -= b.speed
      b.wobble += b.wobbleSpeed
      const hoverX = b.x + Math.sin(b.wobble) * 20

      this.ctx.beginPath()
      this.ctx.arc(hoverX, b.y, b.size, 0, Math.PI * 2)
      this.ctx.fill()

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

      this.ctx.save()
      this.ctx.translate(fish.x, fish.y)
      this.ctx.rotate(angle)

      this.ctx.shadowColor = "rgba(0,0,0,0.2)"
      this.ctx.shadowBlur = 10
      this.ctx.shadowOffsetX = 0
      this.ctx.shadowOffsetY = 8

      this.ctx.fillStyle = fish.color

      // Tail
      const tailWobble = Math.sin(fish.finOffset) * (fish.size / 2.5)
      this.ctx.beginPath()
      this.ctx.moveTo(-fish.size / 1.5, 0)
      this.ctx.lineTo(-fish.size * 1.8, -fish.size / 1.5 + tailWobble)
      this.ctx.lineTo(-fish.size * 1.8, fish.size / 1.5 + tailWobble)
      this.ctx.fill()

      // Top Fin
      this.ctx.beginPath()
      this.ctx.moveTo(-fish.size / 3, -fish.size / 2)
      this.ctx.bezierCurveTo(
        0,
        -fish.size * 1.2,
        fish.size / 2,
        -fish.size * 0.8,
        fish.size / 3,
        -fish.size / 2,
      )
      this.ctx.fill()

      // Body
      this.ctx.beginPath()
      this.ctx.ellipse(0, 0, fish.size, fish.size / 2, 0, 0, Math.PI * 2)
      this.ctx.fill()

      // Pectoral Fin
      this.ctx.fillStyle = "rgba(255,255,255,0.4)"
      this.ctx.beginPath()
      const pctWobble = Math.sin(fish.finOffset - Math.PI / 4) * (fish.size / 4)
      this.ctx.ellipse(
        -fish.size / 8,
        fish.size / 4,
        fish.size / 2.5,
        fish.size / 5,
        Math.PI / 8 + pctWobble / fish.size,
        0,
        Math.PI * 2,
      )
      this.ctx.fill()

      // Eye
      this.ctx.shadowBlur = 0
      this.ctx.fillStyle = "rgba(255,255,255,0.9)"
      this.ctx.beginPath()
      this.ctx.arc(fish.size / 2, -fish.size / 5, fish.size / 5, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.fillStyle = "#111"
      this.ctx.beginPath()
      this.ctx.arc(
        fish.size / 2 + 1,
        -fish.size / 5,
        fish.size / 8,
        0,
        Math.PI * 2,
      )
      this.ctx.fill()

      this.ctx.restore()
    })
  }

  animate(currentTime = 0) {
    if (!this.active) return

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Call modular drawing functions
    this.drawSeaweeds()
    this.drawSquids()
    this.drawFishesAndBubbles()
    this.drawCrabs()
  }
}
