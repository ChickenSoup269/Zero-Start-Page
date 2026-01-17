import {
  settingsToggle,
  settingsSidebar,
  closeSettings,
  bgInput,
  bgColorPicker,
  accentColorPicker,
  fontSelect,
  languageSelect,
  effectSelect,
  gradientStartPicker,
  gradientEndPicker,
  gradientAngleInput,
  gradientAngleValue,
  meteorColorPicker,
  meteorColorSetting,
  starColorPicker,
  starColorSetting,
  shootingStarColorPicker,
  shootingStarColorSetting,
  resetSettingsBtn,
  dateFormatSelect,
  clockSizeInput,
  clockSizeValue,
  localBackgroundGallery,
  localImageUpload,
  uploadLocalImageBtn,
  searchInput,
  clearBtn,
} from "../utils/dom.js"
import {
  getSettings,
  updateSetting,
  saveSettings,
  localBackgrounds,
  resetSettingsState,
} from "../services/state.js"
import { geti18n, loadLanguage, applyTranslations } from "../services/i18n.js"
import { getContrastYIQ } from "../utils/colors.js"
import { StarFall } from "./animations/rainGalaxy.js"
import { FallingMeteor } from "./animations/fallingMeteor.js"
import { ShootingStarEffect } from "./animations/shootingStar.js"

let starFallEffect, fallingMeteorEffect, shootingStarEffect

function handleSettingUpdate(key, value) {
  updateSetting(key, value)
  saveSettings()
  applySettings()
  renderLocalBackgrounds() // Re-render gallery to show active state
}

export function applySettings() {
  const settings = getSettings()
  // Reset body classes and inline styles
  document.body.className = ""
  document.body.style.background = ""
  document.body.style.backgroundImage = ""
  document.documentElement.style.setProperty("--text-color", "#ffffff")

  // Background
  const bg = settings.background
  const isPredefinedLocalBg = localBackgrounds.some((b) => b.id === bg)
  const isUserUploadedBg = bg && bg.startsWith("data:image")

  if (isPredefinedLocalBg) {
    document.body.classList.add(bg)
    document.documentElement.style.setProperty("--text-color", "#ffffff")
  } else if (isUserUploadedBg) {
    document.body.classList.add("bg-image-active")
    document.body.style.backgroundImage = `url('${bg}')`
    document.body.style.backgroundSize = "cover"
    document.body.style.backgroundPosition = "center"
    document.documentElement.style.setProperty("--text-color", "#ffffff")
  } else if (bg) {
    document.body.classList.add("bg-image-active")
    if (bg.match(/^https?:\/\//)) {
      document.body.style.backgroundImage = `url('${bg}')`
      document.body.style.backgroundSize = "cover"
      document.body.style.backgroundPosition = "center"
    } else {
      document.body.style.background = bg
      document.documentElement.style.setProperty(
        "--text-color",
        getContrastYIQ(bg)
      )
    }
  } else {
    document.body.style.background = ""
  }

  // Font, Clock Size, Accent Color
  document.documentElement.style.setProperty("--font-primary", settings.font)
  document.documentElement.style.setProperty(
    "--clock-size",
    `${settings.clockSize}rem`
  )
  if (settings.accentColor) {
    document.documentElement.style.setProperty(
      "--accent-color",
      settings.accentColor
    )
  }

  // Effect
  if (starFallEffect) starFallEffect.stop()
  if (fallingMeteorEffect) fallingMeteorEffect.stop()
  if (shootingStarEffect) shootingStarEffect.stop()

  if (settings.effect === "galaxy") starFallEffect.start()
  else if (settings.effect === "meteor") fallingMeteorEffect.start()
  else if (settings.effect === "shootingStar") shootingStarEffect.start()

  // Gradient
  document.documentElement.style.setProperty(
    "--bg-gradient-start",
    settings.gradientStart
  )
  document.documentElement.style.setProperty(
    "--bg-gradient-end",
    settings.gradientEnd
  )
  document.documentElement.style.setProperty(
    "--bg-gradient-angle",
    settings.gradientAngle + "deg"
  )

  updateSettingsInputs()
}

function updateSettingsInputs() {
  const settings = getSettings()
  const isPredefinedLocalBg = localBackgrounds.some(
    (b) => b.id === settings.background
  )
  const isUserUploadedBg =
    settings.background && settings.background.startsWith("data:image")
  bgInput.value =
    isPredefinedLocalBg || isUserUploadedBg ? "" : settings.background
  fontSelect.value = settings.font
  dateFormatSelect.value = settings.dateFormat
  clockSizeInput.value = settings.clockSize
  clockSizeValue.textContent = `${settings.clockSize}rem`
  if (languageSelect) languageSelect.value = settings.language || "en"
  if (accentColorPicker)
    accentColorPicker.value = settings.accentColor || "#a8c0ff"
  effectSelect.value = settings.effect
  gradientStartPicker.value = settings.gradientStart
  gradientEndPicker.value = settings.gradientEnd
  gradientAngleInput.value = settings.gradientAngle
  gradientAngleValue.textContent = settings.gradientAngle

  if (meteorColorPicker)
    meteorColorPicker.value = settings.meteorColor || "#ffffff"
  if (starColorPicker) starColorPicker.value = settings.starColor || "#ffffff"
  if (shootingStarColorPicker)
    shootingStarColorPicker.value = settings.shootingStarColor || "#ffcc66"

  if (meteorColorSetting)
    meteorColorSetting.style.display =
      settings.effect === "meteor" ? "block" : "none"
  if (starColorSetting)
    starColorSetting.style.display =
      settings.effect === "galaxy" ? "block" : "none"
  if (shootingStarColorSetting)
    shootingStarColorSetting.style.display =
      settings.effect === "shootingStar" ? "block" : "none"

  document.querySelectorAll(".local-bg-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.bgId === settings.background)
  })
}

