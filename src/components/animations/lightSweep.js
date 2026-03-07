/**
 * LightSweep — diagonal shining streaks that sweep across the screen,
 * like light glinting off polished glass or a blade.
 *
 * Each streak has:
 *  - a thin bright core + wide soft halo (two-pass draw)
 *  - random angle close to diagonal (±10° around a base tilt)
 *  - random speed, width, opacity, and colour tint
 *  - a cool-down so streaks appear in bursts, not all at once
 */
export class LightSweep {
  constructor(canvasId, color = "#ffffff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color // base tint (hex or css string)

    this.streaks = []
    this.maxStreaks = 8

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  // Parse any CSS colour to [r,g,b] 0-255, fallback to white
  _parseRGB(color) {
    const div = document.createElement("div")
    div.style.color = color
    document.body.appendChild(div)
    const cs = getComputedStyle(div).color // "rgb(r, g, b)"
    document.body.removeChild(div)
    const m = cs.match(/\d+/g)
    return m ? [+m[0], +m[1], +m[2]] : [255, 255, 255]
  }

  _spawnStreak() {
    const W = this.canvas.width
    const H = this.canvas.height
    const diag = Math.sqrt(W * W + H * H)

    // Angle: mostly diagonal-ish, slight variance
    const angleDeg = -50 + (Math.random() * 20 - 10) // -60° to -40°
    const angleRad = (angleDeg * Math.PI) / 180

    // Start off-screen to the left, random vertical entry point
    const startX = -diag * 0.1 + Math.random() * W * 0.3
    const startY = H * 0.05 + Math.random() * H * 0.9

    // Speed in px/s — fast enough to feel snappy
    const speed = 600 + Math.random() * 800

    // Width of the halo
    const halfHalo = 30 + Math.random() * 60
    // Width of the bright core
    const halfCore = 3 + Math.random() * 8

    // Colour tint from user setting
    const [r, g, b] = this._baseRGB
    // Slight hue variation per streak
    const dr = Math.round((Math.random() - 0.5) * 60)
    const dg = Math.round((Math.random() - 0.5) * 60)
    const db = Math.round((Math.random() - 0.5) * 60)
    const sr = Math.min(255, Math.max(0, r + dr))
    const sg = Math.min(255, Math.max(0, g + dg))
    const sb = Math.min(255, Math.max(0, b + db))

    const alpha = 0.25 + Math.random() * 0.45

    return {
      x: startX,
      y: startY,
      vx: Math.cos(angleRad) * speed,
      vy: Math.sin(angleRad) * speed,
      angleRad,
      halfHalo,
      halfCore,
      r: sr,
      g: sg,
      b: sb,
      alpha,
      length: diag * (0.4 + Math.random() * 0.6),
      dead: false,
    }
  }

  _drawStreak(ctx, s) {
    const W = this.canvas.width
    const H = this.canvas.height
    ctx.save()

    // Translate to streak head, rotate so streak runs along its angle
    ctx.translate(s.x, s.y)
    ctx.rotate(s.angleRad + Math.PI) // flip: streak trails behind head

    // --- Halo (wide, very soft) ---
    const haloGrad = ctx.createLinearGradient(-s.halfHalo, 0, s.halfHalo, 0)
    haloGrad.addColorStop(0, `rgba(${s.r},${s.g},${s.b},0)`)
    haloGrad.addColorStop(0.4, `rgba(${s.r},${s.g},${s.b},${s.alpha * 0.35})`)
    haloGrad.addColorStop(0.5, `rgba(${s.r},${s.g},${s.b},${s.alpha * 0.6})`)
    haloGrad.addColorStop(0.6, `rgba(${s.r},${s.g},${s.b},${s.alpha * 0.35})`)
    haloGrad.addColorStop(1, `rgba(${s.r},${s.g},${s.b},0)`)
    ctx.fillStyle = haloGrad
    ctx.fillRect(-s.halfHalo, 0, s.halfHalo * 2, s.length)

    // --- Core (narrow, bright, slightly dimming along length) ---
    const coreGrad = ctx.createLinearGradient(0, 0, 0, s.length)
    coreGrad.addColorStop(0, `rgba(255,255,255,${s.alpha})`)
    coreGrad.addColorStop(0.6, `rgba(${s.r},${s.g},${s.b},${s.alpha * 0.8})`)
    coreGrad.addColorStop(1, `rgba(${s.r},${s.g},${s.b},0)`)

    const coreW = ctx.createLinearGradient(-s.halfCore, 0, s.halfCore, 0)
    coreW.addColorStop(0, "rgba(255,255,255,0)")
    coreW.addColorStop(0.5, "rgba(255,255,255,1)")
    coreW.addColorStop(1, "rgba(255,255,255,0)")

    // Draw core as overlapping rect (use composite multiply-free approach)
    ctx.fillStyle = coreGrad
    ctx.globalAlpha = s.alpha
    ctx.fillRect(-s.halfCore, 0, s.halfCore * 2, s.length)
    ctx.globalAlpha = 1

    ctx.restore()

    // Mark dead when head is well past the right edge
    const dist = Math.sqrt(W * W + H * H)
    if (s.x > W + dist * 0.1 && s.y < -dist * 0.1) s.dead = true
    if (s.x > W * 1.5) s.dead = true
  }

  animate(ts) {
    if (!this.active) return
    requestAnimationFrame((t) => this.animate(t))

    const elapsed = ts - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    const dt = elapsed / 1000 // seconds
    this.lastDrawTime = ts - (elapsed % this.fpsInterval)

    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    ctx.clearRect(0, 0, W, H)

    // Spawn new streaks randomly
    this._spawnTimer -= elapsed
    if (this._spawnTimer <= 0 && this.streaks.length < this.maxStreaks) {
      const burst = 1 + Math.floor(Math.random() * 3)
      for (let i = 0; i < burst; i++) {
        this.streaks.push(this._spawnStreak())
      }
      this._spawnTimer = 400 + Math.random() * 1800
    }

    // Update + draw
    for (const s of this.streaks) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      this._drawStreak(ctx, s)
    }

    // Purge dead
    this.streaks = this.streaks.filter((s) => !s.dead)
  }

  updateColor(color) {
    this.color = color
    this._baseRGB = this._parseRGB(color)
  }

  start() {
    if (this.active) return
    this.active = true
    this._baseRGB = this._parseRGB(this.color)
    this.streaks = []
    this._spawnTimer = 0
    this.lastDrawTime = 0
    this.canvas.style.display = "block"
    requestAnimationFrame((t) => this.animate(t))
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
    this.streaks = []
  }
}
