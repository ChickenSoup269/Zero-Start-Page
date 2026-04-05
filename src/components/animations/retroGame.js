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

    this.gameState = {}
    this.keys = {}
    this.manualControl = false

    this._keydownHandler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return
      this.keys[e.key] = true
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "a",
          "w",
          "s",
          "d",
          "A",
          "W",
          "S",
          "D",
        ].includes(e.key)
      ) {
        this.manualControl = true
      }
    }
    this._keyupHandler = (e) => {
      this.keys[e.key] = false
    }

    this.resize()
    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
  }

  updateAccentColor(color) {
    this.color = color
  }

  updateGameType(type) {
    this.type = type
    this.initGame()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initGame()
  }

  initGame() {
    const w = this.canvas.width
    const h = this.canvas.height

    this.gameState = {}

    if (this.type === "pong") {
      this.gameState = {
        ball: { x: w / 2, y: h / 2, vx: 5, vy: 5, size: 15 },
        paddle1: { x: 50, y: h / 2 - 50, width: 20, height: 120 },
        paddle2: { x: w - 70, y: h / 2 - 50, width: 20, height: 120 },
      }
    } else if (this.type === "snake") {
      const gs = 20
      this.gameState = {
        gridSize: gs,
        snake: [
          { x: 10, y: 10 },
          { x: 9, y: 10 },
          { x: 8, y: 10 },
        ],
        dir: { x: 1, y: 0 },
        food: {
          x: Math.floor(Math.random() * (w / gs)),
          y: Math.floor(Math.random() * (h / gs)),
        },
        moveTimer: 0,
      }
    } else if (this.type === "tetris") {
      this.gameState = {
        gridSize: 30,
        board: [], // We simulate a huge board
        activePiece: this._tetrisSpawn(w, h),
        dropTimer: 0,
      }
    } else if (this.type === "pacman") {
      const gs = 30
      this.gameState = {
        gridSize: gs,
        pacman: {
          x: Math.floor(w / gs / 2),
          y: Math.floor(h / gs / 2),
          dir: 0,
          mouth: 0,
          mouthDir: 1,
        },
        dots: [],
        ghosts: [
          { x: 5, y: 5 },
          { x: w / gs - 5, y: 5 },
          { x: 5, y: h / gs - 5 },
          { x: w / gs - 5, y: h / gs - 5 },
        ],
      }
      // scatter some dots
      for (let i = 0; i < 80; i++) {
        this.gameState.dots.push({
          x: Math.floor(Math.random() * (w / gs)),
          y: Math.floor(Math.random() * (h / gs)),
        })
      }
    } else {
      // space_invaders
      this.gameState = {
        player: { x: w / 2 - 20, y: h - 60, width: 40, height: 20 },
        bullets: [],
        enemies: [],
        score: 0,
        direction: 1,
        moveTimer: 0,
        shootTimer: 0,
      }
      const rows = 4
      const cols = Math.floor(w / 80) - 2
      const spacing = 60
      const startX = (w - cols * spacing) / 2
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          this.gameState.enemies.push({
            x: startX + c * spacing,
            y: 100 + r * spacing,
            width: 30,
            height: 20,
            alive: true,
            type: r % 3,
          })
        }
      }
    }
  }

  _tetrisSpawn(w, h) {
    const shapes = [
      [
        { x: 0, y: -1 },
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      [
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
      ],
      [
        { x: 0, y: -1 },
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
    ]
    const shape = shapes[Math.floor(Math.random() * shapes.length)]
    return {
      x: Math.floor(w / 30 / 2) + Math.floor(Math.random() * 10 - 5),
      y: -2,
      shape: shape,
    }
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.canvas.hidden = false
    this.canvas.style.display = "block"
    window.addEventListener("keydown", this._keydownHandler)
    window.addEventListener("keyup", this._keyupHandler)
    this.animate(0)
  }

  stop() {
    this.active = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
    window.removeEventListener("keydown", this._keydownHandler)
    window.removeEventListener("keyup", this._keyupHandler)
    this.keys = {}
    this.manualControl = false
  }

  update() {
    const w = this.canvas.width
    const h = this.canvas.height

    if (this.type === "pong") {
      this._updatePong(w, h)
    } else if (this.type === "snake") {
      this._updateSnake(w, h)
    } else if (this.type === "tetris") {
      this._updateTetris(w, h)
    } else if (this.type === "pacman") {
      this._updatePacman(w, h)
    } else {
      this._updateSpaceInvaders(w, h)
    }
  }

  _updatePong(w, h) {
    const state = this.gameState
    state.ball.x += state.ball.vx
    state.ball.y += state.ball.vy

    if (state.ball.y <= 0 || state.ball.y >= h - state.ball.size) {
      state.ball.vy *= -1
      state.ball.y = Math.max(0, Math.min(h - state.ball.size, state.ball.y))
    }

    // Paddle AI (auto play)
    if (!this.manualControl) {
      if (state.paddle1.y + state.paddle1.height / 2 < state.ball.y)
        state.paddle1.y += 6
      else state.paddle1.y -= 6
    } else {
      if (this.keys["w"] || this.keys["W"]) state.paddle1.y -= 10
      if (this.keys["s"] || this.keys["S"]) state.paddle1.y += 10
    }

    // Paddle 2 AI
    if (state.paddle2.y + state.paddle2.height / 2 < state.ball.y)
      state.paddle2.y += 5
    else state.paddle2.y -= 5

    // Collision logic
    const bounceX = () => {
      state.ball.vx = -state.ball.vx
      state.ball.vx *= 1.05 // slightly speed up
    }

    // Paddle 1
    if (
      state.ball.vx < 0 &&
      state.ball.x <= state.paddle1.x + state.paddle1.width &&
      state.ball.y + state.ball.size > state.paddle1.y &&
      state.ball.y < state.paddle1.y + state.paddle1.height
    ) {
      state.ball.x = state.paddle1.x + state.paddle1.width
      bounceX()
    }
    // Paddle 2
    if (
      state.ball.vx > 0 &&
      state.ball.x + state.ball.size >= state.paddle2.x &&
      state.ball.y + state.ball.size > state.paddle2.y &&
      state.ball.y < state.paddle2.y + state.paddle2.height
    ) {
      state.ball.x = state.paddle2.x - state.ball.size
      bounceX()
    }

    // Wrap around screen -> Reset
    if (state.ball.x < -100 || state.ball.x > w + 100) {
      state.ball.x = w / 2
      state.ball.y = h / 2
      state.ball.vx = 5 * (Math.random() > 0.5 ? 1 : -1)
      state.ball.vy = 5 * (Math.random() > 0.5 ? 1 : -1)
    }
  }

  _updateSnake(w, h) {
    const state = this.gameState
    state.moveTimer++
    if (state.moveTimer > 1) {
      // Mượt hơn (nhanh hơn)
      state.moveTimer = 0

      // Auto AI
      if (!this.manualControl) {
        let head = state.snake[0]
        if (head.x < state.food.x && state.dir.x !== -1) {
          state.dir = { x: 1, y: 0 }
        } else if (head.x > state.food.x && state.dir.x !== 1) {
          state.dir = { x: -1, y: 0 }
        } else if (head.y < state.food.y && state.dir.y !== -1) {
          state.dir = { x: 0, y: 1 }
        } else if (head.y > state.food.y && state.dir.y !== 1) {
          state.dir = { x: 0, y: -1 }
        }
      } else {
        if (
          (this.keys["ArrowLeft"] || this.keys["a"] || this.keys["A"]) &&
          state.dir.x !== 1
        )
          state.dir = { x: -1, y: 0 }
        if (
          (this.keys["ArrowRight"] || this.keys["d"] || this.keys["D"]) &&
          state.dir.x !== -1
        )
          state.dir = { x: 1, y: 0 }
        if (
          (this.keys["ArrowUp"] || this.keys["w"] || this.keys["W"]) &&
          state.dir.y !== 1
        )
          state.dir = { x: 0, y: -1 }
        if (
          (this.keys["ArrowDown"] || this.keys["s"] || this.keys["S"]) &&
          state.dir.y !== -1
        )
          state.dir = { x: 0, y: 1 }
      }

      let newHead = {
        x: state.snake[0].x + state.dir.x,
        y: state.snake[0].y + state.dir.y,
      }

      const cols = Math.floor(w / state.gridSize)
      const rows = Math.floor(h / state.gridSize)

      // Xuyên tường (Wrap around)
      if (newHead.x < 0) newHead.x = cols
      else if (newHead.x > cols) newHead.x = 0
      if (newHead.y < 0) newHead.y = rows
      else if (newHead.y > rows) newHead.y = 0

      state.snake.unshift(newHead)

      if (newHead.x === state.food.x && newHead.y === state.food.y) {
        state.food = {
          x: Math.floor(Math.random() * cols),
          y: Math.floor(Math.random() * rows),
        }
      } else {
        state.snake.pop()
      }
    }
  }

  _updateTetris(w, h) {
    const state = this.gameState
    state.dropTimer++

    // AI horizontal movement
    if (state.dropTimer % 4 === 0) {
      if (Math.random() < 0.2)
        state.activePiece.x += Math.random() < 0.5 ? -1 : 1
    }

    if (state.dropTimer > 6) {
      state.dropTimer = 0
      state.activePiece.y += 1

      if (state.activePiece.y > h / state.gridSize) {
        state.board.push(
          ...state.activePiece.shape.map((p) => ({
            x: state.activePiece.x + p.x,
            y: state.activePiece.y + p.y - 1,
          })),
        )
        state.activePiece = this._tetrisSpawn(w, h)
      }

      if (state.board.length > 300) state.board.splice(0, 100) // pseudo line clear to prevent memory leak
    }
  }

  _updatePacman(w, h) {
    const state = this.gameState
    const cols = Math.floor(w / state.gridSize)
    const rows = Math.floor(h / state.gridSize)

    // Pacman AI: find nearest dot softly
    if (!this.manualControl) {
      if (state.dots.length > 0) {
        let target = state.dots[0]
        let minDist = Infinity
        for (let d of state.dots) {
          let dist =
            Math.abs(d.x - state.pacman.x) + Math.abs(d.y - state.pacman.y)
          if (dist < minDist) {
            minDist = dist
            target = d
          }
        }
        let dx = target.x - state.pacman.x
        let dy = target.y - state.pacman.y

        if (Math.abs(dx) > Math.abs(dy)) {
          state.pacman.dir = dx > 0 ? 0 : 2
        } else {
          state.pacman.dir = dy > 0 ? 1 : 3
        }
      }
    } else {
      if (this.keys["ArrowLeft"] || this.keys["a"] || this.keys["A"])
        state.pacman.dir = 2
      if (this.keys["ArrowRight"] || this.keys["d"] || this.keys["D"])
        state.pacman.dir = 0
      if (this.keys["ArrowUp"] || this.keys["w"] || this.keys["W"])
        state.pacman.dir = 3
      if (this.keys["ArrowDown"] || this.keys["s"] || this.keys["S"])
        state.pacman.dir = 1
    }

    const pSpeed = 0.35 // Tốc độ di chuyển trơn tru
    if (state.pacman.dir === 0)
      state.pacman.x += pSpeed // right
    else if (state.pacman.dir === 1)
      state.pacman.y += pSpeed // down (sửa lại thành +)
    else if (state.pacman.dir === 2)
      state.pacman.x -= pSpeed // left
    else if (state.pacman.dir === 3) state.pacman.y -= pSpeed // up (sửa lại thành -)

    state.pacman.mouth += 0.2 * state.pacman.mouthDir
    if (state.pacman.mouth >= 0.5 || state.pacman.mouth <= 0)
      state.pacman.mouthDir *= -1

    // Bounds wrap
    if (state.pacman.x > cols + 1) state.pacman.x = -1
    if (state.pacman.x < -1) state.pacman.x = cols + 1
    if (state.pacman.y > rows + 1) state.pacman.y = -1
    if (state.pacman.y < -1) state.pacman.y = rows + 1

    // Eat dots
    state.dots = state.dots.filter((d) => {
      let dx = d.x - state.pacman.x
      let dy = d.y - state.pacman.y
      return Math.sqrt(dx * dx + dy * dy) > 1.2
    })
    if (state.dots.length === 0) {
      this.initGame() // next level
    }

    // Ghosts move: surround pacman smoothly
    state.ghosts.forEach((g, i) => {
      let targetX = state.pacman.x + Math.sin((i * Math.PI) / 2) * 2
      let targetY = state.pacman.y + Math.cos((i * Math.PI) / 2) * 2
      let dx = targetX - g.x
      let dy = targetY - g.y
      let dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > 0.1) {
        g.x += (dx / dist) * 0.18 + (Math.random() - 0.5) * 0.05
        g.y += (dy / dist) * 0.18 + (Math.random() - 0.5) * 0.05
      }
    })
  }

  _updateSpaceInvaders(w, h) {
    const speed = 10
    const state = this.gameState

    if (this.manualControl) {
      if (this.keys["ArrowLeft"] || this.keys["a"] || this.keys["A"])
        state.player.x -= speed
      if (this.keys["ArrowRight"] || this.keys["d"] || this.keys["D"])
        state.player.x += speed
      if (this.keys["ArrowUp"] || this.keys["w"] || this.keys["W"])
        state.player.y -= speed
      if (this.keys["ArrowDown"] || this.keys["s"] || this.keys["S"])
        state.player.y += speed

      state.player.x = Math.max(
        0,
        Math.min(w - state.player.width, state.player.x),
      )
      state.player.y = Math.max(
        0,
        Math.min(h - state.player.height, state.player.y),
      )
    } else {
      const targetEnemy = state.enemies.find((e) => e.alive)
      if (targetEnemy) {
        const centerX = targetEnemy.x + targetEnemy.width / 2
        if (state.player.x + 20 < centerX) state.player.x += 5
        else if (state.player.x + 20 > centerX) state.player.x -= 5
      }
    }

    state.shootTimer++
    if (state.shootTimer > 20) {
      state.bullets.push({
        x: state.player.x + 20,
        y: state.player.y,
        speed: 10,
      })
      state.shootTimer = 0
    }

    state.bullets = state.bullets.filter((b) => {
      b.y -= b.speed
      let hit = false
      state.enemies.forEach((e) => {
        if (
          e.alive &&
          b.x > e.x &&
          b.x < e.x + e.width &&
          b.y > e.y &&
          b.y < e.y + e.height
        ) {
          e.alive = false
          hit = true
          state.score += 10
        }
      })
      return !hit && b.y > 0
    })

    state.moveTimer++
    if (state.moveTimer > 30) {
      let edge = false
      state.enemies.forEach((e) => {
        if (e.alive) {
          e.x += 20 * state.direction
          if (e.x > w - 50 || e.x < 50) edge = true
        }
      })
      if (edge) {
        state.direction *= -1
        state.enemies.forEach((e) => (e.y += 20))
      }
      state.moveTimer = 0
    }

    if (
      !state.enemies.some((e) => e.alive) ||
      state.enemies.some((e) => e.alive && e.y > h - 100)
    ) {
      this.initGame()
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.fillStyle = this.color
    // ensure uniform glow
    this.ctx.shadowBlur = 8
    this.ctx.shadowColor = this.color

    const w = this.canvas.width
    const h = this.canvas.height

    if (this.type === "pong") this._drawPong()
    else if (this.type === "snake") this._drawSnake()
    else if (this.type === "tetris") this._drawTetris()
    else if (this.type === "pacman") this._drawPacman()
    else this._drawSpaceInvaders()

    this.ctx.shadowBlur = 0 // clear shadow

    // CRT Scanlines wrapper
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.15)"
    for (let i = 0; i < h; i += 4) {
      this.ctx.fillRect(0, i, w, 1)
    }
  }

  _drawPong() {
    const s = this.gameState
    this.ctx.fillRect(
      s.paddle1.x,
      s.paddle1.y,
      s.paddle1.width,
      s.paddle1.height,
    )
    this.ctx.fillRect(
      s.paddle2.x,
      s.paddle2.y,
      s.paddle2.width,
      s.paddle2.height,
    )
    this.ctx.fillRect(s.ball.x, s.ball.y, s.ball.size, s.ball.size)

    // dashed center line
    const w = this.canvas.width,
      h = this.canvas.height
    for (let y = 0; y < h; y += 30) {
      this.ctx.fillRect(w / 2 - 2, y, 4, 15)
    }
  }

  _drawSnake() {
    const s = this.gameState
    const gs = s.gridSize
    s.snake.forEach((seg, i) => {
      this.ctx.globalAlpha = i === 0 ? 1 : 0.7
      this.ctx.fillRect(seg.x * gs, seg.y * gs, gs - 2, gs - 2)
    })
    this.ctx.globalAlpha = 1
    // draw food
    this.ctx.beginPath()
    this.ctx.arc(
      s.food.x * gs + gs / 2,
      s.food.y * gs + gs / 2,
      gs / 2 - 2,
      0,
      Math.PI * 2,
    )
    this.ctx.fill()
  }

  _drawTetris() {
    const s = this.gameState
    const gs = s.gridSize
    s.board.forEach((p) => {
      this.ctx.fillRect(p.x * gs, p.y * gs, gs - 2, gs - 2)
    })
    s.activePiece.shape.forEach((p) => {
      this.ctx.fillRect(
        (s.activePiece.x + p.x) * gs,
        (s.activePiece.y + p.y) * gs,
        gs - 2,
        gs - 2,
      )
    })
  }

  _drawPacman() {
    const s = this.gameState
    const gs = s.gridSize

    // dots
    this.ctx.globalAlpha = 0.5
    s.dots.forEach((d) => {
      this.ctx.fillRect(d.x * gs + gs / 2, d.y * gs + gs / 2, 4, 4)
    })
    this.ctx.globalAlpha = 1

    // pacman body
    this.ctx.save()
    this.ctx.translate(s.pacman.x * gs + gs / 2, s.pacman.y * gs + gs / 2)
    let rot = (s.pacman.dir * Math.PI) / 2
    if (s.pacman.dir === 2)
      rot = Math.PI // fix left rotation
    else if (s.pacman.dir === 3) rot = -Math.PI / 2 // fix up rotation
    this.ctx.rotate(rot)

    this.ctx.beginPath()
    const mouthAngle = s.pacman.mouth * Math.PI
    this.ctx.arc(0, 0, gs / 2 - 2, mouthAngle, Math.PI * 2 - mouthAngle)
    this.ctx.lineTo(0, 0)
    this.ctx.fill()
    this.ctx.restore()

    // ghosts
    s.ghosts.forEach((g, i) => {
      this.ctx.beginPath()
      const gx = g.x * gs + gs / 2
      const gy = g.y * gs + gs / 2
      this.ctx.arc(gx, gy, gs / 2 - 2, Math.PI, 0)
      this.ctx.lineTo(gx + gs / 2 - 2, gy + gs / 2 - 2)
      // Ghost skirt
      this.ctx.lineTo(gx + gs / 4, gy + gs / 4)
      this.ctx.lineTo(gx, gy + gs / 2 - 2)
      this.ctx.lineTo(gx - gs / 4, gy + gs / 4)
      this.ctx.lineTo(gx - gs / 2 + 2, gy + gs / 2 - 2)
      this.ctx.fill()
    })
  }

  _drawSpaceInvaders() {
    const s = this.gameState
    this.ctx.fillRect(s.player.x, s.player.y, s.player.width, s.player.height)
    this.ctx.fillRect(s.player.x + 15, s.player.y - 10, 10, 10)

    s.enemies.forEach((e) => {
      if (e.alive) {
        this.ctx.fillRect(e.x, e.y, e.width, e.height)
        this.ctx.fillRect(e.x - 5, e.y + 5, 5, 10)
        this.ctx.fillRect(e.x + e.width, e.y + 5, 5, 10)
      }
    })
    s.bullets.forEach((b) => this.ctx.fillRect(b.x - 2, b.y, 4, 10))
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this.rafId = requestAnimationFrame((t) => this.animate(t))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)

    if (
      this.type === "pacman" ||
      this.type === "space_invaders" ||
      this.type === "tetris"
    ) {
      this.update()
    } else {
      // Pong and snake update slightly slower intentionally for balance
      this.update()
    }

    this.draw()
  }
}
