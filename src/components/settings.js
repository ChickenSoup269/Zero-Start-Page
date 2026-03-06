import { showAlert, showConfirm } from "../utils/dialog.js"
import {
  saveImage,
  deleteImage,
  getBlobUrlSync,
  isIdbImage,
  getImageBlob,
} from "../services/imageStore.js"
import {
  settingsToggle,
  settingsSidebar,
  closeSettings,
  bgInput,
  bgColorPicker,
  accentColorPicker,
  fontSelect,
  customFontInput,
  loadCustomFontBtn,
  languageSelect,
  effectSelect,
  gradientStartPicker,
  gradientEndPicker,
  gradientAngleInput,
  gradientAngleValue,
  saveGradientBtn,
  userGradientsGallery,
  meteorColorPicker,
  meteorColorSetting,
  starColorPicker,
  starColorSetting,
  resetSettingsBtn,
  exportSettingsBtn,
  importSettingsBtn,
  importSettingsInput,
  dateFormatSelect,
  pageTitleInput,
  clockSizeInput,
  clockSizeValue,
  clockColorPicker,
  resetClockColorBtn,
  localBackgroundGallery,
  localImageUpload,
  uploadLocalImageBtn,
  searchInput,
  clearBtn,
  unsplashRandomBtn,
  saveColorBtn,
  saveCurrentBgBtn,
  removeBgBtn,
  bgPositionSetting,
  bgPosXInput,
  bgPosXValue,
  bgPosYInput,
  bgPosYValue,
  networkColorPicker,
  networkColorSetting,
  matrixColorPicker,
  matrixColorSetting,
  auraColorPicker,
  auraColorSetting,
  hackerColorPicker,
  hackerColorSetting,
  sakuraColorPicker,
  sakuraColorSetting,
  snowfallColorPicker,
  snowfallColorSetting,
  bubblesColorPicker,
  bubblesColorSetting,
  bgVideo, // Added bgVideo
  showTodoCheckbox,
  showNotepadCheckbox,
  showTimerCheckbox,
  showGregorianCheckbox,
  showMusicCheckbox,
  showClockCheckbox,
  showFullCalendarCheckbox,
  showLunarCalendarCheckbox,
  showQuickAccessCheckbox,
  ghostControlsCheckbox,
  showSearchBarCheckbox,
  showBookmarksCheckbox,
  showBookmarkGroupsCheckbox,
  musicStyleSelect,
  unsplashCategorySelect,
  unsplashAccessKeyInput,
  showDateCheckbox,
} from "../utils/dom.js"
import {
  getSettings,
  updateSetting,
  saveSettings,
  localBackgrounds,
  resetSettingsState,
} from "../services/state.js"
import { geti18n, loadLanguage, applyTranslations } from "../services/i18n.js"
import { getContrastYIQ, hexToRgb } from "../utils/colors.js"

// Import các hiệu ứng
import { StarFall } from "./animations/rainGalaxy.js"
import { FallingMeteor } from "./animations/fallingMeteor.js"
import { FirefliesEffect } from "./animations/fireflies.js"
import { NetworkEffect } from "./animations/network.js"
import { MatrixRain } from "./animations/matrixRain.js"
import { AuraEffect } from "./animations/aura.js"
import { WindEffect } from "./animations/wind.js"
import { HackerEffect } from "./animations/hacker.js"
import { ParticlesStormEffect } from "./animations/particlesStorm.js"
import { SakuraEffect } from "./animations/sakura.js"
import { SnowfallEffect } from "./animations/snowfall.js"
import { AuroraWaveEffect } from "./animations/auroraWave.js"
import { ConstellationEffect } from "./animations/constellation.js"
import { BubblesEffect } from "./animations/bubbles.js"

// Khai báo biến global cho các hiệu ứng
let starFallEffect,
  fallingMeteorEffect,
  firefliesEffect,
  networkEffect,
  matrixRainEffect,
  auraEffect,
  windEffect,
  hackerEffect,
  particlesStormEffect,
  sakuraEffect,
  snowfallEffect,
  auroraWaveEffect,
  constellationEffect,
  bubblesEffect

function handleSettingUpdate(key, value, isGradient = false) {
  if (isGradient) {
    updateSetting("gradientStart", value.start)
    updateSetting("gradientEnd", value.end)
    updateSetting("gradientAngle", value.angle)
    updateSetting("background", null) // Unset background image/color
  } else {
    updateSetting(key, value)
  }
  saveSettings()
  applySettings()
  renderLocalBackgrounds()
  renderUserGradients()
}

