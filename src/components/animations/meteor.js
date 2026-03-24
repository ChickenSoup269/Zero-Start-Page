export class MeteorEffect {
  constructor(canvasId, color = "#ffffff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color

    this.fps = 60
    this.frameDuration = 1000 / this.fps
    this.lastDrawTime = 0
    this.lastTickTime = 0

    this.meteors = []
    this.stars = []
    this.spawnRate = 4.2
    this.spawnAccumulator = 0

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
    const maxX = this.canvas.width * 0.8
    const x = Math.random() * maxX
    const y = Math.random() * (this.canvas.height * 0.4)

    const speed = Math.random() * 7 + 15
    const length = Math.random() * 140 + 90
    const size = Math.random() * 1.6 + 0.9

    this.meteors.push({
      x,
      y,
      vx: speed,
      vy: speed * (0.48 + Math.random() * 0.14),
      ax: Math.random() * 0.015,
      ay: Math.random() * 0.015,
      life: 1,
      fadeSpeed: Math.random() * 0.007 + 0.004,
      length,
      size,
    })
  }

  update(deltaMs) {
    const dt = Math.max(0.5, Math.min(2.5, deltaMs / this.frameDuration))
    const seconds = deltaMs / 1000

    this.spawnAccumulator += this.spawnRate * seconds
    while (this.spawnAccumulator >= 1) {
      this._spawnMeteor()
      this.spawnAccumulator -= 1
    }

    this.meteors = this.meteors.filter((m) => {
      m.vx += m.ax * dt
      m.vy += m.ay * dt
      m.x += m.vx * dt
      m.y += m.vy * dt
      m.life -= m.fadeSpeed * dt
      return (
        m.life > 0 &&
        m.x < this.canvas.width + m.length &&
        m.y < this.canvas.height + m.length
      )
    })
  }

  draw(currentTime) {
    const w = this.canvas.width
    const h = this.canvas.height

    this.ctx.clearRect(0, 0, w, h)

    this.stars.forEach((s) => {
      const twinkle = 0.4 + Math.sin(currentTime * 0.0015 + s.twinkle) * 0.25
      this.ctx.fillStyle = this._hexToRgba(
        this.color,
        Math.max(0.05, s.alpha * twinkle),
      )
      this.ctx.beginPath()
      this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
      this.ctx.fill()
    })

    this.meteors.forEach((m) => {
      const dx = m.length
      const dy = m.length * 0.55

      const grad = this.ctx.createLinearGradient(m.x - dx, m.y - dy, m.x, m.y)
      grad.addColorStop(0, this._hexToRgba(this.color, 0))
      grad.addColorStop(0.6, this._hexToRgba(this.color, 0.5 * m.life))
      grad.addColorStop(1, this._hexToRgba(this.color, 0.95 * m.life))

      this.ctx.strokeStyle = grad
      this.ctx.lineWidth = m.size
      this.ctx.lineCap = "round"
      this.ctx.shadowColor = this._hexToRgba(this.color, 0.45 * m.life)
      this.ctx.shadowBlur = 8 * m.life
      this.ctx.beginPath()
      this.ctx.moveTo(m.x - dx, m.y - dy)
      this.ctx.lineTo(m.x, m.y)
      this.ctx.stroke()
      this.ctx.shadowBlur = 0

      this.ctx.fillStyle = this._hexToRgba(this.color, 0.95 * m.life)
      this.ctx.beginPath()
      this.ctx.arc(m.x, m.y, m.size * 1.1, 0, Math.PI * 2)
      this.ctx.fill()
    })
  }

  animate(currentTime) {
    if (!this.active) return
    requestAnimationFrame((time) => this.animate(time))

    if (!this.lastTickTime) {
      this.lastTickTime = currentTime
      this.lastDrawTime = currentTime
    }

    const delta = currentTime - this.lastTickTime
    this.lastTickTime = currentTime

    this.update(delta)

    if (currentTime - this.lastDrawTime >= this.frameDuration) {
      this.lastDrawTime = currentTime
      this.draw(currentTime)
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.lastTickTime = 0
    this.spawnAccumulator = 0
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
