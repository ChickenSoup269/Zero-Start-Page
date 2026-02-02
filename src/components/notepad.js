import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { geti18n } from "../services/i18n.js"
import { makeDraggable } from "../utils/draggable.js"
import { showPrompt } from "../utils/dialog.js"

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
    this.renderDetachedNotes()

    // Close dropdowns when clicking outside
    document.addEventListener("click", () => {
      document.querySelectorAll(".note-color-menu.show").forEach((menu) => {
        menu.classList.remove("show")
      })
    })
  }

  createElements() {
    this.container = document.createElement("div")
    this.container.id = "notepad-container"
    this.container.className = "notepad-container"
    this.container.innerHTML = `
      <div class="notepad-header drag-handle">
        <i class="fa-solid fa-grip-vertical drag-handle-icon"></i>
        <h3 data-i18n="notepad_title">Notepad</h3>
        <button id="add-note-btn" class="icon-btn" title="Add Note"><i class="fa-solid fa-plus"></i></button>
      </div>
      <div class="notepad-body">
        <div class="notes-list"></div>
      </div>
    `
    document.body.appendChild(this.container)
  }

  setupEventListeners() {
    const addBtn = this.container.querySelector("#add-note-btn")
    addBtn.addEventListener("click", () => this.addNote())

    window.addEventListener("layoutUpdated", (e) => {
      if (e.detail.key === "showNotepad") {
        this.isVisible = e.detail.value
        this.updateVisibility()
      }
    })
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

  deleteNote(id) {
    this.notes = this.notes.filter((n) => n.id !== id)
    delete this.detachedNotes[id]
    delete this.hiddenNotes[id]
    this.saveNotes()
    this.saveDetachedState()
    this.saveHiddenState()
    this.render()
  }

  updateNote(id, updates) {
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

  updateVisibility() {
    this.container.style.display = this.isVisible ? "flex" : "none"
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

    floatingContainer.innerHTML = `
      <div class="floating-note-header drag-handle">
        <i class="fa-solid fa-grip-vertical drag-handle-icon"></i>
        <span class="floating-note-title">${this.escapeHtml(note.title)}</span>
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
        <button class="icon-btn" data-action="toggle-bg" title="Toggle background (White/Black)"><i class="fa-solid ${note.contentBg === "#FFFFFF" || (!note.contentBg && this.getContrastColor(note.color) !== "#000000") ? "fa-sun" : "fa-moon"}"></i></button>
        <button class="icon-btn floating-note-close" title="Reattach"><i class="fa-solid fa-window-close"></i></button>
      </div>
      <div class="floating-note-toolbar">
        <button class="toolbar-btn" data-command="bold" title="Bold"><i class="fa-solid fa-bold"></i></button>
        <button class="toolbar-btn" data-command="italic" title="Italic"><i class="fa-solid fa-italic"></i></button>
        <button class="toolbar-btn" data-command="underline" title="Underline"><i class="fa-solid fa-underline"></i></button>
        <button class="toolbar-btn" data-command="strikeThrough" title="Strikethrough"><i class="fa-solid fa-strikethrough"></i></button>
        <span class="toolbar-divider"></span>
        <button class="toolbar-btn" data-command="insertUnorderedList" title="Bullet List"><i class="fa-solid fa-list-ul"></i></button>
        <button class="toolbar-btn" data-command="insertOrderedList" title="Numbered List"><i class="fa-solid fa-list-ol"></i></button>
        <span class="toolbar-divider"></span>
        <button class="toolbar-btn" data-action="insert-image" title="Insert Image"><i class="fa-solid fa-image"></i></button>
      </div>
      <div class="floating-note-content" contenteditable="true">${note.content}</div>
    `

    document.body.appendChild(floatingContainer)
    this.floatingNotes[noteId] = floatingContainer

    // Restore saved dimensions if available
    const savedDimensions = localStorage.getItem(
      `floating-note-${noteId}-dimensions`,
    )
    if (savedDimensions) {
      try {
        const { width, height, top, right } = JSON.parse(savedDimensions)
        floatingContainer.style.width = width
        floatingContainer.style.height = height
        floatingContainer.style.top = top
        floatingContainer.style.right = right
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
      }
      localStorage.setItem(
        `floating-note-${noteId}-dimensions`,
        JSON.stringify(dimensions),
      )
    })
    observer.observe(floatingContainer)

    // Apply color to floating header
    const floatingHeader = floatingContainer.querySelector(
      ".floating-note-header",
    )
    if (floatingHeader) {
      const contrastColor = this.getContrastColor(note.color)
      floatingHeader.style.backgroundColor = note.color
      floatingHeader.style.color = contrastColor

      // Apply contrast color to all icons in header
      const icons = floatingHeader.querySelectorAll("i")
      icons.forEach((icon) => {
        icon.style.color = contrastColor
      })

      // Apply contrast color to all buttons in header actions
      const buttons = floatingHeader.querySelectorAll(".icon-btn")
      buttons.forEach((btn) => {
        btn.style.color = contrastColor
      })
    }

    // Make draggable
    makeDraggable(
      floatingContainer,
      `floating-note-${noteId}`,
      null,
      ".floating-note-header",
    )

    // Setup event listeners
    const closeBtn = floatingContainer.querySelector(".floating-note-close")
    closeBtn.addEventListener("click", () => this.reattachNote(noteId))

    // Toggle background button
    const bgToggleBtn = floatingContainer.querySelector(
      '[data-action="toggle-bg"]',
    )
    const contentDiv = floatingContainer.querySelector(".floating-note-content")

    // Initialize content background and text color
    if (contentDiv) {
      const contentBg =
        note.contentBg ||
        (this.getContrastColor(note.color) === "#000000"
          ? "#FFFFFF"
          : "#000000")
      const contentTextColor = contentBg === "#FFFFFF" ? "#000000" : "#FFFFFF"
      contentDiv.style.backgroundColor = contentBg
      contentDiv.style.color = contentTextColor

      // Update floating-note-window background and title color with content background
      floatingContainer.style.backgroundColor = contentBg
      const floatingTitle = floatingContainer.querySelector(
        ".floating-note-title",
      )
      if (floatingTitle) {
        floatingTitle.style.color = contentTextColor
      }
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
          const contentTextColor = newBg === "#FFFFFF" ? "#000000" : "#FFFFFF"
          contentDiv.style.setProperty("background-color", newBg, "important")
          contentDiv.style.setProperty("color", contentTextColor, "important")

          // Update floating-note-window background and title color
          floatingContainer.style.backgroundColor = newBg
          const floatingTitle = floatingContainer.querySelector(
            ".floating-note-title",
          )
          if (floatingTitle) {
            floatingTitle.style.color = contentTextColor
          }
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
          const contrastColor = this.getContrastColor(newColor)
          floatingHeader.style.backgroundColor = newColor
          floatingHeader.style.color = contrastColor

          // Update all icons and buttons in header
          const icons = floatingHeader.querySelectorAll("i")
          icons.forEach((icon) => {
            icon.style.color = contrastColor
          })

          const buttons = floatingHeader.querySelectorAll(".icon-btn")
          buttons.forEach((btn) => {
            btn.style.color = contrastColor
          })
        }

        // Update floating note content background
        const floatingContent = floatingContainer.querySelector(
          ".floating-note-content",
        )
        if (floatingContent) {
          const contentBg =
            this.getContrastColor(newColor) === "#000000"
              ? "#FFFFFF"
              : "#000000"
          const contentTextColor =
            contentBg === "#FFFFFF" ? "#000000" : "#FFFFFF"
          floatingContent.style.backgroundColor = contentBg
          floatingContent.style.color = contentTextColor

          // Update floating-note-window background and title color
          floatingContainer.style.backgroundColor = contentBg
          const floatingTitle = floatingContainer.querySelector(
            ".floating-note-title",
          )
          if (floatingTitle) {
            floatingTitle.style.color = contentTextColor
          }
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
      this.updateNote(noteId, { content: contentDiv.innerHTML })
    })

    const titleSpan = floatingContainer.querySelector(".floating-note-title")
    titleSpan.addEventListener("blur", () => {
      this.updateNote(noteId, { title: titleSpan.textContent })
    })
    titleSpan.contentEditable = true

    // Toolbar buttons
    floatingContainer.querySelectorAll(".toolbar-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const command = btn.dataset.command
        const action = btn.dataset.action

        if (command) {
          document.execCommand(command, false, null)
        } else if (action === "insert-image") {
          showPrompt("Enter image URL:").then((url) => {
            if (url) {
              document.execCommand("insertImage", false, url)
              contentDiv.focus()
              this.updateNote(noteId, { content: contentDiv.innerHTML })
            }
          })
          return
        }

        contentDiv.focus()
        this.updateNote(noteId, { content: contentDiv.innerHTML })
      })
    })
  }

  renderNote(note) {
    const isHidden = this.hiddenNotes[note.id]
    const isDetached = this.detachedNotes[note.id]

    if (isDetached) return null // Don't render detached notes in parent

    const noteDiv = document.createElement("div")
    noteDiv.className = "note-item"
    noteDiv.setAttribute("data-note-id", note.id)

    noteDiv.innerHTML = `
      <div class="note-header">
        <input type="text" class="note-title-input" value="${this.escapeHtml(note.title)}" placeholder="Note Title">
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
            <i class="fa-solid ${note.contentBg === "#FFFFFF" || (!note.contentBg && this.getContrastColor(note.color) !== "#000000") ? "fa-sun" : "fa-moon"}"></i>
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
      ${isHidden ? "" : `<div class="note-content" contenteditable="true">${note.content}</div>`}
    `

    // Apply color to header
    const headerDiv = noteDiv.querySelector(".note-header")
    if (headerDiv) {
      const contrastColor = this.getContrastColor(note.color)
      headerDiv.style.backgroundColor = note.color
      headerDiv.style.color = contrastColor

      // Apply contrast color to all icons in header
      const icons = headerDiv.querySelectorAll("i")
      icons.forEach((icon) => {
        icon.style.color = contrastColor
      })

      // Apply contrast color to all buttons in header actions
      const buttons = headerDiv.querySelectorAll(".icon-btn, .note-action-btn")
      buttons.forEach((btn) => {
        btn.style.color = contrastColor
      })
    }

    // Event listeners
    const titleInput = noteDiv.querySelector(".note-title-input")
    titleInput.addEventListener("change", () => {
      this.updateNote(note.id, { title: titleInput.value })
    })

    const contentDiv = noteDiv.querySelector(".note-content")
    if (contentDiv) {
      // Set content background based on note.contentBg or auto-calculate
      const contentBg =
        note.contentBg ||
        (this.getContrastColor(note.color) === "#000000"
          ? "#FFFFFF"
          : "#000000")
      const contentTextColor = contentBg === "#FFFFFF" ? "#000000" : "#FFFFFF"
      contentDiv.style.backgroundColor = contentBg
      contentDiv.style.color = contentTextColor

      // Update note-item background and title color with content background
      noteDiv.style.backgroundColor = contentBg
      const titleInput = noteDiv.querySelector(".note-title-input")
      if (titleInput) {
        titleInput.style.color = contentTextColor
        titleInput.style.backgroundColor = contentBg
      }

      contentDiv.addEventListener("input", () => {
        this.updateNote(note.id, { content: contentDiv.innerHTML })
      })
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
          const contentTextColor = newBg === "#FFFFFF" ? "#000000" : "#FFFFFF"
          contentDiv.style.setProperty("background-color", newBg, "important")
          contentDiv.style.setProperty("color", contentTextColor, "important")

          // Update note-item background and title color
          noteDiv.style.backgroundColor = newBg
          const titleInput = noteDiv.querySelector(".note-title-input")
          if (titleInput) {
            titleInput.style.color = contentTextColor
            titleInput.style.backgroundColor = newBg
          }
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
          const contrastColor = this.getContrastColor(newColor)
          headerDiv.style.backgroundColor = newColor
          headerDiv.style.color = contrastColor

          // Update all icons and buttons in header
          const icons = headerDiv.querySelectorAll("i")
          icons.forEach((icon) => {
            icon.style.color = contrastColor
          })

          const buttons = headerDiv.querySelectorAll(
            ".icon-btn, .note-action-btn",
          )
          buttons.forEach((btn) => {
            btn.style.color = contrastColor
          })
        }

        // Update note-content background and text
        const contentDiv = noteDiv.querySelector(".note-content")
        if (contentDiv) {
          const contentBg =
            this.getContrastColor(newColor) === "#000000"
              ? "#000000"
              : "#FFFFFF"
          const contentTextColor =
            contentBg === "#FFFFFF" ? "#000000" : "#FFFFFF"
          contentDiv.style.backgroundColor = contentBg
          contentDiv.style.color = contentTextColor

          // Update note-item background and title color
          noteDiv.style.backgroundColor = contentBg
          const titleInput = noteDiv.querySelector(".note-title-input")
          if (titleInput) {
            titleInput.style.color = contentTextColor
            titleInput.style.backgroundColor = contentBg
          }
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
