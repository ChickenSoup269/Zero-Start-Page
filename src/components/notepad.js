import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { geti18n } from "../services/i18n.js"
import { makeDraggable } from "../utils/draggable.js"
import { showConfirm, showPrompt } from "../utils/dialog.js"
import { fadeToggle } from "../utils/dom.js"

export class Notepad {
  // 8 Default colors for notes
  static COLORS = [
    "#FF6B6B", // Red
    "#4ECDC4", // Teal
    "#45B7D1", // Blue
    "#FFA07A", // Salmon
    "#98D8C8", // Mint
    "#F7DC6F", // Yellow
    "#BB8FCE", // Purple
    "#85C1E2", // Light Blue
  ]

  constructor() {
    this.notes = JSON.parse(localStorage.getItem("notepadNotes")) || []
    this.detachedNotes = JSON.parse(localStorage.getItem("detachedNotes")) || {} // { noteId: true }
    this.hiddenNotes = JSON.parse(localStorage.getItem("hiddenNotes")) || {} // { noteId: true }
    this.collapsedFloatingNotes =
      JSON.parse(localStorage.getItem("collapsedFloatingNotes")) || {} // { noteId: true }
    this.hiddenEditToolbars =
      JSON.parse(localStorage.getItem("hiddenEditToolbars")) || {} // { noteId: true }
    this.noteDimensions =
      JSON.parse(localStorage.getItem("notepadNoteDimensions")) || {} // { noteId: { width, height } }
    this.isVisible = getSettings().showNotepad !== false
    this.container = null
    this.floatingNotes = {} // Store floating note containers
    this.init()
  }

  init() {
    this.createElements()
    this.render()
    this.setupEventListeners()
    this.updateVisibility()
    this.applySkin()
    this.renderDetachedNotes()

    // Close dropdowns when clicking outside
    document.addEventListener("click", () => {
      document.querySelectorAll(".note-color-menu.show").forEach((menu) => {
        menu.classList.remove("show")
      })
    })
  }

  createElements() {
    this.container = document.getElementById("notepad-container")
    if (!this.container) {
      this.container = document.createElement("div")
      this.container.id = "notepad-container"
      this.container.className = "notepad-container"
      document.body.appendChild(this.container)
    }

    this.container.innerHTML = `
      <div class="notepad-header drag-handle">
        <h3 data-i18n="notepad_title">Notepad</h3>
        <button id="add-note-btn" class="icon-btn" title="Add Note"><i class="fa-solid fa-plus"></i></button>
      </div>
      <div class="notepad-body">
        <div class="notes-list"></div>
      </div>
    `
  }

  setupEventListeners() {
    const addBtn = this.container.querySelector("#add-note-btn")
    addBtn.addEventListener("click", () => this.addNote())

    window.addEventListener("layoutUpdated", (e) => {
      if (e.detail.key === "showNotepad") {
        this.isVisible = e.detail.value
        this.updateVisibility()
      }
      if (e.detail.key === "notepadSkin") {
        this.applySkin()
      }
    })
  }

  applySkin() {
    const settings = getSettings()
    const isWhiteMode = settings.showQuickAccessBg === true
    const skin = settings.widgetUseM3Accent === true
      ? "m3-accent"
      : isWhiteMode ? "white-blur" : settings.notepadSkin || "default"

    this.container.classList.toggle("skin-white-blur", skin === "white-blur")
    this.container.classList.toggle("skin-m3-accent", skin === "m3-accent")
    this.container.classList.toggle("skin-light-transparent", skin === "light-transparent")
  }

  addNote() {
    const note = {
      id: Date.now(),
      title: "Untitled Note",
      content: "",
      color: "#F7DC6F", // Default yellow
      contentBg: "#FFFFFF", // Default white background
      createdAt: new Date().toISOString(),
    }
    this.notes.push(note)
    this.saveNotes()
    this.render()

    // Auto-focus on the new note for editing
    setTimeout(() => {
      const noteElement = this.container.querySelector(
        `[data-note-id="${note.id}"]`,
      )
      if (noteElement) {
        const titleInput = noteElement.querySelector(".note-title-input")
        if (titleInput) titleInput.focus()
      }
    }, 100)
  }

  async deleteNote(id) {
    const i18n = geti18n()
    const confirmed = await showConfirm(
      i18n.notepad_delete_confirm || "Delete this note?",
    )
    if (!confirmed) return

    this.notes = this.notes.filter((n) => n.id !== id)
    delete this.detachedNotes[id]
    delete this.hiddenNotes[id]
    delete this.hiddenEditToolbars[id]
    delete this.collapsedFloatingNotes[id]
    delete this.noteDimensions[id]
    if (this.floatingNotes[id]) {
      this.floatingNotes[id].remove()
      delete this.floatingNotes[id]
    }
    this.saveNotes()
    this.saveDetachedState()
    this.saveHiddenState()
    this.saveHiddenEditToolbarState()
    this.saveCollapsedFloatingState()
    this.saveNoteDimensions()
    this.render()
  }

