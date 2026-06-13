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
  getBookmarks,
  getBookmarkState,
  setBookmarks,
  getBookmarkGroups,
  setBookmarkGroups,
  getActiveGroupId,
  setActiveGroupId,
  saveBookmarks,
  getSettings,
  updateSetting,
  saveSettings,
} from "../services/state.js"
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

const iconCache = new Map()
let bookmarkUndoTimeout = null

export function invalidateBookmarkIconCache(url = null) {
  if (url) {
    iconCache.delete(url)
    return
  }
  iconCache.clear()
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

  if (hostname) {
    list.push(`https://icon.horse/icon/${hostname}`)
    list.push(`https://icons.duckduckgo.com/ip3/${hostname}.ico`)
  }

  // Google fallback (luôn có nhưng dễ mờ)
  list.push(`https://www.google.com/s2/favicons?domain=${hostname}&sz=128`)

  return list
}

async function getBestIcon(bookmark) {
  const key = bookmark.url
  if (iconCache.has(key)) return iconCache.get(key)

  const candidates = getIconCandidates(bookmark)

  for (const src of candidates) {
    const img = await loadImage(src, 1200)
    if (!img) continue

    const size = Math.min(img.width, img.height)

    // loại icon rác
    if (size < 24) continue

    const isSquare = Math.abs(img.width - img.height) < 5
    if (size >= 64 || isSquare) {
      iconCache.set(key, img.src)
      return img.src
    }
  }

  iconCache.set(key, null)
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
  img.loading = "lazy"
  img.decoding = "async"
  img.referrerPolicy = "no-referrer"
  img.className = "bookmark-icon"

  const applyBestIcon = () =>
    getBestIcon(bookmark).then((bestIcon) => {
      if (bestIcon) {
        img.src = bestIcon
      } else {
        img.style.display = "none"

        const fallback = document.createElement("div")
        fallback.className = "bookmark-icon-fallback"
        fallback.textContent = (bookmark.title || "?")
          .trim()
          .charAt(0)
          .toUpperCase()

        img.parentElement?.insertBefore(fallback, img)
      }
    })

  // Defer favicon probing so bookmark rendering does not compete with first paint.
  if (window.requestIdleCallback) {
    window.requestIdleCallback(applyBestIcon, { timeout: 1500 })
  } else {
    setTimeout(applyBestIcon, 150)
  }

  return img
}

