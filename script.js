// Grouped Bookmark functionality
const activeGroupDisplay = document.getElementById("active-group-display")
const groupTabsContainer = document.getElementById("group-tabs-container")
const groupModal = document.getElementById("group-modal")
const groupForm = document.getElementById("group-form")
const groupNameInput = document.getElementById("group-name")
const cancelGroupBtn = document.getElementById("cancel-group-btn")

const addBookmarkModal = document.getElementById("add-bookmark-modal")
const cancelBookmarkBtn = document.getElementById("cancel-bookmark-btn")
const addBookmarkForm = document.getElementById("add-bookmark-form")
const bookmarkNameInput = document.getElementById("bookmark-name")
const bookmarkURLInput = document.getElementById("bookmark-url")
const bookmarkIconURLInput = document.getElementById("bookmark-icon-url")
const targetGroupIdInput = document.getElementById("target-group-id") 

const bookmarkContextMenu = document.getElementById("bookmark-context-menu")
const bookmarkContextEdit = document.querySelector("#bookmark-context-menu li[data-action='edit']")
const bookmarkContextDelete = document.querySelector("#bookmark-context-menu li[data-action='delete']")

const editBookmarkModal = document.getElementById("edit-bookmark-modal")
const cancelEditBookmarkBtn = document.getElementById("cancel-edit-bookmark-btn")
const editBookmarkForm = document.getElementById("edit-bookmark-form")
const editBookmarkNameInput = document.getElementById("edit-bookmark-name")
const editBookmarkURLInput = document.getElementById("edit-bookmark-url")
const editBookmarkIconURLInput = document.getElementById("edit-bookmark-icon-url")

const timeElement = document.getElementById("time")
const dateElement = document.getElementById("date")

// Sidebar & Settings Elements
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarCloseBtn = document.getElementById("sidebar-close-btn");

const settingsBtn = document.getElementById("settings-btn");
const addGroupSidebarBtn = document.getElementById("add-group-sidebar-btn");
const settingsModal = document.getElementById("settings-modal");
const settingsForm = document.getElementById("settings-form");
const bgUrlInput = document.getElementById("bg-url");
const bgFileInput = document.getElementById("bg-file");
const fontFamilyInput = document.getElementById("font-family");
const clockSizeInput = document.getElementById("clock-size");
const clockSizeVal = document.getElementById("clock-size-val");
const dateLangInput = document.getElementById("date-lang");
const cancelSettingsBtn = document.getElementById("cancel-settings-btn");
const resetBgBtn = document.getElementById("reset-bg-btn");

let currentBookmarkUrl = null
let currentGroupId = null

// Load groups from local storage
let groups = JSON.parse(localStorage.getItem("bookmarkGroups")) || []
// Active group state
let activeGroupId = localStorage.getItem("activeGroupId")

// Load User Settings
const savedSettings = JSON.parse(localStorage.getItem("userSettings")) || {
    bgUrl: "",
    fontFamily: "",
    sidebarOpen: false,
    clockSize: 8,
    dateLang: 'en-US'
};
// ensure defaults if new properties missing
if (!savedSettings.clockSize) savedSettings.clockSize = 8;
if (!savedSettings.dateLang) savedSettings.dateLang = 'en-US';

// Initialize Sidebar State
function updateSidebarState() {
    if (savedSettings.sidebarOpen) {
        sidebar.classList.add("open");
        document.body.classList.add("sidebar-open");
    } else {
        sidebar.classList.remove("open");
        document.body.classList.remove("sidebar-open");
    }
}
updateSidebarState();

// Sidebar Toggle Logic
sidebarToggle.addEventListener("click", () => {
    savedSettings.sidebarOpen = true;
    saveUserSettings();
    updateSidebarState();
});

sidebarCloseBtn.addEventListener("click", () => {
    savedSettings.sidebarOpen = false;
    saveUserSettings();
    updateSidebarState();
});

