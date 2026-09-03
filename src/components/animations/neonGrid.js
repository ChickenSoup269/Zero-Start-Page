/**
 * NeonGridBackground — Hollywood AAA 3D Synthwave Retro Grid & Neon Sun Engine
 *
 * Implements the 6 Golden Principles:
 *  1. Continuous Infinite 3D Perspective Geometry:
 *     - Smooth Z-space continuous motion without frame stuttering or step jumping.
 *     - Accurate 3D vanishing point perspective with atmospheric distance fog attenuation.
 *  2. Multi-Layer Retro Synthwave Outrun Graphics:
 *     - Ultra HD Retro Sun with procedural horizontal blind slats and radiant corona bloom.
 *     - Wireframe Cyber Horizon Ridge & distant neon mountain skyline.
 *     - Specular central wet-road sun reflection and fast moving neon energy data pulses.
 *     - Fullscreen Cyber Tunnel mode (mirrored top ceiling & bottom floor grids).
 *  3. 60Hz - 240Hz Delta Normalization & Zero-Lag Subpixel Canvas.
 *  4. 100% Backward-Compatible API (updateColor, setOptions, start, stop, destroy, resize).
 */

export class NeonGridBackground {
  constructor(
    canvasId = "effect-canvas",
    gridColor = "#ff007f",
    sunColor = "#ffbe0b",
    fullScreen = false,
  ) {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.destroyed = false
    this.animationFrame = null

    this.gridColor = gridColor || "#ff007f"
    this.sunColor = sunColor || "#ffbe0b"
    this.fullScreen = fullScreen || false

    // Camera & 3D Geometry
    this.fov = 280
    this.spacing = 70
    this.gridWidth = 4400
    this.gridDepth = 2200
    this.minZ = 12

    this.speed = 180 // pixels per second in Z-space
    this.zOffset = 0
    this.lastTime = performance.now()
    this.horizonY = 0

    // Energy Data Streamers
    this.streamers = [
      { x: -350, z: 1800, speed: 850, length: 320, alpha: 0.8 },
      { x: 280, z: 1200, speed: 920, length: 280, alpha: 0.9 },
      { x: 0, z: 2100, speed: 1100, length: 420, alpha: 1.0 },
      { x: -700, z: 1500, speed: 780, length: 260, alpha: 0.7 },
      { x: 630, z: 1900, speed: 840, length: 300, alpha: 0.75 },
    ]

    // Distant Neon Mountain Peaks
    this.mountainPeaks = []

    this._resizeHandler = () => this.resize()
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)
  }

  updateColor(type, color) {
    if (!color) return
    if (type === "grid") this.gridColor = color
    if (type === "sun") this.sunColor = color
    this.sunCache = null
  }

  setOptions(options = {}) {
    if (options.fullScreen !== undefined) {
      this.fullScreen = options.fullScreen
    }
  }

  resize() {
    if (!this.canvas) return
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.pointerEvents = "none"

    this.horizonY = this.height * (this.fullScreen ? 0.5 : 0.44)
    this.sunCache = null
    this._generateMountains()
  }

  _generateMountains() {
    const W = this.width || window.innerWidth
    const segments = Math.max(32, Math.floor(W / 40))
    this.mountainPeaks = []

    // Primary mountain silhouette
    let currentH = 30
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * W
      // Natural jagged mountain ridge variation
      const distFromCenter = Math.abs(i - segments / 2) / (segments / 2)
      const baseHeight = 25 + distFromCenter * 45
      currentH += (Math.random() - 0.5) * 16
      currentH = Math.max(12, Math.min(85, currentH * 0.75 + baseHeight * 0.25))

      this.mountainPeaks.push({ x, h: currentH })
    }
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.lastTime = performance.now()
    }
  }

  project(x, y, z) {
    const scale = this.fov / (this.fov + z)
    const x2d = x * scale + this.width / 2
    const y2d = y * scale + this.horizonY
    return { x: x2d, y: y2d, scale }
  }

  hexToRgb(hex) {
    if (!hex || typeof hex !== "string") return { r: 255, g: 0, b: 127 }
    let clean = hex.replace("#", "")
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
    }
    if (clean.length !== 6) return { r: 255, g: 0, b: 127 }
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    }
  }

  buildSunCache(radius) {
    const offset = radius + 60
    const size = offset * 2

    const offCanvas = document.createElement("canvas")
    offCanvas.width = size
    offCanvas.height = size
    const octx = offCanvas.getContext("2d")

    const cx = offset
    const cy = offset

    // Sun Radial Corona Halo Glow
    const coronaGrad = octx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 1.35)
    coronaGrad.addColorStop(0, this.sunColor)
    coronaGrad.addColorStop(0.55, this.gridColor)
    coronaGrad.addColorStop(1, "rgba(0, 0, 0, 0)")

    octx.save()
    octx.fillStyle = coronaGrad
    octx.globalAlpha = 0.45
    octx.beginPath()
    octx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2)
    octx.fill()
    octx.restore()

    // Vibrant Retro Sun Body
    const sunGrad = octx.createLinearGradient(cx, cy - radius, cx, cy + radius)
    sunGrad.addColorStop(0, "#fff5a0") // White-hot radiant top
    sunGrad.addColorStop(0.2, this.sunColor)
    sunGrad.addColorStop(0.65, this.gridColor)
    sunGrad.addColorStop(1, "#380036") // Deep synthwave magenta bottom

    octx.save()
    octx.shadowColor = this.sunColor
    octx.shadowBlur = 45
    octx.fillStyle = sunGrad

    // Upper Half: Solid semicircle
    octx.beginPath()
    octx.arc(cx, cy, radius, Math.PI, 0)
    octx.fill()

    // Lower Half: Horizontal Laser Cutout Slats
    const numStripes = 9
    for (let i = 0; i < numStripes; i++) {
      const t = (i + 0.1) / numStripes
      const yStart = cy + radius * t
      const gapHeight = 2.5 + i * 2.8 // Progressively wider gaps
      const nextY = cy + radius * ((i + 1) / numStripes)
      const stripeHeight = Math.max(1, nextY - yStart - gapHeight)

      const dy = yStart - cy
      if (dy >= radius) continue
      const xOffset = Math.sqrt(Math.max(0, radius * radius - dy * dy))

      octx.beginPath()
      octx.rect(cx - xOffset, yStart, xOffset * 2, stripeHeight)
      octx.fill()
    }
    octx.restore()

    this.sunCache = {
      canvas: offCanvas,
      radius: radius,
      sunColor: this.sunColor,
      gridColor: this.gridColor,
      offset: offset,
    }
  }

  drawSun(ctx, cx, cy) {
    const radius = Math.min(this.width, this.height) * (this.fullScreen ? 0.22 : 0.26)

    if (
      !this.sunCache ||
      this.sunCache.radius !== radius ||
      this.sunCache.sunColor !== this.sunColor ||
      this.sunCache.gridColor !== this.gridColor
    ) {
      this.buildSunCache(radius)
    }

    ctx.drawImage(
      this.sunCache.canvas,
      cx - this.sunCache.offset,
      cy - this.sunCache.offset - radius * 0.15,
    )
  }

  drawMountains(ctx) {
    if (this.mountainPeaks.length < 2) return
    const hy = this.horizonY
    const { r, g, b } = this.hexToRgb(this.gridColor)

    ctx.save()
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`
    ctx.lineWidth = 1.2
    ctx.shadowColor = this.gridColor
    ctx.shadowBlur = 10

    // Mountain wireframe ridge
    ctx.beginPath()
    ctx.moveTo(this.mountainPeaks[0].x, hy - this.mountainPeaks[0].h)
    for (let i = 1; i < this.mountainPeaks.length; i++) {
      ctx.lineTo(this.mountainPeaks[i].x, hy - this.mountainPeaks[i].h)
    }
    ctx.stroke()

    // Mountain body fill with deep dark horizon fade
    ctx.lineTo(this.width, hy)
    ctx.lineTo(0, hy)
    ctx.closePath()
    ctx.fillStyle = "rgba(10, 0, 24, 0.75)"
    ctx.fill()
    ctx.restore()
  }

  start() {
    if (this.active || this.destroyed || !this.canvas) return
    this.active = true
    this.lastTime = performance.now()
    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"

    this.resize()

    const loop = (time) => {
      if (!this.active || this.destroyed) return
      this.animationFrame = requestAnimationFrame(loop)

      if (document.visibilityState === "hidden") {
        this.lastTime = time
        return
      }

      const elapsed = Math.min(time - this.lastTime, 100)
      this.lastTime = time
      const dt = Math.min(elapsed / 1000, 0.1)

      this.update(dt)
      this.draw()
    }

    this.animationFrame = requestAnimationFrame(loop)
  }

  stop() {
    this.active = false
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.canvas) {
      this.canvas.style.display = "none"
    }
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
    this.sunCache = null
  }

  update(dt) {
    // Continuous Z-displacement progression
    this.zOffset = (this.zOffset + this.speed * dt) % this.spacing

    // Update Energy Data Streamers
    for (const st of this.streamers) {
      st.z -= st.speed * dt
      if (st.z < this.minZ) {
        st.z = this.gridDepth + Math.random() * 400
        st.x = (Math.random() - 0.5) * (this.gridWidth * 0.45)
      }
    }
  }

  draw() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height
    const hy = this.horizonY
    const { r, g, b } = this.hexToRgb(this.gridColor)

    // 1. Clear / Sky Backdrop
    if (this.fullScreen) {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H)
      skyGrad.addColorStop(0, "#050012")
      skyGrad.addColorStop(0.5, "#180028")
      skyGrad.addColorStop(1, "#050012")
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, W, H)
    } else {
      ctx.clearRect(0, 0, W, H)
    }

    // 2. Draw Retro Synthwave Sun
    this.drawSun(ctx, W / 2, hy)

    // 3. Draw Distant Cyber Mountains
    this.drawMountains(ctx)

    // 4. Central Wet-Floor Sun Specular Reflection on Grid
    const reflGrad = ctx.createLinearGradient(W * 0.35, hy, W * 0.65, hy)
    reflGrad.addColorStop(0, "rgba(0,0,0,0)")
    reflGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.28)`)
    reflGrad.addColorStop(1, "rgba(0,0,0,0)")

    ctx.save()
    ctx.fillStyle = reflGrad
    ctx.fillRect(W * 0.3, hy, W * 0.4, H - hy)
    ctx.restore()

    // 5. Draw 3D Volumetric Grid Floors (and Ceiling in Fullscreen)
    const gridY = H - hy + 120
    const gridYs = this.fullScreen ? [gridY, -gridY] : [gridY]

    for (const gy of gridYs) {
      ctx.save()
      ctx.shadowColor = this.gridColor
      ctx.shadowBlur = 12

      // ── Transverse Moving Horizontal Lines ──
      for (let z = this.minZ + this.spacing - this.zOffset; z < this.gridDepth; z += this.spacing) {
        const depthFactor = 1 - z / this.gridDepth
        const alpha = Math.max(0, Math.pow(depthFactor, 1.4))

        const p1 = this.project(-this.gridWidth / 2, gy, z)
        const p2 = this.project(this.gridWidth / 2, gy, z)

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.9).toFixed(3)})`
        ctx.lineWidth = Math.max(1.0, (1.8 * p1.scale * 1.5))
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }

      // ── Longitudinal Perspective Lines (Radiating to vanishing point) ──
      const centerP1 = this.project(0, gy, this.minZ)
      const centerP2 = this.project(0, gy, this.gridDepth)
      const grad = ctx.createLinearGradient(centerP1.x, centerP1.y, centerP2.x, centerP2.y)
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`)
      grad.addColorStop(0.65, `rgba(${r}, ${g}, ${b}, 0.5)`)
      grad.addColorStop(1, "rgba(0, 0, 0, 0)")

      ctx.strokeStyle = grad
      ctx.beginPath()

      const step = this.spacing * 1.6
      for (let x = -this.gridWidth / 2; x <= this.gridWidth / 2; x += step) {
        const p1 = this.project(x, gy, this.minZ)
        const p2 = this.project(x, gy, this.gridDepth)
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
      }
      ctx.lineWidth = 1.4
      ctx.stroke()

      // ── Fast Data Pulse Streamers ──
      if (gy > 0) {
        for (const st of this.streamers) {
          const zStart = Math.min(this.gridDepth, st.z + st.length)
          const zEnd = Math.max(this.minZ, st.z)
          if (zEnd >= this.gridDepth || zStart <= this.minZ) continue

          const pStart = this.project(st.x, gy, zStart)
          const pEnd = this.project(st.x, gy, zEnd)

          const pulseGrad = ctx.createLinearGradient(pStart.x, pStart.y, pEnd.x, pEnd.y)
          pulseGrad.addColorStop(0, "rgba(255, 255, 255, 0)")
          pulseGrad.addColorStop(0.7, "#ffffff")
          pulseGrad.addColorStop(1, this.sunColor)

          ctx.strokeStyle = pulseGrad
          ctx.lineWidth = Math.max(2.0, 3.5 * pEnd.scale * 1.5)
          ctx.beginPath()
          ctx.moveTo(pStart.x, pStart.y)
          ctx.lineTo(pEnd.x, pEnd.y)
          ctx.stroke()
        }
      }

      ctx.restore()
    }

    // 6. Horizon Laser Bloom & Light Flare
    ctx.save()
    const horizonGlow = ctx.createLinearGradient(0, hy - 4, 0, hy + 6)
    horizonGlow.addColorStop(0, "rgba(0,0,0,0)")
    horizonGlow.addColorStop(0.5, `rgba(255, 255, 255, 0.75)`)
    horizonGlow.addColorStop(1, "rgba(0,0,0,0)")

    ctx.fillStyle = horizonGlow
    ctx.fillRect(0, hy - 4, W, 10)
    ctx.restore()
  }
}
