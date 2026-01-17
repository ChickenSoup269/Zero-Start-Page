import { bookmarksContainer } from "../utils/dom.js"
import { getBookmarks } from "../services/state.js"
import { geti18n } from "../services/i18n.js"
import { openModal } from "./modal.js"
import { showContextMenu } from "./contextMenu.js"

export function renderBookmarks() {
  const i18n = geti18n()
  const bookmarks = getBookmarks()
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

  const addBtn = document.createElement("button")
  addBtn.className = "add-bookmark-card"
  addBtn.setAttribute("aria-label", i18n.modal_add_title || "Add Bookmark")
  addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>'
  addBtn.addEventListener("click", () => openModal(null))
  bookmarksContainer.appendChild(addBtn)
}

export function initBookmarks() {
  renderBookmarks()
  // Event delegation could be used here for context menu, but direct binding is simpler for now.
}
