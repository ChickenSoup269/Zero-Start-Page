import { geti18n } from "../services/i18n.js"
import { showToast } from "../utils/toast.js"
import { showPrompt } from "../utils/dialog.js"

export const DEFAULT_M365_HEADER_URL = "https://m365.cloud.microsoft/chat"
export const DEFAULT_M365_ALL_APPS_URL = "https://m365.cloud.microsoft/apps"

export const defaultM365Apps = [
  {
    id: "outlook",
    i18nKey: "m365_app_outlook",
    label: "Outlook",
    url: "https://outlook.live.com/",
    icon: "icon/m365/outlook.svg",
    fallbackDomain: "outlook.live.com",
  },
  {
    id: "onedrive",
    i18nKey: "m365_app_onedrive",
    label: "OneDrive",
    url: "https://onedrive.live.com/",
    icon: "icon/m365/onedrive.svg",
    fallbackDomain: "onedrive.live.com",
  },
  {
    id: "word",
    i18nKey: "m365_app_word",
    label: "Word",
    url: "https://m365.cloud.microsoft/launch/word",
    icon: "icon/m365/word.svg",
    fallbackDomain: "office.com",
  },
  {
    id: "excel",
    i18nKey: "m365_app_excel",
    label: "Excel",
    url: "https://m365.cloud.microsoft/launch/excel",
    icon: "icon/m365/excel.svg",
    fallbackDomain: "office.com",
  },
  {
    id: "powerpoint",
    i18nKey: "m365_app_powerpoint",
    label: "PowerPoint",
    url: "https://m365.cloud.microsoft/launch/powerpoint",
    icon: "icon/m365/powerpoint.svg",
    fallbackDomain: "office.com",
  },
  {
    id: "onenote",
    i18nKey: "m365_app_onenote",
    label: "OneNote",
    url: "https://www.onenote.com/notebooks",
    icon: "icon/m365/onenote.svg",
    fallbackDomain: "onenote.com",
  },
  {
    id: "todo",
    i18nKey: "m365_app_todo",
    label: "To Do",
    url: "https://to-do.live.com/tasks/",
    icon: "icon/m365/todo.svg",
    fallbackDomain: "to-do.live.com",
  },
  {
    id: "calendar",
    i18nKey: "m365_app_calendar",
    label: "Calendar",
    url: "https://outlook.live.com/calendar/",
    icon: "icon/m365/calendar.svg",
    fallbackDomain: "outlook.live.com",
  },
]

function resolveAssetUrl(path) {
  if (!path) return ""
  if (typeof chrome !== "undefined" && chrome?.runtime?.getURL) {
    try {
      return chrome.runtime.getURL(path)
    } catch {
      return path
    }
  }
  return path
}

const STORAGE_KEY = "startpageGoogleAppsV2"
const ICON_BASE =
  "https://cdn.jsdelivr.net/gh/ChickenSoup269/imagesForRepo@9b36511404829f1042f2628b944b30e30f4484ac/zero_extension/icon%20for%20google%20app%20v2"
const ICON_BASE_LATEST =
  "https://cdn.jsdelivr.net/gh/ChickenSoup269/imagesForRepo@main/zero_extension/icon%20for%20google%20app%20v2"
const latestIconFiles = new Set([
  "youtube.svg",
  "task-google-icon.png",
  "notebook-lm-dark.svg",
  "google-shopping.svg",
  "google-finance.png",
  "Google-passwords-Icon.png",
])
const ACCOUNT_DEFAULT_ICON =
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExODU3YnA3eWVvc2NocWpqZXJldHc3dXN4ZXBhMThsMHE1eDlybXQwciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/y4nk5bgwpWL6T5Ax9y/giphy.gif"
const defaultOptions = {
  dragEnabled: false,
  showTitles: true,
  showAppText: true,
  largePopup: false,
  showMiniSearch: true,
}

const defaultFavorites = [
  "search",
  "account",
  "gmail",
  "drive",
  "youtube",
  "gemini",
  "maps",
  "calendar",
  "news",
]

const sections = [
  {
    key: "g_apps_media",
    title: "Media & Communication",
    apps: ["photos", "meet", "chat", "translate", "messages", "voice"],
  },
  {
    key: "g_apps_workspace",
    title: "Workspace",
    apps: [
      "docs",
      "sheets",
      "slides",
      "forms",
      "vids",
      "keep",
      "classroom",
      "jamboard",
    ],
  },
  {
    key: "g_apps_services",
    title: "Services",
    apps: [
      "shopping",
      "finance",
      "books",
      "earth",
      "saved",
      "arts",
      "play_store",
      "podcast",
      "scholar",
      "one",
      "pay",
      "wallet",
      "wear_os",
    ],
  },
  {
    key: "g_apps_advanced",
    title: "System / Advanced",
    apps: [
      "ads",
      "adsense",
      "analytics",
      "search_console",
      "cloud",
      "firebase",
      "firebase_studio",
      "business",
      "contacts",
      "assistant",
      "collections",
    ],
  },
  {
    key: "g_apps_account_tools",
    title: "Account Tools",
    apps: ["passwords", "tasks", "notebook", "chrome_store"],
  },
]

