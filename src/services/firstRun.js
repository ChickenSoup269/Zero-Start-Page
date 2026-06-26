import { applyTranslations, geti18n, loadLanguage } from "./i18n.js"
import {
  getBookmarkState,
  setActiveGroupId,
  setBookmarkGroups,
  updateSetting,
  updateAllSettings,
  saveBookmarks,
  saveSettings,
} from "./state.js"
import {
  showAlert,
  showChecklistConfirm,
  showChoiceConfirm,
  showPrompt,
} from "../utils/dialog.js"

const FIRST_RUN_BG_KEY = "startpageFirstRunSvgBgV1"
const FIRST_RUN_LANGUAGE_KEY = "startpageFirstRunLanguageV1"
const FIRST_RUN_STYLE_KEY = "startpageFirstRunStyleV1"
const FIRST_RUN_NAME_KEY = "startpageFirstRunNameV1"
const FIRST_RUN_ZOOM_KEY = "startpageFirstRunZoomTipV1"
const FIRST_RUN_OPEN_SOURCE_KEY = "startpageFirstRunOpenSourceNoticeV1"
const FIRST_RUN_IMPORT_KEY = "startpageFirstRunBookmarkImportV1"
const FIRST_RUN_SETTINGS_GUIDE_KEY = "startpageFirstRunSettingsGuideV1"
const FIRST_RUN_GUIDE_CONGRATS_KEY = "startpageFirstRunGuideCongratsV1"
const FIRST_RUN_ONBOARDING_DONE_KEY = "startpageFirstRunOnboardingDoneV1"
const REPO_URL = "https://github.com/ChickenSoup269/Zero-Start-Page"
const REPO_ISSUES_URL = `${REPO_URL}/issues`

const SVG_WAVE_PRESETS = [
  {
    start: [186, 82, 42],
    end: [258, 76, 34],
    angle: -8,
    ampX: 260,
    ampY: 92,
    accent: "#21c7df",
  },
  {
    start: [152, 72, 38],
    end: [205, 84, 36],
    angle: 12,
    ampX: 230,
    ampY: 86,
    accent: "#27d08a",
  },
  {
    start: [312, 76, 44],
    end: [24, 88, 42],
    angle: -14,
    ampX: 250,
    ampY: 96,
    accent: "#e648b8",
  },
  {
    start: [38, 92, 48],
    end: [174, 72, 34],
    angle: 9,
    ampX: 240,
    ampY: 84,
    accent: "#f0ad23",
  },
  {
    start: [218, 88, 48],
    end: [286, 74, 38],
    angle: 16,
    ampX: 280,
    ampY: 102,
    accent: "#4d8cff",
  },
]

const pick = (items) => items[Math.floor(Math.random() * items.length)]
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min

export function prepareFirstRunDefaults() {
  if (localStorage.getItem(FIRST_RUN_BG_KEY)) return false
  if (localStorage.getItem("pageSettings")) {
    localStorage.setItem(FIRST_RUN_BG_KEY, "skipped-existing")
    return false
  }

  const preset = pick(SVG_WAVE_PRESETS)
  const firstWaveUid = `svg-wave-first-run-${Date.now()}`
  const firstWave = {
    uid: firstWaveUid,
    lines: randomInt(5, 8),
    amplitudeX: preset.ampX + randomInt(-24, 24),
    amplitudeY: preset.ampY + randomInt(-12, 16),
    offsetX: randomInt(-28, 28),
    angle: preset.angle + randomInt(-5, 5),
    smoothness: 0.62,
    fill: true,
    craziness: randomInt(22, 36),
    startHue: preset.start[0],
    startSaturation: preset.start[1],
    startLightness: preset.start[2],
    endHue: preset.end[0],
    endSaturation: preset.end[1],
    endLightness: preset.end[2],
  }
  updateAllSettings({
    background: null,
    activeBgUid: firstWaveUid,
    effect: "none",
    multiColorActive: false,
    gradientV2Active: false,
    silkActive: false,
    lightPillarActive: false,
    liquidEtherActive: false,
    splashCursorActive: false,
    svgWaveActive: true,
    svgWaveFill: firstWave.fill,
    svgWaveLines: firstWave.lines,
    svgWaveAmplitudeX: firstWave.amplitudeX,
    svgWaveAmplitudeY: firstWave.amplitudeY,
    svgWaveOffsetX: firstWave.offsetX,
    svgWaveAngle: firstWave.angle,
    svgWaveSmoothness: firstWave.smoothness,
    svgWaveCraziness: firstWave.craziness,
    svgWaveStartHue: firstWave.startHue,
    svgWaveStartSaturation: firstWave.startSaturation,
    svgWaveStartLightness: firstWave.startLightness,
    svgWaveEndHue: firstWave.endHue,
    svgWaveEndSaturation: firstWave.endSaturation,
    svgWaveEndLightness: firstWave.endLightness,
    userSvgWaves: [firstWave],
    accentColor: preset.accent,
  })
  saveSettings(true)
  localStorage.setItem(FIRST_RUN_BG_KEY, "applied")
  return true
}

