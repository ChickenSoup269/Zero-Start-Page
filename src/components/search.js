import { searchInput, clearBtn } from "../utils/dom.js"
import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { geti18n } from "../services/i18n.js"
import { showAlert } from "../utils/dialog.js"

const GEMINI_APP_URL = "https://gemini.google.com/app"
const MAX_GEMINI_DIRECT_URL_LENGTH = 1900

const SEARCH_ENGINES = {
  google: {
    name: "Google",
    domain: "google.com",
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_google",
  },
  google_incognito: {
    name: "Google Incognito",
    domain: "google.com",
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_google_incognito",
    incognito: true,
  },
  bing: {
    name: "Bing",
    domain: "bing.com",
    url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_bing",
  },
  yahoo: {
    name: "Yahoo",
    domain: "yahoo.com",
    url: (q) => `https://search.yahoo.com/search?p=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_yahoo",
  },
  duckduckgo: {
    name: "DuckDuckGo",
    domain: "duckduckgo.com",
    url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_duckduckgo",
  },
  swisscows: {
    name: "Swisscows",
    domain: "swisscows.com",
    iconUrl: "https://swisscows.com/favicon.ico",
    url: (q) => `https://swisscows.com/web?query=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_swisscows",
  },
  searx: {
    name: "Searx",
    domain: "searx.space",
    iconUrl: "https://searx.space/favicon.ico",
    url: (q) => `https://searx.space/search?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_searx",
  },
  ecosia: {
    name: "Ecosia",
    domain: "ecosia.org",
    url: (q) => `https://www.ecosia.org/search?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_ecosia",
  },
  brave: {
    name: "Brave",
    domain: "search.brave.com",
    url: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_brave",
  },
  startpage: {
    name: "Startpage",
    domain: "startpage.com",
    url: (q) =>
      `https://www.startpage.com/sp/search?query=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_startpage",
  },
  perplexity: {
    name: "Perplexity",
    domain: "perplexity.ai",
    url: (q) => `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_perplexity",
  },
  gemini: {
    name: "Google Gemini",
    shortName: "Gemini",
    domain: "gemini.google.com",
    geminiPrompt: (q) => q,
    url: (q) => buildGeminiUrl(q),
    placeholderKey: "search_placeholder_gemini",
  },
  "gemini-image": {
    name: "Gemini Image",
    shortName: "Gemini Img",
    domain: "gemini.google.com",
    geminiPrompt: (q) => `Create an image: ${q}`,
    url: (q) => buildGeminiUrl(q),
    placeholderKey: "search_placeholder_gemini_image",
  },
  youtube: {
    name: "YouTube",
    domain: "youtube.com",
    url: (q) =>
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_youtube",
  },
  github: {
    name: "GitHub",
    domain: "github.com",
    url: (q) => `https://github.com/search?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_github",
  },
  "google-image": {
    name: "Google Images",
    shortName: "Images",
    domain: "images.google.com",
    url: (q) =>
      `https://www.google.com/search?q=${encodeURIComponent(q)}&tbm=isch`,
    placeholderKey: "search_placeholder_images",
  },
  "google-lens": {
    name: "Google Lens",
    domain: "lens.google.com",
    url: (q) =>
      `https://lens.google.com/search?ep=ccm&s=&st=${Date.now()}&re=df&url=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_lens",
  },
  kagi: {
    name: "Kagi",
    domain: "kagi.com",
    url: (q) => `https://kagi.com/search?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_kagi",
  },
  qwant: {
    name: "Qwant",
    domain: "qwant.com",
    url: (q) => `https://www.qwant.com/?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_qwant",
  },
  mojeek: {
    name: "Mojeek",
    domain: "mojeek.com",
    iconUrl: "https://www.mojeek.com/favicon.ico",
    url: (q) => `https://www.mojeek.com/search?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_mojeek",
  },
  yep: {
    name: "Yep",
    domain: "yep.com",
    iconUrl: "https://yep.com/favicon.ico",
    url: (q) => `https://yep.com/web?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_yep",
  },
  yandex: {
    name: "Yandex",
    domain: "yandex.com",
    url: (q) => `https://yandex.com/search/?text=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_yandex",
  },
  baidu: {
    name: "Baidu",
    domain: "baidu.com",
    url: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_baidu",
  },
  wikipedia: {
    name: "Wikipedia",
    domain: "wikipedia.org",
    url: (q) =>
      `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_wikipedia",
  },
  reddit: {
    name: "Reddit",
    domain: "reddit.com",
    url: (q) => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_reddit",
  },
  stackoverflow: {
    name: "Stack Overflow",
    shortName: "Stack",
    domain: "stackoverflow.com",
    url: (q) =>
      `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_stackoverflow",
  },
  mdn: {
    name: "MDN",
    domain: "developer.mozilla.org",
    url: (q) =>
      `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_mdn",
  },
  npm: {
    name: "npm",
    domain: "npmjs.com",
    url: (q) => `https://www.npmjs.com/search?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_npm",
  },
  scholar: {
    name: "Google Scholar",
    shortName: "Scholar",
    domain: "scholar.google.com",
    url: (q) =>
      `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`,
    placeholderKey: "search_placeholder_scholar",
  },
}

