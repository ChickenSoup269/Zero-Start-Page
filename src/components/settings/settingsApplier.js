/**
 * Settings Applier Module
 * Core logic for applying settings to the page (applySettings and updateSettingsInputs)
 */

import {
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"
import { initMacosHoverForBookmarks } from "../bookmarks.js"
import { geti18n } from "../../services/i18n.js"
import { getContrastYIQ, hexToRgb } from "../../utils/colors.js"
import {
  isIdbImage,
  isIdbVideo,
  isIdbMedia,
  getBlobUrlSync,
} from "../../services/imageStore.js"
import { getSvgWaveParams } from "./svgWaveUtils.js"
import {
  renderLocalBackgrounds,
  renderUserColors,
} from "./backgroundManager.js"
import { renderUserGradients, buildGradientCss } from "./gradientManager.js"
import { renderUserSvgWaves } from "./svgWaveManager.js"

let _prevBg = null // Track last applied background for fade-in trigger
let _prevEffect = null // Track last selected effect to avoid unnecessary restart

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
  stormRain: "stormRainEffect",
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
  shiny: "shinyEffect",
  lineShiny: "lineShinyEffect",
  tetFireworks: "tetFireworksEffect",
  reunificationDay: "reunificationDayEffect",
  halloween: "halloweenEffect",
  skyLanterns: "skyLanternsEffect",
  pixelRun: "pixelRunEffect",

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
}

function setEffectActive(effectGrid, value) {
  effectGrid.querySelectorAll(".effect-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.value === value)
  })
}

