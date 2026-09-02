/**
 * MatrixRain (Matrix Digital Rain)
 *
 * Supports dual modes:
 *  - "hd" (Ultra HD Cinematic): Multi-depth 3D volumetric parallax, glowing white leading heads,
 *    live in-flight glyph mutation, authentic cipher set, and interactive cursor disturbance.
 *  - "classic" (Retro 2D Classic): The nostalgic, retro 2D monospace falling Katakana/English digital rain.
 */

export class MatrixRain {
  constructor(canvasId, color = "#00FF00", style = "hd") {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this._animId = null
    this.lastDrawTime = 0
    this.time = 0

    this._color = color || "#00FF00"
    this.style = style || "hd"
    this._palette = this._computePalette(this._color)

    // HD Character Set: Half-width Katakana, Numbers, Operators, Latin Ciphers
    this.charSetHD =
      "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789Z:・.\"=*+-<>¦｜λξψ"

    // Classic Character Set
    this.charSetClassic =
      "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

    // HD Engine structures
    this.streams = []

    // Classic Engine structures
    this.columns = []
    this.classicFontSize = 16
    this.classicFps = 25
    this.classicFpsInterval = 1000 / this.classicFps

    // Mouse Tracking (gentle hover disturbance)
    this.mouse = {
      x: null,
      y: null,
      radius: 140,
    }

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseOutHandler = () => this._onMouseOut()

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
  }

  // ── Style & Color Management ───────────────────────────────────────────────

