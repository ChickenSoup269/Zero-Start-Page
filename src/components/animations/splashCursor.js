const DEFAULT_OPTIONS = {
  simResolution: 128,
  dyeResolution: 512,
  captureResolution: 512,
  densityDissipation: 3.5,
  velocityDissipation: 2,
  pressure: 0.1,
  pressureIterations: 20,
  curl: 3,
  splatRadius: 0.2,
  splatForce: 6000,
  shading: true,
  colorUpdateSpeed: 10,
  backColor: { r: 0.5, g: 0, b: 0 },
  transparent: true,
  rainbowMode: true,
  color: "#ff0000",
}

function pointerPrototype() {
  this.id = -1
  this.texcoordX = 0
  this.texcoordY = 0
  this.prevTexcoordX = 0
  this.prevTexcoordY = 0
  this.deltaX = 0
  this.deltaY = 0
  this.down = false
  this.moved = false
  this.color = [0, 0, 0]
}

function hashCode(s) {
  if (s.length === 0) return 0
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i)
    hash |= 0
  }
  return hash
}

function wrap(value, min, max) {
  const range = max - min
  if (range === 0) return min
  return ((value - min) % range) + min
}

function HSVtoRGB(h, s, v) {
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  switch (i % 6) {
    case 0:
      return { r: v, g: t, b: p }
    case 1:
      return { r: q, g: v, b: p }
    case 2:
      return { r: p, g: v, b: t }
    case 3:
      return { r: p, g: q, b: v }
    case 4:
      return { r: t, g: p, b: v }
    case 5:
      return { r: v, g: p, b: q }
    default:
      return { r: 0, g: 0, b: 0 }
  }
}

export class SplashCursor {
  constructor(canvasOrId, options = {}) {
    this.canvas =
      typeof canvasOrId === "string"
        ? document.getElementById(canvasOrId)
        : canvasOrId
    this.active = false
    this.animationId = null
    this.isActive = false
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this._sim = null
    this._handlers = null
    this._webglFailed = false
    this._pendingDyeReinit = false
    this._handleResize = null
  }

  setOptions(partial) {
    const prevDye = this.options.dyeResolution
    Object.assign(this.options, partial)
    if (this._sim?.config) {
      Object.assign(this._sim.config, this._buildConfig())
      if (this._sim.updateKeywords) this._sim.updateKeywords()
      if (
        partial.dyeResolution != null &&
        partial.dyeResolution !== prevDye &&
        this.active
      ) {
        this._pendingDyeReinit = true
      }
    }
  }

  _fitCanvas() {
    if (!this.canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    const width = Math.max(1, Math.floor(w * dpr))
    const height = Math.max(1, Math.floor(h * dpr))
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
      return true
    }
    return false
  }

  _buildConfig() {
    const o = this.options
    return {
      SIM_RESOLUTION: o.simResolution,
      DYE_RESOLUTION: o.dyeResolution,
      CAPTURE_RESOLUTION: o.captureResolution,
      DENSITY_DISSIPATION: o.densityDissipation,
      VELOCITY_DISSIPATION: o.velocityDissipation,
      PRESSURE: o.pressure,
      PRESSURE_ITERATIONS: o.pressureIterations,
      CURL: o.curl,
      SPLAT_RADIUS: o.splatRadius,
      SPLAT_FORCE: o.splatForce,
      SHADING: o.shading,
      COLOR_UPDATE_SPEED: o.colorUpdateSpeed,
      PAUSED: false,
      BACK_COLOR: o.backColor,
      TRANSPARENT: o.transparent,
      RAINBOW_MODE: o.rainbowMode,
      COLOR: o.color,
    }
  }

  start() {
    if (this.active || !this.canvas || this._webglFailed) return
    this.active = true
    this.isActive = true
    this.canvas.style.display = "block"
    this._fitCanvas()

    if (!this._sim) {
      this._initSimulation()
    }
    if (!this._sim) {
      this.active = false
      this.isActive = false
      this.canvas.style.display = "none"
      return
    }

    this._sim.lastUpdateTime = Date.now()
    this._sim.resizeCanvas()
    this._sim.initFramebuffers()
    this._sim.seedSplats()
    this._sim.updateFrame()

    if (!this._handleResize) {
      this._handleResize = () => {
        if (!this.active || !this._sim) return
        if (this._sim.resizeCanvas()) this._sim.initFramebuffers()
      }
      window.addEventListener("resize", this._handleResize)
    }
  }

