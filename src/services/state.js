// --- State Management ---

let bookmarksState = JSON.parse(localStorage.getItem("bookmarks")) || []
let settingsState = JSON.parse(localStorage.getItem("pageSettings")) || {
  background: "local-bg-5",
  font: "'Outfit', sans-serif",
  dateFormat: "full",
  clockSize: "6",
  language: "en",
  accentColor: "#a8c0ff",
  effect: "none",
  gradientStart: "#0f0c29",
  gradientEnd: "#302b63",
  gradientAngle: "135",
  userBackgrounds: [],
  meteorColor: "#ffffff",
  starColor: "#ffffff",
  shootingStarColor: "#ffcc66",
}

// Ensure userBackgrounds is always an array
settingsState.userBackgrounds = settingsState.userBackgrounds || []

export const localBackgrounds = [
  { id: "local-bg-1", name: "Sunset" },
  { id: "local-bg-2", name: "Lavender" },
  { id: "local-bg-3", name: "Charcoal" },
  { id: "local-bg-4", name: "Morning" },
  { id: "local-bg-5", name: "Deep Space" },
]

export function getBookmarks() {
  return bookmarksState
}

export function setBookmarks(newBookmarks) {
  bookmarksState = newBookmarks
}

export function getSettings() {
  return settingsState
}

export function updateSetting(key, value) {
  settingsState[key] = value
}

export function resetSettingsState() {
  const defaultSettings = {
    background: "local-bg-5",
    font: "'Outfit', sans-serif",
    dateFormat: "full",
    clockSize: "6",
    language: "en",
    accentColor: "#a8c0ff",
    effect: "none",
    gradientStart: "#0f0c29",
    gradientEnd: "#302b63",
    gradientAngle: "135",
    userBackgrounds: [],
    meteorColor: "#ffffff",
    starColor: "#ffffff",
    shootingStarColor: "#ffcc66",
  }
  settingsState = defaultSettings
  saveSettings()
  return defaultSettings
}

export function saveBookmarks() {
  localStorage.setItem("bookmarks", JSON.stringify(bookmarksState))
}

export function saveSettings() {
  try {
    localStorage.setItem("pageSettings", JSON.stringify(settingsState))
  } catch (e) {
    if (e.name === "QuotaExceededError") {
      alert(
        "Storage quota exceeded. Please remove some uploaded backgrounds to free up space."
      )
    } else {
      throw e
    }
  }
}