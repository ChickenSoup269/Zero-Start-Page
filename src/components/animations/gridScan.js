import { hexToRgb } from "../../utils/colors.js"

/**
 * GridScanEffect — Hollywood AAA Autonomous 3D Cyber Scanner Engine
 *
 * Implements 6 Golden Principles:
 *  1. Autonomous Smooth 3D Cyber Radar:
 *     - Uncoupled from cursor disruption for seamless, cinematic ambient scanning.
 *     - Subtle organic drone camera breathing & infinite forward scanning wave train.
 *  2. Volumetric 3D Laser Scanning Planes & Cyber Grids:
 *     - Multi-tier scanning wave frames advancing through 3D depth.
 *     - Perspective cyber grid floor/ceiling illuminated dynamically by passing wavefronts.
 *  3. Cybernetic Target Reticles & Radar Pulse Shockwaves:
 *     - Floating 3D holographic corner brackets with central targeting crosshairs.
 *     - Expanding radar pulse rings when the scan wave sweeps over a target.
 *  4. 60Hz - 240Hz Delta Normalization & Zero-Lag Native Canvas.
 *  5. 100% Backward-Compatible API (updateColor, start, stop, destroy, resize).
 */

export class GridScanEffect {
  constructor(canvasId, color = "#00ffcc") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.destroyed = false
    this._animId = null

    this.color = color || "#00ffcc"
    this._rgb = hexToRgb(this.color) || { r: 0, g: 255, b: 204 }

    this.time = 0
    this.lastTime = performance.now()
    this.particles = []
    this.pulseRings = []
    this.scanZ = 2000

    this.width = window.innerWidth
    this.height = window.innerHeight
    this.gimbal = { x: 0, y: 0 }

