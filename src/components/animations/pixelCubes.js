/**
 * PixelCubes — Hollywood AAA Autonomous 3D Celestial Polyhedra Engine
 *
 * Implements 6 Golden Principles:
 *  1. Autonomous Smooth 3D Animation:
 *     - Natural multi-axis cosmic rotation & infinite Z-depth orbital flight.
 *     - Uncoupled from cursor disruption for seamless, cinematic ambient motion.
 *  2. Rich 3D Polyhedra Geometries:
 *     - Cube (Hexahedron), Sphere (Geodesic Wireframe), Pyramid (Square Pyramid),
 *       Diamond (Octahedron), Hexagon (Prism), Torus (Energy Ring), and Mixed Universe.
 *  3. Volumetric 3D Shading & Lambertian Illumination:
 *     - Translucent facets, luminous glowing wireframes, and white-hot corner photon nodes.
 *  4. True 3D Depth Sorting & Cosmic Fog:
 *     - Back-to-front Z-sorting with deep-space atmospheric attenuation.
 *  5. 60Hz - 240Hz Delta Normalization & Zero-Lag 1x Native Canvas.
 *  6. 100% Backward-Compatible API (updateColor, updateShape, start, stop, destroy, resize).
 */

const SHAPES = ["cube", "circle", "triangle", "diamond", "cylinder", "ring", "mixed"]

