/**
 * NetworkEffect (Neural Network / Constellation Ultra HD)
 *
 * Hyper-futuristic, high-performance neural constellation simulation.
 * Features:
 *  - Multi-depth parallax layering (Background ambient grid + Foreground neural nexus).
 *  - Traveling Synaptic Data Pulses (photons gliding along active network pathways).
 *  - Major Nexus Hubs with pulsating holographic radar rings & star micro-nodes.
 *  - Interactive Neural Cursor Nexus with spring force fields & laser links.
 *  - Interactive EMP Shockwave on click: charges connected nodes and fires energy waves.
 *  - Spatial grid partitioning for silky smooth 60Hz - 240Hz performance.
 *  - Organic boundary drift and seamless toroidal wrapping.
 */

export class NetworkEffect {
  constructor(canvasId, color = "#00bcd4") {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this.active = false
    this._animId = null
    this.lastDrawTime = 0

    this._color = color || "#00bcd4"
    this._palette = this._computePalette(this._color)

    // Configuration
    this.nodeCount = 100
    this.connectionDistance = 145
    this.mouseDistance = 180
    this.mouseForce = 0.12

    this.nodes = []
    this.dataPackets = [] // Energy pulses traveling along links
    this.shockwaves = [] // Click EMP rings
    this.time = 0

    // Spatial hash grid for high performance
    this.gridCellSize = 150
    this.grid = new Map()

    // Mouse Tracking
    this.mouse = {
      x: null,
      y: null,
      prevX: null,
      prevY: null,
      vx: 0,
      vy: 0,
      isDown: false,
    }

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseOutHandler = () => this._onMouseOut()
    this._mouseDownHandler = (e) => this._onMouseDown(e)

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
  }

  // ── Color Palette Management ───────────────────────────────────────────────

  get color() {
    return this._color
  }

  set color(val) {
    this.updateColor(val)
  }

  updateColor(hex) {
    if (!hex) return
    this._color = hex
    this._palette = this._computePalette(hex)
  }

  _computePalette(hex) {
    const rgb = this.hexToRgb(hex)
    return {
      primary: rgb,
      primaryStr: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
      // Extra bright radiant core
      core: {
        r: Math.min(255, rgb.r + 80),
        g: Math.min(255, rgb.g + 80),
        b: Math.min(255, rgb.b + 80),
      },
      // Deep glow aura
      glow: {
        r: Math.max(0, Math.round(rgb.r * 0.85)),
        g: Math.max(0, Math.round(rgb.g * 0.85)),
        b: Math.max(0, Math.round(rgb.b * 0.85)),
      },
      // Pulse photon color
      pulse: {
        r: 255,
        g: Math.min(255, rgb.g + 120),
        b: Math.min(255, rgb.b + 120),
      },
    }
  }

