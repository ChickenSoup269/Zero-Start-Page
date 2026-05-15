/**
 * Settings Module Index - Main Initialization
 * Coordinates all sub-modules and provides initSettings() export
 */

import { showAlert, showConfirm } from "../../utils/dialog.js"
import {
  saveImage,
  saveVideo,
  getImageBlob,
} from "../../services/imageStore.js"
import * as DOM_EXPORTS from "../../utils/dom.js"
import {
  getSettings,
  updateSetting,
  saveSettings,
  localBackgrounds,
  resetSettingsState,
} from "../../services/state.js"
import {
  geti18n,
  loadLanguage,
  applyTranslations,
} from "../../services/i18n.js"

// Import modular components
import {
  getTabIconChars,
  applyTabIcon,
  renderTabIconPreview,
} from "./tabIcon.js"
import {
  loadGoogleFont,
  renderFontGrid,
  initFont,
  setupLocalFonts,
} from "./fontManager.js"
import { initThemeManager, THEMEABLE_KEYS } from "./themeManager.js"
import {
  initGradientV2Manager,
  renderUserGradientV2s,
} from "./gradientV2Manager.js"
import { getSvgWaveParams, updateWaveColorPreviews } from "./svgWaveUtils.js"
import {
  populateUnsplashCollections,
  setUnsplashRandomBackground,
} from "./unsplashFetcher.js"
import {
  createApplySettings,
  createUpdateSettingsInputs,
} from "./settingsApplier.js"
import {
  renderLocalBackgrounds,
  renderUserColors,
  renderUserAccentColors,
  setupMultiSelectMode,
  setupFileUploads,
} from "./backgroundManager.js"
import {
  renderUserGradients,
  setupGradientMultiSelect,
} from "./gradientManager.js"
import {
  renderUserSvgWaves,
  setupSvgWaveMultiSelect,
} from "./svgWaveManager.js"
import {
  initSpecialEffectsManager,
  renderUserSilks,
  renderUserLightPillars,
  renderUserLiquidEthers,
} from "./specialEffectsManager.js"
import { setupEffectColorHandlers } from "./effectColorHandlers.js"
import {
  setupMultiColorManager,
  renderSavedMultiColors,
} from "./multiColorManager.js"
import { setupGeneralEventHandlers } from "./eventHandlers.js"

// Import animation effects
import { StarFall } from "../animations/rainGalaxy.js"
import { FirefliesEffect } from "../animations/fireflies.js"
import { NetworkEffect } from "../animations/network.js"
import { MatrixRain } from "../animations/matrixRain.js"
import { AuraEffect } from "../animations/aura.js"
import { WindEffect } from "../animations/wind.js"
import { HackerEffect } from "../animations/hacker.js"
import { PixelCubes } from "../animations/pixelCubes.js"
import { Jellyfish } from "../animations/jellyfish.js"
import { SakuraEffect } from "../animations/sakura.js"
import { SnowfallEffect } from "../animations/snowfall.js"
import { SnowfallHDEffect } from "../animations/snowfallHD.js"
import { AuroraWaveEffect } from "../animations/auroraWave.js"
import { NorthernLightsEffect } from "../animations/northernLights.js"
import { BubblesEffect } from "../animations/bubbles.js"
import { CursorTrailEffect } from "../animations/cursorTrail.js"
import { FlashlightEffect } from "../animations/flashlight.js"
import { GridScanEffect } from "../animations/gridScan.js"
import { RainHDEffect } from "../animations/rainHD.js"
import { StormRainEffect } from "../animations/stormRain.js"
import { RainbowBackground } from "../animations/rainbowBackground.js"
import { WavyLinesEffect } from "../animations/wavyLines.js"
import { OceanWaveEffect } from "../animations/oceanWave.js"
import { CloudDriftEffect } from "../animations/cloudDrift.js"
import { FirefliesHD } from "../animations/firefliesHD.js"
import { SvgWaveGenerator } from "../animations/svgWaveGenerator.js"
import { AutumnLeavesEffect } from "../animations/autumnLeaves.js"
import { GreenLeavesEffect } from "../animations/greenLeaves.js"
import { FallingLeavesSettledEffect } from "../animations/fallingLeavesSettled.js"
import { SunbeamEffect } from "../animations/sunbeam.js"
import { LightPillarsEffect } from "../animations/lightPillars.js"
import { PixelWeatherEffect } from "../animations/pixelWeather.js"
import { ShinyEffect } from "../animations/shiny.js"
import { LineShinyEffect } from "../animations/lineShiny.js"
import { TetFireworksEffect } from "../animations/tetFireworks.js"
import { ReunificationDayEffect } from "../animations/reunificationDay.js"
import { HalloweenEffect } from "../animations/halloween.js"
import { SkyLanternsEffect } from "../animations/skyLanterns.js"
import { PixelRunEffect } from "../animations/pixelRun.js"
import { NintendoPixelEffect } from "../animations/nintendoPixel.js"
import { RetroGameEffect } from "../animations/retroGame.js"
import { MeteorEffect } from "../animations/meteor.js"
import { WavyPatternEffect } from "../animations/wavyPattern.js"
import { AngledPatternEffect } from "../animations/angledPattern.js"
import { CrtScanlinesEffect } from "../animations/crtScanlines.js"
import { PlantGrowthEffect } from "../animations/plantGrowth.js"
import { LiquidEther } from "../animations/liquidEther.js"
import {
  SplashCursor,
  splashCursorOptionsFromSettings,
} from "../animations/splashCursor.js"
import { OceanFishEffect } from "../animations/oceanFish.js"
import { FloatingLinesEffect } from "../animations/floatingLines.js"
import { PixelBlastEffect } from "../animations/pixelBlast.js"
import { HyperspaceEffect } from "../animations/hyperspace.js"
import { GradientV2Effect } from "../animations/gradientV2.js"
import { PixelSnowEffect } from "../animations/pixelSnow.js"
import { SoftAuroraEffect } from "../animations/softAurora.js"
import { SilkEffect } from "../animations/silk.js"
import { LightPillarEffect } from "../animations/lightPillar.js"

