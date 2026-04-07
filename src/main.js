import { initI18n } from "./services/i18n.js"
import { showConfirm } from "./utils/dialog.js"
import { initClock } from "./components/clock.js"
import { initBookmarks } from "./components/bookmarks.js"
import { initModal } from "./components/modal.js"
import { initContextMenu } from "./components/contextMenu.js"
import { initSettings } from "./components/settings.js"
import { initSearch } from "./components/search.js"
import { TodoList } from "./components/todo.js"
import { Timer } from "./components/timer.js"
import { MusicPlayer } from "./components/musicPlayer.js"
import { FullCalendar } from "./components/fullCalendar.js"
import { Notepad } from "./components/notepad.js"
import { preloadImages, migrateDataUrls } from "./services/imageStore.js"

import { makeDraggable } from "./utils/draggable.js"
import {
  resetComponentPositions,
  updateSetting,
  getSettings,
  saveSettings,
} from "./services/state.js"
import {
  showTodoCheckbox,
  showTimerCheckbox,
  showFullCalendarCheckbox,
  showMusicCheckbox,
  showClockCheckbox,
  showDateCheckbox,
  showGregorianCheckbox,
  showNotepadCheckbox,
} from "./utils/dom.js"

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
  // Load language first as other components might depend on it
  await initI18n()

  // Migrate old base64 data URLs → IndexedDB, then preload blob URLs
  const { migrated, changed } = await migrateDataUrls(
    getSettings().userBackgrounds,
  )
  if (changed) {
    updateSetting("userBackgrounds", migrated)
    saveSettings()
  }
  await preloadImages(getSettings().userBackgrounds)

  // Initialize all other components
  initClock()
  initBookmarks()
  initModal()
  initContextMenu()
  initSettings()
  initSearch()

  // Initialize new features as classes
  const todo = new TodoList()
  const timer = new Timer()
  const music = new MusicPlayer()
  const calendar = new FullCalendar()
  const notepad = new Notepad()

  makeDraggable(todo.container, "todo")
  makeDraggable(timer.container, "timer")
  makeDraggable(music.container, "music")
  makeDraggable(calendar.container, "calendar")
  makeDraggable(notepad.container, "notepad", null, ".notepad-header")
  makeDraggable(document.getElementById("clock-date-wrap"), "clock")

  // Initial Visibility: Search Bar, Bookmarks, Bookmark Groups
  const searchContainer = document.getElementById("search-container")
  const bookmarksContainer = document.getElementById("bookmarks-container")
  const bookmarkGroupsContainer = document.getElementById(
    "bookmark-groups-container",
  )
  const settings0 = getSettings()
  if (searchContainer)
    searchContainer.style.display =
      settings0.showSearchBar !== false ? "" : "none"
  const searchAiBtn = document.getElementById("search-ai-btn")
  if (searchAiBtn)
    searchAiBtn.style.display =
      settings0.showSearchAIIcon !== false ? "" : "none"
  document.documentElement.style.setProperty(
    "--search-bar-width",
    `${settings0.searchBarWidth || 600}px`,
  )
  if (bookmarksContainer)
    bookmarksContainer.style.display =
      settings0.showBookmarks !== false ? "" : "none"
  if (bookmarkGroupsContainer)
    bookmarkGroupsContainer.style.display =
      settings0.showBookmarkGroups !== false ? "" : "none"

  const resetLayoutBtn = document.getElementById("reset-layout")
  const resetLayoutQuick = document.getElementById("reset-layout-quick")
  const handleReset = async () => {
    if (
      await showConfirm(
        getSettings().language === "vi"
          ? "Bạn có chắc chắn muốn đặt lại vị trí của tất cả các thành phần?"
          : "Are you sure you want to reset all component positions?",
      )
    ) {
      resetComponentPositions()
    }
  }

  if (resetLayoutBtn) resetLayoutBtn.addEventListener("click", handleReset)
  if (resetLayoutQuick) resetLayoutQuick.addEventListener("click", handleReset)

  // Quick Access Bar Logic
  const quickBtns = document.querySelectorAll(".quick-btn")
  quickBtns.forEach((btn) => {
    const type = btn.dataset.toggle
    if (!type) return

    btn.addEventListener("click", () => {
      let key, value, checkbox
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
        case "clock":
          key = "showClock"
          checkbox = showClockCheckbox
          break
        case "date":
          key = "showDate"
          checkbox = showDateCheckbox
          break
        case "gregorian":
          key = "showGregorian"
          checkbox = showGregorianCheckbox
          break
      }

      if (key && checkbox) {
        value = !checkbox.checked
        checkbox.checked = value
        checkbox.dispatchEvent(new Event("change"))
        // Removed manual toggle: the listeners below will handle it based on dispatched events
      }
    })
  })

  // Helper to sync quick buttons
  function syncQuickButtons() {
    const settings = getSettings()
    quickBtns.forEach((btn) => {
      const type = btn.dataset.toggle
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
          isActive = settings.showClock !== false
          break
        case "date":
          isActive = settings.showDate !== false
          break
        case "gregorian":
          isActive = settings.showGregorian !== false
          break
      }
      btn.classList.toggle("active", isActive)
    })
  }
  
  // Call once on init to set correct initial active states
  syncQuickButtons()

  // Sync Quick Access active state when settings change
  window.addEventListener("layoutUpdated", (e) => {
    syncQuickButtons()
    if (e.detail.key === "showSearchBar") {
      const el = document.getElementById("search-container")
      if (el) el.style.display = e.detail.value ? "" : "none"
    }
    if (e.detail.key === "showSearchAIIcon") {
      const el = document.getElementById("search-ai-btn")
      if (el) el.style.display = e.detail.value ? "" : "none"
    }
    if (e.detail.key === "searchBarWidth") {
      document.documentElement.style.setProperty(
        "--search-bar-width",
        `${e.detail.value}px`,
      )
    }
    if (e.detail.key === "showBookmarks") {
      const el = document.getElementById("bookmarks-container")
      if (el) el.style.display = e.detail.value ? "" : "none"
    }
    if (e.detail.key === "showBookmarkGroups") {
      const el = document.getElementById("bookmark-groups-container")
      if (el) el.style.display = e.detail.value ? "" : "none"
    }
    if (e.detail.key === "freeMoveCustomTitle") {
      document.body.classList.toggle(
        "free-move-custom-title",
        e.detail.value === true,
      )
      const titleWrap = document.getElementById("custom-title-display")
      if (titleWrap) {
        if (e.detail.value === true) {
          if (!titleWrap.style.top) {
            titleWrap.style.top = "45%"
            titleWrap.style.left = "50%"
            titleWrap.style.transform = "translate(-50%, 0)"
          }
        } else {
          titleWrap.style.position = ""
          titleWrap.style.top = ""
          titleWrap.style.left = ""
          titleWrap.style.bottom = ""
          titleWrap.style.right = ""
          titleWrap.style.transform = ""
          titleWrap.style.margin = ""
        }
      }
    }

    if (e.detail.key === "freeMoveClock") {
      document.body.classList.toggle("free-move-clock", e.detail.value === true)
      const clockWrap = document.getElementById("clock-date-wrap")
      if (clockWrap) {
        if (e.detail.value === true) {
          if (!clockWrap.style.top) {
            clockWrap.style.top = "35%"
            clockWrap.style.left = "50%"
            clockWrap.style.transform = "translate(-50%, -50%)"
          }
        } else {
          clockWrap.style.position = ""
          clockWrap.style.top = ""
          clockWrap.style.left = ""
          clockWrap.style.bottom = ""
          clockWrap.style.right = ""
          clockWrap.style.transform = ""
          clockWrap.style.margin = ""
        }
      }
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

  // Initial Sync
  syncQuickButtons()

  // Collapse functionality
  const quickAccessBar = document.querySelector(".quick-access-bar")
  const collapseBtn = document.getElementById("quick-access-collapse")
  if (collapseBtn && quickAccessBar) {
    // Initial State
    const settings = getSettings()
    if (settings.quickAccessCollapsed) {
      quickAccessBar.classList.add("collapsed")
    }

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

    // Set initial title
    collapseBtn.title = settings.quickAccessCollapsed
      ? settings.language === "vi"
        ? "Mở rộng"
        : "Expand"
      : settings.language === "vi"
        ? "Thu gọn"
        : "Collapse"
  }

  // Update Notification Check
  setTimeout(() => {
    try {
      const manifest = window.chrome?.runtime?.getManifest()
      if (manifest && manifest.version) {
        const currentVersion = manifest.version

        chrome.storage.local.get(["extensionUpdated"], (result) => {
          if (result.extensionUpdated) {
            // Version changed -> show update popup and sidebar link
            const popup = document.getElementById("update-notification-popup")
            const verLabel = document.getElementById("update-version-label")
            const sidebarLink = document.getElementById("sidebar-update-link")

            if (popup && verLabel) {
              verLabel.textContent = `v${currentVersion}`
              popup.style.display = "block"

              document
                .getElementById("close-update-popup")
                ?.addEventListener("click", () => {
                  popup.style.display = "none"
                })
            }

            if (sidebarLink) {
              sidebarLink.style.display = "flex"
            }

            // Clear the flag after showing
            chrome.storage.local.remove("extensionUpdated")
          }
        })
      }
    } catch (e) {
      console.warn("Update check failed:", e)
    }
  }, 1000)
})
