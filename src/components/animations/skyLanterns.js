export class SkyLanternsEffect {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.lanterns = []
    this.lanternCount = 18

    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    // Warm lantern color sets [bodyColor, emitColor]
    this.colorSets = [
      ["#FF6B35", "#FF4500"],
      ["#FFD700", "#FFA500"],
      ["#FF4444", "#CC2200"],
      ["#FF8C42", "#FF6000"],
      ["#FFB347", "#FF8C00"],
      ["#FF69B4", "#FF1493"],
      ["#FFFACD", "#FFD700"],
      ["#FFA07A", "#FF6347"],
      ["#FF7043", "#E64A19"],
    ]

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initLanterns()
  }

  createLantern(fromBottom = false) {
    const [bodyColor, emitColor] =
      this.colorSets[Math.floor(Math.random() * this.colorSets.length)]
    const scale = Math.random() * 0.7 + 0.5
    const h = 54 * scale
    const w = 38 * scale

    return {
      x: Math.random() * (this.canvas.width - 120) + 60,
      y: fromBottom
        ? this.canvas.height + h + Math.random() * 300
        : Math.random() * this.canvas.height,
      w,
      h,
      scale,
      speedY: Math.random() * 0.55 + 0.25,
      speedX: 0,
      swing: 0,
      swingOffset: Math.random() * Math.PI * 2,
      rotation: 0,
      rotationSpeed: 0,
      opacity: Math.random() * 0.35 + 0.65,
      bodyColor,
      emitColor,
      flickerOffset: Math.random() * Math.PI * 2,
    }
  }

  initLanterns() {
    this.lanterns = []
    for (let i = 0; i < this.lanternCount; i++) {
      this.lanterns.push(this.createLantern(false))
    }
  }

  // Hex color → rgba string helper
  hexRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  drawLantern(lantern, time) {
    const ctx = this.ctx
    const { x, y, w, h, scale, opacity, bodyColor, emitColor, flickerOffset } =
      lantern

    const hw = w / 2
    const hh = h / 2
    const flicker = 0.82 + 0.18 * Math.sin(time * 0.004 + flickerOffset)

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(lantern.rotation)
    ctx.globalAlpha = opacity

    // ── Outer halo glow ──────────────────────────────────────────
    const haloGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, hw * 2.2)
    haloGrad.addColorStop(0, this.hexRgba(emitColor, 0.22 * flicker))
    haloGrad.addColorStop(1, this.hexRgba(emitColor, 0))
    ctx.beginPath()
    ctx.arc(0, 0, hw * 2.2, 0, Math.PI * 2)
    ctx.fillStyle = haloGrad
    ctx.fill()

    // ── Lantern body (barrel shape via bezier) ───────────────────
    const topW = hw * 0.62
    const midW = hw * 1.15
    const botW = hw * 0.62

    ctx.beginPath()
    ctx.moveTo(-topW, -hh)
    ctx.bezierCurveTo(-midW, -hh * 0.3, -midW, hh * 0.3, -botW, hh)
    ctx.lineTo(botW, hh)
    ctx.bezierCurveTo(midW, hh * 0.3, midW, -hh * 0.3, topW, -hh)
    ctx.closePath()

    // Side-lit gradient to give depth
    const bodyGrad = ctx.createLinearGradient(-midW, 0, midW, 0)
    bodyGrad.addColorStop(0, this.hexRgba(bodyColor, 0.45))
    bodyGrad.addColorStop(0.3, this.hexRgba(bodyColor, 0.95))
    bodyGrad.addColorStop(0.7, this.hexRgba(bodyColor, 0.95))
    bodyGrad.addColorStop(1, this.hexRgba(bodyColor, 0.45))
    ctx.fillStyle = bodyGrad
    ctx.fill()

    // Inner candlelight glow
    const innerGrad = ctx.createRadialGradient(0, hh * 0.25, 0, 0, 0, hw)
    innerGrad.addColorStop(0, `rgba(255,240,160,${0.65 * flicker})`)
    innerGrad.addColorStop(0.5, `rgba(255,160,40,${0.25 * flicker})`)
    innerGrad.addColorStop(1, `rgba(255,80,0,0)`)
    ctx.fillStyle = innerGrad
    ctx.fill()

    // ── Top cap ──────────────────────────────────────────────────
    const capH = 5 * scale
    ctx.beginPath()
    ctx.moveTo(-topW, -hh)
    ctx.lineTo(topW, -hh)
    ctx.lineTo(topW * 0.7, -hh - capH)
    ctx.lineTo(-topW * 0.7, -hh - capH)
    ctx.closePath()
    ctx.fillStyle = this.hexRgba(bodyColor, 0.92)
    ctx.fill()

    // Thin ring at top rim
    ctx.beginPath()
    ctx.moveTo(-topW, -hh)
    ctx.lineTo(topW, -hh)
    ctx.strokeStyle = this.hexRgba(emitColor, 0.7)
    ctx.lineWidth = 1.2 * scale
    ctx.stroke()

    // ── Bottom cap ───────────────────────────────────────────────
    ctx.beginPath()
    ctx.moveTo(-botW, hh)
    ctx.lineTo(botW, hh)
    ctx.lineTo(botW * 0.7, hh + capH)
    ctx.lineTo(-botW * 0.7, hh + capH)
    ctx.closePath()
    ctx.fillStyle = this.hexRgba(bodyColor, 0.92)
    ctx.fill()

    // Thin ring at bottom rim
    ctx.beginPath()
    ctx.moveTo(-botW, hh)
    ctx.lineTo(botW, hh)
    ctx.strokeStyle = this.hexRgba(emitColor, 0.7)
    ctx.lineWidth = 1.2 * scale
    ctx.stroke()

    // ── Horizontal middle band (decorative) ──────────────────────
    ctx.beginPath()
    ctx.moveTo(-midW, 0)
    ctx.lineTo(midW, 0)
    ctx.strokeStyle = this.hexRgba(emitColor, 0.5)
    ctx.lineWidth = 1.5 * scale
    ctx.stroke()

    // ── Hanging strings ──────────────────────────────────────────
    const stringLen = 14 * scale
    const stringY0 = hh + capH
    ctx.strokeStyle = `rgba(200,150,80,${opacity * 0.65})`
    ctx.lineWidth = 0.9

    ctx.beginPath()
    ctx.moveTo(-botW * 0.5, stringY0)
    ctx.lineTo(0, stringY0 + stringLen)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(botW * 0.5, stringY0)
    ctx.lineTo(0, stringY0 + stringLen)
    ctx.stroke()

    // ── Candle flame dot at string tip ───────────────────────────
    const flameY = stringY0 + stringLen
    const flameGrad = ctx.createRadialGradient(
      0,
      flameY,
      0,
      0,
      flameY,
      4 * scale,
    )
    flameGrad.addColorStop(0, `rgba(255,255,200,${flicker})`)
    flameGrad.addColorStop(0.5, `rgba(255,180,50,${0.7 * flicker})`)
    flameGrad.addColorStop(1, `rgba(255,80,0,0)`)
    ctx.beginPath()
    ctx.arc(0, flameY, 4 * scale, 0, Math.PI * 2)
    ctx.fillStyle = flameGrad
    ctx.fill()

    ctx.restore()
  }

  animate(currentTime = 0) {
    if (!this.active) return
    requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.lanterns.forEach((lantern) => {
      // Drift upward
      lantern.swingOffset += lantern.swing
      lantern.x += Math.sin(lantern.swingOffset) * 0.6 + lantern.speedX
      lantern.y -= lantern.speedY
      lantern.rotation += lantern.rotationSpeed

      // Gentle fade-out as lantern nears the top quarter
      const fadeThreshold = this.canvas.height * 0.28
      if (lantern.y < fadeThreshold) {
        lantern.opacity -= 0.004
      }

      // Recycle when fully faded or off-screen
      if (lantern.opacity <= 0 || lantern.y < -lantern.h * 3) {
        Object.assign(lantern, this.createLantern(true))
      }

      this.drawLantern(lantern, currentTime)
    })
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.initLanterns()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }
}
