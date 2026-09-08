<img src="https://github.com/ChickenSoup269/imagesForRepo/blob/main/zero_extension/zero%20colab.png?raw=true" width="1200px" alt="Startpage Preview" />

# Startpage - Your Personalized Browser Startpage

Startpage is a highly customizable browser extension (Manifest V3) that replaces your new tab page with a clean, feature-rich, and aesthetically pleasing interface. Everything is stored locally — no accounts, no tracking.

<p align="center">
  <a href="https://github.com/ChickenSoup269/Zero-Start-Page/releases/tag/v2.0.0" target="_blank">
    <img src="https://img.shields.io/badge/Release-v2.0.0-6366f1?style=for-the-badge&logo=github" alt="Version 2.0.0" height="32" />
  </a>
  &nbsp;
  <a href="https://chromewebstore.google.com/detail/zero-startpage-newtab-rep/ogdbkgoionmjnlinbmmjncnhafhaenck?authuser=0&hl=en" target="_blank">
    <img src="https://img.shields.io/badge/Chrome_Web_Store-Available-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Chrome Web Store" height="32" />
  </a>
  &nbsp;
  <a href="https://addons.mozilla.org/en-US/firefox/addon/zero-startpage-newtab/" target="_blank">
    <img src="https://img.shields.io/badge/Firefox_Add--ons-Available-FF7139?style=for-the-badge&logo=firefox-browser&logoColor=white" alt="Firefox Add-ons" height="32" />
  </a>
</p>

<p align="center">
  <a href="https://unikorn.vn/p/zero-startpage?ref=embed-zero-startpage" target="_blank">
    <img src="https://unikorn.vn/api/widgets/badge/zero-startpage/rank?theme=light&type=daily" alt="Zero Startpage - Daily" style="width: 250px; height: 64px;" width="250" height="64" />
  </a>
  &nbsp;
  <a href="https://launch.j2team.dev/products/zero-startpage-newtab-replacement?utm_source=badge-launched&utm_medium=badge&utm_campaign=badge-zero-startpage-newtab-replacement" target="_blank">
    <img src="https://launch.j2team.dev/badge/zero-startpage-newtab-replacement/light" height="64" />
  </a>
</p>

---

<table width="100%">
  <tr>
    <td align="left">
      <strong>English</strong> | <a href="./README_VN.MD">Tiếng Việt</a>
    </td>
    <td align="right">
      <a href="https://extension-changelogs.vercel.app/changelog?ext=Zero+Startpage+-+Newtab+Replacement" target="_blank">View Changelog (v2.0.0)</a>
    </td>
  </tr>
</table>

---

## What's New in Version 2.0.0

- **Settings Modernization & Micro-Steppers**: Tactile `(- / +)` step buttons and smooth mouse wheel scrolling across all range sliders for pixel-perfect adjustments.
- **Live Interactive Previews**: Instant visual feedback for Bookmark Cards, Folder Group Tabs, and Custom Title Studio directly inside the settings panel.
- **Dedicated Reset-to-Default Buttons**: Individual reset buttons for each settings group (Sizes, Appearance, Tabs, Layout, Typography, Effects) for easy recovery.
- **Ambient Sounds Generator**: 12 high-definition background sounds (Rain, Waves, Cafe, White Noise, Campfire, Forest, etc.) with multi-track volume mixer, ambient presets, equalizer visualizer, and sleep timer.
- **Habit Tracker Widget**: Daily habit tracker with streak counts and multiple color themes (Custom per habit, Red-to-Green Gradient, Material 3 Accent).
- **RSS Reader Widget**: Built-in news feed reader supporting custom RSS feeds with quick refresh and clean modal preview.
- **Smart Weather Widget**: Real-time forecast via Open-Meteo with customizable endpoints, geocoding search, and live connection test.
- **Daily Quotes Widget**: Curated motivational & philosophical quotes with customizable update frequency (New tab, Hourly, Daily).
- **Real-time Audio Reactive (Beta)**: Capture tab audio stream (`tabCapture`) so visualizer waves react dynamically to live music beats and bass.
- **3D Floating Glass Cubes Clock**: Futuristic 3D clock style with voxel pedestals, volumetric extrusion, and interactive tilt response.
- **Next-Gen WebGL Shaders**: Interactive Fluid simulation, Frosted Glass Orbs, Black Hole singularity, and Neon Grid 3D live background shaders.
- **Bookmark Multi-Select & Smart Import**: Batch select bookmarks to delete, move between folders, or create new groups in one click. Browser bookmark import now supports folder-to-group auto generation and Shift/Ctrl range selection.
- **Transparent Skin & Borderless Mode**: Toggle transparent background styling and hide borders across all widgets via right-click context menus.
- **LoremFlickr & Free Photos Gallery**: High-resolution curated wallpapers with category filtering and instant save to local gallery (IndexedDB).
- **Snap to Grid (Drag & Drop)**: Configurable grid snapping (20px to 100px) when positioning widgets.
- **Vector SVG Country Flags**: Native language selector and date language options feature crisp vector SVG flags for English, Vietnamese, German, and Swedish.

