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
import { geti18n } from "../../services/i18n.js"

const UNSPLASH_RECENT_PREFIX = "startpageUnsplashRecent:"
const UNSPLASH_RECENT_LIMIT = 35
const UNSPLASH_RANDOM_ATTEMPTS = 6

function firstPhoto(payload) {
  return Array.isArray(payload) ? payload[0] : payload
}

function getPhotoKey(photo) {
  return photo?.id || photo?.links?.html || photo?.urls?.raw || ""
}

function getRecentUnsplashKeys(categoryKey) {
  try {
    const raw = localStorage.getItem(`${UNSPLASH_RECENT_PREFIX}${categoryKey}`)
    const parsed = JSON.parse(raw || "[]")
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

function rememberUnsplashPhoto(categoryKey, photo) {
  const key = getPhotoKey(photo)
  if (!key) return

  const recent = getRecentUnsplashKeys(categoryKey).filter((item) => item !== key)
  recent.unshift(key)
  try {
    localStorage.setItem(
      `${UNSPLASH_RECENT_PREFIX}${categoryKey}`,
      JSON.stringify(recent.slice(0, UNSPLASH_RECENT_LIMIT)),
    )
  } catch {
    // Recent history is only a repeat guard.
  }
}

function getSavedUnsplashKeys(settings = getSettings()) {
  return new Set(
    (settings.userBackgrounds || [])
      .flatMap((entry) => {
        if (!entry || typeof entry !== "object") return []
        return [entry.photoUrl, entry.id].filter(Boolean)
      })
      .filter(Boolean),
  )
}

function hasSeenUnsplashPhoto(photo, categoryKey, settings = getSettings()) {
  const key = getPhotoKey(photo)
  const recent = new Set(getRecentUnsplashKeys(categoryKey))
  const saved = getSavedUnsplashKeys(settings)
  return (
    Boolean(key && recent.has(key)) ||
    Boolean(photo?.links?.html && saved.has(photo.links.html))
  )
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(url)
    img.onerror = () => reject(new Error("Failed to preload Unsplash image"))
    img.src = url
  })
}

function prepareDynamicBackgroundSwap() {
  const bgLayer = document.getElementById("bg-layer")
  const bgVideo = document.getElementById("bg-video")

  if (bgVideo) {
    bgVideo.style.opacity = "0"
    bgVideo.style.display = "none"
  }

  if (bgLayer) {
    bgLayer.style.transition = ""
  }
}

function getMediaQualityProfile(settings = getSettings()) {
  const mode = settings.backgroundMediaQuality || "balanced"
  const profiles = {
    quality: { dprCap: 2, widthCap: 3200, heightCap: 2200, quality: 90 },
    balanced: { dprCap: 1.5, widthCap: 2400, heightCap: 1600, quality: 82 },
    low: { dprCap: 1, widthCap: 1600, heightCap: 1000, quality: 68 },
    tiny: { dprCap: 0.75, widthCap: 1024, heightCap: 640, quality: 50 },
    still: { dprCap: 0.85, widthCap: 1280, heightCap: 800, quality: 60 },
  }
  return profiles[mode] || profiles.balanced
}

function getTargetImageDimensions() {
  const profile = getMediaQualityProfile()
  const dpr = window.devicePixelRatio || 1
  const effectiveDpr = Math.min(dpr, profile.dprCap)
  return {
    width: Math.min(
      profile.widthCap,
      Math.round((window.innerWidth > 0 ? window.innerWidth : 1920) * effectiveDpr),
    ),
    height: Math.min(
      profile.heightCap,
      Math.round((window.innerHeight > 0 ? window.innerHeight : 1080) * effectiveDpr),
    ),
  }
}

function buildUnsplashImageUrl(photo, width, height) {
  const profile = getMediaQualityProfile()
  const baseUrl = photo.urls.raw || photo.urls.full || photo.urls.regular
  const separator = baseUrl.includes("?") ? "&" : "?"
  return `${baseUrl}${separator}auto=format&fit=crop&w=${width}&h=${height}&q=${profile.quality}`
}

function buildExplorerThumbnailUrl(photo) {
  const baseUrl =
    photo.urls.raw || photo.urls.small || photo.urls.regular || photo.urls.full
  const separator = baseUrl.includes("?") ? "&" : "?"
  return `${baseUrl}${separator}auto=format&fit=crop&w=360&h=270&q=62`
}