const searchContainer = document.querySelector(".search-container")
const searchForm = document.querySelector(".search-container form")
const suggestionsContainer = document.createElement("div")
suggestionsContainer.id = "suggestions-container"
searchContainer.appendChild(suggestionsContainer)

// Search Engine Selector Elements
const searchEngineSelector = document.getElementById("search-engine-selector")
const selectedEngine = document.getElementById("selected-engine")
const engineDropdown = document.getElementById("engine-dropdown")
let engineOptions = []

// Image Search Elements
const cameraBtn = document.getElementById("search-camera-btn")
const lensBtn = document.getElementById("search-lens-btn")
const aiBtn = document.getElementById("search-ai-btn")
const imageUploadInput = document.getElementById("image-search-upload")
const imageLensUpload = document.getElementById("image-lens-upload")

// Search Submit Button & Divider
const searchSubmitBtn = document.getElementById("search-submit-btn")
const searchDivider = document.getElementById("search-divider")

// Preview Elements
const previewContainer = document.getElementById("image-preview-container")
const previewThumb = document.getElementById("image-preview-thumb")
const removePreviewBtn = document.getElementById("remove-preview-btn")

let suggestionTimeout
let currentEngine = "google" // Will be overridden from settings in initSearch()
let pendingImageFile = null // Store the image file waiting to be uploaded
let activeSuggestionIndex = -1
let originalQuery = ""
let currentSuggestions = []

