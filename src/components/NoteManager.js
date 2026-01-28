// src/components/NoteManager.js
import { Note, NoteStorage } from "../services/noteStorage.js"
import { makeDraggable } from "../utils/draggable.js"
import { DesktopNote } from "./DesktopNote.js"

const NOTE_COLORS = ["#ffc", "#cfc", "#ccf", "#fcc", "#cff", "#fcf"]

export class NoteManager {
  constructor() {
    this.noteStorage = new NoteStorage()
    this.currentNotes = []
    this.currentEditingNote = null
    this.activeDesktopNotes = new Map()
    this.desktopNotesContainer = document.getElementById(
      "sticky-notes-container",
    )

    // UI elements
    this.modal = document.getElementById("note-manager-modal")
    this.modalContent = this.modal?.querySelector(".modal-content")
    this.closeBtn = document.getElementById("close-note-manager-btn")
    this.mainView = document.getElementById("note-manager-main-view")
    this.editorView = document.getElementById("note-editor-view")
    this.listContainer = document.getElementById("note-manager-list")
    this.searchbar = document.getElementById("note-search-input")
    this.newNoteBtn = document.getElementById("note-manager-new-btn")

    this.editorId = document.getElementById("note-editor-id")
    this.editorTitle = document.getElementById("note-editor-title")
    this.editorContent = document.getElementById("note-editor-content")
    this.editorSaveBtn = document.getElementById("note-editor-save-btn")
    this.editorBackBtn = document.getElementById("note-editor-back-btn")

    this.noteColorPicker = this.modal?.querySelector(".note-color-picker")
    this.colorDots = this.noteColorPicker?.querySelectorAll(".color-dot") || []
    this.boldBtn = document.getElementById("note-editor-bold-btn")
    this.italicBtn = document.getElementById("note-editor-italic-btn")
    this.underlineBtn = document.getElementById("note-editor-underline-btn")
    this.strikethroughBtn = document.getElementById(
      "note-editor-strikethrough-btn",
    )
    this.bulletBtn = document.getElementById("note-editor-bullet-btn")

    // Make modal draggable
    if (this.modalContent) {
      makeDraggable(
        this.modalContent,
        "note-manager-modal",
        (el) => {
          /* có thể lưu vị trí modal nếu cần */
        },
        ".modal-header",
      )
    }

    // Event listeners
    this.closeBtn?.addEventListener("click", () => this.hideModal())
    this.newNoteBtn?.addEventListener("click", () => this.newNote())
    this.searchbar?.addEventListener("input", () => this.filterNotes())
    this.editorSaveBtn?.addEventListener("click", () => this.saveNote())
    this.editorBackBtn?.addEventListener("click", () => this.showMainView())

    this.colorDots.forEach((dot) => {
      dot.addEventListener("click", (e) =>
        this.selectNoteColor(e.target.dataset.color),
      )
    })
    this.boldBtn?.addEventListener("click", () => this.toggleStyle("isBold"))
    this.italicBtn?.addEventListener("click", () =>
      this.toggleStyle("isItalic"),
    )
    this.underlineBtn?.addEventListener("click", () =>
      this.toggleStyle("isUnderline"),
    )
    this.strikethroughBtn?.addEventListener("click", () =>
      this.toggleStyle("isStrikethrough"),
    )
    this.bulletBtn?.addEventListener("click", () => this.toggleBulletList())
  }

  async init() {
    const openBtn = document.getElementById("note-manager-btn")
    openBtn?.addEventListener("click", () => this.showModal())
    await this.loadAndRenderNotes()
    this.renderDesktopNotes()
  }

  showModal() {
    this.modal?.classList.add("show")
    this.showMainView()
  }

  hideModal() {
    this.modal?.classList.remove("show")
  }

  showMainView() {
    if (this.mainView) this.mainView.style.display = "flex"
    if (this.editorView) this.editorView.style.display = "none"
    this.currentEditingNote = null
    if (this.editorView) this.editorView.style.backgroundColor = ""
    this.loadAndRenderNotes()
  }

