/**
 * WindEffect — Hollywood / AAA Ultra HD Anime Wind Engine
 *
 * Implements the 6 Golden Principles:
 *  1. Natural Organic Geometry:
 *     - Aerodynamic tapered wind blades & organic Bezier ribbons (curved S-curves with needle-sharp tips).
 *     - Organic wind swirls / vortices and micro atmospheric shimmer motes.
 *     - 3D spatial pitch, roll, and orientation with aerodynamic cross-section luminescence.
 *  2. Multi-Depth Z-Layering (Parallax Z ∈ [0.15, 1.0]):
 *     - Distant Layer (Z < 0.38): Delicate, narrow, translucent ambient wisps creating atmospheric depth.
 *     - Mid Layer (0.38 <= Z < 0.72): Balanced speed, fluid wave oscillations.
 *     - Foreground Layer (Z >= 0.72): Bold, high-speed anime cutting blades with radiant bloom auras and air turbulence motes.
 *  3. Luminescence & Gradients (Zero ctx.filter Lag):
 *     - Multi-stop LinearGradients featuring a white-hot photon core (#ffffff) enveloped by vibrant anime neon/pastel auras.
 *     - Natural tapered head-to-tail opacity fade out.
 *  4. Aerodynamic Fluid Physics & Mouse Slipstream:
 *     - Harmonic wind wave oscillations & dynamic atmospheric breathing gusts.
 *     - Interactive aerodynamic airfoil wake: cursor smoothly deflects and guides the wind stream with cushioned damping.
 *  5. 60Hz - 240Hz Delta Normalization & Native High-DPI Retina Support.
 *  6. Seamless Settings Integration:
 *     - Full support for updateColor(hex), color getter/setter, setMode("2d" | "3d"), and complete lifecycle management.
 */

import { hexToRgb } from "../../utils/colors.js"

// ── Anime Atmospheric Shimmer Mote ──────────────────────────────────────────
class WindMote {
  constructor(width, height, rgb, z) {
    this.rgb = rgb
    this.reset(width, height, z, true)
  }

  reset(width, height, z = null, initial = false) {
    this.z = z !== null ? z : Math.random() * 0.85 + 0.15
    this.x = initial ? Math.random() * width : width + Math.random() * 80
    this.y = Math.random() * height
    this.baseSpeed = (4 + Math.random() * 7) * (0.5 + 0.5 * this.z)
    this.length = (8 + Math.random() * 22) * (0.6 + 0.4 * this.z)
    this.size = (0.8 + Math.random() * 1.5) * (0.6 + 0.4 * this.z)
    this.alpha = (0.2 + Math.random() * 0.45) * (0.4 + 0.6 * this.z)
    this.phase = Math.random() * Math.PI * 2
    this.oscSpeed = 0.03 + Math.random() * 0.03
    this.oscAmp = 1.0 + Math.random() * 2.0
  }

  update(dt, width, height, time, speedMultiplier, mouse) {
    this.phase += this.oscSpeed * dt
    const oscY = Math.sin(this.phase) * this.oscAmp

    let vx = -this.baseSpeed * speedMultiplier
    let vy = oscY

    // Mouse wake deflection
    if (mouse.active) {
      const dx = this.x - mouse.x
      const dy = this.y - mouse.y
      const distSq = dx * dx + dy * dy
      const radius = 130
      if (distSq < radius * radius && distSq > 1) {
        const dist = Math.sqrt(distSq)
        const force = (1 - dist / radius) * 4.0 * this.z
        vy += (dy / dist) * force
        vx += (dx / dist) * force * 0.5
      }
    }

    this.x += vx * dt
    this.y += vy * dt

    if (this.x < -this.length - 20) {
      this.reset(width, height, null, false)
    }
  }

