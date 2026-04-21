import {
  bookmarksContainer,
  bookmarkGroupsContainer,
  bookmarkGroupsToggle,
} from "../utils/dom.js"
import { showPrompt, showAlert, showConfirm } from "../utils/dialog.js"
import {
  getBookmarks,
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
import { openModal } from "./modal.js"
import { showContextMenu } from "./contextMenu.js"

function getHostname(url) {
  try {
    return new URL(url).hostname
  } catch {
    return ""
  }
}

const iconCache = new Map()

// --- Selection State ---
let isSelectionMode = false
let selectedIndices = new Set()

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
    (i18n.bookmark_delete_selected_confirm || "Delete {count} selected bookmarks?").replace(
      "{count}",
      selectedIndices.size,
    ),
  )

  if (confirmed) {
    const bookmarks = getBookmarks()
    const sortedIndices = Array.from(selectedIndices).sort((a, b) => b - a)
    sortedIndices.forEach((index) => {
      bookmarks.splice(index, 1)
    })
    setBookmarks(bookmarks)
    saveBookmarks()
    cancelSelection()
  }
}

function updateSelectionUI() {
  const toolbar = document.getElementById("bookmark-selection-toolbar")
  const countEl = document.getElementById("selection-count")

  if (!toolbar || !countEl) return

  if (isSelectionMode) {
    toolbar.style.display = "flex"
    countEl.textContent = selectedIndices.size
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

  // load song song
  const results = await Promise.all(candidates.map((src) => loadImage(src)))

  let best = null
  let bestScore = 0

  for (const img of results) {
    if (!img) continue

    const size = Math.min(img.width, img.height)

    // loại icon rác
    if (size < 24) continue

    const isSquare = Math.abs(img.width - img.height) < 5
    const score = size + (isSquare ? 20 : 0)

    if (score > bestScore) {
      bestScore = score
      best = img.src
    }
  }

  iconCache.set(key, best)
  return best
}

function createBookmarkIcon(bookmark) {
  const img = document.createElement("img")

  // Use a 1x1 transparent Base64 GIF to initialize layout and avoid CLS
  img.src =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
  img.alt = `${bookmark.title} icon`
  img.loading = "lazy"
  img.decoding = "async"
  img.referrerPolicy = "no-referrer"
  img.className = "bookmark-icon"

  // load icon đẹp nhất async
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

  return img
}

// --- Drag and Drop State ---
let draggedBookmarkIndex = null
let draggedGroupIndex = null

function handleDragStart(e) {
  draggedBookmarkIndex = Number(this.dataset.index)
  e.dataTransfer.effectAllowed = "move"
  // The timeout ensures the drop target is visually still clear, while the dragged shadow exists
  setTimeout(() => this.classList.add("dragging"), 0)
}

function handleGroupDragStart(e) {
  draggedGroupIndex = Number(this.dataset.index)
  e.dataTransfer.effectAllowed = "move"
  setTimeout(() => this.classList.add("dragging"), 0)
}

function handleDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = "move"
  return false
}

function handleDragEnter(e) {
  e.preventDefault()
  if (this.classList.contains("bookmark")) {
    if (this.dataset.index !== String(draggedBookmarkIndex)) {
      this.classList.add("drag-over")
    }
  } else if (this.classList.contains("bookmark-group-tab")) {
    if (this.dataset.index !== String(draggedGroupIndex)) {
      this.classList.add("drag-over")
    }
  }
}

function handleDragLeave(e) {
  this.classList.remove("drag-over")
}

function handleDrop(e) {
  e.stopPropagation()
  e.preventDefault() // prevent opening the link
  this.classList.remove("drag-over")
  const targetIndex = Number(this.dataset.index)

  if (draggedBookmarkIndex !== null && draggedBookmarkIndex !== targetIndex) {
    const bookmarks = getBookmarks()
    const [draggedItem] = bookmarks.splice(draggedBookmarkIndex, 1)
    bookmarks.splice(targetIndex, 0, draggedItem)
    setBookmarks(bookmarks)
    saveBookmarks()
    renderBookmarks()
  }
  return false
}

