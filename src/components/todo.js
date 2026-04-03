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
  }

  createElements() {
    this.container = document.createElement("div")
    this.container.id = "todo-container"
    const settings = getSettings()
    const checkboxClass =
      settings.todoShowCheckboxes !== false ? "" : " hide-checkboxes"
    this.container.className = `todo-container glass-panel drag-handle${checkboxClass}`
    this.container.innerHTML = `
            <div class="todo-header">
                <label class="todo-select-all-label" title="Select All">
                    <input type="checkbox" id="todo-select-all" class="todo-checkbox">
                </label>
                <h3 data-i18n="todo_title">Tasks</h3>
                <button id="todo-delete-selected-btn" class="icon-btn todo-delete-selected-btn" style="display:none;"><i class="fa-solid fa-trash-can"></i></button>
                <button id="add-todo-btn" class="icon-btn"><i class="fa-solid fa-plus"></i></button>
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
    const inputContainer = this.container.querySelector("#todo-input-container")
    const input = this.container.querySelector("#todo-input")
    const selectAllCb = this.container.querySelector("#todo-select-all")
    const deleteSelectedBtn = this.container.querySelector(
      "#todo-delete-selected-btn",
    )

    addBtn.addEventListener("click", () => {
      const isHidden = inputContainer.style.display === "none"
      inputContainer.style.display = isHidden ? "block" : "none"
      if (isHidden) input.focus()
    })

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        this.addTodo(input.value.trim())
        input.value = ""
        inputContainer.style.display = "none"
      }
    })

    selectAllCb.addEventListener("change", () => {
      if (selectAllCb.checked) {
        this.todos.forEach((t) => this.selectedIds.add(t.id))
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
    })
  }

  addTodo(text) {
    const todo = {
      id: Date.now(),
      text: text,
      completed: false,
    }
    this.todos.push(todo)
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

    if (settings.todoShowCheckboxes !== false) {
      this.container.classList.remove("hide-checkboxes")
    } else {
      this.container.classList.add("hide-checkboxes")
    }
  }

  _updateSelectAllState() {
    const selectAllCb = this.container.querySelector("#todo-select-all")
    const deleteBtn = this.container.querySelector("#todo-delete-selected-btn")
    if (!selectAllCb) return

    const count = this.selectedIds.size
    const total = this.todos.length

    if (total === 0 || count === 0) {
      selectAllCb.checked = false
      selectAllCb.indeterminate = false
    } else if (count === total) {
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

    this.todos.forEach((todo) => {
      const isSelected = this.selectedIds.has(todo.id)
      const li = document.createElement("li")
      li.className = `todo-item ${todo.completed ? "completed" : ""} ${isSelected ? "selected" : ""}`
      li.innerHTML = `
                <label class="todo-item-select" title="">
                    <input type="checkbox" class="todo-checkbox todo-item-cb" ${isSelected ? "checked" : ""}>
                </label>
                <span class="todo-text">${todo.text}</span>
                <div class="todo-actions">
                    <button class="toggle-btn"><i class="fa-solid ${todo.completed ? "fa-circle-check" : "fa-circle"}"></i></button>
                    <button class="delete-btn"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `

      li.querySelector(".todo-item-cb").addEventListener("change", (e) => {
        if (e.target.checked) {
          this.selectedIds.add(todo.id)
        } else {
          this.selectedIds.delete(todo.id)
        }
        li.classList.toggle("selected", e.target.checked)
        this._updateSelectAllState()
      })

      li.querySelector(".toggle-btn").addEventListener("click", () =>
        this.toggleTodo(todo.id),
      )

      li.querySelector(".delete-btn").addEventListener("click", async () => {
        if (
          await showConfirm(
            geti18n().alert_delete_todo_confirm || "Delete this task?",
          )
        ) {
          this.deleteTodo(todo.id)
        }
      })

      const textSpan = li.querySelector(".todo-text")
      textSpan.addEventListener("click", () => this.toggleTodo(todo.id))

      // Context Menu
      li.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        showContextMenu(
          e.clientX,
          e.clientY,
          this.todos.indexOf(todo),
          "todo",
          todo.id,
          {
            onEdit: async () => {
              const newText = await showPrompt(
                geti18n().prompt_rename_todo || "Update task:",
                todo.text,
              )
              if (newText && newText.trim()) {
                todo.text = newText.trim()
                this.saveTodos()
                this.render()
              }
            },
            onDelete: async () => {
              if (
                await showConfirm(
                  geti18n().alert_delete_todo_confirm || "Delete this task?",
                )
              ) {
                this.deleteTodo(todo.id)
              }
            },
          },
        )
      })

      list.appendChild(li)
    })

    this._updateSelectAllState()
  }
}
