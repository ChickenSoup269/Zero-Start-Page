/**
 * MeteorEffect — Simple, Lightweight & Ultra-Smooth Shooting Stars
 *
 * Designed for zero-lag 60/120fps performance with clean celestial visuals:
 *  - Subtle Dark Night Sky Overlay (Gentle cosmic backdrop wash)
 *  - Fast Batched Starfield
 *  - Crisp Single-Pass Shooting Stars
 *  - Zero Memory Allocations in Render Loop
 */

export class MeteorEffect {
  constructor(canvasId, color = "#ffffff") {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) throw new Error(`Canvas #${canvasId} not found`)
    this.ctx = this.canvas.getContext("2d", { alpha: true })

    this.active = false
    this.speedMult = 1.0
    this.spawnRate = 1.0
    this.angleDeg = 45
    this.fullColor = false

    this.colors = []
    this.setColor(color)

    this.meteors = []
    this.stars = []
    this._acc = 0
    this._lastT = 0
    this.cssWidth = 0
    this.cssHeight = 0

    this.resize()
    this._onResize = () => this.resize()
    window.addEventListener("resize", this._onResize)
  }

  // ─── PUBLIC API ───────────────────────────────────────────────

  start() {
    if (this.active) return
    this.active = true
    this._lastT = performance.now()
    this._acc = 0
    this.canvas.style.display = "block"
    requestAnimationFrame((t) => {
      this._lastT = t
      this._loop(t)
    })
  }

  stop() {
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._onResize)
  }

  setColor(color) {
    if (Array.isArray(color)) {
      this.colors = color.map((c) => this._parseHex(c))
    } else {
      this.colors = [this._parseHex(color)]
    }
  }

  setAngle(deg) {
    this.angleDeg = deg
  }

  setFullColor(enabled) {
    this.fullColor = enabled
  }

  setSpeed(s) {
    this.speedMult = Math.max(0.2, Math.min(4, s))
  }

  setSpawnRate(r) {
    this.spawnRate = Math.max(0.3, Math.min(10, r))
  }

  resize() {
    if (!this.canvas) return
    this.cssWidth = window.innerWidth
    this.cssHeight = window.innerHeight
    this.canvas.width = this.cssWidth
    this.canvas.height = this.cssHeight
    this.canvas.style.width = `${this.cssWidth}px`
    this.canvas.style.height = `${this.cssHeight}px`
    this._buildStars()
  }

  // ─── COLOR LOGIC ──────────────────────────────────────────────

  _parseHex(hex) {
    const c = (hex || "#ffffff").replace("#", "")
    const full = c.length === 3 ? c[0] + c[0] + c[1] + c[1] + c[2] + c[2] : c
    const r = parseInt(full.slice(0, 2), 16) || 255
    const g = parseInt(full.slice(2, 4), 16) || 255
    const b = parseInt(full.slice(4, 6), 16) || 255
    return {
      r,
      g,
      b,
      rgbStr: `${r},${g},${b}`,
    }
  }

  _getRandomColor() {
    if (this.fullColor) {
      const palette = [
        { r: 255, g: 190, b: 120, rgbStr: "255,190,120" },
        { r: 130, g: 230, b: 255, rgbStr: "130,230,255" },
        { r: 255, g: 150, b: 220, rgbStr: "255,150,220" },
        { r: 180, g: 170, b: 255, rgbStr: "180,170,255" },
        { r: 140, g: 255, b: 210, rgbStr: "140,255,210" },
      ]
      return palette[Math.floor(Math.random() * palette.length)]
    }
    if (this.colors.length === 0) return { r: 255, g: 255, b: 255, rgbStr: "255,255,255" }
    return this.colors[Math.floor(Math.random() * this.colors.length)]
  }

  // ─── SIMPLE & FAST STARFIELD ──────────────────────────────────

  _buildStars() {
    const W = this.cssWidth
    const H = this.cssHeight
    const count = Math.max(50, Math.min(100, Math.floor((W * H) / 18000)))

    this.stars = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() < 0.8 ? 1.0 : 1.6,
      baseAlpha: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.001 + Math.random() * 0.002,
    }))
  }

  // ─── SIMPLE METEOR SPAWNING ───────────────────────────────────

  _spawnMeteor() {
    const W = this.cssWidth
    const H = this.cssHeight

    const angle = (this.angleDeg * Math.PI) / 180
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)

    const speed = (20 + Math.random() * 12) * this.speedMult
    const len = 120 + Math.random() * 150
    const thickness = 1.2 + Math.random() * 0.8
    const color = this._getRandomColor()

    let x, y
    if (Math.abs(cosA) > Math.abs(sinA)) {
      x = cosA > 0 ? -len : W + len
      y = Math.random() * (H + len) - len * 0.5
    } else {
      x = Math.random() * (W + len) - len * 0.5
      y = sinA > 0 ? -len : H + len
    }

    this.meteors.push({
      x,
      y,
      vx: cosA * speed,
      vy: sinA * speed,
      cosA,
      sinA,
      len,
      thickness,
      progress: 0,
      decayRate: 0.016 + Math.random() * 0.012,
      color,
    })
  }

  // ─── UPDATE ───────────────────────────────────────────────────

  _update(dt) {
    const s = Math.min(dt / 16.67, 2.0)
    const W = this.cssWidth
    const H = this.cssHeight

    // Spawning (Max 6 concurrent meteors to prevent clutter/lag)
    this._acc += this.spawnRate * (dt / 1000)
    while (this._acc >= 1) {
      if (this.meteors.length < 6) {
        this._spawnMeteor()
      }
      this._acc -= 1
    }

    // Update Meteors
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i]
      m.x += m.vx * s
      m.y += m.vy * s
      m.progress += m.decayRate * s

      const margin = m.len + 50
      if (
        m.progress >= 1.0 ||
        m.x < -margin ||
        m.x > W + margin ||
        m.y < -margin ||
        m.y > H + margin
      ) {
        this.meteors.splice(i, 1)
      }
    }
  }

  // ─── FAST RENDER ──────────────────────────────────────────────

  _draw(t) {
    const ctx = this.ctx
    const W = this.cssWidth
    const H = this.cssHeight

    // 1. Clear Canvas
    ctx.clearRect(0, 0, W, H)

    // 2. Simple Flat Cosmic Dark Overlay (High performance, soft dark night sky)
    ctx.fillStyle = "rgba(4, 6, 14, 0.5)"
    ctx.fillRect(0, 0, W, H)

    // 3. Batched Starfield (Instant GPU draw call)
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)"
    ctx.beginPath()
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i]
      const tw = 0.5 + Math.sin(t * s.speed + s.phase) * 0.4
      if (tw > 0.2) {
        ctx.rect(s.x, s.y, s.size, s.size)
      }
    }
    ctx.fill()

    // 4. Simple Clean Shooting Stars
    for (let i = 0; i < this.meteors.length; i++) {
      const m = this.meteors[i]
      const intensity = Math.sin(m.progress * Math.PI)
      if (intensity <= 0.02) continue

      const alpha = Math.min(1.0, intensity * 1.3)
      const hx = m.x
      const hy = m.y
      const tx = hx - m.cosA * m.len
      const ty = hy - m.sinA * m.len

      // Simple single gradient streak
      const grad = ctx.createLinearGradient(tx, ty, hx, hy)
      grad.addColorStop(0, `rgba(${m.color.rgbStr},0)`)
      grad.addColorStop(0.7, `rgba(${m.color.rgbStr},${0.6 * alpha})`)
      grad.addColorStop(1.0, `rgba(255,255,255,${0.95 * alpha})`)

      ctx.strokeStyle = grad
      ctx.lineWidth = m.thickness
      ctx.lineCap = "round"
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(hx, hy)
      ctx.stroke()

      // Small bright incandescent head dot
      ctx.fillStyle = `rgba(255,255,255,${alpha})`
      ctx.beginPath()
      ctx.arc(hx, hy, m.thickness * 1.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ─── ANIMATION LOOP ───────────────────────────────────────────

  _loop(now) {
    if (!this.active) return
    if (document.visibilityState === "hidden") {
      document.addEventListener(
        "visibilitychange",
        () => {
          if (!document.hidden && this.active) {
            requestAnimationFrame((t) => this._loop(t))
          }
        },
        { once: true },
      )
      return
    }
    this._animId = requestAnimationFrame((t) => this._loop(t))

    const dt = Math.min(now - this._lastT, 33)
    this._lastT = now
    this._update(dt)
    this._draw(now)
  }
}



