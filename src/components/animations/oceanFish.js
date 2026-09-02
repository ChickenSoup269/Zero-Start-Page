/**
 * OceanFishEffect — Multi-Style Streamlined Aquarium Engine (AAA Ultra HD)
 *
 * Features:
 *  1. Coherent Streamflow Dynamics ("Bơi đúng dòng"):
 *     - All fish swim harmoniously along an oceanic river current (left-to-right).
 *     - Harmonic wave meandering (sinusoidal flow).
 *     - Seamless downstream loop wrapping.
 *     - Cushioned mouse avoidance that smoothly recovers into downstream flow.
 *  2. Multi-Style Fish Options:
 *     - "cartoon": Plump sculpted Bezier body, big kawaii sparkle eyes, rosy cheeks, flappy fins.
 *     - "pixel": Retro 8-bit / 16-bit arcade pixel art with crisp stepped blocks and frame-animated tail.
 *     - "classic": The exact original unenhanced geometric fish (ellipse body, triangle tail, classic fins).
 *     - "realistic": 7-joint segmented spine kinematics, biological counter-shading, gossamer fin rays.
 *     - "mixed": A vibrant mix of different fish styles swimming together downstream!
 *  3. Multi-Depth Z-Layering (Z ∈ [0.2, 1.0]) with depth-sorted rendering.
 *  4. 60Hz - 240Hz frame delta normalization & High-DPI Retina support.
 *  5. Seamless Startpage Settings integration (updateColor, setStyle, setMode).
 */

export class OceanFishEffect {
  constructor(canvasId, color = "#ff7f50", options = {}) {
    this.canvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId

    if (!this.canvas) {
      console.warn(`[OceanFishEffect] Canvas element "${canvasId}" not found.`)
      return
    }

    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this._color = color || "#ff7f50"
    this._style = options.style || options.mode || "cartoon" // "cartoon" | "pixel" | "classic" | "realistic" | "mixed"

    // Animation & Lifecycle State
    this.active = false
    this.destroyed = false
    this._animId = null
    this.lastTime = 0
    this.dpr = 1
    this.width = 0
    this.height = 0

    // Simulation Entities
    this.fishes = []
    this.bubbles = []

    // Mouse & Fluid Interaction
    this.mouse = {
      x: -2000,
      y: -2000,
      vx: 0,
      vy: 0,
      lastX: -2000,
      lastY: -2000,
      speed: 0,
      active: false,
    }

    // Color Cache
    this.palette = this._computePalette(this._color)

    // Event Bindings
    this.handleResize = this.handleResize.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleMouseLeave = this.handleMouseLeave.bind(this)
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
    this.animate = this.animate.bind(this)

    this.resize()
    window.addEventListener("resize", this.handleResize, { passive: true })
    document.addEventListener("visibilitychange", this.handleVisibilityChange)
  }

  /* -------------------------------------------------------------------------- */
  /*                              COLOR & STYLE                                 */
  /* -------------------------------------------------------------------------- */

  get color() {
    return this._color
  }

  set color(hex) {
    this.updateColor(hex)
  }

  get style() {
    return this._style
  }

  set style(val) {
    this.setStyle(val)
  }

  updateColor(hex) {
    if (!hex) return
    this._color = hex
    this.palette = this._computePalette(hex)

    // Smoothly update existing fish colors
    for (let i = 0; i < this.fishes.length; i++) {
      this._applyPaletteToFish(this.fishes[i], this.palette)
    }
  }

  setStyle(style) {
    const valid = ["cartoon", "pixel", "classic", "realistic", "mixed"]
    if (!valid.includes(style)) return
    this._style = style

    // Update style on all active fishes
    for (let i = 0; i < this.fishes.length; i++) {
      this.fishes[i].style = this._resolveFishStyle(this._style, i)
    }
  }

  setMode(mode) {
    this.setStyle(mode)
  }

  _resolveFishStyle(mainStyle, index) {
    if (mainStyle !== "mixed") return mainStyle
    const styles = ["cartoon", "pixel", "classic", "realistic"]
    return styles[index % styles.length]
  }

