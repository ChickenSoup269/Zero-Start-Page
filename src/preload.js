;(function () {
  try {
    const body = document.body
    const shouldShowStartupLoader =
      localStorage.getItem("startpageShowStartupLoader") === "1" ||
      (!localStorage.getItem("startpageHasOpened") &&
        !localStorage.getItem("pageSettings"))

    if (!shouldShowStartupLoader && body) {
      body.classList.remove("loading-state")
      body.classList.add("skip-startup-loader", "is-booting")

      // MV3 CSP compliant: Synchronously format clock/date using MutationObserver as they are parsed
      try {
        const observer = new MutationObserver((mutations, obs) => {
          const clock = document.getElementById("clock")
          const date = document.getElementById("date")
          if (clock && date) {
            obs.disconnect()
            try {
              const settingsRaw = localStorage.getItem("pageSettings")
              const settings = settingsRaw ? JSON.parse(settingsRaw) : {}
              const dateClockStyle = settings.dateClockStyle || "default"
              if (dateClockStyle !== "cartoon" && dateClockStyle !== "c4-bomb" && dateClockStyle !== "fliqlo") {
                const now = new Date()
                const use12Hour = settings.timeFormat === "12h"
                const hideSeconds = settings.hideSeconds
                const langCode = settings.language === "vi" ? "vi-VN" : settings.language === "zh" ? "zh-CN" : "en-US"
                const tz = settings.timezone && settings.timezone !== "local" ? settings.timezone : undefined
                
                const timeOptions = hideSeconds
                  ? { hour12: use12Hour, hour: "2-digit", minute: "2-digit", timeZone: tz }
                  : { hour12: use12Hour, hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz }
                
                clock.textContent = now.toLocaleTimeString(langCode, timeOptions)
                
                if (settings.showDate !== false && settings.showGregorian !== false) {
                  const dateOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: tz }
                  date.textContent = now.toLocaleDateString(langCode, dateOptions)
                }
              }
            } catch (e) {
              console.error("Early clock sync error:", e)
            }
          }
        })
        observer.observe(document.documentElement, { childList: true, subtree: true })
      } catch (e) {
        console.warn("Could not register early clock observer:", e)
      }
    }

    let settings = null
    const raw = localStorage.getItem("pageSettings")
    if (raw) {
      settings = JSON.parse(raw)
    }

    if (settings) {
      // FAST BOOT LAYOUT CLASSES
      let layout = settings.bookmarkLayout || "default"
      if (settings.bookmarkSidebarMode === true && layout === "default") {
        layout = "sidebar"
      }
      if (layout === "sidebar-left") layout = "sidebar"

      if (layout === "sidebar") body.classList.add("bookmark-sidebar-mode")
      else if (layout === "taskbar") body.classList.add("bookmark-taskbar-mode")
      else if (layout === "taskbar-top")
        body.classList.add("bookmark-taskbar-top-mode")
      else if (layout === "taskbar-left")
        body.classList.add("bookmark-taskbar-left-mode")
      else if (layout === "taskbar-right")
        body.classList.add("bookmark-taskbar-right-mode")

      if (settings.flipLayout) body.classList.add("flip-layout")
      if (settings.allowTextSelection === true)
        body.classList.add("allow-text-selection")
      if (settings.bookmarkGroupShowCount === false)
        body.classList.add("bookmark-group-count-hidden")
      if (settings.bookmarkGroupAutoTextContrast === true)
        body.classList.add("bookmark-group-auto-text-contrast")
      if (settings.hideBookmarkText) body.classList.add("hide-bookmark-text")
      if (settings.bookmarkLongText) body.classList.add("bookmark-long-text")
      if (settings.hideBookmarkBg) body.classList.add("hide-bookmark-bg")
      if (settings.bookmarkGroupUseAccent === true)
        body.classList.add("bookmark-group-accent-enabled")
      if (settings.bookmarkGroupKeepBgOnInteraction !== false)
        body.classList.add("bookmark-group-keep-bg-on-interaction")
      if ((settings.bookmarkGroupBgOpacity ?? 0) <= 0)
        body.classList.add("bookmark-group-tab-bg-transparent")
      if (settings.bookmarkGroupContainerBgHidden === true)
        body.classList.add("bookmark-group-container-bg-hidden")
      if (settings.bookmarkGroupBorderHidden === true)
        body.classList.add("bookmark-group-border-hidden")
      if (settings.showTopRightControls !== false)
        body.classList.add("has-top-right-controls")
      else body.classList.add("hide-top-right-controls")
      if (settings.showSearchBar === false)
        body.classList.add("hide-search-bar")
      if (settings.freeMoveSearchBar === true)
        body.classList.add("free-move-search-bar")

      let bgStyle = settings.bookmarkLayoutBgStyle || "default"
      if (bgStyle === "hidden") body.classList.add("bookmark-layout-bg-hidden")
      else if (bgStyle === "white")
        body.classList.add("bookmark-layout-bg-white")
      else if (bgStyle === "m3-accent")
        body.classList.add("bookmark-layout-bg-m3-accent")
      else if (bgStyle === "colored") {
        body.classList.add("bookmark-layout-bg-colored")
        document.documentElement.style.setProperty(
          "--bookmark-layout-bg-color",
          settings.bookmarkLayoutBgColor || "rgba(0,0,0,0.5)",
        )
      }

      if (settings.bookmarkItemStyle === "card") {
        body.classList.add("bookmark-item-card-style")
      }

      const dateClockStyle = settings.dateClockStyle || "default"
      body.classList.add(`date-clock-style-${dateClockStyle}`)
      const clockStyleBackground = settings.clockStyleTransparentBackground
        ? "transparent"
        : settings.clockStyleBackground || "default"
      if (clockStyleBackground === "transparent") {
        body.classList.add("clock-style-transparent-bg")
      } else if (clockStyleBackground === "accent") {
        body.classList.add("clock-style-bg-accent")
      } else if (clockStyleBackground === "custom") {
        body.classList.add("clock-style-bg-custom")
        document.documentElement.style.setProperty(
          "--clock-style-custom-bg-color",
          /^#[0-9a-f]{6}$/i.test(settings.clockStyleCustomBgColor || "")
            ? settings.clockStyleCustomBgColor
            : "#1f2937",
        )
      } else if (clockStyleBackground === "light") {
        body.classList.add("clock-style-bg-light")
      } else if (clockStyleBackground === "dark") {
        body.classList.add("clock-style-bg-dark")
      } else if (
        clockStyleBackground === "animated" &&
        dateClockStyle === "prism-stack"
      ) {
        body.classList.add("clock-style-bg-animated")
      }
      if (
        dateClockStyle === "cartoon" &&
        settings.cartoonClockAnimation === false
      ) {
        body.classList.add("cartoon-clock-animation-off")
      }

      const fliqloTheme = settings.fliqloTheme || "dark"
      body.classList.add(`fliqlo-theme-${fliqloTheme}`)

      if (settings.fliqloZenMode) {
        body.classList.add("fliqlo-zen-mode")
      }

      const styleEl = document.createElement("style")
      let css = ""
      const cssUrl = (value) => {
        if (!value || value === "none") return "none"
        return `url(${JSON.stringify(String(value))})`
      }
      const cssText = (value) =>
        String(value || "").replace(/<\/style/gi, "<\\/style")
      const buildEarlyGradientCss = () => {
        const start = settings.gradientStart || "#0a1f11"
        const end = settings.gradientEnd || "#1d472c"
        const angle = Number(settings.gradientAngle ?? 135)
        const type = ["linear", "radial", "conic"].includes(
          settings.gradientType,
        )
          ? settings.gradientType
          : "linear"
        const repeating =
          settings.gradientRepeating === true ? "repeating-" : ""
        const position = settings.gradientPosition || "center"
        const radialShape = settings.gradientRadialShape || "circle"
        const customColors =
          typeof settings.gradientCustomColors === "string"
            ? settings.gradientCustomColors.match(
                /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g,
              ) || []
            : []
        const hexToParts = (hex) => {
          const normalized = String(hex || "").replace("#", "")
          const full =
            normalized.length === 3
              ? normalized
                  .split("")
                  .map((c) => c + c)
                  .join("")
              : normalized
          const value = Number.parseInt(full, 16)
          if (!Number.isFinite(value) || full.length !== 6)
            return { r: 15, g: 23, b: 42 }
          return {
            r: (value >> 16) & 255,
            g: (value >> 8) & 255,
            b: value & 255,
          }
        }
        const mixHex = (a, b, t) => {
          const c1 = hexToParts(a)
          const c2 = hexToParts(b)
          const toHex = (n) => Math.round(n).toString(16).padStart(2, "0")
          return `#${toHex(c1.r + (c2.r - c1.r) * t)}${toHex(c1.g + (c2.g - c1.g) * t)}${toHex(c1.b + (c2.b - c1.b) * t)}`
        }
        const extraCount = Math.min(
          5,
          Math.max(
            0,
            settings.gradientExtraColorCount !== undefined
              ? Number(settings.gradientExtraColorCount)
              : 2,
          ),
        )
        const generatedColors = Array.from({ length: extraCount }, (_, index) =>
          mixHex(start, end, (index + 1) / (extraCount + 1)),
        )
        const colors = [
          start,
          ...(customColors.length ? customColors.slice(0, 5) : generatedColors),
          end,
        ]

        if (type === "radial") {
          return `${repeating}radial-gradient(${radialShape} at ${position}, ${colors.join(", ")})`
        }
        if (type === "conic") {
          return `${repeating}conic-gradient(from ${angle}deg at ${position}, ${colors.join(", ")})`
        }
        return `${repeating}linear-gradient(${angle}deg, ${colors.join(", ")})`
      }
      const buildEarlyMultiColorCss = () => {
        const colors =
          Array.isArray(settings.multiColors) &&
          settings.multiColors.length >= 2
            ? settings.multiColors
            : ["#FF6B6B", "#4ECDC4"]
        const angle = Number(settings.multiGradientAngle ?? 135)
        const type = ["linear", "radial", "conic"].includes(
          settings.multiColorType,
        )
          ? settings.multiColorType
          : "linear"
        const repeating =
          settings.multiColorRepeating === true ? "repeating-" : ""
        const position = settings.multiColorPosition || "center"
        const radialShape = settings.multiColorRadialShape || "circle"
        const stops = colors
          .map(
            (color, index) =>
              `${color} ${(index / (colors.length - 1)) * 100}%`,
          )
          .join(", ")

        if (type === "radial") {
          return `${repeating}radial-gradient(${radialShape} at ${position}, ${stops})`
        }
        if (type === "conic") {
          return `${repeating}conic-gradient(from ${angle}deg at ${position}, ${stops})`
        }
        return `${repeating}linear-gradient(${angle}deg, ${stops})`
      }
      const isVideoBackground = (value) => 
        typeof value === "string" && 
        (value.startsWith("data:video") || 
         value.startsWith("idb-video-") || 
         /\.(mp4|webm|mov|ogg)(?:[?#].*)?$/i.test(value) || 
         value.includes("googlevideo"))

      const isImageLikeBackground = (value) =>
        typeof value === "string" &&
        (value.startsWith("data:image") ||
          value.startsWith("blob:") ||
          /^https?:\/\//i.test(value) ||
          value.startsWith("idb-img-") ||
          value.startsWith("idb-image-") ||
          value.startsWith("idb-gif-") ||
          isVideoBackground(value))

      const buildEarlyBackgroundCss = () => {
        const bg = settings.background
        const isIndexedDbImage =
          typeof bg === "string" &&
          (bg.startsWith("idb-img-") || bg.startsWith("idb-image-") || bg.startsWith("idb-gif-"))

        // Only reuse a persistent preview for the same image-like background.
        // This includes IndexedDB media: the tiny data URL preview is available
        // synchronously, while the full blob URL resolves later in main.js.
        if (
          settings.lastUserBackgroundPreview &&
          settings.lastUserBackground === bg &&
          isImageLikeBackground(bg)
        ) {
          const preview = settings.lastUserBackgroundPreview
          if (
            preview.startsWith("data:") ||
            preview.startsWith("blob:") ||
            /^https?:\/\//i.test(preview)
          ) {
            return cssUrl(preview)
          }
        }
        const isMultiColorActive =
          settings.activeBgUid?.startsWith("multi-") ||
          (settings.multiColorActive === true &&
            !settings.activeBgUid?.startsWith("grad-"))

        if (settings.splashCursorActive && settings.splashCursorDarkBg === true)
          return "#000000"
        if (settings.effect === "auroraWave") return "#02040f"
        if (settings.effect === "crtScanlines") return settings.crtBackgroundColor || "#0a140f"
        if (settings.effect === "pixelBlast" && settings.pixelBlastTransparent === false) return settings.pixelBlastBgColor || "#0a0a0a"
        if (settings.svgWaveActive) {
          const start = `hsl(${settings.svgWaveStartHue ?? 200}, ${settings.svgWaveStartSaturation ?? 70}%, ${settings.svgWaveStartLightness ?? 40}%)`
          const end = `hsl(${settings.svgWaveEndHue ?? 280}, ${settings.svgWaveEndSaturation ?? 70}%, ${settings.svgWaveEndLightness ?? 30}%)`
          const angle = Number(settings.svgWaveAngle ?? 0)
          return `linear-gradient(${angle}deg, ${start}, ${end})`
        }
        if (settings.gradientV2Active) {
          return `linear-gradient(135deg, ${settings.gradientV2Color1 || "#0f172a"}, ${settings.gradientV2Color2 || "#1d4ed8"}, ${settings.gradientV2Color3 || "#7c3aed"})`
        }
        if (settings.silkActive)
          return `radial-gradient(circle at center, ${settings.silkColor || "#7B7481"}, #050505)`
        if (settings.lightPillarActive) {
          return `linear-gradient(180deg, ${settings.lightPillarTopColor || "#ffffff"}, ${settings.lightPillarBottomColor || "#000000"})`
        }
        if (settings.liquidEtherActive) {
          return `linear-gradient(135deg, ${settings.liquidEtherColor1 || "#5227FF"}, ${settings.liquidEtherColor2 || "#FF9FFC"}, ${settings.liquidEtherColor3 || "#B497CF"})`
        }

        if (bg && typeof bg === "string") {
          if (isVideoBackground(bg)) {
            return "#000000" // Prevent fallback gradient flash for videos without preview
          }
          if (
            bg.startsWith("data:image") ||
            bg.startsWith("blob:") ||
            bg.startsWith("http")
          ) {
            return cssUrl(bg)
          }
          if (
            !bg.startsWith("idb-") &&
            !bg.startsWith("data:video") &&
            !/\.(mp4|webm|mov|ogg)(\?|#|$)/i.test(bg)
          ) {
            return bg
          }
        }
        return isMultiColorActive
          ? buildEarlyMultiColorCss()
          : buildEarlyGradientCss()
      }

      // Inject accent color and other theme variables for loading screen
      const accentColor = settings.accentColor || "#818cf8"
      const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return `${r}, ${g}, ${b}`
      }
      const accentRgb = hexToRgb(accentColor)

      const searchBarWidth = settings.searchBarWidth || 600
      const searchBarBlur = settings.searchBarBlur ?? 20
      const groupBgHex = settings.bookmarkGroupBgColor || "#ffffff"
      const groupBgOpacity = settings.bookmarkGroupBgOpacity ?? 0
      const groupBgRgb =
        groupBgHex !== "transparent" && groupBgHex.startsWith("#")
          ? hexToRgb(groupBgHex)
          : null
      const groupTabBg =
        groupBgRgb && groupBgOpacity < 100
          ? `rgba(${groupBgRgb}, ${groupBgOpacity / 100})`
          : groupBgHex
      const groupTextColor =
        settings.bookmarkGroupAutoTextContrast === true
          ? (() => {
              const [r, g, b] = String(groupBgRgb || "255,255,255")
                .split(",")
                .map((value) => Number(value.trim()) || 0)
              return (r * 299 + g * 587 + b * 114) / 1000 >= 128
                ? "#111827"
                : "#ffffff"
            })()
          : settings.bookmarkGroupTextColor || ""
      const isIndexedDbImage =
        typeof settings.background === "string" &&
        (settings.background.startsWith("idb-img-") ||
          settings.background.startsWith("idb-image-") ||
          settings.background.startsWith("idb-gif-"))
      const hasPersistentBgPreview =
        Boolean(settings.lastUserBackgroundPreview) &&
        settings.lastUserBackground === settings.background &&
        isImageLikeBackground(settings.background)
      const earlyBg = cssText(buildEarlyBackgroundCss())
      const fit = settings.bgSize || "cover"
      const scale = Math.min(
        250,
        Math.max(25, Number(settings.bgImageScale) || 100),
      )
      const earlyBgLayout =
        fit === "custom"
          ? { size: `${scale}%`, repeat: "no-repeat" }
          : fit === "stretch"
            ? { size: "100% 100%", repeat: "no-repeat" }
            : fit === "tile"
              ? { size: "auto", repeat: "repeat" }
              : fit === "center"
                ? { size: "auto", repeat: "no-repeat" }
                : fit === "span"
                  ? { size: "cover", repeat: "no-repeat" }
                  : { size: fit, repeat: "no-repeat" }
      body.classList.add("preload-bg-ready", "bg-layer-active")
      if (hasPersistentBgPreview) body.classList.add("preload-bg-preview")
      // Early Font and Clock Calculations
      const primaryFont = settings.font || "'Outfit', sans-serif"
      const clockFont = settings.clockFont || settings.font || "'Outfit', sans-serif"
      const clockFontTarget = settings.clockFontTarget || "both"
      
      let fontVars = {}
      fontVars["--font-primary"] = primaryFont
      
      const applyFontToTargets = (targets, font) => {
        targets.forEach((t) => {
          fontVars[`--font-${t}`] = font
        })
      }
      
      applyFontToTargets(["clock", "date", "weekday", "gregorian-date", "lunar-date"], primaryFont)
      if (clockFontTarget === "both") {
        applyFontToTargets(
          [
            "clock", "date", "weekday", "gregorian-date", "lunar-date",
            "clock-date", "jp-time", "jp-date"
          ],
          clockFont,
        )
      } else if (clockFontTarget === "clock") {
        applyFontToTargets(["clock", "clock-date", "jp-time"], clockFont)
      } else if (clockFontTarget === "date") {
        applyFontToTargets(["date", "jp-date"], clockFont)
      }

      // Early Clock Sizing
      const baseClockSize = Number(settings.clockSize) || 6
      let computedClockSize = baseClockSize
      const clockUsesDisplayFont = clockFontTarget === "both" || clockFontTarget === "clock"
      
      const getClockFontProfile = (font) => {
        const fontName = String(font || "").toLowerCase()
        if (fontName.includes("outfit")) {
          return { clockScale: 0.68, dateScale: 0.86, letterSpacing: "0px", maxWidthFactor: 5.8 }
        }
        if (fontName.includes("silkscreen")) {
          return { clockScale: 0.78, dateScale: 0.9, letterSpacing: "0.02em", maxWidthFactor: 6.1 }
        }
        if (fontName.includes("pixelify")) {
          return { clockScale: 0.86, dateScale: 0.94, letterSpacing: "0.01em", maxWidthFactor: 6.4 }
        }
        return { clockScale: 1, dateScale: 1, letterSpacing: "2px", maxWidthFactor: 7 }
      }
      
      const getStyleClockScale = (style) => {
        if (style === "cartoon") return 1.3
        if (style === "fliqlo") return 0.95
        if (style === "c4-bomb") return 1.05
        return 1.0
      }

      const fontProfile = getClockFontProfile(clockFont)
      if (clockUsesDisplayFont) {
        computedClockSize *= fontProfile.clockScale * getStyleClockScale(dateClockStyle)
      }

      // Synchronously load custom Google Fonts early in the head
      const loadFontEarly = (fontValue) => {
        if (!fontValue) return
        const fontName = fontValue.replace(/['"]/g, "").split(",")[0].trim()
        const systemFonts = ["sans-serif", "serif", "monospace", "cursive", "fantasy", "system-ui", "arial", "helvetica", "segoe ui", "times new roman", "courier new", "georgia", "verdana", "trebuchet ms", "impact"]
        if (systemFonts.includes(fontName.toLowerCase())) return
        
        const savedFonts = settings.userSavedFonts || []
        const savedFontObj = savedFonts.find(
          (f) => (typeof f === "string" ? f : f.label) === fontName,
        )
        if (savedFontObj && typeof savedFontObj === "object" && savedFontObj.isLocal) {
          return
        }

        const formattedFontName = fontName.replace(/\s+/g, "+")
        const googleFontUrl = `https://fonts.googleapis.com/css2?family=${formattedFontName}:wght@300;400;500;600;700&display=swap`
        
        const existingLink = document.querySelector(`link[href^="https://fonts.googleapis.com/css2?family=${formattedFontName}"]`)
        if (!existingLink) {
          const link = document.createElement("link")
          link.rel = "stylesheet"
          link.href = googleFontUrl
          document.head.appendChild(link)
        }
      }

      try {
        loadFontEarly(settings.font)
        loadFontEarly(settings.clockFont)
      } catch (e) {
        console.warn("Could not load Google Font early in preload", e)
      }

      css += `:root { 
        --accent-color: ${accentColor};
        --accent-color-rgb: ${accentRgb};
        --search-bar-width: ${searchBarWidth}px;
        --search-bar-blur: ${searchBarBlur}px;
        --bookmark-icon-size: ${settings.bookmarkIconSize ?? 42}px;
        --bookmark-group-text-width: ${settings.bookmarkGroupTextWidth ?? 120}px;
        --bookmark-font-size: ${settings.bookmarkFontSize ?? 10}px;
        --bookmark-gap: ${settings.bookmarkGap ?? 8}px;
        --bookmark-border-radius: ${settings.bookmarkBorderRadius ?? 12}px;
        --bookmark-group-tab-bg: ${groupTabBg};
        ${groupTextColor ? `--bookmark-group-text-color: ${groupTextColor};` : ""}
        --bookmark-group-font-size: ${settings.bookmarkGroupFontSize ?? 14}px;
        --bookmark-group-border-radius: ${settings.bookmarkGroupBorderRadius ?? 8}px;
        --bg-pos-x: ${settings.bgPositionX !== undefined ? settings.bgPositionX : 50}%;
        --bg-pos-y: ${settings.bgPositionY !== undefined ? settings.bgPositionY : 50}%;
        --bg-fade-in: ${settings.bgFadeIn ?? 0.5}s;
        --bg-filter: blur(${settings.bgBlur ?? 0}px) brightness(${settings.bgBrightness ?? 100}%) contrast(${settings.bgContrast ?? 100}%) saturate(${settings.bgSaturation ?? 100}%);
        --clock-size: ${computedClockSize}rem;
        --clock-letter-spacing: ${clockUsesDisplayFont ? fontProfile.letterSpacing : "2px"};
        --clock-max-width-factor: ${fontProfile.maxWidthFactor};
        ${Object.entries(fontVars).map(([name, val]) => `${name}: ${val};`).join("\n        ")}
      }\n`
      css += `body.preload-bg-ready { animation: none !important; }\n`
      css += `@keyframes preloadBgFade { from { opacity: 0; } to { opacity: 1; } }\n`
      css += `#bg-layer { background: ${earlyBg}; background-size: ${earlyBgLayout.size}; background-repeat: ${earlyBgLayout.repeat}; background-position: var(--bg-pos-x) var(--bg-pos-y); opacity: 1; animation: ${hasPersistentBgPreview ? "none" : "preloadBgFade var(--bg-fade-in, 0.5s) ease-out forwards"}; }\n`
      css += `body.preload-bg-preview #bg-layer { filter: blur(8px) brightness(0.9) !important; transform: scale(1.02) !important; }\n`
            css += `body.hide-search-bar #search-container { display: none !important; }\n`
      if (settings.showBookmarks === false) {
        css += `#bookmarks-container { display: none !important; }\n`
      }
      if (settings.showBookmarkGroups === false) {
        css += `#bookmark-groups-container { display: none !important; }\n`
      }
      if (settings.showSearchAIIcon === false) {
        css += `#search-ai-btn { display: none !important; }\n`
      }
      css += `body.hide-top-right-controls #top-right-controls { display: none !important; }\n`
      if (settings.showCustomTitle === false) {
        css += `#custom-title-display { display: none !important; }\n`
      }

      document.head.appendChild(styleEl)
      styleEl.textContent = css
    }
  } catch (e) {
    console.error("Preload execution error:", e)
  }
})()

