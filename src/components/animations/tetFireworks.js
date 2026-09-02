/**
 * TetFireworksEffect — Hollywood AAA Ultra HD Grand Festive Fireworks Display
 *
 * Masterpiece Pyrotechnic Simulation:
 *  - Procedural Web Audio API Synthesizer: Launch whistles, deep detonation thumps, crossette crackles & sizzling sparklers.
 *  - Up to 6 Custom Text/Name Fireworks: Cycles through 6 customizable text lines forming glowing glyphs in the sky.
 *  - Interactive Handheld Sizzling Sparkler (Vệt Pháo Xèo Tết): Press and hold cursor/touch to emit continuous golden/neon crackling sparks, smoke wisps & sizzling sound.
 *  - High-Definition Rocket Ascent: Ballistic physics, exhaust flame jets, and flaming spark shedding.
 *  - 10+ Iconic Firework Shell Varieties.
 *  - Delta-time normalized for 60Hz - 240Hz displays with High-DPI Retina sharpness.
 */

const TET_PALETTES = [
  // 1. Imperial Gold & Royal Ruby (Tết Hoàng Gia)
  {
    primary: { r: 255, g: 215, b: 0 },    // Gold
    secondary: { r: 255, g: 32, b: 32 },   // Ruby Red
    accent: { r: 255, g: 255, b: 240 },
    name: "gold_ruby",
  },
  // 2. Jade Dragon (Ngọc Lục Bảo & Hoàng Kim)
  {
    primary: { r: 0, g: 245, b: 140 },    // Jade Emerald
    secondary: { r: 255, g: 190, b: 11 },  // Amber Gold
    accent: { r: 220, g: 255, b: 245 },
    name: "jade_gold",
  },
  // 3. Peach Blossom Sunset (Hoa Đào & Tím Hoàng Hôn)
  {
    primary: { r: 255, g: 60, b: 140 },   // Peach Blossom Pink
    secondary: { r: 181, g: 55, b: 242 },  // Electric Orchid
    accent: { r: 255, g: 230, b: 245 },
    name: "peach_orchid",
  },
  // 4. Cyan Strobe & Lucky Crimson (Thanh Lam & Chu Sa)
  {
    primary: { r: 0, g: 240, b: 255 },    // Electric Cyan
    secondary: { r: 255, g: 45, b: 0 },    // Vermilion Crimson
    accent: { r: 255, g: 255, b: 255 },
    name: "cyan_crimson",
  },
  // 5. Brocade Crown (Vương Miện Gấm Vàng Tinh Khiết)
  {
    primary: { r: 255, g: 225, b: 120 },  // Sparkling Champagne Gold
    secondary: { r: 255, g: 165, b: 0 },   // Deep Golden Orange
    accent: { r: 255, g: 255, b: 255 },
    name: "brocade_crown",
  },
]

