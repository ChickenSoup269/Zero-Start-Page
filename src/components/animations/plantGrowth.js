/**
 * PlantGrowthEffect — Hollywood AAA Ultra HD Living Flora & Botanical Growth
 *
 * Masterpiece Nature Simulation:
 *  - 4 Preset Botanical Themes + Custom Palette:
 *      * Enchanted Forest (Rừng Thần Thoại — Ngọc lục bảo, búp non & hoa rực rỡ)
 *      * Sakura Cherry Blossom (Hoa Anh Đào — Thân gỗ anh đào, hoa hồng phấn & cánh hoa rơi 3D)
 *      * Cyberpunk Neon Flora (Thực Vật Dạ Quang — Cyan, Magenta, vệt điện quang)
 *      * Autumn Golden Canopy (Rừng Thu Phong — Vàng kim, hổ phách, lá phong đỏ)
 *      * Custom Color (Màu sắc tự chọn)
 *  - Interactive Sprout & Bloom: Click or tap anywhere to sprout a new vibrant flowering stalk branching toward cursor!
 *  - 3D Falling Petals & Leaves drifting with natural air drag, pitch/roll tumbling and wind physics.
 *  - Organic spline-curved growth with tapered stems, logarithmic spiral tendrils.
 *  - 3D fluttering leaves with central spine veins, morning dewdrops, and glowing bioluminescent spores.
 *  - Delta-time normalized for 60Hz - 240Hz displays with High-DPI Retina sharpness.
 */

import { hexToRgb } from "../../utils/colors.js"

const BOTANICAL_MODES = {
  enchanted: {
    stemBase: { r: 60, g: 45, b: 25 },
    stemMid: { r: 50, g: 170, b: 65 },
    stemTip: { r: 140, g: 235, b: 90 },
    leafLit: { r: 90, g: 215, b: 80 },
    leafShade: { r: 35, g: 110, b: 45 },
    flowerHues: [335, 345, 15, 45], // Rose, Pink, Coral, Gold
    sporeColor: { r: 180, g: 255, b: 140 },
    petalColor: "hsla(340, 85%, 85%, 0.9)",
  },
  sakura: {
    stemBase: { r: 55, g: 35, b: 35 },
    stemMid: { r: 95, g: 55, b: 50 },
    stemTip: { r: 155, g: 100, b: 110 },
    leafLit: { r: 230, g: 170, b: 190 },
    leafShade: { r: 160, g: 90, b: 110 },
    flowerHues: [330, 340, 350, 355], // Sakura Pinks
    sporeColor: { r: 255, g: 210, b: 230 },
    petalColor: "hsla(345, 90%, 88%, 0.95)",
  },
  cyberpunk: {
    stemBase: { r: 20, g: 15, b: 50 },
    stemMid: { r: 0, g: 190, b: 240 },
    stemTip: { r: 255, g: 0, b: 180 },
    leafLit: { r: 0, g: 245, b: 255 },
    leafShade: { r: 140, g: 0, b: 210 },
    flowerHues: [290, 315, 180, 195], // Neon Purple & Cyan
    sporeColor: { r: 0, g: 245, b: 255 },
    petalColor: "hsla(310, 100%, 75%, 0.95)",
  },
  autumn: {
    stemBase: { r: 65, g: 38, b: 20 },
    stemMid: { r: 165, g: 75, b: 25 },
    stemTip: { r: 240, g: 155, b: 30 },
    leafLit: { r: 235, g: 95, b: 30 },
    leafShade: { r: 160, g: 45, b: 20 },
    flowerHues: [35, 48, 15, 5], // Gold, Amber, Orange, Crimson
    sporeColor: { r: 255, g: 210, b: 110 },
    petalColor: "hsla(25, 95%, 70%, 0.9)",
  },
}

// ── 3D Drifting Falling Petal Particle ──────────────────────────────────────
class FallingPetal3D {
  constructor(width, height, mode = "enchanted") {
    this.reset(width, height, true, mode)
  }