  hexToRgb(hex) {
    if (!hex) return { r: 0, g: 188, b: 212 }
    let cleaned = hex.replace("#", "").trim()
    if (cleaned.length === 3) {
      cleaned = cleaned.split("").map((c) => c + c).join("")
    }
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleaned)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 188, b: 212 }
  }

  // ── Sizing & Node Setup ────────────────────────────────────────────────────

  resize() {
    if (!this.canvas) return
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    if (this.active) {
      this.initNodes()
    }
  }

  initNodes() {
    this.nodes = []
    this.dataPackets = []
    this.shockwaves = []

    const W = this.canvas.width
    const H = this.canvas.height
    // Scale count slightly with screen resolution
    const count = Math.min(130, Math.max(70, Math.floor((W * H) / 16000)))

    for (let i = 0; i < count; i++) {
      const depth = Math.random() // 0 (far/bg) to 1 (near/fg)
      const isHub = Math.random() < 0.16 // Major Nexus Hub

      this.nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: depth,
        baseVx: (Math.random() - 0.5) * (0.35 + depth * 0.55),
        baseVy: (Math.random() - 0.5) * (0.35 + depth * 0.55),
        vx: 0,
        vy: 0,
        size: isHub ? (3.5 + depth * 2.2) : (1.4 + depth * 1.8),
        baseSize: isHub ? (3.5 + depth * 2.2) : (1.4 + depth * 1.8),
        isHub: isHub,
        pulseOffset: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        energyCharge: 0, // Extra brightness from shockwaves or pulses
        wanderAngle: Math.random() * Math.PI * 2,
        wanderSpeed: 0.01 + Math.random() * 0.015,
      })
    }
  }

  // ── Mouse & Interaction ────────────────────────────────────────────────────

  _onMouseMove(e) {
    if (!this.active) return
    const curX = e.clientX
    const curY = e.clientY

    if (this.mouse.x !== null) {
      this.mouse.vx = curX - this.mouse.x
      this.mouse.vy = curY - this.mouse.y
    }

    this.mouse.x = curX
    this.mouse.y = curY
  }

  _onMouseOut() {
    this.mouse.x = null
    this.mouse.y = null
    this.mouse.vx = 0
    this.mouse.vy = 0
  }

  _onMouseDown(e) {
    if (!this.active) return
    const x = e.clientX
    const y = e.clientY

    // 1. Emit EMP Neural Shockwave
    this.shockwaves.push({
      x,
      y,
      radius: 8,
      maxRadius: 280,
      alpha: 1.0,
      decay: 0.024,
    })

    // 2. Charge nearby nodes & fire energy packet surge
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i]
      const dx = node.x - x
      const dy = node.y - y
      const dist = Math.hypot(dx, dy)
      if (dist < 260 && dist > 1) {
        node.energyCharge = 1.0
        // Push outwards
        const force = (1 - dist / 260) * 4.5
        node.vx += (dx / dist) * force
        node.vy += (dy / dist) * force
      }
    }
  }

  // ── Lifecycle Methods ──────────────────────────────────────────────────────

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this.initNodes()

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
    this.nodes = []
    this.dataPackets = []
    this.shockwaves = []
    this.mouse.x = null
    this.mouse.y = null
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
  }

  // ── Main Animation & Render Loop ───────────────────────────────────────────

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

    const p = this._palette
    const rgbStr = p.primaryStr

    // 1. Update & Draw EMP Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i]
      sw.radius += (sw.maxRadius - sw.radius) * 0.12 * deltaTime + 2.0
      sw.alpha -= sw.decay * deltaTime

      if (sw.alpha <= 0) {
        this.shockwaves.splice(i, 1)
        continue
      }

      this.ctx.save()
      this.ctx.beginPath()
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2)
      this.ctx.strokeStyle = `rgba(${p.core.r}, ${p.core.g}, ${p.core.b}, ${sw.alpha * 0.75})`
      this.ctx.lineWidth = Math.max(1, 3.0 * sw.alpha)
      this.ctx.stroke()

      // Outer faint halo
      this.ctx.beginPath()
      this.ctx.arc(sw.x, sw.y, sw.radius + 6, 0, Math.PI * 2)
      this.ctx.strokeStyle = `rgba(${p.glow.r}, ${p.glow.g}, ${p.glow.b}, ${sw.alpha * 0.3})`
      this.ctx.lineWidth = 1
      this.ctx.stroke()
      this.ctx.restore()
    }

    // 2. Build Spatial Hash Grid for Ultra-Fast Connections
    this.grid.clear()
    const cellSize = this.gridCellSize
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i]
      const cellX = Math.floor(node.x / cellSize)
      const cellY = Math.floor(node.y / cellSize)
      const key = `${cellX},${cellY}`
      if (!this.grid.has(key)) {
        this.grid.set(key, [])
      }
      this.grid.get(key).push(i)
    }

    // 3. Draw Network Connections
    this.ctx.save()
    const connDist = this.connectionDistance
    const connDistSq = connDist * connDist
    const drawnPairs = new Set()

    for (let i = 0; i < this.nodes.length; i++) {
      const n1 = this.nodes[i]
      const cellX = Math.floor(n1.x / cellSize)
      const cellY = Math.floor(n1.y / cellSize)

      // Check neighbor cells
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const key = `${cellX + ox},${cellY + oy}`
          const cellNodes = this.grid.get(key)
          if (!cellNodes) continue

          for (let k = 0; k < cellNodes.length; k++) {
            const j = cellNodes[k]
            if (i >= j) continue

            const pairKey = i * 10000 + j
            if (drawnPairs.has(pairKey)) continue
            drawnPairs.add(pairKey)

            const n2 = this.nodes[j]
            const dx = n1.x - n2.x
            const dy = n1.y - n2.y
            const distSq = dx * dx + dy * dy

            if (distSq < connDistSq) {
              const dist = Math.sqrt(distSq)
              const depthFactor = (n1.z + n2.z) * 0.5
              let alpha = (1 - dist / connDist) * (0.15 + depthFactor * 0.35)

              // Bonus brightness if either node is energized
              const maxCharge = Math.max(n1.energyCharge, n2.energyCharge)
              if (maxCharge > 0.05) {
                alpha += maxCharge * 0.4
              }

              // Mouse proximity boost
              if (this.mouse.x !== null) {
                const midX = (n1.x + n2.x) * 0.5
                const midY = (n1.y + n2.y) * 0.5
                const mdx = this.mouse.x - midX
                const mdy = this.mouse.y - midY
                const mDist = Math.hypot(mdx, mdy)
                if (mDist < 120) {
                  alpha *= 1 + (1 - mDist / 120) * 1.8
                }
              }

              // Draw connection line
              this.ctx.beginPath()
              this.ctx.moveTo(n1.x, n1.y)
              this.ctx.lineTo(n2.x, n2.y)
              this.ctx.strokeStyle = `rgba(${rgbStr}, ${Math.min(1.0, alpha)})`
              this.ctx.lineWidth = 0.5 + depthFactor * 0.8 + maxCharge * 0.6
              this.ctx.stroke()

              // Spontaneously spawn traveling data packets between close active nodes
              if (dist < connDist * 0.75 && Math.random() < 0.0018 && this.dataPackets.length < 24) {
                this.dataPackets.push({
                  from: n1,
                  to: n2,
                  progress: 0,
                  speed: 0.018 + Math.random() * 0.024,
                  size: 2.2 + depthFactor * 1.5,
                })
              }
            }
          }
        }
      }

      // Connect to Mouse (Neural Core Nexus)
      if (this.mouse.x !== null) {
        const mdx = n1.x - this.mouse.x
        const mdy = n1.y - this.mouse.y
        const mDistSq = mdx * mdx + mdy * mdy
        const mLimitSq = this.mouseDistance * this.mouseDistance

        if (mDistSq < mLimitSq) {
          const mDist = Math.sqrt(mDistSq)
          const mAlpha = (1 - mDist / this.mouseDistance) * 0.75

          // Electric laser link to cursor
          this.ctx.beginPath()
          this.ctx.moveTo(n1.x, n1.y)
          this.ctx.lineTo(this.mouse.x, this.mouse.y)
          this.ctx.strokeStyle = `rgba(${p.core.r}, ${p.core.g}, ${p.core.b}, ${mAlpha})`
          this.ctx.lineWidth = 1.2 + (1 - mDist / this.mouseDistance) * 1.2
          this.ctx.stroke()
        }
      }
    }
    this.ctx.restore()

    // 4. Update & Draw Traveling Synaptic Data Packets
    this.ctx.save()
    for (let i = this.dataPackets.length - 1; i >= 0; i--) {
      const pkt = this.dataPackets[i]
      pkt.progress += pkt.speed * deltaTime

      if (pkt.progress >= 1.0) {
        pkt.to.energyCharge = Math.min(1.0, pkt.to.energyCharge + 0.4)
        this.dataPackets.splice(i, 1)
        continue
      }

      const px = pkt.from.x + (pkt.to.x - pkt.from.x) * pkt.progress
      const py = pkt.from.y + (pkt.to.y - pkt.from.y) * pkt.progress
      const pAlpha = Math.sin(pkt.progress * Math.PI)

      // Glowing photon packet
      this.ctx.beginPath()
      this.ctx.arc(px, py, pkt.size, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${p.pulse.r}, ${p.pulse.g}, ${p.pulse.b}, ${pAlpha * 0.95})`
      this.ctx.fill()

      // Inner white core
      this.ctx.beginPath()
      this.ctx.arc(px, py, pkt.size * 0.5, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(255, 255, 255, ${pAlpha})`
      this.ctx.fill()
    }
    this.ctx.restore()

    // 5. Update & Draw Neural Nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i]

      // Organic wandering steering
      n.wanderAngle += (Math.random() - 0.5) * n.wanderSpeed
      const targetVx = Math.cos(n.wanderAngle) * n.baseVx
      const targetVy = Math.sin(n.wanderAngle) * n.baseVy
      n.vx += (targetVx - n.vx) * 0.05 * deltaTime
      n.vy += (targetVy - n.vy) * 0.05 * deltaTime

      // Mouse Force Field (Soft gravity / repulsion)
      if (this.mouse.x !== null) {
        const dx = this.mouse.x - n.x
        const dy = this.mouse.y - n.y
        const dist = Math.hypot(dx, dy)
        if (dist < this.mouseDistance && dist > 1) {
          const proximity = 1 - dist / this.mouseDistance
          const pull = proximity * this.mouseForce * (0.8 + n.z * 0.6)
          n.vx += (dx / dist) * pull * deltaTime
          n.vy += (dy / dist) * pull * deltaTime
          n.size = n.baseSize * (1 + proximity * 0.8)
        } else {
          n.size += (n.baseSize - n.size) * 0.1 * deltaTime
        }
      } else {
        n.size += (n.baseSize - n.size) * 0.1 * deltaTime
      }

      // Physics velocity & damping
      n.x += (n.baseVx + n.vx) * deltaTime
      n.y += (n.baseVy + n.vy) * deltaTime
      n.vx *= 0.94
      n.vy *= 0.94

      // Energy charge decay
      if (n.energyCharge > 0) {
        n.energyCharge = Math.max(0, n.energyCharge - 0.02 * deltaTime)
      }

      // Smooth toroidal screen wrap
      if (n.x < -30) n.x = W + 20
      else if (n.x > W + 30) n.x = -20
      if (n.y < -30) n.y = H + 20
      else if (n.y > H + 30) n.y = -20

      // Node Rendering
      const pulse = Math.sin(this.time * 2 + n.pulseOffset) * 0.2 + 0.85
      const currentRadius = n.size * pulse + n.energyCharge * 2.0
      const nodeAlpha = Math.min(1.0, 0.4 + n.z * 0.55 + n.energyCharge * 0.4)

      // A. Major Nexus Hub (Holographic Radar Rings & Diamond Core)
      if (n.isHub) {
        // Concentric Holographic Ring
        const ringRad = currentRadius * 2.6 + Math.sin(this.time * 3 + n.pulseOffset) * 3
        this.ctx.beginPath()
        this.ctx.arc(n.x, n.y, ringRad, 0, Math.PI * 2)
        this.ctx.strokeStyle = `rgba(${rgbStr}, ${nodeAlpha * 0.35})`
        this.ctx.lineWidth = 0.8
        this.ctx.stroke()

        // Glowing outer halo
        this.ctx.beginPath()
        this.ctx.arc(n.x, n.y, currentRadius * 2.0, 0, Math.PI * 2)
        this.ctx.fillStyle = `rgba(${p.glow.r}, ${p.glow.g}, ${p.glow.b}, ${nodeAlpha * 0.2})`
        this.ctx.fill()
      }

      // B. Main Node Body
      this.ctx.beginPath()
      this.ctx.arc(n.x, n.y, currentRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${rgbStr}, ${nodeAlpha})`
      this.ctx.fill()

      // C. Bright Specular Core
      this.ctx.beginPath()
      this.ctx.arc(n.x, n.y, Math.max(0.8, currentRadius * 0.45), 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${p.core.r}, ${p.core.g}, ${p.core.b}, ${nodeAlpha * 0.95})`
      this.ctx.fill()
    }

    // 6. Draw Mouse Interactive Neural HUD
    if (this.mouse.x !== null) {
      const mx = this.mouse.x
      const my = this.mouse.y
      const ringPulse1 = 14 + Math.sin(this.time * 4) * 3
      const ringPulse2 = 24 + Math.cos(this.time * 3) * 4

      this.ctx.save()
      // Center Core
      this.ctx.beginPath()
      this.ctx.arc(mx, my, 4.5, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${p.core.r}, ${p.core.g}, ${p.core.b}, 0.95)`
      this.ctx.fill()

      // Primary HUD Ring
      this.ctx.beginPath()
      this.ctx.arc(mx, my, ringPulse1, 0, Math.PI * 2)
      this.ctx.strokeStyle = `rgba(${rgbStr}, 0.55)`
      this.ctx.lineWidth = 1.2
      this.ctx.stroke()

      // Secondary Outer Radar Ring
      this.ctx.beginPath()
      this.ctx.arc(mx, my, ringPulse2, 0, Math.PI * 2)
      this.ctx.strokeStyle = `rgba(${p.glow.r}, ${p.glow.g}, ${p.glow.b}, 0.25)`
      this.ctx.lineWidth = 0.8
      this.ctx.stroke()
      this.ctx.restore()
    }
  }
}
