/**
 * SakuraEffect (Cherry Blossoms HD)
 * 
 * Hyper-realistic, high-performance Sakura (Cherry Blossoms) simulation.
 * Features:
 *  - Organic petal geometry with realistic notched tips, curved silhouettes, and mini 5-petal blossoms.
 *  - Full 3D tumbling physics (pitch, roll, yaw) with dynamic aerodynamic drag and two-sided 3D lighting.
 *  - Multi-depth layering (foreground, midground, background) with perspective scaling and alpha blending.
 *  - Realistic translucency, stem-to-tip color gradients, and delicate vein highlights.
 *  - Dynamic spring wind system with ambient breeze, natural turbulence, and periodic soft gusts.
 *  - Interactive cursor breeze wake: gently stirs and swirls nearby falling petals.
 *  - Responsive color management supporting live color palette updates.
 */

export class SakuraEffect {
  constructor(canvasId, color = "#ffb7c5") {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) {
      console.warn(`[SakuraEffect] Canvas element #${canvasId} not found.`)
      return
    }
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this._animId = null
    this.lastDrawTime = 0

    // Color & Palette setup
    this._color = color || "#ffb7c5"
    this._palette = this._computePalette(this._color)

    // Petals & Configuration
    this.petals = []
    this.petalCount = 65

    // Wind Dynamics
    this.wind = {
      base: 0.8,
      current: 0.8,
      target: 0.8,
      gustTimer: 0,
      gustDuration: 0,
      gustStrength: 0,
      time: 0,
    }

    // Mouse Interaction
    this.mouse = {
      x: -9999,
      y: -9999,
      prevX: -9999,
      prevY: -9999,
      vx: 0,
      vy: 0,
      speed: 0,
      radius: 120,
      active: false,
    }

