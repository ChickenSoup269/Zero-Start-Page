import { getBookmarkGroups, getActiveGroupId } from "../../services/state.js"
import { createStoredIconElement, getGroupIcon } from "../bookmarks.js"

// Rendered synchronously on purpose: bookmarkGroupsChanged fires only on
// explicit user actions, and rAF is throttled in some embedding contexts.
export function renderBookmarkPreviewData() {
  const stage = document.getElementById("bookmark-preview-stage")
  const empty = document.getElementById("bookmark-preview-empty")
  if (!stage) return

  const groups = getBookmarkGroups() || []
  const hasGroups = groups.length > 0

  if (empty) empty.hidden = hasGroups
  stage.style.display = hasGroups ? "" : "none"
  if (!hasGroups) return

  const activeId = getActiveGroupId()
  const group =
    groups.find((g) => g.id === activeId) || groups[0]

  renderFolderPreview(group, groups)
  renderBookmarkPreview(group, groups)
}

function renderFolderPreview(group, groups) {
  const tabText = document.getElementById("bookmark-preview-tab-text")
  const tabCount = document.getElementById("bookmark-preview-tab-count")
  const tabIconWrap = document.getElementById(
    "bookmark-preview-tab-icon-wrap",
  )
  if (!tabText && !tabCount && !tabIconWrap) return

  const count = Array.isArray(group.items) ? group.items.length : 0
  if (tabText) tabText.textContent = group.name || "…"
  if (tabCount) tabCount.textContent = String(count)

  if (tabIconWrap) {
    if (group.iconColor) {
      tabIconWrap.style.setProperty(
        "--bookmark-group-icon-color",
        group.iconColor,
      )
    } else {
      tabIconWrap.style.removeProperty("--bookmark-group-icon-color")
    }
    if (group.icon) {
      const icon = createStoredIconElement(group.icon, group.name)
      icon.className = `${icon.className} group-tab-icon custom-group-tab-icon`
      tabIconWrap.replaceChildren(icon)
    } else {
      const icon = document.createElement("i")
      icon.className = `fa-solid ${getGroupIcon(group.name)} group-tab-icon`
      tabIconWrap.replaceChildren(icon)
    }
  }
}

function renderBookmarkPreview(group, groups) {
  let item = Array.isArray(group.items) ? group.items[0] : null
  if (!item) {
    const withItems = groups.find(
      (g) => Array.isArray(g.items) && g.items.length > 0,
    )
    if (withItems) item = withItems.items[0]
  }

  const iconBox = document.getElementById("bookmark-preview-icon-box")
  const title = document.getElementById("bookmark-preview-title")
  if (!iconBox && !title) return

  if (iconBox) {
    if (item && item.type === "stack") {
      const icon = document.createElement("i")
      icon.className = "fa-solid fa-folder-tree"
      iconBox.replaceChildren(icon)
    } else if (item) {
      iconBox.replaceChildren(createStoredIconElement(item.icon, item.title))
    } else {
      const icon = document.createElement("i")
      icon.className = "fa-regular fa-folder-open"
      iconBox.replaceChildren(icon)
    }
  }
  if (title) title.textContent = item ? item.title || "…" : "—"
}
