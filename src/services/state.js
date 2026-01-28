// --- State Management ---
const defaultSettings = {
  background: "#0f0c29",
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

  clockColor: null,
  auraColor: "#a8c0ff",
  hackerColor: "#00FF00",
  bgPositionX: 50,
  bgPositionY: 50,
  unsplashCategory: "nature",
  showTodoList: true,
  showTimer: false,
  showGregorian: true,
  showFullCalendar: false,
  showClock: true,
  showDate: true,
  musicPlayerEnabled: false,
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


// Bookmarks State Migration
let storedBookmarks = JSON.parse(localStorage.getItem("bookmarks"))

// Migration: Array -> Object with Groups
if (Array.isArray(storedBookmarks)) {
  storedBookmarks = {
    groups: [
      {
        id: "group-1",
        name: "Main",
        items: storedBookmarks
      }
    ],
    activeGroupId: "group-1"
  }
  localStorage.setItem("bookmarks", JSON.stringify(storedBookmarks))
}

let bookmarksState = storedBookmarks || {
  groups: [
    {
      id: "group-1",
      name: "Main",
      items: []
    }
  ],
  activeGroupId: "group-1"
}


let settingsState = {
  ...defaultSettings,
  ...(JSON.parse(localStorage.getItem("pageSettings")) || {}),
}

// Ensure userBackgrounds is always an array
settingsState.userBackgrounds = settingsState.userBackgrounds || []
settingsState.userColors = settingsState.userColors || []
settingsState.userGradients = settingsState.userGradients || []

// --- Exports ---
export const localBackgrounds = []


// Returns the *entire state* (groups + activeId)
export function getBookmarkState() {
  return bookmarksState
}

// Returns just the items of the active group (for compatibility/rendering current view)
export function getBookmarks() {
  const activeGroup = bookmarksState.groups.find(g => g.id === bookmarksState.activeGroupId)
  return activeGroup ? activeGroup.items : []
}

export function setBookmarks(newItems) {
  // Sets items for the ACTIVE group
  const activeGroup = bookmarksState.groups.find(g => g.id === bookmarksState.activeGroupId)
  if (activeGroup) {
    activeGroup.items = newItems
  }
}

export function getBookmarkGroups() {
  return bookmarksState.groups
}

export function setBookmarkGroups(groups) {
  bookmarksState.groups = groups
}

export function getActiveGroupId() {
  return bookmarksState.activeGroupId
}

export function setActiveGroupId(id) {
  bookmarksState.activeGroupId = id
  saveBookmarks()
}

export function getSettings() {
  return settingsState
}

export function updateSetting(key, value) {
  settingsState[key] = value
}

export function resetSettingsState() {
  const defaultSettings = {
    background: "#0f0c29",
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