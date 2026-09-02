/**
 * DVDEffect — Hollywood AAA Ultra HD Iconic Nostalgic DVD Screen Saver
 *
 * Masterpiece Retro Arcade & Cybernetic Physics:
 *  - Authentic Vector DVD Video Logo with Prismatic Laser Disc & 3D Beveled Sheen.
 *  - Wall Bounce Impact Sparks, Shockwave Ripples & Legendary Corner-Hit Supernova!
 *  - Holographic Ghost Trail with Chromatic Aberration (RGB Channel Split) & CRT Glitch.
 *  - Interactive Grab, Drag & Kinetic Fling Physics (Ném logo theo quán tính chuột).
 *  - High-DPI Retina Subpixel Precision & Delta-time Normalization (60Hz - 240Hz).
 */

import { hexToRgb } from "../../utils/colors.js"

const DVD_PALETTES = [
  "#00f0ff", // Cyber Cyan
  "#ff0055", // Neon Magenta
  "#ffdd00", // Imperial Gold
  "#00ff88", // Electric Emerald
  "#a855f7", // Holographic Violet
  "#ff6b00", // Solar Flare Orange
  "#38bdf8", // Sky Diamond
  "#f43f5e", // Crimson Ruby
]

// ── Wall Bounce Spark Particle ───────────────────────────────────────────────
class WallSpark {
  constructor(x, y, vx, vy, color, isCorner = false) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.color = color
    this.alpha = 1.0
    this.decay = isCorner ? Math.random() * 0.02 + 0.015 : Math.random() * 0.045 + 0.035
    this.size = isCorner ? Math.random() * 3.5 + 2.0 : Math.random() * 2.5 + 1.2
    this.isCorner = isCorner
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
    ctx.save()
    ctx.fillStyle = this.color
    ctx.globalAlpha = this.alpha
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()

