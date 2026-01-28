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
  bgVideo, // Added bgVideo
  showTodoCheckbox,
  showTimerCheckbox,
  showGregorianCheckbox,
  showMusicCheckbox,
  showClockCheckbox,
  showFullCalendarCheckbox,
  showQuickAccessCheckbox,
  musicStyleSelect,
  unsplashCategorySelect,
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


// Import các hiệu ứng
import { StarFall } from "./animations/rainGalaxy.js"
import { FallingMeteor } from "./animations/fallingMeteor.js"
import { FirefliesEffect } from "./animations/fireflies.js"
import { NetworkEffect } from "./animations/network.js"
import { MatrixRain } from "./animations/matrixRain.js"
import { AuraEffect } from "./animations/aura.js"
import { WindEffect } from "./animations/wind.js"
import { HackerEffect } from "./animations/hacker.js"

// Khai báo biến global cho các hiệu ứng
let starFallEffect,
  fallingMeteorEffect,
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
  renderUserGradients()
}

const unsplashCategories = {
  nature: [
    "1501785882641-5b6281c78209", // Mountains
    "1470770841072-f978cf4d019e", // Landscape
    "1464822759023-fed622ff2c3b", // Peak
    "1441974231531-c6227db76b6e", // Forest
    "1500382017468-9049fed747ef", // Field
    "1472214103451-9374bd1c7dd1", // Nature generic
    "1447752875204-b2650380e6d0", // Nature dark
  ],
  sea: [
    "1439405326854-01517487439e", // Ocean
    "1475924156736-4d2274e62a93", // Beach
    "1507525428034-b723cf961d3e", // Tropical
    "1519046904884-53103b34b206", // Coastal
    "1505118380757-91f5f5632de0", // Sea blue
  ],
  universe: [
    "1419242902214-272b3f66ee7a", // Galaxy
    "1464802686167-b939ba36e6fe", // Stars
    "1518709268805-4e9042af9f23", // Aurora
    "1446776811953-b23d57bd21aa", // Space
    "1536647915526-a979116e0f9b", // Galaxy variant
  ],
  city: [
    "1477959858617-67f85cf4f1df", // Urban
    "1486406146926-c627a92ad1ab", // Skyscrapers
    "1449156003716-168f237f3733", // Street
    "1496568811576-477ff1706b80", // Architecture
    "1480714378408-67cf0d13bc1b", // City night
  ],
  anime: [
    "1541562232579-512a21360020", // Art
    "1578632292335-df3abbb0d586", // Character
    "1528319717648-5183307613c7", // Drawing
    "1569700977233-a3b04c0003cb", // Anime style landscape
  ],
  cyberpunk: [
    "1480714378408-67cf0d13bc1b", // City night (reused)
    "1518709268805-4e9042af9f23", // Aurora (reused)
    "1536647915526-a979116e0f9b", // Galaxy (reused)
    "1496568811576-477ff1706b80", // Architecture (reused)
    // Needs more specific Cyberpunk IDs from user
  ],
  minimalist: [
    "1494438639946-1ebd1d20bf85", // White
    "1458682625221-3a45f8a844c7", // Minimal
    "1439405326854-01517487439e", // Ocean (reused)
    "1464822759023-fed622ff2c3b", // Peak (reused)
  ],
  animals: [
    "1474511320723-9aeb2c2ac808", // Cat/Animal generic (placeholder)
    "1425136736373-c4dbe46f6a7d", // Animal
    "1501785882641-5b6281c78209", // Nature (reused)
    "1441974231531-c6227db76b6e", // Forest (reused)
  ],
}