---

## Features

<table align="center">
<tr>
<th>Clock & Date</th>
<th>Smart Search</th>
</tr>

<tr>

<td>

- Real-time clock with second-level updates
- **3D Floating Glass Cubes** with voxel pedestals & interactive tilt
- **14+ Clock Styles**: Retro Flip, Analog, Glass Float, Pixel HUD, Satellite, Minimal, Terminal, and more
- **Pixel HUD & Satellite Styles** with customizable responsive color palette picker
- **Glass Float Clock** optimized with 60 FPS GPU composite rendering (zero CPU text-shadow overhead)
- Multiple date formats: Full, Short (DD/MM/YYYY), US (MM/DD/YYYY), ISO (YYYY-MM-DD)
- **Countdown Mode** — display your Timer's countdown directly on any clock style (Fliqlo, Analog, etc.)
- Option to hide seconds display
- Adjustable clock size and custom color picker
- Separate visibility toggles for clock, date, and Gregorian calendar
- Vietnamese lunar calendar display (optional)

</td>

<td>

- Google text search with real-time suggestions (up to 6, with favicons)
- **Google Apps Integration** — quick access dropdown for Google services with lazy-loaded icons for instant startup performance
- **Google Lens** support for visual search via image upload or URL
- Google Images and Google Lens search support
- Image search via file upload, clipboard paste, or image URL
- Switchable search engine selector with persistent preference (Google, DuckDuckGo, Bing, Brave, Perplexity, Gemini, YouTube, GitHub...)
- 250 ms debounced suggestion fetching

</td>

</tr>
</table>

<table align="center">
<tr>
<th>Bookmark Manager</th>
<th>Full Calendar</th>
</tr>

<tr>

<td>

- Add, edit, delete, and reorder bookmarks
- **Multi-Select Toolbar** — batch select bookmarks to delete, move to folder, or group
- **Bookmark Groups** — create multiple tabs, rename, reorder, and delete groups
- **Independent Styling** — customize background color, text color, and font size for each group
- **Live Preview in Settings** — instantly preview card designs and tab styling
- **Browser Import with Folder Generation** — import bookmarks from Chrome with folder-to-group auto generation and Shift/Ctrl range selection
- Auto favicon fetching via Google Favicon API with fallback
- 4 flexible layouts: Grid mode, Sidebar drawer, Taskbar (Bottom Center, Top Center, Bottom Left), and Bookmark Bar
- Popover positioning and display logic auto-adjusted to viewport bounds

</td>

<td>

- Full month-view calendar with navigation
- **Add, edit, and delete events** with title, time, and description
- Supports multiple events per day ("+X more" indicator)
- Vietnamese lunar calendar dates and **Vietnamese public holiday** detection
- Solar, Lunar, or Dual-calendar display modes
- Right-click context menu on days and events

</td>

</tr>
</table>

<table align="center">
<tr>
<th>Todo & Habit Tracker</th>
<th>Notepad</th>
</tr>

<tr>

<td>

- **Habit Tracker** with daily completion tracking, streaks, and color presets (Custom, Gradient, Material 3)
- **Todo List** with task addition, completion, and deletion
- **Checkbox Toggle** — hide checkboxes for a minimalist list view
- Inline editing via right-click context menu
- Auto-saved to localStorage

</td>

<td>

- Create multiple notes with custom colors (8 presets)
- **Rich text editor**: bold, italic, underline, strikethrough, bullet & numbered lists, link handling, and image insertion
- **Floating/detachable windows** — pop notes out into draggable, resizable windows and reattach them
- Improved floating note draggable title hitboxes, instant inline rename, and refined action controls
- Collapsible floating notes, toggleable edit toolbar, and active formatting states
- Fixed-width note images that stay inside both floating notes and the notepad preview
- Ctrl/Cmd-click links to open them from note content
- Light/dark content background toggle with contrast-aware text controls
- Full persistence of content, color, and window state

</td>

</tr>
</table>

<table align="center">
<tr>
<th>Weather & Daily Quotes</th>
<th>RSS News Reader</th>
</tr>

<tr>

<td>

