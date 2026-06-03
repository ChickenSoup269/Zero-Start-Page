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
  isIdbGif,
  isIdbVideo,
  getBlobUrlSync,
  getImageUrl,
  getThumbnailUrl,
  saveThumbnail,
  deleteImage,
  saveImage,
  saveVideo,
} from "../../services/imageStore.js"
import { geti18n, applyTranslations } from "../../services/i18n.js"
import { showAlert, showConfirm } from "../../utils/dialog.js"
import { fetchUnsplashPhotoById } from "./unsplashFetcher.js"

let bgSelectMode = false
const bgSelectedIds = new Set()
const cssUrl = (value) => `url(${JSON.stringify(String(value || ""))})`

function getUploadImageProfile(settings = getSettings()) {
  const mode = settings.backgroundMediaQuality || "balanced"
  const profiles = {
    quality: { maxSize: 2560, quality: 0.9 },
    balanced: { maxSize: 1920, quality: 0.82 },
    low: { maxSize: 1440, quality: 0.68 },
    tiny: { maxSize: 960, quality: 0.52 },
    still: { maxSize: 1280, quality: 0.6 },
  }
  return profiles[mode] || profiles.balanced
}

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
      el.className = "local-bg-item user-color-item"
      if (settings.background === color && !settings.svgWaveActive)
        el.classList.add("active")
      el.dataset.bgId = color
      el.style.background = color
      el.title = `Color ${index + 1}`

      if (isFavorite) {
        const star = document.createElement("i")
        star.className = "fa-solid fa-star favorite-star-badge"
        el.appendChild(star)
      }

      const isSelected = bgSelectedIds.has(color)
      const checkBadge = document.createElement("div")
      checkBadge.className = `bg-item-checkbox ${isSelected ? "checked" : ""}`
      checkBadge.innerHTML = '<i class="fa-solid fa-check"></i>'
      el.appendChild(checkBadge)

      const activeIndicator = document.createElement("div")
      activeIndicator.className = "active-indicator"
      activeIndicator.innerHTML = '<i class="fa-solid fa-check"></i>'
      el.appendChild(activeIndicator)

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
      if (settings.accentColor === color) el.classList.add("active")
      el.dataset.bgId = color
      el.style.background = color
      el.style.setProperty("--accent-swatch", color)
      el.title = `Accent Color: ${color}`

      if (isFavorite) {
        const star = document.createElement("i")
        star.className = "fa-solid fa-star favorite-star-badge"
        el.appendChild(star)
      }

      const activeIndicator = document.createElement("div")
      activeIndicator.className = "active-indicator"
      activeIndicator.innerHTML = '<i class="fa-solid fa-check"></i>'
      el.appendChild(activeIndicator)

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

function extractUnsplashId(url) {
  if (!url || typeof url !== "string") return null
  // Match patterns like photo-1234567890 or other formats containing ID
  const match = url.match(/photo-([a-zA-Z0-9-]+)/)
  return match ? match[1] : null
}

/** Helper to generate and save a thumbnail from a Blob (Image or Video) */
async function _ensureThumbnail(id, blobOrUrl, isVideo) {
  // Try to get existing thumbnail first
  const existing = await getThumbnailUrl(id)
  if (existing) return existing

  return new Promise((resolve) => {
    const MAX_THUMB = 240 // Optimized size for gallery
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    const createThumbFromElement = (element, w, h) => {
      if (w === 0 || h === 0) return resolve(null)
      if (w > h) {
        canvas.width = MAX_THUMB
        canvas.height = Math.round((h * MAX_THUMB) / w)
      } else {
        canvas.height = MAX_THUMB
        canvas.width = Math.round((w * MAX_THUMB) / h)
      }
      ctx.drawImage(element, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        async (thumbBlob) => {
          if (thumbBlob) {
            await saveThumbnail(id, thumbBlob)
            resolve(URL.createObjectURL(thumbBlob))
          } else resolve(null)
        },
        "image/jpeg",
        0.7,
      ) // Good balance of quality/size
    }

    if (isVideo) {
      const vid = document.createElement("video")
      vid.muted = true
      vid.preload = "metadata"
      vid.src =
        typeof blobOrUrl === "string"
          ? blobOrUrl
          : URL.createObjectURL(blobOrUrl)

      vid.addEventListener(
        "loadedmetadata",
        () => {
          vid.currentTime = vid.duration > 0 ? vid.duration / 2 : 1.0
        },
        { once: true },
      )

      vid.addEventListener(
        "seeked",
        () => {
          setTimeout(() => {
            if (vid.videoWidth > 0)
              createThumbFromElement(vid, vid.videoWidth, vid.videoHeight)
            else resolve(null)
            if (typeof blobOrUrl !== "string") URL.revokeObjectURL(vid.src)
            vid.removeAttribute("src")
            vid.load()
          }, 150)
        },
        { once: true },
      )

      vid.addEventListener("error", () => resolve(null))
    } else {
      const img = new Image()
      img.src =
        typeof blobOrUrl === "string"
          ? blobOrUrl
          : URL.createObjectURL(blobOrUrl)
      img.onload = () => {
        createThumbFromElement(img, img.width, img.height)
        if (typeof blobOrUrl !== "string") URL.revokeObjectURL(img.src)
      }
      img.onerror = () => resolve(null)
    }
  })
}

