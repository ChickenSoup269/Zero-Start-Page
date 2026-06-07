export function getContrastYIQ(hexcolor) {
  if (!hexcolor) return "white"
  var colours = {
    aliceblue: "#f0f8ff",
    antiquewhite: "#faebd7",
    aqua: "#00ffff",
    aquamarine: "#7fffd4",
    azure: "#f0ffff",
    beige: "#f5f5dc",
    bisque: "#ffe4c4",
    black: "#000000",
    blanchedalmond: "#ffebcd",
    blue: "#0000ff",
    blueviolet: "#8a2be2",
    brown: "#a52a2a",
    burlywood: "#deb887",
    cadetblue: "#5f9ea0",
    chartreuse: "#7fff00",
    chocolate: "#d2691e",
    coral: "#ff7f50",
    cornflowerblue: "#6495ed",
    cornsilk: "#fff8dc",
    crimson: "#dc143c",
    cyan: "#00ffff",
    darkblue: "#00008b",
    darkcyan: "#008b8b",
    darkgoldenrod: "#b8860b",
    darkgray: "#a9a9a9",
    darkgreen: "#006400",
    darkkhaki: "#bdb76b",
    darkmagenta: "#8b008b",
    darkolivegreen: "#556b2f",
    darkorange: "#ff8c00",
    darkorchid: "#9932cc",
    darkred: "#8b0000",
    darksalmon: "#e9967a",
    darkseagreen: "#8fbc8f",
    darkslateblue: "#483d8b",
    darkslategray: "#2f4f4f",
    darkturquoise: "#00ced1",
    darkviolet: "#9400d3",
    deeppink: "#ff1493",
    deepskyblue: "#00bfff",
    dimgray: "#696969",
    dodgerblue: "#1e90ff",
    firebrick: "#b22222",
    floralwhite: "#fffaf0",
    forestgreen: "#228b22",
    fuchsia: "#ff00ff",
    gainsboro: "#dcdcdc",
    ghostwhite: "#f8f8ff",
    gold: "#ffd700",
    goldenrod: "#daa520",
    gray: "#808080",
    green: "#008000",
    greenyellow: "#adff2f",
    honeydew: "#f0fff0",
    hotpink: "#ff69b4",
    "indianred ": "#cd5c5c",
    indigo: "#4b0082",
    ivory: "#fffff0",
    khaki: "#f0e68c",
    lavender: "#e6e6fa",
    lavenderblush: "#fff0f5",
    lawngreen: "#7cfc00",
    lemonchiffon: "#fffacd",
    lightblue: "#add8e6",
    lightcoral: "#f08080",
    lightcyan: "#e0ffff",
    lightgoldenrodyellow: "#fafad2",
    lightgrey: "#d3d3d3",
    lightgreen: "#90ee90",
    lightpink: "#ffb6c1",
    lightsalmon: "#ffa07a",
    lightseagreen: "#20b2aa",
    lightskyblue: "#87cefa",
    lightslategray: "#778899",
    lightsteelblue: "#b0c4de",
    lightyellow: "#ffffe0",
    lime: "#00ff00",
    limegreen: "#32cd32",
    linen: "#faf0e6",
    magenta: "#ff00ff",
    maroon: "#800000",
    mediumaquamarine: "#66cdaa",
    mediumblue: "#0000cd",
    mediumorchid: "#ba55d3",
    mediumpurple: "#9370d8",
    mediumseagreen: "#3cb371",
    mediumslateblue: "#7b68ee",
    mediumspringgreen: "#00fa9a",
    mediumturquoise: "#48d1cc",
    mediumvioletred: "#c71585",
    midnightblue: "#191970",
    mintcream: "#f5fffa",
    mistyrose: "#ffe4e1",
    moccasin: "#ffe4b5",
    navajowhite: "#ffdead",
    navy: "#000080",
    oldlace: "#fdf5e6",
    olive: "#808000",
    olivedrab: "#6b8e23",
    orange: "#ffa500",
    orangered: "#ff4500",
    orchid: "#da70d6",
    palegoldenrod: "#eee8aa",
    palegreen: "#98fb98",
    paleturquoise: "#afeeee",
    palevioletred: "#d87093",
    papayawhip: "#ffefd5",
    peachpuff: "#ffdab9",
    peru: "#cd853f",
    pink: "#ffc0cb",
    plum: "#dda0dd",
    powderblue: "#b0e0e6",
    purple: "#800080",
    rebeccapurple: "#663399",
    red: "#ff0000",
    rosybrown: "#bc8f8f",
    royalblue: "#4169e1",
    saddlebrown: "#8b4513",
    salmon: "#fa8072",
    sandybrown: "#f4a460",
    seagreen: "#2e8b57",
    seashell: "#fff5ee",
    sienna: "#a0522d",
    silver: "#c0c0c0",
    skyblue: "#87ceeb",
    slateblue: "#6a5acd",
    slategray: "#708090",
    snow: "#fffafa",
    springgreen: "#00ff7f",
    steelblue: "#4682b4",
    tan: "#d2b48c",
    teal: "#008080",
    thistle: "#d8bfd8",
    tomato: "#ff6347",
    turquoise: "#40e0d0",
    violet: "#ee82ee",
    wheat: "#f5deb3",
    white: "#ffffff",
    whitesmoke: "#f5f5f5",
    yellow: "#ffff00",
    yellowgreen: "#9acd32",
  }
  hexcolor = (colours[hexcolor.toLowerCase()] || hexcolor).replace("#", "")
  var r = parseInt(hexcolor.substr(0, 2), 16)
  var g = parseInt(hexcolor.substr(2, 2), 16)
  var b = parseInt(hexcolor.substr(4, 2), 16)
  var yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? "black" : "white"
}

