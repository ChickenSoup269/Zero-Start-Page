import { getSettings } from "../../services/state.js"
import {
  extractAverageColor,
  getRandomHexColor,
  rgbToHexObject,
} from "../../utils/colors.js"
import {
  getBlobUrlSync,
  getImageUrl,
  isIdbImage,
  isIdbMedia,
} from "../../services/imageStore.js"

const parseCssUrl = (value) => {
  if (!value || value === "none") return null
  const match = value.match(/^url\((['"]?)(.*)\1\)$/)
  return match ? match[2] : null
}

const normalizeHexColor = (value) => {
  const match = String(value || "").match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/)
  if (!match) return null
  const raw = match[1]
  if (raw.length === 3) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toLowerCase()
  }
  return `#${raw}`.toLowerCase()
}

const rgbStringToHex = (value) => {
  const match = String(value || "").match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i,
  )
  if (!match) return null
  const toHex = (component) =>
    Math.max(0, Math.min(255, Math.round(Number(component) || 0)))
      .toString(16)
      .padStart(2, "0")
  return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`
}

const hslStringToHex = (value) => {
  const match = String(value || "").match(
    /hsla?\(\s*([\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/i,
  )
  if (!match) return null
  return hslToHex(Number(match[1]), Number(match[2]), Number(match[3]))
}

const pickColorFromCssText = (value) => {
  if (typeof value !== "string") return null
  const decoded = value.includes("%")
    ? (() => {
        try {
          return decodeURIComponent(value)
        } catch {
          return value
        }
      })()
    : value
  return (
    normalizeHexColor(decoded) ||
    rgbStringToHex(decoded) ||
    hslStringToHex(decoded)
  )
}

const getCurrentBackgroundImageUrl = () => {
  const bgLayer = document.getElementById("bg-layer")
  if (!bgLayer) return null

  return (
    parseCssUrl(bgLayer.style.backgroundImage) ||
    parseCssUrl(getComputedStyle(bgLayer).backgroundImage)
  )
}

const averageVibrantPixels = (data) => {
  let r = 0
  let g = 0
  let b = 0
  let count = 0

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha < 20) continue

    const pr = data[i]
    const pg = data[i + 1]
    const pb = data[i + 2]
    const max = Math.max(pr, pg, pb)
    const min = Math.min(pr, pg, pb)
    const saturation = max === 0 ? 0 : (max - min) / max

    if (saturation > 0.18 && max > 36 && max < 246) {
      r += pr
      g += pg
      b += pb
      count++
    }
  }

  if (count === 0) return null
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  }
}

const hslToHex = (h, s, l) => {
  const hue = (((Number(h) || 0) % 360) + 360) % 360
  const sat = Math.min(100, Math.max(0, Number(s) || 0)) / 100
  const light = Math.min(100, Math.max(0, Number(l) || 0)) / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = light - c / 2
  let r = 0
  let g = 0
  let b = 0

  if (hue < 60) [r, g, b] = [c, x, 0]
  else if (hue < 120) [r, g, b] = [x, c, 0]
  else if (hue < 180) [r, g, b] = [0, c, x]
  else if (hue < 240) [r, g, b] = [0, x, c]
  else if (hue < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  const toHex = (value) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const sampleCurrentVideoFrameColor = () => {
  const video = document.getElementById("bg-video")
  if (
    !video ||
    video.style.display === "none" ||
    !video.videoWidth ||
    !video.videoHeight ||
    video.readyState < 2
  ) {
    return null
  }

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null

  canvas.width = 64
  canvas.height = 64

  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const vibrant = averageVibrantPixels(data)
    if (vibrant) return rgbToHexObject(vibrant)

    const fallback = ctx.getImageData(31, 31, 1, 1).data
    return rgbToHexObject({ r: fallback[0], g: fallback[1], b: fallback[2] })
  } catch (err) {
    console.warn("Could not sample current video frame for M3 accent:", err)
    return null
  }
}

const waitForVideoFrameColor = async () => {
  const video = document.getElementById("bg-video")
  if (!video || video.style.display === "none") return null

  const immediate = sampleCurrentVideoFrameColor()
  if (immediate) return immediate

  await new Promise((resolve) => {
    const finish = () => {
      video.removeEventListener("loadeddata", finish)
      video.removeEventListener("canplay", finish)
      video.removeEventListener("timeupdate", finish)
      resolve()
    }
    video.addEventListener("loadeddata", finish, { once: true })
    video.addEventListener("canplay", finish, { once: true })
    video.addEventListener("timeupdate", finish, { once: true })
    setTimeout(finish, 900)
  })

  return sampleCurrentVideoFrameColor()
}

const getFallbackSeedColor = () => {
  const settings = getSettings()
  const bg = settings.background
  const isMedia = isImageOrVideoBackground(bg)

  if (typeof bg === "string" && /^#[0-9A-F]{6}$/i.test(bg)) return bg
  if (isMedia) return null
  const generatedSeed = getGeneratedBackgroundSeedColor(settings)
  if (generatedSeed) return generatedSeed
  if (
    settings.multiColorActive &&
    Array.isArray(settings.multiColors) &&
    /^#[0-9A-F]{6}$/i.test(settings.multiColors[0] || "")
  ) {
    return settings.multiColors[0]
  }
  if (/^#[0-9A-F]{6}$/i.test(settings.gradientStart || "")) {
    return settings.gradientStart
  }
  return null
}

const getGeneratedBackgroundSeedColor = (settings = getSettings()) => {
  if (settings.svgWaveActive === true) {
    return hslToHex(
      settings.svgWaveStartHue ?? 200,
      settings.svgWaveStartSaturation ?? 70,
      settings.svgWaveStartLightness ?? 40,
    )
  }
  if (
    settings.gradientV2Active === true &&
    /^#[0-9A-F]{6}$/i.test(settings.gradientV2Color1 || "")
  ) {
    return settings.gradientV2Color1
  }
  if (
    settings.silkActive === true &&
    /^#[0-9A-F]{6}$/i.test(settings.silkColor || "")
  ) {
    return settings.silkColor
  }
  if (
    settings.lightPillarActive === true &&
    /^#[0-9A-F]{6}$/i.test(settings.lightPillarTopColor || "")
  ) {
    return settings.lightPillarTopColor
  }
  if (
    settings.liquidEtherActive === true &&
    /^#[0-9A-F]{6}$/i.test(
      settings.liquidEtherColor1 ||
        (Array.isArray(settings.liquidEtherColors)
          ? settings.liquidEtherColors[0]
          : ""),
    )
  ) {
    return (
      settings.liquidEtherColor1 ||
      (Array.isArray(settings.liquidEtherColors)
        ? settings.liquidEtherColors[0]
        : null)
    )
  }
  if (settings.splashCursorDarkBg === true) return "#000000"
  return null
}

const isImageOrVideoBackground = (value) => {
  if (typeof value !== "string") return false
  return (
    /^(data:image\/|data:video\/|blob:|https?:\/\/)/i.test(value) ||
    isIdbMedia(value) ||
    /\.(mp4|webm|mov|ogg)(?:[?#].*)?$/i.test(value) ||
    value.includes("googlevideo")
  )
}

const getGradientSeedColor = (settings) => {
  if (
    settings.multiColorActive &&
    Array.isArray(settings.multiColors) &&
    /^#[0-9A-F]{6}$/i.test(settings.multiColors[0] || "")
  ) {
    return settings.multiColors[0]
  }
  if (
    !settings.background &&
    /^#[0-9A-F]{6}$/i.test(settings.gradientStart || "")
  ) {
    return settings.gradientStart
  }
  const cssSeed = pickColorFromCssText(settings.background)
  if (cssSeed) return cssSeed
  return null
}

const getBackgroundImageSource = async () => {
  const settings = getSettings()
  const bg = settings.background

  if (typeof bg === "string") {
    if (/^data:image\//i.test(bg)) return bg
    if (/^data:video\//i.test(bg)) return null
    if (/^https?:\/\//i.test(bg)) {
      if (
        /\.(mp4|webm|mov|ogg)(?:[?#].*)?$/i.test(bg) ||
        bg.includes("googlevideo")
      ) {
        return null
      }
      return bg
    }
    if (/^blob:/i.test(bg)) return bg

    if (isIdbImage(bg)) {
      const cachedUrl = getBlobUrlSync(bg)
      if (cachedUrl) return cachedUrl
      return await getImageUrl(bg)
    }
  }

  return getCurrentBackgroundImageUrl()
}

export async function pickAccentFromCurrentBackground(options = {}) {
  const { fallbackRandom = false } = options
  // Prefer explicit seed colors when background is a simple color or gradient
  try {
    const settings = getSettings()
    const bg = settings?.background
    const isMedia = isImageOrVideoBackground(bg)
    const cssSeed = pickColorFromCssText(bg)
    if (typeof bg === "string") {
      const trimmed = bg.trim()
      // direct hex background
      if (/^#[0-9A-F]{3,6}$/i.test(trimmed) && cssSeed) return cssSeed

      // CSS gradient background (linear-gradient, radial-gradient, etc.)
      if (/gradient\(/i.test(trimmed)) {
        // prefer explicit gradient start/end settings if available
        if (/^#[0-9A-F]{6}$/i.test(settings.gradientStart || ""))
          return settings.gradientStart
        if (/^#[0-9A-F]{6}$/i.test(settings.gradientEnd || ""))
          return settings.gradientEnd
        if (cssSeed) return cssSeed
      }

      if (/^data:image\/svg\+xml/i.test(trimmed) && cssSeed) return cssSeed
    }
    const explicitSeed =
      !isMedia
        ? getGeneratedBackgroundSeedColor(settings) ||
          getGradientSeedColor(settings)
        : null
    if (explicitSeed) return explicitSeed
  } catch (e) {
    // ignore and continue to sampling
  }
  const videoColor = await waitForVideoFrameColor()
  if (videoColor) return videoColor

  const layerSeed = pickColorFromCssText(getCurrentBackgroundImageUrl())
  if (layerSeed) return layerSeed

  const imageUrl = await getBackgroundImageSource()

  if (imageUrl) {
    try {
      const rgb = await extractAverageColor(imageUrl)
      if (rgb) return rgbToHexObject(rgb)
    } catch (err) {
      console.warn("Could not extract M3 accent from image background:", err)
    }
  }

  return getFallbackSeedColor() || (fallbackRandom ? getRandomHexColor() : null)
}

export async function applyAccentFromCurrentBackground(options = {}) {
  const {
    DOM,
    handleSettingUpdate,
    fallbackRandom = false,
    silent = false,
  } = options
  const color = await pickAccentFromCurrentBackground({ fallbackRandom })
  if (!color) {
    if (!silent)
      console.warn("No suitable background color found for M3 accent")
    return null
  }

  if (DOM?.accentColorPicker) DOM.accentColorPicker.value = color
  if (DOM?.accentColorHexInput) {
    DOM.accentColorHexInput.value = color.toUpperCase()
  }
  handleSettingUpdate?.("accentColor", color)
  document
    .querySelectorAll(".accent-color-preset")
    .forEach((button) => button.classList.remove("active"))

  return color
}