function handleGroupDrop(e) {
  e.stopPropagation()
  e.preventDefault()
  this.classList.remove("drag-over")
  const targetIndex = Number(this.dataset.index)

  if (draggedGroupIndex !== null && draggedGroupIndex !== targetIndex) {
    const groups = getBookmarkGroups()
    const [draggedItem] = groups.splice(draggedGroupIndex, 1)
    groups.splice(targetIndex, 0, draggedItem)
    setBookmarkGroups(groups)
    saveBookmarks()
    renderBookmarks()
  }
  return false
}

function handleDragEnd(e) {
  this.classList.remove("dragging")
  document
    .querySelectorAll(".bookmark, .bookmark-group-tab")
    .forEach((el) => el.classList.remove("drag-over"))
  draggedBookmarkIndex = null
  draggedGroupIndex = null
}

let toggleListenerAdded = false

export function renderBookmarks() {
  const settings = getSettings()
  
  if (!toggleListenerAdded) {
    // Initial restoration of hidden state
    if (settings.groupsHidden) {
      document.body.classList.add("groups-hidden")
    }

    bookmarkGroupsToggle.addEventListener("click", () => {
      const isHidden = document.body.classList.toggle("groups-hidden")
      updateSetting("groupsHidden", isHidden)
      saveSettings()
      
      const icon = bookmarkGroupsToggle.querySelector("i")
      if (icon) {
        if (isHidden) {
          const isSidebar = document.body.classList.contains("bookmark-sidebar-mode")
          if (isSidebar) {
            const isFlipped = document.body.classList.contains("flip-layout")
            icon.className = isFlipped ? "fa-solid fa-chevron-right" : "fa-solid fa-chevron-left"
          } else {
            icon.className = "fa-solid fa-chevron-up"
          }
        } else {
          icon.className = "fa-solid fa-layer-group"
        }
      }
    })
    
    // Initial icon state
    const initialIcon = bookmarkGroupsToggle.querySelector("i")
    if (initialIcon && settings.groupsHidden) {
       const isSidebar = document.body.classList.contains("bookmark-sidebar-mode")
       if (isSidebar) {
         const isFlipped = document.body.classList.contains("flip-layout")
         initialIcon.className = isFlipped ? "fa-solid fa-chevron-right" : "fa-solid fa-chevron-left"
       } else {
         initialIcon.className = "fa-solid fa-chevron-up"
       }
    }
    
    toggleListenerAdded = true
  }
  const i18n = geti18n()

  // 1. Render Group Tabs
  renderGroupTabs()

  // 2. Render Bookmarks for Active Group
  const bookmarks = getBookmarks() // This now returns items of active group

  // Use Document Fragment to prevent multiple reflows / layout shifts
  const frag = document.createDocumentFragment()
  const enableDrag = settings.bookmarkEnableDrag === true

  bookmarks.forEach((bookmark, index) => {
    const bookmarkEl = document.createElement("a")
    bookmarkEl.href = bookmark.url
    bookmarkEl.classList.add("bookmark")
    bookmarkEl.dataset.index = index // Always set index for selection and identification
    
    if (selectedIndices.has(index)) {
      bookmarkEl.classList.add("selected")
    }
    bookmarkEl.target = "_blank"

    if (enableDrag && !isSelectionMode) {
      bookmarkEl.draggable = true
      bookmarkEl.addEventListener("dragstart", handleDragStart)
      bookmarkEl.addEventListener("dragover", handleDragOver)
      bookmarkEl.addEventListener("drop", handleDrop)
      bookmarkEl.addEventListener("dragenter", handleDragEnter)
      bookmarkEl.addEventListener("dragleave", handleDragLeave)
      bookmarkEl.addEventListener("dragend", handleDragEnd)
    }

    const titleEl = document.createElement("span")
    titleEl.textContent = bookmark.title
    bookmarkEl.appendChild(createBookmarkIcon(bookmark))
    bookmarkEl.appendChild(titleEl)

    bookmarkEl.addEventListener("click", (e) => {
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
        draggedBookmarkIndex !== null
      ) {
        e.preventDefault()
      }
    })

    bookmarkEl.addEventListener("contextmenu", (e) => {
      e.preventDefault()
      if (isSelectionMode) return
      showContextMenu(e.clientX, e.clientY, index)
    })
    frag.appendChild(bookmarkEl)
  })

  // Add Button (Always at end of list)
  const addBtn = document.createElement("button")
  addBtn.className = "add-bookmark-card"
  addBtn.setAttribute("aria-label", i18n.modal_add_title || "Add Bookmark")
  addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>'
  addBtn.addEventListener("click", () => {
    const bookmarks = getBookmarks()
    const settings = getSettings()
    const currentI18n = geti18n()
    if (settings.bookmarkLimit20 !== false && bookmarks.length >= 20) {
      showAlert(currentI18n.alert_bookmark_limit_reached || "This group already has 20 bookmarks!")
      return
    }
    openModal(null)
  })
  frag.appendChild(addBtn)

  // Clear and update DOM once
  bookmarksContainer.innerHTML = ""
  bookmarksContainer.appendChild(frag)

  // Use requestAnimationFrame so UI can render before calculations
  requestAnimationFrame(() => requestAnimationFrame(updateOverflowBookmarks))
}

