import {
  bookmarksContainer,
  bookmarkGroupsContainer,
  bookmarkGroupsToggle,
} from "../utils/dom.js"
import {
  showPrompt,
  showAlert,
  showConfirm,
  showChoiceConfirm,
} from "../utils/dialog.js"
import {
  getBookmarks as getRootBookmarks,
  setBookmarks as setRootBookmarks,
  saveBookmarks,
  getBookmarkState,
  getBookmarkGroups,
  setBookmarkGroups,
  getActiveGroupId,
  setActiveGroupId,
  getSettings,
  updateSetting,
  saveSettings,
} from "../services/state.js"

export let currentFolderStack = [];

export function getBookmarks() {
  let items = getRootBookmarks();
  for (const folder of currentFolderStack) {
    const found = items.find(item => item.id === folder.id);
    if (found && found.items) {
      items = found.items;
    } else {
      currentFolderStack = [];
      return getRootBookmarks();
    }
  }
  return items;
}

export function setBookmarks(newItems) {
  if (currentFolderStack.length === 0) {
    setRootBookmarks(newItems);
    return;
  }
  let items = getRootBookmarks();
  let parent = null;
  for (const folder of currentFolderStack) {
    const found = items.find(item => item.id === folder.id);
    if (!found) return;
    parent = found;
    items = found.items;
  }
  if (parent) {
    parent.items = newItems;
  }
}

import { geti18n } from "../services/i18n.js"
import {
  openBookmarkEditPopover,
  openBookmarkGroupEditPopover,
  openBookmarkStackEditPopover,
  openModal,
} from "./modal.js"
import { showContextMenu } from "./contextMenu.js"

let bookmarkOpenBehaviorPromptPending = false
let pendingGroupTabActiveAnimation = null
let pendingFolderBookmarkReveal = false

function applyBookmarkLinkBehavior(link, url) {
  const settings = getSettings()
  link.href = url

  if (settings.bookmarkOpenInNewTab === true) {
    link.target = "_blank"
    link.rel = "noopener noreferrer"
  } else {
    link.removeAttribute("target")
    link.removeAttribute("rel")
  }
}

async function promptBookmarkOpenBehaviorOnClick(event, url) {
  const settings = getSettings()
  if (settings.bookmarkOpenBehaviorClickPromptSeen === true) return false
  if (bookmarkOpenBehaviorPromptPending) {
    event.preventDefault()
    return true
  }

  event.preventDefault()
  bookmarkOpenBehaviorPromptPending = true

  const i18n = geti18n()
  const choice = await showChoiceConfirm(
    [
      {
        key: "current",
        icon: "fa-solid fa-arrow-up-right-from-square",
        label: i18n.bookmark_open_behavior_current_choice || "Open in this tab",
        description:
          i18n.bookmark_open_behavior_current_desc ||
          "Clicking a bookmark replaces the Start Page in the current tab.",
      },
      {
        key: "new",
        icon: "fa-solid fa-up-right-from-square",
        label: i18n.bookmark_open_behavior_new_choice || "Open a new tab",
        description:
          i18n.bookmark_open_behavior_new_desc ||
          "Keep the Start Page open and launch bookmarks beside it.",
      },
    ],
    i18n.bookmark_open_behavior_title || "Bookmark opening behavior",
    i18n.bookmark_open_behavior_message ||
      "Choose how bookmark links should open. You can switch this anytime in Settings > Custom Bookmark > Layout & Behavior.",
  )

  bookmarkOpenBehaviorPromptPending = false
  if (!choice) return true

  const openInNewTab = choice === "new"
  updateSetting("bookmarkOpenInNewTab", openInNewTab)
  updateSetting("bookmarkOpenBehaviorClickPromptSeen", true)
  updateSetting("bookmarkOpenBehaviorPromptSeen", true)
  saveSettings(true)
  renderBookmarks()

  if (openInNewTab) {
    window.open(url, "_blank", "noopener,noreferrer")
  } else {
    window.location.href = url
  }
  return true
}

function getHostname(url) {
  try {
    return new URL(url).hostname
  } catch {
    return ""
  }
}

const ICON_CACHE_KEY = "bookmark_icon_cache"
let iconCache
try {
  iconCache = new Map(JSON.parse(localStorage.getItem(ICON_CACHE_KEY)) || [])
} catch {
  iconCache = new Map()
}

function saveIconCache() {
  try {
    localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(Array.from(iconCache.entries())))
  } catch (e) {
    console.warn("Failed to save icon cache:", e)
  }
}

let bookmarkUndoTimeout = null

export function invalidateBookmarkIconCache(url = null) {
  if (url) {
    iconCache.delete(url)
  } else {
    iconCache.clear()
  }
  saveIconCache()
}

// --- Selection State ---
let isSelectionMode = false
let selectedIndices = new Set()
let isStackSelectionMode = false
let selectedStackIndices = new Set()
let activeStackIndex = null

export function captureBookmarkSnapshot() {
  return JSON.parse(JSON.stringify(getBookmarkState()))
}

function restoreBookmarkSnapshot(snapshot) {
  if (!snapshot?.groups) return
  setBookmarkGroups(snapshot.groups)
  setActiveGroupId(snapshot.activeGroupId || snapshot.groups[0]?.id)
  saveBookmarks()
  selectedIndices.clear()
  isSelectionMode = false
  document.getElementById("hidden-bookmarks-popup")?.remove()
  document.getElementById("bookmark-stack-popup")?.remove()
  renderBookmarks()
}

export function showBookmarkUndo(message, snapshot) {
  if (!snapshot) return
  const i18n = geti18n()
  let toast = document.getElementById("bookmark-undo-toast")
  if (!toast) {
    toast = document.createElement("div")
    toast.id = "bookmark-undo-toast"
    toast.className = "bookmark-undo-toast"
    document.body.appendChild(toast)
  }

  toast.innerHTML = ""
  const text = document.createElement("span")
  text.textContent = message
  const undoBtn = document.createElement("button")
  undoBtn.type = "button"
  undoBtn.textContent = i18n.bookmark_undo || "Undo"
  undoBtn.addEventListener("click", () => {
    if (bookmarkUndoTimeout) clearTimeout(bookmarkUndoTimeout)
    restoreBookmarkSnapshot(snapshot)
    toast.classList.remove("show")
  })

  toast.appendChild(text)
  toast.appendChild(undoBtn)
  requestAnimationFrame(() => toast.classList.add("show"))

  if (bookmarkUndoTimeout) clearTimeout(bookmarkUndoTimeout)
  bookmarkUndoTimeout = setTimeout(() => {
    toast.classList.remove("show")
  }, 5200)
}

export function toggleSelectionMode(initialIndex = -1) {
  isSelectionMode = true
  selectedIndices.clear()
  if (initialIndex !== -1) {
    selectedIndices.add(initialIndex)
  }
  renderBookmarks()
  updateSelectionUI()

  // Auto-open hidden popup if it exists
  setTimeout(() => {
    const indicator = document.querySelector(".overflow-indicator")
    if (indicator && !document.getElementById("hidden-bookmarks-popup")) {
      indicator.click()
    }
  }, 100)
}

function cancelSelection() {
  isSelectionMode = false
  selectedIndices.clear()
  renderBookmarks()
  updateSelectionUI()

  // Auto-close hidden popup
  const popup = document.getElementById("hidden-bookmarks-popup")
  if (popup) popup.remove()
}

async function deleteSelected() {
  if (selectedIndices.size === 0) return

  const i18n = geti18n()
  const confirmed = await showConfirm(
    (
      i18n.bookmark_delete_selected_confirm ||
      "Delete {count} selected bookmarks?"
    ).replace("{count}", selectedIndices.size),
  )

  if (confirmed) {
    const snapshot = captureBookmarkSnapshot()
    const bookmarks = getBookmarks()
    const sortedIndices = Array.from(selectedIndices).sort((a, b) => b - a)
    sortedIndices.forEach((index) => {
      bookmarks.splice(index, 1)
    })
    setBookmarks(bookmarks)
    saveBookmarks()
    cancelSelection()
    showBookmarkUndo(
      (i18n.bookmark_deleted_many || "Deleted {count} bookmarks").replace(
        "{count}",
        sortedIndices.length,
      ),
      snapshot,
    )
  }
}

function updateSelectionUI() {
  const toolbar = document.getElementById("bookmark-selection-toolbar")
  const countEl = document.getElementById("selection-count")
  const scopeEl = document.getElementById("selection-scope")

  if (!toolbar || !countEl) return

  if (isSelectionMode) {
    toolbar.style.display = "flex"
    countEl.textContent = selectedIndices.size
    if (scopeEl) {
      const activeGroup = getBookmarkGroups().find(
        (group) => group.id === getActiveGroupId(),
      )
      scopeEl.textContent = activeGroup ? activeGroup.name : ""
    }
  } else {
    toolbar.style.display = "none"
  }
}

function loadImage(src, timeout = 2500) {
  return new Promise((resolve) => {
    const img = new Image()
    let done = false

    const finish = (result) => {
      if (!done) {
        done = true
        resolve(result)
      }
    }

    img.onload = () => {
      finish({
        src,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }

    img.onerror = () => finish(null)

    setTimeout(() => finish(null), timeout)

    img.src = src
  })
}

function getIconCandidates(bookmark) {
  const hostname = getHostname(bookmark.url)
  const list = []

  if (bookmark.icon) list.push(bookmark.icon)

  if (bookmark.url.startsWith("chrome-extension://") || bookmark.url.startsWith("extension://")) {
    const res = getSettings().bookmarkFaviconRes ?? 128
    list.push(`chrome://extension-icon/${hostname}/${res}/1`)
    list.push(`edge://extension-icon/${hostname}/${res}/1`)
  } else if (hostname) {
    const res = getSettings().bookmarkFaviconRes ?? 128
    // Prioritize Google (fastest, most reliable, supports high-res sz)
    list.push(`https://www.google.com/s2/favicons?domain=${hostname}&sz=${res}`)
    // Fallback to DuckDuckGo
    list.push(`https://icons.duckduckgo.com/ip3/${hostname}.ico`)
  }

  return list
}

async function getExtensionManifestIcon(url) {
  try {
    const urlObj = new URL(url)
    if (!urlObj.protocol.includes("extension:")) return null

    const manifestUrl = `${urlObj.protocol}//${urlObj.hostname}/manifest.json`
    const response = await fetch(manifestUrl, { cache: "force-cache" })
    if (!response.ok) return null
    const manifest = await response.json()

    let iconPath = null

    if (manifest.icons) {
      iconPath =
        manifest.icons["128"] ||
        manifest.icons["48"] ||
        manifest.icons["64"] ||
        manifest.icons["16"] ||
        Object.values(manifest.icons)[0]
    }

    if (!iconPath && manifest.action && manifest.action.default_icon) {
      const icons = manifest.action.default_icon
      if (typeof icons === "string") iconPath = icons
      else
        iconPath =
          icons["128"] || icons["48"] || icons["16"] || Object.values(icons)[0]
    }

    if (
      !iconPath &&
      manifest.browser_action &&
      manifest.browser_action.default_icon
    ) {
      const icons = manifest.browser_action.default_icon
      if (typeof icons === "string") iconPath = icons
      else
        iconPath =
          icons["128"] || icons["48"] || icons["16"] || Object.values(icons)[0]
    }

    if (iconPath) {
      if (iconPath.startsWith("/")) iconPath = iconPath.substring(1)
      return `${urlObj.protocol}//${urlObj.hostname}/${iconPath}`
    }
  } catch (e) {
    // ignore
  }
  return null
}

async function getBestIcon(bookmark) {
  const key = bookmark.url
  if (iconCache.has(key)) return iconCache.get(key)

  const candidates = getIconCandidates(bookmark)

  if (bookmark.url.includes("extension://")) {
    const manifestIcon = await getExtensionManifestIcon(bookmark.url)
    if (manifestIcon) {
      candidates.unshift(manifestIcon)
    }
  }

  for (const src of candidates) {
    const img = await loadImage(src, 1200)
    if (!img) continue

    const size = Math.min(img.width, img.height)

    // loại icon rác
    if (size < 24) continue

    const isSquare = Math.abs(img.width - img.height) < 5
    if (size >= 64 || isSquare) {
      iconCache.set(key, img.src)
      saveIconCache()
      return img.src
    }
  }

  iconCache.set(key, null)
  saveIconCache()
  return null
}

function createBookmarkIcon(bookmark) {
  const img = document.createElement("img")
  img.width = 24
  img.height = 24

  // Use a 1x1 transparent Base64 GIF to initialize layout and avoid CLS
  img.src =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
  img.alt = `${bookmark.title} icon`
  img.loading = "eager"
  img.decoding = "async"
  img.referrerPolicy = "no-referrer"
  img.className = "bookmark-icon"

  img.dataset.url = bookmark.url || ""
  if (bookmark.icon) img.dataset.icon = bookmark.icon
  img.dataset.title = bookmark.title || ""

  getFaviconObserver().observe(img)

  return img
}

let faviconObserver = null
function getFaviconObserver() {
  if (!faviconObserver) {
    faviconObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target
            observer.unobserve(img)

            const bookmarkMock = {
              url: img.dataset.url,
              icon: img.dataset.icon,
              title: img.dataset.title,
            }

            getBestIcon(bookmarkMock).then((bestIcon) => {
              if (bestIcon) {
                img.src = bestIcon
              } else {
                img.style.display = "none"
                if (!img.parentElement.querySelector(".bookmark-icon-fallback")) {
                  const fallback = document.createElement("div")
                  fallback.className = "bookmark-icon-fallback"
                  fallback.textContent = (bookmarkMock.title || "?")
                    .trim()
                    .charAt(0)
                    .toUpperCase()
                  img.parentElement?.insertBefore(fallback, img)
                }
              }
            })
          }
        })
      },
      { rootMargin: "300px" },
    )
  }
  return faviconObserver
}



function createBookmarkStackIcon(stack) {
  const wrap = document.createElement("div")
  wrap.className = "bookmark-stack-icon"

  if (stack.icon) {
    wrap.classList.add("has-custom-stack-icon")
    const iconEl = createStoredIconElement(stack.icon, getBookmarkLabel(stack))
    if (stack.iconColor) {
      iconEl.style.color = stack.iconColor
    }
    wrap.appendChild(iconEl)

    const badge = document.createElement("span")
    badge.className = "bookmark-stack-count"
    badge.textContent = stack.items.length
    wrap.appendChild(badge)

    return wrap
  }

  const displayItems = [];
  function extractBookmarks(items) {
    for (const item of items) {
      if (displayItems.length >= 4) return;
      if (item && item.type === "stack") {
        extractBookmarks(item.items || []);
      } else if (item) {
        displayItems.push(item);
      }
    }
  }
  extractBookmarks(stack.items || []);

  displayItems.forEach((item) => {
    const cell = document.createElement("div")
    cell.className = "bookmark-stack-cell"
    cell.appendChild(createBookmarkIcon(item))
    wrap.appendChild(cell)
  })

  while (wrap.children.length < 4) {
    const cell = document.createElement("div")
    cell.className = "bookmark-stack-cell empty"
    cell.innerHTML = '<i class="fa-solid fa-bookmark"></i>'
    wrap.appendChild(cell)
  }

  const badge = document.createElement("span")
  badge.className = "bookmark-stack-count"
  badge.textContent = stack.items.length
  wrap.appendChild(badge)

  return wrap
}

