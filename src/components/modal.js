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
import {
  getBookmarks,
  setBookmarks,
  saveBookmarks,
  getBookmarkGroups,
  setBookmarkGroups,
} from "../services/state.js"
import { geti18n } from "../services/i18n.js"
import {
  captureBookmarkSnapshot,
  invalidateBookmarkIconCache,
  renderBookmarks,
  showBookmarkUndo,
} from "./bookmarks.js"

let editingIndex = null
let editingTarget = null
let bookmarkEditPopover = null

const BOOKMARK_ICON_OPTIONS = [
  {
    key: "auto",
    icon: "fa-solid fa-wand-magic-sparkles",
    label: "Auto",
    getValue: () => "",
  },
  {
    key: "iconhorse",
    icon: "fa-solid fa-horse-head",
    label: "Icon Horse",
    getValue: (url) => {
      const host = getBookmarkHostname(url)
      return host ? `https://icon.horse/icon/${host}` : ""
    },
  },
  {
    key: "duckduckgo",
    icon: "fa-solid fa-shield-halved",
    label: "DuckDuckGo",
    getValue: (url) => {
      const host = getBookmarkHostname(url)
      return host ? `https://icons.duckduckgo.com/ip3/${host}.ico` : ""
    },
  },
  {
    key: "google",
    icon: "fa-brands fa-google",
    label: "Google",
    getValue: (url) => {
      const host = getBookmarkHostname(url)
      return host
        ? `https://www.google.com/s2/favicons?domain=${host}&sz=128`
        : ""
    },
  },
]

const BOOKMARK_FOLDER_ICON_OPTIONS = [
  // General & Essentials
  { key: "auto", icon: "fa-solid fa-border-all", label: "Auto (Grid)", value: "", category: "all" },
  { key: "folder", icon: "fa-solid fa-folder", label: "Folder", value: "fa:fa-solid fa-folder", category: "all" },
  { key: "folder-open", icon: "fa-solid fa-folder-open", label: "Open Folder", value: "fa:fa-solid fa-folder-open", category: "all" },
  { key: "layer", icon: "fa-solid fa-layer-group", label: "Stack", value: "fa:fa-solid fa-layer-group", category: "all" },
  { key: "bookmark", icon: "fa-solid fa-bookmark", label: "Bookmark", value: "fa:fa-solid fa-bookmark", category: "all" },
  { key: "star", icon: "fa-solid fa-star", label: "Star", value: "fa:fa-solid fa-star", category: "all" },
  { key: "heart", icon: "fa-solid fa-heart", label: "Favorite", value: "fa:fa-solid fa-heart", category: "all" },
  { key: "sparkles", icon: "fa-solid fa-wand-magic-sparkles", label: "Sparkles", value: "fa:fa-solid fa-wand-magic-sparkles", category: "all" },
  { key: "fire", icon: "fa-solid fa-fire", label: "Trending", value: "fa:fa-solid fa-fire", category: "all" },
  { key: "rocket", icon: "fa-solid fa-rocket", label: "Rocket", value: "fa:fa-solid fa-rocket", category: "all" },
  
  // Work & Productivity
  { key: "briefcase", icon: "fa-solid fa-briefcase", label: "Work", value: "fa:fa-solid fa-briefcase", category: "work" },
  { key: "chart", icon: "fa-solid fa-chart-line", label: "Analytics", value: "fa:fa-solid fa-chart-line", category: "work" },
  { key: "calendar", icon: "fa-solid fa-calendar-days", label: "Calendar", value: "fa:fa-solid fa-calendar-days", category: "work" },
  { key: "envelope", icon: "fa-solid fa-envelope", label: "Mail", value: "fa:fa-solid fa-envelope", category: "work" },
  { key: "cloud", icon: "fa-solid fa-cloud", label: "Cloud", value: "fa:fa-solid fa-cloud", category: "work" },
  { key: "file", icon: "fa-solid fa-file-lines", label: "Docs", value: "fa:fa-solid fa-file-lines", category: "work" },

  // Dev & Tech
  { key: "code", icon: "fa-solid fa-code", label: "Code", value: "fa:fa-solid fa-code", category: "dev" },
  { key: "terminal", icon: "fa-solid fa-terminal", label: "Terminal", value: "fa:fa-solid fa-terminal", category: "dev" },
  { key: "robot", icon: "fa-solid fa-robot", label: "AI & Bot", value: "fa:fa-solid fa-robot", category: "dev" },
  { key: "database", icon: "fa-solid fa-database", label: "Database", value: "fa:fa-solid fa-database", category: "dev" },
  { key: "gear", icon: "fa-solid fa-gear", label: "Settings", value: "fa:fa-solid fa-gear", category: "dev" },
  { key: "shield", icon: "fa-solid fa-shield-halved", label: "Security", value: "fa:fa-solid fa-shield-halved", category: "dev" },
  { key: "bug", icon: "fa-solid fa-bug", label: "Debug", value: "fa:fa-solid fa-bug", category: "dev" },

  // Media & Design
  { key: "image", icon: "fa-solid fa-image", label: "Photos", value: "fa:fa-solid fa-image", category: "media" },
  { key: "camera", icon: "fa-solid fa-camera", label: "Camera", value: "fa:fa-solid fa-camera", category: "media" },
  { key: "music", icon: "fa-solid fa-music", label: "Music", value: "fa:fa-solid fa-music", category: "media" },
  { key: "video", icon: "fa-solid fa-film", label: "Video", value: "fa:fa-solid fa-film", category: "media" },
  { key: "palette", icon: "fa-solid fa-palette", label: "Design", value: "fa:fa-solid fa-palette", category: "media" },
  { key: "headphones", icon: "fa-solid fa-headphones", label: "Audio", value: "fa:fa-solid fa-headphones", category: "media" },

  // Life, Study & Fun
  { key: "book", icon: "fa-solid fa-book", label: "Study", value: "fa:fa-solid fa-book", category: "fun" },
  { key: "graduation", icon: "fa-solid fa-graduation-cap", label: "Education", value: "fa:fa-solid fa-graduation-cap", category: "fun" },
  { key: "gamepad", icon: "fa-solid fa-gamepad", label: "Gaming", value: "fa:fa-solid fa-gamepad", category: "fun" },
  { key: "cart", icon: "fa-solid fa-cart-shopping", label: "Shopping", value: "fa:fa-solid fa-cart-shopping", category: "fun" },
  { key: "globe", icon: "fa-solid fa-globe", label: "Web", value: "fa:fa-solid fa-globe", category: "fun" },
  { key: "compass", icon: "fa-solid fa-compass", label: "Explore", value: "fa:fa-solid fa-compass", category: "fun" },
  { key: "coffee", icon: "fa-solid fa-mug-hot", label: "Coffee", value: "fa:fa-solid fa-mug-hot", category: "fun" },
]

