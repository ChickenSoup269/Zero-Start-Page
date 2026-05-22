/**
 * Unsplash Fetcher Module
 * Handles all Unsplash API integration and photo fetching
 */

import { UNSPLASH_COLLECTIONS, buildUnsplashQuery } from "./unsplashConfig.js"
import {
  getSettings,
  updateSetting,
  saveSettings,
} from "../../services/state.js"
import { showAlert } from "../../utils/dialog.js"
import { saveImage } from "../../services/imageStore.js"
import { geti18n } from "../../services/i18n.js"

function firstPhoto(payload) {
  return Array.isArray(payload) ? payload[0] : payload
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(url)
    img.onerror = () => reject(new Error("Failed to preload Unsplash image"))
    img.src = url
  })
}

function getTargetImageDimensions() {
  const dpr = window.devicePixelRatio || 1
  return {
    width: Math.round((window.innerWidth > 0 ? window.innerWidth : 1920) * dpr),
    height: Math.round((window.innerHeight > 0 ? window.innerHeight : 1080) * dpr),
  }
}

function formatResolution(width, height) {
  return width && height ? `${width} x ${height}` : "Unknown size"
}

async function fetchUnsplashPhotoByParams(accessKey, params) {
  const search = new URLSearchParams({
    ...params,
    orientation: "landscape",
    content_filter: "high",
    client_id: accessKey,
  })
  const res = await fetch(
    `https://api.unsplash.com/photos/random?${search.toString()}`,
  )
  if (!res.ok) throw new Error(`Unsplash API error: ${res.status}`)
  const payload = await res.json()
  const photo = firstPhoto(payload)
  if (!photo?.urls?.raw && !photo?.urls?.full && !photo?.urls?.regular) {
    throw new Error("Unsplash photo payload missing image URL")
  }
  return photo
}

async function fetchUnsplashPhotoFromCollections(accessKey, collectionIds) {
  const ids = (collectionIds || []).filter(Boolean)
  if (!ids.length) {
    throw new Error("No Unsplash collection IDs configured")
  }
  return fetchUnsplashPhotoByParams(accessKey, {
    collections: ids.join(","),
  })
}

async function fetchUnsplashPhotoFromTopic(accessKey, topicId) {
  if (!topicId) throw new Error("Missing Unsplash topic id")

  const page = String(Math.floor(Math.random() * 3) + 1)
  const search = new URLSearchParams({
    page,
    per_page: "35",
    order_by: "popular",
    client_id: accessKey,
  })
  const endpoint = `https://api.unsplash.com/topics/${encodeURIComponent(topicId)}/photos?${search.toString()}`
  const res = await fetch(endpoint)
  if (!res.ok) {
    throw new Error(`Unsplash topic photos error: ${res.status}`)
  }

  const payload = await res.json()
  const results = Array.isArray(payload) ? payload : []
  if (!results.length) {
    throw new Error("No photos in selected Unsplash topic")
  }

  const photo = results[Math.floor(Math.random() * results.length)]
  if (!photo?.urls?.raw && !photo?.urls?.full && !photo?.urls?.regular) {
    throw new Error("Unsplash topic payload missing image URL")
  }

  return photo
}

async function fetchUnsplashPhotoFromSearch(accessKey, query) {
  const search = new URLSearchParams({
    query,
    orientation: "landscape",
    content_filter: "high",
    per_page: "35",
    client_id: accessKey,
  })
  const res = await fetch(
    `https://api.unsplash.com/search/photos?${search.toString()}`,
  )
  if (!res.ok) throw new Error(`Unsplash search error: ${res.status}`)
  const payload = await res.json()
  const results = payload?.results || []
  if (!results.length) {
    throw new Error("No results for selected Unsplash category")
  }
  return results[Math.floor(Math.random() * results.length)]
}