function getEngineIconUrl(engine) {
  if (engine.iconUrl) return engine.iconUrl
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(engine.domain)}&sz=64`
}

function createEngineIcon(engine) {
  return `<img class="search-engine-icon" src="${getEngineIconUrl(engine)}" alt="" loading="eager" decoding="async">`
}

function getTranslation(key, fallback) {
  const i18n = geti18n()
  return (key && i18n[key]) || fallback
}

function getEngineName(value, engine = SEARCH_ENGINES[value]) {
  return getTranslation(
    `search_engine_${value.replace(/-/g, "_")}`,
    engine?.name || value,
  )
}

function getEngineShortName(value, engine = SEARCH_ENGINES[value]) {
  return getTranslation(
    `search_engine_${value.replace(/-/g, "_")}_short`,
    engine?.shortName || getEngineName(value, engine),
  )
}

function getEngineTooltip(value, engine = SEARCH_ENGINES[value]) {
  return getTranslation(
    `search_engine_${value.replace(/-/g, "_")}_tooltip`,
    getEngineName(value, engine),
  )
}

function renderSearchEngineOptions() {
  if (!engineDropdown) return
  engineDropdown.innerHTML = Object.entries(SEARCH_ENGINES)
    .map(([value, engine]) => {
      const label = getEngineShortName(value, engine)
      const tooltip = getEngineTooltip(value, engine)
      return `<button type="button" class="engine-option" role="option" data-value="${value}" title="${escapeHtml(tooltip)}" aria-label="${escapeHtml(tooltip)}" aria-selected="false" tabindex="-1">
        ${createEngineIcon(engine)}
        <span>${escapeHtml(label)}</span>
      </button>`
    })
    .join("")
  engineOptions = [...engineDropdown.querySelectorAll(".engine-option")]
}

function renderSettingsSearchEngineOptions() {
  const settingsSelect = document.getElementById("search-engine-select")
  if (!settingsSelect) return
  const currentValue = settingsSelect.value || getSettings().searchEngine || "google"
  settingsSelect.innerHTML = Object.entries(SEARCH_ENGINES)
    .map(
      ([value, engine]) =>
        `<option value="${value}">${escapeHtml(getEngineName(value, engine))}</option>`,
    )
    .join("")
  settingsSelect.value = SEARCH_ENGINES[currentValue] ? currentValue : "google"
}

function openEngineDropdown({ focusValue = currentEngine } = {}) {
  engineDropdown.classList.add("show")
  selectedEngine.setAttribute("aria-expanded", "true")
  const target =
    engineOptions.find((option) => option.dataset.value === focusValue) ||
    engineOptions[0]
  target?.focus()
}

function closeEngineDropdown({ focusSelector = false } = {}) {
  engineDropdown.classList.remove("show")
  selectedEngine.setAttribute("aria-expanded", "false")
  if (focusSelector) selectedEngine.focus()
}

function toggleEngineDropdown() {
  if (engineDropdown.classList.contains("show")) {
    closeEngineDropdown()
  } else {
    openEngineDropdown()
  }
}

function moveEngineFocus(delta) {
  if (!engineOptions.length) return
  const focusedIndex = engineOptions.indexOf(document.activeElement)
  const currentIndex = engineOptions.findIndex(
    (option) => option.dataset.value === currentEngine,
  )
  const startIndex = focusedIndex >= 0 ? focusedIndex : Math.max(currentIndex, 0)
  const nextIndex =
    (startIndex + delta + engineOptions.length) % engineOptions.length
  engineOptions[nextIndex].focus()
}

function bindEngineOptionEvents() {
  engineOptions.forEach((option) => {
    option.addEventListener("click", (e) => {
      e.stopPropagation()
      closeEngineDropdown()
      setSearchEngine(option.dataset.value, { persist: true, focus: true })
    })

    option.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault()
        moveEngineFocus(1)
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault()
        moveEngineFocus(-1)
      } else if (e.key === "Home") {
        e.preventDefault()
        engineOptions[0]?.focus()
      } else if (e.key === "End") {
        e.preventDefault()
        engineOptions[engineOptions.length - 1]?.focus()
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        closeEngineDropdown()
        setSearchEngine(option.dataset.value, { persist: true, focus: true })
      } else if (e.key === "Escape" || e.key === "Tab") {
        closeEngineDropdown({ focusSelector: e.key === "Escape" })
      }
    })
  })
}

function setSearchEngine(value, { persist = false, focus = false } = {}) {
  if (!SEARCH_ENGINES[value]) return
  currentEngine = value

  engineOptions.forEach((option) => {
    const isActive = option.dataset.value === value
    option.classList.toggle("active", isActive)
    option.setAttribute("aria-selected", String(isActive))
  })

  const engine = SEARCH_ENGINES[value] || SEARCH_ENGINES.google
  const tooltip = getEngineTooltip(value, engine)
  selectedEngine.innerHTML = createEngineIcon(engine)
  selectedEngine.title = tooltip
  selectedEngine.setAttribute("aria-label", tooltip)
  const settingsSelect = document.getElementById("search-engine-select")
  if (settingsSelect) settingsSelect.value = value

  if (persist) {
    updateSetting("searchEngine", value)
    saveSettings()
  }

  if (focus) searchInput.focus()
  updateSearchUI()
}

async function fetchSuggestions(query) {
  if (!query) {
    suggestionsContainer.style.display = "none"
    return
  }
  if (!query) {
    suggestionsContainer.style.display = "none"
    return
  }

  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "fetchSuggestions", query },
        (resp) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(resp)
          }
        },
      )
    })

    if (response.error) {
      throw new Error(response.error)
    }

    displaySuggestions(response.data[1])
  } catch (error) {
    console.error("Error fetching suggestions:", error)
    suggestionsContainer.style.display = "none"
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function highlightQuery(suggestion, query) {
  if (!query) return `<strong>${escapeHtml(suggestion)}</strong>`
  const qTrimmed = query.trim()
  if (suggestion.toLowerCase().startsWith(qTrimmed.toLowerCase())) {
    const typed = suggestion.slice(0, qTrimmed.length)
    const rest = suggestion.slice(qTrimmed.length)
    return `${escapeHtml(typed)}<strong>${escapeHtml(rest)}</strong>`
  }
  return `<strong>${escapeHtml(suggestion)}</strong>`
}

function displaySuggestions(suggestions) {
  if (!suggestions || suggestions.length === 0) {
    suggestionsContainer.style.display = "none"
    currentSuggestions = []
    return
  }

  currentSuggestions = suggestions.slice(0, 8)
  activeSuggestionIndex = -1

  suggestionsContainer.innerHTML = currentSuggestions
    .map(
      (suggestion) =>
        `<div class="suggestion-item" data-query="${escapeHtml(suggestion)}">
          <i class="fa-solid fa-magnifying-glass suggestion-search-icon"></i>
          <span class="suggestion-text">${highlightQuery(suggestion, searchInput.value)}</span>
          <button class="suggestion-fill-btn" title="Fill search box" data-query="${escapeHtml(suggestion)}">
            <i class="fa-solid fa-arrow-up-left"></i>
          </button>
        </div>`,
    )
    .join("")

  suggestionsContainer.style.display = "block"
}

function updateActiveSuggestion(items) {
  items.forEach((item, idx) => {
    if (idx === activeSuggestionIndex) {
      item.classList.add("active")
      searchInput.value = item.dataset.query
    } else {
      item.classList.remove("active")
    }
  })
}

function handleSuggestionClick(e) {
  // Fill button: put text into input without submitting
  const fillBtn = e.target.closest(".suggestion-fill-btn")
  if (fillBtn) {
    e.stopPropagation()
    const query = fillBtn.dataset.query
    searchInput.value = query
    searchInput.focus()
    clearTimeout(suggestionTimeout)
    fetchSuggestions(query)
    return
  }

  // Row click: submit
  const item = e.target.closest(".suggestion-item")
  if (item) {
    searchInput.value = item.dataset.query
    suggestionsContainer.style.display = "none"
    currentSuggestions = []
    activeSuggestionIndex = -1
    submitSearch()
  }
}

function buildGeminiUrl(prompt) {
  const url = new URL(GEMINI_APP_URL)
  url.searchParams.set("q", prompt)
  return url.toString()
}

async function copyGeminiPromptFallback(prompt) {
  const i18n = geti18n()
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard API is not available")
    }
    await navigator.clipboard.writeText(prompt)
    showAlert(
      i18n.alert_gemini_prompt_fallback ||
        "Could not pass the prompt directly. Prompt copied; paste it into Gemini.",
    )
  } catch (clipboardError) {
    console.error("Gemini prompt fallback failed:", clipboardError)
  }
  window.location.href = GEMINI_APP_URL
}

async function openGeminiWithPrompt(engine, query) {
  const geminiPrompt = engine.geminiPrompt ? engine.geminiPrompt(query) : query
  const directUrl = engine.url(geminiPrompt)

  try {
    if (directUrl.length > MAX_GEMINI_DIRECT_URL_LENGTH) {
      await copyGeminiPromptFallback(geminiPrompt)
      return
    }
    window.location.href = directUrl
  } catch (error) {
    await copyGeminiPromptFallback(geminiPrompt)
  }
}

function checkAndGetUrl(query) {
  const trimmed = query.trim()
  if (!trimmed) return null

  // 1. Check if it matches a protocol
  if (/^(https?|chrome|chrome-extension|edge|about|file|ftp):\/\//i.test(trimmed) || /^about:/i.test(trimmed)) {
    return trimmed
  }

  // 2. Check if it is a localhost address
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return 'http://' + trimmed
  }

  // 3. Check if it is an IP address
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return 'http://' + trimmed
  }

  // 4. Check if it matches a standard domain name pattern (without spaces)
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(trimmed) && !/\s/.test(trimmed)) {
    return 'https://' + trimmed
  }

  return null
}

function submitSearch() {
  const query = searchInput.value.trim()

  // Check if the query is a direct image URL
  const isImageUrl =
    /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg|ico)(\?.+)?$/i.test(
      query,
    ) ||
    /^https?:\/\/.+\/images\/.+$/i.test(query) ||
    /^https?:\/\/.+\/img\/.+$/i.test(query) ||
    /^https?:\/\/.+unsplash\.com\/photos\/.+$/i.test(query)

  if (pendingImageFile) {
    // Handle uploaded/pasted image files - upload directly to Google Images
    uploadImageToGoogle(pendingImageFile)
    return
  } else if (isImageUrl) {
    // Handle image URLs - search by URL via Google Lens
    // console.log("Image URL detected. Redirecting to Google Lens search by URL.")
    window.open(
      `https://lens.google.com/search?ep=ccm&s=&st=${Date.now()}&re=df&vpw=1920&vph=969&pcl=f2f2f2&url=${encodeURIComponent(query)}`,
      "_blank",
    )
    searchInput.value = ""
    return
  }

  // Default to text search
  if (!query) return

  // Custom CLI commands
  if (query.toLowerCase() === "/test performance" || query.toLowerCase() === "/perf") {
    if (window.perfHUD) {
      window.perfHUD.toggle()
    }
    searchInput.value = ""
    return
  }

  // Check if the query is a URL to navigate directly
  const targetUrl = checkAndGetUrl(query)
  if (targetUrl) {
    if (typeof chrome !== "undefined" && chrome.tabs?.update) {
      chrome.tabs.update({ url: targetUrl })
    } else {
      window.location.href = targetUrl
    }
    searchInput.value = ""
    return
  }

  const engine = SEARCH_ENGINES[currentEngine] || SEARCH_ENGINES.google
  if (currentEngine === "gemini" || currentEngine === "gemini-image") {
    openGeminiWithPrompt(engine, query)
    return
  }

  if (engine.incognito) {
    if (typeof chrome !== "undefined" && chrome.windows?.create) {
      chrome.windows.create({ url: engine.url(query), incognito: true })
    } else {
      window.open(engine.url(query), "_blank")
    }
    searchInput.value = ""
    return
  }

  window.location.href = engine.url(query)
}

