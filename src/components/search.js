import { searchInput, clearBtn } from "../utils/dom.js"

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
const imageUploadInput = document.getElementById("image-search-upload")

// Preview Elements
const previewContainer = document.getElementById("image-preview-container")
const previewThumb = document.getElementById("image-preview-thumb")
const removePreviewBtn = document.getElementById("remove-preview-btn")

let suggestionTimeout
let currentEngine = "google" // Default
let pendingImageFile = null // Store the image file waiting to be uploaded

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

function getFaviconUrl(suggestion) {
  try {
    const url = new URL(
      suggestion.startsWith("http")
        ? suggestion
        : `https://${suggestion.split(" ")[0]}`,
    )
    return `https://www.google.com/s2/favicons?domain=${url.hostname}`
  } catch (e) {
    return "https://www.google.com/s2/favicons?domain=google.com"
  }
}

function displaySuggestions(suggestions) {
  if (!suggestions || suggestions.length === 0) {
    suggestionsContainer.style.display = "none"
    return
  }

  const filteredSuggestions = suggestions.slice(0, 6)

  suggestionsContainer.innerHTML = filteredSuggestions
    .map(
      (suggestion) =>
        `<div class="suggestion-item">
                    <img src="${getFaviconUrl(suggestion)}" class="suggestion-icon" />
                    <span>${suggestion}</span>
                </div>`,
    )
    .join("")

  if (filteredSuggestions.length > 0) {
    suggestionsContainer.style.display = "block"
  } else {
    suggestionsContainer.style.display = "none"
  }
}

function handleSuggestionClick(e) {
  let target = e.target
  while (target && !target.classList.contains("suggestion-item")) {
    target = target.parentElement
  }

  if (target) {
    const textSpan = target.querySelector("span")
    if (textSpan) {
      searchInput.value = textSpan.textContent
      suggestionsContainer.style.display = "none"
      searchInput.focus()
      submitSearch()
    }
  }
}

function submitSearch() {
    const query = searchInput.value.trim()
    
    // Check if the query is a direct image URL
    // A simple check for now: starts with http(s) and ends with common image extensions, or contains image in path
    const isImageUrl = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg|ico)(\?.+)?$/i.test(query) ||
                       /^https?:\/\/.+\/images\/.+$/i.test(query) ||
                       /^https?:\/\/.+\/img\/.+$/i.test(query) ||
                       /^https?:\/\/.+unsplash\.com\/photos\/.+$/i.test(query); // Specific for Unsplash links

    if (pendingImageFile) {
        // Handle pasted/uploaded image files (manual upload to Lens)
        console.warn("Image file detected. Redirecting to lens.google.com/upload for manual action.");
        window.open("https://lens.google.com/upload", "_blank");
        alert("Đã mở Google Lens. Vui lòng kéo thả ảnh vào khu vực tải lên hoặc nhấp để chọn tệp trên trang đó để tiếp tục tìm kiếm.");
        clearImagePreview();
        return;
    } else if (isImageUrl) {
        // Handle image URLs (direct search via Lens)
        console.log("Image URL detected. Redirecting to Google Lens search by URL.");
        window.open(`https://lens.google.com/search?url=${encodeURIComponent(query)}`, "_blank");
        searchInput.value = ""; // Clear input after search
        return;
    }

    // Default to text search
    if (!query) return;

    let searchUrl = "https://www.google.com/search?q=" + encodeURIComponent(query);

    if (currentEngine === "google-image") {
        searchUrl += "&tbm=isch";
    }

    window.location.href = searchUrl;
}

function uploadImageToGoogle(file) {
    // Due to Google's server-side rejection of direct programmatic image uploads
    // from extensions, we will now redirect the user to Google Lens for manual upload.
    console.warn("Direct image upload to Google is currently unavailable. Redirecting to lens.google.com/upload for manual upload.")
    window.open("https://lens.google.com/upload", "_blank")
    alert("Đã mở Google Lens. Vui lòng kéo thả ảnh vào khu vực tải lên hoặc nhấp để chọn tệp trên trang đó để tiếp tục tìm kiếm.")
    // Optionally, clear the pending image preview as the user is now redirected
    clearImagePreview()
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

    if (currentEngine === "google-image") {
        cameraBtn.style.display = "block"
        searchInput.placeholder = "Search Google Images (or Paste Image)..."
    } else {
        cameraBtn.style.display = "none"
        searchInput.placeholder = "Search Google..."
    }
}

function initSearch() {
    // Dropdown Toggle
    searchEngineSelector.addEventListener("click", (e) => {
        e.stopPropagation()
        engineDropdown.classList.toggle("show")
    })

    // Option Selection
    engineOptions.forEach(option => {
        option.addEventListener("click", (e) => {
            e.stopPropagation()
            const value = option.dataset.value
            currentEngine = value
            
            // Update Active State
            engineOptions.forEach(opt => opt.classList.remove("active"))
            option.classList.add("active")

            // Update Icon
            const iconClass = value === "google" ? "fa-brands fa-google" : "fa-regular fa-image"
            selectedEngine.innerHTML = `<i class="${iconClass}"></i>`
            
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
    // If we have an image pending, maybe we shouldn't show text suggestions?
    // Or maybe we treat text as metadata? Google Images direct upload doesn't support extra query easily.
    // For now, let's allow typing but if they submit, the image takes precedence as per logic.
    
    clearTimeout(suggestionTimeout)
    suggestionTimeout = setTimeout(() => {
      fetchSuggestions(searchInput.value)
    }, 250) 
  })

  suggestionsContainer.addEventListener("click", handleSuggestionClick)

  // Handle clearing the search input
  searchInput.addEventListener("input", () => {
    clearBtn.style.display = searchInput.value ? "block" : "none"
  })
  
  clearBtn.addEventListener("click", () => {
    searchInput.value = ""
    clearBtn.style.display = "none"
    suggestionsContainer.style.display = "none"
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
