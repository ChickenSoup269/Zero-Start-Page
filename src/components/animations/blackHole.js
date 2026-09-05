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
  constructor(canvasId, optionsOrAccretion = "#ff5500", starColor = "#ffffff") {
    let opts = {}
    if (typeof optionsOrAccretion === "object" && optionsOrAccretion !== null) {
      opts = optionsOrAccretion
    } else {
      opts = {
        accretionColor: optionsOrAccretion || "#ff5500",
        starColor: starColor || "#ffffff",
      }
    }

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

    this.accretionColor = opts.accretionColor || "#ff5500"
    this.glowColor = opts.glowColor || "#00d2ff"
    this.starColor = opts.starColor || "#ffffff"
    this.angle = Number(opts.angle) || 0
    this.angleRad = (this.angle * Math.PI) / 180.0

    this.rgbAccretion = this.hexToRgb(this.accretionColor)
    this.rgbGlow = this.hexToRgb(this.glowColor)
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
      uniform float u_angle;
      uniform vec3 u_accretionColor;
      uniform vec3 u_glowColor;
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

        // Center offset with mouse parallax
        vec2 p = uv - vec2(tiltX * 0.32, tiltY * 0.32);

        // Full angle rotation of the black hole + mouse interactive roll
        p = rot(u_angle + tiltX * 0.2) * p;

        float r = length(p);
        float theta = atan(p.y, p.x);

        // General Relativity Schwarzschild/Kerr radii constants
        float rH = 0.168;           // Event Horizon radius (Shadow boundary)
        float rPh = rH * 1.30;      // Photon Sphere caustic ring
        float rISCO = rH * 1.65;    // Innermost Stable Circular Orbit

        // 1. Spacetime Geodesic Deflection (Gravitational Lensing)
        float deflection = (rH * rH * 1.85) / (r * r + 0.0038);
        vec2 lensedP = p * (1.0 - deflection);

        // Counter-rotate stars so celestial starfield remains unrotated relative to screen,
        // while stars curve dynamically along gravitational geodesics:
        vec2 cosmicP = rot(-u_angle) * lensedP;
        float stars = getStars(cosmicP);
        float einsteinRing = exp(-abs(r - rPh * 1.48) * 18.0) * 0.45;
        vec3 starCol = u_starColor * (stars + einsteinRing * stars * 1.35);

        // Subtle ambient cosmic nebula dust
        float nebula = (sin(cosmicP.x * 3.5 + cosmicP.y * 3.0 + u_time * 0.12) * 0.5 + 0.5) * 0.035;
        starCol += mix(u_glowColor, u_accretionColor, 0.5) * nebula * smoothstep(rH * 1.5, 0.9, r);

        // 2. High-speed Infalling Plunge Filaments (Matter cascading into the horizon)
        float plungeSpiral = sin(theta * 3.0 - log(r + 0.003) * 15.0 + u_time * 4.5);
        float plungeMask = smoothstep(rH * 0.96, rISCO, r) * exp(-abs(r - rH * 1.15) * 16.0);
        float plungeStream = pow(clamp(plungeSpiral * 0.5 + 0.5, 0.0, 1.0), 2.5) * plungeMask * 0.85;

        // Outer Infalling Accretion Spiral
        float spiralStream = sin(theta * 3.0 - log(r + 0.001) * 9.5 + u_time * 2.6) * 0.5 + 0.5;
        spiralStream = pow(spiralStream, 3.0) * exp(-r * 2.4) * smoothstep(rH, rISCO, r);

        // 3. Primary Accretion Disk (3D Inclined Equatorial Plane)
        float diskAspect = 0.28 + tiltY * 0.16;
        vec2 diskUV = vec2(p.x, p.y / diskAspect);
        float diskR = length(diskUV);
        float diskTheta = atan(diskUV.y, diskUV.x);

        float diskPlasma = getPlasma(diskTheta, diskR, 1.0, u_time);

        // Relativistic Doppler Beaming (approaching side on left is boosted)
        float doppler = pow(max(1.0 + 1.05 * (p.x / (r + 0.02)), 0.15), 1.85);
        diskPlasma *= doppler;

        // Accretion disk radial profile with smooth ISCO inner cutoff
        float diskMask = smoothstep(rISCO, rISCO + 0.035, diskR) * exp(-(diskR - rISCO) * 2.5);

        // 4. Secondary Gravitational Lensed Arcs (Upper and Lower Hat Rings)
        float haloY = (abs(p.y) - rH * 0.86) / 0.72;
        vec2 haloUV = vec2(p.x, haloY);
        float haloR = length(haloUV);
        float haloTheta = atan(haloUV.y, haloUV.x);

        float haloPlasma = getPlasma(haloTheta, haloR, 0.96, u_time) * doppler;
        float haloMask = smoothstep(rISCO * 0.88, rISCO + 0.04, haloR) * exp(-(haloR - rISCO * 0.88) * 3.0);
        haloMask *= smoothstep(0.0, 0.08, abs(p.y));

        // Combined Equatorial Disk and Gravitationally Bent Lensed Arcs with Suction
        float totalPlasma = diskMask * diskPlasma * 1.2 + haloMask * haloPlasma * 0.9 + spiralStream * 0.5 + plungeStream * 0.75;

        // 5. Multi-Order Concentric Photon Rings (Crisp, High-Order Analytical Caustics)
        float pr_sharp = exp(-abs(r - rPh) * 98.0) * 1.8;          // Primary photon sphere ring (n=1)
        float pr_bloom = exp(-abs(r - rPh) * 22.0) * 0.85;         // Soft atmospheric photon halo
        float pr_inner = exp(-abs(r - rH * 1.12) * 125.0) * 1.1;   // Secondary caustic sub-ring (n=2)
        float pr_tertiary = exp(-abs(r - rH * 1.04) * 160.0) * 0.65; // Tertiary relativistic ring (n=3)
        float totalPhotonRings = pr_sharp + pr_bloom + pr_inner + pr_tertiary;

        // 6. Polar Relativistic Jets & Synchrotron Corona (Magnetic Poles)
        float polarDist = abs(p.x) / (abs(p.y) * 0.48 + 0.08);
        float jetSpiral = sin(u_time * 4.2 + abs(p.y) * 18.0) * 0.2 + 0.8;
        float polarJets = exp(-polarDist * 3.8) * exp(-abs(p.y) * 1.1) * jetSpiral;
        polarJets *= smoothstep(rH * 0.75, rH * 2.2, abs(p.y)) * 0.35;

        float anamorphicFlare = exp(-abs(p.y / diskAspect) * 14.0) * exp(-abs(p.x) * 1.6) * 0.28;
        float coronaGlow = exp(-abs(r - rH * 1.22) * 12.0) * 0.55;

        // 7. Gravitational Redshift & Rich Dual-Palette Color Grading
        float gravRedshift = clamp((r - rH) / (rISCO - rH + 0.02), 0.0, 1.0);
        vec3 hotWhite = vec3(1.0, 0.98, 0.95);
        vec3 glowCol = u_glowColor;
        vec3 redshiftRim = vec3(u_accretionColor.r * 0.85, u_accretionColor.g * 0.18, u_accretionColor.b * 0.05);

        // Thermal plasma gradient across accretion disk
        vec3 diskBaseCol = mix(redshiftRim, u_accretionColor, gravRedshift);
        vec3 plasmaCore = mix(diskBaseCol, hotWhite, clamp(totalPlasma * 0.65 + pr_sharp * 0.45, 0.0, 0.9));

        // Relativistic blueshift on approaching side (left side in rotated coordinate space)
        if (p.x < 0.0) {
          plasmaCore = mix(plasmaCore, glowCol, clamp(-p.x * 1.2, 0.0, 0.55));
        }

        // Accretion glow with customizable glowCol for polar jets, corona and photon rings
        vec3 accretionGlow = diskBaseCol * (totalPlasma * 1.2 + anamorphicFlare) 
                           + glowCol * (coronaGlow * 0.65 + polarJets * 1.1)
                           + mix(hotWhite, glowCol, 0.4) * (totalPhotonRings * 0.42);

        vec3 color = starCol + accretionGlow;

        // 8. Pitch Black Event Horizon Shadow (Singularity)
        float shadow = smoothstep(rH * 0.965, rH + 0.008, r);
        color *= shadow;

        // Subtle Ergosphere / Event Horizon Rim Outline (Aura)
        float horizonRim = exp(-abs(r - rH) * 85.0) * 0.35 * shadow;
        color += mix(glowCol, hotWhite, 0.5) * horizonRim;

        // Deep cosmic void
        vec3 cosmicBg = vec3(0.008, 0.010, 0.018);
        color = max(color, cosmicBg * shadow);

        // Cinematic vignette
        vec2 vigUv = gl_FragCoord.xy / u_resolution.xy;
        vigUv *= (1.0 - vigUv.yx);
        float vig = clamp(vigUv.x * vigUv.y * 16.0, 0.0, 1.0);
        color *= mix(0.72, 1.0, vig);

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

  updateAngle(deg) {
    this.angle = Number(deg) || 0
    this.angleRad = (this.angle * Math.PI) / 180.0
  }

  updateColor(type, color) {
    if (type === "accretion") {
      this.accretionColor = color
      this.rgbAccretion = this.hexToRgb(color)
    } else if (type === "glow" || type === "corona") {
      this.glowColor = color
      this.rgbGlow = this.hexToRgb(color)
    } else if (type === "star") {
      this.starColor = color
      this.rgbStar = this.hexToRgb(color)
    }
  }

  setOptions(opts = {}) {
    if (opts.accretionColor !== undefined) {
      this.updateColor("accretion", opts.accretionColor)
    }
    if (opts.glowColor !== undefined) {
      this.updateColor("glow", opts.glowColor)
    }
    if (opts.starColor !== undefined) {
      this.updateColor("star", opts.starColor)
    }
    if (opts.angle !== undefined) {
      this.updateAngle(opts.angle)
    }
    if (opts.mouseEnabled !== undefined) {
      this.setMouseEnabled(opts.mouseEnabled)
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
    this.uAngleLoc = gl.getUniformLocation(this.program, "u_angle")
    this.uAccretionLoc = gl.getUniformLocation(this.program, "u_accretionColor")
    this.uGlowLoc = gl.getUniformLocation(this.program, "u_glowColor")
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
    gl.uniform1f(this.uAngleLoc, this.angleRad)
    gl.uniform3f(
      this.uAccretionLoc,
      this.rgbAccretion[0],
      this.rgbAccretion[1],
      this.rgbAccretion[2],
    )
    gl.uniform3f(
      this.uGlowLoc,
      this.rgbGlow[0],
      this.rgbGlow[1],
      this.rgbGlow[2],
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