async function fetchBestUnsplashPhoto(accessKey, collection) {
  const keyword = buildUnsplashQuery(collection)

  // 1) Prefer curated collections if configured for this category.
  if (collection.collections?.length) {
    try {
      return await fetchUnsplashPhotoFromCollections(
        accessKey,
        collection.collections,
      )
    } catch (err) {
      console.warn(
        "Unsplash collection fetch failed, trying topic/photos:",
        err,
      )
    }
  }

  // 2) Prefer curated topic photos endpoint.
  if (collection.topic) {
    try {
      return await fetchUnsplashPhotoFromTopic(accessKey, collection.topic)
    } catch (err) {
      console.warn(
        "Unsplash topic/photos fetch failed, trying random topic:",
        err,
      )
    }
  }

  // 3) Fallback to random endpoint with topics/query/search.
  if (collection.topic) {
    try {
      return await fetchUnsplashPhotoByParams(accessKey, {
        topics: collection.topic,
      })
    } catch (err) {
      console.warn("Unsplash topic fetch failed, trying query fallback:", err)
    }
  }

  if (keyword) {
    try {
      return await fetchUnsplashPhotoByParams(accessKey, {
        query: keyword,
      })
    } catch (err) {
      console.warn(
        "Unsplash random-query fetch failed, trying search fallback:",
        err,
      )
      return fetchUnsplashPhotoFromSearch(accessKey, keyword)
    }
  }

  throw new Error("Invalid Unsplash collection configuration")
}

function populateUnsplashCollections(unsplashCategorySelect, i18n) {
  unsplashCategorySelect.innerHTML = ""
  UNSPLASH_COLLECTIONS.forEach((col) => {
    const opt = document.createElement("option")
    opt.value = col.key
    opt.textContent = i18n.language === "vi" ? col.labelVi : col.labelEn
    unsplashCategorySelect.appendChild(opt)
  })
  unsplashCategorySelect.value =
    getSettings().unsplashCategory || "spring-wallpapers"
}

