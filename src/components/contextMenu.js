import { contextMenu, menuEdit, menuDelete } from "../utils/dom.js"
import { getBookmarks, setBookmarks, saveBookmarks } from "../services/state.js"
import { geti18n } from "../services/i18n.js"
import { openModal } from "./modal.js"
import { renderBookmarks } from "./bookmarks.js"

let contextMenuTargetIndex = -1

export function showContextMenu(x, y, index) {
  contextMenuTargetIndex = index
  contextMenu.style.display = "block"
  contextMenu.style.left = `${x}px`
  contextMenu.style.top = `${y}px`
}

export function hideContextMenu() {
  contextMenu.style.display = "none"
  contextMenuTargetIndex = -1
}

function handleEdit() {
  if (contextMenuTargetIndex > -1) {
    openModal(contextMenuTargetIndex)
  }
  hideContextMenu()
}

function handleDelete() {
  const i18n = geti18n()
  const bookmarks = getBookmarks()
  if (
    contextMenuTargetIndex > -1 &&
    confirm(
      `${i18n.alert_delete_confirm} "${bookmarks[contextMenuTargetIndex].title}"?`
    )
  ) {
    bookmarks.splice(contextMenuTargetIndex, 1)
    setBookmarks(bookmarks)
    saveBookmarks()
    renderBookmarks() // Re-render after deleting
  }
  hideContextMenu()
}

export function initContextMenu() {
  menuEdit.addEventListener("click", (e) => {
    e.stopPropagation()
    handleEdit()
  })

  menuDelete.addEventListener("click", (e) => {
    e.stopPropagation()
    handleDelete()
  })

  window.addEventListener("click", (e) => {
    if (!contextMenu.contains(e.target)) {
      hideContextMenu()
    }
  })
}