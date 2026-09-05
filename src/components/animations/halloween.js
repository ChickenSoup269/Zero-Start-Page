/**
 * Halloween Effect HD — Spooky Night Canvas Animation Engine
 *
 * Features:
 *  - 8 Handcrafted Ultra-HD Vector Entities:
 *     1. Jack-o'-Lantern: Multi-ribbed 3D shaded pumpkin with flickering carved glowing face & ember trail.
 *     2. Ethereal Spectral Ghost: Multi-layered translucent ectoplasm body with fluid waving tail & wisps.
 *     3. Flapping Vampire Bat: Dynamic flapping wing physics with banking tilt and glowing ruby eyes.
 *     4. Mystic Witch Hat: Conical wizard hat with buckled velvet band and magical stardust trail.
 *     5. Creepy Spider: Suspended on a shimmering silk line with articulated 8-leg crawling motion.
 *     6. Grim Skull Relic: Carved bone skull with eerie glowing fire inside deep eye sockets.
 *     7. Festive Candy Corn: Classic tri-color sweet with 3D specular shine and tumbling rotation.
 *     8. Haunted Black Cat: Sleek silhouette with glowing slit-pupil eyes and mysterious aura.
 *  - Atmospheric Volumetric Fog & Drifting Eerie Mist.
 *  - Ambient Rising Embers & Will-o'-the-Wisp particles.
 *  - Occasional Cinematic Lightning Storm flashes.
 *  - Interactive Mouse Repulsion & Startle Physics.
 *  - 6 Thematic Modes (All-Stars, Pumpkins, Ghosts, Bats, Gothic Night, Sweet Treats).
 *  - Full 60Hz - 240Hz High Refresh Rate Delta Normalization & Retina High-DPI rendering.
 */

export class HalloweenEffect {
  constructor(canvasId, options = {}) {
    this.canvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d")

    this.active = false
    this.items = []
    this.embers = []
    this.mistPuffs = []
    this.lastTime = 0
    this._animId = null

    this.options = {
      mode: options.mode || "all", // "all", "pumpkins", "ghosts", "bats", "dark_night", "sweet"
      glowColor: options.glowColor || "#ff6a00",
      density: Number(options.density) || 35,
      speed: Number(options.speed) || 1.0,
      mist: options.mist !== false,
      lightning: options.lightning !== false,
      mouseEnabled: options.mouseEnabled !== false,
      ...options,
    }

    this.mouse = { x: -1000, y: -1000, vx: 0, vy: 0, lastX: 0, lastY: 0 }
    this.lightningState = {
      timer: 8000 + Math.random() * 12000,
      alpha: 0,
      flashes: 0,
      flashDur: 0,
    }

    this._handleMouseMove = this._handleMouseMove.bind(this)
    this._handleClick = this._handleClick.bind(this)
    this._handleResize = this._handleResize.bind(this)
    this._handleVisibility = this._handleVisibility.bind(this)

    this._initMist()
    this.resize()
  }

