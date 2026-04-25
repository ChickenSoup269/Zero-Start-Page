export class PixelWeatherEffect {
  constructor(canvasId, mode = "snow") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.rafId = null

    this.mode = mode // 'snow', 'rain', 'wind', or 'storm'
    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this.particles = []
    this.splashes = []
    this.clouds = []
    this.lightning = {
      active: false,
      timer: 0,
      opacity: 0,
      branches: []
    }
    this.stormWind = 0 // Biến điều khiển sức gió trong bão

    this.resFactor = 1
    this.speedMul = 1.0
    this.sizeMul = 1.0
    this.densityMul = 1.0

    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._buildParticles()
    this._buildClouds()
  }

  setMode(mode) {
    if (this.mode !== mode) {
      this.mode = mode
      this.splashes = []
      this.stormWind = 0
      this._buildParticles()
      this._buildClouds()
    }
  }

  setOptions(opts = {}) {
    let rebuild = false
    if (opts.density !== undefined && opts.density !== this.densityMul) {
      this.densityMul = opts.density
      rebuild = true
    }
    if (opts.resolution !== undefined && opts.resolution !== this.resFactor) {
      this.resFactor = opts.resolution
    }
    if (opts.speed !== undefined) this.speedMul = opts.speed
    if (opts.size !== undefined && opts.size !== this.sizeMul) this.sizeMul = opts.size

    if (rebuild) {
      this._buildParticles()
      this._buildClouds()
    }
  }

  _buildClouds() {
    this.clouds = []
    if (this.mode !== "storm") return

    const W = this.canvas.width
    const count = 5 + Math.floor(Math.random() * 5)
    for (let i = 0; i < count; i++) {
      this.clouds.push({
        x: Math.random() * W,
        y: Math.random() * 100,
        w: 100 + Math.random() * 200,
        h: 40 + Math.random() * 60,
        speed: 0.5 + Math.random() * 1,
        opacity: 0.2 + Math.random() * 0.3
      })
    }
  }

  _buildParticles() {
    this.particles = []
    const W = this.canvas.width
    const H = this.canvas.height

    let count = 100
    if (this.mode === "rain") count = 150
    if (this.mode === "storm") count = 300
    if (this.mode === "wind") count = 200
    if (this.mode === "snow") count = 400

    count = Math.floor(count * this.densityMul)
    for (let i = 0; i < count; i++) {
      this.particles.push(this._makeParticle(W, H, true))
    }
  }

  _makeParticle(W, H, initial = false) {
    let size, vx, vy, alpha, colorLight, type = "particle", length = 1

    if (this.mode === "rain" || this.mode === "storm") {
      const r = Math.random()
      if (r < 0.05) {
        type = "bubble"
        size = 4 + Math.random() * 4
        vx = (Math.random() - 0.5) * 0.5
        vy = -0.2 - Math.random() * 0.5
        alpha = 0.2 + Math.random() * 0.3
        colorLight = 90 + Math.random() * 10
      } else {
        // Pixel Rain - Nâng cấp độ dài cho Storm
        size = this.mode === "storm" ? 3 : 2
        length = (this.mode === "storm" ? 25 : 8) + Math.random() * 20 // Dài hơn cho bão
        vx = -4 - Math.random() * 4
        vy = (this.mode === "storm" ? 25 : 15) + Math.random() * 10
        alpha = 0.3 + Math.random() * 0.4
        colorLight = 90 + Math.random() * 10
      }
    } else if (this.mode === "wind") {
      size = Math.floor(2 + Math.random() * 4)
      length = 10 + Math.random() * 20
      vx = 10 + Math.random() * 15
      vy = (Math.random() - 0.5) * 2
      alpha = 0.3 + Math.random() * 0.5
      colorLight = 85 + Math.random() * 15
    } else {
      const r = Math.random()
      size = r < 0.7 ? 2 : r < 0.92 ? 4 : 6
      vx = (Math.random() - 0.5) * 0.8
      vy = 0.5 + Math.random() * 1.5
      alpha = Math.random() * 0.8
      colorLight = 90 + Math.random() * 10
    }

    return {
      type,
      x: initial 
        ? Math.random() * (W + 800) - 400 
        : (this.mode === "wind" ? -50 : Math.random() * (W + 800)),
      y: initial 
        ? Math.random() * H 
        : (this.mode === "wind" ? Math.random() * H : -100),
      size,
      length,
      vx,
      vy,
      alpha,
      light: colorLight,
      wobblePhase: Math.random() * Math.PI * 2,
    }
  }

  _triggerLightning() {
    if (this.lightning.active) return
    this.lightning.active = true
    this.lightning.timer = 10 + Math.floor(Math.random() * 15)
    this.lightning.opacity = 0.8
    this.lightning.branches = []
    let curX = Math.random() * this.canvas.width
    let curY = 0
    while (curY < this.canvas.height) {
      let nextX = curX + (Math.random() - 0.5) * 100
      let nextY = curY + 20 + Math.random() * 40
      this.lightning.branches.push({x1: curX, y1: curY, x2: nextX, y2: nextY})
      curX = nextX
      curY = nextY
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.resize()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }

  _drawPixelCloud(ctx, c) {
    ctx.fillStyle = `rgba(100, 100, 120, ${c.opacity})`
    const blockSize = 10 * this.resFactor
    for (let ox = 0; ox < c.w; ox += blockSize) {
      for (let oy = 0; oy < c.h; oy += blockSize) {
        if (Math.sin(ox / c.w * Math.PI) * Math.sin(oy / c.h * Math.PI) > Math.random() * 0.4) {
          ctx.fillRect(
            Math.floor((c.x + ox) / blockSize) * blockSize,
            Math.floor((c.y + oy) / blockSize) * blockSize,
            blockSize, blockSize
          )
        }
      }
    }
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this.rafId = requestAnimationFrame((t) => this.animate(t))

    if (document.visibilityState === "hidden") return

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    const W = this.canvas.width
    const H = this.canvas.height
    const ctx = this.ctx

    ctx.clearRect(0, 0, W, H)

    // Logic Sức gió trong bão (Thay đổi theo thời gian)
    const timeSec = currentTime * 0.001
    if (this.mode === "storm") {
        const gustFactor = Math.sin(timeSec * 0.5) * Math.cos(timeSec * 0.3);
        this.stormWind = gustFactor * 12; // Gió thổi mạnh lên đến 12px/frame
    }

    if (this.mode === "storm" && !this.lightning.active && Math.random() < 0.005) {
      this._triggerLightning()
    }

    if (this.lightning.active) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.lightning.opacity * 0.3})`
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = `rgba(255, 255, 255, ${this.lightning.opacity})`
      ctx.lineWidth = 4 * this.resFactor
      ctx.beginPath()
      this.lightning.branches.forEach(b => {
        ctx.moveTo(b.x1, b.y1)
        ctx.lineTo(b.x2, b.y1)
        ctx.lineTo(b.x2, b.y2)
      })
      ctx.stroke()
      this.lightning.timer--
      this.lightning.opacity -= 0.05
      if (this.lightning.timer <= 0) this.lightning.active = false
    }

    // Mây
    const cloudSpeedBase = this.mode === "storm" ? this.stormWind * 0.2 : 0
    this.clouds.forEach(c => {
      c.x -= (c.speed + cloudSpeedBase) * this.speedMul
      if (c.x + c.w < 0) c.x = W + 100
      this._drawPixelCloud(ctx, c)
    })

    // Splash hiệu ứng khi hạt mưa chạm đất
    const splashWind = this.mode === "storm" ? this.stormWind * 0.5 : 0
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i]
      s.x += s.vx + splashWind
      s.y += s.vy; s.vy += 0.5; s.life -= s.decay
      if (s.life <= 0) { this.splashes.splice(i, 1); continue }
      ctx.fillStyle = `rgba(255, 255, 255, ${s.life * 0.6})`
      ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 2, 2)
    }

    const resFactor = this.resFactor
    const sizeMul = this.sizeMul
    const speedMul = this.speedMul
    const isRainOrStormOrWind = this.mode === "rain" || this.mode === "storm" || this.mode === "wind"

    this.particles.forEach((p) => {
      // Áp dụng sức gió vào vận tốc ngang
      const currentVx = p.vx + (this.mode === "storm" ? this.stormWind : 0);
      
      p.x += currentVx * speedMul
      p.y += p.vy * speedMul

      if (p.y > H - 10 && (this.mode === "rain" || this.mode === "storm")) {
        if (Math.random() < 0.3) {
          const splashCount = 2
          for(let i=0; i<splashCount; i++) {
            this.splashes.push({x: p.x, y: H-5, vx: (Math.random()-0.5)*4, vy: -2-Math.random()*2, life: 1.0, decay: 0.1})
          }
        }
        Object.assign(p, this._makeParticle(W, H, false))
      }

      if (this.mode === "wind" || this.mode === "storm") {
          if (p.x > W + 400 || p.x < -400 || p.y > H + 100 || p.y < -150) {
              Object.assign(p, this._makeParticle(W, H, false))
          }
      } else {
          if (p.y > H + 50 || p.x < -100 || p.x > W + 500) {
              Object.assign(p, this._makeParticle(W, H, false))
          }
      }

      const drawSize = Math.max(1, Math.floor(p.size * resFactor * sizeMul))
      const drawX = Math.floor(p.x / resFactor) * resFactor
      const drawY = Math.floor(p.y / resFactor) * resFactor

      if (p.type === "bubble") {
        ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha})`
        ctx.strokeRect(drawX, drawY, drawSize, drawSize)
      } else if (isRainOrStormOrWind) {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`
        const drawLength = Math.max(2, Math.floor((p.length || 1) * resFactor * sizeMul))
        ctx.save()
        ctx.translate(drawX, drawY)
        // Xoay hạt mưa theo vector vận tốc thực tế (kể cả gió)
        ctx.rotate(-Math.atan2(currentVx, p.vy))
        ctx.fillRect(0, 0, drawSize, drawLength)
        ctx.restore()
      } else {
        ctx.fillStyle = `hsla(210, 10%, ${p.light}%, ${p.alpha})`
        ctx.fillRect(drawX, drawY, drawSize, drawSize)
      }
    })
  }
}