  draw(ctx, rgb) {
    const col = rgb || this.rgb
    const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.length, this.y)
    grad.addColorStop(0, `rgba(255, 255, 255, ${(this.alpha * 0.95).toFixed(3)})`)
    grad.addColorStop(0.3, `rgba(${col.r}, ${col.g}, ${col.b}, ${(this.alpha * 0.7).toFixed(3)})`)
    grad.addColorStop(1, `rgba(${col.r}, ${col.g}, ${col.b}, 0)`)

    ctx.save()
    ctx.strokeStyle = grad
    ctx.lineWidth = this.size
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(this.x, this.y)
    ctx.lineTo(this.x + this.length, this.y)
    ctx.stroke()
    ctx.restore()
  }
}

// ── 2D Hollywood Anime Wind Blade (Organic Tapered Ribbon) ───────────────────
class AnimeWindBlade2D {
  constructor(width, height, rgb, initial = false) {
    this.rgb = rgb
    this.reset(width, height, initial)
  }

  reset(width, height, initial = false) {
    // 3-tier Parallax Depth Layer Z ∈ [0.15, 1.0]
    this.z = Math.pow(Math.random(), 1.3) * 0.85 + 0.15

    // Physical dimensions based on depth
    this.length = (140 + Math.random() * 260) * (0.6 + 0.5 * this.z)
    this.maxThickness = (1.2 + Math.random() * 2.8) * (0.5 + 0.6 * this.z)

    // Position & velocity
    this.x = initial ? Math.random() * width : width + this.length + Math.random() * 100
    this.y = Math.random() * height
    this.speed = (12 + Math.random() * 16) * (0.5 + 0.6 * this.z)

    // Aerodynamic tilt: slight natural downward slope (-2 deg to -6 deg)
    this.tiltAngle = -0.04 - Math.random() * 0.06

    // Harmonic wave oscillation
    this.wavePhase = Math.random() * Math.PI * 2
    this.waveFreq = 0.025 + Math.random() * 0.02
    this.waveAmp = (3 + Math.random() * 7) * (0.5 + 0.5 * this.z)

    // 3D Spatial Roll (fluttering thin edge vs broadside)
    this.rollPhase = Math.random() * Math.PI * 2
    this.rollSpeed = 0.03 + Math.random() * 0.04

    // Opacity
    this.alpha = (0.2 + Math.random() * 0.5) * (0.4 + 0.6 * this.z)

    // Deflection displacement caused by mouse
    this.deflectY = 0
    this.deflectTargetY = 0
  }

  update(dt, width, height, time, speedMultiplier, mouse) {
    // Harmonic wave propagation
    this.wavePhase += this.waveFreq * dt
    this.rollPhase += this.rollSpeed * dt

    // Mouse wake deflection (Fluid displacement around obstacles)
    this.deflectTargetY = 0
    if (mouse.active) {
      const midX = this.x - this.length * 0.4
      const dx = midX - mouse.x
      const dy = this.y - mouse.y
      const distSq = dx * dx + dy * dy
      const radius = 170

      if (distSq < radius * radius && distSq > 4) {
        const dist = Math.sqrt(distSq)
        const pushDir = dy >= 0 ? 1 : -1
        const pushMagnitude = (1 - dist / radius) * 48 * this.z
        this.deflectTargetY = pushDir * pushMagnitude
      }
    }

    // Cushioned damping interpolation for deflection
    this.deflectY += (this.deflectTargetY - this.deflectY) * 0.12 * dt

    // Horizontal drift
    this.x -= this.speed * speedMultiplier * dt
    this.y += Math.sin(this.tiltAngle) * (this.speed * 0.4) * dt

    // Off-screen reset
    if (this.x < -this.length - 40) {
      this.reset(width, height, false)
    }
  }

  draw(ctx, rgb) {
    const col = rgb || this.rgb
    const L = this.length
    // Modulate thickness by 3D Roll phase to simulate aerodynamic ribbon twist
    const rollFactor = Math.abs(Math.cos(this.rollPhase)) * 0.6 + 0.4
    const T = this.maxThickness * rollFactor

    // Harmonic wave curvature displacement along the ribbon
    const waveOffset = Math.sin(this.wavePhase) * this.waveAmp + this.deflectY

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.tiltAngle)