function createStoredIconElement(value, label = "Bookmark") {
  const iconValue = String(value || "").trim()

  if (iconValue.startsWith("fa:")) {
    const icon = document.createElement("i")
    icon.className = `${iconValue.slice(3)} stored-bookmark-icon`
    icon.setAttribute("aria-hidden", "true")
    return icon
  }

  if (iconValue) {
    const img = document.createElement("img")
    img.src = iconValue
    img.alt = `${label} icon`
    img.loading = "eager"
    img.decoding = "async"
    img.referrerPolicy = "no-referrer"
    img.className = "stored-bookmark-icon"
    img.addEventListener("error", () => {
      img.replaceWith(createStoredIconFallback(label))
    })
    return img
  }

  return createStoredIconFallback(label)
}

function createStoredIconFallback(label = "Bookmark") {
  const fallback = document.createElement("span")
  fallback.className = "stored-bookmark-icon stored-bookmark-icon-fallback"
  fallback.textContent = (label || "?").trim().charAt(0).toUpperCase()
  return fallback
}

function openBookmarkStackPopup(stack, anchor, stackIndex) {
  const existing = document.getElementById("bookmark-stack-popup")
  if (existing) existing.remove()
  document.getElementById("bookmark-stack-backdrop")?.remove()

  const popup = document.createElement("div")
  popup.id = "bookmark-stack-popup"
  popup.className = "bookmark-stack-popup"

  isStackSelectionMode = false
  selectedStackIndices.clear()
  activeStackIndex = stackIndex
  const i18n = geti18n()

  const header = document.createElement("div")
  header.className = "bookmark-stack-popup-header"

  const titleWrapper = document.createElement("div")
  titleWrapper.className = "bookmark-stack-popup-title-wrapper"

  let folderIcon
  if (stack.icon) {
    folderIcon = createStoredIconElement(stack.icon, getBookmarkLabel(stack))
    folderIcon.classList.add("bookmark-stack-popup-header-icon")
    if (stack.iconColor) {
      folderIcon.style.color = stack.iconColor
    }
  } else {
    folderIcon = document.createElement("i")
    folderIcon.className = "fa-solid fa-folder-open bookmark-stack-popup-header-icon"
    folderIcon.style.color = stack.iconColor || "var(--accent-color, #a8c0ff)"
    folderIcon.style.fontSize = "1.05rem"
  }

  const title = document.createElement("span")
  title.className = "bookmark-stack-popup-title"
  title.textContent = getBookmarkLabel(stack)
  title.title = i18n.bookmark_stack_rename || "Click to rename"

  const titleEditIcon = document.createElement("i")
  titleEditIcon.className = "fa-solid fa-pen bookmark-stack-popup-title-icon"
  titleEditIcon.title = i18n.bookmark_stack_rename || "Click to rename"

  const count = document.createElement("span")
  count.className = "bookmark-stack-popup-count"
  count.textContent = `${stack.items.length}`

  // Inline rename on click
  const triggerInlineRename = () => {
    const currentName = getBookmarkLabel(stack)
    const input = document.createElement("input")
    input.type = "text"
    input.value = currentName
    input.className = "bookmark-stack-popup-title-input"

    const finishRename = () => {
      const newName = input.value.trim()
      if (newName && newName !== currentName) {
        stack.title = newName
        title.textContent = newName
        saveBookmarks()
        renderBookmarks()
      }
      input.replaceWith(title)
      titleWrapper.insertBefore(titleEditIcon, count)
    }

    input.addEventListener("blur", finishRename)
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        input.blur()
      } else if (e.key === "Escape") {
        input.value = currentName
        input.blur()
      }
    })

    titleEditIcon.remove()
    title.replaceWith(input)
    input.focus()
    input.select()
  }

  title.addEventListener("click", triggerInlineRename)
  titleEditIcon.addEventListener("click", triggerInlineRename)

  titleWrapper.appendChild(folderIcon)
  titleWrapper.appendChild(title)
  titleWrapper.appendChild(titleEditIcon)
  titleWrapper.appendChild(count)
  header.appendChild(titleWrapper)

  const headerActions = document.createElement("div")
  headerActions.className = "bookmark-stack-popup-header-actions"

  const searchToggleBtn = document.createElement("button")
  searchToggleBtn.type = "button"
  searchToggleBtn.className = "bookmark-stack-popup-header-btn"
  searchToggleBtn.title = i18n.search_placeholder || "Search bookmarks"
  searchToggleBtn.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i>`

  const selectModeBtn = document.createElement("button")
  selectModeBtn.type = "button"
  selectModeBtn.className = "bookmark-stack-popup-header-btn"
  selectModeBtn.title = i18n.bookmark_stack_select || "Select bookmarks"
  selectModeBtn.innerHTML = `<i class="fa-solid fa-check-double"></i>`

  const renameFolderBtn = document.createElement("button")
  renameFolderBtn.type = "button"
  renameFolderBtn.className = "bookmark-stack-popup-header-btn"
  renameFolderBtn.title = i18n.bookmark_stack_rename || "Folder settings"
  renameFolderBtn.innerHTML = `<i class="fa-solid fa-sliders"></i>`
  renameFolderBtn.addEventListener("click", () => {
    openBookmarkStackEditPopover(stackIndex, anchor)
  })

  const closeBtn = document.createElement("button")
  closeBtn.type = "button"
  closeBtn.className = "bookmark-stack-popup-header-btn bookmark-stack-popup-close-btn"
  closeBtn.title = i18n.close || "Close"
  closeBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`

  headerActions.appendChild(searchToggleBtn)
  headerActions.appendChild(selectModeBtn)
  headerActions.appendChild(renameFolderBtn)
  headerActions.appendChild(closeBtn)
  header.appendChild(headerActions)
  popup.appendChild(header)

  // Search Bar
  const searchWrapper = document.createElement("div")
  searchWrapper.className = "bookmark-stack-popup-search"
  if (stack.items.length < 4) {
    searchWrapper.style.display = "none"
  }

  const searchIcon = document.createElement("i")
  searchIcon.className = "fa-solid fa-magnifying-glass bookmark-stack-popup-search-icon"

  const searchInput = document.createElement("input")
  searchInput.type = "text"
  searchInput.placeholder = i18n.bookmark_stack_search || "Search in folder..."
  searchInput.className = "bookmark-stack-popup-search-input"

  const clearSearchBtn = document.createElement("button")
  clearSearchBtn.type = "button"
  clearSearchBtn.className = "bookmark-stack-popup-search-clear"
  clearSearchBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`
  clearSearchBtn.style.display = "none"
  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = ""
    clearSearchBtn.style.display = "none"
    renderStackItems()
    searchInput.focus()
  })

  searchWrapper.appendChild(searchIcon)
  searchWrapper.appendChild(searchInput)
  searchWrapper.appendChild(clearSearchBtn)
  popup.appendChild(searchWrapper)

  searchToggleBtn.addEventListener("click", () => {
    const isHidden = searchWrapper.style.display === "none"
    searchWrapper.style.display = isHidden ? "block" : "none"
    searchToggleBtn.classList.toggle("active", isHidden)
    if (isHidden) searchInput.focus()
  })

  // Selection Action Bar
  const selectionBar = document.createElement("div")
  selectionBar.className = "bookmark-stack-popup-selection-bar"
  selectionBar.style.display = "none"

  const selectionBarLeft = document.createElement("div")
  selectionBarLeft.className = "selection-bar-left"

  const selectAllBtn = document.createElement("button")
  selectAllBtn.type = "button"
  selectAllBtn.className = "selection-bar-btn"
  selectAllBtn.innerHTML = `<i class="fa-solid fa-check-square"></i><span>${i18n.select_all || "Select all"}</span>`

  const selectionCountText = document.createElement("span")
  selectionCountText.className = "selection-bar-count"
  selectionCountText.textContent = `0/${stack.items.length} ${i18n.selected || "selected"}`

  selectionBarLeft.appendChild(selectAllBtn)
  selectionBarLeft.appendChild(selectionCountText)

  const selectionBarRight = document.createElement("div")
  selectionBarRight.className = "selection-bar-right"

  const deleteSelectedBtn = document.createElement("button")
  deleteSelectedBtn.type = "button"
  deleteSelectedBtn.className = "selection-bar-btn danger"
  deleteSelectedBtn.innerHTML = `<i class="fa-solid fa-trash"></i><span>${i18n.delete || "Delete"}</span>`

  const cancelSelectionBtn = document.createElement("button")
  cancelSelectionBtn.type = "button"
  cancelSelectionBtn.className = "selection-bar-btn"
  cancelSelectionBtn.innerHTML = `<i class="fa-solid fa-xmark"></i><span>${i18n.bookmark_stack_cancel || "Cancel"}</span>`

  selectionBarRight.appendChild(deleteSelectedBtn)
  selectionBarRight.appendChild(cancelSelectionBtn)
  selectionBar.appendChild(selectionBarLeft)
  selectionBar.appendChild(selectionBarRight)
  popup.appendChild(selectionBar)

  const grid = document.createElement("div")
  grid.className = "bookmark-stack-popup-grid"
  popup.appendChild(grid)
  let ignoreNextStackPopupClick = false

  const syncStackSelectionUi = () => {
    popup.classList.toggle("is-selecting", isStackSelectionMode)
    selectModeBtn.classList.toggle("active", isStackSelectionMode)
    selectionBar.style.display = isStackSelectionMode ? "flex" : "none"

    const selectedCount = selectedStackIndices.size
    deleteSelectedBtn.disabled = selectedCount === 0
    deleteSelectedBtn.innerHTML = `<i class="fa-solid fa-trash"></i><span>${i18n.delete || "Delete"}${selectedCount > 0 ? ` (${selectedCount})` : ""}</span>`
    selectionCountText.textContent = `${selectedCount}/${stack.items.length} ${i18n.selected || "selected"}`
    count.textContent = isStackSelectionMode
      ? `${selectedCount}/${stack.items.length}`
      : `${stack.items.length}`

    const isAllSelected = stack.items.length > 0 && selectedCount === stack.items.length
    selectAllBtn.innerHTML = isAllSelected
      ? `<i class="fa-regular fa-square"></i><span>${i18n.deselect_all || "Deselect"}</span>`
      : `<i class="fa-solid fa-check-square"></i><span>${i18n.select_all || "Select all"}</span>`
  }

  const normalizeStackAfterDelete = () => {
    const bookmarks = getBookmarks()
    if (stackIndex == null) {
      saveBookmarks()
      return
    }
    if (!bookmarks[stackIndex]) return

    if (stack.items.length <= 0) {
      bookmarks.splice(stackIndex, 1)
    } else if (stack.items.length === 1) {
      bookmarks[stackIndex] = stack.items[0]
    } else {
      bookmarks[stackIndex] = stack
    }

    setBookmarks(bookmarks)
    saveBookmarks()
  }

  const getStackPopupDropIntent = (target, event, cachedRect) => {
    const rect = cachedRect || target.getBoundingClientRect()
    if (!rect.width) return "after"
    return event.clientX < rect.left + rect.width / 2 ? "before" : "after"
  }

  const updateStackPopupDropIntent = (target, event, cachedRect) => {
    clearBookmarkDropClasses(target)
    const targetItemIndex = Number(target.dataset.stackIndex)
    const isSelfDrop = draggedStackItems.some(
      (item) =>
        item.stackIndex === stackIndex && item.itemIndex === targetItemIndex,
    )
    if (isSelfDrop) return

    const intent = getStackPopupDropIntent(target, event, cachedRect)
    target.classList.add(
      intent === "before" ? "drag-over-before" : "drag-over-after",
    )
    target.dataset.dropLabel = geti18n().bookmark_drop_move || "Move"
  }

  const moveDraggedStackItemsInsidePopup = (targetItemIndex, intent) => {
    const movedIndices = draggedStackItems
      .filter((item) => item.stackIndex === stackIndex)
      .map((item) => item.itemIndex)
      .sort((a, b) => b - a)
    if (!movedIndices.length) return false

    const movedObjects = []
    movedIndices.forEach((idx) => {
      movedObjects.unshift(stack.items.splice(idx, 1)[0])
    })

    let insertAt = targetItemIndex
    if (intent === "after") insertAt += 1

    movedIndices.forEach((idx) => {
      if (idx < targetItemIndex && intent === "before") insertAt -= 1
      if (idx < targetItemIndex && intent === "after") insertAt -= 1
    })

    insertAt = Math.max(0, Math.min(stack.items.length, insertAt))
    stack.items.splice(insertAt, 0, ...movedObjects)
    saveBookmarks()
    return true
  }

  const handleStackItemDragStart = function (event) {
    const itemIndex = Number(this.dataset.stackIndex)
    if (isStackSelectionMode && selectedStackIndices.size > 0 && selectedStackIndices.has(itemIndex)) {
      draggedStackItems = Array.from(selectedStackIndices)
        .sort((a, b) => a - b)
        .map((idx) => ({ stack, stackIndex, itemIndex: idx, item: stack.items[idx] }))
    } else {
      draggedStackItems = [{ stack, stackIndex, itemIndex, item: stack.items[itemIndex] }]
    }
    draggedBookmarkIndices = []
    draggedGroupIndex = null
    this.classList.add("dragging")
    document.body.classList.add("bookmark-dragging-active")
    event.dataTransfer.effectAllowed = "move"
    try {
      event.dataTransfer.setData("text/plain", "bookmark-stack-item")
    } catch (_) {}
  }

  const handleStackPopupDragOver = function (event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    const cachedRect = dragOverRectCache.get(this)
    updateStackPopupDropIntent(this, event, cachedRect)
    return false
  }

  const handleStackPopupDragEnter = function (event) {
    event.preventDefault()
    dragOverRectCache.set(this, this.getBoundingClientRect())
    updateStackPopupDropIntent(this, event, dragOverRectCache.get(this))
  }

  const handleStackPopupDragLeave = function () {
    clearBookmarkDropClasses(this)
  }

  const handleStackPopupDrop = function (event) {
    event.stopPropagation()
    event.preventDefault()
    clearBookmarkDropClasses(this)
    const targetItemIndex = Number(this.dataset.stackIndex)
    const intent = getStackPopupDropIntent(
      this,
      event,
      dragOverRectCache.get(this),
    )

    if (moveDraggedStackItemsInsidePopup(targetItemIndex, intent)) {
      selectedStackIndices.clear()
      isStackSelectionMode = false
      renderStackItems()
      syncStackSelectionUi()
      renderBookmarks()
      showBookmarkUndo(
        geti18n().bookmark_moved || "Bookmarks moved",
        captureBookmarkSnapshot(),
      )
    }

    draggedStackItems = []
    draggedBookmarkIndices = []
    draggedGroupIndex = null
    document.body.classList.remove("bookmark-dragging-active")
    return false
  }

  const renderStackItems = () => {
    grid.innerHTML = ""
    const query = searchInput ? searchInput.value.toLowerCase().trim() : ""
    
    let visibleCount = 0
    stack.items.forEach((item, itemIndex) => {
      const labelText = getBookmarkLabel(item)
      if (query && !labelText.toLowerCase().includes(query)) {
        return
      }
      visibleCount++

      const link = document.createElement("a")
      applyBookmarkLinkBehavior(link, item.url)
      link.className = "bookmark bookmark-stack-popup-item"
      link.dataset.stackIndex = itemIndex
      link.draggable = getSettings().bookmarkEnableDrag === true
      if (selectedStackIndices.has(itemIndex)) {
        link.classList.add("selected")
      }

      if (isBookmarkStack(item)) {
        link.classList.add("bookmark-stack")
        link.appendChild(createBookmarkStackIcon(item))
      } else {
        link.appendChild(createBookmarkIcon(item))
      }
      const label = document.createElement("span")
      label.className = "bookmark-stack-popup-label"
      label.textContent = labelText
      label.title = labelText
      link.appendChild(label)

      const check = document.createElement("span")
      check.className = "bookmark-stack-popup-check"
      check.innerHTML = `<i class="fa-solid fa-check"></i>`
      link.appendChild(check)

      link.addEventListener("click", async (event) => {
        if (ignoreNextStackPopupClick) {
          ignoreNextStackPopupClick = false
          event.preventDefault()
          event.stopPropagation()
          return
        }

        if (isStackSelectionMode) {
          event.preventDefault()
          event.stopPropagation()
          if (selectedStackIndices.has(itemIndex)) {
            selectedStackIndices.delete(itemIndex)
          } else {
            selectedStackIndices.add(itemIndex)
          }
          renderStackItems()
          syncStackSelectionUi()
          return
        }

        if (isBookmarkStack(item)) {
          event.preventDefault()
          event.stopPropagation()
          openBookmarkStackPopup(item, anchor, null)
          return
        }

        await promptBookmarkOpenBehaviorOnClick(event, item.url)
      })
      link.addEventListener("dragstart", handleStackItemDragStart)
      link.addEventListener("dragover", handleStackPopupDragOver)
      link.addEventListener("dragenter", handleStackPopupDragEnter)
      link.addEventListener("dragleave", handleStackPopupDragLeave)
      link.addEventListener("drop", handleStackPopupDrop)
      link.addEventListener("dragend", handleDragEnd)
      link.addEventListener("contextmenu", (event) => {
        event.preventDefault()
        event.stopPropagation()
        showContextMenu(
          event.clientX,
          event.clientY,
          itemIndex,
          "bookmarkStackItem",
          `${stackIndex}:${itemIndex}`,
          {
            onEdit: () => {
              openBookmarkEditPopover(
                null,
                {
                  type: "stackItem",
                  stackIndex,
                  itemIndex,
                },
                link,
              )
            },
            onEditIcon: () => {
              openBookmarkEditPopover(
                null,
                {
                  type: "stackItem",
                  stackIndex,
                  itemIndex,
                },
                link,
                { focus: "icon" },
              )
            },
            onDelete: async () => {
              const confirmed = await showConfirm(
                `${i18n.alert_delete_confirm || "Delete"} "${getBookmarkLabel(item)}"?`,
              )
              if (!confirmed) return
              const snapshot = captureBookmarkSnapshot()
              stack.items.splice(itemIndex, 1)
              normalizeStackAfterDelete()
              renderStackItems()
              syncStackSelectionUi()
              renderBookmarks()
              showBookmarkUndo(
                i18n.bookmark_deleted || "Bookmark deleted",
                snapshot,
              )
            },
            onSelect: () => {
              isStackSelectionMode = true
              selectedStackIndices.clear()
              selectedStackIndices.add(itemIndex)
              renderStackItems()
              syncStackSelectionUi()
            },
          },
        )
      })

      grid.appendChild(link)
    })

    // Empty state
    if (visibleCount === 0) {
      const emptyBox = document.createElement("div")
      emptyBox.className = "bookmark-stack-empty"
      emptyBox.innerHTML = query
        ? `<i class="fa-solid fa-magnifying-glass"></i><p>${i18n.search_no_results || "No bookmarks found matching query"}</p>`
        : `<i class="fa-solid fa-folder-open"></i><p>${i18n.bookmark_stack_empty || "This folder is empty"}</p>`
      grid.appendChild(emptyBox)
    }
  }

  // Header and Selection Actions
  selectModeBtn.addEventListener("click", () => {
    isStackSelectionMode = !isStackSelectionMode
    selectedStackIndices.clear()
    renderStackItems()
    syncStackSelectionUi()
  })

  selectAllBtn.addEventListener("click", () => {
    if (selectedStackIndices.size === stack.items.length) {
      selectedStackIndices.clear()
    } else {
      selectedStackIndices.clear()
      stack.items.forEach((_, idx) => selectedStackIndices.add(idx))
    }
    renderStackItems()
    syncStackSelectionUi()
  })

  cancelSelectionBtn.addEventListener("click", () => {
    isStackSelectionMode = false
    selectedStackIndices.clear()
    renderStackItems()
    syncStackSelectionUi()
  })

  deleteSelectedBtn.addEventListener("click", async () => {
    if (selectedStackIndices.size === 0) return
    const confirmed = await showConfirm(
      (
        i18n.bookmark_delete_selected_confirm ||
        "Delete {count} selected bookmarks?"
      ).replace("{count}", selectedStackIndices.size),
    )
    if (!confirmed) return

    const snapshot = captureBookmarkSnapshot()
    const deletedCount = selectedStackIndices.size
    Array.from(selectedStackIndices)
      .sort((a, b) => b - a)
      .forEach((itemIndex) => stack.items.splice(itemIndex, 1))
    selectedStackIndices.clear()
    isStackSelectionMode = false
    normalizeStackAfterDelete()
    renderStackItems()
    syncStackSelectionUi()
    renderBookmarks()
    showBookmarkUndo(
      (i18n.bookmark_deleted_many || "Deleted {count} bookmarks").replace(
        "{count}",
        deletedCount,
      ),
      snapshot,
    )
  })

  renderStackItems()
  syncStackSelectionUi()

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearSearchBtn.style.display = searchInput.value ? "block" : "none"
      renderStackItems()
    })
  }

  document.body.appendChild(popup)

  // Detect layout mode
  const isSidebar = document.body.classList.contains("bookmark-sidebar-mode")
  const isTaskbarTop = document.body.classList.contains("bookmark-taskbar-top-mode")
  const isTaskbarLeft = document.body.classList.contains("bookmark-taskbar-left-mode")
  const isTaskbarRight = document.body.classList.contains("bookmark-taskbar-right-mode")
  const isTaskbarMode = document.body.classList.contains("bookmark-taskbar-mode")
  const isFlipped = document.body.classList.contains("flip-layout")

  // Position nicely near anchor or centered on smaller displays
  const rect = anchor ? anchor.getBoundingClientRect() : null
  const hasValidRect = rect && (rect.width > 0 || rect.height > 0)
  const popupRect = popup.getBoundingClientRect()
  const pWidth = popupRect.width || 420
  const pHeight = popupRect.height || 360

  if (hasValidRect && window.innerWidth > 600) {
    if (isSidebar) {
      // Sidebar layout: place adjacent to sidebar horizontally, centered vertically
      let left
      if (isFlipped) {
        // Sidebar on left -> expand to the right
        left = rect.right + 14
        if (left + pWidth > window.innerWidth - 16) {
          left = window.innerWidth - pWidth - 16
        }
      } else {
        // Sidebar on right -> expand to the left
        left = rect.left - pWidth - 14
        if (left < 16) {
          left = 16
        }
      }

      let top = rect.top + rect.height / 2 - pHeight / 2
      top = Math.max(16, Math.min(top, window.innerHeight - pHeight - 16))

      popup.style.left = `${Math.round(left)}px`
      popup.style.top = `${Math.round(top)}px`
    } else if (isTaskbarLeft) {
      // Left taskbar: expand to right
      let left = rect.right + 14
      if (left + pWidth > window.innerWidth - 16) {
        left = window.innerWidth - pWidth - 16
      }
      let top = rect.top + rect.height / 2 - pHeight / 2
      top = Math.max(16, Math.min(top, window.innerHeight - pHeight - 16))

      popup.style.left = `${Math.round(left)}px`
      popup.style.top = `${Math.round(top)}px`
    } else if (isTaskbarRight) {
      // Right taskbar: expand to left
      let left = rect.left - pWidth - 14
      if (left < 16) {
        left = 16
      }
      let top = rect.top + rect.height / 2 - pHeight / 2
      top = Math.max(16, Math.min(top, window.innerHeight - pHeight - 16))

      popup.style.left = `${Math.round(left)}px`
      popup.style.top = `${Math.round(top)}px`
    } else if (isTaskbarTop) {
      // Top taskbar: expand below
      let left = Math.max(
        16,
        Math.min(rect.left + rect.width / 2 - pWidth / 2, window.innerWidth - pWidth - 16),
      )
      let top = rect.bottom + 14
      if (top + pHeight > window.innerHeight - 16) {
        top = Math.max(16, rect.top - pHeight - 14)
      }
      popup.style.left = `${Math.round(left)}px`
      popup.style.top = `${Math.round(top)}px`
    } else if (isTaskbarMode) {
      // Bottom taskbar: expand above
      let left = Math.max(
        16,
        Math.min(rect.left + rect.width / 2 - pWidth / 2, window.innerWidth - pWidth - 16),
      )
      let top = rect.top - pHeight - 14
      if (top < 16) {
        top = rect.bottom + 14
      }
      popup.style.left = `${Math.round(left)}px`
      popup.style.top = `${Math.round(top)}px`
    } else {
      // Default grid layout
      const left = Math.min(
        Math.max(16, rect.left + rect.width / 2 - pWidth / 2),
        window.innerWidth - pWidth - 16,
      )
      const below = rect.bottom + 14
      const above = rect.top - pHeight - 14
      popup.style.left = `${Math.round(left)}px`
      popup.style.top =
        below + pHeight < window.innerHeight - 16
          ? `${Math.round(below)}px`
          : `${Math.round(Math.max(16, above))}px`
    }
  } else {
    popup.style.left = `calc(50% - ${pWidth / 2}px)`
    popup.style.top = `calc(50% - ${pHeight / 2}px)`
  }

  const closePopup = () => {
    popup.remove()
    document.removeEventListener("click", onDocumentClick)
    document.removeEventListener("keydown", onKeyDown)
    window.dispatchEvent(new CustomEvent("layoutUpdated"))
  }

  const onDocumentClick = (event) => {
    const contextMenu = document.getElementById("context-menu")
    if (
      !popup.contains(event.target) &&
      (!anchor || !anchor.contains(event.target)) &&
      !contextMenu?.contains(event.target)
    ) {
      closePopup()
    }
  }

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      closePopup()
    }
  }

  closeBtn.addEventListener("click", closePopup)
  setTimeout(() => {
    document.addEventListener("click", onDocumentClick)
    document.addEventListener("keydown", onKeyDown)
  }, 50)
  
  // Force macOS hover cache to update for the new popup items
  window.dispatchEvent(new CustomEvent("layoutUpdated"))
}

// --- Drag and Drop State ---
let draggedBookmarkIndices = []
let draggedGroupIndex = null
let draggedStackItems = []
// Cache element rects on dragenter to avoid getBoundingClientRect in dragover (which fires ~60x/sec)
const dragOverRectCache = new WeakMap()

function isBookmarkStack(item) {
  return item?.type === "stack" && Array.isArray(item.items)
}

function getStackItems(item) {
  if (isBookmarkStack(item)) {
    return getSettings().bookmarkKeepNestedFolders ? [item] : item.items;
  }
  return [item]
}

function getBookmarkLabel(item) {
  return item?.title || item?.name || "Bookmark"
}

function getBookmarkCategory(item) {
  const text =
    `${item?.title || ""} ${item?.url || ""} ${getHostname(item?.url || "")}`.toLowerCase()
  const rules = [
    [
      "ai",
      /openai|chatgpt|claude|gemini|perplexity|poe|copilot|midjourney|huggingface/,
    ],
    [
      "dev",
      /github|gitlab|stackoverflow|stackblitz|codesandbox|npmjs|vercel|netlify|localhost|developer|docs\./,
    ],
    [
      "social",
      /facebook|instagram|twitter|x\.com|threads|reddit|discord|telegram|zalo|tiktok|messenger/,
    ],
    [
      "music",
      /spotify|soundcloud|zingmp3|music\.youtube|nhac|music|audio|podcast/,
    ],
    [
      "video",
      /youtube|netflix|primevideo|disney|twitch|vimeo|movie|film|video/,
    ],
    [
      "work",
      /notion|slack|trello|jira|asana|clickup|figma|miro|office|docs\.google|drive\.google|calendar\.google/,
    ],
    ["shop", /amazon|shopee|lazada|tiki|etsy|ebay|store|shop|cart/],
    [
      "news",
      /news|medium|substack|vnexpress|tuoitre|thanhnien|bbc|cnn|bloomberg/,
    ],
    [
      "learn",
      /coursera|udemy|edx|duolingo|khanacademy|learn|course|study|school/,
    ],
    [
      "finance",
      /bank|paypal|stripe|binance|coinbase|finance|stock|money|crypto/,
    ],
  ]
  return rules.find(([, pattern]) => pattern.test(text))?.[0] || null
}

function inferBookmarkStackName(items) {
  const i18n = geti18n()
  const categoryLabels = {
    ai: i18n.bookmark_category_ai || "AI",
    dev: i18n.bookmark_category_dev || "Developer",
    social: i18n.bookmark_category_social || "Social",
    music: i18n.bookmark_category_music || "Music",
    video: i18n.bookmark_category_video || "Video",
    work: i18n.bookmark_category_work || "Work",
    shop: i18n.bookmark_category_shop || "Shopping",
    news: i18n.bookmark_category_news || "News",
    learn: i18n.bookmark_category_learn || "Learning",
    finance: i18n.bookmark_category_finance || "Finance",
  }
  const counts = new Map()
  items.forEach((item) => {
    const category = getBookmarkCategory(item)
    if (category) counts.set(category, (counts.get(category) || 0) + 1)
  })
  const best = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]
  if (best && best[1] >= Math.max(1, Math.ceil(items.length / 2))) {
    return categoryLabels[best[0]]
  }

  const hostParts = items
    .map(
      (item) =>
        getHostname(item.url)
          .replace(/^www\./, "")
          .split(".")[0],
    )
    .filter(Boolean)
  const commonHost = hostParts.find(
    (host) => hostParts.filter((part) => part === host).length >= 2,
  )
  if (commonHost) {
    return commonHost.charAt(0).toUpperCase() + commonHost.slice(1)
  }

  return i18n.bookmark_stack_default_name || "Bookmark Group"
}

function createBookmarkStack(title, items) {
  const validItems = items.filter((item) => item && (item.url || item.type === "stack") && item.title)
  return {
    type: "stack",
    id: `stack-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title || inferBookmarkStackName(validItems),
    items: validItems,
  }
}

