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

await hydrateSettingsPartials()
await import("./main.js?v=perf-lazy-v8")
