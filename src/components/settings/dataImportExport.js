/**
 * Settings Data Import & Export Helpers
 * Extracted from eventHandlers.js
 */

import { isIdbMedia } from "../../services/imageStore.js"

export const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

export const dataUrlToBlob = (dataUrl) => {
  const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl)
  if (!match) {
    throw new Error("Invalid data URL")
  }

  const mimeType = match[1] || "application/octet-stream"
  const isBase64 = Boolean(match[2])
  const data = match[3] || ""
  const binary = isBase64 ? atob(data) : decodeURIComponent(data)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new Blob([bytes], { type: mimeType })
}

export const collectLocalMediaIds = (settingsSnapshot) => {
  const ids = new Set()

  const visit = (value) => {
    if (isIdbMedia(value)) {
      ids.add(value)
      return
    }

    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }

    if (value && typeof value === "object") {
      Object.values(value).forEach(visit)
    }
  }

  visit(settingsSnapshot)
  return [...ids]
}

export const replaceLocalMediaIds = (value, mediaIdMap) => {
  if (typeof value === "string") {
    return mediaIdMap[value] || value
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceLocalMediaIds(item, mediaIdMap))
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, child]) => {
      value[key] = replaceLocalMediaIds(child, mediaIdMap)
    })
  }

  return value
}

export const getBackgroundIdentity = (entry) => {
  if (typeof entry === "string") return entry
  if (!entry || typeof entry !== "object") return null
  return entry.id || entry.url || entry.thumb || entry.preview || null
}

export const mergeUserBackgrounds = (currentBackgrounds, importedBackgrounds) => {
  const merged = Array.isArray(currentBackgrounds)
    ? [...currentBackgrounds]
    : []
  if (!Array.isArray(importedBackgrounds)) return merged

  const seen = new Set(merged.map(getBackgroundIdentity).filter(Boolean))
  importedBackgrounds.forEach((entry) => {
    const dedupeKey = getBackgroundIdentity(entry)
    if (dedupeKey && seen.has(dedupeKey)) return
    merged.push(entry)
    if (dedupeKey) seen.add(dedupeKey)
  })

  return merged
}

export const SAVED_GALLERY_KEYS = [
  "userColors",
  "userAccentColors",
  "userGradients",
  "userMultiColors",
  "userSvgWaves",
  "userGradientV2s",
  "userSilks",
  "userLightPillars",
  "userLiquidEthers",
  "userSavedFonts",
  "userThemes",
]

export const stablePresetIdentity = (value) => {
  if (typeof value === "string") return value.trim().toLowerCase()
  if (!value || typeof value !== "object") return JSON.stringify(value)

  const normalize = (item) => {
    if (Array.isArray(item)) return item.map(normalize)
    if (!item || typeof item !== "object") return item

    return Object.keys(item)
      .filter((key) => !["id", "uid", "createdAt", "updatedAt"].includes(key))
      .sort()
      .reduce((output, key) => {
        output[key] = normalize(item[key])
        return output
      }, {})
  }

  return JSON.stringify(normalize(value))
}

export const mergePresetArray = (currentItems, importedItems) => {
  const merged = Array.isArray(currentItems) ? [...currentItems] : []
  if (!Array.isArray(importedItems)) return merged

  const seen = new Set(merged.map(stablePresetIdentity))
  importedItems.forEach((item) => {
    const dedupeKey = stablePresetIdentity(item)
    if (seen.has(dedupeKey)) return
    merged.push(item)
    seen.add(dedupeKey)
  })

  return merged
}

export const mergeSavedGallerySettings = (currentSettings, importedSettings) => {
  if (Array.isArray(importedSettings.userBackgrounds)) {
    importedSettings.userBackgrounds = mergeUserBackgrounds(
      currentSettings.userBackgrounds,
      importedSettings.userBackgrounds,
    )
  }

  SAVED_GALLERY_KEYS.forEach((key) => {
    if (!Array.isArray(importedSettings[key])) return
    importedSettings[key] = mergePresetArray(
      currentSettings[key],
      importedSettings[key],
    )
  })
}


export const stripLocalMediaReferences = (value) => {
  if (typeof value === "string" && isIdbMedia(value)) return null
  if (Array.isArray(value)) {
    return value
      .map((item) => stripLocalMediaReferences(item))
      .filter((item) => item !== null)
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        stripLocalMediaReferences(child),
      ]),
    )
  }
  return value
}

export const downloadExportPayload = (payload) => {
  const blob = new Blob([payload], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `startpage-${new Date().toISOString().slice(0, 10)}.json`
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 10000)
}