export function updateOverflowBookmarks() {
  const i18n = geti18n()
  const container = document.getElementById("bookmarks-container")
  if (!container) return

  const isMinimalModeMatch = document.body.className.match(
    /bookmark-(sidebar|taskbar|taskbar-left)-mode/,
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
      setTimeout(() => bw.classList.remove("no-transition"), 150)
    }
    return
  }

  container.style.overflow = "hidden"
  const isSidebar = isMinimalModeMatch[1] === "sidebar"
  const checkOverflow = () => {
    let visibleCount = 0
    for (let j = 0; j < children.length - 1; j++) {
      if (children[j].style.display !== "none") visibleCount++
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
      setTimeout(() => bw.classList.remove("no-transition"), 150)
    }
    return
  }

  container.style.overflow = "visible"

  const addBtn = children[children.length - 1]
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
  } else {
    container.insertBefore(indicator, addBtn)
  }

  for (let i = children.length - 2; i >= 0; i--) {
    const el = children[i]
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
    popup.addEventListener("click", (evt) => {
      const bookmarkEl = evt.target.closest(".bookmark")
      if (!bookmarkEl) return

      const idxStr = bookmarkEl.getAttribute("data-index") || bookmarkEl.dataset.index
      const idx = parseInt(idxStr)
      
      if (isNaN(idx)) return

      if (isSelectionMode) {
        evt.preventDefault()
        evt.stopPropagation()
        
        if (selectedIndices.has(idx)) {
          selectedIndices.delete(idx)
          bookmarkEl.classList.remove("selected")
          // Sync original hidden element in the main container
          const original = container.querySelector(`.bookmark[data-index="${idx}"]`)
          if (original) original.classList.remove("selected")
        } else {
          selectedIndices.add(idx)
          bookmarkEl.classList.add("selected")
          // Sync original hidden element in the main container
          const original = container.querySelector(`.bookmark[data-index="${idx}"]`)
          if (original) original.classList.add("selected")
        }
        
        updateSelectionUI()
        return false
      } else {
        // Normal mode: close popup
        setTimeout(() => popup.remove(), 100)
      }
    }, true) // Use capture phase to intercept clicks

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
    } else {
      // Taskbar cases
      const isTaskbarLeft = isMinimalModeMatch[1] === "taskbar-left"
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
      const isClickOnContextMenu = contextMenu && contextMenu.contains(evt.target)
      
      if (!popup.contains(evt.target) && !indicator.contains(evt.target) && !isClickOnContextMenu) {
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
    setTimeout(() => {
      bw.classList.remove("no-transition")
    }, 250) // Slightly longer delay to ensure everything is ready
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
    const icon = document.createElement("i")
    icon.className = `fa-solid ${getGroupIcon(group.name)} group-tab-icon`
    tab.appendChild(icon)

    // Name Span (for double-click edit)
    const nameSpan = document.createElement("span")
    nameSpan.textContent = group.name
    tab.appendChild(nameSpan)

    // Events
    tab.addEventListener("click", () => {
      if (group.id !== activeId) {
        if (isSelectionMode) cancelSelection()
        setActiveGroupId(group.id)
        renderBookmarks()
      }
    })

    // Rename (Double Click) - Keeping as valid shortcut
    tab.addEventListener("dblclick", async () => {
      const currentI18n = geti18n()
      const newName = await showPrompt(currentI18n.prompt_rename_group || "Enter new group name:", group.name)
      if (newName && newName.trim() !== "") {
        group.name = newName.trim()
        saveBookmarks()
        renderBookmarks() // Re-render tabs
      }
    })

    // Context Menu (Right Click)
    tab.addEventListener("contextmenu", (e) => {
      e.preventDefault()
      const index = groups.indexOf(group)
      showContextMenu(e.clientX, e.clientY, index, "group", group.id)
    })

    bookmarkGroupsContainer.appendChild(tab)
  })

  // "Add Group" Tab
  const addTab = document.createElement("div")
  addTab.className = "bookmark-group-tab add-group-tab"
  addTab.innerHTML = '<i class="fa-solid fa-plus"></i>'
  addTab.title = "Add Group"
  addTab.addEventListener("click", async () => {
    const currentI18n = geti18n()
    const name = await showPrompt(
      currentI18n.prompt_add_group || "Enter group name:",
      (currentI18n.bookmark_group_default_name || "Group {count}").replace("{count}", groups.length + 1),
    )
    if (name) {
      const newGroup = {
        id: `group-${Date.now()}`,
        name: name.trim() || (currentI18n.bookmark_group_default_name || "Group {count}").replace("{count}", groups.length + 1),
        items: [],
      }
      groups.push(newGroup)
      setBookmarkGroups(groups)
      setActiveGroupId(newGroup.id) // Switch to new group
      renderBookmarks()
    }
  })
  bookmarkGroupsContainer.appendChild(addTab)
}

