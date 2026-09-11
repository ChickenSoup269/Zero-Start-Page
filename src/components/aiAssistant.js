/**
 * aiAssistant.js
 * Minimalist Gemini AI Assistant matching Startpage Design System
 * 100% FontAwesome Icons, Clean Dark Theme, Zero Lag
 */

import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { geti18n } from "../services/i18n.js"
import { fadeToggle } from "../utils/dom.js"
import { showContextMenu } from "./contextMenu.js"

const GEMINI_API_KEY_STORAGE = "gemini_api_key"
const GEMINI_MODEL_STORAGE = "gemini_ai_model"
const GEMINI_CHAT_HISTORY_STORAGE = "gemini_chat_history"
const GEMINI_LAST_INTERACTION_ID = "gemini_last_interaction_id"
const DEFAULT_MODEL = "gemini-3.6-flash"

export class AiAssistant {
  constructor() {
    this.container = null
    this.apiKey = ""
    this.model = DEFAULT_MODEL
    this.lastInteractionId = null
    this.messages = []
    this.isLoading = false

    this.init()
  }

  init() {
    this.createElements()
    this.setupEventListeners()
    this.applySkin()
    this.loadConfig().then(() => {
      this.updateConfigUI()
      this.renderMessages()
    })
  }

  updateConfigUI() {
    const modelSelect = this.container?.querySelector("#ai-model-select")
    if (modelSelect) {
      if (![...modelSelect.options].some((o) => o.value === this.model)) {
        const opt = document.createElement("option")
        opt.value = this.model
        opt.textContent = this.model
        modelSelect.appendChild(opt)
      }
      modelSelect.value = this.model
    }
    const notice = this.container?.querySelector("#ai-key-notice")
    if (notice) notice.style.display = this.apiKey ? "none" : "flex"
    const keyInput = this.container?.querySelector("#ai-api-key-input")
    if (keyInput) keyInput.value = this.apiKey
  }

