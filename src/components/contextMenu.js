import {
  contextMenu,
  menuFavorite,
  menuSelect,
  menuEdit,
  menuDelete,
  menuLock,
  menuMove,
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
import { openBookmarkEditPopover, openModal } from "./modal.js"
import {
  captureBookmarkSnapshot,
  renderBookmarks,
  showBookmarkUndo,
  toggleSelectionMode,
} from "./bookmarks.js"

let contextMenuTargetIndex = -1
let contextMenuTargetType = "bookmark" // 'bookmark', 'group', 'widget', 'localBg', etc.
let contextMenuTargetId = null // For groups or widget ids
let contextMenuCallbacks = null
let lastContextMenuX = 0
let lastContextMenuY = 0
let contextMenuTargetBookmark = null
let hoverDetailTimer = null
let currentHoveredMenuItem = null
let contextMenuDetailToastEl = null

function escapeHtml(str) {
  if (!str) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function getOrCreateDetailToast() {
  if (!contextMenuDetailToastEl) {
    contextMenuDetailToastEl = document.getElementById("context-menu-detail-toast")
    if (!contextMenuDetailToastEl) {
      contextMenuDetailToastEl = document.createElement("div")
      contextMenuDetailToastEl.id = "context-menu-detail-toast"
      contextMenuDetailToastEl.className = "context-menu-detail-toast"
      contextMenuDetailToastEl.style.display = "none"
      document.body.appendChild(contextMenuDetailToastEl)
    }
  }
  return contextMenuDetailToastEl
}

function syncToastTheme(toast) {
  if (!toast) return
  toast.className = "context-menu-detail-toast"

  if (document.body.classList.contains("context-menu-macos")) {
    toast.classList.add("theme-macos")
  } else if (document.body.classList.contains("context-menu-light")) {
    toast.classList.add("theme-light")
  } else if (
    document.body.classList.contains("context-menu-light-transparent") ||
    document.body.classList.contains("context-menu-none")
  ) {
    toast.classList.add("theme-light-transparent")
  } else if (document.body.classList.contains("context-menu-transparent")) {
    toast.classList.add("theme-transparent")
  } else if (document.body.classList.contains("context-menu-m3")) {
    toast.classList.add("theme-m3")
  } else {
    toast.classList.add("theme-dark")
  }

  if (contextMenu.classList.contains("context-menu-thumbnail-color-mode")) {
    toast.classList.add("context-menu-thumbnail-color-mode")
    const styles = contextMenu.style
    const accentColor = styles.getPropertyValue("--accent-color")
    const accentColorRgb = styles.getPropertyValue("--accent-color-rgb")
    const accentContrastColor = styles.getPropertyValue("--accent-contrast-color")
    const musicPlayerBg = styles.getPropertyValue("--music-player-bg")
    if (accentColor) toast.style.setProperty("--accent-color", accentColor)
    if (accentColorRgb) toast.style.setProperty("--accent-color-rgb", accentColorRgb)
    if (accentContrastColor) toast.style.setProperty("--accent-contrast-color", accentContrastColor)
    if (musicPlayerBg) toast.style.setProperty("--music-player-bg", musicPlayerBg)
  } else {
    toast.style.removeProperty("--accent-color")
    toast.style.removeProperty("--accent-color-rgb")
    toast.style.removeProperty("--accent-contrast-color")
    toast.style.removeProperty("--music-player-bg")
  }
}

function positionDetailToast(toast, item) {
  const itemRect = item.getBoundingClientRect()
  const menuRect = contextMenu.getBoundingClientRect()

  toast.style.display = "block"
  toast.style.visibility = "hidden"

  const toastRect = toast.getBoundingClientRect()
  const margin = 10

  // Default: place to the right of context menu
  let x = menuRect.right + 10
  // If overflows right window edge, flip to left of context menu
  if (x + toastRect.width > window.innerWidth - margin) {
    x = menuRect.left - toastRect.width - 10
  }
  // If also overflows left window edge, clamp inside viewport
  if (x < margin) {
    x = Math.max(margin, Math.min(window.innerWidth - toastRect.width - margin, menuRect.left))
  }

  // Vertical alignment with top of item
  let y = itemRect.top - 2
  if (y + toastRect.height > window.innerHeight - margin) {
    y = window.innerHeight - toastRect.height - margin
  }
  if (y < margin) {
    y = margin
  }

  toast.style.left = `${Math.round(x)}px`
  toast.style.top = `${Math.round(y)}px`
  toast.style.visibility = "visible"
}

function hasTruncatedText(element) {
  if (!element) return false
  if (element.scrollWidth > element.clientWidth + 1) return true
  const textChildren = element.querySelectorAll(
    "span, p, div, .context-cycle-label, .context-tag-current, .context-tag-next, .context-toggle-label, .context-radio-label"
  )
  for (const child of textChildren) {
    if (child.scrollWidth > child.clientWidth + 1) return true
  }
  return false
}

export function hideContextMenuDetailToast() {
  if (hoverDetailTimer) {
    clearTimeout(hoverDetailTimer)
    hoverDetailTimer = null
  }
  if (currentHoveredMenuItem) {
    if (currentHoveredMenuItem.dataset.nativeTitle) {
      currentHoveredMenuItem.setAttribute("title", currentHoveredMenuItem.dataset.nativeTitle)
      delete currentHoveredMenuItem.dataset.nativeTitle
    }
    currentHoveredMenuItem = null
  }
  if (contextMenuDetailToastEl) {
    contextMenuDetailToastEl.classList.remove("toast-visible")
    contextMenuDetailToastEl.style.display = "none"
  }
}

function showItemDetailToast(item) {
  if (!contextMenu || contextMenu.style.display === "none") return
  if (!item || item !== currentHoveredMenuItem) return

  const i18n = geti18n()
  const toast = getOrCreateDetailToast()

  const itemType = item.dataset.itemType || ""
  const isCycle = itemType === "cycle" || item.classList.contains("context-menu-cycle-item")
  const isToggle = itemType === "toggle" || item.classList.contains("context-menu-toggle-item")
  const isRadio = itemType === "radio" || item.classList.contains("context-menu-radio-item")
  const isHeader = item.classList.contains("context-menu-header")
  const isTruncated = hasTruncatedText(item)

  const isBookmarkTarget =
    (contextMenuTargetType === "bookmark" ||
      contextMenuTargetType === "bookmarkStack" ||
      contextMenuTargetType === "bookmarkStackItem") &&
    contextMenuTargetBookmark

  const iconEl = item.querySelector("i")
  const iconClass = iconEl ? iconEl.className : "fa-solid fa-circle-info"

  let label = ""
  if (isCycle) {
    label = item.dataset.label || item.querySelector(".context-cycle-label")?.textContent?.trim() || ""
  } else if (isToggle) {
    label = item.dataset.label || item.querySelector(".context-toggle-label")?.textContent?.trim() || ""
  } else if (isRadio) {
    label = item.dataset.label || item.querySelector(".context-radio-label")?.textContent?.trim() || ""
  } else {
    label = item.dataset.label || item.querySelector("span")?.textContent?.trim() || item.textContent?.trim() || ""
  }

  // Only show if the item has details to expand or is truncated or special
  const hasTooltipTitle = Boolean(item.dataset.tooltipTitle)
  if (!isCycle && !isToggle && !isRadio && !isBookmarkTarget && !isTruncated && !hasTooltipTitle && !isHeader) {
    return
  }

  let categoryText = i18n.context_toast_cat_action || "Thao tác"
  let bodyHtml = ""

  if (isCycle) {
    categoryText = i18n.context_toast_cat_cycle || "Tùy chọn vòng lặp"
    const current =
      item.dataset.current ||
      item.querySelector(".context-tag-current")?.textContent?.trim() ||
      ""
    const next =
      item.dataset.next ||
      item.querySelector(".context-tag-next")?.textContent?.trim() ||
      ""

    bodyHtml = `
      <div class="cmd-toast-cycle-container">
        <div class="cmd-toast-state-pill current">
          <span class="cmd-state-badge-label">${i18n.context_toast_current || "Hiện tại"}</span>
          <span class="cmd-state-badge-val"><i class="fa-solid fa-check"></i> ${escapeHtml(current)}</span>
        </div>
        <div class="cmd-toast-cycle-arrow"><i class="fa-solid fa-arrow-right"></i></div>
        <div class="cmd-toast-state-pill next">
          <span class="cmd-state-badge-label">${i18n.context_toast_next || "Kế tiếp"}</span>
          <span class="cmd-state-badge-val">${escapeHtml(next)}</span>
        </div>
      </div>
      <div class="cmd-toast-hint">
        <i class="fa-solid fa-lightbulb"></i>
        <span>${i18n.context_toast_click_cycle || "Nhấp để chuyển sang"}: <strong>${escapeHtml(next)}</strong></span>
      </div>
    `
  } else if (isToggle) {
    categoryText = i18n.context_toast_cat_toggle || "Công tắc Bật/Tắt"
    const isActive = item.dataset.isActive === "true" || item.classList.contains("is-active")
    const onText = item.dataset.activeText || i18n.status_on || "Bật"
    const offText = item.dataset.inactiveText || i18n.status_off || "Tắt"
    const statusText = isActive ? onText : offText
    const nextStatus = isActive ? offText : onText

    bodyHtml = `
      <div class="cmd-toast-toggle-container">
        <span class="cmd-toast-status-badge ${isActive ? "badge-on" : "badge-off"}">
          <i class="fa-solid ${isActive ? "fa-toggle-on" : "fa-toggle-off"}"></i>
          <span>${i18n.context_toast_status || "Trạng thái"}: ${escapeHtml(statusText)}</span>
        </span>
      </div>
      <div class="cmd-toast-hint">
        <i class="fa-solid fa-lightbulb"></i>
        <span>${isActive ? (i18n.context_toast_click_toggle_off || "Nhấp để Tắt") : (i18n.context_toast_click_toggle_on || "Nhấp để Bật")} (<i class="fa-solid fa-arrow-right"></i> ${escapeHtml(nextStatus)})</span>
      </div>
    `
  } else if (isRadio) {
    categoryText = i18n.context_toast_cat_radio || "Tùy chọn thiết lập"
    const isSelected = item.dataset.isSelected === "true" || item.classList.contains("is-selected")
    const selectedText = item.dataset.selectedTag || (i18n.context_toast_selected || "Đang dùng")

    bodyHtml = `
      <div class="cmd-toast-radio-container">
        <span class="cmd-toast-radio-badge ${isSelected ? "is-selected" : ""}">
          <i class="fa-solid ${isSelected ? "fa-circle-check" : "fa-circle"}"></i>
          <span>${isSelected ? escapeHtml(selectedText) : (i18n.context_toast_unselected || "Chưa chọn")}</span>
        </span>
      </div>
      ${!isSelected ? `
        <div class="cmd-toast-hint">
          <i class="fa-solid fa-lightbulb"></i>
          <span>${i18n.context_toast_click_select || "Nhấp để áp dụng tùy chọn này"}</span>
        </div>
      ` : ""}
    `
  } else if (isHeader) {
    categoryText = i18n.context_header || "Selected Item"
    bodyHtml = `
      <div class="cmd-toast-detail-desc">
        <span>${escapeHtml(label)}</span>
      </div>
    `
  } else if (isBookmarkTarget) {
    categoryText = i18n.context_toast_cat_bookmark || "Thông tin dấu trang"
    bodyHtml = `
      <div class="cmd-toast-bookmark-info">
        <div class="cmd-toast-bm-title"><i class="fa-regular fa-bookmark"></i> ${escapeHtml(contextMenuTargetBookmark.title || "Bookmark")}</div>
        ${contextMenuTargetBookmark.url ? `
          <div class="cmd-toast-bm-url" title="${escapeHtml(contextMenuTargetBookmark.url)}">
            <i class="fa-solid fa-link"></i> <span>${escapeHtml(contextMenuTargetBookmark.url)}</span>
          </div>
        ` : ""}
      </div>
    `
  } else if (item.dataset.tooltipTitle) {
    bodyHtml = `
      <div class="cmd-toast-detail-desc">
        <span>${escapeHtml(item.dataset.tooltipTitle)}</span>
      </div>
    `
  } else if (isTruncated) {
    bodyHtml = `
      <div class="cmd-toast-detail-desc">
        <span>${escapeHtml(label)}</span>
      </div>
    `
  }

  toast.innerHTML = `
    <div class="cmd-toast-header">
      <div class="cmd-toast-header-left">
        <div class="cmd-toast-icon-wrap">
          <i class="${iconClass}"></i>
        </div>
        <div class="cmd-toast-category">${escapeHtml(categoryText)}</div>
      </div>
    </div>
    <div class="cmd-toast-title">${escapeHtml(label)}</div>
    ${bodyHtml ? `<div class="cmd-toast-body">${bodyHtml}</div>` : ""}
  `

  syncToastTheme(toast)
  positionDetailToast(toast, item)

  requestAnimationFrame(() => {
    toast.classList.add("toast-visible")
  })
}

function handleContextMenuMouseOver(e) {
  const item = e.target.closest(".context-menu-item, .menu-item, .context-menu-header")
  if (!item || item === currentHoveredMenuItem) return

  if (hoverDetailTimer) {
    clearTimeout(hoverDetailTimer)
    hoverDetailTimer = null
  }

  if (currentHoveredMenuItem && currentHoveredMenuItem !== item) {
    if (currentHoveredMenuItem.dataset.nativeTitle) {
      currentHoveredMenuItem.setAttribute("title", currentHoveredMenuItem.dataset.nativeTitle)
      delete currentHoveredMenuItem.dataset.nativeTitle
    }
  }

  if (contextMenuDetailToastEl) {
    contextMenuDetailToastEl.classList.remove("toast-visible")
    contextMenuDetailToastEl.style.display = "none"
  }

  currentHoveredMenuItem = item

  // Temporarily suppress native browser tooltip so it doesn't pop up over our custom toast
  if (item.hasAttribute("title")) {
    item.dataset.nativeTitle = item.getAttribute("title")
    item.removeAttribute("title")
  }

  hoverDetailTimer = setTimeout(() => {
    showItemDetailToast(item)
  }, 450)
}

function handleContextMenuMouseOut(e) {
  const related = e.relatedTarget
  if (currentHoveredMenuItem && (!related || !currentHoveredMenuItem.contains(related))) {
    if (currentHoveredMenuItem.dataset.nativeTitle) {
      currentHoveredMenuItem.setAttribute("title", currentHoveredMenuItem.dataset.nativeTitle)
      delete currentHoveredMenuItem.dataset.nativeTitle
    }
    if (hoverDetailTimer) {
      clearTimeout(hoverDetailTimer)
      hoverDetailTimer = null
    }
    hideContextMenuDetailToast()
  }
}

function createCustomMenuItem(label, iconClass, handler, extraClass = "") {
  const item = document.createElement("div")
  item.className = `context-menu-item custom-music-item ${extraClass}`.trim()
  item.dataset.label = label
  item.innerHTML = `<i class="${iconClass}"></i> <span>${label}</span>`
  item.onclick = (event) => {
    event.stopPropagation()
    handler()
  }
  return item
}

function createCycleMenuItem({
  label,
  currentLabel,
  nextLabel,
  iconClass,
  handler,
  extraClass = "",
}) {
  const item = document.createElement("div")
  item.className =
    `context-menu-item custom-music-item context-menu-cycle-item ${extraClass}`.trim()
  item.dataset.itemType = "cycle"
  item.dataset.label = label
  item.dataset.current = currentLabel
  item.dataset.next = nextLabel
  item.dataset.tooltipTitle = `${label}: ${currentLabel} (-> ${nextLabel})`
  item.innerHTML = `
    <i class="${iconClass}"></i>
    <span class="context-cycle-label">${label}</span>
    <span class="context-cycle-tags">
      <span class="context-tag-current"><i class="fa-solid fa-check"></i> ${currentLabel}</span>
      <span class="context-tag-arrow"><i class="fa-solid fa-arrow-right"></i></span>
      <span class="context-tag-next">${nextLabel}</span>
    </span>
  `
  item.onclick = (event) => {
    event.stopPropagation()
    handler()
  }
  return item
}

function createToggleMenuItem({
  label,
  isActive,
  iconClass,
  handler,
  activeText = null,
  inactiveText = null,
  extraClass = "",
}) {
  const i18n = geti18n()
  const item = document.createElement("div")
  item.className =
    `context-menu-item custom-music-item context-menu-toggle-item ${isActive ? "is-active" : ""} ${extraClass}`.trim()
  const onText = activeText || i18n.status_on || "On"
  const offText = inactiveText || i18n.status_off || "Off"
  item.dataset.itemType = "toggle"
  item.dataset.label = label
  item.dataset.isActive = isActive ? "true" : "false"
  item.dataset.activeText = onText
  item.dataset.inactiveText = offText
  item.dataset.status = isActive ? onText : offText
  item.dataset.tooltipTitle = `${label}: ${isActive ? onText : offText}`
  item.innerHTML = `
    <i class="${iconClass}"></i>
    <span class="context-toggle-label">${label}</span>
    <span class="context-status-badge ${isActive ? "badge-on" : "badge-off"}">
      <i class="fa-solid ${isActive ? "fa-toggle-on" : "fa-toggle-off"}"></i>
      <span>${isActive ? onText : offText}</span>
    </span>
  `
  item.onclick = (event) => {
    event.stopPropagation()
    handler()
  }
  return item
}

function createRadioMenuItem({
  label,
  isSelected,
  iconClass,
  handler,
  extraClass = "",
  activeText = null,
}) {
  const i18n = geti18n()
  const item = document.createElement("div")
  item.className =
    `context-menu-item custom-music-item context-menu-radio-item ${isSelected ? "is-selected" : ""} ${extraClass}`.trim()
  const displayIcon = isSelected ? "fa-solid fa-check" : iconClass
  const selectedTag =
    activeText || i18n.status_in_use || i18n.context_toast_selected || "In use"
  item.dataset.itemType = "radio"
  item.dataset.label = label
  item.dataset.isSelected = isSelected ? "true" : "false"
  item.dataset.selectedTag = selectedTag
  item.innerHTML = `
    <i class="${displayIcon}"></i>
    <span class="context-radio-label">${label}</span>
    ${isSelected ? `<span class="context-radio-active-badge"><i class="fa-solid fa-check"></i> ${selectedTag}</span>` : ""}
  `
  item.onclick = (event) => {
    event.stopPropagation()
    handler()
  }
  return item
}

function createCustomMenuDivider() {
  const divider = document.createElement("div")
  divider.className = "context-menu-divider custom-music-item"
  return divider
}

function isMenuNodeVisible(node) {
  return node && node.style.display !== "none"
}

function isContextMenuDivider(node) {
  return (
    node?.classList?.contains("context-menu-divider") ||
    node?.classList?.contains("context-menu-separator")
  )
}

function getVisibleContextMenuChildren() {
  return Array.from(contextMenu.children).filter(isMenuNodeVisible)
}

function appendContextMenuDividerIfNeeded() {
  const visibleChildren = getVisibleContextMenuChildren()
  const lastVisible = visibleChildren[visibleChildren.length - 1]
  if (!lastVisible || isContextMenuDivider(lastVisible)) return
  contextMenu.appendChild(createCustomMenuDivider())
}

function cleanupContextMenuDividers() {
  let previousWasDivider = true
  getVisibleContextMenuChildren().forEach((child) => {
    if (!isContextMenuDivider(child)) {
      previousWasDivider = false
      return
    }

    if (previousWasDivider) {
      child.remove()
      return
    }
    previousWasDivider = true
  })

  const visibleChildren = getVisibleContextMenuChildren()
  const lastVisible = visibleChildren[visibleChildren.length - 1]
  if (lastVisible && isContextMenuDivider(lastVisible)) {
    lastVisible.remove()
  }
}

function normalizeContextMenuFooter() {
  const settingsItems = Array.from(
    contextMenu.querySelectorAll(".context-settings-item"),
  ).filter(isMenuNodeVisible)
  const deleteItems = Array.from(
    contextMenu.querySelectorAll("#menu-delete, .context-delete-item"),
  ).filter(isMenuNodeVisible)

  if (!settingsItems.length) return

  cleanupContextMenuDividers()
  appendContextMenuDividerIfNeeded()
  settingsItems.forEach((item) => contextMenu.appendChild(item))

  if (deleteItems.length) {
    appendContextMenuDividerIfNeeded()
    deleteItems.forEach((item) => contextMenu.appendChild(item))
  }

  cleanupContextMenuDividers()
}

async function applyContextSetting(key, value) {
  if (typeof window.ensureSettingsInitialized === "function") {
    await window.ensureSettingsInitialized("context-menu-action")
  }
  if (typeof window.appHandleSettingUpdate === "function") {
    window.appHandleSettingUpdate(key, value)
  } else {
    updateSetting(key, value)
    saveSettings()
    if (typeof window.appApplySettings === "function") {
      window.appApplySettings()
    }
  }

  window.dispatchEvent(
    new CustomEvent("settingsUpdated", {
      detail: { key, value },
    }),
  )
  window.dispatchEvent(
    new CustomEvent("layoutUpdated", {
      detail: { key, value },
    }),
  )
}

function syncBackgroundControlValue(key, value) {
  const controlMap = {
    bgBlur: ["bg-blur-input", "bg-blur-value", "px"],
    bgBrightness: ["bg-brightness-input", "bg-brightness-value", "%"],
    bgSize: ["bg-size-select", null, ""],
  }
  const [inputId, valueId, suffix] = controlMap[key] || []
  if (!inputId) return

  const input = document.getElementById(inputId)
  if (input) input.value = String(value)
  const valueEl = valueId ? document.getElementById(valueId) : null
  if (valueEl) valueEl.textContent = `${value}${suffix}`
}

async function openSettingsSection(sectionId, targetSelector = null) {
  if (typeof window.ensureSettingsInitialized === "function") {
    await window.ensureSettingsInitialized("context-menu-open-section")
  }
  const sidebar = document.getElementById("settings-sidebar")
  if (!sidebar) return

  sidebar.classList.add("open")

  const section =
    document.querySelector(`[data-section-id="${sectionId}"]`) ||
    document.querySelector(`[data-settings-tab="${sectionId}"]`) ||
    document.getElementById(sectionId)

  let targetElement = null
  if (targetSelector) {
    targetElement =
      (section ? section.querySelector(targetSelector) : null) ||
      document.querySelector(targetSelector)
  }

  const scrollTarget =
    targetElement ||
    (section ? section.querySelector(".section-toggle") : null) ||
    section

  if (!scrollTarget) return

  // Ensure correct tab & subtab are activated and scrolled smoothly
  try {
    const { scrollToSidebarElement } =
      await import("./settings/sidebarNavigation.js")
    if (typeof scrollToSidebarElement === "function") {
      scrollToSidebarElement(scrollTarget, true)
      return
    }
  } catch (err) {
    console.warn(
      "Could not switch settings tab via scrollToSidebarElement:",
      err,
    )
  }

  if (section) section.classList.remove("collapsed")
  if (targetElement) {
    const collGroup = targetElement.closest(".collapsible-group")
    if (collGroup) {
      collGroup.classList.remove("collapsed")
      collGroup.classList.add("expanded")
    }
  }

  setTimeout(() => {
    if (scrollTarget) {
      scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, 80)
}

function getWidgetSettingsTarget(id) {
  const targets = {
    search: {
      section: "layout",
      target: "#layout-group-search",
      labelKey: "settings_group_search",
      fallback: "Search Bar",
    },
    clock: {
      section: "date-clock",
      target: ".settings-section[data-section-id='date-clock']",
      labelKey: "settings_date_format",
      fallback: "Clock",
    },
    "custom-title": {
      section: "custom-title",
      target: "#custom-title-typography-group",
      labelKey: "settings_custom_title",
      fallback: "Custom Title",
    },
    customTitle: {
      section: "custom-title",
      target: "#custom-title-typography-group",
      labelKey: "settings_custom_title",
      fallback: "Custom Title",
    },
    todo: {
      section: "layout",
      target: "#show-todo-checkbox",
      labelKey: "settings_show_todo",
      fallback: "Todo",
    },
    timer: {
      section: "layout",
      target: "#show-timer-checkbox",
      labelKey: "settings_show_timer",
      fallback: "Timer",
    },
    notepad: {
      section: "layout",
      target: "#show-notepad-checkbox",
      labelKey: "settings_show_notepad",
      fallback: "Notepad",
    },
    calendar: {
      section: "layout",
      target: "#show-full-calendar-checkbox",
      labelKey: "settings_show_full_calendar",
      fallback: "Calendar",
    },
    "daily-quotes": {
      section: "layout",
      target: "#show-quotes-checkbox",
      labelKey: "settings_show_quotes",
      fallback: "Daily Quotes",
    },
    weather: {
      section: "layout",
      target: "#show-weather-checkbox",
      labelKey: "settings_show_weather",
      fallback: "Weather",
    },
    music: {
      section: "layout",
      target: "#show-music-checkbox",
      labelKey: "settings_show_music",
      fallback: "Music",
    },
    habitTracker: {
      section: "layout",
      target: "#show-habits-checkbox",
      labelKey: "settings_show_habits",
      fallback: "Habit Tracker",
    },
    rss: {
      section: "layout",
      target: "#layout-group-widgets",
      labelKey: "settings_group_widgets",
      fallback: "Widgets",
    },
    ambientSounds: {
      section: "layout",
      target: "#qa-show-ambient",
      labelKey: "qa_show_ambient",
      fallback: "Ambient Sounds",
    },
    aiAssistant: {
      section: "layout",
      target: "#qa-show-ai-assistant",
      labelKey: "qa_show_ai_assistant",
      fallback: "AI Assistant",
    },
  }
  return targets[id] || null
}

function addOpenWidgetSettingsItem(id, i18n, withDivider = true) {
  const target = getWidgetSettingsTarget(id)
  if (!target) return

  const widgetName = i18n[target.labelKey] || target.fallback
  const rawTemplate = i18n.context_open_widget_settings || "Cài đặt: {name}"
  const label = rawTemplate.includes("{name}")
    ? rawTemplate.replace("{name}", widgetName)
    : `${rawTemplate}: ${widgetName}`

  const settingsBtn = createCustomMenuItem(
    label,
    "fa-solid fa-gear",
    () => {
      hideContextMenu()
      openSettingsSection(target.section, target.target)
    },
    "context-settings-item",
  )
  contextMenu.appendChild(settingsBtn)
}

function addTimerAlarmDropdownToggle(i18n, settings, beforeNode = menuLock) {
  const isHidden = settings.hideTimerAlarmDropdown === true
  const toggleBtn = createToggleMenuItem({
    label: i18n.settings_timer_alarm_sound || "Alarm Sound Selector",
    isActive: !isHidden,
    iconClass: isHidden ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high",
    activeText: i18n.status_show || "Show",
    inactiveText: i18n.status_hide || "Hide",
    handler: () => {
      const nextValue = !isHidden
      const checkbox = document.getElementById(
        "hide-timer-alarm-dropdown-checkbox",
      )
      if (checkbox) checkbox.checked = nextValue
      applyContextSetting("hideTimerAlarmDropdown", nextValue)
      hideContextMenu()
    },
  })
  contextMenu.insertBefore(toggleBtn, beforeNode)
}

function addPomodoroStatsToggle(i18n, settings, beforeNode = menuLock) {
  const isHidden = settings.hidePomodoroStats === true
  const toggleBtn = createToggleMenuItem({
    label: i18n.context_timer_pomodoro || "Pomodoro Statistics",
    isActive: !isHidden,
    iconClass: "fa-solid fa-chart-pie",
    activeText: i18n.status_show || "Show",
    inactiveText: i18n.status_hide || "Hide",
    handler: () => {
      const nextValue = !isHidden
      applyContextSetting("hidePomodoroStats", nextValue)
      // trigger re-render of pomodoro stats via layoutUpdated
      window.dispatchEvent(
        new CustomEvent("layoutUpdated", {
          detail: { key: "hidePomodoroStats", value: nextValue },
        }),
      )
      // also force timer re-render
      const timerInstance = window.startpageApp?.timer
      if (timerInstance) timerInstance.updatePomodoroStats()
      hideContextMenu()
    },
  })
  contextMenu.insertBefore(toggleBtn, beforeNode)
}

function addOpenBookmarkSettingsItem(i18n) {
  const settingsBtn = createCustomMenuItem(
    i18n.context_open_bookmark_settings || "Bookmark settings",
    "fa-solid fa-sliders",
    () => {
      hideContextMenu()
      openSettingsSection("bookmark-custom", "#bookmark-font-size-input")
    },
    "context-settings-item",
  )
  contextMenu.insertBefore(settingsBtn, menuEdit)
}

function showQrCodeModal(url, faviconUrl = "") {
  const modal = document.getElementById("qr-modal")
  const img = document.getElementById("qr-code-img")
  const text = document.getElementById("qr-code-url")
  const closeBtn = document.getElementById("close-qr-modal-btn")
  const iconWrapper = document.getElementById("qr-code-icon-wrapper")
  const icon = document.getElementById("qr-code-icon")

  if (!modal || !img || !text) return

  const encodedUrl = encodeURIComponent(url)
  // Use ECC Level H to allow the center icon without breaking the QR code
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedUrl}&ecc=H`
  text.textContent = url

  // Verify faviconUrl is a valid image URL and not a FontAwesome icon class
  const isValidImageUrl =
    typeof faviconUrl === "string" &&
    (faviconUrl.startsWith("http://") ||
      faviconUrl.startsWith("https://") ||
      faviconUrl.startsWith("data:image/") ||
      faviconUrl.startsWith("blob:") ||
      faviconUrl.startsWith("chrome-extension://"))

  let resolvedFavicon = isValidImageUrl ? faviconUrl : ""
  if (!resolvedFavicon && url) {
    try {
      const hostname = new URL(url).hostname
      if (hostname) {
        resolvedFavicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
      }
    } catch {}
  }

  if (resolvedFavicon && iconWrapper && icon) {
    icon.src = resolvedFavicon
    icon.onerror = () => {
      if (iconWrapper) iconWrapper.style.display = "none"
    }
    iconWrapper.style.display = "flex"
  } else if (iconWrapper) {
    iconWrapper.style.display = "none"
  }

  modal.classList.add("show")
  modal.classList.add("open")

  const closeModal = () => {
    modal.classList.remove("show")
    modal.classList.remove("open")
    setTimeout(() => {
      img.src = ""
    }, 300)
    if (closeBtn) closeBtn.removeEventListener("click", closeModal)
    window.removeEventListener("keydown", onKeyDown)
    modal.onclick = null
  }

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      closeModal()
    }
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal)
  }

  window.addEventListener("keydown", onKeyDown)

  modal.onclick = (event) => {
    if (event.target === modal) {
      closeModal()
    }
  }
}

function addGenerateQrCodeItem(i18n, type, index, id) {
  let url = ""
  let faviconUrl = ""

  if (type === "bookmark" || type === "bookmarkStackItem") {
    if (contextMenuCallbacks && contextMenuCallbacks.anchor) {
      const anchor = contextMenuCallbacks.anchor
      if (anchor.tagName === "A" && anchor.href) {
        url = anchor.href
        const imgEl = anchor.querySelector("img")
        if (imgEl && imgEl.src) faviconUrl = imgEl.src
      } else if (anchor.dataset && anchor.dataset.url) {
        url = anchor.dataset.url
        const imgEl = anchor.querySelector("img")
        if (imgEl && imgEl.src) faviconUrl = imgEl.src
      } else {
        const img = anchor.querySelector("img")
        if (img && img.dataset && img.dataset.url) {
          url = img.dataset.url
          if (img.src) faviconUrl = img.src
        }
      }
    }
  }

  if (!url) {
    const bookmarks = getBookmarks()
    if (type === "bookmark" && typeof index === "number" && bookmarks[index]) {
      const bookmark = bookmarks[index]
      if (bookmark && bookmark.url) {
        url = bookmark.url
        if (bookmark.icon) faviconUrl = bookmark.icon
      }
    } else if (type === "bookmarkStackItem" && id && id.includes(":")) {
      const [stackIndex, itemIndex] = id.split(":").map(Number)
      const stack = bookmarks[stackIndex]
      if (stack && stack.items) {
        const item = stack.items[itemIndex]
        if (item && item.url) {
          url = item.url
          if (item.icon) faviconUrl = item.icon
        }
      }
    }
  }

  if (
    url &&
    url.trim() !== "" &&
    !url.startsWith("chrome://") &&
    !url.startsWith("edge://")
  ) {
    const qrBtn = createCustomMenuItem(
      i18n.context_generate_qr || "Tạo mã QR",
      "fa-solid fa-qrcode",
      () => {
        const popover = document.getElementById("qr-hover-popover")
        if (popover) popover.style.display = "none"
        hideContextMenu()
        showQrCodeModal(url, faviconUrl)
      },
      "context-settings-item qr-menu-item",
    )

    // Live QR hover popover preview
    qrBtn.addEventListener("mouseenter", () => {
      let popover = document.getElementById("qr-hover-popover")
      if (!popover) {
        popover = document.createElement("div")
        popover.id = "qr-hover-popover"
        popover.style.position = "fixed"
        popover.style.zIndex = "21000"
        popover.style.background = "white"
        popover.style.padding = "10px"
        popover.style.borderRadius = "12px"
        popover.style.boxShadow = "0 10px 40px rgba(0,0,0,0.4)"
        popover.style.pointerEvents = "none"
        popover.style.opacity = "0"
        popover.style.transition =
          "opacity 0.2s ease-in-out, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)"
        popover.style.transform = "scale(0.8) translateY(10px)"

        const qrContainer = document.createElement("div")
        qrContainer.style.position = "relative"
        qrContainer.style.width = "180px"
        qrContainer.style.height = "180px"

        const img = document.createElement("img")
        img.id = "qr-hover-img"
        img.style.width = "100%"
        img.style.height = "100%"
        img.style.display = "block"
        img.style.borderRadius = "6px"
        qrContainer.appendChild(img)

        const iconWrapper = document.createElement("div")
        iconWrapper.id = "qr-hover-icon-wrapper"
        iconWrapper.style.position = "absolute"
        iconWrapper.style.top = "50%"
        iconWrapper.style.left = "50%"
        iconWrapper.style.transform = "translate(-50%, -50%)"
        iconWrapper.style.background = "white"
        iconWrapper.style.padding = "4px"
        iconWrapper.style.borderRadius = "50%"
        iconWrapper.style.display = "none"
        iconWrapper.style.alignItems = "center"
        iconWrapper.style.justifyContent = "center"
        iconWrapper.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)"

        const icon = document.createElement("img")
        icon.id = "qr-hover-icon"
        icon.style.width = "32px"
        icon.style.height = "32px"
        icon.style.borderRadius = "50%"
        icon.style.objectFit = "cover"
        iconWrapper.appendChild(icon)

        qrContainer.appendChild(iconWrapper)
        popover.appendChild(qrContainer)
        document.body.appendChild(popover)
      }

      const img = popover.querySelector("#qr-hover-img")
      const icon = popover.querySelector("#qr-hover-icon")
      const iconWrapper = popover.querySelector("#qr-hover-icon-wrapper")
      const encodedUrl = encodeURIComponent(url)
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodedUrl}&ecc=H`

      // Verify favicon is valid URL
      const isValidImageUrl =
        typeof faviconUrl === "string" &&
        (faviconUrl.startsWith("http://") ||
          faviconUrl.startsWith("https://") ||
          faviconUrl.startsWith("data:image/") ||
          faviconUrl.startsWith("blob:") ||
          faviconUrl.startsWith("chrome-extension://"))

      let resolvedFavicon = isValidImageUrl ? faviconUrl : ""
      if (!resolvedFavicon && url) {
        try {
          const hostname = new URL(url).hostname
          if (hostname) {
            resolvedFavicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
          }
        } catch {}
      }

      if (resolvedFavicon && icon && iconWrapper) {
        icon.src = resolvedFavicon
        icon.onerror = () => {
          if (iconWrapper) iconWrapper.style.display = "none"
        }
        iconWrapper.style.display = "flex"
      } else if (iconWrapper) {
        iconWrapper.style.display = "none"
      }

      const rect = qrBtn.getBoundingClientRect()

      // Display on the right side of the context menu item
      let left = rect.right + 10
      let top = rect.top + rect.height / 2 - 100 // center vertically (assuming 200px height)

      // Adjust if off screen horizontally
      if (left + 200 > window.innerWidth) {
        // Show on the left side if not enough space on the right
        left = rect.left - 210
        popover.style.transformOrigin = "center right"
      } else {
        popover.style.transformOrigin = "center left"
      }

      // Adjust if off screen vertically
      if (top < 10) top = 10
      if (top + 200 > window.innerHeight) top = window.innerHeight - 210

      popover.style.left = `${left}px`
      popover.style.top = `${top}px`
      popover.style.display = "block"

      requestAnimationFrame(() => {
        popover.style.opacity = "1"
        popover.style.transform = "scale(1) translateY(0)"
      })
    })

    qrBtn.addEventListener("mouseleave", () => {
      const popover = document.getElementById("qr-hover-popover")
      if (popover) {
        popover.style.opacity = "0"
        popover.style.transform = "scale(0.8) translateY(10px)"
        setTimeout(() => {
          if (popover.style.opacity === "0") {
            popover.style.display = "none"
          }
        }, 200)
      }
    })

    contextMenu.insertBefore(qrBtn, menuEdit)
  }
}