export function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") {
    return { r: 0, g: 0, b: 0 }
  }

  // Handle CSS names commonly used as fallbacks
  if (hex.toLowerCase() === "white") return { r: 255, g: 255, b: 255 }
  if (hex.toLowerCase() === "black") return { r: 0, g: 0, b: 0 }

  if (hex.charAt(0) !== "#") {
    return { r: 0, g: 0, b: 0 } // Return black for other invalid input
  }
  hex = hex.slice(1)

  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }

  if (hex.length !== 6) {
    return { r: 0, g: 0, b: 0 } // Return black for invalid length
  }

  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return { r: 0, g: 0, b: 0 }
  }

  return { r, g, b }
}

export function extractAverageColor(imageSrc) {
  return new Promise((resolve, reject) => {
    if (!imageSrc) return reject("No image source")
    let actualSrc = imageSrc
    // If it's a relative url but we are in chrome-extension:// context, it's fine.

    const img = new Image()
    img.crossOrigin = "Anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      // Use a larger sample to find a vibrant color
      canvas.width = 64
      canvas.height = 64
      ctx.drawImage(img, 0, 0, 64, 64)
      try {
        const data = ctx.getImageData(0, 0, 64, 64).data
        let r = 0,
          g = 0,
          b = 0
        let count = 0

        for (let i = 0; i < data.length; i += 4) {
          // Skip overly bright or overly dark pixels, or grayish
          const pr = data[i],
            pg = data[i + 1],
            pb = data[i + 2]
          const max = Math.max(pr, pg, pb)
          const min = Math.min(pr, pg, pb)
          const saturation = max === 0 ? 0 : (max - min) / max

          // M3 favors vibrant colors
          if (saturation > 0.2 && max > 50 && max < 240) {
            r += pr
            g += pg
            b += pb
            count++
          }
        }

        if (count > 0) {
          resolve({
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count),
          })
        } else {
          // Fallback to 1x1 average if no vibrant color found
          ctx.drawImage(img, 0, 0, 1, 1)
          const backup = ctx.getImageData(0, 0, 1, 1).data
          resolve({ r: backup[0], g: backup[1], b: backup[2] })
        }
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = (e) => reject("Failed to load image for color extraction")
    img.src = actualSrc
  })
}

