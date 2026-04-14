/**
 * Event Handlers Module
 * Sets up all UI event listeners for settings
 */

import {
  getSettings,
  updateSetting,
  saveSettings,
  resetSettingsState,
} from "../../services/state.js"
import {
  geti18n,
  loadLanguage,
  applyTranslations,
} from "../../services/i18n.js"
import {
  showAlert,
  showConfirm,
  showChecklistConfirm,
} from "../../utils/dialog.js"
import {
  getImageBlob,
  isIdbMedia,
  isIdbVideo,
  saveImage,
  saveVideo,
} from "../../services/imageStore.js"
import { getSvgWaveParams, updateWaveColorPreviews } from "./svgWaveUtils.js"
import { getRandomHexColor } from "../../utils/colors.js"
import { getGoogleProfile } from "../../services/googleIdentity.js"
import {
  setUnsplashRandomBackground,
  populateUnsplashCollections,
} from "./unsplashFetcher.js"
import {
  renderUserColors,
  renderLocalBackgrounds,
  renderUserAccentColors,
} from "./backgroundManager.js"
import { renderUserGradients } from "./gradientManager.js"
import {
  getTabIconChars,
  applyTabIcon,
  renderTabIconPreview,
} from "./tabIcon.js"
import { loadGoogleFont, renderFontGrid } from "./fontManager.js"
import { renderUserSvgWaves } from "./svgWaveManager.js"
import { renderBookmarks } from "../bookmarks.js"
import { hexToRgb } from "../../utils/colors.js"