function createBookmarkStackIcon(stack) {
  const wrap = document.createElement("div")
  wrap.className = "bookmark-stack-icon"

  if (stack.icon) {
    wrap.classList.add("has-custom-stack-icon")
    wrap.appendChild(createStoredIconElement(stack.icon, getBookmarkLabel(stack)))

    const badge = document.createElement("span")
    badge.className = "bookmark-stack-count"
    badge.textContent = stack.items.length
    wrap.appendChild(badge)

    return wrap
  }

  stack.items.slice(0, 4).forEach((item) => {
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
    img.loading = "lazy"
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

  const popup = document.createElement("div")
  popup.id = "bookmark-stack-popup"
  popup.className = "bookmark-stack-popup"

  isStackSelectionMode = false
  selectedStackIndices.clear()
  activeStackIndex = stackIndex

  const i18n = geti18n()

  const header = document.createElement("div")
  header.className = "bookmark-stack-popup-header"
  const title = document.createElement("span")
  title.textContent = getBookmarkLabel(stack)
  const count = document.createElement("small")
  count.textContent = `${stack.items.length}`
  header.appendChild(title)
  header.appendChild(count)
  popup.appendChild(header)

  const actions = document.createElement("div")
  actions.className = "bookmark-stack-popup-actions"

  const selectBtn = document.createElement("button")
  selectBtn.type = "button"
  selectBtn.className = "bookmark-stack-popup-action"
  selectBtn.title = i18n.bookmark_stack_select || "Select"
  selectBtn.setAttribute("aria-label", i18n.bookmark_stack_select || "Select")
  selectBtn.innerHTML = `<i class="fa-solid fa-check-square"></i><span>${i18n.bookmark_stack_select || "Select"}</span>`

  const renameBtn = document.createElement("button")
  renameBtn.type = "button"
  renameBtn.className = "bookmark-stack-popup-action"
  renameBtn.title = i18n.bookmark_stack_rename || "Rename"
  renameBtn.setAttribute("aria-label", i18n.bookmark_stack_rename || "Rename")
  renameBtn.innerHTML = `<i class="fa-solid fa-pen"></i><span>${i18n.bookmark_stack_rename || "Rename"}</span>`

  const deleteBtn = document.createElement("button")
  deleteBtn.type = "button"
  deleteBtn.className = "bookmark-stack-popup-action danger"
  deleteBtn.hidden = true
  deleteBtn.title = i18n.bookmark_stack_delete_selected || "Delete selected"
  deleteBtn.setAttribute(
    "aria-label",
    i18n.bookmark_stack_delete_selected || "Delete selected",
  )
  deleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i><span>${i18n.bookmark_stack_delete_selected || "Delete selected"}</span>`

  const cancelBtn = document.createElement("button")
  cancelBtn.type = "button"
  cancelBtn.className = "bookmark-stack-popup-action"
  cancelBtn.hidden = true
  cancelBtn.title = i18n.bookmark_stack_cancel || "Cancel"
  cancelBtn.setAttribute("aria-label", i18n.bookmark_stack_cancel || "Cancel")
  cancelBtn.innerHTML = `<i class="fa-solid fa-xmark"></i><span>${i18n.bookmark_stack_cancel || "Cancel"}</span>`

  actions.appendChild(selectBtn)
  actions.appendChild(renameBtn)
  actions.appendChild(deleteBtn)
  actions.appendChild(cancelBtn)
  popup.appendChild(actions)

  const grid = document.createElement("div")
  grid.className = "bookmark-stack-popup-grid"
  popup.appendChild(grid)
  let ignoreNextStackPopupClick = false

  const syncStackSelectionUi = () => {
    popup.classList.toggle("is-selecting", isStackSelectionMode)
    selectBtn.hidden = isStackSelectionMode
    renameBtn.hidden = isStackSelectionMode
    deleteBtn.hidden = !isStackSelectionMode
    cancelBtn.hidden = !isStackSelectionMode
    deleteBtn.disabled = selectedStackIndices.size === 0
    count.textContent = isStackSelectionMode
      ? `${selectedStackIndices.size}/${stack.items.length}`
      : `${stack.items.length}`
  }

  const normalizeStackAfterDelete = () => {
    const bookmarks = getBookmarks()
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

  const getStackPopupDropIntent = (target, event) => {
    const rect = target.getBoundingClientRect()
    if (!rect.width) return "after"
    return event.clientX < rect.left + rect.width / 2 ? "before" : "after"
  }

  const updateStackPopupDropIntent = (target, event) => {
    clearBookmarkDropClasses(target)
    const targetItemIndex = Number(target.dataset.stackIndex)
    const isSelfDrop = draggedStackItems.some(
      (item) =>
        item.stackIndex === stackIndex && item.itemIndex === targetItemIndex,
    )
    if (isSelfDrop) return

    const intent = getStackPopupDropIntent(target, event)
    target.classList.add(
      intent === "before" ? "drag-over-before" : "drag-over-after",
    )
    target.dataset.dropLabel = geti18n().bookmark_drop_move || "Move"
  }

  const moveDraggedStackItemsInsidePopup = (targetItemIndex, intent) => {
    const movedIndices = draggedStackItems
      .filter((item) => item.stackIndex === stackIndex)
      .map((item) => item.itemIndex)
      .filter((itemIndex) => stack.items[itemIndex])
      .sort((a, b) => a - b)

    if (
      movedIndices.length === 0 ||
      movedIndices.some((itemIndex) => itemIndex === targetItemIndex)
    ) {
      return false
    }

    const snapshot = captureBookmarkSnapshot()
    const movedItems = movedIndices.map((itemIndex) => stack.items[itemIndex])

    ;[...movedIndices]
      .sort((a, b) => b - a)
      .forEach((itemIndex) => stack.items.splice(itemIndex, 1))

    let insertIndex = targetItemIndex
    movedIndices.forEach((itemIndex) => {
      if (itemIndex < targetItemIndex) insertIndex -= 1
    })
    if (intent === "after") insertIndex += 1
    insertIndex = Math.max(0, Math.min(stack.items.length, insertIndex))

    stack.items.splice(insertIndex, 0, ...movedItems)

    const bookmarks = getBookmarks()
    if (isBookmarkStack(bookmarks[stackIndex])) {
      bookmarks[stackIndex] = stack
      setBookmarks(bookmarks)
      saveBookmarks()
    }

    isStackSelectionMode = false
    selectedStackIndices.clear()
    draggedStackItems = []
    renderStackItems()
    syncStackSelectionUi()
    showBookmarkUndo(geti18n().bookmark_moved || "Bookmarks moved", snapshot)
    return true
  }

  const handleStackPopupDragOver = (event) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = "move"
    updateStackPopupDropIntent(event.currentTarget, event)
    return false
  }

  const handleStackPopupDragEnter = (event) => {
    event.preventDefault()
    event.stopPropagation()
    updateStackPopupDropIntent(event.currentTarget, event)
  }

  const handleStackPopupDragLeave = (event) => {
    clearBookmarkDropClasses(event.currentTarget)
  }

  const handleStackPopupDrop = (event) => {
    event.preventDefault()
    event.stopPropagation()
    clearBookmarkDropClasses(event.currentTarget)

    const targetItemIndex = Number(event.currentTarget.dataset.stackIndex)
    const intent = getStackPopupDropIntent(event.currentTarget, event)
    if (moveDraggedStackItemsInsidePopup(targetItemIndex, intent)) {
      ignoreNextStackPopupClick = true
      setTimeout(() => {
        ignoreNextStackPopupClick = false
      }, 150)
    }
    return false
  }

  const renderStackItems = () => {
    grid.innerHTML = ""
    stack.items.forEach((item, itemIndex) => {
      const link = document.createElement("a")
      link.className = "bookmark bookmark-stack-popup-item"
      applyBookmarkLinkBehavior(link, item.url)
      link.dataset.stackIndex = itemIndex
      link.dataset.parentStackIndex = stackIndex
      link.draggable = true
      link.classList.toggle("selected", selectedStackIndices.has(itemIndex))
      link.appendChild(createBookmarkIcon(item))

      const label = document.createElement("span")
      label.className = "bookmark-stack-popup-label"
      label.textContent = item.title
      link.appendChild(label)

      const check = document.createElement("span")
      check.className = "bookmark-stack-popup-check"
      check.innerHTML = '<i class="fa-solid fa-check"></i>'
      link.appendChild(check)

      link.addEventListener("click", async (event) => {
        if (ignoreNextStackPopupClick) {
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
              popup.remove()
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
  }

  selectBtn.addEventListener("click", () => {
    isStackSelectionMode = true
    selectedStackIndices.clear()
    renderStackItems()
    syncStackSelectionUi()
  })

  renameBtn.addEventListener("click", () => {
    openBookmarkStackEditPopover(stackIndex, anchor)
  })

  cancelBtn.addEventListener("click", () => {
    isStackSelectionMode = false
    selectedStackIndices.clear()
    renderStackItems()
    syncStackSelectionUi()
  })

  deleteBtn.addEventListener("click", async () => {
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
    normalizeStackAfterDelete()
    popup.remove()
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

  document.body.appendChild(popup)

  const rect = anchor.getBoundingClientRect()
  const popupRect = popup.getBoundingClientRect()
  const left = Math.min(
    Math.max(12, rect.left + rect.width / 2 - popupRect.width / 2),
    window.innerWidth - popupRect.width - 12,
  )
  const below = rect.bottom + 12
  const above = rect.top - popupRect.height - 12
  popup.style.left = `${left}px`
  popup.style.top =
    below + popupRect.height < window.innerHeight - 12
      ? `${below}px`
      : `${Math.max(12, above)}px`

  const closePopup = (event) => {
    const contextMenu = document.getElementById("context-menu")
    if (
      !popup.contains(event.target) &&
      !anchor.contains(event.target) &&
      !contextMenu?.contains(event.target)
    ) {
      popup.remove()
      document.removeEventListener("click", closePopup)
    }
  }
  setTimeout(() => document.addEventListener("click", closePopup), 50)
}

// --- Drag and Drop State ---
let draggedBookmarkIndices = []
let draggedGroupIndex = null
let draggedStackItems = []

function isBookmarkStack(item) {
  return item?.type === "stack" && Array.isArray(item.items)
}

function getStackItems(item) {
  return isBookmarkStack(item) ? item.items : [item]
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
  const validItems = items.filter((item) => item && item.url && item.title)
  return {
    type: "stack",
    id: `stack-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title || inferBookmarkStackName(validItems),
    items: validItems,
  }
}

function takeDraggedStackItems() {
  if (draggedStackItems.length === 0) return null
  const bookmarks = getBookmarks()
  const sourceStackIndex = draggedStackItems[0].stackIndex
  const sourceStack = bookmarks[sourceStackIndex]
  if (!isBookmarkStack(sourceStack)) return null

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
  if (sourceStack.items.length <= 0) {
    bookmarks.splice(sourceStackIndex, 1)
    removedSourceSlot = true
  } else if (sourceStack.items.length === 1) {
    bookmarks[sourceStackIndex] = sourceStack.items[0]
  } else {
    bookmarks[sourceStackIndex] = sourceStack
  }

  return { bookmarks, items, sourceStackIndex, removedSourceSlot }
}

function getBookmarkDropIntent(target, event) {
  if (!target?.classList?.contains("bookmark")) return "before"
  if (target.classList.contains("bookmark-stack")) return "stack"

  const rect = target.getBoundingClientRect()
  if (!rect.width) return "stack"
  const ratio = (event.clientX - rect.left) / rect.width
  if (ratio < 0.22) return "before"
  if (ratio > 0.78) return "after"
  return "stack"
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
  const stackIndex = Number(this.dataset.parentStackIndex)
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
      this.classList.add("drag-over")
      this.dataset.dropLabel = geti18n().bookmark_drop_move || "Move"
    }
  }
  return false
}

