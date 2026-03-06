// Music Visualizer Component
import { getSettings } from "../services/state.js"

class MusicVisualizer {
  constructor() {
    this.container = null
    this.bars = []
    this.isPlaying = false
    this.animationId = null
    this.barCount = 4
    this.currentStyle = "vinyl"
    // Pixel canvas state
    this.pixelCanvas = null
    this.pixelAnimId = null
    this.pixelPhase = []
    this.pixelSpeeds = []
    this.peakIdx = [] // segment index (integer) for each bar's peak
    this.peakTimer = 0 // accumulator for step-based drop
    this._lastTs = 0
  }

  init(musicPlayerContainer) {
    this.container = document.createElement("div")
    this.container.className = "music-visualizer"

    for (let i = 0; i < this.barCount; i++) {
      const bar = document.createElement("div")
      bar.className = "visualizer-bar"
      this.bars.push(bar)
      this.container.appendChild(bar)
    }

    const playerWrapper = musicPlayerContainer.querySelector(
      ".music-player-wrapper",
    )
    if (playerWrapper) {
      playerWrapper.appendChild(this.container)
    }

    this.setStyle(getSettings().musicBarStyle || "vinyl")
  }

  setStyle(style) {
    const prev = this.currentStyle
    this.currentStyle = style
    if (prev === "pixel" && style !== "pixel") {
      this._stopPixel()
    }
    if (style === "pixel" && !this.pixelCanvas) {
      this._startPixel()
    }
  }

  // ── Pixel canvas ─────────────────────────────────────────────────────────

  _startPixel() {
    this.bars.forEach((b) => {
      b.style.display = "none"
    })

    const canvas = document.createElement("canvas")
    canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none;"
    this.container.style.position = "relative"
    this.container.appendChild(canvas)
    this.pixelCanvas = canvas

    // Each bar gets a different oscillation speed so they look like independent EQ bands
    this.pixelSpeeds = [1.9, 2.4, 1.6, 2.8]
    this.pixelPhase = this.pixelSpeeds.map((_, i) => i * 1.1)
    this.peakIdx = new Array(this.barCount).fill(0)
    this.peakTimer = 0

    const loop = (ts) => {
      if (!this.pixelCanvas) return
      const dt = Math.min((ts - this._lastTs) / 1000, 0.05)
      this._lastTs = ts
      this._pixelFrame(dt)
      this.pixelAnimId = requestAnimationFrame(loop)
    }
    this.pixelAnimId = requestAnimationFrame((ts) => {
      this._lastTs = ts
      this.pixelAnimId = requestAnimationFrame(loop)
    })
  }

  _stopPixel() {
    if (this.pixelAnimId) {
      cancelAnimationFrame(this.pixelAnimId)
      this.pixelAnimId = null
    }
    if (this.pixelCanvas) {
      this.pixelCanvas.remove()
      this.pixelCanvas = null
    }
    this.bars.forEach((b) => {
      b.style.display = ""
    })
  }

  _pixelFrame(dt) {
    const canvas = this.pixelCanvas
    const W = this.container.offsetWidth || 120
    const H = this.container.offsetHeight || 40
    if (canvas.width !== W) canvas.width = W
    if (canvas.height !== H) canvas.height = H

    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, W, H)

    const accent =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent-color")
        .trim() || "#a8c0ff"

    const gap = 5
    const barW = Math.max(
      4,
      Math.floor((W - (this.barCount - 1) * gap) / this.barCount),
    )
    const totalW = this.barCount * barW + (this.barCount - 1) * gap
    const startX = Math.floor((W - totalW) / 2)

    const segH = 3
    const segGap = 1
    const segStep = segH + segGap
    const maxSegs = Math.floor(H / segStep)

    // Step-based peak fall: every 80ms each peak drops one segment
    if (this.isPlaying) {
      this.peakTimer += dt
      while (this.peakTimer >= 0.08) {
        this.peakTimer -= 0.08
        for (let i = 0; i < this.barCount; i++) {
          if (this.peakIdx[i] > 0) this.peakIdx[i]--
        }
      }
    }

    for (let i = 0; i < this.barCount; i++) {
      // Advance oscillation while playing
      if (this.isPlaying) {
        this.pixelPhase[i] += this.pixelSpeeds[i] * dt * Math.PI
      }

      const norm = (Math.sin(this.pixelPhase[i]) + 1) / 2 // 0..1
      const numSegs = Math.max(1, Math.round(norm * maxSegs))

      // Bar rising → push peak up
      if (numSegs > this.peakIdx[i]) {
        this.peakIdx[i] = numSegs
      }

      const x = startX + i * (barW + gap)

      // Draw segmented bar (bottom-up, accent color)
      ctx.fillStyle = accent
      for (let s = 0; s < numSegs; s++) {
        ctx.fillRect(x, H - (s + 1) * segStep, barW, segH)
      }

      // Draw white peak block at its current segment position
      if (this.peakIdx[i] > 0) {
        const py = H - this.peakIdx[i] * segStep
        if (py >= 0) {
          ctx.fillStyle = "rgba(255,255,255,0.95)"
          ctx.fillRect(x, py, barW, segH)
        }
      }
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  refresh() {}

  start() {
    if (this.isPlaying) return
    this.isPlaying = true
    if (this.currentStyle !== "pixel") {
      this.bars.forEach((bar) => bar.classList.add("playing"))
    }
  }

  stop() {
    this.isPlaying = false
    if (this.currentStyle !== "pixel") {
      this.bars.forEach((bar) => bar.classList.remove("playing"))
    }
  }

  destroy() {
    this._stopPixel()
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.bars = []
  }
}

export default MusicVisualizer
