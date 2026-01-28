// src/services/noteStorage.js

/**
 * Represents a single note.
 */
export class Note {
    /**
     * @param {string} title - The title of the note.
     * @param {string} content - The content of the note.
     * @param {object} options - Optional styling and ID parameters.
     * @param {string|null} options.id - The unique ID of the note. Auto-generated if null.
     * @param {string} options.backgroundColor - The background color of the note.
     * @param {boolean} options.isBold - Whether the note text is bold.
     * @param {boolean} options.isItalic - Whether the note text is italic.
     * @param {boolean} options.isUnderline - Whether the note text is underlined.
     * @param {boolean} options.isStrikethrough - Whether the note text is strikethrough.
     * @param {boolean} options.isBulleted - Whether the note content is a bulleted list.
     * @param {boolean} options.isOpenOnDesktop - Whether the note is currently displayed as a draggable element on the desktop.
     * @param {object} options.desktopPosition - The {top, left} position of the desktop note.
     * @param {object} options.desktopSize - The {width, height} size of the desktop note.
     */
    constructor(title, content, { id = null, backgroundColor = '#ffc', isBold = false, isItalic = false, isUnderline = false, isStrikethrough = false, isBulleted = false, isOpenOnDesktop = false, desktopPosition = { top: '20px', left: '20px' }, desktopSize = { width: '250px', height: '250px' } } = {}) {
        this.id = id || `note-${Date.now()}`;
        this.title = title;
        this.content = content;
        this.createdAt = new Date().toISOString();
        this.backgroundColor = backgroundColor;
        this.isBold = isBold;
        this.isItalic = isItalic;
        this.isUnderline = isUnderline;
        this.isStrikethrough = isStrikethrough;
        this.isBulleted = isBulleted;
        this.isOpenOnDesktop = isOpenOnDesktop;
        this.desktopPosition = desktopPosition;
        this.desktopSize = desktopSize;
    }
}

/**
 * Handles all interactions with chrome.storage.local for notes.
 * The data is stored under a single key 'notes_manager_data' as an object
 * where keys are note IDs and values are the note objects.
 */
export class NoteStorage {
    constructor() {
        this.storageKey = 'notes_manager_data';
    }

    /**
     * Retrieves all notes from storage.
     * @returns {Promise<Note[]>} A promise that resolves to an array of notes.
     */
    async getAll() {
        return new Promise((resolve) => {
            const processNotes = (notesMap) => {
                const notesArray = Object.values(notesMap);
                resolve(notesArray.map(n => new Note(n.title, n.content, {
                    id: n.id,
                    backgroundColor: n.backgroundColor || '#ffc', // Default
                    isBold: n.isBold || false,
                    isItalic: n.isItalic || false,
                    isUnderline: n.isUnderline || false,
                    isStrikethrough: n.isStrikethrough || false,
                    isBulleted: n.isBulleted || false,
                    isOpenOnDesktop: n.isOpenOnDesktop || false, // Default
                    desktopPosition: n.desktopPosition || { top: '20px', left: '20px' },
                    desktopSize: n.desktopSize || { width: '250px', height: '250px' }
                })));
            };

            if (chrome.storage && chrome.storage.local) {
                chrome.storage.local.get([this.storageKey], (result) => {
                    const notesMap = result[this.storageKey] || {};
                    processNotes(notesMap);
                });
            } else {
                console.warn("chrome.storage.local not available. Using localStorage for development.");
                const notesJson = localStorage.getItem(this.storageKey);
                const notesMap = notesJson ? JSON.parse(notesJson) : {};
                processNotes(notesMap);
            }
        });
    }

    /**
     * Saves a note to storage. Handles both creation and updates.
     * @param {Note} note - The note object to save.
     * @returns {Promise<void>}
     */
    async save(note) {
        const allNotes = await this.getAll(); // Get all notes, including defaults applied by constructor
        const notesMap = allNotes.reduce((acc, n) => ({ ...acc, [n.id]: n }), {});
        
        // Ensure that existing properties are merged with the new note object
        notesMap[note.id] = { ...notesMap[note.id], ...note };

        return new Promise((resolve) => {
            if (chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ [this.storageKey]: notesMap }, () => {
                    resolve();
                });
            } else {
                localStorage.setItem(this.storageKey, JSON.stringify(notesMap));
                resolve();
            }
        });
    }

    /**
     * Deletes a note from storage by its ID.
     * @param {string} noteId - The ID of the note to delete.
     * @returns {Promise<void>}
     */
    async delete(noteId) {
        const notes = await this.getAll();
        const notesMap = notes.reduce((acc, n) => ({ ...acc, [n.id]: n }), {});
        delete notesMap[noteId];

        return new Promise((resolve) => {
            if (chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ [this.storageKey]: notesMap }, () => {
                    resolve();
                });
            } else {
                localStorage.setItem(this.storageKey, JSON.stringify(notesMap));
                resolve();
            }
        });
    }
}