  resize() {
    if (!this.canvas) return
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(this.width * this.dpr)
    this.canvas.height = Math.round(this.height * this.dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    if (this.ctx) {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    }
  }

  _initMist() {
    this.mistPuffs = []
    const puffCount = 7
    for (let i = 0; i < puffCount; i++) {
      this.mistPuffs.push({
        x: Math.random() * (this.width || window.innerWidth),
        y: (this.height || window.innerHeight) * (0.6 + Math.random() * 0.45),
        radius: 180 + Math.random() * 220,
        speedX: (0.15 + Math.random() * 0.25) * (Math.random() < 0.5 ? 1 : -1),
        baseAlpha: 0.04 + Math.random() * 0.05,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.0008 + Math.random() * 0.001,
      })
    }
  }

  // --- ENTITY FACTORY & THEME MODES ---

  _getAvailableTypes() {
    const mode = this.options.mode || "all"
    switch (mode) {
      case "pumpkins":
        return [
          { id: "pumpkin", weight: 3.5, sizeBase: 44 },
          { id: "ghost", weight: 0.8, sizeBase: 42 },
          { id: "bat", weight: 0.6, sizeBase: 36 },
        ]
      case "ghosts":
        return [
          { id: "ghost", weight: 3.5, sizeBase: 44 },
          { id: "bat", weight: 1.0, sizeBase: 36 },
          { id: "cat", weight: 0.6, sizeBase: 36 },
        ]
      case "bats":
        return [
          { id: "bat", weight: 4.0, sizeBase: 38 },
          { id: "ghost", weight: 0.7, sizeBase: 40 },
          { id: "skull", weight: 0.5, sizeBase: 36 },
        ]
      case "dark_night":
        return [
          { id: "skull", weight: 1.8, sizeBase: 38 },
          { id: "spider", weight: 1.8, sizeBase: 36 },
          { id: "bat", weight: 2.0, sizeBase: 36 },
          { id: "cat", weight: 1.2, sizeBase: 36 },
          { id: "ghost", weight: 1.0, sizeBase: 42 },
        ]
      case "sweet":
        return [
          { id: "candy_corn", weight: 2.5, sizeBase: 34 },
          { id: "witch_hat", weight: 2.0, sizeBase: 42 },
          { id: "pumpkin", weight: 1.8, sizeBase: 42 },
          { id: "ghost", weight: 1.2, sizeBase: 40 },
        ]
      case "all":
      default:
        return [
          { id: "pumpkin", weight: 1.4, sizeBase: 44 },
          { id: "ghost", weight: 1.3, sizeBase: 42 },
          { id: "bat", weight: 1.3, sizeBase: 36 },
          { id: "witch_hat", weight: 1.0, sizeBase: 42 },
          { id: "spider", weight: 0.9, sizeBase: 36 },
          { id: "skull", weight: 0.9, sizeBase: 38 },
          { id: "candy_corn", weight: 1.1, sizeBase: 34 },
          { id: "cat", weight: 0.8, sizeBase: 36 },
        ]
    }
  }

  _pickRandomType() {
    const types = this._getAvailableTypes()
    const totalWeight = types.reduce((sum, t) => sum + t.weight, 0)
    let r = Math.random() * totalWeight
    for (const t of types) {
      if (r < t.weight) return t
      r -= t.weight
    }
    return types[0]
  }

  createItem(spawnAtTop = true) {
    const type = this._pickRandomType()
    const z = 0.55 + Math.random() * 0.95
    const isBat = type.id === "bat"
    const isGhost = type.id === "ghost"
    const isSpider = type.id === "spider"

    return {
      type: type,
      x: Math.random() * this.width,
      y: spawnAtTop ? -70 - Math.random() * 80 : Math.random() * this.height,
      z: z,
      baseSpeed:
        (isBat
          ? 1.4 + Math.random() * 1.2
          : isSpider
            ? 0.7 + Math.random() * 0.7
            : isGhost
              ? 0.6 + Math.random() * 0.8
              : 0.85 + Math.random() * 1.1) * z,
      vx: (Math.random() - 0.5) * 0.4,
      vy: 0,
      swing:
        (isGhost
          ? 25 + Math.random() * 40
          : isBat
            ? 35 + Math.random() * 55
            : 15 + Math.random() * 30) * z,
      swingSpeed: (0.0012 + Math.random() * 0.002) * (isBat ? 1.4 : 1.0),
      phase: Math.random() * Math.PI * 2,
      rotation: (Math.random() - 0.5) * (isBat ? 0.015 : 0.035),
      currentRotation: (Math.random() - 0.5) * 0.5,
      flickerOffset: Math.random() * Math.PI * 2,
      wingSpeed: 0.014 + Math.random() * 0.008,
      opacity: (0.75 + Math.random() * 0.25) * Math.min(1.0, z * 1.1),
      spiderStartY: isSpider ? -80 : 0,
    }
  }

  createEmber(x, y) {
    return {
      x: x || Math.random() * this.width,
      y: y || this.height + 10 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -(0.5 + Math.random() * 1.2),
      size: 1.5 + Math.random() * 2.5,
      life: 0,
      maxLife: 120 + Math.random() * 180,
      opacity: 0.8 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
    }
  }

  // --- DRAWING ROUTINES (ULTRA-HD VECTOR ARTWORK) ---

  drawPumpkin(ctx, s, flicker) {
    const r = s / 2
    const glowCol = this.options.glowColor || "#ff6a00"

    // Outer warm ambient aura
    const aura = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.5)
    aura.addColorStop(0, this._hexToRgba(glowCol, 0.25 + flicker * 0.15))
    aura.addColorStop(1, "rgba(255,100,0,0)")
    ctx.fillStyle = aura
    ctx.beginPath()
    ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2)
    ctx.fill()

    // Curved Stem
    ctx.save()
    ctx.fillStyle = "#3a2a18"
    ctx.beginPath()
    ctx.moveTo(-r * 0.12, -r * 0.75)
    ctx.quadraticCurveTo(-r * 0.25, -r * 1.15, -r * 0.05, -r * 1.25)
    ctx.quadraticCurveTo(r * 0.12, -r * 1.15, r * 0.08, -r * 0.75)
    ctx.closePath()
    ctx.fill()

    // Green vine leaf/tendril
    ctx.strokeStyle = "#4d8028"
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(r * 0.02, -r * 0.85)
    ctx.quadraticCurveTo(r * 0.35, -r * 1.05, r * 0.25, -r * 0.75)
    ctx.stroke()
    ctx.restore()

    // Ribbed pumpkin body (layered overlapping curved segments for 3D depth)
    const ribs = [
      { rx: r * 0.98, ry: r * 0.82, dx: 0, col: "#e65100" },
      { rx: r * 0.82, ry: r * 0.84, dx: -r * 0.3, col: "#f57c00" },
      { rx: r * 0.82, ry: r * 0.84, dx: r * 0.3, col: "#f57c00" },
      { rx: r * 0.6, ry: r * 0.86, dx: -r * 0.16, col: "#ff9800" },
      { rx: r * 0.6, ry: r * 0.86, dx: r * 0.16, col: "#ff9800" },
      { rx: r * 0.38, ry: r * 0.88, dx: 0, col: "#ffa726" },
    ]

