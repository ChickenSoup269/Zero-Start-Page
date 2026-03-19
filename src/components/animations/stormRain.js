/**
 * StormRain — Heavy rain with dark storm clouds, frequent lightning,
 * and atmospheric effects.
 *
 * v3 improvements:
 *  - Default cloud color is near-black (#080b14)
 *  - Smoother rain via dedicated offscreen canvas with motion-blur trail
 *  - Pre-baked drop-head sprite per layer — no per-drop gradient allocation
 *  - Bezier curve streak for organic drop shape
 *  - Ripple rings on ground instead of particle splash
 */
export class StormRainEffect {
  constructor(canvasId, cloudColor = "#080b14", rainColor = "#9ecfee") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.cloudColor = cloudColor
    this.rainColor = rainColor

    this._parseColor(rainColor)
    this._parseCloudRgb(cloudColor)

    this.drops = []
    this.clouds = []
    this.lightning = []
    this.lightningFlashes = []
    this.ripples = []

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this.time = 0

    this.windX = 2.2
    this._windTarget = 2.2

    this.lastLightning = 0
    this.lightningInterval = 750

    // Offscreen canvas for rain — persists across frames for motion-blur trail
    this._rainCanvas = document.createElement("canvas")
    this._rainCtx = this._rainCanvas.getContext("2d")

    // Pre-baked drop sprite cache keyed by layer index
    this._dropSprites = []

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  // ──────── COLOUR HELPERS ────────
  _parseColor(hex) {
    const c = hex.replace("#", "")
    this._r = parseInt(c.substring(0, 2), 16)
    this._g = parseInt(c.substring(2, 4), 16)
    this._b = parseInt(c.substring(4, 6), 16)
  }

  _parseCloudRgb(hex) {
    const c = hex.replace("#", "")
    this._cr = parseInt(c.substring(0, 2), 16)
    this._cg = parseInt(c.substring(2, 4), 16)
    this._cb = parseInt(c.substring(4, 6), 16)
  }

  // ──────── RESIZE ────────
  resize() {
    if (!this.canvas) return
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._rainCanvas.width = this.canvas.width
    this._rainCanvas.height = this.canvas.height
    this._bakeDropSprites()
  }

