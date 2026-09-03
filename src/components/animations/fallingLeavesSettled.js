/**
 * FallingLeavesSettledEffect (Settling Leaves HD)
 *
 * Hyper-realistic, high-performance simulation of leaves gently fluttering,
 * tumbling in 3D, and settling onto the ground to form a natural bed of leaves.
 *
 * Features:
 *  - 7 Handcrafted botanical leaf skins:
 *      * Maple (5-lobed Japanese/Autumn maple)
 *      * Oak (classic wavy lobed oak)
 *      * Simple (graceful oval lanceolate leaf)
 *      * Ginkgo (fan-shaped biloba with radial veins)
 *      * Cherry Blossoms (5-petal sakura bloom with golden stamens)
 *      * Sakura Petals (notched single petals)
 *      * Plum Blossoms (deep-rose 5-petal floral bloom)
 *  - Full 3D tumbling physics (pitch, roll, yaw) with dynamic aerodynamic drag & two-sided shading.
 *  - Ground-effect cushioning: realistic aerodynamic glide & soft landing onto the ground.
 *  - High-performance off-screen accumulation buffer for settled leaves with soft ground shadows.
 *  - Multi-depth layering with perspective parallax and realistic translucency gradients.
 *  - Dynamic natural wind gusts and interactive cursor wake / air turbulence.
 */

export class FallingLeavesSettledEffect {
  constructor(canvasId, leafType = "maple") {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) {
      console.warn(`[FallingLeavesSettledEffect] Canvas #${canvasId} not found.`)
      return
    }
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this._animId = null
    this.lastDrawTime = 0

    this.leafType = leafType || "maple"
    this.leafCount = 50
    this.leaves = []

    // Off-screen canvas for baking settled leaves (renders thousands at 60fps with zero lag)
    this.settledCanvas = document.createElement("canvas")
    this.settledCtx = this.settledCanvas.getContext("2d")
    this.settledCount = 0
    this.maxSettled = 450

    // Wind Dynamics
    this.wind = {
      strength: 0,
      target: 0,
      timer: Math.floor(Math.random() * 150 + 60),
      duration: 0,
      age: 0,
      time: 0,
    }

    // Mouse Wake Interaction
    this.mouse = {
      x: -9999,
      y: -9999,
      prevX: -9999,
      prevY: -9999,
      vx: 0,
      vy: 0,
      speed: 0,
      radius: 130,
      active: false,
    }

