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

const getFallbackSeedColor = () => {
  const settings = getSettings()
  const bg = settings.background

  if (typeof bg === "string" && /^#[0-9A-F]{6}$/i.test(bg)) return bg
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

const getBackgroundImageSource = async () => {
  const settings = getSettings()
  const bg = settings.background

  if (typeof bg === "string") {
    if (/^(data:image\/|blob:|https?:\/\/)/i.test(bg)) return bg

    if (isIdbImage(bg) || isIdbMedia(bg)) {
      const cachedUrl = getBlobUrlSync(bg)
      if (cachedUrl) return cachedUrl
      return await getImageUrl(bg)
    }
  }

  return getCurrentBackgroundImageUrl()
}

export async function pickAccentFromCurrentBackground(options = {}) {
  const { fallbackRandom = false } = options
  const videoColor = sampleCurrentVideoFrameColor()
  if (videoColor) return videoColor

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
    if (!silent) console.warn("No suitable background color found for M3 accent")
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
