export class RetroGameEffect {
  constructor(canvasId, color = "#00ff00", type = "space_invaders") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.type = type
    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this.rafId = null
    this.gameState = { level: 1, score: 0 }
    this.keys = {}
    this.manualControl = false

    this._keydownHandler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return
      const k = e.key.toLowerCase()
      this.keys[k] = true
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "w", "s", "d"].includes(k)) this.manualControl = true
    }
    this._keyupHandler = (e) => this.keys[e.key.toLowerCase()] = false
    this.resize()
    window.addEventListener("resize", () => this.resize())
  }

  updateAccentColor(color) { this.color = color }
  updateGameType(type) { 
    this.type = type; 
    this.gameState.level = 1; 
    this.gameState.score = 0; 
    this.gameState.player = null; // Clear persistent player stats for new game type
    this.manualControl = false; 
    this.initGame() 
  }
  resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; this.initGame() }

  initGame() {
    const w = this.canvas.width, h = this.canvas.height
    const currentLevel = this.gameState.level || 1
    const currentScore = this.gameState.score || 0
    
    this.badColor = "#ff4444"; this.neutralColor = "#444444"

    if (this.type === "pong") {
      this.gameState = { 
        level: currentLevel, score: currentScore, 
        ball: { x: w / 2, y: h / 2, vx: 5 + currentLevel, vy: 5 + currentLevel, size: 15 }, 
        paddle1: { x: 50, y: h / 2 - 50, width: 20, height: 120 }, 
        paddle2: { x: w - 70, y: h / 2 - 50, width: 20, height: 120 }, 
        obstacles: [] 
      }
      for (let i = 0; i < 2 + currentLevel; i++) this.gameState.obstacles.push({ x: w / 2 + (Math.random() - 0.5) * 400, y: h / 2 + (Math.random() - 0.5) * 400, size: 40 + Math.random() * 40 })
    } else if (this.type === "snake") {
      const gs = 20
      this.gameState = { 
        level: currentLevel, score: currentScore, gridSize: gs, 
        snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }], 
        dir: { x: 1, y: 0 }, 
        food: { x: Math.floor(Math.random() * (w / gs)), y: Math.floor(Math.random() * (h / gs)) }, 
        obstacles: [], moveTimer: 0 
      }
      for (let i = 0; i < 10 + currentLevel * 5; i++) {
        this.gameState.obstacles.push({ x: Math.floor(Math.random() * (w / gs)), y: Math.floor(Math.random() * (h / gs)) })
      }
    } else if (this.type === "pacman") {
      const gs = 30; const cols = Math.floor(w / gs); const rows = Math.floor(h / gs)
      this.gameState = { 
        level: currentLevel, score: currentScore, gridSize: gs, maze: [], 
        pacman: { x: 1, y: 1, dir: 0, mouth: 0, mouthDir: 1, isPowered: false, powerTimer: 0 }, 
        dots: [], powerups: [], 
        ghosts: [{ x: cols - 2, y: rows - 2 }, { x: cols - 2, y: 1 }, { x: 1, y: rows - 2 }] 
      }
      for (let r = 0; r < rows; r++) {
        this.gameState.maze[r] = []
        for (let c = 0; c < cols; c++) {
          const isWall = c === 0 || c === cols - 1 || r === 0 || r === rows - 1 || (c % 4 === 0 && r % 4 === 0)
          this.gameState.maze[r][c] = isWall
          if (!isWall) {
            if (Math.random() > 0.98) this.gameState.powerups.push({ x: c, y: r })
            else if (Math.random() > 0.8) this.gameState.dots.push({ x: c, y: r })
          }
        }
      }
    } else {
      // space_invaders
      const prevPlayer = this.gameState.player || { weaponLevel: 1, shield: 0, rapidTimer: 0, laserTimer: 0, lightningTimer: 0, bulletSpeed: 15 }
      this.gameState = {
        level: currentLevel, score: currentScore,
        player: { 
          x: w / 2 - 20, y: h - 60, width: 40, height: 20, 
          weaponLevel: prevPlayer.weaponLevel || 1, 
          shield: prevPlayer.shield || 0, 
          rapidTimer: prevPlayer.rapidTimer || 0, 
          laserTimer: prevPlayer.laserTimer || 0,
          lightningTimer: prevPlayer.lightningTimer || 0,
          bulletSpeed: prevPlayer.bulletSpeed || 15
        },
        bullets: [], enemyBullets: [], enemies: [], powerups: [], obstacles: [], boss: null,
        direction: 1, moveTimer: 0, shootTimer: 0,
      }
      if (currentLevel >= 6) {
        this.gameState.boss = { x: w / 2 - 100, y: 80, width: 200, height: 100, hp: 500 + (currentLevel - 6) * 300, maxHp: 500 + (currentLevel - 6) * 300, shootTimer: 0, dir: 1 }
      } else {
        const rows = 3 + Math.floor(currentLevel / 2); const cols = Math.floor(w / 80) - 2; const spacing = 60; const startX = (w - cols * spacing) / 2
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) this.gameState.enemies.push({ x: startX + c * spacing, y: 80 + r * spacing, width: 30, height: 20, alive: true, shootTimer: 50 + Math.random() * (200 / currentLevel) })
      }
      for (let i = 0; i < 4; i++) this.gameState.obstacles.push({ x: (w / 5) * (i + 1) - 30, y: h - 150, width: 60, height: 20, health: 5 })
    }
  }

  start() { this.active = true; this.lastDrawTime = 0; this.canvas.style.display = "block"; window.addEventListener("keydown", this._keydownHandler); window.addEventListener("keyup", this._keyupHandler); this.animate(0) }
  stop() { this.active = false; if (this.rafId) cancelAnimationFrame(this.rafId); this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); this.canvas.style.display = "none"; window.removeEventListener("keydown", this._keydownHandler); window.removeEventListener("keyup", this._keyupHandler) }

  update() {
    const w = this.canvas.width, h = this.canvas.height
    if (this.type === "pong") this._updatePong(w, h); else if (this.type === "snake") this._updateSnake(w, h); else if (this.type === "pacman") this._updatePacman(w, h); else this._updateSpaceInvaders(w, h)
  }

  _updatePong(w, h) {
    const state = this.gameState
    state.ball.x += state.ball.vx; state.ball.y += state.ball.vy
    if (state.ball.y <= 0 || state.ball.y >= h - state.ball.size) state.ball.vy *= -1
    
    if (!this.manualControl) {
      if (state.paddle1.y + 60 < state.ball.y) state.paddle1.y += 5
      else state.paddle1.y -= 5
    } else {
      if (this.keys["w"] || this.keys["arrowup"]) state.paddle1.y -= 8
      if (this.keys["s"] || this.keys["arrowdown"]) state.paddle1.y += 8
    }
    if (state.paddle2.y + 60 < state.ball.y) state.paddle2.y += 5
    else state.paddle2.y -= 5

    const checkBounce = (p) => {
      if (state.ball.x < p.x + p.width && state.ball.x + state.ball.size > p.x &&
          state.ball.y < p.y + p.height && state.ball.y + state.ball.size > p.y) {
          state.ball.vx *= -1.05; return true;
      }
      return false;
    }
    checkBounce(state.paddle1); checkBounce(state.paddle2);
    
    state.obstacles.forEach(ob => {
        if (state.ball.x < ob.x + ob.size && state.ball.x + state.ball.size > ob.x &&
            state.ball.y < ob.y + ob.size && state.ball.y + state.ball.size > ob.y) {
            state.ball.vx *= -1; state.ball.vy *= -1;
        }
    })
    if (state.ball.x < 0 || state.ball.x > w) { state.score = 0; this.initGame(); }
  }

  _updateSnake(w, h) {
    const state = this.gameState
    state.moveTimer++
    if (state.moveTimer > 2) {
      state.moveTimer = 0
      if (this.manualControl) {
        if ((this.keys["arrowleft"] || this.keys["a"]) && state.dir.x !== 1) state.dir = { x: -1, y: 0 }
        if ((this.keys["arrowright"] || this.keys["d"]) && state.dir.x !== -1) state.dir = { x: 1, y: 0 }
        if ((this.keys["arrowup"] || this.keys["w"]) && state.dir.y !== 1) state.dir = { x: 0, y: -1 }
        if ((this.keys["arrowdown"] || this.keys["s"]) && state.dir.y !== -1) state.dir = { x: 0, y: 1 }
      } else {
        const head = state.snake[0]
        if (head.x < state.food.x) state.dir = { x: 1, y: 0 }
        else if (head.x > state.food.x) state.dir = { x: -1, y: 0 }
        else if (head.y < state.food.y) state.dir = { x: 0, y: 1 }
        else state.dir = { x: 0, y: -1 }
      }
      const newHead = { x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y }
      if (newHead.x < 0 || newHead.x >= w/state.gridSize || newHead.y < 0 || newHead.y >= h/state.gridSize ||
          state.obstacles.some(o => o.x === newHead.x && o.y === newHead.y)) {
          this.initGame(); return;
      }
      state.snake.unshift(newHead)
      if (newHead.x === state.food.x && newHead.y === state.food.y) {
        state.score += 10; state.food = { x: Math.floor(Math.random() * (w/state.gridSize)), y: Math.floor(Math.random() * (h/state.gridSize)) }
        if (state.score % 100 === 0) { state.level++; this.initGame(); }
      } else state.snake.pop()
    }
  }

  _updatePacman(w, h) {
    const state = this.gameState, gs = state.gridSize
    if (this.manualControl) {
      if (this.keys["arrowleft"] || this.keys["a"]) state.pacman.dir = 2
      if (this.keys["arrowright"] || this.keys["d"]) state.pacman.dir = 0
      if (this.keys["arrowup"] || this.keys["w"]) state.pacman.dir = 3
      if (this.keys["arrowdown"] || this.keys["s"]) state.pacman.dir = 1
    } else {
      if (state.dots.length > 0) {
        const d = state.dots[0]
        state.pacman.dir = Math.abs(d.x - state.pacman.x) > Math.abs(d.y - state.pacman.y) ? (d.x > state.pacman.x ? 0 : 2) : (d.y > state.pacman.y ? 1 : 3)
      }
    }
    const speed = state.pacman.isPowered ? 0.2 : 0.12; let nx = state.pacman.x, ny = state.pacman.y
    if (state.pacman.dir === 0) nx += speed; else if (state.pacman.dir === 1) ny += speed; else if (state.pacman.dir === 2) nx -= speed; else ny -= speed;
    if (!state.maze[Math.floor(ny)] || !state.maze[Math.floor(ny)][Math.floor(nx)]) { state.pacman.x = nx; state.pacman.y = ny; }
    
    state.pacman.mouth += 0.15 * state.pacman.mouthDir
    if (state.pacman.mouth > 0.5 || state.pacman.mouth < 0) state.pacman.mouthDir *= -1
    
    state.dots = state.dots.filter(d => {
        if (Math.abs(d.x - state.pacman.x) < 0.5 && Math.abs(d.y - state.pacman.y) < 0.5) { state.score += 1; return false; }
        return true;
    })
    state.powerups = state.powerups.filter(p => {
        if (Math.abs(p.x - state.pacman.x) < 0.5 && Math.abs(p.y - state.pacman.y) < 0.5) { state.pacman.isPowered = true; state.pacman.powerTimer = 200; return false; }
        return true;
    })
    if (state.pacman.powerTimer > 0) state.pacman.powerTimer--
    else state.pacman.isPowered = false

    state.ghosts.forEach(g => {
        const dx = state.pacman.x - g.x, dy = state.pacman.y - g.y
        const dist = Math.sqrt(dx*dx + dy*dy)
        if (dist < 0.7) {
            if (state.pacman.isPowered) { g.x = Math.floor(w/gs/2); g.y = Math.floor(h/gs/2); state.score += 50; }
            else this.initGame();
        }
        const gSpeed = state.pacman.isPowered ? 0.04 : 0.06 + (state.level * 0.01)
        g.x += (dx / dist) * gSpeed; g.y += (dy / dist) * gSpeed
    })
    if (state.dots.length === 0) { state.level++; this.initGame(); }
  }

  _updateSpaceInvaders(w, h) {
    const state = this.gameState, p = state.player
    if (this.manualControl) {
      if (this.keys["arrowleft"] || this.keys["a"]) p.x -= 10
      if (this.keys["arrowright"] || this.keys["d"]) p.x += 10
    } else {
      const target = state.boss || state.enemies.find(e => e.alive)
      if (target) { if (p.x + 20 < target.x + target.width / 2) p.x += 7; else p.x -= 7 }
    }
    p.x = Math.max(0, Math.min(w - p.width, p.x))
    if (p.rapidTimer > 0) p.rapidTimer--; if (p.laserTimer > 0) p.laserTimer--; if (p.lightningTimer > 0) p.lightningTimer--

    state.shootTimer++
    const shootLimit = p.rapidTimer > 0 ? 3 : 15
    if (state.shootTimer > shootLimit) {
      const isLightning = p.lightningTimer > 0
      const shoot = (off) => {
        const b = { x: p.x + 20 + off, y: p.y, speed: p.bulletSpeed, lightning: isLightning }
        if (isLightning) {
            const target = state.boss || state.enemies.find(e => e.alive && Math.abs(e.x - b.x) < 200)
            if (target) b.tx = target.x + target.width / 2, b.ty = target.y + target.height / 2
        }
        state.bullets.push(b)
      }
      const count = p.weaponLevel; const spacing = 12; const totalWidth = (count - 1) * spacing
      for (let i = 0; i < count; i++) shoot(-totalWidth / 2 + i * spacing)
      state.shootTimer = 0
    }

    if (p.laserTimer > 0) {
      const lx = p.x + 15, lw = 10
      state.enemies.forEach(e => { if (e.alive && e.x < lx + lw && e.x + e.width > lx) { e.alive = false; state.score += 10 } })
      if (state.boss && state.boss.x < lx + lw && state.boss.x + state.boss.width > lx) state.boss.hp -= 8
    }

    state.powerups.forEach(pu => {
      pu.y += 4
      if (pu.x > p.x && pu.x < p.x + p.width && pu.y > p.y && pu.y < p.y + p.height) {
        if (pu.type === 'P') { if (p.weaponLevel < 6) p.weaponLevel++; else p.bulletSpeed += 5 }
        else if (pu.type === 'S') p.shield = 5
        else if (pu.type === 'R') p.rapidTimer = 150
        else if (pu.type === 'L') p.laserTimer = 180
        else if (pu.type === 'T') p.lightningTimer = 200
        pu.picked = true
      }
    }); state.powerups = state.powerups.filter(pu => !pu.picked && pu.y < h)

    if (state.boss) {
      state.boss.x += (6 + (state.level - 6)) * state.boss.dir
      if (state.boss.x > w - 220 || state.boss.x < 20) state.boss.dir *= -1
      state.boss.shootTimer++
      if (state.boss.shootTimer > Math.max(8, 20 - state.level)) {
        for (let i = -2; i <= 2; i++) state.enemyBullets.push({ x: state.boss.x + state.boss.width / 2 + i * 35, y: state.boss.y + state.boss.height, speed: 7 + (state.level - 6), vx: i * 2.5 })
        state.boss.shootTimer = 0
      }
      if (state.boss.hp <= 0) { state.score += 2000; state.level++; this.initGame() }
    }

    state.enemies.forEach(e => {
      if (e.alive) {
        e.shootTimer--; if (e.shootTimer <= 0) { state.enemyBullets.push({ x: e.x + 15, y: e.y + 20, speed: 6 + state.level }); e.shootTimer = 60 + Math.random() * (120 / state.level) }
      }
    })

    state.enemyBullets = state.enemyBullets.filter(eb => {
      eb.y += eb.speed; if (eb.vx) eb.x += eb.vx
      let hitObs = false; state.obstacles.forEach(o => { if (o.health > 0 && eb.x > o.x && eb.x < o.x + o.width && eb.y > o.y && eb.y < o.y + o.height) { o.health--; hitObs = true } })
      if (hitObs) return false
      if (eb.x > p.x && eb.x < p.x + p.width && eb.y > p.y && eb.y < p.y + p.height) {
        if (p.shield > 0) { p.shield--; return false } else { this.gameState.level = 1; this.gameState.score = 0; this.initGame(); return false }
      }
      return eb.y < h && eb.x > 0 && eb.x < w
    })

    state.bullets = state.bullets.filter(b => {
      if (b.lightning && b.tx) {
          const dx = b.tx - b.x, dy = b.ty - b.y; const dist = Math.sqrt(dx*dx + dy*dy)
          if (dist > 5) { b.x += (dx/dist) * 25; b.y += (dy/dist) * 25 } else b.y = -10
      } else b.y -= b.speed
      let hit = false
      state.enemies.forEach(e => {
        if (e.alive && b.x > e.x && b.x < e.x + e.width && b.y > e.y && b.y < e.y + e.height) {
          e.alive = false; hit = true; state.score += 10
          if (Math.random() < 0.25) { const types = ['P', 'S', 'R', 'L', 'T']; state.powerups.push({ x: e.x + 15, y: e.y, type: types[Math.floor(Math.random() * types.length)], picked: false }) }
        }
      })
      if (state.boss && !hit && b.x > state.boss.x && b.x < state.boss.x + state.boss.width && b.y > state.boss.y && b.y < state.boss.y + state.boss.height) { state.boss.hp -= (b.lightning ? 10 : 3); hit = true }
      return !hit && b.y > 0
    })

    if (!state.boss && state.enemies.length > 0 && !state.enemies.some(e => e.alive)) { state.level++; this.initGame() }
    state.moveTimer++; if (!state.boss && state.moveTimer > 25) {
      let edge = false; state.enemies.forEach(e => { if (e.alive) { e.x += (12 + state.level * 2) * state.direction; if (e.x > w - 50 || e.x < 20) edge = true } })
      if (edge) { state.direction *= -1; state.enemies.forEach(e => e.y += 20) }
      state.moveTimer = 0
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    const w = this.canvas.width, h = this.canvas.height
    this.ctx.shadowBlur = 10; this.ctx.shadowColor = this.color
    if (this.type === "pacman") this._drawPacman(); 
    else if (this.type === "space_invaders") this._drawSpaceInvaders(); 
    else if (this.type === "pong") this._drawPong(); 
    else this._drawSnake()
    
    this.ctx.shadowBlur = 0
    this.ctx.fillStyle = "#fff"; this.ctx.font = "bold 16px monospace"; 
    this.ctx.fillText(`LVL ${this.gameState.level} SCORE ${this.gameState.score}`, 20, 30)
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; for (let i = 0; i < h; i += 4) this.ctx.fillRect(0, i, w, 1)
  }

  _drawPong() {
    const s = this.gameState; this.ctx.fillStyle = this.color; 
    this.ctx.fillRect(s.paddle1.x, s.paddle1.y, 20, 120); 
    this.ctx.fillRect(s.paddle2.x, s.paddle2.y, 20, 120); 
    this.ctx.fillRect(s.ball.x, s.ball.y, 15, 15);
    this.ctx.strokeStyle = this.neutralColor; s.obstacles.forEach(o => this.ctx.strokeRect(o.x, o.y, o.size, o.size))
  }

  _drawSnake() {
    const s = this.gameState, gs = s.gridSize; this.ctx.fillStyle = this.color; 
    s.snake.forEach(sn => this.ctx.fillRect(sn.x * gs, sn.y * gs, gs - 2, gs - 2));
    this.ctx.fillStyle = "#fff"; this.ctx.fillRect(s.food.x * gs, s.food.y * gs, gs - 2, gs - 2); 
    this.ctx.fillStyle = this.neutralColor; s.obstacles.forEach(o => this.ctx.fillRect(o.x * gs, o.y * gs, gs - 2, gs - 2))
  }

  _drawPacman() {
    const s = this.gameState, gs = s.gridSize
    this.ctx.fillStyle = this.neutralColor; 
    for (let r = 0; r < s.maze.length; r++) 
      for (let c = 0; c < s.maze[r].length; c++) 
        if (s.maze[r][c]) this.ctx.fillRect(c * gs, r * gs, gs - 1, gs - 1)
    this.ctx.fillStyle = this.color; s.dots.forEach(d => this.ctx.fillRect(d.x * gs + gs / 2 - 2, d.y * gs + gs / 2 - 2, 4, 4))
    this.ctx.fillStyle = "#fff"; s.powerups.forEach(p => { this.ctx.beginPath(); this.ctx.arc(p.x * gs + gs / 2, p.y * gs + gs / 2, 6, 0, Math.PI * 2); this.ctx.fill() })
    
    // Pacman với logic xoay đầu
    this.ctx.fillStyle = this.color; 
    const px = s.pacman.x * gs + gs / 2, py = s.pacman.y * gs + gs / 2; 
    this.ctx.save();
    this.ctx.translate(px, py);
    this.ctx.rotate(s.pacman.dir * Math.PI / 2); // Xoay theo hướng 0, 1, 2, 3
    
    this.ctx.beginPath();
    const mouthAngle = s.pacman.mouth; 
    this.ctx.arc(0, 0, gs / 2 - 2, mouthAngle, Math.PI * 2 - mouthAngle);
    this.ctx.lineTo(0, 0);
    this.ctx.fill();
    this.ctx.restore();

    s.ghosts.forEach(g => { this.ctx.fillStyle = s.pacman.isPowered ? "#00aaff" : this.badColor; this.ctx.fillRect(g.x * gs, g.y * gs, gs - 2, gs - 2) })
  }

  _drawSpaceInvaders() {
    const s = this.gameState, p = s.player, ctx = this.ctx
    if (p.laserTimer > 0) {
      const grad = ctx.createLinearGradient(p.x + 15, 0, p.x + 25, 0); grad.addColorStop(0, "transparent"); grad.addColorStop(0.5, "#fff"); grad.addColorStop(1, "transparent")
      ctx.fillStyle = grad; ctx.shadowBlur = 30; ctx.shadowColor = "#fff"; ctx.fillRect(p.x + 15, 0, 10, p.y); ctx.shadowBlur = 10
    }
    ctx.fillStyle = this.color; ctx.fillRect(p.x, p.y, p.width, p.height)
    if (p.shield > 0) { ctx.strokeStyle = "#00ffff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x + 20, p.y + 10, 40, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = "rgba(0, 255, 255, 0.1)"; ctx.fill() }
    ctx.fillStyle = this.badColor; s.enemies.forEach(e => { if (e.alive) ctx.fillRect(e.x, e.y, 30, 20) })
    if (s.boss) {
      ctx.fillRect(s.boss.x, s.boss.y, s.boss.width, s.boss.height)
      ctx.fillStyle = "#444"; ctx.fillRect(s.boss.x, s.boss.y - 25, s.boss.width, 12)
      ctx.fillStyle = "#ff0000"; ctx.fillRect(s.boss.x, s.boss.y - 25, (s.boss.hp / s.boss.maxHp) * s.boss.width, 12)
    }
    s.bullets.forEach(b => {
        if (b.lightning) { ctx.strokeStyle = "#00ffff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + (Math.random()-0.5)*15, b.y - 10); ctx.lineTo(b.x + (Math.random()-0.5)*15, b.y - 20); ctx.stroke() }
        else { ctx.fillStyle = this.color; ctx.fillRect(b.x - 1, b.y, 3, 12) }
    })
    ctx.fillStyle = this.badColor; s.enemyBullets.forEach(eb => ctx.fillRect(eb.x - 1, eb.y, 3, 10))
    s.powerups.forEach(pu => {
      ctx.fillStyle = "#fff"; ctx.shadowColor = "#fff"; ctx.shadowBlur = 15; ctx.fillRect(pu.x - 12, pu.y - 12, 24, 24); ctx.fillStyle = "#000"; ctx.font = "bold 14px monospace"; ctx.fillText(pu.type, pu.x - 5, pu.y + 6); ctx.shadowBlur = 10
    })
    ctx.fillStyle = this.neutralColor; s.obstacles.forEach(o => { if (o.health > 0) { ctx.globalAlpha = o.health / 5; ctx.fillRect(o.x, o.y, o.width, o.height) } }); ctx.globalAlpha = 1
  }

  animate(currentTime = 0) {
    if (!this.active) return; this.rafId = requestAnimationFrame((t) => this.animate(t))
    const elapsed = currentTime - this.lastDrawTime; if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval); this.update(); this.draw()
  }
}
