export class LiquidEther {
  constructor(canvasOrId) {
    let origCanvas = null
    if (typeof canvasOrId === "string") {
      origCanvas = document.getElementById(canvasOrId)
    } else {
      origCanvas = canvasOrId
    }

    this.canvasWrapper = origCanvas ? origCanvas.parentElement : document.body

    const existing = document.querySelector(".liquid-ether-webgl-canvas")
    if (existing) existing.remove()

    this.canvas = document.createElement("canvas")
    this.canvas.className = "liquid-ether-webgl-canvas"
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
      this.canvas.getContext("webgl") ||
      this.canvas.getContext("experimental-webgl")
    this.animationId = null
    this.mouse = { x: 0.5, y: 0.5 }
    this.targetMouse = { x: 0.5, y: 0.5 }
    this.prevTargetMouse = { x: 0.5, y: 0.5 }
    this.mouseActivity = 0
    this.glowWidth = 4.5 // Mặc định độ rộng ánh sáng
    this.time = 0
    this.active = false
    this.colors = [
      [82, 39, 255], // #5227FF
      [255, 159, 252], // #FF9FFC
      [180, 151, 207], // #B497CF
    ]

    this.vertexShaderSource = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        vUv.y = 1.0 - vUv.y;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `

    this.fragmentShaderSource = `
      precision mediump float;
      varying vec2 vUv;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_mouseActivity;
      uniform float u_glowWidth;
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform vec3 u_color3;

      float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }

      float noise(vec2 x) {
        vec2 i = floor(x);
        vec2 f = fract(x);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 x) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
        for (int i = 0; i < 5; ++i) {
          v += a * noise(x);
          x = rot * x * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 p = gl_FragCoord.xy / u_resolution.xy;
        p.x *= u_resolution.x / u_resolution.y;
        vec2 mouse = u_mouse;
        mouse.x *= u_resolution.x / u_resolution.y;

        vec2 q = vec2(fbm(p + 0.1 * u_time), fbm(p + vec2(1.0)));
        vec2 r = vec2(fbm(p + 1.0 * q + vec2(1.7, 9.2) + 0.15 * u_time), fbm(p + 1.0 * q + vec2(8.3, 2.8) + 0.126 * u_time));

        float mouseDist = length(p - mouse);
        
        // Sử dụng u_glowWidth để tùy chỉnh độ rộng ánh sáng (giá trị thấp = rộng hơn)
        float glow = exp(-mouseDist * u_glowWidth) * (0.2 + u_mouseActivity * 2.5);
        
        float smokeNoise = fbm(p * 4.0 - u_time * 0.5 + r * 2.0);
        float smoke = smokeNoise * glow;

        float f = fbm(p + r + smoke);

        vec3 color = mix(u_color1, u_color2, clamp((f * f) * 4.0, 0.0, 1.0));
        color = mix(color, u_color3, clamp(length(q), 0.0, 1.0));
        
        vec3 smokeBright = mix(color, vec3(1.0, 1.0, 1.0), 0.6);
        vec3 finalColor = color * f * glow;
        finalColor += smokeBright * smoke * 0.8;
        
        finalColor += smokeBright * exp(-mouseDist * (u_glowWidth * 2.0)) * (u_mouseActivity + 0.1);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `

    this._handleMouseMove = this._handleMouseMove.bind(this)
    this._handleResize = this._handleResize.bind(this)
  }

  initWebGL() {
    if (!this.gl) return false
    const gl = this.gl

    const compileShader = (type, source) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader parsing error:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vs = compileShader(gl.VERTEX_SHADER, this.vertexShaderSource)
    const fs = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource)

    this.program = gl.createProgram()
    gl.attachShader(this.program, vs)
    gl.attachShader(this.program, fs)
    gl.linkProgram(this.program)

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error(
        "Program linking error:",
        gl.getProgramInfoLog(this.program),
      )
      return false
    }

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    this.positionLocation = gl.getAttribLocation(this.program, "position")
    gl.enableVertexAttribArray(this.positionLocation)
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0)

    this.uResolution = gl.getUniformLocation(this.program, "u_resolution")
    this.uTime = gl.getUniformLocation(this.program, "u_time")
    this.uMouse = gl.getUniformLocation(this.program, "u_mouse")
    this.uMouseActivity = gl.getUniformLocation(this.program, "u_mouseActivity")
    this.uGlowWidth = gl.getUniformLocation(this.program, "u_glowWidth")
    this.uColor1 = gl.getUniformLocation(this.program, "u_color1")
    this.uColor2 = gl.getUniformLocation(this.program, "u_color2")
    this.uColor3 = gl.getUniformLocation(this.program, "u_color3")

    return true
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : null
  }

  updateSettings(settings) {
    if (!settings) return
    
    if (settings.colors && settings.colors.length >= 3) {
      this.colors = settings.colors.map(
        (hex) => this.hexToRgb(hex) || [255, 255, 255],
      )
    }
    
    if (settings.glowWidth !== undefined) {
      // Chuyển đổi từ scale người dùng (ví dụ 1-10) sang scale shader (ví dụ 10-1)
      // Độ rộng lớn hơn trong UI = u_glowWidth nhỏ hơn trong shader
      this.glowWidth = 10.0 - settings.glowWidth
    }
  }

  updateColors(hexColors) {
    this.updateSettings({ colors: hexColors })
  }

  _handleMouseMove(e) {
    this.targetMouse.x = e.clientX / window.innerWidth
    this.targetMouse.y = 1.0 - e.clientY / window.innerHeight
  }

  _handleResize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"

    if (!this.initWebGL()) return

    this._handleResize()
    window.addEventListener("resize", this._handleResize)
    window.addEventListener("mousemove", this._handleMouseMove)

    let lastTime = 0
    const render = (now) => {
      this.time += (now - lastTime) * 0.001 // dt in seconds
      lastTime = now

      // Tính toán tốc độ di chuyển chuột để tạo hiệu ứng "nhá khói"
      const dist = Math.sqrt(
        Math.pow(this.targetMouse.x - this.prevTargetMouse.x, 2) +
        Math.pow(this.targetMouse.y - this.prevTargetMouse.y, 2)
      )
      
      this.mouseActivity += dist * 15.0 
      this.mouseActivity = Math.min(this.mouseActivity, 1.5)
      this.mouseActivity *= 0.94

      this.prevTargetMouse.x = this.targetMouse.x
      this.prevTargetMouse.y = this.targetMouse.y

      this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.08
      this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.08

      const gl = this.gl
      gl.useProgram(this.program)

      gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height)
      gl.uniform1f(this.uTime, this.time)
      gl.uniform2f(this.uMouse, this.mouse.x, this.mouse.y)
      gl.uniform1f(this.uMouseActivity, this.mouseActivity)
      gl.uniform1f(this.uGlowWidth, this.glowWidth)

      gl.uniform3f(
        this.uColor1,
        this.colors[0][0] / 255,
        this.colors[0][1] / 255,
        this.colors[0][2] / 255,
      )
      gl.uniform3f(
        this.uColor2,
        this.colors[1][0] / 255,
        this.colors[1][1] / 255,
        this.colors[1][2] / 255,
      )
      gl.uniform3f(
        this.uColor3,
        this.colors[2][0] / 255,
        this.colors[2][1] / 255,
        this.colors[2][2] / 255,
      )

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      this.animationId = requestAnimationFrame(render)
    }

    lastTime = performance.now()
    this.animationId = requestAnimationFrame(render)
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

    if (this.gl) {
      this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    }
  }
}
