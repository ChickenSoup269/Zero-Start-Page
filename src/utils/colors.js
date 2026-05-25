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

export function buildMaterial3Scheme(seedHex = "#6750a4") {
  const seedRgb = hexToRgb(seedHex)
  const seed = rgbToHsl(seedRgb)
  const chroma = clamp(seed.s, 28, 78)
  const neutralHue = seed.h
  const neutralChroma = clamp(seed.s * 0.12, 4, 14)
  const neutralVariantChroma = clamp(seed.s * 0.22, 8, 24)
  const secondaryChroma = clamp(chroma * 0.42, 20, 38)
  const tertiaryHue = (seed.h + 58) % 360
  const tertiaryChroma = clamp(chroma * 0.55, 24, 48)

  const primary = tone(seed.h, chroma, 80)
  const primaryRgb = hexToRgb(primary)

  return {
    seed: seedHex,
    primary,
    onPrimary: tone(seed.h, chroma, 18),
    primaryContainer: tone(seed.h, chroma * 0.86, 30),
    onPrimaryContainer: tone(seed.h, chroma, 92),
    secondary: tone(seed.h, secondaryChroma, 80),
    onSecondary: tone(seed.h, secondaryChroma, 18),
    secondaryContainer: tone(seed.h, secondaryChroma, 30),
    onSecondaryContainer: tone(seed.h, secondaryChroma, 92),
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
    inversePrimary: tone(seed.h, chroma, 40),
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
