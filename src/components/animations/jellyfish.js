export class Jellyfish {
  constructor(canvasId, color = "#a050ff", numTentacles = 10, size = 38) {
    this.canvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId
    this.ctx = this.canvas.getContext("2d")
    this.color = color
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
    for (let t = 0; t < this.numTentacles; t++) {
      const segs = []
      for (let i = 0; i < this.SEG; i++) {
        segs.push({ x: this.head.x, y: this.head.y })
      }
      this.tentacles.push({ segs, phase: Math.random() * Math.PI * 2 })
    }

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
    window.removeEventListener("mousemove", this.handleMouseMove)
    window.removeEventListener("resize", this.handleResize)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  updateColor(color) {
    this.color = color
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
    const bellW = this.baseSize + pulse * 6
    const bellH = this.baseSize * 0.74 + pulse * 3

    const cx = this.head.x
    const cy = this.head.y + bobY

    this._drawBubbles()
    this._updateTentacles(cx, cy, bellW, bellH)
    this._drawTentacles()
    this._drawBell(ctx, cx, cy, bellW, bellH, pulse)

    this.animationId = requestAnimationFrame(this.animate)
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
