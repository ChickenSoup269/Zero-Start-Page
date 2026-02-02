// hacker.js

const snippets = [
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

// States for the cinematic sequence
const STATES = {
  TYPING: 0,
  LOADING: 1,
  FLOOD: 2,
}

class TerminalBlock {
  constructor(x, y, width, color) {
    this.reset(x, y, width, color)
  }

  reset(x, y, width, color) {
    this.x = x
    this.y = y
    this.width = width
    this.color = color
    this.lines = []
    this.maxLines = 10
    this.currentText = ""
    this.targetText = snippets[Math.floor(Math.random() * snippets.length)]
    this.charIndex = 0
    this.lastCharTime = Date.now()
    this.typingSpeed = Math.random() * 30 + 20 // Faster typing
    this.isDone = false
    this.opacity = 0
    this.targetOpacity = 1
    this.glowIntensity = 0
  }

  update(deltaTime) {
    // Smooth fade in
    if (this.opacity < this.targetOpacity) {
      this.opacity += deltaTime * 0.003
    }

    // Smooth glow pulsing
    this.glowIntensity = Math.sin(Date.now() * 0.003) * 0.3 + 0.7

    if (this.isDone) {
      this.targetOpacity -= deltaTime * 0.0008
      this.opacity -= deltaTime * 0.001
      if (this.opacity <= 0) return true // Signal reset
      return false
    }

    const now = Date.now()
    if (now - this.lastCharTime > this.typingSpeed) {
      if (this.charIndex < this.targetText.length) {
        this.currentText += this.targetText[this.charIndex]
        this.charIndex++
        this.lastCharTime = now
      } else {
        this.lines.push(this.currentText)
        if (this.lines.length > this.maxLines) this.lines.shift()

        if (Math.random() > 0.3) {
          this.currentText = ""
          this.targetText =
            snippets[Math.floor(Math.random() * snippets.length)]
          this.charIndex = 0
          this.typingSpeed = Math.random() * 30 + 20
        } else {
          this.isDone = true
        }
      }
    }
    return false
  }

  draw(ctx) {
    ctx.save()
    ctx.font = "16px 'Courier New', monospace"

    // Glow effect
    const rgb = this.hexToRgb(this.color)
    ctx.shadowBlur = 5
    ctx.shadowColor = this.color

    ctx.fillStyle = this.color
    ctx.globalAlpha = this.opacity

    this.lines.forEach((line, i) => {
      ctx.fillText(line, this.x, this.y + i * 22)
    })

    const currentY = this.y + this.lines.length * 22
    const cursor = Math.floor(Date.now() / 500) % 2 === 0 ? "█" : " "

    // Current line with stronger glow
    ctx.shadowBlur = 8
    ctx.fillText(
      this.currentText + (this.isDone ? "" : cursor),
      this.x,
      currentY,
    )

    ctx.restore()
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 255, b: 0 }
  }
}

export class HackerEffect {
  constructor(canvasId, color = "#00FF00") {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d")
    this.color = color
    this.blocks = []
    this.animationFrameId = null
    this.currentState = STATES.TYPING
    this.typingStartTime = Date.now()
    this.sequenceInterval = 30000 // 30 seconds
    this.stateTimer = 0
    this.progress = 0
    this.lastTime = Date.now()

    // For Flood state (Binary Rain columns)
    this.floodColumns = []
    this.fontSize = 14
    this.floodSpeed = 1.5
    this.floodFadeAlpha = 1

    // Background particles
    this.particles = []

    this.init()
    window.addEventListener("resize", () => this.handleResize())
  }

  init() {
    this.handleResize()
    this.createBlocks()
    this.createParticles()
  }

  handleResize() {
    const dpr = window.devicePixelRatio || 1
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = this.width * dpr
    this.canvas.height = this.height * dpr
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.ctx.scale(dpr, dpr)
    this.createBlocks()
    this.createParticles()

    // Reinit flood columns
    const cols = Math.ceil(this.width / this.fontSize)
    this.floodColumns = Array(cols)
      .fill(0)
      .map(() => ({
        y: Math.random() * -100,
        speed: Math.random() * 0.5 + 1,
        chars: [],
      }))
  }

  createBlocks() {
    this.blocks = []
    for (let i = 0; i < 5; i++) {
      this.spawnBlock()
    }
  }

