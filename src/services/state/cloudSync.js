// cloudSync.js - Chrome Sync cloud backup, restore, and data sanitization
const isCloudSafeThemeBackground = (value) => {
  if (typeof value !== "string") return value == null
  const trimmed = value.trim()
  if (!trimmed) return true
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) return true
  if (/(?:^|-)gradient\(/i.test(trimmed)) return true
  if (/^hsl|^rgb/i.test(trimmed)) return true
  return false
}

const sanitizeCloudThemeSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== "object") return snapshot
  const next = { ...snapshot }

  if (!isCloudSafeThemeBackground(next.background)) {
    delete next.background
    delete next.activeBgUid
    delete next.unsplashLastCredit
  }

  return next
}

const isCloudUnsafeMediaValue = (value) =>
  typeof value === "string" &&
  /^(data:image\/|data:video\/|blob:|idb-img-|idb-gif-|idb-video-)/i.test(
    value.trim(),
  )

const sanitizeCloudValue = (value) => {
  if (isCloudUnsafeMediaValue(value)) return undefined
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeCloudValue(item))
      .filter((item) => item !== undefined)
  }
  if (value && typeof value === "object") {
    const next = {}
    Object.entries(value).forEach(([key, item]) => {
      const sanitized = sanitizeCloudValue(item)
      if (sanitized !== undefined) next[key] = sanitized
    })
    return next
  }
  return value
}

const sanitizeCloudUserThemes = (themes) => {
  if (!Array.isArray(themes)) return themes
  return themes.map((theme) => {
    if (!theme || typeof theme !== "object") return theme
    return {
      ...theme,
      snapshot: sanitizeCloudThemeSnapshot(theme.snapshot),
    }
  })
}

/**
 * Backup settings to Chrome Sync Storage.
 * Excludes heavy media data but keeps essential UI state.
 */
export async function backupToCloud(options = {}, ctx = {}) {
  const getSettings = ctx.getSettings || (() => ({}))
  let currentSettings = { ...getSettings() }

  // 1. Mandatory Exclusions (Security/Heavy Media)
  const mandatoryExclusions = [
    "unsplashAccessKey",
    "userBackgrounds",
    "userVideos",
    "userImages",
    "background",
    "activeBgUid",
    "lastUserBackground",
    "lastUserActiveBgUid",
    "lastUserBackgroundState",
    "lastUserBackgroundPreview",
    "mediaOrbImageData",
    "userThemes",
    "userStyles",
    "userGradients",
    "userMultiColors",
    "userSvgWaves",
    "userGradientV2s",
    "userSilks",
    "userLightPillars",
    "userLiquidEthers",
  ]
  mandatoryExclusions.forEach((key) => delete currentSettings[key])

  // 2. User-selected Exclusions
  currentSettings = sanitizeCloudValue(currentSettings) || {}

  if (!options.includeStyles) {
    const styleKeys = [
      "accentColor",
      "accentColorMode",
      "m3PaletteStyle",
      "font",
      "userColors",
      "userAccentColors",
      "userSavedFonts",
      "clockColor",
      "dateColor",
      "bookmarkBgColor",
      "bookmarkTextColor",
      "bookmarkShadowColor",
      "bookmarkLayoutBgColor",
    ]
    styleKeys.forEach((key) => delete currentSettings[key])
  }

  if (!options.includeEffects) {
    const effectKeys = Object.keys(currentSettings).filter(
      (k) =>
        k.startsWith("pixel") ||
        k.startsWith("svgWave") ||
        k.startsWith("rain") ||
        k.startsWith("snow") ||
        k.includes("Effect") ||
        k.includes("Color"),
    )
    effectKeys.forEach((key) => delete currentSettings[key])
  }

  if (!options.includePositions) {
    delete currentSettings.componentPositions
    delete currentSettings.lockedWidgets
  }

  // Final check for heavy data structures (fonts, custom languages, huge arrays)
  Object.keys(currentSettings).forEach((key) => {
    // If the size of this specific property is over 10KB, strip it
    // because Chrome Sync has a hard overall limit of 100KB total.
    try {
      if (JSON.stringify(currentSettings[key]).length > 10000) {
        delete currentSettings[key]
      }
    } catch (e) {
      delete currentSettings[key]
    }
  })

  const settingsStr = JSON.stringify(currentSettings)
  if (settingsStr.length > 95000) {
    throw new Error("quota: cloud settings payload is too large")
  }

  return new Promise((resolve, reject) => {
    if (!window.chrome || !chrome.storage || !chrome.storage.sync) {
      reject(new Error("Chrome Sync Storage is not available."))
      return
    }

    // Chunking to bypass 8KB QUOTA_BYTES_PER_ITEM limit
    const chunkSize = 7500 // safe margin below 8192
    const totalChunks = Math.ceil(settingsStr.length / chunkSize)
    const syncData = {
      cloudSettings_count: totalChunks,
    }

    for (let i = 0; i < totalChunks; i++) {
      syncData[`cloudSettings_${i}`] = settingsStr.slice(
        i * chunkSize,
        (i + 1) * chunkSize,
      )
    }

    // First clear old keys to avoid leftovers
    chrome.storage.sync.get(null, (items) => {
      if (chrome.runtime.lastError)
        return reject(new Error(chrome.runtime.lastError.message))
      const keysToRemove = Object.keys(items).filter(
        (k) =>
          k === "cloudSettings" ||
          k === "cloudSettings_count" ||
          k.startsWith("cloudSettings_"),
      )

      const finishBackup = () => {
        chrome.storage.sync.set(syncData, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        })
      }

      if (keysToRemove.length > 0) {
        chrome.storage.sync.remove(keysToRemove, finishBackup)
      } else {
        finishBackup()
      }
    })
  })
}