  updateNote(id, updates) {
    if (typeof updates.content === "string") {
      updates.content = this.normalizeNoteContentHtml(updates.content)
    }
    this.notes = this.notes.map((n) => (n.id === id ? { ...n, ...updates } : n))
    this.saveNotes()
  }

  toggleHidden(id) {
    if (this.hiddenNotes[id]) {
      delete this.hiddenNotes[id]
    } else {
      this.hiddenNotes[id] = true
    }
    this.saveHiddenState()
    this.render()
  }

  saveNotes() {
    localStorage.setItem("notepadNotes", JSON.stringify(this.notes))
  }

  saveDetachedState() {
    localStorage.setItem("detachedNotes", JSON.stringify(this.detachedNotes))
  }

  saveHiddenState() {
    localStorage.setItem("hiddenNotes", JSON.stringify(this.hiddenNotes))
  }

  saveCollapsedFloatingState() {
    localStorage.setItem(
      "collapsedFloatingNotes",
      JSON.stringify(this.collapsedFloatingNotes),
    )
  }

  saveHiddenEditToolbarState() {
    localStorage.setItem(
      "hiddenEditToolbars",
      JSON.stringify(this.hiddenEditToolbars),
    )
  }

  saveNoteDimensions() {
    if (window.location.pathname.includes("sidepanel.html")) return;
    localStorage.setItem(
      "notepadNoteDimensions",
      JSON.stringify(this.noteDimensions),
    )
  }

  updateVisibility() {
    fadeToggle(this.container, this.isVisible, "flex")
  }

  detachNote(noteId) {
    this.detachedNotes[noteId] = true
    this.saveDetachedState()
    this.render()
    this.renderDetachedNote(noteId)
  }

  reattachNote(noteId) {
    delete this.detachedNotes[noteId]
    this.saveDetachedState()

    // Remove floating window
    if (this.floatingNotes[noteId]) {
      this.floatingNotes[noteId].remove()
      delete this.floatingNotes[noteId]
    }

    this.render()
  }

  renderDetachedNotes() {
    Object.keys(this.detachedNotes).forEach((noteId) => {
      this.renderDetachedNote(parseInt(noteId))
    })
  }

