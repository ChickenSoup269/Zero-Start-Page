/**
 * boot/styles.js
 * Applies CSS variables and visual tokens at boot time (no layout shift).
 */
import { buildMaterial3Scheme, getContrastYIQ, hexToRgb } from "../utils/colors.js"
import { getSettings } from "../services/state.js"

const SYSTEM_FONTS = new Set([
  "sans-serif", "serif", "monospace", "cursive", "fantasy",
  "system-ui", "arial", "helvetica", "segoe ui", "times new roman",
  "courier new", "georgia", "verdana", "trebuchet ms", "impact",
])

export function loadFontOnBoot(fontValue) {
  if (!fontValue) return
  const fontName = fontValue.replace(/['"]/g, "").split(",")[0].trim()
  if (SYSTEM_FONTS.has(fontName.toLowerCase())) return

  const settings = getSettings()
  const savedFonts = settings.userSavedFonts || []
  const savedFontObj = savedFonts.find(
    (f) => (typeof f === "string" ? f : f.label) === fontName,
  )
  if (savedFontObj && typeof savedFontObj === "object" && savedFontObj.isLocal) {
    return
  }

  const formattedFontName = fontName.replace(/\s+/g, "+")
  const googleFontUrl = `https://fonts.googleapis.com/css2?family=${formattedFontName}:wght@300;400;500;600;700&display=swap`

  const existingLink = document.querySelector(
    `link[href^="https://fonts.googleapis.com/css2?family=${formattedFontName}"]`,
  )
  if (!existingLink) {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = googleFontUrl
    document.head.appendChild(link)
  }
}

export function applyDefaultAccentTokens(seedColor) {
  const root = document.documentElement
  const color = seedColor || "#00ff73"
  const rgb = hexToRgb(color)

  root.style.setProperty("--accent-color", color)
  root.style.setProperty("--accent-color-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`)
  root.style.setProperty("--accent-contrast-color", getContrastYIQ(color))
  root.style.setProperty("--safe-accent", color)

  return {
    accent: color,
    onAccent: getContrastYIQ(color),
    onPrimary: getContrastYIQ(color),
  }
}

export function applyMaterialAccentTokens(seedColor, paletteStyle = "tonalSpot") {
  const root = document.documentElement
  const scheme = buildMaterial3Scheme(seedColor, paletteStyle)
  const tokenMap = {
    "--m3-seed": scheme.seed,
    "--m3-primary": scheme.primary,
    "--m3-on-primary": scheme.onPrimary,
    "--m3-primary-container": scheme.primaryContainer,
    "--m3-on-primary-container": scheme.onPrimaryContainer,
    "--m3-secondary": scheme.secondary,
    "--m3-on-secondary": scheme.onSecondary,
    "--m3-secondary-container": scheme.secondaryContainer,
    "--m3-on-secondary-container": scheme.onSecondaryContainer,
    "--m3-tertiary": scheme.tertiary,
    "--m3-on-tertiary": scheme.onTertiary,
    "--m3-tertiary-container": scheme.tertiaryContainer,
    "--m3-on-tertiary-container": scheme.onTertiaryContainer,
    "--m3-surface": scheme.surface,
    "--m3-on-surface": scheme.onSurface,
    "--m3-surface-container-low": scheme.surfaceContainerLow,
    "--m3-surface-container": scheme.surfaceContainer,
    "--m3-surface-container-high": scheme.surfaceContainerHigh,
    "--m3-surface-variant": scheme.surfaceVariant,
    "--m3-on-surface-variant": scheme.onSurfaceVariant,
    "--m3-outline": scheme.outline,
    "--m3-outline-variant": scheme.outlineVariant,
    "--m3-inverse-surface": scheme.inverseSurface,
    "--m3-inverse-on-surface": scheme.inverseOnSurface,
    "--m3-inverse-primary": scheme.inversePrimary,
    "--m3-surface-tint": scheme.surfaceTint,
    "--m3-primary-rgb": scheme.primaryRgb,
  }

  // Batch all token writes into a single CSS injection to minimize style recalcs
  const tokenCss = Object.entries(tokenMap)
    .map(([k, v]) => `${k}:${v}`)
    .join(";")
  const batchId = "m3-accent-tokens"
  let batchEl = document.getElementById(batchId)
  if (!batchEl) {
    batchEl = document.createElement("style")
    batchEl.id = batchId
    document.head.appendChild(batchEl)
  }
  batchEl.textContent = `:root{${tokenCss}}`

  root.style.setProperty("--accent-color", scheme.primary)
  root.style.setProperty("--accent-color-rgb", scheme.primaryRgb)
  root.style.setProperty("--accent-contrast-color", scheme.onPrimary)
  root.style.setProperty("--safe-accent", scheme.inversePrimary)

  return scheme
}

export function applyAccentTokens(settings) {
  const color = settings.accentColor || "#00ff73"
  if ((settings.accentColorMode || "m3") === "default") {
    return applyDefaultAccentTokens(color)
  }
  return applyMaterialAccentTokens(color, settings.m3PaletteStyle || "tonalSpot")
}

function buildSvgWavePreviewGradient(settings) {
  const start = `hsl(${settings.svgWaveStartHue ?? 200}, ${settings.svgWaveStartSaturation ?? 70}%, ${settings.svgWaveStartLightness ?? 40}%)`
  const end = `hsl(${settings.svgWaveEndHue ?? 280}, ${settings.svgWaveEndSaturation ?? 70}%, ${settings.svgWaveEndLightness ?? 30}%)`
  const angle = Number(settings.svgWaveAngle ?? 0)
  return `linear-gradient(${angle}deg, ${start}, ${end})`
}

export function applyBootVisualPreview(settings) {
  if (!settings) return

  if (settings.accentColor) {
    applyAccentTokens(settings)
  }

  if (settings.svgWaveActive !== true) return

  const bgLayer = document.getElementById("bg-layer")
  if (!bgLayer) return

  document.body.classList.add("preload-bg-ready", "bg-layer-active")
  bgLayer.style.background = buildSvgWavePreviewGradient(settings)
  bgLayer.style.backgroundSize = "cover"
  bgLayer.style.backgroundRepeat = "no-repeat"
  bgLayer.style.backgroundPosition = "var(--bg-pos-x, 50%) var(--bg-pos-y, 50%)"
  bgLayer.style.opacity = "1"
}

export function applyBasicStyles(settings) {
  const root = document.documentElement

  root.style.setProperty(
    "--bg-pos-x",
    `${settings.bgPositionX !== undefined ? settings.bgPositionX : 50}%`,
  )
  root.style.setProperty(
    "--bg-pos-y",
    `${settings.bgPositionY !== undefined ? settings.bgPositionY : 50}%`,
  )

  const filters = [
    `blur(${settings.bgBlur ?? 0}px)`,
    `brightness(${settings.bgBrightness ?? 100}%)`,
    `contrast(${settings.bgContrast ?? 100}%)`,
    `saturate(${settings.bgSaturation ?? 100}%)`,
  ].join(" ")

  root.style.setProperty("--bg-filter", filters)

  if (settings.dateClockStyle) {
    document.body.setAttribute("data-clock-style", settings.dateClockStyle)
  }
  root.style.setProperty("--bg-blur", `${settings.bgBlur ?? 0}px`)
  root.style.setProperty("--bg-brightness", `${settings.bgBrightness ?? 100}%`)
  root.style.setProperty("--bg-contrast", `${settings.bgContrast ?? 100}%`)
  root.style.setProperty("--bg-saturation", `${settings.bgSaturation ?? 100}%`)

  root.style.setProperty("--clock-font-size", `${settings.clockFontSize ?? 11}rem`)
  root.style.setProperty("--date-font-size", `${settings.dateFontSize ?? 2}rem`)

  if (settings.panelBg) root.style.setProperty("--panel-bg", settings.panelBg)
  if (settings.glassBg) root.style.setProperty("--glass-bg", settings.glassBg)
  if (settings.glassBorder) root.style.setProperty("--glass-border", settings.glassBorder)
  if (settings.glassEdge) root.style.setProperty("--glass-edge", settings.glassEdge)

  if (settings.accentColor) {
    applyAccentTokens(settings)
    const forceLightSidebar = settings.showQuickAccessBg === true
    if (forceLightSidebar) {
      root.style.setProperty("--sidebar-bg", "rgba(240, 240, 245, 0.98)")
      document.body.classList.add("sidebar-light")
    } else {
      if (settings.sidebarBg) root.style.setProperty("--sidebar-bg", settings.sidebarBg)
      document.body.classList.remove("sidebar-light")
    }
  }

  const primaryFont = settings.font || "'Outfit', sans-serif"
  const clockFont = settings.clockFont || settings.font || "'Outfit', sans-serif"
  root.style.setProperty("--font-primary", primaryFont)

  const dateClockStyle = settings.dateClockStyle || "default"
  const clockFontTarget = settings.clockFontTarget || "both"
  const clockUsesDisplayFont = clockFontTarget === "both" || clockFontTarget === "clock"
  const dateUsesDisplayFont =
    clockFontTarget === "both" || clockFontTarget === "date" || clockFontTarget === "weekday"

  const applyFontToTargets = (targets, font) => {
    targets.forEach((t) => root.style.setProperty(`--font-${t}`, font))
  }

  applyFontToTargets(["clock", "date", "weekday", "gregorian-date", "lunar-date"], primaryFont)

  if (clockFontTarget === "both") {
    applyFontToTargets(
      ["clock", "date", "weekday", "gregorian-date", "lunar-date", "clock-date", "jp-time", "jp-date"],
      clockFont,
    )
  } else if (clockFontTarget === "clock") {
    applyFontToTargets(["clock", "clock-date", "jp-time"], clockFont)
  } else if (clockFontTarget === "date") {
    applyFontToTargets(["date", "jp-date"], clockFont)
  }

  const baseClockSize = Number(settings.clockSize) || 6
  const rawDateSize = Number(settings.dateSize)
  const baseDateSize = Number.isFinite(rawDateSize)
    ? Math.min(10, Math.max(0.8, rawDateSize))
    : 1.5
  const priority = settings.clockDatePriority === "date" ? "date" : "none"
  const displayMode = settings.clockDisplayMode || "all"
  let computedClockSize = baseClockSize
  let computedDateSize = baseDateSize

  const getFontName = (f) => String(f || "")
  const getClockFontProfile = (font) => {
    const name = getFontName(font).toLowerCase()
    if (name === "e1234") return { clockScale: 0.68, dateScale: 0.86, letterSpacing: "0px", maxWidthFactor: 5.8 }
    if (name === "electroharmonix" || name === "anurati") return { clockScale: 0.78, dateScale: 0.9, letterSpacing: "0.02em", maxWidthFactor: 6.1 }
    if (name === "saiba-45") return { clockScale: 0.86, dateScale: 0.94, letterSpacing: "0.01em", maxWidthFactor: 6.4 }
    return { clockScale: 1, dateScale: 1, letterSpacing: "2px", maxWidthFactor: 7 }
  }
  const getStyleClockScale = (style) => {
    const styleScales = {
      "cyber-pulse": 0.94, "neon-grid": 0.9, "holo-ring": 0.9,
      "lunar-orbit": 0.9, fliqlo: 0.92, sidebar: 0.94,
    }
    return styleScales[style] || 1
  }

  const fontProfile = getClockFontProfile(clockFont)
  if (priority === "date" || displayMode === "weekday") {
    computedClockSize = baseDateSize
    computedDateSize = baseClockSize
  }

  if (clockUsesDisplayFont) {
    computedClockSize *= fontProfile.clockScale * getStyleClockScale(dateClockStyle)
  }
  if (dateUsesDisplayFont) {
    computedDateSize *= fontProfile.dateScale
  }

  computedClockSize = Math.min(10, Math.max(0.8, computedClockSize))
  computedDateSize = Math.min(10, Math.max(0.8, computedDateSize))

  root.style.setProperty("--clock-size", `${computedClockSize}rem`)
  root.style.setProperty("--date-size", `${computedDateSize}rem`)
  root.style.setProperty("--clock-letter-spacing", clockUsesDisplayFont ? fontProfile.letterSpacing : "2px")
  root.style.setProperty("--clock-max-width-factor", String(fontProfile.maxWidthFactor))

  root.style.setProperty("--bookmark-font-size", `${settings.bookmarkFontSize ?? 10}px`)
  root.style.setProperty("--bookmark-group-font-size", `${settings.bookmarkGroupFontSize ?? 10}px`)
}
