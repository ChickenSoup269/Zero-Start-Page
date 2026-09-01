/**
 * Jellyfish — Ultra-HD Bioluminescent Sea Creatures Engine
 *
 * Supported Creatures:
 *  - Bioluminescent Jellyfish (Translucent contracting bell & silky tentacles)
 *  - Ancient Sea Turtle (Luminous carapace & fluid 4-flipper swim cycle)
 *  - Oceanic Manta Ray (Majestic undulating wing waves & whip tail)
 *  - Celestial Whale (Gentle ocean giant with starry bioluminescent patterns)
 *  - Mystic Dolphin (Playful streamlined swimmer with bubble rings)
 *
 * Features:
 *  - Native 60/120 FPS Retina / High-DPI Subpixel Canvas
 *  - Full Dynamic Custom Palette Inheritance (Color picker applies to all creatures)
 *  - Deep Sea Ambient Plankton Motes & Specular Glass Bubbles
 *  - Smooth Inertial Kinematics & Natural Turn Banking
 */

export class Jellyfish {
  constructor(
    canvasId,
    color = "#ffaa00",
    type = "jellyfish",
    numTentacles = 12,
    size = 42,
  ) {
    this.canvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.color = color || "#ffaa00"
    this.type = type || "jellyfish"
    this.numTentacles = numTentacles
    this.baseSize = size

    this.SEG = 20
    this.SEG_LEN = 13

    this.head = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    this.target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    this.vel = { x: 0, y: 0 }
    this.currentAngle = 0
    this.lastMouseTime = Date.now()

    this.pulseT = 0
    this.swimT = 0
    this.bobT = 0
    this.roamT = Math.random() * 100

    this.animationId = null
    this.running = false
    this.dpr = 1
    this.cssWidth = 0
    this.cssHeight = 0

    this.tentacles = []
    this.spores = []
    this.bubbles = []
    this.bubbleRings = []

    this._setColorCache(this.color)
    this._initTentacles()
    this._initAmbientEnvironment()

    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleResize = this.handleResize.bind(this)
    this.animate = this.animate.bind(this)
  }

  _setColorCache(hex) {
    this.color = hex || "#ffaa00"
    const rgb = this._hexToRgb(this.color)
    this.rgb = rgb
    this.rgbStr = `${rgb.r},${rgb.g},${rgb.b}`
  }

