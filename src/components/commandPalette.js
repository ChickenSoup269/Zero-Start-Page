// src/components/commandPalette.js
import { showFullCalendarCheckbox, showMusicCheckbox } from '../utils/dom.js';

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
    
    // Command definitions
    const commands = [
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
        {
            id: 'toggle-clock',
            title: 'Bật/Tắt: Đồng hồ',
            desc: 'Hiện hoặc ẩn đồng hồ trên màn hình',
            icon: '<i class="fa-solid fa-clock"></i>',
            shortcut: 'Alt + C',
            action: () => toggleClock()
        },
        {
            id: 'toggle-music',
            title: 'Bật/Tắt: Trình phát nhạc',
            desc: 'Hiện hoặc ẩn widget âm nhạc',
            icon: '<i class="fa-solid fa-music"></i>',
            shortcut: 'Alt + M',
            action: () => toggleCheckbox(showMusicCheckbox)
        },
        {
            id: 'toggle-calendar',
            title: 'Bật/Tắt: Lịch',
            desc: 'Hiện hoặc ẩn widget lịch',
            icon: '<i class="fa-solid fa-calendar"></i>',
            shortcut: 'Alt + D',
            action: () => toggleCheckbox(showFullCalendarCheckbox)
        },
        {
            id: 'effect-snow',
            title: 'Hiệu ứng: Tuyết rơi',
            desc: 'Bật hiệu ứng tuyết rơi trên màn hình',
            icon: '<i class="fa-regular fa-snowflake"></i>',
            shortcut: '',
            action: () => toggleEffect('snow')
        },
        {
            id: 'effect-rain',
            title: 'Hiệu ứng: Mưa rơi',
            desc: 'Bật hiệu ứng mưa trên màn hình',
            icon: '<i class="fa-solid fa-cloud-rain"></i>',
            shortcut: '',
            action: () => toggleEffect('rain')
        },
        {
            id: 'effect-pixel-weather',
            title: 'Hiệu ứng: Thời tiết Pixel',
            desc: 'Bật hiệu ứng thời tiết dạng pixel',
            icon: '<i class="fa-solid fa-cloud-sun"></i>',
            shortcut: '',
            action: () => toggleEffect('pixelWeather')
        },
        {
            id: 'effect-none',
            title: 'Tắt hiệu ứng',
            desc: 'Tắt tất cả hiệu ứng động',
            icon: '<i class="fa-solid fa-ban"></i>',
            shortcut: '',
            action: () => toggleEffect('none')
        }
    ];

    let filteredCommands = [...commands];

    function toggleCheckbox(checkbox) {
        if (!checkbox) return;
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
    }

    function setBgSize(size) {
        const bgSizeSelect = document.getElementById('bg-size-select');
        if (bgSizeSelect) {
            bgSizeSelect.value = size;
            bgSizeSelect.dispatchEvent(new Event('change'));
        }
    }

    function toggleClock() {
        const clockDisplaySelect = document.getElementById('clock-display-select');
        if (clockDisplaySelect) {
            const current = clockDisplaySelect.value;
            clockDisplaySelect.value = current === 'hide' ? 'all' : 'hide';
            clockDisplaySelect.dispatchEvent(new Event('change'));
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
            if (key === 'c') { e.preventDefault(); toggleClock(); }
            if (key === 'm') { e.preventDefault(); toggleCheckbox(showMusicCheckbox); }
            if (key === 'd') { e.preventDefault(); toggleCheckbox(showFullCalendarCheckbox); }
        }
        
        // Hide all widgets (H)
        if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === 'h' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            const clockDisplaySelect = document.getElementById('clock-display-select');
            if (clockDisplaySelect && clockDisplaySelect.value !== 'hide') toggleClock();
            if (showMusicCheckbox && showMusicCheckbox.checked) toggleCheckbox(showMusicCheckbox);
            if (showFullCalendarCheckbox && showFullCalendarCheckbox.checked) toggleCheckbox(showFullCalendarCheckbox);
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
