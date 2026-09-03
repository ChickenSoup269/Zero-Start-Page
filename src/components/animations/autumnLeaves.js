/**
 * AutumnLeavesEffect (Leaves Fall HD - Unified Autumn, Green Leaves & Sakura Engine)
 *
 * Implements the 6 Golden Principles:
 *  1. Botanical Organic Leaf & Blossom Geometries:
 *     - Handcrafted Bezier outlines for 8 species: Autumn Maple, Summer Green,
 *       Golden Ginkgo, Golden Oak, Sakura Petals, Cherry Blossoms, Plum Blossoms, and Mixed Forest.
 *  2. Full 3D Tumbling & Underside Shading:
 *     - Natural 3-axis rotation (Pitch, Roll, Yaw) with realistic darker underside tones.
 *  3. Dynamic Aerodynamics & Wind Gusts:
 *     - Organic wind currents, sinusoidal fluttering, and gentle mouse wake repulsion.
 *  4. Ground Settling & Accumulating Leaf Carpet Mode:
 *     - Zero-overhead off-screen buffer stamping for realistic resting ground leaves.
 *  5. Multi-Layer Parallax & Volumetric Depth Shadow.
 *  6. 60Hz - 240Hz Delta Normalization & 100% Backward-Compatible API.
 */

export class AutumnLeavesEffect {
  constructor(canvasId = "effect-canvas", leafType = "maple", settling = false) {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.destroyed = false
    this._animId = null
    this.lastDrawTime = performance.now()

    this.leafType = leafType || "maple"
    this.settling = !!settling
    this.leafCount = 48
    this.leaves = []
    this.settledCount = 0

    // Off-screen canvas for zero-lag ground settled leaves
    this.settledCanvas = null
    this.settledCtx = null

    // Wind Dynamics
    this.wind = {
      strength: 0,
      target: 0,
      timer: Math.floor(Math.random() * 140 + 60),
      duration: 0,
      age: 0,
      time: 0,
    }

    // Mouse Wake
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

    // Comprehensive Color Palettes for each leaf botanical species
    this.colorPalettes = {
      maple: [
        { base: "#e06020", stem: "#7a1a00", tip: "#fca34d", underside: "#c84c10", vein: "#541200" },
        { base: "#cc4400", stem: "#601400", tip: "#f27935", underside: "#b03500", vein: "#480800" },
        { base: "#e83a00", stem: "#701200", tip: "#ff6e38", underside: "#c02800", vein: "#4a0500" },
        { base: "#f07810", stem: "#8a3500", tip: "#ffba52", underside: "#d66205", vein: "#581c00" },
        { base: "#c83000", stem: "#550a00", tip: "#f05a28", underside: "#a82000", vein: "#3e0200" },
        { base: "#d45000", stem: "#6c1c00", tip: "#ff8238", underside: "#b53e00", vein: "#4c0e00" },
        { base: "#b83200", stem: "#4e0c00", tip: "#e85820", underside: "#9a2400", vein: "#360500" },
        { base: "#f09020", stem: "#8a4000", tip: "#ffd066", underside: "#d47510", vein: "#5e2800" },
        { base: "#A0522D", stem: "#4a1e0b", tip: "#d98a62", underside: "#873e1c", vein: "#331204" },
        { base: "#CD853F", stem: "#663b11", tip: "#f2b779", underside: "#b36e2b", vein: "#452205" },
      ],
      simple: [
        { base: "#4caf50", stem: "#1b5e20", tip: "#a5d6a7", underside: "#388e3c", vein: "#134216" },
        { base: "#66bb6a", stem: "#2e7d32", tip: "#c8e6c9", underside: "#43a047", vein: "#1b5e20" },
        { base: "#81c784", stem: "#388e3c", tip: "#e8f5e9", underside: "#66bb6a", vein: "#25632a" },
        { base: "#7cb342", stem: "#33691e", tip: "#dce775", underside: "#558b2f", vein: "#204610" },
        { base: "#8bc34a", stem: "#33691e", tip: "#e6ee9c", underside: "#689f38", vein: "#234d13" },
        { base: "#9ccc65", stem: "#558b2f", tip: "#f0f4c3", underside: "#7cb342", vein: "#39631b" },
        { base: "#cddc39", stem: "#827717", tip: "#fff59d", underside: "#afb42b", vein: "#585208" },
      ],
      ginkgo: [
        { base: "#FFD700", stem: "#8a7000", tip: "#fff3a8", underside: "#e6be00", vein: "#665200" },
        { base: "#FFA500", stem: "#8c5500", tip: "#ffd175", underside: "#e08d00", vein: "#633900" },
        { base: "#FF8C00", stem: "#8a4500", tip: "#ffbc66", underside: "#d97300", vein: "#612e00" },
        { base: "#F0E68C", stem: "#7a7238", tip: "#ffffcc", underside: "#d4ca72", vein: "#544d21" },
        { base: "#EEE8AA", stem: "#757147", tip: "#fffae0", underside: "#d1ca8c", vein: "#524e2b" },
      ],
      oak: [
        { base: "#B8860B", stem: "#543a00", tip: "#e8b83a", underside: "#9c6f05", vein: "#3b2700" },
        { base: "#CD853F", stem: "#613b14", tip: "#f0b678", underside: "#b06d28", vein: "#422407" },
        { base: "#DAA520", stem: "#6b4e05", tip: "#fce068", underside: "#be8c10", vein: "#4a3400" },
        { base: "#8B4513", stem: "#421a02", tip: "#c97336", underside: "#703309", vein: "#290c00" },
      ],
      cherry: [
        { base: "#FFB7D9", stem: "#a83b6f", tip: "#ffffff", underside: "#f09cc3", vein: "#8c2859" },
        { base: "#FF9DC5", stem: "#9c2658", tip: "#ffe0ee", underside: "#eb7fab", vein: "#7d1641" },
        { base: "#FFC0CB", stem: "#ab405a", tip: "#ffffff", underside: "#f5a4b4", vein: "#8f253e" },
      ],
      cherryPetal: [
        { base: "#FFB9DA", stem: "#a63268", tip: "#ffffff", underside: "#f09ec4", vein: "#871f4f" },
        { base: "#FFC6E0", stem: "#ab4474", tip: "#ffffff", underside: "#f5abc7", vein: "#8c2e5b" },
        { base: "#FFABD3", stem: "#9e285d", tip: "#ffe6f3", underside: "#eb8eb9", vein: "#7d1945" },
      ],
      plum: [
        { base: "#D1569E", stem: "#6e1149", tip: "#fca7da", underside: "#b83d87", vein: "#520633" },
        { base: "#E075A0", stem: "#7d254e", tip: "#ffc2db", underside: "#c75483", vein: "#5c1233" },
        { base: "#D96BA8", stem: "#781c52", tip: "#ffb5de", underside: "#bf4e8c", vein: "#570c38" },
      ],
    }

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseLeaveHandler = () => this._onMouseLeave()
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler, { passive: true })
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseleave", this._mouseLeaveHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)
  }

  setLeafType(leafType) {
    if (!leafType) return
    this.leafType = leafType
    this.clearSettled()
    this.initLeaves()
  }

  updateType(leafType) {
    this.setLeafType(leafType)
  }

  setSettling(enabled) {
    this.settling = !!enabled
    if (!this.settling) {
      this.clearSettled()
    }
  }

  clearSettled() {
    this.settledCount = 0
    if (this.settledCtx && this.settledCanvas) {
      this.settledCtx.clearRect(0, 0, this.settledCanvas.width, this.settledCanvas.height)
    }
  }

  resize() {
    if (!this.canvas) return
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.pointerEvents = "none"

    if (!this.settledCanvas) {
      this.settledCanvas = document.createElement("canvas")
    }
    this.settledCanvas.width = this.width
    this.settledCanvas.height = this.height
    this.settledCtx = this.settledCanvas.getContext("2d")

    if (this.active) {
      this.initLeaves()
    }
  }

  initLeaves() {
    this.leaves = []
    for (let i = 0; i < this.leafCount; i++) {
      this.leaves.push(this.createLeaf(true))
    }
  }

  createLeaf(scattered = false) {
    const depth = Math.random() // 0 (far) to 1 (near)
    const baseSize = 10 + depth * 14

    const baseSpecies = ["maple", "simple", "ginkgo", "oak", "cherryPetal", "cherry"]
    const specificType =
      this.leafType === "mixed"
        ? baseSpecies[Math.floor(Math.random() * baseSpecies.length)]
        : this.leafType

    const paletteList =
      this.colorPalettes[specificType] || this.colorPalettes.maple
    const colorObj = paletteList[Math.floor(Math.random() * paletteList.length)]

    // Ground settling threshold offset
    const groundOffset = Math.random() * 28 + 6

    return {
      x: Math.random() * this.width,
      y: scattered ? Math.random() * this.height : Math.random() * -300 - 30,
      z: depth,
      size: baseSize,
      species: specificType,
      color: colorObj,

      // Movement & Dynamics
      speedY: 0.55 + depth * 0.75 + Math.random() * 0.35,
      speedX: (Math.random() - 0.5) * 0.35,

      // 3D Rotations
      angleZ: Math.random() * Math.PI * 2,
      rotationSpeedZ: (Math.random() - 0.5) * 0.022,

      angleX: Math.random() * Math.PI * 2,
      rotationSpeedX: 0.012 + Math.random() * 0.028,

      angleY: Math.random() * Math.PI * 2,
      rotationSpeedY: 0.008 + Math.random() * 0.022,

      // Aerodynamic oscillation
      swayOffset: Math.random() * Math.PI * 2,
      swaySpeed: 0.012 + Math.random() * 0.016,
      swayAmp: 1.1 + depth * 1.5,
      windSensitivity: 0.7 + depth * 0.6 + Math.random() * 0.3,

      opacity: 0.45 + depth * 0.55,
      groundOffset: groundOffset,
    }
  }

  _onMouseMove(e) {
    const curX = e.clientX
    const curY = e.clientY

    if (this.mouse.prevX !== -9999) {
      this.mouse.vx = curX - this.mouse.prevX
      this.mouse.vy = curY - this.mouse.prevY
      this.mouse.speed = Math.min(Math.hypot(this.mouse.vx, this.mouse.vy), 40)
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

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.lastDrawTime = performance.now()
    }
  }

  updateWind(dt) {
    this.wind.time += 0.015 * dt

    if (this.wind.age >= this.wind.duration) {
      this.wind.target = 0
      this.wind.timer -= dt
      if (this.wind.timer <= 0) {
        this.wind.timer = Math.floor(Math.random() * 180 + 80)
        this.wind.duration = Math.floor(Math.random() * 100 + 45)
        this.wind.age = 0
        const dir = Math.random() < 0.45 ? -1 : 1
        this.wind.target = dir * (Math.random() * 2.2 + 0.8)
      }
    } else {
      this.wind.age += dt
    }

    this.wind.strength += (this.wind.target - this.wind.strength) * 0.04 * dt
  }

  start() {
    if (this.active || this.destroyed) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"

    this.resize()

    const loop = (time) => {
      if (!this.active || this.destroyed) return
      this._animId = requestAnimationFrame(loop)

      if (document.visibilityState === "hidden") {
        this.lastDrawTime = time
        return
      }

      const elapsed = Math.min(time - this.lastDrawTime, 100)
      this.lastDrawTime = time
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
    this.clearSettled()
    this.leaves = []
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  stampSettledLeaf(leaf) {
    if (!this.settledCtx || !this.settledCanvas) return

    const sCtx = this.settledCtx
    const s = leaf.size
    const species = leaf.species || this.leafType

    // If leaf carpet gets thick, gently dissolve the oldest layer
    if (this.settledCount > 75) {
      sCtx.save()
      sCtx.globalCompositeOperation = "destination-out"
      sCtx.fillStyle = "rgba(0, 0, 0, 0.06)"
      sCtx.fillRect(0, this.height - 100, this.width, 100)
      sCtx.restore()
      this.settledCount = 60
    }

    sCtx.save()
    sCtx.translate(leaf.x, Math.min(leaf.y, this.height - leaf.groundOffset))
    sCtx.rotate(leaf.angleZ)
    sCtx.scale(Math.cos(leaf.angleX) * 0.9, Math.cos(leaf.angleY) * 0.45)
    sCtx.globalAlpha = leaf.opacity * 0.85

    // Soft ground contact shadow
    sCtx.shadowColor = "rgba(0, 0, 0, 0.35)"
    sCtx.shadowBlur = 3
    sCtx.shadowOffsetY = 2

    const grad = sCtx.createLinearGradient(0, s * 0.8, 0, -s * 0.9)
    const c = leaf.color
    grad.addColorStop(0, c.stem || c.base)
    grad.addColorStop(0.5, c.base)
    grad.addColorStop(1, c.tip)

    sCtx.fillStyle = grad
    this.drawShape(sCtx, species, s)
    sCtx.fill()

    sCtx.shadowColor = "transparent"
    this.drawVeins(sCtx, species, s, leaf.opacity * 0.85, c.vein)

    sCtx.restore()
    this.settledCount++
  }

  update(dt) {
    this.updateWind(dt)

    for (let leaf of this.leaves) {
      // Natural Aerodynamic Flutter
      leaf.angleZ += leaf.rotationSpeedZ * dt
      leaf.angleX += leaf.rotationSpeedX * dt
      leaf.angleY += leaf.rotationSpeedY * dt
      leaf.swayOffset += leaf.swaySpeed * dt

      const horizSway = Math.sin(leaf.swayOffset) * leaf.swayAmp
      const windPush = this.wind.strength * leaf.windSensitivity

      leaf.x += (leaf.speedX + horizSway + windPush) * dt
      leaf.y += leaf.speedY * dt

      // Cursor aerodynamic turbulence
      if (this.mouse.active) {
        const dx = leaf.x - this.mouse.x
        const dy = leaf.y - this.mouse.y
        const dist = Math.hypot(dx, dy)
        if (dist < this.mouse.radius && dist > 1) {
          const force = (1 - dist / this.mouse.radius) * (0.6 + this.mouse.speed * 0.04)
          const angle = Math.atan2(dy, dx)
          leaf.x += Math.cos(angle) * force * 4.2 * dt
          leaf.y += Math.sin(angle) * force * 2.8 * dt
          leaf.angleZ += force * 0.08 * dt
        }
      }

      // Ground settling accumulation logic
      if (this.settling && leaf.y >= this.height - leaf.groundOffset - 10) {
        this.stampSettledLeaf(leaf)
        Object.assign(leaf, this.createLeaf(false))
        continue
      }

      // Recycle when offscreen (if not settling or blown far sideways)
      if (leaf.y > this.height + 60 || leaf.x < -100 || leaf.x > this.width + 100) {
        Object.assign(leaf, this.createLeaf(false))
      }
    }
  }

  // ── Botanical Outlines ─────────────────────────────────────────────────────

  drawMapleLeaf(ctx, s) {
    ctx.beginPath()
    ctx.moveTo(0, s * 0.9)
    ctx.lineTo(s * 0.08, s * 0.55)
    ctx.bezierCurveTo(s * 0.2, s * 0.5, s * 0.48, s * 0.62, s * 0.44, s * 0.38)
    ctx.bezierCurveTo(s * 0.4, s * 0.22, s * 0.22, s * 0.18, s * 0.24, s * 0.02)
    ctx.bezierCurveTo(s * 0.38, -s * 0.08, s * 0.92, s * 0.02, s * 0.9, -s * 0.18)
    ctx.bezierCurveTo(s * 0.88, -s * 0.3, s * 0.58, -s * 0.26, s * 0.52, -s * 0.38)
    ctx.bezierCurveTo(s * 0.58, -s * 0.56, s * 0.48, -s * 0.76, s * 0.3, -s * 0.7)
    ctx.bezierCurveTo(s * 0.2, -s * 0.66, s * 0.14, -s * 0.72, s * 0.12, -s * 0.86)
    ctx.bezierCurveTo(s * 0.08, -s * 1.0, s * 0.02, -s * 1.05, 0, -s * 1.0)
    ctx.bezierCurveTo(-s * 0.02, -s * 1.05, -s * 0.08, -s * 1.0, -s * 0.12, -s * 0.86)
    ctx.bezierCurveTo(-s * 0.14, -s * 0.72, -s * 0.2, -s * 0.66, -s * 0.3, -s * 0.7)
    ctx.bezierCurveTo(-s * 0.48, -s * 0.76, -s * 0.58, -s * 0.56, -s * 0.52, -s * 0.38)
    ctx.bezierCurveTo(-s * 0.58, -s * 0.26, -s * 0.88, -s * 0.3, -s * 0.9, -s * 0.18)
    ctx.bezierCurveTo(-s * 0.92, s * 0.02, -s * 0.38, -s * 0.08, -s * 0.24, s * 0.02)
    ctx.bezierCurveTo(-s * 0.22, s * 0.18, -s * 0.4, s * 0.22, -s * 0.44, s * 0.38)
    ctx.bezierCurveTo(-s * 0.48, s * 0.62, -s * 0.2, s * 0.5, -s * 0.08, s * 0.55)
    ctx.lineTo(0, s * 0.9)
    ctx.closePath()
  }

  drawSimpleLeaf(ctx, s) {
    ctx.beginPath()
    ctx.moveTo(0, s * 0.85)
    ctx.bezierCurveTo(s * 0.5, s * 0.4, s * 0.55, -s * 0.3, 0, -s * 0.9)
    ctx.bezierCurveTo(-s * 0.55, -s * 0.3, -s * 0.5, s * 0.4, 0, s * 0.85)
    ctx.closePath()
  }

  drawGinkgoLeaf(ctx, s) {
    ctx.beginPath()
    ctx.moveTo(0, s * 0.9)
    ctx.lineTo(s * 0.04, s * 0.4)
    ctx.bezierCurveTo(s * 0.48, s * 0.35, s * 0.72, 0.0, s * 0.45, -s * 0.65)
    ctx.bezierCurveTo(s * 0.25, -s * 0.85, s * 0.08, -s * 0.75, 0, -s * 0.68)
    ctx.bezierCurveTo(-s * 0.08, -s * 0.75, -s * 0.25, -s * 0.85, -s * 0.45, -s * 0.65)
    ctx.bezierCurveTo(-s * 0.72, 0.0, -s * 0.48, s * 0.35, -s * 0.04, s * 0.4)
    ctx.lineTo(0, s * 0.9)
    ctx.closePath()
  }

  drawOakLeaf(ctx, s) {
    ctx.beginPath()
    ctx.moveTo(0, s * 0.9)
    ctx.lineTo(0, s * 0.75)
    ctx.bezierCurveTo(s * 0.32, s * 0.7, s * 0.45, s * 0.52, s * 0.25, s * 0.45)
    ctx.bezierCurveTo(s * 0.52, s * 0.35, s * 0.58, s * 0.12, s * 0.3, s * 0.05)
    ctx.bezierCurveTo(s * 0.55, -s * 0.08, s * 0.5, -s * 0.45, s * 0.2, -s * 0.5)
    ctx.bezierCurveTo(s * 0.3, -s * 0.65, s * 0.15, -s * 0.85, 0, -s * 0.9)
    ctx.bezierCurveTo(-s * 0.15, -s * 0.85, -s * 0.3, -s * 0.65, -s * 0.2, -s * 0.5)
    ctx.bezierCurveTo(-s * 0.5, -s * 0.45, -s * 0.55, -s * 0.08, -s * 0.3, s * 0.05)
    ctx.bezierCurveTo(-s * 0.58, s * 0.12, -s * 0.52, s * 0.35, -s * 0.25, s * 0.45)
    ctx.bezierCurveTo(-s * 0.45, s * 0.52, -s * 0.32, s * 0.7, 0, s * 0.75)
    ctx.lineTo(0, s * 0.9)
    ctx.closePath()
  }

  drawCherryPetal(ctx, s) {
    const w = s * 0.68
    const h = s * 1.05
    const baseEndY = h * 0.65
    const topLobeY = -h * 0.7
    const notchY = -h * 0.52

    ctx.beginPath()
    ctx.moveTo(0, baseEndY)
    ctx.bezierCurveTo(-w * 0.65, h * 0.35, -w * 0.95, -h * 0.1, -w * 0.62, topLobeY)
    ctx.bezierCurveTo(-w * 0.35, topLobeY * 1.05, -w * 0.12, notchY * 1.05, 0, notchY)
    ctx.bezierCurveTo(w * 0.12, notchY * 1.05, w * 0.35, topLobeY * 1.05, w * 0.62, topLobeY)
    ctx.bezierCurveTo(w * 0.95, -h * 0.1, w * 0.65, h * 0.35, 0, baseEndY)
    ctx.closePath()
  }

  drawCherryBlossom(ctx, s) {
    const petalCount = 5
    for (let i = 0; i < petalCount; i++) {
      ctx.save()
      ctx.rotate((i / petalCount) * Math.PI * 2)
      ctx.translate(0, -s * 0.45)
      this.drawCherryPetal(ctx, s * 0.7)
      ctx.restore()
    }
  }

  drawPlumBlossom(ctx, s) {
    const petalCount = 5
    for (let i = 0; i < petalCount; i++) {
      ctx.save()
      ctx.rotate((i / petalCount) * Math.PI * 2)
      ctx.translate(0, -s * 0.4)
      ctx.beginPath()
      ctx.ellipse(0, 0, s * 0.35, s * 0.48, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  drawShape(ctx, species, s) {
    switch (species) {
      case "maple":
        this.drawMapleLeaf(ctx, s)
        break
      case "simple":
        this.drawSimpleLeaf(ctx, s)
        break
      case "ginkgo":
        this.drawGinkgoLeaf(ctx, s)
        break
      case "oak":
        this.drawOakLeaf(ctx, s)
        break
      case "cherry":
        this.drawCherryBlossom(ctx, s)
        break
      case "cherryPetal":
        this.drawCherryPetal(ctx, s)
        break
      case "plum":
        this.drawPlumBlossom(ctx, s)
        break
      default:
        this.drawMapleLeaf(ctx, s)
    }
  }

  drawVeins(ctx, species, s, opacity, veinColor) {
    ctx.strokeStyle = veinColor || `rgba(0, 0, 0, ${opacity * 0.25})`
    ctx.lineWidth = Math.max(0.55, s * 0.045)

    if (species === "maple") {
      ctx.beginPath()
      ctx.moveTo(0, s * 0.6)
      ctx.bezierCurveTo(0, s * 0.1, 0, -s * 0.5, 0, -s * 0.9)
      ctx.stroke()
      for (const sign of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(0, s * 0.1)
        ctx.bezierCurveTo(sign * s * 0.3, 0, sign * s * 0.65, -s * 0.06, sign * s * 0.8, -s * 0.14)
        ctx.stroke()
      }
    } else if (species === "simple") {
      ctx.beginPath()
      ctx.moveTo(0, s * 0.8)
      ctx.quadraticCurveTo(s * 0.04, 0, 0, -s * 0.85)
      ctx.stroke()
    } else if (species === "oak") {
      ctx.beginPath()
      ctx.moveTo(0, s * 0.8)
      ctx.lineTo(0, -s * 0.7)
      ctx.stroke()
    } else if (species === "ginkgo") {
      for (let i = -3; i <= 3; i++) {
        const angle = (i / 8) * (Math.PI * 0.65)
        ctx.beginPath()
        ctx.moveTo(0, s * 0.4)
        ctx.lineTo(Math.sin(angle) * s * 0.65, -Math.cos(angle) * s * 0.65 + s * 0.4)
        ctx.stroke()
      }
    }
  }

  draw() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)

    // Draw settled ground leaf carpet
    if (this.settling && this.settledCanvas && this.settledCount > 0) {
      ctx.drawImage(this.settledCanvas, 0, 0)
    }

    // Sort active flying leaves back-to-front (Z-sorting)
    this.leaves.sort((a, b) => a.z - b.z)

    for (let leaf of this.leaves) {
      const s = leaf.size
      const species = leaf.species || this.leafType

      const scale3DX = Math.cos(leaf.angleX)
      const scale3DY = Math.cos(leaf.angleY)
      const isUnderside = scale3DX * scale3DY < 0

      ctx.save()
      ctx.translate(leaf.x, leaf.y)
      ctx.rotate(leaf.angleZ)
      ctx.scale(scale3DX, scale3DY)
      ctx.globalAlpha = leaf.opacity

      // Soft Ground / Atmospheric Depth Shadow
      ctx.shadowColor = `rgba(0, 0, 0, ${(leaf.z * 0.25).toFixed(2)})`
      ctx.shadowBlur = 4 + leaf.z * 6
      ctx.shadowOffsetY = 2 + leaf.z * 4

      // Fill with volumetric gradient
      const grad = ctx.createLinearGradient(0, s * 0.8, 0, -s * 0.9)
      const c = leaf.color
      if (isUnderside) {
        grad.addColorStop(0, c.underside)
        grad.addColorStop(1, c.base)
      } else {
        grad.addColorStop(0, c.stem || c.base)
        grad.addColorStop(0.5, c.base)
        grad.addColorStop(1, c.tip)
      }

      ctx.fillStyle = grad
      this.drawShape(ctx, species, s)
      ctx.fill()

      // Reset shadow for crisp veins
      ctx.shadowColor = "transparent"
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0

      this.drawVeins(ctx, species, s, leaf.opacity, isUnderside ? c.vein : undefined)

      ctx.restore()
    }
  }
}