const chromeBookmarksAvailable = () =>
  typeof chrome !== "undefined" && Boolean(chrome.bookmarks?.getTree)

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const getFaviconUrl = (url) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=32`

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const waitForAnimationFrames = (count = 2) =>
  new Promise((resolve) => {
    const step = (remaining) => {
      if (remaining <= 0) {
        resolve()
        return
      }
      requestAnimationFrame(() => step(remaining - 1))
    }
    step(count)
  })

function setFirstRunOnboardingActive(isActive) {
  window.startpageFirstRunActive = isActive
  if (!isActive) {
    window.dispatchEvent(new CustomEvent("startpage:firstRunSettled"))
  }
}

function isUpdateNoticeVisible() {
  const popup = document.getElementById("update-notification-popup")
  if (!popup) return false
  const style = window.getComputedStyle(popup)
  return style.display !== "none" && style.visibility !== "hidden"
}

function waitForStartupOverlayHidden(timeout = 6000) {
  const isHidden = () => {
    const overlay = document.getElementById("startup-overlay")
    if (!overlay) return true
    const style = window.getComputedStyle(overlay)
    return style.visibility === "hidden" || Number.parseFloat(style.opacity || "1") <= 0.01
  }

  if (isHidden()) return Promise.resolve()

  return new Promise((resolve) => {
    const startedAt = performance.now()
    const finish = () => {
      window.removeEventListener("startpage:appRevealed", finish)
      resolve()
    }

    window.addEventListener("startpage:appRevealed", finish, { once: true })

    const tick = () => {
      if (isHidden() || performance.now() - startedAt > timeout) {
        finish()
        return
      }
      requestAnimationFrame(tick)
    }
    tick()
  })
}

function waitForUpdateNoticeSettled(timeout = 8000) {
  if (!window.startpageUpdateNoticePending && !isUpdateNoticeVisible()) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    let done = false
    let checkTimer = null
    let timeoutTimer = null

    const finish = () => {
      if (done) return
      done = true
      window.removeEventListener("startpage:updateNoticeSettled", check)
      if (checkTimer) clearInterval(checkTimer)
      if (timeoutTimer) clearTimeout(timeoutTimer)
      resolve()
    }

    function check() {
      if (!window.startpageUpdateNoticePending && !isUpdateNoticeVisible()) {
        finish()
      }
    }

    window.addEventListener("startpage:updateNoticeSettled", check)
    checkTimer = setInterval(check, 250)
    timeoutTimer = setTimeout(() => {
      if (!isUpdateNoticeVisible()) finish()
    }, timeout)
    check()
  })
}

const FIRST_RUN_STYLE_PRESETS = {
  dock: {
    bookmarkLayout: "taskbar",
    bookmarkLayoutBgStyle: "default",
    bookmarkItemStyle: "default",
    bookmarkHideText: true,
    bookmarkHideBg: false,
    bookmarkHideScrollbar: false,
    bookmarkMacosHover: true,
    bookmarkFontSize: 10,
    bookmarkIconSize: 46,
    bookmarkGroupTextWidth: 120,
    bookmarkGap: 8,
    bookmarkBgColor: "#ffffff",
    bookmarkBgOpacity: 92,
    bookmarkGroupBgColor: "#ffffff",
    bookmarkGroupBgOpacity: 0,
    bookmarkGroupTextColor: null,
    bookmarkGroupAutoTextContrast: false,
    bookmarkGroupFontSize: 13,
    bookmarkGroupContainerBgHidden: true,
    bookmarkShadowColor: "#000000",
    bookmarkShadowOpacity: 22,
    bookmarkShadowBlur: 10,
    musicBarStyle: "pill",
    musicPlayerSkin: "white-blur",
  },
  clean: {
    bookmarkLayout: "default",
    bookmarkLayoutBgStyle: "default",
    bookmarkItemStyle: "default",
    bookmarkHideText: false,
    bookmarkHideBg: true,
    bookmarkHideScrollbar: false,
    bookmarkMacosHover: false,
    bookmarkFontSize: 10,
    bookmarkIconSize: 42,
    bookmarkGroupTextWidth: 120,
    bookmarkGap: 10,
    bookmarkBgColor: "#ffffff",
    bookmarkBgOpacity: 0,
    bookmarkGroupBgColor: "#ffffff",
    bookmarkGroupBgOpacity: 0,
    bookmarkGroupTextColor: null,
    bookmarkGroupAutoTextContrast: false,
    bookmarkGroupFontSize: 14,
    bookmarkGroupContainerBgHidden: true,
    bookmarkShadowColor: "#000000",
    bookmarkShadowOpacity: 14,
    bookmarkShadowBlur: 6,
    musicBarStyle: "minimal",
    musicPlayerSkin: "white-blur",
  },
  sidebar: {
    bookmarkLayout: "sidebar",
    bookmarkLayoutBgStyle: "default",
    bookmarkItemStyle: "default",
    bookmarkHideText: false,
    bookmarkHideBg: false,
    bookmarkHideScrollbar: false,
    bookmarkMacosHover: false,
    bookmarkFontSize: 10,
    bookmarkIconSize: 38,
    bookmarkGroupTextWidth: 120,
    bookmarkGap: 7,
    bookmarkBgColor: "#ffffff",
    bookmarkBgOpacity: 56,
    bookmarkGroupBgColor: "#ffffff",
    bookmarkGroupBgOpacity: 0,
    bookmarkGroupTextColor: null,
    bookmarkGroupAutoTextContrast: false,
    bookmarkGroupFontSize: 14,
    bookmarkGroupContainerBgHidden: true,
    bookmarkShadowColor: "#000000",
    bookmarkShadowOpacity: 20,
    bookmarkShadowBlur: 8,
    musicBarStyle: "sidebar",
    musicPlayerSkin: "white-blur",
  },
}

const getChromeBookmarkTree = () =>
  new Promise((resolve, reject) => {
    try {
      chrome.bookmarks.getTree((tree) => {
        const error = chrome.runtime?.lastError
        if (error) reject(new Error(error.message))
        else resolve(tree || [])
      })
    } catch (error) {
      reject(error)
    }
  })

function directBookmarksFromFolder(folder, existingUrls) {
  return (folder.children || [])
    .filter((child) => child.url && !existingUrls.has(child.url))
    .map((child) => {
      existingUrls.add(child.url)
      return {
        title: child.title || child.url,
        url: child.url,
        icon: "",
      }
    })
}

function getDirectBookmarkNodes(folder) {
  return (folder.children || []).filter((child) => child.url)
}

function collectBookmarkUrls(node, items = []) {
  if (!node) return items
  if (node.url) {
    items.push(node)
    return items
  }
  ;(node.children || []).forEach((child) => collectBookmarkUrls(child, items))
  return items
}

function getFolderPath(pathParts, fallbackName) {
  return pathParts.filter(Boolean).join(" / ") || fallbackName
}

function getFolderOptionLabel(node, pathParts, i18n) {
  const items = getDirectBookmarkNodes(node)
  const fallbackName = i18n.first_run_import_bookmarks_folder || "Folder"
  const title = getFolderPath(pathParts, fallbackName)
  const examples = items
    .slice(0, 3)
    .map((item) => item.title || item.url)
    .filter(Boolean)

  const exampleText = examples.length
    ? `${i18n.first_run_import_bookmarks_example || "Example"}: ${examples
        .map(escapeHtml)
        .join(", ")}`
    : i18n.first_run_import_bookmarks_empty || "No bookmarks inside"

  return `
    <span class="dialog-check-main">
      <span class="dialog-check-title">${escapeHtml(title)}</span>
      <small class="dialog-check-desc">
        ${(
          i18n.first_run_import_bookmarks_count || "{count} bookmarks"
        ).replace("{count}", items.length)}
        ${items.length ? ` · ${exampleText}` : ""}
      </small>
    </span>
  `
}

function getBookmarkOptionLabel(node, pathParts, i18n) {
  const title = node.title || node.url
  const folderPath = getFolderPath(
    pathParts,
    i18n.first_run_import_bookmarks_folder || "Folder",
  )

  return `
    <img
      class="dialog-check-favicon"
      src="${getFaviconUrl(node.url)}"
      alt=""
      loading="eager"
    />
    <span class="dialog-check-main">
      <span class="dialog-check-title">${escapeHtml(title)}</span>
      <small class="dialog-check-desc">
        ${escapeHtml(i18n.first_run_import_bookmarks_single || "Bookmark")}
        · ${escapeHtml(folderPath)}
      </small>
    </span>
  `
}

function collectImportOptions(nodes, i18n, pathParts = [], result = null) {
  const output = result || { folders: [], bookmarks: [] }
  nodes.forEach((node) => {
    const nextPath = node.title ? [...pathParts, node.title] : pathParts
    if (node.url) {
      output.bookmarks.push({
        key: `bookmark:${node.id}`,
        label: getBookmarkOptionLabel(node, pathParts, i18n),
        checked: false,
      })
      return
    }

    const items = getDirectBookmarkNodes(node)
    if (items.length) {
      output.folders.push({
        key: `folder:${node.id}`,
        label: getFolderOptionLabel(node, nextPath, i18n),
        checked: false,
      })
    }
    collectImportOptions(node.children || [], i18n, nextPath, output)
  })

  return output
}

function buildImportOptions(nodes, i18n) {
  const { folders, bookmarks } = collectImportOptions(nodes, i18n)
  const options = []

  if (folders.length) {
    options.push({
      type: "section",
      icon: "fa-solid fa-folder-tree",
      label: i18n.first_run_import_folder_section || "Folders",
    })
    options.push(...folders)
  }

  if (bookmarks.length) {
    options.push({
      type: "section",
      icon: "fa-solid fa-link",
      label: i18n.first_run_import_bookmark_section || "Individual bookmarks",
    })
    options.push(...bookmarks)
  }

  return options
}

function collectSelectedBookmarkItems(
  node,
  selection,
  existingUrls,
  items = [],
) {
  if (!node) return items
  if (node.url) {
    if (selection[`bookmark:${node.id}`] && !existingUrls.has(node.url)) {
      existingUrls.add(node.url)
      items.push({
        title: node.title || node.url,
        url: node.url,
        icon: "",
      })
    }
    return items
  }

  ;(node.children || []).forEach((child) =>
    collectSelectedBookmarkItems(child, selection, existingUrls, items),
  )
  return items
}

function collectChromeGroups(
  node,
  groups,
  existingUrls,
  selection,
  fallbackName,
) {
  if (!node?.children) return

  const shouldImportFolder = selection[`folder:${node.id}`]
  const items = shouldImportFolder
    ? directBookmarksFromFolder(node, existingUrls)
    : []
  if (items.length) {
    groups.push({
      id: `chrome-${Date.now()}-${groups.length}`,
      name: node.title || fallbackName,
      items,
    })
  }

  node.children
    .filter((child) => child.children)
    .forEach((child) =>
      collectChromeGroups(
        child,
        groups,
        existingUrls,
        selection,
        child.title || fallbackName,
      ),
    )
}

function hasOnlyEmptyDefaultGroup(groups) {
  return (
    groups.length === 1 &&
    (!groups[0].items || groups[0].items.length === 0) &&
    (!groups[0].name || groups[0].name === "Main" || groups[0].id === "group-1")
  )
}

async function promptFirstRunLanguage() {
  if (localStorage.getItem(FIRST_RUN_LANGUAGE_KEY)) return

  const selectedLanguage = await showChoiceConfirm(
    [
      {
        key: "vi",
        label: "Tiếng Việt",
        description: "Dùng giao diện tiếng Việt.",
        icon: "fa-solid fa-language",
      },
      {
        key: "en",
        label: "English",
        description: "Use the English interface.",
        icon: "fa-solid fa-globe",
      },
    ],
    "Chọn ngôn ngữ / Choose Language",
    "Chọn ngôn ngữ trước khi bắt đầu. You can change this later in Settings.",
  )

  const language = selectedLanguage || "en"
  updateSetting("language", language)
  saveSettings(true)
  await loadLanguage(language)
  applyTranslations()
  document.documentElement.lang = language
  window.dispatchEvent(
    new CustomEvent("startpage:languageChanged", {
      detail: { language },
    }),
  )
  localStorage.setItem(FIRST_RUN_LANGUAGE_KEY, language)
}

async function promptFirstRunUserName() {
  if (localStorage.getItem(FIRST_RUN_NAME_KEY)) return

  const i18n = geti18n()
  const rawName = await showPrompt(
    i18n.first_run_name_prompt || "What should your Start Page call you?",
    "",
    i18n.first_run_name_title || "Your name",
  )
  const name =
    typeof rawName === "string"
      ? rawName.trim().replace(/\s+/g, " ").slice(0, 40)
      : ""

  if (!name) {
    localStorage.setItem(FIRST_RUN_NAME_KEY, "skipped")
    return
  }

  const greeting = (
    i18n.first_run_custom_title_greeting || "Hello, {name}"
  ).replace("{name}", name)

  updateSetting("customTitleText", greeting)
  updateSetting("showCustomTitle", true)
  saveSettings(true)
  window.dispatchEvent(
    new CustomEvent("layoutUpdated", {
      detail: { key: "customTitleText", value: greeting },
    }),
  )
  window.dispatchEvent(
    new CustomEvent("layoutUpdated", {
      detail: { key: "showCustomTitle", value: true },
    }),
  )
  localStorage.setItem(FIRST_RUN_NAME_KEY, name)
}

function applyFirstRunStyleToBody(layout) {
  document.body.classList.remove(
    "bookmark-sidebar-mode",
    "bookmark-taskbar-mode",
    "bookmark-taskbar-top-mode",
    "bookmark-taskbar-left-mode",
  )

  if (layout === "sidebar") {
    document.body.classList.add("bookmark-sidebar-mode")
  } else if (layout === "taskbar") {
    document.body.classList.add("bookmark-taskbar-mode")
  } else if (layout === "taskbar-top") {
    document.body.classList.add("bookmark-taskbar-top-mode")
  } else if (layout === "taskbar-left") {
    document.body.classList.add("bookmark-taskbar-left-mode")
  }
}

async function promptFirstRunStyle(renderBookmarks) {
  if (localStorage.getItem(FIRST_RUN_STYLE_KEY)) return

  const i18n = geti18n()
  const selectedStyle = await showChoiceConfirm(
    [
      {
        key: "dock",
        label: i18n.first_run_style_dock || "Dock",
        description:
          i18n.first_run_style_dock_desc ||
          "Bottom dock, compact icons, easy for new tabs.",
        icon: "fa-solid fa-grip",
      },
      {
        key: "clean",
        label: i18n.first_run_style_clean || "Clean",
        description:
          i18n.first_run_style_clean_desc ||
          "Simple centered bookmarks with minimal background.",
        icon: "fa-solid fa-wand-magic-sparkles",
      },
      {
        key: "sidebar",
        label: i18n.first_run_style_sidebar || "Sidebar",
        description:
          i18n.first_run_style_sidebar_desc ||
          "Vertical folder list for heavier bookmark use.",
        icon: "fa-solid fa-table-columns",
      },
    ],
    i18n.first_run_style_title || "Choose a start style",
    i18n.first_run_style_prompt ||
      "Pick a layout to start with. You can change it later in Settings.",
  )

  if (selectedStyle && FIRST_RUN_STYLE_PRESETS[selectedStyle]) {
    const preset = FIRST_RUN_STYLE_PRESETS[selectedStyle]
    Object.entries(preset).forEach(([key, value]) => updateSetting(key, value))
    updateSetting("interfaceStylePreset", selectedStyle)
    saveSettings(true)
    applyFirstRunStyleToBody(preset.bookmarkLayout)
    if (typeof window.appApplySettings === "function") {
      window.appApplySettings()
    }
    renderBookmarks?.()
    window.dispatchEvent(
      new CustomEvent("settingsUpdated", {
        detail: { key: "musicBarStyle", value: preset.musicBarStyle },
      }),
    )
  }

  localStorage.setItem(FIRST_RUN_STYLE_KEY, selectedStyle || "skipped")
}

async function promptFirstRunZoomTip() {
  if (localStorage.getItem(FIRST_RUN_ZOOM_KEY)) return

  const i18n = geti18n()
  await showAlert(
    `
      <div class="first-run-zoom-tip">
        <p class="first-run-zoom-lead">
          ${
            i18n.first_run_zoom_prompt ||
            "For the best spacing on the start page, try one of these browser zoom levels:"
          }
        </p>
        <div class="first-run-zoom-options" aria-label="Recommended zoom levels">
          <div class="first-run-zoom-card">
            <span class="zoom-percent">90%</span>
            <span>${i18n.first_run_zoom_balanced || "Balanced"}</span>
          </div>
          <div class="first-run-zoom-card recommended">
            <span class="zoom-percent">80%</span>
            <span>${i18n.recommended || "Recommended"}</span>
          </div>
          <div class="first-run-zoom-card">
            <span class="zoom-percent">75%</span>
            <span>${i18n.first_run_zoom_compact || "Compact"}</span>
          </div>
        </div>
        <div class="first-run-zoom-shortcuts">
          <span class="zoom-key"><kbd>Ctrl</kbd><kbd>-</kbd></span>
          <span class="zoom-key"><kbd>Ctrl</kbd><span class="zoom-wheel">${i18n.first_run_zoom_wheel || "Mouse wheel"}</span></span>
          <span class="zoom-key zoom-key-icon"><i class="fa-solid fa-magnifying-glass-minus"></i></span>
        </div>
        <small class="first-run-zoom-note">
          ${
            i18n.first_run_zoom_note ||
            "You can change this anytime from the browser zoom menu. The page will still work at 100%, but 80% usually shows more widgets without crowding."
          }
        </small>
      </div>
    `,
    i18n.first_run_zoom_title || "Recommended browser zoom",
  )

  localStorage.setItem(FIRST_RUN_ZOOM_KEY, "shown")
}

function getFirstRunSettingsGuideSteps(i18n) {
  return [
    {
      selector: "#settings-sidebar .sidebar-header",
      icon: "fa-solid fa-sliders",
      title: i18n.first_run_guide_settings_title || "Settings hub",
      text:
        i18n.first_run_guide_settings_desc ||
        "This sidebar is where you tune your start page. The guide will walk through the main areas you can customize.",
    },
    {
      selector: "#language-select",
      icon: "fa-solid fa-language",
      title: i18n.settings_language || "Language",
      text:
        i18n.first_run_guide_language_desc ||
        "Change the interface language here. You can also open the custom language tools if you want to add another translation.",
    },
    {
      selector: "#page-title-input",
      icon: "fa-solid fa-heading",
      title: i18n.settings_page_title || "Page title",
      text:
        i18n.first_run_guide_page_title_desc ||
        "Set the browser tab title and the small tab icon so this page feels like your own workspace.",
    },
    {
      selector: '[data-section-id="themes"]',
      icon: "fa-solid fa-palette",
      title: i18n.settings_themes || "Themes",
      text:
        i18n.first_run_guide_themes_desc ||
        "Start from a theme preset, save your current look, try style presets, or open Theme Web Beta to browse shared looks.",
    },
    {
      selector: '[data-section-id="background"]',
      icon: "fa-solid fa-image",
      title: i18n.settings_bg || "Background",
      text:
        i18n.first_run_guide_background_desc ||
        "Add an image, video, color, Unsplash photo, or saved local background. This section also controls blur, brightness, fit, and saved galleries.",
    },
    {
      selector: "#accent-color-group",
      icon: "fa-solid fa-droplet",
      title: i18n.settings_accent || "Accent color",
      text:
        i18n.first_run_guide_accent_desc ||
        "Pick the main accent color, extract it from the current background, or let widgets follow the same color system.",
    },
    {
      selector: '[data-section-id="gradient-multi-color"]',
      icon: "fa-solid fa-fill-drip",
      title: i18n.settings_gradient_multi_title || "Gradient & Multi-Color",
      text:
        i18n.first_run_guide_gradient_desc ||
        "Build gradient, SVG wave, and multi-color backgrounds. The Visual Preset Hub can copy or apply a full shareable visual bundle.",
    },
    {
      selector: '[data-section-id="animated-backgrounds"]',
      icon: "fa-solid fa-wand-magic-sparkles",
      title: i18n.settings_animated_backgrounds || "Animated backgrounds",
      text:
        i18n.first_run_guide_animated_desc ||
        "Use richer animated backgrounds such as gradient motion, silk, light pillars, liquid light, or splash cursor effects.",
    },
    {
      selector: '[data-section-id="special-effects"]',
      icon: "fa-solid fa-star",
      title: i18n.settings_effect || "Effects",
      text:
        i18n.first_run_guide_effects_desc ||
        "Choose overlay effects and tune their colors. These are lighter visual layers that sit above your background.",
    },
    {
      selector: '[data-section-id="font"]',
      icon: "fa-solid fa-font",
      title: i18n.settings_font || "Font",
      text:
        i18n.first_run_guide_font_desc ||
        "Change the general font, clock font, or load and save a Google Font for later.",
    },
    {
      selector: '[data-section-id="date-clock"]',
      icon: "fa-solid fa-clock",
      title: i18n.settings_date_format || "Date & Clock",
      text:
        i18n.first_run_guide_clock_desc ||
        "Customize time format, date format, clock style, colors, size, and display mode.",
    },
    {
      selector: '[data-section-id="bookmark-custom"]',
      icon: "fa-solid fa-bookmark",
      title: i18n.settings_custom_bookmark || "Bookmarks",
      text:
        i18n.first_run_guide_bookmarks_desc ||
        "Tune bookmark layout, icon size, spacing, background style, drag behavior, and the newer bookmark group tab controls.",
    },
    {
      selector: "#bookmark-group-bg-color-picker",
      icon: "fa-regular fa-folder",
      title: i18n.settings_bookmark_group_header || "Group Tabs Interface",
      text:
        i18n.first_run_guide_bookmark_groups_desc ||
        "Customize bookmark group tabs with background and text colors, opacity, font size, counts, borders, and interaction behavior.",
    },
    {
      selector: '[data-section-id="custom-title"]',
      icon: "fa-solid fa-heading",
      title: i18n.settings_custom_title || "Custom title",
      text:
        i18n.first_run_guide_custom_title_desc ||
        "Show a personal title, move it freely, and adjust its color, size, shadow, border, and effects.",
    },
    {
      selector: '[data-section-id="layout"]',
      icon: "fa-solid fa-layer-group",
      title: i18n.settings_layout || "Layout",
      text:
        i18n.first_run_guide_layout_desc ||
        "Turn page modules on or off, flip layout direction, adjust quick controls, and replay this guide when needed.",
    },
    {
      virtualTarget: "chrome-bottom-bar",
      placement: "bottom",
      icon: "fa-brands fa-chrome",
      title: i18n.first_run_guide_chrome_bar_title || "Chrome bottom bar",
      text:
        i18n.first_run_guide_chrome_bar_desc ||
        "If you see Customize Chrome or Thanh tuy chinh Chrome at the bottom of the new tab page, right-click that bar and choose Hide customize Chrome bar.",
    },
    {
      selector: "#show-top-right-controls-checkbox",
      icon: "fa-brands fa-google",
      title: i18n.google_apps_tooltip || "Google Apps",
      text:
        i18n.first_run_guide_google_apps_desc ||
        "Show or hide the Google Apps corner. Open the apps menu to search, drag apps, resize the popup, show names, and customize app icons.",
    },
    {
      selector: "#search-engine-select",
      icon: "fa-solid fa-magnifying-glass",
      title: i18n.settings_group_search || "Search Bar",
      text:
        i18n.first_run_guide_search_desc ||
        "Choose from more search engines, toggle the Gemini AI icon, and tune the search bar width and blur. The search area also supports image and Lens workflows.",
    },
    {
      selector: '[data-section-id="data-sync"]',
      icon: "fa-solid fa-cloud",
      title: i18n.settings_data_sync || "Data & Sync",
      text:
        i18n.first_run_guide_data_sync_desc ||
        "Enable Google Drive sync to securely back up and restore your settings and bookmarks across devices. You can also configure auto-backup intervals.",
    },
    {
      selector: ".donate-section",
      icon: "fa-solid fa-heart",
      title: i18n.first_run_guide_donate_title || "Support & Rate",
      text:
        i18n.first_run_guide_donate_desc ||
        "If you find the extension useful, please consider rating 5 stars on the stores or donating to support the developer. Thank you! :))",
    },
  ]
}

function setSettingsSectionExpanded(section, expanded = true) {
  if (!section?.classList?.contains("settings-section")) return
  section.classList.toggle("collapsed", !expanded)

  const sectionId = section.dataset.sectionId
  if (!sectionId) return
  const sectionStates = JSON.parse(
    localStorage.getItem("settingsSectionStates") || "{}",
  )
  sectionStates[sectionId] = !expanded
  localStorage.setItem("settingsSectionStates", JSON.stringify(sectionStates))
}

function getGuideTarget(selector) {
  const target = document.querySelector(selector)
  if (!target) return null
  if (target.classList.contains("settings-section")) {
    return target.querySelector(".section-toggle") || target
  }
  if (target.matches("input, select, textarea")) {
    return target.closest(".setting-group") || target
  }
  return target
}

function getVirtualGuideRect(target) {
  if (target !== "chrome-bottom-bar") return null

  const width = Math.min(620, window.innerWidth - 28)
  const height = 58
  const left = Math.max(14, (window.innerWidth - width) / 2)
  const top = Math.max(14, window.innerHeight - height - 18)

  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  }
}

function waitForSettingsSidebarOpen(sidebar, timeout = 2500) {
  const startedAt = performance.now()
  return new Promise((resolve) => {
    const check = () => {
      const rect = sidebar.getBoundingClientRect()
      if (Math.abs(rect.left) <= 2 || performance.now() - startedAt > timeout) {
        resolve()
        return
      }
      requestAnimationFrame(check)
    }
    check()
  })
}

async function scrollGuideTargetIntoView(sidebarContent, target) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const sidebarRect = sidebarContent.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const targetTop =
      targetRect.top - sidebarRect.top + sidebarContent.scrollTop - 18

    sidebarContent.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "auto",
    })
    await waitForAnimationFrames(3)

    const nextSidebarRect = sidebarContent.getBoundingClientRect()
    const nextTargetRect = target.getBoundingClientRect()
    const isVisible =
      nextTargetRect.top >= nextSidebarRect.top + 8 &&
      nextTargetRect.bottom <= nextSidebarRect.bottom - 8

    if (isVisible || nextTargetRect.height > nextSidebarRect.height - 24) {
      return nextTargetRect
    }
  }

  return target.getBoundingClientRect()
}

async function promptFirstRunSettingsGuide({ force = false } = {}) {
  if (!force && localStorage.getItem(FIRST_RUN_SETTINGS_GUIDE_KEY)) return

  const sidebar = document.getElementById("settings-sidebar")
  const sidebarContent = sidebar?.querySelector(".sidebar-content")
  const sidebarFooter = sidebar?.querySelector(".sidebar-footer")
  if (!sidebar || !sidebarContent) {
    localStorage.setItem(FIRST_RUN_SETTINGS_GUIDE_KEY, "unavailable")
    return
  }

  const i18n = geti18n()
  const steps = getFirstRunSettingsGuideSteps(i18n).filter((step) =>
    step.virtualTarget ? getVirtualGuideRect(step.virtualTarget) : document.querySelector(step.selector),
  )
  if (!steps.length) {
    localStorage.setItem(FIRST_RUN_SETTINGS_GUIDE_KEY, "empty")
    return
  }

  await showAlert(
    i18n.first_run_guide_intro ||
      "All set. Next, a quick guide will show where the main Settings areas live.",
    i18n.first_run_guide_intro_title || "Quick settings guide",
  )

  return new Promise((resolve) => {
    let index = 0
    let resolved = false
    const wasFooterCollapsed = sidebarFooter?.classList.contains("collapsed")

    const overlay = document.createElement("div")
    overlay.className = "first-run-tour-overlay"
    overlay.innerHTML = `
      <div class="first-run-tour-spotlight" aria-hidden="true"></div>
      <div class="first-run-tour-card" role="dialog" aria-live="polite">
        <div class="first-run-tour-kicker"></div>
        <h3 class="first-run-tour-title"></h3>
        <p class="first-run-tour-text"></p>
        <div class="first-run-tour-progress"></div>
        <div class="first-run-tour-shortcuts" aria-label="Keyboard shortcuts">
          <span><kbd>←</kbd> <span data-role="back"></span></span>
          <span><kbd>→</kbd> <span data-role="next"></span></span>
          <span><kbd>Esc</kbd> <span data-role="skip"></span></span>
        </div>
        <div class="first-run-tour-actions">
          <button type="button" class="dialog-btn dialog-btn-secondary first-run-tour-skip"></button>
          <button type="button" class="dialog-btn dialog-btn-secondary first-run-tour-back"></button>
          <button type="button" class="dialog-btn dialog-btn-primary first-run-tour-next"></button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)
    document.body.classList.add("first-run-tour-active")
    sidebarFooter?.classList.add("collapsed")
    sidebar.classList.add("open")
    overlay.addEventListener("click", (event) => event.stopPropagation())

    const spotlight = overlay.querySelector(".first-run-tour-spotlight")
    const card = overlay.querySelector(".first-run-tour-card")
    const kicker = overlay.querySelector(".first-run-tour-kicker")
    const title = overlay.querySelector(".first-run-tour-title")
    const text = overlay.querySelector(".first-run-tour-text")
    const progress = overlay.querySelector(".first-run-tour-progress")
    const shortcutBack = overlay.querySelector('[data-role="back"]')
    const shortcutNext = overlay.querySelector('[data-role="next"]')
    const shortcutSkip = overlay.querySelector('[data-role="skip"]')
    const skipBtn = overlay.querySelector(".first-run-tour-skip")
    const backBtn = overlay.querySelector(".first-run-tour-back")
    const nextBtn = overlay.querySelector(".first-run-tour-next")
    let renderToken = 0

    const finish = (status) => {
      if (resolved) return
      resolved = true
      localStorage.setItem(FIRST_RUN_SETTINGS_GUIDE_KEY, status)
      document.body.classList.remove("first-run-tour-active")
      if (sidebarFooter) {
        sidebarFooter.classList.toggle("collapsed", wasFooterCollapsed)
      }
      document
        .querySelectorAll(".first-run-tour-highlight")
        .forEach((el) => el.classList.remove("first-run-tour-highlight"))
      overlay.remove()
      document.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("resize", renderStep)
      resolve()
    }

    const positionCard = (targetRect, step = {}) => {
      const gap = 14
      const cardRect = card.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const sidebarRect = sidebar.getBoundingClientRect()

      let left = sidebarRect.right + gap
      let top = targetRect.top + targetRect.height / 2 - cardRect.height / 2

      if (step.placement === "bottom") {
        left = Math.min(
          viewportWidth - cardRect.width - gap,
          Math.max(gap, targetRect.left + targetRect.width / 2 - cardRect.width / 2),
        )
        top = Math.max(gap, targetRect.top - cardRect.height - 22)
      }

      if (left + cardRect.width > viewportWidth - gap) {
        left = Math.max(gap, viewportWidth - cardRect.width - gap)
        top = Math.min(
          viewportHeight - cardRect.height - gap,
          Math.max(gap, targetRect.bottom + gap),
        )
      }

      top = Math.min(
        viewportHeight - cardRect.height - gap,
        Math.max(gap, top),
      )

      card.style.left = `${left}px`
      card.style.top = `${top}px`
    }

    const renderStep = async () => {
      const token = ++renderToken
      sidebar.classList.add("open")
      await waitForSettingsSidebarOpen(sidebar)
      if (resolved || token !== renderToken) return
      const step = steps[index]
      const section = step.selector ? document.querySelector(step.selector) : null
      if (section?.classList?.contains("settings-section")) {
        setSettingsSectionExpanded(section, true)
      }

      const target = step.virtualTarget ? null : getGuideTarget(step.selector)
      const virtualRect = step.virtualTarget
        ? getVirtualGuideRect(step.virtualTarget)
        : null
      if (!target && !virtualRect) {
        finish("target-missing")
        return
      }

      document
        .querySelectorAll(".first-run-tour-highlight")
        .forEach((el) => el.classList.remove("first-run-tour-highlight"))
      overlay.classList.toggle("is-bottom-target", step.placement === "bottom")
      card.classList.toggle("is-bottom-target", step.placement === "bottom")

      if (target) target.classList.add("first-run-tour-highlight")

      await waitForAnimationFrames(2)
      if (resolved || token !== renderToken) return
      const rect = virtualRect || (await scrollGuideTargetIntoView(sidebarContent, target))
      if (resolved || token !== renderToken) return
      spotlight.style.left = `${rect.left - 8}px`
      spotlight.style.top = `${rect.top - 8}px`
      spotlight.style.width = `${rect.width + 16}px`
      spotlight.style.height = `${rect.height + 16}px`

      kicker.innerHTML = `<i class="${step.icon}"></i><span>${(
        i18n.first_run_guide_step_label || "Step {current} of {total}"
      )
        .replace("{current}", index + 1)
        .replace("{total}", steps.length)}</span>`
      title.textContent = step.title
      text.textContent = step.text
      progress.style.setProperty(
        "--first-run-tour-progress",
        `${((index + 1) / steps.length) * 100}%`,
      )
      skipBtn.textContent = i18n.first_run_guide_skip || "Skip"
      backBtn.textContent = i18n.first_run_guide_back || "Back"
      shortcutBack.textContent = i18n.first_run_guide_back || "Back"
      shortcutNext.textContent = i18n.first_run_guide_next || "Next"
      shortcutSkip.textContent = i18n.first_run_guide_skip || "Skip"
      nextBtn.textContent =
        index === steps.length - 1
          ? i18n.first_run_guide_done || "Done"
          : i18n.first_run_guide_next || "Next"
      backBtn.disabled = index === 0
      positionCard(rect, step)
      overlay.classList.add("is-ready")
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") finish("skipped")
      if (event.key === "ArrowRight") nextBtn.click()
      if (event.key === "ArrowLeft" && index > 0) backBtn.click()
    }

    skipBtn.addEventListener("click", () => finish("skipped"))
    backBtn.addEventListener("click", () => {
      if (index > 0) {
        index -= 1
        renderStep()
      }
    })
    nextBtn.addEventListener("click", () => {
      if (index >= steps.length - 1) {
        finish("completed")
        return
      }
      index += 1
      renderStep()
    })
    window.addEventListener("resize", renderStep)
    document.addEventListener("keydown", onKeyDown)
    requestAnimationFrame(renderStep)
  })
}