// Apply Settings Immediately
function applySettings() {
    // BG
    if (savedSettings.bgUrl) {
        document.body.style.backgroundImage = `url("${savedSettings.bgUrl}")`;
    } else {
        document.body.style.backgroundImage = ""; 
    }

    // Font
    if (savedSettings.fontFamily) {
        document.body.style.fontFamily = savedSettings.fontFamily;
    } else {
        document.body.style.fontFamily = ""; 
    }

    // Clock Size
    if (timeElement) {
        timeElement.style.fontSize = savedSettings.clockSize + "rem";
    }
}
applySettings();

// Migration logic
const oldBookmarks = JSON.parse(localStorage.getItem("bookmarks"))
if (oldBookmarks && (!groups || groups.length === 0)) {
    const defaultGroup = {
        id: Date.now().toString(),
        name: "Default group",
        bookmarks: oldBookmarks
    }
    groups = [defaultGroup]
    localStorage.removeItem("bookmarks")
    saveGroups()
}

if (!activeGroupId && groups.length > 0) {
    activeGroupId = groups[0].id;
} else if (groups.length > 0 && !groups.find(g => g.id === activeGroupId)) {
    activeGroupId = groups[0].id;
}

function saveGroups() {
    localStorage.setItem("bookmarkGroups", JSON.stringify(groups))
}

function saveUserSettings() {
    localStorage.setItem("userSettings", JSON.stringify(savedSettings));
}

function setActiveGroup(id) {
    activeGroupId = id;
    localStorage.setItem("activeGroupId", id);
    renderApp();
}

function updateTimeAndDate() {
    const now = new Date();
    // Use saved locale
    const locale = savedSettings.dateLang || 'en-US';
    
    // Capitalize first letter logic for Vietnamese? Or general?
    // Vietnamese date usually "thứ năm, 15 tháng 1"
    const dateString = now.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
    
    timeElement.textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); 
    dateElement.textContent = dateString;
}

function attachBookmarkEventListeners(bookmarkElement, bookmarkData, groupId) {
    bookmarkElement.dataset.url = bookmarkData.url;
    bookmarkElement.dataset.name = bookmarkData.name;

    bookmarkElement.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-btn')) { 
            // HTML href
        }
    });

    bookmarkElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        currentBookmarkUrl = bookmarkData.url;
        currentGroupId = groupId;
        
        bookmarkContextMenu.style.top = `${e.clientY}px`;
        bookmarkContextMenu.style.left = `${e.clientX}px`;
        bookmarkContextMenu.style.display = 'block';
    });
}

function createBookmarkElement(bookmark, groupId) {
    const bookmarkAnchor = document.createElement("a");
    bookmarkAnchor.target = "_blank";
    bookmarkAnchor.className = "bookmark";
    bookmarkAnchor.href = bookmark.url;
    
    let iconSrc = bookmark.iconUrl;
    if (!iconSrc) {
        const domain = new URL(bookmark.url).hostname;
        iconSrc = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    }

    const iconDiv = document.createElement("div");
    iconDiv.className = "bookmark-icon";
    
    const img = document.createElement("img");
    img.src = iconSrc;
    img.alt = bookmark.name;
    img.onerror = () => {
        img.style.display = 'none';
        iconDiv.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8.47 1.318a1 1 0 0 0-.94 0l-6 3.2A1 1 0 0 0 1 5.4v.817l-.936.56a1 1 0 0 0-.533.91v7.625a1 1 0 0 0 .533.91l6 3.598a1 1 0 0 0 .937 0l6-3.598a1 1 0 0 0 .533-.91V7.687a1 1 0 0 0-.533-.91L12 6.217V5.4a1 1 0 0 0-.53-.882l-6-3.2zM7.06.435a2 2 0 0 1 1.882 0l6 3.2A2 2 0 0 1 16 5.4V14a2 2 0 0 1-1.059 1.765l-6 3.598a2 2 0 0 1-1.882 0l-6-3.598A2 2 0 0 1 0 14V5.4a2 2 0 0 1 1.059-1.765l6-3.2z"/>
        </svg>`; 
    };

    iconDiv.appendChild(img);

    const deleteBtn = document.createElement("div");
    deleteBtn.className = "delete-btn";
    deleteBtn.innerHTML = "×";
    deleteBtn.title = "Delete Bookmark";
    deleteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${bookmark.name}"?`)) {
            deleteBookmark(groupId, bookmark.url);
        }
    });

    const titleDiv = document.createElement("div");
    titleDiv.className = "bookmark-title";
    titleDiv.textContent = bookmark.name;

    bookmarkAnchor.appendChild(deleteBtn);
    bookmarkAnchor.appendChild(iconDiv);
    bookmarkAnchor.appendChild(titleDiv);

    attachBookmarkEventListeners(bookmarkAnchor, bookmark, groupId);
    return bookmarkAnchor;
}

