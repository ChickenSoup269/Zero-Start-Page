export class SkyLanternsEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.lanterns = []
    this.lanternCount = 18
    this.type = options.type || "lantern" // 'lantern' or 'dots'

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

  setOptions(options) {
    if (options.type && options.type !== this.type) {
      this.type = options.type
      this.initLanterns()
    }
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
      swing: Math.random() * 0.02 + 0.01,
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

    if (this.type === "dots") {
      // ── Light Dots (Stars) ─────────────────────────────────────
      const dotSize = hw * 1.2
      const dotGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, dotSize)
      dotGrad.addColorStop(0, `rgba(255, 255, 220, ${1.0 * flicker})`)
      dotGrad.addColorStop(0.3, this.hexRgba(bodyColor, 0.8 * flicker))
      dotGrad.addColorStop(0.6, this.hexRgba(emitColor, 0.3 * flicker))
      dotGrad.addColorStop(1, `rgba(0, 0, 0, 0)`)
      
      ctx.beginPath()
      ctx.arc(0, 0, dotSize, 0, Math.PI * 2)
      ctx.fillStyle = dotGrad
      ctx.fill()
      
      // Add a core glow
      ctx.beginPath()
      ctx.arc(0, 0, dotSize * 0.3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * flicker})`
      ctx.fill()
    } else {
      // ── Improved Traditional Lantern ───────────────────────────
      // 1. Outer halo glow
      const haloGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, hw * 2.5)
      haloGrad.addColorStop(0, this.hexRgba(emitColor, 0.3 * flicker))
      haloGrad.addColorStop(0.5, this.hexRgba(emitColor, 0.1 * flicker))
      haloGrad.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.beginPath()
      ctx.arc(0, 0, hw * 2.5, 0, Math.PI * 2)
      ctx.fillStyle = haloGrad
      ctx.fill()

      // 2. Body shape
      const topW = hw * 0.7
      const midW = hw * 1.2
      const botW = hw * 0.8

      ctx.beginPath()
      ctx.moveTo(-topW, -hh)
      ctx.bezierCurveTo(-midW, -hh * 0.4, -midW, hh * 0.4, -botW, hh)
      ctx.lineTo(botW, hh)
      ctx.bezierCurveTo(midW, hh * 0.4, midW, -hh * 0.4, topW, -hh)
      ctx.closePath()

      // Translucent body with depth
      const bodyGrad = ctx.createLinearGradient(-midW, 0, midW, 0)
      bodyGrad.addColorStop(0, this.hexRgba(bodyColor, 0.6))
      bodyGrad.addColorStop(0.3, this.hexRgba(bodyColor, 0.9))
      bodyGrad.addColorStop(0.7, this.hexRgba(bodyColor, 0.9))
      bodyGrad.addColorStop(1, this.hexRgba(bodyColor, 0.6))
      ctx.fillStyle = bodyGrad
      ctx.fill()

      // 3. Inner flame and glow (Inside the body)
      const innerGlowGrad = ctx.createRadialGradient(0, hh * 0.3, 0, 0, hh * 0.3, hw * 1.2)
      innerGlowGrad.addColorStop(0, `rgba(255, 245, 180, ${0.8 * flicker})`)
      innerGlowGrad.addColorStop(0.4, this.hexRgba(bodyColor, 0.5 * flicker))
      innerGlowGrad.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.fillStyle = innerGlowGrad
      ctx.fill()

      // Small bright core (the actual flame inside)
      ctx.beginPath()
      ctx.ellipse(0, hh * 0.5, 3 * scale, 6 * scale * flicker, 0, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * flicker})`
      ctx.fill()

      // 4. Caps (More structural look)
      const capH = 4 * scale
      ctx.fillStyle = "#331100" // Dark wood/bamboo color for caps
      
      // Top cap
      ctx.beginPath()
      ctx.roundRect(-topW - 1, -hh - capH, (topW + 1) * 2, capH, 2 * scale)
      ctx.fill()
      
      // Bottom cap
      ctx.beginPath()
      ctx.roundRect(-botW - 1, hh, (botW + 1) * 2, capH, 2 * scale)
      ctx.fill()

      // 5. Decorative lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)"
      ctx.lineWidth = 0.5 * scale
      ctx.beginPath()
      ctx.moveTo(0, -hh)
      ctx.lineTo(0, hh)
      ctx.stroke()

      // 6. Hanging Tassels (Instead of simple strings)
      const tasselLen = 15 * scale
      ctx.strokeStyle = this.hexRgba(bodyColor, 0.8)
      ctx.lineWidth = 1 * scale
      
      // Strings to tassel
      ctx.beginPath()
      ctx.moveTo(-botW * 0.4, hh + capH)
      ctx.lineTo(0, hh + capH + tasselLen * 0.4)
      ctx.moveTo(botW * 0.4, hh + capH)
      ctx.lineTo(0, hh + capH + tasselLen * 0.4)
      ctx.stroke()
      
      // Tassel head
      ctx.beginPath()
      ctx.arc(0, hh + capH + tasselLen * 0.4, 2 * scale, 0, Math.PI * 2)
      ctx.fillStyle = bodyColor
      ctx.fill()
      
      // Tassel hairs
      ctx.beginPath()
      for(let i = -2; i <= 2; i++) {
        ctx.moveTo(i * 0.5 * scale, hh + capH + tasselLen * 0.4)
        ctx.lineTo(i * 1.5 * scale, hh + capH + tasselLen)
      }
      ctx.stroke()
    }

    ctx.restore()
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this._animId = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.lanterns.forEach((lantern) => {
      // Drift upward with wind-like swaying
      lantern.swingOffset += lantern.swing
      lantern.x += Math.sin(lantern.swingOffset) * 0.5 + Math.cos(currentTime * 0.001) * 0.2
      lantern.y -= lantern.speedY
      lantern.rotation += lantern.rotationSpeed

      // Gentle fade-out as lantern nears the top quarter
      const fadeThreshold = this.canvas.height * 0.25
      if (lantern.y < fadeThreshold) {
        lantern.opacity -= 0.005
      }

      // Recycle when fully faded or off-screen
      if (lantern.opacity <= 0 || lantern.y < -this.canvas.height * 0.1) {
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
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }
}
