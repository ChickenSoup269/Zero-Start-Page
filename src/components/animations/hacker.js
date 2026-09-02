/**
 * HackerEffect — Hollywood / AAA Ultra HD Cyber Matrix & Terminal Engine
 *
 * Implements the 6 Golden Principles:
 *  1. Natural Organic Geometry & Zero Overflow: Glassmorphic HUD terminal cards
 *     strictly clipped to boundaries, high-tech corner brackets, multi-strata binary rain.
 *  2. Cinematic Sequence: Typing -> "EXECUTING PAYLOAD" Loading Bar -> Runbg Binary Flood!
 *  3. Dual Architecture: Selectable "Hollywood AAA (Mới)" and "Classic (Cũ)" modes.
 *  4. Fluid Dynamics & Mouse Wake: Decryption radar and EMP shockwaves.
 *  5. 60Hz - 240Hz Delta Normalization & Retina High-DPI.
 *  6. Startpage Settings Integration.
 */

const MODERN_SNIPPETS = [
  "const kernel = await System.boot({ sec: 'OVERRIDE' });",
  "function decrypt(buf) { return crypto.decrypt(buf); }",
  "sudo iptables -t nat -A PREROUTING -j REDIRECT",
  "payload.inject('0x7FFF5FBFFD'); quantum.lock();",
  "while (memory.hasSegment(uid)) { syscall(); }",
  "export class NeuralBridge extends CyberNode {}",
  "token = btoa('root:cyber_sovereign_granted');",
  "socket.emit('neural_sync', { hash: sha256(data) });",
  "if (!firewall.bypassed) { exploit.elevate(); }",
  "MOV RAX, [RBP - 0x18]; XOR RBX, RBX; SYSCALL;",
  "const cert = tls.createSecureContext({ ciphers });",
  "db.query(`SELECT access FROM mainframe WHERE id=0`);",
]

const CLASSIC_SNIPPETS = [
  "const init = () => { console.log('Initializing...'); };",
  "function hack() { return Promise.resolve('Access Granted'); }",
  "document.querySelectorAll('.node').forEach(n => n.activate());",
  "import { system } from './core.js'; system.boot();",
  "await fetch('/api/v1/auth').then(res => res.json());",
  "if (security === null) throw new Error('Void Protocol');",
  "export class Kernel { constructor() { this.v = 1.0; } }",
  "const payload = btoa('root:admin'); req.send(payload);",
  "setInterval(() => backup.sync(), 60000);",
  "Object.assign(env, { DEBUG: true, PORT: 8080 });",
  "const query = `SELECT * FROM users WHERE id = ${uid}`;",
  "while (true) { if (buffer.isFull()) flush(); }",
  "CSS.registerProperty({ name: '--glow', syntax: '<color>' });",
  "navigator.serviceWorker.register('/sw.js').then(ok);",
  "crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 });",
  "ws.send(JSON.stringify({ type: 'connect', data: payload }));",
  "const hash = await bcrypt.hash(password, saltRounds);",
  "try { kernel.execute(); } catch(e) { log.error(e); }",
]

const GLYPHS = [
  "0", "1", "0", "1", "1", "0", "0", "1",
  "λ", "§", "Ψ", "Ω", "ø", "∆", "∑", "π", "0x",
  "A", "F", "C", "9", "3", "7", "E",
]

/* -------------------------------------------------------------------------- */
/*                       CLASSIC 2D ORIGINAL TERMINAL BLOCK                   */
/* -------------------------------------------------------------------------- */

class ClassicTerminalBlock {
  constructor(x, y, width, color) {
    this.reset(x, y, width, color)
  }

  reset(x, y, width, color) {
    this.x = x
    this.y = y
    this.width = width
    this.color = color
    this.lines = []
    this.maxLines = 8
    this.currentText = ""
    this.targetText = CLASSIC_SNIPPETS[Math.floor(Math.random() * CLASSIC_SNIPPETS.length)]
    this.charIndex = 0
    this.lastCharTime = performance.now()
    this.typingSpeed = Math.random() * 25 + 20
    this.isDone = false
    this.opacity = 0
    this.targetOpacity = 1
  }

