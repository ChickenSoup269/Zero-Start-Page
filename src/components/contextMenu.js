import { contextMenu, menuEdit, menuDelete } from "../utils/dom.js"
import { showAlert, showConfirm, showPrompt } from "../utils/dialog.js"
import {
  getBookmarks,
  setBookmarks,
  saveBookmarks,
  getBookmarkGroups,
  setBookmarkGroups,
  getActiveGroupId,
  setActiveGroupId,
} from "../services/state.js"
import { geti18n } from "../services/i18n.js"
import { openModal } from "./modal.js"
import { renderBookmarks } from "./bookmarks.js"

let contextMenuTargetIndex = -1
let contextMenuTargetType = "bookmark" // 'bookmark' or 'group'
let contextMenuTargetId = null // For groups
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

  contextMenu.style.display = "block"
  contextMenu.style.left = `${x}px`
  contextMenu.style.top = `${y}px`

  // Update text if needed (optional)
  const i18n = geti18n()
  const editText = contextMenu.querySelector("#menu-edit span")
  if (editText) {
    if (type === "group") {
      editText.textContent = i18n.menu_rename || "Rename"
    } else if (type === "todo") {
      editText.textContent = i18n.menu_rename || "Rename" // Todo uses "Rename" too
    } else {
      editText.textContent = i18n.menu_edit || "Edit"
    }
  }
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
