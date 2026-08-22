/**
 * PixelRunEffect — Premium 8-Bit Retro Side-Scroller Action Game
 * Features:
 * - Autonomous Ally AI (Independent Knights & Archers with combat AI, charge & stomp)
 * - Weapon Upgrade Progression (Tier 1 Steel ➔ Tier 2 Inferno Fire ➔ Tier 3 Thunderstorm)
 * - Destructible Catapults / Artillery (stomping & long-range smash)
 * - Multi-Phase Dynamic Bosses with Head Stomp
 * - High Contrast Visuals & Arcade HUD
 */
export class PixelRunEffect {
  constructor(canvasId, color = "#00e5ff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null
    this.active = false
    this.color = color || "#00e5ff"

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this.tick = 0

    // Game state: "playing" | "gameover" | "stageclear"
    this.state = "playing"
    this.score = 0
    this.highScore = parseInt(localStorage.getItem("startpage_pixelrun_highscore") || "0", 10)
    this.kills = 0
    this.combo = 0
    this.comboTimer = 0
    this.weaponLevel = 1 // 1: Steel, 2: Inferno, 3: Thunder

    this.clouds = []
    this.mountains = []
    this.stars = []
    this.coins = []
    this.platforms = []
    this.particles = []
    this.floatingTexts = []
    this.arrows = []
    this.towers = []
    this.bossProjectiles = []
    this.items = []
    this.heroes = []
    this.enemies = []
    this.allies = []
    this.slashes = []
    this.boss = null
    this.level = 1
    this.stageClearTimer = 0

    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      jump: false,
      shoot: false,
      sword: false,
      shield: false,
      shotgun: false
    }

    this._resizeHandler = () => this.resize()
    this._keydownHandler = (e) => this._handleKey(e, true)
    this._keyupHandler = (e) => this._handleKey(e, false)

