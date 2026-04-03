export class RetroGameEffect {
  constructor(canvasId, color = "#00ff00") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0

    this.gameState = {
      player: { x: 0, y: 0, width: 40, height: 20 },
      bullets: [],
      enemies: [],
      enemyBullets: [],
      score: 0,
      direction: 1,
      moveTimer: 0,
      shootTimer: 0,
    }

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
          "A",
          "w",
          "W",
          "s",
          "S",
          "d",
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

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initGame()
  }

  initGame() {
    const w = this.canvas.width
    const h = this.canvas.height

    this.gameState.player.x = w / 2 - 20
    this.gameState.player.y = h - 60
    this.gameState.bullets = []
    this.gameState.enemyBullets = []
    this.gameState.enemies = []

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
    const speed = 10

    // Move player
    if (this.manualControl) {
      if (this.keys["ArrowLeft"] || this.keys["a"] || this.keys["A"]) {
        this.gameState.player.x -= speed
      }
      if (this.keys["ArrowRight"] || this.keys["d"] || this.keys["D"]) {
        this.gameState.player.x += speed
      }
      if (this.keys["ArrowUp"] || this.keys["w"] || this.keys["W"]) {
        this.gameState.player.y -= speed
      }
      if (this.keys["ArrowDown"] || this.keys["s"] || this.keys["S"]) {
        this.gameState.player.y += speed
      }

      // Restrict player to canvas bounds
      this.gameState.player.x = Math.max(
        0,
        Math.min(w - this.gameState.player.width, this.gameState.player.x),
      )
      this.gameState.player.y = Math.max(
        0,
        Math.min(h - this.gameState.player.height, this.gameState.player.y),
      )
    } else {
      // Auto-ai
      const targetEnemy = this.gameState.enemies.find((e) => e.alive)
      if (targetEnemy) {
        const centerX = targetEnemy.x + targetEnemy.width / 2
        if (this.gameState.player.x + 20 < centerX) this.gameState.player.x += 5
        else if (this.gameState.player.x + 20 > centerX)
          this.gameState.player.x -= 5
      }
    }

    // Shoot
    this.gameState.shootTimer++
    if (this.gameState.shootTimer > 20) {
      this.gameState.bullets.push({
        x: this.gameState.player.x + 20,
        y: this.gameState.player.y,
        speed: 10,
      })
      this.gameState.shootTimer = 0
    }

    // Update bullets
    this.gameState.bullets = this.gameState.bullets.filter((b) => {
      b.y -= b.speed
      let hit = false
      this.gameState.enemies.forEach((e) => {
        if (
          e.alive &&
          b.x > e.x &&
          b.x < e.x + e.width &&
          b.y > e.y &&
          b.y < e.y + e.height
        ) {
          e.alive = false
          hit = true
          this.gameState.score += 10
        }
      })
      return !hit && b.y > 0
    })

    // Move enemies
    this.gameState.moveTimer++
    if (this.gameState.moveTimer > 30) {
      let edge = false
      this.gameState.enemies.forEach((e) => {
        if (e.alive) {
          e.x += 20 * this.gameState.direction
          if (e.x > w - 50 || e.x < 50) edge = true
        }
      })

      if (edge) {
        this.gameState.direction *= -1
        this.gameState.enemies.forEach((e) => (e.y += 20))
      }
      this.gameState.moveTimer = 0
    }

    // Reset game if all enemies dead or reached bottom
    if (
      !this.gameState.enemies.some((e) => e.alive) ||
      this.gameState.enemies.some((e) => e.alive && e.y > h - 100)
    ) {
      this.initGame()
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.fillStyle = this.color

    // Draw player
    this.ctx.fillRect(
      this.gameState.player.x,
      this.gameState.player.y,
      this.gameState.player.width,
      this.gameState.player.height,
    )
    this.ctx.fillRect(
      this.gameState.player.x + 15,
      this.gameState.player.y - 10,
      10,
      10,
    )

    // Draw enemies
    this.gameState.enemies.forEach((e) => {
      if (e.alive) {
        this.ctx.fillRect(e.x, e.y, e.width, e.height)
        // Little legs/antennae
        this.ctx.fillRect(e.x - 5, e.y + 5, 5, 10)
        this.ctx.fillRect(e.x + e.width, e.y + 5, 5, 10)
      }
    })

    // Draw bullets
    this.ctx.fillStyle = "#fff"
    this.gameState.bullets.forEach((b) => {
      this.ctx.fillRect(b.x - 2, b.y, 4, 10)
    })

    // CRT Scanlines effect
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
    for (let i = 0; i < this.canvas.height; i += 4) {
      this.ctx.fillRect(0, i, this.canvas.width, 1)
    }
  }

  animate(currentTime) {
    if (!this.active) return
    requestAnimationFrame((time) => this.animate(time))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed > this.fpsInterval) {
      this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)
      this.update()
      this.draw()
    }
  }

  updateAccentColor(newColor) {
    this.color = newColor
  }
}
