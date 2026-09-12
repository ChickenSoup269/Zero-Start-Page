# 📘 QUY CHUẨN CODE (CODING STANDARDS) - ZERO STARTPAGE

Tài liệu này định nghĩa toàn bộ quy chuẩn lập trình, kiến trúc hệ thống, và phong cách viết code áp dụng cho toàn bộ dự án **Zero Startpage (Manifest V3)**. Mọi lập trình viên và cộng tác viên cần tuân thủ nghiêm ngặt các quy tắc này nhằm đảm bảo tính đồng nhất, hiệu năng cao (60 FPS), bảo mật và khả năng tương thích đa trình duyệt (Chrome, Edge, Brave, Firefox, v.v.).

---

## 1. TRIẾT LÝ PHÁT TRIỂN & NGUYÊN TẮC CỐT LÕI

1. **Local-First & Privacy-Centric**: 
   - Toàn bộ dữ liệu người dùng lưu trữ cục bộ (`chrome.storage.local`, `IndexedDB`).
   - Không tích hợp bất kỳ công cụ theo dõi (tracking), phân tích hành vi (analytics) hay gửi dữ liệu cá nhân ra máy chủ bên ngoài.
2. **Vanilla JavaScript Tối Giản & Hiệu Năng Cao**:
   - Không sử dụng các framework nặng (React, Vue, Angular).
   - Tối ưu tải trang ban đầu (Zero bundle delay, Instant New Tab).
3. **Trải Nghiệm Mượt Mà (60 FPS & Hardware Accelerated)**:
   - Mọi hoạt ảnh (animation, transition) phải ưu tiên xử lý trên GPU (`transform`, `opacity`, `filter`).
   - Tránh gây Layout Shift (CLS) và hạn chế tối đa Reflow/Repaint trong DOM.
4. **Tương Thích Đa Nền Tảng (Cross-Browser WebExtensions)**:
   - Tương thích tốt trên cả hệ sinh thái Chromium (Chrome, Edge, Brave, Opera, Cốc Cốc) và Gecko (Mozilla Firefox).

---

## 2. CẤU TRÚC THƯ MỤC DỰ ÁN

```text
├── _locales/                 # Bản dịch thông tin tiện ích mở rộng (WebExtension Store metadata)
├── firefox/                  # Cấu hình riêng cho Firefox (manifest.json Firefox MV3)
├── icon/                     # Logo, icon các kích thước (16, 48, 128, favicon)
├── locales/                  # Bản dịch giao diện ứng dụng (vi.json, en.json, de.json, sv.json)
├── partials/                 # HTML templates chia nhỏ nạp động qua fetch
│   ├── controls/             # Layout controls, quick popups, context menus
│   ├── modals/               # Các cửa sổ modal (Bookmarks, Todo, Notepad, Weather, Backup...)
│   └── settings/             # Các tab trong bảng Cài Đặt (Layout, Clock, Fonts, Themes...)
├── src/                      # Toàn bộ mã nguồn JavaScript ứng dụng
│   ├── boot/                 # Script khởi động sớm, điều phối nạp partials & quick access
│   ├── components/           # Các module chức năng độc lập (Clock, Search, Bookmarks, Player...)
│   │   ├── animations/       # Hiệu ứng nền canvas/WebGL/CSS (Leaves, Sakura, OceanFish...)
│   │   └── settings/         # Bộ xử lý giao diện cài đặt (EventHandlers, SettingsApplier...)
│   ├── data/                 # Cấu hình tĩnh, danh sách mặc định, update notes, guides
│   ├── services/             # Quản lý trạng thái, lưu trữ, sao lưu, i18n
│   └── utils/                # Tiện ích bổ trợ (DOM cache, Dialog, Toast, Color, Sanitize)
├── styles/                   # Hệ thống Style CSS
│   ├── animations/           # CSS keyframes hiệu ứng
│   ├── base.css              # Reset, typography, clock styles, global layout
│   ├── settings.css          # Giao diện modal cài đặt
│   ├── variables.css         # Biến màu, khoảng cách, font, design tokens
│   └── widgets.css           # Style chi tiết cho từng widget (Search, Todo, Weather, Player...)
├── background.js             # Service Worker / Background script điều phối tab, sync, media
├── content-media.js          # Content script lắng nghe trạng thái bài hát từ Youtube, Spotify...
├── index.html                # Khung xương HTML chính của Startpage
├── manifest.json             # Manifest V3 tiêu chuẩn Chromium
├── offscreen.html & .js      # Offscreen document xử lý bắt âm thanh (Chromium)
└── CODING_STANDARDS.md       # Quy chuẩn code này
```

