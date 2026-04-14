# <img src="./icon/logo.png" width="50px" /> Startpage - Your Personalized Browser Startpage

Startpage is a highly customizable Chrome extension that replaces your new tab page with a clean, feature-rich, and aesthetically pleasing interface. Everything is stored locally — no accounts, no tracking.

<div style="display: flex; justify-content: flex-end; align-items: center; gap: 4px;">
  
  <!-- Left -->
  <a href="https://unikorn.vn/p/zero-startpage?ref=embed-zero-startpage" target="_blank">
    <img src="https://unikorn.vn/api/widgets/badge/zero-startpage?theme=light" height="56" />
  </a>

  <!-- Center (Chrome - bigger & higher) -->
  <a href="https://chromewebstore.google.com/detail/ogdbkgoionmjnlinbmmjncnhafhaenck?utm_source=item-share-cb" target="_blank">
    <img 
      src="https://github.com/ChickenSoup269/imagesForRepo/raw/main/img_repo_extension_bookmarks/use_offline_img/available_chrome_web.png"
     
      height="56"
      style="transform: translateY(-6px);"
    />
  </a>

  <!-- Right -->
  <a href="https://launch.j2team.dev/products/zero-startpage-newtab-replacement?utm_source=badge-launched&utm_medium=badge&utm_campaign=badge-zero-startpage-newtab-replacement" target="_blank">
    <img src="https://launch.j2team.dev/badge/zero-startpage-newtab-replacement/light" height="56" />
  </a>

</div>

---

 <table width="100%" >
  <tr>
    <td align="left">
    English | <a href="https://github.com/ChickenSoup269/Zero-Start-Page/blob/main/README_VN.MD">Tiếng Việt</a>
    </td>
      <td align="right">
        <a href="">CHANGELOG.md</a>
      </td>
  </table>

## Features

<table align="center">
<tr>
<th> Clock & Date</th>
<th> Smart Search</th>
</tr>

<tr>

<td>

- Real-time clock with second-level updates
- Multiple date formats: Full, Short (DD/MM/YYYY), US (MM/DD/YYYY), ISO (YYYY-MM-DD)
- Option to hide seconds display
- Adjustable clock size and custom color picker
- Separate visibility toggles for clock, date, and Gregorian calendar
- Vietnamese lunar calendar display (optional)

</td>

<td>

- Google text search with real-time suggestions (up to 6, with favicons)
- Google Images and Google Lens search support
- Image search via file upload, clipboard paste, or image URL
- Switchable search engine selector with persistent preference
- 250 ms debounced suggestion fetching

</td>

</tr>
</table>

<table align="center">
<tr>
<th> Bookmark Manager</th>
<th> Full Calendar</th>
</tr>

<tr>

<td>

- Add, edit, delete, and reorder bookmarks
- **Bookmark Groups** — create multiple tabs, rename, reorder, and delete groups
- Auto favicon fetching via Google Favicon API with fallback
- Import bookmarks directly from Chrome's browser bookmarks
- Right-click context menu for quick actions

</td>

<td>

- Full month-view calendar with navigation
- **Add, edit, and delete events** with title, time, and description
- Supports multiple events per day ("+X more" indicator)
- Vietnamese lunar calendar dates and **Vietnamese public holiday** detection
- Right-click context menu on days and events

</td>

</tr>
</table>

<table align="center">
<tr>
<th> Todo List</th>
<th> Notepad</th>
</tr>

<tr>

<td>

- Add, complete, and delete tasks
- Inline editing via right-click context menu
- Auto-saved to localStorage

</td>

<td>

- Create multiple notes with custom colors (8 presets)
- **Rich text editor**: bold, italic, underline, strikethrough, bullet & numbered lists, image insertion
- **Floating/detachable windows** — pop notes out into draggable, resizable windows and reattach them
- Light/dark content background toggle
- Full persistence of content, color, and window state

</td>

</tr>
</table>

<table align="center">
<tr>
<th> Clock Timer</th>
<th> Music Player</th>
</tr>