  reset(width, height, initial = false, mode = "enchanted") {
    this.x = Math.random() * (width + 100) - 50
    this.y = initial ? Math.random() * height : -25
    this.z = Math.random() * 0.8 + 0.2 // 3D Depth [0.2 - 1.0]

    this.vx = (Math.random() * 0.9 + 0.4) * this.z
    this.vy = (Math.random() * 0.75 + 0.6) * this.z
    this.size = (Math.random() * 3.5 + 2.5) * this.z

    // 3D Euler Rotations (Pitch, Roll, Yaw)
    this.pitch = Math.random() * Math.PI * 2
    this.roll = Math.random() * Math.PI * 2
    this.yaw = Math.random() * Math.PI * 2
    this.pitchSpeed = Math.random() * 0.035 + 0.015
    this.rollSpeed = Math.random() * 0.04 + 0.02
    this.yawSpeed = Math.random() * 0.025 + 0.01

    this.wobblePhase = Math.random() * Math.PI * 2
    this.wobbleSpeed = Math.random() * 2.0 + 1.2

    this.mode = mode
    this.alpha = Math.random() * 0.35 + 0.65
  }

  update(width, height, dt, mouse, mode) {
    this.pitch += this.pitchSpeed * dt
    this.roll += this.rollSpeed * dt
    this.yaw += this.yawSpeed * dt
    this.wobblePhase += this.wobbleSpeed * 0.04 * dt

    let pushX = 0
    let pushY = 0
    if (mouse.active) {
      const dx = this.x - mouse.x
      const dy = this.y - mouse.y
      const distSq = dx * dx + dy * dy
      if (distSq < mouse.radiusSq && distSq > 1) {
        const dist = Math.sqrt(distSq)
        const force = (1 - dist / mouse.radius) * 2.2 * this.z
        pushX = (dx / dist) * force
        pushY = (dy / dist) * force
      }
    }

    this.x += (this.vx + Math.sin(this.wobblePhase) * 0.6 + pushX) * dt
    this.y += (this.vy + Math.cos(this.wobblePhase) * 0.25 + pushY) * dt

    if (this.y > height + 30 || this.x > width + 60) {
      this.reset(width, height, false, mode)
    }
  }

  draw(ctx, themeConfig) {
    ctx.save()
    ctx.translate(this.x, this.y)

    const scaleX = Math.cos(this.yaw)
    const scaleY = Math.cos(this.pitch)
    ctx.rotate(this.roll)
    ctx.scale(scaleX, scaleY)

    ctx.fillStyle = themeConfig.petalColor || "hsla(340, 85%, 85%, 0.9)"
    ctx.beginPath()
    ctx.moveTo(0, -this.size)
    ctx.quadraticCurveTo(this.size * 1.2, 0, 0, this.size * 1.5)
    ctx.quadraticCurveTo(-this.size * 1.2, 0, 0, -this.size)
    ctx.fill()

    ctx.restore()
  }
}

// ── Bioluminescent Floating Spore / Pollen Particle ─────────────────────────
class BioluminescentSpore {
  constructor(width, height) {
    this.reset(width, height, true)
  }

  reset(width, height, initial = false) {
    this.x = Math.random() * width
    this.y = initial ? Math.random() * height : height + Math.random() * 20
    this.z = Math.random() * 0.85 + 0.15

    this.vx = (Math.random() - 0.5) * 0.3 * this.z
    this.vy = -(Math.random() * 0.45 + 0.25) * this.z

    this.size = (Math.random() * 2.0 + 1.0) * this.z
    this.baseAlpha = (Math.random() * 0.45 + 0.45) * this.z
    this.twinkleSpeed = Math.random() * 2.5 + 1.2
    this.twinklePhase = Math.random() * Math.PI * 2

    this.swayAmp = Math.random() * 1.5 + 0.5
    this.swayFreq = Math.random() * 1.8 + 0.8
    this.swayPhase = Math.random() * Math.PI * 2
  }

  update(width, height, dt, mouse) {
    this.swayPhase += this.swayFreq * 0.04 * dt
    this.twinklePhase += this.twinkleSpeed * 0.04 * dt

    let pushX = 0
    let pushY = 0
    if (mouse.active) {
      const dx = this.x - mouse.x
      const dy = this.y - mouse.y
      const distSq = dx * dx + dy * dy
      if (distSq < mouse.radiusSq && distSq > 1) {
        const dist = Math.sqrt(distSq)
        const force = (1 - dist / mouse.radius) * 1.8 * this.z
        pushX = (dx / dist) * force
        pushY = (dy / dist) * force
      }
    }

    this.x += (this.vx + Math.sin(this.swayPhase) * this.swayAmp + pushX) * dt
    this.y += (this.vy + pushY) * dt

    if (this.y < -20 || this.x < -30 || this.x > width + 30) {
      this.reset(width, height)
    }
  }

