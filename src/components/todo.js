import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { showContextMenu } from "./contextMenu.js"
import { geti18n } from "../services/i18n.js"
import { showConfirm, showPrompt } from "../utils/dialog.js"

export class TodoList {
  constructor() {
    this.todos = JSON.parse(localStorage.getItem("todoItems")) || []
    this.isVisible = getSettings().showTodoList !== false
    this.container = null
    this.selectedIds = new Set()
    this.init()
  }

  init() {
    this.createElements()
    this.render()
    this.setupEventListeners()
    this.updateVisibility()
    this.applySkin()
  }

  applySkin() {
    const skin = getSettings().todoSkin || "default"
    this.container.classList.remove("skin-white-blur")
    if (skin === "white-blur") {
      this.container.classList.add("skin-white-blur")
    }
  }

  createElements() {
    this.container = document.createElement("div")
    this.container.id = "todo-container"
    const settings = getSettings()
    const checkboxClass =
      settings.todoShowCheckboxes === true ? " show-checkboxes-always" : ""
    this.container.className = `todo-container glass-panel drag-handle${checkboxClass}`
    this.container.innerHTML = `
            <div class="todo-header">
                <div class="todo-header-left">
                  <label class="todo-select-all-label" title="Select All" for="todo-select-all">
                    <input type="checkbox" id="todo-select-all" name="todo-select-all" class="todo-checkbox">
                  </label>
                  <h3 data-i18n="todo_title">Tasks</h3>
                </div>
                <div class="todo-header-actions">
                  <button id="todo-delete-selected-btn" class="icon-btn todo-delete-selected-btn" style="display:none;"><i class="fa-solid fa-trash-can"></i></button>
                  <button id="todo-toggle-bulk-btn" class="icon-btn" title="Toggle Multi-Select"><i class="fa-solid fa-square-check"></i></button>
                  <button id="todo-add-section-btn" class="icon-btn" title="Add Section"><i class="fa-solid fa-folder-plus"></i></button>
                  <button id="add-todo-btn" class="icon-btn" title="Add Task"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
            <div id="todo-input-container" class="todo-input-container" style="display: none;">
                <input type="text" id="todo-input" placeholder="What needs to be done?">
            </div>
            <ul id="todo-list" class="todo-list"></ul>
        `
    document.body.appendChild(this.container)
  }

