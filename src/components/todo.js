import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { showContextMenu } from "./contextMenu.js"
import { geti18n } from "../services/i18n.js"
import { showConfirm, showPrompt } from "../utils/dialog.js"
import { fadeToggle } from "../utils/dom.js"

export class TodoList {
  constructor() {
    this.todos = JSON.parse(localStorage.getItem("todoItems")) || []
    this.isVisible = getSettings().showTodoList !== false
    this.container = null
    this.selectedIds = new Set()
    this.isFullscreen = false
    this.isColumnMode = localStorage.getItem("todoFullscreenColumns") === "true"
    this.expandedTodoId = null
    this.reminderTimer = null
    this.init()
  }

  init() {
    this.todos = this.todos.map((todo) => this.normalizeTodo(todo))
    this.saveTodos()
    this.createElements()
    this.render()
    this.setupEventListeners()
    this.updateVisibility()
    this.applySkin()
    this.startReminderChecker()
  }

  applySkin() {
    const settings = getSettings()
    const isWhiteMode = settings.showQuickAccessBg === true
    const skin = isWhiteMode ? "white-blur" : (settings.todoSkin || "default")
    
    this.container.classList.toggle("skin-white-blur", skin === "white-blur")
  }

  createElements() {
    this.container = document.getElementById("todo-container")
    const settings = getSettings()
    const i18n = geti18n()
    const checkboxClass =
      settings.todoShowCheckboxes === true ? " show-checkboxes-always" : ""
    
    if (!this.container) {
      this.container = document.createElement("div")
      this.container.id = "todo-container"
      this.container.className = `todo-container glass-panel drag-handle${checkboxClass}`
      document.body.appendChild(this.container)
    } else {
      this.container.className = `todo-container glass-panel drag-handle${checkboxClass}`
    }

    this.container.innerHTML = `
            <div class="todo-header">
                <div class="todo-header-left">
                  <label class="todo-select-all-label" title="Select All" for="todo-select-all">
                    <input type="checkbox" id="todo-select-all" name="todo-select-all" class="todo-checkbox">
                  </label>
                  <div class="todo-title-wrap">
                    <h3 data-i18n="todo_title">Tasks</h3>
                    <div id="todo-progress-text" class="todo-progress-text">0 tasks</div>
                  </div>
                </div>
                <div class="todo-header-actions">
                  <button id="todo-delete-selected-btn" class="icon-btn todo-delete-selected-btn" style="display:none;" title="${i18n.todo_delete_selected || "Delete Selected"}"><i class="fa-solid fa-trash-can"></i><span class="todo-action-label" data-i18n="todo_delete_selected">${i18n.todo_delete_selected || "Delete Selected"}</span></button>
                  <button id="todo-toggle-bulk-btn" class="icon-btn" title="${i18n.todo_toggle_select || "Select"}"><i class="fa-solid fa-square-check"></i><span class="todo-action-label" data-i18n="todo_toggle_select">${i18n.todo_toggle_select || "Select"}</span></button>
                  <button id="add-todo-btn" class="icon-btn" title="${i18n.todo_add_task || "Add Task"}"><i class="fa-solid fa-plus"></i><span class="todo-action-label" data-i18n="todo_add_task">${i18n.todo_add_task || "Add Task"}</span></button>
                  <button id="todo-columns-btn" class="icon-btn todo-fullscreen-only" title="${i18n.todo_toggle_columns || "Columns"}"><i class="fa-solid fa-table-columns"></i><span class="todo-action-label" data-i18n="todo_toggle_columns">${i18n.todo_toggle_columns || "Columns"}</span></button>
                  <button id="todo-fullscreen-btn" class="icon-btn todo-fullscreen-btn" title="${i18n.todo_open_fullscreen || "Open Fullscreen"}"><i class="fa-solid fa-expand"></i><span class="todo-action-label" data-i18n="todo_open_fullscreen">${i18n.todo_open_fullscreen || "Open Fullscreen"}</span></button>
                  <button id="todo-exit-fullscreen-btn" class="icon-btn todo-fullscreen-only todo-exit-fullscreen-btn" title="${i18n.todo_exit_fullscreen || "Exit"}"><i class="fa-solid fa-xmark"></i><span class="todo-action-label" data-i18n="todo_exit_fullscreen">${i18n.todo_exit_fullscreen || "Exit"}</span></button>
                </div>
            </div>
            <div id="todo-input-container" class="todo-input-container" style="display: none;">
                <div class="todo-input-shell">
                  <i class="fa-solid fa-pen"></i>
                  <input type="text" id="todo-input" placeholder="What needs to be done?">
                </div>
                <div class="todo-input-actions">
                  <button id="todo-cancel-input-btn" class="secondary-btn">Cancel</button>
                  <button id="todo-confirm-input-btn" class="primary-btn">Add</button>
                </div>
            </div>
            <ul id="todo-list" class="todo-list"></ul>
            <div id="todo-empty-state" class="todo-empty-state" style="display: none;">
              <i class="fa-regular fa-circle-check"></i>
              <span data-i18n="todo_empty_state">No tasks yet</span>
            </div>
        `
  }

