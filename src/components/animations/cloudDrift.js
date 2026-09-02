/**
 * CloudDriftEffect — Hollywood AAA Volumetric Cumulus Cloud Engine
 *
 * Implements the 6 Golden Principles:
 *  1. Volumetric Organic Geometry:
 *     - Multi-cluster volumetric cumulus clouds with organic micro-puff morphing.
 *     - Top Rim Lighting (Silver/Golden Lining) & Bottom Ambient Occlusion for true 3D depth.
 *  2. 3D Parallax & Depth:
 *     - Multi-layer strata (High wisps, Mid cumulus, Low near clouds) with atmospheric distance attenuation.
 *  3. Dynamic Sky Moods & Luminescence:
 *     - "daylight": Crisp white cumulus over azure daylight with gentle sun glint.
 *     - "sunrise": Peach & golden apricot dawn with soft sunrise radiance.
 *     - "sunset": Rich amber, tangerine, and twilight indigo with radiant sunset glow.
 *     - "midnight": Nocturnal silver-lined clouds under an ethereal lunar halo.
 *     - "stormy": Dark slate cumulus with atmospheric internal sheet lightning flashes.
 *     - "custom": Dynamic highlights & shadows mapped cleanly from user's custom color.
 *  4. Interactive Aerodynamic Parting:
 *     - Mouse motion gently parts and disperses clouds with elastic spring return.
 *  5. 60Hz - 240Hz Delta Normalization & Native High-DPI Retina Subpixel Rendering.
 *  6. Full Settings Integration: updateColor, setMood, setOptions (opacity, speed), lifecycle.
 */

import { hexToRgb } from "../../utils/colors.js"

export class CloudDriftEffect {
  constructor(canvasId, color = "#f0f4f8", mood = "daylight", options = {}) {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.destroyed = false
    this._animId = null

    // Configuration
    this.baseColor = color || "#f0f4f8"
    this.mood = mood || "daylight"
    this.opacityScale = options.opacity !== undefined ? options.opacity : 0.65
    this.speedScale = options.speed !== undefined ? options.speed : 1.0
    this._updateColorCache()

    // Simulation State
    this.clouds = []
    this.time = 0
    this.lastTime = performance.now()
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    // Interactive Mouse
    this.mouseEnabled = true
    this.mouse = {
      x: -9999,
      y: -9999,
      active: false,
    }

    // Storm Sheet Lightning
    this.stormFlash = {
      active: false,
      timer: 0,
      opacity: 0,
      targetCloudIndex: 0,
      nextTime: performance.now() + 4000 + Math.random() * 5000,
    }

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseLeaveHandler = () => this._onMouseLeave()
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseleave", this._mouseLeaveHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)
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

    this.initClouds()
  }

  initClouds() {
    const W = this.width || window.innerWidth
    const count = 5 + Math.floor(W / 380)
    this.clouds = []

    for (let i = 0; i < count; i++) {
      const cloud = this.createCloudData()
      cloud.x = Math.random() * (W + 800) - 400
      this.clouds.push(cloud)
    }

    this.clouds.sort((a, b) => a.layer - b.layer)
  }

  createCloudData() {
    const H = this.height || window.innerHeight
    const layer = Math.random() // 0 (far/high) to 1 (near/low)
    const scale = 0.65 + layer * 1.15
    const puffCount = 8 + Math.floor(Math.random() * 6)
    const puffs = []

    // Elliptical volumetric cumulus formation
    const cloudWidth = 240 * scale
    for (let i = 0; i < puffCount; i++) {
      const progress = (i / (puffCount - 1)) - 0.5 // [-0.5, 0.5]
      const arch = Math.cos(progress * Math.PI) // higher in center
      const ox = progress * cloudWidth + (Math.random() - 0.5) * (30 * scale)
      const oy = -arch * (45 * scale) + (Math.random() - 0.5) * (20 * scale)
      const r = (55 + arch * 40 + Math.random() * 25) * scale

      puffs.push({
        ox,
        oy,
        baseOx: ox,
        baseOy: oy,
        r,
        currentR: r,
        phase: Math.random() * Math.PI * 2,
        speed: 0.12 + Math.random() * 0.18,
        dispX: 0,
        dispY: 0,
      })
    }

    return {
      x: -500,
      y: 40 + Math.random() * (H * 0.55),
      speed: (12 + layer * 22) * this.speedScale,
      alpha: 0.35 + layer * 0.45,
      layer,
      scale,
      puffs,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.15 + Math.random() * 0.1,
    }
  }

  _updateColorCache() {
    this._rgb = hexToRgb(this.baseColor) || { r: 240, g: 244, b: 248 }
  }