function renderLocalBackgrounds(DOM, handleSettingUpdate) {
  const i18n = geti18n()
  const settings = getSettings()

  // Clear all galleries
  if (DOM.localBackgroundGallery) DOM.localBackgroundGallery.innerHTML = ""

  const imagesGallery = document.getElementById("local-images-gallery")
  const gifsGallery = document.getElementById("local-gifs-gallery")
  const videosGallery = document.getElementById("local-videos-gallery")
  if (imagesGallery) imagesGallery.innerHTML = ""
  if (gifsGallery) gifsGallery.innerHTML = ""
  if (videosGallery) videosGallery.innerHTML = ""

  // User Uploaded Backgrounds
  if (Array.isArray(settings.userBackgrounds)) {
    settings.userBackgrounds.forEach((bgData, index) => {
      const bgId = typeof bgData === "object" ? bgData.id : bgData
      const bgUid = typeof bgData === "object" ? bgData.uid || bgId : bgId
      const isFavorite = typeof bgData === "object" ? bgData.isFavorite : false
      const authorName =
        typeof bgData === "object" ? bgData.authorName || bgData.author : null
      const isVideo = isIdbVideo(bgId)
      const isGif =
        isIdbGif(bgId) || (typeof bgData === "object" && bgData.type === "gif")

      const item = document.createElement("div")
      item.className = "local-bg-item user-uploaded"
      const thumbLayer = document.createElement("div")
      thumbLayer.className = "local-bg-thumb"
      item.appendChild(thumbLayer)

      // Match active state by UID if possible, otherwise by ID
      const isActive =
        settings.activeBgUid === bgUid ||
        (settings.background === bgId && !settings.activeBgUid)
      if (
        isActive &&
        !settings.svgWaveActive &&
        !settings.gradientV2Active &&
        !settings.silkActive &&
        !settings.lightPillarActive &&
        !settings.liquidEtherActive &&
        !settings.splashCursorActive
      )
        item.classList.add("active")

      item.dataset.bgId = bgId
      item.dataset.bgUid = bgUid

      // Icon badge for source type
      const typeIcon = document.createElement("div")
      typeIcon.className = "video-thumb-badge"

      if (authorName) {
        typeIcon.innerHTML = '<i class="fa-brands fa-unsplash"></i>'
        item.appendChild(typeIcon)
        const authorTag = document.createElement("div")
        authorTag.className = "unsplash-author-tag"
        authorTag.textContent = authorName
        item.appendChild(authorTag)
      } else if (isVideo) {
        typeIcon.innerHTML = '<i class="fa-solid fa-video"></i>'
        typeIcon.classList.add("is-video")
        item.appendChild(typeIcon)
      } else if (isGif) {
        typeIcon.innerHTML = '<i class="fa-solid fa-film"></i>'
        typeIcon.classList.add("is-gif")
        item.appendChild(typeIcon)
      } else if (isIdbImage(bgId)) {
        typeIcon.innerHTML = '<i class="fa-solid fa-image"></i>'
        typeIcon.classList.add("is-image")
        item.appendChild(typeIcon)
      }

      if (isFavorite) {
        const star = document.createElement("i")
        star.className = "fa-solid fa-star favorite-star-badge"
        item.appendChild(star)
      }

      // Performance Optimization: Always try to use small thumbnail for gallery
      if (isIdbMedia(bgId)) {
        const cachedUrl = getBlobUrlSync(bgId)
        if (cachedUrl) {
          thumbLayer.style.backgroundImage = cssUrl(cachedUrl)
        } else if (
          isActive &&
          typeof settings.lastUserBackgroundPreview === "string" &&
          settings.lastUserBackgroundPreview.startsWith("data:image")
        ) {
          thumbLayer.style.backgroundImage = cssUrl(
            settings.lastUserBackgroundPreview,
          )
        }
        getThumbnailUrl(bgId).then(async (thumbUrl) => {
          if (thumbUrl) {
            thumbLayer.style.backgroundImage = cssUrl(thumbUrl)
          } else {
            const originalUrl = await getImageUrl(bgId)
            if (originalUrl) {
              const newThumb = await _ensureThumbnail(
                bgId,
                originalUrl,
                isVideo,
              )
              if (newThumb) {
                thumbLayer.style.backgroundImage = cssUrl(newThumb)
              } else {
                thumbLayer.style.backgroundImage = cssUrl(originalUrl)
              }
            }
          }
        })
      } else if (bgId) {
        thumbLayer.style.backgroundImage = cssUrl(bgId)
      }

      if (isVideo) item.classList.add("video-bg-item")
      if (isGif) item.classList.add("gif-bg-item")
      item.title = `User ${isVideo ? "Video" : isGif ? "GIF" : "Image"} ${index + 1}`

      item.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        import("../contextMenu.js").then((m) => {
          m.showContextMenu(e.clientX, e.clientY, index, "localBg")
        })
      })

      const isSelected = bgSelectedIds.has(bgUid) || bgSelectedIds.has(bgId)

      const checkBadge = document.createElement("div")
      checkBadge.className = `bg-item-checkbox ${isSelected ? "checked" : ""}`
      checkBadge.innerHTML = '<i class="fa-solid fa-check"></i>'
      item.appendChild(checkBadge)

      const activeIndicator = document.createElement("div")
      activeIndicator.className = "active-indicator"
      activeIndicator.innerHTML = '<i class="fa-solid fa-check"></i>'
      item.appendChild(activeIndicator)

      const removeBtn = document.createElement("button")
      removeBtn.className = "remove-bg-btn"
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
      removeBtn.addEventListener("click", async (e) => {
        e.stopPropagation()
        if (await showConfirm(i18n.alert_delete_bg_confirm)) {
          settings.userBackgrounds.splice(index, 1)
          if (isIdbMedia(bgId)) {
            // Only delete from IndexedDB if no other entries use this ID
            const count = settings.userBackgrounds.filter(
              (b) => (typeof b === "object" ? b.id : b) === bgId,
            ).length
            if (count === 0) deleteImage(bgId).catch(() => {})
          }
          if (settings.activeBgUid === bgUid) {
            updateSetting("activeBgUid", null)
            handleSettingUpdate("background", null)
          } else {
            saveSettings()
            renderLocalBackgrounds(DOM, handleSettingUpdate)
          }
        }
      })
      item.appendChild(removeBtn)

      // Drag and drop logic
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
        item.addEventListener("dragend", () =>
          item.classList.remove("dragging"),
        )
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

      if (isVideo) {
        if (videosGallery) videosGallery.appendChild(item)
      } else if (isGif) {
        if (gifsGallery) gifsGallery.appendChild(item)
      } else {
        if (imagesGallery) imagesGallery.appendChild(item)
      }
    })
  }

  // Show/hide sections based on content
  if (imagesGallery && videosGallery) {
    const hasGifs = !!settings.userBackgrounds?.some((bg) => {
      const bgId = typeof bg === "object" ? bg.id : bg
      return isIdbGif(bgId) || (typeof bg === "object" && bg.type === "gif")
    })
    const hasVideos = !!settings.userBackgrounds?.some((bg) =>
      isIdbVideo(typeof bg === "object" ? bg.id : bg),
    )
    const gifsSection = document.getElementById("local-gifs-section")
    if (gifsSection) gifsSection.style.display = hasGifs ? "block" : "none"
    document.getElementById("local-videos-section").style.display = hasVideos
      ? "block"
      : "none"
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
  if (DOM.localBackgroundGallery.dataset.eventsAttached)
    return { enterBgSelectMode: () => {}, exitBgSelectMode: () => {} }
  DOM.localBackgroundGallery.dataset.eventsAttached = "true"

  const bgSelectModeBtn = document.getElementById("bg-select-mode-btn")
  const bgSelectToolbar = document.getElementById("bg-select-toolbar")
  const bgSelectCount = document.getElementById("bg-select-count")
  const bgSelectAllBtn = document.getElementById("bg-select-all-btn")
  const bgDeleteSelectedBtn = document.getElementById("bg-delete-selected-btn")
  const bgSelectCancelBtn = document.getElementById("bg-select-cancel-btn")

  function enterBgSelectMode() {
    bgSelectMode = true
    bgSelectedIds.clear()

    // Apply select mode class to all relevant gallery containers
    const containers = [
      DOM.localBackgroundGallery,
      document.getElementById("local-images-gallery"),
      document.getElementById("local-gifs-gallery"),
      document.getElementById("local-videos-gallery"),
      document.getElementById("user-colors-gallery"),
    ].filter(Boolean)

    containers.forEach((c) => c.classList.add("bg-select-mode"))

    bgSelectToolbar.style.display = "flex"
    bgSelectModeBtn.style.opacity = "0.4"
    updateBgSelectCount()
  }

  function exitBgSelectMode() {
    bgSelectMode = false
    bgSelectedIds.clear()

    const containers = [
      DOM.localBackgroundGallery,
      document.getElementById("local-images-gallery"),
      document.getElementById("local-gifs-gallery"),
      document.getElementById("local-videos-gallery"),
      document.getElementById("user-colors-gallery"),
    ].filter(Boolean)

    containers.forEach((c) => {
      c.classList.remove("bg-select-mode")
      c.querySelectorAll(".selected").forEach((el) =>
        el.classList.remove("selected"),
      )
    })

    bgSelectToolbar.style.display = "none"
    bgSelectModeBtn.style.opacity = ""
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
    const allUserIds = (settings.userBackgrounds || []).map((bg) =>
      typeof bg === "object" ? bg.uid || bg.id : bg,
    )

    // Find all user-uploaded items in all galleries
    const galleries = [
      document.getElementById("local-images-gallery"),
      document.getElementById("local-gifs-gallery"),
      document.getElementById("local-videos-gallery"),
    ].filter(Boolean)

    const allItems = []
    galleries.forEach((g) => {
      allItems.push(...g.querySelectorAll(".local-bg-item.user-uploaded"))
    })

    if (bgSelectedIds.size === allUserIds.length && allUserIds.length > 0) {
      bgSelectedIds.clear()
      allItems.forEach((el) => el.classList.remove("selected"))
    } else {
      bgSelectedIds.clear()
      allUserIds.forEach((id) => bgSelectedIds.add(id))
      allItems.forEach((el) => el.classList.add("selected"))
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
    const toDelete = (settings.userBackgrounds || [])
      .filter((bg) => {
        const bgId = typeof bg === "object" ? bg.id : bg
        const bgUid = typeof bg === "object" ? bg.uid || bg.id : bg
        return bgSelectedIds.has(bgId) || bgSelectedIds.has(bgUid)
      })
      .map((bg) => (typeof bg === "object" ? bg.id : bg))

    // Fix: Handle both string IDs and objects in userBackgrounds, checking both id and uid
    settings.userBackgrounds = (settings.userBackgrounds || []).filter((bg) => {
      const bgId = typeof bg === "object" ? bg.id : bg
      const bgUid = typeof bg === "object" ? bg.uid || bg.id : bg
      return !bgSelectedIds.has(bgId) && !bgSelectedIds.has(bgUid)
    })

    for (const id of toDelete) {
      if (isIdbMedia(id)) deleteImage(id).catch(() => {})
    }

    // Fix: Correctly check if the current background was deleted
    const currentBgId = settings.background
    const currentBgUid = settings.activeBgUid
    if (
      bgSelectedIds.has(currentBgId) ||
      (currentBgUid && bgSelectedIds.has(currentBgUid))
    ) {
      updateSetting("activeBgUid", null)
      handleSettingUpdate("background", null)
    } else {
      saveSettings()
    }
    exitBgSelectMode()
    renderLocalBackgrounds(DOM, handleSettingUpdate)
  })

  // Add click listener to a common parent or both galleries
  const galleries = [
    document.getElementById("local-images-gallery"),
    document.getElementById("local-gifs-gallery"),
    document.getElementById("local-videos-gallery"),
    document.getElementById("user-colors-gallery"),
    DOM.localBackgroundGallery, // Keep original for compatibility
  ].filter(Boolean)

  const handleClick = (e) => {
    e.stopPropagation()
    const item = e.target.closest(".local-bg-item")
    if (!item) return

    if (bgSelectMode) {
      if (!item.classList.contains("user-uploaded")) return

      const id = item.dataset.bgUid || item.dataset.bgId
      const isSelected = item.classList.contains("selected")
      const checkbox = item.querySelector(".bg-item-checkbox")

      if (isSelected) {
        bgSelectedIds.delete(id)
        item.classList.remove("selected")
        if (checkbox) checkbox.classList.remove("checked")
      } else {
        bgSelectedIds.add(id)
        item.classList.add("selected")
        if (checkbox) checkbox.classList.add("checked")
      }

      updateBgSelectCount()
      return
    }

    if (item.dataset.bgId === "random-color") {
      const randomColor = `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`
      updateSetting("activeBgUid", null)
      handleSettingUpdate("background", randomColor)
    } else {
      const settings = getSettings()
      const bgUid = item.dataset.bgUid
      const bgId = item.dataset.bgId

      // Find the specific entry in userBackgrounds
      const bgData = (settings.userBackgrounds || []).find(
        (bg) => (typeof bg === "object" ? bg.uid || bg.id : bg) === bgUid,
      )

      if (typeof bgData === "object") {
        if (bgData.settings) {
          // Apply stored settings for this specific background preset
          Object.entries(bgData.settings).forEach(([key, val]) => {
            updateSetting(key, val)
          })
        }

        // Restore Unsplash credits if present
        if (bgData.authorName || bgData.photoUrl) {
          updateSetting("unsplashLastCredit", {
            photoUrl: bgData.photoUrl,
            authorName: bgData.authorName,
            authorUrl: bgData.authorUrl,
          })
        } else {
          // Clear credits if not an Unsplash image
          updateSetting("unsplashLastCredit", null)
        }
      } else {
        // Clear credits if clicking a default background or a simple color
        updateSetting("unsplashLastCredit", null)
      }

      updateSetting("activeBgUid", bgUid)
      handleSettingUpdate("background", bgId)
    }

    // handleSettingUpdate will call applySettings and refresh all galleries
  }

  galleries.forEach((gallery) => {
    gallery.addEventListener("click", handleClick)
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
    const MAX_UPLOADS = 35
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
      showAlert(
        "Failed to save video. It might be too large or storage is full.",
      )
    }
    e.target.value = null
  })

  DOM.localImageUpload.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      const MAX_UPLOADS = 35
      if (getSettings().userBackgrounds.length >= MAX_UPLOADS) {
        showAlert(
          geti18n().alert_upload_limit ||
            `You can only upload up to ${MAX_UPLOADS} custom backgrounds.`,
        )
        return
      }

      const isGif = file.type === "image/gif" || /\.gif$/i.test(file.name || "")
      if (isGif) {
        saveImage(file, `idb-gif-${Date.now()}`)
          .then((id) => {
            getSettings().userBackgrounds.push({
              uid: "bg-" + Date.now(),
              id,
              type: "gif",
              name: file.name || "GIF background",
              date: new Date().toISOString(),
            })
            handleSettingUpdate("background", id)
            renderLocalBackgrounds(DOM, handleSettingUpdate)
          })
          .catch((err) => {
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
          const { maxSize: MAX_SIZE, quality } = getUploadImageProfile()
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
              saveImage(blob)
                .then((id) => {
                  getSettings().userBackgrounds.push(id)
                  handleSettingUpdate("background", id)
                  renderLocalBackgrounds(DOM, handleSettingUpdate)
                })
                .catch((err) => {
                  console.error("Failed to save image blob:", err)
                  showAlert("Failed to save processed image.")
                })
            },
            "image/jpeg",
            quality,
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
