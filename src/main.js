import { initI18n, geti18n } from "./services/i18n.js"
import { fadeToggle } from "./utils/dom.js"
import { showConfirm, showAlert, showChecklistConfirm } from "./utils/dialog.js"
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
import { DailyQuotes } from "./components/quotes.js"
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
  clockDisplaySelect,
  showGregorianCheckbox,
  showNotepadCheckbox,
  showQuotesCheckbox,
} from "./utils/dom.js"

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
  // Update version in startup overlay and settings sidebar immediately
  try {
    const manifest = window.chrome?.runtime?.getManifest?.()
    if (manifest && manifest.version) {
      const startupVersion = document.getElementById("startup-version")
      if (startupVersion) startupVersion.textContent = `v${manifest.version}`
      
      const settingsVersion = document.getElementById("settings-version")
      if (settingsVersion) settingsVersion.textContent = `v${manifest.version}`
    }
  } catch (e) {
    console.warn("Could not get manifest version")
  }

  const currentSettings = getSettings()

  // 1. Setup UI fast to prevent layout shifts

  // FAST BOOT LAYOUT CLASSES
  let layout = currentSettings.bookmarkLayout || "default"
  if (currentSettings.bookmarkSidebarMode === true && layout === "default") {
    layout = "sidebar"
  }
  if (layout === "sidebar-left") layout = "sidebar"

  if (layout === "sidebar") document.body.classList.add("bookmark-sidebar-mode")
  else if (layout === "taskbar")
    document.body.classList.add("bookmark-taskbar-mode")
  else if (layout === "taskbar-top")
    document.body.classList.add("bookmark-taskbar-top-mode")
  else if (layout === "taskbar-left")
    document.body.classList.add("bookmark-taskbar-left-mode")

  if (currentSettings.flipLayout) document.body.classList.add("flip-layout")
  if (currentSettings.hideBookmarkText)
    document.body.classList.add("hide-bookmark-text")
  if (currentSettings.hideBookmarkBg)
    document.body.classList.add("hide-bookmark-bg")

  let bgStyle = currentSettings.bookmarkLayoutBgStyle || "default"
  if (bgStyle === "hidden")
    document.body.classList.add("bookmark-layout-bg-hidden")
  else if (bgStyle === "white")
    document.body.classList.add("bookmark-layout-bg-white")
  else if (bgStyle === "colored") {
    document.body.classList.add("bookmark-layout-bg-colored")
    document.documentElement.style.setProperty(
      "--bookmark-layout-bg-color",
      currentSettings.bookmarkLayoutBgColor || "rgba(0,0,0,0.5)",
    )
  }
  if (currentSettings.bookmarkItemStyle === "card")
    document.body.classList.add("bookmark-item-card-style")

  const dateClockStyle = currentSettings.dateClockStyle || "default"
  document.body.classList.add(`date-clock-style-${dateClockStyle}`)

  const searchContainer = document.getElementById("search-container")
  if (searchContainer)
    searchContainer.style.display =
      currentSettings.showSearchBar !== false ? "" : "none"
  const bookmarksContainer = document.getElementById("bookmarks-container")
  if (bookmarksContainer)
    bookmarksContainer.style.display =
      currentSettings.showBookmarks !== false ? "" : "none"
  const bookmarkGroupsContainer = document.getElementById(
    "bookmark-groups-container",
  )
  if (bookmarkGroupsContainer)
    bookmarkGroupsContainer.style.display =
      currentSettings.showBookmarkGroups !== false ? "" : "none"
  const searchAiBtn = document.getElementById("search-ai-btn")
  if (searchAiBtn)
    searchAiBtn.style.display =
      currentSettings.showSearchAIIcon !== false ? "" : "none"
  document.documentElement.style.setProperty(
    "--search-bar-width",
    `${currentSettings.searchBarWidth || 600}px`,
  )

  // Initialize essential visual components immediately to fix LCP/CLS issues
  initClock()
  initBookmarks()
  initSearch()
  initContextMenu()
  initModal()

  // Wait for rendering and layout to stabilize, then fade in main-container
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const mc = document.querySelector(".main-container")
      if (mc) mc.classList.add("ready")
    })
  })

  // Load language as other heavy/modal components depend on it translations
  await initI18n()

  const { isIdbMedia, getImageUrl, preloadImages } = await import("./services/imageStore.js")
  if (isIdbMedia(currentSettings.background)) {
    // Kích hoạt nạp trước cho ảnh nền hiện tại
    await getImageUrl(currentSettings.background).catch(() => {})
  }

  // Initialize Settings (Applies background & heavy canvas effects)
  initSettings()

  // DEFER HEAVY INITIALIZATIONS: Database migrations, image preloads, unused non-critical UI
  setTimeout(async () => {
    const { migrated, changed } = await migrateDataUrls(
      getSettings().userBackgrounds,
    )
    if (changed) {
      updateSetting("userBackgrounds", migrated)
      saveSettings()
    }
    // Nạp trước toàn bộ ảnh trong bộ sưu tập để dùng ngay
    await preloadImages(getSettings().userBackgrounds)

    // Re-apply background settings if an IDB local background is active,
    // now that it has been preloaded and the sync URL is available.
    if (typeof window.appApplySettings === "function") {
      window.appApplySettings()
    }
    const notepad = new Notepad()
    const todo = new TodoList()
    const timer = new Timer()
    const music = new MusicPlayer()
    const calendar = new FullCalendar()
    const dailyQuotes = new DailyQuotes()

    makeDraggable(todo.container, "todo")
    makeDraggable(timer.container, "timer")
    makeDraggable(music.container, "music")
    makeDraggable(calendar.container, "calendar")
    makeDraggable(dailyQuotes.container, "daily-quotes")
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
      const i18n = geti18n ? geti18n() : {}
      const options = [
        { key: "all", label: i18n.reset_opt_all || "Entire Settings", checked: false },
        { key: "positions", label: i18n.reset_opt_positions || "Layout Positions", checked: false },
        { key: "effectColors", label: i18n.reset_opt_effects || "Effect Colors", checked: false },
        { key: "styles", label: i18n.reset_opt_styles || "Custom Styles", checked: false }
      ]
      
      const selection = await showChecklistConfirm(
        options,
        i18n.settings_reset_layout || "Reset Settings",
        i18n.alert_reset_layout_confirm || "Select items to reset:"
      )
      
      if (selection) {
        // Kiểm tra xem có mục nào được chọn không
        const hasSelection = Object.values(selection).some(v => v === true)
        if (!hasSelection) return

        // Show startup overlay again for better feedback
        const overlay = document.getElementById("startup-overlay")
        if (overlay) {
          overlay.style.visibility = "visible"
          overlay.style.opacity = "1"
        }
        
        setTimeout(() => {
          resetComponentPositions(selection)
        }, 1000)
      }
    }

    if (resetLayoutBtn) resetLayoutBtn.addEventListener("click", handleReset)
    if (resetLayoutQuick)
      resetLayoutQuick.addEventListener("click", handleReset)

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
            // Special handling for select instead of checkbox
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
          case "gregorian":
            key = "showGregorian"
            checkbox = showGregorianCheckbox
            break
          case "quotes":
            const currentQuotes = getSettings().showQuotes !== false
            const nextQuotes = !currentQuotes
            updateSetting("showQuotes", nextQuotes)
            saveSettings()
            if (showQuotesCheckbox) showQuotesCheckbox.checked = nextQuotes
            window.dispatchEvent(
              new CustomEvent("layoutUpdated", {
                detail: { key: "showQuotes", value: nextQuotes },
              }),
            )
            break;
          }
        if (key && checkbox) {
          checkbox.click()
        }
      })
    })

    // Helper to sync quick buttons
    function syncQuickButtons() {
      const settings = getSettings()
      quickBtns.forEach((btn) => {
        const type = btn.dataset.toggle
        if (!type) return // Added this to skip buttons without data-toggle
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
          }        btn.classList.toggle("active", isActive)
      })
    }

    // Final sync and reveal
    syncQuickButtons()

    // Smooth reveal: wait for critical components and then fade out overlay
    // Increased delay to ensure heavy components like Bookmarks have settled
    const revealApp = () => {
      const mainContainer = document.querySelector(".main-container")
      if (mainContainer) mainContainer.classList.add("ready")
      
      setTimeout(() => {
        const overlay = document.getElementById("startup-overlay")
        if (overlay) {
          overlay.style.opacity = "0"
          overlay.style.visibility = "hidden"
          // Don't remove it from DOM so we can reuse it for reset
          // setTimeout(() => overlay.remove(), 800)
        }
        document.body.classList.remove("loading-state")
      }, 400) // Increased settling time for layouts
    }

    if (window.requestIdleCallback) {
      window.requestIdleCallback(revealApp)
    } else {
      setTimeout(revealApp, 300)
    }

    // Sync Quick Access active state when settings change
    window.addEventListener("layoutUpdated", (e) => {
      syncQuickButtons()
      if (e.detail.key === "showSearchBar") {
        const el = document.getElementById("search-container")
        if (el) fadeToggle(el, e.detail.value, "")
      }
      if (e.detail.key === "showSearchAIIcon") {
        const el = document.getElementById("search-ai-btn")
        if (el) fadeToggle(el, e.detail.value, "")
      }
      if (e.detail.key === "searchBarWidth") {
        document.documentElement.style.setProperty(
          "--search-bar-width",
          `${e.detail.value}px`,
        )
      }
      if (e.detail.key === "showBookmarks") {
        const el = document.getElementById("bookmarks-container")
        if (el) fadeToggle(el, e.detail.value, "")
      }
      if (e.detail.key === "showBookmarkGroups") {
        const el = document.getElementById("bookmark-groups-container")
        if (el) fadeToggle(el, e.detail.value, "")
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
        document.body.classList.toggle(
          "free-move-clock",
          e.detail.value === true,
        )
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
        const manifest = window.chrome?.runtime?.getManifest?.()
        if (manifest && manifest.version) {
          const currentVersion = manifest.version

          // Use chrome.storage.local if available, fallback to localStorage
          if (window.chrome?.storage?.local) {
            chrome.storage.local.get(["lastVersion"], (result) => {
              const lastVersion = result.lastVersion
              handleVersionCheck(lastVersion, currentVersion, (ver) => {
                chrome.storage.local.set({ lastVersion: ver })
              })
            })
          } else {
            // Fallback for non-extension environments or missing permissions
            const lastVersion = localStorage.getItem("lastVersion")
            handleVersionCheck(lastVersion, currentVersion, (ver) => {
              localStorage.setItem("lastVersion", ver)
            })
          }
        }

        function handleVersionCheck(lastVersion, currentVersion, saveFn) {
          const isFreshInstall = !lastVersion && !localStorage.getItem("pageSettings") && !localStorage.getItem("bookmarks")

          if (lastVersion) {
            if (lastVersion !== currentVersion) {
              showUpdateUI(currentVersion)
              saveFn(currentVersion)
            }
          } else {
            // If it's not a fresh install, it's an update from an older version without tracking
            if (!isFreshInstall) {
              showUpdateUI(currentVersion)
            }
            saveFn(currentVersion)
          }
        }

        function showUpdateUI(currentVersion) {
          const popup = document.getElementById("update-notification-popup")
          const verLabel = document.getElementById("update-version-label")
          const sidebarLink = document.getElementById("sidebar-update-link")

          if (popup && verLabel) {
            verLabel.textContent = `v${currentVersion}`
            fadeToggle(popup, true, "block")

            document
              .getElementById("close-update-popup")
              ?.addEventListener("click", () => {
                fadeToggle(popup, false, "block")
              })
          }

          if (sidebarLink) {
            fadeToggle(sidebarLink, true, "flex")
          }
        }
      } catch (e) {
        console.warn("Update check failed:", e)
      }
    }, 10)

    // Close the deferred heavy initializations setTimeout
  }, 10)
})
