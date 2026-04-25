export class SvgWaveGenerator {
  constructor() {
    this.active = false
    this._waveOffsets = this._makeOffsets(20)
    this._activeLayer = 0
    this._layers = [0, 1].map((i) => this._createLayer(`svg-wave-layer-${i}`))
    this._resizeHandler = () => {
      if (this.active && this._lastParams)
        this._applyBackground(this._lastParams)
    }
    window.addEventListener("resize", this._resizeHandler)
  }

  _createLayer(id) {
    let el = document.getElementById(id)
    if (!el) {
      el = document.createElement("div")
      el.id = id
      el.style.cssText =
        "position:fixed;inset:0;z-index:-2;background-size:cover;background-position:var(--bg-pos-x, 50%) var(--bg-pos-y, 50%);filter:blur(var(--bg-blur, 0px)) brightness(var(--bg-brightness, 100%));opacity:0;pointer-events:none;"
      document.body.appendChild(el)
    }
    return el
  }

  _makeOffsets(n) {
    return Array.from({ length: n }, () => Math.random() * 2 - 1)
  }

  // Pseudo-random based on seed (deterministic per render)
  _seededRand(seed) {
    const x = Math.sin(seed + 1) * 73856
    return x - Math.floor(x)
  }

  // Linearly interpolate HSL, taking shortest hue path
  _lerpHSL(h1, s1, l1, h2, s2, l2, t) {
    let dh = h2 - h1
    if (dh > 180) dh -= 360
    if (dh < -180) dh += 360
    const h = (((h1 + dh * t) % 360) + 360) % 360
    const s = s1 + (s2 - s1) * t
    const l = l1 + (l2 - l1) * t
    return `hsl(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%)`
  }

  // Build a closed wavy SVG path (filled from wave line down to bottom)
  _makePath(
    W,
    H,
    yBase,
    amplitudeX,
    amplitudeY,
    smoothness,
    offsetX,
    waveIndex,
    craziness,
  ) {
    const segW = Math.max(amplitudeX * 2, 30)
    const numPts = Math.ceil((W + segW * 3) / segW) + 2
    const pts = []
    const baseOffset = this._waveOffsets[waveIndex % this._waveOffsets.length]

    for (let i = 0; i < numPts; i++) {
      const x = -segW * 1.5 + i * segW + (offsetX % (segW * 2))
      // Alternating peaks/troughs via sin, with per-wave phase offset + seeded craziness
      const phase = i * Math.PI + baseOffset * Math.PI
      const crazyNoise =
        (this._seededRand(waveIndex * 13 + i * 7) * 2 - 1) * craziness
      const y = yBase + Math.sin(phase) * amplitudeY + crazyNoise
      pts.push({ x, y })
    }

    // Cubic Bézier smooth path
    // Use H*3 so the closing tail extends far enough to stay filled even
    // when the whole group is rotated 90° / 270° (left / right presets).
    const tailY = H * 3
    let d = `M ${-segW * 2},${tailY}`
    d += ` L ${pts[0].x},${pts[0].y}`

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i]
      const p1 = pts[i + 1]
      const cpOffset = (p1.x - p0.x) * smoothness
      d += ` C ${p0.x + cpOffset},${p0.y} ${p1.x - cpOffset},${p1.y} ${p1.x},${p1.y}`
    }

    d += ` L ${W + segW * 2},${tailY} Z`
    return d
  }

  // Generate SVG with optional fixed dimensions (for thumbnails)
  generateSVG(params, customW, customH) {
    const W = customW || window.innerWidth || 1920
    const H = customH || window.innerHeight || 1080
    const {
      lines,
      amplitudeX,
      amplitudeY,
      offsetX,
      smoothness,
      fill,
      craziness,
      angle = 0,
      startHue,
      startSaturation,
      startLightness,
      endHue,
      endSaturation,
      endLightness,
    } = params

    const ns = "http://www.w3.org/2000/svg"
    const cx = W / 2
    const cy = H / 2
    const parts = [
      `<svg xmlns="${ns}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    ]

    // Wrap everything in a rotation group so angle tilts both background and waves.
    // The background rect is 3× oversized so corners stay filled after rotation.
    parts.push(`<g transform="rotate(${angle}, ${cx}, ${cy})">`)

    // Background rectangle with start color
    const bgColor = this._lerpHSL(
      startHue,
      startSaturation,
      startLightness,
      endHue,
      endSaturation,
      endLightness,
      0,
    )
    parts.push(
      `<rect x="${-W}" y="${-H}" width="${W * 3}" height="${H * 3}" fill="${bgColor}"/>`,
    )

    const count = Math.max(1, Math.round(lines))
    for (let i = 0; i < count; i++) {
      const t = (i + 1) / (count + 1)
      const yBase = H * t
      const color = this._lerpHSL(
        startHue,
        startSaturation,
        startLightness,
        endHue,
        endSaturation,
        endLightness,
        t,
      )

      const d = this._makePath(
        W,
        H,
        yBase,
        amplitudeX,
        amplitudeY,
        smoothness,
        offsetX,
        i,
        craziness,
      )

      if (fill) {
        parts.push(`<path d="${d}" fill="${color}" fill-opacity="0.88"/>`)
      } else {
        parts.push(
          `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-opacity="0.9"/>`,
        )
      }
    }

    parts.push("</g>")
    parts.push("</svg>")
    return parts.join("")
  }

  // Generate a compact thumbnail data URI (80x55) for gallery display
  generateThumbnailDataUri(params) {
    const svg = this.generateSVG(params, 80, 55)
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  }

  _applyBackground(params, fade = false) {
    this._lastParams = params
    const svgStr = this.generateSVG(params)
    const encoded = encodeURIComponent(svgStr)
    const url = `url("data:image/svg+xml,${encoded}")`

    // Let our fixed div layers act as the background
    document.body.style.removeProperty("background")
    document.body.style.removeProperty("background-image")
    document.body.classList.add("bg-image-active")

    const currEl = this._layers[this._activeLayer]
    const nextEl = this._layers[1 - this._activeLayer]

    if (fade) {
      // A/B crossfade: prepare next layer off-screen, then animate
      nextEl.style.transition = "none"
      nextEl.style.backgroundImage = url
      nextEl.style.opacity = "0"
      void nextEl.offsetHeight // force reflow
      nextEl.style.transition = "opacity 0.5s ease"
      nextEl.style.opacity = "1"
      currEl.style.transition = "opacity 0.5s ease"
      currEl.style.opacity = "0"
      this._activeLayer = 1 - this._activeLayer
    } else {
      // Instant apply — no transition
      currEl.style.transition = "none"
      currEl.style.backgroundImage = url
      currEl.style.opacity = "1"
      nextEl.style.transition = "none"
      nextEl.style.opacity = "0"
      nextEl.style.backgroundImage = ""
    }
  }

  start(params) {
    this.active = true
    this._applyBackground(params)
  }

  update(params, fade = false) {
    if (this.active) this._applyBackground(params, fade)
  }

  stop() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    this.active = false
    this._lastParams = null
    this._layers.forEach((el) => {
      el.style.transition = "none"
      el.style.opacity = "0"
      el.style.backgroundImage = ""
    })
    this._activeLayer = 0
    document.body.classList.remove("bg-image-active")
    // Background will be reset by applySettings
  }

  // Regenerate random wave offsets and return a full randomized params object
  randomize() {
    this._waveOffsets = this._makeOffsets(20)
    return {
      lines: 3 + Math.floor(Math.random() * 8),
      amplitudeX: 80 + Math.floor(Math.random() * 320),
      amplitudeY: 20 + Math.floor(Math.random() * 120),
      offsetX: Math.floor(Math.random() * 300),
      smoothness: Math.round((0.2 + Math.random() * 0.75) * 100) / 100,
      fill: Math.random() > 0.25,
      craziness: Math.floor(Math.random() * 120),
      angle: Math.floor(Math.random() * 60) - 30,
      startHue: Math.floor(Math.random() * 360),
      startSaturation: 40 + Math.floor(Math.random() * 55),
      startLightness: 15 + Math.floor(Math.random() * 40),
      endHue: Math.floor(Math.random() * 360),
      endSaturation: 40 + Math.floor(Math.random() * 55),
      endLightness: 20 + Math.floor(Math.random() * 35),
    }
  }

  destroy() {
    window.removeEventListener("resize", this._resizeHandler)
  }
}
