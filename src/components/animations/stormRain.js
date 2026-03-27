/**
 * StormRain (Chill Mode) — Simple, soft rain with minimal visual noise.
 * Keeps the effect calm by removing heavy storm details (cloud drift, lightning,
 * and HD-style splash/ripple complexity).
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
    this.fps = 36
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this.time = 0

    this.windX = 0.9
    this._windTarget = 0.9

    // Offscreen canvas for rain — persists across frames for motion-blur trail
    this._rainCanvas = document.createElement("canvas")
    this._rainCtx = this._rainCanvas.getContext("2d")

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
  }

  // ──────── LIFECYCLE ────────
  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
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

  // ──────── RAIN LAYERS ────────
  //  [speedMin, speedMax, lenMin, lenMax, opMin, opMax, windFactor, baseWidth]
  static LAYERS = [
    [4, 9, 8, 16, 0.06, 0.14, 0.2, 0.7],
    [10, 18, 16, 28, 0.14, 0.28, 0.45, 1.05],
  ]
  static LAYER_COUNTS = [80, 55]

  _initRain() {
    this.drops = []
    for (let li = 0; li < StormRainEffect.LAYERS.length; li++)
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
      tail: 0.35 + Math.random() * 0.24,
      drift: (Math.random() - 0.5) * 0.18,
      phase: Math.random() * Math.PI * 2,
    }
  }

  _drawRain() {
    const rctx = this._rainCtx
    const W = this._rainCanvas.width
    const H = this._rainCanvas.height
    const { _r: r, _g: g, _b: b } = this

    // ── Fade old frame → creates smooth motion-blur trail ──
    // Keep a mild trail so motion feels smooth but not heavy.
    rctx.globalCompositeOperation = "destination-out"
    rctx.fillStyle = "rgba(0,0,0,0.33)"
    rctx.fillRect(0, 0, W, H)
    rctx.globalCompositeOperation = "source-over"

    // Soft dark tint for calm rainy mood.
    rctx.fillStyle = `rgba(${this._cr},${this._cg},${this._cb},0.08)`
    rctx.fillRect(0, 0, W, H)

    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i]
      // Physics
      const layer = StormRainEffect.LAYERS[drop.li]
      const targetVx = this.windX * layer[6] + drop.drift
      drop.vx += (targetVx - drop.vx) * 0.06
      drop.x += drop.vx
      drop.y += drop.vy

      // Recycle
      if (drop.y - drop.len > H) {
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

      rctx.globalAlpha = drop.op
      rctx.strokeStyle = `rgb(${r},${g},${b})`
      rctx.lineWidth = Math.max(0.5, drop.width)
      rctx.lineCap = "round"
      rctx.beginPath()
      rctx.moveTo(tailX, tailY)
      rctx.lineTo(headX, headY)
      rctx.stroke()
    }
    rctx.globalAlpha = 1

    // Stamp rain canvas onto main canvas
    this.ctx.drawImage(this._rainCanvas, 0, 0)
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

      this._windTarget = Math.sin(this.time * 0.00028) * 1.15
      this.windX += (this._windTarget - this.windX) * 0.02

      this._drawRain()
    }

    requestAnimationFrame(() => this._animate())
  }
}
