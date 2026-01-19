import { searchInput, clearBtn } from "../utils/dom.js"

const searchContainer = document.querySelector(".search-container")
const suggestionsContainer = document.createElement("div")
suggestionsContainer.id = "suggestions-container"
searchContainer.appendChild(suggestionsContainer)

let suggestionTimeout

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
  // A simple heuristic to extract a domain from the suggestion.
  // This might not always be accurate.
  try {
    const url = new URL(
      suggestion.startsWith("http")
        ? suggestion
        : `https://${suggestion.split(" ")[0]}`,
    )
    return `https://www.google.com/s2/favicons?domain=${url.hostname}`
  } catch (e) {
    // If it's not a URL, use a generic search icon
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
  // Traverse up the DOM tree to find the suggestion-item container
  while (target && !target.classList.contains("suggestion-item")) {
    target = target.parentElement
  }

  if (target) {
    // Find the span within the suggestion-item to get the text
    const textSpan = target.querySelector("span")
    if (textSpan) {
      searchInput.value = textSpan.textContent
      suggestionsContainer.style.display = "none"
      searchInput.focus()
      // Optionally, submit the form
      searchInput.form.submit()
    }
  }
}

function initSearch() {
  searchInput.addEventListener("input", () => {
    clearTimeout(suggestionTimeout)
    suggestionTimeout = setTimeout(() => {
      fetchSuggestions(searchInput.value)
    }, 250) // Debounce API calls
  })

  suggestionsContainer.addEventListener("click", handleSuggestionClick)

  // Hide suggestions when clicking outside
  document.addEventListener("click", (e) => {
    if (!searchContainer.contains(e.target)) {
      suggestionsContainer.style.display = "none"
    }
  })

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
}

export { initSearch }
