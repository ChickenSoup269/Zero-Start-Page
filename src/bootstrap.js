async function hydrateSettingsPartials() {
  const placeholders = document.querySelectorAll(
    "[data-settings-partial][data-src]",
  )
  await Promise.all(
    [...placeholders].map(async (placeholder) => {
      const src = placeholder.getAttribute("data-src")
      if (!src) return

      try {
        const isExtension = typeof chrome !== "undefined" && chrome.runtime?.id
        const fetchOpts = isExtension ? {} : { cache: "no-store" }
        let response
        try {
          response = await fetch(src, fetchOpts)
        } catch (fetchErr) {
          response = await fetch(src)
        }
        if (!response.ok) throw new Error(`Failed to load ${src}`)
        placeholder.outerHTML = await response.text()
      } catch (error) {
        console.error("Could not hydrate settings partial:", error)
      }
    }),
  )
}

function afterFirstPaint(callback) {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback)
  })
}

function runWhenIdle(callback) {
  if ("requestIdleCallback" in window) {
    // Reduced from 1200ms → 600ms: settings partials should init faster
    window.requestIdleCallback(callback, { timeout: 600 })
  } else {
    setTimeout(callback, 100)
  }
}

function needsSettingsAtBoot() {
  try {
    const isFirstRun =
      !localStorage.getItem("startpageFirstRunSvgBgV1") &&
      !localStorage.getItem("pageSettings")
    const isFirstRunOnboardingPending =
      localStorage.getItem("startpageFirstRunSvgBgV1") === "applied" &&
      localStorage.getItem("startpageFirstRunOnboardingDoneV1") !== "1"
    if (isFirstRun || isFirstRunOnboardingPending) return true

    const settingsStr = localStorage.getItem("pageSettings")
    if (!settingsStr) return false
    const settings = JSON.parse(settingsStr)
    const bg = settings.background
    const isVideo =
      typeof bg === "string" &&
      (bg.startsWith("data:video") ||
        bg.startsWith("idb-gif-") ||
        /\.(mp4|webm|mov|ogg)(?:[?#].*)?$/i.test(bg) ||
        bg.includes("googlevideo"))

    const isCustomBg =
      typeof bg === "string" &&
      (bg.startsWith("idb-") ||
        bg.startsWith("data:") ||
        bg.startsWith("blob:") ||
        bg.startsWith("http"))

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
  } catch (e) {
    return false
  }
}

let resolveSettingsPartialsReady
window.startpageSettingsPartialsReady = new Promise((resolve) => {
  resolveSettingsPartialsReady = resolve
})

const hydrateSettingsPartialsWhenVisible = () => {
  const hydrate = () => {
    hydrateSettingsPartials().finally(() => {
      resolveSettingsPartialsReady()
      window.dispatchEvent(new CustomEvent("startpage:settingsPartialsReady"))
    })
  }

  if (needsSettingsAtBoot()) {
    afterFirstPaint(hydrate)
  } else {
    // Non-critical path: defer hydration until truly idle (max 600ms)
    afterFirstPaint(() => runWhenIdle(hydrate))
  }
}

// Start both in parallel — main.js will bootstrap while partials hydrate
// Version bumped to boot-split-v1 to invalidate old module cache after refactor
const mainModulePromise = import("./main.js?v=boot-split-v1")
hydrateSettingsPartialsWhenVisible()
await mainModulePromise
