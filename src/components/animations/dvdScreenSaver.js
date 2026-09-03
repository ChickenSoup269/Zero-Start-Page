/**
 * DVDEffect — Authentic 8-Bit Pixel Art Retro Arcade DVD Screen Saver
 *
 * Implements the 6 Golden Principles:
 *  1. Pure 8-Bit Pixel Art Geometry:
 *     - Pixelated bitmap matrix for the iconic "DVD" letters and stepped pixel laser disc ellipse.
 *     - 8-bit retro micro-font for "V I D E O" and custom text rendering.
 *     - Hard pixel drop shadows & crisp arcade borders.
 *  2. Retro 8-Bit Collision Physics:
 *     - Square pixel explosion debris upon wall bounces.
 *     - Stepped pixel shockwave boxes.
 *     - Legendary 8-bit Supernova Corner-Hit with multi-color particle fireworks.
 *  3. 8-Bit Ghost Trails & Scanline CRT Glitch:
 *     - Step-decay pixel shadow ghosts and horizontal line-shift scanline glitches.
 *  4. Interactive Kinetic Physics:
 *     - Grab, drag and fling the pixel logo with mouse velocity.
 *  5. 60Hz - 240Hz Delta Normalization & Zero CPU Lag.
 *  6. 100% Backward-Compatible API (setOptions, updateTitle, updateSpeed, etc.).
 */

const DVD_PALETTES = [
  "#00f0ff", // Cyber Cyan
  "#ff0055", // Neon Magenta
  "#ffdd00", // Imperial Gold
  "#00ff88", // Electric Emerald
  "#a855f7", // Holographic Violet
  "#ff6b00", // Solar Flare Orange
  "#38bdf8", // Sky Diamond
  "#f43f5e", // Crimson Ruby
  "#ffffff", // Retro White
]

// ── 8-Bit Square Pixel Spark ──────────────────────────────────────────────────
class PixelSpark {
  constructor(x, y, vx, vy, color, isCorner = false) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.color = color
    this.alpha = 1.0
    this.decay = isCorner ? Math.random() * 0.02 + 0.015 : Math.random() * 0.05 + 0.035
    this.size = isCorner ? Math.floor(Math.random() * 4 + 4) : Math.floor(Math.random() * 3 + 3)
    this.isCorner = isCorner
  }

  update(dt) {
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.vx *= 0.94
    this.vy *= 0.94
    this.alpha -= this.decay * dt
    return this.alpha <= 0
  }

  draw(ctx) {
    if (this.alpha <= 0.01) return
    ctx.save()
    ctx.fillStyle = this.color
    ctx.globalAlpha = this.alpha
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size)

    if (this.alpha > 0.4) {
      ctx.fillStyle = "#ffffff"
      ctx.globalAlpha = this.alpha * 0.8
      ctx.fillRect(
        Math.round(this.x + this.size * 0.25),
        Math.round(this.y + this.size * 0.25),
        Math.max(1, Math.round(this.size * 0.5)),
        Math.max(1, Math.round(this.size * 0.5)),
      )
    }
    ctx.restore()
  }
}

// ── 8-Bit Stepped Pixel Shockwave Box ─────────────────────────────────────────
class PixelShockwave {
  constructor(x, y, color, maxRadius = 60) {
    this.x = x
    this.y = y
    this.color = color
    this.radius = 4
    this.maxRadius = maxRadius
    this.alpha = 0.9
    this.speed = maxRadius / 12
  }

  update(dt) {
    this.radius += this.speed * dt
    this.alpha -= 0.065 * dt
    return this.alpha <= 0 || this.radius >= this.maxRadius
  }

  draw(ctx) {
    if (this.alpha <= 0.01) return
    ctx.save()
    ctx.strokeStyle = this.color
    ctx.globalAlpha = this.alpha
    ctx.lineWidth = 3
    const r = Math.round(this.radius)
    // 8-bit diamond / octagonal box shockwave
    ctx.strokeRect(Math.round(this.x - r), Math.round(this.y - r), r * 2, r * 2)
    ctx.restore()
  }
}