    // Bind event handlers
    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseLeaveHandler = () => this._onMouseLeave()

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseleave", this._mouseLeaveHandler, { passive: true })
  }

  // ── Color Properties & Setters ─────────────────────────────────────────────

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
      base: rgb,
      // Deeper rose/magenta tint for petal base / stem attachment
      stem: {
        r: Math.max(0, Math.round(rgb.r * 0.82)),
        g: Math.max(0, Math.round(rgb.g * 0.45)),
        b: Math.max(0, Math.round(rgb.b * 0.65)),
      },
      // Soft translucent highlight for the notched outer tips
      tip: {
        r: Math.min(255, rgb.r + 35),
        g: Math.min(255, rgb.g + 35),
        b: Math.min(255, rgb.b + 35),
      },
      // Slightly deeper shade for the petal underside during 3D flips
      underside: {
        r: Math.max(0, Math.round(rgb.r * 0.92)),
        g: Math.max(0, Math.round(rgb.g * 0.78)),
        b: Math.max(0, Math.round(rgb.b * 0.88)),
      },
      // Delicate vein stroke color
      vein: {
        r: Math.max(0, Math.round(rgb.r * 0.75)),
        g: Math.max(0, Math.round(rgb.g * 0.4)),
        b: Math.max(0, Math.round(rgb.b * 0.55)),
      },
    }
  }

  // ── Sizing & Setup ─────────────────────────────────────────────────────────

  resize() {
    if (!this.canvas) return
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    if (this.active) {
      this.initPetals()
    }
  }

  initPetals() {
    this.petals = []
    const count = this.petalCount
    for (let i = 0; i < count; i++) {
      this.petals.push(this.createPetal(true))
    }
  }

  // ── Petal Factory ──────────────────────────────────────────────────────────

  createPetal(scattered = false) {
    const depth = Math.random() // 0 (far/background) to 1 (near/foreground)
    const baseSize = 8 + depth * 11 // 8px to 19px

    // Petal types:
    // 0: Classic notched sakura petal
    // 1: Asymmetric curved petal (curled side)
    // 2: Slender graceful petal
    // 3: Rare intact mini 5-petal blossom cluster (~6% chance)
    const isBlossom = Math.random() < 0.06
    const type = isBlossom ? 3 : Math.floor(Math.random() * 3)

    return {
      x: Math.random() * this.canvas.width,
      y: scattered
        ? Math.random() * this.canvas.height
        : Math.random() * -300 - 30,
      z: depth,
      size: isBlossom ? baseSize * 1.3 : baseSize,
      aspectRatio: 1.25 + Math.random() * 0.35, // elongation ratio
      type: type,

      // Fall speed scaled with depth for parallax
      speedY: (0.7 + depth * 0.95 + Math.random() * 0.35),
      speedX: (Math.random() - 0.5) * 0.4,

      // 3D Rotations (Euler angles)
      angleZ: Math.random() * Math.PI * 2, // 2D planar rotation (yaw)
      rotationSpeedZ: (Math.random() - 0.5) * 0.025,

      angleX: Math.random() * Math.PI * 2, // 3D pitch (tumbling flip)
      rotationSpeedX: 0.015 + Math.random() * 0.035,

      angleY: Math.random() * Math.PI * 2, // 3D roll (fluttering side-to-side)
      rotationSpeedY: 0.01 + Math.random() * 0.025,

      // Aerodynamic oscillation
      swayOffset: Math.random() * Math.PI * 2,
      swaySpeed: 0.012 + Math.random() * 0.018,
      swayAmp: 1.2 + depth * 1.8,

      // Base opacity (background softer, foreground crisp)
      baseOpacity: 0.4 + depth * 0.55,
      opacity: 0.4 + depth * 0.55,

      // Per-petal wind resistance
      windSensitivity: 0.7 + depth * 0.5 + Math.random() * 0.3,

      // Gentle individual curl/asymmetry
      curl: (Math.random() - 0.5) * 0.25,
    }
  }

  // ── Mouse Wake Interaction ─────────────────────────────────────────────────

  _onMouseMove(e) {
    const curX = e.clientX
    const curY = e.clientY

    if (this.mouse.prevX !== -9999) {
      this.mouse.vx = curX - this.mouse.prevX
      this.mouse.vy = curY - this.mouse.prevY
      this.mouse.speed = Math.min(
        Math.hypot(this.mouse.vx, this.mouse.vy),
        40
      )
    }

    this.mouse.prevX = curX
    this.mouse.prevY = curY
    this.mouse.x = curX
    this.mouse.y = curY
    this.mouse.active = true
  }

  _onMouseLeave() {
    this.mouse.active = false
    this.mouse.x = -9999
    this.mouse.y = -9999
    this.mouse.prevX = -9999
    this.mouse.prevY = -9999
    this.mouse.vx = 0
    this.mouse.vy = 0
    this.mouse.speed = 0
  }

  // ── Lifecycle Methods ──────────────────────────────────────────────────────

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.initPetals()
    this.canvas.style.display = "block"
    this.animate(performance.now())
  }

  stop() {
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    this.active = false
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.canvas.style.display = "none"
    }
    this.petals = []
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
  }

  // ── Petal Geometry Path Builders ───────────────────────────────────────────

  /**
   * Draws realistic Sakura Petal Silhouette with signature notched tip.
   * Coordinate origin (0, 0) is at petal center.
   */
  _buildSakuraPetalPath(ctx, size, curl = 0, type = 0) {
    const w = size * 0.72
    const h = size * 1.15

    ctx.beginPath()

    if (type === 0) {
      // Classic Notched Petal
      const baseEndY = h * 0.65
      const topLobeY = -h * 0.7
      const notchY = -h * 0.52

      ctx.moveTo(0, baseEndY)
      // Left outer curve
      ctx.bezierCurveTo(-w * 0.65, h * 0.35, -w * 0.95, -h * 0.1, -w * 0.62, topLobeY)
      // Left notch inward curve
      ctx.bezierCurveTo(-w * 0.35, topLobeY * 1.05, -w * 0.12, notchY * 1.05, 0, notchY)
      // Right notch outward curve
      ctx.bezierCurveTo(w * 0.12, notchY * 1.05, w * 0.35, topLobeY * 1.05, w * 0.62, topLobeY)
      // Right outer curve
      ctx.bezierCurveTo(w * 0.95, -h * 0.1, w * 0.65, h * 0.35, 0, baseEndY)
    } else if (type === 1) {
      // Asymmetric curled petal
      const baseEndY = h * 0.65
      const leftTopY = -h * 0.74
      const rightTopY = -h * 0.64
      const notchY = -h * 0.5 + curl * h * 0.2

      ctx.moveTo(0, baseEndY)
      ctx.bezierCurveTo(-w * (0.6 + curl), h * 0.38, -w * 1.0, -h * 0.12, -w * 0.58, leftTopY)
      ctx.bezierCurveTo(-w * 0.3, leftTopY * 1.05, -w * 0.08, notchY * 1.05, 0, notchY)
      ctx.bezierCurveTo(w * 0.08, notchY * 1.05, w * 0.38, rightTopY * 1.05, w * 0.68, rightTopY)
      ctx.bezierCurveTo(w * 0.88, -h * 0.05, w * 0.58, h * 0.35, 0, baseEndY)
    } else {
      // Slender petal with delicate deep cleft
      const baseEndY = h * 0.7
      const topLobeY = -h * 0.72
      const notchY = -h * 0.46

      ctx.moveTo(0, baseEndY)
      ctx.bezierCurveTo(-w * 0.55, h * 0.3, -w * 0.82, -h * 0.15, -w * 0.5, topLobeY)
      ctx.bezierCurveTo(-w * 0.25, topLobeY * 1.02, -w * 0.08, notchY, 0, notchY)
      ctx.bezierCurveTo(w * 0.08, notchY, w * 0.25, topLobeY * 1.02, w * 0.5, topLobeY)
      ctx.bezierCurveTo(w * 0.82, -h * 0.15, w * 0.55, h * 0.3, 0, baseEndY)
    }

    ctx.closePath()
  }

  // ── Petal Rendering ────────────────────────────────────────────────────────

  _drawSinglePetal(petal, p, flipScaleX, flipScaleY) {
    const ctx = this.ctx
    const s = petal.size
    const isUnderside = flipScaleX < 0 !== flipScaleY < 0

    // Choose base tint (slightly deeper/shaded when viewing underside during 3D tumble)
    const baseColor = isUnderside ? p.underside : p.base
    const stemColor = p.stem
    const tipColor = p.tip

    // Organic linear gradient along petal axis (stem -> body -> tip)
    const grad = ctx.createLinearGradient(0, s * 0.65, 0, -s * 0.75)
    grad.addColorStop(0, `rgba(${stemColor.r}, ${stemColor.g}, ${stemColor.b}, ${petal.opacity * 0.95})`)
    grad.addColorStop(0.35, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${petal.opacity * 0.88})`)
    grad.addColorStop(0.85, `rgba(${tipColor.r}, ${tipColor.g}, ${tipColor.b}, ${petal.opacity * 0.78})`)
    grad.addColorStop(1, `rgba(255, 255, 255, ${petal.opacity * 0.85})`)

    // Build shape and fill
    this._buildSakuraPetalPath(ctx, s, petal.curl, petal.type)
    ctx.fillStyle = grad
    ctx.fill()

    // Delicate translucent center vein (midrib)
    if (petal.z > 0.35) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(0, s * 0.6)
      ctx.quadraticCurveTo(
        petal.curl * s * 0.3,
        -s * 0.1,
        0,
        -s * 0.45
      )
      ctx.strokeStyle = `rgba(${p.vein.r}, ${p.vein.g}, ${p.vein.b}, ${petal.opacity * 0.28})`
      ctx.lineWidth = Math.max(0.6, s * 0.05)
      ctx.stroke()
      ctx.restore()
    }

    // Soft specular highlight on front side
    if (!isUnderside && petal.z > 0.45) {
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(-s * 0.12, -s * 0.1, s * 0.22, s * 0.45, -0.2, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${petal.opacity * 0.25})`
      ctx.fill()
      ctx.restore()
    }

    // Subtle edge boundary glow for foreground particles
    if (petal.z > 0.65) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${petal.opacity * 0.3})`
      ctx.lineWidth = 0.4
      ctx.stroke()
    }
  }

  _drawBlossomFlower(petal, p) {
    const ctx = this.ctx
    const s = petal.size * 0.65
    const petalCount = 5

    // Draw 5 radiating sakura petals
    for (let i = 0; i < petalCount; i++) {
      ctx.save()
      const angle = (i / petalCount) * Math.PI * 2
      ctx.rotate(angle)
      ctx.translate(0, -s * 0.6)

      const grad = ctx.createLinearGradient(0, s * 0.5, 0, -s * 0.6)
      grad.addColorStop(0, `rgba(${p.stem.r}, ${p.stem.g}, ${p.stem.b}, ${petal.opacity * 0.95})`)
      grad.addColorStop(0.4, `rgba(${p.base.r}, ${p.base.g}, ${p.base.b}, ${petal.opacity * 0.88})`)
      grad.addColorStop(1, `rgba(${p.tip.r}, ${p.tip.g}, ${p.tip.b}, ${petal.opacity * 0.82})`)

      this._buildSakuraPetalPath(ctx, s * 0.75, 0, 0)
      ctx.fillStyle = grad
      ctx.fill()

      ctx.restore()
    }

    // Pistil / Stamens center
    ctx.save()
    // Center glow
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${p.stem.r}, ${p.stem.g}, ${p.stem.b}, ${petal.opacity * 0.9})`
    ctx.fill()

    // Little golden stamen dots
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2
      const dist = s * 0.18
      ctx.beginPath()
      ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, Math.max(0.7, s * 0.04), 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 225, 120, ${petal.opacity * 0.95})`
      ctx.fill()
    }
    ctx.restore()
  }

  // ── Main Animation Loop ────────────────────────────────────────────────────

  animate(currentTime = 0) {
    if (!this.active) return

    this._animId = requestAnimationFrame((t) => this.animate(t))
    if (document.visibilityState === "hidden") return

    const elapsed = currentTime - this.lastDrawTime
    // Clamp delta time to prevent massive jumps when switching tabs
    const deltaTime = Math.min(elapsed / (1000 / 60), 3.0)
    this.lastDrawTime = currentTime

    const W = this.canvas.width
    const H = this.canvas.height
    this.ctx.clearRect(0, 0, W, H)

    // 1. Update Global Wind Dynamics
    this.wind.time += 0.015 * deltaTime
    // Periodic breeze oscillation
    const baseBreeze = Math.sin(this.wind.time * 0.6) * 0.6 + Math.cos(this.wind.time * 0.25) * 0.4 + 0.5

    // Wind gusts
    this.wind.gustTimer -= deltaTime
    if (this.wind.gustTimer <= 0) {
      // Trigger new gust
      this.wind.gustTimer = 220 + Math.random() * 320
      this.wind.gustDuration = 90 + Math.random() * 120
      this.wind.gustStrength = 1.2 + Math.random() * 1.8
    }

    let gustFactor = 0
    if (this.wind.gustDuration > 0) {
      this.wind.gustDuration -= deltaTime
      gustFactor = Math.sin((this.wind.gustDuration / 100) * Math.PI) * this.wind.gustStrength
    }

    const currentGlobalWindX = (baseBreeze + Math.max(0, gustFactor))

    // Smooth mouse speed decay
    if (this.mouse.active) {
      this.mouse.speed *= 0.92
    }

    const p = this._palette

    // 2. Update & Draw Petals
    const len = this.petals.length
    for (let i = 0; i < len; i++) {
      const petal = this.petals[i]

      // Aerodynamic 3D pitch/roll tumbling
      petal.angleZ += petal.rotationSpeedZ * deltaTime
      petal.angleX += petal.rotationSpeedX * deltaTime
      petal.angleY += petal.rotationSpeedY * deltaTime
      petal.swayOffset += petal.swaySpeed * deltaTime

      // 3D Projection scale factors (pitch & roll foreshortening)
      const flipScaleX = Math.cos(petal.angleX)
      const flipScaleY = Math.sin(petal.angleY) * 0.65 + 0.35

      // Aerodynamic lift and drag:
      // When petal faces broadside (horizontal), it drops slower and drifts wider.
      // When it flips edge-on, it drops faster (stalls).
      const broadsideFactor = Math.abs(flipScaleX * flipScaleY)
      const fallMultiplier = 0.55 + 0.55 * (1 - broadsideFactor * 0.6)

      // Apply vertical and horizontal velocities
      petal.y += petal.speedY * fallMultiplier * deltaTime
      const sway = Math.sin(petal.swayOffset) * petal.swayAmp
      const windPush = currentGlobalWindX * petal.windSensitivity
      petal.x += (sway + windPush + petal.speedX) * deltaTime

      // 3. Mouse wake effect (gentle cursor interaction)
      if (this.mouse.active) {
        const dx = petal.x - this.mouse.x
        const dy = petal.y - this.mouse.y
        const distSq = dx * dx + dy * dy
        const radius = this.mouse.radius
        if (distSq < radius * radius && distSq > 1) {
          const dist = Math.sqrt(distSq)
          const force = (1 - dist / radius) * (this.mouse.speed * 0.15 + 1.2)
          petal.x += (dx / dist) * force * deltaTime
          petal.y += (dy / dist) * force * 0.6 * deltaTime
          petal.angleZ += (dx > 0 ? 0.06 : -0.06) * force * deltaTime
          petal.angleX += 0.08 * force * deltaTime
        }
      }

      // 4. Render Petal with 3D Transforms
      this.ctx.save()
      this.ctx.translate(petal.x, petal.y)
      this.ctx.rotate(petal.angleZ)
      this.ctx.scale(flipScaleX, flipScaleY)

      if (petal.type === 3) {
        this._drawBlossomFlower(petal, p)
      } else {
        this._drawSinglePetal(petal, p, flipScaleX, flipScaleY)
      }

      this.ctx.restore()

      // 5. Recycle Petals when offscreen
      if (petal.y > H + 60) {
        const fresh = this.createPetal(false)
        Object.assign(petal, fresh)
      }

      // Wrap horizontal boundaries smoothly
      if (petal.x > W + 80) {
        petal.x = -60
      } else if (petal.x < -80) {
        petal.x = W + 60
      }
    }
  }

  // ── Color Conversion Utilities ─────────────────────────────────────────────

  hexToRgb(hex) {
    if (!hex) return { r: 255, g: 183, b: 197 }
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
      : { r: 255, g: 183, b: 197 }
  }
}
