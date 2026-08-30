<img src="https://github.com/ChickenSoup269/imagesForRepo/blob/main/zero_extension/zero%20colab.png?raw=true" width="1200px" />

# <img src="./icon/logo.png" width="50px" /> Startpage - Your Personalized Browser Startpage

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
- **Habit Tracker Widget**: Daily habit tracker with streak counts and multiple color themes (Custom per habit, Red-to-Green Gradient, Material 3 Accent).
- **RSS Reader Widget**: Built-in news feed reader supporting custom RSS feeds with quick refresh and clean modal preview.
- **Smart Weather Widget**: Real-time forecast via Open-Meteo with customizable endpoints, geocoding search, and live connection test.
- **Daily Quotes Widget**: Curated motivational & philosophical quotes with customizable update frequency (New tab, Hourly, Daily).
- **Real-time Audio Reactive (Beta)**: Capture tab audio stream (`tabCapture`) so visualizer waves react dynamically to live music beats and bass.
- **3D Floating Glass Cubes Clock**: Futuristic 3D clock style with voxel pedestals, volumetric extrusion, and interactive tilt response.
- **Next-Gen WebGL Shaders**: Interactive Fluid simulation, Frosted Glass Orbs, Black Hole singularity, and Neon Grid 3D live background shaders.
- **Bookmark Multi-Select Toolbar**: Batch select bookmarks to delete, move between folders, or create new groups in one click.
- **Snap to Grid (Drag & Drop)**: Configurable grid snapping (20px to 100px) when positioning widgets.

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
- Switchable search engine selector with persistent preference (Google, DuckDuckGo, Bing, Brave, Perplexity, Gemini, etc.)
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
- Auto favicon fetching via Google Favicon API with fallback
- Import bookmarks directly from Chrome's browser bookmarks
- Right-click context menu for quick actions

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
<th>Music Player</th>
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
- **18+ Visual Themes** — Vinyl, Pixel, Spotify, Apple Music, SoundCloud, Cassette, Pill, Terminal, etc.
- Draggable mini-player with vinyl disc animation

</td>

</tr>
</table>

<table align="center">
<tr>
<th>Music Visualizer</th>
<th>Dynamic Backgrounds</th>
</tr>

<tr>

<td>

- Multiple visualizer styles: **Vinyl**, **Pixel (EQ bars)**, **Bars**
- Canvas-based pixel mode with peak-hold animation
- Syncs automatically with the music player state and live tab audio

</td>

<td>

- Local preset themes / gradients
- Custom solid color picker & custom image via URL
- **Image upload** stored locally (no cloud)
- **Unsplash integration** — browse 10+ category feeds with your own API key
- **Background video** support (MP4, WebM, MOV)
- **Background Visibility & Blur** — dim or directional blur the background for widget focus
- Gradient builder with start color, end color, and angle controls
- Save custom gradients to a personal gallery

</td>

</tr>
</table>

---

### Visual Effects (57+ Animations & WebGL Shaders + SVG Wave Generator)

Select from 57+ canvas-based animated effects and WebGL shaders, plus the SVG Wave Generator, with individual color pickers where supported:

| Nature & Space | Digital & Tech | Weather & Seasons | Abstract, Patterns & WebGL |
| :--- | :--- | :--- | :--- |
| • Fireflies / HD | • Network | • Rain / HD / Storm | • Aura |
| • Meteor Shower | • Matrix Rain | • Pixel Weather | • Bubbles |
| • Sunbeam | • Hacker Terminal | • Pixel Snow HQ | • Wavy Lines / Pattern |
| • Sky Lanterns | • Pixel Cubes | • Snow / Snowfall HD | • Angled Pattern |
| • Ocean Wave | • Pixel Run | • Wind | • Floating Lines |
| • Ocean Fishes | • Pixel Blast | • Sakura Petals | • Shiny / Line Shiny |
| • Cloud Drift | • Retro Terminal | • Autumn Leaves | • Rainbow Background |
| • Plant Growth | • Retro Game | • Green Leaves | • Cursor Trail / Splash |
| • Jellyfish | • CRT Scanlines | • Settling Leaves | • Frosted Glass Orbs *(New)* |
| • Aurora Wave | • Grid Scan | • Rain Galaxy | • Interactive Fluid *(New)* |
| • Soft Aurora | • Flashlight | • Halloween | • Cinematic Bokeh *(New)* |
| • Northern Lights | • Hyperspace | • Tết Fireworks | • Black Hole *(New)* |
| • Light Pillars | • DVD Bounce | • Reunification Day | • Neon Grid 3D *(New)* |
| • Nintendo Pixel | • Music Bars | | • Liquid Ether / Silk |

### SVG Wave Generator

- Fully configurable wave backgrounds: line count, amplitude X/Y, offset, angle, smoothness, fill toggle
- HSL color gradient (start → end)
- Save custom waves to a personal gallery

### Advanced Personalization

- **Custom Floating Title** — add your own text, move it anywhere (Free Move), and customize font, size, letter spacing, shadow (X/Y/Blur/Color), and border with **Live Preview**.
- **Settings Modernization & Steppers** — precision `(- / +)` micro-steppers and mouse wheel adjustment on all range inputs.
- **Dedicated Reset-to-Default Buttons** — individually reset Sizes, Appearance, Tabs, Layout, Typography, and Effects.
- **Snap to Grid (Drag & Drop)** — align widgets cleanly with adjustable grid sizes (20px to 100px).
- **Multi-color System** — dynamically change UI accent colors with multiple modes (Gradient, Cycle, or Sync with background).
- **Layout Controls Popup (LCP)** — a quick-access mini menu to toggle component visibility and adjust layout settings directly.
- **Lock Widgets** — pin all draggable components in place to prevent accidental movement.
- **Context Menus** — Dark Glass, Light Glass, Transparent, macOS, and Material 3 styles.
- **Glassmorphism UI** — consistent, high-quality frosted glass aesthetics across all widgets and modals.

### Settings & System

- **Font selector** with support for loading custom fonts, Google Fonts, or **locally installed system fonts** (Local Font Access API)
- **Language support**: English, Vietnamese, German, Swedish (i18n), plus custom language JSON support
- **Cloud Sync** — backup and restore settings (excluding media) using your Chrome account sync storage
- **Bookmark Layouts** — choose between Default Grid, Sidebar, and Taskbar modes (**Bottom Center, Top Center, Bottom Left**)
- **Export / Import** settings as a JSON file
- **Table of Contents (ToC)** — navigate long settings panels easily with a built-in search and ToC
- Reset all settings to defaults

---

## Installation

1. Download or clone this repository.
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
- **LocalStorage & IndexedDB** for fast client-side storage
- **Chrome Storage Sync** for cross-device synchronization
- **Local Font Access API** for system font integration
- **Open-Meteo API** for privacy-friendly weather forecasts

---

<!-- sound credit -->
<!-- https://pixabay.com/sound-effects/household-bedside-clock-alarm-95792/ -->