---

## 3. QUY CHUẨN JAVASCRIPT (ES6+ ES MODULES)

### 3.1. Đặt tên (Naming Conventions)
- **Biến & Hàm**: Dùng `camelCase` (ví dụ: `handleAudioReactiveToggle`, `userSettings`, `isPlaying`).
- **Hằng số toàn cục (Constants)**: Dùng `UPPER_SNAKE_CASE` (ví dụ: `DEFAULT_CLOCK_SIZE`, `BUNDLED_LANGUAGES`).
- **Class / Constructor**: Dùng `PascalCase` (ví dụ: `FontManager`, `SoundMixer`).
- **File & Thư mục**: Dùng `camelCase.js` (ví dụ: `eventHandlers.js`, `themeManager.js`).

### 3.2. Quản lý trạng thái (State Management)
- **Không tự ý gán biến toàn cục trên `window`**: Mọi cài đặt người dùng phải quản lý tập trung thông qua `src/services/state.js`.
- Sử dụng các hàm getter/setter chuẩn:
  ```javascript
  import { getSettings, updateSetting, saveSettings } from "../services/state.js"

  // Đọc cài đặt
  const settings = getSettings()
  if (settings.musicPlayerEnabled) { ... }

  // Cập nhật cài đặt
  updateSetting("clockSize", 5.5)
  await saveSettings()
  ```

