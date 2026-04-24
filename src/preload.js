;(function () {
  try {
    let settings = null
    const raw = localStorage.getItem("pageSettings")
    if (raw) {
      settings = JSON.parse(raw)
    }

    if (settings) {
      const body = document.body

      // FAST BOOT LAYOUT CLASSES
      let layout = settings.bookmarkLayout || "default"
      if (settings.bookmarkSidebarMode === true && layout === "default") {
        layout = "sidebar"
      }
      if (layout === "sidebar-left") layout = "sidebar"

      if (layout === "sidebar") body.classList.add("bookmark-sidebar-mode")
      else if (layout === "taskbar") body.classList.add("bookmark-taskbar-mode")
      else if (layout === "taskbar-top")
        body.classList.add("bookmark-taskbar-top-mode")
      else if (layout === "taskbar-left")
        body.classList.add("bookmark-taskbar-left-mode")

      if (settings.flipLayout) body.classList.add("flip-layout")
      if (settings.hideBookmarkText) body.classList.add("hide-bookmark-text")
      if (settings.hideBookmarkBg) body.classList.add("hide-bookmark-bg")
      if (settings.showTopRightControls !== false) body.classList.add("has-top-right-controls")

      let bgStyle = settings.bookmarkLayoutBgStyle || "default"
      if (bgStyle === "hidden") body.classList.add("bookmark-layout-bg-hidden")
      else if (bgStyle === "white") body.classList.add("bookmark-layout-bg-white")
      else if (bgStyle === "colored") {
        body.classList.add("bookmark-layout-bg-colored")
        document.documentElement.style.setProperty(
          "--bookmark-layout-bg-color",
          settings.bookmarkLayoutBgColor || "rgba(0,0,0,0.5)",
        )
      }

      if (settings.bookmarkItemStyle === "card") {
        body.classList.add("bookmark-item-card-style")
      }

      const dateClockStyle = settings.dateClockStyle || "default"
      body.classList.add(`date-clock-style-${dateClockStyle}`)

      const styleEl = document.createElement("style")
      let css = ""

      // Prevent CLS by applying widths and display nones immediately
      const searchBarWidth = settings.searchBarWidth || 600
      css += `:root { --search-bar-width: ${searchBarWidth}px; }\n`

      if (settings.showSearchBar === false) {
        css += `#search-container { display: none !important; }\n`
      }
      if (settings.showBookmarks === false) {
        css += `#bookmarks-container { display: none !important; }\n`
      }
      if (settings.showBookmarkGroups === false) {
        css += `#bookmark-groups-container { display: none !important; }\n`
      }
      if (settings.showSearchAIIcon === false) {
        css += `#search-ai-btn { display: none !important; }\n`
      }
      if (settings.showTopRightControls === false) {
        css += `#top-right-controls { display: none !important; }\n`
      }
      if (settings.showCustomTitle === false) {
        css += `#custom-title-display { display: none !important; }\n`
      }

      document.head.appendChild(styleEl)
      styleEl.textContent = css
    }
  } catch (e) {
    console.error("Preload execution error:", e)
  }
})()