function takeDraggedStackItems() {
  if (!draggedStackItems || draggedStackItems.length === 0) return null
  const bookmarks = getBookmarks()
  const first = draggedStackItems[0]

  let sourceStack = first.stack
  let sourceStackIndex = first.stackIndex

  if (!sourceStack && sourceStackIndex != null && bookmarks[sourceStackIndex]) {
    sourceStack = bookmarks[sourceStackIndex]
  }

  // If sourceStack still not found or index is missing, search bookmarks array
  if (!sourceStack) {
    sourceStack = bookmarks.find(
      (b) =>
        isBookmarkStack(b) &&
        (first.item ? b.items.includes(first.item) : true),
    )
  }

  if (sourceStack) {
    const idx = bookmarks.indexOf(sourceStack)
    if (idx !== -1) {
      sourceStackIndex = idx
    } else if (
      sourceStackIndex == null &&
      typeof activeStackIndex === "number"
    ) {
      sourceStackIndex = activeStackIndex
    }
  }

  if (!sourceStack || !Array.isArray(sourceStack.items)) return null

  const items = []
  const sortedStackItems = [...draggedStackItems].sort(
    (a, b) => b.itemIndex - a.itemIndex,
  )
  for (const ds of sortedStackItems) {
    if (sourceStack.items[ds.itemIndex]) {
      items.unshift(...sourceStack.items.splice(ds.itemIndex, 1))
    }
  }

  if (items.length === 0) return null

  let removedSourceSlot = false
  if (
    sourceStackIndex != null &&
    sourceStackIndex >= 0 &&
    bookmarks[sourceStackIndex] === sourceStack
  ) {
    if (sourceStack.items.length <= 0) {
      bookmarks.splice(sourceStackIndex, 1)
      removedSourceSlot = true
    } else if (sourceStack.items.length === 1) {
      bookmarks[sourceStackIndex] = sourceStack.items[0]
    } else {
      bookmarks[sourceStackIndex] = sourceStack
    }
  }

  return { bookmarks, items, sourceStackIndex, removedSourceSlot }
}

