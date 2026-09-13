import { getSettings } from "../../services/state.js"
import { geti18n } from "../../services/i18n.js"

/**
 * Updates the UI state (disabled/enabled, labels) of Unsplash and Picsum save background buttons
 * based on the currently applied background.
 */
export function updateMediaSaveButtonsState() {
  const settings = getSettings()
  const currentBg = settings.background
  const userBackgrounds = settings.userBackgrounds || []
  const i18n = geti18n()

  const isSaved = userBackgrounds.some((bg) => {
    if (typeof bg === "object")
      return bg.id === currentBg || (bg.photoUrl && bg.photoUrl === currentBg)
    return bg === currentBg
  })

  const unsplashSaveBtn = document.getElementById("unsplash-save-bg-btn")
  if (unsplashSaveBtn) {
    if (
      isSaved &&
      currentBg &&
      (currentBg.includes("unsplash.com") ||
        currentBg.startsWith("idb-img-unsplash"))
    ) {
      unsplashSaveBtn.disabled = true
      unsplashSaveBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>${i18n.settings_unsplash_saved || "Saved"}</span>`
    } else {
      unsplashSaveBtn.disabled = false
      unsplashSaveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>${i18n.settings_unsplash_save || "Save Background"}</span>`
    }
  }

  const picsumSaveBtn = document.getElementById("picsum-save-btn")
  if (picsumSaveBtn) {
    const isFreePhoto =
      currentBg &&
      (currentBg.includes("picsum.photos") ||
        currentBg.includes("fastly.picsum.photos") ||
        currentBg.startsWith("idb-img-picsum") ||
        currentBg.includes("loremflickr.com") ||
        currentBg.includes("staticflickr.com") ||
        currentBg.includes("flickr.com") ||
        currentBg.startsWith("idb-img-loremflickr") ||
        currentBg.startsWith("idb-img-freephotos"))
    if (isSaved && isFreePhoto) {
      picsumSaveBtn.disabled = true
      picsumSaveBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>${i18n.settings_unsplash_saved || "Saved!"}</span>`
    } else {
      picsumSaveBtn.disabled = false
      picsumSaveBtn.innerHTML = `<i class="fa-solid fa-download"></i> <span>Save to Gallery</span>`
    }
  }
}
