export class NintendoPixelEffect {
  constructor(canvasId, color = "#63f5ff") {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext("2d")
    this.active = false
    this.color = color
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
    this._resizeHandler = () => this.resize()
    window.addEventListener("resize", this._resizeHandler)
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.initScene()
  }

  initScene() {
    this.loadingAttempt = 0
    this.startLoadingAttempt()

    const starCount = Math.max(
      32,
      Math.floor((this.canvas.width * this.canvas.height) / 28000),
    )
    const glowCount = Math.max(
      18,
      Math.floor((this.canvas.width * this.canvas.height) / 110000),
    )

    this.stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      size: Math.random() > 0.7 ? 2 : 1,
      speed: Math.random() * 0.35 + 0.12,
      alpha: Math.random() * 0.35 + 0.15,
      pulse: Math.random() * Math.PI * 2,
    }))

    this.glowPixels = Array.from({ length: glowCount }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
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
    const count = Math.max(24, Math.floor(this.canvas.width / 42))
    this.errorStreams = Array.from({ length: count }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      speed: 1.4 + Math.random() * 2.1,
      alpha: 0.25 + Math.random() * 0.55,
      text: templates[Math.floor(Math.random() * templates.length)],
      blinkOffset: Math.random() * Math.PI * 2,
      size: Math.random() > 0.8 ? 13 : 11,
    }))
  }

  initErrorPopups() {
    const popupCount = 26
    const baseW = Math.min(320, this.canvas.width * 0.32)
    const baseH = 70
    this.errorPopups = Array.from({ length: popupCount }, () => {
      const x = 22 + Math.random() * (this.canvas.width - baseW - 44)
      const y = 86 + Math.random() * (this.canvas.height - baseH - 128)
      return {
        x,
        y,
        nextRespawnTick: this.tick + 10 + Math.floor(Math.random() * 36),
      }
    })
  }

  updateErrorPopups() {
    if (!this.errorPopups.length) return

    const baseW = Math.min(320, this.canvas.width * 0.32)
    const baseH = 70
    const minX = 22
    const maxX = Math.max(minX + 1, this.canvas.width - baseW - 44)
    const minY = 86
    const maxY = Math.max(minY + 1, this.canvas.height - baseH - 128)

    this.errorPopups.forEach((popup) => {
      // Stationary popups: only respawn at a new random spot, no sliding.
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
    const columnCount = Math.max(18, Math.ceil(this.canvas.width / columnWidth))
    this.burstColumns = Array.from({ length: columnCount }, (_, index) => ({
      x: index * columnWidth,
      y: this.canvas.height + Math.random() * this.canvas.height,
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

  updateAccentColor(color) {
    this.color = color
  }

  rgba(hex, alpha) {
    const normalized = (hex || this.color).replace("#", "")
    const value =
      normalized.length === 3
        ? normalized
            .split("")
            .map((part) => part + part)
            .join("")
        : normalized
    const r = parseInt(value.slice(0, 2), 16)
    const g = parseInt(value.slice(2, 4), 16)
    const b = parseInt(value.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
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
    const margin = Math.min(70, this.canvas.width * 0.05)
    const isCompact = this.canvas.width < 900
    const largeWidth = Math.min(this.canvas.width - margin * 2, 720)
    const panelHeight = isCompact ? 180 : 210
    const topY = Math.max(48, this.canvas.height * 0.08)
    const bottomY = topY + panelHeight + 26
    const leftX = margin
    const rightWidth = Math.min(this.canvas.width - margin * 2, 420)
    const rightX = this.canvas.width - margin - rightWidth

    const windows = [
      {
        title: "SYS://BREACH-CORE",
        x: leftX,
        y: topY,
        width: isCompact ? this.canvas.width - margin * 2 : largeWidth,
        height: panelHeight,
        profile: "system",
      },
      {
        title: "MONITOR://AUTH-BYPASS",
        x: leftX,
        y: bottomY,
        width: isCompact
          ? this.canvas.width - margin * 2
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
        column.y = this.canvas.height + Math.random() * 120
        column.speed = 1.8 + Math.random() * 2.6
        column.text = this.createBurstText()
        column.reveal = 12 + Math.floor(Math.random() * 20)
      }
    })
  }

  drawBurstOverlay() {
    if (this.phase !== "burst") return

    const overlay = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height)
    overlay.addColorStop(0, "rgba(2, 10, 8, 0.12)")
    overlay.addColorStop(0.5, "rgba(0, 18, 12, 0.24)")
    overlay.addColorStop(1, "rgba(0, 8, 6, 0.12)")
    this.ctx.fillStyle = overlay
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.font = "12px Silkscreen, monospace"
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
    this.ctx.font = "600 18px Silkscreen, monospace"
    this.ctx.fillText(
      centerText,
      this.canvas.width / 2 - this.ctx.measureText(centerText).width / 2,
      this.canvas.height * 0.18,
    )
    this.ctx.font = "12px Silkscreen, monospace"
    this.ctx.fillStyle = this.rgba(this.color, 0.72)
    this.ctx.fillText(
      subText,
      this.canvas.width / 2 - this.ctx.measureText(subText).width / 2,
      this.canvas.height * 0.18 + 24,
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
      if (line.y > this.canvas.height + 40) {
        line.y = -20 - Math.random() * 80
        line.x = Math.random() * this.canvas.width
        line.speed = 1.4 + Math.random() * 2.1
        line.alpha = 0.25 + Math.random() * 0.55
        line.text = templates[Math.floor(Math.random() * templates.length)]
        line.size = Math.random() > 0.8 ? 13 : 11
      }
    })
  }

  drawErrorOverlay() {
    if (this.phase !== "error") return

    const danger = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height)
    danger.addColorStop(0, "rgba(34, 0, 0, 0.24)")
    danger.addColorStop(0.5, "rgba(18, 2, 2, 0.36)")
    danger.addColorStop(1, "rgba(40, 0, 0, 0.22)")
    this.ctx.fillStyle = danger
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    const title = "SYSTEM FAILURE"
    const sub = `error flood ${Math.floor(this.errorProgress * 100)}%`
    this.ctx.font = "600 22px Silkscreen, monospace"
    this.ctx.fillStyle = "rgba(255,120,120,0.95)"
    this.ctx.fillText(
      title,
      this.canvas.width / 2 - this.ctx.measureText(title).width / 2,
      this.canvas.height * 0.16,
    )
    this.ctx.font = "12px Silkscreen, monospace"
    this.ctx.fillStyle = "rgba(255,170,170,0.82)"
    this.ctx.fillText(
      sub,
      this.canvas.width / 2 - this.ctx.measureText(sub).width / 2,
      this.canvas.height * 0.16 + 22,
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
    const baseW = Math.min(320, this.canvas.width * 0.32)
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

      this.ctx.font = "600 11px Silkscreen, monospace"
      this.ctx.fillStyle = "rgba(255,185,185,0.92)"
      this.ctx.fillText("POPUP ALERT", x + 10, y + 18)

      const code =
        popupTemplates[(Math.floor(this.tick / 12) + i) % popupTemplates.length]
      this.ctx.font = "10px Silkscreen, monospace"
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
      this.canvas.width * 0.5,
      this.canvas.height * 0.45,
      0,
      this.canvas.width * 0.5,
      this.canvas.height * 0.45,
      Math.max(this.canvas.width, this.canvas.height) * 0.65,
    )
    radial.addColorStop(0, this.rgba(this.color, 0.16))
    radial.addColorStop(0.42, "rgba(11, 20, 29, 0.12)")
    radial.addColorStop(1, "rgba(2, 6, 10, 0)")

    this.ctx.fillStyle = "#03080d"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.fillStyle = radial
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.strokeStyle = this.rgba(this.color, 0.08)
    this.ctx.lineWidth = 1
    for (let x = 0; x < this.canvas.width; x += 36) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.canvas.height)
      this.ctx.stroke()
    }
    for (let y = 0; y < this.canvas.height; y += 36) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.canvas.width, y)
      this.ctx.stroke()
    }

    this.stars.forEach((star) => {
      star.x -= star.speed
      star.pulse += 0.04
      if (star.x < -2) {
        star.x = this.canvas.width + 2
        star.y = Math.random() * this.canvas.height
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
      if (pixel.x < -10) pixel.x = this.canvas.width + 10
      if (pixel.x > this.canvas.width + 10) pixel.x = -10
      if (pixel.y < -10) pixel.y = this.canvas.height + 10
      if (pixel.y > this.canvas.height + 10) pixel.y = -10

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
    this.ctx.font = "600 12px Silkscreen, monospace"
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
      this.ctx.font = "12px Silkscreen, monospace"
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

    const width = Math.min(this.canvas.width * 0.46, 460)
    const height = 86
    const x = (this.canvas.width - width) / 2
    const y = Math.max(24, this.canvas.height * 0.1)
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

    this.ctx.font = "600 12px Silkscreen, monospace"
    this.ctx.fillStyle = this.rgba(this.color, 0.9)
    this.ctx.fillText("INITIALIZING TERMINAL PAYLOAD", x + 16, y + 22)

    const beat = (Math.sin(this.tick * 0.35) + 1) * 0.5
    this.ctx.font = "600 10px Silkscreen, monospace"
    this.ctx.fillStyle = this.rgba(this.color, 0.45 + beat * 0.5)
    const attemptText = `attempt ${Math.min(this.loadingAttempt, this.finalAttempt)}/${this.finalAttempt}`
    const attemptWidth = this.ctx.measureText(attemptText).width
    this.ctx.fillText(attemptText, x + width - 16 - attemptWidth, y + 22)

    this.ctx.font = "600 10px Silkscreen, monospace"
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
      ? Math.min(520, this.canvas.width * 0.54)
      : Math.min(320, this.canvas.width * 0.36)
    const panelH = isSuccess
      ? Math.min(300, this.canvas.height * 0.4)
      : Math.min(190, this.canvas.height * 0.24)
    const panelX = isSuccess
      ? this.canvas.width - panelW - 24
      : this.canvas.width - panelW - 28
    const panelY = isSuccess ? Math.max(88, this.canvas.height * 0.18) : 26
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

    this.ctx.font = "600 11px Silkscreen, monospace"
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

    // Stylized continent blocks
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
        // Animate X mark
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
      this.ctx.lineTo(bestLock.x, bestLock.y - 4)
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

        // Missile trail
        this.ctx.strokeStyle = this.rgba(this.color, 0.18 + travelT * 0.45)
        this.ctx.lineWidth = 1.15
        this.ctx.beginPath()
        this.ctx.moveTo(cx, cy)
        this.ctx.lineTo(missileX, missileY)
        this.ctx.stroke()

        // Missile head
        const angle = Math.atan2(ny - cy, nx - cx)
        this.ctx.save()
        this.ctx.translate(missileX, missileY)
        this.ctx.rotate(angle)
        this.ctx.fillStyle = "rgba(255, 120, 120, 0.95)"
        this.ctx.fillRect(-1, -1.5, 6, 3)
        this.ctx.fillStyle = this.rgba(this.color, 0.88)
        this.ctx.fillRect(-3, -1, 2, 2)
        this.ctx.restore()

        // Impact burst when missile reaches target
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
    this.ctx.font = "10px Silkscreen, monospace"
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

    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height * 0.5
    const scale = Math.max(4, Math.min(8, this.canvas.width / 220))
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

    this.ctx.font = "600 12px Silkscreen, monospace"
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

    this.ctx.font = "600 14px Silkscreen, monospace"
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
    this.ctx.font = "11px Silkscreen, monospace"
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
    const centerW = this.canvas.width * 0.32
    const centerX = this.canvas.width / 2
    for (let y = -this.scanOffset; y < this.canvas.height; y += 6) {
      this.ctx.fillRect(0, y, centerX - centerW / 2, 1)
      this.ctx.fillRect(
        centerX + centerW / 2,
        y,
        this.canvas.width - (centerX + centerW / 2),
        1,
      )
    }

    const noiseAlpha =
      0.03 + (Math.sin(this.tick * 0.3 + this.noiseSeed) + 1) * 0.008
    this.ctx.fillStyle = `rgba(255,255,255,${noiseAlpha})`
    for (let index = 0; index < 80; index += 1) {
      const x = Math.random() * this.canvas.width
      const y = Math.random() * this.canvas.height
      this.ctx.fillRect(x, y, 1, 1)
    }

    const vignette = this.ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      Math.min(this.canvas.width, this.canvas.height) * 0.22,
      this.canvas.width / 2,
      this.canvas.height / 2,
      Math.max(this.canvas.width, this.canvas.height) * 0.75,
    )
    vignette.addColorStop(0, "rgba(0,0,0,0)")
    vignette.addColorStop(1, "rgba(0,0,0,0.36)")
    this.ctx.fillStyle = vignette
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  animate(currentTime = 0) {
    if (!this.active) return
    this._animId = requestAnimationFrame((time) => this.animate(time))

    const elapsed = currentTime - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = currentTime - (elapsed % this.fpsInterval)
    this.tick += 1
    this.updatePhase()

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
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
    this.canvas.style.display = "block"
  }

  start() {
    if (this.active) return
    this.active = true
    this.lastDrawTime = 0
    this.tick = 0
    this.initScene()
    this.canvas.style.display = "block"
    this.animate(0)
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.canvas.style.display = "none"
  }
}
