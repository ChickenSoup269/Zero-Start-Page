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
  getImageUrl,
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
    settings.userColors.forEach((item, index) => {
      const color = typeof item === "object" ? item.val : item
      const isFavorite = typeof item === "object" ? item.isFavorite : false

      const el = document.createElement("div")
      el.className = "user-color-item"
      el.dataset.bgId = color
      el.style.background = color
      el.title = `Color ${index + 1}`

      if (isFavorite) {
        const star = document.createElement("i")
        star.className = "fa-solid fa-star favorite-star-badge"
        el.appendChild(star)
      }

      el.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        import("../contextMenu.js").then((m) => {
          m.showContextMenu(e.clientX, e.clientY, index, "userColor")
        })
      })

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
      el.appendChild(removeBtn)

      // Drag and drop for reordering
      const enableDrag = settings.bookmarkEnableDrag === true
      if (enableDrag) {
        el.draggable = true
        el.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", index)
          e.dataTransfer.effectAllowed = "move"
          el.classList.add("dragging")
        })
        el.addEventListener("dragover", (e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = "move"
          el.classList.add("drag-over")
        })
        el.addEventListener("dragleave", () => el.classList.remove("drag-over"))
        el.addEventListener("dragend", () => el.classList.remove("dragging"))
        el.addEventListener("drop", (e) => {
          e.preventDefault()
          el.classList.remove("drag-over")
          const fromIndex = parseInt(e.dataTransfer.getData("text/plain"))
          if (fromIndex !== index) {
            const items = settings.userColors
            const [movedItem] = items.splice(fromIndex, 1)
            items.splice(index, 0, movedItem)
            saveSettings()
            renderUserColors(DOM)
          }
        })
      }

      userColorsGallery.appendChild(el)
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
    settings.userAccentColors.forEach((item, index) => {
      const color = typeof item === "object" ? item.val : item
      const isFavorite = typeof item === "object" ? item.isFavorite : false

      const el = document.createElement("div")
      el.className = "user-color-item accent-preset-item"
      el.dataset.bgId = color
      el.style.background = color
      el.title = `Accent Color: ${color}`

      if (isFavorite) {
        const star = document.createElement("i")
        star.className = "fa-solid fa-star favorite-star-badge"
        el.appendChild(star)
      }

      el.addEventListener("click", () => {
        DOM.accentColorPicker.value = color
        DOM.accentColorPicker.dispatchEvent(new Event("input"))
      })

      el.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        import("../contextMenu.js").then((m) => {
          m.showContextMenu(e.clientX, e.clientY, index, "userAccentColor")
        })
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
      el.appendChild(removeBtn)

      // Drag and drop for reordering
      const enableDrag = settings.bookmarkEnableDrag === true
      if (enableDrag) {
        el.draggable = true
        el.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", index)
          e.dataTransfer.effectAllowed = "move"
          el.classList.add("dragging")
        })
        el.addEventListener("dragover", (e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = "move"
          el.classList.add("drag-over")
        })
        el.addEventListener("dragleave", () => el.classList.remove("drag-over"))
        el.addEventListener("dragend", () => el.classList.remove("dragging"))
        el.addEventListener("drop", (e) => {
          e.preventDefault()
          el.classList.remove("drag-over")
          const fromIndex = parseInt(e.dataTransfer.getData("text/plain"))
          if (fromIndex !== index) {
            const items = settings.userAccentColors
            const [movedItem] = items.splice(fromIndex, 1)
            items.splice(index, 0, movedItem)
            saveSettings()
            renderUserAccentColors(DOM)
          }
        })
      }

      userAccentColorsGallery.appendChild(el)
    })
  }
}

const _videoThumbCache = new Map()

import { fetchUnsplashPhotoById } from "./unsplashFetcher.js"

function extractUnsplashId(url) {
  if (!url || typeof url !== "string") return null
  // Match patterns like photo-1234567890 or other formats containing ID
  const match = url.match(/photo-([a-zA-Z0-9-]+)/)
  return match ? match[1] : null
}