function getBookmarkHostname(url) {
  try {
    const normalized = /^https?:\/\//.test(url) ? url : `https://${url}`
    return new URL(normalized).hostname
  } catch {
    return ""
  }
}

function getBookmarkForEdit(index, target) {
  const bookmarks = getBookmarks()
  if (target?.type === "stackItem") {
    if (target.stack?.items?.[target.itemIndex]) {
      return target.stack.items[target.itemIndex]
    }
    return bookmarks[target.stackIndex]?.items?.[target.itemIndex] || null
  }
  if (index !== null) return bookmarks[index] || null
  return null
}

function positionBookmarkEditPopover(popover, anchor) {
  const margin = 12
  const width = popover.offsetWidth || 340
  const height = popover.offsetHeight || 420

  // 1. Check if anchor is inside or related to a bookmark-stack-popup or hidden-bookmarks-popup
  const stackPopup =
    anchor?.closest?.(".bookmark-stack-popup, .hidden-bookmarks-popup") ||
    document.querySelector(".bookmark-stack-popup, .hidden-bookmarks-popup")

  if (stackPopup && stackPopup.isConnected) {
    const pr = stackPopup.getBoundingClientRect()
    if (pr.width > 0 && pr.height > 0) {
      // Try placing docked to the right of the stack popup:
      if (pr.right + width + margin <= window.innerWidth) {
        let top = pr.top
        top = Math.min(Math.max(top, margin), window.innerHeight - height - margin)
        popover.style.left = `${Math.round(pr.right + 10)}px`
        popover.style.top = `${Math.round(top)}px`
        return
      }
      // If not enough room on right, try placing docked to the left of the stack popup:
      if (pr.left - width - margin >= 0) {
        let top = pr.top
        top = Math.min(Math.max(top, margin), window.innerHeight - height - margin)
        popover.style.left = `${Math.round(pr.left - width - 10)}px`
        popover.style.top = `${Math.round(top)}px`
        return
      }
      // If neither side has enough horizontal room, place below/above popup centered:
      let left = Math.min(
        Math.max(pr.left + (pr.width - width) / 2, margin),
        window.innerWidth - width - margin,
      )
      let top = pr.bottom + 10
      if (top + height > window.innerHeight - margin) {
        top = Math.max(margin, pr.top - height - 10)
      }
      popover.style.left = `${Math.round(left)}px`
      popover.style.top = `${Math.round(top)}px`
      return
    }
  }

  // 2. Standard anchor positioning for bookmarks / elements on the main page
  let anchorRect = null
  if (anchor && typeof anchor.getBoundingClientRect === "function") {
    if (anchor.isConnected !== false) {
      const r = anchor.getBoundingClientRect()
      if (
        r &&
        (r.width > 0 || r.height > 0) &&
        r.bottom > 0 &&
        r.top < window.innerHeight &&
        r.right > 0 &&
        r.left < window.innerWidth
      ) {
        anchorRect = r
      }
    }
  }

  let left = anchorRect
    ? anchorRect.left + anchorRect.width / 2 - width / 2
    : window.innerWidth / 2 - width / 2
  let top = anchorRect
    ? anchorRect.bottom + 10
    : window.innerHeight / 2 - height / 2

  if (anchorRect && top + height > window.innerHeight - margin) {
    top = anchorRect.top - height - 10
  }

  left = Math.min(Math.max(left, margin), window.innerWidth - width - margin)
  top = Math.min(Math.max(top, margin), window.innerHeight - height - margin)

  popover.style.left = `${left}px`
  popover.style.top = `${top}px`
}

