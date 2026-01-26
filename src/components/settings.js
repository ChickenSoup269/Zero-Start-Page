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
  saveGradientBtn,
  userGradientsGallery,
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
  clockColorPicker,
  resetClockColorBtn,
  localBackgroundGallery,
  localImageUpload,
  uploadLocalImageBtn,
  searchInput,
  clearBtn,
  unsplashRandomBtn,
  saveColorBtn,
  removeBgBtn,
  userColorsGallery,
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
  bgVideo, // Added bgVideo
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
import { AuraEffect } from "./animations/aura.js"
import { WindEffect } from "./animations/wind.js"
import { HackerEffect } from "./animations/hacker.js"

// Khai báo biến global cho các hiệu ứng
let starFallEffect,
  fallingMeteorEffect,
  shootingStarEffect,
  firefliesEffect,
  networkEffect,
  matrixRainEffect,
  auraEffect,
  windEffect,
  hackerEffect

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
  renderUserColors()
  renderUserGradients()
}

const unsplashPhotoIds = [
  "1470071459604-3b5ec3a7fe05", // Nature Forest
  "1464822759023-fed622ff2c3b", // Mountains
  "1501785888041-af3ef285b470", // Coastal
  "1506744038136-46273834b3fb", // Landscape
  "1519681393784-d120267933ba", // Night Mountains
  "1439405326854-01517487439e", // Ocean
  "1500382017468-9049fed747ef", // Green Field
  "1475924156736-4d2274e62a93", // Beach
  "1502082553048-f009c37129b9", // Forest Sun
  "1532274354234-5f59a78992c2", // Scenic
  "1419242902214-272b3f66ee7a", // Galaxy Night
  "1518709268805-4e9042af9f23", // Aurora
];

