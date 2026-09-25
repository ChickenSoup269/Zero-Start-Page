// --- State Management ---
import { showAlert } from "../utils/dialog.js"

// Gradient presets for random first-load background
import {
  defaultSettings,
  DEFAULT_MEDIA_ORB_IMAGE_URL,
} from "./state/defaultSettings.js"
export { defaultSettings, DEFAULT_MEDIA_ORB_IMAGE_URL }

import { MODULE_RESET_KEYS } from "./state/resetKeys.js"
export { MODULE_RESET_KEYS }

import {
  backupToCloud as performBackupToCloud,
  clearCloudBackup,
  restoreFromCloud as performRestoreFromCloud,
} from "./state/cloudSync.js"

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

// Parse once and reuse to avoid double JSON.parse + double localStorage.getItem
const storedSettingsRaw = localStorage.getItem("pageSettings")
const storedSettings = storedSettingsRaw ? JSON.parse(storedSettingsRaw) : {}

let settingsState = {
  ...defaultSettings,
  ...storedSettings,
}

if (!Object.prototype.hasOwnProperty.call(storedSettings, "calendarDateMode")) {
  settingsState.calendarDateMode = settingsState.showLunarCalendar
    ? "both"
    : "solar"
}
settingsState.showLunarCalendar = settingsState.calendarDateMode !== "solar"

