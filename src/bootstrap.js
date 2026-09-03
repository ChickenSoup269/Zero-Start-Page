async function hydrateSettingsPartials() {
  const placeholders = Array.from(
    document.querySelectorAll("[data-settings-partial][data-src]"),
  )
  if (!placeholders.length) return

  let activeTab = "appearance"
  try {
    activeTab =
      localStorage.getItem("startpage_settings_active_tab") || "appearance"
  } catch (e) {}

  // Prioritize active tab partials and common partials (footer, layout controls)
  const isHighPriority = (el) => {
    const tab = el.getAttribute("data-settings-tab")
    const partial = el.getAttribute("data-settings-partial")
    return (
      !tab ||
      tab === activeTab ||
      partial === "sidebar-footer" ||
      partial === "layout-controls-popup"
    )
  }

  const highPriorityPlaceholders = placeholders.filter(isHighPriority)
  const lowPriorityPlaceholders = placeholders.filter(
    (el) => !isHighPriority(el),
  )

  const loadPlaceholder = async (placeholder) => {
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
  }

  // 1. Hydrate active tab first so visible content is ready immediately
  await Promise.all(highPriorityPlaceholders.map(loadPlaceholder))

  // 2. Hydrate remaining partials
  if (lowPriorityPlaceholders.length) {
    await Promise.all(lowPriorityPlaceholders.map(loadPlaceholder))
  }
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
      settings.m3AutoAccentFromMusic ||
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
    // Non-critical path: defer hydration until truly idle (max 400ms)
    afterFirstPaint(() => runWhenIdle(hydrate))

    // If user clicks or hovers the settings button before idle fires, hydrate immediately!
    const triggerHydrateEarly = () => {
      hydrate()
    }
    const settingsBtn =
      document.getElementById("settings-toggle") ||
      document.getElementById("settings-btn")
    if (settingsBtn) {
      settingsBtn.addEventListener("mouseenter", triggerHydrateEarly, {
        once: true,
        passive: true,
      })
      settingsBtn.addEventListener("click", triggerHydrateEarly, {
        once: true,
        passive: true,
      })
    }
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "s" || e.key === "S") {
          triggerHydrateEarly()
        }
      },
      { once: true, passive: true },
    )
  }
}

// Start both in parallel — main.js will bootstrap while partials hydrate
// Version bumped to boot-split-v1 to invalidate old module cache after refactor
const mainModulePromise = import("./main.js?v=boot-split-v1")
hydrateSettingsPartialsWhenVisible()
await mainModulePromise
