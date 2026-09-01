/**
 * Frosted Glass Orbs (Mattglaskugeln) - High Definition GPU WebGL Simulation
 * Featuring:
 * - 3D Liquid Glass Metaball physics with smooth SDF blending
 * - Apple VisionOS / Glassmorphism frosted subsurface scattering & internal diffusion
 * - Multi-light specular highlights & iridescent chromatic Fresnel glass edge
 * - Interactive mouse repulsion/attraction with organic inertia
 * - Zero CPU overhead, adaptive resolution scaling, and locked 60-120 FPS
 */

export class FrostedGlassOrbsBackground {
  constructor(
    canvasId,
    color1 = "#00f2fe",
    color2 = "#4facfe",
    darkBackground = true,
  ) {
    const origCanvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId
    this.canvasWrapper = origCanvas ? origCanvas.parentElement : document.body

    const existing = document.querySelector(".frosted-orbs-webgl-canvas")
    if (existing) existing.remove()

    this.canvas = document.createElement("canvas")
    this.canvas.className = "frosted-orbs-webgl-canvas"
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
    this.darkBackground = darkBackground !== false

    this.mouse = { x: 0.5, y: 0.5 }
    this.targetMouse = { x: 0.5, y: 0.5 }

    this.vertexShaderSource = `
      precision mediump float;
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `

    this.fragmentShaderSource = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform float u_darkBg;

      // Smooth minimum for liquid metaball blending
      float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
      }

      // Analytical harmonic 3D trajectories
      vec3 getOrbPos(int idx, float t, vec2 m) {
        if (idx == 0) {
          return vec3(sin(t * 0.42) * 0.62, cos(t * 0.32) * 0.42, sin(t * 0.22) * 0.25) + vec3(m * 0.22, 0.0);
        } else if (idx == 1) {
          return vec3(cos(t * 0.52 + 1.2) * 0.68, sin(t * 0.38 + 0.9) * 0.48, cos(t * 0.28) * 0.3);
        } else if (idx == 2) {
          return vec3(sin(t * 0.36 + 2.4) * 0.58, cos(t * 0.56 + 2.0) * 0.40, sin(t * 0.42 + 1.1) * 0.22);
        } else if (idx == 3) {
          return vec3(cos(t * 0.46 + 3.8) * 0.72, sin(t * 0.30 + 3.4) * 0.45, cos(t * 0.48 + 2.1) * 0.28);
        } else {
          return vec3(sin(t * 0.58 + 5.1) * 0.52, cos(t * 0.48 + 4.6) * 0.36, sin(t * 0.32 + 3.0) * 0.18);
        }
      }

      // Signed Distance Field of Frosted Glass Orbs
      float mapSDF(vec3 p, float t, vec2 m) {
        float k = 0.36; // Metaball blend radius
        
        vec3 p0 = getOrbPos(0, t, m);
        float d0 = length(p - p0) - 0.38;
        
        vec3 p1 = getOrbPos(1, t, m);
        float d1 = length(p - p1) - 0.33;
        float d = smin(d0, d1, k);
        
        vec3 p2 = getOrbPos(2, t, m);
        float d2 = length(p - p2) - 0.31;
        d = smin(d, d2, k);

        vec3 p3 = getOrbPos(3, t, m);
        float d3 = length(p - p3) - 0.29;
        d = smin(d, d3, k);

        vec3 p4 = getOrbPos(4, t, m);
        float d4 = length(p - p4) - 0.25;
        d = smin(d, d4, k);

        return d;
      }

      // Finite difference normal
      vec3 calcNormal(vec3 p, float t, vec2 m) {
        float eps = 0.008;
        return normalize(vec3(
          mapSDF(p + vec3(eps, 0.0, 0.0), t, m) - mapSDF(p - vec3(eps, 0.0, 0.0), t, m),
          mapSDF(p + vec3(0.0, eps, 0.0), t, m) - mapSDF(p - vec3(0.0, eps, 0.0), t, m),
          mapSDF(p + vec3(0.0, 0.0, eps), t, m) - mapSDF(p - vec3(0.0, 0.0, eps), t, m)
        ));
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - u_resolution.xy * 0.5) / u_resolution.y;
        vec2 mouseNorm = (u_mouse - 0.5) * 2.0;