export function initBookmarks() {
  renderBookmarks()

  // Selection toolbar events
  const deleteBtn = document.getElementById("bookmark-delete-selected")
  const cancelBtn = document.getElementById("bookmark-cancel-selection")

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

let mouseX = 0, mouseY = 0
let isHoveringContainer = false
let rafId = null

function updateMacosHover() {
  if (!macosHoverEnabled || !isHoveringContainer) {
    const bookmarks = document.querySelectorAll(".bookmark")
    bookmarks.forEach((item) => {
      if (item.style.transform !== "") {
        item.style.transform = ""
        item.style.zIndex = ""
      }
    })
    rafId = null
    return
  }

  const container = document.querySelector("#bookmarks-container") || document.querySelector("#hidden-bookmarks-popup")
  if (container) {
    const bookmarks = Array.from(container.querySelectorAll(".bookmark:not(.add-bookmark-card)"))
    const isSidebar = document.body.classList.contains("bookmark-sidebar-mode")
    const isFlipped = document.body.classList.contains("flip-layout")
    
    // MacOS parameters
    const maxScale = 1.6
    const range = 80 // Reduced range to limit spread to neighbors

    bookmarks.forEach((item) => {
      const rect = item.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dist = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2))
      
      let scale = 1
      if (dist < range) {
        // Sharper falloff to prevent too much spread
        const factor = 1 - dist / range
        const smoothFactor = Math.pow(factor, 2.5) // Higher power = less spread
        scale = 1 + (maxScale - 1) * smoothFactor
      }

      if (item.classList.contains("dragging")) scale = 1

      // Apply scaling and smooth z-index
      item.style.transform = `scale(${scale})`
      item.style.zIndex = Math.round(scale * 100)
    })
  }

  rafId = requestAnimationFrame(updateMacosHover)
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
  }
})
