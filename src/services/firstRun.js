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
import {
  switchSettingsTab,
  switchBgSubTab,
  getElementTab,
  getElementBgSubTab,
} from "../components/settings/sidebarNavigation.js"

const FIRST_RUN_BG_KEY = "startpageFirstRunSvgBgV1"
const FIRST_RUN_LANGUAGE_KEY = "startpageFirstRunLanguageV1"
const FIRST_RUN_NAME_KEY = "startpageFirstRunNameV1"
const FIRST_RUN_LAYOUT_KEY = "startpageFirstRunBookmarkLayoutV1"
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
  if (localStorage.getItem("pageSettings")) {
    localStorage.setItem(FIRST_RUN_BG_KEY, "skipped-existing")
    return false
  }

  // If pageSettings is missing, it means the user is either a new user or they cleared their settings manually.
  // We should provide a full first-run experience, so we clear any stray first-run flags.
  const firstRunKeys = [
    FIRST_RUN_BG_KEY,
    FIRST_RUN_LANGUAGE_KEY,
    FIRST_RUN_NAME_KEY,
    FIRST_RUN_LAYOUT_KEY,
    FIRST_RUN_OPEN_SOURCE_KEY,
    FIRST_RUN_IMPORT_KEY,
    FIRST_RUN_SETTINGS_GUIDE_KEY,
    FIRST_RUN_GUIDE_CONGRATS_KEY,
    FIRST_RUN_ONBOARDING_DONE_KEY,
  ]
  firstRunKeys.forEach((k) => localStorage.removeItem(k))

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

