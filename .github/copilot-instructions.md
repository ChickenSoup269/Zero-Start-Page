# Copilot Instructions - Startpage Extension

## Project Overview

**Startpage** is a Chrome extension that replaces the new tab page with a customizable, feature-rich startpage. It combines a clock, bookmark manager, dynamic backgrounds, and visual effects into a single, personalized interface.

**Type:** Chrome Extension (MV3)  
**Language:** Vanilla JavaScript (no frameworks)  
**Key Tech:** DOM manipulation, LocalStorage, Canvas animations, Fetch API

---

## Architecture & Data Flow

### Core Initialization (`src/main.js`)

- Entry point orchestrating component initialization on `DOMContentLoaded`
- **Critical order:** i18n must load first (other components depend on translations)
- Sequence: i18n → Clock → Bookmarks → Modal → ContextMenu → Settings

### State Management (`src/services/state.js`)

- Single source of truth for app state using `defaultSettings` object
- **Storage pattern:** Dual localStorage keys
  - `"bookmarks"` → bookmark array
  - `"pageSettings"` → settings object
- All state mutations should call `saveSettings()` to persist
- Arrays (`userBackgrounds`, `userColors`, `userGradients`) must be initialized to prevent null errors

### i18n System (`src/services/i18n.js`)

- Loads language JSON from `locales/{lang}.json` on demand
- Fallback to English if language unavailable
- Two translation methods:
  - `data-i18n="key"` → replaces `textContent`
  - `data-i18n-placeholder="key"` → replaces `placeholder` attribute
- New translations: add keys to `locales/en.json` and `locales/vi.json`, then call `applyTranslations()`

### Component Pattern

Each component (`bookmarks.js`, `clock.js`, `settings.js`) follows:

1. Import DOM references from `utils/dom.js`
2. Import state/i18n services
3. Export `init{Component}()` called from `main.js`
4. Re-render on state changes: `getSettings()` + `updateSetting(key, value)` + `saveSettings()`

**Example flow:** Settings sidebar → User picks color → `handleSettingUpdate()` → `updateSetting()` → `saveSettings()` → relevant components re-render

---

## Key Files & Their Responsibilities

| File                             | Purpose                                                      |
| -------------------------------- | ------------------------------------------------------------ |
| `src/utils/dom.js`               | Centralized DOM element references (113 lines of exports)    |
| `src/utils/colors.js`            | Color utilities (e.g., `getContrastYIQ()` for text contrast) |
| `src/components/settings.js`     | Massive settings panel (664 lines) - all UI customization    |
| `src/components/animations/*.js` | Canvas-based effects (Matrix, meteor, shooting stars, etc.)  |
| `style.css`                      | CSS custom properties; gradients and glass-morphism defaults |

---

## Project-Specific Patterns & Conventions

### State Updates Pattern

```javascript
// Always follow this sequence:
updateSetting("key", value) // In-memory update
saveSettings() // Persist to localStorage
// Component re-renders automatically via event listeners or direct calls
```

### Adding a New Setting

1. Add key to `defaultSettings` in `state.js`
2. Add DOM element to `index.html` with data-i18n attribute
3. Export element reference in `utils/dom.js`
4. Add event listener in `settings.js`
5. Call `updateSetting()` + `saveSettings()`
6. Add translation keys to `locales/{en,vi}.json`

### Animation Components

- All extend Canvas API, implement `.start()` and `.stop()` methods
- Store instance in global variable for access from settings
- Respond to color picker changes: `effect-select` triggers instantiation
- **Performance:** Use `requestAnimationFrame` with FPS throttling (see `matrixRain.js` for pattern)

### Gradient Customization

- Three settings work together: `gradientStart`, `gradientEnd`, `gradientAngle`
- Stored as separate keys in state (not nested object)
- CSS applies via `--bg-gradient` custom property
- `handleSettingUpdate(..., isGradient=true)` clears background image/color

---

## Developer Workflows

### Testing Changes

1. No build step required - vanilla JS served directly
2. **Local testing:** Open `index.html` in browser for standalone testing
3. **Extension testing:** Load unpacked extension in Chrome (DevTools → Extensions → Load unpacked → select folder)
4. **localStorage reset:** Open DevTools Console, run `localStorage.clear()`, refresh page

### Debugging Specific Components

- Settings panel most complex; check `settings.js` for effect initialization
- Bookmark import uses Chrome Bookmarks API; test via extension (not standalone)
- i18n fallback to English if JSON missing (check console for warnings)

### Adding External Dependencies

- No build system - dependencies must be:
  - Native browser APIs (Fetch, Canvas, DOM)
  - Embedded script (e.g., Font Awesome icons via CDN in `index.html`)
  - Inline utility functions in `utils/` or services

---

## Common Integration Points

### Bookmark Import

- Uses Chrome Bookmarks API (requires extension context + `"bookmarks"` permission in manifest.json)
- Falls back with user alert if API unavailable

### Icon Fallback

- Bookmark favicons: uses Google Favicon API `https://www.google.com/s2/favicons?domain={url}&sz=128`
- Double fallback in `bookmarks.js`: custom icon URL → favicon API

### Background Management

- Types: local preset (id: `local-bg-*`), color hex, image URL, gradient
- Stored as single `background` key in settings
- Special handling for gradients: use `gradientStart/End/Angle` instead

### Effect Triggers

- `effectSelect` dropdown change → instantiate animation class → call `.start()`
- Previous effect `.stop()` called before starting new one
- Canvas always ready: `<canvas id="effect-canvas" hidden></canvas>` in `index.html`

---

## Important Quirks & Gotchas

1. **State initialization:** Always check arrays exist before iterating (e.g., `settingsState.userBackgrounds || []`)
2. **localStorage keys are case-sensitive:** `"bookmarks"` not `"Bookmarks"`
3. **i18n timing:** Never use `geti18n()` before `initI18n()` completes (already managed in `main.js`)
4. **CSS gradient animation:** `animation: gradientBG` loops infinitely; disable with `.bg-image-active`
5. **Canvas sizing:** Animations must call `.resize()` on window resize event
6. **Bookmark favicon errors:** `onerror` attribute must use inline JS (not event listener) in generated HTML

---

## Getting Started for Contributors

1. **Add a new visual theme:** Edit `style.css` CSS variables, or add preset to `localBackgrounds` array in `state.js`
2. **Add a new animation:** Create class in `src/components/animations/`, export `.start()/.stop()`, add option to `effectSelect` in `settings.js`
3. **Fix a UI bug:** Check `index.html` for element IDs, find corresponding export in `utils/dom.js`, trace event listener in component
4. **Extend settings:** Follow "Adding a New Setting" pattern above

---

## Manifest & Permissions

- **MV3 compliance:** No background scripts, content scripts, or service workers
- **Permissions:** Only `"bookmarks"` (for browser bookmark import)
- **Chrome override:** `chrome_url_overrides.newtab` points to `index.html`