export function setupGeneralEventHandlers(
  ctx,
  handleSettingUpdate,
  applySettings,
  updateSettingsInputs,
) {
  const DOM = ctx.DOM
  const i18n = ctx.i18n
  const effects = ctx.effects

  const throttledUpdates = {}
  const lastUpdateTimes = {}
  let reqAnimFrame = null

  const throttleSettingUpdate = (key, value) => {
    const fastFeedbackKeys = [
      "bookmarkGap",
      "bookmarkBgColor",
      "bookmarkBgOpacity",
      "bookmarkTextColor",
      "bookmarkGroupBgColor",
      "bookmarkGroupBgOpacity",
      "bookmarkGroupTextColor",
      "bookmarkGroupFontSize",
      "bookmarkShadowColor",
      "bookmarkShadowOpacity",
      "bookmarkShadowBlur",
      "bookmarkLayoutBgColor",
    ]
    const isFast = fastFeedbackKeys.includes(key)
    const delay = isFast ? 40 : 200

    const performFastCssUpdate = (k, v) => {
      // 1. Force state memory sync
      updateSetting(k, v)
      let settings = getSettings()

      // 2. Direct CSS override matching settingsApplier
      const hexToRgbFast = (hex) => {
        let res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return res
          ? {
              r: parseInt(res[1], 16),
              g: parseInt(res[2], 16),
              b: parseInt(res[3], 16),
            }
          : null
      }

      const rootStyle = document.documentElement.style
      if (k === "bookmarkGap") rootStyle.setProperty("--bookmark-gap", `${v}px`)
      else if (k === "bookmarkBgColor" || k === "bookmarkBgOpacity") {
        let hex = settings.bookmarkBgColor || "#ffffff"
        let op = settings.bookmarkBgOpacity ?? 100
        let rgb = hexToRgbFast(hex)
        if (rgb && op < 100)
          rootStyle.setProperty(
            "--bookmark-bg-color",
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${op / 100})`,
          )
        else rootStyle.setProperty("--bookmark-bg-color", hex)
      } else if (k === "bookmarkTextColor") {
        if (v) rootStyle.setProperty("--bookmark-text-color", v)
        else rootStyle.removeProperty("--bookmark-text-color")
      } else if (
        k === "bookmarkGroupBgColor" ||
        k === "bookmarkGroupBgOpacity"
      ) {
        let hex = settings.bookmarkGroupBgColor || "transparent"
        let op = settings.bookmarkGroupBgOpacity ?? 0
        let rgb = hexToRgbFast(hex)
        if (hex !== "transparent" && rgb && op < 100)
          rootStyle.setProperty(
            "--bookmark-group-tab-bg",
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${op / 100})`,
          )
        else rootStyle.setProperty("--bookmark-group-tab-bg", hex)
      } else if (k === "bookmarkGroupTextColor") {
        if (v) rootStyle.setProperty("--bookmark-group-text-color", v)
        else rootStyle.removeProperty("--bookmark-group-text-color")
      } else if (k === "bookmarkGroupFontSize") {
        rootStyle.setProperty("--bookmark-group-font-size", `${v}px`)
      } else if (
        k === "bookmarkShadowColor" ||
        k === "bookmarkShadowOpacity" ||
        k === "bookmarkShadowBlur"
      ) {
        let hex = settings.bookmarkShadowColor || "#000000"
        let op = settings.bookmarkShadowOpacity ?? 24
        let blur = settings.bookmarkShadowBlur ?? 8
        let rgb = hexToRgbFast(hex) || { r: 0, g: 0, b: 0 }
        let rgbaStr = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${op / 100})`
        rootStyle.setProperty(
          "--bookmark-box-shadow",
          `${rgbaStr} 0px 3px ${blur}px`,
        )
        rootStyle.setProperty(
          "--bookmark-icon-drop-shadow",
          `0px 2px ${Math.max(2, Math.round(blur / 2))}px ${rgbaStr}`,
        )
      } else if (k === "bookmarkLayoutBgColor") {
        rootStyle.setProperty("--bookmark-layout-bg", v)
      }
    }

    if (isFast) {
      if (reqAnimFrame) cancelAnimationFrame(reqAnimFrame)
      reqAnimFrame = requestAnimationFrame(() => {
        performFastCssUpdate(key, value)
      })

      if (throttledUpdates[key]) clearTimeout(throttledUpdates[key])
      throttledUpdates[key] = setTimeout(() => {
        handleSettingUpdate(key, value) // skipSave = false to persist changes
      }, 500) // Heavy debounce (500ms) to ensure saving/re-rendering ONLY happens after dragging finishes completely
    } else {
      if (throttledUpdates[key]) clearTimeout(throttledUpdates[key])
      throttledUpdates[key] = setTimeout(() => {
        handleSettingUpdate(key, value)
        delete throttledUpdates[key]
      }, delay)
    }
  }
  const blobToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })

  const dataUrlToBlob = async (dataUrl) => {
    const res = await fetch(dataUrl)
    return res.blob()
  }

  const collectLocalMediaIds = (settingsSnapshot) => {
    const ids = new Set()
    if (isIdbMedia(settingsSnapshot.background)) {
      ids.add(settingsSnapshot.background)
    }
    if (Array.isArray(settingsSnapshot.userBackgrounds)) {
      settingsSnapshot.userBackgrounds.forEach((id) => {
        if (isIdbMedia(id)) ids.add(id)
      })
    }
    return [...ids]
  }

  // Sidebar toggle and close
  DOM.settingsToggle.addEventListener("click", () =>
    DOM.settingsSidebar.classList.add("open"),
  )
  DOM.closeSettings.addEventListener("click", () =>
    DOM.settingsSidebar.classList.remove("open"),
  )

  const btnDonate = document.getElementById("donate-trigger-btn")
  const modDonate = document.getElementById("donate-modal")
  const closeDonate = document.getElementById("close-donate-modal")
  const showMomo = document.getElementById("show-momo-qr-btn")
  const momoQr = document.getElementById("momo-qr-container")

  if (btnDonate) {
    btnDonate.addEventListener("click", () => {
      if (modDonate) modDonate.classList.add("show")
      if (momoQr) momoQr.style.display = "none"
    })
  }
  if (closeDonate) {
    closeDonate.addEventListener("click", () => {
      if (modDonate) modDonate.classList.remove("show")
    })
  }
  if (showMomo) {
    showMomo.addEventListener("click", () => {
      if (momoQr)
        momoQr.style.display =
          momoQr.style.display === "none" ? "block" : "none"
    })
  }
  window.addEventListener("click", (e) => {
    if (modDonate && e.target === modDonate) {
      modDonate.classList.remove("show")
    }
  })
  document.addEventListener("click", (e) => {
    if (
      !DOM.settingsSidebar.contains(e.target) &&
      !DOM.settingsToggle.contains(e.target)
    ) {
      DOM.settingsSidebar.classList.remove("open")
    }
  })

  // Google Profile & Apps Dropdown Logic
  const initGoogleUI = async () => {
    // Attach listeners first to prevent link following
    if (DOM.googleAppsBtn && DOM.googleAppsDropdown) {
      DOM.googleAppsBtn.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        DOM.googleAppsDropdown.classList.toggle("show")
      })

      document.addEventListener("click", (e) => {
        if (
          !DOM.googleAppsDropdown?.contains(e.target) &&
          !DOM.googleAppsBtn?.contains(e.target)
        ) {
          DOM.googleAppsDropdown?.classList.remove("show")
        }
      })
    }

    // Now fetch profile (async)
    const profile = await getGoogleProfile()
    if (profile && DOM.userAvatarBtn) {
      if (profile.photoUrl) {
        DOM.userAvatarBtn.innerHTML = `<img src="${profile.photoUrl}" alt="Google Account">`
      } else {
        DOM.userAvatarBtn.innerHTML = `<div class="letter-avatar" style="background: ${profile.avatarColor}">${profile.firstLetter}</div>`
      }
    }
  }

  initGoogleUI()

  // Sidebar scroll management
  const sidebarContent = DOM.settingsSidebar.querySelector(".sidebar-content")
  const sidebarScrollTopBtn = document.getElementById("sidebar-scroll-top")
  const SIDEBAR_SCROLL_KEY = "settingsSidebarScroll"

  const navEntry = performance.getEntriesByType("navigation")[0]
  if (navEntry && navEntry.type === "reload") {
    sessionStorage.removeItem(SIDEBAR_SCROLL_KEY)
  } else {
    const savedScroll = sessionStorage.getItem(SIDEBAR_SCROLL_KEY)
    if (savedScroll) sidebarContent.scrollTop = parseInt(savedScroll, 10)
  }

  sidebarContent.addEventListener("scroll", () => {
    const top = sidebarContent.scrollTop
    sessionStorage.setItem(SIDEBAR_SCROLL_KEY, top)
    sidebarScrollTopBtn.classList.toggle("visible", top > 200)
  })

  sidebarScrollTopBtn.addEventListener("click", () => {
    sidebarContent.scrollTo({ top: 0, behavior: "smooth" })
  })

  // Table of Contents (ToC) Logic
  const initSidebarToC = () => {
    const tocToggle = DOM.sidebarTocToggle
    const tocMenu = DOM.sidebarTocMenu
    if (!tocToggle || !tocMenu) return

    const populateToC = () => {
      tocMenu.innerHTML = ""

      const queryStr = [
        ".settings-section",
        "#effect-setting-group",
        "#page-title-input",
        "#date-format-select",
      ].join(", ")

      const elList = Array.from(sidebarContent.querySelectorAll(queryStr)).map(
        (el) => {
          if (el.tagName === "INPUT" || el.tagName === "SELECT") {
            return el.closest(".setting-group")
          }
          return el
        },
      )

      // Remove duplicates
      const sections = [...new Set(elList)].filter(Boolean)
      const addedTitles = new Set()

      sections.forEach((section) => {
        let title = ""
        let iconClass = ""
        let isSubItem = false

        if (section.classList.contains("settings-section")) {
          // Main Section Title
          const toggle = section.querySelector(".section-toggle")
          if (toggle) {
            title = toggle.textContent.trim()
            const icon = toggle.querySelector("i")
            if (icon) iconClass = icon.className
          }
        } else {
          // Sub Items (Effect, Page Title, etc)
          isSubItem = true
          const header = section.querySelector(".group-header")
          const label = section.querySelector(":scope > label")

          if (header) {
            const span = header.querySelector("span[data-i18n]")
            title = span ? span.textContent.trim() : header.textContent.trim()
            const icon = header.querySelector("i.group-icon")
            if (icon) iconClass = icon.className
          } else if (label) {
            const span = label.querySelector("span[data-i18n]")
            title = span ? span.textContent.trim() : label.textContent.trim()
            const icon = label.querySelector("i")
            if (icon) iconClass = icon.className
          }
        }

        if (title && !addedTitles.has(title)) {
          addedTitles.add(title)
          const item = document.createElement("div")
          item.className = "toc-item"
          if (isSubItem) {
            item.style.paddingLeft = "1.5rem"
            item.style.fontSize = "0.9rem"
            item.style.opacity = "0.9"
          }
          item.innerHTML = `<i class="${iconClass || "fa-solid fa-chevron-right"}"></i> <span>${title}</span>`
          item.addEventListener("click", () => {
            // 1) Expand parent section if collapsed
            const parentSection = section.closest(".settings-section")
            if (
              parentSection &&
              parentSection.classList.contains("collapsed")
            ) {
              parentSection.classList.remove("collapsed")
              const sectionId = parentSection.dataset.sectionId
              if (sectionId) {
                const sectionStates = JSON.parse(
                  localStorage.getItem("settingsSectionStates") || "{}",
                )
                sectionStates[sectionId] = false
                localStorage.setItem(
                  "settingsSectionStates",
                  JSON.stringify(sectionStates),
                )
              }
            }

            // 2) Expand the item itself if it's a collapsible group (e.g. Effect)
            if (
              section.classList.contains("collapsible-group") &&
              !section.classList.contains("expanded")
            ) {
              section.classList.add("expanded")
              const groupId = section.id || section.dataset.groupId
              if (groupId) {
                localStorage.setItem(`settingsGroupExpanded:${groupId}`, "1")
              }
            }

            // 3) Calculate precise scroll pixel
            const sidebarRect = sidebarContent.getBoundingClientRect()
            const sectionRect = section.getBoundingClientRect()
            const targetPixel =
              sectionRect.top - sidebarRect.top + sidebarContent.scrollTop - 10

            sidebarContent.scrollTo({
              top: targetPixel,
              behavior: "smooth",
            })

            tocMenu.classList.remove("open")
            tocToggle.classList.remove("active")
          })
          tocMenu.appendChild(item)
        }
      })
    }

    tocToggle.addEventListener("click", (e) => {
      e.stopPropagation()
      const isOpen = tocMenu.classList.toggle("open")
      tocToggle.classList.toggle("active", isOpen)
      if (isOpen) populateToC()
    })

    document.addEventListener("click", (e) => {
      if (!tocMenu.contains(e.target) && !tocToggle.contains(e.target)) {
        tocMenu.classList.remove("open")
        tocToggle.classList.remove("active")
      }
    })
  }

  initSidebarToC()

  // Section collapse/expand state
  const SECTION_STATE_KEY = "settingsSectionStates"
  const sectionStates = JSON.parse(
    localStorage.getItem(SECTION_STATE_KEY) || "{}",
  )
  document.querySelectorAll(".section-toggle").forEach((toggle) => {
    const section = toggle.parentElement
    const sectionId = section.dataset.sectionId
    if (sectionId && sectionStates[sectionId] !== undefined) {
      section.classList.toggle("collapsed", sectionStates[sectionId])
    } else {
      section.classList.add("collapsed")
    }
    toggle.addEventListener("click", () => {
      const isCollapsed = section.classList.toggle("collapsed")
      if (sectionId) {
        sectionStates[sectionId] = isCollapsed
        localStorage.setItem(SECTION_STATE_KEY, JSON.stringify(sectionStates))
      }
    })
  })

  // Language change
  DOM.languageSelect.addEventListener("change", async () => {
    handleSettingUpdate("language", DOM.languageSelect.value)
    await loadLanguage(getSettings().language)
    applyTranslations()
    populateUnsplashCollections(DOM.unsplashCategorySelect, getSettings())
  })

  // Background inputs
  DOM.bgInput.addEventListener("change", () =>
    handleSettingUpdate("background", DOM.bgInput.value.trim()),
  )
  DOM.bgColorPicker.addEventListener("input", () => {
    DOM.bgInput.value = DOM.bgColorPicker.value
    handleSettingUpdate("background", DOM.bgColorPicker.value)
  })

  // Unsplash
  DOM.unsplashRandomBtn.addEventListener("click", () =>
    setUnsplashRandomBackground(
      DOM.unsplashRandomBtn,
      DOM.unsplashCategorySelect,
      DOM.unsplashCredit,
      handleSettingUpdate,
    ),
  )

  DOM.unsplashRandomBtn.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault()
      setUnsplashRandomBackground(
        DOM.unsplashRandomBtn,
        DOM.unsplashCategorySelect,
        DOM.unsplashCredit,
        handleSettingUpdate,
      )
    }
  })

  DOM.unsplashCategorySelect.addEventListener("change", () => {
    handleSettingUpdate("unsplashCategory", DOM.unsplashCategorySelect.value)
  })

  if (DOM.unsplashAccessKeyInput) {
    DOM.unsplashAccessKeyInput.addEventListener("input", () => {
      handleSettingUpdate(
        "unsplashAccessKey",
        DOM.unsplashAccessKeyInput.value.trim(),
      )
    })
  }

  // Save custom color
  DOM.saveColorBtn.addEventListener("click", () => {
    const settings = getSettings()
    const color = DOM.bgInput.value.trim()
    if (color.match(/^#([0-9a-f]{3}){1,2}$/i)) {
      if (!settings.userColors.includes(color)) {
        if (settings.userColors.length >= 10) {
          showAlert("You can only save up to 10 custom colors.")
          return
        }
        settings.userColors.push(color)
        saveSettings()
        renderUserColors(DOM)
        updateSettingsInputs()
      }
    } else {
      showAlert("Please enter a valid hex color code (e.g., #ff0000).")
    }
  })

  // Remove background / reset Unsplash credit
  DOM.removeBgBtn.addEventListener("click", () => {
    handleSettingUpdate("background", null)
    updateSetting("unsplashLastCredit", null)
    saveSettings()
    if (DOM.unsplashCredit) DOM.unsplashCredit.style.display = "none"
  })

  // Save current background
  DOM.saveCurrentBgBtn.addEventListener("click", () => {
    const bg = getSettings().background
    if (!bg) return

    if (getSettings().userBackgrounds.includes(bg)) {
      showAlert(
        geti18n().alert_bg_already_saved || "This background is already saved.",
      )
      return
    }

    if (getSettings().userBackgrounds.length >= 20) {
      showAlert(
        geti18n().alert_bg_gallery_full ||
          "Gallery full! Please remove some backgrounds before saving more.",
      )
      return
    }

    getSettings().userBackgrounds.push(bg)
    saveSettings()
    renderLocalBackgrounds(DOM, handleSettingUpdate)
    showAlert(geti18n().alert_bg_saved || "Background saved to Local Themes!")
  })

  // Accent color
  DOM.accentColorPicker.addEventListener("input", () => {
    document.documentElement.style.setProperty(
      "--accent-color",
      DOM.accentColorPicker.value,
    )
    const rgb = hexToRgb(DOM.accentColorPicker.value)
    if (rgb) {
      document.documentElement.style.setProperty(
        "--accent-color-rgb",
        `${rgb.r}, ${rgb.g}, ${rgb.b}`,
      )
    }
  })
  DOM.accentColorPicker.addEventListener("change", () =>
    handleSettingUpdate("accentColor", DOM.accentColorPicker.value),
  )

  document.querySelectorAll(".accent-color-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const color = btn.dataset.color
      DOM.accentColorPicker.value = color
      handleSettingUpdate("accentColor", color)
      document
        .querySelectorAll(".accent-color-preset")
        .forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")
    })
  })

  DOM.randomAccentColorBtn.addEventListener("click", () => {
    const color = getRandomHexColor()
    DOM.accentColorPicker.value = color
    handleSettingUpdate("accentColor", color)
    document
      .querySelectorAll(".accent-color-preset")
      .forEach((b) => b.classList.remove("active"))
  })

  DOM.saveAccentColorBtn.addEventListener("click", () => {
    const settings = getSettings()
    const color = DOM.accentColorPicker.value
    if (!settings.userAccentColors) settings.userAccentColors = []

    if (!settings.userAccentColors.includes(color)) {
      if (settings.userAccentColors.length >= 10) {
        showAlert("You can only save up to 10 custom accent colors.")
        return
      }
      settings.userAccentColors.push(color)
      saveSettings()
      renderUserAccentColors(DOM)
      showAlert("Accent color saved!")
    } else {
      showAlert("This color is already saved.")
    }
  })

  DOM.userAccentColorsGallery.addEventListener("click", (e) => {
    const item = e.target.closest(".user-color-item")
    if (item && !e.target.closest(".remove-bg-btn")) {
      const color = item.dataset.bgId
      DOM.accentColorPicker.value = color
      handleSettingUpdate("accentColor", color)
      document
        .querySelectorAll(".accent-color-preset")
        .forEach((b) => b.classList.remove("active"))
    }
  })

  renderUserAccentColors(DOM)

  // Background effects
  DOM.bgSizeSelect.addEventListener("change", () =>
    handleSettingUpdate("bgSize", DOM.bgSizeSelect.value),
  )

  DOM.bgPosXInput.addEventListener("input", () => {
    DOM.bgPosXValue.textContent = `${DOM.bgPosXInput.value}%`
    handleSettingUpdate("bgPositionX", DOM.bgPosXInput.value)
  })

  DOM.bgPosYInput.addEventListener("input", () => {
    DOM.bgPosYValue.textContent = `${DOM.bgPosYInput.value}%`
    handleSettingUpdate("bgPositionY", DOM.bgPosYInput.value)
  })

  DOM.bgBlurInput.addEventListener("input", () => {
    DOM.bgBlurValue.textContent = `${DOM.bgBlurInput.value}${DOM.bookmarkGroupFontSizeInput.value}px`
    handleSettingUpdate("bgBlur", Number(DOM.bgBlurInput.value))
  })

  DOM.bgBrightnessInput.addEventListener("input", () => {
    DOM.bgBrightnessValue.textContent = `${DOM.bgBrightnessInput.value}%`
    handleSettingUpdate("bgBrightness", Number(DOM.bgBrightnessInput.value))
  })

  DOM.bgFadeInInput.addEventListener("input", () => {
    DOM.bgFadeInValue.textContent = `${DOM.bgFadeInInput.value}s`
    handleSettingUpdate("bgFadeIn", Number(DOM.bgFadeInInput.value))
  })

  // Custom Bookmark listeners
  if (DOM.bookmarkFontSizeInput) {
    DOM.bookmarkFontSizeInput.addEventListener("input", () => {
      DOM.bookmarkFontSizeValue.textContent = `${DOM.bookmarkFontSizeInput.value}${DOM.bookmarkGroupFontSizeInput.value}px`
      handleSettingUpdate(
        "bookmarkFontSize",
        Number(DOM.bookmarkFontSizeInput.value),
      )
    })

    DOM.bookmarkIconSizeInput.addEventListener("input", () => {
      DOM.bookmarkIconSizeValue.textContent = `${DOM.bookmarkIconSizeInput.value}${DOM.bookmarkGroupFontSizeInput.value}px`
      handleSettingUpdate(
        "bookmarkIconSize",
        Number(DOM.bookmarkIconSizeInput.value),
      )
    })

    DOM.bookmarkGapInput.addEventListener("input", () => {
      DOM.bookmarkGapValue.textContent = `${DOM.bookmarkGapInput.value}${DOM.bookmarkGroupFontSizeInput.value}px`
      throttleSettingUpdate("bookmarkGap", Number(DOM.bookmarkGapInput.value))
    })

    DOM.bookmarkBgColorPicker.addEventListener("input", () => {
      throttleSettingUpdate("bookmarkBgColor", DOM.bookmarkBgColorPicker.value)
    })

    DOM.bookmarkBgOpacityInput.addEventListener("input", () => {
      throttleSettingUpdate(
        "bookmarkBgOpacity",
        Number(DOM.bookmarkBgOpacityInput.value),
      )
    })

    DOM.resetBookmarkBgBtn.addEventListener("click", () => {
      DOM.bookmarkBgColorPicker.value = "#ffffff"
      DOM.bookmarkBgOpacityInput.value = 100
      throttleSettingUpdate("bookmarkBgColor", "#ffffff")
      throttleSettingUpdate("bookmarkBgOpacity", 100)
    })

    if (DOM.bookmarkGroupBgColorPicker) {
      DOM.bookmarkGroupBgColorPicker.addEventListener("input", () => {
        throttleSettingUpdate(
          "bookmarkGroupBgColor",
          DOM.bookmarkGroupBgColorPicker.value,
        )
      })
    }
    if (DOM.bookmarkGroupBgOpacityInput) {
      DOM.bookmarkGroupBgOpacityInput.addEventListener("input", () => {
        throttleSettingUpdate(
          "bookmarkGroupBgOpacity",
          Number(DOM.bookmarkGroupBgOpacityInput.value),
        )
      })
    }
    if (DOM.resetBookmarkGroupBgBtn) {
      DOM.resetBookmarkGroupBgBtn.addEventListener("click", () => {
        DOM.bookmarkGroupBgColorPicker.value = "#ffffff"
        DOM.bookmarkGroupBgOpacityInput.value = 0
        throttleSettingUpdate("bookmarkGroupBgColor", "#ffffff")
        throttleSettingUpdate("bookmarkGroupBgOpacity", 0)
      })
    }
    if (DOM.bookmarkGroupTextColorPicker) {
      DOM.bookmarkGroupTextColorPicker.addEventListener("input", () => {
        throttleSettingUpdate(
          "bookmarkGroupTextColor",
          DOM.bookmarkGroupTextColorPicker.value,
        )
      })
    }
    if (DOM.resetBookmarkGroupTextColorBtn) {
      DOM.resetBookmarkGroupTextColorBtn.addEventListener("click", () => {
        DOM.bookmarkGroupTextColorPicker.value = "#ffffff"
        throttleSettingUpdate("bookmarkGroupTextColor", null)
      })
    }
    if (DOM.bookmarkGroupFontSizeInput) {
      DOM.bookmarkGroupFontSizeInput.addEventListener("input", () => {
        if (DOM.bookmarkGroupFontSizeValue)
          DOM.bookmarkGroupFontSizeValue.textContent = `${DOM.bookmarkGroupFontSizeInput.value}px`
        throttleSettingUpdate(
          "bookmarkGroupFontSize",
          Number(DOM.bookmarkGroupFontSizeInput.value),
        )
      })
    }

    DOM.enableBookmarkDrag.addEventListener("change", () => {
      throttleSettingUpdate(
        "bookmarkEnableDrag",
        DOM.enableBookmarkDrag.checked,
      )
      renderBookmarks()
    })

    if (DOM.bookmarkTextColorPicker) {
      DOM.bookmarkTextColorPicker.addEventListener("input", () => {
        throttleSettingUpdate(
          "bookmarkTextColor",
          DOM.bookmarkTextColorPicker.value,
        )
      })
    }

    if (DOM.resetBookmarkTextColorBtn) {
      DOM.resetBookmarkTextColorBtn.addEventListener("click", () => {
        DOM.bookmarkTextColorPicker.value = "#ffffff"
        throttleSettingUpdate("bookmarkTextColor", null)
      })
    }

    if (DOM.hideBookmarkText) {
      DOM.hideBookmarkText.addEventListener("change", () => {
        throttleSettingUpdate("bookmarkHideText", DOM.hideBookmarkText.checked)
      })
    }

    if (DOM.hideBookmarkBg) {
      DOM.hideBookmarkBg.addEventListener("change", () => {
        throttleSettingUpdate("bookmarkHideBg", DOM.hideBookmarkBg.checked)
      })
    }

    if (DOM.bookmarkMacosHover) {
      DOM.bookmarkMacosHover.addEventListener("change", () => {
        throttleSettingUpdate(
          "bookmarkMacosHover",
          DOM.bookmarkMacosHover.checked,
        )
      })
    }

    if (DOM.bookmarkLayout) {
      DOM.bookmarkLayout.addEventListener("change", () => {
        throttleSettingUpdate("bookmarkLayout", DOM.bookmarkLayout.value)
        if (DOM.lcpBookmarkLayout)
          DOM.lcpBookmarkLayout.value = DOM.bookmarkLayout.value

        // Show/hide bg style row based on layout
        if (DOM.bookmarkLayoutBgStyleRow) {
          DOM.bookmarkLayoutBgStyleRow.style.display =
            DOM.bookmarkLayout.value === "default" ? "none" : "flex"
        }
      })
    }
    if (DOM.lcpBookmarkLayout) {
      DOM.lcpBookmarkLayout.addEventListener("change", () => {
        throttleSettingUpdate("bookmarkLayout", DOM.lcpBookmarkLayout.value)
        if (DOM.bookmarkLayout)
          DOM.bookmarkLayout.value = DOM.lcpBookmarkLayout.value

        // Show/hide bg style row based on layout
        if (DOM.bookmarkLayoutBgStyleRow) {
          DOM.bookmarkLayoutBgStyleRow.style.display =
            DOM.lcpBookmarkLayout.value === "default" ? "none" : "flex"
        }
      })
    }

    if (DOM.bookmarkLayoutBgStyle) {
      DOM.bookmarkLayoutBgStyle.addEventListener("change", () => {
        handleSettingUpdate(
          "bookmarkLayoutBgStyle",
          DOM.bookmarkLayoutBgStyle.value,
        )
        if (DOM.bookmarkLayoutBgColorRow) {
          DOM.bookmarkLayoutBgColorRow.style.display =
            DOM.bookmarkLayoutBgStyle.value === "colored" ? "flex" : "none"
        }
      })
    }

    if (DOM.bookmarkLayoutBgColor) {
      DOM.bookmarkLayoutBgColor.addEventListener("input", () => {
        throttleSettingUpdate(
          "bookmarkLayoutBgColor",
          DOM.bookmarkLayoutBgColor.value,
        )
      })
    }

    if (DOM.bookmarkItemStyle) {
      DOM.bookmarkItemStyle.addEventListener("change", () => {
        throttleSettingUpdate("bookmarkItemStyle", DOM.bookmarkItemStyle.value)
      })
    }

    if (DOM.bookmarkShadowColorPicker) {
      DOM.bookmarkShadowColorPicker.addEventListener("input", () => {
        throttleSettingUpdate(
          "bookmarkShadowColor",
          DOM.bookmarkShadowColorPicker.value,
        )
      })
      DOM.bookmarkShadowOpacityInput.addEventListener("input", () => {
        throttleSettingUpdate(
          "bookmarkShadowOpacity",
          Number(DOM.bookmarkShadowOpacityInput.value),
        )
      })
      DOM.bookmarkShadowBlurInput.addEventListener("input", () => {
        if (DOM.bookmarkShadowBlurValue) {
          DOM.bookmarkShadowBlurValue.textContent = `${DOM.bookmarkShadowBlurInput.value}${DOM.bookmarkGroupFontSizeInput.value}px`
        }
        throttleSettingUpdate(
          "bookmarkShadowBlur",
          Number(DOM.bookmarkShadowBlurInput.value),
        )
      })
    }
  }

  // Gradient listeners
  const MODERN_GRADIENT_PRESETS = [
    {
      start: "#4F46E5",
      end: "#06B6D4",
      angle: "132",
      type: "radial",
      repeating: false,
      extraColorCount: 3,
      customColors: "",
    },
    {
      start: "#0EA5E9",
      end: "#8B5CF6",
      angle: "210",
      type: "conic",
      repeating: false,
      extraColorCount: 3,
      customColors: "",
    },
    {
      start: "#14B8A6",
      end: "#0F172A",
      angle: "145",
      type: "linear",
      repeating: true,
      extraColorCount: 4,
      customColors: "#22d3ee, #60a5fa, #a78bfa",
    },
    {
      start: "#F43F5E",
      end: "#7C3AED",
      angle: "300",
      type: "conic",
      repeating: true,
      extraColorCount: 5,
      customColors: "#f43f5e, #f59e0b, #22d3ee, #8b5cf6",
    },
    {
      start: "#22D3EE",
      end: "#1E293B",
      angle: "120",
      type: "radial",
      repeating: true,
      extraColorCount: 4,
      customColors: "#22d3ee, #38bdf8, #818cf8",
    },
  ]

  const parseCustomColors = (text) => {
    if (!text) return []
    const matches = text.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g) || []
    return matches.map((c) =>
      c.length === 4
        ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`
        : c.toLowerCase(),
    )
  }

  const hexToRgb = (hex) => {
    const normalized = String(hex || "").replace("#", "")
    const full =
      normalized.length === 3
        ? normalized
            .split("")
            .map((c) => c + c)
            .join("")
        : normalized

    const value = Number.parseInt(full, 16)
    if (!Number.isFinite(value) || full.length !== 6) {
      return { r: 128, g: 128, b: 128 }
    }
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
    }
  }

  const mixHex = (a, b, t) => {
    const c1 = hexToRgb(a)
    const c2 = hexToRgb(b)
    const ratio = Math.min(1, Math.max(0, Number(t) || 0))
    const toHex = (n) => Math.round(n).toString(16).padStart(2, "0")
    return `#${toHex(c1.r + (c2.r - c1.r) * ratio)}${toHex(c1.g + (c2.g - c1.g) * ratio)}${toHex(c1.b + (c2.b - c1.b) * ratio)}`
  }

  const setGradientControlsExpanded = (isOpen) => {
    if (!DOM.gradientSettingsBody || !DOM.gradientToggleLabel) return
    DOM.gradientSettingsBody.style.display = isOpen ? "block" : "none"
    DOM.gradientToggleBtn?.setAttribute("aria-expanded", String(isOpen))
    DOM.gradientToggleLabel.textContent =
      geti18n()?.[
        isOpen ? "settings_gradient_close" : "settings_gradient_open"
      ] || (isOpen ? "Hide Controls" : "Show Controls")
  }

  const renderGradientExtraColorPickers = () => {
    if (!DOM.gradientExtraColorPickers) return

    const count = Math.min(
      5,
      Math.max(0, Number(DOM.gradientExtraColorCount?.value || 2)),
    )
    const fromInput = parseCustomColors(DOM.gradientCustomColors?.value || "")
    const existing = fromInput.slice(0, count)

    while (existing.length < count) {
      const ratio = (existing.length + 1) / (count + 1)
      const fallback = mixHex(
        DOM.gradientStartPicker.value,
        DOM.gradientEndPicker.value,
        ratio,
      )
      existing.push(fallback)
    }

    DOM.gradientExtraColorPickers.innerHTML = ""
    if (count > 0) {
      existing.forEach((color, index) => {
        const picker = document.createElement("input")
        picker.type = "color"
        picker.value = color
        picker.title = `Extra ${index + 1}`
        picker.style.width = "42${DOM.bookmarkGroupFontSizeInput.value}px"
        picker.style.height = "34${DOM.bookmarkGroupFontSizeInput.value}px"
        picker.style.padding = "0"
        picker.style.border =
          "1${DOM.bookmarkGroupFontSizeInput.value}px solid var(--input-border)"
        picker.style.borderRadius = "8${DOM.bookmarkGroupFontSizeInput.value}px"
        picker.addEventListener("input", () => {
          const pickers = Array.from(
            DOM.gradientExtraColorPickers.querySelectorAll(
              'input[type="color"]',
            ),
          )
          if (DOM.gradientCustomColors) {
            DOM.gradientCustomColors.value = pickers
              .map((p) => p.value)
              .join(", ")
          }
          updateCurrentGradient()
        })
        DOM.gradientExtraColorPickers.appendChild(picker)
      })
    }

    if (DOM.gradientCustomColors) {
      DOM.gradientCustomColors.value = existing.join(", ")
    }
  }

  const hslToHex = (h, s, l) => {
    const hue = ((h % 360) + 360) % 360
    const sat = Math.min(100, Math.max(0, s)) / 100
    const light = Math.min(100, Math.max(0, l)) / 100
    const c = (1 - Math.abs(2 * light - 1)) * sat
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
    const m = light - c / 2

    let r = 0
    let g = 0
    let b = 0

    if (hue < 60) {
      r = c
      g = x
    } else if (hue < 120) {
      r = x
      g = c
    } else if (hue < 180) {
      g = c
      b = x
    } else if (hue < 240) {
      g = x
      b = c
    } else if (hue < 300) {
      r = x
      b = c
    } else {
      r = c
      b = x
    }

    const toHex = (channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, "0")

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  const generateHarmonizedPalette = (size) => {
    const total = Math.max(3, Number(size) || 3)
    const baseHue = Math.floor(Math.random() * 360)
    const step = 360 / total
    const saturation = 72 + Math.floor(Math.random() * 16)
    const baseLight = 46 + Math.floor(Math.random() * 14)

    return Array.from({ length: total }, (_, index) => {
      const jitter = Math.floor(Math.random() * 14) - 7
      const hue = baseHue + step * index + jitter
      const lightness = Math.min(
        72,
        Math.max(30, baseLight + (Math.floor(Math.random() * 12) - 6)),
      )
      return hslToHex(hue, saturation, lightness)
    })
  }

  const updateCurrentGradient = () => {
    const type = DOM.gradientTypeSelect?.value || "linear"
    if (DOM.gradientAngleGroup) {
      DOM.gradientAngleGroup.style.display =
        type === "radial" ? "none" : "block"
    }
    if (DOM.gradientPositionGroup) {
      DOM.gradientPositionGroup.style.display =
        type === "linear" ? "none" : "flex"
    }
    if (DOM.gradientRadialShapeGroup) {
      DOM.gradientRadialShapeGroup.style.display =
        type === "radial" ? "flex" : "none"
    }

    const gradientConfig = {
      start: DOM.gradientStartPicker.value,
      end: DOM.gradientEndPicker.value,
      angle: DOM.gradientAngleInput.value,
      type: type,
      repeating: DOM.gradientRepeatingToggle?.checked === true,
      extraColorCount: Number(DOM.gradientExtraColorCount?.value || 2),
      customColors: DOM.gradientCustomColors?.value || "",
      position: DOM.gradientPositionSelect?.value || "center",
      radialShape: DOM.gradientRadialShapeSelect?.value || "circle",
    }

    handleSettingUpdate(null, gradientConfig, true)
  }

  DOM.gradientStartPicker.addEventListener("input", updateCurrentGradient)
  DOM.gradientEndPicker.addEventListener("input", updateCurrentGradient)
  DOM.gradientTypeSelect?.addEventListener("change", updateCurrentGradient)
  DOM.gradientPositionSelect?.addEventListener("change", updateCurrentGradient)
  DOM.gradientRadialShapeSelect?.addEventListener(
    "change",
    updateCurrentGradient,
  )
  DOM.gradientRepeatingToggle?.addEventListener("change", updateCurrentGradient)
  DOM.gradientExtraColorCount?.addEventListener("change", () => {
    renderGradientExtraColorPickers()
    updateCurrentGradient()
  })
  DOM.gradientCustomColors?.addEventListener("input", () => {
    renderGradientExtraColorPickers()
    updateCurrentGradient()
  })
  DOM.gradientAngleInput.addEventListener("input", () => {
    DOM.gradientAngleValue.textContent = DOM.gradientAngleInput.value
    updateCurrentGradient()
  })

  DOM.gradientToggleBtn?.addEventListener("click", () => {
    const nextIsOpen = DOM.gradientSettingsBody?.style.display === "none"
    setGradientControlsExpanded(nextIsOpen)
    updateSetting("gradientControlsOpen", nextIsOpen)
    saveSettings()
  })

  DOM.randomGradientColorsBtn?.addEventListener("click", () => {
    const extraCount = Math.min(
      5,
      Math.max(0, Number(DOM.gradientExtraColorCount?.value || 2)),
    )
    const palette = generateHarmonizedPalette(extraCount + 2)
    const [start, ...rest] = palette
    const end = rest[rest.length - 1]
    const middle = rest.slice(0, -1)
    const randomAngle = Math.floor(Math.random() * 361)

    DOM.gradientStartPicker.value = start
    DOM.gradientEndPicker.value = end
    DOM.gradientAngleInput.value = randomAngle
    DOM.gradientAngleValue.textContent = randomAngle
    if (DOM.gradientCustomColors) {
      DOM.gradientCustomColors.value = middle.join(", ")
    }

    renderGradientExtraColorPickers()
    updateCurrentGradient()
  })

  DOM.generateModernGradientBtn?.addEventListener("click", () => {
    const selected =
      MODERN_GRADIENT_PRESETS[
        Math.floor(Math.random() * MODERN_GRADIENT_PRESETS.length)
      ]

    DOM.gradientStartPicker.value = selected.start
    DOM.gradientEndPicker.value = selected.end
    DOM.gradientAngleInput.value = selected.angle
    DOM.gradientAngleValue.textContent = selected.angle
    if (DOM.gradientTypeSelect) DOM.gradientTypeSelect.value = selected.type
    if (DOM.gradientRepeatingToggle)
      DOM.gradientRepeatingToggle.checked = selected.repeating
    if (DOM.gradientExtraColorCount)
      DOM.gradientExtraColorCount.value = String(
        selected.extraColorCount !== undefined ? selected.extraColorCount : 2,
      )
    if (DOM.gradientCustomColors)
      DOM.gradientCustomColors.value = selected.customColors || ""
    if (DOM.gradientPositionSelect)
      DOM.gradientPositionSelect.value = selected.position || "center"
    if (DOM.gradientRadialShapeSelect)
      DOM.gradientRadialShapeSelect.value = selected.radialShape || "circle"

    renderGradientExtraColorPickers()
    updateCurrentGradient()
  })

  DOM.saveGradientBtn.addEventListener("click", () => {
    const settings = getSettings()
    const newGradient = {
      start: DOM.gradientStartPicker.value,
      end: DOM.gradientEndPicker.value,
      angle: DOM.gradientAngleInput.value,
      type: DOM.gradientTypeSelect?.value || "linear",
      repeating: DOM.gradientRepeatingToggle?.checked === true,
      extraColorCount: Number(DOM.gradientExtraColorCount?.value || 2),
      customColors: DOM.gradientCustomColors?.value || "",
      position: DOM.gradientPositionSelect?.value || "center",
      radialShape: DOM.gradientRadialShapeSelect?.value || "circle",
    }
    const alreadyExists = settings.userGradients.some(
      (g) =>
        g.start === newGradient.start &&
        g.end === newGradient.end &&
        g.angle === newGradient.angle &&
        (g.type || "linear") === newGradient.type &&
        (g.repeating === true) === newGradient.repeating &&
        Number(g.extraColorCount || 2) === newGradient.extraColorCount &&
        (g.customColors || "") === newGradient.customColors &&
        (g.position || "center") === newGradient.position &&
        (g.radialShape || "circle") === newGradient.radialShape,
    )
    if (!alreadyExists) {
      if (settings.userGradients.length >= 10) {
        showAlert("You can only save up to 10 custom gradients.")
        return
      }
      settings.userGradients.push(newGradient)
      saveSettings()
      renderUserGradients(DOM)
      updateSettingsInputs()
    }
  })

  // User gradient gallery
  DOM.userGradientsGallery.addEventListener("click", (e) => {
    const item = e.target.closest(".user-gradient-item")
    if (item && !e.target.closest(".remove-bg-btn")) {
      const gradient = {
        start: item.dataset.start,
        end: item.dataset.end,
        angle: item.dataset.angle,
        type: item.dataset.type || "linear",
        repeating: item.dataset.repeating === "true",
        extraColorCount: Number(item.dataset.extraColorCount || 2),
        customColors: item.dataset.customColors || "",
      }
      if (DOM.gradientExtraColorCount) {
        DOM.gradientExtraColorCount.value = String(gradient.extraColorCount)
      }
      if (DOM.gradientCustomColors) {
        DOM.gradientCustomColors.value = gradient.customColors
      }
      renderGradientExtraColorPickers()
      handleSettingUpdate(null, gradient, true)
    }
  })

  setGradientControlsExpanded(getSettings().gradientControlsOpen !== false)
  renderGradientExtraColorPickers()

  // SVG Wave listeners
  function _applyWaveFromInputs(fade = false) {
    if (!getSettings().svgWaveActive) {
      updateSetting("svgWaveActive", true)
      updateSetting("background", null)
    }
    updateSetting("svgWaveLines", +DOM.svgWaveLines.value)
    updateSetting("svgWaveAmplitudeX", +DOM.svgWaveAmpX.value)
    updateSetting("svgWaveAmplitudeY", +DOM.svgWaveAmpY.value)
    updateSetting("svgWaveOffsetX", +DOM.svgWaveOffsetX.value)
    updateSetting("svgWaveAngle", +DOM.svgWaveAngle.value)
    updateSetting("svgWaveSmoothness", +DOM.svgWaveSmoothness.value)
    updateSetting("svgWaveFill", DOM.svgWaveFill.checked)
    updateSetting("svgWaveCraziness", +DOM.svgWaveCraziness.value)
    updateSetting("svgWaveStartHue", +DOM.svgWaveStartHue.value)
    updateSetting("svgWaveStartSaturation", +DOM.svgWaveStartSat.value)
    updateSetting("svgWaveStartLightness", +DOM.svgWaveStartLight.value)
    updateSetting("svgWaveEndHue", +DOM.svgWaveEndHue.value)
    updateSetting("svgWaveEndSaturation", +DOM.svgWaveEndSat.value)
    updateSetting("svgWaveEndLightness", +DOM.svgWaveEndLight.value)
    saveSettings()
    updateWaveColorPreviews(
      getSettings(),
      DOM.svgWaveStartPreview,
      DOM.svgWaveEndPreview,
    )
    effects.svgWaveEffect.update(getSvgWaveParams(getSettings()), fade)
    if (!effects.svgWaveEffect.active)
      effects.svgWaveEffect.start(getSvgWaveParams(getSettings()))
  }

  DOM.svgWaveToggleBtn.addEventListener("click", () => {
    const isCurrentlyOpen =
      localStorage.getItem("startpage_svgWaveGeneratorOpen") === "1"
    const nowOpen = !isCurrentlyOpen
    localStorage.setItem("startpage_svgWaveGeneratorOpen", nowOpen ? "1" : "0")

    const settings = getSettings()
    // Mở ra thì tự động bật sóng nếu chưa bật
    if (nowOpen && !settings.svgWaveActive) {
      updateSetting("svgWaveActive", true)
      updateSetting("background", null)
      saveSettings()
    }
    applySettings()
    updateSettingsInputs()
  })

  DOM.svgWaveCrazyBtn.addEventListener("click", () => {
    const crazyParams = effects.svgWaveEffect.randomize()
    crazyParams.craziness = 150 + Math.floor(Math.random() * 100)
    crazyParams.amplitudeY = 40 + Math.floor(Math.random() * 160)
    crazyParams.lines = 6 + Math.floor(Math.random() * 10)
    updateSetting("svgWaveLines", crazyParams.lines)
    updateSetting("svgWaveAmplitudeX", crazyParams.amplitudeX)
    updateSetting("svgWaveAmplitudeY", crazyParams.amplitudeY)
    updateSetting("svgWaveOffsetX", crazyParams.offsetX)
    updateSetting("svgWaveSmoothness", crazyParams.smoothness)
    updateSetting("svgWaveFill", crazyParams.fill)
    updateSetting("svgWaveCraziness", crazyParams.craziness)
    updateSetting("svgWaveAngle", crazyParams.angle)
    updateSetting("svgWaveStartHue", crazyParams.startHue)
    updateSetting("svgWaveStartSaturation", crazyParams.startSaturation)
    updateSetting("svgWaveStartLightness", crazyParams.startLightness)
    updateSetting("svgWaveEndHue", crazyParams.endHue)
    updateSetting("svgWaveEndSaturation", crazyParams.endSaturation)
    updateSetting("svgWaveEndLightness", crazyParams.endLightness)
    updateSetting("svgWaveActive", true)
    updateSetting("background", null)
    saveSettings()
    updateSettingsInputs()
    effects.svgWaveEffect.start(getSvgWaveParams(getSettings()))
  })

  DOM.svgWaveAnglePresetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const angle = +btn.dataset.angle
      DOM.svgWaveAngle.value = angle
      DOM.svgWaveAngleValue.textContent = angle
      _applyWaveFromInputs()
    })
  })

  DOM.svgWaveCloseBtn.addEventListener("click", () => {
    localStorage.setItem("startpage_svgWaveGeneratorOpen", "0")
    applySettings()
  })

  DOM.svgWaveRandomizeBtn.addEventListener("click", () => {
    const randomParams = effects.svgWaveEffect.randomize()
    updateSetting("svgWaveLines", randomParams.lines)
    updateSetting("svgWaveAmplitudeX", randomParams.amplitudeX)
    updateSetting("svgWaveAmplitudeY", randomParams.amplitudeY)
    updateSetting("svgWaveOffsetX", randomParams.offsetX)
    updateSetting("svgWaveSmoothness", randomParams.smoothness)
    updateSetting("svgWaveFill", randomParams.fill)
    updateSetting("svgWaveCraziness", randomParams.craziness)
    updateSetting("svgWaveAngle", randomParams.angle)
    updateSetting("svgWaveStartHue", randomParams.startHue)
    updateSetting("svgWaveStartSaturation", randomParams.startSaturation)
    updateSetting("svgWaveStartLightness", randomParams.startLightness)
    updateSetting("svgWaveEndHue", randomParams.endHue)
    updateSetting("svgWaveEndSaturation", randomParams.endSaturation)
    updateSetting("svgWaveEndLightness", randomParams.endLightness)
    updateSetting("svgWaveActive", true)
    updateSetting("background", null)
    saveSettings()
    updateSettingsInputs()
    const rParams = getSvgWaveParams(getSettings())
    if (effects.svgWaveEffect.active) {
      effects.svgWaveEffect.update(rParams)
    } else {
      effects.svgWaveEffect.start(rParams)
    }
  })

  DOM.svgWaveSaveBtn.addEventListener("click", () => {
    const settings = getSettings()
    const wave = getSvgWaveParams(settings)
    if (!Array.isArray(settings.userSvgWaves)) settings.userSvgWaves = []
    if (settings.userSvgWaves.length >= 50) {
      showAlert("You can only save up to 50 wave presets.")
      return
    }
    settings.userSvgWaves.push(wave)
    saveSettings()
    renderUserSvgWaves(DOM, effects.svgWaveEffect, () => {
      applySettings()
      updateSettingsInputs()
    })
  })

  // Wave sliders
  const waveSliders = [
    [DOM.svgWaveLines, DOM.svgWaveLinesValue],
    [DOM.svgWaveAmpX, DOM.svgWaveAmpXValue],
    [DOM.svgWaveAmpY, DOM.svgWaveAmpYValue],
    [DOM.svgWaveOffsetX, DOM.svgWaveOffsetXValue],
    [DOM.svgWaveAngle, DOM.svgWaveAngleValue],
    [DOM.svgWaveSmoothness, DOM.svgWaveSmoothnessValue],
    [DOM.svgWaveCraziness, DOM.svgWaveCrazinessValue],
    [DOM.svgWaveStartHue, DOM.svgWaveStartHueValue],
    [DOM.svgWaveStartSat, DOM.svgWaveStartSatValue],
    [DOM.svgWaveStartLight, DOM.svgWaveStartLightValue],
    [DOM.svgWaveEndHue, DOM.svgWaveEndHueValue],
    [DOM.svgWaveEndSat, DOM.svgWaveEndSatValue],
    [DOM.svgWaveEndLight, DOM.svgWaveEndLightValue],
  ]
  let _waveApplyTimer = null
  waveSliders.forEach(([input, label]) => {
    input.addEventListener("input", () => {
      label.textContent = input.value
      clearTimeout(_waveApplyTimer)
      _waveApplyTimer = setTimeout(() => _applyWaveFromInputs(true), 350)
    })
  })
  DOM.svgWaveFill.addEventListener("change", () => {
    clearTimeout(_waveApplyTimer)
    _waveApplyTimer = setTimeout(() => _applyWaveFromInputs(true), 350)
  })

  // Effect grid
  DOM.effectGrid.addEventListener("click", (e) => {
    const item = e.target.closest(".effect-item")
    if (item) handleSettingUpdate("effect", item.dataset.value)
  })

  if (DOM.pixelWeatherStyleSelect) {
    DOM.pixelWeatherStyleSelect.addEventListener("change", (e) => {
      handleSettingUpdate("pixelWeatherStyle", e.target.value)
    })
  }
  if (DOM.pixelWeatherResolutionSlider) {
    DOM.pixelWeatherResolutionSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value)
      if (DOM.pixelWeatherResolutionVal)
        DOM.pixelWeatherResolutionVal.textContent = val
      handleSettingUpdate("pixelWeatherResolution", val)
    })
  }

  if (DOM.pixelWeatherSpeedSlider) {
    DOM.pixelWeatherSpeedSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value)
      if (DOM.pixelWeatherSpeedVal)
        DOM.pixelWeatherSpeedVal.textContent = val.toFixed(1)
      handleSettingUpdate("pixelWeatherSpeed", val)
    })
  }

  if (DOM.pixelWeatherSizeSlider) {
    DOM.pixelWeatherSizeSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value)
      if (DOM.pixelWeatherSizeVal)
        DOM.pixelWeatherSizeVal.textContent = val.toFixed(1)
      handleSettingUpdate("pixelWeatherSize", val)
    })
  }

  if (DOM.pixelWeatherDensitySlider) {
    DOM.pixelWeatherDensitySlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value)
      if (DOM.pixelWeatherDensityVal)
        DOM.pixelWeatherDensityVal.textContent = val.toFixed(1)
      handleSettingUpdate("pixelWeatherDensity", val)
    })
  }

  DOM.effectSearch.addEventListener("input", () => {
    const q = DOM.effectSearch.value.toLowerCase()
    DOM.effectGrid.querySelectorAll(".effect-item").forEach((el) => {
      el.style.display =
        el.dataset.search.includes(q) ||
        el.querySelector(".effect-name").textContent.toLowerCase().includes(q)
          ? ""
          : "none"
    })
  })

  // Font management
  DOM.loadCustomFontBtn.addEventListener("click", () => {
    const fontName = DOM.customFontInput.value.trim()
    if (!fontName) {
      showAlert(i18n.alert_font_error || "Please enter a font name.")
      return
    }
    loadGoogleFont(fontName)
    setTimeout(() => {
      const fontValue = `'${fontName}', sans-serif`
      handleSettingUpdate("font", fontValue)
      saveSettings()
      renderFontGrid(DOM.fontGrid, handleSettingUpdate)
      showAlert(i18n.alert_font_loaded || "Font loaded successfully!")
      DOM.customFontInput.value = ""
    }, 500)
  })

  DOM.saveFontBtn.addEventListener("click", () => {
    const fontName = DOM.customFontInput.value.trim()
    if (!fontName) {
      showAlert(i18n.alert_font_error || "Please enter a font name.")
      return
    }
    const settings = getSettings()
    const savedFonts = settings.userSavedFonts || []
    if (savedFonts.includes(fontName)) {
      showAlert(i18n.alert_font_already_saved || "Font already saved.")
      return
    }
    loadGoogleFont(fontName)
    setTimeout(() => {
      const fontValue = `'${fontName}', sans-serif`
      handleSettingUpdate("font", fontValue)
      updateSetting("userSavedFonts", [...savedFonts, fontName])
      saveSettings()
      renderFontGrid(DOM.fontGrid, handleSettingUpdate)
      showAlert(i18n.alert_font_saved || "Font saved!")
      DOM.customFontInput.value = ""
    }, 500)
  })

  // Date/time settings
  DOM.dateFormatSelect.addEventListener("change", () => {
    handleSettingUpdate("dateFormat", DOM.dateFormatSelect.value)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "dateFormat", value: DOM.dateFormatSelect.value },
      }),
    )
  })

  DOM.shortWeekdayCheckbox?.addEventListener("change", () => {
    handleSettingUpdate("shortWeekday", DOM.shortWeekdayCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "shortWeekday",
          value: DOM.shortWeekdayCheckbox.checked,
        },
      }),
    )
  })

  if (DOM.timeFormatSelect) {
    DOM.timeFormatSelect.addEventListener("change", () => {
      handleSettingUpdate("timeFormat", DOM.timeFormatSelect.value)
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "timeFormat", value: DOM.timeFormatSelect.value },
        }),
      )
    })
  }

  if (DOM.timezoneSelect) {
    DOM.timezoneSelect.addEventListener("change", () => {
      handleSettingUpdate("timezone", DOM.timezoneSelect.value)
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "timezone", value: DOM.timezoneSelect.value },
        }),
      )
    })
  }

  DOM.hideSecondsCheckbox.addEventListener("change", () => {
    handleSettingUpdate("hideSeconds", DOM.hideSecondsCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "hideSeconds", value: DOM.hideSecondsCheckbox.checked },
      }),
    )
  })

  DOM.clockDatePrioritySelect.addEventListener("change", () => {
    handleSettingUpdate("clockDatePriority", DOM.clockDatePrioritySelect.value)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "clockDatePriority",
          value: DOM.clockDatePrioritySelect.value,
        },
      }),
    )
  })

  DOM.clockDateStyleSelect.addEventListener("change", () => {
    handleSettingUpdate("dateClockStyle", DOM.clockDateStyleSelect.value)

    if (DOM.clockDateStyleSelect.value === "analog") {
      DOM.analogMarkerModeSetting.style.display = ""
    } else {
      DOM.analogMarkerModeSetting.style.display = "none"
    }

    if (DOM.clockDateStyleSelect.value === "jp-style") {
      DOM.jpStyleLanguageSetting.style.display = ""
    } else {
      DOM.jpStyleLanguageSetting.style.display = "none"
    }

    if (DOM.sidestyleAlignSetting) {
      DOM.sidestyleAlignSetting.style.display =
        DOM.clockDateStyleSelect.value === "sidestyle" ? "" : "none"
    }

    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "dateClockStyle",
          value: DOM.clockDateStyleSelect.value,
        },
      }),
    )
  })

  if (DOM.sidestyleAlignSelect) {
    DOM.sidestyleAlignSelect.addEventListener("change", () => {
      handleSettingUpdate("sidestyleAlign", DOM.sidestyleAlignSelect.value)
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: {
            key: "sidestyleAlign",
            value: DOM.sidestyleAlignSelect.value,
          },
        }),
      )
    })
  }

  if (DOM.sidestyleNoBorderCheckbox) {
    DOM.sidestyleNoBorderCheckbox.addEventListener("change", () => {
      handleSettingUpdate(
        "sidestyleNoBorder",
        DOM.sidestyleNoBorderCheckbox.checked,
      )
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: {
            key: "sidestyleNoBorder",
            value: DOM.sidestyleNoBorderCheckbox.checked,
          },
        }),
      )
    })
  }

  if (DOM.sidebarClockFlipCheckbox) {
    DOM.sidebarClockFlipCheckbox.addEventListener("change", () => {
      handleSettingUpdate(
        "sidebarClockFlip",
        DOM.sidebarClockFlipCheckbox.checked,
      )
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: {
            key: "sidebarClockFlip",
            value: DOM.sidebarClockFlipCheckbox.checked,
          },
        }),
      )
    })
  }

  if (DOM.clockFontTargetSelect) {
    DOM.clockFontTargetSelect.addEventListener("change", () => {
      handleSettingUpdate("clockFontTarget", DOM.clockFontTargetSelect.value)
    })
  }

  DOM.jpStyleLanguageSelect.addEventListener("change", () => {
    handleSettingUpdate("jpStyleLanguage", DOM.jpStyleLanguageSelect.value)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "jpStyleLanguage",
          value: DOM.jpStyleLanguageSelect.value,
        },
      }),
    )
  })

  DOM.hueTextModeSelect.addEventListener("change", () => {
    handleSettingUpdate("hueTextMode", DOM.hueTextModeSelect.value)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "hueTextMode",
          value: DOM.hueTextModeSelect.value,
        },
      }),
    )
  })

  DOM.analogMarkerModeSelect.addEventListener("change", () => {
    handleSettingUpdate("analogMarkerMode", DOM.analogMarkerModeSelect.value)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "analogMarkerMode",
          value: DOM.analogMarkerModeSelect.value,
        },
      }),
    )
  })

  DOM.analogBlurBgCheckbox.addEventListener("change", () => {
    handleSettingUpdate(
      "analogBlurBackground",
      DOM.analogBlurBgCheckbox.checked,
    )
  })

  DOM.pageTitleInput.addEventListener("input", () => {
    const newTitle = DOM.pageTitleInput.value.trim() || "Start Page"
    updateSetting("pageTitle", newTitle)
    saveSettings()
    document.title = newTitle
  })

  DOM.tabIconInput.addEventListener("input", () => {
    const raw = DOM.tabIconInput.value
    const chars = getTabIconChars(raw)
    updateSetting("tabIcon", chars)
    saveSettings()
    applyTabIcon(chars)
    renderTabIconPreview(chars, DOM.tabIconPreview)
  })

  DOM.clockSizeInput.addEventListener("input", () => {
    DOM.clockSizeValue.textContent = `${DOM.clockSizeInput.value}rem`
    document.documentElement.style.setProperty(
      "--clock-size",
      `${DOM.clockSizeInput.value}rem`,
    )
  })
  DOM.clockSizeInput.addEventListener("change", () => {
    handleSettingUpdate("clockSize", DOM.clockSizeInput.value)
  })

  DOM.dateSizeInput.addEventListener("input", () => {
    DOM.dateSizeValue.textContent = `${DOM.dateSizeInput.value}rem`
    document.documentElement.style.setProperty(
      "--date-size",
      `${DOM.dateSizeInput.value}rem`,
    )
  })
  DOM.dateSizeInput.addEventListener("change", () => {
    handleSettingUpdate("dateSize", DOM.dateSizeInput.value)
  })

  if (DOM.clockDateStrokeWidthInput) {
    DOM.clockDateStrokeWidthInput.addEventListener("input", (e) => {
      if (DOM.clockDateStrokeWidthValue)
        DOM.clockDateStrokeWidthValue.textContent = `${e.target.value}${DOM.bookmarkGroupFontSizeInput.value}px`
      handleSettingUpdate("clockDateStrokeWidth", parseFloat(e.target.value))
    })
  }

  if (DOM.clockDateStrokeColorPicker) {
    DOM.clockDateStrokeColorPicker.addEventListener("input", (e) => {
      document.documentElement.style.setProperty(
        "--clock-date-stroke-color",
        e.target.value,
      )
    })
    DOM.clockDateStrokeColorPicker.addEventListener("change", (e) => {
      handleSettingUpdate("clockDateStrokeColor", e.target.value)
    })
  }

  if (DOM.clockDateStrokeTargetSelect) {
    DOM.clockDateStrokeTargetSelect.addEventListener("change", (e) => {
      handleSettingUpdate("clockDateStrokeTarget", e.target.value)
    })
  }

  DOM.clockColorPicker.addEventListener("input", () => {
    document.documentElement.style.setProperty(
      "--clock-color",
      DOM.clockColorPicker.value,
    )
  })
  DOM.clockColorPicker.addEventListener("change", () =>
    handleSettingUpdate("clockColor", DOM.clockColorPicker.value),
  )
  DOM.resetClockColorBtn.addEventListener("click", () =>
    handleSettingUpdate("clockColor", null),
  )

  DOM.dateColorPicker.addEventListener("input", () => {
    document.documentElement.style.setProperty(
      "--date-color",
      DOM.dateColorPicker.value,
    )
  })
  DOM.dateColorPicker.addEventListener("change", () =>
    handleSettingUpdate("dateColor", DOM.dateColorPicker.value),
  )
  DOM.resetDateColorBtn.addEventListener("click", () =>
    handleSettingUpdate("dateColor", null),
  )

  // Reset all settings
  DOM.resetSettingsBtn.addEventListener("click", async () => {
    if (await showConfirm(i18n.alert_reset)) {
      resetSettingsState()
      applySettings()
      renderLocalBackgrounds(DOM, handleSettingUpdate)
      renderUserColors(DOM)
      renderUserAccentColors(DOM)
      renderUserGradients(DOM)
      window.dispatchEvent(new CustomEvent("multiColor:sync"))
    }
  })

  // Search input
  DOM.searchInput.addEventListener("input", () => {
    DOM.clearBtn.style.display =
      DOM.searchInput.value.length > 0 ? "block" : "none"
  })
  DOM.clearBtn.addEventListener("click", () => {
    DOM.searchInput.value = ""
    DOM.searchInput.focus()
    DOM.clearBtn.style.display = "none"
  })

  // Layout visibility checkboxes
  const setupLayoutCheckbox = (checkbox, key, eventDetail) => {
    checkbox.addEventListener("change", () => {
      handleSettingUpdate(key, checkbox.checked)
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { ...eventDetail, key, value: checkbox.checked },
        }),
      )
    })
  }

  setupLayoutCheckbox(DOM.showTodoCheckbox, "showTodoList", {})
  if (DOM.todoShowCheckboxesToggle) {
    setupLayoutCheckbox(DOM.todoShowCheckboxesToggle, "todoShowCheckboxes", {})
  }
  setupLayoutCheckbox(DOM.showNotepadCheckbox, "showNotepad", {})
  setupLayoutCheckbox(DOM.showTimerCheckbox, "showTimer", {})
  setupLayoutCheckbox(DOM.showGregorianCheckbox, "showGregorian", {})
  setupLayoutCheckbox(DOM.showClockCheckbox, "showClock", {})
  if (DOM.showDateCheckbox) {
    setupLayoutCheckbox(DOM.showDateCheckbox, "showDate", {})
  }
  setupLayoutCheckbox(DOM.freeMoveClockCheckbox, "freeMoveClock", {})
  setupLayoutCheckbox(DOM.showFullCalendarCheckbox, "showFullCalendar", {})
  setupLayoutCheckbox(DOM.showLunarCalendarCheckbox, "showLunarCalendar", {})
  setupLayoutCheckbox(DOM.flipLayoutCheckbox, "flipLayout", {})
  if (DOM.showDonateButtonCheckbox) {
    setupLayoutCheckbox(DOM.showDonateButtonCheckbox, "showDonateButton", {})
  }
  setupLayoutCheckbox(DOM.showSearchBarCheckbox, "showSearchBar", {})
  if (DOM.showSearchAiIconCheckbox) {
    setupLayoutCheckbox(DOM.showSearchAiIconCheckbox, "showSearchAIIcon", {})
  }
  if (DOM.searchBarWidthSlider) {
    DOM.searchBarWidthSlider.addEventListener("input", (e) => {
      const width = e.target.value
      if (DOM.searchBarWidthVal)
        DOM.searchBarWidthVal.textContent = `${width}${DOM.bookmarkGroupFontSizeInput.value}px`
      if (DOM.lcpSearchBarWidthVal)
        DOM.lcpSearchBarWidthVal.textContent = `${width}${DOM.bookmarkGroupFontSizeInput.value}px`
      if (DOM.lcpSearchBarWidth) DOM.lcpSearchBarWidth.value = width
      handleSettingUpdate("searchBarWidth", parseInt(width))
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "searchBarWidth", value: width },
        }),
      )
    })
  }
  setupLayoutCheckbox(DOM.showBookmarksCheckbox, "showBookmarks", {})
  setupLayoutCheckbox(DOM.showBookmarkGroupsCheckbox, "showBookmarkGroups", {})

  DOM.showMusicCheckbox.addEventListener("change", () => {
    handleSettingUpdate("musicPlayerEnabled", DOM.showMusicCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("settingsUpdated", {
        detail: {
          key: "musicPlayerEnabled",
          value: DOM.showMusicCheckbox.checked,
        },
      }),
    )
  })

  DOM.musicPlayerUseDefaultColorCheckbox.addEventListener("change", () => {
    handleSettingUpdate(
      "musicPlayerUseDefaultColor",
      DOM.musicPlayerUseDefaultColorCheckbox.checked,
    )
    window.dispatchEvent(
      new CustomEvent("settingsUpdated", {
        detail: {
          key: "musicPlayerUseDefaultColor",
          value: DOM.musicPlayerUseDefaultColorCheckbox.checked,
        },
      }),
    )
  })

  DOM.ghostControlsCheckbox.addEventListener("change", () => {
    const isGhost = DOM.ghostControlsCheckbox.checked
    handleSettingUpdate("sideControlsGhostMode", isGhost)
    document.body.classList.toggle("ghost-controls", isGhost)
    DOM.lcpGhostControls.checked = isGhost
  })

  // Layout controls popup
  const closeLcp = () => {
    DOM.layoutControlsPopup.style.display = "none"
    DOM.layoutControlsBtn.classList.remove("active")
  }

  DOM.layoutControlsBtn.addEventListener("click", (e) => {
    e.stopPropagation()
    const isVisible = DOM.layoutControlsPopup.style.display !== "none"
    isVisible
      ? closeLcp()
      : ((DOM.layoutControlsPopup.style.display = "block"),
        DOM.layoutControlsBtn.classList.add("active"))
  })

  document.addEventListener("click", (e) => {
    if (
      !DOM.layoutControlsPopup.contains(e.target) &&
      !DOM.layoutControlsBtn.contains(e.target)
    ) {
      closeLcp()
    }
  })

  function lcpToggle(key, value, sidebarCheckbox) {
    sidebarCheckbox.checked = value
    handleSettingUpdate(key, value)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", { detail: { key, value } }),
    )
  }

  DOM.lcpSearchBar.addEventListener("change", () =>
    lcpToggle(
      "showSearchBar",
      DOM.lcpSearchBar.checked,
      DOM.showSearchBarCheckbox,
    ),
  )

  if (DOM.lcpSearchBarWidth) {
    DOM.lcpSearchBarWidth.addEventListener("input", (e) => {
      const width = e.target.value
      if (DOM.lcpSearchBarWidthVal)
        DOM.lcpSearchBarWidthVal.textContent = `${width}${DOM.bookmarkGroupFontSizeInput.value}px`
      if (DOM.searchBarWidthVal)
        DOM.searchBarWidthVal.textContent = `${width}${DOM.bookmarkGroupFontSizeInput.value}px`
      if (DOM.searchBarWidthSlider) DOM.searchBarWidthSlider.value = width
      handleSettingUpdate("searchBarWidth", parseInt(width))
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "searchBarWidth", value: width },
        }),
      )
    })
  }

  if (DOM.lcpBookmarks) {
    DOM.lcpBookmarks.addEventListener("change", () =>
      lcpToggle(
        "showBookmarks",
        DOM.lcpBookmarks.checked,
        DOM.showBookmarksCheckbox,
      ),
    )
  }
  DOM.lcpBookmarkGroups.addEventListener("change", () =>
    lcpToggle(
      "showBookmarkGroups",
      DOM.lcpBookmarkGroups.checked,
      DOM.showBookmarkGroupsCheckbox,
    ),
  )
  DOM.lcpLunarCalendar.addEventListener("change", () =>
    lcpToggle(
      "showLunarCalendar",
      DOM.lcpLunarCalendar.checked,
      DOM.showLunarCalendarCheckbox,
    ),
  )
  if (DOM.lcpFlipLayout) {
    DOM.lcpFlipLayout.addEventListener("change", () =>
      lcpToggle(
        "flipLayout",
        DOM.lcpFlipLayout.checked,
        DOM.flipLayoutCheckbox,
      ),
    )
  }

  DOM.showTopRightControlsCheckbox.addEventListener("change", () => {
    const isVisible = DOM.showTopRightControlsCheckbox.checked
    handleSettingUpdate("showTopRightControls", isVisible)
    const topRightControls = document.getElementById("top-right-controls")
    if (topRightControls) {
      topRightControls.classList.toggle("hidden", !isVisible)
    }
    if (DOM.lcpTopRightControls) {
      DOM.lcpTopRightControls.checked = isVisible
    }
  })

  if (DOM.lcpTopRightControls) {
    DOM.lcpTopRightControls.addEventListener("change", () => {
      const isVisible = DOM.lcpTopRightControls.checked
      DOM.showTopRightControlsCheckbox.checked = isVisible
      handleSettingUpdate("showTopRightControls", isVisible)
      const topRightControls = document.getElementById("top-right-controls")
      if (topRightControls) {
        topRightControls.classList.toggle("hidden", !isVisible)
      }
    })
  }

  DOM.lcpGhostControls.addEventListener("change", () => {
    const isGhost = DOM.lcpGhostControls.checked
    DOM.ghostControlsCheckbox.checked = isGhost
    handleSettingUpdate("sideControlsGhostMode", isGhost)
    document.body.classList.toggle("ghost-controls", isGhost)
  })

  // Music style
  const applyMusicStyle = (style) => {
    DOM.musicStyleSelect.value = style
    if (DOM.lcpMusicStyleSelect) {
      DOM.lcpMusicStyleSelect.value = style
    }
    handleSettingUpdate("musicBarStyle", style)
    window.dispatchEvent(
      new CustomEvent("settingsUpdated", {
        detail: { key: "music_bar_style", value: style },
      }),
    )
  }

  DOM.musicStyleSelect.addEventListener("change", () => {
    applyMusicStyle(DOM.musicStyleSelect.value)
  })

  if (DOM.lcpMusicStyleSelect) {
    DOM.lcpMusicStyleSelect.addEventListener("change", () => {
      applyMusicStyle(DOM.lcpMusicStyleSelect.value)
    })
  }

  if (DOM.lcpMusicUseDefaultColorCheckbox) {
    DOM.lcpMusicUseDefaultColorCheckbox.addEventListener("change", () => {
      const isChecked = DOM.lcpMusicUseDefaultColorCheckbox.checked
      DOM.musicPlayerUseDefaultColorCheckbox.checked = isChecked
      handleSettingUpdate("musicPlayerUseDefaultColor", isChecked)
      window.dispatchEvent(
        new CustomEvent("settingsUpdated", {
          detail: {
            key: "musicPlayerUseDefaultColor",
            value: isChecked,
          },
        }),
      )
    })
  }

  // Sidebar footer collapse
  const sidebarFooter = document.querySelector(".sidebar-footer")
  const footerToggleBtn = document.getElementById("sidebar-footer-toggle")
  if (sidebarFooter && footerToggleBtn) {
    const FOOTER_KEY = "sidebarFooterCollapsed"
    if (localStorage.getItem(FOOTER_KEY) === "1") {
      sidebarFooter.classList.add("collapsed")
    }
    footerToggleBtn.addEventListener("click", () => {
      const isNowCollapsed = sidebarFooter.classList.toggle("collapsed")
      localStorage.setItem(FOOTER_KEY, isNowCollapsed ? "1" : "0")
    })
  }

  // Export/Import settings
  DOM.exportSettingsBtn.addEventListener("click", async () => {
    try {
      const settingsSnapshot = JSON.parse(JSON.stringify(getSettings()))
      const hasUnsplashKey = Boolean(
        settingsSnapshot.unsplashAccessKey &&
        settingsSnapshot.unsplashAccessKey.trim(),
      )
      const localMediaIds = collectLocalMediaIds(settingsSnapshot)
      const hasLocalMedia = localMediaIds.length > 0

      const selected = await showChecklistConfirm(
        [
          {
            key: "settings",
            label: i18n.export_option_settings || "Settings",
            checked: true,
          },
          {
            key: "bookmarks",
            label: i18n.export_option_bookmarks || "Bookmarks",
            checked: true,
          },
          {
            key: "todos",
            label: i18n.export_option_todos || "Todo Items",
            checked: true,
          },
          {
            key: "notepad",
            label: i18n.export_option_notepad || "Notepad Notes",
            checked: true,
          },
          {
            key: "calendarEvents",
            label: i18n.export_option_calendar || "Calendar Events",
            checked: true,
          },
          {
            key: "unsplashAccessKey",
            label:
              i18n.export_option_unsplash_key ||
              "Unsplash Access Key (in Settings)",
            checked: false,
            disabled: !hasUnsplashKey,
          },
          {
            key: "localMedia",
            label:
              i18n.export_option_local_media ||
              "Local Images/Videos (for transfer to another machine)",
            checked: hasLocalMedia,
            disabled: !hasLocalMedia,
          },
        ],
        i18n.confirm_export_include_unsplash_key_title || "Export Settings",
        i18n.export_select_sections || "Select data to include in JSON export.",
      )

      if (!selected) return

      const hasMainSection =
        selected.settings ||
        selected.bookmarks ||
        selected.todos ||
        selected.notepad ||
        selected.calendarEvents ||
        selected.localMedia

      if (!hasMainSection) {
        showAlert(
          i18n.export_select_at_least_one ||
            "Please select at least one section to export.",
        )
        return
      }

      const exportData = {
        version: 2,
        exportedAt: new Date().toISOString(),
      }

      if (selected.settings) {
        if (!selected.unsplashAccessKey) {
          delete settingsSnapshot.unsplashAccessKey
        }
        exportData.settings = settingsSnapshot
      }

      if (selected.bookmarks) {
        try {
          exportData.bookmarks = JSON.parse(
            localStorage.getItem("bookmarks") || "null",
          )
        } catch {
          exportData.bookmarks = null
        }
      }

      if (selected.todos) {
        try {
          exportData.todos = JSON.parse(
            localStorage.getItem("todoItems") || "[]",
          )
        } catch {
          exportData.todos = []
        }
      }

      if (selected.notepad) {
        try {
          exportData.notepad = {
            notes: JSON.parse(localStorage.getItem("notepadNotes") || "[]"),
            detached: JSON.parse(localStorage.getItem("detachedNotes") || "{}"),
            hidden: JSON.parse(localStorage.getItem("hiddenNotes") || "{}"),
          }
        } catch {
          exportData.notepad = { notes: [], detached: {}, hidden: {} }
        }
      }

      if (selected.calendarEvents) {
        try {
          exportData.calendarEvents = JSON.parse(
            localStorage.getItem("calendarEvents") || "[]",
          )
        } catch {
          exportData.calendarEvents = []
        }
      }

      if (selected.localMedia) {
        const media = {}
        for (const id of localMediaIds) {
          try {
            const blob = await getImageBlob(id)
            if (!blob) continue
            media[id] = {
              kind:
                isIdbVideo(id) || blob.type.startsWith("video/")
                  ? "video"
                  : "image",
              mimeType: blob.type || "",
              dataUrl: await blobToDataUrl(blob),
            }
          } catch (err) {
            console.warn("Skip media export for", id, err)
          }
        }
        exportData.media = media
      }

      const payload = JSON.stringify(exportData, null, 2)
      const blob = new Blob([payload], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `startpage-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showAlert(i18n.alert_export_success || "Settings exported!")
    } catch (err) {
      console.error("Export error:", err)
      showAlert("Export failed.")
    }
  })

  DOM.importSettingsBtn.addEventListener("click", () =>
    DOM.importSettingsInput.click(),
  )

  DOM.importSettingsInput.addEventListener("change", async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = null

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      const hasSettings = data.settings && typeof data.settings === "object"
      const hasBookmarks = data.bookmarks && typeof data.bookmarks === "object"
      const hasTodos = Array.isArray(data.todos)
      const hasNotepad = data.notepad && typeof data.notepad === "object"
      const hasCalendarEvents = Array.isArray(data.calendarEvents)
      const hasMedia =
        data.media &&
        typeof data.media === "object" &&
        Object.keys(data.media).length > 0

      if (
        !hasSettings &&
        !hasBookmarks &&
        !hasTodos &&
        !hasNotepad &&
        !hasCalendarEvents &&
        !hasMedia
      ) {
        showAlert(i18n.alert_import_error || "Invalid settings file.")
        return
      }

      showAlert(i18n.alert_importing || "Importing...")

      const mediaIdMap = {}
      if (hasMedia) {
        for (const [oldId, payload] of Object.entries(data.media)) {
          try {
            if (!payload || typeof payload.dataUrl !== "string") continue
            const blob = await dataUrlToBlob(payload.dataUrl)
            const isVideo =
              payload.kind === "video" ||
              oldId.startsWith("idb-video-") ||
              blob.type.startsWith("video/")
            const newId = isVideo
              ? await saveVideo(blob)
              : await saveImage(blob)
            mediaIdMap[oldId] = newId
          } catch (err) {
            console.warn("Skip media import for", oldId, err)
          }
        }
      }

      if (hasSettings) {
        const importedSettings = JSON.parse(JSON.stringify(data.settings))

        if (Object.keys(mediaIdMap).length > 0) {
          if (
            typeof importedSettings.background === "string" &&
            mediaIdMap[importedSettings.background]
          ) {
            importedSettings.background =
              mediaIdMap[importedSettings.background]
          }
          if (Array.isArray(importedSettings.userBackgrounds)) {
            importedSettings.userBackgrounds =
              importedSettings.userBackgrounds.map((id) => mediaIdMap[id] || id)
          }
        }

        Object.assign(getSettings(), importedSettings)
        saveSettings()
        applySettings()
        updateSettingsInputs()
      }

      let requiresReload = false

      if (hasBookmarks) {
        localStorage.setItem("bookmarks", JSON.stringify(data.bookmarks))
        requiresReload = true
      }

      if (hasTodos) {
        localStorage.setItem("todoItems", JSON.stringify(data.todos))
        requiresReload = true
      }

      if (hasNotepad) {
        localStorage.setItem(
          "notepadNotes",
          JSON.stringify(data.notepad.notes || []),
        )
        localStorage.setItem(
          "detachedNotes",
          JSON.stringify(data.notepad.detached || {}),
        )
        localStorage.setItem(
          "hiddenNotes",
          JSON.stringify(data.notepad.hidden || {}),
        )
        requiresReload = true
      }

      if (hasCalendarEvents) {
        localStorage.setItem(
          "calendarEvents",
          JSON.stringify(data.calendarEvents),
        )
        requiresReload = true
      }

      await showAlert(
        i18n.alert_import_success || "Settings imported successfully!",
      )
      if (requiresReload) {
        window.location.reload()
      }
    } catch (err) {
      console.error("Import error:", err)
      showAlert("Import failed.")
    }
  })

  // Custom Title Settings
  if (DOM.showCustomTitleCheckbox) {
    DOM.showCustomTitleCheckbox.addEventListener("change", (e) => {
      handleSettingUpdate("showCustomTitle", e.target.checked)
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "showCustomTitle", value: e.target.checked },
        }),
      )
    })
  }

  if (DOM.freeMoveCustomTitleCheckbox) {
    DOM.freeMoveCustomTitleCheckbox.addEventListener("change", (e) => {
      handleSettingUpdate("freeMoveCustomTitle", e.target.checked)
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "freeMoveCustomTitle", value: e.target.checked },
        }),
      )
    })
  }

  const customTitleFields = [
    { dom: DOM.customTitleText, key: "customTitleText", isCheckbox: false },
    {
      dom: DOM.customTitleMulticolor,
      key: "customTitleMulticolor",
      isCheckbox: true,
    },
    { dom: DOM.customTitleColor, key: "customTitleColor", isCheckbox: false },
    {
      dom: DOM.customTitleFontSize,
      key: "customTitleFontSize",
      isCheckbox: false,
      valDisp: "custom-title-fontsize-val",
    },
    {
      dom: DOM.customTitleLetterSpacing,
      key: "customTitleLetterSpacing",
      isCheckbox: false,
      valDisp: "custom-title-letter-spacing-val",
    },
    {
      dom: DOM.customTitleShadowBlur,
      key: "customTitleShadowBlur",
      isCheckbox: false,
      valDisp: "custom-title-shadow-blur-val",
    },
    {
      dom: DOM.customTitleShadowY,
      key: "customTitleShadowY",
      isCheckbox: false,
      valDisp: "custom-title-shadow-y-val",
    },
    {
      dom: DOM.customTitleShadowColor,
      key: "customTitleShadowColor",
      isCheckbox: false,
    },
    {
      dom: DOM.customTitleBorderSize,
      key: "customTitleBorderSize",
      isCheckbox: false,
      valDisp: "custom-title-border-size-val",
    },
    {
      dom: DOM.customTitleBorderColor,
      key: "customTitleBorderColor",
      isCheckbox: false,
    },
  ]

  customTitleFields.forEach((field) => {
    if (field.dom) {
      field.dom.addEventListener("input", (e) => {
        const val = field.isCheckbox
          ? e.target.checked
          : field.dom.type === "range"
            ? parseInt(e.target.value)
            : e.target.value
        if (field.valDisp) {
          const disp = document.getElementById(field.valDisp)
          if (disp) disp.textContent = val
        }
        updateSetting(field.key, val)
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: field.key, value: val },
          }),
        )
      })
      field.dom.addEventListener("change", (e) => {
        const val = field.isCheckbox
          ? e.target.checked
          : field.dom.type === "range"
            ? parseInt(e.target.value)
            : e.target.value
        handleSettingUpdate(field.key, val)
      })
    }
  })

  // Ensure LCP side controls stay in sync with layout visibility toggles
  window.addEventListener("layoutUpdated", (e) => {
    if (!e.detail) return
    const { key, value } = e.detail
    if (key === "showSearchBar" && DOM.lcpSearchBar)
      DOM.lcpSearchBar.checked = value
    if (key === "showBookmarks" && DOM.lcpBookmarks)
      DOM.lcpBookmarks.checked = value
    if (key === "showBookmarkGroups" && DOM.lcpBookmarkGroups)
      DOM.lcpBookmarkGroups.checked = value
    if (key === "showLunarCalendar" && DOM.lcpLunarCalendar)
      DOM.lcpLunarCalendar.checked = value
    if (key === "sideControlsGhostMode" && DOM.lcpGhostControls)
      DOM.lcpGhostControls.checked = value
    if (key === "showTopRightControls" && DOM.lcpTopRightControls)
      DOM.lcpTopRightControls.checked = value
    if (key === "flipLayout" && DOM.lcpFlipLayout)
      DOM.lcpFlipLayout.checked = value
    if (key === "searchBarWidth" && DOM.lcpSearchBarWidth)
      DOM.lcpSearchBarWidth.value = value
    if (key === "bookmarkLayout" && DOM.lcpBookmarkLayout)
      DOM.lcpBookmarkLayout.value = value
  })
}
