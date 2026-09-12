/**
 * GitLab Snippet Sync Service
 * Allows users to sync settings and bookmarks to an internal/private GitLab Snippet using a Personal Access Token (PAT).
 */

import {
  getSettings,
  saveSettings,
  getBookmarks,
  saveBookmarks,
} from "./state.js"
import { showToast } from "../utils/toast.js"
import { showChoice } from "../utils/dialog.js"
import { geti18n } from "./i18n.js"

const DEFAULT_SNIPPET_FILE_NAME = "startpage_backup.json"
const SNIPPET_TITLE = "Zero Start Page Backup & Sync"

export const GitLabSync = {
  isEnabled: false,
  isSyncing: false,

  getToken() {
    const settings = getSettings()
    return (settings.gitlabSyncToken || "").trim()
  },

  getSnippetId() {
    const settings = getSettings()
    return (settings.gitlabSyncSnippetId || "").trim()
  },

  getSyncFileName() {
    const settings = getSettings()
    return settings.gitlabSyncFileName || DEFAULT_SNIPPET_FILE_NAME
  },

  async init() {
    const settings = await getSettings()
    this.isEnabled = settings.gitlabSync === true && Boolean(this.getToken())

    window.addEventListener("gitlabProfileUpdated", (e) => {
      this.updateSyncStatusUI(e.detail)
    })

    try {
      const cached = localStorage.getItem("gitlabUserProfile")
      if (cached && this.isEnabled) {
        this.updateSyncStatusUI(JSON.parse(cached))
      } else {
        this.updateSyncStatusUI(null)
      }
    } catch (e) {}

    if (this.isEnabled) {
      const intervalStr = settings.gitlabAutoBackupInterval
      let shouldBackup = false
      if (intervalStr && intervalStr !== "none") {
        const lastBackup = settings.lastGitlabBackupTime || 0
        const now = Date.now()
        const DAY = 24 * 60 * 60 * 1000
        if (intervalStr === "daily" && now - lastBackup > DAY) shouldBackup = true
        if (intervalStr === "weekly" && now - lastBackup > 7 * DAY) shouldBackup = true
        if (intervalStr === "monthly" && now - lastBackup > 30 * DAY) shouldBackup = true
      }

      if (shouldBackup) {
        this.syncToSnippet().then(() => {
          const currentSettings = getSettings()
          currentSettings.lastGitlabBackupTime = Date.now()
          saveSettings(true)
        })
      }
    }
  },

  /**
   * Verify token by fetching user profile
   */
  async verifyToken(token) {
    const res = await fetch("https://gitlab.com/api/v4/user", {
      headers: {
        "PRIVATE-TOKEN": token,
      },
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.message || `GitLab authentication failed (${res.status})`)
    }
    const user = await res.json()
    return user
  },

  /**
   * Enable or disable GitLab sync
   */
  async toggleSync(enabled, buildPayloadFn = null) {
    const i18n = geti18n()
    const settings = getSettings()

    if (enabled) {
      const token = this.getToken()
      if (!token) {
        showToast(
          i18n.toast_gitlab_token_required || "Please enter a GitLab Personal Access Token first.",
          { type: "warning" },
        )
        this.isEnabled = false
        settings.gitlabSync = false
        saveSettings(true)
        throw new Error("No token provided")
      }

      try {
        const user = await this.verifyToken(token)
        localStorage.setItem("gitlabUserProfile", JSON.stringify(user))
        window.dispatchEvent(
          new CustomEvent("gitlabProfileUpdated", { detail: user }),
        )

        this.isEnabled = true
        settings.gitlabSync = true

        let snippetId = this.getSnippetId()
        let snippetExists = false

        if (snippetId) {
          try {
            const existingSnippet = await this.getSnippet(token, snippetId)
            if (existingSnippet && (existingSnippet.files || existingSnippet.id)) {
              snippetExists = true
            }
          } catch (e) {
            console.warn("Existing GitLab Snippet not found or inaccessible:", e)
            snippetId = ""
            settings.gitlabSyncSnippetId = ""
          }
        }

        let payload = null
        if (buildPayloadFn) {
          payload = await buildPayloadFn()
        }

        if (snippetExists) {
          const choice = await showChoice(
            i18n.dialog_gitlab_existing_snippet_choice ||
              `Backup found in GitLab Snippet (${snippetId}). Do you want to download settings from GitLab, or overwrite it with your current settings?`,
            "GitLab Sync",
            i18n.settings_force_drive_download || "Download",
            i18n.settings_force_drive_sync || "Upload",
          )

          if (choice === "left") {
            await this.syncFromSnippet(true)
          } else if (choice === "right") {
            await this.syncToSnippet(payload)
          }
        } else {
          // Create new private snippet
          await this.syncToSnippet(payload)
        }

        saveSettings(true)
        showToast(
          i18n.toast_gitlab_enabled || "GitLab Snippet Sync Enabled!",
          { type: "success" },
        )
      } catch (err) {
        console.error("Failed to enable GitLab Sync:", err)
        showToast(
          `${i18n.toast_gitlab_failed || "GitLab sync connection failed"}: ${err.message}`,
          { type: "error" },
        )
        this.isEnabled = false
        settings.gitlabSync = false
        saveSettings(true)
        throw err
      }
    } else {
      this.isEnabled = false
      this.clearUserProfile()
      settings.gitlabSync = false
      saveSettings(true)
      showToast(
        i18n.toast_gitlab_disabled || "GitLab Snippet Sync Disabled",
        { type: "info" },
      )
    }
  },

  async getSnippet(token, snippetId) {
    const res = await fetch(`https://gitlab.com/api/v4/snippets/${snippetId}`, {
      headers: {
        "PRIVATE-TOKEN": token,
      },
    })
    if (!res.ok) throw new Error(`GitLab Snippet fetch error (${res.status})`)
    return await res.json()
  },

  /**
   * Upload / Save backup to GitLab Snippet
   */
  async syncToSnippet(payload = null) {
    const token = this.getToken()
    if (!token) throw new Error("GitLab token is missing")

    this.isSyncing = true
    try {
      let dataToSave = payload
      if (!dataToSave) {
        const settings = await getSettings()
        const bookmarks = await getBookmarks()
        dataToSave = {
          source: "zero-startpage",
          version: 2,
          timestamp: new Date().toISOString(),
          settings,
          bookmarks,
        }
      }

      const fileName = this.getSyncFileName()
      const fileContent = JSON.stringify(dataToSave, null, 2)
      let snippetId = this.getSnippetId()

      let res
      if (snippetId) {
        // Update existing Snippet
        res = await fetch(`https://gitlab.com/api/v4/snippets/${snippetId}`, {
          method: "PUT",
          headers: {
            "PRIVATE-TOKEN": token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: SNIPPET_TITLE,
            files: [
              {
                action: "update",
                file_path: fileName,
                content: fileContent,
              },
            ],
          }),
        })
      } else {
        // Create new private Snippet
        res = await fetch("https://gitlab.com/api/v4/snippets", {
          method: "POST",
          headers: {
            "PRIVATE-TOKEN": token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: SNIPPET_TITLE,
            visibility: "private",
            files: [
              {
                file_path: fileName,
                content: fileContent,
              },
            ],
          }),
        })
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = errData.message
          ? typeof errData.message === "string"
            ? errData.message
            : JSON.stringify(errData.message)
          : `HTTP ${res.status}`
        throw new Error(msg)
      }

      const snippetData = await res.json()
      const currentSettings = getSettings()
      currentSettings.gitlabSyncSnippetId = String(snippetData.id)
      currentSettings.lastGitlabBackupTime = Date.now()
      saveSettings(true)

      const snippetInput = document.getElementById("gitlab-sync-snippet-id-input")
      if (snippetInput) snippetInput.value = snippetData.id

      console.log("Successfully synced to GitLab Snippet:", snippetData.id)
      const i18n = geti18n()
      showToast(i18n.toast_gitlab_upload_success || "Backup uploaded to GitLab Snippet!", { type: "success" })
    } catch (err) {
      console.error("GitLab Snippet Upload Error:", err)
      const i18n = geti18n()
      showToast(`${i18n.toast_gitlab_upload_error || "Failed to upload to GitLab Snippet"}: ${err.message}`, { type: "error" })
      throw err
    } finally {
      this.isSyncing = false
    }
  },

  /**
   * Download / Restore backup from GitLab Snippet
   */
  async syncFromSnippet(isManual = false) {
    const token = this.getToken()
    const snippetId = this.getSnippetId()
    if (!token) throw new Error("GitLab token is missing")
    if (!snippetId) throw new Error("Snippet ID is missing. Please upload first or enter an existing Snippet ID.")

    this.isSyncing = true
    try {
      const fileName = this.getSyncFileName()

      // Fetch raw snippet content
      const rawRes = await fetch(`https://gitlab.com/api/v4/snippets/${snippetId}/raw`, {
        headers: {
          "PRIVATE-TOKEN": token,
        },
      })
      if (!rawRes.ok) throw new Error(`GitLab raw snippet error (${rawRes.status})`)

      const rawText = await rawRes.text()
      let data
      try {
        data = JSON.parse(rawText)
      } catch (e) {
        throw new Error("Snippet content is not valid JSON.")
      }

      if (Array.isArray(data)) {
        data = { source: "zero-startpage", version: 2, bookmarks: data }
      } else if (typeof data === "object") {
        const hasMainSection =
          data.settings ||
          data.bookmarks ||
          data.todos ||
          data.notepad ||
          data.calendarEvents ||
          data.media
        if (!hasMainSection) {
          data = { source: "zero-startpage", version: 2, settings: data }
        }
      }

      const isStartpageFile =
        data &&
        (data.source === "zero-startpage" ||
          data.version !== undefined ||
          data.settings ||
          data.bookmarks ||
          data.todos)

      if (!isStartpageFile) {
        throw new Error("Snippet content is not a valid Startpage backup file.")
      }

      if (isManual && window.importSettingsData) {
        await window.importSettingsData(data)
      } else {
        if (data.settings) {
          const currentSettings = getSettings()
          Object.assign(currentSettings, data.settings)
          currentSettings.gitlabSync = true
          currentSettings.gitlabSyncToken = token
          currentSettings.gitlabSyncSnippetId = snippetId
          saveSettings(true)
        }
        if (data.bookmarks) {
          await saveBookmarks(data.bookmarks)
        }
      }

      console.log("Successfully synced from GitLab Snippet")
      const i18n = geti18n()
      showToast(i18n.toast_gitlab_download_success || "Backup restored from GitLab Snippet!", { type: "success" })
    } catch (err) {
      console.error("GitLab Snippet Download Error:", err)
      const i18n = geti18n()
      showToast(`${i18n.toast_gitlab_download_error || "Failed to download from GitLab Snippet"}: ${err.message}`, { type: "error" })
      if (isManual) throw err
    } finally {
      this.isSyncing = false
    }
  },

  clearUserProfile() {
    localStorage.removeItem("gitlabUserProfile")
    window.dispatchEvent(
      new CustomEvent("gitlabProfileUpdated", { detail: null }),
    )
  },

  updateSyncStatusUI(userInfo) {
    const statusDiv = document.getElementById("gitlab-sync-status")
    const avatarImg = document.getElementById("gitlab-sync-avatar")
    const usernameSpan = document.getElementById("gitlab-sync-username")
    if (userInfo && this.isEnabled) {
      if (statusDiv) statusDiv.style.display = "flex"
      if (avatarImg) avatarImg.src = userInfo.avatar_url || ""
      if (usernameSpan) usernameSpan.textContent = userInfo.username || userInfo.name || "Connected"
    } else {
      if (statusDiv) statusDiv.style.display = "none"
    }
  },
}
