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
    showGregorianCheckbox,
    showTopRightControlsCheckbox,
    layoutControlsBtn,
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
    let bgSizeChordActive = false;

    const normalizeText = (value = '') =>
        String(value)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd');

    const isTypingTarget = () => {
        const active = document.activeElement;
        if (!active) return false;
        return (
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) ||
            active.isContentEditable
        );
    };

    const setCheckboxState = (checkbox, nextState, label = '') => {
        if (!checkbox) return false;
        const prevState = checkbox.checked;
        if (prevState === nextState) return false;
        checkbox.checked = nextState;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        if (label) {
            const stateText = checkbox.checked ? 'Đã bật' : 'Đã tắt';
            showToast(`${stateText}: ${label}`, {
                undoFn: () => setCheckboxState(checkbox, prevState)
            });
        }
        return true;
    };

    const toggleCheckbox = (checkbox, label) =>
        setCheckboxState(checkbox, !checkbox?.checked, label);
    
    // Command definitions — sorted: shortcuts first, then no-shortcut
    const commands = [
        // --- Có phím tắt ---
        {
            id: 'toggle-clock',
            title: 'Bật/Tắt: Đồng hồ',
            desc: 'Hiện hoặc ẩn đồng hồ trên màn hình',
            icon: '<i class="fa-solid fa-clock"></i>',
            shortcut: 'Alt + C',
            keywords: 'clock time dong ho gio ngay thang',
            action: () => toggleClock(true)
        },
        {
            id: 'toggle-music',
            title: 'Bật/Tắt: Trình phát nhạc',
            desc: 'Hiện hoặc ẩn widget âm nhạc',
            icon: '<i class="fa-solid fa-music"></i>',
            shortcut: 'Alt + M',
            keywords: 'music spotify player nghe nhac am nhac',
            action: () => toggleCheckbox(showMusicCheckbox, 'Trình phát nhạc')
        },
        {
            id: 'toggle-calendar',
            title: 'Bật/Tắt: Lịch',
            desc: 'Hiện hoặc ẩn widget lịch',
            icon: '<i class="fa-solid fa-calendar"></i>',
            shortcut: 'Alt + D',
            keywords: 'calendar lich ngay thang',
            action: () => toggleCheckbox(showFullCalendarCheckbox, 'Lịch')
        },
        {
            id: 'toggle-todo',
            title: 'Bật/Tắt: Danh sách việc cần làm',
            desc: 'Hiện hoặc ẩn widget Todo',
            icon: '<i class="fa-solid fa-list-check"></i>',
            shortcut: 'Alt + T',
            keywords: 'todo task viec can lam cong viec',
            action: () => toggleCheckbox(showTodoCheckbox, 'Danh sách việc cần làm')
        },
        {
            id: 'toggle-timer',
            title: 'Bật/Tắt: Đồng hồ đếm ngược',
            desc: 'Hiện hoặc ẩn widget Timer / Pomodoro',
            icon: '<i class="fa-solid fa-hourglass-half"></i>',
            shortcut: 'Alt + P',
            keywords: 'timer pomodoro dong ho dem nguoc bam gio',
            action: () => toggleCheckbox(showTimerCheckbox, 'Đồng hồ đếm ngược')
        },
        {
            id: 'toggle-quotes',
            title: 'Bật/Tắt: Trích dẫn',
            desc: 'Hiện hoặc ẩn widget câu trích dẫn hàng ngày',
            icon: '<i class="fa-solid fa-quote-left"></i>',
            shortcut: 'Alt + Q',
            keywords: 'quote quotes trich dan cau noi',
            action: () => toggleCheckbox(showQuotesCheckbox, 'Trích dẫn')
        },
        {
            id: 'toggle-notepad',
            title: 'Bật/Tắt: Ghi chú',
            desc: 'Hiện hoặc ẩn widget Notepad',
            icon: '<i class="fa-solid fa-note-sticky"></i>',
            shortcut: 'Alt + N',
            keywords: 'note notepad ghi chu so tay',
            action: () => toggleCheckbox(showNotepadCheckbox, 'Ghi chú')
        },
        {
            id: 'toggle-searchbar',
            title: 'Bật/Tắt: Thanh tìm kiếm',
            desc: 'Hiện hoặc ẩn thanh tìm kiếm trên trang',
            icon: '<i class="fa-solid fa-magnifying-glass"></i>',
            shortcut: 'Alt + F',
            keywords: 'search find tim kiem thanh tim kiem',
            action: () => toggleCheckbox(showSearchBarCheckbox, 'Thanh tìm kiếm')
        },
        {
            id: 'open-settings',
            title: 'Mở/Đóng Cài đặt',
            desc: 'Mở hoặc đóng thanh cài đặt bên phải',
            icon: '<i class="fa-solid fa-gear"></i>',
            shortcut: 'Alt + S',
            keywords: 'settings setting cai dat sidebar tuy chinh',
            action: () => settingsToggle && settingsToggle.click()
        },
        {
            id: 'focus-search',
            title: 'Focus thanh tìm kiếm',
            desc: 'Đặt con trỏ vào ô tìm kiếm để gõ ngay',
            icon: '<i class="fa-solid fa-keyboard"></i>',
            shortcut: '/',
            keywords: 'focus search tim kiem gõ go input',
            action: () => { if (searchBarInput) { searchBarInput.focus(); searchBarInput.select(); } }
        },
        {
            id: 'cycle-bg-size',
            title: 'Hình nền: Đổi Fill / Fit / Custom',
            desc: 'Chuyển nhanh chế độ hiển thị hình nền',
            icon: '<i class="fa-solid fa-up-right-and-down-left-from-center"></i>',
            shortcut: 'W + S',
            keywords: 'background size bg fill fit cover contain custom hinh nen phong nen w s',
            action: () => cycleBgSize()
        },
        {
            id: 'hide-all',
            title: 'Ẩn/Hiện tất cả widget',
            desc: 'Ẩn hoặc hiện lại toàn bộ widget và tiện ích trên màn hình',
            icon: '<i class="fa-solid fa-eye-slash"></i>',
            shortcut: 'Alt + H',
            keywords: 'hide all show all an hien tat ca widget reset restore',
            action: () => toggleHideAll()
        },

        // --- Các lệnh tiện ích khác ---
        {
            id: 'toggle-bookmarks',
            title: 'Bật/Tắt: Bookmarks',
            desc: 'Hiện hoặc ẩn widget bookmark',
            icon: '<i class="fa-solid fa-bookmark"></i>',
            shortcut: 'Alt + B',
            keywords: 'bookmark bookmarks dau trang lien ket shortcut',
            action: () => toggleCheckbox(showBookmarksCheckbox, 'Bookmarks')
        },
        {
            id: 'toggle-bookmark-groups',
            title: 'Bật/Tắt: Nhóm Bookmarks',
            desc: 'Hiện hoặc ẩn các nhóm bookmark',
            icon: '<i class="fa-solid fa-folder-bookmark"></i>',
            shortcut: 'Alt + G',
            keywords: 'folder group bookmark nhom thu muc',
            action: () => toggleCheckbox(showBookmarkGroupsCheckbox, 'Nhóm Bookmarks')
        },
        {
            id: 'toggle-gregorian',
            title: 'Bật/Tắt: Lịch ngày',
            desc: 'Hiện hoặc ẩn ngày dương lịch bên dưới đồng hồ',
            icon: '<i class="fa-solid fa-calendar-check"></i>',
            shortcut: '',
            keywords: 'gregorian date ngay duong lich date',
            action: () => toggleCheckbox(showGregorianCheckbox, 'Lịch ngày')
        },
        {
            id: 'toggle-google-apps',
            title: 'Bật/Tắt: Google Apps',
            desc: 'Hiện hoặc ẩn cụm tiện ích Google ở góc phải',
            icon: '<i class="fa-brands fa-google"></i>',
            shortcut: 'Alt + A',
            keywords: 'google apps ung dung goc phai top right',
            action: () => toggleCheckbox(showTopRightControlsCheckbox, 'Google Apps')
        },
        {
            id: 'open-layout-controls',
            title: 'Mở/Đóng Layout nhanh',
            desc: 'Mở hoặc đóng bảng điều chỉnh layout cạnh quick access',
            icon: '<i class="fa-solid fa-sliders"></i>',
            shortcut: 'Alt + L',
            keywords: 'layout quick access popup bang dieu chinh',
            action: () => layoutControlsBtn && layoutControlsBtn.click()
        },
        {
            id: 'bg-cover',
            title: 'Hình nền: Fill (Bao phủ)',
            desc: 'Chỉnh kích thước hình nền vừa vặn toàn màn hình',
            icon: '<i class="fa-solid fa-expand"></i>',
            shortcut: '',
            keywords: 'background bg cover fill hinh nen',
            action: () => setBgSize('cover')
        },
        {
            id: 'bg-contain',
            title: 'Hình nền: Fit (Vừa vặn)',
            desc: 'Hiển thị toàn bộ hình nền không bị cắt',
            icon: '<i class="fa-solid fa-compress"></i>',
            shortcut: '',
            keywords: 'background bg contain fit hinh nen',
            action: () => setBgSize('contain')
        },
    ];

    let filteredCommands = [...commands];

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

    function cycleBgSize() {
        const bgSizeSelect = document.getElementById('bg-size-select');
        if (!bgSizeSelect) return;
        const sizes = ['cover', 'contain', 'custom'];
        const currentIdx = sizes.indexOf(bgSizeSelect.value);
        const nextSize = sizes[(currentIdx + 1) % sizes.length];
        setBgSize(nextSize);
    }

    function toggleClock(showUndo = false) {
        const clockDisplaySelect = document.getElementById('clock-display-select');
        if (clockDisplaySelect) {
            const prev = clockDisplaySelect.value;
            clockDisplaySelect.value = prev === 'hide' ? 'all' : 'hide';
            clockDisplaySelect.dispatchEvent(new Event('change', { bubbles: true }));
            if (showUndo) {
                const stateText = clockDisplaySelect.value === 'hide' ? 'Đã tắt' : 'Đã bật';
                showToast(`${stateText}: Đồng hồ`, {
                    undoFn: () => {
                        clockDisplaySelect.value = prev;
                        clockDisplaySelect.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            }
        }
    }

    const HIDE_ALL_STATE_KEY = 'commandPaletteHideAllState';
    const loadHideAllState = () => {
        try {
            return JSON.parse(localStorage.getItem(HIDE_ALL_STATE_KEY) || 'null') || {};
        } catch (e) {
            return {};
        }
    };
    const saveHideAllState = (state) => {
        try {
            localStorage.setItem(HIDE_ALL_STATE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Could not save hide-all state', e);
        }
    };
    const clearHideAllState = () => {
        try {
            localStorage.removeItem(HIDE_ALL_STATE_KEY);
        } catch (e) {
            console.warn('Could not clear hide-all state', e);
        }
    };

    // Track hide-all state
    let hiddenState = loadHideAllState();
    let allHidden = hiddenState.active === true;

    function toggleHideAll() {
        if (!allHidden) {
            // Save current state and hide everything
            hiddenState = {
                clock: document.getElementById('clock-display-select')?.value,
                music: showMusicCheckbox?.checked,
                calendar: showFullCalendarCheckbox?.checked,
                todo: showTodoCheckbox?.checked,
                timer: showTimerCheckbox?.checked,
                quotes: showQuotesCheckbox?.checked,
                notepad: showNotepadCheckbox?.checked,
                gregorian: showGregorianCheckbox?.checked,
                searchbar: showSearchBarCheckbox?.checked,
                bookmarks: showBookmarksCheckbox?.checked,
                bookmarkGroups: showBookmarkGroupsCheckbox?.checked,
                topRightControls: showTopRightControlsCheckbox?.checked,
            };
            saveHideAllState({ ...hiddenState, active: true });
            const clockDisplaySelect = document.getElementById('clock-display-select');
            if (clockDisplaySelect && clockDisplaySelect.value !== 'hide') toggleClock();
            setCheckboxState(showMusicCheckbox, false);
            setCheckboxState(showFullCalendarCheckbox, false);
            setCheckboxState(showTodoCheckbox, false);
            setCheckboxState(showTimerCheckbox, false);
            setCheckboxState(showQuotesCheckbox, false);
            setCheckboxState(showNotepadCheckbox, false);
            setCheckboxState(showGregorianCheckbox, false);
            setCheckboxState(showSearchBarCheckbox, false);
            setCheckboxState(showBookmarksCheckbox, false);
            setCheckboxState(showBookmarkGroupsCheckbox, false);
            setCheckboxState(showTopRightControlsCheckbox, false);
            // Hide Google Apps dropdown
            const googleAppsDropdown = document.getElementById('g-apps-dropdown');
            if (googleAppsDropdown) googleAppsDropdown.style.display = 'none';
            allHidden = true;
            showToast('Đã ẩn tất cả widget', {
                undoFn: () => toggleHideAll()
            });
        } else {
            // Restore previous state
            if (!hiddenState || Object.keys(hiddenState).length === 0) {
                hiddenState = loadHideAllState();
            }
            const clockDisplaySelect = document.getElementById('clock-display-select');
            if (clockDisplaySelect && hiddenState.clock && hiddenState.clock !== 'hide') {
                clockDisplaySelect.value = hiddenState.clock;
                clockDisplaySelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
            setCheckboxState(showMusicCheckbox, !!hiddenState.music);
            setCheckboxState(showFullCalendarCheckbox, !!hiddenState.calendar);
            setCheckboxState(showTodoCheckbox, !!hiddenState.todo);
            setCheckboxState(showTimerCheckbox, !!hiddenState.timer);
            setCheckboxState(showQuotesCheckbox, !!hiddenState.quotes);
            setCheckboxState(showNotepadCheckbox, !!hiddenState.notepad);
            setCheckboxState(showGregorianCheckbox, !!hiddenState.gregorian);
            setCheckboxState(showSearchBarCheckbox, !!hiddenState.searchbar);
            setCheckboxState(showBookmarksCheckbox, !!hiddenState.bookmarks);
            setCheckboxState(showBookmarkGroupsCheckbox, !!hiddenState.bookmarkGroups);
            setCheckboxState(showTopRightControlsCheckbox, !!hiddenState.topRightControls);
            // Restore Google Apps dropdown
            const googleAppsDropdown = document.getElementById('g-apps-dropdown');
            if (googleAppsDropdown) googleAppsDropdown.style.display = '';
            allHidden = false;
            hiddenState = {};
            clearHideAllState();
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
        const query = normalizeText(e.target.value);
        filteredCommands = commands.filter(c => 
            normalizeText(`${c.title} ${c.desc} ${c.shortcut || ''} ${c.keywords || ''}`).includes(query)
        );
        selectedIndex = 0;
        renderList();
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filteredCommands.length === 0) return;
            selectedIndex = (selectedIndex + 1) % filteredCommands.length;
            renderList();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredCommands.length === 0) return;
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
        if (e.altKey && !isTypingTarget()) {
            const key = e.key.toLowerCase();
            if (key === 'c') { e.preventDefault(); toggleClock(true); }
            if (key === 'm') { e.preventDefault(); toggleCheckbox(showMusicCheckbox, 'Trình phát nhạc'); }
            if (key === 'd') { e.preventDefault(); toggleCheckbox(showFullCalendarCheckbox, 'Lịch'); }
            if (key === 't') { e.preventDefault(); toggleCheckbox(showTodoCheckbox, 'Danh sách việc cần làm'); }
            if (key === 'p') { e.preventDefault(); toggleCheckbox(showTimerCheckbox, 'Đồng hồ đếm ngược'); }
            if (key === 'q') { e.preventDefault(); toggleCheckbox(showQuotesCheckbox, 'Trích dẫn'); }
            if (key === 'n') { e.preventDefault(); toggleCheckbox(showNotepadCheckbox, 'Ghi chú'); }
            if (key === 'f') { e.preventDefault(); toggleCheckbox(showSearchBarCheckbox, 'Thanh tìm kiếm'); }
            if (key === 'b') { e.preventDefault(); toggleCheckbox(showBookmarksCheckbox, 'Bookmarks'); }
            if (key === 'g') { e.preventDefault(); toggleCheckbox(showBookmarkGroupsCheckbox, 'Nhóm Bookmarks'); }
            if (key === 'a') { e.preventDefault(); toggleCheckbox(showTopRightControlsCheckbox, 'Google Apps'); }
            if (key === 'l') { e.preventDefault(); if (layoutControlsBtn) layoutControlsBtn.click(); }
            if (key === 's') { e.preventDefault(); if (settingsToggle) settingsToggle.click(); }
            if (key === 'h') { e.preventDefault(); toggleHideAll(); }
        }
        
        // Focus search bar (/)
        if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key === '/' && !isTypingTarget()) {
            e.preventDefault();
            if (searchBarInput) { searchBarInput.focus(); searchBarInput.select(); }
        }

        // Change background size (W + S)
        if (keysPressed.has('w') && keysPressed.has('s') && !bgSizeChordActive && !isTypingTarget()) {
            e.preventDefault();
            bgSizeChordActive = true;
            cycleBgSize();
            keysPressed.delete('s');
        }
    }, true);

    window.addEventListener('keyup', (e) => {
        keysPressed.delete(e.key.toLowerCase());
        if (e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 's') {
            bgSizeChordActive = false;
        }
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