function openExternalUrl(url) {
  if (window.chrome?.tabs?.create) {
    try {
      const res = window.chrome.tabs.create({ url })
      if (res && typeof res.catch === "function") {
        res.catch(() => {
          window.open(
            url.startsWith("chrome://") ? "https://www.google.com" : url,
            "_blank",
            "noopener,noreferrer",
          )
        })
      }
    } catch {
      window.open(
        url.startsWith("chrome://") ? "https://www.google.com" : url,
        "_blank",
        "noopener,noreferrer",
      )
    }
    return
  }
  window.open(
    url.startsWith("chrome://") ? "https://www.google.com" : url,
    "_blank",
    "noopener,noreferrer",
  )
}

function addBackgroundContextMenuItems(i18n) {
  const settings = getSettings()
  const currentFit = settings.bgSize || "cover"
  const fitOrder = [
    "cover",
    "contain",
    "stretch",
    "tile",
    "center",
    "span",
    "custom",
  ]
  const nextFit =
    fitOrder[(Math.max(0, fitOrder.indexOf(currentFit)) + 1) % fitOrder.length]
  const fitLabels = {
    cover: i18n.settings_bg_fit_cover || "Cover",
    contain: i18n.settings_bg_fit_contain || "Contain",
    stretch: i18n.settings_bg_fit_stretch || "Stretch",
    tile: i18n.settings_bg_fit_tile || "Tile",
    center: i18n.settings_bg_fit_center || "Center",
    span: i18n.settings_bg_fit_span || "Span",
    custom: i18n.settings_bg_fit_custom || "Custom size",
  }

  const blur = Number(settings.bgBlur ?? 0)
  const brightness = Number(settings.bgBrightness ?? 100)

  const items = [
    createCustomMenuItem(
      i18n.bg_context_open_settings || "Background settings",
      "fa-solid fa-sliders",
      () => {
        hideContextMenu()
        openSettingsSection("background")
      },
      "context-settings-item",
    ),
    createCustomMenuItem(
      i18n.effect_context_settings || "Effect settings",
      "fa-solid fa-wand-magic-sparkles",
      () => {
        hideContextMenu()
        openSettingsSection("special-effects", "#effect-grid")
      },
      "context-settings-item",
    ),
    createCustomMenuItem(
      i18n.bg_context_reset || "Reset background",
      "fa-solid fa-trash",
      () => {
        applyContextSetting("background", null)
        hideContextMenu()
      },
      "danger context-delete-item",
    ),
    createCustomMenuDivider(),
    createCycleMenuItem({
      label: i18n.bg_context_fit || "Khớp ảnh nền",
      currentLabel: fitLabels[currentFit] || currentFit,
      nextLabel: fitLabels[nextFit] || nextFit,
      iconClass: "fa-solid fa-up-right-and-down-left-from-center",
      handler: () => {
        syncBackgroundControlValue("bgSize", nextFit)
        applyContextSetting("bgSize", nextFit)
        hideContextMenu()
      },
    }),
    createCustomMenuItem(
      i18n.bg_context_blur_more || "More blur",
      "fa-solid fa-droplet",
      () => {
        const nextBlur = Math.min(40, blur + 2)
        syncBackgroundControlValue("bgBlur", nextBlur)
        applyContextSetting("bgBlur", nextBlur)
        hideContextMenu()
      },
    ),
    createCustomMenuItem(
      i18n.bg_context_blur_less || "Less blur",
      "fas fa-tint-slash",
      () => {
        const nextBlur = Math.max(0, blur - 2)
        syncBackgroundControlValue("bgBlur", nextBlur)
        applyContextSetting("bgBlur", nextBlur)
        hideContextMenu()
      },
    ),
    createCustomMenuItem(
      i18n.bg_context_brightness_more || "Brighter",
      "fa-solid fa-sun",
      () => {
        const nextBrightness = Math.min(200, brightness + 10)
        syncBackgroundControlValue("bgBrightness", nextBrightness)
        applyContextSetting("bgBrightness", nextBrightness)
        hideContextMenu()
      },
    ),
    createCustomMenuItem(
      i18n.bg_context_brightness_less || "Darker",
      "fa-regular fa-sun",
      () => {
        const nextBrightness = Math.max(10, brightness - 10)
        syncBackgroundControlValue("bgBrightness", nextBrightness)
        applyContextSetting("bgBrightness", nextBrightness)
        hideContextMenu()
      },
    ),
    createCustomMenuDivider(),
    createToggleMenuItem({
      label: i18n.bg_context_zen_mode || "Zen Mode",
      isActive: Boolean(settings.globalZenMode),
      iconClass: "fa-solid fa-peace",
      activeText: i18n.status_on || "Bật",
      inactiveText: i18n.status_off || "Tắt",
      handler: () => {
        const isZen = !settings.globalZenMode
        syncBackgroundControlValue("globalZenMode", isZen)
        applyContextSetting("globalZenMode", isZen)
        hideContextMenu()
      },
    }),
    createToggleMenuItem({
      label: i18n.bg_context_ghost_mode || "Ghost Mode",
      isActive: Boolean(settings.sideControlsGhostMode),
      iconClass: "fa-solid fa-ghost",
      activeText: i18n.status_on || "Bật",
      inactiveText: i18n.status_off || "Tắt",
      handler: () => {
        const isGhost = !settings.sideControlsGhostMode
        syncBackgroundControlValue("sideControlsGhostMode", isGhost)
        applyContextSetting("sideControlsGhostMode", isGhost)
        hideContextMenu()
      },
    }),
    createCustomMenuDivider(),
    createCustomMenuItem(
      i18n.bg_context_open_google || "Open regular Google",
      "fa-brands fa-google",
      () => {
        hideContextMenu()
        openExternalUrl("https://www.google.com/webhp")
      },
    ),
    createCustomMenuItem(
      i18n.bg_context_open_chrome_newtab || "Open Chrome New Tab (Google User)",
      "fa-brands fa-chrome",
      () => {
        hideContextMenu()
        openExternalUrl("chrome://new-tab-page")
      },
    ),
  ]

  items.forEach((item) => contextMenu.appendChild(item))
}