const apps = [
  app(
    "search",
    "g_app_search",
    "Search",
    "https://www.google.com",
    "google-color",
  ),
  app(
    "account",
    "g_app_account",
    "Account",
    "https://myaccount.google.com/",
    null,
    "myaccount.google.com",
  ),
  app("gmail", "g_app_gmail", "Gmail", "https://mail.google.com", "gmail"),
  app(
    "drive",
    "g_app_drive",
    "Drive",
    "https://drive.google.com",
    "google-drive-color",
  ),
  app(
    "youtube",
    "g_app_youtube",
    "YouTube",
    "https://www.youtube.com",
    "youtube.svg",
    "youtube.com",
  ),
  app(
    "gemini",
    "g_app_gemini",
    "Gemini",
    "https://gemini.google.com/",
    "google-gemini",
  ),
  app("maps", "g_app_maps", "Maps", "https://maps.google.com", "google-map"),
  app(
    "calendar",
    "g_app_calendar",
    "Calendar",
    "https://calendar.google.com",
    "google-calendar",
  ),
  app("news", "g_app_news", "News", "https://news.google.com", "google-news"),
  app(
    "photos",
    "g_app_photos",
    "Photos",
    "https://photos.google.com",
    "google-photos",
  ),
  app("meet", "g_app_meet", "Meet", "https://meet.google.com", "google-meet"),
  app("chat", "g_app_chat", "Chat", "https://chat.google.com", "google-chat"),
  app(
    "translate",
    "g_app_translate",
    "Translate",
    "https://translate.google.com",
    "google-translate",
  ),
  app(
    "messages",
    "g_app_messages",
    "Messages",
    "https://messages.google.com/web",
    "google-messages",
  ),
  app(
    "voice",
    "g_app_voice",
    "Voice",
    "https://voice.google.com",
    "google-voice",
  ),
  app(
    "docs",
    "g_app_docs",
    "Docs",
    "https://docs.google.com/document/",
    "google-docs",
  ),
  app(
    "sheets",
    "g_app_sheets",
    "Sheets",
    "https://docs.google.com/spreadsheets/",
    "google-sheets",
  ),
  app(
    "slides",
    "g_app_slides",
    "Slides",
    "https://docs.google.com/presentation/",
    "google-slides",
  ),
  app(
    "forms",
    "g_app_forms",
    "Forms",
    "https://docs.google.com/forms/",
    "google-forms",
  ),
  app(
    "vids",
    "g_app_vids",
    "Vids",
    "https://docs.google.com/videos/",
    "google-vids",
  ),
  app("keep", "g_app_keep", "Keep", "https://keep.google.com/", "google-keep"),
  app(
    "classroom",
    "g_app_classroom",
    "Classroom",
    "https://classroom.google.com/",
    "google-classroom",
  ),
  app(
    "jamboard",
    "g_app_jamboard",
    "Jamboard",
    "https://jamboard.google.com/",
    "google-jamboard",
  ),
  app(
    "shopping",
    "g_app_shopping",
    "Shopping",
    "https://shopping.google.com/",
    "google-shopping.svg",
    "shopping.google.com",
  ),
  app(
    "finance",
    "g_app_finance",
    "Finance",
    "https://www.google.com/finance/",
    "google-finance.png",
    "google.com",
  ),
  app(
    "books",
    "g_app_books",
    "Books",
    "https://books.google.com/",
    "google-books",
  ),
  app(
    "earth",
    "g_app_earth",
    "Earth",
    "https://earth.google.com/",
    "google-earth",
  ),
  app(
    "saved",
    "g_app_saved",
    "Saved",
    "https://www.google.com/saved",
    "google-collections",
  ),
  app(
    "arts",
    "g_app_arts",
    "Arts & Culture",
    "https://artsandculture.google.com/",
    "google-arts-and-culture",
  ),
  app(
    "play_store",
    "g_app_play_store",
    "Play Store",
    "https://play.google.com/store",
    "google-play-store",
  ),
  app(
    "podcast",
    "g_app_podcast",
    "Podcast",
    "https://podcasts.google.com/",
    "google-podcast",
  ),
  app(
    "scholar",
    "g_app_scholar",
    "Scholar",
    "https://scholar.google.com/",
    "google-scholar",
  ),
  app(
    "one",
    "g_app_one",
    "Google One",
    "https://one.google.com/",
    "google-one",
  ),
  app(
    "pay",
    "g_app_pay",
    "Pay",
    "https://pay.google.com/",
    "google-pay-acceptance-mark",
  ),
  app(
    "wallet",
    "g_app_wallet",
    "Wallet",
    "https://wallet.google.com/",
    "google-wallet",
  ),
  app(
    "wear_os",
    "g_app_wear_os",
    "Wear OS",
    "https://wearos.google.com/",
    "google-wear-os",
  ),
  app("ads", "g_app_ads", "Ads", "https://ads.google.com/", "google-ads"),
  app(
    "adsense",
    "g_app_adsense",
    "AdSense",
    "https://www.google.com/adsense/start/",
    "google-adsense",
  ),
  app(
    "analytics",
    "g_app_analytics",
    "Analytics",
    "https://analytics.google.com",
    "google-analytics",
  ),
  app(
    "search_console",
    "g_app_search_console",
    "Search Console",
    "https://search.google.com/search-console",
    "google-search-console",
  ),
  app(
    "cloud",
    "g_app_cloud",
    "Cloud",
    "https://cloud.google.com/",
    "google-cloud",
  ),
  app(
    "firebase",
    "g_app_firebase",
    "Firebase",
    "https://firebase.google.com/",
    "google-firebase",
  ),
  app(
    "firebase_studio",
    "g_app_firebase_studio",
    "Firebase Studio",
    "https://idx.google.com/",
    "firebase-studio",
  ),
  app(
    "business",
    "g_app_business",
    "Business",
    "https://business.google.com/",
    "google-my-business",
  ),
  app(
    "contacts",
    "g_app_contacts",
    "Contacts",
    "https://contacts.google.com",
    "google-contacts",
  ),
  app(
    "assistant",
    "g_app_assistant",
    "Assistant",
    "https://assistant.google.com/",
    "google-assistant",
  ),
  app(
    "collections",
    "g_app_collections",
    "Collections",
    "https://www.google.com/collections",
    "google-collections",
  ),
  app(
    "passwords",
    "g_app_passwords",
    "Passwords",
    "https://passwords.google.com/",
    "Google-passwords-Icon.png",
    "passwords.google.com",
  ),
  app(
    "tasks",
    "g_app_tasks",
    "Tasks",
    "https://tasks.google.com",
    "task-google-icon.png",
    "tasks.google.com",
  ),
  app(
    "notebook",
    "g_app_notebook",
    "NotebookLM",
    "https://notebooklm.google.com/",
    "notebook-lm-dark.svg",
    "notebooklm.google.com",
  ),
  app(
    "chrome_store",
    "g_app_chrome_store",
    "Chrome Store",
    "https://chromewebstore.google.com/",
    null,
    "chromewebstore.google.com",
  ),
]

const appMap = new Map(apps.map((item) => [item.id, item]))
const defaultSectionApps = {
  favorites: defaultFavorites,
  ...sections.reduce((output, section) => {
    output[section.key] = section.apps
    return output
  }, {}),
}

function app(id, i18nKey, label, url, iconSlug = null, fallbackDomain = null) {
  return { id, i18nKey, label, url, iconSlug, fallbackDomain }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) || {}
    let modified = false

    // Sanitize any previous tracking IDs or tokens
    if (parsed.m365Config) {
      if (
        parsed.m365Config.headerUrl &&
        (parsed.m365Config.headerUrl.includes("client-request-id") ||
          parsed.m365Config.headerUrl.includes("345b16d7"))
      ) {
        parsed.m365Config.headerUrl = DEFAULT_M365_HEADER_URL
        modified = true
      }
      if (
        parsed.m365Config.allAppsUrl &&
        (parsed.m365Config.allAppsUrl.includes("client-request-id") ||
          parsed.m365Config.allAppsUrl.includes("345b16d7"))
      ) {
        parsed.m365Config.allAppsUrl = DEFAULT_M365_ALL_APPS_URL
        modified = true
      }
    }
    if (parsed.m365Urls && typeof parsed.m365Urls === "object") {
      for (const [key, val] of Object.entries(parsed.m365Urls)) {
        if (
          typeof val === "string" &&
          (val.includes("client-request-id") || val.includes("345b16d7"))
        ) {
          delete parsed.m365Urls[key]
          modified = true
        }
      }
    }

    if (modified) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
      } catch {}
    }
    return parsed
  } catch (error) {
    console.warn("Could not load Google Apps settings", error)
    return {}
  }
}