<tr>

<td>

- Countdown timer with Start / Pause / Reset controls
- **Smart input parser**: type `30` → 30 s · `130` → 1:30 · `13000` → 1:30:00
- Audio alarm on completion with stop button
- Persists running state across page reloads (auto-resumes)

</td>

<td>

- Detects media playing in **any Chrome tab** via the Media Session API
- Displays track title, artist, album art, and platform (YouTube / Spotify / SoundCloud)
- Play / Pause / Previous / Next controls
- Draggable, collapsible mini-player with vinyl disc animation

</td>

</tr>
</table>

<table align="center">
<tr>
<th> Music Visualizer</th>
<th> Dynamic Backgrounds</th>
</tr>

<tr>

<td>

- Multiple visualizer styles: **Vinyl**, **Pixel (EQ bars)**, **Bars**
- Canvas-based pixel mode with peak-hold animation
- Syncs automatically with the music player state

</td>

<td>

- Local preset themes / gradients
- Custom solid color picker
- Custom image via URL
- **Image upload** stored locally (no cloud)
- **Unsplash integration** — browse 10+ category feeds with your own API key
- **Background video** support (MP4, WebM, MOV)
- Gradient builder with start color, end color, and angle controls
- Save custom gradients to a personal gallery
- Background position (X/Y offset) and size controls

</td>

</tr>
</table>

### Visual Effects (32 Animations + SVG Wave Generator)

Select from 32 canvas-based animated effects, plus the SVG Wave Generator, with individual color pickers where supported:

| Effect                 | Effect                 | Effect            | Effect             |
| ---------------------- | ---------------------- | ----------------- | ------------------ |
| 1. Rain                | 9. Snowfall            | 17. Cloud Drift   | 25. Sky Lanterns   |
| 2. Fireflies           | 10. Snowfall HD        | 18. Autumn Leaves | 26. Pixel Run      |
| 3. Network             | 11. Aurora Wave        | 19. Green Leaves  | 27. Retro Terminal |
| 4. Matrix Rain         | 12. Bubbles            | 20. Sunbeam       | 28. Retro Game     |
| 5. Gradients Aura      | 13. Rain on Glass      | 21. Shiny         | 29. Meteor Shower  |
| 6. Anime Wind          | 14. Rain HD            | 22. Line Shiny    | 30. Wavy Pattern   |
| 7. Hacker              | 15. Rainbow Background | 23. Tết Fireworks | 31. Angled Pattern |
| 8. Sakura              | 16. Wavy Lines         | 24. Rain Galaxy   | 32. Fireflies HD   |
| **SVG Wave Generator** |                        |                   |                    |

### SVG Wave Generator

- Fully configurable wave backgrounds: line count, amplitude X/Y, offset, angle, smoothness, fill toggle
- HSL color gradient (start → end)
- Save custom waves to a personal gallery

### Settings & Personalization

- **Font selector** with support for loading custom fonts
- **Accent color** applied across the entire UI
- **Page title** customization
- **Tab icon** customization — set 2 letters or 1 emoji as the browser tab favicon
- **Language**: English and Vietnamese (i18n)
- Per-component **visibility toggles**: Clock, Search, Bookmarks, Bookmark Groups, Todo, Timer, Notepad, Calendar, Lunar Calendar, Music Player, Quick Access
- **Ghost mode** for side controls
- **Export / Import** settings as a JSON file
- Reset all settings to defaults
- Draggable component position persistence with reset option

---

## Installation

1. Download or clone this repository.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project folder.
5. Open a new tab — enjoy your Startpage!

---

## Tech Stack

- **Vanilla JavaScript** — no frameworks, no build step
- Chrome Extension **Manifest V3**
- Canvas API for animations and visualizer
- LocalStorage for all persistence
- Chrome Bookmarks API for browser import
- Chrome Media Session API for music detection

---

<!-- sound credit -->
<!-- https://pixabay.com/sound-effects/household-bedside-clock-alarm-95792/ -->