  _hexToRgb(hex) {
    let clean = (hex || "").replace("#", "").trim()
    if (clean.length === 3) {
      clean = clean
        .split("")
        .map((c) => c + c)
        .join("")
    }
    const num = parseInt(clean, 16)
    if (isNaN(num) || clean.length !== 6) {
      return { r: 255, g: 127, b: 80 }
    }
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    }
  }

  _rgbToHsl(r, g, b) {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
  }

  _computePalette(hex) {
    const rgb = this._hexToRgb(hex)
    const hsl = this._rgbToHsl(rgb.r, rgb.g, rgb.b)

    return {
      baseHex: hex,
      rgb,
      hsl,
      dorsalHsl: {
        h: hsl.h,
        s: Math.min(100, hsl.s + 10),
        l: Math.max(18, hsl.l * 0.65),
      },
      bellyHsl: {
        h: (hsl.h - 8 + 360) % 360,
        s: Math.max(40, hsl.s - 15),
        l: Math.min(94, hsl.l + 26),
      },
      finHsl: {
        h: hsl.h,
        s: Math.min(100, hsl.s + 5),
        l: Math.min(85, hsl.l + 10),
      },
    }
  }

  _applyPaletteToFish(fish, palette) {
    const offset = fish.paletteOffset || 0
    const h = (palette.hsl.h + offset + 360) % 360
    const s = Math.min(100, Math.max(50, palette.hsl.s + fish.satMod))
    const l = Math.min(82, Math.max(35, palette.hsl.l + fish.lumMod))

    fish.hue = h
    fish.sat = s
    fish.lum = l
    fish.bodyColor = `hsl(${h}, ${s}%, ${l}%)`
    fish.dorsalColor = `hsl(${h}, ${Math.min(100, s + 10)}%, ${Math.max(16, l * 0.65)}%)`
    fish.bellyColor = `hsl(${(h - 8 + 360) % 360}, ${Math.max(40, s - 15)}%, ${Math.min(94, l + 25)}%)`
    fish.finColor = `hsla(${h}, ${s}%, ${Math.min(88, l + 8)}%, 0.85)`
    fish.irisColor = `hsl(${(h + 180) % 360}, 80%, 45%)`
  }

  /* -------------------------------------------------------------------------- */
  /*                            RESIZE & LIFECYCLE                              */
  /* -------------------------------------------------------------------------- */

  resize() {
    if (!this.canvas) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = Math.floor(this.width * this.dpr)
    this.canvas.height = Math.floor(this.height * this.dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    if (this.active && this.fishes.length === 0) {
      this._initMarineLife()
    }
  }

  handleResize() {
    this.resize()
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    if (this.mouse.lastX > -1000) {
      this.mouse.vx = mx - this.mouse.lastX
      this.mouse.vy = my - this.mouse.lastY
      this.mouse.speed = Math.sqrt(this.mouse.vx * this.mouse.vx + this.mouse.vy * this.mouse.vy)
    }

    this.mouse.x = mx
    this.mouse.y = my
    this.mouse.lastX = mx
    this.mouse.lastY = my
    this.mouse.active = true
  }

  handleMouseLeave() {
    this.mouse.x = -2000
    this.mouse.y = -2000
    this.mouse.lastX = -2000
    this.mouse.lastY = -2000
    this.mouse.vx = 0
    this.mouse.vy = 0
    this.mouse.speed = 0
    this.mouse.active = false
  }

  handleVisibilityChange() {
    if (document.visibilityState === "visible" && this.active) {
      this.lastTime = performance.now()
    }
  }

  start() {
    if (this.active || this.destroyed) return
    this.active = true
    this.lastTime = performance.now()

    this.canvas.style.display = "block"
    this.resize()
    this._initMarineLife()

    window.addEventListener("mousemove", this.handleMouseMove, { passive: true })
    window.addEventListener("mouseout", this.handleMouseLeave, { passive: true })

    const loop = (time) => {
      if (!this.active || this.destroyed) return
      this._animId = requestAnimationFrame(loop)
      if (document.visibilityState === "hidden") return
      this.animate(time)
    }
    this._animId = requestAnimationFrame(loop)
  }

  stop() {
    if (!this.active) return
    this.active = false

    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }

    window.removeEventListener("mousemove", this.handleMouseMove)
    window.removeEventListener("mouseout", this.handleMouseLeave)

    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height)
    }
    this.canvas.style.display = "none"
    this.fishes = []
    this.bubbles = []
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this.handleResize)
    document.removeEventListener("visibilitychange", this.handleVisibilityChange)
  }

  /* -------------------------------------------------------------------------- */
  /*                         INIT COHERENT STREAM MARINE LIFE                   */
  /* -------------------------------------------------------------------------- */

  _initMarineLife() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    // Scale count gracefully based on screen width
    const count = Math.max(12, Math.min(30, Math.floor(W / 85)))
    this.fishes = []

    for (let i = 0; i < count; i++) {
      // 3 Depth Strata Z ∈ [0.2, 1.0]
      let z
      const roll = Math.random()
      if (roll < 0.4) {
        z = 0.2 + Math.random() * 0.25 // Far layer
      } else if (roll < 0.85) {
        z = 0.45 + Math.random() * 0.3 // Mid layer
      } else {
        z = 0.75 + Math.random() * 0.25 // Near layer
      }

      const baseSize = 15 + Math.random() * 8
      const size = baseSize * (0.5 + z * 0.7)
      const resolvedStyle = this._resolveFishStyle(this._style, i)

      // Initial downstream movement (Left-to-Right river stream)
      const cruisingSpeed = (1.4 + Math.random() * 0.8) * (0.6 + z * 0.55)

      const fish = {
        id: i,
        style: resolvedStyle,
        x: Math.random() * (W + 200) - 100,
        y: Math.random() * (H - 100) + 50,
        z,
        size,
        cruisingSpeed,
        vx: cruisingSpeed,
        vy: (Math.random() - 0.5) * 0.2,
        angle: 0, // Perfectly aligned downstream initially
        targetAngle: 0,
        pitch: 0,
        roll: 0,
        angularVel: 0,

        // Spine nodes for realistic style
        spineNodes: Array.from({ length: 7 }, () => ({ x: 0, y: 0 })),

        // Fin flutter & body oscillation
        finOffset: Math.random() * Math.PI * 2,
        finSpeed: 0.12 + Math.random() * 0.05,
        streamPhase: Math.random() * Math.PI * 2,

        // Dynamics & Startle Reflex
        startleTimer: 0,
        startleFactor: 0,

        // Palette Variation
        paletteOffset: (Math.random() - 0.5) * 36,
        satMod: (Math.random() - 0.5) * 15,
        lumMod: (Math.random() - 0.5) * 12,
      }

      this._applyPaletteToFish(fish, this.palette)
      this.fishes.push(fish)
    }

    // Underwater Bubbles
    const bubbleCount = Math.max(18, Math.floor(W / 70))
    this.bubbles = Array.from({ length: bubbleCount }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      z: 0.2 + Math.random() * 0.8,
      size: 2.2 + Math.random() * 4.0,
      speed: 0.6 + Math.random() * 1.2,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.03 + Math.random() * 0.03,
      wobbleAmp: 10 + Math.random() * 15,
    }))
  }

  /* -------------------------------------------------------------------------- */
  /*                  PHYSICS STEP: COHERENT STREAMFLOW DYNAMICS                */
  /* -------------------------------------------------------------------------- */

  _update(dt) {
    const W = this.width
    const H = this.height
    const time = performance.now()
    const mouseActive = this.mouse.active && this.mouse.x > -1000

    // 1. Update Bubbles (rising with gentle wobble)
    for (let i = 0; i < this.bubbles.length; i++) {
      const b = this.bubbles[i]
      b.y -= b.speed * (0.4 + b.z * 0.8) * dt
      b.wobble += b.wobbleSpeed * dt

      if (mouseActive) {
        const dx = b.x - this.mouse.x
        const dy = b.y - this.mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 100 && dist > 1) {
          const push = ((100 - dist) / 100) * 2.0 * dt
          b.x += (dx / dist) * push
          b.y += (dy / dist) * push
        }
      }

      if (b.y < -30) {
        b.y = H + 30 + Math.random() * 20
        b.x = Math.random() * W
      }
    }

    // 2. Update Fish Dynamics with Coherent Streamflow
    const interactRadius = 160

    for (let i = 0; i < this.fishes.length; i++) {
      const f = this.fishes[i]

      // COHERENT OCEAN STREAMFLOW:
      // The current flows left-to-right with a gentle sine-wave meander
      const meanderY = Math.sin(f.x * 0.0025 + time * 0.0008 + f.streamPhase) * 0.22
      const meanderX = Math.cos(f.y * 0.002 + time * 0.0005) * 0.08
      const streamAngle = meanderY + meanderX * 0.5 // Mostly horizontal (0 rad), oscillating slightly up and down

      // Downstream target velocity
      const streamSpeed = f.cruisingSpeed * (1 + f.startleFactor * 1.6)
      const targetVx = Math.cos(streamAngle) * streamSpeed
      const targetVy = Math.sin(streamAngle) * streamSpeed

      // Mouse Avoidance
      let avoidVx = 0
      let avoidVy = 0

      if (mouseActive) {
        const dx = f.x - this.mouse.x
        const dy = f.y - this.mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < interactRadius && dist > 1) {
          const push = Math.pow((interactRadius - dist) / interactRadius, 1.4) * 3.5
          avoidVx = (dx / dist) * push
          avoidVy = (dy / dist) * push

          f.startleTimer = 1.0
          f.startleFactor = Math.min(1.0, f.startleFactor + 0.35 * dt)
          f.finSpeed = Math.min(0.4, f.finSpeed + 0.08 * dt)

          // Release mini bubbles when startled
          if (f.z > 0.5 && Math.random() < 0.2) {
            this.bubbles.push({
              x: f.x - Math.cos(f.angle) * f.size * 1.2,
              y: f.y - Math.sin(f.angle) * f.size * 1.2,
              z: f.z,
              size: 1.8 + Math.random() * 2.5,
              speed: 1.3 + Math.random() * 1.5,
              wobble: Math.random() * Math.PI,
              wobbleSpeed: 0.05,
              wobbleAmp: 8,
            })
            if (this.bubbles.length > 50) this.bubbles.shift()
          }
        }
      }

      // Smooth startle recovery
      if (f.startleTimer > 0) {
        f.startleTimer = Math.max(0, f.startleTimer - 0.03 * dt)
      } else {
        f.startleFactor = Math.max(0, f.startleFactor - 0.04 * dt)
        f.finSpeed = Math.max(0.12, f.finSpeed - 0.01 * dt)
      }

      // Blend streamflow with avoidance
      f.vx += (targetVx - f.vx) * 0.045 * dt + avoidVx * dt
      f.vy += (targetVy - f.vy) * 0.055 * dt + avoidVy * dt

      // Soft vertical boundary cushioning (keep fish within viewport height)
      const topMargin = 50
      const botMargin = H - 50
      if (f.y < topMargin) f.vy += ((topMargin - f.y) / topMargin) * 0.4 * dt
      if (f.y > botMargin) f.vy -= ((f.y - botMargin) / 50) * 0.4 * dt

      // Position update
      f.x += f.vx * dt
      f.y += f.vy * dt

      // Seamless Downstream Loop:
      // When fish swims past right screen edge, re-enter from left smoothly
      const margin = f.size * 3
      if (f.x > W + margin) {
        f.x = -margin
        f.y = Math.random() * (H - 120) + 60
        f.vx = targetVx
        f.vy = targetVy
      } else if (f.x < -margin * 1.5) {
        // Fallback if forced left by mouse
        f.x = W + margin * 0.5
      }

      // Heading & 3D Tilt calculation
      const desiredAngle = Math.atan2(f.vy, f.vx)
      let diff = desiredAngle - f.angle
      while (diff < -Math.PI) diff += Math.PI * 2
      while (diff > Math.PI) diff -= Math.PI * 2

      f.angularVel += (diff * 0.2 - f.angularVel) * 0.22 * dt
      f.angle += f.angularVel * dt

      // 3D Pitch tilt & Roll banking
      f.pitch += ((f.vy / Math.max(0.1, streamSpeed)) * 0.35 - f.pitch) * 0.15 * dt
      f.roll += (Math.max(-0.6, Math.min(0.6, f.angularVel * 4.5)) - f.roll) * 0.18 * dt

      // Fins oscillation
      f.finOffset += (f.finSpeed + f.startleFactor * 0.18) * dt

      // Update spine nodes for realistic style
      if (f.style === "realistic") {
        f.spineNodes[0].x = f.x
        f.spineNodes[0].y = f.y
        const segDist = (f.size * 2.2 / 6)
        for (let s = 1; s < 7; s++) {
          const waveAmp = f.size * 0.3 * Math.pow(s / 6, 1.7)
          const lateral = Math.sin(f.finOffset - s * 0.75) * waveAmp
          const idealX = f.x - Math.cos(f.angle) * (s * segDist) - Math.sin(f.angle) * lateral
          const idealY = f.y - Math.sin(f.angle) * (s * segDist) + Math.cos(f.angle) * lateral
          f.spineNodes[s].x = idealX
          f.spineNodes[s].y = idealY
        }
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            FISH STYLE RENDERERS                            */
  /* -------------------------------------------------------------------------- */

  /**
   * Style 1: CARTOON (Plump body, kawaii sparkle eyes, rosy blush, glossy shine)
   */
  _renderCartoon(fish, ctx) {
    const s = fish.size
    const z = fish.z
    const roll = fish.roll
    const startle = fish.startleFactor

    ctx.save()
    ctx.translate(fish.x, fish.y)
    ctx.rotate(fish.angle)
    ctx.scale(Math.cos(fish.pitch), 1.0)
    ctx.globalAlpha = 0.45 + z * 0.55

    // Soft aura
    if (z > 0.75) {
      const auraR = s * 2.2
      const aura = ctx.createRadialGradient(0, 0, s * 0.3, 0, 0, auraR)
      aura.addColorStop(0, `hsla(${fish.hue}, 90%, 75%, 0.2)`)
      aura.addColorStop(0.6, `hsla(${fish.hue}, 85%, 65%, 0.06)`)
      aura.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = aura
      ctx.beginPath()
      ctx.arc(0, 0, auraR, 0, Math.PI * 2)
      ctx.fill()
    }

    // Wagging tail
    const tailWobble = Math.sin(fish.finOffset) * (s * (0.35 + startle * 0.3))
    const tailGrad = ctx.createLinearGradient(-s * 0.8, 0, -s * 2.1, tailWobble)
    tailGrad.addColorStop(0, fish.bodyColor)
    tailGrad.addColorStop(0.5, fish.finColor)
    tailGrad.addColorStop(1, `hsla(${fish.hue}, 95%, 85%, 0.95)`)

    ctx.fillStyle = tailGrad
    ctx.beginPath()
    ctx.moveTo(-s * 0.7, 0)
    ctx.bezierCurveTo(-s * 1.2, -s * 0.4 + tailWobble * 0.5, -s * 1.6, -s * 0.85 + tailWobble, -s * 1.9, -s * 0.65 + tailWobble)
    ctx.quadraticCurveTo(-s * 1.45, tailWobble * 0.5, -s * 1.9, s * 0.65 + tailWobble)
    ctx.bezierCurveTo(-s * 1.6, s * 0.85 + tailWobble, -s * 1.2, s * 0.4 + tailWobble * 0.5, -s * 0.7, 0)
    ctx.closePath()
    ctx.fill()

    // Dorsal fin
    const finWave = Math.sin(fish.finOffset - 1.2) * (s * 0.12)
    ctx.fillStyle = fish.finColor
    ctx.beginPath()
    ctx.moveTo(-s * 0.35, -s * 0.48)
    ctx.bezierCurveTo(-s * 0.1, -s * 1.15 + finWave, s * 0.4, -s * 0.85 + finWave, s * 0.25, -s * 0.48)
    ctx.closePath()
    ctx.fill()

    // Plump body
    ctx.beginPath()
    ctx.moveTo(s * 0.95, 0)
    ctx.bezierCurveTo(s * 0.75, -s * 0.62, -s * 0.35, -s * 0.65, -s * 0.8, -s * 0.15)
    ctx.lineTo(-s * 0.85, 0)
    ctx.bezierCurveTo(-s * 0.35, s * 0.62, s * 0.75, s * 0.58, s * 0.95, 0)
    ctx.closePath()

    const lightShift = Math.max(0.1, Math.min(0.9, 0.55 + roll * 0.4))
    const bodyGrad = ctx.createLinearGradient(0, -s * 0.7, 0, s * 0.7)
    bodyGrad.addColorStop(0, fish.dorsalColor)
    bodyGrad.addColorStop(lightShift, fish.bodyColor)
    bodyGrad.addColorStop(1, fish.bellyColor)
    ctx.fillStyle = bodyGrad
    ctx.fill()

    // Glossy highlight
    ctx.beginPath()
    ctx.moveTo(s * 0.7, -s * 0.3)
    ctx.quadraticCurveTo(0, -s * 0.55, -s * 0.5, -s * 0.28)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
    ctx.lineWidth = Math.max(1.2, 2.2 * z)
    ctx.lineCap = "round"
    ctx.stroke()

    // Rosy cheek
    const blushGrad = ctx.createRadialGradient(s * 0.28, s * 0.14, 0, s * 0.28, s * 0.14, s * 0.22)
    blushGrad.addColorStop(0, "rgba(255, 120, 150, 0.55)")
    blushGrad.addColorStop(1, "rgba(255, 120, 150, 0)")
    ctx.fillStyle = blushGrad
    ctx.beginPath()
    ctx.arc(s * 0.28, s * 0.14, s * 0.22, 0, Math.PI * 2)
    ctx.fill()

    // Cute smile
    ctx.strokeStyle = "rgba(60, 40, 40, 0.55)"
    ctx.lineWidth = Math.max(0.8, 1.4 * z)
    ctx.beginPath()
    ctx.arc(s * 0.78, s * 0.08, s * 0.1, 0.2, Math.PI * 0.75)
    ctx.stroke()

    // Pectoral fin
    const pctWobble = Math.sin(fish.finOffset * 1.3) * 0.35
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)"
    ctx.beginPath()
    ctx.ellipse(-s * 0.1, s * 0.22, s * 0.38, s * 0.2, Math.PI / 6 + pctWobble, 0, Math.PI * 2)
    ctx.fill()

    // Kawaii eye
    const eyeX = s * 0.48
    const eyeY = -s * 0.16
    const eyeR = s * (0.24 + startle * 0.04)

    ctx.fillStyle = "rgba(255, 255, 255, 0.98)"
    ctx.beginPath()
    ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2)
    ctx.fill()

    const pupilLookX = eyeX + Math.min(2.5, Math.max(-2.5, fish.vx * 0.8))
    const pupilLookY = eyeY + Math.min(2.0, Math.max(-2.0, fish.vy * 0.8))
    const irisR = eyeR * 0.72

    ctx.fillStyle = fish.irisColor
    ctx.beginPath()
    ctx.arc(pupilLookX, pupilLookY, irisR, 0, Math.PI * 2)
    ctx.fill()

    const pupilR = irisR * 0.7
    ctx.fillStyle = "#16161a"
    ctx.beginPath()
    ctx.arc(pupilLookX, pupilLookY, pupilR, 0, Math.PI * 2)
    ctx.fill()

    // Sparkles
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(pupilLookX - pupilR * 0.36, pupilLookY - pupilR * 0.36, pupilR * 0.38, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(pupilLookX + pupilR * 0.36, pupilLookY + pupilR * 0.36, pupilR * 0.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  /**
   * Style 2: RETRO PIXEL ART (Crisp 8-bit / 16-bit blocky arcade fish)
   */
  _renderPixel(fish, ctx) {
    const s = fish.size
    const z = fish.z
    const p = Math.max(2, Math.floor(s / 6)) // Pixel block size

    ctx.save()
    ctx.translate(fish.x, fish.y)
    ctx.rotate(fish.angle)
    ctx.globalAlpha = 0.5 + z * 0.5

    // Stepped pixel tail waving (discrete frame tick)
    const tailTick = Math.floor(fish.finOffset * 2) % 3 - 1
    const tShift = tailTick * p

    ctx.fillStyle = fish.bodyColor

    // Pixel matrix definition: [dx, dy, width, height]
    const pixels = [
      // Snout
      [4 * p, -1 * p, p, 2 * p],
      [3 * p, -2 * p, p, 4 * p],
      // Body core
      [2 * p, -3 * p, p, 6 * p],
      [1 * p, -3 * p, p, 6 * p],
      [0, -4 * p, p, 8 * p], // Dorsal crest
      [-1 * p, -3 * p, p, 6 * p],
      [-2 * p, -3 * p, p, 6 * p],
      [-3 * p, -2 * p, p, 4 * p],
      // Tail peduncle
      [-4 * p, -1 * p, p, 2 * p],
      // Tail fin (stepped)
      [-5 * p, -2 * p + tShift, p, 4 * p],
      [-6 * p, -3 * p + tShift, p, 6 * p],
      [-7 * p, -4 * p + tShift, p, 2 * p],
      [-7 * p, 2 * p + tShift, p, 2 * p],
    ]

    for (let i = 0; i < pixels.length; i++) {
      const [px, py, pw, ph] = pixels[i]
      ctx.fillRect(px, py, pw, ph)
    }

    // Belly lighter pixels
    ctx.fillStyle = fish.bellyColor
    ctx.fillRect(0, 2 * p, p, 2 * p)
    ctx.fillRect(1 * p, 1 * p, p, 2 * p)
    ctx.fillRect(-1 * p, 1 * p, p, 2 * p)

    // Dorsal dark rim pixels
    ctx.fillStyle = fish.dorsalColor
    ctx.fillRect(0, -4 * p, p, p)
    ctx.fillRect(1 * p, -3 * p, p, p)
    ctx.fillRect(-1 * p, -3 * p, p, p)

    // Pixel Eye
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(2 * p, -2 * p, 2 * p, 2 * p)
    ctx.fillStyle = "#000000"
    ctx.fillRect(3 * p, -2 * p, p, p)

    ctx.restore()
  }

  /**
   * Style 3: CLASSIC (The unenhanced original style before improvement)
   */
  _renderClassic(fish, ctx) {
    const s = fish.size
    const z = fish.z

    ctx.save()
    ctx.translate(fish.x, fish.y)
    ctx.rotate(fish.angle)
    ctx.globalAlpha = 0.5 + z * 0.5

    // Original shadow
    ctx.shadowColor = "rgba(0,0,0,0.2)"
    ctx.shadowBlur = 8
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 6

    ctx.fillStyle = fish.bodyColor

    // Tail (Original triangle tail with sinusoidal wobble)
    const tailWobble = Math.sin(fish.finOffset) * (s / 2.5)
    ctx.beginPath()
    ctx.moveTo(-s / 1.5, 0)
    ctx.lineTo(-s * 1.8, -s / 1.5 + tailWobble)
    ctx.lineTo(-s * 1.8, s / 1.5 + tailWobble)
    ctx.fill()

    // Top Fin (Original bezier fin)
    ctx.beginPath()
    ctx.moveTo(-s / 3, -s / 2)
    ctx.bezierCurveTo(0, -s * 1.2, s / 2, -s * 0.8, s / 3, -s / 2)
    ctx.fill()

    // Body (Original ellipse)
    ctx.beginPath()
    ctx.ellipse(0, 0, s, s / 2, 0, 0, Math.PI * 2)
    ctx.fill()

    // Pectoral Fin (Original translucent fin)
    ctx.fillStyle = "rgba(255,255,255,0.4)"
    ctx.beginPath()
    const pctWobble = Math.sin(fish.finOffset - Math.PI / 4) * (s / 4)
    ctx.ellipse(-s / 8, s / 4, s / 2.5, s / 5, Math.PI / 8 + pctWobble / s, 0, Math.PI * 2)
    ctx.fill()

    // Eye (Original simple circles)
    ctx.shadowBlur = 0
    ctx.fillStyle = "rgba(255,255,255,0.9)"
    ctx.beginPath()
    ctx.arc(s / 2, -s / 5, s / 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#111"
    ctx.beginPath()
    ctx.arc(s / 2 + 1, -s / 5, s / 8, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  /**
   * Style 4: REALISTIC 3D (7-joint spine kinematics, counter-shading, gossamer fins)
   */
  _renderRealistic(fish, ctx) {
    const s = fish.size
    const z = fish.z
    const roll = fish.roll
    const nodes = fish.spineNodes

    ctx.save()
    ctx.globalAlpha = 0.35 + z * 0.65

    // Streamlined body ribs
    const leftRibs = []
    const rightRibs = []
    const ribRadii = [s * 0.15, s * 0.45, s * 0.55, s * 0.48, s * 0.32, s * 0.15, s * 0.08]

    for (let i = 0; i < 7; i++) {
      const orthoX = -Math.sin(fish.angle)
      const orthoY = Math.cos(fish.angle)
      const rL = ribRadii[i] * Math.max(0.2, 1.0 - roll * 0.7)
      const rR = ribRadii[i] * Math.max(0.2, 1.0 + roll * 0.7)
      leftRibs.push({ x: nodes[i].x + orthoX * rL, y: nodes[i].y + orthoY * rL })
      rightRibs.push({ x: nodes[i].x - orthoX * rR, y: nodes[i].y - orthoY * rR })
    }

    // Translucent tail fin
    const tailBase = nodes[6]
    const tailLen = s * 1.3
    const tailAngle = fish.angle
    ctx.fillStyle = fish.finColor
    ctx.beginPath()
    ctx.moveTo(tailBase.x, tailBase.y)
    ctx.lineTo(tailBase.x - Math.cos(tailAngle - 0.4) * tailLen, tailBase.y - Math.sin(tailAngle - 0.4) * tailLen)
    ctx.lineTo(tailBase.x - Math.cos(tailAngle) * (tailLen * 0.6), tailBase.y - Math.sin(tailAngle) * (tailLen * 0.6))
    ctx.lineTo(tailBase.x - Math.cos(tailAngle + 0.4) * tailLen, tailBase.y - Math.sin(tailAngle + 0.4) * tailLen)
    ctx.closePath()
    ctx.fill()

    // Torso Bezier curves
    ctx.beginPath()
    ctx.moveTo(nodes[0].x, nodes[0].y)
    for (let i = 1; i < 7; i++) {
      ctx.lineTo(leftRibs[i].x, leftRibs[i].y)
    }
    ctx.lineTo(nodes[6].x, nodes[6].y)
    for (let i = 6; i >= 1; i--) {
      ctx.lineTo(rightRibs[i].x, rightRibs[i].y)
    }
    ctx.closePath()

    const bodyGrad = ctx.createLinearGradient(leftRibs[2].x, leftRibs[2].y, rightRibs[2].x, rightRibs[2].y)
    bodyGrad.addColorStop(0, fish.dorsalColor)
    bodyGrad.addColorStop(0.5, fish.bodyColor)
    bodyGrad.addColorStop(1, fish.bellyColor)
    ctx.fillStyle = bodyGrad
    ctx.fill()

    // Eye
    if (z > 0.3) {
      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.arc(nodes[1].x, nodes[1].y - s * 0.15, s * 0.12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#000000"
      ctx.beginPath()
      ctx.arc(nodes[1].x + 1, nodes[1].y - s * 0.15, s * 0.07, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  /**
   * Renders friendly cartoon glass bubbles with specular crescent shine.
   */
  _renderBubble(b, ctx) {
    const hoverX = b.x + Math.sin(b.wobble) * b.wobbleAmp
    const r = b.size
    const z = b.z

    ctx.save()
    ctx.globalAlpha = 0.35 + z * 0.5

    const grad = ctx.createRadialGradient(
      hoverX - r * 0.3,
      b.y - r * 0.3,
      r * 0.1,
      hoverX,
      b.y,
      r,
    )
    grad.addColorStop(0, "rgba(255, 255, 255, 0.65)")
    grad.addColorStop(0.7, `hsla(${this.palette.hsl.h}, 80%, 80%, 0.2)`)
    grad.addColorStop(1, `hsla(${this.palette.hsl.h}, 90%, 90%, 0.75)`)

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(hoverX, b.y, r, 0, Math.PI * 2)
    ctx.fill()

    // Specular Crescent Shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)"
    ctx.beginPath()
    ctx.arc(hoverX - r * 0.35, b.y - r * 0.35, r * 0.3, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  /* -------------------------------------------------------------------------- */
  /*                                MAIN LOOP                                   */
  /* -------------------------------------------------------------------------- */

  animate(timestamp = 0) {
    if (!this.active || this.destroyed) return

    // Delta-time normalization
    const rawElapsed = this.lastTime ? timestamp - this.lastTime : 16.67
    this.lastTime = timestamp
    const dt = Math.min(Math.max(rawElapsed / (1000 / 60), 0.1), 3.0)

    // Physics update step
    this._update(dt)

    // Clear Canvas
    this.ctx.clearRect(0, 0, this.width, this.height)

    // Depth-Sorted Render (Back-to-front Z-layering)
    const renderQueue = []

    for (let i = 0; i < this.bubbles.length; i++) {
      renderQueue.push({ type: "bubble", item: this.bubbles[i], z: this.bubbles[i].z })
    }
    for (let i = 0; i < this.fishes.length; i++) {
      renderQueue.push({ type: "fish", item: this.fishes[i], z: this.fishes[i].z })
    }

    renderQueue.sort((a, b) => a.z - b.z)

    for (let i = 0; i < renderQueue.length; i++) {
      const elem = renderQueue[i]
      if (elem.type === "fish") {
        const f = elem.item
        switch (f.style) {
          case "pixel":
            this._renderPixel(f, this.ctx)
            break
          case "classic":
            this._renderClassic(f, this.ctx)
            break
          case "realistic":
            this._renderRealistic(f, this.ctx)
            break
          case "cartoon":
          default:
            this._renderCartoon(f, this.ctx)
            break
        }
      } else {
        this._renderBubble(elem.item, this.ctx)
      }
    }
  }
}