function getBookmarkDropIntent(target, event) {
  if (!target?.classList?.contains("bookmark")) return "before"

  // Use cached rect from dragenter to avoid forced reflow on every dragover tick
  const rect = dragOverRectCache.get(target) || target.getBoundingClientRect()
  if (!rect.width || !rect.height) return target.classList.contains("bookmark-stack") ? "stack" : "before"
  
  const isVerticalLayout = document.body.classList.contains("bookmark-sidebar-mode") || 
                           document.body.classList.contains("bookmark-taskbar-left-mode") ||
                           document.body.classList.contains("bookmark-taskbar-right-mode");
                           
  const ratioX = (event.clientX - rect.left) / rect.width;
  const ratioY = (event.clientY - rect.top) / rect.height;
  
  // Center 50% area is for stacking/merging
  const isCenter = ratioX >= 0.25 && ratioX <= 0.75 && ratioY >= 0.25 && ratioY <= 0.75;
  
  if (isCenter) return "stack";
  
  if (isVerticalLayout) {
    return ratioY < 0.5 ? "before" : "after";
  } else {
    // Grid/Horizontal flow layout
    if (ratioX < 0.25) return "before";
    if (ratioX > 0.75) return "after";
    if (ratioY < 0.25) return "before";
    if (ratioY > 0.75) return "after";
    return ratioX < 0.5 ? "before" : "after";
  }
}

function clearBookmarkDropClasses(el) {
  el.classList.remove("drag-over", "drag-over-before", "drag-over-after")
  el.removeAttribute("data-drop-label")
}

function updateBookmarkDropIntent(el, event) {
  if (!el.classList.contains("bookmark")) return
  clearBookmarkDropClasses(el)

  const targetIndex = Number(el.dataset.index)
  if (draggedBookmarkIndices.includes(targetIndex)) return

  let intent = getBookmarkDropIntent(el, event)
  if (draggedStackItems.length > 0 && intent === "stack") {
    intent = "after"
  }
  const i18n = geti18n()
  if (intent === "before") {
    el.classList.add("drag-over-before")
    el.dataset.dropLabel = i18n.bookmark_drop_move || "Move"
  } else if (intent === "after") {
    el.classList.add("drag-over-after")
    el.dataset.dropLabel = i18n.bookmark_drop_move || "Move"
  } else {
    el.classList.add("drag-over")
    el.dataset.dropLabel = el.classList.contains("bookmark-stack")
      ? i18n.bookmark_drop_add_group || "Add to group"
      : i18n.bookmark_drop_create_group || "Create group"
  }
}

function handleDragStart(e) {
  const index = Number(this.dataset.index)
  if (isSelectionMode && selectedIndices.has(index)) {
    draggedBookmarkIndices = Array.from(selectedIndices).sort((a, b) => a - b)
  } else {
    draggedBookmarkIndices = [index]
  }
  draggedStackItems = []
  draggedGroupIndex = null
  e.dataTransfer.effectAllowed = "move"
  document.body.classList.add("bookmark-dragging-active")
  if (isSelectionMode) {
    setTimeout(() => {
      document
        .querySelectorAll(".bookmark.selected")
        .forEach((el) => el.classList.add("dragging"))
    }, 0)
  } else {
    setTimeout(() => this.classList.add("dragging"), 0)
  }
}

function handleStackItemDragStart(e) {
  const stackIndexStr = this.dataset.parentStackIndex
  const stackIndex = stackIndexStr === "null" ? null : Number(stackIndexStr)
  const itemIndex = Number(this.dataset.stackIndex)
  if (isStackSelectionMode && selectedStackIndices.has(itemIndex)) {
    draggedStackItems = Array.from(selectedStackIndices)
      .sort((a, b) => a - b)
      .map((idx) => ({ stackIndex, itemIndex: idx }))
  } else {
    draggedStackItems = [{ stackIndex, itemIndex }]
  }
  draggedBookmarkIndices = []
  draggedGroupIndex = null
  e.dataTransfer.effectAllowed = "move"
  document.body.classList.add("bookmark-dragging-active")
  if (isStackSelectionMode) {
    setTimeout(() => {
      document
        .querySelectorAll(".bookmark-stack-popup-item.selected")
        .forEach((el) => el.classList.add("dragging"))
    }, 0)
  } else {
    setTimeout(() => this.classList.add("dragging"), 0)
  }
}

function handleGroupDragStart(e) {
  draggedGroupIndex = Number(this.dataset.index)
  draggedStackItems = []
  draggedBookmarkIndices = []
  e.dataTransfer.effectAllowed = "move"
  setTimeout(() => this.classList.add("dragging"), 0)
}

function handleDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = "move"
  if (this.classList.contains("bookmark")) {
    updateBookmarkDropIntent(this, e)
  } else if (this.classList.contains("bookmark-group-tab")) {
    if (draggedBookmarkIndices.length > 0 || draggedStackItems.length > 0) {
      this.classList.add("drag-over", "drag-over-bookmark")
      this.dataset.dropLabel =
        geti18n().bookmark_drop_move_to_folder || "Move here"
    } else if (draggedGroupIndex !== null) {
      // Use cached rect from dragenter — no forced reflow on dragover
      const rect = dragOverRectCache.get(this) || this.getBoundingClientRect();
      const isVertical = this.parentElement.style.flexDirection === "column" || 
                         document.body.classList.contains("bookmark-sidebar-mode") ||
                         document.body.classList.contains("bookmark-taskbar-left-mode") ||
                         document.body.classList.contains("bookmark-taskbar-right-mode");
      let intent = "before";
      if (isVertical) {
        const ratio = (e.clientY - rect.top) / rect.height;
        if (ratio >= 0.25 && ratio <= 0.75) intent = "stack";
        else if (ratio > 0.75) intent = "after";
      } else {
        const ratio = (e.clientX - rect.left) / rect.width;
        if (ratio >= 0.25 && ratio <= 0.75) intent = "stack";
        else if (ratio > 0.75) intent = "after";
      }
      
      this.classList.remove("drag-over-before", "drag-over-after", "drag-over");
      if (intent === "before") {
        this.classList.add("drag-over-before");
        this.dataset.dropLabel = geti18n().bookmark_drop_move || "Move";
      } else if (intent === "after") {
        this.classList.add("drag-over-after");
        this.dataset.dropLabel = geti18n().bookmark_drop_move || "Move";
      } else {
        this.classList.add("drag-over");
        this.dataset.dropLabel = geti18n().bookmark_drop_add_group || "Merge into group";
      }
      this.dataset.dropIntent = intent;
    }
  }
  return false
}

function handleDragEnter(e) {
  e.preventDefault()
  if (this.classList.contains("bookmark")) {
    // Cache rect on dragenter — avoids getBoundingClientRect on every dragover tick
    dragOverRectCache.set(this, this.getBoundingClientRect())
    if (!draggedBookmarkIndices.includes(Number(this.dataset.index))) {
      updateBookmarkDropIntent(this, e)
    }
  } else if (this.classList.contains("bookmark-group-tab")) {
    // Cache rect for group tab too
    dragOverRectCache.set(this, this.getBoundingClientRect())
    if (draggedBookmarkIndices.length > 0 || draggedStackItems.length > 0) {
      const i18n = geti18n()
      this.classList.add("drag-over", "drag-over-bookmark")
      this.dataset.dropLabel = i18n.bookmark_drop_move_to_folder || "Move here"
    } else if (this.dataset.index !== String(draggedGroupIndex)) {
      this.classList.add("drag-over")
      this.dataset.dropLabel = geti18n().bookmark_drop_move || "Move"
    }
  }
}

function handleDragLeave(e) {
  if (this.classList.contains("bookmark")) clearBookmarkDropClasses(this)
  else {
    this.classList.remove("drag-over", "drag-over-bookmark")
    this.removeAttribute("data-drop-label")
  }
}

function handleDrop(e) {
  e.stopPropagation()
  e.preventDefault() // prevent opening the link
  clearBookmarkDropClasses(this)
  const targetIndex = Number(this.dataset.index)

  if (draggedStackItems.length > 0) {
    const snapshot = captureBookmarkSnapshot()
    const extracted = takeDraggedStackItems()
    if (!extracted?.items || extracted.items.length === 0) return false

    const { bookmarks, items, sourceStackIndex, removedSourceSlot } = extracted
    let insertIndex = targetIndex
    if (removedSourceSlot && sourceStackIndex < targetIndex) insertIndex -= 1
    const intent = getBookmarkDropIntent(this, e)
    if (intent !== "before") insertIndex += 1
    bookmarks.splice(Math.max(0, insertIndex), 0, ...items)
    setBookmarks(bookmarks)
    saveBookmarks()
    document.getElementById("bookmark-stack-popup")?.remove()
    cancelSelection()
    renderBookmarks()
    showBookmarkUndo(geti18n().bookmark_moved || "Bookmarks moved", snapshot)
  } else if (
    draggedBookmarkIndices.length > 0 &&
    !draggedBookmarkIndices.includes(targetIndex)
  ) {
    const snapshot = captureBookmarkSnapshot()
    const bookmarks = getBookmarks()
    const targetItem = bookmarks[targetIndex]
    const intent = getBookmarkDropIntent(this, e)

    const sortedIndices = [...draggedBookmarkIndices].sort((a, b) => b - a)
    const draggedItemsOriginal = sortedIndices.map((idx) => bookmarks[idx])
    draggedItemsOriginal.reverse() // Keep visual order left-to-right

    if (intent === "stack") {
      if (isBookmarkStack(targetItem)) {
        for (const item of draggedItemsOriginal) {
          targetItem.items.push(...getStackItems(item))
        }
        if (
          !targetItem.title ||
          targetItem.title === "Bookmark Group" ||
          targetItem.title === "Nhóm bookmark" ||
          targetItem.title ===
            (geti18n().bookmark_stack_default_name || "Bookmark Group")
        ) {
          targetItem.title = inferBookmarkStackName(targetItem.items)
        }
        for (const idx of sortedIndices) {
          if (idx !== targetIndex) bookmarks.splice(idx, 1)
        }
      } else {
        let allItems = [targetItem]
        for (const item of draggedItemsOriginal) {
          allItems.push(...getStackItems(item))
        }
        for (const idx of sortedIndices) {
          bookmarks.splice(idx, 1)
        }
        let newTargetIndex = targetIndex
        for (const idx of sortedIndices) {
          if (idx < targetIndex) newTargetIndex--
        }
        bookmarks[newTargetIndex] = createBookmarkStack(null, allItems)
      }
      setBookmarks(bookmarks)
      saveBookmarks()
      cancelSelection()
      renderBookmarks()
      showBookmarkUndo(
        geti18n().bookmark_group_created || "Group created",
        snapshot,
      )
      return false
    }

    // Normal move (before/after)
    for (const idx of sortedIndices) {
      bookmarks.splice(idx, 1)
    }

    let insertIndex = targetIndex
    for (const idx of sortedIndices) {
      if (idx < targetIndex) insertIndex--
    }
    if (intent === "after") insertIndex++

    bookmarks.splice(insertIndex, 0, ...draggedItemsOriginal)
    setBookmarks(bookmarks)
    saveBookmarks()
    cancelSelection()
    renderBookmarks()
    showBookmarkUndo(geti18n().bookmark_moved || "Bookmarks moved", snapshot)
  }
  return false
}

