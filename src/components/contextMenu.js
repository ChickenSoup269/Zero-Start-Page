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

function createCustomMenuItem(label, iconClass, handler, extraClass = "") {
  const item = document.createElement("div")
  item.className = `context-menu-item custom-music-item ${extraClass}`.trim()
  item.innerHTML = `<i class="${iconClass}"></i> <span>${label}</span>`
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
  const sidebarContent = sidebar?.querySelector(".sidebar-content")
  const section = document.querySelector(`[data-section-id="${sectionId}"]`)
  if (!sidebar || !section) return

  sidebar.classList.add("open")
  section.classList.remove("collapsed")

  const sectionStates = JSON.parse(
    localStorage.getItem("settingsSectionStates") || "{}",
  )
  sectionStates[sectionId] = false
  localStorage.setItem("settingsSectionStates", JSON.stringify(sectionStates))

  requestAnimationFrame(() => {
    const targetElement =
      (targetSelector ? section.querySelector(targetSelector) : null) ||
      section.querySelector(".section-toggle") ||
      section
    const target =
      targetElement.closest?.(
        ".setting-item-row, .setting-item, .setting-group, .settings-section",
      ) || targetElement
    const sidebarRect = sidebarContent?.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    if (!sidebarContent || !sidebarRect) return
    sidebarContent.scrollTo({
      top: targetRect.top - sidebarRect.top + sidebarContent.scrollTop - 12,
      behavior: "smooth",
    })
    target.classList.add("settings-scroll-highlight")
    window.setTimeout(() => {
      target.classList.remove("settings-scroll-highlight")
    }, 1300)
  })
}