async function setUnsplashRandomBackground(
  unsplashRandomBtn,
  unsplashCategorySelect,
  handleSettingUpdateCallback,
) {
  const settings = getSettings()
  const previousBackground = settings.background
  const accessKey = settings.unsplashAccessKey || ""
  if (!accessKey) {
    showAlert(
      "Please enter your Unsplash Access Key in Settings.\nGet a free key at: https://unsplash.com/developers",
    )
    return
  }

  const btn = unsplashRandomBtn
  const originalHtml = btn.innerHTML
  btn.disabled = true
  const icon = btn.querySelector("i")
  if (icon) {
    icon.classList.remove("fa-sync-alt")
    icon.classList.add("fa-spinner", "fa-spin")
  }

  const category =
    unsplashCategorySelect?.value ||
    settings.unsplashCategory ||
    "spring-wallpapers"
  const collection =
    UNSPLASH_COLLECTIONS.find((c) => c.key === category) ||
    UNSPLASH_COLLECTIONS[0]
  const { width, height } = getTargetImageDimensions()

  try {
    const photo = await fetchBestUnsplashPhoto(accessKey, collection)
    const baseUrl = photo.urls.raw || photo.urls.full || photo.urls.regular
    const separator = baseUrl.includes("?") ? "&" : "?"
    const imageUrl = `${baseUrl}${separator}auto=format&fit=crop&w=${width}&h=${height}&q=85`

    // Keep screen black while waiting for the final image bytes.
    const bgLayer = document.getElementById("bg-layer")
    const bgVideo = document.getElementById("bg-video")
    if (bgVideo) {
      bgVideo.style.opacity = "0"
      bgVideo.style.display = "none"
    }
    if (bgLayer) {
      bgLayer.style.transition = "none"
      bgLayer.style.backgroundImage = "none"
      bgLayer.style.background = "#000000"
      bgLayer.style.opacity = "1"
    }

    // Tải ảnh về ở dạng blob và lưu vào IndexedDB (tránh tải lại mỗi lần reload)
    let finalBgValue = imageUrl
    try {
      const imgRes = await fetch(imageUrl)
      if (imgRes.ok) {
        const blob = await imgRes.blob()
        // Use a unique ID for each Unsplash image
        finalBgValue = await saveImage(blob, `idb-img-unsplash-${Date.now()}`)
      } else {
        await preloadImage(imageUrl)
      }
    } catch (fetchErr) {
      console.warn(
        "Could not download Unsplash blob, falling back to URL:",
        fetchErr,
      )
      await preloadImage(imageUrl).catch(() => {})
    }

    if (bgLayer) bgLayer.style.transition = ""

    // Prepare metadata
    const photoInfo = {
      id: finalBgValue,
      photoUrl: photo.links?.html || "",
      authorName: photo.user?.name || "",
      authorUrl: photo.user?.links?.html || "",
      isFavorite: false
    }

    // Persist credit so it survives page refresh
    updateSetting("unsplashLastCredit", {
      photoUrl: photoInfo.photoUrl,
      authorName: photoInfo.authorName,
      authorUrl: photoInfo.authorUrl,
    })

    // Also add to userBackgrounds so it appears in the gallery with metadata
    // REMOVED AUTO-SAVE TO GALLERY
    /*
    const userBackgrounds = settings.userBackgrounds || []
    if (!userBackgrounds.some(bg => (typeof bg === 'object' ? bg.id : bg) === finalBgValue)) {
      if (userBackgrounds.length >= 35) {
        userBackgrounds.shift()
      }
      userBackgrounds.push(photoInfo)
      updateSetting("userBackgrounds", userBackgrounds)
    }
    */

    saveSettings()

    // Enable the save button for manual saving
    const saveBtn = document.getElementById("unsplash-save-bg-btn")
    if (saveBtn) {
      saveBtn.disabled = false
      // Reset save button state
      const i18n = (typeof geti18n === 'function') ? geti18n() : null
      saveBtn.innerHTML = `<i class="fa-solid fa-download"></i> <span>${i18n?.settings_unsplash_save || "Save to Gallery"}</span>`
    }

    const updateFn = typeof handleSettingUpdateCallback === 'function' 
      ? handleSettingUpdateCallback 
      : (typeof window !== 'undefined' ? window.appHandleSettingUpdate : null)

    if (typeof updateFn === 'function') {
      updateFn("background", finalBgValue)
    }
    
    btn.disabled = false
    btn.innerHTML = originalHtml
    return photo
  } catch (err) {
    console.error("Unsplash fetch failed:", err)

    const updateFn = typeof handleSettingUpdateCallback === 'function' 
      ? handleSettingUpdateCallback 
      : (typeof window !== 'undefined' ? window.appHandleSettingUpdate : null)

    // Restore previous background if loading fails after black-screen state.
    if (typeof updateFn === 'function') {
      updateFn("background", previousBackground)
    }

    btn.disabled = false
    btn.innerHTML = originalHtml
    
    let errorMsg = "Failed to load Unsplash image."
    if (err.message.includes("401")) {
        errorMsg = "Invalid Unsplash Access Key. Please check your key in Settings."
    } else if (err.message.includes("403")) {
        errorMsg = "Unsplash API rate limit exceeded or Access Key unauthorized."
    } else if (err.message.includes("Failed to fetch")) {
        errorMsg = "Network error. Please check your internet connection or Unsplash permissions."
    }
    
    showAlert(errorMsg)
  }
}

async function fetchUnsplashPhotoById(accessKey, photoId) {
  const url = `https://api.unsplash.com/photos/${photoId}?client_id=${accessKey}`
  const response = await fetch(url)
  if (!response.ok) throw new Error("Failed to fetch photo metadata")
  return await response.json()
}

/**
 * Search Unsplash photos
 */
async function searchUnsplashPhotos(accessKey, query, page = 1, perPage = 20) {
  const params = new URLSearchParams({
    query,
    page: String(page),
    per_page: String(perPage),
    orientation: "landscape",
    content_filter: "high",
    client_id: accessKey,
  })
  const res = await fetch(`https://api.unsplash.com/search/photos?${params.toString()}`)
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  return await res.json()
}

/**
 * List Unsplash photos (latest, popular, oldest)
 */
async function listUnsplashPhotos(accessKey, orderBy = "latest", page = 1, perPage = 20) {
  const params = new URLSearchParams({
    order_by: orderBy,
    page: String(page),
    per_page: String(perPage),
    client_id: accessKey,
  })
  const res = await fetch(`https://api.unsplash.com/photos?${params.toString()}`)
  if (!res.ok) throw new Error(`List failed: ${res.status}`)
  return await res.json()
}

/**
 * Open Unsplash Explorer Modal
 */
let explorerPage = 1
let explorerType = "latest" // "latest", "popular", "search"
let explorerQuery = ""
const explorerSessionState = new Map()
let explorerMiniInitialized = false
const EXPLORER_SCROLL_STORAGE_PREFIX = "startpage_unsplashExplorerScroll:"
let explorerScrollCapturePaused = false