  // ──────── LIFECYCLE ────────
  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this._initClouds()
    this._initRain()
    this._animate()
  }

  stop() {
    this.active = false
    if (this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.canvas.style.display = "none"
    }
  }

  // ──────── DROP SPRITE BAKER ────────
  // Tiny offscreen blob stamped at the bright head of each close-layer drop.
  // Baked once per resize, eliminates per-drop radial gradient cost.
  _bakeDropSprites() {
    this._dropSprites = StormRainEffect.LAYERS.map((L) => {
      const w = Math.ceil(L[7] * 3 + 6)
      const oc = document.createElement("canvas")
      oc.width = w
      oc.height = w
      const oc2 = oc.getContext("2d")
      const cx = w / 2,
        cy = w / 2,
        r = w / 2
      const g = oc2.createRadialGradient(cx, cy - r * 0.2, 0, cx, cy, r)
      g.addColorStop(0, `rgba(255,255,255,0.60)`)
      g.addColorStop(0.4, `rgba(${this._r},${this._g},${this._b},0.45)`)
      g.addColorStop(1, `rgba(${this._r},${this._g},${this._b},0)`)
      oc2.fillStyle = g
      oc2.beginPath()
      oc2.arc(cx, cy, r, 0, Math.PI * 2)
      oc2.fill()
      return { canvas: oc, w }
    })
  }

  // ──────── RAIN LAYERS ────────
  //  [speedMin, speedMax, lenMin, lenMax, opMin, opMax, windFactor, baseWidth]
  static LAYERS = [
    [6, 12, 9, 18, 0.05, 0.13, 0.28, 0.65], // 0 — far / fine drizzle
    [13, 25, 20, 38, 0.18, 0.38, 0.65, 1.2], // 1 — mid
    [28, 50, 36, 72, 0.4, 0.82, 1.0, 2.0], // 2 — close / heavy
  ]
  static LAYER_COUNTS = [210, 155, 85]

  _initRain() {
    this.drops = []
    for (let li = 0; li < 3; li++)
      for (let i = 0; i < StormRainEffect.LAYER_COUNTS[li]; i++)
        this.drops.push(this._newDrop(li, true))
  }

  _newDrop(li, randomY = false) {
    const L = StormRainEffect.LAYERS[li]
    const [sMin, sMax, lMin, lMax, oMin, oMax, wf, baseW] = L
    const vy = sMin + Math.random() * (sMax - sMin)
    const len = lMin + Math.random() * (lMax - lMin)
    const op = oMin + Math.random() * (oMax - oMin)
    const x = Math.random() * (this.canvas.width + 300) - 80
    const y = randomY
      ? Math.random() * this.canvas.height
      : -(len + Math.random() * 300)
    return {
      x,
      y,
      vx: this.windX * wf + (Math.random() - 0.5) * 0.5,
      vy,
      len,
      op,
      li,
      width: baseW * (0.82 + Math.random() * 0.48),
      tail: 0.28 + Math.random() * 0.38,
      drift: (Math.random() - 0.5) * 0.18,
      phase: Math.random() * Math.PI * 2,
      // Bezier lateral offset — baked per drop, gives each streak subtle organic curve
      cpDx: (Math.random() - 0.5) * 4,
      cpDy: len * (0.3 + Math.random() * 0.25),
    }
  }

  _drawRain() {
    const rctx = this._rainCtx
    const W = this._rainCanvas.width
    const H = this._rainCanvas.height
    const { _r: r, _g: g, _b: b } = this

    // ── Fade old frame → creates smooth motion-blur trail ──
    // "destination-out" erases previous pixels proportionally, leaving ghost.
    rctx.globalCompositeOperation = "destination-out"
    rctx.fillStyle = "rgba(0,0,0,0.40)"
    rctx.fillRect(0, 0, W, H)
    rctx.globalCompositeOperation = "source-over"

    this.drops.forEach((drop) => {
      // Physics
      const layer = StormRainEffect.LAYERS[drop.li]
      const targetVx = this.windX * layer[6] + drop.drift
      drop.vx += (targetVx - drop.vx) * 0.07
      drop.x +=
        drop.vx +
        Math.sin(this.time * 0.002 + drop.phase) * 0.06 * (drop.li + 1)
      drop.y += drop.vy

      // Recycle
      if (drop.y - drop.len > H) {
        if (drop.li === 2) this._addRipple(drop.x, H)
        Object.assign(drop, this._newDrop(drop.li, false))
        return
      }
      if (drop.x < -80) drop.x = W + 80
      if (drop.x > W + 80) drop.x = -80

      // Streak endpoints
      const tailX = drop.x - drop.vx * drop.tail
      const tailY = drop.y - drop.vy * drop.tail
      const headX = drop.x + drop.vx * 0.06
      const headY = drop.y + drop.len

      // Bezier control point — slight lateral bow per drop
      const cpX = tailX + drop.cpDx + drop.vx * 0.28
      const cpY = tailY + drop.cpDy

      // ── Pass 1: wide soft glow ──
      const outerOp = drop.op * 0.28
      const og = rctx.createLinearGradient(tailX, tailY, headX, headY)
      og.addColorStop(0, `rgba(${r},${g},${b},0)`)
      og.addColorStop(
        0.38,
        `rgba(${r},${g},${b},${(outerOp * 0.55).toFixed(3)})`,
      )
      og.addColorStop(
        0.78,
        `rgba(${r},${g},${b},${(outerOp * 0.88).toFixed(3)})`,
      )
      og.addColorStop(1, `rgba(${r},${g},${b},${outerOp.toFixed(3)})`)
      rctx.strokeStyle = og
      rctx.lineWidth = drop.width * 2.1
      rctx.lineCap = "round"
      rctx.lineJoin = "round"
      rctx.beginPath()
      rctx.moveTo(tailX, tailY)
      rctx.quadraticCurveTo(cpX, cpY, headX, headY)
      rctx.stroke()

      // ── Pass 2: bright sharp core ──
      const coreOp = drop.op * 0.74
      const ig = rctx.createLinearGradient(tailX, tailY, headX, headY)
      ig.addColorStop(0, `rgba(${r},${g},${b},0)`)
      ig.addColorStop(
        0.42,
        `rgba(${r},${g},${b},${(coreOp * 0.52).toFixed(3)})`,
      )
      ig.addColorStop(0.8, `rgba(215,235,255,${(coreOp * 0.72).toFixed(3)})`)
      ig.addColorStop(1, `rgba(238,250,255,${(coreOp * 0.52).toFixed(3)})`)
      rctx.strokeStyle = ig
      rctx.lineWidth = Math.max(0.45, drop.width * 0.46)
      rctx.beginPath()
      rctx.moveTo(tailX, tailY)
      rctx.quadraticCurveTo(cpX, cpY, headX, headY)
      rctx.stroke()

      // ── Pass 3: glint sprite at head (close layer, bright drops only) ──
      if (drop.li === 2 && drop.op > 0.52) {
        const sp = this._dropSprites[2]
        if (sp) {
          rctx.globalAlpha = drop.op * 0.42
          rctx.drawImage(
            sp.canvas,
            headX - sp.w / 2,
            headY - sp.w / 2,
            sp.w,
            sp.w,
          )
          rctx.globalAlpha = 1
        }
      }
    })

    // Stamp rain canvas onto main canvas
    this.ctx.drawImage(this._rainCanvas, 0, 0)
  }

  // ──────── RIPPLES ────────
  _addRipple(x, y) {
    if (this.ripples.length > 65) return
    this.ripples.push({
      x,
      y: y - 1,
      r: 0,
      maxR: 5 + Math.random() * 9,
      op: 0.3 + Math.random() * 0.25,
      life: 1.0,
      decay: 0.042 + Math.random() * 0.038,
    })
  }

  _drawRipples() {
    const ctx = this.ctx
    this.ripples = this.ripples.filter((rp) => {
      rp.r += (rp.maxR - rp.r) * 0.11
      rp.life -= rp.decay
      if (rp.life <= 0) return false
      ctx.beginPath()
      ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.32, 0, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${this._r},${this._g},${this._b},${(rp.op * rp.life).toFixed(3)})`
      ctx.lineWidth = 0.75
      ctx.stroke()
      return true
    })
  }

  // ──────── CLOUDS ────────
  _initClouds() {
    this.clouds = []
    const count = 9 + Math.floor((this.canvas.width / 1920) * 6)
    for (let i = 0; i < count; i++) this.clouds.push(this._makeCloud(true))
    this.clouds.sort((a, b) => a.layer - b.layer)
  }

  _makeCloud(initial = false) {
    const W = this.canvas.width,
      H = this.canvas.height
    const layer = Math.random()
    const scale = 0.7 + layer * 1.4
    const speed = (0.08 + layer * 0.22) * (0.75 + Math.random() * 0.5)
    const darkness = 0.12 + layer * 0.58
    const y = H * 0.03 + Math.random() * H * (0.25 + layer * 0.2)
    return {
      x: initial
        ? Math.random() * (W + 800) - 400
        : W + 120 + Math.random() * 300,
      y,
      scale,
      speed,
      layer,
      darkness,
      puffs: this._makePuffs(scale),
      wispOffset: Math.random() * Math.PI * 2,
    }
  }

  _makePuffs(scale) {
    const baseR = 55 * scale
    const count = 6 + Math.floor(Math.random() * 4)
    return Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1),
        peak = Math.sin(t * Math.PI)
      return {
        ox: (t - 0.5) * 240 * scale,
        oy: -peak * 48 * scale,
        r: baseR * (0.5 + peak * 0.65),
        bump: 0.65 + Math.random() * 0.75,
      }
    })
  }

  _drawClouds() {
    const ctx = this.ctx
    const { _cr: cr, _cg: cg, _cb: cb } = this

    this.clouds.forEach((cloud) => {
      cloud.x -= cloud.speed
      if (cloud.x + 600 * cloud.scale < 0)
        Object.assign(cloud, this._makeCloud(false))

      const { x, y, puffs, darkness, wispOffset, scale } = cloud

      for (const p of puffs) {
        const gx = x + p.ox,
          gy = y + p.oy,
          r = p.r * p.bump

        // Outer wispy halo
        const halo = ctx.createRadialGradient(
          gx,
          gy - r * 0.1,
          0,
          gx,
          gy,
          r * 1.35,
        )
        halo.addColorStop(
          0,
          `rgba(${cr},${cg},${cb},${(darkness * 0.52).toFixed(3)})`,
        )
        halo.addColorStop(
          0.55,
          `rgba(${cr},${cg},${cb},${(darkness * 0.22).toFixed(3)})`,
        )
        halo.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
        ctx.beginPath()
        ctx.arc(gx, gy, r * 1.35, 0, Math.PI * 2)
        ctx.fillStyle = halo
        ctx.fill()

        // Dense core
        const core = ctx.createRadialGradient(
          gx,
          gy - r * 0.28,
          r * 0.04,
          gx,
          gy,
          r,
        )
        core.addColorStop(
          0,
          `rgba(${cr},${cg},${cb},${(darkness * 0.92).toFixed(3)})`,
        )
        core.addColorStop(
          0.5,
          `rgba(${cr},${cg},${cb},${(darkness * 0.78).toFixed(3)})`,
        )
        core.addColorStop(
          0.85,
          `rgba(${cr},${cg},${cb},${(darkness * 0.32).toFixed(3)})`,
        )
        core.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
        ctx.beginPath()
        ctx.arc(gx, gy, r, 0, Math.PI * 2)
        ctx.fillStyle = core
        ctx.fill()

        // Subtle top rim — pale sky backlighting
        const rimY = gy - r * 0.65
        const rim = ctx.createRadialGradient(gx, rimY, 0, gx, rimY, r * 0.42)
        rim.addColorStop(0, `rgba(75,88,115,${(darkness * 0.16).toFixed(3)})`)
        rim.addColorStop(1, `rgba(75,88,115,0)`)
        ctx.beginPath()
        ctx.arc(gx, rimY, r * 0.42, 0, Math.PI * 2)
        ctx.fillStyle = rim
        ctx.fill()
      }

      // Animated wispy under-belly tendrils (bezier for natural drape)
      for (let w = 0; w < 4; w++) {
        const wx = x + (w / 4 - 0.375) * 190 * scale
        const wy = y + 28 * scale
        const wLen = (18 + Math.random() * 38) * scale
        const wAlpha =
          darkness *
          0.16 *
          (0.5 + 0.5 * Math.sin(this.time * 0.0006 + wispOffset + w * 1.3))
        const wg = ctx.createLinearGradient(wx, wy, wx, wy + wLen)
        wg.addColorStop(0, `rgba(${cr},${cg},${cb},${wAlpha.toFixed(3)})`)
        wg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
        ctx.beginPath()
        ctx.moveTo(wx, wy)
        ctx.bezierCurveTo(
          wx + (Math.random() - 0.5) * 18,
          wy + wLen * 0.4,
          wx + (Math.random() - 0.5) * 12,
          wy + wLen * 0.75,
          wx + (Math.random() - 0.5) * 8,
          wy + wLen,
        )
        ctx.strokeStyle = wg
        ctx.lineWidth = (1.5 + Math.random() * 3.5) * scale
        ctx.lineCap = "round"
        ctx.stroke()
      }
    })
  }

  // ──────── LIGHTNING ────────
  _createLightning() {
    const startX =
      this.canvas.width * 0.1 + Math.random() * this.canvas.width * 0.8
    const segments = 9 + Math.floor(Math.random() * 7)
    this.lightning.push({
      points: this._genLightningPath(startX, 0, segments),
      branches: this._genBranches(startX, segments),
      duration: 120 + Math.random() * 130,
      created: this.time,
      width: 1.4 + Math.random() * 1.6,
    })
    this.lightningFlashes.push({
      intensity: 0.16 + Math.random() * 0.22,
      created: this.time,
      duration: 80 + Math.random() * 60,
    })
  }

  _genLightningPath(x, y, segments) {
    const pts = [{ x, y }]
    let cx = x,
      cy = y
    for (let i = 0; i < segments; i++) {
      cx += (Math.random() - 0.5) * 68
      cy += this.canvas.height / segments + Math.random() * 34
      cx = Math.max(10, Math.min(this.canvas.width - 10, cx))
      pts.push({ x: cx, y: cy })
    }
    return pts
  }

  _genBranches(startX, segments) {
    const out = []
    const bc = 1 + Math.floor(Math.random() * 3)
    for (let b = 0; b < bc; b++) {
      const fromSeg = 2 + Math.floor(Math.random() * (segments - 3))
      const bx = startX + (Math.random() - 0.5) * 80
      const by = (fromSeg / segments) * this.canvas.height
      out.push({
        from: fromSeg,
        points: this._genLightningPath(
          bx,
          by,
          3 + Math.floor(Math.random() * 4),
        ),
      })
    }
    return out
  }

  _drawBolt(points, progress, width, baseAlpha) {
    const ctx = this.ctx
    const op = baseAlpha * (1 - progress)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    ctx.globalAlpha = op * 0.38
    ctx.strokeStyle = "rgba(155,200,255,1)"
    ctx.lineWidth = width * 5.5
    ctx.shadowBlur = 20
    ctx.shadowColor = "rgba(140,185,255,0.65)"
    ctx.beginPath()
    points.forEach((pt, i) =>
      i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y),
    )
    ctx.stroke()

    ctx.globalAlpha = op * 0.62
    ctx.strokeStyle = "rgba(205,228,255,1)"
    ctx.lineWidth = width * 2.4
    ctx.shadowBlur = 10
    ctx.shadowColor = "rgba(195,220,255,0.45)"
    ctx.beginPath()
    points.forEach((pt, i) =>
      i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y),
    )
    ctx.stroke()

    ctx.globalAlpha = op * 0.95
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = Math.max(0.7, width * 0.65)
    ctx.shadowBlur = 5
    ctx.shadowColor = "rgba(255,255,255,0.85)"
    ctx.beginPath()
    points.forEach((pt, i) =>
      i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y),
    )
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1.0
  }

  _drawLightning() {
    const ctx = this.ctx
    const now = this.time

    if (now - this.lastLightning > this.lightningInterval) {
      if (Math.random() > 0.62) this._createLightning()
      this.lastLightning = now
    }

    this.lightning = this.lightning.filter((bolt) => {
      const age = now - bolt.created
      if (age > bolt.duration) return false
      const p = age / bolt.duration
      this._drawBolt(bolt.points, p, bolt.width, 0.44)
      for (const br of bolt.branches)
        if (p > 0.18 && p < 0.78)
          this._drawBolt(br.points, p, bolt.width * 0.42, 0.28)
      return true
    })

    this.lightningFlashes = this.lightningFlashes.filter((flash) => {
      const age = now - flash.created
      if (age > flash.duration) return false
      const t = 1 - age / flash.duration
      const pulse = t < 0.3 ? t / 0.3 : (1 - t) / 0.7
      ctx.globalAlpha = flash.intensity * pulse * 0.13
      ctx.fillStyle = "#c5d8ff"
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      return true
    })
    ctx.globalAlpha = 1.0
  }

  // ──────── ANIMATE ────────
  _animate() {
    if (!this.active) return

    const now = performance.now()
    const deltaTime = now - this.lastDrawTime

    if (deltaTime >= this.fpsInterval) {
      this.lastDrawTime = now - (deltaTime % this.fpsInterval)
      this.time += deltaTime

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

      this._windTarget =
        Math.sin(this.time * 0.00042) * 3.8 + (Math.random() - 0.5) * 0.7
      this.windX += (this._windTarget - this.windX) * 0.014

      this._drawClouds()
      this._drawRain()
      this._drawRipples()
      this._drawLightning()
    }

    requestAnimationFrame(() => this._animate())
  }
}
