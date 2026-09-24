/**
 * Settings Applier Module
 * Core logic for applying settings to the page (applySettings and updateSettingsInputs)
 * Refactored to modular architecture
 */

import {
  getSettings,
  updateSetting,
} from "../../services/state.js"
import {
  initMacosHoverForBookmarks,
  updateBookmarkGroupsToggleIcon,
  renderBookmarks,
} from "../bookmarks.js"
import {
  getContrastYIQ,
  hexToRgb,
} from "../../utils/colors.js"
import {
  startTitleAutoUpdater,
} from "../../utils/dynamicTokens.js"
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
  buildGradientCss,
} from "./gradientManager.js"
import { buildMultiColorCss } from "./multiColorManager.js"
import { applyAccentTokens } from "../../boot/styles.js"
import { setClockStyleAccentVars } from "./clockAccent.js"
import {
  cssUrl,
  getBackgroundSizeValue,
  getBackgroundRepeatValue,
  applyBackgroundVideoLayout,
  configureBackgroundVideo,
  isVideoBackgroundValue,
  clearBackgroundVideo,
  attachVideoReadyListener,
} from "./backgroundApplier.js"
import {
  trimMediaCacheForProfile,
  getEffectPerformanceOptions,
  withPerformanceBudget,
  applyEffectPerformanceBudget,
} from "./performanceManager.js"
import { getCreatedEffect, EFFECT_KEY_MAP } from "./effectBadges.js"
import { createUpdateSettingsInputs } from "./settingsInputSyncer.js"