  async loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        [
          GEMINI_API_KEY_STORAGE,
          "ai_api_key",
          GEMINI_MODEL_STORAGE,
          GEMINI_CHAT_HISTORY_STORAGE,
          GEMINI_LAST_INTERACTION_ID,
        ],
        (data) => {
          this.apiKey = data?.[GEMINI_API_KEY_STORAGE] || data?.ai_api_key || ""
          let model = data?.[GEMINI_MODEL_STORAGE] || DEFAULT_MODEL
          // Automatically migrate from deprecated gemini-2.0-flash to gemini-3.6-flash
          if (model === "gemini-2.0-flash" || !model) {
            model = DEFAULT_MODEL
            chrome.storage.local.set({ [GEMINI_MODEL_STORAGE]: model })
          }
          this.model = model
          this.lastInteractionId = data?.[GEMINI_LAST_INTERACTION_ID] || null
          this.messages = Array.isArray(data?.[GEMINI_CHAT_HISTORY_STORAGE])
            ? data[GEMINI_CHAT_HISTORY_STORAGE]
            : []
          resolve()
        },
      )
    })
  }

  saveChatHistory() {
    const trimmed = this.messages.slice(-30)
    chrome.storage.local.set({ [GEMINI_CHAT_HISTORY_STORAGE]: trimmed })
  }

  createElements() {
    this.container = document.getElementById("ai-assistant-container")
    if (!this.container) {
      this.container = document.createElement("div")
      this.container.id = "ai-assistant-container"
      this.container.className =
        "ai-assistant-container glass-panel drag-handle"
      this.container.style.display = "none"
      document.body.appendChild(this.container)
    }

    const i18n = geti18n()

    this.container.innerHTML = `
      <div class="ai-header drag-handle">
        <div class="ai-title-wrap">
          <i class="fa-solid fa-robot ai-header-icon"></i>
          <span class="ai-header-title">${i18n.ai_assistant_title || "Gemini Assistant"}</span>
        </div>
        <div class="ai-header-actions no-drag">
          <select id="ai-model-select" class="ai-select" title="${i18n.ai_select_model || "Select Model"}">
            <option value="gemini-3.6-flash" ${this.model === "gemini-3.6-flash" ? "selected" : ""}>3.6 Flash</option>
            <option value="gemini-2.5-flash" ${this.model === "gemini-2.5-flash" ? "selected" : ""}>2.5 Flash</option>
            <option value="gemini-2.5-pro" ${this.model === "gemini-2.5-pro" ? "selected" : ""}>2.5 Pro</option>
            <option value="gemini-1.5-flash" ${this.model === "gemini-1.5-flash" ? "selected" : ""}>1.5 Flash</option>
            <option value="gemini-1.5-pro" ${this.model === "gemini-1.5-pro" ? "selected" : ""}>1.5 Pro</option>
          </select>
          <button class="ai-tool-btn" id="ai-key-btn" title="${i18n.ai_api_key_settings || "API Key"}">
            <i class="fa-solid fa-key"></i>
          </button>
          <a href="https://gemini.google.com" target="_blank" class="ai-tool-btn" id="ai-open-tab-btn" title="${i18n.ai_open_web_title || "Open full Gemini in new tab"}">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
          <button class="ai-tool-btn" id="ai-clear-btn" title="${i18n.ai_clear_chat || "Clear"}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
          <button class="ai-tool-btn" id="ai-close-btn" title="${i18n.close || "Close"}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="ai-body no-drag">
        <!-- API Key Setup Alert -->
        <div id="ai-key-notice" class="ai-banner" style="${this.apiKey ? "display: none;" : "display: flex;"}">
          <div class="ai-banner-content">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>${i18n.ai_key_required_desc || "Enter your Google Gemini API key to start chatting."}</span>
          </div>
          <button id="ai-setup-key-btn" class="ai-btn-sm"><i class="fa-solid fa-key"></i> ${i18n.ai_enter_key || "Set Key"}</button>
        </div>

        <!-- Chat message list -->
        <div id="ai-chat-list" class="ai-chat-list"></div>

        <!-- Quick Prompts Bar -->
        <div class="ai-prompts-bar">
          <button class="ai-chip-btn" data-prompt="Translate this text to English: "><i class="fa-solid fa-language"></i> ${i18n.ai_prompt_translate || "Translate"}</button>
          <button class="ai-chip-btn" data-prompt="Summarize the following clearly in bullet points: "><i class="fa-solid fa-file-lines"></i> ${i18n.ai_prompt_summarize || "Summarize"}</button>
          <button class="ai-chip-btn" data-prompt="Give me 5 creative ideas for: "><i class="fa-solid fa-lightbulb"></i> ${i18n.ai_prompt_ideas || "Ideas"}</button>
          <button class="ai-chip-btn" data-prompt="Explain this code and check for bugs: "><i class="fa-solid fa-code"></i> ${i18n.ai_prompt_code || "Code"}</button>
        </div>

        <!-- Input Box -->
        <div class="ai-input-row">
          <textarea id="ai-user-input" class="ai-input" placeholder="${i18n.ai_input_placeholder || "Ask Gemini... (Enter to send, Shift+Enter for newline)"}" rows="1"></textarea>
          <button id="ai-send-btn" class="ai-send-btn" title="${i18n.send || "Send"}">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </div>
      </div>

      <!-- API Key Modal -->
      <div id="ai-key-modal" class="ai-key-modal" style="display: none;">
        <div class="ai-modal-box">
          <div class="ai-modal-title">
            <i class="fa-solid fa-key"></i>
            <span>${i18n.ai_api_key_settings || "Gemini API Key"}</span>
          </div>
          <p class="ai-modal-desc">${i18n.ai_api_key_help || "Get a free API key at"} <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a></p>
          <input type="password" id="ai-api-key-input" class="ai-key-input" placeholder="AIzaSy..." value="${this.apiKey}">
          <div class="ai-modal-btns">
            <button id="ai-cancel-key-btn" class="ai-btn-secondary">${i18n.cancel || "Cancel"}</button>
            <button id="ai-save-key-btn" class="ai-btn-primary">${i18n.save || "Save"}</button>
          </div>
        </div>
      </div>
    `
  }

  setupEventListeners() {
    this.container
      .querySelector("#ai-close-btn")
      ?.addEventListener("click", () => {
        this.toggleVisibility(false)
      })

    this.container
      .querySelector("#ai-clear-btn")
      ?.addEventListener("click", () => {
        this.messages = []
        this.lastInteractionId = null
        chrome.storage.local.remove([GEMINI_LAST_INTERACTION_ID])
        this.saveChatHistory()
        this.renderMessages()
      })

    const modelSelect = this.container.querySelector("#ai-model-select")
    modelSelect?.addEventListener("change", (e) => {
      this.model = e.target.value
      this.lastInteractionId = null
      chrome.storage.local.set({ [GEMINI_MODEL_STORAGE]: this.model })
      chrome.storage.local.remove([GEMINI_LAST_INTERACTION_ID])
    })

    const keyModal = this.container.querySelector("#ai-key-modal")
    const keyInput = this.container.querySelector("#ai-api-key-input")
    const openKeyModal = () => {
      if (keyInput) keyInput.value = this.apiKey
      if (keyModal) keyModal.style.display = "flex"
    }

    this.container
      .querySelector("#ai-key-btn")
      ?.addEventListener("click", openKeyModal)
    this.container
      .querySelector("#ai-setup-key-btn")
      ?.addEventListener("click", openKeyModal)

    this.container
      .querySelector("#ai-cancel-key-btn")
      ?.addEventListener("click", () => {
        if (keyModal) keyModal.style.display = "none"
      })

    this.container
      .querySelector("#ai-save-key-btn")
      ?.addEventListener("click", () => {
        const val = keyInput?.value?.trim() || ""
        this.apiKey = val
        chrome.storage.local.set({
          [GEMINI_API_KEY_STORAGE]: val,
          ai_api_key: val,
        })
        const notice = this.container.querySelector("#ai-key-notice")
        if (notice) notice.style.display = val ? "none" : "flex"
        if (keyModal) keyModal.style.display = "none"
      })

    this.container.querySelectorAll(".ai-chip-btn").forEach((pill) => {
      pill.addEventListener("click", () => {
        const text = pill.dataset.prompt
        const input = this.container.querySelector("#ai-user-input")
        if (input) {
          input.value = text
          input.focus()
          this.autoResizeInput(input)
        }
      })
    })

    const input = this.container.querySelector("#ai-user-input")
    const sendBtn = this.container.querySelector("#ai-send-btn")

    input?.addEventListener("input", () => this.autoResizeInput(input))

    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    })

    sendBtn?.addEventListener("click", () => this.sendMessage())

    this.container.addEventListener("contextmenu", (e) => {
      // Allow native text selection inside textarea or selectable message text
      if (
        e.target.closest("#ai-user-input") ||
        e.target.closest(".ai-msg-text")
      ) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      showContextMenu(e.clientX, e.clientY, -1, "widget", "aiAssistant")
    })

    window.addEventListener("startpage:languageChanged", () =>
      this.updateLanguage(),
    )
    window.addEventListener("languageChanged", () => this.updateLanguage())

    window.addEventListener("layoutUpdated", (e) => {
      if (
        e.detail &&
        (e.detail.key === "aiAssistantSkin" ||
          e.detail.key === "aiAssistantHideBorder" ||
          e.detail.key === "widgetUseM3Accent")
      ) {
        this.applySkin()
      }
    })
  }

  applySkin() {
    if (!this.container) return
    const settings = getSettings()
    const isWhiteMode = settings.showQuickAccessBg === true
    const skin =
      settings.widgetUseM3Accent === true
        ? "m3-accent"
        : isWhiteMode
          ? "white-blur"
          : settings.aiAssistantSkin || "default"

    this.container.classList.toggle("skin-white-blur", skin === "white-blur")
    this.container.classList.toggle("skin-m3-accent", skin === "m3-accent")
    this.container.classList.toggle("skin-transparent", skin === "transparent")
    this.container.classList.toggle(
      "skin-light-transparent",
      skin === "light-transparent",
    )
    this.container.classList.toggle(
      "widget-border-hidden",
      settings.aiAssistantHideBorder === true,
    )
  }

  updateLanguage() {
    const i18n = geti18n()
    if (!this.container) return

    const titleEl = this.container.querySelector(".ai-header-title")
    if (titleEl)
      titleEl.textContent = i18n.ai_assistant_title || "Gemini Assistant"

    const modelSelect = this.container.querySelector("#ai-model-select")
    if (modelSelect) modelSelect.title = i18n.ai_select_model || "Select Model"

    const keyBtn = this.container.querySelector("#ai-key-btn")
    if (keyBtn) keyBtn.title = i18n.ai_api_key_settings || "API Key"

    const openTabBtn = this.container.querySelector("#ai-open-tab-btn")
    if (openTabBtn)
      openTabBtn.title = i18n.ai_open_web_title || "Open full Gemini tab"

    const clearBtn = this.container.querySelector("#ai-clear-btn")
    if (clearBtn) clearBtn.title = i18n.ai_clear_chat || "Clear"

    const closeBtn = this.container.querySelector("#ai-close-btn")
    if (closeBtn) closeBtn.title = i18n.close || "Close"

    const input = this.container.querySelector("#ai-user-input")
    if (input)
      input.placeholder =
        i18n.ai_input_placeholder ||
        "Ask Gemini... (Enter to send, Shift+Enter for newline)"

    const sendBtn = this.container.querySelector("#ai-send-btn")
    if (sendBtn) sendBtn.title = i18n.send || "Send"

    const bannerText = this.container.querySelector(
      "#ai-key-notice .ai-banner-content span",
    )
    if (bannerText)
      bannerText.textContent =
        i18n.ai_key_required_desc ||
        "Enter your Google Gemini API key to start chatting."

    const setupKeyBtn = this.container.querySelector("#ai-setup-key-btn")
    if (setupKeyBtn)
      setupKeyBtn.innerHTML = `<i class="fa-solid fa-key"></i> ${i18n.ai_enter_key || "Set Key"}`

    const modalTitle = this.container.querySelector(
      "#ai-key-modal .ai-modal-title span",
    )
    if (modalTitle)
      modalTitle.textContent = i18n.ai_api_key_settings || "Gemini API Key"

    const cancelModalBtn = this.container.querySelector("#ai-cancel-key-btn")
    if (cancelModalBtn) cancelModalBtn.textContent = i18n.cancel || "Cancel"

    const saveModalBtn = this.container.querySelector("#ai-save-key-btn")
    if (saveModalBtn) saveModalBtn.textContent = i18n.save || "Save"

    const prompts = this.container.querySelectorAll(
      ".ai-prompts-bar .ai-chip-btn",
    )
    if (prompts.length >= 4) {
      prompts[0].innerHTML = `<i class="fa-solid fa-language"></i> ${i18n.ai_prompt_translate || "Translate"}`
      prompts[1].innerHTML = `<i class="fa-solid fa-file-lines"></i> ${i18n.ai_prompt_summarize || "Summarize"}`
      prompts[2].innerHTML = `<i class="fa-solid fa-lightbulb"></i> ${i18n.ai_prompt_ideas || "Ideas"}`
      prompts[3].innerHTML = `<i class="fa-solid fa-code"></i> ${i18n.ai_prompt_code || "Code"}`
    }

    if (this.messages.length === 0) {
      this.renderMessages()
    }

    const quickBtn = document.querySelector(
      '.quick-btn[data-toggle="aiAssistant"]',
    )
    if (quickBtn)
      quickBtn.title = i18n.quick_access_ai_assistant || "Gemini AI Assistant"
  }

  autoResizeInput(el) {
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 100) + "px"
  }

  extractInteractionText(data) {
    if (data.output_text) return data.output_text
    if (Array.isArray(data.steps)) {
      const modelSteps = data.steps.filter(
        (s) => s.type === "model_output" || s.role === "model",
      )
      const texts = []
      for (const step of modelSteps) {
        if (Array.isArray(step.content)) {
          for (const part of step.content) {
            if (typeof part === "string") texts.push(part)
            else if (part?.text) texts.push(part.text)
          }
        } else if (typeof step.content === "string") {
          texts.push(step.content)
        } else if (step.text) {
          texts.push(step.text)
        }
      }
      if (texts.length > 0) return texts.join("\n\n")
    }
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts
        .map((p) => p.text || "")
        .join("")
    }
    return null
  }

  async callGeminiApi(userText) {
    let lastError = null

    // 1. Try Interactions API (Google's recommended modern API)
    try {
      const interactionPayload = {
        model: this.model,
        input: userText,
      }
      if (this.lastInteractionId) {
        interactionPayload.previous_interaction_id = this.lastInteractionId
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta2/interactions?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify(interactionPayload),
        },
      )

      const data = await response.json().catch(() => null)

      if (response.ok && data) {
        if (data.id) {
          this.lastInteractionId = data.id
          chrome.storage.local.set({ [GEMINI_LAST_INTERACTION_ID]: data.id })
        }
        const text = this.extractInteractionText(data)
        if (text) {
          return { success: true, text }
        }
      } else if (data?.error) {
        lastError = data.error.message || "Interactions API request failed"
        // If previous_interaction_id was stale or invalid, reset and retry once
        if (
          this.lastInteractionId &&
          /previous_interaction_id|not found|expired|invalid/i.test(lastError)
        ) {
          this.lastInteractionId = null
          chrome.storage.local.remove([GEMINI_LAST_INTERACTION_ID])
          return this.callGeminiApi(userText)
        }
      }
    } catch (err) {
      lastError = err.message
    }

    // 2. Fallback to generateContent API
    try {
      const contents = this.messages.slice(-8).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }))

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents }),
        },
      )

      const data = await response.json().catch(() => null)
      if (data?.error) {
        return {
          success: false,
          error: data.error.message || lastError || "API request failed",
        }
      }

      if (data?.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const reply = data.candidates[0].content.parts
          .map((p) => p.text || "")
          .join("")
        return { success: true, text: reply }
      }
    } catch (err) {
      return { success: false, error: err.message || lastError }
    }

    return {
      success: false,
      error: lastError || "No response received from Gemini.",
    }
  }

  async sendMessage(customText = null) {
    const input = this.container.querySelector("#ai-user-input")
    const text = (customText || input?.value)?.trim()
    if (!text || this.isLoading) return

    if (!this.apiKey) {
      const modal = this.container.querySelector("#ai-key-modal")
      if (modal) modal.style.display = "flex"
      return
    }

    this.messages.push({ role: "user", content: text, time: Date.now() })
    if (input) {
      input.value = ""
      this.autoResizeInput(input)
    }
    this.renderMessages()

    this.isLoading = true
    this.renderLoadingBubble()

    try {
      const result = await this.callGeminiApi(text)
      this.removeLoadingBubble()

      if (!result.success) {
        this.messages.push({
          role: "assistant",
          content: `Error: ${result.error}`,
          isError: true,
          time: Date.now(),
        })
      } else {
        this.messages.push({
          role: "assistant",
          content: result.text,
          time: Date.now(),
        })
      }
    } catch (err) {
      this.removeLoadingBubble()
      this.messages.push({
        role: "assistant",
        content: `Network error: ${err.message}`,
        isError: true,
        time: Date.now(),
      })
    } finally {
      this.isLoading = false
      this.saveChatHistory()
      this.renderMessages()
    }
  }

  renderLoadingBubble() {
    const list = this.container.querySelector("#ai-chat-list")
    if (!list) return
    const bubble = document.createElement("div")
    bubble.id = "ai-loading-bubble"
    bubble.className = "ai-msg ai-msg-assistant"
    bubble.innerHTML = `
      <div class="ai-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="ai-msg-body">
        <div class="ai-typing"><i class="fa-solid fa-circle-notch fa-spin"></i> Thinking...</div>
      </div>
    `
    list.appendChild(bubble)
    list.scrollTop = list.scrollHeight
  }

  removeLoadingBubble() {
    const bubble = this.container.querySelector("#ai-loading-bubble")
    if (bubble) bubble.remove()
  }

  renderMessages() {
    const list = this.container.querySelector("#ai-chat-list")
    if (!list) return

    if (this.messages.length === 0) {
      const i18n = geti18n()
      list.innerHTML = `
        <div class="ai-empty">
          <i class="fa-solid fa-robot ai-empty-icon"></i>
          <div class="ai-empty-title">${i18n.ai_welcome_title || "How can I help you?"}</div>
          <div class="ai-empty-desc">${i18n.ai_welcome_desc || "Ask questions, generate ideas, summarize text, or debug code."}</div>
          <div class="ai-demo-note">
            <span><i class="fa-solid fa-lightbulb"></i> ${i18n.ai_demo_notice || "This is a mini demo assistant. Opening the official Gemini tab is even faster & smarter for complex tasks!"}</span>
            <a href="https://gemini.google.com" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${i18n.ai_open_gemini_tab_btn || "Open Gemini Tab"}</a>
          </div>
        </div>
      `
      return
    }

    list.innerHTML = this.messages
      .map((msg, idx) => {
        const isUser = msg.role === "user"
        const formatted = this.formatMarkdown(msg.content)
        return `
          <div class="ai-msg ${isUser ? "ai-msg-user" : "ai-msg-assistant"} ${msg.isError ? "error" : ""}" data-idx="${idx}">
            <div class="ai-avatar">
              <i class="fa-solid ${isUser ? "fa-user" : "fa-robot"}"></i>
            </div>
            <div class="ai-msg-body">
              <div class="ai-msg-text">${formatted}</div>
              ${
                !isUser && !msg.isError
                  ? `
                <div class="ai-actions">
                  <button class="ai-action-btn ai-copy-btn" data-idx="${idx}" title="Copy">
                    <i class="fa-solid fa-copy"></i>
                  </button>
                  <button class="ai-action-btn ai-save-note-btn" data-idx="${idx}" title="Save to Notepad">
                    <i class="fa-solid fa-note-sticky"></i>
                  </button>
                </div>
              `
                  : ""
              }
            </div>
          </div>
        `
      })
      .join("")

    list.querySelectorAll(".ai-copy-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx, 10)
        const text = this.messages[idx]?.content
        if (text) {
          navigator.clipboard.writeText(text)
          btn.innerHTML = `<i class="fa-solid fa-check"></i>`
          setTimeout(() => {
            btn.innerHTML = `<i class="fa-solid fa-copy"></i>`
          }, 1500)
        }
      })
    })

    list.querySelectorAll(".ai-save-note-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx, 10)
        const text = this.messages[idx]?.content
        if (text) {
          this.exportToNotepad(text)
          btn.innerHTML = `<i class="fa-solid fa-check"></i>`
          setTimeout(() => {
            btn.innerHTML = `<i class="fa-solid fa-note-sticky"></i>`
          }, 1500)
        }
      })
    })

    list.scrollTop = list.scrollHeight
  }

  exportToNotepad(content) {
    chrome.storage.local.get(["notepadNotes"], (data) => {
      const notes = data.notepadNotes || []
      const newNote = {
        id: Date.now(),
        title: `AI Note: ${new Date().toLocaleDateString()}`,
        content: content.replace(/\n/g, "<br>"),
        color: "#a8c0ff",
        contentBg: "#1a1a2e",
        createdAt: new Date().toISOString(),
      }
      notes.unshift(newNote)
      chrome.storage.local.set({ notepadNotes: notes }, () => {
        if (window.activeNotepad) {
          window.activeNotepad.notes = notes
          window.activeNotepad.render()
        }
      })
    })
  }

  escapeHtml(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }

  formatMarkdown(text) {
    if (!text) return ""
    let escaped = this.escapeHtml(text)

    // Code blocks
    escaped = escaped.replace(
      /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g,
      (match, lang, code) => {
        return `<pre class="ai-code"><code>${code.trim()}</code></pre>`
      },
    )

    // Inline code
    escaped = escaped.replace(
      /`([^`]+)`/g,
      '<code class="ai-inline-code">$1</code>',
    )

    // Bold
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")

    // Italics
    escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>")

    // Lists
    escaped = escaped.replace(/^\s*[-*]\s+(.*)$/gm, "<li>$1</li>")
    escaped = escaped.replace(/(<li>.*<\/li>)/gs, '<ul class="ai-list">$1</ul>')
    escaped = escaped.replace(/^\s*\d+\.\s+(.*)$/gm, "<li>$1</li>")

    // Line breaks
    escaped = escaped.replace(/\n/g, "<br>")

    return escaped
  }

  toggleVisibility(show) {
    const isVisible =
      this.container.style.display !== "none" &&
      this.container.style.display !== ""
    const target = show !== undefined ? show : !isVisible

    fadeToggle(this.container, target, "flex")

    if (target) {
      setTimeout(() => {
        this.container.querySelector("#ai-user-input")?.focus()
      }, 60)
    }

    updateSetting("showAiAssistant", target)
    saveSettings()

    const quickBtn = document.querySelector(
      '.quick-btn[data-toggle="aiAssistant"]',
    )
    if (quickBtn) quickBtn.classList.toggle("active", target)
  }
}