  update(dt) {
    if (this.opacity < this.targetOpacity) {
      this.opacity = Math.min(1, this.opacity + 0.05 * dt)
    }

    if (this.isDone) {
      this.opacity = Math.max(0, this.opacity - 0.02 * dt)
      return this.opacity <= 0
    }

    const now = performance.now()
    if (now - this.lastCharTime > this.typingSpeed) {
      if (this.charIndex < this.targetText.length) {
        this.currentText += this.targetText[this.charIndex]
        this.charIndex++
        this.lastCharTime = now
      } else {
        this.lines.push(this.currentText)
        if (this.lines.length > this.maxLines) this.lines.shift()

        if (Math.random() > 0.35) {
          this.currentText = ""
          this.targetText = CLASSIC_SNIPPETS[Math.floor(Math.random() * CLASSIC_SNIPPETS.length)]
          this.charIndex = 0
          this.typingSpeed = Math.random() * 25 + 20
        } else {
          this.isDone = true
        }
      }
    }
    return false
  }

  draw(ctx) {
    ctx.save()
    ctx.font = "14px 'Courier New', monospace"
    ctx.fillStyle = this.color
    ctx.globalAlpha = Math.max(0.1, this.opacity)

    this.lines.forEach((line, i) => {
      ctx.fillText(line, this.x, this.y + i * 20, this.width)
    })

    const currentY = this.y + this.lines.length * 20
    const cursor = Math.floor(performance.now() / 450) % 2 === 0 ? "█" : " "
    ctx.fillText(this.currentText + (this.isDone ? "" : cursor), this.x, currentY, this.width)
    ctx.restore()
  }
}

/* -------------------------------------------------------------------------- */
/*                           MAIN HACKER EFFECT CLASS                         */
/* -------------------------------------------------------------------------- */

export class HackerEffect {
  constructor(canvasId, color = "#00FF00", options = {}) {
    this.canvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId

    if (!this.canvas) {
      console.warn(`[HackerEffect] Canvas element "${canvasId}" not found.`)
      return
    }

    this.ctx = this.canvas.getContext("2d", { alpha: true })
    this._color = color || "#00FF00"
    // "hollywood" (modern) | "classic" (cũ) | "matrix" | "terminal"
    this._mode = options.mode || "hollywood"

    // Animation & Lifecycle
    this.active = false
    this.destroyed = false
    this.rafId = null
    this.lastTime = 0
    this.dpr = 1
    this.width = 0
    this.height = 0

    // Palette Configuration
    this.palette = this._computePalette(this._color)

    // Sequence State Machine: "typing" -> "loading" -> "flood"
    this.sequenceState = "typing"
    this.sequenceTimer = 0
    this.loadingProgress = 0
    this.typingDuration = 20000 // 20s before loading payload
    this.floodDuration = 6000   // 6.0s runbg flood as requested

    // Simulation Entities
    this.columns = []
    this.terminals = []
    this.classicBlocks = []
    this.cyberNodes = []
    this.shockwaves = []
    this.classicParticles = []

    // Mouse & Interactive Decryption
    this.mouse = {
      x: -2000,
      y: -2000,
      radius: 130,
      active: false,
    }

    // Event Bindings
    this.handleResize = this.handleResize.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleMouseLeave = this.handleMouseLeave.bind(this)
    this.handleClick = this.handleClick.bind(this)
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
    this.animate = this.animate.bind(this)

    this.resize()
    window.addEventListener("resize", this.handleResize, { passive: true })
    document.addEventListener("visibilitychange", this.handleVisibilityChange)
  }

  /* -------------------------------------------------------------------------- */
  /*                              COLOR & PALETTE                               */
  /* -------------------------------------------------------------------------- */

  get color() {
    return this._color
  }

  set color(hex) {
    this.updateColor(hex)
  }

  get mode() {
    return this._mode
  }

  set mode(val) {
    this.setMode(val)
  }

  updateColor(hex) {
    if (!hex) return
    this._color = hex
    this.palette = this._computePalette(hex)
    this.classicBlocks.forEach((b) => (b.color = hex))
  }

  setMode(mode) {
    const valid = ["hollywood", "classic", "matrix", "terminal", "cinematic", "cyberpunk"]
    // Map legacy alias "cinematic" to "hollywood"
    if (mode === "cinematic") mode = "hollywood"
    if (!valid.includes(mode)) return
    this._mode = mode
    this.sequenceState = "typing"
    this.sequenceTimer = performance.now()
    this.loadingProgress = 0
    this._initEntities()
  }

