// src/components/commandPalette.js
import { showToast } from '../utils/toast.js';
import {
    showFullCalendarCheckbox,
    showMusicCheckbox,
    showTodoCheckbox,
    showTimerCheckbox,
    showQuotesCheckbox,
    showNotepadCheckbox,
    showSearchBarCheckbox,
    showBookmarksCheckbox,
    showBookmarkGroupsCheckbox,
    settingsToggle,
    searchInput as searchBarInput,
} from '../utils/dom.js';

export function initCommandPalette() {
    const modal = document.getElementById('command-palette-modal');
    const searchInput = document.getElementById('command-palette-search');
    const listContainer = document.getElementById('command-palette-list');
    const closeBtn = document.getElementById('close-command-palette-btn');
    const tooltip = document.getElementById('command-palette-tooltip');
    const closeTooltipBtn = document.getElementById('close-cp-tooltip');
    const sidebarBtn = document.getElementById('sidebar-hotkeys-btn');

    if (!modal || !searchInput || !listContainer) return;

    let isVisible = false;
    let selectedIndex = 0;
    
    // Command definitions — sorted: shortcuts first, then no-shortcut
    const commands = [
        // --- Có phím tắt ---
        {
            id: 'toggle-clock',
            title: 'Bật/Tắt: Đồng hồ',
            desc: 'Hiện hoặc ẩn đồng hồ trên màn hình',
            icon: '<i class="fa-solid fa-clock"></i>',
            shortcut: 'Alt + C',
            action: () => toggleClock(true)
        },
        {
            id: 'toggle-music',
            title: 'Bật/Tắt: Trình phát nhạc',
            desc: 'Hiện hoặc ẩn widget âm nhạc',
            icon: '<i class="fa-solid fa-music"></i>',
            shortcut: 'Alt + M',
            action: () => toggleCheckbox(showMusicCheckbox, 'Trình phát nhạc')
        },
        {
            id: 'toggle-calendar',
            title: 'Bật/Tắt: Lịch',
            desc: 'Hiện hoặc ẩn widget lịch',
            icon: '<i class="fa-solid fa-calendar"></i>',
            shortcut: 'Alt + D',
            action: () => toggleCheckbox(showFullCalendarCheckbox, 'Lịch')
        },
        {
            id: 'toggle-todo',
            title: 'Bật/Tắt: Danh sách việc cần làm',
            desc: 'Hiện hoặc ẩn widget Todo',
            icon: '<i class="fa-solid fa-list-check"></i>',
            shortcut: 'Alt + T',
            action: () => toggleCheckbox(showTodoCheckbox, 'Danh sách việc cần làm')
        },
        {
            id: 'open-settings',
            title: 'Mở/Đóng Cài đặt',
            desc: 'Mở hoặc đóng thanh cài đặt bên phải',
            icon: '<i class="fa-solid fa-gear"></i>',
            shortcut: 'Alt + S',
            action: () => settingsToggle && settingsToggle.click()
        },
        {
            id: 'focus-search',
            title: 'Focus thanh tìm kiếm',
            desc: 'Đặt con trỏ vào ô tìm kiếm để gõ ngay',
            icon: '<i class="fa-solid fa-keyboard"></i>',
            shortcut: '/',
            action: () => { if (searchBarInput) { searchBarInput.focus(); searchBarInput.select(); } }
        },
        {
            id: 'hide-all',
            title: 'Ẩn/Hiện tất cả widget',
            desc: 'Ẩn hoặc hiện lại đồng hồ, nhạc, lịch, thanh tìm kiếm, bookmarks và Google Apps',
            icon: '<i class="fa-solid fa-eye-slash"></i>',
            shortcut: 'Alt + H',
            action: () => toggleHideAll()
        },

        // --- Không có phím tắt ---
        {
            id: 'toggle-timer',
            title: 'Bật/Tắt: Đồng hồ đếm ngược',
            desc: 'Hiện hoặc ẩn widget Timer / Pomodoro',
            icon: '<i class="fa-solid fa-hourglass-half"></i>',
            shortcut: '',
            action: () => toggleCheckbox(showTimerCheckbox, 'Đồng hồ đếm ngược')
        },
        {
            id: 'toggle-quotes',
            title: 'Bật/Tắt: Trích dẫn',
            desc: 'Hiện hoặc ẩn widget câu trích dẫn hàng ngày',
            icon: '<i class="fa-solid fa-quote-left"></i>',
            shortcut: '',
            action: () => toggleCheckbox(showQuotesCheckbox, 'Trích dẫn')
        },
        {
            id: 'toggle-notepad',
            title: 'Bật/Tắt: Ghi chú',
            desc: 'Hiện hoặc ẩn widget notepad',
            icon: '<i class="fa-solid fa-note-sticky"></i>',
            shortcut: '',
            action: () => toggleCheckbox(showNotepadCheckbox, 'Ghi chú')
        },
        {
            id: 'toggle-searchbar',
            title: 'Bật/Tắt: Thanh tìm kiếm',
            desc: 'Hiện hoặc ẩn thanh tìm kiếm trên trang',
            icon: '<i class="fa-solid fa-magnifying-glass"></i>',
            shortcut: '',
            action: () => toggleCheckbox(showSearchBarCheckbox, 'Thanh tìm kiếm')
        },
        {
            id: 'toggle-bookmarks',
            title: 'Bật/Tắt: Bookmarks',
            desc: 'Hiện hoặc ẩn widget bookmark',
            icon: '<i class="fa-solid fa-bookmark"></i>',
            shortcut: '',
            action: () => toggleCheckbox(showBookmarksCheckbox, 'Bookmarks')
        },
        {
            id: 'toggle-bookmark-groups',
            title: 'Bật/Tắt: Nhóm Bookmarks',
            desc: 'Hiện hoặc ẩn các nhóm bookmark',
            icon: '<i class="fa-solid fa-folder-bookmark"></i>',
            shortcut: '',
            action: () => toggleCheckbox(showBookmarkGroupsCheckbox, 'Nhóm Bookmarks')
        },
        {
            id: 'bg-cover',
            title: 'Hình nền: Fill (Bao phủ)',
            desc: 'Chỉnh kích thước hình nền vừa vặn toàn màn hình',
            icon: '<i class="fa-solid fa-expand"></i>',
            shortcut: '',
            action: () => setBgSize('cover')
        },
        {
            id: 'bg-contain',
            title: 'Hình nền: Fit (Vừa vặn)',
            desc: 'Hiển thị toàn bộ hình nền không bị cắt',
            icon: '<i class="fa-solid fa-compress"></i>',
            shortcut: '',
            action: () => setBgSize('contain')
        },
    ];

    let filteredCommands = [...commands];

    function toggleCheckbox(checkbox, label) {
        if (!checkbox) return;
        const prevState = checkbox.checked;
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
        if (label) {
            const stateText = checkbox.checked ? 'Đã bật' : 'Đã tắt';
            showToast(`${stateText}: ${label}`, {
                undoFn: () => {
                    checkbox.checked = prevState;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
        }
    }

    function setBgSize(size) {
        const bgSizeSelect = document.getElementById('bg-size-select');
        if (bgSizeSelect) {
            const prev = bgSizeSelect.value;
            bgSizeSelect.value = size;
            bgSizeSelect.dispatchEvent(new Event('change'));
            const label = size === 'cover' ? 'Fill (Bao phủ)' : size === 'contain' ? 'Fit (Vừa vặn)' : size;
            showToast(`Hình nền: ${label}`, {
                undoFn: () => {
                    bgSizeSelect.value = prev;
                    bgSizeSelect.dispatchEvent(new Event('change'));
                }
            });
        }
    }

    function toggleClock(showUndo = false) {
        const clockDisplaySelect = document.getElementById('clock-display-select');
        if (clockDisplaySelect) {
            const prev = clockDisplaySelect.value;
            clockDisplaySelect.value = prev === 'hide' ? 'all' : 'hide';
            clockDisplaySelect.dispatchEvent(new Event('change'));
            if (showUndo) {
                const stateText = clockDisplaySelect.value === 'hide' ? 'Đã tắt' : 'Đã bật';
                showToast(`${stateText}: Đồng hồ`, {
                    undoFn: () => {
                        clockDisplaySelect.value = prev;
                        clockDisplaySelect.dispatchEvent(new Event('change'));
                    }
                });
            }
        }
    }

    // Track hide-all state
    let allHidden = false;
    let hiddenState = {};

    function toggleHideAll() {
        if (!allHidden) {
            // Save current state and hide everything
            hiddenState = {
                clock: document.getElementById('clock-display-select')?.value,
                music: showMusicCheckbox?.checked,
                calendar: showFullCalendarCheckbox?.checked,
                searchbar: showSearchBarCheckbox?.checked,
                bookmarks: showBookmarksCheckbox?.checked,
                bookmarkGroups: showBookmarkGroupsCheckbox?.checked,
            };
            const clockDisplaySelect = document.getElementById('clock-display-select');
            if (clockDisplaySelect && clockDisplaySelect.value !== 'hide') toggleClock();
            if (showMusicCheckbox?.checked) toggleCheckbox(showMusicCheckbox);
            if (showFullCalendarCheckbox?.checked) toggleCheckbox(showFullCalendarCheckbox);
            if (showSearchBarCheckbox?.checked) toggleCheckbox(showSearchBarCheckbox);
            if (showBookmarksCheckbox?.checked) toggleCheckbox(showBookmarksCheckbox);
            if (showBookmarkGroupsCheckbox?.checked) toggleCheckbox(showBookmarkGroupsCheckbox);
            // Hide Google Apps dropdown
            const googleAppsDropdown = document.getElementById('g-apps-dropdown');
            if (googleAppsDropdown) googleAppsDropdown.style.display = 'none';
            allHidden = true;
            showToast('Đã ẩn tất cả widget', {
                undoFn: () => toggleHideAll()
            });
        } else {
            // Restore previous state
            const clockDisplaySelect = document.getElementById('clock-display-select');
            if (clockDisplaySelect && hiddenState.clock && hiddenState.clock !== 'hide') {
                clockDisplaySelect.value = hiddenState.clock;
                clockDisplaySelect.dispatchEvent(new Event('change'));
            }
            if (showMusicCheckbox && hiddenState.music && !showMusicCheckbox.checked) toggleCheckbox(showMusicCheckbox);
            if (showFullCalendarCheckbox && hiddenState.calendar && !showFullCalendarCheckbox.checked) toggleCheckbox(showFullCalendarCheckbox);
            if (showSearchBarCheckbox && hiddenState.searchbar && !showSearchBarCheckbox.checked) toggleCheckbox(showSearchBarCheckbox);
            if (showBookmarksCheckbox && hiddenState.bookmarks && !showBookmarksCheckbox.checked) toggleCheckbox(showBookmarksCheckbox);
            if (showBookmarkGroupsCheckbox && hiddenState.bookmarkGroups && !showBookmarkGroupsCheckbox.checked) toggleCheckbox(showBookmarkGroupsCheckbox);
            // Restore Google Apps dropdown
            const googleAppsDropdown = document.getElementById('g-apps-dropdown');
            if (googleAppsDropdown) googleAppsDropdown.style.display = '';
            allHidden = false;
            showToast('Đã hiện lại tất cả widget');
        }
    }

    function toggleEffect(effectName) {
        const effectBtns = document.querySelectorAll('.effect-item');
        for (const btn of effectBtns) {
            if (btn.dataset.value === effectName) {
                btn.click();
                return;
            }
        }
    }

    function renderList() {
        listContainer.innerHTML = '';
        if (filteredCommands.length === 0) {
            listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">Không tìm thấy lệnh nào</div>';
            return;
        }

        filteredCommands.forEach((cmd, index) => {
            const item = document.createElement('div');
            item.className = `cp-item ${index === selectedIndex ? 'active' : ''}`;
            item.onclick = () => {
                cmd.action();
                hide();
            };

            let shortcutHtml = '';
            if (cmd.shortcut) {
                const keys = cmd.shortcut.split('+').map(k => `<kbd>${k.trim()}</kbd>`).join(' + ');
                shortcutHtml = `<div class="cp-item-shortcut">${keys}</div>`;
            }

            item.innerHTML = `
                <div class="cp-item-icon">${cmd.icon}</div>
                <div class="cp-item-content">
                    <div class="cp-item-title">${cmd.title}</div>
                    <div class="cp-item-desc">${cmd.desc}</div>
                </div>
                ${shortcutHtml}
            `;
            listContainer.appendChild(item);
        });

        // Ensure visible
        const activeItem = listContainer.querySelector('.cp-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    }

    function show() {
        if (isVisible) return;
        isVisible = true;
        modal.classList.add('open');
        searchInput.value = '';
        filteredCommands = [...commands];
        selectedIndex = 0;
        renderList();
        setTimeout(() => searchInput.focus(), 50);
    }

    function hide() {
        if (!isVisible) return;
        isVisible = false;
        modal.classList.remove('open');
    }

    // Event Listeners
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        filteredCommands = commands.filter(c => 
            c.title.toLowerCase().includes(query) || 
            c.desc.toLowerCase().includes(query)
        );
        selectedIndex = 0;
        renderList();
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % filteredCommands.length;
            renderList();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
            renderList();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredCommands[selectedIndex]) {
                filteredCommands[selectedIndex].action();
                hide();
            }
        } else if (e.key === 'Escape') {
            hide();
        }
    });

    closeBtn.addEventListener('click', hide);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hide();
    });
    
    if (sidebarBtn) {
        sidebarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isVisible) hide(); else show();
        });
    }

    // Global Hotkeys
    const keysPressed = new Set();

    window.addEventListener('keydown', (e) => {
        keysPressed.add(e.key.toLowerCase());

        // Ctrl + K to open Command Palette
        if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
            e.preventDefault();
            e.stopPropagation();
            if (isVisible) hide(); else show();
            return;
        }

        // Direct Hotkeys (Alt + Key) when not typing in input
        if (e.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            const key = e.key.toLowerCase();
            if (key === 'c') { e.preventDefault(); toggleClock(true); }
            if (key === 'm') { e.preventDefault(); toggleCheckbox(showMusicCheckbox, 'Trình phát nhạc'); }
            if (key === 'd') { e.preventDefault(); toggleCheckbox(showFullCalendarCheckbox, 'Lịch'); }
            if (key === 't') { e.preventDefault(); toggleCheckbox(showTodoCheckbox, 'Danh sách việc cần làm'); }
            if (key === 's') { e.preventDefault(); if (settingsToggle) settingsToggle.click(); }
            if (key === 'h') { e.preventDefault(); toggleHideAll(); }
        }
        
        // Focus search bar (/)
        if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            if (searchBarInput) { searchBarInput.focus(); searchBarInput.select(); }
        }

        // Change background size (W + S)
        if (keysPressed.has('w') && keysPressed.has('s') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            const bgSizeSelect = document.getElementById('bg-size-select');
            if (bgSizeSelect) {
                const sizes = ['cover', 'contain', 'custom'];
                const currentIdx = sizes.indexOf(bgSizeSelect.value);
                const nextSize = sizes[(currentIdx + 1) % sizes.length];
                setBgSize(nextSize);
                keysPressed.delete('s');
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        keysPressed.delete(e.key.toLowerCase());
    });

    // Tooltip Onboarding
    const hasSeenTooltip = localStorage.getItem('hasSeenCommandPalette');
    if (!hasSeenTooltip) {
        setTimeout(() => {
            tooltip.classList.add('show');
            setTimeout(() => {
                tooltip.classList.remove('show');
                localStorage.setItem('hasSeenCommandPalette', 'true');
            }, 10000); // Hide after 10s
        }, 2000); // Show 2s after load
    }

    if (closeTooltipBtn) {
        closeTooltipBtn.addEventListener('click', () => {
            tooltip.classList.remove('show');
            localStorage.setItem('hasSeenCommandPalette', 'true');
        });
    }
}
