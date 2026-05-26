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
} from "../utils/dialog.js"

const FIRST_RUN_BG_KEY = "startpageFirstRunSvgBgV1"
const FIRST_RUN_LANGUAGE_KEY = "startpageFirstRunLanguageV1"
const FIRST_RUN_OPEN_SOURCE_KEY = "startpageFirstRunOpenSourceNoticeV1"
const FIRST_RUN_IMPORT_KEY = "startpageFirstRunBookmarkImportV1"
const REPO_URL = "https://github.com/ChickenSoup269/Zero-Start-Page"

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
  updateAllSettings({
    background: null,
    activeBgUid: null,
    effect: "none",
    multiColorActive: false,
    gradientV2Active: false,
    silkActive: false,
    lightPillarActive: false,
    liquidEtherActive: false,
    splashCursorActive: false,
    svgWaveActive: true,
    svgWaveFill: true,
    svgWaveLines: randomInt(5, 8),
    svgWaveAmplitudeX: preset.ampX + randomInt(-24, 24),
    svgWaveAmplitudeY: preset.ampY + randomInt(-12, 16),
    svgWaveOffsetX: randomInt(-28, 28),
    svgWaveAngle: preset.angle + randomInt(-5, 5),
    svgWaveSmoothness: 0.62,
    svgWaveCraziness: randomInt(22, 36),
    svgWaveStartHue: preset.start[0],
    svgWaveStartSaturation: preset.start[1],
    svgWaveStartLightness: preset.start[2],
    svgWaveEndHue: preset.end[0],
    svgWaveEndSaturation: preset.end[1],
    svgWaveEndLightness: preset.end[2],
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
  const items = collectBookmarkUrls(node)
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
        ${(i18n.first_run_import_bookmarks_count || "{count} bookmarks").replace(
          "{count}",
          items.length,
        )}
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
      loading="lazy"
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

    const items = collectBookmarkUrls(node)
    if (items.length) {
      output.folders.push({
        key: `folder:${node.id}`,
        label: getFolderOptionLabel(node, nextPath, i18n),
        checked: pathParts.length === 0,
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
      label:
        i18n.first_run_import_folder_section ||
        "Folders",
    })
    options.push(...folders)
  }

  if (bookmarks.length) {
    options.push({
      type: "section",
      icon: "fa-solid fa-link",
      label:
        i18n.first_run_import_bookmark_section ||
        "Individual bookmarks",
    })
    options.push(...bookmarks)
  }

  return options
}

function collectSelectedBookmarkItems(node, selection, existingUrls, items = []) {
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
  ancestorSelected = false,
) {
  if (!node?.children) return

  const shouldImportFolder = ancestorSelected || selection[`folder:${node.id}`]
  const items = shouldImportFolder ? directBookmarksFromFolder(node, existingUrls) : []
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
        shouldImportFolder,
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
  localStorage.setItem(FIRST_RUN_LANGUAGE_KEY, language)
}

export async function promptFirstRunBookmarkImport(renderBookmarks) {
  if (localStorage.getItem(FIRST_RUN_BG_KEY) !== "applied") return

  await promptFirstRunLanguage()
  const i18n = geti18n()
  if (!localStorage.getItem(FIRST_RUN_OPEN_SOURCE_KEY)) {
    await showAlert(
      (i18n.first_run_open_source_message ||
        'Zero Start Page is open source. You can view the project at <a href="{url}" target="_blank" rel="noopener noreferrer">GitHub</a>.').replace(
        "{url}",
        REPO_URL,
      ),
      i18n.first_run_open_source_title || "Open source",
    )
    localStorage.setItem(FIRST_RUN_OPEN_SOURCE_KEY, "shown")
  }

  if (localStorage.getItem(FIRST_RUN_IMPORT_KEY)) return
  if (!chromeBookmarksAvailable()) {
    localStorage.setItem(FIRST_RUN_IMPORT_KEY, "api-unavailable")
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

    rootFolders
      .forEach((child) =>
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
      (i18n.first_run_import_bookmarks_success ||
        "Imported {count} bookmarks from Chrome.").replace(
        "{count}",
        importedCount,
      ),
    )
  } catch (error) {
    console.error("First-run bookmark import failed:", error)
    await showAlert(
      i18n.first_run_import_bookmarks_error ||
        "Could not import Chrome bookmarks right now.",
    )
  }
}