    // Create 3 control points for the natural organic S-curve wind blade
    // Leading tip (sharp front): ( -L, 0 )
    // Crest / Thickest zone: ( -L * 0.35, waveOffset * 0.5 )
    // Trailing tip (tail feather): ( 0, 0 )
    const p0x = -L
    const p0y = 0
    const pCrestX = -L * 0.35
    const pCrestY = waveOffset * 0.6
    const pTailX = 0
    const pTailY = 0

    // 1. Radiant Outer Aura Bloom (Only for close and mid layers Z > 0.4)
    if (this.z > 0.4) {
      const auraT = T * 2.8
      const auraGrad = ctx.createLinearGradient(p0x, 0, pTailX, 0)
      auraGrad.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, 0)`)
      auraGrad.addColorStop(0.3, `rgba(${col.r}, ${col.g}, ${col.b}, ${(this.alpha * 0.2).toFixed(3)})`)
      auraGrad.addColorStop(0.65, `rgba(${col.r}, ${col.g}, ${col.b}, ${(this.alpha * 0.3).toFixed(3)})`)
      auraGrad.addColorStop(1, `rgba(${col.r}, ${col.g}, ${col.b}, 0)`)

      ctx.fillStyle = auraGrad
      ctx.beginPath()
      // Top boundary
      ctx.moveTo(p0x, p0y)
      ctx.quadraticCurveTo(pCrestX, pCrestY - auraT, pTailX, pTailY)
      // Bottom boundary
      ctx.quadraticCurveTo(pCrestX, pCrestY + auraT, p0x, p0y)
      ctx.closePath()
      ctx.fill()
    }

    // 2. Main Aerodynamic Tapered Blade Body
    const bodyGrad = ctx.createLinearGradient(p0x, 0, pTailX, 0)
    bodyGrad.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, 0)`)
    bodyGrad.addColorStop(0.2, `rgba(${col.r}, ${col.g}, ${col.b}, ${(this.alpha * 0.5).toFixed(3)})`)
    bodyGrad.addColorStop(0.65, `rgba(${col.r}, ${col.g}, ${col.b}, ${(this.alpha * 0.85).toFixed(3)})`)
    bodyGrad.addColorStop(0.85, `rgba(255, 255, 255, ${(this.alpha * 0.75).toFixed(3)})`)
    bodyGrad.addColorStop(1, `rgba(${col.r}, ${col.g}, ${col.b}, 0)`)

    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.moveTo(p0x, p0y)
    ctx.quadraticCurveTo(pCrestX, pCrestY - T, pTailX, pTailY)
    ctx.quadraticCurveTo(pCrestX, pCrestY + T, p0x, p0y)
    ctx.closePath()
    ctx.fill()

    // 3. White-Hot Photon Core Filament (High-velocity sharp cutting edge)
    const coreGrad = ctx.createLinearGradient(p0x, 0, pTailX, 0)
    coreGrad.addColorStop(0, "rgba(255, 255, 255, 0)")
    coreGrad.addColorStop(0.4, "rgba(255, 255, 255, 0)")
    coreGrad.addColorStop(0.7, `rgba(255, 255, 255, ${(this.alpha * 0.95).toFixed(3)})`)
    coreGrad.addColorStop(0.9, `rgba(255, 255, 255, ${(this.alpha * 0.98).toFixed(3)})`)
    coreGrad.addColorStop(1, "rgba(255, 255, 255, 0)")

    ctx.strokeStyle = coreGrad
    ctx.lineWidth = Math.max(0.6, T * 0.35)
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(p0x * 0.85, p0y * 0.85)
    ctx.quadraticCurveTo(pCrestX, pCrestY, pTailX * 0.15, pTailY * 0.15)
    ctx.stroke()

    ctx.restore()
  }
}

