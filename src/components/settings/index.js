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
import { loadGoogleFont, renderFontGrid } from "./fontManager.js"
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
  setupMultiSelectMode,
  setupFileUploads,
} from "./backgroundManager.js"
import { renderUserGradients } from "./gradientManager.js"
import { renderUserSvgWaves } from "./svgWaveManager.js"
import { setupEffectColorHandlers } from "./effectColorHandlers.js"
import { setupGeneralEventHandlers } from "./eventHandlers.js"

// Import animation effects
import { StarFall } from "../animations/rainGalaxy.js"
import { FirefliesEffect } from "../animations/fireflies.js"
import { NetworkEffect } from "../animations/network.js"
import { MatrixRain } from "../animations/matrixRain.js"
import { AuraEffect } from "../animations/aura.js"
import { WindEffect } from "../animations/wind.js"
import { HackerEffect } from "../animations/hacker.js"
import { SakuraEffect } from "../animations/sakura.js"
import { SnowfallEffect } from "../animations/snowfall.js"
import { SnowfallHDEffect } from "../animations/snowfallHD.js"
import { AuroraWaveEffect } from "../animations/auroraWave.js"
import { BubblesEffect } from "../animations/bubbles.js"
import { RainOnGlassEffect } from "../animations/rainOnGlass.js"
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
import { ShinyEffect } from "../animations/shiny.js"
import { LineShinyEffect } from "../animations/lineShiny.js"
import { TetFireworksEffect } from "../animations/tetFireworks.js"
import { SkyLanternsEffect } from "../animations/skyLanterns.js"
import { PixelRunEffect } from "../animations/pixelRun.js"
import { NintendoPixelEffect } from "../animations/nintendoPixel.js"
import { RetroGameEffect } from "../animations/retroGame.js"
import { MeteorEffect } from "../animations/meteor.js"
import { WavyPatternEffect } from "../animations/wavyPattern.js"
import { AngledPatternEffect } from "../animations/angledPattern.js"
import { CrtScanlinesEffect } from "../animations/crtScanlines.js"

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
    windEffect: new WindEffect("effect-canvas"),
    hackerEffect: new HackerEffect("effect-canvas", settings.hackerColor),
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
      settings.accentColor,
    ),
    bubblesEffect: new BubblesEffect(
      "effect-canvas",
      settings.bubbleColor || "#60c8ff",
    ),
    rainOnGlassEffect: new RainOnGlassEffect(
      "effect-canvas",
      settings.rainOnGlassColor || "#a8d8ff",
    ),
    rainHDEffect: new RainHDEffect(
      "effect-canvas",
      settings.rainHDColor || "#99ccff",
    ),
    stormRainEffect: new StormRainEffect(
      "effect-canvas",
      settings.stormRainColor || "#7dd3fc",
    ),
    rainbowEffect: new RainbowBackground("effect-canvas"),
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
    sunbeamEffect: new SunbeamEffect("effect-canvas"),
    shinyEffect: new ShinyEffect(
      "effect-canvas",
      settings.shinyColor || "#ff0000",
    ),
    lineShinyEffect: new LineShinyEffect(
      "effect-canvas",
      settings.lineShinyColor || "#ffffff",
    ),
    tetFireworksEffect: new TetFireworksEffect("effect-canvas"),
    skyLanternsEffect: new SkyLanternsEffect("effect-canvas"),
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
    ),
    crtScanlinesEffect: new CrtScanlinesEffect("effect-canvas"),
    meteorEffect: new MeteorEffect(
      "effect-canvas",
      settings.meteorColor || settings.starColor || "#ffffff",
    ),
    wavyPatternEffect: new WavyPatternEffect(
      settings.wavyPatternColor1 || "#AB3E5B",
      settings.wavyPatternColor2 || "#FFBE40",
    ),
    angledPatternEffect: new AngledPatternEffect(
      settings.angledPatternColor1 || "#ECD078",
      settings.angledPatternColor2 || "#0B486B",
    ),
    svgWaveEffect: new SvgWaveGenerator(),
  }

  // Build utilities context
  const ctx = {
    effects,
    DOM: DOM_EXPORTS,
    localBackgrounds,
    i18n: geti18n(),
  }

  function handleSettingUpdate(key, value, isGradient = false) {
    if (isGradient) {
      updateSetting("gradientStart", value.start)
      updateSetting("gradientEnd", value.end)
      updateSetting("gradientAngle", value.angle)
      updateSetting("background", null)
      updateSetting("svgWaveActive", false)
    } else {
      updateSetting(key, value)
      if (key === "background" && value != null) {
        updateSetting("svgWaveActive", false)
      }
    }
    saveSettings()
    applySettings()

    // Avoid expensive gallery rerenders for unrelated toggles (e.g. clock/date).
    const shouldRefreshBackgroundGalleries =
      isGradient || key === "background" || key === "svgWaveActive"
    if (shouldRefreshBackgroundGalleries) {
      renderLocalBackgrounds(DOM_EXPORTS, handleSettingUpdate)
      renderUserGradients(DOM_EXPORTS)
    }
  }

  ctx.handleSettingUpdate = handleSettingUpdate

  // Bridge shared helpers expected by settingsApplier/updateSettingsInputs.
  effects.DOM = DOM_EXPORTS
  effects.localBackgrounds = localBackgrounds
  effects.handleSettingUpdate = handleSettingUpdate
  effects.renderFontGrid = () =>
    renderFontGrid(DOM_EXPORTS.fontGrid, handleSettingUpdate)
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

  // Collapsible groups
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

  // Initialize data and renderers
  populateUnsplashCollections(DOM_EXPORTS.unsplashCategorySelect, ctx.i18n)
  renderUserSvgWaves(DOM_EXPORTS, effects.svgWaveEffect)
  renderUserColors(DOM_EXPORTS)

  // Restore Unsplash credit
  const lastCredit = settings.unsplashLastCredit
  if (lastCredit && DOM_EXPORTS.unsplashCredit) {
    const photoLink = lastCredit.photoUrl
      ? `<a href="${lastCredit.photoUrl}?utm_source=startpage&utm_medium=referral" target="_blank" rel="noopener" style="color:inherit;">View on Unsplash</a>`
      : ""
    const authorLink = lastCredit.authorUrl
      ? `<a href="${lastCredit.authorUrl}?utm_source=startpage&utm_medium=referral" target="_blank" rel="noopener" style="color:inherit;">${lastCredit.authorName}</a>`
      : lastCredit.authorName
    DOM_EXPORTS.unsplashCredit.innerHTML = `📷 ${photoLink}${photoLink && lastCredit.authorName ? " &bull; " : ""}${authorLink}`
    DOM_EXPORTS.unsplashCredit.style.display = "block"
  }

  // Restore saved fonts
  const savedFonts = settings.userSavedFonts || []
  if (savedFonts.length > 0) {
    const currentFontName = (settings.font || "")
      .replace(/['"]/g, "")
      .replace(/,.*$/, "")
      .trim()
    if (savedFonts.includes(currentFontName)) {
      const customFontLink = document.getElementById("custom-google-font")
      if (customFontLink) {
        customFontLink.href = `https://fonts.googleapis.com/css2?family=${currentFontName.replace(/\s+/g, "+")}:wght@300;400;500;600;700&display=swap`
      }
    }
    savedFonts.forEach((fontName) => loadGoogleFont(fontName))
  }
  renderFontGrid(DOM_EXPORTS.fontGrid, handleSettingUpdate)

  // Setup all event handlers
  setupGeneralEventHandlers(
    ctx,
    handleSettingUpdate,
    applySettings,
    updateSettingsInputs,
  )
  setupEffectColorHandlers(DOM_EXPORTS, effects)
  setupMultiSelectMode(DOM_EXPORTS, handleSettingUpdate)
  setupFileUploads(DOM_EXPORTS, handleSettingUpdate)

  // Final setup
  renderLocalBackgrounds(DOM_EXPORTS, handleSettingUpdate)
  renderUserGradients(DOM_EXPORTS)
  applySettings()
}
