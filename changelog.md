### [1.1.1] - 2026-04-04

#### 🇻🇳 Tiếng Việt (Vietnamese)

**Tính năng mới & Nâng cấp (Features & Enhancements):**

- **Hiệu ứng nền (Visual Effects):**
  - Kích hoạt 3 hiệu ứng mới: **Đại dương (Ocean Fish)**, **Tán lá mọc (Plant Growth)**, và **Vệt tia sáng theo chuột (Cursor Trail)** (có hỗ trợ tuỳ màu).
  - Làm lại hiệu ứng mưa: Thay thế `RainOnGlass` bằng phiên bản `StormRainEffect` hoành tráng hơn với mây đen và tia sét nhấp nháy.
- **Ghi chú (Todo List):** Thêm tuỳ chọn thu gọn giao diện bằng cách ẩn/hiện ô checkbox đánh dấu trước mỗi tác vụ (Task) và làm mượt hiệu ứng lúc di chuột (hover).
- **Trình phát nhạc (Music Player):** Đại tu lại giao diện phong cách, bổ sung thêm hệ thống chuyển đổi nền (Theme/Style) mới cho thanh trình phát.
- **Tuỳ chỉnh Dấu trang (Bookmarks):**
  - Đã có thể tuỳ chỉnh màu sắc (màu nền, màu chữ) và kích thước chữ riêng biệt cho các thư mục (Group).
  - Hỗ trợ Kéo thả (Drag & Drop) khi thiết lập Custom Bookmarks.
- **Tiện ích giao diện:**
  - Thêm menu ngữ cảnh (chuột phải) tính năng **"Khóa Widgets"** (Lock Widgets), tránh trường hợp vô tình kéo lệnh lung tung trên màn hình.
  - Bổ sung nút bấm ẩn/hiện khu vực điều khiển (Controls) ở góc trên cùng bên phải.
  - Điều chỉnh thanh tìm kiếm (Search bar) mượt hơn, có menu thả xuống cho **Google Apps** và nhận diện hình ảnh qua **Google Lens**.
  - Có thể chọn ẩn hoặc thu nhỏ lớp hình nền thông qua tuỳ chọn Background Visibility.
- **Thông báo & Tương tác:** Popup thông báo khi có phiên bản mới cập nhật (Update Notification). Bổ sung tính năng **Mục lục (Table of Contents)** khi lướt dài. Thêm chế độ hiển thị 12 vạch giờ cho đồng hồ kim (Analog), cho phép tạo viền chữ (stroke) cho Ngày tháng.

**Sửa lỗi & Tối ưu (Fixes & Re-factors):**

- Nâng chỉ số phân lớp `z-index` cho thanh cài đặt và các widget để giải quyết triệt để lỗi các thẻ đè nhầm lên nhau.
- Tối ưu hành vi thư mục lúc dùng Import Modal. Xoá bỏ các tệp tin không còn dùng (Code clean-up).

---

#### 🇬🇧 English

**Features & Enhancements:**

- **Visual Effects:**
  - Added highly customizable Canvas effects: **Ocean Fish**, **Plant Growth**, and **Cursor Trail**.
  - Rain effects heavily refactored: Replaced `RainOnGlassEffect` with a completely new `StormRainEffect` introducing animated thunderclouds and lightning strikes.
- **Todo List:** Implemented a new checkbox visibility toggle for a cleaner task view, plus fluid hover layout animations.
- **Music Player:** Amplified the widget's visual fidelity with newly introduced rendering styles and options.
- **Bookmark Management:**
  - Bookmark folders/groups now support isolated background colors, text colors, and font sizes.
  - Allowed drag-and-drop mechanics in the custom bookmark configuration panel.
- **UI Integrations & Tools:**
  - Added a "Lock Widgets" toggle in the context menu to pin draggables.
  - Added settings to toggle the visibility of Top-Right control buttons.
  - Refactored the search bar, added custom sizing, a **Google Apps** integrated dropdown, and an embedded **Google Lens** lookup icon.
  - Added background visibility modifiers to let widgets float seamlessly.
- **General Elements:** New update notification popups. A "Table of Contents" inclusion. Added 12-ticks option for Analog clocks, and stroke/outline parameter linking to clock & date rendering.

**Fixes & Chores:**

- Overhauled Z-index layer hierarchies bridging the settings sidebar and draggable widgets, fixing visual overlapping glitches.
- Improved logical parsing for folders running through the Bookmark Import modal and pruned dead assets from the codebase.