- **Live Weather Forecast** powered by Open-Meteo
- Support for custom forecast and geocoding API endpoints with live connection tester
- Temperature unit toggle (Celsius °C / Fahrenheit °F)
- **Daily Inspirational Quotes** from curated authors
- Customizable quote refresh frequency (Every New Tab, Every Hour, Every Day)

</td>

<td>

- Built-in lightweight RSS reader
- Add, manage, and browse multiple RSS feeds
- Clean reading modal with quick external link opening
- Auto-cached articles for offline fast loading

</td>

</tr>
</table>

<table align="center">
<tr>
<th>Clock Timer & Notifications</th>
<th>Music Player & Visualizer</th>
</tr>

<tr>

<td>

- Countdown timer with Start / Pause / Reset controls
- **Smart input parser**: type `30` → 30 s · `130` → 1:30 · `13000` → 1:30:00
- **Persistent Update Notifications** — get notified about new features with a persistent popup and sidebar badge
- Audio alarm on completion with custom audio upload support
- Persists running state across page reloads (auto-resumes)

</td>

<td>

- Detects media playing in **any browser tab** via the Media Session API
- Displays track title, artist, album art, and platform (YouTube / Spotify / SoundCloud / Apple Music / etc.)
- **Real-Time Audio Reactive (Beta)** — capture tab audio for true beat and bass visualization
- Play / Pause / Previous / Next controls
- Multiple visualizer styles: **Vinyl**, **Pixel (EQ bars)**, **Bars**
- Canvas-based pixel mode with peak-hold animation

</td>

</tr>
</table>

<table align="center">
<tr>
<th>Ambient Sounds (White Noise)</th>
<th>Dynamic Backgrounds</th>
</tr>

<tr>

<td>

- 12 high-definition nature & ambient sounds (Rain, Campfire, Thunder, Ocean Waves, Coffee Shop, Forest, White Noise, Fan, Library, Lo-Fi, etc.)
- Multi-track volume mixing with instant individual volume sliders
- Curated presets: Study, Relax, Deep Focus, Sleep
- Animated equalizer visualizer and background sleep timer

</td>

<td>

- Local preset themes / gradients
- Custom solid color picker & custom image via URL
- **Image upload** stored locally (no cloud)
- **LoremFlickr & Lorem Picsum integration** with category filtering and instant save to local gallery (IndexedDB)
- **Unsplash integration** — browse 10+ category feeds with your own API key
- **Background video** support (MP4, WebM, MOV)
- **Background Visibility & Blur** — dim or directional blur the background for widget focus
- Gradient builder with start color, end color, and angle controls

</td>

</tr>
</table>

---

### Visual Effects (57+ Animations & WebGL Shaders + SVG Wave Generator)

Select from 57+ canvas-based animated effects and WebGL shaders, plus the SVG Wave Generator, with individual color pickers where supported:

| Nature & Space    | Digital & Tech    | Weather & Seasons    | Abstract, Patterns & WebGL   |
| :---------------- | :---------------- | :------------------- | :--------------------------- |
| • Fireflies / HD  | • Network         | • Rain / HD / Storm  | • Aura                       |
| • Meteor Shower   | • Matrix Rain     | • Pixel Weather      | • Bubbles                    |
| • Sunbeam         | • Hacker Terminal | • Pixel Snow HQ      | • Wavy Lines / Pattern       |
| • Sky Lanterns    | • Pixel Cubes     | • Snow / Snowfall HD | • Angled Pattern             |
| • Ocean Wave      | • Pixel Run       | • Wind               | • Floating Lines             |
| • Ocean Fishes    | • Pixel Blast     | • Sakura Petals      | • Shiny / Line Shiny         |
| • Cloud Drift     | • Retro Terminal  | • Autumn Leaves      | • Rainbow Background         |
| • Plant Growth    | • Retro Game      | • Green Leaves       | • Cursor Trail / Splash      |
| • Jellyfish       | • CRT Scanlines   | • Settling Leaves    | • Frosted Glass Orbs _(New)_ |
| • Aurora Wave     | • Grid Scan       | • Rain Galaxy        | • Interactive Fluid _(New)_  |
| • Soft Aurora     | • Flashlight      | • Halloween          | • Cinematic Bokeh _(New)_    |
| • Northern Lights | • Hyperspace      | • Tết Fireworks      | • Black Hole _(New)_         |
| • Light Pillars   | • DVD Bounce      | • Reunification Day  | • Neon Grid 3D _(New)_       |
| • Nintendo Pixel  | • Music Bars      |                      | • Liquid Ether / Silk        |

### SVG Wave Generator

- Fully configurable wave backgrounds: line count, amplitude X/Y, offset, angle, smoothness, fill toggle
- HSL color gradient (start → end)
- Save custom waves to a personal gallery