// ── 3D Dimensional Anime Warp Stream (Vortex & Perspective Stream) ───────────
class AnimeWindBlade3D {
  constructor(width, height, rgb, initial = false) {
    this.rgb = rgb
    this.reset(width, height, initial)
  }

  reset(width, height, initial = false) {
    // True 3D spatial positioning
    const spreadX = width * 1.8
    const spreadY = height * 1.8
    this.x = (Math.random() - 0.5) * spreadX
    this.y = (Math.random() - 0.5) * spreadY
    this.z = initial ? Math.random() * 1900 + 100 : 2000

    // Flight speed and dynamic length
    this.speed = Math.random() * 28 + 24
    this.baseLength = Math.random() * 320 + 180
    this.thickness = Math.random() * 1.8 + 1.2

    // 3D Spatial orientation & subtle spiral angle
    this.angle = Math.atan2(this.y, this.x)
    this.twist = (Math.random() - 0.5) * 0.15
    this.spiralSpeed = (Math.random() - 0.5) * 0.008

    // Luminescence
    this.maxAlpha = Math.random() * 0.45 + 0.45
    this.alpha = 0
  }

  update(dt, width, height, time, speedMultiplier, mouse) {
    this.z -= this.speed * speedMultiplier * dt

    // Dynamic spiral vortex rotation
    this.angle += this.spiralSpeed * dt
    const dist2D = Math.sqrt(this.x * this.x + this.y * this.y)
    this.x = Math.cos(this.angle) * dist2D
    this.y = Math.sin(this.angle) * dist2D

    // Mouse wake repulsion in 3D projection space
    if (mouse.active) {
      const factor = 1000 / Math.max(this.z, 50)
      const screenX = this.x * factor + width / 2
      const screenY = this.y * factor + height / 2
      const dx = screenX - mouse.x
      const dy = screenY - mouse.y
      const distSq = dx * dx + dy * dy
      const radius = 180

      if (distSq < radius * radius && distSq > 4) {
        const dist = Math.sqrt(distSq)
        const push = (1 - dist / radius) * 18 * (1000 / this.z)
        this.x += (dx / dist) * push * dt
        this.y += (dy / dist) * push * dt
      }
    }

    if (this.z <= 50) {
      this.reset(width, height, false)
    }

    // Smooth entry and exit fade curves
    const fadeIn = Math.min(1, (2000 - this.z) / 450)
    const fadeOut = Math.min(1, (this.z - 50) / 300)
    this.alpha = this.maxAlpha * fadeIn * fadeOut
  }

