export class RainbowBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false

    // Fixed palette: purple / blue / green
    this.purple = [232, 121, 249]
    this.blue = [96, 165, 250]
    this.green = [94, 234, 212]

    this.beamCount = 25
    this.baseTime = 45000 // 45 s in ms
    this.beams = []

    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initBeams()
  }

  randomColorPerm() {
    const [p, b, g] = [this.purple, this.blue, this.green]
    const perms = [
      [p, b, g],
      [p, g, b],
      [g, p, b],
      [g, b, p],
      [b, g, p],
      [b, p, g],
    ]
    return perms[Math.floor(Math.random() * 6)]
  }

  initBeams() {
    this.beams = []
    const W = this.canvas.width
    const len = this.beamCount
    const base = this.baseTime

    for (let i = 0; i < len; i++) {
      const idx = i + 1
      const duration = base - (base / len / 2) * idx
      const totalDist = W * 1.5
      const speed = totalDist / duration
      const delay = (idx / len) * base
      const fraction = (delay % duration) / duration
      const startX = 1.25 * W - fraction * totalDist

      this.beams.push({
        x: startX,
        speed,
        colors: this.randomColorPerm(),
      })
    }
  }

  // Simulate a CSS box-shadow layer (offsetX 0 blur spread color) on a zero-width element.
  // cx    — shadow center x (element x + CSS offsetX)
  // blur  — CSS blur-radius in px
  // spread— CSS spread-radius in px
  // r,g,b,alpha — shadow color
  drawShadowLayer(ctx, cx, blur, spread, r, g, b, alpha, y, h) {
    const total = spread + blur
    if (total <= 0) return
    const left = cx - total
    const grad = ctx.createLinearGradient(left, 0, left + total * 2, 0)
    const spreadFrac = (spread / total) * 0.5

    const solid = `rgba(${r},${g},${b},${alpha})`
    const clear = `rgba(${r},${g},${b},0)`

    grad.addColorStop(0, clear)
    grad.addColorStop(Math.max(0, 0.5 - spreadFrac), solid)
    grad.addColorStop(Math.min(1, 0.5 + spreadFrac), solid)
    grad.addColorStop(1, clear)

    ctx.fillStyle = grad
    ctx.fillRect(left, y, total * 2, h)
  }

  // Replicate CSS box-shadow:
  //   -130px 0 80px 40px white,
  //    -50px 0 50px 25px c1,
  //      0px 0 50px 25px c2,
  //     50px 0 50px 25px c3,
  //    130px 0 80px 40px white
  drawBeam(ctx, x, colors, drawH) {
    const [c1, c2, c3] = colors
    const y = -drawH * 0.1
    const h = drawH * 1.2

    this.drawShadowLayer(ctx, x - 130, 80, 40, 255, 255, 255, 0.75, y, h)
    this.drawShadowLayer(ctx, x - 50, 50, 25, c1[0], c1[1], c1[2], 0.65, y, h)
    this.drawShadowLayer(ctx, x, 50, 25, c2[0], c2[1], c2[2], 0.7, y, h)
    this.drawShadowLayer(ctx, x + 50, 50, 25, c3[0], c3[1], c3[2], 0.65, y, h)
    this.drawShadowLayer(ctx, x + 130, 80, 40, 255, 255, 255, 0.75, y, h)
  }

  // Replicate the CSS .h and .v static white-glow elements.
  // .h — box-shadow: 0 0 50vh 40vh white  on a width:100vw height:0 element at bottom:0
  // .v — box-shadow: 0 0 35vw 25vw white  on a width:0 height:100vh element at left:0 bottom:0
  drawStaticGlows(ctx, W, H) {
    const hBlur = H * 0.5
    const hSpread = H * 0.4
    const hTotal = hBlur + hSpread
    const hGrad = ctx.createLinearGradient(0, H, 0, H - hTotal)
    hGrad.addColorStop(0, "rgba(255,255,255,0.95)")
    hGrad.addColorStop(hSpread / hTotal, "rgba(255,255,255,0.6)")
    hGrad.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = hGrad
    ctx.fillRect(0, H - hTotal, W, hTotal + 1)

    const vBlur = W * 0.35
    const vSpread = W * 0.25
    const vTotal = vBlur + vSpread
    const vGrad = ctx.createLinearGradient(0, 0, vTotal, 0)
    vGrad.addColorStop(0, "rgba(255,255,255,0.95)")
    vGrad.addColorStop(vSpread / vTotal, "rgba(255,255,255,0.6)")
    vGrad.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = vGrad
    ctx.fillRect(0, 0, vTotal, H)
  }

  animate(currentTime) {
    if (!this.active) return

    requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    ctx.clearRect(0, 0, W, H)

    // Static white glows (.h and .v) — drawn without rotation
    this.drawStaticGlows(ctx, W, H)

    // Beams — rotated 10° around the top-right corner (matches CSS transform-origin: top right)
    ctx.save()
    ctx.translate(W, 0)
    ctx.rotate((10 * Math.PI) / 180)
    ctx.translate(-W, 0)

    const drawH = H + W * 0.4

    for (const beam of this.beams) {
      beam.x -= beam.speed * elapsed
      if (beam.x < -0.25 * W) {
        beam.x = 1.25 * W
        beam.colors = this.randomColorPerm()
      }
      this.drawBeam(ctx, beam.x, beam.colors, drawH)
    }

    ctx.restore()
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.initBeams()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }
}
