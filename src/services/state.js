// --- State Management ---
import { showAlert } from "../utils/dialog.js"

// Gradient presets for random first-load background
const _GRADIENT_PRESETS = [
  { gradientStart: "#0f0c29", gradientEnd: "#302b63", gradientAngle: "135" },
  { gradientStart: "#141e30", gradientEnd: "#243b55", gradientAngle: "160" },
  { gradientStart: "#0a0a1a", gradientEnd: "#1a0a3e", gradientAngle: "150" },
  { gradientStart: "#1a1a2e", gradientEnd: "#16213e", gradientAngle: "135" },
  { gradientStart: "#0d1b2a", gradientEnd: "#1b4332", gradientAngle: "145" },
  { gradientStart: "#0b0c10", gradientEnd: "#1f2833", gradientAngle: "160" },
  { gradientStart: "#0f2027", gradientEnd: "#203a43", gradientAngle: "135" },
  { gradientStart: "#1a0533", gradientEnd: "#0d324d", gradientAngle: "145" },
  { gradientStart: "#12002e", gradientEnd: "#2d004f", gradientAngle: "150" },
  { gradientStart: "#0a1628", gradientEnd: "#1c3f6e", gradientAngle: "140" },
  { gradientStart: "#0d0221", gradientEnd: "#3a015c", gradientAngle: "135" },
  { gradientStart: "#001219", gradientEnd: "#005f73", gradientAngle: "145" },
]
const _initialGradient =
  _GRADIENT_PRESETS[Math.floor(Math.random() * _GRADIENT_PRESETS.length)]