    if (this.canvas) {
      window.addEventListener("resize", this._resizeHandler)
      this.resize()
    }
  }

  _handleKey(e, isPressed) {
    if (!this.active) return
    const key = e.key.toLowerCase()

    if (key === " " || key === "spacebar") {
      this.keys.jump = isPressed
      this.keys.up = isPressed
      if (isPressed && this.state === "gameover") {
        this.resetGame()
        e.preventDefault()
        return
      }
    }
    if (key === "w" || e.key === "ArrowUp") {
      this.keys.up = isPressed
      this.keys.jump = isPressed
    }
    if (key === "s" || e.key === "ArrowDown") this.keys.down = isPressed
    if (key === "a" || e.key === "ArrowLeft") this.keys.left = isPressed
    if (key === "d" || e.key === "ArrowRight") this.keys.right = isPressed
    if (key === "j" || key === "z") this.keys.shoot = isPressed
    if (key === "k" || key === "x") this.keys.sword = isPressed
    if (key === "l" || key === "c") this.keys.shield = isPressed
    if (key === "u" || key === "v" || key === "i") this.keys.shotgun = isPressed
    if (key === "r" && isPressed) {
      this.resetGame()
      e.preventDefault()
      return
    }

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "j", "k", "l", "u", "z", "x", "c", "v", "i", "r"].includes(key)) {
      e.preventDefault()
    }
  }

  get S() {
    if (!this.canvas) return 3
    const minDim = Math.min(this.canvas.width, this.canvas.height)
    return Math.max(3, Math.floor(minDim / 190))
  }

  _drawSprite(sprite, x, y, s, flipX = false, alpha = 1, flashColor = null) {
    const ctx = this.ctx
    if (!ctx || !sprite || !sprite.length) return
    const rows = sprite.length
    const cols = sprite[0].length
    ctx.globalAlpha = alpha

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = sprite[r][flipX ? cols - 1 - c : c]
        if (!color) continue
        ctx.fillStyle = flashColor || color
        ctx.fillRect(Math.round(x + c * s), Math.round(y + r * s), s, s)
      }
    }
    ctx.globalAlpha = 1
  }

  // ─── Sprites Definition ──────────────────────────────────────────────────

  get _heroFrames() {
    const _ = ""
    const R = this.weaponLevel === 3 ? "#FBBF24" : (this.weaponLevel === 2 ? "#EF4444" : (this.color || "#00E5FF"))
    const S = "#FFD1A4", B = "#111827", bl = "#2563EB", br = "#D97706", G = "#FBBF24"

    const f0 = [
      [_,_,B,B,B,B,_,_],
      [_,B,R,R,R,R,B,G],
      [_,B,R,R,R,R,R,B],
      [_,B,S,B,S,S,S,B],
      [B,S,B,S,S,B,S,B],
      [B,S,S,S,S,S,S,B],
      [_,B,S,S,S,S,B,_],
      [_,_,B,R,R,B,_,_],
      [_,B,R,bl,bl,R,B,_],
      [B,R,bl,bl,bl,bl,R,B],
      [B,B,B,bl,bl,B,B,B],
      [_,_,br,br,br,br,_,_]
    ]

    const f1 = [
      [_,_,B,B,B,B,_,_],
      [_,B,R,R,R,R,B,G],
      [_,B,R,R,R,R,R,B],
      [_,B,S,B,S,S,S,B],
      [B,S,B,S,S,B,S,B],
      [B,S,S,S,S,S,S,B],
      [_,B,S,S,S,S,B,_],
      [_,_,B,R,R,B,_,_],
      [_,B,R,bl,bl,R,B,_],
      [_,B,bl,bl,bl,bl,B,_],
      [_,B,bl,B,B,bl,B,_],
      [_,br,br,_,_,br,br,_]
    ]

    const fJump = [
      [_,_,B,B,B,B,_,_],
      [_,B,R,R,R,R,B,G],
      [_,B,R,R,R,R,R,B],
      [_,B,S,B,S,S,S,B],
      [B,S,B,S,S,B,S,B],
      [B,S,S,S,S,S,S,B],
      [_,B,S,S,S,S,B,_],
      [B,R,R,R,R,R,R,B],
      [B,bl,bl,bl,bl,bl,bl,B],
      [_,B,bl,B,B,bl,B,_],
      [_,br,br,_,_,br,br,_],
      [_,_,_,_,_,_,_,_]
    ]

    return [f0, f1, fJump]
  }

  // Autonomous Archer Ally & Autonomous Knight Ally Sprites
  get _allyFrames() {
    const _ = "", S = "#FFD1A4", B = "#111827"
    // Archer (Green Ranger)
    const G = "#10B981", D = "#047857"
    const archer0 = [
      [_,_,B,B,B,B,_,_],
      [_,B,G,G,G,G,B,_],
      [_,B,G,G,G,G,G,B],
      [_,B,S,B,S,S,S,B],
      [B,S,B,S,S,B,S,B],
      [B,S,S,S,S,S,S,B],
      [_,B,S,S,S,S,B,_],
      [_,_,B,G,G,B,_,_],
      [_,B,G,D,D,G,B,_],
      [B,G,D,D,D,D,G,B],
      [B,B,B,D,D,B,B,B],
      [_,_,B,B,B,B,_,_]
    ]
    // Paladin Knight (Gold & Crimson Armor)
    const P = this.weaponLevel >= 2 ? "#DC2626" : "#3B82F6"
    const Y = "#FBBF24"
    const knight0 = [
      [_,_,B,B,B,B,_,_],
      [_,B,Y,Y,Y,Y,B,_],
      [_,B,P,P,P,P,P,B],
      [_,B,S,B,S,S,S,B],
      [B,S,B,S,S,B,S,B],
      [B,S,S,S,S,S,S,B],
      [_,B,S,S,S,S,B,_],
      [_,_,B,P,P,B,_,_],
      [_,B,Y,P,P,Y,B,_],
      [B,P,P,P,P,P,P,B],
      [B,B,B,P,P,B,B,B],
      [_,_,B,B,B,B,_,_]
    ]
    return { archer: [archer0, archer0], knight: [knight0, knight0] }
  }

  get _enemyFrames() {
    const _ = "", B = "#111827", R = "#EF4444", W = "#FFFFFF"
    let body = this.level > 7 ? "#10B981" : (this.level > 3 ? "#8B5CF6" : "#F97316")
    let dark = this.level > 7 ? "#047857" : (this.level > 3 ? "#6D28D9" : "#C2410C")

    const f0 = [
      [_,_,B,B,B,B,_,_],
      [_,B,body,body,body,body,B,_],
      [B,body,body,body,body,body,body,B],
      [B,body,W,W,body,W,W,B],
      [B,body,R,B,body,R,B,B],
      [B,dark,body,body,body,body,dark,B],
      [_,B,B,B,B,B,B,_],
      [_,B,B,_,_,B,B,_]
    ]
    const f1 = [
      [_,_,B,B,B,B,_,_],
      [_,B,body,body,body,body,B,_],
      [B,body,body,body,body,body,body,B],
      [B,body,W,W,body,W,W,B],
      [B,body,R,B,body,R,B,B],
      [B,dark,body,body,body,body,dark,B],
      [_,B,B,B,B,B,B,_],
      [B,B,_,_,_,_,B,B]
    ]
    const fDead = [
      [_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_],
      [_,_,B,B,B,B,_,_],
      [B,body,body,body,body,body,body,B],
      [B,body,R,B,body,R,B,B],
      [B,B,B,B,B,B,B,B],
      [_,_,_,_,_,_,_,_]
    ]
    return [f0, f1, fDead]
  }

  get _flyingEnemyFrames() {
    const _ = "", B = "#111827", W = "#F3F4F6", R = "#EF4444", P = "#A855F7"
    const f0 = [
      [_,_,B,B,B,B,_,_],
      [B,P,P,P,P,P,P,B],
      [B,W,R,W,W,R,W,B],
      [B,P,P,P,P,P,P,B],
      [_,B,B,B,B,B,B,_],
      [B,_,_,_,_,_,_,B]
    ]
    const f1 = [
      [B,_,_,_,_,_,_,B],
      [B,P,P,P,P,P,P,B],
      [B,W,R,W,W,R,W,B],
      [B,P,P,P,P,P,P,B],
      [_,B,B,B,B,B,B,_],
      [_,_,B,B,B,B,_,_]
    ]
    return [f0, f1]
  }

  get _slimeBossFrames() {
    const _ = "", G = "#22C55E", D = "#15803D", W = "#FFFFFF", B = "#111827", R = "#EF4444", O = "#F97316"
    const normal = [
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,B,B,G,G,G,G,G,G,B,B,_],
      [B,G,G,G,G,G,G,G,G,G,G,B],
      [B,G,W,W,G,G,G,G,W,W,G,B],
      [B,G,R,B,G,G,G,G,R,B,G,B],
      [B,G,G,G,G,G,G,G,G,G,G,B],
      [B,D,D,D,D,D,D,D,D,D,D,B],
      [_,B,B,B,B,B,B,B,B,B,B,_]
    ]
    const enraged = [
      [_,_,_,B,B,B,B,B,B,_,_,_],
      [_,B,B,O,O,O,O,O,O,B,B,_],
      [B,O,O,O,O,O,O,O,O,O,O,B],
      [B,O,W,W,O,O,O,O,W,W,O,B],
      [B,O,R,B,O,O,O,O,R,B,O,B],
      [B,O,O,O,O,O,O,O,O,O,O,B],
      [B,R,R,R,R,R,R,R,R,R,R,B],
      [_,B,B,B,B,B,B,B,B,B,B,_]
    ]
    return [normal, enraged]
  }

  get _wraithBossFrames() {
    const _ = "", B = "#0F172A", P = "#7E22CE", V = "#C084FC", W = "#FFFFFF", R = "#EF4444"
    const f0 = [
      [_,_,_,B,B,B,B,_,_,_],
      [_,B,B,P,P,P,P,B,B,_],
      [B,P,V,V,V,V,V,V,P,B],
      [B,P,W,R,P,P,W,R,P,B],
      [B,P,V,V,V,V,V,V,P,B],
      [_,B,P,P,P,P,P,P,B,_],
      [B,_,B,P,P,P,P,B,_,B],
      [_,_,_,B,_,_,B,_,_,_]
    ]
    return [f0]
  }

  get _dragonBossFrames() {
    const _ = "", R = "#DC2626", D = "#7F1D1D", Y = "#FBBF24", B = "#0F172A"
    const f0 = [
      [_,_,_,B,B,B,B,B,_,_,_,_],
      [_,B,B,R,R,R,R,R,B,B,_,_],
      [B,R,R,Y,R,R,R,R,R,R,B,_],
      [B,R,Y,B,R,R,R,R,Y,B,R,B],
      [B,R,R,R,R,R,R,R,R,R,R,B],
      [_,B,R,Y,Y,Y,Y,Y,Y,R,B,_],
      [_,_,B,D,D,D,D,D,D,B,_,_],
      [_,B,B,_,_,_,_,_,_,B,B,_]
    ]
    return [f0]
  }

  get _catapultSprite() {
    const _ = "", W = "#92400E", D = "#78350F", M = "#64748B", B = "#111827", R = "#EF4444"
    return [
      [_,_,_,_,B,R,R,B,_,_],
      [_,_,_,B,M,M,M,B,_,_],
      [_,_,B,D,D,D,D,B,_,_],
      [_,B,W,W,W,W,W,W,B,_],
      [B,W,D,W,D,W,D,W,D,B],
      [B,M,M,B,B,B,M,M,B,B],
      [B,M,M,B,_,B,M,M,B,_]
    ]
  }

  get _arrowSprite() {
    if (this.weaponLevel === 3) {
      // Thunder Arrow (Electric Yellow/Purple)
      return [["#FDE047", "#FBBF24", "#C084FC", "#FFFFFF", "#FFFFFF"]]
    } else if (this.weaponLevel === 2) {
      // Inferno Fire Arrow (Orange/Red)
      return [["#EF4444", "#F97316", "#FDE047", "#FFFFFF", "#FFFFFF"]]
    }
    return [["#00E5FF", "#38BDF8", "#7DD3FC", "#FFFFFF", "#FFFFFF"]]
  }

  get _shotgunPelletSprite() {
    if (this.weaponLevel === 3) {
      return [["#C084FC", "#FDE047"], ["#FDE047", "#C084FC"]]
    } else if (this.weaponLevel === 2) {
      return [["#EF4444", "#F97316"], ["#F97316", "#EF4444"]]
    }
    return [["#FBBF24", "#F59E0B"], ["#F59E0B", "#FBBF24"]]
  }

  get _swordSlashSprite() {
    const W = "#FFFFFF", _ = ""
    let C = "#38BDF8"
    if (this.weaponLevel === 3) C = "#FBBF24" // Lightning
    else if (this.weaponLevel === 2) C = "#EF4444" // Fire
    return [
      [_,_,_,W,W],
      [_,W,C,C,W],
      [W,C,W,_,_],
      [W,W,_,_,_]
    ]
  }

  get _shieldSprite() {
    const B = "#1E293B", C = this.weaponLevel >= 2 ? "#F59E0B" : (this.color || "#00E5FF"), W = "#FFFFFF"
    return [
      [B, C, C, B],
      [C, W, C, C],
      [C, C, W, C],
      [C, C, C, C],
      [B, C, C, B]
    ]
  }

  get _itemSprites() {
    const R = "#EF4444", W = "#FFFFFF", B = "#111827", Y = "#FBBF24", G = "#10B981", P = "#A855F7", _ = ""
    return {
      medkit: [
        [_,R,R,R,_],
        [R,W,W,W,R],
        [R,W,R,W,R],
        [R,W,W,W,R],
        [_,R,R,R,_]
      ],
      shotgunAmmo: [
        [Y,Y,B],
        [Y,Y,B],
        [Y,Y,B],
        [B,B,B]
      ],
      allySpawn: [
        [_,G,G,G,_],
        [G,W,W,W,G],
        [G,W,G,W,G],
        [G,W,W,W,G],
        [_,G,G,G,_]
      ],
      weaponUpgrade: [
        [_,Y,Y,Y,_],
        [Y,P,W,P,Y],
        [Y,W,W,W,Y],
        [Y,P,W,P,Y],
        [_,Y,Y,Y,_]
      ]
    }
  }

  get _fireballSprite() {
    return [
      ["#EF4444", "#F59E0B", "#EF4444"],
      ["#F59E0B", "#FEF08A", "#F59E0B"],
      ["#EF4444", "#F59E0B", "#EF4444"]
    ]
  }

  get _boulderSprite() {
    const B = "#0F172A", M = "#64748B", D = "#334155"
    return [
      [B,M,M,B],
      [M,D,M,M],
      [M,M,D,B],
      [B,M,B,B]
    ]
  }

  _coinFrames() {
    const Y = "#FBBF24", W = "#FFFBEB", G = "#D97706", _ = ""
    return [
      [
        [_,Y,Y,_],
        [Y,W,Y,Y],
        [Y,Y,Y,Y],
        [Y,Y,G,Y],
        [_,Y,Y,_]
      ]
    ]
  }

  _drawQuestionBlock(ctx, x, y, s, offset = 0) {
    const Y = "#F59E0B", Ylight = "#FDE047", B = "#0F172A"
    const bx = Math.round(x)
    const by = Math.round(y + offset)
    const size = s * 8

    ctx.fillStyle = Y
    ctx.fillRect(bx, by, size, size)
    ctx.fillStyle = Ylight
    ctx.fillRect(bx + s, by + s, size - s * 2, s)
    ctx.fillRect(bx + s, by + s, s, size - s * 2)

    // '?' mark
    ctx.fillStyle = B
    ctx.fillRect(bx + s * 3, by + s * 2, s * 2, s)
    ctx.fillRect(bx + s * 4, by + s * 3, s, s)
    ctx.fillRect(bx + s * 3, by + s * 4, s * 2, s)
    ctx.fillRect(bx + s * 3, by + s * 6, s * 2, s)

    ctx.strokeStyle = B
    ctx.lineWidth = Math.max(1, s * 0.5)
    ctx.strokeRect(bx, by, size, size)
  }

  _drawBrickBlock(ctx, x, y, s, offset = 0) {
    const br1 = "#B91C1C", br2 = "#7F1D1D", B = "#0F172A"
    const bx = Math.round(x)
    const by = Math.round(y + offset)
    const size = s * 8

    ctx.fillStyle = br1
    ctx.fillRect(bx, by, size, size)
    ctx.fillStyle = br2
    ctx.fillRect(bx + s, by + size / 2, size - s * 2, s)

    ctx.strokeStyle = B
    ctx.lineWidth = Math.max(1, s * 0.5)
    ctx.strokeRect(bx, by, size, size)
  }

  _drawMountains(s) {
    const groundY = this.canvas.height - s * 5
    for (const m of this.mountains) {
      this.ctx.fillStyle = m.color
      this.ctx.beginPath()
      this.ctx.moveTo(m.x, groundY)
      this.ctx.lineTo(m.x + m.w / 2, groundY - m.h)
      this.ctx.lineTo(m.x + m.w, groundY)
      this.ctx.fill()
    }
  }

  _drawGround(s) {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height, groundY = H - s * 5
    const isDark = this.level > 5
    const grassTop = isDark ? "#059669" : "#16A34A"
    const dirt1 = isDark ? "#1E293B" : "#854D0E"
    const dirt2 = isDark ? "#0F172A" : "#713F12"
    const border = "#0B0F17"

    for (let x = 0; x < W; x += s * 8) {
      ctx.fillStyle = grassTop
      ctx.fillRect(x, groundY, s * 8, s * 2)

      ctx.fillStyle = (Math.floor(x / (s * 8)) % 2 === 0) ? dirt1 : dirt2
      ctx.fillRect(x, groundY + s * 2, s * 8, H - (groundY + s * 2))

      ctx.strokeStyle = border
      ctx.lineWidth = Math.max(1, s * 0.4)
      ctx.strokeRect(x, groundY, s * 8, H - groundY)
    }
  }

  addFloatingText(text, x, y, color = "#FFF") {
    this.floatingTexts.push({
      text,
      x,
      y,
      vy: -1.8,
      alpha: 1,
      color,
      life: 40
    })
  }

  addSparks(x, y, count = 8, color = "#FDE047") {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5)
      const speed = 2 + Math.random() * 4.5
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: this.S * (0.8 + Math.random() * 0.7),
        life: 1
      })
    }
  }

  resize() {
    if (!this.canvas) return
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    if (!this.active || !this.heroes || this.heroes.length === 0) {
      this._initScene()
    } else {
      const s = this.S, groundY = this.canvas.height - s * 5
      const h = this.heroes[0]
      if (h && !h.jumping) h.y = groundY - s * 12
      this.allies.forEach(a => {
        if (!a.jumping) a.y = groundY - s * 12
      })
    }
  }

  resetGame() {
    this.level = 1
    this.score = 0
    this.kills = 0
    this.combo = 0
    this.weaponLevel = 1
    this.state = "playing"
    this.allies = []
    this._initScene()
  }

  _initScene() {
    if (!this.canvas) return
    const W = this.canvas.width, H = this.canvas.height, s = this.S, groundY = H - s * 5
    this.tick = 0
    this.state = "playing"

    // Parallax elements
    this.mountains = []
    const mountColors = [
      "rgba(30, 41, 59, 0.75)",
      "rgba(15, 23, 42, 0.85)",
      "rgba(5, 10, 20, 0.95)"
    ]
    const mColor = this.level > 7 ? mountColors[2] : (this.level > 4 ? mountColors[1] : mountColors[0])
    for (let i = 0; i < 8; i++) {
      this.mountains.push({
        x: Math.random() * W * 1.5,
        w: 220 + Math.random() * 380,
        h: 120 + Math.random() * 220,
        speed: 0.15,
        color: mColor
      })
    }

    this.clouds = []
    for (let i = 0; i < 7; i++) {
      this.clouds.push({
        x: Math.random() * W,
        y: H * 0.08 + Math.random() * H * 0.25,
        speed: 0.25 + Math.random() * 0.35,
        w: s * (10 + Math.random() * 8)
      })
    }

    // Platforms & Coins
    this.platforms = []
    const numPlatforms = Math.max(3, Math.floor(W / 280))
    for (let i = 0; i < numPlatforms; i++) {
      this.platforms.push({
        x: 220 + i * 320 + Math.random() * 60,
        y: groundY - s * 24,
        type: Math.random() < 0.45 ? "Q" : "B",
        bump: 0,
        hasItem: true
      })
    }

    this.coins = []
    this.platforms.forEach(p => {
      this.coins.push({ x: p.x + s * 2, y: p.y - s * 10, collected: false, bobTick: Math.random() * 10 })
    })

    // Hero & Allies initialization
    if (!this.heroes || this.heroes.length === 0 || this.level === 1) {
      this.heroes = [{
        x: 120,
        y: groundY - s * 12,
        hp: 100,
        maxHp: 100,
        speed: 5.5,
        frame: 0,
        timer: 0,
        jumping: false,
        vy: 0,
        flipX: false,
        flicker: 0,
        flash: 0,
        shootTimer: 0,
        swordTimer: 0,
        shieldActive: false,
        shieldEnergy: 100,
        shotgunAmmo: 8
      }]
      this.allies = [this._createAlly(190, groundY - s * 12, "knight")]
    } else {
      const h = this.heroes[0]
      h.x = 120
      h.y = groundY - s * 12
      h.vy = 0
      h.jumping = false
      h.hp = Math.min(100, h.hp + 25)
      h.shotgunAmmo = Math.min(15, h.shotgunAmmo + 4)

      // Reposition surviving allies smoothly at the entrance of new stage
      this.allies.forEach((a, idx) => {
        a.x = Math.max(25, 75 - idx * 35)
        a.y = groundY - s * 12
        a.vy = 0
        a.jumping = false
        a.target = null
        a.state = "patrol"
        a.flipX = false
      })
    }

    // Enemies
    this.enemies = []
    const numEnemies = Math.min(8, 3 + Math.floor(this.level * 0.7))
    for (let i = 0; i < numEnemies; i++) {
      const isFlying = Math.random() < (this.level * 0.08)
      this.enemies.push(this._createEnemy(W + 300 + i * 350, isFlying))
    }

    this.particles = []
    this.floatingTexts = []
    this.arrows = []
    this.slashes = []
    this.bossProjectiles = []
    this.items = []
    this.towers = []

    // Destructible Catapults / Artillery
    const numTowers = Math.min(Math.max(1, this.level - 1), 4)
    for (let i = 0; i < numTowers; i++) {
      this.towers.push({
        x: 750 + i * 550 + Math.random() * 150,
        y: groundY - s * 7,
        hp: 2,
        maxHp: 2,
        dead: false,
        deadTimer: 0,
        flash: 0,
        timer: Math.random() * 60
      })
    }

    // Ground items with Weapon Upgrade drop
    const types = ["medkit", "shotgunAmmo", "allySpawn", "weaponUpgrade"]
    for (let i = 0; i < 4; i++) {
      this.items.push({
        x: 350 + Math.random() * (W - 700),
        y: groundY - s * 5,
        type: types[i % types.length],
        collected: false
      })
    }

    // Boss generation
    this.boss = null
    if (this.level === 4) {
      this.boss = {
        name: "SLIME KING",
        type: "slime",
        x: W - s * 45,
        y: groundY - s * 18,
        hp: 80,
        maxHp: 80,
        timer: 0,
        frame: 0,
        dead: false,
        deadTimer: 0,
        vy: 0,
        flash: 0,
        enraged: false
      }
    } else if (this.level === 7) {
      this.boss = {
        name: "SHADOW WRAITH",
        type: "wraith",
        x: W - s * 50,
        y: groundY - s * 45,
        hp: 140,
        maxHp: 140,
        timer: 0,
        frame: 0,
        dead: false,
        deadTimer: 0,
        vy: 2.5,
        flash: 0,
        enraged: false
      }
    } else if (this.level === 10) {
      this.boss = {
        name: "INFERNO DRAGON",
        type: "dragon",
        x: W - s * 65,
        y: groundY - s * 50,
        hp: 220,
        maxHp: 220,
        timer: 0,
        frame: 0,
        dead: false,
        deadTimer: 0,
        vy: -3.5,
        flash: 0,
        enraged: false
      }
    }
  }

  _createEnemy(startX, isFlying = false) {
    const s = this.S, H = this.canvas.height, gY = H - s * 5
    const baseSpeed = 1.6 + (this.level * 0.2)
    return {
      x: startX,
      y: isFlying ? gY - s * 24 : gY - s * 8,
      speed: -(baseSpeed + Math.random() * 1.2),
      frame: 0,
      timer: 0,
      dead: false,
      deadTimer: 0,
      vy: 0,
      jumping: false,
      isFlying,
      floatTick: Math.random() * 10,
      flash: 0
    }
  }

  _createAlly(x, y, forceRole = null) {
    const role = forceRole || (Math.random() < 0.6 ? "knight" : "archer")
    return {
      x,
      y,
      role,
      hp: 55,
      maxHp: 55,
      speed: 4.8 + Math.random() * 0.8,
      vx: 0,
      vy: 0,
      jumping: false,
      flipX: false,
      frame: 0,
      timer: 0,
      flash: 0,
      dead: false,
      deadTimer: 0,
      slashTimer: 0,
      supportCooldown: 100,
      state: "patrol", // "patrol" | "charge" | "stomp"
      target: null
    }
  }

  _update() {
    if (this.state === "gameover") return

    const W = this.canvas.width, H = this.canvas.height, s = this.S, gY = H - s * 5
    this.tick++

    // Combo decay
    if (this.comboTimer > 0) {
      this.comboTimer--
      if (this.comboTimer === 0) this.combo = 0
    }

    // Parallax
    this.mountains.forEach(m => {
      m.x -= m.speed
      if (m.x + m.w < 0) m.x = W + 50
    })
    this.clouds.forEach(c => {
      c.x -= c.speed
      if (c.x + 150 < 0) c.x = W + 100
    })

    const h = this.heroes[0]
    if (!h) return

    if (h.flash > 0) h.flash--
    if (h.flicker > 0) h.flicker--

    // Shield
    if (this.keys.shield && h.shieldEnergy > 0) {
      h.shieldActive = true
      h.shieldEnergy = Math.max(0, h.shieldEnergy - 0.6)
    } else {
      h.shieldActive = false
      h.shieldEnergy = Math.min(100, h.shieldEnergy + 0.4)
    }

    // Player Move
    let moveSpeed = h.shieldActive ? h.speed * 0.5 : h.speed
    if (this.keys.left) {
      h.x -= moveSpeed * 1.4
      h.flipX = true
    }
    if (this.keys.right) {
      h.x += moveSpeed * 1.4
      h.flipX = false
    }

    // Jump
    if (this.keys.jump && !h.jumping && !h.shieldActive) {
      h.jumping = true
      h.vy = -s * 8.2
      this.addSparks(h.x + s * 4, h.y + s * 12, 4, "#94A3B8")
    }

    // Fast Fall
    if (this.keys.down && h.jumping) {
      h.vy += s * 0.8
    }

    // Bow Attack
    if (this.keys.shoot && h.shootTimer === 0 && !h.shieldActive) {
      h.shootTimer = 11
      const arrowX = h.flipX ? h.x - s * 4 : h.x + s * 8
      const arrowY = h.y + s * 5
      const vx = h.flipX ? -s * 14 : s * 14

      if (this.weaponLevel === 3) {
        // Thunder Bow: Triple Arrows
        for (let angle = -1; angle <= 1; angle++) {
          this.arrows.push({ x: arrowX, y: arrowY, vx, vy: angle * s * 1.2, flipX: h.flipX, type: "arrow" })
        }
        this.addSparks(arrowX, arrowY, 4, "#FDE047")
      } else {
        this.arrows.push({ x: arrowX, y: arrowY, vx, flipX: h.flipX, type: "arrow" })
        this.addSparks(arrowX, arrowY, 3, this.weaponLevel === 2 ? "#EF4444" : "#38BDF8")
      }
    }

    // Shotgun Attack
    if (this.keys.shotgun && h.shootTimer === 0 && h.shotgunAmmo > 0 && !h.shieldActive) {
      h.shootTimer = 20
      h.shotgunAmmo--
      const originX = h.flipX ? h.x - s * 4 : h.x + s * 8
      const originY = h.y + s * 5
      const pelletCount = this.weaponLevel === 3 ? 4 : (this.weaponLevel === 2 ? 3 : 2)
      for (let i = -pelletCount; i <= pelletCount; i++) {
        this.arrows.push({
          x: originX,
          y: originY,
          vx: h.flipX ? -s * 12 : s * 12,
          vy: i * s * 1.1,
          flipX: h.flipX,
          type: "pellet"
        })
      }
      this.addSparks(originX, originY, 8, this.weaponLevel >= 2 ? "#EF4444" : "#FBBF24")
    }

    // Melee Sword Slash
    if (this.keys.sword && h.swordTimer === 0 && !h.shieldActive) {
      h.swordTimer = 13
      const slashX = h.flipX ? h.x - s * 14 : h.x + s * 8
      const slashY = h.y + s * 2
      this.slashes.push({ x: slashX, y: slashY, flipX: h.flipX, life: 7 })

      const swordDmg = this.weaponLevel === 3 ? 80 : (this.weaponLevel === 2 ? 50 : 25)
      const slashReach = s * (this.weaponLevel >= 2 ? 30 : 24)

      // Hit enemies
      this.enemies.forEach(e => {
        if (!e.dead && Math.abs((h.flipX ? h.x - s * 12 : h.x + s * 12) - e.x) < slashReach && Math.abs(h.y - e.y) < s * 24) {
          e.dead = true
          e.flash = 6
          this.kills++
          this.combo++
          this.comboTimer = 90
          const pts = (this.weaponLevel * 100) * Math.max(1, this.combo)
          this.score += pts
          this.addFloatingText(`+${pts}`, e.x, e.y - s * 4, this.weaponLevel === 3 ? "#FDE047" : "#38BDF8")
          this.addSparks(e.x + s * 4, e.y + s * 4, 10, this.weaponLevel === 3 ? "#FDE047" : "#38BDF8")
        }
      })

      // Hit Catapults / Towers
      this.towers.forEach(t => {
        if (!t.dead && Math.abs((h.flipX ? h.x - s * 12 : h.x + s * 12) - t.x) < slashReach && Math.abs(h.y - t.y) < s * 20) {
          t.hp -= 2
          t.flash = 6
          if (t.hp <= 0) {
            t.dead = true
            this.score += 250
            this.addFloatingText("CATAPULT SMASHED! +250", t.x, t.y - s * 6, "#FBBF24")
            this.addSparks(t.x + s * 4, t.y + s * 4, 12, "#78350F")
          }
        }
      })

      // Hit Boss
      if (this.boss && !this.boss.dead) {
        const attackOrigin = h.flipX ? h.x - s * 16 : h.x + s * 16
        if (Math.abs(attackOrigin - this.boss.x) < slashReach + s * 15 && Math.abs(h.y - this.boss.y) < s * 40) {
          const bDmg = this.weaponLevel === 3 ? 16 : (this.weaponLevel === 2 ? 12 : 8)
          this.boss.hp -= bDmg
          this.boss.flash = 6
          this.addFloatingText(`-${bDmg} HP!`, this.boss.x, this.boss.y - s * 8, "#F87171")
          this.addSparks(this.boss.x, this.boss.y, 8, "#EF4444")
          if (this.boss.hp <= 0) {
            this.boss.dead = true
            this.score += 2000
            this.addFloatingText("+2000 BOSS CLEAR!", this.boss.x, this.boss.y - s * 16, "#FBBF24")
          }
        }
      }
    }

    if (h.shootTimer > 0) h.shootTimer--
    if (h.swordTimer > 0) h.swordTimer--

    h.timer++
    if (h.timer > 4) {
      h.timer = 0
      h.frame = (h.frame + 1) % 2
    }

    // Platforms
    let onPlatform = false
    const hw = s * 8, hh = s * 12

    for (const p of this.platforms) {
      if (h.vy >= 0 && h.x + hw * 0.7 > p.x && h.x + hw * 0.2 < p.x + s * 8 && h.y + hh >= p.y && h.y + hh <= p.y + s * 6) {
        h.y = p.y - hh
        h.jumping = false
        h.vy = 0
        onPlatform = true
        break
      }
      if (h.vy < 0 && h.x + hw * 0.7 > p.x && h.x + hw * 0.2 < p.x + s * 8 && h.y <= p.y + s * 8 && h.y >= p.y + s * 3) {
        h.vy = 0
        p.bump = -s * 3
        if (p.hasItem) {
          p.hasItem = false
          this.score += 50
          this.addFloatingText("+50 COIN", p.x, p.y - s * 8, "#FBBF24")
          this.addSparks(p.x + s * 4, p.y, 6, "#FDE047")
        }
      }
    }

    this.platforms.forEach(p => {
      if (p.bump < 0) p.bump += s * 0.6
      if (p.bump > 0) p.bump = 0
    })

    // Hero Gravity
    if (h.jumping || (!onPlatform && h.y < gY - hh)) {
      h.jumping = true
      h.vy += s * 0.55
      h.y += h.vy
      if (h.y >= gY - hh) {
        h.y = gY - hh
        h.jumping = false
        h.vy = 0
      }
    }

    // Screen bounds & Level exit
    if (h.x < 10) h.x = 10
    if (h.x > W - s * 10) {
      if (!this.boss || this.boss.dead) {
        this.level++
        this.score += 500
        this.addFloatingText(`STAGE ${this.level - 1} CLEAR!`, W / 2, H / 2, "#4ADE80")
        if (this.level > 10) this.level = 1
        this._initScene()
        return
      } else {
        h.x = W - s * 10
      }
    }

    // Coins
    this.coins.forEach(c => {
      if (!c.collected && Math.abs(h.x - c.x) < s * 10 && Math.abs(h.y - c.y) < s * 12) {
        c.collected = true
        this.score += 100
        this.addFloatingText("+100", c.x, c.y - s * 4, "#FBBF24")
        this.addSparks(c.x, c.y, 6, "#FDE047")
      }
    })

    // Items & Weapon Upgrade Collection
    this.items.forEach(it => {
      if (!it.collected && Math.abs(h.x - it.x) < s * 14 && Math.abs(h.y - it.y) < s * 14) {
        it.collected = true
        if (it.type === "medkit") {
          h.hp = Math.min(100, h.hp + 40)
          this.addFloatingText("+40 HP!", it.x, it.y - s * 6, "#4ADE80")
          this.addSparks(it.x, it.y, 8, "#22C55E")
        } else if (it.type === "shotgunAmmo") {
          h.shotgunAmmo += 8
          this.addFloatingText("+8 AMMO", it.x, it.y - s * 6, "#FBBF24")
          this.addSparks(it.x, it.y, 8, "#F59E0B")
        } else if (it.type === "allySpawn") {
          this.allies.push(this._createAlly(h.x - s * 12, h.y))
          this.addFloatingText("+1 ALLY!", it.x, it.y - s * 6, "#818CF8")
          this.addSparks(it.x, it.y, 8, "#6366F1")
        } else if (it.type === "weaponUpgrade") {
          this.weaponLevel = Math.min(3, this.weaponLevel + 1)
          const tierNames = ["STEEL", "INFERNO FIRE", "THUNDERSTORM"]
          this.addFloatingText(`WEAPON UPGRADED! LV.${this.weaponLevel} ${tierNames[this.weaponLevel - 1]}`, it.x, it.y - s * 10, "#FDE047")
          this.addSparks(it.x, it.y, 16, "#FBBF24")
        }
      }
    })

    // ─── AUTONOMOUS ALLY AI (KNIGHT & ARCHER WITH INDEPENDENT LOGIC) ─────
    for (let i = this.allies.length - 1; i >= 0; i--) {
      const a = this.allies[i]

      if (a.flash > 0) a.flash--
      if (a.dead) {
        a.deadTimer++
        if (a.deadTimer > 25) this.allies.splice(i, 1)
        continue
      }

      // Scan closest target (Enemy, Catapult, or Boss)
      let closestTarget = null
      let minDist = 750

      this.enemies.forEach(e => {
        if (!e.dead) {
          const d = Math.hypot(e.x - a.x, e.y - a.y)
          if (d < minDist) { minDist = d; closestTarget = e }
        }
      })
      this.towers.forEach(t => {
        if (!t.dead) {
          const d = Math.hypot(t.x - a.x, t.y - a.y)
          if (d < minDist) { minDist = d; closestTarget = t }
        }
      })
      if (this.boss && !this.boss.dead) {
        const d = Math.hypot(this.boss.x - a.x, this.boss.y - a.y)
        if (d < minDist) { minDist = d; closestTarget = this.boss }
      }

      // AUTONOMOUS BEHAVIOR LOGIC
      if (a.role === "knight") {
        // Knight: Aggressive Melee Frontliner
        if (closestTarget && minDist < 650) {
          a.state = "charge"
          const targetDir = closestTarget.x > a.x ? 1 : -1
          a.flipX = targetDir < 0
          a.x += targetDir * a.speed

          // Knight leap when near target or obstacle
          if (!a.jumping && Math.abs(closestTarget.x - a.x) < 220 && Math.random() < 0.05) {
            a.jumping = true
            a.vy = -s * 7.8
          }

          // Stomp on enemy/catapult if airborne
          if (a.jumping && a.vy > 0 && Math.abs(closestTarget.x - a.x) < s * 14 && a.y <= closestTarget.y) {
            if (closestTarget.dead === false || closestTarget.hp > 0) {
              closestTarget.hp -= 2
              closestTarget.flash = 6
              a.vy = -s * 8
              if (closestTarget.hp <= 0) {
                closestTarget.dead = true
                this.score += 150
                this.addFloatingText("KNIGHT STOMP!", a.x, a.y - s * 6, "#FDE047")
              }
            }
          }

          // Knight Melee Slash Combo
          if (a.slashTimer > 0) a.slashTimer--
          if (a.slashTimer === 0 && minDist < s * 26) {
            a.slashTimer = 22
            this.slashes.push({ x: a.flipX ? a.x - s * 14 : a.x + s * 8, y: a.y + s * 2, flipX: a.flipX, life: 6 })
            if (closestTarget.hp !== undefined) {
              const kDmg = this.weaponLevel >= 2 ? 30 : 15
              closestTarget.hp -= kDmg
              closestTarget.flash = 6
              this.score += 100
              this.addFloatingText(`KNIGHT SLASH! -${kDmg}`, closestTarget.x, closestTarget.y - s * 4, "#38BDF8")
              this.addSparks(closestTarget.x, closestTarget.y, 6, "#38BDF8")
              if (closestTarget.hp <= 0) closestTarget.dead = true
            } else {
              closestTarget.dead = true
              closestTarget.flash = 6
              this.score += 100
              this.addFloatingText("KNIGHT SLASH! +100", closestTarget.x, closestTarget.y - s * 4, "#38BDF8")
              this.addSparks(closestTarget.x, closestTarget.y, 6, "#38BDF8")
            }
          }
        } else {
          // Autonomous Patrol Vanguard (moves ahead of hero)
          a.state = "patrol"
          const patrolTargetX = h.x + 140
          a.x += (patrolTargetX - a.x) * 0.08
          a.flipX = false
        }
      } else {
        // Archer: Tactical Ranged Sniper
        if (closestTarget && minDist < 700) {
          a.state = "charge"
          const shootFlip = closestTarget.x < a.x
          a.flipX = shootFlip

          // Maintain 200px tactical shooting distance
          if (minDist < 160) a.x -= (shootFlip ? -1 : 1) * a.speed * 0.7
          else if (minDist > 300) a.x += (shootFlip ? -1 : 1) * a.speed * 0.6

          if (this.tick % (35 + i * 6) === 0) {
            this.arrows.push({
              x: a.x,
              y: a.y + s * 4,
              vx: shootFlip ? -s * 14 : s * 14,
              flipX: shootFlip,
              type: "arrow"
            })
            this.addSparks(a.x, a.y + s * 4, 3, this.weaponLevel >= 2 ? "#EF4444" : "#10B981")
          }
        } else {
          // Patrol 60px behind player
          const patrolTargetX = h.x - (i + 1) * 70
          a.x += (patrolTargetX - a.x) * 0.08
        }
      }

      // Ally Jump Physics & Gravity
      if (a.jumping) {
        a.vy += s * 0.55
        a.y += a.vy
        if (a.y >= gY - hh) {
          a.y = gY - hh
          a.jumping = false
          a.vy = 0
        }
      } else {
        a.y = gY - hh
      }

      // Screen bounds clamping
      if (a.x < 10) a.x = 10
      if (a.x > W - s * 10) a.x = W - s * 10

      a.frame = (this.tick % 10 < 5) ? 0 : 1

      // Ally Support skill (Heal hero if in critical danger)
      if (a.supportCooldown > 0) a.supportCooldown--
      if (a.supportCooldown === 0 && h.hp < 45) {
        a.supportCooldown = 220
        h.hp = Math.min(100, h.hp + 25)
        this.addFloatingText("HEAL! +25 HP", a.x, a.y - s * 8, "#4ADE80")
        this.addSparks(h.x + s * 4, h.y + s * 4, 10, "#22C55E")
      }
    }

    // ─── ENEMIES LOGIC & MARIO STOMP ─────────────────────────────────────
    this.enemies.forEach((e, idx) => {
      if (e.flash > 0) e.flash--
      if (e.dead) {
        e.deadTimer++
        if (e.deadTimer > 25) {
          this.enemies[idx] = this._createEnemy(W + 200, Math.random() < 0.25)
        }
        return
      }

      e.x += e.speed
      if (e.isFlying) {
        e.floatTick += 0.08
        e.y += Math.sin(e.floatTick) * 2.5
        e.frame = (this.tick % 12 < 6) ? 0 : 1
      } else {
        e.timer++
        if (e.timer > 6) {
          e.timer = 0
          e.frame = (e.frame + 1) % 2
        }
        if (!e.jumping && Math.abs(e.x - h.x) < s * 45 && h.y < e.y - s * 6 && Math.random() < 0.04) {
          e.jumping = true
          e.vy = -s * 6.5
        }
        if (e.jumping) {
          e.vy += s * 0.5
          e.y += e.vy
          if (e.y >= gY - s * 8) {
            e.y = gY - s * 8
            e.jumping = false
          }
        }
      }

      if (e.x < -200) e.x = W + 200

      // Enemy hit Ally
      this.allies.forEach(a => {
        if (!a.dead && Math.abs(a.x - e.x) < s * 10 && Math.abs(a.y - e.y) < s * 12) {
          a.hp -= 12
          a.flash = 6
          this.addFloatingText("-12 HP", a.x, a.y - s * 6, "#EF4444")
          this.addSparks(a.x, a.y, 6, "#EF4444")
          if (a.hp <= 0) {
            a.dead = true
            this.addFloatingText("ALLY FALLEN!", a.x, a.y - s * 8, "#94A3B8")
          }
        }
      })

      // Hero Stomp on Enemy
      if (Math.abs(h.x - e.x) < s * 10 && Math.abs(h.y - e.y) < s * 13) {
        if (h.vy > 0 && h.y + hh * 0.6 <= e.y + s * 4) {
          e.dead = true
          e.flash = 6
          h.vy = -s * 8.2
          h.jumping = true
          this.kills++
          this.combo++
          this.comboTimer = 90
          const pts = 150 * Math.max(1, this.combo)
          this.score += pts
          this.addFloatingText("STOMP! +" + pts, e.x, e.y - s * 6, "#FBBF24")
          this.addSparks(e.x + s * 4, e.y, 8, "#FDE047")
        } else if (h.shieldActive) {
          e.x += (e.x > h.x ? s * 6 : -s * 6)
          h.shieldEnergy = Math.max(0, h.shieldEnergy - 10)
          this.addFloatingText("BLOCKED!", h.x, h.y - s * 6, "#38BDF8")
          this.addSparks(h.x + (h.flipX ? -s * 4 : s * 8), h.y + s * 4, 6, "#38BDF8")
        } else if (h.flicker === 0) {
          h.hp -= 20
          h.flicker = 35
          h.flash = 6
          this.combo = 0
          this.addFloatingText("-20 HP", h.x, h.y - s * 6, "#EF4444")
          this.addSparks(h.x + s * 4, h.y + s * 4, 8, "#EF4444")

          if (h.hp <= 0) {
            h.hp = 0
            this.state = "gameover"
            if (this.score > this.highScore) {
              this.highScore = this.score
              localStorage.setItem("startpage_pixelrun_highscore", this.highScore.toString())
            }
          }
        }
      }
    })

    // ─── DESTRUCTIBLE CATAPULTS & STOMP MECHANIC ─────────────────────────
    this.towers.forEach(t => {
      if (t.flash > 0) t.flash--
      if (t.dead) {
        t.deadTimer++
        return
      }

      // Hero Stomp on Catapult
      if (h.vy > 0 && Math.abs(h.x - t.x) < s * 12 && h.y + hh * 0.6 <= t.y + s * 4 && h.y + hh >= t.y - s * 4) {
        t.hp = 0
        t.dead = true
        h.vy = -s * 8.5
        h.jumping = true
        this.kills++
        this.score += 300
        this.addFloatingText("CATAPULT CRUSHED! +300", t.x, t.y - s * 8, "#FDE047")
        this.addSparks(t.x + s * 4, t.y + s * 4, 15, "#92400E")
      }

      // Catapult fires stone boulders
      t.timer++
      if (t.timer > Math.max(45, 80 - this.level * 3)) {
        t.timer = 0
        if (t.x < W + 100 && t.x > -50) {
          this.bossProjectiles.push({
            x: t.x,
            y: t.y - s * 2,
            vx: -s * (6.5 + this.level * 0.3),
            vy: -s * 2,
            gravity: s * 0.12,
            type: "boulder"
          })
          this.addSparks(t.x + s * 4, t.y, 6, "#64748B")
        }
      }
    })

    // ─── DYNAMIC BOSSES & BOSS HEAD STOMP ─────────────────────────────────
    if (this.boss && !this.boss.dead) {
      if (this.boss.flash > 0) this.boss.flash--

      const isEnraged = this.boss.hp < this.boss.maxHp * 0.5
      this.boss.enraged = isEnraged

      // Boss Head Stomp
      if (h.vy > 0 && Math.abs(h.x - this.boss.x) < s * 30 && h.y + hh * 0.6 <= this.boss.y + s * 6 && h.y + hh >= this.boss.y - s * 6) {
        this.boss.hp -= 20
        this.boss.flash = 8
        h.vy = -s * 9.5
        h.jumping = true
        this.score += 500
        this.addFloatingText("HEAD STOMP! -20 HP", this.boss.x, this.boss.y - s * 10, "#FBBF24")
        this.addSparks(this.boss.x + s * 10, this.boss.y + s * 4, 16, "#F59E0B")
        if (this.boss.hp <= 0) {
          this.boss.dead = true
          this.score += 2500
          this.addFloatingText("BOSS DEFEATED! +2500", this.boss.x, this.boss.y - s * 16, "#FBBF24")
        }
      }

      if (this.boss.type === "slime") {
        this.boss.timer++
        if (this.boss.timer > (isEnraged ? 20 : 32)) {
          this.boss.timer = 0
          for (let angle = -1; angle <= 1; angle++) {
            this.bossProjectiles.push({
              x: this.boss.x,
              y: this.boss.y + s * 4,
              vx: -s * 12,
              vy: angle * s * 2.5,
              type: "slime"
            })
          }
          this.addSparks(this.boss.x, this.boss.y + s * 4, 6, isEnraged ? "#F97316" : "#22C55E")
        }
      } else if (this.boss.type === "wraith") {
        this.boss.y += this.boss.vy
        if (this.boss.y < gY - s * 48 || this.boss.y > gY - s * 16) this.boss.vy *= -1

        if (this.tick % (isEnraged ? 18 : 26) === 0) {
          this.bossProjectiles.push({
            x: this.boss.x,
            y: this.boss.y + s * 4,
            vx: -s * 15,
            vy: (Math.random() - 0.5) * s * 3,
            type: "wraith"
          })
          this.addSparks(this.boss.x, this.boss.y + s * 4, 4, "#A855F7")
        }
      } else if (this.boss.type === "dragon") {
        this.boss.y += this.boss.vy
        if (this.boss.y < gY - s * 55 || this.boss.y > gY - s * 14) this.boss.vy *= -1

        if (Math.random() < (isEnraged ? 0.22 : 0.14)) {
          this.bossProjectiles.push({
            x: this.boss.x,
            y: this.boss.y + s * 8,
            vx: -s * 14,
            vy: (Math.random() - 0.5) * s * 6,
            type: "fireball"
          })
        }
        if (isEnraged && this.tick % 40 === 0) {
          this.bossProjectiles.push({
            x: h.x + (Math.random() - 0.5) * 150,
            y: 0,
            vx: -s * 2,
            vy: s * 10,
            type: "fireball"
          })
        }
      }

      // Boss Contact Damage
      if (h.flicker === 0 && Math.abs(h.x - this.boss.x) < s * 28 && Math.abs(h.y - this.boss.y) < s * 28) {
        if (!h.shieldActive) {
          h.hp -= 30
          h.flicker = 40
          h.flash = 6
          this.combo = 0
          this.addFloatingText("-30 HP", h.x, h.y - s * 6, "#EF4444")
          if (h.hp <= 0) {
            h.hp = 0
            this.state = "gameover"
            if (this.score > this.highScore) {
              this.highScore = this.score
              localStorage.setItem("startpage_pixelrun_highscore", this.highScore.toString())
            }
          }
        }
      }

      // Boss Contact Damage against Allies
      this.allies.forEach(a => {
        if (!a.dead && Math.abs(a.x - this.boss.x) < s * 24 && Math.abs(a.y - this.boss.y) < s * 24) {
          if (a.flash === 0) {
            a.hp -= 20
            a.flash = 6
            a.x += a.x > this.boss.x ? s * 6 : -s * 6
            this.addFloatingText("-20 HP", a.x, a.y - s * 6, "#EF4444")
            this.addSparks(a.x, a.y, 6, "#EF4444")
            if (a.hp <= 0) {
              a.hp = 0
              a.dead = true
              a.deadTimer = 0
              this.addFloatingText("ALLY FALLEN!", a.x, a.y - s * 8, "#94A3B8")
              this.addSparks(a.x, a.y, 12, "#94A3B8")
            }
          }
        }
      })
    }

    // ─── PROJECTILES (PLAYER & ALLIES) ───────────────────────────────────
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i]
      a.x += a.vx
      a.y += (a.vy || 0)

      if (a.x < -100 || a.x > W + 100) {
        this.arrows.splice(i, 1)
        continue
      }

      let hit = false
      for (const e of this.enemies) {
        if (!e.dead && Math.abs(a.x - e.x) < s * 12 && Math.abs(a.y - e.y) < s * 12) {
          e.dead = true
          e.flash = 6
          hit = true
          this.kills++
          this.combo++
          this.comboTimer = 90
          const pts = (a.type === "pellet" ? 80 : 120) * Math.max(1, this.combo)
          this.score += pts
          this.addFloatingText("+" + pts, e.x, e.y - s * 4, "#FDE047")
          this.addSparks(e.x + s * 4, e.y + s * 4, 6, "#FDE047")
          break
        }
      }

      if (!hit) {
        for (const t of this.towers) {
          if (!t.dead && Math.abs(a.x - t.x) < s * 14 && Math.abs(a.y - t.y) < s * 12) {
            t.hp -= (a.type === "pellet" ? 0.6 : 1)
            t.flash = 4
            hit = true
            this.addSparks(a.x, a.y, 4, "#92400E")
            if (t.hp <= 0) {
              t.dead = true
              this.score += 250
              this.addFloatingText("CATAPULT SMASHED! +250", t.x, t.y - s * 6, "#FBBF24")
              this.addSparks(t.x + s * 4, t.y + s * 4, 12, "#78350F")
            }
            break
          }
        }
      }

      if (!hit && this.boss && !this.boss.dead && Math.abs(a.x - this.boss.x) < s * 35 && Math.abs(a.y - this.boss.y) < s * 35) {
        const dmg = (a.type === "pellet" ? 2.5 : 4.5) * (this.weaponLevel === 3 ? 1.8 : (this.weaponLevel === 2 ? 1.4 : 1))
        this.boss.hp -= dmg
        this.boss.flash = 4
        hit = true
        this.addSparks(a.x, a.y, 4, "#EF4444")
        if (this.boss.hp <= 0) {
          this.boss.dead = true
          this.score += 2000
          this.addFloatingText("+2000 BOSS CLEAR!", this.boss.x, this.boss.y - s * 16, "#FBBF24")
        }
      }

      if (hit) this.arrows.splice(i, 1)
    }

    // ─── BOSS & TOWER PROJECTILES ─────────────────────────────────────────
    for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
      const p = this.bossProjectiles[i]
      p.x += p.vx
      if (p.gravity) {
        p.vy += p.gravity
        p.y += p.vy
      } else {
        p.y += (p.vy || 0)
      }

      if (p.x < -100 || p.y > gY + 10) {
        this.bossProjectiles.splice(i, 1)
        continue
      }

      // Check hit Allies
      let allyHit = false
      for (const a of this.allies) {
        if (!a.dead && Math.abs(p.x - a.x) < s * 12 && Math.abs(p.y - a.y) < s * 14) {
          const pDmg = p.type === "boulder" ? 25 : (p.type === "fireball" ? 22 : 16)
          a.hp -= pDmg
          a.flash = 6
          allyHit = true
          this.bossProjectiles.splice(i, 1)
          this.addFloatingText(`-${pDmg} HP`, a.x, a.y - s * 6, "#EF4444")
          this.addSparks(a.x + s * 4, a.y + s * 4, 8, "#EF4444")
          if (a.hp <= 0) {
            a.hp = 0
            a.dead = true
            a.deadTimer = 0
            this.addFloatingText("ALLY FALLEN!", a.x, a.y - s * 8, "#94A3B8")
            this.addSparks(a.x + s * 4, a.y + s * 4, 12, "#94A3B8")
          }
          break
        }
      }
      if (allyHit) continue

      // Check hit Hero
      if (h.shieldActive && Math.abs(p.x - h.x) < s * 18 && Math.abs(p.y - h.y) < s * 18) {
        this.bossProjectiles.splice(i, 1)
        h.shieldEnergy = Math.max(0, h.shieldEnergy - 8)
        this.addFloatingText("DEFLECT!", h.x, h.y - s * 6, "#38BDF8")
        this.addSparks(p.x, p.y, 6, "#38BDF8")
      } else if (h.flicker === 0 && Math.abs(p.x - h.x) < s * 12 && Math.abs(p.y - h.y) < s * 12) {
        h.hp -= 20
        h.flicker = 35
        h.flash = 6
        this.combo = 0
        this.bossProjectiles.splice(i, 1)
        this.addFloatingText("-20 HP", h.x, h.y - s * 6, "#EF4444")
        this.addSparks(h.x + s * 4, h.y + s * 4, 8, "#EF4444")

        if (h.hp <= 0) {
          h.hp = 0
          this.state = "gameover"
          if (this.score > this.highScore) {
            this.highScore = this.score
            localStorage.setItem("startpage_pixelrun_highscore", this.highScore.toString())
          }
        }
      }
    }

    // Decays
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      this.slashes[i].life--
      if (this.slashes[i].life <= 0) this.slashes.splice(i, 1)
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.25
      p.life -= 0.04
      if (p.life <= 0) this.particles.splice(i, 1)
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i]
      ft.y += ft.vy
      ft.life--
      ft.alpha = Math.max(0, ft.life / 40)
      if (ft.life <= 0) this.floatingTexts.splice(i, 1)
    }
  }

  _draw() {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height, s = this.S
    if (!ctx) return
    ctx.clearRect(0, 0, W, H)

    // 1. Sky Gradient & Stars
    const skyThemes = [
      ["#0F172A", "#1E3A8A", "#3B82F6"],
      ["#180828", "#3B0764", "#7E22CE"],
      ["#09090B", "#18181B", "#450A0A"]
    ]
    const cSet = this.level > 7 ? skyThemes[2] : (this.level > 4 ? skyThemes[1] : skyThemes[0])
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, cSet[0])
    sky.addColorStop(0.55, cSet[1])
    sky.addColorStop(1, cSet[2])
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)

    if (this.level > 3) {
      ctx.fillStyle = "#FFFFFF"
      for (let i = 0; i < 30; i++) {
        const sx = ((i * 137 + this.tick * 0.2) % W)
        const sy = ((i * 89) % (H * 0.5))
        const sa = 0.3 + 0.7 * Math.sin(this.tick * 0.05 + i)
        ctx.globalAlpha = sa
        ctx.fillRect(sx, sy, s * 0.7, s * 0.7)
      }
      ctx.globalAlpha = 1
    }

    this._drawMountains(s)
    this._drawGround(s)

    // Platforms
    this.platforms.forEach(p => {
      if (p.type === "Q") this._drawQuestionBlock(ctx, p.x, p.y, s, p.bump)
      else this._drawBrickBlock(ctx, p.x, p.y, s, p.bump)
    })

    // Coins
    this.coins.forEach(c => {
      if (!c.collected) {
        const bob = Math.sin(this.tick * 0.15 + c.bobTick) * s * 1.5
        this._drawSprite(this._coinFrames()[0], c.x, c.y + bob, s)
      }
    })

    // Items
    this.items.forEach(it => {
      if (!it.collected) this._drawSprite(this._itemSprites[it.type], it.x, it.y, s)
    })

    // Destructible Catapults / Towers
    this.towers.forEach(t => {
      if (!t.dead) {
        const flash = t.flash > 0 ? "#FFFFFF" : null
        this._drawSprite(this._catapultSprite, t.x, t.y, s, false, 1, flash)

        const bw = s * 9
        ctx.fillStyle = "rgba(0,0,0,0.6)"
        ctx.fillRect(t.x, t.y - s * 3, bw, s * 1.5)
        ctx.fillStyle = "#F59E0B"
        ctx.fillRect(t.x, t.y - s * 3, (t.hp / t.maxHp) * bw, s * 1.5)
      }
    })

    // Autonomous Allies (with dynamic class, mini HP bar & death fade animation)
    this.allies.forEach(a => {
      const sprite = a.role === "knight" ? this._allyFrames.knight[a.frame] : this._allyFrames.archer[a.frame]
      const flash = a.flash > 0 ? "#FFFFFF" : null
      const alpha = a.dead ? Math.max(0, 1 - a.deadTimer / 25) : 1
      const drawY = a.dead ? a.y - (a.deadTimer * s * 0.4) : a.y

      this._drawSprite(sprite, a.x, drawY, s, a.flipX, alpha, flash)

      if (!a.dead) {
        const bw = s * 8
        ctx.fillStyle = "rgba(0,0,0,0.7)"
        ctx.fillRect(a.x, a.y - s * 3.5, bw, s * 1.5)
        ctx.fillStyle = a.hp > 25 ? "#22C55E" : "#EF4444"
        ctx.fillRect(a.x, a.y - s * 3.5, Math.max(0, (a.hp / a.maxHp) * bw), s * 1.5)
        ctx.strokeStyle = "rgba(255,255,255,0.4)"
        ctx.lineWidth = 0.5
        ctx.strokeRect(a.x, a.y - s * 3.5, bw, s * 1.5)
      }
    })

    // Hero
    const h = this.heroes[0]
    if (h) {
      const isFlickering = h.flicker > 0 && h.flicker % 4 < 2
      const heroFrame = h.jumping ? this._heroFrames[2] : this._heroFrames[h.frame]
      const flash = h.flash > 0 ? "#FFFFFF" : null

      if (!isFlickering) {
        this._drawSprite(heroFrame, h.x, h.y, s, h.flipX, 1, flash)

        if (h.shieldActive) {
          this._drawSprite(this._shieldSprite, h.flipX ? h.x - s * 3 : h.x + s * 9, h.y + s * 3, s, h.flipX)
        }
      }
    }

    // Sword Slashes
    this.slashes.forEach(sl => {
      this._drawSprite(this._swordSlashSprite, sl.x, sl.y, s * 1.6, sl.flipX)
    })

    // Enemies
    this.enemies.forEach(e => {
      const sprite = e.isFlying ? this._flyingEnemyFrames[e.frame] : this._enemyFrames[e.frame]
      const alpha = e.dead ? Math.max(0, 1 - e.deadTimer / 25) : 1
      const flash = e.flash > 0 ? "#FFFFFF" : null
      this._drawSprite(sprite, e.x, e.y, s, e.speed > 0, alpha, flash)
    })

    // Projectiles
    this.arrows.forEach(a => {
      this._drawSprite(a.type === "pellet" ? this._shotgunPelletSprite : this._arrowSprite, a.x, a.y, s, a.flipX)
    })

    this.bossProjectiles.forEach(p => {
      if (p.type === "boulder") {
        this._drawSprite(this._boulderSprite, p.x, p.y, s * 1.5)
      } else {
        this._drawSprite(this._fireballSprite, p.x, p.y, s)
      }
    })

    // Boss
    if (this.boss) {
      const alpha = this.boss.dead ? Math.max(0, 1 - this.boss.deadTimer / 40) : 1
      const flash = this.boss.flash > 0 ? "#FFFFFF" : null
      let bS
      if (this.boss.type === "slime") {
        bS = this.boss.enraged ? this._slimeBossFrames[1] : this._slimeBossFrames[0]
      } else if (this.boss.type === "wraith") {
        bS = this._wraithBossFrames[0]
      } else {
        bS = this._dragonBossFrames[0]
      }
      this._drawSprite(bS, this.boss.x, this.boss.y, s * 6, false, alpha, flash)
    }

    // Particles
    this.particles.forEach(p => {
      ctx.fillStyle = p.color
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size)
    })
    ctx.globalAlpha = 1

    // Floating Combat Texts
    this.floatingTexts.forEach(ft => {
      ctx.globalAlpha = ft.alpha
      ctx.fillStyle = ft.color
      ctx.font = `bold ${s * 3.5}px monospace`
      ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y))
    })
    ctx.globalAlpha = 1

    // ─── 2. Polished Arcade HUD with Weapon Level ─────────────────────────
    this._drawHUD(ctx, W, H, s, h)

    // ─── 3. Game Over Screen ──────────────────────────────────────────────
    if (this.state === "gameover") {
      this._drawGameOver(ctx, W, H, s)
    }
  }

  _drawHUD(ctx, W, H, s, h) {
    if (!h) return

    // HUD Panel Box
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)"
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(16, 16, s * 68, s * 34, 8)
    ctx.fill()
    ctx.stroke()

    // Level Title & Weapon Tier Badge
    const tierLabels = ["LV.1 STEEL", "LV.2 INFERNO 🔥", "LV.3 THUNDER ⚡"]
    const tierColors = ["#38BDF8", "#F97316", "#FDE047"]
    ctx.fillStyle = tierColors[this.weaponLevel - 1]
    ctx.font = `bold ${s * 3}px monospace`
    ctx.fillText(`STAGE ${this.level} • ${tierLabels[this.weaponLevel - 1]}`, 26, 16 + s * 5.5)

    // HP Bar
    const hpBarW = s * 42
    const hpBarH = s * 3.5
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
    ctx.fillRect(26, 16 + s * 8, hpBarW, hpBarH)
    const currentHpW = Math.max(0, (h.hp / 100) * hpBarW)
    ctx.fillStyle = h.hp > 50 ? "#22C55E" : (h.hp > 25 ? "#F59E0B" : "#EF4444")
    ctx.fillRect(26, 16 + s * 8, currentHpW, hpBarH)
    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 1
    ctx.strokeRect(26, 16 + s * 8, hpBarW, hpBarH)

    ctx.fillStyle = "#FFFFFF"
    ctx.font = `bold ${s * 2.6}px monospace`
    ctx.fillText(`HP: ${Math.ceil(h.hp)}/100`, 26 + hpBarW + s * 2, 16 + s * 10.5)

    // Shield Energy Bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
    ctx.fillRect(26, 16 + s * 13.5, hpBarW, s * 2)
    ctx.fillStyle = "#38BDF8"
    ctx.fillRect(26, 16 + s * 13.5, (h.shieldEnergy / 100) * hpBarW, s * 2)

    // Score & Ammo
    ctx.fillStyle = "#FDE047"
    ctx.font = `bold ${s * 2.8}px monospace`
    ctx.fillText(`SCORE: ${this.score}`, 26, 16 + s * 20.5)

    ctx.fillStyle = "#E2E8F0"
    ctx.font = `${s * 2.5}px monospace`
    ctx.fillText(`AMMO: ${h.shotgunAmmo}  ALLIES: ${this.allies.length}`, 26, 16 + s * 26)

    ctx.fillStyle = tierColors[this.weaponLevel - 1]
    ctx.font = `bold ${s * 2.4}px monospace`
    ctx.fillText(`WEAPON POWER: TIER ${this.weaponLevel}/3`, 26, 16 + s * 31)

    // Combo multiplier if active
    if (this.combo > 1) {
      ctx.fillStyle = "#F43F5E"
      ctx.font = `bold ${s * 3.5}px monospace`
      ctx.fillText(`${this.combo}x COMBO!`, 26 + s * 72, 16 + s * 16)
    }

    // Boss Health Bar across top center
    if (this.boss && !this.boss.dead) {
      const bossBarW = Math.min(W * 0.5, 460)
      const bossBarX = (W - bossBarW) / 2
      ctx.fillStyle = "rgba(15, 23, 42, 0.92)"
      ctx.strokeStyle = this.boss.enraged ? "#F59E0B" : "#EF4444"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(bossBarX, 16, bossBarW, s * 10, 8)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = this.boss.enraged ? "#FDE047" : "#F87171"
      ctx.font = `bold ${s * 2.8}px monospace`
      ctx.textAlign = "center"
      const statusText = this.boss.enraged ? "🔥 ENRAGED 🔥" : "☠ BOSS ☠"
      ctx.fillText(`${statusText} ${this.boss.name}`, W / 2, 16 + s * 4.5)

      const bossFill = Math.max(0, (this.boss.hp / this.boss.maxHp) * (bossBarW - 20))
      ctx.fillStyle = this.boss.enraged ? "#F59E0B" : "#EF4444"
      ctx.fillRect(bossBarX + 10, 16 + s * 6, bossFill, s * 2.5)
      ctx.strokeRect(bossBarX + 10, 16 + s * 6, bossBarW - 20, s * 2.5)
      ctx.textAlign = "left"
    }

    // Controls Guide Pill (Top Right)
    const ctrlW = s * 68
    const ctrlH = s * 28
    const ctrlX = W - ctrlW - 16
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)"
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(ctrlX, 16, ctrlW, ctrlH, 8)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = "#38BDF8"
    ctx.font = `bold ${s * 2.4}px monospace`
    ctx.fillText("CONTROLS & SKILLS:", ctrlX + 12, 16 + s * 5)

    ctx.fillStyle = "#FFFFFF"
    ctx.font = `${s * 2.2}px monospace`
    ctx.fillText("[SPACE/W] Jump/Stomp [A/D] Move", ctrlX + 12, 16 + s * 10.5)
    ctx.fillText("[J / Z] Bow       [K / X] Sword", ctrlX + 12, 16 + s * 16)
    ctx.fillText("[L / C] Shield    [U / V] Shotgun", ctrlX + 12, 16 + s * 21.5)
    ctx.fillText("[R] Restart Game", ctrlX + 12, 16 + s * 26)
  }

  _drawGameOver(ctx, W, H, s) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)"
    ctx.fillRect(0, 0, W, H)

    const boxW = Math.min(W * 0.85, 520)
    const boxH = s * 55
    const boxX = (W - boxW) / 2
    const boxY = (H - boxH) / 2

    ctx.fillStyle = "rgba(24, 24, 37, 0.95)"
    ctx.strokeStyle = "#EF4444"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(boxX, boxY, boxW, boxH, 12)
    ctx.fill()
    ctx.stroke()

    ctx.textAlign = "center"
    ctx.fillStyle = "#EF4444"
    ctx.font = `bold ${s * 7}px monospace`
    ctx.fillText("GAME OVER", W / 2, boxY + s * 12)

    ctx.fillStyle = "#FDE047"
    ctx.font = `bold ${s * 4}px monospace`
    ctx.fillText(`FINAL SCORE: ${this.score}`, W / 2, boxY + s * 22)

    ctx.fillStyle = "#38BDF8"
    ctx.font = `${s * 3}px monospace`
    ctx.fillText(`HIGH SCORE: ${this.highScore}  |  KILLS: ${this.kills}`, W / 2, boxY + s * 30)

    ctx.fillStyle = "#FFFFFF"
    ctx.font = `bold ${s * 3.4}px monospace`
    const pulse = 0.6 + 0.4 * Math.sin(this.tick * 0.1)
    ctx.globalAlpha = pulse
    ctx.fillText("Press [SPACE] or [R] to Play Again", W / 2, boxY + s * 43)
    ctx.globalAlpha = 1
    ctx.textAlign = "left"
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this._animId = requestAnimationFrame((t) => this.animate(t))
    if (document.visibilityState === "hidden") return

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)
    this._update()
    this._draw()
  }

  start() {
    if (this.active) return
    this.active = true
    this.resetGame()
    if (this.canvas) this.canvas.style.display = "block"
    this.animate(performance.now())
    window.addEventListener("keydown", this._keydownHandler)
    window.addEventListener("keyup", this._keyupHandler)
  }

  stop() {
    this.active = false
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.canvas.style.display = "none"
    }
    window.removeEventListener("keydown", this._keydownHandler)
    window.removeEventListener("keyup", this._keyupHandler)
    window.removeEventListener("resize", this._resizeHandler)
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      jump: false,
      shoot: false,
      sword: false,
      shield: false,
      shotgun: false
    }
    this.heroes = []
    this.enemies = []
    this.allies = []
    this.particles = []
    this.arrows = []
    this.bossProjectiles = []
    this.floatingTexts = []
    this.slashes = []
  }
}