---

### [1.0.1] - 2026-03-23

#### Thêm mới (Added)

- New visual effect: **Northern Lights (Cực Quang Bắc)**:
  - Realistic aurora borealis waves with flowing light patterns
  - Particle-based rendering with wave physics simulation
  - Customizable aurora light color with HSL gradient variations
  - Multi-layer wave ribbons with phase-shifted motion
  - Smooth FPS-controlled animation (45 FPS) for performance
  - Auto-scaling to screen size with responsive particle system
  - Floating light particles with opacity fade effects
- New visual effect: **CRT Scanlines**

- Tuỳ chọn **Đồng hồ hình vuông (Square Clock)** trong phần kiểu đồng hồ/ngày tháng.
- Hiệu ứng chi tiết mới cho đồng hồ **tròn** và **vuông** (bóng, viền, hiệu ứng nền nhiều lớp).
- Tuỳ chọn **Random HUE Letters**: mỗi ký tự của đồng hồ hoặc ngày tháng có thể được tô màu HUE khác nhau (giống bảng tên FamilyMart).
  - Có thể chọn áp dụng cho đồng hồ, ngày tháng, cả hai, hoặc tắt.
  - Màu HUE cố định theo vị trí ký tự, không đổi màu liên tục.

- New **Multi-Color Split Background** feature:
  - Create split backgrounds with 2-6 custom colors
  - Two rendering modes:
    - **Smooth Gradient**: Colors blend smoothly with adjustable angle
    - **Solid Blocks**: Equal-width color blocks with sharp transitions
  - **Random Colors** button to generate random color combinations instantly
  - Adjustable gradient angle (0-360°)
  - Live preview of gradient/blocks before applying
  - Selected color count persists across sessions
  - Instant apply without page refresh
  - Save presets for later use
  - Full i18n support (English & Vietnamese)
- New visual effect: **CRT Scanlines** (terminal/80s-90s arcade style)
  - Full-frame barrel distortion simulating old CRT monitor curvature
  - Horizontal scanlines and pixel-noise phosphor glow
  - Traveling refresh sweep beam across screen
  - Retro-game style grid pattern overlay
  - Customizable scan color with dynamic phosphor tint
  - Optimized for performance (24 FPS, low-res noise texture)
- Added **Version Badge** in Settings sidebar header
  - Displays extension version (e.g. v1.0.1) cued from manifest
  - Subtle label below settings title for reference
  - Auto-populated from chrome.runtime.getManifest()
- New visual effect: **StormRain**
  - Dark animated storm cloud layer at top.
  - Multi-layer HD rain with wind drift and depth.
  - Frequent lightning bolts with synchronized screen flash.
  - Customizable rain color and responsive wind simulation.
- New leaf skin options for settling leaves: **Cherry Blossoms, Plum Blossoms, Sakura Petals**.
- Added new Unsplash categories: **Featured, New Spring, Wallpapers**.
- Added richer semantic keyword mapping (3-4 keywords/category) for better image relevance.
- Added featured category mixing across nature, technology, food, travel, architecture, and fashion.
- Added new Date & Clock customization options:
  - New date format: **Weekday only** and **Year only**
  - New **Date Size** slider (up to 10rem)
  - New **Zoom priority** option for weekday-focused layout
- Added new Analog Clock option in **Date & Clock Format**:
  - **Blur Background (Analog)** toggle (on/off)
  - Option only appears when **Analog Clock** style is selected
  - Setting is persisted and reset-safe
- Added quick music style selector in **Layout Controls** popup for faster style switching.
- Added new preset fonts: **Orbitron** and **Chakra Petch**.
- Added advanced **Background Gradient** options:
  - Gradient type selector: **Linear / Radial / Conic**
  - **Repeating Gradient** toggle for repeated stripe/ring/conic patterns
  - Saved gradient presets now preserve gradient type + repeating mode
- Added modern **Gradient Generator** workflow for landing-page style backgrounds:
  - Semantic generation behavior by type:
    - **Linear**: flowing directional blends
    - **Radial**: glow-focused center weighting
    - **Conic**: angular segmented color flow
    - **Repeating**: denser repeated texture with richer color stops
  - Extra color controls (1-5 additional colors)
  - Manual custom color input for advanced palettes
  - Random palette generation button for quick exploration
  - Visual color-picker sections for easier per-color customization
