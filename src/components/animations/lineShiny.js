/**
 * LineShiny — Light beams shining through shiny glass (Enhanced)
 *
 * Simulates multiple semi-transparent light rays passing through a frosted glass surface.
 * Improved with smoother motion, better color blending, and mouse-reactive shimmer.
 */
export class LineShinyEffect {
  constructor(canvasId, color = "#ffffff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.rafId = null
    this.phase = 0
    this.tintH = 0
    this.tintS = 0
    this.tintL = 100
    this.mouse = { x: 0.5, y: 0.5 }
    this.targetMouse = { x: 0.5, y: 0.5 }

    this.beams = []
    this.streaks = []

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this._setTintFromColor(color)
    this._resizeHandler = () => this.resize()
    this._mouseHandler = (e) => {
      this.targetMouse.x = e.clientX / window.innerWidth
      this.targetMouse.y = e.clientY / window.innerHeight
    }
    
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  _setTintFromColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    let h = 0, s = 0
    if (max !== min) {
      const d = max - min
      s = d / (1 - Math.abs(2 * l - 1))
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }
    this.tintH = h * 360
    this.tintS = s * 100
    this.tintL = Math.max(l * 100, 60)
  }

  updateColor(hex) {
    this._setTintFromColor(hex)
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._buildBeams()
    this._buildStreaks()
  }

  _buildBeams() {
    const W = this.canvas.width
    const H = this.canvas.height
    this.beams = []
    const count = 6 + Math.floor(Math.random() * 4)
    for (let i = 0; i < count; i++) {
      this.beams.push({
        originX: Math.random(),
        halfWidth: 0.08 + Math.random() * 0.12,
        speed: (0.002 + Math.random() * 0.003) * (Math.random() < 0.5 ? 1 : -1),
        phaseOffset: Math.random() * Math.PI * 2,
        angleDelta: (Math.random() - 0.5) * 0.25,
        alpha: 0.05 + Math.random() * 0.08,
        hueShift: (Math.random() - 0.5) * 30,
      })
    }
  }

  _buildStreaks() {
    const W = this.canvas.width
    const H = this.canvas.height
    this.streaks = []
    const count = 10 + Math.floor(Math.random() * 6)
    for (let i = 0; i < count; i++) {
      this.streaks.push(this._makeStreak(W, H))
    }
  }

