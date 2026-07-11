/**
 * Pixel Snow Effect - High Performance Cinematic Version
 * Strictly based on user's high-quality reference logic.
 */

const vertexShaderSource = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uFlakeSize;
uniform float uMinFlakeSize;
uniform float uPixelResolution;
uniform float uSpeed;
uniform float uDepthFade;
uniform float uFarPlane;
uniform vec3 uColor;
uniform float uBrightness;
uniform float uGamma;
uniform float uDensity;
uniform float uVariant;
uniform float uDirection;
uniform float uMaxSteps;

out vec4 fragColor;

// Precomputed constants from reference
#define PI 3.14159265
#define PI_OVER_6 0.5235988
#define PI_OVER_3 1.0471976
#define INV_SQRT3 0.57735027
#define M1 1597334677U
#define M2 3812015801U
#define M3 3299493293U
#define F0 2.3283064e-10

// Optimized hash - inline multiplication
#define hash(n) (n * (n ^ (n >> 15)))
#define coord3(p) (uvec3(p).x * M1 ^ uvec3(p).y * M2 ^ uvec3(p).z * M3)

// Precomputed camera basis vectors (normalized vec3(1,1,1), vec3(1,0,-1))
const vec3 camK = vec3(0.57735027, 0.57735027, 0.57735027);
const vec3 camI = vec3(0.70710678, 0.0, -0.70710678);
const vec3 camJ = vec3(-0.40824829, 0.81649658, -0.40824829);

// Precomputed branch direction
const vec2 b1d = vec2(0.574, 0.819);

vec3 hash3(uint n) {
  uvec3 hashed = hash(n) * uvec3(1U, 511U, 262143U);
  return vec3(hashed) * F0;
}

float snowflakeDist(vec2 p) {
  float r = length(p);
  float a = atan(p.y, p.x);
  a = abs(mod(a + PI_OVER_6, PI_OVER_3) - PI_OVER_6);
  vec2 q = r * vec2(cos(a), sin(a));
  float dMain = max(abs(q.y), max(-q.x, q.x - 1.0));
  float b1t = clamp(dot(q - vec2(0.4, 0.0), b1d), 0.0, 0.4);
  float dB1 = length(q - vec2(0.4, 0.0) - b1t * b1d);
  float b2t = clamp(dot(q - vec2(0.7, 0.0), b1d), 0.0, 0.25);
  float dB2 = length(q - vec2(0.7, 0.0) - b2t * b1d);
  return min(dMain, min(dB1, dB2)) * 10.0;
}

