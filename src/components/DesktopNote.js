// src/components/DesktopNote.js
import { makeDraggable } from "../utils/draggable.js"

const DEFAULT_WIDTH = "260px"
const DEFAULT_HEIGHT = "260px"

export class DesktopNote {
  constructor(noteData, container, onUpdate, onDelete) {
    this.noteData = noteData
    this.container = container
    this.onUpdate = onUpdate
    this.onDelete = onDelete
    this.element = null
    this.contentArea = null
    this.resizeObserver = null

    this.render()
  }

  render() {
    if (this.element) {
      this.updateContent()
      return
    }

    this.element = document.createElement("div")
    this.element.className = "sticky-note widget desktop-note"
    this.element.dataset.noteId = this.noteData.id

    // Position & Size
    this.element.style.position = "absolute"
    this.element.style.top = this.noteData.desktopPosition?.top || "40px"
    this.element.style.left = this.noteData.desktopPosition?.left || "40px"
    this.element.style.width = this.noteData.desktopSize?.width || DEFAULT_WIDTH
    this.element.style.height =
      this.noteData.desktopSize?.height || DEFAULT_HEIGHT
    this.element.style.backgroundColor = this.noteData.backgroundColor

    // Header
    const header = document.createElement("div")
    header.className = "widget-header sticky-note-header desktop-note-header"

    const title = document.createElement("span")
    title.className = "desktop-note-title-span"
    title.textContent = this.noteData.title || "Note"

    const dragHandle = document.createElement("i")
    dragHandle.className = "fa-solid fa-grip-lines drag-handle"

    const closeBtn = document.createElement("button")
    closeBtn.className = "desktop-note-close-btn"
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
    closeBtn.title = "Close"
    closeBtn.addEventListener("click", () => this.handleClose())

    header.append(title, dragHandle, closeBtn)

    // Content
    this.contentArea = document.createElement("textarea")
    this.contentArea.className = "sticky-note-textarea desktop-note-textarea"
    this.contentArea.placeholder = "Type here..."
    this.contentArea.addEventListener("input", () => this.handleContentChange())
    this.contentArea.addEventListener("blur", () =>
      this.handleContentChange(true),
    )

    this.element.append(header, this.contentArea)
    this.container.appendChild(this.element)

    // Draggable chỉ từ header hoặc drag-handle
    makeDraggable(
      this.element,
      `desktop-note-${this.noteData.id}`,
      (el) => this.handlePositionChange(el.style.top, el.style.left),
      ".drag-handle, .sticky-note-header", // ← Quan trọng: kéo từ header hoặc grip
    )

    // Resize observer
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.element) {
          this.handleSizeChange(
            Math.round(entry.contentRect.width) + "px",
            Math.round(entry.contentRect.height) + "px",
          )
        }
      }
    })
    this.resizeObserver.observe(this.element)

    this.updateContent()
  }

  updateContent() {
    if (!this.element || !this.contentArea) return

    this.element.style.backgroundColor = this.noteData.backgroundColor

    this.contentArea.value = this.noteData.content || ""
    this.contentArea.style.fontWeight = this.noteData.isBold ? "bold" : "normal"
    this.contentArea.style.fontStyle = this.noteData.isItalic
      ? "italic"
      : "normal"
    this.contentArea.style.textDecoration = [
      this.noteData.isUnderline ? "underline" : "",
      this.noteData.isStrikethrough ? "line-through" : "",
    ]
      .filter(Boolean)
      .join(" ")

    // Bullet handling (chỉ hiển thị, không lưu bullet vào content thật)
    let displayContent = this.noteData.content || ""
    if (this.noteData.isBulleted) {
      displayContent = displayContent
        .split("\n")
        .map((line) => (line.trim() ? "• " + line : line))
        .join("\n")
    }
    this.contentArea.value = displayContent
  }

  remove() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
  }

  handleClose() {
    this.onUpdate(this.noteData.id, { isOpenOnDesktop: false })
    this.remove()
  }

  handlePositionChange(top, left) {
    this.onUpdate(this.noteData.id, { desktopPosition: { top, left } })
  }

  handleSizeChange(width, height) {
    this.onUpdate(this.noteData.id, { desktopSize: { width, height } })
  }

  handleContentChange(saveNow = false) {
    let content = this.contentArea.value

    // Strip bullets trước khi save (nếu đang bật bullet)
    if (this.noteData.isBulleted) {
      content = content
        .split("\n")
        .map((line) =>
          line.startsWith("• ") ? line.substring(2).trim() : line,
        )
        .join("\n")
    }

    if (content !== this.noteData.content || saveNow) {
      this.onUpdate(this.noteData.id, { content })
    }
  }
}
