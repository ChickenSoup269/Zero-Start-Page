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
  getImageBlob,
  getBlobUrlSync,
  getImageUrl,
  getThumbnailUrl,
  trimMediaMemory,
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
const cssUrl = (value) => {
  if (!value || value === "none") return "none"
  return `url(${JSON.stringify(String(value))})`
}
const LOCAL_BG_PERFORMANCE_WARNING_THRESHOLD = 20
const LOCAL_BG_PERFORMANCE_WARNING_KEY =
  "localBackgroundPerformanceWarningShownCountV2"

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

function compressImageBlob(blob, settings = getSettings()) {
  return new Promise((resolve, reject) => {
    if (!blob || !blob.type?.startsWith("image/")) {
      resolve(null)
      return
    }

    const img = new Image()
    const objectUrl = URL.createObjectURL(blob)
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        const { maxSize, quality } = getUploadImageProfile(settings)
        let { width, height } = img

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }

        canvas.width = width
        canvas.height = height
        canvas.getContext("2d").drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (nextBlob) => {
            URL.revokeObjectURL(objectUrl)
            resolve(nextBlob)
          },
          "image/jpeg",
          quality,
        )
      } catch (error) {
        URL.revokeObjectURL(objectUrl)
        reject(error)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Could not load image for compression"))
    }
    img.src = objectUrl
  })
}

async function recompressSavedBackgroundImages(DOM, handleSettingUpdate) {
  const settings = getSettings()
  const entries = settings.userBackgrounds || []
  let processed = 0
  let reduced = 0

  for (const entry of entries) {
    const id = typeof entry === "object" ? entry.id : entry
    if (!isIdbImage(id) || isIdbGif(id)) continue

    processed += 1
    const blob = await getImageBlob(id).catch(() => null)
    const nextBlob = await compressImageBlob(blob, settings).catch(() => null)
    if (!blob || !nextBlob || nextBlob.size >= blob.size) continue

    await saveImage(nextBlob, id)
    reduced += 1
  }

  if (settings.background && isIdbImage(settings.background)) {
    handleSettingUpdate("background", settings.background)
  } else {
    saveSettings()
    renderLocalBackgrounds(DOM, handleSettingUpdate)
  }

  return { processed, reduced }
}

