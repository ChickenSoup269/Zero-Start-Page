document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const clockElement = document.getElementById('clock');
    const dateElement = document.getElementById('date');
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-btn');
    const bookmarksContainer = document.getElementById('bookmarks-container');
    const modal = document.getElementById('bookmark-modal');
    const closeModalBtn = document.querySelector('.close');
    const saveBookmarkBtn = document.getElementById('save-bookmark');
    const bookmarkTitleInput = document.getElementById('bookmark-title');
    const bookmarkUrlInput = document.getElementById('bookmark-url');
    const bookmarkIconInput = document.getElementById('bookmark-icon-url');
    const modalTitle = document.getElementById('modal-title');
    
    // Context Menu Elements
    const contextMenu = document.getElementById('context-menu');
    const menuEdit = document.getElementById('menu-edit');
    const menuDelete = document.getElementById('menu-delete');

    // Import Elements
    const manualEntryForm = document.getElementById('manual-entry-form');
    const importSection = document.getElementById('import-section');
    const showImportBtn = document.getElementById('show-import-btn');
    const backToManualBtn = document.getElementById('back-to-manual');
    const browserBookmarksList = document.getElementById('browser-bookmarks-list');
    const confirmImportBtn = document.getElementById('confirm-import-btn');

    // Settings Elements
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsSidebar = document.getElementById('settings-sidebar');
    const closeSettings = document.getElementById('close-settings');
    const bgInput = document.getElementById('bg-input');
    const bgColorPicker = document.getElementById('bg-color-picker');
    const fontSelect = document.getElementById('font-select');
    const dateFormatSelect = document.getElementById('date-format-select');
    const clockSizeInput = document.getElementById('clock-size-input');
    const clockSizeValue = document.getElementById('clock-size-value');
    const resetSettingsBtn = document.getElementById('reset-settings');

    // --- State ---
    let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    let editingIndex = null;
    let contextMenuTargetIndex = -1;
    let settings = JSON.parse(localStorage.getItem('pageSettings')) || {
        background: '',
        font: "'Outfit', sans-serif",
        dateFormat: 'full',
        clockSize: '6'
    };

    // --- Functions ---
    
    // 1. Clock & Date
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour12: false });
        clockElement.textContent = timeString;

        let dateString = '';
        const format = settings.dateFormat || 'full';

        if (format === 'full') {
            const options = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
            dateString = now.toLocaleDateString('en-US', options);
        } else if (format === 'short') {
            dateString = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
        } else if (format === 'us') {
            dateString = now.toLocaleDateString('en-US'); // MM/DD/YYYY
        } else if (format === 'iso') {
            dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD
        }
        
        dateElement.textContent = dateString;
    }

    // 2. Settings
    function applySettings() {
        // Background
        if (settings.background) {
            if (settings.background.startsWith('#')) {
                document.body.style.background = settings.background;
                document.body.classList.add('bg-image-active');
                document.body.style.backgroundImage = ''; // Clear any previous image
            } else if (settings.background.startsWith('http') || settings.background.startsWith('data:')) {
                document.body.style.backgroundImage = `url('${settings.background}')`;
                document.body.classList.add('bg-image-active');
                document.body.style.background = ''; // Clear any previous color
            } else {
                // Fallback or gradient text logic if needed
                document.body.style.background = ''; 
                document.body.style.backgroundImage = '';
                document.body.classList.remove('bg-image-active');
            }
        } else {
             document.body.style.background = ''; 
             document.body.style.backgroundImage = '';
             document.body.classList.remove('bg-image-active');
        }

        // Font
        document.documentElement.style.setProperty('--font-primary', settings.font);
        
        // Clock Size
        document.documentElement.style.setProperty('--clock-size', `${settings.clockSize}rem`);
        
        // Update Inputs
        bgInput.value = settings.background;
        fontSelect.value = settings.font;
        dateFormatSelect.value = settings.dateFormat;
        clockSizeInput.value = settings.clockSize;
        clockSizeValue.textContent = `${settings.clockSize}rem`;
        
        updateTime(); // Update time display in case date format changed
    }

    function saveSettings() {
        localStorage.setItem('pageSettings', JSON.stringify(settings));
        applySettings();
    }

    // 3. Bookmarks
    function saveBookmarks() {
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
        renderBookmarks();
    }

    function renderBookmarks() {
        bookmarksContainer.innerHTML = '';
        bookmarks.forEach((bookmark, index) => {
            const bookmarkEl = document.createElement('a');
            bookmarkEl.href = bookmark.url;
            bookmarkEl.classList.add('bookmark');
            bookmarkEl.target = "_blank";

            let faviconUrl = bookmark.icon || `https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=64`;

            bookmarkEl.innerHTML = `
                <img src="${faviconUrl}" alt="${bookmark.title} icon" onerror="this.src='https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=64'">
                <span>${bookmark.title}</span>
            `;
            
            bookmarkEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                contextMenuTargetIndex = index;
                showContextMenu(e.clientX, e.clientY);
            });

            bookmarksContainer.appendChild(bookmarkEl);
        });

        // Add New Button
        const addBtn = document.createElement('button');
        addBtn.className = 'add-bookmark-card';
        addBtn.setAttribute('aria-label', 'Add Bookmark');
        addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        addBtn.addEventListener('click', () => openModal(null));
        bookmarksContainer.appendChild(addBtn);
    }

    // 4. Modal
    function openModal(index = null) {
        modal.classList.add('show');
        editingIndex = index;
        
        // Reset View to manual entry by default when opening modal
        importSection.style.display = 'none';
        manualEntryForm.style.display = 'block';

        if (index !== null) {
            modalTitle.textContent = "Edit Bookmark";
            const bookmark = bookmarks[index];
            bookmarkTitleInput.value = bookmark.title;
            bookmarkUrlInput.value = bookmark.url;
            bookmarkIconInput.value = bookmark.icon || '';
        } else {
            modalTitle.textContent = "Add Bookmark";
            bookmarkTitleInput.value = '';
            bookmarkUrlInput.value = '';
            bookmarkIconInput.value = '';
        }
        
        bookmarkTitleInput.focus();
    }
    
    function closeModal() {
        modal.classList.remove('show');
        editingIndex = null;
    }

    // 5. Context Menu
    function showContextMenu(x, y) {
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
    }

    function hideContextMenu() {
        contextMenu.style.display = 'none';
        contextMenuTargetIndex = -1;
    }

    // 6. Import Logic
    function loadBrowserBookmarks() {
        chrome.bookmarks.getTree((tree) => {
            browserBookmarksList.innerHTML = '';
            renderBookmarkTree(tree[0], browserBookmarksList);
        });
    }

    function renderBookmarkTree(node, container) {
        if (node.children) {
            if (node.id !== '0') { 
                const folderDiv = document.createElement('div');
                folderDiv.className = 'bookmark-tree-folder expanded';
                folderDiv.innerHTML = `<i class="fa-solid fa-chevron-right"></i> <i class="fa-regular fa-folder"></i> <span>${node.title}</span>`;
                
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'folder-content';
                
                folderDiv.addEventListener('click', () => {
                    const isHidden = childrenContainer.classList.contains('hidden');
                    if (isHidden) {
                        childrenContainer.classList.remove('hidden');
                        folderDiv.classList.add('expanded');
                        folderDiv.classList.remove('collapsed');
                    } else {
                        childrenContainer.classList.add('hidden');
                        folderDiv.classList.remove('expanded');
                        folderDiv.classList.add('collapsed');
                    }
                });

                container.appendChild(folderDiv);
                container.appendChild(childrenContainer);
                node.children.forEach(child => renderBookmarkTree(child, childrenContainer));
            } else {
                node.children.forEach(child => renderBookmarkTree(child, container));
            }
        } else {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'bookmark-tree-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = JSON.stringify({ title: node.title, url: node.url });
            
            itemDiv.addEventListener('click', (e) => {
                if (e.target !== checkbox) checkbox.checked = !checkbox.checked;
            });

            let iconHtml = '<i class="fa-solid fa-earth-americas"></i>';
            if(node.url) {
                iconHtml = `<img src="https://www.google.com/s2/favicons?domain=${node.url}&sz=16" style="width:16px;height:16px;margin-right:5px;">`;
            }
            
            const label = document.createElement('span');
            label.innerHTML = `${iconHtml} ${node.title}`;
            label.title = node.url;

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            container.appendChild(itemDiv);
        }
    }

    // --- Event Listeners ---

    // Search
    searchInput.addEventListener('input', () => {
        clearBtn.style.display = searchInput.value.length > 0 ? 'block' : 'none';
    });
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
        clearBtn.style.display = 'none';
    });

    // Bookmarks UI (Modal & Save)
    saveBookmarkBtn.addEventListener('click', () => {
        const title = bookmarkTitleInput.value.trim();
        let url = bookmarkUrlInput.value.trim();
        const icon = bookmarkIconInput.value.trim();

        if (title && url) {
            if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
            const newBookmark = { title, url, icon };

            if (editingIndex !== null) {
                bookmarks[editingIndex] = newBookmark;
            } else {
                bookmarks.push(newBookmark);
            }
            saveBookmarks();
            closeModal();
        } else {
            alert('Please enter both a title and a URL.');
        }
    });

    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
        // hideContextMenu(); // This was causing issues with context menu clicks
    });
    document.addEventListener('click', (e) => {
        // Hide context menu if click is outside of it
        if (!contextMenu.contains(e.target) && contextMenu.style.display === 'block') {
            hideContextMenu();
        }
    });


    // Context Menu
    menuEdit.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent document click from immediately hiding it
        if (contextMenuTargetIndex > -1) {
            openModal(contextMenuTargetIndex);
        }
        hideContextMenu();
    });
    menuDelete.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent document click from immediately hiding it
        if (contextMenuTargetIndex > -1 && confirm(`Delete bookmark "${bookmarks[contextMenuTargetIndex].title}"?`)) {
            bookmarks.splice(contextMenuTargetIndex, 1);
            saveBookmarks();
        }
        hideContextMenu();
    });

    // Import
    showImportBtn.addEventListener('click', () => {
        if (chrome && chrome.bookmarks) {
            manualEntryForm.style.display = 'none';
            importSection.style.display = 'block';
            modalTitle.textContent = "Import from Browser";
            loadBrowserBookmarks(); 
        } else {
            alert('Browser Bookmarks API is not available. Please run as extension.');
        }
    });

    backToManualBtn.addEventListener('click', () => {
        importSection.style.display = 'none';
        manualEntryForm.style.display = 'block';
        modalTitle.textContent = "Add Bookmark"; // Reset title
    });

    confirmImportBtn.addEventListener('click', () => {
        const checkboxes = browserBookmarksList.querySelectorAll('input[type="checkbox"]:checked');
        let addedCount = 0;
        checkboxes.forEach(cb => {
            const data = JSON.parse(cb.value);
            if (!bookmarks.some(b => b.url === data.url)) { // Check for duplicates
                bookmarks.push({ title: data.title, url: data.url, icon: '' });
                addedCount++;
            }
        });
        if (addedCount > 0) {
            saveBookmarks();
            alert(`Imported ${addedCount} bookmarks!`);
            closeModal();
        } else {
            alert('No new bookmarks selected or they already exist.');
        }
    });

    // Settings Sidebar
    settingsToggle.addEventListener('click', () => settingsSidebar.classList.add('open'));
    closeSettings.addEventListener('click', () => settingsSidebar.classList.remove('open'));
    
    document.addEventListener('click', (e) => {
        if (!settingsSidebar.contains(e.target) && !settingsToggle.contains(e.target) && settingsSidebar.classList.contains('open')) {
            settingsSidebar.classList.remove('open');
        }
    });

    bgInput.addEventListener('change', () => {
        settings.background = bgInput.value;
        saveSettings();
    });
    bgColorPicker.addEventListener('input', () => {
        bgInput.value = bgColorPicker.value; // Update text input with color picker value
        settings.background = bgColorPicker.value;
        saveSettings(); 
    });
    fontSelect.addEventListener('change', () => {
        settings.font = fontSelect.value;
        saveSettings();
    });
    dateFormatSelect.addEventListener('change', () => {
        settings.dateFormat = dateFormatSelect.value;
        saveSettings();
    });
    clockSizeInput.addEventListener('input', () => {
        settings.clockSize = clockSizeInput.value;
        clockSizeValue.textContent = `${clockSizeInput.value}rem`;
        saveSettings();
    });
    resetSettingsBtn.addEventListener('click', () => {
        if(confirm('Reset all settings to default?')) {
            localStorage.removeItem('pageSettings');
            settings = { background: '', font: "'Outfit', sans-serif", dateFormat: 'full', clockSize: '6' };
            saveSettings(); // This will apply default settings
        }
    });

    // --- Initialization ---
    renderBookmarks();
    applySettings();
    setInterval(updateTime, 1000);
});
