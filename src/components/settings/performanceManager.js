/**
 * Settings Performance Manager
 * Monitors frame rate, adjusts effect budgets, and trims media caches.
 * Extracted from settingsApplier.js
 */

import { getSettings } from "../../services/state.js"
import { trimMediaMemory } from "../../services/imageStore.js"

let _perfMonitorStarted = false
let _perfMonitorRafId = null
let _perfAvgFrameMs = 16.7
let _perfLagging = false
let _perfLastApply = 0
let _lastMediaTrim = 0
let _currentBgToken = 0

export function ensurePerformanceMonitor() {
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

export function getPerformanceProfile(settings) {
  ensurePerformanceMonitor()
  const mode = settings.performanceMode || "auto"
  const saveData = navigator.connection?.saveData === true
  const lowCores =
    Number.isFinite(navigator.hardwareConcurrency) &&
    navigator.hardwareConcurrency > 0 &&
    navigator.hardwareConcurrency <= 4
  const smallScreen =
    Math.min(window.innerWidth || 0, window.innerHeight || 0) <= 720

  const reduceMotionSetting = settings.reduceMotion || "system"
  const reduceMotion =
    reduceMotionSetting === "always" ||
    (reduceMotionSetting === "system" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)

  const intensity = Number.isFinite(settings.effectIntensity)
    ? Math.max(20, Math.min(100, settings.effectIntensity))
    : 100

  const shouldSave =
    mode === "low" ||
    mode === "battery" ||
    reduceMotion ||
    intensity < 60 ||
    (mode === "auto" && (saveData || lowCores || smallScreen || _perfLagging))

  const level =
    mode === "low" || intensity <= 30
      ? "low"
      : shouldSave
        ? "battery"
        : mode === "quality" && intensity >= 90 && !reduceMotion
          ? "quality"
          : "balanced"

  const intensityFactor = intensity / 100
  const densityScale = Math.max(
    0.15,
    (level === "low" ? 0.35 : level === "battery" ? 0.6 : 1.0) * intensityFactor,
  )
  const speedScale = Math.max(
    0.2,
    (reduceMotion ? 0.35 : level === "low" ? 0.45 : level === "battery" ? 0.7 : 1.0) *
      (intensity < 50 ? 0.65 : 1.0),
  )
  const targetFps = reduceMotion ? 20 : level === "low" ? 20 : level === "battery" ? 30 : 60

  return {
    mode,
    shouldSave,
    level,
    reduceMotion,
    intensity,
    densityScale,
    speedScale,
    targetFps,
  }
}

export function trimMediaCacheForProfile(settings) {
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

export function getEffectPerformanceOptions(settings, effectName) {
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

export function withPerformanceBudget(settings, type, options) {
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

export function applyEffectPerformanceBudget(effect, settings) {
  if (!effect) return

  const profile = getPerformanceProfile(settings)
  const { targetFps, densityScale } = profile

  if (typeof effect.setPerformanceBudget === "function") {
    effect.setPerformanceBudget(profile)
  }

  if (
    Number.isFinite(effect.bubbleCount) &&
    !Number.isFinite(effect._performanceBaseBubbleCount)
  ) {
    effect._performanceBaseBubbleCount = effect.bubbleCount
  }
  if (Number.isFinite(effect._performanceBaseBubbleCount)) {
    effect.bubbleCount = Math.max(
      8,
      Math.round(effect._performanceBaseBubbleCount * densityScale),
    )
  }

  if (
    Number.isFinite(effect.snowflakeCount) &&
    !Number.isFinite(effect._performanceBaseSnowflakeCount)
  ) {
    effect._performanceBaseSnowflakeCount = effect.snowflakeCount
  }
  if (Number.isFinite(effect._performanceBaseSnowflakeCount)) {
    effect.snowflakeCount = Math.max(
      20,
      Math.round(effect._performanceBaseSnowflakeCount * densityScale),
    )
  }

  if (
    Number.isFinite(effect.fps) &&
    effect.fps > 0 &&
    !Number.isFinite(effect._performanceBaseFps)
  ) {
    effect._performanceBaseFps = effect.fps
  }

  const baseFps = effect._performanceBaseFps
  if (Number.isFinite(baseFps) && baseFps > 0) {
    const nextFps = Math.min(baseFps, targetFps)
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
    effect.targetFps = Math.min(baseTargetFps, targetFps)
  }
}