function addEffectContextMenuItems(effectId, i18n) {
  if (!effectId) return

  const settings = getSettings()
  const isActiveEffect = settings.effect === effectId
  const effectItem = document.querySelector(
    `.effect-item[data-value="${CSS.escape(effectId)}"]`,
  )
  const effectName =
    effectItem?.querySelector(".effect-name")?.textContent?.trim() || effectId

  const applyBtn = createToggleMenuItem({
    label: effectName,
    isActive: isActiveEffect,
    iconClass: isActiveEffect ? "fa-solid fa-wand-magic-sparkles" : "fa-regular fa-circle",
    activeText: i18n.status_in_use || i18n.status_on || "In use",
    inactiveText: i18n.status_not_used || i18n.status_off || "Not used",
    handler: () => {
      applyContextSetting("effect", isActiveEffect ? "none" : effectId)
      document
        .querySelectorAll(".effect-item")
        .forEach((item) =>
          item.classList.toggle(
            "active",
            !isActiveEffect && item.dataset.value === effectId,
          ),
        )
      hideContextMenu()
    },
  })

  const settingsBtn = createCustomMenuItem(
    i18n.effect_context_settings || "Effect settings",
    "fa-solid fa-sliders",
    () => {
      hideContextMenu()
      openSettingsSection("special-effects", "#effect-grid")
    },
    "context-settings-item",
  )

  contextMenu.insertBefore(applyBtn, menuFavorite)
  contextMenu.insertBefore(settingsBtn, menuFavorite)
  contextMenu.insertBefore(createCustomMenuDivider(), menuFavorite)
}

