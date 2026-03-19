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
import { showAlert, showConfirm } from "../../utils/dialog.js"
import { getImageBlob } from "../../services/imageStore.js"
import { getSvgWaveParams, updateWaveColorPreviews } from "./svgWaveUtils.js"
import {
  setUnsplashRandomBackground,
  populateUnsplashCollections,
} from "./unsplashFetcher.js"
import {
  renderUserColors,
  renderLocalBackgrounds,
} from "./backgroundManager.js"
import { renderUserGradients } from "./gradientManager.js"
import {
  getTabIconChars,
  applyTabIcon,
  renderTabIconPreview,
} from "./tabIcon.js"
import { loadGoogleFont, renderFontGrid } from "./fontManager.js"
import { renderUserSvgWaves } from "./svgWaveManager.js"

export function setupGeneralEventHandlers(
  ctx,
  handleSettingUpdate,
  applySettings,
  updateSettingsInputs,
) {
  const DOM = ctx.DOM
  const i18n = ctx.i18n
  const effects = ctx.effects

  // Sidebar toggle and close
  DOM.settingsToggle.addEventListener("click", () =>
    DOM.settingsSidebar.classList.add("open"),
  )
  DOM.closeSettings.addEventListener("click", () =>
    DOM.settingsSidebar.classList.remove("open"),
  )
  document.addEventListener("click", (e) => {
    if (
      !DOM.settingsSidebar.contains(e.target) &&
      !DOM.settingsToggle.contains(e.target)
    ) {
      DOM.settingsSidebar.classList.remove("open")
    }
  })

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
      showAlert("This background is already saved.")
      return
    }

    if (getSettings().userBackgrounds.length >= 20) {
      showAlert(
        "Gallery full! Please remove some backgrounds before saving more.",
      )
      return
    }

    getSettings().userBackgrounds.push(bg)
    saveSettings()
    renderLocalBackgrounds(DOM, handleSettingUpdate)
    showAlert("Background saved to Local Themes!")
  })

  // Accent color
  DOM.accentColorPicker.addEventListener("input", () =>
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
    DOM.bgBlurValue.textContent = `${DOM.bgBlurInput.value}px`
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

  // Gradient listeners
  const updateCurrentGradient = () => {
    handleSettingUpdate(
      null,
      {
        start: DOM.gradientStartPicker.value,
        end: DOM.gradientEndPicker.value,
        angle: DOM.gradientAngleInput.value,
      },
      true,
    )
  }

  DOM.gradientStartPicker.addEventListener("input", updateCurrentGradient)
  DOM.gradientEndPicker.addEventListener("input", updateCurrentGradient)
  DOM.gradientAngleInput.addEventListener("input", () => {
    DOM.gradientAngleValue.textContent = DOM.gradientAngleInput.value
    updateCurrentGradient()
  })

  DOM.saveGradientBtn.addEventListener("click", () => {
    const settings = getSettings()
    const newGradient = {
      start: DOM.gradientStartPicker.value,
      end: DOM.gradientEndPicker.value,
      angle: DOM.gradientAngleInput.value,
    }
    const alreadyExists = settings.userGradients.some(
      (g) =>
        g.start === newGradient.start &&
        g.end === newGradient.end &&
        g.angle === newGradient.angle,
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
      }
      handleSettingUpdate(null, gradient, true)
    }
  })

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
    const settings = getSettings()
    const nowActive = !settings.svgWaveActive
    updateSetting("svgWaveActive", nowActive)
    if (nowActive) updateSetting("background", null)
    saveSettings()
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
    updateSetting("svgWaveActive", false)
    saveSettings()
    applySettings()
    updateSettingsInputs()
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
    if (settings.userSvgWaves.length >= 12) {
      showAlert("You can only save up to 12 wave presets.")
      return
    }
    settings.userSvgWaves.push(wave)
    saveSettings()
    renderUserSvgWaves(DOM, effects.svgWaveEffect)
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
  DOM.dateFormatSelect.addEventListener("change", () =>
    handleSettingUpdate("dateFormat", DOM.dateFormatSelect.value),
  )

  DOM.hideSecondsCheckbox.addEventListener("change", () => {
    handleSettingUpdate("hideSeconds", DOM.hideSecondsCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "hideSeconds", value: DOM.hideSecondsCheckbox.checked },
      }),
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
    handleSettingUpdate("clockSize", DOM.clockSizeInput.value)
  })

  DOM.clockColorPicker.addEventListener("input", () =>
    handleSettingUpdate("clockColor", DOM.clockColorPicker.value),
  )
  DOM.resetClockColorBtn.addEventListener("click", () =>
    handleSettingUpdate("clockColor", null),
  )

  // Reset all settings
  DOM.resetSettingsBtn.addEventListener("click", async () => {
    if (await showConfirm(i18n.alert_reset)) {
      resetSettingsState()
      applySettings()
      renderLocalBackgrounds(DOM, handleSettingUpdate)
      renderUserColors(DOM)
      renderUserGradients(DOM)
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
  setupLayoutCheckbox(DOM.showNotepadCheckbox, "showNotepad", {})
  setupLayoutCheckbox(DOM.showTimerCheckbox, "showTimer", {})
  setupLayoutCheckbox(DOM.showGregorianCheckbox, "showGregorian", {})
  setupLayoutCheckbox(DOM.showClockCheckbox, "showClock", {})
  setupLayoutCheckbox(DOM.showFullCalendarCheckbox, "showFullCalendar", {})
  setupLayoutCheckbox(DOM.showLunarCalendarCheckbox, "showLunarCalendar", {})
  setupLayoutCheckbox(DOM.showQuickAccessCheckbox, "showQuickAccess", {})
  setupLayoutCheckbox(DOM.showSearchBarCheckbox, "showSearchBar", {})
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
  DOM.lcpBookmarks.addEventListener("change", () =>
    lcpToggle(
      "showBookmarks",
      DOM.lcpBookmarks.checked,
      DOM.showBookmarksCheckbox,
    ),
  )
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
  DOM.lcpQuickAccess.addEventListener("change", () =>
    lcpToggle(
      "showQuickAccess",
      DOM.lcpQuickAccess.checked,
      DOM.showQuickAccessCheckbox,
    ),
  )

  DOM.lcpGhostControls.addEventListener("change", () => {
    const isGhost = DOM.lcpGhostControls.checked
    DOM.ghostControlsCheckbox.checked = isGhost
    handleSettingUpdate("sideControlsGhostMode", isGhost)
    document.body.classList.toggle("ghost-controls", isGhost)
  })

  // Music style
  DOM.musicStyleSelect.addEventListener("change", () => {
    handleSettingUpdate("musicBarStyle", DOM.musicStyleSelect.value)
    window.dispatchEvent(
      new CustomEvent("settingsUpdated", {
        detail: { key: "music_bar_style", value: DOM.musicStyleSelect.value },
      }),
    )
  })

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

      if (hasUnsplashKey) {
        const includeUnsplashKey = await showConfirm(
          i18n.confirm_export_include_unsplash_key ||
            "Include Unsplash Access Key in exported JSON?",
          i18n.confirm_export_include_unsplash_key_title || "Export Settings",
        )

        if (!includeUnsplashKey) {
          delete settingsSnapshot.unsplashAccessKey
        }
      }

      const payload = JSON.stringify(
        { version: 1, settings: settingsSnapshot, images: {} },
        null,
        2,
      )
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

      if (!data.settings || typeof data.settings !== "object") {
        showAlert(i18n.alert_import_error || "Invalid settings file.")
        return
      }

      showAlert(i18n.alert_importing || "Importing...")

      Object.assign(getSettings(), data.settings)
      saveSettings()
      applySettings()
      updateSettingsInputs()
      showAlert("Settings imported successfully!")
    } catch (err) {
      console.error("Import error:", err)
      showAlert("Import failed.")
    }
  })
}