export function renderLocalBackgrounds() {
  const i18n = geti18n()
  const settings = getSettings()
  localBackgroundGallery.innerHTML = ""
  localBackgrounds.forEach((bg) => {
    const item = document.createElement("div")
    item.className = `local-bg-item ${bg.id}`
    item.dataset.bgId = bg.id
    item.title = bg.name
    localBackgroundGallery.appendChild(item)
  })

  if (Array.isArray(settings.userBackgrounds)) {
    settings.userBackgrounds.forEach((bgUrl, index) => {
      const item = document.createElement("div")
      item.className = "local-bg-item user-uploaded"
      item.dataset.bgId = bgUrl
      item.style.backgroundImage = `url('${bgUrl}')`
      item.title = `User Image ${index + 1}`

      const removeBtn = document.createElement("button")
      removeBtn.className = "remove-bg-btn"
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        if (
          confirm(
            i18n.alert_delete_bg_confirm ||
              "Are you sure you want to remove this background?"
          )
        ) {
          settings.userBackgrounds.splice(index, 1)
          if (settings.background === bgUrl) {
            handleSettingUpdate("background", "local-bg-5")
          } else {
            saveSettings()
            renderLocalBackgrounds() // Just re-render the gallery
          }
        }
      })
      item.appendChild(removeBtn)
      localBackgroundGallery.appendChild(item)
    })
  }
}