    // Comprehensive Color Palettes for each leaf type
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
      oak: [
        { base: "#B8860B", stem: "#543a00", tip: "#e8b83a", underside: "#9c6f05", vein: "#3b2700" },
        { base: "#CD853F", stem: "#613b14", tip: "#f0b678", underside: "#b06d28", vein: "#422407" },
        { base: "#DAA520", stem: "#6b4e05", tip: "#fce068", underside: "#be8c10", vein: "#4a3400" },
        { base: "#D2B48C", stem: "#6b5438", tip: "#fae2c3", underside: "#b8976c", vein: "#47341e" },
        { base: "#8B4513", stem: "#421a02", tip: "#c97336", underside: "#703309", vein: "#290c00" },
        { base: "#A0522D", stem: "#4f220e", tip: "#d48159", underside: "#853e1c", vein: "#331204" },
        { base: "#8B5A2B", stem: "#45280d", tip: "#bf854f", underside: "#73461b", vein: "#2c1704" },
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
        { base: "#FFE4B5", stem: "#856d47", tip: "#ffffff", underside: "#e0c492", vein: "#594628" },
        { base: "#DEB887", stem: "#705638", tip: "#fce3c0", underside: "#bd9766", vein: "#4a351d" },
      ],
      cherry: [
        { base: "#FFB7D9", stem: "#a83b6f", tip: "#ffffff", underside: "#f09cc3", vein: "#8c2859" },
        { base: "#FF9DC5", stem: "#9c2658", tip: "#ffe0ee", underside: "#eb7fab", vein: "#7d1641" },
        { base: "#FFC0CB", stem: "#ab405a", tip: "#ffffff", underside: "#f5a4b4", vein: "#8f253e" },
        { base: "#FFA8D3", stem: "#a32e65", tip: "#ffebf5", underside: "#eb8ec0", vein: "#851c4e" },
        { base: "#FFB6D9", stem: "#a6386a", tip: "#ffffff", underside: "#f29ec4", vein: "#872253" },
        { base: "#FF99CC", stem: "#991f57", tip: "#ffd6ea", underside: "#e67aae", vein: "#7a1040" },
      ],
      cherryPetal: [
        { base: "#FFB9DA", stem: "#a63268", tip: "#ffffff", underside: "#f09ec4", vein: "#871f4f" },
        { base: "#FFC6E0", stem: "#ab4474", tip: "#ffffff", underside: "#f5abc7", vein: "#8c2e5b" },
        { base: "#FFABD3", stem: "#9e285d", tip: "#ffe6f3", underside: "#eb8eb9", vein: "#7d1945" },
        { base: "#FF9ECD", stem: "#941f53", tip: "#ffdeee", underside: "#e67eb0", vein: "#75103c" },
        { base: "#FF91C7", stem: "#8c1549", tip: "#ffd1e6", underside: "#de71a7", vein: "#6e0a35" },
        { base: "#F27FB8", stem: "#800e40", tip: "#ffc2de", underside: "#d6639d", vein: "#63042d" },
      ],
      plum: [
        { base: "#D1569E", stem: "#6e1149", tip: "#fca7da", underside: "#b83d87", vein: "#520633" },
        { base: "#E075A0", stem: "#7d254e", tip: "#ffc2db", underside: "#c75483", vein: "#5c1233" },
        { base: "#D96BA8", stem: "#781c52", tip: "#ffb5de", underside: "#bf4e8c", vein: "#570c38" },
        { base: "#DA5BA3", stem: "#78124f", tip: "#ffaade", underside: "#be4189", vein: "#570535" },
        { base: "#E088B3", stem: "#82325c", tip: "#ffd1e8", underside: "#c46a96", vein: "#611a3e" },
        { base: "#E59BC9", stem: "#8c4471", tip: "#ffe3f4", underside: "#c97da9", vein: "#692a51" },
      ],
    }

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseLeaveHandler = () => this._onMouseLeave()

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseleave", this._mouseLeaveHandler, { passive: true })
  }

  // ── Sizing & Mode Changes ──────────────────────────────────────────────────

  setLeafType(leafType) {
    if (!leafType) return
    this.leafType = leafType
    this.settledCount = 0
    if (this.settledCtx) {
      this.settledCtx.clearRect(0, 0, this.settledCanvas.width, this.settledCanvas.height)
    }
    this.initLeaves()
  }

  updateType(leafType) {
    this.setLeafType(leafType)
  }

  resize() {
    if (!this.canvas) return
    const W = window.innerWidth
    const H = window.innerHeight
    this.canvas.width = W
    this.canvas.height = H

    this.settledCanvas.width = W
    this.settledCanvas.height = H
    this.settledCount = 0
    this.settledCtx.clearRect(0, 0, W, H)

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

  // ── Leaf Particle Factory ──────────────────────────────────────────────────

  createLeaf(scattered = false) {
    const depth = Math.random() // 0 (far) to 1 (near)
    const baseSize = 9 + depth * 13

    const baseSpecies = ["maple", "simple", "ginkgo", "oak", "cherryPetal"]
    const specificType =
      this.leafType === "mixed"
        ? baseSpecies[Math.floor(Math.random() * baseSpecies.length)]
        : this.leafType

    const sizeMultiplier =
      specificType === "cherryPetal"
        ? 1.35
        : specificType === "cherry" || specificType === "plum"
          ? 1.25
          : specificType === "ginkgo"
            ? 1.15
            : 1.0

    const paletteList = this.colorPalettes[specificType] || this.colorPalettes.maple
    const colorObj = paletteList[Math.floor(Math.random() * paletteList.length)]

    return {
      x: Math.random() * this.canvas.width,
      y: scattered
        ? Math.random() * this.canvas.height
        : Math.random() * -300 - 30,
      z: depth,
      size: baseSize * sizeMultiplier,
      species: specificType,
      color: colorObj,

      // Movement & Dynamics
      speedY: 0.45 + depth * 0.75 + Math.random() * 0.25,
      speedX: (Math.random() - 0.5) * 0.35,

      // 3D Rotations
      angleZ: Math.random() * Math.PI * 2, // 2D yaw
      rotationSpeedZ: (Math.random() - 0.5) * 0.02,

      angleX: Math.random() * Math.PI * 2, // 3D pitch flip
      rotationSpeedX: 0.012 + Math.random() * 0.028,

      angleY: Math.random() * Math.PI * 2, // 3D roll flutter
      rotationSpeedY: 0.008 + Math.random() * 0.02,

      // Aerodynamic oscillation
      swayOffset: Math.random() * Math.PI * 2,
      swaySpeed: 0.012 + Math.random() * 0.016,
      swayAmp: 1.1 + depth * 1.5,
      windSensitivity: 0.7 + depth * 0.6 + Math.random() * 0.3,

      // Opacity
      opacity: 0.45 + depth * 0.55,

      // Settling State Machine
      settlingState: "falling", // "falling" | "settling"
      settlingProgress: 0,
      startSettleX: 0,
      startSettleY: 0,
      targetSettleX: 0,
      targetSettleY: 0,
      targetAngleZ: 0,
      targetScaleX: 0.85 + Math.random() * 0.3,
      targetScaleY: 0.75 + Math.random() * 0.35,
    }
  }

  // ── Mouse Interaction ──────────────────────────────────────────────────────

  _onMouseMove(e) {
    const curX = e.clientX
    const curY = e.clientY

    if (this.mouse.prevX !== -9999) {
      this.mouse.vx = curX - this.mouse.prevX
      this.mouse.vy = curY - this.mouse.prevY
      this.mouse.speed = Math.min(Math.hypot(this.mouse.vx, this.mouse.vy), 45)
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

  // ── Wind Physics ───────────────────────────────────────────────────────────

  updateWind(deltaTime) {
    this.wind.time += 0.015 * deltaTime

    if (this.wind.age >= this.windDuration) {
      // Calm phase
      this.wind.target = 0
      this.wind.timer -= deltaTime
      if (this.wind.timer <= 0) {
        // Schedule new gust
        this.wind.timer = Math.floor(Math.random() * 180 + 80)
        this.wind.duration = Math.floor(Math.random() * 100 + 45)
        this.wind.age = 0
        const dir = Math.random() < 0.45 ? -1 : 1
        this.wind.target = dir * (Math.random() * 2.2 + 0.8)
      }
    } else {
      this.wind.age += deltaTime
    }

    // Smooth interpolation towards target wind strength
    this.wind.strength += (this.wind.target - this.wind.strength) * 0.04 * deltaTime
  }

  // ── Lifecycle Methods ──────────────────────────────────────────────────────

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.wind.strength = 0
    this.wind.target = 0
    this.wind.timer = Math.floor(Math.random() * 120 + 40)
    this.wind.duration = 0
    this.wind.age = 0
    this.initLeaves()
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
    this.settledCtx.clearRect(0, 0, this.settledCanvas.width, this.settledCanvas.height)
    this.settledCount = 0
    this.leaves = []
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
  }

  // ── Botanical Leaf Path Geometry ───────────────────────────────────────────

  drawMapleLeaf(ctx, size) {
    const s = size
    ctx.beginPath()

    // Stem base
    ctx.moveTo(0, s * 0.92)
    ctx.lineTo(s * 0.06, s * 0.58)

    // Base-right small wing
    ctx.bezierCurveTo(s * 0.22, s * 0.52, s * 0.48, s * 0.62, s * 0.44, s * 0.38)
    ctx.bezierCurveTo(s * 0.38, s * 0.22, s * 0.22, s * 0.18, s * 0.24, s * 0.02)

    // Right lobe
    ctx.bezierCurveTo(s * 0.38, -s * 0.08, s * 0.92, s * 0.02, s * 0.9, -s * 0.18)
    ctx.bezierCurveTo(s * 0.88, -s * 0.3, s * 0.58, -s * 0.26, s * 0.52, -s * 0.38)

    // Upper-right lobe
    ctx.bezierCurveTo(s * 0.58, -s * 0.56, s * 0.48, -s * 0.76, s * 0.3, -s * 0.7)
    ctx.bezierCurveTo(s * 0.2, -s * 0.66, s * 0.14, -s * 0.72, s * 0.12, -s * 0.86)

    // Top center lobe
    ctx.bezierCurveTo(s * 0.08, -s * 1.0, s * 0.02, -s * 1.06, 0, -s * 1.0)
    ctx.bezierCurveTo(-s * 0.02, -s * 1.06, -s * 0.08, -s * 1.0, -s * 0.12, -s * 0.86)

    // Upper-left lobe
    ctx.bezierCurveTo(-s * 0.14, -s * 0.72, -s * 0.2, -s * 0.66, -s * 0.3, -s * 0.7)
    ctx.bezierCurveTo(-s * 0.48, -s * 0.76, -s * 0.58, -s * 0.56, -s * 0.52, -s * 0.38)

    // Left lobe
    ctx.bezierCurveTo(-s * 0.58, -s * 0.26, -s * 0.88, -s * 0.3, -s * 0.9, -s * 0.18)
    ctx.bezierCurveTo(-s * 0.92, s * 0.02, -s * 0.38, -s * 0.08, -s * 0.24, s * 0.02)

    // Base-left wing
    ctx.bezierCurveTo(-s * 0.22, s * 0.18, -s * 0.38, s * 0.22, -s * 0.44, s * 0.38)
    ctx.bezierCurveTo(-s * 0.48, s * 0.62, -s * 0.22, s * 0.52, -s * 0.06, s * 0.58)

    ctx.lineTo(0, s * 0.92)
    ctx.closePath()
  }

  drawOakLeaf(ctx, size) {
    const s = size
    ctx.beginPath()
    ctx.moveTo(0, s * 0.88)

    // Right lobes
    ctx.bezierCurveTo(s * 0.26, s * 0.72, s * 0.38, s * 0.48, s * 0.32, s * 0.22)
    ctx.bezierCurveTo(s * 0.42, s * 0.16, s * 0.52, 0.0, s * 0.42, -s * 0.32)
    ctx.bezierCurveTo(s * 0.36, -s * 0.52, s * 0.16, -s * 0.68, 0, -s * 0.74)

    // Left lobes (mirror)
    ctx.bezierCurveTo(-s * 0.16, -s * 0.68, -s * 0.36, -s * 0.52, -s * 0.42, -s * 0.32)
    ctx.bezierCurveTo(-s * 0.52, 0.0, -s * 0.42, s * 0.16, -s * 0.32, s * 0.22)
    ctx.bezierCurveTo(-s * 0.38, s * 0.48, -s * 0.26, s * 0.72, 0, s * 0.88)

    ctx.closePath()
  }

  drawSimpleLeaf(ctx, size) {
    const s = size
    ctx.beginPath()
    ctx.moveTo(0, s * 0.85)
    ctx.bezierCurveTo(s * 0.5, s * 0.4, s * 0.55, -s * 0.3, 0, -s * 0.9)
    ctx.bezierCurveTo(-s * 0.55, -s * 0.3, -s * 0.5, s * 0.4, 0, s * 0.85)
    ctx.closePath()
  }

  drawGinkgoLeaf(ctx, size) {
    const s = size
    ctx.beginPath()
    ctx.moveTo(0, s * 0.9)

    // Stalk to fan blade
    ctx.lineTo(s * 0.04, s * 0.4)
    ctx.bezierCurveTo(s * 0.48, s * 0.35, s * 0.72, 0.0, s * 0.45, -s * 0.65)
    // Top undulating margin with central cleft
    ctx.bezierCurveTo(s * 0.25, -s * 0.85, s * 0.08, -s * 0.75, 0, -s * 0.68)
    ctx.bezierCurveTo(-s * 0.08, -s * 0.75, -s * 0.25, -s * 0.85, -s * 0.45, -s * 0.65)
    ctx.bezierCurveTo(-s * 0.72, 0.0, -s * 0.48, s * 0.35, -s * 0.04, s * 0.4)

    ctx.lineTo(0, s * 0.9)
    ctx.closePath()
  }

  drawCherryPetal(ctx, size) {
    const s = size
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

  drawCherryBlossom(ctx, size) {
    const s = size * 0.65
    const petalCount = 5

    for (let i = 0; i < petalCount; i++) {
      ctx.save()
      const angle = (i / petalCount) * Math.PI * 2
      ctx.rotate(angle)
      ctx.translate(0, -s * 0.55)
      this.drawCherryPetal(ctx, s * 0.85)
      ctx.restore()
    }
  }

  drawPlumBlossom(ctx, size) {
    const s = size * 0.65
    const petalCount = 5

    for (let i = 0; i < petalCount; i++) {
      ctx.save()
      const angle = (i / petalCount) * Math.PI * 2
      ctx.rotate(angle)
      ctx.translate(0, -s * 0.5)

      ctx.beginPath()
      ctx.ellipse(0, 0, s * 0.38, s * 0.52, 0, 0, Math.PI * 2)
      ctx.closePath()
      ctx.restore()
    }
  }

  drawLeafShape(ctx, size, species = this.leafType) {
    switch (species) {
      case "maple":
        this.drawMapleLeaf(ctx, size)
        break
      case "oak":
        this.drawOakLeaf(ctx, size)
        break
      case "simple":
        this.drawSimpleLeaf(ctx, size)
        break
      case "ginkgo":
        this.drawGinkgoLeaf(ctx, size)
        break
      case "cherry":
        this.drawCherryBlossom(ctx, size)
        break
      case "cherryPetal":
        this.drawCherryPetal(ctx, size)
        break
      case "plum":
        this.drawPlumBlossom(ctx, size)
        break
      default:
        this.drawMapleLeaf(ctx, size)
    }
  }

  // ── Leaf Venation Details ──────────────────────────────────────────────────

  drawVeins(ctx, size, opacity, veinColor, species = this.leafType) {
    const s = size
    const type = species || this.leafType

    ctx.strokeStyle = veinColor || `rgba(0, 0, 0, ${opacity * 0.24})`
    ctx.lineWidth = Math.max(0.55, s * 0.045)

    if (type === "maple") {
      // Main central vein
      ctx.beginPath()
      ctx.moveTo(0, s * 0.6)
      ctx.bezierCurveTo(0, s * 0.1, 0, -s * 0.5, 0, -s * 0.9)
      ctx.stroke()

      // Primary side veins
      for (const sign of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(0, s * 0.1)
        ctx.bezierCurveTo(sign * s * 0.3, 0, sign * s * 0.65, -s * 0.06, sign * s * 0.8, -s * 0.14)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(0, -s * 0.28)
        ctx.bezierCurveTo(sign * s * 0.18, -s * 0.38, sign * s * 0.36, -s * 0.56, sign * s * 0.42, -s * 0.64)
        ctx.stroke()
      }
    } else if (type === "oak") {
      ctx.beginPath()
      ctx.moveTo(0, s * 0.8)
      ctx.lineTo(0, -s * 0.7)
      ctx.stroke()

      for (let i = 0; i < 3; i++) {
        const y = s * 0.5 - i * s * 0.38
        for (const sign of [-1, 1]) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(sign * s * 0.26, y - s * 0.16)
          ctx.stroke()
        }
      }
    } else if (type === "simple") {
      ctx.beginPath()
      ctx.moveTo(0, s * 0.8)
      ctx.quadraticCurveTo(s * 0.04, 0, 0, -s * 0.85)
      ctx.stroke()

      for (let i = 0; i < 4; i++) {
        const y = s * 0.55 - i * s * 0.32
        for (const sign of [-1, 1]) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.quadraticCurveTo(sign * s * 0.16, y - s * 0.08, sign * s * 0.28, y - s * 0.18)
          ctx.stroke()
        }
      }
    } else if (type === "ginkgo") {
      for (let i = 0; i < 6; i++) {
        const angle = (-45 + i * 18) * (Math.PI / 180)
        ctx.beginPath()
        ctx.moveTo(0, s * 0.4)
        ctx.lineTo(Math.cos(angle) * s * 0.55, s * 0.4 + Math.sin(angle) * -s * 0.65)
        ctx.stroke()
      }
    } else if (type === "cherryPetal") {
      ctx.beginPath()
      ctx.moveTo(0, s * 0.6)
      ctx.lineTo(0, -s * 0.48)
      ctx.stroke()
    }
  }

  // ── Leaf Drawing Helpers (Gradients & 3D Shading) ──────────────────────────

  _renderSingleLeaf(ctx, leaf, flipScaleX, flipScaleY) {
    const s = leaf.size
    const c = leaf.color
    const isUnderside = flipScaleX < 0 !== flipScaleY < 0

    const baseColor = isUnderside ? c.underside : c.base
    const stemColor = c.stem
    const tipColor = c.tip

    // Linear gradient along leaf length
    const grad = ctx.createLinearGradient(0, s * 0.7, 0, -s * 0.8)
    grad.addColorStop(0, stemColor)
    grad.addColorStop(0.4, baseColor)
    grad.addColorStop(1, tipColor)

    const species = leaf.species || this.leafType

    // Render multi-petal flowers specially
    if (species === "cherry" || species === "plum") {
      const petalCount = 5
      for (let i = 0; i < petalCount; i++) {
        ctx.save()
        const angle = (i / petalCount) * Math.PI * 2
        ctx.rotate(angle)
        ctx.translate(0, -s * 0.52)

        if (species === "cherry") {
          this.drawCherryPetal(ctx, s * 0.8)
        } else {
          ctx.beginPath()
          ctx.ellipse(0, 0, s * 0.35, s * 0.48, 0, 0, Math.PI * 2)
          ctx.closePath()
        }

        ctx.fillStyle = grad
        ctx.fill()
        ctx.restore()
      }

      // Floral pistil & stamens center
      ctx.save()
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2)
      ctx.fillStyle = c.stem
      ctx.fill()

      for (let j = 0; j < 5; j++) {
        const a = (j / 5) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(Math.cos(a) * s * 0.14, Math.sin(a) * s * 0.14, Math.max(0.6, s * 0.035), 0, Math.PI * 2)
        ctx.fillStyle = "#FFD700"
        ctx.fill()
      }
      ctx.restore()
      return
    }

    // Standard Leaf Geometry fill
    this.drawLeafShape(ctx, s, species)
    ctx.fillStyle = grad
    ctx.fill()

    // Fine organic outline
    ctx.strokeStyle = `rgba(0, 0, 0, ${leaf.opacity * 0.15})`
    ctx.lineWidth = 0.5
    ctx.stroke()

    // Veins clipped to leaf shape
    ctx.save()
    this.drawLeafShape(ctx, s, species)
    ctx.clip()
    this.drawVeins(ctx, s, leaf.opacity, c.vein, species)
    ctx.restore()

    // Subtle specular shine on upper side
    if (!isUnderside && leaf.z > 0.45) {
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(-s * 0.08, -s * 0.1, s * 0.2, s * 0.42, -0.2, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${leaf.opacity * 0.16})`
      ctx.fill()
      ctx.restore()
    }
  }

  // ── Bake Settled Leaf Onto Off-Screen Buffer ────────────────────────────────

  _bakeSettledLeaf(leaf) {
    if (!this.settledCtx) return
    const ctx = this.settledCtx

    // Maintain max density by slowly fading old background if buffer gets huge
    this.settledCount++
    if (this.settledCount > this.maxSettled) {
      ctx.save()
      ctx.globalCompositeOperation = "destination-out"
      ctx.fillStyle = "rgba(0, 0, 0, 0.008)"
      ctx.fillRect(0, 0, this.settledCanvas.width, this.settledCanvas.height)
      ctx.restore()
    }

    ctx.save()
    ctx.translate(leaf.targetSettleX, leaf.targetSettleY)
    ctx.rotate(leaf.targetAngleZ)
    ctx.scale(leaf.targetScaleX, leaf.targetScaleY)

    // 1. Soft ground contact shadow
    ctx.save()
    const shadowGrad = ctx.createRadialGradient(2, leaf.size * 0.15, 0, 2, leaf.size * 0.15, leaf.size * 0.55)
    shadowGrad.addColorStop(0, "rgba(0, 0, 0, 0.18)")
    shadowGrad.addColorStop(0.6, "rgba(0, 0, 0, 0.08)")
    shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.beginPath()
    ctx.ellipse(2, leaf.size * 0.15, leaf.size * 0.55, leaf.size * 0.25, 0.1, 0, Math.PI * 2)
    ctx.fillStyle = shadowGrad
    ctx.fill()
    ctx.restore()

    // 2. Baked Leaf
    ctx.globalAlpha = Math.min(1.0, leaf.opacity * 0.88)
    this._renderSingleLeaf(ctx, leaf, leaf.targetScaleX, leaf.targetScaleY)

    ctx.restore()
  }

  // ── Main Animation Loop ────────────────────────────────────────────────────

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

    // Update global wind
    this.updateWind(deltaTime)

    // 1. Draw all accumulated settled leaves from off-screen buffer (Super Fast!)
    this.ctx.drawImage(this.settledCanvas, 0, 0)

    // Mouse speed decay
    if (this.mouse.active) {
      this.mouse.speed *= 0.92
    }

    // 2. Update and Draw active falling & landing leaves
    const len = this.leaves.length
    for (let i = 0; i < len; i++) {
      const leaf = this.leaves[i]

      if (leaf.settlingState === "settling") {
        // Smooth aerodynamic ground glide into resting position
        leaf.settlingProgress += 0.022 * deltaTime

        if (leaf.settlingProgress >= 1) {
          // Stamp/Bake into settled layer
          this._bakeSettledLeaf(leaf)

          // Respawn fresh falling leaf at top
          const fresh = this.createLeaf(false)
          Object.assign(leaf, fresh)
        } else {
          // Smooth easing into ground rest
          const t = Math.min(1, leaf.settlingProgress)
          const ease = t * t * (3 - 2 * t)

          leaf.y = leaf.startSettleY + (leaf.targetSettleY - leaf.startSettleY) * ease
          leaf.x = leaf.startSettleX + (leaf.targetSettleX - leaf.startSettleX) * ease + Math.sin(leaf.swayOffset) * leaf.swayAmp * (1 - ease)

          leaf.swayOffset += leaf.swaySpeed * 0.4 * deltaTime
          leaf.angleZ += (leaf.targetAngleZ - leaf.angleZ) * 0.08 * deltaTime

          const flipScaleX = Math.cos(leaf.angleX) * (1 - ease) + leaf.targetScaleX * ease
          const flipScaleY = (Math.sin(leaf.angleY) * 0.6 + 0.4) * (1 - ease) + leaf.targetScaleY * ease

          this.ctx.save()
          this.ctx.translate(leaf.x, leaf.y)
          this.ctx.rotate(leaf.angleZ)
          this.ctx.scale(flipScaleX, flipScaleY)
          this.ctx.globalAlpha = leaf.opacity
          this._renderSingleLeaf(this.ctx, leaf, flipScaleX, flipScaleY)
          this.ctx.restore()
        }
      } else {
        // Standard Falling Aerodynamics
        leaf.angleZ += leaf.rotationSpeedZ * deltaTime
        leaf.angleX += leaf.rotationSpeedX * deltaTime
        leaf.angleY += leaf.rotationSpeedY * deltaTime
        leaf.swayOffset += leaf.swaySpeed * deltaTime

        const flipScaleX = Math.cos(leaf.angleX)
        const flipScaleY = Math.sin(leaf.angleY) * 0.65 + 0.35

        // Aerodynamic drag: broadside leaves glide, edge-on leaves drop faster
        const broadside = Math.abs(flipScaleX * flipScaleY)
        const fallMult = 0.6 + 0.5 * (1 - broadside * 0.5)

        leaf.y += leaf.speedY * fallMult * deltaTime
        const sway = Math.sin(leaf.swayOffset) * leaf.swayAmp
        const windPush = this.wind.strength * leaf.windSensitivity
        leaf.x += (sway + windPush + leaf.speedX) * deltaTime

        // Mouse wake turbulence
        if (this.mouse.active) {
          const dx = leaf.x - this.mouse.x
          const dy = leaf.y - this.mouse.y
          const distSq = dx * dx + dy * dy
          const radius = this.mouse.radius
          if (distSq < radius * radius && distSq > 1) {
            const dist = Math.sqrt(distSq)
            const force = (1 - dist / radius) * (this.mouse.speed * 0.12 + 1.1)
            leaf.x += (dx / dist) * force * deltaTime
            leaf.y += (dy / dist) * force * 0.5 * deltaTime
            leaf.angleZ += (dx > 0 ? 0.05 : -0.05) * force * deltaTime
            leaf.angleX += 0.06 * force * deltaTime
          }
        }

        // Check if entering ground settlement zone
        const groundZone = H - 110
        if (leaf.y > groundZone) {
          leaf.settlingState = "settling"
          leaf.settlingProgress = 0
          leaf.startSettleX = leaf.x
          leaf.startSettleY = leaf.y
          leaf.targetSettleX = leaf.x + (Math.random() * 30 - 15)
          leaf.targetSettleY = H - 15 - Math.random() * 45
          leaf.targetAngleZ = (Math.random() * Math.PI * 2)
        }

        // Render Falling Leaf
        this.ctx.save()
        this.ctx.translate(leaf.x, leaf.y)
        this.ctx.rotate(leaf.angleZ)
        this.ctx.scale(flipScaleX, flipScaleY)
        this.ctx.globalAlpha = leaf.opacity
        this._renderSingleLeaf(this.ctx, leaf, flipScaleX, flipScaleY)
        this.ctx.restore()
      }

      // Horizontal wrapping
      if (leaf.x > W + 80) leaf.x = -60
      else if (leaf.x < -80) leaf.x = W + 60
    }
  }
}
