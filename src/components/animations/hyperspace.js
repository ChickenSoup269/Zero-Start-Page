/**
 * Hyperspace Effect - Ultra-Smooth 3D Relativistic Warp Drive & Space Tunnel
 * Features 3D perspective projection, silky smooth warp streaks, gentle flight steering,
 * multi-style warp modes (Warp Drive, Cyber Tunnel, Cosmic Vortex), and 60-144+ FPS performance.
 */

export class HyperspaceEffect {
  /**
   * @param {string|HTMLCanvasElement} canvasId
   * @param {string|Object} [colorOrOptions="#00e5ff"]
   * @param {Object} [options={}]
   */
  constructor(canvasId, colorOrOptions = "#00e5ff", options = {}) {
    this.canvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId
    if (!this.canvas) return

    let opts = {}
    if (typeof colorOrOptions === "object" && colorOrOptions !== null) {
      opts = colorOrOptions
    } else {
      opts = {
        color: colorOrOptions || "#00e5ff",
        ...options,
      }
    }

    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this.animationId = null
    this.lastTime = 0
    this.time = 0

    // Configuration
    this.color = opts.color || "#00e5ff"
    this.speed = typeof opts.speed === "number" ? Math.max(0.1, Math.min(8.0, opts.speed)) : 1.8
    this.numStars = typeof opts.count === "number" ? Math.max(300, Math.min(2500, opts.count)) : 1100
    this.style = opts.style || "warpDrive" // "warpDrive", "cyberTunnel", "vortexHole"
    this.transparent = !!opts.transparent

    this.maxZ = 2000
    this.fov = 340
    this.stars = []

    // 3D Flight Camera & Mouse Steering
    this.camera = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
    }

    this._updateRgb(this.color)

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._handleMouseMove(e)
    this._mouseLeaveHandler = () => this._handleMouseLeave()

    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    document.addEventListener("mouseleave", this._mouseLeaveHandler)

