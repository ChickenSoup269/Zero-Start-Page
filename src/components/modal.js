import { showAlert, showConfirm } from "../utils/dialog.js"
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
  _showManualForm()

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

function _showManualForm() {
  const i18n = geti18n()
  importSection.style.display = "none"
  manualEntryForm.style.display = "block"
  backToManualBtn.style.display = "none"
  modal.querySelector(".modal-content").classList.remove("import-mode")
  modalTitle.textContent = i18n.modal_add_title
}

function _showImportForm() {
  const i18n = geti18n()
  manualEntryForm.style.display = "none"
  importSection.style.display = "block"
  backToManualBtn.style.display = "flex"
  modal.querySelector(".modal-content").classList.add("import-mode")
  modalTitle.textContent = i18n.modal_import_title
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
    renderBookmarks()
    closeModal()
  } else {
    showAlert(i18n.alert_missing_fields)
  }
}

function loadBrowserBookmarks() {
  if (!chrome || !chrome.bookmarks) return
  chrome.bookmarks.getTree((tree) => {
    browserBookmarksList.innerHTML = ""
    renderBookmarkTree(tree[0], browserBookmarksList)
    _updateSelectAllState()
    _updateCountLabel()
  })
}

function renderBookmarkTree(node, container) {
  if (node.children) {
    const sortedChildren = [...node.children].sort((a, b) => {
      const aIsFolder = Array.isArray(a.children)
      const bIsFolder = Array.isArray(b.children)
      if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1
      return (a.title || "").localeCompare(b.title || "", undefined, {
        sensitivity: "base",
      })
    })

    if (node.id !== "0") {
      const wrapper = document.createElement("div")
      wrapper.className = "folder-wrapper"

      const folderDiv = document.createElement("div")
      folderDiv.className = "bookmark-tree-folder"
      folderDiv.innerHTML = `<i class="fa-solid fa-chevron-right"></i><i class="fa-solid fa-folder"></i><span>${node.title}</span>`

      const childrenContainer = document.createElement("div")
      childrenContainer.className = "folder-content"

      folderDiv.addEventListener("click", () => {
        wrapper.classList.toggle("collapsed")
      })

      wrapper.appendChild(folderDiv)
      wrapper.appendChild(childrenContainer)
      container.appendChild(wrapper)

      sortedChildren.forEach((child) => renderBookmarkTree(child, childrenContainer))
    } else {
      sortedChildren.forEach((child) => renderBookmarkTree(child, container))
    }
  } else {
    const itemDiv = document.createElement("div")
    itemDiv.className = "bookmark-tree-item"
    itemDiv.dataset.title = node.title?.toLowerCase() || ""
    itemDiv.dataset.url = node.url?.toLowerCase() || ""

    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.value = JSON.stringify({ title: node.title, url: node.url })

    checkbox.addEventListener("change", () => {
      itemDiv.classList.toggle("selected", checkbox.checked)
      _updateSelectAllState()
      _updateCountLabel()
    })

    itemDiv.addEventListener("click", (e) => {
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked
        checkbox.dispatchEvent(new Event("change"))
      }
    })

    let iconHtml = node.url
      ? `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(node.url)}&sz=32" style="width:14px;height:14px;border-radius:3px;flex-shrink:0;" onerror="this.style.display='none'">`
      : '<i class="fa-solid fa-globe" style="font-size:0.8rem;opacity:0.5;flex-shrink:0;"></i>'
    const label = document.createElement("span")
    label.style.overflow = "hidden"
    label.style.textOverflow = "ellipsis"
    label.style.whiteSpace = "nowrap"
    label.innerHTML = `${iconHtml} ${node.title}`
    label.title = node.url

    itemDiv.appendChild(checkbox)
    itemDiv.appendChild(label)
    container.appendChild(itemDiv)
  }
}

function _updateCountLabel() {
  const i18n = geti18n()
  const countEl = document.getElementById("import-count-label")
  if (!countEl) return
  const checked = browserBookmarksList.querySelectorAll(
    "input[type='checkbox']:checked",
  ).length
  const key =
    checked === 1 ? "modal_count_selected_one" : "modal_count_selected"
  const template = i18n[key] || "{count} selected"
  countEl.textContent = template.replace("{count}", checked)
}

