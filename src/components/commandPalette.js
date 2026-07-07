// src/components/commandPalette.js
import { showToast } from '../utils/toast.js';
import {
    showFullCalendarCheckbox,
    showMusicCheckbox,
    showTodoCheckbox,
    showTimerCheckbox,
    showQuotesCheckbox,
    showNotepadCheckbox,
    showWeatherCheckbox,
    showSearchBarCheckbox,
    showBookmarksCheckbox,
    showBookmarkGroupsCheckbox,
    showGregorianCheckbox,
    showTopRightControlsCheckbox,
    layoutControlsBtn,
    settingsToggle,
    searchInput as searchBarInput,
} from '../utils/dom.js';
import { geti18n } from '../services/i18n.js';

let commandPaletteController = null;

export function initCommandPalette(options = {}) {
    if (commandPaletteController) {
        if (options.openOnInit) commandPaletteController.show();
        return commandPaletteController;
    }

    const modal = document.getElementById('command-palette-modal');
    const searchInput = document.getElementById('command-palette-search');
    const listContainer = document.getElementById('command-palette-list');
    const closeBtn = document.getElementById('close-command-palette-btn');
    const tooltip = document.getElementById('command-palette-tooltip');
    const closeTooltipBtn = document.getElementById('close-cp-tooltip');
    const sidebarBtn = document.getElementById('sidebar-hotkeys-btn');

    if (!modal || !searchInput || !listContainer) return null;

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

    const setCheckboxState = (checkbox, nextState, labelKey = '') => {
        if (!checkbox) return false;
        const prevState = checkbox.checked;
        if (prevState === nextState) return false;
        checkbox.checked = nextState;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        if (labelKey) {
            const i18n = geti18n();
            const stateText = checkbox.checked 
                ? (i18n.state_enabled || 'Enabled') 
                : (i18n.state_disabled || 'Disabled');
            const labelText = i18n[labelKey] || labelKey;
            showToast(`${stateText}: ${labelText}`, {
                undoFn: () => setCheckboxState(checkbox, prevState)
            });
        }
        return true;
    };

    const toggleCheckbox = (checkbox, labelKey) =>
        setCheckboxState(checkbox, !checkbox?.checked, labelKey);

    const SHORTCUTS_KEY = 'startpageCommandShortcuts';
    const loadCustomShortcuts = () => {
        try {
            return JSON.parse(localStorage.getItem(SHORTCUTS_KEY) || '{}') || {};
        } catch (e) {
            return {};
        }
    };
    const saveCustomShortcuts = (value) => {
        try {
            localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(value));
        } catch (e) {
            console.warn('Could not save command shortcuts', e);
        }
    };
    const formatKeyName = (key) => {
        if (!key) return '';
        if (key === ' ') return 'Space';
        if (key === 'Escape') return 'Esc';
        if (key.length === 1) return key.toUpperCase();
        return key.replace(/^Arrow/, '');
    };
    const eventToShortcut = (e) => {
        const key = formatKeyName(e.key);
        if (!key || ['Alt', 'Control', 'Ctrl', 'Shift', 'Meta'].includes(key)) return '';
        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Meta');
        parts.push(key);
        return parts.join(' + ');
    };
    const normalizeShortcut = (value = '') =>
        String(value)
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace('control+', 'ctrl+');
    const shortcutMatchesEvent = (shortcut, e) => {
        if (!shortcut || normalizeShortcut(shortcut) === 'w+s') return false;
        return normalizeShortcut(shortcut) === normalizeShortcut(eventToShortcut(e));
    };
    
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
            action: () => toggleCheckbox(showMusicCheckbox, 'widget_music')
        },
        {
            id: 'toggle-calendar',
            title: 'Bật/Tắt: Lịch',
            desc: 'Hiện hoặc ẩn widget lịch',
            icon: '<i class="fa-solid fa-calendar"></i>',
            shortcut: 'Alt + D',
            keywords: 'calendar lich ngay thang',
            action: () => toggleCheckbox(showFullCalendarCheckbox, 'widget_calendar')
        },
        {
            id: 'toggle-todo',
            title: 'Bật/Tắt: Danh sách việc cần làm',
            desc: 'Hiện hoặc ẩn widget Todo',
            icon: '<i class="fa-solid fa-list-check"></i>',
            shortcut: 'Alt + T',
            keywords: 'todo task viec can lam cong viec',
            action: () => toggleCheckbox(showTodoCheckbox, 'widget_todo')
        },
        {
            id: 'toggle-timer',
            title: 'Bật/Tắt: Đồng hồ đếm ngược',
            desc: 'Hiện hoặc ẩn widget Timer / Pomodoro',
            icon: '<i class="fa-solid fa-hourglass-half"></i>',
            shortcut: 'Alt + P',
            keywords: 'timer pomodoro dong ho dem nguoc bam gio',
            action: () => toggleCheckbox(showTimerCheckbox, 'widget_timer')
        },
        {
            id: 'toggle-quotes',
            title: 'Bật/Tắt: Trích dẫn',
            desc: 'Hiện hoặc ẩn widget câu trích dẫn hàng ngày',
            icon: '<i class="fa-solid fa-quote-left"></i>',
            shortcut: 'Alt + Q',
            keywords: 'quote quotes trich dan cau noi',
            action: () => toggleCheckbox(showQuotesCheckbox, 'widget_quotes')
        },
        {
            id: 'toggle-notepad',
            title: 'Bật/Tắt: Ghi chú',
            desc: 'Hiện hoặc ẩn widget Notepad',
            icon: '<i class="fa-solid fa-note-sticky"></i>',
            shortcut: 'Alt + N',
            keywords: 'note notepad ghi chu so tay',
            action: () => toggleCheckbox(showNotepadCheckbox, 'widget_notepad')
        },
        {
            id: 'toggle-weather',
            title: 'Bật/Tắt: Thời tiết',
            desc: 'Hiện hoặc ẩn widget thời tiết',
            icon: '<i class="fa-solid fa-cloud-sun"></i>',
            shortcut: 'Alt + W',
            keywords: 'weather thoi tiet du bao nhiet do forecast',
            action: () => toggleCheckbox(showWeatherCheckbox, 'widget_weather')
        },
        {
            id: 'toggle-searchbar',
            title: 'Bật/Tắt: Thanh tìm kiếm',
            desc: 'Hiện hoặc ẩn thanh tìm kiếm trên trang',
            icon: '<i class="fa-solid fa-magnifying-glass"></i>',
            shortcut: 'Alt + F',
            keywords: 'search find tim kiem thanh tim kiem',
            action: () => toggleCheckbox(showSearchBarCheckbox, 'widget_searchbar')
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
        {
            id: 'open-terminal',
            title: 'Mở/Đóng Terminal',
            desc: 'Mở Terminal ẩn của Startpage',
            icon: '<i class="fa-solid fa-terminal"></i>',
            shortcut: '`',
            keywords: 'terminal cmd command line console shell hacker',
            action: () => {
                const termInput = document.getElementById('terminal-input');
                if (termInput) {
                    const evt = new KeyboardEvent('keydown', { key: '`' });
                    window.dispatchEvent(evt);
                }
            }
        },
        {
            id: 'toggle-performance',
            title: 'Bật/Tắt: Performance HUD',
            desc: 'Mở bảng theo dõi hiệu năng hệ thống (RAM, FPS)',
            icon: '<i class="fa-solid fa-microchip"></i>',
            shortcut: 'Ctrl + Alt + P',
            keywords: 'performance hud ram cpu fps hieu nang test',
            action: () => {
                if (window.perfHUD) window.perfHUD.toggle();
            }
        },

        // --- Các lệnh tiện ích khác ---
        {
            id: 'toggle-bookmarks',
            title: 'Bật/Tắt: Bookmarks',
            desc: 'Hiện hoặc ẩn widget bookmark',
            icon: '<i class="fa-solid fa-bookmark"></i>',
            shortcut: 'Alt + B',
            keywords: 'bookmark bookmarks dau trang lien ket shortcut',
            action: () => toggleCheckbox(showBookmarksCheckbox, 'widget_bookmarks')
        },
        {
            id: 'toggle-bookmark-groups',
            title: 'Bật/Tắt: Nhóm Bookmarks',
            desc: 'Hiện hoặc ẩn các nhóm bookmark',
            icon: '<i class="fas fa-bookmark"></i>',
            shortcut: 'Alt + J',
            keywords: 'folder group bookmark nhom thu muc',
            action: () => toggleCheckbox(showBookmarkGroupsCheckbox, 'widget_bookmark_groups')
        },
        {
            id: 'toggle-gregorian',
            title: 'Bật/Tắt: Lịch ngày',
            desc: 'Hiện hoặc ẩn ngày dương lịch bên dưới đồng hồ',
            icon: '<i class="fa-solid fa-calendar-check"></i>',
            shortcut: '',
            keywords: 'gregorian date ngay duong lich date',
            action: () => toggleCheckbox(showGregorianCheckbox, 'widget_gregorian')
        },
        {
            id: 'toggle-google-apps',
            title: 'Bật/Tắt: Google Apps',
            desc: 'Hiện hoặc ẩn cụm tiện ích Google ở góc phải',
            icon: '<i class="fa-brands fa-google"></i>',
            shortcut: 'Alt + A',
            keywords: 'google apps ung dung goc phai top right',
            action: () => toggleCheckbox(showTopRightControlsCheckbox, 'widget_google_apps')
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
            shortcutHint: 'W + S',
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

    const translateCommands = () => {
        const i18n = geti18n();
        commands.forEach((cmd) => {
            const normalizedId = cmd.id.replace(/-/g, '_');
            const titleKey = `cmd_${normalizedId}_title`;
            const descKey = `cmd_${normalizedId}_desc`;
            const keywordsKey = `cmd_${normalizedId}_keywords`;
            if (i18n[titleKey]) cmd.title = i18n[titleKey];
            if (i18n[descKey]) cmd.desc = i18n[descKey];
            if (i18n[keywordsKey]) cmd.keywords = i18n[keywordsKey];
        });
    };
    translateCommands();

    const customShortcuts = loadCustomShortcuts();
    const FALLBACK_SHORTCUTS = {
        'cycle-bg-size': 'W + S'
    };
    let shortcutCaptureCommand = null;
    commands.forEach((cmd) => {
        cmd.defaultShortcut = cmd.shortcut || '';
        if (Object.prototype.hasOwnProperty.call(customShortcuts, cmd.id)) {
            cmd.shortcut = customShortcuts[cmd.id] || FALLBACK_SHORTCUTS[cmd.id] || '';
        }
    });

    let filteredCommands = [...commands];

    function setBgSize(size) {
        const bgSizeSelect = document.getElementById('bg-size-select');
        if (bgSizeSelect) {
            const prev = bgSizeSelect.value;
            bgSizeSelect.value = size;
            bgSizeSelect.dispatchEvent(new Event('change'));
            
            const i18n = geti18n();
            let labelText = size;
            if (size === 'cover') labelText = i18n.bg_cover || 'Fill (Cover)';
            else if (size === 'contain') labelText = i18n.bg_contain || 'Fit (Contain)';
            else if (size === 'custom') labelText = i18n.bg_custom || 'Custom';
            
            const toastPrefix = i18n.bg_size_label || 'Background size: ';
            showToast(`${toastPrefix}${labelText}`, {
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
                const i18n = geti18n();
                const stateText = clockDisplaySelect.value === 'hide' 
                    ? (i18n.state_disabled || 'Disabled') 
                    : (i18n.state_enabled || 'Enabled');
                const labelText = i18n.widget_clock || 'Clock';
                showToast(`${stateText}: ${labelText}`, {
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
                weather: showWeatherCheckbox?.checked,
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
            setCheckboxState(showWeatherCheckbox, false);
            setCheckboxState(showGregorianCheckbox, false);
            setCheckboxState(showSearchBarCheckbox, false);
            setCheckboxState(showBookmarksCheckbox, false);
            setCheckboxState(showBookmarkGroupsCheckbox, false);
            setCheckboxState(showTopRightControlsCheckbox, false);
            // Hide Google Apps dropdown
            const googleAppsDropdown = document.getElementById('g-apps-dropdown');
            if (googleAppsDropdown) googleAppsDropdown.style.display = 'none';
            allHidden = true;
            const i18n = geti18n();
            showToast(i18n.toast_hide_all || 'All widgets hidden', {
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
            setCheckboxState(showWeatherCheckbox, !!hiddenState.weather);
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
            const i18n = geti18n();
            showToast(i18n.toast_show_all || 'All widgets restored');
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
        const i18n = geti18n();
        listContainer.innerHTML = '';
        if (filteredCommands.length === 0) {
            const noResultsText = i18n.cmd_no_results || 'No commands found';
            listContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #888;">${noResultsText}</div>`;
            return;
        }

        filteredCommands.forEach((cmd, index) => {
            const item = document.createElement('div');
            item.className = `cp-item ${index === selectedIndex ? 'active' : ''}`;
            item.onclick = (event) => {
                if (event.target.closest('.cp-shortcut-edit')) return;
                cmd.action();
                hide();
            };

            let shortcutHtml = '';
            if (cmd.shortcut || cmd.shortcutHint) {
                const shortcutText = cmd.shortcut || cmd.shortcutHint;
                const keys = shortcutText.split('+').map(k => `<kbd>${k.trim()}</kbd>`).join(' + ');
                shortcutHtml = `<div class="cp-item-shortcut">${keys}</div>`;
            } else {
                const notAssignedText = i18n.cmd_not_assigned || 'Not assigned';
                shortcutHtml = `<div class="cp-item-shortcut muted">${notAssignedText}</div>`;
            }

            const editTitleText = i18n.cmd_edit_shortcut || 'Edit shortcut';
            item.innerHTML = `
                <div class="cp-item-icon">${cmd.icon}</div>
                <div class="cp-item-content">
                    <div class="cp-item-title">${cmd.title}</div>
                    <div class="cp-item-desc">${cmd.desc}</div>
                </div>
                ${shortcutHtml}
                <button type="button" class="cp-shortcut-edit" data-command-id="${cmd.id}" title="${editTitleText}">
                    <i class="fa-solid fa-pen"></i>
                </button>
            `;
            listContainer.appendChild(item);
        });

        listContainer.querySelectorAll('.cp-shortcut-edit').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const id = button.dataset.commandId;
                shortcutCaptureCommand = commands.find((cmd) => cmd.id === id) || null;
                if (!shortcutCaptureCommand) return;
                button.innerHTML = '<i class="fa-solid fa-keyboard"></i>';
                button.classList.add('listening');
                showToast(i18n.cmd_listening_toast || 'Press new shortcut combination. Esc to cancel, Backspace to unassign.');
            });
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
        shortcutCaptureCommand = null;
        selectedIndex = 0;
        renderList();
        setTimeout(() => searchInput.focus(), 50);
    }

    function hide() {
        if (!isVisible) return;
        isVisible = false;
        modal.classList.remove('open');
    }

    commandPaletteController = { show, hide };

    // Event Listeners
    searchInput.addEventListener('input', (e) => {
        const query = normalizeText(e.target.value);
        filteredCommands = commands.filter(c => 
            normalizeText(`${c.title} ${c.desc} ${c.shortcut || c.shortcutHint || ''} ${c.keywords || ''}`).includes(query)
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

        if (shortcutCaptureCommand) {
            e.preventDefault();
            e.stopPropagation();
            const i18n = geti18n();
            if (e.key === 'Escape') {
                shortcutCaptureCommand = null;
                renderList();
                showToast(i18n.cmd_edit_cancelled || 'Shortcut change cancelled');
                return;
            }

            const isClearKey = e.key === 'Backspace' || e.key === 'Delete';
            const shortcut = isClearKey ? '' : eventToShortcut(e);
            if (!shortcut && !isClearKey) return;
            if (shortcut && normalizeShortcut(shortcut) === 'ctrl+k') {
                showToast(i18n.cmd_ctrl_k_reserved || 'Ctrl + K is reserved to open the Command Palette');
                return;
            }
            const duplicate = shortcut && commands.find(
                (cmd) => cmd.id !== shortcutCaptureCommand.id && normalizeShortcut(cmd.shortcut) === normalizeShortcut(shortcut)
            );
            if (duplicate) {
                const dupMsg = (i18n.cmd_duplicate_error || 'This key is already used for: {title}').replace('{title}', duplicate.title);
                showToast(dupMsg);
                return;
            }

            const fallbackShortcut = FALLBACK_SHORTCUTS[shortcutCaptureCommand.id] || '';
            shortcutCaptureCommand.shortcut = shortcut || fallbackShortcut;
            if (shortcut) {
                customShortcuts[shortcutCaptureCommand.id] = shortcut;
            } else if (fallbackShortcut) {
                delete customShortcuts[shortcutCaptureCommand.id];
            } else {
                customShortcuts[shortcutCaptureCommand.id] = '';
            }
            saveCustomShortcuts(customShortcuts);
            const label = shortcutCaptureCommand.shortcut || (i18n.cmd_unassigned || 'unassigned');
            const updatedMsg = (i18n.cmd_updated_toast || 'Updated shortcut: {title} ({shortcut})')
                .replace('{title}', shortcutCaptureCommand.title)
                .replace('{shortcut}', label);
            showToast(updatedMsg);
            shortcutCaptureCommand = null;
            filteredCommands = commands.filter(c =>
                normalizeText(`${c.title} ${c.desc} ${c.shortcut || c.shortcutHint || ''} ${c.keywords || ''}`).includes(normalizeText(searchInput.value))
            );
            renderList();
            return;
        }

        // Ctrl + K to open Command Palette
        if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
            e.preventDefault();
            e.stopPropagation();
            if (isVisible) hide(); else show();
            return;
        }

        const directCommand = !isTypingTarget()
            ? commands.find((cmd) => shortcutMatchesEvent(cmd.shortcut, e))
            : null;
        if (directCommand) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            directCommand.action();
            return;
        }

        // Change background size (W + S)
        const bgSizeCommand = commands.find((cmd) => cmd.id === 'cycle-bg-size');
        if (
            normalizeShortcut(bgSizeCommand?.shortcut) === 'w+s' &&
            keysPressed.has('w') &&
            keysPressed.has('s') &&
            !bgSizeChordActive &&
            !isTypingTarget()
        ) {
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

    window.addEventListener('startpage:languageChanged', () => {
        translateCommands();
        if (isVisible) {
            filteredCommands = commands.filter(c =>
                normalizeText(`${c.title} ${c.desc} ${c.shortcut || c.shortcutHint || ''} ${c.keywords || ''}`).includes(normalizeText(searchInput.value))
            );
            renderList();
        } else {
            filteredCommands = [...commands];
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

    if (options.openOnInit) show();

    return commandPaletteController;
}
