/**
 * boot/revealApp.js
 * Controls the startup overlay hide/show and the main-container reveal transition.
 * Performance goal: no overlay delay > minimumStartupLoaderMs, safety timeout ≤ 1500ms.
 */
import { isIdbMedia } from "../services/imageStore.js"

export function needsSettingsAtBoot(settings) {
  const bg = settings.background
  const isVideo =
    typeof bg === "string" &&
    (bg.startsWith("data:video") ||
      bg.startsWith("idb-video-") ||
      bg.startsWith("idb-gif-") ||
      /\.(mp4|webm|mov|ogg)(?:[?#].*)?$/i.test(bg) ||
      bg.includes("googlevideo"))

  const isCustomBg =
    isIdbMedia(bg) ||
    (typeof bg === "string" &&
      (bg.startsWith("data:") ||
        bg.startsWith("blob:") ||
        bg.startsWith("http")))

  return Boolean(
    (settings.effect && settings.effect !== "none") ||
    settings.gradientV2Active ||
    settings.svgWaveActive ||
    settings.silkActive ||
    settings.lightPillarActive ||
    settings.liquidEtherActive ||
    settings.splashCursorActive ||
    settings.m3AutoAccentFromBg ||
    isVideo ||
    isCustomBg,
  )
}

/**
 * Hides the startup overlay and reveals the main container.
 *
 * @param {object} opts
 * @param {boolean}  opts.skipStartupLoader   - whether user has skip-startup-loader mode
 * @param {number}   opts.bootStartedAt       - performance.now() at boot start
 * @param {number}   opts.minimumStartupLoaderMs - min time to show overlay
 * @param {object}   opts.currentSettings     - current app settings
 * @param {boolean}  opts.bookmarksLoaded     - true if bookmarks event already fired
 * @param {Promise}  opts.activeBackgroundLoad - promise for idb bg blob URL
 */
export function revealApp({
  skipStartupLoader,
  bootStartedAt,
  minimumStartupLoaderMs,
  currentSettings,
  bookmarksLoaded,
  activeBackgroundLoad,
}) {
  const mainContainer = document.querySelector(".main-container")
  let bookmarksReady =
    bookmarksLoaded ||
    (currentSettings.showBookmarks === false && currentSettings.showBookmarkGroups === false)
  let bgReady = false
  let isRevealed = false

  const hideOverlay = () => {
    if (isRevealed) return
    isRevealed = true
    const revealNow = () => {
      const overlay = document.getElementById("startup-overlay")
      if (overlay) overlay.style.opacity = "0"
      localStorage.setItem("startpageHasOpened", "1")
      localStorage.removeItem("startpageShowStartupLoader")
      document.body.classList.remove("loading-state")
      window.setTimeout(() => {
        if (overlay) overlay.classList.add("overlay-hidden")
        document.body.classList.remove("is-booting")
        requestAnimationFrame(() => {
          if (mainContainer) mainContainer.classList.add("ready")
        })
        window.dispatchEvent(new CustomEvent("startpage:appRevealed"))
      }, 430)
    }
    const elapsed = performance.now() - bootStartedAt
    const remaining = skipStartupLoader
      ? 0
      : Math.max(0, minimumStartupLoaderMs - elapsed)
    window.setTimeout(revealNow, remaining)
  }

  const checkAllReady = () => {
    if (bookmarksReady && bgReady) hideOverlay()
  }

  // Fast path: no startup loader
  if (skipStartupLoader) {
    requestAnimationFrame(() => {
      if (mainContainer) mainContainer.classList.add("ready")
      hideOverlay()
    })
    return
  }

  // 1. Wait for bookmarks
  let onBookmarksReady = null
  if (!bookmarksReady) {
    onBookmarksReady = () => {
      bookmarksReady = true
      checkAllReady()
      window.removeEventListener("bookmarksReady", onBookmarksReady)
    }
    window.addEventListener("bookmarksReady", onBookmarksReady)
  }

  // 2. Wait for background
  const background = currentSettings.background
  const isVideo =
    typeof background === "string" &&
    (background.startsWith("data:video") ||
      background.startsWith("idb-video-") ||
      background.startsWith("idb-gif-") ||
      /\.(mp4|webm|mov|ogg)(?:[?#].*)?$/i.test(background) ||
      background.includes("googlevideo"))

  const isImg =
    typeof background === "string" &&
    (background.startsWith("data:image") ||
      background.startsWith("blob:") ||
      background.match(/^https?:\/\//) ||
      background.startsWith("idb-img-") ||
      background.startsWith("idb-image-"))

  if (isImg) {
    const decodeBgImage = (url) => {
      const img = new Image()
      img.src = url
      const onDone = () => { bgReady = true; checkAllReady() }
      if (typeof img.decode === "function") {
        img.decode().then(onDone).catch(onDone)
      } else {
        img.onload = onDone
        img.onerror = onDone
      }
    }

    if (background.startsWith("idb-")) {
      activeBackgroundLoad.then((url) => {
        if (url) decodeBgImage(url)
        else { bgReady = true; checkAllReady() }
      })
    } else {
      decodeBgImage(background)
    }
  } else if (isVideo) {
    // For video: poll until ready but cap at 600ms to avoid blocking reveal
    let videoCheckCount = 0
    const maxVideoChecks = 60 // ~600ms at 10ms intervals
    const checkVideoStatus = () => {
      if (isRevealed) return
      const vid = document.getElementById("bg-video")
      if (
        (vid && vid.style.display === "block" && (vid.readyState >= 3 || vid.currentTime > 0)) ||
        videoCheckCount++ >= maxVideoChecks
      ) {
        bgReady = true
        checkAllReady()
      } else {
        setTimeout(checkVideoStatus, 10)
      }
    }
    setTimeout(checkVideoStatus, 30)
  } else if (needsSettingsAtBoot(currentSettings)) {
    const markBgReady = () => { bgReady = true; checkAllReady() }
    const waitForVisualPaint = () => {
      if (currentSettings.svgWaveActive) {
        requestAnimationFrame(() => requestAnimationFrame(markBgReady))
      } else {
        markBgReady()
      }
    }
    if (window.settingsInitialized) {
      waitForVisualPaint()
    } else {
      const onSettingsReady = () => {
        waitForVisualPaint()
        window.removeEventListener("startpage:settingsReady", onSettingsReady)
      }
      window.addEventListener("startpage:settingsReady", onSettingsReady)
    }
  } else {
    bgReady = true
    checkAllReady()
  }

  // Safety timeout — never block longer than 800ms (down from 1500ms)
  // The goal is for most users to see the page within ~650ms total boot time.
  setTimeout(() => {
    if (!isRevealed) {
      if (onBookmarksReady) window.removeEventListener("bookmarksReady", onBookmarksReady)
      hideOverlay()
    }
  }, 800)
}

/**
 * Instantly hide overlay for skip-startup-loader mode (called synchronously
 * right after language init so there is no perceived delay).
 */
export function fastRevealSkipStartup(skipStartupLoader) {
  if (!skipStartupLoader) return
  const overlay = document.getElementById("startup-overlay")
  if (overlay) {
    overlay.style.opacity = "0"
    setTimeout(() => overlay.classList.add("overlay-hidden"), 450)
  }
  try {
    localStorage.setItem("startpageHasOpened", "1")
    localStorage.removeItem("startpageShowStartupLoader")
  } catch {}
  document.body.classList.remove("loading-state")
  requestAnimationFrame(() => {
    document.body.classList.remove("is-booting")
    document.querySelector(".main-container")?.classList.add("ready")
  })
}