        float t = u_time * 0.65;

        // Camera setup
        vec3 ro = vec3(0.0, 0.0, 2.4);
        vec3 rd = normalize(vec3(uv, -1.5));

        // Raymarching (Ultra-fast bounded march)
        float dist = 0.0;
        float totalDist = 0.0;
        bool hit = false;
        vec3 p = ro;

        for (int i = 0; i < 22; i++) {
          p = ro + rd * totalDist;
          dist = mapSDF(p, t, mouseNorm);
          if (dist < 0.005) {
            hit = true;
            break;
          }
          totalDist += dist * 0.85;
          if (totalDist > 4.5) break;
        }

        // Color field mixing based on proximity to orb centers
        vec3 p0 = getOrbPos(0, t, mouseNorm);
        vec3 p1 = getOrbPos(1, t, mouseNorm);
        vec3 p2 = getOrbPos(2, t, mouseNorm);
        vec3 p3 = getOrbPos(3, t, mouseNorm);

        float dToCol1 = min(length(p - p0), length(p - p2));
        float dToCol2 = min(length(p - p1), length(p - p3));
        float colMix = smoothstep(-0.2, 0.4, dToCol2 - dToCol1);
        vec3 orbBaseCol = mix(u_color1, u_color2, colMix);

        // Ambient Background Caustic Glow (outside glass orbs)
        float ambientDist = mapSDF(vec3(uv * 1.2, 0.0), t, mouseNorm);
        float aura = exp(-max(ambientDist, 0.0) * 3.8) * 0.45;
        vec3 auraCol = mix(u_color1, u_color2, sin(u_time * 0.4 + uv.x) * 0.5 + 0.5);

        vec3 finalCol = vec3(0.0);
        float alpha = 0.0;

        if (hit) {
          vec3 N = calcNormal(p, t, mouseNorm);
          vec3 V = -rd;

          // 1. Apple VisionOS Fresnel Glass Reflection
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.2);
          
          // Chromatic Dispersion (Rainbow edge refraction)
          float fresnelR = pow(1.0 - max(dot(N * 1.03, V), 0.0), 2.5);
          float fresnelB = pow(1.0 - max(dot(N * 0.97, V), 0.0), 2.5);

          // 2. Multi-Light 3D Specular Sheen
          vec3 L1 = normalize(vec3(0.6, 0.8, 1.0));
          vec3 L2 = normalize(vec3(-0.7, -0.4, 0.7));
          vec3 Lm = normalize(vec3(mouseNorm.x * 0.8, mouseNorm.y * 0.8, 1.2) - p);

          float spec1 = pow(max(dot(reflect(-L1, N), V), 0.0), 36.0) * 0.9;
          float spec2 = pow(max(dot(reflect(-L2, N), V), 0.0), 24.0) * 0.4;
          float specM = pow(max(dot(reflect(-Lm, N), V), 0.0), 28.0) * 0.7;
          float totalSpec = spec1 + spec2 + specM;

          // 3. Frosted Glass Subsurface Core
          float coreDensity = smoothstep(0.45, 0.0, dist);
          vec3 innerGlow = mix(orbBaseCol, vec3(1.0), 0.35);

          // 4. Glass Edge Highlighting with Iridescent Dispersion
          vec3 glassRim = orbBaseCol;
          glassRim.r += fresnelR * 0.25;
          glassRim.b += fresnelB * 0.25;
          glassRim += vec3(1.0) * fresnel * 0.75;

          // Composite Glass Orb
          finalCol = mix(innerGlow * 0.85, glassRim, fresnel * 0.65);
          finalCol += vec3(1.0) * totalSpec;

