/**
 * PixelCubes — Hollywood AAA Volumetric 3D Polyhedra Engine
 *
 * Implements the 6 Golden Principles:
 *  1. Volumetric 3D Shading & Translucent Facets:
 *     - Semi-translucent holographic glass faces with Lambertian diffuse lighting.
 *     - Luminous glowing wireframe edges and corner vertex photon nodes.
 *  2. True 3D Depth Sorting & Cosmic Fog:
 *     - Back-to-front Z-sorting with atmospheric depth fog attenuation.
 *  3. Interactive 3D Gyroscopic Parallax:
 *     - Mouse movement tilts and rotates the celestial coordinate system with inertia.
 *  4. Multi-Geometry Support:
 *     - Cube (Hexahedron), Triangle (Square Pyramid), and Circle (Geodesic Wireframe Sphere).
 *  5. 60Hz - 240Hz Delta Normalization & Native High-DPI Retina Subpixel Precision.
 *  6. 100% Backward-Compatible API (updateColor, updateShape, start, stop, destroy, resize).
 */

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
    this.shape = shape || "cube"
    this._cacheColor()

    this.cubes = []
    this.mouseEnabled = true
    this.angleY = 0
    this.angleX = 0
    this.targetAngleX = 0
    this.targetAngleY = 0

    // High-DPI Retina
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.lastTime = performance.now()

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseLeaveHandler = () => this._onMouseLeave()
    this._visibilityHandler = () => this._onVisibilityChange()

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseleave", this._mouseLeaveHandler, { passive: true })
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
    if (["cube", "circle", "triangle"].includes(shape)) {
      this.shape = shape
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

    this.initCubes()
  }

  initCubes() {
    this._cacheColor()
    this.cubes = []
    const count = Math.min(Math.floor((this.width * this.height) / 28000), 55)

    for (let i = 0; i < count; i++) {
      this.cubes.push({
        x: (Math.random() - 0.5) * this.width * 1.4,
        y: (Math.random() - 0.5) * this.height * 1.4,
        z: Math.random() * 850 - 200,
        size: Math.random() * 22 + 12,
        rX: Math.random() * Math.PI * 2,
        rY: Math.random() * Math.PI * 2,
        rZ: Math.random() * Math.PI * 2,
        sX: (Math.random() - 0.5) * 0.018,
        sY: (Math.random() - 0.5) * 0.018,
        sZ: (Math.random() - 0.5) * 0.018,
      })
    }
  }

  setMouseEnabled(enabled) {
    this.mouseEnabled = Boolean(enabled)
    if (!this.mouseEnabled) {
      this.targetAngleX = 0
      this.targetAngleY = 0
    }
  }

  _onMouseMove(e) {
    if (this.mouseEnabled === false) return
    const nx = (e.clientX / this.width - 0.5) * 2
    const ny = (e.clientY / this.height - 0.5) * 2
    this.targetAngleY = nx * 0.45
    this.targetAngleX = -ny * 0.35
  }

  _onMouseLeave() {
    this.targetAngleX = 0
    this.targetAngleY = 0
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
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)
  }

  update(dt) {
    // Autonomous slow cosmic spin
    this.angleY += 0.0018 * dt
    this.angleX += 0.001 * dt

    // Inertial gyro tracking from mouse
    this.angleX += (this.targetAngleX - this.angleX) * 0.04 * dt
    this.angleY += (this.targetAngleY - this.angleY) * 0.04 * dt

    for (let c of this.cubes) {
      c.rX += c.sX * dt
      c.rY += c.sY * dt
      c.rZ += c.sZ * dt
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
      let z = pz + 650

      if (z > 60) {
        let scale = 420 / z
        let px = tx * scale + W / 2
        let py = ty * scale + H / 2
        let alpha = Math.max(0, Math.min(1, (1050 - z) / 850))

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
      const s = c.size * scale

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

      if (this.shape === "circle") {
        // --- 3D Geodesic Wireframe Sphere with 3 Primary Great Circles ---
        const steps = 16
        const rings = [[], [], []]

        for (let i = 0; i < steps; i++) {
          const a = (i / steps) * Math.PI * 2
          const cos = Math.cos(a)
          const sin = Math.sin(a)
          rings[0].push([cos, sin, 0])
          rings[1].push([0, cos, sin])
          rings[2].push([cos, 0, sin])
        }

        // Translucent central sphere glow
        const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, s * 1.1)
        glowGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.16).toFixed(3)})`)
        glowGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
        ctx.fillStyle = glowGrad
        ctx.beginPath()
        ctx.arc(px, py, s * 1.1, 0, Math.PI * 2)
        ctx.fill()

        ctx.lineWidth = Math.max(0.8, 1.4 * scale)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.85).toFixed(3)})`

        for (const ring of rings) {
          const p = ring.map(transformPoint)
          ctx.beginPath()
          ctx.moveTo(p[0].x, p[0].y)
          for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y)
          ctx.closePath()
          ctx.stroke()
        }
      } else if (this.shape === "triangle") {
        // --- 3D Square Pyramid with Translucent Lit Faces ---
        const v = [
          [0, -1.2, 0], // Top apex
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

        // Render translucent faces with Lambertian lighting
        for (const f of faces) {
          const v0 = p[f[0]]
          const v1 = p[f[1]]
          const v2 = p[f[2]]
          const ax = v1.x - v0.x
          const ay = v1.y - v0.y
          const bx = v2.x - v0.x
          const by = v2.y - v0.y
          const normalZ = ax * by - ay * bx

          if (normalZ > 0) {
            // Front-facing
            const faceShade = Math.min(1.0, Math.max(0.2, (normalZ / (s * s * 3)) * 0.5 + 0.3))
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.18 * faceShade).toFixed(3)})`
            ctx.beginPath()
            ctx.moveTo(v0.x, v0.y)
            for (let i = 1; i < f.length; i++) ctx.lineTo(p[f[i]].x, p[f[i]].y)
            ctx.closePath()
            ctx.fill()
          }
        }

        // Glowing Wireframe Edges
        ctx.lineWidth = Math.max(0.9, 1.5 * scale)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.9).toFixed(3)})`
        ctx.beginPath()
        for (let f of faces) {
          ctx.moveTo(p[f[0]].x, p[f[0]].y)
          for (let i = 1; i < f.length; i++) ctx.lineTo(p[f[i]].x, p[f[i]].y)
          ctx.lineTo(p[f[0]].x, p[f[0]].y)
        }
        ctx.stroke()

        // Corner photon nodes
        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`
        for (let pt of p) {
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, Math.max(1, 1.8 * scale), 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        // --- 3D Volumetric Holographic Hexahedron (Cube) ---
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
          [0, 1, 2, 3], // Back
          [4, 5, 6, 7], // Front
          [0, 4, 7, 3], // Left
          [1, 5, 6, 2], // Right
          [0, 1, 5, 4], // Top
          [3, 2, 6, 7], // Bottom
        ]

        // Translucent holographic face fills with 3D Lambertian normal illumination
        for (const f of faces) {
          const v0 = p[f[0]]
          const v1 = p[f[1]]
          const v2 = p[f[2]]
          const ax = v1.x - v0.x
          const ay = v1.y - v0.y
          const bx = v2.x - v0.x
          const by = v2.y - v0.y
          const normalZ = ax * by - ay * bx

          if (normalZ > 0) {
            const faceShade = Math.min(1.0, Math.max(0.2, (normalZ / (s * s * 3)) * 0.5 + 0.35))
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.16 * faceShade).toFixed(3)})`
            ctx.beginPath()
            ctx.moveTo(v0.x, v0.y)
            for (let i = 1; i < 4; i++) ctx.lineTo(p[f[i]].x, p[f[i]].y)
            ctx.closePath()
            ctx.fill()
          }
        }

        // Luminous crisp wireframe edges
        ctx.lineWidth = Math.max(0.9, 1.5 * scale)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.92).toFixed(3)})`
        ctx.beginPath()
        for (let f of faces) {
          ctx.moveTo(p[f[0]].x, p[f[0]].y)
          for (let i = 1; i < 4; i++) ctx.lineTo(p[f[i]].x, p[f[i]].y)
          ctx.lineTo(p[f[0]].x, p[f[0]].y)
        }
        ctx.stroke()

        // Glowing corner nodes
        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`
        for (let pt of p) {
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, Math.max(1, 1.8 * scale), 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    ctx.restore()
  }
}