    this.resize()
  }

  _updateRgb(hex) {
    if (!hex || typeof hex !== "string" || !hex.startsWith("#") || hex.length < 7) {
      hex = "#00e5ff"
    }
    const r = parseInt(hex.slice(1, 3), 16) || 0
    const g = parseInt(hex.slice(3, 5), 16) || 229
    const b = parseInt(hex.slice(5, 7), 16) || 255
    this._rgb = { r, g, b }
    this._rgbStr = `${r}, ${g}, ${b}`
  }

  updateColor(color) {
    this.color = color
    this._updateRgb(color)
  }

  setSpeed(speed) {
    this.speed = Math.max(0.1, Math.min(8.0, Number(speed) || 1.8))
  }

  setStarCount(count) {
    this.numStars = Math.max(300, Math.min(2500, Number(count) || 1100))
    this.initStars()
  }

  setStyle(style) {
    this.style = style || "warpDrive"
  }

  setTransparent(transparent) {
    this.transparent = !!transparent
  }

  _handleMouseMove(e) {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight
    this.camera.targetX = (e.clientX - W / 2) * 0.35
    this.camera.targetY = (e.clientY - H / 2) * 0.35
  }

  _handleMouseLeave() {
    this.camera.targetX = 0
    this.camera.targetY = 0
  }

  resize() {
    if (!this.canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = Math.floor(this.width * dpr)
    this.canvas.height = Math.floor(this.height * dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`

    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.scale(dpr, dpr)

    this.centerX = this.width / 2
    this.centerY = this.height / 2
    this.initStars()
  }

  initStars() {
    this.stars = []
    const spread = Math.max(this.width, this.height) * 1.5

    for (let i = 0; i < this.numStars; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.pow(Math.random(), 0.6) * spread + 20

      this.stars.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: Math.random() * this.maxZ,
        prevZ: 0,
        size: Math.random() * 1.5 + 0.7,
        speedMultiplier: Math.random() * 0.3 + 0.85,
        angle: angle,
        radius: radius,
        brightness: Math.random() * 0.35 + 0.65,
      })
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastTime = performance.now()
    this.canvas.style.display = "block"
    this.animate(this.lastTime)
  }

  stop() {
    this.active = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.width, this.height)
    }
    this.canvas.style.display = "none"
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    document.removeEventListener("mouseleave", this._mouseLeaveHandler)
    this.stars = []
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this.animationId = requestAnimationFrame((t) => this.animate(t))
    if (document.visibilityState === "hidden") return

    const elapsed = currentTime - this.lastTime
    if (elapsed < 1) return
    const dt = Math.min(elapsed / 16.67, 3.0) // Normalize to 60fps
    this.lastTime = currentTime

    this.time += 0.008 * dt

    // Silky smooth camera steering towards cursor
    this.camera.x += (this.camera.targetX - this.camera.x) * 0.04 * dt
    this.camera.y += (this.camera.targetY - this.camera.y) * 0.04 * dt

    const ctx = this.ctx
    const W = this.width
    const H = this.height
    const cx = this.centerX + this.camera.x
    const cy = this.centerY + this.camera.y

    // Background Rendering
    if (this.transparent) {
      ctx.clearRect(0, 0, W, H)
    } else {
      // Cosmic Deep Void Gradient with central warp radiance
      const bgGrad = ctx.createRadialGradient(
        cx,
        cy,
        20,
        cx,
        cy,
        Math.max(W, H) * 0.85,
      )
      bgGrad.addColorStop(0, `rgba(${Math.round(this._rgb.r * 0.1)}, ${Math.round(this._rgb.g * 0.1)}, ${Math.round(this._rgb.b * 0.14)}, 0.95)`)
      bgGrad.addColorStop(0.5, "rgba(2, 4, 10, 0.95)")
      bgGrad.addColorStop(1, "rgba(1, 2, 4, 0.98)")
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)
    }

    // Central Warp Singularity Glow
    this._drawCentralGlow(cx, cy)

    // Render Mode Specific Visuals
    if (this.style === "cyberTunnel") {
      this._drawCyberTunnel(cx, cy, dt)
    } else if (this.style === "vortexHole") {
      this._drawVortexOverlay(cx, cy, dt)
    }

    // Render 3D Relativistic Warp Starfield
    this._drawWarpStars(cx, cy, dt)
  }

  _drawCentralGlow(cx, cy) {
    const ctx = this.ctx
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    const pulse = 1 + Math.sin(this.time * 2) * 0.08
    const glowRadius = Math.min(this.width, this.height) * 0.18 * pulse

    const glowGrad = ctx.createRadialGradient(
      cx,
      cy,
      0,
      cx,
      cy,
      glowRadius,
    )
    glowGrad.addColorStop(0, `rgba(255, 255, 255, 0.35)`)
    glowGrad.addColorStop(0.25, `rgba(${this._rgbStr}, 0.2)`)
    glowGrad.addColorStop(0.65, `rgba(${this._rgbStr}, 0.05)`)
    glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)")

    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  _drawCyberTunnel(cx, cy, dt) {
    const ctx = this.ctx
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    const time = this.time
    const speed = this.speed * 3.5
    const sides = 6 // Hexagonal Cyber Tunnel
    const ringSpacing = 160
    const tunnelRadius = 480

    // Draw concentric 3D Hexagon rings moving towards camera
    for (let z = this.maxZ; z > 40; z -= ringSpacing) {
      const curZ = z - ((time * speed * 20) % ringSpacing)
      if (curZ <= 30) continue

      const scale = this.fov / curZ
      const r = tunnelRadius * scale
      const alpha = Math.min(0.7, (1 - curZ / this.maxZ) * 0.5)

      ctx.strokeStyle = `rgba(${this._rgbStr}, ${alpha})`
      ctx.lineWidth = Math.max(1, scale * 3.0)

      // Hexagonal vertices
      ctx.beginPath()
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2 + this.time * 0.15
        const px = cx + Math.cos(a) * r
        const py = cy + Math.sin(a) * r
        if (s === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
    }

    // 3D Longitudinal Grid Beams from center to screen boundaries
    const numBeams = 6
    const beamDist = Math.max(this.width, this.height) * 1.2
    for (let b = 0; b < numBeams; b++) {
      const a = (b / numBeams) * Math.PI * 2 + this.time * 0.15
      ctx.beginPath()
      ctx.strokeStyle = `rgba(${this._rgbStr}, 0.12)`
      ctx.lineWidth = 1.0
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(a) * beamDist, cy + Math.sin(a) * beamDist)
      ctx.stroke()
    }

    ctx.restore()
  }

  _drawVortexOverlay(cx, cy, dt) {
    const ctx = this.ctx
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    const arms = 3
    const maxRadius = Math.max(this.width, this.height) * 0.75
    const rotSpeed = this.time * 0.6

    for (let i = 0; i < arms; i++) {
      const baseAngle = (i / arms) * Math.PI * 2 + rotSpeed
      ctx.beginPath()
      ctx.strokeStyle = `rgba(${this._rgbStr}, 0.12)`
      ctx.lineWidth = 2.0

      for (let r = 20; r < maxRadius; r += 16) {
        const spiralAngle = baseAngle + Math.log(r * 0.05) * 1.6
        const x = cx + Math.cos(spiralAngle) * r
        const y = cy + Math.sin(spiralAngle) * r
        if (r === 20) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    ctx.restore()
  }

  _drawWarpStars(cx, cy, dt) {
    const ctx = this.ctx
    const fov = this.fov
    const maxZ = this.maxZ
    // Slower, serene, silky smooth speed step
    const speedFactor = this.speed * 4.5 * dt
    const streakMult = Math.min(2.0, 0.35 + this.speed * 0.12)
    const isVortex = this.style === "vortexHole"

    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.lineCap = "round"

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i]

      // Gentle vortex swirl
      if (isVortex) {
        const angularVel = (0.006 * (1 + (maxZ - star.z) / maxZ * 2.0)) * dt
        star.angle += angularVel
        star.x = Math.cos(star.angle) * star.radius
        star.y = Math.sin(star.angle) * star.radius
      }

      star.prevZ = star.z
      star.z -= speedFactor * star.speedMultiplier

      // Reset star when passing behind camera with randomized spawn depth to eliminate banding
      if (star.z <= 2) {
        star.z = maxZ + Math.random() * 80
        star.prevZ = star.z
        const angle = Math.random() * Math.PI * 2
        const radius = Math.pow(Math.random(), 0.6) * Math.max(this.width, this.height) * 1.5 + 20
        star.x = Math.cos(angle) * radius
        star.y = Math.sin(angle) * radius
        star.angle = angle
        star.radius = radius
      }

      // Relativistic 3D perspective projection
      const k = fov / star.z
      const px = cx + star.x * k
      const py = cy + star.y * k

      // Discard stars outside visible viewport buffer
      if (px < -100 || px > this.width + 100 || py < -100 || py > this.height + 100) {
        continue
      }

      // Calculate streak tail in 3D
      const tailZ = Math.min(maxZ, star.z + speedFactor * star.speedMultiplier * streakMult * (1 + (maxZ - star.z) / 450))
      const prevK = fov / tailZ
      const prevPx = cx + star.x * prevK
      const prevPy = cy + star.y * prevK

      // Smooth depth fading (fade in from deep void, fade out close to viewer)
      const proximity = 1 - star.z / maxZ
      let depthFade = 1.0
      if (star.z > maxZ * 0.75) {
        depthFade = (maxZ - star.z) / (maxZ * 0.25)
      } else if (star.z < 60) {
        depthFade = star.z / 60
      }

      const alpha = Math.min(1, Math.max(0.05, proximity * 1.15 * star.brightness * depthFade))
      const lineWidth = Math.max(0.8, Math.min(3.8, k * star.size * 1.3))

      // Draw Warp Streak Gradient
      const grad = ctx.createLinearGradient(prevPx, prevPy, px, py)
      grad.addColorStop(0, `rgba(${this._rgbStr}, 0)`)
      grad.addColorStop(0.65, `rgba(${this._rgbStr}, ${alpha * 0.7})`)
      grad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`)

      ctx.strokeStyle = grad
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      ctx.moveTo(prevPx, prevPy)
      ctx.lineTo(px, py)
      ctx.stroke()

      // Subtle bright pinpoint star head
      if (proximity > 0.4 && depthFade > 0.3) {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`
        ctx.beginPath()
        ctx.arc(px, py, lineWidth * 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.restore()
  }
}


