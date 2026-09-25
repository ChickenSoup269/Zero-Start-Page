/**
 * Murmuration Effect — a flock of birds flying in flowing shapes (boids).
 * Canvas 2D on the shared #effect-canvas; silhouettes with soft motion
 * trails that keep the canvas transparent so the wallpaper stays visible.
 */
export class MurmurationEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this._raf = null
    this._time = 0
    this._lastFrame = 0

    this.options = {
      count: 220,
      speed: 1,
      cohesion: 1,
      color: "#1a1a2e",
      mouseRepel: true,
      ...options,
    }

    this.birds = []
    this.mouse = { x: -9999, y: -9999 }
    this.speedScale = 1
    this.targetFps = 60
    this.densityScale = 1
    this.renderScale = 1

    this._perception = 60
    this._separationRadius = 26
    this._maxSpeedBase = 2.3
    this._maxForce = 0.055
    this._edgeMargin = 70

    this._onResize = () => this.resize()
    this._onMouseMove = (e) => {
      this.mouse.x = e.clientX
      this.mouse.y = e.clientY
    }
    this._onMouseLeave = () => {
      this.mouse.x = -9999
      this.mouse.y = -9999
    }

    window.addEventListener("resize", this._onResize)
    window.addEventListener("mousemove", this._onMouseMove, { passive: true })
    document.documentElement.addEventListener("mouseleave", this._onMouseLeave)

    this.resize()
    this._spawnFlock(this._targetCount())
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  start() {
    if (!this.ctx || this.active) return
    this.active = true
    // Inline display beats the bg-effect-canvas-hidden class AND the applier's
    // effect-changed cleanup, which leaves display:none inline on the canvas.
    this.canvas.style.display = "block"
    this.canvas.classList.remove("bg-effect-canvas-hidden")
    this._lastFrame = performance.now()
    this._raf = requestAnimationFrame(this._animate)
  }

  stop() {
    this.active = false
    if (this._raf) cancelAnimationFrame(this._raf)
    this._raf = null
    this.canvas?.classList.add("bg-effect-canvas-hidden")
    if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._onResize)
    window.removeEventListener("mousemove", this._onMouseMove)
    document.documentElement.removeEventListener("mouseleave", this._onMouseLeave)
    this.birds = []
  }

  resize() {
    if (!this.canvas) return
    // Backing store can be smaller than CSS size (renderScale) — the browser
    // upscales, which is fine for soft dark silhouettes and saves fill-rate.
    this._w = window.innerWidth
    this._h = window.innerHeight
    const rs = this.renderScale || 1
    this.canvas.width = Math.round(this._w * rs)
    this.canvas.height = Math.round(this._h * rs)
    this.canvas.style.width = this._w + "px"
    this.canvas.style.height = this._h + "px"
    this.ctx.setTransform(rs, 0, 0, rs, 0, 0)
  }

  // ── Options ────────────────────────────────────────────────────────────────
  setOptions(options = {}) {
    const prevCount = this.options.count
    Object.assign(this.options, options)
    if (options.count !== undefined && options.count !== prevCount) {
      this._spawnFlock(this._targetCount())
    }
  }

  updateColor(color) {
    if (color) this.options.color = color
  }

  setPerformanceBudget(profile = {}) {
    if (profile.speedScale !== undefined) this.speedScale = profile.speedScale
    if (profile.targetFps !== undefined) this.targetFps = profile.targetFps
    if (profile.level !== undefined) {
      const target = profile.level === "low" ? 0.6 : 1
      if (target !== this.renderScale) {
        this.renderScale = target
        this.resize()
      }
    }
    if (profile.densityScale !== undefined) {
      this.densityScale = profile.densityScale
      this._spawnFlock(this._targetCount())
    }
  }

  _targetCount() {
    return Math.max(30, Math.round(this.options.count * this.densityScale))
  }

  _spawnFlock(target) {
    const w = this._w || window.innerWidth
    const h = this._h || window.innerHeight
    const cx = w / 2
    const cy = h / 2
    while (this.birds.length > target) this.birds.pop()
    while (this.birds.length < target) {
      const angle = Math.random() * Math.PI * 2
      this.birds.push({
        x: cx + (Math.random() - 0.5) * w * 0.5,
        y: cy + (Math.random() - 0.5) * h * 0.5,
        vx: Math.cos(angle) * this._maxSpeedBase,
        vy: Math.sin(angle) * this._maxSpeedBase,
        phase: Math.random() * Math.PI * 2,
        size: 0.85 + Math.random() * 0.7,
      })
    }
  }

  // ── Simulation ─────────────────────────────────────────────────────────────
  // Grid cells are pooled and keyed by row-major index; the stamp invalidates
  // leftovers from the previous frame without reallocating arrays.
  _buildGrid(cell) {
    const grid = this._grid || (this._grid = new Map())
    const stamp = (this._gridStamp = (this._gridStamp || 0) + 1)
    const cols = Math.ceil(this._w / cell) + 2
    for (const b of this.birds) {
      const gx = Math.floor(b.x / cell) + 1
      const gy = Math.floor(b.y / cell) + 1
      const key = gy * cols + gx
      let cellArr = grid.get(key)
      if (!cellArr) {
        cellArr = []
        grid.set(key, cellArr)
      }
      if (cellArr._stamp !== stamp) {
        cellArr._stamp = stamp
        cellArr.length = 0
      }
      cellArr.push(b)
    }
    return grid
  }

  _neighbors(grid, b, out) {
    out.length = 0
    const cell = this._perception
    const cols = Math.ceil(this._w / cell) + 2
    const gx = Math.floor(b.x / cell) + 1
    const gy = Math.floor(b.y / cell) + 1
    const stamp = this._gridStamp
    for (let dy = -1; dy <= 1; dy++) {
      const rowBase = (gy + dy) * cols
      for (let dx = -1; dx <= 1; dx++) {
        const cellArr = grid.get(rowBase + gx + dx)
        if (!cellArr || cellArr._stamp !== stamp) continue
        for (let i = 0; i < cellArr.length; i++) {
          const other = cellArr[i]
          if (other !== b) out.push(other)
        }
      }
    }
    return out
  }

  _step(dt) {
    const opts = this.options
    const cell = this._perception
    const grid = this._buildGrid(cell)
    const neighbors = []
    const maxSpeed = this._maxSpeedBase * opts.speed * this.speedScale
    const w = this._w
    const h = this._h
    const sepR2 = this._separationRadius * this._separationRadius
    const cohWeight = 1.15 * opts.cohesion
    const cell2 = cell * cell

    for (const b of this.birds) {
      this._neighbors(grid, b, neighbors)
      let sepX = 0
      let sepY = 0
      let aliX = 0
      let aliY = 0
      let cohX = 0
      let cohY = 0
      let sepCount = 0
      let aliCount = 0
      let cohCount = 0

      for (const other of neighbors) {
        const dx = b.x - other.x
        const dy = b.y - other.y
        const d2 = dx * dx + dy * dy
        if (d2 > 0 && d2 < sepR2) {
          const d = Math.sqrt(d2)
          sepX += dx / d
          sepY += dy / d
          sepCount++
        }
        if (d2 < cell2) {
          aliX += other.vx
          aliY += other.vy
          aliCount++
          cohX += other.x
          cohY += other.y
          cohCount++
        }
      }

      let fx = 0
      let fy = 0
      if (sepCount > 0) {
        fx += (sepX / sepCount) * 1.6
        fy += (sepY / sepCount) * 1.6
      }
      if (aliCount > 0) {
        fx += (aliX / aliCount - b.vx) * 1.1
        fy += (aliY / aliCount - b.vy) * 1.1
      }
      if (cohCount > 0) {
        fx += (cohX / cohCount - b.x) * 0.022 * cohWeight
        fy += (cohY / cohCount - b.y) * 0.022 * cohWeight
      }

      // Mouse scatters the flock
      if (opts.mouseRepel) {
        const mdx = b.x - this.mouse.x
        const mdy = b.y - this.mouse.y
        const md2 = mdx * mdx + mdy * mdy
        if (md2 < 130 * 130 && md2 > 0.01) {
          const md = Math.sqrt(md2)
          const force = (1 - md / 130) * 0.9
          fx += (mdx / md) * force
          fy += (mdy / md) * force
        }
      }

      // Steer away from edges so the flock stays on screen
      if (b.x < this._edgeMargin) fx += 0.12
      else if (b.x > w - this._edgeMargin) fx -= 0.12
      if (b.y < this._edgeMargin) fy += 0.12
      else if (b.y > h - this._edgeMargin) fy -= 0.12

      // Clamp steering force
      const fLen = Math.sqrt(fx * fx + fy * fy)
      if (fLen > this._maxForce) {
        fx = (fx / fLen) * this._maxForce
        fy = (fy / fLen) * this._maxForce
      }

      b.vx += fx
      b.vy += fy
      const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
      if (speed > maxSpeed) {
        b.vx = (b.vx / speed) * maxSpeed
        b.vy = (b.vy / speed) * maxSpeed
      } else if (speed < maxSpeed * 0.55 && speed > 0.01) {
        b.vx = (b.vx / speed) * maxSpeed * 0.55
        b.vy = (b.vy / speed) * maxSpeed * 0.55
      }

      b.x += b.vx * dt
      b.y += b.vy * dt
      b.phase += 0.32 * (this.speedScale || 1)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx

    // Fade previous frame while keeping the canvas transparent.
    // Fast fade keeps only 1-2 ghosts so flapping birds don't smear into squiggles.
    ctx.globalCompositeOperation = "destination-out"
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)"
    ctx.fillRect(0, 0, this._w, this._h)
    ctx.globalCompositeOperation = "source-over"

    // Every bird is appended to ONE path and stroked once — a single
    // stroke() call instead of hundreds avoids the biggest 2D-canvas cost.
    ctx.strokeStyle = this.options.color
    ctx.lineWidth = 1.7
    ctx.lineCap = "round"
    ctx.beginPath()

    for (const b of this.birds) {
      const vx = b.vx
      const vy = b.vy
      const len = Math.sqrt(vx * vx + vy * vy) || 1
      const ux = vx / len
      const uy = vy / len
      // Wing sweep: tips swing fore/aft along the heading, drawn as a clear V
      const sweep = Math.sin(b.phase) * 0.45
      const wingSpan = 4.2 * b.size
      const backX = -ux * Math.cos(sweep) * wingSpan
      const backY = -uy * Math.cos(sweep) * wingSpan
      const px = -uy
      const py = ux
      const halfSpread = (wingSpan * 0.85 + Math.sin(sweep) * 0.35 * wingSpan)

      ctx.moveTo(
        b.x + backX + px * halfSpread,
        b.y + backY + py * halfSpread,
      )
      ctx.lineTo(b.x + ux * 1.4 * b.size, b.y + uy * 1.4 * b.size)
      ctx.lineTo(
        b.x + backX - px * halfSpread,
        b.y + backY - py * halfSpread,
      )
    }

    ctx.stroke()
  }

  _animate = (now) => {
    if (!this.active) return
    this._raf = requestAnimationFrame(this._animate)

    if (document.visibilityState === "hidden") return
    if (this.targetFps < 60) {
      const interval = 1000 / this.targetFps
      if (now - this._lastFrame < interval) return
    }
    const dtMs = Math.min(now - this._lastFrame, 50)
    this._lastFrame = now
    const dt = (dtMs / 16.67) * this.speedScale

    this._time += dt
    this._step(dt)
    this._draw()
  }
}