### 3.3. Tối ưu truy xuất DOM (DOM Caching Pattern)
- **Tuyệt đối tránh** gọi `document.getElementById` hoặc `querySelector` lặp lại liên tục bên trong các hàm chạy theo chu kỳ (như vòng lặp render đồng hồ, requestAnimationFrame, canvas loop).
- Mọi phần tử DOM tĩnh cần được đăng ký và cache tại [`src/utils/dom.js`](file:///d:/Personal/Project/HTML-CSS-JS/exxtension-save-pass/Startpage/src/utils/dom.js):
  ```javascript
  import * as DOM from "../utils/dom.js"

  if (DOM.showMusicCheckbox) {
    DOM.showMusicCheckbox.checked = true
  }
  ```

### 3.4. Kiến trúc hướng sự kiện (Event-Driven Communication)
- Giảm thiểu phụ thuộc chéo (tight coupling) giữa các component bằng cách bắn và lắng nghe `CustomEvent`:
  ```javascript
  // Bắn sự kiện thông báo cài đặt thay đổi
  window.dispatchEvent(
    new CustomEvent("settingsUpdated", {
      detail: { key: "musicRealAudioReactive", value: true }
    })
  )

  // Bắn sự kiện cập nhật bố cục
  window.dispatchEvent(
    new CustomEvent("layoutUpdated", {
      detail: { key: "showQuotes", value: false }
    })
  )
  ```

### 3.5. Xử lý Bất đồng bộ & Error Handling
- Ưu tiên sử dụng `async/await` thay vì chuỗi Promise `.then().catch()`.
- Các lệnh gọi Chrome API hoặc tải tài nguyên mạng luôn phải có khối `try...catch`:
  ```javascript
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
  } catch (err) {
    console.warn("[Weather Widget] Fetch error:", err)
  }
  ```
- Thống nhất prefix log trên console theo dạng `[TênComponent] Nội dung log` để dễ debug.

### 3.6. Chống rò rỉ bộ nhớ (Memory Leak Prevention)
- Bất kỳ module nào đăng ký `setInterval`, `requestAnimationFrame`, `addEventListener` hoặc `Observer` phải có hàm dọn dẹp (cleanup/destroy):
  ```javascript
  destroy() {
    if (this.timerId) clearInterval(this.timerId)
    if (this.resizeObserver) this.resizeObserver.disconnect()
    window.removeEventListener("resize", this._onResize)
  }
  ```

---

## 4. QUY CHUẨN CSS & DESIGN SYSTEM

### 4.1. Sử dụng Design Tokens & CSS Variables
- Toàn bộ giá trị màu sắc, bo góc, bóng mờ và khoảng cách phải sử dụng biến định nghĩa trong [`styles/variables.css`](file:///d:/Personal/Project/HTML-CSS-JS/exxtension-save-pass/Startpage/styles/variables.css):
  - **Khoảng cách**: `var(--space-1)` (8px), `var(--space-2)` (16px), `var(--space-3)` (24px), `var(--space-4)` (32px).
  - **Bo góc**: `var(--radius-sm)` (8px), `var(--radius-md)` (12px), `var(--radius-lg)` (16px), `var(--radius-full)` (9999px).
  - **Màu nền kính (Glassmorphism)**: `var(--glass-bg)`, `var(--glass-border)`, `var(--glass-shadow)`.
  - **Accent Color**: `var(--accent-color)`, `var(--accent-color-rgb)`.

### 4.2. Nguyên tắc đặt tên Class & Specificity
- Sử dụng quy ước dạng kebab-case ngữ nghĩa theo block:
  ```css
  /* Đúng chuẩn */
  .aquarium-clock-tank { ... }
  .aquarium-clock-content { ... }
  .aquarium-sand-floor { ... }
  .aquarium-pixel-coral { ... }
  ```
- **Hạn chế lạm dụng `!important`**: Chỉ dùng `!important` khi cần ghi đè các thiết lập toàn cục của layout cơ sở trong các chế độ hiển thị đặc thù (`body.date-clock-style-*`).
- **Phân tách bộ chọn**: Tránh gán chung margin/padding cho cả phần tử cha và phần tử con dẫn tới lỗi nhân đôi khoảng cách.

### 4.3. Quy chuẩn Animation & Tối ưu GPU
- Chỉ animate 2 thuộc tính chính có chi phí tính toán thấp: `transform` và `opacity`.
- Khai báo `will-change` có chọn lọc:
  ```css
  .aquarium-fish {
    will-change: transform, left;
    transform: translateZ(0); /* Kích hoạt hardware acceleration */
  }
  ```
- Tôn trọng tùy chọn giảm chuyển động của người dùng (`prefers-reduced-motion`):
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

### 4.4. Đáp ứng kích thước (Responsive Design)
- Tận dụng hàm `clamp(min, preferred, max)` để co giãn tự nhiên:
  ```css
  padding: clamp(12px, 1.6vw, 16px) clamp(24px, 4vw, 36px) clamp(8px, 1.2vw, 12px);
  ```
- Điểm ngắt chuẩn (Standard Breakpoints):
  - Mobile: `@media (max-width: 640px)`
  - Tablet: `@media (max-width: 1024px)`

---

## 5. QUY CHUẨN HTML & PARTIAL TEMPLATES

1. **Kiến trúc Partials**:
   - `index.html` chỉ chứa khung bố cục chính. Toàn bộ modal, popup và các tab cài đặt được chia nhỏ trong thư mục `partials/` và được nạp tự động qua file boot.
2. **Không viết JavaScript nội dòng (No Inline JS)**:
   - Nghiêm cấm viết `<button onclick="...">` hay `href="javascript:..."` vì vi phạm nghiêm ngặt chính sách bảo mật CSP của Manifest V3. Mọi sự kiện phải gắn qua `addEventListener` trong JavaScript.
3. **Accessibility (a11y)**:
   - Các nút icon không có chữ hiển thị bắt buộc phải có `title` và `aria-label`:
     ```html
     <button type="button" class="btn-icon" aria-label="Close" title="Close">
       <i class="fa-solid fa-xmark"></i>
     </button>
     ```

---

## 6. QUY CHUẨN ĐA NGÔN NGỮ (i18n)

1. **Tuyệt đối không hardcode text hiển thị ra giao diện**:
   - Mọi chuỗi văn bản người dùng nhìn thấy phải được khai báo trong hệ thống i18n.
2. **Trong file HTML**:
   - Dùng thuộc tính `data-i18n="key_name"`:
     ```html
     <span data-i18n="settings_music_real_audio_reactive">Real-time Wave</span>
     ```
3. **Trong file JavaScript**:
   - Dùng hàm `geti18n()`:
     ```javascript
     import { geti18n } from "../services/i18n.js"
     const i18n = geti18n()
     showToast(i18n.saved_success || "Saved successfully!")
     ```
4. **Đồng bộ 4 file ngôn ngữ**:
   - Khi thêm mới bất kỳ key nào, bắt buộc phải cập nhật đồng thời cả 4 file trong [`locales/`](file:///d:/Personal/Project/HTML-CSS-JS/exxtension-save-pass/Startpage/locales):
     - `locales/vi.json` (Tiếng Việt)
     - `locales/en.json` (Tiếng Anh)
     - `locales/de.json` (Tiếng Đức)
     - `locales/sv.json` (Tiếng Thụy Điển)

---

## 7. TƯƠNG THÍCH ĐA TRÌNH DUYỆT (CHROME VS FIREFOX)

1. **Kiểm tra môi trường (Feature Detection)**:
   - Không giả định mọi trình duyệt đều có đầy đủ API của Chrome.
   - Luôn kiểm tra tính khả dụng trước khi sử dụng các API đặc thù:
     ```javascript
     const isFirefox = /firefox|fxios/i.test(navigator.userAgent) || typeof InstallTrigger !== "undefined"
     ```
2. **Xử lý các API chưa hỗ trợ trên Firefox**:
   - `chrome.offscreen` và `chrome.tabCapture` hiện **chưa** được hỗ trợ hoàn chỉnh trên Firefox MV3.
   - Khi người dùng bật các tính năng phụ thuộc (ví dụ: Sóng nhạc Real-time):
     - Hiển thị Toast cảnh báo thân thiện dạng `warning`.
     - Giữ nguyên trạng thái tắt (`false`) để tránh gây hiểu nhầm tính năng bị hỏng.
     - Bọc `try...catch` quanh `chrome.permissions.request` để tránh quăng lỗi unhandled exception.
3. **An toàn với Message Passing**:
   - Luôn thêm `.catch(() => {})` khi gọi `chrome.runtime.sendMessage(...)` để tránh sinh lỗi `Unchecked runtime.lastError: Could not establish connection`.

---

## 8. BẢO MẬT & PHÒNG CHỐNG XSS

1. **Chống XSS khi thao tác DOM**:
   - Hạn chế tối đa việc đưa trực tiếp chuỗi không an toàn vào `innerHTML`.
   - Ưu tiên dùng `textContent` khi chèn chuỗi văn bản.
   - Khi bắt buộc dùng HTML template literal, phải sanitize hoặc escape các biến đầu vào của người dùng bằng `escapeHtml()` hoặc `escapeAttribute()`:
     ```javascript
     import { escapeHtml, escapeAttribute } from "../utils/sanitize.js"
     el.innerHTML = `<div title="${escapeAttribute(title)}">${escapeHtml(name)}</div>`
     ```
2. **Tuân thủ Content Security Policy (CSP)**:
   - Không sử dụng `eval()`, `new Function(...)` hoặc chèn thẻ `<script>` từ CDN ngoài.

---

## 9. QUY TRÌNH KIỂM THỬ & KIỂM TRA MÃ NGUỒN

Trước khi commit bất kỳ thay đổi nào:

1. **Kiểm tra cú pháp JSON**:
   - Chạy lệnh kiểm tra tính hợp lệ của toàn bộ file ngôn ngữ:
     ```bash
     node -e '["vi.json","en.json","de.json","sv.json"].forEach(f => JSON.parse(require("fs").readFileSync("./locales/" + f, "utf8")))'
     ```
2. **Kiểm tra Console Trình duyệt**:
   - Mở New Tab trên trình duyệt, mở DevTools Console (`F12`) và đảm bảo:
     - Không có lỗi đỏ (Errors/Exceptions).
     - Không có cảnh báo CSP.
     - Kiểm tra cả trên Chrome và Firefox (hoặc môi trường test tương đương).
3. **Quy tắc Commit Message**:
   - Sử dụng chuẩn Conventional Commits:
     - `feat: ...` (Tính năng mới)
     - `fix: ...` (Sửa lỗi)
     - `style: ...` (Sửa CSS, khoảng cách, giao diện)
     - `refactor: ...` (Tái cấu trúc code không đổi logic)
     - `docs: ...` (Cập nhật tài liệu)