async function uploadImageToGoogle(file) {
  // modern Google Lens upload is more effective
  const i18n = geti18n()
  showAlert(i18n.alert_uploading_lens || "Uploading to Google Lens...")
  
  try {
    const formData = new FormData()
    formData.append("encoded_image", file)
    
    // We use a hidden form for the actual submission because cross-origin 
    // fetch to lens.google.com will be blocked by CORS.
    const form = document.createElement("form")
    form.method = "POST"
    form.action = "https://lens.google.com/v3/upload"
    form.enctype = "multipart/form-data"
    form.target = "_blank"
    
    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.name = "encoded_image"
    
    // To send the file we already have, we need a DataTransfer object
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    fileInput.files = dataTransfer.files
    
    form.appendChild(fileInput)
    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
    
    clearImagePreview()
    searchInput.disabled = false
    searchInput.placeholder = i18n[SEARCH_ENGINES[currentEngine].placeholderKey] || SEARCH_ENGINES[currentEngine].name
  } catch (err) {
    console.error("Lens upload error:", err)
    window.open("https://lens.google.com/", "_blank")
  }
}

function handleImageSelection(file) {
  if (!file || !file.type.startsWith("image/")) return
  
  pendingImageFile = file

  // Show Preview
  const reader = new FileReader()
  reader.onload = (e) => {
    previewThumb.src = e.target.result
    previewContainer.style.display = "flex"
    
    // Update UI for image mode
    const i18n = geti18n()
    searchInput.placeholder = i18n.search_press_enter_image || "Press Enter to Search Image..."
    searchInput.value = "" 
    searchInput.focus()
    
    // Ensure search button/divider are visible
    searchDivider.style.display = "block"
    clearBtn.style.display = "block"
  }
  reader.readAsDataURL(file)
}

