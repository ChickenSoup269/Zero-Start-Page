/**
 * imageStore.js
 * Lưu ảnh nền user vào IndexedDB thay vì localStorage.
 * LocalStorage chỉ lưu ID nhỏ (vd: "idb-img-1740000000000").
 * Blob URL được cache trong bộ nhớ để applySettings() dùng đồng bộ.
 */

const DB_NAME = "startpage-images"
const STORE_NAME = "backgrounds"
const DB_VERSION = 1

// In-memory cache: id -> blobUrl (revokeObjectURL khi xoá)
const _urlCache = new Map()

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

/** Lưu Blob vào IndexedDB, trả về ID */
export async function saveImage(blob) {
  const id = `idb-img-${Date.now()}`
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
  if (_urlCache.has(id)) return _urlCache.get(id)
  const db = await openDb()
  const blob = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const req = tx.objectStore(STORE_NAME).get(id)
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  _urlCache.set(id, url)
  return url
}

/** Xoá ảnh khỏi IndexedDB và giải phóng blob URL */
export async function deleteImage(id) {
  if (_urlCache.has(id)) {
    URL.revokeObjectURL(_urlCache.get(id))
    _urlCache.delete(id)
  }
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = resolve
    tx.onerror = (e) => reject(e.target.error)
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