export function closeBookmarkEditPopover() {
  if (!bookmarkEditPopover) return
  bookmarkEditPopover.remove()
  bookmarkEditPopover = null
  editingIndex = null
  editingTarget = null
}

export function openBookmarkEditPopover(
  index = null,
  target = null,
  anchor = null,
  options = {},
) {
  const i18n = geti18n()
  const bookmark = getBookmarkForEdit(index, target)
  if (!bookmark) return

  closeModal()
  closeBookmarkEditPopover()

  editingIndex = index
  editingTarget = target

  const popover = document.createElement("div")
  popover.className = "bookmark-edit-popover"
  popover.setAttribute("role", "dialog")
  popover.setAttribute("aria-label", i18n.modal_edit_title || "Edit Bookmark")

  const title = document.createElement("div")
  title.className = "bookmark-edit-popover-title"
  title.innerHTML = `<i class="fa-solid fa-bookmark"></i><span>${i18n.modal_edit_title || "Edit Bookmark"}</span>`

  const closeBtn = document.createElement("button")
  closeBtn.type = "button"
  closeBtn.className = "bookmark-edit-popover-close"
  closeBtn.setAttribute("aria-label", i18n.close || "Close")
  closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
  closeBtn.addEventListener("click", closeBookmarkEditPopover)
  title.appendChild(closeBtn)
  popover.appendChild(title)

  const iconPreview = document.createElement("div")
  iconPreview.className = "bookmark-edit-icon-preview"
  popover.appendChild(iconPreview)

  const iconGrid = document.createElement("div")
  iconGrid.className = "bookmark-edit-icon-grid"
  popover.appendChild(iconGrid)

  const form = document.createElement("div")
  form.className = "bookmark-edit-fields"

  const titleGroup = document.createElement("label")
  titleGroup.className = "bookmark-edit-field"
  titleGroup.innerHTML = `<span>${i18n.modal_title_placeholder || "Title"}</span>`
  const titleInput = document.createElement("input")
  titleInput.type = "text"
  titleInput.value = bookmark.title || ""
  titleGroup.appendChild(titleInput)

  const urlGroup = document.createElement("label")
  urlGroup.className = "bookmark-edit-field"
  urlGroup.innerHTML = `<span>${i18n.modal_url_placeholder || "URL"}</span>`
  const urlInput = document.createElement("input")
  urlInput.type = "url"
  urlInput.value = bookmark.url || ""
  urlGroup.appendChild(urlInput)

  const iconGroup = document.createElement("label")
  iconGroup.className = "bookmark-edit-field"
  iconGroup.innerHTML = `<span>${i18n.modal_icon_placeholder || "Custom Icon URL (Optional)"}</span>`
  const iconInput = document.createElement("input")
  iconInput.type = "url"
  iconInput.value = bookmark.icon || ""
  iconGroup.appendChild(iconInput)

  form.appendChild(titleGroup)
  form.appendChild(urlGroup)
  form.appendChild(iconGroup)

  const actions = document.createElement("div")
  actions.className = "bookmark-edit-actions"
  const cancelBtn = document.createElement("button")
  cancelBtn.type = "button"
  cancelBtn.className = "secondary-btn"
  cancelBtn.innerHTML = `<i class="fa-solid fa-xmark"></i><span>${i18n.cancel || "Cancel"}</span>`
  cancelBtn.addEventListener("click", closeBookmarkEditPopover)
  const saveBtn = document.createElement("button")
  saveBtn.type = "button"
  saveBtn.className = "primary-btn"
  saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i><span>${i18n.modal_save || "Save"}</span>`
  actions.appendChild(cancelBtn)
  actions.appendChild(saveBtn)
  form.appendChild(actions)
  popover.appendChild(form)

  const updatePreview = () => {
    iconPreview.innerHTML = ""
    const icon = iconInput.value.trim()
    if (icon) {
      const img = document.createElement("img")
      img.src = icon
      img.alt = ""
      img.referrerPolicy = "no-referrer"
      img.addEventListener("error", () => {
        iconPreview.textContent = (titleInput.value || "?").charAt(0).toUpperCase()
      })
      iconPreview.appendChild(img)
    } else {
      iconPreview.textContent = (titleInput.value || "?").charAt(0).toUpperCase()
    }
  }

  const syncIconButtons = () => {
    const current = iconInput.value.trim()
    iconGrid.querySelectorAll("button").forEach((button) => {
      const value = button.dataset.value || ""
      button.classList.toggle("active", current === value)
    })
  }

  const rebuildIconOptions = () => {
    iconGrid.innerHTML = ""
    BOOKMARK_ICON_OPTIONS.forEach((option) => {
      const value = option.getValue(urlInput.value.trim())
      const button = document.createElement("button")
      button.type = "button"
      button.dataset.value = value
      button.title = option.label
      button.innerHTML = `<i class="${option.icon}"></i><span>${option.label}</span>`
      button.addEventListener("click", () => {
        iconInput.value = value
        syncIconButtons()
        updatePreview()
      })
      iconGrid.appendChild(button)
    })

    const customButton = document.createElement("button")
    customButton.type = "button"
    customButton.className = "bookmark-edit-custom-icon-btn"
    customButton.innerHTML = `<i class="fa-solid fa-pen-to-square"></i><span>${i18n.bookmark_edit_icon || "Edit icon"}</span>`
    customButton.addEventListener("click", () => iconInput.focus())
    iconGrid.appendChild(customButton)
    syncIconButtons()
  }

  const saveEdit = () => {
    const title = titleInput.value.trim()
    let url = urlInput.value.trim()
    const icon = iconInput.value.trim()

    if (!title || !url) {
      showAlert(i18n.alert_missing_fields)
      return
    }

    const oldUrl = bookmark.url
    const snapshot = captureBookmarkSnapshot()
    if (!url.match(/^https?:\/\//)) url = `https://${url}`
    const updatedBookmark = { title, url, icon }
    const bookmarks = getBookmarks()

    if (editingTarget?.type === "stackItem") {
      if (editingTarget.stack?.items?.[editingTarget.itemIndex]) {
        editingTarget.stack.items[editingTarget.itemIndex] = updatedBookmark
      } else {
        const stack = bookmarks[editingTarget.stackIndex]
        if (stack?.items?.[editingTarget.itemIndex]) {
          stack.items[editingTarget.itemIndex] = updatedBookmark
        }
      }
    } else if (editingIndex !== null) {
      bookmarks[editingIndex] = updatedBookmark
    }

    setBookmarks(bookmarks)
    invalidateBookmarkIconCache(oldUrl)
    invalidateBookmarkIconCache(url)
    saveBookmarks()
    renderBookmarks()
    closeBookmarkEditPopover()
    showBookmarkUndo(i18n.bookmark_updated || "Bookmark updated", snapshot)
  }

  saveBtn.addEventListener("click", saveEdit)
  ;[titleInput, urlInput, iconInput].forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault()
        saveEdit()
      } else if (event.key === "Escape") {
        closeBookmarkEditPopover()
      }
    })
  })
  titleInput.addEventListener("input", updatePreview)
  iconInput.addEventListener("input", () => {
    syncIconButtons()
    updatePreview()
  })
  urlInput.addEventListener("input", rebuildIconOptions)

  document.body.appendChild(popover)
  bookmarkEditPopover = popover
  rebuildIconOptions()
  updatePreview()
  positionBookmarkEditPopover(popover, anchor)

  const closeOnOutside = (event) => {
    if (!popover.contains(event.target) && !anchor?.contains?.(event.target)) {
      closeBookmarkEditPopover()
      document.removeEventListener("pointerdown", closeOnOutside)
    }
  }
  setTimeout(() => document.addEventListener("pointerdown", closeOnOutside), 0)

  const focusTarget = options.focus === "icon" ? iconInput : titleInput
  focusTarget.focus()
  focusTarget.select?.()
}