function maybeShowLocalBackgroundPerformanceWarning(count) {
  if (count < LOCAL_BG_PERFORMANCE_WARNING_THRESHOLD) return
  const warningBucket =
    Math.floor(count / LOCAL_BG_PERFORMANCE_WARNING_THRESHOLD) *
    LOCAL_BG_PERFORMANCE_WARNING_THRESHOLD
  try {
    const shownCount = Number(
      localStorage.getItem(LOCAL_BG_PERFORMANCE_WARNING_KEY) || 0,
    )
    if (shownCount >= warningBucket) {
      return false
    }
    localStorage.setItem(
      LOCAL_BG_PERFORMANCE_WARNING_KEY,
      String(warningBucket),
    )
  } catch {
    // Ignore storage issues; the warning is informational only.
  }

  const i18n = geti18n()
  showAlert(
    i18n.alert_local_bg_performance_warning ||
      "You have saved 20+ custom backgrounds. More saved images can use more memory and may reduce performance, especially with GIF/video backgrounds.",
  )
  return true
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

/** Helper to generate a small thumbnail Blob from a Video with safety timeout and leak-free cleanup */
function generateVideoThumbnailBlob(blobOrFile) {
  return new Promise((resolve) => {
    let resolved = false
    let tempUrl = null
    let vid = null

    const finish = (result) => {
      if (resolved) return
      resolved = true
      clearTimeout(timer)
      if (tempUrl) {
        try {
          URL.revokeObjectURL(tempUrl)
        } catch {}
      }
      if (vid) {
        try {
          vid.pause()
          vid.removeAttribute("src")
          vid.load()
        } catch {}
        vid = null
      }
      resolve(result)
    }

    // Safety timeout: 3.5s max to prevent hung decoders or broken video files
    const timer = setTimeout(() => {
      finish(null)
    }, 3500)

    try {
      tempUrl =
        typeof blobOrFile === "string"
          ? blobOrFile
          : URL.createObjectURL(blobOrFile)
    } catch {
      finish(null)
      return
    }

    vid = document.createElement("video")
    vid.muted = true
    vid.playsInline = true
    vid.preload = "auto"

    const captureFrame = () => {
      try {
        const w = vid?.videoWidth || 0
        const h = vid?.videoHeight || 0
        if (w === 0 || h === 0) {
          finish(null)
          return
        }
        const MAX_THUMB = 240
        let tw = w
        let th = h
        if (w > h) {
          tw = MAX_THUMB
          th = Math.round((h * MAX_THUMB) / w)
        } else {
          th = MAX_THUMB
          tw = Math.round((w * MAX_THUMB) / h)
        }
        const canvas = document.createElement("canvas")
        canvas.width = tw
        canvas.height = th
        const ctx = canvas.getContext("2d")
        ctx.drawImage(vid, 0, 0, tw, th)
        canvas.toBlob(
          (blob) => {
            canvas.width = 0
            canvas.height = 0
            finish(blob || null)
          },
          "image/jpeg",
          0.72,
        )
      } catch {
        finish(null)
      }
    }

    vid.addEventListener("error", () => finish(null), { once: true })

    vid.addEventListener(
      "loadedmetadata",
      () => {
        const targetTime =
          vid.duration > 1 ? Math.min(vid.duration * 0.15, 2.0) : 0
        try {
          vid.currentTime = targetTime
        } catch {
          setTimeout(captureFrame, 80)
        }
      },
      { once: true },
    )

    vid.addEventListener(
      "seeked",
      () => {
        setTimeout(captureFrame, 80)
      },
      { once: true },
    )

    vid.src = tempUrl
  })
}

/** Helper to generate a small thumbnail Blob from an Image with leak-free cleanup */
function generateImageThumbnailBlob(blobOrFile) {
  return new Promise((resolve) => {
    let tempUrl = null
    try {
      tempUrl =
        typeof blobOrFile === "string"
          ? blobOrFile
          : URL.createObjectURL(blobOrFile)
    } catch {
      resolve(null)
      return
    }

    const img = new Image()
    const timer = setTimeout(() => {
      if (tempUrl) {
        try {
          URL.revokeObjectURL(tempUrl)
        } catch {}
      }
      img.src = ""
      resolve(null)
    }, 4000)

    img.onload = () => {
      clearTimeout(timer)
      try {
        const w = img.width || 0
        const h = img.height || 0
        if (w === 0 || h === 0) {
          if (tempUrl) URL.revokeObjectURL(tempUrl)
          img.src = ""
          resolve(null)
          return
        }

        const MAX_THUMB = 240
        let tw = w
        let th = h
        if (w > h) {
          tw = MAX_THUMB
          th = Math.round((h * MAX_THUMB) / w)
        } else {
          th = MAX_THUMB
          tw = Math.round((w * MAX_THUMB) / h)
        }

        const canvas = document.createElement("canvas")
        canvas.width = tw
        canvas.height = th
        const ctx = canvas.getContext("2d")
        ctx.drawImage(img, 0, 0, tw, th)

        canvas.toBlob(
          (blob) => {
            canvas.width = 0
            canvas.height = 0
            if (tempUrl) URL.revokeObjectURL(tempUrl)
            img.src = ""
            resolve(blob || null)
          },
          "image/jpeg",
          0.72,
        )
      } catch {
        if (tempUrl) URL.revokeObjectURL(tempUrl)
        img.src = ""
        resolve(null)
      }
    }

    img.onerror = () => {
      clearTimeout(timer)
      if (tempUrl) URL.revokeObjectURL(tempUrl)
      img.src = ""
      resolve(null)
    }

    img.src = tempUrl
  })
}

/**
 * Process and compress an uploaded image file without Base64 strings.
 * Generates both compressed background Blob and 240px thumbnail Blob in one pass.
 */
function processImageUpload(file, settings = getSettings()) {
  return new Promise((resolve, reject) => {
    let objectUrl = null
    try {
      objectUrl = URL.createObjectURL(file)
    } catch (e) {
      reject(e)
      return
    }

    const img = new Image()
    const timer = setTimeout(() => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      img.src = ""
      reject(new Error("Image processing timed out"))
    }, 12000)

    img.onload = () => {
      clearTimeout(timer)
      try {
        const { maxSize: MAX_SIZE, quality } = getUploadImageProfile(settings)
        let { width, height } = img
        if (width <= 0 || height <= 0) {
          if (objectUrl) URL.revokeObjectURL(objectUrl)
          img.src = ""
          reject(new Error("Invalid image dimensions"))
          return
        }

        let fullW = width
        let fullH = height
        if (fullW > fullH) {
          if (fullW > MAX_SIZE) {
            fullH = Math.round((fullH * MAX_SIZE) / fullW)
            fullW = MAX_SIZE
          }
        } else {
          if (fullH > MAX_SIZE) {
            fullW = Math.round((fullW * MAX_SIZE) / fullH)
            fullH = MAX_SIZE
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = fullW
        canvas.height = fullH
        const ctx = canvas.getContext("2d")
        ctx.drawImage(img, 0, 0, fullW, fullH)

        canvas.toBlob(
          (fullBlob) => {
            if (!fullBlob) {
              canvas.width = 0
              canvas.height = 0
              if (objectUrl) URL.revokeObjectURL(objectUrl)
              img.src = ""
              reject(new Error("Failed to compress image"))
              return
            }

            // Create thumbnail directly from the canvas
            const MAX_THUMB = 240
            let tw = fullW
            let th = fullH
            if (tw > th) {
              th = Math.round((th * MAX_THUMB) / tw)
              tw = MAX_THUMB
            } else {
              tw = Math.round((tw * MAX_THUMB) / th)
              th = MAX_THUMB
            }

            const thumbCanvas = document.createElement("canvas")
            thumbCanvas.width = tw
            thumbCanvas.height = th
            const thumbCtx = thumbCanvas.getContext("2d")
            thumbCtx.drawImage(canvas, 0, 0, tw, th)

            // Immediately clear full canvas buffer
            canvas.width = 0
            canvas.height = 0

            thumbCanvas.toBlob(
              (thumbBlob) => {
                thumbCanvas.width = 0
                thumbCanvas.height = 0
                if (objectUrl) URL.revokeObjectURL(objectUrl)
                img.src = ""
                resolve({ fullBlob, thumbBlob })
              },
              "image/jpeg",
              0.72,
            )
          },
          "image/jpeg",
          quality,
        )
      } catch (err) {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        img.src = ""
        reject(err)
      }
    }

    img.onerror = () => {
      clearTimeout(timer)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      img.src = ""
      reject(new Error("Failed to decode image"))
    }

    img.src = objectUrl
  })
}

/** Sequential queue for missing thumbnails to prevent concurrent video decodes and RAM spikes */
const _thumbQueue = []
let _isProcessingThumbQueue = false

async function _enqueueThumbnailGeneration(bgId, isVideo, thumbLayer, item) {
  _thumbQueue.push({ bgId, isVideo, thumbLayer, item })
  if (_isProcessingThumbQueue) return
  _isProcessingThumbQueue = true

  while (_thumbQueue.length > 0) {
    const task = _thumbQueue.shift()
    try {
      const cached = await getThumbnailUrl(task.bgId)
      if (cached) {
        if (task.thumbLayer) {
          task.thumbLayer.style.backgroundImage = cssUrl(cached)
        }
        if (task.item) {
          task.item.classList.remove("thumb-loading")
        }
        continue
      }

      const blob = await getImageBlob(task.bgId).catch(() => null)
      if (blob) {
        let thumbBlob = null
        if (task.isVideo) {
          thumbBlob = await generateVideoThumbnailBlob(blob)
        } else {
          thumbBlob = await generateImageThumbnailBlob(blob)
        }

        if (thumbBlob) {
          const url = await saveThumbnail(task.bgId, thumbBlob)
          if (task.thumbLayer) {
            task.thumbLayer.style.backgroundImage = cssUrl(url)
          }
        }
      }
    } catch (err) {
      console.warn("Thumbnail generation failed for", task.bgId, err)
    } finally {
      if (task.item) {
        task.item.classList.remove("thumb-loading")
      }
    }
    // Yield to main thread between items to allow browser GC and smooth 60fps
    await new Promise((r) => setTimeout(r, 60))
  }

  _isProcessingThumbQueue = false
}

/** Helper to generate and save a thumbnail (backward compatibility) */
async function _ensureThumbnail(id, blobOrUrl, isVideo) {
  const existing = await getThumbnailUrl(id)
  if (existing) return existing

  const thumbBlob = isVideo
    ? await generateVideoThumbnailBlob(blobOrUrl)
    : await generateImageThumbnailBlob(blobOrUrl)

  if (thumbBlob) {
    return await saveThumbnail(id, thumbBlob)
  }
  return null
}

function renderLocalBackgrounds(DOM, handleSettingUpdate) {
  const i18n = geti18n()
  const settings = getSettings()
  maybeShowLocalBackgroundPerformanceWarning(
    Array.isArray(settings.userBackgrounds)
      ? settings.userBackgrounds.length
      : 0,
  )
  updateActiveWallpaperBanner(handleSettingUpdate)

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
        const isPicsum =
          typeof bgData === "object" &&
          bgData.photoUrl &&
          bgData.photoUrl.includes("picsum.photos")
        typeIcon.innerHTML = isPicsum
          ? '<i class="fa-solid fa-camera"></i>'
          : '<i class="fa-brands fa-unsplash"></i>'
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
        item.classList.add("thumb-loading")
        const cachedUrl = getBlobUrlSync(bgId)
        if (cachedUrl) {
          thumbLayer.style.backgroundImage = cssUrl(cachedUrl)
          item.classList.remove("thumb-loading")
        } else if (
          isActive &&
          typeof settings.lastUserBackgroundPreview === "string" &&
          settings.lastUserBackgroundPreview.startsWith("data:image")
        ) {
          thumbLayer.style.backgroundImage = cssUrl(
            settings.lastUserBackgroundPreview,
          )
          item.classList.remove("thumb-loading")
        }
        getThumbnailUrl(bgId)
          .then((thumbUrl) => {
            if (thumbUrl) {
              thumbLayer.style.backgroundImage = cssUrl(thumbUrl)
              item.classList.remove("thumb-loading")
            } else {
              _enqueueThumbnailGeneration(bgId, isVideo, thumbLayer, item)
            }
          })
          .catch(() => {
            item.classList.remove("thumb-loading")
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

async function updateActiveWallpaperBanner(handleSettingUpdate) {
  const thumb = document.getElementById("bg-active-thumb-preview")
  const nameLabel = document.getElementById("bg-active-name-label")
  const copyBtn = document.getElementById("bg-quick-copy-url-btn")
  const resetBtn = document.getElementById("bg-quick-reset-btn")
  if (!thumb && !nameLabel) return

  const settings = getSettings()
  const bg = settings.background

  if (copyBtn && !copyBtn.dataset.bound) {
    copyBtn.dataset.bound = "true"
    copyBtn.addEventListener("click", () => {
      const curBg = getSettings().background
      if (!curBg) {
        showAlert("No custom wallpaper URL to copy.")
        return
      }
      navigator.clipboard
        ?.writeText(curBg)
        .then(() => {
          showAlert("Wallpaper URL / ID copied to clipboard!")
        })
        .catch(() => {})
    })
  }

  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.dataset.bound = "true"
    resetBtn.addEventListener("click", () => {
      updateSetting("activeBgUid", null)
      if (typeof handleSettingUpdate === "function") {
        handleSettingUpdate("background", null)
      } else {
        updateSetting("background", null)
        saveSettings()
        window.dispatchEvent(
          new CustomEvent("settingsUpdated", {
            detail: { key: "background", value: null },
          }),
        )
      }
    })
  }

  if (!bg) {
    if (thumb) {
      thumb.innerHTML =
        '<div class="bg-thumb-placeholder"><i class="fa-solid fa-image"></i></div>'
      thumb.style.backgroundImage = "none"
      thumb.style.backgroundColor = "transparent"
    }
    if (nameLabel) nameLabel.textContent = "Default Wallpaper"
    return
  }

  // Look for metadata in userBackgrounds
  const userBgs = settings.userBackgrounds || []
  const bgData = userBgs.find((b) => {
    if (typeof b === "object" && b) {
      return b.uid === settings.activeBgUid || b.id === bg || b.uid === bg
    }
    return b === bg
  })

  if (
    isIdbVideo(bg) ||
    (bgData && typeof bgData === "object" && bgData.type === "video")
  ) {
    if (nameLabel)
      nameLabel.textContent = bgData?.name || "Local Video Wallpaper"
    if (thumb) {
      try {
        const thumbUrl = await getThumbnailUrl(bg)
        const videoUrl = !thumbUrl ? await getImageUrl(bg) : null
        if (thumbUrl) {
          thumb.innerHTML = ""
          thumb.style.backgroundImage = `url("${thumbUrl}")`
        } else if (videoUrl) {
          thumb.innerHTML = `<video src="${videoUrl}" autoplay muted loop playsinline></video>`
          thumb.style.backgroundImage = "none"
        } else {
          thumb.innerHTML =
            '<div class="bg-thumb-placeholder"><i class="fa-solid fa-video"></i></div>'
        }
      } catch (_) {
        thumb.innerHTML =
          '<div class="bg-thumb-placeholder"><i class="fa-solid fa-video"></i></div>'
      }
    }
  } else if (isIdbMedia(bg)) {
    if (nameLabel) {
      if (bgData?.authorName) {
        nameLabel.textContent = `Unsplash (${bgData.authorName})`
      } else if (bgData?.name) {
        nameLabel.textContent = bgData.name
      } else {
        nameLabel.textContent = isIdbGif(bg)
          ? "Local GIF Wallpaper"
          : "Local Image Wallpaper"
      }
    }
    if (thumb) {
      try {
        const thumbUrl =
          (await getThumbnailUrl(bg)) ||
          getBlobUrlSync(bg) ||
          (await getImageUrl(bg))
        if (thumbUrl) {
          thumb.innerHTML = ""
          thumb.style.backgroundImage = `url("${thumbUrl}")`
        } else {
          thumb.innerHTML =
            '<div class="bg-thumb-placeholder"><i class="fa-solid fa-image"></i></div>'
        }
      } catch (_) {
        thumb.innerHTML =
          '<div class="bg-thumb-placeholder"><i class="fa-solid fa-image"></i></div>'
      }
    }
  } else if (bg.startsWith("#") || bg.startsWith("rgb")) {
    if (nameLabel) nameLabel.textContent = `Solid Color (${bg})`
    if (thumb) {
      thumb.innerHTML = ""
      thumb.style.backgroundImage = "none"
      thumb.style.backgroundColor = bg
    }
  } else {
    // URL or Unsplash
    if (nameLabel) {
      if (bgData?.authorName) {
        nameLabel.textContent = `Unsplash (${bgData.authorName})`
      } else {
        const isUnsplash = bg.includes("unsplash.com")
        nameLabel.textContent = isUnsplash
          ? "Unsplash Wallpaper"
          : "Custom Web URL"
      }
    }
    if (thumb) {
      thumb.innerHTML = ""
      thumb.style.backgroundImage = `url("${bg}")`
    }
  }
}

/**
 * Unified batch media upload processor.
 * Prevents UI freezing (yielding to main thread) and avoids RAM spikes (streamlined blob lifecycles).
 */
async function processMediaBatchUpload(files, { DOM, handleSettingUpdate }) {
  const validFiles = Array.from(files || []).filter((f) => {
    return (
      f.type.startsWith("image/") ||
      f.type.startsWith("video/") ||
      /\.(jpe?g|png|webp|gif|bmp|avif|mp4|webm|mov|m4v|ogg)$/i.test(f.name || "")
    )
  })

  if (!validFiles.length) return

  const dropzone = document.getElementById("local-bg-dropzone")
  const dropzoneTitle = dropzone?.querySelector(".bg-dropzone-title")
  const dropzoneSubtitle = dropzone?.querySelector(".bg-dropzone-subtitle")
  const dropzoneIcon = dropzone?.querySelector(".bg-dropzone-icon")

  const origTitle = dropzoneTitle?.textContent || ""
  const origSubtitle = dropzoneSubtitle?.textContent || ""
  const origIconClass =
    dropzoneIcon?.className || "fa-solid fa-cloud-arrow-up bg-dropzone-icon"

  let progressWrap = dropzone?.querySelector(".bg-dropzone-progress-wrap")
  let progressBar = dropzone?.querySelector(".bg-dropzone-progress-bar")

  if (dropzone && !progressWrap) {
    progressWrap = document.createElement("div")
    progressWrap.className = "bg-dropzone-progress-wrap"
    progressWrap.innerHTML = '<div class="bg-dropzone-progress-bar"></div>'
    dropzone.appendChild(progressWrap)
    progressBar = progressWrap.querySelector(".bg-dropzone-progress-bar")
  }

  const buttonsToDisable = [
    DOM?.uploadLocalImageBtn,
    DOM?.uploadLocalVideoBtn,
    DOM?.localImageUpload,
    DOM?.localVideoUpload,
  ].filter(Boolean)

  buttonsToDisable.forEach((el) => {
    el.disabled = true
    if (el.tagName === "BUTTON") el.style.opacity = "0.6"
  })

  if (dropzone) {
    dropzone.classList.add("upload-processing")
    if (dropzoneIcon) {
      dropzoneIcon.className =
        "fa-solid fa-spinner fa-spin bg-dropzone-icon"
    }
    if (progressWrap) progressWrap.style.display = "block"
    if (progressBar) progressBar.style.width = "0%"
  }

  const i18n = geti18n()
  const setProgress = (current, total, filename) => {
    const pct = Math.round((current / total) * 100)
    if (progressBar) progressBar.style.width = `${pct}%`
    if (dropzoneTitle) {
      dropzoneTitle.textContent = `${i18n.loading || "Processing"} (${current}/${total})`
    }
    if (dropzoneSubtitle) {
      dropzoneSubtitle.textContent = filename || ""
    }
  }

  let lastSavedId = null
  let savedCount = 0
  const total = validFiles.length
  const settings = getSettings()

  try {
    for (let i = 0; i < total; i++) {
      const file = validFiles[i]
      const isLast = i === total - 1
      setProgress(i + 1, total, file.name || `File ${i + 1}`)

      // Small break between items: lets browser paint UI updates and run GC
      await new Promise((resolve) => setTimeout(resolve, 30))

      const isVideo =
        file.type.startsWith("video/") ||
        /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name || "")
      const isGif =
        file.type === "image/gif" || /\.gif$/i.test(file.name || "")
      const isImage = !isVideo && !isGif

      if (isVideo) {
        if (file.size > 350 * 1024 * 1024) {
          showAlert(
            `"${file.name}" is larger than 350MB and was skipped to prevent storage quota exhaustion.`,
          )
          continue
        }

        try {
          // 1. Generate small thumbnail directly from File Blob before saving
          const thumbBlob = await generateVideoThumbnailBlob(file)

          // 2. Save video to IndexedDB (auto-cache only the last one)
          const id = await saveVideo(file, null, isLast)

          // 3. Save thumbnail in parallel store
          if (thumbBlob) {
            await saveThumbnail(id, thumbBlob).catch(() => {})
          }

          settings.userBackgrounds.push(id)
          lastSavedId = id
          savedCount++
        } catch (err) {
          console.error("Failed to save video:", file.name, err)
        }
      } else if (isGif) {
        try {
          const id = await saveImage(
            file,
            `idb-gif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            isLast,
          )

          const thumbBlob = await generateImageThumbnailBlob(file).catch(
            () => null,
          )
          if (thumbBlob) {
            await saveThumbnail(id, thumbBlob).catch(() => {})
          }

          settings.userBackgrounds.push({
            uid: "bg-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
            id,
            type: "gif",
            name: file.name || "GIF background",
            date: new Date().toISOString(),
          })
          lastSavedId = id
          savedCount++
        } catch (err) {
          console.error("Failed to save GIF:", file.name, err)
        }
      } else if (isImage) {
        try {
          const result = await processImageUpload(file, settings)
          if (result && result.fullBlob) {
            const id = await saveImage(result.fullBlob, null, isLast)
            if (result.thumbBlob) {
              await saveThumbnail(id, result.thumbBlob).catch(() => {})
            }
            settings.userBackgrounds.push(id)
            lastSavedId = id
            savedCount++
          }
        } catch (err) {
          console.error("Failed to process image:", file.name, err)
        }
      }
    }
  } finally {
    buttonsToDisable.forEach((el) => {
      el.disabled = false
      if (el.tagName === "BUTTON") el.style.opacity = ""
    })

    if (dropzone) {
      dropzone.classList.remove("upload-processing")
      if (dropzoneIcon) dropzoneIcon.className = origIconClass
      if (dropzoneTitle) dropzoneTitle.textContent = origTitle
      if (dropzoneSubtitle) dropzoneSubtitle.textContent = origSubtitle
      if (progressWrap) progressWrap.style.display = "none"
      if (progressBar) progressBar.style.width = "0%"
    }

    if (savedCount > 0) {
      saveSettings()
      maybeShowLocalBackgroundPerformanceWarning(
        settings.userBackgrounds.length,
      )
      if (lastSavedId) {
        handleSettingUpdate("background", lastSavedId)
      }
      renderLocalBackgrounds(DOM, handleSettingUpdate)
    }
  }
}

function setupFileUploads(DOM, handleSettingUpdate) {
  if (DOM.uploadLocalImageBtn) {
    DOM.uploadLocalImageBtn.addEventListener("click", () =>
      DOM.localImageUpload?.click(),
    )
  }
  if (DOM.uploadLocalVideoBtn) {
    DOM.uploadLocalVideoBtn.addEventListener("click", () =>
      DOM.localVideoUpload?.click(),
    )
  }

  // Modern Dropzone handler
  const dropzone = document.getElementById("local-bg-dropzone")
  if (dropzone) {
    dropzone.addEventListener("click", () => {
      DOM.localImageUpload?.click()
    })

    const handleDragOver = (e) => {
      e.preventDefault()
      e.stopPropagation()
      dropzone.classList.add("dragover")
    }

    const handleDragLeave = (e) => {
      e.preventDefault()
      e.stopPropagation()
      dropzone.classList.remove("dragover")
    }

    const handleDrop = async (e) => {
      e.preventDefault()
      e.stopPropagation()
      dropzone.classList.remove("dragover")
      const files = Array.from(e.dataTransfer?.files || [])
      if (!files.length) return
      await processMediaBatchUpload(files, { DOM, handleSettingUpdate })
    }

    dropzone.addEventListener("dragover", handleDragOver)
    dropzone.addEventListener("dragenter", handleDragOver)
    dropzone.addEventListener("dragleave", handleDragLeave)
    dropzone.addEventListener("drop", handleDrop)
  }

  // Filter pills setup
  const filterPills = document.querySelectorAll(".bg-gallery-filter-pill")
  filterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      filterPills.forEach((p) => p.classList.remove("active"))
      pill.classList.add("active")
      const filter = pill.getAttribute("data-gallery-filter")
      const imgSec = document.getElementById("local-images-section")
      const gifSec = document.getElementById("local-gifs-section")
      const vidSec = document.getElementById("local-videos-section")
      if (filter === "all") {
        if (imgSec) imgSec.style.display = ""
        if (gifSec) gifSec.style.display = ""
        if (vidSec) vidSec.style.display = ""
      } else if (filter === "images") {
        if (imgSec) imgSec.style.display = ""
        if (gifSec) gifSec.style.display = "none"
        if (vidSec) vidSec.style.display = "none"
      } else if (filter === "gifs") {
        if (imgSec) imgSec.style.display = "none"
        if (gifSec) gifSec.style.display = ""
        if (vidSec) vidSec.style.display = "none"
      } else if (filter === "videos") {
        if (imgSec) imgSec.style.display = "none"
        if (gifSec) gifSec.style.display = "none"
        if (vidSec) vidSec.style.display = ""
      }
    })
  })

  if (DOM.localVideoUpload) {
    DOM.localVideoUpload.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || [])
      e.target.value = null
      if (!files.length) return
      await processMediaBatchUpload(files, { DOM, handleSettingUpdate })
    })
  }

  if (DOM.localImageUpload) {
    DOM.localImageUpload.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || [])
      e.target.value = null
      if (!files.length) return
      await processMediaBatchUpload(files, { DOM, handleSettingUpdate })
    })
  }
}

export {
  renderLocalBackgrounds,
  renderUserColors,
  renderUserAccentColors,
  setupMultiSelectMode,
  setupFileUploads,
  recompressSavedBackgroundImages,
  maybeShowLocalBackgroundPerformanceWarning,
  updateActiveWallpaperBanner,
}