function getExplorerStateKey(type = explorerType, query = explorerQuery) {
  return `${type}:${query || ""}`
}

function readStoredExplorerState(stateKey) {
  let saved = explorerSessionState.get(stateKey)
  if (saved) return saved

  try {
    saved = JSON.parse(
      sessionStorage.getItem(`${EXPLORER_SCROLL_STORAGE_PREFIX}${stateKey}`) ||
        "null",
    )
    if (saved) explorerSessionState.set(stateKey, saved)
  } catch {
    saved = null
  }

  return saved
}

function getExplorerScrollElements() {
  const grid = document.getElementById("unsplash-explorer-grid")
  return {
    grid,
    body: grid?.closest(".bug-modal-body") || null,
  }
}

function canScrollExplorerElement(element) {
  return Boolean(element && element.scrollHeight > element.clientHeight + 1)
}

function getExplorerScrollState() {
  const { grid, body } = getExplorerScrollElements()
  if (!grid) return null

  const gridScrollTop = grid.scrollTop || 0
  const bodyScrollTop = body?.scrollTop || 0
  const bodyIsActive =
    bodyScrollTop > 0 &&
    bodyScrollTop >= gridScrollTop &&
    canScrollExplorerElement(body)
  const scrollTarget = bodyIsActive ? "body" : "grid"

  return {
    page: explorerPage,
    scrollTarget,
    scrollTop: scrollTarget === "body" ? bodyScrollTop : gridScrollTop,
    gridScrollTop,
    bodyScrollTop,
  }
}

function applyExplorerScrollState(state) {
  const { grid, body } = getExplorerScrollElements()
  if (!grid || !state) return

  grid.scrollTop = state.gridScrollTop ?? state.scrollTop ?? 0
  if (body && canScrollExplorerElement(body)) {
    body.scrollTop = state.bodyScrollTop ?? state.scrollTop ?? 0
  }
}

function rememberExplorerPosition(force = false, stateOverride = null) {
  if (explorerScrollCapturePaused && !force) return

  const state = stateOverride || getExplorerScrollState()
  if (!state) return

  const stateKey = getExplorerStateKey()

  explorerSessionState.set(stateKey, state)
  try {
    sessionStorage.setItem(
      `${EXPLORER_SCROLL_STORAGE_PREFIX}${stateKey}`,
      JSON.stringify(state),
    )
  } catch {
    // Scroll restore is a convenience; storage can be unavailable in privacy modes.
  }
}

function restoreExplorerPosition() {
  const { grid } = getExplorerScrollElements()
  const stateKey = getExplorerStateKey()
  const saved = readStoredExplorerState(stateKey)

  if (!grid || !saved) return

  const restore = () => applyExplorerScrollState(saved)

  explorerScrollCapturePaused = true
  requestAnimationFrame(restore)
  setTimeout(restore, 80)
  setTimeout(restore, 200)
  setTimeout(restore, 500)
  setTimeout(() => {
    restore()
    explorerScrollCapturePaused = false
  }, 800)
}

function getExplorerDisplayTitle(type = explorerType, query = explorerQuery) {
  const i18n = (typeof geti18n === "function") ? geti18n() : {}

  if (type === "search") {
    return `${i18n.settings_unsplash_search || "Search"}: ${query}`
  }
  if (type === "popular") {
    return i18n.settings_unsplash_popular || "Popular Photos"
  }
  return i18n.settings_unsplash_latest || "Latest Photos"
}

function initUnsplashExplorerMini() {
  if (explorerMiniInitialized) return
  explorerMiniInitialized = true

  const mini = document.getElementById("unsplash-explorer-mini")
  const openBtn = document.getElementById("unsplash-explorer-mini-open")
  const closeBtn = document.getElementById("unsplash-explorer-mini-close")

  openBtn?.addEventListener("click", () => {
    openUnsplashExplorer(explorerType, explorerQuery)
  })

  closeBtn?.addEventListener("click", (event) => {
    event.stopPropagation()
    dismissUnsplashExplorerMini()
  })

  if (mini) {
    mini.addEventListener("keydown", (event) => {
      if (event.key === "Escape") dismissUnsplashExplorerMini()
    })
  }
}