function handleDragEnter(e) {
  e.preventDefault()
  if (this.classList.contains("bookmark")) {
    if (!draggedBookmarkIndices.includes(Number(this.dataset.index))) {
      updateBookmarkDropIntent(this, e)
    }
  } else if (this.classList.contains("bookmark-group-tab")) {
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
    const snapshot = captureBookmarkSnapshot()
    const groups = getBookmarkGroups()
    const [draggedItem] = groups.splice(draggedGroupIndex, 1)
    groups.splice(targetIndex, 0, draggedItem)
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
  const isTaskbarMode =
    document.body.classList.contains("bookmark-taskbar-mode") ||
    document.body.classList.contains("bookmark-taskbar-left-mode")

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
    // When shown: ↑ (click to collapse upward)
    // When hidden: ↓ (click to reveal downward)
    return isHidden ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-up"
  } else if (isTaskbarMode) {
    // Groups appear above the bottom bar
    // When shown: ↓ (click to collapse downward)
    // When hidden: ↑ (click to reveal upward)
    return isHidden ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down"
  }
  // Default / no minimal mode
  return "fa-solid fa-layer-group"
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
  const bookmarks = getBookmarks() // This now returns items of active group

  // Use Document Fragment to prevent multiple reflows / layout shifts
  const frag = document.createDocumentFragment()
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

  // Use requestAnimationFrame so UI can render before calculations
  requestAnimationFrame(() => {
    animateBookmarksForFolderSwitch()
    requestAnimationFrame(updateOverflowBookmarks)
  })
}