    for (const rib of ribs) {
      const grad = ctx.createRadialGradient(
        rib.dx,
        -r * 0.15,
        rib.rx * 0.2,
        rib.dx,
        0,
        rib.rx,
      )
      grad.addColorStop(0, rib.col)
      grad.addColorStop(0.85, "#e65100")
      grad.addColorStop(1, "#bf360c")

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.ellipse(rib.dx, 0, rib.rx, rib.ry, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // Carved Glowing Face (Flickering Jack-o'-Lantern)
    const innerFlame = ctx.createRadialGradient(
      0,
      r * 0.05,
      r * 0.05,
      0,
      r * 0.1,
      r * 0.7,
    )
    innerFlame.addColorStop(0, "#ffffff")
    innerFlame.addColorStop(0.3, "#fff176")
    innerFlame.addColorStop(0.65, glowCol)
    innerFlame.addColorStop(1, "#b71c1c")

    ctx.fillStyle = innerFlame
    ctx.shadowColor = glowCol
    ctx.shadowBlur = 8 + flicker * 6

    // Eyes (Triangles with inner carve depth)
    ctx.beginPath()
    // Left eye
    ctx.moveTo(-r * 0.42, -r * 0.25)
    ctx.lineTo(-r * 0.12, -r * 0.25)
    ctx.lineTo(-r * 0.27, -r * 0.52)
    ctx.closePath()
    // Right eye
    ctx.moveTo(r * 0.42, -r * 0.25)
    ctx.lineTo(r * 0.12, -r * 0.25)
    ctx.lineTo(r * 0.27, -r * 0.52)
    ctx.closePath()
    // Nose
    ctx.moveTo(0, -r * 0.22)
    ctx.lineTo(-r * 0.1, -r * 0.05)
    ctx.lineTo(r * 0.1, -r * 0.05)
    ctx.closePath()
    ctx.fill()

    // Toothy Wicked Grin
    ctx.beginPath()
    ctx.moveTo(-r * 0.55, r * 0.05)
    ctx.quadraticCurveTo(-r * 0.35, r * 0.18, -r * 0.28, r * 0.08)
    ctx.lineTo(-r * 0.2, r * 0.22)
    ctx.lineTo(-r * 0.1, r * 0.1)
    ctx.lineTo(0, r * 0.25)
    ctx.lineTo(r * 0.1, r * 0.1)
    ctx.lineTo(r * 0.2, r * 0.22)
    ctx.lineTo(r * 0.28, r * 0.08)
    ctx.quadraticCurveTo(r * 0.35, r * 0.18, r * 0.55, r * 0.05)
    // Bottom jaw jagged curve
    ctx.quadraticCurveTo(r * 0.4, r * 0.42, r * 0.2, r * 0.48)
    ctx.lineTo(r * 0.15, r * 0.38)
    ctx.lineTo(0, r * 0.5)
    ctx.lineTo(-r * 0.15, r * 0.38)
    ctx.lineTo(-r * 0.2, r * 0.48)
    ctx.quadraticCurveTo(-r * 0.4, r * 0.42, -r * 0.55, r * 0.05)
    ctx.closePath()
    ctx.fill()

    ctx.shadowBlur = 0
  }

  drawGhost(ctx, s, time, phase) {
    const r = s / 2
    const glowCol = this.options.glowColor || "#00e5ff"
    const tailWave = Math.sin(time * 0.004 + phase) * (r * 0.25)

    // Spectral ectoplasm outer aura
    const aura = ctx.createRadialGradient(0, -r * 0.2, r * 0.3, 0, 0, r * 1.4)
    aura.addColorStop(0, this._hexToRgba(glowCol, 0.28))
    aura.addColorStop(0.7, "rgba(255,255,255,0.08)")
    aura.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = aura
    ctx.beginPath()
    ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2)
    ctx.fill()

    // Ghost body gradient
    const bodyGrad = ctx.createLinearGradient(0, -r * 1.1, 0, r * 1.1)
    bodyGrad.addColorStop(0, "rgba(255, 255, 255, 0.96)")
    bodyGrad.addColorStop(0.65, "rgba(235, 248, 255, 0.88)")
    bodyGrad.addColorStop(1, this._hexToRgba(glowCol, 0.35))

    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    // Ghost dome head
    ctx.moveTo(-r * 0.85, 0)
    ctx.bezierCurveTo(-r * 0.85, -r * 1.1, r * 0.85, -r * 1.1, r * 0.85, 0)
    // Flowing undulating skirt / tail
    ctx.bezierCurveTo(
      r * 0.9,
      r * 0.5,
      r * 0.7 + tailWave * 0.5,
      r * 0.8,
      r * 0.6 + tailWave,
      r * 1.15,
    )
    ctx.quadraticCurveTo(
      r * 0.4 + tailWave * 0.7,
      r * 0.85,
      r * 0.2 + tailWave * 0.4,
      r * 1.12,
    )
    ctx.quadraticCurveTo(
      0 + tailWave * 0.2,
      r * 0.85,
      -r * 0.2 + tailWave * 0.1,
      r * 1.12,
    )
    ctx.quadraticCurveTo(
      -r * 0.4 - tailWave * 0.2,
      r * 0.85,
      -r * 0.6 - tailWave * 0.5,
      r * 1.15,
    )
    ctx.bezierCurveTo(
      -r * 0.7 - tailWave * 0.3,
      r * 0.8,
      -r * 0.9,
      r * 0.5,
      -r * 0.85,
      0,
    )
    ctx.closePath()
    ctx.fill()

    // Cute ghostly arms
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
    ctx.beginPath()
    ctx.ellipse(
      -r * 0.75,
      -r * 0.05,
      r * 0.28,
      r * 0.14,
      -0.4 + tailWave * 0.02,
      0,
      Math.PI * 2,
    )
    ctx.ellipse(
      r * 0.75,
      -r * 0.05,
      r * 0.28,
      r * 0.14,
      0.4 - tailWave * 0.02,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    // Dark Hollow Eyes & Mouth with eerie inner depth
    ctx.fillStyle = "#1a162b"
    ctx.beginPath()
    ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.14, r * 0.22, -0.08, 0, Math.PI * 2)
    ctx.ellipse(r * 0.3, -r * 0.35, r * 0.14, r * 0.22, 0.08, 0, Math.PI * 2)
    ctx.ellipse(0, -r * 0.02, r * 0.12, r * 0.18, 0, 0, Math.PI * 2)
    ctx.fill()

    // Eye catchlights (cute spectral gleam)
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
    ctx.beginPath()
    ctx.arc(-r * 0.26, -r * 0.42, r * 0.05, 0, Math.PI * 2)
    ctx.arc(r * 0.34, -r * 0.42, r * 0.05, 0, Math.PI * 2)
    ctx.fill()
  }

