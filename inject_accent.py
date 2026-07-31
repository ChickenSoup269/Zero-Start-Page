import sys

def inject():
    with open('D:/Personal/Project/HTML-CSS-JS/exxtension-save-pass/Startpage/partials/settings/background.html', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    group_lines = lines[365:608] # 366 to 608
    extracted = "".join(group_lines)
    
    with open('D:/Personal/Project/HTML-CSS-JS/exxtension-save-pass/Startpage/index.html', 'r', encoding='utf-8') as f:
        index = f.read()
        
    new_section = f'''            <div class="settings-section" data-section-id="accent-color">
                <h3 class="section-toggle"><i class="fa-solid fa-palette"></i> <span data-i18n="settings_accent">Accent Color & M3</span></h3>
                <div class="section-content">
{extracted}
                </div>
            </div>
'''
    
    # We will insert it just before data-section-id="themes"
    target = '            <div class="settings-section" data-section-id="themes">'
    if target in index:
        index = index.replace(target, new_section + target)
        with open('D:/Personal/Project/HTML-CSS-JS/exxtension-save-pass/Startpage/index.html', 'w', encoding='utf-8') as f:
            f.write(index)
        print("Injected successfully")
    else:
        print("Target not found in index.html")

inject()