  _hexToRgb(hex) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "")
    if (!match) return { r: 255, g: 170, b: 0 }
    return {
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16),
    }
  }

  _initAmbientEnvironment() {
    const W = window.innerWidth
    const H = window.innerHeight

    this.bubbles = Array.from({ length: 24 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1.2 + Math.random() * 2.8,
      speed: 0.3 + Math.random() * 0.5,
      sway: 0.5 + Math.random() * 1.2,
      swayPhase: Math.random() * Math.PI * 2,
    }))
  }

  _initTentacles() {
    this.tentacles = []
    for (let t = 0; t < this.numTentacles; t++) {
      const segs = []
      for (let i = 0; i < this.SEG; i++) {
        segs.push({ x: this.head.x, y: this.head.y })
      }
      this.tentacles.push({
        segs,
        phase: (t / this.numTentacles) * Math.PI * 2,
        lengthMult: 0.8 + Math.random() * 0.45,
      })
    }
  }

  start() {
    if (this.running) return
    this.running = true
    this.canvas.style.display = "block"
    this.handleResize()
    window.addEventListener("mousemove", this.handleMouseMove)
    window.addEventListener("resize", this.handleResize)
    this.animate()
  }

  stop() {
    this.running = false
    if (this.animationId) cancelAnimationFrame(this.animationId)
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    window.removeEventListener("mousemove", this.handleMouseMove)
    window.removeEventListener("resize", this.handleResize)
    if (this.ctx)
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  updateColor(color) {
    this._setColorCache(color)
  }

  updateType(type) {
    this.type = type || "jellyfish"
    this._initTentacles()
  }

  handleMouseMove(e) {
    this.mouse.x = e.clientX
    this.mouse.y = e.clientY
    this.lastMouseTime = Date.now()
  }

  handleResize() {
    this.cssWidth = window.innerWidth
    this.cssHeight = window.innerHeight
    this.canvas.width = this.cssWidth
    this.canvas.height = this.cssHeight
    this.canvas.style.width = `${this.cssWidth}px`
    this.canvas.style.height = `${this.cssHeight}px`
  }

  _emitSpores(x, y) {
    if (this.spores.length >= 25) return
    this.spores.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 0.2 + Math.random() * 0.4,
      r: 0.8 + Math.random() * 1.2,
      life: 1.0,
      decay: 0.02 + Math.random() * 0.015,
    })
  }

  animate() {
    if (!this.running) return
    if (document.visibilityState === "hidden") {
      document.addEventListener(
        "visibilitychange",
        () => {
          if (!document.hidden && this.running)
            requestAnimationFrame(this.animate)
        },
        { once: true },
      )
      return
    }
    this.animationId = this._animId = requestAnimationFrame(this.animate)

    const ctx = this.ctx
    const W = this.cssWidth
    const H = this.cssHeight

    ctx.clearRect(0, 0, W, H)

    const now = Date.now()
    this.pulseT += 0.045
    this.swimT += 0.035
    this.bobT += 0.02

    // AI Movement
    if (now - this.lastMouseTime > 2500) {
      this.roamT += 0.006
      const tx =
        W * 0.5 +
        Math.cos(this.roamT * 0.8) * (W * 0.35) +
        Math.sin(this.roamT * 1.5) * 80
      const ty = H * 0.45 + Math.sin(this.roamT * 0.7) * (H * 0.25)
      this.target.x += (tx - this.target.x) * 0.018
      this.target.y += (ty - this.target.y) * 0.018
    } else {
      const dx = this.mouse.x - this.target.x
      const dy = this.mouse.y - this.target.y
      const dist = Math.hypot(dx, dy)

      if (dist < 90) {
        const orbitAngle = now * 0.0018
        this.target.x +=
          (this.mouse.x + Math.cos(orbitAngle) * 75 - this.target.x) * 0.04
        this.target.y +=
          (this.mouse.y + Math.sin(orbitAngle) * 55 - this.target.y) * 0.04
      } else {
        this.target.x += dx * 0.035
        this.target.y += dy * 0.035
      }
    }

    this.vel.x += (this.target.x - this.head.x) * 0.035
    this.vel.y += (this.target.y - this.head.y) * 0.035
    this.vel.x *= 0.86
    this.vel.y *= 0.86
    this.head.x += this.vel.x
    this.head.y += this.vel.y

    const targetAngle = Math.atan2(this.vel.y, this.vel.x)
    let angleDiff = targetAngle - this.currentAngle
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
    this.currentAngle += angleDiff * 0.08

    const bobY = Math.sin(this.bobT) * 4
    const cx = this.head.x
    const cy = this.head.y + bobY
    const pulse = Math.sin(this.pulseT)

    // Draw Ambient Elements
    this._drawBubbles()
    this._drawBubbleRings()
    this._drawSpores()

    if (Math.random() < 0.25) {
      this._emitSpores(cx, cy)
    }

    // Draw Creature
    if (this.type === "turtle") {
      this._drawTurtle(ctx, cx, cy, this.swimT)
    } else if (this.type === "manta") {
      this._drawManta(ctx, cx, cy, this.swimT)
    } else if (this.type === "whale") {
      this._drawWhale(ctx, cx, cy, this.swimT)
    } else if (this.type === "dolphin") {
      this._drawDolphin(ctx, cx, cy, this.swimT)
    } else {
      const bellW = this.baseSize + pulse * 6
      const bellH = this.baseSize * 0.78 + pulse * 3.5
      this._updateTentacles(cx, cy, bellW, bellH)
      this._drawTentacles()
      this._drawBell(ctx, cx, cy, bellW, bellH, pulse)
    }
  }

  _drawBubbles() {
    const ctx = this.ctx
    const H = this.cssHeight
    const W = this.cssWidth

    ctx.strokeStyle = "rgba(180, 230, 255, 0.35)"
    ctx.lineWidth = 0.8
    ctx.beginPath()

    for (const b of this.bubbles) {
      b.y -= b.speed
      b.x += Math.sin(this.bobT * 1.5 + b.swayPhase) * (b.sway * 0.25)
      if (b.y < -15) {
        b.y = H + 15
        b.x = Math.random() * W
      }
      ctx.moveTo(b.x + b.r, b.y)
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
    }
    ctx.stroke()
  }

  _drawBubbleRings() {
    const ctx = this.ctx
    for (let i = this.bubbleRings.length - 1; i >= 0; i--) {
      const ring = this.bubbleRings[i]
      ring.r += ring.growSpeed
      ring.life -= 0.018
      if (ring.life <= 0) {
        this.bubbleRings.splice(i, 1)
        continue
      }
      ctx.strokeStyle = `rgba(200, 240, 255, ${ring.life * 0.4})`
      ctx.lineWidth = 1.0
      ctx.beginPath()
      ctx.ellipse(
        ring.x,
        ring.y,
        ring.r * 1.4,
        ring.r * 0.6,
        ring.angle,
        0,
        Math.PI * 2,
      )
      ctx.stroke()
    }
  }

  _drawSpores() {
    const ctx = this.ctx
    if (this.spores.length === 0) return

    ctx.fillStyle = `rgba(${this.rgbStr}, 0.65)`
    ctx.beginPath()

    for (let i = this.spores.length - 1; i >= 0; i--) {
      const sp = this.spores[i]
      sp.x += sp.vx
      sp.y += sp.vy
      sp.life -= sp.decay
      if (sp.life <= 0) {
        this.spores.splice(i, 1)
        continue
      }
      ctx.moveTo(sp.x + sp.r, sp.y)
      ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2)
    }
    ctx.fill()
  }

  // ─── 1. BIOLUMINESCENT JELLYFISH ──────────────────────────────

  _updateTentacles(cx, cy, bellW, bellH) {
    const spread = Math.PI * 0.95
    for (let t = 0; t < this.numTentacles; t++) {
      const angle = -Math.PI / 2 + (t / (this.numTentacles - 1) - 0.5) * spread
      const attachX = cx + Math.cos(angle) * (bellW * 0.78)
      const attachY = cy + bellH * 0.55
      const ten = this.tentacles[t]
      ten.segs[0].x = attachX
      ten.segs[0].y = attachY

      const lenFactor = this.SEG_LEN * (ten.lengthMult || 1)

      for (let i = 1; i < this.SEG; i++) {
        const prev = ten.segs[i - 1]
        const cur = ten.segs[i]
        const wave = Math.sin(this.bobT * 2.2 + ten.phase + i * 0.28) * 3.5
        const dx = cur.x - prev.x + wave
        const dy = cur.y - prev.y - 2.5
        const len = Math.hypot(dx, dy) || 1

        cur.x = prev.x + (dx / len) * lenFactor
        cur.y = prev.y + (dy / len) * lenFactor
        cur.x += (attachX - cur.x) * 0.009
        cur.y += (attachY + i * lenFactor * 0.82 - cur.y) * 0.014
      }
    }
  }

  _drawTentacles() {
    const ctx = this.ctx
    const { r, g, b } = this.rgb

    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    for (let t = 0; t < this.numTentacles; t++) {
      const ten = this.tentacles[t]
      const alpha = 0.55 - (t % 3) * 0.1

      ctx.beginPath()
      ctx.moveTo(ten.segs[0].x, ten.segs[0].y)
      for (let i = 1; i < this.SEG; i++) {
        const p0 = ten.segs[i - 1]
        const p1 = ten.segs[i]
        const midX = (p0.x + p1.x) * 0.5
        const midY = (p0.y + p1.y) * 0.5
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY)
      }

      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
      ctx.lineWidth = Math.max(0.6, 2.2 - (t / this.numTentacles) * 1.0)
      ctx.lineCap = "round"
      ctx.stroke()

      // Luminous tip dot
      const tip = ten.segs[this.SEG - 1]
      ctx.fillStyle = `rgba(255, 255, 255, 0.9)`
      ctx.beginPath()
      ctx.arc(tip.x, tip.y, 1.4, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  _drawBell(ctx, cx, cy, bellW, bellH, pulse) {
    const { r, g, b } = this.rgb

    ctx.save()
    // Ambient bioluminescent halo
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, bellW * 2.6)
    glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.28)`)
    glow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.08)`)
    glow.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.ellipse(cx, cy, bellW * 2.6, bellW * 2.2, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.translate(cx, cy)

    // Inner oral arms (floating silk ruffles)
    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    for (let i = 0; i < 4; i++) {
      const angle = -Math.PI / 2 + (i / 3 - 0.5) * 0.75
      ctx.save()
      ctx.translate(0, bellH * 0.45)
      ctx.rotate(angle)
      const grad = ctx.createLinearGradient(0, 0, 0, 50)
      grad.addColorStop(0, `rgba(255, 255, 255, 0.75)`)
      grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.55)`)
      grad.addColorStop(1, "rgba(0,0,0,0)")
      ctx.strokeStyle = grad
      ctx.lineWidth = 2.8
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(
        Math.sin(this.bobT + i) * 10,
        22,
        Math.cos(this.bobT + i) * 12,
        38,
        Math.sin(this.bobT * 1.4 + i) * 14,
        50,
      )
      ctx.stroke()
      ctx.restore()
    }
    ctx.restore()

    // Outer translucent glass dome
    const bellGrad = ctx.createRadialGradient(
      0,
      -bellH * 0.4,
      2,
      0,
      0,
      bellW * 1.15,
    )
    bellGrad.addColorStop(0, `rgba(255, 255, 255, 0.85)`)
    bellGrad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, 0.65)`)
    bellGrad.addColorStop(0.75, `rgba(${r}, ${g}, ${b}, 0.3)`)
    bellGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.08)`)

    ctx.beginPath()
    ctx.moveTo(-bellW, 0)
    ctx.bezierCurveTo(-bellW, -bellH * 2.1, bellW, -bellH * 2.1, bellW, 0)
    ctx.bezierCurveTo(
      bellW * 0.7,
      bellH * 0.5,
      -bellW * 0.7,
      bellH * 0.5,
      -bellW,
      0,
    )
    ctx.fillStyle = bellGrad
    ctx.fill()

    // Frosted glass rim highlight
    ctx.strokeStyle = `rgba(255, 255, 255, 0.65)`
    ctx.lineWidth = 1.2
    ctx.stroke()

    // Inner glowing central organ
    const organGrad = ctx.createRadialGradient(
      0,
      -bellH * 0.45,
      0,
      0,
      -bellH * 0.45,
      bellW * 0.4,
    )
    organGrad.addColorStop(0, `rgba(255, 255, 255, ${0.75 + pulse * 0.2})`)
    organGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${0.5 + pulse * 0.15})`)
    organGrad.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = organGrad
    ctx.beginPath()
    ctx.ellipse(0, -bellH * 0.45, bellW * 0.38, bellH * 0.52, 0, 0, Math.PI * 2)
    ctx.fill()

    // Radial mantle nerves
    for (let rIdx = -3; rIdx <= 3; rIdx++) {
      ctx.beginPath()
      ctx.moveTo((rIdx * bellW) / 3.6, 0)
      ctx.quadraticCurveTo((rIdx * bellW) / 3.2, -bellH, 0, -bellH * 1.95)
      ctx.strokeStyle = `rgba(255, 255, 255, 0.25)`
      ctx.lineWidth = 0.8
      ctx.stroke()
    }

    ctx.restore()
  }

  // ─── 2. ANCIENT SEA TURTLE ────────────────────────────────────

  _drawTurtle(ctx, cx, cy, t) {
    const s = this.baseSize * 1.25
    const { r, g, b } = this.rgb

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(this.currentAngle + Math.PI / 2) // Orient front

    const finCycle = Math.sin(t * 2.8) * 0.45

    // 1. Back Flippers
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`
    // Left Back
    ctx.save()
    ctx.translate(-s * 0.42, s * 0.4)
    ctx.rotate(0.6 + finCycle * 0.4)
    ctx.beginPath()
    ctx.ellipse(0, 0, s * 0.32, s * 0.14, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    // Right Back
    ctx.save()
    ctx.translate(s * 0.42, s * 0.4)
    ctx.rotate(-0.6 - finCycle * 0.4)
    ctx.beginPath()
    ctx.ellipse(0, 0, s * 0.32, s * 0.14, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // 2. Large Front Wing Flippers
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.88)`
    // Left Front
    ctx.save()
    ctx.translate(-s * 0.45, -s * 0.15)
    ctx.rotate(0.35 + finCycle)
    ctx.beginPath()
    ctx.ellipse(-s * 0.35, 0, s * 0.58, s * 0.2, -0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    // Right Front
    ctx.save()
    ctx.translate(s * 0.45, -s * 0.15)
    ctx.rotate(-0.35 - finCycle)
    ctx.beginPath()
    ctx.ellipse(s * 0.35, 0, s * 0.58, s * 0.2, 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // 3. Head & Neck
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.95)`
    ctx.beginPath()
    ctx.ellipse(0, -s * 0.75, s * 0.2, s * 0.26, 0, 0, Math.PI * 2)
    ctx.fill()

    // Glowing Eyes
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(-s * 0.1, -s * 0.82, 2, 0, Math.PI * 2)
    ctx.arc(s * 0.1, -s * 0.82, 2, 0, Math.PI * 2)
    ctx.fill()

    // 4. Carapace Shell (Hydrodynamic Dome)
    const shellGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, s * 0.7)
    shellGrad.addColorStop(0, `rgba(255, 255, 255, 0.95)`)
    shellGrad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.9)`)
    shellGrad.addColorStop(
      0.8,
      `rgba(${Math.max(r - 50, 0)}, ${Math.max(g - 50, 0)}, ${Math.max(b - 50, 0)}, 0.8)`,
    )
    shellGrad.addColorStop(1.0, `rgba(0, 0, 0, 0.4)`)

    ctx.fillStyle = shellGrad
    ctx.beginPath()
    ctx.ellipse(0, 0, s * 0.55, s * 0.68, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Luminous Shell Scute Patterns (Glowing hexagon lattice)
    ctx.strokeStyle = `rgba(255, 255, 255, 0.6)`
    ctx.lineWidth = 1.0
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.4)
    ctx.lineTo(-s * 0.2, -s * 0.15)
    ctx.lineTo(-s * 0.2, s * 0.2)
    ctx.lineTo(0, s * 0.45)
    ctx.lineTo(s * 0.2, s * 0.2)
    ctx.lineTo(s * 0.2, -s * 0.15)
    ctx.closePath()
    ctx.stroke()

    ctx.restore()
  }

  // ─── 3. OCEANIC MANTA RAY ─────────────────────────────────────

  _drawManta(ctx, cx, cy, t) {
    const s = this.baseSize * 1.5
    const { r, g, b } = this.rgb

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(this.currentAngle + Math.PI / 2)

    const wingWave = Math.sin(t * 3.0) * (s * 0.35)

    // 1. Long Whip Tail with Bioluminescent Trailing Light
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.75)`
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(0, s * 0.45)
    ctx.quadraticCurveTo(
      Math.sin(t * 2.5) * 14,
      s * 1.4,
      Math.sin(t * 2.5) * 22,
      s * 2.4,
    )
    ctx.stroke()

    // 2. Wide Undulating Pectoral Wings
    const bodyGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, s * 1.1)
    bodyGrad.addColorStop(0, `rgba(255, 255, 255, 0.95)`)
    bodyGrad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.85)`)
    bodyGrad.addColorStop(
      0.8,
      `rgba(${Math.max(r - 40, 0)}, ${Math.max(g - 40, 0)}, ${Math.max(b - 40, 0)}, 0.65)`,
    )
    bodyGrad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0.15)`)

    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.6) // Snout
    // Left Wing
    ctx.bezierCurveTo(
      -s * 0.45,
      -s * 0.3 + wingWave * 0.4,
      -s * 1.3,
      wingWave,
      -s * 1.1,
      s * 0.25 + wingWave * 0.5,
    )
    // Left Pelvic edge
    ctx.bezierCurveTo(-s * 0.45, s * 0.35, -s * 0.2, s * 0.45, 0, s * 0.45)
    // Right Pelvic edge
    ctx.bezierCurveTo(
      s * 0.2,
      s * 0.45,
      s * 0.45,
      s * 0.35,
      s * 1.1,
      s * 0.25 - wingWave * 0.5,
    )
    // Right Wing
    ctx.bezierCurveTo(
      s * 1.3,
      -wingWave,
      s * 0.45,
      -s * 0.3 - wingWave * 0.4,
      0,
      -s * 0.6,
    )
    ctx.fill()

    ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`
    ctx.lineWidth = 1.2
    ctx.stroke()

    // 3. Cephalic Horns (Head Fins)
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.95)`
    ctx.beginPath()
    ctx.ellipse(-s * 0.16, -s * 0.65, s * 0.08, s * 0.15, -0.3, 0, Math.PI * 2)
    ctx.ellipse(s * 0.16, -s * 0.65, s * 0.08, s * 0.15, 0.3, 0, Math.PI * 2)
    ctx.fill()

    // 4. Bioluminescent Dorsal Star Spots
    ctx.fillStyle = `rgba(255, 255, 255, 0.85)`
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath()
      ctx.arc(
        i * (s * 0.14),
        -s * 0.1 + Math.abs(i) * (s * 0.08),
        1.8,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }

    ctx.restore()
  }

  // ─── 4. CELESTIAL WHALE ───────────────────────────────────────

  _drawWhale(ctx, cx, cy, t) {
    const s = this.baseSize * 1.7
    const { r, g, b } = this.rgb

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(this.currentAngle)

    const tailWave = Math.sin(t * 2.2) * 16

    // 1. Giant Fluke Tail
    ctx.save()
    ctx.translate(-s * 0.9, tailWave * 0.4)
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(-s * 0.3, -s * 0.45, -s * 0.4, -s * 0.5, -s * 0.35, 0)
    ctx.bezierCurveTo(-s * 0.4, s * 0.5, -s * 0.3, s * 0.45, 0, 0)
    ctx.fill()
    ctx.restore()

    // 2. Streamlined Body
    const whaleGrad = ctx.createLinearGradient(-s * 0.9, 0, s * 0.8, 0)
    whaleGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.5)`)
    whaleGrad.addColorStop(0.4, `rgba(255, 255, 255, 0.95)`)
    whaleGrad.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, 0.85)`)
    whaleGrad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0.9)`)

    ctx.fillStyle = whaleGrad
    ctx.beginPath()
    ctx.moveTo(s * 0.8, 0) // Head rostrum
    ctx.bezierCurveTo(
      s * 0.4,
      -s * 0.38,
      -s * 0.4,
      -s * 0.32,
      -s * 0.9,
      tailWave * 0.3,
    )
    ctx.bezierCurveTo(-s * 0.4, s * 0.32, s * 0.4, s * 0.38, s * 0.8, 0)
    ctx.fill()

    ctx.strokeStyle = `rgba(255, 255, 255, 0.45)`
    ctx.lineWidth = 1.2
    ctx.stroke()

    // 3. Sweeping Pectoral Fin
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.75)`
    ctx.beginPath()
    ctx.moveTo(s * 0.15, s * 0.15)
    ctx.bezierCurveTo(-s * 0.1, s * 0.6, -s * 0.35, s * 0.5, -s * 0.2, s * 0.2)
    ctx.closePath()
    ctx.fill()

    // 4. Constellation Stardust along back
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
    for (let i = 0; i < 7; i++) {
      const px = s * 0.5 - i * (s * 0.18)
      const py = -s * 0.12 + Math.sin(i * 1.5) * (s * 0.08)
      ctx.beginPath()
      ctx.arc(px, py, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  // ─── 5. MYSTIC DOLPHIN ────────────────────────────────────────

  _drawDolphin(ctx, cx, cy, t) {
    const s = this.baseSize * 1.35
    const { r, g, b } = this.rgb

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(this.currentAngle)

    const tailWave = Math.sin(t * 3.4) * 14

    // Occasionally blow air rings
    if (Math.sin(t * 1.8) > 0.985 && Math.random() < 0.2) {
      this.bubbleRings.push({
        x: cx + Math.cos(this.currentAngle) * (s * 0.8),
        y: cy + Math.sin(this.currentAngle) * (s * 0.8),
        r: 3,
        growSpeed: 0.8,
        life: 1.0,
        angle: this.currentAngle,
      })
    }

    // 1. Tail Fluke
    ctx.save()
    ctx.translate(-s * 0.85, tailWave * 0.5)
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.88)`
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(-s * 0.25, -s * 0.32, -s * 0.3, -s * 0.35, -s * 0.25, 0)
    ctx.bezierCurveTo(-s * 0.3, s * 0.35, -s * 0.25, s * 0.32, 0, 0)
    ctx.fill()
    ctx.restore()

    // 2. Aerodynamic Body
    const dolphinGrad = ctx.createLinearGradient(-s * 0.85, 0, s * 0.75, 0)
    dolphinGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.6)`)
    dolphinGrad.addColorStop(0.45, `rgba(255, 255, 255, 0.95)`)
    dolphinGrad.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, 0.9)`)
    dolphinGrad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0.95)`)

    ctx.fillStyle = dolphinGrad
    ctx.beginPath()
    ctx.moveTo(s * 0.75, 0) // Beak
    ctx.bezierCurveTo(
      s * 0.45,
      -s * 0.3,
      -s * 0.35,
      -s * 0.22,
      -s * 0.85,
      tailWave * 0.4,
    )
    ctx.bezierCurveTo(-s * 0.35, s * 0.22, s * 0.45, s * 0.3, s * 0.75, 0)
    ctx.fill()

    ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`
    ctx.lineWidth = 1.2
    ctx.stroke()

    // 3. Curved Dorsal Fin
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`
    ctx.beginPath()
    ctx.moveTo(-s * 0.05, -s * 0.2)
    ctx.bezierCurveTo(
      -s * 0.2,
      -s * 0.5,
      -s * 0.35,
      -s * 0.48,
      -s * 0.25,
      -s * 0.15,
    )
    ctx.closePath()
    ctx.fill()

    // 4. Pectoral Fin
    ctx.beginPath()
    ctx.moveTo(s * 0.1, s * 0.12)
    ctx.bezierCurveTo(0, s * 0.42, -s * 0.2, s * 0.38, -s * 0.1, s * 0.15)
    ctx.closePath()
    ctx.fill()

    // 5. Intelligent Eye
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(s * 0.45, -s * 0.06, 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}
