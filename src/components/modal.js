import {
  modal,
  closeModalBtn,
  saveBookmarkBtn,
  bookmarkTitleInput,
  bookmarkUrlInput,
  bookmarkIconInput,
  modalTitle,
  manualEntryForm,
  importSection,
  showImportBtn,
  backToManualBtn,
  confirmImportBtn,
  browserBookmarksList,
} from "../utils/dom.js"
import { getBookmarks, setBookmarks, saveBookmarks } from "../services/state.js"
import { geti18n } from "../services/i18n.js"
import { renderBookmarks } from "./bookmarks.js"

let editingIndex = null

export function openModal(index = null) {
  const i18n = geti18n()
  modal.classList.add("show")
  editingIndex = index
  importSection.style.display = "none"
  manualEntryForm.style.display = "block"

  if (index !== null) {
    const bookmarks = getBookmarks()
    modalTitle.textContent = i18n.modal_edit_title
    const bookmark = bookmarks[index]
    bookmarkTitleInput.value = bookmark.title
    bookmarkUrlInput.value = bookmark.url
    bookmarkIconInput.value = bookmark.icon || ""
  } else {
    modalTitle.textContent = i18n.modal_add_title
    bookmarkTitleInput.value = ""
    bookmarkUrlInput.value = ""
    bookmarkIconInput.value = ""
  }
  bookmarkTitleInput.focus()
}

export function closeModal() {
  modal.classList.remove("show")
  editingIndex = null
}

function saveBookmark() {
  const i18n = geti18n()
  const bookmarks = getBookmarks()
  const title = bookmarkTitleInput.value.trim()
  let url = bookmarkUrlInput.value.trim()
  const icon = bookmarkIconInput.value.trim()

  if (title && url) {
    if (!url.match(/^https?:\/\//)) url = "https://" + url
    const newBookmark = { title, url, icon }
    if (editingIndex !== null) {
      bookmarks[editingIndex] = newBookmark
    } else {
      bookmarks.push(newBookmark)
    }
    setBookmarks(bookmarks)
    saveBookmarks()
    renderBookmarks() // Re-render after saving
    closeModal()
  } else {
    alert(i18n.alert_missing_fields)
  }
}

function loadBrowserBookmarks() {
  if (!chrome || !chrome.bookmarks) return
  chrome.bookmarks.getTree((tree) => {
    browserBookmarksList.innerHTML = ""
    renderBookmarkTree(tree[0], browserBookmarksList)
  })
}

function renderBookmarkTree(node, container) {
  if (node.children) {
    if (node.id !== "0") {
      const folderDiv = document.createElement("div")
      folderDiv.className = "bookmark-tree-folder expanded"
      folderDiv.innerHTML = `<i class="fa-solid fa-chevron-right"></i> <i class="fa-regular fa-folder"></i> <span>${node.title}</span>`
      const childrenContainer = document.createElement("div")
      childrenContainer.className = "folder-content"
      folderDiv.addEventListener("click", () =>
        folderDiv.parentElement.classList.toggle("collapsed")
      )
      container.appendChild(folderDiv)
      container.appendChild(childrenContainer)
      node.children.forEach((child) =>
        renderBookmarkTree(child, childrenContainer)
      )
    } else {
      node.children.forEach((child) => renderBookmarkTree(child, container))
    }
  } else {
    const itemDiv = document.createElement("div")
    itemDiv.className = "bookmark-tree-item"
    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.value = JSON.stringify({ title: node.title, url: node.url })
    itemDiv.addEventListener("click", (e) => {
      if (e.target !== checkbox) checkbox.checked = !checkbox.checked
    })
    let iconHtml = node.url
      ? `<img src="https://www.google.com/s2/favicons?domain=${node.url}&sz=128" style="width:16px;height:16px;margin-right:5px;">`
      : '<i class="fa-solid fa-earth-americas"></i>'
    const label = document.createElement("span")
    label.innerHTML = `${iconHtml} ${node.title}`
    label.title = node.url
    itemDiv.appendChild(checkbox)
    itemDiv.appendChild(label)
    container.appendChild(itemDiv)
  }
}

function confirmImport() {
  const i18n = geti18n()
  const bookmarks = getBookmarks()
  const checkboxes = browserBookmarksList.querySelectorAll(
    'input[type="checkbox"]:checked'
  )
  let addedCount = 0
  checkboxes.forEach((cb) => {
    const data = JSON.parse(cb.value)
    if (!bookmarks.some((b) => b.url === data.url)) {
      bookmarks.push({ title: data.title, url: data.url, icon: "" })
      addedCount++
    }
  })

  if (addedCount > 0) {
    setBookmarks(bookmarks)
    saveBookmarks()
    renderBookmarks() // Re-render after importing
    alert(i18n.alert_imported.replace("{count}", addedCount))
    closeModal()
  } else {
    alert(i18n.alert_no_selection)
  }
}

export function initModal() {
  const i18n = geti18n()
  saveBookmarkBtn.addEventListener("click", saveBookmark)
  closeModalBtn.addEventListener("click", closeModal)
  window.addEventListener("click", (e) => {
    if (e.target === modal) closeModal()
  })

  showImportBtn.addEventListener("click", () => {
    if (chrome && chrome.bookmarks) {
      manualEntryForm.style.display = "none"
      importSection.style.display = "block"
      modalTitle.textContent = i18n.modal_import_title
      loadBrowserBookmarks()
    } else {
      alert(i18n.alert_api_unavailable)
    }
  })

  backToManualBtn.addEventListener("click", () => {
    importSection.style.display = "none"
    manualEntryForm.style.display = "block"
    modalTitle.textContent = i18n.modal_add_title
  })

  confirmImportBtn.addEventListener("click", confirmImport)
}