  drawBat(ctx, s, time, phase, wingSpeed) {
    const w = s
    const wingCycle = Math.sin(time * wingSpeed + phase) // -1.0 to 1.0 (flapping motion)
    const flapY = wingCycle * (s * 0.32)

    // Body gradient
    const bodyGrad = ctx.createLinearGradient(0, -s * 0.3, 0, s * 0.3)
    bodyGrad.addColorStop(0, "#2d1c3a")
    bodyGrad.addColorStop(1, "#12081c")

    ctx.fillStyle = bodyGrad

    // Left Wing (Dynamic segmented flap)
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.05)
    ctx.quadraticCurveTo(
      -w * 0.45,
      -s * 0.55 + flapY,
      -w * 0.95,
      -s * 0.25 + flapY * 1.2,
    )
    // Wing scallop folds
    ctx.quadraticCurveTo(
      -w * 0.72,
      s * 0.1 + flapY * 0.6,
      -w * 0.58,
      -s * 0.05 + flapY * 0.5,
    )
    ctx.quadraticCurveTo(
      -w * 0.42,
      s * 0.18 + flapY * 0.3,
      -w * 0.3,
      s * 0.02 + flapY * 0.2,
    )
    ctx.quadraticCurveTo(-w * 0.18, s * 0.25, 0, s * 0.15)
    ctx.closePath()
    ctx.fill()

