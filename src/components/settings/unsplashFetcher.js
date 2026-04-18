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
    per_page: "30",
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
    per_page: "30",
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
  unsplashCredit,
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
  const dpr = window.devicePixelRatio || 1
  const width = Math.round(
    (window.innerWidth > 0 ? window.innerWidth : 1920) * dpr,
  )
  const height = Math.round(
    (window.innerHeight > 0 ? window.innerHeight : 1080) * dpr,
  )

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

    // Show photo credit
    if (unsplashCredit) {
      const photoLink = photo.links?.html
        ? `<a href="${photo.links.html}?utm_source=startpage&utm_medium=referral" target="_blank" rel="noopener" style="color:inherit;">View on Unsplash</a>`
        : ""
      const authorName = photo.user?.name || ""
      const authorLink = photo.user?.links?.html
        ? `<a href="${photo.user.links.html}?utm_source=startpage&utm_medium=referral" target="_blank" rel="noopener" style="color:inherit;">${authorName}</a>`
        : authorName
      unsplashCredit.innerHTML = `📷 ${photoLink}${photoLink && authorName ? " &bull; " : ""}${authorLink}`
      unsplashCredit.style.display = "block"
    }
    // Persist credit so it survives page refresh
    updateSetting("unsplashLastCredit", {
      photoUrl: photo.links?.html || "",
      authorName: photo.user?.name || "",
      authorUrl: photo.user?.links?.html || "",
    })
    saveSettings()

    handleSettingUpdateCallback("background", finalBgValue)
    btn.disabled = false
    btn.innerHTML = originalHtml
  } catch (err) {
    console.error("Unsplash fetch failed:", err)
    if (unsplashCredit) unsplashCredit.style.display = "none"

    // Restore previous background if loading fails after black-screen state.
    handleSettingUpdateCallback("background", previousBackground)

    btn.disabled = false
    btn.innerHTML = originalHtml
    showAlert(
      "Failed to load Unsplash image. Please check your Access Key and try again.",
    )
  }
}

async function fetchUnsplashPhotoById(accessKey, photoId) {
  const url = `https://api.unsplash.com/photos/${photoId}?client_id=${accessKey}`
  const response = await fetch(url)
  if (!response.ok) throw new Error("Failed to fetch photo metadata")
  return await response.json()
}

export {
  fetchBestUnsplashPhoto,
  fetchUnsplashPhotoById,
  populateUnsplashCollections,
  setUnsplashRandomBackground,
}