function handleGroupDrop(e) {
  e.stopPropagation()
  e.preventDefault()
  this.classList.remove("drag-over", "drag-over-bookmark")
  this.removeAttribute("data-drop-label")
  const targetIndex = Number(this.dataset.index)

  if (draggedStackItems && draggedStackItems.length > 0) {
    const snapshot = captureBookmarkSnapshot()
    const groups = getBookmarkGroups()
    const targetGroup = groups[targetIndex]
    const activeGroupId = getActiveGroupId()
    if (!targetGroup || targetGroup.id === activeGroupId) return false

    if (
      getSettings().bookmarkLimit20 !== false &&
      (targetGroup.items || []).length + draggedStackItems.length > 20
    ) {
      showAlert(
        geti18n().alert_bookmark_limit_reached ||
          "This group already has 20 bookmarks!",
      )
      return false
    }

    const extracted = takeDraggedStackItems()
    if (!extracted?.items) return false
    targetGroup.items = targetGroup.items || []
    targetGroup.items.push(...extracted.items)
    setBookmarks(extracted.bookmarks)
    setBookmarkGroups(groups)
    saveBookmarks()
    document.getElementById("bookmark-stack-popup")?.remove()
    cancelSelection()
    renderBookmarks()
    showBookmarkUndo(geti18n().bookmark_moved || "Bookmarks moved", snapshot)
  } else if (draggedBookmarkIndices.length > 0) {
    const snapshot = captureBookmarkSnapshot()
    const groups = getBookmarkGroups()
    const targetGroup = groups[targetIndex]
    const activeGroupId = getActiveGroupId()
    if (!targetGroup || targetGroup.id === activeGroupId) return false
    if (
      getSettings().bookmarkLimit20 !== false &&
      (targetGroup.items || []).length + draggedBookmarkIndices.length > 20
    ) {
      showAlert(
        geti18n().alert_bookmark_limit_reached ||
          "This group already has 20 bookmarks!",
      )
      return false
    }

    const bookmarks = getBookmarks()
    const sortedIndices = [...draggedBookmarkIndices].sort((a, b) => b - a)
    const draggedItemsOriginal = sortedIndices.map((idx) => bookmarks[idx])
    draggedItemsOriginal.reverse() // Keep visual order

    targetGroup.items = targetGroup.items || []
    targetGroup.items.push(...draggedItemsOriginal)

    for (const idx of sortedIndices) {
      bookmarks.splice(idx, 1)
    }

    setBookmarks(bookmarks)
    setBookmarkGroups(groups)
    saveBookmarks()
    cancelSelection()
    renderBookmarks()
    showBookmarkUndo(geti18n().bookmark_moved || "Bookmarks moved", snapshot)
  } else if (draggedGroupIndex !== null && draggedGroupIndex !== targetIndex) {
    const intent = this.dataset.dropIntent || "after";
    const snapshot = captureBookmarkSnapshot()
    const groups = getBookmarkGroups()
    
    if (intent === "stack") {
      const [draggedItem] = groups.splice(draggedGroupIndex, 1);
      let actualTargetIndex = targetIndex;
      if (draggedGroupIndex < targetIndex) actualTargetIndex--;
      const targetGroup = groups[actualTargetIndex];
      
      const newStack = {
        type: "stack",
        id: `stack-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: draggedItem.name || geti18n().bookmark_stack_default_name || "Bookmark Group",
        icon: draggedItem.icon || "",
        items: draggedItem.items || []
      };
      
      targetGroup.items = targetGroup.items || [];
      targetGroup.items.push(newStack);
    } else {
      const [draggedItem] = groups.splice(draggedGroupIndex, 1)
      let insertIndex = targetIndex;
      if (draggedGroupIndex < targetIndex) insertIndex--;
      if (intent === "after") insertIndex++;
      groups.splice(insertIndex, 0, draggedItem)
    }
    
    setBookmarkGroups(groups)
    saveBookmarks()
    renderBookmarks()
    showBookmarkUndo(geti18n().bookmark_moved || "Bookmark moved", snapshot)
  }
  return false
}

function handleDragEnd(e) {
  this.classList.remove("dragging")
  document
    .querySelectorAll(".bookmark, .bookmark-group-tab, .add-bookmark-card")
    .forEach((el) => {
      clearBookmarkDropClasses(el)
      el.classList.remove("drag-over", "drag-over-bookmark")
      el.removeAttribute("data-drop-label")
    })
  draggedBookmarkIndices = []
  draggedGroupIndex = null
  draggedStackItems = []
  document.body.classList.remove("bookmark-dragging-active")
}

function handleAddBookmarkDragOver(e) {
  if (!draggedStackItems || draggedStackItems.length === 0) return
  e.preventDefault()
  e.dataTransfer.dropEffect = "move"
  this.classList.add("drag-over")
  this.dataset.dropLabel = geti18n().bookmark_drop_move || "Move"
}

function handleAddBookmarkDrop(e) {
  if (!draggedStackItems || draggedStackItems.length === 0) return
  e.preventDefault()
  e.stopPropagation()
  clearBookmarkDropClasses(this)
  const snapshot = captureBookmarkSnapshot()
  const extracted = takeDraggedStackItems()
  if (!extracted?.items || extracted.items.length === 0) return
  extracted.bookmarks.push(...extracted.items)
  setBookmarks(extracted.bookmarks)
  saveBookmarks()
  document.getElementById("bookmark-stack-popup")?.remove()
  cancelSelection()
  renderBookmarks()
  showBookmarkUndo(geti18n().bookmark_moved || "Bookmarks moved", snapshot)
}

let toggleListenerAdded = false

/**
 * Returns the correct chevron icon class based on layout + collapsed state.
 * Arrow points toward the direction the groups will appear when revealed.
 * - Sidebar right: ← (groups on left side) / → when flipped
 * - Taskbar Top: ↑ (groups open downward → show ↓, hide ↑)
 * - Taskbar Bottom/Left: ↓ (groups open upward → show ↑, hide ↓)
 */
function getToggleIconClass(isHidden) {
  const isSidebar = document.body.classList.contains("bookmark-sidebar-mode")
  const isTaskbarTop = document.body.classList.contains(
    "bookmark-taskbar-top-mode",
  )
  const isTaskbarLeft = document.body.classList.contains("bookmark-taskbar-left-mode")
  const isTaskbarRight = document.body.classList.contains("bookmark-taskbar-right-mode")
  const isTaskbarMode = document.body.classList.contains("bookmark-taskbar-mode")

  if (isSidebar) {
    const isFlipped = document.body.classList.contains("flip-layout")
    // When groups hidden: arrow points outward (away from bar) to reveal
    // When groups shown: arrow points inward (toward bar) to collapse
    return isFlipped
      ? isHidden
        ? "fa-solid fa-chevron-right"
        : "fa-solid fa-chevron-left"
      : isHidden
        ? "fa-solid fa-chevron-left"
        : "fa-solid fa-chevron-right"
  } else if (isTaskbarTop) {
    // Groups appear below the top bar
    return isHidden ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-up"
  } else if (isTaskbarLeft) {
    // Groups are on the right (order 3)
    return isHidden ? "fa-solid fa-chevron-right" : "fa-solid fa-chevron-left"
  } else if (isTaskbarRight) {
    // Groups are on the left (order 1)
    return isHidden ? "fa-solid fa-chevron-left" : "fa-solid fa-chevron-right"
  } else if (isTaskbarMode) {
    // Groups appear above the bottom bar
    return isHidden ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down"
  }
  // Default Grid mode: Groups are below bookmarks-grid
  return isHidden ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-up"
}

export function updateBookmarkGroupsToggleIcon() {
  const icon = bookmarkGroupsToggle?.querySelector("i")
  if (!icon) return
  icon.className = getToggleIconClass(
    document.body.classList.contains("groups-hidden"),
  )
}

export function renderBookmarks() {
  const settings = getSettings()
  document.body.classList.toggle(
    "groups-hidden",
    settings.groupsHidden === true,
  )

  if (!toggleListenerAdded) {
    updateBookmarkGroupsToggleIcon()

    bookmarkGroupsToggle.addEventListener("click", () => {
      const isHidden = document.body.classList.toggle("groups-hidden")
      updateSetting("groupsHidden", isHidden)
      saveSettings()
      updateBookmarkGroupsToggleIcon()
    })

    toggleListenerAdded = true
  }
  updateBookmarkGroupsToggleIcon()
  const i18n = geti18n()
  document.getElementById("bookmark-stack-popup")?.remove()

  // 1. Render Group Tabs
  renderGroupTabs()

  // 2. Render Bookmarks for Active Group
  const bookmarks = getBookmarks()

  // Use Document Fragment to prevent multiple reflows / layout shifts
  const frag = document.createDocumentFragment()
  
  if (currentFolderStack.length > 0) {
    const breadcrumb = document.createElement("div");
    breadcrumb.className = "bookmark-breadcrumb";
    breadcrumb.style.gridColumn = "1 / -1";
    breadcrumb.style.display = "flex";
    breadcrumb.style.alignItems = "center";
    breadcrumb.style.gap = "10px";
    breadcrumb.style.marginBottom = "20px";
    breadcrumb.style.padding = "10px 16px";
    breadcrumb.style.background = "rgba(255,255,255,0.05)";
    breadcrumb.style.borderRadius = "12px";
    
    const backBtn = document.createElement("button");
    backBtn.innerHTML = "<i class=\"fa-solid fa-arrow-left\"></i> Back";
    backBtn.style.padding = "6px 12px";
    backBtn.style.background = "rgba(255,255,255,0.1)";
    backBtn.style.border = "none";
    backBtn.style.borderRadius = "8px";
    backBtn.style.color = "white";
    backBtn.style.cursor = "pointer";
    backBtn.onclick = () => {
      currentFolderStack.pop();
      renderBookmarks();
    };
    
    const pathText = document.createElement("span");
    pathText.style.color = "rgba(255,255,255,0.7)";
    pathText.style.fontWeight = "500";
    pathText.textContent = currentFolderStack.map(f => f.title).join(" > ");
    
    breadcrumb.appendChild(backBtn);
    breadcrumb.appendChild(pathText);
    frag.appendChild(breadcrumb);
  }

  const enableDrag = settings.bookmarkEnableDrag === true

  bookmarks.forEach((bookmark, index) => {
    const isStack = isBookmarkStack(bookmark)
    const bookmarkEl = document.createElement(isStack ? "button" : "a")
    if (isStack) {
      bookmarkEl.type = "button"
      bookmarkEl.setAttribute("aria-haspopup", "dialog")
      bookmarkEl.setAttribute(
        "aria-label",
        `${getBookmarkLabel(bookmark)} (${bookmark.items.length})`,
      )
    } else {
      applyBookmarkLinkBehavior(bookmarkEl, bookmark.url)
    }
    bookmarkEl.classList.add("bookmark")
    if (isStack) bookmarkEl.classList.add("bookmark-stack")
    bookmarkEl.dataset.index = index // Always set index for selection and identification

    if (selectedIndices.has(index)) {
      bookmarkEl.classList.add("selected")
    }

    if (enableDrag) {
      bookmarkEl.draggable = true
      bookmarkEl.addEventListener("dragstart", handleDragStart)
      bookmarkEl.addEventListener("dragover", handleDragOver)
      bookmarkEl.addEventListener("drop", handleDrop)
      bookmarkEl.addEventListener("dragenter", handleDragEnter)
      bookmarkEl.addEventListener("dragleave", handleDragLeave)
      bookmarkEl.addEventListener("dragend", handleDragEnd)
    }

    const titleEl = document.createElement("span")
    titleEl.textContent = getBookmarkLabel(bookmark)
    if (isStack) {
      bookmarkEl.appendChild(createBookmarkStackIcon(bookmark))
    } else {
      bookmarkEl.appendChild(createBookmarkIcon(bookmark))
    }
    bookmarkEl.appendChild(titleEl)

    bookmarkEl.addEventListener("click", async (e) => {
      // Allow clicking specifically if they are selection clicks or opening a stack.
      if (isSelectionMode) {
        e.preventDefault()
        if (selectedIndices.has(index)) {
          selectedIndices.delete(index)
        } else {
          selectedIndices.add(index)
        }
        renderBookmarks()
        updateSelectionUI()
        return
      }

      if (
        bookmarkEl.classList.contains("dragging") ||
        draggedBookmarkIndices.length > 0
      ) {
        e.preventDefault()
        return
      }

      if (isStack) {
        e.preventDefault()
        openBookmarkStackPopup(bookmark, bookmarkEl, index)
        return
      }

      await promptBookmarkOpenBehaviorOnClick(e, bookmark.url)
    })

    bookmarkEl.addEventListener("contextmenu", (e) => {
      e.preventDefault()
      if (isSelectionMode) return
      if (isStack) {
        showContextMenu(
          e.clientX,
          e.clientY,
          index,
          "bookmarkStack",
          bookmark.id,
          {
            onEdit: async () => {
              openBookmarkStackEditPopover(index, bookmarkEl)
            },
            onEditIcon: () => {
              openBookmarkStackEditPopover(index, bookmarkEl, { focus: "icon" })
            },
            onDelete: async () => {
              const currentI18n = geti18n()
              const confirmed = await showConfirm(
                `${currentI18n.alert_delete_confirm || "Delete"} "${getBookmarkLabel(bookmark)}"?`,
              )
              if (confirmed) {
                const snapshot = captureBookmarkSnapshot()
                bookmarks.splice(index, 1)
                setBookmarks(bookmarks)
                saveBookmarks()
                renderBookmarks()
                showBookmarkUndo(
                  currentI18n.bookmark_group_deleted || "Group deleted",
                  snapshot,
                )
              }
            },
          },
        )
      } else {
        showContextMenu(e.clientX, e.clientY, index, "bookmark", null, {
          anchor: bookmarkEl,
        })
      }
    })
    frag.appendChild(bookmarkEl)
  })

  if (settings.showAddBookmarkButton !== false) {
    const addBtn = document.createElement("button")
    addBtn.className = "add-bookmark-card"
    addBtn.setAttribute("aria-label", i18n.modal_add_title || "Add Bookmark")
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>'
    addBtn.addEventListener("click", () => {
      const bookmarks = getBookmarks()
      const settings = getSettings()
      const currentI18n = geti18n()
      if (settings.bookmarkLimit20 !== false && bookmarks.length >= 20) {
        showAlert(
          currentI18n.alert_bookmark_limit_reached ||
            "This group already has 20 bookmarks!",
        )
        return
      }
      openModal(null)
    })
    addBtn.addEventListener("dragover", handleAddBookmarkDragOver)
    addBtn.addEventListener("drop", handleAddBookmarkDrop)
    addBtn.addEventListener("dragleave", function () {
      clearBookmarkDropClasses(this)
    })
    frag.appendChild(addBtn)
  }

  // Clear and update DOM once
  bookmarksContainer.innerHTML = ""
  bookmarksContainer.appendChild(frag)

  if (enableDrag && !bookmarksContainer.dataset.dragListenerBound) {
    bookmarksContainer.dataset.dragListenerBound = "true"
    bookmarksContainer.addEventListener("dragover", (e) => {
      if (draggedStackItems && draggedStackItems.length > 0) {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
      }
    })
    bookmarksContainer.addEventListener("drop", (e) => {
      if ((e.target === bookmarksContainer || !e.target.closest(".bookmark")) && draggedStackItems && draggedStackItems.length > 0) {
        e.preventDefault()
        e.stopPropagation()
        const snapshot = captureBookmarkSnapshot()
        const extracted = takeDraggedStackItems()
        if (!extracted?.items || extracted.items.length === 0) return
        extracted.bookmarks.push(...extracted.items)
        setBookmarks(extracted.bookmarks)
        saveBookmarks()
        document.getElementById("bookmark-stack-popup")?.remove()
        cancelSelection()
        renderBookmarks()
        showBookmarkUndo(geti18n().bookmark_moved || "Bookmarks moved", snapshot)
      }
    })
  }

  // Use requestAnimationFrame so UI can render before calculations
  requestAnimationFrame(() => {
    // PHASE 1: READS (Forces 1 layout calculation)
    let animReads = null
    let containerRect = null
    if (pendingFolderBookmarkReveal) {
      const items = Array.from(
        bookmarksContainer.querySelectorAll(".bookmark, .add-bookmark-card"),
      )
      animReads = items.map((item) => ({
        item,
        rect: item.getBoundingClientRect(),
      }))
      containerRect = bookmarksContainer.getBoundingClientRect()
    }

    // updateOverflowBookmarks reads layout (fast since layout is fresh) then writes (mutates DOM)
    updateOverflowBookmarks(true) // true = skip early overflow mutation

    // PHASE 2: WRITES
    if (pendingFolderBookmarkReveal) {
      // Filter out items that were hidden by updateOverflowBookmarks
      const visibleAnimReads = animReads.filter(
        (read) => read.item.style.display !== "none" && !read.item.classList.contains("overflow-indicator")
      )
      animateBookmarksForFolderSwitch(visibleAnimReads, containerRect)
    }
  })
}

export function updateOverflowBookmarks(skipEarlyOverflowMutation = false) {
  const i18n = geti18n()
  const container = document.getElementById("bookmarks-container")
  if (!container) return

  const isMinimalModeMatch = document.body.className.match(
    /bookmark-(sidebar|taskbar|taskbar-top|taskbar-left|taskbar-right)-mode/,
  )

  // Cleanup previously hidden items and indicator
  const existingIndicator = container.querySelector(".overflow-indicator")
  if (existingIndicator) existingIndicator.remove()

  // Cleanup popup if exists
  const existingPopup = document.getElementById("hidden-bookmarks-popup")
  if (existingPopup) existingPopup.remove()

  const children = Array.from(container.children)
  children.forEach((c) => {
    if (
      c.classList.contains("bookmark") ||
      c.classList.contains("add-bookmark-card")
    ) {
      if (c.style.display !== "") c.style.display = ""
    }
  })

  const mode = isMinimalModeMatch ? isMinimalModeMatch[1] : "default"
  const isDefault = mode === "default"
  const isSidebar = mode === "sidebar"
  const isTaskbarTop = mode === "taskbar-top"
  const isTaskbarLeft = mode === "taskbar-left"
  const isTaskbarRight = mode === "taskbar-right"

  if (!skipEarlyOverflowMutation) {
    if (!isDefault) {
      if (container.style.overflow !== "hidden") container.style.overflow = "hidden"
    } else {
      if (container.style.overflow !== "") container.style.overflow = ""
    }
  }

  const addBtn = children.find((child) =>
    child.classList.contains("add-bookmark-card"),
  )
  const overflowItems = children.filter(
    (child) =>
      child.classList.contains("bookmark") &&
      !child.classList.contains("add-bookmark-card") &&
      !child.classList.contains("overflow-indicator"),
  )

  let requiredHiddenCount = 0

  if (isDefault) {
    if (overflowItems.length > 25) requiredHiddenCount = overflowItems.length - 25
  } else if (overflowItems.length > 0) {
    const firstItem = overflowItems[0]
    if (isSidebar) {
      if (overflowItems.length > 10) {
        requiredHiddenCount = overflowItems.length - 10
      }
      const overflowAmt = container.scrollHeight - container.clientHeight
      if (overflowAmt > 2) {
        const itemH = firstItem.offsetHeight + 12 // estimate gap
        const overflowHiddenCount = Math.ceil((overflowAmt + itemH) / itemH)
        requiredHiddenCount = Math.max(requiredHiddenCount, overflowHiddenCount)
      }
    } else {
      let limit = 12
      if (isTaskbarLeft || isTaskbarRight) {
        limit = 9
      }
      if (overflowItems.length > limit) {
        requiredHiddenCount = overflowItems.length - limit
      }
      // Taskbars are forced to vertical layout via CSS override, so we must check vertical overflow (scrollHeight)
      const overflowAmt = container.scrollHeight - container.clientHeight
      if (overflowAmt > 2 || (isTaskbarRight && container.getBoundingClientRect().top > firstItem.getBoundingClientRect().top)) {
        const itemH = firstItem.offsetHeight + 12
        let actualOverflow = overflowAmt
        if (isTaskbarRight) {
          const cRect = container.getBoundingClientRect()
          const fRect = firstItem.getBoundingClientRect()
          if (fRect.top < cRect.top) actualOverflow = Math.max(overflowAmt, cRect.top - fRect.top)
        }
        if (actualOverflow > 2) {
          const overflowHiddenCount = Math.ceil((actualOverflow + itemH) / itemH)
          requiredHiddenCount = Math.max(requiredHiddenCount, overflowHiddenCount)
        }
      }
    }
  }

  // Bounds check
  if (requiredHiddenCount > overflowItems.length) requiredHiddenCount = overflowItems.length
  if (requiredHiddenCount < 0) requiredHiddenCount = 0

  if (requiredHiddenCount === 0) {
    container.style.overflow = ""
    const bw = document.getElementById("bookmark-widget")
    if (bw && bw.classList.contains("no-transition")) {
      requestAnimationFrame(() => bw.classList.remove("no-transition"))
    }
    return
  }

  container.style.overflow = "visible"

  let hiddenCount = 0
  const hiddenElements = []

  const indicator = document.createElement("div")
  indicator.className = "bookmark overflow-indicator"
  indicator.title = i18n.bookmark_show_hidden || "Show hidden bookmarks"
  indicator.style.cursor = "pointer"

  const fallback = document.createElement("div")
  fallback.className = "bookmark-icon-fallback"
  fallback.style.display = "flex"
  fallback.style.justifyContent = "center"
  fallback.style.alignItems = "center"
  fallback.style.fontSize = "1.05rem"
  fallback.style.fontWeight = "bold"
  fallback.style.background = "rgba(255, 255, 255, 0.12)"
  fallback.style.border = "1px solid rgba(255, 255, 255, 0.2)"
  fallback.style.backdropFilter = "blur(16px) saturate(155%)"
  fallback.style.boxShadow = "inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 8px 22px rgba(0, 0, 0, 0.16)"
  indicator.appendChild(fallback)

  if (isSidebar || isTaskbarRight) {
    container.insertBefore(indicator, container.firstChild)
  } else if (addBtn) {
    container.insertBefore(indicator, addBtn)
  } else {
    container.appendChild(indicator)
  }

  let ans = requiredHiddenCount
  
  if (isTaskbarRight) {
    for (let i = 0; i < ans; i++) {
      const el = overflowItems[i]
      el.style.display = "none"
      hiddenElements.push(el)
      hiddenCount++
    }
  } else {
    for (let i = overflowItems.length - 1; i >= overflowItems.length - ans; i--) {
      const el = overflowItems[i]
      el.style.display = "none"
      hiddenElements.unshift(el)
      hiddenCount++
    }
  }
  fallback.textContent = "+" + hiddenCount

  // Click handler to show sub-popup
  indicator.addEventListener("click", (e) => {
    e.stopPropagation()
    let popup = document.getElementById("hidden-bookmarks-popup")
    if (popup) {
      popup.remove()
      return // Toggle off
    }

    popup = document.createElement("div")
    popup.id = "hidden-bookmarks-popup"
    popup.className = isSidebar
      ? "hidden-bookmarks-sidebar"
      : "hidden-bookmarks-taskbar"

    // Clone elements into popup
    hiddenElements.forEach((el) => {
      const clone = el.cloneNode(true)
      clone.style.display = ""
      
      const imgs = clone.querySelectorAll('.bookmark-icon')
      imgs.forEach(img => {
        if (img.src && img.src.startsWith('data:image/gif')) {
           getFaviconObserver().observe(img)
        }
      })
      if (getSettings().bookmarkEnableDrag === true) {
        clone.draggable = true
        clone.addEventListener("dragstart", handleDragStart)
        clone.addEventListener("dragover", handleDragOver)
        clone.addEventListener("drop", handleDrop)
        clone.addEventListener("dragenter", handleDragEnter)
        clone.addEventListener("dragleave", handleDragLeave)
        clone.addEventListener("dragend", handleDragEnd)
      } else {
        clone.draggable = false
      }
      clone.classList.remove("dragging", "drag-over")

      // CRITICAL: Ensure index is explicitly set on the clone
      const idx = el.dataset.index
      if (idx !== undefined) {
        clone.setAttribute("data-index", idx)
        clone.dataset.index = idx
      }

      // Add selection state class initially
      const numericIdx = parseInt(idx)
      if (!isNaN(numericIdx) && selectedIndices.has(numericIdx)) {
        clone.classList.add("selected")
      }

      clone.addEventListener("contextmenu", (evt) => {
        evt.preventDefault()
        const simulatedEvt = new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: evt.clientX,
          clientY: evt.clientY,
        })
        el.dispatchEvent(simulatedEvt)
      })

      popup.appendChild(clone)
    })

    // Handle clicks inside popup with delegation
    popup.addEventListener(
      "click",
      (evt) => {
        const bookmarkEl = evt.target.closest(".bookmark")
        if (!bookmarkEl) return

        const idxStr =
          bookmarkEl.getAttribute("data-index") || bookmarkEl.dataset.index
        const idx = parseInt(idxStr)

        if (isNaN(idx)) return

        if (isSelectionMode) {
          evt.preventDefault()
          evt.stopPropagation()

          if (selectedIndices.has(idx)) {
            selectedIndices.delete(idx)
            bookmarkEl.classList.remove("selected")
            // Sync original hidden element in the main container
            const original = container.querySelector(
              `.bookmark[data-index="${idx}"]`,
            )
            if (original) original.classList.remove("selected")
          } else {
            selectedIndices.add(idx)
            bookmarkEl.classList.add("selected")
            // Sync original hidden element in the main container
            const original = container.querySelector(
              `.bookmark[data-index="${idx}"]`,
            )
            if (original) original.classList.add("selected")
          }

          updateSelectionUI()
          return false
        } else {
          if (bookmarkEl.classList.contains("bookmark-stack")) {
            evt.preventDefault()
            evt.stopPropagation()
            const bookmarks = getBookmarks()
            const stack = bookmarks[idx]
            if (stack && isBookmarkStack(stack)) {
              openBookmarkStackPopup(stack, bookmarkEl, idx)
            } else {
              const original = container.querySelector(
                `.bookmark[data-index="${idx}"]`,
              )
              if (original) original.click()
            }
            popup.remove()
            return false
          }
          // Normal mode: close popup
          setTimeout(() => popup.remove(), 100)
        }
      },
      true,
    ) // Use capture phase to intercept clicks

    document.body.appendChild(popup)

    // Calculate position relative to indicator
    const rect = indicator.getBoundingClientRect()
    const popupRect = popup.getBoundingClientRect()

    if (isSidebar) {
      // Align top of popup with the indicator, with a small 5px offset down
      let top = rect.top + 5

      // Responsive check: if popup exceeds viewport bottom, pull it up
      if (top + popupRect.height > window.innerHeight - 20) {
        top = window.innerHeight - popupRect.height - 20
      }

      // Clamping top to ensure it's never above viewport
      popup.style.top = Math.max(20, top) + "px"

      const isFlipped = document.body.classList.contains("flip-layout")
      if (isFlipped) {
        popup.style.left = rect.right + 15 + "px" // Expand to right
      } else {
        popup.style.right = window.innerWidth - rect.left + 15 + "px" // Expand to left
      }
    } else if (isTaskbarTop || isDefault) {
      popup.style.top = rect.bottom + 15 + "px"
      popup.style.left =
        Math.max(20, rect.left - popupRect.width / 2 + rect.width / 2) + "px"
    } else {
      // Taskbar cases (bottom)
      const isTaskbarLeft = mode === "taskbar-left"
      const isTaskbarRight = mode === "taskbar-right"
      popup.style.bottom = window.innerHeight - rect.top + 15 + "px"

      if (isTaskbarLeft) {
        popup.style.left = rect.left + "px"
      } else if (isTaskbarRight) {
        popup.style.right = "auto"
        popup.style.left = rect.left + "px"
      } else {
        popup.style.left =
          Math.max(20, rect.left - popupRect.width / 2 + rect.width / 2) + "px"
      }
    }

    // Close popup when clicking outside
    const closePopup = (evt) => {
      const contextMenu = document.getElementById("context-menu")
      const isClickOnContextMenu =
        contextMenu && contextMenu.contains(evt.target)

      if (
        !popup.contains(evt.target) &&
        !indicator.contains(evt.target) &&
        !isClickOnContextMenu
      ) {
        popup.remove()
        document.removeEventListener("click", closePopup)
      }
    }

    // Small delay to prevent immediate trigger
    setTimeout(() => document.addEventListener("click", closePopup), 50)
  })

  // Finally show the widget after calculations (prevent FOUC and jumpy positioning)
  const bw = document.getElementById("bookmark-widget")
  if (bw && bw.classList.contains("no-transition")) {
    // Double requestAnimationFrame ensures that the styles are applied and the layout is calculated
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bw.classList.remove("no-transition")
        // Signal that layout is stable
        window.dispatchEvent(new CustomEvent("bookmarksReady"))
      })
    })
  } else {
    // If already initialized, still signal readiness
    window.dispatchEvent(new CustomEvent("bookmarksReady"))
  }
}

function getGroupIcon(name) {
  const lower = name.toLowerCase()
  if (/social|friend|chat|mạng xã hội/.test(lower)) return "fa-users"
  if (/work|office|job|công việc/.test(lower)) return "fa-briefcase"
  if (/game|play|trò chơi/.test(lower)) return "fa-gamepad"
  if (/music|audio|song|nhạc/.test(lower)) return "fa-music"
  if (/video|movie|film|youtube|phim/.test(lower)) return "fa-video"
  if (/read|book|sách|truyện/.test(lower)) return "fa-book"
  if (/code|dev|program|lập trình/.test(lower)) return "fa-code"
  if (/shop|buy|store|mua sắm/.test(lower)) return "fa-cart-shopping"
  if (/tech|it|công nghệ/.test(lower)) return "fa-microchip"
  if (/news|báo|tin tức/.test(lower)) return "fa-newspaper"
  if (/learn|study|học/.test(lower)) return "fa-graduation-cap"
  if (/tool|công cụ/.test(lower)) return "fa-wrench"
  if (/pic|img|photo|ảnh/.test(lower)) return "fa-image"
  if (/art|design|thiết kế/.test(lower)) return "fa-palette"
  if (/finance|bank|money|tiền|tài chính/.test(lower))
    return "fa-money-bill-wave"
  if (/main|chính|1/.test(lower)) return "fa-home"
  if (/travel|trip|du lịch/.test(lower)) return "fa-plane"
  if (/ai|gpt|gemini|claude/.test(lower)) return "fa-robot"
  if (/mail|inbox|thư/.test(lower)) return "fa-envelope"
  return "fa-folder" // Default icon
}

function getGroupTabAnimationRect(tab) {
  if (!tab || !bookmarkGroupsContainer) return null
  const tabRect = tab.getBoundingClientRect()
  const containerRect = bookmarkGroupsContainer.getBoundingClientRect()
  return {
    x: tabRect.left - containerRect.left + bookmarkGroupsContainer.scrollLeft,
    y: tabRect.top - containerRect.top + bookmarkGroupsContainer.scrollTop,
    width: tabRect.width,
    height: tabRect.height,
  }
}

function getGroupTabRunnerMetrics(rect, orientation) {
  if (orientation === "right") {
    return {
      x: rect.x + rect.width - 2,
      y: rect.y + 8,
      width: 2,
      height: Math.max(12, rect.height - 16),
    }
  }

  return {
    x: rect.x + 10,
    y: orientation === "top" ? rect.y : rect.y + rect.height - 2,
    width: Math.max(18, rect.width - 20),
    height: 2,
  }
}

function getGroupTabRunnerOrientation() {
  if (document.body.classList.contains("bookmark-sidebar-mode")) return "right"
  if (document.body.classList.contains("bookmark-taskbar-top-mode"))
    return "top"
  return "bottom"
}

function setGroupTabRunnerGeometry(runner, metrics) {
  runner.style.width = `${metrics.width}px`
  runner.style.height = `${metrics.height}px`
  runner.style.transform = `translate3d(${metrics.x}px, ${metrics.y}px, 0)`
}

function animateGroupTabActiveRunner() {
  if (!pendingGroupTabActiveAnimation || !bookmarkGroupsContainer) return

  const activeTab = bookmarkGroupsContainer.querySelector(
    ".bookmark-group-tab.active",
  )
  if (!activeTab) {
    pendingGroupTabActiveAnimation = null
    return
  }

  const fromRect = pendingGroupTabActiveAnimation.fromRect
  const toRect = getGroupTabAnimationRect(activeTab)
  pendingGroupTabActiveAnimation = null

  if (
    !fromRect ||
    !toRect ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  ) {
    return
  }

  const shouldUseRunner =
    document.body.classList.contains("bookmark-group-tab-bg-transparent") &&
    !document.body.classList.contains("bookmark-group-accent-enabled")

  if (!shouldUseRunner) {
    activeTab.classList.add("is-activating-bg")
    window.setTimeout(() => {
      activeTab.classList.remove("is-activating-bg")
    }, 340)
    return
  }

  const orientation = getGroupTabRunnerOrientation()
  const fromMetrics = getGroupTabRunnerMetrics(fromRect, orientation)
  const toMetrics = getGroupTabRunnerMetrics(toRect, orientation)
  const runner = document.createElement("span")
  runner.className = `bookmark-group-active-runner ${orientation}`
  runner.setAttribute("aria-hidden", "true")
  setGroupTabRunnerGeometry(runner, fromMetrics)
  bookmarkGroupsContainer.appendChild(runner)

  requestAnimationFrame(() => {
    runner.classList.add("is-moving")
    setGroupTabRunnerGeometry(runner, toMetrics)
  })

  window.setTimeout(() => {
    runner.classList.add("is-fading")
    window.setTimeout(() => runner.remove(), 180)
  }, 330)
}

function animateBookmarksForFolderSwitch(animReads, containerRect) {
  if (!bookmarksContainer) return
  pendingFolderBookmarkReveal = false

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return

  if (!animReads || animReads.length === 0) return

  const isVertical = document.body.classList.contains("bookmark-sidebar-mode")
  const isHorizontal =
    document.body.classList.contains("bookmark-taskbar-mode") ||
    document.body.classList.contains("bookmark-taskbar-top-mode") ||
    document.body.classList.contains("bookmark-taskbar-left-mode") ||
    document.body.classList.contains("bookmark-taskbar-right-mode")
  const isGrid = !isVertical && !isHorizontal

  const centerX = containerRect.left + containerRect.width / 2
  const centerY = containerRect.top + containerRect.height / 2
  const center = isVertical
    ? containerRect.top + containerRect.height / 2
    : containerRect.left + containerRect.width / 2

  const itemMeta = animReads.map(({ item, rect }) => {
    const itemCenterX = rect.left + rect.width / 2
    const itemCenterY = rect.top + rect.height / 2
    const itemCenter = isVertical
      ? rect.top + rect.height / 2
      : rect.left + rect.width / 2
    return {
      item,
      distance: isGrid
        ? Math.sqrt((itemCenterX - centerX) ** 2 + (itemCenterY - centerY) ** 2)
        : Math.abs(itemCenter - center),
      offsetX: Math.max(-72, Math.min(72, centerX - itemCenterX)),
      offsetY: Math.max(-72, Math.min(72, centerY - itemCenterY)),
      offset: Math.max(-72, Math.min(72, center - itemCenter)),
    }
  })

  itemMeta
    .sort((a, b) => a.distance - b.distance)
    .forEach(({ item, offsetX, offsetY, offset }, order) => {
      item.classList.remove("bookmark-folder-reveal")
      
      let x = "0px"
      let y = "0px"
      if (isGrid) {
        x = `${offsetX}px`
        y = `${offsetY}px`
      } else if (isVertical) {
        y = `${offset}px`
      } else {
        x = `${offset}px`
      }

      item.style.setProperty("--bookmark-folder-reveal-x", x)
      item.style.setProperty("--bookmark-folder-reveal-y", y)
      item.style.setProperty(
        "--bookmark-folder-reveal-delay",
        `${Math.min(order * 22, 180)}ms`,
      )

      requestAnimationFrame(() => {
        item.classList.add("bookmark-folder-reveal")
        window.setTimeout(() => {
          item.classList.remove("bookmark-folder-reveal")
          item.style.removeProperty("--bookmark-folder-reveal-x")
          item.style.removeProperty("--bookmark-folder-reveal-y")
          item.style.removeProperty("--bookmark-folder-reveal-delay")
        }, 620)
      })
    })
}

function closeHiddenGroupsPopup() {
  const existing = document.getElementById("hidden-groups-popup")
  if (existing) {
    existing.remove()
  }
}

function openHiddenGroupsPopup(anchor, hiddenGroups, activeId, enableDrag) {
  const existing = document.getElementById("hidden-groups-popup")
  if (existing) {
    existing.remove()
    return
  }

  document.getElementById("hidden-bookmarks-popup")?.remove()

  const popup = document.createElement("div")
  popup.id = "hidden-groups-popup"
  popup.className = "hidden-groups-popup"

  const i18n = geti18n()

  const header = document.createElement("div")
  header.className = "hidden-groups-popup-header"

  const title = document.createElement("span")
  title.className = "hidden-groups-popup-title"
  title.innerHTML = `<i class="fa-solid fa-layer-group"></i> ${i18n.more_groups || "Other Groups"} (${hiddenGroups.length})`
  header.appendChild(title)

  const closeBtn = document.createElement("button")
  closeBtn.type = "button"
  closeBtn.className = "hidden-groups-popup-close-btn"
  closeBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`
  closeBtn.addEventListener("click", closeHiddenGroupsPopup)
  header.appendChild(closeBtn)
  popup.appendChild(header)

  const list = document.createElement("div")
  list.className = "hidden-groups-popup-list"

  hiddenGroups.forEach((group, idx) => {
    const realIndex = 8 + idx
    const tabEl = createGroupTabElement(group, realIndex, activeId, enableDrag, true)
    list.appendChild(tabEl)
  })

  popup.appendChild(list)
  document.body.appendChild(popup)

  // Position adjacent to anchor with boundary checking
  requestAnimationFrame(() => {
    const anchorRect = anchor.getBoundingClientRect()
    const pRect = popup.getBoundingClientRect()
    const isTaskbarTop = document.body.classList.contains("bookmark-taskbar-top-mode")

    let left = anchorRect.left + (anchorRect.width / 2) - (pRect.width / 2)
    left = Math.max(12, Math.min(left, window.innerWidth - pRect.width - 12))

    let top
    if (isTaskbarTop) {
      top = anchorRect.bottom + 8
    } else {
      top = anchorRect.top - pRect.height - 8
      if (top < 12) {
        top = anchorRect.bottom + 8
      }
    }

    popup.style.left = `${left}px`
    popup.style.top = `${top}px`
  })

  const onDocClick = (e) => {
    if (!popup.contains(e.target) && !anchor.contains(e.target)) {
      closeHiddenGroupsPopup()
      document.removeEventListener("click", onDocClick)
    }
  }
  setTimeout(() => document.addEventListener("click", onDocClick), 50)
}

function createGroupTabElement(group, index, activeId, enableDrag, isInsidePopup = false) {
  const currentI18n = geti18n()
  const tab = document.createElement("div")
  tab.className = `bookmark-group-tab ${group.id === activeId ? "active" : ""}`
  tab.dataset.index = index
  tab.dataset.count = Array.isArray(group.items) ? group.items.length : 0
  tab.title = group.name
  tab.setAttribute("role", "button")
  tab.setAttribute("aria-pressed", String(group.id === activeId))

  if (enableDrag) {
    tab.draggable = true
    tab.addEventListener("dragstart", handleGroupDragStart)
    tab.addEventListener("dragover", handleDragOver)
    tab.addEventListener("drop", handleGroupDrop)
    tab.addEventListener("dragenter", handleDragEnter)
    tab.addEventListener("dragleave", handleDragLeave)
    tab.addEventListener("dragend", handleDragEnd)
  }

  // Representative Icon
  const icon = group.icon
    ? createStoredIconElement(group.icon, group.name)
    : document.createElement("i")
  if (group.icon) {
    icon.classList.add("group-tab-icon", "custom-group-tab-icon")
  } else {
    icon.className = `fa-solid ${getGroupIcon(group.name)} group-tab-icon`
  }
  if (group.iconColor) {
    tab.style.setProperty("--bookmark-group-icon-color", group.iconColor)
  }
  tab.appendChild(icon)

  // Name Span (for double-click edit)
  const nameSpan = document.createElement("span")
  nameSpan.textContent = group.name
  nameSpan.className = "group-tab-name"
  nameSpan.style.flexGrow = "1"
  nameSpan.style.marginRight = "8px"
  tab.appendChild(nameSpan)
  
  const hasNestedFolder = Array.isArray(group.items) && group.items.some(item => item && item.type === "stack");
  if (hasNestedFolder) {
    const folderMarker = document.createElement("i");
    folderMarker.className = "fa-solid fa-folder-tree group-tab-folder-marker";
    folderMarker.title = currentI18n.bookmark_contains_folders || "Contains nested folders";
    folderMarker.style.fontSize = "11px";
    folderMarker.style.marginRight = "6px";
    folderMarker.style.opacity = "0.7";
    tab.appendChild(folderMarker);
  }

  const countBadge = document.createElement("small")
  countBadge.className = "group-tab-count"
  countBadge.textContent = String(tab.dataset.count)
  countBadge.setAttribute("aria-label", `${tab.dataset.count} bookmarks`)
  tab.appendChild(countBadge)

  // Events
  tab.addEventListener("click", () => {
    if (group.id !== activeId) {
      if (isSelectionMode) cancelSelection()
      pendingGroupTabActiveAnimation = {
        fromRect: getGroupTabAnimationRect(
          bookmarkGroupsContainer.querySelector(".bookmark-group-tab.active"),
        ),
      }
      pendingFolderBookmarkReveal = true
      setActiveGroupId(group.id)
      renderBookmarks()
    }
    if (isInsidePopup) {
      closeHiddenGroupsPopup()
    }
  })

  // Rename (Double Click) - Keeping as valid shortcut
  tab.addEventListener("dblclick", async () => {
    const newName = await showPrompt(
      currentI18n.prompt_rename_group || "Enter new group name:",
      group.name,
    )
    if (newName && newName.trim() !== "") {
      const snapshot = captureBookmarkSnapshot()
      group.name = newName.trim()
      saveBookmarks()
      renderBookmarks() // Re-render tabs
      showBookmarkUndo(
        currentI18n.bookmark_group_renamed || "Group renamed",
        snapshot,
      )
    }
  })

  // Context Menu (Right Click)
  tab.addEventListener("contextmenu", (e) => {
    e.preventDefault()
    const allGroups = getBookmarkGroups()
    const realIndex = allGroups.indexOf(group) >= 0 ? allGroups.indexOf(group) : index
    showContextMenu(e.clientX, e.clientY, realIndex, "group", group.id, {
      anchor: tab,
      onEdit: () => openBookmarkGroupEditPopover(group.id, tab),
      onEditIcon: () =>
        openBookmarkGroupEditPopover(group.id, tab, { focus: "icon" }),
    })
  })

  return tab
}

function renderGroupTabs() {
  const groups = getBookmarkGroups()
  const activeId = getActiveGroupId()
  const settings = getSettings()
  const enableDrag = settings.bookmarkEnableDrag === true
  bookmarkGroupsContainer.innerHTML = ""

  const isSidebar = document.body.classList.contains("bookmark-sidebar-mode") || settings.bookmarkLayout === "sidebar"
  const MAX_VISIBLE_GROUPS = 8
  const shouldCollapse = !isSidebar && groups.length > MAX_VISIBLE_GROUPS

  let visibleGroups = groups
  let hiddenGroups = []

  if (shouldCollapse) {
    visibleGroups = groups.slice(0, MAX_VISIBLE_GROUPS)
    hiddenGroups = groups.slice(MAX_VISIBLE_GROUPS)
  }

  visibleGroups.forEach((group, index) => {
    const tab = createGroupTabElement(group, index, activeId, enableDrag, false)
    bookmarkGroupsContainer.appendChild(tab)
  })

  // If there are overflow hidden groups, add the "More Groups" toggle tab
  if (shouldCollapse && hiddenGroups.length > 0) {
    const activeHiddenGroup = hiddenGroups.find((g) => g.id === activeId)
    const isHiddenActive = !!activeHiddenGroup
    const currentI18n = geti18n()

    const moreTab = document.createElement("div")
    moreTab.className = `bookmark-group-tab bookmark-groups-more-tab ${isHiddenActive ? "active has-active-hidden" : ""}`
    moreTab.setAttribute("role", "button")
    moreTab.setAttribute("aria-label", `${hiddenGroups.length} more bookmark groups`)
    moreTab.title = isHiddenActive
      ? `${activeHiddenGroup.name} (${hiddenGroups.length} other groups)`
      : `${currentI18n.more_groups || "Other groups"} (+${hiddenGroups.length})`

    const moreIcon = isHiddenActive && activeHiddenGroup.icon
      ? createStoredIconElement(activeHiddenGroup.icon, activeHiddenGroup.name)
      : document.createElement("i")
    
    if (isHiddenActive && activeHiddenGroup.icon) {
      moreIcon.classList.add("group-tab-icon", "custom-group-tab-icon")
    } else if (isHiddenActive) {
      moreIcon.className = `fa-solid ${getGroupIcon(activeHiddenGroup.name)} group-tab-icon`
    } else {
      moreIcon.className = "fa-solid fa-layer-group group-tab-icon"
    }
    moreTab.appendChild(moreIcon)

    const moreName = document.createElement("span")
    moreName.className = "group-tab-name"
    moreName.textContent = isHiddenActive
      ? activeHiddenGroup.name
      : (currentI18n.more_groups || "More")
    moreName.style.flexGrow = "1"
    moreName.style.marginRight = "6px"
    moreTab.appendChild(moreName)

    const moreBadge = document.createElement("small")
    moreBadge.className = "group-tab-count"
    moreBadge.textContent = isHiddenActive
      ? String(Array.isArray(activeHiddenGroup.items) ? activeHiddenGroup.items.length : 0)
      : `+${hiddenGroups.length}`
    moreTab.appendChild(moreBadge)

    moreTab.addEventListener("click", (e) => {
      e.stopPropagation()
      openHiddenGroupsPopup(moreTab, hiddenGroups, activeId, enableDrag)
    })

    // Allow dropping dragged bookmarks into the more tab / active hidden group
    if (enableDrag) {
      moreTab.addEventListener("dragover", handleDragOver)
      moreTab.addEventListener("dragenter", handleDragEnter)
      moreTab.addEventListener("dragleave", handleDragLeave)
      moreTab.addEventListener("drop", (e) => {
        if (isHiddenActive) {
          const allGroups = getBookmarkGroups()
          const realIdx = allGroups.indexOf(activeHiddenGroup)
          moreTab.dataset.index = realIdx
          handleGroupDrop.call(moreTab, e)
        } else {
          openHiddenGroupsPopup(moreTab, hiddenGroups, activeId, enableDrag)
        }
      })
    }

    bookmarkGroupsContainer.appendChild(moreTab)
  }

  // "Add Group" Tab
  const addTab = document.createElement("div")
  addTab.className = "bookmark-group-tab add-group-tab"
  addTab.innerHTML = '<i class="fa-solid fa-plus"></i>'
  addTab.title = "Add Group"
  addTab.setAttribute("role", "button")
  addTab.setAttribute("aria-label", "Add bookmark group")
  addTab.addEventListener("click", async () => {
    const currentI18n = geti18n()
    const name = await showPrompt(
      currentI18n.prompt_add_group || "Enter group name:",
      (currentI18n.bookmark_group_default_name || "Group {count}").replace(
        "{count}",
        groups.length + 1,
      ),
    )
    if (name) {
      const snapshot = captureBookmarkSnapshot()
      const newGroup = {
        id: `group-${Date.now()}`,
        name:
          name.trim() ||
          (currentI18n.bookmark_group_default_name || "Group {count}").replace(
            "{count}",
            groups.length + 1,
          ),
        items: [],
      }
      groups.push(newGroup)
      setBookmarkGroups(groups)
      pendingGroupTabActiveAnimation = {
        fromRect: getGroupTabAnimationRect(
          bookmarkGroupsContainer.querySelector(".bookmark-group-tab.active"),
        ),
      }
      pendingFolderBookmarkReveal = true
      setActiveGroupId(newGroup.id) // Switch to new group
      renderBookmarks()
      showBookmarkUndo(
        currentI18n.bookmark_group_created || "Group created",
        snapshot,
      )
    }
  })
  bookmarkGroupsContainer.appendChild(addTab)
  requestAnimationFrame(animateGroupTabActiveRunner)
}

export function initBookmarks() {
  renderBookmarks()

  bookmarkGroupsContainer.addEventListener("dragover", (e) => {
    e.preventDefault()
    if (draggedBookmarkIndices.length > 0) {
      e.dataTransfer.dropEffect = "move"
    }
  })

  bookmarkGroupsContainer.addEventListener("drop", (e) => {
    e.preventDefault()
    if (e.target.closest('.bookmark-group-tab') && !e.target.closest('.add-group-tab')) return; // Handled by handleGroupDrop

    if (draggedBookmarkIndices.length > 0) {
      const snapshot = captureBookmarkSnapshot()
      const bookmarks = getBookmarks()
      const groups = getBookmarkGroups()
      
      const sortedIndices = [...draggedBookmarkIndices].sort((a, b) => b - a)
      const draggedItemsOriginal = sortedIndices.map((idx) => bookmarks[idx])

      let createdGroup = false;

      draggedItemsOriginal.forEach((item) => {
        if (isBookmarkStack(item)) {
          createdGroup = true;
          const newGroupId = "group_" + Date.now() + Math.random().toString(36).substring(2, 9);
          groups.push({
            id: newGroupId,
            name: item.title || inferBookmarkStackName(item.items),
            items: item.items || [],
            icon: item.icon,
            iconColor: item.iconColor
          });
        }
      });

      if (createdGroup) {
        for (const idx of sortedIndices) {
          if (isBookmarkStack(bookmarks[idx])) {
            bookmarks.splice(idx, 1);
          }
        }
        setBookmarks(bookmarks);
        setBookmarkGroups(groups);
        saveBookmarks();
        cancelSelection();
        renderGroupTabs();
        renderBookmarks();
        showBookmarkUndo(geti18n().bookmark_group_created || "Group created", snapshot);
      }
    }
  })

  // Selection toolbar events
  const deleteBtn = document.getElementById("bookmark-delete-selected")
  const cancelBtn = document.getElementById("bookmark-cancel-selection")
  const selectAllBtn = document.getElementById("bookmark-select-all")

  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      const bookmarks = getBookmarks()
      if (!isSelectionMode) isSelectionMode = true
      if (selectedIndices.size === bookmarks.length) {
        selectedIndices.clear()
      } else {
        selectedIndices = new Set(bookmarks.map((_, index) => index))
      }
      renderBookmarks()
      updateSelectionUI()
    })
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      deleteSelected()
    })
  }

  const groupBtn = document.getElementById("bookmark-group-selected")
  if (groupBtn) {
    groupBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      groupSelected()
    })
  }

  const moveBtn = document.getElementById("bookmark-move-selected")
  if (moveBtn) {
    moveBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      moveSelected()
    })
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      cancelSelection()
    })
  }

  let resizeTimeout;
  window.addEventListener("resize", () => {
    cachedMacosItems = null
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      requestAnimationFrame(updateOverflowBookmarks)
    }, 150)
  })
  
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const popup = document.getElementById("bookmark-stack-popup")
      if (popup) {
        popup.remove()
        window.dispatchEvent(new CustomEvent("layoutUpdated"))
      }
      if (isSelectionMode) cancelSelection()
    }
  })
  
  window.addEventListener("layoutUpdated", (e) => {
    cachedMacosItems = null
    horizontalScrollCache = new WeakMap()
    if (e.detail && e.detail.key === "forceLayoutSync") {
      requestAnimationFrame(updateOverflowBookmarks)
    }

    if (
      !e.detail ||
      e.detail.key === "bookmarkLayout" ||
      e.detail.key === "bookmarkSidebarMode" ||
      e.detail.key === "bookmarkTheme" ||
      e.detail.key === "showBookmarkGroups" ||
      e.detail.key === "bookmarkLayoutShowGroups"
    ) {
      updateBookmarkGroupsToggleIcon()
      renderGroupTabs()
      requestAnimationFrame(updateOverflowBookmarks)
    }
  })

  document.addEventListener("scroll", () => {
    cachedMacosItems = null
  }, { capture: true, passive: true })

  // FOUC/Layout shift fix: no-transition class is now removed precisely
  // at the end of updateOverflowBookmarks() after first calculation.
}