  showEditorView(note = null) {
    if (this.mainView) this.mainView.style.display = "none"
    if (this.editorView) this.editorView.style.display = "flex"
    this.currentEditingNote = note

    if (note) {
      this.editorId.value = note.id || ""
      this.editorTitle.value = note.title || ""
      this.editorContent.value = note.content || ""
      this.editorView.style.backgroundColor = note.backgroundColor
      this.selectNoteColor(note.backgroundColor)
      this.applyEditorContentStyling(note)
      this.updateFormattingButtonStates(note)
    } else {
      this.editorId.value = ""
      this.editorTitle.value = ""
      this.editorContent.value = ""
      this.editorView.style.backgroundColor = NOTE_COLORS[0]
      this.selectNoteColor(NOTE_COLORS[0])
      const emptyNote = new Note("", "")
      this.applyEditorContentStyling(emptyNote)
      this.updateFormattingButtonStates(emptyNote)
    }
  }

  applyEditorContentStyling(note) {
    this.editorContent.style.fontWeight = note.isBold ? "bold" : "normal"
    this.editorContent.style.fontStyle = note.isItalic ? "italic" : "normal"
    this.editorContent.style.textDecoration = [
      note.isUnderline ? "underline" : "",
      note.isStrikethrough ? "line-through" : "",
    ]
      .filter(Boolean)
      .join(" ")

    let content = note.content || ""
    if (note.isBulleted) {
      content = content
        .split("\n")
        .map((line) => (line.trim() ? "• " + line : line))
        .join("\n")
    } else if (content.startsWith("• ")) {
      content = content
        .split("\n")
        .map((line) =>
          line.startsWith("• ") ? line.substring(2).trim() : line,
        )
        .join("\n")
    }
    this.editorContent.value = content
    this.bulletBtn?.classList.toggle("active", note.isBulleted)
  }

  updateFormattingButtonStates(note) {
    this.boldBtn?.classList.toggle("active", note.isBold)
    this.italicBtn?.classList.toggle("active", note.isItalic)
    this.underlineBtn?.classList.toggle("active", note.isUnderline)
    this.strikethroughBtn?.classList.toggle("active", note.isStrikethrough)
    this.bulletBtn?.classList.toggle("active", note.isBulleted)
  }

  selectNoteColor(color) {
    if (!this.currentEditingNote) return
    this.currentEditingNote.backgroundColor = color
    if (this.editorView) this.editorView.style.backgroundColor = color
    this.colorDots.forEach((dot) => {
      dot.classList.toggle("selected", dot.dataset.color === color)
    })
  }

  toggleStyle(styleProperty) {
    if (!this.currentEditingNote) return
    this.currentEditingNote[styleProperty] =
      !this.currentEditingNote[styleProperty]
    this.applyEditorContentStyling(this.currentEditingNote)
    this.updateFormattingButtonStates(this.currentEditingNote)
  }

  toggleBulletList() {
    if (!this.currentEditingNote) return
    this.currentEditingNote.isBulleted = !this.currentEditingNote.isBulleted
    this.applyEditorContentStyling(this.currentEditingNote)
  }

  async loadAndRenderNotes() {
    this.currentNotes = await this.noteStorage.getAll()
    this.renderNoteList(this.currentNotes)
    this.renderDesktopNotes()
  }

