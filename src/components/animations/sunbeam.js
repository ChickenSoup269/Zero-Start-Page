/**
 * SunbeamEffect (WebGL Port of Pro Light Rays)
 */
export class SunbeamEffect {
  constructor(canvasId, options = {}) {
    // Generate a new WebGL canvas to avoid interfering with 2d context on effect-canvas
    const origCanvas = document.getElementById(canvasId)
    this.canvasWrapper = origCanvas ? origCanvas.parentElement : document.body

    const existing = document.querySelector(".sunbeam-webgl-canvas")
    if (existing) existing.remove()

    this.canvas = document.createElement("canvas")
    this.canvas.className = "sunbeam-webgl-canvas"
    this.canvas.style.position = "fixed"
    this.canvas.style.inset = "0"
    this.canvas.style.zIndex = "-3"
    this.canvas.style.pointerEvents = "none"
    this.canvas.style.display = "none"
    this.canvasWrapper.appendChild(this.canvas)

    this.gl = this.canvas.getContext("webgl") || this.canvas.getContext("experimental-webgl")
    this.active = false

    if (typeof options === "string") {
      this.color = options
    } else {
      this.color = options.color || "#ffffff"
    }

    // Default configuration
    this.raysSpeed = 1
    this.lightSpread = 1
    this.rayLength = 2
    this.pulsating = 0.0 // boolean as float
    this.fadeDistance = 1.0
    this.saturation = 1.0
    this.mouseInfluence = 0.1
    this.noiseAmount = 0.0
    this.distortion = 0.0
    this.raysOrigin = "top-center" // could be top-left, left, etc.
    this.followMouse = true

    this.mouseX = 0.5
    this.mouseY = 0.5
    this.smoothMouseX = 0.5
    this.smoothMouseY = 0.5
    this.time = 0

    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)

    this._mouseHandler = (e) => {
      this.mouseX = e.clientX / window.innerWidth
      this.mouseY = e.clientY / window.innerHeight
    }
    window.addEventListener("mousemove", this._mouseHandler)