// MacOS Hover Effect
let macosHoverEnabled = false

export function initMacosHoverForBookmarks(isEnabled) {
  macosHoverEnabled = isEnabled
  if (isEnabled && !document.getElementById("macos-global-tooltip")) {
    const tooltip = document.createElement("div")
    tooltip.id = "macos-global-tooltip"
    document.body.appendChild(tooltip)
  }
}

let mouseX = 0,
  mouseY = 0
let isHoveringContainer = false
let rafId = null

let cachedMacosItems = null
let horizontalScrollCache = new WeakMap()

function updateMacosHover() {
  if (!macosHoverEnabled || !isHoveringContainer) {
    const bookmarks = document.querySelectorAll(".bookmark")
    bookmarks.forEach((item) => {
      if (item.style.transform !== "") {
        item.style.removeProperty("transform")
        item.style.zIndex = ""
      }
    })
    const globalTooltip = document.getElementById("macos-global-tooltip")
    if (globalTooltip) {
      globalTooltip.classList.remove("show")
    }
    const containers = [
      document.querySelector("#bookmarks-container"),
      document.querySelector("#hidden-bookmarks-popup"),
      document.querySelector("#bookmark-stack-popup")
    ].filter(Boolean)
    containers.forEach(c => c.style.removeProperty("z-index"))
    
    cachedMacosItems = null
    rafId = null
    return
  }

  if (!cachedMacosItems) {
    const containers = [
      document.querySelector("#bookmarks-container"),
      document.querySelector("#hidden-bookmarks-popup"),
      document.querySelector("#bookmark-stack-popup")
    ].filter(Boolean)
    
    if (containers.length > 0) {
      const bookmarks = []
      containers.forEach(c => {
        bookmarks.push(...c.querySelectorAll(".bookmark:not(.add-bookmark-card)"))
      })

      // PASS 1: Save and clear all transforms (WRITES only)
      const savedTransforms = bookmarks.map(item => {
        const t = item.style.transform
        if (t) item.style.removeProperty("transform")
        return t
      })

      // PASS 2: Read all rects in one batch — browser only recalculates layout once
      const rects = bookmarks.map(item => item.getBoundingClientRect())

      // PASS 3: Restore all transforms (WRITES only)
      bookmarks.forEach((item, i) => {
        if (savedTransforms[i]) item.style.setProperty("transform", savedTransforms[i], "important")
      })

      cachedMacosItems = bookmarks.map((item, i) => ({
        item,
        centerX: rects[i].left + rects[i].width / 2,
        centerY: rects[i].top + rects[i].height / 2,
        rect: rects[i]
      }))
    } else {
      cachedMacosItems = []
    }
  }

  const isSidebar = document.body.classList.contains("bookmark-sidebar-mode")
  const isFlipped = document.body.classList.contains("flip-layout")

  // MacOS parameters
  const isDefaultLayout = 
    !document.body.classList.contains("bookmark-taskbar-mode") && 
    !document.body.classList.contains("bookmark-taskbar-top-mode") && 
    !document.body.classList.contains("bookmark-taskbar-left-mode") && 
    !document.body.classList.contains("bookmark-taskbar-right-mode") && 
    !document.body.classList.contains("bookmark-sidebar-mode")

  const maxScale = isDefaultLayout ? 1.6 : 1.35
  const range = 80 // Reduced range to limit spread to neighbors

  // PHASE 1: READS (Avoid Layout Thrashing)
  const itemData = cachedMacosItems.map((cache) => {
    const { item, centerX, centerY, rect } = cache
    const dist = Math.sqrt(
      Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2),
    )

    let scale = 1
    if (dist < range) {
      // Sharper falloff to prevent too much spread
      const factor = 1 - dist / range
      const smoothFactor = Math.pow(factor, 2.5) // Higher power = less spread
      scale = 1 + (maxScale - 1) * smoothFactor
    }

    if (item.classList.contains("dragging")) scale = 1

    return { item, scale, rect }
  })

    // PHASE 2: WRITES
    itemData.forEach(({ item, scale }) => {
      // Apply scaling and smooth z-index
      item.style.setProperty("transform", `scale(${scale})`, "important")
      item.style.zIndex = Math.round(scale * 100)
    })
    
    // Update global tooltip for the item under cursor
    const globalTooltip = document.getElementById("macos-global-tooltip")
    if (globalTooltip) {
      // Find the element with highest scale
      let maxData = null
      let highestScale = 1.1 // Minimum scale to show tooltip
      
      itemData.forEach(data => {
        if (data.scale > highestScale) {
          highestScale = data.scale
          maxData = data
        }
      })
      
      if (maxData && highestScale > 1.2) { // Only show if significantly hovered
        const { item, rect } = maxData
        const span = item.querySelector(".bookmark-stack-popup-label, span:not(.bookmark-icon-fallback):not(.bookmark-stack-popup-check):not(.bookmark-stack-count)")
        if (span && span.textContent) {
          globalTooltip.textContent = span.textContent
          
          let topPos = rect.top - 45
          let leftPos = rect.left + rect.width / 2
          
          const isTaskbarTop = document.body.classList.contains("bookmark-taskbar-top-mode")
          const isTaskbarLeft = document.body.classList.contains("bookmark-taskbar-left-mode")
          const isTaskbarRight = document.body.classList.contains("bookmark-taskbar-right-mode")
          
          let translateX = "-50%"
          let translateY = "0%"

          // Handle sidebar and specific taskbar mode positions
          if (isSidebar) {
            if (isFlipped) {
              // Sidebar is on the left side, tooltip should point right
              leftPos = rect.right + 20
              topPos = rect.top + rect.height / 2
              translateX = "0%"
              translateY = "-50%"
            } else {
              // Sidebar is on the right side, tooltip should point left
              leftPos = rect.left - 20
              topPos = rect.top + rect.height / 2
              translateX = "-100%"
              translateY = "-50%"
            }
          } else if (isTaskbarTop) {
            topPos = rect.bottom + 20
            translateX = "-50%"
            translateY = "0%"
          } else if (isTaskbarLeft) {
            leftPos = rect.right + 20
            topPos = rect.top + rect.height / 2
            translateX = "0%"
            translateY = "-50%"
          } else if (isTaskbarRight) {
            leftPos = rect.left - 20
            topPos = rect.top + rect.height / 2
            translateX = "-100%"
            translateY = "-50%"
          } else {
            // Taskbar Bottom (default)
            translateX = "-50%"
            translateY = "0%"
          }

          globalTooltip.style.setProperty("--translate-x", translateX)
          globalTooltip.style.setProperty("--translate-y", translateY)
          globalTooltip.style.transform = ""
          
          if (!globalTooltip.classList.contains("show")) {
            globalTooltip.style.transition = "none"
            globalTooltip.style.setProperty("--tooltip-top", `${topPos}px`)
            globalTooltip.style.setProperty("--tooltip-left", `${leftPos}px`)
            globalTooltip.offsetHeight // Force reflow
            globalTooltip.style.transition = ""
            globalTooltip.classList.add("show")
          } else {
            globalTooltip.style.setProperty("--tooltip-top", `${topPos}px`)
            globalTooltip.style.setProperty("--tooltip-left", `${leftPos}px`)
          }
        }
      } else {
        globalTooltip.classList.remove("show")
      }
    }

  rafId = null
}