  renderNoteList(notes) {
    if (!this.listContainer) return
    this.listContainer.innerHTML = ""

    if (notes.length === 0) {
      this.listContainer.innerHTML =
        '<p style="text-align: center; color: #777;">No notes found. Click "New Note" to create one!</p>'
      return
    }

    notes.forEach((note) => {
      const item = document.createElement("div")
      item.className = "note-item"
      item.dataset.noteId = note.id
      item.style.backgroundColor = note.backgroundColor

      const title = document.createElement("span")
      title.className = "note-item-title"
      title.textContent = note.title || "Untitled Note"

      const preview = document.createElement("span")
      preview.className = "note-item-content-preview"
      let previewText =
        (note.content || "No content").substring(0, 50) +
        (note.content.length > 50 ? "..." : "")
      if (note.isBulleted) previewText = "• " + previewText
      preview.textContent = previewText
      preview.style.fontWeight = note.isBold ? "bold" : "normal"
      preview.style.fontStyle = note.isItalic ? "italic" : "normal"
      preview.style.textDecoration = [
        note.isUnderline ? "underline" : "",
        note.isStrikethrough ? "line-through" : "",
      ]
        .filter(Boolean)
        .join(" ")

      const actions = document.createElement("div")
      actions.className = "note-item-actions"

      const desktopBtn = document.createElement("button")
      desktopBtn.innerHTML = `<i class="fa-solid ${note.isOpenOnDesktop ? "fa-eye-slash" : "fa-eye"}"></i>`
      desktopBtn.title = note.isOpenOnDesktop
        ? "Close on Desktop"
        : "Open on Desktop"
      desktopBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        this.toggleDesktopDisplay(note.id)
      })

      const editBtn = document.createElement("button")
      editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>'
      editBtn.title = "Edit"
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        this.editNote(note.id)
      })

      const deleteBtn = document.createElement("button")
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>'
      deleteBtn.title = "Delete"
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        this.deleteNote(note.id)
      })

      item.append(title, preview, actions)
      actions.append(desktopBtn, editBtn, deleteBtn)
      this.listContainer.appendChild(item)

      item.addEventListener("click", () => this.editNote(note.id))
    })
  }

  newNote() {
    const note = new Note("", "", { backgroundColor: NOTE_COLORS[0] })
    this.showEditorView(note)
  }

  async editNote(id) {
    const note = this.currentNotes.find((n) => n.id === id)
    if (note) this.showEditorView(note)
  }

  async saveNote() {
    if (!this.currentEditingNote) return

    let content = this.editorContent.value
    if (!this.currentEditingNote.isBulleted && content.startsWith("• ")) {
      content = content
        .split("\n")
        .map((l) => (l.startsWith("• ") ? l.substring(2) : l))
        .join("\n")
    }

    const noteToSave = new Note(
      this.editorTitle.value || "Untitled Note",
      content,
      {
        id: this.editorId.value || undefined,
        backgroundColor: this.currentEditingNote.backgroundColor,
        isBold: this.currentEditingNote.isBold,
        isItalic: this.currentEditingNote.isItalic,
        isUnderline: this.currentEditingNote.isUnderline,
        isStrikethrough: this.currentEditingNote.isStrikethrough,
        isBulleted: this.currentEditingNote.isBulleted,
        isOpenOnDesktop: this.currentEditingNote.isOpenOnDesktop || false,
        desktopPosition: this.currentEditingNote.desktopPosition,
        desktopSize: this.currentEditingNote.desktopSize,
      },
    )

    await this.noteStorage.save(noteToSave)
    await this.loadAndRenderNotes()
    this.showMainView()
  }

  async deleteNote(id) {
    if (!confirm("Delete this note?")) return
    await this.noteStorage.delete(id)
    this.removeDesktopNote(id)
    await this.loadAndRenderNotes()
  }

  filterNotes() {
    const term = this.searchbar?.value.toLowerCase() || ""
    const filtered = this.currentNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(term) ||
        n.content.toLowerCase().includes(term),
    )
    this.renderNoteList(filtered)
  }

  // Desktop Note Methods
  async renderDesktopNotes() {
    // Cleanup cũ
    for (const [id, instance] of this.activeDesktopNotes) {
      const note = this.currentNotes.find((n) => n.id === id)
      if (!note || !note.isOpenOnDesktop) {
        instance.remove()
        this.activeDesktopNotes.delete(id)
      }
    }

    // Render mới
    for (const note of this.currentNotes) {
      if (note.isOpenOnDesktop) {
        if (this.activeDesktopNotes.has(note.id)) {
          const inst = this.activeDesktopNotes.get(note.id)
          inst.noteData = note
          inst.updateContent()
        } else {
          this.createDesktopNote(note)
        }
      }
    }
  }

  createDesktopNote(note) {
    if (!this.desktopNotesContainer) return
    const instance = new DesktopNote(
      note,
      this.desktopNotesContainer,
      this.updateNoteProperty.bind(this),
      this.deleteNote.bind(this),
    )
    this.activeDesktopNotes.set(note.id, instance)
  }

  removeDesktopNote(id) {
    const instance = this.activeDesktopNotes.get(id)
    if (instance) {
      instance.remove()
      this.activeDesktopNotes.delete(id)
    }
  }

  async updateNoteProperty(id, updates) {
    const index = this.currentNotes.findIndex((n) => n.id === id)
    if (index === -1) return

    const updated = { ...this.currentNotes[index], ...updates }
    const note = new Note(updated.title, updated.content, updated)
    await this.noteStorage.save(note)
    this.currentNotes[index] = note
    this.renderNoteList(this.currentNotes)
  }

  async toggleDesktopDisplay(id) {
    const note = this.currentNotes.find((n) => n.id === id)
    if (!note) return

    const newState = !note.isOpenOnDesktop
    await this.updateNoteProperty(id, { isOpenOnDesktop: newState })

    if (newState) {
      this.createDesktopNote(this.currentNotes.find((n) => n.id === id))
    } else {
      this.removeDesktopNote(id)
    }
    this.renderNoteList(this.currentNotes)
  }
}