  updateColor(color) {
    if (!color) return
    this.baseColor = color
    this._updateColorCache()
  }

  setMood(mood) {
    this.mood = mood || "daylight"
  }

  setOptions(options = {}) {
    if (options.color !== undefined) this.updateColor(options.color)
    if (options.mood !== undefined) this.setMood(options.mood)
    if (options.opacity !== undefined) this.opacityScale = options.opacity
    if (options.speed !== undefined) {
      this.speedScale = options.speed
      for (const c of this.clouds) {
        c.speed = (12 + c.layer * 22) * this.speedScale
      }
    }
  }

  _getMoodPalette() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    const palettes = {
      daylight: {
        sky: ["rgba(165, 210, 255, 0.22)", "rgba(215, 238, 255, 0.14)", "rgba(255, 255, 255, 0)"],
        sun: "rgba(255, 248, 220, 0.42)",
        sunPos: { x: W * 0.82, y: H * 0.18, r: Math.min(W, H) * 0.32 },
        cloudHighlight: { r: 255, g: 255, b: 255 },
        cloudBody: { r: 245, g: 248, b: 255 },
        cloudShadow: { r: 195, g: 210, b: 230 },
        horizon: "rgba(210, 235, 255, 0.12)",
      },
      sunrise: {
        sky: ["rgba(255, 175, 120, 0.24)", "rgba(255, 215, 170, 0.16)", "rgba(160, 205, 235, 0.08)"],
        sun: "rgba(255, 200, 120, 0.52)",
        sunPos: { x: W * 0.2, y: H * 0.32, r: Math.min(W, H) * 0.36 },
        cloudHighlight: { r: 255, g: 235, b: 200 },
        cloudBody: { r: 255, g: 205, b: 175 },
        cloudShadow: { r: 190, g: 155, b: 175 },
        horizon: "rgba(255, 150, 100, 0.18)",
      },
      sunset: {
        sky: ["rgba(255, 110, 80, 0.26)", "rgba(250, 160, 95, 0.18)", "rgba(80, 80, 160, 0.14)"],
        sun: "rgba(255, 125, 75, 0.55)",
        sunPos: { x: W * 0.8, y: H * 0.34, r: Math.min(W, H) * 0.38 },
        cloudHighlight: { r: 255, g: 215, b: 150 },
        cloudBody: { r: 255, g: 150, b: 105 },
        cloudShadow: { r: 130, g: 90, b: 145 },
        horizon: "rgba(255, 95, 110, 0.22)",
      },
      midnight: {
        sky: ["rgba(15, 24, 48, 0.28)", "rgba(25, 40, 75, 0.18)", "rgba(10, 16, 32, 0.1)"],
        sun: "rgba(220, 240, 255, 0.45)",
        sunPos: { x: W * 0.75, y: H * 0.22, r: Math.min(W, H) * 0.28 },
        cloudHighlight: { r: 240, g: 248, b: 255 },
        cloudBody: { r: 180, g: 205, b: 235 },
        cloudShadow: { r: 85, g: 105, b: 140 },
        horizon: "rgba(45, 70, 120, 0.15)",
      },
      stormy: {
        sky: ["rgba(38, 44, 58, 0.32)", "rgba(55, 62, 78, 0.22)", "rgba(28, 32, 44, 0.15)"],
        sun: "rgba(180, 195, 225, 0.15)",
        sunPos: { x: W * 0.5, y: H * 0.2, r: Math.min(W, H) * 0.4 },
        cloudHighlight: { r: 195, g: 205, b: 220 },
        cloudBody: { r: 125, g: 135, b: 155 },
        cloudShadow: { r: 65, g: 70, b: 90 },
        horizon: "rgba(40, 48, 64, 0.2)",
      },
      custom: null,
      default: null,
    }