  setupEventListeners() {
    const addBtn = this.container.querySelector("#add-todo-btn")
    const addSectionBtn = this.container.querySelector("#todo-add-section-btn")
    const toggleBulkBtn = this.container.querySelector("#todo-toggle-bulk-btn")
    const inputContainer = this.container.querySelector("#todo-input-container")
    const input = this.container.querySelector("#todo-input")
    const selectAllCb = this.container.querySelector("#todo-select-all")
    const deleteSelectedBtn = this.container.querySelector(
      "#todo-delete-selected-btn",
    )

    addBtn.addEventListener("click", () => {
      this.pendingSection = false
      const isHidden = inputContainer.style.display === "none"
      inputContainer.style.display = isHidden ? "block" : "none"
      input.placeholder = geti18n().todo_input_placeholder || "What needs to be done?"
      if (isHidden) input.focus()
    })

    addSectionBtn.addEventListener("click", () => {
      this.pendingSection = true
      const isHidden = inputContainer.style.display === "none"
      inputContainer.style.display = isHidden ? "block" : "none"
      input.placeholder = geti18n().todo_section_placeholder || "Section name..."
      if (isHidden) input.focus()
    })

    toggleBulkBtn.addEventListener("click", () => {
      const settings = getSettings()
      const newVal = settings.todoShowCheckboxes !== true
      updateSetting("todoShowCheckboxes", newVal)
      saveSettings()
      this.updateVisibility()
    })

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        if (this.pendingSection) {
          this.addSection(input.value.trim())
        } else {
          this.addTodo(input.value.trim())
        }
        input.value = ""
        inputContainer.style.display = "none"
      }
    })

    selectAllCb.addEventListener("change", () => {
      if (selectAllCb.checked) {
        this.todos.forEach((t) => {
          if (t.type !== "section") this.selectedIds.add(t.id)
        })
      } else {
        this.selectedIds.clear()
      }
      this.render()
    })

    deleteSelectedBtn.addEventListener("click", async () => {
      if (this.selectedIds.size === 0) return
      const i18n = geti18n()
      const msg = (
        i18n.alert_delete_selected_todos || "Delete {count} selected task(s)?"
      ).replace("{count}", this.selectedIds.size)
      if (await showConfirm(msg)) {
        this.todos = this.todos.filter((t) => !this.selectedIds.has(t.id))
        this.selectedIds.clear()
        this.saveTodos()
        this.render()
      }
    })

    window.addEventListener("layoutUpdated", (e) => {
      if (e.detail.key === "showTodoList") {
        this.isVisible = e.detail.value
        this.updateVisibility()
      }
      if (e.detail.key === "todoShowCheckboxes") {
        this.updateVisibility()
      }
      if (e.detail.key === "todoSkin") {
        this.applySkin()
      }
    })
  }

  addTodo(text) {
    const todo = {
      id: Date.now(),
      text: text,
      completed: false,
      type: "task",
    }
    this.todos.push(todo)
    this.saveTodos()
    this.render()
  }

  addSection(text) {
    const section = {
      id: Date.now(),
      text: text,
      type: "section",
    }
    this.todos.push(section)
    this.saveTodos()
    this.render()
  }

  toggleTodo(id) {
    this.todos = this.todos.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t,
    )
    this.saveTodos()
    this.render()
  }

  deleteTodo(id) {
    this.selectedIds.delete(id)
    this.todos = this.todos.filter((t) => t.id !== id)
    this.saveTodos()
    this.render()
  }

  saveTodos() {
    localStorage.setItem("todoItems", JSON.stringify(this.todos))
  }

  updateVisibility() {
    const settings = getSettings()
    this.isVisible = settings.showTodoList !== false
    this.container.style.display = this.isVisible ? "flex" : "none"

    const toggleBulkBtn = this.container.querySelector("#todo-toggle-bulk-btn")
    if (settings.todoShowCheckboxes === true) {
      this.container.classList.add("show-checkboxes-always")
      this.container.classList.remove("hide-checkboxes")
      if (toggleBulkBtn) toggleBulkBtn.classList.add("active")
    } else {
      this.container.classList.remove("show-checkboxes-always")
      this.container.classList.add("hide-checkboxes")
      if (toggleBulkBtn) toggleBulkBtn.classList.remove("active")
    }
  }

  _updateSelectAllState() {
    const selectAllCb = this.container.querySelector("#todo-select-all")
    const deleteBtn = this.container.querySelector("#todo-delete-selected-btn")
    if (!selectAllCb) return

    const count = this.selectedIds.size
    const totalTasks = this.todos.filter(t => t.type !== 'section').length

    if (totalTasks === 0 || count === 0) {
      selectAllCb.checked = false
      selectAllCb.indeterminate = false
    } else if (count === totalTasks) {
      selectAllCb.checked = true
      selectAllCb.indeterminate = false
    } else {
      selectAllCb.checked = false
      selectAllCb.indeterminate = true
    }

    if (count > 0) {
      deleteBtn.style.display = "inline-flex"
      const i18n = geti18n()
      deleteBtn.title = `${i18n.todo_delete_selected || "Delete Selected"} (${count})`
    } else {
      deleteBtn.style.display = "none"
    }
  }

  render() {
    const list = this.container.querySelector("#todo-list")
    list.innerHTML = ""

    // Remove stale selections
    const validIds = new Set(this.todos.map((t) => t.id))
    this.selectedIds.forEach((id) => {
      if (!validIds.has(id)) this.selectedIds.delete(id)
    })

    this.todos.forEach((item, index) => {
      if (item.type === "section") {
        const li = document.createElement("li")
        li.className = "todo-section-header"
        li.draggable = true
        li.dataset.index = index
        li.innerHTML = `
          <span class="section-title"><i class="fa-solid fa-grip-vertical drag-handle-todo" style="margin-right: 8px; opacity: 0.5; cursor: grab;"></i>${item.text}</span>
          <div class="todo-actions">
            <button class="delete-btn"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        `
        this._addDragEventListeners(li)
        li.querySelector(".delete-btn").addEventListener("click", async (e) => {
          e.stopPropagation()
          const i18n = geti18n()
          const confirmMsg = (i18n.todo_delete_section_confirm || 'Delete section "{name}"?').replace("{name}", item.text)
          if (await showConfirm(confirmMsg)) {
            this.deleteTodo(item.id)
          }
        })
        list.appendChild(li)
        return
      }

      const isSelected = this.selectedIds.has(item.id)
      const li = document.createElement("li")
      li.className = `todo-item ${item.completed ? "completed" : ""} ${isSelected ? "selected" : ""}`
      li.draggable = true
      li.dataset.index = index
      li.innerHTML = `
                  <label class="todo-item-select" title="" for="todo-cb-${item.id}">
                      <input type="checkbox" id="todo-cb-${item.id}" name="todo-cb-[${item.id}]" class="todo-checkbox todo-item-cb" ${isSelected ? "checked" : ""}>
                </label>
                <i class="fa-solid fa-grip-vertical drag-handle-todo" style="opacity: 0.3; cursor: grab; font-size: 0.8rem;"></i>
                <span class="todo-text">${item.text}</span>
                <div class="todo-actions">
                    <button class="toggle-btn" title="${item.completed ? "Mark incomplete" : "Mark complete"}"><i class="${item.completed ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}" style="${item.completed ? "color: var(--accent-color);" : ""}"></i></button>
                    <button class="delete-btn"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `

      this._addDragEventListeners(li)

      li.querySelector(".todo-item-cb").addEventListener("change", (e) => {
        if (e.target.checked) {
          this.selectedIds.add(item.id)
        } else {
          this.selectedIds.delete(item.id)
        }
        li.classList.toggle("selected", e.target.checked)
        this._updateSelectAllState()
      })

      li.querySelector(".toggle-btn").addEventListener("click", (e) => {
        e.stopPropagation()
        this.toggleTodo(item.id)
      })

      li.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.stopPropagation()
        this._confirmDelete(item)
      })

      const textSpan = li.querySelector(".todo-text")
      textSpan.addEventListener("click", () => this.toggleTodo(item.id))

      // Context Menu
      li.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        showContextMenu(
          e.clientX,
          e.clientY,
          this.todos.indexOf(item),
          "todo",
          item.id,
          {
            onEdit: async () => {
              const newText = await showPrompt(
                geti18n().prompt_rename_todo || "Update task:",
                item.text,
              )
              if (newText && newText.trim()) {
                item.text = newText.trim()
                this.saveTodos()
                this.render()
              }
            },
            onDelete: async () => {
              this._confirmDelete(item)
            },
          },
        )
      })

      list.appendChild(li)
    })

    this._updateSelectAllState()
  }

  async _confirmDelete(item) {
    if (
      await showConfirm(
        geti18n().alert_delete_todo_confirm || "Delete this task?",
      )
    ) {
      this.deleteTodo(item.id)
    }
  }

  _addDragEventListeners(el) {
    el.addEventListener("dragstart", (e) => {
      this.draggedIndex = Number(el.dataset.index)
      e.dataTransfer.effectAllowed = "move"
      setTimeout(() => el.classList.add("dragging"), 0)
    })

    el.addEventListener("dragover", (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
      const target = e.target.closest("li")
      if (target && target !== el) {
        target.classList.add("drag-over")
      }
    })

    el.addEventListener("dragleave", (e) => {
      const target = e.target.closest("li")
      if (target) {
        target.classList.remove("drag-over")
      }
    })

    el.addEventListener("drop", (e) => {
      e.preventDefault()
      const target = e.target.closest("li")
      if (target) {
        target.classList.remove("drag-over")
        const targetIndex = Number(target.dataset.index)
        if (this.draggedIndex !== null && this.draggedIndex !== targetIndex) {
          const [movedItem] = this.todos.splice(this.draggedIndex, 1)
          this.todos.splice(targetIndex, 0, movedItem)
          this.saveTodos()
          this.render()
        }
      }
      this.draggedIndex = null
    })

    el.addEventListener("dragend", () => {
      el.classList.remove("dragging")
      const list = this.container.querySelector("#todo-list")
      list.querySelectorAll("li").forEach(li => li.classList.remove("drag-over"))
    })
  }
}