    this._initWebGL()
    this.resize()
  }

  _hexToRgbForm(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return m
      ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
      : [1, 1, 1]
  }

  _getAnchorAndDir(origin, w, h) {
    const outside = 0.2
    switch (origin) {
      case "top-left":
        return { anchor: [0, -outside * h], dir: [0, 1] }
      case "top-right":
        return { anchor: [w, -outside * h], dir: [0, 1] }
      case "left":
        return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] }
      case "right":
        return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] }
      case "bottom-left":
        return { anchor: [0, (1 + outside) * h], dir: [0, -1] }
      case "bottom-center":
        return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] }
      case "bottom-right":
        return { anchor: [w, (1 + outside) * h], dir: [0, -1] }
      default: // "top-center"
        return { anchor: [0.5 * w, -outside * h], dir: [0, 1] }
    }
  }

  _initWebGL() {
    if (!this.gl) return
    const gl = this.gl

    const vert = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `

    const frag = `
      precision highp float;

      uniform float iTime;
      uniform vec2  iResolution;

      uniform vec2  rayPos;
      uniform vec2  rayDir;
      uniform vec3  raysColor;
      uniform float raysSpeed;
      uniform float lightSpread;
      uniform float rayLength;
      uniform float pulsating;
      uniform float fadeDistance;
      uniform float saturation;
      uniform vec2  mousePos;
      uniform float mouseInfluence;
      uniform float noiseAmount;
      uniform float distortion;

      float noise(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
        vec2 sourceToCoord = coord - raySource;
        vec2 dirNorm = normalize(sourceToCoord);
        float cosAngle = dot(dirNorm, rayRefDirection);

        float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;

        float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

        float distance = length(sourceToCoord);
        float maxDistance = iResolution.x * rayLength;
        float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);

        float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
        float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

        float baseStrength = clamp(
          (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
          (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
          0.0, 1.0
        );

        return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
      }

      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);

        vec2 finalRayDir = rayDir;
        if (mouseInfluence > 0.0) {
          vec2 mouseScreenPos = mousePos * iResolution.xy;
          vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
          finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
        }

        vec4 rays1 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed);
        vec4 rays2 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * raysSpeed);

        fragColor = rays1 * 0.5 + rays2 * 0.4;

        if (noiseAmount > 0.0) {
          float n = noise(coord * 0.01 + iTime * 0.1);
          fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
        }

        float brightness = 1.0 - (coord.y / iResolution.y);
        fragColor.x *= 0.1 + brightness * 0.8;
        fragColor.y *= 0.3 + brightness * 0.6;
        fragColor.z *= 0.5 + brightness * 0.5;

        if (saturation != 1.0) {
          float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
          fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
        }

        fragColor.rgb *= raysColor;
      }

      void main() {
        vec4 color;
        mainImage(color, gl_FragCoord.xy);
        gl_FragColor = color;
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
      new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1,
      ]),
      gl.STATIC_DRAW,
    )

    this.positionLocation = gl.getAttribLocation(this.program, "position")

    this.uniforms = {
      iTime: gl.getUniformLocation(this.program, "iTime"),
      iResolution: gl.getUniformLocation(this.program, "iResolution"),
      rayPos: gl.getUniformLocation(this.program, "rayPos"),
      rayDir: gl.getUniformLocation(this.program, "rayDir"),
      raysColor: gl.getUniformLocation(this.program, "raysColor"),
      raysSpeed: gl.getUniformLocation(this.program, "raysSpeed"),
      lightSpread: gl.getUniformLocation(this.program, "lightSpread"),
      rayLength: gl.getUniformLocation(this.program, "rayLength"),
      pulsating: gl.getUniformLocation(this.program, "pulsating"),
      fadeDistance: gl.getUniformLocation(this.program, "fadeDistance"),
      saturation: gl.getUniformLocation(this.program, "saturation"),
      mousePos: gl.getUniformLocation(this.program, "mousePos"),
      mouseInfluence: gl.getUniformLocation(this.program, "mouseInfluence"),
      noiseAmount: gl.getUniformLocation(this.program, "noiseAmount"),
      distortion: gl.getUniformLocation(this.program, "distortion"),
    }
  }

  resize() {
    if (!this.canvas || !this.gl) return
    const dpr = Math.min(window.devicePixelRatio, 2) || 1
    this.canvas.width = window.innerWidth * dpr
    this.canvas.height = window.innerHeight * dpr
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
  }

  updateColor(color) {
    this.color = color
  }

  setAngle(deg) {
    // For compatibility with previous API
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

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    gl.useProgram(this.program)
    gl.enableVertexAttribArray(this.positionLocation)
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0)

    gl.uniform1f(this.uniforms.iTime, this.time * 0.001)
    gl.uniform2f(this.uniforms.iResolution, this.canvas.width, this.canvas.height)

    const colorRGB = this._hexToRgbForm(this.color)
    gl.uniform3f(this.uniforms.raysColor, colorRGB[0], colorRGB[1], colorRGB[2])
    gl.uniform1f(this.uniforms.raysSpeed, this.raysSpeed)
    gl.uniform1f(this.uniforms.lightSpread, this.lightSpread)
    gl.uniform1f(this.uniforms.rayLength, this.rayLength)
    gl.uniform1f(this.uniforms.pulsating, this.pulsating)
    gl.uniform1f(this.uniforms.fadeDistance, this.fadeDistance)
    gl.uniform1f(this.uniforms.saturation, this.saturation)
    gl.uniform1f(this.uniforms.mouseInfluence, this.mouseInfluence)
    gl.uniform1f(this.uniforms.noiseAmount, this.noiseAmount)
    gl.uniform1f(this.uniforms.distortion, this.distortion)

    const { anchor, dir } = this._getAnchorAndDir(this.raysOrigin, this.canvas.width, this.canvas.height)
    gl.uniform2f(this.uniforms.rayPos, anchor[0], anchor[1])
    gl.uniform2f(this.uniforms.rayDir, dir[0], dir[1])

    if (this.followMouse && this.mouseInfluence > 0.0) {
      const smoothing = 0.92
      this.smoothMouseX = this.smoothMouseX * smoothing + this.mouseX * (1 - smoothing)
      this.smoothMouseY = this.smoothMouseY * smoothing + this.mouseY * (1 - smoothing)
      gl.uniform2f(this.uniforms.mousePos, this.smoothMouseX, this.smoothMouseY)
    } else {
      gl.uniform2f(this.uniforms.mousePos, 0.5, 0.5)
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }
}

