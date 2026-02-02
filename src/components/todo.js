import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { showContextMenu } from "./contextMenu.js"
import { geti18n } from "../services/i18n.js"
import { showConfirm, showPrompt } from "../utils/dialog.js"

export class TodoList {
  constructor() {
    this.todos = JSON.parse(localStorage.getItem("todoItems")) || []
    this.isVisible = getSettings().showTodoList !== false
    this.container = null
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
    this.container.className = "todo-container glass-panel drag-handle"
    this.container.innerHTML = `
            <div class="todo-header">
                <h3 data-i18n="todo_title">Tasks</h3>
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
    this.todos = this.todos.filter((t) => t.id !== id)
    this.saveTodos()
    this.render()
  }

  saveTodos() {
    localStorage.setItem("todoItems", JSON.stringify(this.todos))
  }

  updateVisibility() {
    this.container.style.display = this.isVisible ? "flex" : "none"
  }

  render() {
    const list = this.container.querySelector("#todo-list")
    list.innerHTML = ""
    this.todos.forEach((todo) => {
      const li = document.createElement("li")
      li.className = `todo-item ${todo.completed ? "completed" : ""}`
      li.innerHTML = `
                <span class="todo-text">${todo.text}</span>
                <div class="todo-actions">
                    <button class="toggle-btn"><i class="fa-solid ${todo.completed ? "fa-circle-check" : "fa-circle"}"></i></button>
                    <button class="delete-btn"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `

      li.querySelector(".toggle-btn").addEventListener("click", () =>
        this.toggleTodo(todo.id),
      )
      li.querySelector(".delete-btn").addEventListener("click", async () => {
        // Direct delete button also needs confirmation if we want consistency, but user only asked about context menu options.
        // However, context menu delete MUST confirm as per request.
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
  }
}
