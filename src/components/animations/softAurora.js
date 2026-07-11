/**
 * Soft Aurora Effect
 * A high-performance WebGL 2 implementation.
 */

const vertexShaderSource = `#version 300 es
in vec2 position;
out vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform float uSpeed;
uniform float uScale;
uniform float uBrightness;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uNoiseFreq;
uniform float uNoiseAmp;
uniform float uBandHeight;
uniform float uBandSpread;
uniform float uOctaveDecay;
uniform float uLayerOffset;
uniform float uColorSpeed;
uniform vec2 uMouse;
uniform float uMouseInfluence;
uniform bool uEnableMouse;
uniform bool uTransparent;
uniform vec3 uBackgroundColor;

out vec4 fragColor;

#define TAU 6.28318530718

vec3 gradientHash(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7, 234.6)),
    dot(p, vec3(269.5, 183.3, 198.3)),
    dot(p, vec3(169.5, 283.3, 156.9))
  );
  vec3 h = fract(sin(p) * 43758.5453123);
  float phi = acos(clamp(2.0 * h.x - 1.0, -1.0, 1.0));
  float theta = TAU * h.y;
  return vec3(cos(theta) * sin(phi), sin(theta) * cos(phi), cos(phi));
}

float quinticSmooth(float t) {
  float t2 = t * t;
  float t3 = t * t2;
  return 6.0 * t3 * t2 - 15.0 * t2 * t2 + 10.0 * t3;
}

vec3 cosineGradient(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(TAU * (c * t + d));
}

float perlin3D(vec3 p) {
  vec3 f = floor(p);
  vec3 fr = fract(p);

  float d000 = dot(gradientHash(f + vec3(0,0,0)), fr - vec3(0,0,0));
  float d100 = dot(gradientHash(f + vec3(1,0,0)), fr - vec3(1,0,0));
  float d010 = dot(gradientHash(f + vec3(0,1,0)), fr - vec3(0,1,0));
  float d110 = dot(gradientHash(f + vec3(1,1,0)), fr - vec3(1,1,0));
  float d001 = dot(gradientHash(f + vec3(0,0,1)), fr - vec3(0,0,1));
  float d101 = dot(gradientHash(f + vec3(1,0,1)), fr - vec3(1,0,1));
  float d011 = dot(gradientHash(f + vec3(0,1,1)), fr - vec3(0,1,1));
  float d111 = dot(gradientHash(f + vec3(1,1,1)), fr - vec3(1,1,1));

  float sx = quinticSmooth(fr.x);
  float sy = quinticSmooth(fr.y);
  float sz = quinticSmooth(fr.z);

  return mix(
    mix(mix(d000, d100, sx), mix(d010, d110, sx), sy),
    mix(mix(d001, d101, sx), mix(d011, d111, sx), sy),
    sz
  );
}

float auroraGlow(float t, vec2 shift, vec2 fragCoord) {
  vec2 uv = fragCoord / uResolution.y;
  uv += shift;

  float noiseVal = 0.0;
  float freq = uNoiseFreq;
  float amp = uNoiseAmp;
  vec2 samplePos = uv * uScale;

  for (int i = 0; i < 3; i++) {
    noiseVal += perlin3D(vec3(samplePos * freq, t)) * amp;
    amp *= uOctaveDecay;
    freq *= 2.0;
  }

  float yPos = uv.y * 5.0; 
  float targetY = uBandHeight * 5.0;
  float yBand = yPos - targetY;
  
  return 0.3 * max(exp(-uBandSpread * abs(noiseVal + yBand)), 0.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float t = uSpeed * 0.4 * uTime;

  vec2 shift = vec2(0.0);
  if (uEnableMouse) {
    shift = (uMouse - 0.5) * uMouseInfluence;
  }

  vec3 col = vec3(0.0);
  
  // Layer 1
  float glow1 = auroraGlow(t, shift, gl_FragCoord.xy);
  vec3 grad1 = cosineGradient(uv.x + uTime * uSpeed * 0.2 * uColorSpeed, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.3, 0.2, 0.2));
  col += 0.99 * glow1 * grad1 * uColor1;

  // Layer 2
  float glow2 = auroraGlow(t + uLayerOffset, shift, gl_FragCoord.xy);
  vec3 grad2 = cosineGradient(uv.x + uTime * uSpeed * 0.1 * uColorSpeed, vec3(0.5), vec3(0.5), vec3(2.0, 1.0, 0.0), vec3(0.5, 0.2, 0.25));
  col += 0.99 * glow2 * grad2 * uColor2;

  col *= uBrightness;
  
  if (uTransparent) {
    float alpha = clamp(length(col) * 2.0, 0.0, 1.0);
    fragColor = vec4(col, alpha);
  } else {
    fragColor = vec4(mix(uBackgroundColor, col, clamp(length(col) * 2.0, 0.0, 1.0)), 1.0);
  }
}
`;

