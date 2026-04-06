---
description: Replaces purple themes with green, adds a 3D Pixel Cubes animation, and implements background brightness control in the Startpage extension.
---

# Tasks to Execute

1. **Replace Purple with Green:**
   - Review `styles/variables.css`, `src/services/state.js`, and `src/components/settings/effectColorHandlers.js` or `index.js`.
   - Identify default purple colors/themes and replace them with green equivalents.
2. **Implement 'Pixel Cubes' Canvas Effect:**
   - Create a new file at `src/components/animations/pixelCubes.js`.
   - Implement a rotating 3D 'Pixel Cubes' canvas animation class that adheres to the established `.start()`, `.stop()`, and `.resize()` interface used by other animation components.
   - Use `requestAnimationFrame` and ensure the canvas clears properly on each frame.

3. **Register the New Effect:**
   - Add the `<option>` for "Pixel Cubes" to the `effectSelect` dropdown in `index.html`.
   - Update `locales/en.json` and `locales/vi.json` to include translation keys for the "Pixel Cubes" effect name.
   - Ensure `src/utils/dom.js` exports any new DOM elements if necessary.
   - Wire up the effect instantiation in `src/components/settings/eventHandlers.js` or `src/components/settings/settingsApplier.js` within the `effect-select` change listener.

4. **Add Background Brightness/Ambient Lighting Control (có chỉnh sáng tối):**
   - Add a brightness slider to `index.html` (e.g., `<input type="range" id="bg-brightness-slider" min="0" max="1" step="0.1">`).
   - Add the translations for the brightness setting in `locales/en.json` and `locales/vi.json`.
   - Export this element in `src/utils/dom.js`.
   - Add a `bgBrightness` setting to the state management in `src/services/state.js` (defaulting to 1).
   - In `styles/base.css` or `styles/variables.css`, use CSS variables (like `--bg-brightness`) to apply a `brightness()` or `rgba(0,0,0, opacity)` overlay to the background element.
   - Bind the slider change event in `src/components/settings/eventHandlers.js` to update and save the state, and immediately apply the overlay opacity or brightness CSS variable.