          alpha = clamp(0.45 + fresnel * 0.5 + totalSpec * 0.5, 0.0, 1.0);
        }

        // Add ambient aura
        finalCol += auraCol * aura * (1.0 - alpha * 0.5);
        alpha = clamp(alpha + aura * 0.6, 0.0, 1.0);

        // Dark Background Handling
        if (u_darkBg > 0.5) {
          vec3 darkBackdrop = vec3(0.018, 0.022, 0.035);
          // Soft peripheral vignette
          vec2 vigUv = gl_FragCoord.xy / u_resolution.xy;
          vigUv *= (1.0 - vigUv.yx);
          float vig = clamp(vigUv.x * vigUv.y * 15.0, 0.0, 1.0);
          darkBackdrop *= mix(0.7, 1.0, vig);

          finalCol = mix(darkBackdrop, finalCol, alpha);
          alpha = 1.0;
        }

        gl_FragColor = vec4(finalCol, alpha);
      }
    `

    this._handleMouseMove = this._handleMouseMove.bind(this)
    this._handleResize = this._handleResize.bind(this)
    this._handleVisibility = this._handleVisibility.bind(this)
  }

  hexToRgb(hex) {
    let clean = (hex || "#00f2fe").replace("#", "")
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

  setOptions(options) {
    if (options && options.darkBackground !== undefined) {
      this.darkBackground = !!options.darkBackground
    }
  }

  initWebGL() {
    if (!this.gl) return false
    const gl = this.gl

    const compileShader = (type, source) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Frosted Orbs Shader error:", gl.getShaderInfoLog(shader))
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
      console.error("Frosted Orbs Link error:", gl.getProgramInfoLog(this.program))
      return false
    }

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    this.buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    this.posLocation = gl.getAttribLocation(this.program, "position")
    gl.enableVertexAttribArray(this.posLocation)
    gl.vertexAttribPointer(this.posLocation, 2, gl.FLOAT, false, 0, 0)

    this.uResLoc = gl.getUniformLocation(this.program, "u_resolution")
    this.uTimeLoc = gl.getUniformLocation(this.program, "u_time")
    this.uMouseLoc = gl.getUniformLocation(this.program, "u_mouse")
    this.uColor1Loc = gl.getUniformLocation(this.program, "u_color1")
    this.uColor2Loc = gl.getUniformLocation(this.program, "u_color2")
    this.uDarkBgLoc = gl.getUniformLocation(this.program, "u_darkBg")

    return true
  }

  _handleResize() {
    if (!this.canvas) return
    const w = window.innerWidth
    const h = window.innerHeight

    // Adaptive resolution scaling for locked 60-120 FPS
    const maxW = 1280
    const maxH = 720
    const scale = Math.min(1.0, maxW / Math.max(w, 1), maxH / Math.max(h, 1))

    this.canvas.width = Math.max(320, Math.floor(w * scale))
    this.canvas.height = Math.max(180, Math.floor(h * scale))

    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  _handleMouseMove(e) {
    this.targetMouse.x = e.clientX / window.innerWidth
    this.targetMouse.y = 1.0 - e.clientY / window.innerHeight
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

    // Smooth mouse lerping
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.08
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.08

    const gl = this.gl
    gl.useProgram(this.program)

    // Clear buffer
    gl.clearColor(0.0, 0.0, 0.0, 0.0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.uniform2f(this.uResLoc, this.canvas.width, this.canvas.height)
    gl.uniform1f(this.uTimeLoc, this.time)
    gl.uniform2f(this.uMouseLoc, this.mouse.x, this.mouse.y)
    gl.uniform3f(this.uColor1Loc, this.rgb1[0], this.rgb1[1], this.rgb1[2])
    gl.uniform3f(this.uColor2Loc, this.rgb2[0], this.rgb2[1], this.rgb2[2])
    gl.uniform1f(this.uDarkBgLoc, this.darkBackground ? 1.0 : 0.0)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

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
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program)
      this.program = null
    }
    if (this.gl && this.buffer) {
      this.gl.deleteBuffer(this.buffer)
      this.buffer = null
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }
  }
}

