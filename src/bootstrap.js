async function hydrateSettingsPartials() {
  const placeholders = document.querySelectorAll("[data-settings-partial][data-src]")
  await Promise.all([...placeholders].map(async (placeholder) => {
    const src = placeholder.getAttribute("data-src")
    if (!src) return

    try {
      const response = await fetch(src, { cache: "no-store" })
      if (!response.ok) throw new Error(`Failed to load ${src}`)
      placeholder.outerHTML = await response.text()
    } catch (error) {
      console.error("Could not hydrate settings partial:", error)
    }
  }))
}

function afterFirstPaint(callback) {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback)
  })
}

function runWhenIdle(callback) {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout: 1200 })
  } else {
    setTimeout(callback, 150)
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

  afterFirstPaint(() => runWhenIdle(hydrate))
}

const mainModulePromise = import("./main.js?v=perf-lazy-v12")
hydrateSettingsPartialsWhenVisible()
await mainModulePromise
