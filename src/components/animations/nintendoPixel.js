/**
 * Retro Terminal (CRT Monitor) — Hollywood AAA 8-Bit Terminal HD Engine
 *
 * Featuring:
 *  1. Dynamic 3-Phase Cinematic Cycle:
 *     - Phase 1 (ONLINE / SCAN): Cyber mainframe workstation, command shell, telemetry, world radar scan.
 *     - Phase 2 (TARGET LOCK & MISSILE LAUNCH): Radar node locks, neon missile trails, rotated projectile heads & impact shockwaves.
 *     - Phase 3 (SYSTEM FAILURE / ERROR): Crimson alert CRT backdrop, falling matrix error streams, jittering 8-bit popup alert windows, auto-reboot sequence.
 *  2. Native High-DPI Retina Subpixel Precision (devicePixelRatio).
 *  3. Dual-buffer Pre-rendering (Normal Glow, Red Alert Glow, CRT Scanlines & Vignette).
 *  4. Zero GC pressure, cached text metrics, and 60Hz-144Hz silky-smooth execution.
 *  5. Mouse parallax & full toggle support (setMouseEnabled).
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

    // Timing & Phase Management
    this.time = 0
    this.lastTime = performance.now()
    this.uptimeSeconds = 15243
    this.cursorBlink = 0
    this.tick = 0

    // Phases: "online" (18s) -> "missile" (11s) -> "error" (8s)
    this.phase = "online"
    this.phaseTimer = 0
    this.phaseDurations = {
      online: 18,
      missile: 11,
      error: 8,
    }

    // Offscreen Buffers for Ultra Performance
    this.bgCanvas = null
    this.errorBgCanvas = null
    this.overlayCanvas = null
    this.textWidths = {}

    // Terminal Script & Console State
    this.terminalLines = []
    this.maxLines = 22
    this.scriptIndex = 0
    this.charIndex = 0
    this.typeDelay = 0

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

    // World Radar & Target Lock System
    this.radarAngle = 0
    this.worldNodes = []
    this.lockedNodeIndex = -1
    this.initWorldNodes()

    // Missile Barrage System
    this.missiles = []
    this.missileSpawnTimer = 0
    this.impactBursts = []

    // Error Overlay & Streams System
    this.errorStreams = []
    this.errorPopups = []
    this.initErrorSystem()

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
    this._buildBackgroundBuffers()
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

    this._buildBackgroundBuffers()
    this._buildOverlayBuffer()
    this._cacheTextMetrics()
  }

  _cacheTextMetrics() {
    if (!this.ctx) return
    this.ctx.save()
    this.ctx.font = "bold 12px 'Courier New', Monaco, monospace"
    this.textWidths.status = this.ctx.measureText("9600 BAUD [ONLINE]").width
    this.textWidths.statusMissile = this.ctx.measureText("MISSILE BARRAGE [ACTIVE]").width
    this.textWidths.statusError = this.ctx.measureText("CRITICAL ERROR [PANIC]").width
    this.textWidths.prompt = this.ctx.measureText("guest@cyber-nexus:~$ ").width
    this.textWidths.titleConsole = this.ctx.measureText("[ CONSOLE LOG // DEV-0 ]").width
    this.textWidths.titleTelem = this.ctx.measureText("[ SYSTEM TELEMETRY ]").width
    this.textWidths.titleHex = this.ctx.measureText("[ ACTIVE MEMORY DUMP ]").width
    this.textWidths.titleRadar = this.ctx.measureText("[ TACTICAL RADAR // DEF-NET ]").width
    this.ctx.restore()
  }

  _buildBackgroundBuffers() {
    const W = this.width
    const H = this.height
    if (!W || !H) return

    // 1. Normal phosphor ambient glow
    if (!this.bgCanvas) this.bgCanvas = document.createElement("canvas")
    this.bgCanvas.width = Math.round(W * this.dpr)
    this.bgCanvas.height = Math.round(H * this.dpr)
    const bgCtx = this.bgCanvas.getContext("2d")
    if (bgCtx) {
      bgCtx.setTransform(1, 0, 0, 1, 0, 0)
      bgCtx.scale(this.dpr, this.dpr)
      bgCtx.fillStyle = "#04080a"
      bgCtx.fillRect(0, 0, W, H)

      const { r, g, b } = this._cachedRGB
      const bgGlow = bgCtx.createRadialGradient(
        W * 0.5, H * 0.45, 10,
        W * 0.5, H * 0.5, Math.max(W, H) * 0.75
      )
      bgGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.08)`)
      bgGlow.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.02)`)
      bgGlow.addColorStop(1, "rgba(0, 0, 0, 0.85)")
      bgCtx.fillStyle = bgGlow
      bgCtx.fillRect(0, 0, W, H)
    }

    // 2. Crimson Red Alert ambient glow for Error Phase
    if (!this.errorBgCanvas) this.errorBgCanvas = document.createElement("canvas")
    this.errorBgCanvas.width = Math.round(W * this.dpr)
    this.errorBgCanvas.height = Math.round(H * this.dpr)
    const errCtx = this.errorBgCanvas.getContext("2d")
    if (errCtx) {
      errCtx.setTransform(1, 0, 0, 1, 0, 0)
      errCtx.scale(this.dpr, this.dpr)
      errCtx.fillStyle = "#120204"
      errCtx.fillRect(0, 0, W, H)

      const errGlow = errCtx.createRadialGradient(
        W * 0.5, H * 0.45, 10,
        W * 0.5, H * 0.5, Math.max(W, H) * 0.75
      )
      errGlow.addColorStop(0, "rgba(255, 40, 40, 0.22)")
      errGlow.addColorStop(0.5, "rgba(180, 10, 10, 0.12)")
      errGlow.addColorStop(1, "rgba(20, 0, 0, 0.92)")
      errCtx.fillStyle = errGlow
      errCtx.fillRect(0, 0, W, H)
    }
  }

  _buildOverlayBuffer() {
    const W = this.width
    const H = this.height
    if (!W || !H) return

    if (!this.overlayCanvas) this.overlayCanvas = document.createElement("canvas")
    this.overlayCanvas.width = Math.round(W * this.dpr)
    this.overlayCanvas.height = Math.round(H * this.dpr)
    const oCtx = this.overlayCanvas.getContext("2d")
    if (!oCtx) return

    oCtx.setTransform(1, 0, 0, 1, 0, 0)
    oCtx.scale(this.dpr, this.dpr)

    // Horizontal scanlines
    oCtx.fillStyle = "rgba(0, 0, 0, 0.24)"
    for (let y = 0; y < H; y += 4) {
      oCtx.fillRect(0, y, W, 1)
    }

    // CRT Bezel Radial Vignette
    const vignette = oCtx.createRadialGradient(
      W * 0.5, H * 0.5, Math.min(W, H) * 0.45,
      W * 0.5, H * 0.5, Math.max(W, H) * 0.72
    )
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)")
    vignette.addColorStop(0.7, "rgba(0, 0, 0, 0.28)")
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.78)")
    oCtx.fillStyle = vignette
    oCtx.fillRect(0, 0, W, H)
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

  initWorldNodes() {
    const seeds = [
      { r: 0.35, theta: 0.8 },
      { r: 0.65, theta: 1.6 },
      { r: 0.48, theta: 2.3 },
      { r: 0.82, theta: 2.9 },
      { r: 0.55, theta: 3.7 },
      { r: 0.72, theta: 4.4 },
      { r: 0.38, theta: 5.1 },
      { r: 0.78, theta: 5.9 },
    ]
    this.worldNodes = seeds.map((s, idx) => ({
      id: `NODE-${String(idx + 1).padStart(2, "0")}`,
      r: s.r,
      theta: s.theta,
      pulse: Math.random() * Math.PI * 2,
      isLocked: false,
      lockProgress: 0,
      hitCount: 0,
    }))
  }

  initErrorSystem() {
    const templates = [
      "ERROR::AUTH_GATEWAY_DENIED",
      "FATAL::KERNEL_PANIC_0x0028",
      "WARN::MEMORY_BUS_CORRUPTED",
      "ALERT::INTRUSION_SHIELD_FAIL",
      "FATAL::MISSILE_SILO_OVERHEAT",
      "ERROR::TCP_ROUTE_COLLAPSE",
      "SECURITY_LOCKDOWN_LEVEL_5",
      "EMERGENCY::CORE_OVERFLOW",
    ]

    this.errorStreams = Array.from({ length: 14 }, () => ({
      x: Math.random() * (this.width || 1200),
      y: Math.random() * (this.height || 800),
      speed: 120 + Math.random() * 180,
      text: templates[Math.floor(Math.random() * templates.length)],
      alpha: 0.3 + Math.random() * 0.6,
    }))

    const popupTemplates = [
      "AUTH_GATEWAY_DENIED",
      "KERNEL_PANIC_SIGNAL",
      "TRACE_ROUTE_COLLAPSE",
      "PAYLOAD_CORRUPTED",
      "SECURITY_LOCKDOWN",
      "REACTOR_SIGNAL_LOST",
    ]

    this.errorPopups = popupTemplates.map((code, index) => ({
      code,
      x: 60 + (index % 3) * 320,
      y: 120 + Math.floor(index / 3) * 160,
      w: 300,
      h: 84,
      jitterX: 0,
      jitterY: 0,
      respawnDelay: index * 0.3,
    }))
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
      { type: "type", text: "> INITIALIZING DEFENSE RADAR SECTOR 7... ACTIVE" },
      { type: "type", text: "> SCANNING GRID FOR UNIDENTIFIED HOSTILE TARGETS..." },
      { type: "cmd", text: "guest@cyber-nexus:~$ netstat -a --radar-telemetry" },
      { type: "instant", text: "TARGET SEARCH ACTIVE: 8 PERIMETER BEACONS LOCATED" },
      { type: "cmd", text: "guest@cyber-nexus:~$ run target-lock --auto-acquire" },
      { type: "instant", text: "LOCK SEQUENCE ENGAGED: SYNCHRONIZING WITH SILO 0-3" },
      { type: "instant", text: "[████████████████████████████████] 100% READY" },
      { type: "cmd", text: "guest@cyber-nexus:~$ arm-ordnance --all-missiles" },
      { type: "instant", text: "ORDNANCE ARMED: 8 HYPER-VELOCITY MISSILES READY" },
      { type: "instant", text: "SYSTEM ENGAGING AUTOMATIC COMBAT DEFENSE ROUTINE" },
    ]

    this.terminalLines = [
      "SYS://CYBER-NEXUS-8086 KERNEL RELEASE 4.19",
      "COPYRIGHT (C) 1984-1996 RETRO SYSTEMS CORP.",
      "----------------------------------------------------",
      "> BIOS POST: 640KB BASE RAM OK, EXT: 15360KB OK",
      "> MOUNTING ROOT VFS ON /dev/sda1 [READ/WRITE]... [OK]",
      "> INITIALIZING PARALLEL BUS CHIPSETS 8259A/8254... [OK]",
      "> INITIALIZING DEFENSE RADAR SECTOR 7... ACTIVE",
      "> SCANNING GRID FOR UNIDENTIFIED HOSTILE TARGETS...",
    ]
    this.scriptIndex = 8
    this.charIndex = 0
  }

  // ─── PHASE SWITCHING ────────────────────────────────────────────────

  setPhase(newPhase) {
    this.phase = newPhase
    this.phaseTimer = 0

    if (newPhase === "online") {
      this.terminalLines.push("> SYSTEM REBOOT COMPLETE. RESTORING STANDARD PROTOCOLS.")
      this.terminalLines.push("----------------------------------------------------")
      if (this.terminalLines.length > this.maxLines) this.terminalLines.splice(0, 3)
      this.worldNodes.forEach((node) => {
        node.isLocked = false
        node.lockProgress = 0
        node.hitCount = 0
      })
      this.missiles = []
      this.impactBursts = []
    } else if (newPhase === "missile") {
      this.terminalLines.push("> [ALERT]: MASS TARGET LOCK ACHIEVED ON ALL NODES!")
      this.terminalLines.push("> COMMENCING AUTOMATIC MISSILE DEFENSE BARRAGE...")
      this.terminalLines.push("> FIRING INTERCEPTOR MISSILES AT ACTIVE VECTORS!")
      if (this.terminalLines.length > this.maxLines) this.terminalLines.splice(0, 3)
      this.worldNodes.forEach((node) => {
        node.isLocked = true
        node.lockProgress = 1.0
      })
    } else if (newPhase === "error") {
      this.terminalLines.push("! CRITICAL SYSTEM BREACH DETECTED // MEMORY OVERFLOW")
      this.terminalLines.push("! KERNEL PANIC: PROCESS BUS OVERLOADED AT PORT 8086")
      this.terminalLines.push("! ENGAGING EMERGENCY SECURITY LOCKDOWN & REBOOT PROTOCOL")
      if (this.terminalLines.length > this.maxLines) this.terminalLines.splice(0, 3)
      this.errorPopups.forEach((popup) => {
        popup.x = Math.max(20, Math.random() * (this.width - popup.w - 40))
        popup.y = 80 + Math.random() * (this.height - popup.h - 160)
      })
    }
  }

  update(dt) {
    this.time += dt
    this.uptimeSeconds += dt
    this.tick += 1

    // Phase Timeline Advancement
    this.phaseTimer += dt
    const curDuration = this.phaseDurations[this.phase] || 15
    if (this.phaseTimer >= curDuration) {
      if (this.phase === "online") {
        this.setPhase("missile")
      } else if (this.phase === "missile") {
        this.setPhase("error")
      } else if (this.phase === "error") {
        this.setPhase("online")
      }
    }

    // Smooth mouse parallax
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05 * (dt * 60)
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05 * (dt * 60)

    // Cursor blink
    this.cursorBlink = (this.cursorBlink + dt * 2.5) % 1

    // Console Typing Script
    this.typeDelay -= dt
    if (this.typeDelay <= 0 && this.phase !== "error") {
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

    // Telemetry Jitter
    this.telemetryTick += dt
    if (this.telemetryTick > 0.8) {
      this.telemetryTick = 0
      this.cpuMeters.forEach((m) => {
        m.target = this.phase === "error" ? 85 + Math.floor(Math.random() * 15) : 35 + Math.floor(Math.random() * 50)
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

    // Radar Sweep Rotation
    this.radarAngle = (this.radarAngle + dt * (this.phase === "missile" ? 2.8 : 1.8)) % (Math.PI * 2)

    // Update Radar Target Locks
    this.worldNodes.forEach((node, idx) => {
      node.pulse += dt * 3
      let angleDiff = Math.abs(node.theta - this.radarAngle)
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff

      if (angleDiff < 0.3) {
        node.lockProgress = Math.min(1.0, node.lockProgress + dt * 1.5)
        if (node.lockProgress >= 0.95) {
          node.isLocked = true
          this.lockedNodeIndex = idx
        }
      }
    })

    // Missile Barrage Updates
    if (this.phase === "missile") {
      this.missileSpawnTimer -= dt
      if (this.missileSpawnTimer <= 0) {
        this.missileSpawnTimer = 0.38 + Math.random() * 0.25
        const targetNode = this.worldNodes[Math.floor(Math.random() * this.worldNodes.length)]
        if (targetNode) {
          this.missiles.push({
            target: targetNode,
            travel: 0,
            speed: 0.95 + Math.random() * 0.4,
          })
        }
      }
    }

    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i]
      m.travel += dt * m.speed
      if (m.travel >= 1.0) {
        // Trigger impact burst at target
        m.target.hitCount += 1
        this.impactBursts.push({
          target: m.target,
          radius: 4,
          maxRadius: 22,
          life: 1.0,
        })
        this.missiles.splice(i, 1)
      }
    }

    for (let i = this.impactBursts.length - 1; i >= 0; i--) {
      const b = this.impactBursts[i]
      b.life -= dt * 2.2
      b.radius += dt * 38
      if (b.life <= 0) this.impactBursts.splice(i, 1)
    }

    // Error Phase: Stream and Popup Updates
    if (this.phase === "error") {
      this.errorStreams.forEach((s) => {
        s.y += s.speed * dt
        if (s.y > this.height + 40) {
          s.y = -30
          s.x = Math.random() * this.width
        }
      })

      this.errorPopups.forEach((p) => {
        p.jitterX = (Math.random() - 0.5) * 3
        p.jitterY = (Math.random() - 0.5) * 3
      })
    }
  }

  draw() {
    const ctx = this.ctx
    if (!ctx) return

    const W = this.width
    const H = this.height

    ctx.save()

    // 1. Draw Pre-rendered Backdrop Buffer (Normal or Error Red Alert)
    if (this.phase === "error" && this.errorBgCanvas) {
      ctx.drawImage(this.errorBgCanvas, 0, 0, W, H)
    } else if (this.bgCanvas) {
      ctx.drawImage(this.bgCanvas, 0, 0, W, H)
    } else {
      ctx.fillStyle = this.phase === "error" ? "#140204" : "#04080a"
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

    const rightPanelW = isCompact ? 0 : Math.min(380, Math.max(280, contentW * 0.34))
    const leftPanelW = isCompact ? contentW : contentW - rightPanelW - 16
    const totalContentH = H - contentY - margin

    // 2. TOP SYSTEM HEADER
    this._drawSystemHeader(margin, margin, contentW, headerH)

    // 3. MAIN CONSOLE PANEL (LEFT)
    this._drawMainConsole(margin, contentY, leftPanelW, totalContentH)

    // 4. RIGHT TELEMETRY, HEX MATRIX & TACTICAL MISSILE RADAR
    if (!isCompact) {
      const rightX = margin + leftPanelW + 16
      const panelGap = 12
      const telemH = Math.min(170, totalContentH * 0.28)
      const hexH = Math.min(180, totalContentH * 0.30)
      const radarH = Math.max(160, totalContentH - telemH - hexH - panelGap * 2)

      this._drawTelemetryPanel(rightX, contentY, rightPanelW, telemH)
      this._drawHexMatrixPanel(rightX, contentY + telemH + panelGap, rightPanelW, hexH)
      this._drawRadarPanel(rightX, contentY + telemH + hexH + panelGap * 2, rightPanelW, radarH)
    }

    // 5. ERROR STREAMS & POPUPS (DURING ERROR PHASE)
    if (this.phase === "error") {
      this._drawErrorOverlay(W, H)
    }

    ctx.restore()

    // 6. Draw Pre-rendered CRT Scanlines & Bezel Vignette Buffer
    if (this.overlayCanvas) {
      ctx.drawImage(this.overlayCanvas, 0, 0, W, H)
    }
  }

  // ─── 8-BIT BOX DRAWING HELPER ───────────────────────────────────────

  _draw8BitBox(x, y, w, h, title = "", cachedWidth = 0, isDanger = false) {
    const ctx = this.ctx
    const pal = this.palette

    ctx.fillStyle = isDanger ? "rgba(28, 4, 6, 0.88)" : "rgba(4, 12, 14, 0.82)"
    ctx.fillRect(x, y, w, h)

    ctx.strokeStyle = isDanger ? "rgba(255, 60, 60, 0.85)" : pal.border
    ctx.lineWidth = 1
    ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, Math.floor(w), Math.floor(h))

    const tick = 6
    ctx.strokeStyle = isDanger ? "rgba(255, 120, 120, 0.95)" : pal.borderTick
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, y + tick); ctx.lineTo(x, y); ctx.lineTo(x + tick, y)
    ctx.moveTo(x + w - tick, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + tick)
    ctx.moveTo(x, y + h - tick); ctx.lineTo(x, y + h); ctx.lineTo(x + tick, y + h)
    ctx.moveTo(x + w - tick, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - tick)
    ctx.stroke()

    if (title) {
      ctx.font = "bold 11px 'Courier New', Monaco, monospace"
      const titleText = `[ ${title} ]`
      const tw = cachedWidth || (titleText.length * 7 + 8)
      ctx.fillStyle = isDanger ? "#120204" : "#04080a"
      ctx.fillRect(x + 14, y - 6, tw + 8, 12)
      ctx.fillStyle = isDanger ? "rgba(255, 160, 160, 0.98)" : pal.high
      ctx.fillText(titleText, x + 18, y + 4)
    }
  }

  // ─── 1. TOP HEADER ──────────────────────────────────────────────────

  _drawSystemHeader(x, y, w, h) {
    const ctx = this.ctx
    const pal = this.palette
    const isError = this.phase === "error"
    const isMissile = this.phase === "missile"

    this._draw8BitBox(x, y, w, h, "", 0, isError)

    ctx.save()
    ctx.font = "bold 12px 'Courier New', Monaco, monospace"

    // Left brand status
    if (isError) {
      ctx.fillStyle = "rgba(255, 80, 80, 0.98)"
      ctx.fillText("SYS://CRITICAL-FAILURE [KERNEL PANIC 0x0028]", x + 14, y + 21)
    } else if (isMissile) {
      ctx.fillStyle = "rgba(255, 200, 80, 0.98)"
      ctx.fillText("SYS://COMBAT-DEFENSE [MISSILE SILO ARMED]", x + 14, y + 21)
    } else {
      ctx.fillStyle = pal.full
      ctx.fillText("SYS://RETRO-TERMINAL-8086 [ONLINE]", x + 14, y + 21)
    }

    // Center Uptime
    const hrs = Math.floor(this.uptimeSeconds / 3600).toString().padStart(2, "0")
    const mins = Math.floor((this.uptimeSeconds % 3600) / 60).toString().padStart(2, "0")
    const secs = Math.floor(this.uptimeSeconds % 60).toString().padStart(2, "0")
    ctx.fillStyle = isError ? "rgba(255, 120, 120, 0.75)" : pal.mid
    if (w > 640) {
      ctx.fillText(`UPTIME: ${hrs}:${mins}:${secs}`, x + w * 0.44, y + 21)
    }

    // Right status badge
    if (isError) {
      ctx.fillStyle = "rgba(255, 90, 90, 0.95)"
      const sw = this.textWidths.statusError || 160
      ctx.fillText("CRITICAL ERROR [PANIC]", x + w - sw - 14, y + 21)
    } else if (isMissile) {
      ctx.fillStyle = "rgba(255, 210, 90, 0.95)"
      const sw = this.textWidths.statusMissile || 180
      ctx.fillText("MISSILE BARRAGE [ACTIVE]", x + w - sw - 14, y + 21)
    } else {
      ctx.fillStyle = pal.high
      const sw = this.textWidths.status || 135
      ctx.fillText("9600 BAUD [ONLINE]", x + w - sw - 14, y + 21)
    }

    ctx.restore()
  }

  // ─── 2. MAIN CONSOLE ────────────────────────────────────────────────

  _drawMainConsole(x, y, w, h) {
    const ctx = this.ctx
    const pal = this.palette
    const isError = this.phase === "error"
    this._draw8BitBox(x, y, w, h, "CONSOLE LOG // DEV-0", this.textWidths.titleConsole, isError)

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

      if (isError || line.startsWith("!")) {
        ctx.fillStyle = "rgba(255, 100, 100, 0.95)"
      } else if (line.startsWith("> [ALERT]") || line.startsWith("> COMMENCING")) {
        ctx.fillStyle = "rgba(255, 210, 80, 0.98)"
      } else if (line.startsWith("SYS:") || line.startsWith("COPYRIGHT")) {
        ctx.fillStyle = pal.dim
      } else if (line.startsWith(">")) {
        ctx.fillStyle = pal.text
      } else if (line.startsWith("guest@")) {
        ctx.fillStyle = pal.full
      } else if (line.includes("[OK]") || line.includes("COMPLETE") || line.includes("READY")) {
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
    ctx.strokeStyle = isError ? "rgba(255, 80, 80, 0.3)" : pal.faint
    ctx.beginPath()
    ctx.moveTo(x + 12, bottomPromptY - 14)
    ctx.lineTo(x + w - 12, bottomPromptY - 14)
    ctx.stroke()

    ctx.font = "bold 12px 'Courier New', Monaco, monospace"
    ctx.fillStyle = isError ? "rgba(255, 110, 110, 0.95)" : pal.high
    const promptText = isError ? "root@panic-mode:# " : "guest@cyber-nexus:~$ "
    ctx.fillText(promptText, x + paddingX, bottomPromptY)

    // Blinking Block Cursor █
    if (this.cursorBlink > 0.5) {
      const pw = this.textWidths.prompt || 155
      ctx.fillStyle = isError ? "rgba(255, 120, 120, 1.0)" : pal.full
      ctx.fillRect(x + paddingX + pw + 2, bottomPromptY - 10, 8, 12)
    }

    ctx.restore()
  }

  // ─── 3. TELEMETRY PANEL ─────────────────────────────────────────────

  _drawTelemetryPanel(x, y, w, h) {
    const ctx = this.ctx
    const pal = this.palette
    const isError = this.phase === "error"
    this._draw8BitBox(x, y, w, h, "SYSTEM TELEMETRY", this.textWidths.titleTelem, isError)

    ctx.save()
    const paddingX = 14
    const startY = y + 28
    const rowH = 24

    ctx.font = "11px 'Courier New', Monaco, monospace"

    this.cpuMeters.forEach((m, idx) => {
      const rowY = startY + idx * rowH
      if (rowY > y + h - 10) return

      ctx.fillStyle = isError ? "rgba(255, 140, 140, 0.9)" : pal.text
      ctx.fillText(m.name.padEnd(6, " "), x + paddingX, rowY + 9)

      const barX = x + paddingX + 56
      const barW = Math.max(70, w - paddingX * 2 - 105)
      const barH = 10
      const pct = Math.max(0, Math.min(100, Math.round(m.val)))

      ctx.strokeStyle = isError ? "rgba(255, 80, 80, 0.4)" : pal.dim
      ctx.strokeRect(barX, rowY, barW, barH)

      const fillW = Math.round((barW - 2) * (pct / 100))
      ctx.fillStyle = isError ? "rgba(255, 80, 80, 0.88)" : pal.text
      ctx.fillRect(barX + 1, rowY + 1, fillW, barH - 2)

      ctx.fillStyle = isError ? "rgba(255, 180, 180, 0.95)" : pal.high
      ctx.fillText(`${pct}%`.padStart(4, " "), barX + barW + 8, rowY + 9)
    })

    ctx.fillStyle = isError ? "rgba(255, 120, 120, 0.7)" : pal.dim
    ctx.fillText(
      isError ? "REACTOR OVERHEAT: 98.4°C // WARN" : "CORE TEMP: 41.6°C // FAN: 2800 RPM",
      x + paddingX,
      y + h - 12
    )

    ctx.restore()
  }

  // ─── 4. HEX MATRIX PANEL ────────────────────────────────────────────

  _drawHexMatrixPanel(x, y, w, h) {
    const ctx = this.ctx
    const pal = this.palette
    const isError = this.phase === "error"
    this._draw8BitBox(x, y, w, h, "ACTIVE MEMORY DUMP", this.textWidths.titleHex, isError)

    ctx.save()
    const paddingX = 14
    const startY = y + 28
    const rowH = 20

    ctx.font = "11px 'Courier New', Monaco, monospace"

    this.hexRows.forEach((row, idx) => {
      const rowY = startY + idx * rowH
      if (rowY > y + h - 12) return

      ctx.fillStyle = isError ? "rgba(255, 160, 160, 0.95)" : pal.high
      ctx.fillText(`0x${row.addr}:`, x + paddingX, rowY)

      ctx.fillStyle = isError ? "rgba(255, 90, 90, 0.78)" : pal.mid
      const hexStr = row.bytes.slice(0, Math.min(8, Math.floor((w - 90) / 24))).join(" ")
      ctx.fillText(hexStr, x + paddingX + 54, rowY)
    })

    ctx.restore()
  }

  // ─── 5. 8-BIT VECTOR RADAR WITH TARGET LOCK & MISSILES ──────────────

  _drawRadarPanel(x, y, w, h) {
    const ctx = this.ctx
    const pal = this.palette
    const isError = this.phase === "error"
    const isMissile = this.phase === "missile"

    this._draw8BitBox(x, y, w, h, "TACTICAL RADAR // DEF-NET", this.textWidths.titleRadar, isError)

    ctx.save()
    const cx = x + w / 2
    const cy = y + h / 2 + 6
    const radius = Math.max(20, Math.min(w * 0.38, (h - 32) * 0.42))

    // Radar concentric rings
    ctx.strokeStyle = isError ? "rgba(255, 60, 60, 0.3)" : pal.dim
    ctx.lineWidth = 1
    for (let r = radius * 0.33; r <= radius; r += radius * 0.33) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Crosshairs
    ctx.beginPath()
    ctx.moveTo(cx - radius - 4, cy); ctx.lineTo(cx + radius + 4, cy)
    ctx.moveTo(cx, cy - radius - 4); ctx.lineTo(cx, cy + radius + 4)
    ctx.stroke()

    // Rotating Radar Sweep Beam
    const sx = cx + Math.cos(this.radarAngle) * radius
    const sy = cy + Math.sin(this.radarAngle) * radius
    ctx.strokeStyle = isError ? "rgba(255, 90, 90, 0.9)" : isMissile ? "rgba(255, 200, 60, 0.95)" : pal.high
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(cx, cy); ctx.lineTo(sx, sy)
    ctx.stroke()

    // Sweep tail
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, this.radarAngle - 0.45, this.radarAngle)
    ctx.closePath()
    ctx.fillStyle = isError ? "rgba(255, 40, 40, 0.16)" : isMissile ? "rgba(255, 180, 40, 0.15)" : pal.radarTail
    ctx.fill()

    // DRAW WORLD NODES & TARGET LOCKS
    this.worldNodes.forEach((node) => {
      const nx = cx + Math.cos(node.theta) * (radius * node.r)
      const ny = cy + Math.sin(node.theta) * (radius * node.r)

      if (node.isLocked || isMissile) {
        // Red locked target with crosshairs
        const pulse = (Math.sin(node.pulse) + 1) * 0.5
        const lockSize = 7 + pulse * 3

        ctx.strokeStyle = "rgba(255, 80, 80, 0.95)"
        ctx.lineWidth = 1.2
        ctx.strokeRect(nx - lockSize / 2, ny - lockSize / 2, lockSize, lockSize)

        // Lock corner crosshair brackets
        ctx.beginPath()
        ctx.moveTo(nx - lockSize, ny); ctx.lineTo(nx + lockSize, ny)
        ctx.moveTo(nx, ny - lockSize); ctx.lineTo(nx, ny + lockSize)
        ctx.stroke()

        ctx.fillStyle = "rgba(255, 120, 120, 0.98)"
        ctx.fillRect(nx - 2, ny - 2, 4, 4)

        // Target label
        ctx.font = "9px 'Courier New', Monaco, monospace"
        ctx.fillStyle = "rgba(255, 180, 180, 0.95)"
        ctx.fillText(node.id, nx + 6, ny - 4)
      } else {
        // Standard blip
        const alpha = 0.4 + (Math.sin(node.pulse) + 1) * 0.25
        ctx.fillStyle = isError ? `rgba(255, 80, 80, ${alpha})` : `rgba(${this._cachedRGB.r}, ${this._cachedRGB.g}, ${this._cachedRGB.b}, ${alpha})`
        ctx.fillRect(nx - 2, ny - 2, 4, 4)
      }
    })

    // DRAW ACTIVE MISSILE TRAJECTORIES
    this.missiles.forEach((m) => {
      const tx = cx + Math.cos(m.target.theta) * (radius * m.target.r)
      const ty = cy + Math.sin(m.target.theta) * (radius * m.target.r)
      const mx = cx + (tx - cx) * m.travel
      const my = cy + (ty - cy) * m.travel

      // Glowing missile trail line
      ctx.strokeStyle = "rgba(255, 180, 70, 0.85)"
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(mx, my)
      ctx.stroke()

      // Missile projectile head rotated toward target
      const angle = Math.atan2(ty - cy, tx - cx)
      ctx.save()
      ctx.translate(mx, my)
      ctx.rotate(angle)

      ctx.fillStyle = "rgba(255, 240, 140, 1.0)"
      ctx.fillRect(-2, -1.5, 6, 3)
      ctx.fillStyle = "rgba(255, 70, 70, 0.95)"
      ctx.fillRect(-4, -1, 3, 2)
      ctx.restore()
    })

    // DRAW IMPACT EXPLOSION BURSTS
    this.impactBursts.forEach((b) => {
      const tx = cx + Math.cos(b.target.theta) * (radius * b.target.r)
      const ty = cy + Math.sin(b.target.theta) * (radius * b.target.r)

      ctx.strokeStyle = `rgba(255, 90, 90, ${Math.max(0, b.life)})`
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.arc(tx, ty, b.radius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = `rgba(255, 200, 100, ${Math.max(0, b.life * 0.7)})`
      ctx.fillRect(tx - 3, ty - 3, 6, 6)
    })

    // Radar bottom status banner
    ctx.font = "10px 'Courier New', Monaco, monospace"
    if (isMissile) {
      ctx.fillStyle = "rgba(255, 200, 80, 0.98)"
      ctx.fillText("STATUS: MISSILE DEPLOYMENT IN PROGRESS", x + 14, y + h - 10)
    } else if (isError) {
      ctx.fillStyle = "rgba(255, 100, 100, 0.95)"
      ctx.fillText("STATUS: DEFENSE RADAR JAMMED // OVERRIDE", x + 14, y + h - 10)
    } else {
      const lockedCount = this.worldNodes.filter((n) => n.isLocked).length
      ctx.fillStyle = pal.mid
      ctx.fillText(`RADAR LOCK: ${lockedCount}/${this.worldNodes.length} ACQUIRED`, x + 14, y + h - 10)
    }

    ctx.restore()
  }

  // ─── 6. ERROR OVERLAY WITH FALLING STREAMS & GLITCH POPUPS ──────────

  _drawErrorOverlay(W, H) {
    const ctx = this.ctx
    ctx.save()

    // Danger banner
    const bannerH = 64
    const bannerY = Math.max(20, H * 0.12)
    ctx.fillStyle = "rgba(180, 15, 20, 0.85)"
    ctx.fillRect(0, bannerY, W, bannerH)
    ctx.strokeStyle = "rgba(255, 120, 120, 0.95)"
    ctx.lineWidth = 2
    ctx.strokeRect(0, bannerY, W, bannerH)

    const title = "SYSTEM FAILURE // SECURITY LOCKDOWN LEVEL-5"
    ctx.font = "bold 18px 'Courier New', Monaco, monospace"
    ctx.fillStyle = "#ffffff"
    const tw = ctx.measureText(title).width
    ctx.fillText(title, (W - tw) / 2, bannerY + 28)

    const recoveryPct = Math.min(100, Math.floor((this.phaseTimer / this.phaseDurations.error) * 100))
    const sub = `AUTO-RECOVERY ROUTINE: REBOOTING KERNEL BUS... [${recoveryPct}%]`
    ctx.font = "12px 'Courier New', Monaco, monospace"
    ctx.fillStyle = "rgba(255, 220, 220, 0.95)"
    const sw = ctx.measureText(sub).width
    ctx.fillText(sub, (W - sw) / 2, bannerY + 48)

    // Falling Matrix Error Streams
    ctx.font = "11px 'Courier New', Monaco, monospace"
    this.errorStreams.forEach((s) => {
      ctx.fillStyle = `rgba(255, 90, 90, ${s.alpha})`
      ctx.fillText(s.text, s.x, s.y)
    })

    // Classic 8-Bit Error Popups
    this.errorPopups.forEach((p, idx) => {
      const px = p.x + p.jitterX
      const py = p.y + p.jitterY

      // Box
      ctx.fillStyle = "rgba(25, 4, 6, 0.94)"
      ctx.fillRect(px, py, p.w, p.h)
      ctx.strokeStyle = "rgba(255, 80, 80, 0.9)"
      ctx.lineWidth = 1.4
      ctx.strokeRect(px, py, p.w, p.h)

      // Title bar
      ctx.fillStyle = "rgba(200, 30, 40, 0.95)"
      ctx.fillRect(px + 1, py + 1, p.w - 2, 20)
      ctx.font = "bold 10px 'Courier New', Monaco, monospace"
      ctx.fillStyle = "#ffffff"
      ctx.fillText(`[ ! ] ALERT DIALOG #${idx + 1}`, px + 8, py + 14)

      // Error code
      ctx.font = "11px 'Courier New', Monaco, monospace"
      ctx.fillStyle = "rgba(255, 140, 140, 0.95)"
      ctx.fillText(`ERROR::${p.code}`, px + 10, py + 38)

      // Progress / Recovery Bar
      const meterW = p.w - 20
      const meterFill = ((this.tick * 2 + idx * 25) % 100) / 100
      ctx.fillStyle = "rgba(60, 10, 12, 0.85)"
      ctx.fillRect(px + 10, py + 48, meterW, 10)
      ctx.fillStyle = "rgba(255, 70, 70, 0.92)"
      ctx.fillRect(px + 10, py + 48, meterW * meterFill, 10)

      ctx.fillStyle = "rgba(255, 200, 200, 0.85)"
      ctx.font = "9px 'Courier New', Monaco, monospace"
      ctx.fillText("CORRUPTED MEMORY CHUNK OVERFLOW", px + 10, py + 72)
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

    this.bgCanvas = null
    this.errorBgCanvas = null
    this.overlayCanvas = null
  }
}
