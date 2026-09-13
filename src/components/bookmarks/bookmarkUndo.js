import {
  getBookmarkState,
  setBookmarkGroups,
  setActiveGroupId,
  saveBookmarks,
} from "../../services/state.js"
import { geti18n } from "../../services/i18n.js"

let bookmarkUndoTimeout = null

export function captureBookmarkSnapshot() {
  return JSON.parse(JSON.stringify(getBookmarkState()))
}

export function restoreBookmarkSnapshot(snapshot, onRestored) {
  if (!snapshot?.groups) return
  setBookmarkGroups(snapshot.groups)
  setActiveGroupId(snapshot.activeGroupId || snapshot.groups[0]?.id)
  saveBookmarks()
  document.getElementById("hidden-bookmarks-popup")?.remove()
  document.getElementById("bookmark-stack-popup")?.remove()
  if (typeof onRestored === "function") {
    onRestored()
  }
}

export function showBookmarkUndo(message, snapshot, onRestored) {
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
    restoreBookmarkSnapshot(snapshot, onRestored)
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
