/**
 * boot/bootClasses.js
 * Applies body/root CSS classes based on saved settings at boot time.
 * Must run synchronously before first paint to avoid layout shifts.
 */
import { getContrastYIQ } from "../utils/colors.js"

export function applyBootBodyClasses(settings) {
  const body = document.body
  const root = document.documentElement

  // ── Layout Preset ───────────────────────────────────────
  body.setAttribute("data-layout-preset", settings.layoutPreset || "default")

  // ── Bookmark Layout ─────────────────────────────────────
  let layout = settings.bookmarkLayout || "default"
  if (settings.bookmarkSidebarMode === true && layout === "default")
    layout = "sidebar"
  if (layout === "sidebar-left") layout = "sidebar"

  if (layout === "sidebar") body.classList.add("bookmark-sidebar-mode")
  else if (layout === "taskbar") body.classList.add("bookmark-taskbar-mode")
  else if (layout === "taskbar-top")
    body.classList.add("bookmark-taskbar-top-mode")
  else if (layout === "taskbar-left")
    body.classList.add("bookmark-taskbar-left-mode")
  else if (layout === "taskbar-right")
    body.classList.add("bookmark-taskbar-right-mode")

  if (settings.flipLayout) body.classList.add("flip-layout")
  if (settings.allowTextSelection === true)
    body.classList.add("allow-text-selection")
  if (settings.bookmarkGroupShowCount === false)
    body.classList.add("bookmark-group-count-hidden")
  if (settings.bookmarkGroupAutoTextContrast === true)
    body.classList.add("bookmark-group-auto-text-contrast")
  if (settings.hideBookmarkText) body.classList.add("hide-bookmark-text")
  if (settings.bookmarkLongText) body.classList.add("bookmark-long-text")
  if (settings.bookmarkFullText) body.classList.add("bookmark-full-text")
  if (settings.hideBookmarkBg) body.classList.add("hide-bookmark-bg")
  if (settings.bookmarkGroupUseAccent === true)
    body.classList.add("bookmark-group-accent-enabled")
  if (settings.bookmarkGroupKeepBgOnInteraction !== false)
    body.classList.add("bookmark-group-keep-bg-on-interaction")
  if ((settings.bookmarkGroupBgOpacity ?? 0) <= 0)
    body.classList.add("bookmark-group-tab-bg-transparent")
  if (settings.bookmarkGroupContainerBgHidden === true)
    body.classList.add("bookmark-group-container-bg-hidden")
  if (settings.bookmarkGroupBorderHidden === true)
    body.classList.add("bookmark-group-border-hidden")
  body.classList.add("auto-hide-groups-toggle")

  if (settings.showTopRightControls !== false)
    body.classList.add("has-top-right-controls")
  else body.classList.add("hide-top-right-controls")

  if (settings.freeMoveSearchBar === true)
    body.classList.add("free-move-search-bar")
  if (settings.bookmarkItemStyle === "card")
    body.classList.add("bookmark-item-card-style")

  // ── Bookmark Layout Background Style ─────────────────────
  let bgStyle = settings.bookmarkLayoutBgStyle || "default"
  if (bgStyle === "hidden") body.classList.add("bookmark-layout-bg-hidden")
  else if (bgStyle === "white") {
    body.classList.add("bookmark-layout-bg-white")
    root.style.setProperty(
      "--bookmark-layout-bg-color",
      "rgba(255, 255, 255, 0.85)",
    )
    root.style.setProperty("--bookmark-layout-text-color", "#1e293b")
  } else if (bgStyle === "m3-accent") {
    body.classList.add("bookmark-layout-bg-m3-accent")
  } else if (bgStyle === "colored") {
    body.classList.add("bookmark-layout-bg-colored")
    const bgColor = settings.bookmarkLayoutBgColor || "rgba(0,0,0,0.5)"
    root.style.setProperty("--bookmark-layout-bg-color", bgColor)
    const textCol = getContrastYIQ(bgColor) === "black" ? "#1e293b" : "#ffffff"
    root.style.setProperty("--bookmark-layout-text-color", textCol)
  }

  // ── Clock / Date Styles ──────────────────────────────────
  const dateClockStyle = settings.dateClockStyle || "default"
  body.classList.add(`date-clock-style-${dateClockStyle}`)

  const clockStyleBackground = settings.clockStyleTransparentBackground
    ? "transparent"
    : settings.clockStyleBackground || "default"

  if (clockStyleBackground === "transparent")
    body.classList.add("clock-style-transparent-bg")
  else if (clockStyleBackground === "accent")
    body.classList.add("clock-style-bg-accent")
  else if (clockStyleBackground === "custom") {
    body.classList.add("clock-style-bg-custom")
    root.style.setProperty(
      "--clock-style-custom-bg-color",
      /^#[0-9a-f]{6}$/i.test(settings.clockStyleCustomBgColor || "")
        ? settings.clockStyleCustomBgColor
        : "#1f2937",
    )
  } else if (clockStyleBackground === "light")
    body.classList.add("clock-style-bg-light")
  else if (clockStyleBackground === "dark")
    body.classList.add("clock-style-bg-dark")
  else if (
    clockStyleBackground === "animated" &&
    dateClockStyle === "prism-stack"
  ) {
    body.classList.add("clock-style-bg-animated")
  }

  if (
    dateClockStyle === "cartoon" &&
    settings.cartoonClockAnimation === false
  ) {
    body.classList.add("cartoon-clock-animation-off")
  }

  const fliqloTheme = settings.fliqloTheme || "dark"
  body.classList.add(`fliqlo-theme-${fliqloTheme}`)
  if (settings.fliqloZenMode) body.classList.add("fliqlo-zen-mode")
  if (settings.globalZenMode) body.classList.add("zen-mode-global")
  if (settings.fliqloTransparent) body.classList.add("fliqlo-transparent")

  // ── Search Bar ───────────────────────────────────────────
  const searchContainer = document.getElementById("search-container")
  if (searchContainer) {
    searchContainer.style.display =
      settings.showSearchBar !== false ? "" : "none"
  }
  const searchAiBtn = document.getElementById("search-ai-btn")
  if (searchAiBtn) {
    searchAiBtn.style.display =
      settings.showSearchAIIcon !== false ? "flex" : "none"
  }
  root.style.setProperty(
    "--search-bar-width",
    `${settings.searchBarWidth || 750}px`,
  )
  root.style.setProperty(
    "--search-bar-blur",
    `${settings.searchBarBlur ?? 20}px`,
  )
  root.style.setProperty(
    "--search-bar-radius",
    `${settings.searchBarRadius ?? 20}px`,
  )

  // ── Bookmarks Container visibility ───────────────────────
  const bookmarksContainer = document.getElementById("bookmarks-container")
  if (bookmarksContainer) {
    bookmarksContainer.style.display =
      settings.showBookmarks !== false ? "" : "none"
  }
  const bookmarkGroupsContainer = document.getElementById(
    "bookmark-groups-container",
  )
  if (bookmarkGroupsContainer) {
    bookmarkGroupsContainer.style.display =
      settings.showBookmarkGroups !== false ? "" : "none"
  }
}