  draw(ctx, width, height, rgb) {
    if (this.alpha <= 0.01) return
    const col = rgb || this.rgb

    // 3D Camera Perspective Projection (FOV = 1000)
    const factorHead = 1000 / Math.max(this.z, 20)
    const factorTail = 1000 / Math.max(this.z + this.baseLength, 20)

    const hx = this.x * factorHead + width / 2
    const hy = this.y * factorHead + height / 2

    const tx = this.x * factorTail + width / 2
    const ty = this.y * factorTail + height / 2

    // Off-screen frustum culling
    const margin = 120
    if (
      (hx < -margin && tx < -margin) ||
      (hx > width + margin && tx > width + margin) ||
      (hy < -margin && ty < -margin) ||
      (hy > height + margin && ty > height + margin)
    ) {
      return
    }

    const dx = hx - tx
    const dy = hy - ty
    const length = Math.sqrt(dx * dx + dy * dy)
    if (length < 2) return

    const normalX = -dy / length
    const normalY = dx / length

    // Tapered aerodynamic thickness
    const headW = Math.max(0.6, this.thickness * factorHead * 1.1)
    const tailW = Math.max(0.2, this.thickness * factorTail * 0.2)

    ctx.save()

    // 1. Soft Radiant Aura Glow
    const auraW = headW * 2.5
    const auraGrad = ctx.createLinearGradient(tx, ty, hx, hy)
    auraGrad.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, 0)`)
    auraGrad.addColorStop(0.5, `rgba(${col.r}, ${col.g}, ${col.b}, ${(this.alpha * 0.25).toFixed(3)})`)
    auraGrad.addColorStop(1, `rgba(${col.r}, ${col.g}, ${col.b}, 0)`)

    ctx.fillStyle = auraGrad
    ctx.beginPath()
    ctx.moveTo(tx - normalX * tailW * 2, ty - normalY * tailW * 2)
    ctx.lineTo(hx - normalX * auraW, hy - normalY * auraW)
    ctx.lineTo(hx + normalX * auraW, hy + normalY * auraW)
    ctx.lineTo(tx + normalX * tailW * 2, ty + normalY * tailW * 2)
    ctx.closePath()
    ctx.fill()

    // 2. High-Speed Tapered Wind Body
    const bodyGrad = ctx.createLinearGradient(tx, ty, hx, hy)
    bodyGrad.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, 0)`)
    bodyGrad.addColorStop(0.4, `rgba(${col.r}, ${col.g}, ${col.b}, ${(this.alpha * 0.6).toFixed(3)})`)
    bodyGrad.addColorStop(0.85, `rgba(${col.r}, ${col.g}, ${col.b}, ${(this.alpha * 0.95).toFixed(3)})`)
    bodyGrad.addColorStop(1, `rgba(255, 255, 255, ${(this.alpha * 0.95).toFixed(3)})`)

    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.moveTo(tx - normalX * tailW, ty - normalY * tailW)
    ctx.lineTo(hx - normalX * headW, hy - normalY * headW)
    ctx.lineTo(hx + normalX * headW, hy + normalY * headW)
    ctx.lineTo(tx + normalX * tailW, ty + normalY * tailW)
    ctx.closePath()
    ctx.fill()

    // 3. White-Hot Photon Tip / Cutting Edge
    const coreGrad = ctx.createLinearGradient(tx, ty, hx, hy)
    coreGrad.addColorStop(0, "rgba(255, 255, 255, 0)")
    coreGrad.addColorStop(0.7, "rgba(255, 255, 255, 0)")
    coreGrad.addColorStop(0.9, `rgba(255, 255, 255, ${(this.alpha * 0.9).toFixed(3)})`)
    coreGrad.addColorStop(1, `rgba(255, 255, 255, ${(this.alpha * 0.98).toFixed(3)})`)

    ctx.strokeStyle = coreGrad
    ctx.lineWidth = Math.max(0.6, headW * 0.45)
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(tx + dx * 0.5, ty + dy * 0.5)
    ctx.lineTo(hx, hy)
    ctx.stroke()

    ctx.restore()
  }
}

// ── Main Hollywood AAA Wind Engine ──────────────────────────────────────────
export class WindEffect {
  constructor(canvasId, mode = "2d", color = "#e0f7fa") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this._animId = null
    this.mode = mode === "3d" ? "3d" : "2d"

    // Color Management
    this._color = color || "#e0f7fa"
    this._rgb = hexToRgb(this._color) || { r: 224, g: 247, b: 250 }

    // Entities
    this.blades = []
    this.motes = []

    // Time & Delta Normalization (60Hz - 240Hz)
    this.lastTime = performance.now()
    this.time = 0
    this.width = window.innerWidth
    this.height = window.innerHeight

    // Interactive Mouse Aerodynamics
    this.mouse = {
      x: -9999,
      y: -9999,
      active: false,
    }

    // Bound Event Listeners
    this._resizeHandler = () => this.handleResize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseLeaveHandler = () => this._onMouseLeave()
    this._visibilityHandler = () => this._onVisibilityChange()

