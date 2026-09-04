/**
 * National Celebration Effect (Chào mừng Đại lễ 30/04 & 02/09)
 * Ultra-optimized, 60fps hardware-accelerated celebratory canvas animation.
 * Features:
 * - 30/04 Mode: Dinh Độc Lập, Xe tăng 390 lịch sử, Song kỳ (Cờ Tổ Quốc & Cờ Giải Phóng)
 * - 02/09 Mode: Lăng Bác & Quảng trường Ba Đình, Cột cờ Tổ Quốc lớn, Tuyên ngôn Độc lập
 * - Combined Auto Mode: Tự động luân phiên
 * - Peace Doves (Bồ câu hòa bình) with smooth flapping wings
 * - Golden Star & Willow cascade fireworks (zero lag, no shadowBlur in particle loop)
 * - Offscreen canvas caching for buildings to ensure 60fps on all devices
 */

export class ReunificationDayEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) return
    this.ctx = this.canvas.getContext("2d")
    this.active = false

    this.options = {
      mode: options.mode || "30_04", // "30_04", "02_09", "both"
      palace: options.palace !== false,
      tanks: options.tanks !== false,
      texts: options.texts !== false,
      doves: options.doves !== false,
      clickLaunch: options.clickLaunch !== false,
      speed: options.speed || 1.0,
      transparent: options.transparent !== false,
      ...options,
    }

    // Strict entity limits for high performance
    this.MAX_FIREWORKS = 2
    this.MAX_PARTICLES = 50
    this.MAX_DOVES = 2
    this.MAX_TEXTS = 2
    this.MAX_SMOKE = 8

    this.fireworks = []
    this.particles = []
    this.texts = []
    this.tanks = []
    this.doves = []
    this.smokeParticles = []

    // 30/04 Palace & Gate State
    this.gate = {
      x: 0,
      y: 0,
      state: "closed",
      angle: 0,
      width: 140,
      height: 65,
    }

    this.palace = {
      x: 0,
      y: 0,
      width: 270,
      height: 115,
    }

    this.mausoleum = {
      x: 0,
      y: 0,
      width: 260,
      height: 120,
    }

    // Slogans
    this.messages30_04 = [
      "30/04/1975 - 30/04/2026",
      "Giải Phóng Miền Nam, Thống Nhất Đất Nước!",
      "Đại Thắng Mùa Xuân 1975",
      "Non Sông Liền Một Dải",
      "Bắc Nam Sum Họp Một Nhà",
      "Việt Nam Muôn Năm!",
      "Độc Lập - Tự Do - Hạnh Phúc",
      "Rạng Rỡ Non Sông Gấm Vóc",
    ]

    this.messages02_09 = [
      "02/09/1945 - 02/09/2026",
      "Chào Mừng Quốc Khánh Nước CHXHCN Việt Nam!",
      "Tuyên Ngôn Độc Lập 02/09/1945",
      "Không Có Gì Quý Hơn Độc Lập, Tự Do",
      "Nước Việt Nam Là Một, Dân Tộc Việt Nam Là Một",
      "Chủ Tịch Hồ Chí Minh Vĩ Đại Sống Mãi!",
      "Tổ Quốc Việt Nam Quang Vinh Muôn Năm!",
      "Hào Khí Ba Đình Rực Rỡ Non Sông",
    ]

    this.fireworkColors = [
      "#FF1E27", // Red
      "#FFD700", // Gold
      "#FF9900", // Orange
      "#FFF176", // Yellow star
      "#00E5FF", // Cyan
      "#0088FF", // Blue
      "#FFFFFF", // White
    ]

    this.fps = 60
    this.fpsInterval = 1000 / this.fps
    this.lastDrawTime = 0
    this._tankTimer = 0
    this._doveTimer = 0
    this._fwTimer = 0
    this._modeSwitchTimer = 0
    this._currentSubMode = this.options.mode === "both" ? "30_04" : this.options.mode

    // Offscreen cached canvases
    this.palaceCanvas = document.createElement("canvas")
    this.mausoleumCanvas = document.createElement("canvas")

    this._resizeHandler = () => this.resize()
    this._clickHandler = (e) => this.handleClick(e)
    this._touchHandler = (e) => this.handleTouch(e)

    this.resize()
    window.addEventListener("resize", this._resizeHandler)
  }

  setOptions(newOptions = {}) {
    this.options = { ...this.options, ...newOptions }
    if (this.options.mode !== "both") {
      this._currentSubMode = this.options.mode
    }
    this.prerenderBuildings()
  }

  getEffectiveMode() {
    if (this.options.mode === "both") {
      return this._currentSubMode || "30_04"
    }
    return this.options.mode || "30_04"
  }

  resize() {
    if (!this.canvas) return
    this.width = window.innerWidth
    this.height = window.innerHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.floor(this.width * dpr)
    this.canvas.height = Math.floor(this.height * dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const scale = Math.min(1, Math.max(0.7, this.width / 1200))
    this.palace.width = 270 * scale
    this.palace.height = 115 * scale
    this.palace.x = this.width / 2
    this.palace.y = this.height - 30 * scale

    this.gate.width = 140 * scale
    this.gate.height = 65 * scale
    this.gate.x = this.palace.x
    this.gate.y = this.height - 20 * scale

    this.mausoleum.width = 260 * scale
    this.mausoleum.height = 120 * scale
    this.mausoleum.x = this.width / 2
    this.mausoleum.y = this.height - 25 * scale

    this.prerenderBuildings()
  }

  prerenderBuildings() {
    const scale = this.palace.width / 270
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    // 1. Prerender Palace (Static Structure)
    const pW = Math.ceil(this.palace.width * 1.5 * dpr)
    const pH = Math.ceil((this.palace.height + 50 * scale) * dpr)
    this.palaceCanvas.width = Math.max(10, pW)
    this.palaceCanvas.height = Math.max(10, pH)
    const pCtx = this.palaceCanvas.getContext("2d")
    pCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this._renderStaticPalace(pCtx, this.palaceCanvas.width / (2 * dpr), this.palace.height, scale)

    // 2. Prerender Mausoleum (Static Structure)
    const mW = Math.ceil(this.mausoleum.width * 1.5 * dpr)
    const mH = Math.ceil((this.mausoleum.height + 40 * scale) * dpr)
    this.mausoleumCanvas.width = Math.max(10, mW)
    this.mausoleumCanvas.height = Math.max(10, mH)
    const mCtx = this.mausoleumCanvas.getContext("2d")
    mCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this._renderStaticMausoleum(mCtx, this.mausoleumCanvas.width / (2 * dpr), this.mausoleum.height, scale)
  }

  _renderStaticPalace(ctx, cx, cy, scale) {
    const bw = this.palace.width
    const bh = this.palace.height
    const centralW = bw * 0.32

    ctx.save()
    ctx.translate(cx, cy)

    // Lawn Base
    ctx.fillStyle = "#1e5b22"
    ctx.beginPath()
    ctx.ellipse(0, 10 * scale, bw * 0.7, 20 * scale, 0, 0, Math.PI * 2)
    ctx.fill()

    // Base Terrace
    ctx.fillStyle = "#8a8f98"
    ctx.fillRect(-bw * 0.55, -4 * scale, bw * 1.1, 8 * scale)

    // Stairs
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#b0b7c3" : "#98a0ad"
      ctx.fillRect((-bw * 0.34) / 2 + i * 4 * scale, -i * 2.5 * scale, bw * 0.34 - i * 8 * scale, 2.5 * scale)
    }

    // Main Wings
    ctx.fillStyle = "#e2e8f0"
    ctx.fillRect(-bw / 2, -bh, (bw - centralW) / 2 - 3 * scale, bh)
    ctx.fillRect(centralW / 2 + 3 * scale, -bh, (bw - centralW) / 2 - 3 * scale, bh)

    // Louvers
    ctx.fillStyle = "#334155"
    const louverGap = 8 * scale
    for (let lx = -bw / 2 + 6 * scale; lx < -centralW / 2 - 6 * scale; lx += louverGap) {
      ctx.fillRect(lx, -bh + 12 * scale, 2.5 * scale, bh - 22 * scale)
    }
    for (let rx = centralW / 2 + 8 * scale; rx < bw / 2 - 6 * scale; rx += louverGap) {
      ctx.fillRect(rx, -bh + 12 * scale, 2.5 * scale, bh - 22 * scale)
    }

    // Central Grand Section
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(-centralW / 2, -bh - 8 * scale, centralW, bh + 8 * scale)

    // Glass Windows
    ctx.fillStyle = "#0f172a"
    ctx.fillRect(-centralW / 2 + 6 * scale, -bh + 6 * scale, centralW - 12 * scale, bh - 20 * scale)

    // Pavilion on Roof
    ctx.fillStyle = "#cbd5e1"
    ctx.fillRect(-centralW / 2 - 6 * scale, -bh - 16 * scale, centralW + 12 * scale, 8 * scale)
    ctx.fillStyle = "#f1f5f9"
    ctx.fillRect(-centralW / 4, -bh - 30 * scale, centralW / 2, 14 * scale)

    // Flagpole Mast
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2 * scale
    ctx.beginPath()
    ctx.moveTo(0, -bh - 30 * scale)
    ctx.lineTo(0, -bh - 75 * scale)
    ctx.stroke()

    ctx.restore()
  }

  _renderStaticMausoleum(ctx, cx, cy, scale) {
    const bw = this.mausoleum.width
    const bh = this.mausoleum.height

    ctx.save()
    ctx.translate(cx, cy)

    // Lawn
    ctx.fillStyle = "#1e5b22"
    ctx.beginPath()
    ctx.ellipse(0, 12 * scale, bw * 0.72, 22 * scale, 0, 0, Math.PI * 2)
    ctx.fill()

    // Base Steps
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#5a181b" : "#451215"
      const fw = bw * (1.1 - i * 0.04)
      ctx.fillRect(-fw / 2, -i * 3.5 * scale, fw, 3.5 * scale)
    }

    // Main Columns Section
    const colW = bw * 0.85
    const colH = bh * 0.45
    const colTopY = -18 * scale - colH

    ctx.fillStyle = "#1e0b0d"
    ctx.fillRect(-colW / 2, colTopY, colW, colH)

    // 8 Columns
    const cols = 8
    const gap = colW / (cols + 1)
    ctx.fillStyle = "#8a2d32"
    for (let c = 1; c <= cols; c++) {
      ctx.fillRect(-colW / 2 + c * gap - 4 * scale, colTopY, 8 * scale, colH)
    }

    // Header Band with Inscription
    const headerH = 16 * scale
    const headerY = colTopY - headerH
    ctx.fillStyle = "#4a1215"
    ctx.fillRect(-bw * 0.45, headerY, bw * 0.9, headerH)

    ctx.fillStyle = "#FFD700"
    ctx.font = `bold ${Math.round(8 * scale)}px Arial, sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("CHỦ TỊCH HỒ-CHÍ-MINH", 0, headerY + headerH / 2)

    // Stepped Roof
    for (let r = 0; r < 3; r++) {
      ctx.fillStyle = "#702226"
      const rw = bw * (0.82 - r * 0.08)
      const rh = 7 * scale
      ctx.fillRect(-rw / 2, headerY - (r + 1) * rh, rw, rh)
    }

    // Ba Dinh Flagpole
    const poleX = bw * 0.5
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2.5 * scale
    ctx.beginPath()
    ctx.moveTo(poleX, -10 * scale)
    ctx.lineTo(poleX, -85 * scale)
    ctx.stroke()

    ctx.restore()
  }

  handleClick(e) {
    if (!this.options.clickLaunch || !this.active) return
    const rect = this.canvas.getBoundingClientRect()
    this.launchTargetedFirework(e.clientX - rect.left, e.clientY - rect.top)
  }

  handleTouch(e) {
    if (!this.options.clickLaunch || !this.active || !e.touches.length) return
    const rect = this.canvas.getBoundingClientRect()
    this.launchTargetedFirework(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top)
  }

  launchTargetedFirework(targetX, targetY) {
    if (this.fireworks.length >= this.MAX_FIREWORKS) return
    const color = this.fireworkColors[Math.floor(Math.random() * this.fireworkColors.length)]
    this.fireworks.push({
      x: targetX + (Math.random() - 0.5) * 60,
      y: this.height,
      targetX,
      targetY: Math.max(40, targetY),
      speed: 12 + Math.random() * 3,
      color,
      trail: [],
      size: 2.2,
      isUserClick: true,
    })
  }

  drawStar(cx, cy, spikes, outerRadius, innerRadius, ctx) {
    let rot = (Math.PI / 2) * 3
    let x = cx
    let y = cy
    const step = Math.PI / spikes

    ctx.beginPath()
    ctx.moveTo(cx, cy - outerRadius)
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius
      y = cy + Math.sin(rot) * outerRadius
      ctx.lineTo(x, y)
      rot += step

      x = cx + Math.cos(rot) * innerRadius
      y = cy + Math.sin(rot) * innerRadius
      ctx.lineTo(x, y)
      rot += step
    }
    ctx.lineTo(cx, cy - outerRadius)
    ctx.closePath()
  }

  // Draw Dynamic Flags on Palace
  drawDynamicPalace() {
    if (!this.options.palace) return
    const ctx = this.ctx
    const p = this.palace
    const scale = p.width / 270
    const time = Date.now() * 0.003
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    // Draw cached static palace
    ctx.drawImage(
      this.palaceCanvas,
      p.x - this.palaceCanvas.width / (2 * dpr),
      p.y - this.palace.height,
      this.palaceCanvas.width / dpr,
      this.palaceCanvas.height / dpr,
    )

    // Draw Waving Flags (National & Liberation)
    const flagW = 32 * scale
    const flagH = 20 * scale
    const topY = p.y - this.palace.height - 75 * scale

    // 1. National Flag (Right)
    ctx.save()
    ctx.translate(p.x, topY)
    ctx.fillStyle = "#DA251D"
    ctx.beginPath()
    ctx.moveTo(0, 0)
    for (let x = 0; x <= flagW; x += 5 * scale) {
      const wave = Math.sin(time * 3 + x * 0.2) * 2.5 * (x / flagW)
      ctx.lineTo(x, wave)
    }
    for (let x = flagW; x >= 0; x -= 5 * scale) {
      const wave = Math.sin(time * 3 + x * 0.2) * 2.5 * (x / flagW)
      ctx.lineTo(x, flagH + wave)
    }
    ctx.closePath()
    ctx.fill()

    // Star
    ctx.fillStyle = "#FFFF00"
    this.drawStar(flagW * 0.45, flagH / 2, 5, 5 * scale, 2.2 * scale, ctx)
    ctx.fill()
    ctx.restore()

    // 2. Liberation Flag (Left)
    ctx.save()
    ctx.translate(p.x, topY + 12 * scale)
    const libW = 28 * scale
    const libH = 18 * scale

    // Top Red
    ctx.fillStyle = "#DA251D"
    ctx.beginPath()
    ctx.moveTo(0, 0)
    for (let x = 0; x >= -libW; x -= 5 * scale) {
      const wave = Math.sin(time * 3 + Math.abs(x) * 0.2 + 1) * 2 * (Math.abs(x) / libW)
      ctx.lineTo(x, wave)
    }
    for (let x = -libW; x <= 0; x += 5 * scale) {
      const wave = Math.sin(time * 3 + Math.abs(x) * 0.2 + 1) * 2 * (Math.abs(x) / libW)
      ctx.lineTo(x, libH / 2 + wave)
    }
    ctx.closePath()
    ctx.fill()

    // Bottom Blue
    ctx.fillStyle = "#0066CC"
    ctx.beginPath()
    ctx.moveTo(0, libH / 2)
    for (let x = 0; x >= -libW; x -= 5 * scale) {
      const wave = Math.sin(time * 3 + Math.abs(x) * 0.2 + 1) * 2 * (Math.abs(x) / libW)
      ctx.lineTo(x, libH / 2 + wave)
    }
    for (let x = -libW; x <= 0; x += 5 * scale) {
      const wave = Math.sin(time * 3 + Math.abs(x) * 0.2 + 1) * 2 * (Math.abs(x) / libW)
      ctx.lineTo(x, libH + wave)
    }
    ctx.closePath()
    ctx.fill()

    // Star
    ctx.fillStyle = "#FFFF00"
    this.drawStar(-libW * 0.45, libH / 2, 5, 4.5 * scale, 2 * scale, ctx)
    ctx.fill()
    ctx.restore()
  }

  drawGate() {
    if (!this.options.palace) return
    const ctx = this.ctx
    const gate = this.gate
    const scale = gate.width / 140

    if (gate.state === "opening") {
      gate.angle += 0.05
      if (gate.angle >= Math.PI / 2.2) {
        gate.angle = Math.PI / 2.2
        gate.state = "open"
      }
    }

    ctx.save()
    ctx.translate(gate.x, gate.y)

    // Left Gate Wing
    ctx.save()
    ctx.translate(-gate.width / 2, 0)
    ctx.rotate(-gate.angle)
    ctx.strokeStyle = "#1F2937"
    ctx.lineWidth = 2 * scale
    ctx.strokeRect(0, -gate.height, gate.width / 2, gate.height)
    ctx.restore()

    // Right Gate Wing
    ctx.save()
    ctx.translate(gate.width / 2, 0)
    ctx.rotate(gate.angle)
    ctx.strokeStyle = "#1F2937"
    ctx.lineWidth = 2 * scale
    ctx.strokeRect(-gate.width / 2, -gate.height, gate.width / 2, gate.height)
    ctx.restore()

    ctx.restore()
  }

  // Draw Dynamic Mausoleum & Flag
  drawDynamicMausoleum() {
    if (!this.options.palace) return
    const ctx = this.ctx
    const m = this.mausoleum
    const scale = m.width / 260
    const time = Date.now() * 0.003
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    ctx.drawImage(
      this.mausoleumCanvas,
      m.x - this.mausoleumCanvas.width / (2 * dpr),
      m.y - this.mausoleum.height,
      this.mausoleumCanvas.width / dpr,
      this.mausoleumCanvas.height / dpr,
    )

    // Grand Ba Dinh Flag
    const poleX = m.x + (this.mausoleum.width / 2) * 0.5
    const flagW = 40 * scale
    const flagH = 26 * scale
    const topY = m.y - 85 * scale

    ctx.save()
    ctx.translate(poleX, topY)
    ctx.fillStyle = "#DA251D"
    ctx.beginPath()
    ctx.moveTo(0, 0)
    for (let x = 0; x <= flagW; x += 5 * scale) {
      const wave = Math.sin(time * 3.5 + x * 0.18) * 3 * (x / flagW)
      ctx.lineTo(x, wave)
    }
    for (let x = flagW; x >= 0; x -= 5 * scale) {
      const wave = Math.sin(time * 3.5 + x * 0.18) * 3 * (x / flagW)
      ctx.lineTo(x, flagH + wave)
    }
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = "#FFFF00"
    this.drawStar(flagW * 0.45, flagH / 2, 5, 7 * scale, 3 * scale, ctx)
    ctx.fill()
    ctx.restore()
  }

  spawnTank() {
    if (!this.options.tanks || this.getEffectiveMode() === "02_09") return
    if (this.tanks.length > 0) return
    this.tanks.push({
      x: -100,
      y: this.height - 25,
      speed: (1.5 + Math.random() * 0.5) * this.options.speed,
      scale: Math.min(1, Math.max(0.7, this.width / 1200)) * 0.9,
      hasBreached: false,
    })
  }

  updateTank(tank) {
    tank.x += tank.speed

    if (Math.random() < 0.25 && this.smokeParticles.length < this.MAX_SMOKE) {
      this.smokeParticles.push({
        x: tank.x - 30 * tank.scale,
        y: tank.y - 10 * tank.scale,
        vx: -0.8,
        vy: -0.4,
        alpha: 0.5,
        size: 3 * tank.scale,
      })
    }

    if (!tank.hasBreached && tank.x >= this.gate.x - 20) {
      tank.hasBreached = true
      this.gate.state = "opening"
      this.launchFirework()
    }

    return tank.x > this.width + 120
  }

  drawTank(tank) {
    const ctx = this.ctx
    const s = tank.scale
    ctx.save()
    ctx.translate(tank.x, tank.y)
    ctx.scale(s, s)

    // Treads
    ctx.fillStyle = "#1e241c"
    ctx.beginPath()
    ctx.roundRect(-40, 4, 80, 14, 6)
    ctx.fill()

    // Hull
    ctx.fillStyle = "#3d4e33"
    ctx.fillRect(-38, -6, 76, 12)

    // Turret
    ctx.fillStyle = "#4a5d3f"
    ctx.beginPath()
    ctx.roundRect(-20, -18, 40, 14, 6)
    ctx.fill()

    // Cannon
    ctx.fillStyle = "#2e3b27"
    ctx.fillRect(16, -14, 40, 4)

    // Inscription 390
    ctx.fillStyle = "#FFD700"
    ctx.font = "bold 8px Arial, sans-serif"
    ctx.fillText("390", -4, -9)

    ctx.restore()
  }

  spawnDove() {
    if (!this.options.doves || this.doves.length >= this.MAX_DOVES) return
    const fromLeft = Math.random() < 0.5
    const x = fromLeft ? -30 : this.width + 30
    const y = this.height * (0.35 + Math.random() * 0.4)
    const angle = fromLeft ? -0.5 : -2.6
    const speed = (2.2 + Math.random() * 1.2) * this.options.speed

    this.doves.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 14 + Math.random() * 6,
      wingPhase: Math.random() * Math.PI * 2,
    })
  }

  updateDove(dove) {
    dove.x += dove.vx
    dove.y += dove.vy
    dove.wingPhase += 0.2
    return dove.x < -60 || dove.x > this.width + 60 || dove.y < -60
  }

  drawDove(dove) {
    const ctx = this.ctx
    const s = dove.size
    const wing = Math.sin(dove.wingPhase)
    const angle = Math.atan2(dove.vy, dove.vx)

    ctx.save()
    ctx.translate(dove.x, dove.y)
    ctx.rotate(angle)

    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.ellipse(0, 0, s * 0.6, s * 0.25, 0, 0, Math.PI * 2)
    ctx.fill()

    // Wings
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(s * 0.3, -s * (0.7 + wing * 0.5))
    ctx.lineTo(s * 0.5, 0)
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  }

  launchFirework() {
    if (this.fireworks.length >= this.MAX_FIREWORKS) return
    const x = this.width * (0.15 + Math.random() * 0.7)
    const targetY = this.height * (0.1 + Math.random() * 0.35)
    const color = this.fireworkColors[Math.floor(Math.random() * this.fireworkColors.length)]

    this.fireworks.push({
      x,
      y: this.height,
      targetX: x + (Math.random() - 0.5) * 80,
      targetY,
      speed: (9 + Math.random() * 4) * this.options.speed,
      color,
      trail: [],
      size: 2.2,
    })
  }

  updateFirework(fw) {
    fw.trail.push({ x: fw.x, y: fw.y })
    if (fw.trail.length > 5) fw.trail.shift()

    const dx = fw.targetX - fw.x
    const dy = fw.targetY - fw.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < 12 || fw.speed < 1.2) {
      this.burst(fw)
      return true
    }

    const angle = Math.atan2(dy, dx)
    fw.x += Math.cos(angle) * fw.speed
    fw.y += Math.sin(angle) * fw.speed
    fw.speed *= 0.985
    return false
  }

  drawFirework(fw) {
    const ctx = this.ctx
    ctx.save()
    ctx.beginPath()
    for (let i = 0; i < fw.trail.length; i++) {
      const p = fw.trail[i]
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.strokeStyle = fw.color
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(fw.x, fw.y, fw.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  burst(fw) {
    const count = 35 + Math.floor(Math.random() * 20)
    const isStar = Math.random() < 0.4

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) break
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 6 + 1.5
      this.particles.push({
        x: fw.x,
        y: fw.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: isStar ? "#FFD700" : fw.color,
        alpha: 1,
        decay: 0.016 + Math.random() * 0.015,
        size: isStar ? 2 : 1.4,
      })
    }

    // Slogan Text
    if (this.options.texts && this.texts.length < this.MAX_TEXTS && Math.random() < 0.4) {
      const mode = this.getEffectiveMode()
      const list = mode === "02_09" ? this.messages02_09 : this.messages30_04
      const msg = list[Math.floor(Math.random() * list.length)]
      this.texts.push({
        x: fw.x,
        y: fw.y,
        text: msg,
        alpha: 1,
        decay: 0.008,
      })
    }
  }

  updateParticle(p) {
    p.vx *= 0.97
    p.vy *= 0.97
    p.vy += 0.05
    p.x += p.vx
    p.y += p.vy
    p.alpha -= p.decay
    return p.alpha <= 0
  }

  drawParticle(p) {
    const ctx = this.ctx
    ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha))
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }

  updateSmoke(smk) {
    smk.x += smk.vx
    smk.y += smk.vy
    smk.size += 0.1
    smk.alpha -= 0.02
    return smk.alpha <= 0
  }

  drawSmoke(smk) {
    const ctx = this.ctx
    ctx.globalAlpha = Math.max(0, Math.min(1, smk.alpha))
    ctx.fillStyle = "#9ca3af"
    ctx.beginPath()
    ctx.arc(smk.x, smk.y, smk.size, 0, Math.PI * 2)
    ctx.fill()
  }

  updateText(t) {
    t.y -= 0.4
    t.alpha -= t.decay
    return t.alpha <= 0
  }

  drawText(t) {
    const ctx = this.ctx
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, t.alpha))
    ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif"
    ctx.textAlign = "center"

    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 3
    ctx.strokeText(t.text, t.x, t.y)

    ctx.fillStyle = "#FFD700"
    ctx.fillText(t.text, t.x, t.y)
    ctx.restore()
  }

  animate(timestamp) {
    if (!this.active) return
    this._animId = requestAnimationFrame((ts) => this.animate(ts))
    if (document.visibilityState === "hidden") return

    const elapsed = timestamp - this.lastDrawTime
    if (elapsed < this.fpsInterval) return
    this.lastDrawTime = timestamp - (elapsed % this.fpsInterval)

    const ctx = this.ctx
    const effectiveMode = this.getEffectiveMode()

    if (this.options.mode === "both") {
      this._modeSwitchTimer++
      if (this._modeSwitchTimer > 600) {
        this._currentSubMode = this._currentSubMode === "30_04" ? "02_09" : "30_04"
        this._modeSwitchTimer = 0
      }
    }

    // Clean, instant hardware clear
    ctx.clearRect(0, 0, this.width, this.height)
    if (!this.options.transparent) {
      ctx.fillStyle = "#070b14"
      ctx.fillRect(0, 0, this.width, this.height)
    }

    // 1. Draw Architecture
    if (effectiveMode === "02_09") {
      this.drawDynamicMausoleum()
    } else {
      this.drawDynamicPalace()
      this.drawGate()
    }

    // 2. Draw Tanks (30/04 only)
    if (effectiveMode === "30_04") {
      this.tanks = this.tanks.filter((t) => {
        this.drawTank(t)
        return !this.updateTank(t)
      })

      this.smokeParticles = this.smokeParticles.filter((s) => {
        this.drawSmoke(s)
        return !this.updateSmoke(s)
      })
    }

    // 3. Draw Doves
    this.doves = this.doves.filter((d) => {
      this.drawDove(d)
      return !this.updateDove(d)
    })

    // 4. Draw Fireworks & Particles with Hardware Blend
    ctx.globalCompositeOperation = "lighter"

    this._fwTimer++
    if (this._fwTimer > 45 / this.options.speed) {
      if (Math.random() < 0.4) this.launchFirework()
      this._fwTimer = 0
    }

    this._tankTimer++
    if (effectiveMode === "30_04" && this._tankTimer > 350) {
      this.spawnTank()
      this._tankTimer = 0
    }

    this._doveTimer++
    if (this._doveTimer > 250) {
      this.spawnDove()
      this._doveTimer = 0
    }

    this.fireworks = this.fireworks.filter((fw) => {
      this.drawFirework(fw)
      return !this.updateFirework(fw)
    })

    this.particles = this.particles.filter((p) => {
      this.drawParticle(p)
      return !this.updateParticle(p)
    })

    // 5. Draw Slogans
    ctx.globalCompositeOperation = "source-over"
    this.texts = this.texts.filter((t) => {
      this.drawText(t)
      return !this.updateText(t)
    })
  }

  start() {
    if (this.active) return
    this.active = true
    this.canvas.style.display = "block"
    this.resize()
    this.lastDrawTime = 0

    if (this.options.tanks && this.getEffectiveMode() === "30_04") {
      this.spawnTank()
    }
    if (this.options.doves) {
      this.spawnDove()
    }

    this.canvas.addEventListener("click", this._clickHandler)
    this.canvas.addEventListener("touchstart", this._touchHandler, { passive: true })
    this._animId = requestAnimationFrame((ts) => this.animate(ts))
  }

  stop() {
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
    this.active = false

    if (this.canvas) {
      this.canvas.style.display = "none"
      this.canvas.removeEventListener("click", this._clickHandler)
      this.canvas.removeEventListener("touchstart", this._touchHandler)
    }

    this.fireworks = []
    this.particles = []
    this.texts = []
    this.tanks = []
    this.doves = []
    this.smokeParticles = []

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  destroy() {
    this.stop()
    window.removeEventListener("resize", this._resizeHandler)
  }
}
