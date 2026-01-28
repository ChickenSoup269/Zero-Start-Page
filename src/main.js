import { initI18n } from "./services/i18n.js"
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
import { NoteManager } from "./components/NoteManager.js"
import { makeDraggable } from "./utils/draggable.js"
import { resetComponentPositions, updateSetting, getSettings } from "./services/state.js"
import { showTodoCheckbox, showTimerCheckbox, showFullCalendarCheckbox, showMusicCheckbox, showClockCheckbox, showDateCheckbox, showGregorianCheckbox } from "./utils/dom.js"

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
  // Load language first as other components might depend on it
  await initI18n()

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
  const noteManager = new NoteManager();
  await noteManager.init()

  makeDraggable(todo.container, "todo")
  makeDraggable(timer.container, "timer")
  makeDraggable(music.container, "music")
  makeDraggable(calendar.container, "calendar")

  // Initial Quick Access Visibility
  const quickAccessBar = document.querySelector('.quick-access-bar')
  if (quickAccessBar) {
    quickAccessBar.style.display = getSettings().showQuickAccess !== false ? 'flex' : 'none'
  }

  const resetLayoutBtn = document.getElementById("reset-layout")
  const resetLayoutQuick = document.getElementById("reset-layout-quick")
  const handleReset = () => {
    if (confirm(getSettings().language === 'vi' ? "Bạn có chắc chắn muốn đặt lại vị trí của tất cả các thành phần?" : "Are you sure you want to reset all component positions?")) {
      resetComponentPositions()
    }
  }

  if (resetLayoutBtn) resetLayoutBtn.addEventListener("click", handleReset)
  if (resetLayoutQuick) resetLayoutQuick.addEventListener("click", handleReset)

  // Quick Access Bar Logic
  const quickBtns = document.querySelectorAll(".quick-btn")
  quickBtns.forEach(btn => {
    const type = btn.dataset.toggle
    if (!type) return

    // Update active state on init
    const settings = getSettings()
    const isActive = (type === 'todo' && settings.showTodoList !== false) ||
                     (type === 'timer' && settings.showTimer === true) ||
                     (type === 'calendar' && settings.showFullCalendar === true) ||
                     (type === 'music' && settings.musicPlayerEnabled === true)
    if (isActive) btn.classList.add('active')

    btn.addEventListener("click", () => {
      let key, value, checkbox
      switch (type) {
        case 'todo':
          key = "showTodoList"
          checkbox = showTodoCheckbox
          break
        case 'timer':
          key = "showTimer"
          checkbox = showTimerCheckbox
          break
        case 'calendar':
          key = "showFullCalendar"
          checkbox = showFullCalendarCheckbox
          break
        case 'music':
          key = "musicPlayerEnabled"
          checkbox = showMusicCheckbox
          break
        case 'clock':
          key = "showClock"
          checkbox = showClockCheckbox
          break

        case 'gregorian':
          key = "showGregorian"
          checkbox = showGregorianCheckbox
          break
      }

      if (key && checkbox) {

        
        value = !checkbox.checked
        checkbox.checked = value
        checkbox.dispatchEvent(new Event('change'))
        // Removed manual toggle: the listeners below will handle it based on dispatched events
      }
    })
  })

  // Helper to sync quick buttons
  function syncQuickButtons() {
    const settings = getSettings()
    quickBtns.forEach(btn => {
      const type = btn.dataset.toggle
      let isActive = false
      switch (type) {
        case 'todo': isActive = settings.showTodoList !== false; break
        case 'timer': isActive = settings.showTimer === true; break
        case 'calendar': isActive = settings.showFullCalendar === true; break
        case 'music': isActive = settings.musicPlayerEnabled === true; break
        case 'clock': isActive = settings.showClock !== false; break
        case 'date': isActive = settings.showDate !== false; break
        case 'gregorian': isActive = settings.showGregorian !== false; break
      }
      btn.classList.toggle('active', isActive)
    })
  }

  // Sync Quick Access active state when settings change
  window.addEventListener("layoutUpdated", (e) => {
    syncQuickButtons()
    
    if (e.detail.key === 'showQuickAccess') {
      const quickAccessBar = document.querySelector('.quick-access-bar')
      if (quickAccessBar) {
        quickAccessBar.style.display = e.detail.value ? 'flex' : 'none'
      }
    }
  })

  window.addEventListener("settingsUpdated", (e) => {
    if (e.detail.key === 'music_player_enabled' || e.detail.key === 'musicPlayerEnabled') {
      syncQuickButtons()
    }
  })

  // Initial Sync
  syncQuickButtons()

  // Collapse functionality
  const collapseBtn = document.getElementById("quick-access-collapse")
  if (collapseBtn && quickAccessBar) {
    // Initial State
    const settings = getSettings()
    if (settings.quickAccessCollapsed) {
      quickAccessBar.classList.add('collapsed')
    }

    collapseBtn.addEventListener("click", () => {
      const isCollapsed = quickAccessBar.classList.toggle('collapsed')
      collapseBtn.title = isCollapsed ? (settings.language === 'vi' ? 'Mở rộng' : 'Expand') : (settings.language === 'vi' ? 'Thu gọn' : 'Collapse')
      updateSetting('quickAccessCollapsed', isCollapsed)
      saveSettings()
    })
    
    // Set initial title
    collapseBtn.title = settings.quickAccessCollapsed ? (settings.language === 'vi' ? 'Mở rộng' : 'Expand') : (settings.language === 'vi' ? 'Thu gọn' : 'Collapse')
  }
})