// ── Procedural Web Audio API Pyrotechnic Sound Synthesizer ─────────────────
class PyrotechnicAudioEngine {
  constructor() {
    this.ctx = null
    this.enabled = false
    this.masterGain = null
    this._sparklerSoundTimer = 0
    this._noiseBuffer = null
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {})
      }
      return
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    try {
      this.ctx = new AudioCtx()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.setValueAtTime(0.65, this.ctx.currentTime)
      this.masterGain.connect(this.ctx.destination)

      // Pre-create reusable white noise buffer (2 seconds)
      const bufferSize = this.ctx.sampleRate * 2
      this._noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const data = this._noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }

      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {})
      }
    } catch (e) {
      console.warn("AudioContext init prevented:", e)
    }
  }

  unlock() {
    if (!this.ctx) this.init()
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {})
    }
  }

  ensureReady() {
    if (!this.enabled) return false
    if (!this.ctx) this.init()
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {})
    }
    return Boolean(this.ctx && this.masterGain)
  }

  playLaunch() {
    if (!this.ensureReady()) return
    const t = this.ctx.currentTime

    // 1. Rising whistling rocket tone (Sine sweep 320Hz -> 920Hz)
    const osc = this.ctx.createOscillator()
    const oscGain = this.ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(280 + Math.random() * 50, t)
    osc.frequency.exponentialRampToValueAtTime(880 + Math.random() * 180, t + 0.55)

    oscGain.gain.setValueAtTime(0.01, t)
    oscGain.gain.linearRampToValueAtTime(0.22, t + 0.12)
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)

    osc.connect(oscGain)
    oscGain.connect(this.masterGain)
    osc.start(t)
    osc.stop(t + 0.62)

    // 2. Hissing rocket thrust noise
    if (this._noiseBuffer) {
      const noise = this.ctx.createBufferSource()
      noise.buffer = this._noiseBuffer
      noise.loop = true

      const filter = this.ctx.createBiquadFilter()
      filter.type = "bandpass"
      filter.frequency.setValueAtTime(1600, t)
      filter.Q.setValueAtTime(2.5, t)

      const noiseGain = this.ctx.createGain()
      noiseGain.gain.setValueAtTime(0.01, t)
      noiseGain.gain.linearRampToValueAtTime(0.18, t + 0.08)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)

      noise.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(this.masterGain)
      noise.start(t)
      noise.stop(t + 0.52)
    }
  }

  playDetonation(isBig = false) {
    if (!this.ensureReady()) return
    const t = this.ctx.currentTime

    // 1. Sub-Bass Punch (150Hz -> 28Hz)
    const osc = this.ctx.createOscillator()
    const oscGain = this.ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(isBig ? 150 : 125, t)
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.45)

    oscGain.gain.setValueAtTime(isBig ? 0.65 : 0.48, t)
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75)

    osc.connect(oscGain)
    oscGain.connect(this.masterGain)
    osc.start(t)
    osc.stop(t + 0.78)

    // 2. Explosion Transient Noise Blast
    if (this._noiseBuffer) {
      const noise = this.ctx.createBufferSource()
      noise.buffer = this._noiseBuffer

      const filter = this.ctx.createBiquadFilter()
      filter.type = "lowpass"
      filter.frequency.setValueAtTime(1200, t)
      filter.frequency.exponentialRampToValueAtTime(140, t + 0.65)

      const noiseGain = this.ctx.createGain()
      noiseGain.gain.setValueAtTime(isBig ? 0.6 : 0.45, t)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7)

      noise.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(this.masterGain)
      noise.start(t)
      noise.stop(t + 0.72)
    }
  }

  playCrackles() {
    if (!this.ensureReady()) return
    const t = this.ctx.currentTime
    const count = 3 + Math.floor(Math.random() * 4)

    for (let i = 0; i < count; i++) {
      const delay = t + i * 0.035 + Math.random() * 0.02
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      osc.type = "triangle"
      osc.frequency.setValueAtTime(1400 + Math.random() * 900, delay)

      g.gain.setValueAtTime(0.12, delay)
      g.gain.exponentialRampToValueAtTime(0.001, delay + 0.045)

      osc.connect(g)
      g.connect(this.masterGain)
      osc.start(delay)
      osc.stop(delay + 0.05)
    }
  }

  playSparklerSizzle() {
    if (!this.ensureReady()) return
    const now = performance.now()
    if (now - this._sparklerSoundTimer < 60) return
    this._sparklerSoundTimer = now

    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = "square"
    osc.frequency.setValueAtTime(2200 + Math.random() * 2600, t)

    g.gain.setValueAtTime(0.06, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04)

    osc.connect(g)
    g.connect(this.masterGain)
    osc.start(t)
    osc.stop(t + 0.045)
  }
}

// ── Sizzling Sparkler Spark (Pháo Xèo Cầm Tay khi đè chuột) ────────────────
class SizzlingSparklerParticle {
  constructor(x, y, vx, vy, palette) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.palette = palette || TET_PALETTES[0]

    this.color = Math.random() < 0.65 ? this.palette.primary : this.palette.secondary
    this.alpha = 1.0
    this.decay = Math.random() * 0.035 + 0.025
    this.gravity = 0.09
    this.drag = 0.94
    this.size = Math.random() * 2.2 + 1.2

    this.trail = []
    this.maxTrail = 6
    this.canMicroPop = Math.random() < 0.25
    this.age = 0
  }

  update(dt) {
    this.age += 0.016 * dt
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > this.maxTrail) this.trail.shift()

    this.vx *= Math.pow(this.drag, dt)
    this.vy *= Math.pow(this.drag, dt)
    this.vy += this.gravity * dt

    this.x += this.vx * dt
    this.y += this.vy * dt
    this.alpha -= this.decay * dt

    return this.alpha <= 0
  }

  draw(ctx) {
    if (this.alpha <= 0.01) return
    const rgb = this.color
    ctx.save()

    if (this.trail.length > 1) {
      ctx.beginPath()
      ctx.moveTo(this.trail[0].x, this.trail[0].y)
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y)
      }
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(this.alpha * 0.55).toFixed(3)})`
      ctx.lineWidth = this.size * 0.8
      ctx.lineCap = "round"
      ctx.stroke()
    }

    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.alpha.toFixed(3)})`
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()

    if (this.alpha > 0.4) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(this.alpha * 0.95).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.size * 0.45, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
}

// ── Exhaust Plume Particle Shed from Rocket Tail ────────────────────────────
class RocketEmber {
  constructor(x, y, vx, vy, colorRgb) {
    this.x = x
    this.y = y
    this.vx = vx + (Math.random() - 0.5) * 1.5
    this.vy = vy + Math.random() * 2.5 + 1.0
    this.color = colorRgb
    this.alpha = 1.0
    this.decay = Math.random() * 0.04 + 0.03
    this.size = Math.random() * 2.0 + 1.0
  }

  update(dt) {
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.vx *= 0.95
    this.vy *= 0.95
    this.alpha -= this.decay * dt
    return this.alpha <= 0
  }