    this._resizeHandler = () => this.resize()
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)
  }

  initParticles() {
    this.particles = []
    const count = 65
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 3200,
        y: (Math.random() - 0.5) * 2200,
        z: Math.random() * 2400,
        size: 15 + Math.random() * 22,
        rot: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 1.5,
        wasHighlighted: false,
      })
    }
  }

  resize() {
    if (!this.canvas) return
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.canvas.style.pointerEvents = "none"

    this.initParticles()
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.lastTime = performance.now()
    }
  }

  updateColor(color) {
    if (!color) return
    this.color = color
    this._rgb = hexToRgb(this.color) || { r: 0, g: 255, b: 204 }
  }

  start() {
    if (this.active || this.destroyed) return
    this.active = true
    this.lastTime = performance.now()
    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"

    this.resize()

    const loop = (now) => {
      if (!this.active || this.destroyed) return
      this._animId = requestAnimationFrame(loop)

      if (document.visibilityState === "hidden") {
        this.lastTime = now
        return
      }

      const elapsed = Math.min(now - this.lastTime, 100)
      this.lastTime = now
      const dt = Math.min(elapsed / 16.67, 3.0)

      this.update(dt)
      this.draw()
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
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.canvas) {
      this.canvas.style.display = "none"
    }
    this.particles = []
    this.pulseRings = []
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  update(dt) {
    this.time += 0.012 * dt

    // Subtle autonomous gimbal breathing (Zero cursor disruption)
    this.gimbal.x = Math.sin(this.time * 0.45) * 16
    this.gimbal.y = Math.cos(this.time * 0.35) * 12

    // Advance 3D scanning wavefront train
    this.scanZ -= 4.2 * dt
    if (this.scanZ < -1500) this.scanZ = 2500

    const waveOffsets = [0, 400, 800, 1200, 1600, 2000]

    // Update particles & trigger pulse rings
    for (let p of this.particles) {
      p.z -= p.speed * dt
      if (p.z < -1000) {
        p.z = 2500
        p.x = (Math.random() - 0.5) * 4500
        p.y = (Math.random() - 0.5) * 3500
        p.wasHighlighted = false
      }

      // Check wave intersections
      let isHigh = false
      for (const offset of waveOffsets) {
        let wZ = this.scanZ + offset
        if (wZ > 2500) wZ -= 4000
        if (Math.abs(p.z - wZ) < 85) {
          isHigh = true
          break
        }
      }

      if (isHigh && !p.wasHighlighted && this.pulseRings.length < 30 && p.z > -400) {
        p.wasHighlighted = true
        this.pulseRings.push({
          x: p.x,
          y: p.y,
          z: p.z,
          radius: p.size * 0.8,
          alpha: 1.0,
          decay: 0.035,
        })
      } else if (!isHigh) {
        p.wasHighlighted = false
      }
    }

    // Update pulse rings
    for (let i = this.pulseRings.length - 1; i >= 0; i--) {
      const ring = this.pulseRings[i]
      ring.radius += 1.4 * dt
      ring.alpha -= ring.decay * dt
      if (ring.alpha <= 0) {
        this.pulseRings.splice(i, 1)
      }
    }
  }

  drawCorner(ctx, x, y, size, angle, opacity, rgbStr, highlight) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)

    ctx.strokeStyle = `rgba(${rgbStr}, ${opacity.toFixed(3)})`
    ctx.lineWidth = highlight > 0.4 ? 1.8 : 1.1

    // Bracket corner
    ctx.beginPath()
    ctx.moveTo(size, 0)
    ctx.lineTo(0, 0)
    ctx.lineTo(0, size)
    ctx.stroke()

    // Central white-hot target photon dot on highlight
    if (highlight > 0.3) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(opacity * 1.3).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(0, 0, Math.max(1, size * 0.14), 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  draw() {
    const W = this.width
    const H = this.height
    const ctx = this.ctx

    ctx.clearRect(0, 0, W, H)

    const rgb = this._rgb || { r: 0, g: 255, b: 204 }
    const rgbStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`

    const focalLength = 800
    const centerX = W / 2 + this.gimbal.x
    const centerY = H / 2 + this.gimbal.y

    const waveOffsets = [0, 400, 800, 1200, 1600, 2000]

    // 1. Perspective Cyber Grid Floor & Ceiling Lines
    ctx.save()
    const gridZSteps = 8
    for (let i = 0; i <= gridZSteps; i++) {
      const gz = 300 + i * 280
      const gScale = focalLength / (focalLength + gz)
      const gyFloor = centerY + 550 * gScale
      const gyCeil = centerY - 550 * gScale
      const gw = 1800 * gScale

      // Measure proximity to scan wavefront
      let lineHighlight = 0
      for (const offset of waveOffsets) {
        let wZ = this.scanZ + offset
        if (wZ > 2500) wZ -= 4000
        const dist = Math.abs(gz - wZ)
        if (dist < 200) {
          lineHighlight = Math.max(lineHighlight, 1 - dist / 200)
        }
      }

      const gAlpha = (0.04 + lineHighlight * 0.18) * (1 - gz / 2600)
      ctx.strokeStyle = `rgba(${rgbStr}, ${gAlpha.toFixed(3)})`
      ctx.lineWidth = 1.0

      // Floor horizontal line
      ctx.beginPath()
      ctx.moveTo(centerX - gw, gyFloor)
      ctx.lineTo(centerX + gw, gyFloor)
      ctx.stroke()

      // Ceiling horizontal line
      ctx.beginPath()
      ctx.moveTo(centerX - gw, gyCeil)
      ctx.lineTo(centerX + gw, gyCeil)
      ctx.stroke()
    }
    ctx.restore()

    // 2. Sort & Render 3D Corner Reticles
    this.particles.sort((a, b) => b.z - a.z)

    for (const p of this.particles) {
      if (p.z < -focalLength + 60) continue

      const scale = focalLength / (focalLength + p.z)
      const x2d = centerX + p.x * scale
      const y2d = centerY + p.y * scale
      const size2d = p.size * scale

      // Highlight logic
      let highlight = 0
      for (const offset of waveOffsets) {
        let wZ = this.scanZ + offset
        if (wZ > 2500) wZ -= 4000
        const dist = Math.abs(p.z - wZ)
        if (dist < 160) {
          highlight = Math.max(highlight, 1 - dist / 160)
        }
      }

      let opacity = (0.16 + highlight * 0.65) * (1 - p.z / 2500)
      if (p.z < 0) opacity *= 1 + p.z / 1000

      if (opacity > 0.01) {
        this.drawCorner(
          ctx,
          x2d,
          y2d,
          size2d * (1 + highlight * 0.28),
          p.rot,
          opacity,
          rgbStr,
          highlight,
        )
      }
    }

    // 3. Render Expanding Radar Pulse Rings
    ctx.save()
    for (const ring of this.pulseRings) {
      if (ring.z < -focalLength + 60) continue
      const scale = focalLength / (focalLength + ring.z)
      const rx = centerX + ring.x * scale
      const ry = centerY + ring.y * scale
      const rSize = ring.radius * scale

      ctx.strokeStyle = `rgba(${rgbStr}, ${(ring.alpha * 0.6).toFixed(3)})`
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(rx, ry, rSize, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()

    // 4. Render Scanning Laser Plane Frames
    ctx.save()
    for (let index = 0; index < waveOffsets.length; index++) {
      const offset = waveOffsets[index]
      let wZ = this.scanZ + offset
      if (wZ > 2500) wZ -= 4000
      if (wZ < -focalLength + 80) continue

      const waveScale = focalLength / (focalLength + wZ)
      const isMain = index === 0
      const sw = W * 1.35 * waveScale
      const sh = H * 1.35 * waveScale
      const sx = centerX - sw / 2
      const sy = centerY - sh / 2

      let waveAlpha = isMain ? 0.35 : 0.18 / (1 + index * 0.25)
      if (wZ > 2000) waveAlpha *= 1 - (wZ - 2000) / 500
      if (wZ < 0) waveAlpha *= 1 + wZ / 1000

      if (waveAlpha > 0.005) {
        ctx.strokeStyle = `rgba(${rgbStr}, ${waveAlpha.toFixed(3)})`
        ctx.lineWidth = Math.max(1, (isMain ? 1.8 : 1.0) * waveScale)
        ctx.strokeRect(sx, sy, sw, sh)

        // Corner Brackets for the frame
        const bSize = (isMain ? 45 : 25) * waveScale
        this.drawCorner(ctx, sx, sy, bSize, 0, waveAlpha, rgbStr, isMain ? 0.6 : 0)
        this.drawCorner(ctx, sx + sw, sy, bSize, Math.PI / 2, waveAlpha, rgbStr, isMain ? 0.6 : 0)
        this.drawCorner(ctx, sx + sw, sy + sh, bSize, Math.PI, waveAlpha, rgbStr, isMain ? 0.6 : 0)
        this.drawCorner(ctx, sx, sy + sh, bSize, -Math.PI / 2, waveAlpha, rgbStr, isMain ? 0.6 : 0)
      }
    }
    ctx.restore()
  }
}

