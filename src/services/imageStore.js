/**
 * imageStore.js
 * Lưu ảnh nền user vào IndexedDB thay vì localStorage.
 * LocalStorage chỉ lưu ID nhỏ (vd: "idb-img-1740000000000").
 * Blob URL được cache trong bộ nhớ để applySettings() dùng đồng bộ.
 */

const DB_NAME = "startpage-images"
const STORE_NAME = "backgrounds"
const THUMB_STORE_NAME = "thumbnails"
const DB_VERSION = 2

// In-memory cache: id -> blobUrl (revokeObjectURL khi xoá)
const _urlCache = new Map()
const _thumbCache = new Map()

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
      if (!db.objectStoreNames.contains(THUMB_STORE_NAME)) {
        db.createObjectStore(THUMB_STORE_NAME)
      }
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

/** Lưu Thumbnail vào store riêng */
export async function saveThumbnail(id, blob) {
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(THUMB_STORE_NAME, "readwrite")
    tx.objectStore(THUMB_STORE_NAME).put(blob, id)
    tx.oncomplete = resolve
    tx.onerror = (e) => reject(e.target.error)
  })
  if (_thumbCache.has(id)) URL.revokeObjectURL(_thumbCache.get(id))
  _thumbCache.set(id, URL.createObjectURL(blob))
}

/** Lấy thumbnail URL */
export async function getThumbnailUrl(id) {
  if (!id) return null
  if (_thumbCache.has(id)) return _thumbCache.get(id)
  
  const db = await openDb()
  const blob = await new Promise((resolve) => {
    try {
      const tx = db.transaction(THUMB_STORE_NAME, "readonly")
      const req = tx.objectStore(THUMB_STORE_NAME).get(id)
      req.onsuccess = (e) => resolve(e.target.result)
      req.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
  
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  _thumbCache.set(id, url)
  return url
}

/** Lưu Blob vào IndexedDB, trả về ID */
export async function saveImage(blob, customId) {
  const id = customId || `idb-img-${Date.now()}`
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).put(blob, id)
    tx.oncomplete = resolve
    tx.onerror = (e) => reject(e.target.error)
  })
  _urlCache.set(id, URL.createObjectURL(blob))
  return id
}

/** Lấy blob URL từ cache (đồng bộ) — chỉ dùng sau khi đã preloadImages() */
export function getBlobUrlSync(id) {
  return _urlCache.get(id) || null
}

/** Lấy blob URL, load từ IndexedDB nếu chưa có trong cache */
export async function getImageUrl(id) {
  if (typeof id !== "string" && typeof id !== "number") return null
  if (!id) return null
  if (_urlCache.has(id)) return _urlCache.get(id)
  const db = await openDb()
  const blob = await new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly")
      const req = tx.objectStore(STORE_NAME).get(id)
      req.onsuccess = (e) => resolve(e.target.result)
      req.onerror = (e) => reject(e.target.error)
    } catch (err) {
      reject(err)
    }
  })
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  _urlCache.set(id, url)
  return url
}

/** Xoá ảnh và cả thumbnail liên quan */
export async function deleteImage(id) {
  if (_urlCache.has(id)) {
    URL.revokeObjectURL(_urlCache.get(id))
    _urlCache.delete(id)
  }
  if (_thumbCache.has(id)) {
    URL.revokeObjectURL(_thumbCache.get(id))
    _thumbCache.delete(id)
  }
  
  const db = await openDb()
  const tx = db.transaction([STORE_NAME, THUMB_STORE_NAME], "readwrite")
  tx.objectStore(STORE_NAME).delete(id)
  tx.objectStore(THUMB_STORE_NAME).delete(id)
  return new Promise((resolve) => {
    tx.oncomplete = resolve
  })
}

/** Preload blob URLs cho tất cả IDB IDs (gọi khi khởi động) */
export async function preloadImages(ids) {
  for (const id of ids) {
    if (isIdbMedia(id) && !_urlCache.has(id)) {
      await getImageUrl(id).catch(() => {})
    }
  }
}

/** Kiểm tra xem có phải IDB ID không */
export function isIdbImage(id) {
  return typeof id === "string" && id.startsWith("idb-img-")
}

/** Kiểm tra xem có phải IDB video ID không */
export function isIdbVideo(id) {
  return typeof id === "string" && id.startsWith("idb-video-")
}

/** Kiểm tra IDB image hoặc video */
export function isIdbMedia(id) {
  return isIdbImage(id) || isIdbVideo(id)
}

/** Lưu Video Blob vào IndexedDB, trả về ID */
export async function saveVideo(blob) {
  const id = `idb-video-${Date.now()}`
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).put(blob, id)
    tx.oncomplete = resolve
    tx.onerror = (e) => reject(e.target.error)
  })
  _urlCache.set(id, URL.createObjectURL(blob))
  return id
}

/** Lấy raw Blob từ IndexedDB (dùng cho export) */
export async function getImageBlob(id) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const req = tx.objectStore(STORE_NAME).get(id)
    req.onsuccess = (e) => resolve(e.target.result || null)
    req.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Migrate ảnh cũ từ base64 data URL sang IndexedDB.
 * Trả về { migrated: string[], changed: boolean }
 */
export async function migrateDataUrls(userBackgrounds) {
  if (!Array.isArray(userBackgrounds) || userBackgrounds.length === 0) {
    return { migrated: userBackgrounds || [], changed: false }
  }

  const migrated = []
  let changed = false

  for (const entry of userBackgrounds) {
    const isDataUrl =
      typeof entry === "string" &&
      (entry.startsWith("data:image") || entry.startsWith("data:video"))

    if (isDataUrl) {
      try {
        const res = await fetch(entry)
        const blob = await res.blob()
        const id = await saveImage(blob)
        migrated.push(id)
        changed = true
      } catch {
        // Nếu migrate lỗi, giữ nguyên data URL
        migrated.push(entry)
      }
    } else {
      migrated.push(entry)
    }
  }

  return { migrated, changed }
}
