export class CrtScanlinesEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.frameCanvas = document.createElement("canvas")
    this.frameCtx = this.frameCanvas.getContext("2d")
    this.active = false
    this.rafId = null

    this.fps = 24
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.noiseCanvas = document.createElement("canvas")
    this.noiseCtx = this.noiseCanvas.getContext("2d")
    this.noiseTick = 0
    this.scanColor = this._hexToRgb(options.scanColor || "#7cffad")
    this.backgroundColor = this._hexToRgb(options.backgroundColor || "#0a140f")
    this.scanFrequency = this._normalizeScanFrequency(options.scanFrequency)
    this.scanDensity = Number(options.scanDensity) || 4
    this.gamma = Number(options.gamma) || 0.3
    this.scanAngle = Number(options.scanAngle) || 0

    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight

    this.frameCanvas.width = this.canvas.width
    this.frameCanvas.height = this.canvas.height

    this.noiseCanvas.width = Math.max(64, Math.floor(this.canvas.width * 0.25))
    this.noiseCanvas.height = Math.max(64, Math.floor(this.canvas.height * 0.25))
    this._rebuildNoise()
  }

  _hexToRgb(hex) {
    const normalized = String(hex || "").replace("#", "")
    const full = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized
    const intVal = Number.parseInt(full, 16)
    if (!Number.isFinite(intVal) || full.length !== 6) return { r: 124, g: 255, b: 173 }
    return { r: (intVal >> 16) & 255, g: (intVal >> 8) & 255, b: intVal & 255 }
  }

  updateScanColor(hex) {
    this.scanColor = this._hexToRgb(hex)
    this._rebuildNoise()
  }

  updateBackgroundColor(hex) {
    this.backgroundColor = this._hexToRgb(hex)
  }

  _normalizeScanFrequency(value) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 0.11
    return Math.min(2.0, Math.max(0.01, parsed))
  }

  updateScanFrequency(value) {
    this.scanFrequency = this._normalizeScanFrequency(value)
  }

  updateScanAngle(deg) {
    this.scanAngle = Number(deg) || 0
  }

  updateScanDensity(value) {
    this.scanDensity = Math.max(1, Math.min(20, Number(value) || 4))
  }

  updateGamma(value) {
    this.gamma = Math.max(0, Math.min(1, Number(value) || 0.3))
  }

  _rebuildNoise() {
    const w = this.noiseCanvas.width
    const h = this.noiseCanvas.height
    const imageData = this.noiseCtx.createImageData(w, h)
    const data = imageData.data
    const { r, g, b } = this.scanColor
    for (let i = 0; i < data.length; i += 4) {
      const n = Math.random() * 255
      data[i] = Math.min(255, r * 0.12 + n * 0.06)
      data[i + 1] = Math.min(255, g * 0.35 + n * 0.22)
      data[i + 2] = Math.min(255, b * 0.22 + n * 0.08)
      data[i + 3] = Math.random() * 28
    }
    this.noiseCtx.putImageData(imageData, 0, 0)
  }

  _drawRetroGridLines(ctx, w, h) {
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.rotate((this.scanAngle * Math.PI) / 180)
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)"
    const diagonal = Math.sqrt(w * w + h * h)
    const density = this.scanDensity
    
    // Draw grid lines perpendicular to the current angle
    for (let y = -diagonal / 2; y < diagonal / 2; y += density) {
      ctx.fillRect(-diagonal / 2, y, diagonal, 1)
    }
    ctx.restore()
  }

  _drawCurvedScreen(currentTime) {
    const ctx = this.ctx
    const w = this.canvas.width
    const h = this.canvas.height
    const stripeH = 4
    const { r, g, b } = this.scanColor
    ctx.clearRect(0, 0, w, h)
    for (let y = 0; y < h; y += stripeH) {
      const ny = (y / h) * 2 - 1
      const edgeWarp = Math.min(w * 0.08, ny * ny * w * 0.032)
      const microWarp = Math.sin(currentTime * 0.001 + y * 0.02) * 0.4
      const sx = Math.max(0, edgeWarp + microWarp)
      const sw = Math.max(1, w - sx * 2)
      ctx.drawImage(this.frameCanvas, sx, y, sw, stripeH, 0, y, w, stripeH)
    }
    const gloss = ctx.createRadialGradient(w * 0.5, h * 0.46, Math.min(w, h) * 0.07, w * 0.5, h * 0.5, Math.max(w, h) * 0.62)
    gloss.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.11)`)
    gloss.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = gloss
    ctx.fillRect(0, 0, w, h)
    const topReflection = ctx.createLinearGradient(0, 0, 0, h * 0.25)
    topReflection.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.08)`)
    topReflection.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
    ctx.fillStyle = topReflection
    ctx.fillRect(0, 0, w, h * 0.25)
  }

  _draw(currentTime) {
    const ctx = this.frameCtx
    const w = this.canvas.width
    const h = this.canvas.height
    const { r, g, b } = this.scanColor
    const { r: br, g: bg, b: bb } = this.backgroundColor

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, ${this.gamma})`
    ctx.fillRect(0, 0, w, h)

    this.noiseTick++
    if (this.noiseTick % 8 === 0) this._rebuildNoise()
    ctx.save()
    ctx.globalAlpha = 0.22
    ctx.globalCompositeOperation = "screen"
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(this.noiseCanvas, 0, 0, w, h)
    ctx.restore()

    this._drawRetroGridLines(ctx, w, h)

    // Traveling scan beam with rotation
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.rotate((this.scanAngle * Math.PI) / 180)
    
    const diagonal = Math.sqrt(w * w + h * h)
    const beamPos = ((currentTime * this.scanFrequency) % (diagonal + 400)) - (diagonal / 2 + 200)
    const beam = ctx.createLinearGradient(0, beamPos - 100, 0, beamPos + 100)
    beam.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
    beam.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.25)`)
    beam.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
    ctx.fillStyle = beam
    ctx.fillRect(-diagonal / 2, beamPos - 100, diagonal, 200)
    ctx.restore()

    const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.75)
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)")
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.38)")
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, w, h)

    this._drawCurvedScreen(currentTime)
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this.rafId = this._animId = requestAnimationFrame((t) => this.animate(t))
    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)
    this._draw(currentTime)
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.canvas.style.display = "block"
    this.rafId = this._animId = requestAnimationFrame((t) => this.animate(t))
  }

  stop() {
    if (this._animId) cancelAnimationFrame(this._animId)
    this.active = false
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }
}