function createApplySettings(effectInstances) {
  return function applySettings() {
    const settings = getSettings()
    const bgChanged = settings.background !== _prevBg
    _prevBg = settings.background
    let shouldUseSvgWave = false

    // 1. Page Title
    document.title = settings.pageTitle || "Start Page"

    // 1b. Top Right Controls
    const topRightControls = document.getElementById("top-right-controls")
    if (topRightControls) {
      topRightControls.classList.toggle(
        "hidden",
        !settings.showTopRightControls,
      )
    }

    const donateSection = document.querySelector(".donate-section")
    if (donateSection) {
      donateSection.style.display =
        settings.showDonateButton !== false ? "flex" : "none"
    }

    // 2. Reset Styles
    document.body.classList.remove(
      "bg-layer-active",
      "bg-image-active",
      "bookmark-sidebar-mode",
      "bookmark-taskbar-mode",
      "bookmark-taskbar-top-mode",
      "bookmark-taskbar-left-mode",
      "bookmark-layout-bg-hidden",
      "bookmark-layout-bg-white",
      "bookmark-layout-bg-colored",
      "bookmark-item-card-style",
      "hide-bookmark-text",
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

    // Apply Widget Skins
    const widgetSkinsMap = {
      todo: "todo-container",
      timer: "timer-component",
      calendar: "full-calendar-container",
      notepad: "notepad-container",
      quotes: "daily-quotes",
      musicPlayer: "music-player-container",
      visualizer: "visualizer-container"
    }

    Object.entries(widgetSkinsMap).forEach(([key, id]) => {
      const el = document.getElementById(id)
      if (el) {
        // Force white-blur if isWhiteMode is active, otherwise use saved setting
        const skin = isWhiteMode ? "white-blur" : settings[`${key}Skin`]
        el.classList.toggle("skin-white-blur", skin === "white-blur")
        
        // Special handling for music player wrapper
        if (key === "musicPlayer") {
          const wrapper = el.querySelector(".music-player-wrapper")
          if (wrapper) wrapper.classList.toggle("skin-white-blur", skin === "white-blur")
        }
      }
    })

    document.body.className.split(" ").forEach((cls) => {
      if (cls.startsWith("date-clock-style-"))
        document.body.classList.remove(cls)
    })

    document.body.style.background = ""
    document.body.style.backgroundImage = ""
    const bgLayer = document.getElementById("bg-layer")
    if (bgLayer) {
      bgLayer.style.backgroundImage = ""
      bgLayer.style.backgroundSize = ""
      bgLayer.style.background = ""
      bgLayer.className = ""
      if (bgChanged) bgLayer.style.opacity = "0"
    }
    document.documentElement.style.setProperty("--text-color", "#ffffff")

    // 3. Background Logic
    let bg = settings.background
    // Resolve IndexedDB image/video ID to blob URL
    const isVideoId = isIdbVideo(bg)
    if (isIdbMedia(bg)) {
      const cachedUrl = getBlobUrlSync(bg)
      if (cachedUrl) {
        bg = cachedUrl
      } else {
        // Not in sync cache yet, fetch it async and re-apply
        import("../../services/imageStore.js").then((m) => {
          m.getImageUrl(settings.background).then((url) => {
            // Check if the background setting is still the same one we started fetching
            if (url && getSettings().background === bg) {
              applySettings()
            }
          })
        })
        // If it's a video, we MUST NOT let it proceed with bg as an ID string
        // because bg.startsWith("data:video") will be false and it might fall through.
        // We set a flag or keep the ID but handle it carefully below.
      }
    }
    const isPredefinedLocalBg = effectInstances.localBackgrounds.some(
      (b) => b.id === bg,
    )
    const isUserUploadedBg =
      bg &&
      (bg.startsWith("data:image") ||
        bg.startsWith("data:video") ||
        bg.startsWith("blob:") ||
        isIdbImage(bg) ||
        isIdbVideo(bg))
    const bgVideoElement = document.getElementById("bg-video")

    // Track if a video was assigned this render to clean up unused videos
    let activeVideoSource = null

    // Hide video by default, we'll show it if it's active
    if (bgVideoElement) bgVideoElement.style.display = "none"

    if (isPredefinedLocalBg) {
      if (bgLayer) bgLayer.classList.add(bg)
      document.body.classList.add("bg-layer-active")
      document.documentElement.style.setProperty("--text-color", "#ffffff")
    } else if (isUserUploadedBg) {
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
                  // Keep activeVideoSource = ID so it's NOT cleared below
                  bgVideoElement.style.display = "block"
              }
          } else {
              if (bgVideoElement.getAttribute("src") !== activeVideoSource) {
                bgVideoElement.src = activeVideoSource
              }
              bgVideoElement.style.display = "block"
              bgVideoElement.style.opacity = "1"
          }
        }
      } else {
        if (bgLayer) {
          let imageUrl = bg
          if (isIdbMedia(bg)) {
              imageUrl = getBlobUrlSync(bg)
          }
          if (imageUrl) {
            bgLayer.style.backgroundImage = `url('${imageUrl}')`
            bgLayer.style.backgroundSize = settings.bgSize || "cover"
          }
        }
      }
      document.body.style.backgroundSize = settings.bgSize || "cover"
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
        }
        document.documentElement.style.setProperty("--text-color", "#ffffff")
      } else if (bg.match(/^https?:\/\//)) {
        if (bgLayer) {
          bgLayer.style.backgroundImage = `url('${bg}')`
          bgLayer.style.backgroundSize = settings.bgSize || "cover"
        }
        document.documentElement.style.setProperty("--text-color", "#ffffff")
      } else {
        if (bgLayer) bgLayer.style.background = bg
        document.body.classList.add("bg-layer-active")
        document.documentElement.style.setProperty(
          "--text-color",
          getContrastYIQ(bg),
        )
      }
    } else {
      // If no background image/color, apply SVG wave → fallback
      if (settings.svgWaveActive && effectInstances.svgWaveEffect) {
        shouldUseSvgWave = true
        if (effectInstances.svgWaveEffect.active) {
          effectInstances.svgWaveEffect.update(getSvgWaveParams(settings))
        } else {
          effectInstances.svgWaveEffect.start(getSvgWaveParams(settings))
        }
      } else {
        if (bgLayer) {
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
        document.body.classList.add("bg-layer-active")
      }
    }

    if (
      !activeVideoSource &&
      bgVideoElement &&
      bgVideoElement.getAttribute("src")
    ) {
      bgVideoElement.removeAttribute("src")
      bgVideoElement.load()
    }

    if (!shouldUseSvgWave && effectInstances.svgWaveEffect?.active) {
      effectInstances.svgWaveEffect.stop()
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
    document.documentElement.style.setProperty(
      "--bg-blur",
      `${settings.bgBlur ?? 0}px`,
    )
    document.documentElement.style.setProperty(
      "--bg-brightness",
      `${settings.bgBrightness ?? 100}%`,
    )
    document.documentElement.style.setProperty(
      "--bg-fade-in",
      `${settings.bgFadeIn ?? 0.5}s`,
    )

    // Trigger fade-in only when background changed
    if (bgChanged) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const _bgLayer = document.getElementById("bg-layer")
          if (_bgLayer) _bgLayer.style.opacity = "1"
          const _bgVideo = document.getElementById("bg-video")
          if (_bgVideo && _bgVideo.style.display === "block")
            _bgVideo.style.opacity = "1"
        }),
      )
    }

    const clockFontTarget = settings.clockFontTarget || "both"
    const rawFont = settings.font || "'Outfit', sans-serif"
    const rawClockFont = settings.clockFont || settings.font || "'Outfit', sans-serif"

    const isRestrictedFont = (f) =>
        f.includes("Electroharmonix") ||
        f.includes("Anurati") ||
        f.includes("E1234")

    // General font (primary) should never be a restricted clock font
    const primaryFont = isRestrictedFont(rawFont)
      ? "'Outfit', sans-serif"
      : rawFont
      
    // Clock font can be restricted
    const clockFont = rawClockFont

    document.documentElement.style.setProperty("--font-primary", primaryFont)

    const applyToTargets = (targets, font) => {
        targets.forEach(t => {
            document.documentElement.style.setProperty(`--font-${t}`, font)
        })
    }

    // Default everything to primary then override based on target
    applyToTargets(["clock-date", "clock", "date", "weekday"], primaryFont)

    if (clockFontTarget === "both") {
        applyToTargets(["clock-date", "clock", "date", "weekday"], clockFont)
    } else if (clockFontTarget === "clock") {
        applyToTargets(["clock", "clock-date"], clockFont)
    } else if (clockFontTarget === "date") {
        applyToTargets(["date"], clockFont)
    } else if (clockFontTarget === "weekday") {
        applyToTargets(["weekday"], clockFont)
    }

    // Special handling for JP style font inheritance if needed
    // JP style elements use --font-clock by default in CSS, but we might want more granular
    document.documentElement.style.setProperty("--font-jp-time", (clockFontTarget === "both" || clockFontTarget === "clock") ? clockFont : primaryFont)
    document.documentElement.style.setProperty("--font-jp-date", (clockFontTarget === "both" || clockFontTarget === "date") ? clockFont : primaryFont)
    document.documentElement.style.setProperty("--font-jp-weekday", (clockFontTarget === "both" || clockFontTarget === "weekday") ? clockFont : primaryFont)

    const baseClockSize = Number(settings.clockSize) || 6
    const rawDateSize = Number(settings.dateSize)
    const baseDateSize = Number.isFinite(rawDateSize)
      ? Math.min(10, Math.max(0.8, rawDateSize))
      : 1.5
    const priority = settings.clockDatePriority === "date" ? "date" : "none"
    const displayMode = settings.clockDisplayMode || "all"
    let computedClockSize = baseClockSize
    let computedDateSize = baseDateSize

    if (priority === "date" || displayMode === "weekday") {
      // In date-priority mode OR Weekday-only mode, the date/weekday 
      // should take the prominent size (clock size).
      computedClockSize = baseDateSize
      computedDateSize = baseClockSize
    }

    document.documentElement.style.setProperty(
      "--clock-size",
      `${computedClockSize}rem`,
    )
    document.documentElement.style.setProperty(
      "--date-size",
      `${computedDateSize}rem`,
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

    if (settings.bookmarkGroupTextColor) {
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

    if (settings.bookmarkHideBg) {
      document.body.classList.add("hide-bookmark-bg")
    } else {
      document.body.classList.remove("hide-bookmark-bg")
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

    document.body.classList.remove(
      "bookmark-sidebar-mode",
      "bookmark-taskbar-mode",
      "bookmark-taskbar-top-mode",
      "bookmark-taskbar-left-mode",
    )
    if (layout === "sidebar")
      document.body.classList.add("bookmark-sidebar-mode")
    else if (layout === "taskbar")
      document.body.classList.add("bookmark-taskbar-mode")
    else if (layout === "taskbar-top")
      document.body.classList.add("bookmark-taskbar-top-mode")
    else if (layout === "taskbar-left")
      document.body.classList.add("bookmark-taskbar-left-mode")

    let bgStyle = settings.bookmarkLayoutBgStyle || "default"
    let bgColor = settings.bookmarkLayoutBgColor || ""
    let itemStyle = settings.bookmarkItemStyle || "default"

    document.body.classList.remove(
      "bookmark-layout-bg-hidden",
      "bookmark-layout-bg-white",
      "bookmark-layout-bg-colored",
      "bookmark-item-card-style",
    )

    if (bgStyle === "hidden") {
      document.body.classList.add("bookmark-layout-bg-hidden")
    } else if (bgStyle === "white") {
      document.body.classList.add("bookmark-layout-bg-white")
    } else if (bgStyle === "colored") {
      document.body.classList.add("bookmark-layout-bg-colored")
      document.documentElement.style.setProperty(
        "--bookmark-layout-bg-color",
        bgColor,
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
    // Context Menu Style
    document.body.classList.remove(
      "context-menu-dark",
      "context-menu-light",
      "context-menu-none",
    )
    document.body.classList.add(`context-menu-${settings.contextMenuStyle || "dark"}`)

    document.body.classList.toggle(
      "analog-bg-blur-enabled",
      dateClockStyle === "analog" && settings.analogBlurBackground === true,
    )

    // 3.1 Clock & Date Visibility & Contrast
    const clockEl = document.getElementById("clock")
    const dateEl = document.getElementById("date")

    if (clockEl) {
      clockEl.style.display = displayMode === "hide" || displayMode === "weekday" ? "none" : "block"
    }

    if (dateEl) {
      dateEl.style.display = displayMode === "hide" ? "none" : "block"
      dateEl.classList.toggle("only-weekday-mode", displayMode === "weekday")
    }

    let finalClockColor = settings.clockColor
    let finalDateColor = settings.dateColor

    if (!finalClockColor || !finalDateColor) {
      let fallbackColor = "#ffffff"
      if (
        isPredefinedLocalBg ||
        isUserUploadedBg ||
        (bg && bg.match(/^https?:\/\//))
      ) {
        fallbackColor = "#ffffff"
      } else if (bg) {
        fallbackColor = getContrastYIQ(bg)
      } else {
        fallbackColor = getContrastYIQ(settings.gradientStart)
      }

      if (!finalClockColor) finalClockColor = fallbackColor
      if (!finalDateColor) finalDateColor = fallbackColor
    }

    document.documentElement.style.setProperty("--clock-color", finalClockColor)
    document.documentElement.style.setProperty("--date-color", finalDateColor)

    // Theme Surface Colors
    if (settings.sidebarBg) {
      document.documentElement.style.setProperty("--sidebar-bg", settings.sidebarBg)
    }
    if (settings.panelBg) {
      document.documentElement.style.setProperty("--panel-bg", settings.panelBg)
    }
    if (settings.glassBg) {
      document.documentElement.style.setProperty("--glass-bg", settings.glassBg)
    }
    if (settings.glassBorder) {
      document.documentElement.style.setProperty("--glass-border", settings.glassBorder)
    }
    if (settings.glassEdge) {
      document.documentElement.style.setProperty("--glass-edge", settings.glassEdge)
    }

    if (settings.accentColor) {
      document.documentElement.style.setProperty(
        "--accent-color",
        settings.accentColor,
      )
      // Dynamic contrast color for accent background
      const contrastColor =
        getContrastYIQ(settings.accentColor) === "black" ? "#1a1a2e" : "#ffffff"
      document.documentElement.style.setProperty(
        "--accent-contrast-color",
        contrastColor,
      )

      const rgb = hexToRgb(settings.accentColor)
      if (rgb) {
        document.documentElement.style.setProperty(
          "--accent-color-rgb",
          `${rgb.r}, ${rgb.g}, ${rgb.b}`,
        )
      }

      // Ensure Unsplash random button icon has contrast
      const unsplashRandomBtn = document.getElementById("unsplash-random-btn")
      if (unsplashRandomBtn) {
        const icon = unsplashRandomBtn.querySelector("i")
        if (icon) {
          icon.style.color = getContrastYIQ(settings.accentColor) === "black" ? "rgba(0,0,0,0.8)" : "#ffffff"
        }
      }
    }

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
    const selectedEffect = effectInstances[mappedKey]
    const effectChanged = effectToStart !== _prevEffect

    // Update Hyperspace color if active
    if (effectToStart === "hyperspace" && selectedEffect && selectedEffect.updateColor) {
      selectedEffect.updateColor(settings.accentColor)
    }

    const effectCanvas = document.getElementById("effect-canvas")
    if (
      effectToStart === "pixelWeather" &&
      selectedEffect
    ) {
      if (selectedEffect.setMode) {
        selectedEffect.setMode(settings.pixelWeatherStyle || "snow")
      }
      if (selectedEffect.setOptions) {
        selectedEffect.setOptions({
          density: settings.pixelWeatherDensity || 1.0,
          resolution: settings.pixelWeatherResolution || 1,
          speed: settings.pixelWeatherSpeed || 1.0,
          size: settings.pixelWeatherSize || 1.0,
        })
      }
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
      selectedEffect.setOptions({
        speed: settings.pixelWeatherSpeed || 1.0,
        spacing: settings.gridSpacing || 50,
        perspective: settings.gridPerspective !== false
      })
    }

    if (
      effectToStart === "auroraWave" &&
      selectedEffect &&
      selectedEffect.setOptions
    ) {
      selectedEffect.setOptions({
        color: settings.auroraWaveColor || "#00bcd4",
        brightness: settings.auroraWaveBrightness || 0.65,
        speed: settings.auroraWaveSpeed || 1.0,
        waveAmplitude: settings.auroraWaveAmplitude || 70,
        transparent: settings.auroraWaveTransparent !== false,
        backgroundColor: settings.auroraWaveBgColor || "#000000",
        bgOpacity: settings.auroraWaveBgOpacity ?? 0.15,
      })
    }

    if (
      effectToStart === "hacker" &&
      selectedEffect &&
      selectedEffect.updateColor
    ) {
      selectedEffect.updateColor(settings.hackerColor || "#00FF00")
    }

    if (
      effectToStart === "oceanWave" &&
      selectedEffect
    ) {
      selectedEffect.color = settings.oceanWaveColor || "#0077b6"
      selectedEffect.position = settings.oceanWavePosition || "bottom"
    }

    if (
      effectToStart === "bubbles" &&
      selectedEffect &&
      selectedEffect.updateColor
    ) {
      selectedEffect.updateColor(settings.bubblesColor || "#60c8ff")
    }

    if (
      effectToStart === "pixelBlast" &&
      selectedEffect &&
      selectedEffect.setOptions
    ) {
      selectedEffect.setOptions({
        pixelSize: settings.pixelBlastSize || 15,
        variant: settings.pixelBlastVariant || "square",
        color: settings.pixelBlastColor || "#B497CF",
        transparent: settings.pixelBlastTransparent !== false,
        backgroundColor: settings.pixelBlastBgColor || "#0a0a0a",
        liquid: settings.pixelBlastLiquid !== false,
        liquidStrength: settings.pixelBlastLiquidStrength ?? 1.0,
        cursorRadius: settings.pixelBlastCursorRadius || 150,
        enableRipples: settings.pixelBlastRipples !== false,
      })
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

    if (effectChanged) {
      // Stop previous effects only when effect selection actually changes.
      Object.values(effectInstances).forEach((effect) => {
        if (shouldUseSvgWave && effect === effectInstances.svgWaveEffect) return
        if (effect && typeof effect.stop === "function") {
          effect.stop()
        }
      })

      if (effectCanvas) {
        const ctx = effectCanvas.getContext("2d")
        ctx.clearRect(0, 0, effectCanvas.width, effectCanvas.height)
        effectCanvas.style.display = "none"
      }

      // 5. Start selected effect immediately (no artificial delay/flicker).
      if (effectToStart && effectToStart !== "none" && selectedEffect) {
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
    }
    _prevEffect = effectToStart

    // 6. Gradients
    document.documentElement.style.setProperty(
      "--bg-gradient-start",
      settings.gradientStart,
    )
    document.documentElement.style.setProperty(
      "--bg-gradient-end",
      settings.gradientEnd,
    )
    document.documentElement.style.setProperty(
      "--bg-gradient-angle",
      settings.gradientAngle + "deg",
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
  let info = settings.unsplashPhotoInfo

  // If not Unsplash or missing info, try to find metadata in userBackgrounds
  if (!info || !info.authorName) {
      const localEntry = (settings.userBackgrounds || []).find(item => 
          (typeof item === 'object' && item.id === bg) || item === bg
      )
      if (localEntry && typeof localEntry === 'object') {
          info = localEntry
      }
  }

  const isUnsplash = info && info.authorName && (
      (bg && (bg.includes("unsplash.com") || bg.includes("images.unsplash.com") || bg.includes("api.unsplash.com"))) ||
      (info.photoUrl && info.photoUrl.includes("unsplash.com"))
  )
  const isLocalMedia = isIdbMedia(bg)
  
  if (info && info.authorName) {
    const authorLink = info.authorUrl ? `<a href="${info.authorUrl}?utm_source=startpage&utm_medium=referral" target="_blank">${info.authorName}</a>` : info.authorName
    const photoLink = info.photoUrl ? `<a href="${info.photoUrl}?utm_source=startpage&utm_medium=referral" target="_blank">${isUnsplash ? "Unsplash" : "Source"}</a>` : (isUnsplash ? "Unsplash" : "Local")
    
    const iconClass = isUnsplash ? "fa-brands fa-unsplash credit-logo-unsplash" : (isIdbVideo(bg) ? "fa-solid fa-video credit-logo-local" : "fa-solid fa-image credit-logo-local")
    
    const html = `
      <i class="${iconClass}"></i>
      <span>${photoLink} &bull; ${authorLink}</span>
    `
    
    if (creditEl) {
        creditEl.innerHTML = html
        creditEl.style.display = "flex"
    }
    
    if (settingsCreditEl) {
        settingsCreditEl.innerHTML = html
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
      settings.background && settings.background.startsWith("data:image")
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
    if (DOM.dateFormatSelect) DOM.dateFormatSelect.value = settings.dateFormat
    if (DOM.shortWeekdayCheckbox)
      DOM.shortWeekdayCheckbox.checked = settings.shortWeekday === true
    if (DOM.timeFormatSelect)
      DOM.timeFormatSelect.value = settings.timeFormat || "24h"
    if (DOM.timezoneSelect)
      DOM.timezoneSelect.value = settings.timezone || "local"
    if (DOM.contextMenuStyleSelect)
      DOM.contextMenuStyleSelect.value = settings.contextMenuStyle || "dark"
    if (DOM.lcpContextMenuStyle)
      DOM.lcpContextMenuStyle.value = settings.contextMenuStyle || "dark"
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
    const clockCards = document.querySelectorAll(".clock-style-card")
    const currentStyle = settings.dateClockStyle || "default"
    clockCards.forEach((card) => {
      card.classList.toggle("active", card.dataset.value === currentStyle)
    })

    if (DOM.jpStyleLanguageSelect)
      DOM.jpStyleLanguageSelect.value = settings.jpStyleLanguage || "auto"
    if (DOM.hueTextModeSelect)
      DOM.hueTextModeSelect.value = settings.hueTextMode || "off"
    if (DOM.analogMarkerModeSelect)
      DOM.analogMarkerModeSelect.value = settings.analogMarkerMode || "quarters"
    if (DOM.sidestyleAlignSelect)
      DOM.sidestyleAlignSelect.value = settings.sidestyleAlign || "left"
    if (DOM.sidestyleNoBorderCheckbox)
      DOM.sidestyleNoBorderCheckbox.checked =
        settings.sidestyleNoBorder === true
    if (DOM.sidebarClockFlipCheckbox)
      DOM.sidebarClockFlipCheckbox.checked =
        settings.sidebarClockFlip === true
    if (DOM.clockFontTargetSelect)
      DOM.clockFontTargetSelect.value = settings.clockFontTarget || "both"

    // Manage display of conditional settings
    const style = settings.dateClockStyle || "default"

    // Show style-specific container if current style has special settings
    const styleHasExtras = [
      "analog",
      "jp-style",
      "sidestyle",
      "sidebar",
      "round",
      "square",
    ].includes(style)
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

    if (DOM.jpStyleLanguageSetting)
      DOM.jpStyleLanguageSetting.style.display =
        style === "jp-style" ? "block" : "none"
    if (DOM.sidestyleAlignSetting)
      DOM.sidestyleAlignSetting.style.display =
        style === "sidestyle" ? "block" : "none"
    if (DOM.sidebarClockFlipSetting)
      DOM.sidebarClockFlipSetting.style.display =
        style === "sidebar" ? "block" : "none"

    if (DOM.framedClockThemeSetting) {
      DOM.framedClockThemeSetting.style.display =
        (style === "round" || style === "square") ? "block" : "none"
      if (DOM.framedClockThemeSelect) {
        DOM.framedClockThemeSelect.value = settings.framedClockTheme || "light"
      }
    }

    if (DOM.analogBlurBgCheckbox)
      DOM.analogBlurBgCheckbox.checked = settings.analogBlurBackground === true

    if (DOM.pageTitleInput) DOM.pageTitleInput.value = settings.pageTitle || "Start Page"
    if (DOM.tabIconInput) DOM.tabIconInput.value = settings.tabIcon || ""
    effectInstances.renderTabIconPreview(settings.tabIcon || "")

    if (DOM.clockSizeInput) DOM.clockSizeInput.value = settings.clockSize
    if (DOM.clockSizeValue)
      DOM.clockSizeValue.textContent = `${settings.clockSize}rem`
    if (DOM.dateSizeInput) DOM.dateSizeInput.value = String(baseDateSize)
    if (DOM.dateSizeValue)
      DOM.dateSizeValue.textContent = `${DOM.dateSizeInput.value}rem`

    if (DOM.languageSelect) DOM.languageSelect.value = settings.language || "en"
    if (DOM.accentColorPicker) DOM.accentColorPicker.value = settings.accentColor || "#a8c0ff"
    if (DOM.accentColorHexInput) {
      DOM.accentColorHexInput.value = (settings.accentColor || "#a8c0ff").toUpperCase()
    }
    if (DOM.accentColorSettingsBody) {
      const isOpen = settings.accentControlsOpen !== false
      DOM.accentColorSettingsBody.style.display = isOpen ? "block" : "none"
      DOM.accentColorToggleBtn?.setAttribute("aria-expanded", String(isOpen))
      if (DOM.accentColorToggleLabel) {
        const i18n = geti18n()
        DOM.accentColorToggleLabel.textContent =
          i18n[isOpen ? "settings_accent_close" : "settings_accent_open"] ||
          (isOpen ? "Hide Controls" : "Show Controls")
      }
    }
    DOM.clockColorPicker.value = settings.clockColor || "#ffffff"
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
    DOM.dateColorPicker.value = settings.dateColor || "#ffffff"

    // Custom Bookmark Inputs
    if (DOM.bookmarkFontSizeInput) {
      if (DOM.bookmarkFontSizeInput) DOM.bookmarkFontSizeInput.value = settings.bookmarkFontSize ?? 16
      if (DOM.bookmarkFontSizeValue && DOM.bookmarkFontSizeInput)
        DOM.bookmarkFontSizeValue.textContent = `${DOM.bookmarkFontSizeInput.value}px`

      if (DOM.bookmarkIconSizeInput) DOM.bookmarkIconSizeInput.value = settings.bookmarkIconSize ?? 42
      if (DOM.bookmarkIconSizeValue && DOM.bookmarkIconSizeInput)
        DOM.bookmarkIconSizeValue.textContent = `${DOM.bookmarkIconSizeInput.value}px`

      if (DOM.bookmarkGapInput) DOM.bookmarkGapInput.value = settings.bookmarkGap ?? 8
      if (DOM.bookmarkGapValue && DOM.bookmarkGapInput)
        DOM.bookmarkGapValue.textContent = `${DOM.bookmarkGapInput.value}px`

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
      if (DOM.bookmarkGroupFontSizeInput) {
        DOM.bookmarkGroupFontSizeInput.value =
          settings.bookmarkGroupFontSize ?? 14
        if (DOM.bookmarkGroupFontSizeValue)
          DOM.bookmarkGroupFontSizeValue.textContent = `${DOM.bookmarkGroupFontSizeInput.value}px`
      }

      if (DOM.bookmarkTextColorPicker) {
        DOM.bookmarkTextColorPicker.value =
          settings.bookmarkTextColor || "#ffffff"
      }
      if (DOM.hideBookmarkText) {
        DOM.hideBookmarkText.checked = settings.bookmarkHideText === true
      }
      if (DOM.hideBookmarkBg) {
        DOM.hideBookmarkBg.checked = settings.bookmarkHideBg === true
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
      if (DOM.bookmarkLimit20) {
        DOM.bookmarkLimit20.checked = settings.bookmarkLimit20 !== false
      }
    }

    DOM.bgSizeSelect.value = settings.bgSize || "cover"
    DOM.bgBlurInput.value = settings.bgBlur ?? 0
    DOM.bgBlurValue.textContent = `${settings.bgBlur ?? 0}px`
    DOM.bgBrightnessInput.value = settings.bgBrightness ?? 100
    DOM.bgBrightnessValue.textContent = `${settings.bgBrightness ?? 100}%`
    DOM.bgFadeInInput.value = settings.bgFadeIn ?? 0.5
    DOM.bgFadeInValue.textContent = `${settings.bgFadeIn ?? 0.5}s`
    DOM.bgPosXInput.value = settings.bgPositionX || 50
    DOM.bgPosXValue.textContent = `${DOM.bgPosXInput.value}%`
    DOM.bgPosYInput.value = settings.bgPositionY || 50
    DOM.bgPosYValue.textContent = `${DOM.bgPosYInput.value}%`

    DOM.unsplashCategorySelect.value =
      settings.unsplashCategory || "spring-wallpapers"
    if (DOM.unsplashAccessKeyInput)
      DOM.unsplashAccessKeyInput.value = settings.unsplashAccessKey || ""

    const isImageBg =
      settings.background &&
      !isIdbVideo(settings.background) &&
      (isIdbImage(settings.background) ||
        settings.background.startsWith("data:image/") ||
        settings.background.startsWith("blob:") ||
        settings.background.startsWith("http"))

    if (DOM.bgPositionSetting)
      DOM.bgPositionSetting.style.display = isImageBg ? "block" : "none"

    DOM.clockColorPicker.style.opacity = settings.clockColor ? "1" : "0.5"
    DOM.dateColorPicker.style.opacity = settings.dateColor ? "1" : "0.5"
    setEffectActive(DOM.effectGrid, settings.effect)

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
      DOM.gradientSettingsBody.style.display = isOpen ? "block" : "none"
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
        Math.min(5, Math.max(1, Number(settings.gradientExtraColorCount) || 2)),
      )
    }
    if (DOM.gradientCustomColors) {
      DOM.gradientCustomColors.value = settings.gradientCustomColors || ""
    }

    // Effect Color Inputs
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
        DOM.flashlightOpacityVal.textContent = (settings.flashlightOpacity ?? 0.9).toFixed(2)
      }
    }
    DOM.plantGrowthColorPicker.value = settings.plantGrowthColor || "#4caf50"
    DOM.oceanFishColorPicker.value = settings.oceanFishColor || "#ff7f50"
    DOM.floatingLinesColorPicker.value = settings.floatingLinesColor || "#ffffff"
    DOM.floatingLinesAngleInput.value = settings.floatingLinesAngle || 0
    DOM.floatingLinesAngleValue.textContent = `${settings.floatingLinesAngle || 0}°`

    DOM.rainHDColorPicker.value = settings.rainHDColor || "#99ccff"
    DOM.stormRainColorPicker.value = settings.stormRainColor || "#7dd3fc"
    DOM.wavyLinesColorPicker.value = settings.wavyLinesColor || "#00bcd4"
    DOM.oceanWaveColorPicker.value = settings.oceanWaveColor || "#0077b6"
    const oceanWavePos = settings.oceanWavePosition || "bottom"
    DOM.oceanWavePosBottomBtn.classList.toggle(
      "active",
      oceanWavePos === "bottom",
    )
    DOM.oceanWavePosTopBtn.classList.toggle("active", oceanWavePos === "top")
    DOM.cloudDriftColorPicker.value = settings.cloudDriftColor || "#0a0a0a"

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
      DOM.auroraWaveBgColorPicker.value = settings.auroraWaveBgColor || "#000000"
    }
    if (DOM.auroraWaveBgOpacitySlider) {
      const op = settings.auroraWaveBgOpacity ?? 0.15
      DOM.auroraWaveBgOpacitySlider.value = op
      if (DOM.auroraWaveBgOpacityVal) DOM.auroraWaveBgOpacityVal.textContent = op
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
      if (DOM.auroraWaveSpeedVal) DOM.auroraWaveSpeedVal.textContent = s.toFixed(1)
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
      DOM.pixelBlastCursorRadiusSlider.value = settings.pixelBlastCursorRadius || 150
      if (DOM.pixelBlastCursorRadiusVal) {
        DOM.pixelBlastCursorRadiusVal.textContent = settings.pixelBlastCursorRadius || 150
      }
    }
    if (DOM.pixelBlastRippleCheckbox) {
      DOM.pixelBlastRippleCheckbox.checked = settings.pixelBlastRipples !== false
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
      DOM.pixelBlastBgColorPicker.value = settings.pixelBlastBgColor || "#0a0a0a"
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
    if (DOM.stormRainColorSetting)
      DOM.stormRainColorSetting.style.display =
        settings.effect === "stormRain" ? "block" : "none"
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
        "stormRain",
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
      DOM.wavyPatternColor1Picker.value = settings.wavyPatternColor1 || "#AB3E5B"
    if (DOM.wavyPatternColor2Picker)
      DOM.wavyPatternColor2Picker.value = settings.wavyPatternColor2 || "#FFBE40"
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
    if (DOM.svgWaveSettings)
      DOM.svgWaveSettings.style.display = waveGeneratorOpen ? "block" : "none"
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
    renderUserSvgWaves(effectInstances.DOM, effectInstances.svgWaveEffect, () =>
      effectInstances.handleSettingUpdate("svgWaveActive", true),
    )
    renderLocalBackgrounds(
      effectInstances.DOM,
      effectInstances.handleSettingUpdate,
    )
    renderUserGradients(effectInstances.DOM)
    DOM.showTodoCheckbox.checked = settings.showTodoList !== false
    if (DOM.todoShowCheckboxesToggle) {
      DOM.todoShowCheckboxesToggle.checked =
        settings.todoShowCheckboxes !== false
    }
    DOM.showNotepadCheckbox.checked = settings.showNotepad !== false
    DOM.showTimerCheckbox.checked = settings.showTimer === true
    DOM.showGregorianCheckbox.checked = settings.showGregorian !== false
    DOM.showMusicCheckbox.checked = settings.musicPlayerEnabled === true
    if (DOM.musicPlayerUseDefaultColorCheckbox) {
      DOM.musicPlayerUseDefaultColorCheckbox.checked =
        settings.musicPlayerUseDefaultColor !== false
    }
    if (DOM.clockDisplaySelect) {
      DOM.clockDisplaySelect.value = settings.clockDisplayMode || "all"
    }
    DOM.showFullCalendarCheckbox.checked = settings.showFullCalendar === true
    if (DOM.freeMoveClockCheckbox)
      DOM.freeMoveClockCheckbox.checked = settings.freeMoveClock === true
    DOM.showLunarCalendarCheckbox.checked = settings.showLunarCalendar !== false
    if (DOM.lcpLunarCalendar) {
      DOM.lcpLunarCalendar.checked = settings.showLunarCalendar !== false
    }

    if (DOM.flipLayoutCheckbox) {
      DOM.flipLayoutCheckbox.checked = settings.flipLayout === true
    }
    if (DOM.lcpFlipLayout) {
      DOM.lcpFlipLayout.checked = settings.flipLayout === true
    }

    if (DOM.showDonateButtonCheckbox) {
      DOM.showDonateButtonCheckbox.checked = settings.showDonateButton !== false
    }
    DOM.showSearchBarCheckbox.checked = settings.showSearchBar !== false
    if (DOM.lcpSearchBar) {
      DOM.lcpSearchBar.checked = settings.showSearchBar !== false
    }
    if (DOM.showSearchAiIconCheckbox) {
      DOM.showSearchAiIconCheckbox.checked = settings.showSearchAIIcon !== false
    }
    if (DOM.searchBarWidthSlider) {
      DOM.searchBarWidthSlider.value = settings.searchBarWidth || 600
      if (DOM.searchBarWidthVal) {
        DOM.searchBarWidthVal.textContent = `${settings.searchBarWidth || 600}px`
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
      DOM.showQuickAccessBgCheckbox.checked = settings.showQuickAccessBg === true
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
    if (DOM.lcpBookmarkGroups) {
      DOM.lcpBookmarkGroups.checked = settings.showBookmarkGroups !== false
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
      "free-move-clock",
      settings.freeMoveClock === true,
    )
    document.body.classList.toggle("flip-layout", settings.flipLayout === true)
    document.body.classList.toggle(
      "free-move-custom-title",
      settings.freeMoveCustomTitle === true,
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
    if (DOM.showCustomTitleCheckbox) {
      DOM.showCustomTitleCheckbox.checked = settings.showCustomTitle !== false
    }
    if (DOM.freeMoveCustomTitleCheckbox) {
      DOM.freeMoveCustomTitleCheckbox.checked =
        settings.freeMoveCustomTitle === true
    }
    if (DOM.customTitleText) {
      DOM.customTitleText.value = settings.customTitleText || ""
      if (DOM.customTitleMulticolor)
        DOM.customTitleMulticolor.checked =
          settings.customTitleMulticolor === true
      if (DOM.customTitleColor)
        DOM.customTitleColor.value = settings.customTitleColor || "#ffffff"

      const fs = settings.customTitleFontSize || 24
      if (DOM.customTitleFontSize) DOM.customTitleFontSize.value = fs
      const fsd = document.getElementById("custom-title-fontsize-val")
      if (fsd) fsd.textContent = fs

      const ls = settings.customTitleLetterSpacing || 0
      if (DOM.customTitleLetterSpacing) DOM.customTitleLetterSpacing.value = ls
      const lsd = document.getElementById("custom-title-letter-spacing-val")
      if (lsd) lsd.textContent = ls

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
    if (DOM.lcpMusicUseDefaultColorCheckbox) {
      DOM.lcpMusicUseDefaultColorCheckbox.checked =
        settings.musicPlayerUseDefaultColor !== false
    }

    if (DOM.lcpMusicStyleSelect) {
      DOM.lcpMusicStyleSelect.value = settings.musicBarStyle || "vinyl"
    }

    // Highlight active background
    document.querySelectorAll(".local-bg-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.bgId === settings.background)
    })
    document.querySelectorAll(".user-color-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.bgId === settings.background)
    })
    document.querySelectorAll(".user-gradient-item").forEach((item) => {
      if (item.classList.contains("user-svg-wave-item")) {
        const isActive =
          settings.svgWaveActive &&
          !settings.background &&
          item.dataset.lines == settings.svgWaveLines &&
          item.dataset.ampx == settings.svgWaveAmplitudeX &&
          item.dataset.ampy == settings.svgWaveAmplitudeY &&
          item.dataset.startHue == settings.svgWaveStartHue &&
          item.dataset.endHue == settings.svgWaveEndHue
        item.classList.toggle("active", isActive)
      } else {
        const isActive =
          !settings.background &&
          !settings.svgWaveActive &&
          item.dataset.start === settings.gradientStart &&
          item.dataset.end === settings.gradientEnd &&
          item.dataset.angle === settings.gradientAngle
        item.classList.toggle("active", isActive)
      }
    })
  }
}

export { createApplySettings, createUpdateSettingsInputs }