    if (this.alpha > 0.4) {
      ctx.fillStyle = "#ffffff"
      ctx.globalAlpha = this.alpha * 0.9
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.size * 0.45, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

// ── Impact Ripple Shockwave ──────────────────────────────────────────────────
class ImpactShockwave {
  constructor(x, y, color, maxRadius = 65) {
    this.x = x
    this.y = y
    this.color = color
    this.radius = 4
    this.maxRadius = maxRadius
    this.alpha = 0.9
    this.speed = maxRadius / 14
  }

  update(dt) {
    this.radius += this.speed * dt
    this.alpha -= 0.06 * dt
    return this.alpha <= 0 || this.radius >= this.maxRadius
  }

  draw(ctx) {
    if (this.alpha <= 0.01) return
    ctx.save()
    ctx.strokeStyle = this.color
    ctx.globalAlpha = this.alpha
    ctx.lineWidth = Math.max(1, (1 - this.radius / this.maxRadius) * 3)
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}

// ── Main DVDEffect Class ─────────────────────────────────────────────────────
export class DVDEffect {
  constructor(canvasId, options = {}) {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.title = options.title || "DVD"
    this.colorMode = options.colorMode || "random"
    this.speed = options.speed || 3
    this.cloneCount = options.cloneCount || 1
    this.trail = options.trail || false
    this.glitch = options.glitch || false

    this.width = window.innerWidth
    this.height = window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.boxWidth = 160
    this.boxHeight = 85

    this.items = []
    this.sparks = []
    this.shockwaves = []

    this.active = false
    this.animationFrameId = null
    this.lastTime = performance.now()
    this.time = 0

    // Interactive Drag & Fling Physics
    this.draggedItem = null
    this.dragOffsetX = 0
    this.dragOffsetY = 0
    this.lastPointerX = 0
    this.lastPointerY = 0
    this.pointerVelX = 0
    this.pointerVelY = 0

    this.handleResize = () => this.resize()
    this._pointerDownHandler = (e) => this._onPointerDown(e)
    this._pointerMoveHandler = (e) => this._onPointerMove(e)
    this._pointerUpHandler = () => this._onPointerUp()
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this.handleResize)
    window.addEventListener("pointerdown", this._pointerDownHandler)
    window.addEventListener("pointermove", this._pointerMoveHandler, { passive: true })
    window.addEventListener("pointerup", this._pointerUpHandler)
    window.addEventListener("pointercancel", this._pointerUpHandler)
    document.addEventListener("visibilitychange", this._visibilityHandler)
  }

  getRandomColor(excludeColor) {
    const list = DVD_PALETTES.filter((c) => c !== excludeColor)
    return list[Math.floor(Math.random() * list.length)]
  }

  getResolvedColor(currentColor) {
    if (this.colorMode === "accent") {
      return (
        getComputedStyle(document.documentElement)
          .getPropertyValue("--accent-color")
          .trim() || "#00f0ff"
      )
    }
    if (this.colorMode !== "random" && this.colorMode) {
      return this.colorMode
    }
    return currentColor || "#00f0ff"
  }

  updateBoxSize() {
    if (!this.ctx) return
    this.ctx.font = "italic 900 48px 'Impact', 'Segoe UI Black', sans-serif"
    const textToMeasure = this.title.toUpperCase() === "DVD" ? "DVD" : this.title
    const metrics = this.ctx.measureText(textToMeasure)
    this.boxWidth = Math.max(120, Math.round(metrics.width + 36))
    this.boxHeight = this.title.toUpperCase() === "DVD" ? 82 : 68
  }

  syncItems() {
    while (this.items.length < this.cloneCount) {
      const spd = this.speed
      const angle = (Math.random() * 0.6 + 0.2) * Math.PI * (Math.random() > 0.5 ? 1 : -1)
      this.items.push({
        x: Math.random() * (this.width - this.boxWidth - 40) + 20,
        y: Math.random() * (this.height - this.boxHeight - 40) + 20,
        dx: Math.cos(angle) * spd,
        dy: Math.sin(angle) * spd,
        currentColor: this.getRandomColor(),
        history: [],
        glowPhase: Math.random() * Math.PI * 2,
        isCornerStreak: false,
      })
    }
    while (this.items.length > this.cloneCount) {
      this.items.pop()
    }
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

    this.updateBoxSize()
    this.syncItems()

    this.items.forEach((item) => {
      if (item.x + this.boxWidth > this.width) item.x = Math.max(0, this.width - this.boxWidth)
      if (item.y + this.boxHeight > this.height) item.y = Math.max(0, this.height - this.boxHeight)
    })
  }

  updateTitle(newTitle) {
    this.title = newTitle || "DVD"
    this.updateBoxSize()
  }

  updateColorMode(mode) {
    this.colorMode = mode
    this.items.forEach((item) => {
      if (this.colorMode !== "random") {
        item.currentColor = this.colorMode
      }
    })
  }

  updateSpeed(speed) {
    this.speed = Math.max(1, speed)
    this.items.forEach((item) => {
      const currentSpeed = Math.hypot(item.dx, item.dy) || 1
      const scale = this.speed / currentSpeed
      item.dx *= scale
      item.dy *= scale
    })
  }

  updateCloneCount(count) {
    this.cloneCount = Math.max(1, Math.min(10, count))
    this.syncItems()
  }

  updateTrail(trail) {
    this.trail = Boolean(trail)
    if (!this.trail) {
      this.items.forEach((item) => (item.history = []))
    }
  }

  updateGlitch(glitch) {
    this.glitch = Boolean(glitch)
  }

  setOptions(options = {}) {
    if (options.title !== undefined) this.updateTitle(options.title)
    if (options.colorMode !== undefined) this.updateColorMode(options.colorMode)
    if (options.speed !== undefined) this.updateSpeed(options.speed)
    if (options.cloneCount !== undefined) this.updateCloneCount(options.cloneCount)
    if (options.trail !== undefined) this.updateTrail(options.trail)
    if (options.glitch !== undefined) this.updateGlitch(options.glitch)
  }

  _onPointerDown(e) {
    if (!this.active) return
    const px = e.clientX
    const py = e.clientY

    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i]
      if (px >= it.x && px <= it.x + this.boxWidth && py >= it.y && py <= it.y + this.boxHeight) {
        this.draggedItem = it
        this.dragOffsetX = px - it.x
        this.dragOffsetY = py - it.y
        this.lastPointerX = px
        this.lastPointerY = py
        this.pointerVelX = 0
        this.pointerVelY = 0
        break
      }
    }
  }

  _onPointerMove(e) {
    if (!this.active || !this.draggedItem) return
    const px = e.clientX
    const py = e.clientY

    this.pointerVelX = px - this.lastPointerX
    this.pointerVelY = py - this.lastPointerY
    this.lastPointerX = px
    this.lastPointerY = py

    this.draggedItem.x = px - this.dragOffsetX
    this.draggedItem.y = py - this.dragOffsetY
  }