const defaultSettings = {
  background: null,
  font: "'Outfit', sans-serif",
  dateFormat: "full",
  dateClockStyle: "default",
  hueTextMode: "off",
  analogMarkerMode: "quarters",
  analogBlurBackground: false,
  clockDatePriority: "none",
  hideSeconds: false,
  clockSize: "6",
  dateSize: "1.5",
  language: "en",
  pageTitle: "Start Page",
  tabIcon: "",
  accentColor: "#a8c0ff",
  effect: "none",
  gradientStart: _initialGradient.gradientStart,
  gradientEnd: _initialGradient.gradientEnd,
  gradientAngle: _initialGradient.gradientAngle,
  gradientType: "linear",
  gradientRepeating: false,
  gradientControlsOpen: true,
  gradientExtraColorCount: 2,
  gradientCustomColors: "",
  multiColorCount: 2,
  multiColors: ["#FF6B6B", "#4ECDC4"],
  multiGradientAngle: 135,
  multiColorMode: "smooth",
  multiColorControlsOpen: true,
  multiColorDividers: true,
  multiColorDividerColor: "#FFFFFF",
  multiColorDividerWidth: 1.2,
  multiColorFreeLineAngles: false,
  multiColorLineAngles: [],
  userBackgrounds: [],
  userColors: [],
  userAccentColors: [],
  userGradients: [], // Add userGradients
  starColor: "#ffffff",
  meteorColor: "#ffffff",

  bookmarkFontSize: 10,
  bookmarkIconSize: 42,
  bookmarkGap: 8,
  bookmarkBgColor: "#ffffff",
  bookmarkBgOpacity: 100,
  bookmarkEnableDrag: false,
  bookmarkHideText: false,
  bookmarkHideBg: false,
  bookmarkTextColor: null,
  showTopRightControls: true,
  bookmarkShadowColor: "#000000",
  bookmarkShadowOpacity: 24,
  bookmarkShadowBlur: 8,

  clockDateStrokeWidth: 0,
  clockDateStrokeColor: "#000000",
  clockDateStrokeTarget: "both",

  clockColor: null,
  dateColor: null,
  auraColor: "#a8c0ff",
  northernLightsColor: "#00ff88",
  hackerColor: "#00FF00",
  sakuraColor: "#ffb7c5",
  snowfallColor: "#ffffff",
  fallingLeavesSkin: "maple",
  bubbleColor: "#60c8ff",
  rainOnGlassColor: "#a8d8ff",
  rainHDColor: "#99ccff",
  stormRainColor: "#7dd3fc",
  wavyLinesColor: "#00bcd4",
  oceanWaveColor: "#0077b6",
  oceanWavePosition: "bottom",
  cloudDriftColor: "#0a0a0a",
  shinyColor: "#ff0000",
  lineShinyColor: "#ffffff",
  nintendoPixelColor: "#63f5ff",
  crtScanColor: "#7cffad",
  crtScanFrequency: 0.11,
  crtBackgroundColor: "#0a140f",
  retroGameColor: "#00ff00",
  wavyPatternColor1: "#AB3E5B",
  wavyPatternColor2: "#FFBE40",
  angledPatternColor1: "#ECD078",
  angledPatternColor2: "#0B486B",
  bgPositionX: 50,
  bgPositionY: 50,
  bgSize: "cover",
  bgBlur: 0,
  bgBrightness: 100,
  bgFadeIn: 0.5,
  unsplashCategory: "spring-wallpapers",
  unsplashAccessKey: "",
  unsplashLastCredit: null,
  showTodoList: true,
  showTimer: false,
  showGregorian: true,
  showFullCalendar: false,
  showLunarCalendar: false,
  showClock: true,
  showDate: true,
  showNotepad: false,
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
  showQuickAccess: true,
  showBookmarks: true,
  showBookmarkGroups: true,
  showSearchBar: true,
  searchBarWidth: 600,
  showSearchAIIcon: true,
  searchEngine: "google",
  svgWaveActive: false,
  svgWaveLines: 5,
  svgWaveAmplitudeX: 200,
  svgWaveAmplitudeY: 80,
  svgWaveOffsetX: 0,
  svgWaveAngle: 0,
  svgWaveSmoothness: 0.5,
  svgWaveFill: true,
  svgWaveCraziness: 30,
  svgWaveStartHue: 200,
  svgWaveStartSaturation: 70,
  svgWaveStartLightness: 40,
  svgWaveEndHue: 280,
  svgWaveEndSaturation: 70,
  svgWaveEndLightness: 30,
  userSvgWaves: [],
  userSavedFonts: [],
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
    dateClockStyle: "default",
    hueTextMode: "off",
    analogMarkerMode: "quarters",
    analogBlurBackground: false,
    clockDatePriority: "none",
    hideSeconds: false,
    clockSize: "6",
    dateSize: "1.5",
    language: "en",
    accentColor: "#a8c0ff",
    effect: "none",
    gradientStart: "#0f0c29",
    gradientEnd: "#302b63",
    gradientAngle: "135",
    gradientType: "linear",
    gradientRepeating: false,
    gradientControlsOpen: true,
    gradientExtraColorCount: 2,
    gradientCustomColors: "",
    multiColorCount: 2,
    multiColors: ["#FF6B6B", "#4ECDC4"],
    multiGradientAngle: 135,
    multiColorMode: "smooth",
    multiColorControlsOpen: true,
    multiColorDividers: true,
    multiColorDividerColor: "#FFFFFF",
    multiColorDividerWidth: 1.2,
    multiColorFreeLineAngles: false,
    multiColorLineAngles: [],
    userBackgrounds: [],
    userColors: [],
    userAccentColors: [],
    userGradients: [],
    starColor: "#ffffff",
    meteorColor: "#ffffff",

    bookmarkFontSize: 10,
    bookmarkIconSize: 42,
    bookmarkGap: 8,
    bookmarkBgColor: "#ffffff",
    bookmarkBgOpacity: 100,
    bookmarkEnableDrag: false,
    bookmarkHideText: false,
    bookmarkHideBg: false,
    bookmarkTextColor: null,
    showTopRightControls: true,
    bookmarkShadowColor: "#000000",
    bookmarkShadowOpacity: 24,
    bookmarkShadowBlur: 8,

    clockDateStrokeWidth: 0,
    clockDateStrokeColor: "#000000",
    clockDateStrokeTarget: "both",

    clockColor: null,
    auraColor: "#a8c0ff",
    hackerColor: "#00FF00",
    sakuraColor: "#ffb7c5",
    snowfallColor: "#ffffff",
    bubbleColor: "#60c8ff",
    nintendoPixelColor: "#63f5ff",
    crtScanColor: "#7cffad",
    crtScanFrequency: 0.11,
    crtBackgroundColor: "#0a140f",
    bgPositionX: 50,
    bgPositionY: 50,
    bgSize: "cover",
    bgBlur: 0,
    unsplashCategory: "spring-wallpapers",
    showTodoList: true,
    showTimer: false,
    showGregorian: true,
    musicPlayerEnabled: false,
    showClock: true,
    showFullCalendar: false,
    showNotepad: false,
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
