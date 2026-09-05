/**
 * Retro Terminal (CRT Monitor) Animation Engine
 *
 * Supports two authentic selectable modes:
 *  1. "mainframe" (Default - 8-Bit Cyber Mainframe HD Engine)
 *     - Clean fullscreen cyber workstation with real-time command typing shell,
 *       telemetry CPU/RAM meters, hex memory dump, and tactical vector radar.
 *     - 8-bit notched boxes, phosphor borders, corner tick accents, title cutout tags.
 *  2. "classic" (Original version - Multi-Window CRT Desktop)
 *     - Retro multi-window desktop layout: SYS://BREACH-CORE, MONITOR://AUTH-BYPASS, TRACE://PAYLOAD-LOG.
 *     - Starfield and floating pixel dust backdrop.
 *     - 4-Phase cycle: loading -> payload burst streams -> system malfunction popups -> access granted skull & auto launch.
 */

// ══════════════════════════════════════════════════════════════════════
// 1. MAINFRAME HD ENGINE (8-Bit Cyber Mainframe HD)
// ══════════════════════════════════════════════════════════════════════

class MainframeEngine {
  constructor(canvas, ctx, color = "#63f5ff") {
    this.canvas = canvas
    this.ctx = ctx
    this.color = color || "#63f5ff"
    this._cachedRGB = this._parseHex(this.color)
    this._buildPalette()

    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.time = 0
    this.uptimeSeconds = 15243
    this.cursorBlink = 0
    this.tick = 0

    // Lifecycle Phase Cycle: boot -> online -> missile -> error -> boot
    this.phase = "online"
    this.phaseTimer = 0
    this.phaseDurations = {
      boot: 4.5,
      online: 22,
      missile: 10,
      error: 9,
    }
    this.bootProgress = 1

    // Buffers
    this.bgCanvas = null
    this.bgCtx = null
    this.errorBgCanvas = null
    this.errorBgCtx = null
    this.overlayCanvas = null
    this.overlayCtx = null
    this.textWidths = {}

    // Interactive User Input & Shell
    this.userInput = ""
    this.commandHistory = []
    this.historyIndex = -1
    this.isUserInteracting = false
    this.userIdleTimer = 0

    // Automated Script Typing Machine (runs when user is not typing)
    this.terminalLines = []
    this.maxLines = 22
    this.scriptIndex = 0
    this.charIndex = 0
    this.typeDelay = 0

    // Telemetry Gauges
    this.cpuMeters = [
      { name: "CPU_0", val: 52, target: 52 },
      { name: "CPU_1", val: 68, target: 68 },
      { name: "RAM", val: 74, target: 74 },
      { name: "VRAM", val: 42, target: 42 },
    ]
    this.telemetryTick = 0
    this.netHistory = Array.from({ length: 22 }, () => 30 + Math.random() * 20)

    // Hex Memory Rows
    this.hexRows = []
    this.initHexMatrix()

    // 8-Bit Tactical Vector Radar & Defense Nodes
    this.radarAngle = 0
    this.radarSpeed = 1.8
    this.worldNodes = []
    this.missiles = []
    this.impactBursts = []
    this.initWorldNodes()

    // Error / Panic Alert System
    this.errorStreams = []
    this.errorPopups = []
    this.initErrorSystem()

    this.initTerminalScript()
    this.resize()
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

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.maxLines = Math.max(12, Math.floor((this.height - 180) / 22))

    // Pre-calculate Offscreen Buffers once
    this._buildBackgroundBuffers()
    this._buildOverlayBuffer()
    this._cacheTextMetrics()
  }