// ── 8-Bit DVD Bitmap Matrix (36 columns x 18 rows) ───────────────────────────
// 1 = Main Body, 2 = Highlight/White Core, 3 = Subtitle / Disc Rim, 4 = Disc Inner
const DVD_BITMAP_ROWS = [
  " 1111111000000110000011000011111110 ",
  " 1122221100001111000111100112222110 ",
  " 1120002110001111000111100112000211 ",
  " 1120000210001111000111100112000021 ",
  " 1120000211000111000111000112000021 ",
  " 1120000211000111000111000112000021 ",
  " 1120000210000011000110000112000021 ",
  " 1120002110000011101110000112000211 ",
  " 1122221100000001101100000112222110 ",
  " 111111100000000011100000011111110 ",
  " 0000000000000000000000000000000000 ",
  " 0033333333333333333333333333333300 ",
  " 3300000000000000000000000000000033 ",
  " 3003003033303330033330033330000003 ",
  " 3003003003003003030000030003000003 ",
  " 3000303003003003033300030003000003 ",
  " 3000303003003003030000030003000003 ",
  " 0330030033303330033330033330000330 ",
]

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

    this.pixelSize = 4
    this.bitmapWidth = 36
    this.bitmapHeight = 18

    this.boxWidth = this.bitmapWidth * this.pixelSize
    this.boxHeight = this.bitmapHeight * this.pixelSize

    this.width = window.innerWidth
    this.height = window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)

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
    if (this.title.toUpperCase() === "DVD") {
      this.pixelSize = 4
      this.boxWidth = 36 * this.pixelSize
      this.boxHeight = 18 * this.pixelSize
    } else {
      this.pixelSize = 4
      const charWidth = 6 * this.pixelSize
      this.boxWidth = Math.max(120, this.title.length * charWidth + 24)
      this.boxHeight = 16 * this.pixelSize
    }
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
      this.ctx.imageSmoothingEnabled = false
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
    const count = isCorner ? 48 : 16
    this.shockwaves.push(new PixelShockwave(x, y, color, isCorner ? 140 : 65))

    for (let i = 0; i < count; i++) {
      const angle = isCorner
        ? Math.random() * Math.PI * 2
        : Math.atan2(normalY, normalX) + (Math.random() - 0.5) * 1.6
      const speed = isCorner ? Math.random() * 8.5 + 3.0 : Math.random() * 5.0 + 1.8
      const vx = Math.cos(angle) * speed
      const vy = Math.sin(angle) * speed
      const sparkColor = isCorner && Math.random() > 0.5 ? this.getRandomColor() : color
      this.sparks.push(new PixelSpark(x, y, vx, vy, sparkColor, isCorner))
    }
  }

  // ── Render 8-Bit Pixel DVD Logo ─────────────────────────────────────────────
  drawItem(item, x, y, alpha = 1.0, isGlitch = false, isGhost = false) {
    const ctx = this.ctx
    const color = this.getResolvedColor(item.currentColor)
    const pSize = this.pixelSize

    ctx.save()
    ctx.globalAlpha = alpha

    let posX = Math.round(x)
    let posY = Math.round(y)

    // 8-bit Scanline / Glitch Jitter
    if (isGlitch && Math.random() > 0.68) {
      posX += Math.round((Math.random() - 0.5) * 16)
      posY += Math.round((Math.random() - 0.5) * 8)
    }

    if (this.title.toUpperCase() === "DVD") {
      // Draw 8-Bit Hard Drop Shadow first
      if (!isGhost) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)"
        for (let r = 0; r < DVD_BITMAP_ROWS.length; r++) {
          const rowStr = DVD_BITMAP_ROWS[r]
          for (let c = 0; c < rowStr.length; c++) {
            if (rowStr[c] !== " " && rowStr[c] !== "0") {
              ctx.fillRect(posX + (c + 1) * pSize, posY + (r + 1) * pSize, pSize, pSize)
            }
          }
        }
      }

      // Draw 8-Bit DVD Pixel Grid
      for (let r = 0; r < DVD_BITMAP_ROWS.length; r++) {
        const rowStr = DVD_BITMAP_ROWS[r]
        for (let c = 0; c < rowStr.length; c++) {
          const val = rowStr[c]
          if (val === "1") {
            // Main Body Color
            ctx.fillStyle = color
            ctx.fillRect(posX + c * pSize, posY + r * pSize, pSize, pSize)
          } else if (val === "2") {
            // Hot White Pixel Core
            ctx.fillStyle = "#ffffff"
            ctx.fillRect(posX + c * pSize, posY + r * pSize, pSize, pSize)
          } else if (val === "3") {
            // Subtitle & Rim Color
            ctx.fillStyle = isGhost ? color : "#ffffff"
            ctx.fillRect(posX + c * pSize, posY + r * pSize, pSize, pSize)
          }
        }
      }
    } else {
      // Custom Text in 8-Bit Pixel Arcade Box
      if (!isGhost) {
        // 8-Bit Stepped Border Box
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)"
        ctx.fillRect(posX, posY, this.boxWidth, this.boxHeight)
        ctx.strokeStyle = color
        ctx.lineWidth = pSize
        ctx.strokeRect(posX + pSize / 2, posY + pSize / 2, this.boxWidth - pSize, this.boxHeight - pSize)
      }

      ctx.font = `900 ${Math.round(9 * pSize)}px 'Press Start 2P', 'Courier New', monospace`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      if (!isGhost) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
        ctx.fillText(this.title, posX + this.boxWidth / 2 + 2, posY + this.boxHeight / 2 + 2)
      }

      ctx.fillStyle = color
      ctx.fillText(this.title, posX + this.boxWidth / 2, posY + this.boxHeight / 2)
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
        if (item.history.length > 18) {
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
      // 8-bit Ghost Trail
      if (this.trail && item.history.length > 0) {
        for (let i = 0; i < item.history.length; i += 3) {
          const hist = item.history[i]
          const progress = (i + 1) / item.history.length
          const alpha = progress * 0.28
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