export function rgbToHexObject({ r, g, b }) {
  const componentToHex = (c) => {
    const hex = c.toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b)
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const componentToHex = (component) =>
  clamp(Math.round(component), 0, 255).toString(16).padStart(2, "0")

const rgbToHex = ({ r, g, b }) =>
  `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`

const rgbToHsl = ({ r, g, b }) => {
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
      default:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

const hslToHex = (h, s, l) => {
  h = ((h % 360) + 360) % 360
  s = clamp(s, 0, 100) / 100
  l = clamp(l, 0, 100) / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0

  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  return rgbToHex({
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  })
}

const tone = (h, s, l) => hslToHex(h, s, l)

const M3_PALETTE_STYLES = {
  tonalSpot: {
    primaryHue: 0,
    secondaryHue: 0,
    tertiaryHue: 58,
    chromaMin: 28,
    chromaMax: 78,
    primaryScale: 1,
    secondaryScale: 0.42,
    tertiaryScale: 0.55,
    secondaryMin: 20,
    secondaryMax: 38,
    tertiaryMin: 24,
    tertiaryMax: 48,
    neutralScale: 0.12,
    neutralMin: 4,
    neutralMax: 14,
    neutralVariantScale: 0.22,
    neutralVariantMin: 8,
    neutralVariantMax: 24,
  },
  fidelity: {
    primaryHue: 0,
    secondaryHue: 0,
    tertiaryHue: 48,
    chromaMin: 0,
    chromaMax: 100,
    primaryScale: 1,
    secondaryScale: 0.58,
    tertiaryScale: 0.64,
    secondaryMin: 10,
    secondaryMax: 72,
    tertiaryMin: 14,
    tertiaryMax: 76,
    neutralScale: 0.1,
    neutralMin: 0,
    neutralMax: 12,
    neutralVariantScale: 0.18,
    neutralVariantMin: 2,
    neutralVariantMax: 20,
  },
  content: {
    primaryHue: 0,
    secondaryHue: 12,
    tertiaryHue: 42,
    chromaMin: 18,
    chromaMax: 86,
    primaryScale: 0.96,
    secondaryScale: 0.5,
    tertiaryScale: 0.62,
    secondaryMin: 16,
    secondaryMax: 54,
    tertiaryMin: 18,
    tertiaryMax: 62,
    neutralScale: 0.08,
    neutralMin: 2,
    neutralMax: 10,
    neutralVariantScale: 0.16,
    neutralVariantMin: 6,
    neutralVariantMax: 18,
  },
  vibrant: {
    primaryHue: 0,
    secondaryHue: 18,
    tertiaryHue: 52,
    chromaMin: 58,
    chromaMax: 100,
    primaryScale: 1.18,
    secondaryScale: 0.86,
    tertiaryScale: 0.9,
    secondaryMin: 42,
    secondaryMax: 88,
    tertiaryMin: 46,
    tertiaryMax: 92,
    neutralScale: 0.16,
    neutralMin: 6,
    neutralMax: 18,
    neutralVariantScale: 0.3,
    neutralVariantMin: 12,
    neutralVariantMax: 30,
  },
  expressive: {
    primaryHue: 240,
    secondaryHue: 120,
    tertiaryHue: 60,
    chromaMin: 42,
    chromaMax: 92,
    primaryScale: 0.96,
    secondaryScale: 0.72,
    tertiaryScale: 0.84,
    secondaryMin: 34,
    secondaryMax: 68,
    tertiaryMin: 38,
    tertiaryMax: 78,
    neutralScale: 0.14,
    neutralMin: 5,
    neutralMax: 16,
    neutralVariantScale: 0.26,
    neutralVariantMin: 10,
    neutralVariantMax: 28,
  },
  fruitSalad: {
    primaryHue: -50,
    secondaryHue: 50,
    tertiaryHue: 130,
    chromaMin: 46,
    chromaMax: 96,
    primaryScale: 1.02,
    secondaryScale: 0.82,
    tertiaryScale: 0.86,
    secondaryMin: 38,
    secondaryMax: 78,
    tertiaryMin: 40,
    tertiaryMax: 82,
    neutralScale: 0.1,
    neutralMin: 3,
    neutralMax: 12,
    neutralVariantScale: 0.22,
    neutralVariantMin: 8,
    neutralVariantMax: 24,
  },
  neutral: {
    primaryHue: 0,
    secondaryHue: 0,
    tertiaryHue: 24,
    chromaMin: 8,
    chromaMax: 24,
    primaryScale: 0.68,
    secondaryScale: 0.36,
    tertiaryScale: 0.42,
    secondaryMin: 4,
    secondaryMax: 16,
    tertiaryMin: 5,
    tertiaryMax: 18,
    neutralScale: 0.04,
    neutralMin: 0,
    neutralMax: 5,
    neutralVariantScale: 0.08,
    neutralVariantMin: 0,
    neutralVariantMax: 10,
  },
  monochrome: {
    primaryHue: 0,
    secondaryHue: 0,
    tertiaryHue: 0,
    chromaMin: 0,
    chromaMax: 0,
    primaryScale: 0,
    secondaryScale: 0,
    tertiaryScale: 0,
    secondaryMin: 0,
    secondaryMax: 0,
    tertiaryMin: 0,
    tertiaryMax: 0,
    neutralScale: 0,
    neutralMin: 0,
    neutralMax: 0,
    neutralVariantScale: 0,
    neutralVariantMin: 0,
    neutralVariantMax: 0,
  },
  rainbow: {
    primaryHue: 0,
    secondaryHue: 60,
    tertiaryHue: 120,
    chromaMin: 24,
    chromaMax: 58,
    primaryScale: 0.8,
    secondaryScale: 0.72,
    tertiaryScale: 0.72,
    secondaryMin: 20,
    secondaryMax: 42,
    tertiaryMin: 20,
    tertiaryMax: 42,
    neutralScale: 0.02,
    neutralMin: 0,
    neutralMax: 4,
    neutralVariantScale: 0.06,
    neutralVariantMin: 0,
    neutralVariantMax: 8,
  },
}

const resolveM3PaletteStyle = (style) =>
  M3_PALETTE_STYLES[style] || M3_PALETTE_STYLES.tonalSpot

export function buildMaterial3Scheme(seedHex = "#6750a4", paletteStyle = "tonalSpot") {
  const seedRgb = hexToRgb(seedHex)
  const seed = rgbToHsl(seedRgb)
  const style = resolveM3PaletteStyle(paletteStyle)
  const chroma = clamp(seed.s, style.chromaMin, style.chromaMax)
  const primaryHue = seed.h + style.primaryHue
  const secondaryHue = seed.h + style.secondaryHue
  const tertiaryHue = seed.h + style.tertiaryHue
  const neutralHue = seed.h
  const primaryChroma = clamp(
    chroma * style.primaryScale,
    style.chromaMin,
    style.chromaMax,
  )
  const neutralChroma = clamp(
    seed.s * style.neutralScale,
    style.neutralMin,
    style.neutralMax,
  )
  const neutralVariantChroma = clamp(
    seed.s * style.neutralVariantScale,
    style.neutralVariantMin,
    style.neutralVariantMax,
  )
  const secondaryChroma = clamp(
    chroma * style.secondaryScale,
    style.secondaryMin,
    style.secondaryMax,
  )
  const tertiaryChroma = clamp(
    chroma * style.tertiaryScale,
    style.tertiaryMin,
    style.tertiaryMax,
  )

  const primary = tone(primaryHue, primaryChroma, 80)
  const primaryRgb = hexToRgb(primary)

  return {
    seed: seedHex,
    paletteStyle,
    primary,
    onPrimary: tone(primaryHue, primaryChroma, 18),
    primaryContainer: tone(primaryHue, primaryChroma * 0.86, 30),
    onPrimaryContainer: tone(primaryHue, primaryChroma, 92),
    secondary: tone(secondaryHue, secondaryChroma, 80),
    onSecondary: tone(secondaryHue, secondaryChroma, 18),
    secondaryContainer: tone(secondaryHue, secondaryChroma, 30),
    onSecondaryContainer: tone(secondaryHue, secondaryChroma, 92),
    tertiary: tone(tertiaryHue, tertiaryChroma, 80),
    onTertiary: tone(tertiaryHue, tertiaryChroma, 18),
    tertiaryContainer: tone(tertiaryHue, tertiaryChroma, 30),
    onTertiaryContainer: tone(tertiaryHue, tertiaryChroma, 92),
    surface: tone(neutralHue, neutralChroma, 6),
    onSurface: tone(neutralHue, neutralChroma, 92),
    surfaceContainerLow: tone(neutralHue, neutralChroma, 10),
    surfaceContainer: tone(neutralHue, neutralChroma, 12),
    surfaceContainerHigh: tone(neutralHue, neutralChroma, 17),
    surfaceVariant: tone(neutralHue, neutralVariantChroma, 30),
    onSurfaceVariant: tone(neutralHue, neutralVariantChroma, 80),
    outline: tone(neutralHue, neutralVariantChroma, 60),
    outlineVariant: tone(neutralHue, neutralVariantChroma, 32),
    inverseSurface: tone(neutralHue, neutralChroma, 90),
    inverseOnSurface: tone(neutralHue, neutralChroma, 14),
    inversePrimary: tone(primaryHue, primaryChroma, 40),
    surfaceTint: primary,
    primaryRgb: `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`,
  }
}

export function getRandomHexColor() {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  )
}
