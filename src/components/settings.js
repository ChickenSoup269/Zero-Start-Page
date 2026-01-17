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
  shootingStarBackgroundColorPicker,
  shootingStarBackgroundColorSetting,
  shootingStarStarColorPicker,
  shootingStarStarColorSetting,
  resetSettingsBtn,
  dateFormatSelect,
  clockSizeInput,
  clockSizeValue,
  localBackgroundGallery,
  localImageUpload,
  uploadLocalImageBtn,
  searchInput,
  clearBtn,
  unsplashRandomBtn,
  networkColorPicker,
  networkColorSetting,
  matrixColorPicker,
  matrixColorSetting,
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

// Import các hiệu ứng
import { StarFall } from "./animations/rainGalaxy.js"
import { FallingMeteor } from "./animations/fallingMeteor.js"
import { ShootingStarEffect } from "./animations/shootingStar.js"
import { FirefliesEffect } from "./animations/fireflies.js"
import { NetworkEffect } from "./animations/network.js"
import { MatrixRain } from "./animations/matrixRain.js"

// Khai báo biến global cho các hiệu ứng
let starFallEffect,
  fallingMeteorEffect,
  shootingStarEffect,
  firefliesEffect,
  networkEffect,
  matrixRainEffect

function handleSettingUpdate(key, value) {
  updateSetting(key, value)
  saveSettings()
  applySettings()
  renderLocalBackgrounds()
}

const unsplashUsers = [
  "aleskrivec",
  "eberhardgross",
  "guillaumedegermain",
  "robertlukeman",
  "nate_dumlao",
  "jeremybishop",
  "anniespratt",
  "nasa",
]

function setUnsplashRandomBackground() {
  const randomUser =
    unsplashUsers[Math.floor(Math.random() * unsplashUsers.length)]
  const width = window.innerWidth
  const height = window.innerHeight
  const imageUrl = `https://source.unsplash.com/user/${randomUser}/${width}x${height}`
  handleSettingUpdate("background", imageUrl)
}

