export class SilkEffect {
  constructor(canvasId, options = {}) {
    const origCanvas = document.getElementById(canvasId)
    this.canvasWrapper = origCanvas ? origCanvas.parentElement : document.body

    const existing = document.querySelector(".silk-webgl-canvas")
    if (existing) existing.remove()

    this.canvas = document.createElement("canvas")
    this.canvas.className = "silk-webgl-canvas"
    this.canvas.style.position = "fixed"
    this.canvas.style.inset = "0"
    this.canvas.style.zIndex = "-3"
    this.canvas.style.pointerEvents = "none"
    this.canvas.style.display = "none"
    this.canvasWrapper.appendChild(this.canvas)

    this.gl =
      this.canvas.getContext("webgl") ||
      this.canvas.getContext("experimental-webgl")
    this.active = false

    this.speed = options.speed !== undefined ? options.speed : 5.0
    this.scale = options.scale !== undefined ? options.scale : 1.0
    this.color = options.color || "#7B7481"
    this.noiseIntensity =
      options.noiseIntensity !== undefined ? options.noiseIntensity : 1.5
    this.rotation = options.rotation !== undefined ? options.rotation : 0.0

    this.time = 0

    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)

    this._initWebGL()
    this.resize()
  }

  _hexToRgbForm(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return m
      ? [
          parseInt(m[1], 16) / 255,
          parseInt(m[2], 16) / 255,
          parseInt(m[3], 16) / 255,
        ]
      : [0.48, 0.45, 0.5]
  }

  _initWebGL() {
    if (!this.gl) return
    const gl = this.gl

    const vert = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `

    const frag = `
      precision highp float;

      varying vec2 vUv;

      uniform float uTime;
      uniform vec3  uColor;
      uniform float uSpeed;
      uniform float uScale;
      uniform float uRotation;
      uniform float uNoiseIntensity;

      const float e = 2.71828182845904523536;

      float noise(vec2 texCoord) {
        float G = e;
        vec2  r = (G * sin(G * texCoord));
        return fract(r.x * r.y * (1.0 + texCoord.x));
      }

      vec2 rotateUvs(vec2 uv, float angle) {
        float c = cos(angle);
        float s = sin(angle);
        mat2  rot = mat2(c, -s, s, c);
        return rot * uv;
      }

      void main() {
        float rnd = noise(gl_FragCoord.xy);
        vec2  uv = rotateUvs(vUv * uScale, uRotation);
        vec2  tex = uv * uScale;
        float tOffset = uSpeed * uTime;

        tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

        float pattern = 0.6 +
                        0.4 * sin(5.0 * (tex.x + tex.y +
                                         cos(3.0 * tex.x + 5.0 * tex.y) +
                                         0.02 * tOffset) +
                                 sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

        vec4 col = vec4(uColor, 1.0) * vec4(pattern) - rnd / 15.0 * uNoiseIntensity;
        col.a = 1.0;
        gl_FragColor = col;
      }
    `

    const createShader = (type, source) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vertShader = createShader(gl.VERTEX_SHADER, vert)
    const fragShader = createShader(gl.FRAGMENT_SHADER, frag)

    this.program = gl.createProgram()
    gl.attachShader(this.program, vertShader)
    gl.attachShader(this.program, fragShader)
    gl.linkProgram(this.program)

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(this.program))
      return
    }

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )

    this.positionLocation = gl.getAttribLocation(this.program, "position")

    this.uniforms = {
      uTime: gl.getUniformLocation(this.program, "uTime"),
      uColor: gl.getUniformLocation(this.program, "uColor"),
      uSpeed: gl.getUniformLocation(this.program, "uSpeed"),
      uScale: gl.getUniformLocation(this.program, "uScale"),
      uRotation: gl.getUniformLocation(this.program, "uRotation"),
      uNoiseIntensity: gl.getUniformLocation(this.program, "uNoiseIntensity"),
    }
  }

  resize() {
    if (!this.canvas || !this.gl) return
    const dpr = Math.min(window.devicePixelRatio, 2) || 1
    this.canvas.width = window.innerWidth * dpr
    this.canvas.height = window.innerHeight * dpr
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
  }

  updateParam(key, value) {
    if (this[key] !== undefined) {
      this[key] = value
    }
  }

  setOptions(options) {
    if (options.color !== undefined) this.color = options.color
    if (options.speed !== undefined) this.speed = options.speed
    if (options.scale !== undefined) this.scale = options.scale
    if (options.noise !== undefined) this.noiseIntensity = options.noise
    if (options.rotation !== undefined) this.rotation = options.rotation
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this.lastTime = performance.now()
    this._animate()
  }

  stop() {
    this.active = false
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    this.canvas.style.display = "none"
  }

  _animate() {
    if (!this.active || !this.gl) return
    this._animId = requestAnimationFrame(() => this._animate())

    if (document.visibilityState === "hidden") return

    const now = performance.now()
    const dt = now - this.lastTime
    this.lastTime = now
    this.time += dt

    const gl = this.gl
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(this.program)
    gl.enableVertexAttribArray(this.positionLocation)
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0)

    gl.uniform1f(this.uniforms.uTime, this.time * 0.001)

    const colorRGB = this._hexToRgbForm(this.color)
    gl.uniform3f(this.uniforms.uColor, colorRGB[0], colorRGB[1], colorRGB[2])
    gl.uniform1f(this.uniforms.uSpeed, this.speed)
    gl.uniform1f(this.uniforms.uScale, this.scale)
    gl.uniform1f(this.uniforms.uRotation, this.rotation)
    gl.uniform1f(this.uniforms.uNoiseIntensity, this.noiseIntensity)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }
}
