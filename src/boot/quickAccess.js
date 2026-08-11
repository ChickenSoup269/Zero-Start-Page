/**
 * boot/quickAccess.js
 * Quick Access Bar: toggle buttons, collapse, drag-and-drop reordering,
 * and layout-updated reactive updates.
 */
import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import {
  showTodoCheckbox,
  showTimerCheckbox,
  showHabitsCheckbox,
  showFullCalendarCheckbox,
  showMusicCheckbox,
  clockDisplaySelect,
  showGregorianCheckbox,
  showNotepadCheckbox,
  showQuotesCheckbox,
  showWeatherCheckbox,
} from "../utils/dom.js"
import { showContextMenu } from "../components/contextMenu.js"
import { ensureSettingsInitialized } from "./lazyInit.js"
import { initWidget } from "./widgetManager.js"
import { fadeToggle } from "../utils/dom.js"

// ── Sync quick-btn active state ──────────────────────────────────────────────
const quickBtns = document.querySelectorAll(".quick-btn")

export function syncQuickButtons() {
  const settings = getSettings()
  quickBtns.forEach((btn) => {
    const type = btn.dataset.toggle
    if (!type) return
    let isActive = false
    switch (type) {
      case "todo":
        isActive = settings.showTodoList !== false
        break
      case "notepad":
        isActive = settings.showNotepad !== false
        break
      case "timer":
        isActive = settings.showTimer === true
        break
      case "calendar":
        isActive = settings.showFullCalendar === true
        break
      case "music":
        isActive = settings.musicPlayerEnabled === true
        break
      case "clock":
        isActive = settings.clockDisplayMode !== "hide"
        break
      case "gregorian":
        isActive = settings.showGregorian !== false
        break
      case "quotes":
        isActive = settings.showQuotes !== false
        break
      case "weather":
        isActive = settings.showWeather === true
        break
      case "rss":
        isActive = settings.showRss === true
        break
      case "habitTracker":
        isActive = settings.showHabits === true
        break
    }
    btn.classList.toggle("active", isActive)
  })
}

// ── Click handlers ───────────────────────────────────────────────────────────
export function setupQuickAccessClickHandlers() {
  quickBtns.forEach((btn) => {
    const type = btn.dataset.toggle
    if (!type) return

    btn.addEventListener("click", async () => {
      let key, checkbox
      switch (type) {
        case "todo":
          key = "showTodoList"
          checkbox = showTodoCheckbox
          break
        case "notepad":
          key = "showNotepad"
          checkbox = showNotepadCheckbox
          break
        case "timer":
          key = "showTimer"
          checkbox = showTimerCheckbox
          break
        case "calendar":
          key = "showFullCalendar"
          checkbox = showFullCalendarCheckbox
          break
        case "music":
          key = "musicPlayerEnabled"
          checkbox = showMusicCheckbox
          break
        case "gregorian":
          key = "showGregorian"
          checkbox = showGregorianCheckbox
          break
        case "weather":
          key = "showWeather"
          checkbox = showWeatherCheckbox
          break
        case "habitTracker":
          key = "showHabits"
          checkbox = showHabitsCheckbox
          break

        case "clock": {
          const currentMode = getSettings().clockDisplayMode || "all"
          const nextMode = currentMode === "hide" ? "all" : "hide"
          updateSetting("clockDisplayMode", nextMode)
          if (clockDisplaySelect) clockDisplaySelect.value = nextMode
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: "clockDisplayMode", value: nextMode },
            }),
          )
          break
        }
        case "quotes": {
          const nextQuotes = !(getSettings().showQuotes !== false)
          updateSetting("showQuotes", nextQuotes)
          saveSettings()
          if (showQuotesCheckbox) showQuotesCheckbox.checked = nextQuotes
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: "showQuotes", value: nextQuotes },
            }),
          )
          break
        }
        case "rss": {
          const nextRss = !(getSettings().showRss === true)
          updateSetting("showRss", nextRss)
          saveSettings()
          window.dispatchEvent(
            new CustomEvent("layoutUpdated", {
              detail: { key: "showRss", value: nextRss },
            }),
          )
          btn.classList.toggle("active", nextRss)
          break
        }
      }

      if (key && checkbox) {
        if (!window.settingsInitialized) {
          await ensureSettingsInitialized("quick-access")
        }
        if (
          (type === "todo" ||
            type === "notepad" ||
            type === "timer" ||
            type === "calendar" ||
            type === "weather" ||
            type === "habitTracker") &&
          !getSettings()[key]
        ) {
          await initWidget(type)
        }
        checkbox.click()
      }
    })
  })
}