// Unsplash topics: slug is used directly in the Topics API.
// Topic slugs can be found at https://unsplash.com/t/{slug}
const unsplashCollections = [
  {
    key: "spring-wallpapers",
    id: "spring-wallpapers",
    labelEn: "Spring Wallpapers",
    labelVi: "Hình nền mùa xuân",
  },
  {
    key: "3d-renders",
    id: "3d-renders",
    labelEn: "3D Renders",
    labelVi: "Đồ họa 3D",
  },
  { key: "nature", id: "nature", labelEn: "Nature", labelVi: "Thiên nhiên" },
  {
    key: "textures-patterns",
    id: "textures-patterns",
    labelEn: "Textures",
    labelVi: "Kết cấu & Họa tiết",
  },
  { key: "film", id: "film", labelEn: "Film", labelVi: "Điện ảnh" },
  {
    key: "architecture-interior",
    id: "architecture-interior",
    labelEn: "Architecture",
    labelVi: "Kiến trúc",
  },
  {
    key: "street-photography",
    id: "street-photography",
    labelEn: "Street Photography",
    labelVi: "Nhiếp ảnh đường phố",
  },
  {
    key: "experimental",
    id: "experimental",
    labelEn: "Experimental",
    labelVi: "Thực nghiệm",
  },
  { key: "travel", id: "travel", labelEn: "Travel", labelVi: "Du lịch" },
  { key: "people", id: "people", labelEn: "People", labelVi: "Con người" },
]

function populateUnsplashCollections() {
  const lang = getSettings().language || "en"
  unsplashCategorySelect.innerHTML = ""
  unsplashCollections.forEach((col) => {
    const opt = document.createElement("option")
    opt.value = col.key
    opt.textContent = lang === "vi" ? col.labelVi : col.labelEn
    unsplashCategorySelect.appendChild(opt)
  })
  unsplashCategorySelect.value =
    getSettings().unsplashCategory || "spring-wallpapers"
}

