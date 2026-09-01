# Copilot Instructions - Startpage Extension

## Project Overview

**Startpage** is a Chrome extension that replaces the new tab page with a highly customizable, feature-rich startpage. It integrates widgets like a clock, bookmarks, to-do list, habit tracker, calendar, weather, RSS reader, music player, and terminal, along with dynamic backgrounds and animations.

**Type:** Chrome Extension (Manifest V3)
**Language:** Vanilla JavaScript (no frameworks)
**Key Tech:** DOM manipulation, LocalStorage, IndexedDB, Canvas animations, Fetch API, Chrome Extension APIs

---

## Architecture & Data Flow

### Core Initialization (`src/main.js` & `src/bootstrap.js`)

- `bootstrap.js` acts as an early initializer for performance-critical setup.
- `main.js` orchestrates component initialization on `DOMContentLoaded`.
- **Critical order:** `i18n` must load first as other components depend on translations.

### State Management (`src/services/state.js`)

- Single source of truth for app state using the `defaultSettings` object.
- **Storage pattern:** Uses `localStorage` (e.g., `"pageSettings"`, `"bookmarks"`).
- All state mutations must call `saveSettings()` to persist changes.
- Arrays (e.g., backgrounds, colors) must be initialized properly to prevent null reference errors.
- Syncs with Google Drive via `src/services/googleDriveSync.js` if user has authorized it.

### i18n System (`src/services/i18n.js`)

- Loads language JSON from `locales/{lang}.json` on demand.
- Fallbacks to English (`en.json`).
- Translation methods: `data-i18n="key"` (text) and `data-i18n-placeholder="key"` (placeholders).
- When adding UI elements, always add translation keys to `locales/en.json` and `locales/vi.json`, then call `applyTranslations()`.

### Component Pattern (`src/components/`)

Components (e.g., `bookmarks.js`, `todo.js`, `weather.js`, etc.) follow this generic pattern:

1. Import DOM references from `src/utils/dom.js`.
2. Import state/i18n services.
3. Export an `init{Component}()` function called from `main.js`.
4. Re-render or update state on changes via `getSettings()`, `updateSetting()`, and `saveSettings()`.

---

## Key Directories & Files

### Extension Core (Root)

- `background.js`: Service worker for background tasks and extension events.
- `content-media.js`: Content script for specific page interactions/media.
- `manifest.json`: MV3 configuration declaring permissions (bookmarks, storage, etc.).

### Services (`src/services/`)

- `state.js`: Core configuration and localStorage management.
- `i18n.js`: Localization system.
- `googleDriveSync.js`: Cloud backup functionality.
- `firstRun.js`: Onboarding logic.
- `imageStore.js`: Handling custom user image uploads via IndexedDB/Base64.

### UI Components (`src/components/`)

A vast collection of widgets and features:

- **Core widgets:** `clock.js`, `bookmarks.js`, `search.js`
- **Productivity:** `todo.js`, `notepad.js`, `habitTracker.js`, `timer.js`, `fullCalendar.js`
- **Utility:** `weather.js`, `rss.js`, `terminal.js`, `commandPalette.js`
- **Media:** `musicPlayer.js`, `visualizer.js`
- **UI Shell:** `contextMenu.js`, `modal.js`, `quotes.js`

### Settings Module (`src/components/settings/`)

- The settings panel is modularized inside the `settings/` folder.
- `src/components/settings.js` acts only as a wrapper/re-export for `src/components/settings/index.js`.
- Always update specific setting sub-modules when adding new preferences, rather than a single monolithic file.

### Animations (`src/components/animations/`)

- Canvas-based effects (Matrix, meteor, particles, etc.).
- Extend a common Canvas API, implementing `.start()` and `.stop()`.
- Must respond to window resizes (`.resize()`) and be performance-conscious (throttling, `requestAnimationFrame`).

### Utils (`src/utils/`)

- `dom.js`: Centralized DOM element references (extremely important to avoid `document.querySelector` scattering).
- `colors.js`: Color utilities (e.g., contrast calculation).
- `dialog.js`, `toast.js`: UI feedback utilities.
- `draggable.js`: Drag-and-drop mechanics.
- `lunarCalendar.js`: Lunar date conversions.
- `perfHud.js`: Performance monitoring utilities.

---

## Project-Specific Patterns & Conventions

### State Updates Pattern

```javascript
// Always follow this sequence:
updateSetting("key", value) // In-memory update
saveSettings() // Persist to localStorage
// Component re-renders automatically via event listeners or observers
```

### Adding a New Setting

1. Add key to `defaultSettings` in `state.js`.
2. Add DOM element to `index.html` with appropriate `data-i18n` attribute.
3. Export element reference in `src/utils/dom.js`.
4. Add event listener in the relevant `src/components/settings/` module.
5. Add translation keys to `locales/en.json` and `locales/vi.json`.

### Background Management

- Backgrounds are handled globally.
- Gradients use `gradientStart`, `gradientEnd`, `gradientAngle`.
- Changing a gradient configuration triggers a wipe of standard image backgrounds to ensure the gradient displays correctly.

---

## Developer Workflows

### Testing Changes

1. **Local testing:** Open `index.html` in browser for standalone UI testing. Note that Chrome Extension specific APIs (like Bookmarks or Background scripts) will throw errors or not function.
2. **Extension testing:** Load unpacked extension in Chrome (`chrome://extensions` → Load unpacked). Required for full functionality testing.
3. **Storage Reset:** Run `localStorage.clear()` in DevTools Console to reset settings to default if state becomes corrupted.

### Adding External Dependencies

- No bundler (Webpack/Vite) is used.
- Dependencies must be native APIs, CDN scripts (in `index.html`), or manual inline utility files.

---

## Important Quirks & Gotchas

1. **State Initialization:** Always verify array existence (e.g., `settingsState.userBackgrounds || []`).
2. **Case Sensitivity:** localStorage keys are precise (e.g., `"bookmarks"` not `"Bookmarks"`).
3. **i18n Timing:** Never use `geti18n()` before `initI18n()` resolves.
4. **DOM Access:** Avoid random `document.getElementById()` in components. Add your elements to `src/utils/dom.js` and import them.
5. **MV3 Restrictions:** Ensure background tasks comply with MV3 service worker lifecycles (they can go to sleep, meaning state cannot persist solely in memory inside `background.js`).