### Advanced Personalization

- **Transparent Skin & Borderless Mode** — toggle transparent frosted backgrounds and borders across all widgets via right-click context menu.
- **Context Menus** — 6 styles: Dark Glass, Light Glass, Pure Transparent, macOS, Material 3, and Default, plus quick "Open Default Chrome New Tab (Google User)" option.
- **Custom Floating Title** — add your own text, move it anywhere (Free Move), and customize font, size, letter spacing, shadow (X/Y/Blur/Color), and border with **Live Preview**.
- **Settings Modernization & Steppers** — precision `(- / +)` micro-steppers and mouse wheel adjustment on all range inputs.
- **Dedicated Reset-to-Default Buttons** — individually reset Sizes, Appearance, Tabs, Layout, Typography, and Effects.
- **Snap to Grid (Drag & Drop)** — align widgets cleanly with adjustable grid sizes (20px to 100px).
- **Multi-color System** — dynamically change UI accent colors with multiple modes (Gradient, Cycle, or Sync with background).
- **Layout Controls Popup (LCP)** — a quick-access mini menu to toggle component visibility and adjust layout settings directly.
- **Lock Widgets** — pin all draggable components in place to prevent accidental movement.
- **Glassmorphism UI** — consistent, high-quality frosted glass aesthetics across all widgets and modals.

### Settings & System

- **Font selector** with support for loading custom fonts, Google Fonts, or **locally installed system fonts** (Local Font Access API)
- **Language support**: English, Vietnamese, German, Swedish (i18n), featuring vector SVG country flags in language selector
- **Cloud Sync** — backup and restore settings (excluding media) using your Chrome account sync storage
- **Bookmark Layouts** — choose between Default Grid, Sidebar, and Taskbar modes (**Bottom Center, Top Center, Bottom Left**)
- **Export / Import** settings as a JSON file
- **Table of Contents (ToC)** — navigate long settings panels easily with a built-in search and ToC
- Reset all settings to defaults

---

## Links & Resources

- **Source Code**: [https://github.com/ChickenSoup269/Zero-Start-Page](https://github.com/ChickenSoup269/Zero-Start-Page)
- **View All Releases & Changelogs**: [https://extension-changelogs.vercel.app/changelog?ext=Zero+Startpage+-+Newtab+Replacement](https://extension-changelogs.vercel.app/changelog?ext=Zero+Startpage+-+Newtab+Replacement)
- **Chrome Web Store**: [Zero Startpage on Chrome Web Store](https://chromewebstore.google.com/detail/zero-startpage-newtab-rep/ogdbkgoionmjnlinbmmjncnhafhaenck?authuser=0&hl=en)
- **Firefox Add-ons**: [Zero Startpage on Firefox AMO](https://addons.mozilla.org/en-US/firefox/addon/zero-startpage-newtab/)

---

## Privacy & Security Policy

Your privacy and security are our highest priorities:

- **No personal data is collected or transmitted.** We do not run any remote tracking servers, analytics services, or user databases.
- **All data is processed locally within your browser.** All bookmarks, notes, todos, habits, and settings live securely on your computer in `IndexedDB` and `localStorage`.
- **No remote code or third-party tracking scripts.** The extension complies strictly with Manifest V3 security rules.
- **Transparent & Open Source.** You can review, audit, and contribute to every line of source code on [GitHub](https://github.com/ChickenSoup269/Zero-Start-Page).

---

## Installation

1. Download or clone this repository:
   ```bash
   git clone https://github.com/ChickenSoup269/Zero-Start-Page.git
   ```
2. Open `chrome://extensions/` (Chrome/Brave/Edge) or `about:debugging#/runtime/this-firefox` (Firefox).
3. Enable **Developer mode** (top-right toggle in Chrome).
4. Click **Load unpacked** and select the project folder.
5. Open a new tab — enjoy your Startpage!

---

## Tech Stack

- **Vanilla JavaScript (ES Modules)** — fast, zero build step, no framework overhead
- **Chrome Extension Manifest V3** (with Firefox compatibility)
- **Canvas API & WebGL Shaders** for fluid animations and real-time visualizers
- **Chrome Media Session API & Tab Capture** for music detection and audio-reactive waveforms
- **Web Audio API** for multi-track ambient sound generation
- **LocalStorage & IndexedDB** for fast client-side storage
- **Chrome Storage Sync** for cross-device synchronization
- **Local Font Access API** for system font integration
- **Open-Meteo API** for privacy-friendly weather forecasts

---

## License & Credits

Distributed under the MIT License. See `LICENSE` for details.
Crafted by [ChickenSoup269](https://github.com/ChickenSoup269).
