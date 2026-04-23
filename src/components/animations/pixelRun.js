/**
 * PixelRunEffect — Premium 8-bit side-scroller action game
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
    this.arrows = []
    this.towers = []
    this.bossProjectiles = []
    this.items = []
    this.allies = []
    this.boss = null
    this.level = 1

    this.keys = { up: false, down: false, left: false, right: false, shoot: false, sword: false, shield: false, shotgun: false }

    this._resizeHandler = () => this.resize()
    this._keydownHandler = (e) => this._handleKey(e, true)
    this._keyupHandler = (e) => this._handleKey(e, false)

    window.addEventListener("resize", this._resizeHandler)
    this.resize()
  }

  _handleKey(e, isPressed) {
    if (!this.active) return
    const key = e.key.toLowerCase()
    if (key === "w" || e.key === "ArrowUp") this.keys.up = isPressed
    if (key === "s" || e.key === "ArrowDown") this.keys.down = isPressed
    if (key === "a" || e.key === "ArrowLeft") this.keys.left = isPressed
    if (key === "d" || e.key === "ArrowRight") this.keys.right = isPressed
    if (key === "j") this.keys.shoot = isPressed
    if (key === "k") this.keys.sword = isPressed
    if (key === "l") this.keys.shield = isPressed
    if (key === "u") this.keys.shotgun = isPressed
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "j", "k", "l", "u"].includes(e.key.toLowerCase())) {
      e.preventDefault()
    }
  }

  get S() {
    return Math.max(2, Math.floor(Math.min(this.canvas.width, this.canvas.height) / 220))
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

  // ─── Sprites ─────────────────────────────────────────────────────────────

  get _heroFrames() {
    const _ = ""
    const R = "#FF3D3D", S = "#FFD1A4", W = "#FFFFFF", B = "#1A1A1A", bl = "#4D4DFF", br = "#7A4419", G = "#FFD700"
    const f0 = [[_,_,B,B,B,B,_,_],[_,B,R,R,R,R,B,G],[_,B,R,R,R,R,R,B],[_,B,S,B,S,S,S,B],[B,S,B,S,S,B,S,B],[B,S,S,S,S,S,S,B],[_,B,S,S,S,S,B,_],[_,_,B,R,R,B,_,_],[_,B,R,bl,bl,R,B,_],[B,R,bl,bl,bl,bl,R,B],[B,B,B,bl,bl,B,B,B],[_,_,br,br,br,br,_,_]]
    const f1 = [[_,_,B,B,B,B,_,_],[_,B,R,R,R,R,B,G],[_,B,R,R,R,R,R,B],[_,B,S,B,S,S,S,B],[B,S,B,S,S,B,S,B],[B,S,S,S,S,S,S,B],[_,B,S,S,S,S,B,_],[_,_,B,R,R,B,_,_],[_,B,R,bl,bl,R,B,_],[_,B,bl,bl,bl,bl,B,_],[_,B,bl,B,B,bl,B,_],[_,br,br,_,_,br,br,_]]
    return [f0, f1]
  }

  get _allyFrames() {
    const _ = ""
    const G = "#32CD32", S = "#FFD1A4", W = "#FFFFFF", B = "#1A1A1A", bl = "#4D4DFF"
    const f0 = [[_,_,B,B,B,B,_,_],[_,B,G,G,G,G,B,_],[_,B,G,G,G,G,G,B],[_,B,S,B,S,S,S,B],[B,S,B,S,S,B,S,B],[B,S,S,S,S,S,S,B],[_,B,S,S,S,S,B,_],[_,_,B,G,G,B,_,_],[_,B,G,bl,bl,G,B,_],[B,G,bl,bl,bl,bl,G,B],[B,B,B,bl,bl,B,B,B],[_,_,B,B,B,B,_,_]]
    return [f0, f0]
  }

  get _enemyFrames() {
    const _ = ""
    const B = "#2D1B00", R = "#FF0000", S = "#D2691E", W = "#FFFFFF", P = "#800080", G = "#006400"
    let bodyColor = this.level > 7 ? G : (this.level > 3 ? P : S)
    const f0 = [[_,_,B,B,B,B,_,_],[_,B,bodyColor,bodyColor,bodyColor,bodyColor,B,_],[B,bodyColor,bodyColor,bodyColor,bodyColor,bodyColor,bodyColor,B],[B,bodyColor,W,bodyColor,bodyColor,W,bodyColor,B],[B,bodyColor,R,bodyColor,bodyColor,R,bodyColor,B],[B,bodyColor,bodyColor,bodyColor,bodyColor,bodyColor,bodyColor,B],[_,B,B,B,B,B,B,_],[_,B,B,_,_,B,B,_]]
    const f1 = [[_,_,B,B,B,B,_,_],[_,B,bodyColor,bodyColor,bodyColor,bodyColor,B,_],[B,bodyColor,bodyColor,bodyColor,bodyColor,bodyColor,bodyColor,B],[B,bodyColor,W,bodyColor,bodyColor,W,bodyColor,B],[B,bodyColor,R,bodyColor,bodyColor,R,bodyColor,B],[B,bodyColor,bodyColor,bodyColor,bodyColor,bodyColor,bodyColor,B],[_,B,B,B,B,B,B,_],[B,B,_,_,_,_,B,B]]
    const fDead = [[_,_,_,_,_,_,_,_],[_,_,_,_,_,_,_,_],[_,_,_,_,_,_,_,_],[_,_,_,_,_,_,_,_],[_,B,B,B,B,B,B,_],[B,bodyColor,bodyColor,bodyColor,bodyColor,bodyColor,bodyColor,B],[B,bodyColor,R,bodyColor,bodyColor,R,bodyColor,B],[B,B,B,B,B,B,B,B]]
    return [f0, f1, fDead]
  }

  get _flyingEnemyFrames() {
    const _ = "", B = "#000", W = "#fff", R = "#f00"
    const f0 = [[_,_,B,B,_,_],[_,B,W,W,B,_],[B,W,R,R,W,B],[B,W,W,W,W,B],[_,B,B,B,B,_],[B,_,_,_,_,B]]
    const f1 = [[_,_,B,B,_,_],[_,B,W,W,B,_],[B,W,R,R,W,B],[B,W,W,W,W,B],[_,B,B,B,B,_],[_,B,_,_,B,_]]
    return [f0, f1]
  }

  get _slimeBossFrames() {
    const _ = "", G = "#00FF00", D = "#008800", W = "#FFFFFF"
    return [[[_,G,G,G,G,_],[G,G,G,G,G,G],[G,W,G,G,W,G],[G,G,G,G,G,G],[D,D,D,D,D,D]]]
  }

  get _wraithBossFrames() {
    const _ = "", B = "#111", P = "#440044", W = "#fff"
    const f0 = [[_,B,B,_,],[B,P,P,B],[B,W,W,B],[B,P,P,B],[_,B,B,_,]]
    return [f0]
  }

  get _arrowSprite() { return [["#1A1A1A", "#1A1A1A", "#1A1A1A", "#1A1A1A", "#FFFFFF"]] }
  get _shotgunPelletSprite() { return [["#FFD700"]] }
  get _bowSprite() {
    const br = "#7A4419", W = "#FFFFFF", _ = ""
    return [[_, br, W],[br, _, W],[br, _, W],[_, br, W]]
  }
  get _swordSprite() {
    const W = "#FFFFFF", s = "#CCCCCC", _ = ""
    return [[_,_,W,W],[_,W,s,_],[W,s,_,_]]
  }
  get _shieldSprite() {
    const br = "#5C3A21", B = "#1A1A1A"
    return [[B,B],[br,br],[br,br],[br,br],[br,br],[B,B]]
  }
  get _itemSprites() {
    const R = "#FF0000", W = "#FFFFFF", B = "#000000", Y = "#FFD700", G = "#00FF00", _ = ""
    return {
      medkit: [[_,R,R,_],[R,W,W,R],[R,W,W,R],[_,R,R,_]],
      shotgunAmmo: [[Y,Y,B],[Y,Y,B],[Y,Y,B]],
      allySpawn: [[_,G,G,_],[G,B,B,G],[G,B,B,G],[_,G,G,_]]
    }
  }

  get _towerSprite() {
    const br = "#808080", B = "#1A1A1A", D = "#404040"
    return [[B,B,B,B,B,B,B,B],[br,D,br,D,br,D,br,B],[br,br,br,br,br,br,br,B],[D,br,D,br,D,br,D,B],[br,br,br,br,br,br,br,B],[br,D,br,D,br,D,br,B],[br,br,br,br,br,br,br,B],[B,B,B,B,B,B,B,B]]
  }

  get _bossFrames() {
    const R = "#AA0000", D = "#550000", Y = "#FFFF00", _ = "", B = "#000000"
    const f0 = [[_,_,D,D,D,_,_,_],[_,D,R,R,R,D,_,_],[D,R,Y,R,R,R,D,_],[D,R,R,R,R,R,R,D],[_,D,R,R,R,R,D,_],[_,_,D,R,R,D,_,_],[_,D,R,R,R,R,D,_],[_,D,D,_,_,D,D,_]]
    const f1 = [[_,_,_,D,D,D,_,_],[_,_,D,R,R,R,D,_],[_,D,R,Y,R,R,R,D],[_,D,R,R,R,R,R,D],[_,_,D,R,R,R,D,_],[_,_,_,D,R,R,D,_],[_,_,D,R,R,R,D,_],[_,_,D,D,_,D,D,_]]
    return [f0, f1]
  }

  get _fireballSprite() { return [["#FF0000","#FFFF00","#FF0000"],["#FFFF00","#FFFF00","#FFFF00"],["#FF0000","#FFFF00","#FF0000"]] }

  _drawQuestionBlock(ctx, x, y, s, offset = 0) {
    const Y1 = "#FFD700", B = "#000000"
    ctx.fillStyle = Y1; ctx.fillRect(x, y + offset, s*8, s*8)
    ctx.fillStyle = B; ctx.strokeRect(x, y + offset, s*8, s*8)
  }

  _drawBrickBlock(ctx, x, y, s, offset = 0) {
    const br1 = "#CD5C5C", B = "#000000"
    ctx.fillStyle = br1; ctx.fillRect(x, y + offset, s*8, s*8)
    ctx.strokeStyle = B; ctx.strokeRect(x, y + offset, s*8, s*8)
  }

  _coinFrames() {
    const Y = "#FFD700", W = "#FFF", G = "#B8860B", _ = ""
    return [[[_,Y,Y,_],[Y,W,Y,Y],[Y,Y,Y,Y],[Y,Y,G,Y],[_,Y,Y,_]]]
  }

  _drawMountains(s) {
    const groundY = this.canvas.height - s * 4
    for (const m of this.mountains) {
      this.ctx.fillStyle = m.color; this.ctx.beginPath(); this.ctx.moveTo(m.x, groundY); this.ctx.lineTo(m.x + m.w / 2, groundY - m.h); this.ctx.lineTo(m.x + m.w, groundY); this.ctx.fill()
    }
  }

  _drawGround(s) {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height, groundY = H - s * 4
    const isDark = this.level > 5
    const br1 = isDark ? "#2a2226" : "#924831", br2 = isDark ? "#1a1618" : "#4b2518", B = "#000000"
    for (let x = 0; x < W; x += s * 8) {
      ctx.fillStyle = (Math.floor(x / (s * 8)) % 2 === 0) ? br1 : br2
      ctx.fillRect(x, groundY, s * 8, H - groundY)
      ctx.strokeStyle = B; ctx.strokeRect(x, groundY, s * 8, H - groundY)
    }
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this._initScene()
  }

  _initScene() {
    const W = this.canvas.width, H = this.canvas.height, s = this.S, groundY = H - s * 4
    this.tick = 0
    this.mountains = []
    const mountColor = this.level > 7 ? "#000" : (this.level > 4 ? "#111" : "#1a2a4a")
    for(let i=0; i<8; i++) this.mountains.push({ x: Math.random() * W * 2, w: 200 + Math.random() * 400, h: 100 + Math.random() * 200, speed: 0.1, color: mountColor })
    this.clouds = []
    for (let i = 0; i < 6; i++) this.clouds.push({ x: Math.random() * W, y: H * 0.1 + Math.random() * H * 0.2, speed: 0.2 + Math.random() * 0.3 })
    this.platforms = []
    for (let i = 0; i < Math.floor(W / 250); i++) this.platforms.push({ x: 200 + i * 350 + Math.random() * 100, y: groundY - s * 22, type: Math.random() < 0.4 ? "Q" : "B", bump: 0 })
    this.coins = []
    this.platforms.forEach(p => this.coins.push({ x: p.x + s*2, y: p.y - s*10, collected: false }))
    
    if (this.heroes.length === 0 || this.level === 1) {
      this.heroes = [{ x: 100, y: groundY - s*12, hp: 100, speed: 5, frame: 0, timer: 0, jumping: false, vy: 0, flipX: false, isAuto: true, flicker: 0, shootTimer: 0, swordTimer: 0, shieldActive: false, shotgunAmmo: 5 }]
      this.allies = []
    } else {
      const h = this.heroes[0]
      h.x = 100; h.y = groundY - s*12; h.vy = 0; h.jumping = false
    }
    
    this.enemies = []
    let numEnemies = 3 + this.level
    for(let i=0; i<numEnemies; i++) {
       const isFlying = Math.random() < (this.level * 0.1)
       this.enemies.push(this._createEnemy(W + i * 400, isFlying))
    }
    
    this.particles = []
    this.arrows = []
    this.bossProjectiles = []
    this.items = []
    this.towers = []
    
    const numTowers = Math.min(this.level, 6)
    for(let i=0; i<numTowers; i++) {
      this.towers.push({ x: 700 + i * 500 + Math.random()*200, y: groundY - s * 8, timer: Math.random()*100 })
    }
    
    for(let i=0; i<3; i++) {
      const types = ["medkit", "shotgunAmmo", "allySpawn"]
      this.items.push({ x: 500 + Math.random() * (W - 1000), y: groundY - s * 4, type: types[Math.floor(Math.random()*3)], collected: false })
    }
    
    this.boss = null
    if (this.level === 4) {
      this.boss = { type: "slime", x: W - s*40, y: groundY - s*16, hp: 50, maxHp: 50, timer: 0, frame: 0, dead: false, deadTimer: 0, vy: 0 }
    } else if (this.level === 7) {
      this.boss = { type: "wraith", x: W - s*40, y: groundY - s*40, hp: 80, maxHp: 80, timer: 0, frame: 0, dead: false, deadTimer: 0, vy: 2 }
    } else if (this.level === 10) {
      this.boss = { type: "dragon", x: W - s*60, y: groundY - s*40, hp: 150, maxHp: 150, timer: 0, frame: 0, dead: false, deadTimer: 0, vy: -3 }
    }
  }

  _createEnemy(startX, isFlying = false) {
    const s = this.S, H = this.canvas.height, gY = H - s*4
    const baseSpeed = 1.5 + (this.level * 0.25)
    return { 
      x: startX, 
      y: isFlying ? gY - s * 25 : gY - s * 8, 
      speed: -(baseSpeed + Math.random() * 1.5), 
      frame: 0, timer: 0, dead: false, deadTimer: 0, vy: 0, 
      jumping: false, isFlying, floatTick: Math.random() * 10
    }
  }

  _update() {
    const W = this.canvas.width, H = this.canvas.height, s = this.S, gY = H - s*4
    this.tick++
    this.mountains.forEach(m => { m.x -= m.speed; if (m.x + m.w < 0) m.x = W + 100 })
    this.clouds.forEach(c => { c.x -= c.speed; if (c.x + 100 < 0) c.x = W + 100 })

    const h = this.heroes[0]
    if (!h) return
    if (h.hp <= 0) { this.level = 1; this._initScene(); return }

    if (this.keys.up || this.keys.left || this.keys.right || this.keys.shoot || this.keys.sword || this.keys.shield || this.keys.shotgun) h.isAuto = false
    if (h.flicker > 0) h.flicker--
    h.shieldActive = this.keys.shield
    let currentSpeed = h.shieldActive ? h.speed * 0.5 : h.speed

    if (h.isAuto) {
      h.x += currentSpeed; h.flipX = false
      if (!h.jumping && Math.random() < 0.03) { h.jumping = true; h.vy = -s * 7 }
    } else {
      if (this.keys.left) { h.x -= currentSpeed * 1.5; h.flipX = true }
      if (this.keys.right) { h.x += currentSpeed * 1.5; h.flipX = false }
      if (this.keys.up && !h.jumping && !h.shieldActive) { h.jumping = true; h.vy = -s * 8 }
      
      if (this.keys.shoot && h.shootTimer === 0 && !h.shieldActive) {
        h.shootTimer = 10
        this.arrows.push({ x: h.flipX ? h.x - s * 2 : h.x + s * 6, y: h.y + s * 5, vx: h.flipX ? -s * 12 : s * 12, flipX: h.flipX, type: "arrow" })
      }
      if (this.keys.shotgun && h.shootTimer === 0 && h.shotgunAmmo > 0 && !h.shieldActive) {
        h.shootTimer = 20; h.shotgunAmmo--
        for(let i=-2; i<=2; i++) this.arrows.push({ x: h.flipX ? h.x - s * 2 : h.x + s * 6, y: h.y + s * 5, vx: h.flipX ? -s * 10 : s * 10, vy: i * s, flipX: h.flipX, type: "pellet" })
      }
      if (this.keys.sword && h.swordTimer === 0 && !h.shieldActive) {
        h.swordTimer = 12
        const ax = h.flipX ? h.x - s * 12 : h.x + s * 12
        this.enemies.forEach(e => { if (!e.dead && Math.abs(ax - e.x) < s * 20 && Math.abs(h.y - e.y) < s * 20) { e.dead = true; e.frame = 2 } })
        if (this.boss && !this.boss.dead && Math.abs(ax - this.boss.x) < s * 45 && Math.abs(h.y - this.boss.y) < s * 45) {
          this.boss.hp -= 6; if (this.boss.hp <= 0) this.boss.dead = true
        }
      }
      if (h.x < 0) h.x = 0
      if (h.x > W - s*8 && (!this.boss || this.boss.dead)) {
         this.level++; if(this.level > 10) this.level = 1; this._initScene(); return
      } else if (h.x > W - s*8) { h.x = W - s*8 }
    }
    
    if (h.shootTimer > 0) h.shootTimer--
    if (h.swordTimer > 0) h.swordTimer--
    h.timer++; if (h.timer > 5) { h.timer = 0; h.frame = (h.frame + 1) % 2 }

    // Physics
    let onPlatform = false
    const hw = s * 8, hh = s * 12
    for (const p of this.platforms) {
      if (h.vy >= 0 && h.x + hw*0.8 > p.x && h.x + hw*0.2 < p.x + s*8 && h.y + hh >= p.y && h.y + hh <= p.y + s*4) {
        h.y = p.y - hh; h.jumping = false; h.vy = 0; onPlatform = true; break
      }
      if (h.vy < 0 && h.x + hw*0.8 > p.x && h.x + hw*0.2 < p.x + s*8 && h.y <= p.y + s*8 && h.y >= p.y + s*4) {
        h.vy = 0; p.bump = -s * 3
      }
    }
    if (h.jumping || (!onPlatform && h.y < gY - hh)) {
      h.jumping = true; h.vy += s * 0.7; h.y += h.vy
      if (h.y >= gY - hh) { h.y = gY - hh; h.jumping = false; h.vy = 0 }
    }

    // Smart Allies
    for (let i = this.allies.length - 1; i >= 0; i--) {
      const a = this.allies[i]
      const targetX = h.x - (i + 1) * s * 15 * (h.flipX ? -1 : 1)
      const dist = Math.abs(a.x - targetX)
      if (dist > s * 10) {
        a.x += (targetX - a.x) * 0.08
        a.frame = (this.tick % 10 < 5) ? 0 : 1
      } else { a.frame = 0 }
      a.y += (h.y - a.y) * 0.1
      
      // Auto-shoot at nearest enemy
      if (this.tick % (50 + i * 5) === 0) {
        let nearestE = null, minDist = 800 * s
        this.enemies.forEach(e => {
          if (!e.dead) {
            const d = Math.abs(e.x - a.x)
            if (d < minDist) { minDist = d; nearestE = e }
          }
        })
        if (nearestE) {
          const shootFlip = nearestE.x < a.x
          this.arrows.push({ x: a.x, y: a.y + s*5, vx: shootFlip ? -s*12 : s*12, flipX: shootFlip, type: "arrow" })
        }
      }
      
      for (const e of this.enemies) {
        if (!e.dead && Math.abs(a.x - e.x) < s*10 && Math.abs(a.y - e.y) < s*10) { this.allies.splice(i, 1); break }
      }
    }

    // Items
    this.items.forEach(it => {
      if (!it.collected && Math.abs(h.x - it.x) < s*12 && Math.abs(h.y - it.y) < s*12) {
        it.collected = true
        if (it.type === "medkit") h.hp = Math.min(100, h.hp + 40)
        else if (it.type === "shotgunAmmo") h.shotgunAmmo += 10
        else if (it.type === "allySpawn") this.allies.push({ x: h.x, y: h.y, frame: 0, timer: 0 })
      }
    })

    // Enemies
    this.enemies.forEach((e, idx) => {
      if (e.dead) { e.deadTimer++; if (e.deadTimer > 25) this.enemies[idx] = this._createEnemy(W + 200, Math.random() < 0.2); return }
      e.x += e.speed
      if (e.isFlying) { e.floatTick += 0.1; e.y += Math.sin(e.floatTick) * 3 }
      else {
        if (!e.jumping && Math.abs(e.x - h.x) < s*60 && h.y < e.y - s*10 && Math.random() < 0.05) { e.jumping = true; e.vy = -s*6 }
        if (e.jumping) { e.vy += s*0.5; e.y += e.vy; if (e.y >= gY - s*8) { e.y = gY - s*8; e.jumping = false } }
      }
      if (e.x < -200) e.x = W + 200
      
      // COLLISION HERO vs ENEMY (Restore jump to kill)
      if (Math.abs(h.x - e.x) < s * 10 && Math.abs(h.y - e.y) < s * 12) {
        if (h.vy > 0 && h.y < e.y - s * 2) { 
          e.dead = true; h.vy = -s * 6; h.jumping = true // KILLED BY JUMP
        } else if (!h.shieldActive && h.flicker === 0) {
          h.hp -= 20; h.flicker = 30
          if (this.allies.length > 0) this.allies.splice(0, 1)
        }
      }
    })

    // Boss logic
    if (this.boss && !this.boss.dead) {
      if (this.boss.type === "slime") {
        this.boss.timer++; if (this.boss.timer > 25) { this.boss.timer = 0; this.bossProjectiles.push({ x: this.boss.x, y: this.boss.y, vx: -s*14, vy: -s*3 }) }
      } else if (this.boss.type === "wraith") {
        this.boss.y += this.boss.vy; if (this.boss.y < gY - s*45 || this.boss.y > gY - s*15) this.boss.vy *= -1
        if (this.tick % 20 === 0) this.bossProjectiles.push({ x: this.boss.x, y: this.boss.y + s*4, vx: -s*18, vy: 0 })
      } else if (this.boss.type === "dragon") {
        this.boss.y += this.boss.vy; if (this.boss.y < gY - s*50 || this.boss.y > gY - s*10) this.boss.vy *= -1
        if (Math.random() < 0.12) this.bossProjectiles.push({ x: this.boss.x, y: this.boss.y + s*10, vx: -s*15, vy: (Math.random()-0.5)*s*8 })
      }
      if (h.flicker === 0 && Math.abs(h.x - this.boss.x) < s*35 && Math.abs(h.y - this.boss.y) < s*35) { 
        h.hp -= 30; h.flicker = 30;
        if (this.allies.length > 0) this.allies.splice(0, 1)
      }
    }

    // Projectiles
    this.arrows.forEach((a, i) => {
      a.x += a.vx; a.y += (a.vy || 0)
      if (a.x < -100 || a.x > W + 100) this.arrows.splice(i, 1)
      else {
        this.enemies.forEach(e => { if(!e.dead && Math.abs(a.x - e.x) < s*12 && Math.abs(a.y - e.y) < s*12) { e.dead = true; this.arrows.splice(i, 1) } })
        if (this.boss && !this.boss.dead && Math.abs(a.x - this.boss.x) < s*35 && Math.abs(a.y - this.boss.y) < s*35) {
          this.boss.hp -= (a.type === "pellet" ? 0.7 : 1.8); if (this.boss.hp <= 0) this.boss.dead = true; this.arrows.splice(i, 1)
        }
      }
    })

    this.bossProjectiles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy; if (p.x < -100) this.bossProjectiles.splice(i, 1)
      else if (h.shieldActive && Math.abs(p.x - h.x) < s*18 && Math.abs(p.y - h.y) < s*18) this.bossProjectiles.splice(i, 1)
      else if (h.flicker === 0 && Math.abs(p.x - h.x) < s*12 && Math.abs(p.y - h.y) < s*12) { 
        h.hp -= 20; h.flicker = 30; this.bossProjectiles.splice(i, 1)
        if (this.allies.length > 0) this.allies.splice(0, 1)
      }
    })

    this.towers.forEach(t => {
      t.timer++; if (t.timer > 70 - this.level * 4) {
        t.timer = 0; if (t.x < W) this.bossProjectiles.push({ x: t.x, y: t.y + s*2, vx: -s * (5 + this.level*0.4), vy: 0 })
      }
    })

    this.particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.5; p.life -= 0.05
      if (p.life <= 0) this.particles.splice(i, 1)
    })
  }

  _draw() {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height, s = this.S
    ctx.clearRect(0, 0, W, H)
    const skyColors = [["#5C94FC","#94B4FF"], ["#2B1B3D","#543C65"], ["#000","#200"]]
    const cSet = this.level > 7 ? skyColors[2] : (this.level > 4 ? skyColors[1] : skyColors[0])
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, cSet[0]); sky.addColorStop(1, cSet[1])
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
    this._drawMountains(s); this._drawGround(s)
    this.platforms.forEach(p => { if (p.type === "Q") this._drawQuestionBlock(ctx, p.x, p.y, s, p.bump); else this._drawBrickBlock(ctx, p.x, p.y, s, p.bump) })
    this.items.forEach(it => { if(!it.collected) this._drawSprite(this._itemSprites[it.type], it.x, it.y, s) })
    this.allies.forEach(a => this._drawSprite(this._allyFrames[a.frame], a.x, a.y, s))
    this.towers.forEach(t => this._drawSprite(this._towerSprite, t.x, t.y, s))
    
    const h = this.heroes[0]
    if (h && h.flicker % 4 < 2) {
      this._drawSprite(this._heroFrames[h.frame], h.x, h.y, s, h.flipX)
      if (h.shootTimer > 0) this._drawSprite(this._bowSprite, h.flipX ? h.x - s*4 : h.x + s*8, h.y + s*4, s, h.flipX)
      if (h.swordTimer > 0) this._drawSprite(this._swordSprite, h.flipX ? h.x - s*6 : h.x + s*10, h.y + s*4, s, h.flipX)
      if (h.shieldActive) this._drawSprite(this._shieldSprite, h.flipX ? h.x - s*2 : h.x + s*10, h.y + s*2, s, h.flipX)
    }
    this.enemies.forEach(e => { 
      const sprite = e.isFlying ? this._flyingEnemyFrames[e.frame] : this._enemyFrames[e.frame]
      const alpha = e.dead ? Math.max(0, 1 - e.deadTimer / 25) : 1
      this._drawSprite(sprite, e.x, e.y, s, e.speed > 0, alpha) 
    })
    this.arrows.forEach(a => this._drawSprite(a.type === "pellet" ? this._shotgunPelletSprite : this._arrowSprite, a.x, a.y, s))
    this.bossProjectiles.forEach(p => this._drawSprite(this._fireballSprite, p.x, p.y, s))
    if (this.boss) {
      const alpha = this.boss.dead ? Math.max(0, 1 - this.boss.deadTimer / 40) : 1
      let bS = this.boss.type === "slime" ? this._slimeBossFrames[0] : (this.boss.type === "wraith" ? this._wraithBossFrames[0] : this._bossFrames[this.boss.frame])
      this._drawSprite(bS, this.boss.x, this.boss.y, s*6, false, alpha)
    }

    // UI
    ctx.fillStyle = "white"; ctx.font = `bold ${s*4}px monospace`
    ctx.fillText(`LVL: ${this.level} - SWORDSMAN`, 20, 40)
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(20, 55, 200, s*3)
    ctx.fillStyle = "#FF3D3D"; ctx.fillRect(20, 55, Math.max(0, h.hp * 2), s*3)
    ctx.fillStyle = "white"; ctx.fillText(`HP: ${Math.ceil(h.hp)}`, 20, 85)
    ctx.fillText(`SG: ${h.shotgunAmmo}`, 20, 115)
    ctx.fillText(`ALLIES: ${this.allies.length}`, 20, 145)
    if(this.boss && !this.boss.dead) { ctx.fillStyle = "red"; ctx.fillText(`${this.boss.type.toUpperCase()}: ${Math.ceil(this.boss.hp)}`, W/2 - s*30, 40) }

    // Controls Guide
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(W - 220, 20, 200, 200)
    ctx.fillStyle = "white"; ctx.font = `bold ${s*3}px monospace`
    ctx.fillText("CONTROLS:", W - 210, 45)
    ctx.font = `${s*2.5}px monospace`
    ctx.fillText("W/UP: Jump", W - 210, 75)
    ctx.fillText("A/D: Move", W - 210, 105)
    ctx.fillText("J: Bow", W - 210, 135)
    ctx.fillText("K: Sword", W - 210, 165)
    ctx.fillText("L: Shield", W - 210, 195)
    ctx.fillText("U: Shotgun", W - 210, 225)
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
    this.active = true; this._initScene(); this.animate(0); this.canvas.style.display = "block"
    window.addEventListener("keydown", this._keydownHandler); window.addEventListener("keyup", this._keyupHandler)
  }

  stop() {
    this.active = false; if (this._animId) cancelAnimationFrame(this._animId)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); this.canvas.style.display = "none"
    window.removeEventListener("keydown", this._keydownHandler); window.removeEventListener("keyup", this._keyupHandler)
    this.keys = { up: false, down: false, left: false, right: false, shoot: false, sword: false, shield: false, shotgun: false }
  }
}
