/**
 * FirefliesHD Ultra — A hyper-realistic bioluminescent simulation.
 * Optimized for silky smooth, natural movement.
 */
export class FirefliesHD {
  constructor(canvasId, quantity = 25) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.quantity = quantity
    this.flies = []

    this.lastDrawTime = 0
    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    if (this.active) this._build()
  }

  _build() {
    const W = this.canvas.width
    const H = this.canvas.height

    this.flies = []
    for (let i = 0; i < this.quantity; i++) {
      const z = Math.random() // 0 (far) to 1 (near)

      this.flies.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        z: z,

        // Natural movement params
        baseSpeed: (0.6 + Math.random() * 0.5) * (0.3 + z * 0.7),
        wanderAngle: Math.random() * Math.PI * 2,
        wanderStep: 0.02 + Math.random() * 0.03,
        
        // Life cycle / Visuals
        flashClock: Math.random() * 10000,
        flashPeriod: 6000 + Math.random() * 8000,
        flashDuration: 2500 + Math.random() * 2500,
        
        hue: 52 + Math.random() * 22,
        flickerOffset: Math.random() * 100,
        size: (1.2 + z * 3.8) * (W / 1920),
      })
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = performance.now()
    this._build()
    this.canvas.style.display = "block"
    this.animate(performance.now())
  }

  stop() {
    this.active = false
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.flies = []
    this.canvas.style.display = "none"
  }

  _updateFly(fly, dt, W, H, time) {
    // 1. Organic Steering
    // Slowly shift the direction they want to go
    fly.wanderAngle += (Math.random() - 0.5) * fly.wanderStep
    
    // Add a subtle "bobbing" to the angle
    const bobbing = Math.sin(time * 0.001 + fly.flickerOffset) * 0.2
    
    const targetVx = Math.cos(fly.wanderAngle + bobbing) * fly.baseSpeed
    const targetVy = Math.sin(fly.wanderAngle + bobbing) * fly.baseSpeed

    // Smoothly interpolate current velocity towards target (lerp-like steering)
    const easing = 0.03
    fly.vx += (targetVx - fly.vx) * easing
    fly.vy += (targetVy - fly.vy) * easing

    // 2. Global "Breeze" (Soft wind influence)
    const windX = Math.sin(time * 0.0004) * 0.15
    const windY = Math.cos(time * 0.0003) * 0.1

    // 3. Apply position
    fly.x += (fly.vx + windX) * (dt / 16)
    fly.y += (fly.vy + windY) * (dt / 16)

    // Screen Wrap
    const margin = 150
    if (fly.x < -margin) fly.x = W + margin
    if (fly.x > W + margin) fly.x = -margin
    if (fly.y < -margin) fly.y = H + margin
    if (fly.y > H + margin) fly.y = -margin

    fly.flashClock += dt
  }

  _drawFly(fly) {
    const cyclePos = fly.flashClock % fly.flashPeriod
    if (cyclePos > fly.flashDuration) return

    const progress = cyclePos / fly.flashDuration
    let opacity = Math.pow(Math.sin(progress * Math.PI), 2)
    
    // High-frequency bioluminescent flickering
    const flicker = 0.88 + Math.sin(fly.flashClock * 0.015 + fly.flickerOffset) * 0.12
    opacity *= flicker

    if (opacity <= 0.001) return

    const { x, y, z, size, hue } = fly
    const ctx = this.ctx

    ctx.save()
    ctx.translate(x, y)
    
    ctx.globalCompositeOperation = "lighter"

    // Cache HSLA base strings if not already present
    if (!fly._hsla) {
      fly._hsla = `hsla(${hue}, 100%,`
    }

    // 1. Atmospheric Bloom (Very wide, very faint)
    const airGlowSize = size * (28 + z * 28)
    const airGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, airGlowSize)
    airGrad.addColorStop(0, `${fly._hsla} 50%, ${opacity * 0.12})`)
    airGrad.addColorStop(0.6, `${fly._hsla} 30%, ${opacity * 0.04})`)
    airGrad.addColorStop(1, `${fly._hsla} 20%, 0)`)
    
    ctx.fillStyle = airGrad
    ctx.beginPath()
    ctx.arc(0, 0, airGlowSize, 0, Math.PI * 2)
    ctx.fill()

    // 2. Core Bioluminescence
    const mainGlowSize = size * (10 + z * 10)
    const mainGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, mainGlowSize)
    mainGrad.addColorStop(0, `${fly._hsla} 75%, ${opacity * 0.85})`)
    mainGrad.addColorStop(0.4, `${fly._hsla} 55%, ${opacity * 0.35})`)
    mainGrad.addColorStop(1, `${fly._hsla} 45%, 0)`)
    
    ctx.fillStyle = mainGrad
    ctx.beginPath()
    ctx.arc(0, 0, mainGlowSize, 0, Math.PI * 2)
    ctx.fill()

    // 3. Photon Core (The biological light source)
    const coreSize = size * (1.8 + z) * (0.85 + opacity * 0.15)
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize)
    coreGrad.addColorStop(0, `rgba(255, 255, 245, ${opacity})`)
    coreGrad.addColorStop(0.5, `${fly._hsla} 90%, ${opacity * 0.95})`)
    coreGrad.addColorStop(1, `${fly._hsla} 75%, 0)`)
    
    ctx.fillStyle = coreGrad
    ctx.beginPath()
    ctx.arc(0, 0, coreSize, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  animate(currentTime) {
    if (!this.active) return
    this._animId = requestAnimationFrame((t) => this.animate(t))
    if (document.visibilityState === 'hidden') return

    const dt = currentTime - this.lastDrawTime
    this.lastDrawTime = currentTime

    const W = this.canvas.width
    const H = this.canvas.height

    this.ctx.clearRect(0, 0, W, H)

    for (const fly of this.flies) {
      this._updateFly(fly, dt, W, H, currentTime)
      this._drawFly(fly)
    }
  }
}