  setupEventListeners() {
    const addBtn = this.container.querySelector("#add-todo-btn")
    const toggleBulkBtn = this.container.querySelector("#todo-toggle-bulk-btn")
    const inputContainer = this.container.querySelector("#todo-input-container")
    const input = this.container.querySelector("#todo-input")
    const confirmInputBtn = this.container.querySelector("#todo-confirm-input-btn")
    const cancelInputBtn = this.container.querySelector("#todo-cancel-input-btn")
    const selectAllCb = this.container.querySelector("#todo-select-all")
    const fullscreenBtn = this.container.querySelector("#todo-fullscreen-btn")
    const columnsBtn = this.container.querySelector("#todo-columns-btn")
    const exitFullscreenBtn = this.container.querySelector("#todo-exit-fullscreen-btn")
    const deleteSelectedBtn = this.container.querySelector(
      "#todo-delete-selected-btn",
    )

    addBtn.addEventListener("click", () => {
      const isHidden = inputContainer.style.display === "none"
      inputContainer.style.display = isHidden ? "flex" : "none"
      input.placeholder = geti18n().todo_input_placeholder || "What needs to be done?"
      confirmInputBtn.innerHTML = `<i class="fa-solid fa-plus"></i><span>Add</span>`
      if (isHidden) input.focus()
    })

    toggleBulkBtn.addEventListener("click", () => {
      const settings = getSettings()
      const newVal = settings.todoShowCheckboxes !== true
      updateSetting("todoShowCheckboxes", newVal)
      saveSettings()
      this.updateVisibility()
    })

    const submitInput = () => {
      if (!input.value.trim()) return
      this.addTodo(input.value.trim())
      input.value = ""
      inputContainer.style.display = "none"
    }

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        submitInput()
      }
      if (e.key === "Escape") {
        input.value = ""
        inputContainer.style.display = "none"
      }
    })

    confirmInputBtn.addEventListener("click", submitInput)
    cancelInputBtn.addEventListener("click", () => {
      input.value = ""
      inputContainer.style.display = "none"
    })

    fullscreenBtn.addEventListener("click", () => {
      this.toggleFullscreen()
    })

    columnsBtn.addEventListener("click", () => {
      this.toggleColumnMode()
    })

    exitFullscreenBtn.addEventListener("click", () => {
      this.toggleFullscreen(false)
    })

    document.addEventListener("keydown", (e) => {
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)
      if (isTyping) return
      if (e.key === "Escape" && this.isFullscreen) {
        this.toggleFullscreen(false)
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
      dueDate: "",
      reminderAt: "",
      reminderNotified: false,
      recurring: "none",
      tags: [],
      priority: "none",
      notes: "",
      attachments: [],
      subtasks: [],
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
    const todo = this.todos.find((t) => t.id === id)
    const willComplete = todo && !todo.completed
    this.todos = this.todos.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t,
    )
    if (todo && willComplete && todo.recurring && todo.recurring !== "none") {
      this.createRecurringTodo(todo)
    }
    this.saveTodos()
    this.render()
  }

  deleteTodo(id) {
    this.selectedIds.delete(id)
    if (this.expandedTodoId === id) this.expandedTodoId = null
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
    if (!this.isVisible && this.isFullscreen) {
      this.toggleFullscreen(false)
    }
    fadeToggle(this.container, this.isVisible, "flex")

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
    const progressText = this.container.querySelector("#todo-progress-text")
    const emptyState = this.container.querySelector("#todo-empty-state")
    list.innerHTML = ""

    // Remove stale selections
    const validIds = new Set(this.todos.map((t) => t.id))
    this.selectedIds.forEach((id) => {
      if (!validIds.has(id)) this.selectedIds.delete(id)
    })

    const tasks = this.todos.filter((t) => t.type !== "section")
    const completedCount = tasks.filter((t) => t.completed).length
    if (progressText) {
      const i18n = geti18n()
      progressText.textContent =
        tasks.length === 0
          ? i18n.todo_progress_empty || "0 tasks"
          : (i18n.todo_progress_done || "{done}/{total} done")
              .replace("{done}", completedCount)
              .replace("{total}", tasks.length)
    }
    if (emptyState) {
      emptyState.style.display = this.todos.length === 0 ? "flex" : "none"
    }

    this.todos.forEach((item, index) => {
      if (item.type === "section") {
        const i18n = geti18n()
        const li = document.createElement("li")
        li.className = "todo-section-header"
        li.draggable = true
        li.dataset.index = index
        li.innerHTML = `
          <span class="section-title">${this.escapeHtml(item.text)}</span>
          <div class="todo-actions section-actions">
            <button class="delete-btn section-delete-btn" title="${i18n.todo_delete_section || "Delete section"}">
              <i class="fa-solid fa-trash-can"></i>
              <span class="todo-action-label" data-i18n="todo_delete_section">${i18n.todo_delete_section || "Delete section"}</span>
            </button>
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
      const isExpanded = this.isFullscreen && this.expandedTodoId === item.id
      const i18n = geti18n()
      const li = document.createElement("li")
      li.className = `todo-item priority-${item.priority || "none"} ${item.completed ? "completed" : ""} ${isSelected ? "selected" : ""} ${isExpanded ? "expanded" : ""}`
      li.draggable = true
      li.dataset.index = index
      li.innerHTML = `
              <div class="todo-item-main">
                  <label class="todo-item-select" title="" for="todo-cb-${item.id}">
                      <input type="checkbox" id="todo-cb-${item.id}" name="todo-cb-[${item.id}]" class="todo-checkbox todo-item-cb" ${isSelected ? "checked" : ""}>
                </label>
                <button class="todo-complete-btn" title="${item.completed ? "Mark incomplete" : "Mark complete"}">
                  <i class="${item.completed ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}"></i>
                </button>
                <span class="todo-text">${this.escapeHtml(item.text)}</span>
                <div class="todo-actions">
                    <button class="todo-details-btn" title="${i18n.todo_task_details || "Details"}"><i class="fa-solid fa-sliders"></i><span class="todo-action-label" data-i18n="todo_task_details">${i18n.todo_task_details || "Details"}</span></button>
                    <button class="delete-btn" title="${i18n.menu_delete || "Delete"}"><i class="fa-solid fa-trash-can"></i><span class="todo-action-label" data-i18n="menu_delete">${i18n.menu_delete || "Delete"}</span></button>
                </div>
              </div>
              ${this.renderTodoMeta(item)}
              ${isExpanded ? this.renderDetailPanel(item) : ""}
            `

      this._addDragEventListeners(li)
      this.setupDetailPanel(li, item)

      li.querySelector(".todo-item-cb").addEventListener("change", (e) => {
        if (e.target.checked) {
          this.selectedIds.add(item.id)
        } else {
          this.selectedIds.delete(item.id)
        }
        li.classList.toggle("selected", e.target.checked)
        this._updateSelectAllState()
      })

      li.querySelector(".todo-complete-btn").addEventListener("click", (e) => {
        e.stopPropagation()
        this.toggleTodo(item.id)
      })

      li.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.stopPropagation()
        this._confirmDelete(item)
      })

      li.querySelector(".todo-details-btn").addEventListener("click", (e) => {
        e.stopPropagation()
        this.expandedTodoId = this.expandedTodoId === item.id ? null : item.id
        if (!this.isFullscreen) this.toggleFullscreen(true)
        this.render()
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

  toggleFullscreen(force) {
    const nextState = typeof force === "boolean" ? force : !this.isFullscreen
    this.isFullscreen = nextState
    this.container.classList.toggle("todo-fullscreen", nextState)
    this.container.classList.toggle("todo-columns-mode", nextState && this.isColumnMode)
    document.body.classList.toggle("todo-fullscreen-active", nextState)
    if (!nextState) this.expandedTodoId = null

    const fullscreenBtn = this.container.querySelector("#todo-fullscreen-btn")
    const columnsBtn = this.container.querySelector("#todo-columns-btn")
    if (!fullscreenBtn) return
    const i18n = geti18n()
    const fullscreenLabel = fullscreenBtn.querySelector(".todo-action-label")

    fullscreenBtn.title = nextState
      ? i18n.todo_close_fullscreen || "Close Fullscreen"
      : i18n.todo_open_fullscreen || "Open Fullscreen"
    fullscreenBtn.querySelector("i").className = nextState
      ? "fa-solid fa-compress"
      : "fa-solid fa-expand"
    if (fullscreenLabel) {
      fullscreenLabel.dataset.i18n = nextState
        ? "todo_close_fullscreen"
        : "todo_open_fullscreen"
      fullscreenLabel.textContent = nextState
        ? i18n.todo_close_fullscreen || "Close Fullscreen"
        : i18n.todo_open_fullscreen || "Open Fullscreen"
    }
    if (columnsBtn) columnsBtn.classList.toggle("active", this.isColumnMode)
    this.render()
  }

  toggleColumnMode() {
    this.isColumnMode = !this.isColumnMode
    localStorage.setItem("todoFullscreenColumns", String(this.isColumnMode))
    this.container.classList.toggle(
      "todo-columns-mode",
      this.isFullscreen && this.isColumnMode,
    )
    const columnsBtn = this.container.querySelector("#todo-columns-btn")
    if (columnsBtn) columnsBtn.classList.toggle("active", this.isColumnMode)
  }

  normalizeTodo(todo) {
    if (todo.type === "section") return todo
    return {
      dueDate: "",
      reminderAt: "",
      reminderNotified: false,
      recurring: "none",
      tags: [],
      priority: "none",
      notes: "",
      attachments: [],
      subtasks: [],
      ...todo,
      type: "task",
    }
  }

  updateTodo(id, changes) {
    this.todos = this.todos.map((todo) => {
      if (todo.id !== id) return todo
      return this.normalizeTodo({ ...todo, ...changes })
    })
    this.saveTodos()
    this.render()
  }

  createRecurringTodo(todo) {
    const nextDueDate = this.getNextDate(todo.dueDate, todo.recurring)
    const nextReminderAt = this.getNextDate(todo.reminderAt, todo.recurring)
    this.todos.push({
      ...this.normalizeTodo(todo),
      id: Date.now() + Math.floor(Math.random() * 1000),
      completed: false,
      dueDate: nextDueDate,
      reminderAt: nextReminderAt,
      reminderNotified: false,
      subtasks: todo.subtasks.map((subtask) => ({
        ...subtask,
        id: Date.now() + Math.floor(Math.random() * 100000),
        completed: false,
      })),
    })
  }

  getNextDate(value, recurring) {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    if (recurring === "daily") date.setDate(date.getDate() + 1)
    if (recurring === "weekly") date.setDate(date.getDate() + 7)
    if (recurring === "monthly") date.setMonth(date.getMonth() + 1)
    return this.toDateTimeLocal(date)
  }

  toDateTimeLocal(date) {
    const pad = (number) => String(number).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  startReminderChecker() {
    if (this.reminderTimer) clearInterval(this.reminderTimer)
    this.checkReminders()
    this.reminderTimer = setInterval(() => this.checkReminders(), 30000)
  }

  async checkReminders() {
    const now = Date.now()
    let changed = false

    for (const todo of this.todos) {
      if (
        todo.type === "section" ||
        todo.completed ||
        !todo.reminderAt ||
        todo.reminderNotified
      ) {
        continue
      }

      const reminderTime = new Date(todo.reminderAt).getTime()
      if (Number.isNaN(reminderTime) || reminderTime > now) continue

      todo.reminderNotified = true
      changed = true
      this.showReminder(todo)
    }

    if (changed) this.saveTodos()
  }

  async showReminder(todo) {
    const title = "Task reminder"
    const body = todo.dueDate
      ? `${todo.text} - due ${this.formatDateTime(todo.dueDate)}`
      : todo.text

    if (!("Notification" in window)) {
      alert(`${title}: ${body}`)
      return
    }

    if (Notification.permission === "default") {
      await Notification.requestPermission()
    }

    if (Notification.permission === "granted") {
      new Notification(title, { body })
    } else {
      alert(`${title}: ${body}`)
    }
  }

  formatDateTime(value) {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  renderTodoMeta(item) {
    const chips = []
    if (item.priority && item.priority !== "none") {
      chips.push(`<span class="todo-meta-chip priority-chip">${item.priority.toUpperCase()}</span>`)
    }
    if (item.dueDate) {
      chips.push(`<span class="todo-meta-chip"><i class="fa-regular fa-calendar"></i>${this.escapeHtml(this.formatDateTime(item.dueDate))}</span>`)
    }
    if (item.reminderAt) {
      chips.push(`<span class="todo-meta-chip"><i class="fa-regular fa-bell"></i>${this.escapeHtml(this.formatDateTime(item.reminderAt))}</span>`)
    }
    if (item.recurring && item.recurring !== "none") {
      chips.push(`<span class="todo-meta-chip"><i class="fa-solid fa-rotate"></i>${this.escapeHtml(item.recurring)}</span>`)
    }
    item.tags.forEach((tag) => {
      chips.push(`<span class="todo-meta-chip tag-chip">#${this.escapeHtml(tag)}</span>`)
    })
    if (item.subtasks.length > 0) {
      const done = item.subtasks.filter((subtask) => subtask.completed).length
      chips.push(`<span class="todo-meta-chip"><i class="fa-solid fa-list-check"></i>${done}/${item.subtasks.length}</span>`)
    }
    if (item.attachments.length > 0) {
      chips.push(`<span class="todo-meta-chip"><i class="fa-solid fa-paperclip"></i>${item.attachments.length}</span>`)
    }

    return chips.length > 0 ? `<div class="todo-meta-row">${chips.join("")}</div>` : ""
  }

  renderDetailPanel(item) {
    const tags = item.tags.join(", ")
    const subtasks = item.subtasks
      .map((subtask, index) => `
        <li class="todo-subtask ${subtask.completed ? "completed" : ""}" data-subtask-index="${index}">
          <i class="fa-solid fa-grip-vertical subtask-drag-handle" draggable="true" title="Drag subtask"></i>
          <label title="Complete subtask" for="todo-subtask-${item.id}-${subtask.id}">
            <input type="checkbox" id="todo-subtask-${item.id}-${subtask.id}" class="todo-checkbox subtask-checkbox" ${subtask.completed ? "checked" : ""}>
          </label>
          <input class="subtask-title-input" type="text" value="${this.escapeAttribute(subtask.text)}" placeholder="Subtask">
          <button class="subtask-delete-btn" title="Delete subtask"><i class="fa-solid fa-xmark"></i></button>
        </li>
      `)
      .join("")
    const attachments = item.attachments
      .map((attachment, index) => `
        <li class="todo-attachment" data-attachment-index="${index}">
          <i class="fa-solid fa-link"></i>
          <a href="${this.escapeAttribute(attachment.url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(attachment.label || attachment.url)}</a>
          <button class="attachment-delete-btn" title="Remove attachment"><i class="fa-solid fa-xmark"></i></button>
        </li>
      `)
      .join("")

    return `
      <div class="todo-detail-panel">
        <div class="todo-detail-panel-header">
          <div>
            <span class="todo-detail-kicker">Task details</span>
            <strong>${this.escapeHtml(item.text)}</strong>
          </div>
        </div>
        <div class="todo-detail-grid">
          <div class="todo-detail-group full">
            <div class="todo-detail-group-title"><i class="fa-solid fa-pen-to-square"></i><span>General</span></div>
            <div class="todo-detail-grid compact">
          <label class="todo-field full">
            <span>Title</span>
            <input class="todo-title-input" type="text" value="${this.escapeAttribute(item.text)}" placeholder="Task title">
          </label>
          <label class="todo-field">
            <span>Due date</span>
            <input class="todo-due-input" type="datetime-local" value="${this.escapeAttribute(item.dueDate)}">
          </label>
          <label class="todo-field">
            <span>Reminder</span>
            <input class="todo-reminder-input" type="datetime-local" value="${this.escapeAttribute(item.reminderAt)}">
          </label>
          <label class="todo-field">
            <span>Recurring</span>
            <select class="todo-recurring-select">
              <option value="none" ${item.recurring === "none" ? "selected" : ""}>None</option>
              <option value="daily" ${item.recurring === "daily" ? "selected" : ""}>Daily</option>
              <option value="weekly" ${item.recurring === "weekly" ? "selected" : ""}>Weekly</option>
              <option value="monthly" ${item.recurring === "monthly" ? "selected" : ""}>Monthly</option>
            </select>
          </label>
          <label class="todo-field">
            <span>Priority</span>
            <select class="todo-priority-select">
              <option value="none" ${item.priority === "none" ? "selected" : ""}>None</option>
              <option value="p1" ${item.priority === "p1" ? "selected" : ""}>P1 High</option>
              <option value="p2" ${item.priority === "p2" ? "selected" : ""}>P2 Medium</option>
              <option value="p3" ${item.priority === "p3" ? "selected" : ""}>P3 Low</option>
            </select>
          </label>
          <label class="todo-field full">
            <span>Tags</span>
            <input class="todo-tags-input" type="text" value="${this.escapeAttribute(tags)}" placeholder="home, work, personal">
          </label>
            </div>
          </div>
          <div class="todo-detail-group full">
            <div class="todo-detail-group-title"><i class="fa-regular fa-note-sticky"></i><span>Notes</span></div>
            <label class="todo-field full">
              <textarea class="todo-notes-input" rows="4" placeholder="Add details, links, or context">${this.escapeHtml(item.notes)}</textarea>
            </label>
          </div>
        </div>

        <div class="todo-detail-columns">
          <section class="todo-detail-section">
            <div class="todo-detail-section-title">
              <i class="fa-solid fa-list-check"></i>
              <span>Subtasks</span>
            </div>
            <ul class="todo-subtask-list">${subtasks}</ul>
            <div class="todo-inline-add">
              <input class="todo-new-subtask-input" type="text" placeholder="Add subtask">
              <button class="todo-add-subtask-btn" title="Add subtask"><i class="fa-solid fa-plus"></i></button>
            </div>
          </section>

          <section class="todo-detail-section">
            <div class="todo-detail-section-title">
              <i class="fa-solid fa-paperclip"></i>
              <span>Attachments</span>
            </div>
            <ul class="todo-attachment-list">${attachments}</ul>
            <div class="todo-inline-add">
              <input class="todo-new-attachment-input" type="url" placeholder="Paste link">
              <button class="todo-add-attachment-btn" title="Add attachment"><i class="fa-solid fa-plus"></i></button>
            </div>
          </section>
        </div>
      </div>
    `
  }

  setupDetailPanel(li, item) {
    const panel = li.querySelector(".todo-detail-panel")
    if (!panel) return

    const updateFromInput = (selector, key, normalize = (value) => value) => {
      const control = panel.querySelector(selector)
      if (!control) return
      control.addEventListener("change", () => {
        const changes = { [key]: normalize(control.value) }
        if (key === "reminderAt") changes.reminderNotified = false
        this.updateTodo(item.id, changes)
      })
    }

    updateFromInput(".todo-title-input", "text", (value) => value.trim() || item.text)
    updateFromInput(".todo-due-input", "dueDate")
    updateFromInput(".todo-reminder-input", "reminderAt")
    updateFromInput(".todo-recurring-select", "recurring")
    updateFromInput(".todo-priority-select", "priority")
    updateFromInput(".todo-tags-input", "tags", (value) =>
      value
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean),
    )
    updateFromInput(".todo-notes-input", "notes")

    const addSubtask = () => {
      const input = panel.querySelector(".todo-new-subtask-input")
      const text = input.value.trim()
      if (!text) return
      this.updateTodo(item.id, {
        subtasks: [
          ...item.subtasks,
          { id: Date.now(), text, completed: false },
        ],
      })
    }

    panel.querySelector(".todo-add-subtask-btn")?.addEventListener("click", addSubtask)
    panel.querySelector(".todo-new-subtask-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addSubtask()
    })

    panel.querySelectorAll(".todo-subtask").forEach((subtaskEl) => {
      const index = Number(subtaskEl.dataset.subtaskIndex)
      const checkbox = subtaskEl.querySelector(".subtask-checkbox")
      const title = subtaskEl.querySelector(".subtask-title-input")
      const dragHandle = subtaskEl.querySelector(".subtask-drag-handle")

      checkbox.addEventListener("change", () => {
        const subtasks = item.subtasks.map((subtask, subtaskIndex) =>
          subtaskIndex === index
            ? { ...subtask, completed: checkbox.checked }
            : subtask,
        )
        this.updateTodo(item.id, { subtasks })
      })

      title.addEventListener("change", () => {
        const value = title.value.trim()
        if (!value) return
        const subtasks = item.subtasks.map((subtask, subtaskIndex) =>
          subtaskIndex === index ? { ...subtask, text: value } : subtask,
        )
        this.updateTodo(item.id, { subtasks })
      })

      subtaskEl.querySelector(".subtask-delete-btn").addEventListener("click", () => {
        this.updateTodo(item.id, {
          subtasks: item.subtasks.filter((_, subtaskIndex) => subtaskIndex !== index),
        })
      })

      dragHandle.addEventListener("dragstart", (e) => {
        e.stopPropagation()
        this.draggedSubtaskIndex = index
        e.dataTransfer.setData("text/plain", String(index))
        e.dataTransfer.effectAllowed = "move"
        subtaskEl.classList.add("dragging")
      })

      subtaskEl.addEventListener("dragover", (e) => {
        e.preventDefault()
        e.stopPropagation()
        subtaskEl.classList.add("drag-over")
      })

      subtaskEl.addEventListener("dragleave", () => {
        subtaskEl.classList.remove("drag-over")
      })

      subtaskEl.addEventListener("drop", (e) => {
        e.preventDefault()
        e.stopPropagation()
        subtaskEl.classList.remove("drag-over")
        const fromIndex = this.draggedSubtaskIndex ?? Number(e.dataTransfer.getData("text/plain"))
        if (Number.isNaN(fromIndex) || fromIndex === index) {
          this.draggedSubtaskIndex = null
          return
        }
        const subtasks = [...item.subtasks]
        const [moved] = subtasks.splice(fromIndex, 1)
        subtasks.splice(index, 0, moved)
        this.draggedSubtaskIndex = null
        this.updateTodo(item.id, { subtasks })
      })

      dragHandle.addEventListener("dragend", (e) => {
        e.stopPropagation()
        this.draggedSubtaskIndex = null
        subtaskEl.classList.remove("dragging")
      })
    })

    const addAttachment = () => {
      const input = panel.querySelector(".todo-new-attachment-input")
      const url = input.value.trim()
      if (!url) return
      this.updateTodo(item.id, {
        attachments: [
          ...item.attachments,
          { id: Date.now(), url, label: this.getAttachmentLabel(url) },
        ],
      })
    }

    panel.querySelector(".todo-add-attachment-btn")?.addEventListener("click", addAttachment)
    panel.querySelector(".todo-new-attachment-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addAttachment()
    })

    panel.querySelectorAll(".todo-attachment").forEach((attachmentEl) => {
      const index = Number(attachmentEl.dataset.attachmentIndex)
      attachmentEl.querySelector(".attachment-delete-btn").addEventListener("click", () => {
        this.updateTodo(item.id, {
          attachments: item.attachments.filter((_, attachmentIndex) => attachmentIndex !== index),
        })
      })
    })
  }

  getAttachmentLabel(url) {
    try {
      return new URL(url).hostname || url
    } catch {
      return url
    }
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }

  escapeAttribute(value) {
    return this.escapeHtml(value).replace(/`/g, "&#096;")
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
      if (e.target.closest(".todo-subtask")) return
      const isInteractive = e.target.closest(
        "button, input, textarea, select, option, a, label",
      )
      if (isInteractive) {
        e.preventDefault()
        return
      }
      this.draggedIndex = Number(el.dataset.index)
      e.dataTransfer.effectAllowed = "move"
      setTimeout(() => el.classList.add("dragging"), 0)
    })

    el.addEventListener("dragover", (e) => {
      if (e.target.closest(".todo-subtask")) return
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
      if (e.target.closest(".todo-subtask")) return
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