function getContextMenuTargetName(type, id, index, i18n) {
  switch (type) {
    case "bookmark": {
      const bookmarks = getBookmarks()
      const bookmark = bookmarks[index]
      return (
        bookmark?.title ||
        bookmark?.url ||
        i18n.context_header_bookmark ||
        "Bookmark"
      )
    }
    case "bookmarkStack": {
      const bookmarks = getBookmarks()
      const bookmark = bookmarks[index]
      return (
        bookmark?.title ||
        bookmark?.name ||
        i18n.context_header_bookmark_stack ||
        "Bookmark Stack"
      )
    }
    case "bookmarkStackItem": {
      if (id && id.includes(":")) {
        const [stackIndex, itemIndex] = id.split(":").map(Number)
        const bookmarks = getBookmarks()
        const stack = bookmarks[stackIndex]
        if (stack && stack.items) {
          const item = stack.items[itemIndex]
          if (item) {
            return (
              item.title ||
              item.url ||
              i18n.context_header_bookmark ||
              "Bookmark"
            )
          }
        }
      }
      return i18n.context_header_bookmark || "Bookmark"
    }
    case "group": {
      const groups = getBookmarkGroups()
      const group = groups.find((g) => g.id === id)
      return group?.name || i18n.context_header_bookmark_group || "Group"
    }
    case "widget":
    case "search": {
      const widgetId = id || type
      if (widgetId === "todo") return i18n.context_header_widget_todo || "Tasks"
      if (widgetId === "timer")
        return i18n.context_header_widget_timer || "Timer"
      if (widgetId === "clock")
        return i18n.context_header_widget_clock || "Clock"
      if (widgetId === "search")
        return i18n.context_header_widget_search || "Search Bar"
      if (widgetId === "weather")
        return i18n.context_header_widget_weather || "Weather"
      if (widgetId === "music")
        return i18n.context_header_widget_music || "Music Player"
      if (widgetId === "notepad")
        return i18n.context_header_widget_notepad || "Notepad"
      if (widgetId === "calendar")
        return i18n.context_header_widget_calendar || "Calendar"
      if (widgetId === "daily-quotes")
        return i18n.context_header_widget_quotes || "Daily Quotes"
      if (widgetId === "rss")
        return i18n.context_header_widget_rss || "RSS Reader"
      if (widgetId === "habitTracker")
        return i18n.context_header_widget_habitTracker || "Habit Tracker"
      if (widgetId === "ambientSounds")
        return i18n.quick_access_ambient_sounds || "Ambient Sounds"
      if (widgetId === "aiAssistant")
        return i18n.quick_access_ai_assistant || "AI Assistant"
      if (widgetId === "custom-title")
        return i18n.context_header_widget_custom_title || "Custom Title"
      return widgetId
    }
    case "todo": {
      const todoItems = JSON.parse(localStorage.getItem("todoItems")) || []
      const item = todoItems[index]
      return item?.text || i18n.context_header_widget_todo || "Tasks"
    }
    case "background":
      return i18n.context_header_background || "Background Settings"
    case "quick-access":
    case "quick-access-bar":
    case "quick-access-toggle":
      return i18n.context_header_quick_access || "Quick Access Settings"
    case "localBg":
      return i18n.context_header_saved_bg || "Saved Background"
    case "userColor":
      return i18n.context_header_saved_color || "Saved Color"
    case "userAccentColor":
      return i18n.context_header_saved_accent || "Saved Accent"
    case "userGradient":
      return i18n.context_header_saved_gradient || "Saved Gradient"
    case "userMultiColor":
      return i18n.context_header_saved_multicolor || "Saved Multi-color"
    case "userSvgWave":
      return i18n.context_header_saved_svg_wave || "Saved SVG Wave"
    case "userFont":
    case "predefinedFont":
      return i18n.context_header_saved_font || "Saved Font"
    case "effect":
      return i18n.context_header_effect || "Effect Settings"
    default:
      return type
  }
}

