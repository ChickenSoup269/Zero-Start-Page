export class Jellyfish {
  constructor(canvasId, color = "#a050ff", type = "jellyfish", numTentacles = 10, size = 38) {
    this.canvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId
    this.ctx = this.canvas.getContext("2d")
    this.color = color
    this.type = type || "jellyfish"
    this.numTentacles = numTentacles
    this.baseSize = size

    this.SEG = 18
    this.SEG_LEN = 14

    this.head = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    this.target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    this.vel = { x: 0, y: 0 }
    this.lastMouseTime = Date.now()

    this.pulseT = 0
    this.bobT = 0
    this.roamT = 0

    this.animationId = null
    this.running = false

    this.tentacles = []
    this._initTentacles()

    this.bubbles = []
    for (let i = 0; i < 30; i++) {
      this.bubbles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 3 + 1,
        speed: Math.random() * 0.4 + 0.1,
        alpha: Math.random() * 0.4 + 0.1,
      })
    }

    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleResize = this.handleResize.bind(this)
    this.animate = this.animate.bind(this)
  }

  _initTentacles() {
    this.tentacles = []
    for (let t = 0; t < this.numTentacles; t++) {
      const segs = []
      for (let i = 0; i < this.SEG; i++) {
        segs.push({ x: this.head.x, y: this.head.y })
      }
      this.tentacles.push({ segs, phase: Math.random() * Math.PI * 2 })
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
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    window.removeEventListener("mousemove", this.handleMouseMove)
    window.removeEventListener("resize", this.handleResize)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  updateColor(color) {
    this.color = color
    this._hue = this._getHue()
  }

  updateType(type) {
    this.type = type
    this._initTentacles()
  }

  handleMouseMove(e) {
    this.mouse.x = e.clientX
    this.mouse.y = e.clientY
    this.lastMouseTime = Date.now()
  }

  handleResize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  animate() {
    if (!this.running) return
    this.animationId = this._animId = requestAnimationFrame(this.animate)
    if (document.visibilityState === 'hidden') return

    const ctx = this.ctx
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const now = Date.now()
    this.pulseT += 0.06
    this.bobT += 0.02

    // Movement — roam or follow mouse
    if (now - this.lastMouseTime > 2000) {
      this.roamT += 0.005
      const tx =
        this.canvas.width / 2 +
        Math.cos(this.roamT) * this.canvas.width * 0.3 +
        Math.sin(this.roamT * 0.7) * 60
      const ty =
        this.canvas.height * 0.4 +
        Math.sin(this.roamT * 0.8) * this.canvas.height * 0.2
      this.target.x += (tx - this.target.x) * 0.015
      this.target.y += (ty - this.target.y) * 0.015
    } else {
      const dx = this.mouse.x - this.target.x
      const dy = this.mouse.y - this.target.y
      const dist = Math.hypot(dx, dy)
      if (dist < 80) {
        const orb = now * 0.002
        this.target.x +=
          (this.mouse.x + Math.cos(orb) * 60 - this.target.x) * 0.06
        this.target.y +=
          (this.mouse.y + Math.sin(orb) * 40 - this.target.y) * 0.06
      } else {
        this.target.x += dx * 0.04
        this.target.y += dy * 0.04
      }
    }

    this.vel.x += (this.target.x - this.head.x) * 0.04
    this.vel.y += (this.target.y - this.head.y) * 0.04
    this.vel.x *= 0.82
    this.vel.y *= 0.82
    this.head.x += this.vel.x
    this.head.y += this.vel.y

    const bobY = Math.sin(this.bobT) * 4
    const pulse = Math.sin(this.pulseT)
    
    const cx = this.head.x
    const cy = this.head.y + bobY

    this._drawBubbles()

    if (this.type === "turtle") {
      this._drawTurtle(ctx, cx, cy, pulse)
    } else if (this.type === "manta") {
      this._drawManta(ctx, cx, cy, pulse)
    } else {
      const bellW = this.baseSize + pulse * 6
      const bellH = this.baseSize * 0.74 + pulse * 3
      this._updateTentacles(cx, cy, bellW, bellH)
      this._drawTentacles()
      this._drawBell(ctx, cx, cy, bellW, bellH, pulse)
    }
  }

  _drawBubbles() {
    const ctx = this.ctx
    for (const b of this.bubbles) {
      b.y -= b.speed
      if (b.y < -10) {
        b.y = this.canvas.height + 5
        b.x = Math.random() * this.canvas.width
      }
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(120,200,255,${b.alpha})`
      ctx.lineWidth = 0.5
      ctx.stroke()
    }
  }

  _drawTurtle(ctx, cx, cy, pulse) {
    const s = this.baseSize * 1.2
    const angle = Math.atan2(this.vel.y, this.vel.x + 0.001)
    
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)

    const baseColor = this.color || "#4caf50"
    
    // Fins movement
    const finAngle = Math.sin(this.pulseT) * 0.4

    // Back fins
    ctx.fillStyle = baseColor
    ctx.globalAlpha = 0.6
    // Left back
    ctx.save()
    ctx.translate(-s*0.4, s*0.3)
    ctx.rotate(-0.5 + finAngle*0.5)
    ctx.beginPath(); ctx.ellipse(0, 0, s*0.3, s*0.15, 0, 0, Math.PI*2); ctx.fill()
    ctx.restore()
    // Right back
    ctx.save()
    ctx.translate(-s*0.4, -s*0.3)
    ctx.rotate(0.5 - finAngle*0.5)
    ctx.beginPath(); ctx.ellipse(0, 0, s*0.3, s*0.15, 0, 0, Math.PI*2); ctx.fill()
    ctx.restore()

    // Front fins
    ctx.globalAlpha = 0.8
    // Left front
    ctx.save()
    ctx.translate(s*0.2, s*0.5)
    ctx.rotate(-0.2 + finAngle)
    ctx.beginPath(); ctx.ellipse(0, 0, s*0.5, s*0.2, 0, 0, Math.PI*2); ctx.fill()
    ctx.restore()
    // Right front
    ctx.save()
    ctx.translate(s*0.2, -s*0.5)
    ctx.rotate(0.2 - finAngle)
    ctx.beginPath(); ctx.ellipse(0, 0, s*0.5, s*0.2, 0, 0, Math.PI*2); ctx.fill()
    ctx.restore()

    // Head
    ctx.globalAlpha = 0.9
    ctx.beginPath()
    ctx.ellipse(s*0.7, 0, s*0.25, s*0.2, 0, 0, Math.PI*2)
    ctx.fill()

    // Shell
    ctx.globalAlpha = 1
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s*0.8)
    grad.addColorStop(0, baseColor)
    grad.addColorStop(1, "rgba(0,0,0,0.3)")
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(0, 0, s*0.7, s*0.55, 0, 0, Math.PI*2)
    ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.2)"
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.restore()
  }

  _drawManta(ctx, cx, cy, pulse) {
    const s = this.baseSize * 1.5
    const angle = Math.atan2(this.vel.y, this.vel.x + 0.001)
    
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)

    const baseColor = this.color || "#5c6bc0"
    const wingWave = Math.sin(this.pulseT) * s * 0.3

    // Tail
    ctx.strokeStyle = baseColor
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.moveTo(-s*0.5, 0)
    ctx.quadraticCurveTo(-s*1.2, Math.sin(this.pulseT)*10, -s*2, 0)
    ctx.stroke()

    // Body/Wings
    ctx.globalAlpha = 0.8
    const grad = ctx.createLinearGradient(-s, 0, s, 0)
    grad.addColorStop(0, "rgba(0,0,0,0.2)")
    grad.addColorStop(0.5, baseColor)
    grad.addColorStop(1, "rgba(255,255,255,0.1)")
    ctx.fillStyle = grad

    ctx.beginPath()
    ctx.moveTo(s*0.6, 0) // nose
    ctx.bezierCurveTo(s*0.4, wingWave, -s*0.2, s + wingWave, -s*0.5, s*0.2) // left wing
    ctx.bezierCurveTo(-s*0.7, 0, -s*0.7, 0, -s*0.5, -s*0.2) // back
    ctx.bezierCurveTo(-s*0.2, -s - wingWave, s*0.4, -wingWave, s*0.6, 0) // right wing
    ctx.fill()

    // Cephalic fins (horns)
    ctx.beginPath()
    ctx.ellipse(s*0.55, s*0.15, s*0.1, s*0.05, 0.4, 0, Math.PI*2)
    ctx.ellipse(s*0.55, -s*0.15, s*0.1, s*0.05, -0.4, 0, Math.PI*2)
    ctx.fill()

    ctx.restore()
  }

  _updateTentacles(cx, cy, bellW, bellH) {
    const spread = Math.PI * 0.9
    for (let t = 0; t < this.numTentacles; t++) {
      const angle = -Math.PI / 2 + (t / (this.numTentacles - 1) - 0.5) * spread
      const attachX = cx + Math.cos(angle) * bellW * 0.8
      const attachY = cy + bellH * 0.6
      const ten = this.tentacles[t]
      ten.segs[0].x = attachX
      ten.segs[0].y = attachY

      for (let i = 1; i < this.SEG; i++) {
        const prev = ten.segs[i - 1]
        const cur = ten.segs[i]
        const wag = Math.sin(this.bobT * 2 + ten.phase + i * 0.3) * 3
        const dx = cur.x - prev.x + wag
        const dy = cur.y - prev.y - 2
        const len = Math.hypot(dx, dy) || 1
        cur.x = prev.x + (dx / len) * this.SEG_LEN
        cur.y = prev.y + (dy / len) * this.SEG_LEN
        cur.x += (attachX - cur.x) * 0.008
        cur.y += (attachY + i * this.SEG_LEN * 0.8 - cur.y) * 0.012
      }
    }
  }

  _drawTentacles() {
    const ctx = this.ctx
    // Parse base hue from color (fallback 270 for purple)
    const baseHue = this._getHue()

    for (let t = 0; t < this.numTentacles; t++) {
      const ten = this.tentacles[t]
      const hue = baseHue + t * 12

      ctx.beginPath()
      ctx.moveTo(ten.segs[0].x, ten.segs[0].y)
      for (let i = 1; i < this.SEG; i++) {
        ctx.lineTo(ten.segs[i].x, ten.segs[i].y)
      }
      const fade = 0.6 - (t % 3) * 0.1
      ctx.strokeStyle = `hsla(${hue},90%,75%,${fade})`
      ctx.lineWidth = Math.max(0.5, 2 - t * 0.1)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke()

      // Tip dot
      const tip = ten.segs[this.SEG - 1]
      ctx.beginPath()
      ctx.arc(tip.x, tip.y, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${hue + 30},100%,85%,0.8)`
      ctx.fill()
    }
  }

  _drawBell(ctx, cx, cy, bellW, bellH, pulse) {
    // Glow aura
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, bellW * 2.5)
    glow.addColorStop(0, "rgba(150,80,255,0.18)")
    glow.addColorStop(0.5, "rgba(80,150,255,0.07)")
    glow.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.ellipse(cx, cy, bellW * 2.5, bellW * 2, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.translate(cx, cy)

    // Oral arms (inner thick tentacles)
    for (let i = 0; i < 4; i++) {
      const angle = -Math.PI / 2 + (i / 3 - 0.5) * 0.7
      ctx.save()
      ctx.translate(0, bellH * 0.5)
      ctx.rotate(angle)
      const grad = ctx.createLinearGradient(0, 0, 0, 45)
      grad.addColorStop(0, "rgba(200,120,255,0.5)")
      grad.addColorStop(1, "rgba(100,200,255,0)")
      ctx.strokeStyle = grad
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(
        Math.sin(this.bobT + i) * 8,
        20,
        Math.cos(this.bobT + i) * 10,
        35,
        Math.sin(this.bobT * 1.3 + i) * 12,
        45,
      )
      ctx.stroke()
      ctx.restore()
    }

    // Outer bell
    const bellGrad = ctx.createRadialGradient(
      0,
      -bellH * 0.3,
      2,
      0,
      0,
      bellW * 1.1,
    )
    bellGrad.addColorStop(0, "rgba(220,170,255,0.55)")
    bellGrad.addColorStop(0.5, "rgba(130,100,220,0.35)")
    bellGrad.addColorStop(1, "rgba(80,60,180,0.1)")

    ctx.beginPath()
    ctx.moveTo(-bellW, 0)
    ctx.bezierCurveTo(-bellW, -bellH * 2, bellW, -bellH * 2, bellW, 0)
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
    ctx.strokeStyle = "rgba(200,160,255,0.4)"
    ctx.lineWidth = 1
    ctx.stroke()

    // Inner dome
    ctx.beginPath()
    ctx.moveTo(-bellW * 0.6, -bellH * 0.1)
    ctx.bezierCurveTo(
      -bellW * 0.6,
      -bellH * 1.5,
      bellW * 0.6,
      -bellH * 1.5,
      bellW * 0.6,
      -bellH * 0.1,
    )
    ctx.fillStyle = "rgba(230,210,255,0.15)"
    ctx.fill()

    // Ribs
    for (let r = -3; r <= 3; r++) {
      ctx.beginPath()
      ctx.moveTo((r * bellW) / 3.5, 0)
      ctx.quadraticCurveTo((r * bellW) / 3, -bellH, 0, -bellH * 1.9)
      ctx.strokeStyle = "rgba(200,180,255,0.15)"
      ctx.lineWidth = 0.8
      ctx.stroke()
    }

    // Center organ glow
    const organGrad = ctx.createRadialGradient(
      0,
      -bellH * 0.4,
      0,
      0,
      -bellH * 0.4,
      bellW * 0.35,
    )
    organGrad.addColorStop(0, `rgba(255,180,255,${0.4 + pulse * 0.15})`)
    organGrad.addColorStop(1, "rgba(150,80,255,0)")
    ctx.beginPath()
    ctx.ellipse(0, -bellH * 0.4, bellW * 0.35, bellH * 0.5, 0, 0, Math.PI * 2)
    ctx.fillStyle = organGrad
    ctx.fill()

    // Rim frills
    for (let f = -4; f <= 4; f++) {
      const fx = (f * bellW) / 4
      ctx.beginPath()
      ctx.arc(fx, 0, 4 + pulse * 1.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(200,160,255,${0.3 + pulse * 0.1})`
      ctx.fill()
    }

    ctx.restore()
  }

  _getHue() {
    // Try to extract hue from hex or hsl color string, fallback 270
    const m = this.color.match(/hsl\((\d+)/)
    if (m) return parseInt(m[1])
    const hex = this.color.replace("#", "")
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255
      const g = parseInt(hex.slice(2, 4), 16) / 255
      const b = parseInt(hex.slice(4, 6), 16) / 255
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b)
      if (max === min) return 270
      const d = max - min
      let h = 0
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      else if (max === g) h = ((b - r) / d + 2) / 6
      else h = ((r - g) / d + 4) / 6
      return Math.round(h * 360)
    }
    return 270
  }
}