    // Right Wing
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.05)
    ctx.quadraticCurveTo(
      w * 0.45,
      -s * 0.55 + flapY,
      w * 0.95,
      -s * 0.25 + flapY * 1.2,
    )
    ctx.quadraticCurveTo(
      w * 0.72,
      s * 0.1 + flapY * 0.6,
      w * 0.58,
      -s * 0.05 + flapY * 0.5,
    )
    ctx.quadraticCurveTo(
      w * 0.42,
      s * 0.18 + flapY * 0.3,
      w * 0.3,
      s * 0.02 + flapY * 0.2,
    )
    ctx.quadraticCurveTo(w * 0.18, s * 0.25, 0, s * 0.15)
    ctx.closePath()
    ctx.fill()

    // Bat Fur Body
    ctx.fillStyle = "#1b1026"
    ctx.beginPath()
    ctx.ellipse(0, s * 0.02, w * 0.16, s * 0.24, 0, 0, Math.PI * 2)
    ctx.fill()

    // Bat Head & Pointed Ears
    ctx.beginPath()
    ctx.arc(0, -s * 0.16, w * 0.14, 0, Math.PI * 2)
    // Left ear
    ctx.moveTo(-w * 0.12, -s * 0.18)
    ctx.lineTo(-w * 0.16, -s * 0.42)
    ctx.lineTo(-w * 0.02, -s * 0.26)
    // Right ear
    ctx.moveTo(w * 0.12, -s * 0.18)
    ctx.lineTo(w * 0.16, -s * 0.42)
    ctx.lineTo(w * 0.02, -s * 0.26)
    ctx.closePath()
    ctx.fill()

    // Glowing Vampire Eyes
    ctx.fillStyle = "#ff1744"
    ctx.shadowColor = "#ff1744"
    ctx.shadowBlur = 4
    ctx.beginPath()
    ctx.arc(-w * 0.06, -s * 0.18, w * 0.03, 0, Math.PI * 2)
    ctx.arc(w * 0.06, -s * 0.18, w * 0.03, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }

  drawWitchHat(ctx, s) {
    const r = s / 2

    // Magical sparkles around hat
    const glowCol = this.options.glowColor || "#ba68c8"
    ctx.fillStyle = this._hexToRgba(glowCol, 0.4)
    ctx.beginPath()
    ctx.arc(-r * 0.4, -r * 0.9, 2.5, 0, Math.PI * 2)
    ctx.arc(r * 0.35, -r * 0.7, 2.0, 0, Math.PI * 2)
    ctx.arc(r * 0.1, -r * 1.15, 3.0, 0, Math.PI * 2)
    ctx.fill()

    // Wide Hat Brim (Ellipse with shading)
    const brimGrad = ctx.createRadialGradient(0, r * 0.5, r * 0.2, 0, r * 0.5, r)
    brimGrad.addColorStop(0, "#2c1b4d")
    brimGrad.addColorStop(0.8, "#190d2e")
    brimGrad.addColorStop(1, "#0d0517")

    ctx.fillStyle = brimGrad
    ctx.beginPath()
    ctx.ellipse(0, r * 0.45, r * 0.98, r * 0.32, 0, 0, Math.PI * 2)
    ctx.fill()

    // Hat Cone (Curved wizard crown)
    const coneGrad = ctx.createLinearGradient(-r * 0.5, 0, r * 0.5, 0)
    coneGrad.addColorStop(0, "#2c1b4d")
    coneGrad.addColorStop(0.5, "#4a2d80")
    coneGrad.addColorStop(1, "#190d2e")

    ctx.fillStyle = coneGrad
    ctx.beginPath()
    ctx.moveTo(-r * 0.55, r * 0.38)
    ctx.quadraticCurveTo(-r * 0.3, -r * 0.35, -r * 0.05, -r * 0.85)
    ctx.quadraticCurveTo(r * 0.25, -r * 1.15, r * 0.45, -r * 1.05) // Crooked wizard tip
    ctx.quadraticCurveTo(r * 0.15, -r * 0.75, r * 0.25, -r * 0.25)
    ctx.quadraticCurveTo(r * 0.4, r * 0.15, r * 0.55, r * 0.38)
    ctx.closePath()
    ctx.fill()

    // Hat Band Ribbon
    ctx.fillStyle = "#ff7043"
    ctx.beginPath()
    ctx.moveTo(-r * 0.55, r * 0.38)
    ctx.quadraticCurveTo(0, r * 0.48, r * 0.55, r * 0.38)
    ctx.lineTo(r * 0.5, r * 0.2)
    ctx.quadraticCurveTo(0, r * 0.3, -r * 0.5, r * 0.2)
    ctx.closePath()
    ctx.fill()

    // Golden Buckle
    ctx.strokeStyle = "#ffd54f"
    ctx.lineWidth = 2.5
    ctx.strokeRect(-r * 0.15, r * 0.18, r * 0.3, r * 0.22)
    ctx.fillStyle = "#ffd54f"
    ctx.fillRect(-r * 0.04, r * 0.18, r * 0.08, r * 0.22)
  }

  drawSpider(ctx, s, time, item) {
    const r = s / 2

    // Subtle short wiggling silk thread from spinneret
    ctx.strokeStyle = "rgba(230, 240, 255, 0.35)"
    ctx.lineWidth = 1.0
    ctx.beginPath()
    const silkWiggle = Math.sin(time * 0.006 + item.phase) * 3.0
    ctx.moveTo(0, r * 0.45)
    ctx.quadraticCurveTo(silkWiggle, r * 0.75, silkWiggle * 0.5, r * 0.95)
    ctx.stroke()

    // 8 Articulated Legs (4 left, 4 right with dynamic twitching)
    ctx.strokeStyle = "#1b1424"
    ctx.lineWidth = 2.0
    ctx.lineCap = "round"

    const legTwitch = Math.sin(time * 0.008 + item.phase) * 0.15
    const legAngles = [-0.65, -0.25, 0.25, 0.65]

    for (let i = 0; i < 4; i++) {
      const baseAng = legAngles[i]
      // Left leg
      ctx.beginPath()
      ctx.moveTo(-r * 0.15, r * (i * 0.1 - 0.15))
      const jointX = -r * 0.55 + Math.cos(baseAng + legTwitch) * (r * 0.3)
      const jointY = r * (i * 0.15 - 0.25) + Math.sin(baseAng) * (r * 0.3)
      ctx.lineTo(jointX, jointY)
      ctx.lineTo(jointX - r * 0.35, jointY + r * 0.45)
      ctx.stroke()

      // Right leg
      ctx.beginPath()
      ctx.moveTo(r * 0.15, r * (i * 0.1 - 0.15))
      const jointRX = r * 0.55 - Math.cos(baseAng - legTwitch) * (r * 0.3)
      const jointRY = r * (i * 0.15 - 0.25) + Math.sin(baseAng) * (r * 0.3)
      ctx.lineTo(jointRX, jointRY)
      ctx.lineTo(jointRX + r * 0.35, jointRY + r * 0.45)
      ctx.stroke()
    }

    // Cephalothorax (Head)
    ctx.fillStyle = "#261933"
    ctx.beginPath()
    ctx.ellipse(0, -r * 0.18, r * 0.25, r * 0.2, 0, 0, Math.PI * 2)
    ctx.fill()

    // Abdomen (Bulbous rear with sinister markings)
    const abGrad = ctx.createRadialGradient(
      0,
      r * 0.25,
      r * 0.1,
      0,
      r * 0.25,
      r * 0.45,
    )
    abGrad.addColorStop(0, "#3e2456")
    abGrad.addColorStop(0.7, "#1a0d26")
    abGrad.addColorStop(1, "#0a0410")

    ctx.fillStyle = abGrad
    ctx.beginPath()
    ctx.ellipse(0, r * 0.28, r * 0.38, r * 0.45, 0, 0, Math.PI * 2)
    ctx.fill()

    // Red Hourglass Marking
    ctx.fillStyle = "#ff1744"
    ctx.beginPath()
    ctx.moveTo(-r * 0.1, r * 0.15)
    ctx.lineTo(r * 0.1, r * 0.15)
    ctx.lineTo(-r * 0.1, r * 0.42)
    ctx.lineTo(r * 0.1, r * 0.42)
    ctx.closePath()
    ctx.fill()

    // Glowing Eyes Cluster
    ctx.fillStyle = "#ff5252"
    ctx.beginPath()
    ctx.arc(-r * 0.08, -r * 0.25, 1.6, 0, Math.PI * 2)
    ctx.arc(r * 0.08, -r * 0.25, 1.6, 0, Math.PI * 2)
    ctx.arc(-r * 0.04, -r * 0.3, 1.2, 0, Math.PI * 2)
    ctx.arc(r * 0.04, -r * 0.3, 1.2, 0, Math.PI * 2)
    ctx.fill()
  }

  drawSkull(ctx, s, flicker) {
    const r = s / 2
    const glowCol = this.options.glowColor || "#00e676"

    // Cranium bone gradient
    const boneGrad = ctx.createRadialGradient(
      0,
      -r * 0.2,
      r * 0.2,
      0,
      0,
      r * 0.9,
    )
    boneGrad.addColorStop(0, "#f5f5f5")
    boneGrad.addColorStop(0.7, "#e0e0e0")
    boneGrad.addColorStop(1, "#9e9e9e")

    ctx.fillStyle = boneGrad
    ctx.beginPath()
    // Cranium
    ctx.arc(0, -r * 0.2, r * 0.65, Math.PI * 0.85, Math.PI * 0.15)
    // Cheekbones & Maxilla
    ctx.lineTo(r * 0.42, r * 0.2)
    ctx.lineTo(r * 0.28, r * 0.55)
    ctx.lineTo(-r * 0.28, r * 0.55)
    ctx.lineTo(-r * 0.42, r * 0.2)
    ctx.closePath()
    ctx.fill()

    // Deep Hollow Eye Sockets
    ctx.fillStyle = "#121212"
    ctx.beginPath()
    ctx.ellipse(-r * 0.26, -r * 0.15, r * 0.18, r * 0.22, -0.15, 0, Math.PI * 2)
    ctx.ellipse(r * 0.26, -r * 0.15, r * 0.18, r * 0.22, 0.15, 0, Math.PI * 2)
    ctx.fill()

    // Nasal Cavity (Inverted Heart)
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.05)
    ctx.lineTo(-r * 0.08, r * 0.15)
    ctx.lineTo(r * 0.08, r * 0.15)
    ctx.closePath()
    ctx.fill()

    // Glowing Spectral Flames in Eye Sockets
    ctx.fillStyle = glowCol
    ctx.shadowColor = glowCol
    ctx.shadowBlur = 6 + flicker * 4
    ctx.beginPath()
    ctx.arc(-r * 0.26, -r * 0.15, r * 0.07, 0, Math.PI * 2)
    ctx.arc(r * 0.26, -r * 0.15, r * 0.07, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Teeth row
    ctx.strokeStyle = "#424242"
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(-r * 0.2, r * 0.38)
    ctx.lineTo(r * 0.2, r * 0.38)
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(i * (r * 0.08), r * 0.32)
      ctx.lineTo(i * (r * 0.08), r * 0.48)
    }
    ctx.stroke()
  }

  drawCandyCorn(ctx, s) {
    const r = s / 2

    // 3-Segment Classic Candy Corn Triangle
    ctx.save()
    // Yellow Base
    ctx.fillStyle = "#ffd600"
    ctx.beginPath()
    ctx.moveTo(-r * 0.65, r * 0.7)
    ctx.quadraticCurveTo(0, r * 0.85, r * 0.65, r * 0.7)
    ctx.lineTo(r * 0.48, r * 0.25)
    ctx.quadraticCurveTo(0, r * 0.35, -r * 0.48, r * 0.25)
    ctx.closePath()
    ctx.fill()

    // Orange Center
    ctx.fillStyle = "#ff6d00"
    ctx.beginPath()
    ctx.moveTo(-r * 0.48, r * 0.25)
    ctx.quadraticCurveTo(0, r * 0.35, r * 0.48, r * 0.25)
    ctx.lineTo(r * 0.28, -r * 0.25)
    ctx.quadraticCurveTo(0, -r * 0.18, -r * 0.28, -r * 0.25)
    ctx.closePath()
    ctx.fill()

    // White Rounded Tip
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.moveTo(-r * 0.28, -r * 0.25)
    ctx.quadraticCurveTo(0, -r * 0.18, r * 0.28, -r * 0.25)
    ctx.quadraticCurveTo(r * 0.08, -r * 0.8, 0, -r * 0.82)
    ctx.quadraticCurveTo(-r * 0.08, -r * 0.8, -r * 0.28, -r * 0.25)
    ctx.closePath()
    ctx.fill()

    // Specular Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
    ctx.beginPath()
    ctx.ellipse(-r * 0.15, 0, r * 0.08, r * 0.4, -0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  drawCat(ctx, s) {
    const r = s / 2

    // Black Cat Head Gradient
    const catGrad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 0.85)
    catGrad.addColorStop(0, "#21162e")
    catGrad.addColorStop(1, "#0a0512")

    ctx.fillStyle = catGrad
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2)
    // Pointed Ears
    ctx.moveTo(-r * 0.6, -r * 0.3)
    ctx.lineTo(-r * 0.72, -r * 0.92)
    ctx.lineTo(-r * 0.18, -r * 0.6)
    ctx.moveTo(r * 0.6, -r * 0.3)
    ctx.lineTo(r * 0.72, -r * 0.92)
    ctx.lineTo(r * 0.18, -r * 0.6)
    ctx.closePath()
    ctx.fill()

    // Inner Ears (Pinkish-Purple)
    ctx.fillStyle = "rgba(224, 64, 251, 0.35)"
    ctx.beginPath()
    ctx.moveTo(-r * 0.52, -r * 0.35)
    ctx.lineTo(-r * 0.62, -r * 0.82)
    ctx.lineTo(-r * 0.25, -r * 0.55)
    ctx.moveTo(r * 0.52, -r * 0.35)
    ctx.lineTo(r * 0.62, -r * 0.82)
    ctx.lineTo(r * 0.25, -r * 0.55)
    ctx.closePath()
    ctx.fill()

    // Piercing Cat Eyes (Glowing Green/Gold with Slit Pupils)
    ctx.fillStyle = "#eeff41"
    ctx.shadowColor = "#eeff41"
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.ellipse(-r * 0.28, -r * 0.08, r * 0.18, r * 0.12, -0.15, 0, Math.PI * 2)
    ctx.ellipse(r * 0.28, -r * 0.08, r * 0.18, r * 0.12, 0.15, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Vertical Slit Pupils
    ctx.fillStyle = "#12081c"
    ctx.beginPath()
    ctx.ellipse(-r * 0.28, -r * 0.08, r * 0.04, r * 0.11, 0, 0, Math.PI * 2)
    ctx.ellipse(r * 0.28, -r * 0.08, r * 0.04, r * 0.11, 0, 0, Math.PI * 2)
    ctx.fill()

    // Whiskers
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)"
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(-r * 0.2, r * 0.2)
    ctx.lineTo(-r * 0.75, r * 0.15)
    ctx.moveTo(-r * 0.2, r * 0.28)
    ctx.lineTo(-r * 0.72, r * 0.35)
    ctx.moveTo(r * 0.2, r * 0.2)
    ctx.lineTo(r * 0.75, r * 0.15)
    ctx.moveTo(r * 0.2, r * 0.28)
    ctx.lineTo(r * 0.72, r * 0.35)
    ctx.stroke()
  }

  // --- DRAW DISPATCHER ---

  _drawItem(ctx, item, time) {
    const s = item.type.sizeBase * item.z
    const flicker = Math.sin(time * 0.008 + item.flickerOffset) * 0.5 + 0.5

    switch (item.type.id) {
      case "pumpkin":
        this.drawPumpkin(ctx, s, flicker)
        break
      case "ghost":
        this.drawGhost(ctx, s, time, item.phase)
        break
      case "bat":
        this.drawBat(ctx, s, time, item.phase, item.wingSpeed)
        break
      case "witch_hat":
        this.drawWitchHat(ctx, s)
        break
      case "spider":
        this.drawSpider(ctx, s, time, item)
        break
      case "skull":
        this.drawSkull(ctx, s, flicker)
        break
      case "candy_corn":
        this.drawCandyCorn(ctx, s)
        break
      case "cat":
        this.drawCat(ctx, s)
        break
      default:
        this.drawPumpkin(ctx, s, flicker)
    }
  }

  // --- ATMOSPHERE RENDERING ---

  _drawAtmosphericMist(ctx, dt) {
    if (!this.options.mist) return

    for (const puff of this.mistPuffs) {
      puff.x += puff.speedX * (dt / 16.67)
      puff.phase += puff.phaseSpeed * dt

      if (puff.x < -puff.radius) puff.x = this.width + puff.radius
      if (puff.x > this.width + puff.radius) puff.x = -puff.radius

      const alphaPulse = puff.baseAlpha + Math.sin(puff.phase) * 0.02
      const grad = ctx.createRadialGradient(
        puff.x,
        puff.y,
        0,
        puff.x,
        puff.y,
        puff.radius,
      )
      grad.addColorStop(0, `rgba(74, 32, 94, ${alphaPulse})`)
      grad.addColorStop(0.55, `rgba(42, 18, 60, ${alphaPulse * 0.6})`)
      grad.addColorStop(1, "rgba(0, 0, 0, 0)")

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(puff.x, puff.y, puff.radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  _drawEmbers(ctx, dt) {
    const glowCol = this.options.glowColor || "#ff6a00"

    if (this.embers.length < 22 && Math.random() < 0.12) {
      this.embers.push(this.createEmber())
    }

    this.embers = this.embers.filter((ember) => {
      const timeFactor = dt / 16.67
      ember.life += timeFactor
      ember.y += ember.vy * timeFactor
      ember.x +=
        (ember.vx + Math.sin(ember.life * 0.05 + ember.phase) * 0.4) *
        timeFactor

      const progress = ember.life / ember.maxLife
      const alpha = (1 - progress) * ember.opacity

      ctx.fillStyle = this._hexToRgba(glowCol, alpha)
      ctx.shadowColor = glowCol
      ctx.shadowBlur = 4
      ctx.beginPath()
      ctx.arc(
        ember.x,
        ember.y,
        ember.size * (1 - progress * 0.4),
        0,
        Math.PI * 2,
      )
      ctx.fill()
      ctx.shadowBlur = 0

      return ember.life < ember.maxLife && ember.y > -20
    })
  }

  _drawLightning(ctx, dt) {
    if (!this.options.lightning) return

    const l = this.lightningState
    l.timer -= dt

    if (l.timer <= 0 && l.alpha <= 0) {
      l.timer = 12000 + Math.random() * 20000
      l.alpha = 0.45 + Math.random() * 0.35
      l.flashes = Math.random() < 0.4 ? 2 : 1
    }

    if (l.alpha > 0) {
      ctx.fillStyle = `rgba(180, 200, 255, ${l.alpha * 0.35})`
      ctx.fillRect(0, 0, this.width, this.height)
      l.alpha -= 0.035 * (dt / 16.67)
      if (l.alpha < 0) {
        if (l.flashes > 1) {
          l.flashes--
          l.alpha = 0.55
        } else {
          l.alpha = 0
        }
      }
    }
  }

  // --- MOUSE & EVENT HANDLERS ---

  _handleMouseMove(e) {
    if (!this.options.mouseEnabled) return
    const x = e.clientX
    const y = e.clientY
    this.mouse.vx = x - this.mouse.lastX
    this.mouse.vy = y - this.mouse.lastY
    this.mouse.lastX = x
    this.mouse.lastY = y
    this.mouse.x = x
    this.mouse.y = y
  }

  _handleClick(e) {
    if (!this.options.mouseEnabled) return
    // Click creates a burst of floating spooky embers
    for (let i = 0; i < 12; i++) {
      const ember = this.createEmber(e.clientX, e.clientY)
      ember.vx = (Math.random() - 0.5) * 4.0
      ember.vy = -(1.5 + Math.random() * 3.5)
      this.embers.push(ember)
    }
    // Rare thunder flash on click
    if (Math.random() < 0.35 && this.options.lightning) {
      this.lightningState.alpha = 0.5
      this.lightningState.flashes = 1
    }
  }

  _handleResize() {
    this.resize()
  }

  _handleVisibility() {
    if (document.hidden) {
      if (this._animId) {
        cancelAnimationFrame(this._animId)
        this._animId = null
      }
    } else if (this.active && !this._animId) {
      this.lastTime = performance.now()
      this._renderLoop(this.lastTime)
    }
  }

  // --- PUBLIC CONTROLLERS ---

  setOptions(opts = {}) {
    this.options = { ...this.options, ...opts }
    if (opts.density !== undefined) this.setDensity(opts.density)
    if (opts.mode !== undefined) this.setMode(opts.mode)
    if (opts.glowColor !== undefined) this.setGlowColor(opts.glowColor)
    if (opts.speed !== undefined) this.setSpeed(opts.speed)
    if (opts.mist !== undefined) this.setMist(opts.mist)
    if (opts.lightning !== undefined) this.setLightning(opts.lightning)
    if (opts.mouseEnabled !== undefined) this.setMouseEnabled(opts.mouseEnabled)
  }

  setMode(mode) {
    this.options.mode = mode
    // Re-roll current items to align with new mode
    this.items.forEach((item) => {
      item.type = this._pickRandomType()
    })
  }

  setGlowColor(color) {
    this.options.glowColor = color
  }

  setDensity(density) {
    this.options.density = Math.max(5, Math.min(100, Number(density) || 35))
    while (this.items.length > this.options.density) {
      this.items.pop()
    }
  }

  setSpeed(speed) {
    this.options.speed = Math.max(0.1, Math.min(5.0, Number(speed) || 1.0))
  }

  setMist(enabled) {
    this.options.mist = Boolean(enabled)
  }

  setLightning(enabled) {
    this.options.lightning = Boolean(enabled)
  }

  setMouseEnabled(enabled) {
    this.options.mouseEnabled = Boolean(enabled)
  }

  _hexToRgba(hex, alpha = 1.0) {
    let clean = (hex || "#ff6a00").replace("#", "")
    if (clean.length === 3) {
      clean = clean
        .split("")
        .map((c) => c + c)
        .join("")
    }
    const num = parseInt(clean, 16) || 0
    const r = (num >> 16) & 255
    const g = (num >> 8) & 255
    const b = num & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // --- MAIN ANIMATION LOOP ---

  _renderLoop(currentTime) {
    if (!this.active) return
    this._animId = requestAnimationFrame((t) => this._renderLoop(t))

    if (!this.lastTime) this.lastTime = currentTime
    const dt = Math.min(currentTime - this.lastTime, 64)
    this.lastTime = currentTime

    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)

    // 1. Atmospheric Mist & Fog Layer
    this._drawAtmosphericMist(ctx, dt)

    // 2. Spawn and update Spooky Items
    const targetCount = this.options.density || 35
    const speedMultiplier = this.options.speed || 1.0

    if (this.items.length < targetCount && Math.random() < 0.12) {
      this.items.push(this.createItem(true))
    }

    this.items = this.items.filter((item) => {
      const timeFactor = dt / 16.67

      // Vertical Fall Physics
      item.vy = item.baseSpeed * speedMultiplier
      item.y += item.vy * timeFactor
      item.phase += item.swingSpeed * dt
      item.currentRotation += item.rotation * timeFactor

      let currentX = item.x + Math.sin(item.phase) * item.swing

      // Interactive Mouse Repulsion
      if (this.options.mouseEnabled && this.mouse.x > 0) {
        const dx = currentX - this.mouse.x
        const dy = item.y - this.mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 160 && dist > 0) {
          const force = ((160 - dist) / 160) * 2.2 * timeFactor
          item.x += (dx / dist) * force * 1.5
          item.y += (dy / dist) * force
          if (item.type.id === "bat") {
            item.wingSpeed = 0.028 // Bats flap furiously when disturbed!
          }
        }
      }

      ctx.save()
      ctx.globalAlpha = item.opacity
      ctx.translate(currentX, item.y)

      const wobble = Math.sin(item.phase * 0.7) * 0.18
      ctx.rotate(item.currentRotation + wobble)

      // Draw HD Vector Entity
      this._drawItem(ctx, item, currentTime)

      ctx.restore()

      return item.y < this.height + 90
    })

    // 3. Floating Glowing Embers Layer
    this._drawEmbers(ctx, dt)

    // 4. Atmospheric Lightning Layer
    this._drawLightning(ctx, dt)
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this.lastTime = 0

    this.resize()
    window.addEventListener("resize", this._handleResize)
    window.addEventListener("mousemove", this._handleMouseMove, { passive: true })
    window.addEventListener("click", this._handleClick, { passive: true })
    document.addEventListener("visibilitychange", this._handleVisibility)

    // Pre-populate items across screen so it starts filled
    this.items = []
    const initialCount = Math.floor((this.options.density || 35) * 0.75)
    for (let i = 0; i < initialCount; i++) {
      this.items.push(this.createItem(false))
    }

    this._animId = requestAnimationFrame((t) => this._renderLoop(t))
  }

  stop() {
    this.active = false
    this.canvas.style.display = "none"
    this.items = []
    this.embers = []
    this.lastTime = 0

    window.removeEventListener("resize", this._handleResize)
    window.removeEventListener("mousemove", this._handleMouseMove)
    window.removeEventListener("click", this._handleClick)
    document.removeEventListener("visibilitychange", this._handleVisibility)

    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  destroy() {
    this.stop()
  }
}
