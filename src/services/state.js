// --- State Management ---
import { showAlert } from "../utils/dialog.js"

// Gradient presets for random first-load background
const _GRADIENT_PRESETS = [
  { gradientStart: "#0a1f11", gradientEnd: "#1d472c", gradientAngle: "135" },
  { gradientStart: "#14301d", gradientEnd: "#24553b", gradientAngle: "160" },
  { gradientStart: "#0a1a0f", gradientEnd: "#1a3e21", gradientAngle: "150" },
  { gradientStart: "#1a2e1f", gradientEnd: "#163e26", gradientAngle: "135" },
  { gradientStart: "#0d2a1b", gradientEnd: "#1b4332", gradientAngle: "145" },
  { gradientStart: "#0b100c", gradientEnd: "#1f3325", gradientAngle: "160" },
  { gradientStart: "#0f271c", gradientEnd: "#204332", gradientAngle: "135" },
  { gradientStart: "#0e3314", gradientEnd: "#0d4d23", gradientAngle: "145" },
  { gradientStart: "#092e07", gradientEnd: "#124f11", gradientAngle: "150" },
  { gradientStart: "#0a2814", gradientEnd: "#1c6e3b", gradientAngle: "140" },
  { gradientStart: "#032107", gradientEnd: "#095c12", gradientAngle: "135" },
  { gradientStart: "#00190a", gradientEnd: "#00732e", gradientAngle: "145" },
]
const _initialGradient =
  _GRADIENT_PRESETS[Math.floor(Math.random() * _GRADIENT_PRESETS.length)]

const defaultSettings = {
  background: null,
  font: "'Outfit', sans-serif",
  dateFormat: "full",
  shortWeekday: false,
  timeFormat: "24h", // "12h" or "24h"
  timezone: "local",
  dateClockStyle: "default",

  showCustomTitle: true,
  freeMoveCustomTitle: false,
  customTitleText: "",
  customTitleMulticolor: false,
  customTitleColor: "#ffffff",
  customTitleFontSize: 24,
  customTitleLetterSpacing: 0,
  customTitleShadowBlur: 0,
  customTitleShadowY: 0,
  customTitleShadowColor: "#000000",
  customTitleBorderSize: 0,
  customTitleBorderColor: "#000000",

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
  accentColor: "#00ff73",
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
  bookmarkGroupBgColor: "#ffffff",
  bookmarkGroupBgOpacity: 0,
  bookmarkGroupTextColor: null,
  bookmarkGroupFontSize: 14,
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
  pixelCubesColor: "#00ff73",
  sakuraColor: "#ffb7c5",
  snowfallColor: "#ffffff",
  fallingLeavesSkin: "maple",
  bubbleColor: "#60c8ff",
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
  retroGameType: "space_invaders",
  retroGameColor: "#00ff00",
  wavyPatternColor1: "#AB3E5B",
  wavyPatternColor2: "#FFBE40",
  angledPatternColor1: "#ECD078",
  angledPatternColor2: "#0B486B",
  cursorTrailColor: "#60c8ff",
  cursorTrailClickExplosion: true,
  cursorTrailRandomColor: false,
  plantGrowthColor: "#4caf50",
  oceanFishColor: "#ff7f50",
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
  todoShowCheckboxes: true,
  showTimer: false,
  showGregorian: true,
  showFullCalendar: false,
  showLunarCalendar: false,
  showClock: true,
  showDate: true,
  showNotepad: false,
  musicPlayerEnabled: false,
  componentPositions: {},
  lockedWidgets: {},
  musicBarStyle: "vinyl",
  musicVisualizerStyle: "bars",
  timerInitialTime: 0,
  timerCurrentTime: 0,
  timerEndTime: 0,
  timerIsRunning: false,
  musicPlayerExpanded: false,
  sideControlsGhostMode: false,
  showQuickAccess: true,
  showDonateButton: true,
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
    shortWeekday: false,
    timeFormat: "24h",
    timezone: "local",
    dateClockStyle: "default",
    hueTextMode: "off",
    analogMarkerMode: "quarters",
    analogBlurBackground: false,
    clockDatePriority: "none",
    hideSeconds: false,
    clockSize: "6",
    dateSize: "1.5",
    language: "en",
    accentColor: "#00ff73",
    effect: "none",
    gradientStart: "#0a1f11",
    gradientEnd: "#1d472c",
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
    bookmarkGroupBgColor: "#ffffff",
    bookmarkGroupBgOpacity: 20,
    bookmarkGroupTextColor: null,
    bookmarkGroupFontSize: 14,
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
    pixelCubesColor: "#00ff73",
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
    todoShowCheckboxes: true,
    showTimer: false,
    showGregorian: true,
    musicPlayerEnabled: false,
    showClock: true,
    showFullCalendar: false,
    showNotepad: false,
    componentPositions: {},
    lockedWidgets: {},
    musicBarStyle: "vinyl",
    musicVisualizerStyle: "bars",
    timerInitialTime: 0,
    timerCurrentTime: 0,
    timerEndTime: 0,
    timerIsRunning: false,
    musicPlayerExpanded: false,
    showQuickAccess: true,
    showDonateButton: true,
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
