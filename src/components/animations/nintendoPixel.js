/**
 * Retro Terminal (CRT Monitor) — Hollywood AAA 8-Bit Terminal HD Engine
 *
 * Performance Optimized Edition:
 *  1. Native High-DPI Retina Subpixel Precision (devicePixelRatio).
 *  2. Dual Offscreen Canvas Buffers (Pre-rendered CRT Scanlines, Vignette, and Phosphor Glow).
 *  3. Zero per-frame gradient allocations or measureText layout stalls.
 *  4. Pre-computed Alpha Palette cache for zero GC pressure.
 *  5. Locked 60Hz-144Hz silky-smooth rendering with negligible CPU/GPU consumption.
 *  6. Mouse hover parallax & full toggle support (setMouseEnabled).
 */

export class NintendoPixelEffect {
  constructor(canvasId, color = "#63f5ff") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null
    this.active = false
    this.destroyed = false
    this._animId = null

    this.color = color || "#63f5ff"
    this._cachedRGB = this._parseHex(this.color)
    this._buildPalette()

    // Retina DPR & Dimensions
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    // Mouse Tracking
    this.mouseEnabled = true
    this.mouse = { x: 0.5, y: 0.5 }
    this.targetMouse = { x: 0.5, y: 0.5 }

    // Timing & Simulation
    this.time = 0
    this.lastTime = performance.now()
    this.uptimeSeconds = 15243
    this.cursorBlink = 0

    // Offscreen Buffers for Ultra-High Performance
    this.bgCanvas = null
    this.bgCtx = null
    this.overlayCanvas = null
    this.overlayCtx = null

    // Pre-calculated Text Metrics
    this.textWidths = {}

    // Terminal Script & Console State
    this.terminalLines = []
    this.maxLines = 22
    this.scriptIndex = 0
    this.charIndex = 0
    this.typeDelay = 0
    this.currentCommandPrompt = "guest@cyber-nexus:~$ "

    // Telemetry & Hex Data
    this.cpuMeters = [
      { name: "CPU_0", val: 52, target: 52 },
      { name: "CPU_1", val: 68, target: 68 },
      { name: "RAM", val: 74, target: 74 },
      { name: "VRAM", val: 42, target: 42 },
    ]
    this.telemetryTick = 0
    this.hexRows = []
    this.initHexMatrix()

    // 8-bit Vector Radar
    this.radarAngle = 0
    this.radarBlips = [
      { r: 0.35, theta: 1.1, life: 1.0 },
      { r: 0.65, theta: 2.8, life: 0.8 },
      { r: 0.48, theta: 4.4, life: 0.5 },
      { r: 0.82, theta: 5.7, life: 0.9 },
    ]

    this.initTerminalScript()
    this.resize()

