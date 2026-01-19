import { searchInput, clearBtn } from "../utils/dom.js";

const searchContainer = document.querySelector(".search-container");
const suggestionsContainer = document.createElement("div");
suggestionsContainer.id = "suggestions-container";
searchContainer.appendChild(suggestionsContainer);

let suggestionTimeout;

async function fetchSuggestions(query) {
    if (!query) {
        suggestionsContainer.style.display = "none";
        return;
    }

    try {
        // Using DuckDuckGo's API
        const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&pretty=1`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        
        displaySuggestions(data.RelatedTopics);
    } catch (error) {
        console.error("Error fetching suggestions:", error);
        suggestionsContainer.style.display = "none";
    }
}

function displaySuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
        suggestionsContainer.style.display = "none";
        return;
    }

    const filteredSuggestions = suggestions.filter(s => s.Text).slice(0, 6);

    suggestionsContainer.innerHTML = filteredSuggestions
        .map(
            (suggestion) =>
                `<div class="suggestion-item">${suggestion.Text}</div>`
        )
        .join("");

    if (filteredSuggestions.length > 0) {
        suggestionsContainer.style.display = "block";
    } else {
        suggestionsContainer.style.display = "none";
    }
}

function handleSuggestionClick(e) {
    if (e.target.classList.contains("suggestion-item")) {
        searchInput.value = e.target.textContent;
        suggestionsContainer.style.display = "none";
        searchInput.focus();
        // Optionally, submit the form
        // searchInput.form.submit();
    }
}

function initSearch() {
    searchInput.addEventListener("input", () => {
        clearTimeout(suggestionTimeout);
        suggestionTimeout = setTimeout(() => {
            fetchSuggestions(searchInput.value);
        }, 250); // Debounce API calls
    });

    suggestionsContainer.addEventListener("click", handleSuggestionClick);

    // Hide suggestions when clicking outside
    document.addEventListener("click", (e) => {
        if (!searchContainer.contains(e.target)) {
            suggestionsContainer.style.display = "none";
        }
    });

    // Handle clearing the search input
    searchInput.addEventListener('input', () => {
        clearBtn.style.display = searchInput.value ? 'block' : 'none';
    });
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        suggestionsContainer.style.display = "none";
        searchInput.focus();
    });
}

export { initSearch };