    this.init()
    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseleave", this._mouseLeaveHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)
  }

  // ── Color API ─────────────────────────────────────────────────────────────
  get color() {
    return this._color
  }

  set color(val) {
    this.updateColor(val)
  }

  updateColor(hex) {
    if (!hex) return
    this._color = hex
    const parsed = hexToRgb(hex)
    if (parsed) {
      this._rgb = parsed
    }
  }

  // ── Mode API ──────────────────────────────────────────────────────────────
  setMode(mode) {
    const valid = mode === "3d" ? "3d" : "2d"
    if (this.mode === valid) return
    this.mode = valid
    this.createEntities()
  }

  // ── Mouse Listeners ───────────────────────────────────────────────────────
  _onMouseMove(e) {
    this.mouse.x = e.clientX
    this.mouse.y = e.clientY
    this.mouse.active = true
  }

  _onMouseLeave() {
    this.mouse.active = false
    this.mouse.x = -9999
    this.mouse.y = -9999
  }

  _onVisibilityChange() {
    if (document.visibilityState === "visible") {
      this.lastTime = performance.now()
    }
  }

  // ── Lifecycle & Resize ────────────────────────────────────────────────────
  init() {
    this.handleResize()
    this.createEntities()
  }

  handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = Math.floor(this.width * dpr)
    this.canvas.height = Math.floor(this.height * dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.scale(dpr, dpr)
  }

  createEntities() {
    this.blades = []
    this.motes = []

    if (this.mode === "3d") {
      // 3D Dimensional Anime Warp: 140 speed ribbons
      const count = 140
      for (let i = 0; i < count; i++) {
        this.blades.push(new AnimeWindBlade3D(this.width, this.height, this._rgb, true))
      }
    } else {
      // 2D Anime Horizontal Wind: 48 multi-depth ribbons + 55 atmospheric shimmer motes
      const bladeCount = 48
      for (let i = 0; i < bladeCount; i++) {
        this.blades.push(new AnimeWindBlade2D(this.width, this.height, this._rgb, true))
      }

      const moteCount = 55
      for (let i = 0; i < moteCount; i++) {
        this.motes.push(new WindMote(this.width, this.height, this._rgb))
      }
    }
  }

  // ── Animation Loop ────────────────────────────────────────────────────────
  animate() {
    if (!this._animId) return
    this._animId = requestAnimationFrame(() => this.animate())

    if (document.visibilityState === "hidden") return

    const now = performance.now()
    const elapsed = now - this.lastTime
    this.lastTime = now

    // Delta time normalization: target 60fps (16.67ms per frame), clamp to max 3.0
    const dt = Math.min(elapsed / (1000 / 60), 3.0)
    this.time += 16.67 * dt

    // Natural atmospheric breathing gust cycle (harmonic wind waves)
    const gust = 1.0 + 0.28 * Math.sin(this.time * 0.0008) + 0.14 * Math.sin(this.time * 0.0021)

    this.ctx.clearRect(0, 0, this.width, this.height)

    // Render 2D Motes (Ambient dust and pollen particles)
    if (this.mode === "2d") {
      for (let i = 0; i < this.motes.length; i++) {
        const mote = this.motes[i]
        mote.update(dt, this.width, this.height, this.time, gust, this.mouse)
        mote.draw(this.ctx, this._rgb)
      }
    }

    // Render Wind Blades (Multi-depth parallax ribbons)
    for (let i = 0; i < this.blades.length; i++) {
      const blade = this.blades[i]
      blade.update(dt, this.width, this.height, this.time, gust, this.mouse)
      if (this.mode === "3d") {
        blade.draw(this.ctx, this.width, this.height, this._rgb)
      } else {
        blade.draw(this.ctx, this._rgb)
      }
    }
  }

  start() {
    if (!this._animId) {
      this.canvas.style.display = "block"
      this.handleResize()
      if (this.blades.length === 0) {
        this.createEntities()
      }
      this.lastTime = performance.now()
      this._animId = requestAnimationFrame(() => this.animate())
    }
  }

  stop() {
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    this.canvas.style.display = "none"
    this.blades = []
    this.motes = []
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }
}

