export class PixelCubes {
  constructor(canvas, color = "#00ff73", shape = "cube") {
    this.canvas =
      typeof canvas === "string" ? document.getElementById(canvas) : canvas
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d")
    this.animationId = null
    this.cubes = []
    this.color = color
    this.shape = shape || "cube"
    this.angleY = 0
    this.angleX = 0
  }

  updateColor(color) {
    this.color = color
  }

  updateShape(shape) {
    this.shape = shape
  }

  resize() {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.initCubes()
  }

  initCubes() {
    this.cubes = []
    const count = Math.min(Math.floor((this.width * this.height) / 30000), 60)
    for (let i = 0; i < count; i++) {
      this.cubes.push({
        x: (Math.random() - 0.5) * this.width * 1.5,
        y: (Math.random() - 0.5) * this.height * 1.5,
        z: Math.random() * 800 - 200,
        size: Math.random() * 20 + 10,
        rX: Math.random() * Math.PI * 2,
        rY: Math.random() * Math.PI * 2,
        rZ: Math.random() * Math.PI * 2,
        sX: (Math.random() - 0.5) * 0.02,
        sY: (Math.random() - 0.5) * 0.02,
        sZ: (Math.random() - 0.5) * 0.02,
      })
    }
  }

  start() {
    if (this.animationId) return
    this.canvas.style.display = "block"
    this.resize()
    this.then = performance.now()
    const animate = (time) => {
      this.animationId = requestAnimationFrame(animate)
      const elapsed = time - this.then
      if (elapsed > 1000 / 60) {
        this.then = time - (elapsed % (1000 / 60))
        this.draw()
      }
    }
    animate(performance.now())
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height)
    this.angleY += 0.002
    this.angleX += 0.001

    // Parse color
    let r = 0,
      g = 255,
      b = 115
    if (this.color.startsWith("#") && this.color.length === 7) {
      r = parseInt(this.color.substring(1, 3), 16)
      g = parseInt(this.color.substring(3, 5), 16)
      b = parseInt(this.color.substring(5, 7), 16)
    }

    this.ctx.lineWidth = 1.5

    for (let c of this.cubes) {
      c.rX += c.sX
      c.rY += c.sY
      c.rZ += c.sZ

      let cx = Math.cos(this.angleX),
        sx = Math.sin(this.angleX)
      let cy = Math.cos(this.angleY),
        sy = Math.sin(this.angleY)

      let tx = c.x * cy - c.z * sy
      let tz = c.x * sy + c.z * cy
      let ty = c.y * cx - tz * sx
      let pz = c.y * sx + tz * cx

      let z = pz + 600

      if (z > 50) {
        let scale = 400 / z
        let px = tx * scale + this.width / 2
        let py = ty * scale + this.height / 2

        let alpha = Math.max(0, Math.min(1, (1000 - z) / 800))
        this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`

        let s = c.size * scale
        let crx = Math.cos(c.rX),
          srx = Math.sin(c.rX)
        let cry = Math.cos(c.rY),
          sry = Math.sin(c.rY)
        let crz = Math.cos(c.rZ),
          srz = Math.sin(c.rZ)

        if (this.shape === "circle") {
          // 3D Wireframe Sphere (3 perpendicular rings)
          const steps = 12
          const rings = [
            [], // XY
            [], // YZ
            [], // XZ
          ]
          for (let i = 0; i < steps; i++) {
            const a = (i / steps) * Math.PI * 2
            const cos = Math.cos(a)
            const sin = Math.sin(a)
            rings[0].push([cos, sin, 0])
            rings[1].push([0, cos, sin])
            rings[2].push([cos, 0, sin])
          }

          rings.forEach((ring) => {
            const p = ring.map((pt) => {
              let x1 = pt[0] * s,
                y1 = (pt[1] * crx - pt[2] * srx) * s,
                z1 = (pt[1] * srx + pt[2] * crx) * s
              let x2 = x1 * cry + z1 * sry,
                y2 = y1
              let x3 = x2 * crz - y2 * srz,
                y3 = x2 * srz + y2 * crz
              return { x: px + x3, y: py + y3 }
            })

            this.ctx.beginPath()
            this.ctx.moveTo(p[0].x, p[0].y)
            for (let i = 1; i < p.length; i++) this.ctx.lineTo(p[i].x, p[i].y)
            this.ctx.closePath()
            this.ctx.stroke()
          })
        } else if (this.shape === "triangle") {
          // Pyramid vertices
          let v = [
            [0, -1, 0], // Top
            [-1, 1, -1],
            [1, 1, -1],
            [1, 1, 1],
            [-1, 1, 1],
          ]
          let p = v.map((pt) => {
            let x1 = pt[0] * s,
              y1 = (pt[1] * crx - pt[2] * srx) * s,
              z1 = (pt[1] * srx + pt[2] * crx) * s
            let x2 = x1 * cry + z1 * sry,
              y2 = y1
            let x3 = x2 * crz - y2 * srz,
              y3 = x2 * srz + y2 * crz
            return { x: px + x3, y: py + y3 }
          })
          const faces = [
            [0, 1, 2],
            [0, 2, 3],
            [0, 3, 4],
            [0, 4, 1],
            [1, 2, 3, 4],
          ]
          this.ctx.beginPath()
          for (let f of faces) {
            this.ctx.moveTo(p[f[0]].x, p[f[0]].y)
            for (let i = 1; i < f.length; i++) this.ctx.lineTo(p[f[i]].x, p[f[i]].y)
            this.ctx.lineTo(p[f[0]].x, p[f[0]].y)
          }
          this.ctx.stroke()
        } else {
          // Cube
          let v = [
            [-1, -1, -1],
            [1, -1, -1],
            [1, 1, -1],
            [-1, 1, -1],
            [-1, -1, 1],
            [1, -1, 1],
            [1, 1, 1],
            [-1, 1, 1],
          ]
          let p = v.map((pt) => {
            let x1 = pt[0] * s,
              y1 = (pt[1] * crx - pt[2] * srx) * s,
              z1 = (pt[1] * srx + pt[2] * crx) * s
            let x2 = x1 * cry + z1 * sry,
              y2 = y1
            let x3 = x2 * crz - y2 * srz,
              y3 = x2 * srz + y2 * crz
            return { x: px + x3, y: py + y3 }
          })
          const faces = [
            [0, 1, 2, 3],
            [4, 5, 6, 7],
            [0, 4, 7, 3],
            [1, 5, 6, 2],
            [0, 1, 5, 4],
            [3, 2, 6, 7],
          ]
          this.ctx.beginPath()
          for (let f of faces) {
            this.ctx.moveTo(p[f[0]].x, p[f[0]].y)
            for (let i = 1; i < 4; i++) this.ctx.lineTo(p[f[i]].x, p[f[i]].y)
            this.ctx.lineTo(p[f[0]].x, p[f[0]].y)
          }
          this.ctx.stroke()
        }
      }
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }
}