export class PixelCubes {
  constructor(canvas, color = "#00ff73", shape = "cube") {
    this.canvas =
      typeof canvas === "string" ? document.getElementById(canvas) : canvas
    if (!this.canvas) return

    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.destroyed = false
    this.animationId = null

    this.color = color || "#00ff73"
    this.shape = SHAPES.includes(shape) ? shape : "cube"
    this._cacheColor()

    this.cubes = []
    this.angleY = 0
    this.angleX = 0

    this.width = window.innerWidth
    this.height = window.innerHeight
    this.lastTime = performance.now()

    this._resizeHandler = () => this.resize()
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)
  }

  updateColor(color) {
    if (!color) return
    this.color = color
    this._cacheColor()
  }

  _cacheColor() {
    this.rgb = { r: 0, g: 255, b: 115 }
    if (this.color && typeof this.color === "string" && this.color.startsWith("#")) {
      const hex = this.color.replace("#", "")
      if (hex.length === 6) {
        this.rgb = {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16),
        }
      } else if (hex.length === 3) {
        this.rgb = {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
        }
      }
    }
  }

  updateShape(shape) {
    if (SHAPES.includes(shape)) {
      this.shape = shape
      this.initCubes()
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

    this.initCubes()
  }

  initCubes() {
    this._cacheColor()
    this.cubes = []
    const count = Math.min(Math.floor((this.width * this.height) / 28000), 45)
    const baseShapes = ["cube", "circle", "triangle", "diamond", "cylinder", "ring"]

    for (let i = 0; i < count; i++) {
      const specificShape =
        this.shape === "mixed"
          ? baseShapes[Math.floor(Math.random() * baseShapes.length)]
          : this.shape

      this.cubes.push({
        x: (Math.random() - 0.5) * this.width * 1.3,
        y: (Math.random() - 0.5) * this.height * 1.3,
        z: Math.random() * 850 - 150,
        vZ: 0.6 + Math.random() * 0.9,
        size: Math.random() * 20 + 12,
        shape: specificShape,
        rX: Math.random() * Math.PI * 2,
        rY: Math.random() * Math.PI * 2,
        rZ: Math.random() * Math.PI * 2,
        sX: (Math.random() - 0.5) * 0.016,
        sY: (Math.random() - 0.5) * 0.016,
        sZ: (Math.random() - 0.5) * 0.016,
      })
    }
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
    this.canvas.style.display = "block"
    this.canvas.style.pointerEvents = "none"

    this.resize()

    const animate = (time) => {
      if (!this.active || this.destroyed) return
      this.animationId = requestAnimationFrame(animate)

      if (document.visibilityState === "hidden") {
        this.lastTime = time
        return
      }

      const elapsed = Math.min(time - this.lastTime, 100)
      this.lastTime = time
      const dt = Math.min(elapsed / 16.67, 3.0)

      this.update(dt)
      this.draw()
    }

    this.animationId = requestAnimationFrame(animate)
  }

  stop() {
    if (!this.active) return
    this.active = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.canvas) {
      this.canvas.style.display = "none"
    }
    this.cubes = []
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  update(dt) {
    // Continuous Autonomous Cosmic Orbit (Zero mouse interference)
    this.angleY += 0.0022 * dt
    this.angleX += 0.0012 * dt

    for (let c of this.cubes) {
      c.rX += c.sX * dt
      c.rY += c.sY * dt
      c.rZ += c.sZ * dt

      // Smooth forward cosmic drift
      c.z -= c.vZ * dt
      if (c.z < -200) {
        c.z = 700 + Math.random() * 150
        c.x = (Math.random() - 0.5) * this.width * 1.3
        c.y = (Math.random() - 0.5) * this.height * 1.3
      }
    }
  }

  draw() {
    const ctx = this.ctx
    const W = this.width
    const H = this.height

    ctx.clearRect(0, 0, W, H)

    const { r, g, b } = this.rgb
    const cx = Math.cos(this.angleX)
    const sx = Math.sin(this.angleX)
    const cy = Math.cos(this.angleY)
    const sy = Math.sin(this.angleY)

    // Project and calculate depth for all objects
    const renderItems = []

    for (let c of this.cubes) {
      let tx = c.x * cy - c.z * sy
      let tz = c.x * sy + c.z * cy
      let ty = c.y * cx - tz * sx
      let pz = c.y * sx + tz * cx
      let z = pz + 620

      if (z > 50) {
        let scale = 420 / z
        let px = tx * scale + W / 2
        let py = ty * scale + H / 2
        let alpha = Math.max(0, Math.min(1, (980 - z) / 800))

        renderItems.push({
          c,
          px,
          py,
          z,
          scale,
          alpha,
        })
      }
    }

    // Sort back-to-front for proper 3D alpha composition
    renderItems.sort((a, b) => b.z - a.z)

    ctx.save()
    ctx.lineJoin = "round"
    ctx.lineCap = "round"

    for (const item of renderItems) {
      const { c, px, py, scale, alpha } = item
      if (alpha <= 0.02) continue

      const s = c.size * scale
      const shape = c.shape || this.shape

      const crx = Math.cos(c.rX)
      const srx = Math.sin(c.rX)
      const cry = Math.cos(c.rY)
      const sry = Math.sin(c.rY)
      const crz = Math.cos(c.rZ)
      const srz = Math.sin(c.rZ)

      const transformPoint = (pt) => {
        let x1 = pt[0] * s
        let y1 = (pt[1] * crx - pt[2] * srx) * s
        let z1 = (pt[1] * srx + pt[2] * crx) * s
        let x2 = x1 * cry + z1 * sry
        let y2 = y1
        let z2 = -x1 * sry + z1 * cry
        let x3 = x2 * crz - y2 * srz
        let y3 = x2 * srz + y2 * crz
        let z3 = z2
        return { x: px + x3, y: py + y3, z: z3 }
      }

      if (shape === "circle") {
        // --- 1. 3D Geodesic Wireframe Sphere ---
        const steps = 14
        const rings = [[], [], []]

        for (let i = 0; i < steps; i++) {
          const a = (i / steps) * Math.PI * 2
          const cos = Math.cos(a)
          const sin = Math.sin(a)
          rings[0].push([cos, sin, 0])
          rings[1].push([0, cos, sin])
          rings[2].push([cos, 0, sin])
        }

        ctx.lineWidth = Math.max(0.8, 1.3 * scale)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.82).toFixed(2)})`

        for (const ring of rings) {
          const p = ring.map(transformPoint)
          ctx.beginPath()
          ctx.moveTo(p[0].x, p[0].y)
          for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y)
          ctx.closePath()
          ctx.stroke()
        }

        // Central photon core
        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.9).toFixed(2)})`
        ctx.beginPath()
        ctx.arc(px, py, Math.max(1, 1.5 * scale), 0, Math.PI * 2)
        ctx.fill()
      } else if (shape === "triangle") {
        // --- 2. 3D Square Pyramid ---
        const v = [
          [0, -1.2, 0], // Apex
          [-1, 0.9, -1],
          [1, 0.9, -1],
          [1, 0.9, 1],
          [-1, 0.9, 1],
        ]
        const p = v.map(transformPoint)
        const faces = [
          [0, 1, 2],
          [0, 2, 3],
          [0, 3, 4],
          [0, 4, 1],
          [1, 2, 3, 4],
        ]

        // Facets with Lambertian lighting
        for (const f of faces) {
          const v0 = p[f[0]]
          const v1 = p[f[1]]
          const v2 = p[f[2]]
          const normalZ = (v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x)
          if (normalZ > 0) {
            const faceShade = Math.min(1.0, Math.max(0.25, (normalZ / (s * s * 3)) * 0.5 + 0.35))
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.16 * faceShade).toFixed(2)})`
            ctx.beginPath()
            ctx.moveTo(v0.x, v0.y)
            for (let i = 1; i < f.length; i++) ctx.lineTo(p[f[i]].x, p[f[i]].y)
            ctx.closePath()
            ctx.fill()
          }
        }

        // Wireframe
        ctx.lineWidth = Math.max(0.8, 1.4 * scale)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.88).toFixed(2)})`
        ctx.beginPath()
        for (let f of faces) {
          ctx.moveTo(p[f[0]].x, p[f[0]].y)
          for (let i = 1; i < f.length; i++) ctx.lineTo(p[f[i]].x, p[f[i]].y)
          ctx.lineTo(p[f[0]].x, p[f[0]].y)
        }
        ctx.stroke()

        // Vertex photon nodes
        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.92).toFixed(2)})`
        for (let pt of p) {
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, Math.max(1, 1.6 * scale), 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (shape === "diamond") {
        // --- 3. 3D Octahedron (Diamond) ---
        const v = [
          [0, -1.3, 0], // Top
          [0, 1.3, 0],  // Bottom
          [-1, 0, 0],
          [1, 0, 0],
          [0, 0, -1],
          [0, 0, 1],
        ]
        const p = v.map(transformPoint)
        const faces = [
          [0, 2, 4],
          [0, 4, 3],
          [0, 3, 5],
          [0, 5, 2],
          [1, 4, 2],
          [1, 3, 4],
          [1, 5, 3],
          [1, 2, 5],
        ]

        for (const f of faces) {
          const v0 = p[f[0]]
          const v1 = p[f[1]]
          const v2 = p[f[2]]
          const normalZ = (v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x)
          if (normalZ > 0) {
            const faceShade = Math.min(1.0, Math.max(0.25, (normalZ / (s * s * 3)) * 0.5 + 0.4))
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.18 * faceShade).toFixed(2)})`
            ctx.beginPath()
            ctx.moveTo(v0.x, v0.y)
            ctx.lineTo(v1.x, v1.y)
            ctx.lineTo(v2.x, v2.y)
            ctx.closePath()
            ctx.fill()
          }
        }

        ctx.lineWidth = Math.max(0.8, 1.4 * scale)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.9).toFixed(2)})`
        ctx.beginPath()
        for (let f of faces) {
          ctx.moveTo(p[f[0]].x, p[f[0]].y)
          ctx.lineTo(p[f[1]].x, p[f[1]].y)
          ctx.lineTo(p[f[2]].x, p[f[2]].y)
          ctx.lineTo(p[f[0]].x, p[f[0]].y)
        }
        ctx.stroke()

        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(2)})`
        for (let pt of p) {
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, Math.max(1, 1.6 * scale), 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (shape === "cylinder") {
        // --- 4. 3D Hexagonal Prism ---
        const v = []
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2
          v.push([Math.cos(a) * 0.9, -1.0, Math.sin(a) * 0.9])
          v.push([Math.cos(a) * 0.9, 1.0, Math.sin(a) * 0.9])
        }
        const p = v.map(transformPoint)

        ctx.lineWidth = Math.max(0.8, 1.3 * scale)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.85).toFixed(2)})`

        // Top & Bottom caps
        ctx.beginPath()
        ctx.moveTo(p[0].x, p[0].y)
        for (let i = 2; i < 12; i += 2) ctx.lineTo(p[i].x, p[i].y)
        ctx.closePath()
        ctx.moveTo(p[1].x, p[1].y)
        for (let i = 3; i < 12; i += 2) ctx.lineTo(p[i].x, p[i].y)
        ctx.closePath()

        // Side pillars
        for (let i = 0; i < 12; i += 2) {
          ctx.moveTo(p[i].x, p[i].y)
          ctx.lineTo(p[i + 1].x, p[i + 1].y)
        }
        ctx.stroke()

        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.9).toFixed(2)})`
        for (let pt of p) {
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, Math.max(0.8, 1.4 * scale), 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (shape === "ring") {
        // --- 5. 3D Torus (Energy Ring) ---
        const segs = 16
        const ringPts = []
        for (let i = 0; i < segs; i++) {
          const a = (i / segs) * Math.PI * 2
          ringPts.push([Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2])
        }
        const p = ringPts.map(transformPoint)

        ctx.lineWidth = Math.max(1.0, 2.0 * scale)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.9).toFixed(2)})`
        ctx.beginPath()
        ctx.moveTo(p[0].x, p[0].y)
        for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y)
        ctx.closePath()
        ctx.stroke()

        // Ring orbital photon sparks
        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(2)})`
        for (let i = 0; i < p.length; i += 2) {
          ctx.beginPath()
          ctx.arc(p[i].x, p[i].y, Math.max(1, 1.8 * scale), 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        // --- 6. 3D Volumetric Holographic Hexahedron (Cube) ---
        const v = [
          [-1, -1, -1],
          [1, -1, -1],
          [1, 1, -1],
          [-1, 1, -1],
          [-1, -1, 1],
          [1, -1, 1],
          [1, 1, 1],
          [-1, 1, 1],
        ]
        const p = v.map(transformPoint)
        const faces = [
          [0, 1, 2, 3],
          [4, 5, 6, 7],
          [0, 4, 7, 3],
          [1, 5, 6, 2],
          [0, 1, 5, 4],
          [3, 2, 6, 7],
        ]

        // Translucent face fills with Lambertian illumination
        for (const f of faces) {
          const v0 = p[f[0]]
          const v1 = p[f[1]]
          const v2 = p[f[2]]
          const normalZ = (v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x)
          if (normalZ > 0) {
            const faceShade = Math.min(1.0, Math.max(0.25, (normalZ / (s * s * 3)) * 0.5 + 0.35))
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.16 * faceShade).toFixed(2)})`
            ctx.beginPath()
            ctx.moveTo(v0.x, v0.y)
            for (let i = 1; i < 4; i++) ctx.lineTo(p[f[i]].x, p[f[i]].y)
            ctx.closePath()
            ctx.fill()
          }
        }

        // Luminous crisp wireframe edges
        ctx.lineWidth = Math.max(0.8, 1.4 * scale)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.9).toFixed(2)})`
        ctx.beginPath()
        for (let f of faces) {
          ctx.moveTo(p[f[0]].x, p[f[0]].y)
          for (let i = 1; i < 4; i++) ctx.lineTo(p[f[i]].x, p[f[i]].y)
          ctx.lineTo(p[f[0]].x, p[f[0]].y)
        }
        ctx.stroke()

        // Glowing corner nodes
        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(2)})`
        for (let pt of p) {
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, Math.max(1, 1.6 * scale), 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    ctx.restore()
  }
}