function renderFolderIconPreview(target, iconValue, fallbackText = "?") {
  target.innerHTML = ""
  const value = iconValue.trim()
  if (value.startsWith("fa:")) {
    const icon = document.createElement("i")
    icon.className = value.slice(3)
    target.appendChild(icon)
    return
  }

  if (value) {
    const img = document.createElement("img")
    img.src = value
    img.alt = ""
    img.referrerPolicy = "no-referrer"
    img.addEventListener("error", () => {
      target.textContent = fallbackText.charAt(0).toUpperCase()
    })
    target.appendChild(img)
    return
  }

  target.textContent = fallbackText.charAt(0).toUpperCase()
}

function applyFolderIconColor(target, color) {
  const nextColor = String(color || "").trim()
  if (nextColor) target.style.setProperty("--folder-edit-icon-color", nextColor)
  else target.style.removeProperty("--folder-edit-icon-color")
}

function createFolderIconEditor({
  title,
  name,
  icon,
  iconColor = "",
  showIconColor = false,
  allowIconEdit = true,
  anchor,
  focus = "name",
  onSave,
}) {
  const i18n = geti18n()
  closeModal()
  closeBookmarkEditPopover()

  const popover = document.createElement("div")
  popover.className = "bookmark-edit-popover bookmark-folder-edit-popover"
  popover.setAttribute("role", "dialog")
  popover.setAttribute("aria-label", title)

  const heading = document.createElement("div")
  heading.className = "bookmark-edit-popover-title"
  heading.innerHTML = `<i class="fa-solid fa-folder"></i><span>${title}</span>`
  const closeBtn = document.createElement("button")
  closeBtn.type = "button"
  closeBtn.className = "bookmark-edit-popover-close"
  closeBtn.setAttribute("aria-label", i18n.close || "Close")
  closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
  closeBtn.addEventListener("click", closeBookmarkEditPopover)
  heading.appendChild(closeBtn)
  popover.appendChild(heading)

  let iconPreview = null
  let iconGrid = null
  let iconInput = null
  let iconColorInput = null
  let iconColorDirty = false
  let iconColorReset = false

  const updatePreview = () => {
    if (!allowIconEdit) return
    applyFolderIconColor(
      iconPreview,
      iconColorReset ? "" : iconColorInput?.value || "",
    )
    renderFolderIconPreview(iconPreview, iconInput?.value || icon || "", nameInput?.value || "?")
  }

  const syncButtons = () => {
    if (!allowIconEdit || !iconGrid) return
    const current = (iconInput?.value || icon || "").trim()
    iconGrid.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", (button.dataset.value || "") === current)
    })
  }

  if (allowIconEdit) {
    iconPreview = document.createElement("div")
    iconPreview.className = "bookmark-edit-icon-preview bookmark-folder-icon-preview"
    popover.appendChild(iconPreview)

    let activeCategory = "all"
    let searchQuery = ""

    const searchInput = document.createElement("input")
    searchInput.type = "text"
    searchInput.className = "bookmark-folder-icon-search"
    searchInput.placeholder = i18n.bookmark_folder_search_icons || "Search icon (code, game, star, work)..."
    popover.appendChild(searchInput)

    const categoryChips = document.createElement("div")
    categoryChips.className = "bookmark-folder-category-chips"
    const categories = [
      { id: "all", label: "All" },
      { id: "work", label: "Work" },
      { id: "dev", label: "Dev" },
      { id: "media", label: "Media" },
      { id: "fun", label: "Life & Fun" },
    ]
    categories.forEach((cat) => {
      const chip = document.createElement("button")
      chip.type = "button"
      chip.className = `bookmark-folder-chip ${cat.id === "all" ? "active" : ""}`
      chip.textContent = cat.label
      chip.addEventListener("click", () => {
        activeCategory = cat.id
        categoryChips.querySelectorAll(".bookmark-folder-chip").forEach((c) => c.classList.remove("active"))
        chip.classList.add("active")
        renderIconGrid()
      })
      categoryChips.appendChild(chip)
    })
    popover.appendChild(categoryChips)

    iconGrid = document.createElement("div")
    iconGrid.className = "bookmark-edit-icon-grid bookmark-folder-icon-grid"
    popover.appendChild(iconGrid)

    const renderIconGrid = () => {
      iconGrid.innerHTML = ""
      const q = searchQuery.toLowerCase().trim()
      const filtered = BOOKMARK_FOLDER_ICON_OPTIONS.filter((opt) => {
        const matchesCat = activeCategory === "all" || opt.category === activeCategory || opt.category === "all"
        const matchesQuery = !q || opt.label.toLowerCase().includes(q) || opt.icon.toLowerCase().includes(q) || opt.key.includes(q)
        return matchesCat && matchesQuery
      })

      filtered.forEach((option) => {
        const button = document.createElement("button")
        button.type = "button"
        button.dataset.value = option.value
        button.title = option.label
        button.innerHTML = `<i class="${option.icon}"></i><span>${option.label}</span>`
        button.addEventListener("click", () => {
          if (iconInput) iconInput.value = option.value
          syncButtons()
          updatePreview()
        })
        iconGrid.appendChild(button)
      })
      syncButtons()
    }

    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value
      renderIconGrid()
    })

    renderIconGrid()
  }

  const fields = document.createElement("div")
  fields.className = "bookmark-edit-fields"

  const nameGroup = document.createElement("label")
  nameGroup.className = "bookmark-edit-field"
  nameGroup.innerHTML = `<span>${i18n.modal_title_placeholder || "Title"}</span>`
  const nameInput = document.createElement("input")
  nameInput.type = "text"
  nameInput.value = name || ""
  nameGroup.appendChild(nameInput)
  fields.appendChild(nameGroup)

  if (allowIconEdit) {
    const iconGroup = document.createElement("label")
    iconGroup.className = "bookmark-edit-field"
    iconGroup.innerHTML = `<span>${i18n.bookmark_folder_icon || "Custom Icon (FontAwesome class or URL)"}</span>`
    iconInput = document.createElement("input")
    iconInput.type = "text"
    iconInput.value = icon || ""
    iconInput.placeholder = "e.g. fa:fa-solid fa-guitar or URL"
    iconGroup.appendChild(iconInput)
    fields.appendChild(iconGroup)
  }

  if (showIconColor) {
    const iconColorGroup = document.createElement("label")
    iconColorGroup.className = "bookmark-edit-field bookmark-edit-color-field"
    iconColorGroup.innerHTML = `<span>${i18n.bookmark_group_icon_color || "Icon color"}</span>`
    const iconColorControl = document.createElement("div")
    iconColorControl.className = "bookmark-edit-color-control"
    iconColorInput = document.createElement("input")
    iconColorInput.type = "color"
    iconColorInput.value = iconColor || "#ffffff"
    iconColorInput.addEventListener("input", () => {
      iconColorDirty = true
      iconColorReset = false
    })
    const resetIconColorBtn = document.createElement("button")
    resetIconColorBtn.type = "button"
    resetIconColorBtn.className = "secondary-btn bookmark-edit-color-reset"
    resetIconColorBtn.title = i18n.settings_reset_default || "Reset Default"
    resetIconColorBtn.setAttribute(
      "aria-label",
      i18n.settings_reset_default || "Reset Default",
    )
    resetIconColorBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i>'
    resetIconColorBtn.addEventListener("click", (event) => {
      event.preventDefault()
      iconColorDirty = true
      iconColorReset = true
      iconColorInput.value = "#ffffff"
      updatePreview()
    })
    iconColorControl.appendChild(iconColorInput)
    iconColorControl.appendChild(resetIconColorBtn)
    iconColorGroup.appendChild(iconColorControl)
    fields.appendChild(iconColorGroup)
  }

  const actions = document.createElement("div")
  actions.className = "bookmark-edit-actions"
  const cancelBtn = document.createElement("button")
  cancelBtn.type = "button"
  cancelBtn.className = "secondary-btn"
  cancelBtn.innerHTML = `<i class="fa-solid fa-xmark"></i><span>${i18n.cancel || "Cancel"}</span>`
  cancelBtn.addEventListener("click", closeBookmarkEditPopover)
  const saveBtn = document.createElement("button")
  saveBtn.type = "button"
  saveBtn.className = "primary-btn"
  saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i><span>${i18n.modal_save || "Save"}</span>`
  actions.appendChild(cancelBtn)
  actions.appendChild(saveBtn)
  fields.appendChild(actions)
  popover.appendChild(fields)

  const saveFolder = () => {
    const nextName = nameInput.value.trim()
    if (!nextName) {
      showAlert(i18n.alert_missing_fields)
      return
    }
    onSave({
      name: nextName,
      icon: allowIconEdit ? (iconInput?.value || "").trim() : (icon || ""),
      iconColor:
        showIconColor && (iconColorDirty || iconColor)
          ? iconColorReset
            ? ""
            : iconColorInput?.value || ""
          : undefined,
    })
    closeBookmarkEditPopover()
  }

  saveBtn.addEventListener("click", saveFolder)
  const inputsToListen = [nameInput]
  if (allowIconEdit && iconInput) inputsToListen.push(iconInput)
  if (showIconColor && iconColorInput) inputsToListen.push(iconColorInput)
  
  inputsToListen.filter(Boolean).forEach((input) => {
    input.addEventListener("input", () => {
      syncButtons()
      updatePreview()
    })
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault()
        saveFolder()
      } else if (event.key === "Escape") {
        closeBookmarkEditPopover()
      }
    })
  })

  document.body.appendChild(popover)
  bookmarkEditPopover = popover
  syncButtons()
  updatePreview()
  positionBookmarkEditPopover(popover, anchor)

  const closeOnOutside = (event) => {
    if (!popover.contains(event.target) && !anchor?.contains?.(event.target)) {
      closeBookmarkEditPopover()
      document.removeEventListener("pointerdown", closeOnOutside)
    }
  }
  setTimeout(() => document.addEventListener("pointerdown", closeOnOutside), 0)

  const focusTarget = focus === "icon" ? (iconInput || nameInput) : nameInput
  focusTarget.focus()
  focusTarget.select?.()
}

export function openBookmarkStackEditPopover(
  stackOrIndex,
  anchor = null,
  options = {},
) {
  const i18n = geti18n()
  const bookmarks = getBookmarks()
  let stack = null
  let stackIndex = null

  if (typeof stackOrIndex === "number") {
    stackIndex = stackOrIndex
    stack = bookmarks[stackIndex]
  } else if (stackOrIndex && typeof stackOrIndex === "object") {
    if (stackOrIndex.stack) {
      stack = stackOrIndex.stack
      stackIndex = stackOrIndex.stackIndex
    } else {
      stack = stackOrIndex
    }
  }

  if (!stack || !Array.isArray(stack.items)) return

  createFolderIconEditor({
    title: i18n.bookmark_stack_edit || "Edit bookmark folder",
    name: stack.title || i18n.bookmark_stack_default_name || "Bookmark Group",
    icon: stack.icon || "",
    iconColor: stack.iconColor || "",
    allowIconEdit: true,
    showIconColor: true,
    anchor,
    focus: options.focus,
    onSave: ({ name, icon, iconColor }) => {
      const snapshot = captureBookmarkSnapshot()
      stack.title = name
      stack.icon = icon
      if (iconColor !== undefined) stack.iconColor = iconColor || ""

      if (typeof stackIndex === "number" && bookmarks[stackIndex]) {
        bookmarks[stackIndex].title = name
        bookmarks[stackIndex].icon = icon
        if (iconColor !== undefined) bookmarks[stackIndex].iconColor = iconColor || ""
        setBookmarks(bookmarks)
      }

      saveBookmarks()
      renderBookmarks()

      const popup = document.getElementById("bookmark-stack-popup")
      if (popup) {
        const titleEl = popup.querySelector(".bookmark-stack-popup-title")
        if (titleEl) titleEl.textContent = name
        const headerIcon = popup.querySelector(".bookmark-stack-popup-header-icon")
        if (headerIcon) {
          if (iconColor) headerIcon.style.color = iconColor
          else headerIcon.style.removeProperty("color")
        }
      }

      showBookmarkUndo(i18n.bookmark_group_renamed || "Folder updated", snapshot)
    },
  })
}

export function openBookmarkGroupEditPopover(groupId, anchor = null, options = {}) {
  const i18n = geti18n()
  const groups = getBookmarkGroups()
  const group = groups.find((item) => item.id === groupId)
  if (!group) return

  createFolderIconEditor({
    title: i18n.bookmark_group_edit || "Edit bookmark folder",
    name: group.name,
    icon: group.icon || "",
    iconColor: group.iconColor || "",
    showIconColor: true,
    anchor,
    focus: options.focus,
    onSave: ({ name, icon, iconColor }) => {
      const snapshot = captureBookmarkSnapshot()
      const nextGroups = getBookmarkGroups()
      const nextGroup = nextGroups.find((item) => item.id === groupId)
      if (!nextGroup) return
      nextGroup.name = name
      nextGroup.icon = icon
      if (iconColor !== undefined) nextGroup.iconColor = iconColor || ""
      setBookmarkGroups(nextGroups)
      saveBookmarks()
      renderBookmarks()
      showBookmarkUndo(i18n.bookmark_group_renamed || "Group updated", snapshot)
    },
  })
}

export function openModal(index = null, target = null) {
  const i18n = geti18n()
  closeBookmarkEditPopover()
  modal.classList.add("show")
  editingIndex = index
  editingTarget = target
  _showManualForm()

  if (editingTarget?.type === "stackItem") {
    const bookmarks = getBookmarks()
    const bookmark =
      bookmarks[editingTarget.stackIndex]?.items?.[editingTarget.itemIndex]
    if (!bookmark) {
      closeModal()
      return
    }
    modalTitle.textContent = i18n.modal_edit_title
    bookmarkTitleInput.value = bookmark.title
    bookmarkUrlInput.value = bookmark.url
    bookmarkIconInput.value = bookmark.icon || ""
  } else if (index !== null) {
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
  editingTarget = null
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
    const snapshot = captureBookmarkSnapshot()
    const wasEditing = editingIndex !== null || editingTarget !== null
    if (!url.match(/^https?:\/\//)) url = "https://" + url
    const newBookmark = { title, url, icon }
    if (editingTarget?.type === "stackItem") {
      const stack = bookmarks[editingTarget.stackIndex]
      if (stack?.items?.[editingTarget.itemIndex]) {
        stack.items[editingTarget.itemIndex] = newBookmark
      }
    } else if (editingIndex !== null) {
      bookmarks[editingIndex] = newBookmark
    } else {
      bookmarks.push(newBookmark)
    }
    setBookmarks(bookmarks)
    invalidateBookmarkIconCache(url)
    saveBookmarks()
    renderBookmarks()
    closeModal()
    showBookmarkUndo(
      wasEditing
        ? i18n.bookmark_updated || "Bookmark updated"
        : i18n.bookmark_added || "Bookmark added",
      snapshot,
    )
  } else {
    showAlert(i18n.alert_missing_fields)
  }
}

function loadBrowserBookmarks() {
  if (!chrome || !chrome.bookmarks) return
  chrome.bookmarks.getTree((tree) => {
    browserBookmarksList.innerHTML = ""
    const fragment = document.createDocumentFragment()
    renderBookmarkTree(tree[0], fragment)
    browserBookmarksList.appendChild(fragment)
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
      // By default, make them collapsed
      wrapper.className = "folder-wrapper collapsed"

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

      sortedChildren.forEach((child) =>
        renderBookmarkTree(child, childrenContainer),
      )
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
      ? `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(node.url)}&sz=32" style="width:14px;height:14px;border-radius:3px;flex-shrink:0;">`
      : '<i class="fa-solid fa-globe" style="font-size:0.8rem;opacity:0.5;flex-shrink:0;"></i>'
    const label = document.createElement("span")
    label.style.overflow = "hidden"
    label.style.textOverflow = "ellipsis"
    label.style.whiteSpace = "nowrap"
    label.innerHTML = `${iconHtml} ${node.title}`
    label.title = node.url

    const imgElement = label.querySelector("img")
    if (imgElement) {
      imgElement.addEventListener("error", function () {
        this.style.display = "none"
      })
    }

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
    const snapshot = captureBookmarkSnapshot()
    bookmarks.push(...newItems)
    setBookmarks(bookmarks)
    saveBookmarks()
    renderBookmarks()
    showAlert(i18n.alert_imported.replace("{count}", newItems.length))
    closeModal()
    showBookmarkUndo(
      (i18n.bookmark_imported || "Imported {count} bookmarks").replace(
        "{count}",
        newItems.length,
      ),
      snapshot,
    )
  } else {
    showAlert(i18n.alert_no_selection)
  }
}

export function initModal() {
  const i18n = geti18n()

  // Allow pressing Enter to save bookmark details
  const handleEnterSave = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveBookmark()
    }
  }
  bookmarkTitleInput.addEventListener("keydown", handleEnterSave)
  bookmarkUrlInput.addEventListener("keydown", handleEnterSave)
  bookmarkIconInput.addEventListener("keydown", handleEnterSave)

  // Expand/Collapse Folders Toggle in Import Browser
  const toggleFoldersBtn = document.getElementById("import-toggle-folders-btn")
  if (toggleFoldersBtn) {
    let isAllExpanded = false
    toggleFoldersBtn.addEventListener("click", () => {
      isAllExpanded = !isAllExpanded
      const folders = browserBookmarksList.querySelectorAll(".folder-wrapper")
      folders.forEach((f) => {
        if (isAllExpanded) {
          f.classList.remove("collapsed")
        } else {
          f.classList.add("collapsed")
        }
      })
    })
  }

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
    if (editingIndex !== null || editingTarget !== null) {
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
