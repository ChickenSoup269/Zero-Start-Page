import { bookmarksContainer, bookmarkGroupsContainer } from "../utils/dom.js"
import { showPrompt } from "../utils/dialog.js"
import {
  getBookmarks,
  setBookmarks,
  getBookmarkGroups,
  setBookmarkGroups,
  getActiveGroupId,
  setActiveGroupId,
  saveBookmarks,
  getSettings,
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
    list.push(`https://logo.clearbit.com/${hostname}`) // đẹp nhất
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

    // ❌ loại icon rác
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
let draggedBookmarkIndex = null;

function handleDragStart(e) {
  draggedBookmarkIndex = Number(this.dataset.index);
  e.dataTransfer.effectAllowed = "move";
  // The timeout ensures the drop target is visually still clear, while the dragged shadow exists
  setTimeout(() => this.classList.add("dragging"), 0);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  return false;
}

function handleDragEnter(e) {
  e.preventDefault();
  if (this.dataset.index !== String(draggedBookmarkIndex)) {
    this.classList.add("drag-over");
  }
}

function handleDragLeave(e) {
  this.classList.remove("drag-over");
}

function handleDrop(e) {
  e.stopPropagation();
  e.preventDefault(); // prevent opening the link
  this.classList.remove("drag-over");
  const targetIndex = Number(this.dataset.index);

  if (draggedBookmarkIndex !== null && draggedBookmarkIndex !== targetIndex) {
    const bookmarks = getBookmarks();
    const [draggedItem] = bookmarks.splice(draggedBookmarkIndex, 1);
    bookmarks.splice(targetIndex, 0, draggedItem);
    setBookmarks(bookmarks);
    saveBookmarks();
    renderBookmarks();
  }
  return false;
}

function handleDragEnd(e) {
  this.classList.remove("dragging");
  document.querySelectorAll(".bookmark").forEach(el => el.classList.remove("drag-over"));
  draggedBookmarkIndex = null;
}

export function renderBookmarks() {
  const i18n = geti18n()

  // 1. Render Group Tabs
  renderGroupTabs()

  // 2. Render Bookmarks for Active Group
  const bookmarks = getBookmarks() // This now returns items of active group
  bookmarksContainer.innerHTML = ""
  
  const settings = getSettings();
  const enableDrag = settings.bookmarkEnableDrag === true;

  bookmarks.forEach((bookmark, index) => {
    const bookmarkEl = document.createElement("a")
    bookmarkEl.href = bookmark.url
    bookmarkEl.classList.add("bookmark")
    bookmarkEl.target = "_blank"
    
    if (enableDrag) {
      bookmarkEl.draggable = true;
      bookmarkEl.dataset.index = index;
      bookmarkEl.addEventListener("dragstart", handleDragStart);
      bookmarkEl.addEventListener("dragover", handleDragOver);
      bookmarkEl.addEventListener("drop", handleDrop);
      bookmarkEl.addEventListener("dragenter", handleDragEnter);
      bookmarkEl.addEventListener("dragleave", handleDragLeave);
      bookmarkEl.addEventListener("dragend", handleDragEnd);
      // prevent link navigation right after dragging
      bookmarkEl.addEventListener("click", (e) => {
        if (bookmarkEl.classList.contains("dragging") || draggedBookmarkIndex !== null) {
           e.preventDefault();
        }
      });
    }

    const titleEl = document.createElement("span")
    titleEl.textContent = bookmark.title
    bookmarkEl.appendChild(createBookmarkIcon(bookmark))
    bookmarkEl.appendChild(titleEl)
    bookmarkEl.addEventListener("contextmenu", (e) => {
      e.preventDefault()
      showContextMenu(e.clientX, e.clientY, index)
    })
    bookmarksContainer.appendChild(bookmarkEl)
  })

  // Add Button (Always at end of list)
  const addBtn = document.createElement("button")
  addBtn.className = "add-bookmark-card"
  addBtn.setAttribute("aria-label", i18n.modal_add_title || "Add Bookmark")
  addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>'
  addBtn.addEventListener("click", () => openModal(null))
  bookmarksContainer.appendChild(addBtn)
}

function renderGroupTabs() {
  const groups = getBookmarkGroups()
  const activeId = getActiveGroupId()
  bookmarkGroupsContainer.innerHTML = ""

  groups.forEach((group) => {
    const tab = document.createElement("div")
    tab.className = `bookmark-group-tab ${group.id === activeId ? "active" : ""}`

    // Name Span (for double-click edit)
    const nameSpan = document.createElement("span")
    nameSpan.textContent = group.name
    tab.appendChild(nameSpan)

    // Events
    tab.addEventListener("click", () => {
      if (group.id !== activeId) {
        setActiveGroupId(group.id)
        renderBookmarks()
      }
    })

    // Rename (Double Click) - Keeping as valid shortcut
    tab.addEventListener("dblclick", async () => {
      const newName = await showPrompt("Enter new group name:", group.name)
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
    const name = await showPrompt(
      "Enter group name:",
      `Group ${groups.length + 1}`,
    )
    if (name) {
      const newGroup = {
        id: `group-${Date.now()}`,
        name: name.trim() || `Group ${groups.length + 1}`,
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
}