/**
 * Clear the Chrome Sync backup for this extension.
 */
export async function clearCloudBackup() {
  return new Promise((resolve, reject) => {
    if (!window.chrome || !chrome.storage || !chrome.storage.sync) {
      resolve()
      return
    }

    chrome.storage.sync.get(null, (items) => {
      if (chrome.runtime.lastError)
        return reject(new Error(chrome.runtime.lastError.message))

      const keysToRemove = Object.keys(items).filter(
        (k) =>
          k === "cloudSettings" ||
          k === "cloudSettings_count" ||
          k.startsWith("cloudSettings_"),
      )
      if (keysToRemove.length === 0) return resolve()

      chrome.storage.sync.remove(keysToRemove, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
  })
}

/**
 * Restore settings from Chrome Sync Storage.
 * Merges cloud settings with current local media gallery.
 */
export async function restoreFromCloud(ctx = {}) {
  const {
    getSettings = () => ({}),
    updateAllSettings = () => {},
    saveSettings = () => {},
  } = ctx
  return new Promise((resolve, reject) => {
    if (!window.chrome || !chrome.storage || !chrome.storage.sync) {
      reject(new Error("Chrome Sync Storage is not available."))
      return
    }

    chrome.storage.sync.get(null, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        try {
          let settingsStr = null

          if (result.cloudSettings_count) {
            // Reconstruct from chunks
            const chunks = []
            for (let i = 0; i < result.cloudSettings_count; i++) {
              if (result[`cloudSettings_${i}`]) {
                chunks.push(result[`cloudSettings_${i}`])
              }
            }
            settingsStr = chunks.join("")
          } else if (result.cloudSettings) {
            // Legacy single-string fallback
            settingsStr = result.cloudSettings
          }

          if (settingsStr) {
            const restored = JSON.parse(settingsStr)
            if (Array.isArray(restored.userThemes)) {
              restored.userThemes = sanitizeCloudUserThemes(restored.userThemes)
            }
            const current = getSettings()

            // IMPORTANT: Re-merge local media galleries that were not synced
            const mediaKeys = [
              "userBackgrounds",
              "userVideos",
              "userImages",
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
              "userStyles",
              "unsplashAccessKey",
            ]

            mediaKeys.forEach((key) => {
              if (current[key] && current[key].length > 0) {
                restored[key] = current[key]
              } else if (current[key] && typeof current[key] === "string") {
                restored[key] = current[key]
              }
            })

            // If the restored background is a local ID but we don't have it locally,
            // it might cause a broken background. We'll handle this in applySettings.

            updateAllSettings(restored)
            saveSettings(true)
            resolve(true)
          } else {
            resolve(false) // No data found
          }
        } catch (e) {
          reject(new Error("Failed to parse cloud data: " + e.message))
        }
      }
    })
  })
}
