// --- State Management ---
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
  userColors: [],
  userGradients: [], // Add userGradients
  meteorColor: "#ffffff",
  starColor: "#ffffff",
  shootingStarColor: "#ffcc66", // Particle color
  shootingStarBackgroundColor: "#000000", // Background overlay for shooting star effect
  shootingStarStarColor: "#ffffff", // Static stars color for shooting star effect
  clockColor: null,
  auraColor: "#a8c0ff",
  hackerColor: "#00FF00",
  bgPositionX: 50,
  bgPositionY: 50,
  unsplashCategory: "nature",
  showTodoList: true,
  showTimer: false,
  showGregorian: true,
  musicPlayerEnabled: false,
  showClock: true,
  showFullCalendar: false,
  componentPositions: {},
  musicBarStyle: "vinyl",
  timerInitialTime: 0,
  timerCurrentTime: 0,
  timerEndTime: 0,
  timerIsRunning: false,
  musicPlayerExpanded: false,
  showQuickAccess: true,
  quickAccessCollapsed: false
}

let bookmarksState = JSON.parse(localStorage.getItem("bookmarks")) || []
let settingsState = {
  ...defaultSettings,
  ...(JSON.parse(localStorage.getItem("pageSettings")) || {}),
}

// Ensure userBackgrounds is always an array
settingsState.userBackgrounds = settingsState.userBackgrounds || []
settingsState.userColors = settingsState.userColors || []
settingsState.userGradients = settingsState.userGradients || []

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
    userColors: [],
    userGradients: [],
    meteorColor: "#ffffff",
    starColor: "#ffffff",
    shootingStarColor: "#ffcc66", // Particle color
    shootingStarBackgroundColor: "#000000", // Background overlay for shooting star effect
    shootingStarStarColor: "#ffffff", // Static stars color for shooting star effect
    clockColor: null,
    auraColor: "#a8c0ff",
    hackerColor: "#00FF00",
    bgPositionX: 50,
    bgPositionY: 50,
    unsplashCategory: "nature",
    showTodoList: true,
    showTimer: false,
    showGregorian: true,
    musicPlayerEnabled: false,
    showClock: true,
    showFullCalendar: false,
    componentPositions: {},
    musicBarStyle: "vinyl",
    timerInitialTime: 0,
    timerCurrentTime: 0,
    timerEndTime: 0,
    timerIsRunning: false,
    musicPlayerExpanded: false,
    showQuickAccess: true,
    quickAccessCollapsed: false
  }
  settingsState = defaultSettings
  saveSettings()
  return defaultSettings
}

export function saveBookmarks() {
  localStorage.setItem("bookmarks", JSON.stringify(bookmarksState))
}

export const saveComponentPosition = (componentId, position) => {
  const settings = getSettings()
  settings.componentPositions[componentId] = position
  saveSettings()
}

export const resetComponentPositions = () => {
  const settings = getSettings()
  settings.componentPositions = {}
  saveSettings()
  window.location.reload()
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