export class SoftAuroraEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.gl = this.canvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: 'high-performance' });
    if (!this.gl) {
      console.warn("WebGL 2 not supported for Soft Aurora");
      return;
    }

    this.options = {
      speed: 0.6,
      scale: 1.5,
      brightness: 1.0,
      color1: '#f7f7f7',
      color2: '#e100ff',
      noiseFrequency: 2.5,
      noiseAmplitude: 1.0,
      bandHeight: 0.5,
      bandSpread: 1.0,
      octaveDecay: 0.1,
      layerOffset: 0.0,
      colorSpeed: 1.0,
      enableMouseInteraction: true,
      mouseInfluence: 0.25,
      transparent: true,
      backgroundColor: '#000000',
      ...options
    };

    this.active = false;
    this.startTime = 0;
    this.currentMouse = [0.5, 0.5];
    this.targetMouse = [0.5, 0.5];

    this.program = this._initShaders();
    if (!this.program) return;

    this._initBuffers();
    this._getUniformLocations();

    this._resizeHandler = () => this.handleResize();
    this._mouseMoveHandler = (e) => this._handleMouseMove(e);
    this._mouseLeaveHandler = () => this._handleMouseLeave();

    window.addEventListener("resize", this._resizeHandler);
    this.handleResize();
  }

  _initShaders() {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertexShaderSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error("SoftAurora VS error:", gl.getShaderInfoLog(vs));
      return null;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragmentShaderSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error("SoftAurora FS error:", gl.getShaderInfoLog(fs));
      return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("SoftAurora Program Link error:", gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  }

  _initBuffers() {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const loc = gl.getAttribLocation(this.program, "position");
    if (loc !== -1) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }
    this.vao = vao;
  }

  _getUniformLocations() {
    const gl = this.gl, p = this.program;
    this.uniforms = {
      uTime: gl.getUniformLocation(p, "uTime"),
      uResolution: gl.getUniformLocation(p, "uResolution"),
      uSpeed: gl.getUniformLocation(p, "uSpeed"),
      uScale: gl.getUniformLocation(p, "uScale"),
      uBrightness: gl.getUniformLocation(p, "uBrightness"),
      uColor1: gl.getUniformLocation(p, "uColor1"),
      uColor2: gl.getUniformLocation(p, "uColor2"),
      uNoiseFreq: gl.getUniformLocation(p, "uNoiseFreq"),
      uNoiseAmp: gl.getUniformLocation(p, "uNoiseAmp"),
      uBandHeight: gl.getUniformLocation(p, "uBandHeight"),
      uBandSpread: gl.getUniformLocation(p, "uBandSpread"),
      uOctaveDecay: gl.getUniformLocation(p, "uOctaveDecay"),
      uLayerOffset: gl.getUniformLocation(p, "uLayerOffset"),
      uColorSpeed: gl.getUniformLocation(p, "uColorSpeed"),
      uMouse: gl.getUniformLocation(p, "uMouse"),
      uMouseInfluence: gl.getUniformLocation(p, "uMouseInfluence"),
      uEnableMouse: gl.getUniformLocation(p, "uEnableMouse"),
      uTransparent: gl.getUniformLocation(p, "uTransparent"),
      uBackgroundColor: gl.getUniformLocation(p, "uBackgroundColor"),
    };
  }

  _hexToVec3(hex) {
    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return res ? [parseInt(res[1], 16) / 255, parseInt(res[2], 16) / 255, parseInt(res[3], 16) / 255] : [0, 0, 0];
  }

  _handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.targetMouse = [
      (e.clientX - rect.left) / rect.width,
      1.0 - (e.clientY - rect.top) / rect.height
    ];
  }

  _handleMouseLeave() {
    this.targetMouse = [0.5, 0.5];
  }

  handleResize() {
    const dpr = 1.0; // Keep 1.0 for better performance with heavy noise
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  setOptions(opts) { this.options = { ...this.options, ...opts }; }

  animate(t = 0) {
    if (!this.active) return;
    this.animationId = (this.canvas && this.canvas.style.opacity !== "1" && (this.canvas.style.opacity = "1"), window.requestAnimationFrame)((nt) => this.animate(nt));
    this.render(t);
  }

  render(t) {
    if (!this.program) return;
    const gl = this.gl, u = this.uniforms, o = this.options;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.uniform1f(u.uTime, (t - this.startTime) * 0.001);
    gl.uniform2f(u.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uSpeed, o.speed);
    gl.uniform1f(u.uScale, o.scale);
    gl.uniform1f(u.uBrightness, o.brightness);
    gl.uniform3fv(u.uColor1, new Float32Array(this._hexToVec3(o.color1)));
    gl.uniform3fv(u.uColor2, new Float32Array(this._hexToVec3(o.color2)));
    gl.uniform1f(u.uNoiseFreq, o.noiseFrequency);
    gl.uniform1f(u.uNoiseAmp, o.noiseAmplitude);
    gl.uniform1f(u.uBandHeight, o.bandHeight);
    gl.uniform1f(u.uBandSpread, o.bandSpread);
    gl.uniform1f(u.uOctaveDecay, o.octaveDecay);
    gl.uniform1f(u.uLayerOffset, o.layerOffset);
    gl.uniform1f(u.uColorSpeed, o.colorSpeed);
    gl.uniform1f(u.uMouseInfluence, o.mouseInfluence);
    gl.uniform1i(u.uEnableMouse, o.enableMouseInteraction ? 1 : 0);
    gl.uniform1i(u.uTransparent, o.transparent ? 1 : 0);
    gl.uniform3fv(u.uBackgroundColor, new Float32Array(this._hexToVec3(o.backgroundColor)));

    if (o.enableMouseInteraction) {
      this.currentMouse[0] += 0.05 * (this.targetMouse[0] - this.currentMouse[0]);
      this.currentMouse[1] += 0.05 * (this.targetMouse[1] - this.currentMouse[1]);
      gl.uniform2f(u.uMouse, this.currentMouse[0], this.currentMouse[1]);
    } else {
      gl.uniform2f(u.uMouse, 0.5, 0.5);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.canvas.style.display = "block";
    this.startTime = performance.now();
    if (this.options.enableMouseInteraction) {
      window.addEventListener("mousemove", this._mouseMoveHandler);
      window.addEventListener("mouseleave", this._mouseLeaveHandler);
    }
    this.animate(this.startTime);
  }

  stop() {
    this.active = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.animationId = null;
    window.removeEventListener("mousemove", this._mouseMoveHandler);
    window.removeEventListener("mouseleave", this._mouseLeaveHandler);
    this.canvas.style.display = "none";
  }

  destroy() {
    this.stop();
    window.removeEventListener("resize", this._resizeHandler);
    if (this.gl) { this.gl.deleteProgram(this.program); this.gl.deleteVertexArray(this.vao); }
  }
}


