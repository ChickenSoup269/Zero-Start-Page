/**
 * Clock Style Accent Helpers
 * Extracted from settingsApplier.js
 */

import { hexToRgb } from "../../utils/colors.js"

export const CLOCK_STYLE_ACCENT_DEFAULTS = {
  glow: "#ffffff",
  minimal: "#ffffff",
  round: "#ffffff",
  square: "#ffffff",
  analog: "#ffffff",
  sidestyle: "#ffffff",
  "jp-style": "#ffffff",
  sidebar: "#ffffff",
  "weekday-style": "#ffffff",
  "cyber-pulse": "#ffffff",
  "neon-grid": "#ffffff",
  terminal: "#4ade80",
  "c4-bomb": "#facc15",
  "holo-ring": "#ffffff",
  "media-orb": "#ffffff",
  "prism-stack": "#ffffff",
  "metro-panel": "#ffffff",
  "aurora-ribbon": "#ffffff",
  "lunar-orbit": "#ffffff",
  bento: "#ffffff",
  cartoon: "#ffffff",
  "space-concentric": "#00ff66",
  "split-pill": "#111111",
  "clock-3d": "#ffffff",
  "macos-vintage": "#ffffff",
  aquarium: "#00e5ff",
}

export const CLOCK_STYLE_ACCENT_STYLES = Object.keys(CLOCK_STYLE_ACCENT_DEFAULTS)

export function getClockStyleUsesM3Accent(settings, style) {
  return settings.clockStyleUseM3Accent?.[style] === true
}

export function getCurrentAppAccentColor(settings) {
  const cssAccent = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent-color")
    .trim()
  if (cssAccent) return cssAccent
  return /^#[0-9a-f]{6}$/i.test(settings.accentColor || "")
    ? settings.accentColor
    : "#00ff73"
}

export function getClockStyleAccentColor(settings, style) {
  if (getClockStyleUsesM3Accent(settings, style)) {
    return getCurrentAppAccentColor(settings)
  }

  const customColor = settings.clockStyleAccentColors?.[style]
  if (/^#[0-9a-f]{6}$/i.test(customColor || "")) return customColor
  return CLOCK_STYLE_ACCENT_DEFAULTS[style] || "#ffffff"
}

export function getClockStyleCustomAccentColor(settings, style) {
  const customColor = settings.clockStyleAccentColors?.[style]
  if (/^#[0-9a-f]{6}$/i.test(customColor || "")) return customColor
  return CLOCK_STYLE_ACCENT_DEFAULTS[style] || "#ffffff"
}

export function setClockStyleAccentVars(settings, style) {
  const root = document.documentElement
  const clockWrap = document.querySelector(".clock-date-wrap")
  if (!CLOCK_STYLE_ACCENT_DEFAULTS[style]) {
    root.style.removeProperty("--clock-style-accent-color")
    root.style.removeProperty("--clock-style-accent-rgb")
    return
  }

  const color = getClockStyleAccentColor(settings, style)
  const rgb = hexToRgb(color)
  root.style.setProperty("--clock-style-accent-color", color)
  root.style.setProperty(
    "--clock-style-accent-rgb",
    rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : "255, 255, 255",
  )
  clockWrap?.style.setProperty("--accent-color", color)
  clockWrap?.style.setProperty(
    "--accent-color-rgb",
    rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : "255, 255, 255",
  )
}