function setUnsplashRandomBackground(retries = 3) {
  if (retries <= 0) {
    console.error("Failed to fetch Unsplash background after multiple attempts.")
    return
  }

  const settings = getSettings()
  const category = settings.unsplashCategory || "nature"
  const ids = unsplashCategories[category] || unsplashCategories.nature
  const randomId = ids[Math.floor(Math.random() * ids.length)]
  const dpr = window.devicePixelRatio || 1
  const width = Math.round((window.innerWidth > 0 ? window.innerWidth : 1920) * dpr)
  const height = Math.round((window.innerHeight > 0 ? window.innerHeight : 1080) * dpr)
  const imageUrl = `https://images.unsplash.com/photo-${randomId}?auto=format&fit=crop&w=${width}&h=${height}&q=85`

  // Preload to check for 404
  const img = new Image()
  img.onload = () => {
    document.body.classList.add("bg-loading")
    handleSettingUpdate("background", imageUrl)
    setTimeout(() => {
      document.body.classList.remove("bg-loading")
    }, 500)
  }
  img.onerror = () => {
    console.warn(`Unsplash ID ${randomId} failed. Retrying...`)
    setUnsplashRandomBackground(retries - 1)
  }
  img.src = imageUrl
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

  unsplashCategorySelect.value = settings.unsplashCategory || "nature"


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

  networkColorPicker.value = settings.networkColor || "#00bcd4"
  matrixColorPicker.value = settings.matrixColor || "#00FF00"
  auraColorPicker.value = settings.auraColor || "#a8c0ff"
  hackerColorPicker.value = settings.hackerColor || "#00FF00"

  // Visibility of Effect Settings
  meteorColorSetting.style.display =
    settings.effect === "meteor" ? "block" : "none"
  starColorSetting.style.display =
    settings.effect === "galaxy" ? "block" : "none"

  networkColorSetting.style.display =
    settings.effect === "network" ? "block" : "none"
  matrixColorSetting.style.display =
    settings.effect === "matrix" ? "block" : "none"
  auraColorSetting.style.display =
    settings.effect === "aura" ? "block" : "none"
  hackerColorSetting.style.display =
    settings.effect === "hacker" ? "block" : "none"

  // Layout Checkboxes
  showTodoCheckbox.checked = settings.showTodoList !== false
  showTimerCheckbox.checked = settings.showTimer === true
  showGregorianCheckbox.checked = settings.showGregorian !== false
  showMusicCheckbox.checked = settings.musicPlayerEnabled === true
  showClockCheckbox.checked = settings.showClock !== false
  showFullCalendarCheckbox.checked = settings.showFullCalendar === true
  showQuickAccessCheckbox.checked = settings.showQuickAccess !== false
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

  unsplashRandomBtn.addEventListener("click", () => setUnsplashRandomBackground())

  unsplashCategorySelect.addEventListener("change", () => {
    handleSettingUpdate("unsplashCategory", unsplashCategorySelect.value)
  })

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

  saveCurrentBgBtn.addEventListener("click", () => {
    const bg = getSettings().background
    if (!bg) return

    if (getSettings().userBackgrounds.includes(bg)) {
      alert("This background is already saved.")
      return
    }

    if (getSettings().userBackgrounds.length >= 10) {
      alert("Gallery full! Please remove some backgrounds before saving more.")
      return
    }

    getSettings().userBackgrounds.push(bg)
    saveSettings()
    renderLocalBackgrounds()
    alert("Background saved to Local Themes!")
  })

  uploadLocalImageBtn.addEventListener("click", () => localImageUpload.click())
  localImageUpload.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target.result

        // Preserve GIF
        if (file.type === "image/gif") {
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
          const MAX_SIZE = 3840 // Increase to 4K support
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
          const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.95) // Increase quality
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
  renderUserGradients()
  applySettings()
  document.querySelectorAll(".settings-section").forEach((section) => {
    section.classList.add("collapsed")
  })

  // Layout Listeners
  showTodoCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showTodoList", showTodoCheckbox.checked)
    window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "showTodoList", value: showTodoCheckbox.checked } }))
  })
  showTimerCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showTimer", showTimerCheckbox.checked)
    window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "showTimer", value: showTimerCheckbox.checked } }))
  })
  showGregorianCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showGregorian", showGregorianCheckbox.checked)
    window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "showGregorian", value: showGregorianCheckbox.checked } }))
  })
  showMusicCheckbox.addEventListener("change", () => {
    handleSettingUpdate("musicPlayerEnabled", showMusicCheckbox.checked)
    window.dispatchEvent(new CustomEvent("settingsUpdated", { detail: { key: "musicPlayerEnabled", value: showMusicCheckbox.checked } }))
  })
  showClockCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showClock", showClockCheckbox.checked)
    window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "showClock", value: showClockCheckbox.checked } }))
  })
  showFullCalendarCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showFullCalendar", showFullCalendarCheckbox.checked)
    window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "showFullCalendar", value: showFullCalendarCheckbox.checked } }))
  })
  showQuickAccessCheckbox.addEventListener("change", () => {
    handleSettingUpdate("showQuickAccess", showQuickAccessCheckbox.checked)
    window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "showQuickAccess", value: showQuickAccessCheckbox.checked } }))
  })

  // Music style listener
  musicStyleSelect.value = settings.musicBarStyle || "vinyl"
  musicStyleSelect.addEventListener("change", () => {
    handleSettingUpdate("musicBarStyle", musicStyleSelect.value)
    window.dispatchEvent(new CustomEvent("settingsUpdated", { detail: { key: "music_bar_style", value: musicStyleSelect.value } }))
  })
}