    return palettes[this.mood] || null
  }

  _drawMoodBackdrop(palette) {
    if (!palette) return
    const W = this.width
    const H = this.height
    const ctx = this.ctx

    // 1. Atmospheric Sky Wash
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, palette.sky[0])
    sky.addColorStop(0.5, palette.sky[1])
    sky.addColorStop(1, palette.sky[2])
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)

    // 2. Celestial Orb (Sun or Moon)
    const { x, y, r } = palette.sunPos
    const pulse = 1 + Math.sin(this.time * 0.28) * 0.03
    const sunGrad = ctx.createRadialGradient(x, y, 0, x, y, r * pulse)
    sunGrad.addColorStop(0, palette.sun)
    sunGrad.addColorStop(0.4, "rgba(255, 255, 255, 0.1)")
    sunGrad.addColorStop(1, "rgba(255, 255, 255, 0)")
    ctx.fillStyle = sunGrad
    ctx.fillRect(0, 0, W, H)

    // 3. Horizon Sheen
    const horizon = ctx.createLinearGradient(0, H * 0.5, 0, H)
    horizon.addColorStop(0, "rgba(255, 255, 255, 0)")
    horizon.addColorStop(1, palette.horizon)
    ctx.fillStyle = horizon
    ctx.fillRect(0, 0, W, H)
  }

  setMouseEnabled(enabled) {
    this.mouseEnabled = Boolean(enabled)
    if (!this.mouseEnabled) {
      this.mouse.active = false
      this.mouse.x = -9999
      this.mouse.y = -9999
    }
  }

  _onMouseMove(e) {
    if (this.mouseEnabled === false) return
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
    if (document.visibilityState === "hidden") {
      this.lastTime = performance.now()
    }
  }

  start() {
    if (this.active || this.destroyed) return
    this.active = true
    this.lastTime = performance.now()
    this.time = 0
    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"

    this.resize()

    const animateLoop = (now) => {
      if (!this.active || this.destroyed) return
      this._animId = requestAnimationFrame(animateLoop)

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

    this._animId = requestAnimationFrame(animateLoop)
  }

  stop() {
    if (!this.active) return
    this.active = false
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.canvas) {
      this.canvas.style.display = "none"
    }
    this.clouds = []
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  update(dt) {
    const W = this.width
    const H = this.height
    const now = performance.now()

    // 1. Storm Sheet Lightning Cycle
    if (this.mood === "stormy") {
      if (!this.stormFlash.active && now > this.stormFlash.nextTime) {
        this.stormFlash.active = true
        this.stormFlash.timer = 14
        this.stormFlash.targetCloudIndex = Math.floor(Math.random() * this.clouds.length)
        this.stormFlash.nextTime = now + 4000 + Math.random() * 6000
      }

      if (this.stormFlash.active) {
        this.stormFlash.timer -= dt
        if (this.stormFlash.timer <= 0) {
          this.stormFlash.active = false
        } else {
          const progress = 1 - this.stormFlash.timer / 14
          if (progress < 0.3) this.stormFlash.opacity = 1.0
          else if (progress < 0.55) this.stormFlash.opacity = 0.3
          else if (progress < 0.75) this.stormFlash.opacity = 0.8
          else this.stormFlash.opacity = Math.max(0, 1 - (progress - 0.75) / 0.25)
        }
      }
    }

    // 2. Update Clouds & Interactive Parting
    for (let cIdx = 0; cIdx < this.clouds.length; cIdx++) {
      const c = this.clouds[cIdx]
      c.x += (c.speed * 0.06) * dt
      c.wobblePhase += c.wobbleSpeed * 0.02 * dt

      const cloudCenterY = c.y + Math.sin(c.wobblePhase) * 6

      for (const p of c.puffs) {
        // Morphing respiration
        p.currentR = p.r + Math.sin(this.time * p.speed + p.phase) * (p.r * 0.08)

        // Mouse Parting interaction
        if (this.mouse.active) {
          const globalPuffX = c.x + p.ox
          const globalPuffY = cloudCenterY + p.oy
          const dx = globalPuffX - this.mouse.x
          const dy = globalPuffY - this.mouse.y
          const distSq = dx * dx + dy * dy
          const radius = 130

          if (distSq < radius * radius && distSq > 4) {
            const dist = Math.sqrt(distSq)
            const force = (1 - dist / radius) * 22
            p.dispX += (dx / dist) * force * 0.15
            p.dispY += (dy / dist) * force * 0.15
          }
        }

        // Spring damping back to base position
        p.dispX *= Math.pow(0.92, dt)
        p.dispY *= Math.pow(0.92, dt)
        p.ox = p.baseOx + p.dispX
        p.oy = p.baseOy + p.dispY
      }

      // Screen Wrap
      if (c.x > W + 550) {
        c.x = -500
        c.y = 40 + Math.random() * (H * 0.55)
      }
    }
  }

  draw() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height

    ctx.clearRect(0, 0, W, H)

    const palette = this._getMoodPalette()
    this._drawMoodBackdrop(palette)

    // Palette Colors or Custom Computed Shading
    let highlightRgb, bodyRgb, shadowRgb
    if (palette) {
      highlightRgb = palette.cloudHighlight
      bodyRgb = palette.cloudBody
      shadowRgb = palette.cloudShadow
    } else {
      // Dynamic Shading from user's custom color
      const base = this._rgb || { r: 240, g: 244, b: 248 }
      highlightRgb = {
        r: Math.min(255, base.r + 35),
        g: Math.min(255, base.g + 35),
        b: Math.min(255, base.b + 35),
      }
      bodyRgb = { ...base }
      shadowRgb = {
        r: Math.max(0, Math.floor(base.r * 0.72)),
        g: Math.max(0, Math.floor(base.g * 0.72)),
        b: Math.max(0, Math.floor(base.b * 0.72)),
      }
    }

    // Render Clouds (Sorted Back to Front)
    for (let cIdx = 0; cIdx < this.clouds.length; cIdx++) {
      const c = this.clouds[cIdx]
      const cloudY = c.y + Math.sin(c.wobblePhase) * 6
      const isLightningTarget =
        this.mood === "stormy" &&
        this.stormFlash.active &&
        cIdx === this.stormFlash.targetCloudIndex

      ctx.save()
      ctx.translate(c.x, cloudY)

      const baseAlpha = c.alpha * this.opacityScale

      for (const p of c.puffs) {
        const rad = p.currentR

        // 1. Bottom Ambient Shadow (Volumetric base)
        const shadowGrad = ctx.createRadialGradient(
          p.ox,
          p.oy + rad * 0.25,
          0,
          p.ox,
          p.oy,
          rad,
        )
        shadowGrad.addColorStop(0, `rgba(${shadowRgb.r}, ${shadowRgb.g}, ${shadowRgb.b}, ${(baseAlpha * 0.85).toFixed(3)})`)
        shadowGrad.addColorStop(0.65, `rgba(${shadowRgb.r}, ${shadowRgb.g}, ${shadowRgb.b}, ${(baseAlpha * 0.4).toFixed(3)})`)
        shadowGrad.addColorStop(1, `rgba(${shadowRgb.r}, ${shadowRgb.g}, ${shadowRgb.b}, 0)`)
        ctx.fillStyle = shadowGrad
        ctx.beginPath()
        ctx.arc(p.ox, p.oy, rad, 0, Math.PI * 2)
        ctx.fill()

        // 2. Middle Volumetric Body
        const bodyGrad = ctx.createRadialGradient(
          p.ox,
          p.oy,
          0,
          p.ox,
          p.oy,
          rad,
        )
        bodyGrad.addColorStop(0, `rgba(${bodyRgb.r}, ${bodyRgb.g}, ${bodyRgb.b}, ${baseAlpha.toFixed(3)})`)
        bodyGrad.addColorStop(0.7, `rgba(${bodyRgb.r}, ${bodyRgb.g}, ${bodyRgb.b}, ${(baseAlpha * 0.55).toFixed(3)})`)
        bodyGrad.addColorStop(1, `rgba(${bodyRgb.r}, ${bodyRgb.g}, ${bodyRgb.b}, 0)`)
        ctx.fillStyle = bodyGrad
        ctx.beginPath()
        ctx.arc(p.ox, p.oy, rad, 0, Math.PI * 2)
        ctx.fill()

        // 3. Top Silver/Golden Lining (Sunlight grazing upper perimeter)
        const highlightGrad = ctx.createRadialGradient(
          p.ox,
          p.oy - rad * 0.35,
          0,
          p.ox,
          p.oy - rad * 0.2,
          rad * 0.85,
        )
        highlightGrad.addColorStop(0, `rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, ${(baseAlpha * 0.9).toFixed(3)})`)
        highlightGrad.addColorStop(0.5, `rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, ${(baseAlpha * 0.3).toFixed(3)})`)
        highlightGrad.addColorStop(1, `rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, 0)`)
        ctx.fillStyle = highlightGrad
        ctx.beginPath()
        ctx.arc(p.ox, p.oy, rad, 0, Math.PI * 2)
        ctx.fill()

        // 4. Internal Sheet Lightning Flash (Stormy mode only)
        if (isLightningTarget) {
          const flashOp = this.stormFlash.opacity
          const flashGrad = ctx.createRadialGradient(
            p.ox,
            p.oy,
            0,
            p.ox,
            p.oy,
            rad * 1.2,
          )
          flashGrad.addColorStop(0, `rgba(255, 255, 255, ${(flashOp * 0.95).toFixed(3)})`)
          flashGrad.addColorStop(0.4, `rgba(210, 220, 255, ${(flashOp * 0.7).toFixed(3)})`)
          flashGrad.addColorStop(1, "rgba(210, 220, 255, 0)")
          ctx.fillStyle = flashGrad
          ctx.beginPath()
          ctx.arc(p.ox, p.oy, rad * 1.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.restore()
    }
  }
}

