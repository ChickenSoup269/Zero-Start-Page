// Update time and date
function updateTime() {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false });
    const date = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    document.getElementById('clock').textContent = time;
    document.getElementById('date').textContent = date;
}
setInterval(updateTime, 1000);
updateTime();

// Search bar enhancements
const searchInput = document.getElementById('search-input');
const clearBtn = document.getElementById('clear-btn');
const searchIcon = document.querySelector('.search-icon');
const suggestionsList = document.getElementById('suggestions');
const searchForm = document.getElementById('search-form');

searchInput.addEventListener('focus', () => {
    searchIcon.style.display = 'block';
});

searchInput.addEventListener('input', () => {
    const query = searchInput.value;
    if (query) {
        clearBtn.style.display = 'block';
        fetchSuggestions(query);
        suggestionsList.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
        suggestionsList.style.display = 'none';
        suggestionsList.innerHTML = '';
    }
});

clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    suggestionsList.style.display = 'none';
    suggestionsList.innerHTML = '';
    searchInput.focus();
});

searchForm.addEventListener('submit', (e) => {
    if (!searchInput.value) e.preventDefault();
});

async function fetchSuggestions(query) {
    try {
        const response = await fetch(`http://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        const suggestions = data[1];
        suggestionsList.innerHTML = '';
        suggestions.forEach(sug => {
            const li = document.createElement('li');
            li.textContent = sug;
            li.addEventListener('click', () => {
                searchInput.value = sug;
                searchForm.submit();
            });
            suggestionsList.appendChild(li);
        });
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
}

// Bookmarks
const bookmarksContainer = document.getElementById('bookmarks-container');
const addBookmarkBtn = document.getElementById('add-bookmark-btn');
const modal = document.getElementById('bookmark-modal');
const closeModal = document.querySelector('.close');
const saveBookmark = document.getElementById('save-bookmark');
const bookmarkTitle = document.getElementById('bookmark-title');
const bookmarkUrl = document.getElementById('bookmark-url');

function loadBookmarks() {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    bookmarksContainer.innerHTML = '';
    bookmarks.forEach(bm => {
        const a = document.createElement('a');
        a.classList.add('bookmark');
        a.href = bm.url;
        a.target = '_blank';

        const img = document.createElement('img');
        img.src = `https://www.google.com/s2/favicons?domain=${new URL(bm.url).hostname}`;
        img.alt = bm.title;

        const span = document.createElement('span');
        span.textContent = bm.title;

        a.appendChild(img);
        a.appendChild(span);
        bookmarksContainer.appendChild(a);
    });
}

addBookmarkBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
});

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

saveBookmark.addEventListener('click', () => {
    const title = bookmarkTitle.value.trim();
    const url = bookmarkUrl.value.trim();
    if (title && url) {
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
        bookmarks.push({ title, url });
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
        loadBookmarks();
        bookmarkTitle.value = '';
        bookmarkUrl.value = '';
        modal.style.display = 'none';
    }
});

loadBookmarks();