  _cacheTextMetrics() {
    if (!this.ctx) return
    this.ctx.save()
    this.ctx.font = "bold 12px 'Courier New', Monaco, monospace"
    this.textWidths.status = this.ctx.measureText("9600 BAUD [ONLINE]").width
    this.textWidths.statusBoot = this.ctx.measureText("BIOS BOOT [POST]").width
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

    // Normal Phosphor Backdrop Buffer
    if (!this.bgCanvas) this.bgCanvas = document.createElement("canvas")
    this.bgCanvas.width = Math.round(W * this.dpr)
    this.bgCanvas.height = Math.round(H * this.dpr)
    this.bgCtx = this.bgCanvas.getContext("2d")
    if (this.bgCtx) {
      this.bgCtx.setTransform(1, 0, 0, 1, 0, 0)
      this.bgCtx.scale(this.dpr, this.dpr)
      this.bgCtx.fillStyle = "#04080a"
      this.bgCtx.fillRect(0, 0, W, H)

      const { r, g, b } = this._cachedRGB
      const bgGlow = this.bgCtx.createRadialGradient(
        W * 0.5, H * 0.45, 10,
        W * 0.5, H * 0.5, Math.max(W, H) * 0.75
      )
      bgGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.08)`)
      bgGlow.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.02)`)
      bgGlow.addColorStop(1, "rgba(0, 0, 0, 0.85)")
      this.bgCtx.fillStyle = bgGlow
      this.bgCtx.fillRect(0, 0, W, H)
    }

    // Critical Error Red Phosphor Backdrop Buffer
    if (!this.errorBgCanvas) this.errorBgCanvas = document.createElement("canvas")
    this.errorBgCanvas.width = Math.round(W * this.dpr)
    this.errorBgCanvas.height = Math.round(H * this.dpr)
    this.errorBgCtx = this.errorBgCanvas.getContext("2d")
    if (this.errorBgCtx) {
      this.errorBgCtx.setTransform(1, 0, 0, 1, 0, 0)
      this.errorBgCtx.scale(this.dpr, this.dpr)
      this.errorBgCtx.fillStyle = "#120204"
      this.errorBgCtx.fillRect(0, 0, W, H)

      const errGlow = this.errorBgCtx.createRadialGradient(
        W * 0.5, H * 0.45, 10,
        W * 0.5, H * 0.5, Math.max(W, H) * 0.75
      )
      errGlow.addColorStop(0, "rgba(255, 40, 40, 0.20)")
      errGlow.addColorStop(0.5, "rgba(180, 10, 10, 0.10)")
      errGlow.addColorStop(1, "rgba(20, 0, 0, 0.90)")
      this.errorBgCtx.fillStyle = errGlow
      this.errorBgCtx.fillRect(0, 0, W, H)
    }
  }

  _buildOverlayBuffer() {
    const W = this.width
    const H = this.height
    if (!W || !H) return

    if (!this.overlayCanvas) this.overlayCanvas = document.createElement("canvas")
    this.overlayCanvas.width = Math.round(W * this.dpr)
    this.overlayCanvas.height = Math.round(H * this.dpr)
    this.overlayCtx = this.overlayCanvas.getContext("2d")
    if (!this.overlayCtx) return

    this.overlayCtx.setTransform(1, 0, 0, 1, 0, 0)
    this.overlayCtx.scale(this.dpr, this.dpr)

    // Horizontal scanlines
    this.overlayCtx.fillStyle = "rgba(0, 0, 0, 0.24)"
    for (let y = 0; y < H; y += 4) {
      this.overlayCtx.fillRect(0, y, W, 1)
    }

    // CRT Bezel Radial Vignette
    const vignette = this.overlayCtx.createRadialGradient(
      W * 0.5, H * 0.5, Math.min(W, H) * 0.45,
      W * 0.5, H * 0.5, Math.max(W, H) * 0.72
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

  initWorldNodes() {
    const seeds = [
      { r: 0.35, theta: 0.8, id: "TRK-01", dist: "4.2KM", threat: "HIGH" },
      { r: 0.65, theta: 1.6, id: "TRK-02", dist: "11.8KM", threat: "MED" },
      { r: 0.48, theta: 2.3, id: "TRK-03", dist: "7.5KM", threat: "HIGH" },
      { r: 0.82, theta: 2.9, id: "TRK-04", dist: "16.4KM", threat: "LOW" },
      { r: 0.55, theta: 3.7, id: "TRK-05", dist: "9.1KM", threat: "HIGH" },
      { r: 0.72, theta: 4.4, id: "TRK-06", dist: "13.6KM", threat: "MED" },
      { r: 0.38, theta: 5.1, id: "TRK-07", dist: "5.3KM", threat: "LOCK" },
      { r: 0.78, theta: 5.9, id: "TRK-08", dist: "14.9KM", threat: "HIGH" },
    ]
    this.worldNodes = seeds.map((s) => ({
      id: s.id,
      dist: s.dist,
      threat: s.threat,
      r: s.r,
      theta: s.theta,
      pulse: Math.random() * Math.PI * 2,
      isLocked: false,
      lockProgress: 0,
      hitCount: 0,
    }))
    this.radarRipples = []
    this.reconDrones = [
      { angle: 0.2, speed: 0.35, dist: 0.9 },
      { angle: 3.4, speed: -0.25, dist: 0.62 },
    ]
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

    this.errorPopups = popupTemplates.map((code) => ({
      code,
      jitterX: 0,
      jitterY: 0,
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
      { type: "type", text: "> ESTABLISHING TCP/IP HANDSHAKE WITH REMOTE GATEWAY" },
      { type: "type", text: "> ALL SUBSYSTEMS NOMINAL. STARTING DAEMON PROCESSES" },
      { type: "instant", text: "----------------------------------------------------" },
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
      "> DETECTING DISPLAY ADAPTER: CRT MONOCHROME P4... [OK]",
      "> PROBING ETHERNET TRANSCEIVER 10BASE-T... CONNECTED",
      "> ESTABLISHING TCP/IP HANDSHAKE WITH REMOTE GATEWAY",
    ]
    this.scriptIndex = 9
    this.charIndex = 0
    this.typeDelay = 0
  }

  // ─── USER INTERACTION / KEYBOARD INPUT ──────────────────────────────

  handleKeyDown(e) {
    if (e.key === "Backspace") {
      e.preventDefault()
      this.userInput = this.userInput.slice(0, -1)
      this.isUserInteracting = true
      this.userIdleTimer = 0
      return
    }

    if (e.key === "Escape") {
      this.userInput = ""
      this.historyIndex = -1
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (this.commandHistory.length > 0) {
        if (this.historyIndex === -1) {
          this.historyIndex = this.commandHistory.length - 1
        } else if (this.historyIndex > 0) {
          this.historyIndex--
        }
        this.userInput = this.commandHistory[this.historyIndex] || ""
        this.isUserInteracting = true
        this.userIdleTimer = 0
      }
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (this.commandHistory.length > 0 && this.historyIndex !== -1) {
        if (this.historyIndex < this.commandHistory.length - 1) {
          this.historyIndex++
          this.userInput = this.commandHistory[this.historyIndex] || ""
        } else {
          this.historyIndex = -1
          this.userInput = ""
        }
        this.isUserInteracting = true
        this.userIdleTimer = 0
      }
      return
    }

    if (e.key === "Enter") {
      e.preventDefault()
      const cmd = this.userInput
      this.userInput = ""
      this.historyIndex = -1
      this.isUserInteracting = true
      this.userIdleTimer = 0
      this.executeCommand(cmd)
      return
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      this.userInput += e.key
      this.isUserInteracting = true
      this.userIdleTimer = 0
    }
  }

  executeCommand(rawCmd) {
    const cmd = rawCmd.trim()
    if (!cmd) return

    this.commandHistory.push(cmd)
    if (this.commandHistory.length > 50) this.commandHistory.shift()

    this.terminalLines.push(`guest@cyber-nexus:~$ ${cmd}`)
    if (this.terminalLines.length > this.maxLines) this.terminalLines.shift()

    const parts = cmd.toLowerCase().split(/\s+/)
    const action = parts[0]
    const arg = parts.slice(1).join(" ")

    switch (action) {
      case "help":
        this.terminalLines.push("AVAILABLE COMMANDS:")
        this.terminalLines.push("  help          - Display available terminal commands")
        this.terminalLines.push("  clear / cls   - Clear console screen buffer")
        this.terminalLines.push("  reboot / boot - Trigger kernel bootloader sequence")
        this.terminalLines.push("  radar / scan  - Accelerate tactical perimeter radar")
        this.terminalLines.push("  lock / target - Lock all detected sector targets")
        this.terminalLines.push("  fire / launch - Deploy defense missile barrage")
        this.terminalLines.push("  panic / error - Trigger critical system intrusion alert")
        this.terminalLines.push("  status        - Print CPU/RAM telemetry diagnostics")
        this.terminalLines.push("  matrix        - Refresh active memory hex dump")
        this.terminalLines.push("  whoami        - Display authorization credentials")
        this.terminalLines.push("  ping <host>   - Test network ICMP round-trip latency")
        this.terminalLines.push("  echo <text>   - Echo text message to console")
        break

      case "clear":
      case "cls":
        this.terminalLines = []
        break

      case "reboot":
      case "boot":
      case "restart":
        this.phase = "boot"
        this.phaseTimer = 0
        this.bootProgress = 0
        this.terminalLines.push("> INITIATING BIOS KERNEL REBOOT...")
        break

      case "panic":
      case "error":
      case "alert":
        this.phase = "error"
        this.phaseTimer = 0
        this.initErrorSystem()
        this.terminalLines.push("FATAL::MANUAL_PANIC_OVERRIDE_ENGAGED")
        break

      case "radar":
      case "scan":
        this.radarSpeed = 3.5
        this.terminalLines.push("> RADAR SWEEP ACCELERATED [3.5 RAD/S]")
        this.terminalLines.push("  8 PERIMETER BEACONS LOCATED IN SECTOR 7")
        break

      case "lock":
      case "target":
        this.phase = "missile"
        this.phaseTimer = 0
        this.worldNodes.forEach((n) => {
          n.isLocked = true
          n.lockProgress = 1
        })
        this.terminalLines.push("> TARGET ACQUISITION COMPLETE: 8 NODES LOCKED")
        break

      case "fire":
      case "launch":
      case "missile":
        this.phase = "missile"
        this.phaseTimer = 0
        this.worldNodes.forEach((n) => {
          n.isLocked = true
          n.lockProgress = 1
        })
        this._launchAllMissiles()
        this.terminalLines.push("> MISSILE BARRAGE DEPLOYED: 8 ORDNANCE IN FLIGHT")
        break

      case "status":
        this.terminalLines.push("─── SYSTEM TELEMETRY REPORT ───")
        this.terminalLines.push(
          `CPU_0: ${Math.round(this.cpuMeters[0].val)}% | CPU_1: ${Math.round(this.cpuMeters[1].val)}% | RAM: ${Math.round(this.cpuMeters[2].val)}%`
        )
        this.terminalLines.push("KERNEL: 4.19-CYBER-8086 | BUS: 9600 BAUD | STATUS: OK")
        break

      case "matrix":
      case "dump":
        this.initHexMatrix()
        this.terminalLines.push("> ACTIVE MEMORY MATRIX REFRESHED [6 SEGMENTS]")
        break

      case "whoami":
        this.terminalLines.push("guest [AUTH_LEVEL: ROOT_OPERATOR (DEV-0)]")
        break

      case "ping": {
        const host = arg || "mainframe.gateway.net"
        this.terminalLines.push(`PING ${host} (10.0.4.1): 56 data bytes`)
        this.terminalLines.push("64 bytes from 10.0.4.1: icmp_seq=1 ttl=64 time=1.42 ms")
        this.terminalLines.push("64 bytes from 10.0.4.1: icmp_seq=2 ttl=64 time=1.38 ms")
        this.terminalLines.push(`--- ${host} ping statistics: 0% loss, rtt avg = 1.40ms`)
        break
      }

      case "echo":
        this.terminalLines.push(arg || "")
        break

      default:
        this.terminalLines.push(`bash: ${cmd}: command not found. Type 'help' for commands.`)
        break
    }

    while (this.terminalLines.length > this.maxLines) {
      this.terminalLines.shift()
    }
  }

  _launchAllMissiles() {
    this.missiles = []
    this.impactBursts = []
    this.worldNodes.forEach((targetNode) => {
      this.missiles.push({
        x: 0.5,
        y: 0.5,
        target: targetNode,
        progress: 0,
        speed: 0.55 + Math.random() * 0.45,
      })
      targetNode.hitCount++
    })
  }

  // ─── UPDATE LOOP ────────────────────────────────────────────────────

  update(dt) {
    this.time += dt
    this.uptimeSeconds += dt
    this.tick += 1
    this.phaseTimer += dt

    if (this.isUserInteracting) {
      this.userIdleTimer += dt
      if (this.userIdleTimer > 15) {
        this.isUserInteracting = false
      }
    }

    this.cursorBlink = (this.time * 2.8) % 1 > 0.5 ? 1 : 0

    // Automatic Phase Transition Cycle
    const curPhaseLimit = this.phaseDurations[this.phase] || 18
    if (this.phaseTimer >= curPhaseLimit) {
      this.phaseTimer = 0
      if (this.phase === "boot") {
        this.phase = "online"
        this.terminalLines.push("> BOOT SEQUENCE COMPLETE. 9600 BAUD LINK ESTABLISHED.")
        if (this.terminalLines.length > this.maxLines) this.terminalLines.shift()
      } else if (this.phase === "online") {
        this.phase = "missile"
        this.worldNodes.forEach((n) => {
          n.isLocked = true
          n.lockProgress = 1
        })
        this._launchAllMissiles()
      } else if (this.phase === "missile") {
        this.phase = "error"
        this.initErrorSystem()
      } else if (this.phase === "error") {
        this.phase = "boot"
        this.bootProgress = 0
        this.worldNodes.forEach((n) => {
          n.isLocked = false
          n.lockProgress = 0
          n.hitCount = 0
        })
        this.terminalLines = [
          "SYS://CYBER-NEXUS-8086 BOOTLOADER v4.19",
          "CHECKING SYSTEM INTEGRITY & MEMORY BUS...",
        ]
      }
    }

    if (this.phase === "boot") {
      this.bootProgress = Math.min(1, this.phaseTimer / this.phaseDurations.boot)
    }

    if (this.phase === "online") {
      this._updateAutomatedScript(dt)
    }

    this._updateTelemetry(dt)
    this._updateRadar(dt)

    if (this.phase === "missile") {
      this._updateMissiles(dt)
    }

    if (this.phase === "error") {
      this._updateErrorPhase(dt)
    }
  }

  _updateAutomatedScript(dt) {
    this.typeDelay -= dt
    if (this.typeDelay > 0) return

    if (this.scriptIndex >= this.script.length) {
      this.scriptIndex = 10
      return
    }

    const item = this.script[this.scriptIndex]
    if (!item) return

    if (item.type === "instant") {
      this.terminalLines.push(item.text)
      if (this.terminalLines.length > this.maxLines) this.terminalLines.shift()
      this.scriptIndex++
      this.charIndex = 0
      this.typeDelay = 0.55
    } else {
      const speed = item.type === "cmd" ? 0.04 : 0.025
      this.charIndex++
      if (this.charIndex <= item.text.length) {
        this.typeDelay = speed
      } else {
        this.terminalLines.push(item.text)
        if (this.terminalLines.length > this.maxLines) this.terminalLines.shift()
        this.scriptIndex++
        this.charIndex = 0
        this.typeDelay = 0.45
      }
    }
  }

  _updateTelemetry(dt) {
    this.telemetryTick += dt
    if (this.telemetryTick > 0.35) {
      this.telemetryTick = 0
      this.cpuMeters.forEach((m) => {
        m.target = 30 + Math.floor(Math.random() * 60)
      })

      if (!this.netHistory) this.netHistory = Array.from({ length: 22 }, () => 30)
      const prevNet = this.netHistory[this.netHistory.length - 1] || 40
      const nextNet = Math.max(8, Math.min(95, prevNet + (Math.random() - 0.48) * 35))
      this.netHistory.push(nextNet)
      if (this.netHistory.length > 22) this.netHistory.shift()

      if (this.hexRows.length > 0) {
        const row = this.hexRows[Math.floor(Math.random() * this.hexRows.length)]
        const col = Math.floor(Math.random() * row.bytes.length)
        row.bytes[col] = Math.floor(Math.random() * 256)
          .toString(16)
          .toUpperCase()
          .padStart(2, "0")
      }
    }

    this.cpuMeters.forEach((m) => {
      m.val += (m.target - m.val) * 0.14
    })
  }

  _updateRadar(dt) {
    const sweepSpd =
      this.phase === "error" ? 0.8 : this.phase === "missile" ? 3.2 : this.radarSpeed || 1.8
    const prevAngle = this.radarAngle
    this.radarAngle = (this.radarAngle + sweepSpd * dt) % (Math.PI * 2)

    // Trigger expanding radar ping echo ripple periodically or on angle reset
    if (prevAngle > this.radarAngle || (this.radarRipples && this.radarRipples.length === 0 && Math.random() < dt * 0.6)) {
      if (!this.radarRipples) this.radarRipples = []
      if (this.radarRipples.length < 4) {
        this.radarRipples.push({ r: 0.05, maxR: 1.0, life: 1.0, speed: 0.55 })
      }
    }

    if (this.radarRipples) {
      for (let i = this.radarRipples.length - 1; i >= 0; i--) {
        const rip = this.radarRipples[i]
        rip.r += rip.speed * dt
        rip.life -= dt * 0.65
        if (rip.r >= rip.maxR || rip.life <= 0) {
          this.radarRipples.splice(i, 1)
        }
      }
    }

    if (this.reconDrones) {
      this.reconDrones.forEach((d) => {
        d.angle = (d.angle + d.speed * dt) % (Math.PI * 2)
      })
    }

    this.worldNodes.forEach((node) => {
      node.pulse += dt * 3.5

      if (this.phase === "online") {
        let diff = Math.abs(node.theta - this.radarAngle)
        if (diff > Math.PI) diff = Math.PI * 2 - diff
        if (diff < 0.22) {
          node.lockProgress = Math.min(1, node.lockProgress + 0.35)
          if (node.lockProgress >= 1) node.isLocked = true
        }
      }
    })
  }

  _updateMissiles(dt) {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i]
      m.progress += m.speed * dt
      if (m.progress >= 1) {
        this.impactBursts.push({
          target: m.target,
          radius: 4,
          maxRadius: 28,
          life: 1.0,
        })
        this.missiles.splice(i, 1)
      }
    }

    for (let i = this.impactBursts.length - 1; i >= 0; i--) {
      const b = this.impactBursts[i]
      b.life -= dt * 2.0
      b.radius += dt * 45
      if (b.life <= 0) {
        this.impactBursts.splice(i, 1)
      }
    }
  }

  _updateErrorPhase(dt) {
    this.errorStreams.forEach((s) => {
      s.y += s.speed * dt
      if (s.y > this.height + 30) {
        s.y = -30
        s.x = Math.random() * (this.width || 1200)
      }
    })

    this.errorPopups.forEach((p) => {
      if (this.tick % 4 === 0) {
        p.jitterX = (Math.random() - 0.5) * 5
        p.jitterY = (Math.random() - 0.5) * 5
      }
    })
  }

  // ─── DRAW ───────────────────────────────────────────────────────────

  draw() {
    const ctx = this.ctx
    if (!ctx) return

    const W = this.width
    const H = this.height

    // 1. Draw Pre-rendered Backdrop Buffer
    if (this.phase === "error" && this.errorBgCanvas) {
      ctx.drawImage(this.errorBgCanvas, 0, 0, W, H)
    } else if (this.bgCanvas) {
      ctx.drawImage(this.bgCanvas, 0, 0, W, H)
    } else {
      ctx.fillStyle = "#04080a"
      ctx.fillRect(0, 0, W, H)
    }

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

    // 4. RIGHT COLUMN: RADAR (TOP), TELEMETRY (MIDDLE), HEX MATRIX (BOTTOM)
    if (!isCompact) {
      const rightX = margin + leftPanelW + 16
      const panelGap = 12
      const radarH = Math.max(195, Math.floor(totalContentH * 0.40))
      const telemH = Math.max(145, Math.floor((totalContentH - radarH - panelGap * 2) * 0.52))
      const hexH = Math.max(110, totalContentH - radarH - telemH - panelGap * 2)

      this._drawRadarPanel(rightX, contentY, rightPanelW, radarH)
      this._drawTelemetryPanel(rightX, contentY + radarH + panelGap, rightPanelW, telemH)
      this._drawHexMatrixPanel(
        rightX,
        contentY + radarH + telemH + panelGap * 2,
        rightPanelW,
        hexH
      )
    }

    // 5. CRITICAL ERROR OVERLAY (WHEN IN PANIC ERROR PHASE)
    if (this.phase === "error") {
      this._drawErrorOverlay(W, H)
    }

    // 6. Draw Pre-rendered CRT Scanlines & Bezel Vignette Buffer
    if (this.overlayCanvas) {
      ctx.drawImage(this.overlayCanvas, 0, 0, W, H)
    }
  }

  // ─── 8-BIT BOX DRAWING HELPERS ──────────────────────────────────────

  _draw8BitBox(x, y, w, h, title = "", cachedWidth = 0, isRedAlert = false) {
    const ctx = this.ctx
    const pal = this.palette

    // Semi-translucent dark glass fill
    ctx.fillStyle = isRedAlert ? "rgba(22, 4, 6, 0.88)" : "rgba(4, 12, 14, 0.82)"
    ctx.fillRect(x, y, w, h)

    // 8-bit Phosphor Border
    ctx.strokeStyle = isRedAlert ? "rgba(255, 60, 60, 0.85)" : pal.border
    ctx.lineWidth = 1
    ctx.strokeRect(
      Math.floor(x) + 0.5,
      Math.floor(y) + 0.5,
      Math.floor(w),
      Math.floor(h)
    )

    // Corner tick accents
    const tick = 6
    ctx.strokeStyle = isRedAlert ? "rgba(255, 90, 90, 0.98)" : pal.borderTick
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
      const tw = cachedWidth || titleText.length * 7 + 8
      ctx.fillStyle = isRedAlert ? "#120204" : "#04080a"
      ctx.fillRect(x + 14, y - 6, tw + 8, 12)
      ctx.fillStyle = isRedAlert ? "rgba(255, 100, 100, 0.98)" : pal.high
      ctx.fillText(titleText, x + 18, y + 4)
    }
  }

  // ─── 1. TOP HEADER ──────────────────────────────────────────────────

  _drawSystemHeader(x, y, w, h) {
    const ctx = this.ctx
    const pal = this.palette
    const isError = this.phase === "error"
    this._draw8BitBox(x, y, w, h, "", 0, isError)

    ctx.save()
    ctx.font = "bold 12px 'Courier New', Monaco, monospace"

    // Left brand
    ctx.fillStyle = isError ? "rgba(255, 90, 90, 0.98)" : pal.full
    ctx.fillText("SYS://RETRO-TERMINAL-8086", x + 14, y + 21)

    // Center Uptime
    const hrs = Math.floor(this.uptimeSeconds / 3600)
      .toString()
      .padStart(2, "0")
    const mins = Math.floor((this.uptimeSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0")
    const secs = Math.floor(this.uptimeSeconds % 60)
      .toString()
      .padStart(2, "0")
    ctx.fillStyle = isError ? "rgba(255, 140, 140, 0.85)" : pal.mid
    if (w > 640) {
      ctx.fillText(`UPTIME: ${hrs}:${mins}:${secs}`, x + w * 0.45, y + 21)
    }

    // Right baud & status badge
    let statusStr = "9600 BAUD [ONLINE]"
    let statusW = this.textWidths.status || 135
    ctx.fillStyle = pal.high

    if (this.phase === "boot") {
      statusStr = "BIOS BOOT [POST]"
      statusW = this.textWidths.statusBoot || 135
      ctx.fillStyle = "rgba(100, 220, 255, 0.98)"
    } else if (this.phase === "missile") {
      statusStr = "MISSILE BARRAGE [ACTIVE]"
      statusW = this.textWidths.statusMissile || 165
      ctx.fillStyle = "rgba(255, 180, 50, 0.98)"
    } else if (this.phase === "error") {
      statusStr = "CRITICAL ERROR [PANIC]"
      statusW = this.textWidths.statusError || 155
      ctx.fillStyle = "rgba(255, 80, 80, 0.98)"
    }

    ctx.fillText(statusStr, x + w - statusW - 14, y + 21)
    ctx.restore()
  }

  // ─── 2. MAIN CONSOLE ────────────────────────────────────────────────

  _drawMainConsole(x, y, w, h) {
    const ctx = this.ctx
    const pal = this.palette
    const isError = this.phase === "error"
    this._draw8BitBox(
      x,
      y,
      w,
      h,
      "CONSOLE LOG // DEV-0",
      this.textWidths.titleConsole,
      isError
    )

    ctx.save()
    const paddingX = 18
    const startY = y + 30
    const lineSpacing = 20

    ctx.font = "12px 'Courier New', Monaco, monospace"

    // If in BOOT LOADING PHASE: Render live animated bootloader
    if (this.phase === "boot") {
      const spinners = ["|", "/", "-", "\\"]
      const spinner = spinners[Math.floor(this.time * 8) % spinners.length]
      const pct = Math.min(100, Math.round(this.bootProgress * 100))

      ctx.fillStyle = pal.full
      ctx.fillText("SYS://CYBER-NEXUS-8086 BOOTLOADER v4.19", x + paddingX, startY)
      ctx.fillStyle = pal.mid
      ctx.fillText("INITIALIZING HARDWARE SUBSYSTEMS & MEMORY BUS...", x + paddingX, startY + 22)

      ctx.fillStyle = this.bootProgress > 0.2 ? pal.high : pal.dim
      ctx.fillText("[ POST ] 640KB BASE RAM + 15360KB EXTENDED... [OK]", x + paddingX, startY + 46)

      ctx.fillStyle = this.bootProgress > 0.4 ? pal.high : pal.dim
      ctx.fillText("[ VFS  ] MOUNTING ROOT VFS ON /dev/sda1 (ext4)... [OK]", x + paddingX, startY + 68)

      ctx.fillStyle = this.bootProgress > 0.6 ? pal.high : pal.dim
      ctx.fillText("[ BUS  ] PCI / ISA 8259A/8254 CHIPSETS... [OK]", x + paddingX, startY + 90)

      ctx.fillStyle = this.bootProgress > 0.8 ? pal.high : pal.dim
      ctx.fillText("[ NET  ] 10BASE-T TRANSCEIVER LINK ESTABLISHED... [OK]", x + paddingX, startY + 112)

      // Animated Loading Progress Bar
      const barY = startY + 144
      ctx.fillStyle = pal.high
      ctx.fillText(`LOADING KERNEL DAEMONS: ${spinner} [${pct}%]`, x + paddingX, barY)

      const barW = Math.max(140, Math.min(380, w - paddingX * 2))
      const barH = 14
      ctx.strokeStyle = pal.dim
      ctx.strokeRect(x + paddingX, barY + 10, barW, barH)

      const fillW = Math.round((barW - 2) * this.bootProgress)
      ctx.fillStyle = pal.high
      ctx.fillRect(x + paddingX + 1, barY + 11, fillW, barH - 2)

      ctx.restore()
      return
    }

    // Normal & Error Terminal Log Output
    for (let i = 0; i < this.terminalLines.length; i++) {
      const lineY = startY + i * lineSpacing
      if (lineY > y + h - 38) break

      const line = this.terminalLines[i]
      if (!line) continue

      if (isError) {
        ctx.fillStyle = line.startsWith("FATAL")
          ? "rgba(255, 60, 60, 0.98)"
          : "rgba(255, 120, 120, 0.92)"
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

    // Automated typing demo line (streaming line)
    if (this.phase === "online" && this.scriptIndex < this.script.length) {
      const curItem = this.script[this.scriptIndex]
      if (curItem && curItem.type !== "instant" && this.charIndex > 0) {
        const curY = startY + this.terminalLines.length * lineSpacing
        if (curY < y + h - 38) {
          const partial = curItem.text.slice(0, this.charIndex)
          ctx.fillStyle = curItem.type === "cmd" ? pal.full : pal.text
          ctx.fillText(partial, x + paddingX, curY)
        }
      }
    }

    // Bottom interactive command prompt line with 8-bit blinking block cursor
    const bottomPromptY = y + h - 16
    ctx.strokeStyle = isError ? "rgba(255, 60, 60, 0.3)" : pal.faint
    ctx.beginPath()
    ctx.moveTo(x + 12, bottomPromptY - 14)
    ctx.lineTo(x + w - 12, bottomPromptY - 14)
    ctx.stroke()

    ctx.font = "bold 12px 'Courier New', Monaco, monospace"
    ctx.fillStyle = isError ? "rgba(255, 90, 90, 0.98)" : pal.high
    const promptPrefix = "guest@cyber-nexus:~$ "
    ctx.fillText(promptPrefix, x + paddingX, bottomPromptY)

    // User typing string or empty interactive buffer
    const promptW = this.textWidths.prompt || 155
    if (this.userInput) {
      ctx.fillStyle = pal.full
      ctx.fillText(this.userInput, x + paddingX + promptW, bottomPromptY)
    }

    // Blinking Block Cursor █
    if (this.cursorBlink > 0.5) {
      const inputW = this.userInput ? ctx.measureText(this.userInput).width : 0
      ctx.fillStyle = isError ? "rgba(255, 90, 90, 0.98)" : pal.full
      ctx.fillRect(x + paddingX + promptW + inputW + 2, bottomPromptY - 10, 8, 12)
    }

    ctx.restore()
  }

  // ─── 3. TELEMETRY PANEL ─────────────────────────────────────────────

  // ─── 3. 8-BIT TACTICAL RADAR (TOP RIGHT) ───────────────────────────

  _drawRadarPanel(x, y, w, h) {
    const ctx = this.ctx
    const pal = this.palette
    const isMissile = this.phase === "missile"
    const isError = this.phase === "error"

    this._draw8BitBox(
      x,
      y,
      w,
      h,
      isMissile ? "TACTICAL RADAR // DEFENSE INTERCEPT" : "TACTICAL RADAR // DEF-NET",
      this.textWidths.titleRadar,
      isError
    )

    ctx.save()
    const cx = Math.floor(x + w / 2)
    const cy = Math.floor(y + 24 + (h - 44) / 2)
    const radius = Math.max(22, Math.min(Math.floor((w - 36) * 0.44), Math.floor((h - 54) * 0.44)))

    // 1. Concentric Range Rings with Range Marks
    const rings = [0.33, 0.66, 1.0]
    const ringLabels = ["5KM", "10KM", "15KM"]
    ctx.lineWidth = 1

    rings.forEach((ratio, rIdx) => {
      const r = radius * ratio
      ctx.strokeStyle = isError
        ? "rgba(255, 60, 60, 0.35)"
        : rIdx === 2
        ? pal.mid
        : pal.dim
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()

      // Range label
      ctx.font = "8px 'Courier New', Monaco, monospace"
      ctx.fillStyle = isError ? "rgba(255, 100, 100, 0.7)" : pal.dim
      ctx.fillText(ringLabels[rIdx], cx + 4, cy - r + 9)
    })

    // 2. Cardinal Degree Markers (N, E, S, W)
    ctx.font = "bold 9px 'Courier New', Monaco, monospace"
    ctx.fillStyle = isError ? "rgba(255, 120, 120, 0.85)" : pal.high
    ctx.fillText("N [000°]", cx - 20, cy - radius - 4)
    ctx.fillText("S [180°]", cx - 20, cy + radius + 11)
    ctx.fillText("E", cx + radius + 5, cy + 3)
    ctx.fillText("W", cx - radius - 12, cy + 3)

    // 3. Crosshairs
    ctx.strokeStyle = isError ? "rgba(255, 60, 60, 0.3)" : pal.faint
    ctx.beginPath()
    ctx.moveTo(cx - radius - 2, cy)
    ctx.lineTo(cx + radius + 2, cy)
    ctx.moveTo(cx, cy - radius - 2)
    ctx.lineTo(cx, cy + radius + 2)
    ctx.stroke()

    // 4. Expanding Ping Echo Ripples
    if (this.radarRipples) {
      this.radarRipples.forEach((rip) => {
        const ripR = radius * rip.r
        const alpha = Math.max(0, rip.life * 0.5)
        ctx.strokeStyle = isError
          ? `rgba(255, 80, 80, ${alpha})`
          : `rgba(${this._cachedRGB.r}, ${this._cachedRGB.g}, ${this._cachedRGB.b}, ${alpha})`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(cx, cy, ripR, 0, Math.PI * 2)
        ctx.stroke()
      })
    }

    // 5. Orbiting Recon Drones
    if (this.reconDrones) {
      this.reconDrones.forEach((d) => {
        const dx = cx + Math.cos(d.angle) * (radius * d.dist)
        const dy = cy + Math.sin(d.angle) * (radius * d.dist)
        ctx.fillStyle = isError ? "rgba(255, 90, 90, 0.9)" : pal.high
        ctx.fillRect(dx - 2, dy - 2, 4, 4)

        // Trailing drone echo
        const prevDx = cx + Math.cos(d.angle - 0.15) * (radius * d.dist)
        const prevDy = cy + Math.sin(d.angle - 0.15) * (radius * d.dist)
        ctx.fillStyle = isError ? "rgba(255, 60, 60, 0.35)" : pal.dim
        ctx.fillRect(prevDx - 1, prevDy - 1, 2, 2)
      })
    }

    // 6. Rotating Radar Sweep Beam & Phosphor Tail
    const sx = cx + Math.cos(this.radarAngle) * radius
    const sy = cy + Math.sin(this.radarAngle) * radius

    // Phosphor Tail Arc
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, this.radarAngle - 0.52, this.radarAngle)
    ctx.closePath()
    ctx.fillStyle = isError ? "rgba(255, 40, 40, 0.18)" : pal.radarTail
    ctx.fill()

    // Primary Sweep Vector Line
    ctx.strokeStyle = isError
      ? "rgba(255, 80, 80, 0.95)"
      : isMissile
      ? "rgba(255, 180, 50, 0.98)"
      : pal.high
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(sx, sy)
    ctx.stroke()

    // 7. Tactical Defense Nodes & Target Reticles
    this.worldNodes.forEach((node) => {
      const nx = cx + Math.cos(node.theta) * (radius * node.r)
      const ny = cy + Math.sin(node.theta) * (radius * node.r)
      const isLocked = isMissile || node.isLocked

      if (isLocked) {
        // Blinking Red Lock Diamond & Brackets
        ctx.strokeStyle = "rgba(255, 70, 70, 0.95)"
        ctx.lineWidth = 1.4
        ctx.strokeRect(nx - 5, ny - 5, 10, 10)

        ctx.fillStyle = "rgba(255, 90, 90, 0.98)"
        ctx.fillRect(nx - 2, ny - 2, 4, 4)

        // Lock tag
        ctx.font = "8px 'Courier New', Monaco, monospace"
        ctx.fillStyle = "rgba(255, 140, 140, 0.95)"
        ctx.fillText(`${node.id}`, nx + 7, ny - 1)
        ctx.fillStyle = "rgba(255, 80, 80, 0.85)"
        ctx.fillText(`${node.dist}`, nx + 7, ny + 8)
      } else {
        const { r, g, b } = this._cachedRGB
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`
        ctx.fillRect(nx - 2, ny - 2, 4, 4)

        // Lock Acquisition Pulse
        if (node.lockProgress > 0) {
          ctx.strokeStyle = pal.high
          ctx.strokeRect(nx - 4, ny - 4, 8, 8)
          ctx.font = "8px 'Courier New', Monaco, monospace"
          ctx.fillStyle = pal.mid
          ctx.fillText(node.id, nx + 6, ny + 3)
        }
      }
    })

    // 8. Active Missiles and Impact Bursts
    if (isMissile) {
      this.missiles.forEach((m) => {
        const tx = cx + Math.cos(m.target.theta) * (radius * m.target.r)
        const ty = cy + Math.sin(m.target.theta) * (radius * m.target.r)
        const mx = cx + (tx - cx) * m.progress
        const my = cy + (ty - cy) * m.progress

        ctx.strokeStyle = "rgba(255, 200, 60, 0.85)"
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(mx, my)
        ctx.stroke()

        ctx.fillStyle = "#ffffff"
        ctx.fillRect(mx - 2, my - 2, 4, 4)
      })

      this.impactBursts.forEach((b) => {
        const bx = cx + Math.cos(b.target.theta) * (radius * b.target.r)
        const by = cy + Math.sin(b.target.theta) * (radius * b.target.r)

        ctx.strokeStyle = `rgba(255, 80, 50, ${Math.max(0, b.life)})`
        ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.arc(bx, by, b.radius, 0, Math.PI * 2)
        ctx.stroke()

        ctx.fillStyle = `rgba(255, 200, 100, ${Math.max(0, b.life * 0.8)})`
        ctx.fillRect(bx - 3, by - 3, 6, 6)
      })
    }

    // 9. Bottom Radar Telemetry Status Bar
    const azim = Math.round(((this.radarAngle * 180) / Math.PI) % 360)
      .toString()
      .padStart(3, "0")
    ctx.font = "9px 'Courier New', Monaco, monospace"
    ctx.fillStyle = isError ? "rgba(255, 100, 100, 0.9)" : pal.dim
    ctx.fillText(`AZ:${azim}° | TRK:8 | GRID:ONLINE`, x + 14, y + h - 9)

    ctx.restore()
  }

  // ─── 4. SYSTEM TELEMETRY PANEL (MIDDLE RIGHT) ───────────────────────

  _drawTelemetryPanel(x, y, w, h) {
    const ctx = this.ctx
    const pal = this.palette
    const isError = this.phase === "error"
    this._draw8BitBox(x, y, w, h, "SYSTEM TELEMETRY // CORE-DIAG", this.textWidths.titleTelem, isError)

    ctx.save()
    const paddingX = 14
    const startY = y + 26
    const rowH = 20

    ctx.font = "10px 'Courier New', Monaco, monospace"

    // Multi-Core CPU & Memory Meters
    const metersToShow = h > 160 ? this.cpuMeters : this.cpuMeters.slice(0, 3)
    metersToShow.forEach((m, idx) => {
      const rowY = startY + idx * rowH
      if (rowY > y + h - 38) return

      ctx.fillStyle = isError ? "rgba(255, 140, 140, 0.9)" : pal.text
      ctx.fillText(m.name.padEnd(5, " "), x + paddingX, rowY + 9)

      const barX = x + paddingX + 46
      const barW = Math.max(50, w - paddingX * 2 - 86)
      const barH = 9
      const pct = Math.max(0, Math.min(100, Math.round(m.val)))

      ctx.strokeStyle = isError ? "rgba(255, 60, 60, 0.6)" : pal.dim
      ctx.strokeRect(barX, rowY + 1, barW, barH)

      const fillW = Math.round((barW - 2) * (pct / 100))
      ctx.fillStyle = isError ? "rgba(255, 80, 80, 0.92)" : pal.text
      ctx.fillRect(barX + 1, rowY + 2, fillW, barH - 2)

      ctx.fillStyle = isError ? "rgba(255, 180, 180, 0.98)" : pal.high
      ctx.fillText(`${pct}%`.padStart(4, " "), barX + barW + 6, rowY + 9)
    })

    // Network Sparkline Graph & Telemetry
    const sparkY = y + h - 28
    ctx.font = "9px 'Courier New', Monaco, monospace"
    ctx.fillStyle = isError ? "rgba(255, 100, 100, 0.85)" : pal.dim
    ctx.fillText("NET I/O [TX:48KB/s | RX:112KB/s]", x + paddingX, sparkY)

    if (this.netHistory && this.netHistory.length > 1) {
      const graphX = x + w - paddingX - 64
      const graphW = 60
      const graphH = 14
      const graphY = sparkY - 11

      ctx.strokeStyle = isError ? "rgba(255, 70, 70, 0.8)" : pal.high
      ctx.lineWidth = 1
      ctx.beginPath()
      this.netHistory.forEach((v, idx) => {
        const gx = graphX + (idx / (this.netHistory.length - 1)) * graphW
        const gy = graphY + graphH - (v / 100) * graphH
        if (idx === 0) ctx.moveTo(gx, gy)
        else ctx.lineTo(gx, gy)
      })
      ctx.stroke()
    }

    // Hardware Status Line
    ctx.fillStyle = isError ? "rgba(255, 90, 90, 0.9)" : pal.faint
    ctx.fillText("TEMP:41.8°C | FAN:2840 RPM | VCORE:1.25V", x + paddingX, y + h - 9)

    ctx.restore()
  }

  // ─── 5. ACTIVE MEMORY DUMP PANEL (BOTTOM RIGHT) ──────────────────────

  _drawHexMatrixPanel(x, y, w, h) {
    const ctx = this.ctx
    const pal = this.palette
    const isError = this.phase === "error"
    this._draw8BitBox(x, y, w, h, "ACTIVE MEMORY DUMP // VFS-HEX", this.textWidths.titleHex, isError)

    ctx.save()
    const paddingX = 14
    const startY = y + 26
    const rowH = 16

    ctx.font = "10px 'Courier New', Monaco, monospace"

    this.hexRows.forEach((row, idx) => {
      const rowY = startY + idx * rowH
      if (rowY > y + h - 24) return

      // Address Offset
      ctx.fillStyle = isError ? "rgba(255, 100, 100, 0.95)" : pal.high
      ctx.fillText(`0x${row.addr}:`, x + paddingX, rowY)

      // Hex Bytes
      ctx.fillStyle = isError ? "rgba(255, 150, 150, 0.85)" : pal.mid
      const maxBytes = Math.max(4, Math.min(6, Math.floor((w - 120) / 20)))
      const hexStr = row.bytes.slice(0, maxBytes).join(" ")
      ctx.fillText(hexStr, x + paddingX + 48, rowY)

      // ASCII Representation Column
      const ascii = row.bytes
        .slice(0, maxBytes)
        .map((b) => {
          const code = parseInt(b, 16)
          return code >= 33 && code <= 126 ? String.fromCharCode(code) : "."
        })
        .join("")

      ctx.fillStyle = isError ? "rgba(255, 80, 80, 0.75)" : pal.dim
      ctx.fillText(`| ${ascii}`, x + paddingX + 48 + maxBytes * 20 + 4, rowY)
    })

    // Bottom Checksum & Segment Status
    ctx.font = "9px 'Courier New', Monaco, monospace"
    ctx.fillStyle = isError ? "rgba(255, 90, 90, 0.9)" : pal.dim
    ctx.fillText("CRC32: 0x8F4A2B9C [VERIFIED] // HEAP: 78%", x + paddingX, y + h - 8)

    ctx.restore()
  }

  // ─── 6. CRITICAL ERROR OVERLAY (BÁO LỖI) ─────────────────────────────

  _drawErrorOverlay(W, H) {
    const ctx = this.ctx
    ctx.save()

    // Top Alert Banner
    const bannerH = 54
    const bannerY = Math.max(16, Math.floor(H * 0.08))
    ctx.fillStyle = "rgba(180, 15, 20, 0.88)"
    ctx.fillRect(0, bannerY, W, bannerH)
    ctx.strokeStyle = "rgba(255, 120, 120, 0.95)"
    ctx.lineWidth = 2
    ctx.strokeRect(0, bannerY, W, bannerH)

    const title = "! CRITICAL ERROR // SECURITY LOCKDOWN LEVEL-5 !"
    ctx.font = "bold 16px 'Courier New', Monaco, monospace"
    ctx.fillStyle = "#ffffff"
    const tw = ctx.measureText(title).width
    ctx.fillText(title, Math.floor((W - tw) / 2), bannerY + 24)

    const recoveryPct = Math.min(
      100,
      Math.floor((this.phaseTimer / this.phaseDurations.error) * 100)
    )
    const sub = `AUTO-RECOVERY ROUTINE: REBOOTING KERNEL IN ${Math.max(
      1,
      Math.ceil(this.phaseDurations.error - this.phaseTimer)
    )}s... [${recoveryPct}%]`
    ctx.font = "12px 'Courier New', Monaco, monospace"
    ctx.fillStyle = "rgba(255, 220, 220, 0.95)"
    const sw = ctx.measureText(sub).width
    ctx.fillText(sub, Math.floor((W - sw) / 2), bannerY + 44)

    // Falling Error Matrix Stream Lines
    ctx.font = "11px 'Courier New', Monaco, monospace"
    this.errorStreams.forEach((s) => {
      ctx.fillStyle = `rgba(255, 80, 80, ${s.alpha})`
      ctx.fillText(s.text, s.x, s.y)
    })

    // Responsive Centered Grid for 8-Bit Popup Error Dialog Boxes (No Overlap / Obscuration)
    const count = this.errorPopups.length
    const cols = W < 680 ? 1 : W < 1150 ? 2 : 3
    const gapX = 20
    const gapY = 18
    const maxGridW = Math.min(W - 40, cols * 350 + (cols - 1) * gapX)
    const cardW = Math.floor((maxGridW - (cols - 1) * gapX) / cols)
    const cardH = 92
    const totalGridW = cols * cardW + (cols - 1) * gapX
    const startX = Math.floor((W - totalGridW) / 2)
    const startY = bannerY + bannerH + 22

    this.errorPopups.forEach((p, idx) => {
      const col = idx % cols
      const row = Math.floor(idx / cols)
      const px = startX + col * (cardW + gapX) + (p.jitterX || 0)
      const py = startY + row * (cardH + gapY) + (p.jitterY || 0)

      this._draw8BitBox(px, py, cardW, cardH, `ALERT DIALOG #${idx + 1}`, 0, true)

      ctx.font = "bold 11px 'Courier New', Monaco, monospace"
      ctx.fillStyle = "rgba(255, 120, 120, 0.98)"
      ctx.fillText(`SIGNAL: ${p.code}`, px + 14, py + 28)

      // Alert severity badge
      const sev = "[SEV-1 FATAL]"
      ctx.font = "10px 'Courier New', Monaco, monospace"
      ctx.fillStyle = "rgba(255, 90, 90, 0.9)"
      const sevW = ctx.measureText(sev).width
      ctx.fillText(sev, px + cardW - 14 - sevW, py + 28)

      // Meter Bar
      const meterW = cardW - 28
      const meterFill = ((this.tick * 3 + idx * 30) % 100) / 100
      ctx.fillStyle = "rgba(60, 10, 12, 0.85)"
      ctx.fillRect(px + 14, py + 38, meterW, 10)
      ctx.fillStyle = "rgba(255, 70, 70, 0.95)"
      ctx.fillRect(px + 14, py + 38, meterW * meterFill, 10)

      // Description text
      ctx.font = "10px 'Courier New', Monaco, monospace"
      ctx.fillStyle = "rgba(255, 190, 190, 0.9)"
      ctx.fillText("CORRUPTED MEMORY CHUNK OVERFLOW", px + 14, py + 64)
      ctx.fillStyle = "rgba(255, 130, 130, 0.75)"
      ctx.fillText(
        `ADDR: 0x${(0x8000 + idx * 0x1234).toString(16).toUpperCase()} // BUS FAULT`,
        px + 14,
        py + 78
      )
    })

    ctx.restore()
  }

  destroy() {
    this.bgCanvas = null
    this.bgCtx = null
    this.errorBgCanvas = null
    this.errorBgCtx = null
    this.overlayCanvas = null
    this.overlayCtx = null
  }
}

// ══════════════════════════════════════════════════════════════════════
// 2. CLASSIC ENGINE (Accurate Multi-Window CRT Desktop)
// ══════════════════════════════════════════════════════════════════════

class ClassicEngine {
  constructor(canvas, ctx, color = "#63f5ff") {
    this.canvas = canvas
    this.ctx = ctx
    this.color = color || "#63f5ff"
    this._cachedRGB = this._parseHex(this.color)

    this.width = window.innerWidth
    this.height = window.innerHeight

    this.fps = 30
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this.tick = 0
    this.phase = "loading"
    this.loadingDuration = 78
    this.burstDurations = [300, 450]
    this.currentBurstDuration = this.burstDurations[0]
    this.errorDuration = 150
    this.successDuration = 540
    this.loadingProgress = 0
    this.burstProgress = 0
    this.errorProgress = 0
    this.successProgress = 0
    this.scanOffset = 0
    this.noiseSeed = Math.random() * 1000
    this.windows = []
    this.stars = []
    this.glowPixels = []
    this.burstColumns = []
    this.worldNodes = []
    this.systemName = "GHOST-NEXUS"
    this.lockedNodeIndex = -1
    this.errorStreams = []
    this.loadingAttempt = 0
    this.finalAttempt = 3
    this.successLockedCount = 0
    this.successShots = []
    this.errorPopups = []

    this.resize()
  }

  _parseHex(hex) {
    const normalized = (hex || "#63f5ff").replace("#", "")
    const value =
      normalized.length === 3
        ? normalized
            .split("")
            .map((part) => part + part)
            .join("")
        : normalized
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    }
  }

  rgba(hex, alpha) {
    let rgb
    if (hex === this.color && this._cachedRGB) {
      rgb = this._cachedRGB
    } else {
      rgb = this._parseHex(hex)
      if (hex === this.color) this._cachedRGB = rgb
    }
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
  }

  updateAccentColor(color) {
    this.color = color
    this._cachedRGB = this._parseHex(color)
  }

  resize() {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.initScene()
  }

  initScene() {
    this.loadingAttempt = 0
    this.startLoadingAttempt()

    const starCount = Math.max(
      32,
      Math.floor((this.width * this.height) / 28000),
    )
    const glowCount = Math.max(
      18,
      Math.floor((this.width * this.height) / 110000),
    )

    this.stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      size: Math.random() > 0.7 ? 2 : 1,
      speed: Math.random() * 0.35 + 0.12,
      alpha: Math.random() * 0.35 + 0.15,
      pulse: Math.random() * Math.PI * 2,
    }))

    this.glowPixels = Array.from({ length: glowCount }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      size: Math.random() * 3 + 2,
      driftX: Math.random() * 0.18 - 0.09,
      driftY: Math.random() * 0.12 - 0.06,
      pulse: Math.random() * Math.PI * 2,
    }))

    this.initWorldNodes()
    this.initBurstColumns()
    this.initErrorStreams()
    this.resetWindows()
  }

  startLoadingAttempt() {
    this.phase = "loading"
    this.loadingAttempt += 1
    this.loadingProgress = 0
    this.burstProgress = 0
    this.errorProgress = 0
    this.successProgress = 0
    this.lockedNodeIndex = -1
    this.successLockedCount = 0
    this.successShots = []
    this.initWorldNodes()
    this.resetWindows()
  }

  beginPhase(nextPhase) {
    this.phase = nextPhase
    if (nextPhase === "burst") {
      const burstIndex = Math.max(
        0,
        Math.min(this.burstDurations.length - 1, this.loadingAttempt - 1),
      )
      this.currentBurstDuration = this.burstDurations[burstIndex]
      this.burstProgress = 0
      this.initBurstColumns()
    }
    if (nextPhase === "error") {
      this.errorProgress = 0
      this.initErrorStreams()
      this.initErrorPopups()
    }
    if (nextPhase === "success") {
      this.successProgress = 0
      this.successLockedCount = 0
      this.successShots = []
    }
  }

  initErrorStreams() {
    const templates = [
      "ERROR::AUTH_GATEWAY_DENIED",
      "ERROR::KERNEL_PANIC_SIGNAL",
      "FATAL::TRACE_ROUTE_COLLAPSE",
      "ERROR::PAYLOAD_CORRUPTED",
      "ALERT::SECURITY_LOCKDOWN",
      "WARN::MEMORY_LEAK_DETECTED",
      "ERROR::HANDSHAKE_TIMEOUT",
      "FATAL::BARRIER_OVERRIDE_FAIL",
      "ERROR::INVALID_ROOT_TOKEN",
    ]
    const count = Math.max(24, Math.floor(this.width / 42))
    this.errorStreams = Array.from({ length: count }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      speed: 1.4 + Math.random() * 2.1,
      alpha: 0.25 + Math.random() * 0.55,
      text: templates[Math.floor(Math.random() * templates.length)],
      blinkOffset: Math.random() * Math.PI * 2,
      size: Math.random() > 0.8 ? 13 : 11,
    }))
  }

  initErrorPopups() {
    const popupCount = 26
    const baseW = Math.min(320, this.width * 0.32)
    const baseH = 70
    this.errorPopups = Array.from({ length: popupCount }, () => {
      const x = 22 + Math.random() * (this.width - baseW - 44)
      const y = 86 + Math.random() * (this.height - baseH - 128)
      return {
        x,
        y,
        nextRespawnTick: this.tick + 10 + Math.floor(Math.random() * 36),
      }
    })
  }

  updateErrorPopups() {
    if (!this.errorPopups.length) return

    const baseW = Math.min(320, this.width * 0.32)
    const baseH = 70
    const minX = 22
    const maxX = Math.max(minX + 1, this.width - baseW - 44)
    const minY = 86
    const maxY = Math.max(minY + 1, this.height - baseH - 128)

    this.errorPopups.forEach((popup) => {
      if (this.tick >= popup.nextRespawnTick) {
        popup.x = minX + Math.random() * (maxX - minX)
        popup.y = minY + Math.random() * (maxY - minY)
        popup.nextRespawnTick = this.tick + 18 + Math.floor(Math.random() * 55)
      }
    })
  }

  initWorldNodes() {
    const seeds = [
      [0.2, 0.34],
      [0.28, 0.42],
      [0.36, 0.3],
      [0.48, 0.36],
      [0.56, 0.46],
      [0.64, 0.34],
      [0.72, 0.28],
      [0.78, 0.4],
      [0.82, 0.52],
      [0.42, 0.55],
      [0.3, 0.56],
    ]
    this.worldNodes = seeds.map(([x, y]) => ({
      x,
      y,
      pulse: Math.random() * Math.PI * 2,
      strength: 0.4 + Math.random() * 0.6,
    }))
  }

  initBurstColumns() {
    const columnWidth = 16
    const columnCount = Math.max(18, Math.ceil(this.width / columnWidth))
    this.burstColumns = Array.from({ length: columnCount }, (_, index) => ({
      x: index * columnWidth,
      y: this.height + Math.random() * this.height,
      speed: 1.8 + Math.random() * 2.6,
      text: this.createBurstText(),
      reveal: 14 + Math.floor(Math.random() * 28),
    }))
  }

  resetWindows() {
    this.windows = this.buildWindows().map((windowData) => ({
      ...windowData,
      lines: this.buildLines(windowData),
      sweep: Math.random() * windowData.height,
      sweepSpeed: 0.6 + Math.random() * 0.45,
    }))
  }

  roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2)
    this.ctx.beginPath()
    this.ctx.moveTo(x + r, y)
    this.ctx.lineTo(x + width - r, y)
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + r)
    this.ctx.lineTo(x + width, y + height - r)
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
    this.ctx.lineTo(x + r, y + height)
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - r)
    this.ctx.lineTo(x, y + r)
    this.ctx.quadraticCurveTo(x, y, x + r, y)
    this.ctx.closePath()
  }

  buildWindows() {
    const margin = Math.min(70, this.width * 0.05)
    const isCompact = this.width < 900
    const largeWidth = Math.min(this.width - margin * 2, 720)
    const panelHeight = isCompact ? 180 : 210
    const topY = Math.max(48, this.height * 0.08)
    const bottomY = topY + panelHeight + 26
    const leftX = margin
    const rightWidth = Math.min(this.width - margin * 2, 420)
    const rightX = this.width - margin - rightWidth

    const windows = [
      {
        title: "SYS://BREACH-CORE",
        x: leftX,
        y: topY,
        width: isCompact ? this.width - margin * 2 : largeWidth,
        height: panelHeight,
        profile: "system",
      },
      {
        title: "MONITOR://AUTH-BYPASS",
        x: leftX,
        y: bottomY,
        width: isCompact
          ? this.width - margin * 2
          : Math.min(470, largeWidth * 0.62),
        height: panelHeight - 8,
        profile: "monitor",
      },
    ]

    if (!isCompact) {
      windows.push({
        title: "TRACE://PAYLOAD-LOG",
        x: rightX,
        y: bottomY,
        width: rightWidth,
        height: panelHeight - 8,
        profile: "trace",
      })
    }

    return windows
  }

  buildLines(windowData) {
    const lineHeight = 16
    const visibleLines = Math.max(
      10,
      Math.floor((windowData.height - 50) / lineHeight),
    )
    const bottomY = windowData.height - 16

    return Array.from({ length: visibleLines + 4 }, (_, index) =>
      this.createLineEntry(windowData.profile, bottomY - index * lineHeight),
    )
  }

  createLineEntry(profile, y) {
    const fullText = this.createLine(profile)
    return {
      fullText,
      y,
      kind: Math.random() > 0.78 ? "dim" : "normal",
      blink: Math.random() > 0.9,
      revealCount:
        this.phase === "loading"
          ? fullText.length
          : Math.max(4, Math.floor(Math.random() * 16)),
      revealSpeed: 1 + Math.floor(Math.random() * 3),
    }
  }

  createLine(profile) {
    const addresses = [
      "0xA1F0",
      "0xB3C4",
      "0xDE77",
      "0x0F12",
      "0x7E90",
      "0x9BCD",
    ]
    const nodes = ["NODE-01", "NODE-04", "CORE-A", "CRT-B", "MUX-7", "ROM-3"]
    const commands = [
      "SCAN",
      "TRACE",
      "SYNC",
      "BOOT",
      "VERIFY",
      "CACHE",
      "LOAD",
      "PING",
    ]
    const states = [
      "OK",
      "LOCKED",
      "STABLE",
      "READY",
      "ONLINE",
      "PASS",
      "RUNNING",
    ]
    const bars = [
      "[####....]",
      "[######..]",
      "[###.....]",
      "[#######.]",
      "[########]",
    ]
    const targets = [
      "GATEWAY",
      "VAULT",
      "MAINFRAME",
      "BACKBONE",
      "PROXY",
      "AUTH",
    ]
    const actions = ["BYPASS", "INJECT", "SPOOF", "EXTRACT", "CRACK", "HOOK"]
    const severities = ["LOW", "MID", "HIGH", "CRITICAL"]
    const codeOps = [
      "const socket = await openTunnel(node)",
      "payload.push(tracePacket(port, authKey))",
      "if (firewall.locked) bypassCipher(layer)",
      "session.cache[token] = spoofHandshake(proxy)",
      "while (vault.active) extractChunk(buffer)",
      "injectSignal(mainframe, ghostKernel)",
    ]
    const shellOps = [
      "sudo breach --force --mask ghost://proxy",
      "nmap --stealth --ports 443,8080 10.0.0.7",
      "ssh root@vault.local -i ./phantom.key",
      "./payload --inject auth-gateway --silent",
      "cat /secure/trace.log | grep TOKEN",
      "node breach.js --target mainframe --mode deep",
    ]
    const randomOf = (list) => list[Math.floor(Math.random() * list.length)]

    if (this.phase === "loading") {
      const percent = String(
        Math.min(99, Math.floor(this.loadingProgress * 100)),
      ).padStart(2, "0")

      if (profile === "system") {
        return `BOOTSTRAP ${randomOf(nodes)} ${randomOf(bars)} ${percent}%`
      }
      if (profile === "monitor") {
        return `LOADING MODULE ${randomOf(commands)} :: ${randomOf(states)} :: ${percent}%`
      }
      return `PREP ${randomOf(addresses)} :: LINK ${randomOf(nodes)} :: ${percent}%`
    }

    if (profile === "system") {
      return `C:\\SYS>${randomOf(shellOps)}`
    }
    if (profile === "monitor") {
      return `BREACH ${randomOf(bars)}  PORT:${3000 + Math.floor(Math.random() * 5000)}  AUTH:${54 + Math.floor(Math.random() * 45)}%`
    }
    return `${randomOf(addresses)} :: ${randomOf(targets)} :: ${randomOf(codeOps)} :: ${randomOf(severities)}`
  }

  createBurstText() {
    const snippets = [
      "sudo breach --force --mask ghost://proxy",
      "injectSignal(mainframe, ghostKernel)",
      "auth_cache[token] = spoofHandshake(proxy)",
      "nmap --stealth --ports 443,8080 10.0.0.7",
      "while (vault.active) extractChunk(buffer)",
      "TRACE 0xDE77 :: MAINFRAME :: CRACK :: CRITICAL",
      "./payload --inject auth-gateway --silent",
      "const socket = await openTunnel(node)",
      "cat /secure/trace.log | grep TOKEN",
    ]
    return snippets[Math.floor(Math.random() * snippets.length)]
  }

  updatePhase() {
    if (this.phase === "loading") {
      this.loadingProgress = Math.min(
        1,
        this.loadingProgress + 1 / this.loadingDuration,
      )
      if (this.loadingProgress >= 1) {
        if (this.loadingAttempt >= this.finalAttempt) {
          this.beginPhase("success")
        } else {
          this.beginPhase("burst")
        }
      }
      return
    }

    if (this.phase === "burst") {
      this.burstProgress = Math.min(
        1,
        this.burstProgress + 1 / this.currentBurstDuration,
      )
      if (this.burstProgress >= 1) {
        this.beginPhase("error")
      }
      return
    }

    if (this.phase === "error") {
      this.errorProgress = Math.min(
        1,
        this.errorProgress + 1 / this.errorDuration,
      )
      if (this.errorProgress >= 1) {
        this.startLoadingAttempt()
      }
      return
    }

    if (this.phase === "success") {
      this.successProgress = Math.min(
        1,
        this.successProgress + 1 / this.successDuration,
      )
      this.updateSuccessSequence()
      if (this.successProgress >= 1) {
        this.loadingAttempt = 0
        this.startLoadingAttempt()
      }
    }
  }

  updateSuccessSequence() {
    const lockInterval = 9
    const desiredLocked = Math.min(
      this.worldNodes.length,
      Math.floor(this.successProgress * this.worldNodes.length * 1.25),
    )

    if (desiredLocked > this.successLockedCount) {
      for (
        let index = this.successLockedCount;
        index < desiredLocked;
        index += 1
      ) {
        const life = 30
        this.successShots.push({
          nodeIndex: index,
          life,
          maxLife: life,
          triggerTick: this.tick,
        })
      }
      this.successLockedCount = desiredLocked
    }

    this.successShots.forEach((shot) => {
      shot.life -= 1
    })
    this.successShots = this.successShots.filter((shot) => shot.life > 0)

    if (this.successProgress > 0.8) {
      const extraShots = Math.floor((this.successProgress - 0.8) * 25)
      for (let i = 0; i < extraShots; i += 1) {
        const life = 18
        this.successShots.push({
          nodeIndex: Math.floor(Math.random() * this.worldNodes.length),
          life,
          maxLife: life,
          triggerTick: this.tick,
        })
      }
      this.successLockedCount = this.worldNodes.length
    }

    if (
      this.tick % lockInterval === 0 &&
      this.successLockedCount < this.worldNodes.length
    ) {
      this.successLockedCount = Math.min(
        this.worldNodes.length,
        this.successLockedCount + 1,
      )
    }
  }

  updateBurstColumns() {
    this.burstColumns.forEach((column) => {
      column.y -= column.speed
      column.reveal = Math.min(column.text.length, column.reveal + 1)
      if (column.y < -220) {
        column.y = this.height + Math.random() * 120
        column.speed = 1.8 + Math.random() * 2.6
        column.text = this.createBurstText()
        column.reveal = 12 + Math.floor(Math.random() * 20)
      }
    })
  }

  drawBurstOverlay() {
    if (this.phase !== "burst") return

    const overlay = this.ctx.createLinearGradient(0, 0, 0, this.height)
    overlay.addColorStop(0, "rgba(2, 10, 8, 0.12)")
    overlay.addColorStop(0.5, "rgba(0, 18, 12, 0.24)")
    overlay.addColorStop(1, "rgba(0, 8, 6, 0.12)")
    this.ctx.fillStyle = overlay
    this.ctx.fillRect(0, 0, this.width, this.height)

    this.ctx.font = "12px 'Silkscreen', 'Courier New', Monaco, monospace"
    this.burstColumns.forEach((column, index) => {
      const text = column.text.slice(0, column.reveal)
      const alpha = 0.26 + ((index + this.tick) % 5) * 0.08
      this.ctx.fillStyle = this.rgba(this.color, Math.min(alpha, 0.8))
      this.ctx.save()
      this.ctx.translate(column.x, column.y)
      this.ctx.rotate(-Math.PI / 2)
      this.ctx.fillText(text, 0, 0)
      this.ctx.restore()
    })

    const centerText = "PAYLOAD STREAM ACTIVE"
    const payloadSeconds = Math.round(this.currentBurstDuration / this.fps)
    const subText = `routing code burst... ${Math.floor(this.burstProgress * 100)}% // ${payloadSeconds}s window`
    this.ctx.fillStyle = this.rgba(this.color, 0.95)
    this.ctx.font = "600 18px 'Silkscreen', 'Courier New', Monaco, monospace"
    this.ctx.fillText(
      centerText,
      this.width / 2 - this.ctx.measureText(centerText).width / 2,
      this.height * 0.18,
    )
    this.ctx.font = "12px 'Silkscreen', 'Courier New', Monaco, monospace"
    this.ctx.fillStyle = this.rgba(this.color, 0.72)
    this.ctx.fillText(
      subText,
      this.width / 2 - this.ctx.measureText(subText).width / 2,
      this.height * 0.18 + 24,
    )
  }

  updateErrorStreams() {
    const templates = [
      "ERROR::AUTH_GATEWAY_DENIED",
      "ERROR::KERNEL_PANIC_SIGNAL",
      "FATAL::TRACE_ROUTE_COLLAPSE",
      "ERROR::PAYLOAD_CORRUPTED",
      "ALERT::SECURITY_LOCKDOWN",
      "WARN::MEMORY_LEAK_DETECTED",
      "ERROR::HANDSHAKE_TIMEOUT",
      "FATAL::BARRIER_OVERRIDE_FAIL",
      "ERROR::INVALID_ROOT_TOKEN",
    ]
    this.errorStreams.forEach((line) => {
      line.y += line.speed
      if (line.y > this.height + 40) {
        line.y = -20 - Math.random() * 80
        line.x = Math.random() * this.width
        line.speed = 1.4 + Math.random() * 2.1
        line.alpha = 0.25 + Math.random() * 0.55
        line.text = templates[Math.floor(Math.random() * templates.length)]
        line.size = Math.random() > 0.8 ? 13 : 11
      }
    })
  }

  drawErrorOverlay() {
    if (this.phase !== "error") return

    const danger = this.ctx.createLinearGradient(0, 0, 0, this.height)
    danger.addColorStop(0, "rgba(34, 0, 0, 0.24)")
    danger.addColorStop(0.5, "rgba(18, 2, 2, 0.36)")
    danger.addColorStop(1, "rgba(40, 0, 0, 0.22)")
    this.ctx.fillStyle = danger
    this.ctx.fillRect(0, 0, this.width, this.height)

    const title = "SYSTEM FAILURE"
    const sub = `error flood ${Math.floor(this.errorProgress * 100)}%`
    this.ctx.font = "600 22px 'Silkscreen', 'Courier New', Monaco, monospace"
    this.ctx.fillStyle = "rgba(255,120,120,0.95)"
    this.ctx.fillText(
      title,
      this.width / 2 - this.ctx.measureText(title).width / 2,
      this.height * 0.16,
    )
    this.ctx.font = "12px 'Silkscreen', 'Courier New', Monaco, monospace"
    this.ctx.fillStyle = "rgba(255,170,170,0.82)"
    this.ctx.fillText(
      sub,
      this.width / 2 - this.ctx.measureText(sub).width / 2,
      this.height * 0.16 + 22,
    )

    const popupTemplates = [
      "AUTH_GATEWAY_DENIED",
      "KERNEL_PANIC_SIGNAL",
      "TRACE_ROUTE_COLLAPSE",
      "PAYLOAD_CORRUPTED",
      "SECURITY_LOCKDOWN",
      "INVALID_ROOT_TOKEN",
      "MEMORY_CORE_DAMAGED",
      "PROCESS_TREE_BROKEN",
      "REACTOR_SIGNAL_LOST",
    ]

    const popupCount = Math.min(6, this.errorPopups.length)
    const baseW = Math.min(320, this.width * 0.32)
    const baseH = 70

    for (let i = 0; i < popupCount; i += 1) {
      const popup = this.errorPopups[i]
      if (!popup) continue
      const anchorX = popup.x
      const anchorY = popup.y

      const phase = this.tick * 0.22 + i * 1.4
      const pulse = (Math.sin(phase) + 1) * 0.5
      const jitterX = Math.sin(this.tick * 0.1 + i) * 1.2
      const jitterY = Math.cos(this.tick * 0.08 + i * 0.6) * 1
      const x = anchorX + jitterX
      const y = anchorY + jitterY
      const w = baseW
      const h = baseH
      const alpha = 0.52 + pulse * 0.24

      this.roundRect(x, y, w, h, 8)
      this.ctx.fillStyle = `rgba(30, 7, 10, ${Math.max(0.2, alpha)})`
      this.ctx.fill()
      this.ctx.strokeStyle = `rgba(255, 96, 96, ${0.46 + pulse * 0.28})`
      this.ctx.lineWidth = 1.2
      this.ctx.stroke()

      this.ctx.font = "600 11px 'Silkscreen', 'Courier New', Monaco, monospace"
      this.ctx.fillStyle = "rgba(255,185,185,0.92)"
      this.ctx.fillText("POPUP ALERT", x + 10, y + 18)

      const code =
        popupTemplates[(Math.floor(this.tick / 12) + i) % popupTemplates.length]
      this.ctx.font = "10px 'Silkscreen', 'Courier New', Monaco, monospace"
      this.ctx.fillStyle = "rgba(255,128,128,0.9)"
      this.ctx.fillText(`ERROR::${code}`, x + 10, y + 35)

      const meterW = w - 20
      const meterProgress = ((this.tick * 1.1 + i * 13) % 100) / 100
      this.ctx.fillStyle = "rgba(70, 16, 18, 0.78)"
      this.ctx.fillRect(x + 10, y + 44, meterW, 9)
      this.ctx.fillStyle = `rgba(255,85,85,${0.6 + pulse * 0.28})`
      this.ctx.fillRect(x + 10, y + 44, meterW * meterProgress, 9)
    }
  }

  drawBackdrop() {
    const radial = this.ctx.createRadialGradient(
      this.width * 0.5,
      this.height * 0.45,
      0,
      this.width * 0.5,
      this.height * 0.45,
      Math.max(this.width, this.height) * 0.65,
    )
    radial.addColorStop(0, this.rgba(this.color, 0.16))
    radial.addColorStop(0.42, "rgba(11, 20, 29, 0.12)")
    radial.addColorStop(1, "rgba(2, 6, 10, 0)")

    this.ctx.fillStyle = "#03080d"
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.ctx.fillStyle = radial
    this.ctx.fillRect(0, 0, this.width, this.height)

    this.ctx.strokeStyle = this.rgba(this.color, 0.08)
    this.ctx.lineWidth = 1
    for (let x = 0; x < this.width; x += 36) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.height)
      this.ctx.stroke()
    }
    for (let y = 0; y < this.height; y += 36) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.width, y)
      this.ctx.stroke()
    }

    this.stars.forEach((star) => {
      star.x -= star.speed
      star.pulse += 0.04
      if (star.x < -2) {
        star.x = this.width + 2
        star.y = Math.random() * this.height
      }
      this.ctx.globalAlpha = star.alpha + (Math.sin(star.pulse) + 1) * 0.12
      this.ctx.fillStyle = "#d2f9ff"
      this.ctx.fillRect(star.x, star.y, star.size, star.size)
    })
    this.ctx.globalAlpha = 1

    this.glowPixels.forEach((pixel) => {
      pixel.x += pixel.driftX
      pixel.y += pixel.driftY
      pixel.pulse += 0.05
      if (pixel.x < -10) pixel.x = this.width + 10
      if (pixel.x > this.width + 10) pixel.x = -10
      if (pixel.y < -10) pixel.y = this.height + 10
      if (pixel.y > this.height + 10) pixel.y = -10

      this.ctx.fillStyle = this.rgba(
        this.color,
        0.08 + (Math.sin(pixel.pulse) + 1) * 0.08,
      )
      this.ctx.fillRect(pixel.x, pixel.y, pixel.size, pixel.size)
    })
  }

  updateWindows() {
    this.windows.forEach((windowData) => {
      const lineHeight = 16
      const bottomLimit = windowData.height - 16
      const speed =
        windowData.profile === "system"
          ? 0.72
          : windowData.profile === "trace"
            ? 0.56
            : 0.48
      let highestY = Math.max(...windowData.lines.map((line) => line.y))

      windowData.lines.forEach((line) => {
        line.y -= speed
        if (line.revealCount < line.fullText.length) {
          line.revealCount = Math.min(
            line.fullText.length,
            line.revealCount + line.revealSpeed,
          )
        }
        if (line.y < 26) {
          highestY += lineHeight
          Object.assign(
            line,
            this.createLineEntry(
              windowData.profile,
              Math.max(bottomLimit, highestY),
            ),
          )
        }
      })

      windowData.sweep += windowData.sweepSpeed
      if (windowData.sweep > windowData.height + 40) {
        windowData.sweep = -35
      }
    })
  }

  drawWindow(windowData) {
    const headerHeight = 24
    const padding = 14

    this.ctx.shadowColor = this.rgba(this.color, 0.18)
    this.ctx.shadowBlur = 24
    this.ctx.shadowOffsetY = 10
    this.roundRect(
      windowData.x,
      windowData.y,
      windowData.width,
      windowData.height,
      10,
    )
    this.ctx.fillStyle = "rgba(5, 12, 16, 0.72)"
    this.ctx.fill()
    this.ctx.shadowColor = "transparent"

    this.ctx.lineWidth = 1.5
    this.ctx.strokeStyle = this.rgba(this.color, 0.42)
    this.ctx.stroke()

    this.ctx.fillStyle = "rgba(10, 24, 29, 0.92)"
    this.ctx.fillRect(
      windowData.x,
      windowData.y,
      windowData.width,
      headerHeight,
    )
    this.ctx.fillStyle = this.rgba(this.color, 0.92)
    this.ctx.font = "600 12px 'Silkscreen', 'Courier New', Monaco, monospace"
    const title =
      this.phase === "loading"
        ? `LOAD://${windowData.profile.toUpperCase()}`
        : windowData.title
    this.ctx.fillText(title, windowData.x + 12, windowData.y + 16)
    ;[0, 1, 2].forEach((index) => {
      this.ctx.beginPath()
      this.ctx.fillStyle = this.rgba(this.color, 0.28 + index * 0.08)
      this.ctx.arc(
        windowData.x + windowData.width - 18 - index * 12,
        windowData.y + 12,
        3,
        0,
        Math.PI * 2,
      )
      this.ctx.fill()
    })

    this.ctx.save()
    this.roundRect(
      windowData.x + 1,
      windowData.y + headerHeight,
      windowData.width - 2,
      windowData.height - headerHeight - 1,
      8,
    )
    this.ctx.clip()

    const contentX = windowData.x + padding
    const contentY = windowData.y + headerHeight + 14
    const width = windowData.width - padding * 2
    const height = windowData.height - headerHeight - 18

    const contentGradient = this.ctx.createLinearGradient(
      windowData.x,
      contentY,
      windowData.x + windowData.width,
      contentY + height,
    )
    contentGradient.addColorStop(0, "rgba(5, 20, 16, 0.64)")
    contentGradient.addColorStop(1, "rgba(5, 14, 12, 0.46)")
    this.ctx.fillStyle = contentGradient
    this.ctx.fillRect(
      windowData.x,
      windowData.y + headerHeight,
      windowData.width,
      windowData.height - headerHeight,
    )

    windowData.lines.forEach((line, index) => {
      const renderedText = line.fullText.slice(0, line.revealCount)
      this.ctx.fillStyle =
        line.kind === "dim"
          ? this.rgba(this.color, 0.38)
          : this.rgba(this.color, 0.8)
      this.ctx.font = "12px 'Silkscreen', 'Courier New', Monaco, monospace"
      this.ctx.fillText(renderedText, contentX, windowData.y + line.y)

      if (
        line.blink &&
        index === Math.floor((this.tick / 10) % windowData.lines.length)
      ) {
        this.ctx.fillStyle = this.rgba(
          this.color,
          this.tick % 20 < 10 ? 0.9 : 0,
        )
        this.ctx.fillRect(
          contentX + width - 16,
          windowData.y + line.y - 10,
          8,
          12,
        )
      }
    })

    if (windowData.profile === "system") {
      const livePrompt =
        "C:\\SYS> run breach_sequence --live --trace --mask ghost"
      const promptY = windowData.y + windowData.height - 18
      const promptChars = ((this.tick * 2) % (livePrompt.length + 8)) + 1
      this.ctx.fillStyle = this.rgba(this.color, 0.95)
      this.ctx.fillText(
        livePrompt.slice(0, Math.min(livePrompt.length, promptChars)),
        contentX,
        promptY,
      )
      this.ctx.fillStyle = this.rgba(this.color, this.tick % 20 < 10 ? 0.95 : 0)
      this.ctx.fillRect(contentX + width - 8, promptY - 10, 7, 12)
    }

    this.ctx.fillStyle = this.rgba(this.color, 0.22)
    if (windowData.profile === "monitor") {
      for (let index = 0; index < 24; index += 1) {
        const barHeight = 8 + ((index * 7 + this.tick) % 24)
        const x = contentX + index * 12
        this.ctx.fillRect(x, contentY + height - barHeight - 8, 7, barHeight)
      }
    }

    if (windowData.profile === "trace") {
      this.ctx.strokeStyle = this.rgba(this.color, 0.34)
      this.ctx.beginPath()
      for (let index = 0; index < 26; index += 1) {
        const x = contentX + (index / 25) * width
        const y =
          contentY +
          height * 0.72 +
          Math.sin(index * 0.65 + this.tick * 0.08) * 14
        if (index === 0) this.ctx.moveTo(x, y)
        else this.ctx.lineTo(x, y)
      }
      this.ctx.stroke()
    }

    const sweepGradient = this.ctx.createLinearGradient(
      windowData.x,
      windowData.y + windowData.sweep,
      windowData.x,
      windowData.y + windowData.sweep + 40,
    )
    sweepGradient.addColorStop(0, "rgba(0, 0, 0, 0)")
    sweepGradient.addColorStop(0.5, this.rgba(this.color, 0.14))
    sweepGradient.addColorStop(1, "rgba(0, 0, 0, 0)")
    this.ctx.fillStyle = sweepGradient
    this.ctx.fillRect(
      windowData.x,
      windowData.y + windowData.sweep,
      windowData.width,
      40,
    )

    this.ctx.restore()
  }

  drawLoadingOverlay() {
    if (this.phase !== "loading") return

    const width = Math.min(this.width * 0.46, 460)
    const height = 86
    const x = (this.width - width) / 2
    const y = Math.max(24, this.height * 0.1)
    const progressWidth = width - 32

    this.ctx.shadowColor = this.rgba(this.color, 0.24)
    this.ctx.shadowBlur = 18
    this.roundRect(x, y, width, height, 10)
    this.ctx.fillStyle = "rgba(4, 12, 15, 0.84)"
    this.ctx.fill()
    this.ctx.shadowColor = "transparent"
    this.ctx.strokeStyle = this.rgba(this.color, 0.4)
    this.ctx.lineWidth = 1.4
    this.ctx.stroke()

    this.ctx.font = "600 12px 'Silkscreen', 'Courier New', Monaco, monospace"
    this.ctx.fillStyle = this.rgba(this.color, 0.9)
    this.ctx.fillText("INITIALIZING TERMINAL PAYLOAD", x + 16, y + 22)

    const beat = (Math.sin(this.tick * 0.35) + 1) * 0.5
    this.ctx.font = "600 10px 'Silkscreen', 'Courier New', Monaco, monospace"
    this.ctx.fillStyle = this.rgba(this.color, 0.45 + beat * 0.5)
    const attemptText = `attempt ${Math.min(this.loadingAttempt, this.finalAttempt)}/${this.finalAttempt}`
    const attemptWidth = this.ctx.measureText(attemptText).width
    this.ctx.fillText(attemptText, x + width - 16 - attemptWidth, y + 22)

    this.ctx.font = "600 10px 'Silkscreen', 'Courier New', Monaco, monospace"
    this.ctx.fillStyle = this.rgba(this.color, 0.45 + beat * 0.5)
    this.ctx.fillText(`NODE NAME: ${this.systemName}`, x + 16, y + 33)
    this.ctx.fillStyle = this.rgba(this.color, 0.25 + beat * 0.45)
    for (let i = 0; i < 8; i += 1) {
      const h = 3 + (Math.sin(this.tick * 0.35 + i * 0.7) + 1) * 0.5 * 8
      this.ctx.fillRect(x + width - 76 + i * 7, y + 34 - h, 4, h)
    }

    this.ctx.fillStyle = "rgba(10, 36, 31, 0.85)"
    this.ctx.fillRect(x + 16, y + 36, progressWidth, 16)
    this.ctx.fillStyle = this.rgba(this.color, 0.88)
    this.ctx.fillRect(x + 16, y + 36, progressWidth * this.loadingProgress, 16)

    this.ctx.fillStyle = this.rgba(this.color, 0.72)
    this.ctx.fillText(
      `${Math.floor(this.loadingProgress * 100)}%`,
      x + 16,
      y + 70,
    )
    this.ctx.fillText(
      this.loadingProgress < 0.34
        ? "mapping nodes..."
        : this.loadingProgress < 0.68
          ? "injecting signal..."
          : "arming breach scripts...",
      x + 78,
      y + 70,
    )

    this.drawWorldMapRadar()
  }

  getRadarLayout(isSuccess = false) {
    const panelW = isSuccess
      ? Math.min(520, this.width * 0.54)
      : Math.min(320, this.width * 0.36)
    const panelH = isSuccess
      ? Math.min(300, this.height * 0.4)
      : Math.min(190, this.height * 0.24)
    const panelX = isSuccess
      ? this.width - panelW - 24
      : this.width - panelW - 28
    const panelY = isSuccess ? Math.max(88, this.height * 0.18) : 26
    const mapX = panelX + 14
    const mapY = panelY + 30
    const mapW = panelW - 28
    const mapH = panelH - 44
    return { panelW, panelH, panelX, panelY, mapX, mapY, mapW, mapH }
  }

  drawWorldMapRadar() {
    if (this.phase !== "loading" && this.phase !== "success") return

    const isSuccess = this.phase === "success"

    const { panelW, panelH, panelX, panelY, mapX, mapY, mapW, mapH } =
      this.getRadarLayout(isSuccess)

    this.ctx.shadowColor = this.rgba(this.color, 0.22)
    this.ctx.shadowBlur = 16
    this.roundRect(panelX, panelY, panelW, panelH, 10)
    this.ctx.fillStyle = "rgba(4, 14, 16, 0.82)"
    this.ctx.fill()
    this.ctx.shadowColor = "transparent"
    this.ctx.strokeStyle = this.rgba(this.color, 0.45)
    this.ctx.lineWidth = 1.2
    this.ctx.stroke()

    this.ctx.font = "600 11px 'Silkscreen', 'Courier New', Monaco, monospace"
    this.ctx.fillStyle = this.rgba(this.color, 0.88)
    this.ctx.fillText(
      isSuccess ? "WORLD MAP // FULL LOCK" : "WORLD MAP // RADAR",
      panelX + 12,
      panelY + 18,
    )

    this.ctx.fillStyle = "rgba(2, 12, 11, 0.86)"
    this.ctx.fillRect(mapX, mapY, mapW, mapH)

    this.ctx.strokeStyle = this.rgba(this.color, 0.16)
    this.ctx.lineWidth = 1
    for (let gx = 0; gx <= 8; gx += 1) {
      const x = mapX + (gx / 8) * mapW
      this.ctx.beginPath()
      this.ctx.moveTo(x, mapY)
      this.ctx.lineTo(x, mapY + mapH)
      this.ctx.stroke()
    }
    for (let gy = 0; gy <= 4; gy += 1) {
      const y = mapY + (gy / 4) * mapH
      this.ctx.beginPath()
      this.ctx.moveTo(mapX, y)
      this.ctx.lineTo(mapX + mapW, y)
      this.ctx.stroke()
    }

    const blocks = [
      [0.08, 0.24, 0.18, 0.22],
      [0.24, 0.38, 0.1, 0.16],
      [0.39, 0.2, 0.2, 0.3],
      [0.55, 0.42, 0.12, 0.18],
      [0.67, 0.24, 0.22, 0.26],
      [0.78, 0.56, 0.1, 0.14],
    ]
    this.ctx.fillStyle = this.rgba(this.color, 0.2)
    blocks.forEach(([bx, by, bw, bh]) => {
      this.ctx.fillRect(
        mapX + bx * mapW,
        mapY + by * mapH,
        bw * mapW,
        bh * mapH,
      )
    })

    const cx = mapX + mapW * 0.52
    const cy = mapY + mapH * 0.52
    const radius = Math.min(mapW, mapH) * 0.45
    const sweepAngle = (this.tick * (isSuccess ? 0.22 : 0.1)) % (Math.PI * 2)

    this.ctx.strokeStyle = this.rgba(this.color, 0.22)
    this.ctx.lineWidth = 1
    ;[0.35, 0.65, 1].forEach((r) => {
      this.ctx.beginPath()
      this.ctx.arc(cx, cy, radius * r, 0, Math.PI * 2)
      this.ctx.stroke()
    })

    const cone = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    cone.addColorStop(0, this.rgba(this.color, 0.25))
    cone.addColorStop(1, this.rgba(this.color, 0))
    this.ctx.fillStyle = cone
    this.ctx.beginPath()
    this.ctx.moveTo(cx, cy)
    this.ctx.arc(cx, cy, radius, sweepAngle - 0.25, sweepAngle + 0.25)
    this.ctx.closePath()
    this.ctx.fill()

    let bestLock = { index: -1, score: 0, x: 0, y: 0 }

    this.worldNodes.forEach((node, nodeIndex) => {
      const nx = mapX + node.x * mapW
      const ny = mapY + node.y * mapH
      node.pulse += 0.05

      const isNodeLocked = isSuccess && nodeIndex < this.successLockedCount

      const nodeAngle = Math.atan2(ny - cy, nx - cx)
      let delta = Math.abs(nodeAngle - sweepAngle)
      if (delta > Math.PI) delta = Math.PI * 2 - delta
      const hitBoost = delta < 0.28 ? 0.45 : 0
      const alpha =
        0.3 + ((Math.sin(node.pulse) + 1) * 0.2 + hitBoost) * node.strength
      const score = Math.max(0, 0.28 - delta) * node.strength
      if (score > bestLock.score) {
        bestLock = { index: nodeIndex, score, x: nx, y: ny }
      }

      this.ctx.fillStyle = isNodeLocked
        ? this.rgba(this.color, 0.95)
        : this.rgba(this.color, Math.min(alpha, 0.95))
      this.ctx.beginPath()
      this.ctx.arc(nx, ny, isNodeLocked ? 2.9 : 2.2, 0, Math.PI * 2)
      this.ctx.fill()

      if (isNodeLocked) {
        this.ctx.strokeStyle = this.rgba(this.color, 0.85)
        this.ctx.lineWidth = 1
        this.ctx.strokeRect(nx - 4, ny - 4, 8, 8)
        const xAlpha = Math.min(
          1,
          (this.successLockedCount - nodeIndex) * 0.18 + 0.22,
        )
        this.ctx.save()
        this.ctx.globalAlpha = xAlpha
        this.ctx.strokeStyle = "#ff4444"
        this.ctx.lineWidth = 2.2
        this.ctx.beginPath()
        this.ctx.moveTo(nx - 3, ny - 3)
        this.ctx.lineTo(nx + 3, ny + 3)
        this.ctx.moveTo(nx + 3, ny - 3)
        this.ctx.lineTo(nx - 3, ny + 3)
        this.ctx.stroke()
        this.ctx.restore()
      }
    })

    this.lockedNodeIndex =
      isSuccess || bestLock.score <= 0.03 ? -1 : bestLock.index
    if (!isSuccess && this.lockedNodeIndex !== -1) {
      const pulse = (Math.sin(this.tick * 0.45) + 1) * 0.5
      const lockR = 6 + pulse * 3
      this.ctx.strokeStyle = this.rgba(this.color, 0.7 + pulse * 0.25)
      this.ctx.lineWidth = 1.3
      this.ctx.beginPath()
      this.ctx.arc(bestLock.x, bestLock.y, lockR, 0, Math.PI * 2)
      this.ctx.stroke()

      this.ctx.beginPath()
      this.ctx.moveTo(bestLock.x - 10, bestLock.y)
      this.ctx.lineTo(bestLock.x - 4, bestLock.y)
      this.ctx.moveTo(bestLock.x + 4, bestLock.y)
      this.ctx.lineTo(bestLock.x + 10, bestLock.y)
      this.ctx.moveTo(bestLock.x, bestLock.y - 10)
      this.ctx.lineTo(bestLock.x - 4, bestLock.y)
      this.ctx.moveTo(bestLock.x, bestLock.y + 4)
      this.ctx.lineTo(bestLock.x, bestLock.y + 10)
      this.ctx.stroke()
    }

    if (isSuccess) {
      this.successShots.forEach((shot) => {
        const node = this.worldNodes[shot.nodeIndex]
        if (!node) return
        const nx = mapX + node.x * mapW
        const ny = mapY + node.y * mapH
        const maxLife = Math.max(1, shot.maxLife || 24)
        const elapsed = 1 - shot.life / maxLife
        const travelT = Math.min(1, elapsed * 1.45)
        const missileX = cx + (nx - cx) * travelT
        const missileY = cy + (ny - cy) * travelT

        this.ctx.strokeStyle = this.rgba(this.color, 0.18 + travelT * 0.45)
        this.ctx.lineWidth = 1.15
        this.ctx.beginPath()
        this.ctx.moveTo(cx, cy)
        this.ctx.lineTo(missileX, missileY)
        this.ctx.stroke()

        const angle = Math.atan2(ny - cy, nx - cx)
        this.ctx.save()
        this.ctx.translate(missileX, missileY)
        this.ctx.rotate(angle)
        this.ctx.fillStyle = "rgba(255, 120, 120, 0.95)"
        this.ctx.fillRect(-1, -1.5, 6, 3)
        this.ctx.fillStyle = this.rgba(this.color, 0.88)
        this.ctx.fillRect(-3, -1, 2, 2)
        this.ctx.restore()

        if (travelT >= 0.98) {
          const burst = Math.max(0, Math.min(1, (elapsed - 0.68) / 0.32))
          this.ctx.strokeStyle = `rgba(255, 95, 95, ${0.9 - burst * 0.5})`
          this.ctx.lineWidth = 1.6
          this.ctx.beginPath()
          this.ctx.arc(nx, ny, 5 + burst * 14, 0, Math.PI * 2)
          this.ctx.stroke()
        }
      })
    }

    this.ctx.fillStyle = this.rgba(this.color, 0.7)
    this.ctx.font = "10px 'Silkscreen', 'Courier New', Monaco, monospace"
    this.ctx.fillText(
      isSuccess
        ? `target lock ${this.successLockedCount}/${this.worldNodes.length}`
        : `radar lock ${Math.floor(this.loadingProgress * 100)}%`,
      panelX + 12,
      panelY + panelH - 8,
    )
    if (!isSuccess && this.lockedNodeIndex !== -1) {
      const confidence = Math.min(99, Math.floor((bestLock.score / 0.28) * 100))
      this.ctx.fillText(
        `target: NODE-${String(this.lockedNodeIndex + 1).padStart(2, "0")}  lock:${confidence}%`,
        panelX + panelW - 190,
        panelY + panelH - 8,
      )
    } else if (isSuccess) {
      this.ctx.fillText(
        this.successLockedCount >= this.worldNodes.length
          ? "target: all locked // fire sequence"
          : "target: mass lock in progress",
        panelX + panelW - 208,
        panelY + panelH - 8,
      )
    } else {
      this.ctx.fillText(
        "target: scanning...",
        panelX + panelW - 124,
        panelY + panelH - 8,
      )
    }
  }

  drawSuccessOverlay() {
    if (this.phase !== "success") return

    const centerX = this.width / 2
    const centerY = this.height * 0.5
    const scale = Math.max(4, Math.min(8, this.width / 220))
    const skullPattern = [
      "0011111100",
      "0111111110",
      "1111011111",
      "1111111111",
      "1110110111",
      "1111111111",
      "0111001110",
      "0010100100",
      "0011111100",
    ]
    const skullW = skullPattern[0].length * scale
    const skullH = skullPattern.length * scale
    const skullX = centerX - skullW / 2
    const skullY = centerY - skullH / 2 - 16

    this.ctx.fillStyle = "rgba(4, 10, 12, 0.68)"
    this.roundRect(skullX - 22, skullY - 22, skullW + 44, skullH + 72, 12)
    this.ctx.fill()
    this.ctx.strokeStyle = this.rgba(this.color, 0.45)
    this.ctx.lineWidth = 1.2
    this.ctx.stroke()

    skullPattern.forEach((row, rowIndex) => {
      for (let col = 0; col < row.length; col += 1) {
        if (row[col] !== "1") continue
        const pulse =
          0.58 + (Math.sin(this.tick * 0.2 + rowIndex + col) + 1) * 0.18
        this.ctx.fillStyle = this.rgba(this.color, pulse)
        this.ctx.fillRect(
          skullX + col * scale,
          skullY + rowIndex * scale,
          scale - 1,
          scale - 1,
        )
      }
    })

    this.ctx.font = "600 12px 'Silkscreen', 'Courier New', Monaco, monospace"
    this.ctx.fillStyle = this.rgba(this.color, 0.85)
    const title = "ACCESS GRANTED // FINAL STAGE"
    this.ctx.fillText(
      title,
      centerX - this.ctx.measureText(title).width / 2,
      skullY - 10,
    )

    const buttonW = 150
    const buttonH = 30
    const buttonX = centerX - buttonW / 2
    const buttonY = skullY + skullH + 20
    const blink = this.tick % 24 < 12
    this.roundRect(buttonX, buttonY, buttonW, buttonH, 6)
    this.ctx.fillStyle = blink
      ? this.rgba(this.color, 0.34)
      : "rgba(7, 26, 26, 0.58)"
    this.ctx.fill()
    this.ctx.strokeStyle = this.rgba(this.color, blink ? 0.95 : 0.45)
    this.ctx.lineWidth = 1.4
    this.ctx.stroke()

    this.ctx.font = "600 14px 'Silkscreen', 'Courier New', Monaco, monospace"
    this.ctx.fillStyle = this.rgba(this.color, blink ? 0.98 : 0.72)
    const launchText = "AUTO LAUNCH"
    this.ctx.fillText(
      launchText,
      centerX - this.ctx.measureText(launchText).width / 2,
      buttonY + 20,
    )

    const progressText =
      this.successLockedCount >= this.worldNodes.length
        ? "all targets locked // firing"
        : "locking targets..."
    this.ctx.font = "11px 'Silkscreen', 'Courier New', Monaco, monospace"
    this.ctx.fillStyle = this.rgba(this.color, 0.78)
    this.ctx.fillText(
      progressText,
      centerX - this.ctx.measureText(progressText).width / 2,
      buttonY + 50,
    )

    const autoText = "no user input required"
    this.ctx.fillStyle = this.rgba(this.color, 0.58)
    this.ctx.fillText(
      autoText,
      centerX - this.ctx.measureText(autoText).width / 2,
      buttonY + 64,
    )

    this.drawWorldMapRadar()
  }

  drawScanlines() {
    this.scanOffset = (this.scanOffset + 1.2) % 6
    this.ctx.fillStyle = "rgba(255,255,255,0.03)"
    const centerW = this.width * 0.32
    const centerX = this.width / 2
    for (let y = -this.scanOffset; y < this.height; y += 6) {
      this.ctx.fillRect(0, y, centerX - centerW / 2, 1)
      this.ctx.fillRect(
        centerX + centerW / 2,
        y,
        this.width - (centerX + centerW / 2),
        1,
      )
    }

    const noiseAlpha =
      0.03 + (Math.sin(this.tick * 0.3 + this.noiseSeed) + 1) * 0.008
    this.ctx.fillStyle = `rgba(255,255,255,${noiseAlpha})`
    for (let index = 0; index < 80; index += 1) {
      const x = Math.random() * this.width
      const y = Math.random() * this.height
      this.ctx.fillRect(x, y, 1, 1)
    }

    const vignette = this.ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      Math.min(this.width, this.height) * 0.22,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.75,
    )
    vignette.addColorStop(0, "rgba(0,0,0,0)")
    vignette.addColorStop(1, "rgba(0,0,0,0.36)")
    this.ctx.fillStyle = vignette
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  update(dt) {
    this.tick += 1
    this.updatePhase()
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height)
    this.drawBackdrop()
    if (this.phase === "loading") {
      this.updateWindows()
      this.windows.forEach((windowData) => this.drawWindow(windowData))
      this.drawLoadingOverlay()
    } else if (this.phase === "burst") {
      this.updateBurstColumns()
      this.drawBurstOverlay()
    } else if (this.phase === "error") {
      this.updateErrorStreams()
      this.updateErrorPopups()
      this.drawErrorOverlay()
    } else if (this.phase === "success") {
      this.updateWindows()
      this.windows.forEach((windowData) => this.drawWindow(windowData))
      this.drawSuccessOverlay()
    } else {
      this.updateWindows()
      this.windows.forEach((windowData) => this.drawWindow(windowData))
    }
    this.drawScanlines()
  }

  destroy() {
    this.windows = []
    this.stars = []
    this.glowPixels = []
    this.burstColumns = []
    this.worldNodes = []
    this.errorStreams = []
    this.errorPopups = []
  }
}

