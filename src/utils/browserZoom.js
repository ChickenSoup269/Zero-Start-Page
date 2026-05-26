export function normalizeBrowserZoom(value) {
  const zoom = Number(value)
  if (!Number.isFinite(zoom)) return 1
  return Math.min(1, Math.max(0.75, zoom))
}

export function formatBrowserZoom(value) {
  return `${Math.round(normalizeBrowserZoom(value) * 100)}%`
}

export function applyBrowserZoom(value) {
  const zoom = normalizeBrowserZoom(value)
  document.documentElement.style.setProperty("--browser-zoom", String(zoom))

  const useCssFallback = () => {
    if (!document.body) return
    document.body.classList.add("browser-zoom-css-fallback")
    document.body.style.zoom = zoom === 1 ? "" : String(zoom)
  }

  const chromeTabs = globalThis.chrome?.tabs
  if (!chromeTabs?.setZoom) {
    useCssFallback()
    return
  }

  const clearCssFallback = () => {
    if (!document.body) return
    document.body.classList.remove("browser-zoom-css-fallback")
    document.body.style.zoom = ""
  }

  const setZoom = (tabId) => {
    try {
      const callback = () => {
        if (globalThis.chrome?.runtime?.lastError) {
          useCssFallback()
        } else {
          clearCssFallback()
        }
      }
      if (Number.isInteger(tabId)) {
        chromeTabs.setZoom(tabId, zoom, callback)
      } else {
        chromeTabs.setZoom(zoom, callback)
      }
    } catch {
      useCssFallback()
    }
  }

  if (chromeTabs.getCurrent) {
    try {
      chromeTabs.getCurrent((tab) => {
        if (globalThis.chrome?.runtime?.lastError) {
          setZoom(null)
          return
        }
        setZoom(tab?.id)
      })
      return
    } catch {
      // Fall through to active-tab zoom below.
    }
  }

  setZoom(null)
}
