/**
 * Gradient V2 - High Quality WebGL 2 Shader Implementation
 * Based on Grainient shader logic.
 */

const vertexShaderSource = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;

#define S(a,b,t) smoothstep(a,b,t)

mat2 Rot(float a){
    float s=sin(a),c=cos(a);
    return mat2(c,-s,s,c);
} 

vec2 hash(vec2 p){
    p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));
    return fract(sin(p)*43758.5453);
} 

float noise(vec2 p){
    vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
    float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);
    return 0.5+0.5*n;
}

void mainImage(out vec4 o, vec2 C){
  float t=iTime*uTimeSpeed;
  vec2 uv=C/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);

  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;

  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);

  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));

  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);} 
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;

  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);

  o=vec4(col,1.0);
}

void main(){
  vec4 o=vec4(0.0);
  mainImage(o,gl_FragCoord.xy);
  fragColor=o;
}
`;

export class GradientV2Effect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.gl = this.canvas.getContext("webgl2", { alpha: true, antialias: false })
    if (!this.gl) {
        console.error("WebGL 2 not supported")
        return
    }

    this.options = {
      color1: '#FF9FFC',
      color2: '#5227FF',
      color3: '#B497CF',
      timeSpeed: 0.25,
      colorBalance: 0.0,
      warpStrength: 1.0,
      warpFrequency: 5.0,
      warpSpeed: 2.0,
      warpAmplitude: 50.0,
      blendAngle: 0.0,
      blendSoftness: 0.05,
      rotationAmount: 500.0,
      noiseScale: 2.0,
      grainAmount: 0.1,
      grainScale: 2.0,
      grainAnimated: false,
      contrast: 1.5,
      gamma: 1.0,
      saturation: 1.0,
      centerX: 0.0,
      centerY: 0.0,
      zoom: 0.9,
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
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(vs))
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fragmentShaderSource)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(fs))
    }

    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program))
    }
    return program
  }

  _initBuffers() {
    const gl = this.gl
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    // Full screen triangle
    const positions = new Float32Array([
      -1.0, -1.0,
       3.0, -1.0,
      -1.0,  3.0,
    ])
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    const positionLocation = gl.getAttribLocation(this.program, "position")
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
    this.vao = vao
  }

  _getUniformLocations() {
    const gl = this.gl
    const p = this.program
    this.uniforms = {
      iResolution: gl.getUniformLocation(p, "iResolution"),
      iTime: gl.getUniformLocation(p, "iTime"),
      uTimeSpeed: gl.getUniformLocation(p, "uTimeSpeed"),
      uColorBalance: gl.getUniformLocation(p, "uColorBalance"),
      uWarpStrength: gl.getUniformLocation(p, "uWarpStrength"),
      uWarpFrequency: gl.getUniformLocation(p, "uWarpFrequency"),
      uWarpSpeed: gl.getUniformLocation(p, "uWarpSpeed"),
      uWarpAmplitude: gl.getUniformLocation(p, "uWarpAmplitude"),
      uBlendAngle: gl.getUniformLocation(p, "uBlendAngle"),
      uBlendSoftness: gl.getUniformLocation(p, "uBlendSoftness"),
      uRotationAmount: gl.getUniformLocation(p, "uRotationAmount"),
      uNoiseScale: gl.getUniformLocation(p, "uNoiseScale"),
      uGrainAmount: gl.getUniformLocation(p, "uGrainAmount"),
      uGrainScale: gl.getUniformLocation(p, "uGrainScale"),
      uGrainAnimated: gl.getUniformLocation(p, "uGrainAnimated"),
      uContrast: gl.getUniformLocation(p, "uContrast"),
      uGamma: gl.getUniformLocation(p, "uGamma"),
      uSaturation: gl.getUniformLocation(p, "uSaturation"),
      uCenterOffset: gl.getUniformLocation(p, "uCenterOffset"),
      uZoom: gl.getUniformLocation(p, "uZoom"),
      uColor1: gl.getUniformLocation(p, "uColor1"),
      uColor2: gl.getUniformLocation(p, "uColor2"),
      uColor3: gl.getUniformLocation(p, "uColor3"),
    }
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return [1, 1, 1]
    return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
    ]
  }

  handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = window.innerWidth * dpr
    this.canvas.height = window.innerHeight * dpr
    this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight)
  }

  setOptions(newOptions) {
    this.options = { ...this.options, ...newOptions }
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this.animationId = requestAnimationFrame((t) => this.animate(t))
    this.render(currentTime)
  }

  render(currentTime) {
    const gl = this.gl
    const u = this.uniforms
    const opt = this.options

    gl.useProgram(this.program)
    gl.bindVertexArray(this.vao)

    gl.uniform2f(u.iResolution, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.uniform1f(u.iTime, (currentTime - this.startTime) * 0.001)
    
    gl.uniform1f(u.uTimeSpeed, opt.timeSpeed)
    gl.uniform1f(u.uColorBalance, opt.colorBalance)
    gl.uniform1f(u.uWarpStrength, opt.warpStrength)
    gl.uniform1f(u.uWarpFrequency, opt.warpFrequency)
    gl.uniform1f(u.uWarpSpeed, opt.warpSpeed)
    gl.uniform1f(u.uWarpAmplitude, opt.warpAmplitude)
    gl.uniform1f(u.uBlendAngle, opt.blendAngle)
    gl.uniform1f(u.uBlendSoftness, opt.blendSoftness)
    gl.uniform1f(u.uRotationAmount, opt.rotationAmount)
    gl.uniform1f(u.uNoiseScale, opt.noiseScale)
    gl.uniform1f(u.uGrainAmount, opt.grainAmount)
    gl.uniform1f(u.uGrainScale, opt.grainScale)
    gl.uniform1f(u.uGrainAnimated, opt.grainAnimated ? 1.0 : 0.0)
    gl.uniform1f(u.uContrast, opt.contrast)
    gl.uniform1f(u.uGamma, opt.gamma)
    gl.uniform1f(u.uSaturation, opt.saturation)
    gl.uniform2f(u.uCenterOffset, opt.centerX, opt.centerY)
    gl.uniform1f(u.uZoom, opt.zoom)
    
    gl.uniform3fv(u.uColor1, new Float32Array(this._hexToRgb(opt.color1)))
    gl.uniform3fv(u.uColor2, new Float32Array(this._hexToRgb(opt.color2)))
    gl.uniform3fv(u.uColor3, new Float32Array(this._hexToRgb(opt.color3)))

    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this.startTime = performance.now()
    this.animate(this.startTime)
  }

  stop() {
    this.active = false
    if (this.animationId) {
        cancelAnimationFrame(this.animationId)
        this.animationId = null
    }
    this.canvas.style.display = "none"
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
    const gl = this.gl
    if (gl) {
        gl.deleteProgram(this.program)
        gl.deleteVertexArray(this.vao)
    }
  }
}