let _repairingMetadata = false

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

  // Repair metadata for old Unsplash backgrounds if needed
  if (!_repairingMetadata && Array.isArray(settings.userBackgrounds)) {
    const oldUnsplashBgs = settings.userBackgrounds.filter(bg => {
        return typeof bg === 'string' && (bg.includes('unsplash.com') || bg.includes('unsplash-'))
    })
    
    if (oldUnsplashBgs.length > 0 && settings.unsplashAccessKey) {
        _repairingMetadata = true
        Promise.all(oldUnsplashBgs.map(async (bgUrl) => {
            const indexInArray = () => settings.userBackgrounds.indexOf(bgUrl)
            try {
                const photoId = extractUnsplashId(bgUrl)
                if (!photoId) {
                    const idx = indexInArray()
                    if (idx !== -1) settings.userBackgrounds[idx] = { id: bgUrl, repairFailed: true }
                    return
                }
                
                const data = await fetchUnsplashPhotoById(settings.unsplashAccessKey, photoId)
                const idx = indexInArray()
                if (idx !== -1) {
                    settings.userBackgrounds[idx] = {
                        id: bgUrl,
                        authorName: data.user?.name || "Unsplash Author",
                        authorUrl: data.user?.links?.html || "",
                        photoUrl: data.links?.html || ""
                    }
                }
            } catch (err) {
                // Silently mark as processed even on error so we don't retry and don't spam console
                const idx = indexInArray()
                if (idx !== -1) {
                    settings.userBackgrounds[idx] = { id: bgUrl, repairFailed: true }
                }
            }
        })).then(() => {
            saveSettings()
            _repairingMetadata = false
            renderLocalBackgrounds(DOM, handleSettingUpdate)
        })
    }
  }

  // User Uploaded Backgrounds
  if (Array.isArray(settings.userBackgrounds)) {
    settings.userBackgrounds.forEach((bgData, index) => {
      const bgId = typeof bgData === "object" ? bgData.id : bgData
      const isFavorite = typeof bgData === "object" ? bgData.isFavorite : false
      const authorName = typeof bgData === "object" ? bgData.authorName : null
      
      const item = document.createElement("div")
      item.className = "local-bg-item user-uploaded"
      item.dataset.bgId = bgId

      // Icon badge for source type (Video/Image/Unsplash)
      const typeIcon = document.createElement("div")
      typeIcon.className = "video-thumb-badge unsplash-credit-badge"
      
      if (authorName) {
          typeIcon.innerHTML = '<i class="fa-brands fa-unsplash"></i>'
          typeIcon.title = `Photo by ${authorName} on Unsplash`
          item.appendChild(typeIcon)

          const authorTag = document.createElement("div")
          authorTag.className = "unsplash-author-tag"
          authorTag.textContent = authorName
          item.appendChild(authorTag)
      } else if (isIdbVideo(bgId)) {
          typeIcon.innerHTML = '<i class="fa-solid fa-video"></i>'
          typeIcon.title = "Local Video"
          item.appendChild(typeIcon)
      } else if (isIdbImage(bgId)) {
          typeIcon.innerHTML = '<i class="fa-solid fa-image"></i>'
          typeIcon.title = "Local Image"
          item.appendChild(typeIcon)
      }

      if (isFavorite) {
        const star = document.createElement("i")
        star.className = "fa-solid fa-star favorite-star-badge"
        item.appendChild(star)
      }

      const applyThumb = (url) => {
          if (!url) return;
          if (isIdbVideo(bgId)) {
              if (_videoThumbCache.has(bgId)) {
                  item.style.backgroundImage = `url('${_videoThumbCache.get(bgId)}')`
                  const placeholder = item.querySelector("i.fa-film")
                  if (placeholder) placeholder.remove()
              } else {
                  const vid = document.createElement("video")
                  vid.src = url
                  vid.muted = true
                  vid.crossOrigin = "anonymous"
                  vid.preload = "metadata"
                  vid.addEventListener("loadedmetadata", () => { 
                      // Capture frame from the middle of the video
                      const midTime = vid.duration > 0 ? vid.duration / 2 : 1.0;
                      vid.currentTime = midTime;
                  }, { once: true })
                  vid.addEventListener("seeked", () => {
                      const canvas = document.createElement("canvas")
                      canvas.width = 480 
                      canvas.height = 270
                      const ctx = canvas.getContext("2d")
                      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height)
                      try {
                          const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
                          _videoThumbCache.set(bgId, dataUrl)
                          item.style.backgroundImage = `url('${dataUrl}')`
                          const placeholder = item.querySelector("i.fa-film")
                          if (placeholder) placeholder.remove()
                      } catch (e) {
                          console.warn("Failed to generate video thumb:", e)
                      }
                      vid.removeAttribute("src")
                      vid.load()
                  }, { once: true })
              }
          } else {
              item.style.backgroundImage = `url('${url}')`
          }
      }

      if (isIdbMedia(bgId)) {
        const cached = getBlobUrlSync(bgId)
        if (cached) {
            applyThumb(cached)
        } else {
            getImageUrl(bgId).then(url => {
                if (url) applyThumb(url)
            })
        }
      } else if (bgId) {
        item.style.backgroundImage = `url('${bgId}')`
      }

      if (isIdbVideo(bgId)) {
        item.classList.add("video-bg-item")
        if (!item.style.backgroundImage) {
            item.innerHTML = '<i class="fa-solid fa-film"></i>'
        }
      }
      item.title = `User ${isIdbVideo(bgId) ? "Video" : "Image"} ${index + 1}`

      item.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        import("../contextMenu.js").then((m) => {
          m.showContextMenu(e.clientX, e.clientY, index, "localBg")
        })
      })

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

      // Drag and drop for reordering
      const enableDrag = settings.bookmarkEnableDrag === true
      if (enableDrag) {
        item.draggable = true
        item.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", index)
          e.dataTransfer.effectAllowed = "move"
          item.classList.add("dragging")
        })
        item.addEventListener("dragover", (e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = "move"
          item.classList.add("drag-over")
        })
        item.addEventListener("dragleave", () =>
          item.classList.remove("drag-over"),
        )
        item.addEventListener("dragend", () => item.classList.remove("dragging"))
        item.addEventListener("drop", (e) => {
          e.preventDefault()
          item.classList.remove("drag-over")
          const fromIndex = parseInt(e.dataTransfer.getData("text/plain"))
          if (fromIndex !== index) {
            const items = settings.userBackgrounds
            const [movedItem] = items.splice(fromIndex, 1)
            items.splice(index, 0, movedItem)
            saveSettings()
            renderLocalBackgrounds(DOM, handleSettingUpdate)
          }
        })
      }

      DOM.localBackgroundGallery.appendChild(item)
    })
  }
  const bgCountSpan = document.getElementById("count-bg")
  if (bgCountSpan) {
    const total =
      1 +
      (Array.isArray(settings.userBackgrounds)
        ? settings.userBackgrounds.length
        : 0)
    bgCountSpan.innerHTML = `<span style="font-size:0.8rem;opacity:0.6;">(${total})</span>`
  }
}

