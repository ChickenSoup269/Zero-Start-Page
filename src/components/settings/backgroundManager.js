/**
 * Background Manager Module
 * Handles background rendering, multi-select deletion, and file uploads
 */

import {
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"
import {
  isIdbMedia,
  isIdbImage,
  isIdbVideo,
  getBlobUrlSync,
  deleteImage,
  saveImage,
  saveVideo,
} from "../../services/imageStore.js"
import { geti18n, applyTranslations } from "../../services/i18n.js"
import { showAlert, showConfirm } from "../../utils/dialog.js"

function renderUserColors(DOM) {
  const settings = getSettings()
  const userColorsGallery = document.getElementById("user-colors-gallery")
  if (!userColorsGallery) return

  userColorsGallery.innerHTML = ""
  if (Array.isArray(settings.userColors)) {
    settings.userColors.forEach((color, index) => {
      const item = document.createElement("div")
      item.className = "user-color-item"
      item.dataset.bgId = color
      item.style.background = color
      item.title = `Color ${index + 1}`
      const removeBtn = document.createElement("button")
      removeBtn.className = "remove-bg-btn"
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
      removeBtn.addEventListener("click", async (e) => {
        e.stopPropagation()
        const i18n = geti18n()
        if (await showConfirm(i18n.alert_delete_bg_confirm)) {
          settings.userColors.splice(index, 1)
          saveSettings()
          renderUserColors(DOM)
        }
      })
      item.appendChild(removeBtn)
      userColorsGallery.appendChild(item)
    })
  }
}

function renderUserAccentColors(DOM) {
  const settings = getSettings()
  const userAccentColorsGallery = document.getElementById(
    "user-accent-colors-gallery",
  )
  if (!userAccentColorsGallery) return

  userAccentColorsGallery.innerHTML = ""
  if (Array.isArray(settings.userAccentColors)) {
    settings.userAccentColors.forEach((color, index) => {
      const item = document.createElement("div")
      item.className = "user-color-item accent-preset-item"
      item.dataset.bgId = color
      item.style.background = color
      item.title = `Accent Color: ${color}`

      item.addEventListener("click", () => {
        DOM.accentColorPicker.value = color
        DOM.accentColorPicker.dispatchEvent(new Event("input"))
      })

      const removeBtn = document.createElement("button")
      removeBtn.className = "remove-bg-btn"
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
      removeBtn.addEventListener("click", async (e) => {
        e.stopPropagation()
        const i18n = geti18n()
        if (await showConfirm(i18n.alert_delete_bg_confirm)) {
          settings.userAccentColors.splice(index, 1)
          saveSettings()
          renderUserAccentColors(DOM)
        }
      })
      item.appendChild(removeBtn)
      userAccentColorsGallery.appendChild(item)
    })
  }
}

function renderLocalBackgrounds(DOM, handleSettingUpdate) {
  const i18n = geti18n()
  const settings = getSettings()
  DOM.localBackgroundGallery.innerHTML = ""

  // Add Random Color Swatch
  const randomItem = document.createElement("div")
  randomItem.className = "local-bg-item random-color-item"
  randomItem.dataset.bgId = "random-color"
  randomItem.title = "Random Color"
  randomItem.innerHTML = '<i class="fa-solid fa-dice"></i>'
  DOM.localBackgroundGallery.appendChild(randomItem)

  // User Uploaded Backgrounds
  if (Array.isArray(settings.userBackgrounds)) {
    settings.userBackgrounds.forEach((bgId, index) => {
      const thumbUrl = isIdbMedia(bgId) ? getBlobUrlSync(bgId) || "" : bgId

      const item = document.createElement("div")
      item.className = "local-bg-item user-uploaded"
      item.dataset.bgId = bgId

      if (isIdbVideo(bgId)) {
        item.classList.add("video-bg-item")
        item.innerHTML = '<i class="fa-solid fa-film"></i>'
        if (thumbUrl) {
          const vid = document.createElement("video")
          vid.src = thumbUrl
          vid.muted = true
          vid.preload = "metadata"
          vid.addEventListener(
            "loadeddata",
            () => {
              vid.currentTime = 0
            },
            { once: true },
          )
          vid.addEventListener(
            "seeked",
            () => {
              const canvas = document.createElement("canvas")
              canvas.width = vid.videoWidth || 160
              canvas.height = vid.videoHeight || 90
              canvas
                .getContext("2d")
                .drawImage(vid, 0, 0, canvas.width, canvas.height)
              item.style.backgroundImage = `url('${canvas.toDataURL()}')`
              const placeholder = item.querySelector("i.fa-film")
              if (placeholder) placeholder.remove()
              const badge = document.createElement("div")
              badge.className = "video-thumb-badge"
              badge.innerHTML = '<i class="fa-solid fa-film"></i>'
              item.appendChild(badge)
            },
            { once: true },
          )
        }
      } else if (thumbUrl) {
        item.style.backgroundImage = `url('${thumbUrl}')`
      }
      item.title = `User ${isIdbVideo(bgId) ? "Video" : "Image"} ${index + 1}`

      const checkBadge = document.createElement("span")
      checkBadge.className = "bg-select-check"
      checkBadge.innerHTML = '<i class="fa-solid fa-check"></i>'
      item.appendChild(checkBadge)

      const removeBtn = document.createElement("button")
      removeBtn.className = "remove-bg-btn"
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
      removeBtn.addEventListener("click", async (e) => {
        e.stopPropagation()
        if (await showConfirm(i18n.alert_delete_bg_confirm)) {
          settings.userBackgrounds.splice(index, 1)
          if (isIdbMedia(bgId)) {
            deleteImage(bgId).catch(() => {})
          }
          if (settings.background === bgId) {
            handleSettingUpdate("background", null)
          } else {
            saveSettings()
            renderLocalBackgrounds(DOM, handleSettingUpdate)
          }
        }
      })
      item.appendChild(removeBtn)
      DOM.localBackgroundGallery.appendChild(item)
    })
  }
}

function setupMultiSelectMode(DOM, handleSettingUpdate) {
  let bgSelectMode = false
  const bgSelectedIds = new Set()
  const bgSelectModeBtn = document.getElementById("bg-select-mode-btn")
  const bgSelectToolbar = document.getElementById("bg-select-toolbar")
  const bgSelectCount = document.getElementById("bg-select-count")
  const bgSelectAllBtn = document.getElementById("bg-select-all-btn")
  const bgDeleteSelectedBtn = document.getElementById("bg-delete-selected-btn")
  const bgSelectCancelBtn = document.getElementById("bg-select-cancel-btn")

  function enterBgSelectMode() {
    bgSelectMode = true
    bgSelectedIds.clear()
    DOM.localBackgroundGallery.classList.add("select-mode")
    bgSelectToolbar.style.display = "flex"
    bgSelectModeBtn.style.opacity = "0.4"
    updateBgSelectCount()
  }

  function exitBgSelectMode() {
    bgSelectMode = false
    bgSelectedIds.clear()
    DOM.localBackgroundGallery.classList.remove("select-mode")
    bgSelectToolbar.style.display = "none"
    bgSelectModeBtn.style.opacity = ""
    DOM.localBackgroundGallery
      .querySelectorAll(".bg-selected")
      .forEach((el) => el.classList.remove("bg-selected"))
  }

  function updateBgSelectCount() {
    bgSelectCount.textContent = `${bgSelectedIds.size} selected`
    bgDeleteSelectedBtn.disabled = bgSelectedIds.size === 0
  }

  bgSelectModeBtn.addEventListener("click", () => {
    if (bgSelectMode) exitBgSelectMode()
    else enterBgSelectMode()
  })

  bgSelectCancelBtn.addEventListener("click", exitBgSelectMode)

  bgSelectAllBtn.addEventListener("click", () => {
    const settings = getSettings()
    const allUserIds = settings.userBackgrounds || []
    if (bgSelectedIds.size === allUserIds.length) {
      bgSelectedIds.clear()
      DOM.localBackgroundGallery
        .querySelectorAll(".local-bg-item.user-uploaded")
        .forEach((el) => el.classList.remove("bg-selected"))
    } else {
      allUserIds.forEach((id) => bgSelectedIds.add(id))
      DOM.localBackgroundGallery
        .querySelectorAll(".local-bg-item.user-uploaded")
        .forEach((el) => el.classList.add("bg-selected"))
    }
    updateBgSelectCount()
  })

  bgDeleteSelectedBtn.addEventListener("click", async () => {
    if (bgSelectedIds.size === 0) return
    const i18n = geti18n()
    const confirmed = await showConfirm(
      `${i18n.alert_delete_bg_confirm || "Delete selected backgrounds?"} (${bgSelectedIds.size})`,
    )
    if (!confirmed) return

    const settings = getSettings()
    const toDelete = Array.from(bgSelectedIds)
    settings.userBackgrounds = (settings.userBackgrounds || []).filter(
      (id) => !bgSelectedIds.has(id),
    )
    for (const id of toDelete) {
      if (isIdbMedia(id)) deleteImage(id).catch(() => {})
    }
    if (bgSelectedIds.has(settings.background)) {
      handleSettingUpdate("background", null)
    } else {
      saveSettings()
    }
    exitBgSelectMode()
    renderLocalBackgrounds(DOM, handleSettingUpdate)
  })

  DOM.localBackgroundGallery.addEventListener("click", (e) => {
    const item = e.target.closest(".local-bg-item")
    if (!item) return

    if (bgSelectMode) {
      if (!item.classList.contains("user-uploaded")) return
      const id = item.dataset.bgId
      if (bgSelectedIds.has(id)) {
        bgSelectedIds.delete(id)
        item.classList.remove("bg-selected")
      } else {
        bgSelectedIds.add(id)
        item.classList.add("bg-selected")
      }
      updateBgSelectCount()
      return
    }

    if (item.dataset.bgId === "random-color") {
      const randomColor = `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`
      handleSettingUpdate("background", randomColor)
    } else {
      handleSettingUpdate("background", item.dataset.bgId)
    }
  })

  return { enterBgSelectMode, exitBgSelectMode }
}

function setupFileUploads(DOM, handleSettingUpdate) {
  DOM.uploadLocalImageBtn.addEventListener("click", () =>
    DOM.localImageUpload.click(),
  )
  DOM.uploadLocalVideoBtn.addEventListener("click", () =>
    DOM.localVideoUpload.click(),
  )

  DOM.localVideoUpload.addEventListener("change", async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const MAX_UPLOADS = 20
    if (getSettings().userBackgrounds.length >= MAX_UPLOADS) {
      showAlert(
        geti18n().alert_upload_limit ||
          `You can only upload up to ${MAX_UPLOADS} custom backgrounds.`,
      )
      e.target.value = null
      return
    }
    const id = await saveVideo(file)
    getSettings().userBackgrounds.push(id)
    handleSettingUpdate("background", id)
    e.target.value = null
  })

  DOM.localImageUpload.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      const MAX_UPLOADS = 20
      if (getSettings().userBackgrounds.length >= MAX_UPLOADS) {
        showAlert(
          `You can only upload up to ${MAX_UPLOADS} custom backgrounds.`,
        )
        return
      }

      if (file.type === "image/gif") {
        saveImage(file).then((id) => {
          getSettings().userBackgrounds.push(id)
          handleSettingUpdate("background", id)
        })
        return
      }

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
}

export {
  renderLocalBackgrounds,
  renderUserColors,
  renderUserAccentColors,
  setupMultiSelectMode,
  setupFileUploads,
}