  renderDetachedNote(noteId) {
    const note = this.notes.find((n) => n.id === noteId)
    if (!note) return

    const floatingContainer = document.createElement("div")
    floatingContainer.id = `floating-note-${noteId}`
    floatingContainer.className = "floating-note-window"
    const isCollapsed = this.collapsedFloatingNotes[noteId]
    const isEditToolbarHidden = this.hiddenEditToolbars[noteId]
    if (isCollapsed) floatingContainer.classList.add("collapsed")
    if (isEditToolbarHidden) floatingContainer.classList.add("edit-toolbar-hidden")

    floatingContainer.innerHTML = `
      <div class="floating-note-header drag-handle">
        <div class="floating-note-actions">
          <div class="note-color-dropdown">
            <button class="icon-btn note-color-trigger" title="Change Color">
              <i class="fa-solid fa-palette"></i>
            </button>
            <div class="note-color-menu">
              ${Notepad.COLORS.map(
                (color) => `
                <button class="note-color-btn ${note.color === color ? "active" : ""}"
                        data-color="${color}"
                        style="background-color: ${color}"
                        title="${color}"></button>
              `,
              ).join("")}
            </div>
          </div>
          <button class="icon-btn" data-action="toggle-bg" title="Toggle background (White/Black)"><i class="fa-solid ${note.contentBg === "#FFFFFF" || (!note.contentBg && this.getContrastColor(note.color) === "#000000") ? "fa-sun" : "fa-moon"}"></i></button>
          <button class="icon-btn" data-action="toggle-edit-toolbar" title="Toggle edit toolbar"><i class="fa-solid ${isEditToolbarHidden ? "fa-pen-to-square" : "fa-pen"}"></i></button>
          <button class="icon-btn floating-note-collapse" data-action="toggle-collapse" title="Collapse/Expand"><i class="fa-solid ${isCollapsed ? "fa-chevron-down" : "fa-chevron-up"}"></i></button>
          <button class="icon-btn floating-note-close" title="Reattach"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="floating-note-title-row">
          <span class="floating-note-title">${this.escapeHtml(note.title)}</span>
        </div>
      </div>
      <div class="floating-note-toolbar">
        <button class="toolbar-btn" data-command="bold" title="Bold"><i class="fa-solid fa-bold"></i></button>
        <button class="toolbar-btn" data-command="italic" title="Italic"><i class="fa-solid fa-italic"></i></button>
        <button class="toolbar-btn" data-command="underline" title="Underline"><i class="fa-solid fa-underline"></i></button>
        <button class="toolbar-btn" data-command="strikeThrough" title="Strikethrough"><i class="fa-solid fa-strikethrough"></i></button>
        <span class="toolbar-divider"></span>
        <button class="toolbar-btn" data-command="justifyLeft" title="Align Left"><i class="fa-solid fa-align-left"></i></button>
        <button class="toolbar-btn" data-command="justifyCenter" title="Align Center"><i class="fa-solid fa-align-center"></i></button>
        <button class="toolbar-btn" data-command="justifyRight" title="Align Right"><i class="fa-solid fa-align-right"></i></button>
        <span class="toolbar-divider"></span>
        <button class="toolbar-btn" data-command="insertUnorderedList" title="Bullet List"><i class="fa-solid fa-list-ul"></i></button>
        <button class="toolbar-btn" data-command="insertOrderedList" title="Numbered List"><i class="fa-solid fa-list-ol"></i></button>
        <button class="toolbar-btn" data-action="indent" title="Indent"><i class="fa-solid fa-indent"></i></button>
        <button class="toolbar-btn" data-action="outdent" title="Outdent"><i class="fa-solid fa-outdent"></i></button>
        <span class="toolbar-divider"></span>
        <button class="toolbar-btn" data-action="create-link" title="Insert Link"><i class="fa-solid fa-link"></i></button>
        <button class="toolbar-btn" data-action="insert-image" title="Insert Image"><i class="fa-solid fa-image"></i></button>
        <button class="toolbar-btn" data-command="removeFormat" title="Clear Formatting"><i class="fa-solid fa-eraser"></i></button>
      </div>
      <div class="floating-note-content" contenteditable="true">${note.content}</div>
      ${this.getResizeHandlesHtml()}
    `

    document.body.appendChild(floatingContainer)
    this.floatingNotes[noteId] = floatingContainer

    // Restore saved dimensions if available
    const savedDimensions = localStorage.getItem(
      `floating-note-${noteId}-dimensions`,
    )
    if (savedDimensions) {
      try {
        const { width, height, top, right, left } = JSON.parse(savedDimensions)
        floatingContainer.style.width = width
        floatingContainer.style.height = height
        floatingContainer.style.top = top
        if (left) {
          floatingContainer.style.left = left
          floatingContainer.style.right = "auto"
        } else {
          floatingContainer.style.right = right
        }
      } catch (e) {
        console.error("Error restoring floating note dimensions:", e)
      }
    }

    // Save dimensions on resize
    const observer = new ResizeObserver(() => {
      const dimensions = {
        width: floatingContainer.style.width || "420px",
        height: floatingContainer.style.height || "auto",
        top: floatingContainer.style.top || "150px",
        right: floatingContainer.style.right || "30px",
        left: floatingContainer.style.left || null,
      }
      if (!window.location.pathname.includes("sidepanel.html")) {
        localStorage.setItem(
          `floating-note-${noteId}-dimensions`,
          JSON.stringify(dimensions),
        )
      }
    })
    observer.observe(floatingContainer)

    // Apply color to floating header
    const floatingHeader = floatingContainer.querySelector(
      ".floating-note-header",
    )
    if (floatingHeader) {
      this.applyNoteHeaderTheme(floatingHeader, note.color)
    }

    // Make draggable
    makeDraggable(
      floatingContainer,
      `floating-note-${noteId}`,
      null,
      ".floating-note-header",
    )
    this.setupManualResize(floatingContainer, noteId, true)

    // Setup event listeners
    const closeBtn = floatingContainer.querySelector(".floating-note-close")
    closeBtn.addEventListener("click", () => this.reattachNote(noteId))

    const collapseBtn = floatingContainer.querySelector(
      '[data-action="toggle-collapse"]',
    )
    if (collapseBtn) {
      collapseBtn.addEventListener("click", () => {
        const isNowCollapsed = !floatingContainer.classList.contains("collapsed")
        floatingContainer.classList.toggle("collapsed", isNowCollapsed)

        if (isNowCollapsed) {
          this.collapsedFloatingNotes[noteId] = true
        } else {
          delete this.collapsedFloatingNotes[noteId]
        }
        this.saveCollapsedFloatingState()

        const icon = collapseBtn.querySelector("i")
        if (icon) {
          icon.className =
            "fa-solid " + (isNowCollapsed ? "fa-chevron-down" : "fa-chevron-up")
        }
      })
    }

    this.setupEditToolbarToggle(floatingContainer, noteId)

    // Toggle background button
    const bgToggleBtn = floatingContainer.querySelector(
      '[data-action="toggle-bg"]',
    )
    const contentDiv = floatingContainer.querySelector(".floating-note-content")

    // Initialize content background and text color
    if (contentDiv) {
      this.applyNoteContentTheme(note, floatingContainer)
    }

    if (bgToggleBtn) {
      bgToggleBtn.addEventListener("click", () => {
        // Get the latest note data from storage
        const latestNote = this.notes.find((n) => n.id === noteId)
        const currentBg =
          latestNote.contentBg ||
          (this.getContrastColor(latestNote.color) === "#000000"
            ? "#FFFFFF"
            : "#000000")
        const newBg = currentBg === "#FFFFFF" ? "#000000" : "#FFFFFF"
        this.updateNote(noteId, { contentBg: newBg })

        // Update icon
        const bgIcon = bgToggleBtn.querySelector("i")
        bgIcon.className =
          "fa-solid " + (newBg === "#FFFFFF" ? "fa-sun" : "fa-moon")

        // Update content styling immediately with !important
        if (contentDiv) {
          this.applyNoteContentTheme({ ...latestNote, contentBg: newBg }, floatingContainer)
        }
      })
    }

    // Color dropdown toggle
    const colorTrigger = floatingContainer.querySelector(".note-color-trigger")
    const colorMenu = floatingContainer.querySelector(".note-color-menu")
    if (colorTrigger && colorMenu) {
      colorTrigger.addEventListener("click", (e) => {
        e.stopPropagation()
        colorMenu.classList.toggle("show")
      })
    }

    // Color picker buttons
    floatingContainer.querySelectorAll(".note-color-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation()
        const newColor = btn.dataset.color
        this.updateNote(noteId, { color: newColor })

        // Update floating header color and icon colors
        const floatingHeader = floatingContainer.querySelector(
          ".floating-note-header",
        )
        if (floatingHeader) {
          this.applyNoteHeaderTheme(floatingHeader, newColor)
        }

        // Update floating note content background
        const floatingContent = floatingContainer.querySelector(
          ".floating-note-content",
        )
        if (floatingContent) {
          const latestNote = this.notes.find((n) => n.id === noteId) || note
          this.applyNoteContentTheme(latestNote, floatingContainer)
        }

        // Update active state
        floatingContainer
          .querySelectorAll(".note-color-btn")
          .forEach((b) => b.classList.remove("active"))
        btn.classList.add("active")
        // Close dropdown
        colorMenu.classList.remove("show")
      })
    })

    // Set content input listener (already initialized above with styles)
    contentDiv.addEventListener("input", () => {
      this.normalizeEditorImages(contentDiv)
      this.updateNote(noteId, { content: contentDiv.innerHTML })
    })

    const titleSpan = floatingContainer.querySelector(".floating-note-title")
    titleSpan.addEventListener("blur", () => {
      this.updateNote(noteId, { title: titleSpan.textContent })
    })
    titleSpan.contentEditable = true

    this.setupEditorToolbar(floatingContainer, contentDiv, noteId)
  }

  renderNote(note) {
    const isHidden = this.hiddenNotes[note.id]
    const isDetached = this.detachedNotes[note.id]

    if (isDetached) return null // Don't render detached notes in parent

    const noteDiv = document.createElement("div")
    noteDiv.className = "note-item"
    noteDiv.setAttribute("data-note-id", note.id)

    const savedDimensions = this.noteDimensions[note.id]
    if (savedDimensions) {
      if (savedDimensions.height) noteDiv.style.height = savedDimensions.height
    }

    noteDiv.innerHTML = `
      <div class="note-header">
        <input type="text" id="note-title-${note.id}" name="note-title-${note.id}" class="note-title-input" value="${this.escapeHtml(note.title)}" placeholder="Note Title">
        <div class="note-actions">
          <div class="note-color-dropdown">
            <button class="icon-btn note-action-btn note-color-trigger" title="Change Color">
              <i class="fa-solid fa-palette"></i>
            </button>
            <div class="note-color-menu">
              ${Notepad.COLORS.map(
                (color) => `
                <button class="note-color-btn ${note.color === color ? "active" : ""}" 
                        data-color="${color}" 
                        style="background-color: ${color}" 
                        title="${color}"></button>
              `,
              ).join("")}
            </div>
          </div>
          <button class="icon-btn note-action-btn" data-action="toggle-bg" title="Toggle background (White/Black)">
            <i class="fa-solid ${note.contentBg === "#FFFFFF" || (!note.contentBg && this.getContrastColor(note.color) === "#000000") ? "fa-sun" : "fa-moon"}"></i>
          </button>
          <button class="icon-btn note-action-btn" data-action="toggle-hidden" title="Toggle hide/show">
            <i class="fa-solid fa-eye${isHidden ? "-slash" : ""}"></i>
          </button>
          <button class="icon-btn note-action-btn" data-action="detach" title="Pop out">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </button>
          <button class="icon-btn note-action-btn" data-action="delete" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      ${
        isHidden
          ? ""
          : `<div class="note-content" contenteditable="true">${note.content}</div>`
      }
      ${this.getResizeHandlesHtml()}
    `

    // Apply color to header
    const headerDiv = noteDiv.querySelector(".note-header")
    if (headerDiv) {
      this.applyNoteHeaderTheme(headerDiv, note.color)
    }

    // Event listeners
    const titleInput = noteDiv.querySelector(".note-title-input")
    titleInput.addEventListener("change", () => {
      this.updateNote(note.id, { title: titleInput.value })
    })

    this.applyNoteContentTheme(note, noteDiv)
    this.setupNoteResizeObserver(noteDiv, note.id)
    this.setupManualResize(noteDiv, note.id, false)

    const contentDiv = noteDiv.querySelector(".note-content")
    if (contentDiv) {
      contentDiv.addEventListener("input", () => {
        this.normalizeEditorImages(contentDiv)
        this.updateNote(note.id, { content: contentDiv.innerHTML })
      })

      this.setupEditorToolbar(noteDiv, contentDiv, note.id)
    }

    // Toggle background color button
    const bgToggleBtn = noteDiv.querySelector('[data-action="toggle-bg"]')
    if (bgToggleBtn) {
      bgToggleBtn.addEventListener("click", () => {
        // Get the latest note data from storage
        const latestNote = this.notes.find((n) => n.id === note.id)
        const currentBg =
          latestNote.contentBg ||
          (this.getContrastColor(latestNote.color) === "#000000"
            ? "#FFFFFF"
            : "#000000")
        const newBg = currentBg === "#FFFFFF" ? "#000000" : "#FFFFFF"
        this.updateNote(note.id, { contentBg: newBg })

        // Update icon
        const bgIcon = bgToggleBtn.querySelector("i")
        bgIcon.className =
          "fa-solid " + (newBg === "#FFFFFF" ? "fa-sun" : "fa-moon")

        // Update content styling with !important to override CSS
        const contentDiv = noteDiv.querySelector(".note-content")
        if (contentDiv) {
          this.applyNoteContentTheme({ ...latestNote, contentBg: newBg }, noteDiv)
        }
      })
    }

    // Color dropdown toggle
    const colorTrigger = noteDiv.querySelector(".note-color-trigger")
    const colorMenu = noteDiv.querySelector(".note-color-menu")
    if (colorTrigger && colorMenu) {
      colorTrigger.addEventListener("click", (e) => {
        e.stopPropagation()
        // Close other dropdowns
        document.querySelectorAll(".note-color-menu.show").forEach((menu) => {
          if (menu !== colorMenu) menu.classList.remove("show")
        })
        colorMenu.classList.toggle("show")
      })
    }

    // Color picker buttons
    noteDiv.querySelectorAll(".note-color-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation()
        const newColor = btn.dataset.color
        this.updateNote(note.id, { color: newColor })

        // Update header color and icon colors
        const headerDiv = noteDiv.querySelector(".note-header")
        if (headerDiv) {
          this.applyNoteHeaderTheme(headerDiv, newColor)
        }

        // Update note-content background and text
        const contentDiv = noteDiv.querySelector(".note-content")
        if (contentDiv) {
          const latestNote = this.notes.find((n) => n.id === note.id) || note
          this.applyNoteContentTheme(latestNote, noteDiv)
        }

        // Update active state
        noteDiv
          .querySelectorAll(".note-color-btn")
          .forEach((b) => b.classList.remove("active"))
        btn.classList.add("active")
        // Close dropdown
        colorMenu.classList.remove("show")
      })
    })

    // Action buttons
    const toggleBtn = noteDiv.querySelector('[data-action="toggle-hidden"]')
    toggleBtn.addEventListener("click", () => this.toggleHidden(note.id))

    const detachBtn = noteDiv.querySelector('[data-action="detach"]')
    detachBtn.addEventListener("click", () => this.detachNote(note.id))

    const deleteBtn = noteDiv.querySelector('[data-action="delete"]')
    deleteBtn.addEventListener("click", () => this.deleteNote(note.id))

    return noteDiv
  }

  render() {
    const notesList = this.container.querySelector(".notes-list")
    notesList.innerHTML = ""

    if (this.notes.length === 0) {
      notesList.innerHTML = `<p class="notes-empty" data-i18n="notepad_empty">No notes yet. Click + to add one.</p>`
      return
    }

    this.notes.forEach((note) => {
      const noteElement = this.renderNote(note)
      if (noteElement) {
        notesList.appendChild(noteElement)
      }
    })
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  getContentBg(note) {
    if (note.contentBg === "#000000" || note.contentBg === "#FFFFFF") {
      return note.contentBg
    }

    return this.getContrastColor(note.color) === "#000000"
      ? "#FFFFFF"
      : "#000000"
  }

  getContentTextColor(contentBg) {
    return contentBg === "#FFFFFF" ? "#000000" : "#FFFFFF"
  }

  setupEditToolbarToggle(root, noteId) {
    const toggleBtn = root.querySelector('[data-action="toggle-edit-toolbar"]')
    if (!toggleBtn) return

    toggleBtn.addEventListener("click", () => {
      const isHidden = !root.classList.contains("edit-toolbar-hidden")
      root.classList.toggle("edit-toolbar-hidden", isHidden)

      if (isHidden) {
        this.hiddenEditToolbars[noteId] = true
      } else {
        delete this.hiddenEditToolbars[noteId]
      }
      this.saveHiddenEditToolbarState()

      const icon = toggleBtn.querySelector("i")
      if (icon) {
        icon.className =
          "fa-solid " + (isHidden ? "fa-pen-to-square" : "fa-pen")
      }
    })
  }

  setupNoteResizeObserver(noteDiv, noteId) {
    if (!window.ResizeObserver) return

    const observer = new ResizeObserver(() => {
      const { width, height } = noteDiv.getBoundingClientRect()
      if (width <= 0 || height <= 0) return

      this.noteDimensions[noteId] = {
        height: `${Math.round(height)}px`,
      }
      this.saveNoteDimensions()
    })
    observer.observe(noteDiv)
  }

  getResizeHandlesHtml() {
    return `
      <span class="note-resize-handle note-resize-nw" data-resize-corner="nw"></span>
      <span class="note-resize-handle note-resize-ne" data-resize-corner="ne"></span>
      <span class="note-resize-handle note-resize-sw" data-resize-corner="sw"></span>
      <span class="note-resize-handle note-resize-se" data-resize-corner="se"></span>
    `
  }

  setupManualResize(root, noteId, isFloating = false) {
    const handles = root.querySelectorAll(".note-resize-handle")
    if (handles.length === 0) return

    handles.forEach((handle) => {
      handle.addEventListener("mousedown", (e) => {
        e.preventDefault()
        e.stopPropagation()

        const corner = handle.dataset.resizeCorner || "se"
        const rect = root.getBoundingClientRect()
        const startX = e.clientX
        const startY = e.clientY
        const startWidth = rect.width
        const startHeight = rect.height
        const startLeft = rect.left
        const startTop = rect.top
        const minWidth = isFloating ? 300 : 260
        const minHeight = isFloating ? 120 : 128

        root.classList.add("resizing")
        root.style.transition = "none"

        if (isFloating) {
          root.style.left = `${startLeft}px`
          root.style.top = `${startTop}px`
          root.style.right = "auto"
          root.style.bottom = "auto"
        }

        const onMouseMove = (moveEvent) => {
          moveEvent.preventDefault()

          const dx = moveEvent.clientX - startX
          const dy = moveEvent.clientY - startY
          let nextWidth = startWidth
          let nextHeight = startHeight
          let nextLeft = startLeft
          let nextTop = startTop

          if (corner.includes("e")) nextWidth = startWidth + dx
          if (corner.includes("w")) {
            nextWidth = startWidth - dx
            if (isFloating) nextLeft = startLeft + dx
          }
          if (corner.includes("s")) nextHeight = startHeight + dy
          if (corner.includes("n")) {
            nextHeight = startHeight - dy
            if (isFloating) nextTop = startTop + dy
          }

          if (nextWidth < minWidth) {
            if (isFloating && corner.includes("w")) {
              nextLeft -= minWidth - nextWidth
            }
            nextWidth = minWidth
          }

          if (nextHeight < minHeight) {
            if (isFloating && corner.includes("n")) {
              nextTop -= minHeight - nextHeight
            }
            nextHeight = minHeight
          }

          root.style.width = `${Math.round(nextWidth)}px`
          root.style.height = `${Math.round(nextHeight)}px`

          if (isFloating) {
            root.style.left = `${Math.round(nextLeft)}px`
            root.style.top = `${Math.round(nextTop)}px`
          }
        }

        const onMouseUp = () => {
          document.removeEventListener("mousemove", onMouseMove)
          document.removeEventListener("mouseup", onMouseUp)
          root.classList.remove("resizing")
          root.style.transition = ""

          if (isFloating) {
            const dimensions = {
              width: root.style.width || `${Math.round(root.offsetWidth)}px`,
              height: root.style.height || `${Math.round(root.offsetHeight)}px`,
              top: root.style.top || `${Math.round(root.getBoundingClientRect().top)}px`,
              right: root.style.right || "auto",
              left: root.style.left || `${Math.round(root.getBoundingClientRect().left)}px`,
            }
            if (!window.location.pathname.includes("sidepanel.html")) {
              localStorage.setItem(
                `floating-note-${noteId}-dimensions`,
                JSON.stringify(dimensions),
              )
            }
          } else {
            this.noteDimensions[noteId] = {
              height: root.style.height || `${Math.round(root.offsetHeight)}px`,
            }
            this.saveNoteDimensions()
          }
        }

        document.addEventListener("mousemove", onMouseMove)
        document.addEventListener("mouseup", onMouseUp)
      })
    })
  }

  setupEditorToolbar(root, contentDiv, noteId) {
    if (!contentDiv) return

    let savedRange = null
    const toolbarButtons = Array.from(root.querySelectorAll(".toolbar-btn"))

    const saveRange = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      const container = range.commonAncestorContainer
      const selectionNode =
        container.nodeType === Node.ELEMENT_NODE ? container : container.parentNode
      if (selectionNode && contentDiv.contains(selectionNode)) {
        savedRange = range.cloneRange()
      }
    }

    const restoreRange = () => {
      contentDiv.focus()
      if (!savedRange) return

      const selection = window.getSelection()
      if (!selection) return

      selection.removeAllRanges()
      selection.addRange(savedRange)
    }

    const moveRangeToEnd = () => {
      const range = document.createRange()
      range.selectNodeContents(contentDiv)
      range.collapse(false)
      savedRange = range
      restoreRange()
    }

    const persistContent = () => {
      this.normalizeEditorImages(contentDiv)
      this.updateNote(noteId, { content: contentDiv.innerHTML })
      saveRange()
      refreshToolbarState()
    }

    const openEditorLink = (e) => {
      const link = e.target.closest?.("a")
      if (!link || !contentDiv.contains(link)) return
      if (!e.ctrlKey && !e.metaKey) return

      const href = link.href || link.getAttribute("href")
      if (!href) return

      e.preventDefault()
      e.stopPropagation()
      window.open(href, "_blank", "noopener")
    }

    const getToolbarColors = () => ({
      normalBg:
        root.style.getPropertyValue("--note-toolbar-surface") ||
        "rgba(255, 255, 255, 0.08)",
      activeBg:
        root.style.getPropertyValue("--note-toolbar-active-surface") ||
        root.style.getPropertyValue("--note-content-text") ||
        "#ffffff",
      normalText: root.style.getPropertyValue("--note-content-text") || "#ffffff",
      activeText: root.style.getPropertyValue("--note-content-bg") || "#000000",
      border:
        root.style.getPropertyValue("--note-toolbar-border") ||
        "rgba(255, 255, 255, 0.1)",
    })

    const setButtonActive = (btn, isActive) => {
      const colors = getToolbarColors()
      btn.classList.toggle("active", isActive)
      btn.setAttribute("aria-pressed", isActive ? "true" : "false")
      btn.style.setProperty(
        "background-color",
        isActive ? colors.activeBg : colors.normalBg,
        "important",
      )
      btn.style.setProperty(
        "color",
        isActive ? colors.activeText : colors.normalText,
        "important",
      )
      btn.style.setProperty("border-color", colors.border, "important")
      btn.querySelectorAll("i, svg").forEach((icon) => {
        icon.style.setProperty(
          "color",
          isActive ? colors.activeText : colors.normalText,
          "important",
        )
        icon.style.setProperty("fill", "currentColor", "important")
      })
    }

    const selectionIsInsideEditor = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return false

      const range = selection.getRangeAt(0)
      const container = range.commonAncestorContainer
      const selectionNode =
        container.nodeType === Node.ELEMENT_NODE ? container : container.parentNode
      return !!selectionNode && contentDiv.contains(selectionNode)
    }

    const refreshToolbarState = () => {
      const canQuery = selectionIsInsideEditor()
      toolbarButtons.forEach((btn) => {
        const command = btn.dataset.command
        if (!command || btn.dataset.action) {
          setButtonActive(btn, false)
          return
        }

        let isActive = false
        if (canQuery) {
          try {
            isActive = document.queryCommandState(command)
          } catch (e) {
            isActive = false
          }
        }
        setButtonActive(btn, isActive)
      })
    }

    const insertImageFromUrl = (url) => {
      const cleanUrl = String(url || "").trim()
      if (!cleanUrl) return

      if (!savedRange) moveRangeToEnd()
      restoreRange()
      document.execCommand("insertImage", false, cleanUrl)
      persistContent()
    }

    contentDiv.addEventListener("keyup", saveRange)
    contentDiv.addEventListener("mouseup", saveRange)
    contentDiv.addEventListener("focus", () => {
      saveRange()
      refreshToolbarState()
    })
    contentDiv.addEventListener("keyup", refreshToolbarState)
    contentDiv.addEventListener("mouseup", refreshToolbarState)
    contentDiv.addEventListener("input", refreshToolbarState)
    contentDiv.addEventListener("click", openEditorLink)
    contentDiv.addEventListener("paste", (e) => {
      const items = Array.from(e.clipboardData?.items || [])
      const hasClipboardImage = items.some(
        (item) => item.kind === "file" && item.type.startsWith("image/"),
      )
      const html = e.clipboardData?.getData("text/html") || ""
      const hasHtmlImage = /<img[\s>]/i.test(html)

      if (!hasClipboardImage && !hasHtmlImage) {
        setTimeout(persistContent, 0)
        return
      }

      e.preventDefault()
      const text = e.clipboardData?.getData("text/plain") || ""
      if (text) {
        if (!savedRange) moveRangeToEnd()
        restoreRange()
        document.execCommand("insertText", false, text)
        persistContent()
      }
    })

    document.addEventListener("selectionchange", () => {
      if (selectionIsInsideEditor()) {
        saveRange()
        refreshToolbarState()
      }
    })

    toolbarButtons.forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault()
        saveRange()
      })

      btn.addEventListener("click", async () => {
        const command = btn.dataset.command
        const action = btn.dataset.action

        if (command) {
          restoreRange()
          document.execCommand(command, false, null)
          persistContent()
          return
        }

        if (action === "insert-image") {
          const url = await showPrompt("Enter image URL:")
          if (!url) return

          insertImageFromUrl(url)
          return
        }

        if (action === "create-link") {
          const url = await showPrompt("Enter URL:")
          if (!url) return

          restoreRange()
          document.execCommand("createLink", false, url.trim())
          persistContent()
          return
        }

        if (action === "indent" || action === "outdent") {
          restoreRange()
          document.execCommand(action, false, null)
          persistContent()
        }
      })
    })

    refreshToolbarState()
  }

  applyNoteHeaderTheme(header, noteColor) {
    const contrastColor = this.getContrastColor(noteColor)
    header.style.setProperty("--note-header-text", contrastColor)
    header.style.setProperty("background-color", noteColor, "important")
    header.style.setProperty("color", contrastColor, "important")

    const buttons = header.querySelectorAll(".icon-btn, .note-action-btn")
    buttons.forEach((btn) => {
      btn.style.setProperty("color", contrastColor, "important")
    })

    const titleInput = header.querySelector(".note-title-input")
    if (titleInput) {
      titleInput.style.setProperty("color", contrastColor, "important")
      titleInput.style.setProperty("background-color", "transparent", "important")
      titleInput.style.setProperty(
        "border-color",
        contrastColor === "#000000"
          ? "rgba(0, 0, 0, 0.22)"
          : "rgba(255, 255, 255, 0.28)",
        "important",
      )
    }

    const floatingTitle = header.querySelector(".floating-note-title")
    if (floatingTitle) {
      floatingTitle.style.setProperty("color", contrastColor, "important")
    }

    const icons = header.querySelectorAll("i, svg")
    icons.forEach((icon) => {
      icon.style.setProperty("color", contrastColor, "important")
      icon.style.setProperty("fill", "currentColor", "important")
    })
  }

  normalizeEditorImages(root) {
    if (!root) return

    root.querySelectorAll("img").forEach((img) => {
      img.removeAttribute("width")
      img.removeAttribute("height")
      img.style.setProperty("display", "block", "important")
      img.style.setProperty("width", "var(--note-image-width, 100%)", "important")
      img.style.setProperty(
        "max-width",
        "var(--note-image-width, 100%)",
        "important",
      )
      img.style.setProperty("min-width", "0", "important")
      img.style.setProperty("height", "auto", "important")
      img.style.setProperty("max-height", "100%", "important")
      img.style.setProperty(
        "margin-left",
        "var(--note-image-offset-x, 0px)",
        "important",
      )
      img.style.setProperty(
        "margin-right",
        "var(--note-image-offset-x, 0px)",
        "important",
      )
      img.style.setProperty("box-sizing", "border-box", "important")
      img.style.setProperty("object-fit", "contain", "important")
    })
  }

  normalizeNoteContentHtml(html) {
    const wrapper = document.createElement("div")
    wrapper.innerHTML = html
    this.normalizeEditorImages(wrapper)
    return wrapper.innerHTML
  }

  applyNoteContentTheme(note, root) {
    const contentBg = this.getContentBg(note)
    const contentTextColor = this.getContentTextColor(contentBg)
    const isLightContent = contentBg === "#FFFFFF"
    const subtleSurface = isLightContent
      ? "rgba(0, 0, 0, 0.06)"
      : "rgba(255, 255, 255, 0.1)"
    const subtleSurfaceHover = isLightContent
      ? "rgba(0, 0, 0, 0.12)"
      : "rgba(255, 255, 255, 0.18)"
    const subtleBorder = isLightContent
      ? "rgba(0, 0, 0, 0.14)"
      : "rgba(255, 255, 255, 0.18)"
    const placeholderColor = isLightContent
      ? "rgba(0, 0, 0, 0.42)"
      : "rgba(255, 255, 255, 0.48)"
    root.style.setProperty("--note-content-bg", contentBg)
    root.style.setProperty("--note-content-text", contentTextColor)
    root.style.setProperty("--note-placeholder-text", placeholderColor)
    root.style.setProperty("--note-toolbar-surface", subtleSurface)
    root.style.setProperty("--note-toolbar-surface-hover", subtleSurfaceHover)
    root.style.setProperty("--note-toolbar-active-surface", contentTextColor)
    root.style.setProperty("--note-toolbar-border", subtleBorder)
    root.style.backgroundColor = contentBg

    const content = root.querySelector(".note-content, .floating-note-content")
    if (content) {
      content.style.setProperty("background-color", contentBg, "important")
      content.style.setProperty("color", contentTextColor, "important")
      this.normalizeEditorImages(content)
      if (note.id && content.innerHTML !== note.content) {
        this.updateNote(note.id, { content: content.innerHTML })
      }
    }

    const toolbar = root.querySelector(".note-toolbar, .floating-note-toolbar")
    if (toolbar) {
      toolbar.style.setProperty("background-color", contentBg, "important")
      toolbar.style.setProperty("border-color", subtleBorder, "important")
      toolbar.style.setProperty("color", contentTextColor, "important")
    }

    root.querySelectorAll(".toolbar-btn").forEach((btn) => {
      btn.style.setProperty("color", contentTextColor, "important")
      btn.style.setProperty("background-color", subtleSurface, "important")
      btn.style.setProperty("border-color", subtleBorder, "important")
      btn.querySelectorAll("i, svg").forEach((icon) => {
        icon.style.setProperty("color", contentTextColor, "important")
        icon.style.setProperty("fill", "currentColor", "important")
      })
    })

    root.querySelectorAll(".toolbar-divider").forEach((divider) => {
      divider.style.setProperty("background", subtleBorder, "important")
    })

  }

  getContrastColor(hexColor) {
    // Convert hex to RGB
    const hex = hexColor.replace("#", "")
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    // Return black for light colors, white for dark colors
    return luminance > 0.5 ? "#000000" : "#FFFFFF"
  }
}