// Migration for RSS hiding
if (storedSettingsRaw && !settingsState.rssHiddenMigrated) {
  settingsState.showRss = false
  settingsState.qaShowRss = false
  settingsState.qaShowHabits = false
  settingsState.qaShowAmbient = false
  settingsState.qaShowAiAssistant = false
  settingsState.rssHiddenMigrated = true
  localStorage.setItem("pageSettings", JSON.stringify(settingsState))
} else if (!storedSettingsRaw) {
  settingsState.rssHiddenMigrated = true
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

export function updateAllSettings(newSettings) {
  Object.assign(settingsState, newSettings)
}

export async function backupToCloud(options = {}) {
  return performBackupToCloud(options, { getSettings })
}

export { clearCloudBackup }

export async function restoreFromCloud() {
  return performRestoreFromCloud({ getSettings, updateAllSettings, saveSettings })
}

export function resetSettingsState() {
  const settings = getSettings()

  // Preserve user-saved data and current background selection
  const preserved = {
    background: settings.background,
    userBackgrounds: settings.userBackgrounds || [],
    userColors: settings.userColors || [],
    userAccentColors: settings.userAccentColors || [],
    userGradients: settings.userGradients || [],
    userMultiColors: settings.userMultiColors || [],
    userSvgWaves: settings.userSvgWaves || [],
    userGradientV2s: settings.userGradientV2s || [],
    userSilks: settings.userSilks || [],
    userLightPillars: settings.userLightPillars || [],
    userLiquidEthers: settings.userLiquidEthers || [],
    userSavedFonts: settings.userSavedFonts || [],
    unsplashAccessKey: settings.unsplashAccessKey || "",
    unsplashLastCredit: settings.unsplashLastCredit || null,
    language: settings.language || "en",
  }

  const newSettings = {
    ...defaultSettings,
    ...preserved,
    componentPositions: {},
    lockedWidgets: {},
  }

  settingsState = newSettings
  saveSettings()
  return newSettings
}

export function saveBookmarks() {
  localStorage.setItem("bookmarks", JSON.stringify(bookmarksState))
  window.dispatchEvent(new CustomEvent("bookmarkGroupsChanged"))
}

export const saveComponentPosition = (componentId, position) => {
  const settings = getSettings()
  if (!settings.componentPositions) settings.componentPositions = {}
  settings.componentPositions[componentId] = position
  saveSettings(true)
}

export const resetComponentPositions = (options = {}) => {
  const currentSettings = settingsState

  // Default to all false if no options provided
  const {
    all = false,
    positions = false,
    effectColors = false,
    styles = false,
  } = options

  const preservedKeys = [
    "userBackgrounds",
    "userColors",
    "userAccentColors",
    "userGradients",
    "userMultiColors",
    "userSvgWaves",
    "userGradientV2s",
    "userSilks",
    "userLightPillars",
    "userLiquidEthers",
    "userSavedFonts",
    "unsplashAccessKey",
    "unsplashLastCredit",
    "background",
    "language",
  ]

  let newSettings = { ...currentSettings }

  if (all) {
    newSettings = { ...defaultSettings }
    // Khôi phục các dữ liệu cần bảo tồn
    preservedKeys.forEach((key) => {
      if (currentSettings[key] !== undefined) {
        newSettings[key] = currentSettings[key]
      }
    })
    newSettings.componentPositions = {}
    newSettings.lockedWidgets = {}
  } else {
    // Reset từng phần
    if (positions) {
      newSettings.componentPositions = {}
      newSettings.lockedWidgets = {}
    }

    if (effectColors) {
      const effectColorKeys = [
        "starColor",
        "meteorColor",
        "auraColor",
        "northernLightsColor",
        "reunificationDayMode",
        "reunificationDayPalace",
        "reunificationDayTanks",
        "reunificationDayDoves",
        "reunificationDayTexts",
        "reunificationDayClick",
        "reunificationDaySpeed",
        "reunificationDayTransparent",
        "hackerColor",
        "hackerMode",
        "matrixColor",
        "matrixStyle",
        "pixelCubesColor",
        "pixelCubesShape",
        "sakuraColor",
        "snowfallColor",
        "sunbeamColor",
        "sunbeamMode",
        "bubbleColor",
        "rainHDColor",
        "rainMode",
        "rainSpeed",
        "rainDensity",
        "rainMist",
        "firefliesColor",
        "firefliesMode",
        "musicBarsColor",
        "musicBarsNotes",
        "wavyLinesColor",
        "wavyLinesMode",
        "tetFireworksText",
        "tetFireworksText1",
        "tetFireworksText2",
        "tetFireworksText3",
        "tetFireworksText4",
        "tetFireworksText5",
        "tetFireworksText6",
        "tetFireworksType",
        "tetFireworksSound",
        "oceanWaveColor",
        "cloudDriftColor",
        "cloudDriftMood",
        "cloudDriftOpacity",
        "cloudDriftSpeed",
        "shinyColor",
        "lineShinyColor",
        "lineShinyMode",
        "nintendoPixelMode",
        "nintendoPixelColor",
        "crtScanColor",
        "crtBackgroundColor",
        "retroGameColor",
        "wavyPatternColor1",
        "wavyPatternColor2",
        "angledPatternColor1",
        "angledPatternColor2",
        "cursorTrailColor",
        "flashlightColor",
        "gridScanColor",
        "plantGrowthColor",
        "plantGrowthMode",
        "oceanFishColor",
        "oceanFishStyle",
        "lightPillarsColor",
        "lightPillarsMode",
        "lightPillarsCount",
        "floatingLinesColor",
        "floatingLinesAngle",
        "floatingLinesSpeed",
        "floatingLinesCount",
        "floatingLinesTransparent",
        "hyperspaceColor",
        "hyperspaceStyle",
        "hyperspaceSpeed",
        "hyperspaceStarCount",
        "hyperspaceTransparent",
        "auroraWaveColor",
        "auroraWaveBrightness",
        "auroraWaveSpeed",
        "auroraWaveAmplitude",
        "auroraWaveTransparent",
        "auroraWaveBgColor",
        "auroraWaveBgOpacity",
        "auroraWaveNotes",
      ]
      effectColorKeys.forEach((key) => {
        if (defaultSettings[key] !== undefined) {
          newSettings[key] = defaultSettings[key]
        }
      })
    }

    if (styles) {
      const styleKeys = [
        "accentColor",
        "accentColorMode",
        "m3PaletteStyle",
        "theme",
        "font",
        "clockFont",
        "clockSize",
        "dateSize",
        "clockColor",
        "dateColor",
        "customTitleColor",
        "customTitleFontSize",
        "bookmarkBgColor",
        "bookmarkTextColor",
        "bookmarkGroupBgColor",
        "bookmarkGroupTextColor",
        "bookmarkGroupAutoTextContrast",
        "bookmarkGroupBorderRadius",
        "bookmarkGroupKeepBgOnInteraction",
        "clockDateStrokeColor",
        "clockDateStrokeWidth",
        "sidebarSectionFontWeight",
        "sidebarLabelFontWeight",
        "sidebarNavFontWeight",
        "sidebarValueFontWeight",
        "settingsCardBgMode",
        "settingsCardTitleAccent",
      ]
      styleKeys.forEach((key) => {
        if (defaultSettings[key] !== undefined) {
          newSettings[key] = defaultSettings[key]
        }
      })
    }
  }

  // Ghi đè state hiện tại
  settingsState = newSettings

  try {
    localStorage.setItem("startpageShowStartupLoader", "1")
  } catch (e) {
    console.warn("Could not mark startup loader for reset reload", e)
  }

  // Lưu và tải lại
  saveSettings(true)
  window.location.reload()
}

export function resetSettingsModules(modules = []) {
  const selectedModules = Array.isArray(modules) ? modules : [modules]
  if (selectedModules.length === 0) return settingsState

  const resetKeys = (keys = []) => {
    keys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(defaultSettings, key)) {
        settingsState[key] = defaultSettings[key]
      }
    })
  }

  selectedModules.forEach((moduleName) => {
    resetKeys(MODULE_RESET_KEYS[moduleName])
  })

  if (selectedModules.includes("timer")) {
    settingsState.timerMinimized = false
  }

  if (selectedModules.includes("layout")) {
    settingsState.componentPositions = {}
    settingsState.lockedWidgets = {}
  }

  try {
    localStorage.setItem("startpageShowStartupLoader", "1")
  } catch (e) {
    console.warn("Could not mark startup loader for module reset", e)
  }

  saveSettings(true)
  return settingsState
}

let saveSettingsTimeout = null
export function saveSettings(immediate = false) {
  const performSave = () => {
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

  if (immediate) {
    if (saveSettingsTimeout) clearTimeout(saveSettingsTimeout)
    performSave()
  } else {
    if (saveSettingsTimeout) clearTimeout(saveSettingsTimeout)
    saveSettingsTimeout = setTimeout(performSave, 300) // Debounce localStorage saving to improve INP
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

