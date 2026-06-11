import { geti18n } from "../services/i18n.js"
import { showToast } from "../utils/toast.js"

const STORAGE_KEY = "startpageGoogleAppsV2"
const ICON_BASE =
  "https://raw.githubusercontent.com/ChickenSoup269/imagesForRepo/9b36511404829f1042f2628b944b30e30f4484ac/zero_extension/icon%20for%20google%20app%20v2"
const ICON_BASE_LATEST =
  "https://raw.githubusercontent.com/ChickenSoup269/imagesForRepo/main/zero_extension/icon%20for%20google%20app%20v2"
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

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {}
  } catch (error) {
    console.warn("Could not load Google Apps settings", error)
    return {}
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn("Could not save Google Apps settings", error)
  }
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
  if (item.id === "account") return ACCOUNT_DEFAULT_ICON
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
  img.loading = "eager"
  img.addEventListener(
    "error",
    () => {
      img.src = getWebIconUrl(item)
    },
    { once: true },
  )

  const label = document.createElement("span")
  label.textContent = getLabel(item)

  icon.appendChild(img)
  link.append(icon, label)

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

  const render = () => {
    root.innerHTML = ""
    const previousLargeFavorites = state.options?.largeFavorites === true
    state = {
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
    root.classList.toggle("g-apps-drag-enabled", state.options.dragEnabled)
    root.classList.toggle("g-apps-hide-titles", !state.options.showTitles)
    root.classList.toggle("g-apps-hide-app-text", !state.options.showAppText)
    root.classList.toggle("g-apps-search-hidden", !state.options.showMiniSearch)
    dropdown?.classList.toggle("g-apps-large-popup", state.options.largePopup)

    if (state.options.showMiniSearch) {
      const searchWrap = document.createElement("div")
      searchWrap.className = "g-apps-mini-search"
      searchWrap.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>'
      const searchInput = document.createElement("input")
      searchInput.type = "search"
      searchInput.value = searchQuery
      searchInput.placeholder =
        geti18n().g_apps_search_placeholder || "Search apps..."
      searchInput.autocomplete = "off"
      searchInput.addEventListener("input", () => {
        searchQuery = searchInput.value.trim().toLowerCase()
        render()
        document.querySelector(".g-apps-mini-search input")?.focus()
      })
      searchWrap.appendChild(searchInput)
      root.appendChild(searchWrap)
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
    root.appendChild(
      createSection(
        geti18n().g_apps_favorites || "Your favorites",
        favoritesGrid,
        "is-favorites",
      ),
    )

    sections.forEach((section) => {
      const divider = document.createElement("div")
      divider.className = "g-apps-divider"
      root.appendChild(divider)

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
      root.appendChild(createSection(getSectionTitle(section), grid))
    })

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
    const items = [...grid.querySelectorAll(".g-app-item:not(.dragging)")]
    const target = items.find((item) => {
      const rect = item.getBoundingClientRect()
      return y < rect.top + rect.height / 2 && x < rect.right
    })
    return target?.dataset.appId || null
  }

  function bindDropTargets() {
    root.querySelectorAll(".g-apps-grid").forEach((grid) => {
      grid.addEventListener("dragover", (event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        grid.classList.add("drag-over")
      })
      grid.addEventListener("dragleave", (event) => {
        if (!grid.contains(event.relatedTarget))
          grid.classList.remove("drag-over")
      })
      grid.addEventListener("drop", (event) => {
        event.preventDefault()
        grid.classList.remove("drag-over")
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
  })

  root.addEventListener("pointerup", (event) => {
    if (!state.options?.dragEnabled) return
    if (!pointerDrag) return
    const drag = pointerDrag
    pointerDrag = null
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
    showToast(i18n.g_apps_icon_changed || "Google app icon updated", {
      type: "success",
      undoFn: () => {
        state.iconUrls = previousIconUrls
        render()
      },
    })
  }

  function uploadIcon(item) {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.addEventListener("change", () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      const previousIconUrls = { ...(state.iconUrls || {}) }
      reader.addEventListener("load", () => {
        state.iconUrls = { ...(state.iconUrls || {}) }
        state.iconUrls[item.id] = String(reader.result || "")
        render()
        showIconChangedToast(previousIconUrls)
      })
      reader.readAsDataURL(file)
    })
    input.click()
  }

  function applyIconValue(item, value, previousIconUrls) {
    const normalized = normalizeIconUrl(value)
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
    const previousIconUrls = { ...(state.iconUrls || {}) }
    const defaultIcon = getDeclaredIconUrl(item)
    const webIcon = getWebIconUrl(item)
    let selectedValue = state.iconUrls?.[item.id] || defaultIcon

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
    previewImg.alt = getLabel(item)
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
      selectedValue && selectedValue !== defaultIcon && selectedValue !== webIcon
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
        choice.classList.toggle("active", choice.dataset.value === selectedValue)
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
    if (!state.iconUrls?.[item.id]) return
    const previousIconUrls = { ...(state.iconUrls || {}) }
    state.iconUrls = { ...(state.iconUrls || {}) }
    delete state.iconUrls[item.id]
    render()
    showIconChangedToast(previousIconUrls)
  }

  function resetGoogleApps() {
    localStorage.removeItem(STORAGE_KEY)
    state = {}
    render()
    hideGoogleAppsMenu()
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
    return {
      open: i18n.g_apps_menu_open || "Open",
      editIcon: i18n.g_apps_menu_edit_icon || "Edit icon URL",
      uploadIcon: i18n.g_apps_menu_upload_icon || "Upload icon",
      resetIcon: i18n.g_apps_menu_reset_icon || "Reset this icon",
      dragEnabled: i18n.g_apps_menu_drag || "Enable drag & drop",
      showTitles: i18n.g_apps_menu_titles || "Show titles",
      showAppText: i18n.g_apps_menu_app_text || "Show app names",
      largePopup: i18n.g_apps_menu_large_popup || "Large popup",
      showMiniSearch: i18n.g_apps_menu_mini_search || "Mini search",
      reset: i18n.g_apps_reset || "Reset Google Apps",
      currentApp: getLabel(item),
      scrollTop: i18n.g_apps_scroll_top || "Scroll to top",
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
    const labels = getMenuLabels(item)
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
    menu.innerHTML = `<div class="g-apps-menu-title">${labels.currentApp}</div>`
    menu.appendChild(
      createMenuButton("fa-solid fa-up-right-from-square", labels.open, () => {
        window.open(item.url, "_blank", "noopener")
        hideGoogleAppsMenu()
      }),
    )
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
    const padding = 8
    menu.style.left = `${Math.min(event.clientX, window.innerWidth - rect.width - padding)}px`
    menu.style.top = `${Math.min(event.clientY, window.innerHeight - rect.height - padding)}px`
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

  render()
  ensureScrollTopButton()
}