export function applySettings() {
  const settings = getSettings()

  // 1. Reset Styles
  document.body.className = ""
  document.body.style.background = ""
  document.body.style.backgroundImage = ""
  document.documentElement.style.setProperty("--text-color", "#ffffff")

  // 2. Background Logic
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
        getContrastYIQ(bg),
      )
    }
  } else {
    document.body.style.background = ""
  }

  // 3. UI Props
  document.documentElement.style.setProperty("--font-primary", settings.font)
  document.documentElement.style.setProperty(
    "--clock-size",
    `${settings.clockSize}rem`,
  )
  if (settings.accentColor) {
    document.documentElement.style.setProperty(
      "--accent-color",
      settings.accentColor,
    )
  }

  // 4. Effects Management (STOP ALL FIRST)
  if (starFallEffect) starFallEffect.stop()
  if (fallingMeteorEffect) fallingMeteorEffect.stop()
  if (shootingStarEffect) shootingStarEffect.stop()
  if (firefliesEffect) firefliesEffect.stop()
  if (networkEffect) networkEffect.stop()
  if (matrixRainEffect) matrixRainEffect.stop()

  // 5. Start Selected Effect
  switch (settings.effect) {
    case "galaxy":
      starFallEffect.start()
      break
    case "meteor":
      fallingMeteorEffect.start()
      break
    case "shootingStar":
      if (shootingStarEffect) {
        shootingStarEffect.updateParticleColor(settings.shootingStarColor)
        shootingStarEffect.updateBackgroundColor(
          settings.shootingStarBackgroundColor,
        )
        shootingStarEffect.updateStarColor(settings.shootingStarStarColor)
      }
      shootingStarEffect.start()
      break
    case "fireflies":
      firefliesEffect.start()
      break
    case "network":
      // Cập nhật màu mới nhất trước khi start (nếu có logic đổi màu)
      if (networkEffect)
        networkEffect.color =
          settings.networkColor || settings.accentColor || "#00bcd4"
      networkEffect.start()
      break
    case "matrix":
      // Cập nhật màu
      if (matrixRainEffect)
        matrixRainEffect.color = settings.matrixColor || "#0F0"
      matrixRainEffect.start()
      break
  }

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
    isPredefinedLocalBg || isUserUploadedBg ? "" : settings.background

  // General Inputs
  fontSelect.value = settings.font
  dateFormatSelect.value = settings.dateFormat
  clockSizeInput.value = settings.clockSize
  clockSizeValue.textContent = `${settings.clockSize}rem`
  if (languageSelect) languageSelect.value = settings.language || "en"
  if (accentColorPicker)
    accentColorPicker.value = settings.accentColor || "#a8c0ff"
  effectSelect.value = settings.effect

  // Gradient Inputs
  gradientStartPicker.value = settings.gradientStart
  gradientEndPicker.value = settings.gradientEnd
  gradientAngleInput.value = settings.gradientAngle
  gradientAngleValue.textContent = settings.gradientAngle

  // Effect Color Inputs
  if (meteorColorPicker)
    meteorColorPicker.value = settings.meteorColor || "#ffffff"
  if (starColorPicker) starColorPicker.value = settings.starColor || "#ffffff"
  if (shootingStarColorPicker)
    shootingStarColorPicker.value = settings.shootingStarColor || "#ffcc66"
  if (shootingStarBackgroundColorPicker)
    shootingStarBackgroundColorPicker.value =
      settings.shootingStarBackgroundColor || "#000000"
  if (shootingStarStarColorPicker)
    shootingStarStarColorPicker.value =
      settings.shootingStarStarColor || "#ffffff"

  // Visibility of Effect Settings
  if (meteorColorSetting)
    meteorColorSetting.style.display =
      settings.effect === "meteor" ? "block" : "none"
  if (starColorSetting)
    starColorSetting.style.display =
      settings.effect === "galaxy" ? "block" : "none"

  const isShootingStarEffect = settings.effect === "shootingStar"
  if (shootingStarColorSetting)
    shootingStarColorSetting.style.display = isShootingStarEffect
      ? "block"
      : "none"
  if (shootingStarBackgroundColorSetting)
    shootingStarBackgroundColorSetting.style.display = isShootingStarEffect
      ? "block"
      : "none"
  if (shootingStarStarColorSetting)
    shootingStarStarColorSetting.style.display = isShootingStarEffect
      ? "block"
      : "none"

  // Logic ẩn/hiện cài đặt cho các hiệu ứng mới (Network, Matrix)
  // Nếu bạn đã thêm HTML cho chúng, hãy uncomment và sửa ID tương ứng:
  /*
  const networkColorSetting = document.getElementById('network-color-setting');
  if (networkColorSetting) networkColorSetting.style.display = settings.effect === "network" ? "block" : "none";
  
  const matrixColorSetting = document.getElementById('matrix-color-setting');
  if (matrixColorSetting) matrixColorSetting.style.display = settings.effect === "matrix" ? "block" : "none";
  */

  // Highlight active background
  document.querySelectorAll(".local-bg-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.bgId === settings.background)
  })
}

