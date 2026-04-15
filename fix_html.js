const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

c = c.replace(/<div class="setting-group">\s*<p class="setting-hint" data-i18n="settings_bookmark_item_hint"[\s\S]*?<\/p>/, 
`<div class="setting-group" style="margin-bottom: 15px;">
                        <h4 style="margin-bottom: 15px; opacity: 0.9; display: flex; align-items: center; gap: 6px;"><i class="fa-solid fa-ruler-combined"></i> <span data-i18n="settings_bookmark_size_header">Sizes & Spacing</span></h4>
                        <p class="setting-hint" data-i18n="settings_bookmark_item_hint"
                            style="font-size: 0.85em; opacity: 0.7; margin-bottom: 15px; font-style: italic; line-height: 1.4; color: var(--text-color);">
                            = Tùy chỉnh giao diện cho từng ô Dấu trang (màu chữ, nền, bóng đổ, kích thước...).</p>`);

c = c.replace(/<p class="setting-hint" data-i18n="settings_bookmark_group_hint"[\s\S]*?<\/p>/, 
`<p class="setting-hint" data-i18n="settings_bookmark_group_hint"
                            style="font-size: 0.85em; opacity: 0.7; margin-bottom: 15px; font-style: italic; line-height: 1.4; color: var(--text-color);">
                            = Tùy chỉnh thanh điều hướng nhóm thư mục (Tabs) ở phía trên Dấu trang.</p>`);

fs.writeFileSync('index.html', c);