function formatResolution(width, height) {
  return width && height ? `${width} x ${height}` : "Unknown size"
}

function getMissingUnsplashKeyMessage() {
  const i18n = typeof geti18n === "function" ? geti18n() : {}
  return (
    i18n.settings_unsplash_missing_key ||
    "Please enter your Unsplash Access Key first.\nYou can get a free key at unsplash.com/developers."
  )
}

function hasUnsplashAccessKey(showMessage = true) {
  const accessKey = (getSettings().unsplashAccessKey || "").trim()
  if (accessKey) return true
  if (showMessage) showAlert(getMissingUnsplashKeyMessage())
  return false
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

async function fetchUnsplashPhotoFromTopic(accessKey, topicId, categoryKey) {
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

  const freshResults = results.filter(
    (photo) => !hasSeenUnsplashPhoto(photo, categoryKey),
  )
  const pool = freshResults.length ? freshResults : results
  const photo = pool[Math.floor(Math.random() * pool.length)]
  if (!photo?.urls?.raw && !photo?.urls?.full && !photo?.urls?.regular) {
    throw new Error("Unsplash topic payload missing image URL")
  }

  return photo
}

async function fetchUnsplashPhotoFromSearch(accessKey, query, categoryKey) {
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
  const freshResults = results.filter(
    (photo) => !hasSeenUnsplashPhoto(photo, categoryKey),
  )
  const pool = freshResults.length ? freshResults : results
  return pool[Math.floor(Math.random() * pool.length)]
}

async function fetchBestUnsplashPhoto(accessKey, collection) {
  const categoryKey = collection?.key || "default"
  const fetchCandidate = async () => {
    const keyword = buildUnsplashQuery(collection)

    // 1) Prefer random-query fetch as it uses highly specific keywords and accesses the entire Unsplash library (fresher photos).
    if (keyword) {
      try {
        return await fetchUnsplashPhotoByParams(accessKey, {
          query: keyword,
        })
      } catch (err) {
        console.warn("Unsplash random-query fetch failed, trying search fallback:", err)
        try {
          return await fetchUnsplashPhotoFromSearch(accessKey, keyword, categoryKey)
        } catch (searchErr) {
          console.warn("Unsplash search fallback failed:", searchErr)
        }
      }
    }

    // 2) Fallback to curated collections if configured.
    if (collection.collections?.length) {
      try {
        return await fetchUnsplashPhotoFromCollections(
          accessKey,
          collection.collections,
        )
      } catch (err) {
        console.warn("Unsplash collection fetch failed:", err)
      }
    }

    // 3) Fallback to curated topic photos endpoint.
    if (collection.topic) {
      try {
        return await fetchUnsplashPhotoFromTopic(
          accessKey,
          collection.topic,
          categoryKey,
        )
      } catch (err) {
        console.warn("Unsplash topic/photos fetch failed, trying random topic:", err)
        try {
          return await fetchUnsplashPhotoByParams(accessKey, {
            topics: collection.topic,
          })
        } catch (topicErr) {
          console.warn("Unsplash topic fetch failed:", topicErr)
        }
      }
    }

    throw new Error("Invalid Unsplash collection configuration")
  }

  let fallbackPhoto = null
  for (let attempt = 0; attempt < UNSPLASH_RANDOM_ATTEMPTS; attempt++) {
    const photo = await fetchCandidate()
    if (!fallbackPhoto) fallbackPhoto = photo
    if (!hasSeenUnsplashPhoto(photo, categoryKey)) return photo
  }
  return fallbackPhoto
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
  unsplashRandomBtn = null,
  unsplashCategorySelect = null,
  handleSettingUpdateCallback = null,
  isSilent = false,
) {
  const settings = getSettings()
  const previousBackground = settings.background
  if (!hasUnsplashAccessKey(!isSilent)) return
  const accessKey = settings.unsplashAccessKey.trim()

  const btn = unsplashRandomBtn
  const originalHtml = btn ? btn.innerHTML : null
  if (btn) {
    btn.disabled = true
    const icon = btn.querySelector("i")
    if (icon) {
      icon.classList.remove("fa-sync-alt")
      icon.classList.add("fa-spinner", "fa-spin")
    }
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
    rememberUnsplashPhoto(collection.key, photo)
    const imageUrl = buildUnsplashImageUrl(photo, width, height)

    await preloadImage(imageUrl)
    const finalBgValue = imageUrl

    prepareDynamicBackgroundSwap()

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

    // Update last fetch timestamp on success
    updateSetting("unsplashLastFetchTime", Date.now())

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
    
    if (btn) {
      btn.disabled = false
      btn.innerHTML = originalHtml
    }
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

    if (btn) {
      btn.disabled = false
      btn.innerHTML = originalHtml
    }
    
    if (!isSilent) {
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
  requestAnimationFrame(() => {
    restore()
    setTimeout(() => {
      restore()
      explorerScrollCapturePaused = false
    }, 50)
  })
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

function reopenMinimizedUnsplashExplorer() {
  const modal = document.getElementById("unsplash-explorer-modal")
  if (!modal) return

  initUnsplashExplorerMini()
  hideUnsplashExplorerMini()
  const titleEl = modal.querySelector(".modal-title-text")
  if (titleEl) titleEl.textContent = getExplorerDisplayTitle()
  modal.classList.add("open")
}

function initUnsplashExplorerMini() {
  if (explorerMiniInitialized) return
  explorerMiniInitialized = true

  const mini = document.getElementById("unsplash-explorer-mini")
  const openBtn = document.getElementById("unsplash-explorer-mini-open")
  const closeBtn = document.getElementById("unsplash-explorer-mini-close")

  openBtn?.addEventListener("click", () => {
    reopenMinimizedUnsplashExplorer()
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
  if (!hasUnsplashAccessKey(true)) return

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
  const perPage = 16

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
    loadMoreBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i><span>Loading...</span>'
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
      const fragment = document.createDocumentFragment()

      data.forEach(photo => {
        const item = document.createElement("div")
        item.className = "explorer-photo-item"
        const { width, height } = getTargetImageDimensions()
        const originalSize = formatResolution(photo.width, photo.height)
        const screenSize = formatResolution(width, height)
        item.title = `By ${photo.user.name} - ${originalSize}`

        const image = document.createElement("img")
        image.className = "explorer-photo-img"
        image.src = buildExplorerThumbnailUrl(photo)
        image.alt = photo.alt_description || photo.description || ""
        image.loading = "eager"
        image.decoding = "async"
        image.fetchPriority = "low"
        image.sizes = "(max-width: 760px) 45vw, 180px"
        item.appendChild(image)

        const meta = document.createElement("div")
        meta.className = "explorer-photo-meta"
        meta.innerHTML = `
          <span><i class="fa-solid fa-up-right-and-down-left-from-center"></i>${originalSize}</span>
          <span><i class="fa-solid fa-display"></i>${screenSize}</span>
        `
        item.appendChild(meta)

        const overlay = document.createElement("div")
        overlay.className = "explorer-photo-overlay"
        const author = document.createElement("span")
        author.className = "explorer-photo-author"
        author.innerHTML = '<i class="fa-solid fa-camera"></i>'
        author.append(document.createTextNode(photo.user.name))
        const action = document.createElement("span")
        action.className = "explorer-photo-action"
        action.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i>'
        overlay.append(author, action)
        item.appendChild(overlay)

        item.addEventListener("click", (event) => {
          event.preventDefault()
          rememberExplorerPosition(true)
          grid
            .querySelectorAll(".explorer-photo-item.selected")
            .forEach((selectedItem) => selectedItem.classList.remove("selected"))
          item.classList.add("selected")
          applyUnsplashPhoto(photo, item)
          // Removed auto-close as per user request to allow manual closing
          // document.getElementById("unsplash-explorer-modal").classList.remove("open")
        })

        fragment.appendChild(item)
      })

      await new Promise((resolve) => requestAnimationFrame(resolve))
      grid.appendChild(fragment)

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
    element.setAttribute("aria-busy", "true")
  }

  const { width, height } = getTargetImageDimensions()
  rememberUnsplashPhoto(explorerType || "explorer", photo)
  
  const imageUrl = buildUnsplashImageUrl(photo, width, height)

  try {
    await preloadImage(imageUrl)
    const finalBgValue = imageUrl

    prepareDynamicBackgroundSwap()

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
    if (element) element.classList.remove("selected")
  } finally {
    if (element) {
      element.classList.remove("applying")
      element.removeAttribute("aria-busy")
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
