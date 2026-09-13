/**
 * Background & Video Layout Helpers
 * Extracted from settingsApplier.js
 */

import { isIdbVideo } from "../../services/imageStore.js"

let _activeVideoCleanup = null
let _bgFadeTimer = null

export const cssUrl = (value) => {
  if (!value || value === "none") return "none"
  return `url(${JSON.stringify(String(value))})`
}

export function getBackgroundLayoutValues(settings) {
  const fit = settings.bgSize || "cover"
  const scale = Math.min(
    250,
    Math.max(25, Number(settings.bgImageScale) || 100),
  )

  switch (fit) {
    case "custom":
      return { size: `${scale}%`, repeat: "no-repeat" }
    case "stretch":
      return { size: "100% 100%", repeat: "no-repeat" }
    case "tile":
      return { size: "auto", repeat: "repeat" }
    case "center":
      return { size: "auto", repeat: "no-repeat" }
    case "span":
      return { size: "cover", repeat: "no-repeat" }
    default:
      return { size: fit, repeat: "no-repeat" }
  }
}

export const getBackgroundSizeValue = (settings) =>
  getBackgroundLayoutValues(settings).size

export const getBackgroundRepeatValue = (settings) =>
  getBackgroundLayoutValues(settings).repeat

export function applyBackgroundVideoLayout(video, settings) {
  if (!video) return
  const fit = settings.bgSize || "cover"
  const scale = Math.min(
    250,
    Math.max(25, Number(settings.bgImageScale) || 100),
  )
  const x = settings.bgPositionX ?? 50
  const y = settings.bgPositionY ?? 50

  video.style.objectPosition = `${x}% ${y}%`
  video.style.objectFit =
    fit === "contain" || fit === "tile"
      ? "contain"
      : fit === "stretch"
        ? "fill"
        : fit === "center"
          ? "none"
          : "cover"
  video.style.transform =
    fit === "custom" ? `translateZ(0) scale(${scale / 100})` : "translateZ(0)"
}

export function configureBackgroundVideo(video, settings) {
  if (!video) return
  const quality = settings.backgroundMediaQuality || "balanced"
  video.preload = quality === "quality" ? "auto" : "metadata"
  video.disableRemotePlayback = true
  video.playbackRate = quality === "low" || quality === "tiny" ? 0.85 : 1

  const shouldFreeze = quality === "still"
  const freezeVideo = () => {
    if (!shouldFreeze || video.style.display !== "block") return
    const seekTo = Math.min(
      0.2,
      Number.isFinite(video.duration) ? video.duration / 10 : 0.2,
    )
    if (Number.isFinite(seekTo) && seekTo > 0 && video.currentTime < 0.05) {
      try {
        video.currentTime = seekTo
      } catch {
        // Some blob/video formats reject early seeks before metadata settles.
      }
    }
    video.pause()
  }

  video.onloadeddata = freezeVideo
  video.oncanplay = freezeVideo
  if (shouldFreeze) {
    freezeVideo()
  } else if (video.paused && video.style.display === "block") {
    video.play().catch(() => {})
  }
}

export function isVideoBackgroundValue(value) {
  return (
    typeof value === "string" &&
    (value.startsWith("data:video") ||
      isIdbVideo(value) ||
      /\.(mp4|webm|mov|ogg)(?:[?#].*)?$/i.test(value) ||
      value.includes("googlevideo"))
  )
}

export function clearBackgroundVideo(video) {
  if (_activeVideoCleanup) {
    _activeVideoCleanup()
    _activeVideoCleanup = null
  }
  if (!video) return
  video.pause()
  video.style.display = "none"
  video.style.opacity = "0"
  if (video.getAttribute("src")) {
    video.removeAttribute("src")
    video.load()
  }
}

export function attachVideoReadyListener(videoElement, onReady) {
  if (_activeVideoCleanup) {
    _activeVideoCleanup()
    _activeVideoCleanup = null
  }
  if (!videoElement) return
  const handler = () => {
    if (_activeVideoCleanup) {
      _activeVideoCleanup()
      _activeVideoCleanup = null
    }
    onReady()
  }
  videoElement.addEventListener("playing", handler, { once: true })
  videoElement.addEventListener("canplay", handler, { once: true })
  _activeVideoCleanup = () => {
    videoElement.removeEventListener("playing", handler)
    videoElement.removeEventListener("canplay", handler)
  }
}