  draw(ctx) {
    if (this.alpha <= 0.01) return
    const rgb = this.color
    ctx.save()
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(this.alpha * 0.75).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

// ── Ascending Mortar Rocket with Fiery Plume & Exhaust Shedding ───────────────
class RocketShell {
  constructor(startX, startY, targetX, targetY, palette, type = "chrysanthemum", isInteractive = false, customText = "") {
    this.x = startX
    this.y = startY
    this.targetX = targetX
    this.targetY = targetY
    this.palette = palette || TET_PALETTES[Math.floor(Math.random() * TET_PALETTES.length)]
    this.type = type
    this.isInteractive = isInteractive
    this.customText = customText

    const dx = targetX - startX
    const dy = targetY - startY
    this.distance = Math.hypot(dx, dy)
    this.angle = Math.atan2(dy, dx)

    const baseSpeed = isInteractive ? 14 : Math.random() * 4 + 11.5
    this.speed = baseSpeed
    this.vx = Math.cos(this.angle) * this.speed
    this.vy = Math.sin(this.angle) * this.speed

    this.trail = []
    this.maxTrail = 12
    this.embers = []
    this.exploded = false
    this.wobblePhase = Math.random() * Math.PI * 2
  }

  update(dt) {
    this.wobblePhase += 0.3 * dt
    const wobble = Math.sin(this.wobblePhase) * 0.4

    this.trail.push({ x: this.x, y: this.y, alpha: 1.0 })
    if (this.trail.length > this.maxTrail) this.trail.shift()

    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha -= 0.075 * dt
    }

    if (Math.random() < 0.85) {
      this.embers.push(
        new RocketEmber(
          this.x,
          this.y,
          -this.vx * 0.25,
          -this.vy * 0.25,
          this.palette.secondary || { r: 255, g: 140, b: 0 }
        )
      )
    }

    for (let i = this.embers.length - 1; i >= 0; i--) {
      if (this.embers[i].update(dt)) {
        this.embers.splice(i, 1)
      }
    }

    this.x += (this.vx + wobble) * dt
    this.y += this.vy * dt
    this.speed *= Math.pow(0.984, dt)
    this.vx = Math.cos(this.angle) * this.speed
    this.vy = Math.sin(this.angle) * this.speed

    const distToTarget = Math.hypot(this.targetX - this.x, this.targetY - this.y)
    if (distToTarget < 16 || this.y <= this.targetY || this.speed < 1.4) {
      this.exploded = true
    }
  }

  draw(ctx) {
    const rgb = this.palette.primary

    for (let i = 0; i < this.embers.length; i++) {
      this.embers[i].draw(ctx)
    }

    ctx.save()

    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const p1 = this.trail[i - 1]
        const p2 = this.trail[i]
        const progress = i / this.trail.length
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(progress * 0.75).toFixed(3)})`
        ctx.lineWidth = 1.2 + progress * 2.8
        ctx.lineCap = "round"
        ctx.stroke()
      }
    }

    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.55)`
    ctx.beginPath()
    ctx.arc(this.x, this.y, 6.0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(this.x, this.y, 2.6, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}

// ── 3D Ballistic Pyrotechnic Spark ──────────────────────────────────────────
class FireworkSpark3D {
  constructor(x, y, vx, vy, vz, colorRgb, options = {}) {
    this.x = x
    this.y = y
    this.z = options.z || 1.0

    this.vx = vx
    this.vy = vy
    this.vz = vz || 0

    this.color = colorRgb
    this.alpha = 1.0
    this.decay = options.decay || Math.random() * 0.015 + 0.012
    this.gravity = options.gravity !== undefined ? options.gravity : 0.065
    this.drag = options.drag || 0.965
    this.size = (options.size || Math.random() * 1.8 + 1.2) * (0.6 + 0.4 * this.z)

    this.trail = []
    this.maxTrail = options.maxTrail || 6
    this.isStrobe = options.isStrobe || false
    this.strobeSpeed = Math.random() * 20 + 10
    this.strobePhase = Math.random() * Math.PI * 2

    this.canSplit = options.canSplit || false
    this.splitTime = options.splitTime || 0
    this.age = 0

    this.targetX = options.targetX ?? null
    this.targetY = options.targetY ?? null
    this.isTextParticle = options.isTextParticle || false
  }

  update(dt) {
    this.age += 0.016 * dt
    this.strobePhase += this.strobeSpeed * 0.05 * dt

    this.trail.push({ x: this.x, y: this.y, alpha: this.alpha })
    if (this.trail.length > this.maxTrail) this.trail.shift()

    if (this.isTextParticle && this.targetX !== null && this.targetY !== null) {
      const dx = this.targetX - this.x
      const dy = this.targetY - this.y
      this.vx += dx * 0.08 * dt
      this.vy += dy * 0.08 * dt
      this.vx *= 0.85
      this.vy *= 0.85
      this.x += this.vx * dt
      this.y += this.vy * dt

      this.alpha -= (this.decay * 0.5) * dt
    } else {
      const currentDrag = Math.pow(this.drag, dt)
      this.vx *= currentDrag
      this.vy *= currentDrag
      this.vz *= currentDrag
      this.vy += this.gravity * dt

      this.x += this.vx * dt
      this.y += this.vy * dt
      this.alpha -= this.decay * dt
    }

    return this.alpha <= 0
  }

  draw(ctx) {
    if (this.alpha <= 0.01) return

    const rgb = this.color
    let finalAlpha = this.alpha

    if (this.isStrobe) {
      const strobeVal = Math.sin(this.strobePhase)
      if (strobeVal < -0.2) return
      finalAlpha *= Math.max(0.2, strobeVal)
    }

    ctx.save()

    if (this.trail.length > 1) {
      ctx.beginPath()
      ctx.moveTo(this.trail[0].x, this.trail[0].y)
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y)
      }
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(finalAlpha * 0.45).toFixed(3)})`
      ctx.lineWidth = Math.max(0.6, this.size * 0.75)
      ctx.lineCap = "round"
      ctx.stroke()
    }

    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${finalAlpha.toFixed(3)})`
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()