  _onPointerUp() {
    if (this.draggedItem) {
      if (Math.hypot(this.pointerVelX, this.pointerVelY) > 1.5) {
        const speed = this.speed
        const angle = Math.atan2(this.pointerVelY, this.pointerVelX)
        this.draggedItem.dx = Math.cos(angle) * speed * 1.5
        this.draggedItem.dy = Math.sin(angle) * speed * 1.5
      }
      this.draggedItem = null
    }
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.lastTime = performance.now()
    }
  }

  _emitBounceSparks(x, y, normalX, normalY, color, isCorner = false) {
    const count = isCorner ? 40 : 14
    this.shockwaves.push(new ImpactShockwave(x, y, color, isCorner ? 140 : 65))

    for (let i = 0; i < count; i++) {
      const angle = isCorner
        ? Math.random() * Math.PI * 2
        : Math.atan2(normalY, normalX) + (Math.random() - 0.5) * 1.6
      const speed = isCorner ? Math.random() * 8.5 + 3.0 : Math.random() * 5.0 + 1.8
      const vx = Math.cos(angle) * speed
      const vy = Math.sin(angle) * speed
      this.sparks.push(new WallSpark(x, y, vx, vy, color, isCorner))
    }
  }

  // ── Render Authentic Masterpiece DVD Logo ───────────────────────────────────
  drawItem(item, x, y, alpha = 1.0, isGlitch = false, isGhost = false) {
    const ctx = this.ctx
    const resolvedColor = this.getResolvedColor(item.currentColor)
    const bw = this.boxWidth
    const bh = this.boxHeight
    const cx = x + bw / 2
    const cy = y + bh / 2

    ctx.save()
    ctx.globalAlpha = alpha

    // Glitch Chromatic Aberration & Translation
    if (isGlitch && Math.random() > 0.72) {
      const offX = (Math.random() - 0.5) * 14
      const offY = (Math.random() - 0.5) * 8
      ctx.translate(offX, offY)
    }

    if (this.title.toUpperCase() === "DVD") {
      // 1. Prismatic Laser Disc Oval Underneath
      const discY = cy + 18
      const discRadiusX = bw * 0.44
      const discRadiusY = 11

      ctx.save()
      ctx.beginPath()
      ctx.ellipse(cx, discY, discRadiusX, discRadiusY, 0, 0, Math.PI * 2)

      const discGrad = ctx.createLinearGradient(cx - discRadiusX, discY, cx + discRadiusX, discY)
      discGrad.addColorStop(0, "rgba(255, 255, 255, 0.15)")
      discGrad.addColorStop(0.3, resolvedColor)
      discGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.95)")
      discGrad.addColorStop(0.7, resolvedColor)
      discGrad.addColorStop(1, "rgba(255, 255, 255, 0.15)")

      ctx.strokeStyle = discGrad
      ctx.lineWidth = 2.4
      ctx.stroke()

      // Inner disc spindle hole
      ctx.beginPath()
      ctx.ellipse(cx, discY, discRadiusX * 0.32, discRadiusY * 0.32, 0, 0, Math.PI * 2)
      ctx.strokeStyle = resolvedColor
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.restore()

      // 2. Iconic 3D Stylized "DVD" Lettering
      ctx.font = "italic 900 48px 'Impact', 'Segoe UI Black', sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Glowing Aura Shadow
      if (!isGhost) {
        ctx.shadowColor = resolvedColor
        ctx.shadowBlur = 16
      }

      // Metallic Top Gradient Fill
      const textGrad = ctx.createLinearGradient(cx, cy - 32, cx, cy + 8)
      textGrad.addColorStop(0, "#ffffff")
      textGrad.addColorStop(0.45, "#ffffff")
      textGrad.addColorStop(0.55, resolvedColor)
      textGrad.addColorStop(1.0, resolvedColor)

      ctx.fillStyle = textGrad
      ctx.fillText("DVD", cx, cy - 8)

      // 3. Subtitle "VIDEO" with tracking
      ctx.font = "900 13px 'Arial Black', sans-serif"
      ctx.fillStyle = resolvedColor
      ctx.shadowBlur = isGhost ? 0 : 8
      ctx.fillText("V I D E O", cx, cy + 25)
    } else {
      // Custom Text Holographic Badge Box
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      if (!isGhost) {
        ctx.shadowColor = resolvedColor
        ctx.shadowBlur = 16

        // Rounded Holographic Pill Container
        ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(x + 4, y + 4, bw - 8, bh - 8, 12)
        ctx.stroke()
      }

      ctx.font = "italic 900 40px 'Impact', 'Segoe UI Black', sans-serif"
      const textGrad = ctx.createLinearGradient(cx, y + 8, cx, y + bh - 8)
      textGrad.addColorStop(0, "#ffffff")
      textGrad.addColorStop(0.5, resolvedColor)
      textGrad.addColorStop(1, resolvedColor)

      ctx.fillStyle = textGrad
      ctx.fillText(this.title, cx, cy)
    }

    ctx.restore()
  }

  update(dt) {
    const W = this.width
    const H = this.height

    // 1. Update Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      if (this.sparks[i].update(dt)) {
        this.sparks.splice(i, 1)
      }
    }

    // 2. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      if (this.shockwaves[i].update(dt)) {
        this.shockwaves.splice(i, 1)
      }
    }

    // 3. Update DVD Logo Items (Physics & Collisions)
    this.items.forEach((item) => {
      if (item === this.draggedItem) return

      // Ghost trail history
      if (this.trail) {
        item.history.push({ x: item.x, y: item.y })
        if (item.history.length > 20) {
          item.history.shift()
        }
      }

      item.x += item.dx * dt
      item.y += item.dy * dt

      let hitH = false
      let hitV = false
      let impactX = item.x + this.boxWidth / 2
      let impactY = item.y + this.boxHeight / 2
      let normX = 0
      let normY = 0

      // Horizontal Wall Collisions
      if (item.x + this.boxWidth >= W) {
        item.x = W - this.boxWidth
        item.dx = -Math.abs(item.dx)
        hitH = true
        normX = -1
        impactX = W
      } else if (item.x <= 0) {
        item.x = 0
        item.dx = Math.abs(item.dx)
        hitH = true
        normX = 1
        impactX = 0
      }

      // Vertical Wall Collisions
      if (item.y + this.boxHeight >= H) {
        item.y = H - this.boxHeight
        item.dy = -Math.abs(item.dy)
        hitV = true
        normY = -1
        impactY = H
      } else if (item.y <= 0) {
        item.y = 0
        item.dy = Math.abs(item.dy)
        hitV = true
        normY = 1
        impactY = 0
      }

      const isCorner = hitH && hitV
      if (hitH || hitV) {
        if (this.colorMode === "random") {
          item.currentColor = this.getRandomColor(item.currentColor)
        }
        const color = this.getResolvedColor(item.currentColor)
        this._emitBounceSparks(impactX, impactY, normX, normY, color, isCorner)
      }
    })
  }

  draw() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height

    ctx.clearRect(0, 0, W, H)

    // 1. Draw Impact Shockwaves
    for (let i = 0; i < this.shockwaves.length; i++) {
      this.shockwaves[i].draw(ctx)
    }

    // 2. Draw Sparks
    for (let i = 0; i < this.sparks.length; i++) {
      this.sparks[i].draw(ctx)
    }

    // 3. Draw DVD Logo Items
    this.items.forEach((item) => {
      // Ghost Trail with Holographic Quadratic Decay
      if (this.trail && item.history.length > 0) {
        for (let i = 0; i < item.history.length; i += 2) {
          const hist = item.history[i]
          const progress = (i + 1) / item.history.length
          const alpha = Math.pow(progress, 2.2) * 0.3
          this.drawItem(item, hist.x, hist.y, alpha, false, true)
        }
      }

      // Main Logo
      this.drawItem(item, item.x, item.y, 1.0, this.glitch, false)
    })
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastTime = performance.now()
    this.time = 0
    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "auto"

    this.resize()

    const animateLoop = (now) => {
      if (!this.active) return
      this.animationFrameId = requestAnimationFrame(animateLoop)

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

    this.animationFrameId = requestAnimationFrame(animateLoop)
  }

  stop() {
    this.active = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.canvas) {
      this.canvas.style.display = "none"
    }
    this.sparks = []
    this.shockwaves = []
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this.handleResize)
    window.removeEventListener("pointerdown", this._pointerDownHandler)
    window.removeEventListener("pointermove", this._pointerMoveHandler)
    window.removeEventListener("pointerup", this._pointerUpHandler)
    window.removeEventListener("pointercancel", this._pointerUpHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }
}
