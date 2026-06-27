import { initI18n } from "./src/services/i18n.js";
import { Notepad } from "./src/components/notepad.js";

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize i18n
    await initI18n();

    // Initialize the Notepad component
    const notepad = new Notepad();
    
    // For Sidepanel, we want to ensure notepad is always visible
    notepad.isVisible = true;
    notepad.updateVisibility();
    
    // Listen to storage changes from other contexts (like the main new tab page)
    window.addEventListener('storage', (e) => {
        if (e.key === 'notepadNotes' || e.key === 'detachedNotes' || e.key === 'hiddenNotes' || e.key === 'hiddenEditToolbars') {
            // Need to re-read and render
            notepad.notes = JSON.parse(localStorage.getItem("notepadNotes")) || [];
            notepad.detachedNotes = JSON.parse(localStorage.getItem("detachedNotes")) || {};
            notepad.hiddenNotes = JSON.parse(localStorage.getItem("hiddenNotes")) || {};
            notepad.hiddenEditToolbars = JSON.parse(localStorage.getItem("hiddenEditToolbars")) || {};
            notepad.render();
            
            // Render floating notes in sidepanel if any 
            Object.values(notepad.floatingNotes).forEach(el => el.remove());
            notepad.floatingNotes = {};
            notepad.renderDetachedNotes();
        }
    });
});