export function renderLocalBackgrounds() {
  const i18n = geti18n()
  const settings = getSettings()
  localBackgroundGallery.innerHTML = ""

  // Default Backgrounds
  localBackgrounds.forEach((bg) => {
    const item = document.createElement("div")
    item.className = `local-bg-item ${bg.id}`
    item.dataset.bgId = bg.id
    item.title = bg.name
    localBackgroundGallery.appendChild(item)
  })

  // User Uploaded Backgrounds
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
              "Are you sure you want to remove this background?",
          )
        ) {
          settings.userBackgrounds.splice(index, 1)
          if (settings.background === bgUrl) {
            handleSettingUpdate("background", "local-bg-5")
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

export function initSettings() {
  const i18n = geti18n()
  const settings = getSettings()

  // --- INSTANTIATE EFFECTS ---
  starFallEffect = new StarFall("effect-canvas", settings.starColor)
  fallingMeteorEffect = new FallingMeteor("effect-canvas", settings.meteorColor)
  shootingStarEffect = new ShootingStarEffect(
    "effect-canvas",
    settings.shootingStarColor, // Particle Color
    settings.shootingStarBackgroundColor, // Background Color
    settings.shootingStarStarColor, // Static Star Color
  )

  // New Effects
  firefliesEffect = new FirefliesEffect("effect-canvas")
  // Sử dụng accentColor làm mặc định nếu chưa có networkColor
  networkEffect = new NetworkEffect(
    "effect-canvas",
    settings.networkColor || settings.accentColor || "#00bcd4",
  )
  matrixRainEffect = new MatrixRain(
    "effect-canvas",
    settings.matrixColor || "#0F0",
  )

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
    handleSettingUpdate("background", bgInput.value.trim()),
  )
  bgColorPicker.addEventListener("input", () => {
    bgInput.value = bgColorPicker.value
    handleSettingUpdate("background", bgColorPicker.value)
  })

  unsplashRandomBtn.addEventListener("click", () =>
    setUnsplashRandomBackground(),
  )

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
    accentColorPicker.addEventListener("input", () => {
      handleSettingUpdate("accentColor", accentColorPicker.value)
      // Nếu đang dùng Network effect và chưa có cài đặt màu riêng, update luôn theo accent color
      if (getSettings().effect === "network" && !getSettings().networkColor) {
        if (networkEffect) {
          networkEffect.color = accentColorPicker.value
          // NetworkEffect có thể cần restart hoặc gán lại color tuỳ logic class của bạn
        }
      }
    })
  }

  // --- Effect Color Pickers Listeners ---
  if (meteorColorPicker) {
    meteorColorPicker.addEventListener("input", () => {
      updateSetting("meteorColor", meteorColorPicker.value)
      saveSettings()
      fallingMeteorEffect.updateColor(meteorColorPicker.value)
    })
  }
  if (starColorPicker) {
    starColorPicker.addEventListener("input", () => {
      updateSetting("starColor", starColorPicker.value)
      saveSettings()
      starFallEffect.updateColor(starColorPicker.value)
    })
  }
  if (shootingStarColorPicker) {
    shootingStarColorPicker.addEventListener("input", () => {
      updateSetting("shootingStarColor", shootingStarColorPicker.value)
      saveSettings()
      shootingStarEffect.updateParticleColor(shootingStarColorPicker.value)
    })
  }

  if (shootingStarBackgroundColorPicker) {
    shootingStarBackgroundColorPicker.addEventListener("input", () => {
      updateSetting(
        "shootingStarBackgroundColor",
        shootingStarBackgroundColorPicker.value,
      )
      saveSettings()
      if (shootingStarEffect) {
        shootingStarEffect.updateBackgroundColor(
          shootingStarBackgroundColorPicker.value,
        )
      }
    })
  }

  if (shootingStarStarColorPicker) {
    shootingStarStarColorPicker.addEventListener("input", () => {
      updateSetting("shootingStarStarColor", shootingStarStarColorPicker.value)
      saveSettings()
      if (shootingStarEffect) {
        shootingStarEffect.updateStarColor(shootingStarStarColorPicker.value)
      }
    })
  }

  // --- New Effect Color Pickers Listeners ---
  if (networkColorPicker) {
    networkColorPicker.addEventListener("input", () => {
      updateSetting("networkColor", networkColorPicker.value)
      saveSettings()
      if (networkEffect) {
        networkEffect.color = networkColorPicker.value
        // If the effect is already active, we might need to restart it or manually update its color property
        if (getSettings().effect === "network") {
          networkEffect.stop()
          networkEffect.start()
        }
      }
    })
  }

  if (matrixColorPicker) {
    matrixColorPicker.addEventListener("input", () => {
      updateSetting("matrixColor", matrixColorPicker.value)
      saveSettings()
      if (matrixRainEffect) {
        matrixRainEffect.color = matrixColorPicker.value
        // If the effect is already active, restart it to apply new color
        if (getSettings().effect === "matrix") {
          matrixRainEffect.stop()
          matrixRainEffect.start()
        }
      }
    })
  }

  // Effect Selection Change
  effectSelect.addEventListener("change", () => {
    handleSettingUpdate("effect", effectSelect.value)

    // Đảm bảo cập nhật màu ngay khi chuyển đổi
    const currentSettings = getSettings()
    if (currentSettings.effect === "galaxy")
      starFallEffect.updateColor(currentSettings.starColor)
    else if (currentSettings.effect === "meteor")
      fallingMeteorEffect.updateColor(currentSettings.meteorColor)
    else if (currentSettings.effect === "shootingStar")
      shootingStarEffect.updateParticleColor(currentSettings.shootingStarColor)
    // Fireflies không cần updateColor
    // Network và Matrix được xử lý trong applySettings()
  })

  gradientStartPicker.addEventListener("input", () =>
    handleSettingUpdate("gradientStart", gradientStartPicker.value),
  )
  gradientEndPicker.addEventListener("input", () =>
    handleSettingUpdate("gradientEnd", gradientEndPicker.value),
  )
  gradientAngleInput.addEventListener("input", () => {
    gradientAngleValue.textContent = gradientAngleInput.value
    handleSettingUpdate("gradientAngle", gradientAngleInput.value)
  })

  fontSelect.addEventListener("change", () =>
    handleSettingUpdate("font", fontSelect.value),
  )
  dateFormatSelect.addEventListener("change", () =>
    handleSettingUpdate("dateFormat", dateFormatSelect.value),
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