function getWidgetSettingsTarget(id) {
  const targets = {
    search: {
      section: "layout",
      target: "#show-search-bar-checkbox",
      labelKey: "settings_group_search",
      fallback: "Search Bar",
    },
    clock: {
      section: "date-clock",
      target: "#clock-style-setting-group",
      labelKey: "settings_date_format",
      fallback: "Clock",
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
  }
  return targets[id] || null
}

function addOpenWidgetSettingsItem(id, i18n, withDivider = true) {
  const target = getWidgetSettingsTarget(id)
  if (!target) return

  const widgetName = i18n[target.labelKey] || target.fallback
  const template = i18n.context_open_widget_settings || "Settings: {name}"
  const settingsBtn = createCustomMenuItem(
    template.replace("{name}", widgetName),
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
  const toggleBtn = createCustomMenuItem(
    isHidden
      ? i18n.context_timer_show_alarm_sound || "Show alarm sound selector"
      : i18n.context_timer_hide_alarm_sound || "Hide alarm sound selector",
    isHidden ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark",
    () => {
      const nextValue = !isHidden
      const checkbox = document.getElementById(
        "hide-timer-alarm-dropdown-checkbox",
      )
      if (checkbox) checkbox.checked = nextValue
      applyContextSetting("hideTimerAlarmDropdown", nextValue)
      hideContextMenu()
    },
  )
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

function openExternalUrl(url) {
  if (window.chrome?.tabs?.create) {
    window.chrome.tabs.create({ url })
    return
  }
  window.open(url, "_blank", "noopener,noreferrer")
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
    createCustomMenuItem(
      `${i18n.bg_context_fit || "Fit"}: ${fitLabels[nextFit]}`,
      "fa-solid fa-up-right-and-down-left-from-center",
      () => {
        syncBackgroundControlValue("bgSize", nextFit)
        applyContextSetting("bgSize", nextFit)
        hideContextMenu()
      },
    ),
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
    createCustomMenuItem(
      i18n.bg_context_add_bookmark || "Add bookmark",
      "fa-solid fa-bookmark",
      () => {
        const bookmarks = getBookmarks()
        const settings = getSettings()
        if (settings.bookmarkLimit20 !== false && bookmarks.length >= 20) {
          showAlert(
            i18n.alert_bookmark_limit_reached ||
              "This group already has 20 bookmarks!",
          )
          hideContextMenu()
          return
        }
        hideContextMenu()
        openModal(null)
      },
    ),
    createCustomMenuItem(
      i18n.context_open_bookmark_settings || "Bookmark settings",
      "fa-solid fa-sliders",
      () => {
        hideContextMenu()
        openSettingsSection("bookmark-custom", "#bookmark-font-size-input")
      },
      "context-settings-item",
    ),
    createCustomMenuItem(
      i18n.bg_context_open_google || "Open regular Google",
      "fa-brands fa-google",
      () => {
        hideContextMenu()
        openExternalUrl("https://www.google.com/webhp")
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

  const applyBtn = createCustomMenuItem(
    isActiveEffect
      ? i18n.effect_context_turn_off || "Turn off effect"
      : (i18n.effect_context_apply || "Apply: {name}").replace(
          "{name}",
          effectName,
        ),
    isActiveEffect ? "fa-solid fa-ban" : "fa-solid fa-wand-magic-sparkles",
    () => {
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
  )

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
      return bookmark?.title || bookmark?.url || i18n.context_header_bookmark || "Bookmark"
    }
    case "bookmarkStack": {
      const bookmarks = getBookmarks()
      const bookmark = bookmarks[index]
      return bookmark?.title || bookmark?.name || i18n.context_header_bookmark_stack || "Bookmark Stack"
    }
    case "bookmarkStackItem": {
      if (id && id.includes(":")) {
        const [stackIndex, itemIndex] = id.split(":").map(Number)
        const bookmarks = getBookmarks()
        const stack = bookmarks[stackIndex]
        if (stack && stack.items) {
          const item = stack.items[itemIndex]
          if (item) {
            return item.title || item.url || i18n.context_header_bookmark || "Bookmark"
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
      if (widgetId === "timer") return i18n.context_header_widget_timer || "Timer"
      if (widgetId === "clock") return i18n.context_header_widget_clock || "Clock"
      if (widgetId === "search") return i18n.context_header_widget_search || "Search Bar"
      if (widgetId === "weather") return i18n.context_header_widget_weather || "Weather"
      if (widgetId === "music") return i18n.context_header_widget_music || "Music Player"
      if (widgetId === "notepad") return i18n.context_header_widget_notepad || "Notepad"
      if (widgetId === "calendar") return i18n.context_header_widget_calendar || "Calendar"
      if (widgetId === "daily-quotes") return i18n.context_header_widget_quotes || "Daily Quotes"
      if (widgetId === "rss") return i18n.context_header_widget_rss || "RSS Reader"
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
  contextMenuTargetIndex = index
  contextMenuTargetType = type
  contextMenuTargetId = id
  contextMenuCallbacks = callbacks
  lastContextMenuX = x || 0
  lastContextMenuY = y || 0

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
    addOpenBookmarkSettingsItem(i18n)
  }

  if (type === "search") {
    menuEdit.style.display = "none"
    menuDelete.style.display = "none"
    menuLock.style.display = "none"
    menuFavorite.style.display = "none"
    menuSelect.style.display = "none"
    addOpenWidgetSettingsItem("search", i18n, false)
  } else if (type === "widget") {
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

    addOpenWidgetSettingsItem(id, i18n)

    // THÊM TÙY CHỌN SKIN CHO CÁC WIDGET
    const skinnableWidgets = [
      "todo",
      "timer",
      "calendar",
      "weather",
      "notepad",
      "daily-quotes",
      "rss",
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

      const skinBtn = document.createElement("div")
      skinBtn.className = "context-menu-item custom-music-item"
      skinBtn.innerHTML = `<i class="fa-solid fa-circle-half-stroke"></i> <span>${isWhiteBlur ? i18n.skin_default || "Default Skin" : i18n.skin_white_blur || "White Blur Skin"}</span>`
      skinBtn.onclick = () => {
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
      }
      contextMenu.insertBefore(skinBtn, menuLock)

      const m3SkinBtn = document.createElement("div")
      m3SkinBtn.className = "context-menu-item custom-music-item"
      m3SkinBtn.innerHTML = `<i class="fa-solid fa-palette"></i> <span>${isM3Accent ? i18n.skin_default || "Default Skin" : i18n.skin_m3_accent || "M3 Accent Skin"}</span>`
      m3SkinBtn.onclick = () => {
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
      }
      contextMenu.insertBefore(m3SkinBtn, menuLock)

      const lightTransBtn = document.createElement("div")
      lightTransBtn.className = "context-menu-item custom-music-item"
      lightTransBtn.innerHTML = `<i class="fa-solid fa-droplet"></i> <span>${isLightTransparent ? i18n.skin_default || "Default Skin" : i18n.skin_light_transparent || "Light Transparent"}</span>`
      lightTransBtn.onclick = () => {
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
      }
      contextMenu.insertBefore(lightTransBtn, menuLock)

      if (id === "daily-quotes" || id === "weather" || id === "rss") {
        const transBtn = document.createElement("div")
        transBtn.className = "context-menu-item custom-music-item"
        transBtn.innerHTML = `<i class="fa-solid fa-ghost"></i> <span>${isTransparent ? i18n.skin_default || "Default Skin" : i18n.skin_transparent || "Transparent Skin"}</span>`
        transBtn.onclick = () => {
          const newVal = isTransparent ? "default" : "transparent"
          updateSetting(skinKey, newVal)
          saveSettings(true)

          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: skinKey, value: newVal },
            }),
          )

          const widgetIdMap = {
            weather: "weather-container",
            "daily-quotes": "daily-quotes",
            rss: "rss-container",
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
        }
        contextMenu.insertBefore(transBtn, menuLock)
      }

      const separator = document.createElement("div")
      separator.className = "context-menu-divider custom-music-item"
      contextMenu.insertBefore(separator, menuLock)

      if (["todo", "timer"].includes(id)) {
        const settingKey = `${id}Mini`
        const isMini = settings[settingKey] === true
        const miniBtn = document.createElement("div")
        miniBtn.className = "context-menu-item custom-music-item"
        
        const labels = {
          todo: { mini: i18n.todo_mini_size || "Mini Todo", normal: i18n.todo_normal_size || "Normal Todo" },
          timer: { mini: i18n.timer_mini_size || "Mini Timer", normal: i18n.timer_normal_size || "Normal Timer" }
        }
        
        miniBtn.innerHTML = `<i class="fa-solid ${isMini ? "fa-up-right-and-down-left-from-center" : "fa-down-left-and-up-right-to-center"}"></i> <span>${isMini ? labels[id].normal : labels[id].mini}</span>`
        miniBtn.onclick = () => {
          const widgetIdMap = {
            todo: "todo-container",
            timer: "timer-component",
            music: "music-player-container"
          }
          const el = document.getElementById(widgetIdMap[id])

          const newVal = !isMini
          updateSetting(settingKey, newVal)
          saveSettings(true)
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: settingKey, value: newVal },
            })
          )
          
          if (el) {
            el.classList.toggle(`${id}-mini`, newVal)
          }
          hideContextMenu()
        }
        contextMenu.insertBefore(miniBtn, menuLock)
      }

      if (id === "weather" || id === "rss") {
        const isMini = settings[`${id}Mini`] === true
        const isExpanded = settings[`${id}Expanded`] === true && !isMini
        const miniBtn = document.createElement("div")
        miniBtn.className = "context-menu-item custom-music-item"
        
        const labels = {
          weather: { mini: i18n.weather_mini_size || "Mini Weather", normal: i18n.weather_normal_size || "Normal Weather", expand: i18n.weather_expand || "Enlarge Weather", collapse: i18n.weather_collapse || "Shrink Weather" },
          rss: { mini: "Thu nhỏ RSS", normal: "Kích thước mặc định", expand: "Phóng to RSS", collapse: "Thu nhỏ lại" }
        }
        
        miniBtn.innerHTML = `<i class="fa-solid ${isMini ? "fa-compress" : "fa-compress-arrows-alt"}"></i> <span>${isMini ? labels[id].normal : labels[id].mini}</span>`
        miniBtn.onclick = () => {
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
            rss: "rss-container"
          }
          const el = document.getElementById(widgetIdMap[id])
          if (el) {
            el.classList.toggle(`${id}-mini`, newVal)
            el.classList.toggle(`${id}-expanded`, false)
          }
          hideContextMenu()
        }
        contextMenu.insertBefore(miniBtn, menuLock)

        const expandBtn = document.createElement("div")
        expandBtn.className = "context-menu-item custom-music-item"
        expandBtn.innerHTML = `<i class="fa-solid ${isExpanded ? "fa-down-left-and-up-right-to-center" : "fa-up-right-and-down-left-from-center"}"></i> <span>${isExpanded ? labels[id].collapse : labels[id].expand}</span>`
        expandBtn.onclick = () => {
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
            rss: "rss-container"
          }
          const el = document.getElementById(widgetIdMap[id])
          if (el) {
            el.classList.toggle(`${id}-mini`, false)
            el.classList.toggle(`${id}-expanded`, newVal)
          }
          hideContextMenu()
        }
        contextMenu.insertBefore(expandBtn, menuLock)

        if (id === "weather") {
          const isFahrenheit = settings.weatherUnit === "fahrenheit"
          const unitBtn = document.createElement("div")
          unitBtn.className = "context-menu-item custom-music-item"
          unitBtn.innerHTML = `<i class="fa-solid fa-temperature-half"></i> <span>${isFahrenheit ? i18n.weather_unit_celsius || "Chuyển sang °C" : i18n.weather_unit_fahrenheit || "Chuyển sang °F"}</span>`
          unitBtn.onclick = () => {
            const newVal = isFahrenheit ? "celsius" : "fahrenheit"
            updateSetting("weatherUnit", newVal)
            saveSettings(true)
            window.dispatchEvent(
              new CustomEvent("layoutUpdated", {
                detail: { key: "weatherUnit", value: newVal },
              }),
            )
            hideContextMenu()
          }
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

        const sourceBtn = document.createElement("div")
        sourceBtn.className = "context-menu-item custom-music-item"
        sourceBtn.innerHTML = `<i class="fa-solid ${showSourceSwitcher ? "fa-eye-slash" : "fa-eye"}"></i> <span>${showSourceSwitcher ? i18n.calendar_hide_source_tabs || "Hide Calendar Source" : i18n.calendar_show_source_tabs || "Show Calendar Source"}</span>`
        sourceBtn.onclick = () => {
          const newVal = !showSourceSwitcher
          updateSetting("calendarShowSourceSwitcher", newVal)
          saveSettings(true)
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: "calendarShowSourceSwitcher", value: newVal },
            }),
          )
          hideContextMenu()
        }
        contextMenu.insertBefore(sourceBtn, menuLock)

        const miniBtn = document.createElement("div")
        miniBtn.className = "context-menu-item custom-music-item"
        miniBtn.innerHTML = `<i class="fa-solid ${calendarSize === "mini" ? "fa-up-right-and-down-left-from-center" : "fa-down-left-and-up-right-to-center"}"></i> <span>${calendarSize === "mini" ? i18n.calendar_normal_size || "Normal Calendar" : i18n.calendar_mini_size || "Mini Calendar"}</span>`
        miniBtn.onclick = () => {
          const newVal = calendarSize === "mini" ? "normal" : "mini"
          updateSetting("calendarSize", newVal)
          saveSettings(true)
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: "calendarSize", value: newVal },
            }),
          )
          hideContextMenu()
        }
        contextMenu.insertBefore(miniBtn, menuLock)

        const expandBtn = document.createElement("div")
        expandBtn.className = "context-menu-item custom-music-item"
        expandBtn.innerHTML = `<i class="fa-solid ${calendarSize === "expanded" ? "fa-down-left-and-up-right-to-center" : "fa-up-right-and-down-left-from-center"}"></i> <span>${calendarSize === "expanded" ? i18n.calendar_normal_size || "Normal Calendar" : i18n.calendar_expand_size || "Enlarge Calendar"}</span>`
        expandBtn.onclick = () => {
          const newVal = calendarSize === "expanded" ? "normal" : "expanded"
          updateSetting("calendarSize", newVal)
          saveSettings(true)
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: "calendarSize", value: newVal },
            }),
          )
          hideContextMenu()
        }
        contextMenu.insertBefore(expandBtn, menuLock)
      }

      const borderBtn = document.createElement("div")
      borderBtn.className = "context-menu-item custom-music-item"
      borderBtn.innerHTML = `<i class="${isBorderHidden ? "fa-regular fa-square" : "fa-solid fa-border-all"}"></i> <span>${isBorderHidden ? i18n.menu_show_border || "Show Border" : i18n.menu_hide_border || "Hide Border"}</span>`
      borderBtn.onclick = () => {
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
        }
        const el = document.getElementById(widgetIdMap[id] || id)
        if (el) {
          el.classList.toggle("widget-border-hidden", newVal)
        }
        hideContextMenu()
      }
      contextMenu.insertBefore(borderBtn, menuLock)

      if (id === "timer") {
        addTimerAlarmDropdownToggle(i18n, settings, borderBtn)
      }
    }

    // THÊM TÙY CHỌN RIÊNG CHO MUSIC PLAYER
    if (id === "music") {
      const musicStyle = settings.music_bar_style || settings.musicBarStyle
      const itemsToInsert = []

      // --- 1. Skins & Appearance Options ---
      
      // M3 Accent Skin
      const isM3Accent = settings.musicPlayerSkin === "m3-accent"
      const m3SkinBtn = document.createElement("div")
      m3SkinBtn.className = "context-menu-item custom-music-item"
      m3SkinBtn.innerHTML = `<i class="fa-solid fa-palette"></i> <span>${isM3Accent ? i18n.music_player_skin_default || "Default Skin" : i18n.skin_m3_accent || "M3 Accent Skin"}</span>`
      m3SkinBtn.onclick = () => {
        const newSkin = isM3Accent ? "default" : "m3-accent"
        updateSetting("musicPlayerSkin", newSkin)
        saveSettings()
        window.dispatchEvent(
          new CustomEvent("settingsUpdated", {
            detail: { key: "musicPlayerSkin", value: newSkin },
          }),
        )
        hideContextMenu()
      }
      itemsToInsert.push(m3SkinBtn)

      // Transparent Skin
      const isTransparent = settings.musicPlayerSkin === "transparent"
      const transparentBtn = document.createElement("div")
      transparentBtn.className = "context-menu-item custom-music-item"
      transparentBtn.innerHTML = `<i class="fa-solid fa-ghost"></i> <span>${isTransparent ? i18n.music_player_skin_default || "Default Skin" : i18n.skin_transparent || "Transparent Skin"}</span>`
      transparentBtn.onclick = () => {
        const newSkin = isTransparent ? "default" : "transparent"
        updateSetting("musicPlayerSkin", newSkin)
        saveSettings()
        window.dispatchEvent(
          new CustomEvent("settingsUpdated", {
            detail: { key: "musicPlayerSkin", value: newSkin },
          }),
        )
        hideContextMenu()
      }
      itemsToInsert.push(transparentBtn)

      // Light Transparent Skin
      const isLightTransparent = settings.musicPlayerSkin === "light-transparent"
      const lightTransparentBtn = document.createElement("div")
      lightTransparentBtn.className = "context-menu-item custom-music-item"
      lightTransparentBtn.innerHTML = `<i class="fa-solid fa-droplet"></i> <span>${isLightTransparent ? i18n.music_player_skin_default || "Default Skin" : i18n.skin_light_transparent || "Light Transparent"}</span>`
      lightTransparentBtn.onclick = () => {
        const newSkin = isLightTransparent ? "default" : "light-transparent"
        updateSetting("musicPlayerSkin", newSkin)
        saveSettings()
        window.dispatchEvent(
          new CustomEvent("settingsUpdated", {
            detail: { key: "musicPlayerSkin", value: newSkin },
          }),
        )
        hideContextMenu()
      }
      itemsToInsert.push(lightTransparentBtn)

      // Heartbeat specific / General style specific skins
      if (musicStyle === "heartbeat") {
        // GameBoy Skin
        const isGameBoy = settings.musicPlayerSkin === "gameboy"
        const gameboyBtn = document.createElement("div")
        gameboyBtn.className = "context-menu-item custom-music-item"
        gameboyBtn.innerHTML = `<i class="${isGameBoy ? "fa-solid fa-mobile-screen-button" : "fa-solid fa-gamepad"}"></i> <span>${isGameBoy ? i18n.music_player_skin_modern || "Giao diện Hiện đại" : i18n.music_player_skin_gameboy || "Giao diện GameBoy"}</span>`
        gameboyBtn.onclick = () => {
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
        itemsToInsert.push(gameboyBtn)

        // White Blur Skin for Heartbeat
        const isWhiteBlur = settings.musicPlayerSkin === "white-blur"
        const whiteSkinBtn = document.createElement("div")
        whiteSkinBtn.className = "context-menu-item custom-music-item"
        whiteSkinBtn.innerHTML = `<i class="fa-solid fa-circle-half-stroke"></i> <span>${isWhiteBlur ? i18n.music_player_skin_default || "Default Skin" : i18n.music_player_skin_white_blur || "White Blur Skin"}</span>`
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
        itemsToInsert.push(whiteSkinBtn)
      } else {
        // White Blur Skin for other styles
        const isWhiteBlur = settings.musicPlayerSkin === "white-blur"
        const whiteSkinBtn = document.createElement("div")
        whiteSkinBtn.className = "context-menu-item custom-music-item"
        whiteSkinBtn.innerHTML = `<i class="fa-solid fa-circle-half-stroke"></i> <span>${isWhiteBlur ? i18n.music_player_skin_default || "Default Skin" : i18n.music_player_skin_white_blur || "White Blur Skin"}</span>`
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
        itemsToInsert.push(whiteSkinBtn)
      }

      // --- 2. Divider ---
      const div1 = document.createElement("div")
      div1.className = "context-menu-divider custom-music-item"
      itemsToInsert.push(div1)

      // --- 3. Shaking & Colors (Grouped together) ---

      // Shaking Animation Toggler ("Bật bồng bềnh")
      const isNoShaking = settings.musicPlayerNoShaking
      const shakeBtn = document.createElement("div")
      shakeBtn.className = "context-menu-item custom-music-item"
      shakeBtn.innerHTML = `<i class="${isNoShaking ? "fa-solid fa-wand-magic-sparkles" : "fa-solid fa-anchor"}"></i> <span>${isNoShaking ? i18n.music_player_shaking_on || "Bật bồng bềnh" : i18n.music_player_no_shaking || "Tắt bồng bềnh"}</span>`
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
      itemsToInsert.push(shakeBtn)

      // Default Color Toggler ("Bật màu nhạc mặc định")
      const usesDefaultColor = settings.musicPlayerUseDefaultColor === true
      const defaultColorBtn = document.createElement("div")
      defaultColorBtn.className = "context-menu-item custom-music-item"
      defaultColorBtn.innerHTML = `<i class="fa-solid fa-fill-drip"></i> <span>${usesDefaultColor ? i18n.music_player_default_color_off || "Tắt màu mặc định" : i18n.music_player_default_color_on || "Bật màu nhạc mặc định"}</span>`
      defaultColorBtn.onclick = () => {
        const newVal = !usesDefaultColor
        updateSetting("musicPlayerUseDefaultColor", newVal)
        saveSettings()
        window.dispatchEvent(
          new CustomEvent("settingsUpdated", {
            detail: { key: "musicPlayerUseDefaultColor", value: newVal },
          }),
        )
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: "musicPlayerUseDefaultColor", value: newVal },
          }),
        )
        hideContextMenu()
      }
      itemsToInsert.push(defaultColorBtn)

      // Source Icon Color Mode ("Icon nguồn")
      const sourceIconModes = ["brand", "accent", "none"]
      const currentIconMode = settings.musicSourceIconColorMode || "brand"
      const nextIconMode =
        sourceIconModes[
          (sourceIconModes.indexOf(currentIconMode) + 1) %
            sourceIconModes.length
        ]
      const sourceIconModeLabels = {
        brand: i18n.music_source_icon_brand || "Màu thương hiệu",
        accent: i18n.music_source_icon_accent || "Màu accent",
        none: i18n.music_source_icon_none || "Không màu",
      }
      const sourceIconBtn = document.createElement("div")
      sourceIconBtn.className = "context-menu-item custom-music-item"
      sourceIconBtn.innerHTML = `<i class="fa-solid fa-icons"></i> <span>${i18n.music_source_icon_context || "Icon nguồn"}: ${sourceIconModeLabels[nextIconMode]}</span>`
      sourceIconBtn.onclick = () => {
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
      }
      itemsToInsert.push(sourceIconBtn)

      // CPU Saving Mode Toggler ("Chế độ sóng nhạc: Tiết kiệm CPU / Mặc định")
      const isCpuSave = settings.musicVisualizerCpuSave !== false
      const cpuSaveBtn = document.createElement("div")
      cpuSaveBtn.className = "context-menu-item custom-music-item"
      cpuSaveBtn.innerHTML = `<i class="fa-solid ${isCpuSave ? "fa-bolt" : "fa-leaf"}"></i> <span>${isCpuSave ? i18n.music_visualizer_mode_default || "Sóng nhạc: Mặc định" : i18n.music_visualizer_mode_cpusave || "Sóng nhạc: Tiết kiệm CPU"}</span>`
      cpuSaveBtn.onclick = () => {
        const newVal = !isCpuSave
        updateSetting("musicVisualizerCpuSave", newVal)
        saveSettings()
        window.dispatchEvent(
          new CustomEvent("settingsUpdated", {
            detail: { key: "musicVisualizerCpuSave", value: newVal },
          }),
        )
        hideContextMenu()
      }
      itemsToInsert.push(cpuSaveBtn)

      // --- 4. Divider ---
      const div2 = document.createElement("div")
      div2.className = "context-menu-divider custom-music-item"
      itemsToInsert.push(div2)

      // --- 5. Layout options ---

      // Mini Mode Toggler
      const isMini = settings.musicMini === true
      const miniBtn = document.createElement("div")
      miniBtn.className = "context-menu-item custom-music-item"
      miniBtn.innerHTML = `<i class="fa-solid ${isMini ? "fa-up-right-and-down-left-from-center" : "fa-down-left-and-up-right-to-center"}"></i> <span>${isMini ? i18n.music_normal_size || "Normal Music" : i18n.music_mini_size || "Mini Music"}</span>`
      miniBtn.onclick = () => {
        const el = document.getElementById("music-player-container")
        const newVal = !isMini
        updateSetting("musicMini", newVal)
        saveSettings(true)
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: "musicMini", value: newVal },
          })
        )
        if (el) {
          el.classList.toggle("music-mini", newVal)
        }
        hideContextMenu()
      }
      itemsToInsert.push(miniBtn)

      // Border Toggler
      const isMusicBorderHidden = settings.musicPlayerHideBorder === true
      const musicBorderBtn = document.createElement("div")
      musicBorderBtn.className = "context-menu-item custom-music-item"
      musicBorderBtn.innerHTML = `<i class="${isMusicBorderHidden ? "fa-regular fa-square" : "fa-solid fa-border-all"}"></i> <span>${isMusicBorderHidden ? i18n.menu_show_border || "Show Border" : i18n.menu_hide_border || "Hide Border"}</span>`
      musicBorderBtn.onclick = () => {
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
      }
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
          value: "m3-accent",
          label: i18n.skin_m3_accent || "M3 Accent",
          icon: "fa-solid fa-palette",
        },
        {
          value: "light-transparent",
          label: i18n.skin_light_transparent || "Light Transparent",
          icon: "fa-solid fa-droplet",
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
            "quick-access-light-transparent",
            skin.value === "light-transparent",
          )
          document.body.classList.toggle("quick-access-transparent", false)
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
        const targetType = callbacks.fontCategoryType === "clock" ? (i18n.settings_font || "General") : (i18n.clock || "Clock")
        const span = menuMove.querySelector("span")
        if (span) span.textContent = `${i18n.menu_move_font || "Move to"} ${targetType}`
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
      const targetType = callbacks.fontCategoryType === "clock" ? (i18n.settings_font || "General") : (i18n.clock || "Clock")
      const span = menuMove.querySelector("span")
      if (span) span.textContent = `${i18n.menu_move_font || "Move to"} ${targetType}`
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
  contextMenu.style.display = "none"
  contextMenuTargetIndex = -1
  contextMenuTargetType = "bookmark"
  contextMenuTargetId = null
  contextMenuCallbacks = null
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

        if (key === "userSavedFonts" && item && item.isLocalFile && item.fileId) {
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
      weather: "weather-container",
      todo: "todo-container",
      timer: "timer-component",
      music: "music-player-container",
      notepad: "notepad-container",
      "daily-quotes": "daily-quotes",
      rss: "rss-container",
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
      !contextMenu.contains(e.target) &&
      !e.target.closest?.(".quick-access-popup")
    ) {
      hideContextMenu()
    }
  })
}