  createParticles() {
    this.particles = []
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.3 + 0.1,
      })
    }
  }

  spawnBlock() {
    const margin = 50
    const x = margin + Math.random() * (this.width - 350 - margin * 2)
    const y = margin + Math.random() * (this.height - 200 - margin * 2)
    this.blocks.push(new TerminalBlock(x, y, 350, this.color))
  }

  drawParticles(deltaTime) {
    const rgb = this.hexToRgb(this.color)
    this.particles.forEach((p) => {
      p.y += p.speed * deltaTime * 0.05
      if (p.y > this.height) {
        p.y = 0
        p.x = Math.random() * this.width
      }

      const gradient = this.ctx.createRadialGradient(
        p.x,
        p.y,
        0,
        p.x,
        p.y,
        p.size * 2,
      )
      gradient.addColorStop(
        0,
        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.opacity})`,
      )
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)")

      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
      this.ctx.fill()
    })
  }

  drawLoading(deltaTime) {
    this.ctx.save()
    const barWidth = 500
    const barHeight = 35
    const x = (this.width - barWidth) / 2
    const y = this.height - 150 // Bottom center position

    const rgb = this.hexToRgb(this.color)

    // Background glow
    this.ctx.shadowBlur = 30
    this.ctx.shadowColor = this.color

    // Title with glow
    this.ctx.font = "24px 'Courier New', monospace"
    this.ctx.fillStyle = this.color
    this.ctx.textAlign = "center"

    const dots = ".".repeat(Math.floor(Date.now() / 300) % 4)
    this.ctx.fillText(`EXECUTING PAYLOAD${dots}`, this.width / 2, y - 40)

    // Bar border with glow
    this.ctx.shadowBlur = 15
    this.ctx.strokeStyle = this.color
    this.ctx.lineWidth = 3
    this.ctx.strokeRect(x, y, barWidth, barHeight)

    // Animated fill bar with gradient
    const fillW = (this.progress / 100) * barWidth
    const gradient = this.ctx.createLinearGradient(x, y, x + fillW, y)
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`)
    gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`)
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`)

    this.ctx.fillStyle = gradient
    this.ctx.fillRect(x + 4, y + 4, Math.max(0, fillW - 8), barHeight - 8)

    // Moving scan line
    const scanX = x + 4 + (fillW - 8) - 5
    if (fillW > 10) {
      const scanGradient = this.ctx.createLinearGradient(
        scanX,
        y,
        scanX + 10,
        y,
      )
      scanGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
      scanGradient.addColorStop(0.5, `rgba(255, 255, 255, 0.8)`)
      scanGradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
      this.ctx.fillStyle = scanGradient
      this.ctx.fillRect(scanX, y + 4, 10, barHeight - 8)
    }

    // Percentage with glow
    this.ctx.shadowBlur = 20
    this.ctx.font = "bold 18px 'Courier New', monospace"
    this.ctx.fillStyle = this.color
    this.ctx.fillText(
      `${Math.floor(this.progress)}%`,
      this.width / 2,
      y + barHeight + 45,
    )

    // Status text
    this.ctx.shadowBlur = 10
    this.ctx.font = "14px 'Courier New', monospace"
    this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`
    const status =
      this.progress < 30
        ? "Initializing..."
        : this.progress < 70
          ? "Compiling..."
          : "Finalizing..."
    this.ctx.fillText(status, this.width / 2, y + barHeight + 70)

    this.ctx.restore()

    // Smooth progress increment
    this.progress += deltaTime * 0.05
    if (this.progress >= 100) {
      this.currentState = STATES.FLOOD
      this.stateTimer = Date.now()
    }
  }

  drawFlood(deltaTime) {
    // Clear trails
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
    this.ctx.fillRect(0, 0, this.width, this.height)

    this.ctx.save()
    this.ctx.font = `${this.fontSize}px monospace`
    const rgb = this.hexToRgb(this.color)
    this.ctx.fillStyle = this.color
    this.ctx.shadowBlur = 15
    this.ctx.shadowColor = this.color

    for (let i = 0; i < this.floodColumns.length; i++) {
      const col = this.floodColumns[i]
      const char = Math.random() > 0.5 ? "1" : "0"
      const x = i * this.fontSize
      const y = col.y * this.fontSize

      this.ctx.fillText(char, x, y)

      // Update column position
      col.y += col.speed * deltaTime * 0.05

      // Reset column when off screen
      if (col.y * this.fontSize > this.height + 100) {
        col.y = -20
        col.speed = Math.random() * 0.5 + 1
      }
    }
    this.ctx.restore()

    // Fade out effect khi sắp kết thúc
    const floodDuration = 7000
    const fadeStartTime = 5500 // Bắt đầu fade ở giây thứ 5.5
    const elapsed = Date.now() - this.stateTimer

    if (elapsed > fadeStartTime) {
      this.floodFadeAlpha = Math.max(
        0,
        1 - (elapsed - fadeStartTime) / (floodDuration - fadeStartTime),
      )
      // Overlay fade to black
      this.ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.floodFadeAlpha})`
      this.ctx.fillRect(0, 0, this.width, this.height)
    }

    // Transition back to typing after flood
    if (elapsed > floodDuration) {
      this.currentState = STATES.TYPING
      this.typingStartTime = Date.now()
      this.progress = 0
      this.floodFadeAlpha = 1
      this.ctx.clearRect(0, 0, this.width, this.height)
      this.createBlocks()
    }
  }

  animate() {
    if (!this.animationFrameId) return

    const now = Date.now()
    const deltaTime = now - this.lastTime
    this.lastTime = now

    if (this.currentState !== STATES.FLOOD) {
      this.ctx.clearRect(0, 0, this.width, this.height)
    }

    // Draw background particles
    if (this.currentState === STATES.TYPING) {
      this.drawParticles(deltaTime)
    }

    if (this.currentState === STATES.TYPING) {
      this.blocks.forEach((block) => {
        const shouldReset = block.update(deltaTime)
        if (shouldReset) {
          const margin = 50
          const x = margin + Math.random() * (this.width - 350 - margin * 2)
          const y = margin + Math.random() * (this.height - 200 - margin * 2)
          block.reset(x, y, 350, this.color)
        }
        block.draw(this.ctx)
      })

      // Trigger loading sequence every 30 seconds
      if (Date.now() - this.typingStartTime > this.sequenceInterval) {
        this.currentState = STATES.LOADING
        this.progress = 0
      }
    } else if (this.currentState === STATES.LOADING) {
      this.drawLoading(deltaTime)
    } else if (this.currentState === STATES.FLOOD) {
      this.drawFlood(deltaTime)
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate())
  }

  start() {
    if (!this.animationFrameId) {
      this.canvas.style.display = "block"
      this.lastTime = Date.now()
      this.animationFrameId = requestAnimationFrame(() => this.animate())
    }
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
      this.ctx.clearRect(0, 0, this.width, this.height)
      this.canvas.style.display = "none"
    }
  }

  updateColor(color) {
    this.color = color
    this.blocks.forEach((b) => (b.color = color))
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 255, b: 0 }
  }
}