  stop() {
    if (!this.active) return
    this.active = false
    this.isActive = false
    this.canvas.style.display = "none"

    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    if (this._handleResize) {
      window.removeEventListener("resize", this._handleResize)
      this._handleResize = null
    }

    if (this._handlers) {
      const h = this._handlers
      window.removeEventListener("mousedown", h.handleMouseDown)
      window.removeEventListener("mousemove", h.handleMouseMove)
      window.removeEventListener("touchstart", h.handleTouchStart)
      window.removeEventListener("touchmove", h.handleTouchMove)
      window.removeEventListener("touchend", h.handleTouchEnd)
      this._handlers = null
    }

    this._sim = null
  }

  restart() {
    const opts = { ...this.options }
    this.stop()
    this._webglFailed = false
    this.options = opts
    this.start()
  }

  _initSimulation() {
    const canvas = this.canvas
    const self = this
    let config = this._buildConfig()
    const pointers = [new pointerPrototype()]

    const { gl, ext } = getWebGLContext(canvas)
    if (!gl || !ext.formatRGBA || !ext.formatRG || !ext.formatR) {
      console.warn("[SplashCursor] WebGL float textures not supported")
      this._webglFailed = true
      return
    }
    if (!ext.supportLinearFiltering) {
      config.DYE_RESOLUTION = Math.min(config.DYE_RESOLUTION, 256)
      config.SHADING = false
    }

    function getWebGLContext(targetCanvas) {
      const params = {
        alpha: true,
        depth: false,
        stencil: false,
        antialias: false,
        preserveDrawingBuffer: false,
      }
      let context = targetCanvas.getContext("webgl2", params)
      const isWebGL2 = !!context
      if (!isWebGL2) {
        context =
          targetCanvas.getContext("webgl", params) ||
          targetCanvas.getContext("experimental-webgl", params)
      }

      let halfFloat
      let supportLinearFiltering
      if (isWebGL2) {
        context.getExtension("EXT_color_buffer_float")
        supportLinearFiltering = context.getExtension("OES_texture_float_linear")
      } else {
        halfFloat = context.getExtension("OES_texture_half_float")
        supportLinearFiltering = context.getExtension(
          "OES_texture_half_float_linear",
        )
      }
      context.clearColor(0.0, 0.0, 0.0, 1.0)

      const halfFloatTexType = isWebGL2
        ? context.HALF_FLOAT
        : halfFloat && halfFloat.HALF_FLOAT_OES
      let formatRGBA
      let formatRG
      let formatR

      if (isWebGL2) {
        formatRGBA = getSupportedFormat(
          context,
          context.RGBA16F,
          context.RGBA,
          halfFloatTexType,
        )
        formatRG = getSupportedFormat(
          context,
          context.RG16F,
          context.RG,
          halfFloatTexType,
        )
        formatR = getSupportedFormat(
          context,
          context.R16F,
          context.RED,
          halfFloatTexType,
        )
      } else {
        formatRGBA = getSupportedFormat(
          context,
          context.RGBA,
          context.RGBA,
          halfFloatTexType,
        )
        formatRG = getSupportedFormat(
          context,
          context.RGBA,
          context.RGBA,
          halfFloatTexType,
        )
        formatR = getSupportedFormat(
          context,
          context.RGBA,
          context.RGBA,
          halfFloatTexType,
        )
      }

      return {
        gl: context,
        ext: {
          formatRGBA,
          formatRG,
          formatR,
          halfFloatTexType,
          supportLinearFiltering,
        },
      }
    }

    function getSupportedFormat(
      context,
      internalFormat,
      format,
      type,
    ) {
      if (!supportRenderTextureFormat(context, internalFormat, format, type)) {
        switch (internalFormat) {
          case context.R16F:
            return getSupportedFormat(context, context.RG16F, context.RG, type)
          case context.RG16F:
            return getSupportedFormat(
              context,
              context.RGBA16F,
              context.RGBA,
              type,
            )
          default:
            return null
        }
      }
      return { internalFormat, format }
    }

    function supportRenderTextureFormat(
      context,
      internalFormat,
      format,
      type,
    ) {
      const texture = context.createTexture()
      context.bindTexture(context.TEXTURE_2D, texture)
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_MIN_FILTER,
        context.NEAREST,
      )
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_MAG_FILTER,
        context.NEAREST,
      )
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_WRAP_S,
        context.CLAMP_TO_EDGE,
      )
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_WRAP_T,
        context.CLAMP_TO_EDGE,
      )
      context.texImage2D(
        context.TEXTURE_2D,
        0,
        internalFormat,
        4,
        4,
        0,
        format,
        type,
        null,
      )
      const fbo = context.createFramebuffer()
      context.bindFramebuffer(context.FRAMEBUFFER, fbo)
      context.framebufferTexture2D(
        context.FRAMEBUFFER,
        context.COLOR_ATTACHMENT0,
        context.TEXTURE_2D,
        texture,
        0,
      )
      const status = context.checkFramebufferStatus(context.FRAMEBUFFER)
      return status === context.FRAMEBUFFER_COMPLETE
    }

    class Material {
      constructor(vertexShader, fragmentShaderSource) {
        this.vertexShader = vertexShader
        this.fragmentShaderSource = fragmentShaderSource
        this.programs = []
        this.activeProgram = null
        this.uniforms = []
      }
      setKeywords(keywords) {
        let hash = 0
        for (let i = 0; i < keywords.length; i++)
          hash += hashCode(keywords[i])
        let program = this.programs[hash]
        if (program == null) {
          const fragmentShader = compileShader(
            gl.FRAGMENT_SHADER,
            this.fragmentShaderSource,
            keywords,
          )
          program = createProgram(this.vertexShader, fragmentShader)
          this.programs[hash] = program
        }
        if (program === this.activeProgram) return
        this.uniforms = getUniforms(program)
        this.activeProgram = program
      }
      bind() {
        gl.useProgram(this.activeProgram)
      }
    }

    class Program {
      constructor(vertexShader, fragmentShader) {
        this.uniforms = {}
        this.program = createProgram(vertexShader, fragmentShader)
        this.uniforms = getUniforms(this.program)
      }
      bind() {
        gl.useProgram(this.program)
      }
    }

    function createProgram(vertexShader, fragmentShader) {
      const program = gl.createProgram()
      gl.attachShader(program, vertexShader)
      gl.attachShader(program, fragmentShader)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.trace(gl.getProgramInfoLog(program))
      }
      return program
    }

    function getUniforms(program) {
      const uniforms = []
      const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
      for (let i = 0; i < uniformCount; i++) {
        const uniformName = gl.getActiveUniform(program, i).name
        uniforms[uniformName] = gl.getUniformLocation(program, uniformName)
      }
      return uniforms
    }

    function compileShader(type, source, keywords) {
      source = addKeywords(source, keywords)
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.trace(gl.getShaderInfoLog(shader))
      }
      return shader
    }

    function addKeywords(source, keywords) {
      if (!keywords) return source
      let keywordsString = ""
      keywords.forEach((keyword) => {
        keywordsString += "#define " + keyword + "\n"
      })
      return keywordsString + source
    }

    const baseVertexShader = compileShader(
      gl.VERTEX_SHADER,
      `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;

        void main () {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `,
    )

    const copyShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;

        void main () {
            gl_FragColor = texture2D(uTexture, vUv);
        }
      `,
    )

    const clearShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;

        void main () {
            gl_FragColor = value * texture2D(uTexture, vUv);
        }
      `,
    )

    const displayShaderSource = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uTexture;
      uniform sampler2D uDithering;
      uniform vec2 ditherScale;
      uniform vec2 texelSize;

      vec3 linearToGamma (vec3 color) {
          color = max(color, vec3(0));
          return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
      }

      void main () {
          vec3 c = texture2D(uTexture, vUv).rgb;
          #ifdef SHADING
              vec3 lc = texture2D(uTexture, vL).rgb;
              vec3 rc = texture2D(uTexture, vR).rgb;
              vec3 tc = texture2D(uTexture, vT).rgb;
              vec3 bc = texture2D(uTexture, vB).rgb;

              float dx = length(rc) - length(lc);
              float dy = length(tc) - length(bc);

              vec3 n = normalize(vec3(dx, dy, length(texelSize)));
              vec3 l = vec3(0.0, 0.0, 1.0);

              float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
              c *= diffuse;
          #endif

          float a = max(c.r, max(c.g, c.b));
          gl_FragColor = vec4(c, a);
      }
    `

    const splatShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio;
        uniform vec3 color;
        uniform vec2 point;
        uniform float radius;

        void main () {
            vec2 p = vUv - point.xy;
            p.x *= aspectRatio;
            vec3 splat = exp(-dot(p, p) / radius) * color;
            vec3 base = texture2D(uTarget, vUv).xyz;
            gl_FragColor = vec4(base + splat, 1.0);
        }
      `,
    )

    const advectionShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform vec2 dyeTexelSize;
        uniform float dt;
        uniform float dissipation;

        vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
            vec2 st = uv / tsize - 0.5;
            vec2 iuv = floor(st);
            vec2 fuv = fract(st);

            vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
            vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
            vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
            vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

            return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
        }

        void main () {
            #ifdef MANUAL_FILTERING
                vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
                vec4 result = bilerp(uSource, coord, dyeTexelSize);
            #else
                vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
                vec4 result = texture2D(uSource, coord);
            #endif
            float decay = 1.0 + dissipation * dt;
            gl_FragColor = result / decay;
        }
      `,
      ext.supportLinearFiltering ? null : ["MANUAL_FILTERING"],
    )

    const divergenceShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;

        void main () {
            float L = texture2D(uVelocity, vL).x;
            float R = texture2D(uVelocity, vR).x;
            float T = texture2D(uVelocity, vT).y;
            float B = texture2D(uVelocity, vB).y;

            vec2 C = texture2D(uVelocity, vUv).xy;
            if (vL.x < 0.0) { L = -C.x; }
            if (vR.x > 1.0) { R = -C.x; }
            if (vT.y > 1.0) { T = -C.y; }
            if (vB.y < 0.0) { B = -C.y; }

            float div = 0.5 * (R - L + T - B);
            gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
      `,
    )

    const curlShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;

        void main () {
            float L = texture2D(uVelocity, vL).y;
            float R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x;
            float B = texture2D(uVelocity, vB).x;
            float vorticity = R - L - T + B;
            gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
        }
      `,
    )

    const vorticityShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;

        void main () {
            float L = texture2D(uCurl, vL).x;
            float R = texture2D(uCurl, vR).x;
            float T = texture2D(uCurl, vT).x;
            float B = texture2D(uCurl, vB).x;
            float C = texture2D(uCurl, vUv).x;

            vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
            force /= length(force) + 0.0001;
            force *= curl * C;
            force.y *= -1.0;

            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity += force * dt;
            velocity = min(max(velocity, -1000.0), 1000.0);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
      `,
    )

    const pressureShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;

        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            float C = texture2D(uPressure, vUv).x;
            float divergence = texture2D(uDivergence, vUv).x;
            float pressure = (L + R + B + T - divergence) * 0.25;
            gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
      `,
    )

    const gradientSubtractShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;

        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity.xy -= vec2(R - L, T - B);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
      `,
    )

    const blit = (() => {
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
        gl.STATIC_DRAW,
      )
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array([0, 1, 2, 0, 2, 3]),
        gl.STATIC_DRAW,
      )
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(0)
      return (target, clear = false) => {
        if (target == null) {
          gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
          gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        } else {
          gl.viewport(0, 0, target.width, target.height)
          gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
        }
        if (clear) {
          gl.clearColor(0.0, 0.0, 0.0, 1.0)
          gl.clear(gl.COLOR_BUFFER_BIT)
        }
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
      }
    })()

    let dye
    let velocity
    let divergence
    let curl
    let pressure

    const copyProgram = new Program(baseVertexShader, copyShader)
    const clearProgram = new Program(baseVertexShader, clearShader)
    const splatProgram = new Program(baseVertexShader, splatShader)
    const advectionProgram = new Program(baseVertexShader, advectionShader)
    const divergenceProgram = new Program(baseVertexShader, divergenceShader)
    const curlProgram = new Program(baseVertexShader, curlShader)
    const vorticityProgram = new Program(baseVertexShader, vorticityShader)
    const pressureProgram = new Program(baseVertexShader, pressureShader)
    const gradienSubtractProgram = new Program(
      baseVertexShader,
      gradientSubtractShader,
    )
    const displayMaterial = new Material(baseVertexShader, displayShaderSource)

    function createFBO(w, h, internalFormat, format, type, param) {
      gl.activeTexture(gl.TEXTURE0)
      const texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        internalFormat,
        w,
        h,
        0,
        format,
        type,
        null,
      )

      const fbo = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0,
      )
      gl.viewport(0, 0, w, h)
      gl.clear(gl.COLOR_BUFFER_BIT)

      const texelSizeX = 1.0 / w
      const texelSizeY = 1.0 / h
      return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX,
        texelSizeY,
        attach(id) {
          gl.activeTexture(gl.TEXTURE0 + id)
          gl.bindTexture(gl.TEXTURE_2D, texture)
          return id
        },
      }
    }

    function createDoubleFBO(w, h, internalFormat, format, type, param) {
      let fbo1 = createFBO(w, h, internalFormat, format, type, param)
      let fbo2 = createFBO(w, h, internalFormat, format, type, param)
      return {
        width: w,
        height: h,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        get read() {
          return fbo1
        },
        set read(value) {
          fbo1 = value
        },
        get write() {
          return fbo2
        },
        set write(value) {
          fbo2 = value
        },
        swap() {
          const temp = fbo1
          fbo1 = fbo2
          fbo2 = temp
        },
      }
    }

    function resizeFBO(target, w, h, internalFormat, format, type, param) {
      const newFBO = createFBO(w, h, internalFormat, format, type, param)
      copyProgram.bind()
      gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0))
      blit(newFBO)
      return newFBO
    }

    function resizeDoubleFBO(
      target,
      w,
      h,
      internalFormat,
      format,
      type,
      param,
    ) {
      if (target.width === w && target.height === h) return target
      target.read = resizeFBO(
        target.read,
        w,
        h,
        internalFormat,
        format,
        type,
        param,
      )
      target.write = createFBO(w, h, internalFormat, format, type, param)
      target.width = w
      target.height = h
      target.texelSizeX = 1.0 / w
      target.texelSizeY = 1.0 / h
      return target
    }

    function initFramebuffers() {
      const simRes = getResolution(config.SIM_RESOLUTION)
      const dyeRes = getResolution(config.DYE_RESOLUTION)
      const texType = ext.halfFloatTexType
      const rgba = ext.formatRGBA
      const rg = ext.formatRG
      const r = ext.formatR
      const filtering = ext.supportLinearFiltering
        ? gl.LINEAR
        : gl.NEAREST
      gl.disable(gl.BLEND)

      if (!dye) {
        dye = createDoubleFBO(
          dyeRes.width,
          dyeRes.height,
          rgba.internalFormat,
          rgba.format,
          texType,
          filtering,
        )
      } else {
        dye = resizeDoubleFBO(
          dye,
          dyeRes.width,
          dyeRes.height,
          rgba.internalFormat,
          rgba.format,
          texType,
          filtering,
        )
      }

      if (!velocity) {
        velocity = createDoubleFBO(
          simRes.width,
          simRes.height,
          rg.internalFormat,
          rg.format,
          texType,
          filtering,
        )
      } else {
        velocity = resizeDoubleFBO(
          velocity,
          simRes.width,
          simRes.height,
          rg.internalFormat,
          rg.format,
          texType,
          filtering,
        )
      }

      divergence = createFBO(
        simRes.width,
        simRes.height,
        r.internalFormat,
        r.format,
        texType,
        gl.NEAREST,
      )
      curl = createFBO(
        simRes.width,
        simRes.height,
        r.internalFormat,
        r.format,
        texType,
        gl.NEAREST,
      )
      pressure = createDoubleFBO(
        simRes.width,
        simRes.height,
        r.internalFormat,
        r.format,
        texType,
        gl.NEAREST,
      )
    }

    function updateKeywords() {
      const displayKeywords = []
      if (config.SHADING) displayKeywords.push("SHADING")
      displayMaterial.setKeywords(displayKeywords)
    }

    updateKeywords()
    let lastUpdateTime = Date.now()
    let colorUpdateTimer = 0.0

    function scaleByPixelRatio(input) {
      const pixelRatio = window.devicePixelRatio || 1
      return Math.floor(input * pixelRatio)
    }

    function getResolution(resolution) {
      const bufW = Math.max(1, gl.drawingBufferWidth)
      const bufH = Math.max(1, gl.drawingBufferHeight)
      let aspectRatio = bufW / bufH
      if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio
      const min = Math.round(resolution)
      const max = Math.round(resolution * aspectRatio)
      if (bufW > bufH) {
        return { width: max, height: min }
      }
      return { width: min, height: max }
    }

    function seedSplats() {
      for (let i = 0; i < 8; i++) {
        const color = generateColor()
        color.r *= 8
        color.g *= 8
        color.b *= 8
        splat(
          Math.random(),
          Math.random(),
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 80,
          color,
        )
      }
    }

    function hexToRGB(hex) {
      let val = hex.replace("#", "")
      if (val.length === 3) {
        val = val[0] + val[0] + val[1] + val[1] + val[2] + val[2]
      }
      const r = parseInt(val.slice(0, 2), 16) / 255
      const g = parseInt(val.slice(2, 4), 16) / 255
      const b = parseInt(val.slice(4, 6), 16) / 255
      return { r: r * 0.15, g: g * 0.15, b: b * 0.15 }
    }

    function generateColor() {
      if (!config.RAINBOW_MODE) {
        return hexToRGB(config.COLOR)
      }
      const c = HSVtoRGB(Math.random(), 1.0, 1.0)
      c.r *= 0.15
      c.g *= 0.15
      c.b *= 0.15
      return c
    }

    function correctRadius(radius) {
      let aspectRatio = canvas.width / canvas.height
      if (aspectRatio > 1) radius *= aspectRatio
      return radius
    }

    function correctDeltaX(delta) {
      let aspectRatio = canvas.width / canvas.height
      if (aspectRatio < 1) delta *= aspectRatio
      return delta
    }

    function correctDeltaY(delta) {
      let aspectRatio = canvas.width / canvas.height
      if (aspectRatio > 1) delta /= aspectRatio
      return delta
    }

    function splat(x, y, dx, dy, color) {
      if (!velocity || !dye) return
      splatProgram.bind()
      gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0))
      gl.uniform1f(
        splatProgram.uniforms.aspectRatio,
        canvas.width / canvas.height,
      )
      gl.uniform2f(splatProgram.uniforms.point, x, y)
      gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0)
      gl.uniform1f(
        splatProgram.uniforms.radius,
        correctRadius(config.SPLAT_RADIUS / 100.0),
      )
      blit(velocity.write)
      velocity.swap()

      gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0))
      gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b)
      blit(dye.write)
      dye.swap()
    }

    function splatPointer(pointer) {
      const dx = pointer.deltaX * config.SPLAT_FORCE
      const dy = pointer.deltaY * config.SPLAT_FORCE
      splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color)
    }

    function clickSplat(pointer) {
      const color = generateColor()
      color.r *= 10.0
      color.g *= 10.0
      color.b *= 10.0
      const dx = 10 * (Math.random() - 0.5)
      const dy = 30 * (Math.random() - 0.5)
      splat(pointer.texcoordX, pointer.texcoordY, dx, dy, color)
    }

    function updatePointerDownData(pointer, id, posX, posY) {
      pointer.id = id
      pointer.down = true
      pointer.moved = false
      pointer.texcoordX = posX / canvas.width
      pointer.texcoordY = 1.0 - posY / canvas.height
      pointer.prevTexcoordX = pointer.texcoordX
      pointer.prevTexcoordY = pointer.texcoordY
      pointer.deltaX = 0
      pointer.deltaY = 0
      pointer.color = generateColor()
    }

    function updatePointerMoveData(pointer, posX, posY, color) {
      pointer.prevTexcoordX = pointer.texcoordX
      pointer.prevTexcoordY = pointer.texcoordY
      pointer.texcoordX = posX / canvas.width
      pointer.texcoordY = 1.0 - posY / canvas.height
      pointer.deltaX = correctDeltaX(
        pointer.texcoordX - pointer.prevTexcoordX,
      )
      pointer.deltaY = correctDeltaY(
        pointer.texcoordY - pointer.prevTexcoordY,
      )
      pointer.moved =
        Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0
      pointer.color = color
    }

    function updatePointerUpData(pointer) {
      pointer.down = false
    }

    function calcDeltaTime() {
      const now = Date.now()
      let dt = (now - lastUpdateTime) / 1000
      dt = Math.min(dt, 0.016666)
      lastUpdateTime = now
      return dt
    }

    function resizeCanvas() {
      const cssW = canvas.clientWidth || window.innerWidth
      const cssH = canvas.clientHeight || window.innerHeight
      const width = Math.max(1, scaleByPixelRatio(cssW))
      const height = Math.max(1, scaleByPixelRatio(cssH))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
        return true
      }
      return false
    }

    function updateColors(dt) {
      colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED
      if (colorUpdateTimer >= 1) {
        colorUpdateTimer = wrap(colorUpdateTimer, 0, 1)
        pointers.forEach((p) => {
          p.color = generateColor()
        })
      }
    }

    function applyInputs() {
      pointers.forEach((p) => {
        if (p.moved) {
          p.moved = false
          splatPointer(p)
        }
      })
    }

    function step(dt) {
      gl.disable(gl.BLEND)
      curlProgram.bind()
      gl.uniform2f(
        curlProgram.uniforms.texelSize,
        velocity.texelSizeX,
        velocity.texelSizeY,
      )
      gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0))
      blit(curl)

      vorticityProgram.bind()
      gl.uniform2f(
        vorticityProgram.uniforms.texelSize,
        velocity.texelSizeX,
        velocity.texelSizeY,
      )
      gl.uniform1i(
        vorticityProgram.uniforms.uVelocity,
        velocity.read.attach(0),
      )
      gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1))
      gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL)
      gl.uniform1f(vorticityProgram.uniforms.dt, dt)
      blit(velocity.write)
      velocity.swap()

      divergenceProgram.bind()
      gl.uniform2f(
        divergenceProgram.uniforms.texelSize,
        velocity.texelSizeX,
        velocity.texelSizeY,
      )
      gl.uniform1i(
        divergenceProgram.uniforms.uVelocity,
        velocity.read.attach(0),
      )
      blit(divergence)

      clearProgram.bind()
      gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0))
      gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE)
      blit(pressure.write)
      pressure.swap()

      pressureProgram.bind()
      gl.uniform2f(
        pressureProgram.uniforms.texelSize,
        velocity.texelSizeX,
        velocity.texelSizeY,
      )
      gl.uniform1i(
        pressureProgram.uniforms.uDivergence,
        divergence.attach(0),
      )
      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(
          pressureProgram.uniforms.uPressure,
          pressure.read.attach(1),
        )
        blit(pressure.write)
        pressure.swap()
      }

      gradienSubtractProgram.bind()
      gl.uniform2f(
        gradienSubtractProgram.uniforms.texelSize,
        velocity.texelSizeX,
        velocity.texelSizeY,
      )
      gl.uniform1i(
        gradienSubtractProgram.uniforms.uPressure,
        pressure.read.attach(0),
      )
      gl.uniform1i(
        gradienSubtractProgram.uniforms.uVelocity,
        velocity.read.attach(1),
      )
      blit(velocity.write)
      velocity.swap()

      advectionProgram.bind()
      gl.uniform2f(
        advectionProgram.uniforms.texelSize,
        velocity.texelSizeX,
        velocity.texelSizeY,
      )
      if (!ext.supportLinearFiltering) {
        gl.uniform2f(
          advectionProgram.uniforms.dyeTexelSize,
          velocity.texelSizeX,
          velocity.texelSizeY,
        )
      }
      const velocityId = velocity.read.attach(0)
      gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId)
      gl.uniform1i(advectionProgram.uniforms.uSource, velocityId)
      gl.uniform1f(advectionProgram.uniforms.dt, dt)
      gl.uniform1f(
        advectionProgram.uniforms.dissipation,
        config.VELOCITY_DISSIPATION,
      )
      blit(velocity.write)
      velocity.swap()

      if (!ext.supportLinearFiltering) {
        gl.uniform2f(
          advectionProgram.uniforms.dyeTexelSize,
          dye.texelSizeX,
          dye.texelSizeY,
        )
      }
      gl.uniform1i(
        advectionProgram.uniforms.uVelocity,
        velocity.read.attach(0),
      )
      gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1))
      gl.uniform1f(
        advectionProgram.uniforms.dissipation,
        config.DENSITY_DISSIPATION,
      )
      blit(dye.write)
      dye.swap()
    }

    function drawDisplay(target) {
      const width =
        target == null ? gl.drawingBufferWidth : target.width
      const height =
        target == null ? gl.drawingBufferHeight : target.height
      displayMaterial.bind()
      if (config.SHADING) {
        gl.uniform2f(
          displayMaterial.uniforms.texelSize,
          1.0 / width,
          1.0 / height,
        )
      }
      gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0))
      blit(target)
    }

    function render(target) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.enable(gl.BLEND)
      drawDisplay(target)
    }

    function updateFrame() {
      if (!self.isActive) return
      const dt = calcDeltaTime()
      if (self._pendingDyeReinit) {
        self._pendingDyeReinit = false
        initFramebuffers()
      } else if (resizeCanvas()) {
        initFramebuffers()
      }
      updateColors(dt)
      applyInputs()
      step(dt)
      render(null)
      self.animationId = requestAnimationFrame(updateFrame)
    }

    let firstMouseMoveHandled = false

    function getCanvasRelativePos(clientX, clientY) {
      const rect = canvas.getBoundingClientRect()
      return {
        x: scaleByPixelRatio(clientX - rect.left),
        y: scaleByPixelRatio(clientY - rect.top),
      }
    }

    function handleMouseDown(e) {
      const pointer = pointers[0]
      const { x: posX, y: posY } = getCanvasRelativePos(e.clientX, e.clientY)
      updatePointerDownData(pointer, -1, posX, posY)
      clickSplat(pointer)
    }

    function handleMouseMove(e) {
      const pointer = pointers[0]
      const { x: posX, y: posY } = getCanvasRelativePos(e.clientX, e.clientY)
      if (!firstMouseMoveHandled) {
        const color = generateColor()
        updatePointerMoveData(pointer, posX, posY, color)
        firstMouseMoveHandled = true
      } else {
        updatePointerMoveData(pointer, posX, posY, pointer.color)
      }
    }

    function handleTouchStart(e) {
      const touches = e.targetTouches
      const pointer = pointers[0]
      for (let i = 0; i < touches.length; i++) {
        const { x: posX, y: posY } = getCanvasRelativePos(touches[i].clientX, touches[i].clientY)
        updatePointerDownData(pointer, touches[i].identifier, posX, posY)
        clickSplat(pointer)
      }
    }

    function handleTouchMove(e) {
      if (e.cancelable) e.preventDefault()
      const touches = e.targetTouches
      const pointer = pointers[0]
      for (let i = 0; i < touches.length; i++) {
        const { x: posX, y: posY } = getCanvasRelativePos(touches[i].clientX, touches[i].clientY)
        updatePointerMoveData(pointer, posX, posY, pointer.color)
      }
    }

    function handleTouchEnd(e) {
      const touches = e.changedTouches
      const pointer = pointers[0]
      for (let i = 0; i < touches.length; i++) {
        updatePointerUpData(pointer)
      }
    }

    window.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("touchstart", handleTouchStart, { passive: true })
    window.addEventListener("touchmove", handleTouchMove, { passive: false })
    window.addEventListener("touchend", handleTouchEnd, { passive: true })

    this._handlers = {
      handleMouseDown,
      handleMouseMove,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
    }

    this._sim = {
      config,
      updateKeywords,
      initFramebuffers,
      resizeCanvas,
      seedSplats,
      lastUpdateTime,
      updateFrame,
    }
  }
}

export function splashCursorOptionsFromSettings(settings) {
  return {
    simResolution: settings.splashCursorSimResolution ?? 128,
    dyeResolution: settings.splashCursorDyeResolution ?? 512,
    densityDissipation: settings.splashCursorDensityDissipation ?? 3.5,
    velocityDissipation: settings.splashCursorVelocityDissipation ?? 2,
    pressure: settings.splashCursorPressure ?? 0.1,
    pressureIterations: settings.splashCursorPressureIterations ?? 20,
    curl: settings.splashCursorCurl ?? 3,
    splatRadius: settings.splashCursorSplatRadius ?? 0.2,
    splatForce: settings.splashCursorSplatForce ?? 6000,
    shading: settings.splashCursorShading !== false,
    colorUpdateSpeed: settings.splashCursorColorUpdateSpeed ?? 10,
    rainbowMode: settings.splashCursorRainbowMode !== false,
    color: settings.splashCursorColor || "#ff0000",
  }
}