document.addEventListener("mousemove", (e) => {
  if (!macosHoverEnabled) return

  const container =
    e.target.closest("#bookmarks-container") ||
    e.target.closest("#hidden-bookmarks-popup") ||
    e.target.closest("#bookmark-stack-popup")

  if (container) {
    // Boost container z-index so its tooltips render above other popups
    container.style.setProperty("z-index", "10030", "important")
    mouseX = e.clientX
    mouseY = e.clientY
    isHoveringContainer = true
    if (!rafId) rafId = requestAnimationFrame(updateMacosHover)
  } else {
    isHoveringContainer = false
    if (!rafId) rafId = requestAnimationFrame(updateMacosHover)
  }
}, { passive: true })

function groupSelected() {
  if (selectedIndices.size === 0) return;
  const snapshot = captureBookmarkSnapshot();
  const bookmarks = getBookmarks();
  
  const sortedIndices = Array.from(selectedIndices).sort((a, b) => b - a);
  const itemsToGroup = sortedIndices.map(idx => bookmarks[idx]);
  itemsToGroup.reverse();
  
  const minIndex = Math.min(...Array.from(selectedIndices));
  const newStack = createBookmarkStack(null, itemsToGroup);
  
  for (const idx of sortedIndices) {
    bookmarks.splice(idx, 1);
  }
  
  bookmarks.splice(minIndex, 0, newStack);
  
  setBookmarks(bookmarks);
  saveBookmarks();
  cancelSelection();
  renderBookmarks();
  showBookmarkUndo(geti18n().bookmark_grouped || "Bookmarks grouped", snapshot);
}

