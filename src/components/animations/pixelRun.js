/**
 * PixelRunEffect — Premium 8-bit side-scroller nostalgic scene
 * Improved with parallax layers, dynamic lighting, and richer pixel art.
 */
export class PixelRunEffect {
  constructor(canvasId, color = "#00e5ff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color

    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this.tick = 0

    this.clouds = []
    this.mountains = []
    this.coins = []
    this.stars = []
    this.heroes = []
    this.enemies = []
    this.platforms = []
    this.particles = []

    this.resize()
    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
  }

  get S() {
    return Math.max(
      2,
      Math.floor(Math.min(this.canvas.width, this.canvas.height) / 220),
    )
  }

  _drawSprite(sprite, x, y, s, flipX = false, alpha = 1) {
    const ctx = this.ctx
    const rows = sprite.length
    const cols = sprite[0].length
    ctx.globalAlpha = alpha
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = sprite[r][flipX ? cols - 1 - c : c]
        if (!color) continue
        ctx.fillStyle = color
        ctx.fillRect(Math.round(x + c * s), Math.round(y + r * s), s, s)
      }
    }
    ctx.globalAlpha = 1
  }

  // ─── Sprites (Improved Palettes) ──────────────────────────────────────────

  get _heroFrames() {
    const _ = ""
    const R = "#FF3D3D", // Red
      S = "#FFD1A4", // Skin
      W = "#FFFFFF", // White
      B = "#1A1A1A", // Black/Outline
      bl = "#4D4DFF", // Blue
      br = "#7A4419" // Brown
    
    // Frame 0: Neutral / Start Walk
    const f0 = [
      [_, _, B, B, B, B, _, _],
      [_, B, R, R, R, R, B, _],
      [_, B, R, R, R, R, R, B],
      [_, B, S, B, S, S, S, B],
      [B, S, B, S, S, B, S, B],
      [B, S, S, S, S, S, S, B],
      [_, B, S, S, S, S, B, _],
      [_, _, B, R, R, B, _, _],
      [_, B, R, bl, bl, R, B, _],
      [B, R, bl, bl, bl, bl, R, B],
      [B, B, B, bl, bl, B, B, B],
      [_, _, br, br, br, br, _, _],
    ]
    // Frame 1: Mid Walk
    const f1 = [
      [_, _, B, B, B, B, _, _],
      [_, B, R, R, R, R, B, _],
      [_, B, R, R, R, R, R, B],
      [_, B, S, B, S, S, S, B],
      [B, S, B, S, S, B, S, B],
      [B, S, S, S, S, S, S, B],
      [_, B, S, S, S, S, B, _],
      [_, _, B, R, R, B, _, _],
      [_, B, R, bl, bl, R, B, _],
      [_, B, bl, bl, bl, bl, B, _],
      [_, B, bl, B, B, bl, B, _],
      [_, br, br, _, _, br, br, _],
    ]
    return [f0, f1]
  }

  get _enemyFrames() {
    const _ = ""
    const B = "#2D1B00", // Dark Brown
      R = "#FF0000", // Eyes
      S = "#D2691E", // Skin
      W = "#FFFFFF"
    const f0 = [
      [_, _, B, B, B, B, _, _],
      [_, B, S, S, S, S, B, _],
      [B, S, S, S, S, S, S, B],
      [B, S, W, S, S, W, S, B],
      [B, S, R, S, S, R, S, B],
      [B, S, S, S, S, S, S, B],
      [_, B, B, B, B, B, B, _],
      [_, B, B, _, _, B, B, _],
    ]
    const f1 = [
      [_, _, B, B, B, B, _, _],
      [_, B, S, S, S, S, B, _],
      [B, S, S, S, S, S, S, B],
      [B, S, W, S, S, W, S, B],
      [B, S, R, S, S, R, S, B],
      [B, S, S, S, S, S, S, B],
      [_, B, B, B, B, B, B, _],
      [B, B, _, _, _, _, B, B],
    ]
    return [f0, f1]
  }

  _coinFrames() {
    const _ = ""
    const Y = "#FFD700", W = "#FFF", G = "#B8860B"
    return [
      [[_,Y,Y,_],[Y,W,Y,Y],[Y,Y,Y,Y],[Y,Y,G,Y],[_,Y,Y,_]],
      [[_,Y,Y,_],[Y,Y,W,Y],[Y,Y,Y,Y],[Y,G,Y,Y],[_,Y,Y,_]],
      [[_,Y,W,_],[Y,Y,Y,Y],[Y,Y,Y,Y],[Y,Y,Y,Y],[_,Y,Y,_]],
      [[_,W,Y,_],[Y,Y,Y,Y],[Y,Y,Y,Y],[Y,Y,Y,Y],[_,Y,Y,_]]
    ]
  }

  // ─── Procedural Backgrounds ───────────────────────────────────────────────

  _drawMountains(s) {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const groundY = H - s * 4

    for (const m of this.mountains) {
      ctx.fillStyle = m.color
      ctx.beginPath()
      ctx.moveTo(m.x, groundY)
      ctx.lineTo(m.x + m.w / 2, groundY - m.h)
      ctx.lineTo(m.x + m.w, groundY)
      ctx.fill()
      
      // Shadow side
      ctx.fillStyle = "rgba(0,0,0,0.15)"
      ctx.beginPath()
      ctx.moveTo(m.x + m.w / 2, groundY - m.h)
      ctx.lineTo(m.x + m.w, groundY)
      ctx.lineTo(m.x + m.w / 2, groundY)
      ctx.fill()
    }
  }

  _drawGround(s) {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const groundY = H - s * 4
    
    // Deep Ground
    ctx.fillStyle = "#3d251e"
    ctx.fillRect(0, groundY + s, W, H - groundY)

    // Grass Top
    ctx.fillStyle = "#38b000"
    ctx.fillRect(0, groundY, W, s)
    ctx.fillStyle = "#008000"
    ctx.fillRect(0, groundY + s*0.5, W, s*0.5)

    // Dirt details
    ctx.fillStyle = "#2b1712"
    for (let x = 0; x < W; x += s * 8) {
      for (let y = groundY + s * 2; y < H; y += s * 4) {
        ctx.fillRect(x + (y%s*2), y, s*2, s)
      }
    }
  }

  // ─── Scene Init ───────────────────────────────────────────────────────────

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._initScene()
  }

  _initScene() {
    const W = this.canvas.width, H = this.canvas.height, s = this.S
    const groundY = H - s * 4

    // Mountains (Far Parallax)
    this.mountains = []
    for(let i=0; i<8; i++) {
      this.mountains.push({
        x: Math.random() * W * 2,
        w: 200 + Math.random() * 400,
        h: 100 + Math.random() * 200,
        speed: 0.05 + Math.random() * 0.1,
        color: i % 2 === 0 ? "#1a2a4a" : "#14213d"
      })
    }

    this.stars = []
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * W,
        y: Math.random() * (H * 0.6),
        bright: Math.random() < 0.3,
        twinkle: Math.random() * 60
      })
    }

    this.clouds = []
    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random() * W,
        y: H * 0.1 + Math.random() * H * 0.2,
        speed: 0.3 + Math.random() * 0.4,
        size: s * (2 + Math.random() * 2),
        alpha: 0.4 + Math.random() * 0.3
      })
    }

    this.platforms = []
    for (let i = 0; i < Math.floor(W / 300); i++) {
      this.platforms.push({
        x: 100 + i * 400 + Math.random() * 100,
        y: groundY - s * (10 + Math.random() * 8),
        type: Math.random() < 0.4 ? "Q" : "B"
      })
    }

    this.coins = []
    this.platforms.forEach(p => {
      this.coins.push({ x: p.x + s*2, y: p.y - s*10, frame: 0, timer: 0, collected: false })
    })

    this.heroes = [this._createHero(100)]
    this.enemies = []
    for(let i=0; i<3; i++) {
      this.enemies.push({
        x: W * 0.5 + Math.random() * W,
        y: groundY - s * 8,
        speed: -(0.8 + Math.random() * 0.7),
        frame: 0, timer: 0
      })
    }
    this.particles = []
  }

  _createHero(startX) {
    const s = this.S, H = this.canvas.height, gY = H - s*4
    return {
      x: startX, y: gY - s*12, speed: 2 + Math.random(),
      frame: 0, timer: 0, jumping: false, vy: 0,
      trail: []
    }
  }

  // ─── Loop ─────────────────────────────────────────────────────────────────

  _update() {
    const W = this.canvas.width, H = this.canvas.height, s = this.S
    const gY = H - s*4
    this.tick++

    // Parallax
    this.mountains.forEach(m => {
      m.x -= m.speed
      if (m.x + m.w < 0) m.x = W + Math.random() * 100
    })
    this.clouds.forEach(c => {
      c.x -= c.speed
      if (c.x + s*20 < 0) c.x = W + s*20
    })

    // Hero
    for (const h of this.heroes) {
      h.x += h.speed
      h.timer++
      if (h.timer > 6) { h.timer = 0; h.frame = (h.frame + 1) % 2 }

      // Jump Logic
      if (!h.jumping && Math.random() < 0.01) {
        h.jumping = true; h.vy = -s * 5
      }
      if (h.jumping) {
        h.vy += s * 0.4; h.y += h.vy
        if (h.y >= gY - s*12) { h.y = gY - s*12; h.jumping = false }
      }

      // Trail
      if (this.tick % 3 === 0) {
        h.trail.unshift({ x: h.x, y: h.y, f: h.frame })
        if (h.trail.length > 5) h.trail.pop()
      }

      // Coin collect
      this.coins.forEach(c => {
        if (!c.collected && Math.hypot(h.x - c.x, h.y - c.y) < s * 15) {
          c.collected = true
          for(let i=0; i<8; i++) this.particles.push({
            x: c.x, y: c.y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1
          })
        }
      })

      if (h.x > W + 100) {
        h.x = -100; this.coins.forEach(c => c.collected = false)
      }
    }

    // Enemies
    this.enemies.forEach(e => {
      e.x += e.speed
      e.timer++
      if (e.timer > 8) { e.timer = 0; e.frame = (e.frame + 1) % 2 }
      if (e.x < -100) e.x = W + 100
    })

    // Particles
    for(let i=this.particles.length-1; i>=0; i--) {
      const p = this.particles[i]
      p.x += p.vx; p.y += p.vy; p.vy += 0.5; p.life -= 0.05
      if (p.life <= 0) this.particles.splice(i, 1)
    }
  }

  _draw() {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height, s = this.S
    ctx.clearRect(0, 0, W, H)

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, "#020111"); sky.addColorStop(0.5, "#191d35"); sky.addColorStop(1, "#20202c")
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)

    // Stars
    this.stars.forEach(st => {
      if ((this.tick + st.twinkle) % 50 < 40) {
        ctx.fillStyle = st.bright ? "#FFF" : "#667"
        ctx.fillRect(st.x, st.y, s, s)
      }
    })

    this._drawMountains(s)
    this._drawGround(s)

    // Platforms & Coins
    const cF = this._coinFrames()
    this.platforms.forEach(p => {
      ctx.fillStyle = "#f5a623"; ctx.fillRect(p.x, p.y, s*4, s*4)
      ctx.strokeStyle = "#000"; ctx.strokeRect(p.x, p.y, s*4, s*4)
    })
    this.coins.forEach(c => {
      if (!c.collected) {
        c.timer++
        if (c.timer > 5) { c.timer = 0; c.frame = (c.frame+1)%4 }
        this._drawSprite(cF[c.frame], c.x, c.y, s)
        // Glow
        const g = ctx.createRadialGradient(c.x+s*2, c.y+s*2, 0, c.x+s*2, c.y+s*2, s*10)
        g.addColorStop(0, "rgba(255,215,0,0.2)"); g.addColorStop(1, "transparent")
        ctx.fillStyle = g; ctx.fillRect(c.x-s*8, c.y-s*8, s*20, s*20)
      }
    })

    // Hero with Trail
    const hF = this._heroFrames
    this.heroes.forEach(h => {
      h.trail.forEach((t, i) => {
        this._drawSprite(hF[t.f], t.x, t.y, s, false, 0.3 - i*0.05)
      })
      this._drawSprite(hF[h.frame], h.x, h.y, s)
      // Player Light
      const g = ctx.createRadialGradient(h.x+s*4, h.y+s*6, 0, h.x+s*4, h.y+s*6, s*15)
      g.addColorStop(0, "rgba(255,255,255,0.1)"); g.addColorStop(1, "transparent")
      ctx.fillStyle = g; ctx.fillRect(h.x-s*10, h.y-s*10, s*30, s*30)
    })

    // Enemies
    const eF = this._enemyFrames
    this.enemies.forEach(e => this._drawSprite(eF[e.frame], e.x, e.y, s, e.speed < 0))

    // Particles
    this.particles.forEach(p => {
      ctx.fillStyle = `rgba(255,215,0,${p.life})`
      ctx.fillRect(p.x, p.y, s, s)
    })

    // CRT Overlay
    ctx.globalAlpha = 0.05; ctx.fillStyle = "#000"
    for (let i=0; i<H; i+=s*2) ctx.fillRect(0, i, W, s)
    ctx.globalAlpha = 1
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this._animId = requestAnimationFrame(t => this.animate(t))
    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)
    this._update(); this._draw()
  }

  start() {
    if (this.active) return
    this.active = true; this._initScene(); this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    this.active = false
    if (this._animId) cancelAnimationFrame(this._animId)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }
}