function getExtensionVersion() {
  try {
    if (typeof chrome !== "undefined" && chrome.runtime?.getManifest) {
      return chrome.runtime.getManifest().version || ""
    }
  } catch {
    // Keep version empty outside extension context.
  }
  return ""
}

export function initSettings() {
  const settings = getSettings()
  if (DOM_EXPORTS.settingsVersion) {
    const version = getExtensionVersion()
    DOM_EXPORTS.settingsVersion.textContent = version ? `v${version}` : ""
  }

  const effectCountSpan = document.getElementById("count-effect")
  if (effectCountSpan) {
    const effectItemCount = document.querySelectorAll(".effect-item").length
    // Subtract 1 to exclude 'None' from the count
    effectCountSpan.textContent = `(${effectItemCount - 1})`
  }

  // Create effect instances
  const effects = {
    starFallEffect: new StarFall("effect-canvas", settings.starColor),
    firefliesEffect: new FirefliesEffect("effect-canvas"),
    networkEffect: new NetworkEffect(
      "effect-canvas",
      settings.networkColor || settings.accentColor,
    ),
    matrixRainEffect: new MatrixRain("effect-canvas", settings.matrixColor),
    auraEffect: new AuraEffect("effect-canvas", settings.auraColor),
    windEffect: new WindEffect("effect-canvas", settings.windMode || "2d"),
    hackerEffect: new HackerEffect("effect-canvas", settings.hackerColor),
    pixelCubesEffect: new PixelCubes(
      "effect-canvas",
      settings.pixelCubesColor,
      settings.pixelCubesShape,
    ),
    sakuraEffect: new SakuraEffect(
      "effect-canvas",
      settings.sakuraColor || "#ffb7c5",
    ),
    snowfallEffect: new SnowfallEffect(
      "effect-canvas",
      settings.snowfallColor || "#ffffff",
    ),
    snowfallHDEffect: new SnowfallHDEffect("effect-canvas"),
    auroraWaveEffect: new AuroraWaveEffect(
      "effect-canvas",
      settings.auroraWaveColor || "#00bcd4",
    ),
    northernLightsEffect: new NorthernLightsEffect("effect-canvas", {
      color: settings.northernLightsColor || "#00ff88",
      style: settings.northernLightsStyle || "hd",
      brightness: settings.northernLightsBrightness ?? 0.8,
    }),
    bubblesEffect: new BubblesEffect(
      "effect-canvas",
      settings.bubbleColor || "#60c8ff",
    ),
    cursorTrailEffect: new CursorTrailEffect(
      "effect-canvas",
      settings.cursorTrailColor || "#60c8ff",
      settings.cursorTrailClickExplosion !== false,
      settings.cursorTrailRandomColor === true,
      settings.cursorTrailStyle || "classic",
    ),
    flashlightEffect: new FlashlightEffect("effect-canvas", {
      color: settings.flashlightColor || "#000000",
      size: settings.flashlightSize || 150,
      opacity: settings.flashlightOpacity ?? 0.9,
    }),

    gridScanEffect: new GridScanEffect(
      "effect-canvas",
      settings.gridScanColor || "#00ffcc",
    ),
    rainHDEffect: new RainHDEffect(
      "effect-canvas",
      settings.rainHDColor || "#99ccff",
    ),
    stormRainEffect: new StormRainEffect(
      "effect-canvas",
      settings.stormRainColor || "#7dd3fc",
    ),
    rainbowEffect: new RainbowBackground(
      "effect-canvas",
      settings.rainbowDirection || "left",
    ),
    wavyLinesEffect: new WavyLinesEffect(
      "effect-canvas",
      settings.wavyLinesColor || "#00bcd4",
    ),
    oceanWaveEffect: new OceanWaveEffect(
      "effect-canvas",
      settings.oceanWaveColor || "#0077b6",
      settings.oceanWavePosition || "bottom",
    ),
    cloudDriftEffect: new CloudDriftEffect(
      "effect-canvas",
      settings.cloudDriftColor || "#0a0a0a",
    ),
    firefliesHDEffect: new FirefliesHD("effect-canvas"),
    autumnLeavesEffect: new AutumnLeavesEffect("effect-canvas"),
    greenLeavesEffect: new GreenLeavesEffect("effect-canvas"),
    fallingLeavesSettledEffect: new FallingLeavesSettledEffect(
      "effect-canvas",
      settings.fallingLeavesSkin || "maple",
    ),
    sunbeamEffect: new SunbeamEffect("effect-canvas", {
      color: settings.sunbeamColor || "#ffffff",
      angle: settings.sunbeamAngle ?? 0,
    }),
    lightPillarsEffect: new LightPillarsEffect("effect-canvas"),
    pixelWeatherEffect: new PixelWeatherEffect(
      "effect-canvas",
      settings.pixelWeatherStyle || "snow",
    ),
    shinyEffect: new ShinyEffect(
      "effect-canvas",
      settings.shinyColor || "#ff0000",
    ),
    lineShinyEffect: new LineShinyEffect(
      "effect-canvas",
      settings.lineShinyColor || "#ffffff",
    ),
    tetFireworksEffect: new TetFireworksEffect("effect-canvas", {}),
    reunificationDayEffect: new ReunificationDayEffect("effect-canvas", {}),
    halloweenEffect: new HalloweenEffect("effect-canvas", {}),
    skyLanternsEffect: new SkyLanternsEffect("effect-canvas", {
      type: settings.skyLanternsType || "lantern",
    }),
    pixelRunEffect: new PixelRunEffect(
      "effect-canvas",
      settings.pixelRunColor || "#00e5ff",
    ),

    nintendoPixelEffect: new NintendoPixelEffect(
      "effect-canvas",
      settings.nintendoPixelColor || "#63f5ff",
    ),
    retroGameEffect: new RetroGameEffect(
      "effect-canvas",
      settings.retroGameColor || "#00ff00",
      settings.retroGameType || "space_invaders",
    ),
    crtScanlinesEffect: new CrtScanlinesEffect("effect-canvas", {
      scanColor: settings.crtScanColor || "#7cffad",
      scanFrequency: settings.crtScanFrequency ?? 0.11,
      scanAngle: settings.crtScanAngle ?? 0,
      scanDensity: settings.crtScanDensity ?? 4,
      gamma: settings.crtGamma ?? 0.3,
      backgroundColor: settings.crtBackgroundColor || "#0a140f",
    }),
    meteorEffect: new MeteorEffect(
      "effect-canvas",
      settings.meteorColor || settings.starColor || "#ffffff",
    ),
    plantGrowthEffect: new PlantGrowthEffect(
      "effect-canvas",
      settings.plantGrowthColor || "#4caf50",
    ),
    oceanFishEffect: new OceanFishEffect(
      "effect-canvas",
      settings.oceanFishColor || "#ff7f50",
    ),
    floatingLinesEffect: new FloatingLinesEffect(
      "effect-canvas",
      settings.floatingLinesColor || "#ffffff",
      settings.floatingLinesAngle || 0,
    ),
    pixelBlastEffect: new PixelBlastEffect("effect-canvas", {
      variant: settings.pixelBlastVariant || "square",
      pixelSize: settings.pixelBlastSize || 15,
      color: settings.pixelBlastColor || "#B497CF",
      enableRipples: settings.pixelBlastRipples !== false,
      rippleSpeed: settings.pixelBlastRippleSpeed || 0.3,
      rippleThickness: settings.pixelBlastRippleThickness || 0.1,
      rippleIntensityScale: settings.pixelBlastRippleIntensity || 1,
      liquid: settings.pixelBlastLiquid !== false,
      liquidStrength: settings.pixelBlastLiquidStrength ?? 1.0,
      cursorRadius: settings.pixelBlastCursorRadius || 150,
      speed: settings.pixelBlastSpeed || 0.5,
      edgeFade: settings.pixelBlastEdgeFade || 0.2,
      transparent: settings.pixelBlastTransparent !== false,
      backgroundColor: settings.pixelBlastBgColor || "#0a0a0a",
    }),
    wavyPatternEffect: new WavyPatternEffect(
      settings.wavyPatternColor1 || "#AB3E5B",
      settings.wavyPatternColor2 || "#FFBE40",
    ),
    angledPatternEffect: new AngledPatternEffect(
      settings.angledPatternColor1 || "#ECD078",
      settings.angledPatternColor2 || "#0B486B",
    ),
    jellyfishEffect: new Jellyfish(
      "effect-canvas",
      settings.jellyfishColor || "#ffaa00",
      settings.jellyfishType || "jellyfish",
    ),
    hyperspaceEffect: new HyperspaceEffect(
      "effect-canvas",
      settings.accentColor,
    ),
    pixelSnowHQEffect: new PixelSnowEffect("pixel-snow-hq-canvas", {
      color: settings.pixelSnowHQColor,
      flakeSize: settings.pixelSnowHQFlakeSize,
      minFlakeSize: settings.pixelSnowHQMinFlakeSize,
      pixelResolution: settings.pixelSnowHQPixelResolution,
      speed: settings.pixelSnowHQSpeed,
      depthFade: settings.pixelSnowHQDepthFade,
      farPlane: settings.pixelSnowHQFarPlane,
      brightness: settings.pixelSnowHQBrightness,
      gamma: settings.pixelSnowHQGamma,
      density: settings.pixelSnowHQDensity,
      variant: settings.pixelSnowHQVariant,
      direction: settings.pixelSnowHQDirection,
    }),
    gradientV2Effect: new GradientV2Effect("gradient-v2-canvas", {
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
    }),
    softAuroraEffect: new SoftAuroraEffect("soft-aurora-canvas", {
      speed: settings.softAuroraSpeed,
      scale: settings.softAuroraScale,
      brightness: settings.softAuroraBrightness,
      color1: settings.softAuroraColor1,
      color2: settings.softAuroraColor2,
      noiseFrequency: settings.softAuroraNoiseFreq,
      bandHeight: settings.softAuroraBandHeight,
      bandSpread: settings.softAuroraBandSpread,
      enableMouseInteraction: settings.softAuroraEnableMouse,
    }),
    silkEffect: new SilkEffect("silk-canvas", {
      color: settings.silkColor,
      speed: settings.silkSpeed,
      scale: settings.silkScale,
      noise: settings.silkNoise,
      rotation: settings.silkRotation,
    }),
    liquidEtherEffect: new LiquidEther("liquid-ether-canvas"),
    splashCursorEffect: new SplashCursor(
      "splash-cursor-canvas",
      splashCursorOptionsFromSettings(settings),
    ),
    lightPillarEffect: new LightPillarEffect("light-pillar-canvas", {
      topColor: settings.lightPillarTopColor,
      bottomColor: settings.lightPillarBottomColor,
      intensity: settings.lightPillarIntensity,
      rotationSpeed: settings.lightPillarRotationSpeed,
      glowAmount: settings.lightPillarGlowAmount,
      pillarWidth: settings.lightPillarWidth,
      pillarHeight: settings.lightPillarHeight,
      noiseIntensity: settings.lightPillarNoiseIntensity,
      pillarRotation: settings.lightPillarRotation,
    }),
    svgWaveEffect: new SvgWaveGenerator(),
  }

  // Build utilities context
  const ctx = {
    effects,
    DOM: DOM_EXPORTS,
    localBackgrounds,
    i18n: geti18n(),
  }

  async function handleSettingUpdate(
    key,
    value,
    isGradient = false,
    skipSave = false,
  ) {
    if (isGradient) {
      updateSetting("gradientStart", value.start)
      updateSetting("gradientEnd", value.end)
      updateSetting("gradientAngle", value.angle)
      updateSetting("gradientType", value.type || "linear")
      updateSetting("gradientRepeating", value.repeating === true)
      updateSetting(
        "gradientExtraColorCount",
        Math.min(5, Math.max(1, Number(value.extraColorCount) || 2)),
      )
      updateSetting(
        "gradientCustomColors",
        typeof value.customColors === "string" ? value.customColors : "",
      )
      updateSetting("gradientPosition", value.position || "center")
      updateSetting("gradientRadialShape", value.radialShape || "circle")
      updateSetting("activeBgUid", value.uid || null)
      updateSetting("background", null)
      updateSetting("multiColorActive", false)
      updateSetting("svgWaveActive", false)
      updateSetting("gradientV2Active", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("liquidEtherActive", false)
      updateSetting("splashCursorActive", false)
    } else {
      updateSetting(key, value)
      if (key === "background") {
        if (value != null) {
          updateSetting("activeBgUid", null)
          updateSetting("svgWaveActive", false)
          updateSetting("gradientV2Active", false)
          updateSetting("silkActive", false)
          updateSetting("lightPillarActive", false)
          updateSetting("liquidEtherActive", false)
          updateSetting("splashCursorActive", false)
        }
        // Clear Unsplash credit if we switch to a different background
        // that isn't an Unsplash image (managed in unsplashFetcher.js)
        if (!String(value).includes("unsplash")) {
          updateSetting("unsplashLastCredit", null)
          if (DOM_EXPORTS.unsplashCredit) {
            DOM_EXPORTS.unsplashCredit.style.display = "none"
            DOM_EXPORTS.unsplashCredit.innerHTML = ""
          }
        }
      }
    }

    // Trigger re-renders for galleries to show active state
    setTimeout(() => {
      renderUserGradients(DOM_EXPORTS)
      renderSavedMultiColors(DOM_EXPORTS)
      renderLocalBackgrounds(DOM_EXPORTS)
    }, 0)

    // Clear active theme if a themeable setting is changed manually
    const currentSettings = getSettings()
    if (
      currentSettings.theme &&
      key !== "theme" &&
      (isGradient || THEMEABLE_KEYS.includes(key))
    ) {
      updateSetting("theme", null)
      // We need to update UI as well
      const themeItems = document.querySelectorAll("#themes-grid .theme-item")
      themeItems.forEach((item) => item.classList.remove("active"))
    }

    if (!skipSave) {
      saveSettings()
    }

    // Avoid expensive gallery rerenders for unrelated toggles (e.g. clock/date).
    const shouldRefreshBackgroundGalleries =
      isGradient ||
      key === "background" ||
      key === "svgWaveActive" ||
      key === "gradientV2Active" ||
      key === "silkActive" ||
      key === "lightPillarActive" ||
      key === "liquidEtherActive" ||
      key === "splashCursorActive"
    if (shouldRefreshBackgroundGalleries) {
      renderLocalBackgrounds(DOM_EXPORTS, handleSettingUpdate)
      renderUserGradients(DOM_EXPORTS)
      renderUserSvgWaves(DOM_EXPORTS, effects.svgWaveEffect, () => {
        handleSettingUpdate("svgWaveActive", true)
      })
      renderUserGradientV2s(DOM_EXPORTS)
      renderUserSilks()
      renderUserLightPillars()
      renderUserLiquidEthers()
      renderSavedMultiColors(DOM_EXPORTS)
    }

    // Mutual exclusivity
    if (key === "gradientV2Active" && value === true) {
      updateSetting("background", null)
      updateSetting("svgWaveActive", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("liquidEtherActive", false)
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.svgWaveActive) DOM_EXPORTS.svgWaveActive.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      if (DOM_EXPORTS.lightPillarActive) DOM_EXPORTS.lightPillarActive.checked = false
      if (DOM_EXPORTS.liquidEtherActive) DOM_EXPORTS.liquidEtherActive.checked = false
      if (DOM_EXPORTS.splashCursorActive) DOM_EXPORTS.splashCursorActive.checked = false
    }
    if (key === "svgWaveActive" && value === true) {
      updateSetting("background", null)
      updateSetting("gradientV2Active", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("liquidEtherActive", false)
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.gradientV2Active) DOM_EXPORTS.gradientV2Active.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      if (DOM_EXPORTS.lightPillarActive) DOM_EXPORTS.lightPillarActive.checked = false
      if (DOM_EXPORTS.liquidEtherActive) DOM_EXPORTS.liquidEtherActive.checked = false
      if (DOM_EXPORTS.splashCursorActive) DOM_EXPORTS.splashCursorActive.checked = false
    }
    if (key === "silkActive" && value === true) {
      updateSetting("background", null)
      updateSetting("gradientV2Active", false)
      updateSetting("svgWaveActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("liquidEtherActive", false)
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.gradientV2Active) DOM_EXPORTS.gradientV2Active.checked = false
      if (DOM_EXPORTS.svgWaveActive) DOM_EXPORTS.svgWaveActive.checked = false
      if (DOM_EXPORTS.lightPillarActive) DOM_EXPORTS.lightPillarActive.checked = false
      if (DOM_EXPORTS.liquidEtherActive) DOM_EXPORTS.liquidEtherActive.checked = false
      if (DOM_EXPORTS.splashCursorActive) DOM_EXPORTS.splashCursorActive.checked = false
    }
    if (key === "lightPillarActive" && value === true) {
      updateSetting("background", null)
      updateSetting("gradientV2Active", false)
      updateSetting("svgWaveActive", false)
      updateSetting("silkActive", false)
      updateSetting("liquidEtherActive", false)
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.gradientV2Active) DOM_EXPORTS.gradientV2Active.checked = false
      if (DOM_EXPORTS.svgWaveActive) DOM_EXPORTS.svgWaveActive.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      if (DOM_EXPORTS.liquidEtherActive) DOM_EXPORTS.liquidEtherActive.checked = false
      if (DOM_EXPORTS.splashCursorActive) DOM_EXPORTS.splashCursorActive.checked = false
    }
    if (key === "liquidEtherActive" && value === true) {
      updateSetting("background", null)
      updateSetting("gradientV2Active", false)
      updateSetting("svgWaveActive", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.gradientV2Active) DOM_EXPORTS.gradientV2Active.checked = false
      if (DOM_EXPORTS.svgWaveActive) DOM_EXPORTS.svgWaveActive.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      if (DOM_EXPORTS.lightPillarActive) DOM_EXPORTS.lightPillarActive.checked = false
      if (DOM_EXPORTS.splashCursorActive) DOM_EXPORTS.splashCursorActive.checked = false
    }
    if (key === "splashCursorActive" && value === true) {
      updateSetting("background", null)
      updateSetting("gradientV2Active", false)
      updateSetting("svgWaveActive", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("liquidEtherActive", false)
      if (DOM_EXPORTS.gradientV2Active) DOM_EXPORTS.gradientV2Active.checked = false
      if (DOM_EXPORTS.svgWaveActive) DOM_EXPORTS.svgWaveActive.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      if (DOM_EXPORTS.lightPillarActive) DOM_EXPORTS.lightPillarActive.checked = false
      if (DOM_EXPORTS.liquidEtherActive) DOM_EXPORTS.liquidEtherActive.checked = false
    }
    if (key === "background" && value != null) {
      updateSetting("gradientV2Active", false)
      updateSetting("svgWaveActive", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("liquidEtherActive", false)
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.gradientV2Active) DOM_EXPORTS.gradientV2Active.checked = false
      if (DOM_EXPORTS.svgWaveActive) DOM_EXPORTS.svgWaveActive.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      if (DOM_EXPORTS.lightPillarActive) DOM_EXPORTS.lightPillarActive.checked = false
      if (DOM_EXPORTS.liquidEtherActive) DOM_EXPORTS.liquidEtherActive.checked = false
      if (DOM_EXPORTS.splashCursorActive) DOM_EXPORTS.splashCursorActive.checked = false
    }
    if (isGradient) {
      updateSetting("gradientV2Active", false)
      updateSetting("svgWaveActive", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      updateSetting("liquidEtherActive", false)
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.gradientV2Active) DOM_EXPORTS.gradientV2Active.checked = false
      if (DOM_EXPORTS.svgWaveActive) DOM_EXPORTS.svgWaveActive.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      if (DOM_EXPORTS.lightPillarActive) DOM_EXPORTS.lightPillarActive.checked = false
      if (DOM_EXPORTS.liquidEtherActive) DOM_EXPORTS.liquidEtherActive.checked = false
      if (DOM_EXPORTS.splashCursorActive) DOM_EXPORTS.splashCursorActive.checked = false
    }
    if (key === "effect" && value !== "none") {
      updateSetting("gradientV2Active", false)
      if (DOM_EXPORTS.gradientV2Active)
        DOM_EXPORTS.gradientV2Active.checked = false
      updateSetting("silkActive", false)
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      updateSetting("lightPillarActive", false)
      if (DOM_EXPORTS.lightPillarActive)
        DOM_EXPORTS.lightPillarActive.checked = false
      updateSetting("liquidEtherActive", false)
      if (DOM_EXPORTS.liquidEtherActive)
        DOM_EXPORTS.liquidEtherActive.checked = false
      updateSetting("splashCursorActive", false)
      if (DOM_EXPORTS.splashCursorActive)
        DOM_EXPORTS.splashCursorActive.checked = false
    }

    applySettings()
  }

  ctx.handleSettingUpdate = handleSettingUpdate

  // Expose for global access (e.g. from context menu)
  window.appHandleSettingUpdate = handleSettingUpdate

  // Bridge shared helpers expected by settingsApplier/updateSettingsInputs.
  effects.DOM = DOM_EXPORTS
  effects.localBackgrounds = localBackgrounds
  effects.handleSettingUpdate = handleSettingUpdate
  effects.renderFontGrid = () => {
    renderFontGrid(DOM_EXPORTS.fontGrid, handleSettingUpdate)
  }

  effects.renderTabIconPreview = renderTabIconPreview
  effects.updateWaveColorPreviews = (settingsState) =>
    updateWaveColorPreviews(
      settingsState,
      DOM_EXPORTS.svgWaveStartPreview,
      DOM_EXPORTS.svgWaveEndPreview,
    )

  // Create core functions
  const applySettings = createApplySettings(effects)
  const updateSettingsInputs = createUpdateSettingsInputs(effects)
  effects.updateSettingsInputs = updateSettingsInputs

  ctx.applySettings = applySettings
  ctx.updateSettingsInputs = updateSettingsInputs

  // Initialize Gradient V2 Manager
  initGradientV2Manager(DOM_EXPORTS, effects.gradientV2Effect, (k, v) => {
    handleSettingUpdate(k, v)
  })

  // Initialize Special Effects Manager (Silk, Light Pillar, Liquid Ether)
  initSpecialEffectsManager(ctx, handleSettingUpdate)

  // Initialize Multi-Color Manager
  setupMultiColorManager(applySettings)

  // Handle special effect preset application
  window.addEventListener("specialEffectPresetApplied", (e) => {
    const { type } = e.detail
    if (type === "silk") handleSettingUpdate("silkActive", true)
    else if (type === "light-pillar")
      handleSettingUpdate("lightPillarActive", true)
    else if (type === "liquid-ether")
      handleSettingUpdate("liquidEtherActive", true)
  })

  // Initial rendering for all background galleries
  renderLocalBackgrounds(DOM_EXPORTS, handleSettingUpdate)
  renderUserColors(DOM_EXPORTS)
  renderUserGradients(DOM_EXPORTS)
  renderUserSvgWaves(DOM_EXPORTS, effects.svgWaveEffect, () => {
    handleSettingUpdate("svgWaveActive", true)
  })
  renderUserGradientV2s(DOM_EXPORTS)
  renderUserSilks()
  renderUserLightPillars()
  renderUserLiquidEthers()
  renderSavedMultiColors(DOM_EXPORTS)
  populateUnsplashCollections(DOM_EXPORTS.unsplashCategorySelect, settings)

  // Initialize multi-select modes and file uploads
  setupMultiSelectMode(DOM_EXPORTS, handleSettingUpdate)
  setupGradientMultiSelect(DOM_EXPORTS)
  setupSvgWaveMultiSelect(DOM_EXPORTS, effects.svgWaveEffect)
  setupFileUploads(DOM_EXPORTS, handleSettingUpdate)

  // Initialize Effect Color Handlers
  effects.getSettings = getSettings
  setupEffectColorHandlers(DOM_EXPORTS, effects)

  // Initialize Theme Manager
  initThemeManager(DOM_EXPORTS, handleSettingUpdate, updateSettingsInputs)

  // Initialize all general event handlers
  setupGeneralEventHandlers(
    ctx,
    handleSettingUpdate,
    applySettings,
    updateSettingsInputs,
  )

  // Expose applySettings globally so it can be re-run after heavy async ops like preloadImages
  window.appApplySettings = () => {
    applySettings()
    refreshBackgroundGalleries()
  }

  function refreshBackgroundGalleries() {
    renderLocalBackgrounds(DOM_EXPORTS, handleSettingUpdate)
    renderUserColors(DOM_EXPORTS)
    renderUserGradients(DOM_EXPORTS)
    renderUserSvgWaves(DOM_EXPORTS, effects.svgWaveEffect, () => {
      handleSettingUpdate("svgWaveActive", true)
    })
    renderUserGradientV2s(DOM_EXPORTS)
    renderUserSilks()
    renderUserLightPillars()
    renderUserLiquidEthers()
    renderSavedMultiColors(DOM_EXPORTS)
  }

  const GROUP_EXPANDED_KEY_PREFIX = "settingsGroupExpanded:"
  document
    .querySelectorAll(".setting-group.collapsible-group")
    .forEach((group) => {
      const header = group.querySelector(".group-header")
      const groupId = group.id || group.dataset.groupId

      if (groupId) {
        const saved = localStorage.getItem(
          `${GROUP_EXPANDED_KEY_PREFIX}${groupId}`,
        )
        if (saved === "1") {
          group.classList.add("expanded")
        } else if (saved === "0") {
          group.classList.remove("expanded")
        }
      }

      if (header) {
        header.addEventListener("click", () => {
          const isExpanded = group.classList.toggle("expanded")
          if (groupId) {
            localStorage.setItem(
              `${GROUP_EXPANDED_KEY_PREFIX}${groupId}`,
              isExpanded ? "1" : "0",
            )
          }
        })
      }
    })

  // Pixel Snow HQ
  if (DOM_EXPORTS.pixelSnowHQColorPicker) {
    DOM_EXPORTS.pixelSnowHQColorPicker.addEventListener("change", (e) => {
      handleSettingUpdate("pixelSnowHQColor", e.target.value)
    })
  }

  const hqSnowProps = [
    {
      id: "pixelSnowHQFlakeSize",
      dom: DOM_EXPORTS.pixelSnowHQFlakeSizeSlider,
      val: DOM_EXPORTS.pixelSnowHQFlakeSizeVal,
      type: "float",
    },
    {
      id: "pixelSnowHQMinFlakeSize",
      dom: DOM_EXPORTS.pixelSnowHQMinFlakeSizeSlider,
      val: DOM_EXPORTS.pixelSnowHQMinFlakeSizeVal,
      type: "float",
    },
    {
      id: "pixelSnowHQDensity",
      dom: DOM_EXPORTS.pixelSnowHQDensitySlider,
      val: DOM_EXPORTS.pixelSnowHQDensityVal,
      type: "float",
    },
    {
      id: "pixelSnowHQSpeed",
      dom: DOM_EXPORTS.pixelSnowHQSpeedSlider,
      val: DOM_EXPORTS.pixelSnowHQSpeedVal,
      type: "float",
    },
    {
      id: "pixelSnowHQPixelResolution",
      dom: DOM_EXPORTS.pixelSnowHQPixelResSlider,
      val: DOM_EXPORTS.pixelSnowHQPixelResVal,
      type: "int",
    },
    {
      id: "pixelSnowHQDepthFade",
      dom: DOM_EXPORTS.pixelSnowHQDepthFadeSlider,
      val: DOM_EXPORTS.pixelSnowHQDepthFadeVal,
      type: "float",
    },
    {
      id: "pixelSnowHQFarPlane",
      dom: DOM_EXPORTS.pixelSnowHQFarPlaneSlider,
      val: DOM_EXPORTS.pixelSnowHQFarPlaneVal,
      type: "int",
    },
    {
      id: "pixelSnowHQBrightness",
      dom: DOM_EXPORTS.pixelSnowHQBrightnessSlider,
      val: DOM_EXPORTS.pixelSnowHQBrightnessVal,
      type: "float",
    },
    {
      id: "pixelSnowHQGamma",
      dom: DOM_EXPORTS.pixelSnowHQGammaSlider,
      val: DOM_EXPORTS.pixelSnowHQGammaVal,
      type: "float",
    },
    {
      id: "pixelSnowHQDirection",
      dom: DOM_EXPORTS.pixelSnowHQDirectionSlider,
      val: DOM_EXPORTS.pixelSnowHQDirectionVal,
      type: "int",
      suffix: "°",
    },
  ]

  hqSnowProps.forEach((prop) => {
    if (prop.dom) {
      prop.dom.addEventListener("input", (e) => {
        const val =
          prop.type === "float"
            ? parseFloat(e.target.value)
            : parseInt(e.target.value)
        if (prop.val)
          prop.val.textContent =
            prop.type === "float"
              ? val.toFixed(prop.id.includes("Size") ? 3 : 2)
              : val + (prop.suffix || "")
        updateSetting(prop.id, val)

        // Live update for performance (avoid full applySettings)
        if (settings.effect === "pixelSnowHQ" && effects.pixelSnowHQEffect) {
          const optKey =
            prop.id.replace("pixelSnowHQ", "").charAt(0).toLowerCase() +
            prop.id.replace("pixelSnowHQ", "").slice(1)
          effects.pixelSnowHQEffect.setOptions({ [optKey]: val })
        }
      })
      // Save only on mouse up/change to reduce disk/storage IO
      prop.dom.addEventListener("change", () => saveSettings())
    }
  })

  if (DOM_EXPORTS.pixelSnowHQVariantSelect) {
    DOM_EXPORTS.pixelSnowHQVariantSelect.addEventListener("change", (e) => {
      const val = e.target.value
      handleSettingUpdate("pixelSnowHQVariant", val)
      if (effects.pixelSnowHQEffect) {
        effects.pixelSnowHQEffect.setOptions({ variant: val })
      }
    })
  }

  // Soft Aurora
  if (DOM_EXPORTS.softAuroraColor1Picker) {
    DOM_EXPORTS.softAuroraColor1Picker.addEventListener("change", (e) => {
      handleSettingUpdate("softAuroraColor1", e.target.value)
      if (effects.softAuroraEffect)
        effects.softAuroraEffect.setOptions({ color1: e.target.value })
    })
  }
  if (DOM_EXPORTS.softAuroraColor2Picker) {
    DOM_EXPORTS.softAuroraColor2Picker.addEventListener("change", (e) => {
      handleSettingUpdate("softAuroraColor2", e.target.value)
      if (effects.softAuroraEffect)
        effects.softAuroraEffect.setOptions({ color2: e.target.value })
    })
  }

  const softAuroraProps = [
    {
      id: "softAuroraSpeed",
      dom: DOM_EXPORTS.softAuroraSpeedSlider,
      val: DOM_EXPORTS.softAuroraSpeedVal,
      type: "float",
    },
    {
      id: "softAuroraScale",
      dom: DOM_EXPORTS.softAuroraScaleSlider,
      val: DOM_EXPORTS.softAuroraScaleVal,
      type: "float",
    },
    {
      id: "softAuroraBrightness",
      dom: DOM_EXPORTS.softAuroraBrightnessSlider,
      val: DOM_EXPORTS.softAuroraBrightnessVal,
      type: "float",
    },
    {
      id: "softAuroraNoiseFreq",
      dom: DOM_EXPORTS.softAuroraNoiseFreqSlider,
      val: DOM_EXPORTS.softAuroraNoiseFreqVal,
      type: "float",
    },
    {
      id: "softAuroraBandHeight",
      dom: DOM_EXPORTS.softAuroraBandHeightSlider,
      val: DOM_EXPORTS.softAuroraBandHeightVal,
      type: "float",
    },
    {
      id: "softAuroraBandSpread",
      dom: DOM_EXPORTS.softAuroraBandSpreadSlider,
      val: DOM_EXPORTS.softAuroraBandSpreadVal,
      type: "float",
    },
  ]

  softAuroraProps.forEach((prop) => {
    if (prop.dom) {
      prop.dom.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value)
        if (prop.val)
          prop.val.textContent = val.toFixed(
            prop.id.includes("Height") || prop.id.includes("Decay") ? 2 : 1,
          )
        updateSetting(prop.id, val)

        if (settings.effect === "softAurora" && effects.softAuroraEffect) {
          const optKey =
            prop.id.replace("softAurora", "").charAt(0).toLowerCase() +
            prop.id.replace("softAurora", "").slice(1)
          let mappedKey = optKey
          if (optKey === "noiseFreq") mappedKey = "noiseFrequency"
          if (optKey === "noiseAmp") mappedKey = "noiseAmplitude"
          effects.softAuroraEffect.setOptions({ [mappedKey]: val })
        }
      })
      prop.dom.addEventListener("change", () => saveSettings())
    }
  })

  // Add the remaining new props (Octave, Layer, ColorSpeed, MouseInfluence)
  const softAuroraExtraProps = [
    {
      id: "softAuroraNoiseAmp",
      dom: DOM_EXPORTS.softAuroraNoiseAmpSlider,
      val: DOM_EXPORTS.softAuroraNoiseAmpVal,
      type: "float",
    },
    {
      id: "softAuroraOctaveDecay",
      dom: DOM_EXPORTS.softAuroraOctaveDecaySlider,
      val: DOM_EXPORTS.softAuroraOctaveDecayVal,
      type: "float",
    },
    {
      id: "softAuroraLayerOffset",
      dom: DOM_EXPORTS.softAuroraLayerOffsetSlider,
      val: DOM_EXPORTS.softAuroraLayerOffsetVal,
      type: "float",
    },
    {
      id: "softAuroraColorSpeed",
      dom: DOM_EXPORTS.softAuroraColorSpeedSlider,
      val: DOM_EXPORTS.softAuroraColorSpeedVal,
      type: "float",
    },
    {
      id: "softAuroraMouseInfluence",
      dom: DOM_EXPORTS.softAuroraMouseInfluenceSlider,
      val: DOM_EXPORTS.softAuroraMouseInfluenceVal,
      type: "float",
    },
  ]

  softAuroraExtraProps.forEach((prop) => {
    if (prop.dom) {
      prop.dom.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value)
        if (prop.val)
          prop.val.textContent = val.toFixed(prop.id.includes("Decay") ? 2 : 1)
        updateSetting(prop.id, val)

        if (settings.effect === "softAurora" && effects.softAuroraEffect) {
          const optKey =
            prop.id.replace("softAurora", "").charAt(0).toLowerCase() +
            prop.id.replace("softAurora", "").slice(1)
          let mappedKey = optKey
          if (optKey === "noiseAmp") mappedKey = "noiseAmplitude"
          effects.softAuroraEffect.setOptions({ [mappedKey]: val })
        }
      })
      prop.dom.addEventListener("change", () => saveSettings())
    }
  })

  if (DOM_EXPORTS.softAuroraMouseCheckbox) {
    DOM_EXPORTS.softAuroraMouseCheckbox.addEventListener("change", (e) => {
      handleSettingUpdate("softAuroraEnableMouse", e.target.checked)
      if (effects.softAuroraEffect)
        effects.softAuroraEffect.setOptions({
          enableMouseInteraction: e.target.checked,
        })
    })
  }

  if (DOM_EXPORTS.softAuroraTransparentCheckbox) {
    DOM_EXPORTS.softAuroraTransparentCheckbox.addEventListener(
      "change",
      (e) => {
        const isTransparent = e.target.checked
        handleSettingUpdate("softAuroraTransparent", isTransparent)
        if (DOM_EXPORTS.softAuroraBgColorContainer) {
          DOM_EXPORTS.softAuroraBgColorContainer.style.display = isTransparent
            ? "none"
            : "block"
        }
        if (effects.softAuroraEffect)
          effects.softAuroraEffect.setOptions({ transparent: isTransparent })
      },
    )
  }

  if (DOM_EXPORTS.softAuroraBgColorPicker) {
    DOM_EXPORTS.softAuroraBgColorPicker.addEventListener("change", (e) => {
      handleSettingUpdate("softAuroraBackgroundColor", e.target.value)
      if (effects.softAuroraEffect)
        effects.softAuroraEffect.setOptions({ backgroundColor: e.target.value })
    })
  }

  // Effect resolution sync fix
  if (settings.effect === "pixelSnowHQ") {
    handleSettingUpdate(
      "pixelSnowHQPixelResolution",
      settings.pixelSnowHQPixelResolution || 200,
      false,
      true,
    )
  }

  // Animated Backgrounds Collapsible Group
  const animatedBgHeader = document.getElementById("animated-backgrounds-header")
  if (animatedBgHeader) {
    animatedBgHeader.addEventListener("click", () => {
      const section = animatedBgHeader.parentElement
      setTimeout(() => {
        const isExpanded = !section.classList.contains("collapsed")
        if (isExpanded) {
          renderUserGradientV2s(DOM_EXPORTS)
          renderUserSilks()
          renderUserLightPillars()
          renderUserLiquidEthers()
        }
      }, 50)
    })
    
    // Auto-expand if any effect within this group is active
    const isAnyActive = settings.silkActive || settings.lightPillarActive || settings.liquidEtherActive || settings.splashCursorActive || settings.gradientV2Active
    if (isAnyActive) {
        const section = animatedBgHeader.parentElement
        section.classList.remove("collapsed")
        
        // Initial render for active state
        setTimeout(() => {
            renderUserGradientV2s(DOM_EXPORTS)
            renderUserSilks()
            renderUserLightPillars()
            renderUserLiquidEthers()
        }, 100)
    }
  }

  // Initial render for Liquid Ether gallery
  renderUserLiquidEthers()

  applySettings()
}
