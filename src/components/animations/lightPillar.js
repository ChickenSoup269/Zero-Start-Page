export class LightPillarEffect {
  constructor(canvasId, options = {}) {
    const origCanvas = document.getElementById(canvasId)
    this.canvasWrapper = origCanvas ? origCanvas.parentElement : document.body

    // Reuse existing canvas if provided in DOM to avoid creating duplicates
    if (origCanvas) {
      this.canvas = origCanvas
      this.canvas.classList.add("light-pillar-webgl-canvas")
      // Ensure base styles are applied
      this.canvas.style.position = this.canvas.style.position || "fixed"
      this.canvas.style.inset = this.canvas.style.inset || "0"
      this.canvas.style.zIndex = this.canvas.style.zIndex || "-3"
      this.canvas.style.pointerEvents =
        this.canvas.style.pointerEvents || "none"
      this.canvas.style.display = this.canvas.style.display || "none"
      this.canvas.style.mixBlendMode =
        this.canvas.style.mixBlendMode || "screen"
      this.canvas.style.width = "100%"
      this.canvas.style.height = "100%"
    } else {
      const existing = document.querySelector(".light-pillar-webgl-canvas")
      if (existing) existing.remove()

      this.canvas = document.createElement("canvas")
      this.canvas.className = "light-pillar-webgl-canvas"
      this.canvas.style.position = "fixed"
      this.canvas.style.inset = "0"
      this.canvas.style.zIndex = "-3"
      this.canvas.style.pointerEvents = "none"
      this.canvas.style.display = "none"
      this.canvas.style.mixBlendMode = "screen"
      this.canvas.style.width = "100%"
      this.canvas.style.height = "100%"
      this.canvasWrapper.appendChild(this.canvas)
    }

    this.gl =
      this.canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      }) ||
      this.canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
      }) ||
      this.canvas.getContext("experimental-webgl", {
        alpha: true,
        antialias: false,
      })

    if (!this.gl) {
      console.warn("WebGL not supported for Light Pillar")
      return
    }

    this.isWebGL2 = !!(
      this.gl instanceof (window.WebGL2RenderingContext || Object)
    )

    this.active = false
    this.topColor = options.topColor || "#5227FF"
    this.bottomColor = options.bottomColor || "#FF9FFC"
    this.intensity = options.intensity !== undefined ? options.intensity : 1.0
    this.rotationSpeed =
      options.rotationSpeed !== undefined ? options.rotationSpeed : 0.3
    this.glowAmount =
      options.glowAmount !== undefined ? options.glowAmount : 0.005
    this.pillarWidth =
      options.pillarWidth !== undefined ? options.pillarWidth : 3.0
    this.pillarHeight =
      options.pillarHeight !== undefined ? options.pillarHeight : 0.4
    this.noiseIntensity =
      options.noiseIntensity !== undefined ? options.noiseIntensity : 0.5
    this.pillarRotation =
      options.pillarRotation !== undefined ? options.pillarRotation : 0
    this.interactive = options.interactive || false
    this.quality = options.quality || "high"

    this.time = 0
    this.mouseX = 0
    this.mouseY = 0
    this.lastFrameTime = 0

    // Quality Settings
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      )
    let effectiveQuality = this.quality
    if (isMobile && this.quality !== "low") effectiveQuality = "low"

    this.qualitySettings = {
      low: {
        iterations: 12,
        waveIterations: 1,
        pixelRatio: 0.5,
        stepMultiplier: 2.0,
      },
      medium: {
        iterations: 24,
        waveIterations: 1,
        pixelRatio: 0.7,
        stepMultiplier: 1.6,
      },
      high: {
        iterations: 36,
        waveIterations: 2,
        pixelRatio: Math.min(window.devicePixelRatio, 1.1),
        stepMultiplier: 1.4,
      },
    }[effectiveQuality] || {
      iterations: 24,
      waveIterations: 1,
      pixelRatio: 0.7,
      stepMultiplier: 1.6,
    }

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._handleMouseMove(e)

    window.addEventListener("resize", this._resizeHandler)
    if (this.interactive) {
      document.addEventListener("mousemove", this._mouseMoveHandler)
    }

    this._initWebGL()
    this.resize()
  }

  _handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    this.mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  _hexToRgbForm(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return m
      ? [
          parseInt(m[1], 16) / 255,
          parseInt(m[2], 16) / 255,
          parseInt(m[3], 16) / 255,
        ]
      : [0.32, 0.15, 1.0]
  }

  _initWebGL() {
    if (!this.gl) return
    const gl = this.gl

    const vert = this.isWebGL2
      ? `#version 300 es
      in vec2 position;
      out vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `
      : `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `

    // Choose fragment shader precision
    let fragPrecision = "precision highp float;"
    try {
      const highp = gl.getShaderPrecisionFormat(
        gl.FRAGMENT_SHADER,
        gl.HIGH_FLOAT,
      )
      if (!highp || highp.precision === 0)
        fragPrecision = "precision mediump float;"
    } catch (e) {
      fragPrecision = "precision mediump float;"
    }

    const frag =
      (this.isWebGL2
        ? `#version 300 es
      ${fragPrecision}
      in vec2 vUv;
      out vec4 fragColor;
    `
        : `
      ${fragPrecision}
      varying vec2 vUv;
      #define fragColor gl_FragColor
      
      float tanh(float x) {
        float e2x = exp(2.0 * x);
        return (e2x - 1.0) / (e2x + 1.0);
      }
      vec3 tanh(vec3 x) {
        return vec3(tanh(x.x), tanh(x.y), tanh(x.z));
      }
    `) +
      `
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      uniform float uIntensity;
      uniform bool uInteractive;
      uniform float uGlowAmount;
      uniform float uPillarWidth;
      uniform float uPillarHeight;
      uniform float uNoiseIntensity;
      uniform float uRotCos;
      uniform float uRotSin;
      uniform float uPillarRotCos;
      uniform float uPillarRotSin;
      uniform float uWaveSin;
      uniform float uWaveCos;

      const float STEP_MULT = ${this.qualitySettings.stepMultiplier.toFixed(1)};
      const int MAX_ITER = ${this.qualitySettings.iterations};
      const int WAVE_ITER = ${this.qualitySettings.waveIterations};

      void main() {
        vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.x / uResolution.y, 1.0);
        uv = vec2(uPillarRotCos * uv.x - uPillarRotSin * uv.y, uPillarRotSin * uv.x + uPillarRotCos * uv.y);

        vec3 ro = vec3(0.0, 0.0, -10.0);
        vec3 rd = normalize(vec3(uv, 1.0));

        float rotC = uRotCos;
        float rotS = uRotSin;
        if(uInteractive && (uMouse.x != 0.0 || uMouse.y != 0.0)) {
          float a = uMouse.x * 6.283185;
          rotC = cos(a);
          rotS = sin(a);
        }

        vec3 col = vec3(0.0);
        float t = 0.1;
        
        for(int i = 0; i < MAX_ITER; i++) {
          vec3 p = ro + rd * t;
          p.xz = vec2(rotC * p.x - rotS * p.z, rotS * p.x + rotC * p.z);

          vec3 q = p;
          q.y = p.y * uPillarHeight + uTime;
          
          float freq = 1.0;
          float amp = 1.0;
          for(int j = 0; j < WAVE_ITER; j++) {
            q.xz = vec2(uWaveCos * q.x - uWaveSin * q.z, uWaveSin * q.x + uWaveCos * q.z);
            q += cos(q.zxy * freq - uTime * float(j) * 2.0) * amp;
            freq *= 2.0;
            amp *= 0.5;
          }
          
          float d = length(cos(q.xz)) - 0.2;
          float bound = length(p.xz) - uPillarWidth;
          float k = 4.0;
          float h = max(k - abs(d - bound), 0.0);
          d = max(d, bound) + h * h * 0.0625 / k;
          d = abs(d) * 0.15 + 0.01;

          float grad = clamp((15.0 - p.y) / 30.0, 0.0, 1.0);
          col += mix(uBottomColor, uTopColor, grad) / d;

          t += d * STEP_MULT;
          if(t > 50.0) break;
        }

        float widthNorm = uPillarWidth / 3.0;
        col = tanh(col * uGlowAmount / widthNorm);
        
        col -= fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) / 15.0 * uNoiseIntensity;
        
        fragColor = vec4(col * uIntensity, 1.0);
      }
    `

    console.log("LightPillarEffect: init WebGL", this.isWebGL2 ? "2.0" : "1.0")

    const vertShader = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vertShader, vert)
    gl.compileShader(vertShader)

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fragShader, frag)
    gl.compileShader(fragShader)

    const program = gl.createProgram()
    gl.attachShader(program, vertShader)
    gl.attachShader(program, fragShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Shader linking failed:", gl.getProgramInfoLog(program))
      console.error("Frag log:", gl.getShaderInfoLog(fragShader))
    }

    this.program = program
    gl.useProgram(program)

    const posBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    )

    const posLoc = gl.getAttribLocation(program, "position")
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    this.uniforms = {
      uTime: gl.getUniformLocation(program, "uTime"),
      uResolution: gl.getUniformLocation(program, "uResolution"),
      uMouse: gl.getUniformLocation(program, "uMouse"),
      uTopColor: gl.getUniformLocation(program, "uTopColor"),
      uBottomColor: gl.getUniformLocation(program, "uBottomColor"),
      uIntensity: gl.getUniformLocation(program, "uIntensity"),
      uInteractive: gl.getUniformLocation(program, "uInteractive"),
      uGlowAmount: gl.getUniformLocation(program, "uGlowAmount"),
      uPillarWidth: gl.getUniformLocation(program, "uPillarWidth"),
      uPillarHeight: gl.getUniformLocation(program, "uPillarHeight"),
      uNoiseIntensity: gl.getUniformLocation(program, "uNoiseIntensity"),
      uRotCos: gl.getUniformLocation(program, "uRotCos"),
      uRotSin: gl.getUniformLocation(program, "uRotSin"),
      uPillarRotCos: gl.getUniformLocation(program, "uPillarRotCos"),
      uPillarRotSin: gl.getUniformLocation(program, "uPillarRotSin"),
      uWaveSin: gl.getUniformLocation(program, "uWaveSin"),
      uWaveCos: gl.getUniformLocation(program, "uWaveCos"),
    }

    gl.clearColor(0, 0, 0, 0)
    this._updateUniforms()
  }

  _updateUniforms() {
    if (!this.gl || !this.uniforms) return
    const gl = this.gl

    const topRgb = this._hexToRgbForm(this.topColor)
    const bottomRgb = this._hexToRgbForm(this.bottomColor)
    const pillarRotRad = (this.pillarRotation * Math.PI) / 180

    gl.uniform1f(this.uniforms.uIntensity, this.intensity)
    gl.uniform1f(this.uniforms.uGlowAmount, this.glowAmount)
    gl.uniform1f(this.uniforms.uPillarWidth, this.pillarWidth)
    gl.uniform1f(this.uniforms.uPillarHeight, this.pillarHeight)
    gl.uniform1f(this.uniforms.uNoiseIntensity, this.noiseIntensity)
    gl.uniform1f(this.uniforms.uPillarRotCos, Math.cos(pillarRotRad))
    gl.uniform1f(this.uniforms.uPillarRotSin, Math.sin(pillarRotRad))
    gl.uniform1i(this.uniforms.uInteractive, this.interactive ? 1 : 0)
    gl.uniform3f(this.uniforms.uTopColor, topRgb[0], topRgb[1], topRgb[2])
    gl.uniform3f(
      this.uniforms.uBottomColor,
      bottomRgb[0],
      bottomRgb[1],
      bottomRgb[2],
    )
    gl.uniform1f(this.uniforms.uWaveSin, Math.sin(0.4))
    gl.uniform1f(this.uniforms.uWaveCos, Math.cos(0.4))
  }

  resize() {
    if (!this.canvas || !this.gl) return
    const dpr = this.qualitySettings.pixelRatio
    this.canvas.width = window.innerWidth * dpr
    this.canvas.height = window.innerHeight * dpr
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    if (this.uniforms) {
      this.gl.uniform2f(
        this.uniforms.uResolution,
        this.canvas.width,
        this.canvas.height,
      )
    }
  }

  setOptions(options) {
    if (options.topColor !== undefined) this.topColor = options.topColor
    if (options.bottomColor !== undefined)
      this.bottomColor = options.bottomColor
    if (options.intensity !== undefined) this.intensity = options.intensity
    if (options.rotationSpeed !== undefined)
      this.rotationSpeed = options.rotationSpeed
    if (options.glowAmount !== undefined) this.glowAmount = options.glowAmount
    if (options.pillarWidth !== undefined)
      this.pillarWidth = options.pillarWidth
    if (options.pillarHeight !== undefined)
      this.pillarHeight = options.pillarHeight
    if (options.noiseIntensity !== undefined)
      this.noiseIntensity = options.noiseIntensity
    if (options.pillarRotation !== undefined)
      this.pillarRotation = options.pillarRotation
    this._updateUniforms()
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this.lastFrameTime = performance.now()
    this._animate()
  }

  stop() {
    this.active = false
    this.canvas.style.display = "none"
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
  }

  _animate = (currentTime) => {
    if (!this.active || !this.gl || !this.uniforms) return

    const now = currentTime || performance.now()
    const deltaTime = (now - this.lastFrameTime) / 1000
    this.lastFrameTime = now

    this.time += deltaTime * this.rotationSpeed
    const t = this.time

    this.gl.uniform1f(this.uniforms.uTime, t)
    this.gl.uniform1f(this.uniforms.uRotCos, Math.cos(t * 0.3))
    this.gl.uniform1f(this.uniforms.uRotSin, Math.sin(t * 0.3))
    this.gl.uniform2f(this.uniforms.uMouse, this.mouseX, this.mouseY)

    this.gl.useProgram(this.program)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)

    this._animId = requestAnimationFrame(this._animate)
  }

  dispose() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    if (this.interactive) {
      document.removeEventListener("mousemove", this._mouseMoveHandler)
    }
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program)
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }
  }
}
