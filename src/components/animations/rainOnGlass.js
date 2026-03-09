export class RainOnGlassEffect {
  constructor(canvasId, color = "#a8d8ff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.drops = []
    this.microDrops = [] // tiny condensation specks on glass
    this.trails = [] // persistent dried streaks on glass
    this.animationFrame = null
    this._r = 168
    this._g = 216
    this._b = 255

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this.glareOffset = 0
    this.time = 0
    this.windX = (Math.random() - 0.5) * 0.4 // subtle horizontal wind

    this._parseColor(color)
    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  _parseColor(hex) {
    const clean = hex.replace("#", "")
    this._r = parseInt(clean.substring(0, 2), 16)
    this._g = parseInt(clean.substring(2, 4), 16)
    this._b = parseInt(clean.substring(4, 6), 16)
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.drops = []
    this.microDrops = []
    this.trails = []
    this._seed()
  }

  _seed() {
    // Tiny condensation specks covering the glass surface
    const microCount = Math.floor(
      (this.canvas.width * this.canvas.height) / 3800,
    )
    for (let i = 0; i < Math.min(microCount, 320); i++) {
      this.microDrops.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        r: Math.random() * 2.2 + 0.4,
        opacity: Math.random() * 0.32 + 0.12,
      })
    }
    // Seed main drops
    const density = Math.floor((this.canvas.width * this.canvas.height) / 14000)
    const count = Math.min(Math.max(density, 35), 100)
    for (let i = 0; i < count; i++) {
      this.drops.push(this._newDrop(true))
    }
    // Pre-populate faint dried streaks on glass
    const trailCount = Math.floor(this.canvas.width / 65)
    for (let i = 0; i < trailCount; i++) {
      this.trails.push(this._newStaticTrail())
    }
  }

  _newStaticTrail() {
    const x = Math.random() * this.canvas.width
    const y = Math.random() * this.canvas.height * 0.55
    const len = Math.random() * 190 + 50
    const pts = [{ x, y }]
    let cx = x,
      cy = y
    const steps = Math.floor(len / 9)
    for (let i = 1; i <= steps; i++) {
      cx += (Math.random() - 0.5) * 8
      cy += len / steps
      pts.push({ x: cx, y: cy })
    }
    return {
      pts,
      opacity: Math.random() * 0.052 + 0.012,
      width: Math.random() * 1.3 + 0.3,
      age: Math.floor(Math.random() * 350),
      maxAge: Math.random() * 900 + 400,
    }
  }

  _newDrop(rndY = false) {
    // Occasionally spawn a large drop (5% chance)
    const r =
      Math.random() < 0.05 ? Math.random() * 12 + 18 : Math.random() * 14 + 4
    const x = Math.random() * this.canvas.width
    const y = rndY ? Math.random() * this.canvas.height : -r - 5
    return {
      x,
      y,
      r,
      cr: rndY ? r * (Math.random() * 0.8 + 0.2) : 2.5,
      growRate: Math.random() * 0.08 + 0.025,
      vy: 0,
      vx: 0,
      sliding: rndY && Math.random() < 0.32,
      gravity: 0.009 + r * 0.0009, // bigger drops are heavier
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.04 + 0.01,
      wobbleAmp: (Math.random() - 0.5) * 0.35,
      opacity: Math.random() * 0.18 + 0.68,
      trail: [],
      absorbed: false,
      age: 0,
      splashR: rndY ? 0 : 2,
      splashOp: rndY ? 0 : 0.52,
    }
  }

  _trailFromDrop(d) {
    return {
      pts: d.trail.map((p) => ({ x: p.x, y: p.y })),
      opacity: Math.random() * 0.055 + 0.02,
      width: d.cr * 0.36 + 0.4,
      age: 0,
      maxAge: Math.random() * 520 + 200,
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.glareOffset = 0
    this.time = 0
    if (!this.drops.length) this._seed()
    this._parseColor(this.color)
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame)
    this.animationFrame = null
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
    this.drops = []
    this.microDrops = []
    this.trails = []
  }

  animate(t = 0) {
    if (!this.active) return
    this.animationFrame = requestAnimationFrame((t2) => this.animate(t2))
    const elapsed = t - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = t - (elapsed % this.fpsInterval)
    this.time++
    this._update()
    this._draw()
  }

  _update() {
    // Spawn new drops at a natural rate
    if (Math.random() < 0.11) this.drops.push(this._newDrop(false))

    // Slowly shift wind direction
    this.windX += (Math.random() - 0.5) * 0.002
    this.windX = Math.max(-0.5, Math.min(0.5, this.windX))

    this.glareOffset = (this.glareOffset + 0.15) % (this.canvas.width + 600)

    // Age out old trails
    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].age++
      if (this.trails[i].age > this.trails[i].maxAge) this.trails.splice(i, 1)
    }

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]
      if (d.absorbed) {
        this.drops.splice(i, 1)
        continue
      }
      d.age++

      // Fade splash ring
      if (d.splashOp > 0) {
        d.splashR += 1.8
        d.splashOp = Math.max(0, d.splashOp - 0.017)
      }

      if (!d.sliding) {
        // Condensation growth phase
        if (d.cr < d.r) d.cr = Math.min(d.cr + d.growRate, d.r)

        // Coalescence: absorb smaller nearby drops
        for (let j = this.drops.length - 1; j >= 0; j--) {
          if (j === i) continue
          const o = this.drops[j]
          if (o.absorbed || o.cr > d.cr * 0.88) continue
          const dx = d.x - o.x,
            dy = d.y - o.y
          if (dx * dx + dy * dy < (d.cr + o.cr * 0.65) ** 2) {
            const newArea = Math.PI * (d.cr ** 2 + o.cr ** 2)
            d.cr = Math.min(Math.sqrt(newArea / Math.PI), d.r * 1.6)
            d.r = Math.max(d.r, d.cr)
            o.absorbed = true
          }
        }

        // Begin sliding when drop mass overcomes surface tension
        if (d.cr >= d.r * 0.88 && d.age > 55 + Math.random() * 90) {
          d.sliding = true
          d.vy = 0.08 + Math.random() * 0.12
        }
      } else {
        // Physics-based sliding: gravity acceleration + wind drift
        d.vy = Math.min(d.vy + d.gravity, 4.0)
        d.vx += (this.windX - d.vx) * 0.04
        d.wobble += d.wobbleSpeed
        d.x += d.vx + Math.sin(d.wobble) * d.wobbleAmp
        d.y += d.vy

        // Record trail waypoints for smooth path rendering
        const last = d.trail[d.trail.length - 1]
        if (!last || d.y - last.y > 3.5) {
          d.trail.push({ x: d.x, y: d.y - d.cr * 0.55 })
          if (d.trail.length > 65) d.trail.shift()
        }

        // Absorb drops along the sliding path
        for (let j = this.drops.length - 1; j >= 0; j--) {
          if (j === i) continue
          const o = this.drops[j]
          if (o.absorbed) continue
          const dx = d.x - o.x,
            dy = d.y - o.y
          if (dx * dx + dy * dy < (d.cr + o.cr * 0.68) ** 2) {
            const newArea = Math.PI * (d.cr ** 2 + o.cr ** 2)
            d.cr = Math.min(Math.sqrt(newArea / Math.PI), 32)
            d.r = Math.max(d.r, d.cr)
            d.vy = Math.min(d.vy * 1.08, 4.0)
            o.absorbed = true
          }
        }
      }

      // Drop exited screen — leave a persistent dried streak
      if (d.y - d.cr > this.canvas.height) {
        if (d.trail.length > 5) {
          this.trails.push(this._trailFromDrop(d))
          if (this.trails.length > 90) this.trails.shift()
        }
        this.drops.splice(i, 1)
      }
    }
  }

  _draw() {
    const ctx = this.ctx
    const W = this.canvas.width,
      H = this.canvas.height
    ctx.clearRect(0, 0, W, H)
    const r = this._r,
      g = this._g,
      b = this._b

    // ── 1. Condensation fog layer ─────────────────────────────────────────────
    const fog = ctx.createRadialGradient(
      W * 0.5,
      H * 0.42,
      0,
      W * 0.5,
      H * 0.42,
      W * 0.75,
    )
    fog.addColorStop(0, `rgba(${r},${g},${b},0.042)`)
    fog.addColorStop(0.55, `rgba(${r},${g},${b},0.016)`)
    fog.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = fog
    ctx.fillRect(0, 0, W, H)

    // ── 2. Micro condensation dots (tiny droplets on glass surface) ───────────
    for (const m of this.microDrops) {
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${r},${g},${b},${m.opacity})`
      ctx.fill()
    }

    // ── 3. Dried water streak marks on the glass ──────────────────────────────
    for (const t of this.trails) {
      if (t.pts.length < 2) continue
      const ageFade = 1 - t.age / t.maxAge
      const op = t.opacity * ageFade
      if (op < 0.003) continue
      ctx.beginPath()
      ctx.moveTo(t.pts[0].x, t.pts[0].y)
      for (let i = 1; i < t.pts.length; i++) {
        const p = t.pts[i - 1],
          c = t.pts[i]
        ctx.quadraticCurveTo(p.x, p.y, (p.x + c.x) / 2, (p.y + c.y) / 2)
      }
      ctx.strokeStyle = `rgba(${r},${g},${b},${op})`
      ctx.lineWidth = t.width
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke()
    }

    // ── 4. Drops ──────────────────────────────────────────────────────────────
    for (const d of this.drops) {
      if (d.absorbed) continue
      const cr = d.cr,
        op = d.opacity

      // Splash ring on impact
      if (d.splashOp > 0.01) {
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.splashR, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${r},${g},${b},${d.splashOp})`
        ctx.lineWidth = 1.3
        ctx.stroke()
        if (d.splashR > cr * 0.5) {
          ctx.beginPath()
          ctx.arc(d.x, d.y, d.splashR * 0.55, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${r},${g},${b},${d.splashOp * 0.45})`
          ctx.lineWidth = 0.7
          ctx.stroke()
        }
      }

      // Sliding trail — tapered, fades to transparent at the top
      if (d.sliding && d.trail.length > 3) {
        const tf = d.trail[0],
          tl = d.trail[d.trail.length - 1]
        const tg = ctx.createLinearGradient(tf.x, tf.y, tl.x, tl.y)
        tg.addColorStop(0, `rgba(${r},${g},${b},0)`)
        tg.addColorStop(0.45, `rgba(${r},${g},${b},${op * 0.14})`)
        tg.addColorStop(1, `rgba(${r},${g},${b},${op * 0.27})`)
        ctx.beginPath()
        ctx.moveTo(tf.x, tf.y)
        for (let i = 1; i < d.trail.length; i++) {
          const p = d.trail[i - 1],
            c = d.trail[i]
          ctx.quadraticCurveTo(p.x, p.y, (p.x + c.x) / 2, (p.y + c.y) / 2)
        }
        ctx.strokeStyle = tg
        ctx.lineWidth = cr * 0.42
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.stroke()
      }

      // ── Drop body ─────────────────────────────────────────────────────────
      ctx.save()
      ctx.translate(d.x, d.y)

      // Teardrop elongation when sliding fast
      const speed = d.sliding ? Math.min(d.vy / 2.8, 1) : 0
      ctx.scale(1 - speed * 0.1, 1 + speed * 0.28)

      // Drop shadow for glass-depth realism
      ctx.shadowColor = "rgba(0,0,0,0.22)"
      ctx.shadowBlur = cr * 0.7
      ctx.shadowOffsetX = cr * 0.08
      ctx.shadowOffsetY = cr * 0.12

      // Body: radial gradient — bright core transitioning to tinted, transparent edge
      const hx = -cr * 0.28,
        hy = -cr * 0.32
      const bg = ctx.createRadialGradient(hx, hy, cr * 0.02, 0, 0, cr * 1.08)
      bg.addColorStop(0.0, `rgba(255,255,255,${op * 0.95})`)
      bg.addColorStop(0.14, `rgba(255,255,255,${op * 0.58})`)
      bg.addColorStop(0.3, `rgba(${r},${g},${b},${op * 0.78})`)
      bg.addColorStop(0.52, `rgba(${r},${g},${b},${op * 0.58})`)
      bg.addColorStop(
        0.75,
        `rgba(${(r * 0.68) | 0},${(g * 0.68) | 0},${(b * 0.68) | 0},${op * 0.34})`,
      )
      bg.addColorStop(0.9, `rgba(${r},${g},${b},${op * 0.1})`)
      bg.addColorStop(1.0, `rgba(${r},${g},${b},0)`)

      ctx.beginPath()
      if (d.sliding && speed > 0.12) {
        this._teardrop(ctx, cr)
      } else {
        ctx.arc(0, 0, cr, 0, Math.PI * 2)
      }
      ctx.fillStyle = bg
      ctx.fill()
      ctx.shadowColor = "transparent"

      // Lens refraction: darker inverted ellipse in lower half (simulates background inversion)
      ctx.beginPath()
      ctx.ellipse(cr * 0.06, cr * 0.3, cr * 0.6, cr * 0.4, 0, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${(r * 0.32) | 0},${(g * 0.32) | 0},${(b * 0.32) | 0},${op * 0.22})`
      ctx.fill()

      // Bright rim — thin ring around drop edge
      ctx.beginPath()
      if (d.sliding && speed > 0.12) {
        this._teardrop(ctx, cr)
      } else {
        ctx.arc(0, 0, cr, 0, Math.PI * 2)
      }
      ctx.strokeStyle = `rgba(255,255,255,${op * 0.32})`
      ctx.lineWidth = 0.8
      ctx.stroke()
      ctx.restore()

      // Primary specular — large bright crescent (top-left, dominant light source)
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(
        d.x - cr * 0.27,
        d.y - cr * 0.33,
        cr * 0.27,
        cr * 0.14,
        -Math.PI / 5.5,
        0,
        Math.PI * 2,
      )
      ctx.fillStyle = `rgba(255,255,255,${op * 0.88})`
      ctx.fill()
      ctx.restore()

      // Secondary specular — tiny catch-light (bottom-right, Fresnel reflection)
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(
        d.x + cr * 0.3,
        d.y + cr * 0.28,
        cr * 0.1,
        cr * 0.06,
        Math.PI / 4,
        0,
        Math.PI * 2,
      )
      ctx.fillStyle = `rgba(255,255,255,${op * 0.4})`
      ctx.fill()
      ctx.restore()
    }

    // ── 5. Diagonal glass glare sweep (slowly drifts across screen) ───────────
    const gx = this.glareOffset - 300
    const gg = ctx.createLinearGradient(gx, 0, gx + 300, H * 0.5)
    gg.addColorStop(0, "rgba(255,255,255,0)")
    gg.addColorStop(0.3, "rgba(255,255,255,0.013)")
    gg.addColorStop(0.5, "rgba(255,255,255,0.030)")
    gg.addColorStop(0.7, "rgba(255,255,255,0.013)")
    gg.addColorStop(1, "rgba(255,255,255,0)")
    ctx.save()
    ctx.transform(1, 0, -0.38, 1, 0, 0)
    ctx.fillStyle = gg
    ctx.fillRect(gx, 0, 300, H)
    ctx.restore()
  }

  // Smooth bezier teardrop path: narrow pointed top, rounded bottom
  _teardrop(ctx, r) {
    const top = -r * 1.12,
      bot = r
    ctx.moveTo(0, top)
    ctx.bezierCurveTo(r * 0.88, top * 0.22, r * 1.06, bot * 0.52, 0, bot)
    ctx.bezierCurveTo(-r * 1.06, bot * 0.52, -r * 0.88, top * 0.22, 0, top)
  }
}