async function setUnsplashRandomBackground() {
  const settings = getSettings()
  const accessKey = settings.unsplashAccessKey || ""
  if (!accessKey) {
    showAlert(
      "Please enter your Unsplash Access Key in Settings.\nGet a free key at: https://unsplash.com/developers",
    )
    return
  }

  const btn = unsplashRandomBtn
  btn.disabled = true
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...'

  const category = settings.unsplashCategory || "spring-wallpapers"
  const collection =
    unsplashCollections.find((c) => c.key === category) ||
    unsplashCollections[0]
  const dpr = window.devicePixelRatio || 1
  const width = Math.round(
    (window.innerWidth > 0 ? window.innerWidth : 1920) * dpr,
  )
  const height = Math.round(
    (window.innerHeight > 0 ? window.innerHeight : 1080) * dpr,
  )

  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?topics=${collection.id}&orientation=landscape&client_id=${encodeURIComponent(accessKey)}`,
    )
    if (!res.ok) throw new Error(`Unsplash API error: ${res.status}`)
    const photo = await res.json()
    const imageUrl = `${photo.urls.raw}&auto=format&fit=crop&w=${width}&h=${height}&q=85`

    document.body.classList.add("bg-loading")
    handleSettingUpdate("background", imageUrl)
    btn.disabled = false
    btn.innerHTML = '<i class="fa-solid fa-sync-alt"></i> Unsplash'
    setTimeout(() => document.body.classList.remove("bg-loading"), 800)
  } catch (err) {
    console.error("Unsplash fetch failed:", err)
    btn.disabled = false
    btn.innerHTML = '<i class="fa-solid fa-sync-alt"></i> Unsplash'
    showAlert(
      "Failed to load Unsplash image. Please check your Access Key and try again.",
    )
  }
}

export function applySettings() {
  const settings = getSettings()

  // 1. Page Title
  document.title = settings.pageTitle || "Start Page"

  // 2. Reset Styles
  document.body.className = ""
  document.body.style.background = ""
  document.body.style.backgroundImage = ""
  document.documentElement.style.setProperty("--text-color", "#ffffff")

  // 3. Background Logic
  let bg = settings.background
  // Resolve IndexedDB image ID to blob URL
  if (isIdbImage(bg)) {
    bg = getBlobUrlSync(bg) || bg
  }
  const isPredefinedLocalBg = localBackgrounds.some((b) => b.id === bg)
  const isUserUploadedBg =
    bg &&
    (bg.startsWith("data:image") ||
      bg.startsWith("data:video") ||
      bg.startsWith("blob:"))
  const bgVideoElement = document.getElementById("bg-video")

  // Hide video by default
  if (bgVideoElement) bgVideoElement.style.display = "none"

  if (isPredefinedLocalBg) {
    document.body.classList.add(bg)
    document.documentElement.style.setProperty("--text-color", "#ffffff")
  } else if (isUserUploadedBg) {
    document.body.classList.add("bg-image-active")
    if (bg.startsWith("data:video")) {
      if (bgVideoElement) {
        bgVideoElement.src = bg
        bgVideoElement.style.display = "block"
      }
    } else {
      document.body.style.backgroundImage = `url('${bg}')`
    }
    document.body.style.backgroundSize = "cover"
    document.documentElement.style.setProperty("--text-color", "#ffffff")
  } else if (bg) {
    document.body.classList.add("bg-image-active")
    const isVideoUrl =
      bg.match(/\.(mp4|webm|mov|ogg)$/) || bg.includes("googlevideo") // simplistic check
    if (isVideoUrl) {
      if (bgVideoElement) {
        bgVideoElement.src = bg
        bgVideoElement.style.display = "block"
      }
      document.documentElement.style.setProperty("--text-color", "#ffffff")
    } else if (bg.match(/^https?:\/\//)) {
      document.body.style.backgroundImage = `url('${bg}')`
      document.documentElement.style.setProperty("--text-color", "#ffffff")
    } else {
      document.body.style.background = bg
      document.documentElement.style.setProperty(
        "--text-color",
        getContrastYIQ(bg),
      )
    }
  } else {
    // If no background image/color, apply the gradient
    document.body.style.background = `linear-gradient(${settings.gradientAngle}deg, ${settings.gradientStart}, ${settings.gradientEnd})`
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

  // 3. UI Props
  document.documentElement.style.setProperty("--font-primary", settings.font)
  document.documentElement.style.setProperty(
    "--clock-size",
    `${settings.clockSize}rem`,
  )

  // 3.1 Clock Color Contrast Logic
  let finalClockColor = settings.clockColor
  if (!finalClockColor) {
    // If null, detect from background
    if (
      isPredefinedLocalBg ||
      isUserUploadedBg ||
      (bg && bg.match(/^https?:\/\//))
    ) {
      finalClockColor = "#ffffff" // Images usually look better with white
    } else if (bg) {
      finalClockColor = getContrastYIQ(bg)
    } else {
      // Gradient
      finalClockColor = getContrastYIQ(settings.gradientStart)
    }
  }

  document.documentElement.style.setProperty("--clock-color", finalClockColor)
  if (settings.accentColor) {
    document.documentElement.style.setProperty(
      "--accent-color",
      settings.accentColor,
    )
    // Also set RGB values for gradient usage
    const rgb = hexToRgb(settings.accentColor)
    if (rgb) {
      document.documentElement.style.setProperty(
        "--accent-color-rgb",
        `${rgb.r}, ${rgb.g}, ${rgb.b}`,
      )
    }
  }

  // 4. Effects Management (STOP ALL FIRST and CLEAR CANVAS)
  if (starFallEffect) starFallEffect.stop()
  if (fallingMeteorEffect) fallingMeteorEffect.stop()

  if (firefliesEffect) firefliesEffect.stop()
  if (networkEffect) networkEffect.stop()
  if (matrixRainEffect) matrixRainEffect.stop()
  if (auraEffect) auraEffect.stop()
  if (windEffect) windEffect.stop()
  if (hackerEffect) hackerEffect.stop()

  if (particlesStormEffect) particlesStormEffect.stop()
  if (sakuraEffect) sakuraEffect.stop()
  if (snowfallEffect) snowfallEffect.stop()
  if (auroraWaveEffect) auroraWaveEffect.stop()
  if (constellationEffect) constellationEffect.stop()
  if (bubblesEffect) bubblesEffect.stop()

  // Clear canvas completely before starting new effect
  const effectCanvas = document.getElementById("effect-canvas")
  if (effectCanvas) {
    const ctx = effectCanvas.getContext("2d")
    ctx.clearRect(0, 0, effectCanvas.width, effectCanvas.height)
    effectCanvas.style.display = "none"
  }

  // Small delay to ensure cleanup is complete
  setTimeout(() => {
    // 5. Start Selected Effect
    switch (settings.effect) {
      case "galaxy":
        starFallEffect.start()
        break
      case "meteor":
        fallingMeteorEffect.start()
        break

      case "fireflies":
        firefliesEffect.start()
        break
      case "network":
        networkEffect.start()
        break
      case "matrix":
        matrixRainEffect.start()
        break
      case "aura":
        auraEffect.start()
        break
      case "wind":
        windEffect.start()
        break
      case "hacker":
        hackerEffect.start()
        break
      case "particlesStorm":
        particlesStormEffect.start()
        break
      case "sakura":
        sakuraEffect.start()
        break
      case "snowfall":
        snowfallEffect.start()
        break
      case "auroraWave":
        auroraWaveEffect.start()
        break
      case "constellation":
        constellationEffect.start()
        break
      case "bubbles":
        bubblesEffect.start()
        break
    }
  }, 50)

  // 6. Gradients (CSS variables are now set by the gradient pickers/savers directly)
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

  updateSettingsInputs()
}

function updateSettingsInputs() {
  const settings = getSettings()

  // Background Inputs
  const isPredefinedLocalBg = localBackgrounds.some(
    (b) => b.id === settings.background,
  )
  const isUserUploadedBg =
    settings.background && settings.background.startsWith("data:image")
  bgInput.value =
    isPredefinedLocalBg || isUserUploadedBg || !settings.background
      ? ""
      : settings.background

  // General Inputs
  fontSelect.value = settings.font
  dateFormatSelect.value = settings.dateFormat
  pageTitleInput.value = settings.pageTitle || "Start Page"
  clockSizeInput.value = settings.clockSize
  clockSizeValue.textContent = `${settings.clockSize}rem`
  languageSelect.value = settings.language || "en"
  accentColorPicker.value = settings.accentColor || "#a8c0ff"
  clockColorPicker.value = settings.clockColor || "#ffffff"

  bgPosXInput.value = settings.bgPositionX || 50
  bgPosXValue.textContent = `${bgPosXInput.value}%`
  bgPosYInput.value = settings.bgPositionY || 50
  bgPosYValue.textContent = `${bgPosYInput.value}%`

  unsplashCategorySelect.value = settings.unsplashCategory || "nature"
  if (unsplashAccessKeyInput)
    unsplashAccessKeyInput.value = settings.unsplashAccessKey || ""

  // Show/Hide Bg Position setting (only for image backgrounds)
  const isImageBg =
    settings.background &&
    (isIdbImage(settings.background) ||
      settings.background.startsWith("data:image/") ||
      settings.background.startsWith("blob:") ||
      settings.background.startsWith("http"))

  bgPositionSetting.style.display = isImageBg ? "block" : "none"

  // If clockColor is null, maybe fade the picker or show it's default
  clockColorPicker.style.opacity = settings.clockColor ? "1" : "0.5"
  effectSelect.value = settings.effect

  // Gradient Inputs
  gradientStartPicker.value = settings.gradientStart
  gradientEndPicker.value = settings.gradientEnd
  gradientAngleInput.value = settings.gradientAngle
  gradientAngleValue.textContent = settings.gradientAngle

  // Effect Color Inputs
  meteorColorPicker.value = settings.meteorColor || "#ffffff"
  starColorPicker.value = settings.starColor || "#ffffff"

  networkColorPicker.value = settings.networkColor || "#00bcd4"
  matrixColorPicker.value = settings.matrixColor || "#00FF00"
  auraColorPicker.value = settings.auraColor || "#a8c0ff"
  hackerColorPicker.value = settings.hackerColor || "#00FF00"
  sakuraColorPicker.value = settings.sakuraColor || "#ffb7c5"
  snowfallColorPicker.value = settings.snowfallColor || "#ffffff"
  bubblesColorPicker.value = settings.bubbleColor || "#60c8ff"

  // Visibility of Effect Settings
  meteorColorSetting.style.display =
    settings.effect === "meteor" ? "block" : "none"
  starColorSetting.style.display =
    settings.effect === "galaxy" ? "block" : "none"

  networkColorSetting.style.display =
    settings.effect === "network" ? "block" : "none"
  matrixColorSetting.style.display =
    settings.effect === "matrix" ? "block" : "none"
  auraColorSetting.style.display = settings.effect === "aura" ? "block" : "none"
  hackerColorSetting.style.display =
    settings.effect === "hacker" ? "block" : "none"
  sakuraColorSetting.style.display =
    settings.effect === "sakura" ? "block" : "none"
  snowfallColorSetting.style.display =
    settings.effect === "snowfall" ? "block" : "none"
  bubblesColorSetting.style.display =
    settings.effect === "bubbles" ? "block" : "none"

  // Layout Checkboxes
  showTodoCheckbox.checked = settings.showTodoList !== false
  showNotepadCheckbox.checked = settings.showNotepad !== false
  showTimerCheckbox.checked = settings.showTimer === true
  showGregorianCheckbox.checked = settings.showGregorian !== false
  showMusicCheckbox.checked = settings.musicPlayerEnabled === true
  showClockCheckbox.checked = settings.showClock !== false
  showFullCalendarCheckbox.checked = settings.showFullCalendar === true
  showLunarCalendarCheckbox.checked = settings.showLunarCalendar !== false
  showQuickAccessCheckbox.checked = settings.showQuickAccess !== false
  showSearchBarCheckbox.checked = settings.showSearchBar !== false
  showBookmarksCheckbox.checked = settings.showBookmarks !== false
  showBookmarkGroupsCheckbox.checked = settings.showBookmarkGroups !== false
  ghostControlsCheckbox.checked = settings.sideControlsGhostMode === true
  document.body.classList.toggle(
    "ghost-controls",
    settings.sideControlsGhostMode === true,
  )
  musicStyleSelect.value = settings.musicBarStyle || "vinyl"

  // Highlight active background
  document.querySelectorAll(".local-bg-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.bgId === settings.background)
  })
  document.querySelectorAll(".user-color-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.bgId === settings.background)
  })
  document.querySelectorAll(".user-gradient-item").forEach((item) => {
    const isActive =
      !settings.background &&
      item.dataset.start === settings.gradientStart &&
      item.dataset.end === settings.gradientEnd &&
      item.dataset.angle === settings.gradientAngle
    item.classList.toggle("active", isActive)
  })
}

export function renderLocalBackgrounds() {
  const i18n = geti18n()
  const settings = getSettings()
  localBackgroundGallery.innerHTML = "" // Clear previous items

  // Add Random Color Swatch
  const randomItem = document.createElement("div")
  randomItem.className = "local-bg-item random-color-item"
  randomItem.dataset.bgId = "random-color"
  randomItem.title = "Random Color"
  randomItem.innerHTML = '<i class="fa-solid fa-dice"></i>'
  localBackgroundGallery.appendChild(randomItem)

  // User Uploaded Backgrounds
  if (Array.isArray(settings.userBackgrounds)) {
    settings.userBackgrounds.forEach((bgId, index) => {
      // Resolve blob URL for thumbnail (IDB ID → cached blob URL)
      const thumbUrl = isIdbImage(bgId) ? getBlobUrlSync(bgId) || "" : bgId

      const item = document.createElement("div")
      item.className = "local-bg-item user-uploaded"
      item.dataset.bgId = bgId
      if (thumbUrl) item.style.backgroundImage = `url('${thumbUrl}')`
      item.title = `User Image ${index + 1}`

      const removeBtn = document.createElement("button")
      removeBtn.className = "remove-bg-btn"
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
      removeBtn.addEventListener("click", async (e) => {
        e.stopPropagation()
        if (await showConfirm(i18n.alert_delete_bg_confirm)) {
          settings.userBackgrounds.splice(index, 1)
          // Xoá khỏi IndexedDB nếu là IDB ID
          if (isIdbImage(bgId)) {
            deleteImage(bgId).catch(() => {})
          }
          if (settings.background === bgId) {
            handleSettingUpdate("background", null)
          } else {
            saveSettings()
            renderLocalBackgrounds()
          }
        }
      })
      item.appendChild(removeBtn)
      localBackgroundGallery.appendChild(item)
    })
  }
}

export function renderUserGradients() {
  const settings = getSettings()
  userGradientsGallery.innerHTML = ""
  if (Array.isArray(settings.userGradients)) {
    settings.userGradients.forEach((gradient, index) => {
      const item = document.createElement("div")
      item.className = "user-gradient-item"
      item.dataset.start = gradient.start
      item.dataset.end = gradient.end
      item.dataset.angle = gradient.angle
      item.style.background = `linear-gradient(${gradient.angle}deg, ${gradient.start}, ${gradient.end})`
      item.title = `Gradient ${index + 1}`
      const removeBtn = document.createElement("button")
      removeBtn.className = "remove-bg-btn"
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        settings.userGradients.splice(index, 1)
        saveSettings()
        renderUserGradients()
        applySettings() // Re-apply to check if the active one was deleted
      })
      item.appendChild(removeBtn)
      userGradientsGallery.appendChild(item)
    })
  }
}

export function initSettings() {
  const i18n = geti18n()
  const settings = getSettings()

  // --- INSTANTIATE EFFECTS ---
  starFallEffect = new StarFall("effect-canvas", settings.starColor)
  fallingMeteorEffect = new FallingMeteor("effect-canvas", settings.meteorColor)
  firefliesEffect = new FirefliesEffect("effect-canvas")
  networkEffect = new NetworkEffect(
    "effect-canvas",
    settings.networkColor || settings.accentColor,
  )
  matrixRainEffect = new MatrixRain("effect-canvas", settings.matrixColor)
  auraEffect = new AuraEffect("effect-canvas", settings.auraColor)
  windEffect = new WindEffect("effect-canvas")
  hackerEffect = new HackerEffect("effect-canvas", settings.hackerColor)

  particlesStormEffect = new ParticlesStormEffect(
    "effect-canvas",
    settings.accentColor,
  )
  sakuraEffect = new SakuraEffect(
    "effect-canvas",
    settings.sakuraColor || "#ffb7c5",
  )
  snowfallEffect = new SnowfallEffect(
    "effect-canvas",
    settings.snowfallColor || "#ffffff",
  )
  auroraWaveEffect = new AuroraWaveEffect("effect-canvas", settings.accentColor)
  constellationEffect = new ConstellationEffect(
    "effect-canvas",
    settings.accentColor,
  )
  bubblesEffect = new BubblesEffect(
    "effect-canvas",
    settings.bubbleColor || "#60c8ff",
  )

  populateUnsplashCollections()

  // --- EVENT LISTENERS ---
  settingsToggle.addEventListener("click", () =>
    settingsSidebar.classList.add("open"),
  )
  closeSettings.addEventListener("click", () =>
    settingsSidebar.classList.remove("open"),
  )
  document.addEventListener("click", (e) => {
    if (
      !settingsSidebar.contains(e.target) &&
      !settingsToggle.contains(e.target)
    ) {
      settingsSidebar.classList.remove("open")
    }
  })

  // Sidebar scroll-to-top & position preservation
  const sidebarContent = settingsSidebar.querySelector(".sidebar-content")
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

  const SECTION_STATE_KEY = "settingsSectionStates"
  const sectionStates = JSON.parse(
    localStorage.getItem(SECTION_STATE_KEY) || "{}",
  )
  document.querySelectorAll(".section-toggle").forEach((toggle) => {
    const section = toggle.parentElement
    const sectionId = section.dataset.sectionId
    // Restore saved state; default = collapsed if no saved state
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

  languageSelect.addEventListener("change", async () => {
    handleSettingUpdate("language", languageSelect.value)
    await loadLanguage(getSettings().language)
    applyTranslations()
    populateUnsplashCollections()
  })

  bgInput.addEventListener("change", () =>
    handleSettingUpdate("background", bgInput.value.trim()),
  )
  bgColorPicker.addEventListener("input", () => {
    bgInput.value = bgColorPicker.value
    handleSettingUpdate("background", bgColorPicker.value)
  })

  unsplashRandomBtn.addEventListener("click", () =>
    setUnsplashRandomBackground(),
  )

  // Keyboard shortcut for random background (Space when focused on Unsplash button)
  unsplashRandomBtn.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault()
      setUnsplashRandomBackground()
    }
  })

  unsplashCategorySelect.addEventListener("change", () => {
    handleSettingUpdate("unsplashCategory", unsplashCategorySelect.value)
  })

  if (unsplashAccessKeyInput) {
    unsplashAccessKeyInput.addEventListener("input", () => {
      handleSettingUpdate(
        "unsplashAccessKey",
        unsplashAccessKeyInput.value.trim(),
      )
    })
  }

  saveColorBtn.addEventListener("click", () => {
    const settings = getSettings()
    const color = bgInput.value.trim()
    if (color.match(/^#([0-9a-f]{3}){1,2}$/i)) {
      if (!settings.userColors.includes(color)) {
        if (settings.userColors.length >= 10) {
          showAlert("You can only save up to 10 custom colors.")
          return
        }
        settings.userColors.push(color)
        saveSettings()
        renderUserColors()
        updateSettingsInputs()
      }
    } else {
      showAlert("Please enter a valid hex color code (e.g., #ff0000).")
    }
  })

  removeBgBtn.addEventListener("click", () => {
    handleSettingUpdate("background", null) // Set to null to trigger gradient
  })

  saveCurrentBgBtn.addEventListener("click", () => {
    const bg = getSettings().background
    if (!bg) return

    // IDB images are already stored — no need to re-save
    if (isIdbImage(bg)) {
      showAlert("This background is already saved.")
      return
    }

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
    renderLocalBackgrounds()
    showAlert("Background saved to Local Themes!")
  })

  uploadLocalImageBtn.addEventListener("click", () => localImageUpload.click())
  localImageUpload.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      // Lưu thẳng Blob vào IndexedDB — không convert sang base64
      const MAX_UPLOADS = 20
      if (getSettings().userBackgrounds.length >= MAX_UPLOADS) {
        showAlert(
          `You can only upload up to ${MAX_UPLOADS} custom backgrounds.`,
        )
        return
      }

      // GIF: lưu trực tiếp không resize
      if (file.type === "image/gif") {
        saveImage(file).then((id) => {
          getSettings().userBackgrounds.push(id)
          handleSettingUpdate("background", id)
        })
        return
      }

      // Ảnh thường: resize xuống tối đa 1920px rồi lưu Blob
      reader.onload = (event) => {
        const dataUrl = event.target.result
        const img = new Image()
        img.src = dataUrl
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const MAX_SIZE = 1920
          let { width, height } = img
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width)
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height)
              height = MAX_SIZE
            }
          }
          canvas.width = width
          canvas.height = height
          canvas.getContext("2d").drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              saveImage(blob).then((id) => {
                getSettings().userBackgrounds.push(id)
                handleSettingUpdate("background", id)
              })
            },
            "image/jpeg",
            0.85,
          )
        }
      }
      reader.readAsDataURL(file)
    }
    e.target.value = null
  })

  localBackgroundGallery.addEventListener("click", (e) => {
    const item = e.target.closest(".local-bg-item")
    if (item) {
      if (item.dataset.bgId === "random-color") {
        const randomColor = `#${Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0")}`
        handleSettingUpdate("background", randomColor)
      } else {
        handleSettingUpdate("background", item.dataset.bgId)
      }
    }
  })

  userGradientsGallery.addEventListener("click", (e) => {
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

  accentColorPicker.addEventListener("input", () =>
    handleSettingUpdate("accentColor", accentColorPicker.value),
  )

  // Accent color presets
  document.querySelectorAll(".accent-color-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const color = btn.dataset.color
      accentColorPicker.value = color
      handleSettingUpdate("accentColor", color)
      // Update active state
      document
        .querySelectorAll(".accent-color-preset")
        .forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")
    })
  })

  bgPosXInput.addEventListener("input", () => {
    bgPosXValue.textContent = `${bgPosXInput.value}%`
    handleSettingUpdate("bgPositionX", bgPosXInput.value)
  })

  bgPosYInput.addEventListener("input", () => {
    bgPosYValue.textContent = `${bgPosYInput.value}%`
    handleSettingUpdate("bgPositionY", bgPosYInput.value)
  })

  // Gradient Listeners
  const updateCurrentGradient = () => {
    handleSettingUpdate(
      null,
      {
        start: gradientStartPicker.value,
        end: gradientEndPicker.value,
        angle: gradientAngleInput.value,
      },
      true,
    )
  }

  gradientStartPicker.addEventListener("input", updateCurrentGradient)
  gradientEndPicker.addEventListener("input", updateCurrentGradient)
  gradientAngleInput.addEventListener("input", () => {
    gradientAngleValue.textContent = gradientAngleInput.value
    updateCurrentGradient()
  })

  saveGradientBtn.addEventListener("click", () => {
    const settings = getSettings()
    const newGradient = {
      start: gradientStartPicker.value,
      end: gradientEndPicker.value,
      angle: gradientAngleInput.value,
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
      renderUserGradients()
      updateSettingsInputs()
    }
  })

  // --- Effect Color Pickers Listeners ---
  meteorColorPicker.addEventListener("input", () => {
    updateSetting("meteorColor", meteorColorPicker.value)
    saveSettings()
    fallingMeteorEffect.updateColor(meteorColorPicker.value)
  })
  starColorPicker.addEventListener("input", () => {
    updateSetting("starColor", starColorPicker.value)
    saveSettings()
    starFallEffect.updateColor(starColorPicker.value)
  })
  networkColorPicker.addEventListener("input", () => {
    updateSetting("networkColor", networkColorPicker.value)
    saveSettings()
    networkEffect.updateColor(networkColorPicker.value)
  })
  matrixColorPicker.addEventListener("input", () => {
    updateSetting("matrixColor", matrixColorPicker.value)
    saveSettings()
    matrixRainEffect.updateColor(matrixColorPicker.value)
  })
  auraColorPicker.addEventListener("input", () => {
    updateSetting("auraColor", auraColorPicker.value)
    saveSettings()
    auraEffect.updateColor(auraColorPicker.value)
  })

  hackerColorPicker.addEventListener("input", () => {
    updateSetting("hackerColor", hackerColorPicker.value)
    saveSettings()
    hackerEffect.updateColor(hackerColorPicker.value)
  })

  sakuraColorPicker.addEventListener("input", () => {
    updateSetting("sakuraColor", sakuraColorPicker.value)
    saveSettings()
    sakuraEffect.color = sakuraColorPicker.value
  })

  snowfallColorPicker.addEventListener("input", () => {
    updateSetting("snowfallColor", snowfallColorPicker.value)
    saveSettings()
    snowfallEffect.color = snowfallColorPicker.value
  })

  bubblesColorPicker.addEventListener("input", () => {
    updateSetting("bubbleColor", bubblesColorPicker.value)
    saveSettings()
    bubblesEffect.color = bubblesColorPicker.value
  })

  effectSelect.addEventListener("change", () =>
    handleSettingUpdate("effect", effectSelect.value),
  )
  fontSelect.addEventListener("change", () =>
    handleSettingUpdate("font", fontSelect.value),
  )

  // Custom Google Font Loader
  loadCustomFontBtn.addEventListener("click", () => {
    const fontName = customFontInput.value.trim()
    if (!fontName) {
      showAlert(i18n.alert_font_error || "Please enter a font name.")
      return
    }

    // Format font name for Google Fonts API (replace spaces with +)
    const formattedFontName = fontName.replace(/\s+/g, "+")
    const googleFontUrl = `https://fonts.googleapis.com/css2?family=${formattedFontName}:wght@300;400;500;600;700&display=swap`

    // Load the font dynamically
    const customFontLink = document.getElementById("custom-google-font")
    customFontLink.href = googleFontUrl

    // Wait a bit for the font to load, then update settings
    setTimeout(() => {
      const fontValue = `'${fontName}', sans-serif`

      // Check if font option already exists in select
      let optionExists = false
      for (let option of fontSelect.options) {
        if (option.value === fontValue) {
          optionExists = true
          break
        }
      }

      // Add to select if not exists
      if (!optionExists) {
        const newOption = document.createElement("option")
        newOption.value = fontValue
        newOption.textContent = `${fontName} (Custom)`
        fontSelect.appendChild(newOption)
      }

      // Select the new font
      fontSelect.value = fontValue
      handleSettingUpdate("font", fontValue)

      showAlert(i18n.alert_font_loaded || "Font loaded successfully!")
      customFontInput.value = "" // Clear input
    }, 500)
  })

  dateFormatSelect.addEventListener("change", () =>
    handleSettingUpdate("dateFormat", dateFormatSelect.value),
  )

  pageTitleInput.addEventListener("input", () => {
    const newTitle = pageTitleInput.value.trim() || "Start Page"
    updateSetting("pageTitle", newTitle)
    saveSettings()
    document.title = newTitle
  })

  clockSizeInput.addEventListener("input", () => {
    clockSizeValue.textContent = `${clockSizeInput.value}rem`
    handleSettingUpdate("clockSize", clockSizeInput.value)
  })
  clockColorPicker.addEventListener("input", () => {
    handleSettingUpdate("clockColor", clockColorPicker.value)
  })
  resetClockColorBtn.addEventListener("click", () => {
    handleSettingUpdate("clockColor", null)
  })

  resetSettingsBtn.addEventListener("click", async () => {
    if (await showConfirm(i18n.alert_reset)) {
      resetSettingsState()
      applySettings()
      renderLocalBackgrounds()
      renderUserColors()
      renderUserGradients()
    }
  })

  searchInput.addEventListener("input", () => {
    clearBtn.style.display = searchInput.value.length > 0 ? "block" : "none"
  })
  clearBtn.addEventListener("click", () => {
    searchInput.value = ""
    searchInput.focus()
    clearBtn.style.display = "none"
  })

  // Final setup
  renderLocalBackgrounds()
  renderUserGradients()
  applySettings()

  // Layout Listeners
  showTodoCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showTodoList", showTodoCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "showTodoList", value: showTodoCheckbox.checked },
      }),
    )
  })
  showNotepadCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showNotepad", showNotepadCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "showNotepad", value: showNotepadCheckbox.checked },
      }),
    )
  })
  showTimerCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showTimer", showTimerCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "showTimer", value: showTimerCheckbox.checked },
      }),
    )
  })
  showGregorianCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showGregorian", showGregorianCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "showGregorian", value: showGregorianCheckbox.checked },
      }),
    )
  })
  showMusicCheckbox.addEventListener("change", () => {
    handleSettingUpdate("musicPlayerEnabled", showMusicCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("settingsUpdated", {
        detail: { key: "musicPlayerEnabled", value: showMusicCheckbox.checked },
      }),
    )
  })
  showClockCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showClock", showClockCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "showClock", value: showClockCheckbox.checked },
      }),
    )
  })
  showFullCalendarCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showFullCalendar", showFullCalendarCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "showFullCalendar",
          value: showFullCalendarCheckbox.checked,
        },
      }),
    )
  })
  showLunarCalendarCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showLunarCalendar", showLunarCalendarCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "showLunarCalendar",
          value: showLunarCalendarCheckbox.checked,
        },
      }),
    )
  })
  showQuickAccessCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showQuickAccess", showQuickAccessCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "showQuickAccess",
          value: showQuickAccessCheckbox.checked,
        },
      }),
    )
  })

  showSearchBarCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showSearchBar", showSearchBarCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "showSearchBar", value: showSearchBarCheckbox.checked },
      }),
    )
  })
  showBookmarksCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showBookmarks", showBookmarksCheckbox.checked)
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "showBookmarks", value: showBookmarksCheckbox.checked },
      }),
    )
  })
  showBookmarkGroupsCheckbox.addEventListener("change", () => {
    handleSettingUpdate(
      "showBookmarkGroups",
      showBookmarkGroupsCheckbox.checked,
    )
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: {
          key: "showBookmarkGroups",
          value: showBookmarkGroupsCheckbox.checked,
        },
      }),
    )
  })

  ghostControlsCheckbox.addEventListener("change", () => {
    const isGhost = ghostControlsCheckbox.checked
    handleSettingUpdate("sideControlsGhostMode", isGhost)
    document.body.classList.toggle("ghost-controls", isGhost)
  })

  // Music style listener
  musicStyleSelect.value = settings.musicBarStyle || "vinyl"
  musicStyleSelect.addEventListener("change", () => {
    handleSettingUpdate("musicBarStyle", musicStyleSelect.value)
    window.dispatchEvent(
      new CustomEvent("settingsUpdated", {
        detail: { key: "music_bar_style", value: musicStyleSelect.value },
      }),
    )
  })

  // --- Sidebar footer collapse toggle ---
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

  // --- Export / Import Settings ---
  exportSettingsBtn.addEventListener("click", async () => {
    const i18n = geti18n()
    try {
      const settingsSnapshot = JSON.parse(JSON.stringify(getSettings()))
      const images = {}

      // Collect all IDB IDs (userBackgrounds + current background)
      const ids = new Set([
        ...(settingsSnapshot.userBackgrounds || []).filter(isIdbImage),
      ])
      if (isIdbImage(settingsSnapshot.background))
        ids.add(settingsSnapshot.background)

      // Convert each Blob → base64 data URL
      for (const id of ids) {
        const blob = await getImageBlob(id)
        if (blob) {
          images[id] = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.readAsDataURL(blob)
          })
        }
      }

      const payload = JSON.stringify(
        { version: 1, settings: settingsSnapshot, images },
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

  importSettingsBtn.addEventListener("click", () => importSettingsInput.click())

  importSettingsInput.addEventListener("change", async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = null
    const i18n = geti18n()

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!data.settings || typeof data.settings !== "object") {
        showAlert(i18n.alert_import_error || "Invalid settings file.")
        return
      }

      showAlert(i18n.alert_importing || "Importing...")

      const importedSettings = data.settings
      const imageMap = data.images || {}
      const idRemap = {}

      // Re-save each bundled image into local IndexedDB
      for (const [oldId, dataUrl] of Object.entries(imageMap)) {
        try {
          const res = await fetch(dataUrl)
          const blob = await res.blob()
          const newId = await saveImage(blob)
          idRemap[oldId] = newId
        } catch {}
      }

      // Replace old IDB IDs with new ones in userBackgrounds
      if (Array.isArray(importedSettings.userBackgrounds)) {
        importedSettings.userBackgrounds = importedSettings.userBackgrounds.map(
          (id) => idRemap[id] || id,
        )
      }
      // Replace old IDB ID in background
      if (importedSettings.background && idRemap[importedSettings.background]) {
        importedSettings.background = idRemap[importedSettings.background]
      }

      // Apply all imported keys to state
      Object.entries(importedSettings).forEach(([key, value]) => {
        updateSetting(key, value)
      })
      saveSettings()
      applySettings()
      renderLocalBackgrounds()
      renderUserGradients()
      showAlert(i18n.alert_import_success || "Settings imported successfully!")
    } catch (err) {
      console.error("Import error:", err)
      showAlert(
        i18n.alert_import_error || "Invalid or corrupted settings file.",
      )
    }
  })
}
