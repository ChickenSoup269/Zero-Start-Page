import {
  contextMenu,
  menuFavorite,
  menuSelect,
  menuEdit,
  menuDelete,
  menuLock,
} from "../utils/dom.js"
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
import { renderBookmarks, toggleSelectionMode } from "./bookmarks.js"

let contextMenuTargetIndex = -1
let contextMenuTargetType = "bookmark" // 'bookmark', 'group', 'widget', 'localBg', etc.
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

  // Dọn dẹp các mục custom cũ nếu có
  contextMenu.querySelectorAll(".custom-music-item").forEach(el => el.remove())

  // Reset display
  menuEdit.style.display = "flex"
  menuDelete.style.display = "flex"
  menuSelect.style.display = "none"
  menuLock.style.display = "none"
  menuFavorite.style.display = "none"

  const i18n = geti18n()

  if (type === "bookmark") {
    menuSelect.style.display = "flex"
  }

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

    // THÊM TÙY CHỌN RIÊNG CHO MUSIC PLAYER
    if (id === "music") {
      const musicStyle = settings.music_bar_style || settings.musicBarStyle

      // Nút tắt bồng bềnh (Animation lên xuống) - Áp dụng cho TẤT CẢ các style
      const isNoShaking = settings.musicPlayerNoShaking
      const shakeBtn = document.createElement("div")
      shakeBtn.className = "context-menu-item custom-music-item"
      shakeBtn.innerHTML = `<i class="${isNoShaking ? "fa-solid fa-wand-magic-sparkles" : "fa-solid fa-anchor"}"></i> <span>${isNoShaking ? (i18n.music_player_shaking_on || "Bật bồng bềnh") : (i18n.music_player_no_shaking || "Tắt bồng bềnh")}</span>`
      shakeBtn.onclick = () => {
        const newVal = !isNoShaking
        updateSetting("musicPlayerNoShaking", newVal)
        saveSettings()
        window.dispatchEvent(
          new CustomEvent("settingsUpdated", {
            detail: { key: "musicPlayerNoShaking", value: newVal },
          }),
        )
        hideContextMenu()
      }
      contextMenu.insertBefore(shakeBtn, menuLock)

      if (musicStyle === "heartbeat") {
        // Nút đổi Skin GameBoy
        const isGameBoy = settings.musicPlayerSkin === "gameboy"
        const skinBtn = document.createElement("div")
        skinBtn.className = "context-menu-item custom-music-item"
        skinBtn.innerHTML = `<i class="${isGameBoy ? "fa-solid fa-mobile-screen-button" : "fa-solid fa-gamepad"}"></i> <span>${isGameBoy ? (i18n.music_player_skin_modern || "Giao diện Hiện đại") : (i18n.music_player_skin_gameboy || "Giao diện GameBoy")}</span>`
        skinBtn.onclick = () => {
          const newSkin = isGameBoy ? "default" : "gameboy"
          updateSetting("musicPlayerSkin", newSkin)
          saveSettings()
          window.dispatchEvent(
            new CustomEvent("settingsUpdated", {
              detail: { key: "musicPlayerSkin", value: newSkin },
            }),
          )
          hideContextMenu()
        }
        contextMenu.insertBefore(skinBtn, shakeBtn)

        // Nút đổi Skin Trắng Blur
        const isWhiteBlur = settings.musicPlayerSkin === "white-blur"
        const whiteSkinBtn = document.createElement("div")
        whiteSkinBtn.className = "context-menu-item custom-music-item"
        whiteSkinBtn.innerHTML = `<i class="fa-solid fa-circle-half-stroke"></i> <span>${isWhiteBlur ? (i18n.music_player_skin_default || "Giao diện Mặc định") : (i18n.music_player_skin_white_blur || "Nền Trắng Blur")}</span>`
        whiteSkinBtn.onclick = () => {
          const newSkin = isWhiteBlur ? "default" : "white-blur"
          updateSetting("musicPlayerSkin", newSkin)
          saveSettings()
          window.dispatchEvent(
            new CustomEvent("settingsUpdated", {
              detail: { key: "musicPlayerSkin", value: newSkin },
            }),
          )
          hideContextMenu()
        }
        contextMenu.insertBefore(whiteSkinBtn, shakeBtn)

        // Đường kẻ chia
        const separator = document.createElement("div")
        separator.className = "context-menu-separator custom-music-item"
        separator.style.height = "1px"
        separator.style.background = "rgba(255,255,255,0.1)"
        separator.style.margin = "4px 0"
        contextMenu.insertBefore(separator, skinBtn)
      } else {
        // Tùy chọn skin Trắng Blur cho tất cả các style khác
        const isWhiteBlur = settings.musicPlayerSkin === "white-blur"
        const skinBtn = document.createElement("div")
        skinBtn.className = "context-menu-item custom-music-item"
        skinBtn.innerHTML = `<i class="fa-solid fa-circle-half-stroke"></i> <span>${isWhiteBlur ? (i18n.music_player_skin_default || "Giao diện Mặc định") : (i18n.music_player_skin_white_blur || "Nền Trắng Blur")}</span>`
        skinBtn.onclick = () => {
          const newSkin = isWhiteBlur ? "default" : "white-blur"
          updateSetting("musicPlayerSkin", newSkin)
          saveSettings()
          window.dispatchEvent(
            new CustomEvent("settingsUpdated", {
              detail: { key: "musicPlayerSkin", value: newSkin },
            }),
          )
          hideContextMenu()
        }
        contextMenu.insertBefore(skinBtn, shakeBtn)

        // Đường kẻ chia
        const separator = document.createElement("div")
        separator.className = "context-menu-separator custom-music-item"
        separator.style.height = "1px"
        separator.style.background = "rgba(255,255,255,0.1)"
        separator.style.margin = "4px 0"
        contextMenu.insertBefore(separator, skinBtn)
      }
    }  } else if (["localBg", "userColor", "userAccentColor", "userGradient", "userMultiColor", "userSvgWave", "userFont"].includes(type)) {
    menuEdit.style.display = "none"
    menuFavorite.style.display = "flex"
    
    // Check if currently favorited
    let isFavorite = false;
    let key = "";
    const settings = getSettings();
    switch (type) {
      case "localBg": key = "userBackgrounds"; break;
      case "userColor": key = "userColors"; break;
      case "userAccentColor": key = "userAccentColors"; break;
      case "userGradient": key = "userGradients"; break;
      case "userMultiColor": key = "userMultiColors"; break;
      case "userSvgWave": key = "userSvgWaves"; break;
      case "userFont": key = "userSavedFonts"; break;
    }
    
    if (key && settings[key] && index > -1 && settings[key][index]) {
        const item = settings[key][index];
        isFavorite = typeof item === 'object' ? !!item.isFavorite : false;
    }
    
    const favoriteText = menuFavorite.querySelector("span")
    if (favoriteText) {
      favoriteText.textContent = isFavorite 
        ? (i18n.menu_unfavorite || "Unfavorite") 
        : (i18n.menu_favorite || "Favorite")
    }

    menuDelete.style.display = "flex"
    menuLock.style.display = "none"
  } else if (type === "predefinedFont") {
    menuEdit.style.display = "none"
    menuFavorite.style.display = "flex"
    menuDelete.style.display = "none"
    menuLock.style.display = "none"
    
    const settings = getSettings();
    const label = id; // id contains font label
    const savedFonts = settings.userSavedFonts || []
    const found = savedFonts.find(f => (typeof f === 'string' ? f : f.label) === label);
    const isFavorite = found && typeof found === 'object' ? !!found.isFavorite : false;
    
    const favoriteText = menuFavorite.querySelector("span")
    if (favoriteText) {
      favoriteText.textContent = isFavorite 
        ? (i18n.menu_unfavorite || "Unfavorite") 
        : (i18n.menu_favorite || "Favorite")
    }
  } else if (type === "effect") {
    menuEdit.style.display = "none"
    menuFavorite.style.display = "flex"
    menuDelete.style.display = "none"
    menuLock.style.display = "none"
    
    const settings = getSettings();
    const effectId = id; // id contains effect data-value
    const favoriteEffects = settings.favoriteEffects || []
    const isFavorite = favoriteEffects.includes(effectId);
    
    const favoriteText = menuFavorite.querySelector("span")
    if (favoriteText) {
      favoriteText.textContent = isFavorite 
        ? (i18n.menu_unfavorite || "Unfavorite") 
        : (i18n.menu_favorite || "Favorite")
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

async function handleFavorite() {
  const type = contextMenuTargetType
  const index = contextMenuTargetIndex
  const settings = getSettings()
  let key = ""
  let renderFn = null

  switch (type) {
    case "localBg":
      key = "userBackgrounds"
      const { renderLocalBackgrounds } = await import("./settings/backgroundManager.js")
      renderFn = renderLocalBackgrounds
      break
    case "userColor":
      key = "userColors"
      const { renderUserColors } = await import("./settings/backgroundManager.js")
      renderFn = renderUserColors
      break
    case "userAccentColor":
      key = "userAccentColors"
      const { renderUserAccentColors } = await import("./settings/backgroundManager.js")
      renderFn = renderUserAccentColors
      break
    case "userGradient":
      key = "userGradients"
      const { renderUserGradients } = await import("./settings/gradientManager.js")
      renderFn = renderUserGradients
      break
    case "userMultiColor":
      key = "userGradients"
      const { renderSavedMultiColors } = await import("./settings/multiColorManager.js")
      renderFn = renderSavedMultiColors
      break
    case "userSvgWave":
      key = "userSvgWaves"
      const { renderUserSvgWaves } = await import("./settings/svgWaveManager.js")
      renderFn = renderUserSvgWaves
      break
    case "userFont":
      key = "userSavedFonts"
      const { renderFontGrid } = await import("./settings/fontManager.js")
      renderFn = (DOM) => {
          renderFontGrid(DOM.fontGrid, (k,v) => { updateSetting(k,v); saveSettings(); })
      }
      break
    case "predefinedFont":
        const label = contextMenuTargetId; // font label
        const savedFonts = settings.userSavedFonts || [];
        const foundIndex = savedFonts.findIndex(f => (typeof f === 'string' ? f : f.label) === label);
        
        if (foundIndex === -1) {
            // Add as favorite
            savedFonts.push({ label: label, isFavorite: true });
        } else {
            // Toggle favorite
            if (typeof savedFonts[foundIndex] === 'string') {
                savedFonts[foundIndex] = { label: savedFonts[foundIndex], isFavorite: true };
            } else {
                savedFonts[foundIndex].isFavorite = !savedFonts[foundIndex].isFavorite;
            }
        }
        updateSetting("userSavedFonts", savedFonts);
        saveSettings();
        const { renderFontGrid: rg } = await import("./settings/fontManager.js")
        const fGrid = document.getElementById("font-grid");
        if (fGrid) rg(fGrid, (k,v) => { updateSetting(k,v); saveSettings(); });
        hideContextMenu();
        return; // Already handled
    case "effect":
        const effectId = contextMenuTargetId; // id contains effect data-value
        let favoriteEffects = settings.favoriteEffects || []
        const favIndex = favoriteEffects.indexOf(effectId);
        if (favIndex > -1) {
            favoriteEffects.splice(favIndex, 1);
        } else {
            favoriteEffects.push(effectId);
        }
        updateSetting("favoriteEffects", favoriteEffects);
        saveSettings();
        
        // Dispatch custom event to notify UI to update favorite icons if any
        window.dispatchEvent(new CustomEvent('effectFavoriteChanged', { detail: { effectId } }));
        hideContextMenu();
        return; // Already handled
  }

  if (key && settings[key] && index > -1 && settings[key][index]) {
    const currentBg = settings.background
    let item = settings[key].splice(index, 1)[0]
    
    // Normalize to object if it's a string
    if (typeof item === 'string') {
        const val = item;
        item = { id: val, isFavorite: false };
        if (key === "userSavedFonts") item.label = val;
        else if (key !== "userBackgrounds") item.val = val;
    }

    // Toggle favorite
    item.isFavorite = !item.isFavorite;

    // Move to top if favorited, otherwise to bottom
    if (item.isFavorite) {
        settings[key].unshift(item)
    } else {
        settings[key].push(item)
    }
    
    // Safety: ensure background setting is NOT corrupted by object
    if (key === "userBackgrounds" && typeof settings.background === "object" && settings.background !== null) {
        settings.background = settings.background.id || currentBg
    }
    
    saveSettings()
    
    // Ensure the page background and settings UI are in sync
    if (typeof window.appApplySettings === "function") {
        window.appApplySettings()
    }
    
    const DOM_UTIL = await import("../utils/dom.js")
    if (renderFn) {
        // For backgrounds, we pass the real handleSettingUpdate to ensure UI stays in sync
        if (type === "localBg") {
            renderFn(DOM_UTIL, window.appHandleSettingUpdate || (() => {}))
        } else if (type === "userMultiColor") {
            renderFn(DOM_UTIL)
        } else {
            renderFn(DOM_UTIL)
        }
    }
  }

  hideContextMenu()
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
  } else if (["localBg", "userColor", "userAccentColor", "userGradient", "userMultiColor", "userSvgWave"].includes(contextMenuTargetType)) {
      if (await showConfirm(i18n.alert_delete_bg_confirm || "Are you sure you want to delete this?")) {
          const settings = getSettings()
          let key = ""
          let renderFn = null
          const type = contextMenuTargetType
          const index = contextMenuTargetIndex

          switch (type) {
            case "localBg":
              key = "userBackgrounds"
              const { renderLocalBackgrounds } = await import("./settings/backgroundManager.js")
              renderFn = renderLocalBackgrounds
              break
            case "userColor":
              key = "userColors"
              const { renderUserColors } = await import("./settings/backgroundManager.js")
              renderFn = renderUserColors
              break
            case "userAccentColor":
              key = "userAccentColors"
              const { renderUserAccentColors } = await import("./settings/backgroundManager.js")
              renderFn = renderUserAccentColors
              break
            case "userGradient":
              key = "userGradients"
              const { renderUserGradients } = await import("./settings/gradientManager.js")
              renderFn = renderUserGradients
              break
            case "userMultiColor":
              key = "userSavedMultiColors"
              const { renderSavedMultiColors } = await import("./settings/multiColorManager.js")
              renderFn = renderSavedMultiColors
              break
            case "userSvgWave":
              key = "userSvgWaves"
              const { renderUserSvgWaves } = await import("./settings/svgWaveManager.js")
              renderFn = renderUserSvgWaves
              break
            case "userFont":
                key = "userSavedFonts"
                const { renderFontGrid } = await import("./settings/fontManager.js")
                renderFn = (DOM) => {
                    const handleSettingUpdate = (key, val) => {
                        updateSetting(key, val)
                        saveSettings()
                    }
                    renderFontGrid(DOM.fontGrid, handleSettingUpdate)
                    renderFontGrid(DOM.clockFontGrid, handleSettingUpdate, true)
                }
                break
          }

          if (key && settings[key] && index > -1) {
              const item = settings[key][index]
              const itemId = typeof item === "object" ? item.id || item.val || item.label : item
              
              settings[key].splice(index, 1)
              
              // If deleted item is the current background, reset it
              if (key === "userBackgrounds" && settings.background === itemId) {
                  if (window.appHandleSettingUpdate) {
                      window.appHandleSettingUpdate("background", null)
                  } else {
                      updateSetting("background", null)
                      saveSettings()
                  }
              } else {
                  saveSettings()
              }

              if (typeof window.appApplySettings === "function") {
                  window.appApplySettings()
              }

              const DOM = await import("../utils/dom.js")
              if (renderFn) {
                  if (type === "localBg") {
                      renderFn(DOM, window.appHandleSettingUpdate || (() => {}))
                  } else {
                      renderFn(DOM)
                  }
              }
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

    // Optionally update UI for visual feedback
    const widgetIdMap = {
      clock: "clock-date-wrap",
      customTitle: "custom-title-display",
      calendar: "full-calendar-container",
      todo: "todo-container",
      timer: "timer-component",
      music: "music-player-container",
      notepad: "notepad-container",
      "daily-quotes": "daily-quotes",
    }

    const widgetId = widgetIdMap[contextMenuTargetId] || contextMenuTargetId
    const widget = document.getElementById(widgetId)
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
  menuSelect.addEventListener("click", (e) => {
    e.stopPropagation()
    if (contextMenuTargetType === "bookmark") {
      toggleSelectionMode(contextMenuTargetIndex)
    }
    hideContextMenu()
  })

  menuEdit.addEventListener("click", (e) => {
    e.stopPropagation()
    handleEdit()
  })

  menuDelete.addEventListener("click", (e) => {
    e.stopPropagation()
    handleDelete()
  })

  menuFavorite.addEventListener("click", (e) => {
    e.stopPropagation()
    handleFavorite()
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
