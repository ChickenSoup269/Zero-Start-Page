async function hydrateSettingsPartials() {
  const placeholders = document.querySelectorAll("[data-settings-partial][data-src]")
  for (const placeholder of placeholders) {
    const src = placeholder.getAttribute("data-src")
    if (!src) continue

    try {
      const response = await fetch(src)
      if (!response.ok) throw new Error(`Failed to load ${src}`)
      placeholder.outerHTML = await response.text()
    } catch (error) {
      console.error("Could not hydrate settings partial:", error)
    }
  }
}

await hydrateSettingsPartials()
await import("./main.js")