  draw(ctx, sporeRgb) {
    const alpha = Math.max(
      0.05,
      this.baseAlpha * (0.6 + 0.4 * Math.sin(this.twinklePhase))
    )

    ctx.fillStyle = `rgba(${sporeRgb.r}, ${sporeRgb.g}, ${sporeRgb.b}, ${(alpha * 0.4).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size * 2.6, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = `rgba(255, 255, 245, ${alpha.toFixed(3)})`
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size * 0.8, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ── Organic Grass Blade with Spring Physics ──────────────────────────────────
class GrassBlade {
  constructor(x, y, layer = 1) {
    this.x = x
    this.y = y
    this.layer = layer
    this.currentHeight = 0
    this.targetHeight =
      layer === 0
        ? Math.random() * 28 + 18
        : layer === 1
          ? Math.random() * 48 + 32
          : Math.random() * 64 + 42

    this.width = layer === 0 ? 1.2 : layer === 1 ? 2.2 : 3.4
    this.baseAngle = (Math.random() - 0.5) * 0.35
    this.swayOffset = 0
    this.swayVelocity = 0
    this.phase = Math.random() * Math.PI * 2
    this.windFreq = Math.random() * 0.03 + 0.015
    this.dewdrop = Math.random() < 0.25 && layer >= 1
  }

  update(dt, time, mouse) {
    if (this.currentHeight < this.targetHeight) {
      this.currentHeight += 0.8 * dt
    }

    const ambientWind = Math.sin(time * this.windFreq + this.phase) * 0.15

    let mouseForce = 0
    if (mouse.active) {
      const dx = this.x - mouse.x
      const dy = this.y - this.currentHeight * 0.5 - mouse.y
      const distSq = dx * dx + dy * dy
      if (distSq < mouse.radiusSq && distSq > 1) {
        const dist = Math.sqrt(distSq)
        const dir = dx >= 0 ? 1 : -1
        mouseForce = dir * (1 - dist / mouse.radius) * 0.65
      }
    }

    const targetOffset = ambientWind + mouseForce
    const springForce = (targetOffset - this.swayOffset) * 0.14
    this.swayVelocity = (this.swayVelocity + springForce) * 0.86
    this.swayOffset += this.swayVelocity * dt
  }

  draw(ctx, theme) {
    if (this.currentHeight <= 1) return

    const totalAngle = -Math.PI / 2 + this.baseAngle + this.swayOffset
    const endX = this.x + Math.cos(totalAngle) * this.currentHeight
    const endY = this.y + Math.sin(totalAngle) * this.currentHeight
    const cpX = this.x + Math.cos(totalAngle) * (this.currentHeight * 0.45)
    const cpY = this.y - this.currentHeight * 0.5

    ctx.save()
    ctx.lineWidth = this.width
    ctx.lineCap = "round"

    const base = theme.stemBase
    const mid = theme.stemMid
    const tip = theme.stemTip

    const grad = ctx.createLinearGradient(this.x, this.y, endX, endY)
    if (this.layer === 0) {
      grad.addColorStop(0, `rgba(${base.r}, ${base.g}, ${base.b}, 0.5)`)
      grad.addColorStop(1, `rgba(${mid.r}, ${mid.g}, ${mid.b}, 0.65)`)
    } else {
      grad.addColorStop(0, `rgba(${base.r}, ${base.g}, ${base.b}, 0.85)`)
      grad.addColorStop(0.65, `rgba(${mid.r}, ${mid.g}, ${mid.b}, 0.9)`)
      grad.addColorStop(1, `rgba(${tip.r}, ${tip.g}, ${tip.b}, 0.95)`)
    }

    ctx.strokeStyle = grad
    ctx.beginPath()
    ctx.moveTo(this.x, this.y)
    ctx.quadraticCurveTo(cpX, cpY, endX, endY)
    ctx.stroke()

    if (this.dewdrop && this.currentHeight >= this.targetHeight * 0.9) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)"
      ctx.beginPath()
      ctx.arc(endX, endY, 1.2, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
}

// ── Main Plant Branch / Vine Node (Fibonacci & Spline Physics) ───────────────
class BotanicalBranch {
  constructor(x, y, angle, size, gen, isVine = false, isTopDown = false, layer = 1, themeConfig = null) {
    this.x = x
    this.y = y
    this.angle = angle
    this.size = size
    this.gen = gen
    this.isVine = isVine
    this.isTopDown = isTopDown
    this.layer = layer
    this.theme = themeConfig

    const baseLen = isTopDown ? 85 : isVine ? 75 : 120
    const maxLen = baseLen + Math.random() * 80 - gen * 18
    this.length = 0
    this.targetLength = Math.max(35, maxLen)

    this.children = []
    this.leaves = []
    this.tendrils = []
    this.flower = null
    this.growing = true

    this.phase = Math.random() * Math.PI * 2
    this.wiggleSpeed = isVine || isTopDown ? 0.025 : 0.014
    this.wiggleAmp = isVine || isTopDown ? 0.22 : 0.09
    this.spiralDir = Math.random() > 0.5 ? 1 : -1

    this.swayOffset = 0
    this.swayVelocity = 0
  }

  update(dt, time, mouse, effect) {
    if (this.growing) {
      const growthSpeed = (this.isVine || this.isTopDown ? 1.5 : 1.2) * dt
      this.length += growthSpeed

      if (this.length >= this.targetLength) {
        this.growing = false

        const maxGen = this.isTopDown ? 4 : this.isVine ? 4 : 3
        if (this.gen < maxGen && Math.random() < 0.65) {
          const childCount = Math.random() < 0.35 && !this.isVine ? 2 : 1
          for (let i = 0; i < childCount; i++) {
            const spread = this.isVine || this.isTopDown ? 0.9 : 0.55
            const childAngle =
              this.angle + (i === 0 ? (Math.random() - 0.5) * spread : (Math.random() < 0.5 ? 0.6 : -0.6))

            const endX = this.x + Math.cos(this.angle) * this.length
            const endY = this.y + Math.sin(this.angle) * this.length

            this.children.push(
              new BotanicalBranch(
                endX,
                endY,
                childAngle,
                this.size * 0.72,
                this.gen + 1,
                this.isVine,
                this.isTopDown,
                this.layer,
                this.theme
              )
            )
          }
        }

        // Bloom a multi-petal flower at terminal tips
        if (this.gen >= 2 && Math.random() < 0.5 && !this.flower) {
          const hues = this.theme?.flowerHues || [335, 345, 15, 45]
          const chosenHue = hues[Math.floor(Math.random() * hues.length)]

          this.flower = {
            size: 0,
            targetSize: Math.random() * 13 + 8,
            hue: chosenHue,
            petalCount: Math.random() < 0.4 ? 6 : 5,
            rotation: Math.random() * Math.PI * 2,
            stamenTwinkle: Math.random() * Math.PI * 2,
          }
        }
      }

      // Sprout Leaves & Spiral Tendrils along stem
      const leafProb = this.isVine || this.isTopDown ? 0.14 : 0.09
      if (Math.random() < leafProb * dt) {
        const endX = this.x + Math.cos(this.angle) * this.length
        const endY = this.y + Math.sin(this.angle) * this.length

        if ((this.isVine || this.isTopDown) && Math.random() < 0.35) {
          this.tendrils.push({
            x: endX,
            y: endY,
            angle: this.angle + (Math.random() - 0.5) * 1.8,
            size: 0,
            targetSize: Math.random() * 24 + 14,
            dir: Math.random() > 0.5 ? 1 : -1,
          })
        } else {
          this.leaves.push({
            p: this.length / this.targetLength,
            side: Math.random() > 0.5 ? 1 : -1,
            size: 0,
            targetSize:
              this.isVine || this.isTopDown ? Math.random() * 6 + 4 : Math.random() * 10 + 6,
            angleOffset: (Math.random() - 0.5) * 0.4,
            pitchPhase: Math.random() * Math.PI * 2,
            dewdrop: Math.random() < 0.3,
          })
        }
      }
    }

    for (let i = 0; i < this.leaves.length; i++) {
      const l = this.leaves[i]
      if (l.size < l.targetSize) l.size += 0.35 * dt
      l.pitchPhase += 0.04 * dt
    }

    for (let i = 0; i < this.tendrils.length; i++) {
      const t = this.tendrils[i]
      if (t.size < t.targetSize) t.size += 0.75 * dt
    }

    if (this.flower && this.flower.size < this.flower.targetSize) {
      this.flower.size += 0.25 * dt
      this.flower.stamenTwinkle += 0.06 * dt
    }

    const ambientWind = Math.sin(time * this.wiggleSpeed + this.phase) * this.wiggleAmp
    const spiral =
      this.isVine || this.isTopDown ? Math.sin(time * 2 + this.phase) * 0.08 * this.spiralDir : 0

    let mouseForce = 0
    if (mouse.active) {
      const midX = this.x + Math.cos(this.angle) * (this.length * 0.5)
      const midY = this.y + Math.sin(this.angle) * (this.length * 0.5)
      const dx = midX - mouse.x
      const dy = midY - mouse.y
      const distSq = dx * dx + dy * dy
      if (distSq < mouse.radiusSq && distSq > 1) {
        const dist = Math.sqrt(distSq)
        const cross = (Math.cos(this.angle) * dy - Math.sin(this.angle) * dx) / dist
        mouseForce = cross * (1 - dist / mouse.radius) * 0.4
      }
    }

    const targetOffset = ambientWind + spiral + mouseForce
    const springForce = (targetOffset - this.swayOffset) * 0.12
    this.swayVelocity = (this.swayVelocity + springForce) * 0.88
    this.swayOffset += this.swayVelocity * dt

    const currentAngle = this.angle + this.swayOffset
    const endX = this.x + Math.cos(currentAngle) * this.length
    const endY = this.y + Math.sin(currentAngle) * this.length

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i]
      child.x = endX
      child.y = endY
      child.update(dt, time, mouse, effect)
    }
  }

  draw(ctx, theme, time) {
    if (this.length <= 1) return

    const currentAngle = this.angle + this.swayOffset
    const cosA = Math.cos(currentAngle)
    const sinA = Math.sin(currentAngle)
    const endX = this.x + cosA * this.length
    const endY = this.y + sinA * this.length

    ctx.save()
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    // 1. Tapered Stem with Organic Bark & Light Gradient
    ctx.beginPath()
    ctx.lineWidth = Math.max(0.8, this.size)

    const base = theme.stemBase
    const mid = theme.stemMid
    const tip = theme.stemTip

    if (this.isVine || this.isTopDown) {
      ctx.strokeStyle = `rgba(${mid.r}, ${mid.g}, ${mid.b}, 0.75)`
    } else {
      const grad = ctx.createLinearGradient(this.x, this.y, endX, endY)
      grad.addColorStop(0, `rgba(${base.r}, ${base.g}, ${base.b}, 0.85)`)
      grad.addColorStop(0.5, `rgba(${mid.r}, ${mid.g}, ${mid.b}, 0.88)`)
      grad.addColorStop(1, `rgba(${tip.r}, ${tip.g}, ${tip.b}, 0.95)`)
      ctx.strokeStyle = grad
    }

    ctx.moveTo(this.x, this.y)
    ctx.lineTo(endX, endY)
    ctx.stroke()

    // 2. Logarithmic Spiral Tendrils
    for (let i = 0; i < this.tendrils.length; i++) {
      const t = this.tendrils[i]
      this._drawTendril(ctx, t.x, t.y, t.angle + this.swayOffset, t.size, t.dir, mid)
    }

    // 3. 3D Fluttering Botanical Leaves with Spine Veins
    for (let i = 0; i < this.leaves.length; i++) {
      const l = this.leaves[i]
      const lx = this.x + cosA * (this.length * l.p)
      const ly = this.y + sinA * (this.length * l.p)
      const leafAngle = currentAngle + (Math.PI / 2) * l.side + l.angleOffset
      this._drawLeaf3D(ctx, lx, ly, leafAngle, l.size, l.pitchPhase, theme, l.dewdrop)
    }

    // 4. Layered 3D Blossoms with Glowing Golden Pollen Pistil
    if (this.flower && this.flower.size > 0.5) {
      this._drawBlossom(ctx, endX, endY, this.flower)
    }

    for (let i = 0; i < this.children.length; i++) {
      this.children[i].draw(ctx, theme, time)
    }

    ctx.restore()
  }

  _drawTendril(ctx, x, y, angle, size, dir, rgb) {
    if (size <= 0.5) return
    ctx.save()
    ctx.beginPath()
    ctx.lineWidth = 0.8
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.65)`
    ctx.moveTo(x, y)

    let curX = x
    let curY = y
    const segments = Math.min(24, Math.floor(size))
    for (let i = 0; i < segments; i++) {
      const a = angle + Math.sin(i * 0.42) * 0.75 * dir + (i * 0.08) * dir
      curX += Math.cos(a) * 2.2
      curY += Math.sin(a) * 2.2
      ctx.lineTo(curX, curY)
    }
    ctx.stroke()
    ctx.restore()
  }