function _updateSelectAllState() {
  const selectAllCb = document.getElementById("import-select-all")
  if (!selectAllCb) return
  const all = browserBookmarksList.querySelectorAll(
    ".bookmark-tree-item:not(.hidden) input[type='checkbox']",
  )
  const checked = browserBookmarksList.querySelectorAll(
    ".bookmark-tree-item:not(.hidden) input[type='checkbox']:checked",
  )
  selectAllCb.indeterminate = checked.length > 0 && checked.length < all.length
  selectAllCb.checked = all.length > 0 && checked.length === all.length
}

function _filterBookmarkTree(query) {
  const q = query.trim().toLowerCase()
  const items = browserBookmarksList.querySelectorAll(".bookmark-tree-item")

  items.forEach((item) => {
    const match =
      !q || item.dataset.title.includes(q) || item.dataset.url.includes(q)
    item.classList.toggle("hidden", !match)
  })

  // Show/hide folder wrappers based on whether they have visible children
  const folders = browserBookmarksList.querySelectorAll(".folder-wrapper")
  folders.forEach((folder) => {
    const visibleItems = folder.querySelectorAll(
      ".bookmark-tree-item:not(.hidden)",
    )
    folder.classList.toggle("hidden", visibleItems.length === 0)
    // Auto-expand folders when searching
    if (q && visibleItems.length > 0) folder.classList.remove("collapsed")
    else if (!q) folder.classList.remove("collapsed")
  })

  _updateSelectAllState()
  _updateCountLabel()

  // Show empty state if nothing matches
  let emptyEl = browserBookmarksList.querySelector(".import-empty-state")
  const visibleCount = browserBookmarksList.querySelectorAll(
    ".bookmark-tree-item:not(.hidden)",
  ).length
  if (visibleCount === 0 && q) {
    if (!emptyEl) {
      emptyEl = document.createElement("div")
      emptyEl.className = "import-empty-state"
      emptyEl.innerHTML =
        '<i class="fa-solid fa-magnifying-glass"></i>No results'
      browserBookmarksList.appendChild(emptyEl)
    }
    emptyEl.style.display = "block"
  } else if (emptyEl) {
    emptyEl.style.display = "none"
  }
}

async function confirmImport() {
  const i18n = geti18n()
  const bookmarks = getBookmarks()
  const checkboxes = browserBookmarksList.querySelectorAll(
    'input[type="checkbox"]:checked',
  )
  
  let newItems = []
  let duplicateItems = []
  
  checkboxes.forEach((cb) => {
    const data = JSON.parse(cb.value)
    if (!bookmarks.some((b) => b.url === data.url)) {
      newItems.push({ title: data.title, url: data.url, icon: "" })
    } else {
      duplicateItems.push({ title: data.title, url: data.url, icon: "" })
    }
  })

  if (duplicateItems.length > 0) {
    const msg = i18n.alert_import_duplicates
      ? i18n.alert_import_duplicates.replace("{count}", duplicateItems.length)
      : `Found ${duplicateItems.length} duplicate bookmark(s). Do you want to import them anyway?`
    
    const takeDuplicates = await showConfirm(msg)
    if (takeDuplicates) {
      newItems.push(...duplicateItems)
    }
  }

  if (newItems.length > 0) {
    bookmarks.push(...newItems)
    setBookmarks(bookmarks)
    saveBookmarks()
    renderBookmarks()
    showAlert(i18n.alert_imported.replace("{count}", newItems.length))
    closeModal()
  } else {
    showAlert(i18n.alert_no_selection)
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
      _showImportForm()
      loadBrowserBookmarks()
    } else {
      showAlert(i18n.alert_api_unavailable)
    }
  })

  backToManualBtn.addEventListener("click", () => {
    _showManualForm()
    if (editingIndex !== null) {
      modalTitle.textContent = i18n.modal_edit_title
    }
  })

  confirmImportBtn.addEventListener("click", confirmImport)

  // Search filter
  const searchInput = document.getElementById("import-search")
  if (searchInput) {
    searchInput.addEventListener("input", (e) =>
      _filterBookmarkTree(e.target.value),
    )
  }

  // Select all
  const selectAllCb = document.getElementById("import-select-all")
  if (selectAllCb) {
    selectAllCb.addEventListener("change", () => {
      const visible = browserBookmarksList.querySelectorAll(
        ".bookmark-tree-item:not(.hidden) input[type='checkbox']",
      )
      visible.forEach((cb) => {
        cb.checked = selectAllCb.checked
        cb.closest(".bookmark-tree-item").classList.toggle(
          "selected",
          selectAllCb.checked,
        )
      })
      _updateCountLabel()
    })
  }
}
