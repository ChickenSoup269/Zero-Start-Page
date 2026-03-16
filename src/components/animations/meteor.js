export class MeteorEffect {
  constructor(canvasId, color = "#ffffff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color

    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.meteors = []
    this.stars = []
    this.spawnChance = 0.16

    this.resize()
    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initScene()
  }

  initScene() {
    const area = this.canvas.width * this.canvas.height
    const starCount = Math.max(40, Math.floor(area / 26000))

    this.stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      size: Math.random() * 1.8 + 0.4,
      alpha: Math.random() * 0.55 + 0.15,
      twinkle: Math.random() * Math.PI * 2,
    }))

    this.meteors = []
  }

  _spawnMeteor() {
    const maxX = this.canvas.width * 0.75
    const x = Math.random() * maxX
    const y = Math.random() * (this.canvas.height * 0.4)

    const speed = Math.random() * 12 + 14
    const length = Math.random() * 110 + 70
    const size = Math.random() * 1.8 + 1

    this.meteors.push({
      x,
      y,
      vx: speed,
      vy: speed * 0.55,
      life: 1,
      fadeSpeed: Math.random() * 0.012 + 0.007,
      length,
      size,
    })
  }

  update() {
    if (Math.random() < this.spawnChance) {
      this._spawnMeteor()
    }

    this.meteors = this.meteors.filter((m) => {
      m.x += m.vx
      m.y += m.vy
      m.life -= m.fadeSpeed
      return (
        m.life > 0 &&
        m.x < this.canvas.width + m.length &&
        m.y < this.canvas.height + m.length
      )
    })
  }

  draw() {
    const w = this.canvas.width
    const h = this.canvas.height

    this.ctx.clearRect(0, 0, w, h)

    this.stars.forEach((s) => {
      const twinkle =
        0.4 + Math.sin(performance.now() * 0.0015 + s.twinkle) * 0.25
      this.ctx.fillStyle = `rgba(255,255,255,${Math.max(0.05, s.alpha * twinkle)})`
      this.ctx.beginPath()
      this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
      this.ctx.fill()
    })

    this.meteors.forEach((m) => {
      const dx = m.length
      const dy = m.length * 0.55

      const grad = this.ctx.createLinearGradient(m.x - dx, m.y - dy, m.x, m.y)
      grad.addColorStop(0, "rgba(255,255,255,0)")
      grad.addColorStop(0.6, `rgba(255,255,255,${0.45 * m.life})`)
      grad.addColorStop(1, this._hexToRgba(this.color, 0.95 * m.life))

      this.ctx.strokeStyle = grad
      this.ctx.lineWidth = m.size
      this.ctx.lineCap = "round"
      this.ctx.beginPath()
      this.ctx.moveTo(m.x - dx, m.y - dy)
      this.ctx.lineTo(m.x, m.y)
      this.ctx.stroke()

      this.ctx.fillStyle = this._hexToRgba(this.color, 0.95 * m.life)
      this.ctx.beginPath()
      this.ctx.arc(m.x, m.y, m.size * 1.1, 0, Math.PI * 2)
      this.ctx.fill()
    })
  }

  animate(currentTime) {
    if (!this.active) return
    requestAnimationFrame((time) => this.animate(time))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return

    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)
    this.update()
    this.draw()
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.canvas.hidden = false
    this.canvas.style.display = "block"
    this.animate(0)
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  updateAccentColor(newColor) {
    this.color = newColor || this.color
  }

  _hexToRgba(hex, alpha) {
    const cleaned = (hex || "#ffffff").replace("#", "")
    const full =
      cleaned.length === 3
        ? `${cleaned[0]}${cleaned[0]}${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}`
        : cleaned

    const r = parseInt(full.slice(0, 2), 16)
    const g = parseInt(full.slice(2, 4), 16)
    const b = parseInt(full.slice(4, 6), 16)

    return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`
  }
}
