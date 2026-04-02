import { contextMenu, menuEdit, menuDelete, menuLock } from "../utils/dom.js"
import { showAlert, showConfirm, showPrompt } from "../utils/dialog.js"
import {
  getBookmarks,
  setBookmarks,
  saveBookmarks,
  getBookmarkGroups,
  setBookmarkGroups,
  getActiveGroupId,
  setActiveGroupId,
  getSettings,
  updateSetting,
  saveSettings,
} from "../services/state.js"
import { geti18n } from "../services/i18n.js"
import { openModal } from "./modal.js"
import { renderBookmarks } from "./bookmarks.js"

let contextMenuTargetIndex = -1
let contextMenuTargetType = "bookmark" // 'bookmark', 'group', or 'widget'
let contextMenuTargetId = null // For groups or widget ids
let contextMenuCallbacks = null

export function showContextMenu(
  x,
  y,
  index,
  type = "bookmark",
  id = null,
  callbacks = null,
) {
  contextMenuTargetIndex = index
  contextMenuTargetType = type
  contextMenuTargetId = id
  contextMenuCallbacks = callbacks

  // Reset display
  menuEdit.style.display = "flex"
  menuDelete.style.display = "flex"
  menuLock.style.display = "none"

  const i18n = geti18n()

  if (type === "widget") {
    menuEdit.style.display = "none"
    menuDelete.style.display = "none"
    menuLock.style.display = "flex"

    const settings = getSettings()
    const isLocked = settings.lockedWidgets && settings.lockedWidgets[id]
    const lockText = menuLock.querySelector("span")
    const lockIcon = menuLock.querySelector("i")

    if (isLocked) {
      lockIcon.className = "fa-solid fa-unlock"
      lockText.textContent = i18n.menu_unlock || "Unlock Position"
    } else {
      lockIcon.className = "fa-solid fa-lock"
      lockText.textContent = i18n.menu_lock || "Lock Position"
    }
  } else {
    // Regular bookmarks/groups
    const editText = menuEdit.querySelector("span")
    if (editText) {
      if (type === "group" || type === "todo") {
        editText.textContent = i18n.menu_rename || "Rename"
      } else {
        editText.textContent = i18n.menu_edit || "Edit"
      }
    }
  }

  contextMenu.style.display = "block"

  const margin = 8
  const menuWidth = contextMenu.offsetWidth || 180
  const menuHeight = contextMenu.offsetHeight || 100
  const maxX = Math.max(margin, window.innerWidth - menuWidth - margin)
  const maxY = Math.max(margin, window.innerHeight - menuHeight - margin)
  const safeX = Math.min(Math.max(x, margin), maxX)
  const safeY = Math.min(Math.max(y, margin), maxY)

  contextMenu.style.left = `${safeX}px`
  contextMenu.style.top = `${safeY}px`
}

export function hideContextMenu() {
  contextMenu.style.display = "none"
  contextMenuTargetIndex = -1
  contextMenuTargetType = "bookmark"
  contextMenuTargetId = null
  contextMenuCallbacks = null
}

async function handleEdit() {
  const i18n = geti18n()

  if (contextMenuCallbacks && contextMenuCallbacks.onEdit) {
    contextMenuCallbacks.onEdit()
    hideContextMenu()
    return
  }

  if (contextMenuTargetType === "bookmark") {
    if (contextMenuTargetIndex > -1) {
      openModal(contextMenuTargetIndex)
    }
  } else if (contextMenuTargetType === "group") {
    const groups = getBookmarkGroups()
    const group = groups.find((g) => g.id === contextMenuTargetId)
    if (group) {
      const newName = await showPrompt(
        i18n.prompt_rename_group || "Enter new group name:",
        group.name,
      )
      if (newName && newName.trim() !== "") {
        group.name = newName.trim()
        saveBookmarks()
        renderBookmarks()
      }
    }
  }

  hideContextMenu()
}

async function handleDelete() {
  const i18n = geti18n()

  if (contextMenuCallbacks && contextMenuCallbacks.onDelete) {
    contextMenuCallbacks.onDelete()
    hideContextMenu()
    return
  }

  if (contextMenuTargetType === "bookmark") {
    const bookmarks = getBookmarks()
    if (
      contextMenuTargetIndex > -1 &&
      (await showConfirm(
        `${i18n.alert_delete_confirm} "${bookmarks[contextMenuTargetIndex].title}"?`,
      ))
    ) {
      bookmarks.splice(contextMenuTargetIndex, 1)
      setBookmarks(bookmarks)
      saveBookmarks()
      renderBookmarks()
    }
  } else if (contextMenuTargetType === "group") {
    const groups = getBookmarkGroups()
    const group = groups.find((g) => g.id === contextMenuTargetId)
    if (group) {
      if (
        await showConfirm(
          `${i18n.alert_delete_group_confirm || "Delete group"} "${group.name}"?`,
        )
      ) {
        // Prevent deleting if it's the only group? (Optional, but UI might break if no groups)
        if (groups.length <= 1) {
          showAlert(
            i18n.alert_cannot_delete_last_group ||
              "Cannot delete the last group.",
          )
          hideContextMenu()
          return
        }

        const newGroups = groups.filter((g) => g.id !== group.id)
        setBookmarkGroups(newGroups)

        // If we deleted the active group, switch to the first one available
        const activeId = getActiveGroupId()
        if (group.id === activeId) {
          setActiveGroupId(newGroups[0].id)
        } else {
          saveBookmarks()
        }
        renderBookmarks()
      }
    }
  }

  hideContextMenu()
}

function handleLock() {
  if (contextMenuTargetType === "widget" && contextMenuTargetId) {
    const settings = getSettings()
    const lockedWidgets = settings.lockedWidgets || {}
    const isLocked = lockedWidgets[contextMenuTargetId]

    lockedWidgets[contextMenuTargetId] = !isLocked

    updateSetting("lockedWidgets", lockedWidgets)
    saveSettings()

    // Optionally update UI for visual feedback (e.g., adding a lock icon or class to the widget)
    const widget = document.getElementById(contextMenuTargetId)
    if (widget) {
      if (!isLocked) {
        widget.classList.add("is-locked")
      } else {
        widget.classList.remove("is-locked")
      }
    }
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

  menuLock.addEventListener("click", (e) => {
    e.stopPropagation()
    handleLock()
  })

  window.addEventListener("click", (e) => {
    if (!contextMenu.contains(e.target)) {
      hideContextMenu()
    }
  })
}