function updateUnsplashExplorerMiniTitle() {
  const title = document.getElementById("unsplash-explorer-mini-title")
  if (title) title.textContent = getExplorerDisplayTitle()
}

function hideUnsplashExplorerMini() {
  const mini = document.getElementById("unsplash-explorer-mini")
  if (!mini) return

  mini.classList.remove("visible")
  mini.setAttribute("aria-hidden", "true")
}

function dismissUnsplashExplorerMini() {
  hideUnsplashExplorerMini()
}

function minimizeUnsplashExplorer() {
  const modal = document.getElementById("unsplash-explorer-modal")
  const mini = document.getElementById("unsplash-explorer-mini")

  rememberExplorerPosition(true)
  modal?.classList.remove("open")
  if (!mini) return

  initUnsplashExplorerMini()
  updateUnsplashExplorerMiniTitle()
  mini.classList.add("visible")
  mini.setAttribute("aria-hidden", "false")
}

async function openUnsplashExplorer(type = "latest", query = "") {
  const modal = document.getElementById("unsplash-explorer-modal")
  if (!modal) return

  initUnsplashExplorerMini()
  hideUnsplashExplorerMini()
  if (modal.classList.contains("open")) rememberExplorerPosition(true)

  explorerType = type
  explorerQuery = query
  explorerPage = 1
  const savedState = readStoredExplorerState(getExplorerStateKey(type, query))
  const targetPage = Math.max(1, savedState?.page || 1)

  const titleEl = modal.querySelector(".modal-title-text")
  titleEl.textContent = getExplorerDisplayTitle(type, query)
  updateUnsplashExplorerMiniTitle()

  const grid = document.getElementById("unsplash-explorer-grid")
  explorerScrollCapturePaused = true
  if (grid) grid.innerHTML = '<div class="explorer-loading"><i class="fa-solid fa-spinner fa-spin"></i></div>'

  modal.classList.add("open")
  for (let page = 1; page <= targetPage; page++) {
    explorerPage = page
    await loadExplorerResults(page > 1)
  }
  explorerPage = targetPage
  restoreExplorerPosition()
  setTimeout(restoreExplorerPosition, 320)
  setTimeout(() => {
    explorerScrollCapturePaused = false
  }, 760)
}

async function loadExplorerResults(append = false) {
  const settings = getSettings()
  const accessKey = settings.unsplashAccessKey
  if (!accessKey) return

  const grid = document.getElementById("unsplash-explorer-grid")
  const loadMoreBtn = document.getElementById("unsplash-explorer-load-more")
  const perPage = 20

  if (grid && !grid.dataset.positionListenerAttached) {
    grid.dataset.positionListenerAttached = "true"
    grid.addEventListener("scroll", rememberExplorerPosition, { passive: true })
  }

  const body = grid?.closest(".bug-modal-body")
  if (body && !body.dataset.unsplashPositionListenerAttached) {
    body.dataset.unsplashPositionListenerAttached = "true"
    body.addEventListener("scroll", rememberExplorerPosition, { passive: true })
  }

  if (loadMoreBtn) {
    loadMoreBtn.disabled = true
    const originalText = loadMoreBtn.innerHTML
    loadMoreBtn.dataset.originalHtml = originalText
    loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...'
  }

  try {
    let data = []
    if (explorerType === "search") {
      const result = await searchUnsplashPhotos(accessKey, explorerQuery, explorerPage, perPage)
      data = result.results || []
      // Optional: Check total_pages to hide button
      if (result.total_pages && explorerPage >= result.total_pages) {
        if (loadMoreBtn) loadMoreBtn.style.display = "none"
      }
    } else {
      data = await listUnsplashPhotos(accessKey, explorerType, explorerPage, perPage)
    }

    if (!append && grid) grid.innerHTML = ""

    if (data && data.length > 0) {
      data.forEach(photo => {
        const item = document.createElement("div")
        item.className = "explorer-photo-item"
        item.style.backgroundImage = `url(${photo.urls.small})`
        const { width, height } = getTargetImageDimensions()
        const originalSize = formatResolution(photo.width, photo.height)
        const screenSize = formatResolution(width, height)
        item.title = `By ${photo.user.name} - ${originalSize}`

        const meta = document.createElement("div")
        meta.className = "explorer-photo-meta"
        meta.innerHTML = `
          <span><i class="fa-solid fa-up-right-and-down-left-from-center"></i>${originalSize}</span>
          <span><i class="fa-solid fa-display"></i>${screenSize}</span>
        `
        item.appendChild(meta)

        item.addEventListener("click", (event) => {
          event.preventDefault()
          rememberExplorerPosition(true)
          applyUnsplashPhoto(photo, item)
          // Removed auto-close as per user request to allow manual closing
          // document.getElementById("unsplash-explorer-modal").classList.remove("open")
        })

        grid.appendChild(item)
      })

      // If we got fewer results than requested, there are likely no more pages
      if (loadMoreBtn) {
        if (data.length < perPage) {
          loadMoreBtn.style.display = "none"
        } else {
          loadMoreBtn.style.display = "inline-flex"
          loadMoreBtn.innerHTML = loadMoreBtn.dataset.originalHtml || '<i class="fa-solid fa-plus"></i> Load More'
          loadMoreBtn.disabled = false
        }
      }
    } else {
      if (!append && grid) {
        grid.innerHTML = '<div class="explorer-no-results">No photos found.</div>'
      }
      if (loadMoreBtn) loadMoreBtn.style.display = "none"
    }
  } catch (err) {
    console.error("Explorer load failed:", err)
    if (grid && !append) {
      grid.innerHTML = `<div class="explorer-error">Error: ${err.message}</div>`
    } else {
      showAlert(`Load failed: ${err.message}`)
    }
    if (loadMoreBtn) {
      loadMoreBtn.innerHTML = loadMoreBtn.dataset.originalHtml || '<i class="fa-solid fa-plus"></i> Load More'
      loadMoreBtn.disabled = false
    }
  }
}