export function showContextMenu(
  x,
  y,
  index,
  type = "bookmark",
  id = null,
  callbacks = null,
) {
  if (type === "widget") {
    if (id === "customTitle") id = "custom-title"
    if (id === "searchBar") id = "search"
  }

  contextMenuTargetIndex = index
  contextMenuTargetType = type
  contextMenuTargetId = id
  contextMenuCallbacks = callbacks
  lastContextMenuX = x || 0
  lastContextMenuY = y || 0

  if (
    (type === "bookmark" || type === "bookmarkStackItem") &&
    typeof index === "number"
  ) {
    const bookmarks = getBookmarks()
    if (bookmarks && bookmarks[index]) {
      contextMenuTargetBookmark = {
        title: bookmarks[index].title || "",
        url: bookmarks[index].url || "",
      }
    } else {
      contextMenuTargetBookmark = null
    }
  } else {
    contextMenuTargetBookmark = null
  }

  // Sync CSS variables from music player if in thumbnail-color-mode
  const musicContainer = document.querySelector(
    ".music-player-container.thumbnail-color-mode",
  )
  if (musicContainer) {
    const styles = musicContainer.style
    const accentColor = styles.getPropertyValue("--accent-color")
    const accentColorRgb = styles.getPropertyValue("--accent-color-rgb")
    const accentContrastColor = styles.getPropertyValue(
      "--accent-contrast-color",
    )
    const musicPlayerBg = styles.getPropertyValue("--music-player-bg")

    if (accentColor)
      contextMenu.style.setProperty("--accent-color", accentColor.trim())
    if (accentColorRgb)
      contextMenu.style.setProperty("--accent-color-rgb", accentColorRgb.trim())
    if (accentContrastColor)
      contextMenu.style.setProperty(
        "--accent-contrast-color",
        accentContrastColor.trim(),
      )
    if (musicPlayerBg)
      contextMenu.style.setProperty("--music-player-bg", musicPlayerBg.trim())

    // Apply thumbnail-color-mode styles to context menu
    contextMenu.classList.add("context-menu-thumbnail-color-mode")
  } else {
    // Remove if no music player in thumbnail-color-mode
    contextMenu.classList.remove("context-menu-thumbnail-color-mode")
    contextMenu.style.removeProperty("--accent-color")
    contextMenu.style.removeProperty("--accent-color-rgb")
    contextMenu.style.removeProperty("--accent-contrast-color")
    contextMenu.style.removeProperty("--music-player-bg")
  }

  const menuManagerDivider = document.getElementById("menu-manager-divider")
  const menuBookmarkManager = document.getElementById("menu-bookmark-manager")

  // Dọn dẹp các mục custom cũ nếu có
  contextMenu
    .querySelectorAll(".custom-music-item")
    .forEach((el) => el.remove())

  // Reset display
  menuEdit.style.display = "flex"
  menuDelete.style.display = "flex"
  menuSelect.style.display = "none"
  menuLock.style.display = "none"
  menuFavorite.style.display = "none"
  if (menuMove) menuMove.style.display = "none"

  if (menuManagerDivider) menuManagerDivider.style.display = "none"
  if (menuBookmarkManager) menuBookmarkManager.style.display = "none"

  const i18n = geti18n()

  const targetName = getContextMenuTargetName(type, id, index, i18n)
  if (targetName) {
    const headerEl = document.createElement("div")
    headerEl.className = "context-menu-header custom-music-item"
    headerEl.textContent = targetName
    contextMenu.prepend(headerEl)

    const headerDivider = document.createElement("div")
    headerDivider.className = "context-menu-divider custom-music-item"
    contextMenu.insertBefore(headerDivider, headerEl.nextSibling)
  }

  if (
    type === "bookmark" ||
    type === "bookmarkStack" ||
    type === "bookmarkStackItem"
  ) {
    menuSelect.style.display = "flex"
  }

  if (
    type === "bookmark" ||
    type === "bookmarkStack" ||
    type === "bookmarkStackItem" ||
    type === "group"
  ) {
    if (menuManagerDivider) menuManagerDivider.style.display = "block"
    if (menuBookmarkManager) menuBookmarkManager.style.display = "flex"
    addOpenBookmarkSettingsItem(i18n)

    if (type === "bookmark" || type === "bookmarkStackItem") {
      addGenerateQrCodeItem(i18n, type, index, id)
    }
  }

  if (type === "search") {
    menuEdit.style.display = "none"
    menuDelete.style.display = "none"
    menuFavorite.style.display = "none"
    menuSelect.style.display = "none"

    const settings = getSettings()
    if (settings.freeMoveSearchBar === true) {
      menuLock.style.display = "flex"
      let isLocked =
        settings.lockedWidgets && settings.lockedWidgets["searchBar"]
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
      menuLock.style.display = "none"
    }

    addOpenWidgetSettingsItem("search", i18n, false)
  } else if (type === "widget") {
    menuEdit.style.display = "none"
    menuDelete.style.display = "none"

    const settings = getSettings()

    let isFreeMoveEnabled = true
    if (id === "clock") {
      isFreeMoveEnabled = settings.freeMoveClock === true
    } else if (id === "custom-title" || id === "customTitle") {
      isFreeMoveEnabled = settings.freeMoveCustomTitle === true
    }

    if (!isFreeMoveEnabled) {
      menuLock.style.display = "none"
    } else {
      menuLock.style.display = "flex"
    }

    let isLocked = settings.lockedWidgets && settings.lockedWidgets[id]
    if (id === "custom-title" || id === "customTitle") {
      isLocked = settings.lockedWidgets && settings.lockedWidgets["customTitle"]
    } else if (id === "search") {
      isLocked = settings.lockedWidgets && settings.lockedWidgets["searchBar"]
    }

    const lockText = menuLock.querySelector("span")
    const lockIcon = menuLock.querySelector("i")

    if (isLocked) {
      lockIcon.className = "fa-solid fa-unlock"
      lockText.textContent = i18n.menu_unlock || "Unlock Position"
    } else {
      lockIcon.className = "fa-solid fa-lock"
      lockText.textContent = i18n.menu_lock || "Lock Position"
    }

    addOpenWidgetSettingsItem(id, i18n)

    const skinnableWidgets = [
      "todo",
      "timer",
      "calendar",
      "weather",
      "notepad",
      "daily-quotes",
      "rss",
      "habitTracker",
      "ambientSounds",
      "aiAssistant",
    ]

    if (skinnableWidgets.includes(id)) {
      const skinKey = `${id === "daily-quotes" ? "quotes" : id}Skin`
      const currentSkin = settings[skinKey] || "default"
      const isWhiteBlur = currentSkin === "white-blur"
      const isTransparent = currentSkin === "transparent"
      const isLightTransparent = currentSkin === "light-transparent"
      const isM3Accent = currentSkin === "m3-accent"
      const borderKey = `${id === "daily-quotes" ? "quotes" : id}HideBorder`
      const isBorderHidden = settings[borderKey] === true

      const skinBtn = createRadioMenuItem({
        label: i18n.skin_white_blur || "Kính mờ trắng",
        isSelected: isWhiteBlur,
        iconClass: "fa-solid fa-circle-half-stroke",
        handler: () => {
          const newVal = isWhiteBlur ? "default" : "white-blur"
          updateSetting(skinKey, newVal)
          saveSettings(true)

          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: skinKey, value: newVal },
            }),
          )

          const widgetIdMap = {
            todo: "todo-container",
            timer: "timer-component",
            calendar: "full-calendar-container",
            weather: "weather-container",
            notepad: "notepad-container",
            "daily-quotes": "daily-quotes",
            rss: "rss-container",
            habitTracker: "habit-tracker-container",
            ambientSounds: "ambient-sounds-container",
            aiAssistant: "ai-assistant-container",
          }
          const el = document.getElementById(widgetIdMap[id] || id)
          if (el) {
            el.classList.toggle("skin-white-blur", newVal === "white-blur")
            el.classList.toggle("skin-m3-accent", newVal === "m3-accent")
            el.classList.toggle("skin-transparent", newVal === "transparent")
            el.classList.toggle(
              "skin-light-transparent",
              newVal === "light-transparent",
            )
          }
          hideContextMenu()
        },
      })
      contextMenu.insertBefore(skinBtn, menuLock)

      const m3SkinBtn = createRadioMenuItem({
        label: i18n.skin_m3_accent || "Màu Accent",
        isSelected: isM3Accent,
        iconClass: "fa-solid fa-palette",
        handler: () => {
          const newVal = isM3Accent ? "default" : "m3-accent"
          updateSetting(skinKey, newVal)
          saveSettings(true)

          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: skinKey, value: newVal },
            }),
          )

          const widgetIdMap = {
            todo: "todo-container",
            timer: "timer-component",
            calendar: "full-calendar-container",
            weather: "weather-container",
            notepad: "notepad-container",
            "daily-quotes": "daily-quotes",
            rss: "rss-container",
            habitTracker: "habit-tracker-container",
            ambientSounds: "ambient-sounds-container",
            aiAssistant: "ai-assistant-container",
          }
          const el = document.getElementById(widgetIdMap[id] || id)
          if (el) {
            el.classList.toggle("skin-white-blur", newVal === "white-blur")
            el.classList.toggle("skin-m3-accent", newVal === "m3-accent")
            el.classList.toggle("skin-transparent", newVal === "transparent")
            el.classList.toggle(
              "skin-light-transparent",
              newVal === "light-transparent",
            )
          }
          hideContextMenu()
        },
      })
      contextMenu.insertBefore(m3SkinBtn, menuLock)

      const lightTransBtn = createRadioMenuItem({
        label: i18n.skin_light_transparent || "Trong suốt sáng",
        isSelected: isLightTransparent,
        iconClass: "fa-solid fa-droplet",
        handler: () => {
          const newVal = isLightTransparent ? "default" : "light-transparent"
          updateSetting(skinKey, newVal)
          saveSettings(true)

          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: skinKey, value: newVal },
            }),
          )

          const widgetIdMap = {
            todo: "todo-container",
            timer: "timer-component",
            calendar: "full-calendar-container",
            weather: "weather-container",
            notepad: "notepad-container",
            "daily-quotes": "daily-quotes",
            rss: "rss-container",
            habitTracker: "habit-tracker-container",
            ambientSounds: "ambient-sounds-container",
            aiAssistant: "ai-assistant-container",
          }
          const el = document.getElementById(widgetIdMap[id] || id)
          if (el) {
            el.classList.toggle("skin-white-blur", newVal === "white-blur")
            el.classList.toggle("skin-m3-accent", newVal === "m3-accent")
            el.classList.toggle("skin-transparent", newVal === "transparent")
            el.classList.toggle(
              "skin-light-transparent",
              newVal === "light-transparent",
            )
          }
          hideContextMenu()
        },
      })
      contextMenu.insertBefore(lightTransBtn, menuLock)

      if (skinnableWidgets.includes(id)) {
        const transBtn = createRadioMenuItem({
          label: i18n.skin_transparent || "Trong suốt",
          isSelected: isTransparent,
          iconClass: "fa-solid fa-ghost",
          handler: () => {
            const newVal = isTransparent ? "default" : "transparent"
            updateSetting(skinKey, newVal)
            saveSettings(true)

            window.dispatchEvent(
              new CustomEvent("layoutUpdated", {
                detail: { key: skinKey, value: newVal },
              }),
            )

            const widgetIdMap = {
              todo: "todo-container",
              timer: "timer-component",
              calendar: "full-calendar-container",
              weather: "weather-container",
              notepad: "notepad-container",
              "daily-quotes": "daily-quotes",
              rss: "rss-container",
              habitTracker: "habit-tracker-container",
              ambientSounds: "ambient-sounds-container",
              aiAssistant: "ai-assistant-container",
            }
            const el = document.getElementById(widgetIdMap[id] || id)
            if (el) {
              el.classList.toggle("skin-white-blur", newVal === "white-blur")
              el.classList.toggle("skin-m3-accent", newVal === "m3-accent")
              el.classList.toggle("skin-transparent", newVal === "transparent")
              el.classList.toggle(
                "skin-light-transparent",
                newVal === "light-transparent",
              )
            }
            hideContextMenu()
          },
        })
        contextMenu.insertBefore(transBtn, menuLock)
      }

      const separator = document.createElement("div")
      separator.className = "context-menu-divider custom-music-item"
      contextMenu.insertBefore(separator, menuLock)

      if (["todo", "timer", "habitTracker"].includes(id)) {
        const settingKey = `${id}Mini`
        const isMini = settings[settingKey] === true
        const miniBtn = createToggleMenuItem({
          label: i18n.widget_mini_size || "Mini Mode (Compact)",
          isActive: isMini,
          iconClass: "fa-solid fa-compress",
          activeText: i18n.status_on || "On",
          inactiveText: i18n.status_off || "Off",
          handler: () => {
            const widgetIdMap = {
              todo: "todo-container",
              timer: "timer-component",
              habitTracker: "habit-tracker-container",
              music: "music-player-container",
            }
            const el = document.getElementById(widgetIdMap[id])

            const newVal = !isMini
            updateSetting(settingKey, newVal)
            saveSettings(true)
            window.dispatchEvent(
              new CustomEvent("layoutUpdated", {
                detail: { key: settingKey, value: newVal },
              }),
            )

            if (el) {
              el.classList.toggle(`${id}-mini`, newVal)
            }
            hideContextMenu()
          },
        })
        contextMenu.insertBefore(miniBtn, menuLock)
      }

      if (id === "habitTracker") {
        contextMenu.insertBefore(createCustomMenuDivider(), menuLock)

        const colorMode = settings.habitColorMode || "custom"
        const modes = [
          { id: "custom", label: i18n.habit_color_custom || "Custom Color" },
          {
            id: "gradient",
            label: i18n.habit_color_gradient || "Red to Green",
          },
          { id: "m3", label: i18n.habit_color_m3 || "Accent Color" },
        ]

        modes.forEach((mode) => {
          const isSelected = colorMode === mode.id
          const modeBtn = createRadioMenuItem({
            label: mode.label,
            isSelected,
            iconClass: "fa-solid fa-palette",
            handler: () => {
              applyContextSetting("habitColorMode", mode.id)
              hideContextMenu()
            },
          })
          contextMenu.insertBefore(modeBtn, menuLock)
        })
      }

      if (id === "weather" || id === "rss") {
        const isMini = settings[`${id}Mini`] === true
        const isExpanded = settings[`${id}Expanded`] === true && !isMini

        const miniBtn = createToggleMenuItem({
          label: i18n.widget_mini_size || "Mini Mode (Compact)",
          isActive: isMini,
          iconClass: "fa-solid fa-compress",
          activeText: i18n.status_on || "On",
          inactiveText: i18n.status_off || "Off",
          handler: () => {
            const newVal = !isMini
            updateSetting(`${id}Mini`, newVal)
            if (newVal) updateSetting(`${id}Expanded`, false)
            saveSettings(true)

            window.dispatchEvent(
              new CustomEvent("layoutUpdated", {
                detail: { key: `${id}Mini`, value: newVal },
              }),
            )
            if (newVal) {
              window.dispatchEvent(
                new CustomEvent("layoutUpdated", {
                  detail: { key: `${id}Expanded`, value: false },
                }),
              )
            }

            const widgetIdMap = {
              weather: "weather-container",
              rss: "rss-container",
            }
            const el = document.getElementById(widgetIdMap[id])
            if (el) {
              el.classList.toggle(`${id}-mini`, newVal)
              el.classList.toggle(`${id}-expanded`, false)
            }
            hideContextMenu()
          },
        })
        contextMenu.insertBefore(miniBtn, menuLock)

        const expandBtn = createToggleMenuItem({
          label: i18n.weather_expand || "Enlarge Size",
          isActive: isExpanded,
          iconClass: "fa-solid fa-up-right-and-down-left-from-center",
          activeText: i18n.status_on || "On",
          inactiveText: i18n.status_off || "Off",
          handler: () => {
            const newVal = !isExpanded
            if (newVal) updateSetting(`${id}Mini`, false)
            updateSetting(`${id}Expanded`, newVal)
            saveSettings(true)

            if (newVal) {
              window.dispatchEvent(
                new CustomEvent("layoutUpdated", {
                  detail: { key: `${id}Mini`, value: false },
                }),
              )
            }
            window.dispatchEvent(
              new CustomEvent("layoutUpdated", {
                detail: { key: `${id}Expanded`, value: newVal },
              }),
            )

            const widgetIdMap = {
              weather: "weather-container",
              rss: "rss-container",
            }
            const el = document.getElementById(widgetIdMap[id])
            if (el) {
              el.classList.toggle(`${id}-mini`, false)
              el.classList.toggle(`${id}-expanded`, newVal)
            }
            hideContextMenu()
          },
        })
        contextMenu.insertBefore(expandBtn, menuLock)

        if (id === "weather") {
          const isFahrenheit = settings.weatherUnit === "fahrenheit"
          const unitBtn = createCycleMenuItem({
            label: i18n.weather_unit || "Temperature Unit",
            currentLabel: isFahrenheit ? "°F" : "°C",
            nextLabel: isFahrenheit ? "°C" : "°F",
            iconClass: "fa-solid fa-temperature-half",
            handler: () => {
              const newVal = isFahrenheit ? "celsius" : "fahrenheit"
              updateSetting("weatherUnit", newVal)
              saveSettings(true)
              window.dispatchEvent(
                new CustomEvent("layoutUpdated", {
                  detail: { key: "weatherUnit", value: newVal },
                }),
              )
              hideContextMenu()
            },
          })
          contextMenu.insertBefore(unitBtn, menuLock)
        }
      }

      if (id === "calendar") {
        const showSourceSwitcher = settings.calendarShowSourceSwitcher !== false
        const calendarSize = ["mini", "normal", "expanded"].includes(
          settings.calendarSize,
        )
          ? settings.calendarSize
          : "normal"

        const sourceBtn = createToggleMenuItem({
          label: i18n.calendar_source_tabs || "Calendar Event Source",
          isActive: showSourceSwitcher,
          iconClass: "fa-solid fa-calendar-days",
          activeText: i18n.status_show || "Show",
          inactiveText: i18n.status_hide || "Hide",
          handler: () => {
            const newVal = !showSourceSwitcher
            updateSetting("calendarShowSourceSwitcher", newVal)
            saveSettings(true)
            window.dispatchEvent(
              new CustomEvent("layoutUpdated", {
                detail: { key: "calendarShowSourceSwitcher", value: newVal },
              }),
            )
            hideContextMenu()
          },
        })
        contextMenu.insertBefore(sourceBtn, menuLock)

        const sizeOrder = ["normal", "mini", "expanded"]
        const nextSize =
          sizeOrder[(sizeOrder.indexOf(calendarSize) + 1) % sizeOrder.length]
        const sizeLabels = {
          normal: i18n.calendar_normal_size || "Normal",
          mini: i18n.calendar_mini_size || "Mini",
          expanded: i18n.calendar_expand_size || "Expanded",
        }
        const sizeBtn = createCycleMenuItem({
          label: i18n.calendar_size || "Calendar Size",
          currentLabel: sizeLabels[calendarSize] || calendarSize,
          nextLabel: sizeLabels[nextSize] || nextSize,
          iconClass: "fa-solid fa-up-right-and-down-left-from-center",
          handler: () => {
            updateSetting("calendarSize", nextSize)
            saveSettings(true)
            window.dispatchEvent(
              new CustomEvent("layoutUpdated", {
                detail: { key: "calendarSize", value: nextSize },
              }),
            )
            hideContextMenu()
          },
        })
        contextMenu.insertBefore(sizeBtn, menuLock)
      }

      const borderBtn = createToggleMenuItem({
        label: i18n.menu_border || "Widget Border",
        isActive: !isBorderHidden,
        iconClass: "fa-solid fa-border-all",
        activeText: i18n.status_show || "Show",
        inactiveText: i18n.status_hide || "Hide",
        handler: () => {
          const newVal = !isBorderHidden
          updateSetting(borderKey, newVal)
          saveSettings(true)

          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: borderKey, value: newVal },
            }),
          )

          const widgetIdMap = {
            todo: "todo-container",
            timer: "timer-component",
            calendar: "full-calendar-container",
            weather: "weather-container",
            notepad: "notepad-container",
            "daily-quotes": "daily-quotes",
            rss: "rss-container",
            habitTracker: "habit-tracker-container",
            ambientSounds: "ambient-sounds-container",
            aiAssistant: "ai-assistant-container",
          }
          const el = document.getElementById(widgetIdMap[id] || id)
          if (el) {
            el.classList.toggle("widget-border-hidden", newVal)
          }
          hideContextMenu()
        },
      })
      contextMenu.insertBefore(borderBtn, menuLock)

      if (id === "timer") {
        addTimerAlarmDropdownToggle(i18n, settings, borderBtn)
        addPomodoroStatsToggle(i18n, settings, borderBtn)
      }

      if (id === "daily-quotes") {
        const sourceKey = "quotesSource"
        const currentSource = settings[sourceKey] || "local"

        const sourceNames = {
          local: i18n.settings_quotes_source_local || "Local (Offline)",
          quotable: i18n.settings_quotes_source_quotable || "Quotable API",
          adviceslip: i18n.settings_quotes_source_advice || "Advice Slip API",
        }
        const nextSources = {
          local: "quotable",
          quotable: "adviceslip",
          adviceslip: "local",
        }
        const nextSource = nextSources[currentSource] || "local"

        const sourceBtn = createCycleMenuItem({
          label: i18n.settings_quotes_source || "Nguồn API",
          currentLabel: sourceNames[currentSource] || currentSource,
          nextLabel: sourceNames[nextSource] || nextSource,
          iconClass: "fa-solid fa-server",
          handler: () => {
            updateSetting(sourceKey, nextSource)
            saveSettings(true)
            window.dispatchEvent(
              new CustomEvent("layoutUpdated", {
                detail: { key: sourceKey, value: nextSource },
              }),
            )
            hideContextMenu()
          },
        })
        contextMenu.insertBefore(sourceBtn, menuLock)

        const freqKey = "quotesUpdateFreq"
        const currentFreq = settings[freqKey] || "tab"
        const freqNames = {
          tab: i18n.settings_quotes_freq_tab || "Every New Tab",
          hour: i18n.settings_quotes_freq_hour || "Every Hour",
          day: i18n.settings_quotes_freq_day || "Every Day",
        }
        const nextFreqs = {
          tab: "hour",
          hour: "day",
          day: "tab",
        }
        const nextFreq = nextFreqs[currentFreq] || "tab"

        const freqBtn = createCycleMenuItem({
          label: i18n.settings_quotes_update_freq || "Tần suất làm mới",
          currentLabel: freqNames[currentFreq] || currentFreq,
          nextLabel: freqNames[nextFreq] || nextFreq,
          iconClass: "fa-solid fa-clock-rotate-left",
          handler: () => {
            updateSetting(freqKey, nextFreq)
            saveSettings(true)
            window.dispatchEvent(
              new CustomEvent("layoutUpdated", {
                detail: { key: freqKey, value: nextFreq },
              }),
            )
            hideContextMenu()
          },
        })
        contextMenu.insertBefore(freqBtn, menuLock)
      }
    }

    // THÊM TÙY CHỌN RIÊNG CHO MUSIC PLAYER
    if (id === "music") {
      const musicStyle = settings.music_bar_style || settings.musicBarStyle
      const itemsToInsert = []

      // --- 1. Skins & Appearance Options ---

      // M3 Accent Skin
      const isM3Accent = settings.musicPlayerSkin === "m3-accent"
      const m3SkinBtn = createRadioMenuItem({
        label: i18n.skin_m3_accent || "Màu Accent",
        isSelected: isM3Accent,
        iconClass: "fa-solid fa-palette",
        handler: () => {
          const newSkin = isM3Accent ? "default" : "m3-accent"
          updateSetting("musicPlayerSkin", newSkin)
          saveSettings()
          window.dispatchEvent(
            new CustomEvent("settingsUpdated", {
              detail: { key: "musicPlayerSkin", value: newSkin },
            }),
          )
          hideContextMenu()
        },
      })
      itemsToInsert.push(m3SkinBtn)

      // Transparent Skin
      const isTransparent = settings.musicPlayerSkin === "transparent"
      const transparentBtn = createRadioMenuItem({
        label: i18n.skin_transparent || "Trong suốt",
        isSelected: isTransparent,
        iconClass: "fa-solid fa-ghost",
        handler: () => {
          const newSkin = isTransparent ? "default" : "transparent"
          updateSetting("musicPlayerSkin", newSkin)
          saveSettings()
          window.dispatchEvent(
            new CustomEvent("settingsUpdated", {
              detail: { key: "musicPlayerSkin", value: newSkin },
            }),
          )
          hideContextMenu()
        },
      })
      itemsToInsert.push(transparentBtn)

      // Light Transparent Skin
      const isLightTransparent =
        settings.musicPlayerSkin === "light-transparent"
      const lightTransparentBtn = createRadioMenuItem({
        label: i18n.skin_light_transparent || "Trong suốt sáng",
        isSelected: isLightTransparent,
        iconClass: "fa-solid fa-droplet",
        handler: () => {
          const newSkin = isLightTransparent ? "default" : "light-transparent"
          updateSetting("musicPlayerSkin", newSkin)
          saveSettings()
          window.dispatchEvent(
            new CustomEvent("settingsUpdated", {
              detail: { key: "musicPlayerSkin", value: newSkin },
            }),
          )
          hideContextMenu()
        },
      })
      itemsToInsert.push(lightTransparentBtn)

      // Thumbnail Background Skin
      const isThumbnailBg = settings.musicPlayerThumbnailBg === true
      const thumbnailBgBtn = createToggleMenuItem({
        label: i18n.skin_thumbnail_bg || "Nền theo Thumbnail",
        isActive: isThumbnailBg,
        iconClass: "fa-solid fa-image",
        activeText: i18n.status_on || "Bật",
        inactiveText: i18n.status_off || "Tắt",
        handler: () => {
          const newVal = !isThumbnailBg
          updateSetting("musicPlayerThumbnailBg", newVal)
          saveSettings()
          window.dispatchEvent(
            new CustomEvent("settingsUpdated", {
              detail: { key: "musicPlayerThumbnailBg", value: newVal },
            }),
          )
          hideContextMenu()
        },
      })
      itemsToInsert.push(thumbnailBgBtn)

      // Heartbeat specific / General style specific skins
      if (musicStyle === "square-thumb") {
        // Vertical Card Skin for Square Thumb
        const isVerticalCard = settings.musicPlayerSkin === "vertical-card"
        const verticalCardBtn = createRadioMenuItem({
          label: i18n.music_player_skin_vertical_card || "Thẻ dọc",
          isSelected: isVerticalCard,
          iconClass: "fa-solid fa-mobile-screen",
          handler: () => {
            const newSkin = isVerticalCard ? "default" : "vertical-card"
            updateSetting("musicPlayerSkin", newSkin)
            saveSettings()
            window.dispatchEvent(
              new CustomEvent("settingsUpdated", {
                detail: { key: "musicPlayerSkin", value: newSkin },
              }),
            )
            hideContextMenu()
          },
        })
        itemsToInsert.push(verticalCardBtn)

        // Horizontal Card Skin for Square Thumb
        const isHorizontalCard = settings.musicPlayerSkin === "horizontal-card"
        const horizontalCardBtn = createRadioMenuItem({
          label: i18n.music_player_skin_horizontal_card || "Thẻ ngang",
          isSelected: isHorizontalCard,
          iconClass: "fa-solid fa-money-check",
          handler: () => {
            const newSkin = isHorizontalCard ? "default" : "horizontal-card"
            updateSetting("musicPlayerSkin", newSkin)
            saveSettings()
            window.dispatchEvent(
              new CustomEvent("settingsUpdated", {
                detail: { key: "musicPlayerSkin", value: newSkin },
              }),
            )
            hideContextMenu()
          },
        })
        itemsToInsert.push(horizontalCardBtn)
      } else if (musicStyle === "heartbeat") {
        // GameBoy Skin
        const isGameBoy = settings.musicPlayerSkin === "gameboy"
        const gameboyBtn = createRadioMenuItem({
          label: i18n.music_player_skin_gameboy || "GameBoy",
          isSelected: isGameBoy,
          iconClass: "fa-solid fa-gamepad",
          handler: () => {
            const newSkin = isGameBoy ? "default" : "gameboy"
            updateSetting("musicPlayerSkin", newSkin)
            saveSettings()
            window.dispatchEvent(
              new CustomEvent("settingsUpdated", {
                detail: { key: "musicPlayerSkin", value: newSkin },
              }),
            )
            hideContextMenu()
          },
        })
        itemsToInsert.push(gameboyBtn)

        // White Blur Skin for Heartbeat
        const isWhiteBlur = settings.musicPlayerSkin === "white-blur"
        const whiteSkinBtn = createRadioMenuItem({
          label: i18n.skin_white_blur || "Kính mờ trắng",
          isSelected: isWhiteBlur,
          iconClass: "fa-solid fa-circle-half-stroke",
          handler: () => {
            const newSkin = isWhiteBlur ? "default" : "white-blur"
            updateSetting("musicPlayerSkin", newSkin)
            saveSettings()
            window.dispatchEvent(
              new CustomEvent("settingsUpdated", {
                detail: { key: "musicPlayerSkin", value: newSkin },
              }),
            )
            hideContextMenu()
          },
        })
        itemsToInsert.push(whiteSkinBtn)
      } else {
        // White Blur Skin for other styles
        const isWhiteBlur = settings.musicPlayerSkin === "white-blur"
        const whiteSkinBtn = createRadioMenuItem({
          label: i18n.skin_white_blur || "Kính mờ trắng",
          isSelected: isWhiteBlur,
          iconClass: "fa-solid fa-circle-half-stroke",
          handler: () => {
            const newSkin = isWhiteBlur ? "default" : "white-blur"
            updateSetting("musicPlayerSkin", newSkin)
            saveSettings()
            window.dispatchEvent(
              new CustomEvent("settingsUpdated", {
                detail: { key: "musicPlayerSkin", value: newSkin },
              }),
            )
            hideContextMenu()
          },
        })
        itemsToInsert.push(whiteSkinBtn)
      }

      // --- 2. Divider ---
      const div1 = document.createElement("div")
      div1.className = "context-menu-divider custom-music-item"
      itemsToInsert.push(div1)

      // --- 3. Shaking & Colors (Grouped together) ---

      // Shaking Animation Toggler ("Hiệu ứng bồng bềnh")
      const isNoShaking = settings.musicPlayerNoShaking === true
      const shakeBtn = createToggleMenuItem({
        label: i18n.music_player_shaking || "Floating Effect",
        isActive: !isNoShaking,
        iconClass: isNoShaking ? "fa-solid fa-anchor" : "fa-solid fa-wand-magic-sparkles",
        activeText: i18n.status_on || "On",
        inactiveText: i18n.status_off || "Off",
        handler: () => {
          const newVal = !isNoShaking
          updateSetting("musicPlayerNoShaking", newVal)
          saveSettings()
          window.dispatchEvent(
            new CustomEvent("settingsUpdated", {
              detail: { key: "musicPlayerNoShaking", value: newVal },
            }),
          )
          hideContextMenu()
        },
      })
      itemsToInsert.push(shakeBtn)

      // Color Mode (Cycle)
      const colorModes = [
        true,
        false,
        "thumbnail",
        "thumbnail-dynamic",
        "rgb-flow",
      ]
      const currentColorMode =
        settings.musicPlayerUseDefaultColor === undefined
          ? true
          : settings.musicPlayerUseDefaultColor
      const nextColorMode =
        colorModes[
          (colorModes.indexOf(currentColorMode) + 1) % colorModes.length
        ]

      const getColorModeTitle = (mode) => {
        if (mode === true) return i18n.music_player_color_brand || "Default"
        if (mode === false) return i18n.music_player_color_global || "Theme Color"
        if (mode === "thumbnail") return i18n.music_player_color_thumb || "Thumbnail"
        if (mode === "thumbnail-dynamic")
          return i18n.music_player_color_thumb_dynamic || "Dynamic Thumbnail"
        if (mode === "rgb-flow") return i18n.music_player_color_rgb_flow || "RGB Rainbow"
        return String(mode)
      }

      const defaultColorBtn = createCycleMenuItem({
        label: i18n.music_player_wave_color || "Wave Color",
        currentLabel: getColorModeTitle(currentColorMode),
        nextLabel: getColorModeTitle(nextColorMode),
        iconClass: "fa-solid fa-fill-drip",
        handler: () => {
          updateSetting("musicPlayerUseDefaultColor", nextColorMode)
          saveSettings()
          window.dispatchEvent(
            new CustomEvent("settingsUpdated", {
              detail: {
                key: "musicPlayerUseDefaultColor",
                value: nextColorMode,
              },
            }),
          )
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: {
                key: "musicPlayerUseDefaultColor",
                value: nextColorMode,
              },
            }),
          )
          hideContextMenu()
        },
      })
      itemsToInsert.push(defaultColorBtn)

      // Wave Background Color Toggler ("Màu nền theo nhạc")
      const isWaveBg = settings.musicPlayerWaveBgColor === true
      const waveBgBtn = createToggleMenuItem({
        label: i18n.music_player_wave_bg || "Music Dynamic Background",
        isActive: isWaveBg,
        iconClass: "fa-solid fa-droplet",
        activeText: i18n.status_on || "On",
        inactiveText: i18n.status_off || "Off",
        handler: () => {
          const newVal = !isWaveBg
          updateSetting("musicPlayerWaveBgColor", newVal)
          saveSettings()
          window.dispatchEvent(
            new CustomEvent("settingsUpdated", {
              detail: { key: "musicPlayerWaveBgColor", value: newVal },
            }),
          )
          hideContextMenu()
        },
      })
      itemsToInsert.push(waveBgBtn)

      // Source Icon Color Mode ("Icon nguồn")
      const sourceIconModes = ["brand", "accent", "none"]
      const currentIconMode = settings.musicSourceIconColorMode || "brand"
      const nextIconMode =
        sourceIconModes[
          (sourceIconModes.indexOf(currentIconMode) + 1) %
            sourceIconModes.length
        ]
      const sourceIconModeLabels = {
        brand: i18n.music_source_icon_brand || "Brand",
        accent: i18n.music_source_icon_accent || "Accent Color",
        none: i18n.music_source_icon_none || "None",
      }
      const sourceIconBtn = createCycleMenuItem({
        label: i18n.music_source_icon_context || "Source Icon",
        currentLabel: sourceIconModeLabels[currentIconMode] || currentIconMode,
        nextLabel: sourceIconModeLabels[nextIconMode] || nextIconMode,
        iconClass: "fa-solid fa-icons",
        handler: () => {
          updateSetting("musicSourceIconColorMode", nextIconMode)
          saveSettings()
          window.dispatchEvent(
            new CustomEvent("settingsUpdated", {
              detail: {
                key: "musicSourceIconColorMode",
                value: nextIconMode,
              },
            }),
          )
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: {
                key: "musicSourceIconColorMode",
                value: nextIconMode,
              },
            }),
          )
          hideContextMenu()
        },
      })
      itemsToInsert.push(sourceIconBtn)

      // Real-time Audio Reactive Toggler ("Sóng nhạc Real-time")
      const isReactive = settings.musicRealAudioReactive === true
      const audioReactiveBtn = createToggleMenuItem({
        label: i18n.music_real_audio_reactive || "Real-time Wave",
        isActive: isReactive,
        iconClass: isReactive ? "fa-solid fa-bolt-lightning" : "fa-solid fa-wave-square",
        activeText: i18n.status_on || "On",
        inactiveText: i18n.status_off || "Off",
        handler: () => {
          const newVal = !isReactive
          window.dispatchEvent(
            new CustomEvent("toggleMusicRealAudioReactive", {
              detail: { value: newVal },
            }),
          )
          hideContextMenu()
        },
      })
      itemsToInsert.push(audioReactiveBtn)

      // CPU Saving Mode Toggler ("Tiết kiệm CPU")
      const isCpuSave = settings.musicVisualizerCpuSave !== false
      const cpuSaveBtn = createToggleMenuItem({
        label: i18n.music_visualizer_mode_cpusave || "CPU Save Mode",
        isActive: isCpuSave,
        iconClass: isCpuSave ? "fa-solid fa-leaf" : "fa-solid fa-bolt",
        activeText: i18n.status_on || "On",
        inactiveText: i18n.status_off || "Off",
        handler: () => {
          const newVal = !isCpuSave
          updateSetting("musicVisualizerCpuSave", newVal)
          saveSettings()
          window.dispatchEvent(
            new CustomEvent("settingsUpdated", {
              detail: { key: "musicVisualizerCpuSave", value: newVal },
            }),
          )
          hideContextMenu()
        },
      })
      itemsToInsert.push(cpuSaveBtn)

      // --- 4. Divider ---
      const div2 = document.createElement("div")
      div2.className = "context-menu-divider custom-music-item"
      itemsToInsert.push(div2)

      // --- 5. Layout options ---

      // Mini Mode Toggler
      const isMini = settings.musicMini === true
      const miniBtn = createToggleMenuItem({
        label: i18n.widget_mini_size || "Mini Mode (Compact)",
        isActive: isMini,
        iconClass: "fa-solid fa-compress",
        activeText: i18n.status_on || "On",
        inactiveText: i18n.status_off || "Off",
        handler: () => {
          const el = document.getElementById("music-player-container")
          const newVal = !isMini
          updateSetting("musicMini", newVal)
          saveSettings(true)
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: "musicMini", value: newVal },
            }),
          )
          if (el) {
            el.classList.toggle("music-mini", newVal)
          }
          hideContextMenu()
        },
      })
      itemsToInsert.push(miniBtn)

      // Border Toggler
      const isMusicBorderHidden = settings.musicPlayerHideBorder === true
      const musicBorderBtn = createToggleMenuItem({
        label: i18n.menu_border || "Widget Border",
        isActive: !isMusicBorderHidden,
        iconClass: "fa-solid fa-border-all",
        activeText: i18n.status_show || "Show",
        inactiveText: i18n.status_hide || "Hide",
        handler: () => {
          const newVal = !isMusicBorderHidden
          updateSetting("musicPlayerHideBorder", newVal)
          saveSettings()
          window.dispatchEvent(
            new CustomEvent("settingsUpdated", {
              detail: { key: "musicPlayerHideBorder", value: newVal },
            }),
          )
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: "musicPlayerHideBorder", value: newVal },
            }),
          )
          const container = document.getElementById("music-player-container")
          const wrapper = container?.querySelector(".music-player-wrapper")
          container?.classList.toggle("widget-border-hidden", newVal)
          wrapper?.classList.toggle("widget-border-hidden", newVal)
          hideContextMenu()
        },
      })
      itemsToInsert.push(musicBorderBtn)

      // Insert all sequentially before menuLock
      itemsToInsert.forEach((item) => {
        contextMenu.insertBefore(item, menuLock)
      })
    }
  } else if (type === "background") {
    menuEdit.style.display = "none"
    menuDelete.style.display = "none"
    menuLock.style.display = "none"
    menuFavorite.style.display = "none"
    menuSelect.style.display = "none"

    addBackgroundContextMenuItems(i18n)
  } else if (
    type === "quick-access-toggle" ||
    type === "quick-access-bar" ||
    type === "quick-access"
  ) {
    menuEdit.style.display = "none"
    menuDelete.style.display = "none"
    menuLock.style.display = "none"
    menuFavorite.style.display = "none"
    menuSelect.style.display = "none"

    const settings = getSettings()
    const radii = [
      "20px",
      "18px",
      "16px",
      "14px",
      "12px",
      "10px",
      "8px",
      "5px",
      "4px",
      "0px",
    ]

    const createMenuItem = (label, iconClass, handler, extraClass = "") => {
      const item = document.createElement("div")
      item.className =
        `context-menu-item custom-music-item ${extraClass}`.trim()
      item.innerHTML = `<i class="${iconClass}"></i> <span>${label}</span>`
      item.onclick = handler
      return item
    }

    let closeOnOutside = null
    const removeQuickPopup = () => {
      if (closeOnOutside) {
        window.removeEventListener("pointerdown", closeOnOutside)
        closeOnOutside = null
      }
      document
        .querySelectorAll(".quick-access-popup")
        .forEach((el) => el.remove())
    }
    const keepQuickPopupOpen = (event) => {
      event.stopPropagation()
    }

    const openQuickAccessPopup = () => {
      removeQuickPopup()
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("openLayoutControls", {
            detail: { tab: "quick-access" },
          }),
        )
      }, 0)
      return

      const quickAccessBar = document.querySelector(".quick-access-bar")
      const barRect = quickAccessBar?.getBoundingClientRect?.()

      const popup = document.createElement("div")
      popup.className = "layout-controls-popup quick-access-popup"
      popup.style.position = "fixed"
      if (barRect) {
        popup.style.left = `${Math.min(barRect.right + 12, window.innerWidth - 404)}px`
        popup.style.top = `${Math.max(12, Math.min(barRect.top, window.innerHeight - 520))}px`
      } else {
        popup.style.left = `${Math.max(12, Math.min(lastContextMenuX + 188, window.innerWidth - 404))}px`
        popup.style.top = `${Math.max(12, Math.min(lastContextMenuY - 28, window.innerHeight - 520))}px`
      }

      const title = document.createElement("div")
      title.className = "lcp-title"
      title.innerHTML = `<i class="fa-solid fa-sliders"></i><span>${i18n.quick_access_settings || "Quick Access Settings"}</span>`
      popup.appendChild(title)

      const sections = [
        {
          key: "quickAccessBorderRadius",
          label: i18n.quick_access_button_radius || "Active Button Radius",
          hint:
            i18n.quick_access_button_radius_hint ||
            "Applies to active quick buttons.",
          value: settings.quickAccessBorderRadius || "5px",
          icon: "fa-solid fa-circle-dot",
        },
        {
          key: "quickAccessBarRadius",
          label: i18n.quick_access_bar_radius || "Quick Access Bar Radius",
          hint:
            i18n.quick_access_bar_radius_hint ||
            "Applies to the full quick access panel.",
          value: settings.quickAccessBarRadius || "var(--radius-lg)",
          icon: "fa-regular fa-window-maximize",
        },
        {
          key: "quickAccessToggleRadius",
          label: i18n.quick_access_toggle_radius || "Settings Toggle Radius",
          hint:
            i18n.quick_access_toggle_radius_hint ||
            "Applies to the settings-toggle button.",
          value: settings.quickAccessToggleRadius || "50%",
          icon: "fa-solid fa-gear",
        },
      ]

      sections.forEach((section) => {
        const sectionRow = document.createElement("div")
        sectionRow.className = "lcp-row quick-access-section-row"

        const icon = document.createElement("div")
        icon.className = "lcp-icon"
        icon.innerHTML = `<i class="${section.icon}"></i>`

        const content = document.createElement("div")
        content.className = "quick-access-section-content"

        const header = document.createElement("div")
        header.className = "quick-access-section-header"

        const label = document.createElement("div")
        label.className = "lcp-label quick-access-section-label"
        label.textContent = section.label

        const current = document.createElement("div")
        current.className = "quick-access-section-current"
        current.textContent = section.value

        const hint = document.createElement("div")
        hint.className = "quick-access-section-hint"
        hint.textContent = section.hint

        header.appendChild(label)
        header.appendChild(current)
        content.appendChild(header)
        content.appendChild(hint)
        sectionRow.appendChild(icon)
        sectionRow.appendChild(content)
        popup.appendChild(sectionRow)

        const chipWrap = document.createElement("div")
        chipWrap.className = "quick-access-radius-grid"
        radii.forEach((radius) => {
          const chip = document.createElement("button")
          chip.type = "button"
          chip.className = "quick-access-radius-chip"
          if (section.value === radius) {
            chip.classList.add("is-active")
          }
          chip.innerHTML =
            section.value === radius
              ? `<i class="fa-solid fa-check"></i><span>${radius}</span>`
              : `<span>${radius}</span>`
          chip.onclick = () => {
            updateSetting(section.key, radius)
            saveSettings()
            window.dispatchEvent(
              new CustomEvent("layoutUpdated", {
                detail: { key: section.key, value: radius },
              }),
            )
            current.textContent = radius
            chipWrap
              .querySelectorAll(".quick-access-radius-chip")
              .forEach((el) => {
                el.classList.remove("is-active")
                const icon = el.querySelector("i")
                const text = el.querySelector("span")
                if (icon) icon.remove()
                if (text) {
                  el.textContent = text.textContent
                }
              })
            chip.classList.add("is-active")
            chip.innerHTML = `<i class="fa-solid fa-check"></i><span>${radius}</span>`
          }
          chip.addEventListener("pointerdown", (event) => {
            event.stopPropagation()
          })
          chip.addEventListener("click", keepQuickPopupOpen)
          chipWrap.appendChild(chip)
        })
        popup.appendChild(chipWrap)
      })

      const skinRow = document.createElement("div")
      skinRow.className = "lcp-row quick-access-border-row"
      const skinIcon = document.createElement("div")
      skinIcon.className = "lcp-icon"
      skinIcon.innerHTML = `<i class="fa-solid fa-palette"></i>`
      const skinLabel = document.createElement("div")
      skinLabel.className = "lcp-label"
      skinLabel.textContent = i18n.quick_access_skin || "Quick Access Skin"
      skinRow.appendChild(skinIcon)
      skinRow.appendChild(skinLabel)
      popup.appendChild(skinRow)

      const skinGrid = document.createElement("div")
      skinGrid.className = "quick-access-radius-grid quick-access-skin-grid"
      const skins = [
        {
          value: "default",
          label: i18n.skin_default || "Default",
          icon: "fa-solid fa-circle",
        },
        {
          value: "light",
          label: i18n.skin_light || "Light",
          icon: "fa-solid fa-sun",
        },
        {
          value: "m3-accent",
          label: i18n.skin_m3_accent || "M3 Accent",
          icon: "fa-solid fa-palette",
        },
        {
          value: "transparent",
          label: i18n.skin_transparent || "Transparent",
          icon: "fa-solid fa-border-none",
        },
        {
          value: "light-transparent",
          label: i18n.skin_light_transparent || "Light Transparent",
          icon: "fa-solid fa-droplet",
        },
        {
          value: "contrast",
          label: i18n.skin_contrast || "Contrast",
          icon: "fa-solid fa-circle-half-stroke",
        },
      ]
      let activeSkin = skins.some(
        (skin) => skin.value === settings.quickAccessSkin,
      )
        ? settings.quickAccessSkin
        : "default"
      skins.forEach((skin) => {
        const chip = document.createElement("button")
        chip.type = "button"
        chip.className = "quick-access-radius-chip"
        if (activeSkin === skin.value) chip.classList.add("is-active")
        chip.innerHTML = `<i class="${activeSkin === skin.value ? "fa-solid fa-check" : skin.icon}"></i><span>${skin.label}</span>`
        chip.onclick = () => {
          activeSkin = skin.value
          updateSetting("quickAccessSkin", skin.value)
          saveSettings()
          document.body.classList.toggle(
            "quick-access-m3-accent",
            skin.value === "m3-accent",
          )
          document.body.classList.toggle(
            "quick-access-transparent",
            skin.value === "transparent",
          )
          document.body.classList.toggle(
            "quick-access-light-transparent",
            skin.value === "light-transparent",
          )
          document.body.classList.toggle(
            "quick-access-light",
            skin.value === "light",
          )
          document.body.classList.toggle(
            "quick-access-contrast",
            skin.value === "contrast",
          )
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: "quickAccessSkin", value: skin.value },
            }),
          )
          skinGrid
            .querySelectorAll(".quick-access-radius-chip")
            .forEach((el, index) => {
              el.classList.toggle(
                "is-active",
                skins[index].value === skin.value,
              )
              el.innerHTML = `<i class="${skins[index].value === skin.value ? "fa-solid fa-check" : skins[index].icon}"></i><span>${skins[index].label}</span>`
            })
        }
        chip.addEventListener("pointerdown", (event) => {
          event.stopPropagation()
        })
        chip.addEventListener("click", keepQuickPopupOpen)
        skinGrid.appendChild(chip)
      })
      popup.appendChild(skinGrid)

      const borderRow = document.createElement("div")
      borderRow.className = "lcp-row quick-access-border-row"
      const borderIcon = document.createElement("div")
      borderIcon.className = "lcp-icon"
      let borderVisible = settings.quickAccessBorderVisible !== false
      borderIcon.innerHTML = `<i class="${borderVisible ? "fa-solid fa-square-check" : "fa-regular fa-square"}"></i>`

      const borderLabel = document.createElement("div")
      borderLabel.className = "lcp-label"
      borderLabel.textContent = i18n.quick_access_border_toggle || "Show Border"

      const borderBtn = document.createElement("button")
      borderBtn.type = "button"
      borderBtn.className =
        "quick-access-radius-chip quick-access-border-button"
      borderBtn.textContent = borderVisible
        ? i18n.quick_access_border_on || "Show Border"
        : i18n.quick_access_border_off || "Hide Border"
      borderBtn.onclick = () => {
        borderVisible = !borderVisible
        updateSetting("quickAccessBorderVisible", borderVisible)
        saveSettings()
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: "quickAccessBorderVisible", value: borderVisible },
          }),
        )
        borderIcon.innerHTML = `<i class="${borderVisible ? "fa-solid fa-square-check" : "fa-regular fa-square"}"></i>`
        borderBtn.textContent = borderVisible
          ? i18n.quick_access_border_on || "Show Border"
          : i18n.quick_access_border_off || "Hide Border"
      }
      borderBtn.addEventListener("pointerdown", (event) => {
        event.stopPropagation()
      })
      borderBtn.addEventListener("click", keepQuickPopupOpen)

      borderRow.appendChild(borderIcon)
      borderRow.appendChild(borderLabel)
      borderRow.appendChild(borderBtn)
      popup.appendChild(borderRow)

      const sizeRow = document.createElement("div")
      sizeRow.className = "lcp-row quick-access-border-row"
      const sizeIcon = document.createElement("div")
      sizeIcon.className = "lcp-icon"
      let isMiniState = settings.contextMenuMini === true
      sizeIcon.innerHTML = `<i class="fa-solid ${isMiniState ? "fa-down-left-and-up-right-to-center" : "fa-up-right-and-down-left-from-center"}"></i>`

      const sizeLabel = document.createElement("div")
      sizeLabel.className = "lcp-label"
      sizeLabel.textContent =
        i18n.context_menu_size_toggle || "Context Menu Size"

      const sizeBtn = document.createElement("button")
      sizeBtn.type = "button"
      sizeBtn.className = "quick-access-radius-chip quick-access-border-button"
      sizeBtn.textContent = isMiniState
        ? i18n.context_menu_size_mini || "Mini"
        : i18n.context_menu_size_enlarged || "Phóng to (Mặc định)"
      sizeBtn.onclick = () => {
        isMiniState = !isMiniState
        updateSetting("contextMenuMini", isMiniState)
        saveSettings(true)
        document.body.classList.toggle("context-menu-mini", isMiniState)
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: "contextMenuMini", value: isMiniState },
          }),
        )
        sizeIcon.innerHTML = `<i class="fa-solid ${isMiniState ? "fa-down-left-and-up-right-to-center" : "fa-up-right-and-down-left-from-center"}"></i>`
        sizeBtn.textContent = isMiniState
          ? i18n.context_menu_size_mini || "Mini"
          : i18n.context_menu_size_enlarged || "Phóng to (Mặc định)"
      }
      sizeBtn.addEventListener("pointerdown", (event) => {
        event.stopPropagation()
      })
      sizeBtn.addEventListener("click", keepQuickPopupOpen)

      sizeRow.appendChild(sizeIcon)
      sizeRow.appendChild(sizeLabel)
      sizeRow.appendChild(sizeBtn)
      popup.appendChild(sizeRow)

      popup.addEventListener("pointerdown", keepQuickPopupOpen)
      popup.addEventListener("click", keepQuickPopupOpen)
      popup.addEventListener("contextmenu", keepQuickPopupOpen)

      document.body.appendChild(popup)

      closeOnOutside = (event) => {
        const path =
          typeof event.composedPath === "function" ? event.composedPath() : []
        if (!popup.contains(event.target) && !path.includes(popup)) {
          removeQuickPopup()
        }
      }

      setTimeout(() => {
        window.addEventListener("pointerdown", closeOnOutside)
      }, 0)
    }

    const isMiniMenu = settings.contextMenuMini === true
    const miniToggleBtn = createMenuItem(
      isMiniMenu
        ? i18n.context_menu_normal_size || "Phóng to Menu chuột phải"
        : i18n.context_menu_mini_size || "Thu nhỏ Menu chuột phải (Mini)",
      isMiniMenu
        ? "fa-solid fa-up-right-and-down-left-from-center"
        : "fa-solid fa-down-left-and-up-right-to-center",
      () => {
        const newVal = !isMiniMenu
        updateSetting("contextMenuMini", newVal)
        saveSettings(true)
        document.body.classList.toggle("context-menu-mini", newVal)
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: "contextMenuMini", value: newVal },
          }),
        )
        hideContextMenu()
      },
      "quick-access-root-item",
    )
    contextMenu.appendChild(miniToggleBtn)

    const menuText = createMenuItem(
      i18n.quick_access_settings || "Quick Access Settings",
      "fa-solid fa-sliders",
      () => {
        hideContextMenu()
        openQuickAccessPopup()
      },
      "quick-access-root-item context-settings-item",
    )
    contextMenu.appendChild(menuText)
  } else if (
    [
      "localBg",
      "userColor",
      "userAccentColor",
      "userGradient",
      "userMultiColor",
      "userSvgWave",
      "userFont",
    ].includes(type)
  ) {
    menuEdit.style.display = "none"
    menuFavorite.style.display = "flex"

    // Check if currently favorited
    let isFavorite = false
    let key = ""
    const settings = getSettings()
    switch (type) {
      case "localBg":
        key = "userBackgrounds"
        break
      case "userColor":
        key = "userColors"
        break
      case "userAccentColor":
        key = "userAccentColors"
        break
      case "userGradient":
        key = "userGradients"
        break
      case "userMultiColor":
        key = "userGradients"
        break
      case "userSvgWave":
        key = "userSvgWaves"
        break
      case "userFont":
        key = "userSavedFonts"
        break
    }

    if (key && settings[key] && index > -1 && settings[key][index]) {
      const item = settings[key][index]
      isFavorite = typeof item === "object" ? !!item.isFavorite : false
    }

    const favoriteText = menuFavorite.querySelector("span")
    if (favoriteText) {
      favoriteText.textContent = isFavorite
        ? i18n.menu_unfavorite || "Unfavorite"
        : i18n.menu_favorite || "Favorite"
    }

    if (type === "userFont") {
      menuMove.style.display = "flex"
      if (callbacks && callbacks.fontCategoryType) {
        const targetType =
          callbacks.fontCategoryType === "clock"
            ? i18n.settings_font || "General"
            : i18n.clock || "Clock"
        const span = menuMove.querySelector("span")
        if (span)
          span.textContent = `${i18n.menu_move_font || "Move to"} ${targetType}`
      }
      menuSelect.style.display = "flex"

      const applyGenBtn = document.createElement("div")
      applyGenBtn.className = "context-menu-item custom-music-item"
      applyGenBtn.innerHTML = `<i class="fa-solid fa-font"></i> <span>${i18n.menu_apply_general || "Apply to General"}</span>`
      applyGenBtn.onclick = () => {
        if (callbacks && callbacks.onApplyToGen) callbacks.onApplyToGen()
        hideContextMenu()
      }
      contextMenu.insertBefore(applyGenBtn, menuDelete)

      const applyClockBtn = document.createElement("div")
      applyClockBtn.className = "context-menu-item custom-music-item"
      applyClockBtn.innerHTML = `<i class="fa-solid fa-clock"></i> <span>${i18n.menu_apply_clock || "Apply to Clock"}</span>`
      applyClockBtn.onclick = () => {
        if (callbacks && callbacks.onApplyToClock) callbacks.onApplyToClock()
        hideContextMenu()
      }
      contextMenu.insertBefore(applyClockBtn, menuDelete)

      const applyBothBtn = document.createElement("div")
      applyBothBtn.className = "context-menu-item custom-music-item"
      applyBothBtn.innerHTML = `<i class="fa-solid fa-check-double"></i> <span>${i18n.menu_apply_both || "Apply to Both"}</span>`
      applyBothBtn.onclick = () => {
        if (callbacks && callbacks.onApplyToBoth) callbacks.onApplyToBoth()
        hideContextMenu()
      }
      contextMenu.insertBefore(applyBothBtn, menuDelete)
    } else {
      menuMove.style.display = "none"
      menuSelect.style.display = "flex"
    }

    menuDelete.style.display = "flex"
    menuLock.style.display = "none"
  } else if (type === "predefinedFont") {
    menuEdit.style.display = "none"
    menuFavorite.style.display = "flex"
    menuDelete.style.display = "none"
    menuLock.style.display = "none"
    menuSelect.style.display = "none"

    menuMove.style.display = "flex"
    if (callbacks && callbacks.fontCategoryType) {
      const targetType =
        callbacks.fontCategoryType === "clock"
          ? i18n.settings_font || "General"
          : i18n.clock || "Clock"
      const span = menuMove.querySelector("span")
      if (span)
        span.textContent = `${i18n.menu_move_font || "Move to"} ${targetType}`
    }

    const applyGenBtn = document.createElement("div")
    applyGenBtn.className = "context-menu-item custom-music-item"
    applyGenBtn.innerHTML = `<i class="fa-solid fa-font"></i> <span>${i18n.menu_apply_general || "Apply to General"}</span>`
    applyGenBtn.onclick = () => {
      if (callbacks && callbacks.onApplyToGen) callbacks.onApplyToGen()
      hideContextMenu()
    }
    contextMenu.appendChild(applyGenBtn)

    const applyClockBtn = document.createElement("div")
    applyClockBtn.className = "context-menu-item custom-music-item"
    applyClockBtn.innerHTML = `<i class="fa-solid fa-clock"></i> <span>${i18n.menu_apply_clock || "Apply to Clock"}</span>`
    applyClockBtn.onclick = () => {
      if (callbacks && callbacks.onApplyToClock) callbacks.onApplyToClock()
      hideContextMenu()
    }
    contextMenu.appendChild(applyClockBtn)

    const applyBothBtn = document.createElement("div")
    applyBothBtn.className = "context-menu-item custom-music-item"
    applyBothBtn.innerHTML = `<i class="fa-solid fa-check-double"></i> <span>${i18n.menu_apply_both || "Apply to Both"}</span>`
    applyBothBtn.onclick = () => {
      if (callbacks && callbacks.onApplyToBoth) callbacks.onApplyToBoth()
      hideContextMenu()
    }
    contextMenu.appendChild(applyBothBtn)

    const settings = getSettings()
    const label = id // id contains font label
    const savedFonts = settings.userSavedFonts || []
    const found = savedFonts.find(
      (f) => (typeof f === "string" ? f : f.label) === label,
    )
    const isFavorite =
      found && typeof found === "object" ? !!found.isFavorite : false

    const favoriteText = menuFavorite.querySelector("span")
    if (favoriteText) {
      favoriteText.textContent = isFavorite
        ? i18n.menu_unfavorite || "Unfavorite"
        : i18n.menu_favorite || "Favorite"
    }
  } else if (type === "effect") {
    menuEdit.style.display = "none"
    menuFavorite.style.display = "flex"
    menuDelete.style.display = "none"
    menuLock.style.display = "none"

    const settings = getSettings()
    const effectId = id // id contains effect data-value
    const favoriteEffects = settings.favoriteEffects || []
    const isFavorite = favoriteEffects.includes(effectId)

    const favoriteText = menuFavorite.querySelector("span")
    if (favoriteText) {
      favoriteText.textContent = isFavorite
        ? i18n.menu_unfavorite || "Unfavorite"
        : i18n.menu_favorite || "Favorite"
    }

    addEffectContextMenuItems(effectId, i18n)
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

  normalizeContextMenuFooter()

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
  hideContextMenuDetailToast()
  contextMenu.style.display = "none"
  contextMenuTargetIndex = -1
  contextMenuTargetType = "bookmark"
  contextMenuTargetId = null
  contextMenuCallbacks = null
  contextMenuTargetBookmark = null
  const qrHover = document.getElementById("qr-hover-popover")
  if (qrHover) qrHover.style.display = "none"
  // Remove any quick-access popup that may have been opened
  const old = document.querySelector(".quick-access-popup")
  if (old && old.parentElement) old.parentElement.removeChild(old)
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
      const { renderLocalBackgrounds } =
        await import("./settings/backgroundManager.js")
      renderFn = renderLocalBackgrounds
      break
    case "userColor":
      key = "userColors"
      const { renderUserColors } =
        await import("./settings/backgroundManager.js")
      renderFn = renderUserColors
      break
    case "userAccentColor":
      key = "userAccentColors"
      const { renderUserAccentColors } =
        await import("./settings/backgroundManager.js")
      renderFn = renderUserAccentColors
      break
    case "userGradient":
      key = "userGradients"
      const { renderUserGradients } =
        await import("./settings/gradientManager.js")
      renderFn = renderUserGradients
      break
    case "userMultiColor":
      key = "userGradients"
      const { renderSavedMultiColors } =
        await import("./settings/multiColorManager.js")
      renderFn = renderSavedMultiColors
      break
    case "userSvgWave":
      key = "userSvgWaves"
      const { renderUserSvgWaves } =
        await import("./settings/svgWaveManager.js")
      renderFn = renderUserSvgWaves
      break
    case "userFont":
      key = "userSavedFonts"
      const { renderFontGrid } = await import("./settings/fontManager.js")
      renderFn = (DOM) => {
        renderFontGrid(DOM.fontGrid, (k, v) => {
          updateSetting(k, v)
          saveSettings()
        })
      }
      break
    case "predefinedFont":
      const label = contextMenuTargetId // font label
      const savedFonts = settings.userSavedFonts || []
      const foundIndex = savedFonts.findIndex(
        (f) => (typeof f === "string" ? f : f.label) === label,
      )

      if (foundIndex === -1) {
        // Add as favorite
        savedFonts.push({ label: label, isFavorite: true })
      } else {
        // Toggle favorite
        if (typeof savedFonts[foundIndex] === "string") {
          savedFonts[foundIndex] = {
            label: savedFonts[foundIndex],
            isFavorite: true,
          }
        } else {
          savedFonts[foundIndex].isFavorite = !savedFonts[foundIndex].isFavorite
        }
      }
      updateSetting("userSavedFonts", savedFonts)
      saveSettings()
      const { renderFontGrid: rg } = await import("./settings/fontManager.js")
      const fGrid = document.getElementById("font-grid")
      if (fGrid)
        rg(fGrid, (k, v) => {
          updateSetting(k, v)
          saveSettings()
        })
      hideContextMenu()
      return // Already handled
    case "effect":
      const effectId = contextMenuTargetId // id contains effect data-value
      let favoriteEffects = settings.favoriteEffects || []
      const favIndex = favoriteEffects.indexOf(effectId)
      if (favIndex > -1) {
        favoriteEffects.splice(favIndex, 1)
      } else {
        favoriteEffects.push(effectId)
      }
      updateSetting("favoriteEffects", favoriteEffects)
      saveSettings()

      // Dispatch custom event to notify UI to update favorite icons if any
      window.dispatchEvent(
        new CustomEvent("effectFavoriteChanged", { detail: { effectId } }),
      )
      hideContextMenu()
      return // Already handled
  }

  if (key && settings[key] && index > -1 && settings[key][index]) {
    const currentBg = settings.background
    let item = settings[key].splice(index, 1)[0]

    // Normalize to object if it's a string
    if (typeof item === "string") {
      const val = item
      item = { id: val, isFavorite: false }
      if (key === "userSavedFonts") item.label = val
      else if (key !== "userBackgrounds") item.val = val
    }

    // Toggle favorite
    item.isFavorite = !item.isFavorite

    // Move to top if favorited, otherwise to bottom
    if (item.isFavorite) {
      settings[key].unshift(item)
    } else {
      settings[key].push(item)
    }

    // Safety: ensure background setting is NOT corrupted by object
    if (
      key === "userBackgrounds" &&
      typeof settings.background === "object" &&
      settings.background !== null
    ) {
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
    await contextMenuCallbacks.onEdit()
    hideContextMenu()
    return
  }

  if (contextMenuTargetType === "bookmark") {
    if (contextMenuTargetIndex > -1) {
      const anchor =
        contextMenuCallbacks?.anchor ||
        document.querySelector(
          `[data-index="${contextMenuTargetIndex}"].bookmark`,
        )
      openBookmarkEditPopover(contextMenuTargetIndex, null, anchor)
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
        const snapshot = captureBookmarkSnapshot()
        group.name = newName.trim()
        saveBookmarks()
        renderBookmarks()
        showBookmarkUndo(
          i18n.bookmark_group_renamed || "Group renamed",
          snapshot,
        )
      }
    }
  }

  hideContextMenu()
}