export function initSettings() {
  const i18n = geti18n()
  const settings = getSettings()
  starFallEffect = new StarFall("effect-canvas", settings.starColor)
  fallingMeteorEffect = new FallingMeteor("effect-canvas", settings.meteorColor)
  shootingStarEffect = new ShootingStarEffect(
    "effect-canvas",
    settings.shootingStarColor
  )

  settingsToggle.addEventListener("click", () =>
    settingsSidebar.classList.add("open")
  )
  closeSettings.addEventListener("click", () =>
    settingsSidebar.classList.remove("open")
  )
  document.addEventListener("click", (e) => {
    if (
      !settingsSidebar.contains(e.target) &&
      !settingsToggle.contains(e.target)
    ) {
      settingsSidebar.classList.remove("open")
    }
  })

  document.querySelectorAll(".section-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      toggle.parentElement.classList.toggle("collapsed")
    })
  })

  languageSelect.addEventListener("change", async () => {
    updateSetting("language", languageSelect.value)
    saveSettings()
    await loadLanguage(getSettings().language)
    applyTranslations()
  })

  bgInput.addEventListener("change", () =>
    handleSettingUpdate("background", bgInput.value.trim())
  )
  bgColorPicker.addEventListener("input", () => {
    bgInput.value = bgColorPicker.value
    handleSettingUpdate("background", bgColorPicker.value)
  })

  uploadLocalImageBtn.addEventListener("click", () => localImageUpload.click())

  localImageUpload.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target.result
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const MAX_SIZE = 800
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
          const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.7)
          if (settings.userBackgrounds.length >= 5) {
            alert("You can only upload up to 5 custom backgrounds.")
            return
          }
          settings.userBackgrounds.push(resizedDataUrl)
          handleSettingUpdate("background", resizedDataUrl)
        }
      }
      reader.readAsDataURL(file)
    }
    e.target.value = null
  })

  localBackgroundGallery.addEventListener("click", (e) => {
    if (e.target.classList.contains("local-bg-item")) {
      handleSettingUpdate("background", e.target.dataset.bgId)
    }
  })

  if (accentColorPicker) {
    accentColorPicker.addEventListener("input", () =>
      handleSettingUpdate("accentColor", accentColorPicker.value)
    )
  }
  if (meteorColorPicker) {
    meteorColorPicker.addEventListener("input", () => {
      updateSetting("meteorColor", meteorColorPicker.value)
      saveSettings()
      fallingMeteorEffect.updateColor(meteorColorPicker.value)
      applySettings()
    })
  }
  if (starColorPicker) {
    starColorPicker.addEventListener("input", () => {
      updateSetting("starColor", starColorPicker.value)
      saveSettings()
      starFallEffect.updateColor(starColorPicker.value)
      applySettings()
    })
  }
  if (shootingStarColorPicker) {
    shootingStarColorPicker.addEventListener("input", () => {
      updateSetting("shootingStarColor", shootingStarColorPicker.value)
      saveSettings()
      shootingStarEffect.updateColor(shootingStarColorPicker.value)
      applySettings()
    })
  }

  effectSelect.addEventListener("change", () => {
    handleSettingUpdate("effect", effectSelect.value)
    const currentSettings = getSettings()
    if (currentSettings.effect === "galaxy") {
      starFallEffect.updateColor(currentSettings.starColor)
    } else if (currentSettings.effect === "meteor") {
      fallingMeteorEffect.updateColor(currentSettings.meteorColor)
    } else if (currentSettings.effect === "shootingStar") {
      shootingStarEffect.updateColor(currentSettings.shootingStarColor)
    }
  })

  gradientStartPicker.addEventListener("input", () =>
    handleSettingUpdate("gradientStart", gradientStartPicker.value)
  )
  gradientEndPicker.addEventListener("input", () =>
    handleSettingUpdate("gradientEnd", gradientEndPicker.value)
  )
  gradientAngleInput.addEventListener("input", () => {
    gradientAngleValue.textContent = gradientAngleInput.value
    handleSettingUpdate("gradientAngle", gradientAngleInput.value)
  })

  fontSelect.addEventListener("change", () =>
    handleSettingUpdate("font", fontSelect.value)
  )
  dateFormatSelect.addEventListener("change", () =>
    handleSettingUpdate("dateFormat", dateFormatSelect.value)
  )
  clockSizeInput.addEventListener("input", () => {
    clockSizeValue.textContent = `${clockSizeInput.value}rem`
    handleSettingUpdate("clockSize", clockSizeInput.value)
  })

  resetSettingsBtn.addEventListener("click", () => {
    if (confirm(i18n.alert_reset)) {
      resetSettingsState()
      applySettings()
      renderLocalBackgrounds()
    }
  })

  // Also initialize search bar logic here as it's simple
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
  applySettings()
  document.querySelectorAll(".settings-section").forEach((section) => {
    section.classList.add("collapsed")
  })
}