export function saveState(state) {
  try {
    if (state?.m365Config) {
      if (
        state.m365Config.headerUrl &&
        state.m365Config.headerUrl.includes("client-request-id")
      ) {
        state.m365Config.headerUrl = DEFAULT_M365_HEADER_URL
      }
      if (
        state.m365Config.allAppsUrl &&
        state.m365Config.allAppsUrl.includes("client-request-id")
      ) {
        state.m365Config.allAppsUrl = DEFAULT_M365_ALL_APPS_URL
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn("Could not save Google Apps settings", error)
  }
}

export function setLauncherProvider(provider) {
  const state = loadState()
  state.provider = provider === "edge" ? "edge" : "google"
  saveState(state)
  window.dispatchEvent(
    new CustomEvent("startpage:launcherModeChanged", {
      detail: { provider: state.provider },
    }),
  )
}

export function getLauncherProvider() {
  const state = loadState()
  return state.provider || "google"
}

export function updateM365Links(headerUrl, allAppsUrl) {
  const state = loadState()
  const cleanHeader = sanitizeCleanUrl(headerUrl, DEFAULT_M365_HEADER_URL)
  const cleanAllApps = sanitizeCleanUrl(allAppsUrl, DEFAULT_M365_ALL_APPS_URL)

  state.m365Config = {
    headerUrl: cleanHeader,
    allAppsUrl: cleanAllApps,
  }
  saveState(state)
  window.dispatchEvent(
    new CustomEvent("startpage:launcherModeChanged", {
      detail: { provider: state.provider || "google" },
    }),
  )
}

export function sanitizeCleanUrl(value, defaultFallback = "") {
  let url = String(value || "").trim()
  if (!url) return defaultFallback
  if (url.includes("client-request-id") || url.includes("345b16d7")) {
    try {
      const parsed = new URL(url)
      parsed.searchParams.delete("client-request-id")
      parsed.searchParams.delete("auth")
      parsed.searchParams.delete("origindomain")
      parsed.searchParams.delete("from")
      url = parsed.origin + parsed.pathname
    } catch {
      return defaultFallback
    }
  }
  return normalizeUrl(url) || defaultFallback
}

export function openM365LinksModal() {
  const i18n = geti18n()
  const state = loadState()
  const currentHeaderUrl =
    state.m365Config?.headerUrl || DEFAULT_M365_HEADER_URL
  const currentAllAppsUrl =
    state.m365Config?.allAppsUrl || DEFAULT_M365_ALL_APPS_URL

  const existing = document.querySelector(".m365-links-overlay")
  if (existing) existing.remove()

  const overlay = document.createElement("div")
  overlay.className = "custom-dialog-overlay active m365-links-overlay"
  overlay.innerHTML = `
    <div class="custom-dialog m365-links-dialog">
      <div class="dialog-header m365-dialog-header">
        <i class="fa-brands fa-microsoft"></i>
        <span>${i18n.m365_customize_links || "Customize Microsoft 365 Links"}</span>
      </div>
      <div class="dialog-body m365-dialog-body">
        <div class="m365-dialog-field">
          <label class="m365-dialog-label" for="m365-header-url-input">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            <span>${i18n.m365_header_link || "Microsoft 365 Link (Header)"}</span>
          </label>
          <div class="m365-dialog-input-wrap">
            <span class="m365-dialog-input-icon"><i class="fa-solid fa-link"></i></span>
            <input type="url" id="m365-header-url-input" class="dialog-input m365-dialog-input" value="${currentHeaderUrl}" placeholder="https://m365.cloud.microsoft/chat" spellcheck="false" autocomplete="off" />
            <button type="button" class="m365-dialog-input-reset" id="m365-header-reset-field" title="Reset">
              <i class="fa-solid fa-rotate-left"></i>
            </button>
          </div>
          <span class="m365-dialog-hint">${i18n.m365_header_link_hint || "URL opened when clicking Microsoft 365 header at the top"}</span>
        </div>

        <div class="m365-dialog-field">
          <label class="m365-dialog-label" for="m365-all-apps-url-input">
            <i class="fa-solid fa-table-cells-large"></i>
            <span>${i18n.m365_all_apps_link || "All Apps Link (Footer)"}</span>
          </label>
          <div class="m365-dialog-input-wrap">
            <span class="m365-dialog-input-icon"><i class="fa-solid fa-table-cells"></i></span>
            <input type="url" id="m365-all-apps-url-input" class="dialog-input m365-dialog-input" value="${currentAllAppsUrl}" placeholder="https://m365.cloud.microsoft/apps" spellcheck="false" autocomplete="off" />
            <button type="button" class="m365-dialog-input-reset" id="m365-all-apps-reset-field" title="Reset">
              <i class="fa-solid fa-rotate-left"></i>
            </button>
          </div>
          <span class="m365-dialog-hint">${i18n.m365_all_apps_link_hint || "URL opened when clicking 'All apps' at the bottom"}</span>
        </div>
      </div>
      <div class="dialog-footer m365-dialog-footer">
        <button type="button" class="dialog-btn dialog-btn-secondary" id="m365-links-reset-btn" style="flex: 0 0 auto; width: auto; padding: 0 14px; color: #ff7875;">
          <i class="fa-solid fa-rotate-left" style="margin-right: 6px;"></i><span>${i18n.m365_reset_links || "Reset to default"}</span>
        </button>
        <div style="display: flex; gap: 8px; flex: 1 1 auto; justify-content: flex-end;">
          <button type="button" class="dialog-btn dialog-btn-secondary" id="m365-links-cancel-btn" style="flex: 0 0 auto; width: auto; padding: 0 16px;">
            ${i18n.cancel || "Cancel"}
          </button>
          <button type="button" class="dialog-btn dialog-btn-primary" id="m365-links-save-btn" style="flex: 0 0 auto; width: auto; padding: 0 18px;">
            <i class="fa-solid fa-check" style="margin-right: 6px;"></i><span>${i18n.modal_save || "Save"}</span>
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  const headerInput = overlay.querySelector("#m365-header-url-input")
  const allAppsInput = overlay.querySelector("#m365-all-apps-url-input")
  const headerResetBtn = overlay.querySelector("#m365-header-reset-field")
  const allAppsResetBtn = overlay.querySelector("#m365-all-apps-reset-field")
  const resetBtn = overlay.querySelector("#m365-links-reset-btn")
  const cancelBtn = overlay.querySelector("#m365-links-cancel-btn")
  const saveBtn = overlay.querySelector("#m365-links-save-btn")

  const closeModal = () => {
    overlay.classList.remove("active")
    setTimeout(() => overlay.remove(), 200)
  }

  headerResetBtn?.addEventListener("click", () => {
    headerInput.value = DEFAULT_M365_HEADER_URL
    headerInput.focus()
  })

  allAppsResetBtn?.addEventListener("click", () => {
    allAppsInput.value = DEFAULT_M365_ALL_APPS_URL
    allAppsInput.focus()
  })

  resetBtn?.addEventListener("click", () => {
    headerInput.value = DEFAULT_M365_HEADER_URL
    allAppsInput.value = DEFAULT_M365_ALL_APPS_URL
  })

  cancelBtn?.addEventListener("click", closeModal)
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal()
  })

  const onKeydown = (e) => {
    if (e.key === "Escape") {
      closeModal()
      document.removeEventListener("keydown", onKeydown)
    } else if (e.key === "Enter") {
      saveBtn?.click()
    }
  }
  document.addEventListener("keydown", onKeydown)

  saveBtn?.addEventListener("click", () => {
    document.removeEventListener("keydown", onKeydown)
    updateM365Links(headerInput.value, allAppsInput.value)
    closeModal()
    showToast(i18n.m365_links_updated || "Microsoft 365 links updated", {
      type: "success",
    })
  })
}

function normalizeUrl(value) {
  const url = String(value || "").trim()
  if (!url) return ""
  if (/^(https?:|chrome:|edge:|about:)/i.test(url)) return url
  return `https://${url}`
}

function normalizeIconUrl(value) {
  const url = String(value || "").trim()
  if (!url) return ""
  if (/^(https?:|data:|blob:|file:|chrome:|edge:|about:)/i.test(url)) {
    return url
  }
  return `https://${url}`
}

function getAppHostname(item) {
  try {
    return item.fallbackDomain || new URL(item.url).hostname
  } catch {
    return item.fallbackDomain || ""
  }
}

function getDeclaredIconUrl(item) {
  if (item.id === "account") {
    try {
      const profileStr = localStorage.getItem("googleUserProfile")
      if (profileStr) {
        const profile = JSON.parse(profileStr)
        if (profile.picture) return profile.picture
      }
    } catch (e) {}
    return ACCOUNT_DEFAULT_ICON
  }
  if (item.iconSlug) {
    const fileName = item.iconSlug.includes(".")
      ? item.iconSlug
      : `${item.iconSlug}-icon.svg`
    const base = latestIconFiles.has(fileName) ? ICON_BASE_LATEST : ICON_BASE
    return `${base}/${fileName}`
  }
  const hostname = getAppHostname(item)
  return hostname
    ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
    : ""
}

function getWebIconUrl(item) {
  const hostname = getAppHostname(item)
  return hostname
    ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
    : getDeclaredIconUrl(item)
}

function getIconUrl(item, state = {}) {
  if (state.iconUrls?.[item.id]) return state.iconUrls[item.id]
  return getDeclaredIconUrl(item)
}

function getLabel(item) {
  const i18n = geti18n()
  return i18n[item.i18nKey] || item.label
}

function getSectionTitle(section) {
  const i18n = geti18n()
  return i18n[section.key] || section.title
}

function cleanFavorites(favorites) {
  const seen = new Set()
  return (Array.isArray(favorites) ? favorites : defaultFavorites).filter(
    (id) => {
      if (!appMap.has(id) || seen.has(id)) return false
      seen.add(id)
      return true
    },
  )
}

function cleanAppIds(ids) {
  const seen = new Set()
  return (Array.isArray(ids) ? ids : []).filter((id) => {
    if (!appMap.has(id) || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function getSectionApps(state) {
  const saved =
    state.sectionApps && typeof state.sectionApps === "object"
      ? state.sectionApps
      : {}
  return Object.keys(defaultSectionApps).reduce((output, key) => {
    const fallback =
      key === "favorites"
        ? cleanFavorites(state.favorites)
        : defaultSectionApps[key]
    output[key] = cleanAppIds(saved[key] || fallback)
    return output
  }, {})
}

function getSearchText(item) {
  return `${getLabel(item)} ${item.label} ${item.id}`.toLowerCase()
}

function createGrid(sectionKey) {
  const grid = document.createElement("div")
  grid.className = "g-apps-grid"
  grid.dataset.section = sectionKey
  return grid
}

function createSection(title, grid, className = "") {
  const section = document.createElement("div")
  section.className = `g-apps-section ${className}`.trim()
  section.dataset.sectionKey = grid.dataset.section
  const heading = document.createElement("h4")
  heading.textContent = title
  heading.dataset.dropSection = grid.dataset.section
  section.append(heading, grid)
  return section
}

function createItem(item, state, onContextMenu) {
  const options = { ...defaultOptions, ...(state.options || {}) }
  const link = document.createElement("a")
  link.href = item.url
  link.target = "_blank"
  link.rel = "noopener noreferrer"
  link.className = "g-app-item"
  link.draggable = options.dragEnabled
  link.dataset.appId = item.id
  link.title = getLabel(item)

  const icon = document.createElement("div")
  icon.className = "g-app-icon"

  const img = document.createElement("img")
  img.src = getIconUrl(item, state)
  img.alt = getLabel(item)
  img.loading = "lazy"
  img.decoding = "async"
  img.draggable = false
  img.addEventListener(
    "error",
    () => {
      img.src = getWebIconUrl(item)
    },
    { once: true },
  )

  const label = document.createElement("span")
  label.textContent = getLabel(item)

  const dragHandle = document.createElement("div")
  dragHandle.className = "g-app-drag-handle"
  dragHandle.innerHTML = '<i class="fa-solid fa-grip-vertical"></i>'

  icon.appendChild(img)
  link.append(dragHandle, icon, label)

  link.addEventListener("dragstart", (event) => {
    if (!options.dragEnabled) {
      event.preventDefault()
      return
    }
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", item.id)
    link.classList.add("dragging")
  })
  link.addEventListener("dragend", () => {
    link.classList.remove("dragging")
    document
      .querySelectorAll(".g-apps-grid.drag-over")
      .forEach((grid) => grid.classList.remove("drag-over"))
  })
  link.addEventListener("contextmenu", (event) => {
    event.preventDefault()
    event.stopPropagation()
    onContextMenu(event, item)
  })

  return link
}

export function initGoogleApps() {
  const root = document.getElementById("g-apps-dynamic-root")
  const button = document.querySelector(".google-apps-btn")
  const dropdown = document.getElementById("g-apps-dropdown")
  const scrollArea = dropdown?.querySelector(".g-apps-scroll-area")
  if (!root) return

  let state = loadState()
  let pointerDrag = null
  let suppressNextClick = false
  let searchQuery = ""

  const persist = () => saveState(state)

  const renderEdgeLauncher = (fragment) => {
    const i18n = geti18n()
    const headerUrl =
      state.m365Config?.headerUrl || DEFAULT_M365_HEADER_URL
    const allAppsUrl =
      state.m365Config?.allAppsUrl || DEFAULT_M365_ALL_APPS_URL

    // Header
    const header = document.createElement("div")
    header.className = "m365-header"

    const title = document.createElement("span")
    title.className = "m365-header-title"
    title.textContent = i18n.m365_title || "Microsoft 365"

    const actions = document.createElement("div")
    actions.className = "m365-header-actions"

    const m365Link = document.createElement("a")
    m365Link.className = "m365-header-link"
    m365Link.href = headerUrl
    m365Link.target = "_blank"
    m365Link.rel = "noopener noreferrer"
    m365Link.innerHTML = `<span>${i18n.m365_title || "Microsoft 365"}</span> <i class="fa-solid fa-arrow-right"></i>`

    const gearBtn = document.createElement("button")
    gearBtn.type = "button"
    gearBtn.className = "m365-gear-btn"
    gearBtn.title = i18n.settings_title || "Options"
    gearBtn.setAttribute("aria-label", "Microsoft 365 Options")
    gearBtn.innerHTML = '<i class="fa-solid fa-gear"></i>'
    gearBtn.addEventListener("click", (event) => {
      event.preventDefault()
      event.stopPropagation()
      showGoogleAppsMenu(event, null)
    })

    actions.append(m365Link, gearBtn)
    header.append(title, actions)
    fragment.appendChild(header)

    // Grid: 8 apps
    const grid = document.createElement("div")
    grid.className = "m365-grid"

    defaultM365Apps.forEach((app) => {
      const itemUrl = state.m365Urls?.[app.id] || app.url
      const rawIcon =
        state.m365IconUrls?.[app.id] || resolveAssetUrl(app.icon)
      const appLabel = i18n[app.i18nKey] || app.label

      const item = document.createElement("a")
      item.className = "m365-item"
      item.href = itemUrl
      item.target = "_blank"
      item.rel = "noopener noreferrer"
      item.dataset.appId = app.id
      item.title = appLabel

      const iconWrap = document.createElement("div")
      iconWrap.className = "m365-item-icon"

      const img = document.createElement("img")
      img.src = rawIcon
      img.alt = appLabel
      img.loading = "lazy"
      img.decoding = "async"
      img.draggable = false
      img.addEventListener(
        "error",
        () => {
          img.src = `https://www.google.com/s2/favicons?domain=${app.fallbackDomain}&sz=64`
        },
        { once: true },
      )

      iconWrap.appendChild(img)

      const name = document.createElement("span")
      name.className = "m365-item-name"
      name.textContent = appLabel

      item.append(iconWrap, name)

      item.addEventListener("contextmenu", (event) => {
        event.preventDefault()
        event.stopPropagation()
        showGoogleAppsMenu(event, {
          id: app.id,
          label: appLabel,
          url: itemUrl,
          defaultUrl: app.url,
          isM365: true,
          icon: app.icon,
          fallbackDomain: app.fallbackDomain,
        })
      })

      grid.appendChild(item)
    })

    fragment.appendChild(grid)

    // Footer
    const footer = document.createElement("div")
    footer.className = "m365-footer"

    const allAppsLink = document.createElement("a")
    allAppsLink.className = "m365-all-apps-link"
    allAppsLink.href = allAppsUrl
    allAppsLink.target = "_blank"
    allAppsLink.rel = "noopener noreferrer"
    allAppsLink.innerHTML = `<span>${i18n.m365_all_apps || "Tất cả Ứng dụng"}</span> <i class="fa-solid fa-arrow-right"></i>`

    footer.appendChild(allAppsLink)
    fragment.appendChild(footer)
  }

  const render = () => {
    const fragment = document.createDocumentFragment()
    const previousLargeFavorites = state.options?.largeFavorites === true
    state = {
      provider: state.provider || "google",
      m365Config:
        state.m365Config && typeof state.m365Config === "object"
          ? state.m365Config
          : {},
      m365Urls:
        state.m365Urls && typeof state.m365Urls === "object"
          ? state.m365Urls
          : {},
      m365IconUrls:
        state.m365IconUrls && typeof state.m365IconUrls === "object"
          ? state.m365IconUrls
          : {},
      sectionApps: getSectionApps(state),
      favorites: cleanFavorites(state.favorites),
      iconUrls:
        state.iconUrls && typeof state.iconUrls === "object"
          ? state.iconUrls
          : {},
      options: {
        ...defaultOptions,
        ...(state.options || {}),
        largePopup: state.options?.largePopup ?? previousLargeFavorites,
      },
    }

    const isEdge = state.provider === "edge"
    dropdown?.classList.toggle("is-edge-mode", isEdge)
    if (button) {
      if (isEdge) {
        button.title = geti18n().m365_tooltip || "Microsoft 365"
        button.setAttribute(
          "aria-label",
          geti18n().m365_tooltip || "Microsoft 365",
        )
        button.href =
          state.m365Config?.headerUrl || DEFAULT_M365_HEADER_URL
      } else {
        button.title = geti18n().google_apps_tooltip || "Google Apps"
        button.setAttribute(
          "aria-label",
          geti18n().google_apps_tooltip || "Google Apps",
        )
        button.href = "https://about.google/products/"
      }
    }

    if (isEdge) {
      renderEdgeLauncher(fragment)
      root.replaceChildren(fragment)
      persist()
      return
    }

    root.className = ""
    root.classList.toggle("g-apps-drag-enabled", state.options.dragEnabled)
    root.classList.toggle("g-apps-hide-titles", !state.options.showTitles)
    root.classList.toggle("g-apps-hide-app-text", !state.options.showAppText)
    root.classList.toggle("g-apps-search-hidden", !state.options.showMiniSearch)
    dropdown?.classList.toggle("g-apps-large-popup", state.options.largePopup)

    if (state.options.showMiniSearch) {
      const searchWrap = document.createElement("div")
      searchWrap.className = "g-apps-mini-search"

      const searchIcon = document.createElement("i")
      searchIcon.className = "fa-solid fa-magnifying-glass g-apps-search-icon"
      searchWrap.appendChild(searchIcon)

      const searchInput = document.createElement("input")
      searchInput.type = "search"
      searchInput.value = searchQuery
      searchInput.placeholder =
        geti18n().g_apps_search_placeholder || "Search apps..."
      searchInput.autocomplete = "off"
      searchInput.spellcheck = false
      searchInput.addEventListener("input", () => {
        searchQuery = searchInput.value.trim().toLowerCase()
        render()
        const newInput = document.querySelector(".g-apps-mini-search input")
        if (newInput) {
          newInput.focus()
          newInput.setSelectionRange(
            newInput.value.length,
            newInput.value.length,
          )
        }
      })
      searchWrap.appendChild(searchInput)

      if (searchQuery) {
        const clearBtn = document.createElement("button")
        clearBtn.type = "button"
        clearBtn.className = "g-apps-search-clear-btn"
        clearBtn.setAttribute("aria-label", "Clear search")
        clearBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
        clearBtn.addEventListener("click", () => {
          searchQuery = ""
          render()
          document.querySelector(".g-apps-mini-search input")?.focus()
        })
        searchWrap.appendChild(clearBtn)
      }

      const gearBtn = document.createElement("button")
      gearBtn.type = "button"
      gearBtn.className = "g-apps-search-gear-btn"
      gearBtn.title = geti18n().settings_title || "Options"
      gearBtn.setAttribute("aria-label", "Google Apps Options")
      gearBtn.innerHTML = '<i class="fa-solid fa-gear"></i>'
      gearBtn.addEventListener("click", (event) => {
        event.preventDefault()
        event.stopPropagation()
        showGoogleAppsMenu(event, null)
      })
      searchWrap.appendChild(gearBtn)

      fragment.appendChild(searchWrap)
    }

    const favoritesGrid = createGrid("favorites")
    favoritesGrid.dataset.favoriteTarget = "true"
    state.sectionApps.favorites
      .map((id) => appMap.get(id))
      .filter(Boolean)
      .filter(
        (item) => !searchQuery || getSearchText(item).includes(searchQuery),
      )
      .forEach((item) =>
        favoritesGrid.appendChild(createItem(item, state, showGoogleAppsMenu)),
      )
    fragment.appendChild(
      createSection(
        geti18n().g_apps_favorites || "Your favorites",
        favoritesGrid,
        "is-favorites",
      ),
    )

    sections.forEach((section) => {
      const divider = document.createElement("div")
      divider.className = "g-apps-divider"
      fragment.appendChild(divider)

      const grid = createGrid(section.key)
      state.sectionApps[section.key]
        .map((id) => appMap.get(id))
        .filter(Boolean)
        .filter(
          (item) => !searchQuery || getSearchText(item).includes(searchQuery),
        )
        .forEach((item) =>
          grid.appendChild(createItem(item, state, showGoogleAppsMenu)),
        )
      fragment.appendChild(createSection(getSectionTitle(section), grid))
    })

    root.replaceChildren(fragment)
    bindDropTargets()
    persist()
  }

  const moveAppToSection = (id, targetSection, beforeId = null) => {
    if (!appMap.has(id)) return
    const sectionApps = getSectionApps(state)
    Object.keys(sectionApps).forEach((key) => {
      sectionApps[key] = sectionApps[key].filter((itemId) => itemId !== id)
    })
    const targetApps = sectionApps[targetSection] || []
    const beforeIndex = beforeId ? targetApps.indexOf(beforeId) : -1
    if (beforeIndex >= 0) targetApps.splice(beforeIndex, 0, id)
    else targetApps.push(id)
    sectionApps[targetSection] = targetApps
    state.sectionApps = sectionApps
    state.favorites = sectionApps.favorites
    render()
  }

  function getDropBeforeId(grid, x, y) {
    const allItems = [...grid.querySelectorAll(".g-app-item")]
    const validItems = allItems.filter(
      (item) => !item.classList.contains("dragging"),
    )
    if (validItems.length === 0) return null

    let closestItem = null
    let minDistance = Infinity

    for (const item of validItems) {
      const rect = item.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const distance = Math.hypot(x - centerX, y - centerY)

      if (distance < minDistance) {
        minDistance = distance
        closestItem = item
      }
    }

    if (!closestItem) return null

    const draggedItem = document.querySelector(".g-app-item.dragging")
    const closestIndex = allItems.indexOf(closestItem)
    const draggedIndex = draggedItem ? allItems.indexOf(draggedItem) : -1

    let isBefore = false

    if (draggedIndex !== -1 && allItems.includes(draggedItem)) {
      isBefore = draggedIndex > closestIndex
    } else {
      const rect = closestItem.getBoundingClientRect()
      isBefore = x < rect.left + rect.width / 2
    }

    if (isBefore) {
      return closestItem.dataset.appId
    } else {
      const index = validItems.indexOf(closestItem)
      const nextItem = validItems[index + 1]
      return nextItem ? nextItem.dataset.appId : null
    }
  }

  function updateDropIndicator(grid, x, y) {
    document.querySelectorAll(".g-app-item").forEach((el) => {
      el.classList.remove("drag-insert-before", "drag-insert-after")
    })
    if (!grid) return

    const dropBeforeId = getDropBeforeId(grid, x, y)
    if (dropBeforeId) {
      const target = grid.querySelector(`[data-app-id="${dropBeforeId}"]`)
      if (target) target.classList.add("drag-insert-before")
    } else {
      const items = [...grid.querySelectorAll(".g-app-item:not(.dragging)")]
      if (items.length > 0) {
        items[items.length - 1].classList.add("drag-insert-after")
      }
    }
  }

  function clearDropIndicator() {
    document.querySelectorAll(".g-app-item").forEach((el) => {
      el.classList.remove("drag-insert-before", "drag-insert-after")
    })
  }

  let scrollInterval = null

  function handleAutoScroll(y) {
    if (!scrollArea) return
    const rect = scrollArea.getBoundingClientRect()
    const edge = 50
    let speed = 0

    if (y < rect.top + edge) {
      speed = -8
    } else if (y > rect.bottom - edge) {
      speed = 8
    }

    if (speed !== 0) {
      if (!scrollInterval) {
        scrollInterval = setInterval(() => {
          scrollArea.scrollTop += speed
        }, 16)
      }
    } else {
      stopAutoScroll()
    }
  }

  function stopAutoScroll() {
    if (scrollInterval) {
      clearInterval(scrollInterval)
      scrollInterval = null
    }
  }

  function bindDropTargets() {
    if (scrollArea) {
      scrollArea.addEventListener("dragover", (event) => {
        handleAutoScroll(event.clientY)
      })
      scrollArea.addEventListener("dragleave", stopAutoScroll)
      scrollArea.addEventListener("drop", stopAutoScroll)
    }

    root.querySelectorAll(".g-apps-grid").forEach((grid) => {
      grid.addEventListener("dragover", (event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        grid.classList.add("drag-over")
        updateDropIndicator(grid, event.clientX, event.clientY)
      })
      grid.addEventListener("dragleave", (event) => {
        if (!grid.contains(event.relatedTarget)) {
          grid.classList.remove("drag-over")
          clearDropIndicator()
        }
      })
      grid.addEventListener("drop", (event) => {
        event.preventDefault()
        grid.classList.remove("drag-over")
        clearDropIndicator()
        const id = event.dataTransfer.getData("text/plain")
        moveAppToSection(
          id,
          grid.dataset.section,
          getDropBeforeId(grid, event.clientX, event.clientY),
        )
      })
    })
    root.querySelectorAll("[data-drop-section]").forEach((heading) => {
      heading.addEventListener("dragover", (event) => {
        event.preventDefault()
        heading.classList.add("drag-over")
      })
      heading.addEventListener("dragleave", () => {
        heading.classList.remove("drag-over")
      })
      heading.addEventListener("drop", (event) => {
        event.preventDefault()
        heading.classList.remove("drag-over")
        const id = event.dataTransfer.getData("text/plain")
        moveAppToSection(id, heading.dataset.dropSection)
      })
    })
  }

  root.addEventListener("pointerdown", (event) => {
    if (!state.options?.dragEnabled) return
    if (event.pointerType === "mouse") return
    const item = event.target.closest(".g-app-item")
    if (!item || event.button !== 0) return
    pointerDrag = {
      id: item.dataset.appId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    }
  })

  root.addEventListener("pointermove", (event) => {
    if (!state.options?.dragEnabled) return
    if (!pointerDrag) return
    const distance = Math.hypot(
      event.clientX - pointerDrag.startX,
      event.clientY - pointerDrag.startY,
    )
    if (distance > 8) pointerDrag.moved = true

    if (pointerDrag.moved) {
      handleAutoScroll(event.clientY)
      const dropGrid = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest(".g-apps-grid")
      updateDropIndicator(dropGrid, event.clientX, event.clientY)
    }
  })

  root.addEventListener("pointerup", (event) => {
    if (!state.options?.dragEnabled) return
    if (!pointerDrag) return
    const drag = pointerDrag
    pointerDrag = null
    clearDropIndicator()
    stopAutoScroll()
    if (!drag.moved) return

    suppressNextClick = true
    const dropGrid = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest(".g-apps-grid, [data-drop-section]")
    if (dropGrid?.classList?.contains("g-apps-grid")) {
      moveAppToSection(
        drag.id,
        dropGrid.dataset.section,
        getDropBeforeId(dropGrid, event.clientX, event.clientY),
      )
    } else if (dropGrid?.dataset?.dropSection) {
      moveAppToSection(drag.id, dropGrid.dataset.dropSection)
    }
  })

  root.addEventListener(
    "click",
    (event) => {
      if (!suppressNextClick) return
      event.preventDefault()
      event.stopPropagation()
      suppressNextClick = false
    },
    true,
  )

  function showIconChangedToast(previousIconUrls) {
    const i18n = geti18n()
    const isM365 = state.provider === "edge"
    showToast(i18n.g_apps_icon_changed || "App icon updated", {
      type: "success",
      undoFn: () => {
        if (isM365) {
          state.m365IconUrls = previousIconUrls
        } else {
          state.iconUrls = previousIconUrls
        }
        render()
      },
    })
  }

  function uploadIcon(item) {
    const isM365 = state.provider === "edge" || item.isM365
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.addEventListener("change", () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      const previousIconUrls = isM365
        ? { ...(state.m365IconUrls || {}) }
        : { ...(state.iconUrls || {}) }
      reader.addEventListener("load", () => {
        if (isM365) {
          state.m365IconUrls = { ...(state.m365IconUrls || {}) }
          state.m365IconUrls[item.id] = String(reader.result || "")
        } else {
          state.iconUrls = { ...(state.iconUrls || {}) }
          state.iconUrls[item.id] = String(reader.result || "")
        }
        render()
        showIconChangedToast(previousIconUrls)
      })
      reader.readAsDataURL(file)
    })
    input.click()
  }

  function applyIconValue(item, value, previousIconUrls) {
    const normalized = normalizeIconUrl(value)
    const isM365 = state.provider === "edge" || item.isM365
    if (isM365) {
      const defaultIcon = resolveAssetUrl(item.icon || `icon/m365/${item.id}.svg`)
      state.m365IconUrls = { ...(state.m365IconUrls || {}) }
      if (normalized && normalized !== defaultIcon) {
        state.m365IconUrls[item.id] = normalized
      } else {
        delete state.m365IconUrls[item.id]
      }
      render()
      showIconChangedToast(previousIconUrls)
      return
    }
    const defaultIcon = getDeclaredIconUrl(item)
    state.iconUrls = { ...(state.iconUrls || {}) }
    if (normalized && normalized !== defaultIcon) {
      state.iconUrls[item.id] = normalized
    } else {
      delete state.iconUrls[item.id]
    }
    render()
    showIconChangedToast(previousIconUrls)
  }

  function hideGoogleAppsIconPopover() {
    document.querySelector(".g-apps-icon-popover")?.remove()
  }

  function createIconChoice(iconClass, label, value, onSelect) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "g-apps-icon-choice"
    button.dataset.value = value || ""
    button.innerHTML = `<i class="${iconClass}"></i><span>${label}</span>`
    button.addEventListener("click", () => onSelect(value || ""))
    return button
  }

  function positionIconPopover(popover, x, y) {
    const padding = 10
    const rect = popover.getBoundingClientRect()
    popover.style.left = `${Math.max(
      padding,
      Math.min(x, window.innerWidth - rect.width - padding),
    )}px`
    popover.style.top = `${Math.max(
      padding,
      Math.min(y, window.innerHeight - rect.height - padding),
    )}px`
  }

  function openIconPicker(item, anchorEvent = null) {
    hideGoogleAppsIconPopover()
    const i18n = geti18n()
    const isM365 = state.provider === "edge" || item.isM365
    const previousIconUrls = isM365
      ? { ...(state.m365IconUrls || {}) }
      : { ...(state.iconUrls || {}) }
    const defaultIcon = isM365
      ? resolveAssetUrl(item.icon || `icon/m365/${item.id}.svg`)
      : getDeclaredIconUrl(item)
    const webIcon = isM365
      ? (item.fallbackDomain ? `https://www.google.com/s2/favicons?domain=${item.fallbackDomain}&sz=128` : defaultIcon)
      : getWebIconUrl(item)
    let selectedValue = isM365
      ? (state.m365IconUrls?.[item.id] || defaultIcon)
      : (state.iconUrls?.[item.id] || defaultIcon)

    const popover = document.createElement("div")
    popover.className = "g-apps-icon-popover"
    popover.addEventListener("click", (event) => event.stopPropagation())
    popover.addEventListener("pointerdown", (event) => event.stopPropagation())

    const header = document.createElement("div")
    header.className = "g-apps-icon-popover-header"
    header.innerHTML = `<div><i class="fa-solid fa-icons"></i><span>${i18n.g_apps_menu_edit_icon || "Edit icon"}</span></div>`
    const closeBtn = document.createElement("button")
    closeBtn.type = "button"
    closeBtn.setAttribute("aria-label", i18n.close || "Close")
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
    closeBtn.addEventListener("click", hideGoogleAppsIconPopover)
    header.appendChild(closeBtn)
    popover.appendChild(header)

    const preview = document.createElement("div")
    preview.className = "g-apps-icon-preview"
    const previewImg = document.createElement("img")
    previewImg.alt = item.label || getLabel(item)
    previewImg.referrerPolicy = "no-referrer"
    preview.appendChild(previewImg)
    popover.appendChild(preview)

    const choices = document.createElement("div")
    choices.className = "g-apps-icon-choices"
    popover.appendChild(choices)

    const field = document.createElement("label")
    field.className = "g-apps-icon-url-field"
    field.innerHTML = `<span>${i18n.g_apps_custom_icon_url || "Custom icon URL"}</span>`
    const input = document.createElement("input")
    input.type = "text"
    input.value =
      selectedValue &&
      selectedValue !== defaultIcon &&
      selectedValue !== webIcon
        ? selectedValue
        : ""
    input.placeholder = "https://... or data:image/..."
    field.appendChild(input)
    popover.appendChild(field)

    const actions = document.createElement("div")
    actions.className = "g-apps-icon-actions"
    const uploadBtn = document.createElement("button")
    uploadBtn.type = "button"
    uploadBtn.className = "secondary-btn"
    uploadBtn.innerHTML = `<i class="fa-solid fa-upload"></i><span>${i18n.g_apps_menu_upload_icon || "Upload icon"}</span>`
    const saveBtn = document.createElement("button")
    saveBtn.type = "button"
    saveBtn.className = "primary-btn"
    saveBtn.innerHTML = `<i class="fa-solid fa-check"></i><span>${i18n.modal_save || "Save"}</span>`
    actions.append(uploadBtn, saveBtn)
    popover.appendChild(actions)

    const syncPreview = () => {
      previewImg.src = selectedValue || defaultIcon
      choices.querySelectorAll(".g-apps-icon-choice").forEach((choice) => {
        choice.classList.toggle(
          "active",
          choice.dataset.value === selectedValue,
        )
      })
    }

    const selectValue = (value) => {
      selectedValue = value || defaultIcon
      if (selectedValue === defaultIcon || selectedValue === webIcon) {
        input.value = ""
      } else {
        input.value = selectedValue
      }
      syncPreview()
    }

    choices.append(
      createIconChoice(
        "fa-solid fa-rotate-left",
        i18n.g_apps_default_icon || "Default",
        defaultIcon,
        selectValue,
      ),
      createIconChoice(
        "fa-solid fa-globe",
        i18n.g_apps_web_icon || "Web icon",
        webIcon,
        selectValue,
      ),
      createIconChoice(
        "fa-solid fa-link",
        i18n.g_apps_url_icon || "URL",
        selectedValue !== defaultIcon && selectedValue !== webIcon
          ? selectedValue
          : "",
        () => {
          selectedValue = normalizeIconUrl(input.value) || selectedValue
          input.focus()
          syncPreview()
        },
      ),
    )

    input.addEventListener("input", () => {
      selectedValue = normalizeIconUrl(input.value) || defaultIcon
      syncPreview()
    })
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault()
        applyIconValue(item, selectedValue, previousIconUrls)
        hideGoogleAppsIconPopover()
      }
      if (event.key === "Escape") hideGoogleAppsIconPopover()
    })

    uploadBtn.addEventListener("click", () => {
      const fileInput = document.createElement("input")
      fileInput.type = "file"
      fileInput.accept = "image/*"
      fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.addEventListener("load", () => {
          selectedValue = String(reader.result || "")
          input.value = selectedValue
          syncPreview()
        })
        reader.readAsDataURL(file)
      })
      fileInput.click()
    })

    saveBtn.addEventListener("click", () => {
      applyIconValue(item, selectedValue, previousIconUrls)
      hideGoogleAppsIconPopover()
    })

    document.body.appendChild(popover)
    syncPreview()
    const x = anchorEvent?.clientX ?? window.innerWidth / 2
    const y = anchorEvent?.clientY ?? window.innerHeight / 2
    positionIconPopover(popover, x, y)
    input.focus()
  }

  function resetIcon(item) {
    const isM365 = state.provider === "edge" || item.isM365
    if (isM365) {
      const previousIconUrls = { ...(state.m365IconUrls || {}) }
      state.m365IconUrls = { ...(state.m365IconUrls || {}) }
      delete state.m365IconUrls[item.id]
      if (state.m365Urls?.[item.id]) {
        state.m365Urls = { ...(state.m365Urls || {}) }
        delete state.m365Urls[item.id]
      }
      render()
      showIconChangedToast(previousIconUrls)
      return
    }
    if (!state.iconUrls?.[item.id]) return
    const previousIconUrls = { ...(state.iconUrls || {}) }
    state.iconUrls = { ...(state.iconUrls || {}) }
    delete state.iconUrls[item.id]
    render()
    showIconChangedToast(previousIconUrls)
  }

  function resetGoogleApps() {
    if (state.provider === "edge") {
      delete state.m365Config
      delete state.m365Urls
      delete state.m365IconUrls
      persist()
      render()
      hideGoogleAppsMenu()
      showToast(geti18n().m365_links_updated || "Reset", { type: "success" })
      return
    }
    localStorage.removeItem(STORAGE_KEY)
    state = {}
    render()
    hideGoogleAppsMenu()
  }

  async function editAppUrl(item) {
    const i18n = geti18n()
    const isM365 = state.provider === "edge" || item.isM365
    const currentUrl = isM365
      ? (state.m365Urls?.[item.id] || item.url)
      : item.url
    const newUrl = await showPrompt(
      i18n.g_apps_edit_url_prompt || "Enter a custom URL for this app:",
      currentUrl,
      item.label || getLabel(item),
    )
    if (newUrl !== null) {
      const normalized = normalizeUrl(newUrl)
      if (isM365) {
        state.m365Urls = { ...(state.m365Urls || {}) }
        if (normalized && normalized !== (item.defaultUrl || item.url)) {
          state.m365Urls[item.id] = normalized
        } else {
          delete state.m365Urls[item.id]
        }
      }
      persist()
      render()
      showToast(i18n.saved_success || "Saved", { type: "success" })
    }
  }

  function updateOption(key, value) {
    state.options = {
      ...defaultOptions,
      ...(state.options || {}),
      [key]: value,
    }
    render()
  }

  function getMenuLabels(item) {
    const i18n = geti18n()
    const isM365Item = item?.isM365 || state.provider === "edge"
    return {
      open: i18n.g_apps_menu_open || "Open",
      editUrl: i18n.m365_edit_app_link || "Edit App URL",
      editIcon: i18n.g_apps_menu_edit_icon || "Edit icon URL",
      uploadIcon: i18n.g_apps_menu_upload_icon || "Upload icon",
      resetIcon: i18n.g_apps_menu_reset_icon || "Reset this icon",
      dragEnabled: i18n.g_apps_menu_drag || "Enable drag & drop",
      showTitles: i18n.g_apps_menu_titles || "Show titles",
      showAppText: i18n.g_apps_menu_app_text || "Show app names",
      largePopup: i18n.g_apps_menu_large_popup || "Large popup",
      showMiniSearch: i18n.g_apps_menu_mini_search || "Mini search",
      reset: isM365Item
        ? (i18n.m365_reset_links || "Reset Microsoft 365")
        : (i18n.g_apps_reset || "Reset Google Apps"),
      currentApp: item ? (item.label || getLabel(item)) : "",
      scrollTop: i18n.g_apps_scroll_top || "Scroll to top",
      launcherStyle: i18n.g_apps_launcher_style || "App Launcher Style",
      providerGoogle: i18n.g_apps_provider_google || "Google Apps",
      providerEdge: i18n.g_apps_provider_edge || "Microsoft 365 (Edge)",
      customizeM365: i18n.m365_customize_links || "Customize Microsoft 365 Links",
    }
  }

  function hideGoogleAppsMenu() {
    document.querySelector(".g-apps-context-menu")?.remove()
  }

  function createMenuButton(iconClass, label, onClick, danger = false) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = `g-apps-menu-btn${danger ? " danger" : ""}`
    button.innerHTML = `<i class="${iconClass}"></i><span>${label}</span>`
    button.addEventListener("click", onClick)
    return button
  }

  function createMenuToggle(key, label) {
    const toggle = document.createElement("label")
    toggle.className = "g-apps-menu-toggle"
    const input = document.createElement("input")
    input.type = "checkbox"
    input.checked = Boolean(state.options?.[key])
    const box = document.createElement("span")
    box.className = "g-apps-menu-check"
    box.innerHTML = '<i class="fa-solid fa-check"></i>'
    const text = document.createElement("span")
    text.textContent = label
    input.addEventListener("change", () => {
      updateOption(key, input.checked)
      hideGoogleAppsMenu()
    })
    toggle.append(input, box, text)
    return toggle
  }

  function showGoogleAppsMenu(event, item) {
    hideGoogleAppsMenu()
    const isEdge = state.provider === "edge"
    const fallbackItem =
      item ||
      (isEdge
        ? defaultM365Apps[0]
        : appMap.get(state.favorites[0] || "search") || apps[0])
    const labels = getMenuLabels(fallbackItem)
    const menu = document.createElement("div")
    menu.className = "g-apps-context-menu"
    menu.addEventListener("click", (menuEvent) => menuEvent.stopPropagation())
    menu.addEventListener("pointerdown", (menuEvent) =>
      menuEvent.stopPropagation(),
    )
    menu.addEventListener("contextmenu", (menuEvent) => {
      menuEvent.preventDefault()
      menuEvent.stopPropagation()
    })

    const createMenuProviderSelect = () => {
      const wrap = document.createElement("div")
      wrap.className = "g-apps-menu-select-wrap"
      wrap.innerHTML = `
        <span class="g-apps-menu-select-label"><i class="fa-solid fa-layer-group"></i> ${labels.launcherStyle}</span>
        <select class="g-apps-menu-provider-select">
          <option value="google" ${!isEdge ? "selected" : ""}>${labels.providerGoogle}</option>
          <option value="edge" ${isEdge ? "selected" : ""}>${labels.providerEdge}</option>
        </select>
      `
      const sel = wrap.querySelector("select")
      sel.addEventListener("change", () => {
        state.provider = sel.value
        persist()
        render()
        hideGoogleAppsMenu()
        window.dispatchEvent(
          new CustomEvent("startpage:launcherModeChanged", {
            detail: { provider: state.provider },
          }),
        )
      })
      return wrap
    }

    if (item) {
      menu.innerHTML = `<div class="g-apps-menu-title">${labels.currentApp}</div>`
      menu.appendChild(
        createMenuButton(
          "fa-solid fa-up-right-from-square",
          labels.open,
          () => {
            window.open(item.url, "_blank", "noopener")
            hideGoogleAppsMenu()
          },
        ),
      )
      if (isEdge || item.isM365) {
        menu.appendChild(
          createMenuButton("fa-solid fa-link", labels.editUrl, () => {
            hideGoogleAppsMenu()
            editAppUrl(item)
          }),
        )
      }
      menu.appendChild(
        createMenuButton("fa-solid fa-image", labels.editIcon, () => {
          hideGoogleAppsMenu()
          openIconPicker(item, event)
        }),
      )
      menu.appendChild(
        createMenuButton("fa-solid fa-upload", labels.uploadIcon, () => {
          hideGoogleAppsMenu()
          uploadIcon(item)
        }),
      )
      menu.appendChild(
        createMenuButton("fa-solid fa-rotate-left", labels.resetIcon, () => {
          hideGoogleAppsMenu()
          resetIcon(item)
        }),
      )
      const divider1 = document.createElement("div")
      divider1.className = "g-apps-menu-divider"
      menu.appendChild(divider1)
    } else {
      menu.innerHTML = `<div class="g-apps-menu-title">${geti18n().settings_title || "Options"}</div>`
    }

    menu.appendChild(createMenuProviderSelect())

    if (isEdge) {
      menu.appendChild(
        createMenuButton("fa-solid fa-sliders", labels.customizeM365, () => {
          hideGoogleAppsMenu()
          openM365LinksModal()
        }),
      )
    } else {
      const list = document.createElement("div")
      list.className = "g-apps-menu-list"
      list.append(
        createMenuToggle("dragEnabled", labels.dragEnabled),
        createMenuToggle("showTitles", labels.showTitles),
        createMenuToggle("showAppText", labels.showAppText),
        createMenuToggle("showMiniSearch", labels.showMiniSearch),
        createMenuToggle("largePopup", labels.largePopup),
      )
      menu.appendChild(list)
    }

    const divider2 = document.createElement("div")
    divider2.className = "g-apps-menu-divider"
    menu.appendChild(divider2)

    menu.appendChild(
      createMenuButton(
        "fa-solid fa-rotate-left",
        labels.reset,
        resetGoogleApps,
        true,
      ),
    )

    document.body.appendChild(menu)
    const rect = menu.getBoundingClientRect()
    const padding = 10

    let clientX = event.clientX
    let clientY = event.clientY

    if (clientX === undefined || clientY === undefined) {
      const targetEl = event.currentTarget || event.target
      if (targetEl && targetEl.getBoundingClientRect) {
        const targetRect = targetEl.getBoundingClientRect()
        clientX = targetRect.left
        clientY = targetRect.bottom + 6
      } else {
        clientX = window.innerWidth / 2
        clientY = window.innerHeight / 2
      }
    }

    const posX = Math.max(
      padding,
      Math.min(clientX, window.innerWidth - rect.width - padding),
    )
    const posY = Math.max(
      padding,
      Math.min(clientY, window.innerHeight - rect.height - padding),
    )

    menu.style.left = `${posX}px`
    menu.style.top = `${posY}px`
  }

  function ensureScrollTopButton() {
    if (!dropdown || !scrollArea) return
    let scrollBtn = dropdown.querySelector(".g-apps-scroll-top")
    if (!scrollBtn) {
      scrollBtn = document.createElement("button")
      scrollBtn.type = "button"
      scrollBtn.className = "g-apps-scroll-top"
      scrollBtn.title = getMenuLabels(apps[0]).scrollTop
      scrollBtn.setAttribute("aria-label", getMenuLabels(apps[0]).scrollTop)
      scrollBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>'
      scrollBtn.addEventListener("click", (event) => {
        event.preventDefault()
        event.stopPropagation()
        scrollArea.scrollTo({ top: 0, behavior: "smooth" })
      })
      dropdown.appendChild(scrollBtn)
    }
    scrollBtn.classList.toggle("show", scrollArea.scrollTop > 80)
  }

  button?.addEventListener(
    "click",
    (event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      dropdown?.classList.toggle("show")
      hideGoogleAppsMenu()
      hideGoogleAppsIconPopover()
      ensureScrollTopButton()
    },
    true,
  )

  button?.addEventListener("contextmenu", (event) => {
    event.preventDefault()
    event.stopPropagation()
    showGoogleAppsMenu(event, null)
  })

  dropdown?.addEventListener("contextmenu", (event) => {
    event.preventDefault()
    event.stopPropagation()
    const itemEl = event.target.closest(".g-app-item, .m365-item")
    if (itemEl) {
      const appId = itemEl.dataset.appId
      if (state.provider === "edge") {
        const mApp = defaultM365Apps.find((a) => a.id === appId)
        if (mApp) {
          const itemUrl = state.m365Urls?.[mApp.id] || mApp.url
          const appLabel = geti18n()[mApp.i18nKey] || mApp.label
          showGoogleAppsMenu(event, {
            id: mApp.id,
            label: appLabel,
            url: itemUrl,
            defaultUrl: mApp.url,
            isM365: true,
            icon: mApp.icon,
            fallbackDomain: mApp.fallbackDomain,
          })
          return
        }
      } else {
        const gApp = appMap.get(appId) || apps.find((a) => a.id === appId)
        if (gApp) {
          showGoogleAppsMenu(event, gApp)
          return
        }
      }
    }
    showGoogleAppsMenu(event, null)
  })
  document.addEventListener("click", (event) => {
    if (!dropdown || !button) return
    if (event.target.closest(".g-apps-context-menu")) return
    if (event.target.closest(".g-apps-icon-popover")) return
    if (event.target.closest("#custom-dialog-overlay")) return
    if (!dropdown.contains(event.target) && !button.contains(event.target)) {
      dropdown.classList.remove("show")
      hideGoogleAppsMenu()
      hideGoogleAppsIconPopover()
    }
  })
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".g-apps-context-menu")) hideGoogleAppsMenu()
    if (!event.target.closest(".g-apps-icon-popover"))
      hideGoogleAppsIconPopover()
  })
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideGoogleAppsMenu()
      hideGoogleAppsIconPopover()
    }
  })
  dropdown?.addEventListener("scroll", hideGoogleAppsMenu, true)
  scrollArea?.addEventListener("scroll", ensureScrollTopButton)
  window.addEventListener("startpage:languageChanged", render)
  window.addEventListener("startpage:launcherModeChanged", () => {
    state = loadState()
    render()
  })

  render()
  ensureScrollTopButton()
}