  _drawLeaf3D(ctx, x, y, angle, size, pitchPhase, theme, hasDewdrop) {
    if (size <= 0.5) return
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)

    const pitch = Math.sin(pitchPhase)
    const scaleY = 0.65 + 0.35 * Math.abs(pitch)
    const isLit = pitch >= 0

    ctx.scale(1, scaleY)

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(size * 1.3, -size * 1.6, size * 3.2, 0)
    ctx.quadraticCurveTo(size * 1.3, size * 1.6, 0, 0)

    const leafLit = theme.leafLit
    const leafShade = theme.leafShade

    const leafGrad = ctx.createLinearGradient(0, 0, size * 3.2, 0)
    if (isLit) {
      leafGrad.addColorStop(0, `rgba(${leafShade.r}, ${leafShade.g}, ${leafShade.b}, 0.9)`)
      leafGrad.addColorStop(0.7, `rgba(${leafLit.r}, ${leafLit.g}, ${leafLit.b}, 0.95)`)
      leafGrad.addColorStop(1, `rgba(${Math.min(255, leafLit.r + 40)}, ${Math.min(255, leafLit.g + 40)}, ${Math.min(255, leafLit.b + 30)}, 0.98)`)
    } else {
      leafGrad.addColorStop(0, `rgba(${leafShade.r * 0.7}, ${leafShade.g * 0.7}, ${leafShade.b * 0.7}, 0.85)`)
      leafGrad.addColorStop(1, `rgba(${leafShade.r}, ${leafShade.g}, ${leafShade.b}, 0.9)`)
    }