function waitForStartupOverlayHidden(timeout = 4000) {
  const isHidden = () => {
    const overlay = document.getElementById("startup-overlay")
    if (!overlay) return true
    if (overlay.classList.contains("overlay-hidden") || overlay.classList.contains("fading-out")) return true
    const style = window.getComputedStyle(overlay)
    return (
      style.visibility === "hidden" ||
      style.display === "none" ||
      style.pointerEvents === "none" ||
      Number.parseFloat(style.opacity || "1") <= 0.01
    )
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
      {
        key: "de",
        label: "Deutsch (Demo)",
        description: "Deutsche Benutzeroberfläche verwenden.",
        icon: "fa-solid fa-language",
      },
      {
        key: "sv",
        label: "Svenska (Demo)",
        description: "Använd det svenska gränssnittet.",
        icon: "fa-solid fa-language",
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

async function promptFirstRunBookmarkLayout(renderBookmarks) {
  if (localStorage.getItem(FIRST_RUN_LAYOUT_KEY)) return

  const i18n = geti18n()
  const options = [
    {
      key: "default",
      label: i18n.first_run_style_clean || "Default Grid",
      description:
        i18n.first_run_style_clean_desc ||
        "Simple, centered bookmarks with minimal background.",
      icon: "fa-solid fa-table-cells",
    },
    {
      key: "taskbar",
      label: i18n.first_run_style_dock || "Taskbar (Bottom Center)",
      description:
        i18n.first_run_style_dock_desc ||
        "Bottom taskbar dock, compact icons, easy for new tabs.",
      icon: "fa-solid fa-window-maximize",
    },
    {
      key: "sidebar",
      label: i18n.first_run_style_sidebar || "Sidebar",
      description:
        i18n.first_run_style_sidebar_desc ||
        "Vertical folder list on the side for heavy bookmark use.",
      icon: "fa-solid fa-table-columns",
    },
    {
      key: "taskbar-top",
      label: i18n.layout_taskbar_top || "Taskbar (Top Center)",
      description:
        i18n.layout_taskbar_top_desc || "Dock at the top of the screen.",
      icon: "fa-solid fa-border-top-left",
    },
    {
      key: "taskbar-left",
      label: i18n.layout_taskbar_left || "Taskbar (Bottom Left)",
      description:
        i18n.layout_taskbar_left_desc || "Dock at the bottom-left corner.",
      icon: "fa-solid fa-grip-vertical",
    },
    {
      key: "taskbar-right",
      label: i18n.layout_taskbar_right || "Taskbar (Bottom Right)",
      description:
        i18n.layout_taskbar_right_desc || "Dock at the bottom-right corner.",
      icon: "fa-solid fa-grip-vertical",
    },
  ]

  const selectedLayout = await showChoiceConfirm(
    options,
    i18n.first_run_style_title || "Choose a start style",
    i18n.first_run_style_prompt ||
      "Choose a layout to start with. You can change it later in Settings.",
  )

  const layout = selectedLayout || "default"
  updateSetting("bookmarkLayout", layout)
  saveSettings(true)

  const layoutClasses = [
    "bookmark-sidebar-mode",
    "bookmark-taskbar-mode",
    "bookmark-taskbar-top-mode",
    "bookmark-taskbar-left-mode",
    "bookmark-taskbar-right-mode",
  ]
  document.body.classList.remove(...layoutClasses)
  if (layout !== "default") {
    document.body.classList.add(`bookmark-${layout}-mode`)
  }

  renderBookmarks?.()
  window.dispatchEvent(
    new CustomEvent("layoutUpdated", {
      detail: { key: "bookmarkLayout", value: layout },
    }),
  )
  window.dispatchEvent(
    new CustomEvent("startpage:settingChanged", {
      detail: { key: "bookmarkLayout", value: layout },
    }),
  )
  localStorage.setItem(FIRST_RUN_LAYOUT_KEY, layout)
}



function getFirstRunSettingsGuideSteps(i18n) {
  return [
    // -------------------------------------------------------------
    // CHƯƠNG 1: BẮT ĐẦU & MÀN HÌNH CHÍNH (OVERVIEW & SCREEN ESSENTIALS)
    // -------------------------------------------------------------
    {
      chapterId: "overview",
      chapterTitle: i18n.first_run_chapter_overview || "Chapter 1/6: Getting Started",
      virtualTarget: "center-screen",
      icon: "fa-solid fa-hand-wave",
      title: i18n.first_run_tour_welcome_title || "Welcome to Startpage! 🎉",
      text:
        i18n.first_run_tour_welcome_desc ||
        "Welcome to Zero Startpage - Ultra-fast, distraction-free start tab with endless customization.",
      features: [
        i18n.first_run_tour_welcome_f1 || "Minimalist, distraction-free and ultra fast load times",
        i18n.first_run_tour_welcome_f2 || "100% customizable wallpaper, colors, typography and layout",
        i18n.first_run_tour_welcome_f3 || "Built-in productivity widgets: Notepad, Todo, Calendar, Weather",
      ],
      placement: "center",
      skipSidebarScroll: true,
    },
    {
      chapterId: "overview",
      chapterTitle: i18n.first_run_chapter_overview || "Chapter 1/6: Getting Started",
      selector: "#search-container",
      icon: "fa-solid fa-magnifying-glass",
      title: i18n.first_run_tour_search_title || "Smart Search",
      text:
        i18n.first_run_tour_search_desc ||
        "Smart omnibox search with instant engine switching and multimodal search support.",
      features: [
        i18n.first_run_tour_search_f1 || "10+ search engines: Google, Perplexity, Gemini, YouTube, GitHub...",
        i18n.first_run_tour_search_f2 || "Press Tab key to quickly switch between search engines",
        i18n.first_run_tour_search_f3 || "Paste images or search via Google Lens & Gemini AI",
      ],
      placement: "bottom",
      skipSidebarScroll: true,
    },
    {
      chapterId: "overview",
      chapterTitle: i18n.first_run_chapter_overview || "Chapter 1/6: Getting Started",
      selector: "#bookmarks-container",
      icon: "fa-solid fa-bookmark",
      title: i18n.first_run_tour_bookmarks_title || "Bookmark Management",
      text:
        i18n.first_run_tour_bookmarks_desc ||
        "Manage and access your favorite websites easily with 6 flexible layout modes.",
      features: [
        i18n.first_run_tour_bookmarks_f1 || "Drag & drop to organize your favorite shortcuts freely",
        i18n.first_run_tour_bookmarks_f2 || "6 layout options: Grid, Taskbar Dock, Sidebar folder tree...",
        i18n.first_run_tour_bookmarks_f3 || "Right-click bookmarks for instant edit, icon styling, and options",
      ],
      placement: "bottom",
      skipSidebarScroll: true,
    },
    {
      chapterId: "overview",
      chapterTitle: i18n.first_run_chapter_overview || "Chapter 1/6: Getting Started",
      selector: "#settings-toggle",
      icon: "fa-solid fa-gear",
      title: i18n.first_run_tour_settings_title || "Unlimited Customization",
      text:
        i18n.first_run_tour_settings_desc ||
        "Explore the comprehensive Settings hub with 100+ customization toggles and Quick Access bar.",
      features: [
        i18n.first_run_tour_settings_f1 || "Quick Access bar for instant Todo, Notepad, Calendar, Weather, Music...",
        i18n.first_run_tour_settings_f2 || "Table of Contents button inside settings jumps directly to any option",
        i18n.first_run_tour_settings_f3 || "Instant settings search bar finds any option in milliseconds",
      ],
      placement: "bottom",
      skipSidebarScroll: true,
    },

    // -------------------------------------------------------------
    // CHƯƠNG 2: GIAO DIỆN & CHỦ ĐỀ (APPEARANCE & THEMES)
    // -------------------------------------------------------------
    {
      chapterId: "appearance",
      chapterTitle: i18n.first_run_chapter_appearance || "Chapter 2/6: Appearance & Themes",
      selector: '[data-section-id="themes"], [data-settings-partial="themes"]',
      icon: "fa-solid fa-palette",
      title: i18n.settings_themes || "Themes",
      text:
        i18n.first_run_guide_themes_desc ||
        "Curated presets and community Theme Web hub allow transforming your entire look in one click.",
      features: [
        i18n.first_run_tour_themes_f1 || "Curated presets: Dark, Light, Cyberpunk, Forest, Sunset...",
        i18n.first_run_tour_themes_f2 || "Theme Web Beta: Discover and apply community shared styles",
        i18n.first_run_tour_themes_f3 || "Save your current custom look as a personal theme preset",
      ],
    },
    {
      chapterId: "appearance",
      chapterTitle: i18n.first_run_chapter_appearance || "Chapter 2/6: Appearance & Themes",
      selector: "#accent-color-group",
      icon: "fa-solid fa-droplet",
      title: i18n.settings_accent || "Accent Color",
      text:
        i18n.first_run_guide_accent_desc ||
        "The primary Accent Color defines high-impact highlights across the entire user interface.",
      features: [
        i18n.first_run_tour_accent_f1 || "Choose vivid preset colors or pick any custom HEX color",
        i18n.first_run_tour_accent_f2 || "Auto-extract harmonized accent color directly from background",
        i18n.first_run_tour_accent_f3 || "Sync accent color across widget borders, icons, buttons and glow effects",
      ],
    },
    {
      chapterId: "appearance",
      chapterTitle: i18n.first_run_chapter_appearance || "Chapter 2/6: Appearance & Themes",
      selector: '[data-section-id="font"], [data-settings-partial="font"]',
      icon: "fa-solid fa-font",
      title: i18n.settings_font || "Typography & Google Fonts",
      text:
        i18n.first_run_guide_font_desc ||
        "Customize general interface typography and clock digits using the entire Google Fonts library.",
      features: [
        i18n.first_run_tour_font_f1 || "Curated popular typography presets optimized for clean legibility",
        i18n.first_run_tour_font_f2 || "Load and save any font from Google Fonts by font name",
        i18n.first_run_tour_font_f3 || "Set custom typography separately for clock digits and date",
      ],
    },
    {
      chapterId: "appearance",
      chapterTitle: i18n.first_run_chapter_appearance || "Chapter 2/6: Appearance & Themes",
      selector: '[data-section-id="custom-title"], [data-settings-partial="custom-title"]',
      icon: "fa-solid fa-heading",
      title: i18n.settings_custom_title || "Custom Title",
      text:
        i18n.first_run_guide_custom_title_desc ||
        "Display a personalized welcome greeting or inspirational quote prominently on the home screen.",
      features: [
        i18n.first_run_tour_title_f1 || "Add personal greeting or motivational quotes on screen",
        i18n.first_run_tour_title_f2 || "Free move: Drag & position the title anywhere on screen",
        i18n.first_run_tour_title_f3 || "Tune font size, custom color, neon glow outline and text shadow",
      ],
    },

    // -------------------------------------------------------------
    // CHƯƠNG 3: HÌNH NỀN & HIỆU ỨNG ĐỘNG (WALLPAPERS & SHADERS)
    // -------------------------------------------------------------
    {
      chapterId: "background",
      chapterTitle: i18n.first_run_chapter_background || "Chapter 3/6: Wallpapers & Shaders",
      selector: '[data-section-id="background"], [data-settings-partial="background"]',
      icon: "fa-solid fa-image",
      title: i18n.settings_bg || "Wallpaper Gallery",
      text:
        i18n.first_run_guide_background_desc ||
        "Extensive wallpaper gallery supporting HD static images, looping MP4 videos, and Unsplash library.",
      features: [
        i18n.first_run_tour_bg_f1 || "Upload HD/4K images or smooth looping MP4 video wallpapers",
        i18n.first_run_tour_bg_f2 || "Search and load millions of curated photos from Unsplash",
        i18n.first_run_tour_bg_f3 || "Adjust background blur, brightness dimming and screen fitting modes",
      ],
    },
    {
      chapterId: "background",
      chapterTitle: i18n.first_run_chapter_background || "Chapter 3/6: Wallpapers & Shaders",
      selector: '[data-section-id="gradient-multi-color"], [data-settings-partial="gradient-multi-color"]',
      icon: "fa-solid fa-fill-drip",
      title: i18n.settings_gradient_multi_title || "Gradient V2 & SVG Waves",
      text:
        i18n.first_run_guide_gradient_desc ||
        "Multi-color dynamic gradient generator and relaxing animated SVG ocean wave layers.",
      features: [
        i18n.first_run_tour_grad_f1 || "Multi-color animated gradients with ultra smooth 60fps performance",
        i18n.first_run_tour_grad_f2 || "Animated SVG wave layer with customizable speed and wave amplitude",
        i18n.first_run_tour_grad_f3 || "Visual Preset Hub: Copy or apply complete shareable visual presets",
      ],
    },
    {
      chapterId: "background",
      chapterTitle: i18n.first_run_chapter_background || "Chapter 3/6: Wallpapers & Shaders",
      selector: '[data-section-id="animated-backgrounds"], [data-settings-partial="animated-backgrounds"]',
      icon: "fa-solid fa-wand-magic-sparkles",
      title: i18n.settings_animated_backgrounds || "Animated Shaders",
      text:
        i18n.first_run_guide_animated_desc ||
        "Vibrant GPU shader canvas layers including Silk wave, cybernetic Light Pillars, and interactive fluid.",
      features: [
        i18n.first_run_tour_anim_f1 || "Silk Shader: Soft flowing 3D ribbon cloth simulation",
        i18n.first_run_tour_anim_f2 || "Light Pillars: Majestic glowing cybernetic vertical light beams",
        i18n.first_run_tour_anim_f3 || "Liquid Ether & Splash Cursor: Interactive fluid ripples following your mouse",
      ],
    },
    {
      chapterId: "background",
      chapterTitle: i18n.first_run_chapter_background || "Chapter 3/6: Wallpapers & Shaders",
      selector: '[data-section-id="special-effects"], [data-settings-partial="special-effects"]',
      icon: "fa-solid fa-star",
      title: i18n.settings_effect || "Overlay Effects",
      text:
        i18n.first_run_guide_effects_desc ||
        "Cinematic lightweight overlay effects layered over wallpapers to enhance ambient atmosphere.",
      features: [
        i18n.first_run_tour_eff_f1 || "Pixel Snow: Retro pixel snowfall simulation",
        i18n.first_run_tour_eff_f2 || "Fireflies: Glowing night fireflies drifting across your screen",
        i18n.first_run_tour_eff_f3 || "Northern Lights Aurora & cinematic shooting star meteors",
      ],
    },

    // -------------------------------------------------------------
    // CHƯƠNG 4: ĐỒNG HỒ & LỊCH ÂM (DATE, CLOCK & LUNAR CALENDAR)
    // -------------------------------------------------------------
    {
      chapterId: "clock",
      chapterTitle: i18n.first_run_chapter_clock || "Chapter 4/6: Date & Clock",
      selector: '[data-section-id="date-clock"], [data-settings-partial="date-clock"]',
      icon: "fa-solid fa-clock",
      title: i18n.settings_date_format || "Clock Styles & Customization",
      text:
        i18n.first_run_guide_clock_desc ||
        "Over 10+ distinct clock styles ranging from modern digital and flip clock to vintage analog.",
      features: [
        i18n.first_run_tour_clock_f1 || "10+ clock styles: Modern digital, Flip clock, Vintage analog, Minimalist",
        i18n.first_run_tour_clock_f2 || "Toggle 12h / 24h format and custom date string formats",
        i18n.first_run_tour_clock_f3 || "Free Move clock mode: Drag and position the clock anywhere",
      ],
    },
    {
      chapterId: "clock",
      chapterTitle: i18n.first_run_chapter_clock || "Chapter 4/6: Date & Clock",
      selector: '[data-target-selector="#lunar-date"], #show-lunar-calendar-checkbox-clock',
      icon: "fa-solid fa-moon",
      title: i18n.settings_clock_show_lunar_calendar || "Lunar Calendar",
      text:
        i18n.first_run_guide_lunar_desc ||
        "Built-in Lunar Calendar integrated directly into the clock and calendar widget.",
      features: [
        i18n.first_run_tour_lunar_f1 || "Accurate traditional Lunar calendar display",
        i18n.first_run_tour_lunar_f2 || "View Can Chi zodiac signs and lunar phases",
        i18n.first_run_tour_lunar_f3 || "Target spotlight automatically highlights lunar date on screen",
      ],
    },

    // -------------------------------------------------------------
    // CHƯƠNG 5: LỐI TẮT & TAB NHÓM (BOOKMARKS & GROUP TABS)
    // -------------------------------------------------------------
    {
      chapterId: "bookmarks",
      chapterTitle: i18n.first_run_chapter_bookmarks || "Chapter 5/6: Bookmarks & Groups",
      selector: '[data-section-id="bookmark-custom"], [data-settings-partial="bookmark-custom"]',
      icon: "fa-solid fa-bookmark",
      title: i18n.settings_custom_bookmark || "Bookmark Layouts & Icons",
      text:
        i18n.first_run_guide_bookmarks_desc ||
        "Comprehensive personalization of bookmark layout and appearance to match your browsing habits.",
      features: [
        i18n.first_run_tour_bklayout_f1 || "6 layouts: Default Grid, Bottom Taskbar Dock, Sidebar tree...",
        i18n.first_run_tour_bklayout_f2 || "Tune icon size, typography, border radius and item padding",
        i18n.first_run_tour_bklayout_f3 || "Isolated contrast background ensures icons and text are always legible",
      ],
    },
    {
      chapterId: "bookmarks",
      chapterTitle: i18n.first_run_chapter_bookmarks || "Chapter 5/6: Bookmarks & Groups",
      selector: "#bookmark-group-bg-color-picker, .bookmark-groups-container",
      icon: "fa-regular fa-folder",
      title: i18n.settings_bookmark_group_header || "Group Tabs Interface",
      text:
        i18n.first_run_guide_bookmark_groups_desc ||
        "Organize bookmarks into categorised tabs (Work, Study, Entertainment, Dev Tools...).",
      features: [
        i18n.first_run_tour_bkgroups_f1 || "Create folder tabs to organize hundreds of bookmarks cleanly",
        i18n.first_run_tour_bkgroups_f2 || "Customize tab group background, text colors, opacity and borders",
        i18n.first_run_tour_bkgroups_f3 || "Smart overflow badge (+N) clearly shows hidden bookmarks count",
      ],
    },

    // -------------------------------------------------------------
    // CHƯƠNG 6: BỐ CỤC, WIDGETS & ĐỒNG BỘ (LAYOUT & CLOUD SYNC)
    // -------------------------------------------------------------
    {
      chapterId: "system",
      chapterTitle: i18n.first_run_chapter_system || "Chapter 6/6: Layout & Sync",
      selector: '[data-section-id="layout"], [data-settings-partial="layout"]',
      icon: "fa-solid fa-layer-group",
      title: i18n.settings_layout || "Layout & Widget Controls",
      text:
        i18n.first_run_guide_layout_desc ||
        "Toggle individual page widgets on or off and manage screen orientation and quick layout controls.",
      features: [
        i18n.first_run_tour_layout_f1 || "Toggle widgets: Todo, Notepad, Calendar, Weather, Music player",
        i18n.first_run_tour_layout_f2 || "Flip layout direction for personalized screen orientation",
        i18n.first_run_tour_layout_f3 || "Reset layout to default or replay this guide anytime",
      ],
    },
    {
      chapterId: "system",
      chapterTitle: i18n.first_run_chapter_system || "Chapter 6/6: Layout & Sync",
      selector: '[data-section-id="data-sync"], [data-settings-partial="data-sync"]',
      icon: "fa-solid fa-cloud",
      title: i18n.settings_data_sync || "Google Drive Sync & Backup",
      text:
        i18n.first_run_guide_data_sync_desc ||
        "Secure cloud synchronization with your personal private Google Drive account.",
      features: [
        i18n.first_run_tour_sync_f1 || "Auto-backup settings and bookmarks to your private Google Drive",
        i18n.first_run_tour_sync_f2 || "Instantly restore your complete setup on any new device",
        i18n.first_run_tour_sync_f3 || "One-click Export/Import local JSON backup files",
      ],
    },
    {
      chapterId: "system",
      chapterTitle: i18n.first_run_chapter_system || "Chapter 6/6: Layout & Sync",
      selector: '[data-section-id="about-project"], [data-settings-partial="about-project"]',
      icon: "fa-solid fa-circle-info",
      title: i18n.first_run_guide_donate_title || "About Project & Support",
      text:
        i18n.first_run_guide_donate_desc ||
        "100% free open-source project created with passion for the community.",
      features: [
        i18n.first_run_tour_about_f1 || "100% open-source on GitHub, privacy-focused and transparent",
        i18n.first_run_tour_about_f2 || "View latest release changelog and upcoming roadmap",
        i18n.first_run_tour_about_f3 || "Please rate 5 stars on Chrome Web Store to support the developer!",
      ],
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

export function autoExpandAllSettingsSectionsAndGroups() {
  // 1. Expand all collapsible groups (.setting-group.collapsible-group)
  document
    .querySelectorAll(".setting-group.collapsible-group")
    .forEach((group) => {
      group.classList.add("expanded")
      const groupId = group.id || group.dataset.groupId
      if (groupId) {
        localStorage.setItem(`settingsGroupExpanded:${groupId}`, "1")
      }
    })

  // 2. Expand all settings sections (.settings-section)
  const sectionStates = JSON.parse(
    localStorage.getItem("settingsSectionStates") || "{}",
  )
  document.querySelectorAll(".settings-section").forEach((section) => {
    section.classList.remove("collapsed")
    const sectionId = section.dataset.sectionId
    if (sectionId) {
      sectionStates[sectionId] = false
    }
  })
  localStorage.setItem("settingsSectionStates", JSON.stringify(sectionStates))

  // 3. Expand other collapsible sub-panels
  document
    .querySelectorAll(
      ".language-tools-panel, .gradient-settings-body, .multicolor-settings-body, .svg-wave-settings",
    )
    .forEach((panel) => {
      panel.classList.remove("is-collapsed")
    })
}

if (typeof window !== "undefined") {
  window.autoExpandAllSettingsSectionsAndGroups = autoExpandAllSettingsSectionsAndGroups
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
  if (target === "center-screen") {
    return {
      left: window.innerWidth / 2,
      top: window.innerHeight / 2,
      width: 0,
      height: 0,
      bottom: window.innerHeight / 2,
      right: window.innerWidth / 2,
    }
  }

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
    const navContainer = document.querySelector(".settings-nav-container")
    const navOffset = navContainer && !navContainer.classList.contains("nav-hidden")
      ? (navContainer.offsetHeight || 110)
      : 10
    const targetTop =
      targetRect.top - sidebarRect.top + sidebarContent.scrollTop - navOffset - 14

    sidebarContent.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "auto",
    })
    await new Promise((r) => setTimeout(r, 60))

    const nextSidebarRect = sidebarContent.getBoundingClientRect()
    const nextTargetRect = target.getBoundingClientRect()
    const isVisible =
      nextTargetRect.top >= nextSidebarRect.top + navOffset + 4 &&
      nextTargetRect.bottom <= nextSidebarRect.bottom - 8

    if (isVisible || nextTargetRect.height > nextSidebarRect.height - 24) {
      return nextTargetRect
    }
  }

  return target.getBoundingClientRect()
}

async function promptFirstRunSettingsGuide({ force = false } = {}) {
  if (!force && localStorage.getItem(FIRST_RUN_SETTINGS_GUIDE_KEY)) return

  if (window.startpageSettingsPartialsReady) {
    await window.startpageSettingsPartialsReady
  }

  const sidebar = document.getElementById("settings-sidebar")
  const sidebarContent = sidebar?.querySelector(".sidebar-content")
  const sidebarFooter = sidebar?.querySelector(".sidebar-footer")
  if (!sidebar || !sidebarContent) {
    localStorage.setItem(FIRST_RUN_SETTINGS_GUIDE_KEY, "unavailable")
    return
  }

  const i18n = geti18n()
  const steps = getFirstRunSettingsGuideSteps(i18n).filter((step) =>
    step.virtualTarget
      ? getVirtualGuideRect(step.virtualTarget)
      : document.querySelector(step.selector),
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
        <div class="first-run-tour-header-row">
          <div class="first-run-tour-chapter-badge"></div>
          <div class="first-run-tour-kicker"></div>
        </div>
        <h3 class="first-run-tour-title"></h3>
        <p class="first-run-tour-text"></p>
        <div class="first-run-tour-features-list"></div>
        <div class="first-run-tour-progress"></div>
        <div class="first-run-tour-shortcuts" aria-label="Keyboard shortcuts">
          <span><kbd>←</kbd> <span data-role="back"></span></span>
          <span><kbd>→</kbd> <span data-role="next"></span></span>
          <span><kbd>Esc</kbd> <span data-role="skip"></span></span>
        </div>
        <div class="first-run-tour-actions">
          <button type="button" class="dialog-btn dialog-btn-secondary first-run-tour-skip-all"></button>
          <button type="button" class="dialog-btn dialog-btn-secondary first-run-tour-skip-section"></button>
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
    const chapterBadge = overlay.querySelector(".first-run-tour-chapter-badge")
    const kicker = overlay.querySelector(".first-run-tour-kicker")
    const title = overlay.querySelector(".first-run-tour-title")
    const text = overlay.querySelector(".first-run-tour-text")
    const featuresList = overlay.querySelector(".first-run-tour-features-list")
    const progress = overlay.querySelector(".first-run-tour-progress")
    const shortcutBack = overlay.querySelector('[data-role="back"]')
    const shortcutNext = overlay.querySelector('[data-role="next"]')
    const shortcutSkip = overlay.querySelector('[data-role="skip"]')
    const skipAllBtn = overlay.querySelector(".first-run-tour-skip-all")
    const skipSectionBtn = overlay.querySelector(".first-run-tour-skip-section")
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
      if (status === "skipped") {
        autoExpandAllSettingsSectionsAndGroups()
      }
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
          Math.max(
            gap,
            targetRect.left + targetRect.width / 2 - cardRect.width / 2,
          ),
        )
        // Check if there's space below
        if (targetRect.bottom + cardRect.height + 22 < viewportHeight) {
          top = targetRect.bottom + 22
        } else {
          top = Math.max(gap, targetRect.top - cardRect.height - 22)
        }
      } else if (step.placement === "center") {
        left = Math.max(gap, (viewportWidth - cardRect.width) / 2)
        top = Math.max(gap, (viewportHeight - cardRect.height) / 2)
      }

      if (left + cardRect.width > viewportWidth - gap) {
        left = Math.max(gap, viewportWidth - cardRect.width - gap)
        top = Math.min(
          viewportHeight - cardRect.height - gap,
          Math.max(gap, targetRect.bottom + gap),
        )
      }

      top = Math.min(viewportHeight - cardRect.height - gap, Math.max(gap, top))

      card.style.left = `${left}px`
      card.style.top = `${top}px`
    }

    const renderStep = async () => {
      const token = ++renderToken
      const step = steps[index]
      if (step.skipSidebarScroll) {
        sidebar.classList.remove("open")
      } else {
        sidebar.classList.add("open")
        await waitForSettingsSidebarOpen(sidebar)
      }
      if (resolved || token !== renderToken) return
      const section = step.selector
        ? document.querySelector(step.selector)
        : null
      if (section) {
        const targetTab = getElementTab(section)
        const targetBgSubTab = targetTab === "background" ? getElementBgSubTab(section) : null
        if (targetTab && typeof switchSettingsTab === "function") {
          switchSettingsTab(targetTab)
        }
        if (targetTab === "background" && targetBgSubTab && typeof switchBgSubTab === "function") {
          switchBgSubTab(targetBgSubTab)
        }
        if (section.classList?.contains("settings-section")) {
          setSettingsSectionExpanded(section, true)
        }
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
      const rect =
        virtualRect ||
        (step.skipSidebarScroll
          ? target.getBoundingClientRect()
          : await scrollGuideTargetIntoView(sidebarContent, target))
      if (resolved || token !== renderToken) return
      spotlight.style.left = `${rect.left - 8}px`
      spotlight.style.top = `${rect.top - 8}px`
      spotlight.style.width = `${rect.width + 16}px`
      spotlight.style.height = `${rect.height + 16}px`

      if (step.chapterTitle) {
        chapterBadge.innerHTML = `<i class="fa-solid fa-layer-group"></i> <span>${escapeHtml(step.chapterTitle)}</span>`
        chapterBadge.style.display = "inline-flex"
      } else {
        chapterBadge.style.display = "none"
      }

      kicker.innerHTML = `<i class="${step.icon}"></i><span>${(
        i18n.first_run_guide_step_label || "Step {current} of {total}"
      )
        .replace("{current}", index + 1)
        .replace("{total}", steps.length)}</span>`
      title.textContent = step.title
      text.textContent = step.text

      if (step.features && step.features.length) {
        featuresList.innerHTML = step.features
          .map(
            (f) =>
              `<div class="first-run-tour-feature-item"><i class="fa-solid fa-circle-check"></i><span>${escapeHtml(f)}</span></div>`,
          )
          .join("")
        featuresList.style.display = "flex"
      } else {
        featuresList.innerHTML = ""
        featuresList.style.display = "none"
      }

      progress.style.setProperty(
        "--first-run-tour-progress",
        `${((index + 1) / steps.length) * 100}%`,
      )

      skipAllBtn.textContent = i18n.first_run_guide_skip_all || "Skip All"
      skipSectionBtn.textContent = i18n.first_run_guide_skip_section || "Skip Section"
      
      const hasNextChapter = steps.some((s, i) => i > index && s.chapterId && s.chapterId !== step.chapterId)
      skipSectionBtn.style.display = hasNextChapter ? "inline-flex" : "none"

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

    const skipToNextChapter = () => {
      const currentChapter = steps[index]?.chapterId
      if (!currentChapter) {
        finish("skipped")
        return
      }
      const nextIndex = steps.findIndex((s, i) => i > index && s.chapterId !== currentChapter)
      if (nextIndex !== -1) {
        index = nextIndex
        renderStep()
      } else {
        finish("completed")
      }
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") finish("skipped")
      if (event.key === "ArrowRight") nextBtn.click()
      if (event.key === "ArrowLeft" && index > 0) backBtn.click()
    }

    skipAllBtn.addEventListener("click", () => finish("skipped"))
    skipSectionBtn.addEventListener("click", skipToNextChapter)
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
  await promptFirstRunBookmarkLayout(renderBookmarks)
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
