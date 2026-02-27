// --- State Management ---
import { showAlert } from "../utils/dialog.js"

const defaultSettings = {
  background: "#0f0c29",
  font: "'Outfit', sans-serif",
  dateFormat: "full",
  clockSize: "6",
  language: "en",
  pageTitle: "Start Page",
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
  sakuraColor: "#ffb7c5",
  snowfallColor: "#ffffff",
  bgPositionX: 50,
  bgPositionY: 50,
  unsplashCategory: "nature",
  showTodoList: true,
  showTimer: false,
  showGregorian: true,
  showFullCalendar: false,
  showLunarCalendar: true,
  showClock: true,
  showDate: true,
  showNotepad: true,
  musicPlayerEnabled: false,
  componentPositions: {},
  musicBarStyle: "vinyl",
  musicVisualizerStyle: "bars",
  timerInitialTime: 0,
  timerCurrentTime: 0,
  timerEndTime: 0,
  timerIsRunning: false,
  musicPlayerExpanded: false,
  sideControlsGhostMode: false,
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
        items: storedBookmarks,
      },
    ],
    activeGroupId: "group-1",
  }
  localStorage.setItem("bookmarks", JSON.stringify(storedBookmarks))
}

let bookmarksState = storedBookmarks || {
  groups: [
    {
      id: "group-1",
      name: "Main",
      items: [],
    },
  ],
  activeGroupId: "group-1",
}

let settingsState = {
  ...defaultSettings,
  ...(JSON.parse(localStorage.getItem("pageSettings")) || {}),
}

// Ensure userBackgrounds is always an array
settingsState.userBackgrounds = settingsState.userBackgrounds || []

// --- Calendar Events State ---
let calendarEventsState =
  JSON.parse(localStorage.getItem("calendarEvents")) || []

// --- Exports ---
export const localBackgrounds = []

// Returns the *entire state* (groups + activeId)
export function getBookmarkState() {
  return bookmarksState
}

// Returns just the items of the active group (for compatibility/rendering current view)
export function getBookmarks() {
  const activeGroup = bookmarksState.groups.find(
    (g) => g.id === bookmarksState.activeGroupId,
  )
  return activeGroup ? activeGroup.items : []
}

export function setBookmarks(newItems) {
  // Sets items for the ACTIVE group
  const activeGroup = bookmarksState.groups.find(
    (g) => g.id === bookmarksState.activeGroupId,
  )
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
    showNotepad: true,
    componentPositions: {},
    musicBarStyle: "vinyl",
    musicVisualizerStyle: "bars",
    timerInitialTime: 0,
    timerCurrentTime: 0,
    timerEndTime: 0,
    timerIsRunning: false,
    musicPlayerExpanded: false,
    showQuickAccess: true,
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
      showAlert(
        "Storage quota exceeded. Please remove some uploaded backgrounds to free up space.",
      )
    } else {
      throw e
    }
  }
}

// --- Calendar Events Functions ---
export function getCalendarEvents() {
  return calendarEventsState
}

export function addCalendarEvent(event) {
  calendarEventsState.push({
    id: Date.now().toString(),
    ...event,
  })
  saveCalendarEvents()
}

export function updateCalendarEvent(id, updatedEvent) {
  const index = calendarEventsState.findIndex((e) => e.id === id)
  if (index !== -1) {
    calendarEventsState[index] = {
      ...calendarEventsState[index],
      ...updatedEvent,
    }
    saveCalendarEvents()
  }
}

export function deleteCalendarEvent(id) {
  calendarEventsState = calendarEventsState.filter((e) => e.id !== id)
  saveCalendarEvents()
}

export function saveCalendarEvents() {
  localStorage.setItem("calendarEvents", JSON.stringify(calendarEventsState))
}