    ctx.fillStyle = leafGrad
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(size * 1.5, -size * 0.15, size * 2.8, 0)
    ctx.strokeStyle = `rgba(255, 255, 255, ${isLit ? 0.35 : 0.18})`
    ctx.lineWidth = 0.75
    ctx.stroke()

    if (hasDewdrop && size >= 5) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)"
      ctx.beginPath()
      ctx.arc(size * 2.2, 0, 1.3, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  _drawBlossom(ctx, x, y, flower) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(flower.rotation)

    const size = flower.size
    const petals = flower.petalCount
    const hue = flower.hue

    // Layer 1: Outer Petals
    for (let i = 0; i < petals; i++) {
      ctx.save()
      ctx.rotate(((Math.PI * 2) / petals) * i)

      const petalGrad = ctx.createLinearGradient(0, 0, size * 3.4, 0)
      petalGrad.addColorStop(0, `hsla(${hue}, 85%, 85%, 0.95)`)
      petalGrad.addColorStop(0.65, `hsla(${hue + 15}, 80%, 75%, 0.9)`)
      petalGrad.addColorStop(1, `hsla(${hue + 25}, 90%, 92%, 0.98)`)

      ctx.fillStyle = petalGrad
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(size * 1.4, -size * 1.7, size * 3.4, 0)
      ctx.quadraticCurveTo(size * 1.4, size * 1.7, 0, 0)
      ctx.fill()
      ctx.restore()
    }

    // Layer 2: Inner Petal Crown
    for (let i = 0; i < petals; i++) {
      ctx.save()
      ctx.rotate(((Math.PI * 2) / petals) * (i + 0.5))

      ctx.fillStyle = `hsla(${hue - 15}, 85%, 80%, 0.85)`
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(size * 0.9, -size * 1.1, size * 2.2, 0)
      ctx.quadraticCurveTo(size * 0.9, size * 1.1, 0, 0)
      ctx.fill()
      ctx.restore()
    }

    // Layer 3: Glowing Golden Pollen Stamen & Core
    const twinkle = 0.7 + 0.3 * Math.sin(flower.stamenTwinkle)
    ctx.fillStyle = `rgba(255, 235, 120, ${(0.95 * twinkle).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}

// ── Main PlantGrowthEffect Class (AAA Hollywood Architecture) ────────────────
export class PlantGrowthEffect {
  constructor(canvasId, options = {}) {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false

    // Options (Color & Mode)
    if (typeof options === "string") {
      this.baseColor = options
      this._mode = "enchanted"
    } else {
      this.baseColor = options.color || "#4caf50"
      this._mode = options.mode || "enchanted"
    }

    this.rgb = hexToRgb(this.baseColor) || { r: 76, g: 175, b: 80 }

    this.plants = []
    this.grass = []
    this.spores = []
    this.petals = []
    this.sporeCount = 45
    this.petalCount = 35

    this.time = 0
    this.lastTime = performance.now()
    this._animId = null

    // Screen & DPI state
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)

    // Interactive mouse airflow wake
    this.mouse = {
      x: -9999,
      y: -9999,
      radius: 145,
      radiusSq: 145 * 145,
      active: false,
    }

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseLeaveHandler = () => this._onMouseLeave()
    this._clickHandler = (e) => this._onCanvasClick(e)
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseleave", this._mouseLeaveHandler, { passive: true })
    window.addEventListener("pointerdown", this._clickHandler)
    document.addEventListener("visibilitychange", this._visibilityHandler)
  }

  get color() {
    return this.baseColor
  }

  set color(value) {
    this.updateColor(value)
  }

  get mode() {
    return this._mode
  }

  set mode(value) {
    this.setMode(value)
  }

  setMode(mode) {
    this._mode = mode || "enchanted"
    if (this.active) this.initPlants()
  }

  setOptions(options = {}) {
    if (options.color !== undefined) this.updateColor(options.color)
    if (options.mode !== undefined) this.setMode(options.mode)
  }

  updateColor(hex) {
    if (!hex) return
    this.baseColor = hex
    this.rgb = hexToRgb(hex) || { r: 76, g: 175, b: 80 }
    if (this._mode === "custom" && this.active) {
      this.initPlants()
    }
  }

  _getThemeConfig() {
    if (this._mode === "custom") {
      const rgb = this.rgb || { r: 76, g: 175, b: 80 }
      return {
        stemBase: { r: Math.max(0, rgb.r - 35), g: Math.max(0, rgb.g - 35), b: Math.max(0, rgb.b - 35) },
        stemMid: rgb,
        stemTip: { r: Math.min(255, rgb.r + 45), g: Math.min(255, rgb.g + 55), b: Math.min(255, rgb.b + 35) },
        leafLit: { r: Math.min(255, rgb.r + 30), g: Math.min(255, rgb.g + 45), b: Math.min(255, rgb.b + 20) },
        leafShade: { r: Math.max(0, rgb.r - 40), g: Math.max(0, rgb.g - 40), b: Math.max(0, rgb.b - 40) },
        flowerHues: [335, 345, 15, 45],
        sporeColor: { r: Math.min(255, rgb.r + 60), g: Math.min(255, rgb.g + 75), b: rgb.b },
        petalColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`,
      }
    }
    return BOTANICAL_MODES[this._mode] || BOTANICAL_MODES.enchanted
  }

  _onMouseMove(e) {
    this.mouse.x = e.clientX
    this.mouse.y = e.clientY
    this.mouse.active = true
  }

  _onMouseLeave() {
    this.mouse.active = false
    this.mouse.x = -9999
    this.mouse.y = -9999
  }

  _onCanvasClick(e) {
    if (!this.active) return
    const targetX = e.clientX
    const targetY = e.clientY
    const startX = targetX + (Math.random() - 0.5) * 60
    const startY = this.height + 10
    const angle = Math.atan2(targetY - startY, targetX - startX)
    const isVine = Math.random() < 0.45
    const theme = this._getThemeConfig()

    // Sprout interactive stalk climbing towards click!
    this.plants.push(
      new BotanicalBranch(startX, startY, angle, isVine ? 4.5 : 11, 0, isVine, false, 2, theme)
    )

    // Burst spores on click
    for (let i = 0; i < 6; i++) {
      const sp = new BioluminescentSpore(this.width, this.height)
      sp.x = targetX + (Math.random() - 0.5) * 40
      sp.y = targetY + (Math.random() - 0.5) * 40
      this.spores.push(sp)
    }
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.lastTime = performance.now()
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

    if (this.active) this.initPlants()
  }

  initPlants() {
    this.plants = []
    this.grass = []
    this.spores = []
    this.petals = []

    const W = this.width
    const H = this.height
    const theme = this._getThemeConfig()

    // 1. Spores & Pollen
    for (let i = 0; i < this.sporeCount; i++) {
      this.spores.push(new BioluminescentSpore(W, H))
    }

    // 2. 3D Drifting Falling Petals
    for (let i = 0; i < this.petalCount; i++) {
      this.petals.push(new FallingPetal3D(W, H, this._mode))
    }

    // 3. Layered Grass Blades (Background, Midground, Foreground)
    const grassCount = Math.floor(W / 5.5)
    for (let i = 0; i < grassCount; i++) {
      const x = Math.random() * (W + 20) - 10
      const layer = i < grassCount * 0.3 ? 0 : i < grassCount * 0.75 ? 1 : 2
      this.grass.push(new GrassBlade(x, H + 6, layer))
    }

    // 4. Majestic Bottom Botanical Plants & Vines
    const bottomRootCount = Math.floor(W / 240) + 2
    for (let i = 0; i < bottomRootCount; i++) {
      const x = (W / (bottomRootCount - 1 || 1)) * i + (Math.random() * 80 - 40)
      const isVine = Math.random() < 0.35
      const layer = i % 2 === 0 ? 1 : 2
      this.plants.push(
        new BotanicalBranch(
          x,
          H + 10,
          -Math.PI / 2 + (Math.random() - 0.5) * 0.25,
          isVine ? 4.5 : 12,
          0,
          isVine,
          false,
          layer,
          theme
        )
      )
    }

    // 5. Top Hanging Jungle Canopy Vines
    const topRootCount = Math.floor(W / 320) + 1
    for (let i = 0; i < topRootCount; i++) {
      const x = (W / (topRootCount || 1)) * (i + 0.5) + (Math.random() * 80 - 40)
      this.plants.push(
        new BotanicalBranch(
          x,
          -10,
          Math.PI / 2 + (Math.random() - 0.5) * 0.25,
          4.5,
          0,
          true,
          true,
          1,
          theme
        )
      )
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastTime = performance.now()
    this.time = 0
    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"

    this.resize()
    this.initPlants()

    const animateLoop = (now) => {
      if (!this.active) return
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
    this.plants = []
    this.grass = []
    this.spores = []
    this.petals = []
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
    window.removeEventListener("pointerdown", this._clickHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  update(dt) {
    const W = this.width
    const H = this.height

    for (let i = 0; i < this.spores.length; i++) {
      this.spores[i].update(W, H, dt, this.mouse)
    }

    for (let i = 0; i < this.petals.length; i++) {
      this.petals[i].update(W, H, dt, this.mouse, this._mode)
    }

    for (let i = 0; i < this.grass.length; i++) {
      this.grass[i].update(dt, this.time, this.mouse)
    }

    for (let i = 0; i < this.plants.length; i++) {
      this.plants[i].update(dt, this.time, this.mouse, this)
    }
  }

  draw() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height

    ctx.clearRect(0, 0, W, H)

    const theme = this._getThemeConfig()

    // 1. Draw Background Grass
    for (let i = 0; i < this.grass.length; i++) {
      if (this.grass[i].layer === 0) this.grass[i].draw(ctx, theme)
    }

    // 2. Draw Midground Grass & Plants
    for (let i = 0; i < this.grass.length; i++) {
      if (this.grass[i].layer === 1) this.grass[i].draw(ctx, theme)
    }

    for (let i = 0; i < this.plants.length; i++) {
      this.plants[i].draw(ctx, theme, this.time)
    }

    // 3. Draw Foreground Grass
    for (let i = 0; i < this.grass.length; i++) {
      if (this.grass[i].layer === 2) this.grass[i].draw(ctx, theme)
    }

    // 4. Draw Floating Bioluminescent Spores
    for (let i = 0; i < this.spores.length; i++) {
      this.spores[i].draw(ctx, theme.sporeColor)
    }

    // 5. Draw 3D Falling Petals
    for (let i = 0; i < this.petals.length; i++) {
      this.petals[i].draw(ctx, theme)
    }
  }
}