function renderGroupTabs() {
    groupTabsContainer.innerHTML = "";
    groups.forEach(group => {
        const tab = document.createElement("div");
        tab.className = `group-tab ${group.id === activeGroupId ? 'active' : ''}`;
        tab.textContent = group.name;
        tab.addEventListener('click', () => setActiveGroup(group.id));
        tab.addEventListener('dblclick', () => {
           const newName = prompt("Rename group:", group.name);
           if (newName) {
               group.name = newName;
               saveGroups();
               renderApp();
           }
        });
        groupTabsContainer.appendChild(tab);
    });
}

function renderActiveGroup() {
    activeGroupDisplay.innerHTML = "";
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return;

    const grid = document.createElement("div");
    grid.className = "group-grid active-grid"; 

    group.bookmarks.forEach(bookmark => {
        const el = createBookmarkElement(bookmark, group.id);
        grid.appendChild(el);
    });

    if (group.bookmarks.length < 16) {
        const addBtn = document.createElement("div");
        addBtn.className = "bookmark add-btn";
        addBtn.innerHTML = `
            <div class="bookmark-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                     <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
            </div>
            <div class="bookmark-title">Add New</div>
        `;
        addBtn.addEventListener("click", () => {
            targetGroupIdInput.value = group.id;
            addBookmarkModal.style.display = "flex";
        });
        grid.appendChild(addBtn);
    }
    activeGroupDisplay.appendChild(grid);
}

function renderApp() {
    renderGroupTabs();
    renderActiveGroup();
}

function deleteBookmark(groupId, url) {
    const group = groups.find(g => g.id === groupId);
    if (group) {
        group.bookmarks = group.bookmarks.filter(b => b.url !== url);
        saveGroups();
        renderApp();
    }
}

// --- Sidebar & Settings Event Listeners ---

clockSizeInput.addEventListener("input", (e) => {
    clockSizeVal.textContent = e.target.value + "rem";
});

settingsBtn.addEventListener("click", () => {
    if (savedSettings.bgUrl && savedSettings.bgUrl.startsWith("data:")) {
        bgUrlInput.value = ""; 
    } else {
        bgUrlInput.value = savedSettings.bgUrl || "";
    }
    fontFamilyInput.value = savedSettings.fontFamily || "";
    
    // Init new controls
    clockSizeInput.value = savedSettings.clockSize || 8;
    clockSizeVal.textContent = (savedSettings.clockSize || 8) + "rem";
    dateLangInput.value = savedSettings.dateLang || 'en-US';
    
    settingsModal.style.display = "flex";
});

cancelSettingsBtn.addEventListener("click", () => {
    settingsModal.style.display = "none";
});

bgFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 3000000) { 
            alert("Image is too large (Max 3MB). Please pick a smaller image.");
            bgFileInput.value = "";
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            bgUrlInput.dataset.tempFile = event.target.result;
            bgUrlInput.value = "[Local Image Selected]";
        };
        reader.readAsDataURL(file);
    }
});

settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    if (bgUrlInput.dataset.tempFile) {
        savedSettings.bgUrl = bgUrlInput.dataset.tempFile;
        delete bgUrlInput.dataset.tempFile;
    } else if (bgUrlInput.value !== "[Local Image Selected]") {
        savedSettings.bgUrl = bgUrlInput.value;
    }
    
    savedSettings.fontFamily = fontFamilyInput.value;
    savedSettings.clockSize = clockSizeInput.value;
    savedSettings.dateLang = dateLangInput.value;
    
    saveUserSettings();
    applySettings();
    updateTimeAndDate(); // Force date update
    settingsModal.style.display = "none";
});

resetBgBtn.addEventListener("click", () => {
    bgUrlInput.value = "";
    bgFileInput.value = "";
    delete bgUrlInput.dataset.tempFile;
    
    savedSettings.bgUrl = "";
    saveUserSettings();
    applySettings();
});

addGroupSidebarBtn.addEventListener("click", () => {
    groupForm.reset();
    groupModal.style.display = "flex";
});

cancelGroupBtn.addEventListener("click", () => { groupModal.style.display = "none"; });

groupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = groupNameInput.value;
    const newGroup = {
        id: Date.now().toString(),
        name: name,
        bookmarks: []
    };
    groups.push(newGroup);
    setActiveGroup(newGroup.id);
    saveGroups();
    groupModal.style.display = "none";
});

addBookmarkForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const groupId = targetGroupIdInput.value;
    const group = groups.find(g => g.id === groupId);
    if (group) {
        if (group.bookmarks.length >= 16) {
            alert("This group is full (max 16 bookmarks).");
            return;
        }
        const name = bookmarkNameInput.value;
        let url = bookmarkURLInput.value;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "http://" + url;
        }
        const iconUrl = bookmarkIconURLInput.value;
        group.bookmarks.push({ name, url, iconUrl });
        saveGroups();
        renderApp();
    }
    addBookmarkModal.style.display = "none";
    addBookmarkForm.reset();
});

function editBookmark(groupId, oldUrl, newName, newUrl, newIconUrl) {
    const group = groups.find(g => g.id === groupId);
    if (group) {
        const bookmark = group.bookmarks.find(b => b.url === oldUrl);
        if (bookmark) {
            bookmark.name = newName;
            bookmark.url = newUrl;
            bookmark.iconUrl = newIconUrl;
            saveGroups();
            renderApp();
        }
    }
}

bookmarkContextEdit.addEventListener("click", () => {
    if (currentBookmarkUrl && currentGroupId) {
        const group = groups.find(g => g.id === currentGroupId);
        const bookmark = group.bookmarks.find(b => b.url === currentBookmarkUrl);
        if (bookmark) {
            editBookmarkNameInput.value = bookmark.name;
            editBookmarkURLInput.value = bookmark.url;
            editBookmarkIconURLInput.value = bookmark.iconUrl || "";
            editBookmarkModal.style.display = "flex";
            bookmarkContextMenu.style.display = "none";
        }
    }
});

editBookmarkForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newName = editBookmarkNameInput.value;
    let newUrl = editBookmarkURLInput.value;
    if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
        newUrl = "http://" + newUrl;
    }
    const newIconUrl = editBookmarkIconURLInput.value;
    editBookmark(currentGroupId, currentBookmarkUrl, newName, newUrl, newIconUrl);
    editBookmarkModal.style.display = "none";
    editBookmarkForm.reset();
});

document.addEventListener('click', (e) => {
   bookmarkContextMenu.style.display = 'none';
});
document.addEventListener('contextmenu', (e) => { if (!bookmarkContextMenu.contains(e.target)) bookmarkContextMenu.style.display = 'none'; });
groupModal.addEventListener('click', (e) => { if(e.target === groupModal) groupModal.style.display = 'none'; });
editBookmarkModal.addEventListener('click', (e) => { if(e.target === editBookmarkModal) editBookmarkModal.style.display = 'none'; });
addBookmarkModal.addEventListener('click', (e) => { if(e.target === addBookmarkModal) addBookmarkModal.style.display = 'none'; });
settingsModal.addEventListener('click', (e) => { if(e.target === settingsModal) settingsModal.style.display = 'none'; });

updateTimeAndDate();
setInterval(updateTimeAndDate, 1000);
renderApp();