// ── Collapse button ──────────────────────────────────────────────────────────
export function setupQuickAccessCollapse() {
  const quickAccessBar = document.querySelector(".quick-access-bar")
  const settingsToggle = document.getElementById("settings-toggle")
  const collapseBtn = document.getElementById("quick-access-collapse")
  if (!collapseBtn || !quickAccessBar) return

  const settings = getSettings()
  const normalizeRadius = (value, fallback) => {
    const match = String(value || "").match(/^(\d+(?:\.\d+)?)px$/)
    if (!match) return fallback
    const px = Math.min(20, Math.max(0, Math.round(Number(match[1]))))
    return `${px}px`
  }
  const toggleBorderVisibility = (isVisible) => {
    quickAccessBar.classList.toggle("no-border", !isVisible)
    if (settingsToggle) settingsToggle.classList.toggle("no-border", !isVisible)
  }

  // Apply quick-access border-radius tokens
  document.documentElement.style.setProperty(
    "--quick-access-btn-radius",
    normalizeRadius(settings.quickAccessBorderRadius, "5px"),
  )
  document.documentElement.style.setProperty(
    "--quick-access-bar-radius",
    normalizeRadius(settings.quickAccessBarRadius, "14px"),
  )
  document.documentElement.style.setProperty(
    "--quick-access-toggle-radius",
    normalizeRadius(settings.quickAccessToggleRadius, "20px"),
  )
  toggleBorderVisibility(settings.quickAccessBorderVisible !== false)

  window.addEventListener("layoutUpdated", (e) => {
    if (e.detail.key === "quickAccessBorderRadius")
      document.documentElement.style.setProperty(
        "--quick-access-btn-radius",
        normalizeRadius(e.detail.value, "5px"),
      )
    if (e.detail.key === "quickAccessBarRadius")
      document.documentElement.style.setProperty(
        "--quick-access-bar-radius",
        normalizeRadius(e.detail.value, "14px"),
      )
    if (e.detail.key === "quickAccessToggleRadius")
      document.documentElement.style.setProperty(
        "--quick-access-toggle-radius",
        normalizeRadius(e.detail.value, "20px"),
      )
    if (e.detail.key === "quickAccessBorderVisible")
      toggleBorderVisibility(!!e.detail.value)
  })

  if (settings.quickAccessCollapsed) quickAccessBar.classList.add("collapsed")

  collapseBtn.addEventListener("click", () => {
    const isCollapsed = quickAccessBar.classList.toggle("collapsed")
    collapseBtn.title = isCollapsed
      ? settings.language === "vi"
        ? "Mở rộng"
        : "Expand"
      : settings.language === "vi"
        ? "Thu gọn"
        : "Collapse"
    updateSetting("quickAccessCollapsed", isCollapsed)
    saveSettings()
  })
  collapseBtn.title = settings.quickAccessCollapsed
    ? settings.language === "vi"
      ? "Mở rộng"
      : "Expand"
    : settings.language === "vi"
      ? "Thu gọn"
      : "Collapse"
}

// ── Drag & Drop reorder ──────────────────────────────────────────────────────
function getAnchor(quickAccessBar) {
  const layoutControlsBtn = document.getElementById("layout-controls-btn")
  return (
    layoutControlsBtn || quickAccessBar.querySelector(".quick-access-divider")
  )
}

function setupQaDragAndDrop() {
  const quickAccessBar = document.querySelector(".quick-access-bar")
  if (!quickAccessBar) return
  const toggleBtns = Array.from(
    quickAccessBar.querySelectorAll(".quick-btn[data-toggle]"),
  )
  const allowReorder = getSettings().qaAllowReorder === true

  toggleBtns.forEach((btn) => {
    btn.draggable = allowReorder
    btn.style.cursor = allowReorder ? "grab" : "pointer"

    if (!btn._dragInitialized) {
      btn._dragInitialized = true
      btn.addEventListener("dragstart", (e) => {
        if (!getSettings().qaAllowReorder) {
          e.preventDefault()
          return
        }
        window._draggedQaIcon = btn
        btn.style.opacity = "0.5"
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", "")
      })
      btn.addEventListener("dragend", () => {
        window._draggedQaIcon = null
        btn.style.opacity = "1"
        saveQaOrder()
      })
      btn.addEventListener("dragover", (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        const draggedIcon = window._draggedQaIcon
        if (!draggedIcon || !getSettings().qaAllowReorder) return

        const anchor = getAnchor(quickAccessBar)
        const draggableElements = [
          ...quickAccessBar.querySelectorAll(".quick-btn[data-toggle]"),
        ].filter((el) => el !== draggedIcon)

        const nextElement = draggableElements.reduce(
          (closest, child) => {
            const box = child.getBoundingClientRect()
            const offset = e.clientY - box.top - box.height / 2
            if (offset < 0 && offset > closest.offset) {
              return { offset, element: child }
            }
            return closest
          },
          { offset: Number.NEGATIVE_INFINITY },
        ).element

        if (nextElement) quickAccessBar.insertBefore(draggedIcon, nextElement)
        else if (anchor) quickAccessBar.insertBefore(draggedIcon, anchor)
      })
    }
  })
}

