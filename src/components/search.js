import { searchInput, clearBtn } from "../utils/dom.js"
import { getSettings, updateSetting, saveSettings } from "../services/state.js"

const SEARCH_ENGINES = {
  google: {
    name: "Google",
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    placeholder: "Search Google...",
    icon: "fa-brands fa-google",
  },
  bing: {
    name: "Bing",
    url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    placeholder: "Search Bing...",
    icon: "fa-brands fa-microsoft",
  },
  yahoo: {
    name: "Yahoo",
    url: (q) => `https://search.yahoo.com/search?p=${encodeURIComponent(q)}`,
    placeholder: "Search Yahoo...",
    icon: "fa-brands fa-yahoo",
  },
  duckduckgo: {
    name: "DuckDuckGo",
    url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    placeholder: "Search DuckDuckGo...",
    icon: "fa-solid fa-shield-halved",
  },
  ecosia: {
    name: "Ecosia",
    url: (q) => `https://www.ecosia.org/search?q=${encodeURIComponent(q)}`,
    placeholder: "Search Ecosia...",
    icon: "fa-solid fa-leaf",
  },
  "google-image": {
    name: "Images",
    url: (q) =>
      `https://www.google.com/search?q=${encodeURIComponent(q)}&tbm=isch`,
    placeholder: "Search Google Images (or Paste Image)...",
    icon: "fa-regular fa-image",
  },
  "google-lens": {
    name: "Google Lens",
    url: (q) => `https://lens.google.com/search?ep=ccm&s=&st=${Date.now()}&re=df&url=${encodeURIComponent(q)}`,
    placeholder: "Search any image with Lens...",
    icon: "fa-solid fa-camera-viewfinder",
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
const engineOptions = document.querySelectorAll(".engine-option")

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

async function fetchSuggestions(query) {
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
    console.log("Image URL detected. Redirecting to Google Lens search by URL.")
    window.open(
      `https://lens.google.com/search?ep=ccm&s=&st=${Date.now()}&re=df&vpw=1920&vph=969&pcl=f2f2f2&url=${encodeURIComponent(query)}`,
      "_blank",
    )
    searchInput.value = ""
    return
  }

  // Default to text search
  if (!query) return

  const engine = SEARCH_ENGINES[currentEngine] || SEARCH_ENGINES.google
  window.location.href = engine.url(query)
}

async function uploadImageToGoogle(file) {
  // Mở trang Google search by image - user tự upload ảnh trên đó
  window.open("https://images.google.com/", "_blank")
  clearImagePreview()
  searchInput.disabled = false
  searchInput.placeholder = "Search Google Images..."
}

function handleImageSelection(file) {
  pendingImageFile = file

  // Show Preview
  const reader = new FileReader()
  reader.onload = (e) => {
    previewThumb.src = e.target.result
    previewContainer.style.display = "flex"
    // Hide camera btn temporarily or keep it? Keep it.
    // Update placeholder to indicate readiness
    searchInput.placeholder = "Press Enter to Search Image..."
    searchInput.value = "" // Clear text if any? Or keep it? Clearing is safer to avoid ambiguity
    searchInput.focus()
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
    aiBtn.style.display = (currentEngine === "google" || currentEngine === "google-image") ? "block" : "none"
  }
  searchInput.placeholder = engine.placeholder
}

function initSearch() {
  // Restore saved engine
  const savedEngine = getSettings().searchEngine
  if (savedEngine && SEARCH_ENGINES[savedEngine]) {
    currentEngine = savedEngine
    const savedOption = [...engineOptions].find(
      (o) => o.dataset.value === savedEngine,
    )
    if (savedOption) {
      engineOptions.forEach((o) => o.classList.remove("active"))
      savedOption.classList.add("active")
      const engine = SEARCH_ENGINES[savedEngine]
      selectedEngine.innerHTML = `<i class="${engine.icon}"></i>`
    }
  }

  // Dropdown Toggle
  searchEngineSelector.addEventListener("click", (e) => {
    e.stopPropagation()
    engineDropdown.classList.toggle("show")
  })

  // Option Selection
  engineOptions.forEach((option) => {
    option.addEventListener("click", (e) => {
      e.stopPropagation()
      const value = option.dataset.value
      currentEngine = value

      // Persist selection
      updateSetting("searchEngine", value)
      saveSettings()

      // Update Active State
      engineOptions.forEach((opt) => opt.classList.remove("active"))
      option.classList.add("active")

      // Update Icon
      const engine = SEARCH_ENGINES[value] || SEARCH_ENGINES.google
      selectedEngine.innerHTML = `<i class="${engine.icon}"></i>`

      // Close Dropdown
      engineDropdown.classList.remove("show")

      // Focus Input
      searchInput.focus()

      updateSearchUI()
    })
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
    if (currentEngine !== "google-image") {
      return
    }

    const items = (e.clipboardData || e.originalEvent.clipboardData).items
    for (let index in items) {
      const item = items[index]
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const blob = item.getAsFile()
        handleImageSelection(blob)
        e.preventDefault()
        return
      }
    }
  })

  // Close Dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!searchEngineSelector.contains(e.target)) {
      engineDropdown.classList.remove("show")
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