  _makeStreak(W, H) {
    return {
      pos: Math.random(),
      speed: (0.008 + Math.random() * 0.012) * (Math.random() < 0.5 ? 1 : -1),
      halfWidth: 0.015 + Math.random() * 0.03,
      alpha: 0.2 + Math.random() * 0.25,
      state: "idle",
      idleCountdown: 150 + Math.floor(Math.random() * 300),
      hintDuration: 50 + Math.floor(Math.random() * 50),
      hintTime: 0,
      hintAlpha: 0,
      holdMax: 20 + Math.floor(Math.random() * 40),
      holdTime: 0,
      flashAlpha: 0,
      flashSpeed: 0.008 + Math.random() * 0.01,
      hueShift: (Math.random() - 0.5) * 50,
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.phase = 0
    this.lastDrawTime = 0
    this.mouse.x = 0.5
    this.mouse.y = 0.5
    window.addEventListener("mousemove", this._mouseHandler)
    this.canvas.style.display = "block"
    this.rafId = this._animId = requestAnimationFrame((t) => this.animate(t))
  }

  stop() {
    this.active = false
    window.removeEventListener("mousemove", this._mouseHandler)
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  _drawBeam(beam) {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const diag = Math.sqrt(W * W + H * H)

    // Base angle 125deg + mouse reactivity
    const baseAngle = (Math.PI / 180) * (125 + (this.mouse.x - 0.5) * 10)
    const angle = baseAngle + beam.angleDelta

    const t = Math.sin(this.phase * beam.speed * 40 + beam.phaseOffset)
    const centerOff = t * diag * 0.5

    const perpA = angle - Math.PI / 2
    const cx = W * 0.5 + Math.cos(perpA) * centerOff + (this.mouse.x - 0.5) * 100
    const cy = H * 0.5 + Math.sin(perpA) * centerOff + (this.mouse.y - 0.5) * 100

    const hw = diag * beam.halfWidth
    const x0 = cx - Math.cos(perpA) * hw
    const y0 = cy - Math.sin(perpA) * hw
    const x1 = cx + Math.cos(perpA) * hw
    const y1 = cy + Math.sin(perpA) * hw

    const hue = (this.tintH + beam.hueShift + 360) % 360
    const sat = this.tintS
    const lit = this.tintL

    const grad = ctx.createLinearGradient(x0, y0, x1, y1)
    grad.addColorStop(0, `hsla(${hue}, ${sat}%, ${lit}%, 0)`)
    grad.addColorStop(0.3, `hsla(${hue}, ${sat}%, ${lit}%, ${beam.alpha * 0.3})`)
    grad.addColorStop(0.5, `hsla(${hue}, ${sat}%, ${lit}%, ${beam.alpha})`)
    grad.addColorStop(0.7, `hsla(${hue}, ${sat}%, ${lit}%, ${beam.alpha * 0.3})`)
    grad.addColorStop(1, `hsla(${hue}, ${sat}%, ${lit}%, 0)`)

    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  _drawStreak(streak) {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const diag = Math.sqrt(W * W + H * H)

    if (streak.state === "idle") {
      streak.idleCountdown--
      if (streak.idleCountdown <= 0) { streak.state = "hinting"; streak.hintTime = 0; }
    } else if (streak.state === "hinting") {
      streak.hintTime++
      const hintPeak = streak.alpha * 0.15
      const halfDur = streak.hintDuration / 2
      streak.hintAlpha = streak.hintTime <= halfDur ? hintPeak * (streak.hintTime / halfDur) : hintPeak * (1 - (streak.hintTime - halfDur) / halfDur)
      if (streak.hintTime >= streak.hintDuration) { streak.state = "rising"; streak.flashAlpha = 0; }
    } else if (streak.state === "rising") {
      streak.flashAlpha += streak.flashSpeed
      if (streak.flashAlpha >= streak.alpha) { streak.flashAlpha = streak.alpha; streak.state = "hold"; streak.holdTime = 0; }
    } else if (streak.state === "hold") {
      streak.holdTime++
      if (streak.holdTime >= streak.holdMax) streak.state = "falling"
    } else if (streak.state === "falling") {
      streak.flashAlpha -= streak.flashSpeed * 0.6
      if (streak.flashAlpha <= 0) { streak.state = "idle"; streak.idleCountdown = 200 + Math.floor(Math.random() * 400); streak.pos = Math.random(); }
    }

    const drawAlpha = streak.state === "hinting" ? streak.hintAlpha : streak.flashAlpha
    if (drawAlpha <= 0) return

    streak.pos += streak.speed * 0.0012
    if (streak.pos > 1.2) streak.pos = -0.2
    if (streak.pos < -0.2) streak.pos = 1.2

    const angle = (Math.PI / 180) * (125 + (this.mouse.x - 0.5) * 5)
    const perpA = angle - Math.PI / 2
    const cx = W * streak.pos + (this.mouse.x - 0.5) * 50
    const cy = H * 0.5 + (streak.pos - 0.5) * H * 0.2

    const hw = W * streak.halfWidth
    const x0 = cx - Math.cos(perpA) * hw
    const y0 = cy - Math.sin(perpA) * hw
    const x1 = cx + Math.cos(perpA) * hw
    const y1 = cy + Math.sin(perpA) * hw

    const hue = (this.tintH + streak.hueShift + 360) % 360
    const sat = Math.min(this.tintS + 20, 100)
    const lit = Math.min(this.tintL + 15, 100)

    const streakGrad = ctx.createLinearGradient(x0, y0, x1, y1)
    streakGrad.addColorStop(0, `hsla(${hue}, ${sat}%, ${lit}%, 0)`)
    streakGrad.addColorStop(0.5, `hsla(${hue}, ${sat}%, ${lit}%, ${drawAlpha})`)
    streakGrad.addColorStop(1, `hsla(${hue}, ${sat}%, ${lit}%, 0)`)

    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.fillStyle = streakGrad
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  _drawCaustic() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const offset = Math.sin(this.phase * 0.15) * W * 0.3 + (this.mouse.x - 0.5) * 200
    const grad = ctx.createLinearGradient(offset, 0, W + offset, H)
    const hue = this.tintH
    const sat = this.tintS
    const lit = this.tintL
    const shimmerAlpha = 0.02 + Math.abs(Math.sin(this.phase * 0.3)) * 0.03

    grad.addColorStop(0, `hsla(${hue}, ${sat}%, ${lit}%, 0)`)
    grad.addColorStop(0.5, `hsla(${(hue + 30) % 360}, ${sat}%, ${lit}%, ${shimmerAlpha})`)
    grad.addColorStop(1, `hsla(${hue}, ${sat}%, ${lit}%, 0)`)

    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this.rafId = this._animId = requestAnimationFrame((t) => this.animate(t))
    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05
    this.phase += 0.005

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this._drawCaustic()
    for (const beam of this.beams) this._drawBeam(beam)
    for (const streak of this.streaks) this._drawStreak(streak)
  }
}
