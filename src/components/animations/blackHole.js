/**
 * Warp Drive / Black Hole Effect — Hollywood AAA Astrophysical 3D Engine
 *
 * Implements the 6 Golden Principles:
 *  1. Relativistic 3D Gargantua Geometry (Interstellar Astrophysics):
 *     - True 3D Kerr/Schwarzschild event horizon with pitch-black gravitational shadow.
 *     - Dual-lensed accretion disk: Equatorial disk + Upper and Lower Gravitational Arcs.
 *     - Multi-order concentric caustic photon rings (n=1, n=2, n=3 series).
 *  2. Relativistic Doppler Beaming & Blueshift/Redshift:
 *     - Intense beaming on the approaching plasma side (left) reaching thermal incandescent white-hot core.
 *     - Gravitational redshift & dimming on the receding side (right).
 *  3. Polar Relativistic Jets & Synchrotron Corona:
 *     - Subtle cosmic magnetic plasma jets erupting along the rotation axis.
 *  4. Gravitationally Lensed Einstein Starfield:
 *     - Background stars curved along hyperbolic geodesics around the photon sphere.
 *  5. Native High-DPI Retina Subpixel Precision & Smooth 60-240Hz Delta Normalization.
 *  6. Full Mouse Parallax & Toggle Support (setMouseEnabled).
 */