void main() {
  // Precompute reciprocals to avoid division
  float invPixelRes = 1.0 / max(uPixelResolution, 1.0);
  float pixelSize = max(1.0, floor(0.5 + uResolution.x * invPixelRes));
  float invPixelSize = 1.0 / pixelSize;
  
  vec2 fragCoord = floor(gl_FragCoord.xy * invPixelSize);
  vec2 res = uResolution * invPixelSize;
  float invResX = 1.0 / res.x;

  vec3 ray = normalize(vec3((fragCoord - res * 0.5) * invResX, 1.0));
  ray = ray.x * camI + ray.y * camJ + ray.z * camK;

  // Precompute time-based values
  float timeSpeed = uTime * uSpeed;
  float dirRad = uDirection * PI / 180.0;
  float windX = cos(dirRad) * 0.4;
  float windY = sin(dirRad) * 0.4;
  vec3 camPos = (windX * camI + windY * camJ + 0.1 * camK) * timeSpeed;
  vec3 pos = camPos;

  // Precompute ray reciprocal for strides
  vec3 absRay = max(abs(ray), vec3(0.001));
  vec3 strides = 1.0 / absRay;
  vec3 raySign = step(ray, vec3(0.0));
  vec3 phase = fract(pos) * strides;
  phase = mix(strides - phase, phase, raySign);

  // Precompute for intersection test
  float invRayDotCamK = 1.0 / dot(ray, camK);
  float invDepthFade = 1.0 / uDepthFade;
  float halfInvResX = 0.5 * invResX;
  vec3 timeAnim = timeSpeed * 0.1 * vec3(7.0, 8.0, 5.0);

  vec3 finalCol = vec3(0.0);
  float t = 0.0;
  for (int i = 0; i < 128; i++) {
    if (float(i) >= uMaxSteps) break;
    if (t >= uFarPlane) break;
    
    vec3 fpos = floor(pos);
    uint cellCoord = coord3(fpos);
    float cellHash = hash3(cellCoord).x;

    if (cellHash < uDensity) {
      vec3 h = hash3(cellCoord);
      
      // Optimized flake position calculation
      vec3 flakePos = 0.5 - 0.5 * cos(4.0 * sin(fpos.yzx * 0.073) + 4.0 * sin(fpos.zxy * 0.27) + 2.0 * h + timeAnim);
      flakePos = flakePos * 0.8 + 0.1 + fpos;

      float toIntersection = dot(flakePos - pos, camK) * invRayDotCamK;
      
      if (toIntersection > 0.0) {
        vec3 testPos = pos + ray * toIntersection - flakePos;
        float testX = dot(testPos, camI);
        float testY = dot(testPos, camJ);
        vec2 testUV = abs(vec2(testX, testY));
        
        float depth = dot(flakePos - camPos, camK);
        float flakeSize = max(uFlakeSize, uMinFlakeSize * depth * halfInvResX);
        
        // Avoid branching with step functions where possible
        float dist;
        if (uVariant < 0.5) {
          dist = max(testUV.x, testUV.y);
        } else if (uVariant < 1.5) {
          dist = length(testUV);
        } else {
          dist = snowflakeDist(vec2(testX, testY) / flakeSize) * flakeSize;
        }

        if (dist < flakeSize) {
          float flakeSizeRatio = uFlakeSize / flakeSize;
          float intensity = exp2(-(t + toIntersection) * invDepthFade) *
                           min(1.0, flakeSizeRatio * flakeSizeRatio) * uBrightness;
          finalCol = uColor * pow(vec3(intensity), vec3(uGamma));
          break;
        }
      }
    }

    float nextStep = min(min(phase.x, phase.y), phase.z);
    vec3 sel = step(phase, vec3(nextStep));
    phase = phase - nextStep + strides * sel;
    t += nextStep;
    pos = mix(pos + ray * nextStep, floor(pos + ray * nextStep + 0.5), sel);
  }

  // Final color logic: Force white/gray-white for a clean cinematic look
  // Even if uColor is changed, we keep it very bright
  vec3 brightSnow = mix(vec3(1.0), uColor, 0.2); // Only 20% of custom color, 80% pure white
  vec3 finalSnowCol = finalCol * brightSnow;
  
  // Ensure background transparency and sharp particle edges
  float alpha = step(0.001, max(finalSnowCol.r, max(finalSnowCol.g, finalSnowCol.b)));
  fragColor = vec4(finalSnowCol, alpha);
}
`;

export class PixelSnowEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.gl = this.canvas.getContext("webgl2", { alpha: true, antialias: false, powerPreference: 'high-performance' })
    if (!this.gl) return

    this.options = {
      color: '#ffffff',
      flakeSize: 0.01,
      minFlakeSize: 1.25,
      pixelResolution: 200,
      speed: 1.25,
      depthFade: 8,
      farPlane: 20,
      brightness: 1,
      gamma: 0.4545,
      density: 0.3,
      variant: 'square',
      direction: 125,
      targetFps: 30,
      ...options
    }

    this.active = false
    this.startTime = 0
    this.program = this._initShaders()
    this._initBuffers()
    this._getUniformLocations()

    this._resizeHandler = () => this.handleResize()
    window.addEventListener("resize", this._resizeHandler)
    this.handleResize()
  }

  _initShaders() {
    const gl = this.gl
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vertexShaderSource)
    gl.compileShader(vs)
    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fragmentShaderSource)
    gl.compileShader(fs)
    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    return program
  }

  _initBuffers() {
    const gl = this.gl
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW)
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    const loc = gl.getAttribLocation(this.program, "position")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    this.vao = vao
  }

  _getUniformLocations() {
    const gl = this.gl, p = this.program
    this.uniforms = {
      uTime: gl.getUniformLocation(p, "uTime"),
      uResolution: gl.getUniformLocation(p, "uResolution"),
      uFlakeSize: gl.getUniformLocation(p, "uFlakeSize"),
      uMinFlakeSize: gl.getUniformLocation(p, "uMinFlakeSize"),
      uPixelResolution: gl.getUniformLocation(p, "uPixelResolution"),
      uSpeed: gl.getUniformLocation(p, "uSpeed"),
      uDepthFade: gl.getUniformLocation(p, "uDepthFade"),
      uFarPlane: gl.getUniformLocation(p, "uFarPlane"),
      uColor: gl.getUniformLocation(p, "uColor"),
      uBrightness: gl.getUniformLocation(p, "uBrightness"),
      uGamma: gl.getUniformLocation(p, "uGamma"),
      uDensity: gl.getUniformLocation(p, "uDensity"),
      uVariant: gl.getUniformLocation(p, "uVariant"),
      uDirection: gl.getUniformLocation(p, "uDirection"),
      uMaxSteps: gl.getUniformLocation(p, "uMaxSteps"),
    }
  }

  _hexToRgb(hex) {
    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return res ? [parseInt(res[1], 16)/255, parseInt(res[2], 16)/255, parseInt(res[3], 16)/255] : [1,1,1]
  }

  handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cssWidth = Math.max(1, window.innerWidth)
    const cssHeight = Math.max(1, window.innerHeight)
    const targetWidth = Math.max(
      120,
      Math.min(this.options.pixelResolution || 200, cssWidth * dpr, 720),
    )
    const targetHeight = Math.max(
      80,
      Math.round(targetWidth * (cssHeight / cssWidth)),
    )
    this.canvas.width = Math.round(targetWidth)
    this.canvas.height = targetHeight
    this.canvas.style.imageRendering = "pixelated"
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
  }

  setOptions(opts) {
    const prevPixelResolution = this.options.pixelResolution
    this.options = { ...this.options, ...opts }
    if (
      opts &&
      Object.prototype.hasOwnProperty.call(opts, "pixelResolution") &&
      opts.pixelResolution !== prevPixelResolution
    ) {
      this.handleResize()
    }
  }

  animate(t = 0) {
    if (!this.active) return
    this.animationId = (this.canvas && this.canvas.style.opacity !== "1" && (this.canvas.style.opacity = "1"), window.requestAnimationFrame)((nt) => this.animate(nt))
    if (document.visibilityState === "hidden") return
    const targetFps = this.options.targetFps || 30
    const frameInterval = 1000 / targetFps
    if (this.lastRenderTime && t - this.lastRenderTime < frameInterval) return
    this.lastRenderTime = t
    this.render(t)
  }

  render(t) {
    const gl = this.gl, u = this.uniforms, o = this.options
    gl.useProgram(this.program)
    gl.bindVertexArray(this.vao)
    gl.uniform1f(u.uTime, (t - this.startTime) * 0.001)
    gl.uniform2f(u.uResolution, this.canvas.width, this.canvas.height)
    gl.uniform1f(u.uFlakeSize, o.flakeSize)
    gl.uniform1f(u.uMinFlakeSize, o.minFlakeSize)
    gl.uniform1f(u.uPixelResolution, o.pixelResolution)
    gl.uniform1f(u.uSpeed, o.speed)
    gl.uniform1f(u.uDepthFade, o.depthFade)
    gl.uniform1f(u.uFarPlane, o.farPlane)
    gl.uniform3fv(u.uColor, new Float32Array(this._hexToRgb(o.color)))
    gl.uniform1f(u.uBrightness, o.brightness)
    gl.uniform1f(u.uGamma, o.gamma)
    gl.uniform1f(u.uDensity, o.density)
    
    let variantVal = 0.0
    if (o.variant === 'round' || o.variant === 'circle') variantVal = 1.0
    if (o.variant === 'snowflake') variantVal = 2.0
    gl.uniform1f(u.uVariant, variantVal)
    
    gl.uniform1f(u.uDirection, o.direction)
    const maxSteps = o.variant === "snowflake" ? 64 : 72
    gl.uniform1f(u.uMaxSteps, Math.min(128, Math.max(32, o.maxSteps || maxSteps)))
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this.startTime = performance.now()
    this.lastRenderTime = 0
    this.handleResize()
    this.animate(this.startTime)
  }

  stop() {
    this.active = false
    if (this.animationId) cancelAnimationFrame(this.animationId)
    this.animationId = null
    this.canvas.style.display = "none"
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    if (this.gl) { this.gl.deleteProgram(this.program); this.gl.deleteVertexArray(this.vao); }
  }
}