function setupMultiSelectMode(DOM, handleSettingUpdate) {
  if (DOM.localBackgroundGallery.dataset.eventsAttached) return { enterBgSelectMode: () => {}, exitBgSelectMode: () => {} };
  DOM.localBackgroundGallery.dataset.eventsAttached = "true";

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
    DOM.localBackgroundGallery.classList.add("bg-select-mode")
    bgSelectToolbar.style.display = "flex"
    bgSelectModeBtn.style.opacity = "0.4"
    updateBgSelectCount()
  }

  function exitBgSelectMode() {
    bgSelectMode = false
    bgSelectedIds.clear()
    DOM.localBackgroundGallery.classList.remove("bg-select-mode")
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
      // Clear Unsplash credit if switching to a non-Unsplash local image
      updateSetting("unsplashLastCredit", null)
      saveSettings()
      if (DOM.unsplashCredit) {
        DOM.unsplashCredit.style.display = "none"
        DOM.unsplashCredit.innerHTML = ""
      }
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
    const MAX_UPLOADS = 50
    if (getSettings().userBackgrounds.length >= MAX_UPLOADS) {
      showAlert(
        geti18n().alert_upload_limit ||
          `You can only upload up to ${MAX_UPLOADS} custom backgrounds.`,
      )
      e.target.value = null
      return
    }
    try {
        const id = await saveVideo(file)
        getSettings().userBackgrounds.push(id)
        handleSettingUpdate("background", id)
        renderLocalBackgrounds(DOM, handleSettingUpdate)
    } catch (err) {
        console.error("Failed to save video:", err)
        showAlert("Failed to save video. It might be too large or storage is full.")
    }
    e.target.value = null
  })

  DOM.localImageUpload.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      const MAX_UPLOADS = 50
      if (getSettings().userBackgrounds.length >= MAX_UPLOADS) {
        showAlert(
            geti18n().alert_upload_limit ||
            `You can only upload up to ${MAX_UPLOADS} custom backgrounds.`,
        )
        return
      }

      if (file.type === "image/gif") {
        saveImage(file).then((id) => {
          getSettings().userBackgrounds.push(id)
          handleSettingUpdate("background", id)
          renderLocalBackgrounds(DOM, handleSettingUpdate)
        }).catch(err => {
            console.error("Failed to save GIF:", err)
            showAlert("Failed to save GIF image.")
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
                renderLocalBackgrounds(DOM, handleSettingUpdate)
              }).catch(err => {
                console.error("Failed to save image blob:", err)
                showAlert("Failed to save processed image.")
              })
            },
            "image/jpeg",
            0.85,
          )
        }
      }
      reader.onerror = () => {
          showAlert("Failed to read the selected file.")
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