export function updateOverflowBookmarks() {
  const i18n = geti18n()
  const container = document.getElementById("bookmarks-container")
  if (!container) return

  const isMinimalModeMatch = document.body.className.match(
    /bookmark-(sidebar|taskbar|taskbar-top|taskbar-left)-mode/,
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
      c.style.display = ""
    }
  })

  if (!isMinimalModeMatch) {
    if (container.style.overflow) container.style.overflow = ""
    // Show widget for default grid too
    const bw = document.getElementById("bookmark-widget")
    if (bw && bw.classList.contains("no-transition")) {
      requestAnimationFrame(() => {
        bw.classList.remove("no-transition")
      })
    }
    return
  }

  container.style.overflow = "hidden"
  const mode = isMinimalModeMatch[1]
  const isSidebar = mode === "sidebar"
  const isTaskbarTop = mode === "taskbar-top"

  const addBtn = children.find((child) =>
    child.classList.contains("add-bookmark-card"),
  )
  const overflowItems = children.filter(
    (child) =>
      child.classList.contains("bookmark") &&
      !child.classList.contains("add-bookmark-card") &&
      !child.classList.contains("overflow-indicator"),
  )

  const checkOverflow = () => {
    let visibleCount = 0
    for (let j = 0; j < overflowItems.length; j++) {
      if (overflowItems[j].style.display !== "none") visibleCount++
    }
    if (visibleCount > 15) return true
    return isSidebar
      ? container.scrollHeight > Math.ceil(container.clientHeight) + 2
      : container.scrollWidth > Math.ceil(container.clientWidth) + 2
  }

  if (!checkOverflow()) {
    container.style.overflow = ""
    const bw = document.getElementById("bookmark-widget")
    if (bw && bw.classList.contains("no-transition")) {
      requestAnimationFrame(() => {
        bw.classList.remove("no-transition")
      })
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
  fallback.style.fontSize = "1rem"
  fallback.style.fontWeight = "bold"
  indicator.appendChild(fallback)

  if (isSidebar) {
    container.insertBefore(indicator, container.firstChild)
  } else if (addBtn) {
    container.insertBefore(indicator, addBtn)
  } else {
    container.appendChild(indicator)
  }

  for (let i = overflowItems.length - 1; i >= 0; i--) {
    const el = overflowItems[i]
    el.style.display = "none"
    hiddenElements.unshift(el)
    hiddenCount++

    fallback.textContent = "+" + hiddenCount

    if (!checkOverflow()) break
  }

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
      clone.draggable = false
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
            const original = container.querySelector(
              `.bookmark[data-index="${idx}"]`,
            )
            if (original) original.click()
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
    } else if (isTaskbarTop) {
      popup.style.top = rect.bottom + 15 + "px"
      popup.style.left =
        Math.max(20, rect.left - popupRect.width / 2 + rect.width / 2) + "px"
    } else {
      // Taskbar cases (bottom)
      const isTaskbarLeft = mode === "taskbar-left"
      popup.style.bottom = window.innerHeight - rect.top + 15 + "px"

      if (isTaskbarLeft) {
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

function animateBookmarksForFolderSwitch() {
  if (!pendingFolderBookmarkReveal || !bookmarksContainer) return
  pendingFolderBookmarkReveal = false

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return

  const items = Array.from(
    bookmarksContainer.querySelectorAll(".bookmark, .add-bookmark-card"),
  ).filter((item) => !item.classList.contains("overflow-indicator"))
  if (items.length === 0) return

  const isVertical = document.body.classList.contains("bookmark-sidebar-mode")
  const containerRect = bookmarksContainer.getBoundingClientRect()
  const center = isVertical
    ? containerRect.top + containerRect.height / 2
    : containerRect.left + containerRect.width / 2

  const itemMeta = items.map((item) => {
    const rect = item.getBoundingClientRect()
    const itemCenter = isVertical
      ? rect.top + rect.height / 2
      : rect.left + rect.width / 2
    return {
      item,
      distance: Math.abs(itemCenter - center),
      offset: Math.max(-72, Math.min(72, center - itemCenter)),
    }
  })

  itemMeta
    .sort((a, b) => a.distance - b.distance)
    .forEach(({ item, offset }, order) => {
      item.classList.remove("bookmark-folder-reveal")
      item.style.setProperty(
        "--bookmark-folder-reveal-x",
        isVertical ? "0px" : `${offset}px`,
      )
      item.style.setProperty(
        "--bookmark-folder-reveal-y",
        isVertical ? `${offset}px` : "0px",
      )
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

function renderGroupTabs() {
  const groups = getBookmarkGroups()
  const activeId = getActiveGroupId()
  const settings = getSettings()
  const enableDrag = settings.bookmarkEnableDrag === true
  bookmarkGroupsContainer.innerHTML = ""

  groups.forEach((group, index) => {
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
    tab.appendChild(nameSpan)

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
    })

    // Rename (Double Click) - Keeping as valid shortcut
    tab.addEventListener("dblclick", async () => {
      const currentI18n = geti18n()
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
      const index = groups.indexOf(group)
      showContextMenu(e.clientX, e.clientY, index, "group", group.id, {
        anchor: tab,
        onEdit: () => openBookmarkGroupEditPopover(group.id, tab),
        onEditIcon: () =>
          openBookmarkGroupEditPopover(group.id, tab, { focus: "icon" }),
      })
    })

    bookmarkGroupsContainer.appendChild(tab)
  })

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

  if (cancelBtn) {
    cancelBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      cancelSelection()
    })
  }

  window.addEventListener("resize", () =>
    requestAnimationFrame(updateOverflowBookmarks),
  )
  window.addEventListener("layoutUpdated", (e) => {
    if (
      e.detail &&
      (e.detail.key === "bookmarkLayout" ||
        e.detail.key === "bookmarkSidebarMode" ||
        e.detail.key === "bookmarkTheme")
    ) {
      updateBookmarkGroupsToggleIcon()
      requestAnimationFrame(updateOverflowBookmarks)
    }
  })

  // FOUC/Layout shift fix: no-transition class is now removed precisely
  // at the end of updateOverflowBookmarks() after first calculation.
}

// MacOS Hover Effect
let macosHoverEnabled = false

export function initMacosHoverForBookmarks(isEnabled) {
  macosHoverEnabled = isEnabled
}

let mouseX = 0,
  mouseY = 0
let isHoveringContainer = false
let rafId = null

function updateMacosHover() {
  if (!macosHoverEnabled || !isHoveringContainer) {
    const bookmarks = document.querySelectorAll(".bookmark")
    bookmarks.forEach((item) => {
      if (item.style.transform !== "") {
        item.style.removeProperty("transform")
        item.style.zIndex = ""
      }
    })
    rafId = null
    return
  }

  const container =
    document.querySelector("#bookmarks-container") ||
    document.querySelector("#hidden-bookmarks-popup")
  if (container) {
    const bookmarks = Array.from(
      container.querySelectorAll(".bookmark:not(.add-bookmark-card)"),
    )
    const isSidebar = document.body.classList.contains("bookmark-sidebar-mode")
    const isFlipped = document.body.classList.contains("flip-layout")

    // MacOS parameters
    const maxScale = 1.6
    const range = 80 // Reduced range to limit spread to neighbors

    bookmarks.forEach((item) => {
      const rect = item.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
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

      // Apply scaling and smooth z-index
      item.style.setProperty("transform", `scale(${scale})`, "important")
      item.style.zIndex = Math.round(scale * 100)
    })
  }

  rafId = null
}

document.addEventListener("mousemove", (e) => {
  if (!macosHoverEnabled) return

  const container =
    e.target.closest("#bookmarks-container") ||
    e.target.closest("#hidden-bookmarks-popup")

  if (container) {
    mouseX = e.clientX
    mouseY = e.clientY
    isHoveringContainer = true
    if (!rafId) rafId = requestAnimationFrame(updateMacosHover)
  } else {
    isHoveringContainer = false
    if (!rafId) rafId = requestAnimationFrame(updateMacosHover)
  }
})
