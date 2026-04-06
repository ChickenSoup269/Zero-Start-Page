/**
 * PixelRunEffect — Retro 8-bit side-scroller nostalgia scene
 * Inspired by NES/Famicom era games (Mario, Contra, Megaman, Castlevania…)
 * Pixel size is adaptive: S = Math.max(2, floor(min(W,H)/240))
 */
export class PixelRunEffect {
  constructor(canvasId, color = "#00e5ff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color // used as accent / tint, can be overridden from settings

    // Timing
    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this.tick = 0 // logical frame counter

    // Scene objects
    this.clouds = []
    this.coins = []
    this.stars = []
    this.heroes = []
    this.enemies = []
    this.platforms = []
    this.particles = [] // coin-collect sparkles

    this.resize()
    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  get S() {
    return Math.max(
      2,
      Math.floor(Math.min(this.canvas.width, this.canvas.height) / 240),
    )
  }

  _rgb(hex) {
    const c = (hex || this.color).replace("#", "")
    if (c.length === 3)
      return {
        r: parseInt(c[0] + c[0], 16),
        g: parseInt(c[1] + c[1], 16),
        b: parseInt(c[2] + c[2], 16),
      }
    return {
      r: parseInt(c.slice(0, 2), 16),
      g: parseInt(c.slice(2, 4), 16),
      b: parseInt(c.slice(4, 6), 16),
    }
  }

  // Draw a pixel grid from a 2-D array of css color strings ('' = transparent)
  _drawSprite(sprite, x, y, s, flipX = false) {
    const ctx = this.ctx
    const rows = sprite.length
    const cols = sprite[0].length
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = sprite[r][flipX ? cols - 1 - c : c]
        if (!color) continue
        ctx.fillStyle = color
        ctx.fillRect(Math.round(x + c * s), Math.round(y + r * s), s, s)
      }
    }
  }

  // ─── Sprite definitions (NES palette approximations) ──────────────────────

  // Classic plumber – 8×12 px grid, two walk frames
  get _heroFrames() {
    const _ = ""
    const R = "#e52222",
      S = "#f5a623",
      W = "#fff",
      B = "#3d1c02",
      bl = "#1a1aff",
      br = "#8B4513"
    const frame0 = [
      [_, _, R, R, R, R, _, _],
      [_, R, R, R, R, R, R, _],
      [_, B, S, B, B, S, _, _],
      [B, S, B, S, S, B, S, B],
      [B, S, S, S, S, S, S, B],
      [B, S, S, S, S, S, S, _],
      [_, _, R, R, R, _, _, _],
      [_, R, R, bl, bl, R, R, _],
      [R, R, bl, bl, bl, bl, R, R],
      [br, br, _, bl, bl, _, br, br],
      [br, br, br, _, _, br, br, br],
      [_, br, br, _, _, _, br, _],
    ]
    const frame1 = [
      [_, _, R, R, R, R, _, _],
      [_, R, R, R, R, R, R, _],
      [_, B, S, B, B, S, _, _],
      [B, S, B, S, S, B, S, B],
      [B, S, S, S, S, S, S, B],
      [B, S, S, S, S, S, S, _],
      [_, _, R, R, R, _, _, _],
      [_, R, R, bl, bl, R, R, _],
      [R, R, bl, bl, bl, bl, R, R],
      [_, br, _, bl, bl, _, br, br],
      [br, br, br, _, _, br, br, _],
      [br, _, br, _, _, _, _, br],
    ]
    return [frame0, frame1]
  }

  // Goomba-style enemy – 8×8 grid, two frames
  get _enemyFrames() {
    const _ = ""
    const B = "#3d1c02",
      R = "#8B0000",
      S = "#c06000",
      W = "#fff",
      Y = "#f0e040"
    const frame0 = [
      [_, B, B, B, B, B, B, _],
      [B, B, R, B, B, R, B, B],
      [B, B, B, B, B, B, B, B],
      [B, S, S, S, S, S, S, B],
      [B, S, B, S, S, B, S, B],
      [_, B, S, S, S, S, B, _],
      [_, B, B, _, _, B, B, _],
      [_, B, _, _, _, _, B, _],
    ]
    const frame1 = [
      [_, B, B, B, B, B, B, _],
      [B, B, R, B, B, R, B, B],
      [B, B, B, B, B, B, B, B],
      [B, S, S, S, S, S, S, B],
      [B, S, B, S, S, B, S, B],
      [_, B, S, S, S, S, B, _],
      [_, B, B, _, _, B, B, _],
      [B, _, B, _, _, B, _, B],
    ]
    return [frame0, frame1]
  }

  // Coin – 4×6 grid (animates shine)
  _coinFrames() {
    const _ = ""
    const Y = "#f5d800",
      W = "#fff",
      G = "#d4a000"
    return [
      [
        [_, Y, Y, _],
        [Y, W, Y, Y],
        [Y, Y, Y, Y],
        [Y, Y, Y, Y],
        [Y, Y, G, Y],
        [_, Y, Y, _],
      ],
      [
        [_, Y, Y, _],
        [Y, Y, W, Y],
        [Y, Y, Y, Y],
        [Y, Y, Y, Y],
        [Y, G, Y, Y],
        [_, Y, Y, _],
      ],
      [
        [_, Y, W, _],
        [Y, Y, Y, Y],
        [Y, Y, Y, Y],
        [Y, Y, Y, Y],
        [Y, Y, Y, Y],
        [_, Y, Y, _],
      ],
      [
        [_, W, Y, _],
        [Y, Y, Y, Y],
        [Y, Y, Y, Y],
        [Y, Y, Y, Y],
        [Y, Y, Y, Y],
        [_, Y, Y, _],
      ],
    ]
  }

  // Pixel cloud – drawn procedurally from a bitmap
  _drawCloud(x, y, s, alpha) {
    const _ = ""
    const W = "#fff",
      C = "#ddeeff"
    const cloud = [
      [_, _, W, W, W, _, _, _],
      [_, W, W, W, W, W, _, _],
      [W, W, C, W, W, W, W, _],
      [W, W, W, W, W, W, W, W],
      [_, W, W, W, W, W, W, _],
      [_, _, W, W, W, _, _, _],
    ]
    this.ctx.globalAlpha = alpha
    this._drawSprite(cloud, x, y, s)
    this.ctx.globalAlpha = 1
  }

  // 4×4 sparkle for coin collect
  _drawSparkle(x, y, s, age, totalLife) {
    const progress = age / totalLife
    const alpha = 1 - progress
    const spread = s * 3 * progress
    const ctx = this.ctx
    ctx.globalAlpha = alpha
    ctx.fillStyle = "#f5d800"
    const offsets = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
      [0, -1.5],
      [0, 1.5],
      [-1.5, 0],
      [1.5, 0],
    ]
    for (const [ox, oy] of offsets) {
      ctx.fillRect(
        Math.round(x + ox * spread),
        Math.round(y + oy * spread),
        s,
        s,
      )
    }
    ctx.globalAlpha = 1
  }

  // Pixel star (background)
  _drawStar(x, y, s, bright) {
    this.ctx.globalAlpha = bright ? 1 : 0.4
    this.ctx.fillStyle = bright ? "#fff" : "#aac"
    this.ctx.fillRect(x, y, s, s)
    this.ctx.globalAlpha = 1
  }

  // Ground tile row (brick / ground)
  _drawGround(s) {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const groundY = H - s * 4
    const tileW = s * 4

    // Ground fill
    ctx.fillStyle = "#6b3d0b"
    ctx.fillRect(0, groundY + s, W, H - groundY - s)

    // Top grass strip
    ctx.fillStyle = "#228b22"
    ctx.fillRect(0, groundY, W, s)

    // Brick pattern
    ctx.fillStyle = "#8B4513"
    for (let bx = 0; bx < W; bx += tileW) {
      for (let by = groundY + s; by < H; by += s * 2) {
        ctx.fillRect(bx, by, tileW - 1, s * 2 - 1)
      }
    }
    // Offset row
    ctx.fillStyle = "#7a3b10"
    for (let bx = -tileW / 2; bx < W; bx += tileW) {
      for (let by = groundY + s * 3; by < H; by += s * 4) {
        ctx.fillRect(bx, by, tileW - 1, s * 2 - 1)
      }
    }
    // Grass blades
    ctx.fillStyle = "#1a7a1a"
    for (let gx = 0; gx < W; gx += s * 2) {
      ctx.fillRect(gx, groundY - s, s, s)
    }
    for (let gx = s; gx < W; gx += s * 4) {
      ctx.fillRect(gx, groundY - s * 2, s, s * 2)
    }
  }

  // Question-block / brick block
  _drawBlock(x, y, s, type = "Q") {
    const ctx = this.ctx
    if (type === "Q") {
      ctx.fillStyle = "#f5a623"
      ctx.fillRect(x, y, s * 4, s * 4)
      ctx.fillStyle = "#3d1c02"
      ctx.fillRect(x, y, s * 4, s) // top border
      ctx.fillRect(x, y + s * 3, s * 4, s) // bottom border
      ctx.fillRect(x, y, s, s * 4) // left border
      ctx.fillRect(x + s * 3, y, s, s * 4) // right border
      // "?" symbol
      ctx.fillStyle = "#fff"
      ctx.fillRect(x + s * 1.5, y + s, s, s)
      ctx.fillRect(x + s * 1.5, y + s * 2, s, s)
    } else {
      ctx.fillStyle = "#8B4513"
      ctx.fillRect(x, y, s * 4, s * 4)
      ctx.fillStyle = "#6b3300"
      ctx.fillRect(x, y, s * 4, s)
      ctx.fillRect(x, y, s, s * 4)
    }
  }

  // Pixel bush / shrub
  _drawBush(x, y, s, alpha = 0.85) {
    const _ = ""
    const G = "#228b22",
      L = "#1a6a1a",
      H = "#33aa33"
    const bush = [
      [_, _, G, G, G, _, _, _, _, _],
      [_, G, H, G, G, H, G, _, _, _],
      [G, G, G, H, G, G, G, G, _, _],
      [G, L, G, G, G, L, G, G, G, _],
      [_, G, G, G, G, G, G, G, G, _],
      [_, _, L, G, L, G, L, G, _, _],
    ]
    this.ctx.globalAlpha = alpha
    this._drawSprite(bush, x, y, s)
    this.ctx.globalAlpha = 1
  }

  // ─── Scene initialization ─────────────────────────────────────────────────

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._initScene()
  }

  _initScene() {
    const W = this.canvas.width
    const H = this.canvas.height
    const s = this.S

    const groundY = H - s * 4

    // Stars (background layer)
    this.stars = []
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * W,
        y: Math.random() * (H * 0.55),
        bright: Math.random() < 0.3,
        twinkleOffset: Math.random() * 60,
      })
    }

    // Clouds
    this.clouds = []
    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        x: Math.random() * W,
        y: s * 4 + Math.random() * (H * 0.25),
        speed: 0.2 + Math.random() * 0.3,
        size: s * (1 + Math.floor(Math.random() * 2)),
        alpha: 0.55 + Math.random() * 0.35,
      })
    }

    // Platforms
    this.platforms = []
    const numP = Math.floor(W / (s * 60)) + 3
    for (let i = 0; i < numP; i++) {
      this.platforms.push({
        x: s * 20 + i * (s * 55 + Math.random() * s * 30),
        y: groundY - s * (8 + Math.floor(Math.random() * 8)),
        type: Math.random() < 0.5 ? "Q" : "B",
        hit: false,
        hitAnim: 0,
      })
    }

    // Coins (floating above platforms or in air)
    this.coins = []
    for (let i = 0; i < 12; i++) {
      const attachedToPlatform = i < this.platforms.length
      const px = attachedToPlatform
        ? this.platforms[i].x + s * 2
        : s * 30 + Math.random() * W
      const py = attachedToPlatform
        ? this.platforms[i].y - s * 6
        : groundY - s * (12 + Math.random() * 10)
      this.coins.push({
        x: px,
        y: py,
        frame: Math.floor(Math.random() * 4),
        frameTimer: 0,
        collected: false,
        floatOffset: Math.random() * Math.PI * 2,
      })
    }

    // Heroes
    this.heroes = []
    const numHeroes = Math.max(1, Math.floor(W / 600))
    for (let i = 0; i < numHeroes; i++) {
      this.heroes.push(
        this._createHero(i * (W / numHeroes) + Math.random() * 100),
      )
    }

    // Enemies
    this.enemies = []
    const numEnemies = Math.max(2, Math.floor(W / 400))
    for (let i = 0; i < numEnemies; i++) {
      this.enemies.push({
        x: 200 + i * (W / numEnemies) + Math.random() * 100,
        y: groundY - s * 8,
        speed: -(0.6 + Math.random() * 0.5),
        frame: 0,
        frameTimer: 0,
        flipX: true,
      })
    }

    this.particles = []
  }

  _createHero(startX) {
    const s = this.S
    const H = this.canvas.height
    const groundY = H - s * 4
    return {
      x: startX || -s * 10,
      y: groundY - s * 12,
      speed: 1.2 + Math.random() * 0.6,
      frame: 0,
      frameTimer: 0,
      jumping: false,
      jumpVy: 0,
      jumpY: groundY - s * 12,
      jumpTimer: 0,
      nextJump: 60 + Math.floor(Math.random() * 120),
    }
  }

  // ─── Update logic ─────────────────────────────────────────────────────────

  _update() {
    const W = this.canvas.width
    const H = this.canvas.height
    const s = this.S
    const groundY = H - s * 4

    this.tick++

    // Clouds scroll
    for (const c of this.clouds) {
      c.x -= c.speed
      if (c.x + s * 8 < 0) c.x = W + s * 8
    }

    // Coin animation
    for (const coin of this.coins) {
      if (coin.collected) continue
      coin.frameTimer++
      if (coin.frameTimer >= 5) {
        coin.frameTimer = 0
        coin.frame = (coin.frame + 1) % 4
      }
      coin.floatOffset += 0.04
      coin.y += Math.sin(coin.floatOffset) * 0.4
    }

    // Heroes
    for (const h of this.heroes) {
      h.x += h.speed
      h.frameTimer++
      if (h.frameTimer >= 8) {
        h.frameTimer = 0
        h.frame = (h.frame + 1) % 2
      }

      // Trigger jump
      h.jumpTimer++
      if (!h.jumping && h.jumpTimer >= h.nextJump) {
        h.jumping = true
        h.jumpVy = -(s * 4.5)
        h.jumpY = h.y
        h.jumpTimer = 0
        h.nextJump = 80 + Math.floor(Math.random() * 120)
      }
      if (h.jumping) {
        h.jumpVy += s * 0.45 // gravity
        h.y += h.jumpVy
        if (h.y >= groundY - s * 12) {
          h.y = groundY - s * 12
          h.jumping = false
          h.jumpVy = 0
        }
      }

      // Coin collect
      for (const coin of this.coins) {
        if (coin.collected) continue
        const dx = Math.abs(h.x - coin.x),
          dy = Math.abs(h.y - coin.y)
        if (dx < s * 10 && dy < s * 10) {
          coin.collected = true
          this.particles.push({
            x: coin.x + s * 2,
            y: coin.y,
            age: 0,
            life: 20,
          })
        }
      }

      // Recycle hero (or restore coin)
      if (h.x > W + s * 20) {
        h.x = -s * 20
        h.y = groundY - s * 12
        h.frame = 0
        // Restore all coins
        for (const coin of this.coins) coin.collected = false
      }
    }

    // Enemies patrol
    for (const e of this.enemies) {
      e.x += e.speed
      e.frameTimer++
      if (e.frameTimer >= 10) {
        e.frameTimer = 0
        e.frame = (e.frame + 1) % 2
      }
      e.flipX = e.speed < 0
      if (e.x < -s * 20) {
        e.x = W + s * 5
        e.speed = -(0.6 + Math.random() * 0.5)
      }
      if (e.x > W + s * 20) {
        e.x = -s * 5
        e.speed = 0.6 + Math.random() * 0.5
        e.flipX = false
      }
    }

    // Sparkle particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].age++
      if (this.particles[i].age >= this.particles[i].life)
        this.particles.splice(i, 1)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  _draw() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    const s = this.S
    const groundY = H - s * 4
    const coinFrames = this._coinFrames()
    const heroFrames = this._heroFrames
    const enemyFrames = this._enemyFrames

    ctx.clearRect(0, 0, W, H)

    // Sky gradient (night → dusk)
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, "#05051a")
    sky.addColorStop(0.55, "#0a1533")
    sky.addColorStop(1, "#1a1a2e")
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)

    // Stars (twinkle)
    for (const st of this.stars) {
      const on = (this.tick + st.twinkleOffset) % 40 < 30
      if (on) this._drawStar(st.x, st.y, s, st.bright)
    }

    // Moon
    ctx.globalAlpha = 0.9
    ctx.fillStyle = "#fffacd"
    const moonX = W * 0.85,
      moonY = H * 0.1,
      moonR = s * 5
    ctx.beginPath()
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2)
    ctx.fill()
    // Crater
    ctx.globalAlpha = 0.25
    ctx.fillStyle = "#ccc"
    ctx.beginPath()
    ctx.arc(
      moonX + moonR * 0.3,
      moonY - moonR * 0.2,
      moonR * 0.3,
      0,
      Math.PI * 2,
    )
    ctx.fill()
    ctx.globalAlpha = 1

    // Clouds
    for (const c of this.clouds) {
      this._drawCloud(c.x, c.y, c.size, c.alpha)
    }

    // Bushes (background layer, static)
    const bushPositions = [W * 0.08, W * 0.25, W * 0.5, W * 0.72, W * 0.9]
    for (const bx of bushPositions) {
      this._drawBush(bx, groundY - s * 6, s, 0.7)
    }

    // Platforms / blocks
    for (const pl of this.platforms) {
      if (pl.x > -s * 20 && pl.x < W + s * 20) {
        const offY = pl.hit ? Math.sin(pl.hitAnim * 0.5) * s * -2 : 0
        this._drawBlock(pl.x, pl.y + offY, s, pl.type)
        if (pl.hit) {
          pl.hitAnim++
          if (pl.hitAnim > 12) {
            pl.hit = false
            pl.hitAnim = 0
          }
        }
      }
    }

    // Coins
    for (const coin of this.coins) {
      if (coin.collected) continue
      if (coin.x > -s * 8 && coin.x < W + s * 8) {
        this._drawSprite(coinFrames[coin.frame], coin.x, coin.y, s)
      }
    }

    // Ground
    this._drawGround(s)

    // Sparkles
    for (const sp of this.particles) {
      this._drawSparkle(sp.x, sp.y, s, sp.age, sp.life)
    }

    // Enemies
    for (const e of this.enemies) {
      if (e.x < -s * 20 || e.x > W + s * 20) continue
      this._drawSprite(enemyFrames[e.frame], e.x, e.y, s, e.flipX)
    }

    // Heroes
    for (const h of this.heroes) {
      if (h.x < -s * 20 || h.x > W + s * 20) continue
      this._drawSprite(heroFrames[h.frame], h.x, h.y, s, false)
    }

    // Retro scanline overlay (subtle CRT feel)
    ctx.globalAlpha = 0.04
    ctx.fillStyle = "#000"
    for (let ly = 0; ly < H; ly += 4) {
      ctx.fillRect(0, ly, W, 2)
    }
    ctx.globalAlpha = 1
  }

  // ─── Loop ─────────────────────────────────────────────────────────────────

  animate(currentTime = 0) {
    if (!this.active) return
    this._animId = requestAnimationFrame((t) => this.animate(t))
    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)
    this._update()
    this._draw()
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.tick = 0
    this._initScene()
    this.animate(0)
    this.canvas.style.display = "block"
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }
}