function clearImagePreview() {
  pendingImageFile = null
  previewContainer.style.display = "none"
  previewThumb.src = ""
  imageUploadInput.value = "" // Reset file input
  updateSearchUI()
}

function updateSearchUI() {
  // If pending image exists, don't override placeholder
  if (pendingImageFile) {
    return
  }

  const engine = SEARCH_ENGINES[currentEngine] || SEARCH_ENGINES.google
  cameraBtn.style.display = currentEngine === "google-image" ? "block" : "none"
  if (lensBtn) {
    lensBtn.style.display = currentEngine === "google-lens" ? "block" : "none"
  }
  if (aiBtn) {
    aiBtn.style.display =
      currentEngine === "google" || currentEngine === "google-image"
        ? "block"
        : "none"
  }
  const i18n = geti18n()
  searchInput.placeholder = i18n[engine.placeholderKey] || engine.name
}

function initSearch() {
  renderSearchEngineOptions()
  renderSettingsSearchEngineOptions()
  engineDropdown.setAttribute(
    "aria-label",
    geti18n().search_engine_dropdown_label || "Search engines",
  )

  // Restore saved engine
  const savedEngine = getSettings().searchEngine
  if (savedEngine && SEARCH_ENGINES[savedEngine]) {
    setSearchEngine(savedEngine)
  } else {
    setSearchEngine(currentEngine)
  }

  // Dropdown Toggle
  selectedEngine.addEventListener("click", (e) => {
    e.stopPropagation()
    toggleEngineDropdown()
  })

  selectedEngine.addEventListener("keydown", (e) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault()
      openEngineDropdown()
      if (e.key === "ArrowUp") moveEngineFocus(-1)
    } else if (e.key === "Escape") {
      closeEngineDropdown()
    }
  })

  bindEngineOptionEvents()

  window.addEventListener("settingsUpdated", (e) => {
    if (e.detail?.key === "searchEngine") {
      setSearchEngine(e.detail.value)
    }
  })

  window.addEventListener("startpage:languageChanged", () => {
    const value = currentEngine
    renderSearchEngineOptions()
    bindEngineOptionEvents()
    renderSettingsSearchEngineOptions()
    engineDropdown.setAttribute(
      "aria-label",
      geti18n().search_engine_dropdown_label || "Search engines",
    )
    setSearchEngine(value)
  })

  // Camera Button Click
  cameraBtn.addEventListener("click", () => {
    imageUploadInput.click()
  })

  // Lens Button Click
  if (lensBtn && imageLensUpload) {
    lensBtn.addEventListener("click", () => {
      imageLensUpload.click()
    })

    imageLensUpload.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        // Upload image bytes to Google Lens via multipart form POST
        const form = document.createElement("form")
        form.method = "POST"
        form.action = "https://lens.google.com/v3/upload"
        form.enctype = "multipart/form-data"
        form.target = "_blank"
        form.style.display = "none"

        const fileInput = document.createElement("input")
        fileInput.type = "file"
        fileInput.name = "encoded_image"

        document.body.appendChild(form)

        // Because we can't reuse a file via form directly after reading,
        // open Lens upload page instead (most reliable cross-browser approach)
        window.open("https://lens.google.com/", "_blank")
        document.body.removeChild(form)
        imageLensUpload.value = ""
      }
      reader.readAsDataURL(file)
    })
  }

  // File Input Change
  imageUploadInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelection(e.target.files[0])
    }
  })

  // Remove Preview
  removePreviewBtn.addEventListener("click", (e) => {
    e.stopPropagation()
    clearImagePreview()
  })

  // Paste Event
  document.addEventListener("paste", (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items
    for (let index in items) {
      const item = items[index]
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const blob = item.getAsFile()
        
        // If not in image engine, switch to it automatically to show correct context
        if (currentEngine !== "google-image" && currentEngine !== "google-lens") {
          const imageOption = engineOptions.find(o => o.dataset.value === "google-image")
          if (imageOption) imageOption.click()
        }
        
        handleImageSelection(blob)
        e.preventDefault()
        return
      }
    }
  })

  // Close Dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!searchEngineSelector.contains(e.target)) {
      closeEngineDropdown()
    }
    if (!searchContainer.contains(e.target)) {
      suggestionsContainer.style.display = "none"
    }
  })

  searchInput.addEventListener("input", () => {
    activeSuggestionIndex = -1
    const hasValue = !!searchInput.value
    clearBtn.style.display = hasValue ? "block" : "none"
    searchDivider.style.display = hasValue ? "block" : "none"
    clearTimeout(suggestionTimeout)
    suggestionTimeout = setTimeout(() => {
      fetchSuggestions(searchInput.value)
    }, 200)
  })

  searchInput.addEventListener("keydown", (e) => {
    // If Enter is pressed and we have a pending image, submit immediately
    if (e.key === "Enter" && pendingImageFile) {
      e.preventDefault()
      submitSearch()
      return
    }

    if (
      suggestionsContainer.style.display === "none" ||
      currentSuggestions.length === 0
    )
      return
    const items = suggestionsContainer.querySelectorAll(".suggestion-item")

    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (activeSuggestionIndex === -1) originalQuery = searchInput.value
      activeSuggestionIndex = Math.min(
        activeSuggestionIndex + 1,
        items.length - 1,
      )
      updateActiveSuggestion(items)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, -1)
      if (activeSuggestionIndex === -1) {
        searchInput.value = originalQuery
        items.forEach((i) => i.classList.remove("active"))
      } else {
        updateActiveSuggestion(items)
      }
    } else if (e.key === "Escape") {
      if (activeSuggestionIndex !== -1) searchInput.value = originalQuery
      suggestionsContainer.style.display = "none"
      currentSuggestions = []
      activeSuggestionIndex = -1
    }
  })

  suggestionsContainer.addEventListener("click", handleSuggestionClick)

  searchSubmitBtn.addEventListener("click", () => {
    submitSearch()
  })

  clearBtn.addEventListener("click", () => {
    searchInput.value = ""
    clearBtn.style.display = "none"
    searchDivider.style.display = "none"
    suggestionsContainer.style.display = "none"
    currentSuggestions = []
    activeSuggestionIndex = -1
    searchInput.focus()
  })

  // Intercept Form Submission
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault()
    submitSearch()
  })

  // Initial UI check
  updateSearchUI()
}

export { initSearch }
