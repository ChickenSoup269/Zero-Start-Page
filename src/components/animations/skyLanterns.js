/**
 * SkyLanternsEffect (Đèn Hoa Đăng / Sky Lanterns Ultra HD)
 *
 * Cinematic festival simulation of glowing traditional lanterns floating gracefully into the night sky.
 * Features:
 *  - Multi-depth 3D atmospheric parallax (vast distant festival horizon + detailed foreground lanterns).
 *  - Organic paper translucency gradients & subsurface scattering glowing from the internal candle flame.
 *  - Realistic bamboo frame ribs, wooden structural collar rings, and physics-driven swinging tassels.
 *  - Dynamic candle flicker with Perlin-style smooth harmonic noise.
 *  - Thermal buoyancy updraft, wind drift, and aerodynamic tilt.
 *  - Interactive mouse air wake: cursor gently stirs and parts nearby ascending lanterns.
 *  - Click to release: clicking anywhere launches a beautiful new lantern into the sky.
 *  - Dual mode support: "lantern" (Traditional 3D Sky Lanterns) and "dots" (Celestial Glowing Stars).
 *  - Frame-rate normalized physics (60Hz - 240Hz).
 */

export class SkyLanternsEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this._animId = null
    this.lastDrawTime = 0
    this.time = 0

    this.type = options.type || "lantern" // 'lantern' or 'dots'
    this.lanternCount = 30
    this.lanterns = []

    // Rich Asian Festival Color Palettes [basePaperColor, glowColor, flameTint]
    this.colorSets = [
      { body: "#FF6B35", glow: "#FF4500", flame: "#FFE6AA" }, // Sunset Orange
      { body: "#FFD700", glow: "#FFA500", flame: "#FFFFD0" }, // Royal Gold
      { body: "#FF3B30", glow: "#CC1100", flame: "#FFE0B2" }, // Festival Crimson
      { body: "#FF8C42", glow: "#FF6000", flame: "#FFF3E0" }, // Warm Tangerine
      { body: "#FFB347", glow: "#FF8C00", flame: "#FFFFE0" }, // Golden Amber
      { body: "#FF5376", glow: "#E91E63", flame: "#FFE4EC" }, // Lotus Rose
      { body: "#FFE082", glow: "#FFB300", flame: "#FFFFF0" }, // Warm Ivory
      { body: "#FF7043", glow: "#D84315", flame: "#FFE8D6" }, // Terracotta Flame
      { body: "#FFA726", glow: "#FB8C00", flame: "#FFF8E1" }, // Sunrise Gold
    ]

    // Mouse Tracking
    this.mouse = {
      x: null,
      y: null,
      radius: 150,
    }

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseOutHandler = () => this._onMouseOut()
    this._mouseDownHandler = (e) => this._onMouseDown(e)

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
  }

  setOptions(options) {
    if (options && options.type && options.type !== this.type) {
      this.type = options.type
      if (this.active) {
        this.initLanterns()
      }
    }
  }

  resize() {
    if (!this.canvas) return
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    if (this.active) {
      this.initLanterns()
    }
  }

  // ── Mouse & Click Interaction ──────────────────────────────────────────────

  _onMouseMove(e) {
    if (!this.active) return
    this.mouse.x = e.clientX
    this.mouse.y = e.clientY
  }

  _onMouseOut() {
    this.mouse.x = null
    this.mouse.y = null
  }

  _onMouseDown(e) {
    if (!this.active) return
    // Release a custom floating lantern right at click location or bottom
    if (this.lanterns.length < 48) {
      const fresh = this.createLantern(false)
      fresh.x = e.clientX + (Math.random() - 0.5) * 20
      fresh.y = Math.min(this.canvas.height - 20, e.clientY + 20)
      fresh.z = 0.95 // Crisp foreground
      fresh.scale = 1.15
      fresh.w = 46 * fresh.scale
      fresh.h = 62 * fresh.scale
      this.lanterns.push(fresh)
    }
  }

  // ── Lantern Factory ────────────────────────────────────────────────────────

  createLantern(fromBottom = false) {
    const W = this.canvas.width
    const H = this.canvas.height

    const depth = Math.random() // 0 (far horizon) to 1 (near foreground)
    const colorTheme = this.colorSets[Math.floor(Math.random() * this.colorSets.length)]

    // Scale spans from 0.35 (distant tiny star-like lantern) to 1.2 (large foreground lantern)
    const scale = 0.32 + depth * 0.88
    const baseW = 42 * scale
    const baseH = 58 * scale

    const startY = fromBottom
      ? H + baseH + Math.random() * 250
      : Math.random() * H * 1.1

    return {
      x: Math.random() * (W - 100) + 50,
      y: startY,
      z: depth,
      w: baseW,
      h: baseH,
      scale: scale,

      // Thermal updraft speed (scaled with depth for 3D parallax)
      speedY: 0.35 + depth * 0.55 + Math.random() * 0.25,
      speedX: 0,
      vx: 0,
      vy: 0,

      // Wind sway & oscillation
      swayOffset: Math.random() * Math.PI * 2,
      swaySpeed: 0.012 + Math.random() * 0.016,
      swayAmp: 0.5 + depth * 1.2,

      // 3D Tilt & rotation
      tilt: 0,
      tasselAngle: 0,

      // Flame flicker phase
      flickerOffset: Math.random() * Math.PI * 2,
      flickerSpeed: 0.06 + Math.random() * 0.04,

      // Opacity
      baseOpacity: 0.5 + depth * 0.5,
      opacity: 0.5 + depth * 0.5,

      color: colorTheme,
    }
  }

  initLanterns() {
    this.lanterns = []
    const count = this.lanternCount
    for (let i = 0; i < count; i++) {
      this.lanterns.push(this.createLantern(false))
    }
  }

  // ── Lifecycle Methods ──────────────────────────────────────────────────────

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.initLanterns()

    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseout", this._mouseOutHandler, { passive: true })
    window.addEventListener("mousedown", this._mouseDownHandler, { passive: true })

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
    window.removeEventListener("mousedown", this._mouseDownHandler)

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.canvas.style.display = "none"
    }
    this.lanterns = []
    this.mouse.x = null
    this.mouse.y = null
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
  }

  // ── Drawing: Traditional Ultra HD Sky Lantern ──────────────────────────────

  _drawTraditionalLantern(ctx, lantern, flicker) {
    const { w, h, scale, color } = lantern
    const hw = w * 0.5
    const hh = h * 0.5

    const topW = hw * 0.68
    const midW = hw * 1.18
    const botW = hw * 0.78

    // 1. Volumetric Ambient Glow Halo (Radiates out into night sky)
    const haloRadius = hw * (2.8 + lantern.z * 1.2)
    const halo = ctx.createRadialGradient(0, hh * 0.2, 0, 0, hh * 0.2, haloRadius)
    halo.addColorStop(0, `${color.glow}4D`) // ~30% alpha
    halo.addColorStop(0.45, `${color.glow}1A`) // ~10% alpha
    halo.addColorStop(1, "rgba(0, 0, 0, 0)")

    ctx.beginPath()
    ctx.arc(0, hh * 0.2, haloRadius, 0, Math.PI * 2)
    ctx.fillStyle = halo
    ctx.fill()

    // 2. Translucent Rice-Paper Lantern Silhouette
    ctx.beginPath()
    ctx.moveTo(-topW, -hh)
    // Left belly curve
    ctx.bezierCurveTo(-midW, -hh * 0.35, -midW, hh * 0.45, -botW, hh)
    // Bottom aperture opening
    ctx.lineTo(botW, hh)
    // Right belly curve
    ctx.bezierCurveTo(midW, hh * 0.45, midW, -hh * 0.35, topW, -hh)
    // Top crown closure
    ctx.bezierCurveTo(topW * 0.5, -hh * 1.05, -topW * 0.5, -hh * 1.05, -topW, -hh)
    ctx.closePath()

    // Base paper gradient (rich glowing amber/rose/gold)
    const paperGrad = ctx.createLinearGradient(-midW, 0, midW, 0)
    paperGrad.addColorStop(0, `${color.body}B3`) // ~70%
    paperGrad.addColorStop(0.3, `${color.body}FA`) // ~98%
    paperGrad.addColorStop(0.7, `${color.body}FA`)
    paperGrad.addColorStop(1, `${color.body}B3`)
    ctx.fillStyle = paperGrad
    ctx.fill()

    // 3. Internal Candle Light Diffusion (Subsurface scattering from bottom flame)
    const innerLight = ctx.createRadialGradient(0, hh * 0.45, 0, 0, hh * 0.45, hw * 1.3)
    innerLight.addColorStop(0, `rgba(255, 255, 230, ${0.92 * flicker})`)
    innerLight.addColorStop(0.35, `rgba(255, 200, 80, ${0.75 * flicker})`)
    innerLight.addColorStop(0.75, `${color.glow}40`)
    innerLight.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = innerLight
    ctx.fill()

    // 4. Subtle Bamboo Rib Arches (Delicate frame lines)
    if (lantern.z > 0.35) {
      ctx.save()
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.14 * lantern.opacity})`
      ctx.lineWidth = Math.max(0.5, scale * 0.65)

      // Center vertical rib
      ctx.beginPath()
      ctx.moveTo(0, -hh)
      ctx.lineTo(0, hh)
      ctx.stroke()

      // Curved lateral ribs
      for (const sign of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(0, -hh)
        ctx.quadraticCurveTo(sign * midW * 0.58, 0, 0, hh)
        ctx.stroke()
      }
      ctx.restore()
    }

    // 5. Internal Candle Flame Core (The burning fire source)
    ctx.save()
    const flameH = (6.5 * scale) * flicker
    const flameW = 2.8 * scale
    const flameY = hh * 0.62

    // Flame white-hot center
    ctx.beginPath()
    ctx.ellipse(0, flameY, flameW, flameH, 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 250, ${0.98 * flicker})`
    ctx.fill()

    // Flame outer gold rim
    ctx.beginPath()
    ctx.ellipse(0, flameY, flameW * 1.8, flameH * 1.3, 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 180, 40, ${0.65 * flicker})`
    ctx.fill()
    ctx.restore()

    // 6. Bamboo / Wood Collar Caps (Top and Bottom Rings)
    const capH = Math.max(1.8, 3.2 * scale)
    ctx.fillStyle = "#2d1607" // Dark polished bamboo

    // Top Collar
    ctx.beginPath()
    ctx.roundRect(-topW * 0.95, -hh - capH * 0.6, topW * 1.9, capH, 1.5 * scale)
    ctx.fill()

    // Bottom Collar Ring
    ctx.beginPath()
    ctx.roundRect(-botW * 0.95, hh - capH * 0.4, botW * 1.9, capH, 1.5 * scale)
    ctx.fill()

    // 7. Hanging Red/Gold Tassels (With realistic trailing inertia)
    if (lantern.z > 0.3) {
      ctx.save()
      const tasselLen = 16 * scale
      ctx.translate(0, hh + capH * 0.6)
      ctx.rotate(lantern.tasselAngle)

      // Cords connecting to tassel head
      ctx.strokeStyle = `${color.body}CC`
      ctx.lineWidth = Math.max(0.6, 0.9 * scale)
      ctx.beginPath()
      ctx.moveTo(-botW * 0.35, 0)
      ctx.lineTo(0, tasselLen * 0.35)
      ctx.moveTo(botW * 0.35, 0)
      ctx.lineTo(0, tasselLen * 0.35)
      ctx.stroke()

      // Tassel Golden Ring
      ctx.beginPath()
      ctx.arc(0, tasselLen * 0.35, Math.max(1.2, 2.2 * scale), 0, Math.PI * 2)
      ctx.fillStyle = "#FFD700"
      ctx.fill()

      // Silk Tassel Threads
      ctx.strokeStyle = color.body
      ctx.lineWidth = Math.max(0.5, 0.75 * scale)
      ctx.beginPath()
      for (let t = -2; t <= 2; t++) {
        ctx.moveTo(t * 0.5 * scale, tasselLen * 0.35)
        ctx.lineTo(t * 1.3 * scale, tasselLen)
      }
      ctx.stroke()
      ctx.restore()
    }
  }

  // ── Drawing: Celestial Starlight / Light Dots ───────────────────────────────

  _drawCelestialDot(ctx, lantern, flicker) {
    const { w, scale, color } = lantern
    const radius = w * 0.65

    // Outer Pulsating Starlight Halo
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 2.2)
    halo.addColorStop(0, `rgba(255, 255, 230, ${0.9 * flicker})`)
    halo.addColorStop(0.35, `${color.body}80`)
    halo.addColorStop(0.7, `${color.glow}33`)
    halo.addColorStop(1, "rgba(0, 0, 0, 0)")

    ctx.beginPath()
    ctx.arc(0, 0, radius * 2.2, 0, Math.PI * 2)
    ctx.fillStyle = halo
    ctx.fill()

    // Diamond 4-point Star Sparkle
    if (lantern.z > 0.4) {
      ctx.save()
      ctx.rotate(this.time * 0.8 + lantern.flickerOffset)
      ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * flicker})`
      const starR = radius * 1.4
      const starInner = radius * 0.25

      ctx.beginPath()
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2
        ctx.lineTo(Math.cos(a) * starR, Math.sin(a) * starR)
        const aMid = a + Math.PI / 4
        ctx.lineTo(Math.cos(aMid) * starInner, Math.sin(aMid) * starInner)
      }
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    // Radiant Center Core
    ctx.beginPath()
    ctx.arc(0, 0, Math.max(1.2, radius * 0.4), 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${0.98 * flicker})`
    ctx.fill()
  }

  // ── Main Render & Animation Loop ───────────────────────────────────────────

  animate(currentTime = 0) {
    if (!this.active) return

    this._animId = requestAnimationFrame((t) => this.animate(t))
    if (document.visibilityState === "hidden") return

    const elapsed = currentTime - this.lastDrawTime
    const deltaTime = Math.min(elapsed / (1000 / 60), 3.0)
    this.lastDrawTime = currentTime

    const W = this.canvas.width
    const H = this.canvas.height
    this.ctx.clearRect(0, 0, W, H)
    this.time += 0.02 * deltaTime

    // Sort lanterns by depth Z so distant lanterns render behind near ones
    this.lanterns.sort((a, b) => a.z - b.z)

    // Global ambient gentle breeze
    const ambientBreeze = Math.sin(this.time * 0.5) * 0.4 + Math.cos(this.time * 0.22) * 0.25

    const len = this.lanterns.length
    for (let i = 0; i < len; i++) {
      const L = this.lanterns[i]

      // 1. Aerodynamic Updraft & Wind Sway
      L.swayOffset += L.swaySpeed * deltaTime
      const swayX = Math.sin(L.swayOffset) * L.swayAmp
      L.x += (ambientBreeze * (0.6 + L.z * 0.4) + swayX + L.vx) * deltaTime
      L.y -= (L.speedY + L.vy) * deltaTime

      // Damping on interactive velocity
      L.vx *= 0.95
      L.vy *= 0.95

      // 2. Aerodynamic Tilt & Tassel Pendulum Physics
      const targetTilt = -(ambientBreeze + swayX * 0.5 + L.vx * 0.6) * 0.035
      L.tilt += (targetTilt - L.tilt) * 0.08 * deltaTime
      const targetTassel = -targetTilt * 1.6
      L.tasselAngle += (targetTassel - L.tasselAngle) * 0.1 * deltaTime

      // 3. Mouse Air Wake Interaction (Parting nearby lanterns)
      if (this.mouse.x !== null) {
        const dx = L.x - this.mouse.x
        const dy = L.y - this.mouse.y
        const distSq = dx * dx + dy * dy
        const radius = this.mouse.radius
        if (distSq < radius * radius && distSq > 1) {
          const dist = Math.sqrt(distSq)
          const force = (1 - dist / radius) * 1.8
          L.vx += (dx / dist) * force * 0.6 * deltaTime
          L.tilt += (dx > 0 ? 0.04 : -0.04) * force * deltaTime
        }
      }

      // 4. Smooth Fade-Out as lantern reaches the high sky
      const fadeThreshold = H * 0.22
      if (L.y < fadeThreshold) {
        L.opacity = Math.max(0, (L.y / fadeThreshold) * L.baseOpacity)
      }

      // 5. Render Lantern with 3D Transforms
      const flicker = 0.85 + 0.15 * Math.sin(this.time * 4 + L.flickerOffset)

      this.ctx.save()
      this.ctx.translate(L.x, L.y)
      this.ctx.rotate(L.tilt)
      this.ctx.globalAlpha = Math.max(0, Math.min(1.0, L.opacity))

      if (this.type === "dots") {
        this._drawCelestialDot(this.ctx, L, flicker)
      } else {
        this._drawTraditionalLantern(this.ctx, L, flicker)
      }

      this.ctx.restore()

      // 6. Recycle Lantern when off-screen or faded
      if (L.opacity <= 0.01 || L.y < -L.h - 80) {
        const fresh = this.createLantern(true)
        Object.assign(L, fresh)
      }

      // Horizontal edge wrapping
      if (L.x > W + 80) L.x = -60
      else if (L.x < -80) L.x = W + 60
    }
  }
}