- Added advanced **CRT Scanlines** tuning controls in settings:
  - Scanline color picker
  - Scan frequency slider
  - Background tint color picker

#### Sửa lỗi (Fixed)

- Fixed **Sky Lanterns** flight path to go straight up without tilting
  - Removed random rotation/rotationSpeed that caused lanterns to tilt
  - Removed horizontal sway for pure vertical ascent
- Fixed Unsplash default category inconsistency (`spring-wallpapers` vs `nature`).
- Fixed architecture topic slug (`architecture-interior` -> `architecture-interiors`).
- Added safer fallback handling when Unsplash API calls fail.
- Ensured `content_filter=high` is applied consistently across random/search endpoints.
- Reduced settling-leaf jitter when leaves reach the bottom.
- Fixed collapsible Effect panel state so it persists after reopening settings.
- Fixed **Split Background (Multi-Color)** color-count dropdown sync:
  - Selecting 5 colors no longer visually resets back to 2 after reset/reload
  - Multi-color controls now re-sync correctly from stored settings state
- Fixed **SVG Wave** background compatibility with background filters:
  - `Blur` and `Brightness` sliders now apply correctly to SVG Wave layers
- Fixed visible cut/seam artifact in **Conic Gradient** rendering by closing color stop loop correctly.

#### Cập nhật (Updated)

- Enhanced **Multi-Color Split Background** workflow:
  - Added show/hide toggle for Split Background controls (state is persisted).
  - Improved **Random Colors** action to also randomize gradient angle.
  - Added separate random modes:
    - **Random HUE** (harmonized palette based on HSL hue distribution)
    - **Crazy Random** (fully random mixed colors)
  - Added divider lines between **Solid Blocks** with configurable:
    - enable/disable switch
    - divider color
    - divider width
  - Divider settings are now persisted and saved with multi-color presets.
  - Added **Free Divider Angles (per line)** option in Solid Blocks mode:
    - Each divider line can now be rotated independently with its own angle slider
    - Per-line angle values are persisted and included in saved presets
  - Divider line rendering updated to **full solid color** (no opacity)
  - Added EN/VI i18n labels for Split Background control visibility toggles.
- Optimized CRT Scanlines rendering pipeline:
  - Reduced from 30 FPS to 24 FPS for better stability
  - Changed warp from 2-pass (horizontal+vertical) to 1-pass (horizontal only)
  - Lowered noise resolution from full-screen to 25% for faster updates
  - Increased noise rebuild interval from every 3 frames to every 8 frames
  - Impacts: ~40% performance improvement without losing CRT aesthetic
- Refactored Unsplash fetch flow with 4-tier priority:
  - Tier 1: Per-category collections.
  - Tier 2: Curated Topics endpoint (`/topics/{id}/photos`).

- Nâng cấp CSS cho đồng hồ tròn/vuông với hiệu ứng đẹp hơn, responsive tốt hơn.
- Đồng bộ UI, i18n, state cho các tuỳ chọn mới về màu sắc ký tự.
  - Tier 3: Random photos with per-category keywords.
  - Tier 4: Search fallback with dynamic keyword pools.
- Increased Sakura Petal size for better visibility.
- Updated UI/i18n labels for new leaf skins (EN + VI).
- Updated clock/date behavior when weekday priority is active:
  - Priority mode now swaps emphasis between date and clock more naturally
  - No forced hard-minimize behavior; size relationship is preserved and swapped
  - Date format now respects user selection except full format (auto-fallback to weekday)
  - Weekday text shown in bold for better readability
- Synced music style changes across Settings, Layout Controls, and player rendering in real time.
- Updated glass clock/date styling so both widgets appear as one connected visual block.
- Updated **Background Gradient** panel UX:
  - Added show/hide toggle for gradient controls (state is persisted)
  - Simplified workflow around visual controls and live preview
- Updated **StormRain** effect to a calmer, cleaner style with a lighter render pipeline.
- Optimized **StormRain** for performance:
  - Reduced heavy per-frame effects and expensive draw operations
  - Lowered rendering workload for smoother behavior on lower-end devices

#### Xóa (Removed)

- Removed in-player music style dropdown to avoid duplicated controls (style is now controlled from Settings/Layout Controls).
- Removed "prioritize clock" option from date/clock priority settings.
- Removed **Full CSS Code** output section from Background Gradient to keep the UI focused on direct visual editing.

### [1.0.0] - 2026-03-16

- Base extension you can see in releases version
