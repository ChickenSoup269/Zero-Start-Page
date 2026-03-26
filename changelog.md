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
  - Tier 3: Random photos with per-category keywords.
  - Tier 4: Search fallback with dynamic keyword pools.
- Increased Sakura Petal size for better visibility.
- Updated UI/i18n labels for new leaf skins (EN + VI).
- Updated clock/date behavior when weekday priority is active:
  - Clock is minimized and date is emphasized
  - Date format now respects user selection except full format (auto-fallback to weekday)
  - Weekday text shown in bold for better readability
- Synced music style changes across Settings, Layout Controls, and player rendering in real time.

#### Xóa (Removed)

- Removed in-player music style dropdown to avoid duplicated controls (style is now controlled from Settings/Layout Controls).
- Removed "prioritize clock" option from date/clock priority settings.

### [1.0.0] - 2026-03-16

- Base extension you can see in releases version