  setStyle(style) {
    this.style = style || "hd"
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.active) {
      if (this.style === "classic") {
        this.initClassicColumns()
      } else {
        this.initStreams()
      }
    }
  }

  get color() {
    return this._color
  }

  set color(val) {
    this.updateColor(val)
  }

  updateColor(hex) {
    if (!hex) return
    this._color = hex
    this._palette = this._computePalette(hex)
  }

  _computePalette(hex) {
    const rgb = this.hexToRgb(hex)
    return {
      primary: rgb,
      primaryStr: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
      // Pure brilliant white-hot head with subtle tint
      head: {
        r: Math.min(255, rgb.r + 200),
        g: Math.min(255, rgb.g + 200),
        b: Math.min(255, rgb.b + 200),
      },
      // Vibrant body glow
      glow: {
        r: Math.min(255, Math.round(rgb.r * 1.2)),
        g: Math.min(255, Math.round(rgb.g * 1.2)),
        b: Math.min(255, Math.round(rgb.b * 1.2)),
      },
      // Deep trailing tail tone
      tail: {
        r: Math.max(0, Math.round(rgb.r * 0.45)),
        g: Math.max(0, Math.round(rgb.g * 0.45)),
        b: Math.max(0, Math.round(rgb.b * 0.45)),
      },
    }
  }

  hexToRgb(hex) {
    if (!hex) return { r: 0, g: 255, b: 0 }
    let cleaned = hex.replace("#", "").trim()
    if (cleaned.length === 3) {
      cleaned = cleaned.split("").map((c) => c + c).join("")
    }
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleaned)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 255, b: 0 }
  }

  // ── Sizing & Initialization ────────────────────────────────────────────────

  resize() {
    if (!this.canvas) return
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    if (this.active) {
      if (this.style === "classic") {
        this.initClassicColumns()
      } else {
        this.initStreams()
      }
    }
  }

  // ── Classic Mode Initialization ────────────────────────────────────────────

  initClassicColumns() {
    const columnsCount = Math.ceil(this.canvas.width / this.classicFontSize)
    this.columns = []
    for (let i = 0; i < columnsCount; i++) {
      this.columns[i] = Math.random() * -100
    }
  }

  // ── HD Mode Initialization ─────────────────────────────────────────────────

  initStreams() {
    this.streams = []
    const W = this.canvas.width
    const H = this.canvas.height

    const baseSpacing = 16
    const totalColumns = Math.ceil(W / baseSpacing)

    for (let c = 0; c < totalColumns; c++) {
      const count = Math.random() < 0.4 ? 2 : 1
      for (let k = 0; k < count; k++) {
        const depth = Math.random()
        this.streams.push(this.createStream(c * baseSpacing, depth, true))
      }
    }
  }

  createStream(x, depth, scattered = false) {
    const H = this.canvas.height
    const fontSize = Math.round(11 + depth * 7)
    const length = Math.floor(12 + depth * 22 + Math.random() * 10)
    const speed = (2.2 + depth * 4.8 + Math.random() * 1.5) * (fontSize / 15)

    const chars = []
    for (let i = 0; i < length; i++) {
      chars.push(this.getRandomCharHD())
    }

    const startY = scattered
      ? Math.random() * H * 1.5 - H * 0.5
      : -length * fontSize - Math.random() * 300

    return {
      x: x + (Math.random() - 0.5) * 4,
      y: startY,
      z: depth,
      fontSize: fontSize,
      length: length,
      speed: speed,
      chars: chars,
      mutationRate: 0.04 + Math.random() * 0.08,
      leadChar: this.getRandomCharHD(),
      leadChangeTimer: 0,
      alphaMultiplier: 0.45 + depth * 0.55,
      flicker: Math.random() * Math.PI * 2,
    }
  }

  getRandomCharHD() {
    return this.charSetHD.charAt(Math.floor(Math.random() * this.charSetHD.length))
  }

  getRandomCharClassic() {
    return this.charSetClassic.charAt(Math.floor(Math.random() * this.charSetClassic.length))
  }

  // ── Mouse Interaction ──────────────────────────────────────────────────────

  _onMouseMove(e) {
    if (!this.active) return
    this.mouse.x = e.clientX
    this.mouse.y = e.clientY
  }

  _onMouseOut() {
    this.mouse.x = null
    this.mouse.y = null
  }

  // ── Lifecycle Methods ──────────────────────────────────────────────────────

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()

    if (this.style === "classic") {
      this.initClassicColumns()
    } else {
      this.initStreams()
    }

    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseout", this._mouseOutHandler, { passive: true })

    this.canvas.style.display = "block"
    this.animate(performance.now())
  }

  stop() {
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    this.active = false
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseout", this._mouseOutHandler)

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.canvas.style.display = "none"
    }
    this.streams = []
    this.columns = []
    this.mouse.x = null
    this.mouse.y = null
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
  }

  // ── Main Render Loop ───────────────────────────────────────────────────────

  animate(currentTime = 0) {
    if (!this.active) return

    this._animId = requestAnimationFrame((t) => this.animate(t))
    if (document.visibilityState === "hidden") return

    if (this.style === "classic") {
      this._renderClassic(currentTime)
    } else {
      this._renderHD(currentTime)
    }
  }

  // ── Render Classic Retro 2D Mode ───────────────────────────────────────────

  _renderClassic(currentTime) {
    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.classicFpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.classicFpsInterval)

    // 1. Trail Fade
    this.ctx.globalCompositeOperation = "destination-out"
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.10)"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // 2. Render Text
    this.ctx.globalCompositeOperation = "source-over"
    this.ctx.fillStyle = this._color
    this.ctx.font = `${this.classicFontSize}px monospace`
    this.ctx.textAlign = "start"
    this.ctx.textBaseline = "alphabetic"

    const H = this.canvas.height
    for (let i = 0; i < this.columns.length; i++) {
      const text = this.getRandomCharClassic()
      const x = i * this.classicFontSize
      const y = this.columns[i] * this.classicFontSize

      this.ctx.fillText(text, x, y)

      if (y > H && Math.random() > 0.975) {
        this.columns[i] = 0
      }

      this.columns[i]++
    }
  }

  // ── Render Ultra HD Mode ───────────────────────────────────────────────────

  _renderHD(currentTime) {
    const elapsed = currentTime - this.lastDrawTime
    const deltaTime = Math.min(elapsed / (1000 / 60), 3.0)
    this.lastDrawTime = currentTime

    const W = this.canvas.width
    const H = this.canvas.height
    this.ctx.clearRect(0, 0, W, H)
    this.ctx.globalCompositeOperation = "source-over"
    this.time += 0.025 * deltaTime

    const p = this._palette

    // Sort Streams by Depth Z for correct optical layering
    this.streams.sort((a, b) => a.z - b.z)

    // Render Matrix Code Streams
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "middle"

    const streamCount = this.streams.length
    for (let i = 0; i < streamCount; i++) {
      const s = this.streams[i]

      // Update vertical drop position
      s.y += s.speed * deltaTime

      // Fast head character morphing
      s.leadChangeTimer += deltaTime
      if (s.leadChangeTimer > 2) {
        s.leadChar = this.getRandomCharHD()
        s.leadChangeTimer = 0
      }

      // Suspended glyph mutation (characters flicker & decrypt in-flight)
      if (Math.random() < s.mutationRate * deltaTime) {
        const mutateIdx = Math.floor(Math.random() * s.chars.length)
        s.chars[mutateIdx] = this.getRandomCharHD()
      }

      // Check distance to mouse for interactive decryption disturbance
      let mouseDistFactor = 0
      if (this.mouse.x !== null) {
        const mdx = s.x - this.mouse.x
        const mdy = s.y - this.mouse.y
        const mDist = Math.hypot(mdx, mdy)
        if (mDist < this.mouse.radius) {
          mouseDistFactor = 1 - mDist / this.mouse.radius
        }
      }

      this.ctx.font = `bold ${s.fontSize}px "Courier New", monospace`

      // Render Glyphs from Head to Tail
      const len = s.chars.length
      for (let j = 0; j < len; j++) {
        const charY = s.y - j * s.fontSize
        if (charY < -s.fontSize || charY > H + s.fontSize) continue

        const glyph = j === 0 ? s.leadChar : s.chars[j]
        const tailRatio = j / len

        if (j === 0) {
          // Iconic Glowing Head Glyph
          const headAlpha = Math.min(1.0, s.alphaMultiplier + 0.2 + mouseDistFactor * 0.3)

          if (s.z > 0.4) {
            this.ctx.fillStyle = `rgba(${p.glow.r}, ${p.glow.g}, ${p.glow.b}, ${headAlpha * 0.4})`
            this.ctx.fillText(glyph, s.x, charY)
          }

          this.ctx.fillStyle = `rgba(${p.head.r}, ${p.head.g}, ${p.head.b}, ${headAlpha})`
          this.ctx.fillText(glyph, s.x, charY)
        } else if (j <= 2) {
          // Radiant Sub-Head Glyphs
          const subAlpha = Math.min(1.0, (1 - tailRatio * 0.3) * s.alphaMultiplier + mouseDistFactor * 0.3)
          this.ctx.fillStyle = `rgba(${p.glow.r}, ${p.glow.g}, ${p.glow.b}, ${subAlpha})`
          this.ctx.fillText(glyph, s.x, charY)
        } else {
          // Trailing Decay Glyphs
          const fade = Math.pow(1 - tailRatio, 1.4)
          const charAlpha = Math.min(1.0, (fade * s.alphaMultiplier + mouseDistFactor * 0.5))

          if (charAlpha > 0.02) {
            const r = Math.round(p.primary.r * fade + p.tail.r * (1 - fade))
            const g = Math.round(p.primary.g * fade + p.tail.g * (1 - fade))
            const b = Math.round(p.primary.b * fade + p.tail.b * (1 - fade))

            this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${charAlpha})`
            this.ctx.fillText(glyph, s.x, charY)
          }
        }
      }

      // Recycle stream when offscreen
      if (s.y - s.length * s.fontSize > H + 50) {
        const fresh = this.createStream(s.x, s.z, false)
        Object.assign(s, fresh)
      }
    }
  }
}