function setUnsplashRandomBackground() {
  const randomId = unsplashPhotoIds[Math.floor(Math.random() * unsplashPhotoIds.length)];
  const width = window.innerWidth > 0 ? window.innerWidth : 1920;
  const height = window.innerHeight > 0 ? window.innerHeight : 1080;
  // Use 'photo-' prefix properly and add necessary ixlib for stability
  const imageUrl = `https://images.unsplash.com/photo-${randomId}?auto=format&fit=crop&w=${width}&q=80`;
  handleSettingUpdate("background", imageUrl);
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
  const isUserUploadedBg = bg && (bg.startsWith("data:image") || bg.startsWith("data:video"))
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
    const isVideoUrl = bg.match(/\.(mp4|webm|mov|ogg)$/) || bg.includes("googlevideo") // simplistic check
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
  }
 else {
    // If no background image/color, apply the gradient
    document.body.style.background = `linear-gradient(${settings.gradientAngle}deg, ${settings.gradientStart}, ${settings.gradientEnd})`
  }

  // 2.1 Background Position
  document.documentElement.style.setProperty(
    "--bg-pos-x",
    `${settings.bgPositionX || 50}%`,
  )
  document.documentElement.style.setProperty(
    "--bg-pos-y",
    `${settings.bgPositionY || 50}%`,
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
    if (isPredefinedLocalBg || isUserUploadedBg || (bg && bg.match(/^https?:\/\//))) {
      finalClockColor = "#ffffff" // Images usually look better with white
    } else if (bg) {
      finalClockColor = getContrastYIQ(bg)
    } else {
      // Gradient
      finalClockColor = getContrastYIQ(settings.gradientStart)
    }
  }

  document.documentElement.style.setProperty(
    "--clock-color",
    finalClockColor,
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
  if (auraEffect) auraEffect.stop()
  if (windEffect) windEffect.stop()
  if (hackerEffect) hackerEffect.stop()

  // 5. Start Selected Effect
  switch (settings.effect) {
    case "galaxy":
      starFallEffect.start()
      break
    case "meteor":
      fallingMeteorEffect.start()
      break
    case "shootingStar":
      shootingStarEffect.start()
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
  }

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
  clockSizeInput.value = settings.clockSize
  clockSizeValue.textContent = `${settings.clockSize}rem`
  languageSelect.value = settings.language || "en"
  accentColorPicker.value = settings.accentColor || "#a8c0ff"
  clockColorPicker.value = settings.clockColor || "#ffffff"
  
  bgPosXInput.value = settings.bgPositionX || 50
  bgPosXValue.textContent = `${bgPosXInput.value}%`
  bgPosYInput.value = settings.bgPositionY || 50
  bgPosYValue.textContent = `${bgPosYInput.value}%`

  // Show/Hide Bg Position setting (only for image backgrounds)
  const isImageBg = 
    settings.background && 
    (settings.background.startsWith("photo-") || 
     settings.background.startsWith("local-bg-") || 
     settings.background.startsWith("data:image/") ||
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
  shootingStarColorPicker.value = settings.shootingStarColor || "#ffcc66"
  shootingStarBackgroundColorPicker.value =
    settings.shootingStarBackgroundColor || "#000000"
  shootingStarStarColorPicker.value =
    settings.shootingStarStarColor || "#ffffff"
  networkColorPicker.value = settings.networkColor || "#00bcd4"
  matrixColorPicker.value = settings.matrixColor || "#00FF00"
  auraColorPicker.value = settings.auraColor || "#a8c0ff"
  hackerColorPicker.value = settings.hackerColor || "#00FF00"

  // Visibility of Effect Settings
  meteorColorSetting.style.display =
    settings.effect === "meteor" ? "block" : "none"
  starColorSetting.style.display =
    settings.effect === "galaxy" ? "block" : "none"
  const isShootingStar = settings.effect === "shootingStar"
  shootingStarColorSetting.style.display = isShootingStar ? "block" : "none"
  shootingStarBackgroundColorSetting.style.display = isShootingStar
    ? "block"
    : "none"
  shootingStarStarColorSetting.style.display = isShootingStar ? "block" : "none"
  networkColorSetting.style.display =
    settings.effect === "network" ? "block" : "none"
  matrixColorSetting.style.display =
    settings.effect === "matrix" ? "block" : "none"
  auraColorSetting.style.display =
    settings.effect === "aura" ? "block" : "none"
  hackerColorSetting.style.display =
    settings.effect === "hacker" ? "block" : "none"

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
        if (confirm(i18n.alert_delete_bg_confirm)) {
          settings.userBackgrounds.splice(index, 1)
          if (settings.background === bgUrl) {
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

export function renderUserColors() {
  const settings = getSettings()
  userColorsGallery.innerHTML = ""
  if (Array.isArray(settings.userColors)) {
    settings.userColors.forEach((color, index) => {
      const item = document.createElement("div")
      item.className = "user-color-item"
      item.dataset.bgId = color
      item.style.backgroundColor = color
      item.title = color
      const removeBtn = document.createElement("button")
      removeBtn.className = "remove-bg-btn"
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        settings.userColors.splice(index, 1)
        if (settings.background === color) {
          handleSettingUpdate("background", null)
        } else {
          saveSettings()
          renderUserColors()
        }
      })
      item.appendChild(removeBtn)
      userColorsGallery.appendChild(item)
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
  shootingStarEffect = new ShootingStarEffect(
    "effect-canvas",
    settings.shootingStarColor,
    settings.shootingStarBackgroundColor,
    settings.shootingStarStarColor,
  )
  firefliesEffect = new FirefliesEffect("effect-canvas")
  networkEffect = new NetworkEffect(
    "effect-canvas",
    settings.networkColor || settings.accentColor,
  )
  matrixRainEffect = new MatrixRain(
    "effect-canvas",
    settings.matrixColor,
  )
  auraEffect = new AuraEffect(
    "effect-canvas",
    settings.auraColor,
  )
  windEffect = new WindEffect("effect-canvas")
  hackerEffect = new HackerEffect(
    "effect-canvas",
    settings.hackerColor,
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
    toggle.addEventListener("click", () =>
      toggle.parentElement.classList.toggle("collapsed"),
    )
  })

  languageSelect.addEventListener("change", async () => {
    handleSettingUpdate("language", languageSelect.value)
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

  unsplashRandomBtn.addEventListener("click", setUnsplashRandomBackground)
  saveColorBtn.addEventListener("click", () => {
    const settings = getSettings();
    const color = bgInput.value.trim()
    if (color.match(/^#([0-9a-f]{3}){1,2}$/i)) {
      if (!settings.userColors.includes(color)) {
        if (settings.userColors.length >= 10) {
          alert("You can only save up to 10 custom colors.")
          return
        }
        settings.userColors.push(color)
        saveSettings()
        renderUserColors()
        updateSettingsInputs()
      }
    } else {
      alert("Please enter a valid hex color code (e.g., #ff0000).")
    }
  })

  removeBgBtn.addEventListener("click", () => {
    handleSettingUpdate("background", null) // Set to null to trigger gradient
  })

  uploadLocalImageBtn.addEventListener("click", () => localImageUpload.click())
  localImageUpload.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target.result
        
        // Preserve GIF or handle Video
        if (file.type === "image/gif" || file.type.startsWith("video/")) {
            if (getSettings().userBackgrounds.length >= 5) {
                alert("You can only upload up to 5 custom backgrounds.")
                return
            }
            getSettings().userBackgrounds.push(dataUrl)
            handleSettingUpdate("background", dataUrl)
            return
        }

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
          const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.9)
          if (getSettings().userBackgrounds.length >= 5) {
            alert("You can only upload up to 5 custom backgrounds.")
            return
          }
          getSettings().userBackgrounds.push(resizedDataUrl)
          handleSettingUpdate("background", resizedDataUrl)
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
        const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`
        handleSettingUpdate("background", randomColor)
      } else {
        handleSettingUpdate("background", item.dataset.bgId)
      }
    }
  })

  userColorsGallery.addEventListener("click", (e) => {
    const item = e.target.closest(".user-color-item")
    if (item && !e.target.closest(".remove-bg-btn")) {
      handleSettingUpdate("background", item.dataset.bgId)
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
    const settings = getSettings();
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
        alert("You can only save up to 10 custom gradients.")
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
  shootingStarColorPicker.addEventListener("input", () => {
    updateSetting("shootingStarColor", shootingStarColorPicker.value)
    saveSettings()
    shootingStarEffect.updateParticleColor(shootingStarColorPicker.value)
  })
  shootingStarBackgroundColorPicker.addEventListener("input", () => {
    updateSetting(
      "shootingStarBackgroundColor",
      shootingStarBackgroundColorPicker.value,
    )
    saveSettings()
    shootingStarEffect.updateBackgroundColor(
      shootingStarBackgroundColorPicker.value,
    )
  })
  shootingStarStarColorPicker.addEventListener("input", () => {
    updateSetting("shootingStarStarColor", shootingStarStarColorPicker.value)
    saveSettings()
    shootingStarEffect.updateStarColor(shootingStarStarColorPicker.value)
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

  effectSelect.addEventListener("change", () =>
    handleSettingUpdate("effect", effectSelect.value),
  )
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
  clockColorPicker.addEventListener("input", () => {
    handleSettingUpdate("clockColor", clockColorPicker.value)
  })
  resetClockColorBtn.addEventListener("click", () => {
    handleSettingUpdate("clockColor", null)
  })

  resetSettingsBtn.addEventListener("click", () => {
    if (confirm(i18n.alert_reset)) {
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
  renderUserColors()
  renderUserGradients()
  applySettings()
  document.querySelectorAll(".settings-section").forEach((section) => {
    section.classList.add("collapsed")
  })
}