function saveQaOrder() {
  const quickAccessBar = document.querySelector(".quick-access-bar")
  if (!quickAccessBar) return
  const order = []
  quickAccessBar.querySelectorAll(".quick-btn[data-toggle]").forEach((btn) => {
    order.push(btn.getAttribute("data-toggle"))
  })
  updateSetting("qaOrder", order)
  saveSettings()
}

function applyQaOrder() {
  const quickAccessBar = document.querySelector(".quick-access-bar")
  if (!quickAccessBar) return
  const order = getSettings().qaOrder
  if (!order || !Array.isArray(order)) return
  const anchor = getAnchor(quickAccessBar)
  if (anchor) {
    order.forEach((toggle) => {
      const btn = quickAccessBar.querySelector(
        `.quick-btn[data-toggle="${toggle}"]`,
      )
      if (btn) quickAccessBar.insertBefore(btn, anchor)
    })
  }
}

export function setupQuickAccessDragAndDrop() {
  const quickAccessBar = document.querySelector(".quick-access-bar")
  if (!quickAccessBar) return
  applyQaOrder()
  setupQaDragAndDrop()
  window.addEventListener("layoutUpdated", (e) => {
    if (e.detail.key === "qaAllowReorder") setupQaDragAndDrop()
  })
}

// ── Context menu on quick-access bar ─────────────────────────────────────────
export function setupQuickAccessContextMenu() {
  const quickAccessBar = document.querySelector(".quick-access-bar")
  const settingsToggle = document.getElementById("settings-toggle")
  quickAccessBar?.addEventListener("contextmenu", (e) => {
    e.preventDefault()
    showContextMenu(e.clientX, e.clientY, -1, "quick-access-bar")
  })
  settingsToggle?.addEventListener("contextmenu", (e) => {
    e.preventDefault()
    showContextMenu(e.clientX, e.clientY, -1, "quick-access-toggle")
  })
}

// ── Layout-updated reactive handlers for search/bookmarks/free-move ──────────
export function setupLayoutUpdatedHandlers({
  ensureSearchInitialized,
  ensureBookmarksInitialized,
}) {
  window.addEventListener("layoutUpdated", (e) => {
    syncQuickButtons()

    if (e.detail.key === "showSearchBar") {
      if (e.detail.value) ensureSearchInitialized()
      document.body.classList.toggle("hide-search-bar", !e.detail.value)
      const el = document.getElementById("search-container")
      if (el) fadeToggle(el, e.detail.value, "")
    }
    if (e.detail.key === "showSearchAIIcon") {
      const el = document.getElementById("search-ai-btn")
      if (el) fadeToggle(el, e.detail.value, "flex")
    }
    if (e.detail.key === "searchBarWidth")
      document.documentElement.style.setProperty(
        "--search-bar-width",
        `${e.detail.value}px`,
      )
    if (e.detail.key === "searchBarBlur")
      document.documentElement.style.setProperty(
        "--search-bar-blur",
        `${e.detail.value}px`,
      )
    if (e.detail.key === "searchBarRadius")
      document.documentElement.style.setProperty(
        "--search-bar-radius",
        `${e.detail.value}px`,
      )
    if (e.detail.key === "showBookmarks") {
      if (e.detail.value) ensureBookmarksInitialized()
      const el = document.getElementById("bookmarks-container")
      if (el) fadeToggle(el, e.detail.value, "")
    }
    if (e.detail.key === "showBookmarkGroups") {
      if (e.detail.value) ensureBookmarksInitialized()
      const el = document.getElementById("bookmark-groups-container")
      if (el) fadeToggle(el, e.detail.value, "")
    }

    // Free-move handlers
    const freeMoveItems = [
      {
        key: "freeMoveCustomTitle",
        cls: "free-move-custom-title",
        id: "custom-title-display",
        defaultPos: {
          top: "45%",
          left: "50%",
          transform: "translate(-50%, 0)",
        },
      },
      {
        key: "freeMoveClock",
        cls: "free-move-clock",
        id: "clock-date-wrap",
        defaultPos: {
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        },
      },
      {
        key: "freeMoveSearchBar",
        cls: "free-move-search-bar",
        id: "search-container",
        defaultPos: null,
      },
    ]
    for (const item of freeMoveItems) {
      if (e.detail.key !== item.key) continue
      document.body.classList.toggle(item.cls, e.detail.value === true)
      const el = document.getElementById(item.id)
      if (!el) break
      if (e.detail.value === true && item.defaultPos && !el.style.top) {
        Object.assign(el.style, item.defaultPos)
      } else if (e.detail.value !== true) {
        el.style.position = ""
        el.style.top = ""
        el.style.left = ""
        el.style.bottom = ""
        el.style.right = ""
        el.style.transform = ""
        el.style.margin = ""
      }
      break
    }
  })

  window.addEventListener("settingsUpdated", (e) => {
    if (
      e.detail.key === "music_player_enabled" ||
      e.detail.key === "musicPlayerEnabled"
    ) {
      syncQuickButtons()
    }
  })
}