  _hexToRgb(hex) {
    let clean = (hex || "").replace("#", "").trim()
    if (clean.length === 3) {
      clean = clean.split("").map((c) => c + c).join("")
    }
    const num = parseInt(clean, 16)
    if (isNaN(num) || clean.length !== 6) {
      return { r: 0, g: 255, b: 0 }
    }
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    }
  }

  _rgbToHsl(r, g, b) {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
  }

  _computePalette(hex) {
    const rgb = this._hexToRgb(hex)
    const hsl = this._rgbToHsl(rgb.r, rgb.g, rgb.b)

    return {
      baseHex: hex,
      rgb,
      hsl,
      headColor: "#ffffff",
      glowColor: `hsl(${hsl.h}, 100%, 75%)`,
      dimColor: `hsl(${hsl.h}, 85%, 45%)`,
      darkColor: `hsl(${hsl.h}, 80%, 20%)`,
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            RESIZE & LIFECYCLE                              */
  /* -------------------------------------------------------------------------- */

  resize() {
    if (!this.canvas) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = Math.floor(this.width * this.dpr)
    this.canvas.height = Math.floor(this.height * this.dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this._initEntities()
  }

  handleResize() {
    this.resize()
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    this.mouse.x = e.clientX - rect.left
    this.mouse.y = e.clientY - rect.top
    this.mouse.active = true
  }

  handleMouseLeave() {
    this.mouse.x = -2000
    this.mouse.y = -2000
    this.mouse.active = false
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top

    // Trigger Cyber EMP shockwave
    this.shockwaves.push({
      x: cx,
      y: cy,
      radius: 0,
      maxRadius: Math.max(180, Math.min(this.width, this.height) * 0.4),
      life: 1.0,
      decay: 0.025,
    })
  }

  handleVisibilityChange() {
    if (document.visibilityState === "visible" && this.active) {
      this.lastTime = performance.now()
    }
  }

  start() {
    if (this.active || this.destroyed) return
    this.active = true
    this.lastTime = performance.now()
    this.sequenceTimer = performance.now()
    this.sequenceState = "typing"
    this.loadingProgress = 0

    this.canvas.style.display = "block"
    this.resize()

    window.addEventListener("mousemove", this.handleMouseMove, { passive: true })
    window.addEventListener("mouseout", this.handleMouseLeave, { passive: true })
    window.addEventListener("click", this.handleClick, { passive: true })

    const loop = (time) => {
      if (!this.active || this.destroyed) return
      this.rafId = requestAnimationFrame(loop)
      if (document.visibilityState === "hidden") return
      this.animate(time)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stop() {
    if (!this.active) return
    this.active = false

    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    window.removeEventListener("mousemove", this.handleMouseMove)
    window.removeEventListener("mouseout", this.handleMouseLeave)
    window.removeEventListener("click", this.handleClick)

    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height)
    }
    this.canvas.style.display = "none"
    this.columns = []
    this.terminals = []
    this.classicBlocks = []
    this.cyberNodes = []
    this.shockwaves = []
    this.classicParticles = []
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this.handleResize)
    document.removeEventListener("visibilitychange", this.handleVisibilityChange)
  }

  /* -------------------------------------------------------------------------- */
  /*                     INIT MULTI-DEPTH CYBER ENTITIES                        */
  /* -------------------------------------------------------------------------- */

  _initEntities() {
    const W = this.width || window.innerWidth
    const H = this.height || window.innerHeight

    this.columns = []
    this.terminals = []
    this.classicBlocks = []
    this.cyberNodes = []
    this.shockwaves = []
    this.classicParticles = []

    // 1. Digital Matrix Rain Columns
    const fontSize = 15
    const totalCols = Math.floor(W / fontSize)

    for (let i = 0; i < totalCols; i++) {
      let z
      const roll = Math.random()
      if (roll < 0.35) z = 0.25 + Math.random() * 0.2
      else if (roll < 0.8) z = 0.5 + Math.random() * 0.25
      else z = 0.8 + Math.random() * 0.2

      const trailLen = Math.floor(10 + Math.random() * 20)
      const speed = (2.2 + Math.random() * 3.5) * (0.6 + z * 0.6)

      const chars = []
      for (let c = 0; c < trailLen; c++) {
        chars.push({
          glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          mutateTimer: Math.random() * 30,
        })
      }

      this.columns.push({
        x: i * fontSize,
        y: (Math.random() * -H) - 50,
        z,
        fontSize: Math.floor(fontSize * (0.75 + z * 0.4)),
        speed,
        trailLen,
        chars,
        mutateSpeed: 0.08 + Math.random() * 0.12,
      })
    }

    // 2. Modern Glassmorphic HUD Terminals (Strictly Sized & Positioned)
    if (this._mode === "hollywood" || this._mode === "terminal") {
      const termCount = Math.min(3, Math.max(1, Math.floor(W / 520)))
      const availableW = W - 80
      const cardW = Math.min(380, availableW / termCount - 20)
      const cardH = 200

      for (let t = 0; t < termCount; t++) {
        const posX = 40 + t * (cardW + 20)
        const posY = 75 + (t % 2) * 55

        this.terminals.push({
          x: posX,
          y: posY,
          w: cardW,
          h: cardH,
          lines: [],
          maxLines: 6,
          currentText: "",
          targetSnippet: MODERN_SNIPPETS[Math.floor(Math.random() * MODERN_SNIPPETS.length)],
          charIdx: 0,
          typeTimer: 0,
          title: `NODE_0x${(t + 1).toString(16).toUpperCase()} // SEC_AUDIT`,
        })
      }
    }

    // 3. Classic Scattered Terminal Blocks (Bản cũ)
    if (this._mode === "classic") {
      const blockCount = Math.min(5, Math.max(2, Math.floor(W / 360)))
      for (let i = 0; i < blockCount; i++) {
        const margin = 40
        const bw = Math.min(360, W - margin * 2)
        const x = margin + Math.random() * Math.max(20, W - bw - margin * 2)
        const y = margin + Math.random() * Math.max(20, H - 220 - margin * 2)
        this.classicBlocks.push(new ClassicTerminalBlock(x, y, bw, this._color))
      }

      // Classic ambient floating background particles
      for (let p = 0; p < 45; p++) {
        this.classicParticles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          size: Math.random() * 2 + 1,
          speed: Math.random() * 0.5 + 0.2,
          opacity: Math.random() * 0.3 + 0.1,
        })
      }
    }

    // 4. Cyberpunk Neural Nodes
    if (this._mode === "hollywood" || this._mode === "cyberpunk") {
      const nodeCount = Math.min(16, Math.max(8, Math.floor(W / 120)))
      for (let n = 0; n < nodeCount; n++) {
        this.cyberNodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: 2.2 + Math.random() * 3.0,
          pulse: Math.random() * Math.PI * 2,
        })
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                PHYSICS STEP                                 */
  /* -------------------------------------------------------------------------- */

  _update(dt) {
    const W = this.width
    const H = this.height
    const now = performance.now()

    // --- State Machine Update: Typing -> Loading -> Flood ---
    if (this._mode === "hollywood" || this._mode === "classic") {
      if (this.sequenceState === "typing") {
        if (now - this.sequenceTimer > this.typingDuration) {
          this.sequenceState = "loading"
          this.loadingProgress = 0
        }
      } else if (this.sequenceState === "loading") {
        this.loadingProgress += 0.5 * dt
        if (this.loadingProgress >= 100) {
          this._triggerFlood(now)
        }
      } else if (this.sequenceState === "flood") {
        const floodElapsed = now - this.sequenceTimer
        if (floodElapsed > this.floodDuration) {
          this.sequenceState = "typing"
          this.sequenceTimer = now
          this.loadingProgress = 0
          this.ctx.clearRect(0, 0, this.width, this.height)
          this._initEntities()
        }
      }
    }

    // 1. Update Matrix Rain Columns (speed boosted during runbg flood)
    const isFlood = this.sequenceState === "flood" || this._mode === "matrix"
    const floodSpeedMultiplier = this.sequenceState === "flood" ? 3.0 : 1.0

    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i]
      col.y += col.speed * floodSpeedMultiplier * dt

      if (col.y - col.trailLen * col.fontSize > H + 50) {
        col.y = -col.fontSize * col.trailLen - Math.random() * 100
        col.speed = (2.2 + Math.random() * 3.5) * (0.6 + col.z * 0.6)
      }

      for (let c = 0; c < col.chars.length; c++) {
        const ch = col.chars[c]
        ch.mutateTimer += col.mutateSpeed * dt
        if (ch.mutateTimer > 5) {
          ch.glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
          ch.mutateTimer = 0
        }
      }
    }

    // 2. Update Modern HUD Terminals (Strict line and char bounds)
    if (this._mode === "hollywood" || this._mode === "terminal") {
      for (let t = 0; t < this.terminals.length; t++) {
        const term = this.terminals[t]
        term.typeTimer += dt

        if (term.typeTimer > 1.2) {
          term.typeTimer = 0
          if (term.charIdx < term.targetSnippet.length) {
            term.currentText += term.targetSnippet[term.charIdx]
            term.charIdx++
          } else {
            term.lines.push(term.currentText)
            if (term.lines.length > term.maxLines) term.lines.shift()
            term.currentText = ""
            term.targetSnippet = MODERN_SNIPPETS[Math.floor(Math.random() * MODERN_SNIPPETS.length)]
            term.charIdx = 0
          }
        }
      }
    }

    // 3. Update Classic Terminal Blocks (Bản cũ)
    if (this._mode === "classic" && this.sequenceState === "typing") {
      for (let b = 0; b < this.classicBlocks.length; b++) {
        const block = this.classicBlocks[b]
        const shouldReset = block.update(dt)
        if (shouldReset) {
          const margin = 40
          const bw = Math.min(360, W - margin * 2)
          const x = margin + Math.random() * Math.max(20, W - bw - margin * 2)
          const y = margin + Math.random() * Math.max(20, H - 220 - margin * 2)
          block.reset(x, y, bw, this._color)
        }
      }
      // Classic ambient particles
      for (let p = 0; p < this.classicParticles.length; p++) {
        const pt = this.classicParticles[p]
        pt.y += pt.speed * dt * 0.8
        if (pt.y > H) {
          pt.y = 0
          pt.x = Math.random() * W
        }
      }
    }

    // 4. Update Cyberpunk Neural Nodes
    for (let n = 0; n < this.cyberNodes.length; n++) {
      const node = this.cyberNodes[n]
      node.x += node.vx * dt
      node.y += node.vy * dt
      node.pulse += 0.03 * dt
      if (node.x < 0 || node.x > W) node.vx *= -1
      if (node.y < 0 || node.y > H) node.vy *= -1
    }

    // 5. Update Cyber Shockwaves
    for (let s = this.shockwaves.length - 1; s >= 0; s--) {
      const sw = this.shockwaves[s]
      sw.radius += (sw.maxRadius - sw.radius) * 0.09 * dt + 3 * dt
      sw.life -= sw.decay * dt
      if (sw.life <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(s, 1)
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                 RENDERING                                  */
  /* -------------------------------------------------------------------------- */

  /**
   * Renders cascading Matrix binary rain with leading white-hot glyph,
   * exponential phosphor persistence, and mouse decryption wake.
   */
  _renderMatrixRain(ctx) {
    const mouseActive = this.mouse.active && this.mouse.x > -1000
    const isFlood = this.sequenceState === "flood"

    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i]
      ctx.font = `bold ${col.fontSize}px 'Fira Code', 'Courier New', monospace`

      for (let c = 0; c < col.chars.length; c++) {
        const charY = col.y - c * col.fontSize
        if (charY < -col.fontSize || charY > this.height + col.fontSize) continue

        let isDecrypted = false
        if (mouseActive) {
          const dx = col.x - this.mouse.x
          const dy = charY - this.mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < this.mouse.radius) isDecrypted = true
        }

        for (let s = 0; s < this.shockwaves.length; s++) {
          const sw = this.shockwaves[s]
          const dx = col.x - sw.x
          const dy = charY - sw.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (Math.abs(dist - sw.radius) < 35) isDecrypted = true
        }

        ctx.save()
        if (c === 0) {
          // White-hot radiant core
          ctx.fillStyle = "#ffffff"
          ctx.globalAlpha = 1.0
          ctx.fillText(col.chars[c].glyph, col.x, charY)

          // Luminous phosphor halo
          ctx.fillStyle = this.palette.glowColor
          ctx.globalAlpha = isFlood ? 0.95 : 0.7
          ctx.fillText(col.chars[c].glyph, col.x, charY)
        } else if (isDecrypted) {
          // Scramble decryption around mouse: radiant white
          ctx.fillStyle = "#ffffff"
          ctx.globalAlpha = 1.0
          const dec = (Math.floor(performance.now() / 45 + c) % 2 === 0 ? "0x" : "1")
          ctx.fillText(dec, col.x, charY)
        } else {
          // Vivid Phosphor tail decay
          const trailFade = Math.pow(1 - c / col.trailLen, 1.15)
          ctx.fillStyle = c < 3 ? this.palette.glowColor : this.palette.dimColor
          ctx.globalAlpha = Math.max(0.06, trailFade * (isFlood ? 1.0 : 0.88) * col.z)
          ctx.fillText(col.chars[c].glyph, col.x, charY)
        }
        ctx.restore()
      }
    }
  }

  /**
   * Renders glassmorphic terminal panels with STRICT CARD CLIPPING so text
   * NEVER overflows outside the card container horizontally or vertically.
   */
  _renderTerminals(ctx) {
    const rgb = this.palette.rgb

    for (let t = 0; t < this.terminals.length; t++) {
      const term = this.terminals[t]

      ctx.save()

      // 1. STRICT CARD CLIPPING REGION
      ctx.beginPath()
      ctx.rect(term.x, term.y, term.w, term.h)
      ctx.clip()

      // 2. Glassmorphic Card Background
      ctx.fillStyle = "rgba(6, 14, 11, 0.88)"
      ctx.fillRect(term.x, term.y, term.w, term.h)

      // 3. Header Bar
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
      ctx.fillRect(term.x, term.y, term.w, 26)

      // Status indicator dot
      const pulseDot = (Math.sin(performance.now() * 0.005) + 1) * 0.5
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.5 + pulseDot * 0.5})`
      ctx.beginPath()
      ctx.arc(term.x + 14, term.y + 13, 4, 0, Math.PI * 2)
      ctx.fill()

      // Header Title (safely bounded)
      ctx.font = "bold 11px 'Courier New', monospace"
      ctx.fillStyle = this.palette.headColor
      ctx.fillText(term.title, term.x + 26, term.y + 17, term.w - 36)

      // 4. Streaming Code Lines (Strictly constrained within card)
      ctx.font = "12px 'Fira Code', 'Courier New', monospace"
      const lineSpacing = 18
      const maxTextW = term.w - 28

      for (let l = 0; l < term.lines.length; l++) {
        ctx.globalAlpha = 0.55 + (l / term.lines.length) * 0.4
        ctx.fillStyle = this.palette.glowColor
        ctx.fillText(term.lines[l], term.x + 14, term.y + 48 + l * lineSpacing, maxTextW)
      }

      // Active Typing Line + Blinking Cyber Cursor
      const curY = term.y + 48 + Math.min(term.lines.length, term.maxLines) * lineSpacing
      const cursor = Math.floor(performance.now() / 400) % 2 === 0 ? "█" : " "
      ctx.globalAlpha = 1.0
      ctx.fillStyle = this.palette.headColor
      ctx.fillText(term.currentText + cursor, term.x + 14, curY, maxTextW)

      // 5. Corner Cyber Brackets [ + ]
      ctx.strokeStyle = this.palette.glowColor
      ctx.lineWidth = 1.8
      const bLen = 12

      // Top-Left
      ctx.beginPath()
      ctx.moveTo(term.x, term.y + bLen)
      ctx.lineTo(term.x, term.y)
      ctx.lineTo(term.x + bLen, term.y)
      ctx.stroke()
      // Top-Right
      ctx.beginPath()
      ctx.moveTo(term.x + term.w - bLen, term.y)
      ctx.lineTo(term.x + term.w, term.y)
      ctx.lineTo(term.x + term.w, term.y + bLen)
      ctx.stroke()
      // Bottom-Left
      ctx.beginPath()
      ctx.moveTo(term.x, term.y + term.h - bLen)
      ctx.lineTo(term.x, term.y + term.h)
      ctx.lineTo(term.x + bLen, term.y + term.h)
      ctx.stroke()
      // Bottom-Right
      ctx.beginPath()
      ctx.moveTo(term.x + term.w - bLen, term.y + term.h)
      ctx.lineTo(term.x + term.w, term.y + term.h)
      ctx.lineTo(term.x + term.w, term.y + term.h - bLen)
      ctx.stroke()

      ctx.restore()
    }
  }

  /**
   * Renders the cinematic "EXECUTING PAYLOAD..." loading progress bar.
   */
  _renderLoading(ctx) {
    ctx.save()
    const barWidth = Math.min(500, this.width * 0.8)
    const barHeight = 32
    const x = (this.width - barWidth) / 2
    const y = this.height - 150
    const rgb = this.palette.rgb

    // Container Panel
    ctx.fillStyle = "rgba(4, 12, 8, 0.82)"
    ctx.fillRect(x - 20, y - 55, barWidth + 40, barHeight + 115)

    // Corner brackets
    ctx.strokeStyle = this.palette.glowColor
    ctx.lineWidth = 1.6
    const bLen = 14
    ctx.beginPath()
    ctx.moveTo(x - 20, y - 55 + bLen); ctx.lineTo(x - 20, y - 55); ctx.lineTo(x - 20 + bLen, y - 55);
    ctx.moveTo(x + barWidth + 20 - bLen, y - 55); ctx.lineTo(x + barWidth + 20, y - 55); ctx.lineTo(x + barWidth + 20, y - 55 + bLen);
    ctx.moveTo(x - 20, y + barHeight + 60 - bLen); ctx.lineTo(x - 20, y + barHeight + 60); ctx.lineTo(x - 20 + bLen, y + barHeight + 60);
    ctx.moveTo(x + barWidth + 20 - bLen, y + barHeight + 60); ctx.lineTo(x + barWidth + 20, y + barHeight + 60); ctx.lineTo(x + barWidth + 20, y + barHeight + 60 - bLen);
    ctx.stroke()

    // Title
    ctx.font = "bold 16px 'Courier New', monospace"
    ctx.fillStyle = this.palette.headColor
    ctx.textAlign = "center"
    const dots = ".".repeat(Math.floor(performance.now() / 250) % 4)
    ctx.fillText(`EXECUTING PAYLOAD${dots}`, this.width / 2, y - 22)

    // Border
    ctx.strokeStyle = this.palette.dimColor
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, barWidth, barHeight)

    // Fill Bar
    const fillW = Math.max(0, (this.loadingProgress / 100) * (barWidth - 6))
    const grad = ctx.createLinearGradient(x, y, x + fillW, y)
    grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`)
    grad.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`)
    grad.addColorStop(1, "#ffffff")
    ctx.fillStyle = grad
    ctx.fillRect(x + 3, y + 3, fillW, barHeight - 6)

    // Percentage
    ctx.font = "bold 15px 'Courier New', monospace"
    ctx.fillStyle = this.palette.headColor
    ctx.fillText(`${Math.floor(this.loadingProgress)}%`, this.width / 2, y + barHeight + 25)

    // Status message
    ctx.font = "12px 'Courier New', monospace"
    ctx.fillStyle = this.palette.glowColor
    let statusMsg = "Initializing memory breach..."
    if (this.loadingProgress > 25) statusMsg = "Decrypting RSA-4096 neural keys..."
    if (this.loadingProgress > 60) statusMsg = "Overriding mainframe security kernel..."
    if (this.loadingProgress > 90) statusMsg = "Injecting root exploit payload..."
    ctx.fillText(statusMsg, this.width / 2, y + barHeight + 45)

    ctx.restore()
  }

  /**
   * Renders neural cyber graph connections and pulsing data packets.
   */
  _renderCyberNodes(ctx) {
    const maxDist = 150
    ctx.save()

    for (let i = 0; i < this.cyberNodes.length; i++) {
      const n1 = this.cyberNodes[i]
      const pulse = (Math.sin(n1.pulse) + 1) * 0.5
      ctx.fillStyle = this.palette.glowColor
      ctx.globalAlpha = 0.4 + pulse * 0.5
      ctx.beginPath()
      ctx.arc(n1.x, n1.y, n1.size, 0, Math.PI * 2)
      ctx.fill()

      for (let j = i + 1; j < this.cyberNodes.length; j++) {
        const n2 = this.cyberNodes[j]
        const dx = n2.x - n1.x
        const dy = n2.y - n1.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.3
          ctx.strokeStyle = this.palette.dimColor
          ctx.globalAlpha = alpha
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.moveTo(n1.x, n1.y)
          ctx.lineTo(n2.x, n2.y)
          ctx.stroke()
        }
      }
    }
    ctx.restore()
  }

  /**
   * Renders expanding Cyber EMP shockwaves.
   */
  _renderShockwaves(ctx) {
    ctx.save()
    for (let s = 0; s < this.shockwaves.length; s++) {
      const sw = this.shockwaves[s]
      ctx.strokeStyle = this.palette.headColor
      ctx.lineWidth = 2.0 * sw.life
      ctx.globalAlpha = sw.life * 0.85
      ctx.beginPath()
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  }

  /**
   * Renders Classic ambient floating particles (Bản cũ).
   */
  _renderClassicParticles(ctx) {
    ctx.save()
    ctx.fillStyle = this.palette.glowColor
    for (let i = 0; i < this.classicParticles.length; i++) {
      const p = this.classicParticles[i]
      ctx.globalAlpha = p.opacity
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  _triggerFlood(now) {
    this.sequenceState = "flood"
    this.sequenceTimer = now
    const H = this.height || window.innerHeight

    // Immediately coat the canvas in solid black to begin the 6-second runbg flood
    this.ctx.globalCompositeOperation = "source-over"
    this.ctx.fillStyle = "#000000"
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Stagger all rain columns across the whole screen to flood immediately
    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i]
      col.y = (Math.random() - 0.5) * H * 0.4
      col.speed = (3.5 + Math.random() * 4.5) * (0.8 + col.z * 0.5)
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                MAIN LOOP                                   */
  /* -------------------------------------------------------------------------- */

  animate(timestamp = 0) {
    if (!this.active || this.destroyed) return

    const rawElapsed = this.lastTime ? timestamp - this.lastTime : 16.67
    this.lastTime = timestamp
    const dt = Math.min(Math.max(rawElapsed / (1000 / 60), 0.1), 3.0)

    this._update(dt)

    // Backdrop logic:
    // ONLY when loading bar is full (sequenceState === "flood"), turn the screen BLACK!
    // During normal typing and loading, canvas is cleared (transparent over wallpaper)
    if (this.sequenceState === "flood") {
      this.ctx.globalCompositeOperation = "source-over"
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.16)"
      this.ctx.fillRect(0, 0, this.width, this.height)

      const floodElapsed = performance.now() - this.sequenceTimer
      if (floodElapsed > 4800) {
        const fadeAlpha = Math.min(1.0, (floodElapsed - 4800) / 1200)
        this.ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha * 0.35})`
        this.ctx.fillRect(0, 0, this.width, this.height)
      }
    } else {
      // Normal typing & loading: transparent overlay over wallpaper
      this.ctx.clearRect(0, 0, this.width, this.height)
    }

    // 1. RENDER CLASSIC MODE (Bản cũ: Typing blocks, classic loading, flood)
    if (this._mode === "classic") {
      if (this.sequenceState === "flood") {
        this.ctx.globalCompositeOperation = "lighter"
        this._renderMatrixRain(this.ctx)
      } else {
        this._renderClassicParticles(this.ctx)
        this.classicBlocks.forEach((b) => b.draw(this.ctx))
        if (this.sequenceState === "loading") {
          this._renderLoading(this.ctx)
        }
      }
      return
    }

    // 2. RENDER MODERN HOLLYWOOD MODE / MATRIX / TERMINAL
    this.ctx.globalCompositeOperation = "lighter"

    // Falling digital rain runs continuously as normal ("mấy chữ rơi cứ bình thường hết giữ nguyên")
    if (this._mode !== "terminal") {
      this._renderMatrixRain(this.ctx)
    }

    // Neural Nodes (displayed during typing/loading)
    if ((this._mode === "hollywood" || this._mode === "cyberpunk") && this.sequenceState !== "flood") {
      this._renderCyberNodes(this.ctx)
    }

    // Terminal Cards (Strictly clipped with no overflow, displayed during typing/loading)
    if ((this._mode === "hollywood" || this._mode === "terminal") && this.sequenceState !== "flood") {
      this.ctx.globalCompositeOperation = "source-over"
      this._renderTerminals(this.ctx)
      this.ctx.globalCompositeOperation = "lighter"
    }

    // Loading Bar when executing payload
    if (this.sequenceState === "loading") {
      this.ctx.globalCompositeOperation = "source-over"
      this._renderLoading(this.ctx)
      this.ctx.globalCompositeOperation = "lighter"
    }

    // EMP Shockwaves
    if (this.shockwaves.length > 0) {
      this._renderShockwaves(this.ctx)
    }
  }
}