async function applyUnsplashPhoto(photo, element = null) {
  rememberExplorerPosition(true)

  if (element) {
    element.classList.add("applying")
  }

  const { width, height } = getTargetImageDimensions()
  
  const baseUrl = photo.urls.raw || photo.urls.full || photo.urls.regular
  const separator = baseUrl.includes("?") ? "&" : "?"
  const imageUrl = `${baseUrl}${separator}auto=format&fit=crop&w=${width}&h=${height}&q=85`

  // Show loading state on background
  const bgLayer = document.getElementById("bg-layer")
  if (bgLayer) {
    bgLayer.style.opacity = "0.5"
  }

  try {
    // Tải ảnh và lưu vào IndexedDB
    let finalBgValue = imageUrl
    const imgRes = await fetch(imageUrl)
    if (imgRes.ok) {
      const blob = await imgRes.blob()
      finalBgValue = await saveImage(blob, `idb-img-unsplash-${Date.now()}`)
    }

    // Persist credit
    updateSetting("unsplashLastCredit", {
      photoUrl: photo.links?.html || "",
      authorName: photo.user?.name || "",
      authorUrl: photo.user?.links?.html || "",
    })

    // Update settings and apply
    const updateFn = (typeof window !== 'undefined' ? window.appHandleSettingUpdate : null)
    if (typeof updateFn === 'function') {
      updateFn("background", finalBgValue)
    }

    // Enable save button
    const saveBtn = document.getElementById("unsplash-save-bg-btn")
    if (saveBtn) {
      saveBtn.disabled = false
    }

    saveSettings()
    minimizeUnsplashExplorer()
  } catch (err) {
    console.error("Failed to apply photo:", err)
    showAlert("Failed to apply Unsplash photo.")
  } finally {
    if (element) {
      element.classList.remove("applying")
    }
    restoreExplorerPosition()
  }
}

async function loadMoreExplorer() {
  rememberExplorerPosition(true)
  explorerPage++
  await loadExplorerResults(true)
  rememberExplorerPosition(true)
}

export {
  fetchBestUnsplashPhoto,
  fetchUnsplashPhotoById,
  populateUnsplashCollections,
  setUnsplashRandomBackground,
  searchUnsplashPhotos,
  listUnsplashPhotos,
  openUnsplashExplorer,
  minimizeUnsplashExplorer,
  dismissUnsplashExplorerMini,
  loadExplorerResults,
  loadMoreExplorer,
}