let _prevBg = null // Track last applied background for fade-in trigger
let _prevEffect = null // Track last selected effect to avoid unnecessary restart
let _currentBgToken = 0
let _bgFadeTimer = null

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

    // 1. Page Title & Real-time Auto-Updater
    startTitleAutoUpdater(() => getSettings()?.pageTitle || "Start Page")
    document.body.setAttribute(
      "data-layout-preset",
      settings.layoutPreset || "default",
    )
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
      "disable-search-bar-hover-scale",
      settings.searchBarHoverScale !== true,
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
      "bookmark-group-full-text",
      "hide-bookmark-text",
      "bookmark-long-text",
      "bookmark-full-text",
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
      const btn = document.querySelector(
        `.quick-btn[data-toggle="${toggleDataAttr}"]`,
      )
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
    qaToggleDisplay("habitTracker", settings.qaShowHabits)
    qaToggleDisplay("ambientSounds", settings.qaShowAmbient === true)
    qaToggleDisplay("aiAssistant", settings.qaShowAiAssistant === true)
    document.body.classList.toggle(
      "quick-access-transparent",
      settings.quickAccessSkin === "transparent",
    )
    document.body.classList.toggle(
      "quick-access-light-transparent",
      settings.quickAccessSkin === "light-transparent",
    )
    document.body.classList.toggle(
      "quick-access-light",
      settings.quickAccessSkin === "light",
    )
    document.body.classList.toggle(
      "quick-access-contrast",
      settings.quickAccessSkin === "contrast",
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
    document.body.classList.toggle(
      "perf-hover-mode",
      settings.perfHoverMode === true,
    )
    const reduceMotionSetting = settings.reduceMotion || "system"
    const shouldReduceMotion =
      reduceMotionSetting === "always" ||
      (reduceMotionSetting === "system" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)
    document.body.classList.toggle("reduce-motion", Boolean(shouldReduceMotion))

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
      habitTracker: "habit-tracker-container",
      ambientSounds: "ambient-sounds-container",
      aiAssistant: "ai-assistant-container",
    }

    Object.entries(widgetSkinsMap).forEach(([key, id]) => {
      const el = document.getElementById(id)
      if (el) {
        const skin =
          settings.widgetUseM3Accent === true
            ? "m3-accent"
            : settings[`${key}Skin`]
        el.classList.toggle("skin-white-blur", skin === "white-blur")
        el.classList.toggle("skin-m3-accent", skin === "m3-accent")
        el.classList.toggle("skin-transparent", skin === "transparent")
        el.classList.toggle(
          "skin-light-transparent",
          skin === "light-transparent",
        )
        el.classList.toggle("skin-vertical-card", skin === "vertical-card")
        el.classList.toggle("skin-horizontal-card", skin === "horizontal-card")
        el.classList.toggle("skin-gameboy", skin === "gameboy")
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
            wrapper.classList.toggle(
              "skin-light-transparent",
              skin === "light-transparent",
            )
            wrapper.classList.toggle(
              "skin-vertical-card",
              skin === "vertical-card",
            )
            wrapper.classList.toggle(
              "skin-horizontal-card",
              skin === "horizontal-card",
            )
            wrapper.classList.toggle("skin-gameboy", skin === "gameboy")
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
      isIdbMedia(rawBg) && settings.lastUserBackgroundPreview && isFirstLoad,
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
    const isStaticGradient =
      !settings.background && !isAnimatedBg && !isMultiColorActive

    let shouldApplyBackgroundLogic =
      bgChanged ||
      isAnimatedBg ||
      settings.splashCursorActive ||
      isMultiColorActive ||
      isStaticGradient
    if (isWaitingForIdb) {
      shouldApplyBackgroundLogic = false

      // Start IDB media async load
      import("../../services/imageStore.js").then((m) => {
        m.getImageUrl(rawBg)
          .then((url) => {
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
          })
          .catch(() => {
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
      const isImageUrl =
        typeof rawBg === "string" && rawBg.match(/^https?:\/\//)
      if (isVideoUrl || isImageUrl) {
        document.body.classList.add("bg-image-active")
      } else {
        document.body.classList.add("bg-layer-active")
      }
    } else {
      document.body.classList.add("bg-layer-active")
    }

    const currentBgToken = ++_currentBgToken

    const shouldCarryFadeLayer =
      (bgChanged || isWaitingForIdb) &&
      (isNextPredefinedLocalBg || isNextImageBg || isNextVideoBg) &&
      (!isFirstLoad || previewExists)

    function triggerBgFadeOut() {
      document.body.classList.remove("preload-bg-ready", "preload-bg-preview")
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const _bgFadeLayer = document.getElementById("bg-fade-layer")
          if (_bgFadeLayer) {
            _bgFadeLayer.style.opacity = "0"
            const fadeInSec = Number(getSettings().bgFadeIn ?? 0.5)
            if (_bgFadeTimer) {
              clearTimeout(_bgFadeTimer)
              _bgFadeTimer = null
            }
            _bgFadeTimer = window.setTimeout(
              () => {
                if (_bgFadeLayer.style.opacity === "0") {
                  _bgFadeLayer.className = ""
                  _bgFadeLayer.style.background = ""
                  _bgFadeLayer.style.backgroundImage = ""
                  _bgFadeLayer.style.backgroundSize = ""
                  _bgFadeLayer.style.backgroundRepeat = ""
                }
                _bgFadeTimer = null
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
      if (bgChanged) {
        trimMediaMemory({
          keepIds: [rawBg],
          includeThumbnails: false,
          maxUrls: 2,
        })
      }
      if (!isFirstLoad) {
        document.body.classList.remove("preload-bg-ready", "preload-bg-preview")
        document.body.style.background = ""
        document.body.style.backgroundImage = ""
        if (shouldCarryFadeLayer && bgLayer && bgFadeLayer) {
          if (_bgFadeTimer) {
            clearTimeout(_bgFadeTimer)
            _bgFadeTimer = null
          }
          bgFadeLayer.style.transition = "none"
          bgFadeLayer.className = bgLayer.className
          bgFadeLayer.style.background = bgLayer.style.background

          let currentBg = bgLayer.style.backgroundImage
          if (
            isFirstLoad &&
            previewExists &&
            settings.lastUserBackgroundPreview
          ) {
            currentBg = cssUrl(settings.lastUserBackgroundPreview)
          }
          bgFadeLayer.style.backgroundImage = currentBg
          bgFadeLayer.style.backgroundSize = bgLayer.style.backgroundSize
          bgFadeLayer.style.backgroundRepeat = bgLayer.style.backgroundRepeat
          bgFadeLayer.style.backgroundPosition =
            bgLayer.style.backgroundPosition
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
          if (_bgFadeTimer) {
            clearTimeout(_bgFadeTimer)
            _bgFadeTimer = null
          }
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
          if (
            !isNextPredefinedLocalBg &&
            !isNextImageBg &&
            !isNextVideoBg &&
            !isAnimatedBg
          ) {
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
        const hasPreloadPreview =
          document.body.classList.contains("preload-bg-preview")
        if (hasPreloadPreview && bgFadeLayer) {
          // Snapshot the current blurry preview state into the fade layer so it
          // can smoothly fade out while bg-layer shows the crisp image.
          // NOTE: preload.js sets bg via CSS stylesheet (not inline style), so
          // we must use getComputedStyle to read the actual background-image value.
          const computedBg = window.getComputedStyle(bgLayer)
          const snapshotBgImage =
            bgLayer.style.backgroundImage ||
            (settings.lastUserBackgroundPreview
              ? `url(${JSON.stringify(settings.lastUserBackgroundPreview)})`
              : computedBg.backgroundImage) ||
            computedBg.backgroundImage
          bgFadeLayer.style.transition = "none"
          bgFadeLayer.style.background = ""
          bgFadeLayer.style.backgroundImage = snapshotBgImage
          bgFadeLayer.style.backgroundSize =
            bgLayer.style.backgroundSize ||
            computedBg.backgroundSize ||
            backgroundSize
          bgFadeLayer.style.backgroundRepeat =
            bgLayer.style.backgroundRepeat ||
            computedBg.backgroundRepeat ||
            backgroundRepeat
          bgFadeLayer.style.backgroundPosition =
            bgLayer.style.backgroundPosition ||
            "var(--bg-pos-x) var(--bg-pos-y)"
          // Apply the same blur/scale the preview was using so it looks identical
          bgFadeLayer.style.filter = "blur(8px) brightness(0.9)"
          bgFadeLayer.style.transform = "scale(1.02) translateZ(0)"
          bgFadeLayer.style.opacity = "1"
          bgFadeLayer.offsetHeight // force reflow
          bgFadeLayer.style.transition = "" // restore CSS transition

          // Now immediately clear the preview state from bg-layer so the real
          // image will appear without blur once decoded.
          document.body.classList.remove(
            "preload-bg-preview",
            "preload-bg-ready",
          )

          // PRE-SET the real image on bg-layer SYNCHRONOUSLY so there's never
          // a blank frame between fade-layer fading out and bg-layer appearing.
          bgLayer.style.backgroundImage = cssUrl(imageUrl)
          bgLayer.style.backgroundSize = backgroundSize
          bgLayer.style.backgroundRepeat = backgroundRepeat
        }

        const img = new Image()

        const applyStyles = () => {
          if (currentBgToken !== _currentBgToken) return
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
          img
            .decode()
            .then(applyStyles)
            .catch(() => {
              if (currentBgToken !== _currentBgToken) return
              applyStyles()
            })
        } else {
          img.onload = applyStyles
          img.onerror = () => {
            if (currentBgToken !== _currentBgToken) return
            document.body.classList.remove("preload-bg-preview")
            triggerBgFadeOut()
          }
          img.src = imageUrl
        }
      }

      const applyUserSelectedBackground = () => {
        if (isPredefinedLocalBg) {
          if (bgLayer) {
            bgLayer.className = "" // Clear old bg classes
            bgLayer.classList.add(bg)
          }
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
              attachVideoReadyListener(bgVideoElement, triggerBgFadeOut)
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
              attachVideoReadyListener(bgVideoElement, triggerBgFadeOut)
            }
            document.documentElement.style.setProperty(
              "--text-color",
              "#ffffff",
            )
          } else if (bg.match(/^https?:\/\//)) {
            if (bgLayer) {
              setBackgroundImageSmoothly(bg)
            }
            document.documentElement.style.setProperty(
              "--text-color",
              "#ffffff",
            )
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
        const gradientV2Options = withPerformanceBudget(
          settings,
          "gradientV2",
          {
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
          },
        )
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
      else if (
        settings.lightPillarActive &&
        effectInstances.lightPillarEffect
      ) {
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
      else if (
        settings.liquidEtherActive &&
        effectInstances.liquidEtherEffect
      ) {
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
          } else if (
            settings.splashCursorActive &&
            settings.splashCursorDarkBg === true
          ) {
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
            attachVideoReadyListener(bgVideoElement, triggerBgFadeOut)
          }
        } else {
          if (bgLayer) {
            let imageUrl = bg
            if (isIdbMedia(bg)) imageUrl = getBlobUrlSync(bg)
            if (imageUrl) {
              if (isFirstLoad) {
                // Snapshot the blurry preview into bg-fade-layer BEFORE touching
                // bg-layer so the real image appears crisp without a blur flash.
                const _hasPrev =
                  document.body.classList.contains("preload-bg-preview")
                if (_hasPrev && bgFadeLayer) {
                  const _computedBg = window.getComputedStyle(bgLayer)
                  const _snapshotBgImage =
                    bgLayer.style.backgroundImage ||
                    (settings.lastUserBackgroundPreview
                      ? `url(${JSON.stringify(settings.lastUserBackgroundPreview)})`
                      : _computedBg.backgroundImage) ||
                    _computedBg.backgroundImage
                  bgFadeLayer.style.transition = "none"
                  bgFadeLayer.style.background = ""
                  bgFadeLayer.style.backgroundImage = _snapshotBgImage
                  bgFadeLayer.style.backgroundSize =
                    bgLayer.style.backgroundSize ||
                    _computedBg.backgroundSize ||
                    backgroundSize
                  bgFadeLayer.style.backgroundRepeat =
                    bgLayer.style.backgroundRepeat ||
                    _computedBg.backgroundRepeat ||
                    backgroundRepeat
                  bgFadeLayer.style.backgroundPosition =
                    bgLayer.style.backgroundPosition ||
                    "var(--bg-pos-x) var(--bg-pos-y)"
                  bgFadeLayer.style.filter = "blur(8px) brightness(0.9)"
                  bgFadeLayer.style.transform = "scale(1.02) translateZ(0)"
                  bgFadeLayer.style.opacity = "1"
                  bgFadeLayer.offsetHeight // force reflow
                  bgFadeLayer.style.transition = ""
                  document.body.classList.remove(
                    "preload-bg-preview",
                    "preload-bg-ready",
                  )
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
                  document.body.classList.remove(
                    "preload-bg-preview",
                    "preload-bg-ready",
                  )
                  const _imgFirst = new Image()
                  const _applyFirst = () => {
                    if (currentBgToken !== _currentBgToken) return
                    bgLayer.style.backgroundSize = backgroundSize
                    bgLayer.style.backgroundRepeat = backgroundRepeat
                    triggerBgFadeOut()
                  }
                  if (typeof _imgFirst.decode === "function") {
                    _imgFirst.src = imageUrl
                    _imgFirst
                      .decode()
                      .then(_applyFirst)
                      .catch(() => {
                        if (currentBgToken !== _currentBgToken) return
                        _applyFirst()
                      })
                  } else {
                    _imgFirst.onload = _applyFirst
                    _imgFirst.onerror = () => {
                      if (currentBgToken !== _currentBgToken) return
                      _applyFirst()
                    }
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
                  if (currentBgToken !== _currentBgToken) return
                  bgLayer.style.backgroundSize = backgroundSize
                  bgLayer.style.backgroundRepeat = backgroundRepeat
                  triggerBgFadeOut()
                }
                if (typeof img.decode === "function") {
                  img.src = imageUrl
                  img
                    .decode()
                    .then(applyStyles)
                    .catch(() => {
                      if (currentBgToken !== _currentBgToken) return
                      applyStyles()
                    })
                } else {
                  img.onload = applyStyles
                  img.onerror = () => {
                    if (currentBgToken !== _currentBgToken) return
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
            attachVideoReadyListener(bgVideoElement, triggerBgFadeOut)
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
                if (currentBgToken !== _currentBgToken) return
                bgLayer.style.backgroundImage = cssUrl(bg)
                bgLayer.style.backgroundSize = backgroundSize
                bgLayer.style.backgroundRepeat = backgroundRepeat
                document.body.classList.remove("preload-bg-preview")
                triggerBgFadeOut()
              }
              if (typeof img.decode === "function") {
                img.src = bg
                img
                  .decode()
                  .then(applyStyles)
                  .catch(() => {
                    if (currentBgToken !== _currentBgToken) return
                    applyStyles()
                  })
              } else {
                img.onload = applyStyles
                img.onerror = () => {
                  if (currentBgToken !== _currentBgToken) return
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

    const effectMap = {
      gradientV2: "gradientV2Effect",
      neonGrid: "neonGridEffect",
    }

    // Cleanup: stop only background effects that have actually been created.
    const gradientV2Effect = getCreatedEffect(
      effectInstances,
      "gradientV2Effect",
    )
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
    const blurVal = settings.bgBlur ?? 0
    const blurDirection = settings.bgBlurDirection || "none"
    const blurColor = settings.bgBlurColor || "#000000"
    const blurOpacity = settings.bgBlurColorOpacity || 0

    const mainBlurStr =
      blurDirection === "none" ? `blur(${blurVal}px)` : `blur(0px)`

    const filters = [
      mainBlurStr,
      `brightness(${settings.bgBrightness ?? 100}%)`,
      `contrast(${settings.bgContrast ?? 100}%)`,
      `saturate(${settings.bgSaturation ?? 100}%)`,
    ].join(" ")

    document.documentElement.style.setProperty("--bg-filter", filters)

    const overlay = document.getElementById("bg-directional-blur-overlay")
    if (overlay) {
      if (blurDirection !== "none" || blurOpacity > 0) {
        overlay.style.display = "block"
        overlay.style.backdropFilter =
          blurDirection !== "none" ? `blur(${blurVal}px)` : "none"
        overlay.style.webkitBackdropFilter =
          blurDirection !== "none" ? `blur(${blurVal}px)` : "none"

        let maskStr = "none"
        if (blurDirection === "left-to-right") {
          maskStr = "linear-gradient(to right, black 0%, transparent 100%)"
        } else if (blurDirection === "right-to-left") {
          maskStr = "linear-gradient(to left, black 0%, transparent 100%)"
        } else if (blurDirection === "top-to-bottom") {
          maskStr = "linear-gradient(to bottom, black 0%, transparent 100%)"
        } else if (blurDirection === "bottom-to-top") {
          maskStr = "linear-gradient(to top, black 0%, transparent 100%)"
        }

        overlay.style.maskImage = maskStr
        overlay.style.webkitMaskImage = maskStr

        if (blurOpacity > 0) {
          overlay.style.backgroundColor = `color-mix(in srgb, ${blurColor} ${blurOpacity}%, transparent)`
        } else {
          overlay.style.backgroundColor = "transparent"
        }
      } else {
        overlay.style.display = "none"
        overlay.style.backdropFilter = "none"
        overlay.style.webkitBackdropFilter = "none"
        overlay.style.backgroundColor = "transparent"
      }
    }

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
    const rawFont = settings.font || "'Space Grotesk', sans-serif"
    const rawClockFont =
      settings.clockFont || settings.font || "'Space Grotesk', sans-serif"

    const isRestrictedFont = (f) =>
      f.includes("Electroharmonix") ||
      f.includes("Anurati") ||
      f.includes("E1234")

    const primaryFont = isRestrictedFont(rawFont)
      ? "'Space Grotesk', sans-serif"
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
      `${settings.searchBarWidth || 750}px`,
    )
    document.documentElement.style.setProperty(
      "--search-bar-blur",
      `${settings.searchBarBlur ?? 20}px`,
    )
    document.documentElement.style.setProperty(
      "--search-bar-radius",
      `${settings.searchBarRadius ?? 20}px`,
    )

    const searchStyle = settings.searchBarStyle || "glass"
    document.body.classList.remove(
      "search-style-glass",
      "search-style-glow",
      "search-style-aurora",
      "search-style-sunset",
      "search-style-minimal",
      "search-style-oled",
      "search-style-custom",
    )
    document.body.classList.add(`search-style-${searchStyle}`)
    if (searchStyle === "custom") {
      document.documentElement.style.setProperty(
        "--search-custom-bg",
        settings.searchBarBgColor || "#1a1d24",
      )
      document.documentElement.style.setProperty(
        "--search-custom-text",
        settings.searchBarTextColor || "#ffffff",
      )
      document.documentElement.style.setProperty(
        "--search-custom-border",
        settings.searchBarBorderColor || "#6366f1",
      )
    }

    // Bookmark Custom Styling
    document.documentElement.style.setProperty(
      "--bookmark-font-size",
      `${settings.bookmarkFontSize ?? 10}px`,
    )
    document.documentElement.style.setProperty(
      "--bookmark-font-weight",
      String(settings.bookmarkFontWeight ?? 600),
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
      "--bookmark-group-font-weight",
      String(settings.bookmarkGroupFontWeight ?? 500),
    )
    document.documentElement.style.setProperty(
      "--sidebar-section-weight",
      String(settings.sidebarSectionFontWeight ?? 600),
    )
    document.documentElement.style.setProperty(
      "--sidebar-label-weight",
      String(settings.sidebarLabelFontWeight ?? 400),
    )
    document.documentElement.style.setProperty(
      "--sidebar-nav-weight",
      String(settings.sidebarNavFontWeight ?? 500),
    )
    document.documentElement.style.setProperty(
      "--sidebar-value-weight",
      String(settings.sidebarValueFontWeight ?? 500),
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

    if (settings.bookmarkFullText) {
      document.body.classList.add("bookmark-full-text")
    } else {
      document.body.classList.remove("bookmark-full-text")
    }

    if (settings.bookmarkGroupLongText) {
      document.body.classList.add("bookmark-group-long-text")
    } else {
      document.body.classList.remove("bookmark-group-long-text")
    }

    if (settings.bookmarkGroupFullText) {
      document.body.classList.add("bookmark-group-full-text")
    } else {
      document.body.classList.remove("bookmark-group-full-text")
    }

    document.body.classList.remove(
      "bookmark-group-rows-1",
      "bookmark-group-rows-2",
      "bookmark-group-rows-3",
    )
    if (settings.bookmarkGroupMaxRows && settings.bookmarkGroupMaxRows !== "auto") {
      document.body.classList.add(`bookmark-group-rows-${settings.bookmarkGroupMaxRows}`)
    }

    if (settings.bookmarkHideBg) {
      document.body.classList.add("hide-bookmark-bg")
    } else {
      document.body.classList.remove("hide-bookmark-bg")
    }

    document.body.classList.add("auto-hide-groups-toggle")

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
    let layoutChanged = false
    if (targetClass === null) {
      if (layoutClasses.some((c) => document.body.classList.contains(c))) {
        document.body.classList.remove(...layoutClasses)
        layoutChanged = true
      }
    } else if (!document.body.classList.contains(targetClass)) {
      document.body.classList.remove(...layoutClasses)
      document.body.classList.add(targetClass)
      layoutChanged = true
    }
    updateBookmarkGroupsToggleIcon()
    if (layoutChanged) {
      renderBookmarks()
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "bookmarkLayout", value: layout },
        }),
      )
    }

    let bgStyle = settings.bookmarkLayoutBgStyle || "default"
    let bgColor = settings.bookmarkLayoutBgColor || ""
    let itemStyle = settings.bookmarkItemStyle || "default"

    document.body.classList.remove(
      "bookmark-layout-bg-hidden",
      "bookmark-layout-bg-white",
      "bookmark-layout-bg-m3-accent",
      "bookmark-layout-bg-colored",
      "bookmark-item-card-style",
      "bookmark-item-glass-style",
      "bookmark-item-neon-style",
      "bookmark-item-neumorphism-style",
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
      const textCol =
        getContrastYIQ(bgColor) === "black" ? "#1e293b" : "#ffffff"
      document.documentElement.style.setProperty(
        "--bookmark-layout-text-color",
        textCol,
      )
    }

    if (["card", "glass", "neon", "neumorphism"].includes(itemStyle)) {
      document.body.classList.add("bookmark-item-card-style")
      if (itemStyle !== "card") {
        document.body.classList.add(`bookmark-item-${itemStyle}-style`)
      }
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
      "date-clock-style-space-concentric",
      "date-clock-style-audio-wave",
      "date-clock-style-split-pill",
      "date-clock-style-clock-3d",
      "date-clock-style-macos-vintage",
      "date-clock-style-aquarium",
    )
    document.body.classList.add(`date-clock-style-${dateClockStyle}`)

    // Apply sidestyle alignment body class
    document.body.classList.remove(
      "sidestyle-align-left",
      "sidestyle-align-center",
      "sidestyle-align-right",
      "sidestyle-no-border",
      "audio-wave-pos-top",
      "audio-wave-pos-bottom",
      "audio-wave-pos-left",
      "audio-wave-pos-right",
      "audio-wave-style-bars",
      "audio-wave-style-dots",
      "audio-wave-style-smooth",
      "audio-wave-style-pixel",
      "audio-wave-style-thin",
      "audio-wave-style-pulseglow",
      "audio-wave-float-enabled",
    )
    if (dateClockStyle === "sidestyle") {
      const align = settings.sidestyleAlign || "left"
      document.body.classList.add(`sidestyle-align-${align}`)
      if (settings.sidestyleNoBorder) {
        document.body.classList.add("sidestyle-no-border")
      }
    } else if (dateClockStyle === "audio-wave") {
      const pos = settings.audioWavePosition || "bottom"
      document.body.classList.add(`audio-wave-pos-${pos}`)

      const waveStyle = settings.audioWaveStyle || "bars"
      document.body.classList.add(`audio-wave-style-${waveStyle}`)

      const floatEnabled = settings.audioWaveFloatEnabled !== false
      if (floatEnabled) {
        document.body.classList.add("audio-wave-float-enabled")
      }

      const scale = settings.audioWaveScale || 1
      document.body.style.setProperty("--aw-scale", scale)

      const speed = settings.audioWaveSpeed || 1
      document.body.style.setProperty("--aw-speed", speed)

      const autoColor = settings.audioWaveAutoColor !== false // default true
      if (autoColor) {
        document.body.style.setProperty(
          "--aw-color",
          "rgb(var(--global-accent-color-rgb, 0, 255, 102))",
        )
      } else {
        document.body.style.setProperty(
          "--aw-color",
          settings.audioWaveCustomColor || "#00ff66",
        )
      }
    } else if (dateClockStyle === "glass-float") {
      document.body.classList.remove(
        "gf-anim-float",
        "gf-anim-pulse",
        "gf-anim-shake",
        "gf-anim-glitch",
        "gf-anim-bug",
        "gf-anim-wave",
        "gf-anim-none",
      )
      const gfAnim = settings.gfAnimation || "float"
      document.body.classList.add(`gf-anim-${gfAnim}`)

      const glowRgb = hexToRgb(settings.gfGlowColor || "#ffffff")
      if (glowRgb) {
        document.body.style.setProperty("--gf-glow-r", glowRgb.r)
        document.body.style.setProperty("--gf-glow-g", glowRgb.g)
        document.body.style.setProperty("--gf-glow-b", glowRgb.b)
      }
      document.body.style.setProperty(
        "--gf-glow-a",
        settings.gfGlowIntensity !== undefined ? settings.gfGlowIntensity : 0.3,
      )
    }

    document.body.classList.toggle("flip-layout", settings.flipLayout === true)
    document.body.classList.toggle(
      "quick-access-horizontal",
      settings.quickAccessHorizontal === true,
    )

    // Fliqlo Theme
    document.body.classList.remove(
      "fliqlo-theme-dark",
      "fliqlo-theme-light",
      "fliqlo-theme-glass",
      "fliqlo-theme-terminal",
      "fliqlo-theme-sakura",
      "fliqlo-theme-walnut",
      "fliqlo-theme-cyberpunk",
      "fliqlo-theme-divergence",
    )
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
      "context-menu-light-transparent",
      "context-menu-transparent",
      "context-menu-macos",
      "context-menu-m3",
    )
    const contextMenuStyle = settings.contextMenuStyle || "dark"
    document.body.classList.add(`context-menu-${contextMenuStyle}`)
    if (contextMenuStyle === "light-transparent") {
      document.body.classList.add("context-menu-none")
    } else if (contextMenuStyle === "none") {
      document.body.classList.add("context-menu-light-transparent")
    }
    document.body.classList.toggle(
      "context-menu-mini",
      settings.contextMenuMini === true,
    )

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
      "space-concentric",
      "audio-wave",
      "satellite",
      "pixel-hud",
      "split-pill",
      "clock-3d",
      "macos-vintage",
      "aquarium",
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
      !isClockStyleTransparentBackground &&
        effectiveClockStyleBackground === "dark",
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
      dateClockStyle === "media-orb" &&
        settings.mediaOrbOverflowBorder === true,
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

      // If Fliqlo is active and theme is light, or Split Pill on default/light bg, fallback to black
      const isFliqloLight =
        settings.dateClockStyle === "fliqlo" && settings.fliqloTheme === "light"
      const isSplitPillLight =
        settings.dateClockStyle === "split-pill" &&
        (!settings.clockStyleBackground ||
          settings.clockStyleBackground === "default" ||
          settings.clockStyleBackground === "light") &&
        settings.clockStyleBackground !== "transparent" &&
        settings.clockStyleTransparentBackground !== true

      if (isFliqloLight || isSplitPillLight) {
        fallbackColor = "#111111"
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

    if (settings.clockColor) {
      document.documentElement.style.setProperty(
        "--split-pill-clock-color",
        settings.clockColor,
      )
    } else {
      document.documentElement.style.removeProperty("--split-pill-clock-color")
    }

    if (settings.dateColor) {
      document.documentElement.style.setProperty(
        "--split-pill-date-color",
        settings.dateColor,
      )
    } else {
      document.documentElement.style.removeProperty("--split-pill-date-color")
    }

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
      effectToStart && effectToStart !== "none"
        ? effectInstances[mappedKey]
        : null
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
            mist: settings.pixelWeatherMist !== undefined ? settings.pixelWeatherMist : true,
          }),
        )
      }
    }

    if ((effectToStart === "galaxy" || effectToStart === "rainHD") && selectedEffect) {
      if (selectedEffect.setMode) {
        const mode = effectToStart === "rainHD" ? "storm" : (settings.rainMode || "chill")
        selectedEffect.setMode(mode)
      }
      if (selectedEffect.setOptions) {
        selectedEffect.setOptions({
          speed: settings.rainSpeed !== undefined ? settings.rainSpeed : 1.0,
          density: settings.rainDensity !== undefined ? settings.rainDensity : 1.0,
          mist: settings.rainMist !== undefined ? settings.rainMist : true,
          color: effectToStart === "rainHD" ? (settings.rainHDColor || "#99ccff") : (settings.starColor || "#99ccff"),
        })
      }
    }

    if ((effectToStart === "fireflies" || effectToStart === "firefliesHD") && selectedEffect) {
      if (selectedEffect.setMode) {
        selectedEffect.setMode(settings.firefliesMode || "enchanted")
      }
      if (selectedEffect.updateColor) {
        selectedEffect.updateColor(settings.firefliesColor || "#ffe855")
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

    if (effectToStart === "cloudDrift" && selectedEffect) {
      if (selectedEffect.setOptions) {
        selectedEffect.setOptions({
          color: settings.cloudDriftColor || "#f0f4f8",
          mood: settings.cloudDriftMood || "daylight",
          opacity: settings.cloudDriftOpacity !== undefined ? settings.cloudDriftOpacity : 0.65,
          speed: settings.cloudDriftSpeed !== undefined ? settings.cloudDriftSpeed : 1.0,
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

    if (effectToStart === "crtScanlines" && selectedEffect) {
      if (selectedEffect.setOptions) {
        selectedEffect.setOptions({
          scanColor: settings.crtScanColor || "#7cffad",
          scanFrequency: settings.crtScanFrequency ?? 0.11,
          scanAngle: settings.crtScanAngle ?? 0,
          scanDensity: settings.crtScanDensity ?? 4,
          gamma: settings.crtGamma ?? 0.45,
          backgroundColor: settings.crtBackgroundColor || "#000000",
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
          notes: settings.auroraWaveNotes !== false,
        }),
      )
    }

    if (
      effectToStart === "musicBars" &&
      selectedEffect
    ) {
      if (selectedEffect.updateColor) {
        selectedEffect.updateColor(settings.musicBarsColor || "#8be9fd")
      }
      if (selectedEffect.setNotes) {
        selectedEffect.setNotes(settings.musicBarsNotes !== false)
      }
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
        speed: settings.northernLightsSpeed !== undefined ? settings.northernLightsSpeed : 1.0,
        stars: settings.northernLightsStars !== false,
        meteors: settings.northernLightsMeteors !== false,
        transparent: settings.northernLightsTransparent !== false,
      })
    }

    if (effectToStart === "oceanWave" && selectedEffect) {
      selectedEffect.updateColor?.(settings.oceanWaveColor || "#ffffff")
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
          enableMouseInteraction: false,
          mouseInfluence: 0,
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
    if (
      effectToStart === "neonGrid" &&
      selectedEffect &&
      selectedEffect.setOptions
    ) {
      selectedEffect.setOptions({
        fullScreen: settings.synthwaveFullScreen === true,
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
      // Apply saved leaf type for leaves effects
      if (
        (effectToStart === "autumnLeaves" ||
          effectToStart === "greenLeaves" ||
          effectToStart === "fallingLeavesSettled") &&
        selectedEffect.setLeafType
      ) {
        selectedEffect.setLeafType(
          settings.fallingLeavesSkin ||
            (effectToStart === "greenLeaves" ? "simple" : "maple"),
        )
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
      if (selectedEffect) {
        if (typeof selectedEffect.setMouseEnabled === "function") {
          selectedEffect.setMouseEnabled(
            settings.effectMouseInteraction !== false,
          )
        } else {
          selectedEffect.mouseEnabled =
            settings.effectMouseInteraction !== false
        }
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
      // Signal layout update instead of global resize to prevent resetting heavy animations
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "forceLayoutSync" },
        }),
      )
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


export { createApplySettings, createUpdateSettingsInputs }
export { markEffectsWithCustomBadges, EFFECTS_WITH_CUSTOM_SETTINGS } from "./effectBadges.js"
