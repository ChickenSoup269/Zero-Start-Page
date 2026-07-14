/**
 * Settings Applier Module
 * Core logic for applying settings to the page (applySettings and updateSettingsInputs)
 */

import {
  DEFAULT_MEDIA_ORB_IMAGE_URL,
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"
import {
  initMacosHoverForBookmarks,
  updateBookmarkGroupsToggleIcon,
} from "../bookmarks.js"
import { geti18n } from "../../services/i18n.js"
import { PREDEFINED_FONTS } from "./fontManager.js"
import {
  buildMaterial3Scheme,
  getContrastYIQ,
  hexToRgb,
} from "../../utils/colors.js"
import { fadeToggle } from "../../utils/dom.js"
import {
  isIdbImage,
  isIdbVideo,
  isIdbMedia,
  getBlobUrlSync,
  trimMediaMemory,
} from "../../services/imageStore.js"
import { getSvgWaveParams } from "./svgWaveUtils.js"
import { splashCursorOptionsFromSettings } from "../animations/splashCursorOptions.js"
import {
  renderLocalBackgrounds,
  renderUserColors,
} from "./backgroundManager.js"
import { renderUserGradients, buildGradientCss } from "./gradientManager.js"
import { renderUserSvgWaves } from "./svgWaveManager.js"
import { buildMultiColorCss } from "./multiColorManager.js"
import {
  DEFAULT_TIMER_ALARM_SOUND,
  renderTimerAlarmSelectOptions,
} from "../../data/timerAlarmSounds.js"

const WEATHER_API_REQUIRED_PARAMS = {
  forecast: ["latitude", "longitude", "current", "daily", "timezone", "forecast_days"],
  geocoding: ["name", "count", "language", "format"],
}

let _prevBg = null // Track last applied background for fade-in trigger
let _prevEffect = null // Track last selected effect to avoid unnecessary restart
let _perfMonitorStarted = false
let _perfMonitorRafId = null
let _perfAvgFrameMs = 16.7
let _perfLagging = false
let _perfLastApply = 0
let _lastMediaTrim = 0

const cssUrl = (value) => {
  if (!value || value === "none") return "none"
  return `url(${JSON.stringify(String(value))})`
}

const CLOCK_STYLE_ACCENT_DEFAULTS = {
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
  cartoon: "#ffffff",
}

const CLOCK_STYLE_ACCENT_STYLES = Object.keys(CLOCK_STYLE_ACCENT_DEFAULTS)

function getClockStyleUsesM3Accent(settings, style) {
  return settings.clockStyleUseM3Accent?.[style] === true
}

function getCurrentAppAccentColor(settings) {
  const cssAccent = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent-color")
    .trim()
  if (cssAccent) return cssAccent
  return /^#[0-9a-f]{6}$/i.test(settings.accentColor || "")
    ? settings.accentColor
    : "#00ff73"
}

function getClockStyleAccentColor(settings, style) {
  if (getClockStyleUsesM3Accent(settings, style)) {
    return getCurrentAppAccentColor(settings)
  }

  const customColor = settings.clockStyleAccentColors?.[style]
  if (/^#[0-9a-f]{6}$/i.test(customColor || "")) return customColor
  return CLOCK_STYLE_ACCENT_DEFAULTS[style] || "#ffffff"
}

function getClockStyleCustomAccentColor(settings, style) {
  const customColor = settings.clockStyleAccentColors?.[style]
  if (/^#[0-9a-f]{6}$/i.test(customColor || "")) return customColor
  return CLOCK_STYLE_ACCENT_DEFAULTS[style] || "#ffffff"
}

function setClockStyleAccentVars(settings, style) {
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

function getBackgroundLayoutValues(settings) {
  const fit = settings.bgSize || "cover"
  const scale = Math.min(
    250,
    Math.max(25, Number(settings.bgImageScale) || 100),
  )

  switch (fit) {
    case "custom":
      return { size: `${scale}%`, repeat: "no-repeat" }
    case "stretch":
      return { size: "100% 100%", repeat: "no-repeat" }
    case "tile":
      return { size: "auto", repeat: "repeat" }
    case "center":
      return { size: "auto", repeat: "no-repeat" }
    case "span":
      return { size: "cover", repeat: "no-repeat" }
    default:
      return { size: fit, repeat: "no-repeat" }
  }
}

const getBackgroundSizeValue = (settings) =>
  getBackgroundLayoutValues(settings).size

const getBackgroundRepeatValue = (settings) =>
  getBackgroundLayoutValues(settings).repeat

function applyBackgroundVideoLayout(video, settings) {
  if (!video) return
  const fit = settings.bgSize || "cover"
  const scale = Math.min(
    250,
    Math.max(25, Number(settings.bgImageScale) || 100),
  )
  const x = settings.bgPositionX ?? 50
  const y = settings.bgPositionY ?? 50

  video.style.objectPosition = `${x}% ${y}%`
  video.style.objectFit =
    fit === "contain" || fit === "tile"
      ? "contain"
      : fit === "stretch"
        ? "fill"
        : fit === "center"
          ? "none"
          : "cover"
  video.style.transform =
    fit === "custom" ? `translateZ(0) scale(${scale / 100})` : "translateZ(0)"
}

function configureBackgroundVideo(video, settings) {
  if (!video) return
  const quality = settings.backgroundMediaQuality || "balanced"
  video.preload = quality === "quality" ? "auto" : "metadata"
  video.disableRemotePlayback = true
  video.playbackRate = quality === "low" || quality === "tiny" ? 0.85 : 1

  const shouldFreeze = quality === "still"
  const freezeVideo = () => {
    if (!shouldFreeze || video.style.display !== "block") return
    const seekTo = Math.min(0.2, Number.isFinite(video.duration) ? video.duration / 10 : 0.2)
    if (Number.isFinite(seekTo) && seekTo > 0 && video.currentTime < 0.05) {
      try {
        video.currentTime = seekTo
      } catch {
        // Some blob/video formats reject early seeks before metadata settles.
      }
    }
    video.pause()
  }

  video.onloadeddata = freezeVideo
  video.oncanplay = freezeVideo
  if (shouldFreeze) {
    freezeVideo()
  } else if (video.paused && video.style.display === "block") {
    video.play().catch(() => {})
  }
}

function isVideoBackgroundValue(value) {
  return (
    typeof value === "string" &&
    (value.startsWith("data:video") ||
      isIdbVideo(value) ||
      /\.(mp4|webm|mov|ogg)(?:[?#].*)?$/i.test(value) ||
      value.includes("googlevideo"))
  )
}

function clearBackgroundVideo(video) {
  if (!video) return
  video.pause()
  video.style.display = "none"
  video.style.opacity = "0"
  if (video.getAttribute("src")) {
    video.removeAttribute("src")
    video.load()
  }
}

function applyMaterialAccentTokens(seedColor, paletteStyle = "tonalSpot") {
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

  Object.entries(tokenMap).forEach(([token, value]) => {
    root.style.setProperty(token, value)
  })

  root.style.setProperty("--accent-color", scheme.primary)
  root.style.setProperty("--accent-color-rgb", scheme.primaryRgb)
  root.style.setProperty("--accent-contrast-color", scheme.onPrimary)
  root.style.setProperty("--safe-accent", scheme.inversePrimary)

  return scheme
}

function applyDefaultAccentTokens(seedColor) {
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

function applyAccentTokens(settings) {
  const color = settings.accentColor || "#00ff73"
  if ((settings.accentColorMode || "m3") === "default") {
    return applyDefaultAccentTokens(color)
  }
  return applyMaterialAccentTokens(color, settings.m3PaletteStyle || "tonalSpot")
}

const EFFECT_KEY_MAP = {
  galaxy: "starFallEffect",
  fireflies: "firefliesEffect",
  network: "networkEffect",
  matrix: "matrixRainEffect",
  aura: "auraEffect",
  wind: "windEffect",
  hacker: "hackerEffect",
  pixelCubes: "pixelCubesEffect",
  jellyfish: "jellyfishEffect",
  sakura: "sakuraEffect",
  snowfall: "snowfallEffect",
  snowfallHD: "snowfallHDEffect",
  auroraWave: "auroraWaveEffect",
  northernLights: "northernLightsEffect",
  bubbles: "bubblesEffect",
  rainHD: "rainHDEffect",
  musicBars: "musicBarsEffect",
  rainbow: "rainbowEffect",
  wavyLines: "wavyLinesEffect",
  oceanWave: "oceanWaveEffect",
  cloudDrift: "cloudDriftEffect",
  firefliesHD: "firefliesHDEffect",
  autumnLeaves: "autumnLeavesEffect",
  greenLeaves: "greenLeavesEffect",
  fallingLeavesSettled: "fallingLeavesSettledEffect",
  sunbeam: "sunbeamEffect",
  lightPillars: "lightPillarsEffect",
  pixelWeather: "pixelWeatherEffect",
  pixelSnowHQ: "pixelSnowHQEffect",
  shiny: "shinyEffect",
  lineShiny: "lineShinyEffect",
  tetFireworks: "tetFireworksEffect",
  reunificationDay: "reunificationDayEffect",
  halloween: "halloweenEffect",
  skyLanterns: "skyLanternsEffect",
  pixelRun: "pixelRunEffect",
  softAurora: "softAuroraEffect",
  silk: "silkEffect",

  nintendoPixel: "nintendoPixelEffect",
  retroGame: "retroGameEffect",
  crtScanlines: "crtScanlinesEffect",
  meteor: "meteorEffect",
  pixelBlast: "pixelBlastEffect",
  wavyPattern: "wavyPatternEffect",
  angledPattern: "angledPatternEffect",
  cursorTrail: "cursorTrailEffect",
  flashlight: "flashlightEffect",
  gridScan: "gridScanEffect",
  plantGrowth: "plantGrowthEffect",
  oceanFish: "oceanFishEffect",
  floatingLines: "floatingLinesEffect",
  hyperspace: "hyperspaceEffect",
  liquidEther: "liquidEtherEffect",
}

function ensurePerformanceMonitor() {
  if (_perfMonitorStarted || typeof requestAnimationFrame !== "function") return
  _perfMonitorStarted = true

  let lastFrame = performance.now()
  const scheduleTick = () => {
    if (_perfMonitorRafId === null && document.visibilityState === "visible") {
      _perfMonitorRafId = requestAnimationFrame(tick)
    }
  }
  const tick = (now) => {
    _perfMonitorRafId = null
    if (document.visibilityState !== "visible") return

    const delta = now - lastFrame
    lastFrame = now

    if (delta > 0 && delta < 1000) {
      _perfAvgFrameMs = _perfAvgFrameMs * 0.9 + delta * 0.1
      const nextLagging = _perfAvgFrameMs > 34
      if (nextLagging !== _perfLagging) {
        _perfLagging = nextLagging
        const settings = getSettings()
        const nowMs = performance.now()
        if (
          settings.performanceMode === "auto" &&
          nowMs - _perfLastApply > 3000 &&
          typeof window.appApplySettings === "function"
        ) {
          _perfLastApply = nowMs
          window.appApplySettings()
        }
      }
    }

    scheduleTick()
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      lastFrame = performance.now()
      scheduleTick()
    } else if (_perfMonitorRafId !== null) {
      cancelAnimationFrame(_perfMonitorRafId)
      _perfMonitorRafId = null
    }
  })

  scheduleTick()
}

function getPerformanceProfile(settings) {
  ensurePerformanceMonitor()
  const mode = settings.performanceMode || "auto"
  const saveData = navigator.connection?.saveData === true
  const lowCores =
    Number.isFinite(navigator.hardwareConcurrency) &&
    navigator.hardwareConcurrency > 0 &&
    navigator.hardwareConcurrency <= 4
  const smallScreen =
    Math.min(window.innerWidth || 0, window.innerHeight || 0) <= 720
  const shouldSave =
    mode === "low" ||
    mode === "battery" ||
    (mode === "auto" && (saveData || lowCores || smallScreen || _perfLagging))

  const level =
    mode === "low"
      ? "low"
      : shouldSave
        ? "battery"
        : mode === "quality"
          ? "quality"
          : "balanced"

  return { mode, shouldSave, level }
}

function trimMediaCacheForProfile(settings) {
  const mode = settings.performanceMode || "auto"
  const mediaQuality = settings.backgroundMediaQuality || "balanced"
  const shouldTrim =
    mode === "low" ||
    mode === "battery" ||
    mediaQuality === "low" ||
    mediaQuality === "tiny" ||
    mediaQuality === "still" ||
    _perfLagging

  if (!shouldTrim) return
  const now = performance.now()
  if (now - _lastMediaTrim < 5000) return
  _lastMediaTrim = now

  trimMediaMemory({
    keepIds: [settings.background],
    includeThumbnails: false,
    maxUrls: 1,
  })
}

function getEffectPerformanceOptions(settings, effectName) {
  const { mode, shouldSave, level } = getPerformanceProfile(settings)

  if (effectName === "pixelSnowHQ") {
    if (mode === "quality") {
      return {
        targetFps: 36,
        pixelResolution: settings.pixelSnowHQPixelResolution ?? 200,
        density: settings.pixelSnowHQDensity ?? 0.3,
        farPlane: settings.pixelSnowHQFarPlane ?? 20,
        maxSteps: settings.pixelSnowHQVariant === "snowflake" ? 64 : 72,
      }
    }
    if (level === "low") {
      return {
        targetFps: 18,
        pixelResolution: Math.min(
          settings.pixelSnowHQPixelResolution ?? 200,
          96,
        ),
        density: Math.min(settings.pixelSnowHQDensity ?? 0.3, 0.12),
        farPlane: Math.min(settings.pixelSnowHQFarPlane ?? 20, 10),
        maxSteps: settings.pixelSnowHQVariant === "snowflake" ? 28 : 34,
      }
    }
    if (shouldSave) {
      return {
        targetFps: 24,
        pixelResolution: Math.min(
          settings.pixelSnowHQPixelResolution ?? 200,
          150,
        ),
        density: Math.min(settings.pixelSnowHQDensity ?? 0.3, 0.22),
        farPlane: Math.min(settings.pixelSnowHQFarPlane ?? 20, 15),
        maxSteps: settings.pixelSnowHQVariant === "snowflake" ? 44 : 52,
      }
    }
    return {
      targetFps: 30,
      pixelResolution: Math.min(
        settings.pixelSnowHQPixelResolution ?? 200,
        200,
      ),
      density: settings.pixelSnowHQDensity ?? 0.3,
      farPlane: settings.pixelSnowHQFarPlane ?? 20,
      maxSteps: settings.pixelSnowHQVariant === "snowflake" ? 56 : 64,
    }
  }

  if (effectName === "rainHD") {
    if (mode === "quality") {
      return {
        targetFps: 60,
        renderScale: 0.9,
        densityScale: 0.9,
        splashScale: 0.85,
      }
    }
    if (level === "low") {
      return {
        targetFps: 24,
        renderScale: 0.46,
        densityScale: 0.28,
        splashScale: 0.18,
      }
    }
    if (shouldSave) {
      return {
        targetFps: 42,
        renderScale: 0.64,
        densityScale: 0.55,
        splashScale: 0.45,
      }
    }
    return {
      targetFps: 60,
      renderScale: 0.78,
      densityScale: 0.72,
      splashScale: 0.65,
    }
  }

  return {}
}

function withPerformanceBudget(settings, type, options) {
  const { level, shouldSave } = getPerformanceProfile(settings)
  if (level === "quality") return options

  const scale =
    level === "low"
      ? { fps: 20, render: 0.48, density: 0.32, speed: 0.35, detail: 0.38 }
      : shouldSave
        ? { fps: 30, render: 0.72, density: 0.58, speed: 0.62, detail: 0.68 }
        : { fps: 36, render: 0.86, density: 0.78, speed: 0.82, detail: 0.86 }

  switch (type) {
    case "gradientV2":
      return {
        ...options,
        timeSpeed: Math.max(0.04, options.timeSpeed * scale.speed),
        warpFrequency: Math.max(1.2, options.warpFrequency * scale.detail),
        warpSpeed: Math.max(0.2, options.warpSpeed * scale.speed),
        warpAmplitude: Math.max(12, options.warpAmplitude * scale.detail),
        rotationAmount: Math.min(
          options.rotationAmount,
          level === "low" ? 90 : 220,
        ),
        noiseScale: Math.min(options.noiseScale, level === "low" ? 0.9 : 1.4),
        grainAmount: level === "low" ? 0 : Math.min(options.grainAmount, 0.04),
        grainAnimated: level === "low" ? false : options.grainAnimated,
      }
    case "silk":
      return {
        ...options,
        speed: Math.max(0.4, options.speed * scale.speed),
        scale: Math.max(0.65, options.scale * scale.detail),
        noise: Math.max(0.35, options.noise * scale.detail),
      }
    case "lightPillar":
      return {
        ...options,
        intensity: Math.max(0.25, options.intensity * scale.detail),
        rotationSpeed: Math.max(0.04, options.rotationSpeed * scale.speed),
        glowAmount: Math.min(
          options.glowAmount,
          level === "low" ? 0.006 : 0.014,
        ),
        pillarWidth: Math.max(0.8, options.pillarWidth * scale.detail),
        noiseIntensity: Math.max(0.12, options.noiseIntensity * scale.detail),
      }
    case "liquidEther":
      return {
        ...options,
        glowWidth:
          level === "low"
            ? Math.min(options.glowWidth, 3.2)
            : options.glowWidth,
      }
    case "splashCursor":
      return {
        ...options,
        simResolution: Math.min(
          options.simResolution,
          level === "low" ? 64 : 96,
        ),
        dyeResolution: Math.min(
          options.dyeResolution,
          level === "low" ? 192 : 320,
        ),
        pressureIterations: Math.min(
          options.pressureIterations,
          level === "low" ? 8 : 14,
        ),
        curl: Math.min(options.curl, level === "low" ? 1.2 : 2),
        splatRadius: Math.min(
          options.splatRadius,
          level === "low" ? 0.12 : 0.16,
        ),
        splatForce: Math.min(options.splatForce, level === "low" ? 2600 : 4200),
        shading: level === "low" ? false : options.shading,
      }
    case "svgWave":
      return {
        ...options,
        lines: Math.min(options.lines, level === "low" ? 3 : 5),
        amplitudeX: options.amplitudeX * scale.detail,
        amplitudeY: options.amplitudeY * scale.detail,
        craziness: Math.min(options.craziness, level === "low" ? 10 : 20),
        smoothness: Math.max(options.smoothness, level === "low" ? 0.72 : 0.58),
      }
    case "pixelWeather":
      return {
        ...options,
        density: options.density * scale.density,
        resolution: Math.max(options.resolution, level === "low" ? 2.5 : 1.6),
        speed: options.speed * scale.speed,
        size: options.size * (level === "low" ? 0.72 : 0.88),
      }
    case "softAurora":
      return {
        ...options,
        speed: options.speed * scale.speed,
        scale: Math.max(0.8, options.scale * scale.detail),
        brightness: options.brightness * (level === "low" ? 0.72 : 0.86),
        noiseFrequency: options.noiseFrequency * scale.detail,
        noiseAmplitude: options.noiseAmplitude * scale.detail,
        enableMouseInteraction:
          level === "low" ? false : options.enableMouseInteraction,
        mouseInfluence: options.mouseInfluence * scale.detail,
      }
    case "auroraWave":
      return {
        ...options,
        speed: options.speed * scale.speed,
        brightness: options.brightness * (level === "low" ? 0.65 : 0.85),
        waveAmplitude: options.waveAmplitude * scale.detail,
      }
    case "gridScan":
      return {
        ...options,
        speed: options.speed * scale.speed,
        spacing: Math.max(options.spacing, level === "low" ? 90 : 64),
        perspective: level === "low" ? false : options.perspective,
      }
    case "pixelBlast":
      return {
        ...options,
        pixelSize: Math.max(options.pixelSize, level === "low" ? 26 : 18),
        liquidStrength: options.liquidStrength * scale.detail,
        cursorRadius: options.cursorRadius * (level === "low" ? 0.5 : 0.72),
        enableRipples: level === "low" ? false : options.enableRipples,
      }
    default:
      return options
  }
}

function applyEffectPerformanceBudget(effect, settings) {
  if (!effect) return

  const { mode, shouldSave, level } = getPerformanceProfile(settings)

  if (
    Number.isFinite(effect.fps) &&
    effect.fps > 0 &&
    !Number.isFinite(effect._performanceBaseFps)
  ) {
    effect._performanceBaseFps = effect.fps
  }

  const baseFps = effect._performanceBaseFps
  if (Number.isFinite(baseFps) && baseFps > 0) {
    const nextFps =
      level === "low"
        ? Math.min(baseFps, 20)
        : mode === "battery"
          ? Math.min(baseFps, 30)
          : shouldSave
            ? Math.min(baseFps, 36)
            : baseFps

    effect.fps = nextFps
    if ("fpsInterval" in effect) effect.fpsInterval = 1000 / nextFps
  }

  if (
    Number.isFinite(effect.targetFps) &&
    effect.targetFps > 0 &&
    !Number.isFinite(effect._performanceBaseTargetFps)
  ) {
    effect._performanceBaseTargetFps = effect.targetFps
  }

  const baseTargetFps = effect._performanceBaseTargetFps
  if (Number.isFinite(baseTargetFps) && baseTargetFps > 0) {
    effect.targetFps =
      level === "low"
        ? Math.min(baseTargetFps, 20)
        : mode === "battery"
          ? Math.min(baseTargetFps, 30)
          : shouldSave
            ? Math.min(baseTargetFps, 36)
            : baseTargetFps
  }
}

function getCreatedEffect(effectInstances, key) {
  if (!effectInstances?.hasEffect?.(key)) return null
  return effectInstances[key] || null
}

function setEffectActive(effectGrid, value) {
  effectGrid.querySelectorAll(".effect-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.value === value)
  })
}

function createApplySettings(effectInstances) {
  return function applySettings() {
    const settings = getSettings()
    trimMediaCacheForProfile(settings)
    const backgroundSize = getBackgroundSizeValue(settings)
    const backgroundRepeat = getBackgroundRepeatValue(settings)
    const bgChanged = settings.background !== _prevBg
    _prevBg = settings.background
    let shouldUseSvgWave = false
    let shouldUseGradientV2 = false
    let shouldUseSilk = false
    let shouldUseLightPillar = false
    let shouldUseLiquidEther = false
    let shouldUseSplashCursor = false

    // 1. Page Title
    document.title = settings.pageTitle || "Start Page"
    if (typeof effectInstances.applyTabIcon === "function") {
      effectInstances.applyTabIcon(
        settings.tabIcon || settings.tabIconFaClass || "",
      )
    }

    // 1b. Top Right Controls
    const topRightControls = document.getElementById("top-right-controls")
    if (topRightControls) {
      topRightControls.classList.toggle(
        "hidden",
        !settings.showTopRightControls,
      )
    }
    document.body.classList.toggle(
      "hide-top-right-controls",
      settings.showTopRightControls === false,
    )
    document.body.classList.toggle(
      "has-top-right-controls",
      settings.showTopRightControls !== false,
    )
    document.body.classList.toggle(
      "hide-search-bar",
      settings.showSearchBar === false,
    )
    document.body.classList.toggle(
      "allow-text-selection",
      settings.allowTextSelection === true,
    )
    document.body.classList.toggle(
      "bookmark-group-count-hidden",
      settings.bookmarkGroupShowCount === false,
    )
    document.body.classList.toggle(
      "bookmark-group-auto-text-contrast",
      settings.bookmarkGroupAutoTextContrast === true,
    )
    document.body.classList.toggle(
      "bookmark-group-tab-bg-transparent",
      (settings.bookmarkGroupBgOpacity ?? 0) <= 0,
    )

    const donateSection = document.querySelector(".donate-section")
    if (donateSection) {
      donateSection.style.display =
        settings.showDonateButton !== false ? "flex" : "none"
    }

    // 2. Reset Styles
    document.body.classList.remove(
      "bg-layer-active",
      "splash-cursor-dark-bg",
      "bg-image-active",
      "bookmark-sidebar-mode",
      "bookmark-premium-mode",
      "bookmark-taskbar-mode",
      "bookmark-taskbar-top-mode",
      "bookmark-taskbar-left-mode",
      "bookmark-layout-bg-hidden",
      "bookmark-layout-bg-white",
      "bookmark-layout-bg-m3-accent",
      "bookmark-layout-bg-colored",
      "bookmark-item-card-style",
      "bookmark-group-accent-enabled",
      "bookmark-group-keep-bg-on-interaction",
      "bookmark-group-auto-text-contrast",
      "bookmark-group-tab-bg-transparent",
      "bookmark-group-container-bg-hidden",
      "bookmark-group-border-hidden",
      "hide-bookmark-text",
      "bookmark-long-text",
      "hide-bookmark-bg",
      "flip-layout",
    )

    // Quick Access White Mode (light-mode)
    const sideControls = document.querySelector(".side-controls")
    const isWhiteMode = settings.showQuickAccessBg === true
    if (sideControls) {
      sideControls.classList.toggle("light-mode", isWhiteMode)
      document.body.classList.toggle("quick-access-white", isWhiteMode)
    }
    document.body.classList.toggle(
      "widgets-m3-accent",
      settings.widgetUseM3Accent === true,
    )
    document.body.classList.toggle(
      "sidebar-m3-accent",
      settings.sidebarUseM3Accent === true,
    )
    document.body.classList.toggle(
      "quick-access-m3-accent",
      settings.quickAccessSkin === "m3-accent",
    )
    
    const qaToggleDisplay = (toggleDataAttr, show) => {
      const btn = document.querySelector(`.quick-btn[data-toggle="${toggleDataAttr}"]`)
      if (btn) {
        btn.style.display = show !== false ? "" : "none"
      }
    }
    qaToggleDisplay("todo", settings.qaShowTodo)
    qaToggleDisplay("notepad", settings.qaShowNotepad)
    qaToggleDisplay("timer", settings.qaShowTimer)
    qaToggleDisplay("calendar", settings.qaShowCalendar)
    qaToggleDisplay("quotes", settings.qaShowQuotes)
    qaToggleDisplay("weather", settings.qaShowWeather)
    qaToggleDisplay("music", settings.qaShowMusic)
    qaToggleDisplay("clock", settings.qaShowClock)
    qaToggleDisplay("gregorian", settings.qaShowGregorian)
    qaToggleDisplay("rss", settings.qaShowRss)
    document.body.classList.toggle(
      "quick-access-light-transparent",
      settings.quickAccessSkin === "light-transparent",
    )
    document.body.classList.toggle(
      "quick-access-light",
      settings.quickAccessSkin === "light",
    )
    document.body.classList.toggle(
      "quick-access-transparent",
      false,
    )
    document.body.classList.toggle(
      "bookmark-group-accent-enabled",
      settings.bookmarkGroupUseAccent === true,
    )
    document.body.classList.toggle(
      "bookmark-group-keep-bg-on-interaction",
      settings.bookmarkGroupKeepBgOnInteraction !== false,
    )
    document.body.classList.toggle(
      "bookmark-group-auto-text-contrast",
      settings.bookmarkGroupAutoTextContrast === true,
    )
    document.body.classList.toggle(
      "bookmark-group-tab-bg-transparent",
      (settings.bookmarkGroupBgOpacity ?? 0) <= 0,
    )
    document.body.classList.toggle(
      "bookmark-group-container-bg-hidden",
      settings.bookmarkGroupContainerBgHidden === true,
    )
    document.body.classList.toggle(
      "bookmark-group-border-hidden",
      settings.bookmarkGroupBorderHidden === true,
    )

    // Apply Widget Skins
    const widgetSkinsMap = {
      todo: "todo-container",
      timer: "timer-component",
      calendar: "full-calendar-container",
      weather: "weather-container",
      notepad: "notepad-container",
      quotes: "daily-quotes",
      musicPlayer: "music-player-container",
      visualizer: "visualizer-container",
    }

    Object.entries(widgetSkinsMap).forEach(([key, id]) => {
      const el = document.getElementById(id)
      if (el) {
        const skin = settings.widgetUseM3Accent === true
          ? "m3-accent"
          : settings[`${key}Skin`]
        el.classList.toggle("skin-white-blur", skin === "white-blur")
        el.classList.toggle("skin-m3-accent", skin === "m3-accent")
        el.classList.toggle("skin-transparent", skin === "transparent")
        el.classList.toggle("skin-light-transparent", skin === "light-transparent")
        el.classList.toggle(
          "widget-border-hidden",
          settings[`${key}HideBorder`] === true,
        )

        // Special handling for music player wrapper inside its container
        if (key === "musicPlayer") {
          const wrapper = el.querySelector(".music-player-wrapper")
          if (wrapper) {
            wrapper.classList.toggle("skin-white-blur", skin === "white-blur")
            wrapper.classList.toggle("skin-m3-accent", skin === "m3-accent")
            wrapper.classList.toggle("skin-transparent", skin === "transparent")
            wrapper.classList.toggle("skin-light-transparent", skin === "light-transparent")
            wrapper.classList.toggle(
              "widget-border-hidden",
              settings.musicPlayerHideBorder === true,
            )
          }
        }
      }
    })

    document.body.className.split(" ").forEach((cls) => {
      if (cls.startsWith("date-clock-style-"))
        document.body.classList.remove(cls)
    })

    const bgLayer = document.getElementById("bg-layer")
    const bgFadeLayer = document.getElementById("bg-fade-layer")
    const bgVideoElement = document.getElementById("bg-video")
    const rawBg = settings.background
    const isFirstLoad = document.body.classList.contains("preload-bg-ready")
    // Only keep the startup preview while the same kind of local media is still
    // resolving. For colors/reset/gradients it is stale and causes a one-frame flash.
    const previewExists = Boolean(
      isIdbMedia(rawBg) &&
        settings.lastUserBackgroundPreview &&
        isFirstLoad,
    )
    const isNextPredefinedLocalBg = effectInstances.localBackgrounds.some(
      (b) => b.id === rawBg,
    )
    const isNextVideoBg = isVideoBackgroundValue(rawBg)
    const isNextImageBg =
      typeof rawBg === "string" &&
      (rawBg.startsWith("data:image") ||
        rawBg.startsWith("blob:") ||
        rawBg.match(/^https?:\/\//) ||
        isIdbImage(rawBg))
    const isWaitingForIdb = isIdbMedia(rawBg) && !getBlobUrlSync(rawBg)
    const isPredefinedLocalBg = !isWaitingForIdb && isNextPredefinedLocalBg
    const isUserUploadedBg =
      !isWaitingForIdb &&
      rawBg &&
      (rawBg.startsWith("data:image") ||
        rawBg.startsWith("data:video") ||
        rawBg.startsWith("blob:") ||
        isIdbImage(rawBg) ||
        isIdbVideo(rawBg))

    // Re-evaluate background class requirements and add them back to body
    // to prevent intermediate updates (e.g. auto accent changes) from stripping them.
    const isAnimatedBg =
      settings.gradientV2Active ||
      settings.silkActive ||
      settings.lightPillarActive ||
      settings.liquidEtherActive ||
      settings.svgWaveActive ||
      (settings.splashCursorActive && settings.splashCursorDarkBg === true)

    const isMultiColorActive =
      settings.activeBgUid?.startsWith("multi-") ||
      (settings.multiColorActive === true &&
        !settings.activeBgUid?.startsWith("grad-"))
    const isStaticGradient = !settings.background && !isAnimatedBg && !isMultiColorActive

    let shouldApplyBackgroundLogic = bgChanged || isAnimatedBg || settings.splashCursorActive || isMultiColorActive || isStaticGradient
    if (isWaitingForIdb) {
      shouldApplyBackgroundLogic = false

      // Start IDB media async load
      import("../../services/imageStore.js").then((m) => {
        m.getImageUrl(rawBg).then((url) => {
          if (getSettings().background === rawBg) {
            if (url) {
              // crossfade from early preview to sharp image
              _prevBg = "force-idb-crossfade-" + Date.now()
              applySettings()
            } else {
              // Fallback: trigger fadeout to prevent page freezing if load failed
              triggerBgFadeOut()
            }
          }
        }).catch(() => {
          if (getSettings().background === rawBg) {
            triggerBgFadeOut()
          }
        })
      })

      // If we don't have an immediate blob URL but a persistent preview exists,
      // use that preview so the background shows instantly while the real image loads.
      if (
        settings.lastUserBackgroundPreview &&
        typeof settings.lastUserBackgroundPreview === "string" &&
        (settings.lastUserBackgroundPreview.startsWith("data:") ||
          settings.lastUserBackgroundPreview.startsWith("blob:")) &&
        !isFirstLoad
      ) {
        const preview = settings.lastUserBackgroundPreview
        if (bgLayer) {
          bgLayer.style.background = ""
          bgLayer.style.backgroundImage = cssUrl(preview)
          bgLayer.style.backgroundSize = backgroundSize
          bgLayer.style.backgroundRepeat = backgroundRepeat
          bgLayer.style.backgroundPosition = "var(--bg-pos-x) var(--bg-pos-y)"
        }
        document.body.classList.add("bg-layer-active")
      }
      if (!isNextVideoBg) clearBackgroundVideo(bgVideoElement)
      document.documentElement.style.setProperty("--text-color", "#ffffff")
    }

    if (isAnimatedBg) {
      document.body.classList.add("bg-layer-active")
    } else if (isNextPredefinedLocalBg) {
      document.body.classList.add("bg-layer-active")
    } else if (isNextVideoBg) {
      document.body.classList.add("bg-image-active")
    } else if (isNextImageBg) {
      document.body.classList.add("bg-image-active")
      if (isWaitingForIdb) {
        document.body.classList.add("bg-layer-active")
      }
    } else if (rawBg) {
      const isVideoUrl =
        typeof rawBg === "string" &&
        (rawBg.match(/\.(mp4|webm|mov|ogg)$/) || rawBg.includes("googlevideo"))
      const isImageUrl = typeof rawBg === "string" && rawBg.match(/^https?:\/\//)
      if (isVideoUrl || isImageUrl) {
        document.body.classList.add("bg-image-active")
      } else {
        document.body.classList.add("bg-layer-active")
      }
    } else {
      document.body.classList.add("bg-layer-active")
    }

    const shouldCarryFadeLayer =
      (bgChanged || isWaitingForIdb) && (isNextPredefinedLocalBg || isNextImageBg || isNextVideoBg) && (!isFirstLoad || previewExists)

    function triggerBgFadeOut() {
      document.body.classList.remove("preload-bg-ready", "preload-bg-preview")
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const _bgFadeLayer = document.getElementById("bg-fade-layer")
          if (_bgFadeLayer) {
            _bgFadeLayer.style.opacity = "0"
            const fadeInSec = Number(getSettings().bgFadeIn ?? 0.5)
            window.setTimeout(
              () => {
                if (_bgFadeLayer.style.opacity === "0") {
                  _bgFadeLayer.className = ""
                  _bgFadeLayer.style.background = ""
                  _bgFadeLayer.style.backgroundImage = ""
                  _bgFadeLayer.style.backgroundSize = ""
                  _bgFadeLayer.style.backgroundRepeat = ""
                }
              },
              Math.max(250, fadeInSec * 1000 + 120),
            )
          }
          const _bgVideo = document.getElementById("bg-video")
          if (_bgVideo && _bgVideo.style.display === "block") {
            if (isFirstLoad) {
              _bgVideo.style.transition = "none"
              _bgVideo.style.opacity = "1"
              _bgVideo.offsetHeight // force reflow
              _bgVideo.style.transition = ""
            } else {
              _bgVideo.style.opacity = "1"
            }
          }
          const _bgLayer = document.getElementById("bg-layer")
          if (_bgLayer) {
            _bgLayer.style.opacity = "1"
          }
        }),
      )
    }

    if (shouldApplyBackgroundLogic) {
      if (!isFirstLoad) {
        document.body.classList.remove("preload-bg-ready", "preload-bg-preview")
        document.body.style.background = ""
        document.body.style.backgroundImage = ""
        if (shouldCarryFadeLayer && bgLayer && bgFadeLayer) {
          bgFadeLayer.style.transition = "none"
          bgFadeLayer.className = bgLayer.className
          bgFadeLayer.style.background = bgLayer.style.background
          
          let currentBg = bgLayer.style.backgroundImage
          if (isFirstLoad && previewExists && settings.lastUserBackgroundPreview) {
            currentBg = cssUrl(settings.lastUserBackgroundPreview)
          }
          bgFadeLayer.style.backgroundImage = currentBg
          bgFadeLayer.style.backgroundSize = bgLayer.style.backgroundSize
          bgFadeLayer.style.backgroundRepeat = bgLayer.style.backgroundRepeat
          bgFadeLayer.style.backgroundPosition = bgLayer.style.backgroundPosition
          bgFadeLayer.style.opacity = "1"
          
          if (isFirstLoad && previewExists) {
            bgFadeLayer.style.filter = "blur(12px) brightness(0.9)"
            bgFadeLayer.style.transform = "scale(1.02)"
          } else {
            bgFadeLayer.style.filter = bgLayer.style.filter
            bgFadeLayer.style.transform = bgLayer.style.transform
          }
          
          bgFadeLayer.offsetHeight // force reflow
          bgFadeLayer.style.transition = "" // restore transition
        } else if (bgFadeLayer) {
          bgFadeLayer.className = ""
          bgFadeLayer.style.background = ""
          bgFadeLayer.style.backgroundImage = ""
          bgFadeLayer.style.backgroundSize = ""
          bgFadeLayer.style.backgroundRepeat = ""
          bgFadeLayer.style.opacity = "0"
        }
        if (bgLayer) {
          // Do NOT clear bgLayer's background image yet to prevent blank flashes!
          // We only clear it if we are switching to color/gradient/none (which don't need async loading).
          // Also skip clearing for animated backgrounds – the bgLayer keeps its
          // fallback gradient until the canvas effect is ready to render.
          if (!isNextPredefinedLocalBg && !isNextImageBg && !isNextVideoBg && !isAnimatedBg) {
            bgLayer.style.backgroundImage = ""
            bgLayer.style.backgroundSize = ""
            bgLayer.style.backgroundRepeat = ""
            bgLayer.style.background = ""
            bgLayer.className = ""
          }
          bgLayer.style.opacity = "1"
        }
      } else {
        // Keep the preload preview active; ensure classes indicate background present
        document.body.classList.add("bg-layer-active")
        if (bgLayer) bgLayer.style.opacity = "1"
      }
      if (!isNextVideoBg) clearBackgroundVideo(bgVideoElement)
      document.documentElement.style.setProperty("--text-color", "#ffffff")

      // 3. Background Logic
      let bg = rawBg
      // Resolve IndexedDB image/video ID to blob URL
      const isVideoId = isIdbVideo(bg)
      if (isIdbMedia(bg)) {
        const cachedUrl = getBlobUrlSync(bg)
        if (cachedUrl) {
          bg = cachedUrl
        }
      }

      let activeVideoSource = null

      if (bgVideoElement) bgVideoElement.style.display = "none"
      if (bgVideoElement) {
        configureBackgroundVideo(bgVideoElement, settings)
        applyBackgroundVideoLayout(bgVideoElement, settings)
      }

      const setBackgroundImageSmoothly = (imageUrl) => {
        if (!bgLayer || !imageUrl) return

        document.body.classList.add("bg-layer-active")

        // If a blurry startup preview is currently visible, we must copy it
        // into bg-fade-layer BEFORE decoding the real image.  This prevents a
        // jarring flash where blur/scale un-animate on top of the wrong image.
        const hasPreloadPreview = document.body.classList.contains("preload-bg-preview")
        if (hasPreloadPreview && bgFadeLayer) {
          // Snapshot the current blurry preview state into the fade layer so it
          // can smoothly fade out while bg-layer shows the crisp image.
          // NOTE: preload.js sets bg via CSS stylesheet (not inline style), so
          // we must use getComputedStyle to read the actual background-image value.
          const computedBg = window.getComputedStyle(bgLayer)
          const snapshotBgImage = bgLayer.style.backgroundImage ||
            (settings.lastUserBackgroundPreview ? `url(${JSON.stringify(settings.lastUserBackgroundPreview)})` : computedBg.backgroundImage) ||
            computedBg.backgroundImage
          bgFadeLayer.style.transition = "none"
          bgFadeLayer.style.background = ""
          bgFadeLayer.style.backgroundImage = snapshotBgImage
          bgFadeLayer.style.backgroundSize = bgLayer.style.backgroundSize || computedBg.backgroundSize || backgroundSize
          bgFadeLayer.style.backgroundRepeat = bgLayer.style.backgroundRepeat || computedBg.backgroundRepeat || backgroundRepeat
          bgFadeLayer.style.backgroundPosition = bgLayer.style.backgroundPosition || "var(--bg-pos-x) var(--bg-pos-y)"
          // Apply the same blur/scale the preview was using so it looks identical
          bgFadeLayer.style.filter = "blur(8px) brightness(0.9)"
          bgFadeLayer.style.transform = "scale(1.02) translateZ(0)"
          bgFadeLayer.style.opacity = "1"
          bgFadeLayer.offsetHeight // force reflow
          bgFadeLayer.style.transition = "" // restore CSS transition

          // Now immediately clear the preview state from bg-layer so the real
          // image will appear without blur once decoded.
          document.body.classList.remove("preload-bg-preview", "preload-bg-ready")

          // PRE-SET the real image on bg-layer SYNCHRONOUSLY so there's never
          // a blank frame between fade-layer fading out and bg-layer appearing.
          bgLayer.style.backgroundImage = cssUrl(imageUrl)
          bgLayer.style.backgroundSize = backgroundSize
          bgLayer.style.backgroundRepeat = backgroundRepeat
        }

        const img = new Image()

        const applyStyles = () => {
          // If we didn't pre-set it above, set it now that it has finished downloading
          if (!hasPreloadPreview) {
            bgLayer.style.backgroundImage = cssUrl(imageUrl)
            bgLayer.style.backgroundSize = backgroundSize
            bgLayer.style.backgroundRepeat = backgroundRepeat
          } else {
            // Ensure size/repeat are correct in case they changed
            bgLayer.style.backgroundSize = backgroundSize
            bgLayer.style.backgroundRepeat = backgroundRepeat
          }
          document.body.classList.remove("preload-bg-preview")
          document.body.classList.remove("preload-bg-ready")
          triggerBgFadeOut()
        }

        if (typeof img.decode === "function") {
          img.src = imageUrl
          img.decode()
            .then(applyStyles)
            .catch(() => {
              applyStyles()
            })
        } else {
          img.onload = applyStyles
          img.onerror = () => {
            document.body.classList.remove("preload-bg-preview")
            triggerBgFadeOut()
          }
          img.src = imageUrl
        }
      }

      const applyUserSelectedBackground = () => {
        if (isPredefinedLocalBg) {
          if (bgLayer) bgLayer.classList.add(bg)
          document.body.classList.add("bg-layer-active")
          document.documentElement.style.setProperty("--text-color", "#ffffff")
          triggerBgFadeOut()
        } else if (isUserUploadedBg) {
          document.body.classList.add("bg-image-active")
          if (bg.startsWith("data:video") || isVideoId) {
            if (bgVideoElement) {
              activeVideoSource = bg
              if (isIdbMedia(bg)) {
                const url = getBlobUrlSync(bg)
                if (url) activeVideoSource = url
              }
              if (
                activeVideoSource &&
                bgVideoElement.getAttribute("src") !== activeVideoSource
              ) {
                bgVideoElement.src = activeVideoSource
              }
              bgVideoElement.style.display = "block"
              if (isFirstLoad) {
                bgVideoElement.style.transition = "none"
                bgVideoElement.style.opacity = "1"
                bgVideoElement.offsetHeight // force reflow
                bgVideoElement.style.transition = ""
              } else {
                bgVideoElement.style.opacity = "1"
              }
              const onVideoReady = () => {
                bgVideoElement.removeEventListener("playing", onVideoReady)
                bgVideoElement.removeEventListener("canplay", onVideoReady)
                triggerBgFadeOut()
              }
              bgVideoElement.addEventListener("playing", onVideoReady, { once: true })
              bgVideoElement.addEventListener("canplay", onVideoReady, { once: true })
            }
          } else if (bgLayer) {
            const preview = settings.lastUserBackgroundPreview
            // If we have a high-res preview (> 10KB), we can use it directly as the final background
            // on first load to bypass the expensive blob decoding and crossfading entirely,
            // making it 100% perfectly smooth just like URL backgrounds.
            if (false) {
              // Bypass disabled: always load the original image to prevent pixelation.
              bgLayer.style.backgroundImage = cssUrl(preview)
              bgLayer.style.backgroundSize = backgroundSize
              bgLayer.style.backgroundRepeat = backgroundRepeat
              document.body.classList.remove("preload-bg-preview")
              triggerBgFadeOut()
            } else {
              let imageUrl = bg
              if (isIdbMedia(bg)) imageUrl = getBlobUrlSync(bg)
              if (imageUrl) {
                setBackgroundImageSmoothly(imageUrl)
              } else {
                triggerBgFadeOut()
              }
            }
          }
          document.body.style.backgroundSize = backgroundSize
          document.body.style.backgroundRepeat = backgroundRepeat
          document.documentElement.style.setProperty("--text-color", "#ffffff")
        } else if (bg) {
          document.body.classList.add("bg-image-active")
          const isVideoUrl =
            bg.match(/\.(mp4|webm|mov|ogg)$/) || bg.includes("googlevideo")
          if (isVideoUrl) {
            if (bgVideoElement) {
              activeVideoSource = bg
              if (bgVideoElement.getAttribute("src") !== activeVideoSource) {
                bgVideoElement.src = activeVideoSource
              }
              bgVideoElement.style.display = "block"
              if (isFirstLoad) {
                bgVideoElement.style.transition = "none"
                bgVideoElement.style.opacity = "1"
                bgVideoElement.offsetHeight // force reflow
                bgVideoElement.style.transition = ""
              } else {
                bgVideoElement.style.opacity = "1"
              }
              const onVideoReady = () => {
                bgVideoElement.removeEventListener("playing", onVideoReady)
                bgVideoElement.removeEventListener("canplay", onVideoReady)
                triggerBgFadeOut()
              }
              bgVideoElement.addEventListener("playing", onVideoReady, { once: true })
              bgVideoElement.addEventListener("canplay", onVideoReady, { once: true })
            }
            document.documentElement.style.setProperty("--text-color", "#ffffff")
          } else if (bg.match(/^https?:\/\//)) {
            if (bgLayer) {
              setBackgroundImageSmoothly(bg)
            }
            document.documentElement.style.setProperty("--text-color", "#ffffff")
          } else {
            if (bgLayer) {
              bgLayer.style.backgroundImage = "none"
              bgLayer.style.background = bg
            }
            document.body.classList.add("bg-layer-active")
            document.documentElement.style.setProperty(
              "--text-color",
              getContrastYIQ(bg),
            )
            triggerBgFadeOut()
          }
        } else {
          if (bgLayer) {
            bgLayer.style.backgroundImage = "none"
            const isMultiColorActive =
              settings.activeBgUid?.startsWith("multi-") ||
              (settings.multiColorActive === true &&
                !settings.activeBgUid?.startsWith("grad-"))

            if (
              isMultiColorActive &&
              Array.isArray(settings.multiColors) &&
              settings.multiColors.length >= 2
            ) {
              bgLayer.style.backgroundImage = ""
              bgLayer.style.background = buildMultiColorCss({
                colors: settings.multiColors,
                angle: settings.multiGradientAngle || 135,
                mode: settings.multiColorMode || "smooth",
                type: settings.multiColorType || "linear",
                repeating: settings.multiColorRepeating || false,
                position: settings.multiColorPosition || "center",
                radialShape: settings.multiColorRadialShape || "circle",
                dividerConfig: {
                  enabled: settings.multiColorDividers !== false,
                  color: settings.multiColorDividerColor || "#FFFFFF",
                  width: settings.multiColorDividerWidth || 1.2,
                },
                lineAngleConfig: {
                  enabled: Boolean(settings.multiColorFreeLineAngles),
                  lineAngles: Array.isArray(settings.multiColorLineAngles)
                    ? settings.multiColorLineAngles
                    : [],
                },
              })
            } else {
              bgLayer.style.backgroundImage = ""
              bgLayer.style.background = buildGradientCss({
                start: settings.gradientStart,
                end: settings.gradientEnd,
                angle: settings.gradientAngle,
                type: settings.gradientType,
                repeating: settings.gradientRepeating,
                extraColorCount: settings.gradientExtraColorCount,
                customColors: settings.gradientCustomColors,
                position: settings.gradientPosition,
                radialShape: settings.gradientRadialShape,
              })
            }
          }
          document.body.classList.add("bg-layer-active")
          triggerBgFadeOut()
        }
      }

      // Priority 1: Gradient V2 (Animated)
      if (settings.gradientV2Active && effectInstances.gradientV2Effect) {
        shouldUseGradientV2 = true
        document.body.classList.add("bg-layer-active")
        if (bgLayer) {
          bgLayer.style.backgroundImage = "none"
          bgLayer.style.background = `linear-gradient(135deg, ${settings.gradientV2Color1 || "#0f172a"}, ${settings.gradientV2Color2 || "#1d4ed8"}, ${settings.gradientV2Color3 || "#7c3aed"})`
        }
        const gradientV2Options = withPerformanceBudget(settings, "gradientV2", {
          color1: settings.gradientV2Color1,
          color2: settings.gradientV2Color2,
          color3: settings.gradientV2Color3,
          timeSpeed: settings.gradientV2TimeSpeed,
          colorBalance: settings.gradientV2ColorBalance,
          warpStrength: settings.gradientV2WarpStrength,
          warpFrequency: settings.gradientV2WarpFrequency,
          warpSpeed: settings.gradientV2WarpSpeed,
          warpAmplitude: settings.gradientV2WarpAmplitude,
          blendAngle: settings.gradientV2BlendAngle,
          blendSoftness: settings.gradientV2BlendSoftness,
          rotationAmount: settings.gradientV2RotationAmount,
          noiseScale: settings.gradientV2NoiseScale,
          grainAmount: settings.gradientV2GrainAmount,
          grainScale: settings.gradientV2GrainScale,
          grainAnimated: settings.gradientV2GrainAnimated,
          contrast: settings.gradientV2Contrast,
          gamma: settings.gradientV2Gamma,
          saturation: settings.gradientV2Saturation,
          centerX: settings.gradientV2CenterX,
          centerY: settings.gradientV2CenterY,
          zoom: settings.gradientV2Zoom,
        })
        if (effectInstances.gradientV2Effect.active) {
          effectInstances.gradientV2Effect.setOptions(gradientV2Options)
        } else {
          effectInstances.gradientV2Effect.start()
          effectInstances.gradientV2Effect.setOptions(gradientV2Options)
        }
        triggerBgFadeOut()
      }
      // Priority 1.5: Silk (Animated)
      else if (settings.silkActive && effectInstances.silkEffect) {
        shouldUseSilk = true
        document.body.classList.add("bg-layer-active")
        if (bgLayer) {
          bgLayer.style.backgroundImage = "none"
          bgLayer.style.background = `radial-gradient(circle at center, ${settings.silkColor || "#7B7481"}, #050505)`
        }
        const silkOpts = withPerformanceBudget(settings, "silk", {
          color: settings.silkColor || "#7B7481",
          speed: settings.silkSpeed ?? 5.0,
          scale: settings.silkScale ?? 1.0,
          noise: settings.silkNoise ?? 1.5,
          rotation: settings.silkRotation ?? 0.0,
        })
        if (effectInstances.silkEffect.active) {
          effectInstances.silkEffect.setOptions(silkOpts)
        } else {
          effectInstances.silkEffect.start()
          effectInstances.silkEffect.setOptions(silkOpts)
        }
        triggerBgFadeOut()
      }
      // Priority 1.6: Light Pillar (Animated)
      else if (settings.lightPillarActive && effectInstances.lightPillarEffect) {
        shouldUseLightPillar = true
        document.body.classList.add("bg-layer-active")
        if (bgLayer) {
          bgLayer.style.backgroundImage = "none"
          bgLayer.style.background = `linear-gradient(180deg, ${settings.lightPillarTopColor || "#ffffff"}, ${settings.lightPillarBottomColor || "#000000"})`
        }
        const pillarOpts = withPerformanceBudget(settings, "lightPillar", {
          topColor: settings.lightPillarTopColor || "#ffffff",
          bottomColor: settings.lightPillarBottomColor || "#000000",
          intensity: settings.lightPillarIntensity ?? 0.85,
          rotationSpeed: settings.lightPillarRotationSpeed ?? 0.04,
          glowAmount: settings.lightPillarGlowAmount ?? 0.4,
          pillarWidth: settings.lightPillarWidth ?? 0.15,
          pillarHeight: settings.lightPillarHeight ?? 0.6,
          noiseIntensity: settings.lightPillarNoiseIntensity ?? 0.5,
          pillarRotation: settings.lightPillarRotation ?? 0,
        })
        if (effectInstances.lightPillarEffect.active) {
          effectInstances.lightPillarEffect.setOptions(pillarOpts)
        } else {
          effectInstances.lightPillarEffect.start()
          effectInstances.lightPillarEffect.setOptions(pillarOpts)
        }
        triggerBgFadeOut()
      }
      // Priority 1.65: Liquid Ether (Animated)
      else if (settings.liquidEtherActive && effectInstances.liquidEtherEffect) {
        shouldUseLiquidEther = true
        document.body.classList.add("bg-layer-active")
        if (bgLayer) {
          bgLayer.style.backgroundImage = "none"
          bgLayer.style.background = `linear-gradient(135deg, ${settings.liquidEtherColor1 || "#5227FF"}, ${settings.liquidEtherColor2 || "#FF9FFC"}, ${settings.liquidEtherColor3 || "#B497CF"})`
        }
        const liquidEtherOptions = withPerformanceBudget(
          settings,
          "liquidEther",
          {
            colors: [
              settings.liquidEtherColor1 || "#5227FF",
              settings.liquidEtherColor2 || "#FF9FFC",
              settings.liquidEtherColor3 || "#B497CF",
            ],
            glowWidth: settings.liquidEtherGlowWidth ?? 5.5,
          },
        )
        if (effectInstances.liquidEtherEffect.active) {
          effectInstances.liquidEtherEffect.updateSettings(liquidEtherOptions)
        } else {
          effectInstances.liquidEtherEffect.start()
          effectInstances.liquidEtherEffect.updateSettings(liquidEtherOptions)
        }
        triggerBgFadeOut()
      }
      // Priority 1.75: Splash Cursor (Animated)
      else if (
        settings.splashCursorActive &&
        effectInstances.splashCursorEffect
      ) {
        shouldUseSplashCursor = true
        document.body.classList.add("bg-layer-active")
        if (settings.splashCursorDarkBg === true) {
          document.body.classList.add("splash-cursor-dark-bg")
          if (bgLayer) {
            bgLayer.style.background = "#000000"
            bgLayer.style.backgroundImage = "none"
            bgLayer.style.opacity = "1"
          }
          document.documentElement.style.setProperty("--text-color", "#ffffff")
          triggerBgFadeOut()
        } else {
          applyUserSelectedBackground()
        }
        const splashOpts = withPerformanceBudget(
          settings,
          "splashCursor",
          splashCursorOptionsFromSettings(settings),
        )
        if (effectInstances.splashCursorEffect.active) {
          effectInstances.splashCursorEffect.setOptions(splashOpts)
        } else {
          effectInstances.splashCursorEffect.start()
          effectInstances.splashCursorEffect.setOptions(splashOpts)
        }
      }

      // Priority 2: SVG Wave
      else if (settings.svgWaveActive && effectInstances.svgWaveEffect) {
        shouldUseSvgWave = true
        document.body.classList.add("bg-layer-active")
        applyUserSelectedBackground()
        const svgWaveParams = withPerformanceBudget(
          settings,
          "svgWave",
          getSvgWaveParams(settings),
        )
        if (effectInstances.svgWaveEffect.active) {
          effectInstances.svgWaveEffect.update(svgWaveParams)
        } else {
          effectInstances.svgWaveEffect.start(svgWaveParams)
        }
      }

      // Fallback: animated background is active but the effect factory module
      // hasn't finished loading yet – show a static gradient placeholder on
      // bgLayer so the user doesn't see a black screen.  The lazy factory
      // callback will call applySettings() again once the module is ready.
      else if (
        isAnimatedBg &&
        !shouldUseGradientV2 &&
        !shouldUseSilk &&
        !shouldUseLightPillar &&
        !shouldUseLiquidEther &&
        !shouldUseSplashCursor &&
        !shouldUseSvgWave
      ) {
        document.body.classList.add("bg-layer-active")
        if (bgLayer) {
          if (settings.gradientV2Active) {
            bgLayer.style.background = `linear-gradient(135deg, ${settings.gradientV2Color1 || "#0f172a"}, ${settings.gradientV2Color2 || "#1d4ed8"}, ${settings.gradientV2Color3 || "#7c3aed"})`
          } else if (settings.silkActive) {
            bgLayer.style.background = `radial-gradient(circle at center, ${settings.silkColor || "#7B7481"}, #050505)`
          } else if (settings.lightPillarActive) {
            bgLayer.style.background = `linear-gradient(180deg, ${settings.lightPillarTopColor || "#ffffff"}, ${settings.lightPillarBottomColor || "#000000"})`
          } else if (settings.liquidEtherActive) {
            bgLayer.style.background = `linear-gradient(135deg, ${settings.liquidEtherColor1 || "#5227FF"}, ${settings.liquidEtherColor2 || "#FF9FFC"}, ${settings.liquidEtherColor3 || "#B497CF"})`
          } else if (settings.splashCursorActive && settings.splashCursorDarkBg === true) {
            bgLayer.style.background = "#000000"
          } else {
            applyUserSelectedBackground()
          }
          bgLayer.style.opacity = "1"
        }
        document.documentElement.style.setProperty("--text-color", "#ffffff")
        triggerBgFadeOut()
      }

      // Priority 3: Predefined Theme Background
      else if (isPredefinedLocalBg) {
        if (bgLayer) bgLayer.classList.add(bg)
        document.body.classList.add("bg-layer-active")
        document.documentElement.style.setProperty("--text-color", "#ffffff")
        triggerBgFadeOut()
      }
      // Priority 4: User Uploaded Image/Video
      else if (isUserUploadedBg) {
        document.body.classList.add("bg-image-active")
        if (bg.startsWith("data:video") || isVideoId) {
          if (bgVideoElement) {
            activeVideoSource = bg
            if (isIdbMedia(bg)) {
              const url = getBlobUrlSync(bg)
              if (url) {
                activeVideoSource = url
                if (bgVideoElement.getAttribute("src") !== activeVideoSource) {
                  bgVideoElement.src = activeVideoSource
                }
                bgVideoElement.style.display = "block"
                bgVideoElement.style.opacity = "1"
              } else {
                bgVideoElement.style.display = "block"
              }
            } else {
              if (bgVideoElement.getAttribute("src") !== activeVideoSource) {
                bgVideoElement.src = activeVideoSource
              }
              bgVideoElement.style.display = "block"
              bgVideoElement.style.opacity = "1"
            }
            const onVideoReady = () => {
              bgVideoElement.removeEventListener("playing", onVideoReady)
              bgVideoElement.removeEventListener("canplay", onVideoReady)
              triggerBgFadeOut()
            }
            bgVideoElement.addEventListener("playing", onVideoReady, { once: true })
            bgVideoElement.addEventListener("canplay", onVideoReady, { once: true })
          }
        } else {
          if (bgLayer) {
            let imageUrl = bg
            if (isIdbMedia(bg)) imageUrl = getBlobUrlSync(bg)
            if (imageUrl) {
              if (isFirstLoad) {
                // Snapshot the blurry preview into bg-fade-layer BEFORE touching
                // bg-layer so the real image appears crisp without a blur flash.
                const _hasPrev = document.body.classList.contains("preload-bg-preview")
                if (_hasPrev && bgFadeLayer) {
                  const _computedBg = window.getComputedStyle(bgLayer)
                  const _snapshotBgImage = bgLayer.style.backgroundImage ||
                    (settings.lastUserBackgroundPreview ? `url(${JSON.stringify(settings.lastUserBackgroundPreview)})` : _computedBg.backgroundImage) ||
                    _computedBg.backgroundImage
                  bgFadeLayer.style.transition = "none"
                  bgFadeLayer.style.background = ""
                  bgFadeLayer.style.backgroundImage = _snapshotBgImage
                  bgFadeLayer.style.backgroundSize = bgLayer.style.backgroundSize || _computedBg.backgroundSize || backgroundSize
                  bgFadeLayer.style.backgroundRepeat = bgLayer.style.backgroundRepeat || _computedBg.backgroundRepeat || backgroundRepeat
                  bgFadeLayer.style.backgroundPosition = bgLayer.style.backgroundPosition || "var(--bg-pos-x) var(--bg-pos-y)"
                  bgFadeLayer.style.filter = "blur(8px) brightness(0.9)"
                  bgFadeLayer.style.transform = "scale(1.02) translateZ(0)"
                  bgFadeLayer.style.opacity = "1"
                  bgFadeLayer.offsetHeight // force reflow
                  bgFadeLayer.style.transition = ""
                  document.body.classList.remove("preload-bg-preview", "preload-bg-ready")
                  // Pre-set real image so bg-layer is never blank while fade-layer fades out
                  bgLayer.style.backgroundImage = cssUrl(imageUrl)
                  bgLayer.style.backgroundSize = backgroundSize
                  bgLayer.style.backgroundRepeat = backgroundRepeat
                  triggerBgFadeOut()
                } else {
                  // No blurry preview — decode image before revealing to avoid black flash
                  bgLayer.style.backgroundImage = cssUrl(imageUrl)
                  bgLayer.style.backgroundSize = backgroundSize
                  bgLayer.style.backgroundRepeat = backgroundRepeat
                  document.body.classList.remove("preload-bg-preview", "preload-bg-ready")
                  const _imgFirst = new Image()
                  const _applyFirst = () => {
                    bgLayer.style.backgroundSize = backgroundSize
                    bgLayer.style.backgroundRepeat = backgroundRepeat
                    triggerBgFadeOut()
                  }
                  if (typeof _imgFirst.decode === "function") {
                    _imgFirst.src = imageUrl
                    _imgFirst.decode().then(_applyFirst).catch(_applyFirst)
                  } else {
                    _imgFirst.onload = _applyFirst
                    _imgFirst.onerror = _applyFirst
                    _imgFirst.src = imageUrl
                  }
                }
              } else {
                // PRE-SET image synchronously so bg-layer is never blank
                // while waiting for the decode promise to resolve.
                bgLayer.style.backgroundImage = cssUrl(imageUrl)
                bgLayer.style.backgroundSize = backgroundSize
                bgLayer.style.backgroundRepeat = backgroundRepeat
                document.body.classList.remove("preload-bg-preview")

                const img = new Image()
                const applyStyles = () => {
                  bgLayer.style.backgroundSize = backgroundSize
                  bgLayer.style.backgroundRepeat = backgroundRepeat
                  triggerBgFadeOut()
                }
                if (typeof img.decode === "function") {
                  img.src = imageUrl
                  img.decode()
                    .then(applyStyles)
                    .catch(() => {
                      applyStyles()
                    })
                } else {
                  img.onload = applyStyles
                  img.onerror = () => {
                    triggerBgFadeOut()
                  }
                  img.src = imageUrl
                }
              }
            } else {
              triggerBgFadeOut()
            }
          }
        }
        document.body.style.backgroundSize = backgroundSize
        document.body.style.backgroundRepeat = backgroundRepeat
        document.documentElement.style.setProperty("--text-color", "#ffffff")
      }
      // Priority 5: Remote URL or Solid Color or Legacy Gradient
      else if (bg) {
        document.body.classList.add("bg-image-active")
        const isVideoUrl =
          bg.match(/\.(mp4|webm|mov|ogg)$/) || bg.includes("googlevideo")
        if (isVideoUrl) {
          if (bgVideoElement) {
            activeVideoSource = bg
            if (bgVideoElement.getAttribute("src") !== activeVideoSource) {
              bgVideoElement.src = activeVideoSource
            }
            bgVideoElement.style.display = "block"
            const onVideoReady = () => {
              bgVideoElement.removeEventListener("playing", onVideoReady)
              bgVideoElement.removeEventListener("canplay", onVideoReady)
              triggerBgFadeOut()
            }
            bgVideoElement.addEventListener("playing", onVideoReady, { once: true })
            bgVideoElement.addEventListener("canplay", onVideoReady, { once: true })
          }
          document.documentElement.style.setProperty("--text-color", "#ffffff")
        } else if (bg.match(/^https?:\/\//)) {
          if (bgLayer) {
            if (isFirstLoad) {
              bgLayer.style.backgroundImage = cssUrl(bg)
              bgLayer.style.backgroundSize = backgroundSize
              bgLayer.style.backgroundRepeat = backgroundRepeat
              triggerBgFadeOut()
            } else {
              const img = new Image()
              const applyStyles = () => {
                bgLayer.style.backgroundImage = cssUrl(bg)
                bgLayer.style.backgroundSize = backgroundSize
                bgLayer.style.backgroundRepeat = backgroundRepeat
                document.body.classList.remove("preload-bg-preview")
                triggerBgFadeOut()
              }
              if (typeof img.decode === "function") {
                img.src = bg
                img.decode()
                  .then(applyStyles)
                  .catch(() => {
                    applyStyles()
                  })
              } else {
                img.onload = applyStyles
                img.onerror = () => {
                  document.body.classList.remove("preload-bg-preview")
                  triggerBgFadeOut()
                }
                img.src = bg
              }
            }
          }
          document.documentElement.style.setProperty("--text-color", "#ffffff")
        } else {
          if (bgLayer) {
            bgLayer.style.backgroundImage = "none"
            bgLayer.style.background = bg
          }
          document.body.classList.add("bg-layer-active")
          document.documentElement.style.setProperty(
            "--text-color",
            getContrastYIQ(bg),
          )
          triggerBgFadeOut()
        }
      }
      // Fallback: Multi-Color Gradient or Default Gradient
      else {
        if (bgLayer) {
          bgLayer.style.backgroundImage = "none"
          const isMultiColorActive =
            settings.activeBgUid?.startsWith("multi-") ||
            (settings.multiColorActive === true &&
              !settings.activeBgUid?.startsWith("grad-"))

          if (
            isMultiColorActive &&
            Array.isArray(settings.multiColors) &&
            settings.multiColors.length >= 2
          ) {
            bgLayer.style.backgroundImage = ""
            bgLayer.style.background = buildMultiColorCss({
              colors: settings.multiColors,
              angle: settings.multiGradientAngle || 135,
              mode: settings.multiColorMode || "smooth",
              type: settings.multiColorType || "linear",
              repeating: settings.multiColorRepeating || false,
              position: settings.multiColorPosition || "center",
              radialShape: settings.multiColorRadialShape || "circle",
              dividerConfig: {
                enabled: settings.multiColorDividers !== false,
                color: settings.multiColorDividerColor || "#FFFFFF",
                width: settings.multiColorDividerWidth || 1.2,
              },
              lineAngleConfig: {
                enabled: Boolean(settings.multiColorFreeLineAngles),
                lineAngles: Array.isArray(settings.multiColorLineAngles)
                  ? settings.multiColorLineAngles
                  : [],
              },
            })
          } else {
            bgLayer.style.backgroundImage = ""
            bgLayer.style.background = buildGradientCss({
              start: settings.gradientStart,
              end: settings.gradientEnd,
              angle: settings.gradientAngle,
              type: settings.gradientType,
              repeating: settings.gradientRepeating,
              extraColorCount: settings.gradientExtraColorCount,
              customColors: settings.gradientCustomColors,
              position: settings.gradientPosition,
              radialShape: settings.gradientRadialShape,
            })
          }
        }
        document.body.classList.add("bg-layer-active")
        triggerBgFadeOut()
      }
    } else {
      // bgChanged is false: Background is identical, just update fast styles
      if (bgLayer) {
        bgLayer.style.backgroundSize = backgroundSize
        bgLayer.style.backgroundRepeat = backgroundRepeat
      }
      if (bgVideoElement && bgVideoElement.style.display === "block") {
        applyBackgroundVideoLayout(bgVideoElement, settings)
      }
    }

    if (bgVideoElement) configureBackgroundVideo(bgVideoElement, settings)

    ;[
      shouldUseGradientV2 && effectInstances.gradientV2Effect,
      shouldUseSilk && effectInstances.silkEffect,
      shouldUseLightPillar && effectInstances.lightPillarEffect,
      shouldUseLiquidEther && effectInstances.liquidEtherEffect,
      shouldUseSplashCursor && effectInstances.splashCursorEffect,
      shouldUseSvgWave && effectInstances.svgWaveEffect,
    ]
      .filter(Boolean)
      .forEach((effect) => applyEffectPerformanceBudget(effect, settings))

    // Cleanup: stop only background effects that have actually been created.
    const gradientV2Effect = getCreatedEffect(effectInstances, "gradientV2Effect")
    if (!shouldUseGradientV2 && gradientV2Effect) {
      if (gradientV2Effect.active) gradientV2Effect.stop()
      effectInstances.releaseEffect?.("gradientV2Effect")
    }
    const svgWaveEffect = getCreatedEffect(effectInstances, "svgWaveEffect")
    if (!shouldUseSvgWave && svgWaveEffect) {
      if (svgWaveEffect.active) svgWaveEffect.stop()
      effectInstances.releaseEffect?.("svgWaveEffect")
    }
    const silkEffect = getCreatedEffect(effectInstances, "silkEffect")
    if (!shouldUseSilk && silkEffect) {
      if (silkEffect.active) silkEffect.stop()
      effectInstances.releaseEffect?.("silkEffect")
    }
    const lightPillarEffect = getCreatedEffect(
      effectInstances,
      "lightPillarEffect",
    )
    if (!shouldUseLightPillar && lightPillarEffect) {
      if (lightPillarEffect.active) lightPillarEffect.stop()
      effectInstances.releaseEffect?.("lightPillarEffect")
    }
    const liquidEtherEffect = getCreatedEffect(
      effectInstances,
      "liquidEtherEffect",
    )
    if (!shouldUseLiquidEther && liquidEtherEffect) {
      if (liquidEtherEffect.active) liquidEtherEffect.stop()
      effectInstances.releaseEffect?.("liquidEtherEffect")
    }
    const splashCursorEffect = getCreatedEffect(
      effectInstances,
      "splashCursorEffect",
    )
    if (!shouldUseSplashCursor && splashCursorEffect) {
      if (splashCursorEffect.active) splashCursorEffect.stop()
      effectInstances.releaseEffect?.("splashCursorEffect")
    }

    // 2.1 Background Position
    document.documentElement.style.setProperty(
      "--bg-pos-x",
      `${settings.bgPositionX !== undefined ? settings.bgPositionX : 50}%`,
    )
    document.documentElement.style.setProperty(
      "--bg-pos-y",
      `${settings.bgPositionY !== undefined ? settings.bgPositionY : 50}%`,
    )
    const filters = [
      `blur(${settings.bgBlur ?? 0}px)`,
      `brightness(${settings.bgBrightness ?? 100}%)`,
      `contrast(${settings.bgContrast ?? 100}%)`,
      `saturate(${settings.bgSaturation ?? 100}%)`,
    ].join(" ")

    document.documentElement.style.setProperty("--bg-filter", filters)

    // Fallback for legacy support if needed
    document.documentElement.style.setProperty(
      "--bg-blur",
      `${settings.bgBlur ?? 0}px`,
    )
    document.documentElement.style.setProperty(
      "--bg-brightness",
      `${settings.bgBrightness ?? 100}%`,
    )
    document.documentElement.style.setProperty(
      "--bg-contrast",
      `${settings.bgContrast ?? 100}%`,
    )
    document.documentElement.style.setProperty(
      "--bg-saturation",
      `${settings.bgSaturation ?? 100}%`,
    )
    document.documentElement.style.setProperty(
      "--bg-fade-in",
      `${settings.bgFadeIn ?? 0.5}s`,
    )

    // 1. Identify primary and clock fonts
    const rawFont = settings.font || "'Outfit', sans-serif"
    const rawClockFont =
      settings.clockFont || settings.font || "'Outfit', sans-serif"

    const isRestrictedFont = (f) =>
      f.includes("Electroharmonix") ||
      f.includes("Anurati") ||
      f.includes("E1234")

    const primaryFont = isRestrictedFont(rawFont)
      ? "'Outfit', sans-serif"
      : rawFont
    const clockFont = rawClockFont
    const getFontName = (font) =>
      String(font || "")
        .replace(/['"]/g, "")
        .split(",")[0]
        .trim()
    const getClockFontProfile = (font) => {
      const name = getFontName(font).toLowerCase()
      if (name === "e1234") {
        return {
          clockScale: 0.68,
          dateScale: 0.86,
          letterSpacing: "0px",
          maxWidthFactor: 5.8,
        }
      }
      if (name === "electroharmonix" || name === "anurati") {
        return {
          clockScale: 0.78,
          dateScale: 0.9,
          letterSpacing: "0.02em",
          maxWidthFactor: 6.1,
        }
      }
      if (name === "saiba-45") {
        return {
          clockScale: 0.86,
          dateScale: 0.94,
          letterSpacing: "0.01em",
          maxWidthFactor: 6.4,
        }
      }
      return {
        clockScale: 1,
        dateScale: 1,
        letterSpacing: "2px",
        maxWidthFactor: 7,
      }
    }
    const getStyleClockScale = (style) => {
      const styleScales = {
        "cyber-pulse": 0.94,
        "neon-grid": 0.9,
        "holo-ring": 0.9,
        "lunar-orbit": 0.9,
        fliqlo: 0.92,
        sidebar: 0.94,
      }
      return styleScales[style] || 1
    }

    document.documentElement.style.setProperty("--font-primary", primaryFont)

    // Helper to set multiple font variables
    const applyToTargets = (targets, font) => {
      targets.forEach((t) => {
        document.documentElement.style.setProperty(`--font-${t}`, font)
      })
    }

    // 2. Default all clock-related font variables to primary font
    const allClockTargets = [
      "clock-date",
      "clock",
      "date",
      "weekday",
      "jp-time",
      "jp-date",
      "jp-weekday",
    ]
    applyToTargets(allClockTargets, primaryFont)

    // 3. Determine which elements should use the clock font
    const target = settings.clockFontTarget || "both"

    if (target === "weekday") {
      // Only weekday gets clockFont, others get primaryFont
      applyToTargets(["weekday", "jp-weekday"], clockFont)

      // Handle cool-style specifically
      if (settings.dateClockStyle === "cool") {
        document.documentElement.style.setProperty("--font-date", clockFont)
        document.documentElement.style.setProperty("--font-clock", primaryFont)
      }
    } else {
      // NORMAL MODE: Apply based on target selection
      if (target === "both") {
        applyToTargets(
          [
            "clock-date",
            "clock",
            "date",
            "weekday",
            "jp-time",
            "jp-date",
            "jp-weekday",
          ],
          clockFont,
        )
      } else if (target === "clock") {
        applyToTargets(["clock", "clock-date", "jp-time"], clockFont)
      } else if (target === "date") {
        applyToTargets(["date", "jp-date"], clockFont)
      }
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
    const fontProfile = getClockFontProfile(clockFont)
    const clockFontTarget = settings.clockFontTarget || "both"
    const clockUsesDisplayFont =
      clockFontTarget === "both" || clockFontTarget === "clock"
    const dateUsesDisplayFont =
      clockFontTarget === "both" ||
      clockFontTarget === "date" ||
      clockFontTarget === "weekday"

    if (priority === "date" || displayMode === "weekday") {
      // In date-priority mode OR Weekday-only mode, the date/weekday
      // should take the prominent size (clock size).
      computedClockSize = baseDateSize
      computedDateSize = baseClockSize
    }

    if (clockUsesDisplayFont) {
      computedClockSize *=
        fontProfile.clockScale * getStyleClockScale(settings.dateClockStyle)
    }
    if (dateUsesDisplayFont) {
      computedDateSize *= fontProfile.dateScale
    }

    computedClockSize = Math.min(10, Math.max(0.8, computedClockSize))
    computedDateSize = Math.min(10, Math.max(0.8, computedDateSize))

    document.documentElement.style.setProperty(
      "--clock-size",
      `${computedClockSize}rem`,
    )
    document.documentElement.style.setProperty(
      "--date-size",
      `${computedDateSize}rem`,
    )
    document.documentElement.style.setProperty(
      "--clock-letter-spacing",
      clockUsesDisplayFont ? fontProfile.letterSpacing : "2px",
    )
    document.documentElement.style.setProperty(
      "--clock-max-width-factor",
      String(fontProfile.maxWidthFactor),
    )

    document.documentElement.style.setProperty(
      "--search-bar-width",
      `${settings.searchBarWidth || 600}px`,
    )
    document.documentElement.style.setProperty(
      "--search-bar-blur",
      `${settings.searchBarBlur ?? 20}px`,
    )

    // Bookmark Custom Styling
    document.documentElement.style.setProperty(
      "--bookmark-font-size",
      `${settings.bookmarkFontSize ?? 10}px`,
    )
    document.documentElement.style.setProperty(
      "--bookmark-icon-size",
      `${settings.bookmarkIconSize ?? 42}px`,
    )
    document.documentElement.style.setProperty(
      "--bookmark-group-text-width",
      `${settings.bookmarkGroupTextWidth ?? 120}px`,
    )
    document.documentElement.style.setProperty(
      "--bookmark-gap",
      `${settings.bookmarkGap ?? 8}px`,
    )

    let groupBgHex = settings.bookmarkGroupBgColor || "transparent"
    if (groupBgHex !== "transparent") {
      let groupBgOpacity = settings.bookmarkGroupBgOpacity ?? 0
      let groupBgRgb = window.hexToRgb ? window.hexToRgb(groupBgHex) : null
      if (!groupBgRgb && typeof hexToRgb === "function")
        groupBgRgb = hexToRgb(groupBgHex)
      if (groupBgRgb && groupBgOpacity < 100) {
        document.documentElement.style.setProperty(
          "--bookmark-group-tab-bg",
          `rgba(${groupBgRgb.r}, ${groupBgRgb.g}, ${groupBgRgb.b}, ${groupBgOpacity / 100})`,
        )
      } else {
        document.documentElement.style.setProperty(
          "--bookmark-group-tab-bg",
          groupBgHex,
        )
      }
    } else {
      // default fallback if setting exists but is disabled (not common for this currently, but added for safety)
      document.documentElement.style.setProperty(
        "--bookmark-group-tab-bg",
        "rgba(255, 255, 255, 0.06)",
      )
    }

    if (settings.bookmarkGroupAutoTextContrast === true) {
      document.documentElement.style.setProperty(
        "--bookmark-group-text-color",
        getContrastYIQ(settings.bookmarkGroupBgColor || "#ffffff") === "black"
          ? "#111827"
          : "#ffffff",
      )
    } else if (settings.bookmarkGroupTextColor) {
      document.documentElement.style.setProperty(
        "--bookmark-group-text-color",
        settings.bookmarkGroupTextColor,
      )
    } else {
      document.documentElement.style.removeProperty(
        "--bookmark-group-text-color",
      )
    }

    document.documentElement.style.setProperty(
      "--bookmark-group-font-size",
      `${settings.bookmarkGroupFontSize ?? 14}px`,
    )
    document.documentElement.style.setProperty(
      "--bookmark-group-border-radius",
      `${settings.bookmarkGroupBorderRadius ?? 8}px`,
    )

    let bookmarkHex = settings.bookmarkBgColor || "#ffffff"
    let bookmarkOpacity = settings.bookmarkBgOpacity ?? 100
    let bookmarkRgb = hexToRgb(bookmarkHex)
    if (bookmarkRgb && bookmarkOpacity < 100) {
      document.documentElement.style.setProperty(
        "--bookmark-bg-color",
        `rgba(${bookmarkRgb.r}, ${bookmarkRgb.g}, ${bookmarkRgb.b}, ${bookmarkOpacity / 100})`,
      )
    } else {
      document.documentElement.style.setProperty(
        "--bookmark-bg-color",
        bookmarkHex,
      )
    }

    if (settings.bookmarkTextColor) {
      document.documentElement.style.setProperty(
        "--bookmark-text-color",
        settings.bookmarkTextColor,
      )
    } else {
      document.documentElement.style.removeProperty("--bookmark-text-color")
    }

    if (settings.bookmarkHideText) {
      document.body.classList.add("hide-bookmark-text")
    } else {
      document.body.classList.remove("hide-bookmark-text")
    }

    if (settings.bookmarkLongText) {
      document.body.classList.add("bookmark-long-text")
    } else {
      document.body.classList.remove("bookmark-long-text")
    }

    if (settings.bookmarkHideBg) {
      document.body.classList.add("hide-bookmark-bg")
    } else {
      document.body.classList.remove("hide-bookmark-bg")
    }

    if (settings.bookmarkHideScrollbar) {
      document.body.classList.add("bookmark-hide-scrollbar")
    } else {
      document.body.classList.remove("bookmark-hide-scrollbar")
    }

    if (settings.bookmarkMacosHover) {
      document.body.classList.add("bookmark-macos-hover")
      initMacosHoverForBookmarks(true)
    } else {
      document.body.classList.remove("bookmark-macos-hover")
      initMacosHoverForBookmarks(false)
    }

    let layout = settings.bookmarkLayout || "default"
    // Handle legacy boolean setting, or removed "sidebar-left" setting
    if (settings.bookmarkSidebarMode === true && layout === "default") {
      layout = "sidebar"
    }
    if (layout === "sidebar-left") layout = "sidebar"

    const layoutClasses = [
      "bookmark-sidebar-mode",
      "bookmark-premium-mode",
      "bookmark-taskbar-mode",
      "bookmark-taskbar-top-mode",
      "bookmark-taskbar-left-mode",
      "bookmark-taskbar-right-mode",
    ]
    const targetClass = layout === "default" ? null : `bookmark-${layout}-mode`

    // JITTER-PROOF: Only update classes if the layout has actually changed
    if (targetClass === null) {
      if (layoutClasses.some((c) => document.body.classList.contains(c))) {
        document.body.classList.remove(...layoutClasses)
      }
    } else if (!document.body.classList.contains(targetClass)) {
      document.body.classList.remove(...layoutClasses)
      document.body.classList.add(targetClass)
    }
    updateBookmarkGroupsToggleIcon()

    let bgStyle = settings.bookmarkLayoutBgStyle || "default"
    let bgColor = settings.bookmarkLayoutBgColor || ""
    let itemStyle = settings.bookmarkItemStyle || "default"

    document.body.classList.remove(
      "bookmark-layout-bg-hidden",
      "bookmark-layout-bg-white",
      "bookmark-layout-bg-m3-accent",
      "bookmark-layout-bg-colored",
      "bookmark-item-card-style",
    )

    if (bgStyle === "hidden") {
      document.body.classList.add("bookmark-layout-bg-hidden")
    } else if (bgStyle === "white") {
      document.body.classList.add("bookmark-layout-bg-white")
      document.documentElement.style.setProperty(
        "--bookmark-layout-bg-color",
        "rgba(255, 255, 255, 0.85)",
      )
      document.documentElement.style.setProperty(
        "--bookmark-layout-text-color",
        "#1e293b",
      )
    } else if (bgStyle === "m3-accent") {
      document.body.classList.add("bookmark-layout-bg-m3-accent")
    } else if (bgStyle === "colored") {
      document.body.classList.add("bookmark-layout-bg-colored")
      document.documentElement.style.setProperty(
        "--bookmark-layout-bg-color",
        bgColor,
      )
      const textCol = getContrastYIQ(bgColor) === "black" ? "#1e293b" : "#ffffff"
      document.documentElement.style.setProperty(
        "--bookmark-layout-text-color",
        textCol,
      )
    }

    if (itemStyle === "card") {
      document.body.classList.add("bookmark-item-card-style")
    }

    let shadowHex = settings.bookmarkShadowColor || "#000000"
    let shadowOpacity = settings.bookmarkShadowOpacity ?? 24
    let shadowBlur = settings.bookmarkShadowBlur ?? 8
    let shadowRgb = hexToRgb(shadowHex) || { r: 0, g: 0, b: 0 }
    const shadowRgba = `rgba(${shadowRgb.r}, ${shadowRgb.g}, ${shadowRgb.b}, ${shadowOpacity / 100})`
    document.documentElement.style.setProperty(
      "--bookmark-box-shadow",
      `${shadowRgba} 0px 3px ${shadowBlur}px`,
    )
    document.documentElement.style.setProperty(
      "--bookmark-icon-drop-shadow",
      `0px 2px ${Math.max(2, Math.round(shadowBlur / 2))}px ${shadowRgba}`,
    )

    const dateClockStyle = settings.dateClockStyle || "default"
    document.body.classList.remove(
      "date-clock-style-default",
      "date-clock-style-glow",
      "date-clock-style-minimal",
      "date-clock-style-glass",
      "date-clock-style-round",
      "date-clock-style-square",
      "date-clock-style-analog",
      "date-clock-style-cool",
      "date-clock-style-jp-style",
      "date-clock-style-sidestyle",
      "date-clock-style-sidebar",
      "date-clock-style-weekday",
      "date-clock-style-weekday-style",
      "date-clock-style-fliqlo",
      "date-clock-style-cyber-pulse",
      "date-clock-style-neon-grid",
      "date-clock-style-terminal",
      "date-clock-style-c4-bomb",
      "date-clock-style-holo-ring",
      "date-clock-style-media-orb",
      "date-clock-style-prism-stack",
      "date-clock-style-metro-panel",
      "date-clock-style-aurora-ribbon",
      "date-clock-style-lunar-orbit",
      "date-clock-style-cartoon",
      "date-clock-style-custom-angle",
    )
    document.body.classList.add(`date-clock-style-${dateClockStyle}`)

    // Apply sidestyle alignment body class
    document.body.classList.remove(
      "sidestyle-align-left",
      "sidestyle-align-center",
      "sidestyle-align-right",
      "sidestyle-no-border",
    )
    if (dateClockStyle === "sidestyle") {
      const align = settings.sidestyleAlign || "left"
      document.body.classList.add(`sidestyle-align-${align}`)
      if (settings.sidestyleNoBorder) {
        document.body.classList.add("sidestyle-no-border")
      }
    }

    document.body.classList.toggle("flip-layout", settings.flipLayout === true)
    document.body.classList.toggle("quick-access-horizontal", settings.quickAccessHorizontal === true)

    // Fliqlo Theme
    document.body.classList.remove("fliqlo-theme-dark", "fliqlo-theme-light")
    document.body.classList.add(
      `fliqlo-theme-${settings.fliqloTheme || "dark"}`,
    )
    document.body.classList.toggle(
      "fliqlo-transparent",
      settings.fliqloTransparent === true,
    )

    // Context Menu Style
    document.body.classList.remove(
      "context-menu-dark",
      "context-menu-light",
      "context-menu-none",
      "context-menu-macos",
      "context-menu-m3",
    )
    const contextMenuStyle = settings.contextMenuStyle || "dark"
    document.body.classList.add(`context-menu-${contextMenuStyle}`)

    document.body.classList.toggle(
      "analog-bg-blur-enabled",
      dateClockStyle === "analog" && settings.analogBlurBackground === true,
    )
    const clockStyleBackgroundStyles = [
      "minimal",
      "glass",
      "round",
      "square",
      "analog",
      "cartoon",
      "fliqlo",
      "cyber-pulse",
      "neon-grid",
      "terminal",
      "c4-bomb",
      "holo-ring",
      "code",
      "custom-angle",
      "media-orb",
      "prism-stack",
      "metro-panel",
      "minimalist-word",
      "aurora-ribbon",
      "lunar-orbit",
    ]
    const supportsClockStyleBackground =
      clockStyleBackgroundStyles.includes(dateClockStyle)
    const requestedClockStyleBackground =
      settings.clockStyleBackground || "default"
    const effectiveClockStyleBackground = supportsClockStyleBackground
      ? requestedClockStyleBackground
      : "default"
    const isClockStyleTransparentBackground =
      supportsClockStyleBackground &&
      (effectiveClockStyleBackground === "transparent" ||
        settings.clockStyleTransparentBackground === true)
    document.body.classList.toggle(
      "clock-style-transparent-bg",
      isClockStyleTransparentBackground,
    )
    document.body.classList.toggle(
      "clock-style-bg-accent",
      !isClockStyleTransparentBackground &&
        effectiveClockStyleBackground === "accent",
    )
    const customClockBgColor = /^#[0-9a-f]{6}$/i.test(
      settings.clockStyleCustomBgColor || "",
    )
      ? settings.clockStyleCustomBgColor
      : "#1f2937"
    document.documentElement.style.setProperty(
      "--clock-style-custom-bg-color",
      customClockBgColor,
    )
    document.body.classList.toggle(
      "clock-style-bg-custom",
      !isClockStyleTransparentBackground &&
        effectiveClockStyleBackground === "custom",
    )
    document.body.classList.toggle(
      "clock-style-bg-light",
      !isClockStyleTransparentBackground &&
        effectiveClockStyleBackground === "light",
    )
    document.body.classList.toggle(
      "clock-style-bg-dark",
      !isClockStyleTransparentBackground && effectiveClockStyleBackground === "dark",
    )
    document.body.classList.toggle(
      "clock-style-bg-animated",
      !isClockStyleTransparentBackground &&
      dateClockStyle === "prism-stack" &&
        effectiveClockStyleBackground === "animated",
    )
    document.body.classList.toggle(
      "cartoon-clock-animation-off",
      dateClockStyle === "cartoon" && settings.cartoonClockAnimation === false,
    )
    document.body.classList.toggle(
      "media-orb-overflow-border",
      dateClockStyle === "media-orb" && settings.mediaOrbOverflowBorder === true,
    )

    // 3.1 Clock & Date Visibility & Contrast
    const clockEl = document.getElementById("clock")
    const dateEl = document.getElementById("date")
    const clockFadeWrap = document.getElementById("clock-fade-wrap")
    const dateFadeWrap = document.getElementById("date-fade-wrap")

    if (clockFadeWrap) {
      const showClock = displayMode !== "hide" && displayMode !== "weekday"
      clockFadeWrap.classList.toggle("is-hidden", !showClock)
    }

    if (dateFadeWrap) {
      const showDate = displayMode !== "hide"
      dateFadeWrap.classList.toggle("is-hidden", !showDate)
      if (dateEl)
        dateEl.classList.toggle("only-weekday-mode", displayMode === "weekday")
    }

    let finalClockColor = settings.clockColor
    let finalDateColor = settings.dateColor

    if (!finalClockColor || !finalDateColor) {
      let fallbackColor = "#ffffff"

      // If Fliqlo is active and theme is light, fallback to black
      const isFliqloLight =
        settings.dateClockStyle === "fliqlo" && settings.fliqloTheme === "light"

      if (isFliqloLight) {
        fallbackColor = "#000000"
      } else if (settings.clockAutoContrast === false) {
        fallbackColor = "#ffffff"
      } else if (
        isPredefinedLocalBg ||
        isUserUploadedBg ||
        (rawBg && String(rawBg).match(/^https?:\/\//)) ||
        shouldUseGradientV2 ||
        shouldUseSilk ||
        shouldUseLightPillar ||
        shouldUseLiquidEther ||
        (shouldUseSplashCursor && settings.splashCursorDarkBg)
      ) {
        fallbackColor = "#ffffff"
      } else if (rawBg) {
        fallbackColor = getContrastYIQ(rawBg)
      } else {
        fallbackColor = getContrastYIQ(settings.gradientStart)
      }

      if (!finalClockColor) finalClockColor = fallbackColor
      if (!finalDateColor) finalDateColor = fallbackColor
    }

    // Ensure hex format (convert "black"/"white" names if they come from getContrastYIQ)
    if (finalClockColor === "black") finalClockColor = "#000000"
    if (finalClockColor === "white") finalClockColor = "#ffffff"
    if (finalDateColor === "black") finalDateColor = "#000000"
    if (finalDateColor === "white") finalDateColor = "#ffffff"

    const clockUseAccent = settings.clockUseAccentColor === true
    const clockAccentTarget = settings.clockAccentTarget || "style"
    const accentClockColor = settings.accentColor || "#00ff73"
    if (clockUseAccent) {
      if (clockAccentTarget === "both" || clockAccentTarget === "time") {
        finalClockColor = accentClockColor
      }
      if (clockAccentTarget === "both" || clockAccentTarget === "date") {
        finalDateColor = accentClockColor
      }
    }

    document.documentElement.style.setProperty("--clock-color", finalClockColor)
    document.documentElement.style.setProperty("--date-color", finalDateColor)

    const clockRgb = hexToRgb(finalClockColor)
    if (clockRgb) {
      document.documentElement.style.setProperty(
        "--clock-color-rgb",
        `${clockRgb.r}, ${clockRgb.g}, ${clockRgb.b}`,
      )
    }

    const clockWrap = document.getElementById("clock-date-wrap")
    if (clockWrap) {
      const shadowTarget = settings.clockShadowTarget || "none"
      const shadowStrength = Math.min(
        100,
        Math.max(0, Number(settings.clockShadowStrength) || 0),
      )
      const shadowColor = settings.clockShadowColor || "#000000"
      const shadowRgb = hexToRgb(shadowColor)
      const shadowAlpha = Math.min(0.85, shadowStrength / 100)
      const shadowBlur = Math.round(4 + shadowStrength * 0.28)
      const boxBlur = Math.round(10 + shadowStrength * 0.48)
      const boxSpread = Math.round(shadowStrength * 0.08)

      clockWrap.classList.remove(
        "clock-use-accent",
        "clock-accent-target-style",
        "clock-accent-target-both",
        "clock-accent-target-time",
        "clock-accent-target-date",
        "clock-accent-target-weekday",
        "clock-shadow-target-none",
        "clock-shadow-target-all",
        "clock-shadow-target-time",
        "clock-shadow-target-date",
        "clock-shadow-target-weekday",
        "clock-shadow-target-box",
      )
      clockWrap.classList.toggle("clock-use-accent", clockUseAccent)
      clockWrap.classList.add(`clock-accent-target-${clockAccentTarget}`)
      clockWrap.classList.add(`clock-shadow-target-${shadowTarget}`)
      const localAccentColor = clockUseAccent
        ? accentClockColor
        : finalClockColor
      const localAccentRgb = hexToRgb(localAccentColor)
      clockWrap.style.setProperty("--accent-color", localAccentColor)
      clockWrap.style.setProperty(
        "--accent-color-rgb",
        `${localAccentRgb.r}, ${localAccentRgb.g}, ${localAccentRgb.b}`,
      )
      clockWrap.style.setProperty(
        "--clock-effect-shadow",
        shadowStrength > 0
          ? `0 4px ${shadowBlur}px rgba(${shadowRgb.r}, ${shadowRgb.g}, ${shadowRgb.b}, ${shadowAlpha})`
          : "none",
      )
      clockWrap.style.setProperty(
        "--clock-effect-box-shadow",
        shadowStrength > 0
          ? `0 14px ${boxBlur}px ${boxSpread}px rgba(${shadowRgb.r}, ${shadowRgb.g}, ${shadowRgb.b}, ${Math.min(0.55, shadowAlpha)})`
          : "none",
      )
    }

    const dateRgb = hexToRgb(finalDateColor)
    if (dateRgb) {
      document.documentElement.style.setProperty(
        "--date-color-rgb",
        `${dateRgb.r}, ${dateRgb.g}, ${dateRgb.b}`,
      )
    }

    // Theme Surface Colors
    if (settings.sidebarBg) {
      document.documentElement.style.setProperty(
        "--sidebar-bg",
        settings.sidebarBg,
      )
    }
    if (settings.panelBg) {
      document.documentElement.style.setProperty("--panel-bg", settings.panelBg)
    }
    if (settings.glassBg) {
      document.documentElement.style.setProperty("--glass-bg", settings.glassBg)
    }
    if (settings.glassBorder) {
      document.documentElement.style.setProperty(
        "--glass-border",
        settings.glassBorder,
      )
    }
    if (settings.glassEdge) {
      document.documentElement.style.setProperty(
        "--glass-edge",
        settings.glassEdge,
      )
    }

    if (settings.accentColor) {
      const accentScheme = applyAccentTokens(settings)

      // Sidebar Dynamic Color & Monochrome Logic
      const forceLightSidebar = settings.showQuickAccessBg === true

      if (forceLightSidebar) {
        // Force sidebar color but keep accent color independent
        document.documentElement.style.setProperty(
          "--sidebar-bg",
          "rgba(240, 240, 245, 0.98)",
        )
        document.body.classList.add("sidebar-light")
      } else {
        applyAccentTokens(settings)

        // Default sidebar color from theme/settings
        if (settings.sidebarBg) {
          document.documentElement.style.setProperty(
            "--sidebar-bg",
            settings.sidebarBg,
          )
        }
        document.body.classList.remove("sidebar-light")
      }

      // Ensure Unsplash random button icon has contrast
      const unsplashRandomBtn = document.getElementById("unsplash-random-btn")
      if (unsplashRandomBtn) {
        const icon = unsplashRandomBtn.querySelector("i")
        if (icon) {
          icon.style.color = accentScheme.onPrimary
        }
      }
    }

    setClockStyleAccentVars(settings, dateClockStyle)

    const strokeWidth = settings.clockDateStrokeWidth || 0
    const strokeColor = settings.clockDateStrokeColor || "#000000"
    const strokeTarget = settings.clockDateStrokeTarget || "both"

    // Reset both to clear existing stroke
    document.documentElement.style.setProperty(
      "--clock-text-stroke",
      "0px transparent",
    )
    document.documentElement.style.setProperty(
      "--date-text-stroke",
      "0px transparent",
    )

    if (strokeWidth > 0) {
      const strokeRule = `${strokeWidth}px ${strokeColor}`
      if (strokeTarget === "both" || strokeTarget === "clock") {
        document.documentElement.style.setProperty(
          "--clock-text-stroke",
          strokeRule,
        )
      }
      if (strokeTarget === "both" || strokeTarget === "date") {
        document.documentElement.style.setProperty(
          "--date-text-stroke",
          strokeRule,
        )
      }
    }

    // 4. Effects Management
    const effectToStart = settings.effect
    const mappedKey = EFFECT_KEY_MAP[effectToStart] || effectToStart
    const selectedEffect =
      effectToStart && effectToStart !== "none" ? effectInstances[mappedKey] : null
    const effectChanged = effectToStart !== _prevEffect

    // Update Hyperspace color if active
    if (
      effectToStart === "hyperspace" &&
      selectedEffect &&
      selectedEffect.updateColor
    ) {
      selectedEffect.updateColor(settings.accentColor)
    }

    const effectCanvas = document.getElementById("effect-canvas")
    const pixelSnowCanvas = document.getElementById("pixel-snow-hq-canvas")
    const gradientCanvas = document.getElementById("gradient-v2-canvas")
    const softAuroraCanvas = document.getElementById("soft-aurora-canvas")

    // Show/hide dedicated canvases
    if (pixelSnowCanvas) {
      pixelSnowCanvas.style.display =
        effectToStart === "pixelSnowHQ" ? "block" : "none"
    }
    if (gradientCanvas) {
      gradientCanvas.style.display = shouldUseGradientV2 ? "block" : "none"
    }
    if (softAuroraCanvas) {
      softAuroraCanvas.style.display =
        effectToStart === "softAurora" ? "block" : "none"
    }
    if (effectCanvas) {
      const isDedicated = ["pixelSnowHQ", "gradientV2", "softAurora"].includes(
        effectToStart,
      )
      const shouldShowMain =
        effectToStart && effectToStart !== "none" && !isDedicated
      effectCanvas.style.display = shouldShowMain ? "block" : "none"
    }

    if (effectToStart === "pixelWeather" && selectedEffect) {
      if (selectedEffect.setMode) {
        selectedEffect.setMode(settings.pixelWeatherStyle || "snow")
      }
      if (selectedEffect.setOptions) {
        selectedEffect.setOptions(
          withPerformanceBudget(settings, "pixelWeather", {
            density: settings.pixelWeatherDensity || 1.0,
            resolution: settings.pixelWeatherResolution || 1,
            speed: settings.pixelWeatherSpeed || 1.0,
            size: settings.pixelWeatherSize || 1.0,
          }),
        )
      }
    }

    if (effectToStart === "pixelSnowHQ" && selectedEffect) {
      if (selectedEffect.setOptions) {
        selectedEffect.setOptions({
          color: settings.pixelSnowHQColor ?? "#ffffff",
          flakeSize: settings.pixelSnowHQFlakeSize ?? 0.01,
          minFlakeSize: settings.pixelSnowHQMinFlakeSize ?? 1.25,
          speed: settings.pixelSnowHQSpeed ?? 1.25,
          depthFade: settings.pixelSnowHQDepthFade ?? 8,
          brightness: settings.pixelSnowHQBrightness ?? 1.0,
          gamma: settings.pixelSnowHQGamma ?? 0.4545,
          variant: settings.pixelSnowHQVariant ?? "square",
          direction: settings.pixelSnowHQDirection ?? 125,
          ...getEffectPerformanceOptions(settings, "pixelSnowHQ"),
        })
      }
    }

    if (effectToStart === "rainHD" && selectedEffect?.setOptions) {
      selectedEffect.setOptions(getEffectPerformanceOptions(settings, "rainHD"))
    }

    if (effectToStart === "skyLanterns" && selectedEffect) {
      if (selectedEffect.setOptions) {
        selectedEffect.setOptions({
          type: settings.skyLanternsType || "lantern",
        })
      }
    }

    if (
      effectToStart === "gridScan" &&
      selectedEffect &&
      selectedEffect.setOptions
    ) {
      selectedEffect.setOptions(
        withPerformanceBudget(settings, "gridScan", {
          speed: settings.pixelWeatherSpeed || 1.0,
          spacing: settings.gridSpacing || 50,
          perspective: settings.gridPerspective !== false,
        }),
      )
    }

    if (
      effectToStart === "auroraWave" &&
      selectedEffect &&
      selectedEffect.setOptions
    ) {
      selectedEffect.setOptions(
        withPerformanceBudget(settings, "auroraWave", {
          color: settings.auroraWaveColor || "#00bcd4",
          brightness: settings.auroraWaveBrightness || 0.65,
          speed: settings.auroraWaveSpeed || 1.0,
          waveAmplitude: settings.auroraWaveAmplitude || 70,
          transparent: settings.auroraWaveTransparent !== false,
          backgroundColor: settings.auroraWaveBgColor || "#000000",
          bgOpacity: settings.auroraWaveBgOpacity ?? 0.15,
        }),
      )
    }

    if (
      effectToStart === "hacker" &&
      selectedEffect &&
      selectedEffect.updateColor
    ) {
      selectedEffect.updateColor(settings.hackerColor || "#00FF00")
    }

    if (
      effectToStart === "northernLights" &&
      selectedEffect &&
      selectedEffect.setOptions
    ) {
      selectedEffect.setOptions({
        color: settings.northernLightsColor || "#00ff88",
        style: settings.northernLightsStyle || "hd",
        brightness: settings.northernLightsBrightness ?? 0.8,
      })
    }

    if (effectToStart === "oceanWave" && selectedEffect) {
      selectedEffect.updateColor?.(settings.oceanWaveColor || "#0077b6")
      selectedEffect.setPosition?.(settings.oceanWavePosition || "bottom")
    }

    if (
      effectToStart === "bubbles" &&
      selectedEffect &&
      selectedEffect.updateColor
    ) {
      selectedEffect.updateColor(settings.bubbleColor || "#60c8ff")
    }

    if (
      effectToStart === "softAurora" &&
      selectedEffect &&
      selectedEffect.setOptions
    ) {
      selectedEffect.setOptions(
        withPerformanceBudget(settings, "softAurora", {
          speed: settings.softAuroraSpeed,
          scale: settings.softAuroraScale,
          brightness: settings.softAuroraBrightness,
          color1: settings.softAuroraColor1,
          color2: settings.softAuroraColor2,
          noiseFrequency: settings.softAuroraNoiseFreq,
          noiseAmplitude: settings.softAuroraNoiseAmp,
          bandHeight: settings.softAuroraBandHeight,
          bandSpread: settings.softAuroraBandSpread,
          octaveDecay: settings.softAuroraOctaveDecay,
          layerOffset: settings.softAuroraLayerOffset,
          colorSpeed: settings.softAuroraColorSpeed,
          enableMouseInteraction: settings.softAuroraEnableMouse,
          mouseInfluence: settings.softAuroraMouseInfluence,
          transparent: settings.softAuroraTransparent,
          backgroundColor: settings.softAuroraBackgroundColor,
        }),
      )
    }

    if (
      effectToStart === "pixelBlast" &&
      selectedEffect &&
      selectedEffect.setOptions
    ) {
      selectedEffect.setOptions(
        withPerformanceBudget(settings, "pixelBlast", {
          pixelSize: settings.pixelBlastSize || 15,
          variant: settings.pixelBlastVariant || "square",
          color: settings.pixelBlastColor || "#B497CF",
          transparent: settings.pixelBlastTransparent !== false,
          backgroundColor: settings.pixelBlastBgColor || "#0a0a0a",
          liquid: settings.pixelBlastLiquid !== false,
          liquidStrength: settings.pixelBlastLiquidStrength ?? 1.0,
          cursorRadius: settings.pixelBlastCursorRadius || 150,
          enableRipples: settings.pixelBlastRipples !== false,
        }),
      )
    }
    if (
      effectToStart === "flashlight" &&
      selectedEffect &&
      selectedEffect.setOptions
    ) {
      selectedEffect.setOptions({
        color: settings.flashlightColor || "#000000",
        size: settings.flashlightSize || 150,
        opacity: settings.flashlightOpacity ?? 0.9,
      })
    }

    applyEffectPerformanceBudget(selectedEffect, settings)

    if (effectChanged) {
      // Stop previous effects only when effect selection actually changes.
      Object.values(effectInstances).forEach((effect) => {
        // Protect background effects that are currently active
        if (shouldUseGradientV2 && effect === effectInstances.gradientV2Effect)
          return
        if (shouldUseSilk && effect === effectInstances.silkEffect) return
        if (
          shouldUseLightPillar &&
          effect === effectInstances.lightPillarEffect
        )
          return
        if (shouldUseSvgWave && effect === effectInstances.svgWaveEffect) return
        if (
          shouldUseLiquidEther &&
          effect === effectInstances.liquidEtherEffect
        )
          return
        if (
          shouldUseSplashCursor &&
          effect === effectInstances.splashCursorEffect
        )
          return

        if (effect && typeof effect.stop === "function") {
          effect.stop()
        }
      })

      const previousEffectKey = EFFECT_KEY_MAP[_prevEffect] || _prevEffect
      if (
        previousEffectKey &&
        previousEffectKey !== "none" &&
        previousEffectKey !== mappedKey
      ) {
        effectInstances.releaseEffect?.(previousEffectKey)
      }

      if (effectCanvas) {
        const ctx = effectCanvas.getContext("2d")
        ctx.clearRect(0, 0, effectCanvas.width, effectCanvas.height)
        effectCanvas.style.display = "none"
      }

      const pixelSnowCanvas = document.getElementById("pixel-snow-hq-canvas")
      if (pixelSnowCanvas) {
        pixelSnowCanvas.style.display =
          effectToStart === "pixelSnowHQ" ? "block" : "none"
      }

    }

    const shouldStartSelectedEffect =
      effectToStart &&
      effectToStart !== "none" &&
      selectedEffect &&
      (effectChanged ||
        (selectedEffect.active !== true && selectedEffect.isActive !== true))

    // 5. Start selected effect immediately (no artificial delay/flicker).
    // Also start after a lazy factory finishes loading: in that case the
    // saved effect value has not changed, but the instance is newly created.
    if (shouldStartSelectedEffect) {
      // Apply saved leaf type for falling leaves settled effect
      if (
        effectToStart === "fallingLeavesSettled" &&
        selectedEffect.setLeafType
      ) {
        selectedEffect.setLeafType(settings.fallingLeavesSkin || "maple")
      }

      if (effectToStart === "meteor" && selectedEffect) {
        if (selectedEffect.setAngle)
          selectedEffect.setAngle(settings.meteorAngle ?? 45)
        if (selectedEffect.setFullColor)
          selectedEffect.setFullColor(settings.meteorFullColor === true)

        const userColors = (settings.userColors || []).map((c) =>
          typeof c === "string" ? c : c.val,
        )
        const palette =
          settings.meteorFullColor === true
            ? [settings.meteorColor, ...userColors]
            : settings.meteorColor
        selectedEffect.setColor(palette)
      }
      selectedEffect.start?.()
    }
    _prevEffect = effectToStart

    // 6. Gradients
    document.documentElement.style.setProperty(
      "--bg-gradient-start",
      settings.gradientStart || "#0a1f11",
    )
    document.documentElement.style.setProperty(
      "--bg-gradient-end",
      settings.gradientEnd || "#1d472c",
    )
    document.documentElement.style.setProperty(
      "--bg-gradient-angle",
      (settings.gradientAngle ?? 135) + "deg",
    )

    // Update Main Background Credit (Bottom Left)
    updateMainBgCredit()

    // Call updateSettingsInputs to sync all UI
    if (typeof effectInstances.updateSettingsInputs === "function") {
      // Signal resizing to update layout-dependent widgets like bookmark overflow
      window.dispatchEvent(new Event("resize"))
      effectInstances.updateSettingsInputs()
    }
  }
}

function updateMainBgCredit() {
  const settings = getSettings()
  const creditEl = document.getElementById("main-bg-credit")
  const settingsCreditEl = document.getElementById("unsplash-credit")

  const bg = settings.background
  // Changed from unsplashPhotoInfo to unsplashLastCredit
  let info = settings.unsplashLastCredit

  // If not Unsplash or missing info, try to find metadata in userBackgrounds
  if (!info || !info.authorName) {
    const localEntry = (settings.userBackgrounds || []).find(
      (item) => (typeof item === "object" && item.id === bg) || item === bg,
    )
    if (localEntry && typeof localEntry === "object") {
      info = localEntry
    }
  }

  const isUnsplash =
    info &&
    info.authorName &&
    ((bg &&
      (bg.includes("unsplash") ||
        bg.includes("images.unsplash.com") ||
        bg.includes("api.unsplash.com"))) ||
      (info.photoUrl && info.photoUrl.includes("unsplash.com")) ||
      (info.authorUrl && info.authorUrl.includes("unsplash.com")))
  const isLocalMedia = isIdbMedia(bg)

  if (info && info.authorName) {
    const authorLink = info.authorUrl
      ? `<a class="unsplash-credit-chip unsplash-credit-author" href="${info.authorUrl}?utm_source=startpage&utm_medium=referral" target="_blank"><i class="fa-solid fa-user"></i><span>${info.authorName}</span></a>`
      : `<span class="unsplash-credit-chip unsplash-credit-author"><i class="fa-solid fa-user"></i><span>${info.authorName}</span></span>`
    const photoLink = info.photoUrl
      ? `<a class="unsplash-credit-chip unsplash-credit-source" href="${info.photoUrl}?utm_source=startpage&utm_medium=referral" target="_blank"><i class="${isUnsplash ? "fa-brands fa-unsplash" : "fa-solid fa-link"}"></i><span>${isUnsplash ? "Unsplash photo" : "Photo source"}</span></a>`
      : isUnsplash
        ? `<span class="unsplash-credit-chip unsplash-credit-source"><i class="fa-brands fa-unsplash"></i><span>Unsplash photo</span></span>`
        : `<span class="unsplash-credit-chip unsplash-credit-source"><i class="fa-solid fa-image"></i><span>Local source</span></span>`

    const iconClass = isUnsplash
      ? "fa-brands fa-unsplash credit-logo-unsplash"
      : isIdbVideo(bg)
        ? "fa-solid fa-video credit-logo-local"
        : "fa-solid fa-image credit-logo-local"

    const html = `
      <i class="${iconClass}"></i>
      <span class="unsplash-credit-main">${photoLink}${authorLink}</span>
    `

    if (creditEl) {
      creditEl.innerHTML = html
      creditEl.style.display = "flex"
    }

    if (settingsCreditEl) {
      settingsCreditEl.innerHTML = `<span class="unsplash-credit-main">${photoLink}${authorLink}</span>`
      settingsCreditEl.style.display = "flex"
    }
    return
  }
  // Hide settings credit if no info
  if (settingsCreditEl) {
    settingsCreditEl.style.display = "none"
    settingsCreditEl.innerHTML = ""
  }

  // Fallback for local media without metadata
  if (isIdbVideo(bg)) {
    if (creditEl) {
      creditEl.innerHTML = `
          <i class="fa-solid fa-video credit-logo-local"></i>
          <span data-i18n="credit_local_video">Local Video</span>
        `
      creditEl.style.display = "flex"
    }
    return
  }

  if (isIdbImage(bg)) {
    if (creditEl) {
      creditEl.innerHTML = `
          <i class="fa-solid fa-image credit-logo-local"></i>
          <span data-i18n="credit_local_image">Local Image</span>
        `
      creditEl.style.display = "flex"
    }
    return
  }

  // Fallback: Hide if no credit needed (gradient, wave, etc.)
  if (creditEl) creditEl.style.display = "none"
}

function createUpdateSettingsInputs(effectInstances) {
  return function updateSettingsInputs() {
    const settings = getSettings()
    const DOM = effectInstances.DOM

    // Background Inputs
    const isPredefinedLocalBg = effectInstances.localBackgrounds.some(
      (b) => b.id === settings.background,
    )
    const isUserUploadedBg =
      settings.background &&
      (settings.background.startsWith("data:image") ||
        settings.background.startsWith("data:video") ||
        settings.background.startsWith("blob:") ||
        isIdbImage(settings.background) ||
        isIdbVideo(settings.background))

    // Calculate current applied colors for pickers
    let currentClockColor = settings.clockColor
    let currentDateColor = settings.dateColor

    if (!currentClockColor || !currentDateColor) {
      let fallbackColor = "#ffffff"
      const isFliqloLight =
        settings.dateClockStyle === "fliqlo" && settings.fliqloTheme === "light"
      const bg = settings.background

      if (isFliqloLight) {
        fallbackColor = "#000000"
      } else if (
        isPredefinedLocalBg ||
        isUserUploadedBg ||
        (bg && String(bg).match(/^https?:\/\//))
      ) {
        fallbackColor = "#ffffff"
      } else if (bg) {
        const contrast = getContrastYIQ(bg)
        fallbackColor = contrast === "black" ? "#000000" : "#ffffff"
      } else {
        const contrast = getContrastYIQ(settings.gradientStart)
        fallbackColor = contrast === "black" ? "#000000" : "#ffffff"
      }

      if (!currentClockColor) currentClockColor = fallbackColor
      if (!currentDateColor) currentDateColor = fallbackColor
    }

    // Ensure hex format for picker
    if (currentClockColor === "black") currentClockColor = "#000000"
    if (currentClockColor === "white") currentClockColor = "#ffffff"
    if (currentDateColor === "black") currentDateColor = "#000000"
    if (currentDateColor === "white") currentDateColor = "#ffffff"

    const rawDateSize = Number(settings.dateSize)
    const baseDateSize = Number.isFinite(rawDateSize)
      ? Math.min(10, Math.max(0.8, rawDateSize))
      : 1.5
    DOM.bgInput.value =
      isPredefinedLocalBg || isUserUploadedBg || !settings.background
        ? ""
        : settings.background

    // General Inputs
    effectInstances.renderFontGrid()
    if (DOM.clockDateLanguageSelect)
      DOM.clockDateLanguageSelect.value = settings.clockDateLanguage || "auto"
    if (DOM.shortWeekdayCheckbox)
      DOM.shortWeekdayCheckbox.checked = settings.shortWeekday === true
    if (DOM.timezoneSelect)
      DOM.timezoneSelect.value = settings.timezone || "local"
    const contextMenuInputValue = settings.contextMenuStyle || "dark"
    if (DOM.contextMenuStyleSelect)
      DOM.contextMenuStyleSelect.value = contextMenuInputValue
    if (DOM.lcpContextMenuStyle)
      DOM.lcpContextMenuStyle.value = contextMenuInputValue
    if (DOM.hideSecondsCheckbox)
      DOM.hideSecondsCheckbox.checked = settings.hideSeconds === true
    if (DOM.cursorTrailClickCheckbox)
      DOM.cursorTrailClickCheckbox.checked =
        settings.cursorTrailClickExplosion !== false
    if (DOM.cursorTrailRandomCheckbox)
      DOM.cursorTrailRandomCheckbox.checked =
        settings.cursorTrailRandomColor === true
    if (DOM.clockDatePrioritySelect) {
      DOM.clockDatePrioritySelect.value =
        settings.clockDatePriority === "date" ? "date" : "none"
    }
    if (DOM.clockDateStyleSelect)
      DOM.clockDateStyleSelect.value = settings.dateClockStyle || "default"

    // Sync Clock Style Cards
    const clockCards = document.querySelectorAll(
      ".clock-style-card:not(.date-format-card):not(.time-format-card):not(.font-target-card)",
    )
    const currentStyle = settings.dateClockStyle || "default"
    clockCards.forEach((card) => {
      card.classList.toggle("active", card.dataset.value === currentStyle)
    })
    
    // Sync Date Format Cards
    const dateFormatCards = document.querySelectorAll(".date-format-card")
    const currentDateFormat = settings.dateFormat || "full"
    dateFormatCards.forEach((card) => {
      card.classList.toggle("active", card.dataset.value === currentDateFormat)
    })
    
    // Sync Time Format Cards
    const timeFormatCards = document.querySelectorAll(".time-format-card")
    const currentTimeFormat = settings.timeFormat || "24h"
    timeFormatCards.forEach((card) => {
      card.classList.toggle("active", card.dataset.value === currentTimeFormat)
    })

    if (DOM.jpStyleLanguageSelect)
      DOM.jpStyleLanguageSelect.value = settings.jpStyleLanguage || "auto"
    if (DOM.hueTextModeSelect)
      DOM.hueTextModeSelect.value = settings.hueTextMode || "off"
    if (DOM.clockAutoContrastCheckbox) {
      DOM.clockAutoContrastCheckbox.checked = settings.clockAutoContrast !== false
    }
    if (DOM.clockUseAccentCheckbox) {
      DOM.clockUseAccentCheckbox.checked = settings.clockUseAccentColor === true
    }
    // Sync Accent Target Cards
    const accentTargetCards = document.querySelectorAll(".accent-target-card")
    const currentAccentTarget = settings.clockAccentTarget || "style"
    accentTargetCards.forEach((card) => {
      card.classList.toggle("active", card.dataset.value === currentAccentTarget)
    })

    // Sync Shadow Target Cards
    const shadowTargetCards = document.querySelectorAll(".shadow-target-card")
    const currentShadowTarget = settings.clockShadowTarget || "none"
    shadowTargetCards.forEach((card) => {
      card.classList.toggle("active", card.dataset.value === currentShadowTarget)
    })

    if (DOM.clockShadowStrengthInput) {
      DOM.clockShadowStrengthInput.value = settings.clockShadowStrength || 0
      if (DOM.clockShadowStrengthValue) {
        DOM.clockShadowStrengthValue.textContent = `${settings.clockShadowStrength || 0}%`
      }
    }
    if (DOM.clockShadowColorPicker) {
      DOM.clockShadowColorPicker.value = settings.clockShadowColor || "#000000"
    }
    if (DOM.analogMarkerModeSelect)
      DOM.analogMarkerModeSelect.value = settings.analogMarkerMode || "quarters"
    if (DOM.sidestyleAlignSelect)
      DOM.sidestyleAlignSelect.value = settings.sidestyleAlign || "left"
    if (DOM.sidestyleNoBorderCheckbox)
      DOM.sidestyleNoBorderCheckbox.checked =
        settings.sidestyleNoBorder === true
        
    const coolGreetingMorningInput = document.getElementById("cool-greeting-morning-input")
    if (coolGreetingMorningInput) coolGreetingMorningInput.value = settings.coolGreetingMorning || ""
    const coolGreetingAfternoonInput = document.getElementById("cool-greeting-afternoon-input")
    if (coolGreetingAfternoonInput) coolGreetingAfternoonInput.value = settings.coolGreetingAfternoon || ""
    const coolGreetingEveningInput = document.getElementById("cool-greeting-evening-input")
    if (coolGreetingEveningInput) coolGreetingEveningInput.value = settings.coolGreetingEvening || ""
    const coolBarTopInput = document.getElementById("cool-bar-top-input")
    if (coolBarTopInput) coolBarTopInput.value = settings.coolBarSymbolTop !== undefined ? settings.coolBarSymbolTop : "|"
    const coolBarBottomInput = document.getElementById("cool-bar-bottom-input")
    if (coolBarBottomInput) coolBarBottomInput.value = settings.coolBarSymbolBottom !== undefined ? settings.coolBarSymbolBottom : "|"
    const coolBarScaleInput = document.getElementById("cool-bar-scale-input")
    if (coolBarScaleInput) coolBarScaleInput.value = settings.coolBarScale !== undefined ? settings.coolBarScale : 2.5
    const codeStyleLanguageSelect = document.getElementById("code-style-language-select")
    if (codeStyleLanguageSelect) codeStyleLanguageSelect.value = settings.codeClockLanguage || "javascript"
    const codeStyleShowDateCheckbox = document.getElementById("code-style-show-date-checkbox")
    if (codeStyleShowDateCheckbox) codeStyleShowDateCheckbox.checked = settings.codeClockShowDate !== false
    
    const customAngleSkewXInput = document.getElementById("custom-angle-skewx-input")
    if (customAngleSkewXInput) customAngleSkewXInput.value = settings.customAngleSkewX !== undefined ? settings.customAngleSkewX : 15
    const customAngleSkewYInput = document.getElementById("custom-angle-skewy-input")
    if (customAngleSkewYInput) customAngleSkewYInput.value = settings.customAngleSkewY !== undefined ? settings.customAngleSkewY : 0
    const customAngleRotateInput = document.getElementById("custom-angle-rotate-input")
    if (customAngleRotateInput) customAngleRotateInput.value = settings.customAngleRotate !== undefined ? settings.customAngleRotate : -5
    const customAngleShowDateCheckbox = document.getElementById("custom-angle-show-date-checkbox")
    if (customAngleShowDateCheckbox) customAngleShowDateCheckbox.checked = settings.customAngleShowDate !== false

    const globalClockCutBottomInput = document.getElementById("global-clock-cut-bottom-input")
    if (globalClockCutBottomInput) globalClockCutBottomInput.value = settings.clockCutBottom !== undefined ? settings.clockCutBottom : 0
    const globalClockFadeBottomInput = document.getElementById("global-clock-fade-bottom-input")
    if (globalClockFadeBottomInput) globalClockFadeBottomInput.value = settings.clockFadeBottom !== undefined ? settings.clockFadeBottom : 100
    if (DOM.sidebarClockFlipCheckbox)
      DOM.sidebarClockFlipCheckbox.checked = settings.sidebarClockFlip === true
    if (DOM.clockStyleBgSelect) {
      DOM.clockStyleBgSelect.value =
        settings.clockStyleTransparentBackground === true
          ? "transparent"
          : settings.clockStyleBackground || "default"
    }
    if (DOM.clockStyleCustomBgColor) {
      DOM.clockStyleCustomBgColor.value = /^#[0-9a-f]{6}$/i.test(
        settings.clockStyleCustomBgColor || "",
      )
        ? settings.clockStyleCustomBgColor
        : "#1f2937"
    }
    if (DOM.clockStyleAccentColor) {
      const currentStyleForAccent = settings.dateClockStyle || "default"
      DOM.clockStyleAccentColor.value = getClockStyleCustomAccentColor(
        settings,
        currentStyleForAccent,
      )
    }
    if (DOM.clockStyleUseM3AccentCheckbox) {
      const currentStyleForAccent = settings.dateClockStyle || "default"
      DOM.clockStyleUseM3AccentCheckbox.checked = getClockStyleUsesM3Accent(
        settings,
        currentStyleForAccent,
      )
    }
    if (DOM.cartoonClockAnimationCheckbox) {
      DOM.cartoonClockAnimationCheckbox.checked =
        settings.cartoonClockAnimation !== false
    }
    // Sync Font Target Cards
    const fontTargetCards = document.querySelectorAll(".font-target-card")
    const currentFontTarget = settings.clockFontTarget || "both"
    fontTargetCards.forEach((card) => {
      card.classList.toggle("active", card.dataset.value === currentFontTarget)
    })

    // Manage display of conditional settings
    const style = settings.dateClockStyle || "default"
    const backgroundClockStyles = [
      "minimal",
      "glass",
      "round",
      "square",
      "analog",
      "cartoon",
      "fliqlo",
      "cyber-pulse",
      "neon-grid",
      "terminal",
      "c4-bomb",
      "holo-ring",
      "code",
      "custom-angle",
      "media-orb",
      "prism-stack",
      "metro-panel",
      "minimalist-word",
      "aurora-ribbon",
      "lunar-orbit",
    ]

    // Show style-specific container if current style has special settings
    const styleHasExtras = true
    if (DOM.styleSpecificCustomization) {
      DOM.styleSpecificCustomization.style.display = styleHasExtras
        ? "block"
        : "none"
    }

    if (DOM.analogMarkerModeSetting)
      DOM.analogMarkerModeSetting.style.display =
        style === "analog" ? "block" : "none"
    if (DOM.analogBlurBgSetting)
      DOM.analogBlurBgSetting.style.display =
        style === "analog" ? "flex" : "none"

    if (DOM.clockFadeBottomSetting) {
      DOM.clockFadeBottomSetting.style.display = "block"
      if (DOM.clockFadeBottomSelect) {
        DOM.clockFadeBottomSelect.value = settings.clockFadeFromBottom || "off"
      }
      if (DOM.clockFadeDirectionSelect) {
        DOM.clockFadeDirectionSelect.value = settings.clockFadeDirection || "bottom"
      }
    }

    if (settings.clockFadeFromBottom && settings.clockFadeFromBottom !== "off" && settings.clockFadeFromBottom !== false) {
      document.body.classList.add("clock-has-fade")
      
      let levelVal = parseInt(settings.clockFadeFromBottom)
      if (isNaN(levelVal)) levelVal = 50
      let p = levelVal / 100 // 0.05 to 1.0
      let dir = settings.clockFadeDirection || "bottom"
      
      let mask = ""
      switch (dir) {
        case "top":
          mask = `linear-gradient(to bottom, transparent 0%, black ${p * 100}%)`
          break
        case "horizontal":
          mask = `linear-gradient(to right, transparent 0%, black ${p * 50}%, black ${100 - p * 50}%, transparent 100%)`
          break
        case "center": // Center is transparent, fades to solid edges
          mask = `radial-gradient(circle at center, transparent 0%, black ${p * 100}%)`
          break
        case "radial": // Center is solid, fades to transparent edges
          mask = `radial-gradient(circle at center, black ${100 - p * 100}%, transparent 100%)`
          break
        case "bottom":
        default:
          mask = `linear-gradient(to top, transparent 0%, black ${p * 100}%)`
          break
      }
      
      document.body.style.setProperty("--clock-fade-mask", mask)
      document.body.removeAttribute("data-clock-fade-bottom") // Cleanup old attr
      document.body.classList.remove("clock-fade-from-bottom") // Cleanup old class
    } else {
      document.body.classList.remove("clock-has-fade")
      document.body.style.removeProperty("--clock-fade-mask")
      document.body.removeAttribute("data-clock-fade-bottom")
      document.body.classList.remove("clock-fade-from-bottom")
    }

    if (DOM.jpStyleLanguageSetting)
      DOM.jpStyleLanguageSetting.style.display =
        style === "jp-style" ? "block" : "none"
    if (DOM.sidestyleAlignSetting)
      DOM.sidestyleAlignSetting.style.display =
        style === "sidestyle" ? "block" : "none"
    const coolStyleSettings = document.getElementById("cool-style-settings")
    if (coolStyleSettings) {
      coolStyleSettings.style.display = style === "cool" ? "block" : "none"
    }
    const codeStyleSettings = document.getElementById("code-style-settings")
    if (codeStyleSettings) {
      codeStyleSettings.style.display = style === "code" ? "block" : "none"
    }
    const customAngleSettings = document.getElementById("custom-angle-settings")
    if (customAngleSettings) {
      customAngleSettings.style.display = style === "custom-angle" ? "block" : "none"
    }

    if (style === "custom-angle") {
      document.body.style.setProperty("--skewX", (settings.customAngleSkewX !== undefined ? settings.customAngleSkewX : 15) + "deg")
      document.body.style.setProperty("--skewY", (settings.customAngleSkewY !== undefined ? settings.customAngleSkewY : 0) + "deg")
      document.body.style.setProperty("--rotate", (settings.customAngleRotate !== undefined ? settings.customAngleRotate : -5) + "deg")
    } else {
      document.body.style.removeProperty("--skewX")
      document.body.style.removeProperty("--skewY")
      document.body.style.removeProperty("--rotate")
    }

    const clockCutBottom = settings.clockCutBottom !== undefined ? settings.clockCutBottom : 0
    const clockFadeBottom = settings.clockFadeBottom !== undefined ? settings.clockFadeBottom : 100
    document.documentElement.style.setProperty("--clock-cut-bottom", clockCutBottom + "px")
    document.documentElement.style.setProperty("--clock-visible-percent", clockFadeBottom + "%")
    if (clockCutBottom > 0 || clockFadeBottom < 100) {
      document.body.classList.add("clock-occlusion-enabled")
    } else {
      document.body.classList.remove("clock-occlusion-enabled")
    }
    if (DOM.sidebarClockFlipSetting)
      DOM.sidebarClockFlipSetting.style.display =
        style === "sidebar" ? "block" : "none"

    if (DOM.clockStyleBgSetting)
      DOM.clockStyleBgSetting.style.display = backgroundClockStyles.includes(
        style,
      )
        ? "block"
        : "none"

    if (DOM.clockStyleBgSelect) {
      const animatedOption = DOM.clockStyleBgSelect.querySelector(
        'option[value="animated"]',
      )
      if (animatedOption) animatedOption.hidden = style !== "prism-stack"
      if (style !== "prism-stack" && DOM.clockStyleBgSelect.value === "animated") {
        DOM.clockStyleBgSelect.value = "default"
      }
    }

    if (DOM.clockStyleCustomBgSetting) {
      DOM.clockStyleCustomBgSetting.style.display =
        backgroundClockStyles.includes(style) &&
        DOM.clockStyleBgSelect?.value === "custom"
          ? "flex"
          : "none"
    }

    const hasStyleAccentOption = CLOCK_STYLE_ACCENT_STYLES.includes(style)
    const usesM3Accent = getClockStyleUsesM3Accent(settings, style)

    if (DOM.clockStyleUseM3AccentSetting) {
      DOM.clockStyleUseM3AccentSetting.style.display = hasStyleAccentOption
        ? "flex"
        : "none"
    }

    if (DOM.clockStyleAccentColorSetting) {
      DOM.clockStyleAccentColorSetting.style.display =
        hasStyleAccentOption && !usesM3Accent ? "flex" : "none"
    }

    if (DOM.cartoonClockAnimationSetting) {
      DOM.cartoonClockAnimationSetting.style.display =
        style === "cartoon" ? "flex" : "none"
    }

    if (DOM.terminalClockVariantSetting) {
      DOM.terminalClockVariantSetting.style.display =
        style === "terminal" ? "block" : "none"
    }
    if (DOM.terminalClockVariantSelect) {
      DOM.terminalClockVariantSelect.value = [
        "window",
        "linux",
        "macos",
      ].includes(settings.terminalClockVariant)
        ? settings.terminalClockVariant
        : "window"
    }

    if (DOM.mediaOrbImageSetting)
      DOM.mediaOrbImageSetting.style.display =
        style === "media-orb" ? "block" : "none"
    if (DOM.mediaOrbImageUrlInput)
      DOM.mediaOrbImageUrlInput.value =
        settings.mediaOrbImageUrl || DEFAULT_MEDIA_ORB_IMAGE_URL
    if (DOM.mediaOrbOverflowBorderCheckbox)
      DOM.mediaOrbOverflowBorderCheckbox.checked =
        settings.mediaOrbOverflowBorder === true
    if (DOM.mediaOrbLayoutSelect)
      DOM.mediaOrbLayoutSelect.value = ["left", "right", "center"].includes(
        settings.mediaOrbLayout,
      )
        ? settings.mediaOrbLayout
        : "left"

    if (DOM.framedClockThemeSetting) {
      DOM.framedClockThemeSetting.style.display =
        style === "round" || style === "square" ? "block" : "none"
      if (DOM.framedClockThemeSelect) {
        DOM.framedClockThemeSelect.value = settings.framedClockTheme || "light"
      }
    }

    if (DOM.fliqloThemeSetting) {
      DOM.fliqloThemeSetting.style.display =
        style === "fliqlo" ? "block" : "none"
      if (DOM.fliqloThemeSelect) {
        DOM.fliqloThemeSelect.value = settings.fliqloTheme || "dark"
      }
      const divergenceColorSetting = document.getElementById("fliqlo-divergence-color-setting")
      if (divergenceColorSetting) {
        divergenceColorSetting.style.display = settings.fliqloTheme === "divergence" ? "flex" : "none"
      }
      const divergenceColorInput = document.getElementById("fliqlo-divergence-color")
      if (divergenceColorInput) {
        divergenceColorInput.value = settings.fliqloDivergenceColor || "#ff5500"
        document.documentElement.style.setProperty("--fliqlo-divergence-color", divergenceColorInput.value)
      }
      if (DOM.fliqloZenCheckbox) {
        DOM.fliqloZenCheckbox.checked = settings.fliqloZenMode === true
      }
      if (DOM.fliqloTransparentCheckbox) {
        DOM.fliqloTransparentCheckbox.checked =
          settings.fliqloTransparent === true
      }
    }

    // Special Background Effects Toggles
    if (DOM.gradientV2Active) {
      DOM.gradientV2Active.checked = settings.gradientV2Active === true
    }
    if (DOM.svgWaveActive) {
      DOM.svgWaveActive.checked = settings.svgWaveActive === true
    }
    if (DOM.silkActive) {
      DOM.silkActive.checked = settings.silkActive === true
    }
    if (DOM.lightPillarActive) {
      DOM.lightPillarActive.checked = settings.lightPillarActive === true
    }
    if (DOM.liquidEtherActive) {
      DOM.liquidEtherActive.checked = settings.liquidEtherActive === true
    }
    if (DOM.splashCursorActive) {
      DOM.splashCursorActive.checked = settings.splashCursorActive === true
    }
    if (DOM.splashCursorDarkBg) {
      DOM.splashCursorDarkBg.checked = settings.splashCursorDarkBg === true
    }
    if (DOM.splashCursorDarkBgBtn) {
      const isDark = settings.splashCursorDarkBg === true
      DOM.splashCursorDarkBgBtn.classList.toggle("active", isDark)
    }

    // Splash Cursor inputs
    if (DOM.splashCursorRainbow) {
      DOM.splashCursorRainbow.checked =
        settings.splashCursorRainbowMode !== false
    }
    if (DOM.splashCursorColorWrap) {
      DOM.splashCursorColorWrap.style.display =
        settings.splashCursorRainbowMode === false ? "block" : "none"
    }
    if (DOM.splashCursorColor) {
      DOM.splashCursorColor.value = settings.splashCursorColor || "#ff0000"
    }
    if (DOM.splashCursorShading) {
      DOM.splashCursorShading.checked = settings.splashCursorShading !== false
    }
    const scRangeMap = [
      ["splashCursorSplatRadius", "splashCursorSplatRadiusValue", 1],
      ["splashCursorSplatForce", "splashCursorSplatForceValue", 0],
      ["splashCursorCurl", "splashCursorCurlValue", 1],
      ["splashCursorDensity", "splashCursorDensityValue", 1],
      ["splashCursorVelocity", "splashCursorVelocityValue", 1],
      ["splashCursorColorSpeed", "splashCursorColorSpeedValue", 0],
      ["splashCursorDyeRes", "splashCursorDyeResValue", 0],
    ]
    const scDefaults = {
      splashCursorSplatRadius: 0.2,
      splashCursorSplatForce: 6000,
      splashCursorCurl: 3,
      splashCursorDensityDissipation: 3.5,
      splashCursorVelocityDissipation: 2,
      splashCursorColorUpdateSpeed: 10,
      splashCursorDyeResolution: 512,
    }
    scRangeMap.forEach(([id, valId, decimals]) => {
      const el = DOM[id]
      const valEl = DOM[valId]
      if (!el) return
      const key =
        id === "splashCursorDensity"
          ? "splashCursorDensityDissipation"
          : id === "splashCursorVelocity"
            ? "splashCursorVelocityDissipation"
            : id === "splashCursorColorSpeed"
              ? "splashCursorColorUpdateSpeed"
              : id === "splashCursorDyeRes"
                ? "splashCursorDyeResolution"
                : id === "splashCursorSplatRadius"
                  ? "splashCursorSplatRadius"
                  : id === "splashCursorSplatForce"
                    ? "splashCursorSplatForce"
                    : "splashCursorCurl"
      const v = settings[key] ?? scDefaults[key]
      el.value = v
      if (valEl) {
        valEl.textContent = decimals > 0 ? v.toFixed(decimals) : String(v)
      }
    })

    // Liquid Ether Inputs
    if (DOM.liquidEtherColor1) {
      DOM.liquidEtherColor1.value = settings.liquidEtherColor1 || "#5227FF"
    }
    if (DOM.liquidEtherColor2) {
      DOM.liquidEtherColor2.value = settings.liquidEtherColor2 || "#FF9FFC"
    }
    if (DOM.liquidEtherColor3) {
      DOM.liquidEtherColor3.value = settings.liquidEtherColor3 || "#B497CF"
    }
    if (DOM.liquidEtherGlowWidth) {
      const gw = settings.liquidEtherGlowWidth ?? 5.5
      DOM.liquidEtherGlowWidth.value = gw
      if (DOM.liquidEtherGlowWidthValue) {
        DOM.liquidEtherGlowWidthValue.textContent = gw.toFixed(1)
      }
    }

    if (DOM.analogBlurBgCheckbox)
      DOM.analogBlurBgCheckbox.checked = settings.analogBlurBackground === true

    if (DOM.pageTitleInput)
      DOM.pageTitleInput.value = settings.pageTitle || "Start Page"
    if (DOM.pageTitleColorInput)
      DOM.pageTitleColorInput.value = settings.pageTitleColor || "#ffffff"
    if (DOM.tabIconBgColorInput)
      DOM.tabIconBgColorInput.value = settings.tabIconBgColor || "#1e1e32"
    if (DOM.tabIconTextColorInput)
      DOM.tabIconTextColorInput.value = settings.tabIconTextColor || "#ffffff"
    if (DOM.tabIconInput) {
      DOM.tabIconInput.value = String(settings.tabIcon || "").startsWith(
        "data:image/",
      )
        ? ""
        : settings.tabIcon || ""
    }
    effectInstances.renderTabIconPreview(
      settings.tabIcon || settings.tabIconFaClass || "",
      DOM.tabIconPreview,
    )
    if (DOM.tabIconClearBtn) {
      DOM.tabIconClearBtn.hidden = !Boolean(
        settings.tabIcon || settings.tabIconFaClass,
      )
    }
    if (DOM.tabIconTransparentBgCheckbox) {
      DOM.tabIconTransparentBgCheckbox.checked =
        settings.tabIconTransparentBg === true
    }

    if (DOM.clockSizeInput) DOM.clockSizeInput.value = settings.clockSize
    if (DOM.clockSizeValue)
      DOM.clockSizeValue.textContent = `${settings.clockSize}rem`
    if (DOM.dateSizeInput) DOM.dateSizeInput.value = String(baseDateSize)
    if (DOM.dateSizeValue)
      DOM.dateSizeValue.textContent = `${DOM.dateSizeInput.value}rem`

    if (DOM.languageSelect) DOM.languageSelect.value = settings.language || "en"
    if (DOM.accentColorPicker)
      DOM.accentColorPicker.value = settings.accentColor || "#a8c0ff"
    if (DOM.accentColorHexInput) {
      DOM.accentColorHexInput.value = (
        settings.accentColor || "#a8c0ff"
      ).toUpperCase()
    }
    if (DOM.m3AutoBgToggle) {
      DOM.m3AutoBgToggle.checked = settings.m3AutoAccentFromBg === true
    }
    if (DOM.m3WidgetsToggle) {
      DOM.m3WidgetsToggle.checked = settings.widgetUseM3Accent === true
    }
    if (DOM.m3SidebarToggle) {
      DOM.m3SidebarToggle.checked = settings.sidebarUseM3Accent === true
    }
    if (DOM.m3PaletteStyleSelect) {
      DOM.m3PaletteStyleSelect.value = settings.m3PaletteStyle || "tonalSpot"
    }
    if (DOM.accentColorModeM3) {
      DOM.accentColorModeM3.checked =
        (settings.accentColorMode || "m3") === "m3"
    }
    if (DOM.accentColorModeDefault) {
      DOM.accentColorModeDefault.checked =
        settings.accentColorMode === "default"
    }
    if (DOM.accentColorSettingsBody) {
      const isOpen = settings.accentControlsOpen !== false
      DOM.accentColorSettingsBody.style.display = "block"
      DOM.accentColorSettingsBody.classList.toggle("is-collapsed", !isOpen)
      DOM.accentColorToggleBtn?.setAttribute("aria-expanded", String(isOpen))
      if (DOM.accentColorToggleLabel) {
        const i18n = geti18n()
        DOM.accentColorToggleLabel.textContent =
          i18n[isOpen ? "settings_accent_close" : "settings_accent_open"] ||
          (isOpen ? "Hide Controls" : "Show Controls")
      }
    }
    DOM.clockColorPicker.value = currentClockColor
    if (DOM.clockDateStrokeWidthInput) {
      DOM.clockDateStrokeWidthInput.value = settings.clockDateStrokeWidth || 0
      if (DOM.clockDateStrokeWidthValue) {
        DOM.clockDateStrokeWidthValue.textContent = `${settings.clockDateStrokeWidth || 0}px`
      }
    }
    if (DOM.clockDateStrokeColorPicker) {
      DOM.clockDateStrokeColorPicker.value =
        settings.clockDateStrokeColor || "#000000"
    }
    if (DOM.clockDateStrokeTargetSelect) {
      DOM.clockDateStrokeTargetSelect.value =
        settings.clockDateStrokeTarget || "both"
    }
    DOM.dateColorPicker.value = currentDateColor

    // Custom Bookmark Inputs
    if (DOM.bookmarkFontSizeInput) {
      if (DOM.bookmarkFontSizeInput)
        DOM.bookmarkFontSizeInput.value = settings.bookmarkFontSize ?? 16
      if (DOM.bookmarkFontSizeValue && DOM.bookmarkFontSizeInput)
        DOM.bookmarkFontSizeValue.textContent = `${DOM.bookmarkFontSizeInput.value}px`

      if (DOM.bookmarkIconSizeInput)
        DOM.bookmarkIconSizeInput.value = settings.bookmarkIconSize ?? 42
      if (DOM.bookmarkIconSizeValue && DOM.bookmarkIconSizeInput)
        DOM.bookmarkIconSizeValue.textContent = `${DOM.bookmarkIconSizeInput.value}px`

      if (DOM.bookmarkGroupTextWidthInput)
        DOM.bookmarkGroupTextWidthInput.value = settings.bookmarkGroupTextWidth ?? 120
      if (DOM.bookmarkGroupTextWidthValue && DOM.bookmarkGroupTextWidthInput)
        DOM.bookmarkGroupTextWidthValue.textContent = `${DOM.bookmarkGroupTextWidthInput.value}px`

      if (DOM.bookmarkGapInput)
        DOM.bookmarkGapInput.value = settings.bookmarkGap ?? 8
      if (DOM.bookmarkGapValue && DOM.bookmarkGapInput)
        DOM.bookmarkGapValue.textContent = `${DOM.bookmarkGapInput.value}px`

      const normalizeQuickAccessRadius = (value, fallback = "8px") => {
        const allowed = new Set([
          "0px",
          "4px",
          "5px",
          "8px",
          "10px",
          "12px",
          "14px",
          "16px",
          "18px",
          "20px",
        ])
        const match = String(value || "").match(/^(\d+(?:\.\d+)?)px$/)
        if (!match) return fallback
        const px = Math.min(20, Math.max(0, Math.round(Number(match[1]))))
        const normalized = `${px}px`
        return allowed.has(normalized) ? normalized : fallback
      }
      if (DOM.lcpQuickAccessButtonRadius) {
        DOM.lcpQuickAccessButtonRadius.value = normalizeQuickAccessRadius(
          settings.quickAccessBorderRadius,
          "5px",
        )
      }
      if (DOM.lcpQuickAccessBarRadius) {
        DOM.lcpQuickAccessBarRadius.value = normalizeQuickAccessRadius(
          settings.quickAccessBarRadius,
          "14px",
        )
      }
      if (DOM.lcpQuickAccessToggleRadius) {
        DOM.lcpQuickAccessToggleRadius.value = normalizeQuickAccessRadius(
          settings.quickAccessToggleRadius,
          "20px",
        )
      }
      if (DOM.lcpQuickAccessSkin) {
        DOM.lcpQuickAccessSkin.value = [
          "default",
          "light",
          "m3-accent",
          "light-transparent",
        ].includes(settings.quickAccessSkin)
          ? settings.quickAccessSkin
          : "default"
      }
      if (DOM.lcpQuickAccessBorderVisible) {
        DOM.lcpQuickAccessBorderVisible.checked =
          settings.quickAccessBorderVisible !== false
      }

      DOM.bookmarkBgColorPicker.value = settings.bookmarkBgColor || "#ffffff"
      DOM.bookmarkBgOpacityInput.value = settings.bookmarkBgOpacity ?? 100

      if (DOM.bookmarkGroupBgColorPicker) {
        DOM.bookmarkGroupBgColorPicker.value =
          settings.bookmarkGroupBgColor || "#ffffff"
        DOM.bookmarkGroupBgOpacityInput.value =
          settings.bookmarkGroupBgOpacity ?? 0
      }
      if (DOM.bookmarkGroupTextColorPicker) {
        DOM.bookmarkGroupTextColorPicker.value =
          settings.bookmarkGroupTextColor || "#ffffff"
      }
      if (DOM.bookmarkGroupAutoTextContrast) {
        DOM.bookmarkGroupAutoTextContrast.checked =
          settings.bookmarkGroupAutoTextContrast === true
      }
      if (DOM.bookmarkGroupFontSizeInput) {
        DOM.bookmarkGroupFontSizeInput.value =
          settings.bookmarkGroupFontSize ?? 14
        if (DOM.bookmarkGroupFontSizeValue)
          DOM.bookmarkGroupFontSizeValue.textContent = `${DOM.bookmarkGroupFontSizeInput.value}px`
      }
      if (DOM.bookmarkGroupBorderRadiusInput) {
        DOM.bookmarkGroupBorderRadiusInput.value =
          settings.bookmarkGroupBorderRadius ?? 8
        if (DOM.bookmarkGroupBorderRadiusValue)
          DOM.bookmarkGroupBorderRadiusValue.textContent = `${DOM.bookmarkGroupBorderRadiusInput.value}px`
      }

      if (DOM.bookmarkTextColorPicker) {
        DOM.bookmarkTextColorPicker.value =
          settings.bookmarkTextColor || "#ffffff"
      }
      if (DOM.hideBookmarkText) {
        DOM.hideBookmarkText.checked = settings.bookmarkHideText === true
      }
      if (DOM.bookmarkLongText) {
        DOM.bookmarkLongText.checked = settings.bookmarkLongText === true
      }
      if (DOM.hideBookmarkBg) {
        DOM.hideBookmarkBg.checked = settings.bookmarkHideBg === true
      }
      if (DOM.bookmarkHideScrollbarCheckbox) {
        DOM.bookmarkHideScrollbarCheckbox.checked = settings.bookmarkHideScrollbar === true
      }
      if (DOM.bookmarkMacosHover) {
        DOM.bookmarkMacosHover.checked = settings.bookmarkMacosHover === true
      }
      if (DOM.bookmarkLayout) {
        let val = settings.bookmarkLayout || "default"
        if (settings.bookmarkSidebarMode === true && val === "default")
          val = "sidebar"
        DOM.bookmarkLayout.value = val
        if (DOM.lcpBookmarkLayout) DOM.lcpBookmarkLayout.value = val

        if (DOM.bookmarkLayoutBgStyleRow) {
          DOM.bookmarkLayoutBgStyleRow.style.display =
            val === "default" ? "none" : "flex"
        }
      }
      if (DOM.bookmarkLayoutBgStyle) {
        DOM.bookmarkLayoutBgStyle.value =
          settings.bookmarkLayoutBgStyle || "default"
        if (DOM.bookmarkLayoutBgColorRow) {
          DOM.bookmarkLayoutBgColorRow.style.display =
            DOM.bookmarkLayoutBgStyle.value === "colored" ? "flex" : "none"
        }
      }
      if (DOM.bookmarkLayoutBgColor) {
        DOM.bookmarkLayoutBgColor.value =
          settings.bookmarkLayoutBgColor || "#000000"
      }
      if (DOM.bookmarkItemStyle) {
        DOM.bookmarkItemStyle.value = settings.bookmarkItemStyle || "default"
      }

      if (DOM.bookmarkShadowColorPicker) {
        DOM.bookmarkShadowColorPicker.value =
          settings.bookmarkShadowColor || "#000000"
      }
      if (DOM.bookmarkShadowOpacityInput) {
        DOM.bookmarkShadowOpacityInput.value =
          settings.bookmarkShadowOpacity ?? 24
      }
      if (DOM.bookmarkShadowBlurInput) {
        DOM.bookmarkShadowBlurInput.value = settings.bookmarkShadowBlur ?? 8
        if (DOM.bookmarkShadowBlurValue) {
          DOM.bookmarkShadowBlurValue.textContent = `${DOM.bookmarkShadowBlurInput.value}px`
        }
      }

      if (DOM.enableBookmarkDrag) {
        DOM.enableBookmarkDrag.checked = settings.bookmarkEnableDrag === true
      }
      if (DOM.bookmarkKeepNestedFolders) {
        DOM.bookmarkKeepNestedFolders.checked = settings.bookmarkKeepNestedFolders === true
      }
      if (DOM.bookmarkLimit20) {
        DOM.bookmarkLimit20.checked = settings.bookmarkLimit20 !== false
      }
      if (DOM.showAddBookmarkButton) {
        DOM.showAddBookmarkButton.checked =
          settings.showAddBookmarkButton !== false
      }
      if (DOM.bookmarkGroupShowCount) {
        DOM.bookmarkGroupShowCount.checked =
          settings.bookmarkGroupShowCount !== false
      }
      if (DOM.bookmarkGroupUseAccent) {
        DOM.bookmarkGroupUseAccent.checked =
          settings.bookmarkGroupUseAccent === true
      }
      if (DOM.bookmarkGroupKeepBgOnInteraction) {
        DOM.bookmarkGroupKeepBgOnInteraction.checked =
          settings.bookmarkGroupKeepBgOnInteraction !== false
      }
      if (DOM.bookmarkGroupContainerBgHidden) {
        DOM.bookmarkGroupContainerBgHidden.checked =
          settings.bookmarkGroupContainerBgHidden === true
      }
      if (DOM.bookmarkGroupBorderHidden) {
        DOM.bookmarkGroupBorderHidden.checked =
          settings.bookmarkGroupBorderHidden === true
      }
      if (settings.settingsSidebarWidth) { document.documentElement.style.setProperty('--sidebar-width', settings.settingsSidebarWidth + 'px'); if (DOM.settingsSidebarWidthInput) DOM.settingsSidebarWidthInput.value = settings.settingsSidebarWidth; if (DOM.settingsSidebarWidthValue) DOM.settingsSidebarWidthValue.textContent = settings.settingsSidebarWidth + 'px'; } if (settings.bookmarkSidebarWidth) { document.documentElement.style.setProperty('--bookmark-group-text-width', settings.bookmarkSidebarWidth + 'px'); if (DOM.bookmarkSidebarWidthInput) DOM.bookmarkSidebarWidthInput.value = settings.bookmarkSidebarWidth; if (DOM.bookmarkSidebarWidthValue) DOM.bookmarkSidebarWidthValue.textContent = settings.bookmarkSidebarWidth + 'px'; } if (DOM.bookmarkLayout) { if (DOM.bookmarkSidebarWidthContainer) { DOM.bookmarkSidebarWidthContainer.style.display = settings.bookmarkLayout === 'sidebar' ? 'block' : 'none'; } }
    if (DOM.bookmarkLayoutShowGroups) {
        DOM.bookmarkLayoutShowGroups.checked =
          settings.showBookmarkGroups !== false
      }
    }

    DOM.bgSizeSelect.value = settings.bgSize || "cover"
    if (DOM.bgImageScaleInput) {
      DOM.bgImageScaleInput.value = settings.bgImageScale ?? 100
    }
    if (DOM.bgImageScaleValue) {
      DOM.bgImageScaleValue.textContent = `${settings.bgImageScale ?? 100}%`
    }
    if (DOM.bgImageScaleRow) {
      DOM.bgImageScaleRow.style.display =
        (settings.bgSize || "cover") === "custom" ? "block" : "none"
    }
    DOM.bgBlurInput.value = settings.bgBlur ?? 0
    DOM.bgBlurValue.textContent = `${settings.bgBlur ?? 0}px`
    DOM.bgBrightnessInput.value = settings.bgBrightness ?? 100
    DOM.bgBrightnessValue.textContent = `${settings.bgBrightness ?? 100}%`

    if (DOM.bgContrastInput) {
      DOM.bgContrastInput.value = settings.bgContrast ?? 100
      if (DOM.bgContrastValue)
        DOM.bgContrastValue.textContent = `${settings.bgContrast ?? 100}%`
    }
    if (DOM.bgSaturationInput) {
      DOM.bgSaturationInput.value = settings.bgSaturation ?? 100
      if (DOM.bgSaturationValue)
        DOM.bgSaturationValue.textContent = `${settings.bgSaturation ?? 100}%`
    }

    DOM.bgFadeInInput.value = settings.bgFadeIn ?? 0.5
    DOM.bgFadeInValue.textContent = `${settings.bgFadeIn ?? 0.5}s`
    if (DOM.backgroundMediaQualitySelect) {
      DOM.backgroundMediaQualitySelect.value =
        settings.backgroundMediaQuality || "balanced"
    }
    DOM.bgPosXInput.value = settings.bgPositionX || 50
    DOM.bgPosXValue.textContent = `${DOM.bgPosXInput.value}%`
    DOM.bgPosYInput.value = settings.bgPositionY || 50
    DOM.bgPosYValue.textContent = `${DOM.bgPosYInput.value}%`

    DOM.unsplashCategorySelect.value =
      settings.unsplashCategory || "spring-wallpapers"
    if (DOM.unsplashAutoRandomSelect) {
      DOM.unsplashAutoRandomSelect.value = settings.unsplashAutoRandomMode || "off"
    }
    if (DOM.unsplashAccessKeyInput)
      DOM.unsplashAccessKeyInput.value = settings.unsplashAccessKey || ""

    const unsplashSaveBtn = document.getElementById("unsplash-save-bg-btn")
    if (unsplashSaveBtn) {
      const isUnsplashBackground =
        typeof settings.background === "string" &&
        (settings.background.startsWith("idb-img-unsplash-") ||
          settings.background.includes("images.unsplash.com"))
      if (settings.background && isUnsplashBackground) {
        const userBackgrounds = settings.userBackgrounds || []
        const isSaved = userBackgrounds.some(
          (bg) =>
            (typeof bg === "string" ? bg : bg.id) === settings.background ||
            (settings.unsplashLastCredit?.photoUrl &&
              typeof bg === "object" &&
              bg.photoUrl === settings.unsplashLastCredit.photoUrl),
        )
        unsplashSaveBtn.disabled = isSaved

        const i18n = typeof geti18n === "function" ? geti18n() : null
        if (isSaved) {
          unsplashSaveBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>${i18n?.settings_unsplash_saved || "Saved"}</span>`
        } else {
          unsplashSaveBtn.innerHTML = `<i class="fa-solid fa-download"></i> <span>${i18n?.settings_unsplash_save || "Save Background"}</span>`
        }
      } else {
        unsplashSaveBtn.disabled = true
      }
    }

    const isImageBg =
      settings.background &&
      !isIdbVideo(settings.background) &&
      (isIdbImage(settings.background) ||
        settings.background.startsWith("data:image/") ||
        settings.background.startsWith("blob:") ||
        settings.background.startsWith("http"))
    const isVideoBg =
      settings.background &&
      (isIdbVideo(settings.background) ||
        settings.background.startsWith("data:video/") ||
        isVideoBackgroundValue(settings.background))

    if (DOM.bgPositionSetting)
      DOM.bgPositionSetting.style.display =
        isImageBg || isVideoBg ? "block" : "none"

    DOM.clockColorPicker.style.opacity = settings.clockColor ? "1" : "0.5"
    DOM.dateColorPicker.style.opacity = settings.dateColor ? "1" : "0.5"
    setEffectActive(DOM.effectGrid, settings.effect)
    DOM.performanceModeBtns?.forEach((btn) => {
      btn.classList.toggle(
        "active",
        btn.dataset.mode === (settings.performanceMode || "auto"),
      )
    })

    // Gradient Inputs
    DOM.gradientStartPicker.value = settings.gradientStart
    DOM.gradientEndPicker.value = settings.gradientEnd
    DOM.gradientAngleInput.value = settings.gradientAngle
    DOM.gradientAngleValue.textContent = settings.gradientAngle
    if (DOM.gradientTypeSelect) {
      DOM.gradientTypeSelect.value = settings.gradientType || "linear"
    }
    if (DOM.gradientPositionSelect) {
      DOM.gradientPositionSelect.value = settings.gradientPosition || "center"
    }
    if (DOM.gradientRadialShapeSelect) {
      DOM.gradientRadialShapeSelect.value =
        settings.gradientRadialShape || "circle"
    }
    if (DOM.gradientRepeatingToggle) {
      DOM.gradientRepeatingToggle.checked = settings.gradientRepeating === true
    }
    if (DOM.gradientSettingsBody) {
      const isOpen = settings.gradientControlsOpen !== false
      DOM.gradientSettingsBody.style.display = "block"
      DOM.gradientSettingsBody.classList.toggle("is-collapsed", !isOpen)
      DOM.gradientToggleBtn?.setAttribute("aria-expanded", String(isOpen))
      if (DOM.gradientToggleLabel) {
        const i18n = geti18n()
        DOM.gradientToggleLabel.textContent =
          i18n[isOpen ? "settings_gradient_close" : "settings_gradient_open"] ||
          (isOpen ? "Hide Controls" : "Show Controls")
      }
    }
    if (DOM.gradientExtraColorCount) {
      DOM.gradientExtraColorCount.value = String(
        Math.min(
          5,
          Math.max(
            0,
            settings.gradientExtraColorCount !== undefined
              ? Number(settings.gradientExtraColorCount)
              : 2,
          ),
        ),
      )
    }
    if (DOM.gradientCustomColors) {
      DOM.gradientCustomColors.value = settings.gradientCustomColors || ""
    }

    // Effect Color Inputs
    if (DOM.googleDriveSyncCheckbox) {
      DOM.googleDriveSyncCheckbox.checked = settings.googleDriveSync === true
    }
    if (DOM.driveSyncOptionsWrapper) {
      DOM.driveSyncOptionsWrapper.style.display = settings.googleDriveSync === true ? "block" : "none"
    }
    if (DOM.driveAutoBackupInterval) {
      DOM.driveAutoBackupInterval.value = settings.driveAutoBackupInterval || "none"
    }

    DOM.starColorPicker.value = settings.starColor || "#ffffff"
    DOM.meteorColorPicker.value =
      settings.meteorColor || settings.starColor || "#ffffff"
    if (DOM.meteorFullColorToggle) {
      DOM.meteorFullColorToggle.checked = settings.meteorFullColor === true
    }
    if (DOM.meteorAngleInput) {
      DOM.meteorAngleInput.value = settings.meteorAngle ?? 45
      if (DOM.meteorAngleValue)
        DOM.meteorAngleValue.textContent = `${settings.meteorAngle ?? 45}°`
    }
    DOM.networkColorPicker.value = settings.networkColor || "#00bcd4"
    DOM.matrixColorPicker.value = settings.matrixColor || "#00FF00"
    DOM.auraColorPicker.value = settings.auraColor || "#a8c0ff"
    DOM.northernLightsColorPicker.value =
      settings.northernLightsColor || "#00ff88"
    if (DOM.northernLightsStyleSelect) {
      DOM.northernLightsStyleSelect.value = settings.northernLightsStyle || "hd"
    }
    if (DOM.northernLightsBrightnessSlider) {
      const b = settings.northernLightsBrightness ?? 0.8
      DOM.northernLightsBrightnessSlider.value = b
      if (DOM.northernLightsBrightnessVal)
        DOM.northernLightsBrightnessVal.textContent = b.toFixed(1)
    }
    DOM.hackerColorPicker.value = settings.hackerColor || "#00FF00"
    DOM.pixelCubesColorPicker.value = settings.pixelCubesColor || "#00ff73"
    if (DOM.jellyfishColorPicker) {
      DOM.jellyfishColorPicker.value = settings.jellyfishColor || "#ffaa00"
    }
    DOM.sakuraColorPicker.value = settings.sakuraColor || "#ffb7c5"
    DOM.snowfallColorPicker.value = settings.snowfallColor || "#ffffff"
    DOM.bubblesColorPicker.value = settings.bubbleColor || "#60c8ff"
    DOM.gridScanColorPicker.value = settings.gridScanColor || "#00ffcc"
    DOM.cursorTrailColorPicker.value = settings.cursorTrailColor || "#60c8ff"
    if (DOM.flashlightColorPicker) {
      DOM.flashlightColorPicker.value = settings.flashlightColor || "#000000"
    }
    if (DOM.flashlightSizeSlider) {
      DOM.flashlightSizeSlider.value = settings.flashlightSize || 150
      if (DOM.flashlightSizeVal) {
        DOM.flashlightSizeVal.textContent = settings.flashlightSize || 150
      }
    }
    if (DOM.flashlightOpacitySlider) {
      DOM.flashlightOpacitySlider.value = settings.flashlightOpacity ?? 0.9
      if (DOM.flashlightOpacityVal) {
        DOM.flashlightOpacityVal.textContent = (
          settings.flashlightOpacity ?? 0.9
        ).toFixed(2)
      }
    }
    DOM.plantGrowthColorPicker.value = settings.plantGrowthColor || "#4caf50"
    DOM.oceanFishColorPicker.value = settings.oceanFishColor || "#ff7f50"
    DOM.floatingLinesColorPicker.value =
      settings.floatingLinesColor || "#ffffff"
    DOM.floatingLinesAngleInput.value = settings.floatingLinesAngle || 0
    DOM.floatingLinesAngleValue.textContent = `${settings.floatingLinesAngle || 0}°`

    DOM.rainHDColorPicker.value = settings.rainHDColor || "#99ccff"
    if (DOM.musicBarsColorPicker) {
      DOM.musicBarsColorPicker.value = settings.musicBarsColor || "#8be9fd"
    }
    DOM.wavyLinesColorPicker.value = settings.wavyLinesColor || "#00bcd4"
    DOM.oceanWaveColorPicker.value = settings.oceanWaveColor || "#0077b6"
    const oceanWavePos = settings.oceanWavePosition || "bottom"
    DOM.oceanWavePosBottomBtn.classList.toggle(
      "active",
      oceanWavePos === "bottom",
    )
    DOM.oceanWavePosTopBtn.classList.toggle("active", oceanWavePos === "top")
    if (DOM.cloudDriftColorPicker)
      DOM.cloudDriftColorPicker.value = settings.cloudDriftColor || "#0a0a0a"
    if (DOM.cloudDriftMoodSelect)
      DOM.cloudDriftMoodSelect.value = settings.cloudDriftMood || "default"

    // Visibility of Effect Settings
    if (DOM.starColorSetting)
      DOM.starColorSetting.style.display =
        settings.effect === "galaxy" ? "block" : "none"
    if (DOM.meteorColorSetting)
      DOM.meteorColorSetting.style.display =
        settings.effect === "meteor" ? "block" : "none"
    if (DOM.networkColorSetting)
      DOM.networkColorSetting.style.display =
        settings.effect === "network" ? "block" : "none"
    if (DOM.matrixColorSetting)
      DOM.matrixColorSetting.style.display =
        settings.effect === "matrix" ? "block" : "none"
    if (DOM.auraColorSetting)
      DOM.auraColorSetting.style.display =
        settings.effect === "aura" ? "block" : "none"
    if (DOM.northernLightsColorSetting)
      DOM.northernLightsColorSetting.style.display =
        settings.effect === "northernLights" ? "block" : "none"
    if (DOM.hackerColorSetting)
      DOM.hackerColorSetting.style.display =
        settings.effect === "hacker" ? "block" : "none"
    if (DOM.pixelCubesColorSetting)
      DOM.pixelCubesColorSetting.style.display =
        settings.effect === "pixelCubes" ? "block" : "none"
    if (DOM.windModeSetting) {
      DOM.windModeSetting.style.display =
        settings.effect === "wind" ? "block" : "none"
    }
    if (DOM.windModeSelect) {
      DOM.windModeSelect.value = settings.windMode || "2d"
    }

    if (DOM.pixelCubesShapeSelect) {
      DOM.pixelCubesShapeSelect.value = settings.pixelCubesShape || "cube"
    }
    if (DOM.pixelWeatherStyleSection) {
      DOM.pixelWeatherStyleSection.style.display =
        settings.effect === "pixelWeather" ? "block" : "none"
    }
    if (DOM.pixelSnowHQSettings) {
      DOM.pixelSnowHQSettings.style.display =
        settings.effect === "pixelSnowHQ" ? "block" : "none"

      if (DOM.pixelSnowHQColorPicker)
        DOM.pixelSnowHQColorPicker.value =
          settings.pixelSnowHQColor || "#ffffff"

      if (DOM.pixelSnowHQFlakeSizeSlider) {
        DOM.pixelSnowHQFlakeSizeSlider.value =
          settings.pixelSnowHQFlakeSize || 0.01
        if (DOM.pixelSnowHQFlakeSizeVal)
          DOM.pixelSnowHQFlakeSizeVal.textContent = (
            settings.pixelSnowHQFlakeSize || 0.01
          ).toFixed(3)
      }
      if (DOM.pixelSnowHQDensitySlider) {
        DOM.pixelSnowHQDensitySlider.value = settings.pixelSnowHQDensity || 0.3
        if (DOM.pixelSnowHQDensityVal)
          DOM.pixelSnowHQDensityVal.textContent = (
            settings.pixelSnowHQDensity || 0.3
          ).toFixed(2)
      }
      if (DOM.pixelSnowHQSpeedSlider) {
        DOM.pixelSnowHQSpeedSlider.value = settings.pixelSnowHQSpeed || 1.25
        if (DOM.pixelSnowHQSpeedVal)
          DOM.pixelSnowHQSpeedVal.textContent = (
            settings.pixelSnowHQSpeed || 1.25
          ).toFixed(2)
      }
      if (DOM.pixelSnowHQPixelResSlider) {
        DOM.pixelSnowHQPixelResSlider.value =
          settings.pixelSnowHQPixelResolution || 200
        if (DOM.pixelSnowHQPixelResVal)
          DOM.pixelSnowHQPixelResVal.textContent =
            settings.pixelSnowHQPixelResolution || 200
      }
      if (DOM.pixelSnowHQMinFlakeSizeSlider) {
        DOM.pixelSnowHQMinFlakeSizeSlider.value =
          settings.pixelSnowHQMinFlakeSize || 1.25
        if (DOM.pixelSnowHQMinFlakeSizeVal)
          DOM.pixelSnowHQMinFlakeSizeVal.textContent = (
            settings.pixelSnowHQMinFlakeSize || 1.25
          ).toFixed(2)
      }
      if (DOM.pixelSnowHQVariantSelect) {
        DOM.pixelSnowHQVariantSelect.value =
          settings.pixelSnowHQVariant || "square"
      }
      if (DOM.pixelSnowHQDepthFadeSlider) {
        DOM.pixelSnowHQDepthFadeSlider.value =
          settings.pixelSnowHQDepthFade || 8
        if (DOM.pixelSnowHQDepthFadeVal)
          DOM.pixelSnowHQDepthFadeVal.textContent =
            settings.pixelSnowHQDepthFade || 8
      }
      if (DOM.pixelSnowHQDirectionSlider) {
        DOM.pixelSnowHQDirectionSlider.value =
          settings.pixelSnowHQDirection || 125
        if (DOM.pixelSnowHQDirectionVal)
          DOM.pixelSnowHQDirectionVal.textContent = `${settings.pixelSnowHQDirection || 125}°`
      }
      if (DOM.pixelSnowHQBrightnessSlider) {
        DOM.pixelSnowHQBrightnessSlider.value =
          settings.pixelSnowHQBrightness || 1.0
        if (DOM.pixelSnowHQBrightnessVal)
          DOM.pixelSnowHQBrightnessVal.textContent = (
            settings.pixelSnowHQBrightness || 1.0
          ).toFixed(1)
      }
      if (DOM.pixelSnowHQGammaSlider) {
        DOM.pixelSnowHQGammaSlider.value = settings.pixelSnowHQGamma || 0.4545
        if (DOM.pixelSnowHQGammaVal)
          DOM.pixelSnowHQGammaVal.textContent = (
            settings.pixelSnowHQGamma || 0.4545
          ).toFixed(2)
      }
      if (DOM.pixelSnowHQFarPlaneSlider) {
        DOM.pixelSnowHQFarPlaneSlider.value = settings.pixelSnowHQFarPlane || 20
        if (DOM.pixelSnowHQFarPlaneVal)
          DOM.pixelSnowHQFarPlaneVal.textContent =
            settings.pixelSnowHQFarPlane || 20
      }
    }

    if (DOM.softAuroraSettings) {
      DOM.softAuroraSettings.style.display =
        settings.effect === "softAurora" ? "block" : "none"
      if (DOM.softAuroraColor1Picker)
        DOM.softAuroraColor1Picker.value =
          settings.softAuroraColor1 || "#74ebd5"
      if (DOM.softAuroraColor2Picker)
        DOM.softAuroraColor2Picker.value =
          settings.softAuroraColor2 || "#e100ff"
      if (DOM.softAuroraSpeedSlider) {
        DOM.softAuroraSpeedSlider.value = settings.softAuroraSpeed || 0.6
        if (DOM.softAuroraSpeedVal)
          DOM.softAuroraSpeedVal.textContent = (
            settings.softAuroraSpeed || 0.6
          ).toFixed(1)
      }
      if (DOM.softAuroraScaleSlider) {
        DOM.softAuroraScaleSlider.value = settings.softAuroraScale || 1.5
        if (DOM.softAuroraScaleVal)
          DOM.softAuroraScaleVal.textContent = (
            settings.softAuroraScale || 1.5
          ).toFixed(1)
      }
      if (DOM.softAuroraBrightnessSlider) {
        DOM.softAuroraBrightnessSlider.value =
          settings.softAuroraBrightness || 1.0
        if (DOM.softAuroraBrightnessVal)
          DOM.softAuroraBrightnessVal.textContent = (
            settings.softAuroraBrightness || 1.0
          ).toFixed(1)
      }
      if (DOM.softAuroraNoiseFreqSlider) {
        DOM.softAuroraNoiseFreqSlider.value =
          settings.softAuroraNoiseFreq || 2.5
        if (DOM.softAuroraNoiseFreqVal)
          DOM.softAuroraNoiseFreqVal.textContent = (
            settings.softAuroraNoiseFreq || 2.5
          ).toFixed(1)
      }
      if (DOM.softAuroraBandHeightSlider) {
        DOM.softAuroraBandHeightSlider.value =
          settings.softAuroraBandHeight || 0.5
        if (DOM.softAuroraBandHeightVal)
          DOM.softAuroraBandHeightVal.textContent = (
            settings.softAuroraBandHeight || 0.5
          ).toFixed(2)
      }
      if (DOM.softAuroraBandSpreadSlider) {
        DOM.softAuroraBandSpreadSlider.value =
          settings.softAuroraBandSpread || 2.5
        if (DOM.softAuroraBandSpreadVal)
          DOM.softAuroraBandSpreadVal.textContent = (
            settings.softAuroraBandSpread || 2.5
          ).toFixed(1)
      }
      if (DOM.softAuroraMouseCheckbox) {
        DOM.softAuroraMouseCheckbox.checked =
          settings.softAuroraEnableMouse !== false
      }
    }

    if (DOM.skyLanternsSetting) {
      DOM.skyLanternsSetting.style.display =
        settings.effect === "skyLanterns" ? "block" : "none"
    }
    if (DOM.skyLanternsTypeSelect) {
      DOM.skyLanternsTypeSelect.value = settings.skyLanternsType || "lantern"
    }
    if (DOM.pixelRunColorSetting) {
      DOM.pixelWeatherStyleSelect.value = settings.pixelWeatherStyle || "snow"
    }

    if (DOM.pixelWeatherResolutionSlider) {
      DOM.pixelWeatherResolutionSlider.value =
        settings.pixelWeatherResolution || 1
      if (DOM.pixelWeatherResolutionVal)
        DOM.pixelWeatherResolutionVal.textContent =
          settings.pixelWeatherResolution || 1
    }
    if (DOM.pixelWeatherSpeedSlider) {
      DOM.pixelWeatherSpeedSlider.value = settings.pixelWeatherSpeed || 1.0
      if (DOM.pixelWeatherSpeedVal)
        DOM.pixelWeatherSpeedVal.textContent = (
          settings.pixelWeatherSpeed || 1.0
        ).toFixed(1)
    }
    if (DOM.pixelWeatherSizeSlider) {
      DOM.pixelWeatherSizeSlider.value = settings.pixelWeatherSize || 1.0
      if (DOM.pixelWeatherSizeVal)
        DOM.pixelWeatherSizeVal.textContent = (
          settings.pixelWeatherSize || 1.0
        ).toFixed(1)
    }
    if (DOM.pixelWeatherDensitySlider) {
      DOM.pixelWeatherDensitySlider.value = settings.pixelWeatherDensity || 1.0
      if (DOM.pixelWeatherDensityVal)
        DOM.pixelWeatherDensityVal.textContent = (
          settings.pixelWeatherDensity || 1.0
        ).toFixed(1)
    }

    if (DOM.jellyfishColorSetting) {
      DOM.jellyfishColorSetting.style.display =
        settings.effect === "jellyfish" ? "block" : "none"
    }
    if (DOM.jellyfishTypeSelect) {
      DOM.jellyfishTypeSelect.value = settings.jellyfishType || "jellyfish"
    }
    if (DOM.sakuraColorSetting) {
      DOM.sakuraColorSetting.style.display =
        settings.effect === "sakura" ? "block" : "none"
    }

    // Aurora Wave
    if (DOM.auroraWaveTitleSetting) {
      DOM.auroraWaveTitleSetting.style.display =
        settings.effect === "auroraWave" ? "block" : "none"
    }
    if (DOM.auroraWaveColorSetting) {
      DOM.auroraWaveColorSetting.style.display =
        settings.effect === "auroraWave" ? "block" : "none"
    }
    if (DOM.auroraWaveBrightnessSetting) {
      DOM.auroraWaveBrightnessSetting.style.display =
        settings.effect === "auroraWave" ? "block" : "none"
    }
    if (DOM.auroraWaveSpeedSetting) {
      DOM.auroraWaveSpeedSetting.style.display =
        settings.effect === "auroraWave" ? "block" : "none"
    }
    if (DOM.auroraWaveAmplitudeSetting) {
      DOM.auroraWaveAmplitudeSetting.style.display =
        settings.effect === "auroraWave" ? "block" : "none"
    }
    if (DOM.auroraWaveBgSetting) {
      DOM.auroraWaveBgSetting.style.display =
        settings.effect === "auroraWave" ? "block" : "none"
    }

    if (DOM.auroraWaveColorPicker) {
      DOM.auroraWaveColorPicker.value = settings.auroraWaveColor || "#00bcd4"
    }
    if (DOM.auroraWaveTransparentCheckbox) {
      const isTransparent = settings.auroraWaveTransparent !== false
      DOM.auroraWaveTransparentCheckbox.checked = isTransparent
      if (DOM.auroraWaveBgColorContainer) {
        DOM.auroraWaveBgColorContainer.style.display = isTransparent
          ? "none"
          : "block"
      }
    }
    if (DOM.auroraWaveBgColorPicker) {
      DOM.auroraWaveBgColorPicker.value =
        settings.auroraWaveBgColor || "#000000"
    }
    if (DOM.auroraWaveBgOpacitySlider) {
      const op = settings.auroraWaveBgOpacity ?? 0.15
      DOM.auroraWaveBgOpacitySlider.value = op
      if (DOM.auroraWaveBgOpacityVal)
        DOM.auroraWaveBgOpacityVal.textContent = op
    }
    if (DOM.auroraWaveBrightnessSlider) {
      const b = settings.auroraWaveBrightness || 0.65
      DOM.auroraWaveBrightnessSlider.value = b
      if (DOM.auroraWaveBrightnessVal)
        DOM.auroraWaveBrightnessVal.textContent = b.toFixed(2)
    }
    if (DOM.auroraWaveSpeedSlider) {
      const s = settings.auroraWaveSpeed || 1.0
      DOM.auroraWaveSpeedSlider.value = s
      if (DOM.auroraWaveSpeedVal)
        DOM.auroraWaveSpeedVal.textContent = s.toFixed(1)
    }
    if (DOM.auroraWaveAmplitudeSlider) {
      const a = settings.auroraWaveAmplitude || 70
      DOM.auroraWaveAmplitudeSlider.value = a
      if (DOM.auroraWaveAmplitudeVal) DOM.auroraWaveAmplitudeVal.textContent = a
    }

    if (DOM.snowfallColorSetting) {
      DOM.snowfallColorSetting.style.display =
        settings.effect === "snowfall" ? "block" : "none"
    }
    if (DOM.fallingLeavesSettledSkinSetting) {
      DOM.fallingLeavesSettledSkinSetting.style.display =
        settings.effect === "fallingLeavesSettled" ? "block" : "none"
    }
    if (DOM.fallingLeavesSettledSkinSelect) {
      DOM.fallingLeavesSettledSkinSelect.value =
        settings.fallingLeavesSkin || "maple"
    }

    // Pixel Blast
    if (DOM.pixelBlastColorSetting) {
      DOM.pixelBlastColorSetting.style.display =
        settings.effect === "pixelBlast" ? "block" : "none"
    }
    if (DOM.pixelBlastVariantSetting) {
      DOM.pixelBlastVariantSetting.style.display =
        settings.effect === "pixelBlast" ? "block" : "none"
    }
    if (DOM.pixelBlastSizeSetting) {
      DOM.pixelBlastSizeSetting.style.display =
        settings.effect === "pixelBlast" ? "block" : "none"
    }
    if (DOM.pixelBlastBgSetting) {
      DOM.pixelBlastBgSetting.style.display =
        settings.effect === "pixelBlast" ? "block" : "none"
    }
    if (DOM.pixelBlastLiquidSetting) {
      DOM.pixelBlastLiquidSetting.style.display =
        settings.effect === "pixelBlast" ? "block" : "none"
    }
    if (DOM.pixelBlastInteractiveSetting) {
      DOM.pixelBlastInteractiveSetting.style.display =
        settings.effect === "pixelBlast" ? "block" : "none"
    }

    if (DOM.pixelBlastColorPicker) {
      DOM.pixelBlastColorPicker.value = settings.pixelBlastColor || "#B497CF"
    }
    if (DOM.pixelBlastVariantSelect) {
      DOM.pixelBlastVariantSelect.value = settings.pixelBlastVariant || "square"
    }
    if (DOM.pixelBlastSizeSlider) {
      DOM.pixelBlastSizeSlider.value = settings.pixelBlastSize || 15
      if (DOM.pixelBlastSizeVal) {
        DOM.pixelBlastSizeVal.textContent = settings.pixelBlastSize || 15
      }
    }
    if (DOM.pixelBlastLiquidCheckbox) {
      DOM.pixelBlastLiquidCheckbox.checked = settings.pixelBlastLiquid !== false
    }
    if (DOM.pixelBlastLiquidStrengthSlider) {
      const strength = settings.pixelBlastLiquidStrength ?? 1.0
      DOM.pixelBlastLiquidStrengthSlider.value = strength
      if (DOM.pixelBlastLiquidStrengthVal) {
        DOM.pixelBlastLiquidStrengthVal.textContent = strength.toFixed(1)
      }
    }
    if (DOM.pixelBlastCursorRadiusSlider) {
      DOM.pixelBlastCursorRadiusSlider.value =
        settings.pixelBlastCursorRadius || 150
      if (DOM.pixelBlastCursorRadiusVal) {
        DOM.pixelBlastCursorRadiusVal.textContent =
          settings.pixelBlastCursorRadius || 150
      }
    }
    if (DOM.pixelBlastRippleCheckbox) {
      DOM.pixelBlastRippleCheckbox.checked =
        settings.pixelBlastRipples !== false
    }
    if (DOM.pixelBlastTransparentCheckbox) {
      DOM.pixelBlastTransparentCheckbox.checked =
        settings.pixelBlastTransparent !== false
    }
    if (DOM.pixelBlastBgColorContainer) {
      DOM.pixelBlastBgColorContainer.style.display =
        settings.pixelBlastTransparent !== false ? "none" : "block"
    }
    if (DOM.pixelBlastBgColorPicker) {
      DOM.pixelBlastBgColorPicker.value =
        settings.pixelBlastBgColor || "#0a0a0a"
    }

    // Sunbeam
    if (DOM.sunbeamColorSetting)
      DOM.sunbeamColorSetting.style.display =
        settings.effect === "sunbeam" ? "block" : "none"
    if (DOM.sunbeamAngleSetting)
      DOM.sunbeamAngleSetting.style.display =
        settings.effect === "sunbeam" ? "block" : "none"
    if (DOM.sunbeamColorPicker) {
      DOM.sunbeamColorPicker.value = settings.sunbeamColor || "#ffffff"
    }
    if (DOM.sunbeamAngleInput) {
      DOM.sunbeamAngleInput.value = String(settings.sunbeamAngle ?? 0)
      if (DOM.sunbeamAngleValue)
        DOM.sunbeamAngleValue.textContent = DOM.sunbeamAngleInput.value
    }
    if (DOM.bubblesColorSetting)
      DOM.bubblesColorSetting.style.display =
        settings.effect === "bubbles" ? "block" : "none"
    if (DOM.gridScanColorSetting)
      DOM.gridScanColorSetting.style.display =
        settings.effect === "gridScan" ? "block" : "none"
    if (DOM.cursorTrailColorSetting)
      DOM.cursorTrailColorSetting.style.display =
        settings.effect === "cursorTrail" ? "block" : "none"
    if (DOM.cursorTrailStyleSetting)
      DOM.cursorTrailStyleSetting.style.display =
        settings.effect === "cursorTrail" ? "block" : "none"
    if (DOM.cursorTrailClickSetting)
      DOM.cursorTrailClickSetting.style.display =
        settings.effect === "cursorTrail" ? "flex" : "none"
    if (DOM.cursorTrailRandomSetting)
      DOM.cursorTrailRandomSetting.style.display =
        settings.effect === "cursorTrail" ? "flex" : "none"
    if (DOM.flashlightColorSetting)
      DOM.flashlightColorSetting.style.display =
        settings.effect === "flashlight" ? "block" : "none"
    if (DOM.flashlightSizeSetting)
      DOM.flashlightSizeSetting.style.display =
        settings.effect === "flashlight" ? "block" : "none"
    if (DOM.flashlightOpacitySetting)
      DOM.flashlightOpacitySetting.style.display =
        settings.effect === "flashlight" ? "block" : "none"
    if (DOM.plantGrowthColorSetting)
      DOM.plantGrowthColorSetting.style.display =
        settings.effect === "plantGrowth" ? "block" : "none"
    if (DOM.oceanFishColorSetting)
      DOM.oceanFishColorSetting.style.display =
        settings.effect === "oceanFish" ? "block" : "none"
    if (DOM.floatingLinesColorSetting)
      DOM.floatingLinesColorSetting.style.display =
        settings.effect === "floatingLines" ? "block" : "none"
    if (DOM.floatingLinesAngleSetting)
      DOM.floatingLinesAngleSetting.style.display =
        settings.effect === "floatingLines" ? "block" : "none"
    if (DOM.rainHDColorSetting)
      DOM.rainHDColorSetting.style.display =
        settings.effect === "rainHD" ? "block" : "none"
    if (DOM.musicBarsColorSetting)
      DOM.musicBarsColorSetting.style.display =
        settings.effect === "musicBars" ? "block" : "none"
    if (DOM.wavyLinesColorSetting)
      DOM.wavyLinesColorSetting.style.display =
        settings.effect === "wavyLines" ? "block" : "none"
    if (DOM.oceanWaveColorSetting)
      DOM.oceanWaveColorSetting.style.display =
        settings.effect === "oceanWave" ? "block" : "none"
    if (DOM.oceanWavePositionSetting)
      DOM.oceanWavePositionSetting.style.display =
        settings.effect === "oceanWave" ? "block" : "none"
    if (DOM.cloudDriftColorSetting)
      DOM.cloudDriftColorSetting.style.display =
        settings.effect === "cloudDrift" ? "block" : "none"
    if (DOM.cloudDriftMoodSetting)
      DOM.cloudDriftMoodSetting.style.display =
        settings.effect === "cloudDrift" ? "block" : "none"
    if (DOM.shinyColorSetting)
      DOM.shinyColorSetting.style.display =
        settings.effect === "shiny" ? "block" : "none"
    if (DOM.shinyColorPicker)
      DOM.shinyColorPicker.value = settings.shinyColor || "#ff0000"
    if (DOM.lineShinyColorSetting)
      DOM.lineShinyColorSetting.style.display =
        settings.effect === "lineShiny" ? "block" : "none"

    if (DOM.rainbowDirectionSetting)
      DOM.rainbowDirectionSetting.style.display =
        settings.effect === "rainbow" ? "block" : "none"
    if (settings.rainbowDirection === "right") {
      DOM.rainbowDirRightBtn?.classList.add("active")
      DOM.rainbowDirLeftBtn?.classList.remove("active")
    } else {
      DOM.rainbowDirLeftBtn?.classList.add("active")
      DOM.rainbowDirRightBtn?.classList.remove("active")
    }

    // Visibility of Active Effect Settings Container
    if (DOM.activeEffectSettingsContainer) {
      const effectsWithSettings = [
        "rainbow",
        "galaxy",
        "meteor",
        "network",
        "matrix",
        "aura",
        "northernLights",
        "wind",
        "hacker",
        "pixelCubes",
        "pixelWeather",
        "pixelBlast",
        "auroraWave",
        "sunbeam",
        "lightPillars",
        "tetFireworks",
        "pixelSnowHQ",
        "skyLanterns",
        "jellyfish",
        "sakura",
        "snowfall",
        "fallingLeavesSettled",
        "bubbles",
        "flashlight",
        "gridScan",
        "cursorTrail",
        "plantGrowth",
        "oceanFish",
        "rainHD",
        "musicBars",
        "wavyLines",
        "oceanWave",
        "cloudDrift",
        "shiny",
        "lineShiny",
        "pixelRun",
        "nintendoPixel",
        "crtScanlines",
        "retroGame",
        "wavyPattern",
        "angledPattern",
        "floatingLines",
        "softAurora",
      ]
      const hasSettings = effectsWithSettings.includes(settings.effect)
      DOM.activeEffectSettingsContainer.style.display = hasSettings
        ? "block"
        : "none"
    }
    if (DOM.lineShinyColorPicker)
      DOM.lineShinyColorPicker.value = settings.lineShinyColor || "#ffffff"
    if (DOM.pixelRunColorSetting)
      DOM.pixelRunColorSetting.style.display =
        settings.effect === "pixelRun" ? "block" : "none"
    if (DOM.pixelRunColorPicker)
      DOM.pixelRunColorPicker.value = settings.pixelRunColor || "#00e5ff"

    if (DOM.nintendoPixelColorSetting)
      DOM.nintendoPixelColorSetting.style.display =
        settings.effect === "nintendoPixel" ? "block" : "none"
    if (DOM.nintendoPixelColorPicker)
      DOM.nintendoPixelColorPicker.value =
        settings.nintendoPixelColor || "#63f5ff"
    if (DOM.crtScanColorSetting)
      DOM.crtScanColorSetting.style.display =
        settings.effect === "crtScanlines" ? "block" : "none"
    if (DOM.crtScanFrequencySetting)
      DOM.crtScanFrequencySetting.style.display =
        settings.effect === "crtScanlines" ? "block" : "none"
    if (DOM.crtScanAngleSetting)
      DOM.crtScanAngleSetting.style.display =
        settings.effect === "crtScanlines" ? "block" : "none"
    if (DOM.crtScanDensitySetting)
      DOM.crtScanDensitySetting.style.display =
        settings.effect === "crtScanlines" ? "block" : "none"
    if (DOM.crtGammaSetting)
      DOM.crtGammaSetting.style.display =
        settings.effect === "crtScanlines" ? "block" : "none"
    if (DOM.crtBackgroundColorSetting)
      DOM.crtBackgroundColorSetting.style.display =
        settings.effect === "crtScanlines" ? "block" : "none"
    DOM.crtScanColorPicker.value = settings.crtScanColor || "#7cffad"
    DOM.crtScanFrequencyInput.value = String(settings.crtScanFrequency ?? 0.11)
    if (DOM.crtScanFrequencyValue)
      DOM.crtScanFrequencyValue.textContent = Number(
        DOM.crtScanFrequencyInput.value,
      ).toFixed(2)

    DOM.crtScanAngleInput.value = String(settings.crtScanAngle ?? 0)
    if (DOM.crtScanAngleValue)
      DOM.crtScanAngleValue.textContent = DOM.crtScanAngleInput.value

    DOM.crtScanDensityInput.value = String(settings.crtScanDensity ?? 4)
    if (DOM.crtScanDensityValue)
      DOM.crtScanDensityValue.textContent = DOM.crtScanDensityInput.value

    DOM.crtGammaInput.value = String(settings.crtGamma ?? 0.3)
    if (DOM.crtGammaValue)
      DOM.crtGammaValue.textContent = Number(DOM.crtGammaInput.value).toFixed(2)

    DOM.crtBackgroundColorPicker.value =
      settings.crtBackgroundColor || "#0a140f"

    if (DOM.retroGameTypeSetting)
      DOM.retroGameTypeSetting.style.display =
        settings.effect === "retroGame" ? "block" : "none"
    if (DOM.retroGameTypeSelect) {
      DOM.retroGameTypeSelect.value = settings.retroGameType || "space_invaders"
    }

    if (DOM.retroGameColorSetting)
      DOM.retroGameColorSetting.style.display =
        settings.effect === "retroGame" ? "block" : "none"
    if (DOM.retroGameColorPicker)
      DOM.retroGameColorPicker.value = settings.retroGameColor || "#00ff00"
    if (DOM.wavyPatternColor1Setting)
      DOM.wavyPatternColor1Setting.style.display =
        settings.effect === "wavyPattern" ? "block" : "none"
    if (DOM.wavyPatternColor2Setting)
      DOM.wavyPatternColor2Setting.style.display =
        settings.effect === "wavyPattern" ? "block" : "none"
    if (DOM.wavyPatternColor1Picker)
      DOM.wavyPatternColor1Picker.value =
        settings.wavyPatternColor1 || "#AB3E5B"
    if (DOM.wavyPatternColor2Picker)
      DOM.wavyPatternColor2Picker.value =
        settings.wavyPatternColor2 || "#FFBE40"
    if (DOM.angledPatternColor1Setting)
      DOM.angledPatternColor1Setting.style.display =
        settings.effect === "angledPattern" ? "block" : "none"
    if (DOM.angledPatternColor2Setting)
      DOM.angledPatternColor2Setting.style.display =
        settings.effect === "angledPattern" ? "block" : "none"
    if (DOM.angledPatternColor1Picker)
      DOM.angledPatternColor1Picker.value =
        settings.angledPatternColor1 || "#ECD078"
    if (DOM.angledPatternColor2Picker)
      DOM.angledPatternColor2Picker.value =
        settings.angledPatternColor2 || "#0B486B"

    // SVG Wave Generator
    const waveActive = settings.svgWaveActive === true
    const waveGeneratorOpen =
      localStorage.getItem("startpage_svgWaveGeneratorOpen") === "1"
    if (DOM.svgWaveSettings) {
      DOM.svgWaveSettings.style.display = "block"
      DOM.svgWaveSettings.classList.toggle("is-collapsed", !waveGeneratorOpen)
    }
    DOM.svgWaveToggleBtn?.setAttribute(
      "aria-expanded",
      String(waveGeneratorOpen),
    )
    if (DOM.svgWaveToggleLabel) {
      const i18n = geti18n()
      DOM.svgWaveToggleLabel.textContent = waveGeneratorOpen
        ? i18n.settings_svg_wave_close || "Close Wave Generator"
        : i18n.settings_svg_wave_open || "Open Wave Generator"
    }

    DOM.svgWaveAmpX.value = settings.svgWaveAmplitudeX ?? 200
    DOM.svgWaveAmpXValue.textContent = DOM.svgWaveAmpX.value
    DOM.svgWaveLines.value = settings.svgWaveLines ?? 5
    DOM.svgWaveLinesValue.textContent = DOM.svgWaveLines.value
    DOM.svgWaveAmpY.value = settings.svgWaveAmplitudeY ?? 80
    DOM.svgWaveAmpYValue.textContent = DOM.svgWaveAmpY.value
    DOM.svgWaveOffsetX.value = settings.svgWaveOffsetX ?? 0
    DOM.svgWaveOffsetXValue.textContent = DOM.svgWaveOffsetX.value
    DOM.svgWaveAngle.value = settings.svgWaveAngle ?? 0
    DOM.svgWaveAngleValue.textContent = DOM.svgWaveAngle.value
    DOM.svgWaveSmoothness.value = settings.svgWaveSmoothness ?? 0.5
    DOM.svgWaveSmoothnessValue.textContent = DOM.svgWaveSmoothness.value
    DOM.svgWaveCraziness.value = settings.svgWaveCraziness ?? 30
    DOM.svgWaveCrazinessValue.textContent = DOM.svgWaveCraziness.value
    DOM.svgWaveFill.checked = settings.svgWaveFill !== false
    DOM.svgWaveStartHue.value = settings.svgWaveStartHue ?? 200
    DOM.svgWaveStartHueValue.textContent = DOM.svgWaveStartHue.value
    DOM.svgWaveStartSat.value = settings.svgWaveStartSaturation ?? 70
    DOM.svgWaveStartSatValue.textContent = DOM.svgWaveStartSat.value
    DOM.svgWaveStartLight.value = settings.svgWaveStartLightness ?? 40
    DOM.svgWaveStartLightValue.textContent = DOM.svgWaveStartLight.value
    DOM.svgWaveEndHue.value = settings.svgWaveEndHue ?? 280
    DOM.svgWaveEndHueValue.textContent = DOM.svgWaveEndHue.value
    DOM.svgWaveEndSat.value = settings.svgWaveEndSaturation ?? 70
    DOM.svgWaveEndSatValue.textContent = DOM.svgWaveEndSat.value
    DOM.svgWaveEndLight.value = settings.svgWaveEndLightness ?? 30
    DOM.svgWaveEndLightValue.textContent = DOM.svgWaveEndLight.value
    effectInstances.updateWaveColorPreviews(settings)

    DOM.showTodoCheckbox.checked = settings.showTodoList !== false
    if (DOM.todoShowCheckboxesToggle) {
      DOM.todoShowCheckboxesToggle.checked =
        settings.todoShowCheckboxes !== false
    }
    DOM.showNotepadCheckbox.checked = settings.showNotepad !== false
    DOM.showTimerCheckbox.checked = settings.showTimer === true
    if (DOM.showWeatherCheckbox) {
      DOM.showWeatherCheckbox.checked = settings.showWeather === true
    }
    const weatherApiModeSelect = document.getElementById("weather-api-mode-select")
    const weatherCustomApiSettings = document.getElementById(
      "weather-custom-api-settings",
    )
    const weatherForecastEndpointInput = document.getElementById(
      "weather-forecast-endpoint-input",
    )
    const weatherGeocodingEndpointInput = document.getElementById(
      "weather-geocoding-endpoint-input",
    )
    const setWeatherEndpointValidation = (input, type) => {
      if (!input) return
      const endpoint = String(input.value || "").trim()
      let ok = false
      let message = ""
      if (!endpoint) {
        message =
          geti18n().settings_weather_url_required ||
          "Required for custom weather API."
      } else {
        try {
          const url = new URL(endpoint)
          const duplicateParams = (WEATHER_API_REQUIRED_PARAMS[type] || []).filter(
            (param) => url.searchParams.has(param),
          )
          ok =
            (url.protocol === "https:" || url.protocol === "http:") &&
            duplicateParams.length === 0
          message = ok
            ? geti18n().settings_weather_url_valid || "Looks good."
            : duplicateParams.length
              ? geti18n().settings_weather_url_no_query ||
                "Use the base endpoint only; the app adds weather query parameters."
              : geti18n().settings_weather_url_protocol ||
                "Use a full http:// or https:// URL."
        } catch {
          message =
            geti18n().settings_weather_url_invalid ||
            "Enter a valid URL, including https://."
        }
      }
      const status =
        input.id === "weather-forecast-endpoint-input"
          ? document.getElementById("weather-forecast-endpoint-status")
          : document.getElementById("weather-geocoding-endpoint-status")
      input.classList.toggle("is-valid", ok)
      input.classList.toggle("is-invalid", !ok)
      input.setAttribute("aria-invalid", ok ? "false" : "true")
      input.setCustomValidity(ok ? "" : message)
      if (status) {
        status.textContent = message
        status.classList.toggle("is-valid", ok)
        status.classList.toggle("is-invalid", !ok)
      }
    }
    const weatherUnitSelect = document.getElementById("weather-unit-select")
    if (weatherUnitSelect) {
      weatherUnitSelect.value = settings.weatherUnit || "celsius"
    }
    if (weatherApiModeSelect) {
      weatherApiModeSelect.value = settings.weatherApiMode || "extension"
    }
    if (weatherCustomApiSettings) {
      weatherCustomApiSettings.style.display =
        settings.weatherApiMode === "custom" ? "grid" : "none"
    }
    if (weatherForecastEndpointInput) {
      weatherForecastEndpointInput.value = settings.weatherForecastEndpoint || ""
      setWeatherEndpointValidation(weatherForecastEndpointInput, "forecast")
    }
    if (weatherGeocodingEndpointInput) {
      weatherGeocodingEndpointInput.value =
        settings.weatherGeocodingEndpoint || ""
      setWeatherEndpointValidation(weatherGeocodingEndpointInput, "geocoding")
    }
    if (DOM.hideTimerAlarmDropdownCheckbox) {
      DOM.hideTimerAlarmDropdownCheckbox.checked =
        settings.hideTimerAlarmDropdown === true
    }
    if (DOM.timerAlarmSoundSelect) {
      renderTimerAlarmSelectOptions(
        DOM.timerAlarmSoundSelect,
        settings.timerAlarmSound || DEFAULT_TIMER_ALARM_SOUND,
        settings,
        geti18n(),
      )
    }
    if (DOM.timerAlarmCustomName) {
      const hasCustomAlarm = Boolean(settings.timerCustomAlarmSoundId)
      DOM.timerAlarmCustomName.textContent = hasCustomAlarm
        ? settings.timerCustomAlarmSoundName || "Custom Sound"
        : DOM.timerAlarmCustomName.dataset.i18n
          ? DOM.timerAlarmCustomName.textContent
          : "No custom sound uploaded"
      DOM.timerAlarmCustomName.classList.toggle("has-file", hasCustomAlarm)
    }
    if (DOM.timerAlarmSoundRemoveBtn) {
      DOM.timerAlarmSoundRemoveBtn.disabled = !settings.timerCustomAlarmSoundId
    }
    DOM.showGregorianCheckbox.checked = settings.showGregorian !== false
    DOM.showMusicCheckbox.checked = settings.musicPlayerEnabled === true
    if (DOM.musicPlayerUseDefaultColorMode) {
      if (settings.musicPlayerUseDefaultColor === "thumbnail") {
        DOM.musicPlayerUseDefaultColorMode.value = "thumbnail"
      } else {
        DOM.musicPlayerUseDefaultColorMode.value =
          settings.musicPlayerUseDefaultColor === true ? "true" : "false"
      }
    }
    if (DOM.musicSourceIconColorModeSelect) {
      DOM.musicSourceIconColorModeSelect.value =
        settings.musicSourceIconColorMode || "brand"
    }
    if (DOM.clockDisplaySelect) {
      DOM.clockDisplaySelect.value = settings.clockDisplayMode || "all"
    }
    DOM.showFullCalendarCheckbox.checked = settings.showFullCalendar === true
    if (DOM.freeMoveClockCheckbox)
      DOM.freeMoveClockCheckbox.checked = settings.freeMoveClock === true
    const calendarDateMode =
      settings.calendarDateMode ||
      (settings.showLunarCalendar ? "both" : "solar")
    if (DOM.calendarDisplayModeSelect) {
      DOM.calendarDisplayModeSelect.value =
        calendarDateMode === "lunar" || calendarDateMode === "both"
          ? calendarDateMode
          : "solar"
    }
    if (DOM.showLunarCalendarCheckbox) {
      DOM.showLunarCalendarCheckbox.checked = calendarDateMode !== "solar"
    }
    if (DOM.lcpLunarCalendar) {
      DOM.lcpLunarCalendar.checked = calendarDateMode !== "solar"
    }
    if (DOM.showLunarCalendarClockCheckbox) {
      DOM.showLunarCalendarClockCheckbox.checked =
        !!settings.showClockLunarCalendar
    }
    if (DOM.clockLunarModeSelect) {
      DOM.clockLunarModeSelect.value = settings.showClockLunarMode || "append"
    }

    if (DOM.flipLayoutCheckbox) {
      DOM.flipLayoutCheckbox.checked = settings.flipLayout === true
    }
    if (DOM.lcpFlipLayout) {
      DOM.lcpFlipLayout.checked = settings.flipLayout === true
    }
    if (DOM.lcpQuickAccessHorizontal) {
      DOM.lcpQuickAccessHorizontal.checked = settings.quickAccessHorizontal === true
    }

    if (DOM.showDonateButtonCheckbox) {
      DOM.showDonateButtonCheckbox.checked = settings.showDonateButton !== false
    }
    if (DOM.allowTextSelectionCheckbox) {
      DOM.allowTextSelectionCheckbox.checked =
        settings.allowTextSelection === true
    }
    DOM.showSearchBarCheckbox.checked = settings.showSearchBar !== false
    if (DOM.freeMoveSearchBarCheckbox) {
      DOM.freeMoveSearchBarCheckbox.checked =
        settings.freeMoveSearchBar === true
    }
    if (DOM.lcpSearchBar) {
      DOM.lcpSearchBar.checked = settings.showSearchBar !== false
    }
    if (DOM.showSearchAiIconCheckbox) {
      DOM.showSearchAiIconCheckbox.checked = settings.showSearchAIIcon !== false
    }
    if (DOM.extensionActionBehaviorSelect) {
      DOM.extensionActionBehaviorSelect.value = settings.actionBehavior || "sidepanel"
    }
    
    if (DOM.searchEngineSelect) {
      DOM.searchEngineSelect.value = settings.searchEngine || "google"
    }
    if (DOM.searchBarWidthSlider) {
      DOM.searchBarWidthSlider.value = settings.searchBarWidth || 600
      if (DOM.searchBarWidthVal) {
        DOM.searchBarWidthVal.textContent = `${settings.searchBarWidth || 600}px`
      }
    }

    if (DOM.lcpQaShowTodo) DOM.lcpQaShowTodo.checked = settings.qaShowTodo !== false
    if (DOM.lcpQaShowNotepad) DOM.lcpQaShowNotepad.checked = settings.qaShowNotepad !== false
    if (DOM.lcpQaShowTimer) DOM.lcpQaShowTimer.checked = settings.qaShowTimer !== false
    if (DOM.lcpQaShowCalendar) DOM.lcpQaShowCalendar.checked = settings.qaShowCalendar !== false
    if (DOM.lcpQaShowQuotes) DOM.lcpQaShowQuotes.checked = settings.qaShowQuotes !== false
    if (DOM.lcpQaShowWeather) DOM.lcpQaShowWeather.checked = settings.qaShowWeather !== false
    if (DOM.lcpQaShowMusic) DOM.lcpQaShowMusic.checked = settings.qaShowMusic !== false
    if (DOM.lcpQaShowClock) DOM.lcpQaShowClock.checked = settings.qaShowClock !== false
    if (DOM.lcpQaShowGregorian) DOM.lcpQaShowGregorian.checked = settings.qaShowGregorian !== false
    if (DOM.lcpQaShowRss) DOM.lcpQaShowRss.checked = settings.qaShowRss !== false
    if (DOM.lcpQaAllowReorder) DOM.lcpQaAllowReorder.checked = settings.qaAllowReorder === true
    if (DOM.searchBarBlurSlider) {
      DOM.searchBarBlurSlider.value = settings.searchBarBlur ?? 20
      if (DOM.searchBarBlurVal) {
        DOM.searchBarBlurVal.textContent = `${settings.searchBarBlur ?? 20}px`
      }
    }
    if (DOM.lcpSearchBarWidth) {
      DOM.lcpSearchBarWidth.value = settings.searchBarWidth || 600
      if (DOM.lcpSearchBarWidthVal) {
        DOM.lcpSearchBarWidthVal.textContent = `${settings.searchBarWidth || 600}px`
      }
    }
    DOM.showBookmarksCheckbox.checked = settings.showBookmarks !== false
    if (DOM.showQuickAccessBgCheckbox) {
      DOM.showQuickAccessBgCheckbox.checked =
        settings.showQuickAccessBg === true
    }
    if (DOM.lcpQuickAccessBg) {
      DOM.lcpQuickAccessBg.checked = settings.showQuickAccessBg === true
    }
    if (DOM.showContextMenuBgCheckbox) {
      DOM.showContextMenuBgCheckbox.checked =
        settings.showContextMenuBg !== false
    }
    if (DOM.lcpBookmarks) {
      DOM.lcpBookmarks.checked = settings.showBookmarks !== false
    }
    if (DOM.lcpContextMenuBg) {
      DOM.lcpContextMenuBg.checked = settings.showContextMenuBg !== false
    }
    DOM.showBookmarkGroupsCheckbox.checked =
      settings.showBookmarkGroups !== false
    if (settings.settingsSidebarWidth) { document.documentElement.style.setProperty('--sidebar-width', settings.settingsSidebarWidth + 'px'); if (DOM.settingsSidebarWidthInput) DOM.settingsSidebarWidthInput.value = settings.settingsSidebarWidth; if (DOM.settingsSidebarWidthValue) DOM.settingsSidebarWidthValue.textContent = settings.settingsSidebarWidth + 'px'; } if (settings.bookmarkSidebarWidth) { document.documentElement.style.setProperty('--bookmark-group-text-width', settings.bookmarkSidebarWidth + 'px'); if (DOM.bookmarkSidebarWidthInput) DOM.bookmarkSidebarWidthInput.value = settings.bookmarkSidebarWidth; if (DOM.bookmarkSidebarWidthValue) DOM.bookmarkSidebarWidthValue.textContent = settings.bookmarkSidebarWidth + 'px'; } if (DOM.bookmarkLayout) { if (DOM.bookmarkSidebarWidthContainer) { DOM.bookmarkSidebarWidthContainer.style.display = settings.bookmarkLayout === 'sidebar' ? 'block' : 'none'; } }
    if (DOM.bookmarkLayoutShowGroups) {
      DOM.bookmarkLayoutShowGroups.checked =
        settings.showBookmarkGroups !== false
    }
    if (DOM.lcpBookmarkGroups) {
      DOM.lcpBookmarkGroups.checked = settings.showBookmarkGroups !== false
    }
    if (DOM.bookmarkOpenInNewTab) {
      DOM.bookmarkOpenInNewTab.checked = settings.bookmarkOpenInNewTab === true
    }
    DOM.ghostControlsCheckbox.checked = settings.sideControlsGhostMode === true
    if (DOM.lcpGhostControls) {
      DOM.lcpGhostControls.checked = settings.sideControlsGhostMode === true
    }
    document.body.classList.toggle(
      "has-top-right-controls",
      settings.showTopRightControls !== false,
    )
    DOM.showTopRightControlsCheckbox.checked =
      settings.showTopRightControls !== false
    if (DOM.lcpTopRightControls) {
      DOM.lcpTopRightControls.checked = settings.showTopRightControls !== false
    }
    document.body.classList.toggle("flip-layout", settings.flipLayout === true)
    document.body.classList.toggle(
      "ghost-controls",
      settings.sideControlsGhostMode === true,
    )
    document.body.classList.toggle("flip-layout", settings.flipLayout === true)
    document.body.classList.toggle(
      "quick-access-horizontal",
      settings.quickAccessHorizontal === true,
    )
    document.body.classList.toggle(
      "free-move-clock",
      settings.freeMoveClock === true,
    )
    document.body.classList.toggle("flip-layout", settings.flipLayout === true)
    document.body.classList.toggle(
      "free-move-custom-title",
      settings.freeMoveCustomTitle === true,
    )
    document.body.classList.toggle(
      "free-move-search-bar",
      settings.freeMoveSearchBar === true,
    )
    if (settings.freeMoveClock !== true) {
      const clockWrap = document.getElementById("clock-date-wrap")
      if (clockWrap) {
        clockWrap.style.position = ""
        clockWrap.style.top = ""
        clockWrap.style.left = ""
        clockWrap.style.bottom = ""
        clockWrap.style.right = ""
        clockWrap.style.transform = ""
        clockWrap.style.margin = ""
      }
    }
    if (settings.freeMoveCustomTitle !== true) {
      const titleWrap = document.getElementById("custom-title-display")
      if (titleWrap) {
        titleWrap.style.position = ""
        titleWrap.style.top = ""
        titleWrap.style.left = ""
        titleWrap.style.bottom = ""
        titleWrap.style.right = ""
        titleWrap.style.transform = ""
        titleWrap.style.margin = ""
      }
    }
    if (settings.freeMoveSearchBar !== true) {
      const searchWrap = document.getElementById("search-container")
      if (searchWrap) {
        searchWrap.style.position = ""
        searchWrap.style.top = ""
        searchWrap.style.left = ""
        searchWrap.style.bottom = ""
        searchWrap.style.right = ""
        searchWrap.style.transform = ""
        searchWrap.style.margin = ""
      }
    }
    if (DOM.showCustomTitleCheckbox) {
      DOM.showCustomTitleCheckbox.checked = settings.showCustomTitle !== false
    }
    if (DOM.freeMoveCustomTitleCheckbox) {
      DOM.freeMoveCustomTitleCheckbox.checked =
        settings.freeMoveCustomTitle === true
    }
    if (DOM.customTitleText) {
      DOM.customTitleText.value = settings.customTitleText || ""
    const text2El = document.getElementById("custom-title-text-2")
    if (text2El) text2El.value = settings.customTitleText2 || ""
    const populateFontDropdown = (selectEl, selectedVal) => {
      if (!selectEl) return;
      selectEl.innerHTML = '<option value="inherit">Font mặc định</option>';
      PREDEFINED_FONTS.forEach(f => {
        const opt = document.createElement("option");
        opt.value = f.value;
        opt.textContent = f.label;
        selectEl.appendChild(opt);
      });
      const customFonts = JSON.parse(localStorage.getItem("customFonts")) || [];
      customFonts.forEach(f => {
        const opt = document.createElement("option");
        opt.value = `'${f.name}'`;
        opt.textContent = `${f.name} (Tùy chỉnh)`;
        selectEl.appendChild(opt);
      });
      selectEl.value = selectedVal || "inherit";
    };
    
    populateFontDropdown(document.getElementById("custom-title-font"), settings.customTitleFont);
    populateFontDropdown(document.getElementById("custom-title-font-2"), settings.customTitleFont2);
    populateFontDropdown(document.getElementById("custom-title-font-3"), settings.customTitleFont3);
    populateFontDropdown(document.getElementById("custom-title-font-4"), settings.customTitleFont4);

    const oriEl = document.getElementById("custom-title-orientation")
    if (oriEl) oriEl.value = settings.customTitleOrientation || "upright"
    const ori2El = document.getElementById("custom-title-orientation-2")
    if (ori2El) ori2El.value = settings.customTitleOrientation2 || "mixed"
    const ori3El = document.getElementById("custom-title-orientation-3")
    if (ori3El) ori3El.value = settings.customTitleOrientation3 || "mixed"
    const ori4El = document.getElementById("custom-title-orientation-4")
    if (ori4El) ori4El.value = settings.customTitleOrientation4 || "mixed"

    const dirEl = document.getElementById("custom-title-direction")
    if (dirEl) dirEl.value = settings.customTitleDirection || "horizontal"
    const orderEl = document.getElementById("custom-title-order")
    if (orderEl) orderEl.value = settings.customTitleOrder || "normal"
    const wwEl = document.getElementById("custom-title-word-wrap")
    if (wwEl) wwEl.checked = settings.customTitleWordWrap === true

    const animEl = document.getElementById("custom-title-animation")
    if (animEl) animEl.value = settings.customTitleAnimation || "none"
    const animLoopEl = document.getElementById("custom-title-animation-loop")
    if (animLoopEl) animLoopEl.value = settings.customTitleAnimationLoop || "infinite"
    
    if (DOM.customTitleMulticolor)
      DOM.customTitleMulticolor.checked =
        settings.customTitleMulticolor === true
      if (DOM.customTitleColor)
        DOM.customTitleColor.value = settings.customTitleColor || "#ffffff"

      const fs = settings.customTitleFontSize || 24
      if (DOM.customTitleFontSize) DOM.customTitleFontSize.value = fs
      const fsd = document.getElementById("custom-title-fontsize-val")
      if (fsd) fsd.textContent = fs

      const fs2 = settings.customTitleFontSize2 || 24
      const fs2Input = document.getElementById("custom-title-font-size-2")
      if (fs2Input) fs2Input.value = fs2
      const fs2d = document.getElementById("custom-title-fontsize-2-val")
      if (fs2d) fs2d.textContent = fs2

      const ls = settings.customTitleLetterSpacing || 0
      if (DOM.customTitleLetterSpacing) DOM.customTitleLetterSpacing.value = ls
      const lsd = document.getElementById("custom-title-letter-spacing-val")
      if (lsd) lsd.textContent = ls

      const ls2 = settings.customTitleLetterSpacing2 || 0
      const ls2Input = document.getElementById("custom-title-letter-spacing-2")
      if (ls2Input) ls2Input.value = ls2
      const ls2d = document.getElementById("custom-title-letter-spacing-2-val")
      if (ls2d) ls2d.textContent = ls2

      const lineSpc = settings.customTitleLineSpacing || 15
      const lineSpcInput = document.getElementById("custom-title-line-spacing")
      if (lineSpcInput) lineSpcInput.value = lineSpc
      const lineSpcd = document.getElementById("custom-title-line-spacing-val")
      if (lineSpcd) lineSpcd.textContent = lineSpc

      const sb = settings.customTitleShadowBlur || 0
      if (DOM.customTitleShadowBlur) DOM.customTitleShadowBlur.value = sb
      const sbd = document.getElementById("custom-title-shadow-blur-val")
      if (sbd) sbd.textContent = sb

      const sy = settings.customTitleShadowY || 0
      if (DOM.customTitleShadowY) DOM.customTitleShadowY.value = sy
      const syd = document.getElementById("custom-title-shadow-y-val")
      if (syd) syd.textContent = sy

      if (DOM.customTitleShadowColor)
        DOM.customTitleShadowColor.value =
          settings.customTitleShadowColor || "#000000"

      const bs = settings.customTitleBorderSize || 0
      if (DOM.customTitleBorderSize) DOM.customTitleBorderSize.value = bs
      const bsd = document.getElementById("custom-title-border-size-val")
      if (bsd) bsd.textContent = bs

      if (DOM.customTitleBorderColor)
        DOM.customTitleBorderColor.value =
          settings.customTitleBorderColor || "#000000"
    }

    if (DOM.cursorTrailStyleSelect) {
      DOM.cursorTrailStyleSelect.value = settings.cursorTrailStyle || "classic"
    }

    DOM.musicStyleSelect.value = settings.musicBarStyle || "vinyl"
    if (DOM.lcpMusicStyleSelect) {
      DOM.lcpMusicStyleSelect.value = settings.musicBarStyle || "vinyl"
    }
    document
      .querySelectorAll(".style-preset-btn[data-style-preset]")
      .forEach((btn) => {
        btn.classList.toggle(
          "active",
          btn.dataset.stylePreset ===
            (settings.interfaceStylePreset || "custom"),
        )
      })

    // Sync Theme-specific UI
    if (DOM.fliqloThemeSelect) {
      DOM.fliqloThemeSelect.value = settings.fliqloTheme || "dark"
    }
    if (DOM.contextMenuStyleSelect) {
      DOM.contextMenuStyleSelect.value = settings.contextMenuStyle || "dark"
    }
    if (DOM.clockDateStyleSelect) {
      DOM.clockDateStyleSelect.value = settings.dateClockStyle || "default"
    }
  }
}

export { createApplySettings, createUpdateSettingsInputs }