function moveSelected() {
  if (selectedIndices.size === 0) return;
  
  const groups = getBookmarkGroups();
  const activeGroupId = getActiveGroupId();
  
  const groupNames = groups.map((g, i) => `${i + 1}. ${g.name || "Group " + (i+1)}`).join("\n");
  const result = prompt(`${geti18n().bookmark_move_prompt || "Move to group (enter number):"}\n${groupNames}`);
  
  if (!result) return;
  const targetIndex = parseInt(result) - 1;
  if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= groups.length) return;
  
  const targetGroup = groups[targetIndex];
  if (targetGroup.id === activeGroupId) return;
  
  const snapshot = captureBookmarkSnapshot();
  const bookmarks = getBookmarks();
  const sortedIndices = Array.from(selectedIndices).sort((a, b) => b - a);
  const itemsToMove = sortedIndices.map(idx => bookmarks[idx]);
  itemsToMove.reverse();
  
  targetGroup.items = targetGroup.items || [];
  targetGroup.items.push(...itemsToMove);
  
  for (const idx of sortedIndices) {
    bookmarks.splice(idx, 1);
  }
  
  setBookmarks(bookmarks);
  setBookmarkGroups(groups);
  saveBookmarks();
  cancelSelection();
  renderBookmarks();
  showBookmarkUndo(geti18n().bookmark_moved || "Bookmarks moved", snapshot);
}


// Fix for hidden scrollbars preventing scrolling (especially horizontal in taskbar mode)
document.addEventListener('wheel', (e) => {
  const container = e.target.closest('#bookmarks-container') || e.target.closest('.bookmark-groups-container') || e.target.closest('#hidden-bookmarks-popup');
  if (!container) return;

  let isHorizontalScroll = horizontalScrollCache.get(container);
  if (isHorizontalScroll === undefined) {
    const style = window.getComputedStyle(container);
    isHorizontalScroll = (style.overflowX === 'auto' || style.overflowX === 'scroll') && (style.overflowY === 'hidden' || style.overflowY === 'clip');
    horizontalScrollCache.set(container, isHorizontalScroll);
  }

  if (isHorizontalScroll) {
    if (e.deltaY !== 0 && !e.shiftKey) {
      e.preventDefault();
      container.scrollLeft += e.deltaY > 0 ? 100 : -100;
    }
  }
}, { passive: false });