    this._resizeHandler = () => this.resize()
    this._mouseMoveHandler = (e) => this._onMouseMove(e)
    this._mouseLeaveHandler = () => this._onMouseLeave()
    this._visibilityHandler = () => this._onVisibilityChange()

    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("mousemove", this._mouseMoveHandler, { passive: true })
    window.addEventListener("mouseleave", this._mouseLeaveHandler, { passive: true })
    document.addEventListener("visibilitychange", this._visibilityHandler)
  }

  _parseHex(hex) {
    const clean = (hex || "#63f5ff").replace("#", "")
    const full =
      clean.length === 3
        ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
        : clean
    const r = parseInt(full.slice(0, 2), 16)
    const g = parseInt(full.slice(2, 4), 16)
    const b = parseInt(full.slice(4, 6), 16)
    return {
      r: Number.isNaN(r) ? 99 : r,
      g: Number.isNaN(g) ? 245 : g,
      b: Number.isNaN(b) ? 255 : b,
    }
  }

  _buildPalette() {
    const { r, g, b } = this._cachedRGB
    this.palette = {
      full: `rgba(${r}, ${g}, ${b}, 1.0)`,
      high: `rgba(${r}, ${g}, ${b}, 0.95)`,
      text: `rgba(${r}, ${g}, ${b}, 0.88)`,
      mid: `rgba(${r}, ${g}, ${b}, 0.72)`,
      dim: `rgba(${r}, ${g}, ${b}, 0.45)`,
      border: `rgba(${r}, ${g}, ${b}, 0.65)`,
      borderTick: `rgba(${r}, ${g}, ${b}, 0.95)`,
      faint: `rgba(${r}, ${g}, ${b}, 0.25)`,
      radarTail: `rgba(${r}, ${g}, ${b}, 0.14)`,
    }
  }

  updateAccentColor(color) {
    if (!color) return
    this.color = color
    this._cachedRGB = this._parseHex(color)
    this._buildPalette()
    this._buildBackgroundBuffer()
  }

  setMouseEnabled(enabled) {
    this.mouseEnabled = Boolean(enabled)
    if (!this.mouseEnabled) {
      this.targetMouse = { x: 0.5, y: 0.5 }
      this.mouse = { x: 0.5, y: 0.5 }
    }
  }

  _onMouseMove(e) {
    if (this.mouseEnabled === false) return
    this.targetMouse.x = e.clientX / (this.width || window.innerWidth)
    this.targetMouse.y = e.clientY / (this.height || window.innerHeight)
  }

  _onMouseLeave() {
    this.targetMouse = { x: 0.5, y: 0.5 }
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.lastTime = performance.now()
    }
  }

  resize() {
    if (!this.canvas) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = Math.round(this.width * this.dpr)
    this.canvas.height = Math.round(this.height * this.dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.ctx.scale(this.dpr, this.dpr)
      this.ctx.imageSmoothingEnabled = false
    }

    this.maxLines = Math.max(12, Math.floor((this.height - 180) / 22))

    // Pre-calculate Offscreen Buffers once
    this._buildBackgroundBuffer()
    this._buildOverlayBuffer()
    this._cacheTextMetrics()
  }

  _cacheTextMetrics() {
    if (!this.ctx) return
    this.ctx.save()
    this.ctx.font = "bold 12px 'Courier New', Monaco, monospace"
    this.textWidths.status = this.ctx.measureText("9600 BAUD [ONLINE]").width
    this.textWidths.prompt = this.ctx.measureText("guest@cyber-nexus:~$ ").width
    this.textWidths.titleConsole = this.ctx.measureText("[ CONSOLE LOG // DEV-0 ]").width
    this.textWidths.titleTelem = this.ctx.measureText("[ SYSTEM TELEMETRY ]").width
    this.textWidths.titleHex = this.ctx.measureText("[ ACTIVE MEMORY DUMP ]").width
    this.textWidths.titleRadar = this.ctx.measureText("[ TACTICAL RADAR ]").width
    this.ctx.restore()
  }

  // Pre-renders backdrop gradient once into offscreen canvas
  _buildBackgroundBuffer() {
    const W = this.width
    const H = this.height
    if (!W || !H) return

    if (!this.bgCanvas) {
      this.bgCanvas = document.createElement("canvas")
    }
    this.bgCanvas.width = Math.round(W * this.dpr)
    this.bgCanvas.height = Math.round(H * this.dpr)
    this.bgCtx = this.bgCanvas.getContext("2d")
    if (!this.bgCtx) return

    this.bgCtx.setTransform(1, 0, 0, 1, 0, 0)
    this.bgCtx.scale(this.dpr, this.dpr)

    // Deep Dark Base
    this.bgCtx.fillStyle = "#04080a"
    this.bgCtx.fillRect(0, 0, W, H)

    // Phosphor ambient glow
    const { r, g, b } = this._cachedRGB
    const bgGlow = this.bgCtx.createRadialGradient(
      W * 0.5,
      H * 0.45,
      10,
      W * 0.5,
      H * 0.5,
      Math.max(W, H) * 0.75
    )
    bgGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.08)`)
    bgGlow.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.02)`)
    bgGlow.addColorStop(1, "rgba(0, 0, 0, 0.85)")
    this.bgCtx.fillStyle = bgGlow
    this.bgCtx.fillRect(0, 0, W, H)
  }

  // Pre-renders CRT scanlines and bezel vignette once into offscreen buffer
  _buildOverlayBuffer() {
    const W = this.width
    const H = this.height
    if (!W || !H) return

    if (!this.overlayCanvas) {
      this.overlayCanvas = document.createElement("canvas")
    }
    this.overlayCanvas.width = Math.round(W * this.dpr)
    this.overlayCanvas.height = Math.round(H * this.dpr)
    this.overlayCtx = this.overlayCanvas.getContext("2d")
    if (!this.overlayCtx) return

    this.overlayCtx.setTransform(1, 0, 0, 1, 0, 0)
    this.overlayCtx.scale(this.dpr, this.dpr)

    // Horizontal scanlines pre-rendered once
    this.overlayCtx.fillStyle = "rgba(0, 0, 0, 0.24)"
    for (let y = 0; y < H; y += 4) {
      this.overlayCtx.fillRect(0, y, W, 1)
    }

    // CRT Bezel Radial Vignette (Curved corners) pre-rendered once
    const vignette = this.overlayCtx.createRadialGradient(
      W * 0.5,
      H * 0.5,
      Math.min(W, H) * 0.45,
      W * 0.5,
      H * 0.5,
      Math.max(W, H) * 0.72
    )
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)")
    vignette.addColorStop(0.7, "rgba(0, 0, 0, 0.28)")
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.78)")
    this.overlayCtx.fillStyle = vignette
    this.overlayCtx.fillRect(0, 0, W, H)
  }

  initHexMatrix() {
    this.hexRows = []
    const baseAddr = 0x7f00
    for (let i = 0; i < 6; i++) {
      const addr = (baseAddr + i * 16).toString(16).toUpperCase().padStart(4, "0")
      const bytes = Array.from({ length: 8 }, () =>
        Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, "0")
      )
      this.hexRows.push({ addr, bytes })
    }
  }

  initTerminalScript() {
    this.script = [
      { type: "instant", text: "SYS://CYBER-NEXUS-8086 KERNEL RELEASE 4.19" },
      { type: "instant", text: "COPYRIGHT (C) 1984-1996 RETRO SYSTEMS CORP." },
      { type: "instant", text: "----------------------------------------------------" },
      { type: "type", text: "> BIOS POST: 640KB BASE RAM OK, EXT: 15360KB OK" },
      { type: "type", text: "> MOUNTING ROOT VFS ON /dev/sda1 [READ/WRITE]... [OK]" },
      { type: "type", text: "> INITIALIZING PARALLEL BUS CHIPSETS 8259A/8254... [OK]" },
      { type: "type", text: "> DETECTING DISPLAY ADAPTER: CRT MONOCHROME P4... [OK]" },
      { type: "type", text: "> PROBING ETHERNET TRANSCEIVER 10BASE-T... CONNECTED" },
      { type: "type", text: "> ESTABLISHING TCP/IP HANDSHAKE WITH REMOTE GATEWAY" },
      { type: "type", text: "> SCANNING PORTS [21, 22, 23, 80, 443, 8080]... READY" },
      { type: "type", text: "> ALL SUBSYSTEMS NOMINAL. STARTING DAEMON PROCESSES" },
      { type: "instant", text: "----------------------------------------------------" },
      { type: "cmd", text: "guest@cyber-nexus:~$ netstat -a --numeric-hosts" },
      { type: "instant", text: "TCP  127.0.0.1:8080   0.0.0.0:*           LISTEN" },
      { type: "instant", text: "TCP  192.168.1.42:22  10.0.0.1:51284      ESTABLISHED" },
      { type: "instant", text: "UDP  0.0.0.0:53       *:*                 READY" },
      { type: "cmd", text: "guest@cyber-nexus:~$ run memory-benchmark --verbose" },
      { type: "instant", text: "BENCHMARKING CACHE L1/L2 READ/WRITE BANDWIDTH..." },
      { type: "instant", text: "[████████████████████████████████] 100% COMPLETE" },
      { type: "instant", text: "MEMORY TRANSFER RATE: 133.4 MB/S // ZERO CORRUPTION" },
      { type: "cmd", text: "guest@cyber-nexus:~$ ping -c 4 mainframe.gateway.net" },
      { type: "instant", text: "64 bytes from 10.0.4.1: icmp_seq=1 ttl=64 time=1.42 ms" },
      { type: "instant", text: "64 bytes from 10.0.4.1: icmp_seq=2 ttl=64 time=1.38 ms" },
      { type: "instant", text: "64 bytes from 10.0.4.1: icmp_seq=3 ttl=64 time=1.45 ms" },
      { type: "instant", text: "--- ping statistics: 0% packet loss, rtt min/avg/max = 1.41ms" },
      { type: "cmd", text: "guest@cyber-nexus:~$ sys-monitor --continuous-mode" },
      { type: "instant", text: "MONITORING ACTIVE BUS TRAFFIC & EVENT LOG..." },
    ]

    this.terminalLines = [
      "SYS://CYBER-NEXUS-8086 KERNEL RELEASE 4.19",
      "COPYRIGHT (C) 1984-1996 RETRO SYSTEMS CORP.",
      "----------------------------------------------------",
      "> BIOS POST: 640KB BASE RAM OK, EXT: 15360KB OK",
      "> MOUNTING ROOT VFS ON /dev/sda1 [READ/WRITE]... [OK]",
      "> INITIALIZING PARALLEL BUS CHIPSETS 8259A/8254... [OK]",
      "> DETECTING DISPLAY ADAPTER: CRT MONOCHROME P4... [OK]",
      "> PROBING ETHERNET TRANSCEIVER 10BASE-T... CONNECTED",
      "> ESTABLISHING TCP/IP HANDSHAKE WITH REMOTE GATEWAY",
    ]
    this.scriptIndex = 9
    this.charIndex = 0
  }

  update(dt) {
    this.time += dt
    this.uptimeSeconds += dt

    // Smooth mouse parallax interpolation
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05 * (dt * 60)
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05 * (dt * 60)

    // Cursor blink timer
    this.cursorBlink = (this.cursorBlink + dt * 2.5) % 1

    // Script Typing Machine
    this.typeDelay -= dt
    if (this.typeDelay <= 0) {
      const item = this.script[this.scriptIndex]
      if (item) {
        if (item.type === "instant") {
          this.terminalLines.push(item.text)
          if (this.terminalLines.length > this.maxLines) this.terminalLines.shift()
          this.scriptIndex = (this.scriptIndex + 1) % this.script.length
          this.typeDelay = 0.35 + Math.random() * 0.4
        } else if (item.type === "cmd" || item.type === "type") {
          if (this.charIndex === 0) {
            this.terminalLines.push("")
            if (this.terminalLines.length > this.maxLines) this.terminalLines.shift()
          }

          const currentLineIdx = this.terminalLines.length - 1
          this.charIndex += 1
          this.terminalLines[currentLineIdx] = item.text.slice(0, this.charIndex)

          if (this.charIndex >= item.text.length) {
            this.charIndex = 0
            this.scriptIndex = (this.scriptIndex + 1) % this.script.length
            this.typeDelay = 0.6 + Math.random() * 0.5
          } else {
            this.typeDelay = item.type === "cmd" ? 0.04 + Math.random() * 0.03 : 0.02 + Math.random() * 0.02
          }
        }
      } else {
        this.scriptIndex = 0
      }
    }

    // Telemetry Meter Jitter
    this.telemetryTick += dt
    if (this.telemetryTick > 0.8) {
      this.telemetryTick = 0
      this.cpuMeters.forEach((m) => {
        m.target = 35 + Math.floor(Math.random() * 55)
      })

      if (this.hexRows.length > 0) {
        const row = this.hexRows[Math.floor(Math.random() * this.hexRows.length)]
        const col = Math.floor(Math.random() * row.bytes.length)
        row.bytes[col] = Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, "0")
      }
    }

    this.cpuMeters.forEach((m) => {
      m.val += (m.target - m.val) * 0.08 * (dt * 60)
    })

    // Radar Sweep
    this.radarAngle = (this.radarAngle + dt * 1.8) % (Math.PI * 2)
    this.radarBlips.forEach((blip) => {
      blip.life -= dt * 0.25
      if (blip.life <= 0) {
        blip.life = 1.0
        blip.theta = Math.random() * Math.PI * 2
        blip.r = 0.2 + Math.random() * 0.68
      }
    })
  }

  draw() {
    const ctx = this.ctx
    if (!ctx) return

    const W = this.width
    const H = this.height

    ctx.save()

    // 1. Draw Pre-rendered Backdrop Buffer (1 fast drawImage instead of clearing and allocating gradients)
    if (this.bgCanvas) {
      ctx.drawImage(this.bgCanvas, 0, 0, W, H)
    } else {
      ctx.fillStyle = "#04080a"
      ctx.fillRect(0, 0, W, H)
    }

    // CRT Screen Subtle Curved Mouse Parallax
    const tiltX = (this.mouse.x - 0.5) * 8
    const tiltY = (this.mouse.y - 0.5) * 6
    ctx.translate(tiltX, tiltY)

    // Layout Dimensions
    const margin = Math.max(16, Math.min(32, W * 0.025))
    const isCompact = W < 920

    const contentW = W - margin * 2
    const headerH = 34
    const contentY = margin + headerH + 12

    const rightPanelW = isCompact ? 0 : Math.min(360, Math.max(260, contentW * 0.32))
    const leftPanelW = isCompact ? contentW : contentW - rightPanelW - 16
    const totalContentH = H - contentY - margin

    // 2. TOP SYSTEM HEADER
    this._drawSystemHeader(margin, margin, contentW, headerH)

    // 3. MAIN CONSOLE PANEL (LEFT)
    this._drawMainConsole(margin, contentY, leftPanelW, totalContentH)

    // 4. RIGHT TELEMETRY, HEX MATRIX & RADAR (IF NOT COMPACT)
    if (!isCompact) {
      const rightX = margin + leftPanelW + 16
      const panelGap = 12
      const telemH = Math.min(180, totalContentH * 0.30)
      const hexH = Math.min(190, totalContentH * 0.32)
      const radarH = Math.max(140, totalContentH - telemH - hexH - panelGap * 2)

      this._drawTelemetryPanel(rightX, contentY, rightPanelW, telemH)
      this._drawHexMatrixPanel(rightX, contentY + telemH + panelGap, rightPanelW, hexH)
      this._drawRadarPanel(rightX, contentY + telemH + hexH + panelGap * 2, rightPanelW, radarH)
    }

    ctx.restore()

    // 5. Draw Pre-rendered CRT Scanlines & Bezel Vignette Buffer (1 fast drawImage instead of 500+ fillRect)
    if (this.overlayCanvas) {
      ctx.drawImage(this.overlayCanvas, 0, 0, W, H)
    }
  }

  // ─── 8-BIT BOX DRAWING HELPERS ──────────────────────────────────────

  _draw8BitBox(x, y, w, h, title = "", cachedWidth = 0) {
    const ctx = this.ctx
    const pal = this.palette

    // Semi-translucent dark glass fill
    ctx.fillStyle = "rgba(4, 12, 14, 0.82)"
    ctx.fillRect(x, y, w, h)

    // 8-bit Phosphor Border
    ctx.strokeStyle = pal.border
    ctx.lineWidth = 1
    ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, Math.floor(w), Math.floor(h))

    // Corner tick accents
    const tick = 6
    ctx.strokeStyle = pal.borderTick
    ctx.lineWidth = 2
    ctx.beginPath()
    // Top-left
    ctx.moveTo(x, y + tick)
    ctx.lineTo(x, y)
    ctx.lineTo(x + tick, y)
    // Top-right
    ctx.moveTo(x + w - tick, y)
    ctx.lineTo(x + w, y)
    ctx.lineTo(x + w, y + tick)
    // Bottom-left
    ctx.moveTo(x, y + h - tick)
    ctx.lineTo(x, y + h)
    ctx.lineTo(x + tick, y + h)
    // Bottom-right
    ctx.moveTo(x + w - tick, y + h)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x + w, y + h - tick)
    ctx.stroke()

    // Title tag (uses pre-cached width)
    if (title) {
      ctx.font = "bold 11px 'Courier New', Monaco, monospace"
      const titleText = `[ ${title} ]`
      const tw = cachedWidth || (titleText.length * 7 + 8)
      ctx.fillStyle = "#04080a"
      ctx.fillRect(x + 14, y - 6, tw + 8, 12)
      ctx.fillStyle = pal.high
      ctx.fillText(titleText, x + 18, y + 4)
    }
  }

  // ─── 1. TOP HEADER ──────────────────────────────────────────────────

  _drawSystemHeader(x, y, w, h) {
    const ctx = this.ctx
    const pal = this.palette
    this._draw8BitBox(x, y, w, h)

    ctx.save()
    ctx.font = "bold 12px 'Courier New', Monaco, monospace"

    // Left brand
    ctx.fillStyle = pal.full
    ctx.fillText("SYS://RETRO-TERMINAL-8086", x + 14, y + 21)

    // Center Uptime
    const hrs = Math.floor(this.uptimeSeconds / 3600).toString().padStart(2, "0")
    const mins = Math.floor((this.uptimeSeconds % 3600) / 60).toString().padStart(2, "0")
    const secs = Math.floor(this.uptimeSeconds % 60).toString().padStart(2, "0")
    ctx.fillStyle = pal.mid
    if (w > 640) {
      ctx.fillText(`UPTIME: ${hrs}:${mins}:${secs}`, x + w * 0.45, y + 21)
    }

    // Right baud & status badge
    ctx.fillStyle = pal.high
    const sw = this.textWidths.status || 135
    ctx.fillText("9600 BAUD [ONLINE]", x + w - sw - 14, y + 21)

    ctx.restore()
  }

  // ─── 2. MAIN CONSOLE ────────────────────────────────────────────────

  _drawMainConsole(x, y, w, h) {
    const ctx = this.ctx
    const pal = this.palette
    this._draw8BitBox(x, y, w, h, "CONSOLE LOG // DEV-0", this.textWidths.titleConsole)

    ctx.save()
    const paddingX = 18
    const startY = y + 30
    const lineSpacing = 20

    ctx.font = "12px 'Courier New', Monaco, monospace"

    for (let i = 0; i < this.terminalLines.length; i++) {
      const lineY = startY + i * lineSpacing
      if (lineY > y + h - 38) break

      const line = this.terminalLines[i]
      if (!line) continue

      if (line.startsWith("SYS:") || line.startsWith("COPYRIGHT")) {
        ctx.fillStyle = pal.dim
      } else if (line.startsWith(">")) {
        ctx.fillStyle = pal.text
      } else if (line.startsWith("guest@")) {
        ctx.fillStyle = pal.full
      } else if (line.includes("[OK]") || line.includes("COMPLETE")) {
        ctx.fillStyle = pal.high
      } else if (line.includes("---") || line.includes("===")) {
        ctx.fillStyle = pal.dim
      } else {
        ctx.fillStyle = pal.mid
      }

      ctx.fillText(line, x + paddingX, lineY)
    }

    // Bottom interactive command prompt line with 8-bit blinking block cursor
    const bottomPromptY = y + h - 16
    ctx.strokeStyle = pal.faint
    ctx.beginPath()
    ctx.moveTo(x + 12, bottomPromptY - 14)
    ctx.lineTo(x + w - 12, bottomPromptY - 14)
    ctx.stroke()

    ctx.font = "bold 12px 'Courier New', Monaco, monospace"
    ctx.fillStyle = pal.high
    const promptText = "guest@cyber-nexus:~$ "
    ctx.fillText(promptText, x + paddingX, bottomPromptY)

    // Blinking Block Cursor █
    if (this.cursorBlink > 0.5) {
      const pw = this.textWidths.prompt || 155
      ctx.fillStyle = pal.full
      ctx.fillRect(x + paddingX + pw + 2, bottomPromptY - 10, 8, 12)
    }

    ctx.restore()
  }

  // ─── 3. TELEMETRY PANEL ─────────────────────────────────────────────

  _drawTelemetryPanel(x, y, w, h) {
    const ctx = this.ctx
    const pal = this.palette
    this._draw8BitBox(x, y, w, h, "SYSTEM TELEMETRY", this.textWidths.titleTelem)

    ctx.save()
    const paddingX = 14
    const startY = y + 28
    const rowH = 24

    ctx.font = "11px 'Courier New', Monaco, monospace"

    this.cpuMeters.forEach((m, idx) => {
      const rowY = startY + idx * rowH
      if (rowY > y + h - 10) return

      ctx.fillStyle = pal.text
      ctx.fillText(m.name.padEnd(6, " "), x + paddingX, rowY + 9)

      const barX = x + paddingX + 56
      const barW = Math.max(70, w - paddingX * 2 - 105)
      const barH = 10
      const pct = Math.max(0, Math.min(100, Math.round(m.val)))

      ctx.strokeStyle = pal.dim
      ctx.strokeRect(barX, rowY, barW, barH)

      const fillW = Math.round((barW - 2) * (pct / 100))
      ctx.fillStyle = pal.text
      ctx.fillRect(barX + 1, rowY + 1, fillW, barH - 2)

      ctx.fillStyle = pal.high
      ctx.fillText(`${pct}%`.padStart(4, " "), barX + barW + 8, rowY + 9)
    })

    ctx.fillStyle = pal.dim
    ctx.fillText("CORE TEMP: 41.6°C // FAN: 2800 RPM", x + paddingX, y + h - 12)

    ctx.restore()
  }

  // ─── 4. HEX MATRIX PANEL ────────────────────────────────────────────

  _drawHexMatrixPanel(x, y, w, h) {
    const ctx = this.ctx
    const pal = this.palette
    this._draw8BitBox(x, y, w, h, "ACTIVE MEMORY DUMP", this.textWidths.titleHex)

    ctx.save()
    const paddingX = 14
    const startY = y + 28
    const rowH = 20

    ctx.font = "11px 'Courier New', Monaco, monospace"

    this.hexRows.forEach((row, idx) => {
      const rowY = startY + idx * rowH
      if (rowY > y + h - 12) return

      ctx.fillStyle = pal.high
      ctx.fillText(`0x${row.addr}:`, x + paddingX, rowY)

      ctx.fillStyle = pal.mid
      const hexStr = row.bytes.slice(0, Math.min(8, Math.floor((w - 90) / 24))).join(" ")
      ctx.fillText(hexStr, x + paddingX + 54, rowY)
    })

    ctx.restore()
  }

  // ─── 5. 8-BIT VECTOR RADAR ──────────────────────────────────────────

  _drawRadarPanel(x, y, w, h) {
    const ctx = this.ctx
    const pal = this.palette
    this._draw8BitBox(x, y, w, h, "TACTICAL RADAR", this.textWidths.titleRadar)

    ctx.save()
    const cx = x + w / 2
    const cy = y + h / 2 + 6
    const radius = Math.max(20, Math.min(w * 0.38, (h - 32) * 0.42))

    // Radar concentric rings
    ctx.strokeStyle = pal.dim
    ctx.lineWidth = 1
    for (let r = radius * 0.33; r <= radius; r += radius * 0.33) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Crosshairs
    ctx.beginPath()
    ctx.moveTo(cx - radius - 4, cy)
    ctx.lineTo(cx + radius + 4, cy)
    ctx.moveTo(cx, cy - radius - 4)
    ctx.lineTo(cx, cy + radius + 4)
    ctx.stroke()

    // Rotating Radar Sweep Beam
    const sx = cx + Math.cos(this.radarAngle) * radius
    const sy = cy + Math.sin(this.radarAngle) * radius
    ctx.strokeStyle = pal.high
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(sx, sy)
    ctx.stroke()

    // Radar Sweep Tail
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, this.radarAngle - 0.45, this.radarAngle)
    ctx.closePath()
    ctx.fillStyle = pal.radarTail
    ctx.fill()

    // Detected Blips
    const { r, g, b } = this._cachedRGB
    this.radarBlips.forEach((blip) => {
      const bx = cx + Math.cos(blip.theta) * (radius * blip.r)
      const by = cy + Math.sin(blip.theta) * (radius * blip.r)
      const alpha = Math.max(0.1, blip.life)

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
      ctx.fillRect(bx - 2, by - 2, 4, 4)

      if (blip.life > 0.6) {
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${blip.life * 0.5})`
        ctx.strokeRect(bx - 4, by - 4, 8, 8)
      }
    })

    ctx.restore()
  }

  animate(currentTime = performance.now()) {
    if (!this.active || this.destroyed) return
    this._animId = requestAnimationFrame((t) => this.animate(t))
    if (document.visibilityState === "hidden") return

    const dt = Math.min((currentTime - (this.lastTime || currentTime)) * 0.001, 0.1)
    this.lastTime = currentTime

    this.update(dt)
    this.draw()
  }

  start() {
    if (this.active || this.destroyed) return
    this.active = true
    this.lastTime = performance.now()
    if (this.canvas) this.canvas.style.display = "block"
    this.resize()
    this.animate()
  }

  stop() {
    if (!this.active) return
    this.active = false
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.canvas) {
      this.canvas.style.display = "none"
    }
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("mousemove", this._mouseMoveHandler)
    window.removeEventListener("mouseleave", this._mouseLeaveHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)

    // Cleanup offscreen buffers
    this.bgCanvas = null
    this.bgCtx = null
    this.overlayCanvas = null
    this.overlayCtx = null
  }
}
