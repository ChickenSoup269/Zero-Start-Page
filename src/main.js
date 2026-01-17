import { initI18n } from "./services/i18n.js"
import { initClock } from "./components/clock.js"
import { initBookmarks } from "./components/bookmarks.js"
import { initModal } from "./components/modal.js"
import { initContextMenu } from "./components/contextMenu.js"
import { initSettings } from "./components/settings.js"

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
})