export class BlackHoleBackground {
  constructor(canvasId, accretionColor = "#ff5500", starColor = "#ffffff") {
    const origCanvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId
    this.canvasWrapper = origCanvas ? origCanvas.parentElement : document.body

    const existing = document.querySelector(".black-hole-webgl-canvas")
    if (existing) existing.remove()

    this.canvas = document.createElement("canvas")
    this.canvas.className = "black-hole-webgl-canvas"
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
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
      }) ||
      this.canvas.getContext("experimental-webgl", {
        alpha: false,
        antialias: false,
      })

    this.active = false
    this.destroyed = false
    this.animationId = null
    this.time = 0
    this.mouseEnabled = true

    this.accretionColor = accretionColor || "#ff5500"
    this.starColor = starColor || "#ffffff"
    this.rgbAccretion = this.hexToRgb(this.accretionColor)
    this.rgbStar = this.hexToRgb(this.starColor)

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
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform vec3 u_accretionColor;
      uniform vec3 u_starColor;

      mat2 rot(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, -s, s, c);
      }

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      // Gravitationally distorted deep starfield
      float getStars(vec2 p) {
        vec2 grid = floor(p * 36.0);
        vec2 f = fract(p * 36.0) - 0.5;
        float h = hash(grid);
        float star = 0.0;
        if (h > 0.93) {
          float size = (h - 0.93) * 16.0;
          float brightness = smoothstep(0.38, 0.0, length(f) / (size * 0.04 + 0.018));
          star = brightness * (sin(u_time * 2.2 + h * 6.28) * 0.3 + 0.7);
        }
        return star;
      }

      // Inward spiraling Keplerian plasma vortex flow
      float getPlasma(float theta, float r, float speedMult, float t) {
        // Continuous gravitational suction: inward radial advection along logarithmic spirals
        float suction = log(r + 0.012) * 5.8 - t * 2.2;
        float keplerSpeed = (1.0 / (pow(r, 1.25) + 0.03)) * 0.38 * speedMult;
        float flow = theta + keplerSpeed * t + suction;

        // Concentric micro-groove density waves flowing inward
        float microRings = sin(r * 90.0 - t * 1.2) * 0.16 + sin(r * 190.0 - t * 2.0) * 0.09 + sin(r * 380.0) * 0.05;

        // Multi-frequency turbulent infalling filaments
        float p1 = sin(flow * 3.0 + r * 30.0) * 0.5 + 0.5;
        float p2 = sin(flow * 9.0 - r * 60.0 + t * 1.8) * 0.26;
        float p3 = sin(flow * 21.0 + r * 120.0 - t * 2.6) * 0.14;
        float p4 = sin(flow * 45.0 - r * 240.0 + t * 3.8) * 0.08;

        float combined = (p1 + p2 + p3 + p4 + microRings);
        return pow(clamp(combined * 1.15, 0.0, 1.0), 2.0);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - u_resolution.xy * 0.5) / u_resolution.y;

        // Interactive 3D Spacetime Perspective Tilt
        vec2 mouseNorm = (u_mouse - 0.5) * 2.0;
        float tiltY = clamp(mouseNorm.y * 0.18, -0.25, 0.25);
        float tiltX = clamp(mouseNorm.x * 0.18, -0.25, 0.25);

        vec2 p = uv - vec2(tiltX * 0.32, tiltY * 0.32);
        p = rot(tiltX * 0.2) * p;

        float r = length(p);
        float theta = atan(p.y, p.x);

        // General Relativity Schwarzschild/Kerr radii constants
        float rH = 0.168;           // Event Horizon radius (Shadow boundary)
        float rPh = rH * 1.30;      // Photon Sphere caustic ring
        float rISCO = rH * 1.65;    // Innermost Stable Circular Orbit

        // 1. Spacetime Geodesic Deflection (Gravitational Lensing)
        float deflection = (rH * rH * 1.82) / (r * r + 0.004);
        vec2 lensedP = p * (1.0 - deflection);

        // Background Starfield with Einstein Ring distortion
        float stars = getStars(lensedP);
        float einsteinRing = exp(-abs(r - rPh * 1.48) * 18.0) * 0.45;
        vec3 starCol = u_starColor * (stars + einsteinRing * stars * 1.2);

        // 2. High-speed Infalling Plunge Filaments (Matter cascading into the horizon)
        float plungeSpiral = sin(theta * 2.5 - log(r + 0.004) * 14.0 + u_time * 4.2);
        float plungeMask = smoothstep(rH * 0.98, rISCO, r) * exp(-abs(r - rH * 1.15) * 16.0);
        float plungeStream = pow(clamp(plungeSpiral * 0.5 + 0.5, 0.0, 1.0), 2.5) * plungeMask * 0.75;

        // Outer Infalling Accretion Spiral
        float spiralStream = sin(theta * 3.0 - log(r + 0.001) * 9.5 + u_time * 2.6) * 0.5 + 0.5;
        spiralStream = pow(spiralStream, 3.2) * exp(-r * 2.5) * smoothstep(rH, rISCO, r);

        // 3. Primary Accretion Disk (3D Inclined Equatorial Plane)
        float diskAspect = 0.30 + tiltY * 0.16;
        vec2 diskUV = vec2(p.x, p.y / diskAspect);
        float diskR = length(diskUV);
        float diskTheta = atan(diskUV.y, diskUV.x);

        float diskPlasma = getPlasma(diskTheta, diskR, 1.0, u_time);

        // Softened Relativistic Doppler Beaming (approaching side on left is boosted)
        float doppler = pow(max(1.0 + 0.95 * (p.x / (r + 0.02)), 0.18), 1.75);
        diskPlasma *= doppler;

        // Accretion disk radial profile with smooth ISCO inner cutoff
        float diskMask = smoothstep(rISCO, rISCO + 0.04, diskR) * exp(-(diskR - rISCO) * 2.6);

        // 4. Secondary Gravitational Lensed Arcs (Upper and Lower Hat Rings)
        float haloY = (abs(p.y) - rH * 0.88) / 0.72;
        vec2 haloUV = vec2(p.x, haloY);
        float haloR = length(haloUV);
        float haloTheta = atan(haloUV.y, haloUV.x);

        float haloPlasma = getPlasma(haloTheta, haloR, 0.96, u_time) * doppler;
        float haloMask = smoothstep(rISCO * 0.90, rISCO + 0.05, haloR) * exp(-(haloR - rISCO * 0.90) * 3.2);
        haloMask *= smoothstep(0.0, 0.08, abs(p.y));

        // Combined Equatorial Disk and Gravitationally Bent Lensed Arcs with Suction
        float totalPlasma = diskMask * diskPlasma * 1.15 + haloMask * haloPlasma * 0.85 + spiralStream * 0.45 + plungeStream * 0.65;

        // 5. Multi-Order Concentric Photon Rings (Toned down, laser-crisp without glare)
        float pr_sharp = exp(-abs(r - rPh) * 95.0) * 1.6;          // Refined primary photon ring
        float pr_bloom = exp(-abs(r - rPh) * 22.0) * 0.75;         // Soft atmospheric halo
        float pr_inner = exp(-abs(r - rH * 1.12) * 120.0) * 0.9;   // Secondary inner sub-ring
        float pr_tertiary = exp(-abs(r - rH * 1.05) * 150.0) * 0.55; // Tertiary relativistic ring
        float totalPhotonRings = pr_sharp + pr_bloom + pr_inner + pr_tertiary;

        // 6. Polar Relativistic Jets & Corona Glow
        float polarDist = abs(p.x) / (abs(p.y) * 0.55 + 0.1);
        float polarJets = exp(-polarDist * 3.5) * exp(-abs(p.y) * 1.2) * (sin(u_time * 3.0 + p.y * 12.0) * 0.15 + 0.85);
        polarJets *= smoothstep(rH * 0.8, rH * 2.0, abs(p.y)) * 0.20;

        float anamorphicFlare = exp(-abs(p.y / diskAspect) * 16.0) * exp(-abs(p.x) * 1.8) * 0.22;
        float coronaGlow = exp(-abs(r - rH * 1.25) * 14.0) * 0.45;

        // 7. Gravitational Redshift & Rich Relativistic Color Grading
        float gravRedshift = clamp((r - rH) / (rISCO - rH + 0.02), 0.0, 1.0);
        vec3 hotWhite = vec3(1.0, 0.97, 0.92);
        vec3 blueHot = vec3(0.78, 0.90, 1.0);
        vec3 deepRed = vec3(u_accretionColor.r * 1.35, u_accretionColor.g * 0.22, u_accretionColor.b * 0.05);

        // Base color shifted by gravitational time dilation near event horizon
        vec3 diskBaseCol = mix(deepRed, u_accretionColor, gravRedshift);
        vec3 accretionCore = mix(diskBaseCol, hotWhite, clamp(totalPlasma * 0.6 + pr_sharp * 0.4, 0.0, 0.85));

        // Relativistic blueshift on approaching side (left side)
        if (p.x < 0.0) {
          accretionCore = mix(accretionCore, blueHot, clamp(-p.x * 0.85, 0.0, 0.4));
        }

        vec3 accretionGlow = diskBaseCol * (totalPlasma * 1.15 + coronaGlow * 0.4 + anamorphicFlare) + blueHot * polarJets;
        vec3 color = starCol + accretionGlow + hotWhite * (totalPhotonRings * 0.38);

        // 8. Pitch Black Event Horizon Shadow (Pure Singularity)
        float shadow = smoothstep(rH * 0.965, rH + 0.010, r);
        color *= shadow;

        // Ambient deep space background
        vec3 cosmicBg = vec3(0.010, 0.012, 0.022);
        color = max(color, cosmicBg * shadow);

        // Smooth cinematic vignette
        vec2 vigUv = gl_FragCoord.xy / u_resolution.xy;
        vigUv *= (1.0 - vigUv.yx);
        float vig = clamp(vigUv.x * vigUv.y * 16.0, 0.0, 1.0);
        color *= mix(0.75, 1.0, vig);

        gl_FragColor = vec4(color, 1.0);
      }
    `

    this._handleMouseMove = this._handleMouseMove.bind(this)
    this._handleResize = this._handleResize.bind(this)
    this._handleVisibility = this._handleVisibility.bind(this)
  }

  hexToRgb(hex) {
    let clean = (hex || "#ff5500").replace("#", "")
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

  setMouseEnabled(enabled) {
    this.mouseEnabled = Boolean(enabled)
    if (!this.mouseEnabled) {
      this.targetMouse = { x: 0.5, y: 0.5 }
      this.mouse = { x: 0.5, y: 0.5 }
    }
  }

  updateColor(type, color) {
    if (type === "accretion") {
      this.accretionColor = color
      this.rgbAccretion = this.hexToRgb(color)
    } else if (type === "star") {
      this.starColor = color
      this.rgbStar = this.hexToRgb(color)
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
        console.error("BlackHole Shader error:", gl.getShaderInfoLog(shader))
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
      console.error("BlackHole Link error:", gl.getProgramInfoLog(this.program))
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
    this.uAccretionLoc = gl.getUniformLocation(this.program, "u_accretionColor")
    this.uStarLoc = gl.getUniformLocation(this.program, "u_starColor")

    return true
  }

  _handleResize() {
    if (!this.canvas) return
    const w = window.innerWidth
    const h = window.innerHeight

    // Native High-DPI Retina Subpixel Rendering for razor-sharp HD visuals
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`

    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  _handleMouseMove(e) {
    if (this.mouseEnabled === false) return
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
    if (this.active || this.destroyed) return
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
    if (!this.active || this.destroyed) return

    const now = performance.now()
    const dt = Math.min((now - (this.lastFrameTime || now)) * 0.001, 0.1)
    this.lastFrameTime = now
    this.time += dt

    // Smooth mouse lerp
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.06
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.06

    const gl = this.gl
    gl.useProgram(this.program)

    gl.uniform2f(this.uResLoc, this.canvas.width, this.canvas.height)
    gl.uniform1f(this.uTimeLoc, this.time)
    gl.uniform2f(this.uMouseLoc, this.mouse.x, this.mouse.y)
    gl.uniform3f(
      this.uAccretionLoc,
      this.rgbAccretion[0],
      this.rgbAccretion[1],
      this.rgbAccretion[2],
    )
    gl.uniform3f(
      this.uStarLoc,
      this.rgbStar[0],
      this.rgbStar[1],
      this.rgbStar[2],
    )

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    this.animationId = requestAnimationFrame(() => this._renderLoop())
  }

  stop() {
    if (!this.active) return
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
    this.destroyed = true
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