// ══════════════════════════════════════════════════════════════════════
// 3. MAIN FACADE EXPORT (NintendoPixelEffect)
// ══════════════════════════════════════════════════════════════════════

export class NintendoPixelEffect {
  constructor(canvasId, color = "#63f5ff", mode = "mainframe") {
    this.canvas =
      typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null
    this.active = false
    this.destroyed = false
    this._animId = null

    this.color = color || "#63f5ff"
    this.mode = mode === "classic" ? "classic" : "mainframe"

    this.lastTime = performance.now()
    this.lastClassicDraw = 0
    this.classicFpsInterval = 1000 / 30

    this._engine = null
    this._initEngine()

    this._resizeHandler = () => this.resize()
    this._visibilityHandler = () => this._onVisibilityChange()
    this._keydownHandler = (e) => {
      if (!this.active || this.destroyed) return
      if (
        e.target &&
        (e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA" ||
          e.target.tagName === "SELECT" ||
          e.target.isContentEditable)
      ) {
        return
      }
      if (this._engine && typeof this._engine.handleKeyDown === "function") {
        this._engine.handleKeyDown(e)
      }
    }

    window.addEventListener("resize", this._resizeHandler)
    window.addEventListener("keydown", this._keydownHandler)
    document.addEventListener("visibilitychange", this._visibilityHandler)
  }

