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
import { setupEffectColorHandlers } from "./effectColorHandlers.js"
import { setupMultiColorManager } from "./multiColorManager.js"
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
      updateSetting("background", null)
      updateSetting("svgWaveActive", false)
      updateSetting("gradientV2Active", false)
      updateSetting("silkActive", false)
    } else {
      updateSetting(key, value)
      if (key === "background") {
        if (value != null) {
          updateSetting("svgWaveActive", false)
          updateSetting("gradientV2Active", false)
          updateSetting("silkActive", false)
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
      key === "silkActive"
    if (shouldRefreshBackgroundGalleries) {
      renderLocalBackgrounds(DOM_EXPORTS, handleSettingUpdate)
      renderUserGradients(DOM_EXPORTS)
      renderUserSvgWaves(DOM_EXPORTS, effects.svgWaveEffect, () => {
        handleSettingUpdate("svgWaveActive", true)
      })
      renderUserGradientV2s(DOM_EXPORTS)
      const { renderSavedMultiColors } = await import("./multiColorManager.js")
      renderSavedMultiColors(DOM_EXPORTS)
    }

    // Mutual exclusivity
    if (key === "gradientV2Active" && value === true) {
      updateSetting("background", null)
      updateSetting("svgWaveActive", false)
      updateSetting("silkActive", false)
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      const svgCheckbox = document.getElementById("svg-wave-active")
      if (svgCheckbox) svgCheckbox.checked = false
    }
    if (key === "svgWaveActive" && value === true) {
      updateSetting("background", null)
      updateSetting("gradientV2Active", false)
      updateSetting("silkActive", false)
      updateSetting("lightPillarActive", false)
      if (DOM_EXPORTS.gradientV2Active)
        DOM_EXPORTS.gradientV2Active.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
      if (DOM_EXPORTS.lightPillarActive)
        DOM_EXPORTS.lightPillarActive.checked = false
    }
    if (key === "silkActive" && value === true) {
      updateSetting("background", null)
      updateSetting("gradientV2Active", false)
      updateSetting("svgWaveActive", false)
      updateSetting("lightPillarActive", false)
      if (DOM_EXPORTS.gradientV2Active)
        DOM_EXPORTS.gradientV2Active.checked = false
      const svgCheckbox = document.getElementById("svg-wave-active")
      if (svgCheckbox) svgCheckbox.checked = false
      if (DOM_EXPORTS.lightPillarActive)
        DOM_EXPORTS.lightPillarActive.checked = false
    }
    if (key === "lightPillarActive" && value === true) {
      updateSetting("background", null)
      updateSetting("gradientV2Active", false)
      updateSetting("svgWaveActive", false)
      updateSetting("silkActive", false)
      if (DOM_EXPORTS.gradientV2Active)
        DOM_EXPORTS.gradientV2Active.checked = false
      const svgCheckbox = document.getElementById("svg-wave-active")
      if (svgCheckbox) svgCheckbox.checked = false
      if (DOM_EXPORTS.silkActive) DOM_EXPORTS.silkActive.checked = false
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

  // Initialize Gradient V2 Manager
  initGradientV2Manager(DOM_EXPORTS, effects.gradientV2Effect, (k, v) => {
    handleSettingUpdate(k, v)
  })

  // Create core functions
  const applySettings = createApplySettings(effects)
  const updateSettingsInputs = createUpdateSettingsInputs(effects)
  effects.updateSettingsInputs = updateSettingsInputs

  ctx.applySettings = applySettings
  ctx.updateSettingsInputs = updateSettingsInputs

  // Expose applySettings globally so it can be re-run after heavy async ops like preloadImages
  window.appApplySettings = applySettings
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

  // Silk Effect setup
  if (DOM_EXPORTS.silkToggleBtn) {
    DOM_EXPORTS.silkToggleBtn.addEventListener("click", () => {
      const isHidden = DOM_EXPORTS.silkSettings.style.display === "none"
      DOM_EXPORTS.silkSettings.style.display = isHidden ? "block" : "none"
      DOM_EXPORTS.silkToggleBtn.classList.toggle("active", isHidden)
      DOM_EXPORTS.silkToggleLabel.textContent = isHidden
        ? "Close Silk"
        : "Open Silk"
    })
  }

  if (DOM_EXPORTS.silkRandomBtn) {
    DOM_EXPORTS.silkRandomBtn.addEventListener("click", () => {
      const randomHex = () =>
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0")
      const randomSpeed = parseFloat((Math.random() * 15 + 1).toFixed(1))
      const randomScale = parseFloat((Math.random() * 3 + 0.5).toFixed(1))
      const randomNoise = parseFloat((Math.random() * 4 + 0.5).toFixed(1))
      const randomRotation = Math.floor(Math.random() * 360)

      handleSettingUpdate("silkColor", randomHex())
      handleSettingUpdate("silkSpeed", randomSpeed)
      handleSettingUpdate("silkScale", randomScale)
      handleSettingUpdate("silkNoise", randomNoise)
      handleSettingUpdate("silkRotation", randomRotation)

      if (DOM_EXPORTS.silkColor)
        DOM_EXPORTS.silkColor.value = getSettings().silkColor
      if (DOM_EXPORTS.silkSpeed) {
        DOM_EXPORTS.silkSpeed.value = randomSpeed
        DOM_EXPORTS.silkSpeedValue.textContent = randomSpeed.toFixed(1)
      }
      if (DOM_EXPORTS.silkScale) {
        DOM_EXPORTS.silkScale.value = randomScale
        DOM_EXPORTS.silkScaleValue.textContent = randomScale.toFixed(1)
      }
      if (DOM_EXPORTS.silkNoise) {
        DOM_EXPORTS.silkNoise.value = randomNoise
        DOM_EXPORTS.silkNoiseValue.textContent = randomNoise.toFixed(1)
      }
      if (DOM_EXPORTS.silkRotation) {
        DOM_EXPORTS.silkRotation.value = randomRotation
        DOM_EXPORTS.silkRotationValue.textContent = randomRotation
      }

      if (effects.silkEffect) {
        effects.silkEffect.setOptions({
          color: getSettings().silkColor,
          speed: randomSpeed,
          scale: randomScale,
          noise: randomNoise,
          rotation: randomRotation,
        })
      }
    })
  }

  if (DOM_EXPORTS.silkActive) {
    // Sync initial state
    DOM_EXPORTS.silkActive.checked = settings.silkActive === true
    DOM_EXPORTS.silkActive.addEventListener("change", (e) => {
      handleSettingUpdate("silkActive", e.target.checked)
    })
  }

  if (DOM_EXPORTS.silkColor) {
    DOM_EXPORTS.silkColor.value = settings.silkColor || "#7B7481"
    DOM_EXPORTS.silkColor.addEventListener("change", (e) => {
      handleSettingUpdate("silkColor", e.target.value)
      if (effects.silkEffect)
        effects.silkEffect.setOptions({ color: e.target.value })
    })
  }

  const silkProps = [
    {
      id: "silkSpeed",
      dom: DOM_EXPORTS.silkSpeed,
      val: DOM_EXPORTS.silkSpeedValue,
    },
    {
      id: "silkScale",
      dom: DOM_EXPORTS.silkScale,
      val: DOM_EXPORTS.silkScaleValue,
    },
    {
      id: "silkNoise",
      dom: DOM_EXPORTS.silkNoise,
      val: DOM_EXPORTS.silkNoiseValue,
    },
    {
      id: "silkRotation",
      dom: DOM_EXPORTS.silkRotation,
      val: DOM_EXPORTS.silkRotationValue,
    },
  ]

  silkProps.forEach((prop) => {
    if (prop.dom) {
      if (settings[prop.id] !== undefined) {
        prop.dom.value = settings[prop.id]
        if (prop.val)
          prop.val.textContent = parseFloat(settings[prop.id]).toFixed(1)
      }
      prop.dom.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value)
        if (prop.val) prop.val.textContent = val.toFixed(1)
        updateSetting(prop.id, val)
        if (effects.silkEffect) {
          const optKey = prop.id.replace("silk", "").toLowerCase()
          effects.silkEffect.setOptions({ [optKey]: val })
        }
      })
      prop.dom.addEventListener("change", () => saveSettings())
    }
  })

  // Light Pillar Effect setup
  if (DOM_EXPORTS.lightPillarToggleBtn) {
    DOM_EXPORTS.lightPillarToggleBtn.addEventListener("click", () => {
      const isHidden = DOM_EXPORTS.lightPillarSettings.style.display === "none"
      DOM_EXPORTS.lightPillarSettings.style.display = isHidden
        ? "block"
        : "none"
      DOM_EXPORTS.lightPillarToggleBtn.classList.toggle("active", isHidden)
      DOM_EXPORTS.lightPillarToggleLabel.textContent = isHidden
        ? "Close Light Pillar"
        : "Open Light Pillar"
    })
  }

  if (DOM_EXPORTS.lightPillarRandomBtn) {
    DOM_EXPORTS.lightPillarRandomBtn.addEventListener("click", () => {
      const palette = [
        "#FF0055",
        "#00FF66",
        "#00AAFF",
        "#0055FF",
        "#5500FF",
        "#AA00FF",
        "#FF00AA",
        "#FF0000",
        "#FF5500",
        "#FFAA00",
        "#00FFCC",
        "#00FFAA",
        "#0000FF",
        "#00FFFF",
        "#FF00FF",
        "#FFFF00",
        "#FF2288",
        "#22FF88",
        "#2288FF",
        "#FF22FF",
        "#FFFF22",
        "#22FFFF",
        "#FF9FFC",
        "#5227FF",
      ]
      const randomHex = () =>
        palette[Math.floor(Math.random() * palette.length)]

      const randomIntensity = parseFloat((Math.random() * 1.5 + 0.5).toFixed(1)) // 0.5 to 2.0
      const randomRotSpeed = parseFloat((Math.random() * 0.8 + 0.1).toFixed(2)) // 0.1 to 0.9
      const randomGlow = parseFloat((Math.random() * 0.012 + 0.002).toFixed(4)) // 0.002 to 0.014
      const randomWidth = parseFloat((Math.random() * 4.0 + 1.0).toFixed(1)) // 1.0 to 5.0
      const randomHeight = parseFloat((Math.random() * 0.4 + 0.2).toFixed(2)) // 0.2 to 0.6
      const randomNoise = parseFloat((Math.random() * 0.7 + 0.1).toFixed(2)) // 0.1 to 0.8
      const randomPillarRot = Math.floor(Math.random() * 360)

      const topCol = randomHex()
      let bottomCol = randomHex()
      // ensure different color
      while (bottomCol === topCol) {
        bottomCol = randomHex()
      }

      handleSettingUpdate("lightPillarTopColor", topCol)
      handleSettingUpdate("lightPillarBottomColor", bottomCol)
      handleSettingUpdate("lightPillarIntensity", randomIntensity)
      handleSettingUpdate("lightPillarRotationSpeed", randomRotSpeed)
      handleSettingUpdate("lightPillarGlowAmount", randomGlow)
      handleSettingUpdate("lightPillarWidth", randomWidth)
      handleSettingUpdate("lightPillarHeight", randomHeight)
      handleSettingUpdate("lightPillarNoiseIntensity", randomNoise)
      handleSettingUpdate("lightPillarRotation", randomPillarRot)

      if (DOM_EXPORTS.lightPillarTopColor)
        DOM_EXPORTS.lightPillarTopColor.value = topCol
      if (DOM_EXPORTS.lightPillarBottomColor)
        DOM_EXPORTS.lightPillarBottomColor.value = bottomCol

      if (DOM_EXPORTS.lightPillarIntensity) {
        DOM_EXPORTS.lightPillarIntensity.value = randomIntensity
        DOM_EXPORTS.lightPillarIntensityValue.textContent =
          randomIntensity.toFixed(2)
      }
      if (DOM_EXPORTS.lightPillarRotationSpeed) {
        DOM_EXPORTS.lightPillarRotationSpeed.value = randomRotSpeed
        DOM_EXPORTS.lightPillarRotationSpeedValue.textContent =
          randomRotSpeed.toFixed(2)
      }
      if (DOM_EXPORTS.lightPillarGlow) {
        DOM_EXPORTS.lightPillarGlow.value = randomGlow
        DOM_EXPORTS.lightPillarGlowValue.textContent = randomGlow.toFixed(4)
      }
      if (DOM_EXPORTS.lightPillarWidth) {
        DOM_EXPORTS.lightPillarWidth.value = randomWidth
        DOM_EXPORTS.lightPillarWidthValue.textContent = randomWidth.toFixed(2)
      }
      if (DOM_EXPORTS.lightPillarHeight) {
        DOM_EXPORTS.lightPillarHeight.value = randomHeight
        DOM_EXPORTS.lightPillarHeightValue.textContent = randomHeight.toFixed(2)
      }
      if (DOM_EXPORTS.lightPillarNoise) {
        DOM_EXPORTS.lightPillarNoise.value = randomNoise
        DOM_EXPORTS.lightPillarNoiseValue.textContent = randomNoise.toFixed(2)
      }
      if (DOM_EXPORTS.lightPillarRotation) {
        DOM_EXPORTS.lightPillarRotation.value = randomPillarRot
        DOM_EXPORTS.lightPillarRotationValue.textContent = randomPillarRot + "°"
      }

      if (effects.lightPillarEffect) {
        effects.lightPillarEffect.setOptions({
          topColor: topCol,
          bottomColor: bottomCol,
          intensity: randomIntensity,
          rotationSpeed: randomRotSpeed,
          glowAmount: randomGlow,
          pillarWidth: randomWidth,
          pillarHeight: randomHeight,
          noiseIntensity: randomNoise,
          pillarRotation: randomPillarRot,
        })
      }
    })
  }

  if (DOM_EXPORTS.lightPillarActive) {
    // Sync initial state
    DOM_EXPORTS.lightPillarActive.checked = settings.lightPillarActive === true
    DOM_EXPORTS.lightPillarActive.addEventListener("change", (e) => {
      handleSettingUpdate("lightPillarActive", e.target.checked)
    })
  }

  if (DOM_EXPORTS.lightPillarTopColor) {
    DOM_EXPORTS.lightPillarTopColor.value =
      settings.lightPillarTopColor || "#5227FF"
    DOM_EXPORTS.lightPillarTopColor.addEventListener("change", (e) => {
      handleSettingUpdate("lightPillarTopColor", e.target.value)
      if (effects.lightPillarEffect)
        effects.lightPillarEffect.setOptions({ topColor: e.target.value })
    })
  }

  if (DOM_EXPORTS.lightPillarBottomColor) {
    DOM_EXPORTS.lightPillarBottomColor.value =
      settings.lightPillarBottomColor || "#FF9FFC"
    DOM_EXPORTS.lightPillarBottomColor.addEventListener("change", (e) => {
      handleSettingUpdate("lightPillarBottomColor", e.target.value)
      if (effects.lightPillarEffect)
        effects.lightPillarEffect.setOptions({ bottomColor: e.target.value })
    })
  }

  const lightPillarProps = [
    {
      id: "lightPillarIntensity",
      dom: DOM_EXPORTS.lightPillarIntensity,
      val: DOM_EXPORTS.lightPillarIntensityValue,
      optKey: "intensity",
    },
    {
      id: "lightPillarRotationSpeed",
      dom: DOM_EXPORTS.lightPillarRotationSpeed,
      val: DOM_EXPORTS.lightPillarRotationSpeedValue,
      optKey: "rotationSpeed",
    },
    {
      id: "lightPillarGlowAmount",
      dom: DOM_EXPORTS.lightPillarGlow,
      val: DOM_EXPORTS.lightPillarGlowValue,
      optKey: "glowAmount",
    },
    {
      id: "lightPillarWidth",
      dom: DOM_EXPORTS.lightPillarWidth,
      val: DOM_EXPORTS.lightPillarWidthValue,
      optKey: "pillarWidth",
    },
    {
      id: "lightPillarHeight",
      dom: DOM_EXPORTS.lightPillarHeight,
      val: DOM_EXPORTS.lightPillarHeightValue,
      optKey: "pillarHeight",
    },
    {
      id: "lightPillarNoiseIntensity",
      dom: DOM_EXPORTS.lightPillarNoise,
      val: DOM_EXPORTS.lightPillarNoiseValue,
      optKey: "noiseIntensity",
    },
    {
      id: "lightPillarRotation",
      dom: DOM_EXPORTS.lightPillarRotation,
      val: DOM_EXPORTS.lightPillarRotationValue,
      optKey: "pillarRotation",
      isAngle: true,
    },
  ]

  lightPillarProps.forEach((prop) => {
    if (prop.dom) {
      if (settings[prop.id] !== undefined) {
        prop.dom.value = settings[prop.id]
        if (prop.val) {
          if (prop.isAngle) {
            prop.val.textContent = Math.round(settings[prop.id]) + "°"
          } else {
            prop.val.textContent = parseFloat(settings[prop.id]).toFixed(2)
          }
        }
      }
      prop.dom.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value)
        if (prop.val) {
          if (prop.isAngle) {
            prop.val.textContent = Math.round(val) + "°"
          } else {
            prop.val.textContent = val.toFixed(2)
          }
        }
        updateSetting(prop.id, val)
        if (effects.lightPillarEffect) {
          effects.lightPillarEffect.setOptions({ [prop.optKey]: val })
        }
      })
      prop.dom.addEventListener("change", () => saveSettings())
    }
  })

  // Initialize data and renderers
  populateUnsplashCollections(DOM_EXPORTS.unsplashCategorySelect, ctx.i18n)
  renderUserColors(DOM_EXPORTS)
  renderUserAccentColors(DOM_EXPORTS)
  initThemeManager(DOM_EXPORTS, handleSettingUpdate, updateSettingsInputs)

  // Restore font
  initFont()
  renderFontGrid(DOM_EXPORTS.fontGrid, handleSettingUpdate)
  setupLocalFonts(handleSettingUpdate)

  // Setup all event handlers
  setupGeneralEventHandlers(
    ctx,
    handleSettingUpdate,
    applySettings,
    updateSettingsInputs,
  )
  setupEffectColorHandlers(DOM_EXPORTS, effects)
  setupMultiSelectMode(DOM_EXPORTS, handleSettingUpdate)
  setupGradientMultiSelect(DOM_EXPORTS)
  setupSvgWaveMultiSelect(DOM_EXPORTS, effects.svgWaveEffect, () => {
    handleSettingUpdate("svgWaveActive", true)
  })
  setupFileUploads(DOM_EXPORTS, handleSettingUpdate)
  setupMultiColorManager(applySettings)

  // Final setup
  renderLocalBackgrounds(DOM_EXPORTS, handleSettingUpdate)
  renderUserGradients(DOM_EXPORTS)
  renderUserSvgWaves(DOM_EXPORTS, effects.svgWaveEffect, () => {
    handleSettingUpdate("svgWaveActive", true)
  })
  renderUserGradientV2s(DOM_EXPORTS)
  applySettings()
}