async function handleDelete() {
  const i18n = geti18n()

  if (contextMenuCallbacks && contextMenuCallbacks.onDelete) {
    await contextMenuCallbacks.onDelete()
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
      const snapshot = captureBookmarkSnapshot()
      bookmarks.splice(contextMenuTargetIndex, 1)
      setBookmarks(bookmarks)
      saveBookmarks()
      renderBookmarks()
      showBookmarkUndo(i18n.bookmark_deleted || "Bookmark deleted", snapshot)
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
        const snapshot = captureBookmarkSnapshot()
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
        showBookmarkUndo(
          i18n.bookmark_group_deleted || "Group deleted",
          snapshot,
        )
      }
    }
  } else if (
    [
      "localBg",
      "userColor",
      "userAccentColor",
      "userGradient",
      "userMultiColor",
      "userSvgWave",
      "userFont",
    ].includes(contextMenuTargetType)
  ) {
    if (
      await showConfirm(
        i18n.alert_delete_bg_confirm || "Are you sure you want to delete this?",
      )
    ) {
      const settings = getSettings()
      let key = ""
      let renderFn = null
      const type = contextMenuTargetType
      const index = contextMenuTargetIndex

      switch (type) {
        case "localBg":
          key = "userBackgrounds"
          const { renderLocalBackgrounds } =
            await import("./settings/backgroundManager.js")
          renderFn = renderLocalBackgrounds
          break
        case "userColor":
          key = "userColors"
          const { renderUserColors } =
            await import("./settings/backgroundManager.js")
          renderFn = renderUserColors
          break
        case "userAccentColor":
          key = "userAccentColors"
          const { renderUserAccentColors } =
            await import("./settings/backgroundManager.js")
          renderFn = renderUserAccentColors
          break
        case "userGradient":
          key = "userGradients"
          const { renderUserGradients } =
            await import("./settings/gradientManager.js")
          renderFn = renderUserGradients
          break
        case "userMultiColor":
          key = "userGradients"
          const { renderSavedMultiColors } =
            await import("./settings/multiColorManager.js")
          renderFn = renderSavedMultiColors
          break
        case "userSvgWave":
          key = "userSvgWaves"
          const { renderUserSvgWaves } =
            await import("./settings/svgWaveManager.js")
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
        const itemId =
          typeof item === "object" ? item.id || item.val || item.label : item

        if (
          key === "userSavedFonts" &&
          item &&
          item.isLocalFile &&
          item.fileId
        ) {
          const { deleteImage } = await import("../services/imageStore.js")
          await deleteImage(item.fileId)
        }

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
  const settings = getSettings()

  if (contextMenuTargetType === "search") {
    const lockedWidgets = { ...(settings.lockedWidgets || {}) }
    const isLocked = lockedWidgets["searchBar"]
    lockedWidgets["searchBar"] = !isLocked

    if (window.appHandleSettingUpdate) {
      window.appHandleSettingUpdate("lockedWidgets", lockedWidgets)
    } else {
      updateSetting("lockedWidgets", lockedWidgets)
      saveSettings()
    }

    const widget = document.getElementById("search-container")
    if (widget) {
      if (!isLocked) {
        widget.classList.add("is-locked")
      } else {
        widget.classList.remove("is-locked")
      }
    }
    hideContextMenu()
    return
  }

  if (contextMenuTargetType === "widget" && contextMenuTargetId) {
    if (
      contextMenuTargetId === "custom-title" ||
      contextMenuTargetId === "customTitle"
    ) {
      const lockedWidgets = { ...(settings.lockedWidgets || {}) }
      const isLocked = lockedWidgets["customTitle"]
      lockedWidgets["customTitle"] = !isLocked

      if (window.appHandleSettingUpdate) {
        window.appHandleSettingUpdate("lockedWidgets", lockedWidgets)
      } else {
        updateSetting("lockedWidgets", lockedWidgets)
        saveSettings()
      }
      hideContextMenu()
      return
    }

    const lockedWidgets = { ...(settings.lockedWidgets || {}) }
    const isLocked = lockedWidgets[contextMenuTargetId]

    lockedWidgets[contextMenuTargetId] = !isLocked

    if (window.appHandleSettingUpdate) {
      window.appHandleSettingUpdate("lockedWidgets", lockedWidgets)
    } else {
      updateSetting("lockedWidgets", lockedWidgets)
      saveSettings()
    }

    // Optionally update UI for visual feedback
    const widgetIdMap = {
      clock: "clock-date-wrap",
      calendar: "full-calendar-container",
      weather: "weather-container",
      todo: "todo-container",
      timer: "timer-component",
      music: "music-player-container",
      notepad: "notepad-container",
      "daily-quotes": "daily-quotes",
      rss: "rss-container",
      habitTracker: "habit-tracker-container",
      ambientSounds: "ambient-sounds-container",
      aiAssistant: "ai-assistant-container",
      searchBar: "search-container",
      customTitle: "custom-title-display",
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
  menuSelect?.addEventListener("click", (e) => {
    e.stopPropagation()
    if (contextMenuCallbacks && contextMenuCallbacks.onSelect) {
      contextMenuCallbacks.onSelect()
    } else if (
      contextMenuTargetType === "bookmark" ||
      contextMenuTargetType === "bookmarkStack"
    ) {
      toggleSelectionMode(contextMenuTargetIndex)
    }
    hideContextMenu()
  })

  menuEdit?.addEventListener("click", (e) => {
    e.stopPropagation()
    handleEdit()
  })

  menuDelete?.addEventListener("click", (e) => {
    e.stopPropagation()
    handleDelete()
  })

  menuFavorite?.addEventListener("click", (e) => {
    e.stopPropagation()
    handleFavorite()
  })

  menuLock?.addEventListener("click", (e) => {
    e.stopPropagation()
    handleLock()
  })

  if (menuMove) {
    menuMove.addEventListener("click", (e) => {
      e.stopPropagation()
      if (contextMenuCallbacks && contextMenuCallbacks.onMoveFont) {
        contextMenuCallbacks.onMoveFont()
      }
      hideContextMenu()
    })
  }

  window.addEventListener("click", (e) => {
    if (
      !contextMenu?.contains(e.target) &&
      !e.target.closest?.(".quick-access-popup")
    ) {
      hideContextMenu()
    }
  })

  contextMenu?.addEventListener("mouseover", handleContextMenuMouseOver)
  contextMenu?.addEventListener("mouseout", handleContextMenuMouseOut)
  contextMenu?.addEventListener("click", () => {
    hideContextMenuDetailToast()
  })

  window.addEventListener("scroll", hideContextMenuDetailToast, { passive: true })
  window.addEventListener("resize", hideContextMenuDetailToast, { passive: true })
}
