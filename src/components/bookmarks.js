import { bookmarksContainer, bookmarkGroupsContainer } from "../utils/dom.js"
import { showPrompt } from "../utils/dialog.js"
import { 
  getBookmarks, 
  getBookmarkGroups, 
  setBookmarkGroups, 
  getActiveGroupId, 
  setActiveGroupId, 
  saveBookmarks 
} from "../services/state.js"
import { geti18n } from "../services/i18n.js"
import { openModal } from "./modal.js"
import { showContextMenu } from "./contextMenu.js"

export function renderBookmarks() {
  const i18n = geti18n()
  
  // 1. Render Group Tabs
  renderGroupTabs()

  // 2. Render Bookmarks for Active Group
  const bookmarks = getBookmarks() // This now returns items of active group
  bookmarksContainer.innerHTML = ""
  
  bookmarks.forEach((bookmark, index) => {
    const bookmarkEl = document.createElement("a")
    bookmarkEl.href = bookmark.url
    bookmarkEl.classList.add("bookmark")
    bookmarkEl.target = "_blank"
    let faviconUrl =
      bookmark.icon ||
      `https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=128`
    bookmarkEl.innerHTML = `<img src="${faviconUrl}" alt="${bookmark.title} icon" onerror="this.src='https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=128'"><span>${bookmark.title}</span>`
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

  groups.forEach(group => {
    const tab = document.createElement("div")
    tab.className = `bookmark-group-tab ${group.id === activeId ? 'active' : ''}`
    
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
        showContextMenu(e.clientX, e.clientY, index, 'group', group.id)
    })

    bookmarkGroupsContainer.appendChild(tab)
  })

  // "Add Group" Tab
  const addTab = document.createElement("div")
  addTab.className = "bookmark-group-tab add-group-tab"
  addTab.innerHTML = '<i class="fa-solid fa-plus"></i>'
  addTab.title = "Add Group"
  addTab.addEventListener("click", async () => {
    const name = await showPrompt("Enter group name:", `Group ${groups.length + 1}`)
    if (name) {
        const newGroup = {
            id: `group-${Date.now()}`,
            name: name.trim() || `Group ${groups.length + 1}`,
            items: []
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
