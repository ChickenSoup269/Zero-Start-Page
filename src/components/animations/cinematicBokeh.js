/**
 * Cinematic Bokeh Effect - High Definition GPU WebGL Simulation
 * Featuring:
 * - Hardware-accelerated multi-depth Airy disc aperture optics
 * - Realistic chromatic aberration (red/blue fringing) & luminous core highlights
 * - 3D mouse parallax tilt & organic floating sinusoidal sway
 * - Zero CPU lag (Single GPU draw-call, 0% CPU overhead)
 * - Dark background toggle support and instant tab-switch sleep
 */

export class CinematicBokehBackground {
  constructor(
    canvasId,
    color1 = "#ff9a9e",
    color2 = "#fecfef",
    darkBackground = false,
  ) {
    const origCanvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId
    this.canvasWrapper = origCanvas ? origCanvas.parentElement : document.body

    const existing = document.querySelector(".cinematic-bokeh-webgl-canvas")
    if (existing) existing.remove()

    this.canvas = document.createElement("canvas")
    this.canvas.className = "cinematic-bokeh-webgl-canvas"
    this.canvas.style.position = "fixed"
    this.canvas.style.top = "0"
    this.canvas.style.left = "0"
    this.canvas.style.width = "100%"
    this.canvas.style.height = "100%"
    this.canvas.style.zIndex = "-4"
    this.canvas.style.pointerEvents = "none"
    this.canvas.style.display = "none"
    this.canvasWrapper.appendChild(this.canvas)

    this.gl =
      this.canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
      }) ||
      this.canvas.getContext("experimental-webgl", {
        alpha: true,
        antialias: false,
      })

    this.active = false
    this.animationId = null
    this.time = 0

    this.color1 = color1
    this.color2 = color2
    this.rgb1 = this.hexToRgb(this.color1)
    this.rgb2 = this.hexToRgb(this.color2)
    this.darkBackground = darkBackground

    this.numParticles = 75
    this.mouse = { x: 0.5, y: 0.5 }
    this.targetMouse = { x: 0.5, y: 0.5 }

    this.vertexShaderSource = `
      precision mediump float;
      attribute vec2 a_corner;
      attribute vec4 a_data;    // x, y, radius, depth (z: 0.1 to 1.0)
      attribute vec4 a_motion;  // speedY, swaySpeed, swayAmp, colorMix

      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;

      varying vec2 v_uv;
      varying float v_depth;
      varying float v_colorMix;
      varying float v_phase;

      void main() {
        float depth = a_data.w;
        float speedY = a_motion.x;
        float swaySpeed = a_motion.y;
        float swayAmp = a_motion.z;
        float colorMix = a_motion.w;

        // Infinite smooth upward wrap
        float maxR = a_data.z * 1.5;
        float totalH = u_resolution.y + maxR * 3.0;
        float posY = mod(a_data.y - u_time * speedY * 30.0, totalH) - maxR * 1.5;

        // Horizontal sinusoidal sway
        float posX = a_data.x + sin(u_time * swaySpeed + a_data.x * 0.02) * swayAmp * 35.0;

        // 3D Parallax: foreground orbs shift more than distant ones
        vec2 parallax = (u_mouse - 0.5) * (1.15 - depth) * 75.0;
        vec2 center = vec2(posX, posY) + parallax;

        vec2 pos = center + a_corner * a_data.z;

        // Convert to clip space
        vec2 clipPos = (pos / u_resolution) * 2.0 - 1.0;
        clipPos.y = -clipPos.y;

        gl_Position = vec4(clipPos, 0.0, 1.0);
        v_uv = a_corner;
        v_depth = depth;
        v_colorMix = colorMix;
        v_phase = a_data.x * 0.1 + a_data.y * 0.1;
      }
    `

    this.fragmentShaderSource = `
      precision mediump float;
      varying vec2 v_uv;
      varying float v_depth;
      varying float v_colorMix;
      varying float v_phase;

      uniform float u_time;
      uniform vec3 u_color1;
      uniform vec3 u_color2;

      void main() {
        float dist = length(v_uv);
        if (dist > 1.0) discard;

        // Cinematic Airy Disc Aperture Optics:
        // Translucent core with bright glowing spherical aberration rim
        float rim = smoothstep(0.68, 0.98, dist);
        float core = exp(-dist * dist * 3.2);
        float bokehDensity = core * 0.45 + rim * 0.85;

        // Anti-aliased outer edge falloff
        float edgeAlpha = 1.0 - smoothstep(0.92, 1.0, dist);

        // Gentle light twinkle
        float shimmer = sin(u_time * 2.2 + v_phase) * 0.12 + 0.88;

        // Chromatic aberration at edge rim
        float rDist = length(v_uv * 1.02);
        float bDist = length(v_uv * 0.98);
        float rimR = smoothstep(0.68, 0.98, rDist);
        float rimB = smoothstep(0.68, 0.98, bDist);

        vec3 baseColor = mix(u_color1, u_color2, v_colorMix);

        // Color grading with chromatic dispersion & hot luminous core
        vec3 bokehCol = baseColor;
        bokehCol.r += rimR * 0.12;
        bokehCol.b += rimB * 0.12;
        bokehCol += vec3(0.95, 0.95, 1.0) * pow(core, 2.0) * 0.55;

        // Depth-based alpha grading (larger foreground orbs are dreamy & soft)
        float alpha = bokehDensity * edgeAlpha * shimmer * (0.28 + (1.0 - v_depth) * 0.42);

        gl_FragColor = vec4(bokehCol * alpha, alpha);
      }
    `

    this._handleMouseMove = this._handleMouseMove.bind(this)
    this._handleResize = this._handleResize.bind(this)
    this._handleVisibility = this._handleVisibility.bind(this)
  }

  hexToRgb(hex) {
    let clean = (hex || "#ff9a9e").replace("#", "")
    if (clean.length === 3) {
      clean = clean
        .split("")
        .map((c) => c + c)
        .join("")
    }
    const num = parseInt(clean, 16) || 0
    return [
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255,
    ]
  }

  updateColor(type, color) {
    if (type === "color1") {
      this.color1 = color
      this.rgb1 = this.hexToRgb(color)
    } else if (type === "color2") {
      this.color2 = color
      this.rgb2 = this.hexToRgb(color)
    }
  }

  updateDarkBackground(enabled) {
    this.darkBackground = !!enabled
  }

  initWebGL() {
    if (!this.gl) return false
    const gl = this.gl

    const compileShader = (type, source) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Cinematic Bokeh Shader error:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vs = compileShader(gl.VERTEX_SHADER, this.vertexShaderSource)
    const fs = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource)
    if (!vs || !fs) return false

    this.program = gl.createProgram()
    gl.attachShader(this.program, vs)
    gl.attachShader(this.program, fs)
    gl.linkProgram(this.program)

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error("Cinematic Bokeh Link error:", gl.getProgramInfoLog(this.program))
      return false
    }

    this.aCornerLoc = gl.getAttribLocation(this.program, "a_corner")
    this.aDataLoc = gl.getAttribLocation(this.program, "a_data")
    this.aMotionLoc = gl.getAttribLocation(this.program, "a_motion")

    this.uResLoc = gl.getUniformLocation(this.program, "u_resolution")
    this.uTimeLoc = gl.getUniformLocation(this.program, "u_time")
    this.uMouseLoc = gl.getUniformLocation(this.program, "u_mouse")
    this.uColor1Loc = gl.getUniformLocation(this.program, "u_color1")
    this.uColor2Loc = gl.getUniformLocation(this.program, "u_color2")

    this.initBuffers()
    return true
  }

  initBuffers() {
    const gl = this.gl
    const N = this.numParticles
    const w = window.innerWidth || 1920
    const h = window.innerHeight || 1080

    // 10 floats per vertex: corner(2) + data(4) + motion(4)
    const vertexData = new Float32Array(N * 4 * 10)
    const indexData = new Uint16Array(N * 6)

    const corners = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]

    for (let i = 0; i < N; i++) {
      const z = Math.random() // 0 = closest (foreground), 1 = furthest (background)
      const depth = z * 0.85 + 0.15

      // Particle size based on depth
      let radius = 0
      if (z < 0.22) {
        // Foreground soft orbs
        radius = Math.random() * 80 + 90
      } else if (z < 0.7) {
        // Midground crisp bokeh rings
        radius = Math.random() * 45 + 35
      } else {
        // Background sparkling points
        radius = Math.random() * 20 + 12
      }

      const baseX = Math.random() * (w + 200) - 100
      const baseY = Math.random() * (h + 200) - 100
      const speedY = (Math.random() * 1.2 + 0.5) * (1.4 - depth * 0.6)
      const swaySpeed = Math.random() * 0.8 + 0.4
      const swayAmp = (Math.random() * 1.5 + 0.6) * (1.3 - depth * 0.4)
      const colorMix = Math.random()

      const vBase = i * 4 * 10
      for (let c = 0; c < 4; c++) {
        const idx = vBase + c * 10
        vertexData[idx + 0] = corners[c][0]
        vertexData[idx + 1] = corners[c][1]
        vertexData[idx + 2] = baseX
        vertexData[idx + 3] = baseY
        vertexData[idx + 4] = radius
        vertexData[idx + 5] = depth
        vertexData[idx + 6] = speedY
        vertexData[idx + 7] = swaySpeed
        vertexData[idx + 8] = swayAmp
        vertexData[idx + 9] = colorMix
      }

      const iBase = i * 6
      const vi = i * 4
      indexData[iBase + 0] = vi + 0
      indexData[iBase + 1] = vi + 1
      indexData[iBase + 2] = vi + 2
      indexData[iBase + 3] = vi + 0
      indexData[iBase + 4] = vi + 2
      indexData[iBase + 5] = vi + 3
    }

    this.vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW)

    this.indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW)
  }

  _handleResize() {
    if (!this.canvas) return
    const w = window.innerWidth
    const h = window.innerHeight

    // High performance DPR scaling
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    this.canvas.width = Math.floor(w * dpr)
    this.canvas.height = Math.floor(h * dpr)

    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  _handleMouseMove(e) {
    this.targetMouse.x = e.clientX / window.innerWidth
    this.targetMouse.y = e.clientY / window.innerHeight
  }

  _handleVisibility() {
    if (document.hidden) {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
        this.animationId = null
      }
    } else if (this.active && !this.animationId) {
      this.lastFrameTime = performance.now()
      this._renderLoop()
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"

    if (!this.program && !this.initWebGL()) return

    this._handleResize()
    window.addEventListener("resize", this._handleResize)
    window.addEventListener("mousemove", this._handleMouseMove, { passive: true })
    document.addEventListener("visibilitychange", this._handleVisibility)

    this.lastFrameTime = performance.now()
    this._renderLoop()
  }

  _renderLoop() {
    if (!this.active) return

    const now = performance.now()
    const dt = Math.min((now - (this.lastFrameTime || now)) * 0.001, 0.1)
    this.lastFrameTime = now
    this.time += dt

    // Smooth mouse lerp
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.08
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.08

    const gl = this.gl
    gl.useProgram(this.program)

    // Enable blending for luminous cinematic bokeh
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    if (this.darkBackground) {
      gl.clearColor(0.02, 0.02, 0.035, 1.0)
    } else {
      gl.clearColor(0.0, 0.0, 0.0, 0.0)
    }
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)

    const stride = 10 * 4 // 10 floats = 40 bytes
    gl.enableVertexAttribArray(this.aCornerLoc)
    gl.vertexAttribPointer(this.aCornerLoc, 2, gl.FLOAT, false, stride, 0)

    gl.enableVertexAttribArray(this.aDataLoc)
    gl.vertexAttribPointer(this.aDataLoc, 4, gl.FLOAT, false, stride, 2 * 4)

    gl.enableVertexAttribArray(this.aMotionLoc)
    gl.vertexAttribPointer(this.aMotionLoc, 4, gl.FLOAT, false, stride, 6 * 4)

    gl.uniform2f(this.uResLoc, window.innerWidth, window.innerHeight)
    gl.uniform1f(this.uTimeLoc, this.time)
    gl.uniform2f(this.uMouseLoc, this.mouse.x, this.mouse.y)
    gl.uniform3f(this.uColor1Loc, this.rgb1[0], this.rgb1[1], this.rgb1[2])
    gl.uniform3f(this.uColor2Loc, this.rgb2[0], this.rgb2[1], this.rgb2[2])

    gl.drawElements(gl.TRIANGLES, this.numParticles * 6, gl.UNSIGNED_SHORT, 0)

    this.animationId = requestAnimationFrame(() => this._renderLoop())
  }

  stop() {
    this.active = false
    this.canvas.style.display = "none"

    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    window.removeEventListener("resize", this._handleResize)
    window.removeEventListener("mousemove", this._handleMouseMove)
    document.removeEventListener("visibilitychange", this._handleVisibility)

    if (this.gl) {
      this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    }
  }

  destroy() {
    this.stop()
    if (this.gl) {
      if (this.program) {
        this.gl.deleteProgram(this.program)
        this.program = null
      }
      if (this.vertexBuffer) {
        this.gl.deleteBuffer(this.vertexBuffer)
        this.vertexBuffer = null
      }
      if (this.indexBuffer) {
        this.gl.deleteBuffer(this.indexBuffer)
        this.indexBuffer = null
      }
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }
  }
}