  _initEngine() {
    if (this._engine && typeof this._engine.destroy === "function") {
      this._engine.destroy()
    }

    if (this.mode === "classic") {
      this._engine = new ClassicEngine(this.canvas, this.ctx, this.color)
    } else {
      this._engine = new MainframeEngine(this.canvas, this.ctx, this.color)
    }

    this.resize()
  }

  setMode(mode) {
    const targetMode = mode === "classic" ? "classic" : "mainframe"
    if (this.mode === targetMode && this._engine) return
    this.mode = targetMode
    this._initEngine()
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    }
  }

  updateAccentColor(color) {
    if (!color) return
    this.color = color
    if (this._engine) {
      this._engine.updateAccentColor(color)
    }
  }

  setMouseEnabled(_enabled) {
    // No-op: mouse interaction removed per user requirement
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.lastTime = performance.now()
    }
  }

  resize() {
    if (!this.canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = window.innerWidth
    const height = window.innerHeight

    this.canvas.width = Math.round(width * dpr)
    this.canvas.height = Math.round(height * dpr)
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.ctx.scale(dpr, dpr)
      this.ctx.imageSmoothingEnabled = false
    }

    if (this._engine) {
      this._engine.resize()
    }
  }

  animate(currentTime = performance.now()) {
    if (!this.active || this.destroyed) return
    this._animId = requestAnimationFrame((t) => this.animate(t))
    if (document.visibilityState === "hidden") return

    const dt = Math.min((currentTime - (this.lastTime || currentTime)) * 0.001, 0.1)
    this.lastTime = currentTime

    if (this._engine) {
      if (this.mode === "classic") {
        const elapsed = currentTime - this.lastClassicDraw
        if (elapsed >= this.classicFpsInterval) {
          this.lastClassicDraw = currentTime - (elapsed % this.classicFpsInterval)
          this._engine.update(dt)
          this._engine.draw()
        }
      } else {
        this._engine.update(dt)
        this._engine.draw()
      }
    }
  }

  start() {
    if (this.active || this.destroyed) return
    this.active = true
    this.lastTime = performance.now()
    this.lastClassicDraw = 0
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
      this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    }
    if (this.canvas) {
      this.canvas.style.display = "none"
    }
  }

  destroy() {
    this.stop()
    this.destroyed = true
    window.removeEventListener("resize", this._resizeHandler)
    window.removeEventListener("keydown", this._keydownHandler)
    document.removeEventListener("visibilitychange", this._visibilityHandler)

    if (this._engine && typeof this._engine.destroy === "function") {
      this._engine.destroy()
      this._engine = null
    }
  }
}