async function finishFirstRunGuide() {
  await promptFirstRunSettingsGuide()
  if (
    localStorage.getItem(FIRST_RUN_SETTINGS_GUIDE_KEY) === "completed" &&
    !localStorage.getItem(FIRST_RUN_GUIDE_CONGRATS_KEY)
  ) {
    const i18n = geti18n()
    await showAlert(
      i18n.first_run_guide_congrats_message ||
        "You're ready to use Zero Start Page. You can replay this guide anytime from Settings > Layout & Features.",
      i18n.first_run_guide_congrats_title || "You're all set!",
    )
    localStorage.setItem(FIRST_RUN_GUIDE_CONGRATS_KEY, "shown")
  }
  localStorage.setItem(FIRST_RUN_ONBOARDING_DONE_KEY, "1")
  setFirstRunOnboardingActive(false)
}

export async function promptFirstRunBookmarkImport(renderBookmarks) {
  if (localStorage.getItem(FIRST_RUN_BG_KEY) !== "applied") return

  await waitForStartupOverlayHidden()

  if (!localStorage.getItem(FIRST_RUN_ONBOARDING_DONE_KEY)) {
    setFirstRunOnboardingActive(true)
  }
  await promptFirstRunLanguage()
  await promptFirstRunUserName()
  await promptFirstRunStyle(renderBookmarks)
  await promptFirstRunZoomTip()
  const i18n = geti18n()
  if (!localStorage.getItem(FIRST_RUN_OPEN_SOURCE_KEY)) {
    await showAlert(
      (
        i18n.first_run_open_source_message ||
        'Zero Start Page is open source. You can view the project at <a href="{url}" target="_blank" rel="noopener noreferrer">GitHub</a>. If you find a bug or have a suggestion, you can open an issue here: <a href="{issuesUrl}" target="_blank" rel="noopener noreferrer">GitHub Issues</a>.'
      )
        .replace("{url}", REPO_URL)
        .replace("{issuesUrl}", REPO_ISSUES_URL),
      i18n.first_run_open_source_title || "Open source",
    )
    localStorage.setItem(FIRST_RUN_OPEN_SOURCE_KEY, "shown")
  }

  if (localStorage.getItem(FIRST_RUN_IMPORT_KEY)) {
    await finishFirstRunGuide()
    return
  }
  if (!chromeBookmarksAvailable()) {
    localStorage.setItem(FIRST_RUN_IMPORT_KEY, "api-unavailable")
    await finishFirstRunGuide()
    return
  }

  try {
    const tree = await getChromeBookmarkTree()
    const rootFolders = tree.flatMap((root) => root.children || [])
    const importOptions = buildImportOptions(rootFolders, i18n)

    if (!importOptions.length) {
      localStorage.setItem(FIRST_RUN_IMPORT_KEY, "empty")
      await showAlert(
        i18n.first_run_import_bookmarks_none ||
          "No new Chrome bookmarks were found.",
      )
      await finishFirstRunGuide()
      return
    }

    const selection = await showChecklistConfirm(
      importOptions,
      i18n.first_run_import_bookmarks_title || "Import Chrome bookmarks",
      i18n.first_run_import_bookmarks_prompt ||
        "Choose which Chrome bookmark folders you want to import.",
    )
    if (!selection || !Object.values(selection).some(Boolean)) {
      localStorage.setItem(FIRST_RUN_IMPORT_KEY, "declined")
      await finishFirstRunGuide()
      return
    }
    localStorage.setItem(FIRST_RUN_IMPORT_KEY, "accepted")

    const currentState = getBookmarkState()
    const existingUrls = new Set(
      currentState.groups.flatMap((group) =>
        (group.items || []).map((item) => item.url).filter(Boolean),
      ),
    )
    const importedGroups = []

    rootFolders.forEach((child) =>
      collectChromeGroups(
        child,
        importedGroups,
        existingUrls,
        selection,
        i18n.bookmark_stack_default_name || "Bookmarks",
      ),
    )

    const selectedBookmarkItems = []
    rootFolders.forEach((child) =>
      collectSelectedBookmarkItems(
        child,
        selection,
        existingUrls,
        selectedBookmarkItems,
      ),
    )
    if (selectedBookmarkItems.length) {
      importedGroups.push({
        id: `chrome-selected-${Date.now()}`,
        name:
          i18n.first_run_import_selected_bookmarks_group ||
          "Selected bookmarks",
        items: selectedBookmarkItems,
      })
    }

    const importedCount = importedGroups.reduce(
      (total, group) => total + group.items.length,
      0,
    )
    if (!importedCount) {
      await showAlert(
        i18n.first_run_import_bookmarks_none ||
          "No new Chrome bookmarks were found.",
      )
      await finishFirstRunGuide()
      return
    }

    const nextGroups = hasOnlyEmptyDefaultGroup(currentState.groups)
      ? importedGroups
      : [...currentState.groups, ...importedGroups]

    setBookmarkGroups(nextGroups)
    setActiveGroupId(importedGroups[0].id)
    saveBookmarks()
    renderBookmarks?.()

    await showAlert(
      (
        i18n.first_run_import_bookmarks_success ||
        "Imported {count} bookmarks from Chrome."
      ).replace("{count}", importedCount),
    )
    await finishFirstRunGuide()
  } catch (error) {
    console.error("First-run bookmark import failed:", error)
    await showAlert(
      i18n.first_run_import_bookmarks_error ||
        "Could not import Chrome bookmarks right now.",
    )
    await finishFirstRunGuide()
  }
}

window.startpageReplaySettingsGuide = async () => {
  localStorage.removeItem(FIRST_RUN_SETTINGS_GUIDE_KEY)
  await promptFirstRunSettingsGuide({ force: true })
}