    if (finalAlpha > 0.35) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(finalAlpha * 0.88).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.size * 0.45, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
}

// ── Atmospheric Detonation Flash ─────────────────────────────────────────────
class DetonationFlash {
  constructor(x, y, colorRgb, radius = 115) {
    this.x = x
    this.y = y
    this.color = colorRgb
    this.radius = radius
    this.alpha = 0.85
    this.decay = 0.085
  }

  update(dt) {
    this.alpha -= this.decay * dt
    return this.alpha <= 0
  }

  draw(ctx) {
    if (this.alpha <= 0.01) return
    const rgb = this.color
    ctx.save()

    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius)
    grad.addColorStop(0, `rgba(255, 255, 255, ${(this.alpha * 0.95).toFixed(3)})`)
    grad.addColorStop(0.25, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(this.alpha * 0.55).toFixed(3)})`)
    grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}

// ── Main TetFireworksEffect Class ─────────────────────────────────────────────
export class TetFireworksEffect {
  constructor(canvasId, options = {}) {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.animationId = null

    // Up to 6 custom texts
    this.customTexts = this._parseCustomTexts(options)
    this.textCycleIndex = 0
    this.preferredType = options.type || "all"

    // Sound engine
    this.audio = new PyrotechnicAudioEngine()
    this.audio.enabled = options.soundEnabled ?? false

    // Collections
    this.rockets = []
    this.sparks = []
    this.flashes = []
    this.sparklers = []

    // Mouse holding state for continuous Sizzling Sparkler (Pháo Xèo)
    this.isPointerDown = false
    this.pointerX = -9999
    this.pointerY = -9999
    this.pointerDownTime = 0
    this.sparklerPaletteIndex = 0

    // Timing
    this.time = 0
    this.lastTime = performance.now()
    this.launchTimer = 0
    this.nextLaunchInterval = 0.8

    // Screen & DPI
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)

    // Offscreen canvas for text sampling
    this._offscreenCanvas = document.createElement("canvas")
    this._offscreenCtx = this._offscreenCanvas.getContext("2d", { willReadFrequently: true })

    // Event Handlers
    this._resizeHandler = () => this.resize()
    this._pointerDownHandler = (e) => this._onPointerDown(e)
    this._pointerMoveHandler = (e) => this._onPointerMove(e)
    this._pointerUpHandler = (e) => this._onPointerUp(e)
    this._visibilityHandler = () => this._onVisibilityChange()
    this._unlockAudioHandler = () => this.audio.unlock()

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("pointerdown", this._pointerDownHandler)
    window.addEventListener("pointermove", this._pointerMoveHandler, { passive: true })
    window.addEventListener("pointerup", this._pointerUpHandler)
    window.addEventListener("pointercancel", this._pointerUpHandler)
    document.addEventListener("visibilitychange", this._visibilityHandler)

    // Global document unlock gesture for audio
    document.addEventListener("click", this._unlockAudioHandler, { passive: true })
    document.addEventListener("keydown", this._unlockAudioHandler, { passive: true })
  }

  _parseCustomTexts(options = {}) {
    const list = []
    for (let i = 1; i <= 6; i++) {
      const val = options[`text${i}`]
      if (val !== undefined && String(val).trim()) {
        list.push(String(val).trim())
      }
    }

    if (list.length === 0) {
      if (options.customText) {
        const parts = String(options.customText)
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
        if (parts.length > 0) return parts.slice(0, 6)
      }
      return ["Chúc Mừng", "Năm Mới", "Vạn Sự", "Như Ý", "An Khang", "Thịnh Vượng"]
    }
    return list.slice(0, 6)
  }

  setOptions(options = {}) {
    if (
      options.text1 !== undefined ||
      options.text2 !== undefined ||
      options.text3 !== undefined ||
      options.text4 !== undefined ||
      options.text5 !== undefined ||
      options.text6 !== undefined ||
      options.customText !== undefined
    ) {
      this.customTexts = this._parseCustomTexts(options)
    }
    if (options.type !== undefined) this.preferredType = options.type
    if (options.soundEnabled !== undefined) {
      this.audio.enabled = Boolean(options.soundEnabled)
      if (this.audio.enabled) {
        this.audio.init()
        this.audio.unlock()
      }
    }
  }

  getNextCustomText() {
    if (!this.customTexts || this.customTexts.length === 0) {
      return "Chúc Mừng Năm Mới"
    }
    const text = this.customTexts[this.textCycleIndex % this.customTexts.length]
    this.textCycleIndex++
    return text
  }

  resize() {
    if (!this.canvas) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = Math.round(this.width * this.dpr)
    this.canvas.height = Math.round(this.height * this.dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.canvas.style.pointerEvents = "none"

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.ctx.scale(this.dpr, this.dpr)
    }
  }

  _getRandomShellType() {
    if (this.preferredType && this.preferredType !== "all") {
      return this.preferredType
    }
    const allTypes = [
      "chrysanthemum",
      "brocade_crown",
      "peony",
      "heart",
      "palm",
      "saturn",
      "galaxy",
      "crossette",
      "willow",
      "ring",
      "text",
    ]
    return allTypes[Math.floor(Math.random() * allTypes.length)]
  }

  _onPointerDown(e) {
    if (!this.active) return
    this.isPointerDown = true
    this.pointerX = e.clientX
    this.pointerY = e.clientY
    this.pointerDownTime = performance.now()
    this.sparklerPaletteIndex = Math.floor(Math.random() * TET_PALETTES.length)

    this.audio.unlock()
    this._emitSparklerBurst(this.pointerX, this.pointerY, 12)
    this.audio.playSparklerSizzle()
  }

  _onPointerMove(e) {
    if (!this.active) return
    this.pointerX = e.clientX
    this.pointerY = e.clientY
  }

  _onPointerUp(e) {
    if (!this.active) return
    const holdDuration = performance.now() - this.pointerDownTime
    this.isPointerDown = false

    if (holdDuration < 240) {
      const targetX = e.clientX || this.pointerX
      const targetY = e.clientY || this.pointerY
      const startX = this.width * (0.35 + Math.random() * 0.3)
      const startY = this.height + 15
      const palette = TET_PALETTES[Math.floor(Math.random() * TET_PALETTES.length)]
      const type = this._getRandomShellType()
      const textToUse = type === "text" ? this.getNextCustomText() : ""

      this.rockets.push(
        new RocketShell(startX, startY, targetX, targetY, palette, type, true, textToUse)
      )
      this.audio.playLaunch()
    }
  }

  _emitSparklerBurst(x, y, count = 8) {
    const palette = TET_PALETTES[this.sparklerPaletteIndex % TET_PALETTES.length]
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 5.0 + 1.5
      const vx = Math.cos(angle) * speed
      const vy = Math.sin(angle) * speed - 0.8
      this.sparklers.push(new SizzlingSparklerParticle(x, y, vx, vy, palette))
    }
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.lastTime = performance.now()
    }
  }

  launchRandomFirework() {
    const startX = this.width * (0.15 + Math.random() * 0.7)
    const targetX = startX + (Math.random() - 0.5) * (this.width * 0.25)
    const targetY = this.height * (0.12 + Math.random() * 0.38)
    const palette = TET_PALETTES[Math.floor(Math.random() * TET_PALETTES.length)]
    const type = this._getRandomShellType()
    const textToUse = type === "text" ? this.getNextCustomText() : ""

    this.rockets.push(
      new RocketShell(startX, this.height + 10, targetX, targetY, palette, type, false, textToUse)
    )
    this.audio.playLaunch()
  }

  _sampleTextPoints(text, targetW = 600) {
    if (!text) text = "Chúc Mừng Năm Mới"
    const oc = this._offscreenCanvas
    const octx = this._offscreenCtx

    oc.width = Math.min(1200, Math.max(300, targetW))
    oc.height = 140

    octx.clearRect(0, 0, oc.width, oc.height)
    octx.fillStyle = "#ffffff"
    octx.textAlign = "center"
    octx.textBaseline = "middle"

    const fontSize = Math.max(28, Math.min(64, Math.floor(oc.width / (text.length * 0.75))))
    octx.font = `bold ${fontSize}px "Segoe UI", Roboto, sans-serif`
    octx.fillText(text, oc.width / 2, oc.height / 2)

    const imgData = octx.getImageData(0, 0, oc.width, oc.height)
    const pixels = imgData.data
    const points = []
    const step = oc.width > 700 ? 6 : 5

    for (let y = 0; y < oc.height; y += step) {
      for (let x = 0; x < oc.width; x += step) {
        const idx = (y * oc.width + x) * 4
        if (pixels[idx + 3] > 128) {
          points.push({
            offsetX: x - oc.width / 2,
            offsetY: y - oc.height / 2,
          })
        }
      }
    }

    return points
  }

  detonate(rocket) {
    const x = rocket.x
    const y = rocket.y
    const palette = rocket.palette
    const type = rocket.type

    this.flashes.push(new DetonationFlash(x, y, palette.primary, 115))
    this.audio.playDetonation(type === "brocade_crown" || type === "text")

    switch (type) {
      case "text": {
        const textToDisplay = rocket.customText || this.getNextCustomText()
        const maxTextWidth = Math.min(this.width * 0.85, 750)
        const points = this._sampleTextPoints(textToDisplay, maxTextWidth)

        for (let i = 0; i < points.length; i++) {
          const pt = points[i]
          const targetX = x + pt.offsetX
          const targetY = y + pt.offsetY

          const angle = Math.random() * Math.PI * 2
          const initialSpeed = Math.random() * 4.5 + 2.0
          const vx = Math.cos(angle) * initialSpeed
          const vy = Math.sin(angle) * initialSpeed
          const color = Math.random() < 0.7 ? palette.primary : palette.secondary

          this.sparks.push(
            new FireworkSpark3D(x, y, vx, vy, 0, color, {
              targetX,
              targetY,
              isTextParticle: true,
              decay: 0.007 + Math.random() * 0.004,
              size: 2.2,
              maxTrail: 3,
              isStrobe: Math.random() < 0.25,
            })
          )
        }
        break
      }

      case "heart": {
        const count = 95
        for (let i = 0; i < count; i++) {
          const t = (i / count) * Math.PI * 2
          const hx = 16 * Math.pow(Math.sin(t), 3)
          const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
          const speed = 0.38
          const vx = hx * speed + (Math.random() - 0.5) * 0.4
          const vy = hy * speed + (Math.random() - 0.5) * 0.4
          const color = Math.random() < 0.8 ? { r: 255, g: 45, b: 110 } : { r: 255, g: 215, b: 230 }

          this.sparks.push(
            new FireworkSpark3D(x, y, vx, vy, 0, color, {
              decay: 0.012 + Math.random() * 0.006,
              gravity: 0.048,
              drag: 0.97,
              size: 2.4,
              maxTrail: 8,
              isStrobe: Math.random() < 0.3,
            })
          )
        }
        break
      }

      case "palm": {
        const frondCount = 12
        const starsPerFrond = 10
        for (let f = 0; f < frondCount; f++) {
          const frondAngle = (f / frondCount) * Math.PI * 2
          for (let s = 1; s <= starsPerFrond; s++) {
            const speed = (s / starsPerFrond) * 7.2 + 1.2
            const vx = Math.cos(frondAngle) * speed
            const vy = Math.sin(frondAngle) * speed - 1.2
            const color = s > starsPerFrond * 0.7 ? palette.secondary : palette.primary

            this.sparks.push(
              new FireworkSpark3D(x, y, vx, vy, 0, color, {
                decay: 0.010 + Math.random() * 0.005,
                gravity: 0.07,
                drag: 0.975,
                size: 2.2,
                maxTrail: 9,
              })
            )
          }
        }
        break
      }

      case "saturn": {
        const coreCount = 60
        for (let i = 0; i < coreCount; i++) {
          const phi = Math.acos(2 * Math.random() - 1)
          const theta = Math.random() * Math.PI * 2
          const speed = Math.random() * 2.2 + 2.5
          const vx = Math.sin(phi) * Math.cos(theta) * speed
          const vy = Math.sin(phi) * Math.sin(theta) * speed

          this.sparks.push(
            new FireworkSpark3D(x, y, vx, vy, 0, palette.secondary, {
              decay: 0.014,
              gravity: 0.05,
              drag: 0.965,
              size: 1.8,
              maxTrail: 5,
            })
          )
        }

        const ringCount = 80
        const ringTilt = 0.55
        for (let i = 0; i < ringCount; i++) {
          const angle = (i / ringCount) * Math.PI * 2
          const speed = 6.2 + Math.random() * 0.6
          const rx = Math.cos(angle) * speed
          const ry = Math.sin(angle) * speed * 0.35
          const vx = rx * Math.cos(ringTilt) - ry * Math.sin(ringTilt)
          const vy = rx * Math.sin(ringTilt) + ry * Math.cos(ringTilt)

          this.sparks.push(
            new FireworkSpark3D(x, y, vx, vy, 0, palette.primary, {
              decay: 0.012,
              gravity: 0.048,
              drag: 0.97,
              size: 2.2,
              maxTrail: 7,
              isStrobe: true,
            })
          )
        }
        break
      }

      case "galaxy": {
        const arms = 3
        const starsPerArm = 32
        for (let a = 0; a < arms; a++) {
          const baseArmAngle = (a / arms) * Math.PI * 2
          for (let s = 1; s <= starsPerArm; s++) {
            const t = s / starsPerArm
            const angle = baseArmAngle + t * 2.8
            const speed = t * 7.5 + 1.2
            const vx = Math.cos(angle) * speed
            const vy = Math.sin(angle) * speed
            const color = t < 0.5 ? palette.primary : palette.secondary

            this.sparks.push(
              new FireworkSpark3D(x, y, vx, vy, 0, color, {
                decay: 0.011 + Math.random() * 0.005,
                gravity: 0.045,
                drag: 0.972,
                size: 2.2,
                maxTrail: 8,
                isStrobe: Math.random() < 0.3,
              })
            )
          }
        }
        break
      }

      case "brocade_crown": {
        const starCount = 130
        for (let i = 0; i < starCount; i++) {
          const phi = Math.acos(2 * Math.random() - 1)
          const theta = Math.random() * Math.PI * 2
          const speed = Math.random() * 6.5 + 2.5
          const vx = Math.sin(phi) * Math.cos(theta) * speed
          const vy = Math.sin(phi) * Math.sin(theta) * speed
          const vz = Math.cos(phi) * speed
          const z = 0.6 + 0.4 * Math.sin(phi)

          this.sparks.push(
            new FireworkSpark3D(x, y, vx, vy, vz, palette.primary, {
              decay: 0.008 + Math.random() * 0.005,
              gravity: 0.045,
              drag: 0.975,
              size: 2.2,
              maxTrail: 10,
              isStrobe: Math.random() < 0.35,
              z,
            })
          )
        }
        break
      }

      case "peony": {
        const outerCount = 95
        for (let i = 0; i < outerCount; i++) {
          const phi = Math.acos(2 * Math.random() - 1)
          const theta = Math.random() * Math.PI * 2
          const speed = Math.random() * 2.0 + 6.0
          const vx = Math.sin(phi) * Math.cos(theta) * speed
          const vy = Math.sin(phi) * Math.sin(theta) * speed
          const z = 0.7 + 0.3 * Math.sin(phi)

          this.sparks.push(
            new FireworkSpark3D(x, y, vx, vy, 0, palette.primary, {
              decay: 0.014 + Math.random() * 0.008,
              gravity: 0.06,
              drag: 0.965,
              size: 2.0,
              maxTrail: 6,
              z,
            })
          )
        }

        const innerCount = 55
        for (let i = 0; i < innerCount; i++) {
          const phi = Math.acos(2 * Math.random() - 1)
          const theta = Math.random() * Math.PI * 2
          const speed = Math.random() * 1.5 + 3.2
          const vx = Math.sin(phi) * Math.cos(theta) * speed
          const vy = Math.sin(phi) * Math.sin(theta) * speed

          this.sparks.push(
            new FireworkSpark3D(x, y, vx, vy, 0, palette.secondary, {
              decay: 0.016 + Math.random() * 0.008,
              gravity: 0.05,
              drag: 0.96,
              size: 1.6,
              maxTrail: 5,
              isStrobe: true,
              z: 0.9,
            })
          )
        }
        break
      }

      case "crossette": {
        const count = 38
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.2
          const speed = Math.random() * 2.0 + 6.5
          const vx = Math.cos(angle) * speed
          const vy = Math.sin(angle) * speed

          this.sparks.push(
            new FireworkSpark3D(x, y, vx, vy, 0, palette.primary, {
              decay: 0.015,
              gravity: 0.055,
              drag: 0.97,
              size: 2.4,
              maxTrail: 8,
              canSplit: true,
              splitTime: 0.38 + Math.random() * 0.15,
              z: 1.0,
            })
          )
        }
        break
      }

      case "willow": {
        const count = 110
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = Math.random() * 5.5 + 1.5
          const vx = Math.cos(angle) * speed
          const vy = Math.sin(angle) * speed - 1.5

          this.sparks.push(
            new FireworkSpark3D(x, y, vx, vy, 0, palette.primary, {
              decay: 0.007 + Math.random() * 0.004,
              gravity: 0.075,
              drag: 0.98,
              size: 1.8,
              maxTrail: 12,
              z: 0.85,
            })
          )
        }
        break
      }

      case "ring": {
        const ringCount = 80
        const tilt = Math.random() * Math.PI
        for (let i = 0; i < ringCount; i++) {
          const angle = (i / ringCount) * Math.PI * 2
          const speed = 5.5 + Math.random() * 0.8
          let rx = Math.cos(angle) * speed
          let ry = Math.sin(angle) * speed * 0.45
          const vx = rx * Math.cos(tilt) - ry * Math.sin(tilt)
          const vy = rx * Math.sin(tilt) + ry * Math.cos(tilt)

          this.sparks.push(
            new FireworkSpark3D(x, y, vx, vy, 0, palette.primary, {
              decay: 0.013 + Math.random() * 0.005,
              gravity: 0.05,
              drag: 0.965,
              size: 2.0,
              maxTrail: 6,
              z: 1.0,
            })
          )
        }
        break
      }

      case "chrysanthemum":
      default: {
        const count = 115
        for (let i = 0; i < count; i++) {
          const phi = Math.acos(2 * Math.random() - 1)
          const theta = Math.random() * Math.PI * 2
          const speed = Math.pow(Math.random(), 0.6) * 7.5 + 2.0
          const vx = Math.sin(phi) * Math.cos(theta) * speed
          const vy = Math.sin(phi) * Math.sin(theta) * speed
          const vz = Math.cos(phi) * speed
          const color = Math.random() < 0.75 ? palette.primary : palette.secondary

          this.sparks.push(
            new FireworkSpark3D(x, y, vx, vy, vz, color, {
              decay: 0.012 + Math.random() * 0.01,
              gravity: 0.06,
              drag: 0.965,
              size: 2.0,
              maxTrail: 7,
              isStrobe: Math.random() < 0.25,
              z: 0.8 + 0.3 * Math.sin(phi),
            })
          )
        }
        break
      }
    }
  }

  // ── Render Loop ─────────────────────────────────────────────────────────────
  start() {
    if (this.active) return
    this.active = true
    this.lastTime = performance.now()
    this.time = 0
    this.launchTimer = 0
    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"

    if (this.audio.enabled) {
      this.audio.init()
    }

    this.resize()

    const animateLoop = (now) => {
      if (!this.active) return
      this.animationId = requestAnimationFrame(animateLoop)

      if (document.visibilityState === "hidden") {
        this.lastTime = now
        return
      }

      const elapsed = Math.min(now - this.lastTime, 100)
      this.lastTime = now
      const dt = Math.min(elapsed / 16.67, 3.0)
      this.time += 0.016 * dt

      this.update(dt)
      this.draw()
    }

    this.animationId = requestAnimationFrame(animateLoop)
  }

  stop() {
    this.active = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.canvas) {
      this.canvas.style.display = "none"
    }
    this.rockets = []
    this.sparks = []
    this.flashes = []
    this.sparklers = []
    this.isPointerDown = false
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("pointerdown", this._pointerDownHandler)
    window.removeEventListener("pointermove", this._pointerMoveHandler)
    window.removeEventListener("pointerup", this._pointerUpHandler)
    window.removeEventListener("pointercancel", this._pointerUpHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
    document.removeEventListener("click", this._unlockAudioHandler)
    document.removeEventListener("keydown", this._unlockAudioHandler)
  }

  update(dt) {
    // 1. Continuous Handheld Sparkler Stream (Pháo Xèo khi đè chuột)
    if (this.isPointerDown && this.pointerX > 0 && this.pointerY > 0) {
      this._emitSparklerBurst(this.pointerX, this.pointerY, Math.floor(6 * dt) + 3)
      this.audio.playSparklerSizzle()
    }

    // 2. Spontaneous Rhythmic Fireworks Salvos
    this.launchTimer += 0.016 * dt
    if (this.launchTimer >= this.nextLaunchInterval) {
      this.launchTimer = 0
      this.nextLaunchInterval = Math.random() * 1.1 + 0.6
      this.launchRandomFirework()

      if (Math.random() < 0.35) {
        setTimeout(() => {
          if (this.active) this.launchRandomFirework()
        }, 240)
      }
    }

    // 3. Update Rockets
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const rocket = this.rockets[i]
      rocket.update(dt)
      if (rocket.exploded) {
        this.detonate(rocket)
        this.rockets.splice(i, 1)
      }
    }

    // 4. Update Flashes
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      if (this.flashes[i].update(dt)) {
        this.flashes.splice(i, 1)
      }
    }

    // 5. Update Sizzling Sparkler Particles (Pháo Xèo)
    for (let i = this.sparklers.length - 1; i >= 0; i--) {
      if (this.sparklers[i].update(dt)) {
        this.sparklers.splice(i, 1)
      }
    }

    // 6. Update Sparks (with Crossette Splits)
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i]
      const isDead = s.update(dt)

      if (s.canSplit && s.age >= s.splitTime) {
        s.canSplit = false
        this.audio.playCrackles()
        for (let k = 0; k < 4; k++) {
          const crossAngle = (k * Math.PI) / 2 + Math.random() * 0.3
          const splitSpeed = Math.random() * 1.5 + 2.8
          this.sparks.push(
            new FireworkSpark3D(
              s.x,
              s.y,
              Math.cos(crossAngle) * splitSpeed,
              Math.sin(crossAngle) * splitSpeed,
              0,
              s.color,
              {
                decay: 0.022,
                gravity: 0.06,
                drag: 0.96,
                size: 1.6,
                maxTrail: 5,
                isStrobe: true,
                z: s.z,
              }
            )
          )
        }
      }

      if (isDead) {
        this.sparks.splice(i, 1)
      }
    }
  }

  draw() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height

    ctx.clearRect(0, 0, W, H)

    // 1. Draw Atmospheric Detonation Flashes
    for (let i = 0; i < this.flashes.length; i++) {
      this.flashes[i].draw(ctx)
    }

    // 2. Draw Ascending Rocket Mortars
    for (let i = 0; i < this.rockets.length; i++) {
      this.rockets[i].draw(ctx)
    }

    // 3. Draw Sizzling Sparkler Stream (Pháo Xèo theo chuột)
    for (let i = 0; i < this.sparklers.length; i++) {
      this.sparklers[i].draw(ctx)
    }

    // 4. Draw Pyrotechnic Sparks & Strobe Ribbons
    for (let i = 0; i < this.sparks.length; i++) {
      this.sparks[i].draw(ctx)
    }
  }
}
